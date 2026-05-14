import { router, protectedProcedure } from "../_core/trpc.js";
import { z } from "zod";
import mysql from "mysql2/promise";

async function getDb() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is required for Activation War Room operations");
  const m = url.match(/mysql:\/\/([^:]+):([^@]+)@([^:/]+):(\d+)\/([^?]+)/);
  if (!m) throw new Error("Invalid DATABASE_URL");
  const [, user, password, host, port, database] = m;
  return mysql.createConnection({ host, port: Number(port), user, password, database });
}

function asRows(result: any): any[] {
  if (Array.isArray(result) && Array.isArray(result[0])) return result[0] as any[];
  if (Array.isArray(result)) return result;
  return [];
}

function isoDate(input?: string): string {
  if (!input) return new Date().toISOString().slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input)) throw new Error("date must use YYYY-MM-DD format");
  return input;
}

function intValue(value: any): number {
  if (value === null || value === undefined) return 0;
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function priorityBand(score: number): "critical" | "high" | "medium" | "low" {
  if (score >= 85) return "critical";
  if (score >= 70) return "high";
  if (score >= 45) return "medium";
  return "low";
}

function json(value: unknown): string {
  return JSON.stringify(value ?? {});
}

const sourceTables = [
  "transactions",
  "subscriptions",
  "subscription_tiers",
  "creator_balances",
  "payout_requests",
  "recruiter_creator_profiles",
  "creator_conversion_packets",
  "creator_conversion_automation",
  "creator_acquisition_priorities",
  "daily_revenue_plans",
  "daily_creator_pipeline",
  "daily_creator_events",
  "activation_war_room_snapshots",
  "activation_war_room_creator_status",
  "activation_war_room_blockers",
  "activation_war_room_interventions",
  "top5_activation_sprint",
  "first_dollar_recovery_queue",
  "first_dollar_creator_clocks",
];

async function refreshSnapshotInternal(conn: mysql.Connection, date: string) {
  const [txRows] = await conn.execute(
    `SELECT
       COUNT(*) AS completed_transaction_count,
       COALESCE(SUM(amount_in_cents), 0) AS ledger_cash_collected_cents,
       COALESCE(SUM(creator_share_in_cents), 0) AS ledger_creator_earnings_cents,
       COALESCE(SUM(platform_share_in_cents), 0) AS ledger_platform_share_cents,
       COUNT(DISTINCT creator_id) AS first_dollar_creator_count
     FROM transactions
     WHERE status = 'completed' AND DATE(created_at) = ?`,
    [date]
  );
  const tx = asRows([txRows])[0] || {};

  const [subRows] = await conn.execute(
    `SELECT
       COUNT(*) AS active_subscription_count,
       COALESCE(SUM(CASE WHEN st.billing_interval = 'yearly' THEN ROUND(st.price_in_cents / 12) ELSE st.price_in_cents END), 0) AS active_mrr_cents
     FROM subscriptions s
     INNER JOIN subscription_tiers st ON st.id = s.tier_id
     WHERE s.status = 'active' AND COALESCE(st.is_active, 1) = 1`
  );
  const subs = asRows([subRows])[0] || {};

  const [pipelineRows] = await conn.execute(
    `SELECT
       COUNT(*) AS activation_target_count,
       SUM(CASE WHEN dcp.stage IN ('activated','checkout_started','first_dollar','retained') OR dcp.activation_status IN ('activated','onboarded','completed') THEN 1 ELSE 0 END) AS activated_creator_count
     FROM daily_creator_pipeline dcp
     INNER JOIN daily_revenue_plans drp ON drp.id = dcp.plan_id
     WHERE drp.plan_date = ?`,
    [date]
  );
  const pipeline = asRows([pipelineRows])[0] || {};

  const [payoutRows] = await conn.execute(
    `SELECT
       COALESCE(SUM(CASE WHEN status IN ('pending','processing') THEN amount_in_cents ELSE 0 END), 0) AS payout_pending_cents,
       COALESCE(SUM(CASE WHEN status = 'completed' THEN amount_in_cents ELSE 0 END), 0) AS payout_completed_cents
     FROM payout_requests
     WHERE DATE(requested_at) <= ?`,
    [date]
  );
  const payouts = asRows([payoutRows])[0] || {};

  const [blockerRows] = await conn.execute(
    `SELECT COUNT(*) AS blocker_open_count
     FROM activation_war_room_blockers
     WHERE snapshot_date = ? AND blocker_status = 'open'`,
    [date]
  );
  const blockers = asRows([blockerRows])[0] || {};

  const [interventionRows] = await conn.execute(
    `SELECT COUNT(*) AS urgent_intervention_count
     FROM activation_war_room_interventions
     WHERE snapshot_date = ? AND review_status IN ('queued','in_progress') AND priority_score >= 70`,
    [date]
  );
  const interventions = asRows([interventionRows])[0] || {};

  const proofPayload = {
    completedTransactionStatus: "transactions.status = completed",
    cashflowWindow: date,
    activeSubscriptionRule: "subscriptions.status = active joined to active subscription_tiers",
    payoutRule: "payout_requests.status controls payout state",
    automatedOutreachSent: false,
  };

  await conn.execute(
    `INSERT INTO activation_war_room_snapshots
     (snapshot_date, status, ledger_cash_collected_cents, ledger_creator_earnings_cents, ledger_platform_share_cents,
      completed_transaction_count, active_subscription_count, active_mrr_cents, first_dollar_creator_count,
      activation_target_count, activated_creator_count, payout_pending_cents, payout_completed_cents,
      blocker_open_count, urgent_intervention_count, automated_outreach_sent, projections_included,
      synthetic_metrics_included, revenue_is_ledger_backed, source_tables, proof_payload, computed_at)
     VALUES (?, 'active', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, FALSE, FALSE, FALSE, TRUE, ?, ?, NOW())
     ON DUPLICATE KEY UPDATE
       status = 'active',
       ledger_cash_collected_cents = VALUES(ledger_cash_collected_cents),
       ledger_creator_earnings_cents = VALUES(ledger_creator_earnings_cents),
       ledger_platform_share_cents = VALUES(ledger_platform_share_cents),
       completed_transaction_count = VALUES(completed_transaction_count),
       active_subscription_count = VALUES(active_subscription_count),
       active_mrr_cents = VALUES(active_mrr_cents),
       first_dollar_creator_count = VALUES(first_dollar_creator_count),
       activation_target_count = VALUES(activation_target_count),
       activated_creator_count = VALUES(activated_creator_count),
       payout_pending_cents = VALUES(payout_pending_cents),
       payout_completed_cents = VALUES(payout_completed_cents),
       blocker_open_count = VALUES(blocker_open_count),
       urgent_intervention_count = VALUES(urgent_intervention_count),
       automated_outreach_sent = FALSE,
       projections_included = FALSE,
       synthetic_metrics_included = FALSE,
       revenue_is_ledger_backed = TRUE,
       source_tables = VALUES(source_tables),
       proof_payload = VALUES(proof_payload),
       computed_at = NOW(),
       updated_at = NOW()`,
    [
      date,
      intValue(tx.ledger_cash_collected_cents),
      intValue(tx.ledger_creator_earnings_cents),
      intValue(tx.ledger_platform_share_cents),
      intValue(tx.completed_transaction_count),
      intValue(subs.active_subscription_count),
      intValue(subs.active_mrr_cents),
      intValue(tx.first_dollar_creator_count),
      intValue(pipeline.activation_target_count),
      intValue(pipeline.activated_creator_count),
      intValue(payouts.payout_pending_cents),
      intValue(payouts.payout_completed_cents),
      intValue(blockers.blocker_open_count),
      intValue(interventions.urgent_intervention_count),
      json(sourceTables),
      json(proofPayload),
    ]
  );

  const [snapshotRows] = await conn.execute(
    "SELECT * FROM activation_war_room_snapshots WHERE snapshot_date = ? LIMIT 1",
    [date]
  );
  return asRows([snapshotRows])[0];
}

type ComputedCreator = {
  profileId: number;
  creatorId: number | null;
  pipelineId: number | null;
  conversionPacketId: number | null;
  handle: string;
  platform: string;
  displayName: string | null;
  activationStage: string;
  activationStatus: string;
  checkoutStatus: string;
  renewalStatus: string;
  payoutStatus: string;
  firstDollarStatus: string;
  firstCompletedTransactionId: number | null;
  ledgerCashCollectedCents: number;
  activeSubscriptionCount: number;
  activeMrrCents: number;
  availableBalanceCents: number;
  pendingBalanceCents: number;
  priorityScore: number;
  priorityBand: string;
  blockerCount: number;
  nextMoneyAction: string;
  interventionPriority: number;
  blockers: Array<{ key: string; label: string; severity: string; nextAction: string; sources: string[]; evidence: Record<string, unknown> }>;
  evidence: Record<string, unknown>;
};

async function refreshCreatorStatusesInternal(conn: mysql.Connection, date: string, limit: number) {
  const safeLimit = Math.max(1, Math.min(200, Math.floor(limit || 50)));
  const [rows] = await conn.query(
    `SELECT
       rcp.id AS profile_id,
       rcp.platform,
       rcp.handle,
       rcp.display_name,
       rcp.telegram_username,
       rcp.telegram_ready,
       rcp.stripe_link_status,
       rcp.status AS profile_status,
       rcp.priority AS profile_priority,
       rcp.total_score,
       ccp.id AS packet_id,
       cca.onboarding_stage,
       cca.conversion_stage,
       cca.telegram_transition_status,
       cca.stripe_activation_status,
       cca.money_next_action AS automation_money_next_action,
       cap.priority_score AS acquisition_priority_score,
       cap.priority_band AS acquisition_priority_band,
       cap.next_money_action AS acquisition_next_money_action,
       dcp.id AS pipeline_id,
       dcp.creator_id,
       dcp.stage AS pipeline_stage,
       dcp.activation_status AS pipeline_activation_status,
       dcp.checkout_status AS pipeline_checkout_status,
       dcp.priority_score AS pipeline_priority_score,
       dcp.priority_band AS pipeline_priority_band,
       dcp.next_action AS pipeline_next_action,
       dcp.first_revenue_transaction_id AS pipeline_first_revenue_transaction_id,
       dcp.real_revenue_cents AS pipeline_real_revenue_cents,
       tx.first_transaction_id,
       tx.cash_collected_cents,
       sub.active_subscription_count,
       sub.active_mrr_cents,
       bal.available_balance_in_cents,
       bal.pending_balance_in_cents,
       pay.pending_payout_count,
       pay.completed_payout_count
     FROM recruiter_creator_profiles rcp
     LEFT JOIN creator_conversion_packets ccp ON ccp.profile_id = rcp.id
     LEFT JOIN creator_conversion_automation cca ON cca.profile_id = rcp.id
     LEFT JOIN creator_acquisition_priorities cap ON cap.profile_id = rcp.id
     LEFT JOIN daily_creator_pipeline dcp ON dcp.recruiter_profile_id = rcp.id
     LEFT JOIN daily_revenue_plans drp ON drp.id = dcp.plan_id AND drp.plan_date = ?
     LEFT JOIN (
       SELECT creator_id, MIN(id) AS first_transaction_id, SUM(amount_in_cents) AS cash_collected_cents
       FROM transactions
       WHERE status = 'completed'
       GROUP BY creator_id
     ) tx ON tx.creator_id = dcp.creator_id
     LEFT JOIN (
       SELECT s.creator_id, COUNT(*) AS active_subscription_count,
              SUM(CASE WHEN st.billing_interval = 'yearly' THEN ROUND(st.price_in_cents / 12) ELSE st.price_in_cents END) AS active_mrr_cents
       FROM subscriptions s
       INNER JOIN subscription_tiers st ON st.id = s.tier_id
       WHERE s.status = 'active' AND COALESCE(st.is_active, 1) = 1
       GROUP BY s.creator_id
     ) sub ON sub.creator_id = dcp.creator_id
     LEFT JOIN creator_balances bal ON bal.creator_id = dcp.creator_id
     LEFT JOIN (
       SELECT creator_id,
              SUM(CASE WHEN status IN ('pending','processing') THEN 1 ELSE 0 END) AS pending_payout_count,
              SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) AS completed_payout_count
       FROM payout_requests
       GROUP BY creator_id
     ) pay ON pay.creator_id = dcp.creator_id
     WHERE rcp.status <> 'declined'
     ORDER BY GREATEST(COALESCE(cap.priority_score, 0), COALESCE(dcp.priority_score, 0), COALESCE(rcp.total_score, 0)) DESC, rcp.updated_at DESC
     LIMIT ${safeLimit}`,
    [date]
  );

  const computed: ComputedCreator[] = asRows([rows]).map((row: any) => {
    const priorityScore = Math.max(intValue(row.acquisition_priority_score), intValue(row.pipeline_priority_score), intValue(row.total_score));
    const firstTx = row.first_transaction_id || row.pipeline_first_revenue_transaction_id || null;
    const activeSubscriptions = intValue(row.active_subscription_count);
    const ledgerCash = Math.max(intValue(row.cash_collected_cents), intValue(row.pipeline_real_revenue_cents));
    const availableBalance = intValue(row.available_balance_in_cents);
    const pendingBalance = intValue(row.pending_balance_in_cents);
    const nextMoneyAction = row.acquisition_next_money_action || row.automation_money_next_action || row.pipeline_next_action || "Review creator activation path and choose next money action";
    const activationStage = row.pipeline_stage || row.onboarding_stage || row.profile_status || "targeted";
    const activationStatus = row.pipeline_activation_status || row.profile_status || "not_started";
    const checkoutStatus = row.pipeline_checkout_status || row.stripe_activation_status || "not_started";
    const renewalStatus = activeSubscriptions > 0 ? "active_recurring" : "not_active";
    const payoutStatus = intValue(row.completed_payout_count) > 0 ? "completed" : intValue(row.pending_payout_count) > 0 ? "pending" : (availableBalance + pendingBalance > 0 ? "needs_request" : "not_applicable");
    const blockers: ComputedCreator["blockers"] = [];

    if (!firstTx) blockers.push({ key: "missing_first_completed_payment", label: "No first completed payment in ledger", severity: "critical", nextAction: "Guide creator to a paid offer or checkout path, then verify completed transaction", sources: ["transactions", "daily_creator_pipeline"], evidence: { firstTransactionId: null, ledgerCashCollectedCents: ledgerCash } });
    if (activeSubscriptions === 0) blockers.push({ key: "no_active_recurring_subscription", label: "No active recurring subscription", severity: "high", nextAction: "Confirm subscription tier and renewal path before marking recurring revenue active", sources: ["subscriptions", "subscription_tiers"], evidence: { activeSubscriptionCount: activeSubscriptions } });
    if (!row.packet_id) blockers.push({ key: "conversion_packet_missing", label: "Conversion packet is missing", severity: "high", nextAction: "Generate or review a conversion packet before outreach", sources: ["creator_conversion_packets"], evidence: { packetId: null } });
    if (row.packet_id && ["queued", "packet_generated", "not_started", null, undefined].includes(row.conversion_stage)) blockers.push({ key: "unreviewed_conversion_packet", label: "Conversion packet remains operator-review queued", severity: "medium", nextAction: "Operator reviews packet and records activation decision", sources: ["creator_conversion_packets", "creator_conversion_automation", "daily_creator_events"], evidence: { packetId: row.packet_id, conversionStage: row.conversion_stage || "unknown" } });
    if (!["linked", "complete", "completed", "active"].includes(String(row.stripe_link_status || row.stripe_activation_status || "").toLowerCase())) blockers.push({ key: "stripe_activation_not_completed", label: "Stripe or checkout activation is not completed", severity: "high", nextAction: "Verify payment setup and checkout readiness", sources: ["recruiter_creator_profiles", "creator_conversion_automation"], evidence: { stripeLinkStatus: row.stripe_link_status || null, stripeActivationStatus: row.stripe_activation_status || null } });
    if (!row.telegram_ready && !row.telegram_username && !["ready", "complete", "completed"].includes(String(row.telegram_transition_status || "").toLowerCase())) blockers.push({ key: "missing_telegram_funnel_readiness", label: "Telegram funnel readiness is missing", severity: "medium", nextAction: "Confirm Telegram invite, channel, or transition evidence before using Telegram as activation path", sources: ["recruiter_creator_profiles", "creator_conversion_automation"], evidence: { telegramReady: Boolean(row.telegram_ready), telegramUsernamePresent: Boolean(row.telegram_username), telegramTransitionStatus: row.telegram_transition_status || null } });
    if ((availableBalance + pendingBalance > 0) && intValue(row.pending_payout_count) === 0 && intValue(row.completed_payout_count) === 0) blockers.push({ key: "payout_path_blocked", label: "Creator has payout exposure without payout request evidence", severity: "high", nextAction: "Create or verify payout request path before marking payout resolved", sources: ["creator_balances", "payout_requests"], evidence: { availableBalanceCents: availableBalance, pendingBalanceCents: pendingBalance } });

    const interventionPriority = Math.min(100, priorityScore + blockers.filter(b => b.severity === "critical").length * 10 + blockers.filter(b => b.severity === "high").length * 5);
    return {
      profileId: intValue(row.profile_id),
      creatorId: row.creator_id ? intValue(row.creator_id) : null,
      pipelineId: row.pipeline_id ? intValue(row.pipeline_id) : null,
      conversionPacketId: row.packet_id ? intValue(row.packet_id) : null,
      handle: row.handle,
      platform: row.platform || "unknown",
      displayName: row.display_name || null,
      activationStage,
      activationStatus,
      checkoutStatus,
      renewalStatus,
      payoutStatus,
      firstDollarStatus: firstTx ? "ledger_confirmed" : "not_earned",
      firstCompletedTransactionId: firstTx ? intValue(firstTx) : null,
      ledgerCashCollectedCents: ledgerCash,
      activeSubscriptionCount: activeSubscriptions,
      activeMrrCents: intValue(row.active_mrr_cents),
      availableBalanceCents: availableBalance,
      pendingBalanceCents: pendingBalance,
      priorityScore,
      priorityBand: row.acquisition_priority_band || row.pipeline_priority_band || priorityBand(priorityScore),
      blockerCount: blockers.length,
      nextMoneyAction,
      interventionPriority,
      blockers,
      evidence: {
        profileStatus: row.profile_status,
        pipelineStage: row.pipeline_stage || null,
        onboardingStage: row.onboarding_stage || null,
        conversionStage: row.conversion_stage || null,
        sourceTables: ["recruiter_creator_profiles", "daily_creator_pipeline", "creator_conversion_packets", "creator_conversion_automation", "creator_acquisition_priorities", "transactions", "subscriptions", "creator_balances", "payout_requests"],
      },
    };
  });

  const statusRows = [];
  for (const item of computed) {
    await conn.execute(
      `INSERT INTO activation_war_room_creator_status
       (snapshot_date, profile_id, creator_id, pipeline_id, conversion_packet_id, handle, platform, display_name,
        activation_stage, activation_status, checkout_status, renewal_status, payout_status, first_dollar_status,
        first_completed_transaction_id, ledger_cash_collected_cents, active_subscription_count, active_mrr_cents,
        available_balance_cents, pending_balance_cents, priority_score, priority_band, blocker_count,
        next_money_action, intervention_priority, source_tables, evidence_payload,
        revenue_is_ledger_backed, projections_included, synthetic_metrics_included)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, TRUE, FALSE, FALSE)
       ON DUPLICATE KEY UPDATE
         creator_id = VALUES(creator_id), pipeline_id = VALUES(pipeline_id), conversion_packet_id = VALUES(conversion_packet_id),
         handle = VALUES(handle), platform = VALUES(platform), display_name = VALUES(display_name),
         activation_stage = VALUES(activation_stage), activation_status = VALUES(activation_status), checkout_status = VALUES(checkout_status),
         renewal_status = VALUES(renewal_status), payout_status = VALUES(payout_status), first_dollar_status = VALUES(first_dollar_status),
         first_completed_transaction_id = VALUES(first_completed_transaction_id), ledger_cash_collected_cents = VALUES(ledger_cash_collected_cents),
         active_subscription_count = VALUES(active_subscription_count), active_mrr_cents = VALUES(active_mrr_cents),
         available_balance_cents = VALUES(available_balance_cents), pending_balance_cents = VALUES(pending_balance_cents),
         priority_score = VALUES(priority_score), priority_band = VALUES(priority_band), blocker_count = VALUES(blocker_count),
         next_money_action = VALUES(next_money_action), intervention_priority = VALUES(intervention_priority),
         source_tables = VALUES(source_tables), evidence_payload = VALUES(evidence_payload),
         revenue_is_ledger_backed = TRUE, projections_included = FALSE, synthetic_metrics_included = FALSE, updated_at = NOW()`,
      [
        date, item.profileId, item.creatorId, item.pipelineId, item.conversionPacketId, item.handle, item.platform, item.displayName,
        item.activationStage, item.activationStatus, item.checkoutStatus, item.renewalStatus, item.payoutStatus, item.firstDollarStatus,
        item.firstCompletedTransactionId, item.ledgerCashCollectedCents, item.activeSubscriptionCount, item.activeMrrCents,
        item.availableBalanceCents, item.pendingBalanceCents, item.priorityScore, item.priorityBand, item.blockerCount,
        item.nextMoneyAction, item.interventionPriority,
        json(item.evidence.sourceTables), json(item.evidence),
      ]
    );
    const [createdRows] = await conn.execute(
      "SELECT * FROM activation_war_room_creator_status WHERE snapshot_date = ? AND profile_id = ? LIMIT 1",
      [date, item.profileId]
    );
    const status = asRows([createdRows])[0];
    statusRows.push(status);

    for (const blocker of item.blockers) {
      await conn.execute(
        `INSERT INTO activation_war_room_blockers
         (snapshot_date, creator_status_id, profile_id, creator_id, pipeline_id, blocker_key, blocker_label, severity,
          blocker_status, next_resolution_action, source_tables, evidence_payload)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'open', ?, ?, ?)
         ON DUPLICATE KEY UPDATE
           creator_status_id = VALUES(creator_status_id), creator_id = VALUES(creator_id), pipeline_id = VALUES(pipeline_id),
           blocker_label = VALUES(blocker_label), severity = VALUES(severity), blocker_status = 'open',
           next_resolution_action = VALUES(next_resolution_action), source_tables = VALUES(source_tables),
           evidence_payload = VALUES(evidence_payload), resolved_at = NULL, updated_at = NOW()`,
        [date, status.id, item.profileId, item.creatorId, item.pipelineId, blocker.key, blocker.label, blocker.severity, blocker.nextAction, json(blocker.sources), json(blocker.evidence)]
      );
    }

    await conn.execute(
      `INSERT INTO activation_war_room_interventions
       (snapshot_date, creator_status_id, profile_id, creator_id, pipeline_id, intervention_key, intervention_type,
        priority_score, priority_band, next_money_action, review_status, automated_outreach_sent, source_tables, evidence_payload)
       VALUES (?, ?, ?, ?, ?, 'money_next_action', 'operator_review', ?, ?, ?, 'queued', FALSE, ?, ?)
       ON DUPLICATE KEY UPDATE
         creator_status_id = VALUES(creator_status_id), creator_id = VALUES(creator_id), pipeline_id = VALUES(pipeline_id),
         priority_score = VALUES(priority_score), priority_band = VALUES(priority_band), next_money_action = VALUES(next_money_action),
         automated_outreach_sent = FALSE, source_tables = VALUES(source_tables), evidence_payload = VALUES(evidence_payload), updated_at = NOW()`,
      [date, status.id, item.profileId, item.creatorId, item.pipelineId, item.interventionPriority, priorityBand(item.interventionPriority), item.nextMoneyAction, json(item.evidence.sourceTables), json({ blockers: item.blockers.map(b => b.key), evidence: item.evidence })]
    );
  }

  await refreshSnapshotInternal(conn, date);
  return statusRows;
}


type Top5MoneyState = {
  checkoutStatus: string;
  firstDollarStatus: string;
  retentionStatus: string;
  payoutStatus: string;
  primaryBlockerKey: string;
  primaryBlockerLabel: string;
  primaryBlockerSeverity: string;
  nextMoneyAction: string;
};

function deriveTop5MoneyState(row: any): Top5MoneyState {
  const completedTransactions = intValue(row.completed_transaction_count);
  const ledgerCash = intValue(row.ledger_cash_collected_cents);
  const activeSubscriptions = intValue(row.active_subscription_count);
  const availableBalance = intValue(row.available_balance_cents);
  const pendingBalance = intValue(row.pending_balance_cents);
  const payoutRequests = intValue(row.payout_request_count);
  const checkoutEvidence = String(row.checkout_status || "").toLowerCase().includes("checkout") || String(row.primary_blocker_key || "").includes("checkout_started") || intValue(row.checkout_starts) > 0;

  const checkoutStatus = completedTransactions > 0 || ledgerCash > 0 ? "checkout_completed" : checkoutEvidence ? "checkout_started" : "not_started";
  const firstDollarStatus = completedTransactions > 0 || ledgerCash > 0 ? "ledger_confirmed" : "not_earned";
  const retentionStatus = activeSubscriptions > 0 ? "active_recurring" : "not_active";
  const payoutStatus = payoutRequests > 0 ? "request_recorded" : (availableBalance + pendingBalance > 0 ? "needs_request" : "not_applicable");

  if (firstDollarStatus !== "ledger_confirmed") {
    return {
      checkoutStatus,
      firstDollarStatus,
      retentionStatus,
      payoutStatus,
      primaryBlockerKey: checkoutStatus === "checkout_started" ? "checkout_started_but_no_completed_transaction" : "missing_first_completed_payment",
      primaryBlockerLabel: checkoutStatus === "checkout_started" ? "Checkout started but no completed transaction in ledger" : "No first completed payment in ledger",
      primaryBlockerSeverity: "critical",
      nextMoneyAction: row.next_money_action || "Recover checkout with direct payment link and objection follow-up",
    };
  }

  if (retentionStatus !== "active_recurring") {
    return {
      checkoutStatus,
      firstDollarStatus,
      retentionStatus,
      payoutStatus,
      primaryBlockerKey: "no_active_recurring_subscription",
      primaryBlockerLabel: "No active recurring subscription",
      primaryBlockerSeverity: "high",
      nextMoneyAction: "Convert first-dollar buyer into active subscription or renewal path",
    };
  }

  if (payoutStatus === "needs_request") {
    return {
      checkoutStatus,
      firstDollarStatus,
      retentionStatus,
      payoutStatus,
      primaryBlockerKey: "payout_path_blocked",
      primaryBlockerLabel: "Creator has payout exposure without payout request evidence",
      primaryBlockerSeverity: "high",
      nextMoneyAction: "Verify payout request path before marking payout resolved",
    };
  }

  return {
    checkoutStatus,
    firstDollarStatus,
    retentionStatus,
    payoutStatus,
    primaryBlockerKey: "none",
    primaryBlockerLabel: "No primary money blocker after ledger verification",
    primaryBlockerSeverity: "low",
    nextMoneyAction: row.next_money_action || "Monitor retention and payout readiness from ledger evidence",
  };
}

function top5TruthFlags() {
  return {
    revenueIsLedgerBacked: true,
    projectionsIncluded: false,
    syntheticMetricsIncluded: false,
    automatedOutreachSent: false,
    outboundSendEnabled: false,
  };
}

function top5Summary(rows: any[]) {
  return {
    selected_count: rows.length,
    first_dollar_confirmed_count: rows.filter((row) => row.first_dollar_status === "ledger_confirmed").length,
    retained_count: rows.filter((row) => ["active_recurring", "retained"].includes(String(row.retention_status || ""))).length,
    payout_ready_count: rows.filter((row) => ["request_recorded", "completed", "needs_request"].includes(String(row.payout_status || ""))).length,
    open_blocker_count: rows.filter((row) => row.primary_blocker_key && row.primary_blocker_key !== "none" && !["closed", "resolved"].includes(String(row.sprint_status || ""))).length,
    ledger_cash_collected_cents: rows.reduce((sum, row) => sum + intValue(row.ledger_cash_collected_cents), 0),
    active_mrr_cents: rows.reduce((sum, row) => sum + intValue(row.active_mrr_cents), 0),
  };
}

async function refreshTop5SprintInternal(conn: mysql.Connection, date: string) {
  const [rows] = await conn.execute(
    `SELECT * FROM top5_activation_sprint WHERE sprint_date = ? ORDER BY top5_rank ASC`,
    [date]
  );
  const sprintRows = asRows([rows]);

  for (const row of sprintRows) {
    let ledger = {
      completed_transaction_count: intValue(row.completed_transaction_count),
      ledger_cash_collected_cents: intValue(row.ledger_cash_collected_cents),
      active_subscription_count: intValue(row.active_subscription_count),
      active_mrr_cents: intValue(row.active_mrr_cents),
      available_balance_cents: intValue(row.available_balance_cents),
      pending_balance_cents: intValue(row.pending_balance_cents),
      payout_request_count: intValue(row.payout_request_count),
      first_completed_transaction_id: null as number | null,
    };

    if (row.creator_id) {
      const [txRows] = await conn.execute(
        `SELECT COUNT(*) AS completed_transaction_count,
                COALESCE(SUM(amount_in_cents), 0) AS ledger_cash_collected_cents,
                MIN(id) AS first_completed_transaction_id
         FROM transactions
         WHERE creator_id = ? AND status = 'completed'`,
        [row.creator_id]
      );
      const tx = asRows([txRows])[0] || {};

      const [subRows] = await conn.execute(
        `SELECT COUNT(*) AS active_subscription_count,
                COALESCE(SUM(CASE WHEN st.billing_interval = 'yearly' THEN ROUND(st.price_in_cents / 12) ELSE st.price_in_cents END), 0) AS active_mrr_cents
         FROM subscriptions s
         INNER JOIN subscription_tiers st ON st.id = s.tier_id
         WHERE s.creator_id = ? AND s.status = 'active' AND COALESCE(st.is_active, 1) = 1`,
        [row.creator_id]
      );
      const sub = asRows([subRows])[0] || {};

      const [balanceRows] = await conn.execute(
        `SELECT COALESCE(SUM(available_balance_in_cents), 0) AS available_balance_cents,
                COALESCE(SUM(pending_balance_in_cents), 0) AS pending_balance_cents
         FROM creator_balances
         WHERE creator_id = ?`,
        [row.creator_id]
      );
      const balance = asRows([balanceRows])[0] || {};

      const [payoutRows] = await conn.execute(
        `SELECT COUNT(*) AS payout_request_count
         FROM payout_requests
         WHERE creator_id = ?`,
        [row.creator_id]
      );
      const payout = asRows([payoutRows])[0] || {};

      ledger = {
        completed_transaction_count: intValue(tx.completed_transaction_count),
        ledger_cash_collected_cents: intValue(tx.ledger_cash_collected_cents),
        active_subscription_count: intValue(sub.active_subscription_count),
        active_mrr_cents: intValue(sub.active_mrr_cents),
        available_balance_cents: intValue(balance.available_balance_cents),
        pending_balance_cents: intValue(balance.pending_balance_cents),
        payout_request_count: intValue(payout.payout_request_count),
        first_completed_transaction_id: tx.first_completed_transaction_id ? intValue(tx.first_completed_transaction_id) : null,
      };
    }

    const derived = deriveTop5MoneyState({ ...row, ...ledger });
    const ledgerEvidence = {
      creatorId: row.creator_id || null,
      firstCompletedTransactionId: ledger.first_completed_transaction_id,
      completedTransactionCount: ledger.completed_transaction_count,
      activeSubscriptionCount: ledger.active_subscription_count,
      payoutRequestCount: ledger.payout_request_count,
      sourceTables: ["transactions", "subscriptions", "subscription_tiers", "creator_balances", "payout_requests"],
    };

    await conn.execute(
      `UPDATE top5_activation_sprint
       SET checkout_status = ?, first_dollar_status = ?, retention_status = ?, payout_status = ?,
           primary_blocker_key = ?, primary_blocker_label = ?, primary_blocker_severity = ?, next_money_action = ?,
           ledger_cash_collected_cents = ?, completed_transaction_count = ?, active_subscription_count = ?, active_mrr_cents = ?,
           available_balance_cents = ?, pending_balance_cents = ?, payout_request_count = ?, ledger_evidence_payload = ?,
           revenue_is_ledger_backed = TRUE, projections_included = FALSE, synthetic_metrics_included = FALSE, automated_outreach_sent = FALSE,
           updated_at = NOW()
       WHERE id = ?`,
      [
        derived.checkoutStatus, derived.firstDollarStatus, derived.retentionStatus, derived.payoutStatus,
        derived.primaryBlockerKey, derived.primaryBlockerLabel, derived.primaryBlockerSeverity, derived.nextMoneyAction,
        ledger.ledger_cash_collected_cents, ledger.completed_transaction_count, ledger.active_subscription_count, ledger.active_mrr_cents,
        ledger.available_balance_cents, ledger.pending_balance_cents, ledger.payout_request_count, json(ledgerEvidence), row.id,
      ]
    );
  }

  const [refreshedRows] = await conn.execute(
    `SELECT * FROM top5_activation_sprint WHERE sprint_date = ? ORDER BY top5_rank ASC`,
    [date]
  );
  return asRows([refreshedRows]);
}


function firstDollarTruthFlags() {
  return {
    checkoutIsStripeSessionBacked: true,
    revenueIsLedgerBacked: true,
    projectionsIncluded: false,
    syntheticMetricsIncluded: false,
    fakeUrgencyIncluded: false,
    automatedOutreachSent: false,
    outboundSendEnabled: false,
  };
}

function recoveryPriorityBand(score: number): "critical" | "high" | "medium" | "low" {
  if (score >= 80) return "critical";
  if (score >= 60) return "high";
  if (score >= 40) return "medium";
  return "low";
}

function deriveRecoveryPriority(row: any): number {
  let score = 0;
  score += Math.min(30, Math.floor(intValue(row.checkout_value_cents) / 500));
  score += Math.min(20, Math.floor(intValue(row.recurring_mrr_value_cents) / 500));
  score += Math.min(15, Math.floor(intValue(row.vip_value_cents) / 1000));
  const sessionAge = intValue(row.stripe_session_age_hours);
  if (sessionAge > 0 && sessionAge <= 24) score += 20;
  else if (sessionAge <= 72) score += 15;
  else if (sessionAge <= 168) score += 10;
  else score += 5;
  const incompleteAge = intValue(row.incomplete_payment_age_hours);
  if (incompleteAge > 0 && incompleteAge <= 48) score += 15;
  else if (incompleteAge <= 168) score += 8;
  const intent = String(row.buyer_intent_level || "unknown");
  if (intent === "high") score += 15;
  else if (intent === "medium") score += 8;
  if (row.creator_id) score += 5;
  return Math.max(0, Math.min(100, score));
}

function classifyRecoveryFriction(row: any): { objectionKey: string; objectionSummary: string; frictionKey: string; frictionSummary: string; nextBestMoneyAction: string } {
  const sessionAge = intValue(row.stripe_session_age_hours);
  const incompleteAge = intValue(row.incomplete_payment_age_hours);
  const value = intValue(row.checkout_value_cents) + intValue(row.recurring_mrr_value_cents) + intValue(row.vip_value_cents);
  const offerType = String(row.offer_type || "unknown");
  const hasStripeRef = Boolean(row.stripe_session_ref || row.stripe_payment_intent_ref || row.stripe_subscription_ref);

  if (!hasStripeRef) {
    return {
      objectionKey: "stripe_reference_missing_operator_review",
      objectionSummary: "The row cannot be treated as recoverable until an operator verifies a Stripe-backed checkout reference.",
      frictionKey: "checkout_backing_needs_review",
      frictionSummary: "Recovery queue requires Stripe-session-backed evidence before any money action.",
      nextBestMoneyAction: "Verify the source checkout reference before taking any recovery action; do not contact the buyer from this row until Stripe backing is confirmed.",
    };
  }

  if (incompleteAge > 0 && incompleteAge <= 72) {
    return {
      objectionKey: "payment_incomplete_recent_buyer_objection",
      objectionSummary: "Payment intent or subscription is incomplete and recent enough for manual objection diagnosis.",
      frictionKey: "payment_confirmation_or_card_step_failed",
      frictionSummary: "Buyer reached payment execution but no completed transaction ledger row exists.",
      nextBestMoneyAction: "Manually inspect the Stripe payment state and resolve the exact payment objection before asking the buyer to retry the same offer.",
    };
  }

  if (value >= 5000 || offerType.includes("vip")) {
    return {
      objectionKey: "high_value_offer_needs_manual_reassurance",
      objectionSummary: "High-value checkout abandonment should be handled as a trust, price, or fulfillment clarification issue.",
      frictionKey: "high_value_checkout_abandoned_before_ledger",
      frictionSummary: "The checkout carries meaningful recoverable value but has no ledger-confirmed payment.",
      nextBestMoneyAction: "Have the operator review offer fit, guarantee language, and checkout path, then manually respond with the exact reassurance needed for this offer.",
    };
  }

  if (sessionAge > 168) {
    return {
      objectionKey: "stale_checkout_requires_offer_revalidation",
      objectionSummary: "The abandoned checkout is stale; urgency must not be fabricated.",
      frictionKey: "stale_checkout_no_completion",
      frictionSummary: "Checkout started but remained unpaid beyond the primary recovery window.",
      nextBestMoneyAction: "Revalidate that the offer, price, and checkout link are still live before any manual recovery message.",
    };
  }

  return {
    objectionKey: "checkout_started_buyer_did_not_complete",
    objectionSummary: "Buyer started checkout but no completed transaction was found; operator must identify the human objection.",
    frictionKey: "checkout_started_but_no_completed_transaction",
    frictionSummary: "Stripe-backed checkout intent exists without a ledger-confirmed completed transaction.",
    nextBestMoneyAction: "Review the exact offer attempted and manually resolve the buyer objection tied to this checkout; no automated outreach is sent.",
  };
}

function firstDollarSummary(queueRows: any[], clockRows: any[]) {
  return {
    abandoned_checkout_count: queueRows.length,
    critical_recovery_count: queueRows.filter((row) => row.recovery_priority_band === "critical").length,
    high_recovery_count: queueRows.filter((row) => row.recovery_priority_band === "high").length,
    manual_action_count: queueRows.filter((row) => !["recovered_ledger_confirmed", "closed_no_recovery"].includes(String(row.operator_status || ""))).length,
    checkout_value_cents: queueRows.reduce((sum, row) => sum + intValue(row.checkout_value_cents), 0),
    recurring_mrr_value_cents: queueRows.reduce((sum, row) => sum + intValue(row.recurring_mrr_value_cents), 0),
    ledger_recovered_cents: queueRows.reduce((sum, row) => sum + intValue(row.ledger_recovered_cents), 0),
    creators_close_to_first_dollar_count: clockRows.filter((row) => intValue(row.first_dollar_proximity_score) >= 60 && row.first_dollar_status !== "ledger_confirmed").length,
    first_dollar_clock_count: clockRows.length,
  };
}

async function refreshFirstDollarRecoveryInternal(conn: mysql.Connection, limit: number) {
  const boundedLimit = Math.max(1, Math.min(200, Math.floor(limit || 100)));
  const [queueRows] = await conn.query(
    `SELECT * FROM first_dollar_recovery_queue
     WHERE checkout_is_stripe_session_backed = TRUE
     ORDER BY recovery_priority_score DESC, COALESCE(stripe_session_age_hours, 999999) ASC, updated_at DESC
     LIMIT ${boundedLimit}`
  );
  const queue = asRows([queueRows]);

  for (const row of queue) {
    const score = deriveRecoveryPriority(row);
    const friction = classifyRecoveryFriction(row);
    await conn.execute(
      `UPDATE first_dollar_recovery_queue
       SET recovery_priority_score = ?, recovery_priority_band = ?, objection_key = ?, objection_summary = ?,
           friction_key = ?, friction_summary = ?, next_best_money_action = ?,
           checkout_is_stripe_session_backed = TRUE, revenue_is_ledger_backed = TRUE,
           synthetic_metrics_included = FALSE, fake_urgency_included = FALSE, automated_outreach_sent = FALSE,
           updated_at = NOW()
       WHERE id = ?`,
      [score, recoveryPriorityBand(score), friction.objectionKey, friction.objectionSummary, friction.frictionKey, friction.frictionSummary, friction.nextBestMoneyAction, row.id]
    );
  }

  const [refreshedQueueRows] = await conn.query(
    `SELECT * FROM first_dollar_recovery_queue
     WHERE checkout_is_stripe_session_backed = TRUE
     ORDER BY recovery_priority_score DESC, COALESCE(stripe_session_age_hours, 999999) ASC, updated_at DESC
     LIMIT ${boundedLimit}`
  );
  const refreshedQueue = asRows([refreshedQueueRows]);

  const [clockRows] = await conn.query(
    `SELECT * FROM first_dollar_creator_clocks
     ORDER BY first_dollar_proximity_score DESC, updated_at DESC
     LIMIT ${boundedLimit}`
  );
  const clocks = asRows([clockRows]);

  return {
    recoveryQueue: refreshedQueue,
    firstDollarClocks: clocks,
    summary: firstDollarSummary(refreshedQueue, clocks),
    truthFlags: firstDollarTruthFlags(),
    sourceTables,
  };
}

const dateInput = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

export const activationWarRoomRouter = router({
  commandCenter: protectedProcedure
    .input(dateInput.extend({ limit: z.number().int().min(1).max(200).default(50) }))
    .query(async ({ input }) => {
      const date = isoDate(input.date);
      const conn = await getDb();
      try {
        const [snapshotRows] = await conn.execute("SELECT * FROM activation_war_room_snapshots WHERE snapshot_date = ? LIMIT 1", [date]);
        let snapshot = asRows([snapshotRows])[0];
        if (!snapshot) snapshot = await refreshSnapshotInternal(conn, date);
        const limit = Math.max(1, Math.min(200, Math.floor(input.limit || 50)));
        const [creatorRows] = await conn.query(
          `SELECT * FROM activation_war_room_creator_status WHERE snapshot_date = ? ORDER BY intervention_priority DESC, priority_score DESC LIMIT ${limit}`,
          [date]
        );
        const [blockerRows] = await conn.query(
          `SELECT * FROM activation_war_room_blockers WHERE snapshot_date = ? AND blocker_status = 'open' ORDER BY FIELD(severity, 'critical', 'high', 'medium', 'low'), updated_at DESC LIMIT ${limit}`,
          [date]
        );
        const [interventionRows] = await conn.query(
          `SELECT * FROM activation_war_room_interventions WHERE snapshot_date = ? AND review_status IN ('queued','in_progress') ORDER BY priority_score DESC, updated_at DESC LIMIT ${limit}`,
          [date]
        );
        return {
          date,
          snapshot,
          creators: asRows([creatorRows]),
          blockers: asRows([blockerRows]),
          interventions: asRows([interventionRows]),
          truthFlags: {
            revenueIsLedgerBacked: true,
            projectionsIncluded: false,
            syntheticMetricsIncluded: false,
            automatedOutreachSent: false,
            outboundSendEnabled: false,
          },
          sourceTables,
        };
      } finally {
        await conn.end();
      }
    }),

  refreshSnapshot: protectedProcedure
    .input(dateInput)
    .mutation(async ({ input }) => {
      const date = isoDate(input.date);
      const conn = await getDb();
      try {
        const snapshot = await refreshSnapshotInternal(conn, date);
        return { success: true, date, snapshot, truthFlags: { revenueIsLedgerBacked: true, projectionsIncluded: false, syntheticMetricsIncluded: false, automatedOutreachSent: false } };
      } finally {
        await conn.end();
      }
    }),

  refreshCreatorStatuses: protectedProcedure
    .input(dateInput.extend({ limit: z.number().int().min(1).max(200).default(50) }))
    .mutation(async ({ input }) => {
      const date = isoDate(input.date);
      const conn = await getDb();
      try {
        const creators = await refreshCreatorStatusesInternal(conn, date, input.limit || 50);
        return { success: true, date, refreshed: creators.length, creators, truthFlags: { revenueIsLedgerBacked: true, projectionsIncluded: false, syntheticMetricsIncluded: false, automatedOutreachSent: false } };
      } finally {
        await conn.end();
      }
    }),


  top5Sprint: protectedProcedure
    .input(dateInput)
    .query(async ({ input }) => {
      const date = isoDate(input.date);
      const conn = await getDb();
      try {
        const rows = await refreshTop5SprintInternal(conn, date);
        return {
          date,
          rows,
          summary: top5Summary(rows),
          truthFlags: top5TruthFlags(),
          sourceTables,
        };
      } finally {
        await conn.end();
      }
    }),

  refreshTop5Sprint: protectedProcedure
    .input(dateInput)
    .mutation(async ({ input }) => {
      const date = isoDate(input.date);
      const conn = await getDb();
      try {
        const rows = await refreshTop5SprintInternal(conn, date);
        return { success: true, date, refreshed: rows.length, rows, summary: top5Summary(rows), truthFlags: top5TruthFlags() };
      } finally {
        await conn.end();
      }
    }),

  recordTop5OperatorAction: protectedProcedure
    .input(z.object({
      sprintId: z.number().int().positive(),
      status: z.enum(["active", "in_progress", "blocked", "first_dollar_confirmed", "retained", "payout_ready", "resolved", "closed"]).optional(),
      primaryBlockerKey: z.string().max(120).optional(),
      nextMoneyAction: z.string().min(1).max(255).optional(),
      operatorOwner: z.string().max(120).optional(),
      operatorNote: z.string().min(1).max(4000),
    }))
    .mutation(async ({ input }) => {
      const conn = await getDb();
      try {
        await conn.execute(
          `UPDATE top5_activation_sprint
           SET sprint_status = COALESCE(?, sprint_status),
               primary_blocker_key = COALESCE(?, primary_blocker_key),
               next_money_action = COALESCE(?, next_money_action),
               operator_owner = COALESCE(?, operator_owner),
               operator_note = ?, last_operator_action_at = NOW(), automated_outreach_sent = FALSE, updated_at = NOW()
           WHERE id = ?`,
          [input.status || null, input.primaryBlockerKey || null, input.nextMoneyAction || null, input.operatorOwner || null, input.operatorNote, input.sprintId]
        );
        const [rows] = await conn.execute("SELECT * FROM top5_activation_sprint WHERE id = ? LIMIT 1", [input.sprintId]);
        return { success: true, row: asRows([rows])[0], automatedOutreachSent: false, truthFlags: top5TruthFlags() };
      } finally {
        await conn.end();
      }
    }),


  firstDollarRecovery: protectedProcedure
    .input(dateInput.extend({ limit: z.number().int().min(1).max(200).default(100) }))
    .query(async ({ input }) => {
      const conn = await getDb();
      try {
        return await refreshFirstDollarRecoveryInternal(conn, input.limit || 100);
      } finally {
        await conn.end();
      }
    }),

  refreshFirstDollarRecovery: protectedProcedure
    .input(dateInput.extend({ limit: z.number().int().min(1).max(200).default(100) }))
    .mutation(async ({ input }) => {
      const conn = await getDb();
      try {
        const result = await refreshFirstDollarRecoveryInternal(conn, input.limit || 100);
        return { success: true, refreshed: result.recoveryQueue.length, ...result };
      } finally {
        await conn.end();
      }
    }),

  recordFirstDollarRecoveryAction: protectedProcedure
    .input(z.object({
      recoveryId: z.number().int().positive(),
      operatorStatus: z.enum(["new", "reviewing", "contacted_manually", "objection_logged", "checkout_fixed", "recovered_ledger_confirmed", "closed_no_recovery"]).optional(),
      objectionKey: z.string().max(120).optional(),
      frictionKey: z.string().max(120).optional(),
      nextBestMoneyAction: z.string().min(1).max(4000).optional(),
      operatorNote: z.string().min(1).max(4000),
    }))
    .mutation(async ({ input }) => {
      const conn = await getDb();
      try {
        await conn.execute(
          `UPDATE first_dollar_recovery_queue
           SET operator_status = COALESCE(?, operator_status),
               objection_key = COALESCE(?, objection_key),
               friction_key = COALESCE(?, friction_key),
               next_best_money_action = COALESCE(?, next_best_money_action),
               operator_note = ?, last_operator_action_at = NOW(),
               checkout_is_stripe_session_backed = TRUE, revenue_is_ledger_backed = TRUE,
               synthetic_metrics_included = FALSE, fake_urgency_included = FALSE, automated_outreach_sent = FALSE,
               updated_at = NOW()
           WHERE id = ?`,
          [input.operatorStatus || null, input.objectionKey || null, input.frictionKey || null, input.nextBestMoneyAction || null, input.operatorNote, input.recoveryId]
        );
        const [rows] = await conn.execute("SELECT * FROM first_dollar_recovery_queue WHERE id = ? LIMIT 1", [input.recoveryId]);
        return { success: true, row: asRows([rows])[0], automatedOutreachSent: false, truthFlags: firstDollarTruthFlags() };
      } finally {
        await conn.end();
      }
    }),

  recordFirstDollarClockAction: protectedProcedure
    .input(z.object({
      clockId: z.number().int().positive(),
      nextBestMoneyAction: z.string().min(1).max(4000),
    }))
    .mutation(async ({ input }) => {
      const conn = await getDb();
      try {
        await conn.execute(
          `UPDATE first_dollar_creator_clocks
           SET next_best_money_action = ?, revenue_is_ledger_backed = TRUE,
               synthetic_metrics_included = FALSE, fake_urgency_included = FALSE, automated_outreach_sent = FALSE,
               updated_at = NOW()
           WHERE id = ?`,
          [input.nextBestMoneyAction, input.clockId]
        );
        const [rows] = await conn.execute("SELECT * FROM first_dollar_creator_clocks WHERE id = ? LIMIT 1", [input.clockId]);
        return { success: true, row: asRows([rows])[0], automatedOutreachSent: false, truthFlags: firstDollarTruthFlags() };
      } finally {
        await conn.end();
      }
    }),

  recordInterventionReview: protectedProcedure
    .input(z.object({
      interventionId: z.number().int().positive(),
      status: z.enum(["queued", "in_progress", "reviewed", "resolved", "dismissed"]),
      operatorNote: z.string().max(2000).optional(),
    }))
    .mutation(async ({ input }) => {
      const conn = await getDb();
      try {
        await conn.execute(
          `UPDATE activation_war_room_interventions
           SET review_status = ?, operator_note = ?, reviewed_at = CASE WHEN ? IN ('reviewed','resolved','dismissed') THEN NOW() ELSE reviewed_at END,
               resolved_at = CASE WHEN ? = 'resolved' THEN NOW() ELSE resolved_at END,
               automated_outreach_sent = FALSE, updated_at = NOW()
           WHERE id = ?`,
          [input.status, input.operatorNote || null, input.status, input.status, input.interventionId]
        );
        const [rows] = await conn.execute("SELECT * FROM activation_war_room_interventions WHERE id = ? LIMIT 1", [input.interventionId]);
        return { success: true, intervention: asRows([rows])[0], automatedOutreachSent: false };
      } finally {
        await conn.end();
      }
    }),

  recordBlockerResolution: protectedProcedure
    .input(z.object({
      blockerId: z.number().int().positive(),
      resolutionNote: z.string().min(1).max(2000),
    }))
    .mutation(async ({ input }) => {
      const conn = await getDb();
      try {
        await conn.execute(
          `UPDATE activation_war_room_blockers
           SET blocker_status = 'resolved', resolution_note = ?, resolved_at = NOW(), updated_at = NOW()
           WHERE id = ?`,
          [input.resolutionNote, input.blockerId]
        );
        const [rows] = await conn.execute("SELECT * FROM activation_war_room_blockers WHERE id = ? LIMIT 1", [input.blockerId]);
        return { success: true, blocker: asRows([rows])[0], automatedOutreachSent: false };
      } finally {
        await conn.end();
      }
    }),
});
