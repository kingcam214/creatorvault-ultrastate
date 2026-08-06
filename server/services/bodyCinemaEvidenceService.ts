import { createHash, randomUUID } from "crypto";
import { sql } from "drizzle-orm";
import { db } from "../db";

export type BodyCinemaLandmark = {
  x: number;
  y: number;
  z?: number;
  visibility?: number;
};

export type BodyCinemaFrameEvidence = {
  timestampMs: number;
  width: number;
  height: number;
  sceneId?: number;
  frameFingerprint?: string;
  brightness?: number;
  contrast?: number;
  sharpness?: number;
  colorWarmth?: number;
  subjectCoverage?: number;
  face?: { present: boolean; centerX?: number; centerY?: number; coverage?: number; expressionSignals?: Record<string, number> };
  landmarks: BodyCinemaLandmark[];
  worldLandmarks?: Array<{ x: number; y: number; z?: number; visibility?: number }>;
};

export type BodyCinemaShotRanking = {
  timestampMs: number;
  sceneId: number;
  score: number;
  reason: string;
  visibleLandmarks: number;
  faceSupport: number;
  subjectCoverage: number;
  cropSafety: number;
};

export type BodyCinemaTimelineBeat = {
  id: "hook" | "build" | "restraint" | "payoff" | "loop";
  startMs: number;
  endMs: number;
  sourceTimestampMs: number;
  crop: string;
  grade: string;
  direction: string;
  supportedBy: string[];
};

export type BodyCinemaDirection = {
  id: "portrait-command" | "silhouette-control" | "motion-tension";
  label: string;
  camera: string;
  movement: string;
  bodyFocus: string[];
  composition: string;
  evidence: string[];
  confidence: number;
  distinction: string;
  timeline: BodyCinemaTimelineBeat[];
};

export type BodyCinemaEvidenceRecord = {
  id: string;
  creatorId: number;
  sourceMediaUrl: string;
  sourceFingerprint: string;
  sourceType: "image" | "video";
  analysisVersion: string;
  analysisStatus: "verified" | "rejected";
  reviewStatus: "needs_review" | "ready" | "blocked";
  selectedDirectionId: string | null;
  analysisScore: number;
  rejectionReasons: string[];
  bodyMap: Record<string, number>;
  frameEvidence: BodyCinemaFrameEvidence[];
  scenes: Array<{ sceneId: number; startMs: number; endMs: number; representativeTimestampMs: number }>;
  shotRankings: BodyCinemaShotRanking[];
  directions: BodyCinemaDirection[];
  createdAt?: string;
  updatedAt?: string;
};

export type SourceEvidenceInput = {
  sourceMediaUrl: string;
  sourceType: "image" | "video";
  sourceFingerprint: string;
  analysisVersion: string;
  frameEvidence: BodyCinemaFrameEvidence[];
};

const EVIDENCE_VERSION = "adaptive-video-source-intelligence/v2";
const MIN_FRAME_COUNT = 6;
const MIN_VISIBLE_LANDMARKS = 8;
const MIN_CONFIDENCE = 0.55;

const BODY_GROUPS: Record<string, number[]> = {
  face: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
  shoulders: [11, 12],
  arms: [13, 14, 15, 16],
  torso: [11, 12, 23, 24],
  hips: [23, 24],
  legs: [25, 26, 27, 28, 29, 30, 31, 32],
};

function clamp(value: number, min = 0, max = 1): number {
  return Math.max(min, Math.min(max, value));
}

