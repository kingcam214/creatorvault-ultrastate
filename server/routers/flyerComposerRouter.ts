import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import OpenAI from "openai";
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
export const flyerComposerRouter = router({
  composeFlyerContent: protectedProcedure.input(z.object({ type: z.string(), event: z.string(), date: z.string(), details: z.string() })).mutation(async ({ input }) => {
    const c = await openai.chat.completions.create({ model: "gpt-4o-mini", messages: [{ role: "user", content: `Compose flyer content for a ${input.type}:
Event: ${input.event}
Date: ${input.date}
Details: ${input.details}

Create: headline, subheadline, body copy, and CTA. Optimize for visual impact.` }], max_tokens: 400 });
    return { content: c.choices[0].message.content };
  }),
  getComposerTemplates: protectedProcedure.query(async () => ({ templates: [{ id: "event", name: "Event Flyer" }, { id: "promo", name: "Promo Flyer" }, { id: "announcement", name: "Announcement" }] })),
  saveComposition: protectedProcedure.input(z.object({ name: z.string(), content: z.string(), template: z.string() })).mutation(async ({ ctx, input }) => ({ id: Date.now(), ...input, userId: ctx.user.id })),
});