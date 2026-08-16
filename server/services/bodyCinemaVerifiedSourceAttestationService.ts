import { createHash, randomUUID } from "crypto";
import { sql } from "drizzle-orm";
import { db } from "../db";
import { getBodyCinemaSourceEvidence } from "./bodyCinemaEvidenceService";
import { assertBodyCinemaEditBlueprintReady } from "./bodyCinemaEditBlueprintService";
import { listBodyCinemaGoldStandardBaselines } from "./bodyCinemaGoldStandardService";
import { getBodyCinemaSourceMap } from "./bodyCinemaSourceMapService";

/**
 * Evidence-backed recovery for a legacy CreatorVault upload whose original
 * direct-upload receipt is no longer present on disk. This is intentionally
 * narrower than a media_assets record: the exact source bytes must match a
 * 94+ accepted technical-preservation Gold Standard, with its evidence,
 * Source Map, and edit blueprint still intact. It never attests generated,
 * derived, demo, or unrelated media and never creates a provider request.
 */

export type BodyCinemaVerifiedSourceAttestation = {
  id: string;
  creatorId: number;
  sourceAssetId: string;
  sourceMediaUrl: string;
  sourceFingerprint: string;
  sourceEvidenceId: string;
  sourceMapId: string;
  editBlueprintId: string;
  goldStandardBaselineId: string;
  preservationScore: number;
  attestationBasis: "accepted_technical_source_preservation_baseline";
  status: "verified";
  createdAt?: string;
};

const OWNER_IDS = new Set([6, 33]);
const MAX_SOURCE_BYTES = 750 * 1024 * 1024;

