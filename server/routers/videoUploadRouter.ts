/**
 * VaultX Content Vault — Chunked Upload Router
 * ============================================================================
 * Chunks land on temp disk → assembled → pushed to storagePut CDN
 * Returns persistent CDN URL. No local disk storage for final files.
 * ============================================================================
 */
import { Router, Request, Response, NextFunction } from "express";
// @ts-ignore
import multer from "multer";
import { writeFile, readFile, unlink, mkdir, rmdir, stat, readdir } from "fs/promises";
import { createReadStream, existsSync } from "fs";
import path from "path";
import os from "os";
import { createHash, randomUUID } from "crypto";
import { execFile } from "child_process";
import { promisify } from "util";
import { sql } from "drizzle-orm";
import { db } from "../db";
import { sdk } from "../_core/sdk";
import {
  isSupportedBodyCinemaVideoSelection,
  sanitiseBodyCinemaUploadFilename,
} from "../services/bodyCinemaReliability";
import { registerCanonicalAudioAsset, registerCreatorOwnedAudioUpload } from "../services/audioIntelligenceService";

// ─── Helper: mime type from filename ─────────────────────────────────────────
function getMimeType(filename: string): string {
  const ext = filename.split(".").pop()?.toLowerCase() ?? "";
  const map: Record<string, string> = {
    mp4: "video/mp4", mov: "video/quicktime", avi: "video/x-msvideo",
    mkv: "video/x-matroska", webm: "video/webm", m4v: "video/mp4",
    jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png",
    gif: "image/gif", webp: "image/webp",
    mp3: "audio/mpeg", wav: "audio/wav", m4a: "audio/mp4", aac: "audio/aac",
  };
  return map[ext] ?? "application/octet-stream";
}

// ─── Helper: assemble chunks + write to durable local disk ─────────────────────
// storagePut (Manus CDN proxy) is unavailable from VPS — write directly to
// /root/uploads/content-vault/{uuid}/{filename} and return a public HTTPS URL.
const DURABLE_UPLOADS_DIR = "/root/uploads/content-vault";
const PRIVATE_UPLOAD_RECEIPTS_DIR = "/root/uploads/content-vault-receipts";
const execFileAsync = promisify(execFile);

function isSupportedAudioSelection(filename: string, suppliedMime: string): boolean {
  const extension = filename.split(".").pop()?.toLowerCase() ?? "";
  return ["mp3", "wav", "m4a", "aac", "ogg", "flac"].includes(extension)
    && (suppliedMime.startsWith("audio/") || suppliedMime === "application/octet-stream");
}

async function validateDirectAudio(filePath: string): Promise<{ codec: string; sampleRate: number; channels: number; durationSec: number }> {
  const { stdout } = await execFileAsync(
    "ffprobe",
    [
      "-v", "error", "-select_streams", "a:0",
      "-show_entries", "stream=codec_name,sample_rate,channels,duration:format=duration",
      "-of", "json", filePath,
    ],
    { timeout: 15_000, maxBuffer: 1024 * 1024, encoding: "utf8" }
  );
  const probe = JSON.parse(String(stdout || "{}"));
  const stream = probe?.streams?.[0];
  const durationSec = Number(probe?.format?.duration ?? stream?.duration);
  const sampleRate = Number(stream?.sample_rate);
  const channels = Number(stream?.channels);
  if (!stream?.codec_name || !Number.isFinite(sampleRate) || sampleRate < 8_000 || !Number.isFinite(channels) || channels < 1) {
    throw new Error("The selected file does not contain readable audio.");
  }
  if (!Number.isFinite(durationSec) || durationSec < 0.1 || durationSec > 600) {
    throw new Error("CreatorVault accepts soundtracks between 0.1 seconds and 10 minutes.");
  }
  return { codec: String(stream.codec_name), sampleRate, channels, durationSec: Number(durationSec.toFixed(3)) };
}

