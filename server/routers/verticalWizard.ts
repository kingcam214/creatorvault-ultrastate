import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import OpenAI from "openai";
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
export const verticalWizard = router({
  buildVertical: protectedProcedure.input(z.object({ niche: z.string(), platform: z.string(), goal: z.string() })).mutation(async ({ input }) => {
    const c = await openai.chat.completions.create({ model: "gpt-4o-mini", messages: [{ role: "user", content: `Build a complete vertical content strategy for ${input.niche} on ${input.platform}:
Goal: ${input.goal}

Create: content pillars, posting cadence, format mix, growth tactics, and monetization path.` }], max_tokens: 600 });
    return { strategy: c.choices[0].message.content };
  }),
  getVerticalTemplates: protectedProcedure.query(async () => ({ verticals: [{ id: "fitness", name: "Fitness & Health" }, { id: "business", name: "Business & Finance" }, { id: "entertainment", name: "Entertainment" }, { id: "education", name: "Education" }, { id: "lifestyle", name: "Lifestyle" }] })),
  analyzeVertical: protectedProcedure.input(z.object({ vertical: z.string(), competitors: z.array(z.string()) })).mutation(async ({ input }) => {
    const c = await openai.chat.completions.create({ model: "gpt-4o-mini", messages: [{ role: "user", content: `Analyze the ${input.vertical} vertical with competitors: ${input.competitors.join(", ")}. Identify: market gaps, winning content types, audience pain points, and differentiation opportunities.` }], max_tokens: 500 });
    return { analysis: c.choices[0].message.content };
  }),
});
export const verticalWizardRouter = verticalWizard;
