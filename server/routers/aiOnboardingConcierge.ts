import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export const aiOnboardingConcierge = router({
  startOnboarding: protectedProcedure.input(z.object({
    creatorType: z.string(), experience: z.string(), goals: z.array(z.string()), platforms: z.array(z.string()),
  })).mutation(async ({ ctx, input }) => {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: `Create a personalized onboarding journey for a ${input.experience} ${input.creatorType} creator:
Goals: ${input.goals.join(", ")}
Platforms: ${input.platforms.join(", ")}

Design: 7-day quick start plan, first wins to achieve, key features to use first, and success metrics for week 1.` }],
      max_tokens: 700,
    });
    return { journey: completion.choices[0].message.content, userId: ctx.user.id };
  }),
  getNextStep: protectedProcedure.input(z.object({ completedSteps: z.array(z.string()), currentGoal: z.string() })).query(async ({ input }) => {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: `Based on completed steps: ${input.completedSteps.join(", ")}
Current goal: ${input.currentGoal}

What is the single most important next step? Be specific and actionable.` }],
      max_tokens: 200,
    });
    return { nextStep: completion.choices[0].message.content };
  }),
  completeStep: protectedProcedure.input(z.object({ stepId: z.string(), feedback: z.string().optional() })).mutation(async ({ ctx, input }) => {
    return { completed: true, stepId: input.stepId, userId: ctx.user.id, pointsEarned: 100 };
  }),
});

export const aiOnboardingConciergeRouter = aiOnboardingConcierge;
