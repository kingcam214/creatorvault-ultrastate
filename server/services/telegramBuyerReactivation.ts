/**
 * telegramBuyerReactivation.ts
 *
 * Buyer Reactivation Engine — PM2-safe cron-based DM reactivation.
 *
 * Logic:
 * 1. Query telegram_subscribers where:
 *    - segment IN ('active_buyer', 'repeat_buyer', 'vip_offer_sent', 'vip_buyer', 'whale')
 *    - last_active_at < NOW() - INTERVAL 7 DAY  (OR last_active_at IS NULL)
 *    - opted_out = 0
 *    - No pending/sent reactivation job in last 7 days
 * 2. For each inactive buyer, create a telegram_reactivation_jobs row (status=pending)
 * 3. Generate personalized AI reactivation copy via OpenAI
 * 4. Send DM via Telegram Bot API
 * 5. Update job status to 'sent', record sent_at
 * 6. Update subscriber last_active_at and lifecycle_stage='reactivated'
 *
 * Cron: runs every 30 minutes. Max 10 reactivations per tick.
 */
import mysql2 from "mysql2/promise";
import crypto from "crypto";
import OpenAI from "openai";

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN!;
const TG_API = `https://api.telegram.org/bot${BOT_TOKEN}`;
const BASE_URL = process.env.APP_URL || "https://creatorvault.live";
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

function getPool() {
  return mysql2.createPool(process.env.DATABASE_URL as string);
}

// ─── AI Reactivation Copy ─────────────────────────────────────────────────────
async function generateReactivationCopy(params: {
  firstName: string;
  segment: string;
  totalSpentCents: number;
  purchaseCount: number;
  contentTitle?: string;
  contentPrice?: number;
}): Promise<{ subject: string; body: string; cta: string; trackingHook: string }> {
  const spentDollars = (params.totalSpentCents / 100).toFixed(2);
  const isBuyer = params.purchaseCount > 0;
  const isVip = params.segment.includes("vip");

  const systemPrompt = isVip
    ? "You write exclusive, personal Telegram DMs from a content creator to their VIP buyers. Tone: intimate, exclusive, urgent. No emojis. Output JSON only."
    : "You write re-engagement Telegram DMs from a content creator to past buyers. Tone: warm, direct, value-focused. No emojis. Output JSON only.";

  const name = params.firstName || "you";
  const contentLine = params.contentTitle
    ? `New content available: "${params.contentTitle}" at $${params.contentPrice}`
    : "Tease new exclusive content.";

  const userPrompt = isBuyer
    ? `Write a reactivation DM for ${name} who spent $${spentDollars} across ${params.purchaseCount} purchase(s). ${contentLine} Return JSON: { "subject": "1-line opener", "body": "2-3 sentences personal message", "cta": "action phrase under 10 words", "trackingHook": "urgency phrase under 8 words" }`
    : `Write a reactivation DM for ${name} who has been inactive. Return JSON: { "subject": "1-line opener", "body": "2-3 sentences re-engagement message", "cta": "action phrase under 10 words", "trackingHook": "urgency phrase under 8 words" }`;

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4.1-mini",
      max_tokens: 300,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      response_format: { type: "json_object" },
    });
    const parsed = JSON.parse(completion.choices[0].message.content || "{}");
    return {
      subject: parsed.subject || "Hey — you have been missed.",
      body: parsed.body || "I have been dropping new content and wanted to make sure you saw it.",
      cta: parsed.cta || "Check it out now",
      trackingHook: parsed.trackingHook || "Limited time access",
    };
  } catch {
    return {
      subject: "Hey — you have been missed.",
      body: "I have been dropping new content and wanted to make sure you saw it first.",
      cta: "Check it out now",
      trackingHook: "Limited time access",
    };
  }
}

