import { createHash } from "node:crypto";
import { lstatSync, promises as fs } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import mysql, { type RowDataPacket } from "mysql2/promise";
import { beforeEach, describe, expect, it } from "vitest";
import { applyConsolidatedMigrations } from "./consolidatedMigrations.js";
import {
  applyBodyCinemaPhaseAMigration,
  BODY_CINEMA_PHASE_A_MIGRATION,
} from "./bodyCinemaPhaseAMigration.js";

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

  it("backs up after read-only legacy proof, creates exactly one table, fingerprints it, and records once", async () => {
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
      applied: 1,
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
      alreadyApplied: 1,
      recoveredInterruptedDdl: false,
    });
    expect(backupCalls).toBe(1);
  });

  it("recovers only an exact empty untracked table and never replays DDL", async () => {
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
      applied: 0,
      alreadyApplied: 1,
      recoveredInterruptedDdl: true,
    });
    expect(backupCalls).toBe(0);
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
