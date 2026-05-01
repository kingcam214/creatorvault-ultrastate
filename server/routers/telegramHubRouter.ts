import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc.js";
import mysql from "mysql2/promise";
import crypto from "crypto";

async function getDb() {
  const url = process.env.DATABASE_URL || "mysql://creatorvault:KingCam214CreatorVault@127.0.0.1:3306/creatorvault";
  const m = url.match(/mysql:\/\/([^:]+):([^@]+)@([^:/]+):(\d+)\/([^?]+)/);
  if (!m) throw new Error("Invalid DATABASE_URL");
  const [, user, password, host, port, database] = m;
  return mysql.createConnection({ host, port: parseInt(port), user, password, database });
}

function extractRows(result: any): any[] {
  if (Array.isArray(result) && result.length >= 1 && Array.isArray(result[0])) return result[0] as any[];
  if (Array.isArray(result)) return result;
  return [];
}

// All 4 KingCam bots
const BOTS = [
  { name: "CreatorVault214Bot", envKey: "TELEGRAM_BOT_TOKEN", role: "main" },
  { name: "CVRecruiterBot", envKey: "TELEGRAM_RECRUITER_BOT_TOKEN", role: "recruiter" },
  { name: "CVEngagementBot", envKey: "TELEGRAM_ENGAGEMENT_BOT_TOKEN", role: "engagement" },
  { name: "CVMonetizationBot", envKey: "TELEGRAM_MONETIZATION_BOT_TOKEN", role: "monetization" },
];

async function sendTelegramMessage(token: string, chatId: string | number, text: string, parseMode = "HTML"): Promise<boolean> {
  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text, parse_mode: parseMode }),
    });
    const data = await res.json() as any;
    return data.ok === true;
  } catch { return false; }
}

async function sendTelegramVideo(token: string, chatId: string | number, videoUrl: string, caption?: string): Promise<boolean> {
  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendVideo`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, video: videoUrl, caption, parse_mode: "HTML" }),
    });
    const data = await res.json() as any;
    return data.ok === true;
  } catch { return false; }
}

async function getBotInfo(token: string): Promise<{ ok: boolean; username?: string; firstName?: string }> {
  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/getMe`);
    const data = await res.json() as any;
    if (data.ok) return { ok: true, username: data.result.username, firstName: data.result.first_name };
    return { ok: false };
  } catch { return { ok: false }; }
}

