import { createHash } from "node:crypto";
import { lstatSync, promises as fs } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import mysql, { type RowDataPacket } from "mysql2/promise";
import { beforeEach, describe, expect, it } from "vitest";
import { applyConsolidatedMigrations } from "./consolidatedMigrations.js";
import {
  applyBodyCinemaPhaseAMigration,
  BODY_CINEMA_PLAN_SOURCE_SCOPE_MIGRATION,
  BODY_CINEMA_PLAN_SCOPE_EXPRESSION,
  BODY_CINEMA_PHASE_A_MIGRATION,
} from "./bodyCinemaPhaseAMigration.js";
import { BODY_CINEMA_BODY_DIRECTED_ASSERTION_VERSION } from "../shared/bodyCinemaCandidateLifecycle";

const TEST_DATABASE = "creatorvault_body_cinema_test";
const repositoryRoot = path.resolve(import.meta.dirname, "..");

function nativeFixtureDatabaseUrl(): string {
  const candidate = process.env.CREATORVAULT_BODY_CINEMA_TEST_DATABASE_URL;
  if (candidate === undefined)
    throw new Error("BODY_CINEMA_NATIVE_FIXTURE_REQUIRED");
  try {
    const parsed = new URL(candidate);
    const socket = parsed.searchParams.get("socketPath");
    const fixturePrefix = path.join(
      tmpdir(),
      "creatorvault-cv-video-026-phase-a-"
    );
    if (
      parsed.protocol !== "mysql:" ||
      !["localhost", "127.0.0.1", "[::1]"].includes(parsed.hostname) ||
      parsed.username !== "cv_phase_a" ||
      decodeURIComponent(parsed.pathname) !== `/${TEST_DATABASE}` ||
      socket === null ||
      !path.dirname(socket).startsWith(fixturePrefix)
    )
      throw new Error("BODY_CINEMA_NATIVE_FIXTURE_REQUIRED");
    const directory = lstatSync(path.dirname(socket));
    const endpoint = lstatSync(socket);
    if (
      !directory.isDirectory() ||
      directory.isSymbolicLink() ||
      (directory.mode & 0o077) !== 0 ||
      directory.uid !== process.getuid?.() ||
      !endpoint.isSocket() ||
      endpoint.uid !== directory.uid
    )
      throw new Error("BODY_CINEMA_NATIVE_FIXTURE_REQUIRED");
    return candidate;
  } catch {
    throw new Error("BODY_CINEMA_NATIVE_FIXTURE_REQUIRED");
  }
}

const databaseUrl = nativeFixtureDatabaseUrl();

