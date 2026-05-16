import mysql from "mysql2/promise";

import { callTelegramApiWithGuard } from "./telegramOutboundGuard";

const DB_URL = process.env.DATABASE_URL;
const FRONTEND = (process.env.VITE_APP_URL || process.env.APP_URL || "https://creatorvault.live").replace(/\/$/, "");
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || "";

type CheckoutFlow = "creator_subscription" | "vaultx_subscription";

export interface CheckoutStartedInput {
  checkoutSessionId: string;
  flow: CheckoutFlow;
  fanId?: number | null;
  creatorId?: number | null;
  tierId?: number | null;
  vaultxCreatorId?: number | null;
  tier?: string | null;
  amountCents?: number | null;
  buyerEmail?: string | null;
  checkoutUrl?: string | null;
  successUrl?: string | null;
  cancelUrl?: string | null;
}

export interface CheckoutConvertedInput {
  checkoutSessionId: string;
  stripeSubscriptionId?: string | null;
}

async function getConnection() {
  if (!DB_URL) {
    throw new Error("DATABASE_URL is required for abandoned-checkout recovery persistence");
  }
  return mysql.createConnection(DB_URL);
}

function recoveryUrl(checkoutSessionId: string, checkoutUrl?: string | null): string {
  const encodedSession = encodeURIComponent(checkoutSessionId);
  const encodedCheckout = encodeURIComponent(checkoutUrl || "");
  return `${FRONTEND}/checkout/recover?session_id=${encodedSession}${encodedCheckout ? `&checkout_url=${encodedCheckout}` : ""}`;
}

