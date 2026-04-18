import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export const vaultspaceAutomation = router({
  automateVaultspace: protectedProcedure.input(z.object({
    spaceName: z.string(), automationType: z.string(), triggers: z.array(z.string()), actions: z.array(z.string()),
  })).mutation(async ({ ctx, input }) => {
    return { automationId: Date.now(), spaceName: input.spaceName, type: input.automationType, status: "active", userId: ctx.user.id };
  }),
  getAutomations: protectedProcedure.query(async ({ ctx }) => {
    return { automations: [], userId: ctx.user.id };
  }),
  generateAutomationIdeas: protectedProcedure.input(z.object({ spaceType: z.string(), goal: z.string() })).mutation(async ({ input }) => {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: `Suggest 5 automation ideas for a ${input.spaceType} vaultspace with goal: ${input.goal}. For each: trigger, action, expected outcome.` }],
      max_tokens: 400,
    });
    return { ideas: completion.choices[0].message.content };
  }),
});

export const vaultspaceAutomationRouter = vaultspaceAutomation;