async function validateDirectVideo(filePath: string): Promise<{ codec: string; width: number; height: number; durationSec: number }> {
  const { stdout } = await execFileAsync(
    "ffprobe",
    [
      "-v", "error",
      "-select_streams", "v:0",
      "-show_entries", "stream=codec_name,width,height,duration:format=duration",
      "-of", "json",
      filePath,
    ],
    { timeout: 15_000, maxBuffer: 1024 * 1024, encoding: "utf8" }
  );
  const probe = JSON.parse(String(stdout || "{}"));
  const stream = probe?.streams?.[0];
  const durationSec = Number(probe?.format?.duration ?? stream?.duration);
  const width = Number(stream?.width);
  const height = Number(stream?.height);
  if (!stream?.codec_name || !Number.isFinite(width) || width < 16 || !Number.isFinite(height) || height < 16) {
    throw new Error("The selected file does not contain a readable video stream.");
  }
  if (!Number.isFinite(durationSec) || durationSec < 0.1 || durationSec > 600) {
    throw new Error("Body Cinema accepts verified videos between 0.1 seconds and 10 minutes.");
  }
  return { codec: String(stream.codec_name), width, height, durationSec: Number(durationSec.toFixed(3)) };
}

function checksumFile(filePath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const hash = createHash("sha256");
    const stream = createReadStream(filePath);
    stream.on("error", reject);
    stream.on("data", (chunk) => hash.update(chunk));
    stream.on("end", () => resolve(hash.digest("hex")));
  });
}

async function writeVerifiedUploadReceipt(input: {
  storageId: string;
  creatorId: number;
  creatorProfileId?: number;
  url: string;
  filename: string;
  filePath: string;
}): Promise<{ id: string; sha256: string; verified: true; createdAt: string; codec: string; width: number; height: number; durationSec: number }> {
  const [media, fileStat, sha256] = await Promise.all([
    validateDirectVideo(input.filePath),
    stat(input.filePath),
    checksumFile(input.filePath),
  ]);
  const createdAt = new Date().toISOString();
  await mkdir(PRIVATE_UPLOAD_RECEIPTS_DIR, { recursive: true });
  await writeFile(path.join(PRIVATE_UPLOAD_RECEIPTS_DIR, `${input.storageId}.json`), JSON.stringify({
    id: input.storageId,
    creatorId: input.creatorId,
    creatorProfileId: input.creatorProfileId || null,
    url: input.url,
    filename: input.filename,
    size: Number(fileStat.size),
    mime: getMimeType(input.filename),
    sha256,
    media,
    verified: true,
    createdAt,
  }, null, 2));
  return { id: input.storageId, sha256, verified: true, createdAt, ...media };
}

async function assembleAndUpload(sessionDir: string, meta: any): Promise<{ url: string; filename: string; storageId: string; directory: string }> {
  const chunks: Buffer[] = [];
  for (let i = 0; i < meta.totalChunks; i++) {
    const cp = path.join(sessionDir, `chunk-${i.toString().padStart(5, "0")}`);
    chunks.push(await readFile(cp));
  }
  const combined = Buffer.concat(chunks);
  const finalFilename = meta.filename || `upload-${meta.uploadId}.mp4`;
  const fileUuid = randomUUID();
  const destDir = path.join(DURABLE_UPLOADS_DIR, fileUuid);
  await mkdir(destDir, { recursive: true });
  const destPath = path.join(destDir, finalFilename);
  await writeFile(destPath, combined);
  const url = `https://creatorvault.live/uploads/content-vault/${fileUuid}/${finalFilename}`;
  // Cleanup temp chunks
  for (let i = 0; i < meta.totalChunks; i++) {
    await unlink(path.join(sessionDir, `chunk-${i.toString().padStart(5, "0")}`)).catch(() => {});
  }
  await unlink(path.join(sessionDir, "meta.json")).catch(() => {});
  await rmdir(sessionDir).catch(() => {});
  return { url, filename: finalFilename, storageId: fileUuid, directory: destDir };
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function slugifyAssetName(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48) || "vaultx-release";
}

