import { sqliteTable, text, integer, index, foreignKey } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';
import { programs } from './programs';
import { hypotheses } from './hypotheses';

export const researchSessions = sqliteTable('research_sessions', {
  id: text('id').primaryKey(),
  programId: text('program_id').notNull().references(() => programs.id, { onDelete: 'cascade' }),
  hypothesisId: text('hypothesis_id').references(() => hypotheses.id, { onDelete: 'set null' }),
  objective: text('objective').notNull(),
  sessionNotes: text('session_notes'),
  handoffSummary: text('handoff_summary'),
  nextStepsJson: text('next_steps_json').notNull().default('[]'),
  startedAt: integer('started_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
  endedAt: integer('ended_at', { mode: 'timestamp' }),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
}, (table) => ({
  programIdx: index('research_sessions_program_id_idx').on(table.programId),
  hypothesisIdx: index('research_sessions_hypothesis_id_idx').on(table.hypothesisId),
  startedAtIdx: index('research_sessions_started_at_idx').on(table.startedAt),
}));

export const testObservations = sqliteTable('test_observations', {
  id: text('id').primaryKey(),
  programId: text('program_id').notNull().references(() => programs.id, { onDelete: 'cascade' }),
  sessionId: text('session_id').notNull().references(() => researchSessions.id, { onDelete: 'cascade' }),
  hypothesisId: text('hypothesis_id').notNull().references(() => hypotheses.id, { onDelete: 'cascade' }),
  testDescription: text('test_description').notNull(),
  expectedResult: text('expected_result'),
  actualResult: text('actual_result'),
  evidenceIdsJson: text('evidence_ids_json').notNull().default('[]'),
  conclusion: text('conclusion'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
}, (table) => ({
  sessionIdx: index('test_observations_session_id_idx').on(table.sessionId),
  hypothesisIdx: index('test_observations_hypothesis_id_idx').on(table.hypothesisId),
  programIdx: index('test_observations_program_id_idx').on(table.programId),
  conclusionIdx: index('test_observations_conclusion_idx').on(table.conclusion),
}));