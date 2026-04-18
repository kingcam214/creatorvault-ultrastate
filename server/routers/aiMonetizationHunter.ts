import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export const aiMonetizationHunter = router({
  huntOpportunities: protectedProcedure.input(z.object({
    niche: z.string(), platform: z.string(), followers: z.number(), engagementRate: z.number(),
  })).mutation(async ({ input }) => {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: `Hunt monetization opportunities for:
Niche: ${input.niche}
Platform: ${input.platform}
Followers: ${input.followers.toLocaleString()}
Engagement: ${input.engagementRate}%

Find: 10 specific monetization opportunities ranked by potential revenue, effort required, and time to first dollar.` }],
      max_tokens: 700,
    });
    return { opportunities: completion.choices[0].message.content };
  }),
  calculateRevenuePotential: protectedProcedure.input(z.object({ followers: z.number(), niche: z.string(), platforms: z.array(z.string()) })).mutation(async ({ input }) => {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: `Calculate realistic revenue potential for a ${input.niche} creator with ${input.followers.toLocaleString()} followers on ${input.platforms.join(", ")}. Break down by revenue stream with conservative, realistic, and optimistic projections.` }],
      max_tokens: 500,
    });
    return { projection: completion.choices[0].message.content };
  }),
  createMonetizationPlan: protectedProcedure.input(z.object({ goal: z.string(), timeframe: z.string(), currentRevenue: z.number() })).mutation(async ({ input }) => {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: `Create a monetization plan to achieve ${input.goal} in ${input.timeframe} starting from $${input.currentRevenue}/mo. Include specific actions, timelines, and revenue milestones.` }],
      max_tokens: 600,
    });
    return { plan: completion.choices[0].message.content };
  }),
});

export const aiMonetizationHunterRouter = aiMonetizationHunter;
