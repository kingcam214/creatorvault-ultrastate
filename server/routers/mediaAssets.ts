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
          SELECT id
          FROM media_assets
          WHERE user_id = ${ctx.user.id}
            AND id IN (${selectedIdsSql})
          LIMIT ${input.selectedAssetIds.length}
        ` as any
      );
      const ownedAssets = extractRows(ownedAssetsResult);

      if (ownedAssets.length === 0) {
        throw new Error("No valid media assets selected");
      }

      const primaryAssetId = String((ownedAssets[0] as any).id);
      const hooks = input.hooks ?? [];
      const scenesJson = input.segments ? JSON.stringify(input.segments) : null;
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
