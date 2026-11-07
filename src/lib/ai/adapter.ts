import { z } from 'zod';

export const ProgramEvaluationSchema = z.object({
  programName: z.string(),
  platform: z.string(),
  scores: z.object({
    attackSurfaceUsefulness: z.number().min(1).max(5),
    scopeClarity: z.number().min(1).max(5),
    rewardSuitability: z.number().min(1).max(5),
    productComplexity: z.number().min(1).max(5),
    researchOpportunity: z.number().min(1).max(5),
    skillFit: z.number().min(1).max(5),
  }),
  reasoning: z.string(),
  confidence: z.number().min(0).max(1),
});

export const FeatureAnalysisSchema = z.object({
  featureName: z.string(),
  summary: z.string(),
  attackSurface: z.array(z.string()),
  securityGaps: z.array(z.string()),
  testIdeas: z.array(z.string()),
  confidence: z.number().min(0).max(1),
});

export const HypothesisSchema = z.object({
  title: z.string().min(1).max(200),
  statement: z.string().min(1),
  category: z.enum(['authorization', 'authentication', 'input_validation', 'business_logic', 'information_disclosure', 'session_management', 'crypto', 'configuration', 'other']),
  supportingEvidenceIds: z.array(z.string().uuid()),
  contradictingEvidenceIds: z.array(z.string().uuid()),
  assumptions: z.array(z.string()),
  prerequisites: z.array(z.string()),
  testPlan: z.string(),
  expectedVulnerableResult: z.string(),
  expectedSafeResult: z.string(),
  potentialImpact: z.enum(['critical', 'high', 'medium', 'low', 'informational']),
  priorityScore: z.number().min(0).max(10),
  confidence: z.number().min(0).max(1),
});

export const ObservationAnalysisSchema = z.object({
  summary: z.string(),
  findings: z.array(z.string()),
  supportsHypothesis: z.boolean(),
  newQuestions: z.array(z.string()),
  recommendedNextSteps: z.array(z.string()),
  confidence: z.number().min(0).max(1),
});

export const AdvisoryAnalysisSchema = z.object({
  cveId: z.string().optional(),
  title: z.string(),
  summary: z.string(),
  affectedComponents: z.array(z.string()),
  severity: z.enum(['critical', 'high', 'medium', 'low']),
  relevanceScore: z.number().min(0).max(1),
  actionRequired: z.boolean(),
  recommendedActions: z.array(z.string()),
});

export const SessionSummarySchema = z.object({
  objective: z.string(),
  actionsTaken: z.array(z.string()),
  keyFindings: z.array(z.string()),
  nextSteps: z.array(z.string()),
  handoffNotes: z.string(),
  confidence: z.number().min(0).max(1),
});

export const ReportDraftSchema = z.object({
  title: z.string(),
  summary: z.string(),
  affectedAsset: z.string().optional(),
  reproductionSteps: z.array(z.string()),
  expectedBehavior: z.string(),
  actualBehavior: z.string(),
  demonstratedImpact: z.string(),
  remediation: z.string(),
  references: z.array(z.string().uuid()).default([]),
  confidence: z.number().min(0).max(1),
});

export type ProgramEvaluation = z.infer<typeof ProgramEvaluationSchema>;
export type FeatureAnalysis = z.infer<typeof FeatureAnalysisSchema>;
export type Hypothesis = z.infer<typeof HypothesisSchema>;
export type ObservationAnalysis = z.infer<typeof ObservationAnalysisSchema>;
export type AdvisoryAnalysis = z.infer<typeof AdvisoryAnalysisSchema>;
export type SessionSummary = z.infer<typeof SessionSummarySchema>;
export type ReportDraft = z.infer<typeof ReportDraftSchema>;

export interface ResearchAI {
  evaluateProgram(input: { program: { name: string; platform: string; policyText: string | null; programUrl: string }; evidence: Array<{ id: string; type: string; title: string; content: string }> }): Promise<ProgramEvaluation>;
  analyzeFeature(input: { feature: { name: string; description: string | null; roles: string[]; resourceTypes: string[]; securityProperties: string[] }; endpoints: Array<{ method: string; path: string; auth: string | null }>; evidence: Array<{ id: string; type: string; title: string; content: string }> }): Promise<FeatureAnalysis>;
  generateHypotheses(input: { programId: string; featureId: string; featureName: string; evidence: Array<{ id: string; type: string; title: string; content: string }>; existingHypotheses: Array<{ id: string; title: string; statement: string }> }): Promise<Hypothesis[]>;
  analyzeObservation(input: { hypothesisId: string; hypothesisStatement: string; observation: { testDescription: string; expectedResult: string; actualResult: string; evidenceIds: string[] } }): Promise<ObservationAnalysis>;
  researchAdvisory(input: { advisory: { title: string; description: string; cveId: string | null; severity: string; affectedProducts: string[] }; programContext: { name: string; platform: string; assets: Array<{ identifier: string; type: string }> } }): Promise<AdvisoryAnalysis>;
  generateSessionSummary(input: { session: { objective: string; notes: string; observations: Array<{ testDescription: string; expectedResult: string; actualResult: string }> } }): Promise<SessionSummary>;
  draftReport(input: { hypothesis: { title: string; statement: string; category: string; testPlan: string; expectedVulnerableResult: string; expectedSafeResult: string; potentialImpact: string }; evidence: Array<{ id: string; type: string; title: string; content: string }>; observations: Array<{ testDescription: string; expectedResult: string; actualResult: string; conclusion: string }> }): Promise<ReportDraft>;
}

export interface AIProviderConfig {
  apiKey: string;
  model: string;
  baseUrl?: string;
}