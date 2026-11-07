import { z } from 'zod';

export const testStatusSchema = z.enum(['untested', 'testing', 'tested_vulnerable', 'tested_secure', 'blocked']);

export const httpMethodSchema = z.enum(['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS', 'TRACE']);

export const endpointCreateSchema = z.object({
  programId: z.string().uuid(),
  assetId: z.string().uuid().optional().nullable(),
  featureId: z.string().uuid().optional().nullable(),
  method: httpMethodSchema,
  pathTemplate: z.string().min(1).max(500),
  purpose: z.string().optional(),
  authenticationRequirement: z.string().optional(),
  expectedAuthorization: z.string().optional(),
  sourceEvidenceId: z.string().uuid().optional().nullable(),
  testStatus: testStatusSchema.default('untested'),
  notes: z.string().optional(),
});

export const endpointUpdateSchema = endpointCreateSchema.partial();

export const endpointParamsSchema = z.object({
  id: z.string().uuid(),
});

export const endpointListQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  assetId: z.string().uuid().optional(),
  featureId: z.string().uuid().optional(),
  method: z.string().optional(),
  testStatus: testStatusSchema.optional(),
  search: z.string().optional(),
  sortBy: z.enum(['method', 'pathTemplate', 'testStatus', 'createdAt']).default('method'),
  sortOrder: z.enum(['asc', 'desc']).default('asc'),
});