async function resetDatabase(): Promise<void> {
  const connection = await mysql.createConnection(databaseUrl);
  try {
    await connection.query("SET FOREIGN_KEY_CHECKS = 0");
    for (const table of [
      "body_cinema_candidate_lifecycles",
      "video_chain_segments",
      "video_generation_chains",
      "persona_assets",
      "persona_vaults",
      "stripe_creator_payouts",
      "stripe_creator_payout_policy",
      "__drizzle_migrations",
      "live_stream_donations",
      "live_stream_tips",
      "transactions",
      "users",
      "trailer_projects",
      "media_assets",
      "creation_project_events",
      "creation_projects",
    ])
      await connection.query(`DROP TABLE IF EXISTS \`${table}\``);
    await connection.query("SET FOREIGN_KEY_CHECKS = 1");
    await connection.query(
      "CREATE TABLE users (id INT NOT NULL PRIMARY KEY) ENGINE=InnoDB"
    );
    await connection.query(
      "CREATE TABLE transactions (id INT NOT NULL PRIMARY KEY) ENGINE=InnoDB"
    );
    await connection.query(
      "CREATE TABLE live_stream_tips (id INT NOT NULL PRIMARY KEY) ENGINE=InnoDB"
    );
    await connection.query(
      "CREATE TABLE live_stream_donations (id INT NOT NULL PRIMARY KEY) ENGINE=InnoDB"
    );
    await connection.query(`CREATE TABLE creation_projects (
      id CHAR(36) NOT NULL PRIMARY KEY,
      creator_id BIGINT NOT NULL,
      title VARCHAR(191) NOT NULL,
      intent TEXT NOT NULL,
      output_purpose VARCHAR(191) NOT NULL,
      state VARCHAR(32) NOT NULL,
      source_media_asset_id VARCHAR(191) NULL,
      source_evidence_id VARCHAR(96) NULL,
      treatment_id VARCHAR(96) NULL,
      identity_reference VARCHAR(191) NULL,
      audio_asset_id VARCHAR(96) NULL,
      creation_director_request_id CHAR(36) NULL,
      render_job_id VARCHAR(96) NULL,
      accepted_media_asset_id VARCHAR(191) NULL,
      social_package_id CHAR(36) NULL,
      metadata_json LONGTEXT NULL,
      created_at DATETIME NOT NULL,
      updated_at DATETIME NOT NULL
    ) ENGINE=InnoDB`);
    await connection.query(`CREATE TABLE creation_project_events (
      id CHAR(36) NOT NULL PRIMARY KEY,
      project_id CHAR(36) NOT NULL,
      actor_id BIGINT NOT NULL,
      event_type VARCHAR(96) NOT NULL,
      detail_json LONGTEXT NULL,
      created_at DATETIME NOT NULL
    ) ENGINE=InnoDB`);
    await connection.query(`CREATE TABLE media_assets (
      id VARCHAR(191) NOT NULL PRIMARY KEY,
      user_id BIGINT NOT NULL,
      source_type VARCHAR(32) NULL,
      asset_type VARCHAR(32) NULL,
      file_name VARCHAR(255) NULL,
      original_name VARCHAR(255) NULL,
      mime_type VARCHAR(100) NULL,
      file_size BIGINT NULL,
      storage_path TEXT NULL,
      public_url TEXT NULL,
      thumbnail_url TEXT NULL,
      duration DECIMAL(12,3) NULL,
      width INT NULL,
      height INT NULL,
      status VARCHAR(32) NULL,
      created_by_feature VARCHAR(96) NULL
    ) ENGINE=InnoDB`);
    await connection.query(`CREATE TABLE trailer_projects (
      id CHAR(36) NOT NULL PRIMARY KEY,
      user_id BIGINT NOT NULL,
      project_name VARCHAR(200) NOT NULL,
      project_type VARCHAR(64) NOT NULL,
      title VARCHAR(300) NULL,
      concept TEXT NULL,
      script_text TEXT NULL,
      format VARCHAR(32) NULL,
      source_asset_id VARCHAR(191) NULL,
      scenes_json LONGTEXT NULL,
      hooks LONGTEXT NULL,
      hook_variants LONGTEXT NULL,
      status VARCHAR(32) NOT NULL,
      created_at DATETIME NULL,
      updated_at DATETIME NULL
    ) ENGINE=InnoDB`);
  } finally {
    await connection.end();
  }
}

async function bootstrapLegacyMigrations(): Promise<void> {
  const result = await applyConsolidatedMigrations(databaseUrl, repositoryRoot);
  expect(result.applied).toEqual([
    "0024_stripe_creator_net_payouts",
    "0025_persona_vault_chained_continuity",
  ]);
}

async function phaseASql(): Promise<string> {
  return fs.readFile(
    path.join(repositoryRoot, BODY_CINEMA_PHASE_A_MIGRATION.file),
    "utf8"
  );
}

async function phaseATablePresent(): Promise<boolean> {
  const connection = await mysql.createConnection(databaseUrl);
  try {
    const [rows] = await connection.execute<RowDataPacket[]>(
      "SELECT 1 AS present FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?",
      [BODY_CINEMA_PHASE_A_MIGRATION.table]
    );
    return rows.length === 1;
  } finally {
    await connection.end();
  }
}

