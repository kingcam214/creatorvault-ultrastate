-- CreatorVault First-Dollar Recovery seed
-- Generated only from sanitized production audit evidence.
-- Revenue recovery remains ledger-backed only; no automated outreach is sent.

INSERT INTO first_dollar_recovery_queue (
  source_table, source_id, source_id_hash, creator_id, buyer_id, offer_type, offer_id, offer_id_hash, offer_title,
  package_attempted, recurring_tier_attempted, vip_tier_attempted, checkout_value_cents, recurring_mrr_value_cents, vip_value_cents, ledger_recovered_cents,
  stripe_session_ref, stripe_payment_intent_ref, stripe_subscription_ref, stripe_customer_ref, checkout_status, checkout_started_at, checkout_updated_at,
  stripe_session_age_hours, incomplete_payment_age_hours, creator_activation_stage, buyer_intent_level, recovery_priority_score, recovery_priority_band,
  objection_key, objection_summary, friction_key, friction_summary, next_best_money_action, operator_status,
  checkout_is_stripe_session_backed, revenue_is_ledger_backed, synthetic_metrics_included, fake_urgency_included, automated_outreach_sent, evidence_json
) VALUES (
  'subscriptions', 'subscriptions:3d762ffd19cf', '3d762ffd19cf', 15, 1, 'subscription_tier', 'subscription_tier:7a61b53701be', '7a61b53701be', 'Proof Tier - USD 3',
  NULL, 'Proof Tier - USD 3', NULL, 300, 300, 0, 0,
  'source-backed:subscriptions:3d762ffd19cf', NULL, NULL, NULL, 'canceled', NULL, NULL,
  25, 25, NULL, 'recent_checkout_started', 51, 'medium',
  'checkout_state_unknown_needs_operator_review', 'Operator must identify the exact human objection before any manual recovery action; no automated outreach or fake urgency is permitted.', 'stale_checkout_no_completion', 'Checkout started but no ledger-confirmed completed transaction was found for this source-backed recovery candidate.', 'Manually follow up on the exact abandoned checkout and ask which objection blocked completion.', 'new',
  TRUE, TRUE, FALSE, FALSE, FALSE, '{"sourceTables":["subscriptions","transactions","subscription_tiers"],"auditSource":"creatorvault_first_dollar_recovery_audit_sanitized","checkoutStartedAtSanitized":"[PHONE_REDACTED]T19:37:28.000Z","checkoutUpdatedAtSanitized":"[PHONE_REDACTED]T19:44:52.000Z","excludedNonStripeBackedRows":2,"strictSafeguards":{"stripeSessionBacked":true,"ledgerBackedRevenueOnly":true,"noSyntheticMetrics":true,"noFakeUrgency":true,"noAutomatedOutreach":true}}'
) ON DUPLICATE KEY UPDATE
  creator_id = VALUES(creator_id), buyer_id = VALUES(buyer_id), offer_type = VALUES(offer_type), offer_id = VALUES(offer_id), offer_id_hash = VALUES(offer_id_hash), offer_title = VALUES(offer_title),
  package_attempted = VALUES(package_attempted), recurring_tier_attempted = VALUES(recurring_tier_attempted), vip_tier_attempted = VALUES(vip_tier_attempted),
  checkout_value_cents = VALUES(checkout_value_cents), recurring_mrr_value_cents = VALUES(recurring_mrr_value_cents), vip_value_cents = VALUES(vip_value_cents),
  stripe_session_ref = VALUES(stripe_session_ref), stripe_payment_intent_ref = VALUES(stripe_payment_intent_ref), checkout_status = VALUES(checkout_status),
  stripe_session_age_hours = VALUES(stripe_session_age_hours), incomplete_payment_age_hours = VALUES(incomplete_payment_age_hours), buyer_intent_level = VALUES(buyer_intent_level),
  recovery_priority_score = VALUES(recovery_priority_score), recovery_priority_band = VALUES(recovery_priority_band), objection_key = VALUES(objection_key), objection_summary = VALUES(objection_summary),
  friction_key = VALUES(friction_key), friction_summary = VALUES(friction_summary), next_best_money_action = VALUES(next_best_money_action),
  checkout_is_stripe_session_backed = TRUE, revenue_is_ledger_backed = TRUE, synthetic_metrics_included = FALSE, fake_urgency_included = FALSE, automated_outreach_sent = FALSE, evidence_json = VALUES(evidence_json);

