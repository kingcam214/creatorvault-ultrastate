/**
 * WhatsApp AI Bot Integration
 * 
 * Connects WhatsApp automation with role-aware AI system
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
import { users, whatsappLeads } from "../../drizzle/schema";
import { eq } from "drizzle-orm";

/**
 * Handle incoming WhatsApp message with AI response
 */
export async function handleWhatsAppMessage(params: {
  providerId: string;
  phoneNumber: string;
  name?: string;
  message: string;
  role?: BotRole;
}) {
  // Find or create user from phone number
  const existingLeads = await db
    .select()
    .from(whatsappLeads)
    .where(eq(whatsappLeads.phoneNumber, params.phoneNumber))
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
      // Create temporary user ID from phone hash
      userId = hashPhoneToId(params.phoneNumber);
    }
  } else {
    // New lead - use phone hash as temporary user ID
    userId = hashPhoneToId(params.phoneNumber);
  }

  // Get or create user context
  let userContext = await getUserContext(userId);
  
  if (!userContext) {
    userContext = {
      userId,
      role: userRole,
      language: "en", // TODO: Detect from WhatsApp user
    };
  }

  // Generate AI response
  const response = await generateBotResponse(userContext, params.message);

  // Log to database
  await logBotEvent({
    userId,
    channel: "whatsapp",
    eventType: "whatsapp_message",
    eventData: {
      providerId: params.providerId,
      phoneNumber: params.phoneNumber,
      name: params.name,
      message: params.message,
      response: response.message,
      actions: response.actions,
    },
  });

  return response;
}

/**
 * Send onboarding plan via WhatsApp
 */
export async function sendWhatsAppOnboarding(params: {
  providerId: string;
  phoneNumber: string;
  day: 1 | 2 | 7;
  role: BotRole;
}) {
  // Find user
  const existingLeads = await db
    .select()
    .from(whatsappLeads)
    .where(eq(whatsappLeads.phoneNumber, params.phoneNumber))
    .limit(1);

  let userId = hashPhoneToId(params.phoneNumber);

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
    channel: "whatsapp",
    eventType: "whatsapp_onboarding",
    eventData: {
      providerId: params.providerId,
      phoneNumber: params.phoneNumber,
      day: params.day,
      role: params.role,
      plan: plan.plan,
      taskCount: plan.tasks.length,
    },
  });

  return plan;
}

/**
 * Generate recruitment script for WhatsApp
 */
export async function generateWhatsAppScript(params: {
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
    channel: "whatsapp",
    eventType: "whatsapp_script_generated",
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
 * Format AI response for WhatsApp
 */
export function formatForWhatsApp(message: string): string {
  // WhatsApp supports basic formatting
  return message
    .replace(/\*\*(.*?)\*\*/g, "*$1*") // Bold
    .replace(/__(.*?)__/g, "_$1_") // Italic
    .replace(/~~(.*?)~~/g, "~$1~") // Strikethrough
    .replace(/`(.*?)`/g, "```$1```"); // Code
}

/**
 * Create WhatsApp button message from actions
 */
export function createWhatsAppButtons(
  message: string,
  actions?: Array<{ type: string; label: string; data: any }>
) {
  if (!actions || actions.length === 0) {
    return {
      text: message,
    };
  }

  // WhatsApp supports up to 3 buttons
  const buttons = actions.slice(0, 3).map((action, index) => ({
    type: "reply",
    reply: {
      id: `action_${index}`,
      title: action.label.substring(0, 20), // Max 20 chars
    },
  }));

  return {
    type: "interactive",
    interactive: {
      type: "button",
      body: {
        text: message,
      },
      action: {
        buttons,
      },
    },
  };
}

/**
 * Hash phone number to consistent user ID
 */
function hashPhoneToId(phoneNumber: string): number {
  // Simple hash function to convert phone to numeric ID
  let hash = 0;
  for (let i = 0; i < phoneNumber.length; i++) {
    const char = phoneNumber.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash);
}
