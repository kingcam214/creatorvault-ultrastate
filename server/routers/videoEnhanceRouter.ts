import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import OpenAI from "openai";
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const REPLICATE_TOKEN = process.env.REPLICATE_API_TOKEN || "";
async function replicatePost(endpoint: string, body: object): Promise<any> {
  const resp = await fetch(`https://api.replicate.com/v1/${endpoint}`, {
    method: "POST",
    headers: { Authorization: `Token ${REPLICATE_TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!resp.ok) throw new Error(`Replicate API error: ${resp.status} ${await resp.text()}`);
  return resp.json();
}
async function replicateGet(predictionId: string): Promise<any> {
  const resp = await fetch(`https://api.replicate.com/v1/predictions/${predictionId}`, {
    headers: { Authorization: `Token ${REPLICATE_TOKEN}` },
  });
  if (!resp.ok) throw new Error(`Replicate poll error: ${resp.status}`);
  return resp.json();
}
export const videoEnhanceRouter = router({
  enhanceVideo: protectedProcedure.input(z.object({ videoUrl: z.string(), enhancements: z.array(z.string()) })).mutation(async ({ ctx, input }) => ({ jobId: Date.now(), videoUrl: input.videoUrl, enhancements: input.enhancements, status: "queued", userId: ctx.user.id })),
  getEnhancementOptions: protectedProcedure.query(async () => ({ options: [{ id: "upscale", name: "4K Upscale" }, { id: "denoise", name: "Noise Reduction" }, { id: "stabilize", name: "Stabilization" }, { id: "color_grade", name: "Color Grade" }, { id: "audio_enhance", name: "Audio Enhancement" }] })),
  generateEnhancementPlan: protectedProcedure.input(z.object({ videoDescription: z.string(), targetQuality: z.string() })).mutation(async ({ input }) => {
    const c = await openai.chat.completions.create({ model: "gpt-4o-mini", messages: [{ role: "user", content: `Create a video enhancement plan for: ${input.videoDescription}
Target quality: ${input.targetQuality}

Recommend: specific enhancements, order of operations, and expected improvement.` }], max_tokens: 400 });
    return { plan: c.choices[0].message.content };
  }),
  getEnhancementStatus: protectedProcedure.input(z.object({ jobId: z.number() })).query(async ({ input }) => ({ jobId: input.jobId, status: "processing", progress: 0, estimatedTime: "2 minutes" })),
  slowMotion: protectedProcedure
    .input(z.object({
      videoUrl: z.string(),
      targetFps: z.enum(["60", "120", "240"]).default("60"),
      targetResolution: z.string().optional(),
      enableUpscale: z.boolean().optional(),
      upscaleModel: z.string().optional(),
      crf: z.number().optional(),
      startTime: z.number().optional(),
      maxSeconds: z.number().optional(),
      outputFormat: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      if (!REPLICATE_TOKEN) throw new Error("REPLICATE_API_TOKEN not configured — AI slow motion unavailable");
      const multiplierMap: Record<string, number> = { "60": 2, "120": 4, "240": 8 };
      const multiplier = multiplierMap[input.targetFps] ?? 2;
      const prediction = await replicatePost("predictions", {
        version: "4f88a16a13673a8b589c18866e540556170a5bcb2ccdc12de201f9f5a851fad1",
        input: { video: input.videoUrl, multiplier, fps: parseInt(input.targetFps) },
      });
      return { predictionId: prediction.id, status: prediction.status, message: `AI slow motion started — ${input.targetFps}fps interpolation` };
    }),
  getJob: protectedProcedure
    .input(z.object({ predictionId: z.string() }))
    .query(async ({ input }) => {
      if (!REPLICATE_TOKEN) return { isComplete: false, status: "error", error: "REPLICATE_API_TOKEN not configured" };
      const prediction = await replicateGet(input.predictionId);
      const isComplete = prediction.status === "succeeded";
      const isFailed = prediction.status === "failed" || prediction.status === "canceled";
      return {
        predictionId: prediction.id,
        status: prediction.status,
        isComplete,
        isFailed,
        outputUrl: isComplete && prediction.output ? prediction.output : null,
        error: isFailed ? (prediction.error || "Processing failed") : null,
        progress: prediction.metrics?.predict_time ? 100 : 0,
      };
    }),
});