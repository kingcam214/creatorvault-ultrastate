/**
 * ============================================================================
 * TRAILER ROUTER — viral adult teaser/trailer builder
 *   trailer.getTemplates    — list viral trailer templates
 *   trailer.build           — build from raw clips with full control
 *   trailer.buildFromTemplate — one-tap viral trailer from a template
 *   trailer.getStatus       — poll a trailer job
 * ============================================================================
 */
import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc.js";
import { TRPCError } from "@trpc/server";
import { startTrailer, getTrailerJob } from "../services/trailerEngine.js";
import { db } from "../db";
import { sql } from "drizzle-orm";
import { buildCinematicPacingPlan } from "../services/cinematicPacingEngine.js";
import { startRender } from "../services/realRenderEngine.js";
import { assertAudioRights, getAudioAnalysis, getCanonicalAudioAsset } from "../services/audioIntelligenceService.js";
import { buildCreationCapabilities, prepareCreationPlan, toCreatorFacingCreationPlan } from "../services/creationDirector";

function legacyCreativeRenderBlocked(): never {
  throw new TRPCError({
    code: "PRECONDITION_FAILED",
    message: "Your source and trailer plan are saved. CreatorVault will not run the old visual-effects builder because it cannot meet the current finished-work standard.",
  });
}

// ─── Viral trailer templates ──────────────────────────────────────────────────
export interface TrailerTemplate {
  id: string;
  name: string;
  emoji: string;
  tagline: string;
  vibe: "cinematic_heat" | "luxe_gold" | "neon_night" | "noir_afterdark" | "velvet_midnight";
  intensity: "ultra" | "fast" | "medium" | "slow" | "minimal";
  focusRotation: string[];
  hookText?: string;
  ctaText: string;
  ctaSubText: string;
  bestFor: string;
  conversionScore: number; // 1..10
  polish?: boolean;        // film grain + bloom
  transitions?: boolean;   // xfade between cuts
  aiRemix?: boolean;       // AI generates new camera angles from the upload
}

