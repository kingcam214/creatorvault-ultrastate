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
          parse_mode: "Markdown",
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

      // Send response back to Telegram
      if (chatId && !botResponse.shouldDisengage) {
        const sent = await sendTelegramMessage(botToken, chatId, botResponse.message);
        
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
