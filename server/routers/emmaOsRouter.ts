import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export const emmaOsRouter = router({
  chat: protectedProcedure.input(z.object({
    message: z.string(),
    history: z.array(z.object({ role: z.string(), content: z.string() })).optional(),
  })).mutation(async ({ ctx, input }) => {
    const messages: any[] = [
      {
        role: "system",
        content: `You are EMMA OS — the AI operating system for CreatorVault. You help creators grow their business, create content, manage their empire, and achieve their goals. You are direct, action-oriented, and always focused on results. User ID: ${ctx.user.id}`,
      },
      ...(input.history || []).slice(-10),
      { role: "user", content: input.message },
    ];
    
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages,
      max_tokens: 600,
    });
    return { response: completion.choices[0].message.content };
  }),

  getOsStatus: protectedProcedure.query(async ({ ctx }) => {
    return {
      status: "online",
      version: "2.0",
      capabilities: ["content_creation", "analytics", "automation", "monetization", "growth"],
      userId: ctx.user.id,
    };
  }),
});
