/**
 * Body Cinema tRPC Router — connects the multi-model provider router to the app
 */
import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { BodyCinemaRouter, createDefaultProviderProfiles, generateOutputLadder } from "../services/bodyCinemaProviderRouter";
import { complianceVault } from "../services/complianceVault";
import { randomUUID } from "crypto";

const cinemaRouter = new BodyCinemaRouter();
const configuredProviders: Record<string, boolean> = {
  pollo: !!process.env.POLLO_API_KEY,
  runway: !!process.env.RUNWAY_API_KEY,
  replicate: !!process.env.REPLICATE_API_TOKEN,
  luma: !!process.env.LUMA_API_KEY,
  minimax: !!process.env.MINIMAX_API_KEY,
};
for (const profile of createDefaultProviderProfiles(configuredProviders)) {
  cinemaRouter.registerProvider(profile);
}

export const bodyCinemaRouter = router({
  getProviders: protectedProcedure.query(() => {
    return cinemaRouter.getProviders().map(p => ({
      name: p.name,
      label: p.label,
      tier: p.tier,
      configured: p.capabilities.apiConfigured,
      healthy: p.capabilities.apiHealthy,
      maxDuration: p.capabilities.maxDurationSeconds,
      costPerSecond: p.capabilities.costPerSecondCents,
      models: p.models.map(m => ({ id: m.id, name: m.name, specialization: m.specialization, quality: m.qualityScore })),
    }));
  }),

  submitJob: protectedProcedure.input(z.object({
    sourceAssetUrl: z.string().url(),
    sourceType: z.enum(["image", "video"]),
    goal: z.string(),
    style: z.string(),
    platform: z.string(),
    aspectRatio: z.string().default("9:16"),
    duration: z.number().min(1).max(30).default(5),
    prompt: z.string().optional(),
    motionDirective: z.string().optional(),
    cameraMovement: z.string().optional(),
    identityLock: z.boolean().default(true),
    preferredProvider: z.string().optional(),
    qualityThreshold: z.number().min(0).max(100).default(70),
  })).mutation(async ({ ctx, input }) => {
    const eligibility = complianceVault.checkGenerationEligibility(String(ctx.user.id), "GLOBAL");
    if (!eligibility.eligible) {
      throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Compliance check failed: " + eligibility.blockers.join("; ") });
    }
    const job = {
      id: randomUUID(),
      userId: String(ctx.user.id),
      goal: input.goal as any,
      sourceAssetUrl: input.sourceAssetUrl,
      sourceType: input.sourceType as any,
      style: input.style as any,
      platform: input.platform as any,
      aspectRatio: input.aspectRatio,
      duration: input.duration,
      prompt: input.prompt,
      motionDirective: input.motionDirective,
      cameraMovement: input.cameraMovement,
      identityLock: input.identityLock,
      preferredProvider: input.preferredProvider as any,
      qualityThreshold: input.qualityThreshold,
      maxRetries: 2,
      consentVerified: true,
      ageVerified: true,
    };
    return cinemaRouter.submitJob(job);
  }),

  generateOutputLadder: protectedProcedure.input(z.object({
    sourceAssetUrl: z.string().url(),
    sourceType: z.enum(["image", "video"]),
    style: z.string(),
  })).mutation(({ ctx, input }) => {
    const jobs = generateOutputLadder(String(ctx.user.id), input.sourceAssetUrl, input.sourceType, input.style as any);
    return { jobCount: jobs.length, jobs: jobs.slice(0, 5) };
  }),

  getJobStatus: protectedProcedure.input(z.object({ jobId: z.string() })).query(({ input }) => {
    return cinemaRouter.getJobStatus(input.jobId) || { status: "not_found" };
  }),
});
