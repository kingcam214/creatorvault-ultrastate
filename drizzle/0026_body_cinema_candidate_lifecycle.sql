-- Body Cinema Phase A: one qualified source, one reserved candidate slot, one creator decision.
-- This migration is additive. It does not generate, move, expose, or delete media.
CREATE TABLE IF NOT EXISTS `body_cinema_candidate_lifecycles` (
  `id` char(36) NOT NULL,
  `project_id` char(36) NOT NULL,
  `creator_id` bigint NOT NULL,
  `source_asset_id` varchar(191) NOT NULL,
  `source_sha256` char(64) NOT NULL,
  `source_snapshot_json` json NOT NULL,
  `rights_assertion_json` json NOT NULL,
  `rights_assertion_hash` char(64) NOT NULL,
  `treatment_version` varchar(96) DEFAULT NULL,
  `treatment_json` json DEFAULT NULL,
  `treatment_hash` char(64) DEFAULT NULL,
  `state` varchar(32) NOT NULL,
  `candidate_asset_id` varchar(191) DEFAULT NULL,
  `candidate_sha256` char(64) DEFAULT NULL,
  `candidate_snapshot_json` json DEFAULT NULL,
  `candidate_provenance_json` json DEFAULT NULL,
  `attachment_authorization_json` json DEFAULT NULL,
  `review_id` char(36) DEFAULT NULL,
  `review_json` json DEFAULT NULL,
  `decision_json` json DEFAULT NULL,
  `handoff_json` json DEFAULT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `body_cinema_lifecycle_project_unique` (`project_id`),
  UNIQUE KEY `body_cinema_lifecycle_creator_source_unique` (`creator_id`,`source_asset_id`),
  UNIQUE KEY `body_cinema_lifecycle_candidate_unique` (`candidate_asset_id`),
  KEY `body_cinema_lifecycle_creator_updated_idx` (`creator_id`,`updated_at`),
  KEY `body_cinema_lifecycle_state_idx` (`state`,`updated_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- No foreign keys are added here because `creation_projects` is an existing runtime-
-- provisioned legacy table rather than a migration-owned table in this history. The
-- service locks and verifies its exact project row in every state-changing transaction.
