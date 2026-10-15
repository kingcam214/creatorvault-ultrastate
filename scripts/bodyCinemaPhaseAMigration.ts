import { createHash } from "node:crypto";
import { constants, promises as fs } from "node:fs";
import path from "node:path";
import mysql, { type Connection, type RowDataPacket } from "mysql2/promise";
import { ReleaseFailure, requireRelease } from "./securityReleasePolicy";
import { inspectConsolidatedMigrations } from "./consolidatedMigrations";

const LOCK_NAME = "creatorvault:body-cinema-phase-a-lifecycle:v1";
const LOCK_TIMEOUT_SECONDS = 30;
const MIGRATION_TABLE = "__drizzle_migrations";
const LIFECYCLE_TABLE = "body_cinema_candidate_lifecycles";
const LEGACY_MIGRATIONS = [
  "0024_stripe_creator_net_payouts",
  "0025_persona_vault_chained_continuity",
] as const;

export const BODY_CINEMA_PHASE_A_MIGRATION = {
  name: "0026_body_cinema_candidate_lifecycle",
  file: "drizzle/0026_body_cinema_candidate_lifecycle.sql",
  sha256: "eca944dab81280ebbdd80af255007e9bc0afc20cab3f50d52de6e30d94a4e86d",
  when: 1791129600000,
  table: LIFECYCLE_TABLE,
} as const;

export const BODY_CINEMA_PLAN_SOURCE_SCOPE_MIGRATION = {
  name: "0027_body_cinema_plan_source_scope",
  file: "drizzle/0027_body_cinema_plan_source_scope.sql",
  sha256: "c2c9d6251d24c322278c5be5b405dbdfbaa81343975554432ee7f969b5265319",
  when: 1791993600000,
  table: LIFECYCLE_TABLE,
} as const;

export const BODY_CINEMA_PLAN_SCOPE_EXPRESSION =
  "CASE WHEN JSON_VALUE(rights_assertion_json, '$.version') COLLATE utf8mb4_bin = _utf8mb4'body_cinema.body_directed_assertion.v1' COLLATE utf8mb4_bin THEN RTRIM(id) ELSE '' END";

type PinnedMigration = typeof BODY_CINEMA_PHASE_A_MIGRATION | typeof BODY_CINEMA_PLAN_SOURCE_SCOPE_MIGRATION;
// Negative timestamp is an immutable preservation intent, not an applied migration.
// It cannot advance a generic Drizzle runner's last-applied positive timestamp.
const SCOPE_PRESERVATION_WHEN = -BODY_CINEMA_PLAN_SOURCE_SCOPE_MIGRATION.when;
const SCOPE_PRESERVATION_PREFIX = "body_cinema.0027.preservation.v1:";

type Row = Record<string, unknown>;
type SqlValue = string | number;
type ColumnFingerprint = {
  name: string;
  dataType: string;
  columnType: string;
  nullable: boolean;
  length: number | null;
  precision: number | null;
  defaultValue: string | null;
  extra: string;
  generationExpression: string;
};
type ExpectedColumn = {
  name: string;
  dataType: string;
  columnType: string;
  nullable: boolean;
  length: number | null;
  precision: number | null;
  defaultValue: string | null;
  extra?: string;
};
type ExpectedIndex = {
  name: string;
  columns: readonly string[];
  unique: boolean;
};
type MigrationRecordState = "recorded" | "pending";