async function ledgerRows(): Promise<{ hash: string; when: number }[]> {
  const connection = await mysql.createConnection(databaseUrl);
  try {
    const [rows] = await connection.execute<RowDataPacket[]>(
      "SELECT hash, created_at FROM `__drizzle_migrations` WHERE hash = ? OR created_at = ? ORDER BY id",
      [BODY_CINEMA_PHASE_A_MIGRATION.sha256, BODY_CINEMA_PHASE_A_MIGRATION.when]
    );
    return rows.map(row => ({
      hash: String(row.hash),
      when: Number(row.created_at),
    }));
  } finally {
    await connection.end();
  }
}

async function migrationErrorCode(
  operation: () => Promise<unknown>
): Promise<string> {
  try {
    await operation();
  } catch (error: unknown) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      typeof error.code === "string"
    )
      return error.code;
  }
  throw new Error("expected a fixed-code Phase A migration failure");
}

beforeEach(async () => {
  await resetDatabase();
});

describe("Body Cinema Phase A lifecycle migration", () => {
  it("pins the additive one-table SQL and the exact October 4, 2026 journal entry", async () => {
    const sql = await phaseASql();
    expect(createHash("sha256").update(sql).digest("hex")).toBe(
      BODY_CINEMA_PHASE_A_MIGRATION.sha256
    );
    expect(BODY_CINEMA_PHASE_A_MIGRATION.when).toBe(1791129600000);
    expect(new Date(BODY_CINEMA_PHASE_A_MIGRATION.when).toISOString()).toBe(
      "2026-10-04T16:00:00.000Z"
    );
    expect(sql).toContain(
      "CREATE TABLE IF NOT EXISTS `body_cinema_candidate_lifecycles`"
    );
    expect(sql.replace(/^\s*--.*$/gm, "")).not.toMatch(
      /\b(?:DROP|ALTER|DELETE)\b/i
    );
    const journal = JSON.parse(
      await fs.readFile(
        path.join(repositoryRoot, "drizzle/meta/_journal.json"),
        "utf8"
      )
    ) as { entries: unknown[] };
    expect(journal.entries).toContainEqual({
      idx: 19,
      version: "5",
      when: 1791129600000,
      tag: "0026_body_cinema_candidate_lifecycle",
      breakpoints: true,
    });
  });

  it("backs up once after read-only proof, creates one table, applies the pinned scope ALTER, and records each once", async () => {
    await bootstrapLegacyMigrations();
    let backupCalls = 0;
    const applied = await applyBodyCinemaPhaseAMigration(
      databaseUrl,
      repositoryRoot,
      {
        beforeFirstDdl: async () => {
          backupCalls += 1;
          expect(await phaseATablePresent()).toBe(false);
        },
      }
    );
    expect(applied).toEqual({
      applied: 2,
      alreadyApplied: 0,
      recoveredInterruptedDdl: false,
    });
    expect(backupCalls).toBe(1);
    expect(await phaseATablePresent()).toBe(true);
    expect(await ledgerRows()).toEqual([
      {
        hash: BODY_CINEMA_PHASE_A_MIGRATION.sha256,
        when: BODY_CINEMA_PHASE_A_MIGRATION.when,
      },
    ]);

    const repeat = await applyBodyCinemaPhaseAMigration(
      databaseUrl,
      repositoryRoot,
      {
        beforeFirstDdl: async () => {
          backupCalls += 1;
        },
      }
    );
    expect(repeat).toEqual({
      applied: 0,
      alreadyApplied: 2,
      recoveredInterruptedDdl: false,
    });
    expect(backupCalls).toBe(1);
  });

  it("recovers only an exact empty untracked 0026 table, then applies 0027 without replaying historical DDL", async () => {
    await bootstrapLegacyMigrations();
    const connection = await mysql.createConnection(databaseUrl);
    try {
      await connection.query(await phaseASql());
    } finally {
      await connection.end();
    }
    let backupCalls = 0;
    const result = await applyBodyCinemaPhaseAMigration(
      databaseUrl,
      repositoryRoot,
      {
        beforeFirstDdl: async () => {
          backupCalls += 1;
        },
      }
    );
    expect(result).toEqual({
      applied: 1,
      alreadyApplied: 1,
      recoveredInterruptedDdl: true,
    });
    expect(backupCalls).toBe(1);
    expect(await ledgerRows()).toEqual([
      {
        hash: BODY_CINEMA_PHASE_A_MIGRATION.sha256,
        when: BODY_CINEMA_PHASE_A_MIGRATION.when,
      },
    ]);
  });

  it("rejects non-empty untracked table state and partial tracking conflicts before a backup or write", async () => {
    await bootstrapLegacyMigrations();
    const connection = await mysql.createConnection(databaseUrl);
    try {
      await connection.query(await phaseASql());
      await connection.execute(
        "INSERT INTO `body_cinema_candidate_lifecycles` (`id`, `project_id`, `creator_id`, `source_asset_id`, `source_sha256`, `source_snapshot_json`, `rights_assertion_json`, `rights_assertion_hash`, `state`) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
        [
          "00000000-0000-4000-8000-000000000001",
          "00000000-0000-4000-8000-000000000002",
          1,
          "source-1",
          "a".repeat(64),
          JSON.stringify({ asset: "source-1" }),
          JSON.stringify({ version: "v1" }),
          "b".repeat(64),
          "awaiting_candidate",
        ]
      );
    } finally {
      await connection.end();
    }
    let backupCalls = 0;
    expect(
      await migrationErrorCode(() =>
        applyBodyCinemaPhaseAMigration(databaseUrl, repositoryRoot, {
          beforeFirstDdl: async () => {
            backupCalls += 1;
          },
        })
      )
    ).toBe("BODY_CINEMA_PHASE_A_UNTRACKED_SCHEMA_CONFLICT");
    expect(backupCalls).toBe(0);

    const metadata = await mysql.createConnection(databaseUrl);
    try {
      await metadata.execute(
        "INSERT INTO `__drizzle_migrations` (`hash`, `created_at`) VALUES (?, ?)",
        ["c".repeat(64), BODY_CINEMA_PHASE_A_MIGRATION.when]
      );
    } finally {
      await metadata.end();
    }
    expect(
      await migrationErrorCode(() =>
        applyBodyCinemaPhaseAMigration(databaseUrl, repositoryRoot, {
          beforeFirstDdl: async () => {
            backupCalls += 1;
          },
        })
      )
    ).toBe("BODY_CINEMA_PHASE_A_MIGRATION_METADATA_CONFLICT");
    expect(backupCalls).toBe(0);
  });

  it("does not run DDL if the required pre-DDL protected backup fails", async () => {
    await bootstrapLegacyMigrations();
    expect(
      await migrationErrorCode(() =>
        applyBodyCinemaPhaseAMigration(databaseUrl, repositoryRoot, {
          beforeFirstDdl: async () => {
            throw new Error("synthetic backup failure");
          },
        })
      )
    ).toBe("BODY_CINEMA_PHASE_A_BACKUP_CALLBACK_FAILED");
    expect(await phaseATablePresent()).toBe(false);
    expect(await ledgerRows()).toEqual([]);
  });
});

