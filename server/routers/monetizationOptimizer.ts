import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export const monetizationOptimizer = router({
  optimizeMonetization: protectedProcedure.input(z.object({
    platform: z.string(), followers: z.number(), niche: z.string(), currentMethods: z.array(z.string()),
  })).mutation(async ({ input }) => {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: `Optimize monetization for ${input.niche} creator on ${input.platform} with ${input.followers.toLocaleString()} followers:
Current methods: ${input.currentMethods.join(", ")}

Identify: underutilized opportunities, optimization for existing methods, new revenue streams, and 30-day action plan.` }],
      max_tokens: 600,
    });
    return { optimization: completion.choices[0].message.content };
  }),
  getMonetizationScore: protectedProcedure.input(z.object({ methods: z.array(z.string()), revenue: z.number(), followers: z.number() })).mutation(async ({ input }) => {
    const rpmEstimate = input.followers > 0 ? (input.revenue / input.followers) * 1000 : 0;
    return { score: Math.min(100, Math.floor(rpmEstimate * 10)), rpm: rpmEstimate.toFixed(2), grade: rpmEstimate > 5 ? "A" : rpmEstimate > 2 ? "B" : rpmEstimate > 1 ? "C" : "D" };
  }),
  buildMonetizationStack: protectedProcedure.input(z.object({ niche: z.string(), audience: z.string(), goal: z.number() })).mutation(async ({ input }) => {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: `Build a monetization stack for a ${input.niche} creator targeting ${input.audience} with a $${input.goal}/month goal:

Design: primary revenue stream, secondary streams, passive income layer, and scaling path.` }],
      max_tokens: 600,
    });
    return { stack: completion.choices[0].message.content };
  }),
});

export const monetizationOptimizerRouter = monetizationOptimizer;
