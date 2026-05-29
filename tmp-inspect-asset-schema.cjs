require("dotenv").config({ path: "/root/creatorvault/.env" });
const mysql = require("mysql2/promise");
(async()=>{
 const conn=await mysql.createConnection(process.env.DATABASE_URL);
 const [cols]=await conn.query("SELECT column_name,column_type,is_nullable,column_default FROM information_schema.columns WHERE table_schema=DATABASE() AND table_name=telegram_campaign_assets ORDER BY ordinal_position");
 const [failed]=await conn.query("SELECT id,title,telegram_mode,status,asset_status,asset_url IS NOT NULL has_asset,checkout_url IS NOT NULL has_checkout,telegram_campaign_id,telegram_tracking_code,created_at FROM vaultx_revenue_packages WHERE title LIKE VaultX Live E2E % ORDER BY id DESC LIMIT 10");
 const [campaigns]=await conn.query("SELECT id,campaign_mode,status,tracking_code,price_cents,created_at FROM telegram_campaigns ORDER BY id DESC LIMIT 10");
 console.log(JSON.stringify({assetColumns:cols, failedPackages:failed, recentCampaigns:campaigns}, null, 2));
 await conn.end();
})().catch(e=>{console.error(e); process.exit(1)});
