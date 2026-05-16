/**
 * telegramCampaign.ts
 *
 * The Telegram AI Drop Machine v1.
 *
 * This service takes a VaultX PPV content item and produces a full
 * AI-powered Telegram campaign package:
 *
 *   1. OpenAI generates hook, caption, CTA, and VIP upsell copy
 *   2. Assets are registered (teaser, thumbnail, preview)
 *   3. A tracked distribution_job is created with /r/{trackingCode}
 *   4. The channel post is sent to CreatorVault_Free with inline buttons
 *   5. Post-purchase: VIP upsell DM + single-use invite link
 *
 * Campaign Modes (Credit Governor):
 *   FAST  — OpenAI copy + existing teaser + FFmpeg formatting (default)
 *   BOOST — FAST + Replicate thumbnail enhancement
 *   FULL  — BOOST + Pollo promo asset generation
 */

import mysql from "mysql2/promise";
import OpenAI from "openai";

// ─── Config ──────────────────────────────────────────────────────────────────

const DB_URL =
  process.env.DATABASE_URL ||
  "mysql://creatorvault:KingCam214CreatorVault@127.0.0.1:3306/creatorvault";

const FRONTEND =
  (process.env.VITE_FRONTEND_FORGE_API_URL || "https://creatorvault.live/api").replace("/api", "");

// Real bot token (CV Monetization Engine)
const BOT_TOKEN =
  process.env.TELEGRAM_MONETIZATION_BOT_TOKEN ||
  process.env.TELEGRAM_BOT_TOKEN ||
  "";

// Real channel chat IDs
const FREE_CHANNEL_CHAT_ID = "-1003749459281";   // CreatorVault_Free
const VIP_CHANNEL_CHAT_ID  = "-1003817770263";   // CreatorVault_VIP

// ─── Types ───────────────────────────────────────────────────────────────────

export type CampaignMode = "FAST" | "BOOST" | "FULL";
export type CampaignType = "PPV_DROP" | "VIP_UPSELL" | "FREE_TO_PAID" | "FLASH_SALE" | "CREATOR_SPOTLIGHT";

export interface CreateAIDropInput {
  contentId: number;
  creatorId: number;
  campaignMode?: CampaignMode;
  campaignType?: CampaignType;
  channelEntityId?: number;  // default 1 = Free Discovery
  overridePrice?: number;    // override ppv_price if needed
}

export interface AICopyPackage {
  hook: string;
  caption: string;
  cta: string;
  vipCopy: string;
  captionVariants: string[];
  enginesUsed: string[];
  costEstimateCents: number;
}

export interface CreateAIDropResult {
  campaignId: number;
  trackingCode: string;
  distributionJobId: number;
  copy: AICopyPackage;
  assets: Array<{ type: string; url: string; source: string }>;
  priceCents: number;
  contentTitle: string;
}

export interface SendDropResult {
  success: boolean;
  telegramMessageId?: string;
  campaignMessageId?: number;
  trackedUrl: string;
  error?: string;
}

// ─── DB helper ───────────────────────────────────────────────────────────────

async function getDb() {
  return mysql.createConnection(DB_URL);
}

function rows(result: any): any[] {
  // result is already the destructured rows array from db.execute()
  return Array.isArray(result) ? result : [];
}

