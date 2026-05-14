import mysql from 'mysql2/promise';

function scrub(value) {
  if (typeof value !== 'string') return value;
  return value
    .replace(/([A-Za-z0-9._%+-]+)@([A-Za-z0-9.-]+\.[A-Za-z]{2,})/g, 'REDACTED_EMAIL')
    .replace(/sk_live_[A-Za-z0-9_]+/g, 'STRIPE_SECRET_REDACTED')
    .replace(/whsec_[A-Za-z0-9_]+/g, 'STRIPE_WEBHOOK_REDACTED');
}

function scrubRow(row) {
  const out = {};
  for (const [k, v] of Object.entries(row)) {
    if (/password|token|secret|key/i.test(k)) out[k] = 'REDACTED';
    else out[k] = scrub(v);
  }
  return out;
}

function parseDbUrl(url) {
  if (!url) throw new Error('DATABASE_URL missing');
  const u = new URL(url);
  return {
    host: u.hostname,
    port: Number(u.port || 3306),
    user: decodeURIComponent(u.username),
    password: decodeURIComponent(u.password),
    database: u.pathname.replace(/^\//, ''),
  };
}

const url = process.env.DATABASE_URL || process.env.TIDB_DATABASE_URL;
const cfg = parseDbUrl(url);
const conn = await mysql.createConnection(cfg);
try {
  const [tables] = await conn.query("SELECT table_name FROM information_schema.tables WHERE table_schema = DATABASE() AND (table_name LIKE '%tier%' OR table_name LIKE '%subscription%' OR table_name LIKE '%creator%' OR table_name LIKE '%transaction%' OR table_name LIKE '%balance%') ORDER BY table_name");
  console.log('tables=' + tables.map(r => r.TABLE_NAME || r.table_name).join(','));

  for (const table of ['subscription_tiers', 'subscriptions', 'transactions', 'creator_balances', 'users', 'creators']) {
    try {
      const [rows] = await conn.query('SELECT * FROM `' + table + '` LIMIT 10');
      console.log('TABLE ' + table + ' rows=' + rows.length);
      console.log(JSON.stringify(rows.map(scrubRow), null, 2));
    } catch (e) {
      console.log('TABLE ' + table + ' error=' + e.message);
    }
  }
} finally {
  await conn.end();
}
