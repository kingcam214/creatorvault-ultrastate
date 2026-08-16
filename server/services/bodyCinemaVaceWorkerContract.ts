import { createHash } from "crypto";

/**
 * CreatorVault-owned VACE contract.
 *
 * This is deliberately a contract and preflight boundary, not an alternate
 * renderer. A VACE worker receives a short, verified source segment plus
 * source-derived control files and may only perform the exact change set
 * authorized by the Body Cinema blueprint. It never receives a free-form
 * prompt that could change identity, body, wardrobe, environment geometry,
 * movement, framing, or audio.
 */

export const VACE_WORKER_PROTOCOL_VERSION = "creatorvault-vace-worker/v1";
export const VACE_MODEL_KEY = "wan/wan2.1-vace-14b-masked-video-edit";
export const VACE_MAX_SEGMENT_SECONDS = 5;

export type VaceAllowedChangeSet = "lighting_only";

export type VaceProtectedSource = {
  sourceUrl: string;
  sourceChecksum: string;
  evidenceId: string;
  sourceMapId: string;
  editBlueprintId: string;
  clipStartMs: number;
  clipEndMs: number;
  referenceFrameUrls: string[];
  temporalSubjectMaskUrl: string;
  depthControlUrl: string;
  opticalFlowUrl: string;
};

export type VaceMaskedEditContract = {
  protocolVersion: typeof VACE_WORKER_PROTOCOL_VERSION;
  jobKey: string;
  modelKey: typeof VACE_MODEL_KEY;
  output: {
    resolution: "720p";
    aspectRatio: "9:16" | "16:9" | "1:1";
    preserveSourceAudio: true;
  };
  source: VaceProtectedSource;
  changeSet: {
    kind: VaceAllowedChangeSet;
    instruction: string;
    prohibitedChanges: string[];
  };
  preservation: {
    identity: true;
    face: true;
    bodyAnatomy: true;
    naturalSkin: true;
    wardrobe: true;
    originalPerformance: true;
    originalMotionTiming: true;
    cameraMovement: true;
    framing: true;
    environmentGeometry: true;
    originalAudio: true;
  };
  noPromptExtension: true;
  noAutomaticRetry: true;
};

const PROHIBITED_CHANGES = [
  "identity_or_face_change",
  "body_or_anatomy_change",
  "skin_smoothing_or_body_reshaping",
  "wardrobe_change",
  "prop_change",
  "environment_geometry_change",
  "invented_motion_or_camera_path",
  "framing_or_timing_change",
  "audio_replacement_or_removal",
] as const;

function requireHttps(value: string, label: string): string {
  const normalized = String(value || "").trim();
  if (!/^https:\/\//i.test(normalized)) throw new Error(`${label} must be a secure URL.`);
  return normalized;
}

function requireIdentifier(value: string, label: string): string {
  const normalized = String(value || "").trim();
  if (!normalized) throw new Error(`${label} is required.`);
  return normalized;
}

function requireChecksum(value: string): string {
  const normalized = String(value || "").trim().toLowerCase();
  if (!/^[a-f0-9]{64}$/.test(normalized)) throw new Error("VACE requires the verified source checksum.");
  return normalized;
}

function requireSafeSegment(startMs: number, endMs: number): { clipStartMs: number; clipEndMs: number } {
  const start = Math.round(Number(startMs));
  const end = Math.round(Number(endMs));
  if (!Number.isInteger(start) || start < 0) throw new Error("VACE requires a non-negative verified clip start.");
  if (!Number.isInteger(end) || end <= start) throw new Error("VACE requires a verified clip end after the start.");
  if (end - start > VACE_MAX_SEGMENT_SECONDS * 1000) {
    throw new Error(`VACE source-preserving edits are limited to ${VACE_MAX_SEGMENT_SECONDS}-second source segments.`);
  }
  return { clipStartMs: start, clipEndMs: end };
}

export function buildVaceMaskedEditContract(input: {
  jobKey: string;
  source: VaceProtectedSource;
  aspectRatio: "9:16" | "16:9" | "1:1";
  changeSet: VaceAllowedChangeSet;
}): VaceMaskedEditContract {
  if (input.changeSet !== "lighting_only") {
    throw new Error("CreatorVault VACE accepts only the approved lighting-only change set until a separately approved change set exists.");
  }

  const segment = requireSafeSegment(input.source.clipStartMs, input.source.clipEndMs);
  const references = Array.from(new Set(input.source.referenceFrameUrls.map((value) => requireHttps(value, "VACE identity reference frame"))));
  if (!references.length) throw new Error("VACE requires verified reference frames before a source-preserving edit.");

  const source: VaceProtectedSource = {
    sourceUrl: requireHttps(input.source.sourceUrl, "VACE source video"),
    sourceChecksum: requireChecksum(input.source.sourceChecksum),
    evidenceId: requireIdentifier(input.source.evidenceId, "VACE source evidence"),
    sourceMapId: requireIdentifier(input.source.sourceMapId, "VACE Source Map"),
    editBlueprintId: requireIdentifier(input.source.editBlueprintId, "VACE Edit Blueprint"),
    clipStartMs: segment.clipStartMs,
    clipEndMs: segment.clipEndMs,
    referenceFrameUrls: references,
    temporalSubjectMaskUrl: requireHttps(input.source.temporalSubjectMaskUrl, "VACE temporal subject mask"),
    depthControlUrl: requireHttps(input.source.depthControlUrl, "VACE depth control"),
    opticalFlowUrl: requireHttps(input.source.opticalFlowUrl, "VACE optical-flow control"),
  };

  return {
    protocolVersion: VACE_WORKER_PROTOCOL_VERSION,
    jobKey: requireIdentifier(input.jobKey, "VACE job key"),
    modelKey: VACE_MODEL_KEY,
    output: { resolution: "720p", aspectRatio: input.aspectRatio, preserveSourceAudio: true },
    source,
    changeSet: {
      kind: "lighting_only",
      instruction: "Improve only the existing scene lighting and tonal separation while retaining every protected source fact exactly.",
      prohibitedChanges: [...PROHIBITED_CHANGES],
    },
    preservation: {
      identity: true,
      face: true,
      bodyAnatomy: true,
      naturalSkin: true,
      wardrobe: true,
      originalPerformance: true,
      originalMotionTiming: true,
      cameraMovement: true,
      framing: true,
      environmentGeometry: true,
      originalAudio: true,
    },
    noPromptExtension: true,
    noAutomaticRetry: true,
  };
}

export function vaceContractFingerprint(contract: VaceMaskedEditContract): string {
  return createHash("sha256").update(JSON.stringify(contract)).digest("hex");
}

export const BODY_CINEMA_VACE_WORKER_POLICY = {
  requiresTemporalSubjectMask: true,
  requiresDepthControl: true,
  requiresOpticalFlowControl: true,
  sourceVideoSegmentMaximumSeconds: VACE_MAX_SEGMENT_SECONDS,
  onlyExplicitApprovedChangeSet: true,
  promptExtensionForbidden: true,
  automaticRetryForbidden: true,
  outputRequiresCanonicalReview: true,
} as const;