async function bootstrapRecordedPhaseA(): Promise<void> {
  await bootstrapLegacyMigrations();
  const connection = await mysql.createConnection(databaseUrl);
  try {
    await connection.query(await phaseASql());
    await connection.execute(
      "INSERT INTO `__drizzle_migrations` (`hash`, `created_at`) VALUES (?, ?)",
      [BODY_CINEMA_PHASE_A_MIGRATION.sha256, BODY_CINEMA_PHASE_A_MIGRATION.when]
    );
  } finally {
    await connection.end();
  }
}

function fixtureId(n: number): string {
  return `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
}

async function seedHistoricalRow(n: number, source: string, bodyDirected = false): Promise<void> {
  const connection = await mysql.createConnection(databaseUrl);
  const record = '{ "receipt" : "original ≥ café", "nested" : [1, null, ""] }';
  try {
    await connection.execute(
      `INSERT INTO body_cinema_candidate_lifecycles
       (id,project_id,creator_id,source_asset_id,source_sha256,source_snapshot_json,
        rights_assertion_json,rights_assertion_hash,treatment_version,treatment_json,
        treatment_hash,state,candidate_asset_id,candidate_sha256,candidate_snapshot_json,
        candidate_provenance_json,attachment_authorization_json,review_id,review_json,
        decision_json,handoff_json,created_at,updated_at)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [fixtureId(n), fixtureId(n + 1000), 17, source, "a".repeat(64), record,
        JSON.stringify({ version: bodyDirected ? BODY_CINEMA_BODY_DIRECTED_ASSERTION_VERSION : "body_cinema.creator_assertion.v1", marker: "original declaration" }),
        "b".repeat(64), "original.frozen.v1", record, "c".repeat(64), bodyDirected ? "frozen" : "accepted",
        `original-candidate-${n}`, "d".repeat(64), record, record, record,
        fixtureId(n + 2000), record, record, record, "2026-08-01 12:34:56.123", "2026-08-02 01:23:45.987"]
    );
  } finally {
    await connection.end();
  }
}

