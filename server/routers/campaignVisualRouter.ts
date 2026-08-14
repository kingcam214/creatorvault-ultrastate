import { TRPCError } from "@trpc/server";
import { sql } from "drizzle-orm";
import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import * as db from "../db";
import { createCreationProject, updateCreationProjectLinks } from "../services/creationProjectService";
import { createGovernedPolloDraft, getGovernedPolloJob } from "../services/governedPolloService";

const OWNER_IDS = new Set([6, 33]);
const GOVERNED_IMAGE_MODEL = "pollo/openai-gpt-image-2-0";
const GOVERNED_IMAGE_MODE = "design_image_reference_thumbnail";
const HARD_CREDIT_CAP = 100;

/**
 * This is intentionally a registry, not a library-wide guess.  A source joins
 * this list only after it has been inspected for the public female-only visual
 * rule and confirmed as an owned, durable CreatorVault asset.
 */
const CERTIFIED_CAMPAIGN_SOURCES = {
  "613aba86-72e2-470e-811d-df0683d49e74": {
    sourceUrl: "https://creatorvault.live/uploads/content-vault/7999b534-ca99-4376-8705-19f087b32b6b/CreatorVault-Demo-Source--Luxury-Gold-Room-1080.mp4",
    label: "Luxury Gold Room — Certified Creator Source",
    classification: "approved_female_creator_reference",
  },
} as const;

type CertifiedSourceId = keyof typeof CERTIFIED_CAMPAIGN_SOURCES;

const CAMPAIGN_VISUAL_PROMPT = [
  "Create one original 16:9 premium CreatorVault editorial campaign image using the supplied reference frame as the identity, wardrobe, lighting, and environment anchor.",
  "Keep exactly one female-presenting Black creative entrepreneur, fully dressed, and preserve her natural facial features, skin tone, anatomy, wardrobe, jewelry, and luxury environment. Show her full body, positioned slightly right of center, leaving refined negative space on the left for future creator-controlled messaging.",
  "Photoreal luxury fashion campaign photography with warm gold practical light, deep editorial shadows, credible materials, calm confidence, crisp natural skin detail, and CreatorVault's dark luxury visual language.",
  "No male people, no additional people, no phone, no screen, no chart, no dashboard, no watch, no gears, no infographic, no product mockup, no text, no logo, no watermark, no plastic skin, no illustration, no distorted anatomy, no extra limbs, and no stock-photo look.",
].join(" ");

function requireOwner(userId: number): void {
  if (!OWNER_IDS.has(Number(userId))) {
    throw new TRPCError({ code: "FORBIDDEN", message: "This CreatorVault campaign visual is reserved for the owner workspace." });
  }
}

function rowsFromExecute(result: unknown): any[] {
  if (Array.isArray(result) && Array.isArray(result[0])) return result[0] as any[];
  if (Array.isArray(result)) return result as any[];
  return (result as any)?.rows ?? [];
}

async function requireCertifiedOwnedSource(creatorId: number, sourceAssetId: string) {
  const source = CERTIFIED_CAMPAIGN_SOURCES[sourceAssetId as CertifiedSourceId];
  if (!source) {
    throw new TRPCError({
      code: "PRECONDITION_FAILED",
      message: "Choose a certified CreatorVault campaign source. Other vault media stays protected until its visual and consent review is complete.",
    });
  }

  const rows = rowsFromExecute(await db.db.execute(sql`
    SELECT id, user_id, asset_type, mime_type, public_url, storage_path, status
    FROM media_assets
    WHERE id = ${sourceAssetId} AND user_id = ${creatorId} AND status = 'ready'
    LIMIT 1
  `));
  const asset = rows[0];
  if (!asset || !(String(asset.asset_type || "").toLowerCase() === "video" || String(asset.mime_type || "").startsWith("video/"))) {
    throw new TRPCError({ code: "NOT_FOUND", message: "That certified campaign source is no longer ready in your CreatorVault Media Vault." });
  }
  if (String(asset.public_url || "") !== source.sourceUrl) {
    throw new TRPCError({ code: "PRECONDITION_FAILED", message: "CreatorVault could not verify the durable source behind this campaign visual." });
  }
  return { asset, source };
}

