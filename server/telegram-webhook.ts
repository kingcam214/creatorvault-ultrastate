/**
 * Telegram Webhook Endpoint
 * 
 * Receives incoming messages from Telegram and logs to bot_events table
 */

import express from "express";
import crypto from "crypto";
import { db } from "./db";
import { botEvents, telegramBots } from "../drizzle/schema";
import { eq } from "drizzle-orm";
import { handleInboundMessage } from "./services/adultSalesBot";
import fetch from "node-fetch";

const router = express.Router();

/**
 * Send message to Telegram user
 * Retries up to 2 times on failure
 */
async function sendTelegramMessage(
  botToken: string,
  chatId: number,
  text: string,
  retries = 2
): Promise<boolean> {
  const url = `https://api.telegram.org/bot${botToken}/sendMessage`;
  
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          text,
          parse_mode: "HTML",
        }),
      });

      const data = await response.json() as { ok: boolean; description?: string };
      
      if (data.ok) {
        console.log(`[Telegram] Message sent successfully to chat ${chatId}`);
        return true;
      } else {
        console.error(`[Telegram] sendMessage failed (attempt ${attempt + 1}/${retries + 1}):`, data.description);
        if (attempt === retries) return false;
      }
    } catch (error) {
      console.error(`[Telegram] sendMessage error (attempt ${attempt + 1}/${retries + 1}):`, error);
      if (attempt === retries) return false;
    }
    
    // Wait before retry (exponential backoff)
    await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
  }
  
  return false;
}

/**
 * Verify Telegram webhook signature
 * Uses bot token as secret key
 */
function verifyTelegramSignature(
  botToken: string,
  body: string,
  signature: string | undefined
): boolean {
  if (!signature) return false;
  
  const secretKey = crypto
    .createHash("sha256")
    .update(botToken)
    .digest();
  
  const hmac = crypto
    .createHmac("sha256", secretKey)
    .update(body)
    .digest("hex");
  
  return hmac === signature;
}

/**
 * Extract bot token from URL path
 * Format: /api/telegram/webhook/:botToken
 */
function extractBotToken(path: string): string | null {
  const match = path.match(/\/api\/telegram\/webhook\/([^\/]+)/);
  return match ? match[1] : null;
}

/**
 * POST /api/telegram/webhook/:botToken
 * 
 * Receives Telegram updates and logs to database
 */
