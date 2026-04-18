import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import OpenAI from "openai";
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
export const kingLifeRouter = router({
  getLifeStats: protectedProcedure.query(async ({ ctx }) => ({ level: "King", revenue: 0, influence: 0, freedom: 0, userId: ctx.user.id })),
  generateLifePlan: protectedProcedure.input(z.object({ goals: z.array(z.string()), currentSituation: z.string(), timeline: z.string() })).mutation(async ({ input }) => {
    const c = await openai.chat.completions.create({ model: "gpt-4o-mini", messages: [{ role: "user", content: `Create a King Life plan:
Goals: ${input.goals.join(", ")}
Current situation: ${input.currentSituation}
Timeline: ${input.timeline}

Design: 90-day sprint, income streams, lifestyle upgrades, and legacy building.` }], max_tokens: 600 });
    return { plan: c.choices[0].message.content };
  }),
  getDailyKingRoutine: protectedProcedure.query(async () => {
    const c = await openai.chat.completions.create({ model: "gpt-4o-mini", messages: [{ role: "user", content: "Create a daily routine for a creator king. Include: morning ritual, content creation blocks, business development, fitness, and evening review." }], max_tokens: 400 });
    return { routine: c.choices[0].message.content };
  }),
});