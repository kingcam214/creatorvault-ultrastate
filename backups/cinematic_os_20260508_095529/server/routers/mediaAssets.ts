import { randomUUID } from "crypto";
import { z } from "zod";
import { sql } from "drizzle-orm";
import { protectedProcedure, router } from "../_core/trpc";
import { getDb } from "../db";

const mediaFilterSchema = z.enum(["all", "videos", "images"]).default("all");

/* ── helper: mysql2 + drizzle returns [rows[], fields[]] ── */
function extractRows(result: unknown): any[] {
  if (!result) return [];
  // mysql2 returns [rows, fields] tuple
  if (Array.isArray(result) && result.length >= 1 && Array.isArray(result[0])) {
    return result[0];
  }
  // fallback for other adapters
  if (Array.isArray(result)) return result;
  if ((result as any)?.rows) return (result as any).rows;
  return [];
}

type TrailerAssetRow = {
  id: string;
  user_id: number;
  asset_type: string | null;
  source_type: string | null;
  file_name: string | null;
  original_name: string | null;
  mime_type: string | null;
  file_size: number | string | null;
  storage_path: string | null;
  public_url: string | null;
  thumbnail_url: string | null;
  duration: number | string | null;
  width: number | string | null;
  height: number | string | null;
  fps: number | string | null;
  has_audio: boolean | number | null;
  has_video: boolean | number | null;
  status: string | null;
  created_by_feature: string | null;
  created_at: Date | string | null;
};

type TrailerSegmentInput = {
  sceneIndex: number;
  text: string;
  visualDescription?: string;
  duration?: number;
};

function toNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function boolish(value: unknown): boolean {
  return value === true || value === 1 || value === "1";
}

function inferAssetKind(asset: TrailerAssetRow): "video" | "image" | "audio" | "document" | "other" {
  const declared = String(asset.asset_type ?? "").toLowerCase();
  const mime = String(asset.mime_type ?? "").toLowerCase();
  if (declared === "video" || mime.startsWith("video/")) return "video";
  if (declared === "image" || mime.startsWith("image/")) return "image";
  if (declared === "audio" || mime.startsWith("audio/")) return "audio";
  if (declared === "document" || mime.includes("pdf") || mime.startsWith("text/")) return "document";
  return "other";
}

function aspectRatio(width: number | null, height: number | null): string | null {
  if (!width || !height) return null;
  const ratio = width / height;
  if (Math.abs(ratio - 16 / 9) < 0.08) return "16:9";
  if (Math.abs(ratio - 9 / 16) < 0.08) return "9:16";
  if (Math.abs(ratio - 1) < 0.08) return "1:1";
  return `${width}:${height}`;
}

function buildAssetIntelligence(asset: TrailerAssetRow, format: "16:9" | "9:16" | "1:1", index: number) {
  const width = toNumber(asset.width);
  const height = toNumber(asset.height);
  const duration = toNumber(asset.duration);
  const fileSize = toNumber(asset.file_size);
  const fps = toNumber(asset.fps);
  const kind = inferAssetKind(asset);
  const ratio = aspectRatio(width, height);
  const publicUrl = asset.public_url || `/api/media/asset/${asset.id}`;
  const warnings: string[] = [];

  if (!asset.public_url) warnings.push("Asset has no stored public_url; route fallback /api/media/asset/:id will be used.");
  if (asset.status !== "ready") warnings.push(`Asset status is ${asset.status ?? "unknown"}, not ready.`);
  if ((kind === "video" || kind === "image") && (!width || !height)) warnings.push("Visual dimensions are missing, so framing must be verified before final render.");
  if (ratio && ["16:9", "9:16", "1:1"].includes(ratio) && ratio !== format) warnings.push(`Asset aspect ratio ${ratio} differs from project format ${format}; crop/pad pass required.`);
  if (kind === "video" && !duration) warnings.push("Video duration metadata is missing, so scene timing uses deterministic fallback duration.");
  if (kind === "audio" || kind === "document" || kind === "other") warnings.push(`Asset type ${kind} is not directly visual; it can support copy/audio but not visual scene coverage by itself.`);

  const score = Math.max(0, 100 - warnings.length * 12 - (kind === "other" ? 25 : 0));

  return {
    id: String(asset.id),
    sequence: index + 1,
    kind,
    fileName: asset.file_name ?? asset.original_name ?? String(asset.id),
    originalName: asset.original_name ?? null,
    mimeType: asset.mime_type ?? null,
    sourceType: asset.source_type ?? null,
    createdByFeature: asset.created_by_feature ?? null,
    publicUrl,
    thumbnailUrl: asset.thumbnail_url ?? asset.public_url ?? publicUrl,
    width,
    height,
    aspectRatio: ratio,
    durationSeconds: duration,
    fps,
    fileSizeBytes: fileSize,
    hasAudio: boolish(asset.has_audio),
    hasVideo: boolish(asset.has_video) || kind === "video",
    status: asset.status,
    suitabilityScore: score,
    warnings,
  };
}

