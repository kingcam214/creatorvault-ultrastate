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
      JSON.stringify({ uploadId, totalChunks: parseInt(totalChunks), filename, receivedChunks: 0 })
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
      return res.json({
        uploadId, chunkIndex, received: meta.receivedChunks, total: meta.totalChunks,
        complete: true,
        file: { url, filename: finalFilename }
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
    res.json({ url, filename: finalFilename });
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? e.message : String(e) });
  }
});