async function historicalBytes(): Promise<RowDataPacket[]> {
  const connection = await mysql.createConnection(databaseUrl);
  try {
    const [columns] = await connection.query<RowDataPacket[]>(
      "SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='body_cinema_candidate_lifecycles' AND COLUMN_NAME <> 'plan_scope' ORDER BY ORDINAL_POSITION"
    );
    const projection = columns.map(column => {
      const name = String(column.COLUMN_NAME);
      if (!/^[a-z][a-z0-9_]*$/.test(name)) throw new Error("INVALID_FIXTURE_COLUMN");
      return `HEX(CAST(\`${name}\` AS BINARY)) AS \`${name}\``;
    }).join(",");
    const [rows] = await connection.query<RowDataPacket[]>(
      `SELECT ${projection} FROM body_cinema_candidate_lifecycles ORDER BY CAST(id AS BINARY)`
    );
    return rows;
  } finally {
    await connection.end();
  }
}

async function scopeLedgerRows(): Promise<RowDataPacket[]> {
  const connection = await mysql.createConnection(databaseUrl);
  try {
    const [rows] = await connection.execute<RowDataPacket[]>(
      "SELECT hash, created_at FROM __drizzle_migrations WHERE created_at IN (?, ?) ORDER BY created_at",
      [-BODY_CINEMA_PLAN_SOURCE_SCOPE_MIGRATION.when, BODY_CINEMA_PLAN_SOURCE_SCOPE_MIGRATION.when]
    );
    return rows;
  } finally {
    await connection.end();
  }
}

async function simulateInterruptedScopeLedgerWrite(): Promise<void> {
  const connection = await mysql.createConnection(databaseUrl);
  try {
    // Disposable fixture only: retain the pre-DDL intent and exact post-DDL state,
    // but remove the completion marker to model an interruption before its INSERT.
    await connection.execute("DELETE FROM __drizzle_migrations WHERE hash=? AND created_at=?",
      [BODY_CINEMA_PLAN_SOURCE_SCOPE_MIGRATION.sha256, BODY_CINEMA_PLAN_SOURCE_SCOPE_MIGRATION.when]);
  } finally {
    await connection.end();
  }
}

