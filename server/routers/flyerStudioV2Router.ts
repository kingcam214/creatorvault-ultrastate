import { z } from "zod";
import { randomUUID } from "crypto";
import mysql from "mysql2/promise";
import { router, protectedProcedure } from "../_core/trpc";
import { renderMarketingStill, renderWithRemotion } from "../remotion/remotionRenderService";

const CREATORVAULT_HOST = "creatorvault.live";
const DEFAULT_PROOF_SOURCE = "https://creatorvault.live/uploads/content-vault/homepage-motion-78/CreatorVault-Homepage-Motion-Pilot.mp4";

const creativeDirectionSchema = z.enum(["black_label", "kings_release", "after_hours", "creator_spotlight"]);
const marketingFormatSchema = z.enum(["editorial_flyer", "motion_flyer", "motion_mixtape_cover"]);
const mediaTypeSchema = z.enum(["image", "video"]);

function extractRows(result: unknown): Array<Record<string, unknown>> {
  if (Array.isArray(result) && Array.isArray(result[0])) return result[0] as Array<Record<string, unknown>>;
  return Array.isArray(result) ? result as Array<Record<string, unknown>> : [];
}

async function getDb() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("CreatorVault storage is not configured for Marketing Maker projects.");
  const parsed = new URL(url);
  return mysql.createConnection({
    host: parsed.hostname,
    port: Number(parsed.port || 3306),
    user: decodeURIComponent(parsed.username),
    password: decodeURIComponent(parsed.password),
    database: parsed.pathname.replace(/^\//, ""),
  });
}

async function ensureMotionFlyerTable(connection: mysql.Connection): Promise<void> {
  await connection.execute(`CREATE TABLE IF NOT EXISTS motion_flyer_projects (
    id VARCHAR(64) PRIMARY KEY,
    creator_id INT NOT NULL,
    headline VARCHAR(180) NOT NULL,
    supporting_line VARCHAR(360) NOT NULL,
    call_to_action VARCHAR(180) NOT NULL,
    source_video_url TEXT NOT NULL,
    platform VARCHAR(32) NOT NULL,
    creative_direction VARCHAR(64) NOT NULL,
    status VARCHAR(32) NOT NULL,
    artifact_url TEXT NULL,
    thumbnail_url TEXT NULL,
    render_error TEXT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_motion_flyer_creator_created (creator_id, created_at)
  )`);
}

async function ensureMarketingMakerTable(connection: mysql.Connection): Promise<void> {
  await connection.execute(`CREATE TABLE IF NOT EXISTS marketing_maker_projects (
    id VARCHAR(64) PRIMARY KEY,
    creator_id INT NOT NULL,
    format VARCHAR(48) NOT NULL,
    art_direction VARCHAR(64) NOT NULL,
    headline VARCHAR(180) NOT NULL,
    supporting_line VARCHAR(360) NOT NULL,
    call_to_action VARCHAR(180) NOT NULL,
    source_media_url TEXT NOT NULL,
    source_media_type VARCHAR(16) NOT NULL,
    status VARCHAR(32) NOT NULL,
    still_url TEXT NULL,
    motion_url TEXT NULL,
    thumbnail_url TEXT NULL,
    render_error TEXT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_marketing_maker_creator_created (creator_id, created_at)
  )`);
}

function assertCreatorVaultSource(value: string): string {
  const source = new URL(value);
  const approvedPath = source.pathname.startsWith("/uploads/") || source.pathname.startsWith("/videos/");
  if (source.protocol !== "https:" || source.hostname !== CREATORVAULT_HOST || !approvedPath) {
    throw new Error("Marketing Maker can only use ready media already stored in CreatorVault.");
  }
  return source.toString();
}

