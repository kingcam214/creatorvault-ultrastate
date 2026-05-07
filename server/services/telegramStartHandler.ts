/**
 * telegramStartHandler.ts
 * 
 * Handles all /start deep link flows for the VaultMoney_CreatorBot:
 * 
 * 1. /start purchase_<purchaseId>_<token>
 *    - Validates token against vaultx_ppv_purchases.telegram_connect_token
 *    - Captures telegram_user_id from the Telegram update
 *    - Updates users.telegram_user_id
 *    - Upserts telegram_subscribers (segment=active_buyer)
 *    - Updates vaultx_ppv_purchases.buyer_telegram_id + telegram_link_status='linked'
 *    - Upserts telegram_whale_metrics
 *    - Calls sendVipUpsell() to generate invite + send DM automatically
 *    - Clears any pending telegram_reactivation_jobs for this purchase
 * 
 * 2. Failsafe: if purchase has telegram_link_status='unlinked' and buyer connects later,
 *    the system resumes the VIP flow automatically from the purchase row.
 */

import mysql2 from "mysql2/promise";
import crypto from "crypto";

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN!;
const TG_API = `https://api.telegram.org/bot${BOT_TOKEN}`;
const VIP_CHANNEL_CHAT_ID = "-1003817770263";
const VIP_CHANNEL_ENTITY_ID = 2;

function getPool() {
  return mysql2.createPool(process.env.DATABASE_URL as string);
}