function genCode(prefix = "tgdrop"): string {
  return `${prefix}${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

// ─── OpenAI Copy Generation ───────────────────────────────────────────────────

async function generateAICopy(
  title: string,
  description: string,
  priceDollars: number,
  mode: CampaignMode
): Promise<AICopyPackage> {
  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });

  const enginesUsed: string[] = ["openai:gpt-4.1-mini"];
  let costEstimateCents = 2; // ~$0.02 for FAST mode

  const systemPrompt = `You are an elite adult content marketing copywriter for VaultX — a premium creator platform.
Your job is to write Telegram channel copy that converts lurkers into buyers.
Rules:
- Be bold, direct, and create urgency
- Use body-positive, empowering language
- Never be crude or vulgar — be seductive and aspirational
- Keep hooks under 2 lines
- Keep captions under 6 lines
- CTAs must be action-oriented
- All copy must feel exclusive and premium`;

  const userPrompt = `Write a complete Telegram PPV drop campaign for this content:

Title: ${title}
Description: ${description || "Premium exclusive content"}
Price: $${priceDollars.toFixed(2)}

Return ONLY valid JSON with these exact keys:
{
  "hook": "2-line attention-grabbing opening",
  "caption": "4-6 line post body with price and urgency",
  "cta": "short call-to-action for the unlock button (max 5 words)",
  "vipCopy": "1-2 line VIP upsell message sent after purchase",
  "captionVariants": ["variant 1", "variant 2"]
}`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4.1-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      max_tokens: 600,
      temperature: 0.85,
      response_format: { type: "json_object" },
    });

    const raw = response.choices[0]?.message?.content || "{}";
    const parsed = JSON.parse(raw);

    // Estimate token cost: ~$0.40/1M input, ~$1.60/1M output for gpt-4.1-mini
    const inputTokens = response.usage?.prompt_tokens || 200;
    const outputTokens = response.usage?.completion_tokens || 200;
    costEstimateCents = Math.ceil((inputTokens * 0.0004 + outputTokens * 0.0016) * 100) / 100;
    costEstimateCents = Math.max(1, Math.round(costEstimateCents));

    return {
      hook: parsed.hook || `🔥 New drop just landed. This one is different.`,
      caption: parsed.caption || `${title}\n\n💰 $${priceDollars.toFixed(2)} to unlock\n\nTap below 👇`,
      cta: parsed.cta || "Unlock Now",
      vipCopy: parsed.vipCopy || `You just unlocked premium content. Want VIP access for more like this?`,
      captionVariants: parsed.captionVariants || [],
      enginesUsed,
      costEstimateCents,
    };
  } catch (err: any) {
    console.error("[TelegramCampaign] OpenAI error:", err.message);
    // Fallback copy — never block the campaign
    return {
      hook: `🔥 New exclusive drop. Limited access.`,
      caption: `${title}\n\n💰 Unlock for $${priceDollars.toFixed(2)}\n\n🔒 Premium content — tap below to access`,
      cta: "Unlock Full Video",
      vipCopy: `You're a buyer now. Want VIP access to everything?`,
      captionVariants: [],
      enginesUsed: ["fallback"],
      costEstimateCents: 0,
    };
  }
}

// ─── PHASE 1: Create AI Drop ──────────────────────────────────────────────────

