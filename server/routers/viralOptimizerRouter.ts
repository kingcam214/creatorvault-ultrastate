import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import OpenAI from "openai";
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
export const viralOptimizerRouter = router({
  optimizeForViral: protectedProcedure.input(z.object({ content: z.string(), platform: z.string(), niche: z.string() })).mutation(async ({ input }) => {
    const c = await openai.chat.completions.create({ model: "gpt-4o-mini", messages: [{ role: "user", content: `Optimize this content for maximum virality on ${input.platform} in ${input.niche}:

${input.content}

Apply: viral triggers, hook optimization, shareability factors, and algorithm signals.` }], max_tokens: 500 });
    return { optimized: c.choices[0].message.content };
  }),
  analyzeViralPotential: protectedProcedure.input(z.object({ content: z.string(), platform: z.string() })).mutation(async ({ input }) => {
    const c = await openai.chat.completions.create({ model: "gpt-4o-mini", messages: [{ role: "user", content: `Score the viral potential of this ${input.platform} content (1-10):
${input.content}

Score: hook strength, shareability, emotional trigger, trend alignment, and overall viral score. Explain each.` }], max_tokens: 400 });
    return { analysis: c.choices[0].message.content };
  }),
  getViralFormulas: protectedProcedure.input(z.object({ platform: z.string(), niche: z.string() })).query(async ({ input }) => {
    const c = await openai.chat.completions.create({ model: "gpt-4o-mini", messages: [{ role: "user", content: `What are the top 5 viral content formulas for ${input.niche} on ${input.platform}? Include structure, example, and why it works.` }], max_tokens: 500 });
    return { formulas: c.choices[0].message.content };
  }),
});