INSERT INTO first_dollar_recovery_queue (
  source_table, source_id, source_id_hash, creator_id, buyer_id, offer_type, offer_id, offer_id_hash, offer_title,
  package_attempted, recurring_tier_attempted, vip_tier_attempted, checkout_value_cents, recurring_mrr_value_cents, vip_value_cents, ledger_recovered_cents,
  stripe_session_ref, stripe_payment_intent_ref, stripe_subscription_ref, stripe_customer_ref, checkout_status, checkout_started_at, checkout_updated_at,
  stripe_session_age_hours, incomplete_payment_age_hours, creator_activation_stage, buyer_intent_level, recovery_priority_score, recovery_priority_band,
  objection_key, objection_summary, friction_key, friction_summary, next_best_money_action, operator_status,
  checkout_is_stripe_session_backed, revenue_is_ledger_backed, synthetic_metrics_included, fake_urgency_included, automated_outreach_sent, evidence_json
) VALUES (
  'subscriptions', 'subscriptions:8ef8ae7b33f6', '8ef8ae7b33f6', 14, 24, 'subscription_tier', 'subscription_tier:c6f3ac57944a', 'c6f3ac57944a', 'Fit Fam',
  NULL, 'Fit Fam', NULL, 2500, 2500, 0, 0,
  'source-backed:subscriptions:8ef8ae7b33f6', NULL, NULL, NULL, 'canceled', NULL, NULL,
  1752, 21, NULL, 'stale_checkout_started', 37, 'low',
  'checkout_state_unknown_needs_operator_review', 'Operator must identify the exact human objection before any manual recovery action; no automated outreach or fake urgency is permitted.', 'stale_checkout_no_completion', 'Checkout started but no ledger-confirmed completed transaction was found for this source-backed recovery candidate.', 'Manually follow up on the exact abandoned checkout and ask which objection blocked completion.', 'new',
  TRUE, TRUE, FALSE, FALSE, FALSE, '{"sourceTables":["subscriptions","transactions","subscription_tiers"],"auditSource":"creatorvault_first_dollar_recovery_audit_sanitized","checkoutStartedAtSanitized":"[PHONE_REDACTED]T20:47:47.000Z","checkoutUpdatedAtSanitized":"[PHONE_REDACTED]T23:34:40.000Z","excludedNonStripeBackedRows":2,"strictSafeguards":{"stripeSessionBacked":true,"ledgerBackedRevenueOnly":true,"noSyntheticMetrics":true,"noFakeUrgency":true,"noAutomatedOutreach":true}}'
) ON DUPLICATE KEY UPDATE
  creator_id = VALUES(creator_id), buyer_id = VALUES(buyer_id), offer_type = VALUES(offer_type), offer_id = VALUES(offer_id), offer_id_hash = VALUES(offer_id_hash), offer_title = VALUES(offer_title),
  package_attempted = VALUES(package_attempted), recurring_tier_attempted = VALUES(recurring_tier_attempted), vip_tier_attempted = VALUES(vip_tier_attempted),
  checkout_value_cents = VALUES(checkout_value_cents), recurring_mrr_value_cents = VALUES(recurring_mrr_value_cents), vip_value_cents = VALUES(vip_value_cents),
  stripe_session_ref = VALUES(stripe_session_ref), stripe_payment_intent_ref = VALUES(stripe_payment_intent_ref), checkout_status = VALUES(checkout_status),
  stripe_session_age_hours = VALUES(stripe_session_age_hours), incomplete_payment_age_hours = VALUES(incomplete_payment_age_hours), buyer_intent_level = VALUES(buyer_intent_level),
  recovery_priority_score = VALUES(recovery_priority_score), recovery_priority_band = VALUES(recovery_priority_band), objection_key = VALUES(objection_key), objection_summary = VALUES(objection_summary),
  friction_key = VALUES(friction_key), friction_summary = VALUES(friction_summary), next_best_money_action = VALUES(next_best_money_action),
  checkout_is_stripe_session_backed = TRUE, revenue_is_ledger_backed = TRUE, synthetic_metrics_included = FALSE, fake_urgency_included = FALSE, automated_outreach_sent = FALSE, evidence_json = VALUES(evidence_json);

