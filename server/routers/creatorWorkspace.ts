import { randomUUID } from "node:crypto";
import { TRPCError } from "@trpc/server";
import { sql } from "drizzle-orm";
import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import {
  createLocalTrailerCut,
  discardLocalTrailerCut,
  localTrailerCutAvailability,
  localTrailerCutFeature,
  LocalTrailerCutError,
  type PreparedLocalTrailerCut,
} from "../services/localTrailerCut";

type UnknownRecord = Record<string, unknown>;

type WorkspaceSnapshot = {
  entityName: string;
  targetAudience: string;
  primaryPromise: string;
  lifeOutcome: string;
  reputation: string;
  firstOffer: string;
  currentMotivation: string;
  visualDirection: string;
  shortFormIdea: string;
  longFormStoryIdea: string;
  communityRole: string;
  storyManifesto: string;
  futureMove: string;
  visualIdentityAssetId: string | null;
};

type WorkspaceProject = WorkspaceSnapshot & {
  id: string;
  sourceMediaAssetId: string;
  status: string;
  createdAt: string | Date | null;
  updatedAt: string | Date | null;
};

const workspaceFieldsSchema = z.object({
  entityName: z.string().trim().min(1).max(200),
  targetAudience: z.string().trim().min(1).max(600),
  primaryPromise: z.string().trim().min(1).max(600),
  lifeOutcome: z.string().trim().max(600).default(""),
  reputation: z.string().trim().max(600).default(""),
  firstOffer: z.string().trim().max(600).default(""),
  currentMotivation: z.string().trim().max(600).default(""),
  visualDirection: z.string().trim().max(1200).default(""),
  shortFormIdea: z.string().trim().max(1200).default(""),
  longFormStoryIdea: z.string().trim().max(1800).default(""),
  communityRole: z.string().trim().max(600).default(""),
  storyManifesto: z.string().trim().max(1800).default(""),
  futureMove: z.string().trim().max(600).default(""),
  visualIdentityAssetId: z
    .string()
    .trim()
    .min(1)
    .max(128)
    .nullable()
    .default(null),
});

const workspaceSaveSchema = workspaceFieldsSchema.extend({
  workspaceId: z.string().uuid().optional(),
  sourceMediaAssetId: z.string().trim().min(1).max(128),
});

const localTrailerCutInputSchema = z.object({
  workspaceId: z.string().uuid(),
  sourceMediaAssetId: z.string().uuid(),
  trailerProjectId: z.string().uuid(),
});

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function extractRows(value: unknown): UnknownRecord[] {
  if (Array.isArray(value)) {
    if (Array.isArray(value[0])) return value[0].filter(isRecord);
    return value.filter(isRecord);
  }
  if (isRecord(value) && Array.isArray(value.rows)) {
    return value.rows.filter(isRecord);
  }
  return [];
}