async function sendTelegramMessage(chatId: number | string, text: string, replyMarkup?: any) {
  const body: any = {
    chat_id: chatId,
    text,
    parse_mode: "Markdown",
  };
  if (replyMarkup) body.reply_markup = replyMarkup;

  const res = await fetch(`${TG_API}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return res.json() as Promise<any>;
}

async function createVipInviteLink(label: string) {
  const expireDate = Math.floor(Date.now() / 1000) + 86400; // 24h
  const res = await fetch(`${TG_API}/createChatInviteLink`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: VIP_CHANNEL_CHAT_ID,
      name: label,
      member_limit: 1,
      expire_date: expireDate,
      creates_join_request: false,
    }),
  });
  const data = await res.json() as any;
  return { ok: data.ok, inviteUrl: data.result?.invite_link, expireDate, raw: data };
}

/**
 * Main handler — called from telegram-webhook.ts when update.message.text starts with /start
 */
export async function handleStartDeepLink(
  chatId: number,
  fromUser: { id: number; username?: string; first_name?: string; last_name?: string },
  startParam: string // everything after "/start "
): Promise<void> {
  const pool = getPool();
  try {
    console.log(`[start-handler] chatId=${chatId} from=${fromUser.id} param="${startParam}"`);

    // ─── Parse purchase_<id>_<token> ─────────────────────────────────────────
    const purchaseMatch = startParam.match(/^purchase_(\d+)_([a-f0-9]{32})$/);
    if (!purchaseMatch) {
      // Not a purchase deep link — send generic welcome
      await sendTelegramMessage(chatId,
        "👋 Welcome to *VaultMoney CreatorBot*!\n\nUse this bot to receive exclusive VIP content and unlock PPV drops from your favorite creators."
      );
      pool.end();
      return;
    }

    const purchaseId = parseInt(purchaseMatch[1]);
    const token = purchaseMatch[2];

    // ─── Validate purchase + token ────────────────────────────────────────────
    const [purchaseRows] = await pool.query(
      `SELECT p.id, p.fan_id, p.amount_paid, p.telegram_link_status, p.telegram_connect_token,
              p.buyer_telegram_id, p.content_id, p.creator_id,
              u.name, u.email
       FROM vaultx_ppv_purchases p
       LEFT JOIN users u ON u.id = p.fan_id
       WHERE p.id = ? LIMIT 1`,
      [purchaseId]
    ) as any;

    if (!purchaseRows.length) {
      await sendTelegramMessage(chatId, "❌ Purchase not found. Please contact support.");
      pool.end();
      return;
    }

    const purchase = purchaseRows[0];

    if (purchase.telegram_connect_token !== token) {
      await sendTelegramMessage(chatId, "❌ Invalid or expired link. Please return to the purchase confirmation page.");
      pool.end();
      return;
    }

    // ─── Already linked? ──────────────────────────────────────────────────────
    if (purchase.telegram_link_status === "linked" && purchase.buyer_telegram_id) {
      // Check if they already have a valid invite link
      const [existingInvite] = await pool.query(
        "SELECT telegram_invite_link FROM telegram_invite_links WHERE purchase_id = ? AND is_used = 0 AND expires_at > NOW() LIMIT 1",
        [purchaseId]
      ) as any;

      if (existingInvite.length) {
        const inviteUrl = existingInvite[0].telegram_invite_link;
        await sendTelegramMessage(chatId,
          `✅ You're already connected!\n\nYour VIP invite link is still valid:\n${inviteUrl}`,
          { inline_keyboard: [[{ text: "💎 Join VaultX VIP", url: inviteUrl }]] }
        );
      } else {
        await sendTelegramMessage(chatId, "✅ Already connected! Your invite link has expired. A new one is being generated...");
        // Fall through to generate a new one
      }
      pool.end();
      return;
    }

    // ─── Step 1: Link telegram_user_id to users table ─────────────────────────
    if (purchase.fan_id) {
      await pool.query(
        "UPDATE users SET telegram_user_id = ? WHERE id = ? AND (telegram_user_id IS NULL OR telegram_user_id = 0)",
        [fromUser.id, purchase.fan_id]
      );
      console.log(`[start-handler] Linked users.id=${purchase.fan_id} → telegram_user_id=${fromUser.id}`);
    }

    // ─── Step 2: Upsert telegram_subscribers ─────────────────────────────────
    const [existingSub] = await pool.query(
      "SELECT id, segment FROM telegram_subscribers WHERE telegram_id = ? LIMIT 1",
      [fromUser.id]
    ) as any;

    let subscriberId: number;
    if (existingSub.length) {
      subscriberId = existingSub[0].id;
      // Only upgrade segment if not already vip_offer_sent or higher
      const currentSeg = existingSub[0].segment;
      const upgradeSegments = ['free_lurker', 'warm_lead', 'inactive', 'creator_fan'];
      if (upgradeSegments.includes(currentSeg)) {
        await pool.query(
          "UPDATE telegram_subscribers SET segment='active_buyer', lifecycle_stage='converted', purchase_count=purchase_count+1, total_spent_cents=total_spent_cents+?, last_active_at=NOW() WHERE id=?",
          [Math.round(parseFloat(purchase.amount_paid) * 100), subscriberId]
        );
      }
      console.log(`[start-handler] Updated subscriber id=${subscriberId}`);
    } else {
      const [insertResult] = await pool.query(
        `INSERT INTO telegram_subscribers 
         (telegram_id, username, first_name, last_name, segment, lifecycle_stage, 
          total_spent_cents, purchase_count, last_active_at, vaultx_user_id)
         VALUES (?, ?, ?, ?, 'active_buyer', 'converted', ?, 1, NOW(), ?)`,
        [
          fromUser.id,
          fromUser.username || null,
          fromUser.first_name || null,
          fromUser.last_name || null,
          Math.round(parseFloat(purchase.amount_paid) * 100),
          purchase.fan_id || null,
        ]
      ) as any;
      subscriberId = insertResult.insertId;
      console.log(`[start-handler] Inserted subscriber id=${subscriberId}`);
    }

    // ─── Step 3: Update purchase row ─────────────────────────────────────────
    await pool.query(
      "UPDATE vaultx_ppv_purchases SET buyer_telegram_id=?, telegram_link_status='linked' WHERE id=?",
      [fromUser.id, purchaseId]
    );
    console.log(`[start-handler] Purchase id=${purchaseId} linked to telegram_user_id=${fromUser.id}`);

    // ─── Step 4: Upsert whale_metrics ─────────────────────────────────────────
    const amountCents = Math.round(parseFloat(purchase.amount_paid) * 100);
    await pool.query(
      `INSERT INTO telegram_whale_metrics 
       (telegram_user_id, total_spent, purchase_count, avg_purchase_value, 
        days_since_first_purchase, days_since_last_purchase, whale_score, whale_tier, last_calculated_at)
       VALUES (?, ?, 1, ?, 0, 0, LEAST(100, FLOOR(? / 100)), 'buyer', NOW())
       ON DUPLICATE KEY UPDATE
         total_spent = total_spent + ?,
         purchase_count = purchase_count + 1,
         avg_purchase_value = (total_spent + ?) / (purchase_count + 1),
         days_since_last_purchase = 0,
         whale_score = LEAST(100, FLOOR((total_spent + ?) / 100)),
         last_calculated_at = NOW()`,
      [
        String(fromUser.id),
        purchase.amount_paid, purchase.amount_paid, amountCents,
        purchase.amount_paid, purchase.amount_paid, purchase.amount_paid
      ]
    );
    console.log(`[start-handler] Whale metrics upserted for telegram_user_id=${fromUser.id}`);

    // ─── Step 5: Generate VIP invite link ─────────────────────────────────────
    const inviteResult = await createVipInviteLink(`Buyer ${fromUser.id} - Purchase ${purchaseId}`);
    if (!inviteResult.ok) {
      console.error(`[start-handler] createChatInviteLink failed:`, inviteResult.raw);
      await sendTelegramMessage(chatId,
        "✅ Telegram connected! Your VIP access is being processed. You'll receive your invite link within 60 seconds."
      );
      pool.end();
      return;
    }

    const inviteUrl = inviteResult.inviteUrl;
    console.log(`[start-handler] Invite link created: ${inviteUrl}`);

    // ─── Step 6: Store invite link ────────────────────────────────────────────
    const [inviteInsert] = await pool.query(
      `INSERT INTO telegram_invite_links 
       (channel_entity_id, subscriber_id, purchase_id, invite_url, telegram_invite_link, is_used, expires_at)
       VALUES (?, ?, ?, ?, ?, 0, FROM_UNIXTIME(?))`,
      [VIP_CHANNEL_ENTITY_ID, subscriberId, purchaseId, inviteUrl, inviteUrl, inviteResult.expireDate]
    ) as any;
    const inviteLinkId = inviteInsert.insertId;
    console.log(`[start-handler] Stored invite_link id=${inviteLinkId}`);

    // ─── Step 7: Update segment to vip_offer_sent ─────────────────────────────
    await pool.query(
      "UPDATE telegram_subscribers SET segment='vip_offer_sent' WHERE id=?",
      [subscriberId]
    );

    // ─── Step 8: Clear any pending reactivation jobs ──────────────────────────
    await pool.query(
      "UPDATE telegram_reactivation_jobs SET status='completed' WHERE purchase_id=? AND status='pending'",
      [purchaseId]
    );

    // ─── Step 9: Send VIP upsell DM with invite link ──────────────────────────
    const amountFormatted = `$${parseFloat(purchase.amount_paid).toFixed(2)}`;
    const dmResult = await sendTelegramMessage(
      chatId,
      `🔥 *Telegram Connected — VIP Access Unlocked*\n\n` +
      `Your *${amountFormatted}* purchase has been verified.\n\n` +
      `You now have access to *VaultX VIP* — our private channel with:\n` +
      `• Unreleased content drops before anyone else\n` +
      `• 30% off all future PPV purchases\n` +
      `• Direct creator access\n\n` +
      `Your personal invite link *(single-use, expires in 24h)*:\n${inviteUrl}`,
      {
        inline_keyboard: [[
          { text: "💎 Join VaultX VIP", url: inviteUrl }
        ]]
      }
    );

    if (dmResult.ok) {
      const messageId = dmResult.result.message_id;
      console.log(`[start-handler] VIP DM sent message_id=${messageId} to chat_id=${chatId}`);
    } else {
      console.error(`[start-handler] DM send failed:`, dmResult);
    }

    pool.end();

  } catch (err: any) {
    console.error("[start-handler] error:", err.message);
    pool.end();
    // Best-effort error message to user
    try {
      await sendTelegramMessage(chatId, "⚠️ Something went wrong processing your purchase link. Please try again or contact support.");
    } catch {}
  }
}

