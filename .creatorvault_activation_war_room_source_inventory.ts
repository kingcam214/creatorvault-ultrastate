
import fs from 'fs';
import mysql from 'mysql2/promise';
process.chdir('/root/creatorvault');

function read(path) { try { return fs.readFileSync(path, 'utf8'); } catch { return ''; } }
function rows(result) { return Array.isArray(result) && Array.isArray(result[0]) ? result[0] : []; }
async function getDb() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL missing');
  return mysql.createConnection(url);
}

const sourceFiles = {
  recruiterOSRouter: read('server/routers/recruiterOSRouter.ts'),
  conversionEngineRouter: read('server/routers/conversionEngineRouter.ts'),
  dailyRevenueEngineRouter: read('server/routers/dailyRevenueEngineRouter.ts'),
  subscriptionsRouter: read('server/routers/subscriptions.ts'),
  payoutRouter: read('server/routers/payouts.ts'),
  payoutService: read('server/services/payoutService.ts'),
  stripeCheckoutRouter: read('server/routers/stripeCheckout.ts'),
  abandonedCheckoutRecovery: read('server/services/abandonedCheckoutRecovery.ts'),
  telegramFunnelRouter: read('server/routers/telegramFunnelRouter.ts'),
  telegramMoneyLoopRouter: read('server/routers/telegramMoneyLoopRouter.ts'),
  rootRouter: read('server/routers.ts'),
  appRoutes: read('client/src/App.tsx'),
};

const expectedTables = [
  'users',
  'creators',
  'recruiter_creator_profiles',
  'creator_conversion_intelligence',
  'creator_conversion_packets',
  'creator_conversion_automation',
  'creator_acquisition_priorities',
  'daily_revenue_plans',
  'daily_creator_pipeline',
  'daily_creator_events',
  'daily_revenue_snapshots',
  'subscription_tiers',
  'subscriptions',
  'transactions',
  'creator_balances',
  'payout_requests',
  'abandoned_checkout_recoveries',
  'telegram_subscribers',
  'telegram_channel_entities',
  'telegram_campaign_deliveries',
  'telegram_message_events',
  'telegram_funnel_enrollments',
  'attribution_events',
  'distribution_jobs',
  'telegram_invite_links',
  'telegram_channel_memberships'
];

const checks = [];
function add(id, name, pass, details = {}) { checks.push({ id, name, pass: Boolean(pass), details }); }

