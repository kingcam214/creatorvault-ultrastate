import { createHash } from "node:crypto";
import { execFile } from "node:child_process";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import "@tensorflow/tfjs";
import * as poseDetection from "@tensorflow-models/pose-detection";
import { createCanvas, loadImage } from "@napi-rs/canvas";
import sharp from "sharp";
import { sql } from "drizzle-orm";
import { db } from "../db";
import {
  approveBodyCinemaDirection,
  buildEvidenceBackedDirectionPrompt,
  type BodyCinemaFrameEvidence,
  persistBodyCinemaSourceEvidence,
} from "./bodyCinemaEvidenceService";
import { createGovernedPolloDraft, ensureGovernedPolloSchema } from "./governedPolloService";

const execFileAsync = promisify(execFile);
const OWNER_CREATOR_IDS = [6, 33];
const MAX_CANDIDATES = 24;
const SAMPLE_COUNT = 12;
const MAX_SOURCE_BYTES = 750 * 1024 * 1024;

type ExistingVideoAsset = {
  id: string;
  creatorId: number;
  sourceUrl: string;
  fileName: string;
  durationSeconds: number | null;
  width: number | null;
  height: number | null;
  createdAt: string | null;
};

type PreProviderAttestation = {
  state: "idle" | "running" | "ready" | "no_usable_source" | "failed";
  updatedAt: string | null;
  creatorId: number | null;
  sourceAssetId: string | null;
  sourceFingerprint: string | null;
  evidenceId: string | null;
  treatmentId: string | null;
  governedJobId: number | null;
  governedState: string | null;
  rejectionSummary: string | null;
  providerCallMade: false;
};

let attestation: PreProviderAttestation = {
  state: "idle",
  updatedAt: null,
  creatorId: null,
  sourceAssetId: null,
  sourceFingerprint: null,
  evidenceId: null,
  treatmentId: null,
  governedJobId: null,
  governedState: null,
  rejectionSummary: null,
  providerCallMade: false,
};

function now(): string {
  return new Date().toISOString();
}

function updateAttestation(patch: Partial<PreProviderAttestation>): void {
  attestation = { ...attestation, ...patch, updatedAt: now(), providerCallMade: false };
  console.log(JSON.stringify({ event: "body_cinema_pre_provider_proof", ...attestation }));
}

export function getBodyCinemaPreProviderAttestation(): PreProviderAttestation {
  return { ...attestation };
}

function getPool(): any {
  return (db as any).$client || (db as any).client;
}

async function queryRows<T = any>(query: string, values: unknown[] = []): Promise<T[]> {
  const pool = getPool();
  if (pool && typeof pool.promise === "function") {
    const [rows] = await pool.promise().query(query, values);
    return rows as T[];
  }
  if (pool && typeof pool.execute === "function") {
    const [rows] = await pool.execute(query, values);
    return rows as T[];
  }
  const escapedValues = [...values];
  const escaped = query.replace(/\?/g, () => {
    const value = escapedValues.shift();
    if (value === null || value === undefined) return "NULL";
    if (typeof value === "number") return String(value);
    return `'${String(value).replace(/'/g, "''")}'`;
  });
  const result = await (db as any).execute(sql.raw(escaped));
  return (result?.rows || result) as T[];
}

async function listExistingCreatorVideos(): Promise<ExistingVideoAsset[]> {
  const placeholders = OWNER_CREATOR_IDS.map(() => "?").join(", ");
  const rows = await queryRows<any>(
    `SELECT id, user_id, public_url, file_name, original_name, duration, width, height, created_at
       FROM media_assets
      WHERE user_id IN (${placeholders})
        AND status = 'ready'
        AND (asset_type = 'video' OR mime_type LIKE 'video/%')
        AND public_url IS NOT NULL
        AND public_url <> ''
      ORDER BY created_at DESC
      LIMIT ${MAX_CANDIDATES}`,
    OWNER_CREATOR_IDS,
  );
  return rows.map((row) => ({
    id: String(row.id),
    creatorId: Number(row.user_id),
    sourceUrl: String(row.public_url),
    fileName: String(row.original_name || row.file_name || `creatorvault-${row.id}.mp4`),
    durationSeconds: row.duration === null || row.duration === undefined ? null : Number(row.duration),
    width: row.width === null || row.width === undefined ? null : Number(row.width),
    height: row.height === null || row.height === undefined ? null : Number(row.height),
    createdAt: row.created_at ? String(row.created_at) : null,
  }));
}