export const TRAILER_TEMPLATES: TrailerTemplate[] = [
  {
    id: "ppv-tease", name: "PPV Tease", emoji: "🔥", tagline: "Hook → escalate → cut to black. The highest-converting PPV trailer.",
    vibe: "cinematic_heat", intensity: "fast", focusRotation: ["face", "chest", "waist", "abs", "butt"],
    hookText: "wait for it…", ctaText: "UNLOCK THE FULL DROP", ctaSubText: "Link in bio 🔓", bestFor: "PPV sales", conversionScore: 10,
  },
  {
    id: "countdown-drop", name: "Countdown Drop", emoji: "⏱️", tagline: "Builds urgency to a hard cut-off. Perfect for timed drops.",
    vibe: "neon_night", intensity: "fast", focusRotation: ["face", "waist", "hips", "butt", "legs"],
    hookText: "dropping tonight", ctaText: "DON'T MISS THE DROP", ctaSubText: "Tonight only ⏳", bestFor: "Timed releases", conversionScore: 9,
  },
  {
    id: "body-reel", name: "Body Reel", emoji: "💎", tagline: "Pure body-focus montage — abs, waist, curves rotating on the beat.",
    vibe: "luxe_gold", intensity: "fast", focusRotation: ["abs", "waist", "hips", "butt", "thighs", "legs"],
    hookText: undefined, ctaText: "SEE THE FULL VERSION", ctaSubText: "Unlock now 💎", bestFor: "Body content", conversionScore: 10,
  },
  {
    id: "before-unlock", name: "Before The Unlock", emoji: "🚪", tagline: "Slow-burn tease that stops right before the reveal.",
    vibe: "velvet_midnight", intensity: "slow", focusRotation: ["face", "back", "lowerback", "silhouette"],
    hookText: "you're not ready", ctaText: "OPEN THE DOOR", ctaSubText: "Full drop inside 🔥", bestFor: "Subscriber tease", conversionScore: 9,
  },
  {
    id: "after-dark", name: "After Dark", emoji: "🌙", tagline: "Moody noir trailer for late-night high-intent audiences.",
    vibe: "noir_afterdark", intensity: "medium", focusRotation: ["face", "chest", "thighs", "lowerback"],
    hookText: undefined, ctaText: "AFTER DARK ACCESS", ctaSubText: "VIP only 🖤", bestFor: "Night drops", conversionScore: 8,
  },
  {
    id: "tiktok-hook", name: "TikTok Hook", emoji: "📱", tagline: "Scroll-stopping 1.5s hook + fast cuts tuned for the algorithm.",
    vibe: "cinematic_heat", intensity: "fast", focusRotation: ["face", "waist", "abs", "hips"],
    hookText: "the full version is insane", ctaText: "FULL VIDEO IN BIO", ctaSubText: "🔗", bestFor: "TikTok/Reels reach", conversionScore: 9, polish: true, transitions: true,
  },
  {
    id: "luxury-film", name: "Luxury Film", emoji: "🥂", tagline: "Slow cinematic film look with smooth transitions — feels like a campaign.",
    vibe: "luxe_gold", intensity: "slow", focusRotation: ["face", "silhouette", "waist", "back"],
    hookText: undefined, ctaText: "ENTER THE SUITE", ctaSubText: "VIP access 🥂", bestFor: "High-ticket VIP", conversionScore: 9, polish: true, transitions: true,
  },
  {
    id: "glitch-drop", name: "Glitch Drop", emoji: "⚡", tagline: "Hard, fast, high-energy cuts with punch-ins — maximum scroll-stop.",
    vibe: "neon_night", intensity: "fast", focusRotation: ["face", "abs", "butt", "thighs", "hips", "waist"],
    hookText: "you've never seen this", ctaText: "UNLOCK IT ALL", ctaSubText: "Tap the link ⚡", bestFor: "Max engagement", conversionScore: 10, polish: true, transitions: false,
  },
  {
    id: "slow-burn", name: "Slow Burn", emoji: "🕯️", tagline: "Intimate, sensual pacing that builds to a single reveal.",
    vibe: "velvet_midnight", intensity: "slow", focusRotation: ["face", "chest", "lowerback", "silhouette"],
    hookText: "come closer", ctaText: "THE REST IS PRIVATE", ctaSubText: "Unlock me 🕯️", bestFor: "Intimate PPV", conversionScore: 9, polish: true, transitions: true,
  },
  {
    id: "ai-remix", name: "AI Remix", emoji: "🧠", tagline: "AI reshoots your clip from all-new camera angles — looks nothing like the original.",
    vibe: "cinematic_heat", intensity: "fast", focusRotation: ["face", "chest", "waist", "abs", "butt", "legs"],
    hookText: "made by AI", ctaText: "UNLOCK THE FULL DROP", ctaSubText: "Only on the link 🔓", bestFor: "Maximum wow-factor", conversionScore: 10, polish: true, transitions: true, aiRemix: true,
  },
  {
    id: "ultra-blitz", name: "Ultra Blitz", emoji: "⚡⚡", tagline: "Maximum speed, maximum cuts, maximum energy. 14 cuts in 8 seconds.",
    vibe: "neon_night", intensity: "ultra", focusRotation: ["face", "abs", "butt", "thighs", "waist", "hips", "legs", "chest", "back", "lowerback", "silhouette", "face"],
    hookText: "brace yourself", ctaText: "UNLOCK IT ALL", ctaSubText: "You're not ready ⚡", bestFor: "Maximum scroll-stop", conversionScore: 10, polish: true, transitions: false,
  },
  {
    id: "cinematic-opus", name: "Cinematic Opus", emoji: "🎭", tagline: "The most cinematic trailer possible. Slow, deliberate, every frame a work of art.",
    vibe: "velvet_midnight", intensity: "minimal", focusRotation: ["silhouette", "face", "back", "lowerback"],
    hookText: undefined, ctaText: "ENTER IF YOU DARE", ctaSubText: "The full opus awaits 🎭", bestFor: "High-art premium content", conversionScore: 9, polish: true, transitions: true,
  },
  {
    id: "full-spectrum", name: "Full Spectrum", emoji: "🌈", tagline: "Every body feature, every angle, every vibe. The complete showcase.",
    vibe: "luxe_gold", intensity: "fast", focusRotation: ["face", "chest", "waist", "abs", "hips", "butt", "thighs", "legs", "back", "lowerback", "silhouette", "face"],
    hookText: "the full picture", ctaText: "SEE EVERYTHING", ctaSubText: "Full access inside 🌈", bestFor: "Complete body showcase", conversionScore: 10, polish: true, transitions: true,
  },
];

