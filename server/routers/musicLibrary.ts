import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import { getAudioAnalysis, listCanonicalAudioAssets } from "../services/audioIntelligenceService";

async function toLibraryTrack(asset: Awaited<ReturnType<typeof listCanonicalAudioAssets>>[number]) {
  const analysis = await getAudioAnalysis(asset.creatorId, asset.id);
  return {
    id: asset.id,
    title: asset.title,
    artist: asset.rights.source === "creator_upload" ? "Your CreatorVault library" : asset.rights.providerName || "CreatorVault sound library",
    genre: asset.kind,
    url: asset.assetUrl,
    duration: asset.durationSeconds,
    rightsState: asset.rights.state,
    allowedPlatforms: asset.rights.allowedPlatforms,
    canCreateWith: asset.rights.permittedUses.includes("render"),
    attributionRequired: asset.rights.attributionRequired,
    attributionText: asset.rights.attributionText,
    status: asset.status,
    bpm: analysis?.bpm ?? null,
    timingState: analysis?.analysisStatus ?? "not_recorded",
  };
}

export const musicLibrary = router({
  getLibrary: protectedProcedure.query(async ({ ctx }) => {
    const assets = await listCanonicalAudioAssets(Number(ctx.user.id));
    return { tracks: await Promise.all(assets.map(toLibraryTrack)), playlists: [], userId: ctx.user.id };
  }),

  searchLibrary: protectedProcedure
    .input(z.object({ query: z.string().trim().max(120) }))
    .query(async ({ ctx, input }) => {
      const normalized = input.query.toLocaleLowerCase();
      const assets = await listCanonicalAudioAssets(Number(ctx.user.id));
      const tracks = await Promise.all(
        assets
          .filter(asset => asset.title.toLocaleLowerCase().includes(normalized))
          .map(toLibraryTrack),
      );
      return { results: tracks, query: input.query };
    }),

  getLicensedTracks: protectedProcedure.query(async ({ ctx }) => {
    const assets = await listCanonicalAudioAssets(Number(ctx.user.id));
    const tracks = await Promise.all(
      assets
        .filter(asset => asset.rights.state === "creator_owned" || asset.rights.state === "licensed_for_creation")
        .map(toLibraryTrack),
    );
    return {
      tracks,
      message: tracks.length
        ? "These soundtracks have recorded creation permission in your CreatorVault library."
        : "CreatorVault has not found a soundtrack with recorded creation permission yet.",
    };
  }),

  addTrack: protectedProcedure.input(z.object({ title: z.string(), artist: z.string().optional(), genre: z.string().optional(), url: z.string().optional(), duration: z.number().optional() })).mutation(() => {
    throw new Error("Add music through the CreatorVault upload flow so its ownership and release permission stay attached to every edit.");
  }),

  createPlaylist: protectedProcedure.input(z.object({ name: z.string(), description: z.string().optional(), tracks: z.array(z.string()) })).mutation(() => {
    throw new Error("Playlists will be available after CreatorVault has real library records to organize. No empty playlist was created.");
  }),
});
export const musicLibraryRouter = musicLibrary;
