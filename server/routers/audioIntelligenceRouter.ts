import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import {
  analyzeCanonicalAudioAsset,
  assertAudioRights,
  getAudioAnalysis,
  getCanonicalAudioAsset,
  listCanonicalAudioAssets,
} from "../services/audioIntelligenceService";

const platformSchema = z.enum(["creatorvault", "vaultx", "telegram", "instagram", "tiktok", "youtube"]);

export const audioIntelligenceRouter = router({
  listAssets: protectedProcedure.query(async ({ ctx }) => {
    const assets = await listCanonicalAudioAssets(Number(ctx.user.id));
    return {
      assets,
      libraryState: assets.length > 0 ? "ready" : "empty",
      creatorMessage: assets.length > 0
        ? "Your ready-to-use soundtracks are here."
        : "Add a creator-owned or cleared soundtrack to start directing your edit to music.",
    };
  }),

  getAsset: protectedProcedure
    .input(z.object({ assetId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const asset = await getCanonicalAudioAsset(Number(ctx.user.id), input.assetId);
      if (!asset) throw new Error("That soundtrack is not in your CreatorVault library.");
      return asset;
    }),

  analyzeAsset: protectedProcedure
    .input(z.object({ assetId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const analysis = await analyzeCanonicalAudioAsset(Number(ctx.user.id), input.assetId);
      return {
        analysis,
        creatorMessage: analysis.analysisStatus === "ready"
          ? "Your soundtrack’s rhythm map is ready. CreatorVault found the moments your edit can hit."
          : "CreatorVault saved the sound profile, but this track needs a stronger rhythmic signal before it can direct beat-level cuts.",
      };
    }),

  getAnalysis: protectedProcedure
    .input(z.object({ assetId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const analysis = await getAudioAnalysis(Number(ctx.user.id), input.assetId);
      return { analysis };
    }),

  getRenderReadiness: protectedProcedure
    .input(z.object({ assetId: z.string().uuid(), platform: platformSchema.default("creatorvault") }))
    .query(async ({ ctx, input }) => {
      const asset = await getCanonicalAudioAsset(Number(ctx.user.id), input.assetId);
      if (!asset) return { ready: false, reason: "That soundtrack is not in your CreatorVault library." };
      try {
        assertAudioRights({ asset, intendedUse: "render", platform: input.platform });
        const analysis = await getAudioAnalysis(Number(ctx.user.id), asset.id);
        return {
          ready: Boolean(analysis && analysis.analysisStatus === "ready"),
          asset,
          analysis,
          reason: analysis?.analysisStatus === "ready"
            ? "This soundtrack is cleared for this release and has a saved rhythm map."
            : "CreatorVault needs to finish reading this soundtrack before it can direct a music-led edit.",
        };
      } catch (error: any) {
        return { ready: false, asset, reason: error?.message || "This soundtrack cannot be included in this release." };
      }
    }),
});
