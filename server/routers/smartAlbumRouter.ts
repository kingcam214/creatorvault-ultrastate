import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import OpenAI from "openai";
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
export const smartAlbumRouter = router({
  createAlbum: protectedProcedure.input(z.object({ name: z.string(), theme: z.string(), mediaIds: z.array(z.number()) })).mutation(async ({ ctx, input }) => ({ id: Date.now(), name: input.name, theme: input.theme, mediaCount: input.mediaIds.length, userId: ctx.user.id })),
  getAlbums: protectedProcedure.query(async ({ ctx }) => ({ albums: [], userId: ctx.user.id })),
  generateAlbumCover: protectedProcedure.input(z.object({ albumName: z.string(), theme: z.string(), style: z.string() })).mutation(async ({ input }) => {
    const c = await openai.chat.completions.create({ model: "gpt-4o-mini", messages: [{ role: "user", content: `Design an album cover concept for "${input.albumName}":
Theme: ${input.theme}
Style: ${input.style}

Describe: visual concept, color palette, typography, and mood.` }], max_tokens: 300 });
    return { concept: c.choices[0].message.content };
  }),
  organizeAlbum: protectedProcedure.input(z.object({ albumId: z.number(), sortBy: z.string() })).mutation(async ({ input }) => ({ organized: true, albumId: input.albumId, sortBy: input.sortBy })),
});