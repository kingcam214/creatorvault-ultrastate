/**
 * Creator Tools
 * 
 * USABLE TODAY: Real AI-powered content generation tools.
 * No video dependencies, no placeholders.
 * Viral Hook Generator, Caption + CTA Generator, Broadcast Composers.
 */

import { invokeLLM } from "../_core/llm";

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
          content: `You are a viral content expert specializing in ${request.platform}. Generate attention-grabbing hooks that stop scrolling.`,
        },
        {
          role: "user",
          content: `Generate 5 viral hooks for ${request.niche} content on ${request.platform}. Tone: ${tone}. Each hook should be 1-2 sentences max. Make them scroll-stopping and curiosity-driven.`,
        },
      ],
    });
    const content = typeof response.choices[0].message.content === "string" 
      ? response.choices[0].message.content 
      : "";
    
    // Parse hooks from response
    const hooks = content
      .split("\n")
      .filter(line => line.trim().length > 0 && !line.match(/^(Hook|#|\d+\.)/))
      .map(line => line.replace(/^[\d\.\-\*]+\s*/, "").trim())
      .filter(line => line.length > 10);

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
    const ctaInstruction = request.includeCTA ? "End with a strong call-to-action." : "No call-to-action.";
    
    const response = await invokeLLM({
      messages: [
        {
          role: "system",
          content: `You are a social media copywriter specializing in ${request.platform}. Write engaging captions that drive engagement.`,
        },
        {
          role: "user",
          content: `Write a caption for ${request.platform} about: "${request.content}". ${hashtagsInstruction} ${ctaInstruction}`,
        },
      ],
    });

    const content = typeof response.choices[0].message.content === "string" 
      ? response.choices[0].message.content 
      : "";
    return content.trim();
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
          content: `You are a Telegram marketing expert. Write broadcast messages that get high engagement and click-through rates.`,
        },
        {
          role: "user",
          content: `Write a Telegram broadcast message for ${request.audience}. Message: "${request.message}". Tone: ${tone}. Include emojis and formatting (bold, italic) using Telegram markdown.`,
        },
      ],
    });

    const content = typeof response.choices[0].message.content === "string" 
      ? response.choices[0].message.content 
      : "";
    return content.trim();
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
          content: `You are a WhatsApp marketing expert. Write campaign messages that feel personal and drive action.`,
        },
        {
          role: "user",
          content: `Write a WhatsApp campaign message for ${request.audience}. Message: "${request.message}". Tone: ${tone}. Keep it conversational and under 160 characters if possible.`,
        },
      ],
    });

    const content = typeof response.choices[0].message.content === "string" 
      ? response.choices[0].message.content 
      : "";
    return content.trim();
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
          content: `You are a content strategy consultant. Provide actionable, data-driven recommendations.`,
        },
        {
          role: "user",
          content: `Create a 30-day content strategy for a ${niche} creator. Goals: ${goals}. Include content pillars, posting frequency, and engagement tactics.`,
        },
      ],
    });

    const content = typeof response.choices[0].message.content === "string" 
      ? response.choices[0].message.content 
      : "";
    return content.trim();
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
          content: `You are a viral content analyst. Analyze content and provide a viral potential score (0-100) with specific feedback.`,
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
