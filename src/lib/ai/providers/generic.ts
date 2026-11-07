import { ResearchAI, ResearchAI as ResearchAIType, AIProviderConfig, ProgramEvaluation, FeatureAnalysis, Hypothesis, ObservationAnalysis, AdvisoryAnalysis, SessionSummary, ReportDraft } from '../adapter';
import { ProgramEvaluationSchema, FeatureAnalysisSchema, HypothesisSchema, ObservationAnalysisSchema, AdvisoryAnalysisSchema, SessionSummarySchema, ReportDraftSchema, z } from '../schemas';
import { ALL_PROMPTS } from '../prompts';

interface GenericMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface GenericResponse {
  choices: Array<{
    message: GenericMessage;
    finish_reason: string;
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export class GenericOpenAICompatibleProvider implements ResearchAIType {
  private config: Required<AIProviderConfig> & { baseUrl: string; apiPath?: string };

  constructor(config: AIProviderConfig & { baseUrl: string; apiPath?: string }) {
    if (!config.baseUrl) {
      throw new Error('baseUrl is required for generic provider (e.g., http://localhost:11434/v1 for Ollama)');
    }
    this.config = {
      baseUrl: config.baseUrl.replace(/\/+$/, ''),
      apiPath: config.apiPath || '/chat/completions',
      apiKey: config.apiKey || 'not-required',
      model: config.model,
    };
  }

  private async callAPI(messages: GenericMessage[], schema: z.ZodSchema, temperature = 0.1): Promise<unknown> {
    const url = `${this.config.baseUrl}${this.config.apiPath}`;
    
    const response = await fetch(url, {
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
        stream: false,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Generic API error: ${response.status} ${error}`);
    }

    const data: GenericResponse = await response.json();
    const content = data.choices[0]?.message?.content;

    if (!content) {
      throw new Error('Empty response from AI provider');
    }

    try {
      const parsed = JSON.parse(content);
      return schema.parse(parsed);
    } catch (error) {
      throw new Error(`Failed to parse/validate AI response: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async evaluateProgram(input: { program: { name: string; platform: string; policyText: string | null; programUrl: string }; evidence: Array<{ id: string; type: string; title: string; content: string }> }): Promise<ProgramEvaluation> {
    return this.callAPI(
      [
        { role: 'system', content: this.getProgramEvaluationPrompt() },
        { role: 'user', content: JSON.stringify(input, null, 2) },
      ],
      ProgramEvaluationSchema
    ) as Promise<ProgramEvaluation>;
  }

  async analyzeFeature(input: { feature: { name: string; description: string | null; roles: string[]; resourceTypes: string[]; securityProperties: string[] }; endpoints: Array<{ method: string; path: string; auth: string | null }>; evidence: Array<{ id: string; type: string; title: string; content: string }> }): Promise<FeatureAnalysis> {
    return this.callAPI(
      [
        { role: 'system', content: this.getFeatureAnalysisPrompt() },
        { role: 'user', content: JSON.stringify(input, null, 2) },
      ],
      FeatureAnalysisSchema
    ) as Promise<FeatureAnalysis>;
  }

  async generateHypotheses(input: { programId: string; featureId: string; featureName: string; evidence: Array<{ id: string; type: string; title: string; content: string }>; existingHypotheses: Array<{ id: string; title: string; statement: string }> }): Promise<Hypothesis[]> {
    const result = await this.callAPI(
      [
        { role: 'system', content: this.getHypothesisGenerationPrompt() },
        { role: 'user', content: JSON.stringify(input, null, 2) },
      ],
      z.array(HypothesisSchema)
    ) as Promise<Hypothesis[]>;

    return result;
  }

  async analyzeObservation(input: { hypothesisId: string; hypothesisStatement: string; observation: { testDescription: string; expectedResult: string; actualResult: string; evidenceIds: string[] } }): Promise<ObservationAnalysis> {
    return this.callAPI(
      [
        { role: 'system', content: this.getObservationAnalysisPrompt() },
        { role: 'user', content: JSON.stringify(input, null, 2) },
      ],
      ObservationAnalysisSchema
    ) as Promise<ObservationAnalysis>;
  }

  async researchAdvisory(input: { advisory: { title: string; description: string; cveId: string | null; severity: string; affectedProducts: string[] }; programContext: { name: string; platform: string; assets: Array<{ identifier: string; type: string }> } }): Promise<AdvisoryAnalysis> {
    return this.callAPI(
      [
        { role: 'system', content: this.getAdvisoryAnalysisPrompt() },
        { role: 'user', content: JSON.stringify(input, null, 2) },
      ],
      AdvisoryAnalysisSchema
    ) as Promise<AdvisoryAnalysis>;
  }

  async generateSessionSummary(input: { session: { objective: string; notes: string; observations: Array<{ testDescription: string; expectedResult: string; actualResult: string }> } }): Promise<SessionSummary> {
    return this.callAPI(
      [
        { role: 'system', content: this.getSessionSummaryPrompt() },
        { role: 'user', content: JSON.stringify(input, null, 2) },
      ],
      SessionSummarySchema
    ) as Promise<SessionSummary>;
  }

  async draftReport(input: { hypothesis: { title: string; statement: string; category: string; testPlan: string; expectedVulnerableResult: string; expectedSafeResult: string; potentialImpact: string }; evidence: Array<{ id: string; type: string; title: string; content: string }>; observations: Array<{ testDescription: string; expectedResult: string; actualResult: string; conclusion: string }> }): Promise<ReportDraft> {
    return this.callAPI(
      [
        { role: 'system', content: this.getReportDraftPrompt() },
        { role: 'user', content: JSON.stringify(input, null, 2) },
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