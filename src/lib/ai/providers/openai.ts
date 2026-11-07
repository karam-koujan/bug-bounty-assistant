import { ResearchAI, ResearchAI as ResearchAIType, AIProviderConfig, ProgramEvaluation, FeatureAnalysis, Hypothesis, ObservationAnalysis, AdvisoryAnalysis, SessionSummary, ReportDraft } from '../adapter';
import { ProgramEvaluationSchema, FeatureAnalysisSchema, HypothesisSchema, ObservationAnalysisSchema, AdvisoryAnalysisSchema, SessionSummarySchema, ReportDraftSchema, z } from '../schemas';
import { ALL_PROMPTS } from '../prompts';

interface OpenAIMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface OpenAIResponse {
  choices: Array<{
    message: OpenAIMessage;
    finish_reason: string;
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export class OpenAIProvider implements ResearchAIType {
  private config: AIProviderConfig;
  private promptVersion = '1.0';

  constructor(config: AIProviderConfig) {
    this.config = {
      baseUrl: 'https://api.openai.com/v1',
      ...config,
    };
  }

  private async callOpenAI(messages: OpenAIMessage[], schema: z.ZodSchema, temperature = 0.1): Promise<unknown> {
    const response = await fetch(`${this.config.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.config.apiKey}`,
      },
      body: JSON.stringify({
        model: this.config.model,
        messages,
        temperature,
        response_format: { type: 'json_object' },
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`OpenAI API error: ${response.status} ${error}`);
    }

    const data: OpenAIResponse = await response.json();
    const content = data.choices[0]?.message?.content;

    if (!content) {
      throw new Error('Empty response from OpenAI');
    }

    try {
      const parsed = JSON.parse(content);
      return schema.parse(parsed);
    } catch (error) {
      throw new Error(`Failed to parse/validate OpenAI response: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async evaluateProgram(input: { program: { name: string; platform: string; policyText: string | null; programUrl: string }; evidence: Array<{ id: string; type: string; title: string; content: string }> }): Promise<ProgramEvaluation> {
    const systemPrompt = this.getProgramEvaluationPrompt();
    const userPrompt = JSON.stringify(input, null, 2);

    return this.callOpenAI(
      [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      ProgramEvaluationSchema
    ) as Promise<ProgramEvaluation>;
  }

  async analyzeFeature(input: { feature: { name: string; description: string | null; roles: string[]; resourceTypes: string[]; securityProperties: string[] }; endpoints: Array<{ method: string; path: string; auth: string | null }>; evidence: Array<{ id: string; type: string; title: string; content: string }> }): Promise<FeatureAnalysis> {
    const systemPrompt = this.getFeatureAnalysisPrompt();
    const userPrompt = JSON.stringify(input, null, 2);

    return this.callOpenAI(
      [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      FeatureAnalysisSchema
    ) as Promise<FeatureAnalysis>;
  }

  async generateHypotheses(input: { programId: string; featureId: string; featureName: string; evidence: Array<{ id: string; type: string; title: string; content: string }>; existingHypotheses: Array<{ id: string; title: string; statement: string }> }): Promise<Hypothesis[]> {
    const systemPrompt = this.getHypothesisGenerationPrompt();
    const userPrompt = JSON.stringify(input, null, 2);

    const result = await this.callOpenAI(
      [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      z.array(HypothesisSchema)
    ) as Promise<Hypothesis[]>;

    return result;
  }

  async analyzeObservation(input: { hypothesisId: string; hypothesisStatement: string; observation: { testDescription: string; expectedResult: string; actualResult: string; evidenceIds: string[] } }): Promise<ObservationAnalysis> {
    const systemPrompt = this.getObservationAnalysisPrompt();
    const userPrompt = JSON.stringify(input, null, 2);

    return this.callOpenAI(
      [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      ObservationAnalysisSchema
    ) as Promise<ObservationAnalysis>;
  }

  async researchAdvisory(input: { advisory: { title: string; description: string; cveId: string | null; severity: string; affectedProducts: string[] }; programContext: { name: string; platform: string; assets: Array<{ identifier: string; type: string }> } }): Promise<AdvisoryAnalysis> {
    const systemPrompt = this.getAdvisoryAnalysisPrompt();
    const userPrompt = JSON.stringify(input, null, 2);

    return this.callOpenAI(
      [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      AdvisoryAnalysisSchema
    ) as Promise<AdvisoryAnalysis>;
  }

  async generateSessionSummary(input: { session: { objective: string; notes: string; observations: Array<{ testDescription: string; expectedResult: string; actualResult: string }> } }): Promise<SessionSummary> {
    const systemPrompt = this.getSessionSummaryPrompt();
    const userPrompt = JSON.stringify(input, null, 2);

    return this.callOpenAI(
      [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      SessionSummarySchema
    ) as Promise<SessionSummary>;
  }

  async draftReport(input: { hypothesis: { title: string; statement: string; category: string; testPlan: string; expectedVulnerableResult: string; expectedSafeResult: string; potentialImpact: string }; evidence: Array<{ id: string; type: string; title: string; content: string }>; observations: Array<{ testDescription: string; expectedResult: string; actualResult: string; conclusion: string }> }): Promise<ReportDraft> {
    const systemPrompt = this.getReportDraftPrompt();
    const userPrompt = JSON.stringify(input, null, 2);

    return this.callOpenAI(
      [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      ReportDraftSchema
    ) as Promise<ReportDraft>;
  }

  private getProgramEvaluationPrompt(): string { return ALL_PROMPTS.programEvaluation; }
  private getFeatureAnalysisPrompt(): string { return ALL_PROMPTS.featureAnalysis; }
  private getHypothesisGenerationPrompt(): string { return ALL_PROMPTS.hypothesisGeneration; }
  private getObservationAnalysisPrompt(): string { return ALL_PROMPTS.observationAnalysis; }
  private getAdvisoryAnalysisPrompt(): string { return ALL_PROMPTS.advisoryAnalysis; }
  private getSessionSummaryPrompt(): string { return ALL_PROMPTS.sessionSummary; }
  private getReportDraftPrompt(): string { return ALL_PROMPTS.reportDraft; }
}