describe("Body Cinema authorized 0027 plan-source scope migration", () => {
  it("pins exactly one atomic ALTER and the actual version constant while keeping 0026 byte-exact", async () => {
    const sql = await fs.readFile(path.join(repositoryRoot, BODY_CINEMA_PLAN_SOURCE_SCOPE_MIGRATION.file), "utf8");
    expect(createHash("sha256").update(sql).digest("hex")).toBe(BODY_CINEMA_PLAN_SOURCE_SCOPE_MIGRATION.sha256);
    expect(createHash("sha256").update(await phaseASql()).digest("hex")).toBe("eca944dab81280ebbdd80af255007e9bc0afc20cab3f50d52de6e30d94a4e86d");
    expect(BODY_CINEMA_PLAN_SCOPE_EXPRESSION).toContain(`'${BODY_CINEMA_BODY_DIRECTED_ASSERTION_VERSION}'`);
    const ddl = sql.replace(/^\s*--.*$/gm, "");
    expect(ddl.match(/\bALTER\s+TABLE\b/gi)).toHaveLength(1);
    expect(ddl.match(/;/g)).toHaveLength(1);
    expect(ddl).not.toMatch(/\b(?:UPDATE|INSERT|DELETE|TRUNCATE|REPLACE)\b/i);
    expect(ddl).toContain("DROP INDEX `body_cinema_lifecycle_creator_source_unique`");
    expect(ddl).toContain("ADD UNIQUE KEY `body_cinema_lifecycle_creator_source_scope_unique`");
    expect(ddl).toContain("VIRTUAL");
    const journal = JSON.parse(await fs.readFile(path.join(repositoryRoot, "drizzle/meta/_journal.json"), "utf8")) as { entries: unknown[] };
    expect(journal.entries).toContainEqual({idx: 20, version: "5", when: BODY_CINEMA_PLAN_SOURCE_SCOPE_MIGRATION.when,
      tag: BODY_CINEMA_PLAN_SOURCE_SCOPE_MIGRATION.name, breakpoints: true});
  });

  it("preserves every original field, raw JSON, receipt, hash and millisecond timestamp across ALTER and rerun", async () => {
    await bootstrapRecordedPhaseA();
    // More than one fingerprint batch and both assertion generations.
    for (let n = 1; n <= 35; n += 1) await seedHistoricalRow(n, `source-${n}`, n === 35);
    const before = await historicalBytes();
    let backups = 0;
    const first = await applyBodyCinemaPhaseAMigration(databaseUrl, repositoryRoot, {
      beforeFirstDdl: async () => {
        backups += 1;
        expect(await historicalBytes()).toEqual(before);
        expect(await scopeLedgerRows()).toEqual([]);
      },
    });
    expect(first).toEqual({ applied: 1, alreadyApplied: 1, recoveredInterruptedDdl: false });
    expect(await historicalBytes()).toEqual(before);
    const ledger = await scopeLedgerRows();
    expect(ledger).toHaveLength(2);
    expect(ledger[0]!.hash).toMatch(/^body_cinema\.0027\.preservation\.v1:35:[a-f0-9]{64}$/);
    expect(ledger[1]!.hash).toBe(BODY_CINEMA_PLAN_SOURCE_SCOPE_MIGRATION.sha256);
    const rerun = await applyBodyCinemaPhaseAMigration(databaseUrl, repositoryRoot, {
      beforeFirstDdl: async () => { backups += 1; },
    });
    expect(rerun).toEqual({ applied: 0, alreadyApplied: 2, recoveredInterruptedDdl: false });
    expect(backups).toBe(1);
    expect(await historicalBytes()).toEqual(before);
    expect(await scopeLedgerRows()).toEqual(ledger);
  });

  it("retains one legacy source row but allows two frozen Body Directed rows on that exact creator/source", async () => {
    await bootstrapRecordedPhaseA();
    await seedHistoricalRow(1, "same-source");
    await applyBodyCinemaPhaseAMigration(databaseUrl, repositoryRoot, {beforeFirstDdl: async () => undefined});
    await expect(seedHistoricalRow(2, "same-source")).rejects.toMatchObject({code: "ER_DUP_ENTRY"});
    await seedHistoricalRow(3, "same-source", true);
    await seedHistoricalRow(4, "same-source", true);
    const connection = await mysql.createConnection(databaseUrl);
    try {
      const [rows] = await connection.query<RowDataPacket[]>("SELECT id,plan_scope,state FROM body_cinema_candidate_lifecycles ORDER BY id");
      expect(rows.map(row => [row.id, row.plan_scope, row.state])).toEqual([
        [fixtureId(1), "", "accepted"], [fixtureId(3), fixtureId(3), "frozen"], [fixtureId(4), fixtureId(4), "frozen"]
      ]);
      // No client can forge a generated scope to evade singleton enforcement.
      await expect(connection.query("UPDATE body_cinema_candidate_lifecycles SET plan_scope='forged' WHERE id=?", [fixtureId(1)])).rejects.toBeDefined();
    } finally { await connection.end(); }
  });

  it("recovers exact post-ALTER state only with its matching durable pre-DDL preservation intent", async () => {
    await bootstrapRecordedPhaseA();
    await seedHistoricalRow(1, "original");
    const before = await historicalBytes();
    await applyBodyCinemaPhaseAMigration(databaseUrl, repositoryRoot, {beforeFirstDdl: async () => undefined});
    await simulateInterruptedScopeLedgerWrite();
    let backups = 0;
    const recovered = await applyBodyCinemaPhaseAMigration(databaseUrl, repositoryRoot, {beforeFirstDdl: async () => {backups += 1;}});
    expect(recovered).toEqual({applied: 0, alreadyApplied: 2, recoveredInterruptedDdl: true});
    expect(backups).toBe(0);
    expect(await historicalBytes()).toEqual(before);
    expect(await scopeLedgerRows()).toHaveLength(2);
  });

  it("rejects a changed historical field after interruption rather than blessing drift or replaying DDL", async () => {
    await bootstrapRecordedPhaseA();
    await seedHistoricalRow(1, "original");
    await applyBodyCinemaPhaseAMigration(databaseUrl, repositoryRoot, {beforeFirstDdl: async () => undefined});
    await simulateInterruptedScopeLedgerWrite();
    const connection = await mysql.createConnection(databaseUrl);
    try { await connection.query("UPDATE body_cinema_candidate_lifecycles SET handoff_json='{\"changed\":true}' WHERE id=?", [fixtureId(1)]); }
    finally { await connection.end(); }
    let backups = 0;
    expect(await migrationErrorCode(() => applyBodyCinemaPhaseAMigration(databaseUrl, repositoryRoot,
      {beforeFirstDdl: async () => {backups += 1;}}))).toBe("BODY_CINEMA_PHASE_A_HISTORICAL_ROWS_CHANGED");
    expect(backups).toBe(0);
    expect(await scopeLedgerRows()).toHaveLength(1);
  });

  it("rejects an exact but untracked ALTER without preservation proof", async () => {
    await bootstrapRecordedPhaseA();
    await seedHistoricalRow(1, "original");
    const connection = await mysql.createConnection(databaseUrl);
    try { await connection.query(await fs.readFile(path.join(repositoryRoot, BODY_CINEMA_PLAN_SOURCE_SCOPE_MIGRATION.file), "utf8")); }
    finally { await connection.end(); }
    let backups = 0;
    expect(await migrationErrorCode(() => applyBodyCinemaPhaseAMigration(databaseUrl, repositoryRoot,
      {beforeFirstDdl: async () => {backups += 1;}}))).toBe("BODY_CINEMA_PHASE_A_UNTRACKED_SCOPE_SCHEMA_CONFLICT");
    expect(backups).toBe(0);
    expect(await scopeLedgerRows()).toEqual([]);
  });

  it("rejects a forged generated expression and recorded-but-missing unique index before any backup", async () => {
    await bootstrapRecordedPhaseA();
    await applyBodyCinemaPhaseAMigration(databaseUrl, repositoryRoot, {beforeFirstDdl: async () => undefined});
    const connection = await mysql.createConnection(databaseUrl);
    try {
      await connection.query("ALTER TABLE body_cinema_candidate_lifecycles DROP INDEX body_cinema_lifecycle_creator_source_scope_unique, MODIFY COLUMN plan_scope varchar(36) GENERATED ALWAYS AS (RTRIM(id)) VIRTUAL, ADD UNIQUE KEY body_cinema_lifecycle_creator_source_scope_unique(creator_id,source_asset_id,plan_scope)");
    } finally { await connection.end(); }
    let backups = 0;
    expect(await migrationErrorCode(() => applyBodyCinemaPhaseAMigration(databaseUrl, repositoryRoot,
      {beforeFirstDdl: async () => {backups += 1;}}))).toBe("BODY_CINEMA_PHASE_A_RECORDED_SCHEMA_MISMATCH");
    expect(backups).toBe(0);
  });

  it("keeps old exact-schema checks fail-closed when an unrelated column/index drifts", async () => {
    await bootstrapRecordedPhaseA();
    const connection = await mysql.createConnection(databaseUrl);
    try { await connection.query("ALTER TABLE body_cinema_candidate_lifecycles ADD COLUMN unrelated_drift int NULL"); }
    finally { await connection.end(); }
    let backups = 0;
    expect(await migrationErrorCode(() => applyBodyCinemaPhaseAMigration(databaseUrl, repositoryRoot,
      {beforeFirstDdl: async () => {backups += 1;}}))).toBe("BODY_CINEMA_PHASE_A_RECORDED_SCHEMA_MISMATCH");
    expect(backups).toBe(0);
    expect(await scopeLedgerRows()).toEqual([]);
  });

  it("serializes simultaneous migration attempts and calls the required backup once", async () => {
    await bootstrapRecordedPhaseA();
    await seedHistoricalRow(1, "original");
    let backups = 0;
    const operation = () => applyBodyCinemaPhaseAMigration(databaseUrl, repositoryRoot,
      {beforeFirstDdl: async () => { backups += 1; }});
    const results = await Promise.all([operation(), operation()]);
    expect(results.map(result => result.applied).sort()).toEqual([0, 1]);
    expect(backups).toBe(1);
    expect(await scopeLedgerRows()).toHaveLength(2);
  });
});

