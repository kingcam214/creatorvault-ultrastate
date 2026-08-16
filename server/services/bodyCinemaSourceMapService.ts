import { randomUUID } from "node:crypto";
import { sql } from "drizzle-orm";
import { db } from "../db";
import {
  getBodyCinemaSourceEvidence,
  type BodyCinemaEvidenceRecord,
  type BodyCinemaFrameEvidence,
} from "./bodyCinemaEvidenceService";

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