const LIFECYCLE_COLUMNS: readonly ExpectedColumn[] = [
  {
    name: "id",
    dataType: "char",
    columnType: "char(36)",
    nullable: false,
    length: 36,
    precision: null,
    defaultValue: null,
  },
  {
    name: "project_id",
    dataType: "char",
    columnType: "char(36)",
    nullable: false,
    length: 36,
    precision: null,
    defaultValue: null,
  },
  {
    name: "creator_id",
    dataType: "bigint",
    columnType: "bigint",
    nullable: false,
    length: null,
    precision: null,
    defaultValue: null,
  },
  {
    name: "source_asset_id",
    dataType: "varchar",
    columnType: "varchar(191)",
    nullable: false,
    length: 191,
    precision: null,
    defaultValue: null,
  },
  {
    name: "source_sha256",
    dataType: "char",
    columnType: "char(64)",
    nullable: false,
    length: 64,
    precision: null,
    defaultValue: null,
  },
  {
    name: "source_snapshot_json",
    dataType: "json",
    columnType: "json",
    nullable: false,
    length: null,
    precision: null,
    defaultValue: null,
  },
  {
    name: "rights_assertion_json",
    dataType: "json",
    columnType: "json",
    nullable: false,
    length: null,
    precision: null,
    defaultValue: null,
  },
  {
    name: "rights_assertion_hash",
    dataType: "char",
    columnType: "char(64)",
    nullable: false,
    length: 64,
    precision: null,
    defaultValue: null,
  },
  {
    name: "treatment_version",
    dataType: "varchar",
    columnType: "varchar(96)",
    nullable: true,
    length: 96,
    precision: null,
    defaultValue: null,
  },
  {
    name: "treatment_json",
    dataType: "json",
    columnType: "json",
    nullable: true,
    length: null,
    precision: null,
    defaultValue: null,
  },
  {
    name: "treatment_hash",
    dataType: "char",
    columnType: "char(64)",
    nullable: true,
    length: 64,
    precision: null,
    defaultValue: null,
  },
  {
    name: "state",
    dataType: "varchar",
    columnType: "varchar(32)",
    nullable: false,
    length: 32,
    precision: null,
    defaultValue: null,
  },
  {
    name: "candidate_asset_id",
    dataType: "varchar",
    columnType: "varchar(191)",
    nullable: true,
    length: 191,
    precision: null,
    defaultValue: null,
  },
  {
    name: "candidate_sha256",
    dataType: "char",
    columnType: "char(64)",
    nullable: true,
    length: 64,
    precision: null,
    defaultValue: null,
  },
  {
    name: "candidate_snapshot_json",
    dataType: "json",
    columnType: "json",
    nullable: true,
    length: null,
    precision: null,
    defaultValue: null,
  },
  {
    name: "candidate_provenance_json",
    dataType: "json",
    columnType: "json",
    nullable: true,
    length: null,
    precision: null,
    defaultValue: null,
  },
  {
    name: "attachment_authorization_json",
    dataType: "json",
    columnType: "json",
    nullable: true,
    length: null,
    precision: null,
    defaultValue: null,
  },
  {
    name: "review_id",
    dataType: "char",
    columnType: "char(36)",
    nullable: true,
    length: 36,
    precision: null,
    defaultValue: null,
  },
  {
    name: "review_json",
    dataType: "json",
    columnType: "json",
    nullable: true,
    length: null,
    precision: null,
    defaultValue: null,
  },
  {
    name: "decision_json",
    dataType: "json",
    columnType: "json",
    nullable: true,
    length: null,
    precision: null,
    defaultValue: null,
  },
  {
    name: "handoff_json",
    dataType: "json",
    columnType: "json",
    nullable: true,
    length: null,
    precision: null,
    defaultValue: null,
  },
  {
    name: "created_at",
    dataType: "datetime",
    columnType: "datetime(3)",
    nullable: false,
    length: null,
    precision: 3,
    defaultValue: "current_timestamp(3)",
  },
  {
    name: "updated_at",
    dataType: "datetime",
    columnType: "datetime(3)",
    nullable: false,
    length: null,
    precision: 3,
    defaultValue: "current_timestamp(3)",
    extra: "on update current_timestamp(3)",
  },
];

const LIFECYCLE_INDEXES: readonly ExpectedIndex[] = [
  { name: "PRIMARY", columns: ["id"], unique: true },
  {
    name: "body_cinema_lifecycle_project_unique",
    columns: ["project_id"],
    unique: true,
  },
  {
    name: "body_cinema_lifecycle_creator_source_unique",
    columns: ["creator_id", "source_asset_id"],
    unique: true,
  },
  {
    name: "body_cinema_lifecycle_candidate_unique",
    columns: ["candidate_asset_id"],
    unique: true,
  },
  {
    name: "body_cinema_lifecycle_creator_updated_idx",
    columns: ["creator_id", "updated_at"],
    unique: false,
  },
  {
    name: "body_cinema_lifecycle_state_idx",
    columns: ["state", "updated_at"],
    unique: false,
  },
];

const RUNTIME_TABLE_PREREQUISITES = [
  {
    table: "creation_projects",
    columns: [
      "id",
      "creator_id",
      "title",
      "intent",
      "output_purpose",
      "state",
      "source_media_asset_id",
      "source_evidence_id",
      "treatment_id",
      "identity_reference",
      "audio_asset_id",
      "creation_director_request_id",
      "render_job_id",
      "accepted_media_asset_id",
      "social_package_id",
      "metadata_json",
      "created_at",
      "updated_at",
    ],
  },
  {
    table: "creation_project_events",
    columns: [
      "id",
      "project_id",
      "actor_id",
      "event_type",
      "detail_json",
      "created_at",
    ],
  },
  {
    table: "media_assets",
    columns: [
      "id",
      "user_id",
      "source_type",
      "asset_type",
      "file_name",
      "original_name",
      "mime_type",
      "file_size",
      "storage_path",
      "public_url",
      "thumbnail_url",
      "duration",
      "width",
      "height",
      "status",
      "created_by_feature",
    ],
  },
  {
    table: "trailer_projects",
    columns: [
      "id",
      "user_id",
      "project_name",
      "project_type",
      "title",
      "concept",
      "script_text",
      "format",
      "source_asset_id",
      "scenes_json",
      "hooks",
      "hook_variants",
      "status",
      "created_at",
      "updated_at",
    ],
  },
] as const;

