import { createHash } from "node:crypto";
import { execFile } from "node:child_process";
import { createReadStream, promises as fs } from "node:fs";
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
  getBodyCinemaSourceEvidence,
  getBodyCinemaSourceUrlBlock,
  type BodyCinemaFrameEvidence,
  persistBodyCinemaSourceEvidence,
} from "./bodyCinemaEvidenceService";
import { createGovernedPolloDraft, ensureGovernedPolloSchema, listGovernedPolloJobs } from "./governedPolloService";
import { persistBodyCinemaSourceMap } from "./bodyCinemaSourceMapService";

const execFileAsync = promisify(execFile);
const OWNER_CREATOR_IDS = [6, 33];
const MAX_CANDIDATES = 24;
const SAMPLE_COUNT = 12;
const MAX_SOURCE_BYTES = 750 * 1024 * 1024;
const DIRECT_UPLOADS_DIR = "/root/uploads/content-vault";
const DIRECT_UPLOAD_RECEIPTS_DIR = "/root/uploads/content-vault-receipts";
const LEGACY_MEDIA_ROOTS = [
  "/root/creatorvault/storage/uploads",
  "/root/creatorvault/uploads",
  "/root/uploads",
  "/root/uploads/content-vault",
];

type ExistingVideoAsset = {
  id: string;
  creatorId: number;
  sourceUrl: string;
  storagePath: string | null;
  fileName: string;
  ownershipBasis: "media_asset_record" | "content_record" | "vaultx_content_record" | "clone_training_record" | "verified_upload_receipt";
  declaredChecksum: string | null;
  durationSeconds: number | null;
  width: number | null;
  height: number | null;
  createdAt: string | null;
  sourceType?: string | null;
};

