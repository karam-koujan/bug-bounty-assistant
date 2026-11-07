import { sqliteTable, text, integer, index } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

export const aiRuns = sqliteTable('ai_runs', {
  id: text('id').primaryKey(),
  hypothesisId: text('hypothesis_id'),   // FK to hypotheses, populated by the approval gate
  taskType: text('task_type', {
    enum: [
      'evaluate_program',
      'analyze_feature',
      'generate_hypotheses',
      'analyze_observation',
      'research_advisory',
      'generate_session_summary',
      'draft_report',
    ],
  }).notNull(),
  provider: text('provider').notNull(),
  model: text('model').notNull(),
  promptVersion: text('prompt_version').notNull(),
  inputReferenceIdsJson: text('input_reference_ids_json').notNull().default('[]'),
  outputJson: text('output_json').notNull(),
  validationStatus: text('validation_status', {
    enum: ['valid', 'invalid', 'partial'],
  }).notNull().default('valid'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
}, (table) => ({
  taskTypeIdx: index('ai_runs_task_type_idx').on(table.taskType),
  hypothesisIdIdx: index('ai_runs_hypothesis_id_idx').on(table.hypothesisId),
}));