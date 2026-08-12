import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { protectedProcedure, router } from "../_core/trpc";
import {
  createGovernedKingcamIdentityPlan,
  executeGovernedKingcamIdentityPlan,
  getGovernedKingcamIdentityJob,
  listGovernedKingcamIdentityJobs,
  reviewGovernedKingcamIdentityPlan,
} from "../services/governedKingcamIdentityService";

const OWNER_IDS = new Set([6, 33]);
const criteria = z.object({
  facePreservation: z.number().min(0).max(100),
  identityPreservation: z.number().min(0).max(100),
  anatomy: z.number().min(0).max(100),
  skinTexture: z.number().min(0).max(100),
  hands: z.number().min(0).max(100),
  clothingPreservation: z.number().min(0).max(100),
  backgroundStability: z.number().min(0).max(100),
  promptAdherence: z.number().min(0).max(100),
  verticalComposition: z.number().min(0).max(100),
  cinematicQuality: z.number().min(0).max(100),
  artifactRate: z.number().min(0).max(100),
});
function assertOwner(userId: number) {
  if (!OWNER_IDS.has(Number(userId))) throw new TRPCError({ code: "FORBIDDEN", message: "This controlled KingCam benchmark is available to the CreatorVault owner only." });
}

export const governedKingcamIdentityRouter = router({
  plan: protectedProcedure.input(z.object({
    directorRequestId: z.string().uuid(),
    creationProjectId: z.string().uuid().optional(),
    sourceAssetId: z.string().uuid(),
    referenceUrl: z.string().url(),
    prompt: z.string().min(30).max(1800),
    aspectRatio: z.enum(["9:16", "16:9", "1:1"]),
  })).mutation(async ({ ctx, input }) => {
    assertOwner(ctx.user.id);
    return createGovernedKingcamIdentityPlan({ ownerId: ctx.user.id, creatorId: ctx.user.id, ...input });
  }),
  submitOneBoundedBenchmark: protectedProcedure.input(z.object({ jobId: z.string().uuid() })).mutation(async ({ ctx, input }) => {
    assertOwner(ctx.user.id);
    return executeGovernedKingcamIdentityPlan({ ownerId: ctx.user.id, creatorId: ctx.user.id, jobId: input.jobId });
  }),
  review: protectedProcedure.input(z.object({
    jobId: z.string().uuid(), accept: z.boolean(), overallScore: z.number().min(0).max(100), criteria, notes: z.string().min(20).max(2000),
  })).mutation(async ({ ctx, input }) => {
    assertOwner(ctx.user.id);
    return reviewGovernedKingcamIdentityPlan({ ownerId: ctx.user.id, creatorId: ctx.user.id, ...input });
  }),
  get: protectedProcedure.input(z.object({ jobId: z.string().uuid() })).query(async ({ ctx, input }) => {
    assertOwner(ctx.user.id);
    return getGovernedKingcamIdentityJob(ctx.user.id, input.jobId);
  }),
  getMine: protectedProcedure.query(async ({ ctx }) => {
    assertOwner(ctx.user.id);
    return listGovernedKingcamIdentityJobs(ctx.user.id);
  }),
});