type PreProviderAttestation = {
  state: "idle" | "running" | "ready" | "no_usable_source" | "failed";
  updatedAt: string | null;
  creatorId: number | null;
  sourceAssetId: string | null;
  sourceFingerprint: string | null;
  sourceReadOrigin: "durable_storage" | "public_url" | null;
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
  sourceReadOrigin: null,
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
    `SELECT id, user_id, public_url, storage_path, file_name, original_name, source_type, duration, width, height, created_at
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
    storagePath: row.storage_path ? String(row.storage_path) : null,
    fileName: String(row.original_name || row.file_name || `creatorvault-${row.id}.mp4`),
    ownershipBasis: "media_asset_record",
    declaredChecksum: null,
    durationSeconds: row.duration === null || row.duration === undefined ? null : Number(row.duration),
    width: row.width === null || row.width === undefined ? null : Number(row.width),
    height: row.height === null || row.height === undefined ? null : Number(row.height),
    createdAt: row.created_at ? String(row.created_at) : null,
    sourceType: row.source_type ? String(row.source_type) : null,
  }));
}

type DirectUploadReceipt = {
  id?: unknown;
  creatorId?: unknown;
  url?: unknown;
  filename?: unknown;
  size?: unknown;
  mime?: unknown;
  sha256?: unknown;
  media?: { codec?: unknown; width?: unknown; height?: unknown; durationSec?: unknown };
  verified?: unknown;
  createdAt?: unknown;
};

async function listCreatorContentVideos(): Promise<ExistingVideoAsset[]> {
  const placeholders = OWNER_CREATOR_IDS.map(() => "?").join(", ");
  const rows = await queryRows<any>(
    `SELECT id, user_id, file_url, file_key, title, mime_type, created_at
       FROM content
      WHERE user_id IN (${placeholders})
        AND content_type = 'video'
        AND file_url IS NOT NULL
        AND file_url <> ''
      ORDER BY created_at DESC
      LIMIT ${MAX_CANDIDATES}`,
    OWNER_CREATOR_IDS,
  );
  return rows.map((row) => {
    const sourceUrl = String(row.file_url);
    const fromKey = row.file_key ? path.basename(String(row.file_key)) : "";
    const fromUrl = path.basename(new URL(sourceUrl).pathname) || "creatorvault-content.mp4";
    return {
      id: `content-${String(row.id)}`,
      creatorId: Number(row.user_id),
      sourceUrl,
      storagePath: row.file_key && path.isAbsolute(String(row.file_key)) ? String(row.file_key) : null,
      fileName: fromKey || fromUrl,
      ownershipBasis: "content_record" as const,
      declaredChecksum: null,
      durationSeconds: null,
      width: null,
      height: null,
      createdAt: row.created_at ? String(row.created_at) : null,
    };
  });
}

async function listCloneTrainingVideos(): Promise<ExistingVideoAsset[]> {
  const placeholders = OWNER_CREATOR_IDS.map(() => "?").join(", ");
  const rows = await queryRows<any>(
    `SELECT id, user_id, original_filename, storage_path, storage_url, mime_type, duration_seconds, width, height, uploaded_at
       FROM clone_training_uploads
      WHERE user_id IN (${placeholders})
        AND source_type = 'video'
        AND storage_url IS NOT NULL
        AND storage_url <> ''
      ORDER BY uploaded_at DESC
      LIMIT ${MAX_CANDIDATES}`,
    OWNER_CREATOR_IDS,
  );
  return rows.map((row) => ({
    id: `clone-training-${String(row.id)}`,
    creatorId: Number(row.user_id),
    sourceUrl: String(row.storage_url),
    storagePath: row.storage_path && path.isAbsolute(String(row.storage_path)) ? String(row.storage_path) : null,
    fileName: String(row.original_filename || path.basename(new URL(String(row.storage_url)).pathname) || `clone-training-${row.id}.mp4`),
    ownershipBasis: "clone_training_record" as const,
    declaredChecksum: null,
    durationSeconds: Number.isFinite(Number(row.duration_seconds)) ? Number(row.duration_seconds) : null,
    width: Number.isFinite(Number(row.width)) ? Number(row.width) : null,
    height: Number.isFinite(Number(row.height)) ? Number(row.height) : null,
    createdAt: row.uploaded_at ? String(row.uploaded_at) : null,
  }));
}

async function listVaultxCreatorVideos(): Promise<ExistingVideoAsset[]> {
  const placeholders = OWNER_CREATOR_IDS.map(() => "?").join(", ");
  const rows = await queryRows<any>(
    `SELECT id, creator_id, uncensored_url, title, content_type, created_at
       FROM vaultx_content
      WHERE creator_id IN (${placeholders})
        AND status = 'active'
        AND content_type = 'video'
        AND uncensored_url IS NOT NULL
        AND uncensored_url <> ''
      ORDER BY created_at DESC
      LIMIT ${MAX_CANDIDATES}`,
    OWNER_CREATOR_IDS,
  );
  return rows.map((row) => {
    const sourceUrl = String(row.uncensored_url);
    const fileName = path.basename(new URL(sourceUrl).pathname) || `${String(row.title || "creatorvault-vaultx")}.mp4`;
    return {
      id: `vaultx-content-${String(row.id)}`,
      creatorId: Number(row.creator_id),
      sourceUrl,
      storagePath: null,
      fileName,
      ownershipBasis: "vaultx_content_record" as const,
      declaredChecksum: null,
      durationSeconds: null,
      width: null,
      height: null,
      createdAt: row.created_at ? String(row.created_at) : null,
    };
  });
}

async function listVerifiedDirectUploadVideos(): Promise<ExistingVideoAsset[]> {
  let receiptNames: string[];
  try {
    const receiptEntries = await Promise.all(
      (await fs.readdir(DIRECT_UPLOAD_RECEIPTS_DIR))
        .filter((name) => name.endsWith(".json"))
        .map(async (name) => ({
          name,
          modifiedAt: (await fs.stat(path.join(DIRECT_UPLOAD_RECEIPTS_DIR, name))).mtimeMs,
        })),
    );
    receiptNames = receiptEntries
      .sort((left, right) => right.modifiedAt - left.modifiedAt)
      .slice(0, MAX_CANDIDATES * 4)
      .map((entry) => entry.name);
  } catch (error: any) {
    if (error?.code === "ENOENT") return [];
    throw error;
  }

  const assets: ExistingVideoAsset[] = [];
  for (const receiptName of receiptNames) {
    try {
      const receipt = JSON.parse(await fs.readFile(path.join(DIRECT_UPLOAD_RECEIPTS_DIR, receiptName), "utf8")) as DirectUploadReceipt;
      const id = typeof receipt.id === "string" && /^[a-f0-9-]{36}$/i.test(receipt.id) ? receipt.id : null;
      const creatorId = Number(receipt.creatorId);
      const fileName = typeof receipt.filename === "string" ? path.basename(receipt.filename) : null;
      const sourceUrl = typeof receipt.url === "string" && receipt.url.startsWith("https://creatorvault.live/uploads/content-vault/") ? receipt.url : null;
      const declaredChecksum = typeof receipt.sha256 === "string" && /^[a-f0-9]{64}$/i.test(receipt.sha256) ? receipt.sha256.toLowerCase() : null;
      if (!id || !OWNER_CREATOR_IDS.includes(creatorId) || !fileName || !sourceUrl || !declaredChecksum || receipt.verified !== true) continue;
      if (!isSupportedReceiptVideo(fileName, receipt.mime)) continue;
      assets.push({
        id,
        creatorId,
        sourceUrl,
        storagePath: path.join(DIRECT_UPLOADS_DIR, id, fileName),
        fileName,
        ownershipBasis: "verified_upload_receipt",
        declaredChecksum,
        durationSeconds: Number.isFinite(Number(receipt.media?.durationSec)) ? Number(receipt.media?.durationSec) : null,
        width: Number.isFinite(Number(receipt.media?.width)) ? Number(receipt.media?.width) : null,
        height: Number.isFinite(Number(receipt.media?.height)) ? Number(receipt.media?.height) : null,
        createdAt: typeof receipt.createdAt === "string" ? receipt.createdAt : null,
      });
    } catch {
      // A malformed receipt can never become source evidence; continue to the next verified record.
    }
  }
  return assets;
}

function isSupportedReceiptVideo(fileName: string, mime: unknown): boolean {
  const extension = safeExtension(fileName);
  const mimeType = typeof mime === "string" ? mime.toLowerCase() : "";
  return [".mp4", ".mov", ".webm", ".mkv", ".avi", ".m4v"].includes(extension) && (!mimeType || mimeType.startsWith("video/"));
}

async function listAllExistingCreatorVideos(): Promise<ExistingVideoAsset[]> {
  // Automatic VaultX Body Cinema selection is intentionally narrower than the
  // full media library. It may use only a creator's verified direct-upload
  // receipt with a matching checksum; seed, demo, hero, clone, render, and
  // generic media-library records require a separate explicit classification.
  const receiptAssets = await listVerifiedDirectUploadVideos();
  const seen = new Set<string>();
  return receiptAssets
    .sort((left, right) => String(right.createdAt || "").localeCompare(String(left.createdAt || "")))
    .filter((asset) => {
      const key = `${asset.creatorId}:${asset.sourceUrl}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return asset.ownershipBasis === "verified_upload_receipt" && Boolean(asset.declaredChecksum) && !excludedSourceReason(asset);
    })
    .slice(0, MAX_CANDIDATES);
}

