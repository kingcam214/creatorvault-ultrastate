import { z } from "zod";
import { router, protectedProcedure, publicProcedure } from "../_core/trpc";
import OpenAI from "openai";
import * as db from "../db";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export const aiOnboardingAssistantRouter = router({
  startOnboarding: protectedProcedure.input(z.object({
    creatorType: z.string(),
    experience: z.enum(["beginner", "intermediate", "advanced"]),
    primaryGoal: z.string(),
    platforms: z.array(z.string()),
  })).mutation(async ({ ctx, input }) => {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{
        role: "user",
        content: `Create a personalized onboarding plan for this creator:
Type: ${input.creatorType}
Experience: ${input.experience}
Goal: ${input.primaryGoal}
Platforms: ${input.platforms.join(", ")}

Provide: 1) Personalized welcome message, 2) First 7 days action plan, 3) Key features to use first, 4) Quick wins to achieve in week 1, 5) Success milestones.`,
      }],
      max_tokens: 700,
    });
    return { plan: completion.choices[0].message.content, userId: ctx.user.id };
  }),

  getNextStep: protectedProcedure.input(z.object({
    completedSteps: z.array(z.string()),
    currentGoal: z.string(),
  })).query(async ({ input }) => {
    const allSteps = [
      "complete_profile",
      "connect_first_platform",
      "create_first_content",
      "set_up_payment",
      "launch_first_product",
      "get_first_sale",
      "build_email_list",
      "launch_first_campaign",
    ];
    const nextStep = allSteps.find(s => !input.completedSteps.includes(s));
    return { nextStep, progress: (input.completedSteps.length / allSteps.length) * 100 };
  }),
});
