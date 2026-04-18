import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export const aiPlatformDominatorRouter = router({
  buildDominationStrategy: protectedProcedure.input(z.object({
    platform: z.string(),
    niche: z.string(),
    currentFollowers: z.number().optional(),
    targetFollowers: z.number(),
    timeframe: z.string(),
  })).mutation(async ({ input }) => {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{
        role: "user",
        content: `Build a platform domination strategy:
Platform: ${input.platform}
Niche: ${input.niche}
Current: ${input.currentFollowers || 0} followers
Target: ${input.targetFollowers} followers
Timeframe: ${input.timeframe}

Create: 1) Content pillars (3-5), 2) Posting schedule, 3) Algorithm exploitation tactics, 4) Collaboration strategy, 5) Viral content formula for this platform.`,
      }],
      max_tokens: 800,
    });
    return { strategy: completion.choices[0].message.content };
  }),

  analyzeCompetitors: protectedProcedure.input(z.object({
    platform: z.string(),
    niche: z.string(),
    competitorHandles: z.array(z.string()).optional(),
  })).mutation(async ({ input }) => {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{
        role: "user",
        content: `Analyze the competitive landscape on ${input.platform} in the ${input.niche} niche. Identify: gaps in the market, underserved content types, positioning opportunities, and how to differentiate and dominate.`,
      }],
      max_tokens: 600,
    });
    return { analysis: completion.choices[0].message.content };
  }),
});