const clipSchema = z.object({ src: z.string(), trimStart: z.number().optional(), trimEnd: z.number().optional() });
const sourceProofSchema = z.object({
  sourceEvidenceId: z.string().uuid().optional(),
  sourceFingerprint: z.string().regex(/^[a-f0-9]{16,128}$/i).optional(),
  ownershipConfirmed: z.boolean().default(false),
  consentConfirmed: z.boolean().default(false),
  adultVerified: z.boolean().default(false),
}).optional();

function requestsNewTrailerShots(mode: string | undefined, aiRemix?: boolean): boolean {
  const resolved = mode || (aiRemix ? "ai_remix" : "original");
  return ["ai_full_shoot", "ai_remix", "hybrid", "photo_cinematic"].includes(resolved);
}

async function prepareTrailerShotPath(input: {
  clips: Array<{ src: string; trimStart?: number; trimEnd?: number }>;
  title?: string;
  vibe?: string;
  aspect: "9:16" | "16:9" | "1:1";
  focusRotation?: string[];
  mode?: string;
  aiRemix?: boolean;
  sourceProof?: { sourceEvidenceId?: string; sourceFingerprint?: string; ownershipConfirmed: boolean; consentConfirmed: boolean; adultVerified: boolean };
}, creatorId: number) {
  const source = input.clips[0];
  const sourceProof = input.sourceProof || { ownershipConfirmed: false, consentConfirmed: false, adultVerified: false };
  const plan = await prepareCreationPlan({
    creatorId,
    requestedBy: creatorId,
    tool: "trailer_maker",
    intent: input.title || "Create a premium trailer shot with a materially different camera moment.",
    outputPurpose: "Trailer Maker shot library",
    source: {
      assetUrl: source.src,
      sourceEvidenceId: sourceProof.sourceEvidenceId || null,
      sourceFingerprint: sourceProof.sourceFingerprint || null,
      ownershipConfirmed: sourceProof.ownershipConfirmed,
      consentConfirmed: sourceProof.consentConfirmed,
      adultVerified: sourceProof.adultVerified,
    },
    capabilities: buildCreationCapabilities({
      requiresGeneratedShot: true,
      requiredInputModes: ["reference_video"],
      requiredOutputMode: "video",
      durationSeconds: 6,
      resolution: "720p",
      preserveIdentity: true,
      naturalBody: true,
      preserveProps: true,
      cameraControl: true,
      minimumQualityScore: 75,
    }),
    creativeDirection: {
      treatment: input.vibe || "trailer-shot",
      prompt: `Create one distinct, premium camera moment for the approved trailer direction. Preserve the creator identity, outfit, visible props, and source context. Camera language: ${(input.focusRotation || ["full-body", "face", "waist"]).join(", ")}.`,
      motionPlan: "Natural confident movement with a clear visual payoff; do not repeat a static pose.",
      cameraPlan: "One deliberate cinematic camera move matched to the source scene.",
      identityRequirements: ["preserve creator identity", "preserve visible outfit", "preserve visible props", "natural anatomy and movement"],
      sourceAnalysisReference: sourceProof.sourceEvidenceId || null,
    },
    output: { durationSeconds: 6, aspectRatio: input.aspect, resolution: "720p" },
    metadata: {
      requestedMode: input.mode || (input.aiRemix ? "ai_remix" : "original"),
      finalTrailerAssembly: "Trailer Maker will only use an accepted shot after independent quality review.",
    },
  });
  return { id: plan.requestId, directorState: plan.state, ...toCreatorFacingCreationPlan(plan) };
}

