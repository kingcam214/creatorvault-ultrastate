/**
 * Telegram AI Bot Integration
 * 
 * Connects Telegram bot with role-aware AI system
 */

import {
  generateBotResponse,
  generateOnboardingPlan,
  generateScript,
  logBotEvent,
  getUserContext,
  type BotRole,
} from "./aiBot";
import { db } from "../db";
import { users, telegramLeads } from "../../drizzle/schema";
import { eq } from "drizzle-orm";

/**
 * Handle incoming Telegram message with AI response
 */
export async function handleTelegramMessage(params: {
  botId: string;
  telegramUserId: string;
  username?: string;
  firstName?: string;
  message: string;
  role?: BotRole;
}) {
  // Find or create user from Telegram ID
  const existingLeads = await db
    .select()
    .from(telegramLeads)
    .where(eq(telegramLeads.telegramUserId, params.telegramUserId))
    .limit(1);

  let userId: number;
  let userRole: BotRole = params.role || "creator";

  if (existingLeads.length > 0) {
    const lead = existingLeads[0];
    // Try to find associated user
    const userData = await db
      .select()
      .from(users)
      .where(eq(users.email, lead.email || ""))
      .limit(1);

    if (userData.length > 0) {
      userId = userData[0].id;
      // Determine role from user data
      if (userData[0].role === "creator") userRole = "creator";
      else if (userData[0].role === "admin" || userData[0].role === "king") userRole = "field_operator";
    } else {
      // Create temporary user ID from Telegram ID
      userId = parseInt(params.telegramUserId) || 0;
    }
  } else {
    // New lead - use Telegram ID as temporary user ID
    userId = parseInt(params.telegramUserId) || 0;
  }

  // Get or create user context
  let userContext = await getUserContext(userId);
  
  if (!userContext) {
    userContext = {
      userId,
      role: userRole,
      language: "en", // TODO: Detect from Telegram user
    };
  }

  // Generate AI response
  const response = await generateBotResponse(userContext, params.message);

  // Log to database
  await logBotEvent({
    userId,
    channel: "telegram",
    eventType: "telegram_message",
    eventData: {
      botId: params.botId,
      telegramUserId: params.telegramUserId,
      username: params.username,
      firstName: params.firstName,
      message: params.message,
      response: response.message,
      actions: response.actions,
    },
  });

  return response;
}

/**
 * Send onboarding plan via Telegram
 */
export async function sendTelegramOnboarding(params: {
  botId: string;
  telegramUserId: string;
  day: 1 | 2 | 7;
  role: BotRole;
}) {
  // Find user
  const existingLeads = await db
    .select()
    .from(telegramLeads)
    .where(eq(telegramLeads.telegramUserId, params.telegramUserId))
    .limit(1);

  let userId = parseInt(params.telegramUserId) || 0;

  if (existingLeads.length > 0) {
    const lead = existingLeads[0];
    const userData = await db
      .select()
      .from(users)
      .where(eq(users.email, lead.email || ""))
      .limit(1);

    if (userData.length > 0) {
      userId = userData[0].id;
    }
  }

  const userContext = {
    userId,
    role: params.role,
    language: "en",
  };

  const plan = await generateOnboardingPlan(userContext, params.day);

  // Log to database
  await logBotEvent({
    userId,
    channel: "telegram",
    eventType: "telegram_onboarding",
    eventData: {
      botId: params.botId,
      telegramUserId: params.telegramUserId,
      day: params.day,
      role: params.role,
      plan: plan.plan,
      taskCount: plan.tasks.length,
    },
  });

  return plan;
}

/**
 * Generate recruitment script for Telegram
 */
export async function generateTelegramScript(params: {
  userId: number;
  scriptType: "recruitment" | "sales" | "onboarding" | "support";
  role: BotRole;
  customization?: {
    targetAudience?: string;
    platform?: string;
    goal?: string;
  };
}) {
  const userContext = {
    userId: params.userId,
    role: params.role,
    language: "en",
  };

  const script = await generateScript(userContext, params.scriptType, params.customization);

  // Log to database
  await logBotEvent({
    userId: params.userId,
    channel: "telegram",
    eventType: "telegram_script_generated",
    eventData: {
      scriptType: params.scriptType,
      role: params.role,
      customization: params.customization,
      variationCount: script.variations.length,
    },
  });

  return script;
}

/**
 * Format AI response for Telegram (Markdown)
 */
export function formatForTelegram(message: string): string {
  // Telegram uses a subset of Markdown
  // Convert standard markdown to Telegram format
  return message
    .replace(/\*\*(.*?)\*\*/g, "*$1*") // Bold
    .replace(/__(.*?)__/g, "_$1_") // Italic
    .replace(/`(.*?)`/g, "`$1`") // Code
    .replace(/\[(.*?)\]\((.*?)\)/g, "[$1]($2)"); // Links
}

/**
 * Create Telegram keyboard from actions
 */
export function createTelegramKeyboard(actions?: Array<{ type: string; label: string; data: any }>) {
  if (!actions || actions.length === 0) {
    return null;
  }

  // Create inline keyboard
  const keyboard = actions.map((action) => [
    {
      text: action.label,
      callback_data: JSON.stringify({
        type: action.type,
        data: action.data,
      }),
    },
  ]);

  return {
    inline_keyboard: keyboard,
  };
}