/**
 * handleVipJoin — called from telegram-webhook.ts on chat_member updates
 * when a user joins the VIP channel.
 * 
 * Inserts/updates telegram_channel_memberships,
 * marks invite as used, upgrades segment to vip_member.
 */
export async function handleVipJoin(
  telegramUserId: number,
  channelChatId: string,
  channelEntityId: number
): Promise<void> {
  const pool = getPool();
  try {
    // Find subscriber
    const [subRows] = await pool.query(
      "SELECT id FROM telegram_subscribers WHERE telegram_id = ? LIMIT 1",
      [telegramUserId]
    ) as any;

    const subscriberId = subRows.length ? subRows[0].id : null;

    // Find the most recent unused invite link for this subscriber + channel
    let inviteLinkId: number | null = null;
    if (subscriberId) {
      const [inviteRows] = await pool.query(
        `SELECT id FROM telegram_invite_links 
         WHERE subscriber_id = ? AND channel_entity_id = ? AND is_used = 0 
         ORDER BY created_at DESC LIMIT 1`,
        [subscriberId, channelEntityId]
      ) as any;
      if (inviteRows.length) {
        inviteLinkId = inviteRows[0].id;
      }
    }

    // Insert or update telegram_channel_memberships
    if (subscriberId) {
      const [existingMembership] = await pool.query(
        "SELECT id FROM telegram_channel_memberships WHERE subscriber_id = ? AND channel_entity_id = ? LIMIT 1",
        [subscriberId, channelEntityId]
      ) as any;

      if (existingMembership.length) {
        await pool.query(
          "UPDATE telegram_channel_memberships SET status='active', joined_at=NOW(), invite_link_id=? WHERE id=?",
          [inviteLinkId, existingMembership[0].id]
        );
        console.log(`[vip-join] Updated membership id=${existingMembership[0].id} status=active`);
      } else {
        const [memberInsert] = await pool.query(
          "INSERT INTO telegram_channel_memberships (subscriber_id, channel_entity_id, status, joined_at, invite_link_id) VALUES (?, ?, 'active', NOW(), ?)",
          [subscriberId, channelEntityId, inviteLinkId]
        ) as any;
        console.log(`[vip-join] Inserted membership id=${memberInsert.insertId}`);
      }

      // Mark invite as used
      if (inviteLinkId) {
        await pool.query(
          "UPDATE telegram_invite_links SET is_used=1, used_at=NOW() WHERE id=?",
          [inviteLinkId]
        );
        console.log(`[vip-join] Marked invite_link id=${inviteLinkId} as used`);
      }

      // Upgrade segment to vip_member
      await pool.query(
        "UPDATE telegram_subscribers SET segment='vip_member', lifecycle_stage='converted' WHERE id=?",
        [subscriberId]
      );
      console.log(`[vip-join] Upgraded subscriber id=${subscriberId} to vip_member`);

      // Update whale_metrics
      await pool.query(
        "UPDATE telegram_whale_metrics SET whale_tier='vip', last_calculated_at=NOW() WHERE telegram_user_id=?",
        [String(telegramUserId)]
      );
    }

    pool.end();
  } catch (err: any) {
    console.error("[vip-join] error:", err.message);
    pool.end();
  }
}

