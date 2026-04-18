import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import OpenAI from "openai";
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
export const kingframe = router({
  createFrame: protectedProcedure.input(z.object({ type: z.string(), content: z.string(), style: z.string() })).mutation(async ({ ctx, input }) => ({ id: Date.now(), type: input.type, style: input.style, userId: ctx.user.id })),
  generateFrameContent: protectedProcedure.input(z.object({ frameType: z.string(), topic: z.string() })).mutation(async ({ input }) => {
    const c = await openai.chat.completions.create({ model: "gpt-4o-mini", messages: [{ role: "user", content: `Create content for a ${input.frameType} frame about ${input.topic}. Make it visually compelling and shareable.` }], max_tokens: 300 });
    return { content: c.choices[0].message.content };
  }),
  getFrameTemplates: protectedProcedure.query(async () => ({ templates: [{ id: "quote", name: "Quote Frame" }, { id: "stat", name: "Stat Frame" }, { id: "tip", name: "Tip Frame" }, { id: "announcement", name: "Announcement Frame" }] })),
});
export const kingframeRouter = kingframe;
