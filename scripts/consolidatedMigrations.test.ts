import { promises as fs, lstatSync } from "node:fs";
import path from "node:path";
import { tmpdir } from "node:os";
import mysql from "mysql2/promise";
import type { RowDataPacket } from "mysql2/promise";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import {
  applyConsolidatedMigrations,
  inspectConsolidatedMigrations,
  supportedMySqlDialect,
} from "./consolidatedMigrations.js";

const TEST_DATABASE = "creatorvault_consolidation_migration_test";
const SOCKET_PATH = "/run/mysqld/mysqld.sock";
const repositoryRoot = path.resolve(import.meta.dirname, "..");

function localTestDatabaseUrl(): string | null {
  const candidate = process.env.CREATORVAULT_MIGRATION_TEST_DATABASE_URL;
  if (candidate === undefined) return null;
  try {
    const parsed = new URL(candidate);
    const socket = parsed.searchParams.get("socketPath");
    let socketAllowed = socket === SOCKET_PATH;
    if (socket && !socketAllowed && path.basename(socket) === "mysql.sock") {
      const directory = path.dirname(socket);
      if (
        directory.startsWith(path.join(tmpdir(), "creatorvault-regressions."))
      ) {
        const owner = lstatSync(directory);
        const endpoint = lstatSync(socket);
        socketAllowed =
          owner.isDirectory() &&
          !owner.isSymbolicLink() &&
          (owner.mode & 0o077) === 0 &&
          owner.uid === process.getuid?.() &&
          endpoint.isSocket() &&
          endpoint.uid === owner.uid;
      }
    }
    const hostIsLocal =
      parsed.hostname === "localhost" ||
      parsed.hostname === "127.0.0.1" ||
      parsed.hostname === "[::1]";
    if (
      parsed.protocol !== "mysql:" ||
      !hostIsLocal ||
      parsed.username !== "root" ||
      parsed.password !== "" ||
      decodeURIComponent(parsed.pathname) !== `/${TEST_DATABASE}` ||
      !socketAllowed
    )
      throw new Error("ISOLATED_MIGRATION_SOCKET_REQUIRED");
    return candidate;
  } catch {
    throw new Error("ISOLATED_MIGRATION_SOCKET_REQUIRED");
  }
}

const databaseUrl = localTestDatabaseUrl();
const describeLocal = databaseUrl === null ? describe.skip : describe;

function adminUrl(testUrl: string): string {
  const parsed = new URL(testUrl);
  parsed.pathname = "/mysql";
  return parsed.toString();
}

async function resetDisposableDatabase(): Promise<void> {
  if (databaseUrl === null)
    throw new Error("local integration URL is unavailable");
  const admin = await mysql.createConnection(adminUrl(databaseUrl));
  try {
    await admin.query(`CREATE DATABASE IF NOT EXISTS \`${TEST_DATABASE}\``);
  } finally {
    await admin.end();
  }
  const connection = await mysql.createConnection(databaseUrl);
  try {
    await connection.query("SET FOREIGN_KEY_CHECKS = 0");
    for (const table of [
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
    ]) {
      await connection.query(`DROP TABLE IF EXISTS \`${table}\``);
    }
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
  } finally {
    await connection.end();
  }
}

async function tablePresent(table: string): Promise<boolean> {
  if (databaseUrl === null)
    throw new Error("local integration URL is unavailable");
  const connection = await mysql.createConnection(databaseUrl);
  try {
    const [rows] = await connection.query<RowDataPacket[]>(
      "SELECT 1 AS present FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?",
      [table]
    );
    return rows.length === 1;
  } finally {
    await connection.end();
  }
}

async function errorCode(operation: () => Promise<unknown>): Promise<string> {
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
  throw new Error("expected a fixed-code migration failure");
}

describe("supportedMySqlDialect", () => {
  it("rejects a TiDB lookalike rather than treating it as MySQL", () => {
    expect(supportedMySqlDialect("5.7.25-TiDB-v7", "TiDB Server")).toBeNull();
    expect(supportedMySqlDialect("10.11.14-MariaDB", "Ubuntu")).toBe("mariadb");
  });
  it("recognizes the documented Ubuntu MySQL package signature only", () => {
    expect(supportedMySqlDialect("8.0.19-0ubuntu0.19.10.3", "(Ubuntu)")).toBe(
      "mysql"
    );
    expect(supportedMySqlDialect("8.0.43-0ubuntu0.24.04.2", "Ubuntu")).toBe(
      "mysql"
    );
    expect(
      supportedMySqlDialect("8.0.43", "Unknown Compatible Server")
    ).toBeNull();
    expect(
      supportedMySqlDialect("8.0.43-0ubuntu0.24.04.2-TiDB", "Ubuntu")
    ).toBeNull();
    expect(
      supportedMySqlDialect("8.0.43-0ubuntu0.24.04.2", "Vitess")
    ).toBeNull();
  });
});

