import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export const batchGenerationRouter = router({
  generateBatch: protectedProcedure.input(z.object({
    type: z.enum(["captions", "hooks", "scripts", "emails", "posts"]),
    topic: z.string(),
    count: z.number().min(1).max(20).default(5),
    platform: z.string().optional(),
    tone: z.string().optional(),
  })).mutation(async ({ input }) => {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{
        role: "user",
        content: `Generate a batch of ${input.count} unique ${input.type} about "${input.topic}"${input.platform ? ` for ${input.platform}` : ""}${input.tone ? ` with ${input.tone} tone` : ""}. Number each one. Make each distinctly different.`,
      }],
      max_tokens: 800,
    });
    return { batch: completion.choices[0].message.content, type: input.type, count: input.count };
  }),

  scheduleBatch: protectedProcedure.input(z.object({
    items: z.array(z.object({ content: z.string(), platform: z.string(), scheduledFor: z.string() })),
  })).mutation(async ({ ctx, input }) => {
    return { scheduled: input.items.length, userId: ctx.user.id, status: "queued" };
  }),
});
