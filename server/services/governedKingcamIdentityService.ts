import { createHash, randomUUID } from "crypto";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { sql } from "drizzle-orm";
import { db } from "../db";
import { FLUXDEVCAM, injectKingCamDNA, KINGCAM_DNA } from "./kingcamAI";
import { recordCreationModelBenchmark } from "./creationModelRegistry";

const PUBLIC_ROOT = "/root/uploads";
const OWNER_IDS = new Set([6, 33]);
const MODEL_KEY = "replicate/kingcam-fluxdevcam";

type JobStatus = "planned" | "creating" | "quality_review" | "accepted" | "rejected" | "failed";
export type IdentityReviewCriteria = {
  facePreservation: number;
  identityPreservation: number;
  anatomy: number;
  skinTexture: number;
  hands: number;
  clothingPreservation: number;
  backgroundStability: number;
  promptAdherence: number;
  verticalComposition: number;
  cinematicQuality: number;
  artifactRate: number;
};

export type GovernedKingcamIdentityJob = {
  id: string;
  creatorId: number;
  directorRequestId: string;
  creationProjectId: string | null;
  sourceAssetId: string;
  referenceUrl: string;
  prompt: string;
  aspectRatio: "9:16" | "16:9" | "1:1";
  status: JobStatus;
  providerPredictionId: string | null;
  providerUrl: string | null;
  durableUrl: string | null;
  outputFingerprint: string | null;
  mediaAssetId: string | null;
  plannedCost: { provider: "replicate"; model: string; maximumImages: 1; costBound: "single-benchmark-image"; actualProviderCost: "reported by provider after completion when available" };
  review: { status: "accepted" | "rejected"; overallScore: number; criteria: IdentityReviewCriteria; notes: string } | null;
  error: string | null;
  createdAt: string;
  updatedAt: string;
};

function safeJson(value: unknown): string {
  return JSON.stringify(value ?? {});
}
function parseJson<T>(value: unknown, fallback: T): T {
  if (value === null || value === undefined || value === "") return fallback;
  if (typeof value === "object") return value as T;
  try { return JSON.parse(String(value)) as T; } catch { return fallback; }
}
async function rawQuery<T = any>(query: string, params: any[] = []): Promise<T[]> {
  const pool = (db as any).$client || (db as any).client;
  if (pool?.promise) { const [rows] = await pool.promise().query(query, params); return rows as T[]; }
  if (pool?.execute) { const [rows] = await pool.execute(query, params); return rows as T[]; }
  const values = [...params];
  const escaped = query.replace(/\?/g, () => {
    const value = values.shift();
    if (value === null || value === undefined) return "NULL";
    if (typeof value === "number") return String(value);
    return `'${String(value).replace(/'/g, "''")}'`;
  });
  const result = await (db as any).execute(sql.raw(escaped));
  return (result as any).rows || result || [];
}
async function rawExec(query: string, params: any[] = []): Promise<any> {
  const pool = (db as any).$client || (db as any).client;
  if (pool?.promise) { const [result] = await pool.promise().query(query, params); return result; }
  if (pool?.execute) { const [result] = await pool.execute(query, params); return result; }
  const values = [...params];
  const escaped = query.replace(/\?/g, () => {
    const value = values.shift();
    if (value === null || value === undefined) return "NULL";
    if (typeof value === "number") return String(value);
    return `'${String(value).replace(/'/g, "''")}'`;
  });
  return (db as any).execute(sql.raw(escaped));
}

