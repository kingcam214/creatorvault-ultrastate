-- CreatorVault Top 5 Activation Sprint
-- Fixed five-creator execution layer for first-dollar, retention, payout, and blocker progression.
-- Real outcome fields are ledger-backed only; source projections are stored separately for selection context.

CREATE TABLE IF NOT EXISTS top5_activation_sprint (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  sprint_date DATE NOT NULL,
  top5_rank INT NOT NULL,
  sprint_status VARCHAR(40) NOT NULL DEFAULT 'active',

  source_table VARCHAR(120) NOT NULL,
  source_id VARCHAR(80) NOT NULL,
  profile_id INT NULL,
  creator_id BIGINT NULL,
  pipeline_id BIGINT UNSIGNED NULL,
  conversion_packet_id INT NULL,

  handle VARCHAR(180) NOT NULL,
  platform VARCHAR(80) NOT NULL DEFAULT 'unknown',
  display_name VARCHAR(255) NULL,
  niche VARCHAR(120) NULL,

  activation_score INT NOT NULL DEFAULT 0,
  priority_band VARCHAR(40) NOT NULL DEFAULT 'critical',
  risk_level VARCHAR(40) NOT NULL DEFAULT 'unknown',
  approval_status VARCHAR(80) NOT NULL DEFAULT 'requires_kingcam_approval',

  checkout_status VARCHAR(80) NOT NULL DEFAULT 'not_started',
  first_dollar_status VARCHAR(80) NOT NULL DEFAULT 'not_earned',
  retention_status VARCHAR(80) NOT NULL DEFAULT 'not_active',
  payout_status VARCHAR(80) NOT NULL DEFAULT 'not_applicable',

  primary_blocker_key VARCHAR(120) NOT NULL DEFAULT 'missing_first_completed_payment',
  primary_blocker_label VARCHAR(255) NOT NULL DEFAULT 'No first completed payment in ledger',
  primary_blocker_severity VARCHAR(40) NOT NULL DEFAULT 'critical',
  next_money_action VARCHAR(255) NOT NULL,

  operator_owner VARCHAR(120) NULL,
  operator_note TEXT NULL,
  last_operator_action_at DATETIME NULL,

  ledger_cash_collected_cents BIGINT NOT NULL DEFAULT 0,
  completed_transaction_count INT NOT NULL DEFAULT 0,
  active_subscription_count INT NOT NULL DEFAULT 0,
  active_mrr_cents BIGINT NOT NULL DEFAULT 0,
  available_balance_cents BIGINT NOT NULL DEFAULT 0,
  pending_balance_cents BIGINT NOT NULL DEFAULT 0,
  payout_request_count INT NOT NULL DEFAULT 0,
  projected_setup_revenue_cents BIGINT NOT NULL DEFAULT 0,
  projected_mrr_cents BIGINT NOT NULL DEFAULT 0,

  source_tables JSON NOT NULL,
  selection_evidence_payload JSON NULL,
  ledger_evidence_payload JSON NULL,

  revenue_is_ledger_backed BOOLEAN NOT NULL DEFAULT TRUE,
  projections_included BOOLEAN NOT NULL DEFAULT FALSE,
  synthetic_metrics_included BOOLEAN NOT NULL DEFAULT FALSE,
  automated_outreach_sent BOOLEAN NOT NULL DEFAULT FALSE,

  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  UNIQUE KEY uniq_top5_activation_sprint_rank (sprint_date, top5_rank),
  UNIQUE KEY uniq_top5_activation_sprint_handle (sprint_date, handle, platform),
  KEY idx_top5_activation_sprint_queue (sprint_date, sprint_status, top5_rank),
  KEY idx_top5_activation_sprint_blocker (primary_blocker_key, primary_blocker_severity),
  KEY idx_top5_activation_sprint_ledger (first_dollar_status, retention_status, payout_status),
  KEY idx_top5_activation_sprint_source (source_table, source_id),
  KEY idx_top5_activation_sprint_profile (profile_id),
  KEY idx_top5_activation_sprint_creator (creator_id),
  KEY idx_top5_activation_sprint_pipeline (pipeline_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
