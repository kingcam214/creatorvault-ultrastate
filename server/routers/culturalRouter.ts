import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import OpenAI from "openai";
import * as db from "../db";
import { eq, desc } from "drizzle-orm";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export const culturalRouter = router({
  getCulturalContent: protectedProcedure.query(async ({ ctx }) => {
    const content = await db.db.select()
      .from(db.schema.culturalContentTemplates)
      .limit(20);
    return content;
  }),

  generateCulturalContent: protectedProcedure.input(z.object({
    culture: z.string(),
    contentType: z.string(),
    occasion: z.string().optional(),
    language: z.string().default("english"),
  })).mutation(async ({ input }) => {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{
        role: "user",
        content: `Create culturally authentic ${input.contentType} content for ${input.culture} culture${input.occasion ? ` for ${input.occasion}` : ""}. Language: ${input.language}. Be respectful, authentic, and engaging.`,
      }],
      max_tokens: 500,
    });
    return { content: completion.choices[0].message.content };
  }),

  translateContent: protectedProcedure.input(z.object({
    content: z.string(),
    targetLanguage: z.string(),
    culturalAdaptation: z.boolean().default(true),
  })).mutation(async ({ input }) => {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{
        role: "user",
        content: `Translate and ${input.culturalAdaptation ? "culturally adapt" : "directly translate"} this content to ${input.targetLanguage}:

${input.content}`,
      }],
      max_tokens: 500,
    });
    return { translated: completion.choices[0].message.content };
  }),
});