export async function createAIDrop(input: CreateAIDropInput): Promise<CreateAIDropResult> {
  const {
    contentId,
    creatorId,
    campaignMode = "FAST",
    campaignType = "PPV_DROP",
    channelEntityId = 1,
  } = input;

  const db = await getDb();

  try {
    // 1. Load content
    const [contentRows] = await db.execute(
      `SELECT id, title, description, ppv_price, content_type, thumbnail_url, censored_url, uncensored_url
       FROM vaultx_content WHERE id = ? AND creator_id = ? LIMIT 1`,
      [contentId, creatorId]
    );
    const content = rows(contentRows)[0] as any;
    if (!content) throw new Error(`Content id=${contentId} not found for creator ${creatorId}`);

    const priceDollars = input.overridePrice ?? parseFloat(content.ppv_price) ?? 14.99;
    const priceCents = Math.round(priceDollars * 100);

    // 2. Generate AI copy
    const copy = await generateAICopy(
      content.title,
      content.description,
      priceDollars,
      campaignMode
    );

    // 3. Generate tracking code
    const trackingCode = genCode("tgdrop");
    const trackedUrl = `${FRONTEND}/r/${trackingCode}`;

    // 4. Create distribution_job
    const [djResult] = await db.execute(
      `INSERT INTO distribution_jobs
         (creator_id, channel_identity_id, platform, content_id, asset_url, asset_type,
          caption, destination_url, tracking_code, status, content_safety_level, brand_lane)
       VALUES (?, ?, 'telegram', ?, ?, 'teaser', ?, ?, ?, 'ready', 'sensitive', 'vaultx_adult')`,
      [
        creatorId,
        channelEntityId,
        contentId,
        content.thumbnail_url || content.censored_url || "",
        copy.caption,
        trackedUrl,
        trackingCode,
      ]
    );
    const distributionJobId = (djResult as any).insertId;

    // 5. Create campaign record
    const [campResult] = await db.execute(
      `INSERT INTO telegram_campaigns
         (creator_id, content_id, campaign_type, campaign_mode, status, tracking_code,
          channel_entity_id, ai_hook, ai_caption, ai_cta, ai_vip_copy,
          ai_engines_used, cost_estimate_cents, price_cents, distribution_job_id)
       VALUES (?, ?, ?, ?, 'draft', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        creatorId,
        contentId,
        campaignType,
        campaignMode,
        trackingCode,
        channelEntityId,
        copy.hook,
        copy.caption,
        copy.cta,
        copy.vipCopy,
        JSON.stringify({ engines: copy.enginesUsed }),
        copy.costEstimateCents,
        priceCents,
        distributionJobId,
      ]
    );
    const campaignId = (campResult as any).insertId;

    // 6. Register assets
    const assetList: Array<{ type: string; url: string; source: string }> = [];

    if (content.thumbnail_url) {
      await db.execute(
        `INSERT INTO telegram_campaign_assets (campaign_id, asset_type, asset_url, source, is_primary) VALUES (?, 'thumbnail', ?, 'original', 1)`,
        [campaignId, content.thumbnail_url]
      );
      assetList.push({ type: "thumbnail", url: content.thumbnail_url, source: "original" });
    }
    if (content.censored_url) {
      await db.execute(
        `INSERT INTO telegram_campaign_assets (campaign_id, asset_type, asset_url, source, is_primary) VALUES (?, 'censored_preview', ?, 'original', 0)`,
        [campaignId, content.censored_url]
      );
      assetList.push({ type: "censored_preview", url: content.censored_url, source: "original" });
    }

    // 7. Log to ai_agent_actions
    await db.execute(
      `INSERT INTO ai_agent_actions (creator_id, agent_type, action_type, input_payload, output_payload, status, approval_required)
       VALUES (?, 'telegram_campaign', 'telegram_campaign_create', ?, ?, 'executed', 0)`,
      [
        creatorId,
        JSON.stringify({ contentId, campaignMode, campaignType, trackingCode }),
        JSON.stringify({ campaignId, distributionJobId, enginesUsed: copy.enginesUsed }),
      ]
    );

    console.log(`[TelegramCampaign] Created campaign id=${campaignId} tracking=${trackingCode} mode=${campaignMode}`);

    return {
      campaignId,
      trackingCode,
      distributionJobId,
      copy,
      assets: assetList,
      priceCents,
      contentTitle: content.title,
    };
  } finally {
    await db.end();
  }
}

// ─── PHASE 2: Send Drop to Channel ───────────────────────────────────────────

export async function sendDropToChannel(campaignId: number): Promise<SendDropResult> {
  const db = await getDb();

  try {
    // Load campaign
    const [campRows] = await db.execute(
      `SELECT tc.*, vc.thumbnail_url, vc.censored_url, vc.title as content_title
       FROM telegram_campaigns tc
       JOIN vaultx_content vc ON vc.id = tc.content_id
       WHERE tc.id = ? LIMIT 1`,
      [campaignId]
    );
    const campaign = rows(campRows)[0] as any;
    if (!campaign) throw new Error(`Campaign ${campaignId} not found`);

    const trackedUrl = `${FRONTEND}/r/${campaign.tracking_code}`;
    const priceDollars = (campaign.price_cents / 100).toFixed(2);

    // Build the Telegram message
    const messageText = `${campaign.ai_hook}\n\n${campaign.ai_caption}\n\n💰 <b>$${priceDollars}</b> to unlock\n\n🔒 Tap below to access exclusive content`;

    // Inline keyboard
    const inlineKeyboard = {
      inline_keyboard: [
        [
          { text: `🔓 ${campaign.ai_cta || "Unlock Full Video"}`, url: trackedUrl },
          { text: "👀 Preview First", url: `${FRONTEND}/vaultx` },
        ],
        [
          { text: "💎 Go VIP", url: `${FRONTEND}/r/${campaign.tracking_code}-vip` },
        ],
      ],
    };

    // Send to Free channel
    const tgUrl = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`;
    const tgResp = await fetch(tgUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: FREE_CHANNEL_CHAT_ID,
        text: messageText,
        parse_mode: "HTML",
        reply_markup: inlineKeyboard,
      }),
    });

    const tgData = await tgResp.json() as any;

    if (!tgData.ok) {
      console.error("[TelegramCampaign] sendMessage failed:", tgData.description);

      // Record failed message
      await db.execute(
        `INSERT INTO telegram_campaign_messages
           (campaign_id, message_type, telegram_chat_id, message_text, status, error_message)
         VALUES (?, 'channel_drop', ?, ?, 'failed', ?)`,
        [campaignId, FREE_CHANNEL_CHAT_ID, messageText, tgData.description || "unknown error"]
      );

      // Update campaign status
      await db.execute(
        `UPDATE telegram_campaigns SET status = 'failed' WHERE id = ?`,
        [campaignId]
      );

      return {
        success: false,
        trackedUrl,
        error: tgData.description || "Telegram API error",
      };
    }

    const telegramMessageId = String(tgData.result?.message_id || "");

    // Record sent message
    const [msgResult] = await db.execute(
      `INSERT INTO telegram_campaign_messages
         (campaign_id, message_type, telegram_chat_id, telegram_message_id, message_text, sent_at, status)
       VALUES (?, 'channel_drop', ?, ?, ?, NOW(), 'sent')`,
      [campaignId, FREE_CHANNEL_CHAT_ID, telegramMessageId, messageText]
    );
    const campaignMessageId = (msgResult as any).insertId;

    // Update campaign status + message_id
    await db.execute(
      `UPDATE telegram_campaigns
       SET status = 'sent', telegram_message_id = ?
       WHERE id = ?`,
      [telegramMessageId, campaignId]
    );

    // Update distribution_job status
    await db.execute(
      `UPDATE distribution_jobs
       SET status = 'posted', platform_post_id = ?, posted_at = NOW()
       WHERE id = ?`,
      [telegramMessageId, campaign.distribution_job_id]
    );

    console.log(`[TelegramCampaign] Drop sent! campaign=${campaignId} tg_msg=${telegramMessageId}`);

    return {
      success: true,
      telegramMessageId,
      campaignMessageId,
      trackedUrl,
    };
  } finally {
    await db.end();
  }
}