export const trailerRouter = router({
  getTemplates: protectedProcedure.query(() => ({
    templates: TRAILER_TEMPLATES
      .filter((template) => !template.aiRemix && !template.polish && !template.transitions)
      .map(({ id, name, emoji, tagline, vibe, intensity, focusRotation, hookText, ctaText, ctaSubText, bestFor }) => ({
        id,
        name,
        emoji,
        tagline,
        vibe,
        intensity,
        focusRotation,
        hookText,
        ctaText,
        ctaSubText,
        bestFor,
      })),
  })),

  build: protectedProcedure
    .input(z.object({
      clips: z.array(clipSchema).min(1),
      title: z.string().optional(),
      vibe: z.enum(["cinematic_heat", "luxe_gold", "neon_night", "noir_afterdark", "velvet_midnight"]).default("cinematic_heat"),
      aspect: z.enum(["9:16", "16:9", "1:1"]).default("9:16"),
      hookText: z.string().optional(),
      ctaText: z.string().optional(),
      ctaSubText: z.string().optional(),
      focusRotation: z.array(z.string()).optional(),
      intensity: z.enum(["ultra", "fast", "medium", "slow", "minimal"]).default("fast"),
      musicUrl: z.string().optional(),
      watermarkText: z.string().optional(),
      aiRemix: z.boolean().optional(),
      aiShotCount: z.number().min(1).max(16).optional(),
      mode: z.enum(["ai_full_shoot", "ai_remix", "original", "hybrid", "photo_cinematic"]).optional(),
      sourceProof: sourceProofSchema,
      chromaAberration: z.boolean().optional(),
      lightLeaks: z.boolean().optional(),
      letterbox: z.boolean().optional(),
      glitch: z.boolean().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      if (requestsNewTrailerShots(input.mode, input.aiRemix)) {
        return prepareTrailerShotPath(input, Number(ctx.user.id));
      }
      legacyCreativeRenderBlocked();
    }),

  buildFromTemplate: protectedProcedure
    .input(z.object({
      templateId: z.string(),
      clips: z.array(clipSchema).min(1),
      title: z.string().optional(),
      ctaSubText: z.string().optional(),
      aspect: z.enum(["9:16", "16:9", "1:1"]).default("9:16"),
      musicUrl: z.string().optional(),
      audioAssetId: z.string().uuid().optional(),
      trailerProjectId: z.string().uuid().optional(),
      watermarkText: z.string().optional(),
      mode: z.enum(["ai_full_shoot", "ai_remix", "original", "hybrid", "photo_cinematic"]).optional(),
      sourceProof: sourceProofSchema,
      chromaAberration: z.boolean().optional(),
      lightLeaks: z.boolean().optional(),
      letterbox: z.boolean().optional(),
      glitch: z.boolean().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const tpl = TRAILER_TEMPLATES.find(t => t.id === input.templateId);
      if (!tpl) throw new TRPCError({ code: "NOT_FOUND", message: `Trailer template ${input.templateId} not found` });
      // If a governed trailer project and audio asset are provided, use the new Trailer Director path
      if (input.trailerProjectId && input.audioAssetId) {
        const projectRes = await (db as any).execute(sql`SELECT * FROM trailer_projects WHERE id = ${input.trailerProjectId} AND user_id = ${ctx.user.id}` as any);
        const project = (projectRes as any)?.[0]?.[0];
        if (!project) throw new TRPCError({ code: "NOT_FOUND", message: "Trailer project not found" });

        const asset = await getCanonicalAudioAsset(ctx.user.id, input.audioAssetId);
        if (!asset) throw new TRPCError({ code: "NOT_FOUND", message: "Soundtrack not found in your library." });
        assertAudioRights({ asset, intendedUse: "render", platform: "creatorvault" });

        const analysis = await getAudioAnalysis(ctx.user.id, input.audioAssetId);
        if (!analysis || analysis.analysisStatus !== "ready") {
          throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Soundtrack analysis is not ready." });
        }

        // 1. Build the editorial pacing plan from this creator's actual trailer project.
        // This path intentionally does not fabricate Body Cinema evidence; if that evidence
        // exists it may inform a future treatment, but a trailer project can still be honestly
        // directed from its own selected sources.
        const blueprint = {
          scenes: JSON.parse(project.scenes_json || "[]"),
          hooks: JSON.parse(project.hooks || "[]"),
          project: { title: input.title, format: input.aspect },
        };
        const pacingPlan = buildCinematicPacingPlan(blueprint as any);
        if (!pacingPlan.scenes.length) {
          throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Choose saved CreatorVault media before directing this trailer." });
        }

        // 2. Snap the pacing plan to the selected track's real tempo. Each scene stays
        // grounded in selected creator footage; the beat only determines cut energy.
        const beatSeconds = 60 / Math.max(1, analysis.bpm || 120);
        const renderClips = pacingPlan.scenes.map((scene: any, index: number) => {
          const sceneDuration = Math.max(0.5, Number(scene.durationSeconds || 3));
          const cutOnBeat = Math.max(0.5, Math.round(sceneDuration / beatSeconds) * beatSeconds);
          return {
            src: input.clips[index % input.clips.length]?.src || "",
            trimStart: 0,
            trimEnd: cutOnBeat,
            focus: tpl.focusRotation[index % tpl.focusRotation.length],
            caption: index === 0 ? tpl.hookText : undefined,
            captionStyle: "bold_center",
            punch: scene.role === "hook" || scene.role === "climax" || index % 2 === 0,
            lightLeak: scene.transitionEnergy >= 72,
            flashIn: index === 0,
            glitch: scene.role === "hook" && input.glitch === true,
          };
        });

        const audioMixPlan = {
          targetLufs: -14,
          preserveSourceAudio: false,
          sourceGainDb: -60,
          musicGainDb: 0,
          duckingWindows: [],
          fadeInMs: 500,
          fadeOutMs: 1500,
        };

        // 3. Render using the modern realRenderEngine

        legacyCreativeRenderBlocked();
        const job = startRender({
          clips: renderClips,
          aspect: input.aspect,
          colorGrade: tpl.vibe,
          motion: "none",
          focus: "none",
          captionText: tpl.hookText,
          captionStyle: "bold_center",
          musicUrl: asset.assetUrl,
          musicVolume: 0.8,
          audioMixPlan,
          watermarkText: input.watermarkText,
          fadeInOut: true,
          transitions: tpl.transitions,
          chromaAberration: input.chromaAberration ?? tpl.polish,
          lightLeaks: input.lightLeaks,
          letterbox: input.letterbox,
          glitch: input.glitch,
          polish: tpl.polish,
        });

        return { jobId: job.id, status: job.status, templateApplied: tpl.name, mode: "directed" };
      }

      // Determine mode: explicit override > template default > legacy aiRemix flag
      const resolvedMode = input.mode ?? (tpl.aiRemix ? "ai_remix" : "original");
      if (requestsNewTrailerShots(resolvedMode)) {
        return prepareTrailerShotPath({
          clips: input.clips,
          title: input.title || tpl.name,
          vibe: tpl.vibe,
          aspect: input.aspect,
          focusRotation: tpl.focusRotation,
          mode: resolvedMode,
          sourceProof: input.sourceProof,
        }, Number(ctx.user.id));
      }
      legacyCreativeRenderBlocked();
      const job = startTrailer({
        clips: input.clips,
        title: input.title,
        vibe: tpl.vibe,
        aspect: input.aspect,
        hookText: tpl.hookText,
        ctaText: tpl.ctaText,
        ctaSubText: input.ctaSubText || tpl.ctaSubText,
        focusRotation: tpl.focusRotation,
        intensity: tpl.intensity,
        musicUrl: input.musicUrl,
        watermarkText: input.watermarkText,
        polish: tpl.polish !== false,
        transitions: tpl.transitions !== false,
        mode: resolvedMode,
        aiShotCount: resolvedMode === "ai_full_shoot" || resolvedMode === "photo_cinematic" ? 6 : 4,
        chromaAberration: input.chromaAberration,
        lightLeaks: input.lightLeaks,
        letterbox: input.letterbox,
        glitch: input.glitch,
      });
      return { jobId: job.id, status: job.status, templateApplied: tpl.name, mode: resolvedMode };
    }),

  getStatus: protectedProcedure
    .input(z.object({ jobId: z.string() }))
    .query(({ input }) => {
      const job = getTrailerJob(input.jobId);
      if (!job) throw new TRPCError({ code: "NOT_FOUND", message: "Trailer job not found" });
      return job;
    }),
});
