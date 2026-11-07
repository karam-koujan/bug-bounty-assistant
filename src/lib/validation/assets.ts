import { z } from 'zod';

export const scopeStatusSchema = z.enum(['in_scope', 'out_of_scope', 'unknown']);

export const assetCreateSchema = z.object({
  programId: z.string().uuid(),
  assetIdentifier: z.string().min(1).max(500),
  assetType: z.string().min(1).max(100),
  scopeStatus: scopeStatusSchema.default('unknown'),
  restrictionsJson: z.record(z.string(), z.unknown()).default({}),
  evidenceId: z.string().uuid().optional().nullable(),
  notes: z.string().optional(),
});

export const assetUpdateSchema = assetCreateSchema.partial();

export const assetParamsSchema = z.object({
  id: z.string().uuid(),
});