async function createVaultxSellableOutputs(file: { url: string; filename: string; storageId?: string; directory?: string }, meta: any, title: string, ppvPriceCents: number) {
  const priceLabel = `$${(ppvPriceCents / 100).toFixed(2)}`;
  const base = slugifyAssetName(title);
  const outputDir = file.directory || path.join(DURABLE_UPLOADS_DIR, file.storageId || randomUUID());
  const publicBase = file.storageId
    ? `https://creatorvault.live/uploads/content-vault/${file.storageId}`
    : `https://creatorvault.live/uploads/content-vault/${path.basename(outputDir)}`;
  await mkdir(outputDir, { recursive: true });

  const coverName = `${base}-vaultx-cover.svg`;
  const captionName = `${base}-unlock-caption.txt`;
  const manifestName = `${base}-sellable-outputs.json`;
  const coverUrl = `${publicBase}/${coverName}`;
  const captionUrl = `${publicBase}/${captionName}`;
  const manifestUrl = `${publicBase}/${manifestName}`;
  const safeTitle = escapeXml(title);
  const safeType = escapeXml(String(meta.contentType || contentTypeFromFilename(file.filename)).toUpperCase());

  const coverSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="720" viewBox="0 0 1280 720">
  <defs>
    <linearGradient id="bg" x1="0" x2="1" y1="0" y2="1"><stop offset="0" stop-color="#05070d"/><stop offset="0.48" stop-color="#111827"/><stop offset="1" stop-color="#05070d"/></linearGradient>
    <radialGradient id="glow" cx="74%" cy="20%" r="66%"><stop offset="0" stop-color="#00d9ff" stop-opacity="0.45"/><stop offset="1" stop-color="#00d9ff" stop-opacity="0"/></radialGradient>
  </defs>
  <rect width="1280" height="720" fill="url(#bg)"/>
  <rect width="1280" height="720" fill="url(#glow)"/>
  <rect x="72" y="68" width="1136" height="584" rx="34" fill="rgba(0,0,0,0.42)" stroke="#00d9ff" stroke-opacity="0.55" stroke-width="2"/>
  <text x="104" y="140" fill="#00d9ff" font-family="Inter, Arial, sans-serif" font-size="32" font-weight="800" letter-spacing="5">VAULTX PAID UNLOCK</text>
  <text x="104" y="270" fill="#ffffff" font-family="Inter, Arial, sans-serif" font-size="60" font-weight="900">${safeTitle}</text>
  <text x="104" y="350" fill="#c9a84c" font-family="Inter, Arial, sans-serif" font-size="36" font-weight="800">${safeType} MASTER · TEASER · PPV GATE · CAPTION PACK</text>
  <text x="104" y="452" fill="#e5e7eb" font-family="Inter, Arial, sans-serif" font-size="28">Creator upload processed into a sellable VaultX package.</text>
  <rect x="104" y="510" width="280" height="82" rx="24" fill="#00d9ff"/>
  <text x="144" y="563" fill="#020617" font-family="Inter, Arial, sans-serif" font-size="32" font-weight="900">UNLOCK ${escapeXml(priceLabel)}</text>
  <text x="830" y="590" fill="#94a3b8" font-family="Inter, Arial, sans-serif" font-size="24">Tracked payment · buyer access · creator earnings</text>
</svg>
`;

  const caption = [
    `VaultX paid unlock: ${title}`,
    `Price: ${priceLabel}`,
    "This upload is staged as a sellable VaultX package with a protected master, branded unlock cover, PPV checkout route, and post-payment buyer access.",
    "CTA: Unlock the full VaultX drop and get instant access after payment clears.",
  ].join("\n");

  const manifest = {
    engine: "vaultx-upload-money-loop-v2",
    createdAt: new Date().toISOString(),
    sourceFilename: file.filename,
    masterUrl: file.url,
    teaserCoverUrl: coverUrl,
    captionUrl,
    priceCents: ppvPriceCents,
    sellableOutputs: ["paid_master", "branded_teaser_cover", "ppv_checkout_unlock", "distribution_caption", "buyer_access_receipt"],
    operationalProof: {
      requiresStripeCheckout: true,
      logsPurchase: true,
      creditsCreatorEarnings: true,
      unlocksBuyerLibrary: true,
    },
  };

  await writeFile(path.join(outputDir, coverName), coverSvg);
  await writeFile(path.join(outputDir, captionName), caption);
  await writeFile(path.join(outputDir, manifestName), JSON.stringify(manifest, null, 2));
  return { coverUrl, captionUrl, manifestUrl };
}
// Real creator performance footage routinely exceeds 100 MB. Keep a deliberate safety ceiling
// while allowing high-quality source video through the same authenticated receipt path.
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 2 * 1024 * 1024 * 1024 } });
export const videoUploadRouter = Router();

const UPLOAD_DIR = path.join(os.tmpdir(), "vaultx-uploads");
const OWNER_IDS = [6, 33];

async function requireCreatorUploadAccess(req: Request, res: Response, next: NextFunction) {
  let user: any;
  try {
    user = await sdk.authenticateRequest(req);
  } catch {
    return res.status(401).json({ error: "Sign in to upload content." });
  }

  try {
    const userId = Number(user.id);
    const creatorId = await getCreatorId(userId);
    if (!creatorId && !OWNER_IDS.includes(userId)) {
      return res.status(403).json({ error: "An active creator profile is required to upload content." });
    }
    (req as any).authenticatedUserId = userId;
    (req as any).authenticatedCreatorId = creatorId || userId;
    return next();
  } catch (error) {
    console.error("[VaultX Upload] Creator access check failed:", error);
    return res.status(500).json({ error: "We could not verify your Creator HQ. Please try again." });
  }
}

videoUploadRouter.use(requireCreatorUploadAccess);

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
  const escaped = query.replace(/\?/g, () => {
    const value = params.shift();
    if (value === null || value === undefined) return "NULL";
    if (typeof value === "number") return String(value);
    return `'${String(value).replace(/'/g, "''")}'`;
  });
  const result = await (db as any).execute(sql.raw(escaped));
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

