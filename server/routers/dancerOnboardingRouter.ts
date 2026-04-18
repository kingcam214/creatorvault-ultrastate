import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export const dancerOnboardingRouter = router({
  startDancerOnboarding: protectedProcedure.input(z.object({
    danceStyle: z.string(),
    experience: z.enum(["beginner", "intermediate", "professional"]),
    goals: z.array(z.string()),
    platforms: z.array(z.string()),
  })).mutation(async ({ ctx, input }) => {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{
        role: "user",
        content: `Create a personalized onboarding plan for a ${input.experience} ${input.danceStyle} dancer:
Goals: ${input.goals.join(", ")}
Platforms: ${input.platforms.join(", ")}

Create: 1) Profile optimization tips, 2) First 5 content ideas, 3) Monetization path, 4) Community building strategy, 5) 30-day growth plan.`,
      }],
      max_tokens: 700,
    });
    return { plan: completion.choices[0].message.content, userId: ctx.user.id };
  }),

  getDancerContentIdeas: protectedProcedure.input(z.object({
    style: z.string(),
    platform: z.string(),
    count: z.number().default(10),
  })).mutation(async ({ input }) => {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{
        role: "user",
        content: `Generate ${input.count} content ideas for a ${input.style} dancer on ${input.platform}. Include trending formats, educational content, and entertainment ideas.`,
      }],
      max_tokens: 500,
    });
    return { ideas: completion.choices[0].message.content };
  }),
});