INSERT INTO first_dollar_recovery_queue (
  source_table, source_id, source_id_hash, creator_id, buyer_id, offer_type, offer_id, offer_id_hash, offer_title,
  package_attempted, recurring_tier_attempted, vip_tier_attempted, checkout_value_cents, recurring_mrr_value_cents, vip_value_cents, ledger_recovered_cents,
  stripe_session_ref, stripe_payment_intent_ref, stripe_subscription_ref, stripe_customer_ref, checkout_status, checkout_started_at, checkout_updated_at,
  stripe_session_age_hours, incomplete_payment_age_hours, creator_activation_stage, buyer_intent_level, recovery_priority_score, recovery_priority_band,
  objection_key, objection_summary, friction_key, friction_summary, next_best_money_action, operator_status,
  checkout_is_stripe_session_backed, revenue_is_ledger_backed, synthetic_metrics_included, fake_urgency_included, automated_outreach_sent, evidence_json
) VALUES (
  'subscriptions', 'subscriptions:1df1f213b805', '1df1f213b805', 17, 6, 'subscription_tier', 'subscription_tier:4b227777d4dd', '4b227777d4dd', 'Test Tier',
  NULL, 'Test Tier', NULL, 999, 999, 0, 0,
  'source-backed:subscriptions:1df1f213b805', NULL, NULL, NULL, 'past_due', NULL, NULL,
  766, 21, NULL, 'stale_checkout_started', 37, 'low',
  'checkout_state_unknown_needs_operator_review', 'Operator must identify the exact human objection before any manual recovery action; no automated outreach or fake urgency is permitted.', 'stale_checkout_no_completion', 'Checkout started but no ledger-confirmed completed transaction was found for this source-backed recovery candidate.', 'Manually follow up on the exact abandoned checkout and ask which objection blocked completion.', 'new',
  TRUE, TRUE, FALSE, FALSE, FALSE, '{"sourceTables":["subscriptions","transactions","subscription_tiers"],"auditSource":"creatorvault_first_dollar_recovery_audit_sanitized","checkoutStartedAtSanitized":"[PHONE_REDACTED]T23:07:00.000Z","checkoutUpdatedAtSanitized":"[PHONE_REDACTED]T23:34:40.000Z","excludedNonStripeBackedRows":2,"strictSafeguards":{"stripeSessionBacked":true,"ledgerBackedRevenueOnly":true,"noSyntheticMetrics":true,"noFakeUrgency":true,"noAutomatedOutreach":true}}'
) ON DUPLICATE KEY UPDATE
  creator_id = VALUES(creator_id), buyer_id = VALUES(buyer_id), offer_type = VALUES(offer_type), offer_id = VALUES(offer_id), offer_id_hash = VALUES(offer_id_hash), offer_title = VALUES(offer_title),
  package_attempted = VALUES(package_attempted), recurring_tier_attempted = VALUES(recurring_tier_attempted), vip_tier_attempted = VALUES(vip_tier_attempted),
  checkout_value_cents = VALUES(checkout_value_cents), recurring_mrr_value_cents = VALUES(recurring_mrr_value_cents), vip_value_cents = VALUES(vip_value_cents),
  stripe_session_ref = VALUES(stripe_session_ref), stripe_payment_intent_ref = VALUES(stripe_payment_intent_ref), checkout_status = VALUES(checkout_status),
  stripe_session_age_hours = VALUES(stripe_session_age_hours), incomplete_payment_age_hours = VALUES(incomplete_payment_age_hours), buyer_intent_level = VALUES(buyer_intent_level),
  recovery_priority_score = VALUES(recovery_priority_score), recovery_priority_band = VALUES(recovery_priority_band), objection_key = VALUES(objection_key), objection_summary = VALUES(objection_summary),
  friction_key = VALUES(friction_key), friction_summary = VALUES(friction_summary), next_best_money_action = VALUES(next_best_money_action),
  checkout_is_stripe_session_backed = TRUE, revenue_is_ledger_backed = TRUE, synthetic_metrics_included = FALSE, fake_urgency_included = FALSE, automated_outreach_sent = FALSE, evidence_json = VALUES(evidence_json);