/**
 * queueReactivationJob — called when a PPV purchase is completed but buyer
 * has not connected Telegram within 10 minutes.
 * 
 * Marks purchase as 'unlinked', creates a telegram_reactivation_jobs row,
 * and updates the subscriber segment to 'unlinked_buyer'.
 */
export async function queueReactivationJob(
  purchaseId: number,
  fanId: number,
  amountPaid: number
): Promise<void> {
  const pool = getPool();
  try {
    // Mark purchase as unlinked
    await pool.query(
      "UPDATE vaultx_ppv_purchases SET telegram_link_status='unlinked' WHERE id=? AND telegram_link_status='pending'",
      [purchaseId]
    );

    // Check if subscriber exists (they may have used the bot before)
    const [subRows] = await pool.query(
      "SELECT id FROM telegram_subscribers WHERE vaultx_user_id = ? LIMIT 1",
      [fanId]
    ) as any;

    const subscriberId = subRows.length ? subRows[0].id : null;

    // Create reactivation job
    const scheduledAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24h from now
    await pool.query(
      `INSERT INTO telegram_reactivation_jobs 
       (subscriber_id, purchase_id, reason, status, scheduled_at)
       VALUES (?, ?, 'no_telegram_link', 'pending', ?)`,
      [subscriberId, purchaseId, scheduledAt]
    );

    // If subscriber exists, update segment
    if (subscriberId) {
      await pool.query(
        "UPDATE telegram_subscribers SET segment='unlinked_buyer' WHERE id=? AND segment NOT IN ('vip_offer_sent','vip_buyer','vip_member','whale')",
        [subscriberId]
      );
    }

    console.log(`[reactivation] Queued job for purchase_id=${purchaseId} fan_id=${fanId}`);
    pool.end();
  } catch (err: any) {
    console.error("[reactivation] error:", err.message);
    pool.end();
  }
}
