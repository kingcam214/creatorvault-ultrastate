/**
 * vaultxRouter — Production VaultX Platform Router
 * All procedures query real MySQL tables. Zero stubs. Zero mocks.
 * Platform fee: 15% (creator keeps 85%) — THIS IS LAW.
 */
import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { db } from "../db";
import { users } from "../../drizzle/schema";
import { eq, desc, and, sql } from "drizzle-orm";
import { randomUUID } from "crypto";

// Raw MySQL2 connection for tables not in Drizzle schema
async function rawQuery(query: string, params: any[] = []): Promise<any[]> {
  const conn = (db as any).client || (db as any).$client;
  if (conn && typeof conn.query === "function") {
    const [rows] = await conn.query(query, params);
    return rows as any[];
  }
  // Fallback: use drizzle execute
  const result = await (db as any).execute(sql.raw(query.replace(/\?/g, (_, i) => `'${params[i]}'`)));
  return (result as any).rows || result;
}

async function rawExec(query: string, params: any[] = []): Promise<void> {
  const conn = (db as any).client || (db as any).$client;
  if (conn && typeof conn.query === "function") {
    await conn.query(query, params);
    return;
  }
  await (db as any).execute(sql.raw(query));
}

export const vaultxRouter = router({

  // ─── Age Verification ────────────────────────────────────────────────────
  submitAgeVerification: protectedProcedure
    .input(z.object({
      dateOfBirth: z.string(), // YYYY-MM-DD
      confirmOver18: z.boolean(),
    }))
    .mutation(async ({ ctx, input }) => {
      if (!input.confirmOver18) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "You must confirm you are 18 or older." });
      }
      const dob = new Date(input.dateOfBirth);
      const today = new Date();
      const age = today.getFullYear() - dob.getFullYear() -
        (today < new Date(today.getFullYear(), dob.getMonth(), dob.getDate()) ? 1 : 0);
      if (age < 18) {
        throw new TRPCError({ code: "FORBIDDEN", message: "You must be 18 or older to access VaultX." });
      }
      // Upsert verification record
      const existing = await rawQuery(
        "SELECT id FROM vaultx_age_verifications WHERE user_id = ? LIMIT 1",
        [ctx.user.id]
      );
      if (existing.length === 0) {
        await rawExec(
          `INSERT INTO vaultx_age_verifications
           (user_id, verification_method, date_of_birth, age_at_verification, id_verification_status, ip_address)
           VALUES (?, 'self_attest', ?, ?, 'approved', '0.0.0.0')`,
          [ctx.user.id, input.dateOfBirth, age]
        );
      }
      return { verified: true, age };
    }),

  // ─── Realm Status ────────────────────────────────────────────────────────
  getRealmStatus: protectedProcedure.query(async ({ ctx }) => {
    const rows = await rawQuery(
      "SELECT id, age_at_verification, id_verification_status FROM vaultx_age_verifications WHERE user_id = ? AND id_verification_status = 'approved' LIMIT 1",
      [ctx.user.id]
    );
    return {
      adultVerified: rows.length > 0,
      verificationId: rows[0]?.id || null,
    };
  }),

  // ─── Discover Network ────────────────────────────────────────────────────
  getNetwork: protectedProcedure
    .input(z.object({
      limit: z.number().min(1).max(100).default(50),
      offset: z.number().min(0).default(0),
    }))
    .query(async ({ input }) => {
      const creators = await rawQuery(
        `SELECT
           vcp.creator_id,
           vcp.display_name,
           vcp.bio,
           vcp.profile_banner_url,
           vcp.categories,
           vcp.base_subscription_price,
           vcp.total_subscribers,
           vcp.total_posts,
           vcp.tier,
           vcp.is_featured,
           vcp.ppv_enabled,
           vcp.tips_enabled,
           vnl.featured_image_url,
           vnl.teaser_video_url,
           vnl.pitch,
           vnl.avg_rating,
           u.name AS user_name,
           u.username
         FROM vaultx_creator_profiles vcp
         LEFT JOIN vaultx_network_listings vnl ON vnl.creator_id = vcp.creator_id
         LEFT JOIN users u ON u.id = vcp.creator_id
         WHERE vnl.is_visible = 1 OR vnl.is_visible IS NULL
         ORDER BY vcp.is_featured DESC, vcp.total_subscribers DESC
         LIMIT ? OFFSET ?`,
        [input.limit, input.offset]
      );
      return { creators };
    }),

  // ─── Creator Profile (own) ───────────────────────────────────────────────
  getCreatorProfile: protectedProcedure.query(async ({ ctx }) => {
    const rows = await rawQuery(
      "SELECT * FROM vaultx_creator_profiles WHERE creator_id = ? LIMIT 1",
      [ctx.user.id]
    );
    return { profile: rows[0] || null };
  }),

  // ─── Update Creator Profile ──────────────────────────────────────────────
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
      const existing = await rawQuery(
        "SELECT id FROM vaultx_creator_profiles WHERE creator_id = ? LIMIT 1",
        [ctx.user.id]
      );
      const categoriesJson = JSON.stringify(input.categories || []);
      if (existing.length === 0) {
        const id = randomUUID();
        await rawExec(
          `INSERT INTO vaultx_creator_profiles
           (id, creator_id, display_name, bio, content_style, base_subscription_price,
            ppv_enabled, tips_enabled, custom_requests_enabled, dm_paywall_enabled,
            categories, profile_banner_url)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            id, ctx.user.id, input.displayName, input.bio || null,
            input.contentStyle || null, input.subscriptionPrice,
            input.ppvEnabled !== false ? 1 : 0,
            input.tipsEnabled !== false ? 1 : 0,
            input.customRequestsEnabled !== false ? 1 : 0,
            input.dmPaywallEnabled ? 1 : 0,
            categoriesJson,
            input.profileBannerUrl || null,
          ]
        );
        // Also create a network listing
        const nlId = randomUUID();
        await rawExec(
          "INSERT IGNORE INTO vaultx_network_listings (id, creator_id, is_visible) VALUES (?, ?, 1)",
          [nlId, ctx.user.id]
        );
      } else {
        await rawExec(
          `UPDATE vaultx_creator_profiles SET
           display_name = ?, bio = ?, content_style = ?, base_subscription_price = ?,
           ppv_enabled = ?, tips_enabled = ?, custom_requests_enabled = ?,
           dm_paywall_enabled = ?, categories = ?, profile_banner_url = COALESCE(?, profile_banner_url)
           WHERE creator_id = ?`,
          [
            input.displayName, input.bio || null, input.contentStyle || null,
            input.subscriptionPrice,
            input.ppvEnabled !== false ? 1 : 0,
            input.tipsEnabled !== false ? 1 : 0,
            input.customRequestsEnabled !== false ? 1 : 0,
            input.dmPaywallEnabled ? 1 : 0,
            categoriesJson,
            input.profileBannerUrl || null,
            ctx.user.id,
          ]
        );
      }
      const updated = await rawQuery(
        "SELECT * FROM vaultx_creator_profiles WHERE creator_id = ? LIMIT 1",
        [ctx.user.id]
      );
      return { profile: updated[0] };
    }),

  // ─── Link Telegram Channel ───────────────────────────────────────────────
  linkChannel: protectedProcedure
    .input(z.object({
      channelId: z.string().min(1).max(255),
      channelName: z.string().min(1).max(255),
      botToken: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      // Check if there's already a bot config for this creator
      const bots = await rawQuery(
        "SELECT id FROM telegram_bots WHERE created_by = ? LIMIT 1",
        [ctx.user.id]
      );
      let botId: string;
      if (bots.length === 0) {
        botId = randomUUID();
        await rawExec(
          `INSERT INTO telegram_bots (id, name, bot_token, status, created_by)
           VALUES (?, ?, '', 'active', ?)`,
          [botId, `VaultX Bot - ${input.channelName}`, ctx.user.id]
        );
      } else {
        botId = bots[0].id;
      }
      // Upsert the channel record
      const existing = await rawQuery(
        "SELECT id FROM telegram_channels WHERE creator_id = ? LIMIT 1",
        [ctx.user.id]
      );
      if (existing.length === 0) {
        const chanId = randomUUID();
        await rawExec(
          `INSERT INTO telegram_channels (id, bot_id, channel_id, channel_name, channel_type, creator_id)
           VALUES (?, ?, ?, ?, 'private', ?)`,
          [chanId, botId, input.channelId, input.channelName, ctx.user.id]
        );
      } else {
        await rawExec(
          "UPDATE telegram_channels SET channel_id = ?, channel_name = ? WHERE creator_id = ?",
          [input.channelId, input.channelName, ctx.user.id]
        );
      }
      const rows = await rawQuery(
        "SELECT * FROM telegram_channels WHERE creator_id = ? LIMIT 1",
        [ctx.user.id]
      );
      return rows[0] || null;
    }),

  // ─── Get Linked Channel ──────────────────────────────────────────────────
  getLinkedChannel: protectedProcedure.query(async ({ ctx }) => {
    const rows = await rawQuery(
      "SELECT * FROM telegram_channels WHERE creator_id = ? LIMIT 1",
      [ctx.user.id]
    );
    return rows[0] || null;
  }),

  // ─── Revenue Stats ───────────────────────────────────────────────────────
  getRevenueStats: protectedProcedure.query(async ({ ctx }) => {
    // Aggregate all-time revenue from vaultx_revenue_stats
    const rows = await rawQuery(
      `SELECT
         SUM(subscription_revenue) AS subscription_revenue,
         SUM(ppv_revenue) AS ppv_revenue,
         SUM(tip_revenue) AS tip_revenue,
         SUM(custom_request_revenue) AS custom_revenue,
         SUM(dm_paywall_revenue) AS dm_paywall_revenue,
         SUM(gross_revenue) AS gross_revenue,
         SUM(net_revenue) AS net_revenue,
         SUM(new_subscribers) AS new_subscribers,
         SUM(cancelled_subscribers) AS cancelled_subscribers
       FROM vaultx_revenue_stats
       WHERE creator_id = ?`,
      [ctx.user.id]
    );
    const agg = rows[0] || {};
    // Also pull profile stats
    const profile = await rawQuery(
      "SELECT total_subscribers, total_posts, avg_monthly_revenue FROM vaultx_creator_profiles WHERE creator_id = ? LIMIT 1",
      [ctx.user.id]
    );
    const p = profile[0] || {};
    // Count active subscriptions from subscriptions table
    const activeSubs = await rawQuery(
      "SELECT COUNT(*) AS cnt FROM subscriptions WHERE creator_id = ? AND status = 'active'",
      [ctx.user.id]
    );
    return {
      subscription_revenue: parseFloat(agg.subscription_revenue || "0"),
      ppv_revenue: parseFloat(agg.ppv_revenue || "0"),
      tip_revenue: parseFloat(agg.tip_revenue || "0"),
      custom_revenue: parseFloat(agg.custom_revenue || "0"),
      dm_paywall_revenue: parseFloat(agg.dm_paywall_revenue || "0"),
      gross_revenue: parseFloat(agg.gross_revenue || "0"),
      net_revenue: parseFloat(agg.net_revenue || "0"),
      total_subscribers: p.total_subscribers || 0,
      active_subscribers: activeSubs[0]?.cnt || 0,
      total_posts: p.total_posts || 0,
      avg_monthly_revenue: parseFloat(p.avg_monthly_revenue || "0"),
    };
  }),

// ─── ADDITIONS TO vaultxRouter — append before the closing });
// These replace the fake Subscribe/Tip/Content buttons in VaultX.tsx

  // ─── Subscribe to Creator (Stripe Checkout) ─────────────────────────────
  subscribeToCreator: protectedProcedure
    .input(z.object({
      creatorId: z.number(),
      tierId: z.number().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.id === input.creatorId) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Cannot subscribe to yourself" });
      }
      // Get the creator's default subscription tier
      let tier: any;
      if (input.tierId) {
        const rows = await rawQuery(
          "SELECT * FROM subscription_tiers WHERE id = ? AND creator_id = ? AND is_active = 1 LIMIT 1",
          [input.tierId, input.creatorId]
        );
        tier = rows[0];
      } else {
        const rows = await rawQuery(
          "SELECT * FROM subscription_tiers WHERE creator_id = ? AND is_active = 1 ORDER BY price_in_cents ASC LIMIT 1",
          [input.creatorId]
        );
        tier = rows[0];
      }
      if (!tier) {
        // No tier configured — create a default $9.99/mo tier
        await rawExec(
          "INSERT INTO subscription_tiers (creator_id, name, price_in_cents, billing_interval, is_active) VALUES (?, 'Standard', 999, 'monthly', 1)",
          [input.creatorId]
        );
        const rows = await rawQuery(
          "SELECT * FROM subscription_tiers WHERE creator_id = ? AND is_active = 1 ORDER BY id DESC LIMIT 1",
          [input.creatorId]
        );
        tier = rows[0];
      }
      // Check if already subscribed
      const existing = await rawQuery(
        "SELECT id FROM subscriptions WHERE fan_id = ? AND creator_id = ? AND status = 'active' LIMIT 1",
        [ctx.user.id, input.creatorId]
      );
      if (existing.length > 0) {
        throw new TRPCError({ code: "CONFLICT", message: "Already subscribed" });
      }
      // Create Stripe PaymentIntent for the subscription charge
      const Stripe = (await import("stripe")).default;
      const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", { apiVersion: "2024-06-20" });
      const creatorRows = await rawQuery("SELECT name, username FROM users WHERE id = ? LIMIT 1", [input.creatorId]);
      const creatorName = creatorRows[0]?.name || creatorRows[0]?.username || `Creator #${input.creatorId}`;
      const intent = await stripe.paymentIntents.create({
        amount: tier.price_in_cents,
        currency: "usd",
        description: `VaultX subscription to ${creatorName} — ${tier.name}`,
        metadata: {
          type: "vaultx_subscription",
          fanId: ctx.user.id.toString(),
          creatorId: input.creatorId.toString(),
          tierId: tier.id.toString(),
        },
        automatic_payment_methods: { enabled: true },
      });
      return {
        clientSecret: intent.client_secret,
        intentId: intent.id,
        amount: tier.price_in_cents,
        tierName: tier.name,
        creatorName,
      };
    }),

  // ─── Confirm Subscription After Stripe Payment ───────────────────────────
  confirmSubscription: protectedProcedure
    .input(z.object({
      intentId: z.string(),
      creatorId: z.number(),
      tierId: z.number(),
    }))
    .mutation(async ({ ctx, input }) => {
      const Stripe = (await import("stripe")).default;
      const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", { apiVersion: "2024-06-20" });
      const intent = await stripe.paymentIntents.retrieve(input.intentId);
      if (intent.status !== "succeeded") {
        throw new TRPCError({ code: "BAD_REQUEST", message: `Payment not completed: ${intent.status}` });
      }
      const amountCents = intent.amount;
      const creatorEarningsCents = Math.round(amountCents * 0.85); // 85% to creator — THIS IS LAW
      const now = new Date();
      const periodEnd = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
      // Insert subscription record
      await rawExec(
        `INSERT INTO subscriptions (fan_id, creator_id, tier_id, stripe_subscription_id, status, current_period_start, current_period_end)
         VALUES (?, ?, ?, ?, 'active', ?, ?)
         ON DUPLICATE KEY UPDATE status = 'active', current_period_start = ?, current_period_end = ?, stripe_subscription_id = ?`,
        [ctx.user.id, input.creatorId, input.tierId, intent.id, now, periodEnd, now, periodEnd, intent.id]
      );
      // Record transaction
      await rawExec(
        `INSERT INTO transactions (user_id, type, amount, status, stripe_payment_intent_id, description, created_at)
         VALUES (?, 'subscription', ?, 'completed', ?, ?, NOW())`,
        [ctx.user.id, amountCents, intent.id, `VaultX subscription to creator #${input.creatorId}`]
      );
      // Update creator earnings in vaultx_revenue_stats
      await rawExec(
        `INSERT INTO vaultx_revenue_stats (creator_id, period_date, subscription_revenue, gross_revenue, net_revenue, new_subscribers)
         VALUES (?, CURDATE(), ?, ?, ?, 1)
         ON DUPLICATE KEY UPDATE
           subscription_revenue = subscription_revenue + VALUES(subscription_revenue),
           gross_revenue = gross_revenue + VALUES(gross_revenue),
           net_revenue = net_revenue + VALUES(net_revenue),
           new_subscribers = new_subscribers + 1`,
        [input.creatorId, creatorEarningsCents, amountCents, creatorEarningsCents]
      );
      // Update creator profile subscriber count
      await rawExec(
        `UPDATE vaultx_creator_profiles SET total_subscribers = total_subscribers + 1 WHERE creator_id = ?`,
        [input.creatorId]
      );
      return { success: true, subscriptionActive: true };
    }),

  // ─── Send Tip to Creator ─────────────────────────────────────────────────
  createTipIntent: protectedProcedure
    .input(z.object({
      creatorId: z.number(),
      amountCents: z.number().min(100).max(100000), // $1 min, $1000 max
      message: z.string().max(500).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.id === input.creatorId) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Cannot tip yourself" });
      }
      const Stripe = (await import("stripe")).default;
      const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", { apiVersion: "2024-06-20" });
      const creatorRows = await rawQuery("SELECT name, username FROM users WHERE id = ? LIMIT 1", [input.creatorId]);
      const creatorName = creatorRows[0]?.name || creatorRows[0]?.username || `Creator #${input.creatorId}`;
      const intent = await stripe.paymentIntents.create({
        amount: input.amountCents,
        currency: "usd",
        description: `VaultX tip to ${creatorName}${input.message ? `: "${input.message}"` : ""}`,
        metadata: {
          type: "vaultx_tip",
          fanId: ctx.user.id.toString(),
          creatorId: input.creatorId.toString(),
          message: input.message || "",
        },
        automatic_payment_methods: { enabled: true },
      });
      // Pre-insert tip record as pending
      await rawExec(
        `INSERT INTO tips (fan_id, creator_id, amount_cents, message, stripe_payment_intent_id, status)
         VALUES (?, ?, ?, ?, ?, 'pending')`,
        [ctx.user.id, input.creatorId, input.amountCents, input.message || null, intent.id]
      );
      return {
        clientSecret: intent.client_secret,
        intentId: intent.id,
        amountCents: input.amountCents,
        creatorName,
      };
    }),

  // ─── Confirm Tip After Payment ────────────────────────────────────────────
  confirmTip: protectedProcedure
    .input(z.object({ intentId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const Stripe = (await import("stripe")).default;
      const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", { apiVersion: "2024-06-20" });
      const intent = await stripe.paymentIntents.retrieve(input.intentId);
      if (intent.status !== "succeeded") {
        throw new TRPCError({ code: "BAD_REQUEST", message: `Payment not completed: ${intent.status}` });
      }
      const creatorId = parseInt(intent.metadata.creatorId);
      const amountCents = intent.amount;
      const creatorEarningsCents = Math.round(amountCents * 0.85);
      // Mark tip completed
      await rawExec(
        "UPDATE tips SET status = 'completed' WHERE stripe_payment_intent_id = ? AND fan_id = ?",
        [input.intentId, ctx.user.id]
      );
      // Update creator tip revenue
      await rawExec(
        `INSERT INTO vaultx_revenue_stats (creator_id, period_date, tip_revenue, gross_revenue, net_revenue)
         VALUES (?, CURDATE(), ?, ?, ?)
         ON DUPLICATE KEY UPDATE
           tip_revenue = tip_revenue + VALUES(tip_revenue),
           gross_revenue = gross_revenue + VALUES(gross_revenue),
           net_revenue = net_revenue + VALUES(net_revenue)`,
        [creatorId, creatorEarningsCents, amountCents, creatorEarningsCents]
      );
      return { success: true };
    }),

  // ─── Save Content Record After Upload ────────────────────────────────────
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
      const contentType = input.mimeType?.startsWith("video") ? "video"
        : input.mimeType?.startsWith("image") ? "image"
        : input.mimeType?.startsWith("audio") ? "audio"
        : "video";
      await rawExec(
        `INSERT INTO content
           (user_id, title, description, file_url, file_key, mime_type, file_size, content_type,
            status, price_cents, is_locked, thumbnail_url, unlock_type, tags, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'active', ?, ?, ?, ?, ?, NOW())`,
        [
          ctx.user.id,
          input.title,
          input.description || null,
          input.fileUrl,
          input.fileUrl, // file_key = url for local storage
          input.mimeType || "video/mp4",
          input.fileSizeBytes || 0,
          contentType,
          input.priceCents,
          input.unlockType !== "free" ? 1 : 0,
          input.thumbnailUrl || null,
          input.unlockType,
          input.tags?.length ? JSON.stringify(input.tags) : null,
        ]
      );
      const rows = await rawQuery(
        "SELECT id FROM content WHERE user_id = ? ORDER BY id DESC LIMIT 1",
        [ctx.user.id]
      );
      const contentId = rows[0]?.id;
      // Update creator post count
      await rawExec(
        "UPDATE vaultx_creator_profiles SET total_posts = total_posts + 1 WHERE creator_id = ?",
        [ctx.user.id]
      );
      return { contentId, success: true };
    }),

  // ─── Get Creator's Published Content ─────────────────────────────────────
  getCreatorContent: protectedProcedure
    .input(z.object({
      creatorId: z.number(),
      limit: z.number().default(20),
      offset: z.number().default(0),
    }))
    .query(async ({ ctx, input }) => {
      // Check if fan is subscribed
      const subRows = await rawQuery(
        "SELECT id FROM subscriptions WHERE fan_id = ? AND creator_id = ? AND status = 'active' LIMIT 1",
        [ctx.user.id, input.creatorId]
      );
      const isSubscribed = subRows.length > 0 || ctx.user.id === input.creatorId;
      const rows = await rawQuery(
        `SELECT id, title, description, file_url, thumbnail_url, mime_type, content_type,
                price_cents, is_locked, unlock_type, views, created_at
         FROM content
         WHERE user_id = ? AND status = 'active'
         ORDER BY created_at DESC
         LIMIT ? OFFSET ?`,
        [input.creatorId, input.limit, input.offset]
      );
      // For locked content, mask the file_url unless subscribed or unlocked
      const items = await Promise.all(rows.map(async (row: any) => {
        let accessible = !row.is_locked || isSubscribed;
        if (!accessible && row.unlock_type === "ppv") {
          // Check if fan has unlocked this specific piece
          const unlocked = await rawQuery(
            "SELECT id FROM content_unlocks WHERE fan_id = ? AND content_id = ? LIMIT 1",
            [ctx.user.id, row.id]
          );
          accessible = unlocked.length > 0;
        }
        return {
          ...row,
          file_url: accessible ? row.file_url : null,
          locked: !accessible,
        };
      }));
      return { items, isSubscribed };
    }),

  // ─── saveExportHistory — Platform Vault writes one row per export ────────────
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
        `INSERT INTO platform_export_history
         (creator_id, source_content_id, source_asset_id, platform, output_url, resolution, format, file_size_bytes)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          ctx.user.id,
          input.sourceContentId ?? null,
          input.sourceAssetId ?? null,
          input.platform,
          input.outputUrl,
          input.resolution ?? null,
          input.format ?? null,
          input.fileSizeBytes ?? null,
        ]
      );
      return { success: true };
    }),

  // ─── getExportHistory — retrieve past platform exports ───────────────────────
  getExportHistory: protectedProcedure
    .input(z.object({
      platform: z.string().optional(),
      limit: z.number().min(1).max(100).default(50),
    }))
    .query(async ({ input, ctx }) => {
      const rows = await rawQuery(
        `SELECT * FROM platform_export_history
         WHERE creator_id = ?
         ${input.platform ? "AND platform = ?" : ""}
         ORDER BY exported_at DESC LIMIT ?`,
        input.platform
          ? [ctx.user.id, input.platform, input.limit]
          : [ctx.user.id, input.limit]
      );
      return rows;
    }),

  // ─── publishToVault — mark a Studio output as a published content item ───────
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
        `INSERT INTO content
         (user_id, title, description, file_url, file_key, mime_type, content_type,
          price_cents, is_locked, unlock_type, status, tags, source_asset_id, thumbnail_url, published_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', ?, ?, ?, NOW())`,
        [
          ctx.user.id,
          input.title,
          input.description ?? null,
          input.fileUrl,
          input.fileUrl.split("/").pop() ?? "output",
          input.mimeType,
          input.mimeType.startsWith("video") ? "video" : "audio",
          input.priceCents,
          input.unlockType !== "free" ? 1 : 0,
          input.unlockType,
          input.tags ? JSON.stringify(input.tags) : null,
          input.sourceAssetId ?? null,
          input.thumbnailUrl ?? null,
        ]
      );
      return { success: true, contentId: (result as any).insertId };
    }),

  // ─── savePpvOutput — PPV Engine saves censor/teaser as locked content ────────
  savePpvOutput: protectedProcedure
    .input(z.object({
      fileUrl: z.string().url(),
      outputType: z.enum(["teaser", "censor", "watermark"]),
      priceCents: z.number().min(0).default(999),
      sourceAssetId: z.string().optional(),
      title: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const title = input.title ?? `PPV ${input.outputType.charAt(0).toUpperCase() + input.outputType.slice(1)}`;
      const result = await rawQuery(
        `INSERT INTO content
         (user_id, title, file_url, file_key, mime_type, content_type,
          price_cents, is_locked, unlock_type, status, source_asset_id, published_at)
         VALUES (?, ?, ?, ?, 'video/mp4', 'video', ?, 1, 'ppv', 'active', ?, NOW())`,
        [
          ctx.user.id,
          title,
          input.fileUrl,
          input.fileUrl.split("/").pop() ?? "ppv-output",
          input.priceCents,
          input.sourceAssetId ?? null,
        ]
      );
      return { success: true, contentId: (result as any).insertId };
    }),

});
