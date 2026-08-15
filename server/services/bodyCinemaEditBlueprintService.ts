import { randomUUID } from "crypto";
import { sql } from "drizzle-orm";
import { db } from "../db";
import {
  assertBodyCinemaEvidenceReady,
  type BodyCinemaDirection,
  type BodyCinemaEvidenceRecord,
  type BodyCinemaPerformanceInsight,
} from "./bodyCinemaEvidenceService";
import {
  assertBodyCinemaSourceMapReady,
  type BodyCinemaSourceMap,
} from "./bodyCinemaSourceMapService";

export type BodyCinemaBlueprintScene = {
  id: "hook" | "build" | "restraint" | "payoff" | "loop";
  sourceTimestampMs: number;
  sourceWindow: { startMs: number; endMs: number };
  purpose: string;
  evidence: string[];
  sourcePreservingInstruction: string;
};

export type BodyCinemaEditBlueprint = {
  id: string;
  creatorId: number;
  evidenceId: string;
  sourceMapId: string;
  sourceMediaUrl: string;
  sourceFingerprint: string;
  treatmentId: BodyCinemaDirection["id"];
  treatmentLabel: string;
  state: "ready_no_spend";
  generatedAt: string;
  preservationContract: {
    identity: "preserve";
    face: "preserve";
    bodyAndAnatomy: "preserve";
    naturalSkin: "preserve";
    wardrobe: "preserve";
    originalPerformance: "preserve";
    originalMotionAndTiming: "preserve";
    cameraAndFraming: "preserve";
    environmentGeometry: "preserve";
    visualAlteration: "not authorized";
    captionsOrText: "not authorized";
    generatedMotion: "not authorized";
  };
  treatmentIntent: {
    label: string;
    distinction: string;
    evidence: string[];
    grammar: BodyCinemaDirection["grammar"];
  };
  strongestMoments: Array<{
    kind: "hook" | "thumbnail" | "motion" | "framing" | "weakest";
    timestampMs: number;
    label: string;
    evidence: string;
    use: string;
  }>;
  scenes: BodyCinemaBlueprintScene[];
  excludedWindow: { startMs: number; endMs: number; reason: string };
  noSpendBoundary: {
    providerCallMade: false;
    renderStarted: false;
    sourceOnly: true;
    nextAllowedLane: "source_preserving_assembly";
  };
};

function rowsOf(result: any): any[] {
  if (Array.isArray(result)) return Array.isArray(result[0]) ? result[0] : result;
  if (Array.isArray(result?.rows)) return result.rows;
  return [];
}

async function execute(query: string, params: unknown[] = []): Promise<any> {
  const pool = (db as any).$client || (db as any).client;
  if (pool && typeof pool.promise === "function") return pool.promise().query(query, params);
  if (pool && typeof pool.execute === "function") return pool.execute(query, params);
  const values = [...params];
  const escaped = query.replace(/\?/g, () => {
    const value = values.shift();
    if (value === null || value === undefined) return "NULL";
    if (typeof value === "number") return String(value);
    return `'${String(value).replace(/'/g, "''")}'`;
  });
  return (db as any).execute(sql.raw(escaped));
}

export async function ensureBodyCinemaEditBlueprintSchema(): Promise<void> {
  await execute(`CREATE TABLE IF NOT EXISTS body_cinema_edit_blueprints (
    id VARCHAR(36) PRIMARY KEY,
    creator_id BIGINT NOT NULL,
    evidence_id VARCHAR(36) NOT NULL,
    source_map_id VARCHAR(36) NOT NULL,
    treatment_id VARCHAR(64) NOT NULL,
    blueprint_json JSON NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uniq_body_cinema_blueprint_evidence (creator_id, evidence_id),
    INDEX idx_body_cinema_blueprint_creator (creator_id),
    INDEX idx_body_cinema_blueprint_source_map (source_map_id)
  )`);
}

function resolveInsight(
  evidence: BodyCinemaEvidenceRecord,
  kind: "hook" | "thumbnail" | "motion" | "framing" | "weakest",
  fallbackTimestampMs: number,
): { timestampMs: number; label: string; evidence: string; use: string } {
  const evidenceInsightId = kind === "hook" ? "opening" : kind;
  const insight = evidence.editorFindings?.insights?.find((item) => item.id === evidenceInsightId) as BodyCinemaPerformanceInsight | undefined;
  if (insight) {
    return { timestampMs: insight.timestampMs, label: insight.label, evidence: insight.why, use: insight.action };
  }
  return {
    timestampMs: fallbackTimestampMs,
    label: kind,
    evidence: "This moment comes from the accepted source-evidence record.",
    use: "Use only the original recorded performance at this timestamp.",
  };
}

function sourceWindow(timestampMs: number, durationMs: number, sourceEndMs: number): { startMs: number; endMs: number } {
  const span = Math.max(500, Math.min(2400, durationMs));
  const startMs = Math.max(0, Math.min(timestampMs - Math.round(span * 0.34), Math.max(0, sourceEndMs - span)));
  return { startMs, endMs: Math.min(sourceEndMs, Math.max(startMs + 500, startMs + span)) };
}

function buildScenes(evidence: BodyCinemaEvidenceRecord, direction: BodyCinemaDirection): BodyCinemaBlueprintScene[] {
  const sourceEndMs = Math.max(1_000, ...evidence.frameEvidence.map((frame) => Number(frame.timestampMs || 0)));
  return direction.timeline.map((beat) => ({
    id: beat.id,
    sourceTimestampMs: beat.sourceTimestampMs,
    sourceWindow: sourceWindow(beat.sourceTimestampMs, beat.endMs - beat.startMs, sourceEndMs),
    purpose: beat.direction,
    evidence: [...beat.supportedBy],
    sourcePreservingInstruction: "Use this exact moment from the saved source with natural speed and unaltered camera, framing, body, face, wardrobe, room, and performance.",
  }));
}

