-- Milestone 1/3 timestamps (ALTER TABLE requires constant DEFAULTs in SQLite)
ALTER TABLE `features` ADD COLUMN `created_at` integer DEFAULT 0 NOT NULL;
ALTER TABLE `features` ADD COLUMN `updated_at` integer DEFAULT 0 NOT NULL;
ALTER TABLE `endpoints` ADD COLUMN `created_at` integer DEFAULT 0 NOT NULL;
ALTER TABLE `endpoints` ADD COLUMN `updated_at` integer DEFAULT 0 NOT NULL;

-- Add indexes for created_at
CREATE INDEX `features_created_at_idx` ON `features` (`created_at`);
CREATE INDEX `endpoints_created_at_idx` ON `endpoints` (`created_at`);

-- Add index on path_template for search performance
CREATE INDEX `endpoints_path_template_idx` ON `endpoints` (`path_template`);
