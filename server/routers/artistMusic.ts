import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import OpenAI from "openai";
import * as db from "../db";
import { eq, desc } from "drizzle-orm";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export const artistMusic = router({
  generateLyrics: protectedProcedure.input(z.object({
    genre: z.string(), theme: z.string(), mood: z.string(), style: z.string().optional(), verses: z.number().default(2),
  })).mutation(async ({ input }) => {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: `Write ${input.genre} song lyrics:
Theme: ${input.theme}
Mood: ${input.mood}
Style: ${input.style || "original"}

Write: ${input.verses} verses, chorus, and bridge. Make it authentic and emotionally resonant.` }],
      max_tokens: 700,
    });
    return { lyrics: completion.choices[0].message.content };
  }),
  generateSongConcept: protectedProcedure.input(z.object({ genre: z.string(), inspiration: z.string() })).mutation(async ({ input }) => {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: `Create a full song concept for a ${input.genre} track inspired by: ${input.inspiration}

Include: title, concept, mood, tempo, key, instrumentation ideas, and marketing angle.` }],
      max_tokens: 500,
    });
    return { concept: completion.choices[0].message.content };
  }),
  getMusicLibrary: protectedProcedure.query(async ({ ctx }) => {
    return { tracks: [], totalTracks: 0, userId: ctx.user.id };
  }),
  generateMusicMarketingPlan: protectedProcedure.input(z.object({ songTitle: z.string(), genre: z.string(), releaseDate: z.string() })).mutation(async ({ input }) => {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: `Create a music marketing plan for "${input.songTitle}" (${input.genre}) releasing ${input.releaseDate}:

Include: pre-release strategy (4 weeks), release day plan, post-release momentum, playlist pitching, and social media content calendar.` }],
      max_tokens: 700,
    });
    return { plan: completion.choices[0].message.content };
  }),
});

export const artistMusicRouter = artistMusic;