async function registerChunkedVideoMediaAsset(input: {
  req: Request;
  file: { url: string; filename: string };
  receipt: { durationSec: number; width: number; height: number };
  sourceClassification?: string;
}): Promise<{ mediaAssetId: string; createdByFeature: string }> {
  const creatorId = Number((input.req as any).authenticatedUserId);
  const requestedClassification = String(input.sourceClassification || "").trim().toLowerCase();
  const kingcamPerformanceCapture = requestedClassification === "kingcam_performance_capture" && OWNER_IDS.includes(creatorId);
  const createdByFeature = kingcamPerformanceCapture ? "kingcam_performance_capture" : "body_cinema_chunked_upload";
  const mediaAssetId = randomUUID();
  await rawExec(
    `INSERT INTO media_assets
      (id, user_id, source_type, asset_type, file_name, original_name, mime_type, storage_path, public_url, thumbnail_url, duration, width, height, status, created_by_feature)
     VALUES (?, ?, 'upload', 'video', ?, ?, ?, ?, ?, ?, ?, ?, ?, 'ready', ?)`,
    [mediaAssetId, creatorId, input.file.filename, input.file.filename, getMimeType(input.file.filename), input.file.url, input.file.url, input.file.url, input.receipt.durationSec, input.receipt.width, input.receipt.height, createdByFeature],
  );
  return { mediaAssetId, createdByFeature };
}

async function getCreatorId(userId: number): Promise<number | null> {
  const rows = await rawQuery("SELECT id FROM vaultx_creators WHERE user_id = ? AND is_active = 1 LIMIT 1", [userId]);
  return rows[0]?.id ?? null;
}

function parsePriceCents(raw: unknown): number {
  if (typeof raw === "number" && Number.isFinite(raw)) return Math.max(100, Math.round(raw));
  if (typeof raw === "string" && raw.trim()) {
    const cleaned = raw.replace(/[^0-9.]/g, "");
    const value = Number(cleaned);
    if (Number.isFinite(value)) return Math.max(100, Math.round(value * (cleaned.includes(".") ? 100 : 1)));
  }
  return 999;
}

function contentTypeFromFilename(filename: string): "video" | "photo" | "audio" {
  const ext = filename.split(".").pop()?.toLowerCase() ?? "";
  if (["jpg", "jpeg", "png", "gif", "webp"].includes(ext)) return "photo";
  if (["mp3", "wav", "m4a", "aac"].includes(ext)) return "audio";
  return "video";
}

