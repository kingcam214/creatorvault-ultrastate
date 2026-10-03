import {
  customType,
  foreignKey,
  index,
  int,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  uniqueIndex,
  varchar,
  double,
} from "drizzle-orm/mysql-core";
import { users } from "./schema";
import type {
  AccessoryAttributes,
  CameraMetadata,
  ChainAuthorization,
  PersonaIdentitySnapshot,
  StartVideoChainRequest,
  Wardrobe,
} from "../server/services/personaVaultContracts";

// mysql2 returns native JSON objects; MariaDB returns JSON text. Normalize both
// without weakening the public domain contracts to the legacy database facade.
function typedJson<T>(name: string) {
  return customType<{ data: T; driverData: string }>({
    dataType: () => "json",
    toDriver: value => JSON.stringify(value),
    fromDriver: value =>
      (typeof value === "string" ? (JSON.parse(value) as unknown) : value) as T,
  })(name);
}
export const personaVaults = mysqlTable(
  "persona_vaults",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    userId: int("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    personaName: varchar("persona_name", { length: 120 }).notNull(),
    avatarBaseUrl: text("avatar_base_url").notNull(),
    avatarSha256: varchar("avatar_sha256", { length: 64 }).notNull(),
    loraModelId: varchar("lora_model_id", { length: 191 }),
    voiceProfileId: varchar("voice_profile_id", { length: 191 }),
    triggerToken: varchar("trigger_token", { length: 48 }),
    signatureWardrobes: typedJson<Wardrobe[]>("signature_wardrobes").notNull(),
    accessoryAttributes: typedJson<AccessoryAttributes>(
      "accessory_attributes"
    ).notNull(),
    version: int("version", { unsigned: true }).notNull().default(1),
    createdAt: timestamp("created_at", { fsp: 3 }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { fsp: 3 })
      .notNull()
      .defaultNow()
      .onUpdateNow(),
  },
  table => [
    uniqueIndex("persona_vault_owner_name_unique").on(
      table.userId,
      table.personaName
    ),
    uniqueIndex("persona_vault_id_owner_unique").on(table.id, table.userId),
  ]
);
export const personaAssets = mysqlTable(
  "persona_assets",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    personaId: varchar("persona_id", { length: 36 }).notNull(),
    userId: int("user_id").notNull(),
    assetType: mysqlEnum("asset_type", [
      "avatar_base",
      "reference_image",
      "wardrobe_reference",
      "voice_reference",
      "chain_end_frame",
    ]).notNull(),
    assetUrl: text("asset_url").notNull(),
    sourceUrl: text("source_url").notNull(),
    sourceMediaAssetId: varchar("source_media_asset_id", {
      length: 191,
    }).notNull(),
    sha256: varchar("sha256", { length: 64 }).notNull(),
    tags: typedJson<string[]>("tags").notNull(),
    createdAt: timestamp("created_at", { fsp: 3 }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { fsp: 3 })
      .notNull()
      .defaultNow()
      .onUpdateNow(),
  },
  table => [
    foreignKey({
      name: "persona_assets_owner_fk",
      columns: [table.personaId, table.userId],
      foreignColumns: [personaVaults.id, personaVaults.userId],
    }).onDelete("restrict"),
    index("persona_assets_owner_kind_idx").on(
      table.userId,
      table.personaId,
      table.assetType
    ),
  ]
);
export const videoGenerationChains = mysqlTable(
  "video_generation_chains",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    userId: int("user_id").notNull(),
    personaId: varchar("persona_id", { length: 36 }).notNull(),
    chainStatus: mysqlEnum("chain_status", [
      "pending",
      "generating",
      "complete",
      "failed",
    ])
      .notNull()
      .default("pending"),
    totalDurationSec: int("total_duration_sec", { unsigned: true }).notNull(),
    frameRate: int("frame_rate", { unsigned: true }).notNull(),
    aspectRatio: mysqlEnum("aspect_ratio", ["16:9", "9:16", "1:1"]).notNull(),
    idempotencyKey: varchar("idempotency_key", { length: 128 }).notNull(),
    inputHash: varchar("input_hash", { length: 64 }).notNull(),
    requestHash: varchar("request_hash", { length: 64 }).notNull(),
    requestPayload:
      typedJson<StartVideoChainRequest>("request_payload").notNull(),
    personaSnapshot:
      typedJson<PersonaIdentitySnapshot>("persona_snapshot").notNull(),
    authorization: typedJson<ChainAuthorization>("authorization"),
    authorizationClosedAt: timestamp("authorization_closed_at", { fsp: 3 }),
    authorizationHistory: typedJson<ChainAuthorization[]>(
      "authorization_history"
    ).notNull(),
    leaseToken: varchar("lease_token", { length: 36 }),
    leaseExpiresAt: timestamp("lease_expires_at", { fsp: 3 }),
    nextProcessAt: timestamp("next_process_at", { fsp: 3 })
      .notNull()
      .defaultNow(),
    lastError: text("last_error"),
    failureStage: varchar("failure_stage", { length: 48 }),
    createdAt: timestamp("created_at", { fsp: 3 }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { fsp: 3 })
      .notNull()
      .defaultNow()
      .onUpdateNow(),
    completedAt: timestamp("completed_at", { fsp: 3 }),
  },
  table => [
    foreignKey({
      name: "video_chains_persona_owner_fk",
      columns: [table.personaId, table.userId],
      foreignColumns: [personaVaults.id, personaVaults.userId],
    }).onDelete("restrict"),
    uniqueIndex("video_chains_owner_idempotency_unique").on(
      table.userId,
      table.idempotencyKey
    ),
    index("video_chains_queue_idx").on(table.chainStatus, table.nextProcessAt),
  ]
);
export const videoChainSegments = mysqlTable(
  "video_chain_segments",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    chainId: varchar("chain_id", { length: 36 })
      .notNull()
      .references(() => videoGenerationChains.id, { onDelete: "restrict" }),
    segmentOrder: int("segment_order", { unsigned: true }).notNull(),
    durationSec: int("duration_sec", { unsigned: true }).notNull(),
    promptText: text("prompt_text").notNull(),
    cameraMotionType: varchar("camera_motion_type", { length: 32 }).notNull(),
    cameraMetadata: typedJson<CameraMetadata>("camera_metadata").notNull(),
    inheritedCameraMetadata: typedJson<CameraMetadata>(
      "inherited_camera_metadata"
    ),
    startFrameUrl: text("start_frame_url"),
    startFrameSha256: varchar("start_frame_sha256", { length: 64 }),
    endFrameUrl: text("end_frame_url"),
    endFrameSha256: varchar("end_frame_sha256", { length: 64 }),
    terminalFrameExtractedUrl: text("terminal_frame_extracted_url"),
    terminalFrameSha256: varchar("terminal_frame_sha256", { length: 64 }),
    renderJobId: varchar("render_job_id", { length: 64 }).unique(),
    segmentStatus: mysqlEnum("segment_status", [
      "pending",
      "generating",
      "extracting",
      "complete",
      "failed",
      "submission_unknown",
    ])
      .notNull()
      .default("pending"),
    attempt: int("attempt", { unsigned: true }).notNull().default(1),
    processingFailures: int("processing_failures", { unsigned: true })
      .notNull()
      .default(0),
    streamUrl: text("stream_url"),
    frameCount: int("frame_count", { unsigned: true }),
    actualDurationSec: double("actual_duration_sec"),
    actualFrameRate: double("actual_frame_rate"),
    lastError: text("last_error"),
    failureStage: varchar("failure_stage", { length: 48 }),
    createdAt: timestamp("created_at", { fsp: 3 }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { fsp: 3 })
      .notNull()
      .defaultNow()
      .onUpdateNow(),
    completedAt: timestamp("completed_at", { fsp: 3 }),
  },
  table => [
    uniqueIndex("video_chain_segment_order_unique").on(
      table.chainId,
      table.segmentOrder
    ),
    index("video_chain_segments_status_idx").on(
      table.chainId,
      table.segmentStatus
    ),
  ]
);
export type PersonaVault = typeof personaVaults.$inferSelect;
export type PersonaAsset = typeof personaAssets.$inferSelect;
export type VideoGenerationChain = typeof videoGenerationChains.$inferSelect;
export type VideoChainSegment = typeof videoChainSegments.$inferSelect;
