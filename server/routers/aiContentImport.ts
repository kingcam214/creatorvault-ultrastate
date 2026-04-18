import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import OpenAI from "openai";
import * as db from "../db";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export const aiContentImportRouter = router({
  analyzeExternalContent: protectedProcedure.input(z.object({
    url: z.string().url().optional(),
    rawText: z.string().optional(),
    platform: z.string().optional(),
  })).mutation(async ({ input }) => {
    const content = input.rawText || `Content from ${input.url}`;
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{
        role: "user",
        content: `Analyze this content and extract key insights for repurposing:
${content}

Return: 1) Main topic/theme, 2) Key points (bullet list), 3) Best repurposing formats, 4) Suggested platforms, 5) Estimated engagement potential (1-10).`,
      }],
      max_tokens: 500,
    });
    return { analysis: completion.choices[0].message.content, source: input.url || "manual" };
  }),

  importAndTransform: protectedProcedure.input(z.object({
    content: z.string(),
    targetPlatform: z.string(),
    targetFormat: z.enum(["post", "thread", "video_script", "email", "story"]),
  })).mutation(async ({ ctx, input }) => {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{
        role: "user",
        content: `Transform this content into a ${input.targetFormat} for ${input.targetPlatform}:

${input.content}

Make it platform-native, engaging, and optimized for the format.`,
      }],
      max_tokens: 600,
    });
    
    await db.db.insert(db.schema.content).values({
      userId: ctx.user.id,
      type: input.targetFormat,
      platform: input.targetPlatform,
      body: completion.choices[0].message.content || "",
      status: "draft",
      createdAt: new Date(),
    });
    
    return { transformed: completion.choices[0].message.content };
  }),
});
