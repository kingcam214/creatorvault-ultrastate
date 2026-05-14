import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const repoRoot = process.cwd();
const defaultInput = path.resolve('/home/ubuntu/creatorvault_top5_selected_creators.json');
const defaultOutput = path.join(repoRoot, 'drizzle', '0021_seed_top5_activation_sprint.sql');

const inputPath = path.resolve(process.argv[2] || defaultInput);
const outputPath = path.resolve(process.argv[3] || defaultOutput);
const sprintDate = process.env.TOP5_SPRINT_DATE || new Date().toISOString().slice(0, 10);

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function sqlString(value) {
  if (value === null || value === undefined) return 'NULL';
  return `'${String(value).replace(/\\/g, '\\\\').replace(/'/g, "''")}'`;
}

function sqlNumber(value) {
  const parsed = Number(value || 0);
  if (!Number.isFinite(parsed)) return '0';
  return String(Math.trunc(parsed));
}

function sqlJson(value) {
  return sqlString(JSON.stringify(value ?? null));
}

const payload = JSON.parse(fs.readFileSync(inputPath, 'utf8'));
const selected = payload.selected || [];
assert(selected.length === 5, `Top 5 seed requires exactly five selected creators; received ${selected.length}`);
const ranks = selected.map((row) => Number(row.top5Rank)).sort((a, b) => a - b).join(',');
assert(ranks === '1,2,3,4,5', `Top 5 seed ranks must be exactly 1,2,3,4,5; received ${ranks}`);

const sourceTables = [
  'greatest_show_creators',
  'daily_creator_pipeline',
  'creator_conversion_packets',
  'creator_checkout_automation_ledger',
  'creator_acquisition_priorities',
  'transactions',
  'subscriptions',
  'subscription_tiers',
  'creator_balances',
  'payout_requests',
];

const columns = [
  'sprint_date',
  'top5_rank',
  'sprint_status',
  'source_table',
  'source_id',
  'profile_id',
  'creator_id',
  'pipeline_id',
  'conversion_packet_id',
  'handle',
  'platform',
  'display_name',
  'niche',
  'activation_score',
  'priority_band',
  'risk_level',
  'approval_status',
  'checkout_status',
  'first_dollar_status',
  'retention_status',
  'payout_status',
  'primary_blocker_key',
  'primary_blocker_label',
  'primary_blocker_severity',
  'next_money_action',
  'ledger_cash_collected_cents',
  'completed_transaction_count',
  'active_subscription_count',
  'active_mrr_cents',
  'available_balance_cents',
  'pending_balance_cents',
  'payout_request_count',
  'projected_setup_revenue_cents',
  'projected_mrr_cents',
  'source_tables',
  'selection_evidence_payload',
  'ledger_evidence_payload',
  'revenue_is_ledger_backed',
  'projections_included',
  'synthetic_metrics_included',
  'automated_outreach_sent',
];

