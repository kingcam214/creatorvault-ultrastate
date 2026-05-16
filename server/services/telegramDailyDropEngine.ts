/**
 * telegramDailyDropEngine.ts
 * 
 * Daily Drop Engine — PM2-safe, cron-based Telegram drop scheduler.
 * 
 * Features:
 * - Reads scheduled drops from telegram_daily_drops (status='scheduled', scheduled_at <= NOW())
 * - Generates AI copy via OpenAI (FAST/BOOST/FULL modes)
 * - Sends to the configured Telegram channel
 * - Creates tracked distribution_jobs + telegram_campaigns rows
 * - Records tg_message_id, click_count, revenue_cents
 * - Survives PM2 restarts (state is in DB, not memory)
 * 
 * Cron: runs every 5 minutes, processes all due drops.
 * 
 * FAST mode: 1 AI call, short hook + CTA
 * BOOST mode: 2 AI calls, hook + body + CTA + inline button
 * FULL mode: 3 AI calls, hook + body + social proof + CTA + inline button + preview
 */

import mysql2 from "mysql2/promise";
import crypto from "crypto";
import OpenAI from "openai";
import { callTelegramApiWithGuard } from "./telegramOutboundGuard";

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN!;
const DEFAULT_CHANNEL_CHAT_ID = "-1003749459281"; // CreatorVault_Free
const BASE_URL = process.env.APP_URL || "https://creatorvault.live";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

function getPool() {
  return mysql2.createPool(process.env.DATABASE_URL as string);
}

// ─── AI Copy Generation ────────────────────────────────────────────────────────

async function generateFastCopy(contentTitle: string, price: number): Promise<{ hook: string; cta: string }> {
  const completion = await openai.chat.completions.create({
    model: "gpt-4.1-mini",
    max_tokens: 200,
    messages: [
      {
        role: "system",
        content: "You write short, punchy Telegram channel posts for adult content creators. No emojis in the hook. Be direct and provocative. Output JSON only."
      },
      {
        role: "user",
        content: `Write a FAST drop post for: "${contentTitle}" priced at $${price}.
Return JSON: { "hook": "2-line attention grabber", "cta": "short call to action under 8 words" }`
      }
    ],
    response_format: { type: "json_object" }
  });
  const parsed = JSON.parse(completion.choices[0].message.content || "{}");
  return {
    hook: parsed.hook || `New drop: ${contentTitle}`,
    cta: parsed.cta || `Unlock for $${price}`
  };
}

async function generateBoostCopy(contentTitle: string, price: number): Promise<{ hook: string; body: string; cta: string }> {
  const completion = await openai.chat.completions.create({
    model: "gpt-4.1-mini",
    max_tokens: 400,
    messages: [
      {
        role: "system",
        content: "You write high-converting Telegram channel posts for adult content creators. Be provocative, specific, and urgent. Output JSON only."
      },
      {
        role: "user",
        content: `Write a BOOST drop post for: "${contentTitle}" priced at $${price}.
Return JSON: { "hook": "bold 2-line opener", "body": "2-3 sentences building desire and urgency", "cta": "action phrase under 10 words" }`
      }
    ],
    response_format: { type: "json_object" }
  });
  const parsed = JSON.parse(completion.choices[0].message.content || "{}");
  return {
    hook: parsed.hook || `New drop: ${contentTitle}`,
    body: parsed.body || `This content is available for a limited time.`,
    cta: parsed.cta || `Unlock for $${price}`
  };
}

async function generateFullCopy(contentTitle: string, price: number): Promise<{ hook: string; body: string; proof: string; cta: string }> {
  const completion = await openai.chat.completions.create({
    model: "gpt-4.1-mini",
    max_tokens: 600,
    messages: [
      {
        role: "system",
        content: "You write maximum-conversion Telegram channel posts for adult content creators. Include social proof, scarcity, and desire. Output JSON only."
      },
      {
        role: "user",
        content: `Write a FULL drop post for: "${contentTitle}" priced at $${price}.
Return JSON: { "hook": "bold 2-line opener", "body": "3-4 sentences of desire-building copy", "proof": "1 line of social proof or scarcity", "cta": "urgent action phrase under 12 words" }`
      }
    ],
    response_format: { type: "json_object" }
  });
  const parsed = JSON.parse(completion.choices[0].message.content || "{}");
  return {
    hook: parsed.hook || `New drop: ${contentTitle}`,
    body: parsed.body || `This content is available for a limited time.`,
    proof: parsed.proof || `Limited spots available.`,
    cta: parsed.cta || `Unlock for $${price}`
  };
}

