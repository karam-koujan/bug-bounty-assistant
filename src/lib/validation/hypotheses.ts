import { z } from 'zod';

export const hypothesisStatusSchema = z.enum([
  'draft',
  'needs_evidence',
  'ready_for_review',
  'approved_for_testing',
  'testing_in_progress',
  'supported_by_evidence',
  'disproved_by_test',
  'inconclusive',
  'confirmed_finding',
  'rejected',
  'archived',
]);

export const hypothesisCreateSchema = z.object({
  programId: z.string().uuid(),
  featureId: z.string().uuid().optional().nullable(),
  title: z.string().min(1).max(500),
  statement: z.string().min(1),
  category: z.string().min(1).max(100),
  supportingEvidenceJson: z.array(z.string().uuid()).default([]),
  contradictingEvidenceJson: z.array(z.string().uuid()).default([]),
  assumptionsJson: z.array(z.string()).default([]),
  prerequisitesJson: z.array(z.string()).default([]),
  testPlan: z.string().optional(),
  expectedVulnerableResult: z.string().optional(),
  expectedSafeResult: z.string().optional(),
  potentialImpact: z.string().optional(),
  status: hypothesisStatusSchema.default('draft'),
  priorityScore: z.number().default(0),
  priorityBreakdownJson: z.record(z.string(), z.number()).default({}),
});

export const hypothesisUpdateSchema = hypothesisCreateSchema.partial();

export const hypothesisParamsSchema = z.object({
  id: z.string().uuid(),
});

export const hypothesisListQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  status: hypothesisStatusSchema.optional(),
  featureId: z.string().uuid().optional(),
  search: z.string().optional(),
  sortBy: z.enum(['title', 'category', 'status', 'priorityScore', 'createdAt', 'updatedAt']).default('priorityScore'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

/**
 * Allowed hypothesis lifecycle transitions (spec §Feature D).
 * Only the researcher can move a hypothesis to Approved for Testing and beyond,
 * via the PolicyApprovalGate — the transition map enforces the rest in code.
 * A Confirmed Finding is terminal: nothing demotes it silently.
 */
export const hypothesisStatusTransitions: Record<string, readonly string[]> = {
  draft: ['draft', 'needs_evidence', 'ready_for_review', 'rejected', 'archived'],
  needs_evidence: ['needs_evidence', 'ready_for_review', 'draft', 'rejected', 'archived'],
  ready_for_review: ['ready_for_review', 'needs_evidence', 'rejected', 'archived'],
  approved_for_testing: ['approved_for_testing', 'testing_in_progress', 'rejected', 'archived'],
  testing_in_progress: ['testing_in_progress', 'supported_by_evidence', 'disproved_by_test', 'inconclusive', 'archived'],
  supported_by_evidence: ['supported_by_evidence', 'confirmed_finding', 'inconclusive', 'rejected', 'archived'],
  disproved_by_test: ['disproved_by_test', 'rejected', 'archived'],
  inconclusive: ['inconclusive', 'testing_in_progress', 'rejected', 'archived'],
  confirmed_finding: ['confirmed_finding', 'archived'],
  rejected: ['rejected', 'archived'],
  archived: ['archived'],
};

export const hypothesisTransitionBodySchema = z.object({
  status: hypothesisStatusSchema,
  reason: z.string().max(500).optional(),
});

export const hypothesisPathParamsSchema = z.object({
  id: z.string().uuid(),
  hypothesisId: z.string().uuid(),
});