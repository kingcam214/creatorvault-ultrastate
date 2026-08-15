import { randomUUID } from "crypto";
import { sql } from "drizzle-orm";
import { db } from "../db";
import {
  deriveBodyCinemaDirections,
  getBodyCinemaSourceEvidence,
  type BodyCinemaEvidenceRecord,
  type BodyCinemaFrameEvidence,
} from "./bodyCinemaEvidenceService";
import { type BodyCinemaSourceMap, getBodyCinemaSourceMap } from "./bodyCinemaSourceMapService";

export type BodyCinemaOutputReview = {
  id: string;
  creatorId: number;
  evidenceId: string;
  outputAssetUrl: string;
  outputFingerprint: string;
  status: "accepted" | "rejected";
  reviewClass: "creative_treatment" | "technical_source_preservation";
  overallScore: number;
  treatmentScore: number;
  bodyIntegrityScore: number;
  technicalScore: number;
  duplicateSimilarity: number;
  preservationScore: number;
  preservationEvidence: {
    sourceMapId: string | null;
    faceVisibility: number;
    bodyContinuity: number;
    motionContinuity: number;
    identityVerification: "not_available";
  };
  reasons: string[];
  outputAnalysis: ReturnType<typeof deriveBodyCinemaDirections>;
  audioAssetId?: string;
  audioAnalysisId?: string;
  createdAt?: string;
};

