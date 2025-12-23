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

const router = express.Router();

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
      console.error("[Telegram Webhook] Bot not found:", botToken.substring(0, 10) + "...");
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

      // TODO: Send response back to Telegram via Bot API
      // Requires calling https://api.telegram.org/bot<token>/sendMessage
      // with chat_id and text from botResponse.response
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