export type BodyCinemaPhaseAMigrationResult = {
  applied: number;
  alreadyApplied: number;
  recoveredInterruptedDdl: boolean;
};

export type BodyCinemaPhaseAMigrationOptions = {
  /** Invoked exactly once after read-only preflight and immediately before this helper's first DDL. */
  beforeFirstDdl: () => Promise<void>;
};

export class BodyCinemaPhaseAMigrationError extends Error {
  readonly code: string;

  constructor(code: string) {
    super(code);
    this.name = "BodyCinemaPhaseAMigrationError";
    this.code = code;
  }
}

function fail(code: string): never {
  throw new BodyCinemaPhaseAMigrationError(`BODY_CINEMA_PHASE_A_${code}`);
}

function text(row: Row, key: string): string | null {
  const value = row[key];
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "bigint")
    return String(value);
  return null;
}

function integer(row: Row, key: string): number | null {
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

function normalized(value: string): string {
  return value.toLowerCase().replace(/`/g, "").replace(/\s+/g, "");
}

function normalizedGenerationExpression(value: string): string {
  // Engines add redundant parentheses/backticks and charset literal introducers.
  // Preserve quoted values case-exact; only SQL identifiers/keywords are folded.
  return (value.match(/'(?:''|\\.|[^'])*'|[^']+/g) ?? []).map(token =>
    token.startsWith("'") ? token : token.toLowerCase()
      .replace(/_(?:utf8mb4|utf8mb3|utf8|latin1)$/g, "")
      .replace(/[\s`()]/g, "")
  ).join("");
}

function normalizedDefault(value: string | null): string | null {
  if (value === null) return null;
  const canonical = normalized(value).replace(/\(\)/g, "");
  // MariaDB can return the nullable no-default marker as the literal text NULL.
  return canonical === "null" ? null : canonical;
}

function normalizedExtra(value: string): string {
  // MySQL adds this metadata marker to timestamp/datetime defaults. Preserve all
  // other EXTRA tokens, including ON UPDATE, as part of the exact fingerprint.
  return value
    .toLowerCase()
    .replace(/`/g, "")
    .split(/\s+/)
    .filter(token => token !== "default_generated")
    .join("");
}

function normalizedCheck(value: string): string {
  return value
    .toLowerCase()
    .replace(/`/g, "")
    .replace(/[^a-z0-9_]/g, "");
}

function expectedDataTypeMatches(
  actual: ColumnFingerprint,
  expected: ExpectedColumn
): boolean {
  if (expected.dataType !== "json")
    return actual.dataType === expected.dataType;
  // MariaDB exposes JSON aliases through information_schema as LONGTEXT.
  return actual.dataType === "json" || actual.dataType === "longtext";
}

function expectedColumnTypeMatches(
  actual: ColumnFingerprint,
  expected: ExpectedColumn
): boolean {
  if (expected.dataType !== "json")
    if (expected.dataType === "bigint")
      return ["bigint", "bigint(20)"].includes(normalized(actual.columnType));
    else
      return normalized(actual.columnType) === normalized(expected.columnType);
  return (
    normalized(actual.columnType) === "json" ||
    normalized(actual.columnType) === "longtext"
  );
}

function expectedLengthMatches(
  actual: ColumnFingerprint,
  expected: ExpectedColumn
): boolean {
  // MariaDB exposes its JSON alias as LONGTEXT and reports LONGTEXT's large
  // character limit instead of JSON's null metadata length.
  return (
    (expected.dataType === "json" && actual.dataType === "longtext") ||
    actual.length === expected.length
  );
}

async function queryRows(
  connection: Connection,
  query: string,
  values: readonly SqlValue[] = []
): Promise<Row[]> {
  try {
    const [rows] = await connection.execute<RowDataPacket[]>(query, [
      ...values,
    ]);
    return rows.map(row => row as unknown as Row);
  } catch {
    fail("DATABASE_INSPECTION_FAILED");
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
  return rows.length === 1 ? text(rows[0]!, "ENGINE") : null;
}

async function tableCollation(
  connection: Connection,
  table: string
): Promise<string | null> {
  const rows = await queryRows(
    connection,
    "SELECT TABLE_COLLATION FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? LIMIT 1",
    [table]
  );
  return rows.length === 1 ? text(rows[0]!, "TABLE_COLLATION") : null;
}

async function columnsForTable(
  connection: Connection,
  table: string
): Promise<ColumnFingerprint[]> {
  const rows = await queryRows(
    connection,
    "SELECT COLUMN_NAME, DATA_TYPE, COLUMN_TYPE, IS_NULLABLE, CHARACTER_MAXIMUM_LENGTH, DATETIME_PRECISION, COLUMN_DEFAULT, EXTRA, GENERATION_EXPRESSION FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? ORDER BY ORDINAL_POSITION",
    [table]
  );
  const columns: ColumnFingerprint[] = [];
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
    )
      fail("DATABASE_INSPECTION_FAILED");
    columns.push({
      name,
      dataType: dataType.toLowerCase(),
      columnType: columnType.toLowerCase(),
      nullable: nullable.toUpperCase() === "YES",
      length: integer(row, "CHARACTER_MAXIMUM_LENGTH"),
      precision: integer(row, "DATETIME_PRECISION"),
      defaultValue: text(row, "COLUMN_DEFAULT"),
      extra: extra.toLowerCase(),
      generationExpression: text(row, "GENERATION_EXPRESSION") ?? "",
    });
  }
  return columns;
}

