import { sqliteTable, text, integer, index, foreignKey } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';
import { programs } from './programs';
import { assets } from './assets';
import { features } from './features';
import { evidence } from './evidence';

export const endpoints = sqliteTable('endpoints', {
  id: text('id').primaryKey(),
  programId: text('program_id').notNull().references(() => programs.id, { onDelete: 'cascade' }),
  assetId: text('asset_id').references(() => assets.id, { onDelete: 'set null' }),
  featureId: text('feature_id').references(() => features.id, { onDelete: 'set null' }),
  method: text('method').notNull(),
  pathTemplate: text('path_template').notNull(),
  purpose: text('purpose'),
  authenticationRequirement: text('authentication_requirement'),
  expectedAuthorization: text('expected_authorization'),
  sourceEvidenceId: text('source_evidence_id').references(() => evidence.id, { onDelete: 'set null' }),
  testStatus: text('test_status', {
    enum: ['untested', 'testing', 'tested_vulnerable', 'tested_secure', 'blocked'],
  }).notNull().default('untested'),
  notes: text('notes'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
}, (table) => ({
  programIdx: index('endpoints_program_id_idx').on(table.programId),
  assetIdx: index('endpoints_asset_id_idx').on(table.assetId),
  featureIdx: index('endpoints_feature_id_idx').on(table.featureId),
  methodIdx: index('endpoints_method_idx').on(table.method),
  testStatusIdx: index('endpoints_test_status_idx').on(table.testStatus),
  sourceEvidenceIdx: index('endpoints_source_evidence_id_idx').on(table.sourceEvidenceId),
  createdAtIdx: index('endpoints_created_at_idx').on(table.createdAt),
  pathTemplateIdx: index('endpoints_path_template_idx').on(table.pathTemplate),
}));