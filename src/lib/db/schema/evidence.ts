import { sqliteTable, text, integer, index, foreignKey } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';
import { programs } from './programs';

export const evidence = sqliteTable('evidence', {
  id: text('id').primaryKey(),
  programId: text('program_id').notNull().references(() => programs.id, { onDelete: 'cascade' }),
  evidenceType: text('evidence_type', {
    enum: [
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
    ],
  }).notNull(),
  title: text('title').notNull(),
  content: text('content').notNull(),
  sourceUrl: text('source_url'),
  collectedAt: integer('collected_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
  verificationStatus: text('verification_status', {
    enum: ['unverified', 'verified', 'disputed'],
  }).notNull().default('unverified'),
  contentHash: text('content_hash'),
  metadataJson: text('metadata_json').notNull().default('{}'),
}, (table) => ({
  programIdx: index('evidence_program_id_idx').on(table.programId),
  typeIdx: index('evidence_type_idx').on(table.evidenceType),
  collectedAtIdx: index('evidence_collected_at_idx').on(table.collectedAt),
  verificationIdx: index('evidence_verification_status_idx').on(table.verificationStatus),
  hashIdx: index('evidence_content_hash_idx').on(table.contentHash),
}));