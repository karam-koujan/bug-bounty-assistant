-- Milestone 6 (Report Builder): additional editable report sections.
ALTER TABLE `reports` ADD COLUMN `affected_asset` text;
ALTER TABLE `reports` ADD COLUMN `preconditions` text;
