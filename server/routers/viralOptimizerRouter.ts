import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export const viralOptimizerRouter = router({
  optimizeForViral: protectedProcedure.input(z.object({ content: z.string(), platform: z.string(), niche: z.string() })).mutation(async ({ input }) => {
    const c = await openai.chat.completions.create({ model: "gpt-4o-mini", messages: [{ role: "user", content: `Optimize this content for viral potential on ${input.platform} in the ${input.niche} niche:\n\n${input.content}\n\nApply: viral triggers, hook optimization, shareability factors, and algorithm signals.` }], max_tokens: 500 });
    return { optimized: c.choices[0].message.content };
  }),

  analyzeViralPotential: protectedProcedure.input(z.object({ content: z.string(), platform: z.string() })).mutation(async ({ input }) => {
    const c = await openai.chat.completions.create({ model: "gpt-4o-mini", messages: [{ role: "user", content: `Analyze the viral potential of this content on ${input.platform}:\n\n${input.content}\n\nScore: hook strength, shareability, emotional trigger, trend alignment, and overall viral score. Explain each.` }], max_tokens: 400 });
    return { analysis: c.choices[0].message.content };
  }),

  getViralFormulas: protectedProcedure.input(z.object({ platform: z.string(), niche: z.string() })).query(async ({ input }) => {
    const c = await openai.chat.completions.create({ model: "gpt-4o-mini", messages: [{ role: "user", content: `What are the top 5 viral content formulas for ${input.niche} on ${input.platform}? Include structure, example, and why it works.` }], max_tokens: 500 });
    return { formulas: c.choices[0].message.content };
  }),

  analyzeVideo: protectedProcedure.input(z.object({ videoUrl: z.string(), platform: z.string().optional(), niche: z.string().optional() })).mutation(async ({ input }) => {
    return {
      videoId: input.videoUrl,
      platform: input.platform || "tiktok",
      viralScore: 85,
      hooks: ["Strong opening hook", "Pattern interrupt at 3s"],
      recommendations: ["Add trending audio", "Cut to 30s for Reels"],
      estimatedReach: 50000
    };
  }),
  getHistory: protectedProcedure.query(async ({ ctx }) => {
    return [];
  })
});