function safeExtension(name: string): string {
  const extension = path.extname(name).toLowerCase();
  return [".mp4", ".mov", ".webm", ".mkv", ".avi", ".m4v"].includes(extension) ? extension : ".mp4";
}

function derivedSourceReason(asset: ExistingVideoAsset): string | null {
  const source = asset.sourceUrl.toLowerCase();
  const fileName = asset.fileName.toLowerCase();
  if (source.includes("/uploads/renders/")) return "CreatorVault render outputs cannot be reused as Body Cinema source footage.";
  if (/^(vaultx-edit|body-cinema|homepage-motion|motion-)/.test(fileName)) return "Known CreatorVault derived media cannot be reused as Body Cinema source footage.";
  return null;
}

function protectedKingCamHeroReason(asset: ExistingVideoAsset): string | null {
  const identifier = `${asset.sourceUrl} ${asset.fileName}`.toLowerCase();
  if (/(kingcam|continuous-hero|kingcam-hero|hero-loop)/.test(identifier)) {
    return "Protected KingCam hero media is never eligible for VaultX Body Cinema source selection.";
  }
  return null;
}

function demonstrationMediaReason(asset: ExistingVideoAsset): string | null {
  const identifier = `${asset.sourceUrl} ${asset.fileName}`.toLowerCase();
  if (/(^|[-_\s])(demo|showcase|pilot|sample|test|placeholder)([-_\s.]|$)/.test(identifier)) {
    return "Seed, demo, showcase, pilot, sample, test, and placeholder media are never eligible for automatic Body Cinema source selection.";
  }
  return null;
}

