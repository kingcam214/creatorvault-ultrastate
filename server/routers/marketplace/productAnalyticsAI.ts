import { z } from "zod";
import { router, protectedProcedure } from "../../_core/trpc";
import OpenAI from "openai";
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
export const productAnalyticsAI = router({
    // @ts-ignore
  analyzeProduct: protectedProcedure.input(z.object({ productId: z.number(), metrics: z.record(z.number()) })).mutation(async ({ input }) => {
    const c = await openai.chat.completions.create({ model: "gpt-4o-mini", messages: [{ role: "user", content: `Analyze product #${input.productId} with metrics:
${JSON.stringify(input.metrics)}

Provide: performance assessment, optimization recommendations, and revenue growth tactics.` }], max_tokens: 400 });
    return { analysis: c.choices[0].message.content };
  }),
  getProductInsights: protectedProcedure.query(async ({ ctx }) => ({ insights: [], topProducts: [], userId: ctx.user.id })),
  forecastRevenue: protectedProcedure.input(z.object({ productId: z.number(), period: z.string() })).mutation(async ({ input }) => ({ productId: input.productId, period: input.period, forecast: 0, confidence: "medium" })),
});
export const productAnalyticsAIRouter = productAnalyticsAI;
