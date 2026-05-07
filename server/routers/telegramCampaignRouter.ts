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
});