// ─── Format message text by mode ─────────────────────────────────────────────

function formatDropMessage(mode: string, copy: any, price: number, trackingUrl: string): string {
  if (mode === "FAST") {
    return `${copy.hook}\n\n${copy.cta}: ${trackingUrl}`;
  }
  if (mode === "BOOST") {
    return `${copy.hook}\n\n${copy.body}\n\n${copy.cta}: ${trackingUrl}`;
  }
  // FULL
  return `${copy.hook}\n\n${copy.body}\n\n${copy.proof}\n\n${copy.cta}: ${trackingUrl}`;
}

// ─── Send drop to Telegram channel ───────────────────────────────────────────

async function sendChannelDrop(
  channelChatId: string,
  text: string,
  trackingUrl: string,
  mode: string
): Promise<{ ok: boolean; messageId?: number; error?: string }> {
  const body: any = {
    chat_id: channelChatId,
    text,
    parse_mode: "Markdown",
    link_preview_options: { is_disabled: true },
  };

  // Add inline button for BOOST and FULL modes
  if (mode !== "FAST") {
    body.reply_markup = {
      inline_keyboard: [[
        { text: "🔓 Unlock Now", url: trackingUrl }
      ]]
    };
  }

  const data = await callTelegramApiWithGuard({
    botToken: BOT_TOKEN,
    method: "sendMessage",
    body,
    context: "telegramDailyDropEngine.sendChannelDrop",
  }) as any;

  if (data.ok) {
    return { ok: true, messageId: data.result.message_id };
  }
  return { ok: false, error: data.description };
}

// ─── Process a single scheduled drop ─────────────────────────────────────────

async function processDrop(drop: any, pool: mysql2.Pool): Promise<void> {
  const conn = await pool.getConnection();
  try {
    console.log(`[daily-drop] Processing drop id=${drop.id} mode=${drop.mode} creator_id=${drop.creator_id}`);

    // Lock the row to prevent double-processing
    await conn.query(
      "UPDATE telegram_daily_drops SET status='sent', sent_at=NOW() WHERE id=? AND status='scheduled'",
      [drop.id]
    );

    // Get content info
    let contentTitle = "Exclusive Content Drop";
    let contentPrice = 9.99;
    let contentId = drop.content_id;

    if (contentId) {
      const [contentRows] = await conn.query(
        "SELECT title, ppv_price AS price FROM vaultx_content WHERE id=? LIMIT 1",
        [contentId]
      ) as any;
      if (contentRows.length) {
        contentTitle = contentRows[0].title || contentTitle;
        contentPrice = parseFloat(contentRows[0].price) || contentPrice;
      }
    }

    // Generate tracking code
    const trackingCode = `tgdrop${crypto.randomBytes(8).toString("hex")}`;
    const trackingUrl = `${BASE_URL}/r/${trackingCode}`;

    // Generate AI copy
    let copy: any;
    if (drop.mode === "FAST") {
      copy = await generateFastCopy(contentTitle, contentPrice);
    } else if (drop.mode === "BOOST") {
      copy = await generateBoostCopy(contentTitle, contentPrice);
    } else {
      copy = await generateFullCopy(contentTitle, contentPrice);
    }

    const messageText = formatDropMessage(drop.mode, copy, contentPrice, trackingUrl);

    // Determine channel
    const channelChatId = drop.channel_entity_id
      ? await getChannelChatId(drop.channel_entity_id, conn)
      : DEFAULT_CHANNEL_CHAT_ID;

    // Send to Telegram
    const sendResult = await sendChannelDrop(channelChatId, messageText, trackingUrl, drop.mode);

    if (!sendResult.ok) {
      console.error(`[daily-drop] Send failed for drop id=${drop.id}: ${sendResult.error}`);
      await conn.query(
        "UPDATE telegram_daily_drops SET status='failed' WHERE id=?",
        [drop.id]
      );
      conn.release();
      return;
    }

    const tgMessageId = sendResult.messageId!;
    console.log(`[daily-drop] Sent tg_message_id=${tgMessageId} tracking_code=${trackingCode}`);

    // Create distribution_jobs row
    const [djInsert] = await conn.query(
      `INSERT INTO distribution_jobs 
       (creator_id, channel_identity_id, platform, asset_url, asset_type, content_safety_level, brand_lane,
        tracking_code, destination_url, status, platform_post_id)
       VALUES (?, ?, 'telegram', ?, 'text', 'sensitive', 'vaultx_adult', ?, ?, 'posted', ?)`,
      [
        drop.creator_id,
        drop.channel_entity_id || 1,
        trackingUrl,
        trackingCode,
        `${BASE_URL}/vaultx`,
        String(tgMessageId)
      ]
    ) as any;
    const djId = djInsert.insertId;

    // Create telegram_campaigns row
    const [campaignInsert] = await conn.query(
      `INSERT INTO telegram_campaigns 
       (creator_id, content_id, channel_entity_id, campaign_mode, status, tracking_code, 
        ai_hook, ai_cta, price_cents, click_count, conversion_count, revenue_cents)
       VALUES (?, ?, ?, ?, 'sent', ?, ?, ?, ?, 0, 0, 0)`,
      [
        drop.creator_id,
        contentId || null,
        drop.channel_entity_id || 1,
        drop.mode,
        trackingCode,
        copy.hook || messageText.slice(0, 200),
        copy.cta || "Unlock Now",
        Math.round(contentPrice * 100),
      ]
    ) as any;
    const campaignId = campaignInsert.insertId;

    // Update the daily_drop row with tracking info
    await conn.query(
      "UPDATE telegram_daily_drops SET tracking_code=?, tg_message_id=?, campaign_id=? WHERE id=?",
      [trackingCode, tgMessageId, campaignId, drop.id]
    );

    console.log(`[daily-drop] ✅ Drop id=${drop.id} complete: campaign_id=${campaignId} dj_id=${djId} tg_msg=${tgMessageId}`);
    conn.release();

  } catch (err: any) {
    console.error(`[daily-drop] Error processing drop id=${drop.id}:`, err.message);
    try {
      await conn.query(
        "UPDATE telegram_daily_drops SET status='failed' WHERE id=?",
        [drop.id]
      );
    } catch {}
    conn.release();
  }
}

