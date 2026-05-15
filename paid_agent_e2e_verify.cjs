const fs = require('fs');
const envText = fs.existsSync('/root/creatorvault/.env') ? fs.readFileSync('/root/creatorvault/.env', 'utf8') : '';
for (const line of envText.split(/\r?\n/)) {
  const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)=(.*)\s*$/);
  if (!m || process.env[m[1]] !== undefined) continue;
  let value = m[2].trim();
  if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) value = value.slice(1, -1);
  process.env[m[1]] = value;
}
const mysql = require('mysql2/promise');
const { execSync } = require('child_process');

function scrub(s) {
  if (s == null) return s;
  return String(s)
    .replace(/sk_live_[A-Za-z0-9_\-]+/g, '[redacted_stripe_secret]')
    .replace(/xox[baprs]-[A-Za-z0-9_\-]+/g, '[redacted_token]')
    .replace(/bot\d+:[A-Za-z0-9_\-]+/g, '[redacted_bot_token]')
    .replace(/mysql:\/\/[^@\s]+@/g, 'mysql://[redacted]@');
}
function safeRows(rows, max = 10) {
  return rows.slice(0, max).map((r) => Object.fromEntries(Object.entries(r).map(([k, v]) => {
    if (v instanceof Date) return [k, v.toISOString()];
    if (typeof v === 'string') return [k, scrub(v).slice(0, 1000)];
    return [k, v];
  })));
}
async function tableExists(conn, name) {
  const [r] = await conn.query('SELECT COUNT(*) AS c FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = ?', [name]);
  return Number(r[0]?.c || 0) > 0;
}
async function countRecent(conn, table, dateCol) {
  if (!(await tableExists(conn, table))) return { exists: false };
  const [r] = await conn.query(`SELECT COUNT(*) AS total, SUM(CASE WHEN ${dateCol} >= NOW() - INTERVAL 24 HOUR THEN 1 ELSE 0 END) AS last24h FROM ${table}`);
  return { exists: true, total: Number(r[0].total || 0), last24h: Number(r[0].last24h || 0) };
}

