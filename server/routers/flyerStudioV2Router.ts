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
const killaGraphicsFamilySchema = z.enum([
  "monument_type_cutout",
  "culture_event_collage",
  "editorial_cover_world",
  "premium_promo_action",
  "client_identity_tour",
]);
const killaGraphicsCreationModeSchema = z.enum(["from_scratch", "master_art_motion", "layered_poster_motion"]);
const sourceLayerRoleSchema = z.enum(["background", "hero", "support", "logo", "texture"]);

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

async function ensureKillaGraphicsProjectTable(connection: mysql.Connection): Promise<void> {
  await connection.execute(`CREATE TABLE IF NOT EXISTS killagraphics_design_projects (
    id VARCHAR(64) PRIMARY KEY,
    creator_id INT NOT NULL,
    creation_mode VARCHAR(48) NOT NULL,
    format VARCHAR(48) NOT NULL,
    composition_family VARCHAR(64) NOT NULL,
    campaign_type VARCHAR(100) NOT NULL,
    campaign_world VARCHAR(180) NOT NULL,
    headline VARCHAR(180) NOT NULL,
    host_line VARCHAR(180) NOT NULL,
    supporting_line VARCHAR(360) NOT NULL,
    event_date VARCHAR(80) NOT NULL,
    event_time VARCHAR(80) NOT NULL,
    venue VARCHAR(180) NOT NULL,
    city VARCHAR(180) NOT NULL,
    ticket_line VARCHAR(240) NOT NULL,
    call_to_action VARCHAR(180) NOT NULL,
    client_name VARCHAR(180) NOT NULL,
    credit_line VARCHAR(180) NOT NULL,
    color_primary VARCHAR(16) NOT NULL,
    color_accent VARCHAR(16) NOT NULL,
    source_layers_json LONGTEXT NOT NULL,
    composition_plan_json LONGTEXT NOT NULL,
    status VARCHAR(32) NOT NULL,
    static_master_url TEXT NULL,
    motion_url TEXT NULL,
    thumbnail_url TEXT NULL,
    render_error TEXT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_killagraphics_creator_created (creator_id, created_at)
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

function killaGraphicsTokens(family: z.infer<typeof killaGraphicsFamilySchema>) {
  const system = {
    monument_type_cutout: { primary: "171717", accent: "F0C04A", text: "FFFFFF", label: "MONUMENT TYPE + CUTOUT", motionPreset: "gold_rush" as const },
    culture_event_collage: { primary: "B81524", accent: "F6C445", text: "FFFFFF", label: "CULTURE EVENT COLLAGE", motionPreset: "neon_pulse" as const },
    editorial_cover_world: { primary: "1B1A2D", accent: "D4AF37", text: "FFFFFF", label: "EDITORIAL COVER WORLD", motionPreset: "dark_empire" as const },
    premium_promo_action: { primary: "0E1E38", accent: "F4C542", text: "FFFFFF", label: "PREMIUM PROMO / ACTION", motionPreset: "gold_rush" as const },
    client_identity_tour: { primary: "163A7A", accent: "F2BA2A", text: "FFFFFF", label: "CLIENT IDENTITY / TOUR", motionPreset: "neon_pulse" as const },
  } as const;
  return system[family];
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

const killaGraphicsProjectInput = z.object({
  creationMode: killaGraphicsCreationModeSchema,
  format: marketingFormatSchema,
  compositionFamily: killaGraphicsFamilySchema,
  campaignType: z.string().trim().min(2).max(100),
  campaignWorld: z.string().trim().max(180).default(""),
  headline: z.string().trim().min(2).max(180),
  hostLine: z.string().trim().max(180).default(""),
  supportingLine: z.string().trim().max(360).default(""),
  eventDate: z.string().trim().max(80).default(""),
  eventTime: z.string().trim().max(80).default(""),
  venue: z.string().trim().max(180).default(""),
  city: z.string().trim().max(180).default(""),
  ticketLine: z.string().trim().max(240).default(""),
  callToAction: z.string().trim().max(180).default(""),
  clientName: z.string().trim().max(180).default(""),
  creditLine: z.string().trim().max(180).default("DESIGN BY KILLAGRAPHICS"),
  colorPrimary: z.string().trim().regex(/^#?[0-9a-fA-F]{6}$/).default("171717"),
  colorAccent: z.string().trim().regex(/^#?[0-9a-fA-F]{6}$/).default("F0C04A"),
  sourceLayers: z.array(z.object({
    url: z.string().url().max(4000),
    mediaType: mediaTypeSchema,
    role: sourceLayerRoleSchema,
    fileName: z.string().trim().max(255).default("CreatorVault source"),
  })).max(4).default([]),
});

function cleanHex(value: string): string {
  return value.replace(/^#/, "").toUpperCase();
}

function buildKillaGraphicsPlan(input: z.infer<typeof killaGraphicsProjectInput>, sourceLayers: Array<z.infer<typeof killaGraphicsProjectInput>["sourceLayers"][number]>) {
  const tokens = killaGraphicsTokens(input.compositionFamily);
  const primary = cleanHex(input.colorPrimary || tokens.primary);
  const accent = cleanHex(input.colorAccent || tokens.accent);
  return {
    version: "killagraphics-dna-v1",
    creationMode: input.creationMode,
    family: input.compositionFamily,
    familyLabel: tokens.label,
    campaign: { type: input.campaignType, world: input.campaignWorld, client: input.clientName },
    colors: { primary, accent, text: tokens.text },
    authority: input.creationMode === "master_art_motion" ? "flat_master_art" : "declared_killagraphics_composition",
    layerTruth: sourceLayers.map((layer, index) => ({ id: `source-${index + 1}`, role: layer.role, mediaType: layer.mediaType, fileName: layer.fileName, sourceUrl: layer.url, state: "real_source_layer" })),
    layout: {
      titleArchitecture: input.compositionFamily === "monument_type_cutout" || input.compositionFamily === "culture_event_collage" || input.compositionFamily === "premium_promo_action",
      informationZones: ["host", "date_time", "venue_city", "ticket_cta", "credit"],
      protectedMarks: [input.clientName, input.creditLine].filter(Boolean),
    },
    copy: {
      headline: input.headline, hostLine: input.hostLine, supportingLine: input.supportingLine,
      eventDate: input.eventDate, eventTime: input.eventTime, venue: input.venue, city: input.city,
      ticketLine: input.ticketLine, callToAction: input.callToAction, creditLine: input.creditLine,
    },
    motionLaw: {
      order: ["title_architecture", "hero_source", "event_information", "final_poster_hold"],
      forbidden: ["fake_layers", "rubberized_people", "template_bounce", "random_glitch", "unreadable_information"],
      finalHoldRequired: true,
    },
  };
}

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

  createKillaGraphicsProject: protectedProcedure.input(killaGraphicsProjectInput).mutation(async ({ ctx, input }) => {
    const sourceLayers = input.sourceLayers.map((layer) => ({ ...layer, url: assertCreatorVaultSource(layer.url) }));
    if (input.creationMode === "master_art_motion" && sourceLayers.length !== 1) {
      throw new Error("Bring Master to Life uses exactly one finished CreatorVault flyer, cover, or poster as the flat master artwork.");
    }
    if (input.creationMode === "layered_poster_motion" && sourceLayers.length < 2) {
      throw new Error("Layered Poster Motion needs at least two real declared CreatorVault layers. Use Bring Master to Life for one flattened flyer.");
    }

    const projectId = randomUUID();
    const connection = await getDb();
    const plan = buildKillaGraphicsPlan(input, sourceLayers);
    const tokens = killaGraphicsTokens(input.compositionFamily);
    const dimensions = outputDimensions(input.format);
    const primary = cleanHex(input.colorPrimary || tokens.primary);
    const accent = cleanHex(input.colorAccent || tokens.accent);
    const heroLayer = sourceLayers.find((layer) => layer.role === "hero") || sourceLayers.find((layer) => layer.role === "background") || sourceLayers[0];

    try {
      await ensureKillaGraphicsProjectTable(connection);
      await connection.execute(
        `INSERT INTO killagraphics_design_projects
          (id, creator_id, creation_mode, format, composition_family, campaign_type, campaign_world, headline, host_line,
           supporting_line, event_date, event_time, venue, city, ticket_line, call_to_action, client_name, credit_line,
           color_primary, color_accent, source_layers_json, composition_plan_json, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'creating')`,
        [projectId, ctx.user.id, input.creationMode, input.format, input.compositionFamily, input.campaignType, input.campaignWorld,
          input.headline, input.hostLine, input.supportingLine, input.eventDate, input.eventTime, input.venue, input.city,
          input.ticketLine, input.callToAction, input.clientName, input.creditLine, primary, accent, JSON.stringify(sourceLayers), JSON.stringify(plan)],
      );

      const contract = {
        jobId: projectId,
        mode: "flyer" as const,
        baseImagePath: "",
        baseImageUrl: "",
        backgroundVideoUrl: heroLayer?.mediaType === "video" ? heroLayer.url : "",
        width: dimensions.width,
        height: dimensions.height,
        fps: 30,
        durationSeconds: 7,
        motionPreset: tokens.motionPreset,
        premiumMode: true,
        cinematicMode: true,
        artistName: input.clientName || input.hostLine || "KILLAGRAPHICS",
        songTitle: input.headline,
        subtitle: input.supportingLine,
        callToAction: input.callToAction,
        textPreset: "killagraphics-poster",
        accentColor: accent,
        textColor: tokens.text,
        fontFamily: "Arial Black",
        sourceMediaUrl: heroLayer?.url || "",
        sourceMediaType: heroLayer?.mediaType || "image",
        killaGraphicsPlan: plan,
        sourceLayers,
      };

      const still = await renderMarketingStill({ ...contract, format: input.format } as any);
      if (!still.success || !still.imageUrl) {
        const message = String(still.error || "KillaGraphics static master could not be prepared.");
        await connection.execute("UPDATE killagraphics_design_projects SET status = 'failed', render_error = ? WHERE id = ? AND creator_id = ?", [message, projectId, ctx.user.id]);
        throw new Error(message);
      }

      let motionUrl: string | null = null;
      let thumbnailUrl: string | null = null;
      if (input.format !== "editorial_flyer") {
        const motion = await renderWithRemotion(contract as any);
        if (!motion.success || !motion.videoUrl) {
          const message = String(motion.error || "KillaGraphics motion could not be prepared.");
          await connection.execute("UPDATE killagraphics_design_projects SET status = 'failed', render_error = ? WHERE id = ? AND creator_id = ?", [message, projectId, ctx.user.id]);
          throw new Error(message);
        }
        motionUrl = `https://creatorvault.live${motion.videoUrl}`;
        thumbnailUrl = motion.thumbnailUrl ? `https://creatorvault.live${motion.thumbnailUrl}` : null;
      }

      const staticMasterUrl = `https://creatorvault.live${still.imageUrl}`;
      await connection.execute(
        `UPDATE killagraphics_design_projects
            SET status = 'ready', static_master_url = ?, motion_url = ?, thumbnail_url = ?
          WHERE id = ? AND creator_id = ?`,
        [staticMasterUrl, motionUrl, thumbnailUrl, projectId, ctx.user.id],
      );

      return { projectId, status: "ready" as const, creationMode: input.creationMode, format: input.format, staticMasterUrl, motionUrl, thumbnailUrl, compositionPlan: plan };
    } finally {
      await connection.end();
    }
  }),

  getKillaGraphicsProjects: protectedProcedure.query(async ({ ctx }) => {
    const connection = await getDb();
    try {
      await ensureKillaGraphicsProjectTable(connection);
      const [rows] = await connection.execute(
        `SELECT id, creation_mode AS creationMode, format, composition_family AS compositionFamily,
                campaign_type AS campaignType, campaign_world AS campaignWorld, headline, host_line AS hostLine,
                supporting_line AS supportingLine, event_date AS eventDate, event_time AS eventTime,
                venue, city, ticket_line AS ticketLine, call_to_action AS callToAction,
                client_name AS clientName, credit_line AS creditLine, color_primary AS colorPrimary,
                color_accent AS colorAccent, source_layers_json AS sourceLayersJson,
                composition_plan_json AS compositionPlanJson, status, static_master_url AS staticMasterUrl,
                motion_url AS motionUrl, thumbnail_url AS thumbnailUrl, render_error AS renderError,
                created_at AS createdAt, updated_at AS updatedAt
           FROM killagraphics_design_projects
          WHERE creator_id = ?
          ORDER BY created_at DESC
          LIMIT 30`,
        [ctx.user.id],
      );
      return { projects: extractRows([rows]).map((row) => ({
        ...row,
        sourceLayers: (() => { try { return JSON.parse(String(row.sourceLayersJson || "[]")); } catch { return []; } })(),
        compositionPlan: (() => { try { return JSON.parse(String(row.compositionPlanJson || "{}")); } catch { return {}; } })(),
      })) };
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
