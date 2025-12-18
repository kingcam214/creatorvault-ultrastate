/**
 * CreatorVault Role-Aware AI Bot
 * 
 * One AI brain with role-based contexts:
 * - Creator: Monetization, content optimization, growth strategies
 * - Recruiter: Commission tracking, lead generation, conversion scripts
 * - Field Operator: Location-based actions, tourism monetization, recruitment
 * - Ambassador: Brand representation, community building, event coordination
 * 
 * KINGCAM MANDATE: All interactions must log to database
 */

import { invokeLLM } from "../_core/llm";
import { db } from "../db";
import { botEvents, users } from "../../drizzle/schema";
import { eq } from "drizzle-orm";

export type BotRole = "creator" | "recruiter" | "field_operator" | "ambassador";
export type BotChannel = "telegram" | "whatsapp" | "web";

interface BotContext {
  userId: number;
  role: BotRole;
  location?: string; // Country code (US, DR, PR, etc.)
  language?: string; // en, es, ht
  accessLevel?: "basic" | "premium" | "vip";
  priorityTag?: string;
}

interface BotResponse {
  message: string;
  actions?: Array<{
    type: string;
    label: string;
    data: any;
  }>;
  metadata?: any;
}

/**
 * System prompts for each role
 */
const ROLE_PROMPTS: Record<BotRole, string> = {
  creator: `You are the CreatorVault AI assistant for CREATORS.

Your mission: Help creators monetize their content, optimize for virality, and build sustainable income.

TONE: Direct, empowering, results-focused (KingCam style)
FOCUS: Money-making actions, content optimization, audience growth
CAPABILITIES:
- Viral content analysis and optimization
- Multi-platform content repurposing
- Monetization strategy recommendations
- Analytics interpretation
- Product/course/service creation guidance

RULES:
- Always provide actionable next steps
- Focus on REAL money opportunities
- No fluff, no theory - only proven tactics
- Reference specific CreatorVault tools when relevant
- Encourage immediate action`,

  recruiter: `You are the CreatorVault AI assistant for RECRUITERS.

Your mission: Help recruiters build their network, close deals, and maximize commissions.

TONE: Confident, strategic, commission-focused
FOCUS: Lead generation, conversion scripts, commission tracking
CAPABILITIES:
- Recruitment script generation
- Lead qualification strategies
- Commission calculations
- Conversion optimization
- Leaderboard positioning tactics

RULES:
- Always show commission potential
- Provide specific scripts and templates
- Focus on conversion metrics
- Highlight top performer strategies
- Encourage competitive excellence`,

  field_operator: `You are the CreatorVault AI assistant for FIELD OPERATORS.

Your mission: Execute street-level recruitment and monetization in target locations.

TONE: Tactical, location-aware, action-oriented
FOCUS: Local opportunities, tourism monetization, immediate income actions
CAPABILITIES:
- Location-specific playbooks
- Tourism-driven monetization strategies
- Ambassador recruitment scripts
- Offline action checklists
- Cultural adaptation guidance

SPECIAL FOCUS - DOMINICAN REPUBLIC:
- Sosua, Puerto Plata, Santo Domingo strategies
- Tourist weekend scripts
- Chica ambassador onboarding
- Beach/nightlife recruitment tactics
- Immediate cash opportunities

RULES:
- Always provide location-specific actions
- Focus on TODAY's money opportunities
- Include offline checklists
- Respect cultural context
- Prioritize safety and legality`,

  ambassador: `You are the CreatorVault AI assistant for AMBASSADORS.

Your mission: Represent the brand, build community, and coordinate local events.

TONE: Charismatic, community-focused, brand-aligned
FOCUS: Brand representation, community building, event coordination
CAPABILITIES:
- Event planning and execution
- Community engagement strategies
- Brand messaging guidance
- Local influencer collaboration
- Social proof generation

RULES:
- Always align with CreatorVault brand values
- Focus on community growth
- Provide event templates and scripts
- Encourage authentic engagement
- Highlight success stories`
};

/**
 * Generate AI response based on role and context
 */