export const campaignVisualRouter = router({
  sources: protectedProcedure.query(async ({ ctx }) => {
    requireOwner(ctx.user.id);
    const available: Array<{ id: string; label: string; sourceUrl: string; classification: string }> = [];
    for (const [id, source] of Object.entries(CERTIFIED_CAMPAIGN_SOURCES)) {
      try {
        await requireCertifiedOwnedSource(ctx.user.id, id);
        available.push({ id, label: source.label, sourceUrl: source.sourceUrl, classification: source.classification });
      } catch {
        // A source that has become unavailable is deliberately not offered.
      }
    }
    return available;
  }),

  createDraft: protectedProcedure
    .input(z.object({ sourceAssetId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      requireOwner(ctx.user.id);
      const { source } = await requireCertifiedOwnedSource(ctx.user.id, input.sourceAssetId);
      const idempotencyKey = `campaign-visual:${ctx.user.id}:${input.sourceAssetId}:v1`;
      const project = await createCreationProject({
        creatorId: ctx.user.id,
        title: "CreatorVault Campaign Visual",
        intent: "Create a premium campaign visual from a certified saved CreatorVault source.",
        outputPurpose: "Campaign visual",
        sourceAssetId: input.sourceAssetId,
        metadata: {
          enteredFrom: "kingcam_content",
          certifiedSourceClassification: source.classification,
          visualLaw: "BRAND_DNA_QUALITY_LAW.md",
        },
      });
      try {
        const draft = await createGovernedPolloDraft({
          creatorId: ctx.user.id,
          requestedBy: ctx.user.id,
          sourceUrl: source.sourceUrl,
          sourceChecksum: input.sourceAssetId,
          prompt: CAMPAIGN_VISUAL_PROMPT,
          providerModelPath: GOVERNED_IMAGE_MODEL,
          resolution: "1080p",
          durationSeconds: 1,
          aspectRatio: "16:9",
          mode: GOVERNED_IMAGE_MODE,
          outputCount: 1,
          estimatedCostCredits: HARD_CREDIT_CAP,
          costEvidenceReference: "Official Pollo GPT Image 2 contract reviewed 2026-08-14. This owner-directed CreatorVault campaign visual is restricted to one 16:9 output and a 100-credit hard cap.",
          ownershipConfirmed: true,
          consentConfirmed: true,
          idempotencyKey,
          requestId: `campaign-visual-${input.sourceAssetId.slice(0, 8)}-v1`,
          metadata: {
            designImagePilot: true,
            ownerDirectedPilot: true,
            campaignVisual: true,
            candidateLimit: 1,
            noAutomaticRetry: true,
            hardCreditCap: HARD_CREDIT_CAP,
            sourceAssetId: input.sourceAssetId,
            sourceClassification: source.classification,
            creationProjectId: project.id,
            qualityRejectIf: ["male imagery", "additional people", "phones", "charts", "watches", "gears", "text or watermarks", "generic stock look", "plastic skin", "anatomy defects", "reference identity drift"],
          },
        });
        await updateCreationProjectLinks({
          creatorId: ctx.user.id,
          projectId: project.id,
          actorId: ctx.user.id,
          patch: {
            state: "ready_to_create",
            metadata: { governedCampaignVisualJobId: draft.job.id, governedCampaignVisualRequestId: draft.job.requestId },
          },
        });
        return {
          projectId: project.id,
          job: draft.job,
          reused: draft.reused,
          executionPlan: {
            provider: "Pollo / GPT Image 2",
            source: source.label,
            maximumOutputs: 1,
            hardCreditCap: HARD_CREDIT_CAP,
            reviewRequiredBeforeVaultPlacement: true,
          },
        };
      } catch (error) {
        throw new TRPCError({ code: "PRECONDITION_FAILED", message: error instanceof Error ? error.message : "CreatorVault could not prepare this campaign visual." });
      }
    }),

  job: protectedProcedure
    .input(z.object({ jobId: z.number().int().positive() }))
    .query(async ({ ctx, input }) => {
      requireOwner(ctx.user.id);
      const job = await getGovernedPolloJob(input.jobId);
      if (!job || job.creatorId !== ctx.user.id || job.metadata.campaignVisual !== true) {
        throw new TRPCError({ code: "NOT_FOUND", message: "This campaign visual could not be found." });
      }
      return job;
    }),
});
