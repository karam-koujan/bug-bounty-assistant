import { sqliteTable, text, integer, real, index, uniqueIndex } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

export const programs = sqliteTable('programs', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  platform: text('platform').notNull(),
  programUrl: text('program_url').notNull(),
  policyText: text('policy_text'),
  policyReviewedAt: integer('policy_reviewed_at', { mode: 'timestamp' }),
  researchStatus: text('research_status', {
    enum: ['inbox', 'evaluating', 'ready_to_investigate', 'active_research', 'paused', 'archived'],
  }).notNull().default('inbox'),
  evaluationScoresJson: text('evaluation_scores_json').notNull().default('{}'),
  notes: text('notes'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
}, (table) => ({
  nameIdx: index('programs_name_idx').on(table.name),
  platformIdx: index('programs_platform_idx').on(table.platform),
  statusIdx: index('programs_research_status_idx').on(table.researchStatus),
}));