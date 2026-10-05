import { randomUUID } from "node:crypto";
import { sql } from "drizzle-orm";
import { db } from "../db";
import {
  getBodyCinemaSourceEvidence,
  type BodyCinemaEvidenceRecord,
  type BodyCinemaFrameEvidence,
} from "./bodyCinemaEvidenceService";
import {
  BODY_DIRECTED_SOURCE_MAP_VERSION,
  BODY_FOCUS_TREATMENTS,
  bodyDirectedAllowedCropProofsForRange,
  bodyDirectedDetailObservationSchema,
  bodyDirectedFrameEvidenceListSchema,
  bodyDirectedSourceIdentitySchema,
  bodyDirectedSourceMapSchema,
  findBodyFocus,
  findBodyTreatment,
  type BodyDirectedDetailObservation,
  type BodyDirectedFrameEvidence,
  type BodyDirectedOriginalSourceContextCrop,
  type BodyDirectedRegionName,
  type BodyDirectedSourceIdentity,
  type BodyDirectedSourceMap,
  type BodyDirectedTreatment,
  type BodyDirectedUsableRange,
} from "../../shared/bodyCinemaBodyDirection";

export type SourceMapEvidenceState = "verified" | "insufficient" | "not_available";
export type SourceMapRoute = "source_preserving_assembly" | "source_preserving_precision_finish" | "restricted_generated_transform";

export type BodyCinemaSourceMap = {
  id: string;
  creatorId: number;
  evidenceId: string;
  sourceMediaUrl: string;
  sourceFingerprint: string;
  analysisVersion: string;
  status: "ready" | "blocked";
  analysis: {
    sampledFrameCount: number;
    sourceDurationMs: number;
    sceneCount: number;
    protectedSubject: {
      face: { state: SourceMapEvidenceState; supportedFrameCount: number; referenceTimestampsMs: number[] };
      body: { state: SourceMapEvidenceState; supportedFrameCount: number; visibleRegionConfidence: Record<string, number> };
      motion: { state: SourceMapEvidenceState; averageEnergy: number; peakEnergy: number; referenceTimestampsMs: number[] };
      wardrobe: { state: "not_available"; reason: string };
      environment: { state: "not_available"; reason: string };
    };
    spatialControls: {
      subjectMask: { state: "not_available"; reason: string };
      hairAndEdgeMatte: { state: "not_available"; reason: string };
      depthMap: { state: "not_available"; reason: string };
      opticalFlow: { state: "not_available"; reason: string };
      cameraMotion: { state: "not_available"; reason: string };
      biometricIdentityReference: { state: "not_available"; reason: string };
    };
  };
  routes: {
    allowed: SourceMapRoute[];
    blocked: Array<{ route: SourceMapRoute; reasons: string[] }>;
  };
  blockers: string[];
  createdAt?: string;
  updatedAt?: string;
};

const SOURCE_MAP_VERSION = "creatorvault-source-map/v1";
const MIN_FACE_FRAMES = 3;
const MIN_POSE_FRAMES = 6;

function getPool(): any {
  return (db as any).$client || (db as any).client;
}

async function rawQuery<T = any>(query: string, params: unknown[] = []): Promise<T[]> {
  const pool = getPool();
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
  return (result?.rows || result) as T[];
}