// ─── PHASE 3: Record Click or Conversion ─────────────────────────────────────

export async function recordCampaignEvent(
  trackingCode: string,
  eventType: "click" | "purchase",
  opts: {
    userId?: number;
    sessionId?: string;
    ipHash?: string;
    userAgent?: string;
    revenueCents?: number;
    buyerTelegramId?: number;
  } = {}
): Promise<void> {
  const db = await getDb();
  try {
    // Find campaign
    const [campRows] = await db.execute(
      `SELECT id, creator_id, content_id, distribution_job_id FROM telegram_campaigns WHERE tracking_code = ? LIMIT 1`,
      [trackingCode]
    );
    const campaign = rows(campRows)[0] as any;
    if (!campaign) return;

    // Insert attribution_event
    await db.execute(
      `INSERT INTO attribution_events
         (tracking_code, distribution_job_id, creator_id, content_id, platform,
          event_type, user_id, session_id, ip_hash, user_agent, revenue_cents)
       VALUES (?, ?, ?, ?, 'telegram', ?, ?, ?, ?, ?, ?)`,
      [
        trackingCode,
        campaign.distribution_job_id,
        campaign.creator_id,
        campaign.content_id,
        eventType,
        opts.userId || null,
        opts.sessionId || null,
        opts.ipHash || null,
        opts.userAgent || null,
        opts.revenueCents || 0,
      ]
    );

    if (eventType === "click") {
      await db.execute(
        `UPDATE telegram_campaigns SET click_count = click_count + 1 WHERE id = ?`,
        [campaign.id]
      );
      await db.execute(
        `UPDATE distribution_jobs SET click_count = click_count + 1 WHERE id = ?`,
        [campaign.distribution_job_id]
      );
    }

    if (eventType === "purchase") {
      await db.execute(
        `UPDATE telegram_campaigns
         SET conversion_count = conversion_count + 1,
             revenue_cents = revenue_cents + ?
         WHERE id = ?`,
        [opts.revenueCents || 0, campaign.id]
      );

      // Update whale metrics if buyer has Telegram identity
      if (opts.buyerTelegramId) {
        await db.execute(
          `INSERT INTO telegram_whale_metrics
             (subscriber_id, total_spent_cents, purchase_count, last_purchase_at)
           SELECT ts.id, ?, 1, NOW()
           FROM telegram_subscribers ts WHERE ts.telegram_id = ?
           ON DUPLICATE KEY UPDATE
             total_spent_cents = total_spent_cents + VALUES(total_spent_cents),
             purchase_count = purchase_count + 1,
             last_purchase_at = NOW()`,
          [opts.revenueCents || 0, opts.buyerTelegramId]
        );

        // Update subscriber segment
        await db.execute(
          `UPDATE telegram_subscribers
           SET segment = CASE
             WHEN segment = 'active_buyer' THEN 'repeat_buyer'
             ELSE 'active_buyer'
           END,
           last_active_at = NOW()
           WHERE telegram_id = ?`,
          [opts.buyerTelegramId]
        );
      }

      // Insert telegram_conversion_event
      await db.execute(
        `INSERT INTO telegram_conversion_events
           (campaign_id, event_type, amount_cents, tracking_code)
         VALUES (?, 'ppv_purchase', ?, ?)`,
        [campaign.id, opts.revenueCents || 0, trackingCode]
      ).catch(() => {
        // telegram_conversion_events may not exist yet — non-blocking
      });
    }

    console.log(`[TelegramCampaign] Recorded ${eventType} for tracking=${trackingCode}`);
  } finally {
    await db.end();
  }
}