async function checkClausesForTable(
  connection: Connection,
  table: string
): Promise<string[]> {
  const rows = await queryRows(
    connection,
    "SELECT cc.CHECK_CLAUSE FROM information_schema.TABLE_CONSTRAINTS tc INNER JOIN information_schema.CHECK_CONSTRAINTS cc ON cc.CONSTRAINT_SCHEMA = tc.CONSTRAINT_SCHEMA AND cc.CONSTRAINT_NAME = tc.CONSTRAINT_NAME WHERE tc.CONSTRAINT_SCHEMA = DATABASE() AND tc.TABLE_NAME = ? AND tc.CONSTRAINT_TYPE = 'CHECK'",
    [table]
  );
  return rows.map(row => {
    const clause = text(row, "CHECK_CLAUSE");
    if (clause === null) fail("DATABASE_INSPECTION_FAILED");
    return clause;
  });
}

async function exactIndexesMatch(
  connection: Connection,
  table: string,
  expected: readonly ExpectedIndex[]
): Promise<boolean> {
  const rows = await queryRows(
    connection,
    "SELECT INDEX_NAME, NON_UNIQUE, SEQ_IN_INDEX, COLUMN_NAME FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? ORDER BY INDEX_NAME, SEQ_IN_INDEX",
    [table]
  );
  const actual = new Map<
    string,
    { unique: boolean; columns: { position: number; name: string }[] }
  >();
  for (const row of rows) {
    const name = text(row, "INDEX_NAME");
    const nonUnique = integer(row, "NON_UNIQUE");
    const position = integer(row, "SEQ_IN_INDEX");
    const column = text(row, "COLUMN_NAME");
    if (
      name === null ||
      nonUnique === null ||
      position === null ||
      column === null ||
      (nonUnique !== 0 && nonUnique !== 1) ||
      position < 1
    )
      return false;
    const prior = actual.get(name);
    if (prior && prior.unique !== (nonUnique === 0)) return false;
    const value = prior ?? { unique: nonUnique === 0, columns: [] };
    value.columns.push({ position, name: column });
    actual.set(name, value);
  }
  if (actual.size !== expected.length) return false;
  return expected.every(index => {
    const observed = actual.get(index.name);
    if (!observed || observed.unique !== index.unique) return false;
    observed.columns.sort((left, right) => left.position - right.position);
    return (
      observed.columns.length === index.columns.length &&
      observed.columns.every(
        (column, position) =>
          column.position === position + 1 &&
          column.name === index.columns[position]
      )
    );
  });
}

async function canonicalMigrationTable(
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
    createdAt.dataType !== "bigint" ||
    !createdAt.nullable ||
    ![id, hash, createdAt].every(
      column => normalizedDefault(column.defaultValue) === null
    )
  )
    return false;
  // SERIAL is a BIGINT UNSIGNED AUTO_INCREMENT UNIQUE alias; some engines retain
  // its redundant single-column unique index beside the explicit primary key.
  return (
    (await exactIndexesMatch(connection, MIGRATION_TABLE, [
      { name: "PRIMARY", columns: ["id"], unique: true },
    ])) ||
    exactIndexesMatch(connection, MIGRATION_TABLE, [
      { name: "PRIMARY", columns: ["id"], unique: true },
      { name: "id", columns: ["id"], unique: true },
    ])
  );
}

async function runtimeTablePrerequisitesMatch(
  connection: Connection
): Promise<boolean> {
  for (const prerequisite of RUNTIME_TABLE_PREREQUISITES) {
    if (
      (await tableEngine(connection, prerequisite.table))?.toUpperCase() !==
      "INNODB"
    )
      return false;
    const names = new Set(
      (await columnsForTable(connection, prerequisite.table)).map(
        column => column.name
      )
    );
    if (!prerequisite.columns.every(column => names.has(column))) return false;
  }
  return true;
}