export async function generateBotResponse(
  context: BotContext,
  userMessage: string,
  conversationHistory?: Array<{ role: "user" | "assistant"; content: string }>
): Promise<BotResponse> {
  const systemPrompt = ROLE_PROMPTS[context.role];
  
  // Build context-aware system message
  let contextInfo = `\n\nUSER CONTEXT:\n`;
  contextInfo += `- Role: ${context.role.toUpperCase()}\n`;
  if (context.location) contextInfo += `- Location: ${context.location}\n`;
  if (context.language) contextInfo += `- Language: ${context.language}\n`;
  if (context.accessLevel) contextInfo += `- Access Level: ${context.accessLevel}\n`;
  if (context.priorityTag) contextInfo += `- Priority: ${context.priorityTag}\n`;

  // Build messages array
  const messages: Array<{ role: "system" | "user" | "assistant"; content: string }> = [
    { role: "system", content: systemPrompt + contextInfo }
  ];

  // Add conversation history if provided
  if (conversationHistory && conversationHistory.length > 0) {
    messages.push(...conversationHistory);
  }

  // Add current user message
  messages.push({ role: "user", content: userMessage });

  // Call LLM
  const response = await invokeLLM({
    messages,
    // Use structured output for action suggestions
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "bot_response",
        strict: true,
        schema: {
          type: "object",
          properties: {
            message: { 
              type: "string", 
              description: "The main response message to the user" 
            },
            actions: {
              type: "array",
              description: "Optional suggested actions the user can take",
              items: {
                type: "object",
                properties: {
                  type: { type: "string", description: "Action type (e.g., 'analyze_content', 'create_product')" },
                  label: { type: "string", description: "Button label for the action" },
                  data: { type: "object", description: "Action-specific data", additionalProperties: true }
                },
                required: ["type", "label", "data"],
                additionalProperties: false
              }
            },
            metadata: {
              type: "object",
              description: "Optional metadata for tracking or analytics",
              additionalProperties: true
            }
          },
          required: ["message"],
          additionalProperties: false
        }
      }
    }
  });

  const content = response.choices[0].message.content;
  if (!content || typeof content !== "string") {
    throw new Error("No valid response from LLM");
  }

  const parsed = JSON.parse(content) as BotResponse;

  // Log interaction to database
  await logBotEvent({
    userId: context.userId,
    channel: "web", // Will be overridden by caller if different
    eventType: "ai_chat",
    eventData: {
      role: context.role,
      userMessage,
      botResponse: parsed.message,
      actions: parsed.actions,
      location: context.location,
      language: context.language
    }
  });

  return parsed;
}

/**
 * Generate onboarding plan based on role and day
 */
export async function generateOnboardingPlan(
  context: BotContext,
  day: 1 | 2 | 7
): Promise<{
  plan: string;
  tasks: Array<{ title: string; description: string; priority: "high" | "medium" | "low" }>;
  questions?: Array<{ question: string; purpose: string }>;
}> {
  const systemPrompt = `You are generating a Day ${day} onboarding plan for a ${context.role} in CreatorVault.

REQUIREMENTS:
- Provide 3-5 specific, actionable tasks
- Each task must be completable TODAY
- Focus on quick wins and momentum building
- Include specific CreatorVault features to use
- Adapt to location: ${context.location || "global"}

${day === 1 ? "Day 1 focus: Account setup, first actions, quick wins" : ""}
${day === 2 ? "Day 2 focus: Deeper engagement, first results, skill building" : ""}
${day === 7 ? "Day 7 focus: Optimization, scaling, advanced features" : ""}`;

  const response = await invokeLLM({
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: `Generate Day ${day} onboarding plan` }
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "onboarding_plan",
        strict: true,
        schema: {
          type: "object",
          properties: {
            plan: { type: "string", description: "Overview of the day's focus" },
            tasks: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  title: { type: "string" },
                  description: { type: "string" },
                  priority: { type: "string", enum: ["high", "medium", "low"] }
                },
                required: ["title", "description", "priority"],
                additionalProperties: false
              }
            },
            questions: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  question: { type: "string" },
                  purpose: { type: "string" }
                },
                required: ["question", "purpose"],
                additionalProperties: false
              }
            }
          },
          required: ["plan", "tasks"],
          additionalProperties: false
        }
      }
    }
  });

  const content = response.choices[0].message.content;
  if (!content || typeof content !== "string") {
    throw new Error("No valid response from LLM");
  }

  const parsed = JSON.parse(content);

  // Log onboarding plan generation
  await logBotEvent({
    userId: context.userId,
    channel: "web",
    eventType: "onboarding_plan_generated",
    eventData: {
      role: context.role,
      day,
      plan: parsed.plan,
      taskCount: parsed.tasks.length
    }
  });

  return parsed;
}

