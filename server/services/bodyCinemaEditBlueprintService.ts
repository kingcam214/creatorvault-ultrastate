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
  assessBodyDirectedTreatment,
  assertBodyCinemaSourceMapReady,
  type BodyDirectedTreatmentAssessment,
  type BodyCinemaSourceMap,
} from "./bodyCinemaSourceMapService";
import {
  BODY_DIRECTED_REGISTRY_VERSION,
  BODY_DIRECTED_TREATMENT_VERSION,
  BODY_FOCUS_LIBRARY,
  BODY_FOCUS_TREATMENTS,
  BODY_VISUAL_IDENTITIES,
  bodyDirectedAllowedCropProofsForRange,
  bodyDirectedPlanSchema,
  bodyDirectedSourceMapSchema,
  findBodyFocus,
  findBodyTreatment,
  findBodyVisualIdentity,
  type BodyDirectedAllowedCropProof,
  type BodyDirectedPlan,
  type BodyDirectedRegionName,
  type BodyDirectedSourceIdentity,
  type BodyDirectedSourceMap,
  type BodyDirectedTreatment,
  type BodyDirectedUsableRange,
  type BodyVisualIdentity,
} from "../../shared/bodyCinemaBodyDirection";

export { bodyDirectedPlanSchema, type BodyDirectedPlan };

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

