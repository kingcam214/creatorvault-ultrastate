import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export const autoCreditRepairExecutor = router({
  analyzeCreditReport: protectedProcedure.input(z.object({
    score: z.number(), negativeItems: z.array(z.string()), accounts: z.array(z.object({ type: z.string(), balance: z.number(), status: z.string() })),
  })).mutation(async ({ input }) => {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: `Analyze this credit profile and create a repair plan:
Score: ${input.score}
Negative items: ${input.negativeItems.join(", ")}
Accounts: ${JSON.stringify(input.accounts)}

Provide: priority dispute list, dispute letter templates, score improvement timeline, and quick wins.` }],
      max_tokens: 700,
    });
    return { analysis: completion.choices[0].message.content };
  }),
  generateDisputeLetter: protectedProcedure.input(z.object({ item: z.string(), bureau: z.string(), reason: z.string() })).mutation(async ({ input }) => {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: `Write a professional credit dispute letter to ${input.bureau} disputing: ${input.item}
Reason: ${input.reason}

Write a formal, legally-sound dispute letter following FCRA guidelines.` }],
      max_tokens: 500,
    });
    return { letter: completion.choices[0].message.content };
  }),
  getCreditBuildingPlan: protectedProcedure.input(z.object({ currentScore: z.number(), targetScore: z.number(), timeframe: z.string() })).mutation(async ({ input }) => {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: `Create a credit building plan to go from ${input.currentScore} to ${input.targetScore} in ${input.timeframe}. Include: specific actions, credit products to open, utilization targets, and monthly milestones.` }],
      max_tokens: 600,
    });
    return { plan: completion.choices[0].message.content };
  }),
});

export const autoCreditRepairExecutorRouter = autoCreditRepairExecutor;
