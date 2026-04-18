import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import OpenAI from "openai";
import * as db from "../db";
import { eq, desc } from "drizzle-orm";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export const cloneLabRouter = router({
  getClones: protectedProcedure.query(async ({ ctx }) => {
    const clones = await db.db.select().from(db.schema.creators).where(eq(db.schema.creators.userId, ctx.user.id)).limit(10);
    return clones;
  }),
  createClone: protectedProcedure.input(z.object({
    name: z.string(), niche: z.string(), personality: z.string(), platforms: z.array(z.string()),
  })).mutation(async ({ ctx, input }) => {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: `Create an AI clone profile for ${input.name} in ${input.niche} niche with ${input.personality} personality for ${input.platforms.join(", ")}. Include: bio, content style, posting schedule, and monetization strategy.` }],
      max_tokens: 500,
    });
    const [clone] = await db.db.insert(db.schema.creators).values({
      userId: ctx.user.id, name: input.name, niche: input.niche, platform: input.platforms[0],
      aiProfile: completion.choices[0].message.content || "", status: "active", createdAt: new Date(),
    }).$returningId();
    return { id: clone.id, name: input.name, profile: completion.choices[0].message.content };
  }),
  trainClone: protectedProcedure.input(z.object({ cloneId: z.number(), trainingData: z.string() })).mutation(async ({ input }) => {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: `Analyze this creator content and extract their unique voice, style, and patterns:

${input.trainingData}

Create a detailed style guide for an AI clone.` }],
      max_tokens: 600,
    });
    return { cloneId: input.cloneId, styleGuide: completion.choices[0].message.content };
  }),
  generateCloneContent: protectedProcedure.input(z.object({ cloneId: z.number(), platform: z.string(), topic: z.string() })).mutation(async ({ input }) => {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: `Generate authentic ${input.platform} content about "${input.topic}" for clone ID ${input.cloneId}. Make it platform-native and engaging.` }],
      max_tokens: 400,
    });
    return { content: completion.choices[0].message.content, platform: input.platform };
  }),
});