function safeExtension(name: string): string {
  const extension = path.extname(name).toLowerCase();
  return [".mp4", ".mov", ".webm", ".mkv", ".avi", ".m4v"].includes(extension) ? extension : ".mp4";
}

async function downloadSource(asset: ExistingVideoAsset, directory: string): Promise<{ localPath: string; sourceChecksum: string }> {
  const response = await fetch(asset.sourceUrl, { redirect: "follow" });
  if (!response.ok || !response.body) throw new Error(`Stored CreatorVault video could not be read (${response.status}).`);
  const declaredLength = Number(response.headers.get("content-length") || 0);
  if (declaredLength > MAX_SOURCE_BYTES) throw new Error("Stored CreatorVault video exceeds the safe source-analysis size limit.");
  const buffer = Buffer.from(await response.arrayBuffer());
  if (!buffer.length) throw new Error("Stored CreatorVault video is empty.");
  if (buffer.length > MAX_SOURCE_BYTES) throw new Error("Stored CreatorVault video exceeds the safe source-analysis size limit.");
  const localPath = path.join(directory, `${asset.id}${safeExtension(asset.fileName)}`);
  await fs.writeFile(localPath, buffer);
  return { localPath, sourceChecksum: createHash("sha256").update(buffer).digest("hex") };
}

async function probeVideo(localPath: string): Promise<{ durationSeconds: number; width: number; height: number }> {
  const { stdout } = await execFileAsync("ffprobe", [
    "-v", "error", "-show_entries", "format=duration:stream=width,height", "-of", "json", localPath,
  ]);
  const parsed = JSON.parse(stdout || "{}");
  const stream = Array.isArray(parsed.streams) ? parsed.streams.find((item: any) => item.width && item.height) : null;
  const durationSeconds = Math.max(0.25, Number(parsed.format?.duration || 0));
  if (!stream || !Number.isFinite(durationSeconds)) throw new Error("Stored CreatorVault video has no readable visual stream.");
  return { durationSeconds, width: Number(stream.width), height: Number(stream.height) };
}

function sampleTimes(durationSeconds: number): number[] {
  const start = Math.min(0.18, durationSeconds * 0.05);
  const end = Math.max(start, durationSeconds - Math.min(0.08, durationSeconds * 0.02));
  return Array.from({ length: SAMPLE_COUNT }, (_, index) => start + ((end - start) * index) / Math.max(1, SAMPLE_COUNT - 1));
}

async function extractFrame(localPath: string, seconds: number): Promise<Buffer> {
  const { stdout } = await execFileAsync("ffmpeg", [
    "-hide_banner", "-loglevel", "error", "-ss", seconds.toFixed(3), "-i", localPath,
    "-frames:v", "1", "-vf", "scale=512:-2", "-f", "image2pipe", "-vcodec", "png", "pipe:1",
  ], { encoding: "buffer", maxBuffer: 12 * 1024 * 1024 } as any);
  return stdout as unknown as Buffer;
}

