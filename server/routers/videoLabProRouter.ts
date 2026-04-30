import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import OpenAI from "openai";
import * as db from "../db";
import { eq, desc } from "drizzle-orm";
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
export const videoLabProRouter = router({
  getJobs: protectedProcedure.query(async ({ ctx }) => {
    const jobs = await db.db.select().from(db.schema.videoGenerationJobs).where(eq(db.schema.videoGenerationJobs.userId, ctx.user.id)).orderBy(desc(db.schema.videoGenerationJobs.createdAt)).limit(20);
    return jobs;
  }),
  createJob: protectedProcedure.input(z.object({ type: z.string(), input: z.record(z.unknown()), priority: z.string().default("normal") })).mutation(async ({ ctx, input }) => {
    const [job] = await db.db.insert(db.schema.videoGenerationJobs).values({ userId: ctx.user.id, type: input.type, status: "queued", input: JSON.stringify(input.input), createdAt: new Date() }).$returningId();
    return { id: job.id, status: "queued" };
  }),
  generateVideoScript: protectedProcedure.input(z.object({ topic: z.string(), duration: z.string(), style: z.string() })).mutation(async ({ input }) => {
    const c = await openai.chat.completions.create({ model: "gpt-4o-mini", messages: [{ role: "user", content: `Generate a ${input.duration} video script about "${input.topic}" in ${input.style} style. Include hook, main content, and CTA.` }], max_tokens: 600 });
    return { script: c.choices[0].message.content };
  }),
  getCapabilities: protectedProcedure.query(async () => ({ capabilities: ["script_generation", "edit_planning", "caption_generation", "thumbnail_concepts", "highlight_reel", "beat_sync", "hooks", "color_grading"], version: "3.0" })),
  createHighlightReel: protectedProcedure.input(z.object({ videoUrl: z.string(), style: z.enum(["viral", "cinematic", "educational", "comedy"]), clipCount: z.number().default(5) })).mutation(async ({ ctx, input }) => {
    const c = await openai.chat.completions.create({ model: "gpt-4o-mini", messages: [{ role: "user", content: `You are a video editor AI. Create a ${input.style} highlight reel plan for: ${input.videoUrl}\nGenerate ${input.clipCount} clip timestamps with descriptions, transitions, and music suggestions.` }], max_tokens: 500 });
    const jobId = `hr_${Date.now()}`;
    try { await db.db.insert(db.schema.videoGenerationJobs).values({ userId: ctx.user.id, type: "highlight_reel", status: "processing", input: JSON.stringify({ videoUrl: input.videoUrl, style: input.style, clipCount: input.clipCount }), createdAt: new Date() }); } catch (e) {}
    return { jobId, status: "processing", plan: c.choices[0].message.content, estimatedMinutes: 3 };
  }),
  beatSync: protectedProcedure.input(z.object({ videoUrl: z.string(), bpm: z.number().default(120), style: z.string().default("hard_cut") })).mutation(async ({ ctx, input }) => {
    const c = await openai.chat.completions.create({ model: "gpt-4o-mini", messages: [{ role: "user", content: `Create a beat-sync timeline for video: ${input.videoUrl}\nBPM: ${input.bpm}, Style: ${input.style}\nGenerate cut points at beat intervals, transition types, and energy mapping.` }], max_tokens: 400 });
    const jobId = `bs_${Date.now()}`;
    try { await db.db.insert(db.schema.videoGenerationJobs).values({ userId: ctx.user.id, type: "beat_sync", status: "processing", input: JSON.stringify({ videoUrl: input.videoUrl, bpm: input.bpm, style: input.style }), createdAt: new Date() }); } catch (e) {}
    return { jobId, status: "processing", timeline: c.choices[0].message.content, bpm: input.bpm };
  }),
  getLooks: protectedProcedure.input(z.object({})).query(async () => ({ looks: [{ id: "cinematic_noir", name: "Cinematic Noir", desc: "Deep shadows, cool tones" }, { id: "golden_hour", name: "Golden Hour", desc: "Warm, rich, filmic" }, { id: "bleach_bypass", name: "Bleach Bypass", desc: "Desaturated, high contrast" }, { id: "teal_orange", name: "Teal & Orange", desc: "Hollywood blockbuster" }, { id: "film_grain", name: "Film Grain", desc: "35mm analog texture" }, { id: "clean_web", name: "Clean Web", desc: "Bright, social-ready" }] })),
  generateHooks: protectedProcedure.input(z.object({ videoUrl: z.string(), platform: z.string().default("tiktok") })).mutation(async ({ input }) => {
    const c = await openai.chat.completions.create({ model: "gpt-4o-mini", messages: [{ role: "user", content: `Generate 5 viral hooks for this video on ${input.platform}: ${input.videoUrl}\nEach hook: 1-2 sentences, attention-grabbing, optimized for ${input.platform}. Include text overlay, timing (0-3s), and emotion trigger.` }], max_tokens: 400 });
    const hooksText = c.choices[0].message.content ?? "";
    const hooks = hooksText.split("\n").filter((l: string) => l.trim().length > 10).slice(0, 5).map((h: string, i: number) => ({ id: i + 1, text: h.replace(/^\d+\.\s*/, ""), platform: input.platform, timing: "0-3s" }));
    return { hooks, platform: input.platform };
  }),
});
