import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export const aiAffiliateOptimizer = router({
  optimizeAffiliateLinks: protectedProcedure.input(z.object({
    product: z.string(), platform: z.string(), audience: z.string(), currentConversion: z.number().optional(),
  })).mutation(async ({ input }) => {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: `Optimize affiliate marketing for ${input.product} on ${input.platform} for ${input.audience} audience. Current conversion: ${input.currentConversion || 0}%. Provide: placement strategy, CTA optimization, content integration tips, and expected conversion improvement.` }],
      max_tokens: 500,
    });
    return { optimization: completion.choices[0].message.content };
  }),
  findAffiliateOpportunities: protectedProcedure.input(z.object({ niche: z.string(), platforms: z.array(z.string()) })).mutation(async ({ input }) => {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: `Find the best affiliate opportunities for a ${input.niche} creator on ${input.platforms.join(", ")}. List top 10 programs with commission rates, cookie duration, and fit score.` }],
      max_tokens: 600,
    });
    return { opportunities: completion.choices[0].message.content };
  }),
  generateAffiliateContent: protectedProcedure.input(z.object({ product: z.string(), platform: z.string(), style: z.string() })).mutation(async ({ input }) => {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: `Write a ${input.style} affiliate promotion for ${input.product} on ${input.platform}. Make it authentic, not salesy, and include a natural CTA.` }],
      max_tokens: 300,
    });
    return { content: completion.choices[0].message.content };
  }),
});

export const aiAffiliateOptimizerRouter = aiAffiliateOptimizer;
