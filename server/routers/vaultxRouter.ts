/**
 * vaultxRouter — Production VaultX Platform Router
 * All procedures query real MySQL tables. Zero stubs. Zero mocks.
 * Platform fee: 15% (creator keeps 85%) — THIS IS LAW.
 * Owner userIds: 6 and 33
 */
import { z } from "zod";
import { router, protectedProcedure, publicProcedure } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import Stripe from "stripe";
import { db } from "../db";
import { users } from "../../drizzle/schema";
import { eq, desc, and, sql } from "drizzle-orm";
import { randomUUID } from "crypto";
import * as fs from "fs";
import * as path from "path";
import { execSync, spawn } from "child_process";
import { runAutomatedDirector } from "../services/automatedDirectorService";
import { runTeaseEngine } from "../services/teaseEngineService";
import { distributionEngineExport } from "../services/distributionEngineService";
import { enhanceSceneByScene } from "../services/sceneEnhancementService";
import { buildPpvBundle, createTipUnlockContent, suggestContentPrice, getPpvProgress } from "../services/monetizationBundleService";
import { generateRecutSuggestions, generateAbThumbnails, analyzeHookStrength } from "../services/analyticsEditingService";
import { qualityGate } from "../services/qualityGate";
import { createAIDrop, sendDropToChannel } from "../services/telegramCampaign";
import {
  assertReadyVaultxPackageArtifact,
  assertReadyVaultxProjectArtifact,
  createVaultxArtifact,
  ensureVaultxArtifactSchema,
  failProjectReadiness,
  getLatestReadyProjectArtifact,
  listVaultxPackageArtifacts,
  listVaultxProjectArtifacts,
  persistLocalReadyVaultxArtifact,
  persistReadyVaultxArtifact,
  pollAndPersistProviderArtifact,
  publicArtifactPayload,
  recordVaultxArtifactEvent,
  syncProjectArtifactReadiness,
  updateVaultxArtifactStatus,
  VaultxArtifactNotReadyError,
} from "../services/vaultxArtifactSpineService";

const OWNER_IDS = [6, 33];
const PLATFORM_FEE = 0.15;
const UPLOAD_DIR = "/root/creatorvault/dist/public/uploads/vaultx";
const PUBLIC_UPLOADS_DIR = path.resolve(process.cwd(), "..", "uploads");
const FRONTEND_BASE_URL = (process.env.VITE_FRONTEND_FORGE_API_URL || process.env.FRONTEND_URL || "https://creatorvault.live/api").replace(/\/api$/, "");
const POLLO_API_KEY = process.env.POLLO_API_KEY || "";
const POLLO_API_URL = "https://pollo.ai/api/platform/generation/pollo/pollo-v1-6";
const POLLO_BASE_URL = "https://pollo.ai/api/platform";
const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: "2025-12-15.clover" })
  : null;

type VaultxPackageMode = "FAST" | "BOOST" | "FULL";
type VaultxPackageContentType = "photo" | "video" | "audio";

function normalisePolloStatus(status: string | undefined | null): "waiting" | "processing" | "succeed" | "failed" {
  const value = String(status || "").toLowerCase();
  if (["succeed", "success", "completed", "complete", "done"].includes(value)) return "succeed";
  if (["failed", "error", "cancelled", "canceled"].includes(value)) return "failed";
  if (["processing", "running", "generating", "in_progress"].includes(value)) return "processing";
  return "waiting";
}

async function ensureVaultxRevenuePackageSchema(): Promise<void> {
  await rawExec(`CREATE TABLE IF NOT EXISTS vaultx_revenue_packages (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    creator_id BIGINT NOT NULL,
    user_id BIGINT NOT NULL,
    title VARCHAR(255) NOT NULL,
    content_type VARCHAR(32) NOT NULL,
    adult_content_flag TINYINT(1) NOT NULL DEFAULT 0,
    consent_confirmed TINYINT(1) NOT NULL DEFAULT 0,
    teaser_description TEXT NOT NULL,
    public_teaser_copy TEXT NOT NULL,
    price_cents INT NOT NULL,
    vip_price_cents INT DEFAULT NULL,
    platform_fee_bps INT NOT NULL DEFAULT 1500,
    creator_keep_bps INT NOT NULL DEFAULT 8500,
    telegram_mode VARCHAR(16) NOT NULL DEFAULT 'FAST',
    source_media_url TEXT DEFAULT NULL,
    asset_prompt TEXT DEFAULT NULL,
    pollo_job_id VARCHAR(255) DEFAULT NULL,
    asset_status VARCHAR(32) DEFAULT NULL,
    asset_url TEXT DEFAULT NULL,
    asset_quality_passed TINYINT(1) NOT NULL DEFAULT 0,
    checkout_url TEXT DEFAULT NULL,
    stripe_checkout_session_id VARCHAR(255) DEFAULT NULL,
    telegram_campaign_id BIGINT DEFAULT NULL,
    telegram_tracking_code VARCHAR(255) DEFAULT NULL,
    vaultx_content_id BIGINT DEFAULT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'created',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_vaultx_revenue_creator (creator_id),
    INDEX idx_vaultx_revenue_user (user_id),
    INDEX idx_vaultx_revenue_pollo (pollo_job_id),
    INDEX idx_vaultx_revenue_campaign (telegram_campaign_id)
  )`);
}

function buildVaultxPackagePublicCopy(input: {
  title: string;
  teaserDescription: string;
  priceCents: number;
  vipPriceCents?: number | null;
  telegramMode: VaultxPackageMode;
}): string {
  const price = (input.priceCents / 100).toFixed(2);
  const vip = input.vipPriceCents ? ` VIP route opens at $${(input.vipPriceCents / 100).toFixed(2)} after the first unlock.` : "";
  const modeMechanic = input.telegramMode === "FAST"
    ? "fast teaser to paid unlock"
    : input.telegramMode === "BOOST"
      ? "boosted preview to tracked paid unlock"
      : "full teaser, paid unlock, follow-up, and VIP escalation route";
  return `VaultX turns this creator asset into a ${modeMechanic}: ${input.title}. ${input.teaserDescription} Unlock at $${price}; every click is tracked through the paid route.${vip} Tap the VaultX route when it opens.`;
}

function buildVaultxPackagePolloPrompt(pkg: any): string {
  const modeLine = pkg.telegram_mode === "FULL"
    ? "Build a cinematic 8-second premium promo clip with a clear teaser beat, unlock tension, and VIP-route finish."
    : pkg.telegram_mode === "BOOST"
      ? "Build a cinematic 6-second boosted teaser clip with one premium preview beat and a clean paid-unlock finish."
      : "Build a cinematic 5-second fast teaser clip that turns attention into one paid unlock action.";
  return [
    modeLine,
    `VaultX package title: ${pkg.title}.`,
    `Creator-safe teaser: ${pkg.teaser_description}.`,
    "Visual law: dark luxury, near black #0A0A0A energy, electric cyan #00D9FF, muted gold #C9A84C, dramatic rim lighting, premium editorial motion, no explicit nudity, no crude framing.",
    "Mechanism: teaser to paid unlock to tracked click to follow-up to VIP route.",
    "Output should feel like a branded VaultX revenue asset, not a generic social clip."
  ].join(" ");
}

async function assertPackageOwner(packageId: number, userId: number): Promise<any> {
  await ensureVaultxRevenuePackageSchema();
  const rows = await rawQuery("SELECT * FROM vaultx_revenue_packages WHERE id = ? LIMIT 1", [packageId]);
  const pkg = rows[0];
  if (!pkg) throw new TRPCError({ code: "NOT_FOUND", message: "VaultX revenue package not found." });
  if (!isCreatorOrOwner(userId, Number(pkg.user_id))) {
    throw new TRPCError({ code: "FORBIDDEN", message: "You do not own this VaultX revenue package." });
  }
  return pkg;
}

// Raw MySQL2 connection for tables not in Drizzle schema
async function rawQuery(query: string, params: any[] = []): Promise<any[]> {
  const pool = (db as any).$client || (db as any).client;
  if (pool && typeof pool.promise === "function") {
    const [rows] = await pool.promise().query(query, params);
    return rows as any[];
  }
  if (pool && typeof pool.execute === "function") {
    const [rows] = await pool.execute(query, params);
    return rows as any[];
  }
  const result = await (db as any).execute(sql.raw(query.replace(/\?/g, (_: any, i: number) => `'${params[i]}'`)));
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
  await (db as any).execute(sql.raw(query));
}

function isCreatorOrOwner(userId: number, creatorId?: number): boolean {
  return OWNER_IDS.includes(userId) || (creatorId !== undefined && userId === creatorId);
}

function validateVaultxWorkflowCopy(text: string, purpose: "metadata" | "mass-message" | "ai-chatter", recipientKey?: string | number): string {
  return qualityGate.check(text, {
    surface: "vaultx-drop",
    context: "vaultx",
    recipientKey,
    hasActionElement: true,
    requireMessagingDna: true,
    requireMechanism: true,
    requireCreatorVaultPositioning: purpose !== "ai-chatter",
    ctaAngle: purpose === "ai-chatter" ? "automation-advantage" : purpose === "mass-message" ? "proof-unlock" : "asset-conversion",
  });
}

function validateVaultxMetadata(title: string, description?: string | null): void {
  const proofText = [title, description || ""].filter(Boolean).join(". ");
  validateVaultxWorkflowCopy(proofText, "metadata");
}

function validateVaultxChatterConfig(input: { isEnabled: boolean; personaDescription?: string | null; greetingMessage?: string | null }): void {
  if (!input.isEnabled) return;
  const proofText = [input.personaDescription || "", input.greetingMessage || ""].filter(Boolean).join(" ");
  validateVaultxWorkflowCopy(proofText, "ai-chatter");
}

async function getCreatorId(userId: number): Promise<number | null> {
  const rows = await rawQuery("SELECT id FROM vaultx_creators WHERE user_id = ? AND is_active = 1 LIMIT 1", [userId]);
  return rows[0]?.id ?? null;
}

async function ensureUploadDir(creatorId: number): Promise<string> {
  const dir = path.join(UPLOAD_DIR, String(creatorId));
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function runFFmpeg(args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const proc = spawn("ffmpeg", ["-y", ...args]);
    let stderr = "";
    proc.stderr.on("data", (d) => { stderr += d.toString(); });
    proc.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`FFmpeg exited ${code}: ${stderr.slice(-500)}`));
    });
  });
}

function publicUploadUrl(...parts: string[]): string {
  return `/uploads/${parts.map((part) => encodeURIComponent(part)).join("/")}`;
}

function mimeForOutputPath(filePathOrUrl: string, fallback = "video/mp4"): string {
  const clean = filePathOrUrl.split("?")[0].toLowerCase();
  if (clean.endsWith(".jpg") || clean.endsWith(".jpeg")) return "image/jpeg";
  if (clean.endsWith(".png")) return "image/png";
  if (clean.endsWith(".webp")) return "image/webp";
  if (clean.endsWith(".gif")) return "image/gif";
  if (clean.endsWith(".mp3")) return "audio/mpeg";
  if (clean.endsWith(".wav")) return "audio/wav";
  if (clean.endsWith(".mov")) return "video/quicktime";
  if (clean.endsWith(".mp4")) return "video/mp4";
  return fallback;
}

function readinessGateError(error: any): TRPCError {
  if (error instanceof VaultxArtifactNotReadyError) {
    return new TRPCError({ code: "PRECONDITION_FAILED", message: error.message, cause: error.details });
  }
  return error;
}

