import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export const commentRouter = router({
  generateReply: protectedProcedure.input(z.object({
    comment: z.string(),
    context: z.string().optional(),
    tone: z.enum(["friendly", "professional", "hype", "grateful"]).default("friendly"),
  })).mutation(async ({ input }) => {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{
        role: "user",
        content: `Generate a ${input.tone} reply to this comment:
Comment: "${input.comment}"
${input.context ? `Context: ${input.context}` : ""}

Write a genuine, engaging reply that builds community. Keep it authentic and under 50 words.`,
      }],
      max_tokens: 150,
    });
    return { reply: completion.choices[0].message.content };
  }),

  batchGenerateReplies: protectedProcedure.input(z.object({
    comments: z.array(z.object({ id: z.string(), text: z.string() })),
    tone: z.string().default("friendly"),
  })).mutation(async ({ input }) => {
    const replies = await Promise.all(
      input.comments.slice(0, 10).map(async (c) => {
        const completion = await openai.chat.completions.create({
          model: "gpt-4o-mini",
          messages: [{ role: "user", content: `Reply to: "${c.text}" in a ${input.tone} tone. Under 30 words.` }],
          max_tokens: 80,
        });
        return { id: c.id, reply: completion.choices[0].message.content };
      })
    );
    return { replies };
  }),

  moderateComment: protectedProcedure.input(z.object({
    comment: z.string(),
  })).mutation(async ({ input }) => {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{
        role: "user",
        content: `Moderate this comment and classify it:
"${input.comment}"

Return JSON: { "safe": boolean, "category": "positive|neutral|spam|offensive|question", "action": "approve|review|hide" }`,
      }],
      max_tokens: 100,
    });
    try {
      return JSON.parse(completion.choices[0].message.content || "{}");
    } catch {
      return { safe: true, category: "neutral", action: "approve" };
    }
  }),
});
