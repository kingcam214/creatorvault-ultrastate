import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import OpenAI from "openai";
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
export const greatestShowRouter = router({
  createShow: protectedProcedure.input(z.object({ title: z.string(), concept: z.string(), format: z.string(), audience: z.string() })).mutation(async ({ ctx, input }) => {
    const c = await openai.chat.completions.create({ model: "gpt-4o-mini", messages: [{ role: "user", content: `Create "The Greatest Show" concept:
Title: ${input.title}
Concept: ${input.concept}
Format: ${input.format}
Audience: ${input.audience}

Develop: show bible, episode structure, talent requirements, and monetization strategy.` }], max_tokens: 700 });
    return { show: c.choices[0].message.content, userId: ctx.user.id };
  }),
  getShows: protectedProcedure.query(async ({ ctx }) => ({ shows: [], userId: ctx.user.id })),
  generateEpisodePlan: protectedProcedure.input(z.object({ showTitle: z.string(), episodeNumber: z.number(), theme: z.string() })).mutation(async ({ input }) => {
    const c = await openai.chat.completions.create({ model: "gpt-4o-mini", messages: [{ role: "user", content: `Plan episode ${input.episodeNumber} of "${input.showTitle}" with theme: ${input.theme}. Include: cold open, segments, guests, and closing.` }], max_tokens: 500 });
    return { plan: c.choices[0].message.content };
  }),
});