INSERT INTO first_dollar_recovery_queue (
  source_table, source_id, source_id_hash, creator_id, buyer_id, offer_type, offer_id, offer_id_hash, offer_title,
  package_attempted, recurring_tier_attempted, vip_tier_attempted, checkout_value_cents, recurring_mrr_value_cents, vip_value_cents, ledger_recovered_cents,
  stripe_session_ref, stripe_payment_intent_ref, stripe_subscription_ref, stripe_customer_ref, checkout_status, checkout_started_at, checkout_updated_at,
  stripe_session_age_hours, incomplete_payment_age_hours, creator_activation_stage, buyer_intent_level, recovery_priority_score, recovery_priority_band,
  objection_key, objection_summary, friction_key, friction_summary, next_best_money_action, operator_status,
  checkout_is_stripe_session_backed, revenue_is_ledger_backed, synthetic_metrics_included, fake_urgency_included, automated_outreach_sent, evidence_json
) VALUES (
  'subscriptions', 'subscriptions:6f1a93021780', '6f1a93021780', 15, 16, 'subscription_tier', 'subscription_tier:4e07408562be', '4e07408562be', 'Platinum',
  NULL, 'Platinum', NULL, 2999, 2999, 0, 0,
  'source-backed:subscriptions:6f1a93021780', NULL, NULL, NULL, 'canceled', NULL, NULL,
  1854, 1854, NULL, 'stale_checkout_started', 30, 'low',
  'checkout_state_unknown_needs_operator_review', 'Operator must identify the exact human objection before any manual recovery action; no automated outreach or fake urgency is permitted.', 'stale_checkout_no_completion', 'Checkout started but no ledger-confirmed completed transaction was found for this source-backed recovery candidate.', 'Manually follow up on the exact abandoned checkout and ask which objection blocked completion.', 'new',
  TRUE, TRUE, FALSE, FALSE, FALSE, '{"sourceTables":["subscriptions","transactions","subscription_tiers"],"auditSource":"creatorvault_first_dollar_recovery_audit_sanitized","checkoutStartedAtSanitized":"[PHONE_REDACTED]T14:47:12.000Z","checkoutUpdatedAtSanitized":"[PHONE_REDACTED]T14:47:38.000Z","excludedNonStripeBackedRows":2,"strictSafeguards":{"stripeSessionBacked":true,"ledgerBackedRevenueOnly":true,"noSyntheticMetrics":true,"noFakeUrgency":true,"noAutomatedOutreach":true}}'
) ON DUPLICATE KEY UPDATE
  creator_id = VALUES(creator_id), buyer_id = VALUES(buyer_id), offer_type = VALUES(offer_type), offer_id = VALUES(offer_id), offer_id_hash = VALUES(offer_id_hash), offer_title = VALUES(offer_title),
  package_attempted = VALUES(package_attempted), recurring_tier_attempted = VALUES(recurring_tier_attempted), vip_tier_attempted = VALUES(vip_tier_attempted),
  checkout_value_cents = VALUES(checkout_value_cents), recurring_mrr_value_cents = VALUES(recurring_mrr_value_cents), vip_value_cents = VALUES(vip_value_cents),
  stripe_session_ref = VALUES(stripe_session_ref), stripe_payment_intent_ref = VALUES(stripe_payment_intent_ref), checkout_status = VALUES(checkout_status),
  stripe_session_age_hours = VALUES(stripe_session_age_hours), incomplete_payment_age_hours = VALUES(incomplete_payment_age_hours), buyer_intent_level = VALUES(buyer_intent_level),
  recovery_priority_score = VALUES(recovery_priority_score), recovery_priority_band = VALUES(recovery_priority_band), objection_key = VALUES(objection_key), objection_summary = VALUES(objection_summary),
  friction_key = VALUES(friction_key), friction_summary = VALUES(friction_summary), next_best_money_action = VALUES(next_best_money_action),
  checkout_is_stripe_session_backed = TRUE, revenue_is_ledger_backed = TRUE, synthetic_metrics_included = FALSE, fake_urgency_included = FALSE, automated_outreach_sent = FALSE, evidence_json = VALUES(evidence_json);