async function registerUploadedPaidContent(req: Request, file: { url: string; filename: string; storageId?: string; directory?: string }, meta: any) {
  const user = await sdk.authenticateRequest(req);
  const creatorId = await getCreatorId(Number(user.id));
  const cid = creatorId || Number(user.id);
  if (!cid || (!creatorId && !OWNER_IDS.includes(Number(user.id)))) {
    throw new Error("Authenticated creator profile required to register paid VaultX content.");
  }

  const title = String(meta.title || meta.contentTitle || file.filename.replace(/\.[^.]+$/, "") || "VaultX Upload").slice(0, 255);
  const description = String(meta.description || "VaultX paid content created from a completed upload.").slice(0, 5000);
  const contentType = ["video", "photo", "audio"].includes(String(meta.contentType))
    ? String(meta.contentType)
    : contentTypeFromFilename(file.filename);
  const ppvPriceCents = parsePriceCents(meta.ppvPrice ?? meta.priceCents ?? meta.price ?? meta.unlockPrice);
  const ppvPriceDollars = Number((ppvPriceCents / 100).toFixed(2));
  const tags = JSON.stringify(["vaultx", "upload", "paid-content", "money-loop", "processed-package"]);
  const assets = await createVaultxSellableOutputs(file, meta, title, ppvPriceCents);
  const packagedDescription = `${description}\n\nVaultX package outputs: protected master, branded teaser cover, Stripe PPV unlock route, distribution caption, and sellable-output manifest. Caption: ${assets.captionUrl}. Manifest: ${assets.manifestUrl}.`;

  const result = await rawExec(
    `INSERT INTO vaultx_content
     (creator_id, title, description, content_type,
      uncensored_url, censored_url, thumbnail_url, censored_thumbnail_url,
      is_ppv, ppv_price, is_subscription_only, is_free_preview, free_preview_seconds,
      access_tier, tags, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active')`,
    [
      cid, title, packagedDescription, contentType,
      file.url, assets.coverUrl, assets.coverUrl, assets.coverUrl,
      1, ppvPriceDollars, 0, 0, 0,
      ["basic", "premium", "vip", "ppv"].includes(String(meta.accessTier)) ? String(meta.accessTier) : "ppv", tags,
    ]
  );

  const contentId = Number((result as any).insertId || 0);
  return {
    id: contentId,
    creatorId: cid,
    title,
    contentType,
    url: file.url,
    ppvPrice: ppvPriceDollars,
    priceCents: ppvPriceCents,
    sellableOutputs: assets,
    status: "active",
    registered: contentId > 0,
  };
}

// ─── /init — register upload session ─────────────────────────────────────────
videoUploadRouter.post("/init", async (req: Request, res: Response) => {
  try {
    const { uploadId, totalChunks, filename } = req.body;
    if (!uploadId || !totalChunks || !filename) {
      return res.status(400).json({ error: "uploadId, totalChunks, filename required" });
    }
    const sessionDir = path.join(UPLOAD_DIR, uploadId);
    await mkdir(sessionDir, { recursive: true });
    await writeFile(
      path.join(sessionDir, "meta.json"),
              JSON.stringify({
          uploadId,
          totalChunks: parseInt(totalChunks),
          filename,
          receivedChunks: 0,
          title: req.body.title,
          description: req.body.description,
          contentType: req.body.contentType,
          ppvPrice: req.body.ppvPrice,
          priceCents: req.body.priceCents,
          accessTier: req.body.accessTier,
          registerPaidContent: req.body.registerPaidContent !== false && req.body.registerPaidContent !== "false",
          sourceClassification: String(req.body.sourceClassification || req.get("x-creatorvault-source-classification") || ""),
        })

    );
    res.json({ uploadId, status: "initialized" });
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? e.message : String(e) });
  }
});