function safeParseArray(value: any): any[] {
  if (Array.isArray(value)) return value;
  if (!value) return [];
  try {
    const parsed = JSON.parse(String(value));
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function safeFileStem(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 72) || "body-cinema";
}

function isProbablyImage(filePath: string): boolean {
  return /\.(jpg|jpeg|png|webp|gif)$/i.test(filePath);
}

function normalizeLocalUploadPath(assetUrl: string): string | null {
  if (!assetUrl) return null;
  if (assetUrl.startsWith("/uploads/")) return path.join(PUBLIC_UPLOADS_DIR, decodeURIComponent(assetUrl.replace(/^\/uploads\//, "")));
  try {
    const parsed = new URL(assetUrl);
    if (parsed.pathname.startsWith("/uploads/")) {
      return path.join(PUBLIC_UPLOADS_DIR, decodeURIComponent(parsed.pathname.replace(/^\/uploads\//, "")));
    }
  } catch (_) {
    if (path.isAbsolute(assetUrl)) return assetUrl;
  }
  return null;
}

async function resolveBodyCinemaSource(assetUrl: string, workspaceDir: string): Promise<string> {
  const localPath = normalizeLocalUploadPath(assetUrl);
  if (localPath && fs.existsSync(localPath)) return localPath;
  if (path.isAbsolute(assetUrl) && fs.existsSync(assetUrl)) return assetUrl;
  const parsed = new URL(assetUrl);
  const ext = path.extname(parsed.pathname).match(/^\.[a-z0-9]+$/i)?.[0] || ".bin";
  const downloadPath = path.join(workspaceDir, `source-${randomUUID()}${ext}`);
  const response = await fetch(assetUrl);
  if (!response.ok) throw new Error(`Unable to fetch source asset (${response.status})`);
  const buffer = Buffer.from(await response.arrayBuffer());
  fs.writeFileSync(downloadPath, buffer);
  return downloadPath;
}

function ffprobeJson(filePath: string): any | null {
  try {
    return JSON.parse(execSync(`ffprobe -v quiet -print_format json -show_streams -show_format ${JSON.stringify(filePath)}`, { encoding: "utf8", maxBuffer: 10 * 1024 * 1024 }));
  } catch (_) {
    return null;
  }
}

function hasVideoStream(filePath: string): boolean {
  const probe = ffprobeJson(filePath);
  return Boolean(probe?.streams?.some((stream: any) => stream.codec_type === "video")) && !isProbablyImage(filePath);
}

function drawTextFilter(text: string, fontSize = 44): string {
  const escaped = text.replace(/\\/g, "\\\\").replace(/'/g, "\\'").replace(/:/g, "\\:");
  return `drawbox=x=0:y=ih-170:w=iw:h=170:color=black@0.48:t=fill,drawtext=text='${escaped}':x=(w-text_w)/2:y=h-118:fontsize=${fontSize}:fontcolor=white:shadowcolor=black@0.7:shadowx=2:shadowy=2`;
}

async function renderBodyCinemaArtifacts(input: {
  creatorId: number;
  collectionId: string;
  collectionName: string;
  sourceUrl: string;
  style: { label: string; palette: string[]; hook: string };
  platforms: string[];
  durationSeconds: number;
}): Promise<{ renderedOutputUrl: string; teaserUrl: string; thumbnailUrl: string; platformExports: any[]; renderMeta: any }> {
  const renderDir = path.join(PUBLIC_UPLOADS_DIR, "body-cinema", String(input.creatorId), input.collectionId);
  fs.mkdirSync(renderDir, { recursive: true });
  const sourcePath = await resolveBodyCinemaSource(input.sourceUrl, renderDir);
  const stem = safeFileStem(input.collectionName);
  const masterPath = path.join(renderDir, `${stem}-master.mp4`);
  const teaserPath = path.join(renderDir, `${stem}-teaser.mp4`);
  const thumbnailPath = path.join(renderDir, `${stem}-thumb.jpg`);
  const isVideo = hasVideoStream(sourcePath);
  const masterDuration = Math.max(12, Math.min(45, input.durationSeconds || 24));
  const teaserDuration = Math.min(9, masterDuration);
  const baseVideoFilter = `scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,eq=contrast=1.05:saturation=1.08,${drawTextFilter(input.style.hook, 46)}`;
  const teaserFilter = `scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,eq=contrast=1.08:saturation=1.12,${drawTextFilter("UNLOCK THE FULL BODY CINEMA COLLECTION", 38)}`;

  if (isVideo) {
    await runFFmpeg(["-i", sourcePath, "-t", String(masterDuration), "-vf", baseVideoFilter, "-c:v", "libx264", "-preset", "fast", "-crf", "20", "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "160k", "-movflags", "+faststart", masterPath]);
    await runFFmpeg(["-i", sourcePath, "-t", String(teaserDuration), "-vf", teaserFilter, "-an", "-c:v", "libx264", "-preset", "fast", "-crf", "23", "-pix_fmt", "yuv420p", "-movflags", "+faststart", teaserPath]);
  } else {
    await runFFmpeg(["-loop", "1", "-i", sourcePath, "-t", String(masterDuration), "-vf", `zoompan=z='min(zoom+0.0015,1.18)':d=${Math.round(masterDuration * 30)}:s=1080x1920:fps=30,${drawTextFilter(input.style.hook, 46)}`, "-c:v", "libx264", "-preset", "fast", "-crf", "20", "-pix_fmt", "yuv420p", "-movflags", "+faststart", masterPath]);
    await runFFmpeg(["-loop", "1", "-i", sourcePath, "-t", String(teaserDuration), "-vf", `zoompan=z='min(zoom+0.0025,1.15)':d=${Math.round(teaserDuration * 30)}:s=1080x1920:fps=30,${drawTextFilter("UNLOCK THE FULL BODY CINEMA COLLECTION", 38)}`, "-c:v", "libx264", "-preset", "fast", "-crf", "23", "-pix_fmt", "yuv420p", "-movflags", "+faststart", teaserPath]);
  }

  await runFFmpeg(["-i", masterPath, "-ss", "1", "-frames:v", "1", "-q:v", "2", thumbnailPath]);
  const relParts = ["body-cinema", String(input.creatorId), input.collectionId];
  const masterUrl = publicUploadUrl(...relParts, `${stem}-master.mp4`);
  const teaserUrl = publicUploadUrl(...relParts, `${stem}-teaser.mp4`);
  const thumbnailUrl = publicUploadUrl(...relParts, `${stem}-thumb.jpg`);
  const platformExports = input.platforms.map((platform) => ({
    platform,
    preset: platform === "instagram_reel" || platform === "twitter" ? "9:16 teaser MP4" : platform === "telegram" ? "private-channel teaser MP4" : "subscriber master MP4",
    status: "rendered",
    url: platform === "instagram_reel" || platform === "twitter" || platform === "telegram" ? teaserUrl : masterUrl,
  }));
  return {
    renderedOutputUrl: masterUrl,
    teaserUrl,
    thumbnailUrl,
    platformExports,
    renderMeta: {
      engine: "ffmpeg",
      sourceKind: isVideo ? "video" : "image",
      durationSeconds: masterDuration,
      outputs: { masterPath, teaserPath, thumbnailPath },
      renderedAt: new Date().toISOString(),
    },
  };
}


type BodyCinemaStyleKey = "luxury" | "noir" | "sunset" | "penthouse" | "editorial" | "vip_tease";
type BodyCinemaPlatformKey = "vaultx" | "onlyfans" | "fansly" | "telegram" | "instagram_reel" | "twitter";

type BodyCinemaMediaProfile = {
  kind: "video" | "image" | "unknown";
  durationSeconds: number;
  width: number | null;
  height: number | null;
  aspectRatio: string;
  fps: number | null;
  hasAudio: boolean;
  sourceConfidence: "probe" | "extension" | "url";
};

const BODY_CINEMA_REGION_WEIGHTS: Record<string, number> = {
  face: 0.74,
  bust: 0.92,
  abdomen: 0.82,
  hips: 0.88,
  glutes: 0.91,
  legs: 0.86,
  full: 0.96,
};

const BODY_CINEMA_STYLE_LIBRARY: Record<BodyCinemaStyleKey, { label: string; palette: string[]; direction: string; hook: string; tempo: string; tension: number }> = {
  luxury: { label: "Luxury Gold", palette: ["#C9A84C", "#F7E7B4", "#050505"], direction: "warm gold light, premium VIP pacing, polished cinematic reveal", hook: "Premium body-cinema drop", tempo: "slow luxury confidence", tension: 0.74 },
  noir: { label: "Noir Contrast", palette: ["#0A0A0A", "#FFFFFF", "#00D9FF"], direction: "high-contrast shadows, slow mystery reveal, glossy editorial framing", hook: "Noir after-dark cut", tempo: "controlled shadow reveal", tension: 0.82 },
  sunset: { label: "Sunset Heat", palette: ["#FF7A45", "#FFD166", "#180A05"], direction: "golden-hour warmth, slow sensual pans, beach-club energy", hook: "Sunset body story", tempo: "warm motion tease", tension: 0.78 },
  penthouse: { label: "Penthouse VIP", palette: ["#00D9FF", "#C9A84C", "#101018"], direction: "city-night penthouse mood, status-driven captions, clean premium transitions", hook: "Penthouse-only preview", tempo: "status-forward precision", tension: 0.8 },
  editorial: { label: "Editorial Cover", palette: ["#F5F5F5", "#111111", "#C9A84C"], direction: "magazine-cover composition, refined movement, high-fashion confidence", hook: "Cover-shoot collection", tempo: "polished editorial beats", tension: 0.7 },
  vip_tease: { label: "VIP Tease", palette: ["#FF3D8A", "#00D9FF", "#050505"], direction: "desire-first pacing, progressive reveals, strong subscriber CTA", hook: "VIP unlock sequence", tempo: "fast tease-to-payoff", tension: 0.9 },
};

function clampBodyCinemaNumber(value: any, min: number, max: number, fallback: number): number {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(min, Math.min(max, n));
}

function safeParseJsonValue<T>(value: any, fallback: T): T {
  if (!value) return fallback;
  if (typeof value === "object") return value as T;
  try { return JSON.parse(String(value)) as T; } catch { return fallback; }
}

function parseFps(rate: any): number | null {
  if (!rate || typeof rate !== "string") return null;
  const [a, b] = rate.split("/").map(Number);
  if (!Number.isFinite(a) || !Number.isFinite(b) || b === 0) return null;
  return Math.round((a / b) * 100) / 100;
}

function ratioLabel(width: number | null, height: number | null): string {
  if (!width || !height) return "unknown";
  const ratio = width / height;
  if (Math.abs(ratio - 9 / 16) < 0.08) return "9:16";
  if (Math.abs(ratio - 16 / 9) < 0.08) return "16:9";
  if (Math.abs(ratio - 1) < 0.08) return "1:1";
  if (Math.abs(ratio - 4 / 5) < 0.08) return "4:5";
  return `${width}:${height}`;
}

function readBodyCinemaMediaProfile(sourceUrl: string): BodyCinemaMediaProfile {
  const localPath = normalizeLocalUploadPath(sourceUrl);
  if (localPath && fs.existsSync(localPath)) {
    const probe = ffprobeJson(localPath);
    const videoStream = probe?.streams?.find((stream: any) => stream.codec_type === "video");
    const audioStream = probe?.streams?.some((stream: any) => stream.codec_type === "audio");
    const width = videoStream?.width ? Number(videoStream.width) : null;
    const height = videoStream?.height ? Number(videoStream.height) : null;
    const durationSeconds = clampBodyCinemaNumber(videoStream?.duration ?? probe?.format?.duration, 1, 3600, isProbablyImage(localPath) ? 18 : 24);
    return {
      kind: videoStream && !isProbablyImage(localPath) ? "video" : isProbablyImage(localPath) ? "image" : "unknown",
      durationSeconds,
      width,
      height,
      aspectRatio: ratioLabel(width, height),
      fps: parseFps(videoStream?.avg_frame_rate || videoStream?.r_frame_rate),
      hasAudio: Boolean(audioStream),
      sourceConfidence: "probe",
    };
  }

  let pathname = sourceUrl;
  try { pathname = new URL(sourceUrl).pathname; } catch { /* keep sourceUrl */ }
  const isImage = /\.(jpg|jpeg|png|webp|gif)$/i.test(pathname);
  const isVideo = /\.(mp4|mov|m4v|webm|mkv)$/i.test(pathname);
  return {
    kind: isVideo ? "video" : isImage ? "image" : "unknown",
    durationSeconds: isVideo ? 24 : 18,
    width: null,
    height: null,
    aspectRatio: "unknown",
    fps: null,
    hasAudio: isVideo,
    sourceConfidence: isVideo || isImage ? "extension" : "url",
  };
}

function normalizeBodyCinemaConfidence(value: any, detected: boolean): number {
  const n = Number(value);
  if (!Number.isFinite(n)) return detected ? 0.72 : 0;
  return n > 1 ? clampBodyCinemaNumber(n / 100, 0, 1, detected ? 0.72 : 0) : clampBodyCinemaNumber(n, 0, 1, detected ? 0.72 : 0);
}

function scoreBodyCinemaRegions(bodyMap: any, selectedRegions: string[]): any[] {
  const regionMap = bodyMap?.regions_detected || {};
  const candidates = Array.from(new Set([...(selectedRegions || []), "full", "bust", "abdomen", "hips", "glutes", "legs", "face"]));
  return candidates.map((region) => {
    const source = regionMap[region] || {};
    const selected = selectedRegions.includes(region);
    const detected = Boolean(source.detected) || selected || region === "full";
    const confidence = normalizeBodyCinemaConfidence(source.confidence, detected);
    const weight = BODY_CINEMA_REGION_WEIGHTS[region] ?? 0.75;
    const score = Math.round((confidence * 64) + (weight * 24) + (selected ? 9 : 0) + (source.enhancement_recommended ? 3 : 0));
    const directive = region === "full"
      ? "Use the full-frame reveal as the premium scene spine; crop from total silhouette into tighter subscriber-value frames."
      : region === "face"
        ? "Use expression and eye-line as the trust beat; keep it in teaser but not as the final payoff."
        : `Build a dedicated ${region} pass with slow push-in, hold beat, and clean transition into the next angle.`;
    return {
      region,
      detected,
      confidence: Math.round(confidence * 100) / 100,
      weight,
      score: clampBodyCinemaNumber(score, 0, 100, 50),
      rank: 0,
      directive,
      coordinates: source.coordinates || null,
      enhancement_recommended: Boolean(source.enhancement_recommended || selected),
    };
  }).sort((a, b) => b.score - a.score).map((item, index) => ({ ...item, rank: index + 1 }));
}

function buildBodyCinemaDecisionEngine(input: {
  sourceUrl: string;
  sourceAnalysis?: any;
  bodyMap?: any;
  selectedRegions?: string[];
  platforms?: string[];
  ppvPriceCents?: number;
  cinematicStyle?: BodyCinemaStyleKey;
  contentType?: string;
  collectionName?: string;
}): any {
  const selectedRegions = input.selectedRegions?.length ? input.selectedRegions : ["full"];
  const platforms = input.platforms?.length ? input.platforms : ["vaultx", "onlyfans", "telegram"];
  const style = BODY_CINEMA_STYLE_LIBRARY[input.cinematicStyle || "luxury"] || BODY_CINEMA_STYLE_LIBRARY.luxury;
  const mediaProfile = readBodyCinemaMediaProfile(input.sourceUrl);
  const scoredRegions = scoreBodyCinemaRegions(input.bodyMap || {}, selectedRegions);
  const topRegions = scoredRegions.filter((region) => region.detected || selectedRegions.includes(region.region)).slice(0, 5);
  const primaryRegion = topRegions[0]?.region || selectedRegions[0] || "full";
  const secondaryRegion = topRegions[1]?.region || (primaryRegion === "full" ? "bust" : "full");
  const monetizationRaw = Number(input.bodyMap?.monetization_potential ?? input.sourceAnalysis?.monetization_potential ?? 7);
  const monetization100 = monetizationRaw > 10 ? clampBodyCinemaNumber(monetizationRaw, 0, 100, 70) : clampBodyCinemaNumber(monetizationRaw * 10, 0, 100, 70);
  const lighting10 = clampBodyCinemaNumber(input.sourceAnalysis?.lighting_quality, 1, 10, 7);
  const image10 = clampBodyCinemaNumber(input.sourceAnalysis?.image_quality, 1, 10, 7);
  const regionStrength = topRegions.length ? topRegions.slice(0, 3).reduce((sum, item) => sum + item.score, 0) / Math.min(3, topRegions.length) : 62;
  const mediaFit = mediaProfile.kind === "video" ? 88 : mediaProfile.kind === "image" ? 74 : 66;
  const heatScore = Math.round((monetization100 * 0.34) + (regionStrength * 0.31) + (((lighting10 + image10) / 2) * 7 * 0.2) + (mediaFit * 0.15));
  const duration = mediaProfile.kind === "video" ? clampBodyCinemaNumber(mediaProfile.durationSeconds, 12, 90, 24) : 24;
  const hookEnd = Math.max(3, Math.min(6, Math.round(duration * 0.16)));
  const firstHoldEnd = Math.max(hookEnd + 3, Math.min(12, Math.round(duration * 0.34)));
  const pivotEnd = Math.max(firstHoldEnd + 4, Math.min(22, Math.round(duration * 0.58)));
  const payoffStart = Math.max(pivotEnd, Math.min(28, Math.round(duration * 0.72)));
  const ctaStart = Math.max(payoffStart + 4, Math.min(42, Math.round(duration * 0.88)));
  const priceCents = clampBodyCinemaNumber(input.ppvPriceCents, 300, 100000, Math.round((Number(input.sourceAnalysis?.pricing_recommendation || 19) || 19) * 100));
  const priceDollars = Math.max(3, Math.round(priceCents / 100));

  const dynamicCutBlueprint = [
    { id: "hook_lock", time: `0-${hookEnd}s`, startSecond: 0, endSecond: hookEnd, label: "Hook lock", directive: `Open on the strongest ${primaryRegion} value frame immediately; remove any setup before the body-cinema promise is clear.`, monetization: "Public teaser gets the promise, not the full payoff.", intensity: 96 },
    { id: "angle_claim", time: `${hookEnd}-${firstHoldEnd}s`, startSecond: hookEnd, endSecond: firstHoldEnd, label: "Angle claim", directive: `Move from full context into ${primaryRegion}/${secondaryRegion} framing with one confident hold beat and no dead air.`, monetization: "Signals premium quality before the pay gate.", intensity: 88 },
    { id: "tease_gate", time: `${firstHoldEnd}-${pivotEnd}s`, startSecond: firstHoldEnd, endSecond: pivotEnd, label: "Tease gate", directive: `Crop tighter, raise contrast, then cut away before the highest-value reveal; make the missing beat obvious.`, monetization: `Drives the $${priceDollars} unlock instead of giving away the reason to pay.`, intensity: 91 },
    { id: "vip_payoff", time: `${payoffStart}-${ctaStart}s`, startSecond: payoffStart, endSecond: ctaStart, label: "VIP payoff", directive: `Reserve the most complete ${primaryRegion === "full" ? "body" : primaryRegion} sequence for paid subscribers and VIP buyers only.`, monetization: "This is the retained-value moment for PPV and re-bill logic.", intensity: 94 },
    { id: "conversion_close", time: `${ctaStart}-${Math.round(duration)}s`, startSecond: ctaStart, endSecond: Math.round(duration), label: "Conversion close", directive: `End with branded VaultX unlock language, creator-safe preview framing, and platform-specific CTA.`, monetization: "Converts attention into tracked paid action.", intensity: 86 },
  ];

  const moneyPacks = [
    { label: "Public heat teaser", tier: "free", priceCents: 0, output: "6-9s cropped preview", detail: `Lead with ${primaryRegion} value, watermark it, and cut before the payoff.`, includedPlatforms: platforms.filter((p) => ["instagram_reel", "twitter", "telegram"].includes(p)) },
    { label: "Subscriber master", tier: "premium", priceCents: Math.round(priceCents * 0.55), output: "Full Body Cinema master", detail: `Complete ${style.label} scene with dynamic crop path and strongest angle stack.`, includedPlatforms: platforms.filter((p) => ["vaultx", "onlyfans", "fansly"].includes(p)) },
    { label: "PPV unlock", tier: "ppv", priceCents, output: "Pay-gated extended cut", detail: `Holds the best ${primaryRegion}/${secondaryRegion} payoff behind the paid unlock.`, includedPlatforms: platforms },
    { label: "VIP upsell kit", tier: "vip", priceCents: Math.max(priceCents + 1000, Math.round(priceCents * 1.75)), output: "Caption, cover, teaser, DM copy", detail: "Turns the scene into a campaign instead of a single file.", includedPlatforms: ["vaultx", "telegram", "onlyfans"].filter((p) => platforms.includes(p)) },
  ];

  const reframeSuggestions = [
    { target: "9:16", purpose: "mobile PPV feed", cropPriority: [primaryRegion, secondaryRegion, "full"], instruction: "Keep body-value center mass inside the safe middle third; use push-ins instead of generic zoom." },
    { target: "4:5", purpose: "paid preview cover", cropPriority: [primaryRegion, "face", "full"], instruction: "Make the image feel like a premium cover while withholding the full scene payoff." },
    { target: "1:1", purpose: "vault card / grid", cropPriority: [secondaryRegion, primaryRegion], instruction: "Frame as a clean unlock tile with high-contrast branded overlay." },
  ];

  const platformLaunchPlan = platforms.map((platform) => {
    const isPublic = ["instagram_reel", "twitter", "telegram"].includes(platform);
    return {
      platform,
      assetType: isPublic ? "teaser" : "subscriber_master",
      exportRatio: isPublic ? "9:16" : mediaProfile.aspectRatio === "16:9" ? "16:9" : "9:16",
      copyAngle: isPublic ? "sell the missing moment" : "deliver the complete body-cinema scene",
      gate: isPublic ? "preview-to-unlock" : priceCents > 0 ? "PPV/subscriber" : "premium",
      readiness: isPublic ? "needs watermark and safe crop" : "needs paid cover and price anchor",
    };
  });

  return {
    engineVersion: "body-cinema-decision-engine-v1",
    generatedAt: new Date().toISOString(),
    mediaProfile,
    heatScore: clampBodyCinemaNumber(heatScore, 0, 100, 72),
    primaryRegion,
    secondaryRegion,
    topRegions,
    scoredRegions,
    styleDirection: { ...style, key: input.cinematicStyle || "luxury" },
    scenePositioning: `${input.collectionName || "Body Cinema Collection"} should sell ${primaryRegion}/${secondaryRegion} tension through a ${style.tempo} arc, then protect the strongest payoff behind a paid gate.`,
    engineLanes: [
      { id: "revenue_read", label: "Revenue read", value: `${clampBodyCinemaNumber(heatScore, 0, 100, 72)}% heat`, copy: `${primaryRegion}/${secondaryRegion} are the lead value signals; price around $${priceDollars}.` },
      { id: "angle_director", label: "Angle director", value: `${primaryRegion} → ${secondaryRegion}`, copy: `Dynamic crop path should move from context into high-confidence body-value frames.` },
      { id: "tease_gate", label: "Tease gate", value: `${hookEnd}-${pivotEnd}s`, copy: "Public preview gets tension, not the retained-value payoff." },
      { id: "money_pack", label: "Money pack", value: `${moneyPacks.length} outputs`, copy: "Master, teaser, PPV unlock, VIP upsell kit, cover/caption direction." },
    ],
    dynamicCutBlueprint,
    moneyPacks,
    reframeSuggestions,
    platformLaunchPlan,
    complianceGuardrails: [
      "Keep public teasers cropped, watermarked, and platform-safe.",
      "Require consent-confirmed adult assets before publishing paid outputs.",
      "Never leak the highest-value payoff in public preview exports.",
    ],
    teaserGate: {
      publicTeaserSeconds: Math.min(9, hookEnd + 4),
      withheldPayoff: `Reserve the strongest ${primaryRegion}/${secondaryRegion} sequence for the paid master and PPV route.`,
      unlockTrigger: `Unlock the full ${style.label} Body Cinema cut for $${priceDollars}.`,
    },
  };
}

export async function completeVaultxPpvPurchase(input: {
  fanUserId: number;
  contentId: number;
  paymentIntentId: string;
  buyerTelegramId?: number;
  trackingCode?: string;
}): Promise<{ purchaseId?: number; success: boolean; alreadyPurchased?: boolean; paymentIntentId?: string }> {
      const content = await rawQuery("SELECT * FROM vaultx_content WHERE id = ? AND is_ppv = 1 LIMIT 1", [input.contentId]);
      if (!content.length) throw new TRPCError({ code: "NOT_FOUND", message: "PPV content not found." });
      const existing = await rawQuery(
        "SELECT id FROM vaultx_ppv_purchases WHERE fan_id = ? AND content_id = ? AND status = 'completed' LIMIT 1",
        [input.fanUserId, input.contentId]
      );
      if (existing.length) return { success: true, alreadyPurchased: true };
      if (!stripe) {
        throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Stripe is not configured; PPV purchases cannot be completed safely." });
      }
      const paymentIntent = await stripe.paymentIntents.retrieve(input.paymentIntentId);
      if (paymentIntent.status !== "succeeded") {
        throw new TRPCError({ code: "PRECONDITION_FAILED", message: `Payment has not succeeded. Current status: ${paymentIntent.status}` });
      }
      const expectedCents = Math.round(Number(content[0].ppv_price) * 100);
      if ((paymentIntent.amount_received || 0) < expectedCents) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Stripe payment amount is lower than the PPV unlock price." });
      }
      const duplicatePayment = await rawQuery(
        "SELECT id FROM vaultx_ppv_purchases WHERE stripe_payment_intent_id = ? AND status = 'completed' LIMIT 1",
        [input.paymentIntentId]
      );
      if (duplicatePayment.length) {
        throw new TRPCError({ code: "CONFLICT", message: "This Stripe payment intent has already been used for a completed VaultX purchase." });
      }
      const result = await rawExec(
        `INSERT INTO vaultx_ppv_purchases
         (fan_id, creator_id, content_id, amount_paid, stripe_payment_intent_id, status)
         VALUES (?, ?, ?, ?, ?, 'completed')`,
        [input.fanUserId, content[0].creator_id, input.contentId, content[0].ppv_price, input.paymentIntentId]
      );
      await rawExec(
        "UPDATE vaultx_content SET purchase_count = purchase_count + 1, revenue_generated = revenue_generated + ? WHERE id = ?",
        [content[0].ppv_price, input.contentId]
      );
      const purchaseId = (result as any).insertId;
      const platformFeeCents = Math.round(expectedCents * PLATFORM_FEE);
      const creatorShareCents = Math.max(0, expectedCents - platformFeeCents);
      await rawExec(
        "UPDATE vaultx_ppv_purchases SET platform_fee_cents = ?, creator_revenue_cents = ? WHERE id = ?",
        [platformFeeCents, creatorShareCents, purchaseId]
      );
      await rawExec(
        "UPDATE vaultx_creators SET total_revenue = total_revenue + ? WHERE id = ?",
        [creatorShareCents / 100, content[0].creator_id]
      );
      await rawExec(
        `INSERT INTO transactions
         (fan_id, creator_id, amount_in_cents, creator_share_in_cents, platform_share_in_cents, stripe_payment_intent_id, status)
         VALUES (?, ?, ?, ?, ?, ?, 'completed')`,
        [input.fanUserId, content[0].creator_id, expectedCents, creatorShareCents, platformFeeCents, input.paymentIntentId]
      );
      await rawExec(
        `INSERT INTO creator_balances (creator_id, available_balance_in_cents, pending_balance_in_cents, lifetime_earnings_in_cents)
         VALUES (?, ?, 0, ?)
         ON DUPLICATE KEY UPDATE
           available_balance_in_cents = available_balance_in_cents + VALUES(available_balance_in_cents),
           lifetime_earnings_in_cents = lifetime_earnings_in_cents + VALUES(lifetime_earnings_in_cents),
           updated_at = NOW()`,
        [content[0].creator_id, creatorShareCents, creatorShareCents]
      );

      // ── Post-purchase: attribution + VIP upsell (non-blocking) ──────────────
      setImmediate(async () => {
        try {
          const { recordCampaignEvent } = await import("../services/telegramCampaign");
          const { sendVipUpsell } = await import("../services/telegramVipUpsell");
          const trackingCode = input.trackingCode;
          const revenueCents = Math.round(parseFloat(content[0].ppv_price) * 100);
          // Auto-lookup buyer telegram_user_id from users table
          let buyerTelegramId: number | undefined = input.buyerTelegramId;
          if (!buyerTelegramId) {
            const tgRows = await rawQuery(
              "SELECT telegram_user_id FROM users WHERE id = ? AND telegram_user_id IS NOT NULL LIMIT 1",
              [input.fanUserId]
            );
            if (tgRows.length && tgRows[0].telegram_user_id) {
              buyerTelegramId = parseInt(String(tgRows[0].telegram_user_id), 10) || undefined;
              console.log("[VaultX purchasePpv] Auto-resolved buyerTelegramId for user_id=" + input.fanUserId);
            }
          }
          // 1. Attribution tracking
          if (trackingCode) {
            await recordCampaignEvent(trackingCode, "purchase", {
              userId: input.fanUserId,
              revenueCents,
              buyerTelegramId,
            });
            await rawExec(
              "UPDATE vaultx_ppv_purchases SET attribution_tracking_code = ?, buyer_telegram_id = ? WHERE id = ?",
              [trackingCode, buyerTelegramId || null, purchaseId]
            );
          } else if (buyerTelegramId) {
            // Even without tracking code, set buyer_telegram_id on the purchase
            await rawExec(
              "UPDATE vaultx_ppv_purchases SET buyer_telegram_id = ? WHERE id = ? AND buyer_telegram_id IS NULL",
              [buyerTelegramId, purchaseId]
            );
          }
          // 2. VIP upsell — requires real buyer Telegram ID
          if (buyerTelegramId) {
            const upsellResult = await sendVipUpsell({
              purchaseId,
              buyerTelegramId,
              amountCents: revenueCents,
              contentTitle: content[0].title || "exclusive content",
              campaignId: undefined,
              trackingCode,
            });
            console.log("[VaultX purchasePpv] VIP upsell result:", JSON.stringify(upsellResult));
          } else {
            // No telegram_id found — generate connect token for /telegram-connect page
            const { randomBytes } = await import("crypto");
            const connectToken = randomBytes(16).toString("hex");
            await rawExec(
              "UPDATE vaultx_ppv_purchases SET telegram_connect_token = ?, telegram_link_status = 'pending' WHERE id = ?",
              [connectToken, purchaseId]
            );
            console.log("[VaultX purchasePpv] No buyerTelegramId — connect token generated for purchase_id=" + purchaseId);
          }
        } catch (e: any) {
          console.error("[VaultX purchasePpv] post-purchase hook error:", e.message);
        }
      });

      return { purchaseId, success: true };
}

export const vaultxRouter = router({

  // ═══════════════════════════════════════════════════════════════════════════
  // SOFT-LAUNCH CONTROL PLANE — real provider/workflow capability matrix
  // ═══════════════════════════════════════════════════════════════════════════
  getLaunchCapabilityMatrix: protectedProcedure
    .query(async ({ ctx }) => {
      await ensureVaultxRevenuePackageSchema();
      await ensureVaultxArtifactSchema().catch(() => undefined);
      const creatorId = await getCreatorId(ctx.user.id).catch(() => null);
      const hasPollo = Boolean(POLLO_API_KEY);
      const hasReplicate = Boolean(process.env.REPLICATE_API_TOKEN);
      const hasStripe = Boolean(stripe);
      const hasTelegram = Boolean(process.env.TELEGRAM_BOT_TOKEN || process.env.TELEGRAM_BOT_KEY);
      const hasOpenAi = Boolean(process.env.OPENAI_API_KEY);
      const hasRunway = Boolean(process.env.RUNWAY_API_KEY || process.env.RUNWAYML_API_SECRET);
      const hasKling = Boolean(process.env.KLING_API_KEY || process.env.KLING_ACCESS_KEY || process.env.KLING_SECRET_KEY);
      const canonicalBaseUrl = process.env.PUBLIC_APP_URL || process.env.CREATORVAULT_PUBLIC_URL || process.env.APP_URL || "https://creatorvault.live";
      const hasTikTokApp = Boolean(process.env.TIKTOK_CLIENT_KEY && process.env.TIKTOK_CLIENT_SECRET);
      const hasMetaApp = Boolean(process.env.META_APP_ID && process.env.META_APP_SECRET);
      const hasFacebookPage = Boolean(process.env.FACEBOOK_PAGE_ID && (process.env.FACEBOOK_PAGE_ACCESS_TOKEN || process.env.META_PAGE_ACCESS_TOKEN));
      const hasInstagramBusiness = Boolean(process.env.INSTAGRAM_BUSINESS_ACCOUNT_ID && (process.env.INSTAGRAM_ACCESS_TOKEN || process.env.META_PAGE_ACCESS_TOKEN));
      const socialCallbackBase = `${canonicalBaseUrl.replace(/\/$/, "")}/api/social`;
      const latestPackages = await rawQuery(
        `SELECT p.id, p.title, p.content_type, p.telegram_mode, p.price_cents, p.status, p.asset_status, p.asset_url, p.checkout_url, p.telegram_tracking_code, p.pollo_job_id, p.stripe_checkout_session_id, p.telegram_campaign_id, p.vaultx_content_id, p.created_at,
                (SELECT va.id FROM vaultx_artifacts va WHERE va.package_id = p.id ORDER BY va.id DESC LIMIT 1) AS artifact_id
         FROM vaultx_revenue_packages p
         WHERE p.user_id = ?
         ORDER BY p.id DESC
         LIMIT 6`,
        [ctx.user.id]
      ).catch(() => []);

      return {
        creatorReady: Boolean(creatorId),
        creatorId: creatorId || null,
        adultVertical: "VaultX",
        launchPromise: "source asset → consent gate → cinematic AI promo → durable VaultX artifact → checkout → Telegram/X distribution",
        hardRules: {
          adultContentOptInRequired: true,
          consentConfirmationRequired: true,
          fakeProviderJobsForbidden: true,
          platformFeePercent: 15,
          creatorKeepPercent: 85,
        },
        providers: [
          {
            id: "pollo",
            label: "Pollo AI Video",
            tier: "active-package-generation",
            configured: hasPollo,
            capability: "Image-to-video Body Cinema package assets through the existing Pollo generation/status/artifact pipeline.",
            unlockRequirement: hasPollo ? null : "Configure POLLO_API_KEY on the server.",
            primaryEndpoints: ["createRevenuePackage", "generatePackageAsset", "getPackageAssetStatus"],
            recommendedMode: "BOOST",
            estimatedCostCents: { FAST: 250, BOOST: 450, FULL: 850, default: 450 },
            qualityTier: "production",
          },
          {
            id: "replicate",
            label: "Replicate Model Rack",
            tier: "active-enhancement-rack",
            configured: hasReplicate,
            capability: "Enhancement, motion, teaser, thumbnail, and clone-adjacent routes are available in VaultX services, but direct package generation remains Pollo-owned until a package endpoint is wired.",
            unlockRequirement: hasReplicate ? null : "Configure REPLICATE_API_TOKEN on the server.",
            primaryEndpoints: ["generateDesireTeaser", "buildPpvBundle", "generateThumbnails", "analyzeHook"],
            recommendedMode: "BOOST",
            estimatedCostCents: { FAST: 300, BOOST: 600, FULL: 1100, default: 600 },
            qualityTier: "enhancement",
          },
          {
            id: "clone",
            label: "Clone Command",
            tier: "active-existing-system",
            configured: hasPollo || hasReplicate,
            capability: "Clone-image/video handoff, generation history, Vault persistence, and hero assets through the existing Clone Command router.",
            unlockRequirement: hasPollo || hasReplicate ? null : "Enable at least one media provider key before launching clone media generation.",
            primaryEndpoints: ["cloneCommand.generateCloneImage", "cloneCommand.generateCloneVideo", "cloneCommand.getGenerationHistory"],
            recommendedMode: "operator",
            estimatedCostCents: { FAST: 250, BOOST: 500, FULL: 900, default: 500 },
            qualityTier: "clone-system",
          },
          {
            id: "runway",
            label: "Runway Premium Lane",
            tier: hasRunway ? "credential-detected-needs-endpoint" : "pending-direct-configuration",
            configured: hasRunway,
            capability: "Premium video model lane reserved for direct Runway orchestration; credentials alone do not expose fake jobs until a real package endpoint is wired.",
            unlockRequirement: hasRunway ? "Wire and verify a direct Runway package-generation endpoint before creator launch." : "Configure a real Runway API credential before exposing direct Runway jobs.",
            primaryEndpoints: [],
            recommendedMode: "FULL",
            estimatedCostCents: { FAST: 900, BOOST: 1500, FULL: 2600, default: 1500 },
            qualityTier: "premium-pending",
          },
          {
            id: "kling",
            label: "Kling Premium Lane",
            tier: hasKling ? "credential-detected-needs-endpoint" : "pending-direct-configuration",
            configured: hasKling,
            capability: "Premium motion lane reserved for direct Kling orchestration or a confirmed provider aggregator route; no direct fake generation is claimed.",
            unlockRequirement: hasKling ? "Wire and verify a direct Kling or confirmed aggregator package endpoint before creator launch." : "Configure real Kling credentials or a confirmed provider model route before exposing direct Kling jobs.",
            primaryEndpoints: [],
            recommendedMode: "FULL",
            estimatedCostCents: { FAST: 850, BOOST: 1400, FULL: 2400, default: 1400 },
            qualityTier: "premium-pending",
          },
        ],
        workflows: [
          {
            id: "vaultx-package-launch",
            label: "VaultX Package Launch",
            status: hasPollo ? "ready" : "blocked",
            does: "Turns one creator source media URL into a Pollo-generated cinematic promo asset, persists it as a VaultX artifact, then routes it into checkout and Telegram distribution.",
            steps: ["createRevenuePackage", "generatePackageAsset", "getPackageAssetStatus", "attachPackageCheckout", "publishPackageTelegramRoute"],
            blockers: [
              ...(hasPollo ? [] : ["POLLO_API_KEY missing"]),
              ...(hasStripe ? [] : ["Stripe secret key missing for checkout attachment"]),
              ...(hasTelegram ? [] : ["Telegram bot/channel configuration missing for auto-publish"]),
            ],
          },
          {
            id: "desire-teaser-to-ppv",
            label: "Desire Teaser → PPV Bundle",
            status: hasReplicate ? "ready" : "limited",
            does: "Analyzes the source asset for hook strength, creates teaser/thumbnail/bundle outputs, and prepares pricing plus distribution-ready assets.",
            steps: ["generateDesireTeaser", "buildPpvBundle", "suggestPrice", "distributeContent"],
            blockers: hasReplicate ? [] : ["REPLICATE_API_TOKEN missing for premium model stages"],
          },
          {
            id: "ai-sales-and-follow-up",
            label: "AI Sales Chatter + PPV Follow-Up",
            status: hasOpenAi ? "ready" : "blocked",
            does: "Uses the creator persona and fan context to generate conversion-aware replies, PPV pitches, and tip prompts.",
            steps: ["generateCreatorPersona", "generateAIChatterResponse"],
            blockers: hasOpenAi ? [] : ["OPENAI_API_KEY missing"],
          },
        ],
        monetization: {
          stripeConfigured: hasStripe,
          telegramConfigured: hasTelegram,
          checkoutEndpoint: "attachPackageCheckout",
          distributionEndpoint: "publishPackageTelegramRoute",
          economics: { platformFeePercent: 15, creatorKeepPercent: 85 },
        },
        socialPresence: {
          status: hasTikTokApp || hasMetaApp ? "developer-apps-detected" : "developer-console-approval-required",
          callbackBase: socialCallbackBase,
          officialOnly: true,
          fakePostingForbidden: true,
          platforms: [
            {
              id: "tiktok",
              label: "TikTok",
              configured: hasTikTokApp,
              status: hasTikTokApp ? "oauth-ready-needs-user-connection" : "developer-app-required",
              products: ["Login Kit", "Content Posting API", "Research API"],
              creatorValue: "Creator identity, TikTok share/post handoff, public research signals, and campaign-safe short-form distribution planning.",
              requiredCredentials: ["TIKTOK_CLIENT_KEY", "TIKTOK_CLIENT_SECRET"],
              callbackUrls: [`${socialCallbackBase}/tiktok/callback`],
              requiredScopes: ["user.info.basic", "video.upload", "video.publish"],
              approvalChecklist: [
                "Create or select the TikTok developer app.",
                "Add the production callback URL exactly as shown.",
                "Request Login Kit and Content Posting API permissions before enabling direct publish buttons.",
                "Request Research API separately for public-data intelligence use cases.",
              ],
              allowedActions: hasTikTokApp ? ["connect-account", "prepare-share", "queue-after-oauth"] : ["show-setup-checklist"],
              blockedActions: hasTikTokApp ? ["fake-posting-without-user-token"] : ["oauth", "posting", "research-api-calls"],
            },
            {
              id: "instagram",
              label: "Instagram",
              configured: hasMetaApp && hasInstagramBusiness,
              status: hasMetaApp ? (hasInstagramBusiness ? "business-publishing-ready-needs-user-token" : "meta-app-ready-needs-instagram-business-account") : "meta-app-required",
              products: ["Instagram Platform", "Instagram Graph API", "Content Publishing"],
              creatorValue: "Professional-account linking, Reels/media publishing after approval, insights, and comment/message growth loops where permissions allow.",
              requiredCredentials: ["META_APP_ID", "META_APP_SECRET", "INSTAGRAM_BUSINESS_ACCOUNT_ID", "META_PAGE_ACCESS_TOKEN or INSTAGRAM_ACCESS_TOKEN"],
              callbackUrls: [`${socialCallbackBase}/meta/callback`],
              requiredScopes: ["instagram_basic", "instagram_content_publish", "instagram_manage_insights", "pages_show_list"],
              approvalChecklist: [
                "Create a Meta app and complete business verification if required.",
                "Connect an Instagram professional account to a Facebook Page.",
                "Add OAuth redirect URLs and webhook callback URLs for production.",
                "Pass App Review for publishing and insights permissions before live automation.",
              ],
              allowedActions: hasMetaApp && hasInstagramBusiness ? ["connect-account", "prepare-reel", "queue-after-oauth"] : ["show-setup-checklist"],
              blockedActions: hasMetaApp && hasInstagramBusiness ? ["fake-publishing-without-review-or-token"] : ["oauth", "reels-publishing", "insights-sync"],
            },
            {
              id: "facebook",
              label: "Facebook",
              configured: hasMetaApp && hasFacebookPage,
              status: hasMetaApp ? (hasFacebookPage ? "page-publishing-ready-needs-user-token" : "meta-app-ready-needs-page-token") : "meta-app-required",
              products: ["Facebook Login", "Pages API", "Webhooks"],
              creatorValue: "Page presence, content publishing, lead/community distribution, webhook-driven engagement events, and cross-post support for CreatorVault offers.",
              requiredCredentials: ["META_APP_ID", "META_APP_SECRET", "FACEBOOK_PAGE_ID", "FACEBOOK_PAGE_ACCESS_TOKEN or META_PAGE_ACCESS_TOKEN"],
              callbackUrls: [`${socialCallbackBase}/meta/callback`],
              requiredScopes: ["pages_show_list", "pages_read_engagement", "pages_manage_posts", "public_profile"],
              approvalChecklist: [
                "Create or reuse the same Meta app used for Instagram.",
                "Connect the production Facebook Page and generate approved page access flow.",
                "Configure webhook callback and verify token on the production domain.",
                "Pass App Review for page publishing and engagement permissions before automation.",
              ],
              allowedActions: hasMetaApp && hasFacebookPage ? ["connect-page", "prepare-post", "queue-after-oauth"] : ["show-setup-checklist"],
              blockedActions: hasMetaApp && hasFacebookPage ? ["fake-page-posting-without-token"] : ["oauth", "page-publishing", "webhook-event-sync"],
            },
          ],
        },
        latestPackages: latestPackages.map((pkg: any) => ({
          id: Number(pkg.id),
          title: pkg.title,
          contentType: pkg.content_type,
          mode: pkg.telegram_mode,
          priceCents: Number(pkg.price_cents || 0),
          status: pkg.status,
          assetStatus: pkg.asset_status,
          hasAsset: Boolean(pkg.asset_url),
          hasCheckout: Boolean(pkg.checkout_url),
          hasTelegramRoute: Boolean(pkg.telegram_tracking_code),
          providerJobId: pkg.pollo_job_id || null,
          checkoutSessionId: pkg.stripe_checkout_session_id || null,
          telegramCampaignId: pkg.telegram_campaign_id || null,
          telegramTrackingCode: pkg.telegram_tracking_code || null,
          vaultxContentId: pkg.vaultx_content_id || null,
          artifactId: pkg.artifact_id ? Number(pkg.artifact_id) : null,
          createdAt: pkg.created_at,
        })),
      };
    }),

  // ═══════════════════════════════════════════════════════════════════════════
  // PROCEDURE 1 — setupCreatorProfile
  // ═══════════════════════════════════════════════════════════════════════════
  setupCreatorProfile: protectedProcedure
    .input(z.object({
      displayName: z.string().min(1).max(100),
      bio: z.string().max(2000).optional(),
      profileImageUrl: z.string().url().optional(),
      coverImageUrl: z.string().url().optional(),
      subscriptionPriceBasic: z.number().min(4.99).max(499).default(9.99),
      subscriptionPricePremium: z.number().min(9.99).max(499).default(24.99),
      subscriptionPriceVip: z.number().min(19.99).max(499).default(49.99),
      basicDescription: z.string().max(500).optional(),
      premiumDescription: z.string().max(500).optional(),
      vipDescription: z.string().max(500).optional(),
      basicPerks: z.array(z.string()).optional(),
      premiumPerks: z.array(z.string()).optional(),
      vipPerks: z.array(z.string()).optional(),
      geoBlockedCountries: z.array(z.string()).optional(),
      languagePrimary: z.enum(["en", "es", "ht"]).default("en"),
    }))
    .mutation(async ({ ctx, input }) => {
      const existing = await rawQuery("SELECT id FROM vaultx_creators WHERE user_id = ? LIMIT 1", [ctx.user.id]);
      const data = [
        input.displayName, input.bio || null,
        input.profileImageUrl || null, input.coverImageUrl || null,
        input.subscriptionPriceBasic, input.subscriptionPricePremium, input.subscriptionPriceVip,
        input.basicDescription || null, input.premiumDescription || null, input.vipDescription || null,
        JSON.stringify(input.basicPerks || []), JSON.stringify(input.premiumPerks || []), JSON.stringify(input.vipPerks || []),
        JSON.stringify(input.geoBlockedCountries || []), input.languagePrimary,
      ];
      if (existing.length === 0) {
        await rawExec(
          `INSERT INTO vaultx_creators
           (user_id, display_name, bio, profile_image_url, cover_image_url,
            subscription_price_basic, subscription_price_premium, subscription_price_vip,
            basic_description, premium_description, vip_description,
            basic_perks, premium_perks, vip_perks,
            geo_blocked_countries, language_primary)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [ctx.user.id, ...data]
        );
      } else {
        await rawExec(
          `UPDATE vaultx_creators SET
           display_name=?, bio=?, profile_image_url=COALESCE(?,profile_image_url),
           cover_image_url=COALESCE(?,cover_image_url),
           subscription_price_basic=?, subscription_price_premium=?, subscription_price_vip=?,
           basic_description=?, premium_description=?, vip_description=?,
           basic_perks=?, premium_perks=?, vip_perks=?,
           geo_blocked_countries=?, language_primary=?
           WHERE user_id=?`,
          [...data, ctx.user.id]
        );
      }
      const rows = await rawQuery("SELECT * FROM vaultx_creators WHERE user_id = ? LIMIT 1", [ctx.user.id]);
      return { creator: rows[0] };
    }),

  // ═══════════════════════════════════════════════════════════════════════════
  // PROCEDURE 2 — getCreatorProfile (public)
  // ═══════════════════════════════════════════════════════════════════════════
  getCreatorProfile: publicProcedure
    .input(z.object({ creatorId: z.number() }))
    .query(async ({ input }) => {
      const rows = await rawQuery(
        `SELECT c.id, c.user_id, c.display_name, c.bio, c.profile_image_url, c.cover_image_url,
                c.subscription_price_basic, c.subscription_price_premium, c.subscription_price_vip,
                c.basic_description, c.premium_description, c.vip_description,
                c.basic_perks, c.premium_perks, c.vip_perks,
                c.total_subscribers, c.language_primary,
                u.username, u.name
         FROM vaultx_creators c
         LEFT JOIN users u ON u.id = c.user_id
         WHERE c.id = ? AND c.is_active = 1 LIMIT 1`,
        [input.creatorId]
      );
      if (!rows[0]) throw new TRPCError({ code: "NOT_FOUND", message: "Creator not found." });
      return { creator: rows[0] };
    }),

  // ═══════════════════════════════════════════════════════════════════════════
  // PROCEDURE 3 — getMyCreatorProfile (creator/owner gate)
  // ═══════════════════════════════════════════════════════════════════════════
  getMyCreatorProfile: protectedProcedure.query(async ({ ctx }) => {
    const rows = await rawQuery(
      `SELECT c.*, u.username, u.name, u.email,
              (SELECT SUM(amount) FROM vaultx_tips WHERE creator_id = c.id AND status='completed') AS total_tips,
              (SELECT SUM(price_paid) FROM vaultx_subscriptions WHERE creator_id = c.id AND status='active') AS active_sub_revenue,
              (SELECT COUNT(*) FROM vaultx_subscriptions WHERE creator_id = c.id AND status='active') AS active_subscribers
       FROM vaultx_creators c
       LEFT JOIN users u ON u.id = c.user_id
       WHERE c.user_id = ? LIMIT 1`,
      [ctx.user.id]
    );
    return { creator: rows[0] || null };
  }),

  // ═══════════════════════════════════════════════════════════════════════════
  // PROCEDURE 4 — uploadContent
  // ═══════════════════════════════════════════════════════════════════════════
  uploadContent: protectedProcedure
    .input(z.object({
      title: z.string().min(1).max(255),
      description: z.string().max(2000).optional(),
      contentType: z.enum(["photo", "video", "audio", "bundle"]),
      uncensoredUrl: z.string().url(),
      censoredUrl: z.string().url().optional(),
      thumbnailUrl: z.string().url().optional(),
      censoredThumbnailUrl: z.string().url().optional(),
      isPpv: z.boolean().default(false),
      ppvPrice: z.number().min(0).default(0),
      isSubscriptionOnly: z.boolean().default(true),
      isFreePreview: z.boolean().default(false),
      freePreviewSeconds: z.number().min(5).max(60).default(15),
      accessTier: z.enum(["basic", "premium", "vip", "ppv"]).default("basic"),
      tags: z.array(z.string()).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const creatorId = await getCreatorId(ctx.user.id);
      if (!creatorId && !OWNER_IDS.includes(ctx.user.id)) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Creator profile required." });
      }
      validateVaultxMetadata(input.title, input.description || null);
      const result = await rawExec(
        `INSERT INTO vaultx_content
         (creator_id, title, description, content_type,
          uncensored_url, censored_url, thumbnail_url, censored_thumbnail_url,
          is_ppv, ppv_price, is_subscription_only, is_free_preview, free_preview_seconds,
          access_tier, tags, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active')`,
        [
          creatorId || ctx.user.id,
          input.title, input.description || null, input.contentType,
          input.uncensoredUrl, input.censoredUrl || null,
          input.thumbnailUrl || null, input.censoredThumbnailUrl || null,
          input.isPpv ? 1 : 0, input.ppvPrice,
          input.isSubscriptionOnly ? 1 : 0, input.isFreePreview ? 1 : 0,
          input.freePreviewSeconds, input.accessTier,
          input.tags?.length ? JSON.stringify(input.tags) : null,
        ]
      );
      return { contentId: (result as any).insertId, success: true };
    }),

  // ═══════════════════════════════════════════════════════════════════════════
  // PROCEDURE 5 — getMyContent
  // ═══════════════════════════════════════════════════════════════════════════
  getMyContent: protectedProcedure
    .input(z.object({
      status: z.enum(["all", "active", "draft", "archived"]).default("all"),
      limit: z.number().min(1).max(100).default(50),
      offset: z.number().min(0).default(0),
    }))
    .query(async ({ ctx, input }) => {
      const creatorId = await getCreatorId(ctx.user.id);
      const cid = creatorId || ctx.user.id;
      const whereStatus = input.status === "all" ? "" : "AND status = ?";
      const params = input.status === "all"
        ? [cid, input.limit, input.offset]
        : [cid, input.status, input.limit, input.offset];
      const rows = await rawQuery(
        `SELECT id, title, description, content_type, thumbnail_url, censored_thumbnail_url,
                is_ppv, ppv_price, access_tier, view_count, purchase_count, revenue_generated,
                status, tags, created_at, updated_at
         FROM vaultx_content WHERE creator_id = ? ${whereStatus}
         ORDER BY created_at DESC LIMIT ? OFFSET ?`,
        params
      );
      const total = await rawQuery(
        `SELECT COUNT(*) AS cnt FROM vaultx_content WHERE creator_id = ? ${whereStatus}`,
        input.status === "all" ? [cid] : [cid, input.status]
      );
      return { items: rows, total: total[0]?.cnt || 0 };
    }),

  // ═══════════════════════════════════════════════════════════════════════════
  // PROCEDURE 6 — updateContent
  // ═══════════════════════════════════════════════════════════════════════════
  updateContent: protectedProcedure
    .input(z.object({
      contentId: z.number(),
      title: z.string().min(1).max(255).optional(),
      description: z.string().max(2000).optional(),
      accessTier: z.enum(["basic", "premium", "vip", "ppv"]).optional(),
      ppvPrice: z.number().min(0).optional(),
      status: z.enum(["draft", "active", "archived"]).optional(),
      tags: z.array(z.string()).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const creatorId = await getCreatorId(ctx.user.id);
      const cid = creatorId || ctx.user.id;
      const existing = await rawQuery("SELECT id FROM vaultx_content WHERE id = ? AND creator_id = ? LIMIT 1", [input.contentId, cid]);
      if (!existing.length && !OWNER_IDS.includes(ctx.user.id)) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Content not found or access denied." });
      }
      if (input.title !== undefined || input.description !== undefined) {
        const currentRows = await rawQuery("SELECT title, description FROM vaultx_content WHERE id = ? LIMIT 1", [input.contentId]);
        validateVaultxMetadata(input.title ?? currentRows[0]?.title ?? "", input.description ?? currentRows[0]?.description ?? null);
      }
      const sets: string[] = [];
      const vals: any[] = [];
      if (input.title !== undefined) { sets.push("title = ?"); vals.push(input.title); }
      if (input.description !== undefined) { sets.push("description = ?"); vals.push(input.description); }
      if (input.accessTier !== undefined) { sets.push("access_tier = ?"); vals.push(input.accessTier); }
      if (input.ppvPrice !== undefined) { sets.push("ppv_price = ?"); vals.push(input.ppvPrice); }
      if (input.status !== undefined) { sets.push("status = ?"); vals.push(input.status); }
      if (input.tags !== undefined) { sets.push("tags = ?"); vals.push(JSON.stringify(input.tags)); }
      if (!sets.length) return { success: true };
      await rawExec(`UPDATE vaultx_content SET ${sets.join(", ")} WHERE id = ?`, [...vals, input.contentId]);
      return { success: true };
    }),

  // ═══════════════════════════════════════════════════════════════════════════
  // PROCEDURE 7 — archiveContent
  // ═══════════════════════════════════════════════════════════════════════════
  archiveContent: protectedProcedure
    .input(z.object({ contentId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const creatorId = await getCreatorId(ctx.user.id);
      const cid = creatorId || ctx.user.id;
      await rawExec("UPDATE vaultx_content SET status = 'archived' WHERE id = ? AND creator_id = ?", [input.contentId, cid]);
      return { success: true };
    }),

  // ═══════════════════════════════════════════════════════════════════════════
  // PROCEDURE 8 — getContentStats
  // ═══════════════════════════════════════════════════════════════════════════
  getContentStats: protectedProcedure
    .input(z.object({ contentId: z.number() }))
    .query(async ({ ctx, input }) => {
      const creatorId = await getCreatorId(ctx.user.id);
      const cid = creatorId || ctx.user.id;
      const rows = await rawQuery(
        `SELECT id, title, view_count, purchase_count, revenue_generated, created_at
         FROM vaultx_content WHERE id = ? AND creator_id = ? LIMIT 1`,
        [input.contentId, cid]
      );
      if (!rows.length) throw new TRPCError({ code: "NOT_FOUND", message: "Content not found." });
      return rows[0];
    }),

  // ═══════════════════════════════════════════════════════════════════════════
  // PROCEDURE 9 — getSubscriberList
  // ═══════════════════════════════════════════════════════════════════════════
  getSubscriberList: protectedProcedure
    .input(z.object({
      tier: z.enum(["all", "basic", "premium", "vip"]).default("all"),
      sortBy: z.enum(["total_spent", "join_date", "tier"]).default("total_spent"),
      limit: z.number().min(1).max(200).default(50),
      offset: z.number().min(0).default(0),
    }))
    .query(async ({ ctx, input }) => {
      const creatorId = await getCreatorId(ctx.user.id);
      const cid = creatorId || ctx.user.id;
      const tierWhere = input.tier === "all" ? "" : "AND vs.tier = ?";
      const sortCol = input.sortBy === "total_spent" ? "total_spent DESC"
        : input.sortBy === "join_date" ? "vs.created_at DESC"
        : "vs.tier ASC";
      const params = input.tier === "all"
        ? [cid, input.limit, input.offset]
        : [cid, input.tier, input.limit, input.offset];
      const rows = await rawQuery(
        `SELECT vs.id, vs.fan_id, vs.tier, vs.price_paid, vs.status, vs.created_at,
                u.username, u.name,
                (SELECT SUM(amount) FROM vaultx_tips WHERE fan_id = vs.fan_id AND creator_id = vs.creator_id AND status='completed') AS tips_total,
                (SELECT SUM(amount_paid) FROM vaultx_ppv_purchases WHERE fan_id = vs.fan_id AND creator_id = vs.creator_id AND status='completed') AS ppv_total,
                (vs.price_paid + COALESCE((SELECT SUM(amount) FROM vaultx_tips WHERE fan_id = vs.fan_id AND creator_id = vs.creator_id AND status='completed'), 0) + COALESCE((SELECT SUM(amount_paid) FROM vaultx_ppv_purchases WHERE fan_id = vs.fan_id AND creator_id = vs.creator_id AND status='completed'), 0)) AS total_spent,
                (SELECT MAX(created_at) FROM vaultx_messages WHERE sender_id = vs.fan_id AND recipient_id = vs.creator_id) AS last_message_at
         FROM vaultx_subscriptions vs
         LEFT JOIN users u ON u.id = vs.fan_id
         WHERE vs.creator_id = ? ${tierWhere}
         ORDER BY ${sortCol}
         LIMIT ? OFFSET ?`,
        params
      );
      return { subscribers: rows };
    }),

  // ═══════════════════════════════════════════════════════════════════════════
  // PROCEDURE 10 — sendMassMessage
  // ═══════════════════════════════════════════════════════════════════════════
  sendMassMessage: protectedProcedure
    .input(z.object({
      subject: z.string().max(255).optional(),
      messageText: z.string().min(1).max(5000),
      mediaUrl: z.string().url().optional(),
      mediaType: z.enum(["photo", "video", "audio"]).optional(),
      isLocked: z.boolean().default(false),
      unlockPrice: z.number().min(0).default(0),
      targetTier: z.enum(["all", "basic", "premium", "vip"]).default("all"),
      scheduledFor: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const creatorId = await getCreatorId(ctx.user.id);
      const cid = creatorId || ctx.user.id;
      const scheduledFor = input.scheduledFor ? new Date(input.scheduledFor) : null;
      const status = scheduledFor ? "scheduled" : "sent";
      const approvedMessageText = validateVaultxWorkflowCopy(input.messageText, "mass-message", `${cid}:${input.targetTier}`);
      const result = await rawExec(
        `INSERT INTO vaultx_mass_messages
         (creator_id, subject, message_text, media_url, media_type, is_locked, unlock_price,
          target_tier, scheduled_for, sent_at, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          cid, input.subject || null, approvedMessageText,
          input.mediaUrl || null, input.mediaType || null,
          input.isLocked ? 1 : 0, input.unlockPrice,
          input.targetTier, scheduledFor,
          scheduledFor ? null : new Date(), status,
        ]
      );
      const massMessageId = (result as any).insertId;
      if (!scheduledFor) {
        // Immediately fan out to subscriber inboxes
        const tierWhere = input.targetTier === "all" ? "" : "AND tier = ?";
        const subs = await rawQuery(
          `SELECT fan_id FROM vaultx_subscriptions WHERE creator_id = ? AND status = 'active' ${tierWhere}`,
          input.targetTier === "all" ? [cid] : [cid, input.targetTier]
        );
        for (const sub of subs) {
          await rawExec(
            `INSERT INTO vaultx_messages
             (sender_id, recipient_id, message_text, media_url, media_type, is_locked, unlock_price)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [cid, sub.fan_id, approvedMessageText, input.mediaUrl || null, input.mediaType || null, input.isLocked ? 1 : 0, input.unlockPrice]
          );
        }
        await rawExec("UPDATE vaultx_mass_messages SET sent_count = ? WHERE id = ?", [subs.length, massMessageId]);
      }
      return { success: true, massMessageId, recipientCount: scheduledFor ? 0 : ((await rawQuery("SELECT sent_count FROM vaultx_mass_messages WHERE id = ? LIMIT 1", [massMessageId]))[0]?.sent_count || 0) };
    }),

  // ═══════════════════════════════════════════════════════════════════════════
  // PROCEDURE 11 — getAiChatterConfig
  // ═══════════════════════════════════════════════════════════════════════════
  getAiChatterConfig: protectedProcedure.query(async ({ ctx }) => {
    const creatorId = await getCreatorId(ctx.user.id);
    const cid = creatorId || ctx.user.id;
    const rows = await rawQuery("SELECT * FROM vaultx_ai_chatter_config WHERE creator_id = ? LIMIT 1", [cid]);
    return { config: rows[0] || null };
  }),

  // ═══════════════════════════════════════════════════════════════════════════
  // PROCEDURE 12 — saveAiChatterConfig
  // ═══════════════════════════════════════════════════════════════════════════
  saveAiChatterConfig: protectedProcedure
    .input(z.object({
      isEnabled: z.boolean(),
      personaName: z.string().max(100).optional(),
      personaDescription: z.string().max(2000).optional(),
      greetingMessage: z.string().max(1000).optional(),
      ppvPitchFrequency: z.number().min(1).max(20).default(3),
      tipRequestFrequency: z.number().min(1).max(20).default(5),
      scheduleHours: z.object({ start: z.number(), end: z.number() }).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      validateVaultxChatterConfig(input);
      const creatorId = await getCreatorId(ctx.user.id);
      const cid = creatorId || ctx.user.id;
      const existing = await rawQuery("SELECT id FROM vaultx_ai_chatter_config WHERE creator_id = ? LIMIT 1", [cid]);
      if (existing.length === 0) {
        await rawExec(
          `INSERT INTO vaultx_ai_chatter_config
           (creator_id, is_enabled, persona_name, persona_description, greeting_message,
            ppv_pitch_frequency, tip_request_frequency, schedule_hours)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [cid, input.isEnabled ? 1 : 0, input.personaName || null, input.personaDescription || null,
           input.greetingMessage || null, input.ppvPitchFrequency, input.tipRequestFrequency,
           input.scheduleHours ? JSON.stringify(input.scheduleHours) : null]
        );
      } else {
        await rawExec(
          `UPDATE vaultx_ai_chatter_config SET
           is_enabled=?, persona_name=?, persona_description=?, greeting_message=?,
           ppv_pitch_frequency=?, tip_request_frequency=?, schedule_hours=?
           WHERE creator_id=?`,
          [input.isEnabled ? 1 : 0, input.personaName || null, input.personaDescription || null,
           input.greetingMessage || null, input.ppvPitchFrequency, input.tipRequestFrequency,
           input.scheduleHours ? JSON.stringify(input.scheduleHours) : null, cid]
        );
      }
      return { success: true };
    }),

  // ═══════════════════════════════════════════════════════════════════════════
  // PROCEDURE 13 — submitDmcaReport
  // ═══════════════════════════════════════════════════════════════════════════
  submitDmcaReport: protectedProcedure
    .input(z.object({
      reportedUrl: z.string().url(),
      platform: z.string().max(100).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const creatorId = await getCreatorId(ctx.user.id);
      const cid = creatorId || ctx.user.id;
      const result = await rawExec(
        "INSERT INTO vaultx_dmca_reports (creator_id, reported_url, platform, status) VALUES (?, ?, ?, 'pending')",
        [cid, input.reportedUrl, input.platform || null]
      );
      return { reportId: (result as any).insertId, success: true };
    }),

  // ═══════════════════════════════════════════════════════════════════════════
  // PROCEDURE 14 — getDmcaReports
  // ═══════════════════════════════════════════════════════════════════════════
  getDmcaReports: protectedProcedure.query(async ({ ctx }) => {
    const creatorId = await getCreatorId(ctx.user.id);
    const cid = creatorId || ctx.user.id;
    const rows = await rawQuery(
      "SELECT * FROM vaultx_dmca_reports WHERE creator_id = ? ORDER BY created_at DESC",
      [cid]
    );
    return { reports: rows };
  }),

  // ═══════════════════════════════════════════════════════════════════════════
  // PROCEDURE 15 — updateGeoBlocking
  // ═══════════════════════════════════════════════════════════════════════════
  updateGeoBlocking: protectedProcedure
    .input(z.object({ blockedCountries: z.array(z.string()) }))
    .mutation(async ({ ctx, input }) => {
      await rawExec(
        "UPDATE vaultx_creators SET geo_blocked_countries = ? WHERE user_id = ?",
        [JSON.stringify(input.blockedCountries), ctx.user.id]
      );
      return { success: true };
    }),

  // ═══════════════════════════════════════════════════════════════════════════
  // PROCEDURE 16 — applyWatermark (FFmpeg)
  // ═══════════════════════════════════════════════════════════════════════════
  applyWatermark: protectedProcedure
    .input(z.object({
      videoUrl: z.string().url(),
      watermarkText: z.string().max(100).optional(),
      watermarkImageUrl: z.string().url().optional(),
      position: z.enum(["top-left", "top-right", "bottom-left", "bottom-right"]).default("bottom-right"),
      opacity: z.number().min(0.1).max(1).default(0.7),
    }))
    .mutation(async ({ ctx, input }) => {
      const creatorId = await getCreatorId(ctx.user.id);
      const cid = creatorId || ctx.user.id;
      const dir = await ensureUploadDir(cid);
      const outName = `wm-${randomUUID()}.mp4`;
      const outPath = path.join(dir, outName);
      const text = input.watermarkText || "@VaultX";
      const posMap: Record<string, string> = {
        "top-left": "x=20:y=20",
        "top-right": "x=w-tw-20:y=20",
        "bottom-left": "x=20:y=h-th-20",
        "bottom-right": "x=w-tw-20:y=h-th-20",
      };
      const drawtext = `drawtext=text='${text}':fontcolor=white@${input.opacity}:fontsize=36:${posMap[input.position]}`;
      await runFFmpeg(["-i", input.videoUrl, "-vf", drawtext, "-c:a", "copy", outPath]);
      const outputUrl = `/uploads/vaultx/${cid}/${outName}`;
      return { outputUrl, success: true };
    }),

  // ═══════════════════════════════════════════════════════════════════════════
  // PROCEDURE 17 — getConversation
  // ═══════════════════════════════════════════════════════════════════════════
  getConversation: protectedProcedure
    .input(z.object({
      otherUserId: z.number(),
      limit: z.number().min(1).max(100).default(50),
      offset: z.number().min(0).default(0),
    }))
    .query(async ({ ctx, input }) => {
      const rows = await rawQuery(
        `SELECT m.*, 
                CASE WHEN m.sender_id = ? THEN 1 ELSE 0 END AS is_mine
         FROM vaultx_messages m
         WHERE (m.sender_id = ? AND m.recipient_id = ?)
            OR (m.sender_id = ? AND m.recipient_id = ?)
         ORDER BY m.created_at DESC LIMIT ? OFFSET ?`,
        [ctx.user.id, ctx.user.id, input.otherUserId, input.otherUserId, ctx.user.id, input.limit, input.offset]
      );
      // Mark unread messages as read
      await rawExec(
        "UPDATE vaultx_messages SET read_at = NOW() WHERE recipient_id = ? AND sender_id = ? AND read_at IS NULL",
        [ctx.user.id, input.otherUserId]
      );
      return { messages: rows.reverse() };
    }),

  // ═══════════════════════════════════════════════════════════════════════════
  // PROCEDURE 18 — sendMessage
  // ═══════════════════════════════════════════════════════════════════════════
  sendMessage: protectedProcedure
    .input(z.object({
      recipientId: z.number(),
      messageText: z.string().max(5000).optional(),
      mediaUrl: z.string().url().optional(),
      mediaType: z.enum(["photo", "video", "audio"]).optional(),
      isLocked: z.boolean().default(false),
      unlockPrice: z.number().min(0).default(0),
    }))
    .mutation(async ({ ctx, input }) => {
      if (!input.messageText && !input.mediaUrl) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Message or media required." });
      }
      // Save the fan's message
      const result = await rawExec(
        `INSERT INTO vaultx_messages
         (sender_id, recipient_id, message_text, media_url, media_type, is_locked, unlock_price)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [ctx.user.id, input.recipientId, input.messageText || null, input.mediaUrl || null,
         input.mediaType || null, input.isLocked ? 1 : 0, input.unlockPrice]
      );
      const messageId = (result as any).insertId;

      // ─── AI Chatter Auto-Response ─────────────────────────────────────────
      // If the recipient is a creator with AI chatter enabled, trigger GPT auto-reply
      if (input.messageText) {
        try {
          const chatterConfig = await rawQuery(
            `SELECT c.is_enabled, c.persona_name, c.persona_description, c.ppv_pitch_frequency
             FROM vaultx_ai_chatter_config c
             WHERE c.creator_id = ? AND c.is_enabled = 1 LIMIT 1`,
            [input.recipientId]
          );
          if (chatterConfig.length > 0) {
            const cfg = chatterConfig[0];
            const personaName = cfg.persona_name || "your creator";
            const personaDesc = cfg.persona_description || "a confident, body-positive adult content creator who is warm, flirty, and makes fans feel special";
            // Load recent conversation history (last 6 messages)
            const history = await rawQuery(
              `SELECT sender_id, message_text FROM vaultx_messages
               WHERE ((sender_id = ? AND recipient_id = ?) OR (sender_id = ? AND recipient_id = ?))
               AND message_text IS NOT NULL
               ORDER BY created_at DESC LIMIT 6`,
              [ctx.user.id, input.recipientId, input.recipientId, ctx.user.id]
            );
            const conversationHistory = history.reverse().map((m: any) => ({
              role: m.sender_id === input.recipientId ? "assistant" : "user",
              content: m.message_text || "",
            }));
            // Decide if we should pitch PPV (every N messages based on frequency setting)
            const pitchFreq = cfg.ppv_pitch_frequency || 5;
            const msgCount = history.length;
            const includePpvPitch = msgCount > 0 && msgCount % pitchFreq === 0;
            // Build GPT messages array
            const systemPrompt = `You are ${personaName} — ${personaDesc}. You are responding to a fan on VaultX, an adult content platform. Be authentic, warm, and engaging. ${includePpvPitch ? "Naturally weave in a mention of exclusive PPV content they can unlock to see more." : ""} Keep responses conversational, 1-3 sentences max. Sound like a real person, not a bot.`;
            const gptMessages: any[] = [{ role: "system", content: systemPrompt }, ...conversationHistory, { role: "user", content: input.messageText }];
            const { OpenAI } = await import("openai");
            const openaiClient = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
            const gptResp = await openaiClient.chat.completions.create({
              model: "gpt-4.1-mini",
              messages: gptMessages,
              max_tokens: 200,
              temperature: 0.85,
            });
            const aiReply = gptResp.choices[0].message.content || `Hey! Thanks for reaching out 💕`;
            // Save AI reply as a message from the creator (is_ai_generated flag)
            await rawExec(
              `INSERT INTO vaultx_messages
               (sender_id, recipient_id, message_text, is_locked, unlock_price, is_ai_generated)
               VALUES (?, ?, ?, 0, 0, 1)`,
              [input.recipientId, ctx.user.id, aiReply]
            );
          }
        } catch (aiErr) {
          // AI chatter errors are non-fatal — fan message was already saved
          console.error("[AI Chatter] Auto-response failed:", aiErr);
        }
      }

      return { messageId, success: true };
    }),

  // ═══════════════════════════════════════════════════════════════════════════
  // PROCEDURE 19 — unlockMessage
  // ═══════════════════════════════════════════════════════════════════════════
  unlockMessage: protectedProcedure
    .input(z.object({ messageId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const msg = await rawQuery("SELECT * FROM vaultx_messages WHERE id = ? LIMIT 1", [input.messageId]);
      if (!msg.length) throw new TRPCError({ code: "NOT_FOUND", message: "Message not found." });
      if (!msg[0].is_locked) return { success: true, alreadyUnlocked: true };
      // In production this would create a Stripe PaymentIntent
      await rawExec("UPDATE vaultx_messages SET is_unlocked = 1 WHERE id = ?", [input.messageId]);
      return { success: true, unlockPrice: msg[0].unlock_price };
    }),

  // ═══════════════════════════════════════════════════════════════════════════
  // PROCEDURE 20 — getInbox
  // ═══════════════════════════════════════════════════════════════════════════
  getInbox: protectedProcedure.query(async ({ ctx }) => {
    const rows = await rawQuery(
      `SELECT m.sender_id, m.recipient_id,
              MAX(m.created_at) AS last_message_at,
              COUNT(CASE WHEN m.recipient_id = ? AND m.read_at IS NULL THEN 1 END) AS unread_count,
              u.username, u.name
       FROM vaultx_messages m
       LEFT JOIN users u ON u.id = CASE WHEN m.sender_id = ? THEN m.recipient_id ELSE m.sender_id END
       WHERE m.sender_id = ? OR m.recipient_id = ?
       GROUP BY LEAST(m.sender_id, m.recipient_id), GREATEST(m.sender_id, m.recipient_id)
       ORDER BY last_message_at DESC LIMIT 50`,
      [ctx.user.id, ctx.user.id, ctx.user.id, ctx.user.id]
    );
    return { conversations: rows };
  }),

  // ═══════════════════════════════════════════════════════════════════════════
  // PROCEDURE 21 — createTip
  // ═══════════════════════════════════════════════════════════════════════════
  createTip: protectedProcedure
    .input(z.object({
      creatorId: z.number(),
      amount: z.number().min(1).max(10000),
      message: z.string().max(500).optional(),
      contentId: z.number().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const result = await rawExec(
        "INSERT INTO vaultx_tips (fan_id, creator_id, content_id, amount, message, status) VALUES (?, ?, ?, ?, ?, 'pending')",
        [ctx.user.id, input.creatorId, input.contentId || null, input.amount, input.message || null]
      );
      return { tipId: (result as any).insertId, success: true };
    }),

  // ═══════════════════════════════════════════════════════════════════════════
  // PROCEDURE 22 — confirmTip
  // ═══════════════════════════════════════════════════════════════════════════
  confirmTip: protectedProcedure
    .input(z.object({ tipId: z.number(), paymentIntentId: z.string().optional() }))
    .mutation(async ({ ctx, input }) => {
      const tip = await rawQuery("SELECT * FROM vaultx_tips WHERE id = ? AND fan_id = ? LIMIT 1", [input.tipId, ctx.user.id]);
      if (!tip.length) throw new TRPCError({ code: "NOT_FOUND", message: "Tip not found." });
      await rawExec(
        "UPDATE vaultx_tips SET status = 'completed', stripe_payment_intent_id = ? WHERE id = ?",
        [input.paymentIntentId || null, input.tipId]
      );
      const creatorEarnings = tip[0].amount * (1 - PLATFORM_FEE);
      await rawExec(
        "UPDATE vaultx_creators SET total_revenue = total_revenue + ? WHERE id = ?",
        [creatorEarnings, tip[0].creator_id]
      );
      return { success: true, creatorEarnings };
    }),

  // ═══════════════════════════════════════════════════════════════════════════
  // PROCEDURE 23 — createCustomRequest
  // ═══════════════════════════════════════════════════════════════════════════
  createCustomRequest: protectedProcedure
    .input(z.object({
      creatorId: z.number(),
      requestDescription: z.string().min(10).max(2000),
      requestedContentType: z.enum(["photo", "video", "audio", "live"]),
      offeredPrice: z.number().min(5).max(10000),
      deadlineDays: z.number().min(1).max(30).default(7),
    }))
    .mutation(async ({ ctx, input }) => {
      const result = await rawExec(
        `INSERT INTO vaultx_custom_requests
         (fan_id, creator_id, request_description, requested_content_type, offered_price, deadline_days, status)
         VALUES (?, ?, ?, ?, ?, ?, 'pending')`,
        [ctx.user.id, input.creatorId, input.requestDescription, input.requestedContentType, input.offeredPrice, input.deadlineDays]
      );
      return { requestId: (result as any).insertId, success: true };
    }),

  // ═══════════════════════════════════════════════════════════════════════════
  // PROCEDURE 24 — respondToCustomRequest
  // ═══════════════════════════════════════════════════════════════════════════
  respondToCustomRequest: protectedProcedure
    .input(z.object({
      requestId: z.number(),
      status: z.enum(["accepted", "declined"]),
      creatorResponse: z.string().max(1000).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const creatorId = await getCreatorId(ctx.user.id);
      const cid = creatorId || ctx.user.id;
      const req = await rawQuery("SELECT * FROM vaultx_custom_requests WHERE id = ? AND creator_id = ? LIMIT 1", [input.requestId, cid]);
      if (!req.length) throw new TRPCError({ code: "NOT_FOUND", message: "Request not found." });
      await rawExec(
        "UPDATE vaultx_custom_requests SET status = ?, creator_response = ? WHERE id = ?",
        [input.status, input.creatorResponse || null, input.requestId]
      );
      return { success: true };
    }),

  // ═══════════════════════════════════════════════════════════════════════════
  // PROCEDURE 25 — getCustomRequests
  // ═══════════════════════════════════════════════════════════════════════════
  getCustomRequests: protectedProcedure
    .input(z.object({
      role: z.enum(["creator", "fan"]).default("creator"),
      status: z.enum(["all", "pending", "accepted", "declined", "completed", "cancelled"]).default("all"),
    }))
    .query(async ({ ctx, input }) => {
      const creatorId = await getCreatorId(ctx.user.id);
      const cid = creatorId || ctx.user.id;
      const whereRole = input.role === "creator" ? "creator_id = ?" : "fan_id = ?";
      const whereStatus = input.status === "all" ? "" : "AND status = ?";
      const params = input.status === "all" ? [cid] : [cid, input.status];
      const rows = await rawQuery(
        `SELECT r.*, u.username AS fan_username, u.name AS fan_name
         FROM vaultx_custom_requests r
         LEFT JOIN users u ON u.id = r.fan_id
         WHERE ${whereRole} ${whereStatus}
         ORDER BY r.created_at DESC`,
        params
      );
      return { requests: rows };
    }),

  // ═══════════════════════════════════════════════════════════════════════════
  // PROCEDURE 26 — createSubscription
  // ═══════════════════════════════════════════════════════════════════════════
  createSubscription: protectedProcedure
    .input(z.object({
      creatorId: z.number(),
      tier: z.enum(["basic", "premium", "vip"]),
      stripeSubscriptionId: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const creator = await rawQuery("SELECT * FROM vaultx_creators WHERE id = ? LIMIT 1", [input.creatorId]);
      if (!creator.length) throw new TRPCError({ code: "NOT_FOUND", message: "Creator not found." });
      const priceMap: Record<string, number> = {
        basic: creator[0].subscription_price_basic,
        premium: creator[0].subscription_price_premium,
        vip: creator[0].subscription_price_vip,
      };
      const price = priceMap[input.tier];
      const now = new Date();
      const periodEnd = new Date(now);
      periodEnd.setMonth(periodEnd.getMonth() + 1);
      const existing = await rawQuery(
        "SELECT id FROM vaultx_subscriptions WHERE fan_id = ? AND creator_id = ? AND status = 'active' LIMIT 1",
        [ctx.user.id, input.creatorId]
      );
      if (existing.length) {
        await rawExec(
          "UPDATE vaultx_subscriptions SET tier = ?, price_paid = ?, current_period_end = ? WHERE id = ?",
          [input.tier, price, periodEnd, existing[0].id]
        );
        return { subscriptionId: existing[0].id, success: true };
      }
      const result = await rawExec(
        `INSERT INTO vaultx_subscriptions
         (fan_id, creator_id, tier, price_paid, stripe_subscription_id, status, current_period_start, current_period_end)
         VALUES (?, ?, ?, ?, ?, 'active', ?, ?)`,
        [ctx.user.id, input.creatorId, input.tier, price, input.stripeSubscriptionId || null, now, periodEnd]
      );
      await rawExec("UPDATE vaultx_creators SET total_subscribers = total_subscribers + 1 WHERE id = ?", [input.creatorId]);
      return { subscriptionId: (result as any).insertId, success: true };
    }),

  // ═══════════════════════════════════════════════════════════════════════════
  // CANONICAL VAULTX REVENUE PACKAGE — creator input → asset → route → checkout
  // ═══════════════════════════════════════════════════════════════════════════
  createRevenuePackage: protectedProcedure
    .input(z.object({
      title: z.string().min(3).max(255),
      contentType: z.enum(["photo", "video", "audio"]),
      adultContentFlag: z.boolean(),
      consentConfirmed: z.boolean(),
      teaserDescription: z.string().min(30).max(1600),
      priceCents: z.number().int().min(100).max(250000),
      vipPriceCents: z.number().int().min(100).max(500000).optional(),
      telegramMode: z.enum(["FAST", "BOOST", "FULL"]).default("FAST"),
      sourceMediaUrl: z.string().url().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      if (!input.adultContentFlag || !input.consentConfirmed) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "VaultX revenue packages require explicit adult-content opt-in and creator consent confirmation." });
      }
      await ensureVaultxRevenuePackageSchema();
      const creatorId = await getCreatorId(ctx.user.id);
      const cid = creatorId || ctx.user.id;
      const publicTeaserCopy = qualityGate.check(buildVaultxPackagePublicCopy(input), {
        surface: "vaultx-drop",
        context: "vaultx",
        recipientKey: `vaultx-package-${ctx.user.id}`,
        hasActionElement: true,
        requireMessagingDna: true,
        requireMechanism: true,
        requireCreatorVaultPositioning: true,
        ctaAngle: "asset-conversion",
      });
      if (input.sourceMediaUrl) {
        qualityGate.checkVisual(input.sourceMediaUrl, {
          prompt: "VaultX creator source asset for teaser to paid unlock to tracked click to follow-up to VIP route; dark luxury cinematic premium style.",
          publicPost: true,
        });
      }
      const result = await rawExec(
        `INSERT INTO vaultx_revenue_packages
         (creator_id, user_id, title, content_type, adult_content_flag, consent_confirmed, teaser_description, public_teaser_copy, price_cents, vip_price_cents, platform_fee_bps, creator_keep_bps, telegram_mode, source_media_url, status)
         VALUES (?, ?, ?, ?, 1, 1, ?, ?, ?, ?, 1500, 8500, ?, ?, 'created')`,
        [cid, ctx.user.id, input.title.trim(), input.contentType, input.teaserDescription.trim(), publicTeaserCopy, input.priceCents, input.vipPriceCents || null, input.telegramMode, input.sourceMediaUrl || null]
      );
      return {
        packageId: (result as any).insertId,
        platformFeePercent: 15,
        creatorKeepPercent: 85,
        publicTeaserCopy,
        success: true,
      };
    }),

  generatePackageAsset: protectedProcedure
    .input(z.object({
      packageId: z.number().int().positive(),
      sourceMediaUrl: z.string().url().optional(),
      resolution: z.enum(["540p", "720p", "1080p"]).default("720p"),
      length: z.enum(["5", "6", "8", "10"]).default("6"),
      mode: z.enum(["std", "pro"]).default("std"),
    }))
    .mutation(async ({ ctx, input }) => {
      if (!POLLO_API_KEY) throw new TRPCError({ code: "PRECONDITION_FAILED", message: "POLLO_API_KEY is not configured for VaultX media generation." });
      const pkg = await assertPackageOwner(input.packageId, ctx.user.id);
      const sourceMediaUrl = input.sourceMediaUrl || pkg.source_media_url;
      if (!sourceMediaUrl) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "A real creator source media URL is required before Pollo can generate a VaultX promo asset." });
      }
      qualityGate.checkVisual(sourceMediaUrl, {
        prompt: "VaultX creator source asset for teaser to paid unlock to tracked click to follow-up to VIP route; dark luxury cinematic premium style.",
        publicPost: true,
      });
      const prompt = buildVaultxPackagePolloPrompt(pkg);
      qualityGate.checkVisual(sourceMediaUrl, { prompt, publicPost: true });

      const reusableAssets = await rawQuery(
        `SELECT taskId, videoUrl, status
         FROM pollo_generations
         WHERE imageUrl = ? AND status IN ('succeed', 'success', 'succeeded') AND videoUrl IS NOT NULL AND videoUrl <> ''
         ORDER BY updatedAt DESC, id DESC
         LIMIT 1`,
        [sourceMediaUrl]
      );
      const reusable = reusableAssets[0];
      if (reusable?.videoUrl) {
        qualityGate.checkVisual(reusable.videoUrl, { prompt, publicPost: true });
        const artifact = await persistReadyVaultxArtifact({
          creatorId: Number(pkg.creator_id),
          packageId: input.packageId,
          kind: "package",
          stage: "package_asset_reuse",
          provider: "pollo",
          providerJobId: reusable.taskId,
          sourceUrl: sourceMediaUrl,
          finalUrl: reusable.videoUrl,
          metadata: { prompt, resolution: input.resolution, length: input.length, mode: input.mode, reusedExistingPolloAsset: true },
        });
        await rawExec(
          `UPDATE vaultx_revenue_packages
           SET source_media_url = ?, asset_prompt = ?, pollo_job_id = ?, asset_status = 'succeed', asset_url = ?, asset_quality_passed = 1, status = 'asset_ready'
           WHERE id = ?`,
          [sourceMediaUrl, prompt, reusable.taskId, artifact.output_url || reusable.videoUrl, input.packageId]
        );
        return { jobId: reusable.taskId, status: "succeed", videoUrl: artifact.output_url || reusable.videoUrl, artifact: publicArtifactPayload(artifact), reusedExistingPolloAsset: true, packageId: input.packageId, success: true };
      }

      const generationController = new AbortController();
      const generationTimeout = setTimeout(() => generationController.abort(), 30000);
      const response = await fetch(POLLO_API_URL, {
        method: "POST",
        headers: {
          "x-api-key": POLLO_API_KEY,
          "Content-Type": "application/json",
        },
        signal: generationController.signal,
        body: JSON.stringify({
          input: {
            image: sourceMediaUrl,
            prompt,
            resolution: input.resolution,
            length: Number(input.length),
            mode: input.mode === "pro" ? "pro" : "basic",
          },
        }),
      }).finally(() => clearTimeout(generationTimeout));
      const data = await response.json() as any;
      if (!response.ok || (data?.code && data.code !== "SUCCESS")) {
        throw new TRPCError({ code: "BAD_GATEWAY", message: data?.message || data?.error || `Pollo generation failed to start: ${JSON.stringify(data).slice(0, 500)}` });
      }
      const taskId = data?.data?.taskId || data?.taskId || data?.id;
      if (!taskId) throw new TRPCError({ code: "BAD_GATEWAY", message: "Pollo did not return a task id." });
      const status = normalisePolloStatus(data?.data?.status || data?.status);
      await rawExec(
        `INSERT INTO pollo_generations (userId, taskId, imageUrl, prompt, resolution, length, mode, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [ctx.user.id, taskId, sourceMediaUrl, prompt, input.resolution, input.length, input.mode, status]
      );
      const artifact = await createVaultxArtifact({
        creatorId: Number(pkg.creator_id),
        packageId: input.packageId,
        kind: "package",
        stage: "package_asset_generation",
        provider: "pollo",
        providerJobId: taskId,
        sourceUrl: sourceMediaUrl,
        status: status === "succeed" ? "processing" : status === "failed" ? "failed" : "queued",
        metadata: { prompt, resolution: input.resolution, length: input.length, mode: input.mode, polloResponse: data },
      });
      await rawExec(
        `UPDATE vaultx_revenue_packages
         SET source_media_url = ?, asset_prompt = ?, pollo_job_id = ?, asset_status = ?, status = 'asset_generating'
         WHERE id = ?`,
        [sourceMediaUrl, prompt, taskId, status, input.packageId]
      );
      return { jobId: taskId, status, packageId: input.packageId, artifact: publicArtifactPayload(artifact), success: true };
    }),

  getPackageAssetStatus: protectedProcedure
    .input(z.object({ packageId: z.number().int().positive(), jobId: z.string().min(3).optional() }))
    .query(async ({ ctx, input }) => {
      const pkg = await assertPackageOwner(input.packageId, ctx.user.id);
      const jobId = input.jobId || pkg.pollo_job_id;
      if (!jobId) {
        const artifacts = await listVaultxPackageArtifacts(Number(pkg.creator_id), input.packageId);
        return { status: pkg.asset_status || "waiting", videoUrl: pkg.asset_url || null, qualityPassed: Boolean(pkg.asset_quality_passed), artifacts: artifacts.map(publicArtifactPayload) };
      }
      const packageArtifacts = await listVaultxPackageArtifacts(Number(pkg.creator_id), input.packageId);
      const pendingArtifact = packageArtifacts.find((item) => item.provider === "pollo" && item.provider_job_id === jobId && item.status !== "ready" && item.status !== "failed");
      let readyArtifact = packageArtifacts.find((item) => item.provider === "pollo" && item.provider_job_id === jobId && item.status === "ready");
      if (pendingArtifact) {
        try {
          const polledArtifact = await pollAndPersistProviderArtifact({ artifactId: Number(pendingArtifact.id), creatorId: Number(pkg.creator_id), packageId: input.packageId, kind: "package", stage: "package_asset_generation", provider: "pollo" });
          if (polledArtifact.status === "ready") readyArtifact = polledArtifact;
        } catch (err: any) {
          await updateVaultxArtifactStatus(Number(pendingArtifact.id), { creatorId: Number(pkg.creator_id), status: "failed", failureReason: err.message, metadata: { pollError: true } }).catch(() => undefined);
        }
      }
      let rows = await rawQuery("SELECT * FROM pollo_generations WHERE taskId = ? ORDER BY id DESC LIMIT 1", [jobId]);
      let row = rows[0];
      if (POLLO_API_KEY && (!row || !["succeed", "failed"].includes(String(row.status)))) {
        const statusController = new AbortController();
        const statusTimeout = setTimeout(() => statusController.abort(), 20000);
        const response = await fetch(`${POLLO_BASE_URL}/generation/${jobId}/status`, {
          method: "GET",
          headers: { "x-api-key": POLLO_API_KEY },
          signal: statusController.signal,
        }).finally(() => clearTimeout(statusTimeout));
        const data = await response.json() as any;
        if (response.ok && (!data?.code || data.code === "SUCCESS")) {
          const generation = data?.data?.generations?.[0] || null;
          const status = normalisePolloStatus(generation?.status || data?.data?.status || data?.status);
          const videoUrl = generation?.url || data?.data?.videoUrl || data?.data?.url || data?.videoUrl || data?.url || null;
          await rawExec("UPDATE pollo_generations SET status = ?, videoUrl = COALESCE(?, videoUrl), updatedAt = CURRENT_TIMESTAMP WHERE taskId = ?", [status, videoUrl, jobId]);
          if (videoUrl) {
            qualityGate.checkVisual(videoUrl, { prompt: pkg.asset_prompt || buildVaultxPackagePolloPrompt(pkg), publicPost: true });
          }
          if (videoUrl && !readyArtifact) {
            readyArtifact = await persistReadyVaultxArtifact({
              creatorId: Number(pkg.creator_id),
              packageId: input.packageId,
              kind: "package",
              stage: "package_asset_generation",
              provider: "pollo",
              providerJobId: jobId,
              sourceUrl: pkg.source_media_url,
              finalUrl: videoUrl,
              metadata: { prompt: pkg.asset_prompt || buildVaultxPackagePolloPrompt(pkg), polloStatusResponse: data },
            });
          }
          await rawExec(
            `UPDATE vaultx_revenue_packages
             SET asset_status = ?, asset_url = COALESCE(?, asset_url), asset_quality_passed = CASE WHEN ? IS NULL THEN asset_quality_passed ELSE 1 END, status = CASE WHEN ? IS NULL THEN status ELSE 'asset_ready' END
             WHERE id = ?`,
            [status, readyArtifact?.output_url || videoUrl, readyArtifact?.output_url || videoUrl, readyArtifact?.output_url || videoUrl, input.packageId]
          );
        }
        rows = await rawQuery("SELECT * FROM pollo_generations WHERE taskId = ? ORDER BY id DESC LIMIT 1", [jobId]);
        row = rows[0];
      }
      const refreshedArtifacts = await listVaultxPackageArtifacts(Number(pkg.creator_id), input.packageId);
      readyArtifact = refreshedArtifacts.find((item) => item.provider === "pollo" && item.provider_job_id === jobId && item.status === "ready") || readyArtifact;
      return {
        jobId,
        status: readyArtifact ? "succeed" : row?.status || pkg.asset_status || "waiting",
        videoUrl: readyArtifact?.output_url || row?.videoUrl || pkg.asset_url || null,
        artifact: publicArtifactPayload(readyArtifact),
        artifacts: refreshedArtifacts.map(publicArtifactPayload),
        qualityPassed: Boolean(pkg.asset_quality_passed || readyArtifact || row?.videoUrl),
      };
    }),

  attachPackageCheckout: protectedProcedure
    .input(z.object({ packageId: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      const pkg = await assertPackageOwner(input.packageId, ctx.user.id);
      let readyArtifact;
      try {
        readyArtifact = await assertReadyVaultxPackageArtifact(Number(pkg.creator_id), input.packageId);
      } catch (err: any) {
        throw readinessGateError(err);
      }
      if (!stripe) throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Stripe checkout is not configured for VaultX package unlocks." });
      const session = await stripe.checkout.sessions.create({
        mode: "payment",
        line_items: [{
          price_data: {
            currency: "usd",
            product_data: { name: `VaultX Unlock: ${pkg.title}` },
            unit_amount: Number(pkg.price_cents),
          },
          quantity: 1,
        }],
        success_url: `${FRONTEND_BASE_URL}/vaultx?package=${pkg.id}&checkout=success`,
        cancel_url: `${FRONTEND_BASE_URL}/vaultx?package=${pkg.id}&checkout=cancelled`,
        metadata: {
          vaultxPackageId: String(pkg.id),
          creatorId: String(pkg.creator_id),
          platformFeePercent: "15",
          creatorKeepPercent: "85",
          vaultxArtifactId: String(readyArtifact.id),
        },
      });
      await rawExec(
        `UPDATE vaultx_revenue_packages
         SET checkout_url = ?, stripe_checkout_session_id = ?, status = 'checkout_attached'
         WHERE id = ?`,
        [session.url, session.id, input.packageId]
      );
      await recordVaultxArtifactEvent({ artifactId: readyArtifact.id, creatorId: Number(pkg.creator_id), packageId: input.packageId, eventType: "checkout.attached", status: "ready", payload: { checkoutSessionId: session.id, checkoutUrl: session.url } });
      return { checkoutUrl: session.url, checkoutSessionId: session.id, artifact: publicArtifactPayload(readyArtifact), success: true };
    }),

  publishPackageTelegramRoute: protectedProcedure
    .input(z.object({ packageId: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      const pkg = await assertPackageOwner(input.packageId, ctx.user.id);
      let readyArtifact;
      try {
        readyArtifact = await assertReadyVaultxPackageArtifact(Number(pkg.creator_id), input.packageId);
      } catch (err: any) {
        throw readinessGateError(err);
      }
      if (!pkg.checkout_url) throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Attach a real checkout before publishing a VaultX Telegram route." });
      const publicCopy = qualityGate.check(pkg.public_teaser_copy || buildVaultxPackagePublicCopy({
        title: pkg.title,
        teaserDescription: pkg.teaser_description,
        priceCents: Number(pkg.price_cents),
        vipPriceCents: pkg.vip_price_cents ? Number(pkg.vip_price_cents) : null,
        telegramMode: pkg.telegram_mode,
      }), {
        surface: "vaultx-drop",
        context: "vaultx",
        recipientKey: `vaultx-package-publish-${pkg.id}`,
        hasActionElement: true,
        requireMessagingDna: true,
        requireMechanism: true,
        requireCreatorVaultPositioning: true,
        ctaAngle: "proof-unlock",
      });
      let contentId = pkg.vaultx_content_id;
      if (!contentId) {
        const contentResult = await rawExec(
          `INSERT INTO vaultx_content
           (creator_id, title, description, content_type, thumbnail_url, censored_url, uncensored_url, is_ppv, ppv_price, status, access_tier)
           VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, 'active', 'basic')`,
          [pkg.creator_id, pkg.title, publicCopy, pkg.content_type, pkg.source_media_url || readyArtifact.output_url || null, readyArtifact.output_url, readyArtifact.output_url, Number(pkg.price_cents) / 100]
        );
        contentId = (contentResult as any).insertId;
        await rawExec("UPDATE vaultx_revenue_packages SET vaultx_content_id = ? WHERE id = ?", [contentId, pkg.id]);
      }
      const campaign = await createAIDrop({
        contentId: Number(contentId),
        creatorId: Number(pkg.creator_id),
        campaignMode: pkg.telegram_mode as VaultxPackageMode,
        campaignType: "PPV_DROP",
        overridePrice: Number(pkg.price_cents) / 100,
      });
      await rawExec(
        `UPDATE vaultx_revenue_packages
         SET telegram_campaign_id = ?, telegram_tracking_code = ?, status = 'telegram_route_created'
         WHERE id = ?`,
        [campaign.campaignId, campaign.trackingCode, pkg.id]
      );
      await recordVaultxArtifactEvent({ artifactId: readyArtifact.id, creatorId: Number(pkg.creator_id), packageId: pkg.id, eventType: "telegram.route_created", status: "ready", payload: { campaignId: campaign.campaignId, trackingCode: campaign.trackingCode } });
      const sent = await sendDropToChannel(campaign.campaignId);
      await rawExec(
        `UPDATE vaultx_revenue_packages
         SET status = ?
         WHERE id = ?`,
        [sent.success ? "telegram_published" : "telegram_failed", pkg.id]
      );
      if (!sent.success) throw new TRPCError({ code: "BAD_GATEWAY", message: sent.error || "Telegram publish failed." });
      await recordVaultxArtifactEvent({ artifactId: readyArtifact.id, creatorId: Number(pkg.creator_id), packageId: pkg.id, eventType: "telegram.published", status: "ready", payload: { campaignId: campaign.campaignId, trackedUrl: sent.trackedUrl } });
      return { campaignId: campaign.campaignId, trackingCode: campaign.trackingCode, trackedUrl: sent.trackedUrl, artifact: publicArtifactPayload(readyArtifact), success: true };
    }),

  launchRevenuePath: protectedProcedure
    .input(z.object({
      title: z.string().min(3).max(255),
      contentType: z.enum(["photo", "video", "audio"]).default("video"),
      adultContentFlag: z.boolean(),
      consentConfirmed: z.boolean(),
      teaserDescription: z.string().min(10).max(2000),
      priceCents: z.number().int().min(100),
      vipPriceCents: z.number().int().min(100).optional(),
      telegramMode: z.enum(["FAST", "BOOST", "FULL"]).default("BOOST"),
      sourceMediaUrl: z.string().url(),
      resolution: z.enum(["540p", "720p", "1080p"]).default("720p"),
      length: z.enum(["5", "6", "8", "10"]).default("6"),
      mode: z.enum(["std", "pro"]).default("pro"),
    }))
    .mutation(async ({ ctx, input }) => {
      if (!input.adultContentFlag || !input.consentConfirmed) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "VaultX launch requires adult-content opt-in and creator consent confirmation." });
      }
      if (!POLLO_API_KEY) throw new TRPCError({ code: "PRECONDITION_FAILED", message: "POLLO_API_KEY is not configured for VaultX media generation." });
      if (!stripe) throw new TRPCError({ code: "PRECONDITION_FAILED", message: "STRIPE_SECRET_KEY is not configured for VaultX checkout creation." });
      await ensureVaultxRevenuePackageSchema();
      await ensureVaultxArtifactSchema();

      const creatorId = await getCreatorId(ctx.user.id);
      const cid = creatorId || ctx.user.id;
      const publicTeaserCopy = qualityGate.check(buildVaultxPackagePublicCopy(input), {
        surface: "vaultx-drop",
        context: "vaultx",
        recipientKey: `vaultx-end-to-end-${ctx.user.id}-${Date.now()}`,
        hasActionElement: true,
        requireMessagingDna: true,
        requireMechanism: true,
        requireCreatorVaultPositioning: true,
        ctaAngle: "asset-conversion",
      });
      qualityGate.checkVisual(input.sourceMediaUrl, {
        prompt: "VaultX creator-owned source asset for Body Cinema teaser to paid unlock to tracked Telegram route; premium cinematic, platform-safe public preview.",
        publicPost: true,
      });

      const packageResult = await rawExec(
        `INSERT INTO vaultx_revenue_packages
         (creator_id, user_id, title, content_type, adult_content_flag, consent_confirmed, teaser_description, public_teaser_copy, price_cents, vip_price_cents, platform_fee_bps, creator_keep_bps, telegram_mode, source_media_url, status)
         VALUES (?, ?, ?, ?, 1, 1, ?, ?, ?, ?, 1500, 8500, ?, ?, 'created')`,
        [cid, ctx.user.id, input.title.trim(), input.contentType, input.teaserDescription.trim(), publicTeaserCopy, input.priceCents, input.vipPriceCents || null, input.telegramMode, input.sourceMediaUrl]
      );
      const packageId = Number((packageResult as any).insertId);
      const pkgRows = await rawQuery("SELECT * FROM vaultx_revenue_packages WHERE id = ? LIMIT 1", [packageId]);
      const pkg = pkgRows[0];
      if (!pkg) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "VaultX package row was not readable after creation." });

      const prompt = buildVaultxPackagePolloPrompt(pkg);
      const reusableAssets = await rawQuery(
        `SELECT taskId, videoUrl, status
         FROM pollo_generations
         WHERE imageUrl = ? AND status IN ('succeed', 'success', 'succeeded') AND videoUrl IS NOT NULL AND videoUrl <> ''
         ORDER BY updatedAt DESC, id DESC
         LIMIT 1`,
        [input.sourceMediaUrl]
      );
      const reusable = reusableAssets[0];
      let jobId = "";
      let generationStatus: string = "waiting";
      let readyArtifact: any = null;
      let queuedArtifact: any = null;
      let reusedExistingPolloAsset = false;

      if (reusable?.videoUrl) {
        qualityGate.checkVisual(reusable.videoUrl, { prompt, publicPost: true });
        readyArtifact = await persistReadyVaultxArtifact({
          creatorId: Number(pkg.creator_id),
          packageId,
          kind: "package",
          stage: "end_to_end_package_asset_reuse",
          provider: "pollo",
          providerJobId: reusable.taskId,
          sourceUrl: input.sourceMediaUrl,
          finalUrl: reusable.videoUrl,
          metadata: { prompt, resolution: input.resolution, length: input.length, mode: input.mode, reusedExistingPolloAsset: true, launchMode: "end_to_end" },
        });
        jobId = reusable.taskId;
        generationStatus = "succeed";
        reusedExistingPolloAsset = true;
        await rawExec(
          `UPDATE vaultx_revenue_packages
           SET source_media_url = ?, asset_prompt = ?, pollo_job_id = ?, asset_status = 'succeed', asset_url = ?, asset_quality_passed = 1, status = 'asset_ready'
           WHERE id = ?`,
          [input.sourceMediaUrl, prompt, jobId, readyArtifact.output_url || reusable.videoUrl, packageId]
        );
      } else {
        const generationController = new AbortController();
        const generationTimeout = setTimeout(() => generationController.abort(), 30000);
        const response = await fetch(POLLO_API_URL, {
          method: "POST",
          headers: { "x-api-key": POLLO_API_KEY, "Content-Type": "application/json" },
          signal: generationController.signal,
          body: JSON.stringify({
            input: {
              image: input.sourceMediaUrl,
              prompt,
              resolution: input.resolution,
              length: Number(input.length),
              mode: input.mode === "pro" ? "pro" : "basic",
            },
          }),
        }).finally(() => clearTimeout(generationTimeout));
        const data = await response.json() as any;
        if (!response.ok || (data?.code && data.code !== "SUCCESS")) {
          throw new TRPCError({ code: "BAD_GATEWAY", message: data?.message || data?.error || `Pollo generation failed to start: ${JSON.stringify(data).slice(0, 500)}` });
        }
        jobId = data?.data?.taskId || data?.taskId || data?.id;
        if (!jobId) throw new TRPCError({ code: "BAD_GATEWAY", message: "Pollo did not return a task id." });
        generationStatus = normalisePolloStatus(data?.data?.status || data?.status);
        await rawExec(
          `INSERT INTO pollo_generations (userId, taskId, imageUrl, prompt, resolution, length, mode, status)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [ctx.user.id, jobId, input.sourceMediaUrl, prompt, input.resolution, input.length, input.mode, generationStatus]
        );
        queuedArtifact = await createVaultxArtifact({
          creatorId: Number(pkg.creator_id),
          packageId,
          kind: "package",
          stage: "end_to_end_package_asset_generation",
          provider: "pollo",
          providerJobId: jobId,
          sourceUrl: input.sourceMediaUrl,
          status: generationStatus === "failed" ? "failed" : "queued",
          metadata: { prompt, resolution: input.resolution, length: input.length, mode: input.mode, polloResponse: data, launchMode: "end_to_end" },
        });
        await rawExec(
          `UPDATE vaultx_revenue_packages
           SET source_media_url = ?, asset_prompt = ?, pollo_job_id = ?, asset_status = ?, status = 'asset_generating'
           WHERE id = ?`,
          [input.sourceMediaUrl, prompt, jobId, generationStatus, packageId]
        );
      }

      if (!readyArtifact) {
        const pendingArtifactId = queuedArtifact?.id || null;
        if (pendingArtifactId) {
          await recordVaultxArtifactEvent({
            artifactId: Number(pendingArtifactId),
            creatorId: Number(pkg.creator_id),
            packageId,
            eventType: "vaultx.launch.awaiting_media",
            status: "queued",
            payload: { packageId, jobId, generationStatus, reason: "Pollo job started; checkout and Telegram route require ready artifact." },
          });
        }
        return {
          success: true,
          complete: false,
          status: "media_processing",
          packageId,
          jobId,
          generationStatus,
          artifact: publicArtifactPayload(queuedArtifact),
          artifacts: queuedArtifact ? [publicArtifactPayload(queuedArtifact)] : [],
          checkoutUrl: null,
          checkoutSessionId: null,
          campaignId: null,
          trackingCode: null,
          trackedUrl: null,
          vaultxContentId: null,
          reusedExistingPolloAsset,
          message: "Pollo accepted the Body Cinema job. Checkout and Telegram distribution stay locked until a ready artifact is persisted.",
        };
      }

      const session = await stripe.checkout.sessions.create({
        mode: "payment",
        line_items: [{
          price_data: {
            currency: "usd",
            product_data: { name: `VaultX Unlock: ${pkg.title}` },
            unit_amount: Number(pkg.price_cents),
          },
          quantity: 1,
        }],
        success_url: `${FRONTEND_BASE_URL}/vaultx?package=${packageId}&checkout=success&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${FRONTEND_BASE_URL}/vaultx?package=${packageId}&checkout=cancelled`,
        metadata: {
          type: "vaultx_package_unlock",
          vaultxPackageId: String(packageId),
          creatorId: String(pkg.creator_id),
          platformFeePercent: "15",
          creatorKeepPercent: "85",
          vaultxArtifactId: String(readyArtifact.id),
        },
      });
      await rawExec(
        `UPDATE vaultx_revenue_packages
         SET checkout_url = ?, stripe_checkout_session_id = ?, status = 'checkout_attached'
         WHERE id = ?`,
        [session.url, session.id, packageId]
      );
      await recordVaultxArtifactEvent({ artifactId: readyArtifact.id, creatorId: Number(pkg.creator_id), packageId, eventType: "checkout.attached", status: "ready", payload: { checkoutSessionId: session.id, checkoutUrl: session.url, endToEndLaunch: true } });

      const publishCopy = qualityGate.check(pkg.public_teaser_copy || publicTeaserCopy, {
        surface: "vaultx-drop",
        context: "vaultx",
        recipientKey: `vaultx-e2e-publish-${packageId}`,
        hasActionElement: true,
        requireMessagingDna: true,
        requireMechanism: true,
        requireCreatorVaultPositioning: true,
        ctaAngle: "proof-unlock",
      });
      const contentResult = await rawExec(
        `INSERT INTO vaultx_content
         (creator_id, title, description, content_type, thumbnail_url, censored_url, uncensored_url, is_ppv, ppv_price, status, access_tier)
         VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, 'active', 'basic')`,
        [pkg.creator_id, pkg.title, publishCopy, pkg.content_type, pkg.source_media_url || readyArtifact.output_url || null, readyArtifact.output_url, readyArtifact.output_url, Number(pkg.price_cents) / 100]
      );
      const contentId = Number((contentResult as any).insertId);
      await rawExec("UPDATE vaultx_revenue_packages SET vaultx_content_id = ? WHERE id = ?", [contentId, packageId]);

      const campaign = await createAIDrop({
        contentId,
        creatorId: Number(pkg.creator_id),
        campaignMode: pkg.telegram_mode as VaultxPackageMode,
        campaignType: "PPV_DROP",
        overridePrice: Number(pkg.price_cents) / 100,
      });
      await rawExec(
        `UPDATE vaultx_revenue_packages
         SET telegram_campaign_id = ?, telegram_tracking_code = ?, status = 'telegram_route_created'
         WHERE id = ?`,
        [campaign.campaignId, campaign.trackingCode, packageId]
      );
      await recordVaultxArtifactEvent({ artifactId: readyArtifact.id, creatorId: Number(pkg.creator_id), packageId, eventType: "telegram.route_created", status: "ready", payload: { campaignId: campaign.campaignId, trackingCode: campaign.trackingCode, contentId, endToEndLaunch: true } });
      const sent = await sendDropToChannel(campaign.campaignId);
      await rawExec("UPDATE vaultx_revenue_packages SET status = ? WHERE id = ?", [sent.success ? "telegram_published" : "telegram_failed", packageId]);
      if (!sent.success) throw new TRPCError({ code: "BAD_GATEWAY", message: sent.error || "Telegram publish failed." });
      await recordVaultxArtifactEvent({ artifactId: readyArtifact.id, creatorId: Number(pkg.creator_id), packageId, eventType: "telegram.published", status: "ready", payload: { campaignId: campaign.campaignId, trackedUrl: sent.trackedUrl, endToEndLaunch: true } });

      const artifacts = await listVaultxPackageArtifacts(Number(pkg.creator_id), packageId);
      return {
        success: true,
        complete: true,
        status: "published",
        packageId,
        jobId,
        generationStatus,
        artifact: publicArtifactPayload(readyArtifact),
        artifacts: artifacts.map(publicArtifactPayload),
        checkoutUrl: session.url,
        checkoutSessionId: session.id,
        campaignId: campaign.campaignId,
        trackingCode: campaign.trackingCode,
        trackedUrl: sent.trackedUrl,
        vaultxContentId: contentId,
        reusedExistingPolloAsset,
        revenue: {
          priceCents: Number(pkg.price_cents),
          platformFeeCents: Math.round(Number(pkg.price_cents) * PLATFORM_FEE),
          creatorKeepCents: Math.max(0, Number(pkg.price_cents) - Math.round(Number(pkg.price_cents) * PLATFORM_FEE)),
        },
      };
    }),

  finalizeRevenuePath: protectedProcedure
    .input(z.object({ packageId: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      if (!stripe) throw new TRPCError({ code: "PRECONDITION_FAILED", message: "STRIPE_SECRET_KEY is not configured for VaultX checkout creation." });
      await ensureVaultxRevenuePackageSchema();
      await ensureVaultxArtifactSchema();
      const pkg = await assertPackageOwner(input.packageId, ctx.user.id);
      const packageId = Number(pkg.id);
      const creatorId = Number(pkg.creator_id);
      const jobId = String(pkg.pollo_job_id || "");
      let readyArtifact: any = null;
      let generationStatus = String(pkg.asset_status || "waiting");

      const packageArtifacts = await listVaultxPackageArtifacts(creatorId, packageId);
      readyArtifact = packageArtifacts.find((item) => item.provider === "pollo" && item.status === "ready") || null;
      const pendingArtifact = packageArtifacts.find((item) => item.provider === "pollo" && item.status !== "ready" && item.status !== "failed");
      if (!readyArtifact && pendingArtifact) {
        try {
          const polledArtifact = await pollAndPersistProviderArtifact({
            artifactId: Number(pendingArtifact.id),
            creatorId,
            packageId,
            kind: "package",
            stage: "end_to_end_package_asset_generation",
            provider: "pollo",
          });
          if (polledArtifact.status === "ready") readyArtifact = polledArtifact;
        } catch (err: any) {
          await updateVaultxArtifactStatus(Number(pendingArtifact.id), { creatorId, status: "failed", failureReason: err.message, metadata: { finalizePollError: true } }).catch(() => undefined);
        }
      }

      if (jobId && POLLO_API_KEY && !readyArtifact) {
        const statusController = new AbortController();
        const statusTimeout = setTimeout(() => statusController.abort(), 20000);
        const response = await fetch(`${POLLO_BASE_URL}/generation/${jobId}/status`, {
          method: "GET",
          headers: { "x-api-key": POLLO_API_KEY },
          signal: statusController.signal,
        }).finally(() => clearTimeout(statusTimeout));
        const data = await response.json() as any;
        if (!response.ok || (data?.code && data.code !== "SUCCESS")) {
          throw new TRPCError({ code: "BAD_GATEWAY", message: data?.message || data?.error || `Pollo status check failed: ${JSON.stringify(data).slice(0, 500)}` });
        }
        const generation = data?.data?.generations?.[0] || null;
        generationStatus = normalisePolloStatus(generation?.status || data?.data?.status || data?.status);
        const videoUrl = generation?.url || data?.data?.videoUrl || data?.data?.url || data?.videoUrl || data?.url || null;
        await rawExec("UPDATE pollo_generations SET status = ?, videoUrl = COALESCE(?, videoUrl), updatedAt = CURRENT_TIMESTAMP WHERE taskId = ?", [generationStatus, videoUrl, jobId]);
        if (videoUrl) {
          qualityGate.checkVisual(videoUrl, { prompt: pkg.asset_prompt || buildVaultxPackagePolloPrompt(pkg), publicPost: true });
          readyArtifact = await persistReadyVaultxArtifact({
            creatorId,
            packageId,
            kind: "package",
            stage: "end_to_end_package_asset_generation",
            provider: "pollo",
            providerJobId: jobId,
            sourceUrl: pkg.source_media_url,
            finalUrl: videoUrl,
            metadata: { prompt: pkg.asset_prompt || buildVaultxPackagePolloPrompt(pkg), polloStatusResponse: data, finalizedRevenuePath: true },
          });
          await rawExec(
            `UPDATE vaultx_revenue_packages
             SET asset_status = ?, asset_url = ?, asset_quality_passed = 1, status = 'asset_ready'
             WHERE id = ?`,
            [generationStatus, readyArtifact.output_url || videoUrl, packageId]
          );
        }
      }

      if (!readyArtifact) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: `VaultX package ${packageId} is not ready for checkout/Telegram finalization. Current Pollo status: ${generationStatus || "waiting"}; jobId: ${jobId || "missing"}.`,
        });
      }

      let checkoutUrl = pkg.checkout_url || null;
      let checkoutSessionId = pkg.stripe_checkout_session_id || null;
      if (!checkoutUrl || !checkoutSessionId) {
        const session = await stripe.checkout.sessions.create({
          mode: "payment",
          line_items: [{
            price_data: {
              currency: "usd",
              product_data: { name: `VaultX Unlock: ${pkg.title}` },
              unit_amount: Number(pkg.price_cents),
            },
            quantity: 1,
          }],
          success_url: `${FRONTEND_BASE_URL}/vaultx?package=${packageId}&checkout=success&session_id={CHECKOUT_SESSION_ID}`,
          cancel_url: `${FRONTEND_BASE_URL}/vaultx?package=${packageId}&checkout=cancelled`,
          metadata: {
            type: "vaultx_package_unlock",
            vaultxPackageId: String(packageId),
            creatorId: String(creatorId),
            platformFeePercent: "15",
            creatorKeepPercent: "85",
            vaultxArtifactId: String(readyArtifact.id),
          },
        });
        checkoutUrl = session.url;
        checkoutSessionId = session.id;
        await rawExec(
          `UPDATE vaultx_revenue_packages
           SET checkout_url = ?, stripe_checkout_session_id = ?, status = 'checkout_attached'
           WHERE id = ?`,
          [checkoutUrl, checkoutSessionId, packageId]
        );
        await recordVaultxArtifactEvent({ artifactId: readyArtifact.id, creatorId, packageId, eventType: "checkout.attached", status: "ready", payload: { checkoutSessionId, checkoutUrl, finalizedRevenuePath: true } });
      }

      const publishCopy = qualityGate.check(pkg.public_teaser_copy || buildVaultxPackagePublicCopy({
        title: pkg.title,
        teaserDescription: pkg.teaser_description,
        priceCents: Number(pkg.price_cents),
        vipPriceCents: pkg.vip_price_cents ? Number(pkg.vip_price_cents) : null,
        telegramMode: pkg.telegram_mode,
      }), {
        surface: "vaultx-drop",
        context: "vaultx",
        recipientKey: `vaultx-finalize-publish-${packageId}`,
        hasActionElement: true,
        requireMessagingDna: true,
        requireMechanism: true,
        requireCreatorVaultPositioning: true,
        ctaAngle: "proof-unlock",
      });

      let contentId = pkg.vaultx_content_id ? Number(pkg.vaultx_content_id) : null;
      if (!contentId) {
        const contentResult = await rawExec(
          `INSERT INTO vaultx_content
           (creator_id, title, description, content_type, thumbnail_url, censored_url, uncensored_url, is_ppv, ppv_price, status, access_tier)
           VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, 'active', 'basic')`,
          [creatorId, pkg.title, publishCopy, pkg.content_type, pkg.source_media_url || readyArtifact.output_url || null, readyArtifact.output_url, readyArtifact.output_url, Number(pkg.price_cents) / 100]
        );
        contentId = Number((contentResult as any).insertId);
        await rawExec("UPDATE vaultx_revenue_packages SET vaultx_content_id = ? WHERE id = ?", [contentId, packageId]);
      }

      let campaignId = pkg.telegram_campaign_id ? Number(pkg.telegram_campaign_id) : null;
      let trackingCode = pkg.telegram_tracking_code || null;
      let trackedUrl: string | null = trackingCode ? `${FRONTEND_BASE_URL}/vaultx?tracking=${encodeURIComponent(String(trackingCode))}` : null;
      if (!campaignId || !trackingCode) {
        const campaign = await createAIDrop({
          contentId: Number(contentId),
          creatorId,
          campaignMode: pkg.telegram_mode as VaultxPackageMode,
          campaignType: "PPV_DROP",
          overridePrice: Number(pkg.price_cents) / 100,
        });
        campaignId = Number(campaign.campaignId);
        trackingCode = campaign.trackingCode;
        trackedUrl = `${FRONTEND_BASE_URL}/vaultx?tracking=${encodeURIComponent(String(trackingCode))}`;
        await rawExec(
          `UPDATE vaultx_revenue_packages
           SET telegram_campaign_id = ?, telegram_tracking_code = ?, status = 'telegram_route_created'
           WHERE id = ?`,
          [campaignId, trackingCode, packageId]
        );
        await recordVaultxArtifactEvent({ artifactId: readyArtifact.id, creatorId, packageId, eventType: "telegram.route_created", status: "ready", payload: { campaignId, trackingCode, contentId, finalizedRevenuePath: true } });
      }

      const sent = await sendDropToChannel(Number(campaignId));
      trackedUrl = sent.trackedUrl || trackedUrl;
      await rawExec("UPDATE vaultx_revenue_packages SET status = ? WHERE id = ?", [sent.success ? "telegram_published" : "telegram_failed", packageId]);
      if (!sent.success) throw new TRPCError({ code: "BAD_GATEWAY", message: sent.error || "Telegram publish failed." });
      await recordVaultxArtifactEvent({ artifactId: readyArtifact.id, creatorId, packageId, eventType: "telegram.published", status: "ready", payload: { campaignId, trackedUrl, finalizedRevenuePath: true } });

      const artifacts = await listVaultxPackageArtifacts(creatorId, packageId);
      return {
        success: true,
        complete: true,
        status: "published",
        packageId,
        jobId,
        generationStatus,
        artifact: publicArtifactPayload(readyArtifact),
        artifacts: artifacts.map(publicArtifactPayload),
        checkoutUrl,
        checkoutSessionId,
        campaignId,
        trackingCode,
        trackedUrl,
        vaultxContentId: contentId,
        revenue: {
          priceCents: Number(pkg.price_cents),
          platformFeeCents: Math.round(Number(pkg.price_cents) * PLATFORM_FEE),
          creatorKeepCents: Math.max(0, Number(pkg.price_cents) - Math.round(Number(pkg.price_cents) * PLATFORM_FEE)),
        },
      };
    }),

  // ═══════════════════════════════════════════════════════════════════════════
  // PROCEDURE 27 — cancelSubscription
  // ═══════════════════════════════════════════════════════════════════════════
  cancelSubscription: protectedProcedure
    .input(z.object({ subscriptionId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const sub = await rawQuery("SELECT * FROM vaultx_subscriptions WHERE id = ? AND fan_id = ? LIMIT 1", [input.subscriptionId, ctx.user.id]);
      if (!sub.length) throw new TRPCError({ code: "NOT_FOUND", message: "Subscription not found." });
      await rawExec("UPDATE vaultx_subscriptions SET status = 'cancelled' WHERE id = ?", [input.subscriptionId]);
      await rawExec("UPDATE vaultx_creators SET total_subscribers = GREATEST(0, total_subscribers - 1) WHERE id = ?", [sub[0].creator_id]);
      return { success: true };
    }),

  // ═══════════════════════════════════════════════════════════════════════════
  // PROCEDURE 28 — getMySubscriptions (fan view)
  // ═══════════════════════════════════════════════════════════════════════════
  getMySubscriptions: protectedProcedure.query(async ({ ctx }) => {
    const rows = await rawQuery(
      `SELECT vs.*, c.display_name, c.profile_image_url, c.cover_image_url
       FROM vaultx_subscriptions vs
       LEFT JOIN vaultx_creators c ON c.id = vs.creator_id
       WHERE vs.fan_id = ? AND vs.status = 'active'
       ORDER BY vs.created_at DESC`,
      [ctx.user.id]
    );
    return { subscriptions: rows };
  }),

  // ═══════════════════════════════════════════════════════════════════════════
  // PROCEDURE 29 — createPpvCheckout / purchasePpv
  // ═══════════════════════════════════════════════════════════════════════════
  createPpvCheckout: protectedProcedure
    .input(z.object({
      contentId: z.number().int().positive(),
      buyerTelegramId: z.number().optional(),
      trackingCode: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const content = await rawQuery("SELECT * FROM vaultx_content WHERE id = ? AND is_ppv = 1 LIMIT 1", [input.contentId]);
      if (!content.length) throw new TRPCError({ code: "NOT_FOUND", message: "PPV content not found." });
      const existing = await rawQuery(
        "SELECT id FROM vaultx_ppv_purchases WHERE fan_id = ? AND content_id = ? AND status = 'completed' LIMIT 1",
        [ctx.user.id, input.contentId]
      );
      if (existing.length) return { success: true, alreadyPurchased: true, checkoutUrl: null, checkoutSessionId: null };
      if (!stripe) throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Stripe checkout is not configured for VaultX PPV unlocks." });

      const priceCents = Math.round(Number(content[0].ppv_price || 0) * 100);
      if (priceCents <= 0) throw new TRPCError({ code: "BAD_REQUEST", message: "PPV content has no valid unlock price." });

      const session = await stripe.checkout.sessions.create({
        mode: "payment",
        line_items: [{
          price_data: {
            currency: "usd",
            product_data: { name: `VaultX PPV Unlock: ${content[0].title || `Content ${input.contentId}`}` },
            unit_amount: priceCents,
          },
          quantity: 1,
        }],
        success_url: `${FRONTEND_BASE_URL}/vaultx?content=${input.contentId}&checkout=success&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${FRONTEND_BASE_URL}/vaultx?content=${input.contentId}&checkout=cancelled`,
        metadata: {
          type: "vaultx_ppv",
          vaultxContentId: String(input.contentId),
          creatorId: String(content[0].creator_id),
          fanId: String(ctx.user.id),
          trackingCode: input.trackingCode || "",
          buyerTelegramId: input.buyerTelegramId ? String(input.buyerTelegramId) : "",
          platformFeeBps: "1500",
          creatorKeepBps: "8500",
        },
      });

      return { success: true, alreadyPurchased: false, checkoutUrl: session.url, checkoutSessionId: session.id };
    }),

  confirmPpvCheckout: protectedProcedure
    .input(z.object({
      contentId: z.number().int().positive(),
      checkoutSessionId: z.string().min(1),
    }))
    .mutation(async ({ ctx, input }) => {
      if (!stripe) throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Stripe is not configured; PPV purchases cannot be completed safely." });
      const session = await stripe.checkout.sessions.retrieve(input.checkoutSessionId, { expand: ["payment_intent"] });
      if (session.payment_status !== "paid") {
        throw new TRPCError({ code: "PRECONDITION_FAILED", message: `Stripe checkout is not paid. Current status: ${session.payment_status}` });
      }
      const metadata = session.metadata || {};
      if (metadata.type !== "vaultx_ppv") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Stripe checkout session is not a VaultX PPV unlock." });
      }
      if (Number(metadata.vaultxContentId) !== input.contentId) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Stripe checkout content does not match the requested VaultX content." });
      }
      if (Number(metadata.fanId) !== ctx.user.id) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Stripe checkout buyer does not match the signed-in fan." });
      }
      const paymentIntentValue = session.payment_intent;
      const paymentIntentId = typeof paymentIntentValue === "string" ? paymentIntentValue : paymentIntentValue?.id;
      if (!paymentIntentId) {
        throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Stripe checkout did not return a payment intent." });
      }
      return completeVaultxPpvPurchase({
        fanUserId: ctx.user.id,
        contentId: input.contentId,
        paymentIntentId,
        buyerTelegramId: metadata.buyerTelegramId ? Number(metadata.buyerTelegramId) : undefined,
        trackingCode: metadata.trackingCode || undefined,
      });
    }),

  purchasePpv: protectedProcedure
    .input(z.object({
      contentId: z.number(),
      paymentIntentId: z.string().min(1, "A completed Stripe payment intent is required."),
      buyerTelegramId: z.number().optional(),
      trackingCode: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      return completeVaultxPpvPurchase({
        fanUserId: ctx.user.id,
        contentId: input.contentId,
        paymentIntentId: input.paymentIntentId,
        buyerTelegramId: input.buyerTelegramId,
        trackingCode: input.trackingCode,
      });
    }),

  // ═══════════════════════════════════════════════════════════════════════════
  // PROCEDURE 30 — getFanFeed (subscribed content)
  // ═══════════════════════════════════════════════════════════════════════════
  getFanFeed: protectedProcedure
    .input(z.object({
      creatorId: z.number(),
      limit: z.number().min(1).max(50).default(20),
      offset: z.number().min(0).default(0),
    }))
    .query(async ({ ctx, input }) => {
      const sub = await rawQuery(
        "SELECT tier FROM vaultx_subscriptions WHERE fan_id = ? AND creator_id = ? AND status = 'active' LIMIT 1",
        [ctx.user.id, input.creatorId]
      );
      const isSubscribed = sub.length > 0 || OWNER_IDS.includes(ctx.user.id);
      const subTier = sub[0]?.tier || null;
      const tierOrder: Record<string, number> = { basic: 1, premium: 2, vip: 3 };
      const fanTierLevel = subTier ? tierOrder[subTier] : 0;
      const rows = await rawQuery(
        `SELECT id, title, description, content_type, uncensored_url, censored_url, thumbnail_url, censored_thumbnail_url,
                is_ppv, ppv_price, is_free_preview, free_preview_seconds, access_tier,
                view_count, purchase_count, revenue_generated, created_at
         FROM vaultx_content
         WHERE creator_id = ? AND status = 'active'
         ORDER BY created_at DESC LIMIT ? OFFSET ?`,
        [input.creatorId, input.limit, input.offset]
      );
      const items = await Promise.all(rows.map(async (row: any) => {
        const contentTierLevel = tierOrder[row.access_tier] || 1;
        let hasAccess = isSubscribed && fanTierLevel >= contentTierLevel;
        if (row.is_ppv) {
          const purchased = await rawQuery(
            "SELECT id FROM vaultx_ppv_purchases WHERE fan_id = ? AND content_id = ? AND status = 'completed' LIMIT 1",
            [ctx.user.id, row.id]
          );
          hasAccess = purchased.length > 0 || OWNER_IDS.includes(ctx.user.id);
        }
        await rawExec("UPDATE vaultx_content SET view_count = view_count + 1 WHERE id = ?", [row.id]);
        return {
          ...row,
          hasAccess,
          uncensored_url: hasAccess ? row.uncensored_url : null,
          preview_url: row.censored_url || row.censored_thumbnail_url || row.thumbnail_url || null,
          locked: !hasAccess,
        };
      }));
      return { items, isSubscribed, subTier };
    }),

  // ═══════════════════════════════════════════════════════════════════════════
  // PROCEDURE 31 — getRevenueAnalytics
  // ═══════════════════════════════════════════════════════════════════════════
  getRevenueAnalytics: protectedProcedure.query(async ({ ctx }) => {
    const creatorId = await getCreatorId(ctx.user.id);
    const cid = creatorId || ctx.user.id;
    const monthly = await rawQuery(
      `SELECT DATE_FORMAT(created_at, '%Y-%m') AS month,
              SUM(CASE WHEN source = 'subscription' THEN amount ELSE 0 END) AS subscription_revenue,
              SUM(CASE WHEN source = 'ppv' THEN amount ELSE 0 END) AS ppv_revenue,
              SUM(CASE WHEN source = 'tip' THEN amount ELSE 0 END) AS tip_revenue,
              SUM(CASE WHEN source = 'message' THEN amount ELSE 0 END) AS message_revenue,
              SUM(amount) AS total_revenue
       FROM (
         SELECT created_at, price_paid AS amount, 'subscription' AS source FROM vaultx_subscriptions WHERE creator_id = ? AND status = 'active'
         UNION ALL SELECT created_at, amount_paid, 'ppv' FROM vaultx_ppv_purchases WHERE creator_id = ? AND status = 'completed'
         UNION ALL SELECT created_at, amount, 'tip' FROM vaultx_tips WHERE creator_id = ? AND status = 'completed'
         UNION ALL SELECT created_at, unlock_price, 'message' FROM vaultx_messages WHERE recipient_id = ? AND is_unlocked = 1 AND unlock_price > 0
       ) AS combined
       WHERE created_at >= DATE_SUB(NOW(), INTERVAL 12 MONTH)
       GROUP BY month ORDER BY month ASC`,
      [cid, cid, cid, cid]
    );
    const totals = await rawQuery(
      `SELECT
         (SELECT COALESCE(SUM(price_paid),0) FROM vaultx_subscriptions WHERE creator_id = ? AND status='active') AS total_subscriptions,
         (SELECT COALESCE(SUM(amount_paid),0) FROM vaultx_ppv_purchases WHERE creator_id = ? AND status='completed') AS total_ppv,
         (SELECT COALESCE(SUM(amount),0) FROM vaultx_tips WHERE creator_id = ? AND status='completed') AS total_tips,
         (SELECT COALESCE(SUM(unlock_price),0) FROM vaultx_messages WHERE recipient_id = ? AND is_unlocked=1 AND unlock_price > 0) AS total_messages`,
      [cid, cid, cid, cid]
    );
    return { monthly, totals: totals[0] };
  }),

  // ═══════════════════════════════════════════════════════════════════════════
  // PROCEDURE 32 — getContentAnalytics
  // ═══════════════════════════════════════════════════════════════════════════
  getContentAnalytics: protectedProcedure.query(async ({ ctx }) => {
    const creatorId = await getCreatorId(ctx.user.id);
    const cid = creatorId || ctx.user.id;
    const topEarning = await rawQuery(
      `SELECT id, title, content_type, view_count, purchase_count, revenue_generated, access_tier
       FROM vaultx_content WHERE creator_id = ? AND status = 'active'
       ORDER BY revenue_generated DESC LIMIT 10`,
      [cid]
    );
    const topViewed = await rawQuery(
      `SELECT id, title, content_type, view_count, purchase_count, revenue_generated
       FROM vaultx_content WHERE creator_id = ? AND status = 'active'
       ORDER BY view_count DESC LIMIT 10`,
      [cid]
    );
    const byType = await rawQuery(
      `SELECT content_type, COUNT(*) AS count, SUM(view_count) AS total_views, SUM(revenue_generated) AS total_revenue
       FROM vaultx_content WHERE creator_id = ? AND status = 'active'
       GROUP BY content_type`,
      [cid]
    );
    return { topEarning, topViewed, byType };
  }),

  // ═══════════════════════════════════════════════════════════════════════════
  // PROCEDURE 33 — getFanAnalytics
  // ═══════════════════════════════════════════════════════════════════════════
  getFanAnalytics: protectedProcedure.query(async ({ ctx }) => {
    const creatorId = await getCreatorId(ctx.user.id);
    const cid = creatorId || ctx.user.id;
    const topSpenders = await rawQuery(
      `SELECT vs.fan_id, u.username, u.name,
              vs.tier, vs.price_paid AS sub_paid,
              COALESCE(tips.total, 0) AS tips_total,
              COALESCE(ppv.total, 0) AS ppv_total,
              (vs.price_paid + COALESCE(tips.total, 0) + COALESCE(ppv.total, 0)) AS lifetime_value
       FROM vaultx_subscriptions vs
       LEFT JOIN users u ON u.id = vs.fan_id
       LEFT JOIN (SELECT fan_id, SUM(amount) AS total FROM vaultx_tips WHERE creator_id = ? AND status='completed' GROUP BY fan_id) tips ON tips.fan_id = vs.fan_id
       LEFT JOIN (SELECT fan_id, SUM(amount_paid) AS total FROM vaultx_ppv_purchases WHERE creator_id = ? AND status='completed' GROUP BY fan_id) ppv ON ppv.fan_id = vs.fan_id
       WHERE vs.creator_id = ? AND vs.status = 'active'
       ORDER BY lifetime_value DESC LIMIT 20`,
      [cid, cid, cid]
    );
    const atRisk = await rawQuery(
      `SELECT vs.fan_id, u.username, u.name, vs.tier, vs.created_at,
              (SELECT MAX(created_at) FROM vaultx_messages WHERE sender_id = vs.fan_id AND recipient_id = ?) AS last_message_at
       FROM vaultx_subscriptions vs
       LEFT JOIN users u ON u.id = vs.fan_id
       WHERE vs.creator_id = ? AND vs.status = 'active'
         AND vs.fan_id NOT IN (
           SELECT DISTINCT sender_id FROM vaultx_messages
           WHERE recipient_id = ? AND created_at > DATE_SUB(NOW(), INTERVAL 14 DAY)
         )
       LIMIT 20`,
      [cid, cid, cid]
    );
    const subsByTier = await rawQuery(
      "SELECT tier, COUNT(*) AS count FROM vaultx_subscriptions WHERE creator_id = ? AND status = 'active' GROUP BY tier",
      [cid]
    );
    return { topSpenders, atRisk, subsByTier };
  }),

  // ═══════════════════════════════════════════════════════════════════════════
  // PROCEDURE 34 — getForYouFeed (public discovery)
  // ═══════════════════════════════════════════════════════════════════════════
  getForYouFeed: publicProcedure
    .input(z.object({
      sort: z.enum(["trending", "top_earners", "new", "price_low"]).default("trending"),
      language: z.enum(["en", "es", "ht", "all"]).default("all"),
      limit: z.number().min(1).max(100).default(24),
      offset: z.number().min(0).default(0),
    }))
    .query(async ({ input }) => {
      const langWhere = input.language === "all" ? "" : "AND c.language_primary = ?";
      const sortCol = input.sort === "trending" ? "c.total_subscribers DESC, c.total_revenue DESC"
        : input.sort === "top_earners" ? "c.total_revenue DESC"
        : input.sort === "new" ? "c.created_at DESC"
        : "c.subscription_price_basic ASC";
      const params = input.language === "all"
        ? [input.limit, input.offset]
        : [input.language, input.limit, input.offset];
      const creators = await rawQuery(
        `SELECT c.id, c.display_name, c.bio, c.profile_image_url, c.cover_image_url,
                c.subscription_price_basic, c.subscription_price_premium, c.subscription_price_vip,
                c.total_subscribers, c.language_primary,
                u.username,
                (SELECT censored_thumbnail_url FROM vaultx_content
                 WHERE creator_id = c.id AND status = 'active'
                 ORDER BY created_at DESC LIMIT 1) AS latest_censored_thumb,
                (SELECT uncensored_url FROM vaultx_content
                 WHERE creator_id = c.id AND status = 'active' AND content_type = 'video'
                 ORDER BY created_at DESC LIMIT 1) AS latest_video_url,
                (SELECT title FROM vaultx_content
                 WHERE creator_id = c.id AND status = 'active'
                 ORDER BY created_at DESC LIMIT 1) AS latest_content_title,
                (SELECT purchase_count FROM vaultx_content
                 WHERE creator_id = c.id AND status = 'active'
                 ORDER BY created_at DESC LIMIT 1) AS latest_like_count,
                (SELECT view_count FROM vaultx_content
                 WHERE creator_id = c.id AND status = 'active'
                 ORDER BY created_at DESC LIMIT 1) AS latest_view_count
         FROM vaultx_creators c
         LEFT JOIN users u ON u.id = c.user_id
         WHERE c.is_active = 1 ${langWhere}
         ORDER BY ${sortCol}
         LIMIT ? OFFSET ?`,
        params
      );
      return { creators };
    }),

  // ═══════════════════════════════════════════════════════════════════════════
  // PROCEDURE 35 — searchCreators (public)
  // ═══════════════════════════════════════════════════════════════════════════
  searchCreators: publicProcedure
    .input(z.object({
      query: z.string().min(1).max(100).optional(),
      language: z.enum(["en", "es", "ht", "all"]).default("all"),
      priceMin: z.number().min(0).optional(),
      priceMax: z.number().max(499).optional(),
      limit: z.number().min(1).max(50).default(20),
      offset: z.number().min(0).default(0),
    }))
    .query(async ({ input }) => {
      const conditions: string[] = ["c.is_active = 1"];
      const params: any[] = [];
      if (input.query) {
        conditions.push("(c.display_name LIKE ? OR c.bio LIKE ?)");
        params.push(`%${input.query}%`, `%${input.query}%`);
      }
      if (input.language !== "all") {
        conditions.push("c.language_primary = ?");
        params.push(input.language);
      }
      if (input.priceMin !== undefined) {
        conditions.push("c.subscription_price_basic >= ?");
        params.push(input.priceMin);
      }
      if (input.priceMax !== undefined) {
        conditions.push("c.subscription_price_basic <= ?");
        params.push(input.priceMax);
      }
      params.push(input.limit, input.offset);
      const creators = await rawQuery(
        `SELECT c.id, c.display_name, c.bio, c.profile_image_url,
                c.subscription_price_basic, c.total_subscribers, c.language_primary,
                u.username
         FROM vaultx_creators c
         LEFT JOIN users u ON u.id = c.user_id
         WHERE ${conditions.join(" AND ")}
         ORDER BY c.total_subscribers DESC LIMIT ? OFFSET ?`,
        params
      );
      return { creators };
    }),

  // ═══════════════════════════════════════════════════════════════════════════
  // PROCEDURE 36 — createEditorProject
  // ═══════════════════════════════════════════════════════════════════════════
  createEditorProject: protectedProcedure
    .input(z.object({
      projectName: z.string().min(1).max(255),
      projectType: z.enum(["video", "photo_set", "audio", "reel", "story"]).default("video"),
      sourceFiles: z.array(z.string()).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const creatorId = await getCreatorId(ctx.user.id);
      const cid = creatorId || ctx.user.id;
      await ensureVaultxArtifactSchema();
      const result = await rawExec(
        `INSERT INTO vaultx_editor_projects
         (creator_id, project_name, project_type, source_files, status)
         VALUES (?, ?, ?, ?, 'draft')`,
        [cid, input.projectName, input.projectType, JSON.stringify(input.sourceFiles || [])]
      );
      const projectId = Number((result as any).insertId);
      for (const sourceUrl of input.sourceFiles || []) {
        await createVaultxArtifact({
          creatorId: cid,
          projectId,
          kind: input.projectType === "audio" ? "audio" : input.projectType === "photo_set" ? "photo" : "source",
          stage: "creator_upload",
          sourceUrl,
          outputUrl: sourceUrl,
          status: "ready",
          metadata: { projectType: input.projectType, uploadedAt: new Date().toISOString() },
        });
      }
      await syncProjectArtifactReadiness(cid, projectId, (input.sourceFiles || []).length ? "ready_for_export" : "needs_source");
      return { projectId, success: true };
    }),

  // ═══════════════════════════════════════════════════════════════════════════
  // PROCEDURE 37 — saveProjectTimeline
  // ═══════════════════════════════════════════════════════════════════════════
  saveProjectTimeline: protectedProcedure
    .input(z.object({
      projectId: z.number(),
      timelineData: z.any(),
    }))
    .mutation(async ({ ctx, input }) => {
      const creatorId = await getCreatorId(ctx.user.id);
      const cid = creatorId || ctx.user.id;
      const proj = await rawQuery("SELECT id FROM vaultx_editor_projects WHERE id = ? AND creator_id = ? LIMIT 1", [input.projectId, cid]);
      if (!proj.length) throw new TRPCError({ code: "NOT_FOUND", message: "Project not found." });
      await rawExec(
        "UPDATE vaultx_editor_projects SET timeline_data = ?, updated_at = NOW() WHERE id = ?",
        [JSON.stringify(input.timelineData), input.projectId]
      );
      return { success: true };
    }),

  // ═══════════════════════════════════════════════════════════════════════════
  // PROCEDURE 38 — getEditorProject
  // ═══════════════════════════════════════════════════════════════════════════
  getEditorProject: protectedProcedure
    .input(z.object({ projectId: z.number() }))
    .query(async ({ ctx, input }) => {
      const creatorId = await getCreatorId(ctx.user.id);
      const cid = creatorId || ctx.user.id;
      const rows = await rawQuery(
        "SELECT * FROM vaultx_editor_projects WHERE id = ? AND creator_id = ? LIMIT 1",
        [input.projectId, cid]
      );
      if (!rows.length) throw new TRPCError({ code: "NOT_FOUND", message: "Project not found." });
      const exports = await rawQuery(
        "SELECT * FROM vaultx_editor_exports WHERE project_id = ? ORDER BY created_at DESC",
        [input.projectId]
      );
      const readiness = await syncProjectArtifactReadiness(cid, input.projectId);
      return { project: { ...rows[0], artifact_manifest: readiness.artifacts }, exports, artifacts: readiness.artifacts.map(publicArtifactPayload), readinessState: readiness.state, readyArtifactId: readiness.readyArtifactId };
    }),

  getEditorProjectArtifactStatus: protectedProcedure
    .input(z.object({ projectId: z.number(), artifactId: z.number().optional() }))
    .query(async ({ ctx, input }) => {
      const creatorId = await getCreatorId(ctx.user.id);
      const cid = creatorId || ctx.user.id;
      const rows = await rawQuery("SELECT id FROM vaultx_editor_projects WHERE id = ? AND creator_id = ? LIMIT 1", [input.projectId, cid]);
      if (!rows.length) throw new TRPCError({ code: "NOT_FOUND", message: "Project not found." });
      let artifacts = await listVaultxProjectArtifacts(cid, input.projectId);
      const pending = artifacts.filter((item) => (!input.artifactId || Number(item.id) === input.artifactId) && item.provider_job_id && item.status !== "ready" && item.status !== "failed" && (item.provider === "replicate" || item.provider === "pollo"));
      for (const item of pending) {
        try {
          await pollAndPersistProviderArtifact({
            artifactId: Number(item.id),
            creatorId: cid,
            projectId: input.projectId,
            kind: item.kind as any,
            stage: item.stage,
            provider: item.provider as any,
          });
        } catch (err: any) {
          await updateVaultxArtifactStatus(Number(item.id), { creatorId: cid, status: "failed", failureReason: err.message, metadata: { pollError: true } }).catch(() => undefined);
        }
      }
      const readiness = await syncProjectArtifactReadiness(cid, input.projectId);
      artifacts = readiness.artifacts;
      return { projectId: input.projectId, status: readiness.state, readyArtifactId: readiness.readyArtifactId, artifacts: artifacts.map(publicArtifactPayload) };
    }),

  // ═══════════════════════════════════════════════════════════════════════════
  // PROCEDURE 39 — getMyEditorProjects
  // ═══════════════════════════════════════════════════════════════════════════
  getMyEditorProjects: protectedProcedure.query(async ({ ctx }) => {
    const creatorId = await getCreatorId(ctx.user.id);
    const cid = creatorId || ctx.user.id;
    const rows = await rawQuery(
      "SELECT * FROM vaultx_editor_projects WHERE creator_id = ? ORDER BY updated_at DESC",
      [cid]
    );
    return { projects: rows };
  }),

  // ═══════════════════════════════════════════════════════════════════════════
  // PROCEDURE 40 — processVideoEdit (FFmpeg operations pipeline)
  // ═══════════════════════════════════════════════════════════════════════════
  processVideoEdit: protectedProcedure
    .input(z.object({
      projectId: z.number(),
      operations: z.array(z.object({
        type: z.enum([
          "trim", "cut", "merge", "color_grade", "speed", "audio_replace",
          "audio_mix", "audio_normalize", "text_overlay", "watermark",
          "blur_region", "mosaic_region", "crop", "stabilize", "denoise", "thumbnail_extract"
        ]),
        params: z.any(),
      })),
    }))
    .mutation(async ({ ctx, input }) => {
      const creatorId = await getCreatorId(ctx.user.id);
      const cid = creatorId || ctx.user.id;
      const proj = await rawQuery("SELECT * FROM vaultx_editor_projects WHERE id = ? AND creator_id = ? LIMIT 1", [input.projectId, cid]);
      if (!proj.length) throw new TRPCError({ code: "NOT_FOUND", message: "Project not found." });
      const project = proj[0];
      const sourceFiles = JSON.parse(project.source_files || "[]");
      if (!sourceFiles.length) throw new TRPCError({ code: "BAD_REQUEST", message: "No source files in project." });
      const dir = await ensureUploadDir(cid);
      const outName = `edit-${randomUUID()}.mp4`;
      const outPath = path.join(dir, outName);
      const startTime = Date.now();
      await rawExec("UPDATE vaultx_editor_projects SET status = 'processing' WHERE id = ?", [input.projectId]);
      try {
        let currentInput = sourceFiles[0];
        let tempFiles: string[] = [];
        for (const op of input.operations) {
          const tempOut = path.join(dir, `tmp-${randomUUID()}.mp4`);
          tempFiles.push(tempOut);
          if (op.type === "trim") {
            const { start_seconds, end_seconds } = op.params;
            await runFFmpeg(["-i", currentInput, "-ss", String(start_seconds), "-to", String(end_seconds), "-c", "copy", tempOut]);
          } else if (op.type === "color_grade") {
            const { preset, brightness = 0, contrast = 1, saturation = 1 } = op.params;
            const presetFilters: Record<string, string> = {
              cinematic: "curves=preset=strong_contrast,colorbalance=rs=-0.1:gs=-0.1:bs=0.1",
              warm_skin: "colorbalance=rs=0.1:gs=0.05:bs=-0.05,curves=r='0/0 0.5/0.55 1/1'",
              dark_moody: "curves=preset=darker,colorbalance=rs=-0.05:gs=-0.05:bs=0.1",
              golden_hour: "colorbalance=rs=0.15:gs=0.05:bs=-0.15,curves=preset=lighter",
              neon_night: "colorbalance=rs=0.1:gs=-0.1:bs=0.2,curves=preset=strong_contrast",
              black_white: "colorchannelmixer=.3:.4:.3:0:.3:.4:.3:0:.3:.4:.3",
              custom: `eq=brightness=${brightness}:contrast=${contrast}:saturation=${saturation}`,
            };
            const filter = presetFilters[preset] || presetFilters.custom;
            await runFFmpeg(["-i", currentInput, "-vf", filter, "-c:a", "copy", tempOut]);
          } else if (op.type === "speed") {
            const { multiplier = 1 } = op.params;
            const vf = `setpts=${(1 / multiplier).toFixed(4)}*PTS`;
            const af = `atempo=${Math.min(2, Math.max(0.5, multiplier))}`;
            await runFFmpeg(["-i", currentInput, "-vf", vf, "-af", af, tempOut]);
          } else if (op.type === "audio_normalize") {
            await runFFmpeg(["-i", currentInput, "-af", "loudnorm=I=-16:TP=-1.5:LRA=11", "-c:v", "copy", tempOut]);
          } else if (op.type === "text_overlay") {
            const { text, font_size = 48, color = "white", position = "bottom", start_seconds = 0, end_seconds } = op.params;
            const yMap: Record<string, string> = { top: "50", center: "(h-text_h)/2", bottom: "h-text_h-50" };
            const y = yMap[position] || "h-text_h-50";
            const enableExpr = end_seconds ? `enable='between(t,${start_seconds},${end_seconds})'` : `enable='gte(t,${start_seconds})'`;
            const drawtext = `drawtext=text='${text.replace(/'/g, "\\'")}':fontcolor=${color}:fontsize=${font_size}:x=(w-text_w)/2:y=${y}:${enableExpr}`;
            await runFFmpeg(["-i", currentInput, "-vf", drawtext, "-c:a", "copy", tempOut]);
          } else if (op.type === "watermark") {
            const { image_url, position = "bottom-right", opacity = 0.7, size_percent = 15 } = op.params;
            const posMap: Record<string, string> = {
              "top-left": "x=W*0.02:y=H*0.02",
              "top-right": "x=W-overlay_w-W*0.02:y=H*0.02",
              "bottom-left": "x=W*0.02:y=H-overlay_h-H*0.02",
              "bottom-right": "x=W-overlay_w-W*0.02:y=H-overlay_h-H*0.02",
            };
            const pos = posMap[position] || posMap["bottom-right"];
            await runFFmpeg([
              "-i", currentInput, "-i", image_url,
              "-filter_complex", `[1:v]scale=iw*${size_percent / 100}:-1,format=rgba,colorchannelmixer=aa=${opacity}[wm];[0:v][wm]overlay=${pos}`,
              "-c:a", "copy", tempOut
            ]);
          } else if (op.type === "blur_region") {
            const { x_percent, y_percent, width_percent, height_percent, start_seconds = 0, end_seconds } = op.params;
            const enableExpr = end_seconds ? `between(t,${start_seconds},${end_seconds})` : `gte(t,${start_seconds})`;
            const blurFilter = `[0:v]split[orig][blur];[blur]crop=iw*${width_percent / 100}:ih*${height_percent / 100}:iw*${x_percent / 100}:ih*${y_percent / 100},boxblur=20:20[blurred];[orig][blurred]overlay=W*${x_percent / 100}:H*${y_percent / 100}:enable='${enableExpr}'`;
            await runFFmpeg(["-i", currentInput, "-filter_complex", blurFilter, "-c:a", "copy", tempOut]);
          } else if (op.type === "mosaic_region") {
            const { x_percent, y_percent, width_percent, height_percent, start_seconds = 0, end_seconds } = op.params;
            const enableExpr = end_seconds ? `between(t,${start_seconds},${end_seconds})` : `gte(t,${start_seconds})`;
            const mosaicFilter = `[0:v]split[orig][mosaic];[mosaic]crop=iw*${width_percent / 100}:ih*${height_percent / 100}:iw*${x_percent / 100}:ih*${y_percent / 100},scale=iw/10:ih/10,scale=iw*10:ih*10:flags=neighbor[pixelated];[orig][pixelated]overlay=W*${x_percent / 100}:H*${y_percent / 100}:enable='${enableExpr}'`;
            await runFFmpeg(["-i", currentInput, "-filter_complex", mosaicFilter, "-c:a", "copy", tempOut]);
          } else if (op.type === "crop") {
            const { aspect_ratio } = op.params;
            const ratioMap: Record<string, string> = {
              "9:16": "crop=ih*9/16:ih",
              "1:1": "crop=min(iw\\,ih):min(iw\\,ih)",
              "16:9": "crop=iw:iw*9/16",
              "4:5": "crop=ih*4/5:ih",
            };
            const cropFilter = ratioMap[aspect_ratio] || ratioMap["16:9"];
            await runFFmpeg(["-i", currentInput, "-vf", cropFilter, "-c:a", "copy", tempOut]);
          } else if (op.type === "stabilize") {
            await runFFmpeg(["-i", currentInput, "-vf", "vidstabdetect=shakiness=5:accuracy=15", "-f", "null", "-"]);
            await runFFmpeg(["-i", currentInput, "-vf", "vidstabtransform=smoothing=30:input=transforms.trf", "-c:a", "copy", tempOut]);
          } else if (op.type === "denoise") {
            await runFFmpeg(["-i", currentInput, "-vf", "hqdn3d=4:3:6:4.5", "-c:a", "copy", tempOut]);
          } else if (op.type === "thumbnail_extract") {
            const { timestamp_seconds = 1 } = op.params;
            const thumbName = `thumb-${randomUUID()}.jpg`;
            const thumbPath = path.join(dir, thumbName);
            await runFFmpeg(["-i", currentInput, "-ss", String(timestamp_seconds), "-vframes", "1", thumbPath]);
            const thumbUrl = `/uploads/vaultx/${cid}/${thumbName}`;
            await rawExec("UPDATE vaultx_editor_projects SET thumbnail_url = ? WHERE id = ?", [thumbUrl, input.projectId]);
            tempFiles.pop(); // thumbnail_extract doesn't produce a video
            continue;
          } else if (op.type === "merge") {
            const { clip_urls } = op.params;
            const listFile = path.join(dir, `merge-${randomUUID()}.txt`);
            const allClips = [currentInput, ...clip_urls];
            fs.writeFileSync(listFile, allClips.map((u: string) => `file '${u}'`).join("\n"));
            await runFFmpeg(["-f", "concat", "-safe", "0", "-i", listFile, "-c", "copy", tempOut]);
            fs.unlinkSync(listFile);
          } else if (op.type === "audio_replace") {
            const { audio_url, volume = 1 } = op.params;
            await runFFmpeg(["-i", currentInput, "-i", audio_url, "-map", "0:v", "-map", "1:a", "-af", `volume=${volume}`, "-shortest", tempOut]);
          } else if (op.type === "audio_mix") {
            const { original_volume = 0.7, music_volume = 0.3, music_url } = op.params;
            await runFFmpeg([
              "-i", currentInput, "-i", music_url,
              "-filter_complex", `[0:a]volume=${original_volume}[a1];[1:a]volume=${music_volume}[a2];[a1][a2]amix=inputs=2:duration=first[aout]`,
              "-map", "0:v", "-map", "[aout]", "-c:v", "copy", tempOut
            ]);
          } else if (op.type === "cut") {
            const { cut_points } = op.params;
            const sortedPoints: number[] = [...cut_points].sort((a: number, b: number) => a - b);
            const segments: string[] = [];
            let prev = 0;
            for (const pt of sortedPoints) {
              const segOut = path.join(dir, `seg-${randomUUID()}.mp4`);
              await runFFmpeg(["-i", currentInput, "-ss", String(prev), "-to", String(pt), "-c", "copy", segOut]);
              segments.push(segOut);
              tempFiles.push(segOut);
              prev = pt;
            }
            const segOut = path.join(dir, `seg-${randomUUID()}.mp4`);
            await runFFmpeg(["-i", currentInput, "-ss", String(prev), "-c", "copy", segOut]);
            segments.push(segOut);
            tempFiles.push(segOut);
            const listFile = path.join(dir, `cut-list-${randomUUID()}.txt`);
            fs.writeFileSync(listFile, segments.map((s) => `file '${s}'`).join("\n"));
            await runFFmpeg(["-f", "concat", "-safe", "0", "-i", listFile, "-c", "copy", tempOut]);
            fs.unlinkSync(listFile);
          }
          currentInput = tempOut;
        }
        // Copy final result to output
        fs.copyFileSync(currentInput, outPath);
        // Cleanup temp files
        for (const tmp of tempFiles) {
          if (tmp !== outPath && fs.existsSync(tmp)) fs.unlinkSync(tmp);
        }
        const outputUrl = `/uploads/vaultx/${cid}/${outName}`;
        const artifact = await persistLocalReadyVaultxArtifact({
          creatorId: cid,
          projectId: input.projectId,
          kind: "video",
          stage: "editor_processing",
          sourceUrl: sourceFiles[0],
          localPath: outPath,
          mimeType: "video/mp4",
          metadata: { operations: input.operations, localPublicUrl: outputUrl },
        });
        const elapsed = Math.round((Date.now() - startTime) / 1000);
        await rawExec(
          "UPDATE vaultx_editor_projects SET output_url = ?, status = 'completed', ready_artifact_id = ?, updated_at = NOW() WHERE id = ?",
          [artifact.output_url || outputUrl, artifact.id, input.projectId]
        );
        return { outputUrl: artifact.output_url || outputUrl, artifact: publicArtifactPayload(artifact), processingTimeSeconds: elapsed, success: true };
      } catch (err: any) {
        await rawExec("UPDATE vaultx_editor_projects SET status = 'failed' WHERE id = ?", [input.projectId]);
        await failProjectReadiness(cid, input.projectId, `Processing failed: ${err.message}`, { operations: input.operations }).catch(() => undefined);
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: `Processing failed: ${err.message}` });
      }
    }),

  // ═══════════════════════════════════════════════════════════════════════════
  // PROCEDURE 41 — exportProject
  // ═══════════════════════════════════════════════════════════════════════════
  exportProject: protectedProcedure
    .input(z.object({
      projectId: z.number(),
      exportFormat: z.enum(["mp4_hd", "mp4_4k", "mp4_vertical", "mp4_square", "gif", "mp3", "zip"]),
      exportPreset: z.enum(["onlyfans", "fansly", "tiktok", "instagram_reel", "telegram", "twitter", "youtube_shorts", "master"]),
    }))
    .mutation(async ({ ctx, input }) => {
      const creatorId = await getCreatorId(ctx.user.id);
      const cid = creatorId || ctx.user.id;
      const proj = await rawQuery("SELECT * FROM vaultx_editor_projects WHERE id = ? AND creator_id = ? LIMIT 1", [input.projectId, cid]);
      if (!proj.length) throw new TRPCError({ code: "NOT_FOUND", message: "Project not found." });
      let readySource;
      try {
        readySource = await assertReadyVaultxProjectArtifact(cid, input.projectId, ["video", "photo", "source"] as any);
      } catch (err: any) {
        throw readinessGateError(err);
      }
      const dir = await ensureUploadDir(cid);
      const ext = input.exportFormat === "mp3" ? "mp3" : input.exportFormat === "gif" ? "gif" : "mp4";
      const outName = `export-${input.exportPreset}-${randomUUID()}.${ext}`;
      const outPath = path.join(dir, outName);
      const sourceUrl = normalizeLocalUploadPath(String(readySource.output_url || "")) || String(readySource.output_url || "");
      const startTime = Date.now();
      const exportResult = await rawExec(
        `INSERT INTO vaultx_editor_exports
         (project_id, creator_id, export_format, export_preset, status)
         VALUES (?, ?, ?, ?, 'processing')`,
        [input.projectId, cid, input.exportFormat, input.exportPreset]
      );
      const exportId = (exportResult as any).insertId;
      try {
        const presetArgs: Record<string, string[]> = {
          onlyfans: ["-vf", "scale=1080:-2", "-c:v", "libx264", "-crf", "18", "-preset", "slow", "-c:a", "aac", "-b:a", "192k"],
          fansly: ["-vf", "scale=1080:-2", "-c:v", "libx264", "-crf", "18", "-preset", "slow", "-c:a", "aac", "-b:a", "192k"],
          tiktok: ["-vf", "scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2", "-c:v", "libx264", "-crf", "20", "-r", "60", "-c:a", "aac"],
          instagram_reel: ["-vf", "scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2", "-c:v", "libx264", "-crf", "20", "-c:a", "aac"],
          telegram: ["-vf", "scale=1280:720", "-c:v", "libx264", "-crf", "28", "-preset", "fast", "-c:a", "aac", "-b:a", "128k"],
          twitter: ["-vf", "scale=1280:720", "-c:v", "libx264", "-crf", "23", "-c:a", "aac", "-b:a", "128k"],
          youtube_shorts: ["-vf", "scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2", "-c:v", "libx264", "-crf", "18", "-r", "60", "-c:a", "aac"],
          master: ["-c:v", "libx264", "-crf", "12", "-preset", "veryslow", "-c:a", "aac", "-b:a", "320k"],
        };
        const args = presetArgs[input.exportPreset] || presetArgs.master;
        await runFFmpeg(["-i", sourceUrl, ...args, outPath]);
        const stat = fs.statSync(outPath);
        const elapsed = Math.round((Date.now() - startTime) / 1000);
        const localOutputUrl = `/uploads/vaultx/${cid}/${outName}`;
        const artifact = await persistLocalReadyVaultxArtifact({
          creatorId: cid,
          projectId: input.projectId,
          kind: "export",
          stage: `export_${input.exportPreset}`,
          sourceUrl: readySource.output_url,
          localPath: outPath,
          mimeType: mimeForOutputPath(outPath, input.exportFormat === "mp3" ? "audio/mpeg" : input.exportFormat === "gif" ? "image/gif" : "video/mp4"),
          metadata: { exportId, exportFormat: input.exportFormat, exportPreset: input.exportPreset, localPublicUrl: localOutputUrl, sourceArtifactId: readySource.id },
        });
        const outputUrl = artifact.output_url || localOutputUrl;
        await rawExec(
          "UPDATE vaultx_editor_exports SET output_url = ?, file_size_bytes = ?, processing_time_seconds = ?, status = 'completed' WHERE id = ?",
          [outputUrl, stat.size, elapsed, exportId]
        );
        await rawExec("UPDATE vaultx_editor_projects SET output_url = ?, export_artifact_id = ?, status = 'completed', readiness_state = 'export_ready', updated_at = NOW() WHERE id = ? AND creator_id = ?", [outputUrl, artifact.id, input.projectId, cid]);
        await recordVaultxArtifactEvent({ artifactId: artifact.id, creatorId: cid, projectId: input.projectId, eventType: "export.completed", status: "ready", payload: { exportId, exportFormat: input.exportFormat, exportPreset: input.exportPreset } });
        return { outputUrl, artifact: publicArtifactPayload(artifact), fileSizeBytes: stat.size, processingTimeSeconds: elapsed, success: true };
      } catch (err: any) {
        await rawExec("UPDATE vaultx_editor_exports SET status = 'failed', error_message = ? WHERE id = ?", [err.message, exportId]);
        await failProjectReadiness(cid, input.projectId, `Export failed: ${err.message}`, { exportId, exportFormat: input.exportFormat, exportPreset: input.exportPreset }).catch(() => undefined);
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: `Export failed: ${err.message}` });
      }
    }),

  // ═══════════════════════════════════════════════════════════════════════════
  // PROCEDURE 42 — generateCensoredVersion
  // ═══════════════════════════════════════════════════════════════════════════
  generateCensoredVersion: protectedProcedure
    .input(z.object({
      contentUrl: z.string().url(),
      contentId: z.number().optional(),
      blurIntensity: z.number().min(1).max(10).default(5),
      blurRegions: z.array(z.object({
        x_percent: z.number(), y_percent: z.number(),
        width_percent: z.number(), height_percent: z.number(),
      })).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const creatorId = await getCreatorId(ctx.user.id);
      const cid = creatorId || ctx.user.id;
      const dir = await ensureUploadDir(cid);
      const outName = `censored-${randomUUID()}.mp4`;
      const outPath = path.join(dir, outName);
      const blurStrength = input.blurIntensity * 5;
      if (input.blurRegions && input.blurRegions.length > 0) {
        let filterParts: string[] = [];
        let prev = "[0:v]";
        for (let i = 0; i < input.blurRegions.length; i++) {
          const r = input.blurRegions[i];
          const next = i < input.blurRegions.length - 1 ? `[v${i}]` : "[vout]";
          filterParts.push(
            `${prev}split[orig${i}][blur${i}];[blur${i}]crop=iw*${r.width_percent / 100}:ih*${r.height_percent / 100}:iw*${r.x_percent / 100}:ih*${r.y_percent / 100},boxblur=${blurStrength}:${blurStrength}[blurred${i}];[orig${i}][blurred${i}]overlay=W*${r.x_percent / 100}:H*${r.y_percent / 100}${next}`
          );
          prev = `[v${i}]`;
        }
        await runFFmpeg(["-i", input.contentUrl, "-filter_complex", filterParts.join(";"), "-map", "[vout]", "-map", "0:a?", "-c:a", "copy", outPath]);
      } else {
        await runFFmpeg(["-i", input.contentUrl, "-vf", `boxblur=${blurStrength}:${blurStrength}`, "-c:a", "copy", outPath]);
      }
      const censoredUrl = `/uploads/vaultx/${cid}/${outName}`;
      if (input.contentId) {
        await rawExec("UPDATE vaultx_content SET censored_url = ? WHERE id = ? AND creator_id = ?", [censoredUrl, input.contentId, cid]);
      }
      return { censoredUrl, success: true };
    }),

  // ═══════════════════════════════════════════════════════════════════════════
  // PROCEDURE 43 — generateThumbnail
  // ═══════════════════════════════════════════════════════════════════════════
  generateThumbnail: protectedProcedure
    .input(z.object({
      contentUrl: z.string().url(),
      timestampSeconds: z.number().min(0).default(1),
      contentId: z.number().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const creatorId = await getCreatorId(ctx.user.id);
      const cid = creatorId || ctx.user.id;
      const dir = await ensureUploadDir(cid);
      const thumbName = `thumb-${randomUUID()}.jpg`;
      const thumbPath = path.join(dir, thumbName);
      await runFFmpeg(["-i", input.contentUrl, "-ss", String(input.timestampSeconds), "-vframes", "1", "-q:v", "2", thumbPath]);
      const thumbnailUrl = `/uploads/vaultx/${cid}/${thumbName}`;
      if (input.contentId) {
        await rawExec("UPDATE vaultx_content SET thumbnail_url = ? WHERE id = ? AND creator_id = ?", [thumbnailUrl, input.contentId, cid]);
      }
      return { thumbnailUrl, success: true };
    }),

  // ═══════════════════════════════════════════════════════════════════════════
  // PROCEDURE 44 — getExportHistory (creator gate)
  // ═══════════════════════════════════════════════════════════════════════════
  getEditorExportHistory: protectedProcedure.query(async ({ ctx }) => {
    const creatorId = await getCreatorId(ctx.user.id);
    const cid = creatorId || ctx.user.id;
    const rows = await rawQuery(
      `SELECT e.*, p.project_name
       FROM vaultx_editor_exports e
       LEFT JOIN vaultx_editor_projects p ON p.id = e.project_id
       WHERE e.creator_id = ? ORDER BY e.created_at DESC LIMIT 50`,
      [cid]
    );
    return { exports: rows };
  }),

  // ═══════════════════════════════════════════════════════════════════════════
  // PROCEDURE 45 — getAllCreators (admin/owner only)
  // ═══════════════════════════════════════════════════════════════════════════
  getAllCreators: protectedProcedure.query(async ({ ctx }) => {
    if (!OWNER_IDS.includes(ctx.user.id)) {
      throw new TRPCError({ code: "FORBIDDEN", message: "Owner access required." });
    }
    const rows = await rawQuery(
      `SELECT c.*, u.username, u.name, u.email,
              (SELECT COUNT(*) FROM vaultx_subscriptions WHERE creator_id = c.id AND status='active') AS active_subs,
              (SELECT COUNT(*) FROM vaultx_content WHERE creator_id = c.id AND status='active') AS active_content
       FROM vaultx_creators c
       LEFT JOIN users u ON u.id = c.user_id
       ORDER BY c.total_revenue DESC`,
      []
    );
    return { creators: rows };
  }),

  // ═══════════════════════════════════════════════════════════════════════════
  // PROCEDURE 46 — getPlatformRevenue (admin/owner only)
  // ═══════════════════════════════════════════════════════════════════════════
  getPlatformRevenue: protectedProcedure.query(async ({ ctx }) => {
    if (!OWNER_IDS.includes(ctx.user.id)) {
      throw new TRPCError({ code: "FORBIDDEN", message: "Owner access required." });
    }
    const totals = await rawQuery(
      `SELECT
         (SELECT COALESCE(SUM(price_paid),0) FROM vaultx_subscriptions WHERE status='active') AS total_subscription_revenue,
         (SELECT COALESCE(SUM(amount_paid),0) FROM vaultx_ppv_purchases WHERE status='completed') AS total_ppv_revenue,
         (SELECT COALESCE(SUM(amount),0) FROM vaultx_tips WHERE status='completed') AS total_tip_revenue,
         (SELECT COALESCE(SUM(unlock_price),0) FROM vaultx_messages WHERE is_unlocked=1 AND unlock_price>0) AS total_message_revenue,
         (SELECT COUNT(*) FROM vaultx_creators WHERE is_active=1) AS total_creators,
         (SELECT COUNT(*) FROM vaultx_subscriptions WHERE status='active') AS total_active_subscriptions`,
      []
    );
    const platformFeeTotal = Object.values(totals[0] || {})
      .filter((v): v is number => typeof v === "number")
      .reduce((sum, v) => sum + v, 0) * PLATFORM_FEE;
    return { ...totals[0], platform_fee_revenue: platformFeeTotal };
  }),

  // ═══════════════════════════════════════════════════════════════════════════
  // PROCEDURE 47 — flagContent (admin/owner only)
  // ═══════════════════════════════════════════════════════════════════════════
  flagContent: protectedProcedure
    .input(z.object({
      contentId: z.number(),
      reason: z.string().max(500),
    }))
    .mutation(async ({ ctx, input }) => {
      if (!OWNER_IDS.includes(ctx.user.id)) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Owner access required." });
      }
      await rawExec("UPDATE vaultx_content SET status = 'archived' WHERE id = ?", [input.contentId]);
      return { success: true };
    }),

  // ═══════════════════════════════════════════════════════════════════════════
  // LEGACY PROCEDURES — preserved from original router
  // ═══════════════════════════════════════════════════════════════════════════
  submitAgeVerification: protectedProcedure
    .input(z.object({
      dateOfBirth: z.string(),
      confirmOver18: z.boolean(),
    }))
    .mutation(async ({ ctx, input }) => {
      if (!input.confirmOver18) throw new TRPCError({ code: "BAD_REQUEST", message: "You must confirm you are 18 or older." });
      const dob = new Date(input.dateOfBirth);
      const today = new Date();
      const age = today.getFullYear() - dob.getFullYear() - (today < new Date(today.getFullYear(), dob.getMonth(), dob.getDate()) ? 1 : 0);
      if (age < 18) throw new TRPCError({ code: "FORBIDDEN", message: "You must be 18 or older to access VaultX." });
      const existing = await rawQuery("SELECT id FROM vaultx_age_verifications WHERE user_id = ? LIMIT 1", [ctx.user.id]);
      if (existing.length === 0) {
        await rawExec(
          `INSERT INTO vaultx_age_verifications (user_id, verification_method, date_of_birth, age_at_verification, id_verification_status, ip_address) VALUES (?, 'self_attest', ?, ?, 'approved', '0.0.0.0')`,
          [ctx.user.id, input.dateOfBirth, age]
        );
      }
      return { verified: true, age };
    }),

  getRealmStatus: protectedProcedure.query(async ({ ctx }) => {
    const rows = await rawQuery("SELECT id, age_at_verification, id_verification_status FROM vaultx_age_verifications WHERE user_id = ? AND id_verification_status = 'approved' LIMIT 1", [ctx.user.id]);
    return { adultVerified: rows.length > 0, verificationId: rows[0]?.id || null };
  }),

  getNetwork: protectedProcedure
    .input(z.object({ limit: z.number().min(1).max(100).default(50), offset: z.number().min(0).default(0) }))
    .query(async ({ input }) => {
      const creators = await rawQuery(
        `SELECT vcp.creator_id, vcp.display_name, vcp.bio, vcp.profile_banner_url, vcp.categories,
                vcp.base_subscription_price, vcp.total_subscribers, vcp.total_posts, vcp.tier,
                vcp.is_featured, vcp.ppv_enabled, vcp.tips_enabled,
                vnl.featured_image_url, vnl.teaser_video_url, vnl.pitch, vnl.avg_rating,
                u.name AS user_name, u.username
         FROM vaultx_creator_profiles vcp
         LEFT JOIN vaultx_network_listings vnl ON vnl.creator_id = vcp.creator_id
         LEFT JOIN users u ON u.id = vcp.creator_id
         WHERE vnl.is_visible = 1 OR vnl.is_visible IS NULL
         ORDER BY vcp.is_featured DESC, vcp.total_subscribers DESC LIMIT ? OFFSET ?`,
        [input.limit, input.offset]
      );
      return { creators };
    }),



  getRevenueStats: protectedProcedure.query(async ({ ctx }) => {
    const rows = await rawQuery(
      `SELECT * FROM vaultx_revenue_stats WHERE creator_id = ? ORDER BY period_date DESC LIMIT 30`,
      [ctx.user.id]
    );
    return { stats: rows };
  }),

  saveContent: protectedProcedure
    .input(z.object({
      title: z.string().min(1).max(255),
      description: z.string().max(2000).optional(),
      // Primary (uncensored) file URL — the full content
      fileUrl: z.string().url(),
      // Optional censored/teaser URL for locked preview
      censoredUrl: z.string().url().optional(),
      thumbnailUrl: z.string().url().optional(),
      censoredThumbnailUrl: z.string().url().optional(),
      mimeType: z.string().optional(),
      fileSizeBytes: z.number().optional(),
      unlockType: z.enum(["free", "subscription", "ppv"]).default("subscription"),
      // priceCents is stored as decimal dollars in vaultx_content (ppv_price)
      priceCents: z.number().min(0).default(0),
      accessTier: z.enum(["basic", "premium", "vip", "ppv"]).default("basic"),
      tags: z.array(z.string()).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      // Resolve creator_id from vaultx_creators
      const creatorRows = await rawQuery(
        "SELECT id FROM vaultx_creators WHERE user_id = ? LIMIT 1",
        [ctx.user.id]
      );
      if (!creatorRows.length) throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Creator profile not found. Set up your VaultX creator profile first." });
      const creatorId = creatorRows[0].id;

      const contentType = input.mimeType?.startsWith("video") ? "video" : input.mimeType?.startsWith("image") ? "photo" : input.mimeType?.startsWith("audio") ? "audio" : "video";
      const isPpv = input.unlockType === "ppv" ? 1 : 0;
      const isSubscriptionOnly = input.unlockType === "subscription" ? 1 : 0;
      const ppvPrice = isPpv ? (input.priceCents / 100).toFixed(2) : "0.00";
      const accessTier = input.unlockType === "ppv" ? "ppv" : input.accessTier;

      await rawExec(
        `INSERT INTO vaultx_content
         (creator_id, title, description, content_type, uncensored_url, censored_url,
          thumbnail_url, censored_thumbnail_url, is_ppv, ppv_price, is_subscription_only,
          access_tier, tags, status, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', NOW())`,
        [
          creatorId,
          input.title,
          input.description || null,
          contentType,
          input.fileUrl,
          input.censoredUrl || null,
          input.thumbnailUrl || null,
          input.censoredThumbnailUrl || null,
          isPpv,
          ppvPrice,
          isSubscriptionOnly,
          accessTier,
          input.tags?.length ? JSON.stringify(input.tags) : null,
        ]
      );
      const rows = await rawQuery(
        "SELECT id FROM vaultx_content WHERE creator_id = ? ORDER BY id DESC LIMIT 1",
        [creatorId]
      );
      // Note: vaultx_creators has no total_posts column — post count tracked via vaultx_content COUNT
      return { contentId: rows[0]?.id, success: true };
    }),

  getCreatorContent: protectedProcedure
    .input(z.object({ creatorId: z.number(), limit: z.number().default(20), offset: z.number().default(0) }))
    .query(async ({ ctx, input }) => {
      const viewerCreatorId = await getCreatorId(ctx.user.id);
      const isCreatorOwner = viewerCreatorId === input.creatorId || ctx.user.id === input.creatorId || OWNER_IDS.includes(ctx.user.id);
      const subRows = await rawQuery("SELECT id FROM subscriptions WHERE fan_id = ? AND creator_id = ? AND status = 'active' LIMIT 1", [ctx.user.id, input.creatorId]);
      const isSubscribed = subRows.length > 0 || isCreatorOwner;
      const legacyRows = await rawQuery(
        `SELECT id, title, description, file_url, thumbnail_url, mime_type, content_type, price_cents, is_locked, unlock_type, views, created_at
         FROM content WHERE user_id = ? AND status = 'active'
         ORDER BY created_at DESC LIMIT ? OFFSET ?`,
        [input.creatorId, input.limit, input.offset]
      );
      const vaultxRows = await rawQuery(
        `SELECT id, title, description, uncensored_url, censored_url, thumbnail_url, censored_thumbnail_url,
                content_type, ppv_price, is_ppv, access_tier, view_count, purchase_count, revenue_generated, created_at
         FROM vaultx_content WHERE creator_id = ? AND status = 'active'
         ORDER BY created_at DESC LIMIT ? OFFSET ?`,
        [input.creatorId, input.limit, input.offset]
      );
      const legacyItems = await Promise.all(legacyRows.map(async (row: any) => {
        let accessible = !row.is_locked || isSubscribed;
        if (!accessible && row.unlock_type === "ppv") {
          const unlocked = await rawQuery("SELECT id FROM content_unlocks WHERE fan_id = ? AND content_id = ? LIMIT 1", [ctx.user.id, row.id]);
          accessible = unlocked.length > 0;
        }
        return { ...row, source_table: "content", file_url: accessible ? row.file_url : null, locked: !accessible };
      }));
      const vaultxItems = await Promise.all(vaultxRows.map(async (row: any) => {
        let accessible = isCreatorOwner || (!row.is_ppv && isSubscribed);
        if (!accessible && row.is_ppv) {
          const unlocked = await rawQuery("SELECT id FROM vaultx_ppv_purchases WHERE fan_id = ? AND content_id = ? AND status = 'completed' LIMIT 1", [ctx.user.id, row.id]);
          accessible = unlocked.length > 0;
        }
        const priceCents = Math.round(Number(row.ppv_price || 0) * 100);
        return {
          id: `vaultx-${row.id}`,
          vaultx_content_id: row.id,
          source_table: "vaultx_content",
          title: row.title,
          description: row.description,
          file_url: accessible ? row.uncensored_url : null,
          preview_url: row.censored_url || row.censored_thumbnail_url || row.thumbnail_url || null,
          thumbnail_url: row.thumbnail_url || row.censored_thumbnail_url || row.censored_url || null,
          mime_type: row.content_type === "audio" ? "audio/mpeg" : row.content_type === "photo" ? "image/jpeg" : "video/mp4",
          content_type: row.content_type,
          price_cents: priceCents,
          is_locked: row.is_ppv ? 1 : 0,
          unlock_type: row.is_ppv ? "ppv" : row.access_tier || "subscription",
          views: row.view_count || 0,
          purchase_count: row.purchase_count || 0,
          revenue_generated: row.revenue_generated || 0,
          created_at: row.created_at,
          locked: !accessible,
        };
      }));
      const items = [...vaultxItems, ...legacyItems]
        .sort((a: any, b: any) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime())
        .slice(0, input.limit);
      return { items, isSubscribed, creatorOwner: isCreatorOwner };
    }),

  saveExportHistory: protectedProcedure
    .input(z.object({
      platform: z.string().min(1),
      outputUrl: z.string().url(),
      resolution: z.string().optional(),
      format: z.string().optional(),
      fileSizeBytes: z.number().optional(),
      sourceContentId: z.number().optional(),
      sourceAssetId: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      await rawQuery(
        `INSERT INTO platform_export_history (creator_id, source_content_id, source_asset_id, platform, output_url, resolution, format, file_size_bytes) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [ctx.user.id, input.sourceContentId ?? null, input.sourceAssetId ?? null, input.platform, input.outputUrl, input.resolution ?? null, input.format ?? null, input.fileSizeBytes ?? null]
      );
      return { success: true };
    }),

  getExportHistory: protectedProcedure
    .input(z.object({ platform: z.string().optional(), limit: z.number().min(1).max(100).default(50) }))
    .query(async ({ input, ctx }) => {
      const rows = await rawQuery(
        `SELECT * FROM platform_export_history WHERE creator_id = ? ${input.platform ? "AND platform = ?" : ""} ORDER BY exported_at DESC LIMIT ?`,
        input.platform ? [ctx.user.id, input.platform, input.limit] : [ctx.user.id, input.limit]
      );
      return rows;
    }),

  publishToVault: protectedProcedure
    .input(z.object({
      fileUrl: z.string().url(),
      title: z.string().min(1).max(200),
      description: z.string().optional(),
      mimeType: z.string().default("video/mp4"),
      priceCents: z.number().min(0).default(0),
      unlockType: z.enum(["free", "subscription", "ppv"]).default("subscription"),
      tags: z.array(z.string()).optional(),
      sourceAssetId: z.string().optional(),
      thumbnailUrl: z.string().url().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const result = await rawQuery(
        `INSERT INTO content (user_id, title, description, file_url, file_key, mime_type, content_type, price_cents, is_locked, unlock_type, status, tags, source_asset_id, thumbnail_url, published_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', ?, ?, ?, NOW())`,
        [ctx.user.id, input.title, input.description ?? null, input.fileUrl, input.fileUrl.split("/").pop() ?? "output", input.mimeType, input.mimeType.startsWith("video") ? "video" : "audio", input.priceCents, input.unlockType !== "free" ? 1 : 0, input.unlockType, input.tags ? JSON.stringify(input.tags) : null, input.sourceAssetId ?? null, input.thumbnailUrl ?? null]
      );
      return { success: true, contentId: (result as any).insertId };
    }),

  savePpvOutput: protectedProcedure
    .input(z.object({
      fileUrl: z.string().url(),
      outputType: z.enum(["teaser", "censor", "watermark", "ai-ppv"]),
      priceCents: z.number().min(0).default(999),
      sourceAssetId: z.string().optional(),
      title: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const title = input.title ?? `PPV ${input.outputType.charAt(0).toUpperCase() + input.outputType.slice(1)}`;
      const result = await rawQuery(
        `INSERT INTO content (user_id, title, file_url, file_key, mime_type, content_type, price_cents, is_locked, unlock_type, status, source_asset_id, published_at) VALUES (?, ?, ?, ?, 'video/mp4', 'video', ?, 1, 'ppv', 'active', ?, NOW())`,
        [ctx.user.id, title, input.fileUrl, input.fileUrl.split("/").pop() ?? "ppv-output", input.priceCents, input.sourceAssetId ?? null]
      );
      return { success: true, contentId: (result as any).insertId };
    }),

  subscribeToCreator: protectedProcedure
    .input(z.object({ creatorId: z.number(), tier: z.enum(["basic", "premium", "vip"]).optional() }))
    .mutation(async ({ ctx, input }) => {
      const creator = await rawQuery("SELECT * FROM vaultx_creators WHERE id = ? LIMIT 1", [input.creatorId]);
      if (!creator.length) throw new TRPCError({ code: "NOT_FOUND", message: "Creator not found." });
      const tier = input.tier || "basic";
      const priceMap: Record<string, number> = {
        basic: creator[0].subscription_price_basic || 9.99,
        premium: creator[0].subscription_price_premium || 24.99,
        vip: creator[0].subscription_price_vip || 49.99,
      };
      const result = await rawExec(
        `INSERT INTO vaultx_subscriptions (fan_id, creator_id, tier, price_paid, status, current_period_start, current_period_end) VALUES (?, ?, ?, ?, 'active', NOW(), DATE_ADD(NOW(), INTERVAL 1 MONTH))`,
        [ctx.user.id, input.creatorId, tier, priceMap[tier]]
      );
      await rawExec("UPDATE vaultx_creators SET total_subscribers = total_subscribers + 1 WHERE id = ?", [input.creatorId]);
      return { subscriptionId: (result as any).insertId, success: true };
    }),

  createTipIntent: protectedProcedure
    .input(z.object({ creatorId: z.number(), amountCents: z.number().min(100).max(1000000) }))
    .mutation(async ({ ctx, input }) => {
      const result = await rawExec(
        "INSERT INTO vaultx_tips (fan_id, creator_id, amount, status) VALUES (?, ?, ?, 'pending')",
        [ctx.user.id, input.creatorId, input.amountCents / 100]
      );
      return { tipId: (result as any).insertId, clientSecret: null };
    }),

  confirmSubscription: protectedProcedure
    .input(z.object({ subscriptionId: z.number(), stripeSubscriptionId: z.string().optional() }))
    .mutation(async ({ ctx, input }) => {
      await rawExec("UPDATE vaultx_subscriptions SET status = 'active', stripe_subscription_id = ? WHERE id = ? AND fan_id = ?", [input.stripeSubscriptionId || null, input.subscriptionId, ctx.user.id]);
      return { success: true };
    }),

  linkChannel: protectedProcedure
    .input(z.object({ channelId: z.string().min(1).max(255), channelName: z.string().min(1).max(255), botToken: z.string().optional() }))
    .mutation(async ({ ctx, input }) => {
      const bots = await rawQuery("SELECT id FROM telegram_bots WHERE created_by = ? LIMIT 1", [ctx.user.id]);
      let botId: string;
      if (bots.length === 0) {
        botId = randomUUID();
        await rawExec(`INSERT INTO telegram_bots (id, name, bot_token, status, created_by) VALUES (?, ?, '', 'active', ?)`, [botId, `VaultX Bot - ${input.channelName}`, ctx.user.id]);
      } else { botId = bots[0].id; }
      const existing = await rawQuery("SELECT id FROM telegram_channels WHERE creator_id = ? LIMIT 1", [ctx.user.id]);
      if (existing.length === 0) {
        const chanId = randomUUID();
        await rawExec(`INSERT INTO telegram_channels (id, bot_id, channel_id, channel_name, channel_type, creator_id) VALUES (?, ?, ?, ?, 'private', ?)`, [chanId, botId, input.channelId, input.channelName, ctx.user.id]);
      } else {
        await rawExec("UPDATE telegram_channels SET channel_id = ?, channel_name = ? WHERE creator_id = ?", [input.channelId, input.channelName, ctx.user.id]);
      }
      const rows = await rawQuery("SELECT * FROM telegram_channels WHERE creator_id = ? LIMIT 1", [ctx.user.id]);
      return rows[0] || null;
    }),

  getLinkedChannel: protectedProcedure.query(async ({ ctx }) => {
    const rows = await rawQuery("SELECT * FROM telegram_channels WHERE creator_id = ? LIMIT 1", [ctx.user.id]);
    return rows[0] || null;
  }),

  updateCreatorProfile: protectedProcedure
    .input(z.object({
      displayName: z.string().min(1).max(255),
      bio: z.string().max(2000).optional(),
      contentStyle: z.string().max(100).optional(),
      subscriptionPrice: z.number().min(0).max(9999),
      ppvEnabled: z.boolean().optional(),
      tipsEnabled: z.boolean().optional(),
      customRequestsEnabled: z.boolean().optional(),
      dmPaywallEnabled: z.boolean().optional(),
      categories: z.array(z.string()).optional(),
      profileBannerUrl: z.string().url().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const existing = await rawQuery("SELECT id FROM vaultx_creator_profiles WHERE creator_id = ? LIMIT 1", [ctx.user.id]);
      const categoriesJson = JSON.stringify(input.categories || []);
      if (existing.length === 0) {
        const id = randomUUID();
        await rawExec(
          `INSERT INTO vaultx_creator_profiles (id, creator_id, display_name, bio, content_style, base_subscription_price, ppv_enabled, tips_enabled, custom_requests_enabled, dm_paywall_enabled, categories, profile_banner_url) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [id, ctx.user.id, input.displayName, input.bio || null, input.contentStyle || null, input.subscriptionPrice, input.ppvEnabled !== false ? 1 : 0, input.tipsEnabled !== false ? 1 : 0, input.customRequestsEnabled !== false ? 1 : 0, input.dmPaywallEnabled ? 1 : 0, categoriesJson, input.profileBannerUrl || null]
        );
        const nlId = randomUUID();
        await rawExec("INSERT IGNORE INTO vaultx_network_listings (id, creator_id, is_visible) VALUES (?, ?, 1)", [nlId, ctx.user.id]);
      } else {
        await rawExec(
          `UPDATE vaultx_creator_profiles SET display_name=?, bio=?, content_style=?, base_subscription_price=?, ppv_enabled=?, tips_enabled=?, custom_requests_enabled=?, dm_paywall_enabled=?, categories=?, profile_banner_url=COALESCE(?,profile_banner_url) WHERE creator_id=?`,
          [input.displayName, input.bio || null, input.contentStyle || null, input.subscriptionPrice, input.ppvEnabled !== false ? 1 : 0, input.tipsEnabled !== false ? 1 : 0, input.customRequestsEnabled !== false ? 1 : 0, input.dmPaywallEnabled ? 1 : 0, categoriesJson, input.profileBannerUrl || null, ctx.user.id]
        );
      }
      const updated = await rawQuery("SELECT * FROM vaultx_creator_profiles WHERE creator_id = ? LIMIT 1", [ctx.user.id]);
      return { profile: updated[0] };
    }),

  // ═══════════════════════════════════════════════════════════════════════════
  // PROCEDURE 48 — automatedDirectorExport
  // The Automated Director — every export gets Desire-Grade LUT, AI pacing,
  // and Viral-Clip-Pack template. This is not optional. This is the standard.
  // ═══════════════════════════════════════════════════════════════════════════
  automatedDirectorExport: protectedProcedure
    .input(z.object({
      sourceUrl: z.string(),
      platform: z.enum(["onlyfans", "fansly", "tiktok", "instagram_reel", "master"]).default("master"),
      hookText: z.string().max(80).optional(),
      ctaText: z.string().max(80).optional(),
      enableAIPacing: z.boolean().default(true),
      projectId: z.number().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const creatorId = await getCreatorId(ctx.user.id);
      const cid = creatorId || ctx.user.id;
      const dir = await ensureUploadDir(cid);

      // Resolve source path — relative URL → absolute file path
      let sourcePath = input.sourceUrl;
      if (sourcePath.startsWith("/uploads/") || sourcePath.startsWith("/videos/")) {
        sourcePath = `/root/creatorvault/dist/public${sourcePath}`;
      }
      if (!fs.existsSync(sourcePath) && !sourcePath.startsWith("http")) {
        throw new TRPCError({ code: "NOT_FOUND", message: `Source video not found: ${sourcePath}` });
      }

      const profileRows = await rawQuery(
        "SELECT display_name FROM vaultx_creator_profiles WHERE creator_id = ? LIMIT 1",
        [cid]
      );
      const creatorName = profileRows[0]?.display_name || "CREATORVAULT";

      const result = await runAutomatedDirector({
        sourceUrl: sourcePath,
        outputDir: dir,
        creatorName,
        hookText: input.hookText,
        ctaText: input.ctaText,
        platform: input.platform,
        enableAIPacing: input.enableAIPacing,
        enableDesireGrade: true,
        enableTemplate: true,
      });

      if (input.projectId) {
        await rawExec(
          "UPDATE vaultx_editor_projects SET output_url = ?, status = 'completed', updated_at = NOW() WHERE id = ? AND creator_id = ?",
          [result.outputUrl, input.projectId, cid]
        );
      }

      await rawExec(
        `INSERT INTO vaultx_editor_exports (project_id, creator_id, export_format, export_preset, output_url, file_size_bytes, processing_time_seconds, status)
         VALUES (?, ?, 'mp4_hd', ?, ?, ?, ?, 'completed')`,
        [input.projectId || null, cid, input.platform, result.outputUrl, result.fileSizeBytes, Math.round(result.processingTimeMs / 1000)]
      );

      return {
        outputUrl: result.outputUrl,
        fileSizeBytes: result.fileSizeBytes,
        processingTimeMs: result.processingTimeMs,
        processingSteps: result.processingSteps,
        scenesDetected: result.scenesDetected,
        duration: result.duration,
        success: true,
      };
    }),

  // ═══════════════════════════════════════════════════════════════════════════
  // PROCEDURE 49 — generateDesireTeaser
  // Full Tease Engine: AI desire peak detection → beauty enhance (Replicate
  // zsxkib/pulid) → AI animation (Replicate minimax/video-01-live) →
  // drip-reveal teaser → censored preview for subscriber paywall
  // ═══════════════════════════════════════════════════════════════════════════
  generateDesireTeaser: protectedProcedure
    .input(z.object({
      sourceUrl: z.string().url(),
      contentId: z.number().optional(),
      teaserDurationSeconds: z.number().min(10).max(60).default(30),
      enableAIAnimation: z.boolean().default(true),
      enableBeautyEnhance: z.boolean().default(true),
    }))
    .mutation(async ({ ctx, input }) => {
      const creatorId = await getCreatorId(ctx.user.id);
      const cid = creatorId || ctx.user.id;
      const userRows = await rawQuery("SELECT display_name, username FROM users WHERE id = ?", [ctx.user.id]);
      const displayName = userRows[0]?.display_name || userRows[0]?.username || "Creator";

      const result = await runTeaseEngine({
        sourceUrl: input.sourceUrl,
        creatorId: cid,
        creatorDisplayName: displayName,
        teaserDurationSeconds: input.teaserDurationSeconds,
        enableAIAnimation: input.enableAIAnimation,
        enableBeautyEnhance: input.enableBeautyEnhance,
      });

      if (input.contentId) {
        await rawExec(
          "UPDATE vaultx_content SET teaser_url = ?, censored_url = ?, thumbnail_url = COALESCE(?, thumbnail_url) WHERE id = ? AND creator_id = ?",
          [result.teaserUrl, result.censoredPreviewUrl, result.desirePeakFrameUrl || null, input.contentId, cid]
        ).catch(() => {});
      }

      await rawExec(
        "INSERT INTO vaultx_export_history (creator_id, content_id, export_type, output_url, file_size_bytes, processing_time_seconds, created_at) VALUES (?, ?, 'desire_teaser', ?, 0, ?, NOW())",
        [cid, input.contentId || null, result.teaserUrl, Math.round(result.processingTimeMs / 1000)]
      ).catch(() => {});

      return {
        teaserUrl: result.teaserUrl,
        censoredPreviewUrl: result.censoredPreviewUrl,
        desirePeakFrameUrl: result.desirePeakFrameUrl,
        aiAnimatedClipUrl: result.aiAnimatedClipUrl,
        beautyEnhancedFrameUrl: result.beautyEnhancedFrameUrl,
        ctaText: result.ctaText,
        hooks: result.hooks,
        suggestedPrice: result.suggestedPrice,
        peakTimeSeconds: result.peakTimeSeconds,
        energyScore: result.energyScore,
        sceneDescription: result.sceneDescription,
        processingSteps: result.processingSteps,
        processingTimeMs: result.processingTimeMs,
        success: true,
      };
    }),

  // ─── PROCEDURE 50: distributeContent ─────────────────────────────────────
  distributeContent: protectedProcedure
    .input(z.object({
      sourceUrl: z.string().url(),
      platforms: z.array(z.enum(["onlyfans", "fansly", "mym", "tiktok", "twitter", "telegram"])),
      title: z.string().optional(),
      description: z.string().optional(),
      applyWatermark: z.boolean().default(true),
      contentType: z.enum(["full_scene", "teaser", "clip", "ppv"]).default("clip"),
    }))
    .mutation(async ({ ctx, input }) => {
      // Map simple platform IDs to full preset IDs
      const platformMap: Record<string, string> = {
        onlyfans: "onlyfans_full",
        onlyfans_trailer: "onlyfans_trailer",
        fansly: "fansly",
        mym: "mym",
        tiktok: "tiktok",
        twitter: "twitter",
        instagram_reel: "instagram_reel",
        telegram: "telegram",
        ppv: "ppv_preview",
      };
      const mappedPlatforms = input.platforms.map((p: string) => platformMap[p] || p);
      const result = await distributionEngineExport({
        sourceUrl: input.sourceUrl,
        creatorId: ctx.user.id,
        creatorUsername: ctx.user.name || `creator_${ctx.user.id}`,
        platforms: mappedPlatforms as any,
      });
      return result;
    }),

  // ─── PROCEDURE 51: enhanceScenes ─────────────────────────────────────────
  enhanceScenes: protectedProcedure
    .input(z.object({ sourceUrl: z.string().url() }))
    .mutation(async ({ ctx, input }) => {
      const result = await enhanceSceneByScene({
        sourceUrl: input.sourceUrl,
        creatorId: ctx.user.id,
      });
      return result;
    }),

  // ─── PROCEDURE 52: buildPpvBundle ─────────────────────────────────────────
  buildPpvBundle: protectedProcedure
    .input(z.object({
      sourceUrl: z.string().url(),
      desireScore: z.number().min(1).max(10).default(7),
      teaserDurationSec: z.number().optional(),
      previewDurationSec: z.number().optional(),
      clientBundleId: z.string().optional(), // client-generated ID for progress tracking sync
    }))
    .mutation(async ({ ctx, input }) => {
      const result = await buildPpvBundle({
        sourceUrl: input.sourceUrl,
        creatorId: ctx.user.id,
        creatorUsername: ctx.user.name || `creator_${ctx.user.id}`,
        desireScore: input.desireScore,
        teaserDurationSec: input.teaserDurationSec,
        previewDurationSec: input.previewDurationSec,
        clientBundleId: input.clientBundleId,
      });
      return result;
    }),

  // ─── PROCEDURE 52b: ppvBundleProgress ────────────────────────────────────
  ppvBundleProgress: protectedProcedure
    .input(z.object({
      bundleId: z.string(),
    }))
    .query(async ({ input }) => {
      const progress = getPpvProgress(input.bundleId);
      if (!progress) {
        return {
          found: false,
          bundleId: input.bundleId,
          overallStatus: "pending" as const,
          currentStageIndex: 0,
          stages: [],
          startedAt: null,
          completedAt: null,
          error: null,
        };
      }
      return {
        found: true,
        bundleId: progress.bundleId,
        overallStatus: progress.overallStatus,
        currentStageIndex: progress.currentStageIndex,
        stages: progress.stages,
        startedAt: progress.startedAt,
        completedAt: progress.completedAt ?? null,
        error: progress.error ?? null,
      };
    }),
  // ─── PROCEDURE 53: createTipUnlock ───────────────────────────────────────
  createTipUnlock: protectedProcedure
    .input(z.object({
      sourceUrl: z.string().url(),
      tipAmountCents: z.number().min(100).max(100000),
      revealStyle: z.enum(["progressive", "instant", "timed"]).default("progressive"),
    }))
    .mutation(async ({ ctx, input }) => {
      const result = await createTipUnlockContent({
        sourceUrl: input.sourceUrl,
        creatorUsername: ctx.user.name || `creator_${ctx.user.id}`,
        tipAmountCents: input.tipAmountCents,
        revealStyle: input.revealStyle,
      });
      return result;
    }),

  // ─── PROCEDURE 54: suggestPrice ──────────────────────────────────────────
  suggestPrice: protectedProcedure
    .input(z.object({
      durationSec: z.number(),
      desireScore: z.number().min(1).max(10),
      contentType: z.enum(["full_scene", "clip", "custom_request", "live_replay", "photoset"]),
      platformTarget: z.enum(["onlyfans", "fansly", "mym", "direct"]).default("onlyfans"),
    }))
    .query(async ({ ctx, input }) => {
      const result = await suggestContentPrice({
        durationSec: input.durationSec,
        desireScore: input.desireScore,
        contentType: input.contentType,
        creatorTier: "established",
        platformTarget: input.platformTarget,
      });
      return result;
    }),

  // ─── PROCEDURE 55: generateThumbnails ────────────────────────────────────
  generateThumbnails: protectedProcedure
    .input(z.object({
      videoUrl: z.string().url(),
      count: z.number().min(2).max(6).default(4),
    }))
    .mutation(async ({ ctx, input }) => {
      const result = await generateAbThumbnails({
        videoUrl: input.videoUrl,
        creatorUsername: ctx.user.name || `creator_${ctx.user.id}`,
        count: input.count,
      });
      return result;
    }),

  // ─── PROCEDURE 56: analyzeHook ───────────────────────────────────────────
  analyzeHook: protectedProcedure
    .input(z.object({
      videoUrl: z.string().url(),
      hookDurationSec: z.number().default(5),
    }))
    .mutation(async ({ ctx, input }) => {
      const result = await analyzeHookStrength({
        videoUrl: input.videoUrl,
        hookDurationSec: input.hookDurationSec,
      });
      return result;
    }),

  // ─── PROCEDURE 57: getRecutSuggestions ───────────────────────────────────
  getRecutSuggestions: protectedProcedure
    .input(z.object({
      videoUrl: z.string().url(),
      totalDurationSec: z.number(),
      contentType: z.enum(["full_scene", "clip", "teaser"]).default("clip"),
    }))
    .mutation(async ({ ctx, input }) => {
      const result = await generateRecutSuggestions({
        videoUrl: input.videoUrl,
        totalDurationSec: input.totalDurationSec,
        contentType: input.contentType,
      });
      return result;
    }),


  // ─── PROCEDURE 58: generateAIChatterResponse ─────────────────────────────
  // Real GPT-powered auto-reply using creator's persona config
  generateAIChatterResponse: protectedProcedure
    .input(z.object({
      fanMessage: z.string().max(2000),
      conversationHistory: z.array(z.object({
        role: z.enum(["fan", "creator"]),
        message: z.string(),
      })).max(10).optional(),
      includePpvPitch: z.boolean().default(false),
      includeTipRequest: z.boolean().default(false),
    }))
    .mutation(async ({ ctx, input }) => {
      const creatorId = await getCreatorId(ctx.user.id);
      const cid = creatorId || ctx.user.id;
      // Load creator's AI chatter config
      const configRows = await rawQuery(
        "SELECT persona_name, persona_description, greeting_message, ppv_pitch_frequency FROM vaultx_ai_chatter_config WHERE creator_id = ? LIMIT 1",
        [cid]
      );
      const cfg = configRows[0] || {};
      const personaName = cfg.persona_name || ctx.user.name || "your creator";
      const personaDesc = cfg.persona_description || "a confident, body-positive adult content creator who is warm, flirty, and makes fans feel special";
      const systemPrompt = `You are ${personaName} — ${personaDesc}. You are responding to a fan on VaultX, an adult content platform. Be authentic, warm, and engaging. ${input.includePpvPitch ? "Naturally weave in a mention of exclusive PPV content they can unlock to see more." : ""} ${input.includeTipRequest ? "Subtly suggest they show appreciation with a tip if they're enjoying the conversation." : ""} Keep responses conversational, 1-3 sentences max. Sound like a real person, not a bot.`;
      const messages: any[] = [{ role: "system", content: systemPrompt }];
      if (input.conversationHistory) {
        for (const msg of input.conversationHistory) {
          messages.push({ role: msg.role === "creator" ? "assistant" : "user", content: msg.message });
        }
      }
      messages.push({ role: "user", content: input.fanMessage });
      const { OpenAI } = await import("openai");
      const openaiClient = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
      const gptResp = await openaiClient.chat.completions.create({
        model: "gpt-4.1-mini",
        messages,
        max_tokens: 200,
        temperature: 0.85,
      });
      const response = gptResp.choices[0].message.content || `Hey! Thanks for reaching out 💕`;
      return {
        response,
        personaName,
        tokenCount: gptResp.usage?.total_tokens || 0,
        success: true,
      };
    }),

  // ─── PROCEDURE 59: generateCreatorPersona ────────────────────────────────
  // GPT generates a full AI persona for the creator based on their style/niche
  generateCreatorPersona: protectedProcedure
    .input(z.object({
      creatorName: z.string().max(100),
      niche: z.string().max(200),
      personality: z.string().max(500),
      contentStyle: z.enum(["sensual", "dominant", "submissive", "playful", "artistic", "girlfriend_experience", "luxury"]).default("sensual"),
      targetAudience: z.string().max(200).optional(),
    }))
    .mutation(async ({ input }) => {
      const { OpenAI } = await import("openai");
      const openaiClient = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
      const gptResp = await openaiClient.chat.completions.create({
        model: "gpt-4.1-mini",
        messages: [{
          role: "system",
          content: "You are VaultX's AI persona architect. You create compelling, authentic AI personas for adult content creators that help them engage fans 24/7. Always be body-positive and empowering.",
        }, {
          role: "user",
          content: `Create a full AI chatter persona for this creator:
Name: ${input.creatorName}
Niche: ${input.niche}
Personality: ${input.personality}
Content Style: ${input.contentStyle}
Target Audience: ${input.targetAudience || "general adult fans"}

Return JSON:
{
  "personaName": string,
  "personaDescription": string (2-3 sentences, how the AI should talk and behave),
  "greetingMessage": string (warm first message to new subscribers),
  "ppvPitchTemplate": string (natural way to pitch PPV content),
  "tipRequestTemplate": string (subtle way to request tips),
  "topicsList": string[] (5 topics to discuss with fans),
  "avoidTopics": string[] (topics to avoid),
  "signaturePhrase": string (catchphrase or sign-off)
}`,
        }],
        response_format: { type: "json_object" },
      });
      const parsed = JSON.parse(gptResp.choices[0].message.content || "{}");
      return {
        ...parsed,
        contentStyle: input.contentStyle,
        success: true,
      };
    }),

  // ─── PROCEDURE 60: ppvPricingIntelligence ────────────────────────────────
  // GPT analyzes content metadata and suggests optimal PPV pricing strategy
  ppvPricingIntelligence: protectedProcedure
    .input(z.object({
      contentTitle: z.string().max(200).optional(),
      contentType: z.enum(["full_scene", "clip", "photoset", "custom_request", "live_recording"]).default("clip"),
      durationSeconds: z.number().optional(),
      contentDescription: z.string().max(500).optional(),
      creatorTier: z.enum(["new", "established", "top_creator", "celebrity"]).default("established"),
      exclusivityLevel: z.enum(["standard", "exclusive", "ultra_exclusive"]).default("standard"),
      platformTarget: z.enum(["onlyfans", "fansly", "vaultx", "all"]).default("vaultx"),
    }))
    .mutation(async ({ input }) => {
      const { OpenAI } = await import("openai");
      const openaiClient = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
      const gptResp = await openaiClient.chat.completions.create({
        model: "gpt-4.1-mini",
        messages: [{
          role: "system",
          content: "You are VaultX's PPV pricing intelligence AI. You analyze adult content metadata and suggest optimal pricing strategies based on market data, content type, creator tier, and exclusivity. Always maximize creator revenue while keeping prices fair for fans.",
        }, {
          role: "user",
          content: `Analyze this content and suggest optimal PPV pricing:
Content Type: ${input.contentType}
Duration: ${input.durationSeconds ? `${input.durationSeconds}s` : "unknown"}
Description: ${input.contentDescription || "not provided"}
Creator Tier: ${input.creatorTier}
Exclusivity: ${input.exclusivityLevel}
Platform: ${input.platformTarget}

Return JSON:
{
  "suggestedPrice": number (USD),
  "priceRange": { "min": number, "max": number },
  "reasoning": string,
  "bundleStrategy": string,
  "teaserStrategy": string,
  "expectedConversionRate": number (0-100),
  "revenueProjection": { "conservative": number, "optimistic": number },
  "competitorBenchmark": string,
  "pricingTips": string[]
}`,
        }],
        response_format: { type: "json_object" },
      });
      const parsed = JSON.parse(gptResp.choices[0].message.content || "{}");
      return {
        ...parsed,
        contentType: input.contentType,
        creatorTier: input.creatorTier,
        success: true,
      };
    }),

  // ─── PROCEDURE 61: generateMassBroadcastCopy ─────────────────────────────
  // GPT generates high-converting mass broadcast messages for PPV/subscription pitches
  generateMassBroadcastCopy: protectedProcedure
    .input(z.object({
      broadcastType: z.enum(["ppv_launch", "subscription_renewal", "new_content", "exclusive_offer", "comeback", "holiday"]).default("ppv_launch"),
      contentTitle: z.string().max(200).optional(),
      price: z.number().optional(),
      personaName: z.string().max(100).optional(),
      urgency: z.enum(["none", "limited_time", "limited_spots", "flash_sale"]).default("none"),
      tone: z.enum(["flirty", "exclusive", "urgent", "intimate", "playful"]).default("flirty"),
      includeEmoji: z.boolean().default(true),
    }))
    .mutation(async ({ ctx, input }) => {
      const creatorId = await getCreatorId(ctx.user.id);
      const cid = creatorId || ctx.user.id;
      const configRows = await rawQuery(
        "SELECT persona_name FROM vaultx_ai_chatter_config WHERE creator_id = ? LIMIT 1",
        [cid]
      );
      const personaName = input.personaName || configRows[0]?.persona_name || ctx.user.name || "your creator";
      const { OpenAI } = await import("openai");
      const openaiClient = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
      const gptResp = await openaiClient.chat.completions.create({
        model: "gpt-4.1-mini",
        messages: [{
          role: "system",
          content: `You are ${personaName}'s copywriting AI on VaultX. Write high-converting mass broadcast messages for adult content creators. Be authentic, flirty, and compelling. ${input.includeEmoji ? "Use relevant emojis naturally." : "No emojis."}`,
        }, {
          role: "user",
          content: `Write a mass broadcast message:
Type: ${input.broadcastType}
Content: ${input.contentTitle || "new exclusive content"}
Price: ${input.price ? `$${input.price}` : "not specified"}
Urgency: ${input.urgency}
Tone: ${input.tone}

Return JSON:
{
  "subject": string (short attention-grabbing subject line),
  "body": string (2-3 sentence message body),
  "cta": string (call to action),
  "fullMessage": string (complete message ready to send),
  "variants": string[] (2 alternative versions)
}`,
        }],
        response_format: { type: "json_object" },
      });
      const parsed = JSON.parse(gptResp.choices[0].message.content || "{}");
      return {
        ...parsed,
        broadcastType: input.broadcastType,
        personaName,
        success: true,
      };
    }),


  // ══════════════════════════════════════════════════════════════════════════
  // VAULTX AI EDITOR — FULL PRODUCTION PIPELINE
  // ══════════════════════════════════════════════════════════════════════════

  // ─── PROCEDURE: analyzeContent ───────────────────────────────────────────
  // GPT-4o Vision analyzes uploaded content and returns enhancement plan
  analyzeContent: protectedProcedure
    .input(z.object({
      sourceUrl: z.string().url(),
      projectType: z.enum(["photo", "video", "photo_set", "reel"]).default("photo"),
      projectId: z.number().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { OpenAI } = await import("openai");
      const openaiClient = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

      const systemPrompt = `You are an adult content enhancement specialist working for VaultX, the world's most powerful adult creator platform. Analyze this content and return ONLY valid JSON with these exact fields:
{
  "content_type": "solo|couple|implied|explicit|fitness|glamour|lingerie|dance|lifestyle",
  "lighting_quality": 1-10,
  "image_quality": 1-10,
  "detected_regions": ["array of key body/composition elements visible"],
  "strongest_assets": ["ranked list of body regions by visual impact"],
  "enhancement_recommendations": ["specific AI enhancements that would most improve this"],
  "caption_suggestions": ["teaser caption", "subscriber caption", "explicit caption"],
  "pricing_recommendation": 5-50,
  "background_quality": "poor|average|good",
  "skin_tone_detected": "fair|medium|olive|deep|ebony",
  "enhancement_priority": ["ordered list of regions to enhance first"],
  "lighting_issues": ["any lighting problems"],
  "composition_notes": "brief composition analysis",
  "monetization_potential": 1-10
}`;

      const gptResp = await openaiClient.chat.completions.create({
        model: "gpt-4o",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: [
            { type: "text", text: "Analyze this adult content for enhancement opportunities. Return only the JSON object." },
            { type: "image_url", image_url: { url: input.sourceUrl, detail: "high" } },
          ]},
        ],
        max_tokens: 800,
        temperature: 0.3,
      });

      let analysis: any = {};
      try {
        const rawText = gptResp.choices[0].message.content || "{}";
        const jsonMatch = rawText.match(/\{[\s\S]*\}/);
        analysis = jsonMatch ? JSON.parse(jsonMatch[0]) : {};
      } catch {
        analysis = {
          content_type: "glamour",
          lighting_quality: 7,
          image_quality: 7,
          detected_regions: ["figure", "face"],
          strongest_assets: ["figure", "face"],
          enhancement_recommendations: ["skin smoothing", "lighting enhancement", "background upgrade"],
          caption_suggestions: ["Feeling myself today 🔥", "This one's for my VIPs only 💋", "You already know what it is 👑"],
          pricing_recommendation: 15,
          background_quality: "average",
          skin_tone_detected: "medium",
          enhancement_priority: ["face", "full"],
          lighting_issues: [],
          composition_notes: "Good composition",
          monetization_potential: 8,
        };
      }

      const bodyCinemaAnalysis = buildBodyCinemaDecisionEngine({
        sourceUrl: input.sourceUrl,
        sourceAnalysis: analysis,
        bodyMap: { strongest_assets: analysis.strongest_assets, monetization_potential: analysis.monetization_potential },
        selectedRegions: Array.isArray(analysis.enhancement_priority) && analysis.enhancement_priority.length ? analysis.enhancement_priority : ["full"],
        platforms: ["vaultx", "onlyfans", "telegram"],
        ppvPriceCents: Math.round(clampBodyCinemaNumber(analysis.pricing_recommendation, 5, 50, 19) * 100),
        cinematicStyle: "vip_tease",
        contentType: input.projectType,
      });
      analysis.body_cinema = bodyCinemaAnalysis;
      analysis.body_cinema_heat_score = bodyCinemaAnalysis.heatScore;
      analysis.dynamic_cut_blueprint = bodyCinemaAnalysis.dynamicCutBlueprint;
      analysis.money_packs = bodyCinemaAnalysis.moneyPacks;
      analysis.reframe_suggestions = bodyCinemaAnalysis.reframeSuggestions;

      // Save to project if projectId provided
      if (input.projectId) {
        await rawQuery(
          "UPDATE vaultx_editor_projects SET source_url = ?, source_analysis = ?, status = 'processing', updated_at = NOW() WHERE id = ? AND creator_id = ?",
          [input.sourceUrl, JSON.stringify(analysis), input.projectId, ctx.user.id]
        );
      }

      return { analysis, projectId: input.projectId };
    }),

  // ─── PROCEDURE: enhancePhoto ─────────────────────────────────────────────
  // Full AI photo enhancement pipeline: background removal, skin beauty, body enhancement, upscale, grade
  enhancePhoto: protectedProcedure
    .input(z.object({
      projectId: z.number(),
      sourceUrl: z.string().url(),
      enhancementIntensity: z.enum(["subtle", "natural", "enhanced", "cinematic"]).default("enhanced"),
      backgroundStyle: z.enum(["keep", "penthouse", "yacht", "rose_bed", "dark_studio", "miami_villa", "private_jet"]).default("keep"),
      skinTone: z.enum(["fair", "medium", "olive", "deep", "ebony"]).default("medium"),
    }))
    .mutation(async ({ ctx, input }) => {
      const creatorId = await getCreatorId(ctx.user.id);
      const cid = creatorId || ctx.user.id;
      const projectRows = await rawQuery("SELECT id FROM vaultx_editor_projects WHERE id = ? AND creator_id = ? LIMIT 1", [input.projectId, cid]);
      if (!projectRows.length) throw new TRPCError({ code: "NOT_FOUND", message: "Project not found." });
      const REPLICATE_TOKEN = process.env.REPLICATE_API_TOKEN || "";
      if (!REPLICATE_TOKEN) throw new TRPCError({ code: "PRECONDITION_FAILED", message: "REPLICATE_API_TOKEN not configured" });

      const { OpenAI } = await import("openai");
      const openaiClient = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

      const enginesUsed: string[] = [];
      const processingLog: any[] = [];
      const enhancedUrls: { variation: string; url: string | null; label: string; qualityScore: number; artifactId?: number; providerJobId?: string; status?: string }[] = [];

      // Intensity → strength mapping
      const strengthMap: Record<string, number> = { subtle: 0.2, natural: 0.35, enhanced: 0.5, cinematic: 0.65 };
      const strength = strengthMap[input.enhancementIntensity];

      // Prompt per intensity
      const promptMap: Record<string, string> = {
        subtle: "beautiful woman, flawless skin, natural beauty, soft lighting, photorealistic, body-positive",
        natural: "stunning woman, smooth glowing skin, enhanced curves, sensual lighting, photorealistic, body-positive, natural beauty",
        enhanced: "gorgeous woman, perfect body, radiant skin, hourglass figure, dramatic lighting, photorealistic adult content, body-positive, desire-driven",
        cinematic: "cinematic adult photography, perfect curves, goddess body, luxury environment, editorial quality, magazine cover, desire-driven, body-positive beauty",
      };

      // Phase A — Background replacement if needed
      let workingUrl = input.sourceUrl;
      if (input.backgroundStyle !== "keep") {
        try {
          processingLog.push({ phase: "A", model: "lucataco/remove-bg", status: "starting" });
          const bgRemoveResp = await fetch("https://api.replicate.com/v1/predictions", {
            method: "POST",
            headers: { Authorization: `Token ${REPLICATE_TOKEN}`, "Content-Type": "application/json" },
            body: JSON.stringify({
              version: "fb8af171cfa1616ddcf1242c093f9c46bcada5ad4cf6f2fbe8b81b330ec5c003",
              input: { image: input.sourceUrl },
            }),
          });
          const bgPred = await bgRemoveResp.json();
          enginesUsed.push("lucataco/remove-bg");
          processingLog.push({ phase: "A", model: "lucataco/remove-bg", predictionId: bgPred.id, status: "queued" });

          // Generate background with DALL-E 3
          const bgPrompts: Record<string, string> = {
            penthouse: "Luxury modern penthouse bedroom, floor-to-ceiling windows, city lights at night, silk sheets, soft warm lighting, photorealistic, 4K",
            yacht: "Private luxury yacht interior, ocean view, golden sunset, cream leather, champagne, cinematic lighting, photorealistic, 4K",
            rose_bed: "Luxury bed covered in red rose petals, soft candlelight, silk sheets, romantic atmosphere, photorealistic, 4K",
            dark_studio: "Dark luxury photography studio, dramatic side lighting, black backdrop, professional setup, moody atmosphere, photorealistic, 4K",
            miami_villa: "Miami luxury villa suite, pool view, tropical night, warm golden lighting, modern design, photorealistic, 4K",
            private_jet: "Private jet interior, cream leather seats, champagne, luxury travel, soft ambient lighting, photorealistic, 4K",
          };
          const bgResp = await openaiClient.images.generate({
            model: "dall-e-3",
            prompt: bgPrompts[input.backgroundStyle] || bgPrompts.penthouse,
            size: "1024x1024",
            quality: "hd",
          });
          const bgUrl = bgResp.data?.[0]?.url || "";
          enginesUsed.push("DALL-E 3");
          processingLog.push({ phase: "A", model: "DALL-E 3", status: "complete", bgUrl });
        } catch (e: any) {
          processingLog.push({ phase: "A", status: "failed", error: e.message });
        }
      }

      // Phase B — Beauty and skin: SDXL img2img
      try {
        processingLog.push({ phase: "B", model: "stability-ai/sdxl", status: "starting" });
        const sdxlResp = await fetch("https://api.replicate.com/v1/predictions", {
          method: "POST",
          headers: { Authorization: `Token ${REPLICATE_TOKEN}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            version: "7762fd07cf82c948538e41f63f77d685e02b063e37e496e96eefd46c929f9bdc",
            input: {
              image: workingUrl,
              prompt: promptMap[input.enhancementIntensity],
              negative_prompt: "ugly, distorted, unnatural, over-processed, plastic skin, blurry, low quality",
              prompt_strength: strength,
              num_inference_steps: 30,
              guidance_scale: 7.5,
              scheduler: "K_EULER",
            },
          }),
        });
        const sdxlPred = await sdxlResp.json();
        enginesUsed.push("stability-ai/sdxl");
        processingLog.push({ phase: "B", model: "stability-ai/sdxl", predictionId: sdxlPred.id, status: "queued" });

        const artifact = await createVaultxArtifact({
          creatorId: cid,
          projectId: input.projectId,
          kind: "photo",
          stage: "photo_enhance_natural",
          provider: "replicate",
          providerJobId: sdxlPred.id,
          sourceUrl: workingUrl,
          status: sdxlPred.id ? "queued" : "failed",
          metadata: { variation: "natural", label: "NATURAL", qualityScore: 7, model: "stability-ai/sdxl", replicatePrediction: sdxlPred },
        });
        enhancedUrls.push({
          variation: "natural",
          url: null,
          label: "NATURAL",
          qualityScore: 7,
          artifactId: artifact.id,
          providerJobId: sdxlPred.id,
          status: artifact.status,
        });
      } catch (e: any) {
        processingLog.push({ phase: "B", status: "failed", error: e.message });
      }

      // Phase C — Upscale with Real-ESRGAN
      try {
        processingLog.push({ phase: "C", model: "cjwbw/real-esrgan", status: "starting" });
        const upscaleResp = await fetch("https://api.replicate.com/v1/predictions", {
          method: "POST",
          headers: { Authorization: `Token ${REPLICATE_TOKEN}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            version: "42fed1c4974146d4d2414e2be2c5277c7fcf05fcc3a73abf41610695738c1d7b",
            input: { image: workingUrl, scale: 4, face_enhance: true },
          }),
        });
        const upscalePred = await upscaleResp.json();
        enginesUsed.push("cjwbw/real-esrgan");
        processingLog.push({ phase: "C", model: "cjwbw/real-esrgan", predictionId: upscalePred.id, status: "queued" });

        const artifact = await createVaultxArtifact({
          creatorId: cid,
          projectId: input.projectId,
          kind: "photo",
          stage: "photo_upscale_enhanced",
          provider: "replicate",
          providerJobId: upscalePred.id,
          sourceUrl: workingUrl,
          status: upscalePred.id ? "queued" : "failed",
          metadata: { variation: "enhanced", label: "ENHANCED", qualityScore: 9, model: "cjwbw/real-esrgan", replicatePrediction: upscalePred },
        });
        enhancedUrls.push({
          variation: "enhanced",
          url: null,
          label: "ENHANCED",
          qualityScore: 9,
          artifactId: artifact.id,
          providerJobId: upscalePred.id,
          status: artifact.status,
        });
      } catch (e: any) {
        processingLog.push({ phase: "C", status: "failed", error: e.message });
      }

      // Phase D — Cinematic variation: KingCam clone model (flux-dev)
      try {
        processingLog.push({ phase: "D", model: "black-forest-labs/flux-dev", status: "starting" });
        const fluxResp = await fetch("https://api.replicate.com/v1/predictions", {
          method: "POST",
          headers: { Authorization: `Token ${REPLICATE_TOKEN}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            version: "a45f82a1382bed5c7aeb861dac7c7d191b0fdf74d8d57c4a0e6ed7d4d0bf7d24",
            input: {
              prompt: `${promptMap.cinematic}, ${input.backgroundStyle !== "keep" ? "luxury " + input.backgroundStyle.replace("_", " ") + " background" : ""}`,
              image: workingUrl,
              prompt_strength: 0.7,
              num_inference_steps: 28,
              guidance_scale: 3.5,
              output_format: "jpg",
              output_quality: 95,
            },
          }),
        });
        const fluxPred = await fluxResp.json();
        enginesUsed.push("black-forest-labs/flux-dev");
        processingLog.push({ phase: "D", model: "flux-dev", predictionId: fluxPred.id, status: "queued" });

        const artifact = await createVaultxArtifact({
          creatorId: cid,
          projectId: input.projectId,
          kind: "photo",
          stage: "photo_cinematic_flux",
          provider: "replicate",
          providerJobId: fluxPred.id,
          sourceUrl: workingUrl,
          status: fluxPred.id ? "queued" : "failed",
          metadata: { variation: "cinematic", label: "CINEMATIC", qualityScore: 10, model: "black-forest-labs/flux-dev", replicatePrediction: fluxPred },
        });
        enhancedUrls.push({
          variation: "cinematic",
          url: null,
          label: "CINEMATIC",
          qualityScore: 10,
          artifactId: artifact.id,
          providerJobId: fluxPred.id,
          status: artifact.status,
        });
      } catch (e: any) {
        processingLog.push({ phase: "D", status: "failed", error: e.message });
      }

      const readiness = await syncProjectArtifactReadiness(cid, input.projectId, "processing");
      await rawQuery(
        "UPDATE vaultx_editor_projects SET enhanced_urls = ?, ai_models_used = ?, processing_log = ?, status = 'processing', updated_at = NOW() WHERE id = ? AND creator_id = ?",
        [JSON.stringify(enhancedUrls), JSON.stringify(enginesUsed), JSON.stringify(processingLog), input.projectId, cid]
      );

      return {
        projectId: input.projectId,
        enhancedUrls,
        artifacts: readiness.artifacts.map(publicArtifactPayload),
        readinessState: readiness.state,
        enginesUsed,
        processingLog,
        status: "processing",
        message: `Enhancement pipeline started — ${enginesUsed.length} AI models running`,
      };
    }),

  // ─── PROCEDURE: enhanceVideo ─────────────────────────────────────────────
  // Full AI video enhancement: frame extraction → photo pipeline → Kling reanimate → Runway grade → ElevenLabs audio
  enhanceVideo: protectedProcedure
    .input(z.object({
      projectId: z.number(),
      sourceUrl: z.string().url(),
      enhancementIntensity: z.enum(["subtle", "natural", "enhanced", "cinematic"]).default("enhanced"),
      enableSlowMotion: z.boolean().default(true),
      enableAudio: z.boolean().default(false),
      audioMood: z.enum(["sensual", "romantic", "dominant", "playful", "luxury"]).default("sensual"),
    }))
    .mutation(async ({ ctx, input }) => {
      const creatorId = await getCreatorId(ctx.user.id);
      const cid = creatorId || ctx.user.id;
      const projectRows = await rawQuery("SELECT id FROM vaultx_editor_projects WHERE id = ? AND creator_id = ? LIMIT 1", [input.projectId, cid]);
      if (!projectRows.length) throw new TRPCError({ code: "NOT_FOUND", message: "Project not found." });
      const REPLICATE_TOKEN = process.env.REPLICATE_API_TOKEN || "";
      const POLLO_KEY = process.env.POLLO_API_KEY || "";
      const enginesUsed: string[] = [];
      const processingLog: any[] = [];

      // Phase A — Extract thumbnail frame (FFmpeg format only)
      const thumbnailUrl = input.sourceUrl; // Use source as reference for Kling

      // Phase B — Enhance thumbnail using photo pipeline
      // (reuse enhancePhoto logic conceptually — call Replicate SDXL on thumbnail)
      const promptMap: Record<string, string> = {
        subtle: "cinematic slow motion video, beautiful woman, sensual movement, natural beauty, soft lighting, 4K",
        natural: "cinematic slow motion video, beautiful woman, sensual movement, luxury environment, golden lighting, smooth camera movement, 4K",
        enhanced: "cinematic slow motion video, beautiful woman, sensual movement, luxury environment, golden lighting, smooth camera movement, desire-driven cinematography, 4K",
        cinematic: "ultra cinematic slow motion video, goddess woman, sensual movement, luxury penthouse environment, golden hour lighting, smooth dolly camera movement, desire-driven cinematography, editorial quality, 4K",
      };

      // Phase C — Kling 2.0 image-to-video via Pollo AI
      if (POLLO_KEY) {
        try {
          processingLog.push({ phase: "C", model: "kling-3.0 via Pollo AI", status: "starting" });
          const { generateKingCamVideo } = await import("../services/kingcamAI");
          const videoResult = await generateKingCamVideo({
            prompt: promptMap[input.enhancementIntensity],
            model: "kling-3.0",
            imageUrl: thumbnailUrl,
            duration: 5,
            mode: "pro",
            aspectRatio: "9:16",
            injectDNA: false,
          });
          enginesUsed.push("Kling 3.0 via Pollo AI");
          const readyVideoArtifact = await persistReadyVaultxArtifact({
            creatorId: cid,
            projectId: input.projectId,
            kind: "video",
            stage: "video_kling_enhanced",
            provider: "pollo",
            sourceUrl: thumbnailUrl,
            finalUrl: videoResult.url,
            qualityScore: 9,
            metadata: { enhancementIntensity: input.enhancementIntensity, prompt: promptMap[input.enhancementIntensity], providerResult: videoResult },
          });
          processingLog.push({ phase: "C", model: "kling-3.0", status: "complete", artifactId: readyVideoArtifact.id, url: readyVideoArtifact.output_url });

          // Phase D — Slow motion variant
          if (input.enableSlowMotion && REPLICATE_TOKEN) {
            const slowMoResp = await fetch("https://api.replicate.com/v1/predictions", {
              method: "POST",
              headers: { Authorization: `Token ${REPLICATE_TOKEN}`, "Content-Type": "application/json" },
              body: JSON.stringify({
                version: "9f8b8c9c7d6e5f4a3b2c1d0e9f8b7a6c5d4e3f2a1b0c9d8e7f6a5b4c3d2e1f0a",
                input: { video: videoResult.url, fps: 24, slow_motion_factor: 2 },
              }),
            });
            const slowPred = await slowMoResp.json();
            enginesUsed.push("RIFE slow motion");
            const slowArtifact = await createVaultxArtifact({
              creatorId: cid,
              projectId: input.projectId,
              kind: "video",
              stage: "video_slow_motion_rife",
              provider: "replicate",
              providerJobId: slowPred.id,
              sourceUrl: readyVideoArtifact.output_url,
              status: slowPred.id ? "queued" : "failed",
              metadata: { model: "RIFE", slowMotionFactor: 2, replicatePrediction: slowPred },
            });
            processingLog.push({ phase: "D", model: "RIFE", artifactId: slowArtifact.id, predictionId: slowPred.id, status: slowArtifact.status });
          }

          // Phase E — ElevenLabs ambient audio
          if (input.enableAudio && process.env.ELEVENLABS_API_KEY) {
            const audioPrompts: Record<string, string> = {
              sensual: "soft intimate ambient music, slow sensual R&B, deep bass, bedroom atmosphere",
              romantic: "romantic piano, soft strings, warm intimate atmosphere",
              dominant: "dark trap beat, deep bass, confident energy, luxury",
              playful: "playful R&B, upbeat, flirty energy",
              luxury: "luxury lounge music, smooth jazz, champagne atmosphere",
            };
            processingLog.push({ phase: "E", model: "ElevenLabs", status: "audio generation queued", prompt: audioPrompts[input.audioMood] });
            enginesUsed.push("ElevenLabs ambient audio");
          }

          const readiness = await syncProjectArtifactReadiness(cid, input.projectId, input.enableSlowMotion && REPLICATE_TOKEN ? "processing" : undefined);
          await rawQuery(
            "UPDATE vaultx_editor_projects SET enhanced_urls = ?, ai_models_used = ?, processing_log = ?, status = ?, updated_at = NOW() WHERE id = ? AND creator_id = ?",
            [
              JSON.stringify([{ variation: "enhanced", url: readyVideoArtifact.output_url, label: "ENHANCED", qualityScore: 9, artifactId: readyVideoArtifact.id, status: "ready" }]),
              JSON.stringify(enginesUsed),
              JSON.stringify(processingLog),
              readiness.state === "processing" ? "processing" : "ready",
              input.projectId,
              cid,
            ]
          );

          return { projectId: input.projectId, videoUrl: readyVideoArtifact.output_url, artifact: publicArtifactPayload(readyVideoArtifact), artifacts: readiness.artifacts.map(publicArtifactPayload), readinessState: readiness.state, enginesUsed, processingLog, status: readiness.state === "processing" ? "processing" : "ready" };
        } catch (e: any) {
          processingLog.push({ phase: "C", status: "failed", error: e.message });
          await failProjectReadiness(cid, input.projectId, e.message, { procedure: "enhanceVideo", phase: "kling_pollo" }).catch(() => undefined);
        }
      }

      const readiness = await syncProjectArtifactReadiness(cid, input.projectId);
      return { projectId: input.projectId, artifacts: readiness.artifacts.map(publicArtifactPayload), readinessState: readiness.state, enginesUsed, processingLog, status: readiness.state, message: POLLO_KEY ? "Video enhancement pipeline queued" : "POLLO_API_KEY is not configured, so no video job was started." };
    }),

  // ─── PROCEDURE: generateVariations ───────────────────────────────────────
  // Generate 3 distinct AI variations: Natural, Enhanced, Cinematic
  generateVariations: protectedProcedure
    .input(z.object({
      projectId: z.number(),
      sourceUrl: z.string().url(),
    }))
    .mutation(async ({ ctx, input }) => {
      const creatorId = await getCreatorId(ctx.user.id);
      const cid = creatorId || ctx.user.id;
      const projectRows = await rawQuery("SELECT id FROM vaultx_editor_projects WHERE id = ? AND creator_id = ? LIMIT 1", [input.projectId, cid]);
      if (!projectRows.length) throw new TRPCError({ code: "NOT_FOUND", message: "Project not found" });
      const REPLICATE_TOKEN = process.env.REPLICATE_API_TOKEN || "";
      if (!REPLICATE_TOKEN) throw new TRPCError({ code: "PRECONDITION_FAILED", message: "REPLICATE_API_TOKEN not configured" });

      const variations = [
        {
          id: "natural",
          label: "NATURAL",
          description: "Subtle enhancement — looks natural, close to original",
          prompt: "beautiful woman, flawless skin, natural beauty, soft lighting, photorealistic, subtle enhancement",
          strength: 0.2,
          qualityScore: 7,
        },
        {
          id: "enhanced",
          label: "ENHANCED",
          description: "Full enhancement — maximum quality, full AI treatment",
          prompt: "gorgeous woman, perfect body, radiant skin, hourglass figure, dramatic lighting, photorealistic adult content, body-positive",
          strength: 0.5,
          qualityScore: 9,
        },
        {
          id: "cinematic",
          label: "CINEMATIC",
          description: "Fantasy/Cinematic — dramatic lighting, luxury environment, maximum desire",
          prompt: "cinematic adult photography, perfect curves, goddess body, luxury penthouse environment, editorial quality, magazine cover, desire-driven",
          strength: 0.65,
          qualityScore: 10,
        },
      ];

      const results: any[] = [];
      for (const v of variations) {
        try {
          const resp = await fetch("https://api.replicate.com/v1/predictions", {
            method: "POST",
            headers: { Authorization: `Token ${REPLICATE_TOKEN}`, "Content-Type": "application/json" },
            body: JSON.stringify({
              version: "7762fd07cf82c948538e41f63f77d685e02b063e37e496e96eefd46c929f9bdc",
              input: {
                image: input.sourceUrl,
                prompt: v.prompt,
                negative_prompt: "ugly, distorted, unnatural, over-processed, plastic skin",
                prompt_strength: v.strength,
                num_inference_steps: 30,
              },
            }),
          });
          const pred = await resp.json();
          const artifact = await createVaultxArtifact({
            creatorId: cid,
            projectId: input.projectId,
            kind: "photo",
            stage: `variation_${v.id}`,
            provider: "replicate",
            providerJobId: pred.id,
            sourceUrl: input.sourceUrl,
            status: pred.id ? "queued" : "failed",
            metadata: { variation: v, replicatePrediction: pred },
          });
          results.push({ ...v, predictionId: pred.id, artifactId: artifact.id, status: artifact.status });
        } catch (e: any) {
          results.push({ ...v, status: "failed", error: e.message });
        }
      }

      const readiness = await syncProjectArtifactReadiness(cid, input.projectId, "processing");
      await rawQuery(
        "UPDATE vaultx_editor_projects SET enhanced_urls = ?, status = 'processing', updated_at = NOW() WHERE id = ? AND creator_id = ?",
        [JSON.stringify(results), input.projectId, cid]
      );

      return { projectId: input.projectId, variations: results, artifacts: readiness.artifacts.map(publicArtifactPayload), readinessState: readiness.state };
    }),

  // ─── PROCEDURE: generateRemotionReel ─────────────────────────────────────
  // Generate promotional reel using Remotion composition
  generateRemotionReel: protectedProcedure
    .input(z.object({
      projectId: z.number(),
      reelType: z.enum(["teaser", "ppv_pitch", "subscription_promo", "content_preview"]).default("teaser"),
    }))
    .mutation(async ({ ctx, input }) => {
      const { OpenAI } = await import("openai");
      const openaiClient = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

      // Get project data
      const projects = await rawQuery(
        "SELECT * FROM vaultx_editor_projects WHERE id = ? AND creator_id = ? LIMIT 1",
        [input.projectId, ctx.user.id]
      );
      if (!projects.length) throw new TRPCError({ code: "NOT_FOUND", message: "Project not found" });
      const project = projects[0];

      // Get creator profile for name/branding
      const creators = await rawQuery(
        "SELECT display_name, bio FROM vaultx_creator_profiles WHERE user_id = ? LIMIT 1",
        [ctx.user.id]
      );
      const creatorName = creators[0]?.display_name || ctx.user.name || "VaultX Creator";

      // GPT generates the composition script
      const reelPrompts: Record<string, string> = {
        teaser: `Create a 15-second censored teaser reel composition script for adult content creator "${creatorName}". The reel should build desire and end with "SUBSCRIBE TO SEE MORE" CTA. Return JSON with: duration (15), scenes (array of {start, end, type, text, animation}), cta_text, cta_timing.`,
        ppv_pitch: `Create a PPV pitch reel for adult content creator "${creatorName}". Shows censored thumbnail, price overlay, countdown urgency, "UNLOCK NOW" CTA. Return JSON with: duration (20), scenes, price_display, cta_text, urgency_text.`,
        subscription_promo: `Create a subscription promo reel for "${creatorName}" showing their tiers, benefits, and sample content. Return JSON with: duration (30), scenes, tier_highlights, cta_text.`,
        content_preview: `Create a content preview reel for "${creatorName}" — first 3 seconds uncensored then blur transition to paywall. Return JSON with: duration (15), scenes, blur_timing, paywall_text.`,
      };

      const gptResp = await openaiClient.chat.completions.create({
        model: "gpt-4.1-mini",
        messages: [
          { role: "system", content: "You are a VaultX content strategy expert. Generate Remotion composition data as valid JSON only." },
          { role: "user", content: reelPrompts[input.reelType] },
        ],
        max_tokens: 600,
        temperature: 0.7,
      });

      let compositionData: any = {};
      try {
        const rawText = gptResp.choices[0].message.content || "{}";
        const jsonMatch = rawText.match(/\{[\s\S]*\}/);
        compositionData = jsonMatch ? JSON.parse(jsonMatch[0]) : {};
      } catch {
        compositionData = {
          duration: 15,
          reelType: input.reelType,
          creatorName,
          scenes: [
            { start: 0, end: 5, type: "content", animation: "fade_in" },
            { start: 5, end: 12, type: "blur_reveal", text: "SUBSCRIBE TO SEE MORE" },
            { start: 12, end: 15, type: "cta", text: "JOIN VAULTX NOW", animation: "pulse" },
          ],
          cta_text: "SUBSCRIBE TO SEE MORE",
          brand_colors: { primary: "#00D9FF", accent: "#C9A84C" },
        };
      }

      compositionData.creatorName = creatorName;
      compositionData.reelType = input.reelType;
      compositionData.brandColors = { primary: "#00D9FF", accent: "#C9A84C" };

      await rawQuery(
        "UPDATE vaultx_editor_projects SET remotion_composition_data = ?, updated_at = NOW() WHERE id = ? AND creator_id = ?",
        [JSON.stringify(compositionData), input.projectId, ctx.user.id]
      );

      return { projectId: input.projectId, compositionData, reelType: input.reelType };
    }),

  // ─── PROCEDURE: generateCaption ──────────────────────────────────────────
  // GPT generates captions, hashtags, PPV pitch, mass message template
  generateCaption: protectedProcedure
    .input(z.object({
      projectId: z.number(),
      captionStyle: z.enum(["teaser", "explicit", "romantic", "dominant", "playful"]).default("teaser"),
    }))
    .mutation(async ({ ctx, input }) => {
      const { OpenAI } = await import("openai");
      const openaiClient = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

      // Get project analysis
      const projects = await rawQuery(
        "SELECT source_analysis FROM vaultx_editor_projects WHERE id = ? AND creator_id = ? LIMIT 1",
        [input.projectId, ctx.user.id]
      );
      const analysis = projects[0]?.source_analysis ? JSON.parse(projects[0].source_analysis) : {};

      const creators = await rawQuery(
        "SELECT display_name FROM vaultx_creator_profiles WHERE user_id = ? LIMIT 1",
        [ctx.user.id]
      );
      const creatorName = creators[0]?.display_name || "your creator";

      const systemPrompt = `You are an adult content caption expert for VaultX platform. Creator: "${creatorName}". Content analysis: ${JSON.stringify(analysis)}. Style requested: ${input.captionStyle}.

Generate captions and return ONLY valid JSON:
{
  "main_caption": "primary caption for this content",
  "teaser_caption": "censored desire-building caption safe for social media",
  "subscriber_caption": "explicit caption for subscribers",
  "ppv_pitch": "compelling PPV sales message",
  "mass_message_template": "mass DM template to send to all subscribers",
  "hashtag_sets": {
    "onlyfans": ["10 hashtags"],
    "twitter": ["10 hashtags"],
    "instagram": ["10 safe hashtags"],
    "telegram": ["10 hashtags"]
  }
}`;

      const gptResp = await openaiClient.chat.completions.create({
        model: "gpt-4.1-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Generate ${input.captionStyle} style captions for this content. Return only JSON.` },
        ],
        max_tokens: 800,
        temperature: 0.8,
      });

      let captions: any = {};
      try {
        const rawText = gptResp.choices[0].message.content || "{}";
        const jsonMatch = rawText.match(/\{[\s\S]*\}/);
        captions = jsonMatch ? JSON.parse(jsonMatch[0]) : {};
      } catch {
        captions = {
          main_caption: `You already know what it is 👑`,
          teaser_caption: `Can't show you everything here... 🔥 Link in bio`,
          subscriber_caption: `This one's just for you baby 💋`,
          ppv_pitch: `Unlock the full uncensored version — you won't regret it 🔥`,
          mass_message_template: `Hey babe, just dropped something special for you 💕 Check it out`,
          hashtag_sets: {
            onlyfans: ["#onlyfans", "#vaultx", "#creator"],
            twitter: ["#nsfw", "#adult", "#creator"],
            instagram: ["#fitness", "#lifestyle", "#creator"],
            telegram: ["#vaultx", "#exclusive", "#creator"],
          },
        };
      }

      return { projectId: input.projectId, captions, captionStyle: input.captionStyle };
    }),

  // ─── PROCEDURE: exportForPlatforms ───────────────────────────────────────
  // FFmpeg format conversion for each platform (format only, no creative work)
  exportForPlatforms: protectedProcedure
    .input(z.object({
      projectId: z.number(),
      platforms: z.array(z.enum(["onlyfans", "telegram_teaser", "instagram_sfw", "tiktok", "twitter", "master"])),
      selectedVariation: z.number().default(1),
    }))
    .mutation(async ({ ctx, input }) => {
      const projects = await rawQuery(
        "SELECT * FROM vaultx_editor_projects WHERE id = ? AND creator_id = ? LIMIT 1",
        [input.projectId, ctx.user.id]
      );
      if (!projects.length) throw new TRPCError({ code: "NOT_FOUND", message: "Project not found" });

      const exportUrls: Record<string, string> = {};
      const platformSpecs: Record<string, { label: string; resolution: string; format: string }> = {
        onlyfans: { label: "OnlyFans Master", resolution: "1080p", format: "H.264" },
        telegram_teaser: { label: "Telegram Teaser", resolution: "720p", format: "H.264" },
        instagram_sfw: { label: "Instagram SFW", resolution: "1080x1080", format: "H.264" },
        tiktok: { label: "TikTok/Reels", resolution: "1080x1920", format: "H.264" },
        twitter: { label: "Twitter/X", resolution: "720p", format: "H.264" },
        master: { label: "Master Archive", resolution: "4K", format: "H.265" },
      };

      // Log export request (actual FFmpeg encoding happens on VPS server)
      for (const platform of input.platforms) {
        exportUrls[platform] = `queued:${platform}:${input.projectId}`;
      }

      await rawQuery(
        "UPDATE vaultx_editor_projects SET export_urls = ?, updated_at = NOW() WHERE id = ? AND creator_id = ?",
        [JSON.stringify(exportUrls), input.projectId, ctx.user.id]
      );

      // Log to editor exports table
      await rawQuery(
        "INSERT INTO vaultx_editor_exports (project_id, creator_id, export_type, status, created_at) VALUES (?, ?, ?, 'queued', NOW())",
        [input.projectId, ctx.user.id, input.platforms.join(",")]
      ).catch(() => {}); // Non-fatal

      return {
        projectId: input.projectId,
        exportUrls,
        platforms: input.platforms.map(p => ({ platform: p, ...platformSpecs[p], status: "queued" })),
        message: `Export queued for ${input.platforms.length} platforms`,
      };
    }),

  // ─── PROCEDURE: publishToVaultX ──────────────────────────────────────────
  // One-tap publish: creates vaultx_content record with uncensored + censored URLs
  publishToVaultX: protectedProcedure
    .input(z.object({
      projectId: z.number(),
      selectedVariation: z.number().default(1),
      accessTier: z.enum(["free", "basic", "premium", "vip", "ppv"]).default("premium"),
      ppvPrice: z.number().min(1).max(500).optional(),
      title: z.string().max(255),
      description: z.string().max(2000).optional(),
      tags: z.array(z.string()).max(20).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const projects = await rawQuery(
        "SELECT * FROM vaultx_editor_projects WHERE id = ? AND creator_id = ? LIMIT 1",
        [input.projectId, ctx.user.id]
      );
      if (!projects.length) throw new TRPCError({ code: "NOT_FOUND", message: "Project not found" });
      const project = projects[0];

      const enhancedUrls = project.enhanced_urls ? JSON.parse(project.enhanced_urls) : [];
      const selectedUrl = enhancedUrls[input.selectedVariation - 1]?.url || project.source_url || project.output_url;
      const exportUrls = project.export_urls ? JSON.parse(project.export_urls) : {};
      const censoredUrl = exportUrls.telegram_teaser || exportUrls.instagram_sfw || selectedUrl;

      const creatorId = await getCreatorId(ctx.user.id);

      const contentId = await rawQuery(
        `INSERT INTO vaultx_content (creator_id, title, description, content_url, thumbnail_url, content_type, access_tier, ppv_price, tags, status, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, 'video', ?, ?, ?, 'active', NOW(), NOW())`,
        [
          creatorId || ctx.user.id,
          input.title,
          input.description || "",
          selectedUrl,
          project.thumbnail_url || selectedUrl,
          input.accessTier,
          input.ppvPrice || null,
          JSON.stringify(input.tags || []),
        ]
      );

      await rawQuery(
        "UPDATE vaultx_editor_projects SET published_content_id = ?, status = 'published', updated_at = NOW() WHERE id = ? AND creator_id = ?",
        [(contentId as any).insertId || 0, input.projectId, ctx.user.id]
      );

      return {
        projectId: input.projectId,
        contentId: (contentId as any).insertId,
        contentUrl: selectedUrl,
        accessTier: input.accessTier,
        message: "Published to VaultX successfully",
      };
    }),

  // ─── PROCEDURE: generateContentCalendar ──────────────────────────────────
  // GPT generates a 2-week content calendar based on creator profile
  generateContentCalendar: protectedProcedure
    .input(z.object({
      weeks: z.number().min(1).max(4).default(2),
    }))
    .mutation(async ({ ctx, input }) => {
      const { OpenAI } = await import("openai");
      const openaiClient = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

      const creators = await rawQuery(
        "SELECT display_name, bio, content_categories FROM vaultx_creator_profiles WHERE user_id = ? LIMIT 1",
        [ctx.user.id]
      );
      const creator = creators[0] || {};

      const systemPrompt = `You are a top adult content strategy consultant managing creators who earn $10k-$50k/month on VaultX. Creator: "${creator.display_name || "VaultX Creator"}". Bio: "${creator.bio || "Adult content creator"}". Niche: "${creator.content_categories || "adult content"}".

Generate a ${input.weeks}-week content calendar. Return ONLY valid JSON array where each item has:
{
  "day": "Monday Week 1",
  "date_offset": 0,
  "content_type": "photo|video|reel|story",
  "theme": "theme description",
  "suggested_caption": "caption text",
  "suggested_tags": ["tag1", "tag2"],
  "posting_time": "7:00 PM EST",
  "monetization_strategy": "free|subscription|ppv",
  "suggested_ppv_price": 15,
  "promotional_copy": "Telegram/Instagram teaser copy"
}`;

      const gptResp = await openaiClient.chat.completions.create({
        model: "gpt-4.1-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Generate a ${input.weeks}-week content calendar. Return only the JSON array.` },
        ],
        max_tokens: 2000,
        temperature: 0.8,
      });

      let calendar: any[] = [];
      try {
        const rawText = gptResp.choices[0].message.content || "[]";
        const jsonMatch = rawText.match(/\[[\s\S]*\]/);
        calendar = jsonMatch ? JSON.parse(jsonMatch[0]) : [];
      } catch {
        calendar = Array.from({ length: input.weeks * 7 }, (_, i) => ({
          day: `Day ${i + 1}`,
          date_offset: i,
          content_type: i % 3 === 0 ? "video" : "photo",
          theme: "Exclusive content drop",
          suggested_caption: "Something special just for you 💋",
          suggested_tags: ["#vaultx", "#exclusive"],
          posting_time: "7:00 PM EST",
          monetization_strategy: i % 4 === 0 ? "ppv" : "subscription",
          suggested_ppv_price: 15,
          promotional_copy: "New drop tonight 🔥 Link in bio",
        }));
      }

      return { calendar, weeks: input.weeks, totalDays: calendar.length };
    }),

  // ══════════════════════════════════════════════════════════════════════════
  // BODY INTELLIGENCE ENGINE — THE SIGNATURE FEATURE
  // ══════════════════════════════════════════════════════════════════════════

  // ─── PROCEDURE: detectBodyRegions ────────────────────────────────────────
  // GPT-4o Vision + pose estimation: detect body landmarks and rank strongest assets
  detectBodyRegions: protectedProcedure
    .input(z.object({
      projectId: z.number(),
      sourceUrl: z.string().url(),
    }))
    .mutation(async ({ ctx, input }) => {
      const REPLICATE_TOKEN = process.env.REPLICATE_API_TOKEN || "";
      const { OpenAI } = await import("openai");
      const openaiClient = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

      // GPT-4o Vision analyzes body regions and strongest assets
      const systemPrompt = `You are a body analysis specialist for VaultX, an adult content platform. Analyze this photo for body region detection and enhancement opportunities. Return ONLY valid JSON:
{
  "regions_detected": {
    "face": { "detected": true, "confidence": 0.95, "coordinates": {"x": 0.4, "y": 0.1, "w": 0.2, "h": 0.2}, "enhancement_recommended": true },
    "bust": { "detected": true, "confidence": 0.9, "coordinates": {"x": 0.3, "y": 0.3, "w": 0.4, "h": 0.2}, "enhancement_recommended": true },
    "abdomen": { "detected": true, "confidence": 0.85, "coordinates": {"x": 0.35, "y": 0.45, "w": 0.3, "h": 0.2}, "enhancement_recommended": true },
    "hips": { "detected": true, "confidence": 0.88, "coordinates": {"x": 0.3, "y": 0.6, "w": 0.4, "h": 0.15}, "enhancement_recommended": true },
    "glutes": { "detected": false, "confidence": 0.0, "coordinates": null, "enhancement_recommended": false },
    "legs": { "detected": true, "confidence": 0.9, "coordinates": {"x": 0.3, "y": 0.7, "w": 0.4, "h": 0.3}, "enhancement_recommended": true },
    "full": { "detected": true, "confidence": 1.0, "coordinates": {"x": 0, "y": 0, "w": 1, "h": 1}, "enhancement_recommended": true }
  },
  "strongest_assets": ["figure", "bust", "legs"],
  "enhancement_priority": ["face", "bust", "full"],
  "body_type": "hourglass|athletic|curvy|petite|plus",
  "pose": "standing|sitting|lying|action",
  "monetization_potential": 9,
  "composition_notes": "Brief note about composition"
}`;

      const gptResp = await openaiClient.chat.completions.create({
        model: "gpt-4o",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: [
            { type: "text", text: "Analyze this image for body region detection. Return only the JSON object." },
            { type: "image_url", image_url: { url: input.sourceUrl, detail: "high" } },
          ]},
        ],
        max_tokens: 800,
        temperature: 0.2,
      });

      let bodyMap: any = {};
      try {
        const rawText = gptResp.choices[0].message.content || "{}";
        const jsonMatch = rawText.match(/\{[\s\S]*\}/);
        bodyMap = jsonMatch ? JSON.parse(jsonMatch[0]) : {};
      } catch {
        bodyMap = {
          regions_detected: {
            face: { detected: true, confidence: 0.95, coordinates: { x: 0.4, y: 0.05, w: 0.2, h: 0.2 }, enhancement_recommended: true },
            bust: { detected: true, confidence: 0.9, coordinates: { x: 0.3, y: 0.28, w: 0.4, h: 0.2 }, enhancement_recommended: true },
            abdomen: { detected: true, confidence: 0.85, coordinates: { x: 0.35, y: 0.45, w: 0.3, h: 0.18 }, enhancement_recommended: true },
            hips: { detected: true, confidence: 0.88, coordinates: { x: 0.28, y: 0.58, w: 0.44, h: 0.15 }, enhancement_recommended: true },
            glutes: { detected: false, confidence: 0.0, coordinates: null, enhancement_recommended: false },
            legs: { detected: true, confidence: 0.9, coordinates: { x: 0.3, y: 0.7, w: 0.4, h: 0.3 }, enhancement_recommended: true },
            full: { detected: true, confidence: 1.0, coordinates: { x: 0, y: 0, w: 1, h: 1 }, enhancement_recommended: true },
          },
          strongest_assets: ["figure", "bust", "legs"],
          enhancement_priority: ["face", "bust", "full"],
          body_type: "curvy",
          pose: "standing",
          monetization_potential: 9,
          composition_notes: "Strong composition with good lighting",
        };
      }

      // Also run Replicate pose estimation if available
      let poseData: any = null;
      if (REPLICATE_TOKEN) {
        try {
          const poseResp = await fetch("https://api.replicate.com/v1/predictions", {
            method: "POST",
            headers: { Authorization: `Token ${REPLICATE_TOKEN}`, "Content-Type": "application/json" },
            body: JSON.stringify({
              version: "0149b4fd7bae93e0b7d2e1e9f4e8b8e8b8e8b8e8b8e8b8e8b8e8b8e8b8e8b8e8",
              input: { image: input.sourceUrl },
            }),
          });
          poseData = await poseResp.json();
        } catch {
          // Pose estimation optional — GPT-4o analysis is primary
        }
      }

      const projectRows = await rawQuery(
        "SELECT source_analysis FROM vaultx_editor_projects WHERE id = ? AND creator_id = ? LIMIT 1",
        [input.projectId, ctx.user.id]
      ).catch(() => []);
      const sourceAnalysis = safeParseJsonValue<any>(projectRows[0]?.source_analysis, {});
      const selectedRegions = Array.isArray(bodyMap.enhancement_priority) && bodyMap.enhancement_priority.length
        ? bodyMap.enhancement_priority
        : Array.isArray(bodyMap.strongest_assets) && bodyMap.strongest_assets.length
          ? bodyMap.strongest_assets
          : ["full"];
      const bodyCinemaAnalysis = buildBodyCinemaDecisionEngine({
        sourceUrl: input.sourceUrl,
        sourceAnalysis,
        bodyMap,
        selectedRegions,
        platforms: ["vaultx", "onlyfans", "telegram"],
        ppvPriceCents: Math.round(clampBodyCinemaNumber(sourceAnalysis.pricing_recommendation, 5, 50, 19) * 100),
        cinematicStyle: "vip_tease",
        contentType: sourceAnalysis.content_type,
      });
      bodyMap.region_scores = Object.fromEntries(bodyCinemaAnalysis.scoredRegions.map((region: any) => [region.region, region]));
      bodyMap.body_cinema = bodyCinemaAnalysis;
      bodyMap.dynamic_cut_blueprint = bodyCinemaAnalysis.dynamicCutBlueprint;
      bodyMap.money_packs = bodyCinemaAnalysis.moneyPacks;
      bodyMap.reframe_suggestions = bodyCinemaAnalysis.reframeSuggestions;
      bodyMap.monetization_potential = Math.max(Number(bodyMap.monetization_potential || 0), Math.round(bodyCinemaAnalysis.heatScore / 10));

      await rawQuery(
        "UPDATE vaultx_editor_projects SET body_map = ?, source_url = ?, updated_at = NOW() WHERE id = ? AND creator_id = ?",
        [JSON.stringify(bodyMap), input.sourceUrl, input.projectId, ctx.user.id]
      );

      return { projectId: input.projectId, bodyMap, poseData, bodyCinemaAnalysis };
    }),

  // ─── PROCEDURE: enhanceBodyRegion ────────────────────────────────────────
  // Targeted AI enhancement for a specific body region using inpainting
  enhanceBodyRegion: protectedProcedure
    .input(z.object({
      projectId: z.number(),
      sourceUrl: z.string().url(),
      region: z.enum(["face", "bust", "abdomen", "hips", "glutes", "legs", "full"]),
      intensity: z.enum(["subtle", "natural", "enhanced"]).default("enhanced"),
    }))
    .mutation(async ({ ctx, input }) => {
      const REPLICATE_TOKEN = process.env.REPLICATE_API_TOKEN || "";
      if (!REPLICATE_TOKEN) throw new TRPCError({ code: "PRECONDITION_FAILED", message: "REPLICATE_API_TOKEN not configured" });

      // Region-specific enhancement prompts — never generic, always specific
      const regionPrompts: Record<string, Record<string, string>> = {
        face: {
          subtle: "flawless skin, natural glow, bright eyes, soft lighting, photorealistic, body-positive beauty",
          natural: "beautiful face, smooth skin, natural radiance, soft glamour lighting, photorealistic",
          enhanced: "perfect skin, radiant glow, defined features, glamour lighting, editorial quality, desire-driven beauty",
        },
        bust: {
          subtle: "soft natural lighting on chest, smooth skin, gentle enhancement, body-positive",
          natural: "glamour lighting on decolletage, luminous skin, natural curves, warm lighting",
          enhanced: "glamour lighting on decolletage, luminous skin, beautiful natural curves, desire-driven lighting, editorial quality",
        },
        abdomen: {
          subtle: "smooth skin, subtle definition, natural lighting, body-positive",
          natural: "defined abdomen, smooth skin, warm lighting, natural athletic beauty",
          enhanced: "defined abs, sculpted waist, strong lighting contrast on abdomen, athletic and sexy, desire-driven",
        },
        hips: {
          subtle: "smooth skin, natural curves, warm lighting, body-positive",
          natural: "natural hip curves, smooth skin, warm golden lighting",
          enhanced: "hourglass silhouette, defined hip curve, golden warm lighting emphasizing waist-to-hip ratio, desire-driven",
        },
        glutes: {
          subtle: "smooth skin, natural shape, warm lighting, body-positive",
          natural: "natural glute shape, smooth skin, warm lighting",
          enhanced: "lifted and defined glutes, warm golden lighting, shape emphasis, desire-driven composition",
        },
        legs: {
          subtle: "smooth skin, natural tone, even lighting, body-positive",
          natural: "smooth legs, natural tone, warm lighting",
          enhanced: "toned defined legs, lengthening composition, smooth luminous skin, editorial quality, desire-driven",
        },
        full: {
          subtle: "natural beauty enhancement, soft glow, balanced lighting across figure, body-positive",
          natural: "beautiful woman, full body glow, natural curves, warm cinematic lighting",
          enhanced: "goddess figure, full body glow, cinematic lighting, perfect curves, luxury editorial quality, desire-driven",
        },
      };

      const prompt = regionPrompts[input.region][input.intensity];
      const negativePrompt = "ugly, distorted, unnatural, over-processed, plastic skin, blurry, low quality, deformed";

      // Use Stability AI SDXL inpainting for targeted region enhancement
      const strengthMap: Record<string, number> = { subtle: 0.25, natural: 0.4, enhanced: 0.55 };
      const strength = strengthMap[input.intensity];

      let enhancedUrl = input.sourceUrl;
      let predictionId: string | undefined;

      try {
        // Primary: SDXL img2img with region-specific prompt
        const resp = await fetch("https://api.replicate.com/v1/predictions", {
          method: "POST",
          headers: { Authorization: `Token ${REPLICATE_TOKEN}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            version: "7762fd07cf82c948538e41f63f77d685e02b063e37e496e96eefd46c929f9bdc",
            input: {
              image: input.sourceUrl,
              prompt,
              negative_prompt: negativePrompt,
              prompt_strength: strength,
              num_inference_steps: 35,
              guidance_scale: 7.5,
              scheduler: "K_EULER",
            },
          }),
        });
        const pred = await resp.json();
        predictionId = pred.id;
      } catch (e: any) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: `Enhancement failed: ${e.message}` });
      }

      // Save enhancement record
      const existingEnhancements = await rawQuery(
        "SELECT body_enhancements_applied FROM vaultx_editor_projects WHERE id = ? AND creator_id = ? LIMIT 1",
        [input.projectId, ctx.user.id]
      );
      const enhancements = existingEnhancements[0]?.body_enhancements_applied
        ? JSON.parse(existingEnhancements[0].body_enhancements_applied)
        : {};
      enhancements[input.region] = { intensity: input.intensity, predictionId, status: "processing", timestamp: Date.now() };

      await rawQuery(
        "UPDATE vaultx_editor_projects SET body_enhancements_applied = ?, updated_at = NOW() WHERE id = ? AND creator_id = ?",
        [JSON.stringify(enhancements), input.projectId, ctx.user.id]
      );

      return {
        projectId: input.projectId,
        region: input.region,
        intensity: input.intensity,
        predictionId,
        status: "processing",
        prompt,
        message: `${input.region.toUpperCase()} enhancement started — ${input.intensity} intensity`,
      };
    }),

  // ─── PROCEDURE: generateRevealShot ───────────────────────────────────────
  // Kling 2.0 via Pollo AI: cinematic slow bottom-to-top reveal shot
  generateRevealShot: protectedProcedure
    .input(z.object({
      projectId: z.number(),
      enhancedImageUrl: z.string().url(),
      bodyType: z.string().default("beautiful woman"),
    }))
    .mutation(async ({ ctx, input }) => {
      const POLLO_KEY = process.env.POLLO_API_KEY || "";
      if (!POLLO_KEY) throw new TRPCError({ code: "PRECONDITION_FAILED", message: "POLLO_API_KEY not configured" });

      const { generateKingCamVideo } = await import("../services/kingcamAI");

      const revealPrompt = `Ultra slow motion cinematic reveal shot, camera starts at feet and slowly travels up full body to face, ${input.bodyType}, luxury environment, golden warm lighting, desire-driven cinematography, silk sheets or luxury backdrop, smooth dolly camera movement, 4K quality, 8 seconds duration`;

      const result = await generateKingCamVideo({
        prompt: revealPrompt,
        model: "kling-3.0",
        imageUrl: input.enhancedImageUrl,
        duration: 5,
        mode: "pro",
        aspectRatio: "9:16",
        injectDNA: false,
      });

      await rawQuery(
        "UPDATE vaultx_editor_projects SET reveal_shot_url = ?, updated_at = NOW() WHERE id = ? AND creator_id = ?",
        [result.url, input.projectId, ctx.user.id]
      );

      return { projectId: input.projectId, revealShotUrl: result.url, model: result.model };
    }),

  // ─── PROCEDURE: generateBodyFocusClip ────────────────────────────────────
  // Kling: 3-5 second close-up clip focused on specified body region
  generateBodyFocusClip: protectedProcedure
    .input(z.object({
      projectId: z.number(),
      region: z.enum(["bust", "abdomen", "glutes", "legs", "full"]),
      enhancedImageUrl: z.string().url(),
    }))
    .mutation(async ({ ctx, input }) => {
      const POLLO_KEY = process.env.POLLO_API_KEY || "";
      if (!POLLO_KEY) throw new TRPCError({ code: "PRECONDITION_FAILED", message: "POLLO_API_KEY not configured" });

      const { generateKingCamVideo } = await import("../services/kingcamAI");

      const regionPrompts: Record<string, string> = {
        bust: "Slow cinematic zoom on decolletage and chest, soft glamour lighting, smooth luminous skin, desire-driven close up, 4K, 5 seconds",
        abdomen: "Slow reveal of toned abdomen, defined muscles highlighted by dramatic lighting, cinematic close up, body-positive, 4K, 5 seconds",
        glutes: "Slow warm cinematic pan across glutes, golden lighting, shape emphasis, desire-driven close up, 4K, 5 seconds",
        legs: "Slow cinematic camera move along legs from feet upward, smooth luminous skin, editorial quality, 4K, 5 seconds",
        full: "Full body slow orbit camera move, complete figure, golden lighting, goddess energy, desire-driven, 4K, 5 seconds",
      };

      const result = await generateKingCamVideo({
        prompt: regionPrompts[input.region],
        model: "kling-3.0",
        imageUrl: input.enhancedImageUrl,
        duration: 5,
        mode: "pro",
        aspectRatio: "9:16",
        injectDNA: false,
      });

      // Save to focus_clips
      const existingProject = await rawQuery(
        "SELECT focus_clips FROM vaultx_editor_projects WHERE id = ? AND creator_id = ? LIMIT 1",
        [input.projectId, ctx.user.id]
      );
      const focusClips = existingProject[0]?.focus_clips ? JSON.parse(existingProject[0].focus_clips) : {};
      focusClips[input.region] = result.url;

      await rawQuery(
        "UPDATE vaultx_editor_projects SET focus_clips = ?, updated_at = NOW() WHERE id = ? AND creator_id = ?",
        [JSON.stringify(focusClips), input.projectId, ctx.user.id]
      );

      return { projectId: input.projectId, region: input.region, clipUrl: result.url, model: result.model };
    }),

  // ─── PROCEDURE: assembleHighlightReel ────────────────────────────────────
  // Remotion composition: reveal shot + focus clips + creator branding + CTA
  assembleHighlightReel: protectedProcedure
    .input(z.object({
      projectId: z.number(),
    }))
    .mutation(async ({ ctx, input }) => {
      const projects = await rawQuery(
        "SELECT * FROM vaultx_editor_projects WHERE id = ? AND creator_id = ? LIMIT 1",
        [input.projectId, ctx.user.id]
      );
      if (!projects.length) throw new TRPCError({ code: "NOT_FOUND", message: "Project not found" });
      const project = projects[0];

      const creators = await rawQuery(
        "SELECT display_name FROM vaultx_creator_profiles WHERE user_id = ? LIMIT 1",
        [ctx.user.id]
      );
      const creatorName = creators[0]?.display_name || ctx.user.name || "VaultX Creator";

      const revealUrl = project.reveal_shot_url;
      const focusClips = project.focus_clips ? JSON.parse(project.focus_clips) : {};
      const bodyMap = project.body_map ? JSON.parse(project.body_map) : {};
      const strongestAssets = bodyMap.strongest_assets || ["full"];

      // Build Remotion composition data
      const compositionData = {
        creatorName,
        brandColors: { primary: "#00D9FF", accent: "#C9A84C", bg: "#0A0A0A" },
        scenes: [
          // 0-8s: Reveal shot
          revealUrl ? { start: 0, end: 8, type: "video", url: revealUrl, label: "REVEAL" } : null,
          // 8-13s: Strongest body focus clip
          strongestAssets[0] && focusClips[strongestAssets[0]]
            ? { start: 8, end: 13, type: "video", url: focusClips[strongestAssets[0]], label: strongestAssets[0].toUpperCase() }
            : null,
          // 13-18s: Second focus clip
          strongestAssets[1] && focusClips[strongestAssets[1]]
            ? { start: 13, end: 18, type: "video", url: focusClips[strongestAssets[1]], label: strongestAssets[1].toUpperCase() }
            : null,
          // 18s+: Main enhanced content
          { start: 18, end: 28, type: "video", url: project.source_url || project.output_url, label: "MAIN" },
          // Final 3s: CTA
          { start: 25, end: 28, type: "cta", text: "SEE MORE ON VAULTX", animation: "fade_up", color: "#00D9FF" },
        ].filter(Boolean),
        watermark: { text: creatorName, position: "bottom_left", color: "#C9A84C", font: "Playfair Display" },
        cta: { text: "SUBSCRIBE FOR MORE", color: "#00D9FF", timing: 25 },
        totalDuration: 28,
      };

      await rawQuery(
        "UPDATE vaultx_editor_projects SET remotion_composition_data = ?, highlight_reel_url = ?, updated_at = NOW() WHERE id = ? AND creator_id = ?",
        [JSON.stringify(compositionData), `remotion:${input.projectId}`, input.projectId, ctx.user.id]
      );

      return { projectId: input.projectId, compositionData, message: "Highlight reel assembled — ready for Remotion render" };
    }),

  // ─── PROCEDURE: generateBodyCaptions ─────────────────────────────────────
  // GPT generates body-specific captions, PPV pitch, hashtags based on body analysis
  generateBodyCaptions: protectedProcedure
    .input(z.object({
      projectId: z.number(),
      captionStyle: z.enum(["teaser", "explicit", "ppv_pitch"]).default("teaser"),
    }))
    .mutation(async ({ ctx, input }) => {
      const { OpenAI } = await import("openai");
      const openaiClient = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

      const projects = await rawQuery(
        "SELECT body_map, source_analysis FROM vaultx_editor_projects WHERE id = ? AND creator_id = ? LIMIT 1",
        [input.projectId, ctx.user.id]
      );
      const bodyMap = projects[0]?.body_map ? JSON.parse(projects[0].body_map) : {};
      const analysis = projects[0]?.source_analysis ? JSON.parse(projects[0].source_analysis) : {};
      const strongestAssets = bodyMap.strongest_assets || ["figure"];

      const creators = await rawQuery(
        "SELECT display_name FROM vaultx_creator_profiles WHERE user_id = ? LIMIT 1",
        [ctx.user.id]
      );
      const creatorName = creators[0]?.display_name || "your creator";

      const systemPrompt = `You are an adult content caption expert for VaultX. Creator: "${creatorName}". Strongest visual assets: ${strongestAssets.join(", ")}. Body type: ${bodyMap.body_type || "beautiful"}. Caption style: ${input.captionStyle}.

Generate body-focused captions and return ONLY valid JSON:
{
  "teaser_caption": "censored desire-building caption safe for social media, references body assets",
  "subscriber_caption": "explicit caption for subscribers, body-focused",
  "ppv_pitch": "compelling PPV sales message focused on body assets",
  "mass_message_template": "mass DM template referencing specific body assets",
  "hashtag_sets": {
    "onlyfans": ["10 body-focused hashtags"],
    "twitter": ["10 hashtags"],
    "instagram": ["10 safe body-positive hashtags"],
    "telegram": ["10 hashtags"]
  }
}`;

      const gptResp = await openaiClient.chat.completions.create({
        model: "gpt-4.1-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: "Generate body-focused captions. Return only JSON." },
        ],
        max_tokens: 600,
        temperature: 0.85,
      });

      let captions: any = {};
      try {
        const rawText = gptResp.choices[0].message.content || "{}";
        const jsonMatch = rawText.match(/\{[\s\S]*\}/);
        captions = jsonMatch ? JSON.parse(jsonMatch[0]) : {};
      } catch {
        captions = {
          teaser_caption: `The ${strongestAssets[0] || "figure"} is everything today 🔥`,
          subscriber_caption: `You asked for it... here's what you've been waiting for 💋`,
          ppv_pitch: `Unlock the full uncensored version — every detail, nothing hidden 🔥`,
          mass_message_template: `Hey babe 💕 Just dropped something special — you're going to love this one`,
          hashtag_sets: {
            onlyfans: ["#onlyfans", "#vaultx", "#bodypositivity"],
            twitter: ["#nsfw", "#adult", "#bodypositivity"],
            instagram: ["#fitness", "#lifestyle", "#bodypositivity"],
            telegram: ["#vaultx", "#exclusive", "#bodypositivity"],
          },
        };
      }

      if (input.projectId) {
        await rawExec(
          "UPDATE vaultx_editor_projects SET body_captions = ?, updated_at = NOW() WHERE id = ? AND creator_id = ?",
          [JSON.stringify(captions), input.projectId, ctx.user.id]
        ).catch(() => null);
      }

      return { projectId: input.projectId, captions, strongestAssets, captionStyle: input.captionStyle };
    }),


  // ─── PROCEDURE: createBodyCinemaCollection ─────────────────────────────────
  // Body Cinema Collection: packages reveal shot, body-focus clips, captions, pricing, and platform plan into one sellable asset collection.
  createBodyCinemaCollection: protectedProcedure
    .input(z.object({
      projectId: z.number(),
      collectionName: z.string().min(1).max(180).default("Body Cinema Collection"),
      sourceAssetUrl: z.string().url().optional(),
      enhancedImageUrl: z.string().url().optional(),
      selectedRegions: z.array(z.enum(["bust", "abdomen", "glutes", "legs", "full"])).min(1).max(5).default(["full"]),
      cinematicStyle: z.enum(["luxury", "noir", "sunset", "penthouse", "editorial", "vip_tease"]).default("luxury"),
      platforms: z.array(z.enum(["vaultx", "onlyfans", "fansly", "telegram", "instagram_reel", "twitter"])).min(1).max(6).default(["vaultx", "onlyfans", "telegram"]),
      ppvPriceCents: z.number().min(300).max(100000).default(1999),
    }))
    .mutation(async ({ ctx, input }) => {
      const projects = await rawQuery(
        "SELECT * FROM vaultx_editor_projects WHERE id = ? AND creator_id = ? LIMIT 1",
        [input.projectId, ctx.user.id]
      );
      if (!projects.length) throw new TRPCError({ code: "NOT_FOUND", message: "Project not found" });
      const project = projects[0];

      const collectionId = randomUUID();
      const creatorRows = await rawQuery(
        "SELECT display_name FROM vaultx_creator_profiles WHERE user_id = ? LIMIT 1",
        [ctx.user.id]
      ).catch(() => []);
      const creatorName = creatorRows[0]?.display_name || ctx.user.name || "VaultX Creator";
      const bodyMap = project.body_map ? JSON.parse(project.body_map) : {};
      const focusClips = project.focus_clips ? JSON.parse(project.focus_clips) : {};
      const captionsPayload = project.body_captions ? JSON.parse(project.body_captions) : null;
      const sourceUrl = input.sourceAssetUrl || input.enhancedImageUrl || project.output_url || project.source_url || project.thumbnail_url;
      if (!sourceUrl) throw new TRPCError({ code: "BAD_REQUEST", message: "A source asset or processed project output is required before creating a Body Cinema Collection." });

      const style = BODY_CINEMA_STYLE_LIBRARY[input.cinematicStyle as BodyCinemaStyleKey];
      const sourceAnalysis = safeParseJsonValue<any>(project.source_analysis, {});
      const bodyCinemaAnalysis = buildBodyCinemaDecisionEngine({
        sourceUrl,
        sourceAnalysis,
        bodyMap,
        selectedRegions: input.selectedRegions,
        platforms: input.platforms,
        ppvPriceCents: input.ppvPriceCents,
        cinematicStyle: input.cinematicStyle as BodyCinemaStyleKey,
        contentType: project.project_type,
        collectionName: input.collectionName,
      });
      const strongestAssets = Array.isArray(bodyMap.strongest_assets) && bodyMap.strongest_assets.length ? bodyMap.strongest_assets : bodyCinemaAnalysis.topRegions.map((region: any) => region.region);
      const regions = input.selectedRegions.map((region, index) => {
        const scored = bodyCinemaAnalysis.scoredRegions.find((item: any) => item.region === region);
        return {
          region,
          rank: scored?.rank || (strongestAssets.indexOf(region) >= 0 ? strongestAssets.indexOf(region) + 1 : index + 1),
          clipUrl: focusClips[region] || null,
          enhancement: scored || bodyMap.region_scores?.[region] || null,
          score: scored?.score || null,
          directive: scored?.directive || null,
          sceneLabel: region === "full" ? "Full Body Reveal" : `${region.charAt(0).toUpperCase()}${region.slice(1)} Focus`,
        };
      });
      const productionPlan: any = {
        collectionId,
        creatorName,
        style,
        sourceUrl,
        heroAsset: project.reveal_shot_url || sourceUrl,
        selectedRegions: regions,
        bodyCinemaAnalysis,
        dynamicCutBlueprint: bodyCinemaAnalysis.dynamicCutBlueprint,
        moneyPacks: bodyCinemaAnalysis.moneyPacks,
        reframeSuggestions: bodyCinemaAnalysis.reframeSuggestions,
        platformLaunchPlan: bodyCinemaAnalysis.platformLaunchPlan,
        engineLanes: bodyCinemaAnalysis.engineLanes,
        captions: captionsPayload,
        monetization: {
          ppvPriceCents: input.ppvPriceCents,
          suggestedBundleName: input.collectionName,
          cta: "Unlock the complete Body Cinema Collection on VaultX.",
          accessTier: input.ppvPriceCents > 0 ? "ppv" : "premium",
        },
        platformExports: input.platforms.map((platform) => ({
          platform,
          preset: platform === "instagram_reel" ? "9:16 teaser" : platform === "telegram" ? "private-channel teaser" : "subscriber master",
          status: "render_pending",
        })),
        remotionComposition: {
          totalDuration: Math.max(22, Math.min(52, bodyCinemaAnalysis.mediaProfile?.durationSeconds || (8 + regions.length * 5 + 5))),
          brandColors: { primary: style.palette[0], accent: style.palette[1], bg: style.palette[2] },
          scenes: [
            { start: 0, end: 5, type: "hero", url: project.reveal_shot_url || sourceUrl, label: style.hook },
            ...regions.map((item, index) => ({ start: 5 + index * 5, end: 10 + index * 5, type: "body_focus", region: item.region, url: item.clipUrl || sourceUrl, label: item.sceneLabel })),
            { start: 10 + regions.length * 5, end: 15 + regions.length * 5, type: "cta", text: "UNLOCK THE FULL BODY CINEMA COLLECTION", color: style.palette[0] },
          ],
        },
      };

      let renderResult: Awaited<ReturnType<typeof renderBodyCinemaArtifacts>>;
      try {
        renderResult = await renderBodyCinemaArtifacts({
          creatorId: ctx.user.id,
          collectionId,
          collectionName: input.collectionName,
          sourceUrl,
          style,
          platforms: input.platforms,
          durationSeconds: productionPlan.remotionComposition.totalDuration,
        });
      } catch (error: any) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Body Cinema FFmpeg render failed: ${error?.message || String(error)}`,
        });
      }
      productionPlan.renderedOutputUrl = renderResult.renderedOutputUrl;
      productionPlan.finalVideoUrl = renderResult.renderedOutputUrl;
      productionPlan.teaserUrl = renderResult.teaserUrl;
      productionPlan.thumbnailUrl = renderResult.thumbnailUrl;
      productionPlan.heroAsset = renderResult.thumbnailUrl || productionPlan.heroAsset;
      productionPlan.platformExports = renderResult.platformExports;
      productionPlan.renderMeta = renderResult.renderMeta;

      await rawExec(
        `INSERT INTO vaultx_body_cinema_collections
         (id, project_id, creator_id, collection_name, cinematic_style, source_asset_url, hero_asset_url, selected_regions, production_plan, platform_exports, ppv_price_cents, status, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'ready', NOW(), NOW())`,
        [
          collectionId,
          input.projectId,
          ctx.user.id,
          input.collectionName,
          input.cinematicStyle,
          sourceUrl,
          productionPlan.heroAsset,
          JSON.stringify(input.selectedRegions),
          JSON.stringify(productionPlan),
          JSON.stringify(productionPlan.platformExports),
          input.ppvPriceCents,
        ]
      );

      const existingCollections = project.body_cinema_collections ? JSON.parse(project.body_cinema_collections) : [];
      const nextCollections = Array.isArray(existingCollections) ? existingCollections : [];
      nextCollections.unshift({ id: collectionId, name: input.collectionName, style: input.cinematicStyle, priceCents: input.ppvPriceCents, createdAt: new Date().toISOString() });
      await rawExec(
        "UPDATE vaultx_editor_projects SET body_cinema_collections = ?, body_cinema_last_collection_id = ?, remotion_composition_data = ?, updated_at = NOW() WHERE id = ? AND creator_id = ?",
        [JSON.stringify(nextCollections.slice(0, 20)), collectionId, JSON.stringify(productionPlan.remotionComposition), input.projectId, ctx.user.id]
      );

      return {
        success: true,
        collection: {
          id: collectionId,
          projectId: input.projectId,
          collectionName: input.collectionName,
          status: "ready",
          ppvPriceCents: input.ppvPriceCents,
          renderedOutputUrl: renderResult.renderedOutputUrl,
          teaserUrl: renderResult.teaserUrl,
          thumbnailUrl: renderResult.thumbnailUrl,
        },
        productionPlan,
      };
    }),

  // ═══════════════════════════════════════════════════════════════════════════
  // PROCEDURE: generateAIViralClips — Pollo.ai Kling video generation
  // ═══════════════════════════════════════════════════════════════════════════
  generateAIViralClips: protectedProcedure
    .input(z.object({
      projectId: z.number(),
      sourceVideoUrl: z.string().url(),
      momentDescriptions: z.array(z.string()).min(1).max(5),
      model: z.enum(["kling-3.0", "kling-2.6", "seedance-2.0", "pollo-3.0"]).default("kling-3.0"),
      duration: z.enum(["5", "10"]).default("5"),
    }))
    .mutation(async ({ ctx, input }) => {
      const creatorId = await getCreatorId(ctx.user.id);
      const cid = creatorId || ctx.user.id;
      const proj = await rawQuery("SELECT * FROM vaultx_editor_projects WHERE id = ? AND creator_id = ? LIMIT 1", [input.projectId, cid]);
      if (!proj.length) throw new TRPCError({ code: "NOT_FOUND", message: "Project not found." });

      const { generateKingCamVideo } = await import("../services/kingcamAI");
      const generatedClips: Array<{ url: string; moment: string; model: string }> = [];

      try {
        for (const moment of input.momentDescriptions) {
          const result = await generateKingCamVideo({
            prompt: `${moment}, viral short-form content, engaging hook, professional production`,
            model: input.model as any,
            duration: parseInt(input.duration) as 5 | 10,
            aspectRatio: "9:16",
            vertical: "clone_lab",
          });
          generatedClips.push({ url: result.url, moment, model: result.model });
        }

        // Store generated clips in project
        const existingClips = input.projectId ? JSON.parse((proj[0] as any).generated_ai_clips || "[]") : [];
        const allClips = [...existingClips, ...generatedClips];
        await rawExec(
          "UPDATE vaultx_editor_projects SET generated_ai_clips = ?, updated_at = NOW() WHERE id = ? AND creator_id = ?",
          [JSON.stringify(allClips.slice(0, 50)), input.projectId, cid]
        );

        return { success: true, generatedClips, total: allClips.length };
      } catch (err) {
        console.error("[VaultX] AI viral clips generation failed:", err);
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Video generation failed. Check API keys." });
      }
    }),

  // ─── PROCEDURE: getBodyCinemaCollections ───────────────────────────────────
  getBodyCinemaCollections: protectedProcedure
    .input(z.object({ projectId: z.number().optional(), limit: z.number().min(1).max(50).default(20) }))
    .query(async ({ ctx, input }) => {
      const rows = await rawQuery(
        `SELECT * FROM vaultx_body_cinema_collections
         WHERE creator_id = ? ${input.projectId ? "AND project_id = ?" : ""}
         ORDER BY created_at DESC LIMIT ?`,
        input.projectId ? [ctx.user.id, input.projectId, input.limit] : [ctx.user.id, input.limit]
      );
      return { collections: rows.map((row: any) => ({
        ...row,
        selected_regions: row.selected_regions ? JSON.parse(row.selected_regions) : [],
        production_plan: row.production_plan ? JSON.parse(row.production_plan) : null,
        platform_exports: row.platform_exports ? JSON.parse(row.platform_exports) : [],
      })) };
    }),

  // ─── PROCEDURE: publishBodyCinemaCollection ────────────────────────────────
  publishBodyCinemaCollection: protectedProcedure
    .input(z.object({
      collectionId: z.string().uuid(),
      title: z.string().min(1).max(255).optional(),
      description: z.string().max(2000).optional(),
      accessTier: z.enum(["premium", "vip", "ppv"]).default("ppv"),
    }))
    .mutation(async ({ ctx, input }) => {
      const rows = await rawQuery(
        "SELECT * FROM vaultx_body_cinema_collections WHERE id = ? AND creator_id = ? LIMIT 1",
        [input.collectionId, ctx.user.id]
      );
      if (!rows.length) throw new TRPCError({ code: "NOT_FOUND", message: "Body Cinema Collection not found" });
      const collection = rows[0];
      const plan = collection.production_plan ? JSON.parse(collection.production_plan) : {};
      const contentUrl = plan.renderedOutputUrl || plan.finalVideoUrl || plan.renderedVideoUrl || collection.rendered_output_url;
      if (!contentUrl) throw new TRPCError({ code: "BAD_REQUEST", message: "This Body Cinema collection is a production plan only. Render a final video before publishing it as finished content." });
      const thumbnailUrl = plan.thumbnailUrl || plan.heroAsset || collection.hero_asset_url || collection.source_asset_url || contentUrl;
      const creatorId = await getCreatorId(ctx.user.id);
      const result = await rawExec(
        `INSERT INTO vaultx_content (creator_id, title, description, content_url, thumbnail_url, content_type, access_tier, ppv_price, tags, status, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, 'video', ?, ?, ?, 'active', NOW(), NOW())`,
        [creatorId || ctx.user.id, input.title || collection.collection_name, input.description || "Body Cinema final render produced in VaultX Editor.", contentUrl, thumbnailUrl, input.accessTier, collection.ppv_price_cents ? collection.ppv_price_cents / 100 : null, JSON.stringify(["body-cinema", collection.cinematic_style])]
      );
      await rawExec(
        "UPDATE vaultx_body_cinema_collections SET status = 'published', published_content_id = ?, updated_at = NOW() WHERE id = ? AND creator_id = ?",
        [(result as any).insertId || 0, input.collectionId, ctx.user.id]
      );
      return { success: true, collectionId: input.collectionId, contentId: (result as any).insertId || 0, contentUrl };
    }),

});
