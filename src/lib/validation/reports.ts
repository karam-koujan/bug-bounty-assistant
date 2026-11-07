import { z } from 'zod';

export const reportStatusSchema = z.enum(['draft', 'in_review', 'approved', 'submitted']);
export const reportStatusTransitions: Record<string, readonly string[]> = {
  draft: ['draft', 'in_review'],
  in_review: ['in_review', 'approved'],
  approved: ['approved', 'submitted'],
  submitted: ['submitted'],
};

export const reportCreateSchema = z.object({
  programId: z.string().uuid(),
  hypothesisId: z.string().uuid(),
  title: z.string().min(1).max(500),
  summary: z.string().optional(),
  affectedAsset: z.string().optional(),
  preconditions: z.string().optional(),
  reproductionStepsJson: z.array(z.string()).default([]),
  expectedBehavior: z.string().optional(),
  actualBehavior: z.string().optional(),
  demonstratedImpact: z.string().optional(),
  remediation: z.string().optional(),
  reportStatus: reportStatusSchema.default('draft'),
});

export const reportUpdateSchema = reportCreateSchema
  .omit({ programId: true, hypothesisId: true })
  .partial()
  .extend({
    reportStatus: reportStatusSchema.optional(),
  });

export const reportParamsSchema = z.object({
  id: z.string().uuid(),
});

export const reportPathParamsSchema = z.object({
  id: z.string().uuid(),
  reportId: z.string().uuid(),
});

export const reportListQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  status: reportStatusSchema.optional(),
  hypothesisId: z.string().uuid().optional(),
  search: z.string().optional(),
  sortBy: z.enum(['title', 'reportStatus', 'createdAt', 'updatedAt']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

/** Body of POST /api/programs/[id]/reports/draft — AI drafting of a confirmed finding. */
export const reportDraftRequestSchema = z.object({
  hypothesisId: z.string().uuid(),
});
