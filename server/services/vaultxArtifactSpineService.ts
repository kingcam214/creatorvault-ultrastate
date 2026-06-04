import path from "path";
import { randomUUID } from "crypto";
import { execFile } from "child_process";
import { promisify } from "util";
import { db } from "../db";
import { sql } from "drizzle-orm";
import { storagePut } from "../storage";

const execFileAsync = promisify(execFile);

type ArtifactKind = "source" | "photo" | "video" | "audio" | "thumbnail" | "export" | "package" | "publish";
type ArtifactStatus = "queued" | "processing" | "ready" | "failed" | "blocked";
type ReadinessState = "needs_source" | "processing" | "ready_for_export" | "export_ready" | "published" | "failed" | "blocked";

type ProviderName = "replicate" | "pollo";

export interface VaultxArtifactRecord {
  id: number;
  creator_id: number;
  project_id: number | null;
  package_id: number | null;
  kind: ArtifactKind;
  stage: string;
  provider: string | null;
  provider_job_id: string | null;
  source_url: string | null;
  output_url: string | null;
  storage_key: string | null;
  mime_type: string | null;
  byte_size: number | null;
  width: number | null;
  height: number | null;
  duration_seconds: number | null;
  status: ArtifactStatus;
  quality_score: number | null;
  failure_reason: string | null;
  metadata: any;
  created_at: string;
  updated_at: string;
  ready_at: string | null;
}

export interface CreateArtifactInput {
  creatorId: number;
  projectId?: number | null;
  packageId?: number | null;
  kind: ArtifactKind;
  stage: string;
  provider?: string | null;
  providerJobId?: string | null;
  sourceUrl?: string | null;
  outputUrl?: string | null;
  status?: ArtifactStatus;
  metadata?: any;
}

export interface ReadyArtifactInput extends CreateArtifactInput {
  finalUrl: string;
  expectedMimePrefix?: "image/" | "video/" | "audio/";
  qualityScore?: number;
}

export class VaultxArtifactNotReadyError extends Error {
  constructor(message: string, public details: any = {}) {
    super(message);
    this.name = "VaultxArtifactNotReadyError";
  }
}

async function rawQuery(query: string, params: any[] = []): Promise<any[]> {
  const pool = (db as any).$client || (db as any).client;
  if (pool && typeof pool.promise === "function") {
    const [rows] = await pool.promise().query(query, params);
    return rows as any[];
  }
  if (pool && typeof pool.execute === "function") {
    const [rows] = await pool.execute(query, params);
    return rows as any[];
  }
  const values = [...params];
  const escaped = query.replace(/\?/g, () => {
    const value = values.shift();
    if (value === null || value === undefined) return "NULL";
    if (typeof value === "number") return String(value);
    return `'${String(value).replace(/'/g, "''")}'`;
  });
  const result = await (db as any).execute(sql.raw(escaped));
  return (result as any).rows || result;
}

async function rawExec(query: string, params: any[] = []): Promise<any> {
  const pool = (db as any).$client || (db as any).client;
  if (pool && typeof pool.promise === "function") {
    const [result] = await pool.promise().query(query, params);
    return result;
  }
  if (pool && typeof pool.execute === "function") {
    const [result] = await pool.execute(query, params);
    return result;
  }
  const values = [...params];
  const escaped = query.replace(/\?/g, () => {
    const value = values.shift();
    if (value === null || value === undefined) return "NULL";
    if (typeof value === "number") return String(value);
    return `'${String(value).replace(/'/g, "''")}'`;
  });
  await (db as any).execute(sql.raw(escaped));
}

function jsonSafe(value: any): string {
  try {
    return JSON.stringify(value ?? {});
  } catch {
    return JSON.stringify({ serialization_error: true });
  }
}

function safeParseJson(value: any): any {
  if (!value) return {};
  if (typeof value === "object") return value;
  try { return JSON.parse(String(value)); } catch { return {}; }
}

function normalizeMime(contentType: string | null, fallback: string): string {
  const normalized = String(contentType || "").split(";")[0].trim().toLowerCase();
  return normalized || fallback;
}

