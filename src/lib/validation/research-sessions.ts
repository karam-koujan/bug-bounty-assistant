import { z } from 'zod';

export const sessionCreateSchema = z.object({
  programId: z.string().uuid(),
  hypothesisId: z.string().uuid().optional(),
  objective: z.string().min(1).max(500),
  sessionNotes: z.string().optional(),
  handoffSummary: z.string().optional(),
  nextStepsJson: z.array(z.string()).default([]),
});

export const sessionUpdateSchema = sessionCreateSchema.partial();

export const sessionParamsSchema = z.object({
  id: z.string().uuid(),
});

export const sessionListQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  hypothesisId: z.string().uuid().optional(),
  search: z.string().optional(),
  sortBy: z.enum(['startedAt', 'objective']).default('startedAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export const observationCreateSchema = z.object({
  programId: z.string().uuid(),
  sessionId: z.string().uuid(),
  hypothesisId: z.string().uuid(),
  testDescription: z.string().min(1).max(2000),
  expectedResult: z.string().optional(),
  actualResult: z.string().optional(),
  evidenceIdsJson: z.array(z.string().uuid()).default([]),
  conclusion: z.string().optional(),
});

export const observationUpdateSchema = observationCreateSchema.partial();

export const observationParamsSchema = z.object({
  id: z.string().uuid(),
});

export const observationListQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  sessionId: z.string().uuid().optional(),
  hypothesisId: z.string().uuid().optional(),
  conclusion: z.string().optional(),
  sortBy: z.enum(['createdAt', 'testDescription']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});