async function lifecycleFingerprintMatches(
  connection: Connection,
  scoped = false
): Promise<boolean> {
  if (
    (await tableEngine(connection, LIFECYCLE_TABLE))?.toUpperCase() !== "INNODB"
  )
    return false;
  const collation = await tableCollation(connection, LIFECYCLE_TABLE);
  if (collation === null || !collation.toLowerCase().startsWith("utf8mb4_"))
    return false;
  const expectedColumns: readonly ExpectedColumn[] = scoped ? [
    ...LIFECYCLE_COLUMNS,
    { name: "plan_scope", dataType: "varchar", columnType: "varchar(36)",
      nullable: true, length: 36, precision: null, defaultValue: null,
      extra: "virtual generated" },
  ] : LIFECYCLE_COLUMNS;
  const columns = await columnsForTable(connection, LIFECYCLE_TABLE);
  if (columns.length !== expectedColumns.length) return false;
  const exactColumns = columns.every((actual, position) => {
    const expected = expectedColumns[position];
    if (expected === undefined || actual.name !== expected.name) return false;
    return (
      expectedDataTypeMatches(actual, expected) &&
      expectedColumnTypeMatches(actual, expected) &&
      actual.nullable === expected.nullable &&
      expectedLengthMatches(actual, expected) &&
      actual.precision === expected.precision &&
      normalizedDefault(actual.defaultValue) ===
        normalizedDefault(expected.defaultValue) &&
      normalizedExtra(actual.extra) === normalizedExtra(expected.extra ?? "") &&
      normalizedGenerationExpression(actual.generationExpression) ===
        (expected.name === "plan_scope" ? normalizedGenerationExpression(BODY_CINEMA_PLAN_SCOPE_EXPRESSION) : "")
    );
  });
  if (!exactColumns) return false;
  const longtextJsonColumns = columns
    .filter(
      (column, position) =>
        LIFECYCLE_COLUMNS[position]?.dataType === "json" &&
        column.dataType === "longtext"
    )
    .map(column => column.name);
  if (longtextJsonColumns.length > 0) {
    const checks = await checkClausesForTable(connection, LIFECYCLE_TABLE);
    if (
      !longtextJsonColumns.every(column =>
        checks.some(check => normalizedCheck(check) === `json_valid${column}`)
      )
    )
      return false;
  }
  const indexes = scoped ? LIFECYCLE_INDEXES.map(index =>
    index.name === "body_cinema_lifecycle_creator_source_unique"
      ? { name: "body_cinema_lifecycle_creator_source_scope_unique",
        columns: ["creator_id", "source_asset_id", "plan_scope"], unique: true }
      : index
  ) : LIFECYCLE_INDEXES;
  return exactIndexesMatch(connection, LIFECYCLE_TABLE, indexes);
}

async function lifecycleTableIsEmpty(connection: Connection): Promise<boolean> {
  const rows = await queryRows(
    connection,
    "SELECT 1 AS present FROM `body_cinema_candidate_lifecycles` LIMIT 1"
  );
  return rows.length === 0;
}

async function recordState(
  connection: Connection,
  migration: PinnedMigration = BODY_CINEMA_PHASE_A_MIGRATION
): Promise<MigrationRecordState> {
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
  fail("MIGRATION_METADATA_CONFLICT");
}

async function loadPinnedMigration(root: string, pinned: PinnedMigration): Promise<string> {
  const resolvedRoot = path.resolve(root);
  const migration = path.resolve(
    resolvedRoot,
    pinned.file
  );
  const journal = path.resolve(resolvedRoot, "drizzle/meta/_journal.json");
  if (
    migration !== path.join(resolvedRoot, pinned.file) ||
    journal !== path.join(resolvedRoot, "drizzle/meta/_journal.json")
  )
    fail("MIGRATION_PATH_INVALID");
  try {
    const [migrationMeta, journalMeta] = await Promise.all([
      fs.lstat(migration),
      fs.lstat(journal),
    ]);
    if (
      !migrationMeta.isFile() ||
      migrationMeta.isSymbolicLink() ||
      migrationMeta.nlink !== 1 ||
      !journalMeta.isFile() ||
      journalMeta.isSymbolicLink() ||
      journalMeta.nlink !== 1
    )
      fail("MIGRATION_PATH_INVALID");
    const [sql, journalText] = await Promise.all([
      fs.readFile(migration, "utf8"),
      fs.readFile(journal, "utf8"),
    ]);
    if (
      createHash("sha256").update(sql).digest("hex") !==
      pinned.sha256
    )
      fail("MIGRATION_BYTES_INVALID");
    const value: unknown = JSON.parse(journalText);
    if (typeof value !== "object" || value === null || Array.isArray(value))
      fail("MIGRATION_JOURNAL_INVALID");
    const record = value as Record<string, unknown>;
    if (
      record.version !== "7" ||
      record.dialect !== "mysql" ||
      !Array.isArray(record.entries)
    )
      fail("MIGRATION_JOURNAL_INVALID");
    const entries = record.entries.filter(
      entry =>
        typeof entry === "object" &&
        entry !== null &&
        !Array.isArray(entry) &&
        (entry as Record<string, unknown>).tag ===
          pinned.name
    );
    if (entries.length !== 1) fail("MIGRATION_JOURNAL_INVALID");
    const entry = entries[0] as Record<string, unknown>;
    if (
      entry.idx !== (pinned.name === BODY_CINEMA_PHASE_A_MIGRATION.name ? 19 : 20) ||
      entry.version !== "5" ||
      entry.when !== pinned.when ||
      entry.breakpoints !== true ||
      Object.keys(entry).sort().join(",") !== "breakpoints,idx,tag,version,when"
    )
      fail("MIGRATION_JOURNAL_INVALID");
    return sql;
  } catch (error: unknown) {
    if (error instanceof BodyCinemaPhaseAMigrationError) throw error;
    fail("MIGRATION_FILES_UNAVAILABLE");
  }
}