function extForMime(mimeType: string): string {
  if (mimeType.includes("png")) return "png";
  if (mimeType.includes("webp")) return "webp";
  if (mimeType.includes("jpeg") || mimeType.includes("jpg")) return "jpg";
  if (mimeType.includes("mpeg") || mimeType.includes("mp3")) return "mp3";
  if (mimeType.includes("wav")) return "wav";
  if (mimeType.includes("quicktime")) return "mov";
  if (mimeType.includes("mp4")) return "mp4";
  return "bin";
}

function expectedMimeForKind(kind: ArtifactKind): "image/" | "video/" | "audio/" | undefined {
  if (kind === "photo" || kind === "thumbnail") return "image/";
  if (kind === "video" || kind === "export" || kind === "package") return "video/";
  if (kind === "audio") return "audio/";
  return undefined;
}

async function fetchMediaBuffer(url: string): Promise<{ buffer: Buffer; mimeType: string; byteSize: number; }> {
  const response = await fetch(url, { headers: { "User-Agent": "CreatorVault-VaultX-Artifact-Spine/1.0" } });
  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(`Media fetch failed (${response.status} ${response.statusText}) for ${url}: ${body.slice(0, 240)}`);
  }
  const contentType = normalizeMime(response.headers.get("content-type"), "application/octet-stream");
  const buffer = Buffer.from(await response.arrayBuffer());
  if (buffer.length < 512) throw new Error(`Media payload too small (${buffer.length} bytes) for ${url}`);
  return { buffer, mimeType: contentType, byteSize: buffer.length };
}

async function probeStoredBuffer(buffer: Buffer, mimeType: string, ext: string): Promise<{ width?: number; height?: number; durationSeconds?: number; }> {
  if (!mimeType.startsWith("video/") && !mimeType.startsWith("audio/")) return {};
  const tmpPath = path.join("/tmp", `vaultx-probe-${Date.now()}-${randomUUID()}.${ext}`);
  const fs = await import("fs/promises");
  try {
    await fs.writeFile(tmpPath, buffer);
    const { stdout } = await execFileAsync("ffprobe", ["-v", "quiet", "-print_format", "json", "-show_streams", "-show_format", tmpPath]);
    const probe = JSON.parse(stdout || "{}");
    const videoStream = probe.streams?.find((s: any) => s.codec_type === "video");
    const duration = Number.parseFloat(probe.format?.duration || videoStream?.duration || "0");
    return {
      width: videoStream?.width ? Number(videoStream.width) : undefined,
      height: videoStream?.height ? Number(videoStream.height) : undefined,
      durationSeconds: Number.isFinite(duration) && duration > 0 ? duration : undefined,
    };
  } catch {
    return { durationSeconds: undefined, width: undefined, height: undefined };
  } finally {
    await fs.unlink(tmpPath).catch(() => undefined);
  }
}

