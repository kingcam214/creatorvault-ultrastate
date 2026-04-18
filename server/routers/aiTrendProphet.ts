import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export const aiTrendProphet = router({
  predictTrends: protectedProcedure.input(z.object({
    niche: z.string(), platform: z.string(), timeframe: z.enum(["week", "month", "quarter"]),
  })).mutation(async ({ input }) => {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: `Predict upcoming trends for ${input.niche} on ${input.platform} over the next ${input.timeframe}:

Based on current patterns, predict: 5 rising trends, 3 declining trends, 2 emerging formats, and the single biggest opportunity to capitalize on right now.` }],
      max_tokens: 600,
    });
    return { predictions: completion.choices[0].message.content, timeframe: input.timeframe };
  }),
  analyzeTrend: protectedProcedure.input(z.object({ trend: z.string(), niche: z.string() })).mutation(async ({ input }) => {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: `Analyze the trend "${input.trend}" for a ${input.niche} creator:
1. Is this trend rising or declining?
2. How to capitalize on it NOW
3. Content ideas to ride this trend
4. Expected lifespan
5. Monetization angle` }],
      max_tokens: 500,
    });
    return { analysis: completion.choices[0].message.content };
  }),
  getTrendingTopics: protectedProcedure.input(z.object({ niche: z.string(), platform: z.string() })).query(async ({ input }) => {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: `List 10 trending topics right now for ${input.niche} on ${input.platform}. For each: topic name, trend score (1-10), and one content idea.` }],
      max_tokens: 400,
    });
    return { topics: completion.choices[0].message.content };
  }),
});

export const aiTrendProphetRouter = aiTrendProphet;
