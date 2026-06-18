/**
 * ============================================================================
 * CLONE COMMAND ROUTER — /king/clone-command
 * KingCam Clone Command Center — Owner-gated Replicate image generation
 * using kingcam214/fluxdevcam with the fluxdevCam trigger word.
 *
 * Procedures:
 *   1. generateImage       — Fire a Replicate prediction
 *   2. getPredictionStatus — Poll prediction status + output
 *   3. getGenerationHistory— Paginated history of all generations
 *   4. saveToVault         — Mark a generation as saved to vault
 *   5. getAvailableModels  — List active clone models
 *   6. setHeroImage        — Set homepage hero image from a generation
 * ============================================================================
 */
import { z } from "zod";
import { router, protectedProcedure, publicProcedure } from "../_core/trpc.js";
import { TRPCError } from "@trpc/server";
import mysql from "mysql2/promise";

// ─── DB ───────────────────────────────────────────────────────────────────────
async function getDb() {
  const url =
    process.env.DATABASE_URL ||
    "mysql://creatorvault:KingCam214CreatorVault@127.0.0.1:3306/creatorvault";
  const m = url.match(
    /mysql:\/\/([^:]+):([^@]+)@([^:/]+):(\d+)\/([^?]+)/,
  );
  if (!m) throw new Error("Invalid DATABASE_URL");
  const [, user, password, host, port, database] = m;
  return mysql.createConnection({
    host,
    port: parseInt(port),
    user,
    password,
    database,
  });
}

/** MySQL2 execute returns [rows, fields] — unwrap safely */
function extractRows(result: any): any[] {
  if (Array.isArray(result) && result.length === 2 && Array.isArray(result[0])) {
    return result[0];
  }
  if (Array.isArray(result)) return result;
  return [];
}

// ─── Owner Guard ──────────────────────────────────────────────────────────────
function ownerGuard(userId: number) {
  if (userId !== 6 && userId !== 33) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Owner only" });
  }
}

// ─── Constants ────────────────────────────────────────────────────────────────
const REPLICATE_TOKEN = process.env.REPLICATE_API_TOKEN || "";
const DEFAULT_MODEL = process.env.REPLICATE_CLONE_MODEL_ID || "kingcam214/fluxdevcam";
const DEFAULT_VERSION =
  process.env.REPLICATE_CLONE_VERSION ||
  "e8074c4eeec195ad8ab617bf1502cd0c297db7f2c1cf5d9a665fad4710468727";
const TRIGGER_WORD = process.env.REPLICATE_CLONE_TRIGGER_WORD || "fluxdevCam";
const KINGCAM_IDENTITY_PREFIX =
  "KingCam reference-first identity lock: preserve the exact hairstyle, hairline, hair length, hair texture, facial hair, jewelry, skin tone, face structure, body build, and wardrobe specified by the user prompt or attached/source reference media; do not invent, replace, clean up, or stylize the hairstyle";
const KINGCAM_IDENTITY_SUFFIX =
  "paid clone output must match the submitted prompt and reference-media identity exactly; if a crown is requested, place it above the reference-accurate hair without covering or changing the hairstyle";
const KINGCAM_LOCKED_NEGATIVE_PROMPT =
  "wrong hairstyle, invented hairstyle, generic AI haircut, default model haircut, unrequested natural hair fade, unrequested thick waves, unrequested 360 waves, wrong hairline, altered hairline, bald, shaved head, no hair, no crown, hat, beanie, hood, cropped out crown, hidden hair, covered head";
const POLLO_API_KEY = process.env.POLLO_API_KEY || "";
const POLLO_BASE_URL = "https://pollo.ai/api/platform";

export function buildKingCamIdentityPrompt(userPrompt: string) {
  const promptWithoutTrigger = userPrompt
    .replace(new RegExp(`\\b${TRIGGER_WORD}\\b`, "gi"), "")
    .trim()
    .replace(/^,+|,+$/g, "")
    .trim();

  return `${TRIGGER_WORD} ${KINGCAM_IDENTITY_PREFIX}, ${promptWithoutTrigger}, ${KINGCAM_IDENTITY_SUFFIX}`;
}

