export * from './adapter';
export * from './schemas';
export * from './factory';
export * from './providers/openai';
export * from './providers/anthropic';
export * from './providers/generic';

// Re-export schemas with explicit names to avoid conflicts
export {
  ProgramEvaluationSchema,
  FeatureAnalysisSchema,
  HypothesisSchema,
  ObservationAnalysisSchema,
  AdvisoryAnalysisSchema,
  SessionSummarySchema,
  ReportDraftSchema,
  z,
} from './schemas';

// Explicit re-exports from adapter to avoid duplicate export warnings
export type {
  ProgramEvaluation,
  FeatureAnalysis,
  Hypothesis,
  ObservationAnalysis,
  AdvisoryAnalysis,
  SessionSummary,
  ReportDraft,
  ResearchAI,
  AIProviderConfig,
} from './adapter';