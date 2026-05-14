/**
 * telegramMoneyLoop.ts
 *
 * The first real Telegram money loop:
 *   Free Channel Drop → Tracked Click → PPV Purchase → Attribution →
 *   VIP Upsell DM → Single-Use Invite Link → VIP Membership Tracking
 *
 * All DB writes use raw MySQL (mysql2) to avoid Drizzle schema drift.
 * No fake data. No simulated events. Real Telegram API calls only.
 */

import mysql from "mysql2/promise";
import crypto from "crypto";

// ─── Config ──────────────────────────────────────────────────────────────────
const DB_URL =
  process.env.DATABASE_URL ||
  "mysql://creatorvault:KingCam214CreatorVault@127.0.0.1:3306/creatorvault";

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN!;
const FRONTEND = (
  process.env.VITE_FRONTEND_FORGE_API_URL?.replace("/api", "") ||
  "https://creatorvault.live"
);

// Real channel entity IDs from telegram_channel_entities
const FREE_CHANNEL_ENTITY_ID = 1;   // VaultX Free Discovery  (-1003749459281)
const VIP_CHANNEL_ENTITY_ID  = 2;   // VaultX VIP             (-1003817770263)
const FREE_CHAT_ID  = "-1003749459281";
const VIP_CHAT_ID   = "-1003817770263";

// ─── DB helper ───────────────────────────────────────────────────────────────
async function getDb() {
  return mysql.createConnection(DB_URL);
}

function rows(result: any): any[] {
  return Array.isArray(result) ? (result[0] as any[]) : [];
}

// ─── Telegram API helpers ─────────────────────────────────────────────────────
async function tgPost(method: string, body: Record<string, unknown>) {
  const resp = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return resp.json() as Promise<{ ok: boolean; result?: any; description?: string }>;
}

// ─── Tracking code ────────────────────────────────────────────────────────────
function genCode(prefix = "tg"): string {
  return `${prefix}${Date.now().toString(36)}${crypto.randomBytes(3).toString("hex")}`;
}

// ═══════════════════════════════════════════════════════════════════════════════
// STEP 1 — TRACKED FREE CHANNEL DROP
// ═══════════════════════════════════════════════════════════════════════════════
export interface DropInput {
  contentId?: number;
  teaserUrl?: string;       // playable video URL (optional)
  caption: string;
  price: number;            // in dollars
  creatorId?: number;
}

export interface DropResult {
  ok: boolean;
  messageId?: number;
  trackingCode: string;
  distributionJobId?: number;
  trackingUrl: string;
  error?: string;
}

