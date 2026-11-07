import { db } from '@/lib/db';
import { hypotheses, evidence, features, endpoints, aiRuns } from '@/lib/db/schema';
import { eq, and, desc, sql } from 'drizzle-orm';
import { randomUUID } from 'crypto';
import { ResearchAI, ProgramEvaluation, FeatureAnalysis, Hypothesis, ObservationAnalysis, AdvisoryAnalysis, SessionSummary, ReportDraft } from '@/lib/ai';
import { HypothesisSchema } from '@/lib/ai/schemas';

type HypothesisWithId = Hypothesis & { id: string };

export interface HypothesisEngine {
  generateHypothesesForFeature(programId: string, featureId: string): Promise<Hypothesis[]>;
  analyzeObservation(hypothesisId: string, testDescription: string, expectedResult: string, actualResult: string, evidenceIds: string[]): Promise<ObservationAnalysis>;
  updateHypothesisPriority(hypothesisId: string): Promise<void>;
}

interface PriorityBreakdown {
  evidenceStrength: number;
  potentialImpact: number;
  featureRelevance: number;
  informationGain: number;
  investigationCost: number;
  testingRisk: number;
  total: number;
}

export class HypothesisEngineService implements HypothesisEngine {
  private ai: ResearchAI;
  private factory: { getProviderFromEnv: () => Promise<{ provider: string; config: { model?: string } }> };

  constructor(ai: ResearchAI, factory?: { getProviderFromEnv: () => Promise<{ provider: string; config: { model?: string } }> }) {
    this.ai = ai;
    this.factory = factory ?? { getProviderFromEnv: async () => (await import('@/lib/ai/factory')).getProviderFromEnv() };
  }

