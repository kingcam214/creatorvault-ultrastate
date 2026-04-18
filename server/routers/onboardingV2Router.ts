import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import OpenAI from "openai";
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
export const onboardingV2Router = router({
  startV2Onboarding: protectedProcedure.input(z.object({ creatorType: z.string(), primaryGoal: z.string(), monthlyIncomeGoal: z.number(), platforms: z.array(z.string()) })).mutation(async ({ ctx, input }) => {
    const c = await openai.chat.completions.create({ model: "gpt-4o-mini", messages: [{ role: "user", content: `Design a V2 onboarding experience for a ${input.creatorType} creator:
Primary goal: ${input.primaryGoal}
Income goal: $${input.monthlyIncomeGoal}/month
Platforms: ${input.platforms.join(", ")}

Create: personalized welcome, quick wins for day 1, week 1 roadmap, and first monetization action.` }], max_tokens: 600 });
    return { onboarding: c.choices[0].message.content, userId: ctx.user.id };
  }),
  getV2Progress: protectedProcedure.query(async ({ ctx }) => ({ progress: 0, level: "beginner", nextMilestone: "First Content", userId: ctx.user.id })),
  completeV2Step: protectedProcedure.input(z.object({ stepId: z.string(), result: z.string().optional() })).mutation(async ({ ctx, input }) => ({ completed: true, stepId: input.stepId, xpEarned: 100, userId: ctx.user.id })),
});