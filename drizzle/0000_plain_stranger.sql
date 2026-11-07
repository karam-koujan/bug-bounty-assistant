CREATE TABLE `programs` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`platform` text NOT NULL,
	`program_url` text NOT NULL,
	`policy_text` text,
	`policy_reviewed_at` integer,
	`research_status` text DEFAULT 'inbox' NOT NULL,
	`evaluation_scores_json` text DEFAULT '{}' NOT NULL,
	`notes` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `programs_name_idx` ON `programs` (`name`);--> statement-breakpoint
CREATE INDEX `programs_platform_idx` ON `programs` (`platform`);--> statement-breakpoint
CREATE INDEX `programs_research_status_idx` ON `programs` (`research_status`);--> statement-breakpoint
CREATE TABLE `assets` (
	`id` text PRIMARY KEY NOT NULL,
	`program_id` text NOT NULL,
	`asset_identifier` text NOT NULL,
	`asset_type` text NOT NULL,
	`scope_status` text DEFAULT 'unknown' NOT NULL,
	`restrictions_json` text DEFAULT '{}' NOT NULL,
	`evidence_id` text,
	`notes` text,
	FOREIGN KEY (`program_id`) REFERENCES `programs`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`evidence_id`) REFERENCES `evidence`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `assets_program_id_idx` ON `assets` (`program_id`);--> statement-breakpoint
CREATE INDEX `assets_scope_status_idx` ON `assets` (`scope_status`);--> statement-breakpoint
CREATE INDEX `assets_evidence_id_idx` ON `assets` (`evidence_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `assets_program_identifier_unique_idx` ON `assets` (`program_id`,`asset_identifier`);--> statement-breakpoint
CREATE TABLE `features` (
	`id` text PRIMARY KEY NOT NULL,
	`program_id` text NOT NULL,
	`asset_id` text,
	`name` text NOT NULL,
	`description` text,
	`roles_json` text DEFAULT '[]' NOT NULL,
	`resource_types_json` text DEFAULT '[]' NOT NULL,
	`expected_security_properties_json` text DEFAULT '[]' NOT NULL,
	`notes` text,
	FOREIGN KEY (`program_id`) REFERENCES `programs`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`asset_id`) REFERENCES `assets`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `features_program_id_idx` ON `features` (`program_id`);--> statement-breakpoint
CREATE INDEX `features_asset_id_idx` ON `features` (`asset_id`);--> statement-breakpoint
CREATE TABLE `endpoints` (
	`id` text PRIMARY KEY NOT NULL,
	`program_id` text NOT NULL,
	`asset_id` text,
	`feature_id` text,
	`method` text NOT NULL,
	`path_template` text NOT NULL,
	`purpose` text,
	`authentication_requirement` text,
	`expected_authorization` text,
	`source_evidence_id` text,
	`test_status` text DEFAULT 'untested' NOT NULL,
	`notes` text,
	FOREIGN KEY (`program_id`) REFERENCES `programs`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`asset_id`) REFERENCES `assets`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`feature_id`) REFERENCES `features`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`source_evidence_id`) REFERENCES `evidence`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `endpoints_program_id_idx` ON `endpoints` (`program_id`);--> statement-breakpoint
CREATE INDEX `endpoints_asset_id_idx` ON `endpoints` (`asset_id`);--> statement-breakpoint
CREATE INDEX `endpoints_feature_id_idx` ON `endpoints` (`feature_id`);--> statement-breakpoint
CREATE INDEX `endpoints_method_idx` ON `endpoints` (`method`);--> statement-breakpoint
CREATE INDEX `endpoints_test_status_idx` ON `endpoints` (`test_status`);--> statement-breakpoint
CREATE INDEX `endpoints_source_evidence_id_idx` ON `endpoints` (`source_evidence_id`);--> statement-breakpoint
CREATE TABLE `evidence` (
	`id` text PRIMARY KEY NOT NULL,
	`program_id` text NOT NULL,
	`evidence_type` text NOT NULL,
	`title` text NOT NULL,
	`content` text NOT NULL,
	`source_url` text,
	`collected_at` integer DEFAULT (unixepoch()) NOT NULL,
	`verification_status` text DEFAULT 'unverified' NOT NULL,
	`content_hash` text,
	`metadata_json` text DEFAULT '{}' NOT NULL,
	FOREIGN KEY (`program_id`) REFERENCES `programs`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `evidence_program_id_idx` ON `evidence` (`program_id`);--> statement-breakpoint
CREATE INDEX `evidence_type_idx` ON `evidence` (`evidence_type`);--> statement-breakpoint
CREATE INDEX `evidence_collected_at_idx` ON `evidence` (`collected_at`);--> statement-breakpoint
CREATE INDEX `evidence_verification_status_idx` ON `evidence` (`verification_status`);--> statement-breakpoint
CREATE INDEX `evidence_content_hash_idx` ON `evidence` (`content_hash`);--> statement-breakpoint
CREATE TABLE `hypotheses` (
	`id` text PRIMARY KEY NOT NULL,
	`program_id` text NOT NULL,
	`feature_id` text,
	`title` text NOT NULL,
	`statement` text NOT NULL,
	`category` text NOT NULL,
	`supporting_evidence_json` text DEFAULT '[]' NOT NULL,
	`contradicting_evidence_json` text DEFAULT '[]' NOT NULL,
	`assumptions_json` text DEFAULT '[]' NOT NULL,
	`prerequisites_json` text DEFAULT '[]' NOT NULL,
	`test_plan` text,
	`expected_vulnerable_result` text,
	`expected_safe_result` text,
	`potential_impact` text,
	`status` text DEFAULT 'draft' NOT NULL,
	`priority_score` real DEFAULT 0 NOT NULL,
	`priority_breakdown_json` text DEFAULT '{}' NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`program_id`) REFERENCES `programs`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`feature_id`) REFERENCES `features`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `hypotheses_program_id_idx` ON `hypotheses` (`program_id`);--> statement-breakpoint
CREATE INDEX `hypotheses_feature_id_idx` ON `hypotheses` (`feature_id`);--> statement-breakpoint
CREATE INDEX `hypotheses_status_idx` ON `hypotheses` (`status`);--> statement-breakpoint
CREATE INDEX `hypotheses_priority_score_idx` ON `hypotheses` (`priority_score`);--> statement-breakpoint
CREATE TABLE `research_sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`program_id` text NOT NULL,
	`hypothesis_id` text,
	`objective` text NOT NULL,
	`session_notes` text,
	`handoff_summary` text,
	`next_steps_json` text DEFAULT '[]' NOT NULL,
	`started_at` integer DEFAULT (unixepoch()) NOT NULL,
	`ended_at` integer,
	FOREIGN KEY (`program_id`) REFERENCES `programs`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`hypothesis_id`) REFERENCES `hypotheses`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `research_sessions_program_id_idx` ON `research_sessions` (`program_id`);--> statement-breakpoint
