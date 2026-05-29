import dotenv from "dotenv";
dotenv.config({ path: "/root/creatorvault/.env" });
import mysql from "mysql2/promise";

async function main() {
  const { appRouter } = await import("./server/routers");
  const now = Date.now();
  const sourceMediaUrl = "https://creatorvault.live/uploads/ppv_1778107488797/thumbnail.jpg";
  const user = { id: 6, openId: "prod-vaultx-verification", name: "Cameron White", email: "c_white_24@hotmail.com", role: "king", createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() } as any;
  const caller = appRouter.createCaller({ req: {} as any, res: {} as any, user });
  const modes = ["FAST", "BOOST", "FULL"] as const;
  const packages:any[] = [];
  async function sleep(ms:number){ return new Promise(r => setTimeout(r, ms)); }
  for (const mode of modes) {
    const created = await caller.vaultx.createRevenuePackage({
      title: `VaultX Production Grade ${mode} ${now}`,
      contentType: "photo",
      adultContentFlag: true,
      consentConfirmed: true,
      teaserDescription: `CreatorVault verified adult creator package for ${mode}: premium teaser, tracked checkout unlock, direct Telegram route, follow-up proof, VIP upsell control, and revenue attribution in one live VaultX package.`,
      priceCents: mode === "FAST" ? 1900 : mode === "BOOST" ? 2900 : 4900,
      vipPriceCents: mode === "FAST" ? 6900 : mode === "BOOST" ? 9900 : 14900,
      telegramMode: mode,
      sourceMediaUrl,
    });
    const generated = await caller.vaultx.generatePackageAsset({ packageId: created.packageId, sourceMediaUrl, resolution: "720p", length: "5", mode: "std" });
    let status:any = null;
    for (let i = 0; i < 36; i++) {
      status = await caller.vaultx.getPackageAssetStatus({ packageId: created.packageId, jobId: generated.jobId });
      if (status?.videoUrl || ["succeed", "failed"].includes(String(status?.status))) break;
      await sleep(10000);
    }
    const checkout = await caller.vaultx.attachPackageCheckout({ packageId: created.packageId });
    let telegram:any = null;
    let telegramError:string|null = null;
    try { telegram = await caller.vaultx.publishPackageTelegramRoute({ packageId: created.packageId }); }
    catch (e:any) { telegramError = e?.message || String(e); }
    packages.push({ mode, created, generated, status, checkout, telegram, telegramError });
  }
  const conn = await mysql.createConnection(process.env.DATABASE_URL!);
  const ids = packages.map(p => p.created.packageId);
  const [rows] = await conn.execute(
    `SELECT id,title,telegram_mode,status,asset_status,asset_url,pollo_job_id,checkout_url,stripe_checkout_session_id,telegram_campaign_id,telegram_tracking_code,asset_quality_passed FROM vaultx_revenue_packages WHERE id IN (${ids.map(()=>"?").join(",")}) ORDER BY id`, ids);
  const trackingCodes = (rows as any[]).map(r => r.telegram_tracking_code).filter(Boolean);
  let drops:any[] = [];
  if (trackingCodes.length) {
    const [dropRows] = await conn.execute(
      `SELECT id,content_id,campaign_mode,status,tracking_code,has_cta,cta_type,offer_price FROM telegram_drops WHERE tracking_code IN (${trackingCodes.map(()=>"?").join(",")}) ORDER BY id`, trackingCodes);
    drops = dropRows as any[];
  }
  let score:any = null;
  try { score = await caller.challengeAutomation.scoreChallengeOnRealEvents(); } catch(e:any) { score = { error: e?.message || String(e) }; }
  console.log(JSON.stringify({ ok: true, packages, rows, drops, score }, null, 2));
  await conn.end();
}
main().catch((error) => { console.error(JSON.stringify({ ok: false, error: error?.message || String(error), stack: error?.stack }, null, 2)); process.exit(1); });