export function buildKingCamNegativePrompt(userNegativePrompt?: string) {
  const cleanUserNegative = userNegativePrompt?.trim();
  return cleanUserNegative
    ? `${KINGCAM_LOCKED_NEGATIVE_PROMPT}, ${cleanUserNegative}`
    : KINGCAM_LOCKED_NEGATIVE_PROMPT;
}

// ─── Replicate Helpers ────────────────────────────────────────────────────────
async function replicatePost(endpoint: string, body: object): Promise<any> {
  const resp = await fetch(`https://api.replicate.com/v1/${endpoint}`, {
    method: "POST",
    headers: {
      Authorization: `Token ${REPLICATE_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`Replicate ${endpoint} error: ${resp.status} ${text}`);
  }
  return resp.json();
}

async function replicateGet(predictionId: string): Promise<any> {
  const resp = await fetch(
    `https://api.replicate.com/v1/predictions/${predictionId}`,
    {
      headers: { Authorization: `Token ${REPLICATE_TOKEN}` },
    },
  );
  if (!resp.ok) {
    throw new Error(`Replicate poll error: ${resp.status}`);
  }
  return resp.json();
}

function normalisePolloStatus(raw: string | undefined | null): "waiting" | "processing" | "succeed" | "failed" {
  if (!raw) return "waiting";
  const status = raw.toLowerCase();
  if (["succeed", "succeeded", "success", "complete", "completed"].includes(status)) return "succeed";
  if (["failed", "fail", "error", "canceled", "cancelled"].includes(status)) return "failed";
  if (["processing", "running", "in_progress"].includes(status)) return "processing";
  return "waiting";
}

function buildCloneMotionPrompt(input: { prompt?: string; motionStyle?: "vaultx_teaser" | "vip_invite" | "ppv_cover" | "brand_loop" }) {
  if (input.prompt?.trim()) return input.prompt.trim();
  const presets = {
    vaultx_teaser: "Create a premium VaultX clone motion teaser with subtle camera push, stable face identity, luxury low-key lighting, confident adult-safe sensual energy, and a polished vertical launch feel.",
    vip_invite: "Create an invite-only VIP clone motion asset with warm private-lounge lighting, controlled eye-line presence, discreet premium energy, stable likeness, and a final beat suitable for Telegram or VIP funnel routing.",
    ppv_cover: "Create a PPV cover-motion loop with glossy editorial lighting, clean subject preservation, slow reveal movement, strong paid-unlock tension, and no explicit public-facing content.",
    brand_loop: "Create a creator-brand profile loop with subtle head movement, crisp face consistency, clean background depth, premium social hero energy, and platform-safe styling.",
  } as const;
  return presets[input.motionStyle || "vaultx_teaser"];
}

// ─── Router ───────────────────────────────────────────────────────────────────
export const cloneCommandRouter = router({
  /**
   * 0. previewImagePrompt — No-credit final prompt preview before paid generation.
   */
  previewImagePrompt: protectedProcedure
    .input(
      z.object({
        prompt: z.string().min(1).max(2000),
        negativePrompt: z.string().max(2000).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      ownerGuard(ctx.user.id);
      return {
        prompt: buildKingCamIdentityPrompt(input.prompt),
        negativePrompt: buildKingCamNegativePrompt(input.negativePrompt),
        creditCost: "none",
        safetyRule:
          "This preview does not call Replicate or Pollo. Paid generation must use this exact final prompt after owner review.",
      };
    }),

  /**
   * 1. generateImage — Fire a Replicate prediction for fluxdevcam
   */
  generateImage: protectedProcedure
    .input(
      z.object({
        prompt: z.string().min(1).max(2000),
        negativePrompt: z.string().max(2000).optional(),
        width: z.number().min(256).max(1536).default(1024),
        height: z.number().min(256).max(1536).default(1024),
        numOutputs: z.number().min(1).max(4).default(1),
        guidanceScale: z.number().min(0).max(20).default(3.5),
        numInferenceSteps: z.number().min(1).max(50).default(28),
        seed: z.number().optional(),
        modelVersion: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      ownerGuard(ctx.user.id);

      const finalPrompt = buildKingCamIdentityPrompt(input.prompt);
      const finalNegativePrompt = buildKingCamNegativePrompt(input.negativePrompt);

      const version = input.modelVersion || DEFAULT_VERSION;

      // Build Replicate input. KingCam identity elements are server-locked so
      // every generation keeps visible hair and the crown even if the UI prompt
      // only describes the scene.
      const replicateInput: Record<string, any> = {
        prompt: finalPrompt,
        negative_prompt: finalNegativePrompt,
        width: input.width,
        height: input.height,
        num_outputs: input.numOutputs,
        guidance_scale: input.guidanceScale,
        num_inference_steps: input.numInferenceSteps,
        aspect_ratio: "custom",
        output_format: "png",
        output_quality: 100,
      };
      if (input.seed !== undefined) {
        replicateInput.seed = input.seed;
      }

      // Fire the prediction
      const prediction = await replicatePost("predictions", {
        version,
        input: replicateInput,
      });

      // Store in DB
      const conn = await getDb();
      try {
        await conn.execute(
          `INSERT INTO kingcam_clone_generations
           (user_id, replicate_prediction_id, model_id, model_version, prompt, negative_prompt,
            width, height, num_outputs, guidance_scale, num_inference_steps, seed, status)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            ctx.user.id,
            prediction.id,
            DEFAULT_MODEL,
            version,
            finalPrompt,
            finalNegativePrompt,
            input.width,
            input.height,
            input.numOutputs,
            input.guidanceScale,
            input.numInferenceSteps,
            input.seed || null,
            prediction.status || "starting",
          ],
        );
      } finally {
        await conn.end();
      }

      return {
        predictionId: prediction.id,
        status: prediction.status,
        prompt: finalPrompt,
      };
    }),

  /**
   * 2. getPredictionStatus — Poll a prediction and update DB
   */
  getPredictionStatus: protectedProcedure
    .input(z.object({ predictionId: z.string() }))
    .query(async ({ ctx, input }) => {
      ownerGuard(ctx.user.id);

      const data = await replicateGet(input.predictionId);

      // Update DB
      const conn = await getDb();
      try {
        const outputUrls =
          data.output && Array.isArray(data.output)
            ? JSON.stringify(data.output)
            : data.output
              ? JSON.stringify([data.output])
              : null;

        await conn.execute(
          `UPDATE kingcam_clone_generations
           SET status = ?, output_urls = ?, error_message = ?
           WHERE replicate_prediction_id = ?`,
          [
            data.status,
            outputUrls,
            data.error || null,
            input.predictionId,
          ],
        );
      } finally {
        await conn.end();
      }

      return {
        id: data.id,
        status: data.status,
        output: data.output,
        error: data.error,
        metrics: data.metrics,
        createdAt: data.created_at,
        completedAt: data.completed_at,
      };
    }),


  /**
   * 3. generateCloneVideo — Turn a selected clone image into a short motion asset.
   * Uses the existing Pollo image-to-video production path and stores jobs in pollo_generations.
   */
  generateCloneVideo: protectedProcedure
    .input(
      z.object({
        imageUrl: z.string().url(),
        prompt: z.string().max(1500).optional(),
        motionStyle: z.enum(["vaultx_teaser", "vip_invite", "ppv_cover", "brand_loop"]).default("vaultx_teaser"),
        resolution: z.enum(["480p", "720p", "1080p"]).default("720p"),
        length: z.enum(["5s", "10s"]).default("5s"),
        mode: z.enum(["basic", "pro"]).default("pro"),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      ownerGuard(ctx.user.id);
      if (!POLLO_API_KEY) {
        throw new TRPCError({ code: "PRECONDITION_FAILED", message: "POLLO_API_KEY is not configured." });
      }

      const durationSeconds = input.length === "10s" ? 10 : 5;
      const finalPrompt = buildCloneMotionPrompt(input);

      const response = await fetch(`${POLLO_BASE_URL}/generation/pollo/pollo-v1-6`, {
        method: "POST",
        headers: {
          "x-api-key": POLLO_API_KEY,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          input: {
            image: input.imageUrl,
            prompt: finalPrompt,
            resolution: input.resolution,
            length: durationSeconds,
            mode: input.mode,
          },
        }),
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(`Pollo clone video error: ${response.status} ${text}`);
      }

      const payload = await response.json();
      if (payload?.code !== "SUCCESS" || !payload?.data?.taskId) {
        throw new Error(`Pollo did not return a usable clone video task: ${JSON.stringify(payload)}`);
      }

      const taskId = payload.data.taskId as string;
      const status = normalisePolloStatus(payload.data.status);
      const conn = await getDb();
      try {
        const [insertResult] = await conn.execute(
          `INSERT INTO pollo_generations
           (userId, taskId, imageUrl, prompt, resolution, length, mode, status)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [ctx.user.id, taskId, input.imageUrl, finalPrompt, input.resolution, input.length, input.mode, status],
        );
        return {
          success: true,
          taskId,
          status,
          generationId: (insertResult as any).insertId,
          prompt: finalPrompt,
          directorBrief: {
            vertical: "VaultX",
            motionStyle: input.motionStyle,
            provider: "Pollo image-to-video",
            model: "pollo-v1-6",
            outputs: ["clone teaser", "VIP invite loop", "PPV cover motion", "profile hero crop"],
            safetyRule: "adult-safe public teaser language; preserve likeness; avoid explicit public-facing output",
          },
        };
      } finally {
        await conn.end();
      }
    }),

  /**
   * 4. getCloneVideoStatus — Poll and persist Clone Command video status.
   */
  getCloneVideoStatus: protectedProcedure
    .input(z.object({ taskId: z.string() }))
    .query(async ({ ctx, input }) => {
      ownerGuard(ctx.user.id);
      if (!POLLO_API_KEY) {
        throw new TRPCError({ code: "PRECONDITION_FAILED", message: "POLLO_API_KEY is not configured." });
      }

      const response = await fetch(`${POLLO_BASE_URL}/generation/${input.taskId}/status`, {
        method: "GET",
        headers: { "x-api-key": POLLO_API_KEY },
      });
      if (!response.ok) {
        const text = await response.text();
        throw new Error(`Pollo clone video status error: ${response.status} ${text}`);
      }

      const payload = await response.json();
      const generation = payload?.data?.generations?.[0];
      const status = normalisePolloStatus(generation?.status ?? payload?.data?.status);
      const videoUrl = generation?.url && generation.url.length > 0 ? generation.url : null;

      const conn = await getDb();
      try {
        await conn.execute(
          `UPDATE pollo_generations
           SET status = ?, videoUrl = ?, updatedAt = CURRENT_TIMESTAMP
           WHERE taskId = ? AND userId = ?`,
          [status, videoUrl, input.taskId, ctx.user.id],
        );
        const rows = extractRows(
          await conn.execute(
            `SELECT * FROM pollo_generations WHERE taskId = ? AND userId = ?`,
            [input.taskId, ctx.user.id],
          ),
        );
        return {
          success: true,
          taskId: input.taskId,
          status,
          videoUrl,
          generation: rows[0] || null,
        };
      } finally {
        await conn.end();
      }
    }),

  /**
   * 5. getGenerationHistory — Paginated list of all generations
   */
  getGenerationHistory: protectedProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(100).default(20),
        offset: z.number().min(0).default(0),
      }),
    )
    .query(async ({ ctx, input }) => {
      ownerGuard(ctx.user.id);

      const conn = await getDb();
      try {
        const safeLimit = Math.max(1, Math.min(100, Math.trunc(input.limit)));
        const safeOffset = Math.max(0, Math.trunc(input.offset));
        const rows = extractRows(
          await conn.execute(
            `SELECT * FROM kingcam_clone_generations
             WHERE user_id = ?
             ORDER BY created_at DESC
             LIMIT ${safeLimit} OFFSET ${safeOffset}`,
            [ctx.user.id],
          ),
        );

        const countResult = extractRows(
          await conn.execute(
            `SELECT COUNT(*) as total FROM kingcam_clone_generations WHERE user_id = ?`,
            [ctx.user.id],
          ),
        );
        const total = (countResult[0] as any)?.total || 0;

        return {
          generations: rows.map((r: any) => ({
            id: r.id,
            predictionId: r.replicate_prediction_id,
            prompt: r.prompt,
            negativePrompt: r.negative_prompt,
            width: r.width,
            height: r.height,
            numOutputs: r.num_outputs,
            guidanceScale: r.guidance_scale,
            status: r.status,
            outputUrls: r.output_urls ? (typeof r.output_urls === 'string' ? JSON.parse(r.output_urls) : r.output_urls) : [],
            savedToVault: !!r.saved_to_vault,
            createdAt: r.created_at,
          })),
          total,
        };
      } finally {
        await conn.end();
      }
    }),

  /**
   * 6. saveToVault — Mark generation as saved
   */
  saveToVault: protectedProcedure
    .input(
      z.object({
        generationId: z.number(),
        imageUrl: z.string().url(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      ownerGuard(ctx.user.id);

      const conn = await getDb();
      try {
        await conn.execute(
          `UPDATE kingcam_clone_generations SET saved_to_vault = TRUE WHERE id = ? AND user_id = ?`,
          [input.generationId, ctx.user.id],
        );
        return { success: true, generationId: input.generationId };
      } finally {
        await conn.end();
      }
    }),

  /**
   * 7. getAvailableModels — List active clone models
   */
  getAvailableModels: protectedProcedure.query(async ({ ctx }) => {
    ownerGuard(ctx.user.id);

    const conn = await getDb();
    try {
      const rows = extractRows(
        await conn.execute(
          `SELECT * FROM kingcam_clone_models WHERE is_active = TRUE ORDER BY is_default DESC, model_name ASC`,
        ),
      );
      return rows.map((r: any) => ({
        id: r.id,
        modelName: r.model_name,
        replicateModelId: r.replicate_model_id,
        replicateVersion: r.replicate_version,
        triggerWord: r.trigger_word,
        description: r.description,
        thumbnailUrl: r.thumbnail_url,
        isDefault: !!r.is_default,
      }));
    } finally {
      await conn.end();
    }
  }),

  /**
   * 8. setHeroImage — Update the platform hero image URL
   */
  setHeroImage: protectedProcedure
    .input(z.object({ imageUrl: z.string().url() }))
    .mutation(async ({ ctx, input }) => {
      ownerGuard(ctx.user.id);

      const conn = await getDb();
      try {
        await conn.execute(
          `INSERT INTO platform_settings (setting_key, setting_value, updated_by)
           VALUES ('KINGCAM_HERO_IMAGE_URL', ?, ?)
           ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value), updated_by = VALUES(updated_by)`,
          [input.imageUrl, ctx.user.id],
        );
        return { success: true, imageUrl: input.imageUrl };
      } finally {
        await conn.end();
      }
    }),

  /**
   * 9. getHeroImage — Public endpoint to read the hero image URL
   */
  getHeroImage: publicProcedure.query(async () => {
    const conn = await getDb();
    try {
      const rows = extractRows(
        await conn.execute(
          `SELECT setting_value FROM platform_settings WHERE setting_key = 'KINGCAM_HERO_IMAGE_URL'`,
        ),
      );
      const url = (rows[0] as any)?.setting_value || "";
      return { imageUrl: url || null };
    } finally {
      await conn.end();
    }
  }),
});