export async function ensureGovernedKingcamIdentitySchema(): Promise<void> {
  await rawExec(`CREATE TABLE IF NOT EXISTS governed_kingcam_identity_jobs (
    id CHAR(36) PRIMARY KEY,
    creator_id BIGINT NOT NULL,
    director_request_id CHAR(36) NOT NULL,
    creation_project_id CHAR(36) NULL,
    source_asset_id CHAR(36) NOT NULL,
    reference_url TEXT NOT NULL,
    prompt TEXT NOT NULL,
    aspect_ratio VARCHAR(12) NOT NULL,
    status VARCHAR(32) NOT NULL,
    provider_prediction_id VARCHAR(191) NULL,
    provider_url TEXT NULL,
    durable_url TEXT NULL,
    output_fingerprint CHAR(64) NULL,
    media_asset_id CHAR(36) NULL,
    planned_cost_json LONGTEXT NOT NULL,
    review_json LONGTEXT NULL,
    error_message TEXT NULL,
    created_at DATETIME NOT NULL,
    updated_at DATETIME NOT NULL,
    KEY governed_kingcam_identity_creator (creator_id, status, created_at),
    KEY governed_kingcam_identity_director (director_request_id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
}

function normalise(row: any): GovernedKingcamIdentityJob {
  return {
    id: String(row.id), creatorId: Number(row.creator_id), directorRequestId: String(row.director_request_id),
    creationProjectId: row.creation_project_id ? String(row.creation_project_id) : null,
    sourceAssetId: String(row.source_asset_id), referenceUrl: String(row.reference_url), prompt: String(row.prompt),
    aspectRatio: String(row.aspect_ratio) as GovernedKingcamIdentityJob["aspectRatio"], status: String(row.status) as JobStatus,
    providerPredictionId: row.provider_prediction_id ? String(row.provider_prediction_id) : null,
    providerUrl: row.provider_url ? String(row.provider_url) : null, durableUrl: row.durable_url ? String(row.durable_url) : null,
    outputFingerprint: row.output_fingerprint ? String(row.output_fingerprint) : null, mediaAssetId: row.media_asset_id ? String(row.media_asset_id) : null,
    plannedCost: parseJson(row.planned_cost_json, { provider: "replicate", model: FLUXDEVCAM.model, maximumImages: 1, costBound: "single-benchmark-image", actualProviderCost: "reported by provider after completion when available" }),
    review: parseJson(row.review_json, null), error: row.error_message ? String(row.error_message) : null,
    createdAt: String(row.created_at), updatedAt: String(row.updated_at),
  };
}

function assertOwner(ownerId: number): void {
  if (!OWNER_IDS.has(Number(ownerId))) throw new Error("Only the CreatorVault owner may authorize a bounded KingCam identity benchmark.");
}

export async function createGovernedKingcamIdentityPlan(input: {
  ownerId: number; creatorId: number; directorRequestId: string; creationProjectId?: string | null; sourceAssetId: string; referenceUrl: string;
  prompt: string; aspectRatio: "9:16" | "16:9" | "1:1";
}): Promise<GovernedKingcamIdentityJob> {
  assertOwner(input.ownerId);
  await ensureGovernedKingcamIdentitySchema();
  if (!/^https:\/\//.test(input.referenceUrl)) throw new Error("A secure approved KingCam reference is required.");
  const id = randomUUID();
  const plannedCost = { provider: "replicate" as const, model: FLUXDEVCAM.model, maximumImages: 1, costBound: "single-benchmark-image", actualProviderCost: "reported by provider after completion when available" };
  await rawExec(`INSERT INTO governed_kingcam_identity_jobs
    (id, creator_id, director_request_id, creation_project_id, source_asset_id, reference_url, prompt, aspect_ratio, status, planned_cost_json, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'planned', ?, NOW(), NOW())`,
    [id, input.creatorId, input.directorRequestId, input.creationProjectId || null, input.sourceAssetId, input.referenceUrl, input.prompt, input.aspectRatio, safeJson(plannedCost)]);
  return (await getGovernedKingcamIdentityJob(input.creatorId, id))!;
}

async function replicateImage(input: { prompt: string; referenceUrl: string; aspectRatio: string }): Promise<{ predictionId: string; url: string }> {
  const token = process.env.REPLICATE_API_TOKEN;
  if (!token) throw new Error("REPLICATE_API_TOKEN is not configured for governed KingCam identity creation.");
  const prompt = injectKingCamDNA(input.prompt, { suitColor: "midnight navy velvet with gold accents", styleLevel: "editorial" });
  const response = await fetch("https://api.replicate.com/v1/predictions", {
    method: "POST", headers: { Authorization: `Token ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ version: FLUXDEVCAM.version, input: {
      prompt: `${prompt}, full-body editorial stance, strong direct gaze, natural hands, no typography, no watermark`,
      negative_prompt: `${KINGCAM_DNA.negativeIdentity}, ${KINGCAM_DNA.negativeVisualArtifacts}`,
      image: input.referenceUrl, aspect_ratio: input.aspectRatio, output_format: "webp", output_quality: 95, num_inference_steps: 32, guidance_scale: 3.8,
    }}),
  });
  if (!response.ok) throw new Error(`Replicate identity benchmark start failed (${response.status}): ${await response.text()}`);
  const started = await response.json() as { id?: string };
  if (!started.id) throw new Error("Replicate identity benchmark returned no prediction ID.");
  for (let attempt = 0; attempt < 120; attempt += 1) {
    await new Promise((resolve) => setTimeout(resolve, 5000));
    const poll = await fetch(`https://api.replicate.com/v1/predictions/${started.id}`, { headers: { Authorization: `Token ${token}` } });
    const result = await poll.json() as { status?: string; output?: string | string[]; error?: string };
    if (result.status === "succeeded") {
      const url = Array.isArray(result.output) ? result.output[0] : result.output;
      if (!url) throw new Error("Replicate identity benchmark returned no image URL.");
      return { predictionId: started.id, url };
    }
    if (result.status === "failed" || result.status === "canceled") throw new Error(`Replicate identity benchmark ${result.status}: ${result.error || "unknown error"}`);
  }
  throw new Error("Replicate identity benchmark timed out.");
}

