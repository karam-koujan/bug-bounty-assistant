import { sqliteTable, text, integer, real, index, foreignKey } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';
import { programs } from './programs';
import { features } from './features';

export const hypotheses = sqliteTable('hypotheses', {
  id: text('id').primaryKey(),
  programId: text('program_id').notNull().references(() => programs.id, { onDelete: 'cascade' }),
  featureId: text('feature_id').references(() => features.id, { onDelete: 'set null' }),
  title: text('title').notNull(),
  statement: text('statement').notNull(),
  category: text('category').notNull(),
  supportingEvidenceJson: text('supporting_evidence_json').notNull().default('[]'),
  contradictingEvidenceJson: text('contradicting_evidence_json').notNull().default('[]'),
  assumptionsJson: text('assumptions_json').notNull().default('[]'),
  prerequisitesJson: text('prerequisites_json').notNull().default('[]'),
  testPlan: text('test_plan'),
  expectedVulnerableResult: text('expected_vulnerable_result'),
  expectedSafeResult: text('expected_safe_result'),
  potentialImpact: text('potential_impact'),
  status: text('status', {
    enum: [
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
    ],
  }).notNull().default('draft'),
  priorityScore: real('priority_score').notNull().default(0),
  priorityBreakdownJson: text('priority_breakdown_json').notNull().default('{}'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
}, (table) => ({
  programIdx: index('hypotheses_program_id_idx').on(table.programId),
  featureIdx: index('hypotheses_feature_id_idx').on(table.featureId),
  statusIdx: index('hypotheses_status_idx').on(table.status),
  priorityIdx: index('hypotheses_priority_score_idx').on(table.priorityScore),
}));