function frameDiagnostics(pixels: Buffer, width: number, height: number): Pick<BodyCinemaFrameEvidence, "frameFingerprint" | "brightness" | "contrast" | "sharpness" | "colorWarmth"> {
  const luminance = new Array<number>(width * height);
  let luminanceTotal = 0;
  let warmthTotal = 0;
  for (let index = 0; index < luminance.length; index += 1) {
    const offset = index * 4;
    const value = (pixels[offset] * 0.2126 + pixels[offset + 1] * 0.7152 + pixels[offset + 2] * 0.0722) / 255;
    luminance[index] = value;
    luminanceTotal += value;
    warmthTotal += Math.max(0, pixels[offset] - pixels[offset + 2]) / 255;
  }
  const brightness = luminanceTotal / Math.max(1, luminance.length);
  const variance = luminance.reduce((sum, value) => sum + (value - brightness) ** 2, 0) / Math.max(1, luminance.length);
  let edgeTotal = 0;
  let edgeCount = 0;
  for (let y = 0; y < height - 1; y += 1) {
    for (let x = 0; x < width - 1; x += 1) {
      const index = y * width + x;
      edgeTotal += Math.abs(luminance[index] - luminance[index + 1]);
      edgeTotal += Math.abs(luminance[index] - luminance[index + width]);
      edgeCount += 2;
    }
  }
  let fingerprint = "";
  for (let gridY = 0; gridY < 8; gridY += 1) {
    for (let gridX = 0; gridX < 8; gridX += 1) {
      let cell = 0;
      for (let y = 0; y < 4; y += 1) for (let x = 0; x < 4; x += 1) cell += luminance[(gridY * 4 + y) * width + (gridX * 4 + x)];
      const bit = gridY * 8 + gridX;
      if (cell / 16 > brightness) {
        const index = Math.floor(bit / 4);
        const shift = 3 - (bit % 4);
        const current = Number.parseInt(fingerprint[index] || "0", 16);
        const next = (current | (1 << shift)).toString(16);
        fingerprint = `${fingerprint.slice(0, index)}${next}${fingerprint.slice(index + 1)}`;
      }
      while (fingerprint.length < Math.floor(bit / 4) + 1) fingerprint += "0";
    }
  }
  return {
    frameFingerprint: fingerprint.padEnd(16, "0"),
    brightness: Number(brightness.toFixed(4)),
    contrast: Number(Math.min(1, Math.sqrt(variance) / 0.28).toFixed(4)),
    sharpness: Number(Math.min(1, (edgeTotal / Math.max(1, edgeCount)) / 0.18).toFixed(4)),
    colorWarmth: Number(Math.min(1, warmthTotal / Math.max(1, luminance.length)).toFixed(4)),
  };
}

function moveNetLandmarks(keypoints: any[], width: number, height: number): BodyCinemaFrameEvidence["landmarks"] {
  const source = new Map<string, any>(keypoints.map((point) => [String(point.name), point]));
  const point = (name: string) => {
    const value = source.get(name);
    return value ? { x: Number(value.x) / width, y: Number(value.y) / height, z: 0, visibility: Number(value.score || 0) } : { x: 0, y: 0, z: 0, visibility: 0 };
  };
  const averagePoint = (left: string, right: string) => {
    const a = point(left); const b = point(right);
    return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2, z: 0, visibility: (a.visibility + b.visibility) / 2 };
  };
  const landmarks = Array.from({ length: 33 }, () => ({ x: 0, y: 0, z: 0, visibility: 0 }));
  landmarks[0] = point("nose");
  landmarks[2] = point("left_eye");
  landmarks[5] = point("right_eye");
  landmarks[7] = point("left_ear");
  landmarks[8] = point("right_ear");
  landmarks[11] = point("left_shoulder");
  landmarks[12] = point("right_shoulder");
  landmarks[13] = point("left_elbow");
  landmarks[14] = point("right_elbow");
  landmarks[15] = point("left_wrist");
  landmarks[16] = point("right_wrist");
  landmarks[23] = point("left_hip");
  landmarks[24] = point("right_hip");
  landmarks[25] = point("left_knee");
  landmarks[26] = point("right_knee");
  landmarks[27] = point("left_ankle");
  landmarks[28] = point("right_ankle");
  landmarks[29] = point("left_ankle");
  landmarks[30] = point("right_ankle");
  landmarks[31] = point("left_ankle");
  landmarks[32] = point("right_ankle");
  landmarks[1] = averagePoint("nose", "left_eye");
  landmarks[3] = averagePoint("left_eye", "left_ear");
  landmarks[4] = averagePoint("nose", "right_eye");
  landmarks[6] = averagePoint("right_eye", "right_ear");
  landmarks[9] = averagePoint("left_ear", "left_shoulder");
  landmarks[10] = averagePoint("right_ear", "right_shoulder");
  return landmarks;
}