async function rawQuery<T = any>(query: string, params: unknown[] = []): Promise<T[]> {
  const pool = (db as any).$client || (db as any).client;
  if (pool && typeof pool.promise === "function") {
    const [rows] = await pool.promise().query(query, params);
    return rows as T[];
  }
  if (pool && typeof pool.execute === "function") {
    const [rows] = await pool.execute(query, params);
    return rows as T[];
  }
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
  if (pool && typeof pool.promise === "function") {
    await pool.promise().query(query, params);
    return;
  }
  if (pool && typeof pool.execute === "function") {
    await pool.execute(query, params);
    return;
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

function parse(row: any): BodyCinemaVerifiedSourceAttestation {
  return {
    id: String(row.id),
    creatorId: Number(row.creator_id),
    sourceAssetId: String(row.source_asset_id),
    sourceMediaUrl: String(row.source_media_url),
    sourceFingerprint: String(row.source_fingerprint),
    sourceEvidenceId: String(row.source_evidence_id),
    sourceMapId: String(row.source_map_id),
    editBlueprintId: String(row.edit_blueprint_id),
    goldStandardBaselineId: String(row.gold_standard_baseline_id),
    preservationScore: Number(row.preservation_score),
    attestationBasis: "accepted_technical_source_preservation_baseline",
    status: "verified",
    createdAt: row.created_at ? new Date(row.created_at).toISOString() : undefined,
  };
}

export async function ensureBodyCinemaVerifiedSourceAttestationSchema(): Promise<void> {
  await rawExec(`CREATE TABLE IF NOT EXISTS body_cinema_verified_source_attestations (
    id CHAR(36) NOT NULL PRIMARY KEY,
    creator_id BIGINT NOT NULL,
    source_asset_id CHAR(36) NOT NULL,
    source_media_url TEXT NOT NULL,
    source_fingerprint CHAR(64) NOT NULL,
    source_evidence_id CHAR(36) NOT NULL,
    source_map_id CHAR(36) NOT NULL,
    edit_blueprint_id CHAR(36) NOT NULL,
    gold_standard_baseline_id CHAR(36) NOT NULL,
    preservation_score INT NOT NULL,
    attestation_basis VARCHAR(96) NOT NULL,
    status VARCHAR(24) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uniq_body_cinema_verified_source_asset (creator_id, source_asset_id),
    UNIQUE KEY uniq_body_cinema_verified_source_url (creator_id, source_fingerprint),
    KEY idx_body_cinema_verified_source_url (creator_id, source_media_url(255), status)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
}

export async function getBodyCinemaVerifiedSourceAttestation(input: {
  creatorId: number;
  sourceMediaUrl: string;
}): Promise<BodyCinemaVerifiedSourceAttestation | null> {
  await ensureBodyCinemaVerifiedSourceAttestationSchema();
  const rows = await rawQuery<any>(
    `SELECT * FROM body_cinema_verified_source_attestations
     WHERE creator_id = ? AND source_media_url = ? AND status = 'verified'
     ORDER BY created_at DESC LIMIT 1`,
    [input.creatorId, input.sourceMediaUrl],
  );
  return rows[0] ? parse(rows[0]) : null;
}

export async function listBodyCinemaVerifiedSourceAttestations(creatorId: number): Promise<BodyCinemaVerifiedSourceAttestation[]> {
  await ensureBodyCinemaVerifiedSourceAttestationSchema();
  const rows = await rawQuery<any>(
    `SELECT * FROM body_cinema_verified_source_attestations
     WHERE creator_id = ? AND status = 'verified'
     ORDER BY created_at DESC`,
    [creatorId],
  );
  return rows.map(parse);
}

function assertOwner(creatorId: number): void {
  if (!OWNER_IDS.has(Number(creatorId))) {
    throw new Error("Legacy source recovery is limited to CreatorVault owner media.");
  }
}

export async function recoverVerifiedLegacyBodyCinemaSource(input: {
  creatorId: number;
  sourceMediaUrl: string;
}): Promise<BodyCinemaVerifiedSourceAttestation> {
  assertOwner(input.creatorId);
  await ensureBodyCinemaVerifiedSourceAttestationSchema();

  const existing = await getBodyCinemaVerifiedSourceAttestation(input);
  if (existing) return existing;

  const assetRows = await rawQuery<any>(
    `SELECT id, source_type, asset_type, mime_type, status, public_url, file_name
     FROM media_assets
     WHERE id IN (SELECT id FROM media_assets WHERE user_id = ? AND public_url = ? LIMIT 1)
     LIMIT 1`,
    [input.creatorId, input.sourceMediaUrl],
  );
  const asset = assetRows[0];
  if (!asset) throw new Error("The original CreatorVault source record could not be found for recovery.");
  if (String(asset.status) !== "ready" || (String(asset.asset_type) !== "video" && !String(asset.mime_type || "").startsWith("video/"))) {
    throw new Error("Only a ready original video can be restored to Body Cinema source use.");
  }
  if (String(asset.source_type || "").toLowerCase() !== "upload") {
    throw new Error("Only an original CreatorVault upload can be restored; generated or derived media remains blocked.");
  }

  const baselines = await listBodyCinemaGoldStandardBaselines(input.creatorId);
  const baseline = baselines.find((entry) => (
    entry.baselineClass === "technical_source_preservation"
    && entry.state === "accepted_internal_only"
    && entry.sourceMediaUrl === input.sourceMediaUrl
    && entry.preservationScore >= 94
  ));
  if (!baseline) {
    throw new Error("This source has no accepted 94-point preservation baseline, so CreatorVault will not restore it automatically.");
  }

  const [evidence, sourceMap, blueprint] = await Promise.all([
    getBodyCinemaSourceEvidence(input.creatorId, baseline.sourceEvidenceId),
    getBodyCinemaSourceMap(input.creatorId, baseline.sourceEvidenceId),
    assertBodyCinemaEditBlueprintReady({
      creatorId: input.creatorId,
      evidenceId: baseline.sourceEvidenceId,
      sourceMediaUrl: input.sourceMediaUrl,
    }),
  ]);
  if (!evidence || evidence.analysisStatus !== "verified" || evidence.sourceMediaUrl !== input.sourceMediaUrl || evidence.sourceFingerprint !== baseline.sourceFingerprint) {
    throw new Error("The saved source-analysis record no longer matches the accepted baseline.");
  }
  if (!sourceMap || sourceMap.status !== "ready" || sourceMap.id !== baseline.sourceMapId) {
    throw new Error("The saved source-protection map no longer matches the accepted baseline.");
  }
  if (blueprint.id !== baseline.editBlueprintId) {
    throw new Error("The saved source edit blueprint no longer matches the accepted baseline.");
  }

  const response = await fetch(input.sourceMediaUrl, { redirect: "follow" });
  if (!response.ok) throw new Error(`CreatorVault could not re-read the original source (${response.status}).`);
  const declaredBytes = Number(response.headers.get("content-length") || 0);
  if (declaredBytes > MAX_SOURCE_BYTES) throw new Error("The original source exceeds the governed recovery size limit.");
  const sourceBytes = Buffer.from(await response.arrayBuffer());
  if (sourceBytes.length < 1024 || sourceBytes.length > MAX_SOURCE_BYTES) {
    throw new Error("CreatorVault could not verify readable original source bytes for recovery.");
  }
  const fingerprint = createHash("sha256").update(sourceBytes).digest("hex");
  if (fingerprint !== baseline.sourceFingerprint) {
    throw new Error("The current original source bytes differ from the accepted preservation baseline and remain blocked.");
  }

  const id = randomUUID();
  await rawExec(
    `INSERT INTO body_cinema_verified_source_attestations (
      id, creator_id, source_asset_id, source_media_url, source_fingerprint, source_evidence_id,
      source_map_id, edit_blueprint_id, gold_standard_baseline_id, preservation_score,
      attestation_basis, status
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'accepted_technical_source_preservation_baseline', 'verified')`,
    [
      id,
      input.creatorId,
      String(asset.id),
      input.sourceMediaUrl,
      fingerprint,
      baseline.sourceEvidenceId,
      baseline.sourceMapId,
      baseline.editBlueprintId,
      baseline.id,
      baseline.preservationScore,
    ],
  );
  const saved = await getBodyCinemaVerifiedSourceAttestation(input);
  if (!saved) throw new Error("CreatorVault could not read the restored verified source record.");
  return saved;
}