function deriveSceneRole(index: number, total: number): "hook" | "proof" | "transformation" | "offer" | "cta" {
  if (index === 0) return "hook";
  if (index === total - 1) return "cta";
  if (index === 1) return "proof";
  if (index === total - 2) return "offer";
  return "transformation";
}

function normalizeScriptLines(scriptText?: string | null): string[] {
  return (scriptText ?? "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

function buildGroundedTrailerBlueprint(params: {
  id: string;
  userId: number;
  input: {
    projectName: string;
    projectType: "launch_trailer" | "creator_case_study" | "feature_promo" | "emma_domination";
    format: "16:9" | "9:16" | "1:1";
    title?: string;
    concept?: string;
    scriptText?: string;
    hooks?: string[];
    segments?: TrailerSegmentInput[];
  };
  assets: TrailerAssetRow[];
}) {
  const scriptLines = normalizeScriptLines(params.input.scriptText);
  const assetIntelligence = params.assets.map((asset, index) => buildAssetIntelligence(asset, params.input.format, index));
  const totalAssets = assetIntelligence.length;

  const scenes = assetIntelligence.map((asset, index) => {
    const suppliedSegment = params.input.segments?.find((segment) => segment.sceneIndex === index) ?? params.input.segments?.[index];
    const role = deriveSceneRole(index, totalAssets);
    const durationSeconds = suppliedSegment?.duration && suppliedSegment.duration > 0
      ? Math.min(Math.round(suppliedSegment.duration), 12)
      : asset.kind === "video" && asset.durationSeconds
        ? Math.max(3, Math.min(Math.round(asset.durationSeconds), 8))
        : 4;
    const overlayText = suppliedSegment?.text?.trim()
      || scriptLines[index]
      || params.input.hooks?.[index]
      || (role === "hook" ? (params.input.title || params.input.projectName) : `${role.toUpperCase()} · ${asset.fileName}`);

    return {
      sceneIndex: index,
      role,
      durationSeconds,
      sourceAssetId: asset.id,
      sourceUrl: asset.publicUrl,
      sourceFeature: asset.createdByFeature,
      assetKind: asset.kind,
      assetAspectRatio: asset.aspectRatio,
      assetDimensions: { width: asset.width, height: asset.height },
      overlayText,
      visualDirection: suppliedSegment?.visualDescription?.trim()
        || `Use real asset ${asset.fileName} as the ${role} scene foundation; preserve CreatorVault cinematic gold-on-black identity and apply crop/pad only if required for ${params.input.format}.`,
      requiredRenderTreatment: asset.aspectRatio && asset.aspectRatio !== params.input.format ? "crop_or_pad_verified_before_render" : "native_or_safe_fit",
      warnings: asset.warnings,
    };
  });

  const readinessWarnings = assetIntelligence.flatMap((asset) => asset.warnings.map((warning) => `${asset.fileName}: ${warning}`));
  const visualSceneCount = assetIntelligence.filter((asset) => asset.kind === "video" || asset.kind === "image").length;
  if (visualSceneCount === 0) readinessWarnings.push("No image or video assets were selected, so visual render coverage is incomplete.");

  return {
    version: "creatorvault.grounded_trailer_blueprint.v1",
    generatedAt: new Date().toISOString(),
    trailerProjectId: params.id,
    userId: params.userId,
    project: {
      name: params.input.projectName,
      type: params.input.projectType,
      title: params.input.title ?? null,
      concept: params.input.concept ?? null,
      format: params.input.format,
    },
    readiness: {
      state: readinessWarnings.length === 0 ? "blueprint_ready" : "blueprint_ready_with_warnings",
      canProceedToRenderPlanning: visualSceneCount > 0,
      assetCount: totalAssets,
      visualSceneCount,
      estimatedDurationSeconds: scenes.reduce((sum, scene) => sum + scene.durationSeconds, 0),
      warnings: readinessWarnings,
    },
    hooks: params.input.hooks ?? [],
    assetIntelligence,
    scenes,
    lineage: {
      sourceTable: "media_assets",
      selectedAssetIds: assetIntelligence.map((asset) => asset.id),
      primaryAssetId: assetIntelligence[0]?.id ?? null,
      producedBy: "mediaAssets.createTrailerProject",
      productionClaim: "Verified project blueprint only; no finished rendered video is claimed by this mutation.",
    },
    renderHandoff: {
      status: "not_rendered",
      recommendedNextEngine: "remotion_or_ffmpeg_with_optional_pollo_scene_extension",
      requiredBeforeRender: [
        "Resolve any readiness warnings.",
        "Confirm final crop/pad treatment for non-native aspect ratios.",
        "Attach the blueprint to a real render job before exposing output_url.",
      ],
    },
  };
}

export const mediaAssetsRouter = router({
  list: protectedProcedure
    .input(
      z
        .object({
          filter: mediaFilterSchema.optional(),
          limit: z.number().int().min(1).max(200).default(100),
        })
        .optional()
    )
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) return [];

      const filter = input?.filter ?? "all";
      const limit = input?.limit ?? 100;

      const typeCondition =
        filter === "videos"
          ? sql`AND (asset_type = 'video' OR mime_type LIKE 'video/%')`
          : filter === "images"
          ? sql`AND (asset_type = 'image' OR mime_type LIKE 'image/%')`
          : sql``;

      const query = sql`
        SELECT
          id,
          user_id,
          asset_type,
          source_type,
          file_name,
          original_name,
          mime_type,
          file_size,
          public_url,
          thumbnail_url,
          storage_path,
          duration,
          width,
          height,
          status,
          created_at
        FROM media_assets
        WHERE user_id = ${ctx.user.id}
          AND status = 'ready'
          ${typeCondition}
        ORDER BY created_at DESC
        LIMIT ${limit}
      `;

      const result = await db.execute(query as any);
      const rows = extractRows(result);

      return rows.map((row: any) => ({
        id: String(row.id),
        userId: Number(row.user_id),
        assetType: row.asset_type ?? null,
        sourceType: row.source_type ?? null,
        fileName: row.file_name ?? row.original_name ?? "Untitled",
        originalName: row.original_name ?? null,
        mimeType: row.mime_type ?? null,
        fileSize: row.file_size ? Number(row.file_size) : null,
        publicUrl: row.public_url ?? row.storage_path ?? null,
        thumbnailUrl: row.thumbnail_url ?? row.public_url ?? row.storage_path ?? null,
        storagePath: row.storage_path ?? null,
        duration: row.duration ? Number(row.duration) : null,
        width: row.width ? Number(row.width) : null,
        height: row.height ? Number(row.height) : null,
        status: row.status ?? null,
        createdAt: row.created_at ?? null,
      }));
    }),

  createTrailerProject: protectedProcedure
    .input(
      z.object({
        projectName: z.string().min(1).max(200),
        projectType: z
          .enum(["launch_trailer", "creator_case_study", "feature_promo", "emma_domination"])
          .default("launch_trailer"),
        format: z.enum(["16:9", "9:16", "1:1"]).default("16:9"),
        title: z.string().max(300).optional(),
        concept: z.string().optional(),
        scriptText: z.string().optional(),
        selectedAssetIds: z.array(z.string().min(1)).min(1),
        segments: z
          .array(
            z.object({
              sceneIndex: z.number().int().min(0),
              text: z.string(),
              visualDescription: z.string().optional(),
              duration: z.number().optional(),
            })
          )
          .optional(),
        hooks: z.array(z.string()).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) {
        throw new Error("Database not available");
      }

      const id = randomUUID();
      const requestedAssetIds = Array.from(new Set(input.selectedAssetIds.map((assetId) => assetId.trim()).filter(Boolean)));
      if (requestedAssetIds.length === 0) {
        throw new Error("No media asset IDs were provided for trailer grounding");
      }

      const selectedIdsSql = sql.join(requestedAssetIds.map((assetId) => sql`${assetId}`), sql`, `);
      const ownedAssetsResult = await db.execute(
        sql`
          SELECT
            id,
            user_id,
            asset_type,
            source_type,
            file_name,
            original_name,
            mime_type,
            file_size,
            storage_path,
            public_url,
            thumbnail_url,
            duration,
            width,
            height,
            fps,
            has_audio,
            has_video,
            status,
            created_by_feature,
            created_at
          FROM media_assets
          WHERE user_id = ${ctx.user.id}
            AND status = 'ready'
            AND id IN (${selectedIdsSql})
          LIMIT ${requestedAssetIds.length}
        ` as any
      );
      const ownedAssetRows = extractRows(ownedAssetsResult) as TrailerAssetRow[];
      const ownedAssetById = new Map(ownedAssetRows.map((asset) => [String(asset.id), asset]));
      const missingAssetIds = requestedAssetIds.filter((assetId) => !ownedAssetById.has(assetId));

      if (missingAssetIds.length > 0) {
        throw new Error(`Trailer grounding failed: ${missingAssetIds.length} selected asset(s) are missing, not ready, or not owned by the current user.`);
      }

      const orderedAssets = requestedAssetIds.map((assetId) => ownedAssetById.get(assetId)).filter(Boolean) as TrailerAssetRow[];
      if (orderedAssets.length === 0) {
        throw new Error("Trailer grounding failed: no ready user-owned media assets were resolved.");
      }

      const primaryAssetId = String(orderedAssets[0].id);
      const hooks = (input.hooks ?? []).map((hook) => hook.trim()).filter(Boolean).slice(0, 6);
      const blueprint = buildGroundedTrailerBlueprint({ id, userId: ctx.user.id, input: { ...input, hooks }, assets: orderedAssets });
      const scenesJson = JSON.stringify(blueprint);
      const hooksJson = hooks.length > 0 ? JSON.stringify(hooks) : null;
      const status = blueprint.readiness.canProceedToRenderPlanning ? "scripted" : "draft";

      await db.execute(
        sql`
          INSERT INTO trailer_projects (
            id,
            user_id,
            project_name,
            project_type,
            title,
            concept,
            script_text,
            format,
            source_asset_id,
            scenes_json,
            hooks,
            hook_variants,
            status
          ) VALUES (
            ${id},
            ${ctx.user.id},
            ${input.projectName},
            ${input.projectType},
            ${input.title ?? null},
            ${input.concept ?? null},
            ${input.scriptText ?? null},
            ${input.format},
            ${primaryAssetId},
            ${scenesJson},
            ${hooksJson},
            ${hooksJson},
            ${status}
          )
        ` as any
      );

      return {
        success: true,
        trailerProjectId: id,
        status,
        mediaAssetCount: orderedAssets.length,
        assetIntelligence: blueprint.assetIntelligence,
        trailerBlueprint: blueprint,
        message: "Grounded trailer blueprint created from verified CreatorVault media assets. No rendered video output is claimed until a real render job writes output_url.",
      };
    }),

  listTrailerProjects: protectedProcedure
    .input(z.object({ limit: z.number().int().min(1).max(100).default(20) }).optional())
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) return [];

      const limit = input?.limit ?? 20;
      const result = await db.execute(
        sql`
          SELECT id, project_name, project_type, status, source_asset_id, created_at, updated_at
          FROM trailer_projects
          WHERE user_id = ${ctx.user.id}
          ORDER BY created_at DESC
          LIMIT ${limit}
        ` as any
      );

      const rows = extractRows(result);
      return rows.map((row: any) => ({
        id: String(row.id),
        projectName: row.project_name,
        projectType: row.project_type,
        status: row.status,
        sourceAssetId: row.source_asset_id,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      }));
    }),
});
