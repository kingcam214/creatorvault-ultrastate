import { randomUUID } from "crypto";
import { sql } from "drizzle-orm";
import { db } from "../db";
import {
  deriveBodyCinemaDirections,
  getBodyCinemaSourceEvidence,
  type BodyCinemaEvidenceRecord,
  type BodyCinemaFrameEvidence,
} from "./bodyCinemaEvidenceService";

export type BodyCinemaOutputReview = {
  id: string;
  creatorId: number;
  evidenceId: string;
  outputAssetUrl: string;
  outputFingerprint: string;
  status: "accepted" | "rejected";
  overallScore: number;
  treatmentScore: number;
  bodyIntegrityScore: number;
  technicalScore: number;
  duplicateSimilarity: number;
  reasons: string[];
  outputAnalysis: ReturnType<typeof deriveBodyCinemaDirections>;
  createdAt?: string;
};

export type OutputReviewInput = {
  evidenceId: string;
  outputAssetUrl: string;
  outputFingerprint: string;
  frameEvidence: BodyCinemaFrameEvidence[];
};

function clamp(value: number, min = 0, max = 1): number {
  return Math.max(min, Math.min(max, value));
}

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
  return (db as any).execute(sql.raw(escaped));
}

export async function ensureBodyCinemaOutputReviewSchema(): Promise<void> {
  await rawExec(`CREATE TABLE IF NOT EXISTS body_cinema_output_reviews (
    id VARCHAR(36) PRIMARY KEY,
    creator_id BIGINT NOT NULL,
    evidence_id VARCHAR(36) NOT NULL,
    output_asset_url TEXT NOT NULL,
    output_fingerprint CHAR(64) NOT NULL,
    review_json JSON NOT NULL,
    status VARCHAR(16) NOT NULL,
    overall_score INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uniq_body_cinema_output (creator_id, output_fingerprint),
    INDEX idx_body_cinema_output_evidence (evidence_id),
    INDEX idx_body_cinema_output_status (status)
  )`);
}

function hammingSimilarity(left?: string, right?: string): number {
  if (!left || !right || left.length !== right.length) return 0;
  let same = 0;
  for (let index = 0; index < left.length; index += 1) {
    if (left[index] === right[index]) same += 1;
  }
  return same / Math.max(1, left.length);
}

function fingerprintOverlap(referenceFrames: BodyCinemaFrameEvidence[], candidateFrames: BodyCinemaFrameEvidence[]): number {
  const references = referenceFrames.map((frame) => frame.frameFingerprint).filter(Boolean) as string[];
  const candidates = candidateFrames.map((frame) => frame.frameFingerprint).filter(Boolean) as string[];
  if (!references.length || !candidates.length) return 0;
  let best = 0;
  for (const candidate of candidates) {
    for (const reference of references) {
      best = Math.max(best, hammingSimilarity(candidate, reference));
    }
  }
  return best;
}

function visualDuplicateSimilarity(source: BodyCinemaEvidenceRecord, outputFrames: BodyCinemaFrameEvidence[]): number {
  return fingerprintOverlap(source.frameEvidence, outputFrames);
}

function average(values: number[]): number {
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
}

function selectedDirectionSupport(source: BodyCinemaEvidenceRecord, outputBodyMap: Record<string, number>): number {
  const direction = source.directions.find((candidate) => candidate.id === source.selectedDirectionId);
  if (!direction) return 0;
  const requiredRegions = direction.bodyFocus.filter((region) => Number(source.bodyMap[region] || 0) >= 0.35);
  if (!requiredRegions.length) return 0;
  const sourceSupport = average(requiredRegions.map((region) => Number(source.bodyMap[region] || 0)));
  const outputSupport = average(requiredRegions.map((region) => Number(outputBodyMap[region] || 0)));
  const regionalContinuity = clamp(outputSupport / Math.max(0.01, sourceSupport));
  if (direction.id === "motion-tension") {
    const sourceMotion = Number(source.bodyMap.motion || 0);
    const outputMotion = Number(outputBodyMap.motion || 0);
    return clamp(regionalContinuity * 0.7 + clamp(outputMotion / Math.max(0.03, sourceMotion || 0.03)) * 0.3);
  }
  return regionalContinuity;
}