function rawClient<T = any>(query: string, params: any[] = []): Promise<T[]> {
  const pool = (db as any).$client || (db as any).client;
  if (pool && typeof pool.promise === "function") {
    return pool.promise().query(query, params).then(([rows]: any) => rows as T[]);
  }
  if (pool && typeof pool.execute === "function") {
    return pool.execute(query, params).then(([rows]: any) => rows as T[]);
  }
  const values = [...params];
  const escaped = query.replace(/\?/g, () => {
    const value = values.shift();
    if (value === null || value === undefined) return "NULL";
    if (typeof value === "number") return String(value);
    return `'${String(value).replace(/'/g, "''")}'`;
  });
  return (db as any).execute(sql.raw(escaped)).then((result: any) => result?.rows || result);
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

export async function ensureBodyCinemaEvidenceSchema(): Promise<void> {
  await rawExec(`CREATE TABLE IF NOT EXISTS body_cinema_source_evidence (
    id VARCHAR(36) PRIMARY KEY,
    creator_id BIGINT NOT NULL,
    source_asset_url TEXT NOT NULL,
    source_fingerprint CHAR(64) NOT NULL,
    source_type VARCHAR(16) NOT NULL,
    analysis_version VARCHAR(96) NOT NULL,
    evidence_json JSON NOT NULL,
    analysis_status VARCHAR(32) NOT NULL,
    review_status VARCHAR(32) NOT NULL DEFAULT 'needs_review',
    selected_direction_id VARCHAR(64) DEFAULT NULL,
    analysis_score INT NOT NULL,
    rejection_reasons JSON DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uniq_body_cinema_evidence_source (creator_id, source_fingerprint),
    INDEX idx_body_cinema_evidence_creator (creator_id),
    INDEX idx_body_cinema_evidence_status (analysis_status, review_status)
  )`);
}

function landmarkConfidence(landmark?: BodyCinemaLandmark): number {
  if (!landmark) return 0;
  if (typeof landmark.visibility === "number") return clamp(landmark.visibility);
  return Number.isFinite(landmark.x) && Number.isFinite(landmark.y) ? 1 : 0;
}

function groupConfidence(frame: BodyCinemaFrameEvidence, points: number[]): number {
  const values = points.map((index) => landmarkConfidence(frame.landmarks[index])).filter((value) => value > 0);
  if (!values.length) return 0;
  return values.reduce((total, value) => total + value, 0) / values.length;
}

function centroid(frame: BodyCinemaFrameEvidence, points: number[]): { x: number; y: number } | null {
  const visible = points
    .map((index) => frame.landmarks[index])
    .filter((landmark) => landmark && landmarkConfidence(landmark) >= MIN_CONFIDENCE);
  if (!visible.length) return null;
  return {
    x: visible.reduce((total, landmark) => total + landmark.x, 0) / visible.length,
    y: visible.reduce((total, landmark) => total + landmark.y, 0) / visible.length,
  };
}

function visibleCount(frame: BodyCinemaFrameEvidence): number {
  return frame.landmarks.filter((landmark) => landmarkConfidence(landmark) >= MIN_CONFIDENCE).length;
}

function buildBodyMap(frames: BodyCinemaFrameEvidence[]): Record<string, number> {
  const result: Record<string, number> = {};
  for (const [group, points] of Object.entries(BODY_GROUPS)) {
    const values = frames.map((frame) => groupConfidence(frame, points)).filter((value) => value > 0);
    result[group] = values.length ? Number((values.reduce((sum, value) => sum + value, 0) / values.length).toFixed(3)) : 0;
  }
  const torsoCentres = frames.map((frame) => centroid(frame, BODY_GROUPS.torso)).filter(Boolean) as Array<{ x: number; y: number }>;
  const movement = torsoCentres.length > 1
    ? torsoCentres.slice(1).reduce((sum, point, index) => {
        const previous = torsoCentres[index];
        return sum + Math.hypot(point.x - previous.x, point.y - previous.y);
      }, 0) / Math.max(1, torsoCentres.length - 1)
    : 0;
  result.motion = Number(clamp(movement * 7).toFixed(3));
  result.frameCoverage = Number((frames.reduce((sum, frame) => sum + visibleCount(frame), 0) / Math.max(1, frames.length * 33)).toFixed(3));
  return result;
}

function availableFeatures(bodyMap: Record<string, number>): string[] {
  return Object.entries(bodyMap)
    .filter(([key, value]) => !["motion", "frameCoverage"].includes(key) && value >= MIN_CONFIDENCE)
    .sort((a, b) => b[1] - a[1])
    .map(([key]) => key);
}

function fingerprintDistance(left?: string, right?: string): number {
  if (!left || !right || left.length !== right.length) return 0;
  let differences = 0;
  for (let index = 0; index < left.length; index += 1) {
    if (left[index] !== right[index]) differences += 1;
  }
  return differences / Math.max(1, left.length);
}

export function deriveScenesAndShotRankings(frames: BodyCinemaFrameEvidence[]): {
  scenes: Array<{ sceneId: number; startMs: number; endMs: number; representativeTimestampMs: number }>;
  shotRankings: BodyCinemaShotRanking[];
} {
  const ordered = [...frames].sort((left, right) => left.timestampMs - right.timestampMs);
  let sceneId = 0;
  const scenes: Array<{ sceneId: number; startMs: number; endMs: number; representativeTimestampMs: number }> = [];
  const frameSceneIds = new Map<number, number>();
  let currentStart = ordered[0]?.timestampMs || 0;

  ordered.forEach((frame, index) => {
    const previous = ordered[index - 1];
    const visualChange = previous ? fingerprintDistance(previous.frameFingerprint, frame.frameFingerprint) : 0;
    if (previous && visualChange >= 0.24) {
      scenes.push({ sceneId, startMs: currentStart, endMs: previous.timestampMs, representativeTimestampMs: previous.timestampMs });
      sceneId += 1;
      currentStart = frame.timestampMs;
    }
    frameSceneIds.set(frame.timestampMs, sceneId);
  });
  if (ordered.length) {
    const finalFrame = ordered[ordered.length - 1];
    scenes.push({ sceneId, startMs: currentStart, endMs: finalFrame.timestampMs, representativeTimestampMs: finalFrame.timestampMs });
  }

  const shotRankings = ordered.map((frame) => {
    const visible = visibleCount(frame);
    const poseCoverage = visible / 33;
    const regionSupport = ["face", "shoulders", "torso", "hips", "arms", "legs"]
      .map((group) => groupConfidence(frame, BODY_GROUPS[group]))
      .sort((left, right) => right - left)
      .slice(0, 3)
      .reduce((total, value) => total + value, 0) / 3;
    const brightness = typeof frame.brightness === "number" ? clamp(1 - Math.abs(frame.brightness - 0.55) * 1.6) : 0.65;
    const sharpness = typeof frame.sharpness === "number" ? clamp(frame.sharpness) : 0.5;
    const faceSupport = frame.face?.present ? clamp((frame.face.coverage || 0) * 12 + (1 - Math.abs((frame.face.centerX ?? 0.5) - 0.5) * 1.5)) : poseCoverage * 0.35;
    const subjectCoverage = clamp(frame.subjectCoverage ?? poseCoverage);
    const cropSafety = clamp(1 - Math.max(0, Math.abs((frame.face?.centerX ?? 0.5) - 0.5) - 0.25) * 2);
    const contrast = typeof frame.contrast === "number" ? clamp(frame.contrast) : 0.5;
    const score = Math.round(clamp(poseCoverage * 0.2 + regionSupport * 0.2 + sharpness * 0.18 + brightness * 0.1 + faceSupport * 0.14 + subjectCoverage * 0.1 + cropSafety * 0.05 + contrast * 0.03) * 100);
    return {
      timestampMs: frame.timestampMs,
      sceneId: frameSceneIds.get(frame.timestampMs) || 0,
      score,
      visibleLandmarks: visible,
      faceSupport: Number(faceSupport.toFixed(3)),
      subjectCoverage: Number(subjectCoverage.toFixed(3)),
      cropSafety: Number(cropSafety.toFixed(3)),
      reason: `Pose ${Math.round(poseCoverage * 100)}%, face framing ${Math.round(faceSupport * 100)}%, subject coverage ${Math.round(subjectCoverage * 100)}%, crop safety ${Math.round(cropSafety * 100)}%, sharpness ${Math.round(sharpness * 100)}%.`,
    };
  }).sort((left, right) => right.score - left.score);

  return { scenes, shotRankings };
}

function chooseRankedShot(rankings: BodyCinemaShotRanking[], score: (shot: BodyCinemaShotRanking) => number, used: Set<number>): BodyCinemaShotRanking | null {
  const available = rankings.filter((shot) => !used.has(shot.timestampMs));
  const pool = available.length ? available : rankings;
  const selected = [...pool].sort((left, right) => score(right) - score(left))[0] || null;
  if (selected) used.add(selected.timestampMs);
  return selected;
}

function compileTreatmentTimeline(treatment: BodyCinemaDirection["id"], rankings: BodyCinemaShotRanking[], sourceDurationMs: number): BodyCinemaTimelineBeat[] {
  const used = new Set<number>();
  const portrait = () => chooseRankedShot(rankings, (shot) => shot.faceSupport * 0.55 + shot.cropSafety * 0.25 + shot.score / 100 * 0.2, used);
  const silhouette = () => chooseRankedShot(rankings, (shot) => shot.subjectCoverage * 0.4 + shot.cropSafety * 0.3 + shot.score / 100 * 0.3, used);
  const motion = () => chooseRankedShot(rankings, (shot) => (shot.timestampMs / Math.max(1, sourceDurationMs)) * 0.2 + shot.score / 100 * 0.8, used);
  const select = treatment === "portrait-command" ? portrait : treatment === "silhouette-control" ? silhouette : motion;
  const fallback: BodyCinemaShotRanking = rankings[0] || { timestampMs: 0, score: 0, reason: "No ranked source shot is available.", sceneId: 0, visibleLandmarks: 0, faceSupport: 0, subjectCoverage: 0, cropSafety: 0 };
  const shots = Array.from({ length: 5 }, () => select() || fallback);
  const recipe = treatment === "portrait-command"
    ? { crop: "Chest-up center-safe crop; retain face and shoulder line.", grade: "Neutral skin-preserving contrast with subtle warm highlights.", directions: ["Open on face-framed source shot.", "Hold a composed three-quarter frame.", "Use a restrained push toward the expression-supported frame.", "Return to the clearest face-and-shoulder frame.", "End on a stable face-led hold for loop continuity."] }
    : treatment === "silhouette-control"
      ? { crop: "Mid-shot composition that protects subject-mask edges and negative space.", grade: "Controlled high-contrast editorial grade with background separation.", directions: ["Open on the clearest subject-mask separation.", "Move to the strongest structural full-body framing.", "Hold the silhouette-supported frame without artificial zoom.", "Reserve the highest crop-safety composition for the paid payoff.", "Loop through the cleanest structural exit frame."] }
      : { crop: "Tracked medium crop with directional room ahead of observed motion.", grade: "Crisp motion-led contrast with restrained color bias.", directions: ["Open on the earliest stable motion frame.", "Build through an observed gesture or torso path.", "Use the most dynamic supported frame as the restraint beat.", "Deliver the highest-quality moving composition as paid payoff.", "Close on a motion-compatible frame that can loop without a jump."] };
  const beatIds: BodyCinemaTimelineBeat["id"][] = ["hook", "build", "restraint", "payoff", "loop"];
  return beatIds.map((id, index) => ({
    id,
    startMs: index * 1100,
    endMs: (index + 1) * 1100,
    sourceTimestampMs: shots[index].timestampMs,
    crop: recipe.crop,
    grade: recipe.grade,
    direction: recipe.directions[index],
    supportedBy: [`Source shot ${Math.round(shots[index].timestampMs / 100) / 10}s`, `Scene ${shots[index].sceneId + 1}`, `Shot score ${shots[index].score}/100`, shots[index].reason],
  }));
}

export function deriveBodyCinemaDirections(frames: BodyCinemaFrameEvidence[]): {
  bodyMap: Record<string, number>;
  scenes: Array<{ sceneId: number; startMs: number; endMs: number; representativeTimestampMs: number }>;
  shotRankings: BodyCinemaShotRanking[];
  directions: BodyCinemaDirection[];
  analysisScore: number;
  rejectionReasons: string[];
} {
  const bodyMap = buildBodyMap(frames);
  const { scenes, shotRankings } = deriveScenesAndShotRankings(frames);
  const rejectionReasons: string[] = [];
  const averageVisible = frames.length
    ? frames.reduce((sum, frame) => sum + visibleCount(frame), 0) / frames.length
    : 0;
  const features = availableFeatures(bodyMap);

  if (frames.length < MIN_FRAME_COUNT) rejectionReasons.push(`Analyze at least ${MIN_FRAME_COUNT} sampled frames before planning a Body Cinema direction.`);
  if (averageVisible < MIN_VISIBLE_LANDMARKS) rejectionReasons.push("Pose confidence was too low to identify enough source landmarks. Use a clearer, unobstructed source frame.");
  if (features.length < 2) rejectionReasons.push("The source does not expose enough reliable body regions to support a truthful cinematic plan.");

  const sourceScore = clamp(
    bodyMap.frameCoverage * 0.45 +
    Math.min(1, features.length / 4) * 0.35 +
    Math.min(1, frames.length / 5) * 0.2,
  );
  const analysisScore = Math.round(sourceScore * 100);

  const bestShot = shotRankings[0];
  const bestShotEvidence = bestShot
    ? `Best source shot: ${Math.round(bestShot.timestampMs / 100) / 10}s in scene ${bestShot.sceneId + 1}, scored ${bestShot.score}/100 because ${bestShot.reason}`
    : "No ranked source shot was available.";

  const directions: BodyCinemaDirection[] = [
    {
      id: "portrait-command" as const,
      label: "Portrait Command",
      camera: "Controlled slow push-in from a chest-up, three-quarter frame.",
      movement: "Minimal head-and-shoulder shift; reserve movement for one deliberate glance or shoulder turn.",
      bodyFocus: ["face", "shoulders", "torso"].filter((region) => bodyMap[region] >= 0.35),
      composition: "Keep the face and shoulder line within the center safe zone; no artificial crop below the waist.",
      evidence: [
        `Face confidence ${Math.round(bodyMap.face * 100)}%.`,
        `Shoulder confidence ${Math.round(bodyMap.shoulders * 100)}%.`,
        `Center-frame coverage ${Math.round(bodyMap.frameCoverage * 100)}%.`,
        bestShotEvidence,
      ],
      confidence: Math.round(clamp(bodyMap.face * 0.45 + bodyMap.shoulders * 0.35 + bodyMap.torso * 0.2) * 100),
      distinction: "Identity-led close framing and micro-expression, not a silhouette or motion treatment.",
    },
    {
      id: "silhouette-control" as const,
      label: "Silhouette Control",
      camera: "Slow lateral glide around a stable three-quarter mid-shot with rim light separating the body from the background.",
      movement: "Keep the pose still; use one measured hip or torso transition rather than a full-body performance.",
      bodyFocus: ["torso", "hips", "legs"].filter((region) => bodyMap[region] >= 0.35),
      composition: "Preserve torso and hip geometry inside the frame; protect hands and knees from edge clipping.",
      evidence: [
        `Torso confidence ${Math.round(bodyMap.torso * 100)}%.`,
        `Hip confidence ${Math.round(bodyMap.hips * 100)}%.`,
        `Leg confidence ${Math.round(bodyMap.legs * 100)}%.`,
        bestShotEvidence,
      ],
      confidence: Math.round(clamp(bodyMap.torso * 0.45 + bodyMap.hips * 0.35 + bodyMap.legs * 0.2) * 100),
      distinction: "Shape-and-light composition with a lateral camera line, not a face-led close-up or motion beat.",
    },
    {
      id: "motion-tension" as const,
      label: "Motion Tension",
      camera: "Tracked medium frame with a restrained forward drift and a visible gesture path.",
      movement: "Build around the observed arm/hand path or torso shift; do not invent complex choreography the source does not support.",
      bodyFocus: ["arms", "torso", "legs"].filter((region) => bodyMap[region] >= 0.35),
      composition: "Leave directional space ahead of the observed gesture and maintain the strongest visible regions in frame.",
      evidence: [
        `Arm confidence ${Math.round(bodyMap.arms * 100)}%.`,
        `Observed torso-motion energy ${Math.round(bodyMap.motion * 100)}%.`,
        `Frame coverage ${Math.round(bodyMap.frameCoverage * 100)}%.`,
        bestShotEvidence,
      ],
      confidence: Math.round(clamp(bodyMap.arms * 0.45 + bodyMap.torso * 0.3 + bodyMap.motion * 0.25) * 100),
      distinction: "Gesture and motion-led treatment with tracked camera energy, not a static portrait or sculptural silhouette.",
    },
  ].map((direction) => ({
    ...direction,
    bodyFocus: direction.bodyFocus.length ? direction.bodyFocus : features.slice(0, 2),
    timeline: compileTreatmentTimeline(direction.id, shotRankings, Math.max(1, ...frames.map((frame) => frame.timestampMs))),
  }));

  if (directions.some((direction) => direction.confidence < 40)) {
    rejectionReasons.push("One or more proposed directions is unsupported by the observed source evidence; only directions above the review threshold may be approved.");
  }

  return { bodyMap, scenes, shotRankings, directions, analysisScore, rejectionReasons };
}

function parseRecord(row: any): BodyCinemaEvidenceRecord {
  const evidence = typeof row.evidence_json === "string" ? JSON.parse(row.evidence_json) : row.evidence_json;
  const rejectionReasons = typeof row.rejection_reasons === "string" ? JSON.parse(row.rejection_reasons) : (row.rejection_reasons || []);
  return {
    id: String(row.id),
    creatorId: Number(row.creator_id),
    sourceMediaUrl: String(row.source_asset_url),
    sourceFingerprint: String(row.source_fingerprint),
    sourceType: row.source_type,
    analysisVersion: String(row.analysis_version),
    analysisStatus: row.analysis_status,
    reviewStatus: row.review_status,
    selectedDirectionId: row.selected_direction_id || null,
    analysisScore: Number(row.analysis_score),
    rejectionReasons,
    bodyMap: evidence.bodyMap || {},
    frameEvidence: evidence.frameEvidence || [],
    scenes: evidence.scenes || [],
    shotRankings: evidence.shotRankings || [],
    directions: evidence.directions || [],
    createdAt: row.created_at ? new Date(row.created_at).toISOString() : undefined,
    updatedAt: row.updated_at ? new Date(row.updated_at).toISOString() : undefined,
  };
}

export async function persistBodyCinemaSourceEvidence(creatorId: number, input: SourceEvidenceInput): Promise<BodyCinemaEvidenceRecord> {
  await ensureBodyCinemaEvidenceSchema();
  const safeFingerprint = /^[a-f0-9]{64}$/i.test(input.sourceFingerprint)
    ? input.sourceFingerprint.toLowerCase()
    : createHash("sha256").update(`${input.sourceMediaUrl}:${JSON.stringify(input.frameEvidence)}`).digest("hex");
  const derived = deriveBodyCinemaDirections(input.frameEvidence);
  const analysisStatus = derived.rejectionReasons.some((reason) => reason.includes("Analyze at least") || reason.includes("Pose confidence") || reason.includes("does not expose"))
    ? "rejected"
    : "verified";
  const reviewStatus = analysisStatus === "verified" ? "needs_review" : "blocked";
  const id = randomUUID();
  const evidence = {
    bodyMap: derived.bodyMap,
    frameEvidence: input.frameEvidence,
    scenes: derived.scenes,
    shotRankings: derived.shotRankings,
    directions: derived.directions,
    sourceDiagnostics: {
      analyzer: input.analysisVersion || EVIDENCE_VERSION,
      landmarkCount: input.frameEvidence.reduce((total, frame) => total + frame.landmarks.length, 0),
      sampledFrameCount: input.frameEvidence.length,
    },
  };

  await rawExec(
    `INSERT INTO body_cinema_source_evidence
      (id, creator_id, source_asset_url, source_fingerprint, source_type, analysis_version, evidence_json, analysis_status, review_status, analysis_score, rejection_reasons)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       id = VALUES(id), source_asset_url = VALUES(source_asset_url), source_type = VALUES(source_type), analysis_version = VALUES(analysis_version), evidence_json = VALUES(evidence_json), analysis_status = VALUES(analysis_status), review_status = VALUES(review_status), selected_direction_id = NULL, analysis_score = VALUES(analysis_score), rejection_reasons = VALUES(rejection_reasons), updated_at = CURRENT_TIMESTAMP`,
    [
      id,
      creatorId,
      input.sourceMediaUrl,
      safeFingerprint,
      input.sourceType,
      input.analysisVersion || EVIDENCE_VERSION,
      JSON.stringify(evidence),
      analysisStatus,
      reviewStatus,
      derived.analysisScore,
      JSON.stringify(derived.rejectionReasons),
    ],
  );

  const rows = await rawClient<any>(
    "SELECT * FROM body_cinema_source_evidence WHERE creator_id = ? AND source_fingerprint = ? LIMIT 1",
    [creatorId, safeFingerprint],
  );
  if (!rows[0]) throw new Error("Body Cinema source evidence could not be read after persistence.");
  return parseRecord(rows[0]);
}

export async function getBodyCinemaSourceEvidence(creatorId: number, evidenceId: string): Promise<BodyCinemaEvidenceRecord | null> {
  await ensureBodyCinemaEvidenceSchema();
  const rows = await rawClient<any>(
    "SELECT * FROM body_cinema_source_evidence WHERE id = ? AND creator_id = ? LIMIT 1",
    [evidenceId, creatorId],
  );
  return rows[0] ? parseRecord(rows[0]) : null;
}

export async function approveBodyCinemaDirection(creatorId: number, evidenceId: string, directionId: string): Promise<BodyCinemaEvidenceRecord> {
  const evidence = await getBodyCinemaSourceEvidence(creatorId, evidenceId);
  if (!evidence) throw new Error("Body Cinema evidence record was not found for this creator.");
  if (evidence.analysisStatus !== "verified") throw new Error("Source evidence was rejected and cannot be used for a generation direction.");
  const direction = evidence.directions.find((candidate) => candidate.id === directionId);
  if (!direction) throw new Error("The selected Body Cinema direction does not exist in this source analysis.");
  if (direction.confidence < 40) throw new Error("The selected direction is not supported by enough visible source evidence.");

  await rawExec(
    "UPDATE body_cinema_source_evidence SET review_status = 'ready', selected_direction_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND creator_id = ?",
    [directionId, evidenceId, creatorId],
  );
  const updated = await getBodyCinemaSourceEvidence(creatorId, evidenceId);
  if (!updated) throw new Error("Approved Body Cinema direction could not be read after update.");
  return updated;
}

export async function assertBodyCinemaEvidenceReady(input: {
  creatorId: number;
  evidenceId?: string | null;
  sourceMediaUrl: string;
}): Promise<{ evidence: BodyCinemaEvidenceRecord; direction: BodyCinemaDirection }> {
  if (!input.evidenceId) throw new Error("Run and approve Body Cinema source analysis before requesting a provider job.");
  const evidence = await getBodyCinemaSourceEvidence(input.creatorId, input.evidenceId);
  if (!evidence) throw new Error("The required Body Cinema source-evidence record was not found.");
  if (evidence.sourceMediaUrl !== input.sourceMediaUrl) throw new Error("The selected analysis belongs to a different source asset. Re-analyze this upload before requesting a provider job.");
  if (evidence.analysisStatus !== "verified" || evidence.reviewStatus !== "ready" || !evidence.selectedDirectionId) {
    throw new Error("Body Cinema source analysis must be verified and one evidence-backed direction must be approved before requesting a provider job.");
  }
  const direction = evidence.directions.find((candidate) => candidate.id === evidence.selectedDirectionId);
  if (!direction) throw new Error("The approved Body Cinema direction is missing from the persisted evidence record.");
  if (direction.confidence < 40) throw new Error("The approved Body Cinema direction does not meet the source-evidence threshold.");
  return { evidence, direction };
}

export function buildEvidenceBackedDirectionPrompt(direction: BodyCinemaDirection): string {
  const beatPlan = direction.timeline
    .map((beat) => `${beat.id} [source ${Math.round(beat.sourceTimestampMs / 100) / 10}s]: ${beat.direction} Crop: ${beat.crop} Grade: ${beat.grade}`)
    .join(" | ");
  return [
    `Evidence-backed Body Cinema treatment: ${direction.label}.`,
    `Camera: ${direction.camera}`,
    `Movement: ${direction.movement}`,
    `Composition: ${direction.composition}`,
    `Supported visible regions: ${direction.bodyFocus.join(", ") || "source-defined safe regions"}.`,
    `Approved timecoded editorial plan: ${beatPlan}.`,
    `Do not invent choreography, body regions, a shot order, or a crop that contradicts this source evidence.`,
  ].join(" ");
}

export function bodyCinemaEvidenceFingerprint(sourceMediaUrl: string, fileName: string, size: number, lastModified: number): string {
  return createHash("sha256").update(`${sourceMediaUrl}|${fileName}|${size}|${lastModified}`).digest("hex");
}