async function persistDurableImage(jobId: string, providerUrl: string): Promise<{ durableUrl: string; fingerprint: string }> {
  const response = await fetch(providerUrl);
  if (!response.ok) throw new Error(`Generated KingCam image could not be downloaded (${response.status}).`);
  const bytes = Buffer.from(await response.arrayBuffer());
  const fingerprint = createHash("sha256").update(bytes).digest("hex");
  const directory = path.join(PUBLIC_ROOT, "content-vault", jobId);
  await mkdir(directory, { recursive: true });
  await writeFile(path.join(directory, "KingCam-Governed-Identity-Benchmark.webp"), bytes);
  return { durableUrl: `https://creatorvault.live/uploads/content-vault/${jobId}/KingCam-Governed-Identity-Benchmark.webp`, fingerprint };
}

export async function executeGovernedKingcamIdentityPlan(input: { ownerId: number; creatorId: number; jobId: string }): Promise<GovernedKingcamIdentityJob> {
  assertOwner(input.ownerId);
  const job = await getGovernedKingcamIdentityJob(input.creatorId, input.jobId);
  if (!job) throw new Error("The governed KingCam identity plan was not found.");
  if (job.status !== "planned") throw new Error("This governed KingCam identity plan has already been submitted or resolved.");
  await rawExec("UPDATE governed_kingcam_identity_jobs SET status = 'creating', updated_at = NOW() WHERE id = ?", [job.id]);
  try {
    const provider = await replicateImage({ prompt: job.prompt, referenceUrl: job.referenceUrl, aspectRatio: job.aspectRatio });
    const durable = await persistDurableImage(job.id, provider.url);
    await rawExec(`UPDATE governed_kingcam_identity_jobs
      SET status = 'quality_review', provider_prediction_id = ?, provider_url = ?, durable_url = ?, output_fingerprint = ?, updated_at = NOW() WHERE id = ?`,
      [provider.predictionId, provider.url, durable.durableUrl, durable.fingerprint, job.id]);
  } catch (error: any) {
    await rawExec("UPDATE governed_kingcam_identity_jobs SET status = 'failed', error_message = ?, updated_at = NOW() WHERE id = ?", [String(error?.message || error), job.id]);
  }
  return (await getGovernedKingcamIdentityJob(input.creatorId, input.jobId))!;
}

