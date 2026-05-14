import { spawnSync } from 'node:child_process';
function mysql(sql) {
  const u = new URL(process.env.DATABASE_URL);
  const args = ['--protocol=TCP','-h',u.hostname,'-P',u.port || '3306','-u',decodeURIComponent(u.username),`--password=${decodeURIComponent(u.password)}`,decodeURIComponent(u.pathname.replace(/^\//, '')),'-N','-B','-e',sql];
  const r = spawnSync('mysql', args, { encoding: 'utf8', timeout: 15000 });
  if (r.status !== 0) {
    console.error(r.stderr || r.stdout);
    process.exit(1);
  }
  return r.stdout.trim();
}
console.log('disable-proof-tier-script-start');
console.log('before_tier=' + mysql("SELECT id,name,price_in_cents,billing_interval,is_active,creator_id,updated_at FROM subscription_tiers WHERE id=37"));
mysql("UPDATE subscription_tiers SET is_active=0, updated_at=NOW() WHERE id=37 AND name='Proof Tier - USD 3' AND price_in_cents=300 AND creator_id=15");
console.log('after_tier=' + mysql("SELECT id,name,price_in_cents,billing_interval,is_active,creator_id,updated_at FROM subscription_tiers WHERE id=37"));
console.log('active_subscription_rows=' + mysql("SELECT COUNT(*) FROM subscriptions WHERE tier_id=37 AND status='active'"));
console.log('canceled_duplicate_rows=' + mysql("SELECT COUNT(*) FROM subscriptions WHERE tier_id=37 AND status='canceled'"));
console.log('completed_transaction_rows=' + mysql("SELECT COUNT(*) FROM transactions WHERE subscription_id IN (SELECT id FROM subscriptions WHERE tier_id=37) AND status='completed' AND amount_in_cents=300"));
console.log('creator_balance_15=' + mysql("SELECT id,creator_id,available_balance_in_cents,pending_balance_in_cents,lifetime_earnings_in_cents FROM creator_balances WHERE creator_id=15"));
console.log('disable-proof-tier-script-end');
