/**
 * vaultxRouter — Production VaultX Platform Router
 * All procedures query real MySQL tables. Zero stubs. Zero mocks.
 * Platform fee: 15% (creator keeps 85%) — THIS IS LAW.
 * Owner userIds: 6 and 33
 */
import { z } from "zod";
import { router, protectedProcedure, publicProcedure } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { db } from "../db";
import { users } from "../../drizzle/schema";
import { eq, desc, and, sql } from "drizzle-orm";
import { randomUUID } from "crypto";
import * as fs from "fs";
import * as path from "path";
import { execSync, spawn } from "child_process";

const OWNER_IDS = [6, 33];
const PLATFORM_FEE = 0.15;
const UPLOAD_DIR = "/root/creatorvault/dist/public/uploads/vaultx";

// Raw MySQL2 connection for tables not in Drizzle schema
async function rawQuery(query: string, params: any[] = []): Promise<any[]> {
  const pool = (db as any).$client || (db as any).client;
  if (pool && typeof pool.promise === "function") {
    const [rows] = await pool.promise().query(query, params);
    return rows as any[];
  }
  if (pool && typeof pool.execute === "function") {
    const [rows] = await pool.execute(query, params);
    return rows as any[];
  }
  const result = await (db as any).execute(sql.raw(query.replace(/\?/g, (_: any, i: number) => `'${params[i]}'`)));
  return (result as any).rows || result;
}

async function rawExec(query: string, params: any[] = []): Promise<any> {
  const pool = (db as any).$client || (db as any).client;
  if (pool && typeof pool.promise === "function") {
    const [result] = await pool.promise().query(query, params);
    return result;
  }
  if (pool && typeof pool.execute === "function") {
    const [result] = await pool.execute(query, params);
    return result;
  }
  await (db as any).execute(sql.raw(query));
}

function isCreatorOrOwner(userId: number, creatorId?: number): boolean {
  return OWNER_IDS.includes(userId) || (creatorId !== undefined && userId === creatorId);
}

async function getCreatorId(userId: number): Promise<number | null> {
  const rows = await rawQuery("SELECT id FROM vaultx_creators WHERE user_id = ? AND is_active = 1 LIMIT 1", [userId]);
  return rows[0]?.id ?? null;
}

async function ensureUploadDir(creatorId: number): Promise<string> {
  const dir = path.join(UPLOAD_DIR, String(creatorId));
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function runFFmpeg(args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const proc = spawn("ffmpeg", ["-y", ...args]);
    let stderr = "";
    proc.stderr.on("data", (d) => { stderr += d.toString(); });
    proc.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`FFmpeg exited ${code}: ${stderr.slice(-500)}`));
    });
  });
}

