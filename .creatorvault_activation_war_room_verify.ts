
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
    const out = execFileSync('curl', ['-k', '-L', '-sS', '-o', '/tmp/awr_verify_body.html', '-w', 'status=%{http_code} bytes=%{size_download} final=%{url_effective}', url], { encoding: 'utf8', timeout: 60000 });
    const body = fs.existsSync('/tmp/awr_verify_body.html') ? fs.readFileSync('/tmp/awr_verify_body.html', 'utf8') : '';
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
function numberish(value) {
  const n = Number(value || 0);
  return Number.isFinite(n) ? n : 0;
}

const publicRoute = curl('https://creatorvault.live/activation-war-room');
const ownerRoute = curl('https://creatorvault.live/owner-cockpit/activation-war-room');
const home = curl('https://creatorvault.live/');
const distDir = 'dist/public/assets';
const distFiles = fs.existsSync(distDir) ? fs.readdirSync(distDir).filter((f) => f.endsWith('.js')) : [];
let bundleHitFiles = [];
for (const f of distFiles) {
  const p = `${distDir}/${f}`;
  try {
    const stat = fs.statSync(p);
    if (stat.size > 35_000_000) continue;
    const text = fs.readFileSync(p, 'utf8');
    if (/Activation War Room|activation-war-room|ActivationWarRoom|activationWarRoom|revenueIsLedgerBacked|automatedOutreachSent|syntheticMetricsIncluded/.test(text)) {
      bundleHitFiles.push(p);
    }
  } catch {}
}

const routerText = read('server/routers/activationWarRoomRouter.ts');
const pageText = read('client/src/pages/ActivationWarRoomCommandCenter.tsx');
const appText = read('client/src/App.tsx');
const rootRouterText = read('server/routers.ts');
const layoutText = read('client/src/components/DashboardLayout.tsx');
const migrationText = read('drizzle/0020_creatorvault_activation_war_room.sql');

add(1, 'Public Activation War Room route returns HTTP 200', /status=200/.test(publicRoute.out), { route: publicRoute.out });
add(2, 'Owner-cockpit Activation War Room route returns HTTP 200', /status=200/.test(ownerRoute.out), { route: ownerRoute.out });
add(3, 'Existing CreatorVault home route still returns HTTP 200', /status=200/.test(home.out), { route: home.out });
add(4, 'Production bundle contains Activation War Room identifiers', bundleHitFiles.length >= 1, { bundleFilesScanned: distFiles.length, bundleHitCount: bundleHitFiles.length, sampleBundleAsset: bundleHitFiles[0] || null });
add(5, 'Activation War Room page source exists on production server', fs.existsSync('client/src/pages/ActivationWarRoomCommandCenter.tsx'), {});
add(6, 'Activation War Room backend router exists on production server', fs.existsSync('server/routers/activationWarRoomRouter.ts'), {});
add(7, 'Activation War Room migration exists on production server', fs.existsSync('drizzle/0020_creatorvault_activation_war_room.sql'), {});
add(8, 'Root router registers activationWarRoom namespace', rootRouterText.includes('activationWarRoom: activationWarRoomRouter'), {});
add(9, 'Frontend routes include both Activation War Room entry paths', appText.includes('/activation-war-room') && appText.includes('/owner-cockpit/activation-war-room'), {});
add(10, 'Operator navigation includes Activation War Room execution link', layoutText.includes('/activation-war-room') && /Activation War Room/i.test(layoutText), {});