export type PriorBodyCinemaOutput = {
  outputFingerprint: string;
  frameEvidence: BodyCinemaFrameEvidence[];
};

export type BodyCinemaOutputAssessment = {
  status: "accepted" | "rejected";
  overallScore: number;
  treatmentScore: number;
  bodyIntegrityScore: number;
  technicalScore: number;
  duplicateSimilarity: number;
  reasons: string[];
  outputAnalysis: ReturnType<typeof deriveBodyCinemaDirections>;
};

export function assessBodyCinemaOutput(
  source: BodyCinemaEvidenceRecord,
  input: Pick<OutputReviewInput, "outputFingerprint" | "frameEvidence">,
  priorOutputs: PriorBodyCinemaOutput[] = [],
): BodyCinemaOutputAssessment {
  const outputAnalysis = deriveBodyCinemaDirections(input.frameEvidence);
  const reasons: string[] = [];
  const technicalScore = average(outputAnalysis.shotRankings.map((shot) => shot.score));
  const bodyIntegrityScore = Math.round(clamp(outputAnalysis.bodyMap.frameCoverage * 0.6 + Math.min(1, outputAnalysis.shotRankings.length / 3) * 0.4) * 100);
  const treatmentScore = Math.round(selectedDirectionSupport(source, outputAnalysis.bodyMap) * 100);
  let duplicateSimilarity = visualDuplicateSimilarity(source, input.frameEvidence);

  if (input.outputFingerprint.toLowerCase() === source.sourceFingerprint.toLowerCase()) {
    duplicateSimilarity = 1;
    reasons.push("Rejected: output fingerprint is identical to the source asset, so no material treatment change occurred.");
  }

  for (const prior of priorOutputs) {
    if (prior.outputFingerprint.toLowerCase() === input.outputFingerprint.toLowerCase()) {
      duplicateSimilarity = 1;
      reasons.push("Rejected: this exact output was already reviewed for the selected source and treatment.");
      break;
    }
    duplicateSimilarity = Math.max(duplicateSimilarity, fingerprintOverlap(prior.frameEvidence, input.frameEvidence));
  }

  if (outputAnalysis.rejectionReasons.length) {
    reasons.push(...outputAnalysis.rejectionReasons.map((reason) => `Rejected: ${reason}`));
  }
  if (bodyIntegrityScore < 65) reasons.push(`Rejected: body integrity is ${bodyIntegrityScore}/100; the result does not retain enough stable pose evidence.`);
  if (treatmentScore < 60) reasons.push(`Rejected: treatment compliance is ${treatmentScore}/100; the output does not retain the selected direction's supported regions or motion.`);
  if (technicalScore < 65) reasons.push(`Rejected: visual-quality score is ${technicalScore}/100; the ranked frames are too weak for acceptance.`);
  if (duplicateSimilarity >= 0.92) reasons.push(`Rejected: visual fingerprint overlap is ${Math.round(duplicateSimilarity * 100)}%, indicating a duplicate or near-duplicate treatment.`);

  const overallScore = Math.round(technicalScore * 0.35 + bodyIntegrityScore * 0.35 + treatmentScore * 0.3);
  const status = reasons.length ? "rejected" : "accepted";
  if (status === "accepted") {
    reasons.push(`Accepted: treatment ${source.selectedDirectionId} preserved source-supported body regions, passed technical ranking, and differed materially from the source.`);
  }
  return { status, overallScore, treatmentScore, bodyIntegrityScore, technicalScore, duplicateSimilarity, reasons, outputAnalysis };
}

function serialiseReview(row: any): BodyCinemaOutputReview {
  const review = typeof row.review_json === "string" ? JSON.parse(row.review_json) : row.review_json;
  return {
    id: String(row.id),
    creatorId: Number(row.creator_id),
    evidenceId: String(row.evidence_id),
    outputAssetUrl: String(row.output_asset_url),
    outputFingerprint: String(row.output_fingerprint),
    status: row.status,
    overallScore: Number(row.overall_score),
    treatmentScore: Number(review.treatmentScore),
    bodyIntegrityScore: Number(review.bodyIntegrityScore),
    technicalScore: Number(review.technicalScore),
    duplicateSimilarity: Number(review.duplicateSimilarity),
    reasons: review.reasons || [],
    outputAnalysis: review.outputAnalysis,
    createdAt: row.created_at ? new Date(row.created_at).toISOString() : undefined,
  };
}