function composition(keypoints: any[], width: number, height: number): Pick<BodyCinemaFrameEvidence, "subjectCoverage" | "face"> {
  const visible = keypoints.filter((point) => Number(point.score || 0) >= 0.35);
  if (!visible.length) return { subjectCoverage: 0, face: { present: false } };
  const x = visible.map((point) => Number(point.x) / width);
  const y = visible.map((point) => Number(point.y) / height);
  const left = Math.max(0, Math.min(...x)); const right = Math.min(1, Math.max(...x));
  const top = Math.max(0, Math.min(...y)); const bottom = Math.min(1, Math.max(...y));
  const face = keypoints.filter((point) => ["nose", "left_eye", "right_eye", "left_ear", "right_ear"].includes(String(point.name)) && Number(point.score || 0) >= 0.35);
  const faceX = face.length ? face.reduce((sum, point) => sum + Number(point.x) / width, 0) / face.length : undefined;
  const faceY = face.length ? face.reduce((sum, point) => sum + Number(point.y) / height, 0) / face.length : undefined;
  return {
    subjectCoverage: Number(Math.max(0, Math.min(1, (right - left) * (bottom - top))).toFixed(4)),
    face: face.length >= 3
      ? { present: true, centerX: faceX, centerY: faceY, coverage: Number(Math.max(0.02, Math.min(1, (right - left) * Math.max(0.03, (faceY || top) - top + 0.03))).toFixed(4)) }
      : { present: false },
  };
}

async function buildFrameEvidence(localPath: string, video: { durationSeconds: number; width: number; height: number }): Promise<BodyCinemaFrameEvidence[]> {
  const detector = await poseDetection.createDetector(poseDetection.SupportedModels.MoveNet, {
    modelType: poseDetection.movenet.modelType.SINGLEPOSE_LIGHTNING,
    enableSmoothing: true,
  });
  try {
    const evidence: BodyCinemaFrameEvidence[] = [];
    for (const seconds of sampleTimes(video.durationSeconds)) {
      const png = await extractFrame(localPath, seconds);
      const image = await loadImage(png);
      const canvas = createCanvas(image.width, image.height);
      canvas.getContext("2d").drawImage(image, 0, 0, image.width, image.height);
      const poses = await detector.estimatePoses(canvas as any, { maxPoses: 1, flipHorizontal: false });
      const keypoints = poses[0]?.keypoints || [];
      const normalized = await sharp(png).resize(32, 32, { fit: "fill" }).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
      evidence.push({
        timestampMs: Math.round(seconds * 1000),
        width: image.width || video.width,
        height: image.height || video.height,
        ...frameDiagnostics(normalized.data, normalized.info.width, normalized.info.height),
        ...composition(keypoints, image.width || video.width, image.height || video.height),
        landmarks: moveNetLandmarks(keypoints, image.width || video.width, image.height || video.height),
      });
    }
    return evidence;
  } finally {
    detector.dispose();
  }
}

function chooseDirection(record: Awaited<ReturnType<typeof persistBodyCinemaSourceEvidence>>) {
  return [...record.directions].sort((left, right) => right.confidence - left.confidence)[0] || null;
}

function aspectRatio(asset: ExistingVideoAsset, video: { width: number; height: number }): "9:16" | "16:9" | "1:1" {
  const width = asset.width || video.width;
  const height = asset.height || video.height;
  if (Math.abs(width - height) / Math.max(width, height) < 0.08) return "1:1";
  return height >= width ? "9:16" : "16:9";
}

