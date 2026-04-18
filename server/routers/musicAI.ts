import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import OpenAI from "openai";
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
export const musicAI = router({
  generateLyrics: protectedProcedure.input(z.object({ genre: z.string(), theme: z.string(), mood: z.string(), artist: z.string().optional() })).mutation(async ({ input }) => {
    const c = await openai.chat.completions.create({ model: "gpt-4o-mini", messages: [{ role: "user", content: `Write ${input.genre} lyrics:
Theme: ${input.theme}
Mood: ${input.mood}${input.artist ? `
Style inspiration: ${input.artist}` : ""}

Write: verse 1, chorus, verse 2, bridge, and outro.` }], max_tokens: 600 });
    return { lyrics: c.choices[0].message.content };
  }),
  analyzeSong: protectedProcedure.input(z.object({ lyrics: z.string(), genre: z.string() })).mutation(async ({ input }) => {
    const c = await openai.chat.completions.create({ model: "gpt-4o-mini", messages: [{ role: "user", content: `Analyze these ${input.genre} lyrics:
${input.lyrics}

Provide: emotional impact, lyrical strength, commercial potential, and improvement suggestions.` }], max_tokens: 400 });
    return { analysis: c.choices[0].message.content };
  }),
  generateSongTitle: protectedProcedure.input(z.object({ theme: z.string(), genre: z.string(), count: z.number().default(5) })).mutation(async ({ input }) => {
    const c = await openai.chat.completions.create({ model: "gpt-4o-mini", messages: [{ role: "user", content: `Generate ${input.count} ${input.genre} song titles about: ${input.theme}. Make them memorable and marketable.` }], max_tokens: 200 });
    return { titles: c.choices[0].message.content };
  }),
  getMusicTrends: protectedProcedure.input(z.object({ genre: z.string() })).query(async ({ input }) => {
    const c = await openai.chat.completions.create({ model: "gpt-4o-mini", messages: [{ role: "user", content: `What are the current trends in ${input.genre} music? List 5 trends with examples and how to capitalize on each.` }], max_tokens: 400 });
    return { trends: c.choices[0].message.content };
  }),
});
export const musicAIRouter = musicAI;
