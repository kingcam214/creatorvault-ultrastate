import { TRPCError } from "@trpc/server";
import { protectedProcedure, router } from "../_core/trpc";
import { createGovernedPolloDraft, getGovernedPolloJobByRequestId } from "../services/governedPolloService";

const OWNER_IDS = new Set([6, 33]);
const DESIGN_IMAGE_PILOT_MODEL = "pollo/openai-gpt-image-2-0";
const DESIGN_IMAGE_PILOT_MODE = "design_image_reference_thumbnail";
const DESIGN_IMAGE_PILOT_CREDIT_CAP = 100;
const DESIGN_IMAGE_PILOT_IDEMPOTENCY_KEY = "design-image-pilot-luxury-gold-room-female-creator-v1";
const DESIGN_IMAGE_PILOT_REQUEST_ID = "design-image-pilot-luxury-gold-room-female-creator-v1";
const DESIGN_IMAGE_SOURCE_URL = "https://creatorvault.live/uploads/content-vault/7999b534-ca99-4376-8705-19f087b32b6b/CreatorVault-Demo-Source--Luxury-Gold-Room-1080.mp4";

const DESIGN_IMAGE_PILOT_PROMPT = [
  "Create one original 16:9 premium CreatorVault editorial image using the supplied reference frame as the identity, wardrobe, and lighting anchor.",
  "Keep exactly one female-presenting Black creative entrepreneur, fully dressed in the elegant white satin dress from the reference. Preserve her natural facial features, skin tone, anatomy, jewelry, and luxury editorial environment. Recompose the scene for a cinematic wide 16:9 campaign image with the subject visible from head to toe, positioned slightly right of center, and leave refined negative space on the left for future creator-controlled messaging.",
  "Photoreal luxury fashion campaign photography, warm gold practical light, deep editorial shadows, credible materials, calm confidence, crisp but natural skin detail, high-end CreatorVault visual language.",
  "No male people, no additional people, no phone, no screen, no chart, no dashboard, no watch, no gears, no infographic, no product mockup, no text, no logo, no watermark, no plastic skin, no illustration, no distorted anatomy, no extra limbs, no stock-photo look.",
].join(" ");

function requireOwner(userId: number): void {
  if (!OWNER_IDS.has(Number(userId))) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Only the CreatorVault owner can authorize this bounded design-image pilot." });
  }
}

export const designImagePilotRouter = router({
  create: protectedProcedure.mutation(async ({ ctx }) => {
    requireOwner(ctx.user.id);
    try {
      const draft = await createGovernedPolloDraft({
        creatorId: ctx.user.id,
        requestedBy: ctx.user.id,
        sourceUrl: DESIGN_IMAGE_SOURCE_URL,
        sourceChecksum: "613aba86-72e2-470e-811d-df0683d49e74",
        prompt: DESIGN_IMAGE_PILOT_PROMPT,
        providerModelPath: DESIGN_IMAGE_PILOT_MODEL,
        resolution: "1080p",
        durationSeconds: 1,
        aspectRatio: "16:9",
        mode: DESIGN_IMAGE_PILOT_MODE,
        outputCount: 1,
        estimatedCostCredits: DESIGN_IMAGE_PILOT_CREDIT_CAP,
        costEvidenceReference: "Official Pollo GPT Image 2 contract reviewed 2026-08-14. The documented text-or-image endpoint supports 16:9 and 2K output but exposes no task-specific quote endpoint. This owner-authorized pilot is hard-capped at 100 Pollo credits and permits exactly one 2K output.",
        ownershipConfirmed: true,
        consentConfirmed: true,
        idempotencyKey: DESIGN_IMAGE_PILOT_IDEMPOTENCY_KEY,
        requestId: DESIGN_IMAGE_PILOT_REQUEST_ID,
        metadata: {
          designImagePilot: true,
          ownerDirectedPilot: true,
          candidateLimit: 1,
          noAutomaticRetry: true,
          hardCreditCap: DESIGN_IMAGE_PILOT_CREDIT_CAP,
          sourceAssetId: "613aba86-72e2-470e-811d-df0683d49e74",
          sourceClassification: "approved_demo",
          qualityRejectIf: ["male imagery", "additional people", "phones", "charts", "watches", "gears", "text or watermarks", "generic stock look", "plastic skin", "anatomy defects", "reference identity drift"],
        },
      });
      return { ...draft, executionPlan: { provider: "Pollo / GPT Image 2", maximumOutputs: 1, hardCreditCap: DESIGN_IMAGE_PILOT_CREDIT_CAP, resolution: "2K", qualityReviewRequired: true, placementBlockedUntilAccepted: true } };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Design-image pilot could not be prepared.";
      throw new TRPCError({ code: "PRECONDITION_FAILED", message });
    }
  }),

  job: protectedProcedure.query(async ({ ctx }) => {
    requireOwner(ctx.user.id);
    return getGovernedPolloJobByRequestId(DESIGN_IMAGE_PILOT_REQUEST_ID);
  }),
});
