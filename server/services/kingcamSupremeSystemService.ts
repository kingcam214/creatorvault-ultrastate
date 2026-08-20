import { createHash, randomUUID } from "crypto";
import { sql } from "drizzle-orm";
import { db } from "../db";

const OWNER_IDS = new Set([6, 33]);

export type KingcamSupremeAssetKind =
  | "identity_canon"
  | "character_mesh"
  | "face_calibration"
  | "voice_canon"
  | "motion_genome"
  | "wardrobe_canon"
  | "scene_package"
  | "screen_recording"
  | "final_master";

export type KingcamSupremeAssetState = "planned" | "verified" | "rejected" | "archived";
export type KingcamSupremeCapsuleState = "planned" | "source_ready" | "render_ready" | "rendering" | "quality_review" | "accepted" | "rejected" | "failed";

export type KingcamSupremeAsset = {
  id: string;
  ownerId: number;
  kind: KingcamSupremeAssetKind;
  title: string;
  creatorVaultUrl: string | null;
  sourceAssetId: string | null;
  canonVersion: string;
  state: KingcamSupremeAssetState;
  rights: Record<string, unknown>;
  metadata: Record<string, unknown>;
  fingerprint: string | null;
  createdAt: string;
  updatedAt: string;
};

export type KingcamCreatorJobCapsule = {
  id: string;
  ownerId: number;
  title: string;
  state: KingcamSupremeCapsuleState;
  characterCanonVersion: string;
  performanceBrief: Record<string, unknown>;
  sceneManifest: Record<string, unknown>;
  assetIds: string[];
  providerRuns: Array<Record<string, unknown>>;
  qualityReport: Record<string, unknown> | null;
  provenanceFingerprint: string;
  createdAt: string;
  updatedAt: string;
};

function assertOwner(ownerId: number): void {
  if (!OWNER_IDS.has(Number(ownerId))) throw new Error("Only the CreatorVault owner may direct KingCam Supreme.");
}

function safeJson(value: unknown): string {
  return JSON.stringify(value ?? {});
}

function parseJson<T>(value: unknown, fallback: T): T {
  if (value === null || value === undefined || value === "") return fallback;
  if (typeof value === "object") return value as T;
  try { return JSON.parse(String(value)) as T; } catch { return fallback; }
}

async function rawQuery<T = any>(query: string, params: unknown[] = []): Promise<T[]> {
  const pool = (db as any).$client || (db as any).client;
  if (pool?.promise) { const [rows] = await pool.promise().query(query, params); return rows as T[]; }
  if (pool?.execute) { const [rows] = await pool.execute(query, params); return rows as T[]; }
  const values = [...params];
  const escaped = query.replace(/\?/g, () => {
    const value = values.shift();
    if (value === null || value === undefined) return "NULL";
    if (typeof value === "number") return String(value);
    return `'${String(value).replace(/'/g, "''")}'`;
  });
  const result = await (db as any).execute(sql.raw(escaped));
  return (result as any).rows || result || [];
}

async function rawExec(query: string, params: unknown[] = []): Promise<void> {
  const pool = (db as any).$client || (db as any).client;
  if (pool?.promise) { await pool.promise().query(query, params); return; }
  if (pool?.execute) { await pool.execute(query, params); return; }
  const values = [...params];
  const escaped = query.replace(/\?/g, () => {
    const value = values.shift();
    if (value === null || value === undefined) return "NULL";
    if (typeof value === "number") return String(value);
    return `'${String(value).replace(/'/g, "''")}'`;
  });
  await (db as any).execute(sql.raw(escaped));
}

