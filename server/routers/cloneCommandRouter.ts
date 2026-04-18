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

// ─── Router ───────────────────────────────────────────────────────────────────
export const cloneCommandRouter = router({
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

      // Ensure trigger word is in prompt
      let finalPrompt = input.prompt;
      if (!finalPrompt.toLowerCase().includes(TRIGGER_WORD.toLowerCase())) {
        finalPrompt = `${TRIGGER_WORD} ${finalPrompt}`;
      }

      const version = input.modelVersion || DEFAULT_VERSION;

      // Build Replicate input
      const replicateInput: Record<string, any> = {
        prompt: finalPrompt,
        width: input.width,
        height: input.height,
        num_outputs: input.numOutputs,
        guidance: input.guidanceScale,
        num_inference_steps: input.numInferenceSteps,
        output_format: "webp",
        output_quality: 90,
      };

      if (input.negativePrompt) {
        replicateInput.negative_prompt = input.negativePrompt;
      }
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
            input.negativePrompt || null,
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
   * 3. getGenerationHistory — Paginated list of all generations
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
        const rows = extractRows(
          await conn.execute(
            `SELECT * FROM kingcam_clone_generations
             WHERE user_id = ?
             ORDER BY created_at DESC
             LIMIT ? OFFSET ?`,
            [ctx.user.id, input.limit, input.offset],
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
   * 4. saveToVault — Mark generation as saved
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
   * 5. getAvailableModels — List active clone models
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
   * 6. setHeroImage — Update the platform hero image URL
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
   * 7. getHeroImage — Public endpoint to read the hero image URL
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