router.post("/webhook/:botToken", express.json(), async (req, res) => {
  try {
    const botToken = req.params.botToken;
    const signature = req.headers["x-telegram-bot-api-secret-token"] as string | undefined;
    const update = req.body;

    // Verify bot exists in database
    const [bot] = await db
      .select()
      .from(telegramBots)
      .where(eq(telegramBots.botToken, botToken))
      .limit(1);

    if (!bot) {
      // Stale webhook hit from a bot token no longer in the database — return 404 silently.
      return res.status(404).json({ ok: false, error: "Bot not found" });
    }

    // Verify signature if provided
    if (signature) {
      const bodyString = JSON.stringify(req.body);
      const isValid = verifyTelegramSignature(botToken, bodyString, signature);
      
      if (!isValid) {
        console.error("[Telegram Webhook] Invalid signature");
        return res.status(403).json({ ok: false, error: "Invalid signature" });
      }
    }

    // Handle Telegram Stars successful_payment
    if (update.message?.successful_payment) {
      const payment = update.message.successful_payment;
      const starsAmount = payment.total_amount; // in smallest currency unit (stars = 1:1)
      const dollarEquiv = starsAmount * 0.013; // ~$0.013 per star
      try {
        const { creditChallengePayment } = await import("./challengePaymentHook");
        await creditChallengePayment(
          dollarEquiv,
          "telegram_stars",
          `Telegram Stars payment — ${starsAmount} stars from user ${update.message.from?.username || update.message.from?.id}`
        );
        console.log(`[Telegram Stars] ${starsAmount} stars (~$${dollarEquiv.toFixed(2)}) credited to challenge`);
      } catch { /* never block */ }
    }

    // Handle pre_checkout_query (must answer OK)
    if (update.pre_checkout_query) {
      const botTokenVal = bot.botToken;
      try {
        await fetch(`https://api.telegram.org/bot${botTokenVal}/answerPreCheckoutQuery`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ pre_checkout_query_id: update.pre_checkout_query.id, ok: true }),
        });
      } catch { /* ignore */ }
      return res.status(200).json({ ok: true });
    }

    // ── callback_query handler (inline button taps) ─────────────────────────
    if (update.callback_query) {
      const cq = update.callback_query;
      const cqUserId = cq.from?.id;
      const cqUsername = cq.from?.username || cq.from?.first_name || "unknown";
      // Upsert subscriber
      try {
        const { upsertSubscriber } = await import("./services/telegramMoneyLoop");
        await upsertSubscriber({
          telegramId: cqUserId,
          username: cqUsername,
          firstName: cq.from?.first_name,
          lastName: cq.from?.last_name,
        });
      } catch { /* non-blocking */ }
      // Ack the callback query
      try {
        await fetch(`https://api.telegram.org/bot${botToken}/answerCallbackQuery`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ callback_query_id: cq.id }),
        });
      } catch { /* ignore */ }
      console.log("[Telegram Webhook] callback_query from", cqUserId, cqUsername);
      return res.status(200).json({ ok: true });
    }

    // ── chat_join_request handler (VIP join requests) ─────────────────────────
    if (update.chat_join_request) {
      const jr = update.chat_join_request;
      const jrUserId = jr.from?.id;
      const jrChatId = String(jr.chat?.id);
      const jrUsername = jr.from?.username;
      const jrFirstName = jr.from?.first_name;
      console.log("[Telegram Webhook] chat_join_request from", jrUserId, "for chat", jrChatId);
      try {
        const { handleVipJoinRequest } = await import("./services/telegramMoneyLoop");
        const result = await handleVipJoinRequest({
          telegramId: jrUserId,
          chatId: jrChatId,
          username: jrUsername,
          firstName: jrFirstName,
        });
        console.log("[Telegram Webhook] join_request result:", result);
      } catch (e: any) {
        console.error("[Telegram Webhook] join_request error:", e.message);
      }
      return res.status(200).json({ ok: true });
    }

    // Extract message data
    const message = update.message || update.edited_message || update.channel_post;
    
    if (!message) {
      console.log("[Telegram Webhook] No message in update");
      return res.status(200).json({ ok: true });
    }

    const chatId = message.chat?.id;
    const userId = message.from?.id;
    const username = message.from?.username || message.from?.first_name || "Unknown";
    const messageId = message.message_id;
    const text = message.text || message.caption || "";
    const timestamp = message.date ? new Date(message.date * 1000) : new Date();

    // Insert into bot_events
    await db.insert(botEvents).values({
      userId: bot.createdBy, // Owner user ID
      channel: "telegram",
      eventType: "message_received",
      eventData: {
        botId: bot.id,
        botName: bot.name,
        chatId,
        userId,
        username,
        messageId,
        text,
        timestamp: timestamp.toISOString(),
        rawPayload: update,
      },
      outcome: "success",
    });

    console.log("[Telegram Webhook] Message received:", {
      bot: bot.name,
      chatId,
      userId,
      text: text.substring(0, 50),
    });


    // ── VaultX Funnel Command Handler ─────────────────────────────────────────
    // Handle commands before routing to Adult Sales Bot
    if (text && text.startsWith("/")) {
      const [cmd, ...args] = text.trim().split(/\s+/);
      const command = cmd.toLowerCase();
      const FRONTEND = process.env.VITE_FRONTEND_FORGE_API_URL?.replace("/api", "") || "https://creatorvault.live";
      
      // Upsert subscriber record
      try {
        const mysql2 = await import("mysql2/promise");
        const dbUrl = process.env.DATABASE_URL || "mysql://creatorvault:KingCam214CreatorVault@127.0.0.1:3306/creatorvault";
        const m = dbUrl.match(/mysql:\/\/([^:]+):([^@]+)@([^:/]+):(\d+)\/([^?]+)/);
        if (m) {
          const [, user, password, host, port, database] = m;
          const conn = await mysql2.default.createConnection({ host, port: parseInt(port), user, password, database });
          await conn.execute(
            `INSERT INTO telegram_subscribers (telegram_id, username, first_name, last_name, last_active_at)
             VALUES (?, ?, ?, ?, NOW())
             ON DUPLICATE KEY UPDATE username = COALESCE(VALUES(username), username),
               first_name = COALESCE(VALUES(first_name), first_name), last_active_at = NOW()`,
            [userId || 0, username, message.from?.first_name || null, message.from?.last_name || null]
          );
          await conn.end();
        }
      } catch { /* non-blocking */ }

      // Helper to send inline keyboard message
      async function sendInlineMsg(text: string, buttons: Array<Array<{text: string; url?: string; callback_data?: string}>>) {
        const url = `https://api.telegram.org/bot${botToken}/sendMessage`;
        await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chat_id: chatId,
            text,
            parse_mode: "HTML",
            reply_markup: { inline_keyboard: buttons }
          })
        });
      }

      if (command === "/start") {
        const trackingCode = `tgstart${Date.now().toString(36)}`;
        await sendInlineMsg(
          `🔥 <b>Welcome to VaultX</b>\n\nThe premium content platform built for creators who demand more.\n\n💎 <b>What you get:</b>\n• Exclusive PPV drops\n• VIP creator content\n• Direct unlock access\n\nTap below to explore 👇`,
          [
            [{ text: "🎬 Browse Content", url: `${FRONTEND}/vaultx` }],
            [{ text: "💎 Go VIP", url: `${FRONTEND}/r/${trackingCode}-vip` }, { text: "🔓 Unlock Drop", url: `${FRONTEND}/vaultx` }]
          ]
        );
        res.status(200).json({ ok: true });
        return;
      }

      if (command === "/unlock") {
        const contentId = args[0] || "";
        const unlockUrl = contentId ? `${FRONTEND}/vaultx?unlock=${contentId}` : `${FRONTEND}/vaultx`;
        await sendInlineMsg(
          `🔓 <b>Unlock Premium Content</b>\n\nYou\'re one step away from full access.\n\nClick below to unlock 👇`,
          [
            [{ text: "🔓 Unlock Now", url: unlockUrl }],
            [{ text: "👀 Preview First", url: `${FRONTEND}/vaultx` }]
          ]
        );
        res.status(200).json({ ok: true });
        return;
      }

      if (command === "/vip") {
        await sendInlineMsg(
          `💎 <b>VaultX VIP Access</b>\n\nJoin the inner circle. Get:\n• Early drops before public\n• Exclusive creator content\n• Direct creator contact\n• Priority unlock access\n\nLimited spots available 👇`,
          [
            [{ text: "💎 Join VIP Now", url: `${FRONTEND}/vaultx` }],
            [{ text: "📋 See What\'s Included", url: `${FRONTEND}/vaultx` }]
          ]
        );
        res.status(200).json({ ok: true });
        return;
      }

      if (command === "/newdrop") {
        await sendInlineMsg(
          `⚡ <b>New Drop Available</b>\n\nFresh exclusive content just dropped.\n\nBe first to unlock it 👇`,
          [
            [{ text: "🎬 See The Drop", url: `${FRONTEND}/vaultx` }],
            [{ text: "🔓 Unlock Instantly", url: `${FRONTEND}/vaultx` }]
          ]
        );
        res.status(200).json({ ok: true });
        return;
      }

      if (command === "/balance") {
        await sendInlineMsg(
          `💰 <b>Your VaultX Account</b>\n\nCheck your balance, purchases, and creator earnings in your dashboard.`,
          [
            [{ text: "📊 Open Dashboard", url: `${FRONTEND}/vaultx` }]
          ]
        );
        res.status(200).json({ ok: true });
        return;
      }

      if (command === "/buy") {
        const contentId = args[0] || "";
        const buyUrl = contentId ? `${FRONTEND}/vaultx?buy=${contentId}` : `${FRONTEND}/vaultx`;
        await sendInlineMsg(
          `🛒 <b>Purchase Content</b>\n\nReady to unlock? Tap below to complete your purchase securely.`,
          [
            [{ text: "💳 Buy Now", url: buyUrl }]
          ]
        );
        res.status(200).json({ ok: true });
        return;
      }

      if (command === "/menu") {
        await sendInlineMsg(
          `📋 <b>VaultX Menu</b>\n\nWhat would you like to do?`,
          [
            [{ text: "🎬 Browse Content", url: `${FRONTEND}/vaultx` }, { text: "🔓 Unlock Drop", url: `${FRONTEND}/vaultx` }],
            [{ text: "💎 Go VIP", url: `${FRONTEND}/vaultx` }, { text: "💰 My Balance", url: `${FRONTEND}/vaultx` }],
            [{ text: "⚡ Latest Drop", url: `${FRONTEND}/vaultx` }]
          ]
        );
        res.status(200).json({ ok: true });
        return;
      }

      if (command === "/subscribe") {
        await sendInlineMsg(
          `🔔 <b>Subscribe to Updates</b>\n\nNever miss a drop. Subscribe to get notified the moment new content goes live.`,
          [
            [{ text: "🔔 Subscribe Now", url: `${FRONTEND}/vaultx` }]
          ]
        );
        res.status(200).json({ ok: true });
        return;
      }

      if (command === "/tips") {
        await sendInlineMsg(
          `💸 <b>Send a Tip</b>\n\nShow your favorite creator some love. Tips go directly to them.`,
          [
            [{ text: "💸 Send Tip", url: `${FRONTEND}/vaultx` }]
          ]
        );
        res.status(200).json({ ok: true });
        return;
      }
    }
    // ── End VaultX Command Handler ────────────────────────────────────────────

    // Route message through Adult Sales Bot
    try {
      const botResponse = await handleInboundMessage(
        userId || 0,
        bot.createdBy,
        "telegram",
        text,
        String(chatId || "")
      );

      // Log bot response
      await db.insert(botEvents).values({
        userId: bot.createdBy,
        channel: "telegram",
        eventType: "bot_response",
        eventData: {
          botId: bot.id,
          chatId,
          buyerId: userId,
          response: botResponse.message,
          nextState: botResponse.nextState,
          buyerTag: botResponse.buyerTag,
          shouldDisengage: botResponse.shouldDisengage,
        },
        outcome: "success",
      });

      console.log("[Adult Sales Bot] Response generated:", {
        state: botResponse.nextState,
        tag: botResponse.buyerTag,
        disengage: botResponse.shouldDisengage,
      });

      // Send response back to Telegram
      if (chatId && !botResponse.shouldDisengage) {
        // If bot returned a purchaseUrl in metadata, send with inline button
        const purchaseUrl = (botResponse.metadata as any)?.purchaseUrl;
        let sent: boolean;
        if (purchaseUrl) {
          const inlineUrl = `https://api.telegram.org/bot${botToken}/sendMessage`;
          try {
            const inlineResp = await fetch(inlineUrl, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                chat_id: chatId,
                text: botResponse.message,
                parse_mode: "HTML",
                reply_markup: {
                  inline_keyboard: [
                    [{ text: "🔓 Unlock Now", url: purchaseUrl }],
                    [{ text: "🎬 Preview First", url: "https://creatorvault.live/vaultx" }]
                  ]
                }
              }),
            });
            const inlineData = await inlineResp.json() as { ok: boolean; description?: string };
            sent = inlineData.ok;
            if (!sent) console.error("[Telegram] Inline button send failed:", inlineData.description);
          } catch (e: any) {
            console.error("[Telegram] Inline button send error:", e.message);
            sent = false;
          }
        } else {
          sent = await sendTelegramMessage(botToken, chatId, botResponse.message);
        }
        
        if (!sent) {
          console.error("[Telegram] Failed to send bot response after retries");
          await db.insert(botEvents).values({
            userId: bot.createdBy,
            channel: "telegram",
            eventType: "send_message_failed",
            eventData: {
              botId: bot.id,
              chatId,
              response: botResponse.message,
              error: "Failed after 2 retries",
            },
            outcome: "error",
          });
        } else {
          // Log successful outbound message
          await db.insert(botEvents).values({
            userId: bot.createdBy,
            channel: "telegram",
            eventType: "message_sent",
            eventData: {
              botId: bot.id,
              chatId,
              buyerId: userId,
              text: botResponse.message,
              conversationState: botResponse.nextState,
            },
            outcome: "success",
          });
        }
      } else if (botResponse.shouldDisengage) {
        console.log("[Adult Sales Bot] Not sending response - buyer disengaged");
      }
    } catch (botError) {
      console.error("[Adult Sales Bot] Error processing message:", botError);
      await db.insert(botEvents).values({
        userId: bot.createdBy,
        channel: "telegram",
        eventType: "bot_error",
        eventData: {
          botId: bot.id,
          chatId,
          error: botError instanceof Error ? botError.message : String(botError),
        },
        outcome: "error",
      });
    }

    res.status(200).json({ ok: true });
  } catch (error) {
    console.error("[Telegram Webhook] Error:", error);
    
    // Log error to bot_events
    try {
      await db.insert(botEvents).values({
        userId: 1, // Fallback to system user
        channel: "telegram",
        eventType: "webhook_error",
        eventData: {
          error: error instanceof Error ? error.message : String(error),
          body: req.body,
        },
        outcome: "error",
      });
    } catch (logError) {
      console.error("[Telegram Webhook] Failed to log error:", logError);
    }

    res.status(500).json({ ok: false, error: "Internal server error" });
  }
});

/**
 * GET /api/telegram/health
 * 
 * Health check endpoint that writes to bot_events
 */
router.get("/health", async (req, res) => {
  try {
    // Test database connection
    const [result] = await db
      .select()
      .from(botEvents)
      .limit(1);

    // Write health check event
    await db.insert(botEvents).values({
      userId: 1, // System user
      channel: "telegram",
      eventType: "health_check",
      eventData: {
        timestamp: new Date().toISOString(),
        source: "webhook_health_endpoint",
      },
      outcome: "success",
    });

    res.status(200).json({
      ok: true,
      db: "ok",
      time: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[Telegram Health] Error:", error);
    res.status(500).json({
      ok: false,
      db: "error",
      time: new Date().toISOString(),
      error: error instanceof Error ? error.message : String(error),
    });
  }
});

export default router;
