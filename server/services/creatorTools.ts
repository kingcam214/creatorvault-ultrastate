/**
 * Creator Tools
 *
 * USABLE TODAY: Real AI-powered content generation tools.
 * No video dependencies, no placeholders.
 * Viral Hook Generator, Caption + CTA Generator, Broadcast Composers.
 */

import { invokeLLM } from "../_core/llm";
import { qualityGate, withCreatorVaultMessagingDna } from "./qualityGate";

export interface ViralHookRequest {
  niche: string;
  platform: "tiktok" | "instagram" | "youtube" | "twitter";
  tone?: "casual" | "professional" | "humorous" | "inspiring";
}

export interface CaptionRequest {
  content: string;
  platform: "tiktok" | "instagram" | "youtube" | "twitter";
  includeHashtags?: boolean;
  includeCTA?: boolean;
}

export interface BroadcastRequest {
  channel: "telegram" | "whatsapp";
  audience: string;
  message: string;
  tone?: "casual" | "professional" | "urgent";
}

/**
 * Generate viral hooks (text-based, no video)
 */
export async function generateViralHooks(request: ViralHookRequest): Promise<string[]> {
  try {
    const tone = request.tone || "casual";

    const response = await invokeLLM({
      messages: [
        {
          role: "system",
          content: withCreatorVaultMessagingDna(
            `You write CreatorVault-native hooks for ${request.platform}. Every hook must reveal a money mechanism, creator leverage, automation advantage, VaultX moat, or challenge momentum. Do not write empty curiosity bait.`,
            "vaultx"
          ),
        },
        {
          role: "user",
          content: `Generate 5 finished hooks for ${request.niche} content on ${request.platform}. Tone: ${tone}. Each hook must be one sentence, concrete, and tied to CreatorVault-style earning leverage: attention routed into tracked clicks, follow-up, paid unlocks, VIP access, automation, or challenge progress.`,
        },
      ],
    });
    const content = typeof response.choices[0].message.content === "string"
      ? response.choices[0].message.content
      : "";

    const hooks = content
      .split("\n")
      .filter(line => line.trim().length > 0 && !line.match(/^(Hook|#|\d+\.)/))
      .map(line => line.replace(/^[\d\.\-\*]+\s*/, "").trim())
      .filter(line => line.length > 10)
      .map(line => qualityGate.check(line, {
        surface: "agent-public-output",
        context: "vaultx",
        hasActionElement: true,
        requireCreatorVaultPositioning: true,
        requireMessagingDna: true,
      }));

    return hooks.slice(0, 5);
  } catch (error) {
    console.error("[Creator Tools] Error generating viral hooks:", error);
    throw error;
  }
}

/**
 * Generate caption + CTA
 */
export async function generateCaption(request: CaptionRequest): Promise<string> {
  try {
    const hashtagsInstruction = request.includeHashtags ? "Include 5-10 relevant hashtags." : "No hashtags.";
    const ctaInstruction = request.includeCTA ? "End with one strong call-to-action." : "Do not force a CTA, but make the value mechanism obvious.";

    const response = await invokeLLM({
      messages: [
        {
          role: "system",
          content: withCreatorVaultMessagingDna(
            `You are CreatorVault's channel-native caption architect for ${request.platform}. Write finished copy that turns creator attention into revenue movement, not generic engagement bait.`,
            "vaultx"
          ),
        },
        {
          role: "user",
          content: `Write a finished ${request.platform} caption about: "${request.content}". ${hashtagsInstruction} ${ctaInstruction} Include one concrete CreatorVault/VaultX mechanism: tracked click, paid unlock, follow-up route, VIP escalation, automation advantage, or challenge progress.`,
        },
      ],
    });

    const content = typeof response.choices[0].message.content === "string"
      ? response.choices[0].message.content
      : "";
    return qualityGate.check(content.trim(), {
      surface: "agent-public-output",
      context: "vaultx",
      hasActionElement: request.includeCTA ? undefined : true,
      requireCreatorVaultPositioning: true,
      requireMessagingDna: true,
    });
  } catch (error) {
    console.error("[Creator Tools] Error generating caption:", error);
    throw error;
  }
}

/**
 * Generate Telegram broadcast message
 */
export async function generateTelegramBroadcast(request: BroadcastRequest): Promise<string> {
  try {
    const tone = request.tone || "casual";

    const response = await invokeLLM({
      messages: [
        {
          role: "system",
          content: withCreatorVaultMessagingDna(
            "You write CreatorVault Telegram broadcasts. They must feel like a live command feed: short, proprietary, useful, and built around one clear earning action.",
            "telegram"
          ),
        },
        {
          role: "user",
          content: `Write a Telegram broadcast for ${request.audience}. Message: "${request.message}". Tone: ${tone}. Maximum four sentences. No markdown syntax. No generic flash-sale language. Include a CreatorVault/VaultX mechanism and one clean tap/reply/unlock action.`,
        },
      ],
    });

    const content = typeof response.choices[0].message.content === "string"
      ? response.choices[0].message.content
      : "";
    return qualityGate.check(content.trim(), {
      surface: "telegram-broadcast",
      context: "telegram",
      recipientKey: `creator-tools:${request.audience}`,
      requireCreatorVaultPositioning: true,
      requireMessagingDna: true,
    });
  } catch (error) {
    console.error("[Creator Tools] Error generating Telegram broadcast:", error);
    throw error;
  }
}

/**
 * Generate WhatsApp campaign message
 */
export async function generateWhatsAppCampaign(request: BroadcastRequest): Promise<string> {
  try {
    const tone = request.tone || "casual";

    const response = await invokeLLM({
      messages: [
        {
          role: "system",
          content: withCreatorVaultMessagingDna(
            "You write CreatorVault WhatsApp messages that feel like direct access, not mass marketing. Compress the money path into one useful message and one reply/tap action.",
            "whatsapp"
          ),
        },
        {
          role: "user",
          content: `Write a WhatsApp campaign message for ${request.audience}. Message: "${request.message}". Tone: ${tone}. Keep it under 420 characters, CreatorVault-positioned, concrete, and action-led.`,
        },
      ],
    });

    const content = typeof response.choices[0].message.content === "string"
      ? response.choices[0].message.content
      : "";
    return qualityGate.check(content.trim(), {
      surface: "whatsapp",
      context: "whatsapp",
      recipientKey: `creator-tools:${request.audience}`,
      requireCreatorVaultPositioning: true,
      requireMessagingDna: true,
    });
  } catch (error) {
    console.error("[Creator Tools] Error generating WhatsApp campaign:", error);
    throw error;
  }
}

/**
 * Generate content strategy suggestions
 */
export async function generateContentStrategy(niche: string, goals: string): Promise<string> {
  try {
    const response = await invokeLLM({
      messages: [
        {
          role: "system",
          content: withCreatorVaultMessagingDna(
            "You are CreatorVault's content-money systems strategist. Every recommendation must turn attention, assets, automation, or follow-up into a repeatable revenue route.",
            "ai-agent-challenge"
          ),
        },
        {
          role: "user",
          content: `Create a 30-day CreatorVault content strategy for a ${niche} creator. Goals: ${goals}. Include: VaultX drops, Telegram command-feed moments, WhatsApp direct-access messages, AI-agent challenge tasks, tracked-click follow-up, and VIP escalation. No generic pillars without a money mechanism.`,
        },
      ],
    });

    const content = typeof response.choices[0].message.content === "string"
      ? response.choices[0].message.content
      : "";
    return qualityGate.check(content.trim(), {
      surface: "agent-report",
      context: "ai-agent-challenge",
      hasActionElement: true,
      allowInternalReport: true,
      requireCreatorVaultPositioning: true,
      requireMessagingDna: true,
      requireChallengeMomentum: true,
    });
  } catch (error) {
    console.error("[Creator Tools] Error generating content strategy:", error);
    throw error;
  }
}

/**
 * Analyze content for viral potential
 */
export async function analyzeViralPotential(content: string, platform: string): Promise<{
  score: number;
  strengths: string[];
  improvements: string[];
  suggestions: string[];
}> {
  try {
    const response = await invokeLLM({
      messages: [
        {
          role: "system",
          content: `You are a viral content analyst. Analyze content and provide a viral potential score (0-100) with specific feedback. Use CreatorVault Messaging DNA as the scoring lens: concrete mechanism, earning path, platform moat, action clarity, and non-generic value.`,
        },
        {
          role: "user",
          content: `Analyze this ${platform} content for viral potential: "${content}". Provide: 1) Viral score (0-100), 2) Strengths (3 points), 3) Improvements needed (3 points), 4) Specific suggestions (3 actionable items). Format as JSON.`,
        },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "viral_analysis",
          strict: true,
          schema: {
            type: "object",
            properties: {
              score: { type: "number", description: "Viral potential score 0-100" },
              strengths: {
                type: "array",
                items: { type: "string" },
                description: "3 strengths of the content",
              },
              improvements: {
                type: "array",
                items: { type: "string" },
                description: "3 improvements needed",
              },
              suggestions: {
                type: "array",
                items: { type: "string" },
                description: "3 actionable suggestions",
              },
            },
            required: ["score", "strengths", "improvements", "suggestions"],
            additionalProperties: false,
          },
        },
      },
    });

    const responseContent = typeof response.choices[0].message.content === "string"
      ? response.choices[0].message.content
      : "{}";
    const analysis = JSON.parse(responseContent);
    return analysis;
  } catch (error) {
    console.error("[Creator Tools] Error analyzing viral potential:", error);
    throw error;
  }
}
