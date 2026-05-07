/**
 * distributionRouter.ts — VaultX Distribution Hub Backend
 * 
 * Procedures:
 *   channel.list                — list channel identities for current user
 *   channel.create              — create a personal channel identity
 *   account.list                — list connected accounts for a channel
 *   account.register            — register a connected account (manual or OAuth)
 *   account.remove              — remove a connected account
 *   platform.capabilities       — get platform capability matrix
 *   platform.policyRules        — get policy rules for platform + brand lane
 *   job.create                  — create a distribution job (with tracking code)
 *   job.list                    — list distribution jobs for creator
 *   job.get                     — get single job with attribution stats
 *   job.post                    — execute posting for a ready job
 *   attribution.click           — record a click event (public)
 *   attribution.stats           — get attribution stats for a job
 *   analytics.snapshot          — get latest analytics snapshot for an account
 * 
 * Tracking redirect is handled by Express route /r/:trackingCode (see server/index.ts)
 */

import { z } from "zod";
import { router, protectedProcedure, publicProcedure } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { db } from "../db";
import { sql } from "drizzle-orm";
import { randomBytes, createHash } from "crypto";

// ─── DB helpers ──────────────────────────────────────────────────────────────

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
  const result = await (db as any).execute(sql.raw(query));
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

// ─── Helpers ─────────────────────────────────────────────────────────────────

function generateTrackingCode(): string {
  return randomBytes(12).toString("hex"); // 24-char hex
}

function hashIp(ip: string): string {
  return createHash("sha256").update(ip + process.env.SESSION_SECRET || "vaultx").digest("hex").slice(0, 64);
}

// Validate that an asset_url is publicly accessible (not localhost/temp)
function validatePublicUrl(url: string): boolean {
  if (!url) return false;
  if (url.startsWith("http://localhost") || url.startsWith("http://127.") || url.startsWith("/tmp/")) return false;
  return url.startsWith("https://") || url.startsWith("http://");
}

// ─── Brand safety check ──────────────────────────────────────────────────────

async function checkBrandSafety(
  platform: string,
  brandLane: string,
  assetType: string,
  contentSafetyLevel: string
): Promise<{ allowed: boolean; reason?: string }> {
  const rules = await rawQuery(
    `SELECT allowed_safety_levels, prohibited_asset_types, requires_sensitive_flag 
     FROM platform_policy_rules 
     WHERE platform = ? AND brand_lane = ?`,
    [platform, brandLane]
  );
  if (!rules.length) {
    return { allowed: false, reason: `No policy rule found for platform=${platform} brand_lane=${brandLane}` };
  }
  const rule = rules[0];
  const allowedLevels: string[] = typeof rule.allowed_safety_levels === "string"
    ? JSON.parse(rule.allowed_safety_levels)
    : rule.allowed_safety_levels;
  const prohibitedTypes: string[] = rule.prohibited_asset_types
    ? (typeof rule.prohibited_asset_types === "string" ? JSON.parse(rule.prohibited_asset_types) : rule.prohibited_asset_types)
    : [];

  if (!allowedLevels.includes(contentSafetyLevel)) {
    return { allowed: false, reason: `Content safety level '${contentSafetyLevel}' not allowed on ${platform} for ${brandLane}. Allowed: ${allowedLevels.join(", ")}` };
  }
  if (prohibitedTypes.includes(assetType)) {
    return { allowed: false, reason: `Asset type '${assetType}' is prohibited on ${platform} for ${brandLane}` };
  }
  return { allowed: true };
}

// ─── Router ──────────────────────────────────────────────────────────────────

