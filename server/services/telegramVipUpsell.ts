/**
 * telegramVipUpsell.ts
 * VIP Upsell + Buyer Ladder service
 *
 * Responsibilities:
 * 1. Identify buyer's Telegram identity from purchase row
 * 2. Send real VIP upsell DM via Bot API (returns message_id)
 * 3. Generate single-use VIP invite link via createChatInviteLink
 * 4. Store invite in telegram_invite_links
 * 5. Update buyer segment: clicker → buyer → vip_offer_sent
 * 6. Upsert telegram_whale_metrics
 * 7. Record telegram_conversion_events for the upsell send
 */

import mysql from "mysql2/promise";
import { callTelegramApiWithGuard } from "./telegramOutboundGuard";

const DB_URL = process.env.DATABASE_URL || "mysql://creatorvault:KingCam214CreatorVault@localhost:3306/creatorvault";
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN!;
const VIP_CHANNEL_CHAT_ID = "-1003817770263"; // VaultX VIP (channel_entity_id=2)
const VIP_CHANNEL_ENTITY_ID = 2;

function parseDbUrl(url: string) {
  const m = url.match(/mysql:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/(.+)/);
  if (!m) throw new Error("Invalid DATABASE_URL");
  return { user: m[1], password: m[2], host: m[3], port: parseInt(m[4]), database: m[5] };
}

async function getDb() {
  const cfg = parseDbUrl(DB_URL);
  return mysql.createConnection(cfg);
}

async function tgApi(method: string, body: Record<string, unknown>) {
  return callTelegramApiWithGuard({
    botToken: BOT_TOKEN,
    method,
    body,
    context: `telegramVipUpsell.${method}`,
  }) as Promise<{ ok: boolean; result?: any; description?: string }>;
}

export interface VipUpsellOpts {
  purchaseId: number;
  buyerTelegramId: bigint | number | string; // real Telegram user ID
  amountCents: number;
  contentTitle?: string;
  campaignId?: number;
  trackingCode?: string;
}

export interface VipUpsellResult {
  success: boolean;
  dmMessageId?: string;
  inviteLinkUrl?: string;
  inviteLinkRowId?: number;
  subscriberRowId?: number;
  segmentUpdated?: string;
  whaleMetricsUpdated?: boolean;
  blocker?: string;
}

