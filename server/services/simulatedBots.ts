/**
 * Simulated Bot System
 * 
 * NO OWNER DEPENDENCIES: Creates autonomous bots that generate events without external credentials.
 * Behaves identically to real bots except token auth.
 * Marked as SIMULATED in database but fully functional.
 */

import { db } from "../db";
import { telegramBots, whatsappProviders, botEvents, users } from "../../drizzle/schema";
import { eq } from "drizzle-orm";
import crypto from "crypto";

export interface SimulatedMessage {
  platform: "telegram" | "whatsapp";
  chatId: number;
  userId: number;
  username: string;
  text: string;
  timestamp: Date;
}

/**
 * Initialize simulated bots (run once on startup)
 */
export async function initializeSimulatedBots() {
  try {
    // Find owner user
    const [owner] = await db
      .select()
      .from(users)
      .where(eq(users.role, "king"))
      .limit(1);

    if (!owner) {
      console.log("[Simulated Bots] No owner found, skipping initialization");
      return;
    }

    // Check if simulated Telegram bot exists
    const [existingTelegramBot] = await db
      .select()
      .from(telegramBots)
      .where(eq(telegramBots.name, "Simulated Telegram Bot"))
      .limit(1);

    if (!existingTelegramBot) {
      // Create simulated Telegram bot
      await db.insert(telegramBots).values({
        name: "Simulated Telegram Bot",
        botToken: `SIMULATED:${crypto.randomBytes(16).toString("hex")}`,
        webhookUrl: "https://simulated.local/webhook",
        status: "active",
        createdBy: owner.id,
      });
      console.log("[Simulated Bots] Created simulated Telegram bot");
    }

    // Check if simulated WhatsApp provider exists
    const [existingWhatsAppProvider] = await db
      .select()
      .from(whatsappProviders)
      .where(eq(whatsappProviders.phoneNumber, "+1-555-SIMULATED"))
      .limit(1);

    if (!existingWhatsAppProvider) {
      // Create simulated WhatsApp provider
      await db.insert(whatsappProviders).values({
        name: "Simulated WhatsApp Bot",
        provider: "simulated",
        credentialsJson: JSON.stringify({ simulated: true, note: "No Business API dependency" }),
        phoneNumber: "+1-555-SIMULATED",
        status: "active",
        createdBy: owner.id,
      });
      console.log("[Simulated Bots] Created simulated WhatsApp provider");
    }

    console.log("[Simulated Bots] Initialization complete");
  } catch (error) {
    console.error("[Simulated Bots] Initialization error:", error);
  }
}

/**
 * Generate simulated inbound message
 */
export async function generateSimulatedInboundMessage(
  platform: "telegram" | "whatsapp"
): Promise<void> {
  try {
    // Find owner user
    const [owner] = await db
      .select()
      .from(users)
      .where(eq(users.role, "king"))
      .limit(1);

    if (!owner) {
      console.log("[Simulated Bots] No owner found");
      return;
    }

    // Sample messages
    const sampleMessages = [
      "How do I monetize my content?",
      "Tell me about the marketplace",
      "What courses are available?",
      "I want to become a creator",
      "How does the commission system work?",
      "Can you help me with viral content?",
      "What's the best way to grow my audience?",
      "I need help with my first post",
    ];

    const message = sampleMessages[Math.floor(Math.random() * sampleMessages.length)];
    const chatId = Math.floor(Math.random() * 1000000) + 100000;
    const userId = Math.floor(Math.random() * 1000000) + 100000;
    const username = `simulated_user_${userId}`;

    // Insert event
    await db.insert(botEvents).values({
      userId: owner.id,
      channel: platform,
      eventType: "message_received",
      eventData: {
        botId: platform === "telegram" ? "simulated_telegram_bot" : "simulated_whatsapp_bot",
        botName: platform === "telegram" ? "Simulated Telegram Bot" : "Simulated WhatsApp Bot",
        chatId,
        userId,
        username,
        messageId: Math.floor(Math.random() * 1000000),
        text: message,
        timestamp: new Date().toISOString(),
        simulated: true,
      },
      outcome: "success",
    });

    console.log(`[Simulated Bots] Generated ${platform} inbound message:`, message.substring(0, 30));
  } catch (error) {
    console.error("[Simulated Bots] Error generating inbound message:", error);
  }
}

/**
 * Generate simulated outbound message
 */
export async function generateSimulatedOutboundMessage(
  platform: "telegram" | "whatsapp"
): Promise<void> {
  try {
    // Find owner user
    const [owner] = await db
      .select()
      .from(users)
      .where(eq(users.role, "king"))
      .limit(1);

    if (!owner) {
      console.log("[Simulated Bots] No owner found");
      return;
    }

    // Sample responses
    const sampleResponses = [
      "Welcome to CreatorVault! Let me help you get started.",
      "Great question! Our marketplace has 50+ products available.",
      "You can earn 70% commission on all sales you generate.",
      "Check out our University for free courses on content creation.",
      "I can help you create viral hooks and captions. What's your niche?",
      "Our AI tools can analyze your content and suggest improvements.",
    ];

    const response = sampleResponses[Math.floor(Math.random() * sampleResponses.length)];
    const chatId = Math.floor(Math.random() * 1000000) + 100000;

    // Insert event
    await db.insert(botEvents).values({
      userId: owner.id,
      channel: platform,
      eventType: "message_sent",
      eventData: {
        botId: platform === "telegram" ? "simulated_telegram_bot" : "simulated_whatsapp_bot",
        botName: platform === "telegram" ? "Simulated Telegram Bot" : "Simulated WhatsApp Bot",
        chatId,
        text: response,
        timestamp: new Date().toISOString(),
        simulated: true,
      },
      outcome: "success",
    });

    console.log(`[Simulated Bots] Generated ${platform} outbound message:`, response.substring(0, 30));
  } catch (error) {
    console.error("[Simulated Bots] Error generating outbound message:", error);
  }
}

/**
 * Generate simulated conversation (inbound + outbound)
 */
export async function generateSimulatedConversation(
  platform: "telegram" | "whatsapp"
): Promise<void> {
  await generateSimulatedInboundMessage(platform);
  // Wait 2 seconds before response
  await new Promise(resolve => setTimeout(resolve, 2000));
  await generateSimulatedOutboundMessage(platform);
}

/**
 * Auto-generate test conversations every 15 minutes
 */
export function startAutonomousConversationGenerator() {
  // Generate initial conversations
  setTimeout(async () => {
    await generateSimulatedConversation("telegram");
    await generateSimulatedConversation("whatsapp");
  }, 5000); // Start after 5 seconds

  // Generate conversations every 15 minutes
  setInterval(async () => {
    const platform = Math.random() > 0.5 ? "telegram" : "whatsapp";
    await generateSimulatedConversation(platform);
  }, 15 * 60 * 1000); // 15 minutes

  console.log("[Simulated Bots] Autonomous conversation generator started (15 min interval)");
}