describe("Body Cinema native interrupted scope completion boundary", () => {
  it("retains preservation proof after a real post-ALTER ledger INSERT failure and recovers without DDL or backup replay", async () => {
    await bootstrapRecordedPhaseA();
    await seedHistoricalRow(1, "original-receipted-source");
    const before = await historicalBytes();
    const connection = await mysql.createConnection(databaseUrl);
    try {
      // Test-only trigger on the disposable ledger; the intent INSERT still
      // succeeds, but the exact final completion INSERT is interrupted.
      await connection.query(`CREATE TRIGGER test_only_interrupt_0027 BEFORE INSERT ON __drizzle_migrations
        FOR EACH ROW BEGIN
          IF NEW.hash = '${BODY_CINEMA_PLAN_SOURCE_SCOPE_MIGRATION.sha256}' THEN
            SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'TEST_ONLY_0027_COMPLETION_INTERRUPTION';
          END IF;
        END`);
    } finally { await connection.end(); }
    let backups = 0;
    expect(await migrationErrorCode(() => applyBodyCinemaPhaseAMigration(databaseUrl, repositoryRoot,
      {beforeFirstDdl: async () => {backups += 1;}}))).toBe("BODY_CINEMA_PHASE_A_MIGRATION_RECORD_FAILED");
    expect(backups).toBe(1);
    expect(await historicalBytes()).toEqual(before);
    expect(await scopeLedgerRows()).toHaveLength(1);
    const cleanup = await mysql.createConnection(databaseUrl);
    try { await cleanup.query("DROP TRIGGER test_only_interrupt_0027"); }
    finally { await cleanup.end(); }
    const recovered = await applyBodyCinemaPhaseAMigration(databaseUrl, repositoryRoot,
      {beforeFirstDdl: async () => {backups += 1;}});
    expect(recovered).toEqual({applied: 0, alreadyApplied: 2, recoveredInterruptedDdl: true});
    expect(backups).toBe(1);
    expect(await historicalBytes()).toEqual(before);
    expect(await scopeLedgerRows()).toHaveLength(2);
  });
});
