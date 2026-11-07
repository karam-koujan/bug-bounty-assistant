import { z } from 'zod';

export const aiTaskTypeSchema = z.enum([
  'evaluate_program',
  'analyze_feature',
  'generate_hypotheses',
  'analyze_observation',
  'research_advisory',
  'generate_session_summary',
  'draft_report',
]);

export const aiValidationStatusSchema = z.enum(['valid', 'invalid', 'partial']);

export const aiRunCreateSchema = z.object({
  taskType: aiTaskTypeSchema,
  provider: z.string().min(1).max(50),
  model: z.string().min(1).max(100),
  promptVersion: z.string().min(1).max(50),
  inputReferenceIdsJson: z.array(z.string().uuid()).default([]),
  outputJson: z.record(z.string(), z.unknown()),
  validationStatus: aiValidationStatusSchema.default('valid'),
  createdAt: z.string().datetime().optional(),
});

export const aiRunParamsSchema = z.object({
  id: z.string().uuid(),
});

export const aiRunListQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  taskType: aiTaskTypeSchema.optional(),
  provider: z.string().optional(),
  validationStatus: aiValidationStatusSchema.optional(),
  sortBy: z.enum(['taskType', 'provider', 'model', 'createdAt']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});