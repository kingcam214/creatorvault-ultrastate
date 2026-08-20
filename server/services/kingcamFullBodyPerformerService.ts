import crypto from "crypto";
import { randomUUID } from "crypto";
import mysql from "mysql2/promise";
import { storagePut } from "../storage";
import { getKingcamPerformerWorkerRuntime } from "./kingcamPerformerWorkerConnectionService";

const DB_URL = process.env.DATABASE_URL || "mysql://root:@localhost:3306/creatorvault";
const OUTPUT_MAX_BYTES = 1_500_000_000;

export const KINGCAM_FULL_BODY_PERFORMER_BENCHMARK = {
  key: "clone-command-real-voice-v1",
  identityUrl: "https://creatorvault.live/images/kingcam-profile/kingcam-crown-lounge-reference.png",
  motionUrl: "https://creatorvault.live/uploads/content-vault/e46fd473-3bfb-45da-bbb8-47f8e03e26bf/kingcam-controlled-performance-0135-0147.mov",
  voiceUrl: "https://creatorvault.live/uploads/content-vault/kingcam-voice-tour-v1/clone-command.mp3",
  prompt: "一名成年男性，戴金色王冠和黑色墨镜，穿深红色刺绣西装、金色项链和黑金鞋。他完整地执行驱动视频中的自然全身动作，保持完整身体比例、手部、脚部、暖色室内环境和稳定身份。",
  promptRef: "深红色刺绣西装、金色王冠、黑色墨镜、金色项链、黑金鞋的成年男性，暖色室内深色皮质沙发环境，全身可见。",
} as const;

export type KingcamPerformerWorkerState = {
  state?: string;
  benchmarkKey?: string;
  reason?: string;
  outputSha256?: string;
  outputBytes?: number;
  finalProof?: { durationSeconds?: number; width?: number; height?: number; codec?: string };
  wanProof?: { durationSeconds?: number; width?: number; height?: number; codec?: string };
  noAutomaticRetry?: boolean;
};

export class KingcamFullBodyPerformerError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "KingcamFullBodyPerformerError";
  }
}

async function workerRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const runtime = getKingcamPerformerWorkerRuntime();
  const response = await fetch(`${runtime.baseUrl}${path}`, {
    ...init,
    headers: { "x-creatorvault-worker-token": runtime.token, ...(init?.headers || {}) },
    signal: AbortSignal.timeout(60_000),
  });
  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new KingcamFullBodyPerformerError(`KingCam performer worker request failed (${response.status}${body ? `: ${body.slice(0, 700)}` : ""}).`);
  }
  return response.json() as Promise<T>;
}

export async function probeKingcamFullBodyPerformerWorker(): Promise<{ protocolVersion?: string; models?: Record<string, string>; gpu?: { available?: boolean; detail?: string }; wanReady?: boolean; museReady?: boolean; state?: string }> {
  return workerRequest("/health");
}

export async function launchKingcamFullBodyTalkingBenchmark(): Promise<{ workerJobId: string; state: string; benchmarkKey: string; noAutomaticRetry: true }> {
  return workerRequest("/v1/kingcam-performer/runs", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      identity_url: KINGCAM_FULL_BODY_PERFORMER_BENCHMARK.identityUrl,
      motion_url: KINGCAM_FULL_BODY_PERFORMER_BENCHMARK.motionUrl,
      voice_url: KINGCAM_FULL_BODY_PERFORMER_BENCHMARK.voiceUrl,
      benchmark_key: KINGCAM_FULL_BODY_PERFORMER_BENCHMARK.key,
      prompt: KINGCAM_FULL_BODY_PERFORMER_BENCHMARK.prompt,
      prompt_ref: KINGCAM_FULL_BODY_PERFORMER_BENCHMARK.promptRef,
    }),
  });
}

export async function getKingcamFullBodyPerformerRun(workerJobId: string): Promise<KingcamPerformerWorkerState> {
  if (!/^[a-f0-9-]{36}$/i.test(String(workerJobId || ""))) throw new KingcamFullBodyPerformerError("CreatorVault refused an invalid KingCam performer job ID.");
  return workerRequest(`/v1/kingcam-performer/runs/${encodeURIComponent(workerJobId)}`);
}

async function insertPerformerMediaAsset(input: { userId: number; workerJobId: string; url: string; duration: number | null }): Promise<string> {
  const db = await mysql.createConnection(DB_URL);
  const assetId = randomUUID();
  try {
    await db.execute(
      `INSERT INTO media_assets
        (id, user_id, source_type, asset_type, file_name, original_name, mime_type, storage_path, public_url, thumbnail_url, duration, status, created_by_feature)
       VALUES (?, ?, 'generated', 'video', ?, ?, 'video/mp4', ?, ?, NULL, ?, 'review_pending', 'kingcam_full_body_performer')`,
      [assetId, input.userId, `kingcam-full-body-talking-${input.workerJobId}.mp4`, `kingcam-full-body-talking-${input.workerJobId}.mp4`, input.url, input.url, input.duration],
    );
  } finally {
    await db.end();
  }
  return assetId;
}

export async function collectKingcamFullBodyPerformerOutput(input: { ownerId: number; workerJobId: string }): Promise<{ mediaAssetId: string; outputUrl: string; finalProof: NonNullable<KingcamPerformerWorkerState["finalProof"]>; outputSha256: string }> {
  const job = await getKingcamFullBodyPerformerRun(input.workerJobId);
  if (job.state !== "completed_requires_five_gate_review" || !job.outputSha256 || !job.finalProof) {
    throw new KingcamFullBodyPerformerError("KingCam performer output is not complete and ready for five-gate review.");
  }
  if (Number(job.finalProof.height || 0) < Number(job.finalProof.width || 0) || Number(job.finalProof.durationSeconds || 0) < 5) {
    throw new KingcamFullBodyPerformerError("KingCam performer output failed technical vertical-format or duration validation before review.");
  }
  const runtime = getKingcamPerformerWorkerRuntime();
  const response = await fetch(`${runtime.baseUrl}/v1/kingcam-performer/runs/${encodeURIComponent(input.workerJobId)}/output`, {
    headers: { "x-creatorvault-worker-token": runtime.token },
    signal: AbortSignal.timeout(180_000),
  });
  if (!response.ok) throw new KingcamFullBodyPerformerError(`CreatorVault could not collect the completed KingCam performer output (${response.status}).`);
  const buffer = Buffer.from(await response.arrayBuffer());
  if (!buffer.length || buffer.length > OUTPUT_MAX_BYTES) throw new KingcamFullBodyPerformerError("KingCam performer output has an invalid stored size.");
  const actualSha = crypto.createHash("sha256").update(buffer).digest("hex");
  if (actualSha !== job.outputSha256) throw new KingcamFullBodyPerformerError("KingCam performer output checksum changed during collection.");
  const key = `content-vault/kingcam/full-body-performer/${input.workerJobId}.mp4`;
  const stored = await storagePut(key, buffer, "video/mp4");
  const mediaAssetId = await insertPerformerMediaAsset({ ownerId: input.ownerId, workerJobId: input.workerJobId, url: stored.url, duration: Number(job.finalProof.durationSeconds || 0) || null });
  return { mediaAssetId, outputUrl: stored.url, finalProof: job.finalProof, outputSha256: job.outputSha256 };
}
