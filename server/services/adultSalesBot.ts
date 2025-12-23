/**
 * Adult Sales Bot Service
 * 
 * Implements conversation state machine following ADULT_SALES_BOT_CHARTER.md,
 * ADULT_SALES_BOT_FLOW.md, and ADULT_SALES_BOT_PRICING.md specifications.
 * 
 * Purpose: Convert DMs into revenue with minimal creator effort.
 * Target: Adult creators (OnlyFans, Fansly, dancers, Dominican creators).
 */

import { db } from "../db";
import { botEvents } from "../../drizzle/schema";
import { eq, desc, and } from "drizzle-orm";
import { invokeLLM } from "../_core/llm";
import crypto from "crypto";

// ============ TYPES ============

export type ConversationState =
  | "greeting"
  | "qualification"
  | "offer"
  | "payment"
  | "delivery"
  | "upsell"
  | "follow_up"
  | "disengaged"
  | "blacklisted";

export type BuyerTag =
  | "ready"           // High intent, asks about specific content/pricing
  | "browsing"        // Curious but not committed
  | "time_waster"     // Multiple messages, no purchase intent
  | "negotiator"      // Attempts to negotiate price
  | "blacklisted";    // Violates safety rules or excessive time-wasting

export type PaymentMethod = "cashapp" | "zelle" | "applepay" | "crypto" | "manual_invoice";

export interface ConversationContext {
  userId: number;
  creatorId: number;
  channel: "telegram" | "whatsapp" | "instagram_dm";
  state: ConversationState;
  buyerTag: BuyerTag;
  messageCount: number;
  lastMessageAt: Date;
  metadata: {
    interestedIn?: string[];
    budget?: number;
    negotiationAttempts?: number;
    upsellAttempted?: boolean;
    followUpCount?: number;
    blacklistReason?: string;
    offerType?: string;
    price?: number;
  };
}

export interface BotResponse {
  message: string;
  nextState: ConversationState;
  buyerTag: BuyerTag;
  shouldDisengage: boolean;
  shouldBlacklist: boolean;
  metadata?: Record<string, unknown>;
}

// ============ CONSTANTS ============

const PRICE_FLOOR = {
  photo_set: 15,
  video_clip: 25,
  custom_content: 50,
  video_call: 100,
  subscription: 10,
};

const MAX_NEGOTIATION_ATTEMPTS = 2;
const MAX_FOLLOW_UP_COUNT = 2;
const MAX_MESSAGES_BEFORE_PURCHASE = 8;
const DISENGAGEMENT_THRESHOLD_HOURS = 48;

// ============ SAFETY GUARDRAILS ============

const ILLEGAL_KEYWORDS = [
  "underage", "minor", "child", "kid", "teen", "young",
  "rape", "force", "coerce", "blackmail",
  "animal", "bestiality",
  "snuff", "death", "kill",
];

const COMPLIANCE_KEYWORDS = [
  "age verification", "how old", "verify age",
];

function detectSafetyViolation(message: string): { violated: boolean; reason?: string } {
  const lowerMessage = message.toLowerCase();

  // Check for illegal content requests
  for (const keyword of ILLEGAL_KEYWORDS) {
    if (lowerMessage.includes(keyword)) {
      return { violated: true, reason: `Illegal content request: ${keyword}` };
    }
  }

  // Check for age verification bypass attempts
  if (lowerMessage.includes("no verification") || lowerMessage.includes("skip verify")) {
    return { violated: true, reason: "Age verification bypass attempt" };
  }

  return { violated: false };
}

// ============ CONVERSATION STATE MACHINE ============

