import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import {
  createKingcamCreatorJobCapsule,
  getKingcamSupremeCommandCenter,
  listKingcamSupremeAssets,
  registerKingcamSupremeAsset,
} from "../services/kingcamSupremeSystemService";

const OWNER_IDS = new Set([6, 33]);

function ownerOnly(userId: number): void {
  if (!OWNER_IDS.has(Number(userId))) throw new TRPCError({ code: "FORBIDDEN", message: "KingCam Supreme is reserved for the CreatorVault owner." });
}

const assetKind = z.enum([
  "identity_canon",
  "character_mesh",
  "face_calibration",
  "voice_canon",
  "motion_genome",
  "wardrobe_canon",
  "scene_package",
  "screen_recording",
  "final_master",
]);

export const kingcamSupremeSystemRouter = router({
  getCommandCenter: protectedProcedure.query(async ({ ctx }) => {
    ownerOnly(ctx.user.id);
    return getKingcamSupremeCommandCenter(ctx.user.id);
  }),

  listAssets: protectedProcedure.query(async ({ ctx }) => {
    ownerOnly(ctx.user.id);
    return listKingcamSupremeAssets(ctx.user.id);
  }),

  registerOwnedAsset: protectedProcedure
    .input(z.object({
      kind: assetKind,
      title: z.string().trim().min(3).max(191),
      canonVersion: z.string().trim().min(2).max(96),
      creatorVaultUrl: z.string().url().optional(),
      sourceAssetId: z.string().uuid().optional(),
      state: z.enum(["planned", "verified", "rejected", "archived"]).default("planned"),
      rights: z.record(z.string(), z.unknown()),
      metadata: z.record(z.string(), z.unknown()).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      ownerOnly(ctx.user.id);
      try {
        return await registerKingcamSupremeAsset({ ownerId: ctx.user.id, ...input });
      } catch (error) {
        throw new TRPCError({ code: "PRECONDITION_FAILED", message: error instanceof Error ? error.message : "KingCam Supreme asset could not be registered." });
      }
    }),

  createCreatorJobCapsule: protectedProcedure
    .input(z.object({
      title: z.string().trim().min(5).max(191),
      characterCanonVersion: z.string().trim().min(2).max(96),
      assetIds: z.array(z.string().uuid()).min(1).max(32),
      performanceBrief: z.record(z.string(), z.unknown()),
      sceneManifest: z.record(z.string(), z.unknown()),
    }))
    .mutation(async ({ ctx, input }) => {
      ownerOnly(ctx.user.id);
      try {
        return await createKingcamCreatorJobCapsule({ ownerId: ctx.user.id, ...input });
      } catch (error) {
        throw new TRPCError({ code: "PRECONDITION_FAILED", message: error instanceof Error ? error.message : "KingCam Creator Job Capsule could not be created." });
      }
    }),
});
