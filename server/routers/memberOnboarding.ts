import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import OpenAI from "openai";
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
export const memberOnboarding = router({
  startMemberOnboarding: protectedProcedure.input(z.object({ memberType: z.string(), goals: z.array(z.string()), experience: z.string() })).mutation(async ({ ctx, input }) => {
    const c = await openai.chat.completions.create({ model: "gpt-4o-mini", messages: [{ role: "user", content: `Create a member onboarding plan for a ${input.memberType} with ${input.experience} experience:
Goals: ${input.goals.join(", ")}

Design: welcome sequence, first 7 days plan, key features to explore, and success milestones.` }], max_tokens: 600 });
    return { plan: c.choices[0].message.content, userId: ctx.user.id };
  }),
  getMemberProgress: protectedProcedure.query(async ({ ctx }) => ({ progress: 0, completedSteps: [], nextSteps: [], userId: ctx.user.id })),
  completeMemberStep: protectedProcedure.input(z.object({ stepId: z.string() })).mutation(async ({ ctx, input }) => ({ completed: true, stepId: input.stepId, userId: ctx.user.id })),
  getMemberResources: protectedProcedure.query(async () => ({ resources: [{ title: "Quick Start Guide", type: "guide" }, { title: "Platform Tour", type: "video" }, { title: "Community Guidelines", type: "doc" }] })),
});
export const memberOnboardingRouter = memberOnboarding;
