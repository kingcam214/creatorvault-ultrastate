import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import {
  listCreationProofs,
  reviewCreationProof,
  type CreativeMethod,
  type ProofClass,
  type ProofStatus,
} from "../services/creationProofService";

const OWNER_IDS = new Set([6, 33]);

function assertOwner(ctx: { user: { id: number; role: string } }): void {
  if (!OWNER_IDS.has(Number(ctx.user.id)) && !["king", "admin"].includes(String(ctx.user.role))) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Owner approval is required before CreatorVault can certify public proof." });
  }
}

const proofClassSchema = z.enum(["gold_standard", "public_showcase", "flagship"]);
const proofStatusSchema = z.enum(["candidate", "certified", "rejected", "retired"]);
const creativeMethodSchema = z.enum(["creator_capture", "professional_editorial", "premium_hosted", "controlled_gpu"]);

const reviewPacketSchema = z.object({
  watchableUrl: z.string().url(),
  contactSheetUrl: z.string().url(),
  continuousPlaybackReviewed: z.boolean(),
  sourceLineageVerified: z.boolean(),
  rightsAndConsentVerified: z.boolean(),
  rejectionLedgerChecked: z.boolean(),
  publicClassification: z.enum(["creator_owned", "creatorvault_demo", "approved_campaign"]),
  evidenceSummary: z.string().min(32).max(5000),
});

export const creationProofRouter = router({
  getMine: protectedProcedure
    .input(z.object({ status: proofStatusSchema.optional() }).optional())
    .query(async ({ ctx, input }) => {
      return listCreationProofs(Number(ctx.user.id), input?.status as ProofStatus | undefined);
    }),

  review: protectedProcedure
    .input(z.object({
      assetId: z.string().min(3).max(191),
      creationProjectId: z.string().uuid().optional(),
      proofClass: proofClassSchema,
      creativeMethod: creativeMethodSchema,
      technicalScore: z.number().min(0).max(100),
      identityScore: z.number().min(0).max(100),
      editorialScore: z.number().min(0).max(100),
      sourceTruthScore: z.number().min(0).max(100),
      commercialScore: z.number().min(0).max(100),
      reviewPacket: reviewPacketSchema,
      reviewNotes: z.string().max(5000),
      rejectionReason: z.string().max(5000).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      assertOwner(ctx);
      try {
        return await reviewCreationProof({
          creatorId: Number(ctx.user.id),
          reviewedBy: Number(ctx.user.id),
          assetId: input.assetId,
          creationProjectId: input.creationProjectId || null,
          proofClass: input.proofClass as ProofClass,
          creativeMethod: input.creativeMethod as CreativeMethod,
          technicalScore: input.technicalScore,
          identityScore: input.identityScore,
          editorialScore: input.editorialScore,
          sourceTruthScore: input.sourceTruthScore,
          commercialScore: input.commercialScore,
          reviewPacket: input.reviewPacket,
          reviewNotes: input.reviewNotes,
          rejectionReason: input.rejectionReason || null,
        });
      } catch (error: any) {
        throw new TRPCError({ code: "PRECONDITION_FAILED", message: error?.message || "CreatorVault could not certify this proof." });
      }
    }),
});
