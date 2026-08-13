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

  runPerformanceIntelligenceTruth: ownerProcedure
    .mutation(async ({ ctx }) => {
      const startedAt = new Date();
      const creatorRows = rowsFromExecute(await db.db.execute(sql`
        SELECT id FROM vaultx_creators WHERE user_id = ${ctx.user.id} LIMIT 1
      `));
      const creatorId = Number(creatorRows[0]?.id ?? ctx.user.id);
      const [packageRows, distributionRows, nativePostRows, audienceRows, moneyRows] = await Promise.all([
        db.db.execute(sql`
          SELECT state, approval_state, COUNT(*) AS count
          FROM social_packages
          WHERE creator_user_id = ${ctx.user.id}
          GROUP BY state, approval_state
        `),
        db.db.execute(sql`
          SELECT platform, status, approval_state, COUNT(*) AS count, MAX(created_at) AS lastRecordedAt
          FROM distribution_jobs
          WHERE creator_id = ${creatorId}
          GROUP BY platform, status, approval_state
          ORDER BY lastRecordedAt DESC
        `),
        db.db.execute(sql`
          SELECT status, visibility, access_tier, COUNT(*) AS count
          FROM social_native_posts
          WHERE creator_user_id = ${ctx.user.id}
          GROUP BY status, visibility, access_tier
        `),
        db.db.execute(sql`
          SELECT
            (SELECT COUNT(*) FROM social_follows WHERE creator_user_id = ${ctx.user.id}) AS followers,
            (SELECT COUNT(*) FROM subscriptions WHERE creator_id = ${creatorId} AND status = 'active') AS activeSubscribers,
            (SELECT COUNT(*) FROM conversations WHERE creator_id = ${creatorId}) AS conversations
        `),
        db.db.execute(sql`
          SELECT COALESCE(SUM(creator_share_cents), 0) AS creatorEarningsCents,
                 COUNT(*) AS paidUnlocks
          FROM transactions
          WHERE creator_id = ${creatorId} AND status = 'completed'
        `),
      ]);
      const audience = rowsFromExecute(audienceRows)[0] || {};
      const money = rowsFromExecute(moneyRows)[0] || {};
      const snapshot = {
        source: "creatorvault_social_empire",
        creatorId,
        packages: rowsFromExecute(packageRows).map((row: any) => ({
          state: String(row.state), approvalState: String(row.approval_state), count: Number(row.count ?? 0),
        })),
        distribution: rowsFromExecute(distributionRows).map((row: any) => ({
          platform: String(row.platform), status: String(row.status), approvalState: String(row.approval_state),
          count: Number(row.count ?? 0), lastRecordedAt: row.lastRecordedAt || null,
        })),
        nativePosts: rowsFromExecute(nativePostRows).map((row: any) => ({
          status: String(row.status), visibility: String(row.visibility), accessTier: String(row.access_tier), count: Number(row.count ?? 0),
        })),
        audience: {
          followers: Number(audience.followers ?? 0),
          activeSubscribers: Number(audience.activeSubscribers ?? 0),
          conversations: Number(audience.conversations ?? 0),
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
