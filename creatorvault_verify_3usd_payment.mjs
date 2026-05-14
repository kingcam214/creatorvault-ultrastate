import { spawnSync } from 'node:child_process';

const sessionId = process.env.CHECKOUT_SESSION_ID;
const proofTierId = Number(process.env.PROOF_TIER_ID || 37);
const launchedAt = process.env.CHECKOUT_LAUNCHED_AT || '2026-05-08 19:35:07';

console.log('verify-3usd-payment-start');
console.log(`proof_tier_id=${proofTierId}`);
console.log(`checkout_session_prefix=${sessionId ? sessionId.slice(0, 8) : 'missing'}`);

function redact(s) {
  return String(s || '')
    .replace(/(cs_(live|test)_)[A-Za-z0-9_]+/g, '$1[REDACTED]')
    .replace(/(sub_)[A-Za-z0-9_]+/g, '$1[REDACTED]')
    .replace(/(in_)[A-Za-z0-9_]+/g, '$1[REDACTED]')
    .replace(/(pi_)[A-Za-z0-9_]+/g, '$1[REDACTED]')
    .replace(/(ch_)[A-Za-z0-9_]+/g, '$1[REDACTED]')
    .replace(/(cus_)[A-Za-z0-9_]+/g, '$1[REDACTED]')
    .replace(/--password=[^\s]+/g, '--password=[REDACTED]')
    .replace(/mysql:\/\/[^\s]+/g, 'mysql://[REDACTED]')
    .replace(/sk_live_[A-Za-z0-9_]+/g, 'sk_live_[REDACTED]');
}
function fail(message, code = 1) {
  console.log(`fatal_error=${redact(message)}`);
  console.log('verify-3usd-payment-end');
  process.exit(code);
}
if (!sessionId) fail('CHECKOUT_SESSION_ID missing');
if (!process.env.STRIPE_SECRET_KEY) fail('STRIPE_SECRET_KEY missing');

