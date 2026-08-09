/**
 * ============================================================================
 * REAL EDITOR ROUTER — drives the ffmpeg render engine
 *   editor.getEditPresets   — list Body Cinema edit presets + color grades + motion
 *   editor.render           — start a real ffmpeg render, returns jobId
 *   editor.renderWithPreset — apply a Body Cinema edit preset in one call
 *   editor.getRenderStatus  — poll a render job
 * ============================================================================
 */
import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc.js";
import { TRPCError } from "@trpc/server";
import { startRender, getRenderJob, COLOR_GRADES, MOTION_PRESETS, FOCUS_PRESETS } from "../services/realRenderEngine.js";
import { BODY_CINEMA_EDIT_PRESETS, EDIT_PRESET_CATEGORIES, getEditPreset } from "../services/bodyCinemaEditPresets.js";
import { buildAudioDirectedTimeline, toMediaOSManifest } from "../services/audioTimelinePlanner.js";

const clipSchema = z.object({
  src: z.string(),
  trimStart: z.number().optional(),
  trimEnd: z.number().optional(),
  type: z.enum(["video", "image"]).optional(),
  speed: z.number().min(0.05).max(32).optional(),
  focus: z.string().optional(),
  colorGrade: z.string().optional(),
  caption: z.string().optional(),
  captionStyle: z.string().optional(),
  transition: z.string().optional(),
});

const textOverlaySchema = z.object({
  text: z.string(),
  x: z.number().min(0).max(1).optional(),
  y: z.number().min(0).max(1).optional(),
  fontSize: z.number().min(0.005).max(0.8).optional(),
  color: z.string().optional(),
  startTime: z.number().optional(),
  endTime: z.number().optional(),
});

const audioMixPlanSchema = z.object({
  targetLufs: z.number().min(-36).max(-6).default(-14),
  preserveSourceAudio: z.boolean().default(true),
  sourceGainDb: z.number().min(-60).max(12).default(0),
  musicGainDb: z.number().min(-60).max(12).default(0),
  duckingWindows: z.array(z.object({
    startMs: z.number().min(0),
    endMs: z.number().min(0),
    reductionDb: z.number().min(-60).max(0),
  })).default([]),
  fadeInMs: z.number().min(0).max(10000).default(500),
  fadeOutMs: z.number().min(0).max(10000).default(2000),
});

export const realEditorRouter = router({
  getEditPresets: protectedProcedure.query(() => {
    return {
      presets: BODY_CINEMA_EDIT_PRESETS,
      categories: EDIT_PRESET_CATEGORIES,
      colorGrades: Object.entries(COLOR_GRADES).map(([id, v]) => ({ id, label: v.label })),
      motionPresets: Object.entries(MOTION_PRESETS).map(([id, v]) => ({ id, label: v.label })),
      focusPresets: Object.entries(FOCUS_PRESETS).map(([id, v]) => ({ id, label: v.label, emoji: v.emoji })),
      stats: {
        total: BODY_CINEMA_EDIT_PRESETS.length,
        bodyFocus: BODY_CINEMA_EDIT_PRESETS.filter(p => p.category === "body").length,
        colorGrades: Object.keys(COLOR_GRADES).length,
        motionPresets: Object.keys(MOTION_PRESETS).length,
        focusPresets: Object.keys(FOCUS_PRESETS).length,
      },
    };
  }),

  render: protectedProcedure
    .input(z.object({
      clips: z.array(clipSchema).min(1),
      aspect: z.enum(["9:16", "16:9", "1:1"]).default("9:16"),
      colorGrade: z.string().default("none"),
      motion: z.string().default("slow_push"),
      focus: z.string().default("none"),
      captionText: z.string().optional(),
      captionStyle: z.enum(["bold_center", "lower_third", "minimal_top"]).default("bold_center"),
      animatedCaptions: z.boolean().optional(),
      transitions: z.boolean().optional(),
      musicUrl: z.string().optional(),
      musicVolume: z.number().min(0).max(1).optional(),
      audioMixPlan: audioMixPlanSchema.optional(),
      watermarkText: z.string().optional(),
      fadeInOut: z.boolean().default(true),
      textOverlays: z.array(textOverlaySchema).optional(),
    }))
    .mutation(({ input }) => {
      const job = startRender(input);
      return { jobId: job.id, status: job.status };
    }),

  renderWithPreset: protectedProcedure
    .input(z.object({
      presetId: z.string(),
      clips: z.array(clipSchema).min(1),
      captionText: z.string().optional(),
      musicUrl: z.string().optional(),
      watermarkText: z.string().optional(),
    }))
    .mutation(({ input }) => {
      const preset = getEditPreset(input.presetId);
      if (!preset) throw new TRPCError({ code: "NOT_FOUND", message: `Edit preset ${input.presetId} not found` });
      const job = startRender({
        clips: input.clips,
        aspect: preset.aspect,
        colorGrade: preset.colorGrade,
        motion: preset.motion,
        focus: preset.focus || "none",
        captionText: input.captionText,
        captionStyle: preset.captionStyle,
        musicUrl: input.musicUrl,
        musicVolume: 0.5,
        watermarkText: input.watermarkText,
        fadeInOut: preset.fadeInOut,
      });
      return { jobId: job.id, status: job.status, presetApplied: preset.name };
    }),

  getRenderStatus: protectedProcedure
    .input(z.object({ jobId: z.string() }))
    .query(({ input }) => {
      const job = getRenderJob(input.jobId);
      if (!job) throw new TRPCError({ code: "NOT_FOUND", message: "Render job not found" });
      return job;
    }),

  planAudioDirectedEdit: protectedProcedure
    .input(z.object({
      audioAssetId: z.string().uuid(),
      sourceEvidenceId: z.string().uuid(),
      treatmentId: z.string(),
      targetDurationSeconds: z.number().min(3).max(60).default(15),
      preserveSourceAudio: z.boolean().default(true),
      destinationPlatform: z.enum(["creatorvault", "vaultx", "telegram", "instagram", "tiktok", "youtube"]).default("creatorvault"),
    }))
    .mutation(async ({ ctx, input }) => {
      try {
        const plan = await buildAudioDirectedTimeline({
          creatorId: Number(ctx.user.id),
          audioAssetId: input.audioAssetId,
          sourceEvidenceId: input.sourceEvidenceId,
          treatmentId: input.treatmentId,
          targetDurationSeconds: input.targetDurationSeconds,
          preserveSourceAudio: input.preserveSourceAudio,
          destinationPlatform: input.destinationPlatform,
        });
        return {
          planId: plan.id,
          timeline: plan.visualEvents,
          mix: plan.mix,
          anchors: plan.audioAnchors,
          mediaOsManifest: toMediaOSManifest(plan, { bpm: 120 } as any), // Passed back to creator UI for transparency
          creatorMessage: "CreatorVault built a rhythmic cut plan aligned to the major beats of your soundtrack.",
        };
      } catch (error: any) {
        throw new TRPCError({ code: "PRECONDITION_FAILED", message: error?.message || "Audio-directed edit planning failed." });
      }
    }),
});