export async function sendFreeChannelDrop(input: DropInput): Promise<DropResult> {
  const db = await getDb();
  const trackingCode = genCode("tgdrop");
  const destUrl = `${FRONTEND}/vaultx`;
  const trackingUrl = `${FRONTEND}/r/${trackingCode}`;

  try {
    // 1a. Create distribution_jobs row
    const [djResult] = await db.execute(
      `INSERT INTO distribution_jobs
         (creator_id, channel_identity_id, platform, asset_url, asset_type,
          caption, tracking_code, destination_url, status, content_safety_level, brand_lane)
       VALUES (?, ?, 'telegram', ?, 'text', ?, ?, ?, 'posted', 'explicit', 'vaultx_adult')`,
      [
        input.creatorId || 1,
        FREE_CHANNEL_ENTITY_ID,
        input.teaserUrl || trackingUrl,
        input.caption,
        trackingCode,
        destUrl,
      ]
    );
    const distributionJobId = (djResult as any).insertId as number;

    // 1b. Build inline keyboard
    const inlineKeyboard = [
      [{ text: `🔓 Unlock Full Video ($${input.price})`, url: trackingUrl }],
      [{ text: "💎 Go VIP — Unlimited Access", url: `${FRONTEND}/vaultx?vip=1` }],
    ];

    // 1c. Send to Telegram — video if teaserUrl, else text
    let tgResult: { ok: boolean; result?: any; description?: string };
    if (input.teaserUrl) {
      tgResult = await tgPost("sendVideo", {
        chat_id: FREE_CHAT_ID,
        video: input.teaserUrl,
        caption: input.caption,
        parse_mode: "HTML",
        reply_markup: { inline_keyboard: inlineKeyboard },
      });
    } else {
      tgResult = await tgPost("sendMessage", {
        chat_id: FREE_CHAT_ID,
        text: input.caption,
        parse_mode: "HTML",
        reply_markup: { inline_keyboard: inlineKeyboard },
      });
    }

    const messageId = tgResult.result?.message_id as number | undefined;

    // 1d. Log to telegram_drops
    await db.execute(
      `INSERT INTO telegram_drops
         (message_id, channel_id, drop_date, content_type, creator_id, offer_price, caption, has_cta, cta_type)
       VALUES (?, ?, NOW(), 'ppv', ?, ?, ?, 1, 'inline_button')`,
      [
        messageId || 0,
        FREE_CHANNEL_ENTITY_ID,
        input.creatorId || 1,
        input.price,
        input.caption,
      ]
    );

    // 1e. Log to telegram_message_events
    await db.execute(
      `INSERT INTO telegram_message_events
         (telegram_id, direction, message_type, message_text, tracking_code)
       VALUES (?, 'outbound', 'channel_drop', ?, ?)`,
      [FREE_CHAT_ID, input.caption, trackingCode]
    );

    return {
      ok: tgResult.ok,
      messageId,
      trackingCode,
      distributionJobId,
      trackingUrl,
      error: tgResult.ok ? undefined : tgResult.description,
    };
  } finally {
    await db.end();
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// STEP 2 — SUBSCRIBER UPSERT (called from webhook on every inbound event)
// ═══════════════════════════════════════════════════════════════════════════════
export interface SubscriberUpsertInput {
  telegramId: number;
  username?: string;
  firstName?: string;
  lastName?: string;
  sourceTrackingCode?: string;
  sourceChannelId?: number;
  vaultxUserId?: number;
}

export async function upsertSubscriber(input: SubscriberUpsertInput): Promise<number> {
  const db = await getDb();
  try {
    await db.execute(
      `INSERT INTO telegram_subscribers
         (telegram_id, username, first_name, last_name, platform_user_id, vaultx_user_id,
          source_tracking_code, source_channel_id, last_active_at, last_seen_at)
       VALUES (?, ?, ?, ?, NULL, ?, ?, ?, NOW(), NOW())
       ON DUPLICATE KEY UPDATE
         username            = COALESCE(VALUES(username), username),
         first_name          = COALESCE(VALUES(first_name), first_name),
         last_name           = COALESCE(VALUES(last_name), last_name),
         vaultx_user_id      = COALESCE(VALUES(vaultx_user_id), vaultx_user_id),
         source_tracking_code = COALESCE(source_tracking_code, VALUES(source_tracking_code)),
         last_active_at      = NOW(),
         last_seen_at        = NOW()`,
      [
        input.telegramId,
        input.username || null,
        input.firstName || null,
        input.lastName || null,
        input.vaultxUserId || null,
        input.sourceTrackingCode || null,
        input.sourceChannelId || null,
      ]
    );
    const [rows2] = await db.execute(
      "SELECT id FROM telegram_subscribers WHERE telegram_id = ?",
      [input.telegramId]
    );
    return (rows(rows2)[0] as any)?.id as number;
  } finally {
    await db.end();
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// STEP 3 — PURCHASE ATTRIBUTION HOOK
// Called after vaultx_ppv_purchases INSERT with attribution_tracking_code
// ═══════════════════════════════════════════════════════════════════════════════
export interface PurchaseAttributionInput {
  purchaseId: number;
  fanId: number;
  creatorId: number;
  contentId: number;
  amountPaid: number;           // dollars
  trackingCode?: string;
  buyerTelegramId?: number;
}

export async function attributePurchase(input: PurchaseAttributionInput): Promise<void> {
  const db = await getDb();
  try {
    // 3a. Update vaultx_ppv_purchases with tracking code + telegram_id
    if (input.trackingCode || input.buyerTelegramId) {
      await db.execute(
        `UPDATE vaultx_ppv_purchases
         SET attribution_tracking_code = COALESCE(?, attribution_tracking_code),
             buyer_telegram_id = COALESCE(?, buyer_telegram_id)
         WHERE id = ?`,
        [input.trackingCode || null, input.buyerTelegramId || null, input.purchaseId]
      );
    }

    // 3b. Resolve subscriber_id from telegram_id
    let subscriberId: number | null = null;
    if (input.buyerTelegramId) {
      const [subRows] = await db.execute(
        "SELECT id FROM telegram_subscribers WHERE telegram_id = ?",
        [input.buyerTelegramId]
      );
      subscriberId = (rows(subRows)[0] as any)?.id || null;
    }

    // 3c. Resolve distribution_job from tracking code
    let distributionJobId: number | null = null;
    let channelEntityId: number | null = null;
    if (input.trackingCode) {
      const [djRows] = await db.execute(
        "SELECT id, channel_identity_id FROM distribution_jobs WHERE tracking_code = ?",
        [input.trackingCode]
      );
      const dj = rows(djRows)[0] as any;
      if (dj) {
        distributionJobId = dj.id;
        channelEntityId = dj.channel_identity_id;
        // Update click→conversion on distribution_jobs
        await db.execute(
          `UPDATE distribution_jobs
           SET conversion_count = COALESCE(conversion_count, 0) + 1,
               revenue_cents    = COALESCE(revenue_cents, 0) + ?
           WHERE id = ?`,
          [Math.round(input.amountPaid * 100), distributionJobId]
        );
      }
    }

    // 3d. Insert telegram_conversion_events
    await db.execute(
      `INSERT INTO telegram_conversion_events
         (subscriber_id, telegram_id, platform_user_id, event_type,
          content_id, creator_id, channel_entity_id, tracking_code,
          amount_cents, platform_fee_cents, creator_revenue_cents)
       VALUES (?, ?, ?, 'ppv_purchase', ?, ?, ?, ?, ?, ?, ?)`,
      [
        subscriberId,
        input.buyerTelegramId || null,
        input.fanId,
        input.contentId,
        input.creatorId,
        channelEntityId,
        input.trackingCode || null,
        Math.round(input.amountPaid * 100),
        Math.round(input.amountPaid * 100 * 0.15),   // 15% platform fee
        Math.round(input.amountPaid * 100 * 0.85),   // 85% creator revenue
      ]
    );

    // 3e. Upsert telegram_whale_metrics
    if (input.buyerTelegramId) {
      await db.execute(
        `INSERT INTO telegram_whale_metrics
           (telegram_user_id, total_spent, purchase_count, avg_purchase_value,
            days_since_first_purchase, days_since_last_purchase, whale_score, whale_tier)
         VALUES (?, ?, 1, ?, 0, 0, ?, ?)
         ON DUPLICATE KEY UPDATE
           total_spent         = total_spent + VALUES(total_spent),
           purchase_count      = purchase_count + 1,
           avg_purchase_value  = (total_spent + VALUES(total_spent)) / (purchase_count + 1),
           days_since_last_purchase = 0,
           whale_score         = LEAST(whale_score + 10, 100),
           whale_tier          = CASE
             WHEN (total_spent + VALUES(total_spent)) >= 500 THEN 'whale'
             WHEN (total_spent + VALUES(total_spent)) >= 100 THEN 'high_value'
             WHEN (total_spent + VALUES(total_spent)) >= 25  THEN 'buyer'
             ELSE 'new_buyer'
           END`,
        [
          String(input.buyerTelegramId),
          input.amountPaid,
          input.amountPaid,
          10,
          "new_buyer",
        ]
      );
    }

    // 3f. Update subscriber segment → active_buyer
    if (subscriberId) {
      await db.execute(
        `UPDATE telegram_subscribers
         SET segment = 'active_buyer', lifecycle_stage = 'converted',
             purchase_count = purchase_count + 1,
             total_spent_cents = total_spent_cents + ?
         WHERE id = ?`,
        [Math.round(input.amountPaid * 100), subscriberId]
      );
    }
  } finally {
    await db.end();
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// STEP 4 — VIP UPSELL DM + SINGLE-USE INVITE LINK
// ═══════════════════════════════════════════════════════════════════════════════
export interface VipUpsellInput {
  buyerTelegramId: number;
  purchaseId: number;
  subscriberId?: number;
}

export interface VipUpsellResult {
  dmSent: boolean;
  inviteLinkId?: number;
  inviteUrl?: string;
  blockedReason?: string;
}

export async function sendVipUpsell(input: VipUpsellInput): Promise<VipUpsellResult> {
  const db = await getDb();
  try {
    // 4a. Generate single-use invite link via Telegram API
    const expireTs = Math.floor(Date.now() / 1000) + 86400; // 24h
    const inviteResp = await tgPost("createChatInviteLink", {
      chat_id: VIP_CHAT_ID,
      member_limit: 1,
      expire_date: expireTs,
      creates_join_request: false,
    });

    if (!inviteResp.ok) {
      // Bot may lack admin rights — store pending state, do not fake success
      await db.execute(
        `INSERT INTO telegram_invite_links
           (channel_entity_id, subscriber_id, purchase_id, invite_url, is_used, expires_at)
         VALUES (?, ?, ?, 'PENDING_ADMIN_RIGHTS', 0, DATE_ADD(NOW(), INTERVAL 24 HOUR))`,
        [VIP_CHANNEL_ENTITY_ID, input.subscriberId || null, input.purchaseId]
      );
      return {
        dmSent: false,
        blockedReason: `Telegram API: ${inviteResp.description}. Bot needs admin rights with 'Invite Users' permission in VaultX VIP channel.`,
      };
    }

    const inviteUrl = inviteResp.result?.invite_link as string;

    // 4b. Store invite link in DB
    const [ilResult] = await db.execute(
      `INSERT INTO telegram_invite_links
         (channel_entity_id, subscriber_id, purchase_id, invite_url, telegram_invite_link, is_used,
          expires_at)
       VALUES (?, ?, ?, ?, ?, 0, DATE_ADD(NOW(), INTERVAL 24 HOUR))`,
      [
        VIP_CHANNEL_ENTITY_ID,
        input.subscriberId || null,
        input.purchaseId,
        inviteUrl,
        inviteUrl,
      ]
    );
    const inviteLinkId = (ilResult as any).insertId as number;

    // 4c. Send DM to buyer
    const dmText =
      `🔥 <b>You just unlocked exclusive content.</b>\n\n` +
      `Since you're clearly a fan, here's something special:\n\n` +
      `💎 <b>VaultX VIP — 30% OFF</b>\n` +
      `Unlimited access to everything. No per-video fees. Ever.\n\n` +
      `Your private invite link (expires in 24h):\n${inviteUrl}\n\n` +
      `Tap to join before it expires 👇`;

    const dmResp = await tgPost("sendMessage", {
      chat_id: input.buyerTelegramId,
      text: dmText,
      parse_mode: "HTML",
      reply_markup: {
        inline_keyboard: [
          [{ text: "💎 Join VaultX VIP Now", url: inviteUrl }],
        ],
      },
    });

    // 4d. Log outbound DM
    await db.execute(
      `INSERT INTO telegram_message_events
         (telegram_id, direction, message_type, message_text, tracking_code)
       VALUES (?, 'outbound', 'vip_upsell_dm', ?, NULL)`,
      [String(input.buyerTelegramId), dmText]
    );

    return {
      dmSent: dmResp.ok,
      inviteLinkId,
      inviteUrl,
      blockedReason: dmResp.ok ? undefined : `DM failed: ${dmResp.description}`,
    };
  } finally {
    await db.end();
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// STEP 5 — VIP JOIN REQUEST / MEMBERSHIP TRACKING
// Called from webhook when chat_join_request arrives for VIP channel
// ═══════════════════════════════════════════════════════════════════════════════
export interface JoinRequestInput {
  telegramId: number;
  chatId: string;
  username?: string;
  firstName?: string;
}

export async function handleVipJoinRequest(input: JoinRequestInput): Promise<{ approved: boolean; reason: string }> {
  const db = await getDb();
  try {
    // 5a. Resolve subscriber
    const [subRows] = await db.execute(
      "SELECT * FROM telegram_subscribers WHERE telegram_id = ?",
      [input.telegramId]
    );
    const subscriber = rows(subRows)[0] as any;

    // 5b. Check for valid unused invite link
    let inviteLinkId: number | null = null;
    if (subscriber) {
      const [ilRows] = await db.execute(
        `SELECT id FROM telegram_invite_links
         WHERE subscriber_id = ? AND channel_entity_id = ? AND is_used = 0
           AND (expires_at IS NULL OR expires_at > NOW())
         ORDER BY created_at DESC LIMIT 1`,
        [subscriber.id, VIP_CHANNEL_ENTITY_ID]
      );
      const il = rows(ilRows)[0] as any;
      if (il) inviteLinkId = il.id;
    }

    // 5c. Check for active VIP subscription
    let hasSubscription = false;
    if (subscriber?.vaultx_user_id) {
      const [vsRows] = await db.execute(
        `SELECT id FROM vaultx_subscriptions
         WHERE fan_id = ? AND tier = 'vip' AND status = 'active'`,
        [subscriber.vaultx_user_id]
      );
      hasSubscription = rows(vsRows).length > 0;
    }

    const approved = !!(inviteLinkId || hasSubscription || (subscriber?.segment === "vip_buyer"));

    if (approved) {
      // 5d. Approve via Telegram API
      await tgPost("approveChatJoinRequest", {
        chat_id: input.chatId,
        user_id: input.telegramId,
      });

      // 5e. Upsert membership record
      const subId = subscriber?.id || (await upsertSubscriber({
        telegramId: input.telegramId,
        username: input.username,
        firstName: input.firstName,
      }));

      await db.execute(
        `INSERT INTO telegram_channel_memberships
           (subscriber_id, channel_entity_id, status, joined_at, invite_link_id)
         VALUES (?, ?, 'active', NOW(), ?)
         ON DUPLICATE KEY UPDATE status = 'active', joined_at = NOW(), invite_link_id = COALESCE(?, invite_link_id)`,
        [subId, VIP_CHANNEL_ENTITY_ID, inviteLinkId, inviteLinkId]
      );

      // 5f. Mark invite link used
      if (inviteLinkId) {
        await db.execute(
          "UPDATE telegram_invite_links SET is_used = 1, used_at = NOW() WHERE id = ?",
          [inviteLinkId]
        );
      }

      // 5g. Upgrade segment
      await db.execute(
        `UPDATE telegram_subscribers SET segment = 'vip_buyer', lifecycle_stage = 'retained' WHERE telegram_id = ?`,
        [input.telegramId]
      );

      return { approved: true, reason: inviteLinkId ? "valid_invite_link" : "active_subscription" };
    } else {
      // 5h. Decline
      await tgPost("declineChatJoinRequest", {
        chat_id: input.chatId,
        user_id: input.telegramId,
      });
      return { approved: false, reason: "no_valid_invite_or_subscription" };
    }
  } finally {
    await db.end();
  }
}