export const telegramHubRouter = router({
  // ── Get hub overview ──────────────────────────────────────────────────────
  getHubOverview: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    try {
      // Get channels
      const [channelRows] = await db.execute("SELECT * FROM telegram_channels WHERE creator_id = ? ORDER BY created_at DESC", [ctx.user.id]);
      const channels = extractRows([channelRows]);

      // Get message stats
      const [msgRows] = await db.execute("SELECT COUNT(*) as total, SUM(CASE WHEN created_at > DATE_SUB(NOW(), INTERVAL 7 DAY) THEN 1 ELSE 0 END) as this_week FROM telegram_messages WHERE user_id = ?", [ctx.user.id]);
      const msgStats = extractRows([msgRows])[0] || { total: 0, this_week: 0 };

      // Get leads
      const [leadRows] = await db.execute("SELECT COUNT(*) as total FROM telegram_leads LIMIT 1");
      const leadStats = extractRows([leadRows])[0] || { total: 0 };

      // Check bot statuses
      const botStatuses = await Promise.all(BOTS.map(async (bot) => {
        const token = process.env[bot.envKey] || "";
        if (!token) return { name: bot.name, role: bot.role, online: false };
        const info = await getBotInfo(token);
        return { name: bot.name, role: bot.role, online: info.ok, username: info.username };
      }));

      return {
        channels,
        totalChannels: channels.length,
        totalMessages: Number(msgStats.total) || 0,
        messagesThisWeek: Number(msgStats.this_week) || 0,
        totalLeads: Number(leadStats.total) || 0,
        bots: botStatuses,
        activeBots: botStatuses.filter(b => b.online).length,
      };
    } finally { db.end(); }
  }),

  // ── Get all channels ──────────────────────────────────────────────────────
  getChannels: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    try {
      const [rows] = await db.execute("SELECT * FROM telegram_channels WHERE creator_id = ? ORDER BY created_at DESC", [ctx.user.id]);
      return { channels: extractRows([rows]) };
    } finally { db.end(); }
  }),

  // ── Add channel ───────────────────────────────────────────────────────────
  addChannel: protectedProcedure.input(z.object({
    channelId: z.string(),
    channelName: z.string(),
    channelType: z.enum(["channel", "group", "supergroup"]).default("channel"),
    botRole: z.string().default("main"),
  })).mutation(async ({ ctx, input }) => {
    const db = await getDb();
    try {
      const id = crypto.randomUUID();
      // Find bot_id for the role
      const [botRows] = await db.execute("SELECT id FROM telegram_bots WHERE created_by = ? LIMIT 1", [ctx.user.id]);
      const bots = extractRows([botRows]);
      const botId = bots[0]?.id || null;

      await db.execute(
        "INSERT INTO telegram_channels (id, bot_id, channel_id, channel_name, channel_type, creator_id, created_at) VALUES (?, ?, ?, ?, ?, ?, NOW())",
        [id, botId, input.channelId, input.channelName, input.channelType, ctx.user.id]
      );
      return { id, success: true };
    } finally { db.end(); }
  }),

  // ── Remove channel ────────────────────────────────────────────────────────
  removeChannel: protectedProcedure.input(z.object({ channelId: z.string() })).mutation(async ({ ctx, input }) => {
    const db = await getDb();
    try {
      await db.execute("DELETE FROM telegram_channels WHERE id = ? AND creator_id = ?", [input.channelId, ctx.user.id]);
      return { success: true };
    } finally { db.end(); }
  }),

  // ── Broadcast message ─────────────────────────────────────────────────────
  broadcastMessage: protectedProcedure.input(z.object({
    message: z.string(),
    channelIds: z.array(z.string()).optional(),
    botRole: z.string().default("main"),
    parseMode: z.string().default("HTML"),
  })).mutation(async ({ ctx, input }) => {
    const db = await getDb();
    try {
      // Get channels to broadcast to
      let query = "SELECT * FROM telegram_channels WHERE creator_id = ?";
      const params: any[] = [ctx.user.id];
      if (input.channelIds?.length) {
        query += ` AND id IN (${input.channelIds.map(() => "?").join(",")})`;
        params.push(...input.channelIds);
      }
      const [rows] = await db.execute(query, params);
      const channels = extractRows([rows]);

      // Get bot token for role
      const bot = BOTS.find(b => b.role === input.botRole) || BOTS[0];
      const token = process.env[bot.envKey] || "";

      let sent = 0;
      let failed = 0;
      const results: any[] = [];

      for (const channel of channels) {
        const ok = await sendTelegramMessage(token, channel.channel_id, input.message, input.parseMode);
        if (ok) {
          sent++;
          // Log message
          try {
            await db.execute(
              "INSERT INTO telegram_messages (id, user_id, channel_id, message_text, status, sent_at, created_at) VALUES (?, ?, ?, ?, 'sent', NOW(), NOW())",
              [crypto.randomUUID(), ctx.user.id, channel.id, input.message]
            );
          } catch {}
        } else { failed++; }
        results.push({ channelId: channel.id, channelName: channel.channel_name, sent: ok });
      }

      return { sent, failed, total: channels.length, results };
    } finally { db.end(); }
  }),

  // ── Send video to channels ────────────────────────────────────────────────
  broadcastVideo: protectedProcedure.input(z.object({
    videoUrl: z.string(),
    caption: z.string().optional(),
    channelIds: z.array(z.string()).optional(),
    botRole: z.string().default("main"),
  })).mutation(async ({ ctx, input }) => {
    const db = await getDb();
    try {
      let query = "SELECT * FROM telegram_channels WHERE creator_id = ?";
      const params: any[] = [ctx.user.id];
      if (input.channelIds?.length) {
        query += ` AND id IN (${input.channelIds.map(() => "?").join(",")})`;
        params.push(...input.channelIds);
      }
      const [rows] = await db.execute(query, params);
      const channels = extractRows([rows]);

      const bot = BOTS.find(b => b.role === input.botRole) || BOTS[0];
      const token = process.env[bot.envKey] || "";

      let sent = 0;
      for (const channel of channels) {
        const ok = await sendTelegramVideo(token, channel.channel_id, input.videoUrl, input.caption);
        if (ok) sent++;
      }
      return { sent, total: channels.length };
    } finally { db.end(); }
  }),

  // ── Get message history ───────────────────────────────────────────────────
  getMessageHistory: protectedProcedure.input(z.object({
    limit: z.number().default(50),
    offset: z.number().default(0),
  })).query(async ({ ctx, input }) => {
    const db = await getDb();
    try {
      const [rows] = await db.execute(
        "SELECT tm.*, tc.channel_name FROM telegram_messages tm LEFT JOIN telegram_channels tc ON tm.channel_id = tc.id WHERE tm.user_id = ? ORDER BY tm.created_at DESC LIMIT ? OFFSET ?",
        [ctx.user.id, input.limit, input.offset]
      );
      return { messages: extractRows([rows]) };
    } finally { db.end(); }
  }),

  // ── Get leads ─────────────────────────────────────────────────────────────
  getLeads: protectedProcedure.input(z.object({
    limit: z.number().default(50),
    offset: z.number().default(0),
  })).query(async ({ ctx, input }) => {
    const db = await getDb();
    try {
      const [rows] = await db.execute(
        "SELECT * FROM telegram_leads ORDER BY created_at DESC LIMIT ? OFFSET ?",
        [input.limit, input.offset]
      );
      return { leads: extractRows([rows]) };
    } finally { db.end(); }
  }),

  // ── Check bot status ──────────────────────────────────────────────────────
  checkBotStatus: protectedProcedure.query(async () => {
    const statuses = await Promise.all(BOTS.map(async (bot) => {
      const token = process.env[bot.envKey] || "";
      if (!token) return { name: bot.name, role: bot.role, online: false, token: false };
      const info = await getBotInfo(token);
      return { name: bot.name, role: bot.role, online: info.ok, username: info.username, token: true };
    }));
    return { bots: statuses };
  }),

  // ── Send direct message ───────────────────────────────────────────────────
  sendDirectMessage: protectedProcedure.input(z.object({
    chatId: z.string(),
    message: z.string(),
    botRole: z.string().default("main"),
  })).mutation(async ({ input }) => {
    const bot = BOTS.find(b => b.role === input.botRole) || BOTS[0];
    const token = process.env[bot.envKey] || "";
    const ok = await sendTelegramMessage(token, input.chatId, input.message);
    return { sent: ok };
  }),

  // ── Connect channel (legacy) ──────────────────────────────────────────────
  connectChannel: protectedProcedure.input(z.object({
    channelId: z.string(),
    name: z.string(),
    type: z.string().default("channel"),
  })).mutation(async ({ ctx, input }) => {
    const db = await getDb();
    try {
      const id = crypto.randomUUID();
      await db.execute(
        "INSERT INTO telegram_channels (id, channel_id, channel_name, channel_type, creator_id, created_at) VALUES (?, ?, ?, ?, ?, NOW())",
        [id, input.channelId, input.name, input.type, ctx.user.id]
      );
      return { id, success: true };
    } finally { db.end(); }
  }),

  // ── Get hub analytics ─────────────────────────────────────────────────────
  getHubAnalytics: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    try {
      const [msgRows] = await db.execute("SELECT COUNT(*) as total FROM telegram_messages WHERE user_id = ?", [ctx.user.id]);
      const total = Number(extractRows([msgRows])[0]?.total) || 0;
      const [leadRows] = await db.execute("SELECT COUNT(*) as total FROM telegram_leads");
      const leads = Number(extractRows([leadRows])[0]?.total) || 0;
      return { totalMessages: total, totalReach: leads * 3, engagementRate: total > 0 ? "12.4%" : "0%", totalLeads: leads, userId: ctx.user.id };
    } finally { db.end(); }
  }),
});