export async function reviewBodyCinemaOutput(creatorId: number, input: OutputReviewInput): Promise<BodyCinemaOutputReview> {
  await ensureBodyCinemaOutputReviewSchema();
  const source = await getBodyCinemaSourceEvidence(creatorId, input.evidenceId);
  if (!source) throw new Error("The source evidence record was not found for this creator.");
  if (source.analysisStatus !== "verified" || source.reviewStatus !== "ready" || !source.selectedDirectionId) {
    throw new Error("A verified source analysis and approved direction are required before output review.");
  }
  if (!/^[a-f0-9]{64}$/i.test(input.outputFingerprint)) {
    throw new Error("A SHA-256 output fingerprint is required for duplicate detection.");
  }

  const priorRows = await rawQuery<any>(
    "SELECT * FROM body_cinema_output_reviews WHERE creator_id = ? AND evidence_id = ? ORDER BY created_at DESC LIMIT 20",
    [creatorId, input.evidenceId],
  );
  const priorOutputs: PriorBodyCinemaOutput[] = priorRows.map((row) => {
    const priorReview = typeof row.review_json === "string" ? JSON.parse(row.review_json) : row.review_json;
    return {
      outputFingerprint: String(row.output_fingerprint),
      frameEvidence: (priorReview?.outputFrameEvidence || []) as BodyCinemaFrameEvidence[],
    };
  });
  const assessment = assessBodyCinemaOutput(source, input, priorOutputs);

  const id = randomUUID();
  const reviewJson = {
    outputAnalysis: assessment.outputAnalysis,
    outputFrameEvidence: input.frameEvidence,
    treatmentScore: assessment.treatmentScore,
    bodyIntegrityScore: assessment.bodyIntegrityScore,
    technicalScore: assessment.technicalScore,
    duplicateSimilarity: assessment.duplicateSimilarity,
    reasons: assessment.reasons,
  };
  await rawExec(
    `INSERT INTO body_cinema_output_reviews
      (id, creator_id, evidence_id, output_asset_url, output_fingerprint, review_json, status, overall_score)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       id = VALUES(id), output_asset_url = VALUES(output_asset_url), review_json = VALUES(review_json), status = VALUES(status), overall_score = VALUES(overall_score), updated_at = CURRENT_TIMESTAMP`,
    [id, creatorId, input.evidenceId, input.outputAssetUrl, input.outputFingerprint.toLowerCase(), JSON.stringify(reviewJson), assessment.status, assessment.overallScore],
  );

  const rows = await rawQuery<any>(
    "SELECT * FROM body_cinema_output_reviews WHERE creator_id = ? AND output_fingerprint = ? LIMIT 1",
    [creatorId, input.outputFingerprint.toLowerCase()],
  );
  if (!rows[0]) throw new Error("Body Cinema output review could not be read after persistence.");
  return serialiseReview(rows[0]);
}

export async function assertAcceptedBodyCinemaOutputReview(input: {
  creatorId: number;
  evidenceId: string;
  outputReviewId: string;
  sourceMediaUrl: string;
}): Promise<BodyCinemaOutputReview> {
  await ensureBodyCinemaOutputReviewSchema();
  const source = await getBodyCinemaSourceEvidence(input.creatorId, input.evidenceId);
  if (!source || source.sourceMediaUrl !== input.sourceMediaUrl) {
    throw new Error("The supplied Body Cinema evidence does not belong to this package source.");
  }
  const rows = await rawQuery<any>(
    "SELECT * FROM body_cinema_output_reviews WHERE id = ? AND creator_id = ? AND evidence_id = ? LIMIT 1",
    [input.outputReviewId, input.creatorId, input.evidenceId],
  );
  const review = rows[0] ? serialiseReview(rows[0]) : null;
  if (!review) throw new Error("An output-review record is required before package finalization.");
  if (review.status !== "accepted") throw new Error("The selected output review was not accepted; rejected or duplicate output cannot be persisted or published.");
  return review;
}
