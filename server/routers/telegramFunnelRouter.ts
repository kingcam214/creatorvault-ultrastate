/**
 * VaultX Telegram Funnel OS Router
 * 
 * Procedures:
 *   channel.list            - List all channel entities
 *   channel.create          - Register a new channel entity
 *   channel.post            - Post message/video to a channel with tracking
 *   subscriber.upsert       - Create or update a subscriber record
 *   subscriber.list         - List subscribers with segment filter
 *   subscriber.segment      - Update subscriber segment
 *   funnel.list             - List funnel definitions
 *   funnel.create           - Create a funnel definition
 *   funnel.enroll           - Enroll a subscriber into a funnel
 *   funnel.processStep      - Execute the next pending funnel step
 *   funnel.processAllDue    - Process all due automation jobs (cron target)
 *   campaign.create         - Create a campaign delivery
 *   campaign.send           - Execute a campaign send
 *   campaign.list           - List campaigns with stats
 *   analytics.overview      - Platform-level Telegram analytics
 *   analytics.attribution   - Attribution chain: Telegram → purchase → revenue
 *   conversion.record       - Record a conversion event
 */

import { router, protectedProcedure, publicProcedure } from "../_core/trpc.js";
import { z } from "zod";
import mysql from "mysql2/promise";
import crypto from "crypto";
import { callTelegramApiWithGuard } from "../services/telegramOutboundGuard";

// ── DB helper ─────────────────────────────────────────────────────────────────
async function getDb() {
  const url = process.env.DATABASE_URL || "mysql://creatorvault:KingCam214CreatorVault@127.0.0.1:3306/creatorvault";
  const m = url.match(/mysql:\/\/([^:]+):([^@]+)@([^:/]+):(\d+)\/([^?]+)/);
  if (!m) throw new Error("Invalid DATABASE_URL");
  const [, user, password, host, port, database] = m;
  return mysql.createConnection({ host, port: parseInt(port), user, password, database });
}

function rows(result: any): any[] {
  if (Array.isArray(result) && result.length >= 1 && Array.isArray(result[0])) return result[0] as any[];
  if (Array.isArray(result)) return result;
  return [];
}

// ── Bot token resolver ────────────────────────────────────────────────────────
function getBotToken(role: string = "main"): string {
  const map: Record<string, string> = {
    main:         process.env.TELEGRAM_BOT_TOKEN || "",
    recruiter:    process.env.TELEGRAM_RECRUITER_BOT_TOKEN || "",
    engagement:   process.env.TELEGRAM_ENGAGEMENT_BOT_TOKEN || "",
    monetization: process.env.TELEGRAM_MONETIZATION_BOT_TOKEN || "",
  };
  return map[role] || map.main;
}

// ── Telegram API helpers ──────────────────────────────────────────────────────
async function tgSendMessage(
  token: string,
  chatId: string | number,
  text: string,
  inlineButtons?: Array<{ text: string; url?: string; callback_data?: string }>,
  parseMode = "HTML"
): Promise<{ ok: boolean; messageId?: number; error?: string }> {
  const body: any = { chat_id: chatId, text, parse_mode: parseMode };
  if (inlineButtons && inlineButtons.length > 0) {
    body.reply_markup = {
      inline_keyboard: [inlineButtons.map(b => ({
        text: b.text,
        ...(b.url ? { url: b.url } : {}),
        ...(b.callback_data ? { callback_data: b.callback_data } : {}),
      }))],
    };
  }
  try {
    const data = await callTelegramApiWithGuard({
      botToken: token,
      method: "sendMessage",
      body,
      context: "telegramFunnelRouter.tgSendMessage",
    }) as any;
    return data.ok ? { ok: true, messageId: data.result?.message_id } : { ok: false, error: data.description };
  } catch (e: any) {
    return { ok: false, error: e.message };
  }
}

async function tgSendVideo(
  token: string,
  chatId: string | number,
  videoUrl: string,
  caption?: string,
  inlineButtons?: Array<{ text: string; url?: string; callback_data?: string }>
): Promise<{ ok: boolean; messageId?: number; error?: string }> {
  const body: any = { chat_id: chatId, video: videoUrl, caption, parse_mode: "HTML" };
  if (inlineButtons && inlineButtons.length > 0) {
    body.reply_markup = {
      inline_keyboard: [inlineButtons.map(b => ({
        text: b.text,
        ...(b.url ? { url: b.url } : {}),
        ...(b.callback_data ? { callback_data: b.callback_data } : {}),
      }))],
    };
  }
  try {
    const data = await callTelegramApiWithGuard({
      botToken: token,
      method: "sendVideo",
      body,
      context: "telegramFunnelRouter.tgSendVideo",
    }) as any;
    return data.ok ? { ok: true, messageId: data.result?.message_id } : { ok: false, error: data.description };
  } catch (e: any) {
    return { ok: false, error: e.message };
  }
}

