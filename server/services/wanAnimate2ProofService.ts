import { randomUUID } from "crypto";
import mysql from "mysql2/promise";
import { storagePut } from "../storage";
import { getWanProofWorkerRuntime } from "./wanAnimateProofWorkerConnectionService";

const DB_URL = process.env.DATABASE_URL || "mysql://root:@localhost:3306/creatorvault";
const OUTPUT_MAX_BYTES = 1_500_000_000;

export class WanAnimate2ProofServiceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "WanAnimate2ProofServiceError";
  }
}

type WorkerState = {
  state?: string;
  modelKey?: string;
  outputSha256?: string;
  outputBytes?: number;
  visualProof?: { durationSeconds?: number; width?: number; height?: number; sampleLuminance?: number[] };
  noAutomaticRetry?: boolean;
  reason?: string;
};

async function workerRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const runtime = getWanProofWorkerRuntime();
  const response = await fetch(`${runtime.baseUrl}${path}`, {
    ...init,
    headers: { "x-creatorvault-worker-token": runtime.token, ...(init?.headers || {}) },
    signal: AbortSignal.timeout(60_000),
  });
  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new WanAnimate2ProofServiceError(`Wan proof worker request failed (${response.status}${body ? `: ${body.slice(0, 700)}` : ""}).`);
  }
  return response.json() as Promise<T>;
}

export async function probeWanAnimate2ProofWorker(): Promise<{ protocolVersion?: string; modelKey?: string; gpu?: { available?: boolean; detail?: string }; modelReady?: boolean; bf16MemoryCorrection?: boolean; state?: string }> {
  return workerRequest("/health");
}

export async function launchOneWanAnimate2Proof(): Promise<{ workerJobId: string; state: string; modelKey: string; noAutomaticRetry: true }> {
  return workerRequest("/v1/kingcam-proof/run", { method: "POST" });
}

export async function getWanAnimate2ProofJob(workerJobId: string): Promise<WorkerState> {
  if (!/^[a-f0-9-]{36}$/i.test(String(workerJobId || ""))) throw new WanAnimate2ProofServiceError("CreatorVault refused an invalid Wan proof job ID.");
  return workerRequest(`/v1/kingcam-proof/jobs/${encodeURIComponent(workerJobId)}`);
}

async function insertProofMediaAsset(input: { userId: number; workerJobId: string; url: string; duration: number | null }): Promise<string> {
  const db = await mysql.createConnection(DB_URL);
  const assetId = randomUUID();
  try {
    await db.execute(
      `INSERT INTO media_assets
        (id, user_id, source_type, asset_type, file_name, original_name, mime_type, storage_path, public_url, thumbnail_url, duration, status, created_by_feature)
       VALUES (?, ?, 'generated', 'video', ?, ?, 'video/mp4', ?, ?, NULL, ?, 'review_pending', 'kingcam_wan_animate_2_proof')`,
      [assetId, input.userId, `kingcam-wan-animate-2-proof-${input.workerJobId}.mp4`, `kingcam-wan-animate-2-proof-${input.workerJobId}.mp4`, input.url, input.url, input.duration]
    );
  } finally {
    await db.end();
  }
  return assetId;
}

export async function collectWanAnimate2ProofOutput(input: { ownerId: number; workerJobId: string }): Promise<{ mediaAssetId: string; outputUrl: string; workerVisualProof: NonNullable<WorkerState["visualProof"]>; outputSha256: string }> {
  const job = await getWanAnimate2ProofJob(input.workerJobId);
  if (job.state !== "completed_requires_visual_quality_review" || !job.outputSha256 || !job.visualProof) {
    throw new WanAnimate2ProofServiceError("Wan proof output is not complete and ready for visual review.");
  }
  const runtime = getWanProofWorkerRuntime();
  const response = await fetch(`${runtime.baseUrl}/v1/kingcam-proof/jobs/${encodeURIComponent(input.workerJobId)}/output`, {
    headers: { "x-creatorvault-worker-token": runtime.token },
    signal: AbortSignal.timeout(180_000),
  });
  if (!response.ok) throw new WanAnimate2ProofServiceError(`CreatorVault could not collect the completed Wan proof output (${response.status}).`);
  const buffer = Buffer.from(await response.arrayBuffer());
  if (!buffer.length || buffer.length > OUTPUT_MAX_BYTES) throw new WanAnimate2ProofServiceError("Wan proof output has an invalid stored size.");
  const digest = await crypto.subtle.digest("SHA-256", buffer);
  const actualSha = Buffer.from(digest).toString("hex");
  if (actualSha !== job.outputSha256) throw new WanAnimate2ProofServiceError("Wan proof output checksum changed during collection.");
  const key = `content-vault/kingcam/wan-animate-2-proof/${input.workerJobId}.mp4`;
  const stored = await storagePut(key, buffer, "video/mp4");
  const mediaAssetId = await insertProofMediaAsset({ userId: input.ownerId, workerJobId: input.workerJobId, url: stored.url, duration: Number(job.visualProof.durationSeconds || 0) || null });
  return { mediaAssetId, outputUrl: stored.url, workerVisualProof: job.visualProof, outputSha256: job.outputSha256 };
}