export type OutputReviewInput = {
  evidenceId: string;
  outputAssetUrl: string;
  outputFingerprint: string;
  frameEvidence: BodyCinemaFrameEvidence[];
  reviewClass?: "creative_treatment" | "technical_source_preservation";
  audioAssetId?: string;
  audioAnalysisId?: string;
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
  if (direction.id === "the-arch" || direction.id === "vip-tease") {
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
  reviewClass: "creative_treatment" | "technical_source_preservation";
  overallScore: number;
  treatmentScore: number;
  bodyIntegrityScore: number;
  technicalScore: number;
  duplicateSimilarity: number;
  preservationScore: number;
  preservationEvidence: {
    sourceMapId: string | null;
    faceVisibility: number;
    bodyContinuity: number;
    motionContinuity: number;
    identityVerification: "not_available";
  };
  reasons: string[];
  outputAnalysis: ReturnType<typeof deriveBodyCinemaDirections>;
};

function supportedPoseFrameCount(frames: BodyCinemaFrameEvidence[]): number {
  return frames.filter((frame) => frame.landmarks.filter((landmark) => (landmark.visibility ?? 1) >= 0.55).length >= 8).length;
}

function measureSourceMapPreservation(source: BodyCinemaEvidenceRecord, sourceMap: BodyCinemaSourceMap | null, output: ReturnType<typeof deriveBodyCinemaDirections>, outputFrames: BodyCinemaFrameEvidence[]) {
  const unavailable = { sourceMapId: sourceMap?.id || null, faceVisibility: 0, bodyContinuity: 0, motionContinuity: 0, identityVerification: "not_available" as const };
  if (!sourceMap || sourceMap.status !== "ready") return { score: 0, evidence: unavailable, reasons: ["Rejected: no ready Source Map protects this source during output review."] };
  if (!sourceMap.routes.allowed.includes("source_preserving_assembly")) return { score: 0, evidence: unavailable, reasons: ["Rejected: this source is not eligible for the source-preserving assembly lane."] };
  const sourceFace = sourceMap.analysis.protectedSubject.face;
  const outputFaceFrames = outputFrames.filter((frame) => frame.face?.present).length;
  const faceVisibility = sourceFace.state === "verified" ? clamp(outputFaceFrames / Math.max(3, Math.min(sourceFace.supportedFrameCount, 6))) : 1;
  const focusRegions = source.directions.find((direction) => direction.id === source.selectedDirectionId)?.bodyFocus || [];
  const sourceBody = average(focusRegions.map((region) => Number(source.bodyMap[region] || 0)));
  const outputBody = average(focusRegions.map((region) => Number(output.bodyMap[region] || 0)));
  const bodyContinuity = clamp(outputBody / Math.max(0.01, sourceBody));
  const sourceMotion = Number(sourceMap.analysis.protectedSubject.motion.averageEnergy || 0);
  const outputMotion = average(output.shotRankings.map((shot) => Number(shot.motionEnergy || 0)));
  const motionContinuity = sourceMap.analysis.protectedSubject.motion.state === "verified" ? clamp(1 - Math.abs(outputMotion - sourceMotion) / Math.max(0.15, sourceMotion)) : 1;
  const evidence = { sourceMapId: sourceMap.id, faceVisibility: Number(faceVisibility.toFixed(3)), bodyContinuity: Number(bodyContinuity.toFixed(3)), motionContinuity: Number(motionContinuity.toFixed(3)), identityVerification: "not_available" as const };
  const reasons: string[] = [];
  if (sourceFace.state === "verified" && outputFaceFrames < 3) reasons.push("Rejected: the output does not retain enough visible face evidence to preserve the measured source presence.");
  if (supportedPoseFrameCount(outputFrames) < 3) reasons.push("Rejected: the output does not retain enough stable pose frames for source-body continuity review.");
  if (bodyContinuity < 0.6) reasons.push(`Rejected: protected body-region continuity is ${Math.round(bodyContinuity * 100)}%, below the source-preservation floor.`);
  if (sourceMap.analysis.protectedSubject.motion.state === "verified" && motionContinuity < 0.45) reasons.push(`Rejected: natural motion continuity is ${Math.round(motionContinuity * 100)}%, showing a timing or movement break against the source.`);
  return { score: Math.round((faceVisibility * 0.3 + bodyContinuity * 0.45 + motionContinuity * 0.25) * 100), evidence, reasons };
}

export function assessBodyCinemaOutput(
  source: BodyCinemaEvidenceRecord,
  input: Pick<OutputReviewInput, "outputFingerprint" | "frameEvidence" | "reviewClass">,
  priorOutputs: PriorBodyCinemaOutput[] = [],
  sourceMap: BodyCinemaSourceMap | null = null,
): BodyCinemaOutputAssessment {
  const reviewClass = input.reviewClass || "creative_treatment";
  const outputAnalysis = deriveBodyCinemaDirections(input.frameEvidence);
  const reasons: string[] = [];
  const technicalScore = average(outputAnalysis.shotRankings.map((shot) => shot.score));
  const bodyIntegrityScore = Math.round(clamp(outputAnalysis.bodyMap.frameCoverage * 0.6 + Math.min(1, outputAnalysis.shotRankings.length / 3) * 0.4) * 100);
  const treatmentScore = Math.round(selectedDirectionSupport(source, outputAnalysis.bodyMap) * 100);
  const preservation = measureSourceMapPreservation(source, sourceMap, outputAnalysis, input.frameEvidence);
  const preservationScore = preservation.score;
  let duplicateSimilarity = visualDuplicateSimilarity(source, input.frameEvidence);

  if (reviewClass === "creative_treatment") {
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
  }

  reasons.push(...preservation.reasons);
  if (outputAnalysis.rejectionReasons.length) {
    reasons.push(...outputAnalysis.rejectionReasons.map((reason) => `Rejected: ${reason}`));
  }
  if (bodyIntegrityScore < 65) reasons.push(`Rejected: body integrity is ${bodyIntegrityScore}/100; the result does not retain enough stable pose evidence.`);
  if (treatmentScore < 60) reasons.push(`Rejected: treatment compliance is ${treatmentScore}/100; the output does not retain the selected direction's supported regions or motion.`);
  if (technicalScore < 65) reasons.push(`Rejected: visual-quality score is ${technicalScore}/100; the ranked frames are too weak for acceptance.`);
  if (reviewClass === "creative_treatment" && duplicateSimilarity >= 0.92) reasons.push(`Rejected: visual fingerprint overlap is ${Math.round(duplicateSimilarity * 100)}%, indicating a duplicate or near-duplicate treatment.`);
  if (preservationScore < 65) reasons.push(`Rejected: source-preservation evidence is ${preservationScore}/100; this output cannot be accepted as a protected Body Cinema result.`);

  const overallScore = Math.round(technicalScore * 0.25 + bodyIntegrityScore * 0.25 + treatmentScore * 0.2 + preservationScore * 0.3);
  const status = reasons.length ? "rejected" : "accepted";
  if (status === "accepted") {
    reasons.push(reviewClass === "technical_source_preservation"
      ? "Accepted: technical source-preservation proof retained the measured source evidence. This internal proof cannot be packaged, sold, or shown as a creative treatment."
      : `Accepted: treatment ${source.selectedDirectionId} preserved source-supported body regions, passed technical ranking, and differed materially from the source.`);
  }
  return { status, reviewClass, overallScore, treatmentScore, bodyIntegrityScore, technicalScore, duplicateSimilarity, preservationScore, preservationEvidence: preservation.evidence, reasons, outputAnalysis };
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
    reviewClass: review.reviewClass === "technical_source_preservation" ? "technical_source_preservation" : "creative_treatment",
    overallScore: Number(row.overall_score),
    treatmentScore: Number(review.treatmentScore),
    bodyIntegrityScore: Number(review.bodyIntegrityScore),
    technicalScore: Number(review.technicalScore),
    duplicateSimilarity: Number(review.duplicateSimilarity),
    preservationScore: Number(review.preservationScore || 0),
    preservationEvidence: review.preservationEvidence || { sourceMapId: null, faceVisibility: 0, bodyContinuity: 0, motionContinuity: 0, identityVerification: "not_available" },
    reasons: review.reasons || [],
    outputAnalysis: review.outputAnalysis,
    audioAssetId: review.audioAssetId,
    audioAnalysisId: review.audioAnalysisId,
    createdAt: row.created_at ? new Date(row.created_at).toISOString() : undefined,
  };
}