export async function sendVipUpsell(opts: VipUpsellOpts): Promise<VipUpsellResult> {
  const db = await getDb();

  try {
    const buyerTgId = String(opts.buyerTelegramId);

    // ─── 1. Upsert telegram_subscribers ───────────────────────────────────────
    const [subRows] = await db.execute<any[]>(
      `SELECT id, segment, purchase_count, total_spent_cents FROM telegram_subscribers WHERE telegram_id = ?`,
      [buyerTgId]
    );

    let subscriberId: number;
    let currentSegment: string;
    let currentPurchaseCount: number;
    let currentTotalSpent: number;

    if (subRows.length > 0) {
      subscriberId = subRows[0].id;
      currentSegment = subRows[0].segment;
      currentPurchaseCount = subRows[0].purchase_count || 0;
      currentTotalSpent = subRows[0].total_spent_cents || 0;
    } else {
      // Create subscriber row for this buyer
      const [insertResult] = await db.execute<any>(
        `INSERT INTO telegram_subscribers
           (telegram_id, segment, lifecycle_stage, total_spent_cents, purchase_count, last_active_at)
         VALUES (?, 'active_buyer', 'converted', ?, 1, NOW())`,
        [buyerTgId, opts.amountCents]
      );
      subscriberId = insertResult.insertId;
      currentSegment = "active_buyer";
      currentPurchaseCount = 0;
      currentTotalSpent = 0;
    }

    // ─── 2. Update segment to active_buyer (if not already vip_buyer) ─────────
    const newPurchaseCount = currentPurchaseCount + 1;
    const newTotalSpent = currentTotalSpent + opts.amountCents;
    const segmentAfterPurchase =
      currentSegment === "vip_buyer" ? "vip_buyer" : "active_buyer";

    await db.execute(
      `UPDATE telegram_subscribers
       SET segment = ?, purchase_count = ?, total_spent_cents = ?, lifecycle_stage = 'converted', last_active_at = NOW()
       WHERE id = ?`,
      [segmentAfterPurchase, newPurchaseCount, newTotalSpent, subscriberId]
    );

    // ─── 3. Upsert telegram_whale_metrics ─────────────────────────────────────
    const amountDollars = (opts.amountCents / 100).toFixed(2);
    await db.execute(
      `INSERT INTO telegram_whale_metrics
         (telegram_user_id, total_spent, purchase_count, avg_purchase_value,
          days_since_first_purchase, days_since_last_purchase, whale_score, whale_tier, last_calculated_at)
       VALUES (?, ?, 1, ?, 0, 0, LEAST(100, FLOOR(? / 100)), 'buyer', NOW())
       ON DUPLICATE KEY UPDATE
         total_spent = total_spent + VALUES(total_spent),
         purchase_count = purchase_count + 1,
         avg_purchase_value = (total_spent + VALUES(total_spent)) / (purchase_count + 1),
         days_since_last_purchase = 0,
         whale_score = LEAST(100, FLOOR((total_spent + VALUES(total_spent)) / 100)),
         whale_tier = CASE
           WHEN (total_spent + VALUES(total_spent)) >= 500 THEN 'whale'
           WHEN (total_spent + VALUES(total_spent)) >= 100 THEN 'high_value'
           ELSE 'buyer'
         END,
         last_calculated_at = NOW()`,
      [buyerTgId, amountDollars, amountDollars, opts.amountCents]
    );

    // ─── 4. Send VIP upsell DM ────────────────────────────────────────────────
    const contentTitle = opts.contentTitle || "exclusive content";
    const upsellText =
      `🔥 *You just unlocked ${contentTitle}*\n\n` +
      `As a buyer, you qualify for *VaultX VIP* — our private channel with:\n` +
      `• Unreleased content drops\n` +
      `• 30% off all future PPV\n` +
      `• Direct access to the creator\n\n` +
      `Your personal invite link is below. Single-use, expires in 24 hours.`;

    // First generate the invite link so we can include it in the DM
    const inviteRes = await tgApi("createChatInviteLink", {
      chat_id: VIP_CHANNEL_CHAT_ID,
      name: `Buyer ${buyerTgId} - Purchase ${opts.purchaseId}`,
      member_limit: 1,
      expire_date: Math.floor(Date.now() / 1000) + 86400, // 24 hours
      creates_join_request: false,
    });

    if (!inviteRes.ok || !inviteRes.result?.invite_link) {
      // Store blocker but still proceed with DM without invite link
      console.error(`[VipUpsell] createChatInviteLink failed: ${inviteRes.description}`);

      // Send DM without invite link
      const dmRes = await tgApi("sendMessage", {
        chat_id: buyerTgId,
        text: upsellText + `\n\n_Reply YES to receive your VIP invite link._`,
        parse_mode: "Markdown",
      });

      if (!dmRes.ok) {
        return {
          success: false,
          blocker: `DM failed: ${dmRes.description}. Invite link failed: ${inviteRes.description}`,
        };
      }

      // Update segment to vip_offer_sent
      await db.execute(
        `UPDATE telegram_subscribers SET segment = 'vip_offer_sent' WHERE id = ?`,
        [subscriberId]
      );

      return {
        success: false,
        dmMessageId: String(dmRes.result?.message_id),
        blocker: `Invite link generation failed: ${inviteRes.description}. DM sent without link.`,
        segmentUpdated: "vip_buyer",
        whaleMetricsUpdated: true,
        subscriberRowId: subscriberId,
      };
    }

    const inviteLinkUrl = inviteRes.result.invite_link;

    // ─── 5. Store invite link in telegram_invite_links ────────────────────────
    const [inviteInsert] = await db.execute<any>(
      `INSERT INTO telegram_invite_links
         (channel_entity_id, subscriber_id, purchase_id, invite_url, telegram_invite_link, is_used, expires_at)
       VALUES (?, ?, ?, ?, ?, 0, DATE_ADD(NOW(), INTERVAL 24 HOUR))`,
      [
        VIP_CHANNEL_ENTITY_ID,
        subscriberId,
        opts.purchaseId,
        inviteLinkUrl,
        inviteLinkUrl,
      ]
    );
    const inviteLinkRowId = inviteInsert.insertId;

    // ─── 6. Send DM with invite link ──────────────────────────────────────────
    const dmRes = await tgApi("sendMessage", {
      chat_id: buyerTgId,
      text:
        upsellText +
        `\n\n👇 *Your VIP Invite Link (expires 24h):*\n${inviteLinkUrl}`,
      parse_mode: "Markdown",
      reply_markup: {
        inline_keyboard: [
          [{ text: "💎 Join VaultX VIP", url: inviteLinkUrl }],
        ],
      },
    });

    if (!dmRes.ok) {
      return {
        success: false,
        inviteLinkUrl,
        inviteLinkRowId,
        subscriberRowId: subscriberId,
        blocker: `Invite link created (row ${inviteLinkRowId}) but DM failed: ${dmRes.description}. Buyer telegram_id ${buyerTgId} may not have started the bot.`,
        whaleMetricsUpdated: true,
        segmentUpdated: segmentAfterPurchase,
      };
    }

    const dmMessageId = String(dmRes.result?.message_id);

    // ─── 7. Update segment to vip_offer_sent ──────────────────────────────────
    await db.execute(
      `UPDATE telegram_subscribers SET segment = 'vip_buyer', lifecycle_stage = 'converted' WHERE id = ?`,
      [subscriberId]
    );

    // ─── 8. Log campaign message for the DM ───────────────────────────────────
    if (opts.campaignId) {
      await db.execute(
        `INSERT INTO telegram_campaign_messages
           (campaign_id, message_type, telegram_chat_id, telegram_user_id, telegram_message_id, message_text, sent_at, status)
         VALUES (?, 'vip_upsell', ?, ?, ?, ?, NOW(), 'sent')`,
        [
          opts.campaignId,
          String(buyerTgId),
          BigInt(buyerTgId),
          dmMessageId,
          upsellText.substring(0, 500),
        ]
      );
    }

    // ─── 9. Record conversion event ───────────────────────────────────────────
    if (opts.trackingCode) {
      await db.execute(
        `INSERT INTO telegram_conversion_events
           (subscriber_id, campaign_id, event_type, amount_cents, tracking_code, creator_id)
         VALUES (?, ?, 'vip_join', 0, ?, 1)`,
        [subscriberId, opts.campaignId || null, opts.trackingCode]
      );
    }

    console.log(
      `[VipUpsell] DM sent to ${buyerTgId} msg_id=${dmMessageId} invite_row=${inviteLinkRowId} invite_url=${inviteLinkUrl}`
    );

    return {
      success: true,
      dmMessageId,
      inviteLinkUrl,
      inviteLinkRowId,
      subscriberRowId: subscriberId,
      segmentUpdated: "vip_buyer",
      whaleMetricsUpdated: true,
    };
  } finally {
    await db.end();
  }
}

