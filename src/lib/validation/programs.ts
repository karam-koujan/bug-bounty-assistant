import { z } from 'zod';

export const programStatusSchema = z.enum([
  'inbox',
  'evaluating',
  'ready_to_investigate',
  'active_research',
  'paused',
  'archived',
]);

export const evaluationScoresSchema = z.object({
  attackSurfaceUsefulness: z.number().min(0).max(5).optional(),
  scopeClarity: z.number().min(0).max(5).optional(),
  rewardSuitability: z.number().min(0).max(5).optional(),
  productComplexity: z.number().min(0).max(5).optional(),
  researchOpportunity: z.number().min(0).max(5).optional(),
  skillFit: z.number().min(0).max(5).optional(),
});

export const programCreateSchema = z.object({
  name: z.string().min(1).max(255),
  platform: z.string().min(1).max(100),
  programUrl: z.string().url(),
  policyText: z.string().optional(),
  policyReviewedAt: z.string().datetime().optional(),
  researchStatus: programStatusSchema.default('inbox'),
  evaluationScoresJson: evaluationScoresSchema.default({}),
  notes: z.string().optional(),
});

export const programUpdateSchema = programCreateSchema.partial();

export const programParamsSchema = z.object({
  id: z.string().uuid(),
});

export const programListQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  status: programStatusSchema.optional(),
  platform: z.string().optional(),
  search: z.string().optional(),
  sortBy: z.enum(['name', 'platform', 'researchStatus', 'createdAt', 'updatedAt']).default('updatedAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export type ProgramCreate = z.infer<typeof programCreateSchema>;
export type ProgramUpdate = z.infer<typeof programUpdateSchema>;
export type ProgramParams = z.infer<typeof programParamsSchema>;
export type ProgramListQuery = z.infer<typeof programListQuerySchema>;
export type EvaluationScores = z.infer<typeof evaluationScoresSchema>;