// ─── /status — inspect an existing creator upload session without media transfer ─
videoUploadRouter.get("/status", async (req: Request, res: Response) => {
  try {
    const uploadId = String(req.query.uploadId || "").trim();
    if (!uploadId) return res.status(400).json({ error: "uploadId required" });
    const sessionDir = path.join(UPLOAD_DIR, uploadId);
    if (!existsSync(sessionDir)) return res.status(404).json({ error: "Upload session not found" });
    const meta = JSON.parse(await readFile(path.join(sessionDir, "meta.json"), "utf-8"));
    const indexes = (await readdir(sessionDir))
      .map((name) => /^chunk-(\d+)$/.exec(name)?.[1])
      .filter((value): value is string => Boolean(value))
      .map((value) => Number(value));
    const indexSet = new Set(indexes);
    const missingIndexes = Array.from({ length: Number(meta.totalChunks) }, (_, index) => index).filter((index) => !indexSet.has(index));
    res.json({ uploadId, received: indexes.length, total: Number(meta.totalChunks), missingIndexes, readyToFinalize: missingIndexes.length === 0 });
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? e.message : String(e) });
  }
});

// ─── /chunk — receive a chunk, auto-finalize on last chunk ───────────────────
videoUploadRouter.post("/chunk", upload.single("chunk"), async (req: Request, res: Response) => {
  try {
    // @ts-ignore
    if (!req.file) return res.status(400).json({ error: "No chunk file" });
    const { uploadId, chunkIndex } = req.body;
    if (!uploadId || chunkIndex === undefined) {
      return res.status(400).json({ error: "uploadId and chunkIndex required" });
    }
    const sessionDir = path.join(UPLOAD_DIR, uploadId);
    if (!existsSync(sessionDir)) {
      return res.status(404).json({ error: "Upload session not found — call /init first" });
    }
    const chunkPath = path.join(sessionDir, `chunk-${parseInt(chunkIndex).toString().padStart(5, "0")}`);
    // @ts-ignore
    await writeFile(chunkPath, req.file.buffer);

        const meta = JSON.parse(await readFile(path.join(sessionDir, "meta.json"), "utf-8"));
    // Count the durable chunk files rather than incrementing a shared counter. This lets a
    // large creator video transfer several safe chunks at once without losing progress to a race.
    const storedChunks = (await readdir(sessionDir)).filter((name) => /^chunk-\d+$/.test(name)).length;
    meta.receivedChunks = storedChunks;
    await writeFile(path.join(sessionDir, "meta.json"), JSON.stringify(meta));
    // Only one request may assemble the finished source. The other concurrent chunk requests
    // return their durable receipt while this owner-bound finalization happens exactly once.
    if (storedChunks >= meta.totalChunks) {
      const finalizeLock = path.join(sessionDir, ".finalizing");
      try {
        await writeFile(finalizeLock, String(Date.now()), { flag: "wx" });
      } catch {
        return res.json({ uploadId, chunkIndex, received: storedChunks, total: meta.totalChunks, complete: false, finalizing: true });
      }
      const { url, filename: finalFilename, storageId, directory } = await assembleAndUpload(sessionDir, meta);
      const uploadReceipt = await writeVerifiedUploadReceipt({
        storageId,
        creatorId: Number((req as any).authenticatedUserId),
        creatorProfileId: Number((req as any).authenticatedCreatorId),
        url,
        filename: finalFilename,
        filePath: path.join(directory, finalFilename),
      });
      const file = { url, filename: finalFilename, storageId, directory };
      const chunkedMedia = await registerChunkedVideoMediaAsset({ req, file, receipt: uploadReceipt, sourceClassification: meta.sourceClassification });
      const paidContent = meta.registerPaidContent === false ? null : await registerUploadedPaidContent(req, file, meta);
      return res.json({
        uploadId, chunkIndex, received: storedChunks, total: meta.totalChunks,
        complete: true,
        file,
        uploadReceipt,
        mediaAssetId: chunkedMedia.mediaAssetId,
        createdByFeature: chunkedMedia.createdByFeature,
        paidContent,
      });
    }

    res.json({ uploadId, chunkIndex, received: storedChunks, total: meta.totalChunks, complete: false });
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? e.message : String(e) });
  }
});

