/**
 * telegramCampaignRouter.ts
 *
 * tRPC router for the Telegram AI Drop Machine v1.
 *
 * Procedures:
 *   telegramCampaign.createAIDrop       — generate AI copy + campaign record
 *   telegramCampaign.sendDropToChannel  — post to CreatorVault_Free
 *   telegramCampaign.recordClick        — record click attribution event
 *   telegramCampaign.recordConversion   — record purchase attribution + whale metrics
 *   telegramCampaign.triggerVipUpsell   — send VIP upsell DM + invite link
 *   telegramCampaign.getCampaign        — get campaign status + metrics
 *   telegramCampaign.listCampaigns      — list creator's campaigns
 */

import { z } from "zod";
import { router, protectedProcedure, publicProcedure } from "../_core/trpc";
import {
  createAIDrop,
  sendDropToChannel,
  recordCampaignEvent,
  triggerVipUpsell,
} from "../services/telegramCampaign";
import mysql from "mysql2/promise";

const DB_URL =
  process.env.DATABASE_URL ||
  "mysql://creatorvault:KingCam214CreatorVault@127.0.0.1:3306/creatorvault";

async function getDb() {
  return mysql.createConnection(DB_URL);
}
function rows(result: any): any[] {
  return Array.isArray(result) ? (result[0] as any[]) : [];
}