// ── Generate tracking code ────────────────────────────────────────────────────
function genTrackingCode(prefix = "tg"): string {
  return `${prefix}${Date.now().toString(36)}${crypto.randomBytes(3).toString("hex")}`;
}

// ── Router ────────────────────────────────────────────────────────────────────
export const telegramFunnelRouter = router({

  // ═══════════════════════════════════════════════════════════════════════════
  // CHANNEL MANAGEMENT
  // ═══════════════════════════════════════════════════════════════════════════

  "channel.list": protectedProcedure.query(async () => {
    const db = await getDb();
    try {
      const [result] = await db.execute(
        "SELECT * FROM telegram_channel_entities ORDER BY channel_type, display_name"
      );
      return { channels: rows(result) };
    } finally { await db.end(); }
  }),

  "channel.create": protectedProcedure
    .input(z.object({
      telegramChatId: z.string(),
      telegramUsername: z.string().optional(),
      displayName: z.string(),
      channelType: z.enum(["discovery","creator_personal","creator_vip","vaultx_brand","inner_circle","agency","campaign"]),
      ownerType: z.enum(["platform","creator","agency"]).default("platform"),
      ownerId: z.number().optional(),
      visibility: z.enum(["public","private","invite_only"]).default("public"),
      monetizationLevel: z.enum(["free","vip","inner_circle","paid"]).default("free"),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      try {
        await db.execute(
          `INSERT INTO telegram_channel_entities 
           (telegram_chat_id, telegram_username, display_name, channel_type, owner_type, owner_id, visibility, monetization_level)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [input.telegramChatId, input.telegramUsername || null, input.displayName,
           input.channelType, input.ownerType, input.ownerId || null,
           input.visibility, input.monetizationLevel]
        );
        return { success: true };
      } finally { await db.end(); }
    }),

  "channel.post": protectedProcedure
    .input(z.object({
      channelEntityId: z.number(),
      messageText: z.string().optional(),
      videoUrl: z.string().optional(),
      caption: z.string().optional(),
      inlineButtons: z.array(z.object({
        text: z.string(),
        url: z.string().optional(),
        callback_data: z.string().optional(),
      })).optional(),
      botRole: z.enum(["main","recruiter","engagement","monetization"]).default("main"),
      campaignName: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      try {
        const [chanResult] = await db.execute(
          "SELECT * FROM telegram_channel_entities WHERE id = ?",
          [input.channelEntityId]
        );
        const channel = rows(chanResult)[0];
        if (!channel) throw new Error("Channel not found");

        const token = getBotToken(input.botRole);
        const trackingCode = genTrackingCode("tgch");
        
        // Build buttons with tracking URL if no explicit URL
        const buttons = input.inlineButtons || [];
        
        let result;
        if (input.videoUrl) {
          result = await tgSendVideo(token, channel.telegram_chat_id, input.videoUrl, input.caption, buttons);
        } else if (input.messageText) {
          result = await tgSendMessage(token, channel.telegram_chat_id, input.messageText, buttons);
        } else {
          throw new Error("Must provide messageText or videoUrl");
        }

        // Log campaign delivery
        if (input.campaignName) {
          await db.execute(
            `INSERT INTO telegram_campaign_deliveries 
             (campaign_name, channel_entity_id, message_text, media_url, media_type, inline_buttons, tracking_code, sent_at, status, delivered_count)
             VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), ?, ?)`,
            [input.campaignName, input.channelEntityId,
             input.messageText || input.caption || "",
             input.videoUrl || null,
             input.videoUrl ? "video" : "text",
             JSON.stringify(buttons),
             trackingCode,
             result.ok ? "sent" : "failed",
             result.ok ? 1 : 0]
          );
        }

        // Log message event
        await db.execute(
          `INSERT INTO telegram_message_events 
           (telegram_id, direction, message_type, message_text, tracking_code)
           VALUES (?, 'outbound', ?, ?, ?)`,
          [channel.telegram_chat_id, input.videoUrl ? "video" : "text",
           input.messageText || input.caption || "", trackingCode]
        );

        return { success: result.ok, messageId: result.messageId, trackingCode, error: result.error };
      } finally { await db.end(); }
    }),

  // ═══════════════════════════════════════════════════════════════════════════
  // SUBSCRIBER MANAGEMENT
  // ═══════════════════════════════════════════════════════════════════════════

  "subscriber.upsert": publicProcedure
    .input(z.object({
      telegramId: z.number(),
      username: z.string().optional(),
      firstName: z.string().optional(),
      lastName: z.string().optional(),
      platformUserId: z.number().optional(),
      sourceTrackingCode: z.string().optional(),
      sourceChannelId: z.number().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      try {
        await db.execute(
          `INSERT INTO telegram_subscribers 
           (telegram_id, username, first_name, last_name, platform_user_id, source_tracking_code, source_channel_id, last_active_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, NOW())
           ON DUPLICATE KEY UPDATE
             username = COALESCE(VALUES(username), username),
             first_name = COALESCE(VALUES(first_name), first_name),
             last_name = COALESCE(VALUES(last_name), last_name),
             platform_user_id = COALESCE(VALUES(platform_user_id), platform_user_id),
             last_active_at = NOW()`,
          [input.telegramId, input.username || null, input.firstName || null,
           input.lastName || null, input.platformUserId || null,
           input.sourceTrackingCode || null, input.sourceChannelId || null]
        );
        const [subResult] = await db.execute(
          "SELECT * FROM telegram_subscribers WHERE telegram_id = ?",
          [input.telegramId]
        );
        return { subscriber: rows(subResult)[0] };
      } finally { await db.end(); }
    }),

  "subscriber.list": protectedProcedure
    .input(z.object({
      segment: z.string().optional(),
      lifecycleStage: z.string().optional(),
      limit: z.number().default(50),
      offset: z.number().default(0),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      try {
        let where = "WHERE 1=1";
        const params: any[] = [];
        if (input.segment) { where += " AND segment = ?"; params.push(input.segment); }
        if (input.lifecycleStage) { where += " AND lifecycle_stage = ?"; params.push(input.lifecycleStage); }
        params.push(input.limit, input.offset);
        const [result] = await db.execute(
          `SELECT * FROM telegram_subscribers ${where} ORDER BY last_active_at DESC LIMIT ? OFFSET ?`,
          params
        );
        const [countResult] = await db.execute(
          `SELECT COUNT(*) as total FROM telegram_subscribers ${where}`,
          params.slice(0, -2)
        );
        return { subscribers: rows(result), total: (rows(countResult)[0] as any)?.total || 0 };
      } finally { await db.end(); }
    }),

  "subscriber.segment": protectedProcedure
    .input(z.object({
      subscriberId: z.number(),
      segment: z.enum(["free_lurker","warm_lead","active_buyer","repeat_buyer","vip_buyer","whale","inactive","creator_fan"]),
      lifecycleStage: z.enum(["new","engaged","converted","retained","churned","reactivated"]).optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      try {
        const updates: string[] = ["segment = ?"];
        const params: any[] = [input.segment];
        if (input.lifecycleStage) { updates.push("lifecycle_stage = ?"); params.push(input.lifecycleStage); }
        params.push(input.subscriberId);
        await db.execute(
          `UPDATE telegram_subscribers SET ${updates.join(", ")} WHERE id = ?`,
          params
        );
        return { success: true };
      } finally { await db.end(); }
    }),

  // ═══════════════════════════════════════════════════════════════════════════
  // FUNNEL MANAGEMENT
  // ═══════════════════════════════════════════════════════════════════════════

  "funnel.list": protectedProcedure.query(async () => {
    const db = await getDb();
    try {
      const [result] = await db.execute(
        `SELECT fd.*, 
           (SELECT COUNT(*) FROM telegram_funnel_steps WHERE funnel_id = fd.id) as step_count,
           (SELECT COUNT(*) FROM telegram_funnel_enrollments WHERE funnel_id = fd.id AND status = 'active') as active_enrollments
         FROM telegram_funnel_definitions fd ORDER BY created_at DESC`
      );
      return { funnels: rows(result) };
    } finally { await db.end(); }
  }),

  "funnel.create": protectedProcedure
    .input(z.object({
      name: z.string(),
      funnelType: z.enum(["ppv_conversion","vip_upsell","reactivation","onboarding","teaser_drip","whale_escalation"]),
      triggerType: z.enum(["manual","channel_join","keyword","purchase","inactivity","schedule"]).default("manual"),
      triggerValue: z.string().optional(),
      targetSegment: z.string().optional(),
      creatorId: z.number().optional(),
      steps: z.array(z.object({
        stepNumber: z.number(),
        stepType: z.enum(["message","video","inline_button","delay","condition","ppv_offer","vip_offer"]),
        delayMinutes: z.number().default(0),
        messageText: z.string().optional(),
        mediaUrl: z.string().optional(),
        mediaType: z.enum(["video","photo","document"]).optional(),
        inlineButtons: z.array(z.object({ text: z.string(), url: z.string().optional(), callback_data: z.string().optional() })).optional(),
        ppvContentId: z.number().optional(),
      })).optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      try {
        const [insertResult] = await db.execute(
          `INSERT INTO telegram_funnel_definitions 
           (creator_id, name, funnel_type, trigger_type, trigger_value, target_segment)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [input.creatorId || null, input.name, input.funnelType,
           input.triggerType, input.triggerValue || null, input.targetSegment || null]
        ) as any;
        const funnelId = insertResult.insertId;

        if (input.steps && input.steps.length > 0) {
          for (const step of input.steps) {
            await db.execute(
              `INSERT INTO telegram_funnel_steps 
               (funnel_id, step_number, step_type, delay_minutes, message_text, media_url, media_type, inline_buttons, ppv_content_id)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
              [funnelId, step.stepNumber, step.stepType, step.delayMinutes,
               step.messageText || null, step.mediaUrl || null, step.mediaType || null,
               step.inlineButtons ? JSON.stringify(step.inlineButtons) : null,
               step.ppvContentId || null]
            );
          }
        }
        return { success: true, funnelId };
      } finally { await db.end(); }
    }),

  "funnel.enroll": protectedProcedure
    .input(z.object({
      funnelId: z.number(),
      subscriberId: z.number(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      try {
        // Check not already enrolled
        const [existing] = await db.execute(
          "SELECT id FROM telegram_funnel_enrollments WHERE funnel_id = ? AND subscriber_id = ? AND status = 'active'",
          [input.funnelId, input.subscriberId]
        );
        if (rows(existing).length > 0) return { success: false, reason: "already_enrolled" };

        // Get first step delay
        const [stepResult] = await db.execute(
          "SELECT * FROM telegram_funnel_steps WHERE funnel_id = ? ORDER BY step_number ASC LIMIT 1",
          [input.funnelId]
        );
        const firstStep = rows(stepResult)[0];
        const nextStepAt = firstStep
          ? new Date(Date.now() + (firstStep.delay_minutes || 0) * 60000)
          : new Date();

        await db.execute(
          `INSERT INTO telegram_funnel_enrollments (funnel_id, subscriber_id, current_step, status, next_step_at)
           VALUES (?, ?, 0, 'active', ?)`,
          [input.funnelId, input.subscriberId, nextStepAt]
        );

        // Update funnel total_enrolled
        await db.execute(
          "UPDATE telegram_funnel_definitions SET total_enrolled = total_enrolled + 1 WHERE id = ?",
          [input.funnelId]
        );

        // Schedule automation job for first step
        if (firstStep) {
          await db.execute(
            `INSERT INTO telegram_automation_jobs (job_type, funnel_id, funnel_step_id, subscriber_id, scheduled_at)
             VALUES ('drip_step', ?, ?, ?, ?)`,
            [input.funnelId, firstStep.id, input.subscriberId, nextStepAt]
          );
        }

        return { success: true };
      } finally { await db.end(); }
    }),

  "funnel.processAllDue": protectedProcedure.mutation(async () => {
    const db = await getDb();
    try {
      // Get all due automation jobs
      const [jobResult] = await db.execute(
        `SELECT aj.*, ts.telegram_id, ts.username, tfs.message_text, tfs.media_url, tfs.media_type, 
                tfs.inline_buttons, tfs.step_number, tfs.funnel_id as step_funnel_id,
                tfe.id as enrollment_id
         FROM telegram_automation_jobs aj
         JOIN telegram_subscribers ts ON ts.id = aj.subscriber_id
         JOIN telegram_funnel_steps tfs ON tfs.id = aj.funnel_step_id
         JOIN telegram_funnel_enrollments tfe ON tfe.funnel_id = aj.funnel_id AND tfe.subscriber_id = aj.subscriber_id
         WHERE aj.status = 'pending' AND aj.scheduled_at <= NOW()
         LIMIT 50`
      );
      const jobs = rows(jobResult);
      const results = { processed: 0, succeeded: 0, failed: 0 };

      for (const job of jobs) {
        results.processed++;
        try {
          await db.execute("UPDATE telegram_automation_jobs SET status = 'running' WHERE id = ?", [job.id]);
          
          const token = getBotToken("monetization");
          const buttons = job.inline_buttons ? JSON.parse(job.inline_buttons) : [];
          
          let sendResult;
          if (job.media_url && job.media_type === "video") {
            sendResult = await tgSendVideo(token, job.telegram_id, job.media_url, job.message_text, buttons);
          } else if (job.message_text) {
            sendResult = await tgSendMessage(token, job.telegram_id, job.message_text, buttons);
          } else {
            sendResult = { ok: false, error: "No content" };
          }

          if (sendResult.ok) {
            await db.execute("UPDATE telegram_automation_jobs SET status = 'done', executed_at = NOW() WHERE id = ?", [job.id]);
            
            // Advance enrollment to next step
            const [nextStepResult] = await db.execute(
              `SELECT * FROM telegram_funnel_steps 
               WHERE funnel_id = ? AND step_number > ? ORDER BY step_number ASC LIMIT 1`,
              [job.funnel_id, job.step_number]
            );
            const nextStep = rows(nextStepResult)[0];
            
            if (nextStep) {
              const nextAt = new Date(Date.now() + (nextStep.delay_minutes || 0) * 60000);
              await db.execute(
                "UPDATE telegram_funnel_enrollments SET current_step = ?, next_step_at = ? WHERE id = ?",
                [nextStep.step_number, nextAt, job.enrollment_id]
              );
              await db.execute(
                `INSERT INTO telegram_automation_jobs (job_type, funnel_id, funnel_step_id, subscriber_id, scheduled_at)
                 VALUES ('drip_step', ?, ?, ?, ?)`,
                [job.funnel_id, nextStep.id, job.subscriber_id, nextAt]
              );
            } else {
              // Funnel complete
              await db.execute(
                "UPDATE telegram_funnel_enrollments SET status = 'completed', completed_at = NOW() WHERE id = ?",
                [job.enrollment_id]
              );
            }
            results.succeeded++;
          } else {
            await db.execute(
              "UPDATE telegram_automation_jobs SET status = 'failed', error_message = ? WHERE id = ?",
              [sendResult.error || "Send failed", job.id]
            );
            results.failed++;
          }
        } catch (e: any) {
          await db.execute(
            "UPDATE telegram_automation_jobs SET status = 'failed', error_message = ? WHERE id = ?",
            [e.message, job.id]
          );
          results.failed++;
        }
      }
      return results;
    } finally { await db.end(); }
  }),

  // ═══════════════════════════════════════════════════════════════════════════
  // CAMPAIGN MANAGEMENT
  // ═══════════════════════════════════════════════════════════════════════════

  "campaign.create": protectedProcedure
    .input(z.object({
      campaignName: z.string(),
      channelEntityId: z.number().optional(),
      targetSegment: z.string().optional(),
      messageText: z.string(),
      mediaUrl: z.string().optional(),
      mediaType: z.enum(["video","photo","document","text"]).default("text"),
      inlineButtons: z.array(z.object({ text: z.string(), url: z.string().optional(), callback_data: z.string().optional() })).optional(),
      scheduledAt: z.string().optional(),
      creatorId: z.number().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      try {
        const trackingCode = genTrackingCode("tgcmp");
        const [result] = await db.execute(
          `INSERT INTO telegram_campaign_deliveries 
           (campaign_name, creator_id, channel_entity_id, target_segment, message_text, media_url, media_type, inline_buttons, tracking_code, scheduled_at, status)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [input.campaignName, input.creatorId || null, input.channelEntityId || null,
           input.targetSegment || null, input.messageText, input.mediaUrl || null,
           input.mediaType, JSON.stringify(input.inlineButtons || []),
           trackingCode, input.scheduledAt || null,
           input.scheduledAt ? "scheduled" : "draft"]
        ) as any;
        return { success: true, campaignId: (result as any).insertId, trackingCode };
      } finally { await db.end(); }
    }),

  "campaign.send": protectedProcedure
    .input(z.object({
      campaignId: z.number(),
      botRole: z.enum(["main","recruiter","engagement","monetization"]).default("monetization"),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      try {
        const [campResult] = await db.execute(
          "SELECT * FROM telegram_campaign_deliveries WHERE id = ?",
          [input.campaignId]
        );
        const campaign = rows(campResult)[0];
        if (!campaign) throw new Error("Campaign not found");

        await db.execute("UPDATE telegram_campaign_deliveries SET status = 'sending' WHERE id = ?", [input.campaignId]);

        const token = getBotToken(input.botRole);
        const buttons = campaign.inline_buttons ? JSON.parse(campaign.inline_buttons) : [];
        let delivered = 0;
        let failed = 0;

        if (campaign.channel_entity_id) {
          // Channel broadcast
          const [chanResult] = await db.execute(
            "SELECT * FROM telegram_channel_entities WHERE id = ?",
            [campaign.channel_entity_id]
          );
          const channel = rows(chanResult)[0];
          if (channel) {
            let result;
            if (campaign.media_url && campaign.media_type === "video") {
              result = await tgSendVideo(token, channel.telegram_chat_id, campaign.media_url, campaign.message_text, buttons);
            } else {
              result = await tgSendMessage(token, channel.telegram_chat_id, campaign.message_text, buttons);
            }
            if (result.ok) delivered++; else failed++;
          }
        } else if (campaign.target_segment) {
          // Segment DM blast
          const [subResult] = await db.execute(
            "SELECT telegram_id FROM telegram_subscribers WHERE segment = ? AND opted_out = 0 LIMIT 1000",
            [campaign.target_segment]
          );
          const subs = rows(subResult);
          for (const sub of subs) {
            let result;
            if (campaign.media_url && campaign.media_type === "video") {
              result = await tgSendVideo(token, sub.telegram_id, campaign.media_url, campaign.message_text, buttons);
            } else {
              result = await tgSendMessage(token, sub.telegram_id, campaign.message_text, buttons);
            }
            if (result.ok) delivered++; else failed++;
            // Rate limit: 30 messages/second max
            await new Promise(r => setTimeout(r, 35));
          }
        }

        await db.execute(
          "UPDATE telegram_campaign_deliveries SET status = 'sent', sent_at = NOW(), delivered_count = ?, recipients_count = ? WHERE id = ?",
          [delivered, delivered + failed, input.campaignId]
        );

        return { success: true, delivered, failed };
      } finally { await db.end(); }
    }),

  "campaign.list": protectedProcedure.query(async () => {
    const db = await getDb();
    try {
      const [result] = await db.execute(
        "SELECT * FROM telegram_campaign_deliveries ORDER BY created_at DESC LIMIT 50"
      );
      return { campaigns: rows(result) };
    } finally { await db.end(); }
  }),

  // ═══════════════════════════════════════════════════════════════════════════
  // ANALYTICS & ATTRIBUTION
  // ═══════════════════════════════════════════════════════════════════════════

  "analytics.overview": protectedProcedure.query(async () => {
    const db = await getDb();
    try {
      const [subStats] = await db.execute(
        `SELECT 
           COUNT(*) as total_subscribers,
           SUM(CASE WHEN segment = 'active_buyer' THEN 1 ELSE 0 END) as active_buyers,
           SUM(CASE WHEN segment = 'vip_buyer' THEN 1 ELSE 0 END) as vip_buyers,
           SUM(CASE WHEN segment = 'whale' THEN 1 ELSE 0 END) as whales,
           SUM(CASE WHEN lifecycle_stage = 'converted' THEN 1 ELSE 0 END) as converted,
           SUM(total_spent_cents) / 100.0 as total_revenue
         FROM telegram_subscribers`
      );
      const [chanStats] = await db.execute(
        "SELECT channel_type, COUNT(*) as cnt FROM telegram_channel_entities WHERE is_active = 1 GROUP BY channel_type"
      );
      const [funnelStats] = await db.execute(
        `SELECT fd.name, fd.funnel_type, fd.total_enrolled, fd.total_converted,
           (SELECT COUNT(*) FROM telegram_funnel_enrollments WHERE funnel_id = fd.id AND status = 'active') as active
         FROM telegram_funnel_definitions fd WHERE fd.is_active = 1`
      );
      const [campStats] = await db.execute(
        `SELECT SUM(delivered_count) as total_delivered, SUM(click_count) as total_clicks,
           SUM(conversion_count) as total_conversions, SUM(revenue_cents) / 100.0 as total_revenue
         FROM telegram_campaign_deliveries WHERE status = 'sent'`
      );
      const [convStats] = await db.execute(
        `SELECT event_type, COUNT(*) as cnt, SUM(amount_cents) / 100.0 as revenue
         FROM telegram_conversion_events GROUP BY event_type`
      );
      return {
        subscribers: rows(subStats)[0],
        channels: rows(chanStats),
        funnels: rows(funnelStats),
        campaigns: rows(campStats)[0],
        conversions: rows(convStats),
      };
    } finally { await db.end(); }
  }),

  "analytics.attribution": protectedProcedure
    .input(z.object({ trackingCode: z.string().optional(), days: z.number().default(30) }))
    .query(async ({ input }) => {
      const db = await getDb();
      try {
        let where = "WHERE created_at > DATE_SUB(NOW(), INTERVAL ? DAY)";
        const params: any[] = [input.days];
        if (input.trackingCode) { where += " AND tracking_code = ?"; params.push(input.trackingCode); }
        const [result] = await db.execute(
          `SELECT tracking_code, event_type, COUNT(*) as cnt, SUM(amount_cents) / 100.0 as revenue
           FROM telegram_conversion_events ${where}
           GROUP BY tracking_code, event_type ORDER BY created_at DESC`,
          params
        );
        // Also pull from distribution attribution_events
        const [distResult] = await db.execute(
          `SELECT tracking_code, COUNT(*) as clicks FROM attribution_events 
           WHERE platform = 'telegram' AND created_at > DATE_SUB(NOW(), INTERVAL ? DAY)
           GROUP BY tracking_code`,
          [input.days]
        );
        return { conversions: rows(result), clicks: rows(distResult) };
      } finally { await db.end(); }
    }),

  "conversion.record": publicProcedure
    .input(z.object({
      telegramId: z.number().optional(),
      platformUserId: z.number().optional(),
      eventType: z.enum(["ppv_purchase","vip_join","tip","subscription","unlock","channel_join"]),
      contentId: z.number().optional(),
      creatorId: z.number().optional(),
      campaignId: z.number().optional(),
      funnelId: z.number().optional(),
      trackingCode: z.string().optional(),
      amountCents: z.number().default(0),
      platformFeeCents: z.number().default(0),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      try {
        const creatorRevenueCents = input.amountCents - input.platformFeeCents;
        await db.execute(
          `INSERT INTO telegram_conversion_events 
           (telegram_id, platform_user_id, event_type, content_id, creator_id, campaign_id, funnel_id, tracking_code, amount_cents, platform_fee_cents, creator_revenue_cents)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [input.telegramId || null, input.platformUserId || null, input.eventType,
           input.contentId || null, input.creatorId || null, input.campaignId || null,
           input.funnelId || null, input.trackingCode || null,
           input.amountCents, input.platformFeeCents, creatorRevenueCents]
        );

        // Update subscriber stats if telegram_id known
        if (input.telegramId && input.amountCents > 0) {
          await db.execute(
            `UPDATE telegram_subscribers 
             SET total_spent_cents = total_spent_cents + ?,
                 purchase_count = purchase_count + 1,
                 lifecycle_stage = 'converted',
                 segment = CASE 
                   WHEN total_spent_cents + ? >= 10000 THEN 'whale'
                   WHEN total_spent_cents + ? >= 5000 THEN 'vip_buyer'
                   WHEN purchase_count >= 2 THEN 'repeat_buyer'
                   ELSE 'active_buyer'
                 END
             WHERE telegram_id = ?`,
            [input.amountCents, input.amountCents, input.amountCents, input.telegramId]
          );
        }

        // Update campaign conversion count
        if (input.campaignId) {
          await db.execute(
            "UPDATE telegram_campaign_deliveries SET conversion_count = conversion_count + 1, revenue_cents = revenue_cents + ? WHERE id = ?",
            [input.amountCents, input.campaignId]
          );
        }

        return { success: true, creatorRevenueCents };
      } finally { await db.end(); }
    }),
});
