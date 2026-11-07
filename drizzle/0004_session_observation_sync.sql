-- Milestone 5 columns that lacked a migration file (caught by M6 review).
-- Note: SQLite ALTER TABLE ADD COLUMN requires a constant default, hence 0/''.
ALTER TABLE `research_sessions` ADD COLUMN `updated_at` integer DEFAULT 0 NOT NULL;

-- DEFAULT '' keeps pre-existing rows valid for the NOT NULL constraint;
-- SQLite cannot add a REFERENCES column with a non-NULL default via ALTER,
-- so the FK is delegated to the Drizzle schema definitions on fresh CREATEs.
ALTER TABLE `test_observations` ADD COLUMN `program_id` text NOT NULL DEFAULT '';
CREATE INDEX `test_observations_program_id_idx` ON `test_observations` (`program_id`);