async function rawExec(query: string, params: unknown[] = []): Promise<void> {
  const pool = getPool();
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

export async function ensureBodyCinemaSourceMapSchema(): Promise<void> {
  await rawExec(`CREATE TABLE IF NOT EXISTS body_cinema_source_maps (
    id VARCHAR(36) PRIMARY KEY,
    creator_id BIGINT NOT NULL,
    evidence_id VARCHAR(36) NOT NULL,
    source_asset_url TEXT NOT NULL,
    source_fingerprint CHAR(64) NOT NULL,
    analysis_version VARCHAR(96) NOT NULL,
    map_json JSON NOT NULL,
    map_status VARCHAR(32) NOT NULL,
    blockers_json JSON DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uniq_body_cinema_source_map_evidence (creator_id, evidence_id),
    INDEX idx_body_cinema_source_map_source (creator_id, source_fingerprint),
    INDEX idx_body_cinema_source_map_status (map_status)
  )`);
}

function clamp(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function visibleLandmarkCount(frame: BodyCinemaFrameEvidence): number {
  return frame.landmarks.filter((landmark) => {
    const visibility = typeof landmark.visibility === "number" ? landmark.visibility : 1;
    return Number.isFinite(landmark.x) && Number.isFinite(landmark.y) && visibility >= 0.55;
  }).length;
}

function rounded(value: number): number {
  return Number(value.toFixed(3));
}

function parseRecord(row: any): BodyCinemaSourceMap {
  const map = typeof row.map_json === "string" ? JSON.parse(row.map_json) : row.map_json;
  const blockers = typeof row.blockers_json === "string" ? JSON.parse(row.blockers_json) : (row.blockers_json || []);
  return {
    ...map,
    id: String(row.id),
    creatorId: Number(row.creator_id),
    evidenceId: String(row.evidence_id),
    sourceMediaUrl: String(row.source_asset_url),
    sourceFingerprint: String(row.source_fingerprint),
    analysisVersion: String(row.analysis_version),
    status: row.map_status,
    blockers,
    createdAt: row.created_at ? new Date(row.created_at).toISOString() : undefined,
    updatedAt: row.updated_at ? new Date(row.updated_at).toISOString() : undefined,
  } as BodyCinemaSourceMap;
}

export function deriveBodyCinemaSourceMap(evidence: BodyCinemaEvidenceRecord): Omit<BodyCinemaSourceMap, "id" | "creatorId" | "evidenceId" | "createdAt" | "updatedAt"> {
  const frames = evidence.frameEvidence;
  const faceFrames = frames.filter((frame) => frame.face?.present === true);
  const poseFrames = frames.filter((frame) => visibleLandmarkCount(frame) >= 8);
  const motionShots = evidence.shotRankings.filter((shot) => Number(shot.motionEnergy || 0) > 0);
  const motionEnergies = motionShots.map((shot) => Number(shot.motionEnergy || 0));
  const averageMotion = motionEnergies.length ? motionEnergies.reduce((total, value) => total + value, 0) / motionEnergies.length : 0;
  const peakMotion = motionEnergies.length ? Math.max(...motionEnergies) : 0;
  const faceState: SourceMapEvidenceState = faceFrames.length >= MIN_FACE_FRAMES ? "verified" : "insufficient";
  const bodyState: SourceMapEvidenceState = poseFrames.length >= MIN_POSE_FRAMES ? "verified" : "insufficient";
  const motionState: SourceMapEvidenceState = motionShots.length >= 2 ? "verified" : "insufficient";
  const blockers: string[] = [];
  if (evidence.analysisStatus !== "verified" || evidence.reviewStatus !== "ready") {
    blockers.push("The saved source must have verified evidence and one approved Body Cinema treatment before a Source Map can protect it.");
  }
  if (faceState !== "verified") blockers.push("The saved source does not yet contain enough measured face frames to protect identity through a generative transformation.");
  if (bodyState !== "verified") blockers.push("The saved source does not yet contain enough measured pose frames to protect body continuity through a generative transformation.");
  if (motionState !== "verified") blockers.push("The saved source does not yet contain enough measured movement evidence to protect timing through a generative transformation.");
  blockers.push("No approved private worker currently creates temporal subject masks, hair mattes, depth maps, optical flow, camera-motion tracks, or biometric identity references for this source.");

  const restrictedTransformReasons = [...blockers];
  const status: "ready" | "blocked" = evidence.analysisStatus === "verified" && evidence.reviewStatus === "ready" ? "ready" : "blocked";
  return {
    sourceMediaUrl: evidence.sourceMediaUrl,
    sourceFingerprint: evidence.sourceFingerprint,
    analysisVersion: SOURCE_MAP_VERSION,
    status,
    analysis: {
      sampledFrameCount: frames.length,
      sourceDurationMs: Math.max(0, ...frames.map((frame) => frame.timestampMs)),
      sceneCount: evidence.scenes.length,
      protectedSubject: {
        face: {
          state: faceState,
          supportedFrameCount: faceFrames.length,
          referenceTimestampsMs: faceFrames.map((frame) => frame.timestampMs).slice(0, 6),
        },
        body: {
          state: bodyState,
          supportedFrameCount: poseFrames.length,
          visibleRegionConfidence: Object.fromEntries(Object.entries(evidence.bodyMap).map(([region, value]) => [region, rounded(Number(value || 0))])),
        },
        motion: {
          state: motionState,
          averageEnergy: rounded(clamp(averageMotion)),
          peakEnergy: rounded(clamp(peakMotion)),
          referenceTimestampsMs: motionShots.sort((left, right) => Number(right.motionEnergy || 0) - Number(left.motionEnergy || 0)).slice(0, 6).map((shot) => shot.timestampMs),
        },
        wardrobe: {
          state: "not_available",
          reason: "No approved CreatorVault wardrobe-segmentation worker is configured; wardrobe changes are prohibited.",
        },
        environment: {
          state: "not_available",
          reason: "No approved CreatorVault environment-segmentation worker is configured; environment changes are prohibited.",
        },
      },
      spatialControls: {
        subjectMask: { state: "not_available", reason: "A temporal subject-mask worker has not been approved or connected." },
        hairAndEdgeMatte: { state: "not_available", reason: "A temporal hair-and-edge matting worker has not been approved or connected." },
        depthMap: { state: "not_available", reason: "A private depth-analysis worker has not been approved or connected." },
        opticalFlow: { state: "not_available", reason: "A private optical-flow worker has not been approved or connected." },
        cameraMotion: { state: "not_available", reason: "A private camera-motion analysis worker has not been approved or connected." },
        biometricIdentityReference: { state: "not_available", reason: "No biometric identity-reference service is approved for Body Cinema source protection." },
      },
    },
    routes: {
      allowed: status === "ready" ? ["source_preserving_assembly", "source_preserving_precision_finish"] : [],
      blocked: [{ route: "restricted_generated_transform", reasons: restrictedTransformReasons }],
    },
    blockers,
  };
}

export async function persistBodyCinemaSourceMap(input: { creatorId: number; evidenceId: string }): Promise<BodyCinemaSourceMap> {
  await ensureBodyCinemaSourceMapSchema();
  const evidence = await getBodyCinemaSourceEvidence(input.creatorId, input.evidenceId);
  if (!evidence) throw new Error("Body Cinema source evidence was not found for this creator.");
  const map = deriveBodyCinemaSourceMap(evidence);
  const id = randomUUID();
  await rawExec(
    `INSERT INTO body_cinema_source_maps
      (id, creator_id, evidence_id, source_asset_url, source_fingerprint, analysis_version, map_json, map_status, blockers_json)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       id = VALUES(id), source_asset_url = VALUES(source_asset_url), source_fingerprint = VALUES(source_fingerprint), analysis_version = VALUES(analysis_version), map_json = VALUES(map_json), map_status = VALUES(map_status), blockers_json = VALUES(blockers_json), updated_at = CURRENT_TIMESTAMP`,
    [id, input.creatorId, input.evidenceId, evidence.sourceMediaUrl, evidence.sourceFingerprint, SOURCE_MAP_VERSION, JSON.stringify(map), map.status, JSON.stringify(map.blockers)],
  );
  const rows = await rawQuery<any>("SELECT * FROM body_cinema_source_maps WHERE creator_id = ? AND evidence_id = ? LIMIT 1", [input.creatorId, input.evidenceId]);
  if (!rows[0]) throw new Error("Body Cinema Source Map could not be read after persistence.");
  return parseRecord(rows[0]);
}

export async function getBodyCinemaSourceMap(creatorId: number, evidenceId: string): Promise<BodyCinemaSourceMap | null> {
  await ensureBodyCinemaSourceMapSchema();
  const rows = await rawQuery<any>("SELECT * FROM body_cinema_source_maps WHERE creator_id = ? AND evidence_id = ? LIMIT 1", [creatorId, evidenceId]);
  return rows[0] ? parseRecord(rows[0]) : null;
}

export async function assertBodyCinemaSourceMapReady(input: {
  creatorId: number;
  evidenceId: string;
  sourceMediaUrl: string;
  route: SourceMapRoute;
}): Promise<BodyCinemaSourceMap> {
  const map = await persistBodyCinemaSourceMap({ creatorId: input.creatorId, evidenceId: input.evidenceId });
  if (map.sourceMediaUrl !== input.sourceMediaUrl) throw new Error("The Source Map belongs to a different saved video. Rebuild source understanding before continuing.");
  if (map.status !== "ready") throw new Error("The Source Map is blocked because the saved source evidence is not ready.");
  if (!map.routes.allowed.includes(input.route)) {
    const blocked = map.routes.blocked.find((candidate) => candidate.route === input.route);
    const reason = blocked?.reasons[0] || "This transformation route is not supported by the current Source Map.";
    throw new Error(`CreatorVault will not alter this creator footage yet: ${reason}`);
  }
  return map;
}

/**
 * Browser-local evidence thresholds. They intentionally require explicit per-point
 * confidence and short adjacent samples; they do not interpolate unmeasured time.
 */
export const BODY_DIRECTED_EVIDENCE_THRESHOLDS = {
  minimumLandmarkVisibility: 0.7,
  maximumAdjacentSampleSpanMs: 1_000,
  observedMovementDistance: 0.025,
  heldPoseDistance: 0.01,
  cropPadding: 0.06,
} as const;

type MovementAssessment = {
  movementType: BodyDirectedUsableRange["movementType"];
  stability: number | null;
  evidence: string;
};

const BODY_DIRECTED_REGIONS: Record<BodyDirectedRegionName, number[]> = {
  face: [0, 2, 5, 7, 8],
  shoulders: [11, 12],
  torso: [11, 12, 23, 24],
  hips: [23, 24, 25, 26],
  legs: [23, 24, 25, 26, 27, 28, 31, 32],
  arms: [11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22],
  // Full form is deliberately strict: face/head (including nose and ears),
  // shoulders through wrists/hands, hips/knees, and ankles/toes all have to be
  // in bounds in both samples. A shoulder/hip/knee/ankle subset is not full body.
  full_body: [0, 2, 5, 7, 8, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 31, 32],
};

const DETAIL_FOCUS_REGIONS: Record<string, BodyDirectedRegionName[]> = {
  abs_core: ["torso"],
  glutes_lower_body: ["hips", "legs"],
  curves_silhouette: ["torso", "hips"],
  dance_movement: ["hips", "legs"],
  // This only establishes a creator-confirmed styling region around measured
  // arms. Body Language separately requires full_body plus arms on every
  // selected range, so a style mark alone cannot unlock that treatment.
  style_detail: ["arms"],
  fitness: ["full_body"],
};

function bodyDirectedClamp(value: number, min = 0, max = 1): number {
  return Math.max(min, Math.min(max, value));
}

function bodyDirectedRound(value: number): number {
  return Number(value.toFixed(4));
}

function isInBoundsMeasuredPoint(point: BodyDirectedFrameEvidence["landmarks"][number] | undefined): boolean {
  return Boolean(
    point
    && Number.isFinite(point.x)
    && Number.isFinite(point.y)
    && Number.isFinite(point.visibility)
    && point.x >= 0
    && point.x <= 1
    && point.y >= 0
    && point.y <= 1
    && point.visibility >= BODY_DIRECTED_EVIDENCE_THRESHOLDS.minimumLandmarkVisibility,
  );
}

function hasMeasuredRegion(frame: BodyDirectedFrameEvidence, region: BodyDirectedRegionName): boolean {
  if ((region === "face" || region === "full_body") && frame.face?.present !== true) return false;
  return BODY_DIRECTED_REGIONS[region].every((index) => isInBoundsMeasuredPoint(frame.landmarks[index]));
}

function supportsAllRegions(frame: BodyDirectedFrameEvidence, regions: BodyDirectedRegionName[]): boolean {
  return regions.every((region) => hasMeasuredRegion(frame, region));
}

function pointsForRegions(frame: BodyDirectedFrameEvidence, regions: BodyDirectedRegionName[]): BodyDirectedFrameEvidence["landmarks"] {
  const indexes = [...new Set(regions.flatMap((region) => BODY_DIRECTED_REGIONS[region]))];
  return indexes
    .map((index) => frame.landmarks[index])
    .filter((point): point is BodyDirectedFrameEvidence["landmarks"][number] => isInBoundsMeasuredPoint(point));
}

function centroidForRegions(frame: BodyDirectedFrameEvidence, regions: BodyDirectedRegionName[]): { x: number; y: number } | null {
  const points = pointsForRegions(frame, regions);
  if (points.length < 2) return null;
  return {
    x: points.reduce((sum, point) => sum + point.x, 0) / points.length,
    y: points.reduce((sum, point) => sum + point.y, 0) / points.length,
  };
}

function assessMeasuredMovement(left: BodyDirectedFrameEvidence, right: BodyDirectedFrameEvidence): MovementAssessment {
  const leftCenter = centroidForRegions(left, ["torso"]);
  const rightCenter = centroidForRegions(right, ["torso"]);
  if (!leftCenter || !rightCenter) {
    return {
      movementType: "unknown",
      stability: null,
      evidence: "Torso movement is unknown because both adjacent samples did not contain enough in-bounds, high-confidence torso points.",
    };
  }
  const distance = Math.hypot(rightCenter.x - leftCenter.x, rightCenter.y - leftCenter.y);
  if (distance >= BODY_DIRECTED_EVIDENCE_THRESHOLDS.observedMovementDistance) {
    return {
      movementType: "observed_landmark_movement",
      stability: bodyDirectedRound(bodyDirectedClamp(1 - distance / 0.2)),
      evidence: `Observed landmark movement across adjacent samples (${bodyDirectedRound(distance)} normalized torso travel).`,
    };
  }
  if (distance <= BODY_DIRECTED_EVIDENCE_THRESHOLDS.heldPoseDistance) {
    return {
      movementType: "held_pose",
      stability: bodyDirectedRound(bodyDirectedClamp(1 - distance / 0.02)),
      evidence: `Held pose across adjacent samples (${bodyDirectedRound(distance)} normalized torso travel).`,
    };
  }
  return {
    movementType: "unknown",
    stability: bodyDirectedRound(bodyDirectedClamp(1 - distance / 0.2)),
    evidence: `Movement classification is unknown between thresholds (${bodyDirectedRound(distance)} normalized torso travel).`,
  };
}

function cropForRegions(left: BodyDirectedFrameEvidence, right: BodyDirectedFrameEvidence, regions: BodyDirectedRegionName[]) {
  const points = [...pointsForRegions(left, regions), ...pointsForRegions(right, regions)];
  if (!points.length) {
    throw new Error("A usable range cannot be cropped without in-bounds measured landmarks.");
  }
  const minimumX = Math.min(...points.map((point) => point.x));
  const maximumX = Math.max(...points.map((point) => point.x));
  const minimumY = Math.min(...points.map((point) => point.y));
  const maximumY = Math.max(...points.map((point) => point.y));
  const padding = BODY_DIRECTED_EVIDENCE_THRESHOLDS.cropPadding;
  const leftEdge = Math.max(0, minimumX - padding);
  const topEdge = Math.max(0, minimumY - padding);
  const rightEdge = Math.min(1, maximumX + padding);
  const bottomEdge = Math.min(1, maximumY + padding);
  return {
    left: bodyDirectedRound(leftEdge),
    top: bodyDirectedRound(topEdge),
    width: bodyDirectedRound(Math.max(0.0001, rightEdge - leftEdge)),
    height: bodyDirectedRound(Math.max(0.0001, bottomEdge - topEdge)),
  };
}

function qualityForPair(left: BodyDirectedFrameEvidence, right: BodyDirectedFrameEvidence, regions: BodyDirectedRegionName[]): {
  framingQuality: number;
  lightingQuality: number | null;
} {
  const crop = cropForRegions(left, right, regions);
  const measuredCoverage = crop.width * crop.height;
  const suppliedCoverage = [left.subjectCoverage, right.subjectCoverage].filter((value): value is number => typeof value === "number");
  const framingQuality = suppliedCoverage.length === 2
    ? bodyDirectedRound(bodyDirectedClamp((suppliedCoverage[0] + suppliedCoverage[1]) / 2))
    : bodyDirectedRound(bodyDirectedClamp(Math.sqrt(measuredCoverage)));
  const diagnostics = [left, right].flatMap((frame) => {
    if (typeof frame.brightness !== "number" || typeof frame.sharpness !== "number" || typeof frame.contrast !== "number") return [];
    return [(frame.brightness + frame.sharpness + frame.contrast) / 3];
  });
  return {
    framingQuality,
    // An absent diagnostic remains unknown. There is intentionally no visual-quality default.
    lightingQuality: diagnostics.length === 2 ? bodyDirectedRound((diagnostics[0] + diagnostics[1]) / 2) : null,
  };
}

function directFocusesForPair(left: BodyDirectedFrameEvidence, right: BodyDirectedFrameEvidence): string[] {
  return ["full_body", "legs", "face_beauty"].filter((focusId) => {
    const regions = regionsForDirectFocus(focusId);
    return supportsAllRegions(left, regions) && supportsAllRegions(right, regions);
  });
}

function regionsForDirectFocus(focusId: string): BodyDirectedRegionName[] {
  if (focusId === "full_body") return ["full_body"];
  if (focusId === "legs") return ["legs"];
  if (focusId === "face_beauty") return ["face"];
  throw new Error(`Unsupported measured body focus: ${focusId}`);
}

function measuredRegionsForPair(left: BodyDirectedFrameEvidence, right: BodyDirectedFrameEvidence): BodyDirectedRegionName[] {
  return (Object.keys(BODY_DIRECTED_REGIONS) as BodyDirectedRegionName[]).filter((region) => (
    hasMeasuredRegion(left, region) && hasMeasuredRegion(right, region)
  ));
}

function canvasDiagnosticsForFrame(frame: BodyDirectedFrameEvidence): BodyDirectedOriginalSourceContextCrop["evidence"]["leftCanvasDiagnostics"] | null {
  if (
    typeof frame.brightness !== "number"
    || typeof frame.sharpness !== "number"
    || typeof frame.contrast !== "number"
    || typeof frame.subjectCoverage !== "number"
  ) {
    return null;
  }
  return {
    width: frame.width,
    height: frame.height,
    brightness: frame.brightness,
    sharpness: frame.sharpness,
    contrast: frame.contrast,
    subjectCoverage: frame.subjectCoverage,
  };
}

function originalSourceContextForPair(
  left: BodyDirectedFrameEvidence,
  right: BodyDirectedFrameEvidence,
): BodyDirectedOriginalSourceContextCrop | undefined {
  const leftDiagnostics = canvasDiagnosticsForFrame(left);
  const rightDiagnostics = canvasDiagnosticsForFrame(right);
  if (!left.frameFingerprint || !right.frameFingerprint || !leftDiagnostics || !rightDiagnostics) return undefined;
  return {
    label: "ORIGINAL SOURCE CONTEXT",
    crop: { left: 0, top: 0, width: 1, height: 1 },
    evidence: {
      leftFrameFingerprint: left.frameFingerprint,
      rightFrameFingerprint: right.frameFingerprint,
      leftCanvasDiagnostics: leftDiagnostics,
      rightCanvasDiagnostics: rightDiagnostics,
    },
  };
}

/**
 * Face and leg detail crops already exist as separately measured direct-focus
 * siblings. This is the minimal additional evidence needed for a factual mid
 * frame: shoulders plus hips must be in bounds at high confidence in both
 * adjacent samples. It never interpolates a crop or infers unseen anatomy.
 */
function measuredTorsoFramingCropsForPair(
  left: BodyDirectedFrameEvidence,
  right: BodyDirectedFrameEvidence,
): NonNullable<BodyDirectedUsableRange["measuredFramingCrops"]> {
  const basedOnRegions: BodyDirectedRegionName[] = ["shoulders", "hips"];
  if (!supportsAllRegions(left, basedOnRegions) || !supportsAllRegions(right, basedOnRegions)) return [];
  return [{
    kind: "measured_torso_frame",
    crop: cropForRegions(left, right, basedOnRegions),
    basedOnRegions,
  }];
}

function intervalsOverlap(startMs: number, endMs: number, otherStartMs: number, otherEndMs: number): boolean {
  return startMs < otherEndMs && otherStartMs < endMs;
}

function mergeMeasuredCoverage(ranges: BodyDirectedUsableRange[]): Array<{ startMs: number; endMs: number }> {
  const ordered = ranges
    .map((range) => ({ startMs: range.startMs, endMs: range.endMs }))
    .sort((left, right) => left.startMs - right.startMs || left.endMs - right.endMs);
  const merged: Array<{ startMs: number; endMs: number }> = [];
  for (const interval of ordered) {
    const previous = merged[merged.length - 1];
    if (previous && interval.startMs <= previous.endMs) {
      previous.endMs = Math.max(previous.endMs, interval.endMs);
    } else {
      merged.push({ ...interval });
    }
  }
  return merged;
}

function excludedMeasuredGaps(ranges: BodyDirectedUsableRange[], durationMs: number) {
  const coverage = mergeMeasuredCoverage(ranges);
  const excluded: Array<{ startMs: number; endMs: number; reason: string }> = [];
  let cursor = 0;
  for (const interval of coverage) {
    if (cursor < interval.startMs) {
      excluded.push({ startMs: cursor, endMs: interval.startMs, reason: "No adjacent in-bounds, high-confidence landmark samples support this interval." });
    }
    cursor = Math.max(cursor, interval.endMs);
  }
  if (cursor < durationMs) {
    excluded.push({ startMs: cursor, endMs: durationMs, reason: "No adjacent in-bounds, high-confidence landmark samples support this interval." });
  }
  return excluded;
}

function permittedRangesForFocus(map: BodyDirectedSourceMap, focusId: string): BodyDirectedUsableRange[] {
  const focus = findBodyFocus(focusId);
  if (!focus) throw new Error(`Unknown Body Cinema body focus: ${focusId}`);
  return map.usableRanges.filter((range) => (
    range.visibleFocusIds.includes(focusId)
    && (focus.requiresCreatorConfirmation
      ? range.visibilityProvenance === "creator_confirmed_detail"
      : range.visibilityProvenance === "measured_pose")
  ));
}

function rangeHasRequiredRegions(range: BodyDirectedUsableRange, requiredRegions: string[]): boolean {
  return requiredRegions.every((region) => range.measuredRegions.includes(region as BodyDirectedRegionName));
}

function permittedRangesForTreatment(
  map: BodyDirectedSourceMap,
  focusId: string,
  requiredRegions: string[],
): BodyDirectedUsableRange[] {
  return permittedRangesForFocus(map, focusId).filter((range) => rangeHasRequiredRegions(range, requiredRegions));
}

function hasEmbeddedCropProof(
  map: BodyDirectedSourceMap,
  range: BodyDirectedUsableRange,
  kind: ReturnType<typeof bodyDirectedAllowedCropProofsForRange>[number]["kind"],
): boolean {
  return bodyDirectedAllowedCropProofsForRange(map, range).some((proof) => proof.kind === kind);
}

/**
 * A treatment may not advertise a crop progression unless each stage can be
 * selected from the immutable source map. This intentionally uses no live
 * registry or vision lookup: only crops already embedded in this map count.
 */
function unsupportedProgressionReason(
  map: BodyDirectedSourceMap,
  treatmentItem: BodyDirectedTreatment,
  ranges: BodyDirectedUsableRange[],
): string | null {
  const chronological = [...ranges].sort((left, right) => left.startMs - right.startMs || left.id.localeCompare(right.id));
  if (treatmentItem.selectionPattern === "detail_to_mid_to_full") {
    if (chronological.length < 3) {
      return `${treatmentItem.name} needs at least three distinct measured full-body source windows for its detail-to-mid-to-full progression.`;
    }
    if (!hasEmbeddedCropProof(map, chronological[0], "measured_face_detail")) {
      return `${treatmentItem.name} needs an exact measured face-detail sibling crop for its opening source window.`;
    }
    if (chronological.slice(1, -1).some((range) => !hasEmbeddedCropProof(map, range, "measured_torso_frame"))) {
      return `${treatmentItem.name} needs an explicit shoulders-and-hips measured torso crop for every mid-shot source window.`;
    }
    if (!hasEmbeddedCropProof(map, chronological[chronological.length - 1], "measured_focus_crop")) {
      return `${treatmentItem.name} needs the final measured full-body crop for its hero source window.`;
    }
  }
  if (treatmentItem.selectionPattern === "lower_to_full") {
    if (chronological.length < 2) {
      return `${treatmentItem.name} needs separate measured lower-body and full-body source windows for its progression.`;
    }
    if (chronological.slice(0, -1).some((range) => !hasEmbeddedCropProof(map, range, "measured_focus_crop"))) {
      return `${treatmentItem.name} needs an exact measured lower-body crop before its full-body hold.`;
    }
    if (!hasEmbeddedCropProof(map, chronological[chronological.length - 1], "measured_full_body")) {
      return `${treatmentItem.name} needs an exact sibling measured full-body crop; leg-only source evidence cannot support its full-form hold.`;
    }
  }
  return null;
}

export type BodyDirectedTreatmentAssessment = {
  supported: boolean;
  rangeIds: string[];
  reason: string;
  alternatives: string[];
};

/**
 * Compile a strict, short-span source map from browser-local pose samples and
 * creator annotations. This function is pure: it does not persist, fetch, call a
 * provider, or make a claim beyond its measured or creator-confirmed evidence.
 */
export function deriveBodyDirectedSourceMap(input: {
  source: BodyDirectedSourceIdentity;
  frameEvidence: BodyDirectedFrameEvidence[];
  detailObservations?: BodyDirectedDetailObservation[];
}): BodyDirectedSourceMap {
  const source = bodyDirectedSourceIdentitySchema.parse(input.source);
  const frames = bodyDirectedFrameEvidenceListSchema.parse(input.frameEvidence);
  const detailObservations = (input.detailObservations || []).map((observation) => bodyDirectedDetailObservationSchema.parse(observation));
  const durationMs = source.durationSeconds * 1_000;
  const timestamps = new Set<number>();
  for (const frame of frames) {
    if (frame.width !== source.width || frame.height !== source.height) {
      throw new Error("Every frame evidence dimension must exactly match the source identity dimensions.");
    }
    if (frame.timestampMs > durationMs) {
      throw new Error("Frame evidence timestamp exceeds the source duration.");
    }
    if (timestamps.has(frame.timestampMs)) throw new Error("Frame evidence timestamps must be unique; repeated samples are not evidence.");
    timestamps.add(frame.timestampMs);
  }
  const orderedFrames = [...frames].sort((left, right) => left.timestampMs - right.timestampMs);

  for (const observation of detailObservations) {
    const focus = findBodyFocus(observation.bodyFocusId);
    if (!focus || !focus.requiresCreatorConfirmation || !DETAIL_FOCUS_REGIONS[observation.bodyFocusId]) {
      throw new Error(`Detail observation must name a creator-confirmed detailed body focus: ${observation.bodyFocusId}`);
    }
    if (observation.endMs > durationMs) throw new Error("Detail observation timestamp exceeds the source duration.");
  }

  const usableRanges: BodyDirectedUsableRange[] = [];
  for (let index = 0; index < orderedFrames.length - 1; index += 1) {
    const left = orderedFrames[index];
    const right = orderedFrames[index + 1];
    const spanMs = right.timestampMs - left.timestampMs;
    if (spanMs <= 0) throw new Error("Frame evidence timestamps must be strictly increasing after sorting.");
    if (spanMs > BODY_DIRECTED_EVIDENCE_THRESHOLDS.maximumAdjacentSampleSpanMs) continue;

    const movement = assessMeasuredMovement(left, right);
    const directFocusIds = directFocusesForPair(left, right);
    const measuredRegions = measuredRegionsForPair(left, right);
    const allowedSourceContextCrop = originalSourceContextForPair(left, right);
    const measuredTorsoFramingCrops = measuredTorsoFramingCropsForPair(left, right);
    for (const focusId of directFocusIds) {
      const regions = regionsForDirectFocus(focusId);
      const quality = qualityForPair(left, right, regions);
      usableRanges.push({
        id: `measured_${focusId}_${index + 1}`,
        startMs: left.timestampMs,
        endMs: right.timestampMs,
        visibleFocusIds: [focusId],
        movementType: movement.movementType,
        framingQuality: quality.framingQuality,
        lightingQuality: quality.lightingQuality,
        stability: movement.stability,
        evidence: [
          `Two adjacent source samples (${left.timestampMs}ms–${right.timestampMs}ms) have required in-bounds landmarks at visibility ≥ ${BODY_DIRECTED_EVIDENCE_THRESHOLDS.minimumLandmarkVisibility}.`,
          movement.evidence,
          quality.lightingQuality === null ? "Lighting quality is unknown because one or more frame diagnostics are absent." : "Lighting quality uses supplied brightness, sharpness, and contrast diagnostics only.",
        ],
        visibilityProvenance: "measured_pose",
        crop: cropForRegions(left, right, regions),
        measuredRegions,
        ...(allowedSourceContextCrop ? { allowedSourceContextCrop } : {}),
        ...(focusId === "full_body" && measuredTorsoFramingCrops.length ? { measuredFramingCrops: measuredTorsoFramingCrops } : {}),
      });
    }

    detailObservations.forEach((observation, observationIndex) => {
      const regions = DETAIL_FOCUS_REGIONS[observation.bodyFocusId];
      if (!supportsAllRegions(left, regions) || !supportsAllRegions(right, regions)) return;
      const startMs = Math.max(left.timestampMs, observation.startMs);
      const endMs = Math.min(right.timestampMs, observation.endMs);
      if (!intervalsOverlap(left.timestampMs, right.timestampMs, observation.startMs, observation.endMs) || endMs <= startMs) return;
      const quality = qualityForPair(left, right, regions);
      usableRanges.push({
        id: `confirmed_${observationIndex + 1}_${index + 1}`,
        startMs,
        endMs,
        visibleFocusIds: [observation.bodyFocusId],
        movementType: movement.movementType,
        framingQuality: quality.framingQuality,
        lightingQuality: quality.lightingQuality,
        stability: movement.stability,
        evidence: [
          `Creator-visible-region confirmation (${observation.startMs}ms–${observation.endMs}ms) overlaps two adjacent source samples with required in-bounds landmarks at visibility ≥ ${BODY_DIRECTED_EVIDENCE_THRESHOLDS.minimumLandmarkVisibility}.`,
          "This detailed focus is creator-provided confirmation, not automated or independently verified detection.",
          movement.evidence,
          quality.lightingQuality === null ? "Lighting quality is unknown because one or more frame diagnostics are absent." : "Lighting quality uses supplied brightness, sharpness, and contrast diagnostics only.",
        ],
        visibilityProvenance: "creator_confirmed_detail",
        crop: cropForRegions(left, right, regions),
        measuredRegions,
        ...(allowedSourceContextCrop ? { allowedSourceContextCrop } : {}),
      });
    });
  }

  for (const observation of detailObservations) {
    const hasConservativeOverlap = usableRanges.some((range) => (
      range.visibilityProvenance === "creator_confirmed_detail"
      && range.visibleFocusIds.includes(observation.bodyFocusId)
      && intervalsOverlap(range.startMs, range.endMs, observation.startMs, observation.endMs)
    ));
    if (!hasConservativeOverlap) {
      throw new Error(`Creator confirmation for ${observation.bodyFocusId} does not overlap a conservative pair of required in-bounds landmark samples.`);
    }
  }

  const limitations = [
    `Only adjacent samples no more than ${BODY_DIRECTED_EVIDENCE_THRESHOLDS.maximumAdjacentSampleSpanMs}ms apart and landmarks with explicit visibility ≥ ${BODY_DIRECTED_EVIDENCE_THRESHOLDS.minimumLandmarkVisibility} can create a usable range.`,
    "Out-of-bounds points, low-confidence points, and unmeasured gaps never support a focus or crop.",
    "Pose samples do not identify muscles, glutes, curves, dance/twerk, wardrobe, hair, jewelry, fitness activity, front/rear orientation, camera heading, or choreography.",
    "Detailed focus labels are creator-visible-region confirmations constrained by measured joint regions; they are not automated or independently verified detection.",
    "Missing brightness, sharpness, or contrast diagnostics leave light quality unknown; samples do not prove unseen intervals.",
    "Frame fingerprints and local canvas diagnostics can only support a labeled ORIGINAL SOURCE CONTEXT inside this frozen map; they are creator-device observations, not independent full-source, hash, or tamper assurance.",
    "Measured face and leg detail crops may only come from direct same-window measured siblings; a torso mid-frame exists only when shoulders and hips are in bounds at high confidence in both adjacent samples.",
    "sourceMapHash is absent from this pure derivation and is assigned by the parent server when it persists the complete source-map snapshot.",
  ];
  const draftMap = bodyDirectedSourceMapSchema.parse({
    version: BODY_DIRECTED_SOURCE_MAP_VERSION,
    source,
    provenance: "browser_local_pose_and_creator_marks",
    usableRanges,
    excludedRanges: excludedMeasuredGaps(usableRanges, durationMs),
    limitations,
    detailObservations,
    bestEligibleTreatmentIds: [],
  });
  const bestEligibleTreatmentIds = BODY_FOCUS_TREATMENTS
    .filter((treatmentItem) => treatmentItem.bodyFocusIds.some((focusId) => {
      const ranges = permittedRangesForTreatment(draftMap, focusId, treatmentItem.requiredRegions);
      return ranges.length > 0 && !unsupportedProgressionReason(draftMap, treatmentItem, ranges);
    }))
    .map((treatmentItem) => treatmentItem.id);
  return bodyDirectedSourceMapSchema.parse({ ...draftMap, bestEligibleTreatmentIds });
}

/**
 * Assess a requested edit against the selected focus' actual permitted ranges.
 * It does not return a blanket recommendation when the source lacks evidence.
 */
export function assessBodyDirectedTreatment(
  map: BodyDirectedSourceMap,
  focusId: string,
  treatmentId: string,
): BodyDirectedTreatmentAssessment {
  const parsedMap = bodyDirectedSourceMapSchema.parse(map);
  const focus = findBodyFocus(focusId);
  const treatmentItem = findBodyTreatment(treatmentId);
  if (!focus) throw new Error(`Unknown Body Cinema body focus: ${focusId}`);
  if (!treatmentItem) throw new Error(`Unknown Body Cinema treatment: ${treatmentId}`);
  const supportedTreatmentIds = BODY_FOCUS_TREATMENTS
    .filter((candidate) => candidate.bodyFocusIds.some((candidateFocusId) => {
      const candidateRanges = permittedRangesForTreatment(parsedMap, candidateFocusId, candidate.requiredRegions);
      return candidateRanges.length > 0 && !unsupportedProgressionReason(parsedMap, candidate, candidateRanges);
    }))
    .map((candidate) => candidate.id);
  if (!treatmentItem.bodyFocusIds.includes(focusId)) {
    return {
      supported: false,
      rangeIds: [],
      reason: `${treatmentItem.name} is not compatible with ${focus.label}.`,
      alternatives: supportedTreatmentIds,
    };
  }
  const ranges = permittedRangesForTreatment(parsedMap, focusId, treatmentItem.requiredRegions);
  if (!ranges.length) {
    return {
      supported: false,
      rangeIds: [],
      reason: focus.requiresCreatorConfirmation
        ? `${focus.label} needs a creator-visible-region confirmation overlapping conservative in-bounds landmark samples with every required treatment region; none is available.`
        : `${focus.label} needs conservative measured in-bounds landmark samples with every required treatment region; none is available.`,
      alternatives: supportedTreatmentIds,
    };
  }
  const progressionReason = unsupportedProgressionReason(parsedMap, treatmentItem, ranges);
  if (progressionReason) {
    return {
      supported: false,
      rangeIds: [],
      reason: progressionReason,
      alternatives: supportedTreatmentIds,
    };
  }
  return {
    supported: true,
    rangeIds: ranges.map((range) => range.id),
    reason: `${treatmentItem.name} is supported by ${ranges.length} permitted ${focus.requiresCreatorConfirmation ? "creator-confirmed" : "measured"} source range${ranges.length === 1 ? "" : "s"}.`,
    alternatives: supportedTreatmentIds.filter((id) => id !== treatmentId),
  };
}
