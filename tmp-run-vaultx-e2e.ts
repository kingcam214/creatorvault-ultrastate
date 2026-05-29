import 'dotenv/config';
import mysql from 'mysql2/promise';
import { appRouter } from './server/routers';

type Mode = 'FAST' | 'BOOST' | 'FULL';

const modes: Mode[] = ['FAST', 'BOOST', 'FULL'];
const runStamp = new Date().toISOString().replace(/[:.]/g, '-');

function safeRow(row: any) {
  if (!row) return null;
  return {
    id: row.id,
    creator_id: row.creator_id,
    user_id: row.user_id,
    title: row.title,
    telegram_mode: row.telegram_mode,
    status: row.status,
    source_media_url: row.source_media_url,
    asset_status: row.asset_status,
    asset_url: row.asset_url,
    pollo_job_id: row.pollo_job_id,
    asset_quality_passed: Number(row.asset_quality_passed || 0),
    checkout_url_present: Boolean(row.checkout_url),
    stripe_checkout_session_id: row.stripe_checkout_session_id,
    telegram_campaign_id: row.telegram_campaign_id,
    telegram_tracking_code: row.telegram_tracking_code,
    vaultx_content_id: row.vaultx_content_id,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

async function main() {
  const conn = await mysql.createConnection(process.env.DATABASE_URL!);
  const q = async (sql: string, params: any[] = []) => {
    const [rows] = await conn.query(sql, params);
    return rows as any[];
  };

  const [user] = await q(`SELECT * FROM users WHERE id = 6 LIMIT 1`);
  if (!user) throw new Error('Required production creator/owner user id=6 was not found.');

  const [asset] = await q(`SELECT imageUrl, videoUrl, taskId FROM pollo_generations WHERE imageUrl IS NOT NULL AND imageUrl <> '' AND videoUrl IS NOT NULL AND videoUrl <> '' AND LOWER(status) IN ('succeed','success','succeeded') ORDER BY updatedAt DESC, id DESC LIMIT 1`);
  if (!asset?.imageUrl) throw new Error('No successful real Pollo source asset is available for controlled VaultX verification.');

  const caller = appRouter.createCaller({ req: {} as any, res: {} as any, user } as any);
  const beforeScore = await caller.challengeAutomation.scoreChallengeOnRealEvents();

  const results: any[] = [];
  for (const mode of modes) {
    const priceCents = mode === 'FAST' ? 2900 : mode === 'BOOST' ? 4900 : 9900;
    const vipPriceCents = mode === 'FULL' ? 19900 : mode === 'BOOST' ? 9900 : 6900;
    const title = `VaultX Live E2E ${mode} ${runStamp}`;
    const teaserDescription = `${mode} controlled production verification using a real CreatorVault source asset, consented adult-creator intake, paid unlock mechanics, tracked Telegram routing, and VIP follow-up logic.`;

    const created = await caller.vaultx.createRevenuePackage({
      title,
      contentType: 'photo',
      adultContentFlag: true,
      consentConfirmed: true,
      teaserDescription,
      priceCents,
      vipPriceCents,
      telegramMode: mode,
      sourceMediaUrl: asset.imageUrl,
    });

    const packageId = Number(created.packageId);
    const generated = await caller.vaultx.generatePackageAsset({
      packageId,
      sourceMediaUrl: asset.imageUrl,
      resolution: '720p',
      length: mode === 'FULL' ? '8' : mode === 'BOOST' ? '6' : '5',
      mode: 'std',
    });

    const assetStatus = await caller.vaultx.getPackageAssetStatus({ packageId, jobId: generated.jobId });
    const checkout = await caller.vaultx.attachPackageCheckout({ packageId });
    const published = await caller.vaultx.publishPackageTelegramRoute({ packageId });
    const [row] = await q(`SELECT * FROM vaultx_revenue_packages WHERE id = ? LIMIT 1`, [packageId]);
    const [campaign] = row?.telegram_campaign_id
      ? await q(`SELECT id, campaign_mode, status, tracking_code, telegram_message_id, price_cents, distribution_job_id FROM telegram_campaigns WHERE id = ? LIMIT 1`, [row.telegram_campaign_id])
      : [null];
    const campaignAssets = row?.telegram_campaign_id
      ? await q(`SELECT asset_type, asset_url, is_primary FROM telegram_campaign_assets WHERE campaign_id = ? ORDER BY id`, [row.telegram_campaign_id])
      : [];

    const rowSafe = safeRow(row);
    const proof = {
      mode,
      packageId,
      created,
      generated,
      assetStatus,
      checkout: { success: checkout.success, checkoutSessionId: checkout.checkoutSessionId, checkoutUrlPresent: Boolean(checkout.checkoutUrl) },
      published,
      packageRow: rowSafe,
      campaign,
      campaignAssets,
      checks: {
        hasRealSource: Boolean(rowSafe?.source_media_url),
        hasGeneratedAsset: rowSafe?.asset_status === 'succeed' && Boolean(rowSafe?.asset_url),
        hasCheckout: Boolean(rowSafe?.checkout_url_present && rowSafe?.stripe_checkout_session_id),
        hasTelegramRoute: Boolean(rowSafe?.telegram_campaign_id || rowSafe?.telegram_tracking_code),
        routePublished: rowSafe?.status === 'telegram_published' && campaign?.status === 'sent',
        hasModeSpecificAssets: campaignAssets.length >= (mode === 'FAST' ? 1 : mode === 'BOOST' ? 2 : 3),
      },
    };
    results.push(proof);
  }

  const afterScore = await caller.challengeAutomation.scoreChallengeOnRealEvents();
  const recentRows = await q(`SELECT id, title, telegram_mode, status, asset_status, asset_url IS NOT NULL AS has_asset_url, checkout_url IS NOT NULL AS has_checkout_url, stripe_checkout_session_id, telegram_campaign_id, telegram_tracking_code, created_at FROM vaultx_revenue_packages WHERE title LIKE ? ORDER BY id`, [`VaultX Live E2E % ${runStamp}`]);

  const allPassed = results.every(r => Object.values(r.checks).every(Boolean));
  const output = {
    runStamp,
    sourceAsset: asset,
    allPassed,
    beforeScore,
    afterScore,
    scoreDelta: {
      realAssets: Number(afterScore.realAssets || 0) - Number(beforeScore.realAssets || 0),
      realRoutes: Number(afterScore.realRoutes || 0) - Number(beforeScore.realRoutes || 0),
      packageCount: Number(afterScore.packageStats?.package_count || 0) - Number(beforeScore.packageStats?.package_count || 0),
      telegramRouteCount: Number(afterScore.packageStats?.telegram_route_count || 0) - Number(beforeScore.packageStats?.telegram_route_count || 0),
      checkoutRouteCount: Number(afterScore.packageStats?.checkout_route_count || 0) - Number(beforeScore.packageStats?.checkout_route_count || 0),
      publishedRouteCount: Number(afterScore.packageStats?.published_route_count || 0) - Number(beforeScore.packageStats?.published_route_count || 0),
    },
    results,
    recentRows,
  };

  console.log(JSON.stringify(output, null, 2));
  await conn.end();
  if (!allPassed) process.exitCode = 2;
}

main().catch(err => {
  console.error(JSON.stringify({ fatal: true, message: err?.message, stack: err?.stack }, null, 2));
  process.exit(1);
});