async function verifyLegacyMigrationsReadOnly(
  databaseUrl: string,
  root: string
): Promise<void> {
  try {
    const inspection = await inspectConsolidatedMigrations(databaseUrl, root);
    if (
      inspection.pending.length !== 0 ||
      inspection.alreadyApplied.length !== LEGACY_MIGRATIONS.length ||
      !LEGACY_MIGRATIONS.every(name => inspection.alreadyApplied.includes(name))
    )
      fail("EXISTING_SCHEMA_UNVERIFIED");
  } catch (error: unknown) {
    if (error instanceof BodyCinemaPhaseAMigrationError) throw error;
    fail("EXISTING_SCHEMA_UNVERIFIED");
  }
}

async function acquireLock(connection: Connection): Promise<void> {
  const rows = await queryRows(
    connection,
    "SELECT GET_LOCK(?, ?) AS acquired",
    [LOCK_NAME, LOCK_TIMEOUT_SECONDS]
  );
  if (rows.length !== 1 || integer(rows[0]!, "acquired") !== 1)
    fail("LOCK_UNAVAILABLE");
}

async function releaseLock(connection: Connection): Promise<void> {
  try {
    await connection.execute("SELECT RELEASE_LOCK(?)", [LOCK_NAME]);
  } catch {
    // Closing the connection releases the advisory lock; preserve the original fixed code.
  }
}

async function invokeBackup(
  callback: BodyCinemaPhaseAMigrationOptions["beforeFirstDdl"]
): Promise<void> {
  try {
    await callback();
  } catch (error: unknown) {
    if (error instanceof ReleaseFailure) throw error;
    fail("BACKUP_CALLBACK_FAILED");
  }
}

async function executePinnedDdl(
  connection: Connection,
  sql: string
): Promise<void> {
  try {
    // MySQL/MariaDB DDL implicitly commits. Do not wrap this in a pretend rollback transaction.
    await connection.query(sql);
  } catch {
    fail("MIGRATION_DDL_FAILED");
  }
}

async function recordVerifiedMigration(connection: Connection, migration: PinnedMigration = BODY_CINEMA_PHASE_A_MIGRATION): Promise<void> {
  try {
    await connection.execute(
      "INSERT INTO `__drizzle_migrations` (`hash`, `created_at`) VALUES (?, ?)",
      [migration.sha256, migration.when]
    );
  } catch {
    fail("MIGRATION_RECORD_FAILED");
  }
  if ((await recordState(connection, migration)) !== "recorded")
    fail("MIGRATION_RECORD_FAILED");
}

async function lifecycleRowsFingerprint(connection: Connection): Promise<string> {
  // Fetch binary server representations, not mysql2 date/JSON conversions. Null
  // and empty strings differ; every original column is length-framed and hashed.
  // Keyset batches bound memory; generated plan_scope is deliberately excluded.
  const hash = createHash("sha256");
  hash.update(JSON.stringify(LIFECYCLE_COLUMNS.map(column => column.name)));
  const projection = LIFECYCLE_COLUMNS.map(column =>
    `HEX(CAST(\`${column.name}\` AS BINARY)) AS \`${column.name}\``
  ).join(", ");
  let lastId: string | null = null;
  let count = 0;
  for (;;) {
    const rows = await queryRows(connection,
      `SELECT ${projection} FROM \`${LIFECYCLE_TABLE}\` ${lastId === null ? "" : "WHERE CAST(id AS BINARY) > UNHEX(?)"} ORDER BY CAST(id AS BINARY) LIMIT 32`,
      lastId === null ? [] : [lastId]);
    if (rows.length === 0) break;
    for (const row of rows) {
      hash.update("row:");
      for (const column of LIFECYCLE_COLUMNS) {
        const value = row[column.name];
        if (value === null) hash.update("N;");
        else if (typeof value === "string" && /^(?:[0-9A-F]{2})*$/.test(value))
          hash.update(`S${value.length}:${value};`);
        else fail("ROW_FINGERPRINT_INVALID");
      }
      const id = text(row, "id");
      if (id === null || (lastId !== null && id <= lastId))
        fail("ROW_FINGERPRINT_INVALID");
      lastId = id;
      count += 1;
      if (!Number.isSafeInteger(count)) fail("ROW_FINGERPRINT_INVALID");
    }
  }
  return `${SCOPE_PRESERVATION_PREFIX}${count}:${hash.digest("hex")}`;
}

