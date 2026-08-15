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
  motionEnergy?: number;
  visualQuality?: number;
};

export type BodyCinemaPerformanceInsight = {
  id: "opening" | "thumbnail" | "motion" | "framing" | "weakest" | "recommendation";
  label: string;
  timestampMs: number;
  confidence: number;
  why: string;
  action: string;
};

export type BodyCinemaTreatmentGrammar = {
  cameraLanguage: string;
  pace: string;
  framing: string;
  lighting: string;
  typography: string;
  audioFeel: string;
  ending: string;
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
  id: "the-arch" | "silhouette" | "luxury-reveal" | "vip-tease";
  label: string;
  camera: string;
  movement: string;
  bodyFocus: string[];
  composition: string;
  evidence: string[];
  confidence: number;
  distinction: string;
  grammar: BodyCinemaTreatmentGrammar;
  timeline: BodyCinemaTimelineBeat[];
};

export type BodyCinemaEditorFindings = {
  strongestHookTimestampMs: number;
  strongestThumbnailTimestampMs: number;
  strongestExpressionTimestampMs: number;
  strongestAngleTimestampMs: number;
  strongestMotionTimestampMs: number;
  strongestRevealTimestampMs: number;
  strongestCommercialTimestampMs: number;
  strongestLoopTimestampMs: number;
  weakestSectionStartMs: number;
  weakestSectionEndMs: number;
  insights?: BodyCinemaPerformanceInsight[];
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
  editorFindings?: BodyCinemaEditorFindings;
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

const EVIDENCE_VERSION = "adaptive-video-source-intelligence/v3";
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

function average(values: number[]): number {
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
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

function frameMotionEnergy(frame: BodyCinemaFrameEvidence, previous?: BodyCinemaFrameEvidence): number {
  if (!previous) return 0;
  const currentTorso = centroid(frame, BODY_GROUPS.torso) || centroid(frame, BODY_GROUPS.shoulders);
  const previousTorso = centroid(previous, BODY_GROUPS.torso) || centroid(previous, BODY_GROUPS.shoulders);
  if (!currentTorso || !previousTorso) return 0;
  const travel = Math.hypot(currentTorso.x - previousTorso.x, currentTorso.y - previousTorso.y);
  const sceneShift = fingerprintDistance(previous.frameFingerprint, frame.frameFingerprint);
  return Number(clamp(travel * 8 + sceneShift * 0.35).toFixed(3));
}

function frameVisualQuality(frame: BodyCinemaFrameEvidence): number {
  const brightness = typeof frame.brightness === "number" ? clamp(1 - Math.abs(frame.brightness - 0.55) * 1.6) : 0.65;
  const sharpness = typeof frame.sharpness === "number" ? clamp(frame.sharpness) : 0.5;
  const contrast = typeof frame.contrast === "number" ? clamp(frame.contrast) : 0.5;
  const coverage = clamp(frame.subjectCoverage ?? visibleCount(frame) / 33);
  return Number(clamp(brightness * 0.25 + sharpness * 0.35 + contrast * 0.2 + coverage * 0.2).toFixed(3));
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

  const shotRankings = ordered.map((frame, index) => {
    const previous = ordered[index - 1];
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
    const motionEnergy = frameMotionEnergy(frame, previous);
    const visualQuality = frameVisualQuality(frame);
    const score = Math.round(clamp(poseCoverage * 0.18 + regionSupport * 0.18 + sharpness * 0.15 + brightness * 0.08 + faceSupport * 0.13 + subjectCoverage * 0.08 + cropSafety * 0.05 + contrast * 0.03 + motionEnergy * 0.07 + visualQuality * 0.05) * 100);
    return {
      timestampMs: frame.timestampMs,
      sceneId: frameSceneIds.get(frame.timestampMs) || 0,
      score,
      visibleLandmarks: visible,
      faceSupport: Number(faceSupport.toFixed(3)),
      subjectCoverage: Number(subjectCoverage.toFixed(3)),
      cropSafety: Number(cropSafety.toFixed(3)),
      motionEnergy,
      visualQuality,
      reason: `Pose ${Math.round(poseCoverage * 100)}%, face framing ${Math.round(faceSupport * 100)}%, subject coverage ${Math.round(subjectCoverage * 100)}%, motion ${Math.round(motionEnergy * 100)}%, crop safety ${Math.round(cropSafety * 100)}%, sharpness ${Math.round(sharpness * 100)}%.`,
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

const TREATMENT_GRAMMAR: Record<BodyCinemaDirection["id"], BodyCinemaTreatmentGrammar> = {
  "the-arch": {
    cameraLanguage: "Measured three-quarter movement that protects the body line before the payoff.",
    pace: "Deliberate build with a late, held reveal.",
    framing: "Torso-and-hip structural line with no aggressive crop chase.",
    lighting: "Sculpted side-light contrast with controlled shadow detail.",
    typography: "Sparse, low-positioned statement that arrives after the opening frame settles.",
    audioFeel: "Low-pressure rise with room for the source movement to breathe.",
    ending: "Stable full-form hold that resolves with confidence.",
  },
  "silhouette": {
    cameraLanguage: "Still, graphic full-form composition with almost no synthetic movement.",
    pace: "Slowest treatment: shape and negative space carry the tension.",
    framing: "Protected subject edge and full-body negative space.",
    lighting: "Deep contrast with an emphasis on separation, not skin smoothing.",
    typography: "Minimal top line; no caption competes with the outline.",
    audioFeel: "Restrained pulse or near-silent atmosphere.",
    ending: "Quiet, loop-safe exit that preserves the outline.",
  },
  "luxury-reveal": {
    cameraLanguage: "Face-and-detail-led campaign framing that opens calm and grows richer.",
    pace: "Controlled polish; details unfold before the reveal rather than rushing it.",
    framing: "Safe face, shoulder, and texture composition with a later full-form release.",
    lighting: "Warm highlights, retained natural texture, and private-suite softness.",
    typography: "Elegant small-caps line with a measured entrance and exit.",
    audioFeel: "Warm, private, and polished rather than percussive.",
    ending: "A composed final hold that feels like a campaign close.",
  },
  "vip-tease": {
    cameraLanguage: "Immediate vertical hook followed by a compact tension-and-payoff sequence.",
    pace: "Fastest treatment: decisive opening, short hold, then a cliffhanger.",
    framing: "Safe first-second crop with the strongest visual held for private-access payoff.",
    lighting: "Crisp high-contrast teaser finish that protects detail.",
    typography: "Short kinetic access line that lands on the beat and clears before payoff.",
    audioFeel: "Sharper pulse with an intentional cut before full resolution.",
    ending: "Unresolved exit designed to create a next-action impulse.",
  },
};

function compileTreatmentTimeline(treatment: BodyCinemaDirection["id"], rankings: BodyCinemaShotRanking[], sourceDurationMs: number): BodyCinemaTimelineBeat[] {
  const used = new Set<number>();
  const arch = () => chooseRankedShot(rankings, (shot) => shot.subjectCoverage * 0.34 + shot.cropSafety * 0.28 + shot.score / 100 * 0.24 + (shot.timestampMs / Math.max(1, sourceDurationMs)) * 0.14, used);
  const silhouette = () => chooseRankedShot(rankings, (shot) => shot.subjectCoverage * 0.42 + shot.cropSafety * 0.34 + shot.score / 100 * 0.24, used);
  const luxury = () => chooseRankedShot(rankings, (shot) => shot.faceSupport * 0.4 + shot.cropSafety * 0.32 + shot.score / 100 * 0.28, used);
  const vip = () => chooseRankedShot(rankings, (shot) => shot.faceSupport * 0.3 + shot.score / 100 * 0.45 + (1 - shot.timestampMs / Math.max(1, sourceDurationMs)) * 0.25, used);
  const select = treatment === "the-arch" ? arch : treatment === "silhouette" ? silhouette : treatment === "luxury-reveal" ? luxury : vip;
  const fallback: BodyCinemaShotRanking = rankings[0] || { timestampMs: 0, score: 0, reason: "No ranked source shot is available.", sceneId: 0, visibleLandmarks: 0, faceSupport: 0, subjectCoverage: 0, cropSafety: 0 };
  const shots = Array.from({ length: 5 }, () => select() || fallback);
  const recipe = treatment === "the-arch"
    ? { crop: "Three-quarter medium crop that protects torso and hip geometry.", grade: "Sculpted side-light contrast with controlled shadow detail.", directions: ["Open on the clearest structural body line.", "Let the frame hold before movement begins.", "Use the strongest supported hip or torso transition as the tension beat.", "Delay the cleanest full-form composition for the payoff.", "Close on a stable structural frame that loops without a jump."] }
    : treatment === "silhouette"
      ? { crop: "Mid-shot composition that protects subject-mask edges and negative space.", grade: "Controlled high-contrast editorial grade with background separation.", directions: ["Open on the clearest subject-mask separation.", "Move to the strongest structural full-body framing.", "Hold the silhouette-supported frame without artificial zoom.", "Reserve the highest crop-safety composition for the payoff.", "Loop through the cleanest structural exit frame."] }
      : treatment === "luxury-reveal"
        ? { crop: "Face-and-shoulder safe crop that reveals detail gradually.", grade: "Warm private-campaign grade with retained texture and soft highlights.", directions: ["Begin on a composed, low-pressure frame.", "Build through the clearest face-and-shoulder detail.", "Pause before the reveal instead of accelerating.", "Use the strongest polished framing as the reveal.", "Return to a quiet, stable final hold."] }
        : { crop: "Tight early-hook crop with safe room for a rapid vertical teaser.", grade: "Crisp high-contrast teaser grade with a decisive first second.", directions: ["Lead with the earliest high-quality visual hook.", "Move immediately to the most legible supporting frame.", "Create a short tension hold before the payoff.", "Give the clearest high-score frame the private-access payoff.", "End with a deliberate cliffhanger frame, not a full resolution."] };
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
  editorFindings: BodyCinemaEditorFindings;
} {
  const bodyMap = buildBodyMap(frames);
  const { scenes, shotRankings } = deriveScenesAndShotRankings(frames);
  const rejectionReasons: string[] = [];
  const visibleLandmarkCounts = frames.map((frame) => visibleCount(frame));
  const averageVisible = average(visibleLandmarkCounts);
  const strongestVisible = Math.max(0, ...visibleLandmarkCounts);
  const supportedFrameCount = visibleLandmarkCounts.filter((count) => count >= MIN_VISIBLE_LANDMARKS).length;
  const features = availableFeatures(bodyMap);

  const temporalShots = [...shotRankings].sort((a, b) => a.timestampMs - b.timestampMs);
  const earlyShots = temporalShots.filter((shot) => shot.timestampMs <= 3000);
  const strongestHook = [...(earlyShots.length ? earlyShots : temporalShots)].sort((a, b) => b.score - a.score)[0] || shotRankings[0];
  const strongestThumbnail = [...shotRankings].sort((a, b) => (b.faceSupport * 0.6 + b.score / 100 * 0.4) - (a.faceSupport * 0.6 + a.score / 100 * 0.4))[0] || shotRankings[0];
  const strongestMotion = [...shotRankings].sort((a, b) => Number(b.motionEnergy || 0) - Number(a.motionEnergy || 0))[0] || shotRankings[0];
  const strongestFraming = [...shotRankings].sort((a, b) => (b.subjectCoverage * 0.55 + b.cropSafety * 0.45) - (a.subjectCoverage * 0.55 + a.cropSafety * 0.45))[0] || shotRankings[0];
  const strongestLoop = [...temporalShots.slice(-Math.max(1, Math.ceil(temporalShots.length / 3)))].sort((a, b) => b.score - a.score)[0] || shotRankings[0];
  const weakestShot = [...shotRankings].sort((a, b) => a.score - b.score)[0] || shotRankings[0];
  const editorFindings: BodyCinemaEditorFindings = {
    strongestHookTimestampMs: strongestHook?.timestampMs || 0,
    strongestThumbnailTimestampMs: strongestThumbnail?.timestampMs || 0,
    strongestExpressionTimestampMs: strongestThumbnail?.timestampMs || 0,
    strongestAngleTimestampMs: strongestFraming?.timestampMs || 0,
    strongestMotionTimestampMs: strongestMotion?.timestampMs || 0,
    strongestRevealTimestampMs: shotRankings[0]?.timestampMs || 0,
    strongestCommercialTimestampMs: shotRankings[0]?.timestampMs || 0,
    strongestLoopTimestampMs: strongestLoop?.timestampMs || 0,
    weakestSectionStartMs: weakestShot?.timestampMs || 0,
    weakestSectionEndMs: (weakestShot?.timestampMs || 0) + 1000,
    insights: [
      { id: "opening", label: "Strongest opening", timestampMs: strongestHook?.timestampMs || 0, confidence: strongestHook?.score || 0, why: strongestHook?.reason || "No supported opening frame was measured.", action: "Lead with this moment so the opening is grounded in your clearest early frame." },
      { id: "thumbnail", label: "Best cover moment", timestampMs: strongestThumbnail?.timestampMs || 0, confidence: strongestThumbnail?.score || 0, why: strongestThumbnail?.reason || "No supported cover frame was measured.", action: "Use this frame for the cover because it combines face support and clean composition." },
      { id: "motion", label: "Strongest movement", timestampMs: strongestMotion?.timestampMs || 0, confidence: Math.round(Number(strongestMotion?.motionEnergy || 0) * 100), why: strongestMotion?.reason || "No supported movement frame was measured.", action: "Build the transition around this natural movement instead of inventing choreography." },
      { id: "framing", label: "Strongest body framing", timestampMs: strongestFraming?.timestampMs || 0, confidence: strongestFraming?.score || 0, why: strongestFraming?.reason || "No supported full-form frame was measured.", action: "Reserve this composition for the reveal or the held payoff." },
      { id: "weakest", label: "Section to protect", timestampMs: weakestShot?.timestampMs || 0, confidence: weakestShot?.score || 0, why: weakestShot?.reason || "No weaker section was measured.", action: "Do not make this section the opening, cover, or payoff; use it only if the treatment needs a brief bridge." },
    ],
  };

  if (frames.length < MIN_FRAME_COUNT) rejectionReasons.push(`Analyze at least ${MIN_FRAME_COUNT} sampled frames before planning a Body Cinema direction.`);
  if (strongestVisible < MIN_VISIBLE_LANDMARKS) rejectionReasons.push("Pose confidence was too low to identify enough source landmarks in any sampled frame. Use a clearer, unobstructed source frame.");
  if (features.length < 1) rejectionReasons.push("The source does not expose a reliable visible region to support a truthful cinematic plan.");

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
      id: "the-arch" as const,
      label: "The Arch",
      camera: "A measured three-quarter medium frame that follows the strongest supported body line.",
      movement: "One controlled torso or hip transition; no invented choreography.",
      bodyFocus: ["torso", "hips", "legs"].filter((region) => bodyMap[region] >= 0.35),
      composition: "Protect torso geometry and leave room for the side-lit structural line.",
      evidence: [
        `Torso confidence ${Math.round(bodyMap.torso * 100)}%.`,
        `Hip confidence ${Math.round(bodyMap.hips * 100)}%.`,
        `Observed motion energy ${Math.round(bodyMap.motion * 100)}%.`,
        bestShotEvidence,
      ],
      confidence: Math.round(clamp(bodyMap.torso * 0.35 + bodyMap.hips * 0.35 + bodyMap.legs * 0.15 + bodyMap.motion * 0.15) * 100),
      distinction: "A sculpted body-line reveal with a delayed payoff—not a silhouette, a face-led edit, or a fast teaser.",
      grammar: TREATMENT_GRAMMAR["the-arch"],
    },
    {
      id: "silhouette" as const,
      label: "Silhouette",
      camera: "A slow lateral glide through the clearest full-form framing and negative space.",
      movement: "Keep the pose restrained; let shape, separation, and stillness carry the frame.",
      bodyFocus: ["torso", "hips", "legs"].filter((region) => bodyMap[region] >= 0.35),
      composition: "Preserve subject edges and structural negative space; protect hands and knees from crop edges.",
      evidence: [
        `Subject coverage ${Math.round(average(frames.map((frame) => Number(frame.subjectCoverage || 0))) * 100)}%.`,
        `Torso confidence ${Math.round(bodyMap.torso * 100)}%.`,
        `Leg confidence ${Math.round(bodyMap.legs * 100)}%.`,
        bestShotEvidence,
      ],
      confidence: Math.round(clamp(bodyMap.torso * 0.4 + bodyMap.hips * 0.3 + bodyMap.legs * 0.2 + bodyMap.frameCoverage * 0.1) * 100),
      distinction: "A graphic shape-and-light composition with a full-form hold—not The Arch, a polished reveal, or a teaser hook.",
      grammar: TREATMENT_GRAMMAR.silhouette,
    },
    {
      id: "luxury-reveal" as const,
      label: "Luxury Reveal",
      camera: "A face-and-shoulder-led reveal that moves from calm detail toward a polished private-campaign payoff.",
      movement: "Slow, controlled movement with one deliberate reveal; texture and framing matter more than speed.",
      bodyFocus: ["face", "shoulders", "torso"].filter((region) => bodyMap[region] >= 0.35),
      composition: "Keep the face and shoulder line in the safe center frame while protecting natural texture.",
      evidence: [
        `Face confidence ${Math.round(bodyMap.face * 100)}%.`,
        `Shoulder confidence ${Math.round(bodyMap.shoulders * 100)}%.`,
        `Center-frame coverage ${Math.round(bodyMap.frameCoverage * 100)}%.`,
        bestShotEvidence,
      ],
      confidence: Math.round(clamp(bodyMap.face * 0.45 + bodyMap.shoulders * 0.3 + bodyMap.torso * 0.15 + bodyMap.frameCoverage * 0.1) * 100),
      distinction: "A gradual, detail-led private campaign reveal—not a body-line composition, silhouette, or rapid-access teaser.",
      grammar: TREATMENT_GRAMMAR["luxury-reveal"],
    },
    {
      id: "vip-tease" as const,
      label: "VIP Tease",
      camera: "A tight vertical teaser built around the earliest high-quality visual hook and a clear cliffhanger ending.",
      movement: "Short, decisive progression: hook, tension, private payoff, then an unresolved exit.",
      bodyFocus: ["face", "arms", "torso"].filter((region) => bodyMap[region] >= 0.35),
      composition: "Use the clearest safe crop in the first second, then reserve the best-supported frame for a private-access payoff.",
      evidence: [
        `Earliest usable frame quality ${Math.round((shotRankings[shotRankings.length - 1]?.score || 0))}/100.`,
        `Arm confidence ${Math.round(bodyMap.arms * 100)}%.`,
        `Observed motion energy ${Math.round(bodyMap.motion * 100)}%.`,
        bestShotEvidence,
      ],
      confidence: Math.round(clamp(bodyMap.arms * 0.25 + bodyMap.torso * 0.25 + bodyMap.motion * 0.3 + bodyMap.frameCoverage * 0.2) * 100),
      distinction: "A fast access-hook sequence with an intentional cliffhanger—not a gradual luxury reveal, a structural arch, or a still silhouette.",
      grammar: TREATMENT_GRAMMAR["vip-tease"],
    },
  ].map((direction) => ({
    ...direction,
    bodyFocus: direction.bodyFocus.length ? direction.bodyFocus : features.slice(0, 2),
    timeline: compileTreatmentTimeline(direction.id, shotRankings, Math.max(1, ...frames.map((frame) => frame.timestampMs))),
  }));

  const recommendedDirection = [...directions].sort((left, right) => right.confidence - left.confidence)[0];
  if (recommendedDirection && editorFindings.insights) {
    editorFindings.insights.push({
      id: "recommendation",
      label: `Recommended treatment: ${recommendedDirection.label}`,
      timestampMs: recommendedDirection.timeline[0]?.sourceTimestampMs || 0,
      confidence: recommendedDirection.confidence,
      why: `${recommendedDirection.distinction} ${recommendedDirection.evidence[0] || ""}`.trim(),
      action: `Build this as a ${recommendedDirection.grammar.pace.toLowerCase()} ${recommendedDirection.grammar.ending.toLowerCase()}`,
    });
  }

  if (!directions.some((direction) => direction.confidence >= 40)) {
    rejectionReasons.push("No proposed direction is supported by enough observed source evidence to be approved.");
  }
  if (supportedFrameCount < 1) {
    rejectionReasons.push("No sampled frame reached the visible-landmark evidence threshold needed for a truthful treatment plan.");
  }

  return { bodyMap, scenes, shotRankings, directions, analysisScore, rejectionReasons, editorFindings };
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
    directions: (evidence.directions || []).map((direction: BodyCinemaDirection) => ({
      ...direction,
      grammar: direction.grammar || TREATMENT_GRAMMAR[direction.id],
    })),
    editorFindings: evidence.editorFindings || undefined,
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
    editorFindings: derived.editorFindings,
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

export async function invalidateBodyCinemaSourceEvidence(input: {
  creatorId: number;
  evidenceId: string;
  reason: string;
  invalidatedBy: number;
}): Promise<BodyCinemaEvidenceRecord> {
  const evidence = await getBodyCinemaSourceEvidence(input.creatorId, input.evidenceId);
  if (!evidence) throw new Error("Body Cinema evidence record was not found for this creator.");
  const reason = String(input.reason || "").trim();
  if (!reason) throw new Error("An invalidation reason is required.");
  const rejectionReasons = [...new Set([
    ...evidence.rejectionReasons,
    `Invalidated by owner ${input.invalidatedBy}: ${reason}`,
  ])];

  await rawExec(
    `UPDATE body_cinema_source_evidence
     SET analysis_status = 'rejected', review_status = 'blocked', selected_direction_id = NULL,
         rejection_reasons = ?, updated_at = CURRENT_TIMESTAMP
     WHERE id = ? AND creator_id = ?`,
    [JSON.stringify(rejectionReasons), input.evidenceId, input.creatorId],
  );
  const invalidated = await getBodyCinemaSourceEvidence(input.creatorId, input.evidenceId);
  if (!invalidated) throw new Error("Body Cinema evidence could not be read after invalidation.");
  return invalidated;
}

export async function getBodyCinemaSourceUrlBlock(creatorId: number, sourceMediaUrl: string): Promise<{ evidenceId: string; reasons: string[] } | null> {
  await ensureBodyCinemaEvidenceSchema();
  const rows = await rawClient<any>(
    "SELECT id, rejection_reasons FROM body_cinema_source_evidence WHERE creator_id = ? AND source_asset_url = ? AND analysis_status = 'rejected' AND review_status = 'blocked' ORDER BY updated_at DESC LIMIT 1",
    [creatorId, sourceMediaUrl],
  );
  if (!rows.length) return null;
  const rawReasons = typeof rows[0].rejection_reasons === "string" ? JSON.parse(rows[0].rejection_reasons || "[]") : rows[0].rejection_reasons;
  return { evidenceId: String(rows[0].id), reasons: Array.isArray(rawReasons) ? rawReasons.map(String) : [] };
}

export async function invalidateBodyCinemaSourceEvidenceForUrl(input: {
  creatorId: number;
  sourceMediaUrl: string;
  reason: string;
  invalidatedBy: number;
}): Promise<{ invalidatedCount: number; evidenceIds: string[] }> {
  await ensureBodyCinemaEvidenceSchema();
  const rows = await rawClient<any>(
    "SELECT id, analysis_status FROM body_cinema_source_evidence WHERE creator_id = ? AND source_asset_url = ?",
    [input.creatorId, input.sourceMediaUrl],
  );

  if (!rows.length) {
    const evidenceId = randomUUID();
    const sourceFingerprint = createHash("sha256").update(input.sourceMediaUrl).digest("hex");
    const emptyEvidence = JSON.stringify({
      bodyMap: {},
      frameEvidence: [],
      scenes: [],
      shotRankings: [],
      directions: [],
      editorFindings: null,
      sourceBlock: { reason: input.reason, inspectedBy: input.invalidatedBy, recordedAt: new Date().toISOString() },
    });
    await rawExec(
      `INSERT INTO body_cinema_source_evidence
        (id, creator_id, source_asset_url, source_fingerprint, source_type, analysis_version, evidence_json, analysis_status, review_status, selected_direction_id, analysis_score, rejection_reasons)
       VALUES (?, ?, ?, ?, 'video', 'source-integrity-block/v1', ?, 'rejected', 'blocked', NULL, 0, ?)`,
      [evidenceId, input.creatorId, input.sourceMediaUrl, sourceFingerprint, emptyEvidence, JSON.stringify([input.reason])],
    );
    return { invalidatedCount: 1, evidenceIds: [evidenceId] };
  }

  const evidenceIds: string[] = [];
  for (const row of rows) {
    if (String(row.analysis_status) === "rejected") {
      evidenceIds.push(String(row.id));
      continue;
    }
    const evidence = await invalidateBodyCinemaSourceEvidence({
      creatorId: input.creatorId,
      evidenceId: String(row.id),
      reason: input.reason,
      invalidatedBy: input.invalidatedBy,
    });
    evidenceIds.push(evidence.id);
  }
  return { invalidatedCount: evidenceIds.length, evidenceIds };
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