export async function handleInboundMessage(
  userId: number,
  creatorId: number,
  channel: "telegram" | "whatsapp" | "instagram_dm",
  message: string,
  chatId: string
): Promise<BotResponse> {
  // Safety check first
  const safetyCheck = detectSafetyViolation(message);
  if (safetyCheck.violated) {
    await logConversation(userId, creatorId, channel, "blacklisted", {
      userMessage: message,
      botResponse: "This conversation has been terminated due to policy violation.",
      blacklistReason: safetyCheck.reason,
    });

    return {
      message: "This conversation has been terminated. If you believe this is an error, please contact support.",
      nextState: "blacklisted",
      buyerTag: "blacklisted",
      shouldDisengage: true,
      shouldBlacklist: true,
      metadata: { blacklistReason: safetyCheck.reason },
    };
  }

  // Get or create conversation context
  const context = await getConversationContext(userId, creatorId, channel);

  // Check if already blacklisted
  if (context.buyerTag === "blacklisted") {
    return {
      message: "", // No response to blacklisted users
      nextState: "blacklisted",
      buyerTag: "blacklisted",
      shouldDisengage: true,
      shouldBlacklist: true,
    };
  }

  // Check if disengaged
  if (context.state === "disengaged") {
    const hoursSinceLastMessage = (Date.now() - context.lastMessageAt.getTime()) / (1000 * 60 * 60);
    if (hoursSinceLastMessage < DISENGAGEMENT_THRESHOLD_HOURS) {
      return {
        message: "", // No response during disengagement period
        nextState: "disengaged",
        buyerTag: context.buyerTag,
        shouldDisengage: true,
        shouldBlacklist: false,
      };
    }
  }

  // Route to appropriate handler based on current state
  let response: BotResponse;

  switch (context.state) {
    case "greeting":
      response = await handleGreeting(context, message);
      break;
    case "qualification":
      response = await handleQualification(context, message);
      break;
    case "offer":
      response = await handleOffer(context, message);
      break;
    case "payment":
      response = await handlePayment(context, message);
      break;
    case "delivery":
      response = await handleDelivery(context, message);
      break;
    case "upsell":
      response = await handleUpsell(context, message);
      break;
    case "follow_up":
      response = await handleFollowUp(context, message);
      break;
    default:
      response = await handleGreeting(context, message);
  }

  // Log conversation
  await logConversation(userId, creatorId, channel, response.nextState, {
    userMessage: message,
    botResponse: response.message,
    buyerTag: response.buyerTag,
    metadata: response.metadata,
  });

  // Update conversation context
  await updateConversationContext(userId, creatorId, channel, {
    state: response.nextState,
    buyerTag: response.buyerTag,
    messageCount: context.messageCount + 1,
    lastMessageAt: new Date(),
    metadata: { ...context.metadata, ...response.metadata },
  });

  return response;
}

// ============ STATE HANDLERS ============

async function handleGreeting(context: ConversationContext, message: string): Promise<BotResponse> {
  const prompt = `You are an AI assistant for an adult content creator. A potential buyer just sent their first message: "${message}"

Respond with a friendly, professional greeting that:
1. Acknowledges their message
2. Asks what type of content they're interested in
3. Keeps it brief (2-3 sentences max)
4. Uses a warm, welcoming tone

Do NOT mention pricing yet. Do NOT be overly sexual.`;

  const llmResponse = await invokeLLM({
    messages: [
      { role: "system", content: "You are a professional sales assistant for adult content creators." },
      { role: "user", content: prompt },
    ],
  });

  const content = llmResponse.choices[0]?.message?.content;
  const botMessage = typeof content === 'string' ? content : "Hi! Thanks for reaching out. What can I help you with today?";

  return {
    message: botMessage,
    nextState: "qualification",
    buyerTag: "browsing",
    shouldDisengage: false,
    shouldBlacklist: false,
  };
}