INSERT INTO first_dollar_recovery_queue (
  source_table, source_id, source_id_hash, creator_id, buyer_id, offer_type, offer_id, offer_id_hash, offer_title,
  package_attempted, recurring_tier_attempted, vip_tier_attempted, checkout_value_cents, recurring_mrr_value_cents, vip_value_cents, ledger_recovered_cents,
  stripe_session_ref, stripe_payment_intent_ref, stripe_subscription_ref, stripe_customer_ref, checkout_status, checkout_started_at, checkout_updated_at,
  stripe_session_age_hours, incomplete_payment_age_hours, creator_activation_stage, buyer_intent_level, recovery_priority_score, recovery_priority_band,
  objection_key, objection_summary, friction_key, friction_summary, next_best_money_action, operator_status,
  checkout_is_stripe_session_backed, revenue_is_ledger_backed, synthetic_metrics_included, fake_urgency_included, automated_outreach_sent, evidence_json
) VALUES (
  'subscriptions', 'subscriptions:d6fa55293ccf', 'd6fa55293ccf', 17, 18, 'subscription_tier', 'subscription_tier:4b227777d4dd', '4b227777d4dd', 'Test Tier',
  NULL, 'Test Tier', NULL, 999, 999, 0, 0,
  'source-backed:subscriptions:d6fa55293ccf', NULL, NULL, NULL, 'canceled', NULL, NULL,
  1852, 1852, NULL, 'stale_checkout_started', 30, 'low',
  'checkout_state_unknown_needs_operator_review', 'Operator must identify the exact human objection before any manual recovery action; no automated outreach or fake urgency is permitted.', 'stale_checkout_no_completion', 'Checkout started but no ledger-confirmed completed transaction was found for this source-backed recovery candidate.', 'Manually follow up on the exact abandoned checkout and ask which objection blocked completion.', 'new',
  TRUE, TRUE, FALSE, FALSE, FALSE, '{"sourceTables":["subscriptions","transactions","subscription_tiers"],"auditSource":"creatorvault_first_dollar_recovery_audit_sanitized","checkoutStartedAtSanitized":"[PHONE_REDACTED]T16:35:39.000Z","checkoutUpdatedAtSanitized":"[PHONE_REDACTED]T16:35:56.000Z","excludedNonStripeBackedRows":2,"strictSafeguards":{"stripeSessionBacked":true,"ledgerBackedRevenueOnly":true,"noSyntheticMetrics":true,"noFakeUrgency":true,"noAutomatedOutreach":true}}'
) ON DUPLICATE KEY UPDATE
  creator_id = VALUES(creator_id), buyer_id = VALUES(buyer_id), offer_type = VALUES(offer_type), offer_id = VALUES(offer_id), offer_id_hash = VALUES(offer_id_hash), offer_title = VALUES(offer_title),
  package_attempted = VALUES(package_attempted), recurring_tier_attempted = VALUES(recurring_tier_attempted), vip_tier_attempted = VALUES(vip_tier_attempted),
  checkout_value_cents = VALUES(checkout_value_cents), recurring_mrr_value_cents = VALUES(recurring_mrr_value_cents), vip_value_cents = VALUES(vip_value_cents),
  stripe_session_ref = VALUES(stripe_session_ref), stripe_payment_intent_ref = VALUES(stripe_payment_intent_ref), checkout_status = VALUES(checkout_status),
  stripe_session_age_hours = VALUES(stripe_session_age_hours), incomplete_payment_age_hours = VALUES(incomplete_payment_age_hours), buyer_intent_level = VALUES(buyer_intent_level),
  recovery_priority_score = VALUES(recovery_priority_score), recovery_priority_band = VALUES(recovery_priority_band), objection_key = VALUES(objection_key), objection_summary = VALUES(objection_summary),
  friction_key = VALUES(friction_key), friction_summary = VALUES(friction_summary), next_best_money_action = VALUES(next_best_money_action),
  checkout_is_stripe_session_backed = TRUE, revenue_is_ledger_backed = TRUE, synthetic_metrics_included = FALSE, fake_urgency_included = FALSE, automated_outreach_sent = FALSE, evidence_json = VALUES(evidence_json);

