/**
 * VaultX Content Vault — Chunked Upload Router
 * ============================================================================
 * Chunks land on temp disk → assembled → pushed to storagePut CDN
 * Returns persistent CDN URL. No local disk storage for final files.
 * ============================================================================
 */
import { Router, Request, Response } from "express";
// @ts-ignore
import multer from "multer";
import { writeFile, readFile, unlink, mkdir, rmdir } from "fs/promises";
import { existsSync } from "fs";
import path from "path";
import os from "os";
import { randomUUID } from "crypto";
import { sql } from "drizzle-orm";
import { db } from "../db";
import { sdk } from "../_core/sdk";

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
async function assembleAndUpload(sessionDir: string, meta: any): Promise<{ url: string; filename: string }> {
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
  return { url, filename: finalFilename };
}
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 100 * 1024 * 1024 } });
export const videoUploadRouter = Router();

const UPLOAD_DIR = path.join(os.tmpdir(), "vaultx-uploads");
const OWNER_IDS = [6, 33];

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

async function registerUploadedPaidContent(req: Request, file: { url: string; filename: string }, meta: any) {
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
  const ppvPrice = parsePriceCents(meta.ppvPrice ?? meta.priceCents ?? meta.price ?? meta.unlockPrice);
  const tags = JSON.stringify(["vaultx", "upload", "paid-content", "money-loop"]);

  const result = await rawExec(
    `INSERT INTO vaultx_content
     (creator_id, title, description, content_type,
      uncensored_url, censored_url, thumbnail_url, censored_thumbnail_url,
      is_ppv, ppv_price, is_subscription_only, is_free_preview, free_preview_seconds,
      access_tier, tags, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active')`,
    [
      cid, title, description, contentType,
      file.url, null, null, null,
      1, ppvPrice, 0, 0, 0,
      String(meta.accessTier || "public"), tags,
    ]
  );

  const contentId = Number((result as any).insertId || 0);
  return {
    id: contentId,
    creatorId: cid,
    title,
    contentType,
    url: file.url,
    ppvPrice,
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
        })

    );
    res.json({ uploadId, status: "initialized" });
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
    meta.receivedChunks = (meta.receivedChunks || 0) + 1;
    await writeFile(path.join(sessionDir, "meta.json"), JSON.stringify(meta));

    // Auto-finalize when all chunks received — push to CDN
    if (meta.receivedChunks >= meta.totalChunks) {
      const { url, filename: finalFilename } = await assembleAndUpload(sessionDir, meta);
      const file = { url, filename: finalFilename };
      const paidContent = meta.registerPaidContent === false ? null : await registerUploadedPaidContent(req, file, meta);
      return res.json({
        uploadId, chunkIndex, received: meta.receivedChunks, total: meta.totalChunks,
        complete: true,
        file,
        paidContent,
      });
    }

    res.json({ uploadId, chunkIndex, received: meta.receivedChunks, total: meta.totalChunks, complete: false });
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
    if (filename) meta.filename = filename;
    const { url, filename: finalFilename } = await assembleAndUpload(sessionDir, meta);
    const file = { url, filename: finalFilename };
    const paidContent = meta.registerPaidContent === false ? null : await registerUploadedPaidContent(req, file, meta);
    res.json({ url, filename: finalFilename, file, paidContent });
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? e.message : String(e) });
  }
});
