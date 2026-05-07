import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc.js";
import mysql from "mysql2/promise";

// Owner gate middleware - only userId 6 or 33
const ownerOnlyProcedure = protectedProcedure.use(async ({ ctx, next }) => {
  if (ctx.user.id !== 6 && ctx.user.id !== 33) {
    throw new Error("Access denied: Owner only");
  }
  return next();
});

const POLLO_API_KEY = process.env.POLLO_API_KEY;
const POLLO_BASE_URL = "https://pollo.ai/api/platform";

// Database connection helper
async function getDbConnection() {
  return await mysql.createConnection({
    host: "localhost",
    port: 3306,
    user: "creatorvault",
    password: "KingCam214CreatorVault",
    database: "creatorvault",
  });
}

/**
 * Normalise Pollo status strings to a consistent set:
 *   waiting | processing | succeed | failed
 * Pollo returns "succeed" (not "succeeded"), "processing", "waiting", "failed".
 */
function normalisePolloStatus(raw: string | undefined | null): string {
  if (!raw) return "waiting";
  const s = raw.toLowerCase();
  if (s === "succeed" || s === "succeeded" || s === "success") return "succeed";
  if (s === "failed" || s === "fail" || s === "error") return "failed";
  if (s === "processing" || s === "running") return "processing";
  return "waiting";
}

