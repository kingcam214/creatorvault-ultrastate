import { createHash } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import mysql, { type Connection, type RowDataPacket } from "mysql2/promise";

const LOCK_KEY = "creatorvault:consolidated-migrations:v1";
const LOCK_TIMEOUT_SECONDS = 30;
const MIGRATION_TABLE = "__drizzle_migrations";
const REQUIRED_BASELINE_TABLES = [
  "users",
  "transactions",
  "live_stream_tips",
  "live_stream_donations",
] as const;

type Dialect = "mysql" | "mariadb";
type SqlValue = string | number | null;
type DatabaseRow = Record<string, unknown>;

export type ConsolidatedMigrationErrorCode =
  | "INVALID_ARGUMENT"
  | "MIGRATION_FILES_INVALID"
  | "MIGRATION_JOURNAL_INVALID"
  | "CONNECTION_FAILED"
  | "LOCK_UNAVAILABLE"
  | "UNSUPPORTED_DIALECT"
  | "UNSUPPORTED_DIALECT_TIDB"
  | "DATABASE_INSPECTION_FAILED"
  | "BASELINE_INVALID"
  | "MIGRATION_METADATA_INVALID"
  | "MIGRATION_STATE_INVALID"
  | "MIGRATION_SCHEMA_MISMATCH"
  | "BACKUP_CALLBACK_FAILED"
  | "PROGRESS_CALLBACK_FAILED"
  | "MIGRATION_EXECUTION_FAILED";

/** A deliberately non-secret error: callers should persist only `code`. */
export class ConsolidatedMigrationError extends Error {
  readonly code: ConsolidatedMigrationErrorCode;

  constructor(code: ConsolidatedMigrationErrorCode) {
    super(`CONSOLIDATED_MIGRATION_${code}`);
    this.name = "ConsolidatedMigrationError";
    this.code = code;
  }
}

export type ConsolidatedMigrationProgress = {
  migration: string;
  statement: number;
  total: number;
};

export type ConsolidatedMigrationOptions = {
  beforeApply?: () => Promise<void>;
  onProgress?: (event: ConsolidatedMigrationProgress) => Promise<void>;
};

export type ConsolidatedMigrationResult = {
  applied: string[];
  alreadyApplied: string[];
};

export type ConsolidatedMigrationInspection = {
  dialect: Dialect;
  checkConstraintsEnforced: boolean;
  pending: string[];
  alreadyApplied: string[];
};

type MigrationDefinition = {
  readonly name: string;
  readonly file: string;
  readonly sha256: string;
  readonly when: number;
  readonly statementCount: number;
};

type LoadedMigration = MigrationDefinition & {
  readonly statements: readonly string[];
};

type ServerInfo = {
  readonly dialect: Dialect;
  readonly checkConstraintsEnforced: boolean;
};

type ColumnInfo = {
  readonly name: string;
  readonly dataType: string;
  readonly columnType: string;
  readonly nullable: boolean;
  readonly characterMaximumLength: number | null;
  readonly datetimePrecision: number | null;
  readonly defaultValue: string | null;
  readonly extra: string;
};

type ColumnSpec = {
  readonly name: string;
  readonly kind:
    | "int"
    | "intUnsigned"
    | "boolean"
    | "varchar"
    | "text"
    | "json"
    | "timestamp"
    | "enum"
    | "double";
  readonly nullable: boolean;
  readonly length?: number;
  readonly precision?: number;
  readonly enumType?: string;
  readonly defaultValue?: string | null;
  readonly autoIncrement?: boolean;
  readonly onUpdateCurrentTimestamp?: boolean;
};

type IndexSpec = {
  readonly table: string;
  readonly name: string;
  readonly columns: readonly string[];
  readonly unique: boolean;
};

type ForeignKeySpec = {
  readonly table: string;
  readonly name: string;
  readonly columns: readonly string[];
  readonly referencedTable: string;
  readonly referencedColumns: readonly string[];
};

type CheckSpec = {
  readonly table: string;
  readonly name: string;
  readonly expression: string;
};

type MigrationSchemaSpec = {
  readonly newTables: readonly {
    readonly table: string;
    readonly columns: readonly ColumnSpec[];
  }[];
  readonly addedColumns: readonly {
    readonly table: string;
    readonly column: ColumnSpec;
  }[];
  readonly indexes: readonly IndexSpec[];
  readonly foreignKeys: readonly ForeignKeySpec[];
  readonly checks: readonly CheckSpec[];
};

const MIGRATIONS: readonly MigrationDefinition[] = [
  {
    name: "0024_stripe_creator_net_payouts",
    file: "drizzle/0024_stripe_creator_net_payouts.sql",
    sha256: "a3b210d0e37f82639def85dd451e87bd14fbcf4f0f050cbea17d4ac69b93712c",
    when: 1790952426555,
    statementCount: 12,
  },
  {
    name: "0025_persona_vault_chained_continuity",
    file: "drizzle/0025_persona_vault_chained_continuity.sql",
    sha256: "75ce0eadcb3ee57659a9e3673d39942cc23859a20a41971290c009cc72802715",
    when: 1790959430000,
    statementCount: 4,
  },
] as const;

