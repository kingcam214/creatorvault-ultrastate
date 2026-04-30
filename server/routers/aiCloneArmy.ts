import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import OpenAI from "openai";
import * as db from "../db";
import { eq, desc } from "drizzle-orm";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export const aiCloneArmyRouter = router({
  getClones: protectedProcedure.query(async ({ ctx }) => {
    const clones = await db.db.select()
      .from(db.schema.creators)
      .where(eq(db.schema.creators.userId, ctx.user.id))
      .orderBy(desc(db.schema.creators.createdAt))
      .limit(20);
    return clones;
  }),

  deployClone: protectedProcedure.input(z.object({
    cloneName: z.string(),
    platform: z.string(),
    niche: z.string(),
    voiceStyle: z.string(),
    contentFrequency: z.enum(["daily", "3x_week", "weekly"]),
  })).mutation(async ({ ctx, input }) => {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{
        role: "user",
        content: `Create a 7-day content calendar for an AI clone creator:
Name: ${input.cloneName}
Platform: ${input.platform}
Niche: ${input.niche}
Voice: ${input.voiceStyle}
Frequency: ${input.contentFrequency}

Generate specific post ideas with hooks, captions, and CTAs for each day.`,
      }],
      max_tokens: 800,
    });
    return {
      cloneName: input.cloneName,
      contentCalendar: completion.choices[0].message.content,
      deployedAt: new Date().toISOString(),
    };
  }),

  generateCloneContent: protectedProcedure.input(z.object({
    cloneId: z.number().optional(),
    topic: z.string(),
    platform: z.string(),
    count: z.number().min(1).max(10).default(3),
  })).mutation(async ({ input }) => {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{
        role: "user",
        content: `Generate ${input.count} unique ${input.platform} posts about "${input.topic}". Each should have a different angle, hook, and CTA. Format as numbered list.`,
      }],
      max_tokens: 600,
    });
    return { posts: completion.choices[0].message.content };
  }),
  createWritingClone: protectedProcedure.input(z.object({
    name: z.string(),
    style: z.string(),
    sampleContent: z.string().optional(),
  })).mutation(async ({ ctx, input }) => {
    const { OpenAI } = await import("openai");
    const openai = new OpenAI();
    const c = await openai.chat.completions.create({
      model: "gpt-4.1-mini",
      messages: [
        { role: "system", content: "You are a writing clone creator. Create a detailed writing persona profile." },
        { role: "user", content: `Create a writing clone named "${input.name}" with style: ${input.style}${input.sampleContent ? `\nBased on: ${input.sampleContent.slice(0, 500)}` : ""}` }
      ],
      max_tokens: 600,
    });
    return { cloneId: `clone-${Date.now()}`, name: input.name, profile: c.choices[0].message.content ?? "", style: input.style };
  })
});