export const polloRouter = router({
  /**
   * Generate video from image using Pollo.ai (pollo-v1-6 model).
   * imageUrl is required — Pollo v1-6 is an image-to-video model.
   * length is numeric seconds (5 or 10); the API expects an integer.
   */
  generateVideo: ownerOnlyProcedure
    .input(
      z.object({
        imageUrl: z.string().url(),
        prompt: z.string().optional(),
        resolution: z.enum(["480p", "720p", "1080p"]).default("720p"),
        length: z.enum(["5s", "10s"]).default("5s"),
        mode: z.enum(["basic", "pro"]).default("basic"),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const conn = await getDbConnection();
      try {
        // Parse length to integer seconds (API requires numeric)
        const durationSec = input.length === "10s" ? 10 : 5;

        // Call Pollo.ai API — uses x-api-key header (NOT Authorization: Bearer)
        const response = await fetch(
          `${POLLO_BASE_URL}/generation/pollo/pollo-v1-6`,
          {
            method: "POST",
            headers: {
              "x-api-key": POLLO_API_KEY!,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              input: {
                image: input.imageUrl,
                prompt: input.prompt || "",
                resolution: input.resolution,
                duration: durationSec,
                mode: input.mode,
              },
            }),
          }
        );

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Pollo.ai API error: ${response.status} - ${errorText}`);
        }

        const resp = await response.json();

        // Response shape: { code: "SUCCESS", data: { taskId, status } }
        if (resp?.code !== "SUCCESS") {
          throw new Error(`Pollo.ai returned error: ${JSON.stringify(resp)}`);
        }

        const taskId = resp?.data?.taskId;
        if (!taskId) {
          throw new Error("Pollo.ai did not return a taskId");
        }

        const initialStatus = normalisePolloStatus(resp?.data?.status);

        // Insert into database
        const [insertResult] = await conn.execute(
          `INSERT INTO pollo_generations 
          (userId, taskId, imageUrl, prompt, resolution, length, mode, status)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            ctx.user.id,
            taskId,
            input.imageUrl,
            input.prompt || null,
            input.resolution,
            input.length,
            input.mode,
            initialStatus,
          ]
        );
        const generationId = (insertResult as any).insertId;

        // Get the inserted record
        const [rows] = await conn.execute(
          `SELECT * FROM pollo_generations WHERE id = ?`,
          [generationId]
        );
        const generation = (rows as any[])[0];

        return {
          success: true,
          taskId,
          generation,
        };
      } catch (error: any) {
        console.error("Pollo.ai generation error:", error);
        throw new Error(`Failed to generate video: ${error.message}`);
      } finally {
        await conn.end();
      }
    }),

  /**
   * Poll Pollo.ai for task status and update the DB row.
   * Status endpoint: GET /api/platform/generation/{taskId}/status
   * Response: { code: "SUCCESS", data: { taskId, generations: [{ status, url }] } }
   * Pollo status values: "waiting" | "processing" | "succeed" | "failed"
   */
  getTaskStatus: ownerOnlyProcedure
    .input(
      z.object({
        taskId: z.string(),
      })
    )
    .query(async ({ input, ctx }) => {
      const conn = await getDbConnection();
      try {
        // Poll Pollo.ai status — uses x-api-key header
        const response = await fetch(
          `${POLLO_BASE_URL}/generation/${input.taskId}/status`,
          {
            method: "GET",
            headers: {
              "x-api-key": POLLO_API_KEY!,
            },
          }
        );

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Pollo.ai status check error: ${response.status} - ${errorText}`);
        }

        const resp = await response.json();

        // Response shape: { code: "SUCCESS", data: { taskId, generations: [{ status, url }] } }
        const gen = resp?.data?.generations?.[0];
        const rawStatus = gen?.status ?? resp?.data?.status ?? null;
        const genStatus = normalisePolloStatus(rawStatus);
        // URL is in gen.url (empty string when not ready, full URL when succeed)
        const genUrl = (gen?.url && gen.url.length > 0) ? gen.url : null;

        // Update database with current status
        await conn.execute(
          `UPDATE pollo_generations 
          SET status = ?, videoUrl = ?, updatedAt = CURRENT_TIMESTAMP
          WHERE taskId = ? AND userId = ?`,
          [genStatus, genUrl, input.taskId, ctx.user.id]
        );

        // Get updated record
        const [rows] = await conn.execute(
          `SELECT * FROM pollo_generations 
          WHERE taskId = ? AND userId = ?`,
          [input.taskId, ctx.user.id]
        );
        const generation = (rows as any[])[0];

        return {
          success: true,
          status: genStatus,
          videoUrl: genUrl,
          generation,
        };
      } catch (error: any) {
        console.error("Pollo.ai status check error:", error);
        throw new Error(`Failed to check status: ${error.message}`);
      } finally {
        await conn.end();
      }
    }),

  /**
   * Get generation history with pagination
   */
  getGenerationHistory: ownerOnlyProcedure
    .input(
      z.object({
        page: z.number().min(1).default(1),
        limit: z.number().min(1).max(100).default(20),
      })
    )
    .query(async ({ input, ctx }) => {
      const conn = await getDbConnection();
      try {
        const offset = (input.page - 1) * input.limit;

        // Get total count
        const [countRows] = await conn.execute(
          `SELECT COUNT(*) as total FROM pollo_generations WHERE userId = ?`,
          [ctx.user.id]
        );
        const total = (countRows as any[])[0].total;

        // Get paginated records
        const [rows] = await conn.execute(
          `SELECT * FROM pollo_generations 
          WHERE userId = ?
          ORDER BY createdAt DESC
          LIMIT ? OFFSET ?`,
          [ctx.user.id, input.limit, offset]
        );
        const generations = rows as any[];

        return {
          success: true,
          generations,
          pagination: {
            page: input.page,
            limit: input.limit,
            total,
            totalPages: Math.ceil(total / input.limit),
          },
        };
      } catch (error: any) {
        console.error("Get generation history error:", error);
        throw new Error(`Failed to get history: ${error.message}`);
      } finally {
        await conn.end();
      }
    }),

  /**
   * Save generation to vault
   */
  saveToVault: ownerOnlyProcedure
    .input(
      z.object({
        generationId: z.number(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const conn = await getDbConnection();
      try {
        // Update savedToVault flag
        await conn.execute(
          `UPDATE pollo_generations 
          SET savedToVault = TRUE, updatedAt = CURRENT_TIMESTAMP
          WHERE id = ? AND userId = ?`,
          [input.generationId, ctx.user.id]
        );

        // Get updated record
        const [rows] = await conn.execute(
          `SELECT * FROM pollo_generations 
          WHERE id = ? AND userId = ?`,
          [input.generationId, ctx.user.id]
        );
        const generation = (rows as any[])[0];

        return {
          success: true,
          generation,
        };
      } catch (error: any) {
        console.error("Save to vault error:", error);
        throw new Error(`Failed to save to vault: ${error.message}`);
      } finally {
        await conn.end();
      }
    }),

  /**
   * Set generation video as hero video
   */
  setAsHero: ownerOnlyProcedure
    .input(
      z.object({
        generationId: z.number(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const conn = await getDbConnection();
      try {
        // Get the generation record
        const [rows] = await conn.execute(
          `SELECT * FROM pollo_generations 
          WHERE id = ? AND userId = ?`,
          [input.generationId, ctx.user.id]
        );
        const generation = (rows as any[])[0];

        if (!generation) {
          throw new Error("Generation not found");
        }
        if (!generation.videoUrl) {
          throw new Error("Video URL not available yet");
        }

        // Update platform_settings with hero video URL
        await conn.execute(
          `INSERT INTO platform_settings (settingKey, settingValue, updatedAt)
          VALUES ('KINGCAM_HERO_VIDEO_URL', ?, CURRENT_TIMESTAMP)
          ON DUPLICATE KEY UPDATE 
            settingValue = ?,
            updatedAt = CURRENT_TIMESTAMP`,
          [generation.videoUrl, generation.videoUrl]
        );

        return {
          success: true,
          heroVideoUrl: generation.videoUrl,
        };
      } catch (error: any) {
        console.error("Set as hero error:", error);
        throw new Error(`Failed to set as hero: ${error.message}`);
      } finally {
        await conn.end();
      }
    }),
});
