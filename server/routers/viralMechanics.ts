import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import OpenAI from "openai";
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
export const viralMechanics = router({
  analyzeViralMechanics: protectedProcedure.input(z.object({ content: z.string(), platform: z.string() })).mutation(async ({ input }) => {
    const c = await openai.chat.completions.create({ model: "gpt-4o-mini", messages: [{ role: "user", content: `Analyze the viral mechanics of this ${input.platform} content:
${input.content}

Break down: emotional triggers, social currency, practical value, shareability, and timing factors.` }], max_tokens: 500 });
    return { mechanics: c.choices[0].message.content };
  }),
  getViralTriggers: protectedProcedure.input(z.object({ niche: z.string() })).query(async ({ input }) => {
    const c = await openai.chat.completions.create({ model: "gpt-4o-mini", messages: [{ role: "user", content: `List the top 7 viral triggers for ${input.niche} content. For each: trigger name, why it works, and example application.` }], max_tokens: 400 });
    return { triggers: c.choices[0].message.content };
  }),
  buildViralLoop: protectedProcedure.input(z.object({ product: z.string(), audience: z.string() })).mutation(async ({ input }) => {
    const c = await openai.chat.completions.create({ model: "gpt-4o-mini", messages: [{ role: "user", content: `Design a viral loop for ${input.product} targeting ${input.audience}. Include: trigger, action, reward, and investment stages.` }], max_tokens: 400 });
    return { loop: c.choices[0].message.content };
  }),
});
export const viralMechanicsRouter = viralMechanics;
