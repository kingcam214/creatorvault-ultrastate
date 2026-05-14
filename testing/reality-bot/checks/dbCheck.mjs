import { loadDotEnvReadOnly, nowIso, redactConnectionString } from './utils.mjs';

export async function dbCheck() {
  const dotenv = await loadDotEnvReadOnly('.env');
  const warnings = [];
  const url = process.env.DATABASE_URL;
  if (!url) {
    return {
      check: 'database',
      status: 'warn',
      ok: false,
      generatedAt: nowIso(),
      dotenv,
      connection: { hasDatabaseUrl: false },
      warnings: ['DATABASE_URL is not set'],
    };
  }

  let connection;
  try {
    const mysql = await import('mysql2/promise');
    connection = await mysql.createConnection(url);
    const [versionRows] = await connection.query('SELECT VERSION() AS version, DATABASE() AS database_name, @@hostname AS db_hostname, @@read_only AS read_only');
    const databaseName = versionRows?.[0]?.database_name || null;
    const [tableRows] = await connection.query('SELECT COUNT(*) AS table_count FROM information_schema.tables WHERE table_schema = DATABASE()');
    const [sampleTables] = await connection.query('SELECT table_name FROM information_schema.tables WHERE table_schema = DATABASE() ORDER BY table_name LIMIT 30');
    await connection.end();
    return {
      check: 'database',
      status: warnings.length ? 'warn' : 'pass',
      ok: true,
      generatedAt: nowIso(),
      dotenv,
      connection: {
        hasDatabaseUrl: true,
        redactedDatabaseUrl: redactConnectionString(url),
        databaseName,
      },
      version: versionRows?.[0] || null,
      schema: {
        tableCount: Number(tableRows?.[0]?.table_count || 0),
        sampleTables: sampleTables.map((row) => row.table_name),
      },
      readOnlyProof: 'Executed SELECT-only metadata queries against information_schema and server variables.',
      warnings,
    };
  } catch (error) {
    try { if (connection) await connection.end(); } catch {}
    return {
      check: 'database',
      status: 'fail',
      ok: false,
      generatedAt: nowIso(),
      dotenv,
      connection: { hasDatabaseUrl: true, redactedDatabaseUrl: redactConnectionString(url) },
      error: String(error?.message || error),
      warnings: ['Database connectivity check failed'],
    };
  }
}
