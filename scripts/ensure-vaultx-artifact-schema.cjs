require('dotenv').config();
const mysql = require('mysql2/promise');
async function main() {
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL missing');
  const c = await mysql.createConnection(process.env.DATABASE_URL);
  const exec = async (sql) => c.query(sql);
  await exec(`CREATE TABLE IF NOT EXISTS vaultx_artifacts (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    creator_id BIGINT NOT NULL,
    project_id BIGINT DEFAULT NULL,
    package_id BIGINT DEFAULT NULL,
    kind VARCHAR(32) NOT NULL,
    stage VARCHAR(96) NOT NULL,
    provider VARCHAR(64) DEFAULT NULL,
    provider_job_id VARCHAR(255) DEFAULT NULL,
    source_url TEXT DEFAULT NULL,
    output_url TEXT DEFAULT NULL,
    storage_key TEXT DEFAULT NULL,
    mime_type VARCHAR(128) DEFAULT NULL,
    byte_size BIGINT DEFAULT NULL,
    width INT DEFAULT NULL,
    height INT DEFAULT NULL,
    duration_seconds DECIMAL(10,3) DEFAULT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'queued',
    quality_score DECIMAL(5,2) DEFAULT NULL,
    failure_reason TEXT DEFAULT NULL,
    metadata JSON DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    ready_at TIMESTAMP NULL DEFAULT NULL,
    INDEX idx_vaultx_artifacts_creator_project (creator_id, project_id),
    INDEX idx_vaultx_artifacts_package (package_id),
    INDEX idx_vaultx_artifacts_status (status),
    INDEX idx_vaultx_artifacts_provider_job (provider, provider_job_id)
  )`);
  await exec(`CREATE TABLE IF NOT EXISTS vaultx_artifact_events (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    artifact_id BIGINT DEFAULT NULL,
    creator_id BIGINT NOT NULL,
    project_id BIGINT DEFAULT NULL,
    package_id BIGINT DEFAULT NULL,
    event_type VARCHAR(96) NOT NULL,
    status VARCHAR(32) DEFAULT NULL,
    message TEXT DEFAULT NULL,
    payload JSON DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_vaultx_artifact_events_artifact (artifact_id),
    INDEX idx_vaultx_artifact_events_project (creator_id, project_id)
  )`);
  const cols = [
    ['artifact_manifest', "JSON NULL"],
    ['readiness_state', "VARCHAR(48) NOT NULL DEFAULT 'needs_source'"],
    ['ready_artifact_id', 'BIGINT NULL'],
    ['export_artifact_id', 'BIGINT NULL'],
    ['readiness_error', 'TEXT NULL'],
  ];
  for (const [name, ddl] of cols) {
    const [rows] = await c.query(`SELECT COUNT(*) AS count FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'vaultx_editor_projects' AND column_name = ?`, [name]);
    if (Number(rows[0].count) === 0) await exec(`ALTER TABLE vaultx_editor_projects ADD COLUMN ${name} ${ddl}`);
  }
  const [tables] = await c.query("SELECT table_name FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name IN ('vaultx_artifacts','vaultx_artifact_events') ORDER BY table_name");
  const [projectCols] = await c.query("SELECT column_name FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name='vaultx_editor_projects' AND column_name IN ('artifact_manifest','readiness_state','ready_artifact_id','export_artifact_id','readiness_error') ORDER BY column_name");
  console.log(JSON.stringify({ tables: tables.map(r => r.TABLE_NAME || r.table_name), project_columns: projectCols.map(r => r.COLUMN_NAME || r.column_name) }, null, 2));
  await c.end();
}
main().catch(err => { console.error('SCHEMA_ERROR=' + err.message); process.exit(1); });
