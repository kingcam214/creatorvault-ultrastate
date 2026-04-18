import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import OpenAI from "openai";
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
export const empireBrain = router({
  think: protectedProcedure.input(z.object({ query: z.string(), context: z.string().optional() })).mutation(async ({ input }) => {
    const c = await openai.chat.completions.create({ model: "gpt-4o-mini", messages: [{ role: "system", content: "You are the Empire Brain — the central AI intelligence for a creator empire. Provide strategic, high-level thinking." }, { role: "user", content: `${input.context ? `Context: ${input.context}
` : ""}Query: ${input.query}` }], max_tokens: 600 });
    return { response: c.choices[0].message.content };
  }),
  getEmpireInsights: protectedProcedure.query(async ({ ctx }) => ({ insights: [], recommendations: [], userId: ctx.user.id })),
  analyzeEmpire: protectedProcedure.input(z.object({ metrics: z.record(z.number()) })).mutation(async ({ input }) => {
    const c = await openai.chat.completions.create({ model: "gpt-4o-mini", messages: [{ role: "user", content: `Analyze these empire metrics and provide strategic insights:
${JSON.stringify(input.metrics)}

Identify: strengths, weaknesses, opportunities, and immediate actions.` }], max_tokens: 500 });
    return { analysis: c.choices[0].message.content };
  }),
});
export const empireBrainRouter = empireBrain;
