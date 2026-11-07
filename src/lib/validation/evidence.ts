import { z } from 'zod';

export const evidenceTypeSchema = z.enum([
  'program_policy',
  'official_documentation',
  'security_advisory',
  'release_note',
  'technology_observation',
  'endpoint_observation',
  'http_request',
  'http_response',
  'manual_test_result',
  'screenshot_or_attachment',
  'researcher_conclusion',
]);

export const verificationStatusSchema = z.enum(['unverified', 'verified', 'disputed']);

export const evidenceCreateSchema = z.object({
  programId: z.string().uuid(),
  evidenceType: evidenceTypeSchema,
  title: z.string().min(1).max(500),
  content: z.string().min(1),
  sourceUrl: z.string().url().optional().nullable(),
  collectedAt: z.string().datetime().optional(),
  verificationStatus: verificationStatusSchema.default('unverified'),
  contentHash: z.string().optional(),
  metadataJson: z.record(z.string(), z.unknown()).default({}),
});

export const evidenceUpdateSchema = evidenceCreateSchema.partial();

export const evidenceParamsSchema = z.object({
  id: z.string().uuid(),
});

export const evidenceListQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  type: evidenceTypeSchema.optional(),
  verificationStatus: verificationStatusSchema.optional(),
  search: z.string().optional(),
  sortBy: z.enum(['title', 'evidenceType', 'collectedAt', 'verificationStatus']).default('collectedAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});