async function handleQualification(context: ConversationContext, message: string): Promise<BotResponse> {
  const lowerMessage = message.toLowerCase();

  // Detect buyer intent
  const highIntentKeywords = ["buy", "purchase", "how much", "price", "cost", "want", "interested in"];
  const negotiationKeywords = ["discount", "cheaper", "lower price", "deal", "negotiate"];
  const timeWasterKeywords = ["free", "sample", "preview", "show me first"];

  const isHighIntent = highIntentKeywords.some(kw => lowerMessage.includes(kw));
  const isNegotiating = negotiationKeywords.some(kw => lowerMessage.includes(kw));
  const isTimeWaster = timeWasterKeywords.some(kw => lowerMessage.includes(kw));

  // Tag buyer
  let buyerTag: BuyerTag = context.buyerTag;
  if (isNegotiating) {
    buyerTag = "negotiator";
    context.metadata.negotiationAttempts = (context.metadata.negotiationAttempts || 0) + 1;
  } else if (isTimeWaster) {
    buyerTag = "time_waster";
  } else if (isHighIntent) {
    buyerTag = "ready";
  }

  // Check if exceeded negotiation attempts
  if (buyerTag === "negotiator" && (context.metadata.negotiationAttempts || 0) >= MAX_NEGOTIATION_ATTEMPTS) {
    return {
      message: "My prices are firm and reflect the quality of my content. If you're not interested at these rates, I understand. Best of luck!",
      nextState: "disengaged",
      buyerTag: "negotiator",
      shouldDisengage: true,
      shouldBlacklist: false,
    };
  }

  // Check if exceeded message limit without purchase intent
  if (context.messageCount >= MAX_MESSAGES_BEFORE_PURCHASE && buyerTag !== "ready") {
    return {
      message: "I appreciate your interest, but I need to focus on serious buyers right now. Feel free to reach out when you're ready to purchase!",
      nextState: "disengaged",
      buyerTag: "time_waster",
      shouldDisengage: true,
      shouldBlacklist: false,
    };
  }

  // Generate qualification response
  const prompt = `You are qualifying a potential buyer for adult content. Their message: "${message}"

Buyer tag: ${buyerTag}
Message count: ${context.messageCount}

Respond by:
1. Acknowledging their interest
2. Asking 1-2 specific questions to understand what they want
3. If they seem ready to buy, transition to presenting an offer
4. Keep it brief and professional

Do NOT mention pricing yet unless they explicitly ask.`;

  const llmResponse = await invokeLLM({
    messages: [
      { role: "system", content: "You are a professional sales assistant for adult content creators." },
      { role: "user", content: prompt },
    ],
  });

  const content2 = llmResponse.choices[0]?.message?.content;
  const botMessage = typeof content2 === 'string' ? content2 : "Got it! Can you tell me more about what you're looking for?";

  // Transition to offer if buyer is ready
  const nextState = buyerTag === "ready" ? "offer" : "qualification";

  return {
    message: botMessage,
    nextState,
    buyerTag,
    shouldDisengage: false,
    shouldBlacklist: false,
    metadata: { negotiationAttempts: context.metadata.negotiationAttempts },
  };
}

async function handleOffer(context: ConversationContext, message: string): Promise<BotResponse> {
  // Select offer based on conversation context
  const offerType = selectOffer(context, message);
  const price = PRICE_FLOOR[offerType as keyof typeof PRICE_FLOOR] || 25;

  const prompt = `You are presenting an offer to a buyer. They said: "${message}"

Offer: ${offerType}
Price: $${price}

Respond by:
1. Presenting the offer clearly
2. Stating the price confidently (NO negotiation)
3. Explaining what they get
4. Asking if they'd like to proceed with payment
5. Keep it brief and professional

Example: "I have a [offer type] available for $${price}. It includes [details]. Would you like to proceed with payment?"`;

  const llmResponse = await invokeLLM({
    messages: [
      { role: "system", content: "You are a professional sales assistant for adult content creators." },
      { role: "user", content: prompt },
    ],
  });

  const content3 = llmResponse.choices[0]?.message?.content;
  const botMessage = typeof content3 === 'string' ? content3 : `I have ${offerType} available for $${price}. Interested?`;

  return {
    message: botMessage,
    nextState: "payment",
    buyerTag: context.buyerTag,
    shouldDisengage: false,
    shouldBlacklist: false,
    metadata: { offerType, price },
  };
}