function directionTokens(direction: z.infer<typeof creativeDirectionSchema>) {
  switch (direction) {
    case "kings_release":
      return { accentColor: "C9A84C", motionPreset: "gold_rush" as const, artistName: "CREATORVAULT" };
    case "after_hours":
      return { accentColor: "9A7754", motionPreset: "dark_empire" as const, artistName: "AFTER HOURS" };
    case "creator_spotlight":
      return { accentColor: "00D9FF", motionPreset: "neon_pulse" as const, artistName: "CREATOR SPOTLIGHT" };
    case "black_label":
    default:
      return { accentColor: "C9A84C", motionPreset: "gold_rush" as const, artistName: "BY DEVINE DESIGN" };
  }
}

function outputDimensions(format: z.infer<typeof marketingFormatSchema>) {
  return format === "motion_mixtape_cover" ? { width: 1080, height: 1080 } : { width: 1080, height: 1920 };
}

const flyerInput = z.object({
  headline: z.string().trim().min(2).max(180),
  supportingLine: z.string().trim().min(2).max(360),
  callToAction: z.string().trim().min(2).max(180),
  sourceVideoUrl: z.string().url().max(4000),
  platform: z.enum(["instagram", "tiktok", "facebook", "youtube", "story"]).default("instagram"),
  creativeDirection: z.enum(["editorial", "midnight", "gold-room"]).default("editorial"),
});

const marketingMakerInput = z.object({
  format: marketingFormatSchema,
  artDirection: creativeDirectionSchema,
  headline: z.string().trim().min(2).max(90),
  supportingLine: z.string().trim().max(240).default(""),
  callToAction: z.string().trim().max(80).default(""),
  sourceMediaUrl: z.string().url().max(4000),
  sourceMediaType: mediaTypeSchema,
});

