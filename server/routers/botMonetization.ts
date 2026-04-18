import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import OpenAI from "openai";
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
export const botMonetization = router({
  createMonetizationStrategy: protectedProcedure.input(z.object({ botType: z.string(), audience: z.string(), platform: z.string() })).mutation(async ({ input }) => {
    const c = await openai.chat.completions.create({ model: "gpt-4o-mini", messages: [{ role: "user", content: `Create a monetization strategy for a ${input.botType} bot on ${input.platform} with ${input.audience} audience:

Include: revenue streams, pricing model, upsell sequence, and monthly revenue projection.` }], max_tokens: 500 });
    return { strategy: c.choices[0].message.content };
  }),
  getBotRevenue: protectedProcedure.query(async ({ ctx }) => ({ totalRevenue: 0, byBot: [], userId: ctx.user.id })),
  optimizeBotConversions: protectedProcedure.input(z.object({ botId: z.number(), currentConversion: z.number() })).mutation(async ({ input }) => {
    const c = await openai.chat.completions.create({ model: "gpt-4o-mini", messages: [{ role: "user", content: `Optimize bot #${input.botId} with ${input.currentConversion}% conversion rate. Provide 5 specific tactics to improve conversions.` }], max_tokens: 400 });
    return { optimizations: c.choices[0].message.content };
  }),
});
export const botMonetizationRouter = botMonetization;