async function ensureAbandonedCheckoutRecoveryTable(conn: mysql.Connection) {
  await conn.execute(`CREATE TABLE IF NOT EXISTS abandoned_checkout_recoveries (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    checkout_session_id VARCHAR(255) NOT NULL,
    flow VARCHAR(64) NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'started',
    fan_id BIGINT NULL,
    creator_id BIGINT NULL,
    tier_id BIGINT NULL,
    vaultx_creator_id BIGINT NULL,
    tier VARCHAR(64) NULL,
    amount_cents BIGINT NULL,
    buyer_email VARCHAR(320) NULL,
    checkout_url TEXT NULL,
    success_url TEXT NULL,
    cancel_url TEXT NULL,
    recovery_url TEXT NULL,
    notification_channel VARCHAR(64) NOT NULL DEFAULT 'checkout_recovery_url',
    notification_status VARCHAR(64) NOT NULL DEFAULT 'ready',
    notification_payload JSON NULL,
    recovery_attempt_count INT NOT NULL DEFAULT 0,
    started_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    last_recovery_at DATETIME NULL,
    completed_at DATETIME NULL,
    stripe_subscription_id VARCHAR(255) NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY ux_abandoned_checkout_session (checkout_session_id),
    KEY idx_abandoned_checkout_status_started (status, started_at),
    KEY idx_abandoned_checkout_fan (fan_id),
    KEY idx_abandoned_checkout_creator (creator_id),
    KEY idx_abandoned_checkout_vaultx_creator (vaultx_creator_id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);

  const [columnRows] = await conn.execute<any[]>(
    `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'abandoned_checkout_recoveries'`
  );
  const existingColumns = new Set(columnRows.map((row: any) => row.COLUMN_NAME));
  const addColumnIfMissing = async (name: string, definition: string) => {
    if (!existingColumns.has(name)) {
      await conn.execute(`ALTER TABLE abandoned_checkout_recoveries ADD COLUMN ${definition}`);
      existingColumns.add(name);
    }
  };

  await addColumnIfMissing("amount_cents", "amount_cents BIGINT NULL AFTER tier");
  await addColumnIfMissing("recovery_attempt_count", "recovery_attempt_count INT NOT NULL DEFAULT 0 AFTER notification_payload");
  await addColumnIfMissing("started_at", "started_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP AFTER recovery_attempt_count");
  await addColumnIfMissing("last_recovery_at", "last_recovery_at DATETIME NULL AFTER started_at");
}

async function findTelegramSubscriber(conn: mysql.Connection, fanId?: number | null): Promise<{ telegram_id: string; username?: string | null } | null> {
  if (!fanId) return null;
  try {
    const [rows] = await conn.execute(
      `SELECT telegram_id, username
       FROM telegram_subscribers
       WHERE vaultx_user_id = ? AND telegram_id IS NOT NULL
       ORDER BY last_seen_at DESC, id DESC
       LIMIT 1`,
      [fanId]
    );
    const list = rows as Array<{ telegram_id: string; username?: string | null }>;
    return list[0] || null;
  } catch (error) {
    return null;
  }
}

async function sendTelegramRecoveryMessage(chatId: string, text: string, recovery: string) {
  if (!BOT_TOKEN) return { attempted: false, ok: false, reason: "telegram_bot_token_not_configured" };
  const data = await callTelegramApiWithGuard({
    botToken: BOT_TOKEN,
    method: "sendMessage",
    body: {
      chat_id: chatId,
      text,
      parse_mode: "HTML",
      reply_markup: {
        inline_keyboard: [[{ text: "Return to checkout", url: recovery }]],
      },
    },
    context: "abandonedCheckoutRecovery.sendTelegramRecoveryMessage",
  }) as { ok?: boolean; description?: string; result?: { message_id?: number } };
  return {
    attempted: true,
    ok: Boolean(data.ok),
    reason: data.ok ? "sent" : data.description || "telegram_guard_blocked_or_api_error",
    messageId: data.result?.message_id,
  };
}

export async function recordCheckoutStarted(input: CheckoutStartedInput) {
  const conn = await getConnection();
  try {
    await ensureAbandonedCheckoutRecoveryTable(conn);
    const recovery = recoveryUrl(input.checkoutSessionId, input.checkoutUrl);
    let notificationChannel = "checkout_recovery_url";
    let notificationStatus = "ready";
    let notificationPayload: Record<string, unknown> = {
      recoveryUrl: recovery,
      checkoutUrl: input.checkoutUrl || null,
      reason: "durable_recovery_url_created",
    };

    const subscriber = await findTelegramSubscriber(conn, input.fanId);
    if (subscriber) {
      const amount = input.amountCents && input.amountCents > 0 ? `$${(input.amountCents / 100).toFixed(2)}` : "your CreatorVault offer";
      const creatorLabel = input.vaultxCreatorId || input.creatorId ? `creator ${input.vaultxCreatorId || input.creatorId}` : "this creator";
      const tg = await sendTelegramRecoveryMessage(
        String(subscriber.telegram_id),
        `You left ${amount} with ${creatorLabel} in checkout. Use the button below to return to the same Stripe checkout session before it expires.`,
        recovery
      );
      notificationChannel = "telegram_dm";
      notificationStatus = tg.ok ? "sent" : `not_sent:${tg.reason}`.slice(0, 64);
      notificationPayload = {
        recoveryUrl: recovery,
        checkoutUrl: input.checkoutUrl || null,
        telegramAttempted: tg.attempted,
        telegramMessageId: tg.messageId || null,
        telegramReason: tg.reason,
      };
    }

    await conn.execute(
      `INSERT INTO abandoned_checkout_recoveries
       (checkout_session_id, flow, status, fan_id, creator_id, tier_id, vaultx_creator_id, tier, amount_cents, buyer_email,
        checkout_url, success_url, cancel_url, recovery_url, notification_channel, notification_status, notification_payload, recovery_attempt_count, last_recovery_at)
       VALUES (?, ?, 'started', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CAST(? AS JSON), ?, NOW())
       ON DUPLICATE KEY UPDATE
         flow = VALUES(flow),
         fan_id = COALESCE(VALUES(fan_id), fan_id),
         creator_id = COALESCE(VALUES(creator_id), creator_id),
         tier_id = COALESCE(VALUES(tier_id), tier_id),
         vaultx_creator_id = COALESCE(VALUES(vaultx_creator_id), vaultx_creator_id),
         tier = COALESCE(VALUES(tier), tier),
         amount_cents = COALESCE(VALUES(amount_cents), amount_cents),
         buyer_email = COALESCE(VALUES(buyer_email), buyer_email),
         checkout_url = COALESCE(VALUES(checkout_url), checkout_url),
         success_url = COALESCE(VALUES(success_url), success_url),
         cancel_url = COALESCE(VALUES(cancel_url), cancel_url),
         recovery_url = COALESCE(VALUES(recovery_url), recovery_url),
         notification_channel = VALUES(notification_channel),
         notification_status = VALUES(notification_status),
         notification_payload = VALUES(notification_payload),
         recovery_attempt_count = recovery_attempt_count + 1,
         last_recovery_at = NOW(),
         status = IF(status = 'converted', status, 'started')`,
      [
        input.checkoutSessionId,
        input.flow,
        input.fanId || null,
        input.creatorId || null,
        input.tierId || null,
        input.vaultxCreatorId || null,
        input.tier || null,
        input.amountCents || null,
        input.buyerEmail || null,
        input.checkoutUrl || null,
        input.successUrl || null,
        input.cancelUrl || null,
        recovery,
        notificationChannel,
        notificationStatus,
        JSON.stringify(notificationPayload),
        1,
      ]
    );

    return { recoveryUrl: recovery, notificationChannel, notificationStatus };
  } finally {
    await conn.end();
  }
}

export async function markCheckoutConverted(input: CheckoutConvertedInput) {
  const conn = await getConnection();
  try {
    await ensureAbandonedCheckoutRecoveryTable(conn);
    await conn.execute(
      `UPDATE abandoned_checkout_recoveries
       SET status = 'converted', completed_at = COALESCE(completed_at, NOW()), stripe_subscription_id = COALESCE(?, stripe_subscription_id)
       WHERE checkout_session_id = ?`,
      [input.stripeSubscriptionId || null, input.checkoutSessionId]
    );
  } finally {
    await conn.end();
  }
}

export async function ensureAbandonedCheckoutRecoveryStorage() {
  const conn = await getConnection();
  try {
    await ensureAbandonedCheckoutRecoveryTable(conn);
  } finally {
    await conn.end();
  }
}