function rowValues(row) {
  const checkoutStatus = Number(row.checkoutStarts || 0) > 0 ? 'checkout_started' : 'not_started';
  const firstDollarStatus = Number(row.completedTransactions || 0) > 0 || Number(row.realLedgerRevenueCents || 0) > 0 ? 'ledger_confirmed' : 'not_earned';
  const retentionStatus = Number(row.activeSubscriptions || 0) > 0 ? 'active_recurring' : 'not_active';
  const payoutStatus = Number(row.payoutRequests || 0) > 0 ? 'request_recorded' : 'not_applicable';
  const primaryBlocker = row.firstDollarBlocker || (checkoutStatus === 'checkout_started' ? 'checkout_started_but_no_completed_transaction' : 'missing_first_completed_payment');
  const primaryBlockerLabel = primaryBlocker === 'checkout_started_but_no_completed_transaction'
    ? 'Checkout started but no completed transaction in ledger'
    : 'No first completed payment in ledger';
  const nextMoneyAction = row.nextMoneyAction || 'recover checkout with direct payment link and objection follow-up';
  const selectionEvidence = {
    generatedAt: payload.generatedAt,
    selectionPolicy: payload.selectionPolicy,
    top5Rank: row.top5Rank,
    sourceTable: row.sourceTable,
    sourceId: row.sourceId,
    sourceRowFound: Boolean(row.sourceRowFound),
    sourceHandle: row.sourceHandle,
    sourceScore: row.sourceScore,
    activationScore: row.activationScore,
    followers: row.followers,
    engagementRate: row.engagementRate,
    pipelineRows: row.pipelineRows,
    profileRows: row.profileRows,
    packetRows: row.packetRows,
    automationRows: row.automationRows,
    priorityRows: row.priorityRows,
    checkoutStarts: row.checkoutStarts,
    scoringReasons: row.scoringReasons || [],
  };
  const ledgerEvidence = {
    realLedgerRevenueCents: row.realLedgerRevenueCents || 0,
    completedTransactions: row.completedTransactions || 0,
    activeSubscriptions: row.activeSubscriptions || 0,
    payoutRequests: row.payoutRequests || 0,
    sourceTables: ['transactions', 'subscriptions', 'subscription_tiers', 'creator_balances', 'payout_requests'],
  };

  return [
    sqlString(sprintDate),
    sqlNumber(row.top5Rank),
    sqlString('active'),
    sqlString(row.sourceTable),
    sqlString(row.sourceId),
    'NULL',
    'NULL',
    'NULL',
    'NULL',
    sqlString(row.handle),
    sqlString(row.platform || 'unknown'),
    sqlString(row.displayName || row.sourceHandle || row.handle),
    sqlString(row.niche || 'unknown'),
    sqlNumber(row.activationScore),
    sqlString(row.band || 'critical'),
    sqlString(row.riskLevel || 'unknown'),
    sqlString(row.approvalStatus || 'requires_kingcam_approval'),
    sqlString(checkoutStatus),
    sqlString(firstDollarStatus),
    sqlString(retentionStatus),
    sqlString(payoutStatus),
    sqlString(primaryBlocker),
    sqlString(primaryBlockerLabel),
    sqlString('critical'),
    sqlString(nextMoneyAction),
    sqlNumber(row.realLedgerRevenueCents),
    sqlNumber(row.completedTransactions),
    sqlNumber(row.activeSubscriptions),
    '0',
    '0',
    '0',
    sqlNumber(row.payoutRequests),
    sqlNumber(row.projectedSetupRevenueCents),
    sqlNumber(row.projectedMrrCents),
    sqlJson(sourceTables),
    sqlJson(selectionEvidence),
    sqlJson(ledgerEvidence),
    'TRUE',
    'FALSE',
    'FALSE',
    'FALSE',
  ];
}

const updateColumns = columns.filter(
  (column) => ![
    'sprint_date',
    'top5_rank',
    'handle',
    'platform',
    'revenue_is_ledger_backed',
    'projections_included',
    'synthetic_metrics_included',
    'automated_outreach_sent',
  ].includes(column),
);
const sql = `-- Idempotent CreatorVault Top 5 Activation Sprint seed\n-- Generated from ${inputPath}\n-- Sprint date: ${sprintDate}\n-- Real outcome fields are ledger-backed only; source projections remain separate.\n\nINSERT INTO top5_activation_sprint (\n  ${columns.join(',\n  ')}\n) VALUES\n${selected.map((row) => `  (${rowValues(row).join(', ')})`).join(',\n')}\nON DUPLICATE KEY UPDATE\n  ${updateColumns.map((column) => `${column} = VALUES(${column})`).join(',\n  ')},\n  revenue_is_ledger_backed = TRUE,\n  projections_included = FALSE,\n  synthetic_metrics_included = FALSE,\n  automated_outreach_sent = FALSE,\n  updated_at = NOW();\n\n-- Proof query: exactly five ranks, no synthetic outcome claims.\nSELECT sprint_date, COUNT(*) AS selected_count, MIN(top5_rank) AS min_rank, MAX(top5_rank) AS max_rank,\n       SUM(ledger_cash_collected_cents) AS ledger_cash_collected_cents,\n       SUM(completed_transaction_count) AS completed_transaction_count,\n       SUM(active_subscription_count) AS active_subscription_count,\n       SUM(CASE WHEN revenue_is_ledger_backed = TRUE AND projections_included = FALSE AND synthetic_metrics_included = FALSE AND automated_outreach_sent = FALSE THEN 1 ELSE 0 END) AS truthful_rows\nFROM top5_activation_sprint\nWHERE sprint_date = ${sqlString(sprintDate)}\nGROUP BY sprint_date;\n`;

fs.writeFileSync(outputPath, sql);
console.log(JSON.stringify({ success: true, inputPath, outputPath, sprintDate, selectedCount: selected.length }, null, 2));
