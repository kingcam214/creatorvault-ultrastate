
import fs from 'fs';
import mysql from 'mysql2/promise';
import { execFileSync } from 'child_process';
import { pathToFileURL } from 'url';
process.chdir('/root/creatorvault');

const checks = [];
const artifacts = {};
function add(id, name, pass, details = {}) {
  checks.push({ id, name, pass: Boolean(pass), details });
}
function curl(url) {
  try {
    const out = execFileSync('curl', ['-k', '-L', '-sS', '-o', '/tmp/dre_verify_body.html', '-w', 'status=%{http_code} bytes=%{size_download} final=%{url_effective}', url], { encoding: 'utf8', timeout: 60000 });
    const body = fs.existsSync('/tmp/dre_verify_body.html') ? fs.readFileSync('/tmp/dre_verify_body.html', 'utf8') : '';
    return { out, body };
  } catch (error) {
    return { out: String(error.stdout || error.message || error), body: '' };
  }
}
function read(path) {
  try { return fs.readFileSync(path, 'utf8'); } catch { return ''; }
}
async function getDb() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL missing');
  return mysql.createConnection(url);
}
function rows(result) {
  if (Array.isArray(result) && Array.isArray(result[0])) return result[0];
  return [];
}

const route = curl('https://creatorvault.live/daily-revenue-engine');
const ownerRoute = curl('https://creatorvault.live/owner-cockpit/daily-revenue-engine');
const home = curl('https://creatorvault.live/');
const distFiles = fs.existsSync('dist/public/assets') ? fs.readdirSync('dist/public/assets').filter((f) => f.endsWith('.js')) : [];
let bundleHitFiles = [];
for (const f of distFiles) {
  const p = `dist/public/assets/${f}`;
  try {
    const stat = fs.statSync(p);
    if (stat.size > 25_000_000) continue;
    const text = fs.readFileSync(p, 'utf8');
    if (/Daily Revenue Engine|daily-revenue-engine|DailyRevenueEngine|dailyRevenueEngine|syntheticMetricsIncluded|revenueIsLedgerBacked/.test(text)) {
      bundleHitFiles.push(p);
    }
  } catch {}
}

add(1, 'Public Daily Revenue Engine route returns HTTP 200', /status=200/.test(route.out), { route: route.out });
add(2, 'Owner-cockpit Daily Revenue Engine route returns HTTP 200', /status=200/.test(ownerRoute.out), { route: ownerRoute.out });
add(3, 'Existing CreatorVault home route still returns HTTP 200', /status=200/.test(home.out), { route: home.out });
add(4, 'Production bundle contains Daily Revenue Engine identifiers', bundleHitFiles.length >= 1, { bundleFilesScanned: distFiles.length, bundleHitCount: bundleHitFiles.length, sampleBundleAsset: bundleHitFiles[0] || null });
add(5, 'Daily Revenue Engine page source exists on production server', fs.existsSync('client/src/pages/DailyRevenueEngineCommandCenter.tsx'), {});
add(6, 'Daily Revenue Engine backend router exists on production server', fs.existsSync('server/routers/dailyRevenueEngineRouter.ts'), {});
add(7, 'Daily Revenue Engine migration exists on production server', fs.existsSync('drizzle/0019_creatorvault_daily_revenue_engine.sql'), {});
add(8, 'Root router registers dailyRevenueEngine namespace', read('server/routers.ts').includes('dailyRevenueEngine: dailyRevenueEngineRouter'), {});
add(9, 'Frontend routes include both Daily Revenue Engine entry paths', read('client/src/App.tsx').includes('/daily-revenue-engine') && read('client/src/App.tsx').includes('/owner-cockpit/daily-revenue-engine'), {});

const banned = /\b(mock|dummy|faker|lorem ipsum|placeholder metric|fake metric|sample data)\b/i;
const auditedFiles = [
  'server/routers/dailyRevenueEngineRouter.ts',
  'client/src/pages/DailyRevenueEngineCommandCenter.tsx',
  'drizzle/0019_creatorvault_daily_revenue_engine.sql',
  'client/src/App.tsx',
];
const bannedHits = auditedFiles.flatMap((p) => banned.test(read(p)) ? [p] : []);
add(10, 'Daily Revenue Engine production slice contains no fake/demo/placeholder metric markers', bannedHits.length === 0, { auditedFiles, bannedHits });