describeLocal(
  "consolidated migration utility against the guarded local disposable MariaDB database",
  () => {
    beforeEach(async () => {
      await resetDisposableDatabase();
    });

    afterAll(async () => {
      if (databaseUrl === null) return;
      const admin = await mysql.createConnection(adminUrl(databaseUrl));
      try {
        await admin.query(`DROP DATABASE IF EXISTS \`${TEST_DATABASE}\``);
      } finally {
        await admin.end();
      }
    });

    it("applies only the pinned files after the backup callback and records each complete file", async () => {
      if (databaseUrl === null)
        throw new Error("local integration URL is unavailable");
      let backupCalls = 0;
      const events: { migration: string; statement: number; total: number }[] =
        [];
      const result = await applyConsolidatedMigrations(
        databaseUrl,
        repositoryRoot,
        {
          beforeApply: async () => {
            backupCalls += 1;
            expect(await tablePresent("__drizzle_migrations")).toBe(false);
            expect(await tablePresent("stripe_creator_payouts")).toBe(false);
          },
          onProgress: async event => {
            events.push(event);
          },
        }
      );
      expect(result).toEqual({
        applied: [
          "0024_stripe_creator_net_payouts",
          "0025_persona_vault_chained_continuity",
        ],
        alreadyApplied: [],
      });
      expect(backupCalls).toBe(1);
      expect(events).toHaveLength(16);
      expect(events.at(-1)).toEqual({
        migration: "0025_persona_vault_chained_continuity",
        statement: 4,
        total: 4,
      });
      const inspection = await inspectConsolidatedMigrations(
        databaseUrl,
        repositoryRoot
      );
      expect(inspection.pending).toEqual([]);
      expect(inspection.alreadyApplied).toEqual([
        "0024_stripe_creator_net_payouts",
        "0025_persona_vault_chained_continuity",
      ]);
    });

    it("is idempotent only after metadata and the exact schema both verify", async () => {
      if (databaseUrl === null)
        throw new Error("local integration URL is unavailable");
      await applyConsolidatedMigrations(databaseUrl, repositoryRoot);
      let backupCalls = 0;
      const second = await applyConsolidatedMigrations(
        databaseUrl,
        repositoryRoot,
        {
          beforeApply: async () => {
            backupCalls += 1;
          },
        }
      );
      expect(second).toEqual({
        applied: [],
        alreadyApplied: [
          "0024_stripe_creator_net_payouts",
          "0025_persona_vault_chained_continuity",
        ],
      });
      expect(backupCalls).toBe(0);
    });

    it("fails closed on an unrecorded partial state before invoking the backup callback", async () => {
      if (databaseUrl === null)
        throw new Error("local integration URL is unavailable");
      const connection = await mysql.createConnection(databaseUrl);
      try {
        await connection.query(
          "ALTER TABLE users ADD COLUMN stripe_connect_account_id varchar(255) NULL"
        );
      } finally {
        await connection.end();
      }
      let backupCalls = 0;
      const code = await errorCode(() =>
        applyConsolidatedMigrations(databaseUrl, repositoryRoot, {
          beforeApply: async () => {
            backupCalls += 1;
          },
        })
      );
      expect(code).toBe("MIGRATION_STATE_INVALID");
      expect(backupCalls).toBe(0);
    });

    it("fails baseline validation before any mutation when a required table is missing", async () => {
      if (databaseUrl === null)
        throw new Error("local integration URL is unavailable");
      const connection = await mysql.createConnection(databaseUrl);
      try {
        await connection.query("DROP TABLE live_stream_donations");
      } finally {
        await connection.end();
      }
      const code = await errorCode(() =>
        applyConsolidatedMigrations(databaseUrl, repositoryRoot)
      );
      expect(code).toBe("BASELINE_INVALID");
      expect(await tablePresent("stripe_creator_payouts")).toBe(false);
    });

    it("preflights read-only and rejects changed approved bytes without executing a migration", async () => {
      if (databaseUrl === null)
        throw new Error("local integration URL is unavailable");
      const initial = await inspectConsolidatedMigrations(
        databaseUrl,
        repositoryRoot
      );
      expect(initial.pending).toEqual([
        "0024_stripe_creator_net_payouts",
        "0025_persona_vault_chained_continuity",
      ]);
      expect(await tablePresent("__drizzle_migrations")).toBe(false);
      expect(await tablePresent("stripe_creator_payouts")).toBe(false);
      const temporaryRoot = await fs.mkdtemp(
        path.join(tmpdir(), "creatorvault-consolidated-migrations-")
      );
      try {
        await fs.mkdir(path.join(temporaryRoot, "drizzle/meta"), {
          recursive: true,
        });
        await fs.copyFile(
          path.join(repositoryRoot, "drizzle/meta/_journal.json"),
          path.join(temporaryRoot, "drizzle/meta/_journal.json")
        );
        await fs.copyFile(
          path.join(
            repositoryRoot,
            "drizzle/0024_stripe_creator_net_payouts.sql"
          ),
          path.join(
            temporaryRoot,
            "drizzle/0024_stripe_creator_net_payouts.sql"
          )
        );
        await fs.copyFile(
          path.join(
            repositoryRoot,
            "drizzle/0025_persona_vault_chained_continuity.sql"
          ),
          path.join(
            temporaryRoot,
            "drizzle/0025_persona_vault_chained_continuity.sql"
          )
        );
        await fs.appendFile(
          path.join(
            temporaryRoot,
            "drizzle/0024_stripe_creator_net_payouts.sql"
          ),
          " "
        );
        const code = await errorCode(() =>
          inspectConsolidatedMigrations(databaseUrl, temporaryRoot)
        );
        expect(code).toBe("MIGRATION_FILES_INVALID");
        expect(await tablePresent("stripe_creator_payouts")).toBe(false);
      } finally {
        await fs.rm(temporaryRoot, { recursive: true, force: true });
      }
    });
  }
);
