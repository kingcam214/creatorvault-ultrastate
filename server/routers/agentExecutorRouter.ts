import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { sql } from "drizzle-orm";
import Stripe from "stripe";
import { router, protectedProcedure } from "../_core/trpc";
import * as db from "../db";
import { invokeLLM } from "../_core/llm";
import { getBodyCinemaSourceEvidence } from "../services/bodyCinemaEvidenceService";
import {
  getRecentAgentActionReceipts,
  recordAgentActionReceipt,
} from "../services/agentActionReceipts";

const ownerProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== "king" && ctx.user.role !== "admin") {
    throw new TRPCError({ code: "FORBIDDEN", message: "Owner approval is required for agent command control." });
  }
  return next({ ctx });
});

const AGENT_HOLD_REASON = "Agent arsenal rebuild: real source, owner approval, action receipt, and observed result are required before activation.";
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "");

function rowsFromExecute(result: any): any[] {
  if (Array.isArray(result) && Array.isArray(result[0])) return result[0];
  if (Array.isArray(result)) return result;
  return result?.rows ?? [];
}

export const agentExecutorRouter = router({
  getCommandStatus: ownerProcedure.query(async () => {
    const statusRows = rowsFromExecute(await db.db.execute(sql`
      SELECT status, COUNT(*) AS count
      FROM empire_agents
      GROUP BY status
    `));
    const latestReceipts = await getRecentAgentActionReceipts({ limit: 12 });
    const activeCount = Number(statusRows.find((row: any) => row.status === "active")?.count ?? 0);
    const heldCount = Number(statusRows.find((row: any) => row.status === "inactive")?.count ?? 0);

    return {
      autonomousExecutionEnabled: process.env.VAULTX_CHALLENGE_AGENTS_AUTORUN === "true",
      activeCount,
      heldCount,
      statuses: statusRows.map((row: any) => ({ status: String(row.status), count: Number(row.count ?? 0) })),
      activationRequirement: AGENT_HOLD_REASON,
      latestReceipts,
    };
  }),

  holdUnprovenRoster: ownerProcedure
    .input(z.object({ reason: z.string().trim().min(3).max(500).optional() }).optional())
    .mutation(async ({ input, ctx }) => {
      const reason = input?.reason || AGENT_HOLD_REASON;
      const result = await db.db.execute(sql`
        UPDATE empire_agents
        SET status = 'inactive', paused_until = NULL
        WHERE status = 'active'
      `);
      const affectedRows = Number((result as any)?.[0]?.affectedRows ?? (result as any)?.affectedRows ?? 0);
      const receiptId = await recordAgentActionReceipt({
        agentSlug: "agent-command-authority",
        agentName: "Agent Command Authority",
        agentCategory: "infra",
        taskType: "roster_truth_hold",
        action: "held_unproven_legacy_agents",
        status: "success",
        outcomeSummary: `Held ${affectedRows} unproven active agent records. ${reason}`,
        evidence: {
          requestedByUserId: ctx.user.id,
          previousState: "active",
          newState: "inactive",
          reason,
        },
        artifacts: { table: "empire_agents" },
      });

      return { heldCount: affectedRows, receiptId, reason };
    }),

  runStripeRevenueTruth: ownerProcedure
    .input(z.object({ chargeLimit: z.number().int().min(1).max(100).default(100) }).optional())
    .mutation(async ({ input, ctx }) => {
      const chargeLimit = input?.chargeLimit ?? 100;
      const startedAt = new Date();
      const [charges, subscriptions, balance] = await Promise.all([
        stripe.charges.list({ limit: chargeLimit }),
        stripe.subscriptions.list({ limit: 100 }),
        stripe.balance.retrieve(),
      ]);
      const succeeded = charges.data.filter(charge => charge.status === "succeeded");
      const recentSucceededChargeTotalCents = succeeded.reduce((sum, charge) => sum + charge.amount, 0);
      const activeSubscriptions = subscriptions.data.filter(subscription => subscription.status === "active");
      const activeSubscriptionMrrCents = activeSubscriptions.reduce(
        (sum, subscription) => sum + (subscription.items.data[0]?.price?.unit_amount ?? 0),
        0,
      );
      const availableBalanceCents = balance.available.find(entry => entry.currency === "usd")?.amount ?? 0;
      const newestCharge = succeeded.sort((a, b) => b.created - a.created)[0] ?? null;
      const snapshot = {
        source: "stripe",
        chargeWindow: `Most recent ${chargeLimit} charges available from Stripe`,
        succeededChargeCount: succeeded.length,
        recentSucceededChargeTotalCents,
        activeSubscriptionCount: activeSubscriptions.length,
        activeSubscriptionMrrCents,
        availableBalanceCents,
        newestSucceededChargeAt: newestCharge ? new Date(newestCharge.created * 1000).toISOString() : null,
        currency: "usd",
      };
      const receiptId = await recordAgentActionReceipt({
        agentSlug: "stripe-revenue-agent",
        agentName: "Stripe Revenue Agent",
        agentCategory: "analytics",
        taskType: "live_revenue_snapshot",
        action: "read_live_stripe_financial_snapshot",
        status: "success",
        outcomeSummary: `Read live Stripe: ${succeeded.length} succeeded charges in the returned window, ${activeSubscriptions.length} active subscriptions, and $${(availableBalanceCents / 100).toFixed(2)} available USD balance.`,
        evidence: { requestedByUserId: ctx.user.id, ...snapshot },
        artifacts: { provider: "stripe", sourceRecord: newestCharge ? { chargeId: newestCharge.id } : null },
        revenueGenerated: 0,
        startedAt,
        finishedAt: new Date(),
      });
      await db.db.execute(sql`UPDATE empire_agents SET status = 'active', paused_until = NULL WHERE slug = 'stripe-revenue-agent'`);
      return { snapshot, receiptId, activated: true, autonomousExecutionEnabled: false };
    }),

  runDevGuardianTruth: ownerProcedure
    .mutation(async ({ ctx }) => {
      const startedAt = new Date();
      const releaseUrl = "https://creatorvault.live/__release";
      const response = await fetch(releaseUrl, {
        headers: { "Cache-Control": "no-cache" },
        signal: AbortSignal.timeout(15_000),
      });
      const checkedAt = new Date();
      if (!response.ok) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `CreatorVault public release check failed with HTTP ${response.status}.`,
        });
      }
      const release = await response.json() as Record<string, unknown>;
      const gitSha = typeof release.gitSha === "string" ? release.gitSha : null;
      const deployedAt = typeof release.deployedAt === "string" ? release.deployedAt : null;
      const snapshot = {
        source: releaseUrl,
        httpStatus: response.status,
        latencyMs: checkedAt.getTime() - startedAt.getTime(),
        gitSha,
        deployedAt,
        app: typeof release.app === "string" ? release.app : null,
        environment: typeof release.environment === "string" ? release.environment : null,
        governedMediaExecutionEnabled: release.governedMediaExecutionEnabled === true,
        socialOutboundAutomationEnabled:
          Boolean((release.socialEmpire as Record<string, unknown> | undefined)?.outboundAutomationEnabled),
      };
      const receiptId = await recordAgentActionReceipt({
        agentSlug: "dev-guardian-agent",
        agentName: "Dev Guardian Agent",
        agentCategory: "infra",
        taskType: "public_release_probe",
        action: "read_public_release_metadata",
        status: "success",
        outcomeSummary: `Checked public CreatorVault release ${gitSha ?? "without a reported git SHA"} in ${snapshot.latencyMs}ms.`,
        evidence: { requestedByUserId: ctx.user.id, ...snapshot },
        artifacts: { release },
        revenueGenerated: 0,
        startedAt,
        finishedAt: new Date(),
      });
      await db.db.execute(sql`UPDATE empire_agents SET status = 'active', paused_until = NULL WHERE slug = 'dev-guardian-agent'`);
      return { snapshot, receiptId, activated: true, autonomousExecutionEnabled: false };
    }),

  runVaultxRevenueIntelligenceTruth: ownerProcedure
    .mutation(async ({ ctx }) => {
      const startedAt = new Date();
      const safeRows = async (query: any): Promise<any[]> => {
        try {
          return rowsFromExecute(await db.db.execute(query));
        } catch {
          return [];
        }
      };
      const creatorRows = await safeRows(sql`SELECT id FROM vaultx_creators WHERE user_id = ${ctx.user.id} LIMIT 1`);
      const creatorId = creatorRows[0]?.id ? Number(creatorRows[0].id) : null;
      const [packageRows, contentRows, unlockRows, earningsRows] = await Promise.all([
        safeRows(sql`
          SELECT status, asset_status, asset_quality_passed, COUNT(*) AS count
          FROM vaultx_revenue_packages
          WHERE user_id = ${ctx.user.id}
          GROUP BY status, asset_status, asset_quality_passed
        `),
        creatorId ? safeRows(sql`
          SELECT status, is_ppv, COUNT(*) AS count, COALESCE(SUM(purchase_count), 0) AS recordedPurchaseCount, COALESCE(SUM(view_count), 0) AS recordedViewCount
          FROM vaultx_content
          WHERE creator_id = ${creatorId}
          GROUP BY status, is_ppv
        `) : Promise.resolve([]),
        creatorId ? safeRows(sql`
          SELECT COUNT(*) AS completedUnlocks, COALESCE(SUM(amount_paid), 0) AS recordedCompletedUnlockAmount
          FROM vaultx_ppv_purchases
          WHERE creator_id = ${creatorId} AND status = 'completed'
        `) : Promise.resolve([]),
        safeRows(sql`
          SELECT status, COUNT(*) AS count, COALESCE(SUM(amount), 0) AS recordedAmount
          FROM creator_earnings
          WHERE creator_id = ${creatorId ?? -1}
          GROUP BY status
        `),
      ]);
      const unlocks = unlockRows[0] || {};
      const snapshot = {
        source: "creatorvault_vaultx_revenue",
        creatorLinked: Boolean(creatorId),
        creatorId,
        packages: packageRows.map((row: any) => ({
          status: row.status ? String(row.status) : null,
          assetStatus: row.asset_status ? String(row.asset_status) : null,
          qualityPassed: Boolean(row.asset_quality_passed),
          count: Number(row.count ?? 0),
        })),
        publishedContent: contentRows.map((row: any) => ({
          status: row.status ? String(row.status) : null,
          isPpv: Boolean(row.is_ppv),
          count: Number(row.count ?? 0),
          recordedPurchaseCount: Number(row.recordedPurchaseCount ?? 0),
          recordedViewCount: Number(row.recordedViewCount ?? 0),
        })),
        completedUnlocks: {
          count: Number(unlocks.completedUnlocks ?? 0),
          recordedAmount: Number(unlocks.recordedCompletedUnlockAmount ?? 0),
          creatorShareRate: 0.85,
          platformFeeRate: 0.15,
        },
        recordedCreatorEarnings: earningsRows.map((row: any) => ({
          status: row.status ? String(row.status) : null,
          count: Number(row.count ?? 0),
          recordedAmount: Number(row.recordedAmount ?? 0),
        })),
      };
      const receiptId = await recordAgentActionReceipt({
        agentSlug: "vaultx-revenue-intelligence",
        agentName: "VaultX Revenue Intelligence",
        agentCategory: "vaultx",
        taskType: "vaultx_revenue_truth_snapshot",
        action: "read_package_content_unlock_and_earnings_records",
        status: "success",
        outcomeSummary: `Read VaultX revenue truth: ${snapshot.completedUnlocks.count} completed unlock records and ${snapshot.packages.reduce((sum, item) => sum + item.count, 0)} package records.`,
        evidence: { requestedByUserId: ctx.user.id, ...snapshot },
        artifacts: { snapshot },
        revenueGenerated: 0,
        startedAt,
        finishedAt: new Date(),
      });
      await db.db.execute(sql`UPDATE empire_agents SET status = 'active', paused_until = NULL WHERE slug = 'vaultx-revenue-intelligence'`);
      return { snapshot, receiptId, activated: true, autonomousExecutionEnabled: false };
    }),

  runMediaVaultGuardianTruth: ownerProcedure
    .mutation(async ({ ctx }) => {
      const startedAt = new Date();
      const [assetRows, sourceRows, riskRows] = await Promise.all([
        db.db.execute(sql`
          SELECT asset_type, status, COUNT(*) AS count,
                 COALESCE(SUM(duration), 0) AS totalDurationSeconds
          FROM media_assets
          WHERE user_id = ${ctx.user.id}
          GROUP BY asset_type, status
        `),
        db.db.execute(sql`
          SELECT source_type, created_by_feature, COUNT(*) AS count
          FROM media_assets
          WHERE user_id = ${ctx.user.id}
          GROUP BY source_type, created_by_feature
        `),
        db.db.execute(sql`
          SELECT
            COUNT(*) AS totalAssets,
            COALESCE(SUM(CASE WHEN status = 'ready' THEN 1 ELSE 0 END), 0) AS readyAssets,
            COALESCE(SUM(CASE WHEN status = 'ready' AND (public_url IS NULL OR public_url NOT LIKE '%/api/media/asset/%') THEN 1 ELSE 0 END), 0) AS readySourceCandidates,
            COALESCE(SUM(CASE WHEN public_url IS NULL AND storage_path IS NULL THEN 1 ELSE 0 END), 0) AS missingDeliveryPath,
            COALESCE(SUM(CASE WHEN public_url LIKE '%/api/media/asset/%' THEN 1 ELSE 0 END), 0) AS legacyPrivateDelivery,
            COALESCE(SUM(CASE WHEN public_url LIKE 'https://replicate.delivery/%' THEN 1 ELSE 0 END), 0) AS expiringReplicateLinks
          FROM media_assets
          WHERE user_id = ${ctx.user.id}
        `),
      ]);
      const risk = rowsFromExecute(riskRows)[0] || {};
      const snapshot = {
        source: "creatorvault_media_vault",
        assets: rowsFromExecute(assetRows).map((row: any) => ({
          type: row.asset_type ? String(row.asset_type) : "unknown",
          status: row.status ? String(row.status) : "unknown",
          count: Number(row.count ?? 0),
          totalDurationSeconds: Number(row.totalDurationSeconds ?? 0),
        })),
        sourceMix: rowsFromExecute(sourceRows).map((row: any) => ({
          sourceType: row.source_type ? String(row.source_type) : null,
          createdBy: row.created_by_feature ? String(row.created_by_feature) : null,
          count: Number(row.count ?? 0),
        })),
        readiness: {
          totalAssets: Number(risk.totalAssets ?? 0),
          readyAssets: Number(risk.readyAssets ?? 0),
          readySourceCandidates: Number(risk.readySourceCandidates ?? 0),
          missingDeliveryPath: Number(risk.missingDeliveryPath ?? 0),
          legacyPrivateDelivery: Number(risk.legacyPrivateDelivery ?? 0),
          expiringReplicateLinks: Number(risk.expiringReplicateLinks ?? 0),
        },
      };
      const receiptId = await recordAgentActionReceipt({
        agentSlug: "media-vault-guardian",
        agentName: "Media Vault Guardian",
        agentCategory: "media",
        taskType: "media_vault_truth_snapshot",
        action: "read_asset_readiness_storage_and_link_risk",
        status: "success",
        outcomeSummary: `Read Media Vault truth: ${snapshot.readiness.readySourceCandidates} ready source candidates out of ${snapshot.readiness.totalAssets} total assets, with ${snapshot.readiness.expiringReplicateLinks} expiring provider links flagged.`,
        evidence: { requestedByUserId: ctx.user.id, ...snapshot },
        artifacts: { snapshot },
        revenueGenerated: 0,
        startedAt,
        finishedAt: new Date(),
      });
      await db.db.execute(sql`UPDATE empire_agents SET status = 'active', paused_until = NULL WHERE slug = 'media-vault-guardian'`);
      return { snapshot, receiptId, activated: true, autonomousExecutionEnabled: false };
    }),

  runCloneIdentityGuardianTruth: ownerProcedure
    .mutation(async ({ ctx }) => {
      const startedAt = new Date();
      const safeRows = async (query: any): Promise<any[]> => {
        try {
          return rowsFromExecute(await db.db.execute(query));
        } catch {
          return [];
        }
      };
      const [profileRows, libraryRows, legacyRows, renderRows, trainingRows] = await Promise.all([
        safeRows(sql`
          SELECT id, voice_id, speaking_style, tone_guidelines, signature_intro, signature_outro, updated_at
          FROM kingcam_clone_profile
          ORDER BY id ASC LIMIT 1
        `),
        safeRows(sql`
          SELECT COUNT(*) AS libraryReadyCloneVideos, COALESCE(SUM(duration), 0) AS libraryReadyCloneDurationSeconds
          FROM media_assets
          WHERE user_id = ${ctx.user.id}
            AND status = 'ready'
            AND (asset_type = 'video' OR mime_type LIKE 'video/%')
            AND (CONCAT(COALESCE(original_name, ''), ' ', COALESCE(file_name, '')) REGEXP 'kingcam|clone')
            AND public_url IS NOT NULL
            AND public_url <> ''
            AND public_url NOT LIKE 'https://replicate.delivery/%'
        `),
        safeRows(sql`
          SELECT COUNT(*) AS legacyReadyRecords
          FROM kingcam_clone_videos
          WHERE render_status = 'ready'
            AND video_url IS NOT NULL
            AND video_url <> ''
            AND video_url NOT LIKE 'https://replicate.delivery/%'
        `),
        safeRows(sql`
          SELECT render_status, render_provider, COUNT(*) AS count
          FROM kingcam_clone_videos
          GROUP BY render_status, render_provider
        `),
        safeRows(sql`
          SELECT status, COUNT(*) AS count, MAX(created_at) AS latestRecordedAt
          FROM clone_training_jobs
          GROUP BY status
        `),
      ]);
      const profile = profileRows[0] || null;
      const library = libraryRows[0] || {};
      const legacy = legacyRows[0] || {};
      const snapshot = {
        source: "creatorvault_clone_factory",
        profile: profile ? {
          configured: Boolean(profile.voice_id || profile.speaking_style || profile.tone_guidelines),
          hasVoiceReference: Boolean(profile.voice_id),
          hasSpeakingDirection: Boolean(profile.speaking_style || profile.tone_guidelines),
          hasSignatureLanguage: Boolean(profile.signature_intro || profile.signature_outro),
          lastUpdatedAt: profile.updated_at || null,
        } : {
          configured: false,
          hasVoiceReference: false,
          hasSpeakingDirection: false,
          hasSignatureLanguage: false,
          lastUpdatedAt: null,
        },
        media: {
          libraryReadyCloneVideos: Number(library.libraryReadyCloneVideos ?? 0),
          libraryReadyCloneDurationSeconds: Number(library.libraryReadyCloneDurationSeconds ?? 0),
          legacyReadyRecordsNotPlaybackVerified: Number(legacy.legacyReadyRecords ?? 0),
          renderStates: renderRows.map((row: any) => ({
            status: String(row.render_status), provider: row.render_provider ? String(row.render_provider) : null, count: Number(row.count ?? 0),
          })),
        },
        training: trainingRows.map((row: any) => ({
          status: String(row.status), count: Number(row.count ?? 0), latestRecordedAt: row.latestRecordedAt || null,
        })),
      };
      const receiptId = await recordAgentActionReceipt({
        agentSlug: "clone-identity-guardian",
        agentName: "Clone Identity Guardian",
        agentCategory: "clone",
        taskType: "clone_identity_truth_snapshot",
        action: "read_clone_profile_library_candidates_and_legacy_records",
        status: "success",
        outcomeSummary: `Read KingCam Clone truth: ${snapshot.media.libraryReadyCloneVideos} verified Clone Factory library videos, ${snapshot.media.legacyReadyRecordsNotPlaybackVerified} legacy ready records not counted as playback-verified, ${snapshot.training.reduce((sum, item) => sum + item.count, 0)} training records, and ${snapshot.profile.configured ? "a configured identity profile" : "no configured identity profile"}.`,
        evidence: { requestedByUserId: ctx.user.id, ...snapshot },
        artifacts: { snapshot },
        revenueGenerated: 0,
        startedAt,
        finishedAt: new Date(),
      });
      await db.db.execute(sql`UPDATE empire_agents SET status = 'active', paused_until = NULL WHERE slug = 'clone-identity-guardian'`);
      return { snapshot, receiptId, activated: true, autonomousExecutionEnabled: false };
    }),

  runPerformanceIntelligenceTruth: ownerProcedure
    .mutation(async ({ ctx }) => {
      const startedAt = new Date();
      const creatorRows = rowsFromExecute(await db.db.execute(sql`
        SELECT id FROM vaultx_creators WHERE user_id = ${ctx.user.id} LIMIT 1
      `));
      const creatorId = Number(creatorRows[0]?.id ?? ctx.user.id);
      const safeRows = async (query: any): Promise<{ available: boolean; rows: any[] }> => {
        try {
          return { available: true, rows: rowsFromExecute(await db.db.execute(query)) };
        } catch {
          return { available: false, rows: [] };
        }
      };
      const [packageRead, distributionRead, nativePostRead, audienceRead, conversationRead, moneyRead] = await Promise.all([
        safeRows(sql`
          SELECT state, approval_state, COUNT(*) AS count
          FROM social_packages
          WHERE creator_user_id = ${ctx.user.id}
          GROUP BY state, approval_state
        `),
        safeRows(sql`
          SELECT platform, status, approval_state, COUNT(*) AS count, MAX(created_at) AS lastRecordedAt
          FROM distribution_jobs
          WHERE creator_id = ${creatorId}
          GROUP BY platform, status, approval_state
          ORDER BY lastRecordedAt DESC
        `),
        safeRows(sql`
          SELECT status, visibility, access_tier, COUNT(*) AS count
          FROM social_native_posts
          WHERE creator_user_id = ${ctx.user.id}
          GROUP BY status, visibility, access_tier
        `),
        safeRows(sql`
          SELECT
            (SELECT COUNT(*) FROM social_follows WHERE creator_user_id = ${ctx.user.id}) AS followers,
            (SELECT COUNT(*) FROM subscriptions WHERE creator_id = ${creatorId} AND status = 'active') AS activeSubscribers
        `),
        safeRows(sql`
          SELECT COUNT(*) AS conversations
          FROM conversations
          WHERE creator_id = ${creatorId}
        `),
        safeRows(sql`
          SELECT COALESCE(SUM(creator_share_in_cents), 0) AS creatorEarningsCents,
                 COUNT(*) AS paidUnlocks
          FROM transactions
          WHERE creator_id = ${creatorId} AND status = 'completed'
        `),
      ]);
      const audience = audienceRead.rows[0] || {};
      const conversations = conversationRead.rows[0] || {};
      const money = moneyRead.rows[0] || {};
      const snapshot = {
        source: "creatorvault_social_empire",
        creatorId,
        readStates: {
          packages: packageRead.available ? "available" : "unavailable",
          distribution: distributionRead.available ? "available" : "unavailable",
          nativePosts: nativePostRead.available ? "available" : "unavailable",
          audience: audienceRead.available ? "available" : "unavailable",
          conversations: conversationRead.available ? "available" : "unavailable",
          money: moneyRead.available ? "available" : "unavailable",
        },
        packages: packageRead.rows.map((row: any) => ({
          state: String(row.state), approvalState: String(row.approval_state), count: Number(row.count ?? 0),
        })),
        distribution: distributionRead.rows.map((row: any) => ({
          platform: String(row.platform), status: String(row.status), approvalState: String(row.approval_state),
          count: Number(row.count ?? 0), lastRecordedAt: row.lastRecordedAt || null,
        })),
        nativePosts: nativePostRead.rows.map((row: any) => ({
          status: String(row.status), visibility: String(row.visibility), accessTier: String(row.access_tier), count: Number(row.count ?? 0),
        })),
        audience: {
          followers: Number(audience.followers ?? 0),
          activeSubscribers: Number(audience.activeSubscribers ?? 0),
          conversations: conversationRead.available ? Number(conversations.conversations ?? 0) : null,
        },
        money: {
          creatorEarningsCents: Number(money.creatorEarningsCents ?? 0),
          paidUnlocks: Number(money.paidUnlocks ?? 0),
        },
      };
      const receiptId = await recordAgentActionReceipt({
        agentSlug: "performance-intelligence-agent",
        agentName: "Performance Intelligence Agent",
        agentCategory: "analytics",
        taskType: "social_empire_truth_snapshot",
        action: "read_social_distribution_audience_and_money_records",
        status: "success",
        outcomeSummary: `Read Social Empire truth: ${snapshot.packages.reduce((sum, item) => sum + item.count, 0)} packages, ${snapshot.distribution.reduce((sum, item) => sum + item.count, 0)} distribution records, ${snapshot.audience.activeSubscribers} active subscribers, and ${snapshot.money.paidUnlocks} paid unlocks.`,
        evidence: { requestedByUserId: ctx.user.id, ...snapshot },
        artifacts: { snapshot },
        revenueGenerated: 0,
        startedAt,
        finishedAt: new Date(),
      });
      await db.db.execute(sql`UPDATE empire_agents SET status = 'active', paused_until = NULL WHERE slug = 'performance-intelligence-agent'`);
      return { snapshot, receiptId, activated: true, autonomousExecutionEnabled: false };
    }),

  runCreatorGrowthBrief: ownerProcedure
    .input(z.object({
      sourceAssetId: z.string().uuid(),
      evidenceId: z.string().uuid(),
      goal: z.enum(["subscriber_growth", "ppv_offer", "social_tease", "creator_authority"]),
    }))
    .mutation(async ({ input, ctx }) => {
      const startedAt = new Date();
      const ownedAssets = rowsFromExecute(await db.db.execute(sql`
        SELECT id, asset_type, source_type, public_url, storage_path, duration, file_name, original_name
        FROM media_assets
        WHERE id = ${input.sourceAssetId} AND user_id = ${ctx.user.id} AND status = 'ready'
        LIMIT 1
      `));
      const asset = ownedAssets[0];
      if (!asset) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Creator Growth could not find that ready CreatorVault video." });
      }
      if (!String(asset.asset_type || "").toLowerCase().includes("video")) {
        throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Creator Growth needs a ready CreatorVault video." });
      }
      const durableSourceUrl = String(asset.public_url || asset.storage_path || "");
      if (!durableSourceUrl) {
        throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Creator Growth needs a durable CreatorVault video source." });
      }
      const evidence = await getBodyCinemaSourceEvidence(Number(ctx.user.id), input.evidenceId);
      if (!evidence || evidence.analysisStatus !== "verified" || evidence.sourceMediaUrl !== durableSourceUrl) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "Creator Growth needs verified Body Cinema understanding for this exact CreatorVault video.",
        });
      }

      const findings = evidence.editorFindings;
      const selectedDirection = evidence.directions.find(direction => direction.id === evidence.selectedDirectionId) || null;
      const result = await invokeLLM({
        model: "gpt-5-mini",
        maxTokens: 1200,
        outputSchema: {
          name: "creator_growth_brief",
          strict: true,
          schema: {
            type: "object",
            properties: {
              leadLine: { type: "string" },
              shortTitle: { type: "string" },
              caption: { type: "string" },
              storyBeats: { type: "array", items: { type: "string" } },
              callToAction: { type: "string" },
              platformNotes: { type: "array", items: { type: "string" } },
              evidenceMomentsMs: { type: "array", items: { type: "number" } },
            },
            required: ["leadLine", "shortTitle", "caption", "storyBeats", "callToAction", "platformNotes", "evidenceMomentsMs"],
            additionalProperties: false,
          },
        },
        messages: [
          {
            role: "system",
            content: "You are Creator Growth inside CreatorVault. Build a premium, direct content brief from the provided verified video evidence only. Never claim views, sales, subscribers, or activity that is not in the evidence. Never mention technical systems, models, prompts, data, pipelines, tools, or providers. Do not describe nudity or explicit sexual activity. Keep the writing confident, creator-facing, and ready for a luxury adult-creator brand within lawful platform boundaries.",
          },
          {
            role: "user",
            content: JSON.stringify({
              goal: input.goal,
              source: {
                fileName: asset.original_name || asset.file_name || "CreatorVault video",
                durationSeconds: Number(asset.duration || 0) || null,
              },
              verifiedAnalysis: {
                analysisScore: evidence.analysisScore,
                strongestOpeningMs: findings?.strongestHookTimestampMs ?? null,
                strongestThumbnailMs: findings?.strongestThumbnailTimestampMs ?? null,
                strongestMotionMs: findings?.strongestMotionTimestampMs ?? null,
                strongestCommercialMs: findings?.strongestCommercialTimestampMs ?? null,
                weakestSectionStartMs: findings?.weakestSectionStartMs ?? null,
                weakestSectionEndMs: findings?.weakestSectionEndMs ?? null,
                bodyFocus: evidence.bodyMap,
                suggestedDirection: selectedDirection ? {
                  label: selectedDirection.label,
                  confidence: selectedDirection.confidence,
                  evidence: selectedDirection.evidence,
                  distinction: selectedDirection.distinction,
                } : null,
              },
              instruction: "Create the growth brief from these verified moments. Keep evidenceMomentsMs limited to timestamps that appear above.",
            }),
          },
        ],
      });
      const rawBrief = result.choices[0]?.message?.content;
      if (typeof rawBrief !== "string" || !rawBrief.trim()) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Creator Growth did not return a usable brief." });
      }
      let brief: Record<string, unknown>;
      try {
        brief = JSON.parse(rawBrief);
      } catch {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Creator Growth returned an invalid brief." });
      }
      const receiptId = await recordAgentActionReceipt({
        agentSlug: "creator-growth-agent",
        agentName: "Creator Growth Agent",
        agentCategory: "creation",
        taskType: "evidence_backed_growth_brief",
        action: "built_growth_brief_from_verified_creator_media",
        status: "success",
        outcomeSummary: `Built a ${input.goal} brief from verified Body Cinema evidence for one ready CreatorVault video.`,
        evidence: {
          requestedByUserId: ctx.user.id,
          sourceAssetId: input.sourceAssetId,
          evidenceId: input.evidenceId,
          analysisScore: evidence.analysisScore,
          goal: input.goal,
          selectedDirectionId: evidence.selectedDirectionId,
        },
        artifacts: { brief },
        revenueGenerated: 0,
        startedAt,
        finishedAt: new Date(),
      });
      await db.db.execute(sql`UPDATE empire_agents SET status = 'active', paused_until = NULL WHERE slug = 'creator-growth-agent'`);
      return { brief, receiptId, activated: true, autonomousExecutionEnabled: false };
    }),

  getHeldRoster: ownerProcedure
    .input(z.object({ limit: z.number().int().min(1).max(100).default(60) }).optional())
    .query(async ({ input }) => {
      const limit = input?.limit ?? 60;
      const rows = rowsFromExecute(await db.db.execute(sql`
        SELECT id, name, slug, status, tasks, inputs, outputs, paused_until, created_at
        FROM empire_agents
        WHERE status = 'inactive'
        ORDER BY id ASC
        LIMIT ${limit}
      `));
      return { agents: rows, activationRequirement: AGENT_HOLD_REASON };
    }),
});
