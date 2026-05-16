import { randomUUID } from "crypto";
import { randomUUID } from "crypto";
import { z } from "zod";
import { sql } from "drizzle-orm";
import { protectedProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { buildAdaptiveTrailerPlan, buildCloneAwareTrailerMode } from "../services/adaptiveTrailerPlanner";
import { buildCinematicPacingPlan, buildSoundDesignPlan, buildTimelineInspectorModel, buildVoiceoverSyncPlan } from "../services/cinematicPacingEngine";
import { analyzeTrailerRetention } from "../services/trailerRetentionAnalyzer";
import { buildTrailerMediaOSManifest } from "../media-os/orchestration/trailerMediaOSOrchestrator";

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


function asNumber(value: unknown, fallback = 0): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function assetKind(row: any): string {
  const type = String(row.asset_type ?? row.mime_type ?? "").toLowerCase();
  return type.includes("video") ? "video" : type.includes("image") ? "image" : "media";
}

function defaultSceneCopy(role: string, projectName: string, title?: string | null): string {
  const name = (title || projectName || "the offer").trim();
  if (role === "hook") return `Stop scrolling. ${name} is built to turn attention into momentum.`;
  if (role === "proof") return "Real media, real proof, and a trailer system that understands the sale.";
  if (role === "offer") return "One cinematic package: hook, story, captions, voice, variants, and launch assets.";
  if (role === "cta") return "Launch the trailer. Ship the campaign. Keep the factory moving.";
  return "Show the transformation fast, clean, and impossible to ignore.";
}

function buildTrailerProductionPackage(input: any, id: string, ownedAssets: any[], selectedAssetIds: string[]) {
  const generatedAt = new Date().toISOString();
  const scriptLines = String(input.scriptText ?? "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  const hooks = (input.hooks?.length ? input.hooks : scriptLines).slice(0, 6);
  const roles = ["hook", "proof", "transformation", "offer", "cta"];
  const sceneInputs = Array.isArray(input.segments) && input.segments.length > 0 ? input.segments : ownedAssets.map((asset, index) => ({
    sceneIndex: index,
    text: scriptLines[index] || hooks[index] || defaultSceneCopy(roles[Math.min(index, roles.length - 1)] ?? "transformation", input.projectName, input.title),
    visualDescription: `${assetKind(asset)} asset ${String(asset.original_name ?? asset.file_name ?? asset.id)} drives this beat.`,
    duration: assetKind(asset) === "video" ? Math.min(6, Math.max(3, asNumber(asset.duration, 4))) : 3.5,
  }));

  const scenes = sceneInputs.map((scene: any, index: number) => {
    const asset = ownedAssets[index % Math.max(1, ownedAssets.length)] ?? ownedAssets[0] ?? {};
    const role = roles[Math.min(index, roles.length - 1)] ?? "transformation";
    return {
      sceneIndex: asNumber(scene.sceneIndex, index),
      role,
      durationSeconds: asNumber(scene.duration, role === "hook" ? 3.2 : role === "cta" ? 4 : 4.5),
      overlayText: String(scene.text || defaultSceneCopy(role, input.projectName, input.title)),
      visualDescription: scene.visualDescription ?? null,
      sourceAssetId: String(asset.id ?? selectedAssetIds[index] ?? selectedAssetIds[0] ?? ""),
      sourceUrl: asset.public_url ?? asset.storage_path ?? null,
      assetKind: assetKind(asset),
      sourceFeature: asset.source_type ?? null,
      warnings: asset.status && asset.status !== "ready" ? [`Asset status is ${asset.status}; render gate must revalidate before output.`] : [],
    };
  });

  const assetIntelligence = ownedAssets.map((asset) => ({
    id: String(asset.id),
    kind: assetKind(asset),
    fileName: asset.original_name ?? asset.file_name ?? "Untitled asset",
    sourceType: asset.source_type ?? null,
    createdByFeature: asset.source_type ?? null,
    width: asset.width ? Number(asset.width) : null,
    height: asset.height ? Number(asset.height) : null,
    durationSeconds: asset.duration ? Number(asset.duration) : null,
    hasAudio: assetKind(asset) === "video",
    hasVideo: assetKind(asset) === "video",
    suitabilityScore: assetKind(asset) === "video" ? 91 : 78,
  }));

  const readinessWarnings = [
    ...(ownedAssets.length < 3 ? ["Add at least three grounded assets for a stronger multi-beat trailer."] : []),
    ...(scriptLines.length === 0 ? ["No script lines supplied; deterministic scene copy was generated from the project brief."] : []),
  ];

  const blueprint = {
    version: "creatorvault.grounded_trailer_blueprint.v1",
    trailerProjectId: id,
    generatedAt,
    project: {
      id,
      name: input.projectName,
      type: input.projectType ?? "launch_trailer",
      title: input.title ?? null,
      concept: input.concept ?? null,
      format: input.format ?? "16:9",
    },
    readiness: {
      assetCount: ownedAssets.length,
      visualSceneCount: scenes.length,
      estimatedDurationSeconds: scenes.reduce((sum: number, scene: any) => sum + asNumber(scene.durationSeconds, 4), 0),
      warnings: readinessWarnings,
    },
    hooks,
    scenes,
    assetIntelligence,
    lineage: { selectedAssetIds },
    manifestIntegrity: {
      deterministicBasis: "ordered ready user-owned media_assets plus user project input",
      noRenderClaim: "This package is a production blueprint and command-center manifest; output URLs require a downstream render job.",
    },
  };

  const pacingPlan = buildCinematicPacingPlan(blueprint as any);
  const soundDesignPlan = buildSoundDesignPlan(blueprint as any, pacingPlan as any);
  const voiceoverSync = buildVoiceoverSyncPlan(blueprint as any, pacingPlan as any);
  const timelineInspector = buildTimelineInspectorModel(blueprint as any, pacingPlan as any, soundDesignPlan as any, voiceoverSync as any);
  const adaptiveTrailerPlan = buildAdaptiveTrailerPlan(blueprint as any, pacingPlan as any);
  const retentionReport = analyzeTrailerRetention(blueprint as any, pacingPlan as any, adaptiveTrailerPlan as any);

  return { blueprint, pacingPlan, soundDesignPlan, voiceoverSync, timelineInspector, adaptiveTrailerPlan, retentionReport };
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

      const selectedIdsSql = sql.join(input.selectedAssetIds.map((assetId) => sql`${assetId}`), sql`, `);
      const ownedAssetsResult = await db.execute(
        sql`
          SELECT
            id,
            asset_type,
            source_type,
            file_name,
            original_name,
            mime_type,
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
            AND id IN (${selectedIdsSql})
            AND status = 'ready'
          LIMIT ${input.selectedAssetIds.length}
        ` as any
      );
      const ownedAssetsUnsorted = extractRows(ownedAssetsResult);
      const ownedById = new Map(ownedAssetsUnsorted.map((asset: any) => [String(asset.id), asset]));
      const ownedAssets = input.selectedAssetIds.map((assetId) => ownedById.get(String(assetId))).filter(Boolean);

      if (ownedAssets.length === 0) {
        throw new Error("No valid media assets selected");
      }

      const primaryAssetId = String((ownedAssets[0] as any).id);
      const hooks = input.hooks ?? [];
      const productionCore = buildTrailerProductionPackage(input, id, ownedAssets, input.selectedAssetIds);
      const cloneAwareTrailerMode = await buildCloneAwareTrailerMode(productionCore.blueprint as any);
      const mediaOSManifest = buildTrailerMediaOSManifest({
        ...productionCore.blueprint,
        cinematicPacing: productionCore.pacingPlan,
        soundDesign: productionCore.soundDesignPlan,
        voiceoverSync: productionCore.voiceoverSync,
        timelineInspector: productionCore.timelineInspector,
        adaptiveTrailerPlan: productionCore.adaptiveTrailerPlan,
        retentionReport: productionCore.retentionReport,
        cloneIntegration: cloneAwareTrailerMode,
        renderHandoff: {
          status: "handoff_prepared",
          recommendedNextEngine: "ffmpeg_or_remotion_render_worker",
          requiredBeforeRender: ["asset_file_access_verified", "caption_safe_zones_checked", "voiceover_job_completed_or_muted_export_selected", "output_storage_path_allocated"],
          warnings: ["No rendered trailer URL is exposed until a render job writes and validates a real MP4."],
        },
      } as any);
      const scenesJson = JSON.stringify(productionCore.blueprint.scenes);
      const hooksJson = hooks.length > 0 ? JSON.stringify(hooks) : null;

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
            ${"draft"}
          )
        ` as any
      );

      return {
        success: true,
        trailerProjectId: id,
        mediaAssetCount: ownedAssets.length,
        productionPackage: {
          ...productionCore,
          cloneAwareTrailerMode,
          mediaOSManifest,
          renderReadiness: {
            status: "handoff_prepared",
            canClaimRenderedOutput: false,
            nextEngine: "ffmpeg_or_remotion_render_worker",
            requiredBeforeRender: ["asset_file_access_verified", "caption_safe_zones_checked", "voiceover_job_completed_or_muted_export_selected", "output_storage_path_allocated"],
          },
        },
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