function asText(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function asNullableText(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

function asFiniteNumber(value: unknown): number | null {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : null;
}

function parseJson(value: unknown): unknown {
  if (typeof value !== "string") return value;
  try {
    return JSON.parse(value) as unknown;
  } catch {
    return null;
  }
}

type LocalTrailerCutView = {
  cutProjectId: string;
  mediaAssetId: string;
  workspaceId: string;
  sourceMediaAssetId: string;
  trailerProjectId: string;
  publicUrl: string;
  fileName: string;
  durationSeconds: number;
  width: number;
  height: number;
  format: "16:9" | "9:16" | "1:1";
  status: "awaiting_owner_review";
};

function localTrailerCutFromRow(
  row: UnknownRecord
): LocalTrailerCutView | null {
  const manifest = parseJson(row.scenes_json);
  if (!isRecord(manifest) || manifest.kind !== "local_trailer_cut.v1") {
    return null;
  }
  const cutProjectId = asNullableText(row.cut_project_id);
  const mediaAssetId = asNullableText(row.media_asset_id);
  const workspaceId = asNullableText(manifest.workspaceId);
  const sourceMediaAssetId = asNullableText(manifest.sourceMediaAssetId);
  const trailerProjectId = asNullableText(manifest.trailerProjectId);
  const publicUrl = asNullableText(row.public_url);
  const fileName = asNullableText(row.file_name);
  const durationSeconds = asFiniteNumber(row.duration);
  const width = asFiniteNumber(row.width);
  const height = asFiniteNumber(row.height);
  const format = asNullableText(manifest.format);
  const status = asNullableText(row.cut_status);
  if (
    !cutProjectId ||
    !mediaAssetId ||
    !workspaceId ||
    !sourceMediaAssetId ||
    !trailerProjectId ||
    !publicUrl ||
    !fileName ||
    durationSeconds === null ||
    width === null ||
    height === null ||
    !["16:9", "9:16", "1:1"].includes(format ?? "") ||
    status !== "awaiting_owner_review"
  ) {
    return null;
  }
  return {
    cutProjectId,
    mediaAssetId,
    workspaceId,
    sourceMediaAssetId,
    trailerProjectId,
    publicUrl,
    fileName,
    durationSeconds,
    width,
    height,
    format: format as "16:9" | "9:16" | "1:1",
    status,
  };
}

function localTrailerCutManifest(
  input: {
    workspaceId: string;
    sourceMediaAssetId: string;
    trailerProjectId: string;
  },
  cut: PreparedLocalTrailerCut
): string {
  return JSON.stringify({
    kind: "local_trailer_cut.v1",
    workspaceId: input.workspaceId,
    sourceMediaAssetId: input.sourceMediaAssetId,
    trailerProjectId: input.trailerProjectId,
    outputMediaAssetId: cut.mediaAssetId,
    createdByFeature: localTrailerCutFeature,
    format: cut.format,
    durationSeconds: cut.durationSeconds,
    sourceDerived: true,
    providerUsed: false,
    publishActionTaken: false,
    ownerDecision: "awaiting_owner_review",
  });
}

function snapshotFromRow(row: UnknownRecord): WorkspaceSnapshot | null {
  const raw = row.scenes_json;
  const serialized = typeof raw === "string" ? raw : JSON.stringify(raw);
  try {
    const parsed: unknown = JSON.parse(serialized);
    if (
      !isRecord(parsed) ||
      parsed.kind !== "creator_workspace.v1" ||
      !isRecord(parsed.context)
    ) {
      return null;
    }
    const result = workspaceFieldsSchema.safeParse(parsed.context);
    return result.success ? result.data : null;
  } catch {
    return null;
  }
}

function workspaceFromRow(row: UnknownRecord): WorkspaceProject | null {
  const snapshot = snapshotFromRow(row);
  const id = asText(row.id);
  const sourceMediaAssetId = asText(row.source_asset_id);
  if (!snapshot || !id || !sourceMediaAssetId) return null;
  return {
    id,
    sourceMediaAssetId,
    status: asText(row.status) || "draft",
    createdAt: (row.created_at as string | Date | null | undefined) ?? null,
    updatedAt: (row.updated_at as string | Date | null | undefined) ?? null,
    ...snapshot,
  };
}

function workspacePayload(
  input: WorkspaceSnapshot,
  sourceMediaAssetId: string
): string {
  return JSON.stringify({
    kind: "creator_workspace.v1",
    sourceMediaAssetId,
    context: input,
  });
}

async function assertCreatorOwnedReadyAsset(
  userId: number,
  assetId: string,
  kind: "source" | "visual_identity"
): Promise<void> {
  const db = await getDb();
  if (!db)
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Workspace storage is unavailable.",
    });
  const sourceCondition =
    kind === "source"
      ? sql`AND (asset_type = 'video' OR mime_type LIKE 'video/%') AND source_type = 'upload'`
      : sql``;
  const result = await db.execute(sql`
    SELECT id
    FROM media_assets
    WHERE id = ${assetId}
      AND user_id = ${userId}
      AND status = 'ready'
      AND (public_url IS NULL OR public_url NOT LIKE '%/api/media/asset/%')
      AND COALESCE(created_by_feature, '') NOT IN ('kingcam_performance_capture', 'kingcam_private_presence_loop')
      ${sourceCondition}
    LIMIT 1
  `);
  if (extractRows(result).length !== 1) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message:
        kind === "source"
          ? "Choose a ready CreatorVault source video that you own."
          : "Choose a ready visual identity asset that you own.",
    });
  }
}