/**
 * Generate role-specific scripts
 */
export async function generateScript(
  context: BotContext,
  scriptType: "recruitment" | "sales" | "onboarding" | "support",
  customization?: {
    targetAudience?: string;
    platform?: string;
    goal?: string;
  }
): Promise<{
  script: string;
  variations: string[];
  tips: string[];
}> {
  const systemPrompt = `Generate a ${scriptType} script for a ${context.role} in CreatorVault.

REQUIREMENTS:
- Write in ${context.language || "English"}
- Adapt to location: ${context.location || "global"}
- Use KingCam tone: direct, confident, results-focused
- Include specific value propositions
- Provide 2-3 variations for A/B testing
- Add practical tips for delivery

${customization?.targetAudience ? `Target audience: ${customization.targetAudience}` : ""}
${customization?.platform ? `Platform: ${customization.platform}` : ""}
${customization?.goal ? `Goal: ${customization.goal}` : ""}`;

  const response = await invokeLLM({
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: `Generate ${scriptType} script` }
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "script_generation",
        strict: true,
        schema: {
          type: "object",
          properties: {
            script: { type: "string", description: "Main script" },
            variations: {
              type: "array",
              items: { type: "string" },
              description: "Alternative versions for A/B testing"
            },
            tips: {
              type: "array",
              items: { type: "string" },
              description: "Delivery tips and best practices"
            }
          },
          required: ["script", "variations", "tips"],
          additionalProperties: false
        }
      }
    }
  });

  const content = response.choices[0].message.content;
  if (!content || typeof content !== "string") {
    throw new Error("No valid response from LLM");
  }

  const parsed = JSON.parse(content);

  // Log script generation
  await logBotEvent({
    userId: context.userId,
    channel: "web",
    eventType: "script_generated",
    eventData: {
      role: context.role,
      scriptType,
      customization,
      variationCount: parsed.variations.length
    }
  });

  return parsed;
}

/**
 * Log bot event to database
 */
export async function logBotEvent(event: {
  userId: number;
  channel: BotChannel;
  eventType: string;
  eventData: any;
  outcome?: string;
}) {
  await db.insert(botEvents).values({
    userId: event.userId,
    channel: event.channel,
    eventType: event.eventType,
    eventData: event.eventData,
    outcome: event.outcome || "success",
    createdAt: new Date()
  });
}

/**
 * Get user's bot interaction history
 */
export async function getBotHistory(userId: number, limit: number = 50) {
  return await db
    .select()
    .from(botEvents)
    .where(eq(botEvents.userId, userId))
    .orderBy(botEvents.createdAt)
    .limit(limit);
}

/**
 * Get user context for bot interactions
 */
export async function getUserContext(userId: number): Promise<BotContext | null> {
  const user = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  
  if (user.length === 0) {
    return null;
  }

  const userData = user[0];
  
  // Map user role to bot role
  let botRole: BotRole = "creator";
  if (userData.role === "creator") botRole = "creator";
  else if (userData.role === "admin" || userData.role === "king") botRole = "field_operator";
  // Add logic to detect recruiter/ambassador based on other fields
  
  return {
    userId: userData.id,
    role: botRole,
    location: userData.country || undefined,
    language: userData.language || "en",
    accessLevel: "basic" // TODO: Implement access level logic
  };
}