export const distributionRouter = router({

  // ── Channel Identities ────────────────────────────────────────────────────

  "channel.list": protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.user.id;
    // Return platform-owned identities + user's personal identities
    const rows = await rawQuery(
      `SELECT ci.*, 
        (SELECT COUNT(*) FROM connected_accounts ca WHERE ca.channel_identity_id = ci.id) as account_count
       FROM channel_identities ci
       WHERE ci.owner_id = ? OR ci.owner_type IN ('vaultx_brand','creatorvault_brand')
       ORDER BY ci.owner_type ASC, ci.created_at ASC`,
      [userId]
    );
    return rows;
  }),

  "channel.create": protectedProcedure
    .input(z.object({
      displayName: z.string().min(2).max(255),
      brandLane: z.enum(["creatorvault_clean", "vaultx_adult", "agency", "campaign"]),
      channelType: z.string().default("social"),
      contentSafetyLevel: z.enum(["clean", "teaser", "sensitive", "explicit"]),
    }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.user.id;
      const slug = input.displayName.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 100) + "-" + randomBytes(3).toString("hex");
      await rawExec(
        `INSERT INTO channel_identities (owner_type, owner_id, display_name, slug, brand_lane, channel_type, content_safety_level, is_active)
         VALUES ('creator_personal', ?, ?, ?, ?, ?, ?, 1)`,
        [userId, input.displayName, slug, input.brandLane, input.channelType, input.contentSafetyLevel]
      );
      const rows = await rawQuery(`SELECT * FROM channel_identities WHERE slug = ?`, [slug]);
      return rows[0];
    }),

  // ── Connected Accounts ────────────────────────────────────────────────────

  "account.list": protectedProcedure
    .input(z.object({ channelIdentityId: z.number().optional() }))
    .query(async ({ ctx, input }) => {
      const userId = ctx.user.id;
      let query = `
        SELECT ca.*, ci.display_name as channel_name, ci.brand_lane, ci.content_safety_level
        FROM connected_accounts ca
        JOIN channel_identities ci ON ci.id = ca.channel_identity_id
        WHERE (ci.owner_id = ? OR ci.owner_type IN ('vaultx_brand','creatorvault_brand'))
      `;
      const params: any[] = [userId];
      if (input.channelIdentityId) {
        query += ` AND ca.channel_identity_id = ?`;
        params.push(input.channelIdentityId);
      }
      query += ` ORDER BY ca.created_at DESC`;
      return await rawQuery(query, params);
    }),

  "account.register": protectedProcedure
    .input(z.object({
      channelIdentityId: z.number(),
      platform: z.enum(["twitter", "instagram", "tiktok", "youtube", "facebook", "telegram", "whatsapp", "onlyfans", "threads", "reddit", "other"]),
      username: z.string().optional(),
      displayName: z.string().optional(),
      platformAccountId: z.string().optional(),
      connectionStatus: z.enum(["active", "manual", "pending_oauth"]).default("manual"),
      canPost: z.boolean().default(false),
      canSchedule: z.boolean().default(false),
      canSendDm: z.boolean().default(false),
      canReadAnalytics: z.boolean().default(false),
      canTriggerFunnel: z.boolean().default(false),
      automationEnabled: z.boolean().default(false),
    }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.user.id;

      // Verify channel identity belongs to user or is platform-owned
      const channels = await rawQuery(
        `SELECT * FROM channel_identities WHERE id = ? AND (owner_id = ? OR owner_type IN ('vaultx_brand','creatorvault_brand'))`,
        [input.channelIdentityId, userId]
      );
      if (!channels.length) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Channel identity not found or not accessible" });
      }
      const channel = channels[0];

      // Check platform capabilities
      const caps = await rawQuery(`SELECT * FROM platform_capabilities WHERE platform = ?`, [input.platform]);
      if (!caps.length) {
        throw new TRPCError({ code: "BAD_REQUEST", message: `Unknown platform: ${input.platform}` });
      }

      // Insert connected account
      const result = await rawExec(
        `INSERT INTO connected_accounts 
          (channel_identity_id, platform, platform_account_id, username, display_name, connection_status,
           can_post, can_schedule, can_send_dm, can_read_analytics, can_trigger_funnel, automation_enabled,
           requires_approval)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
        [
          input.channelIdentityId,
          input.platform,
          input.platformAccountId || null,
          input.username || null,
          input.displayName || null,
          input.connectionStatus,
          input.canPost ? 1 : 0,
          input.canSchedule ? 1 : 0,
          input.canSendDm ? 1 : 0,
          input.canReadAnalytics ? 1 : 0,
          input.canTriggerFunnel ? 1 : 0,
          input.automationEnabled ? 1 : 0,
        ]
      );
      const accountId = (result as any).insertId;
      const rows = await rawQuery(`SELECT * FROM connected_accounts WHERE id = ?`, [accountId]);
      return rows[0];
    }),

  "account.remove": protectedProcedure
    .input(z.object({ accountId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.user.id;
      const accounts = await rawQuery(
        `SELECT ca.* FROM connected_accounts ca
         JOIN channel_identities ci ON ci.id = ca.channel_identity_id
         WHERE ca.id = ? AND (ci.owner_id = ? OR ci.owner_type IN ('vaultx_brand','creatorvault_brand'))`,
        [input.accountId, userId]
      );
      if (!accounts.length) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Connected account not found" });
      }
      await rawExec(`DELETE FROM account_tokens WHERE connected_account_id = ?`, [input.accountId]);
      await rawExec(`DELETE FROM connected_accounts WHERE id = ?`, [input.accountId]);
      return { success: true };
    }),

  // ── Platform Capabilities ─────────────────────────────────────────────────

  "platform.capabilities": publicProcedure.query(async () => {
    return await rawQuery(`SELECT * FROM platform_capabilities ORDER BY platform ASC`);
  }),

  "platform.policyRules": publicProcedure
    .input(z.object({
      platform: z.string().optional(),
      brandLane: z.string().optional(),
    }))
    .query(async ({ input }) => {
      let query = `SELECT * FROM platform_policy_rules WHERE 1=1`;
      const params: any[] = [];
      if (input.platform) { query += ` AND platform = ?`; params.push(input.platform); }
      if (input.brandLane) { query += ` AND brand_lane = ?`; params.push(input.brandLane); }
      return await rawQuery(query, params);
    }),

  // ── Distribution Jobs ─────────────────────────────────────────────────────

  "job.create": protectedProcedure
    .input(z.object({
      channelIdentityId: z.number(),
      connectedAccountId: z.number().optional(),
      platform: z.string(),
      contentId: z.number().optional(),
      assetUrl: z.string().url(),
      assetType: z.enum(["teaser", "censored_preview", "thumbnail", "full_video", "image", "text"]),
      caption: z.string().optional(),
      destinationUrl: z.string().url(),
      scheduledAt: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.user.id;

      // Validate asset URL is public
      if (!validatePublicUrl(input.assetUrl)) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Asset URL must be a public HTTPS URL, not a local or temp path" });
      }
      if (!validatePublicUrl(input.destinationUrl)) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Destination URL must be a public HTTPS URL" });
      }

      // Get channel identity and check brand safety
      const channels = await rawQuery(
        `SELECT * FROM channel_identities WHERE id = ? AND (owner_id = ? OR owner_type IN ('vaultx_brand','creatorvault_brand'))`,
        [input.channelIdentityId, userId]
      );
      if (!channels.length) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Channel identity not found or not accessible" });
      }
      const channel = channels[0];

      // Brand safety check
      const safety = await checkBrandSafety(
        input.platform,
        channel.brand_lane,
        input.assetType,
        channel.content_safety_level
      );
      if (!safety.allowed) {
        throw new TRPCError({ code: "BAD_REQUEST", message: `Brand safety violation: ${safety.reason}` });
      }

      // Get creator_id
      const creatorRows = await rawQuery(
        `SELECT id FROM vaultx_creators WHERE user_id = ?`, [userId]
      );
      const creatorId = creatorRows.length ? creatorRows[0].id : userId;

      const trackingCode = generateTrackingCode();

      const result = await rawExec(
        `INSERT INTO distribution_jobs 
          (creator_id, channel_identity_id, connected_account_id, platform, content_id, 
           asset_url, asset_type, caption, destination_url, tracking_code, status, scheduled_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'draft', ?)`,
        [
          creatorId,
          input.channelIdentityId,
          input.connectedAccountId || null,
          input.platform,
          input.contentId || null,
          input.assetUrl,
          input.assetType,
          input.caption || null,
          input.destinationUrl,
          trackingCode,
          input.scheduledAt ? new Date(input.scheduledAt) : null,
        ]
      );
      const jobId = (result as any).insertId;
      const jobs = await rawQuery(`SELECT * FROM distribution_jobs WHERE id = ?`, [jobId]);
      const job = jobs[0];

      // Generate tracking URL
      const trackingUrl = `https://creatorvault.live/r/${trackingCode}`;

      return { ...job, trackingUrl };
    }),

  "job.list": protectedProcedure
    .input(z.object({
      status: z.enum(["draft", "ready", "posting", "posted", "failed"]).optional(),
      platform: z.string().optional(),
      limit: z.number().default(20),
    }))
    .query(async ({ ctx, input }) => {
      const userId = ctx.user.id;
      const creatorRows = await rawQuery(
        `SELECT id FROM vaultx_creators WHERE user_id = ?`, [userId]
      );
      const creatorId = creatorRows.length ? creatorRows[0].id : userId;

      let query = `
        SELECT dj.*, 
          ci.display_name as channel_name, ci.brand_lane,
          (SELECT COUNT(*) FROM attribution_events ae WHERE ae.tracking_code = dj.tracking_code) as click_count,
          (SELECT COUNT(*) FROM attribution_events ae WHERE ae.tracking_code = dj.tracking_code AND ae.event_type = 'purchase') as purchase_count,
          (SELECT COALESCE(SUM(ae.revenue_cents),0) FROM attribution_events ae WHERE ae.tracking_code = dj.tracking_code) as revenue_cents
        FROM distribution_jobs dj
        JOIN channel_identities ci ON ci.id = dj.channel_identity_id
        WHERE dj.creator_id = ?
      `;
      const params: any[] = [creatorId];
      if (input.status) { query += ` AND dj.status = ?`; params.push(input.status); }
      if (input.platform) { query += ` AND dj.platform = ?`; params.push(input.platform); }
      query += ` ORDER BY dj.created_at DESC LIMIT ?`;
      params.push(input.limit);

      const jobs = await rawQuery(query, params);
      return jobs.map((j: any) => ({
        ...j,
        trackingUrl: `https://creatorvault.live/r/${j.tracking_code}`,
      }));
    }),

  "job.get": protectedProcedure
    .input(z.object({ jobId: z.number() }))
    .query(async ({ ctx, input }) => {
      const userId = ctx.user.id;
      const jobs = await rawQuery(
        `SELECT dj.*, ci.display_name as channel_name, ci.brand_lane, ci.content_safety_level
         FROM distribution_jobs dj
         JOIN channel_identities ci ON ci.id = dj.channel_identity_id
         WHERE dj.id = ?`,
        [input.jobId]
      );
      if (!jobs.length) throw new TRPCError({ code: "NOT_FOUND", message: "Job not found" });

      const events = await rawQuery(
        `SELECT event_type, COUNT(*) as count, COALESCE(SUM(revenue_cents),0) as revenue_cents
         FROM attribution_events WHERE tracking_code = ?
         GROUP BY event_type`,
        [jobs[0].tracking_code]
      );

      return {
        ...jobs[0],
        trackingUrl: `https://creatorvault.live/r/${jobs[0].tracking_code}`,
        attributionStats: events,
      };
    }),

  "job.markReady": protectedProcedure
    .input(z.object({ jobId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      await rawExec(
        `UPDATE distribution_jobs SET status = 'ready' WHERE id = ?`,
        [input.jobId]
      );
      return { success: true };
    }),

  "job.post": protectedProcedure
    .input(z.object({ jobId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.user.id;
      const jobs = await rawQuery(
        `SELECT dj.*, ci.brand_lane, ci.content_safety_level, ci.owner_id
         FROM distribution_jobs dj
         JOIN channel_identities ci ON ci.id = dj.channel_identity_id
         WHERE dj.id = ?`,
        [input.jobId]
      );
      if (!jobs.length) throw new TRPCError({ code: "NOT_FOUND", message: "Job not found" });
      const job = jobs[0];

      if (!["draft", "ready"].includes(job.status)) {
        throw new TRPCError({ code: "BAD_REQUEST", message: `Job is in status '${job.status}' — cannot post` });
      }

      // Mark as posting
      await rawExec(`UPDATE distribution_jobs SET status = 'posting' WHERE id = ?`, [input.jobId]);

      try {
        // Get connected account if specified
        let accountInfo: any = null;
        if (job.connected_account_id) {
          const accounts = await rawQuery(
            `SELECT ca.*, at.access_token_encrypted 
             FROM connected_accounts ca
             LEFT JOIN account_tokens at ON at.connected_account_id = ca.id
             WHERE ca.id = ?`,
            [job.connected_account_id]
          );
          accountInfo = accounts[0] || null;
        }

        // Platform-specific posting
        let platformPostId: string | null = null;
        let platformPostUrl: string | null = null;

        if (job.platform === "telegram") {
          // Use existing Telegram bot infrastructure
          const botToken = process.env.TELEGRAM_BOT_TOKEN;
          if (!botToken) throw new Error("TELEGRAM_BOT_TOKEN not configured");

          // Determine target channel based on channel identity
          const channelMap: Record<string, string> = {
            "vaultx-telegram-free": "-1003749459281",
            "vaultx-telegram-vip": "-1003817770263",
            "vaultx-telegram-innercircle": "-1003859590084",
          };

          // Get channel slug
          const channelRows = await rawQuery(
            `SELECT slug FROM channel_identities WHERE id = ?`, [job.channel_identity_id]
          );
          const slug = channelRows[0]?.slug;
          const chatId = channelMap[slug];

          if (!chatId) {
            throw new Error(`No Telegram channel mapped for slug: ${slug}`);
          }

          const trackingUrl = `https://creatorvault.live/r/${job.tracking_code}`;
          const caption = (job.caption || "🔥 New exclusive content available") + `\n\n🔗 ${trackingUrl}`;

          // Send video
          const { default: fetch } = await import("node-fetch");
          const resp = await fetch(
            `https://api.telegram.org/bot${botToken}/sendVideo`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                chat_id: chatId,
                video: job.asset_url,
                caption,
                parse_mode: "Markdown",
              }),
            }
          );
          const data: any = await resp.json();
          if (!data.ok) throw new Error(`Telegram API error: ${data.description}`);

          platformPostId = String(data.result.message_id);
          platformPostUrl = `https://t.me/${slug.replace("vaultx-telegram-", "CreatorVault_")}/${data.result.message_id}`;

        } else if (job.platform === "twitter") {
          // Check for Twitter credentials
          const apiKey = process.env.TWITTER_API_KEY;
          const apiSecret = process.env.TWITTER_API_SECRET;
          const accessToken = process.env.TWITTER_ACCESS_TOKEN;
          const accessSecret = process.env.TWITTER_ACCESS_SECRET;

          if (!apiKey || !apiSecret || !accessToken || !accessSecret) {
            throw new Error("Twitter OAuth credentials not configured. Add TWITTER_API_KEY, TWITTER_API_SECRET, TWITTER_ACCESS_TOKEN, TWITTER_ACCESS_SECRET to .env");
          }

          // Twitter posting will be implemented when credentials are provided
          // For now, log the intent and mark as failed with clear message
          throw new Error("Twitter API credentials required. See /vaultx/distribution for setup instructions.");

        } else {
          throw new Error(`Platform '${job.platform}' posting not yet implemented. Connect account credentials first.`);
        }

        // Mark as posted
        await rawExec(
          `UPDATE distribution_jobs 
           SET status = 'posted', platform_post_id = ?, platform_post_url = ?, posted_at = NOW()
           WHERE id = ?`,
          [platformPostId, platformPostUrl, input.jobId]
        );

        return {
          success: true,
          platformPostId,
          platformPostUrl,
          trackingUrl: `https://creatorvault.live/r/${job.tracking_code}`,
        };

      } catch (err: any) {
        await rawExec(
          `UPDATE distribution_jobs SET status = 'failed', error_message = ? WHERE id = ?`,
          [err.message, input.jobId]
        );
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: err.message });
      }
    }),

  // ── Attribution ───────────────────────────────────────────────────────────

  "attribution.click": publicProcedure
    .input(z.object({
      trackingCode: z.string(),
      sessionId: z.string().optional(),
      userAgent: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      // Get job info
      const jobs = await rawQuery(
        `SELECT dj.*, ci.id as channel_identity_id
         FROM distribution_jobs dj
         JOIN channel_identities ci ON ci.id = dj.channel_identity_id
         WHERE dj.tracking_code = ?`,
        [input.trackingCode]
      );
      if (!jobs.length) return { success: false, reason: "Invalid tracking code" };
      const job = jobs[0];

      const ipHash = (ctx as any).req?.ip ? hashIp((ctx as any).req.ip) : null;

      await rawExec(
        `INSERT INTO attribution_events 
          (tracking_code, distribution_job_id, creator_id, content_id, channel_identity_id, platform, event_type, session_id, ip_hash, user_agent)
         VALUES (?, ?, ?, ?, ?, ?, 'click', ?, ?, ?)`,
        [
          input.trackingCode,
          job.id,
          job.creator_id,
          job.content_id || null,
          job.channel_identity_id,
          job.platform,
          input.sessionId || null,
          ipHash,
          input.userAgent ? input.userAgent.slice(0, 500) : null,
        ]
      );

      return {
        success: true,
        destinationUrl: job.destination_url,
      };
    }),

  "attribution.recordPurchase": protectedProcedure
    .input(z.object({
      trackingCode: z.string(),
      revenueCents: z.number(),
      contentId: z.number().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const jobs = await rawQuery(
        `SELECT * FROM distribution_jobs WHERE tracking_code = ?`,
        [input.trackingCode]
      );
      if (!jobs.length) return { success: false };
      const job = jobs[0];

      await rawExec(
        `INSERT INTO attribution_events 
          (tracking_code, distribution_job_id, creator_id, content_id, channel_identity_id, platform, event_type, user_id, revenue_cents)
         VALUES (?, ?, ?, ?, ?, ?, 'purchase', ?, ?)`,
        [
          input.trackingCode,
          job.id,
          job.creator_id,
          input.contentId || job.content_id || null,
          job.channel_identity_id,
          job.platform,
          ctx.user.id,
          input.revenueCents,
        ]
      );
      return { success: true };
    }),

  "attribution.stats": protectedProcedure
    .input(z.object({ trackingCode: z.string() }))
    .query(async ({ input }) => {
      const events = await rawQuery(
        `SELECT event_type, COUNT(*) as count, COALESCE(SUM(revenue_cents),0) as revenue_cents
         FROM attribution_events WHERE tracking_code = ?
         GROUP BY event_type`,
        [input.trackingCode]
      );
      const total = await rawQuery(
        `SELECT COUNT(*) as total_events, COALESCE(SUM(revenue_cents),0) as total_revenue_cents
         FROM attribution_events WHERE tracking_code = ?`,
        [input.trackingCode]
      );
      return {
        trackingCode: input.trackingCode,
        byEventType: events,
        totals: total[0],
      };
    }),

  // ── Analytics Snapshots ───────────────────────────────────────────────────

  "analytics.snapshot": protectedProcedure
    .input(z.object({ connectedAccountId: z.number() }))
    .query(async ({ input }) => {
      const rows = await rawQuery(
        `SELECT * FROM analytics_snapshots 
         WHERE connected_account_id = ? 
         ORDER BY snapshot_at DESC LIMIT 30`,
        [input.connectedAccountId]
      );
      return rows;
    }),

  // ── AI Agent Actions ──────────────────────────────────────────────────────

  "agent.listActions": protectedProcedure
    .input(z.object({ status: z.string().optional() }))
    .query(async ({ ctx, input }) => {
      const userId = ctx.user.id;
      let query = `SELECT * FROM ai_agent_actions WHERE creator_id = ?`;
      const params: any[] = [userId];
      if (input.status) { query += ` AND status = ?`; params.push(input.status); }
      query += ` ORDER BY created_at DESC LIMIT 50`;
      return await rawQuery(query, params);
    }),

  "agent.approve": protectedProcedure
    .input(z.object({ actionId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      await rawExec(
        `UPDATE ai_agent_actions SET status = 'approved', approved_by = ? WHERE id = ?`,
        [ctx.user.id, input.actionId]
      );
      return { success: true };
    }),

  "agent.reject": protectedProcedure
    .input(z.object({ actionId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      await rawExec(
        `UPDATE ai_agent_actions SET status = 'rejected', approved_by = ? WHERE id = ?`,
        [ctx.user.id, input.actionId]
      );
      return { success: true };
    }),
});