const PAYOUT_SCHEMA: MigrationSchemaSpec = {
  newTables: [
    {
      table: "stripe_creator_payout_policy",
      columns: [
        { name: "rule", kind: "varchar", length: 64, nullable: false },
        {
          name: "enabled",
          kind: "boolean",
          nullable: false,
          defaultValue: "1",
        },
        {
          name: "effective_from",
          kind: "timestamp",
          nullable: false,
          defaultValue: "current_timestamp",
        },
      ],
    },
    {
      table: "stripe_creator_payouts",
      columns: [
        { name: "id", kind: "int", nullable: false, autoIncrement: true },
        { name: "creator_id", kind: "int", nullable: false },
        {
          name: "stripe_charge_id",
          kind: "varchar",
          length: 255,
          nullable: false,
        },
        {
          name: "stripe_payment_intent_id",
          kind: "varchar",
          length: 255,
          nullable: true,
        },
        {
          name: "stripe_session_id",
          kind: "varchar",
          length: 255,
          nullable: true,
        },
        {
          name: "stripe_invoice_id",
          kind: "varchar",
          length: 255,
          nullable: true,
        },
        {
          name: "stripe_event_id",
          kind: "varchar",
          length: 255,
          nullable: false,
        },
        {
          name: "stripe_balance_transaction_id",
          kind: "varchar",
          length: 255,
          nullable: true,
        },
        {
          name: "stripe_connect_account_id",
          kind: "varchar",
          length: 255,
          nullable: true,
        },
        {
          name: "stripe_transfer_id",
          kind: "varchar",
          length: 255,
          nullable: true,
        },
        {
          name: "idempotency_key",
          kind: "varchar",
          length: 255,
          nullable: false,
        },
        {
          name: "transfer_group",
          kind: "varchar",
          length: 255,
          nullable: false,
        },
        { name: "gross_amount_in_cents", kind: "int", nullable: false },
        { name: "stripe_fee_in_cents", kind: "int", nullable: true },
        { name: "net_amount_in_cents", kind: "int", nullable: true },
        { name: "creator_payout_in_cents", kind: "int", nullable: true },
        { name: "platform_revenue_in_cents", kind: "int", nullable: true },
        { name: "currency", kind: "varchar", length: 3, nullable: false },
        { name: "fee_details", kind: "json", nullable: true },
        { name: "source_metadata", kind: "json", nullable: false },
        {
          name: "status",
          kind: "enum",
          nullable: false,
          enumType:
            "enum('pending_fee','blocked_account','ready','processing','transferred','failed','no_payout','review_required','reversed')",
          defaultValue: "pending_fee",
        },
        { name: "last_error", kind: "text", nullable: true },
        {
          name: "first_attempt_at",
          kind: "timestamp",
          precision: 3,
          nullable: true,
        },
        {
          name: "lease_expires_at",
          kind: "timestamp",
          precision: 3,
          nullable: true,
        },
        { name: "lease_token", kind: "varchar", length: 36, nullable: true },
        {
          name: "revenue_recorded_at",
          kind: "timestamp",
          precision: 3,
          nullable: true,
        },
        {
          name: "transferred_at",
          kind: "timestamp",
          precision: 3,
          nullable: true,
        },
        {
          name: "created_at",
          kind: "timestamp",
          precision: 3,
          nullable: false,
          defaultValue: "current_timestamp(3)",
        },
        {
          name: "updated_at",
          kind: "timestamp",
          precision: 3,
          nullable: false,
          defaultValue: "current_timestamp(3)",
          onUpdateCurrentTimestamp: true,
        },
      ],
    },
  ],
  addedColumns: [
    {
      table: "users",
      column: {
        name: "stripe_connect_account_id",
        kind: "varchar",
        length: 255,
        nullable: true,
      },
    },
    {
      table: "transactions",
      column: { name: "stripe_fee_in_cents", kind: "int", nullable: true },
    },
    {
      table: "transactions",
      column: { name: "stripe_creator_payout_id", kind: "int", nullable: true },
    },
    {
      table: "live_stream_tips",
      column: { name: "stripe_creator_payout_id", kind: "int", nullable: true },
    },
    {
      table: "live_stream_donations",
      column: { name: "stripe_creator_payout_id", kind: "int", nullable: true },
    },
  ],
  indexes: [
    {
      table: "stripe_creator_payout_policy",
      name: "PRIMARY",
      columns: ["rule"],
      unique: true,
    },
    {
      table: "users",
      name: "users_stripe_connect_account_id_unique",
      columns: ["stripe_connect_account_id"],
      unique: true,
    },
    {
      table: "stripe_creator_payouts",
      name: "PRIMARY",
      columns: ["id"],
      unique: true,
    },
    {
      table: "stripe_creator_payouts",
      name: "stripe_creator_payouts_stripe_charge_id_unique",
      columns: ["stripe_charge_id"],
      unique: true,
    },
    {
      table: "stripe_creator_payouts",
      name: "stripe_creator_payouts_stripe_transfer_id_unique",
      columns: ["stripe_transfer_id"],
      unique: true,
    },
    {
      table: "stripe_creator_payouts",
      name: "stripe_creator_payouts_idempotency_key_unique",
      columns: ["idempotency_key"],
      unique: true,
    },
    {
      table: "stripe_creator_payouts",
      name: "stripe_creator_payouts_transfer_group_unique",
      columns: ["transfer_group"],
      unique: true,
    },
    {
      table: "stripe_creator_payouts",
      name: "idx_stripe_payout_creator_status",
      columns: ["creator_id", "status"],
      unique: false,
    },
    {
      table: "stripe_creator_payouts",
      name: "idx_stripe_payout_payment_intent",
      columns: ["stripe_payment_intent_id"],
      unique: false,
    },
    {
      table: "stripe_creator_payouts",
      name: "idx_stripe_payout_retry",
      columns: ["status", "lease_expires_at"],
      unique: false,
    },
    {
      table: "transactions",
      name: "transactions_stripe_creator_payout_id_unique",
      columns: ["stripe_creator_payout_id"],
      unique: true,
    },
    {
      table: "live_stream_tips",
      name: "live_stream_tips_stripe_creator_payout_id_unique",
      columns: ["stripe_creator_payout_id"],
      unique: true,
    },
    {
      table: "live_stream_donations",
      name: "live_stream_donations_stripe_creator_payout_id_unique",
      columns: ["stripe_creator_payout_id"],
      unique: true,
    },
  ],
  foreignKeys: [
    {
      table: "stripe_creator_payouts",
      name: "stripe_payout_creator_fk",
      columns: ["creator_id"],
      referencedTable: "users",
      referencedColumns: ["id"],
    },
  ],
  checks: [],
};

