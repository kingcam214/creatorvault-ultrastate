/**
 * Content Generation Demo Service
 * 
 * Real-time content generation for live demos
 */

import { generateImage } from "../_core/imageGeneration";
import { invokeLLM } from "../_core/llm";

export interface GeneratedContent {
  type: "video" | "thumbnail" | "caption" | "script";
  url?: string;
  text?: string;
  generatedAt: Date;
}

/**
 * Generate viral video concept for creator
 */
export async function generateViralVideoConcept(
  creatorHandle: string,
  contentStyle: string,
  platform: string
): Promise<GeneratedContent> {
  // Generate video concept using LLM
  const response = await invokeLLM({
    messages: [
      {
        role: "system",
        content: "You are a viral content strategist. Generate a specific, actionable video concept that will go viral.",
      },
      {
        role: "user",
        content: `Generate a viral video concept for @${creatorHandle}, a ${contentStyle} creator on ${platform}. Include:
1. Hook (first 3 seconds)
2. Main content structure
3. Call to action
4. Why it will go viral

Format as a short, punchy script.`,
      },
    ],
  });

  const script = response.choices[0].message.content;

  return {
    type: "script",
    text: script,
    generatedAt: new Date(),
  };
}

/**
 * Generate thumbnail for creator's content
 */
export async function generateThumbnail(
  creatorHandle: string,
  contentStyle: string,
  videoTitle: string
): Promise<GeneratedContent> {
  const prompt = `Create a viral YouTube thumbnail for "${videoTitle}" by @${creatorHandle}. Style: ${contentStyle}. High contrast, bold text, eye-catching composition. Professional quality, 16:9 aspect ratio.`;

  const { url } = await generateImage({ prompt });

  return {
    type: "thumbnail",
    url,
    generatedAt: new Date(),
  };
}

/**
 * Generate viral caption for social media post
 */
export async function generateViralCaption(
  creatorHandle: string,
  contentStyle: string,
  platform: string,
  postTopic: string
): Promise<GeneratedContent> {
  const response = await invokeLLM({
    messages: [
      {
        role: "system",
        content: "You are a viral social media copywriter. Write captions that drive engagement.",
      },
      {
        role: "user",
        content: `Write a viral ${platform} caption for @${creatorHandle} (${contentStyle} creator) about: ${postTopic}

Requirements:
- Hook in first line
- Include relevant hashtags
- Call to action
- ${platform === "instagram" ? "2200 chars max" : platform === "tiktok" ? "150 chars max" : "280 chars max"}`,
      },
    ],
  });

  const caption = response.choices[0].message.content;

  return {
    type: "caption",
    text: caption,
    generatedAt: new Date(),
  };
}

/**
 * Generate content calendar for creator
 */
export async function generateContentCalendar(
  creatorHandle: string,
  contentStyle: string,
  platform: string,
  daysCount: number = 7
): Promise<{
  calendar: Array<{
    day: string;
    contentIdea: string;
    hook: string;
    hashtags: string[];
  }>;
}> {
  const response = await invokeLLM({
    messages: [
      {
        role: "system",
        content: "You are a content strategist. Create viral content calendars.",
      },
      {
        role: "user",
        content: `Create a ${daysCount}-day content calendar for @${creatorHandle}, a ${contentStyle} creator on ${platform}.

For each day, provide:
1. Content idea (one sentence)
2. Hook (first 3 seconds)
3. 3-5 relevant hashtags

Format as JSON array.`,
      },
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "content_calendar",
        strict: true,
        schema: {
          type: "object",
          properties: {
            calendar: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  day: { type: "string" },
                  contentIdea: { type: "string" },
                  hook: { type: "string" },
                  hashtags: {
                    type: "array",
                    items: { type: "string" },
                  },
                },
                required: ["day", "contentIdea", "hook", "hashtags"],
                additionalProperties: false,
              },
            },
          },
          required: ["calendar"],
          additionalProperties: false,
        },
      },
    },
  });

  const result = JSON.parse(response.choices[0].message.content);
  return result;
}

/**
 * Optimize existing content for virality
 */
export async function optimizeContentForVirality(
  originalCaption: string,
  contentStyle: string,
  platform: string
): Promise<{
  optimizedCaption: string;
  improvements: string[];
  viralityScore: number;
}> {
  const response = await invokeLLM({
    messages: [
      {
        role: "system",
        content: "You are a viral content optimizer. Analyze and improve content for maximum engagement.",
      },
      {
        role: "user",
        content: `Optimize this ${platform} caption for virality:

"${originalCaption}"

Content style: ${contentStyle}

Provide:
1. Optimized caption
2. List of improvements made
3. Virality score (0-100)

Format as JSON.`,
      },
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "content_optimization",
        strict: true,
        schema: {
          type: "object",
          properties: {
            optimizedCaption: { type: "string" },
            improvements: {
              type: "array",
              items: { type: "string" },
            },
            viralityScore: { type: "number" },
          },
          required: ["optimizedCaption", "improvements", "viralityScore"],
          additionalProperties: false,
        },
      },
    },
  });

  const result = JSON.parse(response.choices[0].message.content);
  return result;
}