async function scopePreservationIntent(connection: Connection): Promise<string | null> {
  const rows = await queryRows(connection,
    "SELECT hash FROM `__drizzle_migrations` WHERE created_at = ? OR hash LIKE ?",
    [SCOPE_PRESERVATION_WHEN, `${SCOPE_PRESERVATION_PREFIX}%`]);
  if (rows.length === 0) return null;
  const value = rows.length === 1 ? text(rows[0]!, "hash") : null;
  if (value === null || !/^body_cinema\.0027\.preservation\.v1:(?:0|[1-9][0-9]*):[a-f0-9]{64}$/.test(value))
    fail("PRESERVATION_METADATA_CONFLICT");
  // The prefix must occur only at the negative intent timestamp, never masquerade
  // as an applied migration or contaminate another migration's ledger slot.
  const exact = await queryRows(connection,
    "SELECT hash FROM `__drizzle_migrations` WHERE created_at = ? AND hash = ?",
    [SCOPE_PRESERVATION_WHEN, value]);
  if (exact.length !== 1) fail("PRESERVATION_METADATA_CONFLICT");
  return value;
}

async function recordScopePreservationIntent(connection: Connection, value: string): Promise<void> {
  try {
    await connection.execute(
      "INSERT INTO `__drizzle_migrations` (`hash`, `created_at`) VALUES (?, ?)",
      [value, SCOPE_PRESERVATION_WHEN]);
  } catch {
    fail("PRESERVATION_RECORD_FAILED");
  }
  if (await scopePreservationIntent(connection) !== value)
    fail("PRESERVATION_RECORD_FAILED");
}

async function applyPlanSourceScopeMigration(
  connection: Connection,
  sql: string,
  beforeFirstDdl: () => Promise<void>
): Promise<BodyCinemaPhaseAMigrationResult> {
  const metadata = await recordState(connection, BODY_CINEMA_PLAN_SOURCE_SCOPE_MIGRATION);
  const scoped = await lifecycleFingerprintMatches(connection, true);
  const intent = await scopePreservationIntent(connection);
  if (metadata === "recorded") {
    if (!scoped || intent === null) fail("RECORDED_SCOPE_SCHEMA_MISMATCH");
    // Historical rows may legitimately change after an applied release. Exact
    // byte preservation is checked across DDL/recovery, not across future use.
    return { applied: 0, alreadyApplied: 1, recoveredInterruptedDdl: false };
  }
  if (!scoped && !(await lifecycleFingerprintMatches(connection)))
    fail("SCOPE_SCHEMA_CONFLICT");
  if (scoped && intent === null) fail("UNTRACKED_SCOPE_SCHEMA_CONFLICT");
  // Never call the separate backup connection while holding table locks: the
  // protected dump would otherwise wait on this connection. No writes yet.
  if (!scoped) await beforeFirstDdl();
  let tablesLocked = false;
  try {
    try {
      await connection.query("SET SESSION lock_wait_timeout = 30");
      await connection.query("LOCK TABLES `body_cinema_candidate_lifecycles` WRITE, `__drizzle_migrations` WRITE");
      tablesLocked = true;
    } catch {
      fail("PRESERVATION_LOCK_UNAVAILABLE");
    }
    if (!(await lifecycleFingerprintMatches(connection, scoped)))
      fail("SCOPE_SCHEMA_CONFLICT");
    if ((await recordState(connection, BODY_CINEMA_PLAN_SOURCE_SCOPE_MIGRATION)) !== "pending")
      fail("MIGRATION_METADATA_CONFLICT");
    const before = await lifecycleRowsFingerprint(connection);
    if (intent !== null && before !== intent) fail("HISTORICAL_ROWS_CHANGED");
    if (scoped) {
      await recordVerifiedMigration(connection, BODY_CINEMA_PLAN_SOURCE_SCOPE_MIGRATION);
      return { applied: 0, alreadyApplied: 1, recoveredInterruptedDdl: true };
    }
    if (intent === null) await recordScopePreservationIntent(connection, before);
    await executePinnedDdl(connection, sql);
    if (!(await lifecycleFingerprintMatches(connection, true)))
      fail("POST_DDL_SCOPE_SCHEMA_MISMATCH");
    if ((await lifecycleRowsFingerprint(connection)) !== before)
      fail("HISTORICAL_ROWS_CHANGED");
    await recordVerifiedMigration(connection, BODY_CINEMA_PLAN_SOURCE_SCOPE_MIGRATION);
    return { applied: 1, alreadyApplied: 0, recoveredInterruptedDdl: intent !== null };
  } finally {
    if (tablesLocked) {
      await connection.query("UNLOCK TABLES").catch(() => undefined);
    }
  }
}