(async () => {
  const result = { ok: true, checkedAt: new Date().toISOString(), production: {}, proof: {}, blockers: [] };
  const conn = await mysql.createConnection(process.env.DATABASE_URL);
  try {
    const [challengeRows] = await conn.query("SELECT id, title, status, current_revenue, target_revenue, updated_at FROM empire_challenges WHERE status='active' ORDER BY id DESC LIMIT 3");
    result.proof.activeChallenge = safeRows(challengeRows, 3);

    const [cycleRows] = await conn.query(`SELECT id, agent_slug, agent_name, report_type, revenue_impact, created_at, LEFT(content, 1200) AS content_preview
      FROM empire_agent_reports
      WHERE report_type LIKE '%cycle%' OR agent_slug LIKE '%swarm%' OR report_type LIKE '%agent%'
      ORDER BY created_at DESC LIMIT 15`);
    result.proof.recentCycleReports = safeRows(cycleRows, 15);

    const [agentRows] = await conn.query(`SELECT agent_slug, agent_name,
        COUNT(*) AS reports,
        SUM(CASE WHEN created_at >= NOW() - INTERVAL 24 HOUR THEN 1 ELSE 0 END) AS reports_24h,
        SUM(CASE WHEN COALESCE(revenue_impact,0) > 0 THEN 1 ELSE 0 END) AS positive_revenue_reports,
        ROUND(SUM(COALESCE(revenue_impact,0)),2) AS internal_revenue_claimed,
        MAX(created_at) AS last_report_at
      FROM empire_agent_reports
      GROUP BY agent_slug, agent_name
      ORDER BY last_report_at DESC, internal_revenue_claimed DESC
      LIMIT 60`);
    result.proof.agentReportSummary = safeRows(agentRows, 60);

    const [txRows] = await conn.query(`SELECT id, challenge_id, amount, source, description, recorded_at
      FROM empire_challenge_transactions
      ORDER BY recorded_at DESC LIMIT 25`);
    result.proof.recentChallengeCredits = safeRows(txRows, 25);

    const [cashTables] = await conn.query(`SELECT table_name FROM information_schema.tables WHERE table_schema = DATABASE() AND (table_name LIKE '%stripe%' OR table_name LIKE '%payment%' OR table_name LIKE '%transaction%' OR table_name LIKE '%subscription%' OR table_name LIKE '%order%' OR table_name LIKE '%sale%') ORDER BY table_name`);
    result.proof.cashRelatedTables = cashTables.map((r) => r.TABLE_NAME || r.table_name).slice(0, 80);

    for (const [table, col] of [['telegram_drops', 'created_at'], ['distribution_jobs', 'created_at'], ['telegram_message_events', 'created_at'], ['empire_challenge_transactions', 'recorded_at'], ['empire_agent_reports', 'created_at']]) {
      result.proof[`${table}Counts`] = await countRecent(conn, table, col);
    }

    if (await tableExists(conn, 'telegram_drops')) {
      const [drops] = await conn.query('SELECT id, tracking_code, product_name, price, status, created_at FROM telegram_drops ORDER BY created_at DESC LIMIT 15');
      result.proof.recentTelegramDrops = safeRows(drops, 15);
    }
    if (await tableExists(conn, 'distribution_jobs')) {
      const [jobs] = await conn.query('SELECT id, channel, status, target_url, created_at, updated_at FROM distribution_jobs ORDER BY created_at DESC LIMIT 15');
      result.proof.recentDistributionJobs = safeRows(jobs, 15);
    }
    if (await tableExists(conn, 'telegram_message_events')) {
      const [events] = await conn.query('SELECT id, event_type, tracking_code, created_at FROM telegram_message_events ORDER BY created_at DESC LIMIT 20');
      result.proof.recentTelegramEvents = safeRows(events, 20);
    }

    const [recentErrors] = await conn.query(`SELECT id, agent_slug, agent_name, report_type, created_at, LEFT(content, 1000) AS content_preview
      FROM empire_agent_reports
      WHERE LOWER(content) LIKE '%error%' OR LOWER(content) LIKE '%failed%' OR LOWER(content) LIKE '%timeout%' OR LOWER(content) LIKE '%blocked%'
      ORDER BY created_at DESC LIMIT 20`);
    result.proof.recentFailureReports = safeRows(recentErrors, 20);

    const [paymentProbe] = await conn.query(`SELECT table_name, column_name FROM information_schema.columns WHERE table_schema = DATABASE() AND (column_name LIKE '%stripe%' OR column_name LIKE '%amount%' OR column_name LIKE '%paid%' OR column_name LIKE '%checkout%' OR column_name LIKE '%payment%') AND table_name NOT IN ('empire_challenge_transactions','empire_agent_reports') ORDER BY table_name, ordinal_position LIMIT 160`);
    result.proof.paymentSchemaProbe = safeRows(paymentProbe, 160);

    try { result.production.pm2 = scrub(execSync("pm2 jlist | node -e 'let s=\"\";process.stdin.on(\"data\",d=>s+=d);process.stdin.on(\"end\",()=>{let a=JSON.parse(s); console.log(JSON.stringify(a.filter(p=>p.name===\"creatorvault\").map(p=>({name:p.name,status:p.pm2_env.status,restarts:p.pm2_env.restart_time,pid:p.pid,uptime:p.pm2_env.pm_uptime}))))})'", { timeout: 8000 }).toString()); } catch (e) { result.production.pm2 = scrub(e.message); }
    try { result.production.homepageHttp = scrub(execSync("curl -sS -o /dev/null -w '%{http_code}' https://creatorvault.live/", { timeout: 15000 }).toString()); } catch (e) { result.production.homepageHttp = scrub(e.message); }
    try { result.production.checkoutHttp = scrub(execSync("curl -sS -o /dev/null -w '%{http_code}' https://creatorvault.live/checkout", { timeout: 15000 }).toString()); } catch (e) { result.production.checkoutHttp = scrub(e.message); }

    const cycleComplete = result.proof.recentCycleReports.some((r) => String(r.report_type || '').includes('cycle_completed') && Number(r.revenue_impact || 0) > 0);
    const realOutbound = (result.proof.telegram_dropsCounts?.last24h || 0) > 0 || (result.proof.distribution_jobsCounts?.last24h || 0) > 0 || (result.proof.telegram_message_eventsCounts?.last24h || 0) > 0;
    if (!cycleComplete) result.blockers.push('No recent persisted completed paid-agent cycle with positive revenue_impact found.');
    if (!realOutbound) result.blockers.push('No recent Telegram/distribution outbound proof found for money-drop execution.');
    result.blockers.push('Actual Stripe cash is not proven by internal challenge credits; a paid checkout/webhook payment record or Stripe dashboard event is still required for cash collection proof.');
    result.summary = {
      cycleCompleteWithPositiveInternalCredit: cycleComplete,
      outboundMoneyDropProofLast24h: realOutbound,
      productionHealthy: result.production.homepageHttp === '200',
      checkoutEndpointHttp: result.production.checkoutHttp,
      actualStripeCashProven: false
    };
  } finally {
    await conn.end();
  }
  console.log(JSON.stringify(result, null, 2));
})().catch((err) => {
  console.log(JSON.stringify({ ok: false, error: scrub(err.stack || err.message || String(err)) }, null, 2));
  process.exitCode = 1;
});