async function handlePayment(context: ConversationContext, message: string): Promise<BotResponse> {
  const lowerMessage = message.toLowerCase();

  // Check if buyer agrees to payment
  const agreementKeywords = ["yes", "sure", "ok", "okay", "proceed", "pay", "send"];
  const isAgreeing = agreementKeywords.some(kw => lowerMessage.includes(kw));

  if (isAgreeing) {
    const paymentInstructions = `Great! Here's how to pay:

💵 CashApp: $CreatorHandle
💸 Zelle: creator@email.com
🍎 Apple Pay: (123) 456-7890

Send $${(context.metadata as any).price || 25} and include your username in the note. I'll deliver your content within 10 minutes of payment confirmation!`;

    return {
      message: paymentInstructions,
      nextState: "delivery",
      buyerTag: context.buyerTag,
      shouldDisengage: false,
      shouldBlacklist: false,
    };
  }

  // Check if buyer is negotiating
  const negotiationKeywords = ["discount", "cheaper", "lower", "deal"];
  const isNegotiating = negotiationKeywords.some(kw => lowerMessage.includes(kw));

  if (isNegotiating) {
    context.metadata.negotiationAttempts = (context.metadata.negotiationAttempts || 0) + 1;

    if ((context.metadata.negotiationAttempts || 0) >= MAX_NEGOTIATION_ATTEMPTS) {
      return {
        message: "My prices are non-negotiable. If you're not interested, no worries!",
        nextState: "disengaged",
        buyerTag: "negotiator",
        shouldDisengage: true,
        shouldBlacklist: false,
      };
    }

    return {
      message: "My prices are firm and reflect the quality of my content. Are you ready to proceed at this price?",
      nextState: "payment",
      buyerTag: "negotiator",
      shouldDisengage: false,
      shouldBlacklist: false,
      metadata: { negotiationAttempts: context.metadata.negotiationAttempts },
    };
  }

  // Default response
  return {
    message: "Let me know if you'd like to proceed with payment, or if you have any questions!",
    nextState: "payment",
    buyerTag: context.buyerTag,
    shouldDisengage: false,
    shouldBlacklist: false,
  };
}

async function handleDelivery(context: ConversationContext, message: string): Promise<BotResponse> {
  // In real implementation, this would check payment confirmation
  // For now, simulate delivery confirmation

  const deliveryMessage = `Payment confirmed! Your content is being prepared and will be delivered shortly. Thank you for your purchase! 💕

Would you be interested in any additional content? I have some exclusive offers available.`;

  return {
    message: deliveryMessage,
    nextState: "upsell",
    buyerTag: context.buyerTag,
    shouldDisengage: false,
    shouldBlacklist: false,
  };
}

async function handleUpsell(context: ConversationContext, message: string): Promise<BotResponse> {
  const lowerMessage = message.toLowerCase();

  // Check if already attempted upsell
  if (context.metadata.upsellAttempted) {
    return {
      message: "Thanks again for your purchase! Feel free to reach out anytime you want more content. 😊",
      nextState: "follow_up",
      buyerTag: context.buyerTag,
      shouldDisengage: false,
      shouldBlacklist: false,
    };
  }

  // Check if buyer is interested
  const interestedKeywords = ["yes", "sure", "what", "show me", "interested"];
  const notInterestedKeywords = ["no", "not now", "maybe later"];

  const isInterested = interestedKeywords.some(kw => lowerMessage.includes(kw));
  const notInterested = notInterestedKeywords.some(kw => lowerMessage.includes(kw));

  if (notInterested) {
    return {
      message: "No problem! Thanks for your purchase. Reach out anytime! 💕",
      nextState: "follow_up",
      buyerTag: context.buyerTag,
      shouldDisengage: false,
      shouldBlacklist: false,
      metadata: { upsellAttempted: true },
    };
  }

  if (isInterested) {
    const upsellOffer = `I have a special bundle available:
- 3 exclusive videos
- 10 photos
- 1 custom message

Normally $75, but for you: $60 (since you just purchased!)

Interested?`;

    return {
      message: upsellOffer,
      nextState: "payment",
      buyerTag: context.buyerTag,
      shouldDisengage: false,
      shouldBlacklist: false,
      metadata: { upsellAttempted: true, price: 60 },
    };
  }

  // Default upsell pitch
  return {
    message: "I have some exclusive bundles available at a discount for returning customers. Interested in hearing more?",
    nextState: "upsell",
    buyerTag: context.buyerTag,
    shouldDisengage: false,
    shouldBlacklist: false,
  };
}