  async generateHypothesesForFeature(programId: string, featureId: string): Promise<Hypothesis[]> {
    // Fetch feature and related data
    const [featureResult, evidenceResult, endpointsResult, existingHypothesesResult] = await Promise.all([
      db.query.features.findFirst({ where: eq(features.id, featureId) }),
      db.query.evidence.findMany({ where: eq(evidence.programId, programId) }),
      db.query.endpoints.findMany({ where: and(eq(endpoints.featureId, featureId), eq(endpoints.programId, programId)) }),
      db.query.hypotheses.findMany({ where: and(eq(hypotheses.featureId, featureId), eq(hypotheses.programId, programId)) }),
    ]);

    if (!featureResult) {
      throw new Error('Feature not found');
    }

    const feature = featureResult;
    const existingHypotheses = existingHypothesesResult.map(h => ({
      id: h.id,
      title: h.title,
      statement: h.statement,
    }));

    // Call AI to generate hypotheses
    const generatedHypotheses = await this.ai.generateHypotheses({
      programId,
      featureId,
      featureName: feature.name,
      evidence: evidenceResult.map(e => ({ id: e.id, type: e.evidenceType, title: e.title, content: e.content })),
      existingHypotheses,
    });

    // Save hypotheses to database
    const savedHypotheses: Hypothesis[] = [];
    for (const hyp of generatedHypotheses) {
      const id = randomUUID();
      const priorityBreakdown = this.computePriorityBreakdown(hyp);

      await db.insert(hypotheses).values({
        id,
        programId,
        featureId,
        title: hyp.title,
        statement: hyp.statement,
        category: hyp.category,
        supportingEvidenceJson: JSON.stringify(hyp.supportingEvidenceIds),
        contradictingEvidenceJson: JSON.stringify(hyp.contradictingEvidenceIds),
        assumptionsJson: JSON.stringify(hyp.assumptions),
        prerequisitesJson: JSON.stringify(hyp.prerequisites),
        testPlan: hyp.testPlan,
        expectedVulnerableResult: hyp.expectedVulnerableResult,
        expectedSafeResult: hyp.expectedSafeResult,
        potentialImpact: hyp.potentialImpact,
        status: 'draft',
        priorityScore: hyp.priorityScore,
        priorityBreakdownJson: JSON.stringify(priorityBreakdown),
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      savedHypotheses.push({ ...hyp, id } as HypothesisWithId);
    }

    return savedHypotheses as Hypothesis[];
  }

  async analyzeObservation(hypothesisId: string, testDescription: string, expectedResult: string, actualResult: string, evidenceIds: string[]): Promise<ObservationAnalysis> {
    // Fetch hypothesis
    const hypothesis = await db.query.hypotheses.findFirst({ where: eq(hypotheses.id, hypothesisId) });
    if (!hypothesis) {
      throw new Error('Hypothesis not found');
    }

    // Call AI to analyze observation
    const analysis = await this.ai.analyzeObservation({
      hypothesisId,
      hypothesisStatement: hypothesis.statement,
      observation: {
        testDescription,
        expectedResult,
        actualResult,
        evidenceIds,
      },
    });

    // Log AI run
    await this.logAiRun('analyze_observation', {
      hypothesisId,
      testDescription,
      expectedResult,
      actualResult,
      evidenceIds,
    }, analysis);

    return analysis;
  }

  async updateHypothesisPriority(hypothesisId: string): Promise<void> {
    const hypothesis = await db.query.hypotheses.findFirst({ where: eq(hypotheses.id, hypothesisId) });
    if (!hypothesis) return;

    const priorityBreakdown = this.computePriorityBreakdown({
      potentialImpact: hypothesis.potentialImpact as any,
      priorityScore: hypothesis.priorityScore,
    } as any);

    await db.update(hypotheses).set({
      priorityBreakdownJson: JSON.stringify(priorityBreakdown),
      updatedAt: new Date(),
    }).where(eq(hypotheses.id, hypothesisId));
  }

  private computePriorityBreakdown(hypothesis: { potentialImpact: string; priorityScore: number; supportingEvidenceIds: string[]; testPlan: string; }): PriorityBreakdown {
    const impactScores = { critical: 5, high: 4, medium: 3, low: 2, informational: 1 };
    
    // Evidence strength based on number and quality of supporting evidence
    const evidenceCount = hypothesis.supportingEvidenceIds.length;
    const evidenceStrength = Math.min(5, Math.max(1, evidenceCount));
    
    // Feature relevance - could be computed from feature criticality
    const featureRelevance = 3;
    
    // Information gain based on hypothesis novelty
    const informationGain = 3;
    
    // Investigation cost based on test plan complexity
    const testPlanLength = hypothesis.testPlan?.length || 0;
    const investigationCost = testPlanLength > 500 ? 3 : testPlanLength > 200 ? 2 : 1;
    
    // Testing risk based on potential impact
    const impactScore = impactScores[hypothesis.potentialImpact as keyof typeof impactScores] || 1;
    const testingRisk = impactScore >= 4 ? 3 : impactScore >= 3 ? 2 : 1;
    
    return {
      evidenceStrength,
      potentialImpact: impactScore,
      featureRelevance,
      informationGain,
      investigationCost,
      testingRisk,
      total: hypothesis.priorityScore,
    };
  }

  private async logAiRun(taskType: string, input: unknown, output: unknown): Promise<void> {
    const { provider, config } = await this.factory.getProviderFromEnv();
    await db.insert(aiRuns).values({
      id: randomUUID(),
      taskType: taskType as 'evaluate_program' | 'analyze_feature' | 'generate_hypotheses' | 'analyze_observation' | 'research_advisory' | 'generate_session_summary' | 'draft_report',
      provider,
      model: config.model ?? 'unknown',
      promptVersion: '1.0',
      inputReferenceIdsJson: JSON.stringify([]),
      outputJson: JSON.stringify(output),
      validationStatus: 'valid',
      createdAt: new Date(),
    });
  }
}

export async function getHypothesisEngine(): Promise<HypothesisEngine> {
  const { createAIProvider, getProviderFromEnv } = await import('@/lib/ai/factory');
  const { provider, config } = getProviderFromEnv();
  const ai = createAIProvider(provider, config);
  return new HypothesisEngineService(ai);
}