async function main() {
const conn = await getDb();
try {
  const expectedTables = ['daily_revenue_plans', 'daily_creator_pipeline', 'daily_creator_events', 'daily_revenue_snapshots'];
  const [tableRows] = await conn.query(`SELECT table_name FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name IN (${expectedTables.map(() => '?').join(',')})`, expectedTables);
  const tableNames = rows([tableRows]).map((r) => r.TABLE_NAME || r.table_name);
  add(11, 'All Daily Revenue Engine migration tables exist in production database', expectedTables.every((t) => tableNames.includes(t)), { expectedTables, tableNames });
  const [columnRows] = await conn.query(`SELECT table_name, column_name FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name IN (${expectedTables.map(() => '?').join(',')})`, expectedTables);
  const columns = rows([columnRows]).map((r) => `${r.TABLE_NAME || r.table_name}.${r.COLUMN_NAME || r.column_name}`);
  const requiredColumns = [
    'daily_revenue_plans.target_creators',
    'daily_revenue_plans.actual_cash_collected_cents',
    'daily_creator_pipeline.real_revenue_cents',
    'daily_creator_pipeline.first_revenue_transaction_id',
    'daily_revenue_snapshots.source_tables',
    'daily_revenue_snapshots.cash_collected_cents',
  ];
  add(12, 'Production schema exposes target fields and real-ledger revenue fields', requiredColumns.every((c) => columns.includes(c)), { requiredColumns });

  const { dailyRevenueEngineRouter } = await import(pathToFileURL('/root/creatorvault/server/routers/dailyRevenueEngineRouter.ts').href);
  const caller = dailyRevenueEngineRouter.createCaller({
    user: { id: 1, role: 'king', username: 'production-verifier', email: 'verification@creatorvault.local' },
    req: { headers: {}, cookies: {}, protocol: 'https', get: () => 'creatorvault.live' },
    res: { clearCookie: () => undefined, cookie: () => undefined, setHeader: () => undefined },
  });

  const today = new Date().toISOString().slice(0, 10);
  const verificationHandle = `production-verifier-${Date.now()}`;
  const planResult = await caller.upsertTodayPlan({
    date: today,
    operatorLabel: 'Production verification revenue desk',
    targetCreators: 3,
    targetActivations: 1,
    targetFirstDollars: 0,
    targetMrrCents: 0,
    executionNotes: 'Production verification: operator-entered targets only; no synthetic revenue.',
  });
  add(13, 'upsertTodayPlan writes operator-entered targets without revenue fabrication', Boolean(planResult.success && planResult.plan && Number(planResult.plan.target_creators) === 3 && Number(planResult.plan.target_mrr_cents) === 0), { planId: planResult.plan?.id, targetCreators: planResult.plan?.target_creators, targetMrrCents: planResult.plan?.target_mrr_cents });

  const targetResult = await caller.addTargetCreator({
    date: today,
    handle: verificationHandle,
    platform: 'production_verification',
    priorityScore: 88,
    packagePriority: 'ledger-backed activation',
    nextAction: 'Verify production Daily Revenue Engine ledger-backed workflow',
    evidencePayload: { source: 'production_verification', syntheticRevenue: false },
  });
  add(14, 'addTargetCreator persists a real operator target with zero revenue until a ledger transaction exists', Boolean(targetResult.success && targetResult.pipeline && targetResult.pipeline.stage === 'targeted' && Number(targetResult.pipeline.real_revenue_cents || 0) === 0), { pipelineId: targetResult.pipeline?.id, stage: targetResult.pipeline?.stage, priorityBand: targetResult.pipeline?.priority_band, realRevenueCents: targetResult.pipeline?.real_revenue_cents, realRevenueSource: targetResult.pipeline?.real_revenue_source });

  const stageResult = await caller.recordStageEvent({
    pipelineId: Number(targetResult.pipeline.id),
    nextStage: 'contacted',
    eventType: 'production_verification_contacted',
    eventSource: 'production_verification',
    nextAction: 'Continue only when real activation evidence exists',
    evidencePayload: { source: 'production_verification', syntheticRevenue: false },
  });
  add(15, 'recordStageEvent advances activation pipeline only through recorded events', Boolean(stageResult.success && stageResult.previousStage === 'targeted' && stageResult.nextStage === 'contacted'), { previousStage: stageResult.previousStage, nextStage: stageResult.nextStage });

  let rejectedFakeFirstDollar = false;
  let rejectionMessage = '';
  try {
    await caller.attachFirstDollar({ pipelineId: Number(targetResult.pipeline.id), transactionId: 922337203685477, evidencePayload: { source: 'negative_proof' } });
  } catch (error) {
    rejectedFakeFirstDollar = true;
    rejectionMessage = String(error?.message || error).slice(0, 220);
  }
  add(16, 'attachFirstDollar rejects non-ledger transaction IDs', rejectedFakeFirstDollar && /Completed transaction not found|real transaction ledger/i.test(rejectionMessage), { rejectedFakeFirstDollar, rejectionMessage });

  const snapshotResult = await caller.refreshRevenueSnapshot({ date: today });
  const snapshot = snapshotResult.snapshot || {};
  add(17, 'refreshRevenueSnapshot computes from subscriptions, transactions, and pipeline tables', Boolean(snapshotResult.success && Array.isArray(snapshotResult.sourceTables) && snapshotResult.sourceTables.includes('transactions') && snapshotResult.sourceTables.includes('subscriptions') && snapshotResult.sourceTables.includes('daily_creator_pipeline')), { snapshotId: snapshot.id, sourceTables: snapshotResult.sourceTables });

  const [ledgerRows] = await conn.execute(`SELECT COALESCE(SUM(amount_in_cents), 0) AS cash_collected_cents, COALESCE(SUM(creator_share_in_cents), 0) AS creator_earnings_cents, COALESCE(SUM(platform_share_in_cents), 0) AS platform_share_cents, COUNT(*) AS completed_transactions FROM transactions WHERE status = 'completed' AND DATE(created_at) = ?`, [today]);
  const ledger = rows([ledgerRows])[0] || {};
  add(18, 'Snapshot cash fields match completed transactions ledger for the day', Number(snapshot.cash_collected_cents || 0) === Number(ledger.cash_collected_cents || 0) && Number(snapshot.creator_earnings_cents || 0) === Number(ledger.creator_earnings_cents || 0) && Number(snapshot.platform_share_cents || 0) === Number(ledger.platform_share_cents || 0), { snapshotCashCollectedCents: Number(snapshot.cash_collected_cents || 0), ledgerCashCollectedCents: Number(ledger.cash_collected_cents || 0), completedTransactions: Number(ledger.completed_transactions || 0) });

  const center = await caller.commandCenter({ date: today, limit: 20 });
  add(19, 'commandCenter returns explicit real-metric invariants and operator target labels', Boolean(center.operatorTruth?.targetsAreOperatorEntered === true && center.operatorTruth?.revenueIsLedgerBacked === true && center.operatorTruth?.projectionsIncluded === false && center.realRevenueLedger?.syntheticMetricsIncluded === false), { operatorTruth: center.operatorTruth, realRevenueLedger: center.realRevenueLedger });
  add(20, 'commandCenter exposes the production verification pipeline target in the daily queue', Array.isArray(center.pipeline) && center.pipeline.some((p) => p.handle === verificationHandle), { pipelineCount: center.pipeline?.length || 0, verificationHandlePresent: center.pipeline?.some((p) => p.handle === verificationHandle) || false });

  artifacts.productionRoutes = { dailyRevenueEngine: route.out, ownerCockpitEquivalent: ownerRoute.out, home: home.out };
  artifacts.bundle = { bundleFilesScanned: distFiles.length, bundleHitCount: bundleHitFiles.length, sampleBundleAsset: bundleHitFiles[0] || null };
  artifacts.database = { expectedTables, tableNames, requiredColumns };
  artifacts.dailyRevenueEngine = {
    date: today,
    planId: planResult.plan?.id,
    pipelineId: targetResult.pipeline?.id,
    snapshotId: snapshot.id,
    sourceTables: snapshotResult.sourceTables,
    ledgerCompletedTransactionsToday: Number(ledger.completed_transactions || 0),
    ledgerCashCollectedCentsToday: Number(ledger.cash_collected_cents || 0),
    syntheticMetricsIncluded: center.realRevenueLedger?.syntheticMetricsIncluded === true,
  };
} finally {
  await conn.end();
}

const output = {
  verifiedAt: new Date().toISOString(),
  productionHost: 'creatorvault.live',
  passCount: checks.filter((c) => c.pass).length,
  failCount: checks.filter((c) => !c.pass).length,
  checks,
  artifacts,
};
console.log(JSON.stringify(output, null, 2));
if (output.failCount > 0) process.exit(10);
}
main().catch((error) => {
  console.error(error?.stack || error?.message || String(error));
  process.exit(1);
});
