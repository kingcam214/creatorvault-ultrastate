import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import OpenAI from "openai";
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
export const markCubanAgent = router({
  getBusinessAdvice: protectedProcedure.input(z.object({ situation: z.string(), question: z.string() })).mutation(async ({ input }) => {
    const c = await openai.chat.completions.create({ model: "gpt-4o-mini", messages: [{ role: "system", content: "You are a business advisor inspired by Mark Cuban's direct, no-BS approach. Give straight talk about business, money, and entrepreneurship." }, { role: "user", content: `Situation: ${input.situation}
Question: ${input.question}` }], max_tokens: 500 });
    return { advice: c.choices[0].message.content };
  }),
  evaluateBusiness: protectedProcedure.input(z.object({ businessModel: z.string(), revenue: z.number(), growth: z.string() })).mutation(async ({ input }) => {
    const c = await openai.chat.completions.create({ model: "gpt-4o-mini", messages: [{ role: "system", content: "Evaluate this business like a Shark Tank investor. Be direct and honest." }, { role: "user", content: `Business model: ${input.businessModel}
Revenue: $${input.revenue}
Growth: ${input.growth}

Give your honest assessment and what needs to change.` }], max_tokens: 500 });
    return { evaluation: c.choices[0].message.content };
  }),
  getDealStructure: protectedProcedure.input(z.object({ dealType: z.string(), amount: z.number(), terms: z.string() })).mutation(async ({ input }) => {
    const c = await openai.chat.completions.create({ model: "gpt-4o-mini", messages: [{ role: "user", content: `Structure a ${input.dealType} deal for $${input.amount} with terms: ${input.terms}. Provide: deal structure, negotiation points, red flags, and walk-away conditions.` }], max_tokens: 500 });
    return { structure: c.choices[0].message.content };
  }),
});
export const markCubanAgentRouter = markCubanAgent;
