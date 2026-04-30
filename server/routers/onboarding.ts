import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import OpenAI from "openai";
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
export const onboarding = router({
  getOnboardingStatus: protectedProcedure.query(async ({ ctx }) => ({ completed: false, currentStep: 1, totalSteps: 7, userId: ctx.user.id })),
    // @ts-ignore
  completeStep: protectedProcedure.input(z.object({ step: z.number(), data: z.record(z.unknown()).optional() })).mutation(async ({ ctx, input }) => ({ completed: true, step: input.step, userId: ctx.user.id })),
  getPersonalizedPlan: protectedProcedure.input(z.object({ goals: z.array(z.string()), experience: z.string(), niche: z.string() })).mutation(async ({ input }) => {
    const c = await openai.chat.completions.create({ model: "gpt-4o-mini", messages: [{ role: "user", content: `Create a personalized onboarding plan:
Goals: ${input.goals.join(", ")}
Experience: ${input.experience}
Niche: ${input.niche}

Design a 7-step onboarding journey with specific actions and expected outcomes.` }], max_tokens: 600 });
    return { plan: c.choices[0].message.content };
  }),
  skipOnboarding: protectedProcedure.mutation(async ({ ctx }) => ({ skipped: true, userId: ctx.user.id })),
});
export const onboardingRouter = onboarding;