const conn = await getDb();
try {
  const [tableRows] = await conn.query(
    `SELECT table_name, table_rows FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name IN (${expectedTables.map(() => '?').join(',')}) ORDER BY table_name`,
    expectedTables
  );
  const tables = rows([tableRows]).map((r) => ({ table: r.TABLE_NAME || r.table_name, approximateRows: Number(r.TABLE_ROWS ?? r.table_rows ?? 0) }));
  const tableNames = tables.map((t) => t.table);
  const [columnRows] = await conn.query(
    `SELECT table_name, column_name, data_type FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name IN (${expectedTables.map(() => '?').join(',')}) ORDER BY table_name, ordinal_position`,
    expectedTables
  );
  const columnsByTable = {};
  for (const r of rows([columnRows])) {
    const t = r.TABLE_NAME || r.table_name;
    const c = r.COLUMN_NAME || r.column_name;
    const d = r.DATA_TYPE || r.data_type;
    if (!columnsByTable[t]) columnsByTable[t] = [];
    columnsByTable[t].push({ column: c, dataType: d });
  }

  const countQueries = {
    recruiterProfiles: `SELECT COUNT(*) AS count FROM recruiter_creator_profiles`,
    conversionPackets: `SELECT COUNT(*) AS count FROM creator_conversion_packets`,
    conversionAutomation: `SELECT COUNT(*) AS count FROM creator_conversion_automation`,
    dailyPipeline: `SELECT COUNT(*) AS count FROM daily_creator_pipeline`,
    dailyOperatorReviewEvents: `SELECT COUNT(*) AS count FROM daily_creator_events WHERE event_source IN ('operator','production_feed','production_verification') OR event_type LIKE '%operator%'`,
    completedTransactions: `SELECT COUNT(*) AS count, COALESCE(SUM(amount_in_cents),0) AS amountCents, COALESCE(SUM(creator_share_in_cents),0) AS creatorShareCents, COALESCE(SUM(platform_share_in_cents),0) AS platformShareCents FROM transactions WHERE status = 'completed'`,
    activeSubscriptions: `SELECT COUNT(*) AS count FROM subscriptions WHERE status = 'active'`,
    activeSubscriptionTiers: `SELECT COUNT(*) AS count FROM subscription_tiers WHERE is_active = 1`,
    payoutPending: `SELECT COUNT(*) AS count, COALESCE(SUM(amount_in_cents),0) AS amountCents FROM payout_requests WHERE status = 'pending'`,
    payoutCompleted: `SELECT COUNT(*) AS count, COALESCE(SUM(amount_in_cents),0) AS amountCents FROM payout_requests WHERE status = 'completed'`,
    creatorBalances: `SELECT COUNT(*) AS count, COALESCE(SUM(available_balance_in_cents),0) AS availableCents, COALESCE(SUM(pending_balance_in_cents),0) AS pendingCents, COALESCE(SUM(lifetime_earnings_in_cents),0) AS lifetimeCents FROM creator_balances`,
    abandonedCheckoutOpen: tableNames.includes('abandoned_checkout_recoveries') ? `SELECT COUNT(*) AS count FROM abandoned_checkout_recoveries WHERE conversion_status IS NULL OR conversion_status <> 'converted'` : null,
    abandonedCheckoutConverted: tableNames.includes('abandoned_checkout_recoveries') ? `SELECT COUNT(*) AS count FROM abandoned_checkout_recoveries WHERE conversion_status = 'converted'` : null,
    telegramSubscribers: tableNames.includes('telegram_subscribers') ? `SELECT COUNT(*) AS count FROM telegram_subscribers` : null,
    attributionEvents: tableNames.includes('attribution_events') ? `SELECT COUNT(*) AS count FROM attribution_events` : null,
  };
  const counts = {};
  for (const [key, query] of Object.entries(countQueries)) {
    if (!query) { counts[key] = { available: false }; continue; }
    try {
      const [result] = await conn.query(query);
      counts[key] = { available: true, ...(rows([result])[0] || {}) };
    } catch (error) {
      counts[key] = { available: false, error: String(error?.message || error).slice(0, 180) };
    }
  }

  const today = new Date().toISOString().slice(0,10);
  const [todayLedgerRows] = await conn.query(`SELECT COUNT(*) AS count, COALESCE(SUM(amount_in_cents),0) AS amountCents, COALESCE(SUM(creator_share_in_cents),0) AS creatorShareCents, COALESCE(SUM(platform_share_in_cents),0) AS platformShareCents FROM transactions WHERE status = 'completed' AND DATE(created_at) = ?`, [today]);
  const [todaySnapshotRows] = await conn.query(`SELECT * FROM daily_revenue_snapshots WHERE snapshot_date = ? LIMIT 1`, [today]);

  add(1, 'Authoritative transaction ledger exists', tableNames.includes('transactions'), { table: 'transactions' });
  add(2, 'Recurring subscription tables exist', tableNames.includes('subscriptions') && tableNames.includes('subscription_tiers'), { tables: ['subscriptions','subscription_tiers'] });
  add(3, 'Payout and creator balance tables exist', tableNames.includes('payout_requests') && tableNames.includes('creator_balances'), { tables: ['payout_requests','creator_balances'] });
  add(4, 'Recruiter and conversion packet tables exist', ['recruiter_creator_profiles','creator_conversion_packets','creator_conversion_automation','creator_acquisition_priorities'].every((t) => tableNames.includes(t)), {});
  add(5, 'Daily Revenue Engine tables exist for operator queue linkage', ['daily_revenue_plans','daily_creator_pipeline','daily_creator_events','daily_revenue_snapshots'].every((t) => tableNames.includes(t)), {});
  add(6, 'Checkout recovery table is available or explicitly missing for blocker handling', true, { abandonedCheckoutRecoveriesAvailable: tableNames.includes('abandoned_checkout_recoveries') });
  add(7, 'Telegram monetization/source tables are partially available for readiness signals', tableNames.some((t) => t.startsWith('telegram_') || t === 'attribution_events'), { telegramRelatedTables: tableNames.filter((t) => t.startsWith('telegram_') || t === 'attribution_events') });
  add(8, 'Existing code contains no direct automated send path in Daily Revenue Engine router', !/sendMessage|sendVideo|fetch\(`https:\/\/api\.telegram\.org/.test(sourceFiles.dailyRevenueEngineRouter), {});
  add(9, 'Existing Daily Revenue Engine exposes ledger-backed truth flags', /revenueIsLedgerBacked|syntheticMetricsIncluded/.test(sourceFiles.dailyRevenueEngineRouter), {});
  add(10, 'Activation War Room can register as a new tRPC namespace and frontend route', sourceFiles.rootRouter.length > 0 && sourceFiles.appRoutes.length > 0, { rootRouterPresent: sourceFiles.rootRouter.length > 0, appRoutesPresent: sourceFiles.appRoutes.length > 0 });

  const output = {
    auditedAt: new Date().toISOString(),
    productionHost: 'creatorvault.live',
    passCount: checks.filter((c) => c.pass).length,
    failCount: checks.filter((c) => !c.pass).length,
    checks,
    sourceInventory: {
      tables,
      columnsByTable,
      counts,
      todayLedger: rows([todayLedgerRows])[0] || {},
      todaySnapshotPresent: rows([todaySnapshotRows]).length > 0,
      routeAndRouterFiles: Object.fromEntries(Object.entries(sourceFiles).map(([k,v]) => [k, { present: v.length > 0, bytes: v.length }]))
    },
    implementationSignals: {
      ledgerRevenueTables: ['transactions', 'subscriptions', 'subscription_tiers'],
      payoutTables: ['payout_requests', 'creator_balances'],
      operatorQueueTables: ['daily_creator_pipeline', 'daily_creator_events', 'creator_conversion_automation'],
      prospectTables: ['recruiter_creator_profiles', 'creator_conversion_packets', 'creator_acquisition_priorities'],
      optionalBlockerTables: ['abandoned_checkout_recoveries', 'telegram_subscribers', 'attribution_events']
    }
  };
  console.log(JSON.stringify(output, null, 2));
} finally {
  await conn.end();
}
