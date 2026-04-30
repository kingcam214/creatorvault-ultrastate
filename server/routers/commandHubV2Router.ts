import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export const commandHubV2Router = router({
  executeCommand: protectedProcedure.input(z.object({
    command: z.string(),
    // @ts-ignore
    context: z.record(z.unknown()).optional(),
    priority: z.enum(["low", "normal", "high", "urgent"]).default("normal"),
  })).mutation(async ({ ctx, input }) => {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "You are the CreatorVault Command Hub v2. Execute creator commands efficiently and return structured action plans.",
        },
        {
          role: "user",
          content: `Execute command: ${input.command}\nContext: ${JSON.stringify(input.context || {})}\nPriority: ${input.priority}`,
        },
      ],
      max_tokens: 600,
    });
    return {
      result: completion.choices[0].message.content,
      command: input.command,
      executedAt: new Date().toISOString(),
      userId: ctx.user.id,
    };
  }),

  getCommandHistory: protectedProcedure.input(z.object({
    limit: z.number().default(20),
  })).query(async ({ ctx }) => {
    return { history: [], userId: ctx.user.id };
  }),

  getAvailableCommands: protectedProcedure.query(async () => {
    return {
      commands: [
        { name: "generate_content", description: "Generate content for any platform" },
        { name: "analyze_performance", description: "Analyze your content performance" },
        { name: "schedule_posts", description: "Schedule posts across platforms" },
        { name: "run_campaign", description: "Launch a marketing campaign" },
        { name: "optimize_profile", description: "Optimize your creator profile" },
      ],
    };
  }),
});
