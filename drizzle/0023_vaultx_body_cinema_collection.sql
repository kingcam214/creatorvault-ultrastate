-- VaultX Body Cinema Collection persistence
-- Keeps Body Intelligence outputs packaged as creator-owned sellable collections.
CREATE TABLE IF NOT EXISTS `vaultx_body_cinema_collections` (
  `id` varchar(36) PRIMARY KEY,
  `project_id` int NOT NULL,
  `creator_id` int NOT NULL,
  `collection_name` varchar(180) NOT NULL,
  `cinematic_style` varchar(50) NOT NULL DEFAULT 'luxury',
  `source_asset_url` text,
  `hero_asset_url` text,
  `selected_regions` json,
  `production_plan` json,
  `platform_exports` json,
  `ppv_price_cents` int NOT NULL DEFAULT 1999,
  `status` enum('draft','ready','queued','published','archived') NOT NULL DEFAULT 'ready',
  `published_content_id` int NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_body_cinema_creator_id` (`creator_id`),
  INDEX `idx_body_cinema_project_id` (`project_id`),
  INDEX `idx_body_cinema_status` (`status`),
  INDEX `idx_body_cinema_created_at` (`created_at`)
);
--> statement-breakpoint
ALTER TABLE `vaultx_editor_projects` ADD COLUMN IF NOT EXISTS `body_cinema_collections` json NULL;
--> statement-breakpoint
ALTER TABLE `vaultx_editor_projects` ADD COLUMN IF NOT EXISTS `body_cinema_last_collection_id` varchar(36) NULL;
--> statement-breakpoint
ALTER TABLE `vaultx_editor_projects` ADD COLUMN IF NOT EXISTS `body_captions` json NULL;