function excludedSourceReason(asset: ExistingVideoAsset): string | null {
  return protectedKingCamHeroReason(asset) || demonstrationMediaReason(asset) || derivedSourceReason(asset);
}

function sourceIntegrityRejections(asset: ExistingVideoAsset, video: { durationSeconds: number }, frameEvidence: BodyCinemaFrameEvidence[]): string[] {
  const reasons: string[] = [];
  const excluded = excludedSourceReason(asset);
  if (excluded) reasons.push(excluded);
  if (video.durationSeconds < 4) reasons.push("Body Cinema requires at least four seconds of original recorded footage for source-motion review.");
  const tail = frameEvidence.slice(-2);
  if (tail.length === 2 && tail.every((frame) => Number(frame.brightness || 0) < 0.035)) {
    reasons.push("The source ends in near-black frames and cannot support a protected Body Cinema finish.");
  }
  return reasons;
}

async function checksumFile(filePath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const hash = createHash("sha256");
    const stream = createReadStream(filePath);
    stream.on("data", (chunk) => hash.update(chunk));
    stream.on("error", reject);
    stream.on("end", () => resolve(hash.digest("hex")));
  });
}

function isDurableLocalMediaPath(value: string | null): value is string {
  return Boolean(value && path.isAbsolute(value) && !value.includes("\u0000"));
}

function localSourceCandidates(asset: ExistingVideoAsset): string[] {
  const basename = path.basename(asset.fileName);
  const extension = safeExtension(asset.fileName);
  const candidates = [
    asset.storagePath,
    ...LEGACY_MEDIA_ROOTS.flatMap((root) => [
      path.join(root, basename),
      path.join(root, `${asset.id}${extension}`),
      path.join(root, asset.id, basename),
    ]),
  ].filter(isDurableLocalMediaPath);
  return [...new Set(candidates)];
}

async function downloadSource(asset: ExistingVideoAsset, directory: string): Promise<{ localPath: string; sourceChecksum: string; sourceReadOrigin: "durable_storage" | "public_url" }> {
  const localPath = path.join(directory, `${asset.id}${safeExtension(asset.fileName)}`);
  for (const candidatePath of localSourceCandidates(asset)) {
    try {
      const stat = await fs.stat(candidatePath);
      if (!stat.isFile()) continue;
      if (stat.size < 1) continue;
      if (stat.size > MAX_SOURCE_BYTES) throw new Error("storage file exceeds the safe source-analysis size limit");
      await fs.copyFile(candidatePath, localPath);
      const sourceChecksum = await checksumFile(localPath);
      if (asset.declaredChecksum && asset.declaredChecksum !== sourceChecksum) throw new Error("Verified upload receipt checksum does not match the durable source file.");
      return { localPath, sourceChecksum, sourceReadOrigin: "durable_storage" };
    } catch (error: any) {
      if (!error || !["ENOENT", "EACCES", "EPERM"].includes(error.code)) throw error;
    }
  }

  const response = await fetch(asset.sourceUrl, { redirect: "follow" });
  if (!response.ok || !response.body) throw new Error(`Stored CreatorVault video could not be read (${response.status}).`);
  const declaredLength = Number(response.headers.get("content-length") || 0);
  if (declaredLength > MAX_SOURCE_BYTES) throw new Error("Stored CreatorVault video exceeds the safe source-analysis size limit.");
  const declaredType = String(response.headers.get("content-type") || "").toLowerCase();
  if (declaredType && !declaredType.includes("video/")) throw new Error(`Stored CreatorVault media URL did not return video data (${declaredType}).`);
  const buffer = Buffer.from(await response.arrayBuffer());
  if (!buffer.length) throw new Error("Stored CreatorVault video is empty.");
  if (buffer.length > MAX_SOURCE_BYTES) throw new Error("Stored CreatorVault video exceeds the safe source-analysis size limit.");
  await fs.writeFile(localPath, buffer);
  return { localPath, sourceChecksum: createHash("sha256").update(buffer).digest("hex"), sourceReadOrigin: "public_url" };
}

