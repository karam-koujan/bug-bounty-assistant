import { sqliteTable, text, integer, index, uniqueIndex, foreignKey } from 'drizzle-orm/sqlite-core';
import { programs } from './programs';
import { evidence } from './evidence';

export const assets = sqliteTable('assets', {
  id: text('id').primaryKey(),
  programId: text('program_id').notNull().references(() => programs.id, { onDelete: 'cascade' }),
  assetIdentifier: text('asset_identifier').notNull(),
  assetType: text('asset_type').notNull(),
  scopeStatus: text('scope_status', {
    enum: ['in_scope', 'out_of_scope', 'unknown'],
  }).notNull().default('unknown'),
  restrictionsJson: text('restrictions_json').notNull().default('{}'),
  evidenceId: text('evidence_id').references(() => evidence.id, { onDelete: 'set null' }),
  notes: text('notes'),
}, (table) => ({
  programIdx: index('assets_program_id_idx').on(table.programId),
  scopeIdx: index('assets_scope_status_idx').on(table.scopeStatus),
  evidenceIdx: index('assets_evidence_id_idx').on(table.evidenceId),
  programIdentifierUnique: uniqueIndex('assets_program_identifier_unique_idx').on(table.programId, table.assetIdentifier),
}));