function buildBlueprint(input: {
  creatorId: number;
  evidence: BodyCinemaEvidenceRecord;
  direction: BodyCinemaDirection;
  sourceMap: BodyCinemaSourceMap;
}): BodyCinemaEditBlueprint {
  const findings = input.evidence.editorFindings;
  const hook = resolveInsight(input.evidence, "hook", findings?.strongestHookTimestampMs ?? 0);
  const thumbnail = resolveInsight(input.evidence, "thumbnail", findings?.strongestThumbnailTimestampMs ?? hook.timestampMs);
  const motion = resolveInsight(input.evidence, "motion", findings?.strongestMotionTimestampMs ?? hook.timestampMs);
  const framing = resolveInsight(input.evidence, "framing", findings?.strongestAngleTimestampMs ?? hook.timestampMs);
  const weakest = resolveInsight(input.evidence, "weakest", findings?.weakestSectionStartMs ?? 0);

  return {
    id: randomUUID(),
    creatorId: input.creatorId,
    evidenceId: input.evidence.id,
    sourceMapId: input.sourceMap.id,
    sourceMediaUrl: input.evidence.sourceMediaUrl,
    sourceFingerprint: input.evidence.sourceFingerprint,
    treatmentId: input.direction.id,
    treatmentLabel: input.direction.label,
    state: "ready_no_spend",
    generatedAt: new Date().toISOString(),
    preservationContract: {
      identity: "preserve",
      face: "preserve",
      bodyAndAnatomy: "preserve",
      naturalSkin: "preserve",
      wardrobe: "preserve",
      originalPerformance: "preserve",
      originalMotionAndTiming: "preserve",
      cameraAndFraming: "preserve",
      environmentGeometry: "preserve",
      visualAlteration: "not authorized",
      captionsOrText: "not authorized",
      generatedMotion: "not authorized",
    },
    treatmentIntent: {
      label: input.direction.label,
      distinction: input.direction.distinction,
      evidence: [...input.direction.evidence],
      grammar: input.direction.grammar,
    },
    strongestMoments: [
      { kind: "hook", ...hook },
      { kind: "thumbnail", ...thumbnail },
      { kind: "motion", ...motion },
      { kind: "framing", ...framing },
      { kind: "weakest", ...weakest },
    ],
    scenes: buildScenes(input.evidence, input.direction),
    excludedWindow: {
      startMs: findings?.weakestSectionStartMs ?? weakest.timestampMs,
      endMs: findings?.weakestSectionEndMs ?? weakest.timestampMs,
      reason: weakest.evidence,
    },
    noSpendBoundary: {
      providerCallMade: false,
      renderStarted: false,
      sourceOnly: true,
      nextAllowedLane: "source_preserving_assembly",
    },
  };
}

function parseBlueprint(row: any): BodyCinemaEditBlueprint | null {
  if (!row?.blueprint_json) return null;
  try {
    const parsed = typeof row.blueprint_json === "string" ? JSON.parse(row.blueprint_json) : row.blueprint_json;
    return parsed && typeof parsed === "object" ? parsed as BodyCinemaEditBlueprint : null;
  } catch {
    return null;
  }
}

export async function getBodyCinemaEditBlueprint(input: { creatorId: number; evidenceId: string }): Promise<BodyCinemaEditBlueprint | null> {
  await ensureBodyCinemaEditBlueprintSchema();
  const result = await execute(
    "SELECT blueprint_json FROM body_cinema_edit_blueprints WHERE creator_id = ? AND evidence_id = ? LIMIT 1",
    [input.creatorId, input.evidenceId],
  );
  return parseBlueprint(rowsOf(result)[0]);
}

export async function getOrCreateBodyCinemaEditBlueprint(input: {
  creatorId: number;
  evidenceId: string;
  sourceMediaUrl: string;
}): Promise<BodyCinemaEditBlueprint> {
  const existing = await getBodyCinemaEditBlueprint({ creatorId: input.creatorId, evidenceId: input.evidenceId });

  const evidenceContext = await assertBodyCinemaEvidenceReady({
    creatorId: input.creatorId,
    evidenceId: input.evidenceId,
    sourceMediaUrl: input.sourceMediaUrl,
  });
  const sourceMap = await assertBodyCinemaSourceMapReady({
    creatorId: input.creatorId,
    evidenceId: input.evidenceId,
    sourceMediaUrl: input.sourceMediaUrl,
    route: "source_preserving_assembly",
  });
  const freshBlueprint = buildBlueprint({
    creatorId: input.creatorId,
    evidence: evidenceContext.evidence,
    direction: evidenceContext.direction,
    sourceMap,
  });
  const blueprint = { ...freshBlueprint, id: existing?.id || freshBlueprint.id };

  await ensureBodyCinemaEditBlueprintSchema();
  await execute(
    `INSERT INTO body_cinema_edit_blueprints
      (id, creator_id, evidence_id, source_map_id, treatment_id, blueprint_json)
      VALUES (?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        source_map_id = VALUES(source_map_id),
        treatment_id = VALUES(treatment_id),
        blueprint_json = VALUES(blueprint_json),
        updated_at = CURRENT_TIMESTAMP`,
    [
      blueprint.id,
      blueprint.creatorId,
      blueprint.evidenceId,
      blueprint.sourceMapId,
      blueprint.treatmentId,
      JSON.stringify(blueprint),
    ],
  );

  return (await getBodyCinemaEditBlueprint({ creatorId: input.creatorId, evidenceId: input.evidenceId })) || blueprint;
}