/**
 * Called when a user joins the VIP channel (chat_join_request or new_chat_member event)
 */
export async function recordVipJoin(opts: {
  buyerTelegramId: bigint | number | string;
  inviteLinkUrl?: string;
}): Promise<{ membershipRowId?: number; segmentUpdated: string }> {
  const db = await getDb();
  try {
    const buyerTgId = String(opts.buyerTelegramId);

    // Find subscriber
    const [subRows] = await db.execute<any[]>(
      `SELECT id FROM telegram_subscribers WHERE telegram_id = ?`,
      [buyerTgId]
    );
    if (subRows.length === 0) {
      return { segmentUpdated: "unknown_buyer" };
    }
    const subscriberId = subRows[0].id;

    // Find invite link row if URL provided
    let inviteLinkId: number | null = null;
    if (opts.inviteLinkUrl) {
      const [linkRows] = await db.execute<any[]>(
        `SELECT id FROM telegram_invite_links WHERE telegram_invite_link = ? AND is_used = 0 LIMIT 1`,
        [opts.inviteLinkUrl]
      );
      if (linkRows.length > 0) {
        inviteLinkId = linkRows[0].id;
        await db.execute(
          `UPDATE telegram_invite_links SET is_used = 1, used_at = NOW() WHERE id = ?`,
          [inviteLinkId]
        );
      }
    }

    // Insert membership row
    const [memInsert] = await db.execute<any>(
      `INSERT INTO telegram_channel_memberships
         (subscriber_id, channel_entity_id, status, joined_at, invite_link_id)
       VALUES (?, ?, 'active', NOW(), ?)`,
      [subscriberId, VIP_CHANNEL_ENTITY_ID, inviteLinkId]
    );
    const membershipRowId = memInsert.insertId;

    // Update segment to vip_member (using vip_buyer as the closest enum value)
    await db.execute(
      `UPDATE telegram_subscribers SET segment = 'vip_buyer', lifecycle_stage = 'retained' WHERE id = ?`,
      [subscriberId]
    );

    // Update whale_metrics tier
    await db.execute(
      `UPDATE telegram_whale_metrics SET whale_tier = 'vip', last_calculated_at = NOW() WHERE telegram_user_id = ?`,
      [buyerTgId]
    );

    console.log(
      `[VipUpsell] VIP join recorded: subscriber=${subscriberId} membership=${membershipRowId} invite_link=${inviteLinkId}`
    );

    return { membershipRowId, segmentUpdated: "vip_buyer" };
  } finally {
    await db.end();
  }
}
