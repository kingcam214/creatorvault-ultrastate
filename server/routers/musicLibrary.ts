import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import * as db from "../db";
import { eq, desc } from "drizzle-orm";
export const musicLibrary = router({
  getLibrary: protectedProcedure.query(async ({ ctx }) => ({ tracks: [], playlists: [], userId: ctx.user.id })),
  addTrack: protectedProcedure.input(z.object({ title: z.string(), artist: z.string(), genre: z.string(), url: z.string(), duration: z.number().optional() })).mutation(async ({ ctx, input }) => ({ id: Date.now(), ...input, userId: ctx.user.id, addedAt: new Date().toISOString() })),
  createPlaylist: protectedProcedure.input(z.object({ name: z.string(), description: z.string().optional(), tracks: z.array(z.number()) })).mutation(async ({ ctx, input }) => ({ id: Date.now(), name: input.name, trackCount: input.tracks.length, userId: ctx.user.id })),
  searchLibrary: protectedProcedure.input(z.object({ query: z.string() })).query(async ({ input }) => ({ results: [], query: input.query })),
  getLicensedTracks: protectedProcedure.query(async () => ({ tracks: [], message: "Connect your music licensing account to access tracks" })),
});
export const musicLibraryRouter = musicLibrary;
