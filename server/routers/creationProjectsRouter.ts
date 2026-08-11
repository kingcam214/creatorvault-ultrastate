import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import {
  createCreationProject,
  getCreationProjectDashboard,
  listCreationProjects,
  updateCreationProjectLinks,
  acceptInspectedAssemblyRender,
  type CreationProjectState,
} from "../services/creationProjectService";

const projectStateSchema = z.enum([
  "building",
  "waiting_on_source",
  "ready_to_create",
  "in_progress",
  "ready_to_review",
  "accepted",
  "prepared_to_share",
  "blocked",
  "archived",
]);

const optionalId = z.string().min(1).max(191).nullable().optional();

export const creationProjectsRouter = router({
  open: protectedProcedure.input(z.object({
    title: z.string().min(2).max(191),
    intent: z.string().min(3).max(3000),
    outputPurpose: z.string().min(3).max(191),
    sourceAssetId: optionalId,
    identityReference: z.string().min(1).max(191).nullable().optional(),
    metadata: z.record(z.string(), z.unknown()).optional(),
  })).mutation(async ({ ctx, input }) => {
    try {
      return await createCreationProject({
        creatorId: Number(ctx.user.id),
        title: input.title,
        intent: input.intent,
        outputPurpose: input.outputPurpose,
        sourceAssetId: input.sourceAssetId || null,
        identityReference: input.identityReference || null,
        metadata: input.metadata || {},
      });
    } catch (error: any) {
      throw new TRPCError({ code: "PRECONDITION_FAILED", message: error?.message || "CreatorVault could not open this creation." });
    }
  }),

  listMine: protectedProcedure.input(z.object({ limit: z.number().int().min(1).max(100).default(30) }).optional())
    .query(async ({ ctx, input }) => listCreationProjects(Number(ctx.user.id), input?.limit || 30)),

  getMine: protectedProcedure.input(z.object({ projectId: z.string().uuid() })).query(async ({ ctx, input }) => {
    const project = await getCreationProjectDashboard(Number(ctx.user.id), input.projectId);
    if (!project) throw new TRPCError({ code: "NOT_FOUND", message: "CreatorVault could not find this creation." });
    return project;
  }),

  acceptAssemblyMaster: protectedProcedure.input(z.object({
    projectId: z.string().uuid(),
    renderJobId: z.string().min(1).max(96),
    outputUrl: z.string().url(),
    qualityScore: z.number().min(75).max(100),
    qualityNote: z.string().min(12).max(2000),
  })).mutation(async ({ ctx, input }) => {
    try {
      return await acceptInspectedAssemblyRender({
        creatorId: Number(ctx.user.id),
        actorId: Number(ctx.user.id),
        ...input,
      });
    } catch (error: any) {
      throw new TRPCError({ code: "PRECONDITION_FAILED", message: error?.message || "CreatorVault could not place this approved master in your Vault." });
    }
  }),

  link: protectedProcedure.input(z.object({
    projectId: z.string().uuid(),
    sourceAssetId: optionalId,
    sourceEvidenceId: z.string().uuid().nullable().optional(),
    treatmentId: z.string().min(1).max(96).nullable().optional(),
    identityReference: z.string().min(1).max(191).nullable().optional(),
    audioAssetId: z.string().uuid().nullable().optional(),
    creationDirectorRequestId: z.string().uuid().nullable().optional(),
    renderJobId: z.string().min(1).max(96).nullable().optional(),
    acceptedAssetId: optionalId,
    socialPackageId: z.string().uuid().nullable().optional(),
    state: projectStateSchema.optional(),
    metadata: z.record(z.string(), z.unknown()).optional(),
  })).mutation(async ({ ctx, input }) => {
    try {
      const { projectId, ...patch } = input;
      return await updateCreationProjectLinks({
        creatorId: Number(ctx.user.id),
        projectId,
        actorId: Number(ctx.user.id),
        patch: patch as { state?: CreationProjectState },
      });
    } catch (error: any) {
      throw new TRPCError({ code: "PRECONDITION_FAILED", message: error?.message || "CreatorVault could not connect this creation step." });
    }
  }),
});