const auditedFiles = {
  router: routerText,
  page: pageText,
  migration: migrationText,
  app: appText,
  layout: layoutText,
};
const fakeMetricPattern = /\b(mock|dummy|faker|lorem ipsum|placeholder metric|fake metric|sample data)\b/i;
const fakeHits = Object.entries(auditedFiles).filter(([_, text]) => fakeMetricPattern.test(text)).map(([name]) => name);
add(11, 'Activation War Room production slice contains no fake/demo/placeholder metric markers', fakeHits.length === 0, { auditedFiles: Object.keys(auditedFiles), fakeHits });
const automatedSendPattern = /\b(sendMessage|sendTelegram|sendWhatsApp|sendEmail|twilio|nodemailer|telegram\.send|whatsapp\.send|client\.messages\.create)\b/i;
const sendHits = Object.entries({ router: routerText, page: pageText, migration: migrationText }).filter(([_, text]) => automatedSendPattern.test(text)).map(([name]) => name);
add(12, 'Activation War Room contains no automated outreach send calls', sendHits.length === 0, { sendHits });
const vanityHits = ['followers', 'likes', 'views', 'impressions'].filter((term) => new RegExp(`\\b${term}\\b`, 'i').test(routerText + '\n' + pageText + '\n' + migrationText));
add(13, 'Activation War Room contains no vanity metric language', vanityHits.length === 0, { vanityHits });
add(14, 'Activation War Room UI frames actions as operator-reviewed interventions', /operator-reviewed|operator review|review queue/i.test(pageText), {});