const PERSONA_SCHEMA: MigrationSchemaSpec = {
  newTables: [
    {
      table: "persona_vaults",
      columns: [
        { name: "id", kind: "varchar", length: 36, nullable: false },
        { name: "user_id", kind: "int", nullable: false },
        { name: "persona_name", kind: "varchar", length: 120, nullable: false },
        { name: "avatar_base_url", kind: "text", nullable: false },
        { name: "avatar_sha256", kind: "varchar", length: 64, nullable: false },
        { name: "lora_model_id", kind: "varchar", length: 191, nullable: true },
        {
          name: "voice_profile_id",
          kind: "varchar",
          length: 191,
          nullable: true,
        },
        { name: "trigger_token", kind: "varchar", length: 48, nullable: true },
        { name: "signature_wardrobes", kind: "json", nullable: false },
        { name: "accessory_attributes", kind: "json", nullable: false },
        {
          name: "version",
          kind: "intUnsigned",
          nullable: false,
          defaultValue: "1",
        },
        {
          name: "created_at",
          kind: "timestamp",
          precision: 3,
          nullable: false,
          defaultValue: "current_timestamp(3)",
        },
        {
          name: "updated_at",
          kind: "timestamp",
          precision: 3,
          nullable: false,
          defaultValue: "current_timestamp(3)",
          onUpdateCurrentTimestamp: true,
        },
      ],
    },
    {
      table: "persona_assets",
      columns: [
        { name: "id", kind: "varchar", length: 36, nullable: false },
        { name: "persona_id", kind: "varchar", length: 36, nullable: false },
        { name: "user_id", kind: "int", nullable: false },
        {
          name: "asset_type",
          kind: "enum",
          nullable: false,
          enumType:
            "enum('avatar_base','reference_image','wardrobe_reference','voice_reference','chain_end_frame')",
        },
        { name: "asset_url", kind: "text", nullable: false },
        { name: "source_url", kind: "text", nullable: false },
        {
          name: "source_media_asset_id",
          kind: "varchar",
          length: 191,
          nullable: false,
        },
        { name: "sha256", kind: "varchar", length: 64, nullable: false },
        { name: "tags", kind: "json", nullable: false },
        {
          name: "created_at",
          kind: "timestamp",
          precision: 3,
          nullable: false,
          defaultValue: "current_timestamp(3)",
        },
        {
          name: "updated_at",
          kind: "timestamp",
          precision: 3,
          nullable: false,
          defaultValue: "current_timestamp(3)",
          onUpdateCurrentTimestamp: true,
        },
      ],
    },
    {
      table: "video_generation_chains",
      columns: [
        { name: "id", kind: "varchar", length: 36, nullable: false },
        { name: "user_id", kind: "int", nullable: false },
        { name: "persona_id", kind: "varchar", length: 36, nullable: false },
        {
          name: "chain_status",
          kind: "enum",
          nullable: false,
          enumType: "enum('pending','generating','complete','failed')",
          defaultValue: "pending",
        },
        { name: "total_duration_sec", kind: "intUnsigned", nullable: false },
        { name: "frame_rate", kind: "intUnsigned", nullable: false },
        {
          name: "aspect_ratio",
          kind: "enum",
          nullable: false,
          enumType: "enum('16:9','9:16','1:1')",
        },
        {
          name: "idempotency_key",
          kind: "varchar",
          length: 128,
          nullable: false,
        },
        { name: "input_hash", kind: "varchar", length: 64, nullable: false },
        { name: "request_hash", kind: "varchar", length: 64, nullable: false },
        { name: "request_payload", kind: "json", nullable: false },
        { name: "persona_snapshot", kind: "json", nullable: false },
        { name: "authorization", kind: "json", nullable: true },
        {
          name: "authorization_closed_at",
          kind: "timestamp",
          precision: 3,
          nullable: true,
        },
        { name: "authorization_history", kind: "json", nullable: false },
        { name: "lease_token", kind: "varchar", length: 36, nullable: true },
        {
          name: "lease_expires_at",
          kind: "timestamp",
          precision: 3,
          nullable: true,
        },
        {
          name: "next_process_at",
          kind: "timestamp",
          precision: 3,
          nullable: false,
          defaultValue: "current_timestamp(3)",
        },
        { name: "last_error", kind: "text", nullable: true },
        { name: "failure_stage", kind: "varchar", length: 48, nullable: true },
        {
          name: "created_at",
          kind: "timestamp",
          precision: 3,
          nullable: false,
          defaultValue: "current_timestamp(3)",
        },
        {
          name: "updated_at",
          kind: "timestamp",
          precision: 3,
          nullable: false,
          defaultValue: "current_timestamp(3)",
          onUpdateCurrentTimestamp: true,
        },
        {
          name: "completed_at",
          kind: "timestamp",
          precision: 3,
          nullable: true,
        },
      ],
    },
    {
      table: "video_chain_segments",
      columns: [
        { name: "id", kind: "varchar", length: 36, nullable: false },
        { name: "chain_id", kind: "varchar", length: 36, nullable: false },
        { name: "segment_order", kind: "intUnsigned", nullable: false },
        { name: "duration_sec", kind: "intUnsigned", nullable: false },
        { name: "prompt_text", kind: "text", nullable: false },
        {
          name: "camera_motion_type",
          kind: "varchar",
          length: 32,
          nullable: false,
        },
        { name: "camera_metadata", kind: "json", nullable: false },
        { name: "inherited_camera_metadata", kind: "json", nullable: true },
        { name: "start_frame_url", kind: "text", nullable: true },
        {
          name: "start_frame_sha256",
          kind: "varchar",
          length: 64,
          nullable: true,
        },
        { name: "end_frame_url", kind: "text", nullable: true },
        {
          name: "end_frame_sha256",
          kind: "varchar",
          length: 64,
          nullable: true,
        },
        { name: "terminal_frame_extracted_url", kind: "text", nullable: true },
        {
          name: "terminal_frame_sha256",
          kind: "varchar",
          length: 64,
          nullable: true,
        },
        { name: "render_job_id", kind: "varchar", length: 64, nullable: true },
        {
          name: "segment_status",
          kind: "enum",
          nullable: false,
          enumType:
            "enum('pending','generating','extracting','complete','failed','submission_unknown')",
          defaultValue: "pending",
        },
        {
          name: "attempt",
          kind: "intUnsigned",
          nullable: false,
          defaultValue: "1",
        },
        {
          name: "processing_failures",
          kind: "intUnsigned",
          nullable: false,
          defaultValue: "0",
        },
        { name: "stream_url", kind: "text", nullable: true },
        { name: "frame_count", kind: "intUnsigned", nullable: true },
        { name: "actual_duration_sec", kind: "double", nullable: true },
        { name: "actual_frame_rate", kind: "double", nullable: true },
        { name: "last_error", kind: "text", nullable: true },
        { name: "failure_stage", kind: "varchar", length: 48, nullable: true },
        {
          name: "created_at",
          kind: "timestamp",
          precision: 3,
          nullable: false,
          defaultValue: "current_timestamp(3)",
        },
        {
          name: "updated_at",
          kind: "timestamp",
          precision: 3,
          nullable: false,
          defaultValue: "current_timestamp(3)",
          onUpdateCurrentTimestamp: true,
        },
        {
          name: "completed_at",
          kind: "timestamp",
          precision: 3,
          nullable: true,
        },
      ],
    },
  ],
  addedColumns: [],
  indexes: [
    { table: "persona_vaults", name: "PRIMARY", columns: ["id"], unique: true },
    {
      table: "persona_vaults",
      name: "persona_vault_owner_name_unique",
      columns: ["user_id", "persona_name"],
      unique: true,
    },
    {
      table: "persona_vaults",
      name: "persona_vault_id_owner_unique",
      columns: ["id", "user_id"],
      unique: true,
    },
    { table: "persona_assets", name: "PRIMARY", columns: ["id"], unique: true },
    {
      table: "persona_assets",
      name: "persona_assets_owner_kind_idx",
      columns: ["user_id", "persona_id", "asset_type"],
      unique: false,
    },
    {
      table: "video_generation_chains",
      name: "PRIMARY",
      columns: ["id"],
      unique: true,
    },
    {
      table: "video_generation_chains",
      name: "video_chains_owner_idempotency_unique",
      columns: ["user_id", "idempotency_key"],
      unique: true,
    },
    {
      table: "video_generation_chains",
      name: "video_chains_queue_idx",
      columns: ["chain_status", "next_process_at"],
      unique: false,
    },
    {
      table: "video_chain_segments",
      name: "PRIMARY",
      columns: ["id"],
      unique: true,
    },
    {
      table: "video_chain_segments",
      name: "video_chain_segment_order_unique",
      columns: ["chain_id", "segment_order"],
      unique: true,
    },
    {
      table: "video_chain_segments",
      name: "video_chain_segments_render_job_id_unique",
      columns: ["render_job_id"],
      unique: true,
    },
    {
      table: "video_chain_segments",
      name: "video_chain_segments_status_idx",
      columns: ["chain_id", "segment_status"],
      unique: false,
    },
  ],
  foreignKeys: [
    {
      table: "persona_vaults",
      name: "persona_vault_user_fk",
      columns: ["user_id"],
      referencedTable: "users",
      referencedColumns: ["id"],
    },
    {
      table: "persona_assets",
      name: "persona_assets_owner_fk",
      columns: ["persona_id", "user_id"],
      referencedTable: "persona_vaults",
      referencedColumns: ["id", "user_id"],
    },
    {
      table: "video_generation_chains",
      name: "video_chains_persona_owner_fk",
      columns: ["persona_id", "user_id"],
      referencedTable: "persona_vaults",
      referencedColumns: ["id", "user_id"],
    },
    {
      table: "video_chain_segments",
      name: "video_chain_segments_chain_fk",
      columns: ["chain_id"],
      referencedTable: "video_generation_chains",
      referencedColumns: ["id"],
    },
  ],
  checks: [
    {
      table: "persona_vaults",
      name: "persona_vault_version_positive",
      expression: "version > 0",
    },
    {
      table: "video_generation_chains",
      name: "video_chain_duration_positive",
      expression: "total_duration_sec BETWEEN 3 AND 360",
    },
    {
      table: "video_generation_chains",
      name: "video_chain_frame_rate_valid",
      expression: "frame_rate IN (24,25,30,60)",
    },
    {
      table: "video_chain_segments",
      name: "video_chain_segment_duration_valid",
      expression: "duration_sec BETWEEN 3 AND 15",
    },
    {
      table: "video_chain_segments",
      name: "video_chain_segment_order_positive",
      expression: "segment_order > 0",
    },
    {
      table: "video_chain_segments",
      name: "video_chain_segment_attempt_positive",
      expression: "attempt > 0",
    },
  ],
};