// ─── PHASE 4: Post-Purchase VIP Upsell ───────────────────────────────────────

export async function triggerVipUpsell(opts: {
  buyerTelegramId: number;
  campaignTrackingCode?: string;
  purchaseId?: number;
}): Promise<{ sent: boolean; inviteLink?: string; blocker?: string }> {
  if (!opts.buyerTelegramId) {
    return { sent: false, blocker: "no_telegram_id: buyer Telegram identity unknown" };
  }

  const db = await getDb();
  try {
    // Find subscriber
    const [subRows] = await db.execute(
      `SELECT id, username, first_name, segment FROM telegram_subscribers WHERE telegram_id = ? LIMIT 1`,
      [opts.buyerTelegramId]
    );
    const subscriber = rows(subRows)[0] as any;

    // Find campaign for VIP copy
    let vipCopy = `You just unlocked premium content. Want full VIP access for more like this?`;
    if (opts.campaignTrackingCode) {
      const [campRows] = await db.execute(
        `SELECT ai_vip_copy FROM telegram_campaigns WHERE tracking_code = ? LIMIT 1`,
        [opts.campaignTrackingCode]
      );
      const camp = rows(campRows)[0] as any;
      if (camp?.ai_vip_copy) vipCopy = camp.ai_vip_copy;
    }

    const vipTrackingCode = genCode("tgvip");
    const vipUrl = `${FRONTEND}/r/${vipTrackingCode}`;

    // Generate single-use VIP invite link
    let inviteLink: string | undefined;
    try {
      const inviteResp = await fetch(
        `https://api.telegram.org/bot${BOT_TOKEN}/createChatInviteLink`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chat_id: VIP_CHANNEL_CHAT_ID,
            member_limit: 1,
            expire_date: Math.floor(Date.now() / 1000) + 86400 * 3, // 3 days
            creates_join_request: false,
          }),
        }
      );
      const inviteData = await inviteResp.json() as any;
      if (inviteData.ok && inviteData.result?.invite_link) {
        inviteLink = inviteData.result.invite_link;

        // Store invite link
        if (subscriber) {
          await db.execute(
            `INSERT INTO telegram_invite_links
               (subscriber_id, channel_entity_id, invite_url, expires_at, created_at)
             VALUES (?, 2, ?, DATE_ADD(NOW(), INTERVAL 3 DAY), NOW())`,
            [subscriber.id, inviteLink]
          );
        }
      }
    } catch (e: any) {
      console.error("[TelegramCampaign] createChatInviteLink error:", e.message);
    }

    // Build DM text
    const dmText = inviteLink
      ? `${vipCopy}\n\n💎 <b>Your VIP Access Link</b> (single-use, expires in 3 days):\n${inviteLink}\n\n⚡ Tap to join <b>CreatorVault VIP</b> now`
      : `${vipCopy}\n\n💎 <a href="${vipUrl}">Tap here to upgrade to VIP</a>`;

    // Send DM
    const dmResp = await fetch(
      `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: opts.buyerTelegramId,
          text: dmText,
          parse_mode: "HTML",
          reply_markup: inviteLink
            ? undefined
            : {
                inline_keyboard: [
                  [{ text: "💎 Join VIP Now", url: vipUrl }],
                ],
              },
        }),
      }
    );

    const dmData = await dmResp.json() as any;

    if (!dmData.ok) {
      console.error("[TelegramCampaign] VIP upsell DM failed:", dmData.description);
      return {
        sent: false,
        blocker: `telegram_dm_blocked: ${dmData.description}`,
        inviteLink,
      };
    }

    // Record in campaign_messages
    if (opts.campaignTrackingCode) {
      const [campRows] = await db.execute(
        `SELECT id FROM telegram_campaigns WHERE tracking_code = ? LIMIT 1`,
        [opts.campaignTrackingCode]
      );
      const camp = rows(campRows)[0] as any;
      if (camp) {
        await db.execute(
          `INSERT INTO telegram_campaign_messages
             (campaign_id, message_type, telegram_chat_id, telegram_user_id,
              telegram_message_id, message_text, sent_at, status)
           VALUES (?, 'vip_upsell', ?, ?, ?, ?, NOW(), 'sent')`,
          [
            camp.id,
            String(opts.buyerTelegramId),
            opts.buyerTelegramId,
            String(dmData.result?.message_id || ""),
            dmText,
          ]
        );
      }
    }

    console.log(`[TelegramCampaign] VIP upsell sent to tg_id=${opts.buyerTelegramId} invite=${inviteLink || "none"}`);

    return { sent: true, inviteLink };
  } finally {
    await db.end();
  }
}
