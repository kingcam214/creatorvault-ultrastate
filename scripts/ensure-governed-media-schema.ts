import dotenv from "dotenv";

dotenv.config();

const REQUIRED_TABLES = [
  "governed_media_jobs",
  "governed_media_approvals",
  "governed_media_budget_ledger",
  "governed_media_events",
] as const;

function redactSensitiveText(value: unknown): string {
  return String(value ?? "Unknown error")
    .replace(/(password|token|secret|api[_-]?key|database[_-]?url)\s*([=:])\s*([^\s,;]+)/gi, "$1$2[redacted]")
    .replace(/mysql:\/\/[^\s@]+@/gi, "mysql://[redacted]@")
    .slice(0, 1600);
}

async function main(): Promise<void> {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is required for governed media schema verification.");
  }

  // Import after dotenv has loaded so the governed service sees the production database configuration.
  const [{ ensureGovernedPolloSchema }, { db }] = await Promise.all([
    import("../server/services/governedPolloService"),
    import("../server/db"),
  ]);
  const client = (db as any).$client || (db as any).client;
  const pool = client && typeof client.promise === "function" ? client.promise() : client;

  if (!pool || typeof pool.query !== "function") {
    throw new Error("Governed media schema verifier could not access the configured MySQL connection pool.");
  }

  try {
    // This only performs idempotent schema DDL and information-schema inspection; it makes no provider request.
    await ensureGovernedPolloSchema();

    const placeholders = REQUIRED_TABLES.map(() => "?").join(", ");
    const [rows] = await pool.query(
      `SELECT table_name
         FROM information_schema.tables
        WHERE table_schema = DATABASE()
          AND table_name IN (${placeholders})
        ORDER BY table_name`,
      [...REQUIRED_TABLES],
    );

    const discovered = (rows as Array<{ TABLE_NAME?: string; table_name?: string }>)
      .map((row) => String(row.TABLE_NAME ?? row.table_name ?? ""))
      .filter(Boolean)
      .sort();
    const missing = REQUIRED_TABLES.filter((table) => !discovered.includes(table));

    if (missing.length > 0) {
      throw new Error(`Governed media schema verification failed; missing table(s): ${missing.join(", ")}`);
    }

    console.log(JSON.stringify({
      event: "governed_media_schema_verified",
      tables: discovered,
      tableCount: discovered.length,
    }));
  } finally {
    if (typeof pool.end === "function") {
      await pool.end();
    }
  }
}

main().catch((error) => {
  console.error(`GOVERNED_MEDIA_SCHEMA_VERIFY_FAILED=${redactSensitiveText(error instanceof Error ? error.message : error)}`);
  process.exitCode = 1;
});