async function handleFollowUp(context: ConversationContext, message: string): Promise<BotResponse> {
  context.metadata.followUpCount = (context.metadata.followUpCount || 0) + 1;

  if ((context.metadata.followUpCount || 0) >= MAX_FOLLOW_UP_COUNT) {
    return {
      message: "Thanks for your interest! I'll let you know when I have new content available. 😊",
      nextState: "disengaged",
      buyerTag: context.buyerTag,
      shouldDisengage: true,
      shouldBlacklist: false,
    };
  }

  return {
    message: "Hey! I have some new content available. Want to check it out?",
    nextState: "offer",
    buyerTag: context.buyerTag,
    shouldDisengage: false,
    shouldBlacklist: false,
    metadata: { followUpCount: context.metadata.followUpCount },
  };
}

// ============ HELPER FUNCTIONS ============

function selectOffer(context: ConversationContext, message: string): string {
  const lowerMessage = message.toLowerCase();

  if (lowerMessage.includes("video")) return "video_clip";
  if (lowerMessage.includes("photo") || lowerMessage.includes("pic")) return "photo_set";
  if (lowerMessage.includes("custom")) return "custom_content";
  if (lowerMessage.includes("call") || lowerMessage.includes("video chat")) return "video_call";
  if (lowerMessage.includes("subscription") || lowerMessage.includes("subscribe")) return "subscription";

  // Default to photo set
  return "photo_set";
}

async function getConversationContext(
  userId: number,
  creatorId: number,
  channel: string
): Promise<ConversationContext> {
  const recentEvents = await db
    .select()
    .from(botEvents)
    .where(
      and(
        eq(botEvents.userId, userId),
        eq(botEvents.channel, channel as any)
      )
    )
    .orderBy(desc(botEvents.createdAt))
    .limit(10);

  if (recentEvents.length === 0) {
    return {
      userId,
      creatorId,
      channel: channel as any,
      state: "greeting",
      buyerTag: "browsing",
      messageCount: 0,
      lastMessageAt: new Date(),
      metadata: {},
    };
  }

  const latestEvent = recentEvents[0];
  const eventData = latestEvent.eventData as any;

  return {
    userId,
    creatorId,
    channel: channel as any,
    state: (eventData.nextState as ConversationState) || "greeting",
    buyerTag: (eventData.buyerTag as BuyerTag) || "browsing",
    messageCount: recentEvents.length,
    lastMessageAt: latestEvent.createdAt,
    metadata: eventData.metadata || {},
  };
}

async function updateConversationContext(
  userId: number,
  creatorId: number,
  channel: string,
  updates: Partial<ConversationContext>
): Promise<void> {
  // Context is stored in bot_events, no separate update needed
  // Each new message creates a new event with updated context
}

async function logConversation(
  userId: number,
  creatorId: number,
  channel: string,
  state: ConversationState,
  data: Record<string, unknown>
): Promise<void> {
  await db.insert(botEvents).values({
    id: crypto.randomUUID(),
    userId,
    channel: channel as any,
    eventType: "adult_sales_conversation",
    eventData: {
      creatorId,
      state,
      ...data,
    },
    outcome: "success",
  });
}

export async function getConversationHistory(
  userId: number,
  creatorId: number,
  channel: string,
  limit: number = 50
): Promise<any[]> {
  return await db
    .select()
    .from(botEvents)
    .where(
      and(
        eq(botEvents.userId, userId),
        eq(botEvents.channel, channel as any),
        eq(botEvents.eventType, "adult_sales_conversation")
      )
    )
    .orderBy(desc(botEvents.createdAt))
    .limit(limit);
}

export async function blacklistUser(
  userId: number,
  creatorId: number,
  reason: string
): Promise<void> {
  await db.insert(botEvents).values({
    id: crypto.randomUUID(),
    userId,
    channel: "telegram",
    eventType: "adult_sales_blacklist",
    eventData: {
      creatorId,
      reason,
      blacklistedAt: new Date().toISOString(),
    },
    outcome: "success",
  });
}
