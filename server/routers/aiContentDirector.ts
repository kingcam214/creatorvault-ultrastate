import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import OpenAI from "openai";
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
export const aiContentDirector = router({
  directContent: protectedProcedure.input(z.object({ brand: z.string(), goal: z.string(), platforms: z.array(z.string()), budget: z.string() })).mutation(async ({ input }) => {
    const c = await openai.chat.completions.create({ model: "gpt-4o-mini", messages: [{ role: "user", content: `Direct a content strategy for ${input.brand}:
Goal: ${input.goal}
Platforms: ${input.platforms.join(", ")}
Budget: ${input.budget}

Create: content calendar, format mix, production schedule, and KPIs.` }], max_tokens: 700 });
    return { strategy: c.choices[0].message.content };
  }),
  generateContentBrief: protectedProcedure.input(z.object({ type: z.string(), topic: z.string(), audience: z.string() })).mutation(async ({ input }) => {
    const c = await openai.chat.completions.create({ model: "gpt-4o-mini", messages: [{ role: "user", content: `Write a content brief for a ${input.type} about "${input.topic}" for ${input.audience}. Include: objective, key messages, tone, format specs, and success metrics.` }], max_tokens: 500 });
    return { brief: c.choices[0].message.content };
  }),
  reviewContent: protectedProcedure.input(z.object({ content: z.string(), criteria: z.array(z.string()) })).mutation(async ({ input }) => {
    const c = await openai.chat.completions.create({ model: "gpt-4o-mini", messages: [{ role: "user", content: `Review this content against criteria: ${input.criteria.join(", ")}:

${input.content}

Score each criterion and provide specific improvement suggestions.` }], max_tokens: 500 });
    return { review: c.choices[0].message.content };
  }),
});
export const aiContentDirectorRouter = aiContentDirector;
