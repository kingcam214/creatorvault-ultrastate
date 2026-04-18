import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import OpenAI from "openai";
import * as db from "../db";
import { eq, desc } from "drizzle-orm";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export const cloneSuccessSystemRouter = router({
  getClonePerformance: protectedProcedure.query(async ({ ctx }) => {
    const clones = await db.db.select()
      .from(db.schema.creators)
      .where(eq(db.schema.creators.userId, ctx.user.id))
      .limit(10);
    return { clones, totalClones: clones.length };
  }),

  optimizeClone: protectedProcedure.input(z.object({
    cloneId: z.number(),
    currentMetrics: z.object({
      followers: z.number(),
      engagement: z.number(),
      revenue: z.number(),
    }),
    platform: z.string(),
  })).mutation(async ({ input }) => {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{
        role: "user",
        content: `Optimize this AI clone's performance on ${input.platform}:
Followers: ${input.currentMetrics.followers}
Engagement: ${input.currentMetrics.engagement}%
Revenue: $${input.currentMetrics.revenue}/mo

Provide: 3 immediate improvements, content strategy adjustments, and 30-day growth target.`,
      }],
      max_tokens: 500,
    });
    return { optimization: completion.choices[0].message.content };
  }),

  buildSuccessBlueprint: protectedProcedure.input(z.object({
    niche: z.string(),
    platform: z.string(),
    goal: z.string(),
  })).mutation(async ({ input }) => {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{
        role: "user",
        content: `Build a clone success blueprint for ${input.niche} on ${input.platform}:
Goal: ${input.goal}

Create a 90-day success system with weekly milestones, content formula, monetization timeline, and scaling strategy.`,
      }],
      max_tokens: 600,
    });
    return { blueprint: completion.choices[0].message.content };
  }),
});