export async function assertBodyCinemaEditBlueprintReady(input: {
  creatorId: number;
  evidenceId: string;
  sourceMediaUrl: string;
  editBlueprintId?: string | null;
}): Promise<BodyCinemaEditBlueprint> {
  const blueprint = await getBodyCinemaEditBlueprint({ creatorId: input.creatorId, evidenceId: input.evidenceId });
  if (!blueprint) throw new Error("A real Body Cinema edit blueprint is required before this source can move forward.");
  if (input.editBlueprintId && blueprint.id !== input.editBlueprintId) {
    throw new Error("The supplied Body Cinema edit blueprint belongs to a different protected source plan.");
  }
  if (blueprint.sourceMediaUrl !== input.sourceMediaUrl) {
    throw new Error("The Body Cinema edit blueprint belongs to a different saved source.");
  }
  if (blueprint.state !== "ready_no_spend" || !blueprint.noSpendBoundary.sourceOnly || blueprint.noSpendBoundary.providerCallMade || blueprint.noSpendBoundary.renderStarted) {
    throw new Error("The Body Cinema edit blueprint is not in a valid protected source state.");
  }
  return blueprint;
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

export type BodyDirectedPlanSelection = {
  bodyFocusId: string;
  bodyTreatmentId: string;
  visualIdentityId: string;
  selectedRangeIds?: string[];
};

type BodyDirectedPlanOutputLadder = BodyDirectedPlan["outputLadder"];

function cloneBodyDirectedSnapshot<T>(value: T): T {
  return structuredClone(value);
}

function sameBodyDirectedSource(left: BodyDirectedSourceIdentity, right: BodyDirectedSourceIdentity): boolean {
  return left.assetId === right.assetId
    && left.sha256 === right.sha256
    && left.width === right.width
    && left.height === right.height
    && left.durationSeconds === right.durationSeconds;
}

function orderedRangesForBodyDirectedTreatment(
  ranges: BodyDirectedUsableRange[],
  treatmentItem: BodyDirectedTreatment,
): BodyDirectedUsableRange[] {
  const chronological = [...ranges].sort((left, right) => left.startMs - right.startMs || left.id.localeCompare(right.id));
  const activeFirst = [...chronological].sort((left, right) => {
    const leftScore = left.movementType === "observed_landmark_movement" ? 2 : left.movementType === "held_pose" ? 1 : 0;
    const rightScore = right.movementType === "observed_landmark_movement" ? 2 : right.movementType === "held_pose" ? 1 : 0;
    return rightScore - leftScore || left.startMs - right.startMs;
  });
  const stableFirst = [...chronological].sort((left, right) => (right.stability ?? -1) - (left.stability ?? -1) || left.startMs - right.startMs);
  switch (treatmentItem.selectionPattern) {
    case "detail_to_hero":
    case "waist_to_full":
    case "lower_to_full":
    case "reveal_progression":
      return chronological;
    case "wide_to_hold":
    case "soft_build_hold":
    case "gentle_face_campaign":
    case "outline_hold":
      return stableFirst;
    case "movement_contrast":
    case "rhythm_variation":
    case "fast_slow_contrast":
    case "tempo_build":
    case "celebration_variety":
    case "editorial_motion_hold":
      return activeFirst;
    case "command_bridge":
      return [...activeFirst.slice(0, 1), ...stableFirst.filter((range) => range.id !== activeFirst[0]?.id)];
    case "narrative_pause_release":
      return chronological.length > 2
        ? [chronological[0], chronological[chronological.length - 1], ...chronological.slice(1, -1)]
        : chronological;
    default:
      return chronological;
  }
}

function cropProofForRange(
  map: BodyDirectedSourceMap,
  range: BodyDirectedUsableRange,
  kind: BodyDirectedAllowedCropProof["kind"],
): BodyDirectedAllowedCropProof {
  const proof = bodyDirectedAllowedCropProofsForRange(map, range).find((candidate) => candidate.kind === kind);
  if (!proof) throw new Error(`The selected source range lacks the exact embedded ${kind} crop proof.`);
  return proof;
}

function bodyDirectedCropForShot(
  map: BodyDirectedSourceMap,
  range: BodyDirectedUsableRange,
  index: number,
  count: number,
  treatmentItem: BodyDirectedTreatment,
): BodyDirectedAllowedCropProof {
  if (treatmentItem.selectionPattern === "detail_to_mid_to_full") {
    if (index === 0) return cropProofForRange(map, range, "measured_face_detail");
    if (index === count - 1) return cropProofForRange(map, range, "measured_focus_crop");
    return cropProofForRange(map, range, "measured_torso_frame");
  }
  if (treatmentItem.selectionPattern === "lower_to_full") {
    return index === count - 1
      ? cropProofForRange(map, range, "measured_full_body")
      : cropProofForRange(map, range, "measured_focus_crop");
  }
  const isHero = index === count - 1;
  if (isHero) return cropProofForRange(map, range, "measured_focus_crop");
  const requestsOriginalSourceContext = (
    (["detail_to_hero", "waist_to_full"].includes(treatmentItem.selectionPattern) && index === 0)
    || ["wide_to_hold", "soft_build_hold", "gentle_face_campaign", "narrative_pause_release"].includes(treatmentItem.selectionPattern)
  );
  if (requestsOriginalSourceContext && range.allowedSourceContextCrop) {
    return cropProofForRange(map, range, "original_source_context");
  }
  return cropProofForRange(map, range, "measured_focus_crop");
}

function bodyDirectedFramingEvidence(proof: BodyDirectedAllowedCropProof): string {
  switch (proof.kind) {
    case "original_source_context":
      return "ORIGINAL SOURCE CONTEXT: this is the unaltered recorded source frame and does not imply unmeasured full-body visibility, angle, pose, or light.";
    case "measured_face_detail":
      return "PROVEN FACE DETAIL CROP: this exact crop is the same-window direct measured face sibling crop.";
    case "measured_torso_frame":
      return "PROVEN TORSO FRAME CROP: this exact crop is bounded by measured shoulders and hips in both adjacent samples.";
    case "measured_leg_detail":
      return "PROVEN LEG DETAIL CROP: this exact crop is the same-window direct measured legs sibling crop.";
    case "measured_full_body":
      return "PROVEN FULL-BODY CROP: this exact crop is the same-window direct measured full-body sibling crop.";
    default:
      return "PROVEN FOCUS CROP: this exact crop is bounded by the measured focus landmarks.";
  }
}

function bodyDirectedShotWindow(
  range: BodyDirectedUsableRange,
  index: number,
  count: number,
  identity: BodyVisualIdentity,
  treatmentItem: BodyDirectedTreatment,
): { startMs: number; endMs: number } {
  if (index !== count - 1) return { startMs: range.startMs, endMs: range.endMs };
  const durationMs = range.endMs - range.startMs;
  const maximumTrimMs = Math.floor(durationMs * 0.4);
  if (maximumTrimMs < 1) return { startMs: range.startMs, endMs: range.endMs };
  // A look's supported hold style can only trim within measured material; it can
  // never extend duration or synthesize slow motion, camera movement, or action.
  const identityVariantIndex = treatmentItem.suggestedVisualIdentityIds.indexOf(identity.id);
  const safeVariantIndex = identityVariantIndex < 0 ? 0 : identityVariantIndex;
  // Divide the available natural-timing hold budget into substantial choices,
  // not one-millisecond label variants that may select identical source frames.
  // A minimum 80ms hold quantum prevents label variants from choosing the
  // same recorded frame at normal source rates. Short material yields fewer
  // distinct options rather than a fabricated micro-timing variation.
  const holdQuantumMs = 80;
  const supportedTrimBudget = Math.floor(maximumTrimMs / holdQuantumMs) * holdQuantumMs;
  const trimMs = Math.min(supportedTrimBudget, safeVariantIndex * holdQuantumMs);
  return { startMs: range.startMs, endMs: range.endMs - trimMs };
}

function bodyDirectedTransition(treatmentItem: BodyDirectedTreatment, index: number): string {
  if (["movement_contrast", "rhythm_variation", "fast_slow_contrast", "tempo_build", "celebration_variety"].includes(treatmentItem.selectionPattern)) {
    return index === 0 ? "source cut-in" : "clean source cut on an observed source change";
  }
  if (["wide_to_hold", "soft_build_hold", "gentle_face_campaign", "outline_hold"].includes(treatmentItem.selectionPattern)) {
    return index === 0 ? "source hold-in" : "gentle source dissolve only if source continuity permits";
  }
  return index === 0 ? "source cut-in" : "measured source match cut";
}

function bodyDirectedMovementInstruction(range: BodyDirectedUsableRange): string {
  if (range.movementType === "observed_landmark_movement") return "Retain only the observed landmark movement in this recorded source window; do not infer choreography.";
  if (range.movementType === "held_pose") return "Retain the recorded held pose at natural source timing; do not manufacture movement.";
  return "Movement is unknown for this source window; keep the recorded source moment without a motion claim.";
}

function bodyDirectedIntent(treatmentItem: BodyDirectedTreatment, identity: BodyVisualIdentity, index: number, count: number): string {
  if (index === count - 1) return `${treatmentItem.shotLogic} Hero hold: ${identity.holdDirection}`;
  return treatmentItem.shotLogic;
}

export function buildBodyDirectedPlanningOutputLadder(): BodyDirectedPlanOutputLadder {
  return {
    status: "planning_only",
    sourceBound: true,
    candidateGenerated: false,
    providerCallMade: false,
    nextAuthorizedStep: "A separately authorized source-preserving assembly review may use this frozen plan; no provider call or candidate is authorized by planning.",
  };
}

export function buildBodyDirectedProviderReadyDirection(input: {
  treatment: BodyDirectedTreatment;
  visualIdentity: BodyVisualIdentity;
  selectedTimecodes: Array<{ rangeId: string; startMs: number; endMs: number }>;
}): string {
  const timecodes = input.selectedTimecodes.map((timecode) => `${timecode.rangeId} ${timecode.startMs}ms–${timecode.endMs}ms`).join("; ");
  return [
    "PLAN ONLY — no provider call, render, candidate, attachment, publication, purchase, or handoff is authorized.",
    `Assemble only these frozen source windows: ${timecodes}.`,
    `Edit language: ${input.treatment.name}. ${input.treatment.providerDirection}`,
    `Look direction: ${input.visualIdentity.name}. ${input.visualIdentity.gradeDirection} ${input.visualIdentity.holdDirection}`,
    "Preserve identity, face, natural skin tone and texture, body and anatomy, wardrobe, environment, original source motion and timing, and source camera/framing.",
    "Do not generate or modify body shape, anatomy, age, ethnicity, identity, skin tone, natural texture, pose, hair, jewelry, wardrobe, environment, light, camera, or choreography.",
  ].join(" ");
}

function assertSelectionRanges(
  map: BodyDirectedSourceMap,
  assessment: BodyDirectedTreatmentAssessment,
  treatmentItem: BodyDirectedTreatment,
  selectedRangeIds: string[] | undefined,
): BodyDirectedUsableRange[] {
  const allowedIds = new Set(assessment.rangeIds);
  const ids = selectedRangeIds === undefined ? assessment.rangeIds : selectedRangeIds;
  if (!ids.length) throw new Error("At least one supported source range must be selected.");
  if (new Set(ids).size !== ids.length) throw new Error("Selected source range ids must be unique.");
  const rangesById = new Map(map.usableRanges.map((range) => [range.id, range]));
  const selected = ids.map((id) => {
    if (!allowedIds.has(id)) throw new Error(`Selected source range is not permitted for this body focus: ${id}`);
    const range = rangesById.get(id);
    if (!range) throw new Error(`Unknown selected source range: ${id}`);
    const isExcluded = map.excludedRanges.some((excluded) => range.startMs < excluded.endMs && excluded.startMs < range.endMs);
    if (isExcluded) throw new Error(`Selected source range overlaps an excluded source interval: ${id}`);
    const missingRegions = treatmentItem.requiredRegions.filter((region) => !range.measuredRegions.includes(region as BodyDirectedRegionName));
    if (missingRegions.length) {
      throw new Error(`Selected source range does not contain every required treatment region (${missingRegions.join(", ")}): ${id}`);
    }
    return range;
  });
  const chronological = [...selected].sort((left, right) => left.startMs - right.startMs || left.id.localeCompare(right.id));
  const hasProof = (range: BodyDirectedUsableRange, kind: BodyDirectedAllowedCropProof["kind"]) => (
    bodyDirectedAllowedCropProofsForRange(map, range).some((proof) => proof.kind === kind)
  );
  if (treatmentItem.selectionPattern === "detail_to_mid_to_full") {
    if (chronological.length < 3) {
      throw new Error(`${treatmentItem.name} needs at least three distinct measured full-body source windows for its detail-to-mid-to-full progression.`);
    }
    if (!hasProof(chronological[0], "measured_face_detail") || chronological.slice(1, -1).some((range) => !hasProof(range, "measured_torso_frame")) || !hasProof(chronological[chronological.length - 1], "measured_focus_crop")) {
      throw new Error(`${treatmentItem.name} cannot compile its detail-to-mid-to-full progression from the selected source crop evidence.`);
    }
  }
  if (treatmentItem.selectionPattern === "lower_to_full") {
    if (chronological.length < 2) {
      throw new Error(`${treatmentItem.name} needs separate measured lower-body and full-body source windows for its progression.`);
    }
    if (chronological.slice(0, -1).some((range) => !hasProof(range, "measured_focus_crop")) || !hasProof(chronological[chronological.length - 1], "measured_full_body")) {
      throw new Error(`${treatmentItem.name} cannot compile its lower-to-full progression from the selected source crop evidence.`);
    }
  }
  return selected;
}

/**
 * Freeze a source-aware body-directed edit plan. It is purely a planner and does
 * not access persistence, networking, providers, candidate creation, or renderers.
 */
export function compileBodyDirectedPlan(
  map: BodyDirectedSourceMap,
  selection: BodyDirectedPlanSelection,
): BodyDirectedPlan {
  const parsedMap = bodyDirectedSourceMapSchema.parse(map);
  const focus = findBodyFocus(selection.bodyFocusId);
  const treatmentItem = findBodyTreatment(selection.bodyTreatmentId);
  const identity = findBodyVisualIdentity(selection.visualIdentityId);
  if (!focus) throw new Error(`Unknown Body Cinema body focus: ${selection.bodyFocusId}`);
  if (!treatmentItem) throw new Error(`Unknown Body Cinema treatment: ${selection.bodyTreatmentId}`);
  if (!identity) throw new Error(`Unknown Body Cinema visual identity: ${selection.visualIdentityId}`);
  if (!treatmentItem.bodyFocusIds.includes(focus.id)) {
    throw new Error(`${treatmentItem.name} is not compatible with ${focus.label}.`);
  }
  if (!treatmentItem.suggestedVisualIdentityIds.includes(identity.id)) {
    throw new Error(`${identity.name} is not compatible with ${treatmentItem.name}.`);
  }
  const assessment = assessBodyDirectedTreatment(parsedMap, focus.id, treatmentItem.id);
  if (!assessment.supported) throw new Error(assessment.reason);
  const selectedRanges = assertSelectionRanges(parsedMap, assessment, treatmentItem, selection.selectedRangeIds);
  const orderedRanges = orderedRangesForBodyDirectedTreatment(selectedRanges, treatmentItem);
  const selectedTimecodes = selectedRanges.map((range) => ({ rangeId: range.id, startMs: range.startMs, endMs: range.endMs }));
  const shots = orderedRanges.map((range, index) => {
    const cropProof = bodyDirectedCropForShot(parsedMap, range, index, orderedRanges.length, treatmentItem);
    const crop = cloneBodyDirectedSnapshot(cropProof.crop);
    const window = bodyDirectedShotWindow(range, index, orderedRanges.length, identity, treatmentItem);
    const framingEvidence = bodyDirectedFramingEvidence(cropProof);
    return {
      id: `${treatmentItem.id}_shot_${index + 1}`,
      order: index + 1,
      sourceRangeId: range.id,
      startMs: window.startMs,
      endMs: window.endMs,
      intent: bodyDirectedIntent(treatmentItem, identity, index, orderedRanges.length),
      framing: `${treatmentItem.framingCropLogic} ${framingEvidence}`,
      crop,
      transition: bodyDirectedTransition(treatmentItem, index),
      pacing: index === orderedRanges.length - 1 ? `${treatmentItem.pacing} ${identity.holdDirection}` : treatmentItem.pacing,
      movementInstruction: bodyDirectedMovementInstruction(range),
    };
  });
  const heroRangeId = orderedRanges[orderedRanges.length - 1].id;
  const source = cloneBodyDirectedSnapshot(parsedMap.source);
  if (!sameBodyDirectedSource(source, parsedMap.source)) throw new Error("Plan source identity must exactly match the source-map source identity.");
  const plan = {
    version: BODY_DIRECTED_TREATMENT_VERSION,
    registryVersion: BODY_DIRECTED_REGISTRY_VERSION,
    treatmentName: treatmentItem.name,
    source,
    bodyFocus: cloneBodyDirectedSnapshot(focus),
    bodyTreatment: cloneBodyDirectedSnapshot(treatmentItem),
    visualIdentity: cloneBodyDirectedSnapshot(identity),
    sourceMap: cloneBodyDirectedSnapshot(parsedMap),
    selectedTimecodes: cloneBodyDirectedSnapshot(selectedTimecodes),
    editBlueprint: {
      version: "body_cinema.body_directed_edit_blueprint.v1" as const,
      shots,
      heroRangeId,
      slowMotion: {
        eligible: false as const,
        reason: "Source frame rate is unverified; slow-motion eligibility cannot be claimed.",
      },
      limitations: cloneBodyDirectedSnapshot(parsedMap.limitations),
      excludedRanges: cloneBodyDirectedSnapshot(parsedMap.excludedRanges),
    },
    preservationConstraints: {
      identity: "preserve" as const,
      face: "preserve" as const,
      bodyAndAnatomy: "preserve" as const,
      naturalSkinAndTexture: "preserve" as const,
      wardrobe: "preserve" as const,
      environment: "preserve" as const,
      sourceMotionAndTiming: "preserve" as const,
      sourceCameraAndFraming: "preserve" as const,
      generatedBodyOrIdentityChanges: "not_authorized" as const,
      providerCall: "not_authorized" as const,
    },
    providerReadyDirection: buildBodyDirectedProviderReadyDirection({ treatment: treatmentItem, visualIdentity: identity, selectedTimecodes }),
    outputLadder: buildBodyDirectedPlanningOutputLadder(),
    status: "planning_only" as const,
    noCandidateGenerated: true as const,
  };
  return bodyDirectedPlanSchema.parse(plan);
}

/**
 * Return up to five genuinely compilable source-aware combinations. Unsupported
 * focuses return an empty list; callers can use assessBodyDirectedTreatment for
 * the explicit alternatives and reason.
 */
function bodyDirectedMaterialSignature(plan: BodyDirectedPlan): string {
  return JSON.stringify(plan.editBlueprint.shots.map((shot) => ({
    sourceRangeId: shot.sourceRangeId,
    startMs: shot.startMs,
    endMs: shot.endMs,
    crop: shot.crop,
    transition: shot.transition,
  })));
}

export function recommendBodyDirectedOptions(map: BodyDirectedSourceMap, bodyFocusId?: string): BodyDirectedPlan[] {
  const parsedMap = bodyDirectedSourceMapSchema.parse(map);
  const requestedFocusIds = bodyFocusId === undefined
    ? BODY_FOCUS_LIBRARY.map((focus) => focus.id)
    : [bodyFocusId];
  const recommendations: BodyDirectedPlan[] = [];
  const materialSignatures = new Set<string>();
  const addRecommendation = (plan: BodyDirectedPlan): boolean => {
    const signature = bodyDirectedMaterialSignature(plan);
    if (materialSignatures.has(signature)) return false;
    materialSignatures.add(signature);
    recommendations.push(plan);
    return true;
  };
  for (const focusId of requestedFocusIds) {
    const focus = findBodyFocus(focusId);
    if (!focus) throw new Error(`Unknown Body Cinema body focus: ${focusId}`);
    const eligibleTreatments = BODY_FOCUS_TREATMENTS
      .filter((treatmentItem) => treatmentItem.bodyFocusIds.includes(focus.id))
      .flatMap((treatmentItem) => {
        const assessment = assessBodyDirectedTreatment(parsedMap, focus.id, treatmentItem.id);
        return assessment.supported ? [{ treatmentItem, assessment }] : [];
      });

    // First pass: prefer distinct edit languages. A different treatment earns a
    // recommendation only when its actual range/window/crop/transition/pace
    // signature differs from every existing plan.
    for (const { treatmentItem, assessment } of eligibleTreatments) {
      const visualIdentityId = treatmentItem.suggestedVisualIdentityIds[0];
      if (!visualIdentityId) continue;
      addRecommendation(compileBodyDirectedPlan(parsedMap, {
        bodyFocusId: focus.id,
        bodyTreatmentId: treatmentItem.id,
        visualIdentityId,
        selectedRangeIds: assessment.rangeIds,
      }));
      if (recommendations.length === 5) return recommendations;
    }

    // Second pass: an additional mood is retained only if compileBodyDirectedPlan
    // made a real in-range edit change (its deterministic hero hold window) and
    // the resulting material signature is new. No label-only filler is emitted.
    for (const { treatmentItem, assessment } of eligibleTreatments) {
      for (const visualIdentityId of treatmentItem.suggestedVisualIdentityIds.slice(1)) {
        addRecommendation(compileBodyDirectedPlan(parsedMap, {
          bodyFocusId: focus.id,
          bodyTreatmentId: treatmentItem.id,
          visualIdentityId,
          selectedRangeIds: assessment.rangeIds,
        }));
        if (recommendations.length === 5) return recommendations;
      }
    }
  }
  return recommendations;
}