export const creatorWorkspaceRouter = router({
  get: protectedProcedure
    .input(z.object({ workspaceId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) return null;
      const result = await db.execute(sql`
        SELECT id, source_asset_id, scenes_json, status, created_at, updated_at
        FROM trailer_projects
        WHERE id = ${input.workspaceId}
          AND user_id = ${ctx.user.id}
          AND project_type = 'creator_workspace'
        LIMIT 1
      `);
      return workspaceFromRow(extractRows(result)[0] ?? {});
    }),

  list: protectedProcedure
    .input(
      z
        .object({ limit: z.number().int().min(1).max(50).default(12) })
        .optional()
    )
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) return [];
      const result = await db.execute(sql`
        SELECT id, source_asset_id, scenes_json, status, created_at, updated_at
        FROM trailer_projects
        WHERE user_id = ${ctx.user.id}
          AND project_type = 'creator_workspace'
        ORDER BY updated_at DESC, created_at DESC
        LIMIT ${input?.limit ?? 12}
      `);
      return extractRows(result)
        .map(workspaceFromRow)
        .filter(
          (workspace): workspace is WorkspaceProject => workspace !== null
        );
    }),

  getLocalTrailerCut: protectedProcedure
    .input(localTrailerCutInputSchema)
    .query(async ({ ctx, input }) => {
      const available = localTrailerCutAvailability();
      const db = await getDb();
      if (!db) return { available, cut: null };

      const workspaceResult = await db.execute(sql`
        SELECT id
        FROM trailer_projects
        WHERE id = ${input.workspaceId}
          AND user_id = ${ctx.user.id}
          AND project_type = ${"creator_workspace"}
          AND source_asset_id = ${input.sourceMediaAssetId}
        LIMIT 1
      `);
      if (extractRows(workspaceResult).length !== 1) {
        return { available, cut: null };
      }

      const result = await db.execute(sql`
        SELECT
          local_cut.id AS cut_project_id,
          local_cut.status AS cut_status,
          local_cut.scenes_json,
          output_asset.id AS media_asset_id,
          output_asset.public_url,
          output_asset.file_name,
          output_asset.duration,
          output_asset.width,
          output_asset.height
        FROM trailer_projects AS local_cut
        INNER JOIN media_assets AS output_asset
          ON output_asset.id = JSON_UNQUOTE(JSON_EXTRACT(local_cut.scenes_json, '$.outputMediaAssetId'))
        WHERE local_cut.user_id = ${ctx.user.id}
          AND local_cut.project_type = ${"local_trailer_cut"}
          AND local_cut.source_asset_id = ${input.sourceMediaAssetId}
          AND JSON_UNQUOTE(JSON_EXTRACT(local_cut.scenes_json, '$.workspaceId')) = ${input.workspaceId}
          AND JSON_UNQUOTE(JSON_EXTRACT(local_cut.scenes_json, '$.trailerProjectId')) = ${input.trailerProjectId}
          AND output_asset.user_id = ${ctx.user.id}
          AND output_asset.status = ${"ready"}
          AND output_asset.source_type = ${"local_trailer_cut"}
          AND output_asset.created_by_feature = ${localTrailerCutFeature}
        ORDER BY local_cut.created_at DESC
        LIMIT 1
      `);
      return {
        available,
        cut: localTrailerCutFromRow(extractRows(result)[0] ?? {}),
      };
    }),

  createLocalTrailerCut: protectedProcedure
    .input(localTrailerCutInputSchema)
    .mutation(async ({ ctx, input }) => {
      if (!localTrailerCutAvailability()) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message:
            "Local Trailer Cut is available only in the configured local proof environment.",
        });
      }
      const db = await getDb();
      if (!db) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Local Trailer Cut storage is unavailable.",
        });
      }

      const workspaceResult = await db.execute(sql`
        SELECT id
        FROM trailer_projects
        WHERE id = ${input.workspaceId}
          AND user_id = ${ctx.user.id}
          AND project_type = ${"creator_workspace"}
          AND source_asset_id = ${input.sourceMediaAssetId}
        LIMIT 1
      `);
      if (extractRows(workspaceResult).length !== 1) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Saved creator workspace not found for this source video.",
        });
      }

      const existingResult = await db.execute(sql`
        SELECT
          local_cut.id AS cut_project_id,
          local_cut.status AS cut_status,
          local_cut.scenes_json,
          output_asset.id AS media_asset_id,
          output_asset.public_url,
          output_asset.file_name,
          output_asset.duration,
          output_asset.width,
          output_asset.height
        FROM trailer_projects AS local_cut
        INNER JOIN media_assets AS output_asset
          ON output_asset.id = JSON_UNQUOTE(JSON_EXTRACT(local_cut.scenes_json, '$.outputMediaAssetId'))
        WHERE local_cut.user_id = ${ctx.user.id}
          AND local_cut.project_type = ${"local_trailer_cut"}
          AND local_cut.source_asset_id = ${input.sourceMediaAssetId}
          AND JSON_UNQUOTE(JSON_EXTRACT(local_cut.scenes_json, '$.workspaceId')) = ${input.workspaceId}
          AND JSON_UNQUOTE(JSON_EXTRACT(local_cut.scenes_json, '$.trailerProjectId')) = ${input.trailerProjectId}
          AND output_asset.user_id = ${ctx.user.id}
          AND output_asset.status = ${"ready"}
          AND output_asset.source_type = ${"local_trailer_cut"}
          AND output_asset.created_by_feature = ${localTrailerCutFeature}
        ORDER BY local_cut.created_at DESC
        LIMIT 1
      `);
      const existing = localTrailerCutFromRow(
        extractRows(existingResult)[0] ?? {}
      );
      if (existing) return { created: false, cut: existing };

      const sourceResult = await db.execute(sql`
        SELECT id, public_url
        FROM media_assets
        WHERE id = ${input.sourceMediaAssetId}
          AND user_id = ${ctx.user.id}
          AND status = ${"ready"}
          AND source_type = ${"upload"}
          AND (asset_type = ${"video"} OR mime_type LIKE 'video/%')
          AND COALESCE(created_by_feature, '') NOT IN ('kingcam_performance_capture', 'kingcam_private_presence_loop')
        LIMIT 1
      `);
      const source = extractRows(sourceResult)[0] ?? {};
      const sourcePublicUrl = asNullableText(source.public_url);
      if (!sourcePublicUrl) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message:
            "Choose a ready creator-owned source video with local playback.",
        });
      }

      const directionResult = await db.execute(sql`
        SELECT id, project_name, format, scenes_json
        FROM trailer_projects
        WHERE id = ${input.trailerProjectId}
          AND user_id = ${ctx.user.id}
          AND source_asset_id = ${input.sourceMediaAssetId}
          AND project_type <> ${"creator_workspace"}
          AND project_type <> ${"local_trailer_cut"}
        LIMIT 1
      `);
      const direction = extractRows(directionResult)[0] ?? {};
      const format = asNullableText(direction.format);
      if (!direction.id || !["16:9", "9:16", "1:1"].includes(format ?? "")) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message:
            "Saved Trailer Maker direction not found for this source video.",
        });
      }

      let prepared: PreparedLocalTrailerCut;
      try {
        prepared = await createLocalTrailerCut({
          sourcePublicUrl,
          sourceMediaAssetId: input.sourceMediaAssetId,
          trailerProjectId: input.trailerProjectId,
          format: format as "16:9" | "9:16" | "1:1",
          scenes: parseJson(direction.scenes_json),
        });
      } catch (error) {
        if (error instanceof LocalTrailerCutError) {
          throw new TRPCError({
            code: "PRECONDITION_FAILED",
            message:
              "CreatorVault could not prepare the local source-derived cut.",
          });
        }
        throw error;
      }

      const cutProjectId = randomUUID();
      const projectName =
        `Local trailer cut — ${asNullableText(direction.project_name) ?? "saved direction"}`.slice(
          0,
          255
        );
      try {
        await db.execute(sql`
          INSERT INTO media_assets (
            id, user_id, source_type, asset_type, file_name, original_name,
            mime_type, file_size, storage_path, public_url, thumbnail_url,
            duration, width, height, status, created_by_feature
          ) VALUES (
            ${prepared.mediaAssetId}, ${ctx.user.id}, ${"local_trailer_cut"}, ${"video"},
            ${prepared.fileName}, ${prepared.fileName}, ${"video/mp4"},
            ${prepared.fileSize}, ${prepared.storagePath}, ${prepared.publicUrl},
            ${prepared.publicUrl}, ${prepared.durationSeconds}, ${prepared.width},
            ${prepared.height}, ${"ready"}, ${localTrailerCutFeature}
          )
        `);
        await db.execute(sql`
          INSERT INTO trailer_projects (
            id, user_id, project_name, project_type, title, concept, script_text,
            format, source_asset_id, scenes_json, hooks, hook_variants, status
          ) VALUES (
            ${cutProjectId}, ${ctx.user.id}, ${projectName}, ${"local_trailer_cut"},
            ${"Local source-derived trailer cut"},
            ${"A locally encoded review cut from the creator's saved source video and direction."},
            ${null}, ${prepared.format}, ${input.sourceMediaAssetId},
            ${localTrailerCutManifest(input, prepared)}, ${null}, ${null},
            ${"awaiting_owner_review"}
          )
        `);
      } catch (error) {
        await db
          .execute(
            sql`
            DELETE FROM media_assets
            WHERE id = ${prepared.mediaAssetId}
              AND user_id = ${ctx.user.id}
              AND created_by_feature = ${localTrailerCutFeature}
          `
          )
          .catch(() => undefined);
        await discardLocalTrailerCut(prepared.storagePath).catch(
          () => undefined
        );
        throw error;
      }

      return {
        created: true,
        cut: {
          cutProjectId,
          mediaAssetId: prepared.mediaAssetId,
          workspaceId: input.workspaceId,
          sourceMediaAssetId: input.sourceMediaAssetId,
          trailerProjectId: input.trailerProjectId,
          publicUrl: prepared.publicUrl,
          fileName: prepared.fileName,
          durationSeconds: prepared.durationSeconds,
          width: prepared.width,
          height: prepared.height,
          format: prepared.format,
          status: "awaiting_owner_review" as const,
        },
      };
    }),

  save: protectedProcedure
    .input(workspaceSaveSchema)
    .mutation(async ({ ctx, input }) => {
      await assertCreatorOwnedReadyAsset(
        ctx.user.id,
        input.sourceMediaAssetId,
        "source"
      );
      if (input.visualIdentityAssetId) {
        await assertCreatorOwnedReadyAsset(
          ctx.user.id,
          input.visualIdentityAssetId,
          "visual_identity"
        );
      }
      const db = await getDb();
      if (!db)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Workspace storage is unavailable.",
        });

      const workspaceId = input.workspaceId ?? randomUUID();
      const context: WorkspaceSnapshot = {
        entityName: input.entityName,
        targetAudience: input.targetAudience,
        primaryPromise: input.primaryPromise,
        lifeOutcome: input.lifeOutcome,
        reputation: input.reputation,
        firstOffer: input.firstOffer,
        currentMotivation: input.currentMotivation,
        visualDirection: input.visualDirection,
        shortFormIdea: input.shortFormIdea,
        longFormStoryIdea: input.longFormStoryIdea,
        communityRole: input.communityRole,
        storyManifesto: input.storyManifesto,
        futureMove: input.futureMove,
        visualIdentityAssetId: input.visualIdentityAssetId,
      };
      const serialized = workspacePayload(context, input.sourceMediaAssetId);
      const existing = input.workspaceId
        ? extractRows(
            await db.execute(sql`
              SELECT id
              FROM trailer_projects
              WHERE id = ${workspaceId}
                AND user_id = ${ctx.user.id}
                AND project_type = 'creator_workspace'
              LIMIT 1
            `)
          )
        : [];

      if (input.workspaceId && existing.length === 0) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Workspace draft not found.",
        });
      }

      if (existing.length === 0) {
        await db.execute(sql`
          INSERT INTO trailer_projects (
            id, user_id, project_name, project_type, title, concept, script_text,
            format, source_asset_id, scenes_json, hooks, hook_variants, status
          ) VALUES (
            ${workspaceId}, ${ctx.user.id}, ${context.entityName}, ${"creator_workspace"},
            ${context.firstOffer || null}, ${context.primaryPromise}, ${context.storyManifesto || null},
            ${"9:16"}, ${input.sourceMediaAssetId}, ${serialized}, ${null}, ${null}, ${"draft"}
          )
        `);
      } else {
        await db.execute(sql`
          UPDATE trailer_projects
          SET project_name = ${context.entityName},
              title = ${context.firstOffer || null},
              concept = ${context.primaryPromise},
              script_text = ${context.storyManifesto || null},
              source_asset_id = ${input.sourceMediaAssetId},
              scenes_json = ${serialized},
              status = ${"draft"},
              updated_at = CURRENT_TIMESTAMP
          WHERE id = ${workspaceId}
            AND user_id = ${ctx.user.id}
            AND project_type = 'creator_workspace'
        `);
      }

      return {
        workspaceId,
        sourceMediaAssetId: input.sourceMediaAssetId,
        status: "draft" as const,
        created: existing.length === 0,
      };
    }),
});

export function decodeCreatorWorkspaceRecord(
  record: UnknownRecord
): WorkspaceProject | null {
  return workspaceFromRow(record);
}