export async function ensureVaultxArtifactSchema(): Promise<void> {
  await rawExec(`CREATE TABLE IF NOT EXISTS vaultx_artifacts (
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

  await rawExec(`CREATE TABLE IF NOT EXISTS vaultx_artifact_events (
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

  const alterStatements = [
    "ALTER TABLE vaultx_editor_projects ADD COLUMN IF NOT EXISTS artifact_manifest JSON NULL",
    "ALTER TABLE vaultx_editor_projects ADD COLUMN IF NOT EXISTS readiness_state VARCHAR(48) NOT NULL DEFAULT 'needs_source'",
    "ALTER TABLE vaultx_editor_projects ADD COLUMN IF NOT EXISTS ready_artifact_id BIGINT NULL",
    "ALTER TABLE vaultx_editor_projects ADD COLUMN IF NOT EXISTS export_artifact_id BIGINT NULL",
    "ALTER TABLE vaultx_editor_projects ADD COLUMN IF NOT EXISTS readiness_error TEXT NULL",
  ];
  for (const statement of alterStatements) {
    try {
      await rawExec(statement);
    } catch (err: any) {
      if (!String(err?.message || err).toLowerCase().includes("duplicate")) {
        console.warn("[VaultXArtifactSpine] schema alter skipped:", statement, err?.message || err);
      }
    }
  }
}

export async function recordVaultxArtifactEvent(input: {
  artifactId?: number | null;
  creatorId: number;
  projectId?: number | null;
  packageId?: number | null;
  eventType: string;
  status?: ArtifactStatus | string | null;
  message?: string | null;
  payload?: any;
}): Promise<void> {
  await ensureVaultxArtifactSchema();
  await rawExec(
    `INSERT INTO vaultx_artifact_events (artifact_id, creator_id, project_id, package_id, event_type, status, message, payload)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [input.artifactId ?? null, input.creatorId, input.projectId ?? null, input.packageId ?? null, input.eventType, input.status ?? null, input.message ?? null, jsonSafe(input.payload ?? {})]
  );
}

export async function createVaultxArtifact(input: CreateArtifactInput): Promise<VaultxArtifactRecord> {
  await ensureVaultxArtifactSchema();
  const result: any = await rawExec(
    `INSERT INTO vaultx_artifacts
     (creator_id, project_id, package_id, kind, stage, provider, provider_job_id, source_url, output_url, status, metadata)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [input.creatorId, input.projectId ?? null, input.packageId ?? null, input.kind, input.stage, input.provider ?? null, input.providerJobId ?? null, input.sourceUrl ?? null, input.outputUrl ?? null, input.status ?? "queued", jsonSafe(input.metadata ?? {})]
  );
  const id = Number(result?.insertId || 0);
  await recordVaultxArtifactEvent({ artifactId: id || null, creatorId: input.creatorId, projectId: input.projectId ?? null, packageId: input.packageId ?? null, eventType: `${input.stage}.created`, status: input.status ?? "queued", payload: input.metadata ?? {} });
  const rows = await rawQuery("SELECT * FROM vaultx_artifacts WHERE id = ? LIMIT 1", [id]);
  return rows[0] as VaultxArtifactRecord;
}

export async function updateVaultxArtifactStatus(artifactId: number, input: {
  creatorId: number;
  status: ArtifactStatus;
  outputUrl?: string | null;
  failureReason?: string | null;
  metadata?: any;
}): Promise<VaultxArtifactRecord> {
  await ensureVaultxArtifactSchema();
  const current = (await rawQuery("SELECT * FROM vaultx_artifacts WHERE id = ? AND creator_id = ? LIMIT 1", [artifactId, input.creatorId]))[0];
  if (!current) throw new Error(`VaultX artifact ${artifactId} not found for creator ${input.creatorId}`);
  const metadata = { ...(safeParseJson(current.metadata) || {}), ...(input.metadata || {}) };
  await rawExec(
    `UPDATE vaultx_artifacts SET status = ?, output_url = COALESCE(?, output_url), failure_reason = ?, metadata = ?, ready_at = CASE WHEN ? = 'ready' THEN COALESCE(ready_at, NOW()) ELSE ready_at END, updated_at = NOW() WHERE id = ? AND creator_id = ?`,
    [input.status, input.outputUrl ?? null, input.failureReason ?? null, jsonSafe(metadata), input.status, artifactId, input.creatorId]
  );
  await recordVaultxArtifactEvent({ artifactId, creatorId: input.creatorId, projectId: current.project_id ?? null, packageId: current.package_id ?? null, eventType: `${current.stage}.${input.status}`, status: input.status, message: input.failureReason ?? null, payload: metadata });
  const rows = await rawQuery("SELECT * FROM vaultx_artifacts WHERE id = ? LIMIT 1", [artifactId]);
  if (current.project_id) await syncProjectArtifactReadiness(input.creatorId, Number(current.project_id));
  return rows[0] as VaultxArtifactRecord;
}

export async function persistReadyVaultxArtifact(input: ReadyArtifactInput): Promise<VaultxArtifactRecord> {
  await ensureVaultxArtifactSchema();
  const expectedPrefix = input.expectedMimePrefix || expectedMimeForKind(input.kind);
  const fetched = await fetchMediaBuffer(input.finalUrl);
  if (expectedPrefix && !fetched.mimeType.startsWith(expectedPrefix)) {
    throw new Error(`Expected ${expectedPrefix} media for ${input.kind}, received ${fetched.mimeType} from ${input.finalUrl}`);
  }
  const ext = extForMime(fetched.mimeType);
  const key = ["vaultx", String(input.creatorId), input.projectId ? `project-${input.projectId}` : input.packageId ? `package-${input.packageId}` : "standalone", `${input.stage}-${Date.now()}-${randomUUID()}.${ext}`].join("/");
  const probe = await probeStoredBuffer(fetched.buffer, fetched.mimeType, ext);
  const stored = await storagePut(key, fetched.buffer, fetched.mimeType);
  const result: any = await rawExec(
    `INSERT INTO vaultx_artifacts
     (creator_id, project_id, package_id, kind, stage, provider, provider_job_id, source_url, output_url, storage_key, mime_type, byte_size, width, height, duration_seconds, status, quality_score, metadata, ready_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'ready', ?, ?, NOW())`,
    [input.creatorId, input.projectId ?? null, input.packageId ?? null, input.kind, input.stage, input.provider ?? null, input.providerJobId ?? null, input.sourceUrl ?? null, stored.url, stored.key, fetched.mimeType, fetched.byteSize, probe.width ?? null, probe.height ?? null, probe.durationSeconds ?? null, input.qualityScore ?? null, jsonSafe({ ...(input.metadata ?? {}), providerFinalUrl: input.finalUrl })]
  );
  const id = Number(result?.insertId || 0);
  await recordVaultxArtifactEvent({ artifactId: id, creatorId: input.creatorId, projectId: input.projectId ?? null, packageId: input.packageId ?? null, eventType: `${input.stage}.ready`, status: "ready", payload: { outputUrl: stored.url, mimeType: fetched.mimeType, byteSize: fetched.byteSize, ...probe } });
  if (input.projectId) await syncProjectArtifactReadiness(input.creatorId, input.projectId);
  const rows = await rawQuery("SELECT * FROM vaultx_artifacts WHERE id = ? LIMIT 1", [id]);
  return rows[0] as VaultxArtifactRecord;
}

export async function persistLocalReadyVaultxArtifact(input: Omit<ReadyArtifactInput, "finalUrl"> & { localPath: string; mimeType: string; }): Promise<VaultxArtifactRecord> {
  await ensureVaultxArtifactSchema();
  const fs = await import("fs/promises");
  const buffer = await fs.readFile(input.localPath);
  if (buffer.length < 512) throw new Error(`Local media payload too small (${buffer.length} bytes): ${input.localPath}`);
  const expectedPrefix = input.expectedMimePrefix || expectedMimeForKind(input.kind);
  const mimeType = normalizeMime(input.mimeType, "application/octet-stream");
  if (expectedPrefix && !mimeType.startsWith(expectedPrefix)) throw new Error(`Expected ${expectedPrefix} media, received ${mimeType}`);
  const ext = extForMime(mimeType);
  const key = ["vaultx", String(input.creatorId), input.projectId ? `project-${input.projectId}` : input.packageId ? `package-${input.packageId}` : "standalone", `${input.stage}-${Date.now()}-${randomUUID()}.${ext}`].join("/");
  const probe = await probeStoredBuffer(buffer, mimeType, ext);
  const stored = await storagePut(key, buffer, mimeType);
  const result: any = await rawExec(
    `INSERT INTO vaultx_artifacts
     (creator_id, project_id, package_id, kind, stage, provider, provider_job_id, source_url, output_url, storage_key, mime_type, byte_size, width, height, duration_seconds, status, quality_score, metadata, ready_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'ready', ?, ?, NOW())`,
    [input.creatorId, input.projectId ?? null, input.packageId ?? null, input.kind, input.stage, input.provider ?? null, input.providerJobId ?? null, input.sourceUrl ?? null, stored.url, stored.key, mimeType, buffer.length, probe.width ?? null, probe.height ?? null, probe.durationSeconds ?? null, input.qualityScore ?? null, jsonSafe({ ...(input.metadata ?? {}), localPath: input.localPath })]
  );
  const id = Number(result?.insertId || 0);
  await recordVaultxArtifactEvent({ artifactId: id, creatorId: input.creatorId, projectId: input.projectId ?? null, packageId: input.packageId ?? null, eventType: `${input.stage}.ready`, status: "ready", payload: { outputUrl: stored.url, mimeType, byteSize: buffer.length, ...probe } });
  if (input.projectId) await syncProjectArtifactReadiness(input.creatorId, input.projectId);
  const rows = await rawQuery("SELECT * FROM vaultx_artifacts WHERE id = ? LIMIT 1", [id]);
  return rows[0] as VaultxArtifactRecord;
}

export async function listVaultxProjectArtifacts(creatorId: number, projectId: number): Promise<VaultxArtifactRecord[]> {
  await ensureVaultxArtifactSchema();
  return await rawQuery("SELECT * FROM vaultx_artifacts WHERE creator_id = ? AND project_id = ? ORDER BY id DESC", [creatorId, projectId]) as VaultxArtifactRecord[];
}

export async function listVaultxPackageArtifacts(creatorId: number, packageId: number): Promise<VaultxArtifactRecord[]> {
  await ensureVaultxArtifactSchema();
  return await rawQuery("SELECT * FROM vaultx_artifacts WHERE creator_id = ? AND package_id = ? ORDER BY id DESC", [creatorId, packageId]) as VaultxArtifactRecord[];
}

export async function getLatestReadyProjectArtifact(creatorId: number, projectId: number, kinds: ArtifactKind[] = ["video", "photo", "export", "package"]): Promise<VaultxArtifactRecord | null> {
  await ensureVaultxArtifactSchema();
  const placeholders = kinds.map(() => "?").join(",");
  const rows = await rawQuery(`SELECT * FROM vaultx_artifacts WHERE creator_id = ? AND project_id = ? AND status = 'ready' AND kind IN (${placeholders}) ORDER BY FIELD(kind, ${placeholders}), id DESC LIMIT 1`, [creatorId, projectId, ...kinds, ...kinds]);
  return (rows[0] as VaultxArtifactRecord) || null;
}

export async function assertReadyVaultxProjectArtifact(creatorId: number, projectId: number, kinds: ArtifactKind[] = ["video", "photo"]): Promise<VaultxArtifactRecord> {
  const ready = await getLatestReadyProjectArtifact(creatorId, projectId, kinds);
  if (!ready || !ready.output_url || ready.status !== "ready") {
    const artifacts = await listVaultxProjectArtifacts(creatorId, projectId);
    throw new VaultxArtifactNotReadyError("VaultX project does not have a ready playable artifact yet. Export and publish are blocked until provider jobs finish and the final media is stored.", {
      creatorId,
      projectId,
      waitingOn: artifacts.filter((item) => item.status === "queued" || item.status === "processing").map((item) => ({ id: item.id, kind: item.kind, stage: item.stage, provider: item.provider, providerJobId: item.provider_job_id, status: item.status })),
      failed: artifacts.filter((item) => item.status === "failed").map((item) => ({ id: item.id, kind: item.kind, stage: item.stage, reason: item.failure_reason })),
    });
  }
  return ready;
}

export async function assertReadyVaultxPackageArtifact(creatorId: number, packageId: number): Promise<VaultxArtifactRecord> {
  await ensureVaultxArtifactSchema();
  const rows = await rawQuery("SELECT * FROM vaultx_artifacts WHERE creator_id = ? AND package_id = ? AND status = 'ready' AND kind = 'package' ORDER BY id DESC LIMIT 1", [creatorId, packageId]);
  const ready = rows[0] as VaultxArtifactRecord | undefined;
  if (!ready?.output_url) {
    const artifacts = await listVaultxPackageArtifacts(creatorId, packageId);
    throw new VaultxArtifactNotReadyError("VaultX revenue package does not have a ready generated package artifact. Checkout and distribution are blocked until the media is stored.", {
      creatorId,
      packageId,
      waitingOn: artifacts.filter((item) => item.status === "queued" || item.status === "processing").map((item) => ({ id: item.id, stage: item.stage, provider: item.provider, providerJobId: item.provider_job_id, status: item.status })),
      failed: artifacts.filter((item) => item.status === "failed").map((item) => ({ id: item.id, stage: item.stage, reason: item.failure_reason })),
    });
  }
  return ready;
}

export async function syncProjectArtifactReadiness(creatorId: number, projectId: number, explicitState?: ReadinessState, error?: string | null): Promise<{ state: ReadinessState; readyArtifactId: number | null; artifacts: VaultxArtifactRecord[]; }> {
  await ensureVaultxArtifactSchema();
  const artifacts = await listVaultxProjectArtifacts(creatorId, projectId);
  const exportReady = artifacts.find((item) => item.status === "ready" && item.kind === "export");
  const mediaReady = artifacts.find((item) => item.status === "ready" && ["video", "photo", "audio"].includes(item.kind));
  const hasFailed = artifacts.some((item) => item.status === "failed");
  const hasProcessing = artifacts.some((item) => item.status === "queued" || item.status === "processing");
  const state: ReadinessState = explicitState || (exportReady ? "export_ready" : mediaReady ? "ready_for_export" : hasFailed && !hasProcessing ? "failed" : hasProcessing ? "processing" : "needs_source");
  const readyArtifactId = Number((exportReady || mediaReady)?.id || 0) || null;
  await rawExec("UPDATE vaultx_editor_projects SET artifact_manifest = ?, readiness_state = ?, ready_artifact_id = ?, readiness_error = ?, updated_at = NOW() WHERE id = ? AND creator_id = ?", [jsonSafe(artifacts), state, readyArtifactId, error ?? null, projectId, creatorId]);
  return { state, readyArtifactId, artifacts };
}

export async function failProjectReadiness(creatorId: number, projectId: number, reason: string, payload: any = {}): Promise<void> {
  await recordVaultxArtifactEvent({ creatorId, projectId, eventType: "project.failed", status: "failed", message: reason, payload });
  await syncProjectArtifactReadiness(creatorId, projectId, "failed", reason);
}

export async function resolveReplicatePrediction(providerJobId: string): Promise<{ status: ArtifactStatus; finalUrl?: string; raw: any; reason?: string; }> {
  const token = process.env.REPLICATE_API_TOKEN || "";
  if (!token) throw new Error("REPLICATE_API_TOKEN not configured");
  const response = await fetch(`https://api.replicate.com/v1/predictions/${providerJobId}`, { headers: { Authorization: `Token ${token}`, "Content-Type": "application/json" } });
  if (!response.ok) throw new Error(`Replicate prediction poll failed (${response.status}): ${await response.text().catch(() => "")}`);
  const raw = await response.json();
  const statusText = String(raw.status || "").toLowerCase();
  if (["succeeded", "success", "complete", "completed"].includes(statusText)) {
    const output = Array.isArray(raw.output) ? raw.output[raw.output.length - 1] : raw.output;
    if (!output || typeof output !== "string") return { status: "failed", raw, reason: "Replicate prediction completed without a downloadable media URL." };
    return { status: "ready", finalUrl: output, raw };
  }
  if (["failed", "canceled", "cancelled"].includes(statusText)) return { status: "failed", raw, reason: raw.error || `Replicate status ${statusText}` };
  return { status: "processing", raw };
}

function extractFirstUrl(value: any): string | undefined {
  if (!value) return undefined;
  if (typeof value === "string" && /^https?:\/\//i.test(value)) return value;
  if (Array.isArray(value)) return value.map(extractFirstUrl).find(Boolean);
  if (typeof value === "object") {
    for (const key of ["url", "outputUrl", "videoUrl", "mediaUrl", "assetUrl", "downloadUrl"]) {
      const found = extractFirstUrl(value[key]);
      if (found) return found;
    }
    for (const item of Object.values(value)) {
      const found = extractFirstUrl(item);
      if (found) return found;
    }
  }
  return undefined;
}

export async function resolvePolloJob(providerJobId: string): Promise<{ status: ArtifactStatus; finalUrl?: string; raw: any; reason?: string; }> {
  const token = process.env.POLLO_API_KEY || "";
  if (!token) throw new Error("POLLO_API_KEY not configured");
  const urls = [
    `https://pollo.ai/api/platform/generation/${encodeURIComponent(providerJobId)}`,
    `https://pollo.ai/api/platform/generation/${encodeURIComponent(providerJobId)}/result`,
    `https://pollo.ai/api/platform/generation/pollo/${encodeURIComponent(providerJobId)}`,
  ];
  let lastError = "";
  for (const url of urls) {
    const response = await fetch(url, { headers: { Authorization: `Bearer ${token}`, "x-api-key": token, "Content-Type": "application/json" } });
    if (response.status === 404) {
      lastError = `404 at ${url}`;
      continue;
    }
    if (!response.ok) throw new Error(`Pollo job poll failed (${response.status}) at ${url}: ${await response.text().catch(() => "")}`);
    const raw = await response.json();
    const statusText = String(raw.status || raw.data?.status || raw.state || raw.data?.state || "").toLowerCase();
    if (["succeed", "success", "succeeded", "complete", "completed", "done"].includes(statusText)) {
      const finalUrl = extractFirstUrl(raw);
      if (!finalUrl) return { status: "failed", raw, reason: "Pollo job completed without a downloadable media URL." };
      return { status: "ready", finalUrl, raw };
    }
    if (["failed", "error", "cancelled", "canceled"].includes(statusText)) return { status: "failed", raw, reason: raw.error || raw.message || raw.data?.error || `Pollo status ${statusText}` };
    return { status: "processing", raw };
  }
  throw new Error(`Pollo job poll failed: ${lastError || "no polling endpoint accepted the job id"}`);
}

export async function pollAndPersistProviderArtifact(input: { artifactId: number; creatorId: number; projectId?: number | null; packageId?: number | null; kind: ArtifactKind; stage: string; provider: ProviderName; }): Promise<VaultxArtifactRecord> {
  await ensureVaultxArtifactSchema();
  const rows = await rawQuery("SELECT * FROM vaultx_artifacts WHERE id = ? AND creator_id = ? LIMIT 1", [input.artifactId, input.creatorId]);
  const artifact = rows[0];
  if (!artifact) throw new Error(`VaultX artifact ${input.artifactId} not found`);
  if (artifact.status === "ready" && artifact.output_url) return artifact as VaultxArtifactRecord;
  if (!artifact.provider_job_id) throw new Error(`VaultX artifact ${input.artifactId} has no provider job id`);
  const resolved = input.provider === "pollo" ? await resolvePolloJob(String(artifact.provider_job_id)) : await resolveReplicatePrediction(String(artifact.provider_job_id));
  if (resolved.status === "ready" && resolved.finalUrl) {
    const ready = await persistReadyVaultxArtifact({
      creatorId: input.creatorId,
      projectId: input.projectId ?? artifact.project_id ?? null,
      packageId: input.packageId ?? artifact.package_id ?? null,
      kind: input.kind,
      stage: input.stage,
      provider: input.provider,
      providerJobId: artifact.provider_job_id,
      sourceUrl: artifact.source_url,
      finalUrl: resolved.finalUrl,
      metadata: { providerRaw: resolved.raw, completedFromArtifactId: input.artifactId },
    });
    await updateVaultxArtifactStatus(input.artifactId, { creatorId: input.creatorId, status: "ready", outputUrl: ready.output_url, metadata: { readyArtifactId: ready.id } });
    return ready;
  }
  if (resolved.status === "failed") return await updateVaultxArtifactStatus(input.artifactId, { creatorId: input.creatorId, status: "failed", failureReason: resolved.reason || "Provider generation failed", metadata: { providerRaw: resolved.raw } });
  return await updateVaultxArtifactStatus(input.artifactId, { creatorId: input.creatorId, status: "processing", metadata: { providerRaw: resolved.raw } });
}

export function publicArtifactPayload(artifact: VaultxArtifactRecord | null | undefined): any {
  if (!artifact) return null;
  return {
    artifactId: artifact.id,
    kind: artifact.kind,
    stage: artifact.stage,
    provider: artifact.provider,
    providerJobId: artifact.provider_job_id,
    status: artifact.status,
    url: artifact.output_url,
    storageKey: artifact.storage_key,
    mimeType: artifact.mime_type,
    byteSize: artifact.byte_size,
    width: artifact.width,
    height: artifact.height,
    durationSeconds: artifact.duration_seconds,
    qualityScore: artifact.quality_score,
    readyAt: artifact.ready_at,
    failureReason: artifact.failure_reason,
    metadata: safeParseJson(artifact.metadata),
  };
}