INSERT INTO first_dollar_creator_clocks (
  creator_id, first_dollar_status, first_dollar_proximity_score, ledger_first_transaction_cents, hours_since_onboarding, hours_since_first_login,
  hours_since_first_checkout, hours_since_first_content_upload, hours_since_first_offer_launch, hours_since_first_telegram_activation,
  next_best_money_action, clock_evidence_json, revenue_is_ledger_backed, synthetic_metrics_included, fake_urgency_included, automated_outreach_sent
) VALUES (
  15, 'ledger_confirmed', 100, 0, NULL, NULL,
  1854, NULL, NULL, NULL,
  'Ledger confirms first dollar; operator should verify retention and next paid offer without claiming new recovery revenue.', '{"auditSource":"creatorvault_first_dollar_recovery_audit_sanitized","evidenceFlags":{"onboarding":false,"firstLogin":false,"firstCheckout":true,"firstContentUpload":false,"firstOfferLaunch":false,"firstTelegramActivation":false},"firstCompletedTransactionIdHash":"transaction:4","strictSafeguards":{"ledgerBackedRevenueOnly":true,"noSyntheticMetrics":true,"noFakeUrgency":true,"noAutomatedOutreach":true}}', TRUE, FALSE, FALSE, FALSE
) ON DUPLICATE KEY UPDATE
  first_dollar_status = VALUES(first_dollar_status), first_dollar_proximity_score = VALUES(first_dollar_proximity_score),
  hours_since_onboarding = VALUES(hours_since_onboarding), hours_since_first_login = VALUES(hours_since_first_login), hours_since_first_checkout = VALUES(hours_since_first_checkout),
  hours_since_first_content_upload = VALUES(hours_since_first_content_upload), hours_since_first_offer_launch = VALUES(hours_since_first_offer_launch), hours_since_first_telegram_activation = VALUES(hours_since_first_telegram_activation),
  next_best_money_action = VALUES(next_best_money_action), clock_evidence_json = VALUES(clock_evidence_json),
  revenue_is_ledger_backed = TRUE, synthetic_metrics_included = FALSE, fake_urgency_included = FALSE, automated_outreach_sent = FALSE;