CREATE INDEX `research_sessions_hypothesis_id_idx` ON `research_sessions` (`hypothesis_id`);--> statement-breakpoint
CREATE INDEX `research_sessions_started_at_idx` ON `research_sessions` (`started_at`);--> statement-breakpoint
CREATE TABLE `test_observations` (
	`id` text PRIMARY KEY NOT NULL,
	`session_id` text NOT NULL,
	`hypothesis_id` text NOT NULL,
	`test_description` text NOT NULL,
	`expected_result` text,
	`actual_result` text,
	`evidence_ids_json` text DEFAULT '[]' NOT NULL,
	`conclusion` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`session_id`) REFERENCES `research_sessions`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`hypothesis_id`) REFERENCES `hypotheses`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `test_observations_session_id_idx` ON `test_observations` (`session_id`);--> statement-breakpoint
CREATE INDEX `test_observations_hypothesis_id_idx` ON `test_observations` (`hypothesis_id`);--> statement-breakpoint
CREATE INDEX `test_observations_conclusion_idx` ON `test_observations` (`conclusion`);--> statement-breakpoint
CREATE TABLE `reports` (
	`id` text PRIMARY KEY NOT NULL,
	`program_id` text NOT NULL,
	`hypothesis_id` text NOT NULL,
	`title` text NOT NULL,
	`summary` text,
	`reproduction_steps_json` text DEFAULT '[]' NOT NULL,
	`expected_behavior` text,
	`actual_behavior` text,
	`demonstrated_impact` text,
	`remediation` text,
	`report_status` text DEFAULT 'draft' NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`program_id`) REFERENCES `programs`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`hypothesis_id`) REFERENCES `hypotheses`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `reports_program_id_idx` ON `reports` (`program_id`);--> statement-breakpoint
CREATE INDEX `reports_hypothesis_id_idx` ON `reports` (`hypothesis_id`);--> statement-breakpoint
CREATE INDEX `reports_status_idx` ON `reports` (`report_status`);--> statement-breakpoint
CREATE TABLE `ai_runs` (
	`id` text PRIMARY KEY NOT NULL,
	`task_type` text NOT NULL,
	`provider` text NOT NULL,
	`model` text NOT NULL,
	`prompt_version` text NOT NULL,
	`input_reference_ids_json` text DEFAULT '[]' NOT NULL,
	`output_json` text NOT NULL,
	`validation_status` text DEFAULT 'valid' NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `ai_runs_task_type_idx` ON `ai_runs` (`task_type`);--> statement-breakpoint
CREATE INDEX `ai_runs_provider_idx` ON `ai_runs` (`provider`);--> statement-breakpoint
CREATE INDEX `ai_runs_created_at_idx` ON `ai_runs` (`created_at`);