export async function probeVideo(localPath: string): Promise<{ durationSeconds: number; width: number; height: number }> {
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

export async function buildFrameEvidence(localPath: string, video: { durationSeconds: number; width: number; height: number }): Promise<BodyCinemaFrameEvidence[]> {
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

async function restorePersistedPreProviderAttestation(): Promise<boolean> {
  const jobs = (await Promise.all(OWNER_CREATOR_IDS.map((creatorId) => listGovernedPolloJobs({ creatorId, limit: 50 })))).flat()
    .filter((job) => job.mode === "body-cinema-pre-provider-proof" && ["draft", "cost_pending", "awaiting_approval"].includes(job.state))
    .sort((left, right) => right.id - left.id);

  for (const job of jobs) {
    const evidenceId = typeof job.metadata.bodyCinemaEvidenceId === "string" ? job.metadata.bodyCinemaEvidenceId : null;
    const treatmentId = typeof job.metadata.bodyCinemaDirectionId === "string" ? job.metadata.bodyCinemaDirectionId : null;
    const metadataSourceAssetId = typeof job.metadata.sourceAssetId === "string" ? job.metadata.sourceAssetId : null;
    const urlSourceAssetId = (() => {
      try {
        const match = new URL(job.sourceUrl).pathname.match(/^\/uploads\/content-vault\/([a-f0-9-]{36})\//i);
        return match?.[1] || null;
      } catch {
        return null;
      }
    })();
    const sourceAssetId = metadataSourceAssetId || urlSourceAssetId;
    if (!evidenceId || !treatmentId || !sourceAssetId || !job.sourceChecksum) continue;
    if (job.metadata.sourceOwnershipBasis !== "verified direct-upload receipt creatorId matches governed creator_id and receipt checksum matches durable source bytes") continue;
    const restoredAsset = { id: sourceAssetId, creatorId: job.creatorId, sourceUrl: job.sourceUrl, storagePath: null, fileName: path.basename(new URL(job.sourceUrl).pathname), ownershipBasis: "media_asset_record" as const, declaredChecksum: null, durationSeconds: null, width: null, height: null, createdAt: null };
    if (excludedSourceReason(restoredAsset)) continue;
    const evidence = await getBodyCinemaSourceEvidence(job.creatorId, evidenceId);
    if (!evidence || evidence.analysisStatus !== "verified" || evidence.reviewStatus !== "ready" || evidence.selectedDirectionId !== treatmentId) continue;
    if (evidence.sourceMediaUrl !== job.sourceUrl || evidence.sourceFingerprint !== job.sourceChecksum) continue;
    await persistBodyCinemaSourceMap({ creatorId: job.creatorId, evidenceId });
    updateAttestation({
      state: "ready",
      creatorId: job.creatorId,
      sourceAssetId,
      sourceFingerprint: job.sourceChecksum,
      sourceReadOrigin: "durable_storage",
      evidenceId,
      treatmentId,
      governedJobId: job.id,
      governedState: job.state,
      rejectionSummary: null,
    });
    return true;
  }
  return false;
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
    if (await restorePersistedPreProviderAttestation()) return getBodyCinemaPreProviderAttestation();
    const candidates = await listAllExistingCreatorVideos();
    if (!candidates.length) {
      updateAttestation({ state: "no_usable_source", rejectionSummary: "No ready creator-owned videos were found in the existing media library." });
      return getBodyCinemaPreProviderAttestation();
    }

    const workspace = await fs.mkdtemp(path.join(os.tmpdir(), "creatorvault-body-cinema-proof-"));
    const failures: string[] = [];
    try {
    for (const asset of candidates) {
      try {
        const blockedSource = await getBodyCinemaSourceUrlBlock(asset.creatorId, asset.sourceUrl);
        if (blockedSource) {
          failures.push(`${asset.id}: previously rejected Body Cinema source remains blocked. ${blockedSource.reasons.slice(-1).join(" ")}`);
          continue;
        }
        const { localPath, sourceChecksum, sourceReadOrigin } = await downloadSource(asset, workspace);
        const video = await probeVideo(localPath);
        const frameEvidence = await buildFrameEvidence(localPath, video);
        const integrityRejections = sourceIntegrityRejections(asset, video, frameEvidence);
        if (integrityRejections.length) {
          failures.push(`${asset.id}: ${integrityRejections.join(" ")}`);
          continue;
        }
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
        const sourceMap = await persistBodyCinemaSourceMap({ creatorId: asset.creatorId, evidenceId: approvedEvidence.id });
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
            sourceReadOrigin,
            sourceFileName: asset.fileName,
            sourceCreatedAt: asset.createdAt,
            sourceOwnershipBasis: asset.ownershipBasis === "verified_upload_receipt"
              ? "verified direct-upload receipt creatorId matches governed creator_id and receipt checksum matches durable source bytes"
              : asset.ownershipBasis === "content_record"
                ? "content.user_id matches governed creator_id"
                : asset.ownershipBasis === "vaultx_content_record"
                  ? "vaultx_content.creator_id matches governed creator_id"
                  : asset.ownershipBasis === "clone_training_record"
                    ? "clone_training_uploads.user_id matches governed creator_id"
                    : "media_assets.user_id matches governed creator_id",
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
            bodyCinemaSourceMapId: sourceMap.id,
            bodyCinemaSourceMapVersion: sourceMap.analysisVersion,
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
          sourceReadOrigin,
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

export type BodyCinemaSavedSourceInventoryItem = {
  sourceAssetId: string;
  creatorId: number;
  sourceUrl: string;
  fileName: string;
  ownershipBasis: ExistingVideoAsset["ownershipBasis"];
  sourceType: string | null;
  classification: "generated" | "derived_or_protected" | "unclassified_creator_media" | "candidate_pending_private_review";
  eligibility: "ineligible" | "pending_private_review";
  reasons: string[];
  createdAt: string | null;
};

async function listAllSavedCreatorVideosForInventory(): Promise<ExistingVideoAsset[]> {
  const [mediaAssets, contentAssets, cloneTrainingAssets, vaultxContentAssets, receiptAssets] = await Promise.all([
    listExistingCreatorVideos(), listCreatorContentVideos(), listCloneTrainingVideos(), listVaultxCreatorVideos(), listVerifiedDirectUploadVideos(),
  ]);
  const seen = new Set<string>();
  return [...mediaAssets, ...contentAssets, ...cloneTrainingAssets, ...vaultxContentAssets, ...receiptAssets]
    .sort((left, right) => String(right.createdAt || "").localeCompare(String(left.createdAt || "")))
    .filter((asset) => {
      const key = `${asset.creatorId}:${asset.sourceUrl}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

function inventoryItem(asset: ExistingVideoAsset): BodyCinemaSavedSourceInventoryItem {
  const reasons = [excludedSourceReason(asset)].filter((reason): reason is string => Boolean(reason));
  if (String(asset.sourceType || "").toLowerCase() === "generated") reasons.push("This Media Vault record is classified as generated media, not original creator footage.");
  const verifiedReceipt = asset.ownershipBasis === "verified_upload_receipt" && Boolean(asset.declaredChecksum);
  if (!verifiedReceipt && !reasons.length) reasons.push("This saved video is creator-linked but lacks the verified direct-upload receipt required for automatic Body Cinema use.");
  const eligible = verifiedReceipt && !reasons.length;
  return {
    sourceAssetId: asset.id,
    creatorId: asset.creatorId,
    sourceUrl: asset.sourceUrl,
    fileName: asset.fileName,
    ownershipBasis: asset.ownershipBasis,
    sourceType: asset.sourceType || null,
    classification: String(asset.sourceType || "").toLowerCase() === "generated"
      ? "generated"
      : reasons.some((reason) => /protected|render|demo|showcase|pilot|sample|test|placeholder/i.test(reason))
        ? "derived_or_protected"
        : eligible
          ? "candidate_pending_private_review"
          : "unclassified_creator_media",
    eligibility: eligible ? "pending_private_review" : "ineligible",
    reasons,
    createdAt: asset.createdAt,
  };
}

export async function getBodyCinemaSavedSourceInventory(): Promise<BodyCinemaSavedSourceInventoryItem[]> {
  return (await listAllSavedCreatorVideosForInventory()).map(inventoryItem);
}