// ─── /finalize — manual finalize (fallback) ───────────────────────────────────
videoUploadRouter.post("/finalize", async (req: Request, res: Response) => {
  try {
    const { uploadId, filename } = req.body;
    if (!uploadId) return res.status(400).json({ error: "uploadId required" });
    const sessionDir = path.join(UPLOAD_DIR, uploadId);
    if (!existsSync(sessionDir)) {
      return res.status(404).json({ error: "Upload session not found" });
    }
    const meta = JSON.parse(await readFile(path.join(sessionDir, "meta.json"), "utf-8"));
    const storedChunks = (await readdir(sessionDir)).filter((name) => /^chunk-\d+$/.test(name)).length;
    if (storedChunks !== Number(meta.totalChunks)) {
      return res.status(409).json({ error: "Upload is not complete", received: storedChunks, total: Number(meta.totalChunks) });
    }
    if (filename) meta.filename = filename;
    const { url, filename: finalFilename, storageId, directory } = await assembleAndUpload(sessionDir, meta);
    const uploadReceipt = await writeVerifiedUploadReceipt({
      storageId,
      creatorId: Number((req as any).authenticatedUserId),
      creatorProfileId: Number((req as any).authenticatedCreatorId),
      url,
      filename: finalFilename,
      filePath: path.join(directory, finalFilename),
    });
    const file = { url, filename: finalFilename, storageId, directory };
    const chunkedMedia = await registerChunkedVideoMediaAsset({ req, file, receipt: uploadReceipt, sourceClassification: meta.sourceClassification });
    const paidContent = meta.registerPaidContent === false ? null : await registerUploadedPaidContent(req, file, meta);
    res.json({ url, filename: finalFilename, file, uploadReceipt, mediaAssetId: chunkedMedia.mediaAssetId, createdByFeature: chunkedMedia.createdByFeature, paidContent });
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? e.message : String(e) });
  }
});