// ─── Send Reactivation DM ─────────────────────────────────────────────────────
async function sendReactivationDM(params: {
  telegramUserId: bigint | number;
  copy: { subject: string; body: string; cta: string; trackingHook: string };
  trackingUrl: string;
}): Promise<{ ok: boolean; messageId?: number; error?: string }> {
  const text = `${params.copy.subject}\n\n${params.copy.body}\n\n${params.copy.trackingHook} — ${params.copy.cta}:\n${params.trackingUrl}`;

  const res = await fetch(`${TG_API}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: String(params.telegramUserId),
      text,
      parse_mode: "Markdown",
      link_preview_options: { is_disabled: true },
      reply_markup: {
        inline_keyboard: [[
          { text: "Unlock Now", url: params.trackingUrl }
        ]]
      }
    }),
  });

  const data = await res.json() as any;
  if (data.ok) {
    return { ok: true, messageId: data.result.message_id };
  }
  return { ok: false, error: data.description };
}

// ─── Find inactive buyers ─────────────────────────────────────────────────────
async function findInactiveBuyers(pool: mysql2.Pool): Promise<any[]> {
  const [rows] = await pool.query(
    `SELECT ts.id, ts.telegram_id, ts.first_name, ts.segment,
            ts.total_spent_cents, ts.purchase_count, ts.last_active_at
     FROM telegram_subscribers ts
     WHERE ts.segment IN ('active_buyer', 'repeat_buyer', 'vip_offer_sent', 'vip_buyer', 'whale')
       AND ts.opted_out = 0
       AND (ts.last_active_at IS NULL OR ts.last_active_at < NOW() - INTERVAL 7 DAY)
       AND NOT EXISTS (
         SELECT 1 FROM telegram_reactivation_jobs rj
         WHERE rj.subscriber_id = ts.id
           AND rj.status IN ('pending', 'sent')
           AND rj.created_at > NOW() - INTERVAL 7 DAY
       )
     ORDER BY ts.total_spent_cents DESC
     LIMIT 10`
  ) as any;
  return rows;
}

// ─── Get a content to promote ─────────────────────────────────────────────────
async function getPromoContent(pool: mysql2.Pool): Promise<{ id: number; title: string; price: number } | null> {
  const [rows] = await pool.query(
    `SELECT id, title, ppv_price AS price
     FROM vaultx_content
     WHERE ppv_price > 0
     ORDER BY id DESC LIMIT 1`
  ) as any;
  return rows.length ? rows[0] : null;
}

// ─── Process a single inactive buyer ─────────────────────────────────────────
async function processReactivation(subscriber: any, content: any, pool: mysql2.Pool): Promise<void> {
  const conn = await pool.getConnection();
  try {
    // Create reactivation job (pending)
    const [jobResult] = await conn.query(
      `INSERT INTO telegram_reactivation_jobs
       (subscriber_id, telegram_user_id, reason, status, scheduled_at)
       VALUES (?, ?, 'inactive_buyer', 'pending', NOW())`,
      [subscriber.id, subscriber.telegram_id]
    ) as any;
    const jobId = jobResult.insertId;

    // Generate tracking code
    const trackingCode = `tgreact${crypto.randomBytes(6).toString("hex")}`;
    const trackingUrl = `${BASE_URL}/r/${trackingCode}`;

    // Generate AI copy
    const copy = await generateReactivationCopy({
      firstName: subscriber.first_name || "you",
      segment: subscriber.segment,
      totalSpentCents: subscriber.total_spent_cents || 0,
      purchaseCount: subscriber.purchase_count || 0,
      contentTitle: content?.title,
      contentPrice: content?.price,
    });

    // Send DM
    const result = await sendReactivationDM({
      telegramUserId: subscriber.telegram_id,
      copy,
      trackingUrl,
    });

    if (result.ok) {
      // Update job to sent
      await conn.query(
        `UPDATE telegram_reactivation_jobs
         SET status='sent', sent_at=NOW()
         WHERE id=?`,
        [jobId]
      );

      // Update subscriber last_active_at and lifecycle_stage
      await conn.query(
        `UPDATE telegram_subscribers
         SET last_active_at=NOW(), lifecycle_stage='reactivated'
         WHERE id=?`,
        [subscriber.id]
      );

      console.log(
        `[reactivation] Sent DM to telegram_id=${subscriber.telegram_id} ` +
        `job_id=${jobId} msg_id=${result.messageId} tracking=${trackingCode}`
      );
    } else {
      // Mark as failed
      await conn.query(
        `UPDATE telegram_reactivation_jobs SET status='failed' WHERE id=?`,
        [jobId]
      );
      console.error(`[reactivation] DM failed for telegram_id=${subscriber.telegram_id}: ${result.error}`);
    }

    conn.release();
  } catch (err: any) {
    console.error(`[reactivation] Error for subscriber id=${subscriber.id}:`, err.message);
    conn.release();
  }
}

// ─── Main reactivation tick ───────────────────────────────────────────────────
export async function runReactivationTick(): Promise<{ processed: number; sent: number }> {
  const pool = getPool();
  let processed = 0;
  let sent = 0;

  try {
    const inactiveBuyers = await findInactiveBuyers(pool);
    if (inactiveBuyers.length === 0) {
      console.log("[reactivation] No inactive buyers to reactivate");
      pool.end();
      return { processed: 0, sent: 0 };
    }

    console.log(`[reactivation] Processing ${inactiveBuyers.length} inactive buyers`);
    const content = await getPromoContent(pool);

    for (const subscriber of inactiveBuyers) {
      await processReactivation(subscriber, content, pool);
      processed++;
      sent++;
    }

    pool.end();
    return { processed, sent };
  } catch (err: any) {
    console.error("[reactivation] tick error:", err.message);
    pool.end();
    return { processed, sent };
  }
}

/**
 * scheduleReactivationJob — manually queue a reactivation for a specific subscriber.
 * Called from the tRPC router.
 */
export async function scheduleReactivationJob(params: {
  subscriberId: number;
  telegramUserId: bigint | number;
  reason?: "inactive_buyer" | "vip_offer_expired" | "no_telegram_link";
}): Promise<{ jobId: number }> {
  const pool = getPool();
  try {
    const [result] = await pool.query(
      `INSERT INTO telegram_reactivation_jobs
       (subscriber_id, telegram_user_id, reason, status, scheduled_at)
       VALUES (?, ?, ?, 'pending', NOW())`,
      [
        params.subscriberId,
        params.telegramUserId,
        params.reason || "inactive_buyer",
      ]
    ) as any;
    pool.end();
    return { jobId: result.insertId };
  } catch (err: any) {
    pool.end();
    throw err;
  }
}

/**
 * startReactivationCron — starts the PM2-safe reactivation cron.
 * Called once from server startup (index.ts).
 * Runs every 30 minutes.
 */
export function startReactivationCron(): void {
  console.log("[reactivation] Cron started — checking every 30 minutes");

  // Run every 30 minutes
  setInterval(() => {
    runReactivationTick().catch(err =>
      console.error("[reactivation] cron tick error:", err.message)
    );
  }, 30 * 60 * 1000);
}