INSERT INTO first_dollar_creator_clocks (
  creator_id, first_dollar_status, first_dollar_proximity_score, ledger_first_transaction_cents, hours_since_onboarding, hours_since_first_login,
  hours_since_first_checkout, hours_since_first_content_upload, hours_since_first_offer_launch, hours_since_first_telegram_activation,
  next_best_money_action, clock_evidence_json, revenue_is_ledger_backed, synthetic_metrics_included, fake_urgency_included, automated_outreach_sent
) VALUES (
  17, 'ledger_confirmed', 100, 0, NULL, NULL,
  1852, NULL, NULL, NULL,
  'Ledger confirms first dollar; operator should verify retention and next paid offer without claiming new recovery revenue.', '{"auditSource":"creatorvault_first_dollar_recovery_audit_sanitized","evidenceFlags":{"onboarding":false,"firstLogin":false,"firstCheckout":true,"firstContentUpload":false,"firstOfferLaunch":false,"firstTelegramActivation":false},"firstCompletedTransactionIdHash":"transaction:3","strictSafeguards":{"ledgerBackedRevenueOnly":true,"noSyntheticMetrics":true,"noFakeUrgency":true,"noAutomatedOutreach":true}}', TRUE, FALSE, FALSE, FALSE
) ON DUPLICATE KEY UPDATE
  first_dollar_status = VALUES(first_dollar_status), first_dollar_proximity_score = VALUES(first_dollar_proximity_score),
  hours_since_onboarding = VALUES(hours_since_onboarding), hours_since_first_login = VALUES(hours_since_first_login), hours_since_first_checkout = VALUES(hours_since_first_checkout),
  hours_since_first_content_upload = VALUES(hours_since_first_content_upload), hours_since_first_offer_launch = VALUES(hours_since_first_offer_launch), hours_since_first_telegram_activation = VALUES(hours_since_first_telegram_activation),
  next_best_money_action = VALUES(next_best_money_action), clock_evidence_json = VALUES(clock_evidence_json),
  revenue_is_ledger_backed = TRUE, synthetic_metrics_included = FALSE, fake_urgency_included = FALSE, automated_outreach_sent = FALSE;

INSERT INTO first_dollar_creator_clocks (
  creator_id, first_dollar_status, first_dollar_proximity_score, ledger_first_transaction_cents, hours_since_onboarding, hours_since_first_login,
  hours_since_first_checkout, hours_since_first_content_upload, hours_since_first_offer_launch, hours_since_first_telegram_activation,
  next_best_money_action, clock_evidence_json, revenue_is_ledger_backed, synthetic_metrics_included, fake_urgency_included, automated_outreach_sent
) VALUES (
  14, 'not_earned', 55, 0, NULL, NULL,
  1752, NULL, 1530, NULL,
  'Creator is closest to first dollar; review their abandoned checkout and manually resolve the buyer objection tied to the exact offer.', '{"auditSource":"creatorvault_first_dollar_recovery_audit_sanitized","evidenceFlags":{"onboarding":false,"firstLogin":false,"firstCheckout":true,"firstContentUpload":false,"firstOfferLaunch":true,"firstTelegramActivation":false},"firstCompletedTransactionIdHash":null,"strictSafeguards":{"ledgerBackedRevenueOnly":true,"noSyntheticMetrics":true,"noFakeUrgency":true,"noAutomatedOutreach":true}}', TRUE, FALSE, FALSE, FALSE
) ON DUPLICATE KEY UPDATE
  first_dollar_status = VALUES(first_dollar_status), first_dollar_proximity_score = VALUES(first_dollar_proximity_score),
  hours_since_onboarding = VALUES(hours_since_onboarding), hours_since_first_login = VALUES(hours_since_first_login), hours_since_first_checkout = VALUES(hours_since_first_checkout),
  hours_since_first_content_upload = VALUES(hours_since_first_content_upload), hours_since_first_offer_launch = VALUES(hours_since_first_offer_launch), hours_since_first_telegram_activation = VALUES(hours_since_first_telegram_activation),
  next_best_money_action = VALUES(next_best_money_action), clock_evidence_json = VALUES(clock_evidence_json),
  revenue_is_ledger_backed = TRUE, synthetic_metrics_included = FALSE, fake_urgency_included = FALSE, automated_outreach_sent = FALSE;