// ─── /direct — single-shot upload (tap-to-upload, no chunking, no URLs) ────────
// The creator picks a file; this stores it and returns a real public HTTPS URL.
// Used by VaultX Drop so creators never touch a URL.
videoUploadRouter.post("/direct", upload.single("file"), async (req: Request, res: Response) => {
  let destPath: string | null = null;
  let receiptPath: string | null = null;
  try {
    const f = (req as any).file;
    if (!f || !f.buffer || f.size < 1) return res.status(400).json({ error: "Choose a non-empty video file." });

    const originalName = sanitiseBodyCinemaUploadFilename(f.originalname);
    const suppliedMime = String(f.mimetype || "").toLowerCase();
    const isAudioUpload = isSupportedAudioSelection(originalName, suppliedMime);
    const isVideoUpload = isSupportedBodyCinemaVideoSelection(originalName, suppliedMime);
    if (!isAudioUpload && !isVideoUpload) {
      return res.status(415).json({ error: "CreatorVault accepts verified video or soundtrack files in this studio." });
    }

    const fileUuid = randomUUID();
    const destDir = path.join(DURABLE_UPLOADS_DIR, fileUuid);
    await mkdir(destDir, { recursive: true });
    destPath = path.join(destDir, originalName);
    await writeFile(destPath, f.buffer);

    const media = isAudioUpload ? await validateDirectAudio(destPath) : await validateDirectVideo(destPath);
    const sha256 = createHash("sha256").update(f.buffer).digest("hex");
    const createdAt = new Date().toISOString();
    const url = `https://creatorvault.live/uploads/content-vault/${fileUuid}/${encodeURIComponent(originalName)}`;
    const creatorId = Number((req as any).authenticatedUserId);
    const creatorProfileId = Number((req as any).authenticatedCreatorId);
    const requestedClassification = String(req.get("x-creatorvault-source-classification") || "").trim().toLowerCase();
    const approvedDemo = requestedClassification === "approved_demo" && OWNER_IDS.includes(creatorId);
    const kingcamPerformanceCapture = requestedClassification === "kingcam_performance_capture" && OWNER_IDS.includes(creatorId) && isVideoUpload;
    // media_assets.source_type is a constrained legacy field. Creator-recorded
    // KingCam performance is still creator-owned footage, but the immutable
    // feature tag keeps it out of Body Cinema and reserves it for clone motion.
    // media_assets permits `upload` for real creator-owned originals. The feature tag below
    // still keeps KingCam Performance Capture out of Body Cinema and all generic source lanes.
    const sourceType = approvedDemo ? "generated" : "upload";
    const createdByFeature = approvedDemo
      ? "creatorvault_approved_demo"
      : kingcamPerformanceCapture
        ? "kingcam_performance_capture"
        : "body_cinema_direct_upload";

    await mkdir(PRIVATE_UPLOAD_RECEIPTS_DIR, { recursive: true });
    receiptPath = path.join(PRIVATE_UPLOAD_RECEIPTS_DIR, `${fileUuid}.json`);
    await writeFile(receiptPath, JSON.stringify({
      id: fileUuid,
      creatorId,
      creatorProfileId,
      url,
      filename: originalName,
      size: Number(f.size),
      mime: getMimeType(originalName),
      sha256,
      media,
      verified: true,
      createdAt,
      classification: approvedDemo ? "approved_demo" : kingcamPerformanceCapture ? "kingcam_performance_driver" : "creator_owned",
    }, null, 2));

    const mediaAssetId = randomUUID();
    let canonicalAudioAsset: any = null;
    if (isAudioUpload) {
      await rawExec(
        `INSERT INTO media_assets
          (id, user_id, source_type, asset_type, file_name, original_name, mime_type, storage_path, public_url, thumbnail_url, duration, status, created_by_feature)
         VALUES (?, ?, ?, 'audio', ?, ?, ?, ?, ?, NULL, ?, 'ready', ?)`,
        [mediaAssetId, creatorId, sourceType, originalName, originalName, getMimeType(originalName), url, url, (media as any).durationSec, approvedDemo ? "creatorvault_approved_demo_audio" : "canonical_audio_intelligence"]
      );
      canonicalAudioAsset = approvedDemo
        ? await registerCanonicalAudioAsset({
          creatorId,
          title: originalName.replace(/\.[^.]+$/, "") || "CreatorVault demonstration soundtrack",
          assetUrl: url,
          mimeType: getMimeType(originalName),
          kind: "music",
          fingerprint: sha256,
          durationSeconds: (media as any).durationSec,
          sampleRate: (media as any).sampleRate,
          channels: (media as any).channels,
          mediaAssetId,
          rights: {
            state: "creator_owned",
            source: "first_party_fixture",
            allowedPlatforms: ["creatorvault", "vaultx", "instagram", "tiktok", "youtube"],
            permittedUses: ["preview", "render", "distribution"],
            attributionRequired: false,
            evidenceNote: "CreatorVault-owned generated demonstration soundtrack imported with an owner-bound receipt, source checksum, and approved-demo classification.",
          },
        })
        : await registerCreatorOwnedAudioUpload({
          creatorId,
          title: originalName.replace(/\.[^.]+$/, "") || "Creator soundtrack",
          assetUrl: url,
          mimeType: getMimeType(originalName),
          fileFingerprint: sha256,
          durationSeconds: (media as any).durationSec,
          sampleRate: (media as any).sampleRate,
          channels: (media as any).channels,
          mediaAssetId,
        });
    } else {
      await rawExec(
        `INSERT INTO media_assets
          (id, user_id, source_type, asset_type, file_name, original_name, mime_type, file_size, storage_path, public_url, thumbnail_url, duration, width, height, status, created_by_feature)
         VALUES (?, ?, ?, 'video', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'ready', ?)`,
        [
          mediaAssetId,
          creatorId,
          sourceType,
          originalName,
          originalName,
          getMimeType(originalName),
          Number(f.size),
          url,
          url,
          url,
          (media as any).durationSec,
          (media as any).width,
          (media as any).height,
          createdByFeature,
        ]
      );
    }

    return res.json({
      url,
      filename: originalName,
      storageId: fileUuid,
      mediaAssetId,
      size: Number(f.size),
      mime: getMimeType(originalName),
      uploadReceipt: {
        id: fileUuid,
        mediaAssetId,
        sha256,
        verified: true,
        ownerBound: true,
        createdAt,
        ...media,
      },
      audioAsset: canonicalAudioAsset,
    });
  } catch (e) {
    if (destPath) await unlink(destPath).catch(() => undefined);
    if (receiptPath) await unlink(receiptPath).catch(() => undefined);
    const message = e instanceof Error ? e.message : String(e);
    const status = /readable video stream|readable audio|accepts verified|accepts soundtracks/i.test(message) ? 422 : 500;
    return res.status(status).json({ error: message });
  }
});