async function main() {
const conn = await getDb();
try {
  const expectedTables = ['activation_war_room_snapshots', 'activation_war_room_creator_status', 'activation_war_room_blockers', 'activation_war_room_interventions'];
  const sourceTables = ['transactions', 'subscriptions', 'subscription_tiers', 'creator_balances', 'payout_requests', 'recruiter_creator_profiles', 'creator_conversion_packets', 'creator_conversion_automation', 'creator_acquisition_priorities', 'daily_revenue_plans', 'daily_creator_pipeline', 'daily_creator_events'];
  const [tableRows] = await conn.query(`SELECT table_name FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name IN (${expectedTables.map(() => '?').join(',')})`, expectedTables);
  const tableNames = rows([tableRows]).map((r) => r.TABLE_NAME || r.table_name);
  add(15, 'All Activation War Room migration tables exist in production database', expectedTables.every((t) => tableNames.includes(t)), { expectedTables, tableNames });

  const [sourceTableRows] = await conn.query(`SELECT table_name FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name IN (${sourceTables.map(() => '?').join(',')})`, sourceTables);
  const sourceTableNames = rows([sourceTableRows]).map((r) => r.TABLE_NAME || r.table_name);
  add(16, 'Production source ledgers and operator queues needed by War Room exist', sourceTables.every((t) => sourceTableNames.includes(t)), { expectedSourceTables: sourceTables, sourceTableNames });

  const [columnRows] = await conn.query(`SELECT table_name, column_name FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name IN (${expectedTables.map(() => '?').join(',')})`, expectedTables);
  const columns = rows([columnRows]).map((r) => `${r.TABLE_NAME || r.table_name}.${r.COLUMN_NAME || r.column_name}`);
  const requiredColumns = [
    'activation_war_room_snapshots.revenue_is_ledger_backed',
    'activation_war_room_snapshots.projections_included',
    'activation_war_room_snapshots.synthetic_metrics_included',
    'activation_war_room_snapshots.automated_outreach_sent',
    'activation_war_room_creator_status.revenue_is_ledger_backed',
    'activation_war_room_creator_status.synthetic_metrics_included',
    'activation_war_room_interventions.automated_outreach_sent',
    'activation_war_room_interventions.review_status',
    'activation_war_room_blockers.blocker_status',
  ];
  add(17, 'Production schema exposes ledger-backed and outreach-safety guard columns', requiredColumns.every((c) => columns.includes(c)), { requiredColumns });

  const [countRows] = await conn.query(`SELECT 'recruiter_creator_profiles' AS table_name, COUNT(*) AS row_count FROM recruiter_creator_profiles UNION ALL SELECT 'creator_conversion_packets', COUNT(*) FROM creator_conversion_packets UNION ALL SELECT 'daily_creator_pipeline', COUNT(*) FROM daily_creator_pipeline UNION ALL SELECT 'transactions', COUNT(*) FROM transactions UNION ALL SELECT 'subscriptions', COUNT(*) FROM subscriptions UNION ALL SELECT 'creator_balances', COUNT(*) FROM creator_balances UNION ALL SELECT 'payout_requests', COUNT(*) FROM payout_requests`);
  const productionCounts = Object.fromEntries(rows([countRows]).map((r) => [r.table_name, numberish(r.row_count)]));
  add(18, 'Production contains real creator, conversion, daily pipeline, and ledger source rows for War Room computation', productionCounts.recruiter_creator_profiles >= 1 && productionCounts.creator_conversion_packets >= 1 && productionCounts.daily_creator_pipeline >= 1 && productionCounts.transactions >= 1 && productionCounts.subscriptions >= 1, { productionCounts });

  const { activationWarRoomRouter } = await import(pathToFileURL('/root/creatorvault/server/routers/activationWarRoomRouter.ts').href);
  const caller = activationWarRoomRouter.createCaller({
    user: { id: 1, role: 'king', username: 'production-verifier', email: 'verification@creatorvault.local' },
    req: { headers: {}, cookies: {}, protocol: 'https', get: () => 'creatorvault.live' },
    res: { clearCookie: () => undefined, cookie: () => undefined, setHeader: () => undefined },
  });

  const today = new Date().toISOString().slice(0, 10);
  const snapshotResult = await caller.refreshSnapshot({ date: today });
  add(19, 'refreshSnapshot computes cashflow from ledger sources and preserves truth flags', Boolean(snapshotResult.success && snapshotResult.truthFlags?.revenueIsLedgerBacked === true && snapshotResult.truthFlags?.projectionsIncluded === false && snapshotResult.truthFlags?.syntheticMetricsIncluded === false && snapshotResult.truthFlags?.automatedOutreachSent === false), { date: today, snapshotId: snapshotResult.snapshot?.id, truthFlags: snapshotResult.truthFlags });

  const creatorRefresh = await caller.refreshCreatorStatuses({ date: today, limit: 50 });
  add(20, 'refreshCreatorStatuses creates activation statuses/interventions without automated outreach', Boolean(creatorRefresh.success && creatorRefresh.refreshed >= 1 && creatorRefresh.truthFlags?.revenueIsLedgerBacked === true && creatorRefresh.truthFlags?.automatedOutreachSent === false), { refreshed: creatorRefresh.refreshed, truthFlags: creatorRefresh.truthFlags });

  const center = await caller.commandCenter({ date: today, limit: 50 });
  add(21, 'commandCenter exposes ledger-backed truth flags and required source tables', Boolean(center.truthFlags?.revenueIsLedgerBacked === true && center.truthFlags?.projectionsIncluded === false && center.truthFlags?.syntheticMetricsIncluded === false && center.truthFlags?.automatedOutreachSent === false && Array.isArray(center.sourceTables) && ['transactions','subscriptions','subscription_tiers','creator_balances','payout_requests','daily_creator_pipeline'].every((t) => center.sourceTables.includes(t))), { truthFlags: center.truthFlags, sourceTables: center.sourceTables });
  add(22, 'commandCenter returns creator activation queue and operator intervention queue', Boolean(Array.isArray(center.creators) && center.creators.length >= 1 && Array.isArray(center.interventions) && center.interventions.length >= 1), { creatorCount: center.creators?.length || 0, blockerCount: center.blockers?.length || 0, interventionCount: center.interventions?.length || 0 });

  const [ledgerRows] = await conn.execute(`SELECT COALESCE(SUM(amount_in_cents), 0) AS cash_collected_cents, COALESCE(SUM(creator_share_in_cents), 0) AS creator_earnings_cents, COALESCE(SUM(platform_share_in_cents), 0) AS platform_share_cents, COUNT(*) AS completed_transactions FROM transactions WHERE status = 'completed' AND DATE(created_at) = ?`, [today]);
  const ledger = rows([ledgerRows])[0] || {};
  const snapshot = snapshotResult.snapshot || {};
  add(23, 'War Room snapshot cash fields match completed transactions ledger for the day', numberish(snapshot.ledger_cash_collected_cents) === numberish(ledger.cash_collected_cents) && numberish(snapshot.ledger_creator_earnings_cents) === numberish(ledger.creator_earnings_cents) && numberish(snapshot.ledger_platform_share_cents) === numberish(ledger.platform_share_cents), { snapshotCashCollectedCents: numberish(snapshot.ledger_cash_collected_cents), ledgerCashCollectedCents: numberish(ledger.cash_collected_cents), completedTransactionsToday: numberish(ledger.completed_transactions) });

  const [guardRows] = await conn.execute(`SELECT COUNT(*) AS bad_snapshot_rows FROM activation_war_room_snapshots WHERE revenue_is_ledger_backed <> TRUE OR projections_included <> FALSE OR synthetic_metrics_included <> FALSE OR automated_outreach_sent <> FALSE`);
  const guards = rows([guardRows])[0] || {};
  add(24, 'Snapshot guard flags reject synthetic metrics, projections, and automated outreach', numberish(guards.bad_snapshot_rows) === 0, { badSnapshotRows: numberish(guards.bad_snapshot_rows) });

  const [statusGuardRows] = await conn.execute(`SELECT COUNT(*) AS bad_status_rows, COUNT(*) AS total_status_rows FROM activation_war_room_creator_status WHERE revenue_is_ledger_backed <> TRUE OR projections_included <> FALSE OR synthetic_metrics_included <> FALSE`);
  const statusGuards = rows([statusGuardRows])[0] || {};
  add(25, 'Creator status rows remain ledger-backed with no projections or synthetic metrics', numberish(statusGuards.bad_status_rows) === 0, { badStatusRows: numberish(statusGuards.bad_status_rows), totalStatusRows: numberish(statusGuards.total_status_rows) });

  const [interventionGuardRows] = await conn.execute(`SELECT COUNT(*) AS automated_outreach_rows, COUNT(*) AS queued_rows FROM activation_war_room_interventions WHERE automated_outreach_sent <> FALSE`);
  const interventionGuards = rows([interventionGuardRows])[0] || {};
  add(26, 'Intervention queue contains no automated outreach sends', numberish(interventionGuards.automated_outreach_rows) === 0, { automatedOutreachRows: numberish(interventionGuards.automated_outreach_rows), queuedRows: numberish(interventionGuards.queued_rows) });

  let pm2Summary = '';
  try { pm2Summary = execFileSync('bash', ['-lc', 'pm2 status --no-color 2>/dev/null || true'], { encoding: 'utf8', timeout: 20000 }); } catch (error) { pm2Summary = String(error.stdout || error.message || error); }
  add(27, 'Production process manager reports at least one online app process after deployment', /online/i.test(pm2Summary), { pm2Summary: pm2Summary.slice(0, 1000) });

  artifacts.productionRoutes = { activationWarRoom: publicRoute.out, ownerCockpitEquivalent: ownerRoute.out, home: home.out };
  artifacts.bundle = { bundleFilesScanned: distFiles.length, bundleHitCount: bundleHitFiles.length, sampleBundleAsset: bundleHitFiles[0] || null };
  artifacts.database = { expectedTables, sourceTables, productionCounts, requiredColumns };
  artifacts.activationWarRoom = {
    date: today,
    snapshotId: snapshotResult.snapshot?.id,
    creatorStatusCount: center.creators?.length || 0,
    blockerCount: center.blockers?.length || 0,
    interventionCount: center.interventions?.length || 0,
    ledgerCashCollectedCentsToday: numberish(ledger.cash_collected_cents),
    completedTransactionsToday: numberish(ledger.completed_transactions),
    truthFlags: center.truthFlags,
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
