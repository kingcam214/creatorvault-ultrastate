require('dotenv').config({ path: '/root/creatorvault/.env' });
const mysql = require('/root/creatorvault/node_modules/mysql2/promise');

async function main() {
  const conn = await mysql.createConnection(process.env.DATABASE_URL);
  const q = async (sql, params = []) => {
    const [rows] = await conn.query(sql, params);
    return rows;
  };
  const tables = await q(`SELECT table_name FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name IN ('users','vaultx_creators','vaultx_revenue_packages','pollo_generations','telegram_drops','vaultx_content','ai_drop_campaigns','empire_challenge_transactions','empire_challenges') ORDER BY table_name`);
  const users = await q(`SELECT id, openId, name, email, role, creatorStatus, contentType FROM users ORDER BY FIELD(role,'king','admin','creator','influencer','celebrity','user'), id LIMIT 20`);
  const creators = await q(`SELECT * FROM vaultx_creators ORDER BY id LIMIT 20`).catch(e => ({ error: e.message }));
  const packages = await q(`SELECT id, creator_id, user_id, title, telegram_mode, status, source_media_url, asset_status, asset_url, checkout_url IS NOT NULL AS has_checkout, stripe_checkout_session_id, telegram_campaign_id, telegram_tracking_code, created_at FROM vaultx_revenue_packages ORDER BY id DESC LIMIT 20`).catch(e => ({ error: e.message }));
  const pollo = await q(`SELECT id, userId, taskId, imageUrl, status, videoUrl, updatedAt FROM pollo_generations WHERE videoUrl IS NOT NULL AND videoUrl <> '' ORDER BY updatedAt DESC, id DESC LIMIT 20`).catch(e => ({ error: e.message }));
  const drops = await q(`SELECT id, creator_id, message_id, channel_id, content_type, has_cta, cta_type, offer_price, created_at FROM telegram_drops ORDER BY created_at DESC LIMIT 10`).catch(e => ({ error: e.message }));
  const challenge = await q(`SELECT id, week_number, status, target_revenue FROM empire_challenges ORDER BY id DESC LIMIT 5`).catch(e => ({ error: e.message }));
  console.log(JSON.stringify({ tables, users, creators, packages, pollo, drops, challenge }, null, 2));
  await conn.end();
}
main().catch(err => { console.error(err); process.exit(1); });
