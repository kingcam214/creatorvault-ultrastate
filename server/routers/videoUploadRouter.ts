/**
 * Video Upload Router — Chunked Upload for Content Vault
 * ============================================================================
 * Handles chunked video uploads from VaultXStudio ContentVaultMode
 *
 * Endpoints:
 *   POST /api/video/upload/init   { uploadId, totalChunks, filename }
 *   POST /api/video/upload/chunk  { uploadId, chunkIndex, totalChunks, chunk (file) }
 *   POST /api/video/upload/finalize { uploadId, filename }
 * ============================================================================
 */

import { Router, Request, Response } from "express";
import multer from "multer";
import { writeFile, readFile, unlink, mkdir } from "fs/promises";
import { existsSync } from "fs";
import path from "path";
import os from "os";
import { storagePut } from "../storage";

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

// ─── /chunk — receive a chunk ─────────────────────────────────────────────────

videoUploadRouter.post("/chunk", upload.single("chunk"), async (req: Request, res: Response) => {
  try {
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
    await writeFile(chunkPath, req.file.buffer);

    const meta = JSON.parse(await readFile(path.join(sessionDir, "meta.json"), "utf-8"));
    meta.receivedChunks = (meta.receivedChunks || 0) + 1;
    await writeFile(path.join(sessionDir, "meta.json"), JSON.stringify(meta));

    res.json({ uploadId, chunkIndex, received: meta.receivedChunks, total: meta.totalChunks });
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? e.message : String(e) });
  }
});

// ─── /finalize — assemble chunks and upload to storage ───────────────────────

videoUploadRouter.post("/finalize", async (req: Request, res: Response) => {
  try {
    const { uploadId, filename } = req.body;
    if (!uploadId) return res.status(400).json({ error: "uploadId required" });

    const sessionDir = path.join(UPLOAD_DIR, uploadId);
    if (!existsSync(sessionDir)) {
      return res.status(404).json({ error: "Upload session not found" });
    }

    const meta = JSON.parse(await readFile(path.join(sessionDir, "meta.json"), "utf-8"));
    const chunks: Buffer[] = [];
    for (let i = 0; i < meta.totalChunks; i++) {
      const chunkPath = path.join(sessionDir, `chunk-${i.toString().padStart(5, "0")}`);
      chunks.push(await readFile(chunkPath));
    }
    const combined = Buffer.concat(chunks);
    const finalFilename = filename || meta.filename || `upload-${uploadId}.mp4`;
    const key = `content-vault/${uploadId}/${finalFilename}`;
    const { url } = await storagePut(key, combined, "video/mp4");

    // Cleanup temp chunks
    for (let i = 0; i < meta.totalChunks; i++) {
      await unlink(path.join(sessionDir, `chunk-${i.toString().padStart(5, "0")}`)).catch(() => {});
    }
    await unlink(path.join(sessionDir, "meta.json")).catch(() => {});

    res.json({ url, filename: finalFilename, size: combined.length });
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? e.message : String(e) });
  }
});
