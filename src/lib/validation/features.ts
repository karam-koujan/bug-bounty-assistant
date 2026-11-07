import { z } from 'zod';

export const featureCreateSchema = z.object({
  programId: z.string().uuid(),
  assetId: z.string().uuid().optional().nullable(),
  name: z.string().min(1).max(200),
  description: z.string().optional(),
  rolesJson: z.array(z.string()).default([]),
  resourceTypesJson: z.array(z.string()).default([]),
  expectedSecurityPropertiesJson: z.array(z.string()).default([]),
  notes: z.string().optional(),
});

export const featureUpdateSchema = featureCreateSchema.partial();

export const featureParamsSchema = z.object({
  id: z.string().uuid(),
});

export const featureListQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  assetId: z.string().uuid().optional(),
  search: z.string().optional(),
  sortBy: z.enum(['name', 'createdAt']).default('name'),
  sortOrder: z.enum(['asc', 'desc']).default('asc'),
});