export async function runBodyCinemaExistingMediaPreProviderProof(): Promise<PreProviderAttestation> {
  if (attestation.state === "running") return getBodyCinemaPreProviderAttestation();
  updateAttestation({ state: "running", rejectionSummary: null });
  try {
    await ensureGovernedPolloSchema();
    const candidates = await listExistingCreatorVideos();
    if (!candidates.length) {
      updateAttestation({ state: "no_usable_source", rejectionSummary: "No ready creator-owned videos were found in the existing media library." });
      return getBodyCinemaPreProviderAttestation();
    }

    const workspace = await fs.mkdtemp(path.join(os.tmpdir(), "creatorvault-body-cinema-proof-"));
    const failures: string[] = [];
    try {
    for (const asset of candidates) {
      try {
        const { localPath, sourceChecksum } = await downloadSource(asset, workspace);
        const video = await probeVideo(localPath);
        const frameEvidence = await buildFrameEvidence(localPath, video);
        const evidence = await persistBodyCinemaSourceEvidence(asset.creatorId, {
          sourceMediaUrl: asset.sourceUrl,
          sourceType: "video",
          sourceFingerprint: sourceChecksum,
          analysisVersion: "server-existing-media-movenet/v1",
          frameEvidence,
        });
        if (evidence.analysisStatus !== "verified") {
          failures.push(`${asset.id}: ${evidence.rejectionReasons.join(" ")}`);
          continue;
        }
        const direction = chooseDirection(evidence);
        if (!direction || direction.confidence < 40) {
          failures.push(`${asset.id}: no source-supported treatment was available.`);
          continue;
        }
        const approvedEvidence = await approveBodyCinemaDirection(asset.creatorId, evidence.id, direction.id);
        const idempotencyKey = `body-cinema-existing-proof:${asset.creatorId}:${sourceChecksum}:${direction.id}`;
        const prompt = [
          buildEvidenceBackedDirectionPrompt(direction),
          "Identity requirement: preserve the exact source subject. No face replacement, body swap, fabricated identity, altered body proportions, or invented choreography.",
          `Output purpose: Body Cinema no-spend proof request for ${direction.label}; no provider submission is authorized by this preparation step.`,
        ].join(" ");
        const draft = await createGovernedPolloDraft({
          creatorId: asset.creatorId,
          requestedBy: asset.creatorId,
          sourceUrl: asset.sourceUrl,
          sourceChecksum,
          prompt,
          resolution: "720p",
          durationSeconds: 6,
          aspectRatio: aspectRatio(asset, video),
          mode: "body-cinema-pre-provider-proof",
          outputCount: 1,
          estimatedCostCredits: null,
          costEvidenceReference: null,
          ownershipConfirmed: true,
          consentConfirmed: true,
          idempotencyKey,
          metadata: {
            sourceAssetId: asset.id,
            sourceFileName: asset.fileName,
            sourceCreatedAt: asset.createdAt,
            sourceOwnershipBasis: "media_assets.user_id matches governed creator_id",
            consentBasis: "creator-owned existing CreatorVault upload selected for the owner-directed no-spend Body Cinema proof",
            identityRequirements: "Preserve the exact source subject; no identity, facial-feature, body-proportion, or choreography fabrication.",
            outputPurpose: "Body Cinema pre-provider proof; render remains disabled until governed paid execution is explicitly enabled.",
            costControl: {
              state: "quote_required",
              providerCallAllowed: false,
              estimatedCostCredits: null,
              reason: "No provider quote or paid execution has been requested during no-spend proof preparation.",
            },
            bodyCinemaEvidenceId: approvedEvidence.id,
            bodyCinemaDirectionId: direction.id,
            bodyCinemaTimeline: direction.timeline,
            editorFindings: approvedEvidence.editorFindings || null,
          },
        });
        updateAttestation({
          state: "ready",
          creatorId: asset.creatorId,
          sourceAssetId: asset.id,
          sourceFingerprint: sourceChecksum,
          evidenceId: approvedEvidence.id,
          treatmentId: direction.id,
          governedJobId: draft.job.id,
          governedState: draft.job.state,
          rejectionSummary: null,
        });
        return getBodyCinemaPreProviderAttestation();
      } catch (error) {
        failures.push(`${asset.id}: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
    updateAttestation({ state: "no_usable_source", rejectionSummary: failures.slice(0, 6).join(" | ") || "No existing creator video produced verified source evidence." });
    return getBodyCinemaPreProviderAttestation();
    } finally {
      await fs.rm(workspace, { recursive: true, force: true }).catch(() => undefined);
    }
  } catch (error) {
    updateAttestation({ state: "failed", rejectionSummary: error instanceof Error ? error.message : String(error) });
    return getBodyCinemaPreProviderAttestation();
  }
}