export const flyerStudioV2Router = router({
  createMotionFlyer: protectedProcedure.input(flyerInput).mutation(async ({ ctx, input }) => {
    const sourceVideoUrl = assertCreatorVaultSource(input.sourceVideoUrl);
    const projectId = randomUUID();
    const connection = await getDb();

    try {
      await ensureMotionFlyerTable(connection);
      await connection.execute(
        `INSERT INTO motion_flyer_projects
          (id, creator_id, headline, supporting_line, call_to_action, source_video_url, platform, creative_direction, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'creating')`,
        [projectId, ctx.user.id, input.headline, input.supportingLine, input.callToAction, sourceVideoUrl, input.platform, input.creativeDirection],
      );

      const render = await renderWithRemotion({
        jobId: projectId,
        mode: "flyer",
        baseImagePath: "",
        baseImageUrl: "",
        backgroundVideoUrl: sourceVideoUrl,
        width: 1080,
        height: 1920,
        fps: 30,
        durationSeconds: 6,
        motionPreset: "gold_rush",
        premiumMode: true,
        cinematicMode: true,
        artistName: "CreatorVault",
        songTitle: input.headline,
        subtitle: input.supportingLine,
        callToAction: input.callToAction,
        textPreset: "editorial-motion",
        accentColor: "D4AF37",
        textColor: "FFFFFF",
        fontFamily: "Montserrat",
      });

      if (!render.success || !render.videoUrl) {
        const message = String(render.error || "Motion Flyer could not be prepared.");
        await connection.execute(
          "UPDATE motion_flyer_projects SET status = 'failed', render_error = ? WHERE id = ? AND creator_id = ?",
          [message, projectId, ctx.user.id],
        );
        throw new Error(message);
      }

      const artifactUrl = `https://creatorvault.live${render.videoUrl}`;
      const thumbnailUrl = render.thumbnailUrl ? `https://creatorvault.live${render.thumbnailUrl}` : null;
      await connection.execute(
        "UPDATE motion_flyer_projects SET status = 'ready', artifact_url = ?, thumbnail_url = ? WHERE id = ? AND creator_id = ?",
        [artifactUrl, thumbnailUrl, projectId, ctx.user.id],
      );

      return { projectId, status: "ready" as const, artifactUrl, thumbnailUrl, durationSeconds: render.durationSeconds, sourceVideoUrl };
    } finally {
      await connection.end();
    }
  }),

  createMarketingMakerProject: protectedProcedure.input(marketingMakerInput).mutation(async ({ ctx, input }) => {
    const sourceMediaUrl = assertCreatorVaultSource(input.sourceMediaUrl);
    if (input.format === "motion_flyer" && input.sourceMediaType !== "video") {
      throw new Error("Motion Flyer needs a real CreatorVault video so the design moves from actual creator footage.");
    }

    const projectId = randomUUID();
    const connection = await getDb();
    const copy = {
      headline: input.headline,
      supportingLine: input.supportingLine || "",
      callToAction: input.callToAction || "",
    };
    const direction = directionTokens(input.artDirection);
    const dimensions = outputDimensions(input.format);

    try {
      await ensureMarketingMakerTable(connection);
      await connection.execute(
        `INSERT INTO marketing_maker_projects
          (id, creator_id, format, art_direction, headline, supporting_line, call_to_action, source_media_url, source_media_type, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'creating')`,
        [projectId, ctx.user.id, input.format, input.artDirection, copy.headline, copy.supportingLine, copy.callToAction, sourceMediaUrl, input.sourceMediaType],
      );

      const sharedContract = {
        jobId: projectId,
        mode: "flyer" as const,
        baseImagePath: "",
        baseImageUrl: "",
        backgroundVideoUrl: input.sourceMediaType === "video" ? sourceMediaUrl : "",
        width: dimensions.width,
        height: dimensions.height,
        fps: 30,
        durationSeconds: 6,
        motionPreset: direction.motionPreset,
        premiumMode: true,
        cinematicMode: true,
        artistName: direction.artistName,
        songTitle: copy.headline,
        subtitle: copy.supportingLine,
        callToAction: copy.callToAction,
        textPreset: "by-devine-design-editorial",
        accentColor: direction.accentColor,
        textColor: "FFFFFF",
        fontFamily: "Montserrat",
        sourceMediaUrl,
        sourceMediaType: input.sourceMediaType,
      };

      const still = await renderMarketingStill({ ...sharedContract, format: input.format });
      if (!still.success || !still.imageUrl) {
        const message = String(still.error || "The editorial still could not be prepared.");
        await connection.execute("UPDATE marketing_maker_projects SET status = 'failed', render_error = ? WHERE id = ? AND creator_id = ?", [message, projectId, ctx.user.id]);
        throw new Error(message);
      }

      let motionUrl: string | null = null;
      let thumbnailUrl: string | null = null;
      if (input.format !== "editorial_flyer") {
        const motion = await renderWithRemotion(sharedContract as any);
        if (!motion.success || !motion.videoUrl) {
          const message = String(motion.error || "The motion version could not be prepared.");
          await connection.execute("UPDATE marketing_maker_projects SET status = 'failed', render_error = ? WHERE id = ? AND creator_id = ?", [message, projectId, ctx.user.id]);
          throw new Error(message);
        }
        motionUrl = `https://creatorvault.live${motion.videoUrl}`;
        thumbnailUrl = motion.thumbnailUrl ? `https://creatorvault.live${motion.thumbnailUrl}` : null;
      }

      const stillUrl = `https://creatorvault.live${still.imageUrl}`;
      await connection.execute(
        `UPDATE marketing_maker_projects
            SET status = 'ready', still_url = ?, motion_url = ?, thumbnail_url = ?
          WHERE id = ? AND creator_id = ?`,
        [stillUrl, motionUrl, thumbnailUrl, projectId, ctx.user.id],
      );

      return {
        projectId,
        status: "ready" as const,
        format: input.format,
        stillUrl,
        motionUrl,
        thumbnailUrl,
        sourceMediaUrl,
      };
    } finally {
      await connection.end();
    }
  }),

  getMarketingMakerProjects: protectedProcedure.query(async ({ ctx }) => {
    const connection = await getDb();
    try {
      await ensureMarketingMakerTable(connection);
      const [rows] = await connection.execute(
        `SELECT id, format, art_direction AS artDirection, headline, supporting_line AS supportingLine,
                call_to_action AS callToAction, source_media_url AS sourceMediaUrl, source_media_type AS sourceMediaType,
                status, still_url AS stillUrl, motion_url AS motionUrl, thumbnail_url AS thumbnailUrl,
                render_error AS renderError, created_at AS createdAt, updated_at AS updatedAt
           FROM marketing_maker_projects
          WHERE creator_id = ?
          ORDER BY created_at DESC
          LIMIT 30`,
        [ctx.user.id],
      );
      return { projects: extractRows([rows]) };
    } finally {
      await connection.end();
    }
  }),

  getFlyers: protectedProcedure.query(async ({ ctx }) => {
    const connection = await getDb();
    try {
      await ensureMotionFlyerTable(connection);
      const [rows] = await connection.execute(
        `SELECT id, headline, supporting_line AS supportingLine, call_to_action AS callToAction,
                source_video_url AS sourceVideoUrl, platform, creative_direction AS creativeDirection,
                status, artifact_url AS artifactUrl, thumbnail_url AS thumbnailUrl,
                render_error AS renderError, created_at AS createdAt, updated_at AS updatedAt
           FROM motion_flyer_projects
          WHERE creator_id = ?
          ORDER BY created_at DESC
          LIMIT 30`,
        [ctx.user.id],
      );
      return { flyers: extractRows([rows]) };
    } finally {
      await connection.end();
    }
  }),

  createCertifiedProof: protectedProcedure.mutation(async ({ ctx }) => {
    const sourceVideoUrl = DEFAULT_PROOF_SOURCE;
    const projectId = randomUUID();
    const connection = await getDb();
    try {
      await ensureMotionFlyerTable(connection);
      await connection.execute(
        `INSERT INTO motion_flyer_projects
          (id, creator_id, headline, supporting_line, call_to_action, source_video_url, platform, creative_direction, status)
         VALUES (?, ?, ?, ?, ?, ?, 'instagram', 'editorial', 'creating')`,
        [projectId, ctx.user.id, "MAKE THEM FEEL IT", "CreatorVault turns the moment into a release they cannot scroll past.", "ENTER THE VAULT", sourceVideoUrl],
      );
      const render = await renderWithRemotion({
        jobId: projectId,
        mode: "flyer",
        baseImagePath: "",
        baseImageUrl: "",
        backgroundVideoUrl: sourceVideoUrl,
        width: 1080,
        height: 1920,
        fps: 30,
        durationSeconds: 6,
        motionPreset: "gold_rush",
        premiumMode: true,
        cinematicMode: true,
        artistName: "CreatorVault",
        songTitle: "MAKE THEM FEEL IT",
        subtitle: "CreatorVault turns the moment into a release they cannot scroll past.",
        callToAction: "ENTER THE VAULT",
        textPreset: "editorial-motion",
        accentColor: "D4AF37",
        textColor: "FFFFFF",
        fontFamily: "Montserrat",
      });
      if (!render.success || !render.videoUrl) {
        const message = String(render.error || "Motion Flyer proof could not be prepared.");
        await connection.execute("UPDATE motion_flyer_projects SET status = 'failed', render_error = ? WHERE id = ?", [message, projectId]);
        throw new Error(message);
      }
      const artifactUrl = `https://creatorvault.live${render.videoUrl}`;
      const thumbnailUrl = render.thumbnailUrl ? `https://creatorvault.live${render.thumbnailUrl}` : null;
      await connection.execute("UPDATE motion_flyer_projects SET status = 'ready', artifact_url = ?, thumbnail_url = ? WHERE id = ?", [artifactUrl, thumbnailUrl, projectId]);
      return { projectId, status: "ready" as const, artifactUrl, thumbnailUrl, durationSeconds: render.durationSeconds, sourceVideoUrl };
    } finally {
      await connection.end();
    }
  }),

  deleteFlyer: protectedProcedure.input(z.object({ flyerId: z.string().uuid() })).mutation(async ({ ctx, input }) => {
    const connection = await getDb();
    try {
      await ensureMotionFlyerTable(connection);
      await connection.execute("DELETE FROM motion_flyer_projects WHERE id = ? AND creator_id = ?", [input.flyerId, ctx.user.id]);
      return { deleted: true, flyerId: input.flyerId };
    } finally {
      await connection.end();
    }
  }),
});
