-- CreatorVault Daily Acquisition + Revenue Engine
-- Durable revenue-operations layer. Real revenue remains sourced from subscriptions/transactions only.

CREATE TABLE IF NOT EXISTS daily_revenue_plans (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  plan_date DATE NOT NULL,
  status VARCHAR(40) NOT NULL DEFAULT 'active',
  operator_label VARCHAR(160) NULL,
  target_creators INT NOT NULL DEFAULT 25,
  target_activations INT NOT NULL DEFAULT 5,
  target_first_dollars INT NOT NULL DEFAULT 1,
  target_mrr_cents BIGINT NOT NULL DEFAULT 0,
  actual_creators_contacted INT NOT NULL DEFAULT 0,
  actual_activations INT NOT NULL DEFAULT 0,
  actual_first_dollars INT NOT NULL DEFAULT 0,
  actual_mrr_cents BIGINT NOT NULL DEFAULT 0,
  actual_cash_collected_cents BIGINT NOT NULL DEFAULT 0,
  execution_notes TEXT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uniq_daily_revenue_plan_date (plan_date),
  KEY idx_daily_revenue_plan_status_date (status, plan_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS daily_creator_pipeline (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  plan_id BIGINT UNSIGNED NOT NULL,
  creator_id BIGINT NULL,
  recruiter_profile_id INT NULL,
  outreach_lead_id BIGINT NULL,
  conversion_packet_id INT NULL,
  handle VARCHAR(180) NOT NULL,
  platform VARCHAR(80) NOT NULL DEFAULT 'unknown',
  stage VARCHAR(60) NOT NULL DEFAULT 'targeted',
  priority_score INT NOT NULL DEFAULT 0,
  priority_band VARCHAR(40) NOT NULL DEFAULT 'medium',
  package_priority VARCHAR(120) NULL,
  next_action VARCHAR(255) NOT NULL,
  next_action_due_at DATETIME NULL,
  activation_status VARCHAR(80) NOT NULL DEFAULT 'not_started',
  checkout_status VARCHAR(80) NOT NULL DEFAULT 'not_started',
  first_revenue_transaction_id BIGINT NULL,
  real_revenue_cents BIGINT NOT NULL DEFAULT 0,
  real_revenue_source VARCHAR(80) NOT NULL DEFAULT 'none',
  evidence_payload JSON NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_daily_creator_pipeline_plan FOREIGN KEY (plan_id) REFERENCES daily_revenue_plans(id) ON DELETE CASCADE,
  UNIQUE KEY uniq_daily_pipeline_plan_handle_platform (plan_id, handle, platform),
  KEY idx_daily_pipeline_stage (stage),
  KEY idx_daily_pipeline_next_action (next_action_due_at, priority_score),
  KEY idx_daily_pipeline_creator (creator_id),
  KEY idx_daily_pipeline_recruiter_profile (recruiter_profile_id),
  KEY idx_daily_pipeline_conversion_packet (conversion_packet_id),
  KEY idx_daily_pipeline_first_transaction (first_revenue_transaction_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS daily_creator_events (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  pipeline_id BIGINT UNSIGNED NOT NULL,
  event_type VARCHAR(80) NOT NULL,
  event_source VARCHAR(80) NOT NULL DEFAULT 'operator',
  previous_stage VARCHAR(60) NULL,
  next_stage VARCHAR(60) NULL,
  event_payload JSON NULL,
  occurred_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_daily_creator_events_pipeline FOREIGN KEY (pipeline_id) REFERENCES daily_creator_pipeline(id) ON DELETE CASCADE,
  KEY idx_daily_creator_events_type_time (event_type, occurred_at),
  KEY idx_daily_creator_events_pipeline_time (pipeline_id, occurred_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS daily_revenue_snapshots (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  snapshot_date DATE NOT NULL,
  active_subscriptions INT NOT NULL DEFAULT 0,
  mrr_cents BIGINT NOT NULL DEFAULT 0,
  cash_collected_cents BIGINT NOT NULL DEFAULT 0,
  creator_earnings_cents BIGINT NOT NULL DEFAULT 0,
  platform_share_cents BIGINT NOT NULL DEFAULT 0,
  first_dollar_creators INT NOT NULL DEFAULT 0,
  checkout_started_count INT NOT NULL DEFAULT 0,
  checkout_recovered_count INT NOT NULL DEFAULT 0,
  source_tables JSON NOT NULL,
  computed_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uniq_daily_revenue_snapshot_date (snapshot_date),
  KEY idx_daily_revenue_snapshot_computed (computed_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
