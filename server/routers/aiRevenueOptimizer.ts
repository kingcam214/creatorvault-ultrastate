import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import OpenAI from "openai";
import * as db from "../db";
import { eq } from "drizzle-orm";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export const aiRevenueOptimizer = router({
  optimizeRevenue: protectedProcedure.input(z.object({
    currentRevenue: z.number(), revenueStreams: z.array(z.object({ name: z.string(), amount: z.number() })), goal: z.number(),
  })).mutation(async ({ input }) => {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: `Optimize revenue from $${input.currentRevenue}/mo to $${input.goal}/mo:
Current streams: ${JSON.stringify(input.revenueStreams)}

Provide: optimization for each stream, new streams to add, pricing adjustments, and 90-day action plan.` }],
      max_tokens: 700,
    });
    return { optimization: completion.choices[0].message.content };
  }),
  analyzePricingStrategy: protectedProcedure.input(z.object({ product: z.string(), currentPrice: z.number(), audience: z.string(), competitors: z.array(z.object({ name: z.string(), price: z.number() })) })).mutation(async ({ input }) => {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: `Analyze pricing for ${input.product} at $${input.currentPrice} for ${input.audience}:
Competitors: ${JSON.stringify(input.competitors)}

Recommend: optimal price point, pricing psychology to apply, packaging options, and upsell strategy.` }],
      max_tokens: 500,
    });
    return { analysis: completion.choices[0].message.content };
  }),
  generateUpsellStrategy: protectedProcedure.input(z.object({ mainProduct: z.string(), price: z.number(), customerType: z.string() })).mutation(async ({ input }) => {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: `Create an upsell strategy for ${input.mainProduct} ($${input.price}) for ${input.customerType} customers. Include: upsell offers, timing, copy, and expected conversion rates.` }],
      max_tokens: 500,
    });
    return { strategy: completion.choices[0].message.content };
  }),
});

export const aiRevenueOptimizerRouter = aiRevenueOptimizer;