function mysqlQuery(sql, timeout = 15000) {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) fail('DATABASE_URL unavailable');
  const url = new URL(databaseUrl);
  const args = ['--protocol=TCP','-h',url.hostname,'-P',url.port || '3306','-u',decodeURIComponent(url.username),`--password=${decodeURIComponent(url.password)}`,decodeURIComponent(url.pathname.replace(/^\//, '')),'-N','-B','-e',sql];
  const res = spawnSync('mysql', args, { encoding: 'utf8', timeout });
  if (res.error) fail(`mysql query error: ${res.error.message}`);
  if (res.status !== 0) fail(`mysql query failed status=${res.status} stderr=${res.stderr.slice(0, 500)}`);
  return res.stdout.trim();
}
function mysqlRows(sql) {
  const out = mysqlQuery(sql);
  if (!out) return [];
  return out.split('\n').filter(Boolean).map(line => line.split('\t'));
}
function escSql(value) { return String(value).replace(/'/g, "''"); }
function bool(v) { return v ? 'true' : 'false'; }
async function stripeGet(path) {
  const res = await fetch(`https://api.stripe.com/v1${path}`, {
    headers: { authorization: `Bearer ${process.env.STRIPE_SECRET_KEY}` },
    signal: AbortSignal.timeout(15000),
  });
  const text = await res.text();
  let json = null;
  try { json = JSON.parse(text); } catch {}
  if (!res.ok) fail(`Stripe API failed ${res.status}: ${redact(text.slice(0, 500))}`);
  return json;
}
function tableExists(name) {
  const rows = mysqlRows(`SHOW TABLES LIKE '${escSql(name)}'`);
  return rows.length > 0;
}
function columns(table) {
  if (!tableExists(table)) return [];
  return mysqlRows(`SHOW COLUMNS FROM \`${table}\``).map(r => r[0]);
}
function has(cols, name) { return cols.includes(name); }
function selectRecent(table, preferredWhere, limit = 5) {
  if (!tableExists(table)) return { exists: false, rows: [] };
  const cols = columns(table);
  const orderCol = ['created_at','createdAt','updated_at','updatedAt','id'].find(c => has(cols,c)) || cols[0];
  const selectCols = cols.slice(0, Math.min(cols.length, 12)).map(c => `\`${c}\``).join(',');
  let where = preferredWhere;
  try {
    const rows = mysqlRows(`SELECT ${selectCols} FROM \`${table}\` ${where ? `WHERE ${where}` : ''} ORDER BY \`${orderCol}\` DESC LIMIT ${limit}`);
    return { exists: true, cols: cols.slice(0, Math.min(cols.length, 12)), rows };
  } catch (e) {
    const rows = mysqlRows(`SELECT ${selectCols} FROM \`${table}\` ORDER BY \`${orderCol}\` DESC LIMIT ${limit}`);
    return { exists: true, cols: cols.slice(0, Math.min(cols.length, 12)), rows };
  }
}
function printDataset(label, ds) {
  console.log(`${label}_exists=${bool(ds.exists)}`);
  if (ds.exists) {
    console.log(`${label}_columns=${redact((ds.cols || []).join(','))}`);
    console.log(`${label}_row_count=${ds.rows.length}`);
    ds.rows.slice(0,3).forEach((r, i) => console.log(`${label}_row_${i+1}=${redact(JSON.stringify(r))}`));
  }
}

try {
  console.log('progress=stripe_checkout_session_fetch_start');
  const session = await stripeGet(`/checkout/sessions/${encodeURIComponent(sessionId)}?expand[]=subscription&expand[]=payment_intent&expand[]=customer`);
  console.log('progress=stripe_checkout_session_fetch_done');
  const amountTotal = session.amount_total ?? session.amount_subtotal ?? null;
  const stripeSubId = typeof session.subscription === 'string' ? session.subscription : session.subscription?.id;
  const paymentIntentId = typeof session.payment_intent === 'string' ? session.payment_intent : session.payment_intent?.id;
  const customerId = typeof session.customer === 'string' ? session.customer : session.customer?.id;
  console.log(`stripe_session_mode=${session.livemode ? 'live' : 'test'}`);
  console.log(`stripe_session_status=${session.status}`);
  console.log(`stripe_payment_status=${session.payment_status}`);
  console.log(`stripe_currency=${session.currency}`);
  console.log(`stripe_amount_total=${amountTotal}`);
  console.log(`stripe_subscription_prefix=${stripeSubId ? stripeSubId.slice(0,4) : 'none'}`);
  console.log(`stripe_payment_intent_prefix=${paymentIntentId ? paymentIntentId.slice(0,3) : 'none'}`);
  console.log(`stripe_customer_prefix=${customerId ? customerId.slice(0,4) : 'none'}`);
  console.log(`stripe_metadata_tier_id=${session.metadata?.tierId || session.metadata?.tier_id || 'missing'}`);
  console.log(`stripe_metadata_creator_id=${session.metadata?.creatorId || session.metadata?.creator_id || 'missing'}`);
  console.log(`stripe_metadata_user_id=${session.metadata?.userId || session.metadata?.user_id || 'missing'}`);

  let sub = null;
  if (stripeSubId) {
    console.log('progress=stripe_subscription_fetch_start');
    sub = await stripeGet(`/subscriptions/${encodeURIComponent(stripeSubId)}`);
    console.log('progress=stripe_subscription_fetch_done');
    console.log(`stripe_subscription_status=${sub.status}`);
    console.log(`stripe_subscription_collection_method=${sub.collection_method}`);
    console.log(`stripe_subscription_current_period_end=${sub.current_period_end}`);
  }

  const tierRows = mysqlRows(`SELECT id,name,price_in_cents,billing_interval,is_active,creator_id FROM subscription_tiers WHERE id=${proofTierId} LIMIT 1`);
  console.log(`db_tier_found=${bool(tierRows.length)}`);
  if (tierRows[0]) console.log(`db_tier_row=${redact(JSON.stringify(tierRows[0]))}`);

  const sid = escSql(sessionId);
  const subid = stripeSubId ? escSql(stripeSubId) : '';
  const amountWhere = `(CAST(COALESCE(amount,0) AS CHAR) IN ('3','3.00','300') OR CAST(COALESCE(amount_in_cents,0) AS CHAR)='300' OR CAST(COALESCE(price_in_cents,0) AS CHAR)='300')`;
  const timeWhere = `created_at >= '${escSql(launchedAt)}'`;

  const candidateTables = ['subscriptions','user_subscriptions','creator_subscriptions','subscription_transactions','transactions','payments','creator_balances','orders','purchases','creator_earnings','payouts'];
  for (const t of candidateTables) {
    if (!tableExists(t)) {
      console.log(`${t}_exists=false`);
      continue;
    }
    const cols = columns(t);
    const wheres = [];
    for (const c of cols) {
      if (/stripe.*session/i.test(c)) wheres.push(`\`${c}\`='${sid}'`);
      if (stripeSubId && /stripe.*subscription/i.test(c)) wheres.push(`\`${c}\`='${subid}'`);
      if (/tier.*id/i.test(c)) wheres.push(`\`${c}\`=${proofTierId}`);
      if (/amount|price|total/i.test(c)) wheres.push(`CAST(\`${c}\` AS CHAR) IN ('3','3.00','300')`);
    }
    if (cols.includes('created_at')) wheres.push(timeWhere);
    if (cols.includes('createdAt')) wheres.push(`createdAt >= '${escSql(launchedAt)}'`);
    const where = wheres.length ? `(${wheres.join(' OR ')})` : '';
    const ds = selectRecent(t, where, 10);
    printDataset(t, ds);
  }

  console.log('progress=process_health_start');
  const pm2 = spawnSync('pm2', ['jlist'], { encoding: 'utf8', timeout: 10000 });
  if (pm2.status === 0) {
    try {
      const apps = JSON.parse(pm2.stdout);
      const summary = apps.map(a => ({ name: a.name, status: a.pm2_env?.status, restarts: a.pm2_env?.restart_time, uptime: a.pm2_env?.pm_uptime })).slice(0, 8);
      console.log(`pm2_summary=${redact(JSON.stringify(summary))}`);
    } catch { console.log(`pm2_summary_parse_error=${redact(pm2.stdout.slice(0,300))}`); }
  } else {
    console.log(`pm2_status_error=${redact(pm2.stderr || pm2.stdout)}`);
  }
  console.log('progress=route_health_start');
  for (const url of ['http://127.0.0.1:80/subscribe/37','http://127.0.0.1:80/subscription-success','http://127.0.0.1:3000/subscribe/37','http://127.0.0.1:3000/subscription-success']) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
      console.log(`route_status_${url.replace(/[^0-9A-Za-z]+/g,'_')}=${res.status}`);
    } catch (e) {
      console.log(`route_error_${url.replace(/[^0-9A-Za-z]+/g,'_')}=${redact(e.message)}`);
    }
  }

  const proofSubStatus = mysqlRows(`SELECT SUM(status='active'), SUM(status='canceled'), COUNT(*) FROM subscriptions WHERE tier_id=${proofTierId} AND fan_id=1 AND creator_id=15`)[0] || [];
  const proofTxStatus = mysqlRows(`SELECT COUNT(*), COALESCE(SUM(amount_in_cents),0), COALESCE(SUM(creator_share_in_cents),0), COALESCE(SUM(platform_share_in_cents),0) FROM transactions WHERE subscription_id IN (SELECT id FROM subscriptions WHERE tier_id=${proofTierId} AND fan_id=1 AND creator_id=15) AND status='completed'`)[0] || [];
  const proofBalanceStatus = mysqlRows(`SELECT COUNT(*), COALESCE(MAX(available_balance_in_cents),0), COALESCE(MAX(lifetime_earnings_in_cents),0) FROM creator_balances WHERE creator_id=15`)[0] || [];
  const stripePaid = session.livemode === true && session.status === 'complete' && session.payment_status === 'paid' && Number(amountTotal) === 300;
  console.log(`proof_stripe_live_paid_300=${bool(stripePaid)}`);
  console.log(`proof_subscription_id_present=${bool(stripeSubId)}`);
  console.log(`proof_active_subscription_rows=${proofSubStatus[0] || '0'}`);
  console.log(`proof_canceled_duplicate_subscription_rows=${proofSubStatus[1] || '0'}`);
  console.log(`proof_total_subscription_rows=${proofSubStatus[2] || '0'}`);
  console.log(`proof_completed_transaction_count=${proofTxStatus[0] || '0'}`);
  console.log(`proof_completed_transaction_amount_cents=${proofTxStatus[1] || '0'}`);
  console.log(`proof_completed_transaction_creator_share_cents=${proofTxStatus[2] || '0'}`);
  console.log(`proof_completed_transaction_platform_share_cents=${proofTxStatus[3] || '0'}`);
  console.log(`proof_creator_balance_rows=${proofBalanceStatus[0] || '0'}`);
  console.log(`proof_creator_available_balance_cents=${proofBalanceStatus[1] || '0'}`);
  console.log(`proof_creator_lifetime_earnings_cents=${proofBalanceStatus[2] || '0'}`);
  console.log('verify-3usd-payment-end');
} catch (err) {
  fail(err?.message || err);
}