export async function ensureKingcamSupremeSystemSchema(): Promise<void> {
  await rawExec(`CREATE TABLE IF NOT EXISTS kingcam_supreme_assets (
    id CHAR(36) PRIMARY KEY,
    owner_id BIGINT NOT NULL,
    asset_kind VARCHAR(48) NOT NULL,
    title VARCHAR(191) NOT NULL,
    creatorvault_url TEXT NULL,
    source_asset_id CHAR(36) NULL,
    canon_version VARCHAR(96) NOT NULL,
    state VARCHAR(24) NOT NULL,
    rights_json LONGTEXT NOT NULL,
    metadata_json LONGTEXT NOT NULL,
    fingerprint CHAR(64) NULL,
    created_at DATETIME NOT NULL,
    updated_at DATETIME NOT NULL,
    KEY kingcam_supreme_assets_owner_kind (owner_id, asset_kind, state, created_at)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
  await rawExec(`CREATE TABLE IF NOT EXISTS kingcam_creator_job_capsules (
    id CHAR(36) PRIMARY KEY,
    owner_id BIGINT NOT NULL,
    title VARCHAR(191) NOT NULL,
    state VARCHAR(32) NOT NULL,
    character_canon_version VARCHAR(96) NOT NULL,
    performance_brief_json LONGTEXT NOT NULL,
    scene_manifest_json LONGTEXT NOT NULL,
    asset_ids_json LONGTEXT NOT NULL,
    provider_runs_json LONGTEXT NOT NULL,
    quality_report_json LONGTEXT NULL,
    provenance_fingerprint CHAR(64) NOT NULL,
    created_at DATETIME NOT NULL,
    updated_at DATETIME NOT NULL,
    KEY kingcam_capsules_owner_state (owner_id, state, created_at)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
  await rawExec(`CREATE TABLE IF NOT EXISTS kingcam_supreme_evidence_events (
    id CHAR(36) PRIMARY KEY,
    owner_id BIGINT NOT NULL,
    capsule_id CHAR(36) NULL,
    asset_id CHAR(36) NULL,
    event_type VARCHAR(72) NOT NULL,
    payload_json LONGTEXT NOT NULL,
    created_at DATETIME NOT NULL,
    KEY kingcam_supreme_events_owner (owner_id, created_at),
    KEY kingcam_supreme_events_capsule (capsule_id, created_at)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
}

function normaliseAsset(row: any): KingcamSupremeAsset {
  return {
    id: String(row.id), ownerId: Number(row.owner_id), kind: String(row.asset_kind) as KingcamSupremeAssetKind,
    title: String(row.title), creatorVaultUrl: row.creatorvault_url ? String(row.creatorvault_url) : null,
    sourceAssetId: row.source_asset_id ? String(row.source_asset_id) : null, canonVersion: String(row.canon_version),
    state: String(row.state) as KingcamSupremeAssetState, rights: parseJson(row.rights_json, {}),
    metadata: parseJson(row.metadata_json, {}), fingerprint: row.fingerprint ? String(row.fingerprint) : null,
    createdAt: String(row.created_at), updatedAt: String(row.updated_at),
  };
}

function normaliseCapsule(row: any): KingcamCreatorJobCapsule {
  return {
    id: String(row.id), ownerId: Number(row.owner_id), title: String(row.title),
    state: String(row.state) as KingcamSupremeCapsuleState, characterCanonVersion: String(row.character_canon_version),
    performanceBrief: parseJson(row.performance_brief_json, {}), sceneManifest: parseJson(row.scene_manifest_json, {}),
    assetIds: parseJson<string[]>(row.asset_ids_json, []), providerRuns: parseJson<Array<Record<string, unknown>>>(row.provider_runs_json, []),
    qualityReport: parseJson<Record<string, unknown> | null>(row.quality_report_json, null),
    provenanceFingerprint: String(row.provenance_fingerprint), createdAt: String(row.created_at), updatedAt: String(row.updated_at),
  };
}

async function recordEvidence(input: { ownerId: number; capsuleId?: string | null; assetId?: string | null; eventType: string; payload: Record<string, unknown> }): Promise<void> {
  await rawExec(`INSERT INTO kingcam_supreme_evidence_events (id, owner_id, capsule_id, asset_id, event_type, payload_json, created_at)
    VALUES (?, ?, ?, ?, ?, ?, NOW())`, [randomUUID(), input.ownerId, input.capsuleId || null, input.assetId || null, input.eventType, safeJson(input.payload)]);
}

export async function registerKingcamSupremeAsset(input: {
  ownerId: number; kind: KingcamSupremeAssetKind; title: string; canonVersion: string;
  creatorVaultUrl?: string | null; sourceAssetId?: string | null; state?: KingcamSupremeAssetState;
  rights: Record<string, unknown>; metadata?: Record<string, unknown>;
}): Promise<KingcamSupremeAsset> {
  assertOwner(input.ownerId);
  await ensureKingcamSupremeSystemSchema();
  const url = input.creatorVaultUrl?.trim() || null;
  if (url && !/^https:\/\/creatorvault\.live\/(uploads|images|videos)\//.test(url)) {
    throw new Error("KingCam Supreme accepts only CreatorVault-owned media URLs.");
  }
  const id = randomUUID();
  const metadata = input.metadata || {};
  const fingerprint = url ? createHash("sha256").update(`${url}:${input.canonVersion}:${safeJson(metadata)}`).digest("hex") : null;
  await rawExec(`INSERT INTO kingcam_supreme_assets
    (id, owner_id, asset_kind, title, creatorvault_url, source_asset_id, canon_version, state, rights_json, metadata_json, fingerprint, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
    [id, input.ownerId, input.kind, input.title.trim(), url, input.sourceAssetId || null, input.canonVersion.trim(), input.state || "planned", safeJson(input.rights), safeJson(metadata), fingerprint]);
  await recordEvidence({ ownerId: input.ownerId, assetId: id, eventType: "asset_registered", payload: { kind: input.kind, canonVersion: input.canonVersion, state: input.state || "planned", fingerprint } });
  return (await getKingcamSupremeAsset(input.ownerId, id))!;
}

export async function getKingcamSupremeAsset(ownerId: number, assetId: string): Promise<KingcamSupremeAsset | null> {
  assertOwner(ownerId); await ensureKingcamSupremeSystemSchema();
  const rows = await rawQuery<any>("SELECT * FROM kingcam_supreme_assets WHERE id = ? AND owner_id = ? LIMIT 1", [assetId, ownerId]);
  return rows[0] ? normaliseAsset(rows[0]) : null;
}

export async function listKingcamSupremeAssets(ownerId: number): Promise<KingcamSupremeAsset[]> {
  assertOwner(ownerId); await ensureKingcamSupremeSystemSchema();
  const rows = await rawQuery<any>("SELECT * FROM kingcam_supreme_assets WHERE owner_id = ? ORDER BY created_at DESC", [ownerId]);
  return rows.map(normaliseAsset);
}

export async function createKingcamCreatorJobCapsule(input: {
  ownerId: number; title: string; characterCanonVersion: string; assetIds: string[];
  performanceBrief: Record<string, unknown>; sceneManifest: Record<string, unknown>;
}): Promise<KingcamCreatorJobCapsule> {
  assertOwner(input.ownerId); await ensureKingcamSupremeSystemSchema();
  const assetIds = [...new Set(input.assetIds.map(String))];
  if (assetIds.length === 0) throw new Error("A KingCam Creator Job Capsule requires at least one CreatorVault-owned source asset.");
  const assets = await Promise.all(assetIds.map((id) => getKingcamSupremeAsset(input.ownerId, id)));
  if (assets.some((asset) => !asset || asset.state !== "verified")) throw new Error("Every Creator Job Capsule source must be a verified KingCam Supreme asset.");
  const capsuleId = randomUUID();
  const provenanceFingerprint = createHash("sha256").update(safeJson({ characterCanonVersion: input.characterCanonVersion, assetIds, performanceBrief: input.performanceBrief, sceneManifest: input.sceneManifest })).digest("hex");
  await rawExec(`INSERT INTO kingcam_creator_job_capsules
    (id, owner_id, title, state, character_canon_version, performance_brief_json, scene_manifest_json, asset_ids_json, provider_runs_json, provenance_fingerprint, created_at, updated_at)
    VALUES (?, ?, ?, 'source_ready', ?, ?, ?, ?, '[]', ?, NOW(), NOW())`,
    [capsuleId, input.ownerId, input.title.trim(), input.characterCanonVersion.trim(), safeJson(input.performanceBrief), safeJson(input.sceneManifest), safeJson(assetIds), provenanceFingerprint]);
  await recordEvidence({ ownerId: input.ownerId, capsuleId, eventType: "creator_job_capsule_created", payload: { assetIds, characterCanonVersion: input.characterCanonVersion, provenanceFingerprint } });
  return (await getKingcamCreatorJobCapsule(input.ownerId, capsuleId))!;
}

export async function getKingcamCreatorJobCapsule(ownerId: number, capsuleId: string): Promise<KingcamCreatorJobCapsule | null> {
  assertOwner(ownerId); await ensureKingcamSupremeSystemSchema();
  const rows = await rawQuery<any>("SELECT * FROM kingcam_creator_job_capsules WHERE id = ? AND owner_id = ? LIMIT 1", [capsuleId, ownerId]);
  return rows[0] ? normaliseCapsule(rows[0]) : null;
}

export async function getKingcamSupremeCommandCenter(ownerId: number) {
  assertOwner(ownerId); await ensureKingcamSupremeSystemSchema();
  const [assets, capsuleRows, eventRows] = await Promise.all([
    listKingcamSupremeAssets(ownerId),
    rawQuery<any>("SELECT * FROM kingcam_creator_job_capsules WHERE owner_id = ? ORDER BY created_at DESC LIMIT 20", [ownerId]),
    rawQuery<any>("SELECT * FROM kingcam_supreme_evidence_events WHERE owner_id = ? ORDER BY created_at DESC LIMIT 50", [ownerId]),
  ]);
  const capsules = capsuleRows.map(normaliseCapsule);
  const byKind = Object.values(assets.reduce<Record<string, number>>((counts, asset) => { counts[asset.kind] = (counts[asset.kind] || 0) + 1; return counts; }, {}));
  return {
    system: "KingCam Supreme System", providerIndependent: true,
    ownershipRule: "CreatorVault owns the canon, sources, job capsules, evidence, and accepted masters. Providers are replaceable execution lanes.",
    assets,
    capsules,
    evidenceEvents: eventRows.map((row) => ({ id: String(row.id), capsuleId: row.capsule_id ? String(row.capsule_id) : null, assetId: row.asset_id ? String(row.asset_id) : null, eventType: String(row.event_type), payload: parseJson(row.payload_json, {}), createdAt: String(row.created_at) })),
    readiness: {
      canonAssetsVerified: assets.filter((asset) => asset.state === "verified").length,
      canonAssetKindsPresent: byKind.length,
      sourceReadyCapsules: capsules.filter((capsule) => capsule.state === "source_ready").length,
      acceptedEpisodes: capsules.filter((capsule) => capsule.state === "accepted").length,
      watchableFullBodyProofExists: capsules.some((capsule) => capsule.state === "accepted" && Boolean(capsule.qualityReport?.watchableFullBodyTalkingKingcam)),
    },
  };
}