const SCHEMAS: Readonly<Record<string, MigrationSchemaSpec>> = {
  "0024_stripe_creator_net_payouts": PAYOUT_SCHEMA,
  "0025_persona_vault_chained_continuity": PERSONA_SCHEMA,
};

function failure(
  code: ConsolidatedMigrationErrorCode
): ConsolidatedMigrationError {
  return new ConsolidatedMigrationError(code);
}

function isConsolidatedMigrationError(
  value: unknown
): value is ConsolidatedMigrationError {
  return value instanceof ConsolidatedMigrationError;
}

function text(row: DatabaseRow, key: string): string | null {
  const value = row[key];
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "bigint")
    return String(value);
  return null;
}

function integer(row: DatabaseRow, key: string): number | null {
  const value = row[key];
  const candidate =
    typeof value === "bigint"
      ? Number(value)
      : typeof value === "string"
        ? Number(value)
        : value;
  return typeof candidate === "number" && Number.isSafeInteger(candidate)
    ? candidate
    : null;
}

function normalize(value: string): string {
  return value.toLowerCase().replace(/`/g, "").replace(/\s+/g, "");
}

function normalizeDefault(value: string | null): string | null {
  if (value === null) return null;
  const normalized = normalize(value).replace(/\(\)/g, "");
  return normalized.startsWith("'") && normalized.endsWith("'")
    ? normalized.slice(1, -1)
    : normalized;
}

function normalizeCheck(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9,><=]/g, "");
}

/** Pure dialect classifier; lookalike servers deliberately fail closed. */
export function supportedMySqlDialect(
  version: string,
  versionComment: string
): Dialect | null {
  const identity = `${version} ${versionComment}`.toLowerCase();
  if (identity.includes("mariadb")) return "mariadb";
  if (
    identity.includes("tidb") ||
    identity.includes("vitess") ||
    identity.includes("cockroach") ||
    identity.includes("postgres")
  )
    return null;
  if (
    /^8\.0\.\d+-0ubuntu[0-9.a-z]+$/i.test(version) &&
    ["(ubuntu)", "ubuntu"].includes(versionComment.trim().toLowerCase())
  )
    return "mysql";
  return identity.includes("mysql") ? "mysql" : null;
}

function checksAreEnforced(dialect: Dialect, version: string): boolean {
  const match = version.match(/(\d+)\.(\d+)\.(\d+)/);
  if (match === null) return false;
  const major = Number(match[1]);
  const minor = Number(match[2]);
  const patch = Number(match[3]);
  if (![major, minor, patch].every(Number.isSafeInteger)) return false;
  if (dialect === "mariadb")
    return (
      major > 10 || (major === 10 && (minor > 2 || (minor === 2 && patch >= 1)))
    );
  return (
    major > 8 || (major === 8 && (minor > 0 || (minor === 0 && patch >= 16)))
  );
}

async function queryRows(
  connection: Connection,
  query: string,
  values: readonly SqlValue[] = []
): Promise<DatabaseRow[]> {
  try {
    const [rows] = await connection.execute<RowDataPacket[]>(query, [
      ...values,
    ]);
    return rows.map(row => row as unknown as DatabaseRow);
  } catch {
    throw failure("DATABASE_INSPECTION_FAILED");
  }
}

async function tableExists(
  connection: Connection,
  table: string
): Promise<boolean> {
  const rows = await queryRows(
    connection,
    "SELECT 1 AS present FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? LIMIT 1",
    [table]
  );
  return rows.length === 1;
}

async function tableEngine(
  connection: Connection,
  table: string
): Promise<string | null> {
  const rows = await queryRows(
    connection,
    "SELECT ENGINE FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? LIMIT 1",
    [table]
  );
  return rows.length === 1 ? text(rows[0], "ENGINE") : null;
}

async function columnsForTable(
  connection: Connection,
  table: string
): Promise<ColumnInfo[]> {
  const rows = await queryRows(
    connection,
    "SELECT COLUMN_NAME, DATA_TYPE, COLUMN_TYPE, IS_NULLABLE, CHARACTER_MAXIMUM_LENGTH, DATETIME_PRECISION, COLUMN_DEFAULT, EXTRA FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? ORDER BY ORDINAL_POSITION",
    [table]
  );
  const columns: ColumnInfo[] = [];
  for (const row of rows) {
    const name = text(row, "COLUMN_NAME");
    const dataType = text(row, "DATA_TYPE");
    const columnType = text(row, "COLUMN_TYPE");
    const nullable = text(row, "IS_NULLABLE");
    const extra = text(row, "EXTRA");
    if (
      name === null ||
      dataType === null ||
      columnType === null ||
      nullable === null ||
      extra === null
    ) {
      throw failure("DATABASE_INSPECTION_FAILED");
    }
    columns.push({
      name,
      dataType: dataType.toLowerCase(),
      columnType: columnType.toLowerCase(),
      nullable: nullable.toUpperCase() === "YES",
      characterMaximumLength: integer(row, "CHARACTER_MAXIMUM_LENGTH"),
      datetimePrecision: integer(row, "DATETIME_PRECISION"),
      defaultValue: text(row, "COLUMN_DEFAULT"),
      extra: extra.toLowerCase(),
    });
  }
  return columns;
}

async function columnForTable(
  connection: Connection,
  table: string,
  name: string
): Promise<ColumnInfo | null> {
  const columns = await columnsForTable(connection, table);
  return columns.find(column => column.name === name) ?? null;
}

function matchesColumn(
  column: ColumnInfo,
  expected: ColumnSpec,
  dialect: Dialect
): boolean {
  if (column.nullable !== expected.nullable) return false;
  if (
    expected.defaultValue !== undefined &&
    normalizeDefault(column.defaultValue) !==
      normalizeDefault(expected.defaultValue)
  )
    return false;
  if (
    expected.autoIncrement === true &&
    !column.extra.includes("auto_increment")
  )
    return false;
  if (
    expected.onUpdateCurrentTimestamp === true &&
    !normalize(column.extra).includes("onupdatecurrent_timestamp")
  )
    return false;
  switch (expected.kind) {
    case "int":
      return (
        column.dataType === "int" && !column.columnType.includes("unsigned")
      );
    case "intUnsigned":
      return (
        column.dataType === "int" && column.columnType.includes("unsigned")
      );
    case "boolean":
      return (
        column.dataType === "tinyint" && column.columnType === "tinyint(1)"
      );
    case "varchar":
      return (
        column.dataType === "varchar" &&
        column.characterMaximumLength === expected.length
      );
    case "text":
      return column.dataType === "text";
    case "json":
      return (
        column.dataType === "json" ||
        (dialect === "mariadb" && column.dataType === "longtext")
      );
    case "timestamp":
      return (
        column.dataType === "timestamp" &&
        (expected.precision === undefined ||
          column.datetimePrecision === expected.precision)
      );
    case "enum":
      return (
        column.dataType === "enum" &&
        expected.enumType !== undefined &&
        normalize(column.columnType) === normalize(expected.enumType)
      );
    case "double":
      return column.dataType === "double";
  }
}

async function indexMatches(
  connection: Connection,
  expected: IndexSpec
): Promise<boolean> {
  const rows = await queryRows(
    connection,
    "SELECT NON_UNIQUE, SEQ_IN_INDEX, COLUMN_NAME FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND INDEX_NAME = ? ORDER BY SEQ_IN_INDEX",
    [expected.table, expected.name]
  );
  if (rows.length !== expected.columns.length) return false;
  return rows.every(
    (row, position) =>
      integer(row, "NON_UNIQUE") === (expected.unique ? 0 : 1) &&
      integer(row, "SEQ_IN_INDEX") === position + 1 &&
      text(row, "COLUMN_NAME") === expected.columns[position]
  );
}

async function foreignKeyMatches(
  connection: Connection,
  expected: ForeignKeySpec
): Promise<boolean> {
  const rows = await queryRows(
    connection,
    "SELECT kcu.COLUMN_NAME, kcu.ORDINAL_POSITION, kcu.REFERENCED_TABLE_NAME, kcu.REFERENCED_COLUMN_NAME, rc.DELETE_RULE FROM information_schema.KEY_COLUMN_USAGE kcu INNER JOIN information_schema.REFERENTIAL_CONSTRAINTS rc ON rc.CONSTRAINT_SCHEMA = kcu.CONSTRAINT_SCHEMA AND rc.CONSTRAINT_NAME = kcu.CONSTRAINT_NAME AND rc.TABLE_NAME = kcu.TABLE_NAME WHERE kcu.CONSTRAINT_SCHEMA = DATABASE() AND kcu.TABLE_NAME = ? AND kcu.CONSTRAINT_NAME = ? ORDER BY kcu.ORDINAL_POSITION",
    [expected.table, expected.name]
  );
  if (rows.length !== expected.columns.length) return false;
  return rows.every(
    (row, position) =>
      text(row, "COLUMN_NAME") === expected.columns[position] &&
      integer(row, "ORDINAL_POSITION") === position + 1 &&
      text(row, "REFERENCED_TABLE_NAME") === expected.referencedTable &&
      text(row, "REFERENCED_COLUMN_NAME") ===
        expected.referencedColumns[position] &&
      text(row, "DELETE_RULE")?.toUpperCase() === "RESTRICT"
  );
}

async function checkMatches(
  connection: Connection,
  expected: CheckSpec
): Promise<boolean> {
  const rows = await queryRows(
    connection,
    "SELECT cc.CHECK_CLAUSE FROM information_schema.TABLE_CONSTRAINTS tc INNER JOIN information_schema.CHECK_CONSTRAINTS cc ON cc.CONSTRAINT_SCHEMA = tc.CONSTRAINT_SCHEMA AND cc.CONSTRAINT_NAME = tc.CONSTRAINT_NAME WHERE tc.CONSTRAINT_SCHEMA = DATABASE() AND tc.TABLE_NAME = ? AND tc.CONSTRAINT_NAME = ? AND tc.CONSTRAINT_TYPE = 'CHECK'",
    [expected.table, expected.name]
  );
  if (rows.length !== 1) return false;
  const clause = text(rows[0], "CHECK_CLAUSE");
  return (
    clause !== null &&
    normalizeCheck(clause) === normalizeCheck(expected.expression)
  );
}

async function namedArtifactExists(
  connection: Connection,
  name: string
): Promise<boolean> {
  const constraints = await queryRows(
    connection,
    "SELECT 1 AS present FROM information_schema.TABLE_CONSTRAINTS WHERE CONSTRAINT_SCHEMA = DATABASE() AND CONSTRAINT_NAME = ? LIMIT 1",
    [name]
  );
  if (constraints.length > 0) return true;
  const indexes = await queryRows(
    connection,
    "SELECT 1 AS present FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND INDEX_NAME = ? LIMIT 1",
    [name]
  );
  return indexes.length > 0;
}

async function validateSchema(
  connection: Connection,
  schema: MigrationSchemaSpec,
  server: ServerInfo
): Promise<boolean> {
  for (const table of schema.newTables) {
    if (
      (await tableEngine(connection, table.table))?.toUpperCase() !== "INNODB"
    )
      return false;
    const actualColumns = await columnsForTable(connection, table.table);
    if (actualColumns.length !== table.columns.length) return false;
    const expectedNames = new Set(table.columns.map(column => column.name));
    if (actualColumns.some(column => !expectedNames.has(column.name)))
      return false;
    if (
      table.columns.some(expected => {
        const actual = actualColumns.find(
          column => column.name === expected.name
        );
        return (
          actual === undefined ||
          !matchesColumn(actual, expected, server.dialect)
        );
      })
    )
      return false;
  }
  for (const addition of schema.addedColumns) {
    const actual = await columnForTable(
      connection,
      addition.table,
      addition.column.name
    );
    if (
      actual === null ||
      !matchesColumn(actual, addition.column, server.dialect)
    )
      return false;
  }
  for (const index of schema.indexes) {
    if (!(await indexMatches(connection, index))) return false;
  }
  for (const foreignKey of schema.foreignKeys) {
    if (!(await foreignKeyMatches(connection, foreignKey))) return false;
  }
  if (server.checkConstraintsEnforced) {
    for (const check of schema.checks) {
      if (!(await checkMatches(connection, check))) return false;
    }
  }
  return true;
}

async function schemaArtifactsAreAbsent(
  connection: Connection,
  schema: MigrationSchemaSpec
): Promise<boolean> {
  for (const table of schema.newTables) {
    if (await tableExists(connection, table.table)) return false;
  }
  for (const addition of schema.addedColumns) {
    if (
      (await columnForTable(
        connection,
        addition.table,
        addition.column.name
      )) !== null
    )
      return false;
  }
  for (const index of schema.indexes) {
    if (
      index.name !== "PRIMARY" &&
      (await namedArtifactExists(connection, index.name))
    )
      return false;
  }
  for (const foreignKey of schema.foreignKeys) {
    if (await namedArtifactExists(connection, foreignKey.name)) return false;
  }
  for (const check of schema.checks) {
    if (await namedArtifactExists(connection, check.name)) return false;
  }
  return true;
}

type JournalEntry = { readonly tag: string; readonly when: number };

function journalEntries(value: unknown): readonly JournalEntry[] | null {
  if (typeof value !== "object" || value === null || Array.isArray(value))
    return null;
  const record = value as Record<string, unknown>;
  if (record.dialect !== "mysql" || !Array.isArray(record.entries)) return null;
  const entries: JournalEntry[] = [];
  for (const entry of record.entries) {
    if (typeof entry !== "object" || entry === null || Array.isArray(entry))
      return null;
    const candidate = entry as Record<string, unknown>;
    if (
      typeof candidate.tag !== "string" ||
      typeof candidate.when !== "number" ||
      !Number.isSafeInteger(candidate.when)
    )
      return null;
    entries.push({ tag: candidate.tag, when: candidate.when });
  }
  return entries;
}

async function loadApprovedMigrations(
  root: string
): Promise<readonly LoadedMigration[]> {
  if (typeof root !== "string" || root.trim().length === 0)
    throw failure("INVALID_ARGUMENT");
  let resolvedRoot: string;
  try {
    resolvedRoot = await fs.realpath(path.resolve(root));
  } catch {
    throw failure("MIGRATION_FILES_INVALID");
  }
  let journalText: string;
  try {
    journalText = await fs.readFile(
      path.join(resolvedRoot, "drizzle/meta/_journal.json"),
      "utf8"
    );
  } catch {
    throw failure("MIGRATION_JOURNAL_INVALID");
  }
  let entries: readonly JournalEntry[] | null = null;
  try {
    entries = journalEntries(JSON.parse(journalText) as unknown);
  } catch {
    throw failure("MIGRATION_JOURNAL_INVALID");
  }
  if (entries === null) throw failure("MIGRATION_JOURNAL_INVALID");
  for (const migration of MIGRATIONS) {
    const matchingEntries = entries.filter(
      entry => entry.tag === migration.name
    );
    if (
      matchingEntries.length !== 1 ||
      matchingEntries[0].when !== migration.when
    )
      throw failure("MIGRATION_JOURNAL_INVALID");
  }
  const loaded: LoadedMigration[] = [];
  for (const migration of MIGRATIONS) {
    const candidate = path.resolve(resolvedRoot, migration.file);
    if (!candidate.startsWith(`${resolvedRoot}${path.sep}`))
      throw failure("MIGRATION_FILES_INVALID");
    let realFile: string;
    let bytes: Buffer;
    try {
      realFile = await fs.realpath(candidate);
      if (!realFile.startsWith(`${resolvedRoot}${path.sep}`))
        throw failure("MIGRATION_FILES_INVALID");
      bytes = await fs.readFile(realFile);
    } catch (error: unknown) {
      if (isConsolidatedMigrationError(error)) throw error;
      throw failure("MIGRATION_FILES_INVALID");
    }
    const digest = createHash("sha256").update(bytes).digest("hex");
    if (digest !== migration.sha256) throw failure("MIGRATION_FILES_INVALID");
    const statements = bytes
      .toString("utf8")
      .split("\n--> statement-breakpoint\n")
      .map(statement => statement.trim());
    if (
      statements.length !== migration.statementCount ||
      statements.some(statement => statement.length === 0)
    )
      throw failure("MIGRATION_FILES_INVALID");
    loaded.push({ ...migration, statements });
  }
  return loaded;
}

async function serverInfo(connection: Connection): Promise<ServerInfo> {
  const rows = await queryRows(
    connection,
    "SELECT VERSION() AS version, @@version_comment AS version_comment"
  );
  if (rows.length !== 1) throw failure("UNSUPPORTED_DIALECT");
  const version = text(rows[0], "version");
  const comment = text(rows[0], "version_comment");
  if (version === null || comment === null)
    throw failure("UNSUPPORTED_DIALECT");
  const dialect = supportedMySqlDialect(version, comment);
  if (dialect === null && /tidb/i.test(`${version} ${comment}`))
    throw failure("UNSUPPORTED_DIALECT_TIDB");
  if (dialect === null) throw failure("UNSUPPORTED_DIALECT");
  return {
    dialect,
    checkConstraintsEnforced: checksAreEnforced(dialect, version),
  };
}

async function validateBaseline(connection: Connection): Promise<void> {
  const tables = await queryRows(
    connection,
    "SELECT TABLE_NAME, ENGINE FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME IN (?,?,?,?)",
    [...REQUIRED_BASELINE_TABLES]
  );
  if (tables.length !== REQUIRED_BASELINE_TABLES.length)
    throw failure("BASELINE_INVALID");
  const seen = new Set(tables.map(row => text(row, "TABLE_NAME")));
  if (REQUIRED_BASELINE_TABLES.some(table => !seen.has(table)))
    throw failure("BASELINE_INVALID");
  const usersEngine = text(
    tables.find(row => text(row, "TABLE_NAME") === "users") ?? {},
    "ENGINE"
  );
  if (usersEngine?.toUpperCase() !== "INNODB")
    throw failure("BASELINE_INVALID");
  const userId = await columnForTable(connection, "users", "id");
  if (
    userId === null ||
    userId.dataType !== "int" ||
    userId.columnType.includes("unsigned") ||
    userId.nullable
  )
    throw failure("BASELINE_INVALID");
  const primaryKey = await queryRows(
    connection,
    "SELECT 1 AS present FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND INDEX_NAME = 'PRIMARY' AND SEQ_IN_INDEX = 1 AND COLUMN_NAME = 'id' LIMIT 1"
  );
  if (primaryKey.length !== 1) throw failure("BASELINE_INVALID");
}

async function migrationTableIsCanonical(
  connection: Connection
): Promise<boolean> {
  if (
    (await tableEngine(connection, MIGRATION_TABLE))?.toUpperCase() !== "INNODB"
  )
    return false;
  const columns = await columnsForTable(connection, MIGRATION_TABLE);
  if (columns.length !== 3) return false;
  const id = columns.find(column => column.name === "id");
  const hash = columns.find(column => column.name === "hash");
  const createdAt = columns.find(column => column.name === "created_at");
  if (
    id === undefined ||
    hash === undefined ||
    createdAt === undefined ||
    id.dataType !== "bigint" ||
    !id.columnType.includes("unsigned") ||
    id.nullable ||
    !id.extra.includes("auto_increment") ||
    hash.dataType !== "text" ||
    hash.nullable ||
    createdAt.dataType !== "bigint"
  )
    return false;
  return indexMatches(connection, {
    table: MIGRATION_TABLE,
    name: "PRIMARY",
    columns: ["id"],
    unique: true,
  });
}

async function recordedMigrationState(
  connection: Connection,
  migration: LoadedMigration
): Promise<"recorded" | "pending"> {
  const rows = await queryRows(
    connection,
    "SELECT hash, created_at FROM `__drizzle_migrations` WHERE hash = ? OR created_at = ?",
    [migration.sha256, migration.when]
  );
  if (rows.length === 0) return "pending";
  const exact = rows.filter(
    row =>
      text(row, "hash") === migration.sha256 &&
      integer(row, "created_at") === migration.when
  );
  if (rows.length === 1 && exact.length === 1) return "recorded";
  throw failure("MIGRATION_METADATA_INVALID");
}

async function createCanonicalMigrationTable(
  connection: Connection
): Promise<void> {
  try {
    await connection.execute(
      "CREATE TABLE `__drizzle_migrations` (`id` serial, `hash` text NOT NULL, `created_at` bigint, CONSTRAINT `__drizzle_migrations_id` PRIMARY KEY(`id`)) ENGINE=InnoDB"
    );
  } catch {
    throw failure("MIGRATION_EXECUTION_FAILED");
  }
  if (!(await migrationTableIsCanonical(connection)))
    throw failure("MIGRATION_METADATA_INVALID");
}

type Preflight = {
  readonly server: ServerInfo;
  readonly migrationTableExists: boolean;
  readonly pending: readonly LoadedMigration[];
  readonly alreadyApplied: readonly LoadedMigration[];
};

async function preflight(
  connection: Connection,
  migrations: readonly LoadedMigration[]
): Promise<Preflight> {
  const server = await serverInfo(connection);
  await validateBaseline(connection);
  const migrationTableExists = await tableExists(connection, MIGRATION_TABLE);
  if (migrationTableExists && !(await migrationTableIsCanonical(connection)))
    throw failure("MIGRATION_METADATA_INVALID");
  const pending: LoadedMigration[] = [];
  const alreadyApplied: LoadedMigration[] = [];
  let encounteredPending = false;
  for (const migration of migrations) {
    const schema = SCHEMAS[migration.name];
    if (schema === undefined) throw failure("MIGRATION_FILES_INVALID");
    const state = migrationTableExists
      ? await recordedMigrationState(connection, migration)
      : "pending";
    if (state === "recorded") {
      if (encounteredPending) throw failure("MIGRATION_STATE_INVALID");
      if (!(await validateSchema(connection, schema, server)))
        throw failure("MIGRATION_SCHEMA_MISMATCH");
      alreadyApplied.push(migration);
      continue;
    }
    encounteredPending = true;
    if (!(await schemaArtifactsAreAbsent(connection, schema)))
      throw failure("MIGRATION_STATE_INVALID");
    pending.push(migration);
  }
  return { server, migrationTableExists, pending, alreadyApplied };
}

async function acquireLock(connection: Connection): Promise<void> {
  const rows = await queryRows(
    connection,
    "SELECT GET_LOCK(?, ?) AS acquired",
    [LOCK_KEY, LOCK_TIMEOUT_SECONDS]
  );
  if (rows.length !== 1 || integer(rows[0], "acquired") !== 1)
    throw failure("LOCK_UNAVAILABLE");
}

async function releaseLock(connection: Connection): Promise<void> {
  try {
    await connection.execute("SELECT RELEASE_LOCK(?)", [LOCK_KEY]);
  } catch {
    // The connection is about to be closed; never replace the original fixed-code result.
  }
}

async function runWithConnection<T>(
  databaseUrl: string,
  action: (connection: Connection) => Promise<T>
): Promise<T> {
  if (typeof databaseUrl !== "string" || databaseUrl.trim().length === 0)
    throw failure("INVALID_ARGUMENT");
  let connection: Connection;
  try {
    connection = await mysql.createConnection(databaseUrl);
  } catch {
    throw failure("CONNECTION_FAILED");
  }
  let locked = false;
  try {
    await acquireLock(connection);
    locked = true;
    return await action(connection);
  } catch (error: unknown) {
    if (isConsolidatedMigrationError(error)) throw error;
    throw failure("DATABASE_INSPECTION_FAILED");
  } finally {
    if (locked) await releaseLock(connection);
    try {
      await connection.end();
    } catch {
      // A closed broken connection cannot leak a DSN through this utility.
    }
  }
}

async function invokeBeforeApply(
  callback: (() => Promise<void>) | undefined
): Promise<void> {
  if (callback === undefined) return;
  try {
    await callback();
  } catch (error: unknown) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      typeof error.code === "string" &&
      /^CONSOLIDATED_[A-Z0-9_]+$/.test(error.code)
    )
      throw error;
    throw failure("BACKUP_CALLBACK_FAILED");
  }
}

async function invokeProgress(
  callback:
    | ((event: ConsolidatedMigrationProgress) => Promise<void>)
    | undefined,
  event: ConsolidatedMigrationProgress
): Promise<void> {
  if (callback === undefined) return;
  try {
    await callback(event);
  } catch {
    throw failure("PROGRESS_CALLBACK_FAILED");
  }
}

async function executeApprovedMigration(
  connection: Connection,
  migration: LoadedMigration,
  server: ServerInfo,
  onProgress: ConsolidatedMigrationOptions["onProgress"]
): Promise<void> {
  for (let index = 0; index < migration.statements.length; index += 1) {
    try {
      await connection.execute(migration.statements[index]);
    } catch {
      throw failure("MIGRATION_EXECUTION_FAILED");
    }
    await invokeProgress(onProgress, {
      migration: migration.name,
      statement: index + 1,
      total: migration.statements.length,
    });
  }
  const schema = SCHEMAS[migration.name];
  if (
    schema === undefined ||
    !(await validateSchema(connection, schema, server))
  )
    throw failure("MIGRATION_SCHEMA_MISMATCH");
  try {
    await connection.execute(
      "INSERT INTO `__drizzle_migrations` (`hash`, `created_at`) VALUES (?, ?)",
      [migration.sha256, migration.when]
    );
  } catch {
    throw failure("MIGRATION_EXECUTION_FAILED");
  }
}

/**
 * Read-only, locked inspection. It never creates the Drizzle table or executes migration SQL.
 */
export async function inspectConsolidatedMigrations(
  databaseUrl: string,
  root: string
): Promise<ConsolidatedMigrationInspection> {
  const migrations = await loadApprovedMigrations(root);
  return runWithConnection(databaseUrl, async connection => {
    const state = await preflight(connection, migrations);
    return {
      dialect: state.server.dialect,
      checkConstraintsEnforced: state.server.checkConstraintsEnforced,
      pending: state.pending.map(migration => migration.name),
      alreadyApplied: state.alreadyApplied.map(migration => migration.name),
    };
  });
}

/**
 * Applies only the two pinned additive SQL files. `beforeApply` runs at most once,
 * after every read-only preflight check and before the first schema mutation.
 */
export async function applyConsolidatedMigrations(
  databaseUrl: string,
  root: string,
  options: ConsolidatedMigrationOptions = {}
): Promise<ConsolidatedMigrationResult> {
  const migrations = await loadApprovedMigrations(root);
  return runWithConnection(databaseUrl, async connection => {
    const state = await preflight(connection, migrations);
    if (state.pending.length === 0) {
      return {
        applied: [],
        alreadyApplied: state.alreadyApplied.map(migration => migration.name),
      };
    }
    await invokeBeforeApply(options.beforeApply);
    if (!state.migrationTableExists)
      await createCanonicalMigrationTable(connection);
    const applied: string[] = [];
    for (const migration of state.pending) {
      await executeApprovedMigration(
        connection,
        migration,
        state.server,
        options.onProgress
      );
      applied.push(migration.name);
    }
    return {
      applied,
      alreadyApplied: state.alreadyApplied.map(migration => migration.name),
    };
  });
}
