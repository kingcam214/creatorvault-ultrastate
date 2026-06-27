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

// ─── Viral trailer templates ──────────────────────────────────────────────────
export interface TrailerTemplate {
  id: string;
  name: string;
  emoji: string;
  tagline: string;
  vibe: "cinematic_heat" | "luxe_gold" | "neon_night" | "noir_afterdark" | "velvet_midnight";
  intensity: "fast" | "medium" | "slow";
  focusRotation: string[];
  hookText?: string;
  ctaText: string;
  ctaSubText: string;
  bestFor: string;
  conversionScore: number; // 1..10
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
    hookText: "the full version is insane", ctaText: "FULL VIDEO IN BIO", ctaSubText: "🔗", bestFor: "TikTok/Reels reach", conversionScore: 9,
  },
];

const clipSchema = z.object({ src: z.string(), trimStart: z.number().optional(), trimEnd: z.number().optional() });

export const trailerRouter = router({
  getTemplates: protectedProcedure.query(() => ({
    templates: TRAILER_TEMPLATES,
    stats: { total: TRAILER_TEMPLATES.length, avgConversion: (TRAILER_TEMPLATES.reduce((s, t) => s + t.conversionScore, 0) / TRAILER_TEMPLATES.length).toFixed(1) },
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
      intensity: z.enum(["fast", "medium", "slow"]).default("fast"),
      musicUrl: z.string().optional(),
      watermarkText: z.string().optional(),
    }))
    .mutation(({ input }) => {
      const job = startTrailer(input);
      return { jobId: job.id, status: job.status };
    }),

  buildFromTemplate: protectedProcedure
    .input(z.object({
      templateId: z.string(),
      clips: z.array(clipSchema).min(1),
      title: z.string().optional(),
      ctaSubText: z.string().optional(), // override CTA sub (e.g. price)
      aspect: z.enum(["9:16", "16:9", "1:1"]).default("9:16"),
      musicUrl: z.string().optional(),
      watermarkText: z.string().optional(),
    }))
    .mutation(({ input }) => {
      const tpl = TRAILER_TEMPLATES.find(t => t.id === input.templateId);
      if (!tpl) throw new TRPCError({ code: "NOT_FOUND", message: `Trailer template ${input.templateId} not found` });
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
      });
      return { jobId: job.id, status: job.status, templateApplied: tpl.name };
    }),

  getStatus: protectedProcedure
    .input(z.object({ jobId: z.string() }))
    .query(({ input }) => {
      const job = getTrailerJob(input.jobId);
      if (!job) throw new TRPCError({ code: "NOT_FOUND", message: "Trailer job not found" });
      return job;
    }),
});
