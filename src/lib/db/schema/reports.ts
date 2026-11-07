import { sqliteTable, text, integer, index, foreignKey } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';
import { programs } from './programs';
import { hypotheses } from './hypotheses';

export const reports = sqliteTable('reports', {
  id: text('id').primaryKey(),
  programId: text('program_id').notNull().references(() => programs.id, { onDelete: 'cascade' }),
  hypothesisId: text('hypothesis_id').notNull().references(() => hypotheses.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  summary: text('summary'),
  affectedAsset: text('affected_asset'),
  preconditions: text('preconditions'),
  reproductionStepsJson: text('reproduction_steps_json').notNull().default('[]'),
  expectedBehavior: text('expected_behavior'),
  actualBehavior: text('actual_behavior'),
  demonstratedImpact: text('demonstrated_impact'),
  remediation: text('remediation'),
  reportStatus: text('report_status', {
    enum: ['draft', 'in_review', 'approved', 'submitted'],
  }).notNull().default('draft'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
}, (table) => ({
  programIdx: index('reports_program_id_idx').on(table.programId),
  hypothesisIdx: index('reports_hypothesis_id_idx').on(table.hypothesisId),
  statusIdx: index('reports_status_idx').on(table.reportStatus),
}));