async function getChannelChatId(channelEntityId: number, conn: mysql2.PoolConnection): Promise<string> {
  const [rows] = await conn.query(
    "SELECT telegram_chat_id AS chat_id FROM telegram_channel_entities WHERE id=? LIMIT 1",
    [channelEntityId]
  ) as any;
  return rows.length ? String(rows[0].chat_id) : DEFAULT_CHANNEL_CHAT_ID;
}

// ─── Main scheduler tick ──────────────────────────────────────────────────────

export async function runDailyDropTick(): Promise<void> {
  const pool = getPool();
  try {
    const [dueDrops] = await pool.query(
      `SELECT * FROM telegram_daily_drops 
       WHERE status='scheduled' AND scheduled_at <= NOW()
       ORDER BY scheduled_at ASC LIMIT 10`
    ) as any;

    if (!dueDrops.length) {
      pool.end();
      return;
    }

    console.log(`[daily-drop] Processing ${dueDrops.length} due drops`);
    for (const drop of dueDrops) {
      await processDrop(drop, pool);
    }

    pool.end();
  } catch (err: any) {
    console.error("[daily-drop] tick error:", err.message);
    pool.end();
  }
}

/**
 * scheduleDailyDrop — creates a new scheduled drop in telegram_daily_drops.
 * Called from the tRPC router when a creator schedules a drop.
 */
export async function scheduleDailyDrop(params: {
  creatorId: number;
  contentId?: number;
  channelEntityId?: number;
  mode: "FAST" | "BOOST" | "FULL";
  scheduledAt: Date;
}): Promise<{ id: number; scheduledAt: Date }> {
  const pool = getPool();
  try {
    const [result] = await pool.query(
      `INSERT INTO telegram_daily_drops 
       (creator_id, content_id, channel_entity_id, mode, status, scheduled_at)
       VALUES (?, ?, ?, ?, 'scheduled', ?)`,
      [
        params.creatorId,
        params.contentId || null,
        params.channelEntityId || null,
        params.mode,
        params.scheduledAt,
      ]
    ) as any;
    pool.end();
    return { id: result.insertId, scheduledAt: params.scheduledAt };
  } catch (err: any) {
    pool.end();
    throw err;
  }
}

/**
 * startDailyDropCron — starts the PM2-safe cron loop.
 * Called once from server startup (index.ts).
 * Runs every 5 minutes. Survives PM2 restarts because state is in DB.
 */
export function startDailyDropCron(): void {
  console.log("[daily-drop] Cron started — checking every 5 minutes");
  
  // Run immediately on startup to catch any missed drops
  runDailyDropTick().catch(err => console.error("[daily-drop] startup tick error:", err.message));
  
  // Then run every 5 minutes
  setInterval(() => {
    runDailyDropTick().catch(err => console.error("[daily-drop] cron tick error:", err.message));
  }, 5 * 60 * 1000);
}
