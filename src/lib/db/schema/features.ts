import { sqliteTable, text, integer, index, foreignKey } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';
import { programs } from './programs';
import { assets } from './assets';

export const features = sqliteTable('features', {
  id: text('id').primaryKey(),
  programId: text('program_id').notNull().references(() => programs.id, { onDelete: 'cascade' }),
  assetId: text('asset_id').references(() => assets.id, { onDelete: 'set null' }),
  name: text('name').notNull(),
  description: text('description'),
  rolesJson: text('roles_json').notNull().default('[]'),
  resourceTypesJson: text('resource_types_json').notNull().default('[]'),
  expectedSecurityPropertiesJson: text('expected_security_properties_json').notNull().default('[]'),
  notes: text('notes'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
}, (table) => ({
  programIdx: index('features_program_id_idx').on(table.programId),
  assetIdx: index('features_asset_id_idx').on(table.assetId),
  createdAtIdx: index('features_created_at_idx').on(table.createdAt),
}));