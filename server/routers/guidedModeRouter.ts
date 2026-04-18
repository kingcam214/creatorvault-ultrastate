import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import OpenAI from "openai";
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
export const guidedModeRouter = router({
  startGuidedSession: protectedProcedure.input(z.object({ goal: z.string(), experience: z.string(), timeAvailable: z.string() })).mutation(async ({ ctx, input }) => {
    const c = await openai.chat.completions.create({ model: "gpt-4o-mini", messages: [{ role: "user", content: `Start a guided creator session:
Goal: ${input.goal}
Experience: ${input.experience}
Time available: ${input.timeAvailable}

Create a step-by-step guided plan with clear actions, time estimates, and success criteria.` }], max_tokens: 600 });
    return { session: c.choices[0].message.content, sessionId: Date.now(), userId: ctx.user.id };
  }),
  getNextGuidedStep: protectedProcedure.input(z.object({ sessionId: z.number(), completedSteps: z.array(z.string()) })).query(async ({ input }) => {
    const c = await openai.chat.completions.create({ model: "gpt-4o-mini", messages: [{ role: "user", content: `Based on completed steps: ${input.completedSteps.join(", ")}, what is the single most important next action? Be specific and actionable in 2-3 sentences.` }], max_tokens: 150 });
    return { step: c.choices[0].message.content };
  }),
  completeGuidedStep: protectedProcedure.input(z.object({ sessionId: z.number(), stepId: z.string() })).mutation(async ({ input }) => ({ completed: true, stepId: input.stepId, pointsEarned: 50 })),
});