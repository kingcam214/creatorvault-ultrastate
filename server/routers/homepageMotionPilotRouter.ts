import { TRPCError } from "@trpc/server";
import { protectedProcedure, router } from "../_core/trpc";
import { createGovernedPolloDraft, getGovernedPolloJobByRequestId } from "../services/governedPolloService";

const OWNER_IDS = new Set([6, 33]);
const HOMEPAGE_PILOT_MODEL = "pollo/google-veo-3-1";
const HOMEPAGE_PILOT_MODE = "homepage_text2video";
const HOMEPAGE_PILOT_CREDIT_CAP = 150;
const HOMEPAGE_PILOT_IDEMPOTENCY_KEY = "homepage-motion-pilot-female-creator-veo-3-1-v2-safe-brief";
const HOMEPAGE_PILOT_REQUEST_ID = "homepage-motion-pilot-veo-3-1-v2-safe-brief";

const HOMEPAGE_PILOT_PROMPT = [
  "One original Black woman creative entrepreneur, alone in a warm dark editorial studio with rich black velvet, deep amber practical light, and soft architectural shadows.",
  "She is fully dressed in a tailored floor-length black evening gown. Her full body remains visible from head to toe throughout the shot; she takes one calm confident step forward, turns naturally toward camera, and holds a powerful relaxed stance.",
  "Luxury fashion-campaign cinematography, 35mm lens, deliberate slow dolly, natural anatomy, natural hands, realistic skin detail, stable wardrobe and stable face, no cuts.",
  "Premium CreatorVault campaign visual celebrating female creative ownership. Keep the styling elegant and fully clothed.",
  "No male people, no other people, no phone, no screen, no chart, no dashboard, no watch, no gears, no infographic, no product mockup, no text, no logo, no watermark, no plastic skin, no morphing, no distorted anatomy, no extra limbs.",
].join(" ");

function requireOwner(userId: number): void {
  if (!OWNER_IDS.has(Number(userId))) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Only the CreatorVault owner can authorize a bounded homepage motion pilot." });
  }
}

export const homepageMotionPilotRouter = router({
  create: protectedProcedure.mutation(async ({ ctx }) => {
    requireOwner(ctx.user.id);
    try {
      const draft = await createGovernedPolloDraft({
        creatorId: ctx.user.id,
        requestedBy: ctx.user.id,
        // This is a provenance key for an original promotional motion brief, not a media URL.
        sourceUrl: "creatorvault://homepage-motion-brief/female-creator-v1",
        sourceChecksum: null,
        prompt: HOMEPAGE_PILOT_PROMPT,
        providerModelPath: HOMEPAGE_PILOT_MODEL,
        resolution: "1080p",
        durationSeconds: 6,
        aspectRatio: "9:16",
        mode: HOMEPAGE_PILOT_MODE,
        outputCount: 1,
        estimatedCostCredits: HOMEPAGE_PILOT_CREDIT_CAP,
        costEvidenceReference: "Official Pollo Veo 3.1 API and pricing catalog reviewed 2026-08-14; the documented generation API exposes no task-specific estimate endpoint. This owner-authorized pilot is hard-capped at 150 Pollo credits and permits exactly one 6-second 1080p output.",
        ownershipConfirmed: true,
        consentConfirmed: true,
        idempotencyKey: HOMEPAGE_PILOT_IDEMPOTENCY_KEY,
        requestId: HOMEPAGE_PILOT_REQUEST_ID,
        metadata: {
          homepageMotionPilot: true,
          ownerDirectedPilot: true,
          candidateLimit: 1,
          noAutomaticRetry: true,
          hardCreditCap: HOMEPAGE_PILOT_CREDIT_CAP,
          publicClassification: "controlled promotional visual; not a product-result, revenue, or creator-activity claim",
          audience: "adult female creators",
          qualityRejectIf: ["male imagery", "additional people", "phones", "charts", "watches", "gears", "text or watermarks", "generic stock look", "plastic skin", "anatomy defects", "stiff or morphing movement"],
        },
      });
      return {
        ...draft,
        executionPlan: {
          provider: "Pollo / Google Veo 3.1",
          maximumOutputs: 1,
          hardCreditCap: HOMEPAGE_PILOT_CREDIT_CAP,
          durationSeconds: 6,
          resolution: "1080p",
          qualityReviewRequired: true,
          publicPlacementBlockedUntilAccepted: true,
        },
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Homepage motion pilot could not be prepared.";
      throw new TRPCError({ code: "PRECONDITION_FAILED", message });
    }
  }),

  job: protectedProcedure.query(async ({ ctx }) => {
    requireOwner(ctx.user.id);
    const job = await getGovernedPolloJobByRequestId(HOMEPAGE_PILOT_REQUEST_ID);
    if (!job) return null;
    return job;
  }),
});
