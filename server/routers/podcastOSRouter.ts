import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import OpenAI from "openai";
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
export const podcastOSRouter = router({
  createPodcastPlan: protectedProcedure.input(z.object({ name: z.string(), niche: z.string(), format: z.string(), frequency: z.string() })).mutation(async ({ ctx, input }) => {
    const c = await openai.chat.completions.create({ model: "gpt-4o-mini", messages: [{ role: "user", content: `Create a podcast launch plan for "${input.name}":
Niche: ${input.niche}
Format: ${input.format}
Frequency: ${input.frequency}

Include: show concept, episode structure, first 10 episode ideas, guest strategy, and monetization plan.` }], max_tokens: 700 });
    return { plan: c.choices[0].message.content, userId: ctx.user.id };
  }),
  generateEpisodeOutline: protectedProcedure.input(z.object({ topic: z.string(), duration: z.number(), guests: z.array(z.string()).optional() })).mutation(async ({ input }) => {
    const c = await openai.chat.completions.create({ model: "gpt-4o-mini", messages: [{ role: "user", content: `Create a ${input.duration}-minute podcast episode outline:
Topic: ${input.topic}${input.guests?.length ? `
Guests: ${input.guests.join(", ")}` : ""}

Include: intro, segments with timing, key questions, transitions, and outro.` }], max_tokens: 500 });
    return { outline: c.choices[0].message.content };
  }),
  generateShowNotes: protectedProcedure.input(z.object({ episodeTitle: z.string(), transcript: z.string() })).mutation(async ({ input }) => {
    const c = await openai.chat.completions.create({ model: "gpt-4o-mini", messages: [{ role: "user", content: `Generate show notes for podcast episode "${input.episodeTitle}":

Transcript excerpt: ${input.transcript.slice(0, 1000)}

Create: episode summary, key takeaways, timestamps, and resources mentioned.` }], max_tokens: 500 });
    return { showNotes: c.choices[0].message.content };
  }),
});