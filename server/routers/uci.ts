import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import OpenAI from "openai";
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
export const uci = router({
  getUniversalCreatorIndex: protectedProcedure.query(async ({ ctx }) => ({ score: 0, rank: "Emerging Creator", factors: [], userId: ctx.user.id })),
  calculateUCI: protectedProcedure.input(z.object({ metrics: z.record(z.number()) })).mutation(async ({ input }) => {
    const c = await openai.chat.completions.create({ model: "gpt-4o-mini", messages: [{ role: "user", content: `Calculate a Universal Creator Index score from these metrics:
${JSON.stringify(input.metrics)}

Score 0-100 and explain: content quality, audience engagement, monetization, consistency, and growth trajectory.` }], max_tokens: 400 });
    return { analysis: c.choices[0].message.content };
  }),
  getUCILeaderboard: protectedProcedure.query(async () => ({ leaderboard: [], period: "monthly" })),
});
export const uciRouter = uci;
