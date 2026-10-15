-- Body Cinema: preserve the legacy source singleton while allowing distinct Body Directed plans.
-- One atomic ALTER; no historical row, JSON assertion, receipt, hash or timestamp is rewritten.
ALTER TABLE `body_cinema_candidate_lifecycles`
  DROP INDEX `body_cinema_lifecycle_creator_source_unique`,
  ADD COLUMN `plan_scope` varchar(36) GENERATED ALWAYS AS (
    CASE WHEN JSON_VALUE(`rights_assertion_json`, '$.version') COLLATE utf8mb4_bin = _utf8mb4'body_cinema.body_directed_assertion.v1' COLLATE utf8mb4_bin THEN RTRIM(`id`) ELSE '' END
  ) VIRTUAL,
  ADD UNIQUE KEY `body_cinema_lifecycle_creator_source_scope_unique` (`creator_id`,`source_asset_id`,`plan_scope`);