export async function getBodyCinemaOutputReview(creatorId: number, outputFingerprint: string): Promise<BodyCinemaOutputReview | null> {
  await ensureBodyCinemaOutputReviewSchema();
  const rows = await rawQuery<any>(
    "SELECT * FROM body_cinema_output_reviews WHERE creator_id = ? AND output_fingerprint = ? LIMIT 1",
    [creatorId, outputFingerprint.toLowerCase()],
  );
  return rows[0] ? serialiseReview(rows[0]) : null;
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
  const sourceMap = await getBodyCinemaSourceMap(creatorId, input.evidenceId);
  const assessment = assessBodyCinemaOutput(source, input, priorOutputs, sourceMap);

  const id = randomUUID();
  const reviewJson = {
    reviewClass: assessment.reviewClass,
    outputAnalysis: assessment.outputAnalysis,
    outputFrameEvidence: input.frameEvidence,
    treatmentScore: assessment.treatmentScore,
    bodyIntegrityScore: assessment.bodyIntegrityScore,
    technicalScore: assessment.technicalScore,
    duplicateSimilarity: assessment.duplicateSimilarity,
    preservationScore: assessment.preservationScore,
    preservationEvidence: assessment.preservationEvidence,
    reasons: assessment.reasons,
    audioAssetId: input.audioAssetId,
    audioAnalysisId: input.audioAnalysisId,
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
  if (review.reviewClass === "technical_source_preservation") throw new Error("A technical source-preservation proof cannot be packaged, sold, or placed in a creator-facing Vault.");
  if (!review.preservationEvidence.sourceMapId || review.preservationScore < 65) {
    throw new Error("The selected output lacks passing Source Map preservation evidence and cannot be packaged or published.");
  }
  return review;
}