/**
 * Applies only pinned 0026 plus the specifically authorized 0027 scoped key.
 * Existing 0024/0025 proof remains read-only; exact historical schema checks,
 * backup callback, advisory lock and verified ledger writes remain enforced.
 * There is no generic SQL runner or pretend transaction rollback for MySQL DDL.
 */
export async function applyBodyCinemaPhaseAMigration(
  databaseUrl: string,
  root: string,
  options: BodyCinemaPhaseAMigrationOptions
): Promise<BodyCinemaPhaseAMigrationResult> {
  if (
    typeof databaseUrl !== "string" ||
    databaseUrl.trim().length === 0 ||
    typeof root !== "string" ||
    root.length === 0
  )
    fail("INVALID_ARGUMENT");
  const [sql, scopeSql] = await Promise.all([
    loadPinnedMigration(root, BODY_CINEMA_PHASE_A_MIGRATION),
    loadPinnedMigration(root, BODY_CINEMA_PLAN_SOURCE_SCOPE_MIGRATION),
  ]);
  const connection = await mysql
    .createConnection(databaseUrl)
    .catch(() => fail("CONNECTION_FAILED"));
  let locked = false;
  try {
    await acquireLock(connection);
    locked = true;
    await verifyLegacyMigrationsReadOnly(databaseUrl, root);
    if (!(await tableExists(connection, MIGRATION_TABLE)))
      fail("MIGRATION_LEDGER_MISSING");
    if (!(await canonicalMigrationTable(connection)))
      fail("MIGRATION_LEDGER_INVALID");
    if (!(await runtimeTablePrerequisitesMatch(connection)))
      fail("RUNTIME_SCHEMA_PREREQUISITES_INVALID");
    const metadata = await recordState(connection);
    const scopeMetadata = await recordState(connection, BODY_CINEMA_PLAN_SOURCE_SCOPE_MIGRATION);
    const tablePresent = await tableExists(connection, LIFECYCLE_TABLE);
    let applied = 0;
    let alreadyApplied = 0;
    let recoveredInterruptedDdl = false;
    let backupCalled = false;
    const beforeFirstDdl = async () => {
      if (!backupCalled) {
        await invokeBackup(options.beforeFirstDdl);
        backupCalled = true;
      }
    };
    if (metadata === "recorded") {
      if (!tablePresent || !(
        (await lifecycleFingerprintMatches(connection)) ||
        (await lifecycleFingerprintMatches(connection, true))
      ))
        fail("RECORDED_SCHEMA_MISMATCH");
      alreadyApplied += 1;
    } else if (tablePresent) {
      if (scopeMetadata !== "pending") fail("MIGRATION_METADATA_CONFLICT");
      if (
        !(await lifecycleFingerprintMatches(connection)) ||
        !(await lifecycleTableIsEmpty(connection))
      )
        fail("UNTRACKED_SCHEMA_CONFLICT");
      await recordVerifiedMigration(connection);
      alreadyApplied += 1;
      recoveredInterruptedDdl = true;
    } else {
      if (scopeMetadata !== "pending" || await scopePreservationIntent(connection) !== null)
        fail("MIGRATION_METADATA_CONFLICT");
      await beforeFirstDdl();
      await executePinnedDdl(connection, sql);
      if (!(await lifecycleFingerprintMatches(connection)))
        fail("POST_DDL_SCHEMA_MISMATCH");
      await recordVerifiedMigration(connection);
      applied += 1;
    }
    const scope = await applyPlanSourceScopeMigration(connection, scopeSql, beforeFirstDdl);
    return { applied: applied + scope.applied, alreadyApplied: alreadyApplied + scope.alreadyApplied,
      recoveredInterruptedDdl: recoveredInterruptedDdl || scope.recoveredInterruptedDdl };
  } catch (error: unknown) {
    if (
      error instanceof BodyCinemaPhaseAMigrationError ||
      error instanceof ReleaseFailure
    )
      throw error;
    fail("DATABASE_INSPECTION_FAILED");
  } finally {
    if (locked) await releaseLock(connection);
    await connection.end().catch(() => undefined);
  }
  fail("CONTROL_FLOW_INVALID");
}