export const telegramCampaignRouter = router({

  // ─── CREATE AI DROP ─────────────────────────────────────────────────────────
  "createAIDrop": protectedProcedure
    .input(
      z.object({
        contentId: z.number().int().positive(),
        campaignMode: z.enum(["FAST", "BOOST", "FULL"]).default("FAST"),
        campaignType: z.enum(["PPV_DROP", "VIP_UPSELL", "FREE_TO_PAID", "FLASH_SALE", "CREATOR_SPOTLIGHT"]).default("PPV_DROP"),
        channelEntityId: z.number().int().default(1),
        overridePrice: z.number().positive().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const result = await createAIDrop({
        contentId: input.contentId,
        creatorId: ctx.user.id,
        campaignMode: input.campaignMode,
        campaignType: input.campaignType,
        channelEntityId: input.channelEntityId,
        overridePrice: input.overridePrice,
      });
      return result;
    }),

  // ─── SEND DROP TO CHANNEL ────────────────────────────────────────────────────
  "sendDropToChannel": protectedProcedure
    .input(
      z.object({
        campaignId: z.number().int().positive(),
      })
    )
    .mutation(async ({ input }) => {
      const result = await sendDropToChannel(input.campaignId);
      return result;
    }),

  // ─── RECORD CLICK ────────────────────────────────────────────────────────────
  "recordClick": publicProcedure
    .input(
      z.object({
        trackingCode: z.string().min(1),
        sessionId: z.string().optional(),
        ipHash: z.string().optional(),
        userAgent: z.string().optional(),
        buyerTelegramId: z.number().optional(),
      })
    )
    .mutation(async ({ input }) => {
      await recordCampaignEvent(input.trackingCode, "click", {
        sessionId: input.sessionId,
        ipHash: input.ipHash,
        userAgent: input.userAgent,
        buyerTelegramId: input.buyerTelegramId,
      });
      return { ok: true };
    }),

  // ─── RECORD CONVERSION ──────────────────────────────────────────────────────
  "recordConversion": publicProcedure
    .input(
      z.object({
        trackingCode: z.string().min(1),
        userId: z.number().optional(),
        revenueCents: z.number().int().nonnegative(),
        buyerTelegramId: z.number().optional(),
      })
    )
    .mutation(async ({ input }) => {
      await recordCampaignEvent(input.trackingCode, "purchase", {
        userId: input.userId,
        revenueCents: input.revenueCents,
        buyerTelegramId: input.buyerTelegramId,
      });
      return { ok: true };
    }),

  // ─── TRIGGER VIP UPSELL ─────────────────────────────────────────────────────
  "triggerVipUpsell": publicProcedure
    .input(
      z.object({
        buyerTelegramId: z.number().int().positive(),
        campaignTrackingCode: z.string().optional(),
        purchaseId: z.number().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const result = await triggerVipUpsell({
        buyerTelegramId: input.buyerTelegramId,
        campaignTrackingCode: input.campaignTrackingCode,
        purchaseId: input.purchaseId,
      });
      return result;
    }),

  // ─── GET CAMPAIGN ────────────────────────────────────────────────────────────
  "getCampaign": protectedProcedure
    .input(z.object({ campaignId: z.number().int().positive() }))
    .query(async ({ input }) => {
      const db = await getDb();
      try {
        const [campRows] = await db.execute(
          `SELECT tc.*,
                  vc.title as content_title, vc.thumbnail_url, vc.ppv_price,
                  tce.display_name as channel_name,
                  dj.status as job_status, dj.platform_post_url
           FROM telegram_campaigns tc
           LEFT JOIN vaultx_content vc ON vc.id = tc.content_id
           LEFT JOIN telegram_channel_entities tce ON tce.id = tc.channel_entity_id
           LEFT JOIN distribution_jobs dj ON dj.id = tc.distribution_job_id
           WHERE tc.id = ?`,
          [input.campaignId]
        );
        const campaign = rows(campRows)[0] as any;
        if (!campaign) return { found: false };

        // Get assets
        const [assetRows] = await db.execute(
          `SELECT asset_type, asset_url, source, is_primary FROM telegram_campaign_assets WHERE campaign_id = ?`,
          [input.campaignId]
        );

        // Get messages
        const [msgRows] = await db.execute(
          `SELECT message_type, telegram_chat_id, telegram_message_id, sent_at, status
           FROM telegram_campaign_messages WHERE campaign_id = ? ORDER BY created_at DESC`,
          [input.campaignId]
        );

        return {
          found: true,
          campaign: {
            id: campaign.id,
            status: campaign.status,
            campaignType: campaign.campaign_type,
            campaignMode: campaign.campaign_mode,
            trackingCode: campaign.tracking_code,
            trackedUrl: `${(process.env.VITE_FRONTEND_FORGE_API_URL || "https://creatorvault.live/api").replace("/api", "")}/r/${campaign.tracking_code}`,
            telegramMessageId: campaign.telegram_message_id,
            clickCount: campaign.click_count,
            conversionCount: campaign.conversion_count,
            revenueCents: campaign.revenue_cents,
            priceCents: campaign.price_cents,
            contentTitle: campaign.content_title,
            channelName: campaign.channel_name,
            aiHook: campaign.ai_hook,
            aiCaption: campaign.ai_caption,
            aiCta: campaign.ai_cta,
            aiVipCopy: campaign.ai_vip_copy,
            aiEnginesUsed: campaign.ai_engines_used,
            costEstimateCents: campaign.cost_estimate_cents,
            createdAt: campaign.created_at,
          },
          assets: rows(assetRows),
          messages: rows(msgRows),
        };
      } finally {
        await db.end();
      }
    }),

  // ─── LIST CAMPAIGNS ──────────────────────────────────────────────────────────
  "listCampaigns": protectedProcedure
    .input(
      z.object({
        limit: z.number().int().default(20),
        offset: z.number().int().default(0),
        status: z.enum(["draft", "active", "sent", "completed", "failed"]).optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      try {
        const statusFilter = input.status ? `AND tc.status = '${input.status}'` : "";
        const [campRows] = await db.execute(
          `SELECT tc.id, tc.status, tc.campaign_type, tc.campaign_mode,
                  tc.tracking_code, tc.click_count, tc.conversion_count,
                  tc.revenue_cents, tc.price_cents, tc.telegram_message_id,
                  tc.created_at, tc.updated_at,
                  vc.title as content_title,
                  tce.display_name as channel_name
           FROM telegram_campaigns tc
           LEFT JOIN vaultx_content vc ON vc.id = tc.content_id
           LEFT JOIN telegram_channel_entities tce ON tce.id = tc.channel_entity_id
           WHERE tc.creator_id = ? ${statusFilter}
           ORDER BY tc.created_at DESC
           LIMIT ${input.limit} OFFSET ${input.offset}`,
          [ctx.user.id]
        );

        const [countRows] = await db.execute(
          `SELECT COUNT(*) as total FROM telegram_campaigns WHERE creator_id = ?`,
          [ctx.user.id]
        );

        return {
          campaigns: rows(campRows),
          total: (rows(countRows)[0] as any)?.total || 0,
        };
      } finally {
        await db.end();
      }
    }),
// ─── SCHEDULE DROP ──────────────────────────────────────────────────────────
  "scheduleDrop": protectedProcedure
    .input(
      z.object({
        contentId: z.number().int().positive().optional(),
        channelEntityId: z.number().int().optional(),
        mode: z.enum(["FAST", "BOOST", "FULL"]).default("BOOST"),
        scheduledAt: z.string().datetime(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { scheduleDailyDrop } = await import("../services/telegramDailyDropEngine");
      const result = await scheduleDailyDrop({
        creatorId: ctx.user.id,
        contentId: input.contentId,
        channelEntityId: input.channelEntityId,
        mode: input.mode,
        scheduledAt: new Date(input.scheduledAt),
      });
      return result;
    }),

  // ─── LIST DROPS ─────────────────────────────────────────────────────────────
  "listDrops": protectedProcedure
    .input(
      z.object({
        limit: z.number().int().default(20),
        status: z.enum(["scheduled", "sent", "failed", "cancelled"]).optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      try {
        const statusFilter = input.status ? `AND status = '${input.status}'` : "";
        const [dropRows] = await db.execute(
          `SELECT d.id, d.mode, d.status, d.scheduled_at, d.sent_at,
                  d.tg_message_id, d.tracking_code, d.click_count, d.revenue_cents,
                  vc.title as content_title, vc.ppv_price as content_price
           FROM telegram_daily_drops d
           LEFT JOIN vaultx_content vc ON vc.id = d.content_id
           WHERE d.creator_id = ? ${statusFilter}
           ORDER BY d.scheduled_at DESC
           LIMIT ${input.limit}`,
          [ctx.user.id]
        );
        return { drops: rows(dropRows) };
      } finally {
        await db.end();
      }
    }),

  // ─── TRIGGER REACTIVATION ────────────────────────────────────────────────────
  "triggerReactivation": protectedProcedure
    .input(
      z.object({
        subscriberId: z.number().int().positive().optional(),
        runAll: z.boolean().default(false),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { runReactivationTick, scheduleReactivationJob } = await import("../services/telegramBuyerReactivation");
      if (input.runAll) {
        const result = await runReactivationTick();
        return result;
      }
      if (input.subscriberId) {
        const db = await getDb();
        try {
          const [subRows] = await db.execute(
            "SELECT id, telegram_id FROM telegram_subscribers WHERE id = ? LIMIT 1",
            [input.subscriberId]
          );
          const sub = rows(subRows)[0] as any;
          if (!sub) throw new Error("Subscriber not found");
          const result = await scheduleReactivationJob({
            subscriberId: sub.id,
            telegramUserId: sub.telegram_id,
            reason: "inactive_buyer",
          });
          return result;
        } finally {
          await db.end();
        }
      }
      throw new Error("Must provide subscriberId or runAll=true");
    }),

  // ─── LIST REACTIVATION JOBS ──────────────────────────────────────────────────
  "listReactivationJobs": protectedProcedure
    .input(
      z.object({
        limit: z.number().int().default(20),
        status: z.enum(["pending", "sent", "completed", "failed"]).optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      try {
        const statusFilter = input.status ? `AND rj.status = '${input.status}'` : "";
        const [jobRows] = await db.execute(
          `SELECT rj.id, rj.subscriber_id, rj.telegram_user_id, rj.reason,
                  rj.status, rj.retry_count, rj.scheduled_at, rj.sent_at,
                  ts.first_name, ts.segment, ts.purchase_count, ts.total_spent_cents
           FROM telegram_reactivation_jobs rj
           LEFT JOIN telegram_subscribers ts ON ts.id = rj.subscriber_id
           WHERE 1=1 ${statusFilter}
           ORDER BY rj.created_at DESC
           LIMIT ${input.limit}`
        );
        return { jobs: rows(jobRows) };
      } finally {
        await db.end();
      }
    }),

});
