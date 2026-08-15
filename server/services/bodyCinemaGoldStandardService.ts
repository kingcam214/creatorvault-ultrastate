import { randomUUID } from "crypto";
import { sql } from "drizzle-orm";
import { db } from "../db";
import { getBodyCinemaSourceEvidence } from "./bodyCinemaEvidenceService";
import { assertBodyCinemaEditBlueprintReady } from "./bodyCinemaEditBlueprintService";
import { getBodyCinemaOutputReview } from "./bodyCinemaOutputReviewService";
import { getBodyCinemaSourceMap } from "./bodyCinemaSourceMapService";

export type BodyCinemaGoldStandardBaseline = {
  id: string;
  creatorId: number;
  baselineClass: "technical_source_preservation";
  state: "accepted_internal_only";
  sourceEvidenceId: string;
  sourceMediaUrl: string;
  sourceFingerprint: string;
  sourceMapId: string;
  editBlueprintId: string;
  outputReviewId: string;
  outputFingerprint: string;
  outputAssetUrl: string;
  overallScore: number;
  preservationScore: number;
  notes: string;
  createdAt?: string;
};

async function rawQuery<T = any>(query: string, params: any[] = []): Promise<T[]> {
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
  return (result as any).rows || result;
}

async function rawExec(query: string, params: any[] = []): Promise<void> {
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

async function ensureGoldStandardSchema(): Promise<void> {
  await rawExec(`CREATE TABLE IF NOT EXISTS body_cinema_gold_standard_baselines (
    id VARCHAR(36) PRIMARY KEY,
    creator_id BIGINT NOT NULL,
    baseline_class VARCHAR(64) NOT NULL,
    state VARCHAR(64) NOT NULL,
    source_evidence_id VARCHAR(36) NOT NULL,
    source_media_url TEXT NOT NULL,
    source_fingerprint CHAR(64) NOT NULL,
    source_map_id VARCHAR(36) NOT NULL,
    edit_blueprint_id VARCHAR(36) NOT NULL,
    output_review_id VARCHAR(36) NOT NULL,
    output_fingerprint CHAR(64) NOT NULL,
    output_asset_url TEXT NOT NULL,
    overall_score INT NOT NULL,
    preservation_score INT NOT NULL,
    notes TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uniq_body_cinema_gold_standard (creator_id, baseline_class, source_evidence_id, output_fingerprint),
    INDEX idx_body_cinema_gold_standard_source (source_evidence_id),
    INDEX idx_body_cinema_gold_standard_state (state)
  )`);
}

function serialiseBaseline(row: any): BodyCinemaGoldStandardBaseline {
  return {
    id: String(row.id),
    creatorId: Number(row.creator_id),
    baselineClass: "technical_source_preservation",
    state: "accepted_internal_only",
    sourceEvidenceId: String(row.source_evidence_id),
    sourceMediaUrl: String(row.source_media_url),
    sourceFingerprint: String(row.source_fingerprint),
    sourceMapId: String(row.source_map_id),
    editBlueprintId: String(row.edit_blueprint_id),
    outputReviewId: String(row.output_review_id),
    outputFingerprint: String(row.output_fingerprint),
    outputAssetUrl: String(row.output_asset_url),
    overallScore: Number(row.overall_score),
    preservationScore: Number(row.preservation_score),
    notes: String(row.notes),
    createdAt: row.created_at ? new Date(row.created_at).toISOString() : undefined,
  };
}

export async function registerAcceptedTechnicalSourceBaseline(input: {
  creatorId: number;
  evidenceId: string;
  sourceMediaUrl: string;
  outputFingerprint: string;
  notes?: string;
}): Promise<BodyCinemaGoldStandardBaseline> {
  await ensureGoldStandardSchema();
  const source = await getBodyCinemaSourceEvidence(input.creatorId, input.evidenceId);
  if (!source || source.sourceMediaUrl !== input.sourceMediaUrl) {
    throw new Error("Gold Standard baseline source does not match the verified Body Cinema evidence.");
  }
  const sourceMap = await getBodyCinemaSourceMap(input.creatorId, input.evidenceId);
  if (!sourceMap || sourceMap.status !== "ready") {
    throw new Error("Gold Standard baseline requires a ready protected Source Map.");
  }
  const blueprint = await assertBodyCinemaEditBlueprintReady({
    creatorId: input.creatorId,
    evidenceId: input.evidenceId,
    sourceMediaUrl: input.sourceMediaUrl,
  });
  const review = await getBodyCinemaOutputReview(input.creatorId, input.outputFingerprint);
  if (!review || review.evidenceId !== input.evidenceId) {
    throw new Error("Gold Standard baseline requires the exact output review for this source evidence.");
  }
  if (review.status !== "accepted" || review.reviewClass !== "technical_source_preservation") {
    throw new Error("Only an accepted internal technical source-preservation proof can become this baseline.");
  }
  if (review.preservationScore < 65 || !review.preservationEvidence.sourceMapId) {
    throw new Error("Gold Standard baseline requires passing Source Map preservation evidence.");
  }

  const existing = await rawQuery<any>(
    `SELECT * FROM body_cinema_gold_standard_baselines
      WHERE creator_id = ? AND baseline_class = 'technical_source_preservation' AND source_evidence_id = ? AND output_fingerprint = ?
      LIMIT 1`,
    [input.creatorId, input.evidenceId, input.outputFingerprint.toLowerCase()],
  );
  if (existing[0]) return serialiseBaseline(existing[0]);

  const id = randomUUID();
  const notes = input.notes || "Accepted internal technical source-preservation proof. This is a regression baseline only; it cannot be packaged, sold, distributed, or represented as a creative Body Cinema treatment.";
  await rawExec(
    `INSERT INTO body_cinema_gold_standard_baselines
      (id, creator_id, baseline_class, state, source_evidence_id, source_media_url, source_fingerprint, source_map_id, edit_blueprint_id, output_review_id, output_fingerprint, output_asset_url, overall_score, preservation_score, notes)
     VALUES (?, ?, 'technical_source_preservation', 'accepted_internal_only', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      input.creatorId,
      input.evidenceId,
      source.sourceMediaUrl,
      source.sourceFingerprint,
      sourceMap.id,
      blueprint.id,
      review.id,
      review.outputFingerprint,
      review.outputAssetUrl,
      review.overallScore,
      review.preservationScore,
      notes,
    ],
  );
  const rows = await rawQuery<any>("SELECT * FROM body_cinema_gold_standard_baselines WHERE id = ? LIMIT 1", [id]);
  if (!rows[0]) throw new Error("Gold Standard baseline could not be read after registration.");
  return serialiseBaseline(rows[0]);
}

export async function listBodyCinemaGoldStandardBaselines(creatorId: number): Promise<BodyCinemaGoldStandardBaseline[]> {
  await ensureGoldStandardSchema();
  const rows = await rawQuery<any>(
    "SELECT * FROM body_cinema_gold_standard_baselines WHERE creator_id = ? ORDER BY created_at DESC",
    [creatorId],
  );
  return rows.map(serialiseBaseline);
}
