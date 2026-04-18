import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export const appleQRouter = router({
  processQuery: protectedProcedure.input(z.object({
    query: z.string(),
    context: z.string().optional(),
    mode: z.enum(["fast", "deep", "creative"]).default("fast"),
  })).mutation(async ({ input }) => {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "You are AppleQ — a premium AI assistant for CreatorVault. Provide high-quality, actionable responses.",
        },
        {
          role: "user",
          content: `${input.context ? `Context: ${input.context}

` : ""}Query: ${input.query}`,
        },
      ],
      max_tokens: input.mode === "deep" ? 800 : 400,
    });
    return { response: completion.choices[0].message.content, mode: input.mode };
  }),

  getCapabilities: protectedProcedure.query(async () => {
    return {
      capabilities: ["content_generation", "analysis", "strategy", "copywriting", "research", "optimization"],
      version: "1.0",
    };
  }),
});