export async function reviewGovernedKingcamIdentityPlan(input: { ownerId: number; creatorId: number; jobId: string; accept: boolean; overallScore: number; criteria: IdentityReviewCriteria; notes: string }): Promise<GovernedKingcamIdentityJob> {
  assertOwner(input.ownerId);
  const job = await getGovernedKingcamIdentityJob(input.creatorId, input.jobId);
  if (!job || job.status !== "quality_review" || !job.durableUrl || !job.outputFingerprint) throw new Error("A completed durable KingCam identity image is required before review.");
  const values = Object.values(input.criteria);
  if (!values.every((value) => Number.isFinite(value) && value >= 0 && value <= 100)) throw new Error("Every KingCam identity review score must be between 0 and 100.");
  const accepted = Boolean(input.accept) && input.overallScore >= 75 && input.criteria.identityPreservation >= 75 && input.criteria.anatomy >= 75 && input.criteria.artifactRate >= 75;
  const review = { status: accepted ? "accepted" as const : "rejected" as const, overallScore: input.overallScore, criteria: input.criteria, notes: input.notes };
  let mediaAssetId: string | null = null;
  if (accepted) {
    mediaAssetId = randomUUID();
    await rawExec(`INSERT INTO media_assets
      (id, user_id, source_type, asset_type, file_name, original_name, mime_type, storage_path, public_url, thumbnail_url, duration, status, created_by_feature)
      VALUES (?, ?, 'generated', 'image', 'KingCam-Governed-Identity-Benchmark.webp', 'KingCam-Governed-Identity-Benchmark.webp', 'image/webp', ?, ?, ?, NULL, 'ready', 'governed_kingcam_identity')`,
      [mediaAssetId, input.creatorId, job.durableUrl, job.durableUrl, job.durableUrl]);
  }
  await rawExec(`UPDATE governed_kingcam_identity_jobs SET status = ?, media_asset_id = ?, review_json = ?, updated_at = NOW() WHERE id = ?`,
    [accepted ? "accepted" : "rejected", mediaAssetId, safeJson(review), job.id]);
  await recordCreationModelBenchmark({
    modelKey: MODEL_KEY, sourceEvidenceId: job.sourceAssetId, benchmarkVersion: "kingcam-identity-governed-benchmark-v1", inputSignature: createHash("sha256").update(`${job.referenceUrl}:${job.prompt}:${job.outputFingerprint}`).digest("hex"),
    criteria: input.criteria, overallScore: input.overallScore, qualityState: accepted ? "accepted" : "rejected", evidenceReference: job.durableUrl, notes: input.notes, reviewedBy: input.ownerId,
  });
  return (await getGovernedKingcamIdentityJob(input.creatorId, input.jobId))!;
}

export async function getGovernedKingcamIdentityJob(creatorId: number, jobId: string): Promise<GovernedKingcamIdentityJob | null> {
  await ensureGovernedKingcamIdentitySchema();
  const rows = await rawQuery("SELECT * FROM governed_kingcam_identity_jobs WHERE id = ? AND creator_id = ? LIMIT 1", [jobId, creatorId]);
  return rows[0] ? normalise(rows[0]) : null;
}

export async function listGovernedKingcamIdentityJobs(creatorId: number): Promise<GovernedKingcamIdentityJob[]> {
  await ensureGovernedKingcamIdentitySchema();
  return (await rawQuery("SELECT * FROM governed_kingcam_identity_jobs WHERE creator_id = ? ORDER BY created_at DESC LIMIT 30", [creatorId])).map(normalise);
}