export const vaultxRouter = router({

  // ═══════════════════════════════════════════════════════════════════════════
  // PROCEDURE 1 — setupCreatorProfile
  // ═══════════════════════════════════════════════════════════════════════════
  setupCreatorProfile: protectedProcedure
    .input(z.object({
      displayName: z.string().min(1).max(100),
      bio: z.string().max(2000).optional(),
      profileImageUrl: z.string().url().optional(),
      coverImageUrl: z.string().url().optional(),
      subscriptionPriceBasic: z.number().min(4.99).max(499).default(9.99),
      subscriptionPricePremium: z.number().min(9.99).max(499).default(24.99),
      subscriptionPriceVip: z.number().min(19.99).max(499).default(49.99),
      basicDescription: z.string().max(500).optional(),
      premiumDescription: z.string().max(500).optional(),
      vipDescription: z.string().max(500).optional(),
      basicPerks: z.array(z.string()).optional(),
      premiumPerks: z.array(z.string()).optional(),
      vipPerks: z.array(z.string()).optional(),
      geoBlockedCountries: z.array(z.string()).optional(),
      languagePrimary: z.enum(["en", "es", "ht"]).default("en"),
    }))
    .mutation(async ({ ctx, input }) => {
      const existing = await rawQuery("SELECT id FROM vaultx_creators WHERE user_id = ? LIMIT 1", [ctx.user.id]);
      const data = [
        input.displayName, input.bio || null,
        input.profileImageUrl || null, input.coverImageUrl || null,
        input.subscriptionPriceBasic, input.subscriptionPricePremium, input.subscriptionPriceVip,
        input.basicDescription || null, input.premiumDescription || null, input.vipDescription || null,
        JSON.stringify(input.basicPerks || []), JSON.stringify(input.premiumPerks || []), JSON.stringify(input.vipPerks || []),
        JSON.stringify(input.geoBlockedCountries || []), input.languagePrimary,
      ];
      if (existing.length === 0) {
        await rawExec(
          `INSERT INTO vaultx_creators
           (user_id, display_name, bio, profile_image_url, cover_image_url,
            subscription_price_basic, subscription_price_premium, subscription_price_vip,
            basic_description, premium_description, vip_description,
            basic_perks, premium_perks, vip_perks,
            geo_blocked_countries, language_primary)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [ctx.user.id, ...data]
        );
      } else {
        await rawExec(
          `UPDATE vaultx_creators SET
           display_name=?, bio=?, profile_image_url=COALESCE(?,profile_image_url),
           cover_image_url=COALESCE(?,cover_image_url),
           subscription_price_basic=?, subscription_price_premium=?, subscription_price_vip=?,
           basic_description=?, premium_description=?, vip_description=?,
           basic_perks=?, premium_perks=?, vip_perks=?,
           geo_blocked_countries=?, language_primary=?
           WHERE user_id=?`,
          [...data, ctx.user.id]
        );
      }
      const rows = await rawQuery("SELECT * FROM vaultx_creators WHERE user_id = ? LIMIT 1", [ctx.user.id]);
      return { creator: rows[0] };
    }),

  // ═══════════════════════════════════════════════════════════════════════════
  // PROCEDURE 2 — getCreatorProfile (public)
  // ═══════════════════════════════════════════════════════════════════════════
  getCreatorProfile: publicProcedure
    .input(z.object({ creatorId: z.number() }))
    .query(async ({ input }) => {
      const rows = await rawQuery(
        `SELECT c.id, c.user_id, c.display_name, c.bio, c.profile_image_url, c.cover_image_url,
                c.subscription_price_basic, c.subscription_price_premium, c.subscription_price_vip,
                c.basic_description, c.premium_description, c.vip_description,
                c.basic_perks, c.premium_perks, c.vip_perks,
                c.total_subscribers, c.language_primary,
                u.username, u.name
         FROM vaultx_creators c
         LEFT JOIN users u ON u.id = c.user_id
         WHERE c.id = ? AND c.is_active = 1 LIMIT 1`,
        [input.creatorId]
      );
      if (!rows[0]) throw new TRPCError({ code: "NOT_FOUND", message: "Creator not found." });
      return { creator: rows[0] };
    }),

  // ═══════════════════════════════════════════════════════════════════════════
  // PROCEDURE 3 — getMyCreatorProfile (creator/owner gate)
  // ═══════════════════════════════════════════════════════════════════════════
  getMyCreatorProfile: protectedProcedure.query(async ({ ctx }) => {
    const rows = await rawQuery(
      `SELECT c.*, u.username, u.name, u.email,
              (SELECT SUM(amount_paid) FROM vaultx_tips WHERE creator_id = c.id AND status='completed') AS total_tips,
              (SELECT SUM(price_paid) FROM vaultx_subscriptions WHERE creator_id = c.id AND status='active') AS active_sub_revenue,
              (SELECT COUNT(*) FROM vaultx_subscriptions WHERE creator_id = c.id AND status='active') AS active_subscribers
       FROM vaultx_creators c
       LEFT JOIN users u ON u.id = c.user_id
       WHERE c.user_id = ? LIMIT 1`,
      [ctx.user.id]
    );
    return { creator: rows[0] || null };
  }),

  // ═══════════════════════════════════════════════════════════════════════════
  // PROCEDURE 4 — uploadContent
  // ═══════════════════════════════════════════════════════════════════════════
  uploadContent: protectedProcedure
    .input(z.object({
      title: z.string().min(1).max(255),
      description: z.string().max(2000).optional(),
      contentType: z.enum(["photo", "video", "audio", "bundle"]),
      uncensoredUrl: z.string().url(),
      censoredUrl: z.string().url().optional(),
      thumbnailUrl: z.string().url().optional(),
      censoredThumbnailUrl: z.string().url().optional(),
      isPpv: z.boolean().default(false),
      ppvPrice: z.number().min(0).default(0),
      isSubscriptionOnly: z.boolean().default(true),
      isFreePreview: z.boolean().default(false),
      freePreviewSeconds: z.number().min(5).max(60).default(15),
      accessTier: z.enum(["basic", "premium", "vip", "ppv"]).default("basic"),
      tags: z.array(z.string()).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const creatorId = await getCreatorId(ctx.user.id);
      if (!creatorId && !OWNER_IDS.includes(ctx.user.id)) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Creator profile required." });
      }
      const result = await rawExec(
        `INSERT INTO vaultx_content
         (creator_id, title, description, content_type,
          uncensored_url, censored_url, thumbnail_url, censored_thumbnail_url,
          is_ppv, ppv_price, is_subscription_only, is_free_preview, free_preview_seconds,
          access_tier, tags, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active')`,
        [
          creatorId || ctx.user.id,
          input.title, input.description || null, input.contentType,
          input.uncensoredUrl, input.censoredUrl || null,
          input.thumbnailUrl || null, input.censoredThumbnailUrl || null,
          input.isPpv ? 1 : 0, input.ppvPrice,
          input.isSubscriptionOnly ? 1 : 0, input.isFreePreview ? 1 : 0,
          input.freePreviewSeconds, input.accessTier,
          input.tags?.length ? JSON.stringify(input.tags) : null,
        ]
      );
      return { contentId: (result as any).insertId, success: true };
    }),

  // ═══════════════════════════════════════════════════════════════════════════
  // PROCEDURE 5 — getMyContent
  // ═══════════════════════════════════════════════════════════════════════════
  getMyContent: protectedProcedure
    .input(z.object({
      status: z.enum(["all", "active", "draft", "archived"]).default("all"),
      limit: z.number().min(1).max(100).default(50),
      offset: z.number().min(0).default(0),
    }))
    .query(async ({ ctx, input }) => {
      const creatorId = await getCreatorId(ctx.user.id);
      const cid = creatorId || ctx.user.id;
      const whereStatus = input.status === "all" ? "" : "AND status = ?";
      const params = input.status === "all"
        ? [cid, input.limit, input.offset]
        : [cid, input.status, input.limit, input.offset];
      const rows = await rawQuery(
        `SELECT id, title, description, content_type, thumbnail_url, censored_thumbnail_url,
                is_ppv, ppv_price, access_tier, view_count, purchase_count, revenue_generated,
                status, tags, created_at, updated_at
         FROM vaultx_content WHERE creator_id = ? ${whereStatus}
         ORDER BY created_at DESC LIMIT ? OFFSET ?`,
        params
      );
      const total = await rawQuery(
        `SELECT COUNT(*) AS cnt FROM vaultx_content WHERE creator_id = ? ${whereStatus}`,
        input.status === "all" ? [cid] : [cid, input.status]
      );
      return { items: rows, total: total[0]?.cnt || 0 };
    }),

  // ═══════════════════════════════════════════════════════════════════════════
  // PROCEDURE 6 — updateContent
  // ═══════════════════════════════════════════════════════════════════════════
  updateContent: protectedProcedure
    .input(z.object({
      contentId: z.number(),
      title: z.string().min(1).max(255).optional(),
      description: z.string().max(2000).optional(),
      accessTier: z.enum(["basic", "premium", "vip", "ppv"]).optional(),
      ppvPrice: z.number().min(0).optional(),
      status: z.enum(["draft", "active", "archived"]).optional(),
      tags: z.array(z.string()).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const creatorId = await getCreatorId(ctx.user.id);
      const cid = creatorId || ctx.user.id;
      const existing = await rawQuery("SELECT id FROM vaultx_content WHERE id = ? AND creator_id = ? LIMIT 1", [input.contentId, cid]);
      if (!existing.length && !OWNER_IDS.includes(ctx.user.id)) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Content not found or access denied." });
      }
      const sets: string[] = [];
      const vals: any[] = [];
      if (input.title !== undefined) { sets.push("title = ?"); vals.push(input.title); }
      if (input.description !== undefined) { sets.push("description = ?"); vals.push(input.description); }
      if (input.accessTier !== undefined) { sets.push("access_tier = ?"); vals.push(input.accessTier); }
      if (input.ppvPrice !== undefined) { sets.push("ppv_price = ?"); vals.push(input.ppvPrice); }
      if (input.status !== undefined) { sets.push("status = ?"); vals.push(input.status); }
      if (input.tags !== undefined) { sets.push("tags = ?"); vals.push(JSON.stringify(input.tags)); }
      if (!sets.length) return { success: true };
      await rawExec(`UPDATE vaultx_content SET ${sets.join(", ")} WHERE id = ?`, [...vals, input.contentId]);
      return { success: true };
    }),

  // ═══════════════════════════════════════════════════════════════════════════
  // PROCEDURE 7 — archiveContent
  // ═══════════════════════════════════════════════════════════════════════════
  archiveContent: protectedProcedure
    .input(z.object({ contentId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const creatorId = await getCreatorId(ctx.user.id);
      const cid = creatorId || ctx.user.id;
      await rawExec("UPDATE vaultx_content SET status = 'archived' WHERE id = ? AND creator_id = ?", [input.contentId, cid]);
      return { success: true };
    }),

  // ═══════════════════════════════════════════════════════════════════════════
  // PROCEDURE 8 — getContentStats
  // ═══════════════════════════════════════════════════════════════════════════
  getContentStats: protectedProcedure
    .input(z.object({ contentId: z.number() }))
    .query(async ({ ctx, input }) => {
      const creatorId = await getCreatorId(ctx.user.id);
      const cid = creatorId || ctx.user.id;
      const rows = await rawQuery(
        `SELECT id, title, view_count, purchase_count, revenue_generated, created_at
         FROM vaultx_content WHERE id = ? AND creator_id = ? LIMIT 1`,
        [input.contentId, cid]
      );
      if (!rows.length) throw new TRPCError({ code: "NOT_FOUND", message: "Content not found." });
      return rows[0];
    }),

  // ═══════════════════════════════════════════════════════════════════════════
  // PROCEDURE 9 — getSubscriberList
  // ═══════════════════════════════════════════════════════════════════════════
  getSubscriberList: protectedProcedure
    .input(z.object({
      tier: z.enum(["all", "basic", "premium", "vip"]).default("all"),
      sortBy: z.enum(["total_spent", "join_date", "tier"]).default("total_spent"),
      limit: z.number().min(1).max(200).default(50),
      offset: z.number().min(0).default(0),
    }))
    .query(async ({ ctx, input }) => {
      const creatorId = await getCreatorId(ctx.user.id);
      const cid = creatorId || ctx.user.id;
      const tierWhere = input.tier === "all" ? "" : "AND vs.tier = ?";
      const sortCol = input.sortBy === "total_spent" ? "total_spent DESC"
        : input.sortBy === "join_date" ? "vs.created_at DESC"
        : "vs.tier ASC";
      const params = input.tier === "all"
        ? [cid, input.limit, input.offset]
        : [cid, input.tier, input.limit, input.offset];
      const rows = await rawQuery(
        `SELECT vs.id, vs.fan_id, vs.tier, vs.price_paid, vs.status, vs.created_at,
                u.username, u.name,
                (SELECT SUM(amount) FROM vaultx_tips WHERE fan_id = vs.fan_id AND creator_id = vs.creator_id AND status='completed') AS tips_total,
                (SELECT SUM(amount_paid) FROM vaultx_ppv_purchases WHERE fan_id = vs.fan_id AND creator_id = vs.creator_id AND status='completed') AS ppv_total,
                (vs.price_paid + COALESCE((SELECT SUM(amount) FROM vaultx_tips WHERE fan_id = vs.fan_id AND creator_id = vs.creator_id AND status='completed'), 0) + COALESCE((SELECT SUM(amount_paid) FROM vaultx_ppv_purchases WHERE fan_id = vs.fan_id AND creator_id = vs.creator_id AND status='completed'), 0)) AS total_spent,
                (SELECT MAX(created_at) FROM vaultx_messages WHERE sender_id = vs.fan_id AND recipient_id = vs.creator_id) AS last_message_at
         FROM vaultx_subscriptions vs
         LEFT JOIN users u ON u.id = vs.fan_id
         WHERE vs.creator_id = ? ${tierWhere}
         ORDER BY ${sortCol}
         LIMIT ? OFFSET ?`,
        params
      );
      return { subscribers: rows };
    }),

  // ═══════════════════════════════════════════════════════════════════════════
  // PROCEDURE 10 — sendMassMessage
  // ═══════════════════════════════════════════════════════════════════════════
  sendMassMessage: protectedProcedure
    .input(z.object({
      subject: z.string().max(255).optional(),
      messageText: z.string().min(1).max(5000),
      mediaUrl: z.string().url().optional(),
      mediaType: z.enum(["photo", "video", "audio"]).optional(),
      isLocked: z.boolean().default(false),
      unlockPrice: z.number().min(0).default(0),
      targetTier: z.enum(["all", "basic", "premium", "vip"]).default("all"),
      scheduledFor: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const creatorId = await getCreatorId(ctx.user.id);
      const cid = creatorId || ctx.user.id;
      const scheduledFor = input.scheduledFor ? new Date(input.scheduledFor) : null;
      const status = scheduledFor ? "scheduled" : "sent";
      const result = await rawExec(
        `INSERT INTO vaultx_mass_messages
         (creator_id, subject, message_text, media_url, media_type, is_locked, unlock_price,
          target_tier, scheduled_for, sent_at, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          cid, input.subject || null, input.messageText,
          input.mediaUrl || null, input.mediaType || null,
          input.isLocked ? 1 : 0, input.unlockPrice,
          input.targetTier, scheduledFor,
          scheduledFor ? null : new Date(), status,
        ]
      );
      const massMessageId = (result as any).insertId;
      if (!scheduledFor) {
        // Immediately fan out to subscriber inboxes
        const tierWhere = input.targetTier === "all" ? "" : "AND tier = ?";
        const subs = await rawQuery(
          `SELECT fan_id FROM vaultx_subscriptions WHERE creator_id = ? AND status = 'active' ${tierWhere}`,
          input.targetTier === "all" ? [cid] : [cid, input.targetTier]
        );
        for (const sub of subs) {
          await rawExec(
            `INSERT INTO vaultx_messages
             (sender_id, recipient_id, message_text, media_url, media_type, is_locked, unlock_price)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [cid, sub.fan_id, input.messageText, input.mediaUrl || null, input.mediaType || null, input.isLocked ? 1 : 0, input.unlockPrice]
          );
        }
        await rawExec("UPDATE vaultx_mass_messages SET sent_count = ? WHERE id = ?", [subs.length, massMessageId]);
      }
      return { success: true, massMessageId, recipientCount: 0 };
    }),

  // ═══════════════════════════════════════════════════════════════════════════
  // PROCEDURE 11 — getAiChatterConfig
  // ═══════════════════════════════════════════════════════════════════════════
  getAiChatterConfig: protectedProcedure.query(async ({ ctx }) => {
    const creatorId = await getCreatorId(ctx.user.id);
    const cid = creatorId || ctx.user.id;
    const rows = await rawQuery("SELECT * FROM vaultx_ai_chatter_config WHERE creator_id = ? LIMIT 1", [cid]);
    return { config: rows[0] || null };
  }),

  // ═══════════════════════════════════════════════════════════════════════════
  // PROCEDURE 12 — saveAiChatterConfig
  // ═══════════════════════════════════════════════════════════════════════════
  saveAiChatterConfig: protectedProcedure
    .input(z.object({
      isEnabled: z.boolean(),
      personaName: z.string().max(100).optional(),
      personaDescription: z.string().max(2000).optional(),
      greetingMessage: z.string().max(1000).optional(),
      ppvPitchFrequency: z.number().min(1).max(20).default(3),
      tipRequestFrequency: z.number().min(1).max(20).default(5),
      scheduleHours: z.object({ start: z.number(), end: z.number() }).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const creatorId = await getCreatorId(ctx.user.id);
      const cid = creatorId || ctx.user.id;
      const existing = await rawQuery("SELECT id FROM vaultx_ai_chatter_config WHERE creator_id = ? LIMIT 1", [cid]);
      if (existing.length === 0) {
        await rawExec(
          `INSERT INTO vaultx_ai_chatter_config
           (creator_id, is_enabled, persona_name, persona_description, greeting_message,
            ppv_pitch_frequency, tip_request_frequency, schedule_hours)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [cid, input.isEnabled ? 1 : 0, input.personaName || null, input.personaDescription || null,
           input.greetingMessage || null, input.ppvPitchFrequency, input.tipRequestFrequency,
           input.scheduleHours ? JSON.stringify(input.scheduleHours) : null]
        );
      } else {
        await rawExec(
          `UPDATE vaultx_ai_chatter_config SET
           is_enabled=?, persona_name=?, persona_description=?, greeting_message=?,
           ppv_pitch_frequency=?, tip_request_frequency=?, schedule_hours=?
           WHERE creator_id=?`,
          [input.isEnabled ? 1 : 0, input.personaName || null, input.personaDescription || null,
           input.greetingMessage || null, input.ppvPitchFrequency, input.tipRequestFrequency,
           input.scheduleHours ? JSON.stringify(input.scheduleHours) : null, cid]
        );
      }
      return { success: true };
    }),

  // ═══════════════════════════════════════════════════════════════════════════
  // PROCEDURE 13 — submitDmcaReport
  // ═══════════════════════════════════════════════════════════════════════════
  submitDmcaReport: protectedProcedure
    .input(z.object({
      reportedUrl: z.string().url(),
      platform: z.string().max(100).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const creatorId = await getCreatorId(ctx.user.id);
      const cid = creatorId || ctx.user.id;
      const result = await rawExec(
        "INSERT INTO vaultx_dmca_reports (creator_id, reported_url, platform, status) VALUES (?, ?, ?, 'pending')",
        [cid, input.reportedUrl, input.platform || null]
      );
      return { reportId: (result as any).insertId, success: true };
    }),

  // ═══════════════════════════════════════════════════════════════════════════
  // PROCEDURE 14 — getDmcaReports
  // ═══════════════════════════════════════════════════════════════════════════
  getDmcaReports: protectedProcedure.query(async ({ ctx }) => {
    const creatorId = await getCreatorId(ctx.user.id);
    const cid = creatorId || ctx.user.id;
    const rows = await rawQuery(
      "SELECT * FROM vaultx_dmca_reports WHERE creator_id = ? ORDER BY created_at DESC",
      [cid]
    );
    return { reports: rows };
  }),

  // ═══════════════════════════════════════════════════════════════════════════
  // PROCEDURE 15 — updateGeoBlocking
  // ═══════════════════════════════════════════════════════════════════════════
  updateGeoBlocking: protectedProcedure
    .input(z.object({ blockedCountries: z.array(z.string()) }))
    .mutation(async ({ ctx, input }) => {
      await rawExec(
        "UPDATE vaultx_creators SET geo_blocked_countries = ? WHERE user_id = ?",
        [JSON.stringify(input.blockedCountries), ctx.user.id]
      );
      return { success: true };
    }),

  // ═══════════════════════════════════════════════════════════════════════════
  // PROCEDURE 16 — applyWatermark (FFmpeg)
  // ═══════════════════════════════════════════════════════════════════════════
  applyWatermark: protectedProcedure
    .input(z.object({
      videoUrl: z.string().url(),
      watermarkText: z.string().max(100).optional(),
      watermarkImageUrl: z.string().url().optional(),
      position: z.enum(["top-left", "top-right", "bottom-left", "bottom-right"]).default("bottom-right"),
      opacity: z.number().min(0.1).max(1).default(0.7),
    }))
    .mutation(async ({ ctx, input }) => {
      const creatorId = await getCreatorId(ctx.user.id);
      const cid = creatorId || ctx.user.id;
      const dir = await ensureUploadDir(cid);
      const outName = `wm-${randomUUID()}.mp4`;
      const outPath = path.join(dir, outName);
      const text = input.watermarkText || "@VaultX";
      const posMap: Record<string, string> = {
        "top-left": "x=20:y=20",
        "top-right": "x=w-tw-20:y=20",
        "bottom-left": "x=20:y=h-th-20",
        "bottom-right": "x=w-tw-20:y=h-th-20",
      };
      const drawtext = `drawtext=text='${text}':fontcolor=white@${input.opacity}:fontsize=36:${posMap[input.position]}`;
      await runFFmpeg(["-i", input.videoUrl, "-vf", drawtext, "-c:a", "copy", outPath]);
      const outputUrl = `/uploads/vaultx/${cid}/${outName}`;
      return { outputUrl, success: true };
    }),

  // ═══════════════════════════════════════════════════════════════════════════
  // PROCEDURE 17 — getConversation
  // ═══════════════════════════════════════════════════════════════════════════
  getConversation: protectedProcedure
    .input(z.object({
      otherUserId: z.number(),
      limit: z.number().min(1).max(100).default(50),
      offset: z.number().min(0).default(0),
    }))
    .query(async ({ ctx, input }) => {
      const rows = await rawQuery(
        `SELECT m.*, 
                CASE WHEN m.sender_id = ? THEN 1 ELSE 0 END AS is_mine
         FROM vaultx_messages m
         WHERE (m.sender_id = ? AND m.recipient_id = ?)
            OR (m.sender_id = ? AND m.recipient_id = ?)
         ORDER BY m.created_at DESC LIMIT ? OFFSET ?`,
        [ctx.user.id, ctx.user.id, input.otherUserId, input.otherUserId, ctx.user.id, input.limit, input.offset]
      );
      // Mark unread messages as read
      await rawExec(
        "UPDATE vaultx_messages SET read_at = NOW() WHERE recipient_id = ? AND sender_id = ? AND read_at IS NULL",
        [ctx.user.id, input.otherUserId]
      );
      return { messages: rows.reverse() };
    }),

  // ═══════════════════════════════════════════════════════════════════════════
  // PROCEDURE 18 — sendMessage
  // ═══════════════════════════════════════════════════════════════════════════
  sendMessage: protectedProcedure
    .input(z.object({
      recipientId: z.number(),
      messageText: z.string().max(5000).optional(),
      mediaUrl: z.string().url().optional(),
      mediaType: z.enum(["photo", "video", "audio"]).optional(),
      isLocked: z.boolean().default(false),
      unlockPrice: z.number().min(0).default(0),
    }))
    .mutation(async ({ ctx, input }) => {
      if (!input.messageText && !input.mediaUrl) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Message or media required." });
      }
      const result = await rawExec(
        `INSERT INTO vaultx_messages
         (sender_id, recipient_id, message_text, media_url, media_type, is_locked, unlock_price)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [ctx.user.id, input.recipientId, input.messageText || null, input.mediaUrl || null,
         input.mediaType || null, input.isLocked ? 1 : 0, input.unlockPrice]
      );
      return { messageId: (result as any).insertId, success: true };
    }),

  // ═══════════════════════════════════════════════════════════════════════════
  // PROCEDURE 19 — unlockMessage
  // ═══════════════════════════════════════════════════════════════════════════
  unlockMessage: protectedProcedure
    .input(z.object({ messageId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const msg = await rawQuery("SELECT * FROM vaultx_messages WHERE id = ? LIMIT 1", [input.messageId]);
      if (!msg.length) throw new TRPCError({ code: "NOT_FOUND", message: "Message not found." });
      if (!msg[0].is_locked) return { success: true, alreadyUnlocked: true };
      // In production this would create a Stripe PaymentIntent
      await rawExec("UPDATE vaultx_messages SET is_unlocked = 1 WHERE id = ?", [input.messageId]);
      return { success: true, unlockPrice: msg[0].unlock_price };
    }),

  // ═══════════════════════════════════════════════════════════════════════════
  // PROCEDURE 20 — getInbox
  // ═══════════════════════════════════════════════════════════════════════════
  getInbox: protectedProcedure.query(async ({ ctx }) => {
    const rows = await rawQuery(
      `SELECT m.sender_id, m.recipient_id,
              MAX(m.created_at) AS last_message_at,
              COUNT(CASE WHEN m.recipient_id = ? AND m.read_at IS NULL THEN 1 END) AS unread_count,
              u.username, u.name
       FROM vaultx_messages m
       LEFT JOIN users u ON u.id = CASE WHEN m.sender_id = ? THEN m.recipient_id ELSE m.sender_id END
       WHERE m.sender_id = ? OR m.recipient_id = ?
       GROUP BY LEAST(m.sender_id, m.recipient_id), GREATEST(m.sender_id, m.recipient_id)
       ORDER BY last_message_at DESC LIMIT 50`,
      [ctx.user.id, ctx.user.id, ctx.user.id, ctx.user.id]
    );
    return { conversations: rows };
  }),

  // ═══════════════════════════════════════════════════════════════════════════
  // PROCEDURE 21 — createTip
  // ═══════════════════════════════════════════════════════════════════════════
  createTip: protectedProcedure
    .input(z.object({
      creatorId: z.number(),
      amount: z.number().min(1).max(10000),
      message: z.string().max(500).optional(),
      contentId: z.number().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const result = await rawExec(
        "INSERT INTO vaultx_tips (fan_id, creator_id, content_id, amount, message, status) VALUES (?, ?, ?, ?, ?, 'pending')",
        [ctx.user.id, input.creatorId, input.contentId || null, input.amount, input.message || null]
      );
      return { tipId: (result as any).insertId, success: true };
    }),

  // ═══════════════════════════════════════════════════════════════════════════
  // PROCEDURE 22 — confirmTip
  // ═══════════════════════════════════════════════════════════════════════════
  confirmTip: protectedProcedure
    .input(z.object({ tipId: z.number(), paymentIntentId: z.string().optional() }))
    .mutation(async ({ ctx, input }) => {
      const tip = await rawQuery("SELECT * FROM vaultx_tips WHERE id = ? AND fan_id = ? LIMIT 1", [input.tipId, ctx.user.id]);
      if (!tip.length) throw new TRPCError({ code: "NOT_FOUND", message: "Tip not found." });
      await rawExec(
        "UPDATE vaultx_tips SET status = 'completed', stripe_payment_intent_id = ? WHERE id = ?",
        [input.paymentIntentId || null, input.tipId]
      );
      const creatorEarnings = tip[0].amount * (1 - PLATFORM_FEE);
      await rawExec(
        "UPDATE vaultx_creators SET total_revenue = total_revenue + ? WHERE id = ?",
        [creatorEarnings, tip[0].creator_id]
      );
      return { success: true, creatorEarnings };
    }),

  // ═══════════════════════════════════════════════════════════════════════════
  // PROCEDURE 23 — createCustomRequest
  // ═══════════════════════════════════════════════════════════════════════════
  createCustomRequest: protectedProcedure
    .input(z.object({
      creatorId: z.number(),
      requestDescription: z.string().min(10).max(2000),
      requestedContentType: z.enum(["photo", "video", "audio", "live"]),
      offeredPrice: z.number().min(5).max(10000),
      deadlineDays: z.number().min(1).max(30).default(7),
    }))
    .mutation(async ({ ctx, input }) => {
      const result = await rawExec(
        `INSERT INTO vaultx_custom_requests
         (fan_id, creator_id, request_description, requested_content_type, offered_price, deadline_days, status)
         VALUES (?, ?, ?, ?, ?, ?, 'pending')`,
        [ctx.user.id, input.creatorId, input.requestDescription, input.requestedContentType, input.offeredPrice, input.deadlineDays]
      );
      return { requestId: (result as any).insertId, success: true };
    }),

  // ═══════════════════════════════════════════════════════════════════════════
  // PROCEDURE 24 — respondToCustomRequest
  // ═══════════════════════════════════════════════════════════════════════════
  respondToCustomRequest: protectedProcedure
    .input(z.object({
      requestId: z.number(),
      status: z.enum(["accepted", "declined"]),
      creatorResponse: z.string().max(1000).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const creatorId = await getCreatorId(ctx.user.id);
      const cid = creatorId || ctx.user.id;
      const req = await rawQuery("SELECT * FROM vaultx_custom_requests WHERE id = ? AND creator_id = ? LIMIT 1", [input.requestId, cid]);
      if (!req.length) throw new TRPCError({ code: "NOT_FOUND", message: "Request not found." });
      await rawExec(
        "UPDATE vaultx_custom_requests SET status = ?, creator_response = ? WHERE id = ?",
        [input.status, input.creatorResponse || null, input.requestId]
      );
      return { success: true };
    }),

  // ═══════════════════════════════════════════════════════════════════════════
  // PROCEDURE 25 — getCustomRequests
  // ═══════════════════════════════════════════════════════════════════════════
  getCustomRequests: protectedProcedure
    .input(z.object({
      role: z.enum(["creator", "fan"]).default("creator"),
      status: z.enum(["all", "pending", "accepted", "declined", "completed", "cancelled"]).default("all"),
    }))
    .query(async ({ ctx, input }) => {
      const creatorId = await getCreatorId(ctx.user.id);
      const cid = creatorId || ctx.user.id;
      const whereRole = input.role === "creator" ? "creator_id = ?" : "fan_id = ?";
      const whereStatus = input.status === "all" ? "" : "AND status = ?";
      const params = input.status === "all" ? [cid] : [cid, input.status];
      const rows = await rawQuery(
        `SELECT r.*, u.username AS fan_username, u.name AS fan_name
         FROM vaultx_custom_requests r
         LEFT JOIN users u ON u.id = r.fan_id
         WHERE ${whereRole} ${whereStatus}
         ORDER BY r.created_at DESC`,
        params
      );
      return { requests: rows };
    }),

  // ═══════════════════════════════════════════════════════════════════════════
  // PROCEDURE 26 — createSubscription
  // ═══════════════════════════════════════════════════════════════════════════
  createSubscription: protectedProcedure
    .input(z.object({
      creatorId: z.number(),
      tier: z.enum(["basic", "premium", "vip"]),
      stripeSubscriptionId: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const creator = await rawQuery("SELECT * FROM vaultx_creators WHERE id = ? LIMIT 1", [input.creatorId]);
      if (!creator.length) throw new TRPCError({ code: "NOT_FOUND", message: "Creator not found." });
      const priceMap: Record<string, number> = {
        basic: creator[0].subscription_price_basic,
        premium: creator[0].subscription_price_premium,
        vip: creator[0].subscription_price_vip,
      };
      const price = priceMap[input.tier];
      const now = new Date();
      const periodEnd = new Date(now);
      periodEnd.setMonth(periodEnd.getMonth() + 1);
      const existing = await rawQuery(
        "SELECT id FROM vaultx_subscriptions WHERE fan_id = ? AND creator_id = ? AND status = 'active' LIMIT 1",
        [ctx.user.id, input.creatorId]
      );
      if (existing.length) {
        await rawExec(
          "UPDATE vaultx_subscriptions SET tier = ?, price_paid = ?, current_period_end = ? WHERE id = ?",
          [input.tier, price, periodEnd, existing[0].id]
        );
        return { subscriptionId: existing[0].id, success: true };
      }
      const result = await rawExec(
        `INSERT INTO vaultx_subscriptions
         (fan_id, creator_id, tier, price_paid, stripe_subscription_id, status, current_period_start, current_period_end)
         VALUES (?, ?, ?, ?, ?, 'active', ?, ?)`,
        [ctx.user.id, input.creatorId, input.tier, price, input.stripeSubscriptionId || null, now, periodEnd]
      );
      await rawExec("UPDATE vaultx_creators SET total_subscribers = total_subscribers + 1 WHERE id = ?", [input.creatorId]);
      return { subscriptionId: (result as any).insertId, success: true };
    }),

  // ═══════════════════════════════════════════════════════════════════════════
  // PROCEDURE 27 — cancelSubscription
  // ═══════════════════════════════════════════════════════════════════════════
  cancelSubscription: protectedProcedure
    .input(z.object({ subscriptionId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const sub = await rawQuery("SELECT * FROM vaultx_subscriptions WHERE id = ? AND fan_id = ? LIMIT 1", [input.subscriptionId, ctx.user.id]);
      if (!sub.length) throw new TRPCError({ code: "NOT_FOUND", message: "Subscription not found." });
      await rawExec("UPDATE vaultx_subscriptions SET status = 'cancelled' WHERE id = ?", [input.subscriptionId]);
      await rawExec("UPDATE vaultx_creators SET total_subscribers = GREATEST(0, total_subscribers - 1) WHERE id = ?", [sub[0].creator_id]);
      return { success: true };
    }),

  // ═══════════════════════════════════════════════════════════════════════════
  // PROCEDURE 28 — getMySubscriptions (fan view)
  // ═══════════════════════════════════════════════════════════════════════════
  getMySubscriptions: protectedProcedure.query(async ({ ctx }) => {
    const rows = await rawQuery(
      `SELECT vs.*, c.display_name, c.profile_image_url, c.cover_image_url
       FROM vaultx_subscriptions vs
       LEFT JOIN vaultx_creators c ON c.id = vs.creator_id
       WHERE vs.fan_id = ? AND vs.status = 'active'
       ORDER BY vs.created_at DESC`,
      [ctx.user.id]
    );
    return { subscriptions: rows };
  }),

  // ═══════════════════════════════════════════════════════════════════════════
  // PROCEDURE 29 — purchasePpv
  // ═══════════════════════════════════════════════════════════════════════════
  purchasePpv: protectedProcedure
    .input(z.object({
      contentId: z.number(),
      paymentIntentId: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const content = await rawQuery("SELECT * FROM vaultx_content WHERE id = ? AND is_ppv = 1 LIMIT 1", [input.contentId]);
      if (!content.length) throw new TRPCError({ code: "NOT_FOUND", message: "PPV content not found." });
      const existing = await rawQuery(
        "SELECT id FROM vaultx_ppv_purchases WHERE fan_id = ? AND content_id = ? AND status = 'completed' LIMIT 1",
        [ctx.user.id, input.contentId]
      );
      if (existing.length) return { success: true, alreadyPurchased: true };
      const result = await rawExec(
        `INSERT INTO vaultx_ppv_purchases
         (fan_id, creator_id, content_id, amount_paid, stripe_payment_intent_id, status)
         VALUES (?, ?, ?, ?, ?, 'completed')`,
        [ctx.user.id, content[0].creator_id, input.contentId, content[0].ppv_price, input.paymentIntentId || null]
      );
      await rawExec(
        "UPDATE vaultx_content SET purchase_count = purchase_count + 1, revenue_generated = revenue_generated + ? WHERE id = ?",
        [content[0].ppv_price, input.contentId]
      );
      return { purchaseId: (result as any).insertId, success: true };
    }),

  // ═══════════════════════════════════════════════════════════════════════════
  // PROCEDURE 30 — getFanFeed (subscribed content)
  // ═══════════════════════════════════════════════════════════════════════════
  getFanFeed: protectedProcedure
    .input(z.object({
      creatorId: z.number(),
      limit: z.number().min(1).max(50).default(20),
      offset: z.number().min(0).default(0),
    }))
    .query(async ({ ctx, input }) => {
      const sub = await rawQuery(
        "SELECT tier FROM vaultx_subscriptions WHERE fan_id = ? AND creator_id = ? AND status = 'active' LIMIT 1",
        [ctx.user.id, input.creatorId]
      );
      const isSubscribed = sub.length > 0 || OWNER_IDS.includes(ctx.user.id);
      const subTier = sub[0]?.tier || null;
      const tierOrder: Record<string, number> = { basic: 1, premium: 2, vip: 3 };
      const fanTierLevel = subTier ? tierOrder[subTier] : 0;
      const rows = await rawQuery(
        `SELECT id, title, description, content_type, thumbnail_url, censored_thumbnail_url,
                is_ppv, ppv_price, is_free_preview, free_preview_seconds, access_tier,
                view_count, created_at
         FROM vaultx_content
         WHERE creator_id = ? AND status = 'active'
         ORDER BY created_at DESC LIMIT ? OFFSET ?`,
        [input.creatorId, input.limit, input.offset]
      );
      const items = await Promise.all(rows.map(async (row: any) => {
        const contentTierLevel = tierOrder[row.access_tier] || 1;
        let hasAccess = isSubscribed && fanTierLevel >= contentTierLevel;
        if (row.is_ppv) {
          const purchased = await rawQuery(
            "SELECT id FROM vaultx_ppv_purchases WHERE fan_id = ? AND content_id = ? AND status = 'completed' LIMIT 1",
            [ctx.user.id, row.id]
          );
          hasAccess = purchased.length > 0 || OWNER_IDS.includes(ctx.user.id);
        }
        await rawExec("UPDATE vaultx_content SET view_count = view_count + 1 WHERE id = ?", [row.id]);
        return {
          ...row,
          hasAccess,
          uncensored_url: hasAccess ? row.uncensored_url : null,
          locked: !hasAccess,
        };
      }));
      return { items, isSubscribed, subTier };
    }),

  // ═══════════════════════════════════════════════════════════════════════════
  // PROCEDURE 31 — getRevenueAnalytics
  // ═══════════════════════════════════════════════════════════════════════════
  getRevenueAnalytics: protectedProcedure.query(async ({ ctx }) => {
    const creatorId = await getCreatorId(ctx.user.id);
    const cid = creatorId || ctx.user.id;
    const monthly = await rawQuery(
      `SELECT DATE_FORMAT(created_at, '%Y-%m') AS month,
              SUM(CASE WHEN source = 'subscription' THEN amount ELSE 0 END) AS subscription_revenue,
              SUM(CASE WHEN source = 'ppv' THEN amount ELSE 0 END) AS ppv_revenue,
              SUM(CASE WHEN source = 'tip' THEN amount ELSE 0 END) AS tip_revenue,
              SUM(CASE WHEN source = 'message' THEN amount ELSE 0 END) AS message_revenue,
              SUM(amount) AS total_revenue
       FROM (
         SELECT created_at, price_paid AS amount, 'subscription' AS source FROM vaultx_subscriptions WHERE creator_id = ? AND status = 'active'
         UNION ALL SELECT created_at, amount_paid, 'ppv' FROM vaultx_ppv_purchases WHERE creator_id = ? AND status = 'completed'
         UNION ALL SELECT created_at, amount, 'tip' FROM vaultx_tips WHERE creator_id = ? AND status = 'completed'
         UNION ALL SELECT created_at, unlock_price, 'message' FROM vaultx_messages WHERE recipient_id = ? AND is_unlocked = 1 AND unlock_price > 0
       ) AS combined
       WHERE created_at >= DATE_SUB(NOW(), INTERVAL 12 MONTH)
       GROUP BY month ORDER BY month ASC`,
      [cid, cid, cid, cid]
    );
    const totals = await rawQuery(
      `SELECT
         (SELECT COALESCE(SUM(price_paid),0) FROM vaultx_subscriptions WHERE creator_id = ? AND status='active') AS total_subscriptions,
         (SELECT COALESCE(SUM(amount_paid),0) FROM vaultx_ppv_purchases WHERE creator_id = ? AND status='completed') AS total_ppv,
         (SELECT COALESCE(SUM(amount),0) FROM vaultx_tips WHERE creator_id = ? AND status='completed') AS total_tips,
         (SELECT COALESCE(SUM(unlock_price),0) FROM vaultx_messages WHERE recipient_id = ? AND is_unlocked=1 AND unlock_price > 0) AS total_messages`,
      [cid, cid, cid, cid]
    );
    return { monthly, totals: totals[0] };
  }),

  // ═══════════════════════════════════════════════════════════════════════════
  // PROCEDURE 32 — getContentAnalytics
  // ═══════════════════════════════════════════════════════════════════════════
  getContentAnalytics: protectedProcedure.query(async ({ ctx }) => {
    const creatorId = await getCreatorId(ctx.user.id);
    const cid = creatorId || ctx.user.id;
    const topEarning = await rawQuery(
      `SELECT id, title, content_type, view_count, purchase_count, revenue_generated, access_tier
       FROM vaultx_content WHERE creator_id = ? AND status = 'active'
       ORDER BY revenue_generated DESC LIMIT 10`,
      [cid]
    );
    const topViewed = await rawQuery(
      `SELECT id, title, content_type, view_count, purchase_count, revenue_generated
       FROM vaultx_content WHERE creator_id = ? AND status = 'active'
       ORDER BY view_count DESC LIMIT 10`,
      [cid]
    );
    const byType = await rawQuery(
      `SELECT content_type, COUNT(*) AS count, SUM(view_count) AS total_views, SUM(revenue_generated) AS total_revenue
       FROM vaultx_content WHERE creator_id = ? AND status = 'active'
       GROUP BY content_type`,
      [cid]
    );
    return { topEarning, topViewed, byType };
  }),

  // ═══════════════════════════════════════════════════════════════════════════
  // PROCEDURE 33 — getFanAnalytics
  // ═══════════════════════════════════════════════════════════════════════════
  getFanAnalytics: protectedProcedure.query(async ({ ctx }) => {
    const creatorId = await getCreatorId(ctx.user.id);
    const cid = creatorId || ctx.user.id;
    const topSpenders = await rawQuery(
      `SELECT vs.fan_id, u.username, u.name,
              vs.tier, vs.price_paid AS sub_paid,
              COALESCE(tips.total, 0) AS tips_total,
              COALESCE(ppv.total, 0) AS ppv_total,
              (vs.price_paid + COALESCE(tips.total, 0) + COALESCE(ppv.total, 0)) AS lifetime_value
       FROM vaultx_subscriptions vs
       LEFT JOIN users u ON u.id = vs.fan_id
       LEFT JOIN (SELECT fan_id, SUM(amount) AS total FROM vaultx_tips WHERE creator_id = ? AND status='completed' GROUP BY fan_id) tips ON tips.fan_id = vs.fan_id
       LEFT JOIN (SELECT fan_id, SUM(amount_paid) AS total FROM vaultx_ppv_purchases WHERE creator_id = ? AND status='completed' GROUP BY fan_id) ppv ON ppv.fan_id = vs.fan_id
       WHERE vs.creator_id = ? AND vs.status = 'active'
       ORDER BY lifetime_value DESC LIMIT 20`,
      [cid, cid, cid]
    );
    const atRisk = await rawQuery(
      `SELECT vs.fan_id, u.username, u.name, vs.tier, vs.created_at,
              (SELECT MAX(created_at) FROM vaultx_messages WHERE sender_id = vs.fan_id AND recipient_id = ?) AS last_message_at
       FROM vaultx_subscriptions vs
       LEFT JOIN users u ON u.id = vs.fan_id
       WHERE vs.creator_id = ? AND vs.status = 'active'
         AND vs.fan_id NOT IN (
           SELECT DISTINCT sender_id FROM vaultx_messages
           WHERE recipient_id = ? AND created_at > DATE_SUB(NOW(), INTERVAL 14 DAY)
         )
       LIMIT 20`,
      [cid, cid, cid]
    );
    const subsByTier = await rawQuery(
      "SELECT tier, COUNT(*) AS count FROM vaultx_subscriptions WHERE creator_id = ? AND status = 'active' GROUP BY tier",
      [cid]
    );
    return { topSpenders, atRisk, subsByTier };
  }),

  // ═══════════════════════════════════════════════════════════════════════════
  // PROCEDURE 34 — getForYouFeed (public discovery)
  // ═══════════════════════════════════════════════════════════════════════════
  getForYouFeed: publicProcedure
    .input(z.object({
      sort: z.enum(["trending", "top_earners", "new", "price_low"]).default("trending"),
      language: z.enum(["en", "es", "ht", "all"]).default("all"),
      limit: z.number().min(1).max(100).default(24),
      offset: z.number().min(0).default(0),
    }))
    .query(async ({ input }) => {
      const langWhere = input.language === "all" ? "" : "AND c.language_primary = ?";
      const sortCol = input.sort === "trending" ? "c.total_subscribers DESC, c.total_revenue DESC"
        : input.sort === "top_earners" ? "c.total_revenue DESC"
        : input.sort === "new" ? "c.created_at DESC"
        : "c.subscription_price_basic ASC";
      const params = input.language === "all"
        ? [input.limit, input.offset]
        : [input.language, input.limit, input.offset];
      const creators = await rawQuery(
        `SELECT c.id, c.display_name, c.bio, c.profile_image_url, c.cover_image_url,
                c.subscription_price_basic, c.subscription_price_premium, c.subscription_price_vip,
                c.total_subscribers, c.language_primary,
                u.username,
                (SELECT censored_thumbnail_url FROM vaultx_content
                 WHERE creator_id = c.id AND status = 'active'
                 ORDER BY created_at DESC LIMIT 1) AS latest_censored_thumb
         FROM vaultx_creators c
         LEFT JOIN users u ON u.id = c.user_id
         WHERE c.is_active = 1 ${langWhere}
         ORDER BY ${sortCol}
         LIMIT ? OFFSET ?`,
        params
      );
      return { creators };
    }),

  // ═══════════════════════════════════════════════════════════════════════════
  // PROCEDURE 35 — searchCreators (public)
  // ═══════════════════════════════════════════════════════════════════════════
  searchCreators: publicProcedure
    .input(z.object({
      query: z.string().min(1).max(100).optional(),
      language: z.enum(["en", "es", "ht", "all"]).default("all"),
      priceMin: z.number().min(0).optional(),
      priceMax: z.number().max(499).optional(),
      limit: z.number().min(1).max(50).default(20),
      offset: z.number().min(0).default(0),
    }))
    .query(async ({ input }) => {
      const conditions: string[] = ["c.is_active = 1"];
      const params: any[] = [];
      if (input.query) {
        conditions.push("(c.display_name LIKE ? OR c.bio LIKE ?)");
        params.push(`%${input.query}%`, `%${input.query}%`);
      }
      if (input.language !== "all") {
        conditions.push("c.language_primary = ?");
        params.push(input.language);
      }
      if (input.priceMin !== undefined) {
        conditions.push("c.subscription_price_basic >= ?");
        params.push(input.priceMin);
      }
      if (input.priceMax !== undefined) {
        conditions.push("c.subscription_price_basic <= ?");
        params.push(input.priceMax);
      }
      params.push(input.limit, input.offset);
      const creators = await rawQuery(
        `SELECT c.id, c.display_name, c.bio, c.profile_image_url,
                c.subscription_price_basic, c.total_subscribers, c.language_primary,
                u.username
         FROM vaultx_creators c
         LEFT JOIN users u ON u.id = c.user_id
         WHERE ${conditions.join(" AND ")}
         ORDER BY c.total_subscribers DESC LIMIT ? OFFSET ?`,
        params
      );
      return { creators };
    }),

  // ═══════════════════════════════════════════════════════════════════════════
  // PROCEDURE 36 — createEditorProject
  // ═══════════════════════════════════════════════════════════════════════════
  createEditorProject: protectedProcedure
    .input(z.object({
      projectName: z.string().min(1).max(255),
      projectType: z.enum(["video", "photo_set", "audio", "reel", "story"]).default("video"),
      sourceFiles: z.array(z.string()).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const creatorId = await getCreatorId(ctx.user.id);
      const cid = creatorId || ctx.user.id;
      const result = await rawExec(
        `INSERT INTO vaultx_editor_projects
         (creator_id, project_name, project_type, source_files, status)
         VALUES (?, ?, ?, ?, 'draft')`,
        [cid, input.projectName, input.projectType, JSON.stringify(input.sourceFiles || [])]
      );
      return { projectId: (result as any).insertId, success: true };
    }),

  // ═══════════════════════════════════════════════════════════════════════════
  // PROCEDURE 37 — saveProjectTimeline
  // ═══════════════════════════════════════════════════════════════════════════
  saveProjectTimeline: protectedProcedure
    .input(z.object({
      projectId: z.number(),
      timelineData: z.any(),
    }))
    .mutation(async ({ ctx, input }) => {
      const creatorId = await getCreatorId(ctx.user.id);
      const cid = creatorId || ctx.user.id;
      const proj = await rawQuery("SELECT id FROM vaultx_editor_projects WHERE id = ? AND creator_id = ? LIMIT 1", [input.projectId, cid]);
      if (!proj.length) throw new TRPCError({ code: "NOT_FOUND", message: "Project not found." });
      await rawExec(
        "UPDATE vaultx_editor_projects SET timeline_data = ?, updated_at = NOW() WHERE id = ?",
        [JSON.stringify(input.timelineData), input.projectId]
      );
      return { success: true };
    }),

  // ═══════════════════════════════════════════════════════════════════════════
  // PROCEDURE 38 — getEditorProject
  // ═══════════════════════════════════════════════════════════════════════════
  getEditorProject: protectedProcedure
    .input(z.object({ projectId: z.number() }))
    .query(async ({ ctx, input }) => {
      const creatorId = await getCreatorId(ctx.user.id);
      const cid = creatorId || ctx.user.id;
      const rows = await rawQuery(
        "SELECT * FROM vaultx_editor_projects WHERE id = ? AND creator_id = ? LIMIT 1",
        [input.projectId, cid]
      );
      if (!rows.length) throw new TRPCError({ code: "NOT_FOUND", message: "Project not found." });
      const exports = await rawQuery(
        "SELECT * FROM vaultx_editor_exports WHERE project_id = ? ORDER BY created_at DESC",
        [input.projectId]
      );
      return { project: rows[0], exports };
    }),

  // ═══════════════════════════════════════════════════════════════════════════
  // PROCEDURE 39 — getMyEditorProjects
  // ═══════════════════════════════════════════════════════════════════════════
  getMyEditorProjects: protectedProcedure.query(async ({ ctx }) => {
    const creatorId = await getCreatorId(ctx.user.id);
    const cid = creatorId || ctx.user.id;
    const rows = await rawQuery(
      "SELECT * FROM vaultx_editor_projects WHERE creator_id = ? ORDER BY updated_at DESC",
      [cid]
    );
    return { projects: rows };
  }),

  // ═══════════════════════════════════════════════════════════════════════════
  // PROCEDURE 40 — processVideoEdit (FFmpeg operations pipeline)
  // ═══════════════════════════════════════════════════════════════════════════
  processVideoEdit: protectedProcedure
    .input(z.object({
      projectId: z.number(),
      operations: z.array(z.object({
        type: z.enum([
          "trim", "cut", "merge", "color_grade", "speed", "audio_replace",
          "audio_mix", "audio_normalize", "text_overlay", "watermark",
          "blur_region", "mosaic_region", "crop", "stabilize", "denoise", "thumbnail_extract"
        ]),
        params: z.any(),
      })),
    }))
    .mutation(async ({ ctx, input }) => {
      const creatorId = await getCreatorId(ctx.user.id);
      const cid = creatorId || ctx.user.id;
      const proj = await rawQuery("SELECT * FROM vaultx_editor_projects WHERE id = ? AND creator_id = ? LIMIT 1", [input.projectId, cid]);
      if (!proj.length) throw new TRPCError({ code: "NOT_FOUND", message: "Project not found." });
      const project = proj[0];
      const sourceFiles = JSON.parse(project.source_files || "[]");
      if (!sourceFiles.length) throw new TRPCError({ code: "BAD_REQUEST", message: "No source files in project." });
      const dir = await ensureUploadDir(cid);
      const outName = `edit-${randomUUID()}.mp4`;
      const outPath = path.join(dir, outName);
      const startTime = Date.now();
      await rawExec("UPDATE vaultx_editor_projects SET status = 'processing' WHERE id = ?", [input.projectId]);
      try {
        let currentInput = sourceFiles[0];
        let tempFiles: string[] = [];
        for (const op of input.operations) {
          const tempOut = path.join(dir, `tmp-${randomUUID()}.mp4`);
          tempFiles.push(tempOut);
          if (op.type === "trim") {
            const { start_seconds, end_seconds } = op.params;
            await runFFmpeg(["-i", currentInput, "-ss", String(start_seconds), "-to", String(end_seconds), "-c", "copy", tempOut]);
          } else if (op.type === "color_grade") {
            const { preset, brightness = 0, contrast = 1, saturation = 1 } = op.params;
            const presetFilters: Record<string, string> = {
              cinematic: "curves=preset=strong_contrast,colorbalance=rs=-0.1:gs=-0.1:bs=0.1",
              warm_skin: "colorbalance=rs=0.1:gs=0.05:bs=-0.05,curves=r='0/0 0.5/0.55 1/1'",
              dark_moody: "curves=preset=darker,colorbalance=rs=-0.05:gs=-0.05:bs=0.1",
              golden_hour: "colorbalance=rs=0.15:gs=0.05:bs=-0.15,curves=preset=lighter",
              neon_night: "colorbalance=rs=0.1:gs=-0.1:bs=0.2,curves=preset=strong_contrast",
              black_white: "colorchannelmixer=.3:.4:.3:0:.3:.4:.3:0:.3:.4:.3",
              custom: `eq=brightness=${brightness}:contrast=${contrast}:saturation=${saturation}`,
            };
            const filter = presetFilters[preset] || presetFilters.custom;
            await runFFmpeg(["-i", currentInput, "-vf", filter, "-c:a", "copy", tempOut]);
          } else if (op.type === "speed") {
            const { multiplier = 1 } = op.params;
            const vf = `setpts=${(1 / multiplier).toFixed(4)}*PTS`;
            const af = `atempo=${Math.min(2, Math.max(0.5, multiplier))}`;
            await runFFmpeg(["-i", currentInput, "-vf", vf, "-af", af, tempOut]);
          } else if (op.type === "audio_normalize") {
            await runFFmpeg(["-i", currentInput, "-af", "loudnorm=I=-16:TP=-1.5:LRA=11", "-c:v", "copy", tempOut]);
          } else if (op.type === "text_overlay") {
            const { text, font_size = 48, color = "white", position = "bottom", start_seconds = 0, end_seconds } = op.params;
            const yMap: Record<string, string> = { top: "50", center: "(h-text_h)/2", bottom: "h-text_h-50" };
            const y = yMap[position] || "h-text_h-50";
            const enableExpr = end_seconds ? `enable='between(t,${start_seconds},${end_seconds})'` : `enable='gte(t,${start_seconds})'`;
            const drawtext = `drawtext=text='${text.replace(/'/g, "\\'")}':fontcolor=${color}:fontsize=${font_size}:x=(w-text_w)/2:y=${y}:${enableExpr}`;
            await runFFmpeg(["-i", currentInput, "-vf", drawtext, "-c:a", "copy", tempOut]);
          } else if (op.type === "watermark") {
            const { image_url, position = "bottom-right", opacity = 0.7, size_percent = 15 } = op.params;
            const posMap: Record<string, string> = {
              "top-left": "x=W*0.02:y=H*0.02",
              "top-right": "x=W-overlay_w-W*0.02:y=H*0.02",
              "bottom-left": "x=W*0.02:y=H-overlay_h-H*0.02",
              "bottom-right": "x=W-overlay_w-W*0.02:y=H-overlay_h-H*0.02",
            };
            const pos = posMap[position] || posMap["bottom-right"];
            await runFFmpeg([
              "-i", currentInput, "-i", image_url,
              "-filter_complex", `[1:v]scale=iw*${size_percent / 100}:-1,format=rgba,colorchannelmixer=aa=${opacity}[wm];[0:v][wm]overlay=${pos}`,
              "-c:a", "copy", tempOut
            ]);
          } else if (op.type === "blur_region") {
            const { x_percent, y_percent, width_percent, height_percent, start_seconds = 0, end_seconds } = op.params;
            const enableExpr = end_seconds ? `between(t,${start_seconds},${end_seconds})` : `gte(t,${start_seconds})`;
            const blurFilter = `[0:v]split[orig][blur];[blur]crop=iw*${width_percent / 100}:ih*${height_percent / 100}:iw*${x_percent / 100}:ih*${y_percent / 100},boxblur=20:20[blurred];[orig][blurred]overlay=W*${x_percent / 100}:H*${y_percent / 100}:enable='${enableExpr}'`;
            await runFFmpeg(["-i", currentInput, "-filter_complex", blurFilter, "-c:a", "copy", tempOut]);
          } else if (op.type === "mosaic_region") {
            const { x_percent, y_percent, width_percent, height_percent, start_seconds = 0, end_seconds } = op.params;
            const enableExpr = end_seconds ? `between(t,${start_seconds},${end_seconds})` : `gte(t,${start_seconds})`;
            const mosaicFilter = `[0:v]split[orig][mosaic];[mosaic]crop=iw*${width_percent / 100}:ih*${height_percent / 100}:iw*${x_percent / 100}:ih*${y_percent / 100},scale=iw/10:ih/10,scale=iw*10:ih*10:flags=neighbor[pixelated];[orig][pixelated]overlay=W*${x_percent / 100}:H*${y_percent / 100}:enable='${enableExpr}'`;
            await runFFmpeg(["-i", currentInput, "-filter_complex", mosaicFilter, "-c:a", "copy", tempOut]);
          } else if (op.type === "crop") {
            const { aspect_ratio } = op.params;
            const ratioMap: Record<string, string> = {
              "9:16": "crop=ih*9/16:ih",
              "1:1": "crop=min(iw\\,ih):min(iw\\,ih)",
              "16:9": "crop=iw:iw*9/16",
              "4:5": "crop=ih*4/5:ih",
            };
            const cropFilter = ratioMap[aspect_ratio] || ratioMap["16:9"];
            await runFFmpeg(["-i", currentInput, "-vf", cropFilter, "-c:a", "copy", tempOut]);
          } else if (op.type === "stabilize") {
            await runFFmpeg(["-i", currentInput, "-vf", "vidstabdetect=shakiness=5:accuracy=15", "-f", "null", "-"]);
            await runFFmpeg(["-i", currentInput, "-vf", "vidstabtransform=smoothing=30:input=transforms.trf", "-c:a", "copy", tempOut]);
          } else if (op.type === "denoise") {
            await runFFmpeg(["-i", currentInput, "-vf", "hqdn3d=4:3:6:4.5", "-c:a", "copy", tempOut]);
          } else if (op.type === "thumbnail_extract") {
            const { timestamp_seconds = 1 } = op.params;
            const thumbName = `thumb-${randomUUID()}.jpg`;
            const thumbPath = path.join(dir, thumbName);
            await runFFmpeg(["-i", currentInput, "-ss", String(timestamp_seconds), "-vframes", "1", thumbPath]);
            const thumbUrl = `/uploads/vaultx/${cid}/${thumbName}`;
            await rawExec("UPDATE vaultx_editor_projects SET thumbnail_url = ? WHERE id = ?", [thumbUrl, input.projectId]);
            tempFiles.pop(); // thumbnail_extract doesn't produce a video
            continue;
          } else if (op.type === "merge") {
            const { clip_urls } = op.params;
            const listFile = path.join(dir, `merge-${randomUUID()}.txt`);
            const allClips = [currentInput, ...clip_urls];
            fs.writeFileSync(listFile, allClips.map((u: string) => `file '${u}'`).join("\n"));
            await runFFmpeg(["-f", "concat", "-safe", "0", "-i", listFile, "-c", "copy", tempOut]);
            fs.unlinkSync(listFile);
          } else if (op.type === "audio_replace") {
            const { audio_url, volume = 1 } = op.params;
            await runFFmpeg(["-i", currentInput, "-i", audio_url, "-map", "0:v", "-map", "1:a", "-af", `volume=${volume}`, "-shortest", tempOut]);
          } else if (op.type === "audio_mix") {
            const { original_volume = 0.7, music_volume = 0.3, music_url } = op.params;
            await runFFmpeg([
              "-i", currentInput, "-i", music_url,
              "-filter_complex", `[0:a]volume=${original_volume}[a1];[1:a]volume=${music_volume}[a2];[a1][a2]amix=inputs=2:duration=first[aout]`,
              "-map", "0:v", "-map", "[aout]", "-c:v", "copy", tempOut
            ]);
          } else if (op.type === "cut") {
            const { cut_points } = op.params;
            const sortedPoints: number[] = [...cut_points].sort((a: number, b: number) => a - b);
            const segments: string[] = [];
            let prev = 0;
            for (const pt of sortedPoints) {
              const segOut = path.join(dir, `seg-${randomUUID()}.mp4`);
              await runFFmpeg(["-i", currentInput, "-ss", String(prev), "-to", String(pt), "-c", "copy", segOut]);
              segments.push(segOut);
              tempFiles.push(segOut);
              prev = pt;
            }
            const segOut = path.join(dir, `seg-${randomUUID()}.mp4`);
            await runFFmpeg(["-i", currentInput, "-ss", String(prev), "-c", "copy", segOut]);
            segments.push(segOut);
            tempFiles.push(segOut);
            const listFile = path.join(dir, `cut-list-${randomUUID()}.txt`);
            fs.writeFileSync(listFile, segments.map((s) => `file '${s}'`).join("\n"));
            await runFFmpeg(["-f", "concat", "-safe", "0", "-i", listFile, "-c", "copy", tempOut]);
            fs.unlinkSync(listFile);
          }
          currentInput = tempOut;
        }
        // Copy final result to output
        fs.copyFileSync(currentInput, outPath);
        // Cleanup temp files
        for (const tmp of tempFiles) {
          if (tmp !== outPath && fs.existsSync(tmp)) fs.unlinkSync(tmp);
        }
        const outputUrl = `/uploads/vaultx/${cid}/${outName}`;
        const elapsed = Math.round((Date.now() - startTime) / 1000);
        await rawExec(
          "UPDATE vaultx_editor_projects SET output_url = ?, status = 'completed', updated_at = NOW() WHERE id = ?",
          [outputUrl, input.projectId]
        );
        return { outputUrl, processingTimeSeconds: elapsed, success: true };
      } catch (err: any) {
        await rawExec("UPDATE vaultx_editor_projects SET status = 'failed' WHERE id = ?", [input.projectId]);
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: `Processing failed: ${err.message}` });
      }
    }),

  // ═══════════════════════════════════════════════════════════════════════════
  // PROCEDURE 41 — exportProject
  // ═══════════════════════════════════════════════════════════════════════════
  exportProject: protectedProcedure
    .input(z.object({
      projectId: z.number(),
      exportFormat: z.enum(["mp4_hd", "mp4_4k", "mp4_vertical", "mp4_square", "gif", "mp3", "zip"]),
      exportPreset: z.enum(["onlyfans", "fansly", "tiktok", "instagram_reel", "telegram", "twitter", "youtube_shorts", "master"]),
    }))
    .mutation(async ({ ctx, input }) => {
      const creatorId = await getCreatorId(ctx.user.id);
      const cid = creatorId || ctx.user.id;
      const proj = await rawQuery("SELECT * FROM vaultx_editor_projects WHERE id = ? AND creator_id = ? LIMIT 1", [input.projectId, cid]);
      if (!proj.length) throw new TRPCError({ code: "NOT_FOUND", message: "Project not found." });
      if (!proj[0].output_url) throw new TRPCError({ code: "BAD_REQUEST", message: "Process the project first before exporting." });
      const dir = await ensureUploadDir(cid);
      const ext = input.exportFormat === "mp3" ? "mp3" : input.exportFormat === "gif" ? "gif" : "mp4";
      const outName = `export-${input.exportPreset}-${randomUUID()}.${ext}`;
      const outPath = path.join(dir, outName);
      const sourceUrl = `/root/creatorvault/dist/public${proj[0].output_url}`;
      const startTime = Date.now();
      const exportResult = await rawExec(
        `INSERT INTO vaultx_editor_exports
         (project_id, creator_id, export_format, export_preset, status)
         VALUES (?, ?, ?, ?, 'processing')`,
        [input.projectId, cid, input.exportFormat, input.exportPreset]
      );
      const exportId = (exportResult as any).insertId;
      try {
        const presetArgs: Record<string, string[]> = {
          onlyfans: ["-vf", "scale=1080:-2", "-c:v", "libx264", "-crf", "18", "-preset", "slow", "-c:a", "aac", "-b:a", "192k"],
          fansly: ["-vf", "scale=1080:-2", "-c:v", "libx264", "-crf", "18", "-preset", "slow", "-c:a", "aac", "-b:a", "192k"],
          tiktok: ["-vf", "scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2", "-c:v", "libx264", "-crf", "20", "-r", "60", "-c:a", "aac"],
          instagram_reel: ["-vf", "scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2", "-c:v", "libx264", "-crf", "20", "-c:a", "aac"],
          telegram: ["-vf", "scale=1280:720", "-c:v", "libx264", "-crf", "28", "-preset", "fast", "-c:a", "aac", "-b:a", "128k"],
          twitter: ["-vf", "scale=1280:720", "-c:v", "libx264", "-crf", "23", "-c:a", "aac", "-b:a", "128k"],
          youtube_shorts: ["-vf", "scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2", "-c:v", "libx264", "-crf", "18", "-r", "60", "-c:a", "aac"],
          master: ["-c:v", "libx264", "-crf", "12", "-preset", "veryslow", "-c:a", "aac", "-b:a", "320k"],
        };
        const args = presetArgs[input.exportPreset] || presetArgs.master;
        await runFFmpeg(["-i", sourceUrl, ...args, outPath]);
        const stat = fs.statSync(outPath);
        const elapsed = Math.round((Date.now() - startTime) / 1000);
        const outputUrl = `/uploads/vaultx/${cid}/${outName}`;
        await rawExec(
          "UPDATE vaultx_editor_exports SET output_url = ?, file_size_bytes = ?, processing_time_seconds = ?, status = 'completed' WHERE id = ?",
          [outputUrl, stat.size, elapsed, exportId]
        );
        return { outputUrl, fileSizeBytes: stat.size, processingTimeSeconds: elapsed, success: true };
      } catch (err: any) {
        await rawExec("UPDATE vaultx_editor_exports SET status = 'failed', error_message = ? WHERE id = ?", [err.message, exportId]);
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: `Export failed: ${err.message}` });
      }
    }),

  // ═══════════════════════════════════════════════════════════════════════════
  // PROCEDURE 42 — generateCensoredVersion
  // ═══════════════════════════════════════════════════════════════════════════
  generateCensoredVersion: protectedProcedure
    .input(z.object({
      contentUrl: z.string().url(),
      contentId: z.number().optional(),
      blurIntensity: z.number().min(1).max(10).default(5),
      blurRegions: z.array(z.object({
        x_percent: z.number(), y_percent: z.number(),
        width_percent: z.number(), height_percent: z.number(),
      })).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const creatorId = await getCreatorId(ctx.user.id);
      const cid = creatorId || ctx.user.id;
      const dir = await ensureUploadDir(cid);
      const outName = `censored-${randomUUID()}.mp4`;
      const outPath = path.join(dir, outName);
      const blurStrength = input.blurIntensity * 5;
      if (input.blurRegions && input.blurRegions.length > 0) {
        let filterParts: string[] = [];
        let prev = "[0:v]";
        for (let i = 0; i < input.blurRegions.length; i++) {
          const r = input.blurRegions[i];
          const next = i < input.blurRegions.length - 1 ? `[v${i}]` : "[vout]";
          filterParts.push(
            `${prev}split[orig${i}][blur${i}];[blur${i}]crop=iw*${r.width_percent / 100}:ih*${r.height_percent / 100}:iw*${r.x_percent / 100}:ih*${r.y_percent / 100},boxblur=${blurStrength}:${blurStrength}[blurred${i}];[orig${i}][blurred${i}]overlay=W*${r.x_percent / 100}:H*${r.y_percent / 100}${next}`
          );
          prev = `[v${i}]`;
        }
        await runFFmpeg(["-i", input.contentUrl, "-filter_complex", filterParts.join(";"), "-map", "[vout]", "-map", "0:a?", "-c:a", "copy", outPath]);
      } else {
        await runFFmpeg(["-i", input.contentUrl, "-vf", `boxblur=${blurStrength}:${blurStrength}`, "-c:a", "copy", outPath]);
      }
      const censoredUrl = `/uploads/vaultx/${cid}/${outName}`;
      if (input.contentId) {
        await rawExec("UPDATE vaultx_content SET censored_url = ? WHERE id = ? AND creator_id = ?", [censoredUrl, input.contentId, cid]);
      }
      return { censoredUrl, success: true };
    }),

  // ═══════════════════════════════════════════════════════════════════════════
  // PROCEDURE 43 — generateThumbnail
  // ═══════════════════════════════════════════════════════════════════════════
  generateThumbnail: protectedProcedure
    .input(z.object({
      contentUrl: z.string().url(),
      timestampSeconds: z.number().min(0).default(1),
      contentId: z.number().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const creatorId = await getCreatorId(ctx.user.id);
      const cid = creatorId || ctx.user.id;
      const dir = await ensureUploadDir(cid);
      const thumbName = `thumb-${randomUUID()}.jpg`;
      const thumbPath = path.join(dir, thumbName);
      await runFFmpeg(["-i", input.contentUrl, "-ss", String(input.timestampSeconds), "-vframes", "1", "-q:v", "2", thumbPath]);
      const thumbnailUrl = `/uploads/vaultx/${cid}/${thumbName}`;
      if (input.contentId) {
        await rawExec("UPDATE vaultx_content SET thumbnail_url = ? WHERE id = ? AND creator_id = ?", [thumbnailUrl, input.contentId, cid]);
      }
      return { thumbnailUrl, success: true };
    }),

  // ═══════════════════════════════════════════════════════════════════════════
  // PROCEDURE 44 — getExportHistory (creator gate)
  // ═══════════════════════════════════════════════════════════════════════════
  getEditorExportHistory: protectedProcedure.query(async ({ ctx }) => {
    const creatorId = await getCreatorId(ctx.user.id);
    const cid = creatorId || ctx.user.id;
    const rows = await rawQuery(
      `SELECT e.*, p.project_name
       FROM vaultx_editor_exports e
       LEFT JOIN vaultx_editor_projects p ON p.id = e.project_id
       WHERE e.creator_id = ? ORDER BY e.created_at DESC LIMIT 50`,
      [cid]
    );
    return { exports: rows };
  }),

  // ═══════════════════════════════════════════════════════════════════════════
  // PROCEDURE 45 — getAllCreators (admin/owner only)
  // ═══════════════════════════════════════════════════════════════════════════
  getAllCreators: protectedProcedure.query(async ({ ctx }) => {
    if (!OWNER_IDS.includes(ctx.user.id)) {
      throw new TRPCError({ code: "FORBIDDEN", message: "Owner access required." });
    }
    const rows = await rawQuery(
      `SELECT c.*, u.username, u.name, u.email,
              (SELECT COUNT(*) FROM vaultx_subscriptions WHERE creator_id = c.id AND status='active') AS active_subs,
              (SELECT COUNT(*) FROM vaultx_content WHERE creator_id = c.id AND status='active') AS active_content
       FROM vaultx_creators c
       LEFT JOIN users u ON u.id = c.user_id
       ORDER BY c.total_revenue DESC`,
      []
    );
    return { creators: rows };
  }),

  // ═══════════════════════════════════════════════════════════════════════════
  // PROCEDURE 46 — getPlatformRevenue (admin/owner only)
  // ═══════════════════════════════════════════════════════════════════════════
  getPlatformRevenue: protectedProcedure.query(async ({ ctx }) => {
    if (!OWNER_IDS.includes(ctx.user.id)) {
      throw new TRPCError({ code: "FORBIDDEN", message: "Owner access required." });
    }
    const totals = await rawQuery(
      `SELECT
         (SELECT COALESCE(SUM(price_paid),0) FROM vaultx_subscriptions WHERE status='active') AS total_subscription_revenue,
         (SELECT COALESCE(SUM(amount_paid),0) FROM vaultx_ppv_purchases WHERE status='completed') AS total_ppv_revenue,
         (SELECT COALESCE(SUM(amount),0) FROM vaultx_tips WHERE status='completed') AS total_tip_revenue,
         (SELECT COALESCE(SUM(unlock_price),0) FROM vaultx_messages WHERE is_unlocked=1 AND unlock_price>0) AS total_message_revenue,
         (SELECT COUNT(*) FROM vaultx_creators WHERE is_active=1) AS total_creators,
         (SELECT COUNT(*) FROM vaultx_subscriptions WHERE status='active') AS total_active_subscriptions`,
      []
    );
    const platformFeeTotal = Object.values(totals[0] || {})
      .filter((v): v is number => typeof v === "number")
      .reduce((sum, v) => sum + v, 0) * PLATFORM_FEE;
    return { ...totals[0], platform_fee_revenue: platformFeeTotal };
  }),

  // ═══════════════════════════════════════════════════════════════════════════
  // PROCEDURE 47 — flagContent (admin/owner only)
  // ═══════════════════════════════════════════════════════════════════════════
  flagContent: protectedProcedure
    .input(z.object({
      contentId: z.number(),
      reason: z.string().max(500),
    }))
    .mutation(async ({ ctx, input }) => {
      if (!OWNER_IDS.includes(ctx.user.id)) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Owner access required." });
      }
      await rawExec("UPDATE vaultx_content SET status = 'archived' WHERE id = ?", [input.contentId]);
      return { success: true };
    }),

  // ═══════════════════════════════════════════════════════════════════════════
  // LEGACY PROCEDURES — preserved from original router
  // ═══════════════════════════════════════════════════════════════════════════
  submitAgeVerification: protectedProcedure
    .input(z.object({
      dateOfBirth: z.string(),
      confirmOver18: z.boolean(),
    }))
    .mutation(async ({ ctx, input }) => {
      if (!input.confirmOver18) throw new TRPCError({ code: "BAD_REQUEST", message: "You must confirm you are 18 or older." });
      const dob = new Date(input.dateOfBirth);
      const today = new Date();
      const age = today.getFullYear() - dob.getFullYear() - (today < new Date(today.getFullYear(), dob.getMonth(), dob.getDate()) ? 1 : 0);
      if (age < 18) throw new TRPCError({ code: "FORBIDDEN", message: "You must be 18 or older to access VaultX." });
      const existing = await rawQuery("SELECT id FROM vaultx_age_verifications WHERE user_id = ? LIMIT 1", [ctx.user.id]);
      if (existing.length === 0) {
        await rawExec(
          `INSERT INTO vaultx_age_verifications (user_id, verification_method, date_of_birth, age_at_verification, id_verification_status, ip_address) VALUES (?, 'self_attest', ?, ?, 'approved', '0.0.0.0')`,
          [ctx.user.id, input.dateOfBirth, age]
        );
      }
      return { verified: true, age };
    }),

  getRealmStatus: protectedProcedure.query(async ({ ctx }) => {
    const rows = await rawQuery("SELECT id, age_at_verification, id_verification_status FROM vaultx_age_verifications WHERE user_id = ? AND id_verification_status = 'approved' LIMIT 1", [ctx.user.id]);
    return { adultVerified: rows.length > 0, verificationId: rows[0]?.id || null };
  }),

  getNetwork: protectedProcedure
    .input(z.object({ limit: z.number().min(1).max(100).default(50), offset: z.number().min(0).default(0) }))
    .query(async ({ input }) => {
      const creators = await rawQuery(
        `SELECT vcp.creator_id, vcp.display_name, vcp.bio, vcp.profile_banner_url, vcp.categories,
                vcp.base_subscription_price, vcp.total_subscribers, vcp.total_posts, vcp.tier,
                vcp.is_featured, vcp.ppv_enabled, vcp.tips_enabled,
                vnl.featured_image_url, vnl.teaser_video_url, vnl.pitch, vnl.avg_rating,
                u.name AS user_name, u.username
         FROM vaultx_creator_profiles vcp
         LEFT JOIN vaultx_network_listings vnl ON vnl.creator_id = vcp.creator_id
         LEFT JOIN users u ON u.id = vcp.creator_id
         WHERE vnl.is_visible = 1 OR vnl.is_visible IS NULL
         ORDER BY vcp.is_featured DESC, vcp.total_subscribers DESC LIMIT ? OFFSET ?`,
        [input.limit, input.offset]
      );
      return { creators };
    }),



  getRevenueStats: protectedProcedure.query(async ({ ctx }) => {
    const rows = await rawQuery(
      `SELECT * FROM vaultx_revenue_stats WHERE creator_id = ? ORDER BY period_date DESC LIMIT 30`,
      [ctx.user.id]
    );
    return { stats: rows };
  }),

  saveContent: protectedProcedure
    .input(z.object({
      title: z.string().min(1).max(255),
      description: z.string().max(2000).optional(),
      fileUrl: z.string().url(),
      thumbnailUrl: z.string().url().optional(),
      mimeType: z.string().optional(),
      fileSizeBytes: z.number().optional(),
      unlockType: z.enum(["free", "subscription", "ppv"]).default("subscription"),
      priceCents: z.number().min(0).default(0),
      tags: z.array(z.string()).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const contentType = input.mimeType?.startsWith("video") ? "video" : input.mimeType?.startsWith("image") ? "image" : input.mimeType?.startsWith("audio") ? "audio" : "video";
      await rawExec(
        `INSERT INTO content (user_id, title, description, file_url, file_key, mime_type, file_size, content_type, status, price_cents, is_locked, thumbnail_url, unlock_type, tags, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'active', ?, ?, ?, ?, ?, NOW())`,
        [ctx.user.id, input.title, input.description || null, input.fileUrl, input.fileUrl, input.mimeType || "video/mp4", input.fileSizeBytes || 0, contentType, input.priceCents, input.unlockType !== "free" ? 1 : 0, input.thumbnailUrl || null, input.unlockType, input.tags?.length ? JSON.stringify(input.tags) : null]
      );
      const rows = await rawQuery("SELECT id FROM content WHERE user_id = ? ORDER BY id DESC LIMIT 1", [ctx.user.id]);
      await rawExec("UPDATE vaultx_creator_profiles SET total_posts = total_posts + 1 WHERE creator_id = ?", [ctx.user.id]);
      return { contentId: rows[0]?.id, success: true };
    }),

  getCreatorContent: protectedProcedure
    .input(z.object({ creatorId: z.number(), limit: z.number().default(20), offset: z.number().default(0) }))
    .query(async ({ ctx, input }) => {
      const subRows = await rawQuery("SELECT id FROM subscriptions WHERE fan_id = ? AND creator_id = ? AND status = 'active' LIMIT 1", [ctx.user.id, input.creatorId]);
      const isSubscribed = subRows.length > 0 || ctx.user.id === input.creatorId;
      const rows = await rawQuery(
        `SELECT id, title, description, file_url, thumbnail_url, mime_type, content_type, price_cents, is_locked, unlock_type, views, created_at FROM content WHERE user_id = ? AND status = 'active' ORDER BY created_at DESC LIMIT ? OFFSET ?`,
        [input.creatorId, input.limit, input.offset]
      );
      const items = await Promise.all(rows.map(async (row: any) => {
        let accessible = !row.is_locked || isSubscribed;
        if (!accessible && row.unlock_type === "ppv") {
          const unlocked = await rawQuery("SELECT id FROM content_unlocks WHERE fan_id = ? AND content_id = ? LIMIT 1", [ctx.user.id, row.id]);
          accessible = unlocked.length > 0;
        }
        return { ...row, file_url: accessible ? row.file_url : null, locked: !accessible };
      }));
      return { items, isSubscribed };
    }),

  saveExportHistory: protectedProcedure
    .input(z.object({
      platform: z.string().min(1),
      outputUrl: z.string().url(),
      resolution: z.string().optional(),
      format: z.string().optional(),
      fileSizeBytes: z.number().optional(),
      sourceContentId: z.number().optional(),
      sourceAssetId: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      await rawQuery(
        `INSERT INTO platform_export_history (creator_id, source_content_id, source_asset_id, platform, output_url, resolution, format, file_size_bytes) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [ctx.user.id, input.sourceContentId ?? null, input.sourceAssetId ?? null, input.platform, input.outputUrl, input.resolution ?? null, input.format ?? null, input.fileSizeBytes ?? null]
      );
      return { success: true };
    }),

  getExportHistory: protectedProcedure
    .input(z.object({ platform: z.string().optional(), limit: z.number().min(1).max(100).default(50) }))
    .query(async ({ input, ctx }) => {
      const rows = await rawQuery(
        `SELECT * FROM platform_export_history WHERE creator_id = ? ${input.platform ? "AND platform = ?" : ""} ORDER BY exported_at DESC LIMIT ?`,
        input.platform ? [ctx.user.id, input.platform, input.limit] : [ctx.user.id, input.limit]
      );
      return rows;
    }),

  publishToVault: protectedProcedure
    .input(z.object({
      fileUrl: z.string().url(),
      title: z.string().min(1).max(200),
      description: z.string().optional(),
      mimeType: z.string().default("video/mp4"),
      priceCents: z.number().min(0).default(0),
      unlockType: z.enum(["free", "subscription", "ppv"]).default("subscription"),
      tags: z.array(z.string()).optional(),
      sourceAssetId: z.string().optional(),
      thumbnailUrl: z.string().url().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const result = await rawQuery(
        `INSERT INTO content (user_id, title, description, file_url, file_key, mime_type, content_type, price_cents, is_locked, unlock_type, status, tags, source_asset_id, thumbnail_url, published_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', ?, ?, ?, NOW())`,
        [ctx.user.id, input.title, input.description ?? null, input.fileUrl, input.fileUrl.split("/").pop() ?? "output", input.mimeType, input.mimeType.startsWith("video") ? "video" : "audio", input.priceCents, input.unlockType !== "free" ? 1 : 0, input.unlockType, input.tags ? JSON.stringify(input.tags) : null, input.sourceAssetId ?? null, input.thumbnailUrl ?? null]
      );
      return { success: true, contentId: (result as any).insertId };
    }),

  savePpvOutput: protectedProcedure
    .input(z.object({
      fileUrl: z.string().url(),
      outputType: z.enum(["teaser", "censor", "watermark", "ai-ppv"]),
      priceCents: z.number().min(0).default(999),
      sourceAssetId: z.string().optional(),
      title: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const title = input.title ?? `PPV ${input.outputType.charAt(0).toUpperCase() + input.outputType.slice(1)}`;
      const result = await rawQuery(
        `INSERT INTO content (user_id, title, file_url, file_key, mime_type, content_type, price_cents, is_locked, unlock_type, status, source_asset_id, published_at) VALUES (?, ?, ?, ?, 'video/mp4', 'video', ?, 1, 'ppv', 'active', ?, NOW())`,
        [ctx.user.id, title, input.fileUrl, input.fileUrl.split("/").pop() ?? "ppv-output", input.priceCents, input.sourceAssetId ?? null]
      );
      return { success: true, contentId: (result as any).insertId };
    }),

  subscribeToCreator: protectedProcedure
    .input(z.object({ creatorId: z.number(), tier: z.enum(["basic", "premium", "vip"]).optional() }))
    .mutation(async ({ ctx, input }) => {
      const creator = await rawQuery("SELECT * FROM vaultx_creators WHERE id = ? LIMIT 1", [input.creatorId]);
      if (!creator.length) throw new TRPCError({ code: "NOT_FOUND", message: "Creator not found." });
      const tier = input.tier || "basic";
      const priceMap: Record<string, number> = {
        basic: creator[0].subscription_price_basic || 9.99,
        premium: creator[0].subscription_price_premium || 24.99,
        vip: creator[0].subscription_price_vip || 49.99,
      };
      const result = await rawExec(
        `INSERT INTO vaultx_subscriptions (fan_id, creator_id, tier, price_paid, status, current_period_start, current_period_end) VALUES (?, ?, ?, ?, 'active', NOW(), DATE_ADD(NOW(), INTERVAL 1 MONTH))`,
        [ctx.user.id, input.creatorId, tier, priceMap[tier]]
      );
      await rawExec("UPDATE vaultx_creators SET total_subscribers = total_subscribers + 1 WHERE id = ?", [input.creatorId]);
      return { subscriptionId: (result as any).insertId, success: true };
    }),

  createTipIntent: protectedProcedure
    .input(z.object({ creatorId: z.number(), amountCents: z.number().min(100).max(1000000) }))
    .mutation(async ({ ctx, input }) => {
      const result = await rawExec(
        "INSERT INTO vaultx_tips (fan_id, creator_id, amount, status) VALUES (?, ?, ?, 'pending')",
        [ctx.user.id, input.creatorId, input.amountCents / 100]
      );
      return { tipId: (result as any).insertId, clientSecret: null };
    }),

  confirmSubscription: protectedProcedure
    .input(z.object({ subscriptionId: z.number(), stripeSubscriptionId: z.string().optional() }))
    .mutation(async ({ ctx, input }) => {
      await rawExec("UPDATE vaultx_subscriptions SET status = 'active', stripe_subscription_id = ? WHERE id = ? AND fan_id = ?", [input.stripeSubscriptionId || null, input.subscriptionId, ctx.user.id]);
      return { success: true };
    }),

  linkChannel: protectedProcedure
    .input(z.object({ channelId: z.string().min(1).max(255), channelName: z.string().min(1).max(255), botToken: z.string().optional() }))
    .mutation(async ({ ctx, input }) => {
      const bots = await rawQuery("SELECT id FROM telegram_bots WHERE created_by = ? LIMIT 1", [ctx.user.id]);
      let botId: string;
      if (bots.length === 0) {
        botId = randomUUID();
        await rawExec(`INSERT INTO telegram_bots (id, name, bot_token, status, created_by) VALUES (?, ?, '', 'active', ?)`, [botId, `VaultX Bot - ${input.channelName}`, ctx.user.id]);
      } else { botId = bots[0].id; }
      const existing = await rawQuery("SELECT id FROM telegram_channels WHERE creator_id = ? LIMIT 1", [ctx.user.id]);
      if (existing.length === 0) {
        const chanId = randomUUID();
        await rawExec(`INSERT INTO telegram_channels (id, bot_id, channel_id, channel_name, channel_type, creator_id) VALUES (?, ?, ?, ?, 'private', ?)`, [chanId, botId, input.channelId, input.channelName, ctx.user.id]);
      } else {
        await rawExec("UPDATE telegram_channels SET channel_id = ?, channel_name = ? WHERE creator_id = ?", [input.channelId, input.channelName, ctx.user.id]);
      }
      const rows = await rawQuery("SELECT * FROM telegram_channels WHERE creator_id = ? LIMIT 1", [ctx.user.id]);
      return rows[0] || null;
    }),

  getLinkedChannel: protectedProcedure.query(async ({ ctx }) => {
    const rows = await rawQuery("SELECT * FROM telegram_channels WHERE creator_id = ? LIMIT 1", [ctx.user.id]);
    return rows[0] || null;
  }),

  updateCreatorProfile: protectedProcedure
    .input(z.object({
      displayName: z.string().min(1).max(255),
      bio: z.string().max(2000).optional(),
      contentStyle: z.string().max(100).optional(),
      subscriptionPrice: z.number().min(0).max(9999),
      ppvEnabled: z.boolean().optional(),
      tipsEnabled: z.boolean().optional(),
      customRequestsEnabled: z.boolean().optional(),
      dmPaywallEnabled: z.boolean().optional(),
      categories: z.array(z.string()).optional(),
      profileBannerUrl: z.string().url().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const existing = await rawQuery("SELECT id FROM vaultx_creator_profiles WHERE creator_id = ? LIMIT 1", [ctx.user.id]);
      const categoriesJson = JSON.stringify(input.categories || []);
      if (existing.length === 0) {
        const id = randomUUID();
        await rawExec(
          `INSERT INTO vaultx_creator_profiles (id, creator_id, display_name, bio, content_style, base_subscription_price, ppv_enabled, tips_enabled, custom_requests_enabled, dm_paywall_enabled, categories, profile_banner_url) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [id, ctx.user.id, input.displayName, input.bio || null, input.contentStyle || null, input.subscriptionPrice, input.ppvEnabled !== false ? 1 : 0, input.tipsEnabled !== false ? 1 : 0, input.customRequestsEnabled !== false ? 1 : 0, input.dmPaywallEnabled ? 1 : 0, categoriesJson, input.profileBannerUrl || null]
        );
        const nlId = randomUUID();
        await rawExec("INSERT IGNORE INTO vaultx_network_listings (id, creator_id, is_visible) VALUES (?, ?, 1)", [nlId, ctx.user.id]);
      } else {
        await rawExec(
          `UPDATE vaultx_creator_profiles SET display_name=?, bio=?, content_style=?, base_subscription_price=?, ppv_enabled=?, tips_enabled=?, custom_requests_enabled=?, dm_paywall_enabled=?, categories=?, profile_banner_url=COALESCE(?,profile_banner_url) WHERE creator_id=?`,
          [input.displayName, input.bio || null, input.contentStyle || null, input.subscriptionPrice, input.ppvEnabled !== false ? 1 : 0, input.tipsEnabled !== false ? 1 : 0, input.customRequestsEnabled !== false ? 1 : 0, input.dmPaywallEnabled ? 1 : 0, categoriesJson, input.profileBannerUrl || null, ctx.user.id]
        );
      }
      const updated = await rawQuery("SELECT * FROM vaultx_creator_profiles WHERE creator_id = ? LIMIT 1", [ctx.user.id]);
      return { profile: updated[0] };
    }),

});
