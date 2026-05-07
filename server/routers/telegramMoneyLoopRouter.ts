/**
 * telegramMoneyLoopRouter.ts
 *
 * tRPC router for the first real Telegram money loop:
 *   drop.send → attribution.onPurchase → vip.upsell → vip.joinRequest
 *
 * Procedures:
 *   drop.send            — post tracked drop to Free channel
 *   drop.status          — get distribution_jobs row + click/conversion counts
 *   attribution.onPurchase — wire purchase to tracking code + whale metrics
 *   vip.upsell           — send DM + generate single-use VIP invite link
 *   vip.joinRequest      — approve/decline VIP join request + track membership
 */

import { z } from "zod";
import { router, protectedProcedure, publicProcedure } from "../_core/trpc";
import {
  sendFreeChannelDrop,
  upsertSubscriber,
  attributePurchase,
  sendVipUpsell,
  handleVipJoinRequest,
} from "../services/telegramMoneyLoop";
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

export const telegramMoneyLoopRouter = router({
  // ─── SEND TRACKED FREE CHANNEL DROP ───────────────────────────────────────
  "drop.send": protectedProcedure
    .input(
      z.object({
        contentId: z.number().optional(),
        teaserUrl: z.string().url().optional(),
        caption: z.string().min(1).max(1024),
        price: z.number().positive(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const result = await sendFreeChannelDrop({
        contentId: input.contentId,
        teaserUrl: input.teaserUrl,
        caption: input.caption,
        price: input.price,
        creatorId: ctx.user.id,
      });
      return result;
    }),

  // ─── GET DROP STATUS ────────────────────────────────────────────────────────
  "drop.status": protectedProcedure
    .input(z.object({ trackingCode: z.string() }))
    .query(async ({ input }) => {
      const db = await getDb();
      try {
        const [djRows] = await db.execute(
          `SELECT dj.id, dj.tracking_code, dj.status, dj.click_count,
                  COALESCE(dj.conversion_count, 0) as conversion_count,
                  COALESCE(dj.revenue_cents, 0) as revenue_cents,
                  dj.created_at,
                  COUNT(ae.id) as attr_clicks
           FROM distribution_jobs dj
           LEFT JOIN attribution_events ae ON ae.tracking_code = dj.tracking_code
           WHERE dj.tracking_code = ?
           GROUP BY dj.id`,
          [input.trackingCode]
        );
        const job = rows(djRows)[0] as any;
        if (!job) return { found: false };
        return {
          found: true,
          trackingCode: job.tracking_code,
          status: job.status,
          clickCount: job.click_count || job.attr_clicks || 0,
          conversionCount: job.conversion_count,
          revenueCents: job.revenue_cents,
          trackingUrl: `${process.env.VITE_FRONTEND_FORGE_API_URL?.replace("/api", "") || "https://creatorvault.live"}/r/${job.tracking_code}`,
          createdAt: job.created_at,
        };
      } finally {
        await db.end();
      }
    }),

  // ─── WIRE PURCHASE TO TRACKING CODE ────────────────────────────────────────
  "attribution.onPurchase": publicProcedure
    .input(
      z.object({
        purchaseId: z.number(),
        fanId: z.number(),
        creatorId: z.number(),
        contentId: z.number(),
        amountPaid: z.number().positive(),
        trackingCode: z.string().optional(),
        buyerTelegramId: z.number().optional(),
      })
    )
    .mutation(async ({ input }) => {
      await attributePurchase(input);
      return { ok: true };
    }),

  // ─── VIP UPSELL DM + INVITE LINK ───────────────────────────────────────────
  "vip.upsell": publicProcedure
    .input(
      z.object({
        buyerTelegramId: z.number(),
        purchaseId: z.number(),
        subscriberId: z.number().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const result = await sendVipUpsell(input);
      return result;
    }),

  // ─── VIP JOIN REQUEST HANDLER ───────────────────────────────────────────────
  "vip.joinRequest": publicProcedure
    .input(
      z.object({
        telegramId: z.number(),
        chatId: z.string(),
        username: z.string().optional(),
        firstName: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const result = await handleVipJoinRequest(input);
      return result;
    }),

  // ─── SUBSCRIBER UPSERT ──────────────────────────────────────────────────────
  "subscriber.upsert": publicProcedure
    .input(
      z.object({
        telegramId: z.number(),
        username: z.string().optional(),
        firstName: z.string().optional(),
        lastName: z.string().optional(),
        sourceTrackingCode: z.string().optional(),
        vaultxUserId: z.number().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const subscriberId = await upsertSubscriber(input);
      return { subscriberId };
    }),

  // ─── GET INVITE LINKS FOR SUBSCRIBER ───────────────────────────────────────
  "vip.inviteLinks": protectedProcedure
    .input(z.object({ subscriberId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      try {
        const [ilRows] = await db.execute(
          `SELECT id, invite_url, is_used, expires_at, used_at, created_at
           FROM telegram_invite_links
           WHERE subscriber_id = ? AND channel_entity_id = 2
           ORDER BY created_at DESC LIMIT 10`,
          [input.subscriberId]
        );
        return { inviteLinks: rows(ilRows) };
      } finally {
        await db.end();
      }
    }),

  // ─── GET VIP MEMBERSHIPS ────────────────────────────────────────────────────
  "vip.members": protectedProcedure
    .input(z.object({ limit: z.number().default(50) }))
    .query(async () => {
      const db = await getDb();
      try {
        const [mRows] = await db.execute(
          `SELECT tcm.id, tcm.subscriber_id, tcm.status, tcm.joined_at,
                  ts.telegram_id, ts.username, ts.first_name, ts.segment
           FROM telegram_channel_memberships tcm
           JOIN telegram_subscribers ts ON ts.id = tcm.subscriber_id
           WHERE tcm.channel_entity_id = 2
           ORDER BY tcm.joined_at DESC LIMIT 50`
        );
        return { members: rows(mRows) };
      } finally {
        await db.end();
      }
    }),
});
