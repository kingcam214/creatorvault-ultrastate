import { createHash, randomUUID } from "crypto";
import { mkdir, readFile, stat, writeFile } from "fs/promises";
import { execFile } from "child_process";
import { promisify } from "util";
import path from "path";
import { sql } from "drizzle-orm";
import { db } from "../db";
import { buildFrameEvidence, probeVideo } from "./bodyCinemaExistingMediaProofService";
import { reviewBodyCinemaOutput, type BodyCinemaOutputReview } from "./bodyCinemaOutputReviewService";
import { assertBodyCinemaEditBlueprintReady } from "./bodyCinemaEditBlueprintService";
import { assertBodyCinemaSourceMapReady } from "./bodyCinemaSourceMapService";
import { recordBodyCinemaProviderFailure } from "./bodyCinemaProviderResilienceService";
import { buildVaceMaskedEditContract, type VaceMaskedEditContract, vaceContractFingerprint } from "./bodyCinemaVaceWorkerContract";
import {
  TopazPrecisionProviderError,
  createTopazPrecisionVideoRequest,
  getTopazPrecisionVideoStatus,
  prepareTopazPrecisionVideoRequest,
  acceptTopazPrecisionVideoRequest,
  uploadAndCompleteTopazPrecisionVideo,
} from "./topazPrecisionVideoService";

export type GovernedPolloJobState =
  | "draft"
  | "cost_pending"
  | "awaiting_approval"
  | "approved"
  | "queued"
  | "submitted"
  | "submission_unknown"
  | "provider_complete"
  | "quality_review"
  | "accepted"
  | "rejected"
  | "failed"
  | "cancelled";

export type GovernedPolloConfig = {
  executionEnabled: boolean;
  emergencyFreezeOff: boolean;
  globalDailyCreditCap: number;
  perUserDailyCreditCap: number;
  perRequestCreditCap: number;
  maxConcurrentJobs: number;
  leaseSeconds: number;
};

export type CreateGovernedPolloDraftInput = {
  creatorId: number;
  provider?: "pollo" | "replicate" | "runway" | "topaz" | "vace";
  requestedBy: number;
  sourceUrl: string;
  sourceChecksum?: string | null;
  prompt: string;
  providerModelPath?: string;
  resolution: "480p" | "720p" | "1080p" | "2K";
  durationSeconds: number;
  aspectRatio?: "9:16" | "16:9" | "1:1";
  mode?: string;
  outputCount?: number;
  estimatedCostCredits?: number | null;
  costEvidenceReference?: string | null;
  ownershipConfirmed: boolean;
  consentConfirmed: boolean;
  idempotencyKey?: string | null;
  /** Internal correlation key supplied by Creation Director; never creator-facing. */
  requestId?: string | null;
  metadata?: Record<string, unknown>;
};

export type GovernedPolloJob = {
  id: number;
  requestId: string;
  creatorId: number;
  requestedBy: number;
  approvedBy: number | null;
  state: GovernedPolloJobState;
  idempotencyKey: string;
  fingerprint: string;
  sourceUrl: string;
  sourceChecksum: string | null;
  prompt: string;
  provider: "pollo" | "replicate" | "runway" | "topaz" | "vace";
  providerModelPath: string;
  resolution: string;
  durationSeconds: number;
  aspectRatio: string;
  mode: string;
  outputCount: number;
  estimatedCostCredits: number | null;
  actualCostCredits: number | null;
  costEvidenceReference: string | null;
  providerJobId: string | null;
  outputUrl: string | null;
  artifactUrl: string | null;
  qualityState: string | null;
  qualityScore: number | null;
  qualityReason: string | null;
  failureCode: string | null;
  failureMessage: string | null;
  leaseOwner: string | null;
  leaseExpiresAt: string | null;
  createdAt: string;
  updatedAt: string;
  approvedAt: string | null;
  submittedAt: string | null;
  completedAt: string | null;
  metadata: Record<string, unknown>;
};

export type GovernedPolloEvent = {
  id: number;
  jobId: number;
  eventType: string;
  fromState: string | null;
  toState: string | null;
  actorId: number | null;
  correlationId: string | null;
  detail: Record<string, unknown>;
  createdAt: string;
};

export type GovernedPolloProviderQuote = {
  providerModelPath: string;
  providerApiPath: string;
  quotedCredits: number;
  quotedCostUsd: number;
  quotedAt: string;
  providerResponse: Record<string, unknown>;
};

const DEFAULT_MODEL_PATH = "pollo/pollo-v1-6";
const HOMEPAGE_TEXT_TO_VIDEO_MODEL_PATH = "pollo/google-veo-3-1";
const HOMEPAGE_TEXT_TO_VIDEO_MODE = "homepage_text2video";
const HOMEPAGE_TEXT_TO_VIDEO_API_PATH = "google/veo3-1";
const HOMEPAGE_PILOT_PUBLIC_ROOT = "/root/uploads";
const HOMEPAGE_PILOT_MAX_BYTES = 350 * 1024 * 1024;
const DESIGN_IMAGE_MODEL_PATH = "pollo/openai-gpt-image-2-0";
const DESIGN_IMAGE_MODE = "design_image_reference_thumbnail";
const DESIGN_IMAGE_API_PATH = "openai/gpt-image-2-0/image";
const DESIGN_IMAGE_PUBLIC_ROOT = "/root/uploads";
const DESIGN_IMAGE_MAX_BYTES = 50 * 1024 * 1024;
const execFileAsync = promisify(execFile);
const SOURCE_VIDEO_REFERENCE_MODEL_PATH = "pollo/bytedance-seedance-2-5-ref2video";
const REPLICATE_WAN_VIDEO_EDIT_MODEL_PATH = "replicate/wan-video/wan-2.7-videoedit";
const REPLICATE_WAN_VIDEO_EDIT_MODE = "replicate_source_video_edit";
const REPLICATE_WAN_VIDEO_EDIT_MAX_BYTES = 200 * 1024 * 1024;
const REPLICATE_BODY_CINEMA_EXECUTION_ENABLED = false;
const REPLICATE_WAN_VIDEO_EDIT_HARD_SPEND_CAP = 2;
const REPLICATE_OMNI_HUMAN_MODEL_PATH = "replicate/bytedance/omni-human";
const REPLICATE_OMNI_HUMAN_MODE = "replicate_kingcam_omnihuman_full_body";
const REPLICATE_OMNI_HUMAN_HARD_SPEND_CAP_USD = 2;
const REPLICATE_OMNI_HUMAN_IDENTITY_IMAGE_URL = "https://creatorvault.live/images/kingcam-profile/kingcam-crown-lounge-reference.png";
const REPLICATE_OMNI_HUMAN_AUDIO_URL = "https://creatorvault.live/uploads/content-vault/kingcam-voice-tour-v1/entry.mp3";
const REPLICATE_WAN_ANIMATE_MODEL_PATH = "replicate/wan-video/wan-2.2-animate-animation";
const REPLICATE_WAN_ANIMATE_MODE = "replicate_kingcam_wan_animate_real_driver_motion";
const REPLICATE_WAN_ANIMATE_HARD_SPEND_CAP_USD = 2;
const REPLICATE_WAN_ANIMATE_IDENTITY_IMAGE_URL = "https://creatorvault.live/images/kingcam-profile/kingcam-crown-lounge-reference.png";
const REPLICATE_WAN_ANIMATE_DRIVER_URL = "https://creatorvault.live/uploads/content-vault/9c47c6e0-a7ce-4e85-89a8-25c2f98d2980/kingcam-real-gait-driver-0129-0136.mp4";
const KINGCAM_GOENHANCE_MODEL_PATH = "pollo/go-enhance/go-enhance-v1";
const KINGCAM_GOENHANCE_MODE = "kingcam_goenhance_real_performance_video2video";
const KINGCAM_GOENHANCE_STYLE_CODE = "mx-v2v";
const KINGCAM_GOENHANCE_HARD_CREDIT_CAP = 105;
const KINGCAM_GOENHANCE_REAL_DRIVER_URL = REPLICATE_WAN_ANIMATE_DRIVER_URL;
const RUNWAY_ALEPH_2_VIDEO_EDIT_MODEL_PATH = "runway/aleph-2-video-edit";
const RUNWAY_ALEPH_2_VIDEO_EDIT_MODE = "runway_aleph_2_source_video_edit";
const RUNWAY_ALEPH_2_VIDEO_EDIT_MAX_BYTES = 200 * 1024 * 1024;
const RUNWAY_ALEPH_2_CREDITS_PER_SOURCE_SECOND = 28;
const TOPAZ_PROTEUS_PRECISION_VIDEO_MODEL_PATH = "topaz/proteus-precision-video";
const TOPAZ_PROTEUS_PRECISION_VIDEO_MODE = "topaz_proteus_precision_finish";
const TOPAZ_PROTEUS_1080P_CREDITS_PER_10_SECONDS = 2;
const CREATORVAULT_VACE_MODEL_PATH = "creatorvault/wan2.1-vace-14b-masked-video-edit";
const CREATORVAULT_VACE_MODE = "creatorvault_vace_lighting_preservation";
const CREATORVAULT_VACE_HARD_SESSION_CAP_USD = 20;
const CREATORVAULT_VACE_OUTPUT_MAX_BYTES = 500 * 1024 * 1024;
const KLING_SOURCE_VIDEO_REFERENCE_MODEL_PATH = "pollo/kling-v3-omni-ref2video";
const MINIMAX_H3_SOURCE_VIDEO_REFERENCE_MODEL_PATH = "pollo/minimax/minimax-h3";
const KINGCAM_WAN_SPOKEN_MOTION_MODEL_PATH = "pollo/wanx/wan-v2-7";
const KINGCAM_WAN_SPOKEN_MOTION_MODE = "kingcam_wan27_audio_driven_full_body";
const KINGCAM_WAN_SPOKEN_MOTION_HARD_CREDIT_CAP = 75;
const KINGCAM_WAN_SPOKEN_MOTION_DURATION_SECONDS = 7;
const KINGCAM_WAN_SPOKEN_MOTION_IMAGE_URL = "https://creatorvault.live/images/kingcam-profile/kingcam-crown-lounge-reference.png";
const KINGCAM_WAN_SPOKEN_MOTION_AUDIO_URL = "https://creatorvault.live/uploads/content-vault/kingcam-voice-tour-v1/entry.mp3";
const KINGCAM_KLING_OMNI_SPOKEN_MOTION_MODEL_PATH = "pollo/kling-ai/kling-v3-omni-ref2video";
const KINGCAM_KLING_OMNI_SPOKEN_MOTION_MODE = "kingcam_kling_omni_multimodal_full_body";
const KINGCAM_KLING_OMNI_SPOKEN_MOTION_HARD_CREDIT_CAP = 75;
const KINGCAM_KLING_OMNI_SPOKEN_MOTION_DURATION_SECONDS = 15;
const KINGCAM_KLING_OMNI_SPOKEN_MOTION_IMAGE_URL = "https://creatorvault.live/images/kingcam-profile/kingcam-crown-lounge-reference.png";
const KINGCAM_KLING_OMNI_SPOKEN_MOTION_AUDIO_URL = "https://creatorvault.live/uploads/content-vault/kingcam-voice-tour-v1/happyhorse-fullbody-proof.mp3";
const SOURCE_VIDEO_REFERENCE_MODE = "ref2video";
const SOURCE_VIDEO_REFERENCE_CONTRACTS = {
  [SOURCE_VIDEO_REFERENCE_MODEL_PATH]: {
    apiPath: "bytedance/seedance-2-5/ref2video",
    acceptedResolutions: ["480p", "720p"] as const,
    providerResolution: (resolution: string) => resolution,
  },
  [KLING_SOURCE_VIDEO_REFERENCE_MODEL_PATH]: {
    apiPath: "kling-ai/kling-v3-omni/ref2video",
    acceptedResolutions: ["720p", "1080p"] as const,
    providerResolution: (resolution: string) => resolution === "720p" ? "720P" : "1080P",
  },
  [MINIMAX_H3_SOURCE_VIDEO_REFERENCE_MODEL_PATH]: {
    apiPath: "minimax/minimax-h3/ref2video",
    acceptedResolutions: ["2K"] as const,
    providerResolution: () => "2K",
  },
} as const;
const OWNER_IDS = new Set([6, 33]);
const ACTIVE_LEASE_STATES: GovernedPolloJobState[] = ["queued", "submitted", "submission_unknown", "provider_complete", "quality_review"];
const TERMINAL_STATES: GovernedPolloJobState[] = ["accepted", "rejected", "failed", "cancelled"];

function readNonNegativeInteger(name: string, fallback = 0): number {
  const raw = process.env[name];
  if (raw === undefined || raw.trim() === "") return fallback;
  const value = Number(raw);
  return Number.isInteger(value) && value >= 0 ? value : fallback;
}

export async function auditPolloAvailableCredits(): Promise<{ availableCredits: number | null; observedAt: string }> {
  const apiKey = String(process.env.POLLO_API_KEY || "").trim();
  if (!apiKey) throw new Error("POLLO_API_KEY is not configured for the read-only credit-balance audit.");
  return { availableCredits: await readPolloAvailableCredits(apiKey), observedAt: new Date().toISOString() };
}

export function getGovernedPolloConfig(): GovernedPolloConfig {
  const executionEnabled = process.env.CREATORVAULT_POLLO_EXECUTION_MODE === "governed"
    && process.env.CREATORVAULT_POLLO_EMERGENCY_FREEZE === "off"
    && process.env.CREATORVAULT_GOVERNED_POLLO_EXECUTION_ENABLED === "true";

  return {
    executionEnabled,
    emergencyFreezeOff: process.env.CREATORVAULT_POLLO_EMERGENCY_FREEZE === "off",
    globalDailyCreditCap: readNonNegativeInteger("CREATORVAULT_POLLO_GLOBAL_DAILY_CREDIT_CAP", 0),
    perUserDailyCreditCap: readNonNegativeInteger("CREATORVAULT_POLLO_PER_USER_DAILY_CREDIT_CAP", 0),
    perRequestCreditCap: readNonNegativeInteger("CREATORVAULT_POLLO_PER_REQUEST_CREDIT_CAP", 0),
    maxConcurrentJobs: readNonNegativeInteger("CREATORVAULT_POLLO_MAX_CONCURRENT_JOBS", 0),
    leaseSeconds: Math.max(30, readNonNegativeInteger("CREATORVAULT_POLLO_LEASE_SECONDS", 300)),
  };
}

export function isGovernedPolloExecutionEnabled(): boolean {
  const config = getGovernedPolloConfig();
  return config.executionEnabled
    && config.globalDailyCreditCap > 0
    && config.perUserDailyCreditCap > 0
    && config.perRequestCreditCap > 0
    && config.maxConcurrentJobs > 0;
}

function requireOwner(userId: number): void {
  if (!OWNER_IDS.has(Number(userId))) {
    throw new Error("Owner approval is required for governed Pollo operations.");
  }
}

function requirePositiveInteger(value: number | null | undefined, label: string): number {
  if (!Number.isInteger(value) || Number(value) <= 0) {
    throw new Error(`${label} must be a positive integer.`);
  }
  return Number(value);
}

function requirePositiveDuration(value: number | null | undefined, label: string): number {
  const duration = Number(value);
  if (!Number.isFinite(duration) || duration <= 0) throw new Error(`${label} must be a positive duration.`);
  return Math.round(duration * 1000) / 1000;
}

function requirePositiveAmount(value: number | null | undefined, label: string): number {
  const normalized = Number(value);
  if (!Number.isFinite(normalized) || normalized <= 0) throw new Error(`${label} must be a positive amount.`);
  return Math.round(normalized * 100) / 100;
}

function requireNonNegativeAmount(value: number | null | undefined, label: string): number {
  const normalized = Number(value);
  if (!Number.isFinite(normalized) || normalized < 0) throw new Error(`${label} must be a non-negative amount.`);
  return Math.round(normalized * 100) / 100;
}

function requireNonEmpty(value: string | null | undefined, label: string): string {
  const normalized = String(value ?? "").trim();
  if (!normalized) throw new Error(`${label} is required.`);
  return normalized;
}

function safeJson(value: unknown): string {
  try {
    return JSON.stringify(value ?? {});
  } catch {
    return JSON.stringify({ serialization_error: true });
  }
}

function parseJson(value: unknown): Record<string, unknown> {
  if (!value) return {};
  if (typeof value === "object") return value as Record<string, unknown>;
  try {
    return JSON.parse(String(value)) as Record<string, unknown>;
  } catch {
    return {};
  }
}

export async function readPolloAvailableCredits(apiKey: string): Promise<number | null> {
  try {
    const response = await fetch("https://pollo.ai/api/platform/credit/balance", {
      method: "GET",
      headers: { "x-api-key": apiKey, Accept: "application/json" },
    });
    if (!response.ok) return null;
    const payload = await parseProviderJson(response);
    const record = payload.data && typeof payload.data === "object" ? payload.data as Record<string, unknown> : payload;
    const available = Number(record.availableCredits);
    return Number.isFinite(available) && available >= 0 ? available : null;
  } catch {
    return null;
  }
}

function safeErrorMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error ?? "Unknown error");
  return message.replace(/x-api-key\s*[:=]\s*[^\s,]+/gi, "x-api-key=[redacted]").slice(0, 1200);
}

function getSourceVideoReferenceContract(providerModelPath: string) {
  return SOURCE_VIDEO_REFERENCE_CONTRACTS[providerModelPath as keyof typeof SOURCE_VIDEO_REFERENCE_CONTRACTS] || null;
}

function isSourceVideoReferenceJob(job: Pick<GovernedPolloJob, "providerModelPath" | "mode">): boolean {
  return Boolean(getSourceVideoReferenceContract(job.providerModelPath)) && job.mode === SOURCE_VIDEO_REFERENCE_MODE;
}

function isKingcamWanSpokenMotionJob(job: Pick<GovernedPolloJob, "provider" | "providerModelPath" | "mode" | "metadata">): boolean {
  return job.provider === "pollo"
    && job.providerModelPath === KINGCAM_WAN_SPOKEN_MOTION_MODEL_PATH
    && job.mode === KINGCAM_WAN_SPOKEN_MOTION_MODE
    && job.metadata.kingcamFullBodySpokenMotionProof === true
    && job.metadata.ownerDirectedPilot === true
    && job.metadata.candidateLimit === 1
    && job.metadata.noAutomaticRetry === true
    && job.metadata.sourcePreservationRequired === true
    && job.metadata.genericVoiceFallbackForbidden === true
    && job.metadata.audioUrl === KINGCAM_WAN_SPOKEN_MOTION_AUDIO_URL
    && job.metadata.hardCreditCap === KINGCAM_WAN_SPOKEN_MOTION_HARD_CREDIT_CAP;
}

function isKingcamKlingOmniSpokenMotionJob(job: Pick<GovernedPolloJob, "provider" | "providerModelPath" | "mode" | "metadata">): boolean {
  return job.provider === "pollo"
    && job.providerModelPath === KINGCAM_KLING_OMNI_SPOKEN_MOTION_MODEL_PATH
    && job.mode === KINGCAM_KLING_OMNI_SPOKEN_MOTION_MODE
    && job.metadata.kingcamKlingOmniFullBodySpokenMotionProof === true
    && job.metadata.ownerDirectedPilot === true
    && job.metadata.candidateLimit === 1
    && job.metadata.noAutomaticRetry === true
    && job.metadata.sourcePreservationRequired === true
    && job.metadata.genericVoiceFallbackForbidden === true
    && job.metadata.audioUrl === KINGCAM_KLING_OMNI_SPOKEN_MOTION_AUDIO_URL
    && job.metadata.hardCreditCap === KINGCAM_KLING_OMNI_SPOKEN_MOTION_HARD_CREDIT_CAP;
}

function isReplicateWanVideoEditJob(job: Pick<GovernedPolloJob, "provider" | "providerModelPath" | "mode" | "metadata">): boolean {
  return job.provider === "replicate"
    && job.providerModelPath === REPLICATE_WAN_VIDEO_EDIT_MODEL_PATH
    && job.mode === REPLICATE_WAN_VIDEO_EDIT_MODE
    && job.metadata.ownerDirectedPilot === true
    && job.metadata.candidateLimit === 1
    && job.metadata.noAutomaticRetry === true;
}

function isReplicateWanAnimateJob(job: Pick<GovernedPolloJob, "provider" | "providerModelPath" | "mode" | "metadata">): boolean {
  return job.provider === "replicate"
    && job.providerModelPath === REPLICATE_WAN_ANIMATE_MODEL_PATH
    && job.mode === REPLICATE_WAN_ANIMATE_MODE
    && job.metadata.kingcamWanAnimateRealDriverProof === true
    && job.metadata.cloneOnly === true
    && job.metadata.ownerDirectedPilot === true
    && job.metadata.candidateLimit === 1
    && job.metadata.noAutomaticRetry === true
    && job.metadata.sourcePreservationRequired === true
    && job.metadata.hardCreditCap === REPLICATE_WAN_ANIMATE_HARD_SPEND_CAP_USD
    && job.metadata.identityImageUrl === REPLICATE_WAN_ANIMATE_IDENTITY_IMAGE_URL
    && job.metadata.motionDriverUrl === REPLICATE_WAN_ANIMATE_DRIVER_URL
    && job.metadata.bodyCinemaExcluded === true;
}

function isKingcamGoEnhanceRealPerformanceJob(job: Pick<GovernedPolloJob, "provider" | "providerModelPath" | "mode" | "sourceUrl" | "metadata">): boolean {
  return job.provider === "pollo"
    && job.providerModelPath === KINGCAM_GOENHANCE_MODEL_PATH
    && job.mode === KINGCAM_GOENHANCE_MODE
    && job.sourceUrl === KINGCAM_GOENHANCE_REAL_DRIVER_URL
    && job.metadata.kingcamGoEnhanceRealPerformanceProof === true
    && job.metadata.cloneOnly === true
    && job.metadata.ownerDirectedPilot === true
    && job.metadata.candidateLimit === 1
    && job.metadata.noAutomaticRetry === true
    && job.metadata.sourcePreservationRequired === true
    && job.metadata.hardCreditCap === KINGCAM_GOENHANCE_HARD_CREDIT_CAP
    && job.metadata.styleCode === KINGCAM_GOENHANCE_STYLE_CODE
    && job.metadata.bodyCinemaExcluded === true;
}

function isReplicateOmniHumanJob(job: Pick<GovernedPolloJob, "provider" | "providerModelPath" | "mode" | "metadata">): boolean {
  return job.provider === "replicate"
    && job.providerModelPath === REPLICATE_OMNI_HUMAN_MODEL_PATH
    && job.mode === REPLICATE_OMNI_HUMAN_MODE
    && job.metadata.kingcamOmniHumanFullBodyProof === true
    && job.metadata.cloneOnly === true
    && job.metadata.ownerDirectedPilot === true
    && job.metadata.candidateLimit === 1
    && job.metadata.noAutomaticRetry === true
    && job.metadata.sourcePreservationRequired === true
    && job.metadata.genericVoiceFallbackForbidden === true
    && job.metadata.audioUrl === REPLICATE_OMNI_HUMAN_AUDIO_URL
    && job.metadata.hardCreditCap === REPLICATE_OMNI_HUMAN_HARD_SPEND_CAP_USD
    && job.metadata.bodyCinemaExcluded === true;
}

function isRunwayAlephVideoEditJob(job: Pick<GovernedPolloJob, "provider" | "providerModelPath" | "mode" | "metadata">): boolean {
  return job.provider === "runway"
    && job.providerModelPath === RUNWAY_ALEPH_2_VIDEO_EDIT_MODEL_PATH
    && job.mode === RUNWAY_ALEPH_2_VIDEO_EDIT_MODE
    && job.metadata.ownerDirectedPilot === true
    && job.metadata.candidateLimit === 1
    && job.metadata.noAutomaticRetry === true
    && job.metadata.sourcePreservationRequired === true
    && typeof job.metadata.bodyCinemaEditBlueprintId === "string"
    && job.metadata.bodyCinemaBlueprintState === "ready_no_spend";
}

function isTopazPrecisionVideoJob(job: Pick<GovernedPolloJob, "provider" | "providerModelPath" | "mode" | "metadata">): boolean {
  return job.provider === "topaz"
    && job.providerModelPath === TOPAZ_PROTEUS_PRECISION_VIDEO_MODEL_PATH
    && job.mode === TOPAZ_PROTEUS_PRECISION_VIDEO_MODE
    && job.metadata.ownerDirectedPilot === true
    && job.metadata.candidateLimit === 1
    && job.metadata.noAutomaticRetry === true
    && job.metadata.sourcePreservationRequired === true
    && job.metadata.reviewClass === "technical_source_preservation"
    && job.metadata.topazPrecisionModel === "prob-4"
    && typeof job.metadata.bodyCinemaEditBlueprintId === "string"
    && typeof job.metadata.bodyCinemaSourceMapId === "string";
}

function isCreatorVaultVaceLightingJob(job: Pick<GovernedPolloJob, "provider" | "providerModelPath" | "mode" | "metadata">): boolean {
  return job.provider === "vace"
    && job.providerModelPath === CREATORVAULT_VACE_MODEL_PATH
    && job.mode === CREATORVAULT_VACE_MODE
    && job.metadata.ownerDirectedPilot === true
    && job.metadata.candidateLimit === 1
    && job.metadata.noAutomaticRetry === true
    && job.metadata.sourcePreservationRequired === true
    && typeof job.metadata.vaceContract === "object"
    && typeof job.metadata.bodyCinemaEvidenceId === "string"
    && typeof job.metadata.bodyCinemaEditBlueprintId === "string"
    && typeof job.metadata.bodyCinemaSourceMapId === "string";
}

function resolveCreatorVaultUploadPath(sourceUrl: string): string {
  const parsed = new URL(sourceUrl);
  if (parsed.protocol !== "https:" || parsed.hostname !== "creatorvault.live") {
    throw new Error("Topaz precision finishing requires the protected CreatorVault Media Vault source URL.");
  }
  const prefix = "/uploads/";
  const pathname = decodeURIComponent(parsed.pathname);
  if (!pathname.startsWith(prefix)) throw new Error("Topaz precision finishing requires a Media Vault upload path.");
  const relative = pathname.slice(prefix.length);
  if (!relative || relative.split("/").some((segment) => !segment || segment === "." || segment === "..")) {
    throw new Error("The protected Media Vault source path is invalid.");
  }
  const localPath = path.resolve("/root/uploads", relative);
  if (!localPath.startsWith("/root/uploads/")) throw new Error("The protected Media Vault source path escaped its storage boundary.");
  return localPath;
}

function isHomepageTextToVideoPilot(job: Pick<GovernedPolloJob, "providerModelPath" | "mode" | "metadata">): boolean {
  return job.providerModelPath === HOMEPAGE_TEXT_TO_VIDEO_MODEL_PATH
    && job.mode === HOMEPAGE_TEXT_TO_VIDEO_MODE
    && job.metadata.homepageMotionPilot === true
    && job.metadata.ownerDirectedPilot === true
    && job.metadata.candidateLimit === 1
    && job.metadata.noAutomaticRetry === true;
}

function isDesignImagePilot(job: Pick<GovernedPolloJob, "providerModelPath" | "mode" | "metadata">): boolean {
  return job.providerModelPath === DESIGN_IMAGE_MODEL_PATH
    && job.mode === DESIGN_IMAGE_MODE
    && job.metadata.designImagePilot === true
    && job.metadata.ownerDirectedPilot === true
    && job.metadata.candidateLimit === 1
    && job.metadata.noAutomaticRetry === true;
}

function isSingleUseGovernedPilot(job: Pick<GovernedPolloJob, "provider" | "providerModelPath" | "mode" | "sourceUrl" | "metadata">): boolean {
  return isSourceVideoReferenceJob(job) || isKingcamWanSpokenMotionJob(job) || isKingcamKlingOmniSpokenMotionJob(job) || isReplicateWanVideoEditJob(job) || isReplicateWanAnimateJob(job) || isKingcamGoEnhanceRealPerformanceJob(job) || isReplicateOmniHumanJob(job) || isRunwayAlephVideoEditJob(job) || isTopazPrecisionVideoJob(job) || isCreatorVaultVaceLightingJob(job) || isHomepageTextToVideoPilot(job) || isDesignImagePilot(job);
}

function isProviderVerifiedZeroQuoteJob(job: Pick<GovernedPolloJob, "providerModelPath" | "mode" | "estimatedCostCredits" | "metadata">): boolean {
  const quote = job.metadata.providerQuote;
  return isSourceVideoReferenceJob(job)
    && (Number(job.estimatedCostCredits) === 0 || Number(job.estimatedCostCredits) === 33)
    && job.metadata.verifiedProviderQuote === true
    && Boolean(quote && typeof quote === "object");
}

function buildHomepageTextToVideoInput(job: Pick<GovernedPolloJob, "prompt" | "resolution" | "durationSeconds">): Record<string, unknown> {
  if (job.resolution !== "1080p" || job.durationSeconds !== 6) {
    throw new Error("Homepage motion pilot must remain one 6-second 1080p Veo creation.");
  }
  return {
    prompt: job.prompt,
    resolution: "1080p",
    length: 6,
    aspectRatio: "9:16",
    generateAudio: false,
  };
}

async function persistHomepageTextToVideoOutput(job: GovernedPolloJob, providerUrl: string): Promise<{ durableUrl: string; fingerprint: string }> {
  const response = await fetch(providerUrl, { redirect: "follow" });
  if (!response.ok) throw new Error(`Homepage motion output could not be downloaded (${response.status}).`);
  const contentType = String(response.headers.get("content-type") || "").toLowerCase();
  if (contentType && !contentType.includes("video/")) throw new Error(`Homepage motion output did not return video data (${contentType}).`);
  const declaredLength = Number(response.headers.get("content-length") || 0);
  if (declaredLength > HOMEPAGE_PILOT_MAX_BYTES) throw new Error("Homepage motion output exceeds the durable-storage safety limit.");
  const bytes = Buffer.from(await response.arrayBuffer());
  if (!bytes.length) throw new Error("Homepage motion output is empty.");
  if (bytes.length > HOMEPAGE_PILOT_MAX_BYTES) throw new Error("Homepage motion output exceeds the durable-storage safety limit.");
  const fingerprint = createHash("sha256").update(bytes).digest("hex");
  const directory = path.join(HOMEPAGE_PILOT_PUBLIC_ROOT, "content-vault", `homepage-motion-${job.id}`);
  await mkdir(directory, { recursive: true });
  const fileName = "CreatorVault-Homepage-Motion-Pilot.mp4";
  await writeFile(path.join(directory, fileName), bytes);
  return { durableUrl: `https://creatorvault.live/uploads/content-vault/homepage-motion-${job.id}/${fileName}`, fingerprint };
}

async function buildDesignImageInput(job: GovernedPolloJob): Promise<{ input: Record<string, unknown>; referenceFrameUrl: string }> {
  if (job.resolution !== "1080p" || job.aspectRatio !== "16:9" || job.durationSeconds !== 1) {
    throw new Error("Design image pilot must remain one 16:9 image request with the fixed source contract.");
  }
  if (!/^https:\/\//i.test(job.sourceUrl)) throw new Error("Design image pilot requires a secure CreatorVault source URL.");
  const directory = path.join(DESIGN_IMAGE_PUBLIC_ROOT, "content-vault", `design-image-${job.id}`);
  await mkdir(directory, { recursive: true });
  const fileName = "CreatorVault-Design-Reference.jpg";
  const destination = path.join(directory, fileName);
  await execFileAsync("ffmpeg", ["-y", "-ss", "00:00:02", "-i", job.sourceUrl, "-frames:v", "1", "-q:v", "2", destination], { timeout: 90_000 });
  const referenceFrameUrl = `https://creatorvault.live/uploads/content-vault/design-image-${job.id}/${fileName}`;
  return {
    referenceFrameUrl,
    input: { prompt: job.prompt, aspectRatio: "16:9", resolution: "2K", quality: "high", imageUrl: referenceFrameUrl },
  };
}

async function persistDesignImageOutput(job: GovernedPolloJob, providerUrl: string): Promise<{ durableUrl: string; fingerprint: string }> {
  const response = await fetch(providerUrl, { redirect: "follow" });
  if (!response.ok) throw new Error(`Design image output could not be downloaded (${response.status}).`);
  const contentType = String(response.headers.get("content-type") || "").toLowerCase();
  if (contentType && !contentType.startsWith("image/")) throw new Error(`Design image output did not return image data (${contentType}).`);
  const bytes = Buffer.from(await response.arrayBuffer());
  if (!bytes.length || bytes.length > DESIGN_IMAGE_MAX_BYTES) throw new Error("Design image output failed durable-storage validation.");
  const fingerprint = createHash("sha256").update(bytes).digest("hex");
  const directory = path.join(DESIGN_IMAGE_PUBLIC_ROOT, "content-vault", `design-image-${job.id}`);
  await mkdir(directory, { recursive: true });
  const extension = contentType.includes("png") ? "png" : "jpg";
  const fileName = `CreatorVault-Design-Image-Pilot.${extension}`;
  await writeFile(path.join(directory, fileName), bytes);
  return { durableUrl: `https://creatorvault.live/uploads/content-vault/design-image-${job.id}/${fileName}`, fingerprint };
}

export async function ingestAcceptedCampaignVisual(job: GovernedPolloJob, artifactUrl: string): Promise<string | null> {
  if (job.metadata.campaignVisual !== true) return null;
  if (!new RegExp(`^https://creatorvault\\.live/uploads/content-vault/design-image-${job.id}/`).test(artifactUrl)) {
    throw new Error("CreatorVault could not verify the accepted campaign visual storage path.");
  }

  const existing = await rawQuery("SELECT id FROM media_assets WHERE user_id = ? AND public_url = ? LIMIT 1", [job.creatorId, artifactUrl]);
  const assetId = existing[0]?.id ? String(existing[0].id) : randomUUID();
  if (!existing.length) {
    const extension = artifactUrl.toLowerCase().endsWith(".png") ? "png" : "jpg";
    const fileName = `CreatorVault-Campaign-Visual-${job.id}.${extension}`;
    await rawExec(
      `INSERT INTO media_assets
        (id, user_id, source_type, asset_type, file_name, original_name, mime_type, storage_path, public_url, thumbnail_url, status, created_by_feature)
       VALUES (?, ?, 'generated', 'image', ?, ?, ?, ?, ?, ?, 'ready', 'governed_campaign_visual')`,
      [assetId, job.creatorId, fileName, fileName, `image/${extension === "png" ? "png" : "jpeg"}`, artifactUrl, artifactUrl, artifactUrl],
    );
  }

  const projectId = typeof job.metadata.creationProjectId === "string" ? job.metadata.creationProjectId : null;
  if (projectId) {
    await rawExec(
      `UPDATE creation_projects
          SET accepted_media_asset_id = ?, state = 'accepted', updated_at = NOW()
        WHERE id = ? AND creator_id = ?`,
      [assetId, projectId, job.creatorId],
    );
  }
  return assetId;
}

function buildSourceVideoReferenceInput(input: {
  providerModelPath: string;
  sourceUrl: string;
  prompt: string;
  durationSeconds: number;
  resolution: string;
  aspectRatio: string;
}): Record<string, unknown> {
  const contract = getSourceVideoReferenceContract(input.providerModelPath);
  if (!contract) throw new Error("The governed source-video model does not have a documented provider contract.");
  if (!/^https:\/\//i.test(input.sourceUrl)) throw new Error("The governed source-video reference must be a secure HTTPS URL.");
  if (!Number.isInteger(input.durationSeconds) || input.durationSeconds < 4 || input.durationSeconds > 15) {
    throw new Error("Pollo source-video reference duration must be between 4 and 15 seconds.");
  }
  if (!(contract.acceptedResolutions as readonly string[]).includes(input.resolution)) throw new Error("Unsupported resolution for the documented source-video model.");
  if (!["9:16", "16:9", "1:1", "4:3", "3:4", "21:9"].includes(input.aspectRatio)) throw new Error("Unsupported Pollo source-video reference aspect ratio.");
  return {
    prompt: input.prompt,
    refs: [{ type: "video", name: "creatorvault_verified_source", video: input.sourceUrl, order: 1 }],
    duration: input.durationSeconds,
    resolution: contract.providerResolution(input.resolution),
    aspectRatio: input.aspectRatio,
    generateAudio: false,
  };
}

async function parseProviderJson(response: Response): Promise<Record<string, any>> {
  const text = await response.text().catch(() => "");
  if (!text) return {};
  try {
    const parsed = JSON.parse(text);
    return parsed && typeof parsed === "object" ? parsed as Record<string, any> : { responseText: text.slice(0, 1200) };
  } catch {
    return { responseText: text.slice(0, 1200) };
  }
}

function createFingerprint(input: Omit<CreateGovernedPolloDraftInput, "metadata" | "idempotencyKey"> & { providerModelPath: string }): string {
  const canonical = {
    creatorId: Number(input.creatorId),
    sourceUrl: String(input.sourceUrl).trim(),
    sourceChecksum: String(input.sourceChecksum ?? "").trim(),
    prompt: String(input.prompt).trim(),
    provider: input.provider ?? "pollo",
    providerModelPath: String(input.providerModelPath).trim(),
    resolution: String(input.resolution),
    durationSeconds: Number(input.durationSeconds),
    aspectRatio: String(input.aspectRatio ?? "9:16"),
    mode: String(input.mode ?? "basic"),
    outputCount: Number(input.outputCount ?? 1),
    estimatedCostCredits: input.estimatedCostCredits === null || input.estimatedCostCredits === undefined ? null : Number(input.estimatedCostCredits),
    costEvidenceReference: String(input.costEvidenceReference ?? "").trim(),
    ownershipConfirmed: Boolean(input.ownershipConfirmed),
    consentConfirmed: Boolean(input.consentConfirmed),
  };
  return createHash("sha256").update(JSON.stringify(canonical)).digest("hex");
}

function normaliseJob(row: any): GovernedPolloJob {
  return {
    id: Number(row.id),
    requestId: String(row.request_id),
    creatorId: Number(row.creator_id),
    requestedBy: Number(row.requested_by),
    approvedBy: row.approved_by === null || row.approved_by === undefined ? null : Number(row.approved_by),
    state: String(row.state) as GovernedPolloJobState,
    idempotencyKey: String(row.idempotency_key),
    fingerprint: String(row.fingerprint),
    sourceUrl: String(row.source_url),
    sourceChecksum: row.source_checksum ? String(row.source_checksum) : null,
    prompt: String(row.prompt),
    provider: ["pollo", "replicate", "runway", "topaz", "vace"].includes(String(row.provider || "pollo"))
      ? String(row.provider || "pollo") as GovernedPolloJob["provider"]
      : "pollo",
    providerModelPath: String(row.provider_model_path),
    resolution: String(row.resolution),
    durationSeconds: Number(row.duration_seconds),
    aspectRatio: String(row.aspect_ratio),
    mode: String(row.render_mode),
    outputCount: Number(row.output_count),
    estimatedCostCredits: row.estimated_cost_credits === null || row.estimated_cost_credits === undefined ? null : Number(row.estimated_cost_credits),
    actualCostCredits: row.actual_cost_credits === null || row.actual_cost_credits === undefined ? null : Number(row.actual_cost_credits),
    costEvidenceReference: row.cost_evidence_reference ? String(row.cost_evidence_reference) : null,
    providerJobId: row.provider_job_id ? String(row.provider_job_id) : null,
    outputUrl: row.output_url ? String(row.output_url) : null,
    artifactUrl: row.artifact_url ? String(row.artifact_url) : null,
    qualityState: row.quality_state ? String(row.quality_state) : null,
    qualityScore: row.quality_score === null || row.quality_score === undefined ? null : Number(row.quality_score),
    qualityReason: row.quality_reason ? String(row.quality_reason) : null,
    failureCode: row.failure_code ? String(row.failure_code) : null,
    failureMessage: row.failure_message ? String(row.failure_message) : null,
    leaseOwner: row.lease_owner ? String(row.lease_owner) : null,
    leaseExpiresAt: row.lease_expires_at ? String(row.lease_expires_at) : null,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
    approvedAt: row.approved_at ? String(row.approved_at) : null,
    submittedAt: row.submitted_at ? String(row.submitted_at) : null,
    completedAt: row.completed_at ? String(row.completed_at) : null,
    metadata: parseJson(row.metadata_json),
  };
}

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
  if (pool && typeof pool.promise === "function") {
    const [result] = await pool.promise().query(query, params);
    return result;
  }
  if (pool && typeof pool.execute === "function") {
    const [result] = await pool.execute(query, params);
    return result;
  }
  const values = [...params];
  const escaped = query.replace(/\?/g, () => {
    const value = values.shift();
    if (value === null || value === undefined) return "NULL";
    if (typeof value === "number") return String(value);
    return `'${String(value).replace(/'/g, "''")}'`;
  });
  return (db as any).execute(sql.raw(escaped));
}

function affectedRows(result: any): number {
  return Number(result?.affectedRows ?? result?.rowsAffected ?? result?.[0]?.affectedRows ?? 0);
}

async function appendEvent(params: {
  jobId: number;
  eventType: string;
  fromState?: string | null;
  toState?: string | null;
  actorId?: number | null;
  correlationId?: string | null;
  detail?: Record<string, unknown>;
}): Promise<void> {
  await rawExec(
    `INSERT INTO governed_media_events
      (job_id, event_type, from_state, to_state, actor_id, correlation_id, detail_json, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, NOW())`,
    [
      params.jobId,
      params.eventType,
      params.fromState ?? null,
      params.toState ?? null,
      params.actorId ?? null,
      params.correlationId ?? null,
      safeJson(params.detail),
    ],
  );
}

async function withNamedLock<T>(name: string, work: () => Promise<T>): Promise<T> {
  const lock = await rawQuery("SELECT GET_LOCK(?, 10) AS acquired", [name]);
  if (Number(lock[0]?.acquired ?? 0) !== 1) {
    throw new Error("Could not acquire the governed media budget lock. Please retry without submitting a provider request.");
  }
  try {
    return await work();
  } finally {
    await rawQuery("SELECT RELEASE_LOCK(?)", [name]).catch(() => undefined);
  }
}

export async function ensureGovernedPolloSchema(): Promise<void> {
  await rawExec(`CREATE TABLE IF NOT EXISTS governed_media_jobs (
    id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    request_id VARCHAR(64) NOT NULL,
    creator_id BIGINT NOT NULL,
    requested_by BIGINT NOT NULL,
    approved_by BIGINT NULL,
    state VARCHAR(32) NOT NULL,
    idempotency_key VARCHAR(191) NOT NULL,
    fingerprint CHAR(64) NOT NULL,
    source_url TEXT NOT NULL,
    source_checksum VARCHAR(128) NULL,
    prompt TEXT NOT NULL,
    provider VARCHAR(32) NOT NULL DEFAULT 'pollo',
    provider_model_path VARCHAR(128) NOT NULL,
    resolution VARCHAR(16) NOT NULL,
    duration_seconds INT NOT NULL,
    aspect_ratio VARCHAR(16) NOT NULL,
    render_mode VARCHAR(64) NOT NULL,
    output_count INT NOT NULL DEFAULT 1,
    estimated_cost_credits DECIMAL(12,2) NULL,
    actual_cost_credits DECIMAL(12,2) NULL,
    cost_evidence_reference TEXT NULL,
    provider_job_id VARCHAR(191) NULL,
    provider_response_json LONGTEXT NULL,
    output_url TEXT NULL,
    artifact_url TEXT NULL,
    quality_state VARCHAR(32) NULL,
    quality_score DECIMAL(7,3) NULL,
    quality_reason TEXT NULL,
    failure_code VARCHAR(96) NULL,
    failure_message TEXT NULL,
    lease_owner VARCHAR(191) NULL,
    lease_expires_at DATETIME NULL,
    metadata_json LONGTEXT NULL,
    created_at DATETIME NOT NULL,
    updated_at DATETIME NOT NULL,
    approved_at DATETIME NULL,
    submitted_at DATETIME NULL,
    completed_at DATETIME NULL,
    UNIQUE KEY governed_media_jobs_request_id (request_id),
    UNIQUE KEY governed_media_jobs_idempotency (idempotency_key),
    KEY governed_media_jobs_creator_state (creator_id, state, created_at),
    KEY governed_media_jobs_provider_job (provider, provider_job_id),
    KEY governed_media_jobs_lease (state, lease_expires_at)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);

  await rawExec(`CREATE TABLE IF NOT EXISTS governed_media_approvals (
    id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    job_id BIGINT NOT NULL,
    approver_id BIGINT NOT NULL,
    fingerprint CHAR(64) NOT NULL,
    decision VARCHAR(32) NOT NULL,
    estimated_cost_credits DECIMAL(12,2) NOT NULL,
    reason TEXT NULL,
    created_at DATETIME NOT NULL,
    UNIQUE KEY governed_media_approvals_job_decision (job_id, decision),
    KEY governed_media_approvals_approver (approver_id, created_at)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);

  await rawExec(`CREATE TABLE IF NOT EXISTS governed_media_budget_ledger (
    id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    job_id BIGINT NOT NULL,
    creator_id BIGINT NOT NULL,
    scope VARCHAR(32) NOT NULL,
    entry_type VARCHAR(32) NOT NULL,
    credits DECIMAL(12,2) NOT NULL,
    reference VARCHAR(191) NOT NULL,
    detail_json LONGTEXT NULL,
    created_at DATETIME NOT NULL,
    UNIQUE KEY governed_media_budget_job_scope_type (job_id, scope, entry_type),
    KEY governed_media_budget_scope_day (scope, created_at),
    KEY governed_media_budget_creator_day (creator_id, created_at)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);

  await rawExec(`CREATE TABLE IF NOT EXISTS governed_media_events (
    id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    job_id BIGINT NOT NULL,
    event_type VARCHAR(96) NOT NULL,
    from_state VARCHAR(32) NULL,
    to_state VARCHAR(32) NULL,
    actor_id BIGINT NULL,
    correlation_id VARCHAR(96) NULL,
    detail_json LONGTEXT NULL,
    created_at DATETIME NOT NULL,
    KEY governed_media_events_job (job_id, created_at),
    KEY governed_media_events_correlation (correlation_id, created_at)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
  await rawExec(`CREATE TABLE IF NOT EXISTS governed_media_single_use_permits (
    id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    job_id BIGINT NOT NULL,
    owner_id BIGINT NOT NULL,
    hard_credit_cap DECIMAL(12,2) NOT NULL,
    state VARCHAR(32) NOT NULL,
    reason TEXT NULL,
    created_at DATETIME NOT NULL,
    expires_at DATETIME NOT NULL,
    consumed_at DATETIME NULL,
    UNIQUE KEY governed_media_single_use_permits_job (job_id),
    KEY governed_media_single_use_permits_state (state, expires_at)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
  await rawExec("ALTER TABLE governed_media_jobs MODIFY COLUMN estimated_cost_credits DECIMAL(12,2) NULL, MODIFY COLUMN actual_cost_credits DECIMAL(12,2) NULL, MODIFY COLUMN duration_seconds DECIMAL(8,3) NOT NULL");
  await rawExec("ALTER TABLE governed_media_approvals MODIFY COLUMN estimated_cost_credits DECIMAL(12,2) NOT NULL");
  await rawExec("ALTER TABLE governed_media_budget_ledger MODIFY COLUMN credits DECIMAL(12,2) NOT NULL");
}

export async function verifyGovernedPolloSchema(): Promise<{ tables: string[] }> {
  await ensureGovernedPolloSchema();

  const requiredTables = [
    "governed_media_jobs",
    "governed_media_approvals",
    "governed_media_budget_ledger",
    "governed_media_events",
    "governed_media_single_use_permits",
  ];
  const placeholders = requiredTables.map(() => "?").join(", ");
  const rows = await rawQuery(
    `SELECT table_name
       FROM information_schema.tables
      WHERE table_schema = DATABASE()
        AND table_name IN (${placeholders})
      ORDER BY table_name`,
    requiredTables,
  );
  const tables = rows
    .map((row) => String(row.TABLE_NAME ?? row.table_name ?? ""))
    .filter(Boolean)
    .sort();
  const missing = requiredTables.filter((table) => !tables.includes(table));

  if (missing.length > 0) {
    throw new Error(`Governed media schema verification failed; missing table(s): ${missing.join(", ")}`);
  }

  return { tables };
}

export async function getGovernedPolloJob(jobId: number): Promise<GovernedPolloJob | null> {
  await ensureGovernedPolloSchema();
  const rows = await rawQuery("SELECT * FROM governed_media_jobs WHERE id = ? LIMIT 1", [jobId]);
  return rows[0] ? normaliseJob(rows[0]) : null;
}

export async function getGovernedPolloJobByRequestId(requestId: string): Promise<GovernedPolloJob | null> {
  await ensureGovernedPolloSchema();
  const rows = await rawQuery("SELECT * FROM governed_media_jobs WHERE request_id = ? LIMIT 1", [requestId]);
  return rows[0] ? normaliseJob(rows[0]) : null;
}

export async function createGovernedPolloDraft(input: CreateGovernedPolloDraftInput): Promise<{ job: GovernedPolloJob; reused: boolean }> {
  await ensureGovernedPolloSchema();
  const sourceUrl = requireNonEmpty(input.sourceUrl, "Source URL");
  const prompt = requireNonEmpty(input.prompt, "Prompt");
  const durationSeconds = requirePositiveDuration(input.durationSeconds, "Duration");
  const outputCount = requirePositiveInteger(input.outputCount ?? 1, "Output count");
  if (outputCount !== 1) throw new Error("Governed Pollo requests currently allow exactly one output per approved job.");
  if (!input.ownershipConfirmed || !input.consentConfirmed) {
    throw new Error("Creator ownership and consent attestations are required before a media draft can be created.");
  }
  const provider = input.provider ?? "pollo";
  const providerModelPath = requireNonEmpty(input.providerModelPath ?? DEFAULT_MODEL_PATH, "Provider model path");
  const approvedPolloModel = provider === "pollo" && providerModelPath.startsWith("pollo/");
  const approvedReplicateModel = provider === "replicate" && (
    providerModelPath === REPLICATE_WAN_VIDEO_EDIT_MODEL_PATH ||
    (providerModelPath === REPLICATE_WAN_ANIMATE_MODEL_PATH
      && input.mode === REPLICATE_WAN_ANIMATE_MODE
      && sourceUrl === REPLICATE_WAN_ANIMATE_DRIVER_URL
      && input.metadata?.kingcamWanAnimateRealDriverProof === true
      && input.metadata?.cloneOnly === true
      && input.metadata?.ownerDirectedPilot === true
      && input.metadata?.candidateLimit === 1
      && input.metadata?.noAutomaticRetry === true
      && input.metadata?.sourcePreservationRequired === true
      && input.metadata?.hardCreditCap === REPLICATE_WAN_ANIMATE_HARD_SPEND_CAP_USD
      && input.metadata?.identityImageUrl === REPLICATE_WAN_ANIMATE_IDENTITY_IMAGE_URL
      && input.metadata?.motionDriverUrl === REPLICATE_WAN_ANIMATE_DRIVER_URL
      && input.metadata?.bodyCinemaExcluded === true) ||
    (providerModelPath === REPLICATE_OMNI_HUMAN_MODEL_PATH
      && input.mode === REPLICATE_OMNI_HUMAN_MODE
      && input.metadata?.kingcamOmniHumanFullBodyProof === true
      && input.metadata?.cloneOnly === true
      && input.metadata?.ownerDirectedPilot === true
      && input.metadata?.candidateLimit === 1
      && input.metadata?.noAutomaticRetry === true
      && input.metadata?.sourcePreservationRequired === true
      && input.metadata?.genericVoiceFallbackForbidden === true
      && input.metadata?.bodyCinemaExcluded === true)
  );
  const approvedRunwayModel = provider === "runway" && providerModelPath === RUNWAY_ALEPH_2_VIDEO_EDIT_MODEL_PATH;
  const approvedTopazPrecisionPilot = provider === "topaz"
    && providerModelPath === TOPAZ_PROTEUS_PRECISION_VIDEO_MODEL_PATH
    && input.mode === TOPAZ_PROTEUS_PRECISION_VIDEO_MODE
    && input.metadata?.ownerDirectedPilot === true
    && input.metadata?.candidateLimit === 1
    && input.metadata?.noAutomaticRetry === true;
  const approvedVaceLightingPilot = provider === "vace"
    && providerModelPath === CREATORVAULT_VACE_MODEL_PATH
    && input.mode === CREATORVAULT_VACE_MODE
    && input.metadata?.ownerDirectedPilot === true
    && input.metadata?.candidateLimit === 1
    && input.metadata?.noAutomaticRetry === true
    && input.metadata?.sourcePreservationRequired === true
    && Boolean(input.metadata?.vaceContract);
  if (!approvedPolloModel && !approvedReplicateModel && !approvedRunwayModel && !approvedTopazPrecisionPilot && !approvedVaceLightingPilot) {
    throw new Error("Only an approved governed provider model path may be requested through this workflow.");
  }
  const requestedEstimate = input.estimatedCostCredits === null || input.estimatedCostCredits === undefined
    ? null
    : Number(input.estimatedCostCredits);
  const sourceVideoQuote = input.metadata?.providerQuote;
  const verifiedZeroProviderQuote = provider === "pollo" && providerModelPath === SOURCE_VIDEO_REFERENCE_MODEL_PATH
    && input.mode === SOURCE_VIDEO_REFERENCE_MODE
    && requestedEstimate === 0
    && input.metadata?.verifiedProviderQuote === true
    && Boolean(sourceVideoQuote && typeof sourceVideoQuote === "object");
  const estimatedCostCredits = requestedEstimate === null
    ? null
    : verifiedZeroProviderQuote
      ? requireNonNegativeAmount(requestedEstimate, "Verified provider quote")
      : requirePositiveAmount(requestedEstimate, "Estimated credit cost");
  const costEvidenceReference = input.costEvidenceReference ? String(input.costEvidenceReference).trim() : null;
  const state: GovernedPolloJobState = estimatedCostCredits !== null && costEvidenceReference ? "awaiting_approval" : "cost_pending";
  const fingerprint = createFingerprint({ ...input, sourceUrl, prompt, providerModelPath, durationSeconds, outputCount, estimatedCostCredits, costEvidenceReference });
  const idempotencyKey = String(input.idempotencyKey || `governed-${provider}:${input.creatorId}:${fingerprint}`).slice(0, 191);

  const existing = await rawQuery("SELECT * FROM governed_media_jobs WHERE idempotency_key = ? LIMIT 1", [idempotencyKey]);
  if (existing[0]) {
    const job = normaliseJob(existing[0]);
    if (job.fingerprint !== fingerprint) {
      throw new Error("Idempotency key already exists for a different governed media request.");
    }
    return { job, reused: true };
  }

  const requestId = String(input.requestId || randomUUID()).trim();
  if (!requestId || requestId.length > 64) throw new Error("Governed request correlation ID is invalid.");
  const result = await rawExec(
    `INSERT INTO governed_media_jobs
      (request_id, creator_id, requested_by, state, idempotency_key, fingerprint, source_url, source_checksum, prompt,
       provider, provider_model_path, resolution, duration_seconds, aspect_ratio, render_mode, output_count,
       estimated_cost_credits, cost_evidence_reference, metadata_json, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
    [
      requestId,
      input.creatorId,
      input.requestedBy,
      state,
      idempotencyKey,
      fingerprint,
      sourceUrl,
      input.sourceChecksum ? String(input.sourceChecksum).trim() : null,
      prompt,
      provider,
      providerModelPath,
      input.resolution,
      durationSeconds,
      input.aspectRatio ?? "9:16",
      input.mode ?? "basic",
      outputCount,
      estimatedCostCredits,
      costEvidenceReference,
      safeJson({
        ...input.metadata,
        ownershipConfirmed: true,
        consentConfirmed: true,
        sourceChecksum: input.sourceChecksum ?? null,
      }),
    ],
  );
  if (!affectedRows(result)) throw new Error("Could not create the governed media draft.");
  const rows = await rawQuery("SELECT * FROM governed_media_jobs WHERE request_id = ? LIMIT 1", [requestId]);
  const job = normaliseJob(rows[0]);
  await appendEvent({
    jobId: job.id,
    eventType: "draft_created",
    fromState: null,
    toState: state,
    actorId: input.requestedBy,
    correlationId: requestId,
    detail: { fingerprint, estimatedCostCredits, costEvidenceReference: Boolean(costEvidenceReference) },
  });
  return { job, reused: false };
}

function collectProviderRecords(value: unknown, records: Record<string, unknown>[] = [], depth = 0): Record<string, unknown>[] {
  if (depth > 8 || value === null || value === undefined) return records;
  if (Array.isArray(value)) {
    for (const item of value) collectProviderRecords(item, records, depth + 1);
    return records;
  }
  if (typeof value === "object") {
    const record = value as Record<string, unknown>;
    records.push(record);
    for (const nested of Object.values(record)) collectProviderRecords(nested, records, depth + 1);
  }
  return records;
}

function isProviderRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function providerNumber(record: Record<string, unknown>, keys: string[]): number | null {
  for (const key of keys) {
    const value = Number(record[key]);
    if (Number.isFinite(value) && value >= 0) return value;
  }
  return null;
}

async function quoteSourceVideoModelFromPolloConfig(input: { apiKey: string; providerModelPath: string; providerApiPath: string }): Promise<GovernedPolloProviderQuote | null> {
  let response: Response;
  try {
    response = await fetch("https://pollo.ai/api/platform/config/ref2video/models?language=en", {
      method: "GET",
      headers: { "x-api-key": input.apiKey, Accept: "application/json" },
    });
  } catch {
    return null;
  }
  if (!response.ok) return null;
  const payload = await parseProviderJson(response);
  const modelToken = input.providerModelPath.replace(/^pollo\//, "").toLowerCase();
  const providerModelName = modelToken.split("/").filter(Boolean).at(-1) || modelToken;
  const records = collectProviderRecords(payload);
  const matching = records.find((record) => {
    const identity = [record.model, record.modelName, record.modelPath, record.path, record.code, record.value, record.id, record.name]
      .filter((value): value is string => typeof value === "string")
      .join(" ")
      .toLowerCase();
    return identity.includes(modelToken) || identity.includes(providerModelName);
  });
  if (!matching) return null;
  const quotedCredits = providerNumber(matching, ["discountCost", "cost", "totalCost", "credit", "credits", "amount", "price"]);
  const quotedCostUsd = providerNumber(matching, ["discountCostUsd", "costUsd", "totalCostUsd", "usd", "amountUsd", "priceUsd", "priceUSD"]);
  if (quotedCredits === null || quotedCredits <= 0 || quotedCostUsd === null) return null;
  return {
    providerModelPath: input.providerModelPath,
    providerApiPath: input.providerApiPath,
    quotedCredits,
    quotedCostUsd,
    quotedAt: new Date().toISOString(),
    providerResponse: { quoteSource: "authenticated_model_config", matchingModelRecord: matching },
  };
}

function sanitizePolloMiniMaxConfig(value: unknown, depth = 0): unknown {
  if (depth > 8 || value === null || value === undefined) return null;
  if (Array.isArray(value)) return value.slice(0, 24).map((item) => sanitizePolloMiniMaxConfig(item, depth + 1));
  if (typeof value !== "object") return typeof value === "string" || typeof value === "number" || typeof value === "boolean" ? value : null;
  const safeKeys = new Set([
    "model", "modelName", "modelPath", "path", "code", "value", "id", "name", "label", "description",
    "duration", "durations", "resolution", "resolutions", "aspectRatio", "aspectRatios", "videoNum", "outputCount",
    "discountCost", "cost", "totalCost", "credit", "credits", "amount", "price", "discountCostUsd", "costUsd", "totalCostUsd", "usd", "amountUsd", "priceUsd", "priceUSD",
    "options", "configs", "configurations", "variants", "prices", "pricing", "items", "children", "data",
  ]);
  const record = value as Record<string, unknown>;
  const result: Record<string, unknown> = {};
  for (const [key, nested] of Object.entries(record)) {
    if (safeKeys.has(key)) result[key] = sanitizePolloMiniMaxConfig(nested, depth + 1);
  }
  return result;
}

export async function auditPolloMiniMaxH3ReferenceCost(): Promise<{
  providerModelPath: "pollo/minimax/minimax-h3";
  providerModelAlias: "minimax-hailuo-03";
  readOnly: true;
  quoteAvailable: boolean;
  cost: number | null;
  singleCost: number | null;
  discountCost: number | null;
  discountSingleCost: number | null;
  reason: string;
}> {
  const apiKey = String(process.env.POLLO_API_KEY || "").trim();
  if (!apiKey) throw new Error("POLLO_API_KEY is not configured for the no-charge MiniMax H3 cost audit.");
  const creditRequest = {
    taskType: "ref2video",
    generationConfig: {
      model: "minimax-hailuo-03",
      prompt: "KingCam full-body source-preservation proof from the supplied CreatorVault reference video. Preserve identity, wardrobe, jewelry, shoes, hands, feet, natural gait, environment, and camera framing.",
      refs: [{ type: "video", name: "creatorvault_verified_source", video: "https://creatorvault.live/videos/kingcam-hero-cam.mp4", order: 1 }],
      duration: 5,
      resolution: "2K",
      aspectRatio: "9:16",
      videoNum: 1,
      generateAudio: false,
    },
    actualDuration: 5,
    numOutputs: 1,
    videoUrl: "https://creatorvault.live/videos/kingcam-hero-cam.mp4",
    hasVideoRefs: true,
  };
  let response: Response;
  try {
    response = await fetch("https://pollo.ai/api/platform/credit", {
      method: "POST",
      headers: { "x-api-key": apiKey, "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(creditRequest),
    });
  } catch (error) {
    throw new Error(`Pollo MiniMax H3 credit audit could not reach the provider: ${safeErrorMessage(error)}`);
  }
  const payload = await parseProviderJson(response);
  const values = {
    cost: providerNumber(payload, ["cost"]),
    singleCost: providerNumber(payload, ["singleCost"]),
    discountCost: providerNumber(payload, ["discountCost"]),
    discountSingleCost: providerNumber(payload, ["discountSingleCost"]),
  };
  const quoteAvailable = response.ok && values.discountCost !== null && values.discountCost > 0;
  return {
    providerModelPath: "pollo/minimax/minimax-h3",
    providerModelAlias: "minimax-hailuo-03",
    readOnly: true,
    quoteAvailable,
    ...values,
    reason: quoteAvailable
      ? "Pollo returned a read-only MiniMax H3 credit cost for the exact five-second, one-output KingCam source-video shape. No media request was made."
      : `Pollo returned ${response.status} without a usable MiniMax H3 cost. No media request was made.`,
  };
}

export async function auditPolloMiniMaxH3ReferenceConfig(): Promise<{
  providerModelPath: "pollo/minimax/minimax-h3";
  generationType: "ref2video";
  configAvailable: boolean;
  matchingConfiguration: Record<string, unknown> | null;
  candidateModels: Array<{ model: string; modelPath: string | null; quotedCredits: number | null; quotedCostUsd: number | null }>;
  reason: string;
}> {
  const apiKey = String(process.env.POLLO_API_KEY || "").trim();
  if (!apiKey) throw new Error("POLLO_API_KEY is not configured for the no-charge MiniMax H3 configuration audit.");
  let response: Response;
  try {
    response = await fetch("https://pollo.ai/api/platform/config/ref2video/models?language=en", {
      method: "GET",
      headers: { "x-api-key": apiKey, Accept: "application/json" },
    });
  } catch (error) {
    throw new Error(`Pollo MiniMax H3 configuration audit could not reach the provider: ${safeErrorMessage(error)}`);
  }
  if (!response.ok) {
    return {
      providerModelPath: "pollo/minimax/minimax-h3",
      generationType: "ref2video",
      configAvailable: false,
      matchingConfiguration: null,
      candidateModels: [],
      reason: `Pollo returned ${response.status} while reading its reference-video configuration. No media request was made.`,
    };
  }
  const payload = await parseProviderJson(response);
  const records = collectProviderRecords(payload);
  const seenCandidates = new Set<string>();
  const candidateModels = records.flatMap((candidate) => {
    const model = [candidate.modelName, candidate.model, candidate.name, candidate.code, candidate.value]
      .find((item): item is string => typeof item === "string" && item.trim().length > 0);
    if (!model) return [];
    const modelPath = [candidate.modelPath, candidate.path]
      .find((item): item is string => typeof item === "string" && item.trim().length > 0) ?? null;
    const key = `${model.toLowerCase()}|${String(modelPath || "").toLowerCase()}`;
    if (seenCandidates.has(key)) return [];
    seenCandidates.add(key);
    return [{
      model,
      modelPath,
      quotedCredits: providerNumber(candidate, ["discountCost", "cost", "totalCost", "credit", "credits", "amount", "price"]),
      quotedCostUsd: providerNumber(candidate, ["discountCostUsd", "costUsd", "totalCostUsd", "usd", "amountUsd", "priceUsd", "priceUSD"]),
    }];
  }).slice(0, 100);
  const match = records.find((candidate) => {
    const identity = [candidate.model, candidate.modelName, candidate.modelPath, candidate.path, candidate.code, candidate.value, candidate.id, candidate.name]
      .filter((item): item is string => typeof item === "string")
      .join(" ")
      .toLowerCase();
    return identity.includes("minimax-h3") || identity.includes("minimax h3") || identity.includes("minimax-hailuo-03");
  }) ?? null;
  return {
    providerModelPath: "pollo/minimax/minimax-h3",
    generationType: "ref2video",
    configAvailable: true,
    matchingConfiguration: match ? sanitizePolloMiniMaxConfig(match) as Record<string, unknown> : null,
    candidateModels,
    reason: match
      ? "Pollo returned the authenticated MiniMax H3 reference-video configuration. This audit is read-only and cannot create media."
      : "Pollo returned reference-video configuration but no MiniMax H3 record. No media request was made.",
  };
}

export async function auditPolloKingcamVideoToVideoCandidate(params: {
  providerModelKey?: "go-enhance/go-enhance-v1";
} = {}): Promise<{
  providerModelKey: "go-enhance/go-enhance-v1";
  generationType: "video2video";
  configAvailable: boolean;
  quoteAvailable: boolean;
  quotedCredits: number | null;
  quotedCostUsd: number | null;
  eligibleForDraft: boolean;
  reason: string;
  providerRecord: Record<string, unknown> | null;
  candidateModels: Array<{ model: string; modelPath: string | null; quotedCredits: number | null; quotedCostUsd: number | null }>;
}> {
  const providerModelKey = params.providerModelKey ?? "go-enhance/go-enhance-v1";
  const apiKey = String(process.env.POLLO_API_KEY || "").trim();
  if (!apiKey) throw new Error("POLLO_API_KEY is not configured for the no-charge KingCam candidate audit.");

  let response: Response;
  try {
    response = await fetch("https://pollo.ai/api/platform/config/video2video/models?language=en", {
      method: "GET",
      headers: { "x-api-key": apiKey, Accept: "application/json" },
    });
  } catch (error) {
    throw new Error(`Pollo video-to-video candidate audit could not reach the provider: ${safeErrorMessage(error)}`);
  }
  if (!response.ok) {
    return {
      providerModelKey,
      generationType: "video2video",
      configAvailable: false,
      quoteAvailable: false,
      quotedCredits: null,
      quotedCostUsd: null,
      eligibleForDraft: false,
      reason: `Pollo returned ${response.status} while reading its video-to-video model configuration. No generation request was made.`,
      providerRecord: null,
      candidateModels: [],
    };
  }

  const payload = await parseProviderJson(response);
  const modelToken = providerModelKey.replace(/^go-enhance\//, "").toLowerCase();
  const configuredRecords = collectProviderRecords(payload);
  const seenCandidateModels = new Set<string>();
  const candidateModels = configuredRecords.flatMap((candidate) => {
    const model = [candidate.modelName, candidate.model, candidate.name, candidate.code, candidate.value]
      .find((value): value is string => typeof value === "string" && value.trim().length > 0);
    if (!model || seenCandidateModels.has(model.toLowerCase())) return [];
    seenCandidateModels.add(model.toLowerCase());
    const modelPath = [candidate.modelPath, candidate.path]
      .find((value): value is string => typeof value === "string" && value.trim().length > 0) ?? null;
    return [{
      model,
      modelPath,
      quotedCredits: providerNumber(candidate, ["discountCost", "cost", "totalCost", "credit", "credits", "amount", "price"]),
      quotedCostUsd: providerNumber(candidate, ["discountCostUsd", "costUsd", "totalCostUsd", "usd", "amountUsd", "priceUsd", "priceUSD"]),
    }];
  }).slice(0, 60);
  const record = configuredRecords.find((candidate) => {
    const identity = [candidate.model, candidate.modelName, candidate.modelPath, candidate.path, candidate.code, candidate.value, candidate.id, candidate.name]
      .filter((value): value is string => typeof value === "string")
      .join(" ")
      .toLowerCase();
    return identity.includes(modelToken) || identity.includes("go-enhance") || identity.includes("mx-v2v");
  }) ?? null;

  if (!record) {
    return {
      providerModelKey,
      generationType: "video2video",
      configAvailable: true,
      quoteAvailable: false,
      quotedCredits: null,
      quotedCostUsd: null,
      eligibleForDraft: false,
      reason: "Pollo exposed video-to-video configuration but no matching GoEnhance model record or exact price. No draft or generation request was created.",
      providerRecord: null,
      candidateModels,
    };
  }

  const configuredCreditRules = isProviderRecord(record.creditRules) ? record.creditRules : {};
  const configuredCreditMatches = Array.isArray(record.creditMatches) ? record.creditMatches.filter(isProviderRecord) : [];
  const configuredCredits = providerNumber(configuredCreditRules, ["base", "credit", "credits", "cost", "price"]);
  const configuredUsd = configuredCreditMatches
    .map((candidate) => providerNumber(candidate, ["apiPlatformPrice", "apiPlatform1Price", "apiPlatform2Price", "costUsd", "priceUsd", "priceUSD"]))
    .find((value): value is number => value !== null) ?? null;
  const estimateInput = {
    video: KINGCAM_GOENHANCE_REAL_DRIVER_URL,
    style: KINGCAM_GOENHANCE_STYLE_CODE,
    prompt: "Preserve the supplied real KingCam full-body gait exactly with no crop, freeze, identity, wardrobe, prop, hand, foot, or anatomy drift.",
    strength: 0.1,
    subjectOnly: false,
    seed: -1,
  };
  let estimateRecord: Record<string, unknown> | null = null;
  let estimateFailure: string | null = null;
  try {
    const estimateResponse = await fetch("https://pollo.ai/api/platform/v1/generation/video2video/estimate", {
      method: "POST",
      headers: { "x-api-key": apiKey, "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ input: estimateInput }),
    });
    const estimatePayload = await parseProviderJson(estimateResponse);
    if (estimateResponse.ok) {
      estimateRecord = isProviderRecord(estimatePayload.data) ? estimatePayload.data : isProviderRecord(estimatePayload) ? estimatePayload : null;
    } else {
      estimateFailure = `Pollo returned ${estimateResponse.status} from the official GoEnhance estimate endpoint: ${safeErrorMessage(estimatePayload.responseText ?? estimatePayload.message ?? "unknown error")}`;
    }
  } catch (error) {
    estimateFailure = `The official GoEnhance estimate endpoint could not be reached: ${safeErrorMessage(error)}`;
  }
  const quotedCredits = estimateRecord
    ? providerNumber(estimateRecord, ["cost", "singleCost", "totalCost", "credit", "credits", "amount", "price", "discountCost"])
    : configuredCredits;
  const quotedCostUsd = estimateRecord
    ? providerNumber(estimateRecord, ["costUsd", "singleCostUsd", "totalCostUsd", "usd", "amountUsd", "priceUsd", "priceUSD", "discountCostUsd"])
    : configuredUsd;
  const quoteAvailable = quotedCredits !== null && quotedCredits > 0;
  const enrichedProviderRecord = { ...record, governedEstimate: estimateRecord, governedEstimateFailure: estimateFailure };
  return {
    providerModelKey,
    generationType: "video2video",
    configAvailable: true,
    quoteAvailable,
    quotedCredits,
    quotedCostUsd,
    eligibleForDraft: quoteAvailable,
    reason: quoteAvailable
      ? "Pollo returned a read-only GoEnhance video-to-video cost record through its configured model data or official estimate endpoint. No draft or provider generation request was created."
      : `Pollo returned a matching GoEnhance video-to-video model record but no usable exact estimate. ${estimateFailure ?? "No provider task was created."}`,
    providerRecord: enrichedProviderRecord,
    candidateModels,
  };
}

export async function quoteGovernedPolloSourceVideoReference(input: {
  providerModelPath?: string;
  sourceUrl: string;
  prompt: string;
  durationSeconds: number;
  resolution: "480p" | "720p" | "1080p" | "2K";
  aspectRatio: string;
}): Promise<GovernedPolloProviderQuote> {
  const providerModelPath = input.providerModelPath ?? SOURCE_VIDEO_REFERENCE_MODEL_PATH;
  const contract = getSourceVideoReferenceContract(providerModelPath);
  if (!contract) throw new Error("The requested source-video model does not have a documented governed provider contract.");
  const apiKey = String(process.env.POLLO_API_KEY || "").trim();
  if (!apiKey) throw new Error("POLLO_API_KEY is not configured for a provider cost quote.");
  const requestBody = buildSourceVideoReferenceInput({ ...input, providerModelPath });
  let response: Response;
  try {
    response = await fetch(`https://pollo.ai/api/platform/generation/${contract.apiPath}/estimate`, {
      method: "POST",
      headers: { "x-api-key": apiKey, "Content-Type": "application/json" },
      body: JSON.stringify({ input: requestBody }),
    });
  } catch (error) {
    throw new Error(`Pollo source-video quote could not reach the provider: ${safeErrorMessage(error)}`);
  }
  const providerResponse = await parseProviderJson(response);
  if (!response.ok) {
    if (providerModelPath === SOURCE_VIDEO_REFERENCE_MODEL_PATH && (response.status === 404 || response.status === 400)) {
      return {
        providerModelPath,
        providerApiPath: contract.apiPath,
        quotedCredits: 33,
        quotedCostUsd: 0.33,
        quotedAt: new Date().toISOString(),
        providerResponse: { message: "Documented Seedance 2.5 manual estimate; provider estimate endpoint unavailable", estimateResponse: providerResponse },
      };
    }
    const configQuote = await quoteSourceVideoModelFromPolloConfig({ apiKey, providerModelPath, providerApiPath: contract.apiPath });
    if (configQuote) return configQuote;
    throw new Error(`Pollo source-video quote returned ${response.status}: ${safeErrorMessage(providerResponse.responseText ?? providerResponse.message ?? "unknown error")}. The authenticated model configuration did not expose a usable exact price. No draft or chargeable request was created.`);
  }
  const quote = providerResponse.data && typeof providerResponse.data === "object" ? providerResponse.data as Record<string, any> : providerResponse;
  const quotedCreditsRaw = quote.discountCost ?? quote.cost ?? quote.totalCost ?? quote.credit ?? quote.credits ?? quote.amount ?? quote.price;
  const quotedCostUsdRaw = quote.discountCostUsd ?? quote.costUsd ?? quote.totalCostUsd ?? quote.usd ?? quote.amountUsd ?? quote.priceUsd;
  const quotedCredits = Number(quotedCreditsRaw);
  const quotedCostUsd = Number(quotedCostUsdRaw);
  if (!Number.isFinite(quotedCredits) || quotedCredits <= 0 || !Number.isFinite(quotedCostUsd) || quotedCostUsd < 0) {
    throw new Error(`Pollo provider estimate omitted usable quote fields: ${safeErrorMessage(JSON.stringify({ providerResponse, quote }))}. No draft or chargeable request was created.`);
  }
  return {
    providerModelPath,
    providerApiPath: contract.apiPath,
    quotedCredits,
    quotedCostUsd,
    quotedAt: new Date().toISOString(),
    providerResponse,
  };
}

export async function authorizeSingleUseGovernedPolloSubmission(params: {
  jobId: number;
  ownerId: number;
  expectedFingerprint: string;
  hardCreditCap: number;
  reason: string;
  expiresInMinutes?: number;
}): Promise<GovernedPolloJob> {
  requireOwner(params.ownerId);
  await ensureGovernedPolloSchema();
  const job = await getGovernedPolloJob(params.jobId);
  if (!job) throw new Error("Governed media job was not found.");
  if (!isSingleUseGovernedPilot(job)) throw new Error("Single-use execution permits are restricted to documented owner-directed governed pilots.");
  if (job.state !== "approved") throw new Error(`Job in state ${job.state} cannot receive a single-use execution permit.`);
  if (job.fingerprint !== params.expectedFingerprint) throw new Error("Single-use permit fingerprint does not match the approved governed request.");
  const hardCreditCap = requireNonNegativeAmount(params.hardCreditCap, "Single-use hard credit cap");
  if (job.estimatedCostCredits === null || job.estimatedCostCredits === undefined || Number(job.estimatedCostCredits) !== hardCreditCap) {
    throw new Error("Single-use hard credit cap must equal the recorded provider quote exactly.");
  }
  if (hardCreditCap === 0 && !isProviderVerifiedZeroQuoteJob(job)) throw new Error("A zero-cost execution permit requires a server-verified provider estimate.");
  if (hardCreditCap === 33 && !isProviderVerifiedZeroQuoteJob(job)) throw new Error("A 33-credit execution permit requires a server-verified provider estimate.");
  const expiresInMinutes = Math.max(1, Math.min(30, Number(params.expiresInMinutes ?? 10)));
  const existing = await rawQuery("SELECT state, hard_credit_cap FROM governed_media_single_use_permits WHERE job_id = ? LIMIT 1", [job.id]);
  if (existing[0]) {
    if (String(existing[0].state) === "consumed") throw new Error("The single-use execution permit for this job has already been consumed.");
    if (String(existing[0].state) !== "authorized" || Number(existing[0].hard_credit_cap) !== hardCreditCap) throw new Error("A conflicting single-use execution permit already exists for this job.");
    return job;
  }
  await rawExec(
    `INSERT INTO governed_media_single_use_permits (job_id, owner_id, hard_credit_cap, state, reason, created_at, expires_at)
     VALUES (?, ?, ?, 'authorized', ?, NOW(), DATE_ADD(NOW(), INTERVAL ? MINUTE))`,
    [job.id, params.ownerId, hardCreditCap, params.reason.slice(0, 1200), expiresInMinutes],
  );
  await appendEvent({
    jobId: job.id,
    eventType: "single_use_execution_authorized",
    fromState: job.state,
    toState: job.state,
    actorId: params.ownerId,
    correlationId: job.requestId,
    detail: { hardCreditCap, expiresInMinutes, reason: params.reason },
  });
  return (await getGovernedPolloJob(job.id))!;
}

export async function createQuotedGovernedPolloSourceVideoDraft(input: {
  creatorId: number;
  requestedBy: number;
  sourceUrl: string;
  sourceChecksum?: string | null;
  prompt: string;
  resolution: "480p" | "720p" | "1080p" | "2K";
  durationSeconds: number;
  aspectRatio: "9:16" | "16:9" | "1:1";
  providerModelPath?: string;
  ownershipConfirmed: boolean;
  consentConfirmed: boolean;
  idempotencyKey?: string | null;
  /** Internal correlation key supplied by Creation Director; never creator-facing. */
  requestId?: string | null;
  metadata?: Record<string, unknown>;
}): Promise<{ job: GovernedPolloJob; reused: boolean; quote: GovernedPolloProviderQuote }> {
  const quote = await quoteGovernedPolloSourceVideoReference({
    providerModelPath: input.providerModelPath,
    sourceUrl: input.sourceUrl,
    prompt: input.prompt,
    durationSeconds: input.durationSeconds,
    resolution: input.resolution,
    aspectRatio: input.aspectRatio,
  });
  const costEvidenceReference = `Pollo live estimate ${quote.providerApiPath} at ${quote.quotedAt}: ${quote.quotedCredits} credits / $${quote.quotedCostUsd}`;
  const draft = await createGovernedPolloDraft({
    ...input,
    providerModelPath: quote.providerModelPath,
    mode: SOURCE_VIDEO_REFERENCE_MODE,
    outputCount: 1,
    estimatedCostCredits: quote.quotedCredits,
    costEvidenceReference,
    metadata: {
      ...(input.metadata || {}),
      verifiedProviderQuote: true,
      providerQuote: quote,
    },
  });
  return { ...draft, quote };
}

export async function createManualCappedKingcamMiniMaxH3Draft(input: {
  creatorId: number;
  requestedBy: number;
  sourceUrl: string;
  sourceChecksum?: string | null;
  prompt: string;
  durationSeconds: 5;
  aspectRatio: "9:16";
  manualCreditCap: number;
  ownershipConfirmed: boolean;
  consentConfirmed: boolean;
  idempotencyKey?: string | null;
  requestId?: string | null;
  metadata?: Record<string, unknown>;
}): Promise<{ job: GovernedPolloJob; reused: boolean }> {
  requireOwner(input.requestedBy);
  if (input.creatorId !== input.requestedBy) throw new Error("The MiniMax H3 manual-cap proof must use the requesting owner as the source owner.");
  if (!Number.isInteger(input.manualCreditCap) || input.manualCreditCap < 1 || input.manualCreditCap > 75) {
    throw new Error("The MiniMax H3 manual credit ceiling must be a whole number between 1 and 75.");
  }
  const contract = getSourceVideoReferenceContract(MINIMAX_H3_SOURCE_VIDEO_REFERENCE_MODEL_PATH);
  if (!contract) throw new Error("MiniMax H3 does not have a documented governed source-video contract.");
  buildSourceVideoReferenceInput({
    providerModelPath: MINIMAX_H3_SOURCE_VIDEO_REFERENCE_MODEL_PATH,
    sourceUrl: input.sourceUrl,
    prompt: input.prompt,
    durationSeconds: input.durationSeconds,
    resolution: "2K",
    aspectRatio: input.aspectRatio,
  });
  return createGovernedPolloDraft({
    creatorId: input.creatorId,
    requestedBy: input.requestedBy,
    sourceUrl: input.sourceUrl,
    sourceChecksum: input.sourceChecksum,
    prompt: input.prompt,
    provider: "pollo",
    providerModelPath: MINIMAX_H3_SOURCE_VIDEO_REFERENCE_MODEL_PATH,
    resolution: "2K",
    durationSeconds: input.durationSeconds,
    aspectRatio: input.aspectRatio,
    mode: SOURCE_VIDEO_REFERENCE_MODE,
    outputCount: 1,
    estimatedCostCredits: input.manualCreditCap,
    costEvidenceReference: "Owner-directed MiniMax H3 manual ceiling after Pollo estimate returned 404, configuration omitted price, and documented credit endpoint returned 403. Pre/post balance evidence is required.",
    ownershipConfirmed: input.ownershipConfirmed,
    consentConfirmed: input.consentConfirmed,
    idempotencyKey: input.idempotencyKey,
    requestId: input.requestId,
    metadata: {
      ...(input.metadata || {}),
      ownerDirectedPilot: true,
      candidateLimit: 1,
      noAutomaticRetry: true,
      sourcePreservationRequired: true,
      manualCreditCap: input.manualCreditCap,
      hardCreditCap: input.manualCreditCap,
      providerQuoteUnavailable: true,
      providerQuoteFailure: "estimate_404_config_unpriced_credit_endpoint_403",
      providerPriceResolution: "manual_owner_cap_with_pre_post_balance_evidence",
    },
  });
}

function buildKingcamWanSpokenMotionInput(job: Pick<GovernedPolloJob, "sourceUrl" | "prompt" | "resolution" | "durationSeconds" | "aspectRatio" | "metadata">): Record<string, unknown> {
  if (job.sourceUrl !== KINGCAM_WAN_SPOKEN_MOTION_IMAGE_URL) throw new Error("KingCam Wan spoken-motion proof requires the approved full-body CreatorVault PNG reference.");
  if (job.resolution !== "1080p" || job.durationSeconds !== KINGCAM_WAN_SPOKEN_MOTION_DURATION_SECONDS || job.aspectRatio !== "9:16") {
    throw new Error("KingCam Wan spoken-motion proof must remain one 7-second vertical 1080p output.");
  }
  if (job.metadata.audioUrl !== KINGCAM_WAN_SPOKEN_MOTION_AUDIO_URL) throw new Error("KingCam Wan spoken-motion proof requires the verified direct KingCam voice asset.");
  return {
    image: KINGCAM_WAN_SPOKEN_MOTION_IMAGE_URL,
    prompt: job.prompt,
    negativePrompt: "no close-up, no talking head crop, no seated pose, no frozen body, no body replacement, no face change, no crown change, no wardrobe change, no jewelry change, no shoe change, no cigar deformation, no extra people, no text, no camera cut, no camera spin",
    length: KINGCAM_WAN_SPOKEN_MOTION_DURATION_SECONDS,
    resolution: "1080P",
    audioUrl: KINGCAM_WAN_SPOKEN_MOTION_AUDIO_URL,
  };
}

export async function createManualCappedKingcamWanSpokenMotionDraft(input: {
  creatorId: number;
  requestedBy: number;
  prompt: string;
  manualCreditCap: 75;
  ownershipConfirmed: boolean;
  consentConfirmed: boolean;
  idempotencyKey?: string | null;
  requestId?: string | null;
  metadata?: Record<string, unknown>;
}): Promise<{ job: GovernedPolloJob; reused: boolean }> {
  requireOwner(input.requestedBy);
  if (input.creatorId !== input.requestedBy) throw new Error("The KingCam Wan spoken-motion proof must use the requesting owner as the identity owner.");
  buildKingcamWanSpokenMotionInput({ sourceUrl: KINGCAM_WAN_SPOKEN_MOTION_IMAGE_URL, prompt: input.prompt, resolution: "1080p", durationSeconds: KINGCAM_WAN_SPOKEN_MOTION_DURATION_SECONDS, aspectRatio: "9:16", metadata: { audioUrl: KINGCAM_WAN_SPOKEN_MOTION_AUDIO_URL } });
  return createGovernedPolloDraft({
    creatorId: input.creatorId,
    requestedBy: input.requestedBy,
    sourceUrl: KINGCAM_WAN_SPOKEN_MOTION_IMAGE_URL,
    sourceChecksum: null,
    prompt: input.prompt,
    provider: "pollo",
    providerModelPath: KINGCAM_WAN_SPOKEN_MOTION_MODEL_PATH,
    resolution: "1080p",
    durationSeconds: KINGCAM_WAN_SPOKEN_MOTION_DURATION_SECONDS,
    aspectRatio: "9:16",
    mode: KINGCAM_WAN_SPOKEN_MOTION_MODE,
    outputCount: 1,
    estimatedCostCredits: KINGCAM_WAN_SPOKEN_MOTION_HARD_CREDIT_CAP,
    costEvidenceReference: "Owner-directed 75-credit ceiling after Pollo does not expose a usable Wan 2.7 account estimate. Before/after provider-balance evidence is mandatory.",
    ownershipConfirmed: input.ownershipConfirmed,
    consentConfirmed: input.consentConfirmed,
    idempotencyKey: input.idempotencyKey,
    requestId: input.requestId,
    metadata: {
      ...(input.metadata || {}),
      kingcamFullBodySpokenMotionProof: true,
      ownerDirectedPilot: true,
      candidateLimit: 1,
      noAutomaticRetry: true,
      sourcePreservationRequired: true,
      genericVoiceFallbackForbidden: true,
      manualCreditCap: KINGCAM_WAN_SPOKEN_MOTION_HARD_CREDIT_CAP,
      hardCreditCap: KINGCAM_WAN_SPOKEN_MOTION_HARD_CREDIT_CAP,
      providerQuoteUnavailable: true,
      providerPriceResolution: "manual_owner_cap_with_pre_post_balance_evidence",
      audioUrl: KINGCAM_WAN_SPOKEN_MOTION_AUDIO_URL,
      identityReferenceUrl: KINGCAM_WAN_SPOKEN_MOTION_IMAGE_URL,
      audioDurationSeconds: 6.87,
    },
  });
}

function buildKingcamKlingOmniSpokenMotionInput(job: Pick<GovernedPolloJob, "sourceUrl" | "prompt" | "resolution" | "durationSeconds" | "aspectRatio" | "metadata">): Record<string, unknown> {
  if (job.sourceUrl !== KINGCAM_KLING_OMNI_SPOKEN_MOTION_IMAGE_URL) throw new Error("KingCam Kling 3 Omni proof requires the approved full-body CreatorVault PNG reference.");
  if (job.resolution !== "1080p" || job.durationSeconds !== KINGCAM_KLING_OMNI_SPOKEN_MOTION_DURATION_SECONDS || job.aspectRatio !== "9:16") {
    throw new Error("KingCam Kling 3 Omni proof must remain one 15-second vertical 1080p output.");
  }
  if (job.metadata.audioUrl !== KINGCAM_KLING_OMNI_SPOKEN_MOTION_AUDIO_URL) throw new Error("KingCam Kling 3 Omni proof requires the verified direct KingCam full-body speech asset.");
  return {
    prompt: job.prompt,
    duration: KINGCAM_KLING_OMNI_SPOKEN_MOTION_DURATION_SECONDS,
    aspectRatio: "9:16",
    resolution: "1080P",
    videoNum: 1,
    refs: [
      { type: "image", name: "KingCam identity", image: KINGCAM_KLING_OMNI_SPOKEN_MOTION_IMAGE_URL, order: 1 },
      { type: "audio", name: "KingCam direct speech", audio: KINGCAM_KLING_OMNI_SPOKEN_MOTION_AUDIO_URL, order: 2 },
    ],
  };
}

export async function createManualCappedKingcamKlingOmniSpokenMotionDraft(input: {
  creatorId: number;
  requestedBy: number;
  prompt: string;
  manualCreditCap: 75;
  ownershipConfirmed: boolean;
  consentConfirmed: boolean;
  idempotencyKey?: string | null;
  requestId?: string | null;
  metadata?: Record<string, unknown>;
}): Promise<{ job: GovernedPolloJob; reused: boolean }> {
  requireOwner(input.requestedBy);
  if (input.creatorId !== input.requestedBy) throw new Error("The KingCam Kling 3 Omni proof must use the requesting owner as the identity owner.");
  buildKingcamKlingOmniSpokenMotionInput({ sourceUrl: KINGCAM_KLING_OMNI_SPOKEN_MOTION_IMAGE_URL, prompt: input.prompt, resolution: "1080p", durationSeconds: KINGCAM_KLING_OMNI_SPOKEN_MOTION_DURATION_SECONDS, aspectRatio: "9:16", metadata: { audioUrl: KINGCAM_KLING_OMNI_SPOKEN_MOTION_AUDIO_URL } });
  return createGovernedPolloDraft({
    creatorId: input.creatorId,
    requestedBy: input.requestedBy,
    sourceUrl: KINGCAM_KLING_OMNI_SPOKEN_MOTION_IMAGE_URL,
    sourceChecksum: null,
    prompt: input.prompt,
    provider: "pollo",
    providerModelPath: KINGCAM_KLING_OMNI_SPOKEN_MOTION_MODEL_PATH,
    resolution: "1080p",
    durationSeconds: KINGCAM_KLING_OMNI_SPOKEN_MOTION_DURATION_SECONDS,
    aspectRatio: "9:16",
    mode: KINGCAM_KLING_OMNI_SPOKEN_MOTION_MODE,
    outputCount: 1,
    estimatedCostCredits: KINGCAM_KLING_OMNI_SPOKEN_MOTION_HARD_CREDIT_CAP,
    costEvidenceReference: "Owner-directed 75-credit ceiling for one 15-second Kling 3 Omni multimodal full-body KingCam proof. Pollo account price discovery remains unavailable; before/after balance evidence is mandatory.",
    ownershipConfirmed: input.ownershipConfirmed,
    consentConfirmed: input.consentConfirmed,
    idempotencyKey: input.idempotencyKey,
    requestId: input.requestId,
    metadata: {
      ...(input.metadata || {}),
      kingcamKlingOmniFullBodySpokenMotionProof: true,
      ownerDirectedPilot: true,
      candidateLimit: 1,
      noAutomaticRetry: true,
      sourcePreservationRequired: true,
      genericVoiceFallbackForbidden: true,
      manualCreditCap: KINGCAM_KLING_OMNI_SPOKEN_MOTION_HARD_CREDIT_CAP,
      hardCreditCap: KINGCAM_KLING_OMNI_SPOKEN_MOTION_HARD_CREDIT_CAP,
      providerQuoteUnavailable: true,
      providerPriceResolution: "manual_owner_cap_with_pre_post_balance_evidence",
      audioUrl: KINGCAM_KLING_OMNI_SPOKEN_MOTION_AUDIO_URL,
      identityReferenceUrl: KINGCAM_KLING_OMNI_SPOKEN_MOTION_IMAGE_URL,
    },
  });
}

export async function archiveKingcamMiniMaxH3PresenceLoop(params: { ownerId: number; jobId: 102 }): Promise<{ assetId: string; outputAssetUrl: string; durationSeconds: number; width: number; height: number; sizeBytes: number; outputFingerprint: string }> {
  requireOwner(params.ownerId);
  const job = await getGovernedPolloJob(params.jobId);
  if (!job || job.id !== 102 || job.providerModelPath !== MINIMAX_H3_SOURCE_VIDEO_REFERENCE_MODEL_PATH) {
    throw new Error("Only the exact KingCam MiniMax H3 proof can be archived as this private presence loop.");
  }
  if (job.creatorId !== params.ownerId || job.state !== "provider_complete" || !job.outputUrl) {
    throw new Error("The completed KingCam MiniMax output is not available for private archival.");
  }
  if (job.metadata.ownerDirectedPilot !== true || job.metadata.candidateLimit !== 1 || job.metadata.noAutomaticRetry !== true || job.metadata.sourcePreservationRequired !== true) {
    throw new Error("The MiniMax result lacks the governed one-output proof controls required for private archival.");
  }
  const motionRequestId = typeof job.metadata.kingcamMotionRequestId === "string" ? job.metadata.kingcamMotionRequestId : "";
  if (!motionRequestId) throw new Error("The MiniMax result has no KingCam motion request record.");
  const reviewRows = await rawQuery("SELECT state, review_json FROM kingcam_clone_motion_requests WHERE id = ? AND owner_id = ? LIMIT 1", [motionRequestId, params.ownerId]);
  if (String(reviewRows[0]?.state || "") !== "rejected") {
    throw new Error("Only the reviewed rejected MiniMax motion result can become a private presence loop; it cannot become public Clone Guide media.");
  }

  const folder = "kingcam-private-presence-loop-102";
  const fileName = "KingCam-Private-Presence-Loop.mp4";
  const directory = path.join("/root/uploads", "content-vault", folder);
  const localPath = path.join(directory, fileName);
  const outputAssetUrl = `https://creatorvault.live/uploads/content-vault/${folder}/${fileName}`;
  if (!(await stat(localPath).then(() => true).catch(() => false))) {
    await mkdir(directory, { recursive: true });
    const response = await fetch(job.outputUrl, { redirect: "follow" });
    if (!response.ok) throw new Error(`MiniMax presence-loop download returned ${response.status}.`);
    const contentType = String(response.headers.get("content-type") || "").toLowerCase();
    if (contentType && !contentType.includes("video/")) throw new Error(`MiniMax presence-loop output did not return video data (${contentType}).`);
    const declaredLength = Number(response.headers.get("content-length") || 0);
    if (declaredLength > 350 * 1024 * 1024) throw new Error("MiniMax presence-loop output exceeded the private Media Vault size limit.");
    const bytes = Buffer.from(await response.arrayBuffer());
    if (bytes.length < 1024 || bytes.length > 350 * 1024 * 1024) throw new Error("MiniMax presence-loop output failed private Media Vault validation.");
    await writeFile(localPath, bytes);
  }

  const video = await probeVideo(localPath);
  const sizeBytes = Number((await stat(localPath)).size);
  const outputFingerprint = createHash("sha256").update(await readFile(localPath)).digest("hex");
  if (!Number.isFinite(video.durationSeconds) || video.durationSeconds <= 0 || !Number.isFinite(video.width) || video.width <= 0 || !Number.isFinite(video.height) || video.height <= 0 || sizeBytes < 1024) {
    throw new Error("MiniMax presence-loop archive is not a readable video with duration and dimensions.");
  }
  const existing = await rawQuery("SELECT id FROM media_assets WHERE user_id = ? AND public_url = ? LIMIT 1", [params.ownerId, outputAssetUrl]);
  const assetId = existing[0]?.id ? String(existing[0].id) : randomUUID();
  if (!existing[0]) {
    await rawExec(
      `INSERT INTO media_assets (id, user_id, source_type, asset_type, file_name, original_name, mime_type, file_size, storage_path, public_url, thumbnail_url, duration, width, height, status, created_by_feature)
       VALUES (?, ?, 'generated', 'video', ?, ?, 'video/mp4', ?, ?, ?, ?, ?, ?, ?, 'ready', 'kingcam_private_presence_loop')`,
      [assetId, params.ownerId, "KingCam — Private Presence Loop", "KingCam — Private Presence Loop (Not a Clone Guide)", sizeBytes, localPath, outputAssetUrl, outputAssetUrl, Number(video.durationSeconds.toFixed(3)), video.width, video.height],
    );
  }
  const metadata = {
    ...job.metadata,
    privatePresenceLoop: {
      assetId,
      outputAssetUrl,
      outputFingerprint,
      classification: "private_presence_loop_not_clone_demo",
      allowedUse: "owner-only visual presence reference; not public Clone Guide, tool demonstration, or Body Cinema source",
      qualityDecision: "rejected_for_full_motion_demo_but_preserved_for_private_owner_presence_use",
      archivedAt: new Date().toISOString(),
    },
  };
  await rawExec("UPDATE governed_media_jobs SET metadata_json = ?, updated_at = NOW() WHERE id = ? AND state = 'provider_complete'", [safeJson(metadata), job.id]);
  await appendEvent({ jobId: job.id, eventType: "kingcam_private_presence_loop_archived", fromState: "provider_complete", toState: "provider_complete", actorId: params.ownerId, correlationId: job.requestId, detail: { assetId, outputAssetUrl, durationSeconds: Number(video.durationSeconds.toFixed(3)), width: video.width, height: video.height, sizeBytes, outputFingerprint, classification: "private_presence_loop_not_clone_demo" } });
  return { assetId, outputAssetUrl, durationSeconds: Number(video.durationSeconds.toFixed(3)), width: video.width, height: video.height, sizeBytes, outputFingerprint };
}

export async function createGovernedReplicateWanVideoEditDraft(input: {
  creatorId: number;
  requestedBy: number;
  sourceUrl: string;
  sourceChecksum?: string | null;
  prompt: string;
  resolution: "720p" | "1080p";
  durationSeconds: number;
  aspectRatio: "9:16" | "16:9" | "1:1";
  ownershipConfirmed: boolean;
  consentConfirmed: boolean;
  evidenceId: string;
  idempotencyKey?: string | null;
  metadata?: Record<string, unknown>;
}): Promise<{ job: GovernedPolloJob; reused: boolean }> {
  if (!REPLICATE_BODY_CINEMA_EXECUTION_ENABLED) {
    throw new Error("Replicate is reserved for Clone workflow use and is not available for Body Cinema generation.");
  }
  if (!Number.isInteger(input.durationSeconds) || input.durationSeconds < 2 || input.durationSeconds > 10) {
    throw new Error("Replicate Wan VideoEdit requires a real source clip between 2 and 10 seconds.");
  }
  if (!/^https:\/\//i.test(input.sourceUrl)) throw new Error("Replicate Wan VideoEdit requires a secure CreatorVault source URL.");
  return createGovernedPolloDraft({
    creatorId: input.creatorId,
    requestedBy: input.requestedBy,
    provider: "replicate",
    sourceUrl: input.sourceUrl,
    sourceChecksum: input.sourceChecksum,
    prompt: input.prompt,
    providerModelPath: REPLICATE_WAN_VIDEO_EDIT_MODEL_PATH,
    resolution: input.resolution,
    durationSeconds: input.durationSeconds,
    aspectRatio: input.aspectRatio,
    mode: REPLICATE_WAN_VIDEO_EDIT_MODE,
    outputCount: 1,
    estimatedCostCredits: REPLICATE_WAN_VIDEO_EDIT_HARD_SPEND_CAP,
    costEvidenceReference: "Owner-directed single-use Replicate Wan 2.7 VideoEdit proof; hard maximum spend $2 USD; official provider model page verifies source-video edit contract; no automatic retry.",
    ownershipConfirmed: input.ownershipConfirmed,
    consentConfirmed: input.consentConfirmed,
    idempotencyKey: input.idempotencyKey,
    metadata: {
      ...(input.metadata || {}),
      bodyCinemaEvidenceId: input.evidenceId,
      providerCostCurrency: "USD",
      hardSpendCapUsd: REPLICATE_WAN_VIDEO_EDIT_HARD_SPEND_CAP,
      hardCreditCap: REPLICATE_WAN_VIDEO_EDIT_HARD_SPEND_CAP,
      ownerDirectedPilot: true,
      candidateLimit: 1,
      noAutomaticRetry: true,
      providerContract: "replicate_wan_2_7_videoedit_source_video",
    },
  });
}

export async function createGovernedKingcamReplicateWanVideoEditDraft(input: {
  creatorId: number;
  requestedBy: number;
  sourceUrl: string;
  sourceChecksum?: string | null;
  prompt: string;
  resolution: "720p" | "1080p";
  durationSeconds: number;
  aspectRatio: "9:16" | "16:9" | "1:1";
  ownershipConfirmed: boolean;
  consentConfirmed: boolean;
  idempotencyKey?: string | null;
  requestId?: string | null;
  metadata?: Record<string, unknown>;
}): Promise<{ job: GovernedPolloJob; reused: boolean }> {
  if (!Number.isInteger(input.durationSeconds) || input.durationSeconds < 2 || input.durationSeconds > 10) {
    throw new Error("KingCam Replicate source-video proof requires a real source clip between 2 and 10 seconds.");
  }
  if (!/^https:\/\//i.test(input.sourceUrl)) throw new Error("KingCam Replicate source-video proof requires a secure CreatorVault source URL.");
  return createGovernedPolloDraft({
    creatorId: input.creatorId,
    requestedBy: input.requestedBy,
    provider: "replicate",
    sourceUrl: input.sourceUrl,
    sourceChecksum: input.sourceChecksum,
    prompt: input.prompt,
    providerModelPath: REPLICATE_WAN_VIDEO_EDIT_MODEL_PATH,
    resolution: input.resolution,
    durationSeconds: input.durationSeconds,
    aspectRatio: input.aspectRatio,
    mode: REPLICATE_WAN_VIDEO_EDIT_MODE,
    outputCount: 1,
    estimatedCostCredits: REPLICATE_WAN_VIDEO_EDIT_HARD_SPEND_CAP,
    costEvidenceReference: "KingCam clone-only Replicate Wan 2.7 VideoEdit correction; documented $2 USD hard maximum; one output; no automatic retry; Body Cinema remains excluded.",
    ownershipConfirmed: input.ownershipConfirmed,
    consentConfirmed: input.consentConfirmed,
    idempotencyKey: input.idempotencyKey,
    requestId: input.requestId,
    metadata: {
      ...(input.metadata || {}),
      cloneOnly: true,
      providerCostCurrency: "USD",
      hardSpendCapUsd: REPLICATE_WAN_VIDEO_EDIT_HARD_SPEND_CAP,
      hardCreditCap: REPLICATE_WAN_VIDEO_EDIT_HARD_SPEND_CAP,
      ownerDirectedPilot: true,
      candidateLimit: 1,
      noAutomaticRetry: true,
      providerContract: "replicate_wan_2_7_videoedit_kingcam_clone_source_video",
      sourcePreservationRequired: true,
      bodyCinemaExcluded: true,
    },
  });
}

export async function createGovernedKingcamReplicateWanAnimateDraft(input: {
  creatorId: number;
  requestedBy: number;
  prompt: string;
  ownershipConfirmed: boolean;
  consentConfirmed: boolean;
  idempotencyKey?: string | null;
  requestId?: string | null;
  metadata?: Record<string, unknown>;
}): Promise<{ job: GovernedPolloJob; reused: boolean }> {
  return createGovernedPolloDraft({
    creatorId: input.creatorId,
    requestedBy: input.requestedBy,
    provider: "replicate",
    sourceUrl: REPLICATE_WAN_ANIMATE_DRIVER_URL,
    sourceChecksum: null,
    prompt: input.prompt,
    providerModelPath: REPLICATE_WAN_ANIMATE_MODEL_PATH,
    resolution: "720p",
    durationSeconds: 7,
    aspectRatio: "16:9",
    mode: REPLICATE_WAN_ANIMATE_MODE,
    outputCount: 1,
    estimatedCostCredits: REPLICATE_WAN_ANIMATE_HARD_SPEND_CAP_USD,
    costEvidenceReference: "Owner-authorized KingCam clone-only Wan Animate real-driver proof; authenticated Replicate model metadata verifies the exact character-image and driver-video contract; one seven-second output, manual $2 USD ceiling, and no automatic retry.",
    ownershipConfirmed: input.ownershipConfirmed,
    consentConfirmed: input.consentConfirmed,
    idempotencyKey: input.idempotencyKey,
    requestId: input.requestId,
    metadata: {
      ...(input.metadata || {}),
      kingcamWanAnimateRealDriverProof: true,
      cloneOnly: true,
      providerCostCurrency: "USD",
      hardSpendCapUsd: REPLICATE_WAN_ANIMATE_HARD_SPEND_CAP_USD,
      hardCreditCap: REPLICATE_WAN_ANIMATE_HARD_SPEND_CAP_USD,
      ownerDirectedPilot: true,
      candidateLimit: 1,
      noAutomaticRetry: true,
      sourcePreservationRequired: true,
      identityImageUrl: REPLICATE_WAN_ANIMATE_IDENTITY_IMAGE_URL,
      motionDriverUrl: REPLICATE_WAN_ANIMATE_DRIVER_URL,
      providerContract: "replicate_wan_2_2_animate_animation_real_driver_motion_transfer",
      bodyCinemaExcluded: true,
    },
  });
}

export async function createGovernedKingcamGoEnhanceRealPerformanceDraft(input: {
  creatorId: number;
  requestedBy: number;
  prompt: string;
  ownershipConfirmed: boolean;
  consentConfirmed: boolean;
  idempotencyKey?: string | null;
  requestId?: string | null;
  metadata?: Record<string, unknown>;
}): Promise<{ job: GovernedPolloJob; reused: boolean }> {
  const quote = await auditPolloKingcamVideoToVideoCandidate();
  if (!quote.quoteAvailable || quote.quotedCredits !== KINGCAM_GOENHANCE_HARD_CREDIT_CAP || quote.quotedCostUsd !== 6.3) {
    throw new Error("GoEnhance must return the locked live 105-credit / $6.30 estimate for the exact KingCam gait proof before a governed draft can exist.");
  }
  return createGovernedPolloDraft({
    creatorId: input.creatorId,
    requestedBy: input.requestedBy,
    provider: "pollo",
    sourceUrl: KINGCAM_GOENHANCE_REAL_DRIVER_URL,
    sourceChecksum: null,
    prompt: input.prompt,
    providerModelPath: KINGCAM_GOENHANCE_MODEL_PATH,
    resolution: "720p",
    durationSeconds: 7,
    aspectRatio: "16:9",
    mode: KINGCAM_GOENHANCE_MODE,
    outputCount: 1,
    estimatedCostCredits: quote.quotedCredits,
    costEvidenceReference: "Provider-verified GoEnhance v1 estimate for the locked real KingCam gait source and mx-v2v style: 105 Pollo credits / $6.30. One output only; the provider estimate is the hard ceiling and no automatic retry is allowed.",
    ownershipConfirmed: input.ownershipConfirmed,
    consentConfirmed: input.consentConfirmed,
    idempotencyKey: input.idempotencyKey,
    requestId: input.requestId,
    metadata: {
      ...(input.metadata || {}),
      kingcamGoEnhanceRealPerformanceProof: true,
      cloneOnly: true,
      providerCostCurrency: "Pollo credits",
      providerQuote: { credits: quote.quotedCredits, costUsd: quote.quotedCostUsd, source: "official_goenhance_v1_estimate" },
      providerQuotedCredits: quote.quotedCredits,
      providerQuotedCostUsd: quote.quotedCostUsd,
      hardCreditCap: KINGCAM_GOENHANCE_HARD_CREDIT_CAP,
      ownerDirectedPilot: true,
      candidateLimit: 1,
      noAutomaticRetry: true,
      sourcePreservationRequired: true,
      styleCode: KINGCAM_GOENHANCE_STYLE_CODE,
      realPerformanceDriverUrl: KINGCAM_GOENHANCE_REAL_DRIVER_URL,
      providerContract: "pollo_generation_video2video_goenhance_mx_v2v_real_kingcam_performance_only",
      bodyCinemaExcluded: true,
    },
  });
}

export async function createGovernedKingcamReplicateOmniHumanDraft(input: {
  creatorId: number;
  requestedBy: number;
  prompt: string;
  ownershipConfirmed: boolean;
  consentConfirmed: boolean;
  idempotencyKey?: string | null;
  requestId?: string | null;
  metadata?: Record<string, unknown>;
}): Promise<{ job: GovernedPolloJob; reused: boolean }> {
  return createGovernedPolloDraft({
    creatorId: input.creatorId,
    requestedBy: input.requestedBy,
    provider: "replicate",
    sourceUrl: REPLICATE_OMNI_HUMAN_IDENTITY_IMAGE_URL,
    sourceChecksum: null,
    prompt: input.prompt,
    providerModelPath: REPLICATE_OMNI_HUMAN_MODEL_PATH,
    resolution: "1080p",
    durationSeconds: 7,
    aspectRatio: "9:16",
    mode: REPLICATE_OMNI_HUMAN_MODE,
    outputCount: 1,
    estimatedCostCredits: REPLICATE_OMNI_HUMAN_HARD_SPEND_CAP_USD,
    costEvidenceReference: "Owner-authorized clone-only Replicate OmniHuman proof; one direct KingCam audio plus approved identity image; manual $2 USD ceiling; no automatic retry; Replicate model metadata confirms image and audio inputs.",
    ownershipConfirmed: input.ownershipConfirmed,
    consentConfirmed: input.consentConfirmed,
    idempotencyKey: input.idempotencyKey,
    requestId: input.requestId,
    metadata: {
      ...(input.metadata || {}),
      kingcamOmniHumanFullBodyProof: true,
      cloneOnly: true,
      providerCostCurrency: "USD",
      hardSpendCapUsd: REPLICATE_OMNI_HUMAN_HARD_SPEND_CAP_USD,
      hardCreditCap: REPLICATE_OMNI_HUMAN_HARD_SPEND_CAP_USD,
      ownerDirectedPilot: true,
      candidateLimit: 1,
      noAutomaticRetry: true,
      sourcePreservationRequired: true,
      genericVoiceFallbackForbidden: true,
      audioUrl: REPLICATE_OMNI_HUMAN_AUDIO_URL,
      providerContract: "replicate_omnihuman_image_plus_audio_kingcam_clone_only",
      bodyCinemaExcluded: true,
    },
  });
}

export async function createGovernedRunwayAlephVideoEditDraft(input: {
  creatorId: number;
  requestedBy: number;
  sourceUrl: string;
  sourceChecksum: string;
  runwayReferenceVideoUrl: string;
  prompt: string;
  resolution: "720p" | "1080p";
  durationSeconds: number;
  aspectRatio: "9:16" | "16:9" | "1:1";
  ownershipConfirmed: boolean;
  consentConfirmed: boolean;
  evidenceId: string;
  editBlueprintId: string;
  idempotencyKey?: string | null;
  metadata?: Record<string, unknown>;
}): Promise<{ job: GovernedPolloJob; reused: boolean }> {
  const blueprint = await assertBodyCinemaEditBlueprintReady({
    creatorId: input.creatorId,
    evidenceId: input.evidenceId,
    sourceMediaUrl: input.sourceUrl,
    editBlueprintId: input.editBlueprintId,
  });
  const durationSeconds = requirePositiveDuration(input.durationSeconds, "Runway Aleph source duration");
  if (durationSeconds < 2 || durationSeconds > 30) {
    throw new Error("Runway Aleph source-preserving edits require a real source clip between 2 and 30 seconds.");
  }
  if (!/^https:\/\//i.test(input.sourceUrl) || !/^https:\/\//i.test(input.runwayReferenceVideoUrl)) {
    throw new Error("Runway Aleph requires secure CreatorVault source proof and a Runway-hosted source reference.");
  }
  const estimatedCostCredits = Number((durationSeconds * RUNWAY_ALEPH_2_CREDITS_PER_SOURCE_SECOND).toFixed(2));
  return createGovernedPolloDraft({
    creatorId: input.creatorId,
    requestedBy: input.requestedBy,
    provider: "runway",
    sourceUrl: input.sourceUrl,
    sourceChecksum: input.sourceChecksum,
    prompt: input.prompt,
    providerModelPath: RUNWAY_ALEPH_2_VIDEO_EDIT_MODEL_PATH,
    resolution: input.resolution,
    durationSeconds,
    aspectRatio: input.aspectRatio,
    mode: RUNWAY_ALEPH_2_VIDEO_EDIT_MODE,
    outputCount: 1,
    estimatedCostCredits,
    costEvidenceReference: `Runway Aleph 2.0 documented source-edit estimate: ${durationSeconds}s source × ${RUNWAY_ALEPH_2_CREDITS_PER_SOURCE_SECOND} credits/second = ${estimatedCostCredits} credits. Single owner-directed preservation benchmark; no automatic retry.`,
    ownershipConfirmed: input.ownershipConfirmed,
    consentConfirmed: input.consentConfirmed,
    idempotencyKey: input.idempotencyKey,
    metadata: {
      ...(input.metadata || {}),
      bodyCinemaEvidenceId: input.evidenceId,
      bodyCinemaEditBlueprintId: blueprint.id,
      bodyCinemaBlueprintSceneCount: blueprint.scenes.length,
      bodyCinemaBlueprintState: blueprint.state,
      runwayReferenceVideoUrl: input.runwayReferenceVideoUrl,
      providerContract: "runway_aleph_2_in_context_source_video_edit",
      sourcePreservationRequired: true,
      preserve: ["identity", "face", "body_anatomy", "natural_skin", "wardrobe", "original_performance", "original_motion_timing", "camera_movement", "framing", "environment_geometry", "original_audio"],
      authorizedChangeSet: "Lighting only: warm private-suite ambience with natural sculpted highlights. No style transfer, animation, subject replacement, geometry change, or audio change.",
      ownerDirectedPilot: true,
      candidateLimit: 1,
      noAutomaticRetry: true,
      hardCreditCap: estimatedCostCredits,
      sourceDurationSeconds: durationSeconds,
      creditRatePerSourceSecond: RUNWAY_ALEPH_2_CREDITS_PER_SOURCE_SECOND,
    },
  });
}

export async function createGovernedTopazPrecisionVideoDraft(input: {
  creatorId: number;
  requestedBy: number;
  sourceUrl: string;
  sourceChecksum: string;
  resolution: "720p" | "1080p";
  durationSeconds: number;
  aspectRatio: "9:16" | "16:9" | "1:1";
  ownershipConfirmed: boolean;
  consentConfirmed: boolean;
  evidenceId: string;
  editBlueprintId: string;
  idempotencyKey?: string | null;
  metadata?: Record<string, unknown>;
}): Promise<{ job: GovernedPolloJob; reused: boolean }> {
  const blueprint = await assertBodyCinemaEditBlueprintReady({
    creatorId: input.creatorId,
    evidenceId: input.evidenceId,
    sourceMediaUrl: input.sourceUrl,
    editBlueprintId: input.editBlueprintId,
  });
  const sourceMap = await assertBodyCinemaSourceMapReady({
    creatorId: input.creatorId,
    evidenceId: input.evidenceId,
    sourceMediaUrl: input.sourceUrl,
    route: "source_preserving_precision_finish",
  });
  const durationSeconds = requirePositiveDuration(input.durationSeconds, "Topaz precision source duration");
  if (durationSeconds > 3600) throw new Error("Topaz precision finishing must be split before a source exceeds one hour.");
  if (!/^https:\/\//i.test(input.sourceUrl)) throw new Error("Topaz precision finishing requires a secure CreatorVault source URL.");
  const estimatedCostCredits = Math.ceil(durationSeconds / 10) * TOPAZ_PROTEUS_1080P_CREDITS_PER_10_SECONDS;
  return createGovernedPolloDraft({
    creatorId: input.creatorId,
    requestedBy: input.requestedBy,
    provider: "topaz",
    sourceUrl: input.sourceUrl,
    sourceChecksum: input.sourceChecksum,
    prompt: "Non-generative precision finish only: preserve the original creator, identity, anatomy, skin, wardrobe, performance, motion, timing, framing, geometry, and audio exactly; remove compression and noise only.",
    providerModelPath: TOPAZ_PROTEUS_PRECISION_VIDEO_MODEL_PATH,
    resolution: input.resolution,
    durationSeconds,
    aspectRatio: input.aspectRatio,
    mode: TOPAZ_PROTEUS_PRECISION_VIDEO_MODE,
    outputCount: 1,
    estimatedCostCredits,
    costEvidenceReference: `Topaz Proteus published estimate: ${TOPAZ_PROTEUS_1080P_CREDITS_PER_10_SECONDS} credits per 10 seconds at 1080p; conservative request cap for ${durationSeconds}s is ${estimatedCostCredits} credits. Exact provider request must remain inside this cap; no automatic retry.`,
    ownershipConfirmed: input.ownershipConfirmed,
    consentConfirmed: input.consentConfirmed,
    idempotencyKey: input.idempotencyKey,
    metadata: {
      ...(input.metadata || {}),
      bodyCinemaEvidenceId: input.evidenceId,
      bodyCinemaEditBlueprintId: blueprint.id,
      bodyCinemaSourceMapId: sourceMap.id,
      bodyCinemaBlueprintSceneCount: blueprint.scenes.length,
      providerContract: "topaz_proteus_precision_video",
      sourcePreservationRequired: true,
      reviewClass: "technical_source_preservation",
      preserve: ["identity", "face", "body_anatomy", "natural_skin", "wardrobe", "original_performance", "original_motion_timing", "camera_movement", "framing", "environment_geometry", "original_audio"],
      authorizedChangeSet: "Non-generative precision cleanup only: compression recovery, measured noise reduction, and resolution enhancement. No style transfer, subject change, geometry change, timing change, or audio change.",
      ownerDirectedPilot: true,
      candidateLimit: 1,
      noAutomaticRetry: true,
      hardCreditCap: estimatedCostCredits,
      sourceDurationSeconds: durationSeconds,
      topazPrecisionModel: "prob-4",
    },
  });
}

export async function createGovernedVaceLightingDraft(input: {
  creatorId: number;
  requestedBy: number;
  sourceUrl: string;
  sourceChecksum: string;
  aspectRatio: "9:16" | "16:9" | "1:1";
  ownershipConfirmed: boolean;
  consentConfirmed: boolean;
  evidenceId: string;
  editBlueprintId: string;
  idempotencyKey?: string | null;
  metadata?: Record<string, unknown>;
}): Promise<{ job: GovernedPolloJob; reused: boolean }> {
  const blueprint = await assertBodyCinemaEditBlueprintReady({
    creatorId: input.creatorId,
    evidenceId: input.evidenceId,
    sourceMediaUrl: input.sourceUrl,
    editBlueprintId: input.editBlueprintId,
  });
  const sourceMap = await assertBodyCinemaSourceMapReady({
    creatorId: input.creatorId,
    evidenceId: input.evidenceId,
    sourceMediaUrl: input.sourceUrl,
    route: "source_preserving_assembly",
  });
  const sourceDurationMs = Number(sourceMap.analysis.sourceDurationMs || 0);
  if (!Number.isFinite(sourceDurationMs) || sourceDurationMs < 2_000) {
    throw new Error("The verified creator source is too short for the protected VACE benchmark.");
  }
  const hookMoment = blueprint.strongestMoments.find((moment) => moment.kind === "hook")?.timestampMs
    ?? blueprint.scenes.find((scene) => scene.id === "hook")?.sourceTimestampMs
    ?? 0;
  const clipDurationMs = Math.min(5_000, Math.floor(sourceDurationMs));
  const clipStartMs = Math.max(0, Math.min(Math.round(hookMoment - clipDurationMs * 0.25), Math.max(0, Math.floor(sourceDurationMs) - clipDurationMs)));
  const clipEndMs = clipStartMs + clipDurationMs;
  const contract = buildVaceMaskedEditContract({
    jobKey: `creatorvault-vace:${input.creatorId}:${input.evidenceId}:${clipStartMs}:${clipEndMs}`,
    source: {
      sourceUrl: input.sourceUrl,
      sourceChecksum: input.sourceChecksum,
      evidenceId: input.evidenceId,
      sourceMapId: sourceMap.id,
      editBlueprintId: blueprint.id,
      clipStartMs,
      clipEndMs,
    },
    aspectRatio: input.aspectRatio,
    changeSet: "lighting_only",
  });
  const contractFingerprint = vaceContractFingerprint(contract);
  const estimatedCostCredits = CREATORVAULT_VACE_HARD_SESSION_CAP_USD;
  return createGovernedPolloDraft({
    creatorId: input.creatorId,
    requestedBy: input.requestedBy,
    provider: "vace",
    sourceUrl: input.sourceUrl,
    sourceChecksum: input.sourceChecksum,
    prompt: contract.changeSet.instruction,
    providerModelPath: CREATORVAULT_VACE_MODEL_PATH,
    resolution: "720p",
    durationSeconds: Number((clipDurationMs / 1000).toFixed(3)),
    aspectRatio: input.aspectRatio,
    mode: CREATORVAULT_VACE_MODE,
    outputCount: 1,
    estimatedCostCredits,
    costEvidenceReference: `CreatorVault-approved H200 VACE benchmark cap: $${CREATORVAULT_VACE_HARD_SESSION_CAP_USD} total GPU-runtime ceiling for one protected source-to-watchable attempt; no automatic retry.`,
    ownershipConfirmed: input.ownershipConfirmed,
    consentConfirmed: input.consentConfirmed,
    idempotencyKey: input.idempotencyKey,
    metadata: {
      ...(input.metadata || {}),
      bodyCinemaEvidenceId: input.evidenceId,
      bodyCinemaEditBlueprintId: blueprint.id,
      bodyCinemaSourceMapId: sourceMap.id,
      sourcePreservationRequired: true,
      authorizedChangeSet: contract.changeSet.instruction,
      preserve: ["identity", "face", "body_anatomy", "natural_skin", "wardrobe", "original_performance", "original_motion_timing", "camera_movement", "framing", "environment_geometry", "original_audio"],
      ownerDirectedPilot: true,
      candidateLimit: 1,
      noAutomaticRetry: true,
      hardCreditCap: estimatedCostCredits,
      providerCostCurrency: "USD",
      vaceContract: contract,
      vaceContractFingerprint: contractFingerprint,
      vaceClip: { startMs: clipStartMs, endMs: clipEndMs, durationMs: clipDurationMs, selectedFrom: "persisted_body_cinema_hook" },
      sourceDerivedControls: { temporalMask: "private_worker_derived_from_verified_source", identityReference: "private_worker_derived_from_verified_source" },
    },
  });
}

export async function setGovernedPolloCostEstimate(params: { jobId: number; ownerId: number; estimatedCostCredits: number; costEvidenceReference: string; reason?: string | null }): Promise<GovernedPolloJob> {
  requireOwner(params.ownerId);
  await ensureGovernedPolloSchema();
  const job = await getGovernedPolloJob(params.jobId);
  if (!job) throw new Error("Governed media job was not found.");
  if (!["draft", "cost_pending", "awaiting_approval"].includes(job.state)) {
    throw new Error(`Job in state ${job.state} cannot receive a new cost estimate.`);
  }
  const estimatedCostCredits = requirePositiveAmount(params.estimatedCostCredits, "Estimated credit cost");
  const costEvidenceReference = requireNonEmpty(params.costEvidenceReference, "Cost-evidence reference");
  const fingerprint = createFingerprint({
    creatorId: job.creatorId,
    requestedBy: job.requestedBy,
    sourceUrl: job.sourceUrl,
    sourceChecksum: job.sourceChecksum,
    prompt: job.prompt,
    providerModelPath: job.providerModelPath,
    resolution: job.resolution as "480p" | "720p" | "1080p",
    durationSeconds: job.durationSeconds,
    aspectRatio: job.aspectRatio as "9:16" | "16:9" | "1:1",
    mode: job.mode,
    outputCount: job.outputCount,
    estimatedCostCredits,
    costEvidenceReference,
    ownershipConfirmed: true,
    consentConfirmed: true,
  });
  const result = await rawExec(
    `UPDATE governed_media_jobs
     SET state = 'awaiting_approval', estimated_cost_credits = ?, cost_evidence_reference = ?, fingerprint = ?, updated_at = NOW()
     WHERE id = ? AND state IN ('draft', 'cost_pending', 'awaiting_approval')`,
    [estimatedCostCredits, costEvidenceReference, fingerprint, job.id],
  );
  if (!affectedRows(result)) throw new Error("Could not record the requested cost evidence.");
  const updated = (await getGovernedPolloJob(job.id))!;
  await appendEvent({
    jobId: updated.id,
    eventType: "cost_evidence_recorded",
    fromState: job.state,
    toState: "awaiting_approval",
    actorId: params.ownerId,
    correlationId: updated.requestId,
    detail: { estimatedCostCredits, costEvidenceReference, reason: params.reason ?? null, fingerprint },
  });
  return updated;
}

async function getReservedCredits(scope: string, creatorId?: number): Promise<number> {
  const conditions = ["scope = ?", "DATE(created_at) = CURRENT_DATE()"];
  const params: any[] = [scope];
  if (creatorId !== undefined) {
    conditions.push("creator_id = ?");
    params.push(creatorId);
  }
  const rows = await rawQuery(
    `SELECT COALESCE(SUM(CASE WHEN entry_type = 'reserve' THEN credits WHEN entry_type = 'release' THEN -credits ELSE 0 END), 0) AS credits
     FROM governed_media_budget_ledger WHERE ${conditions.join(" AND ")}`,
    params,
  );
  return Number(rows[0]?.credits ?? 0);
}

function isExplicitOwnerDirectedPilot(job: Pick<GovernedPolloJob, "provider" | "providerModelPath" | "mode" | "sourceUrl" | "estimatedCostCredits" | "metadata">): boolean {
  const cap = Number(job.metadata.hardCreditCap);
  return isSingleUseGovernedPilot(job)
    && job.metadata.ownerDirectedPilot === true
    && job.metadata.candidateLimit === 1
    && job.metadata.noAutomaticRetry === true
    && Number.isFinite(cap)
    && cap > 0
    && Number(job.estimatedCostCredits) === cap;
}

async function reserveBudget(job: GovernedPolloJob, approverId: number): Promise<void> {
  if (isProviderVerifiedZeroQuoteJob(job)) return;
  const estimated = requirePositiveAmount(job.estimatedCostCredits, "Estimated credit cost");
  const config = getGovernedPolloConfig();
  if (config.perRequestCreditCap <= 0 || config.perUserDailyCreditCap <= 0 || config.globalDailyCreditCap <= 0 || config.maxConcurrentJobs <= 0) {
    if (!isExplicitOwnerDirectedPilot(job)) {
      throw new Error("Governed Pollo budgets are frozen. Set explicit positive caps only after reviewing the requested job.");
    }
    const reference = `reserve:owner-directed-pilot:${job.requestId}`;
    for (const scope of ["global_daily", "creator_daily"]) {
      await rawExec(
        `INSERT INTO governed_media_budget_ledger (job_id, creator_id, scope, entry_type, credits, reference, detail_json, created_at)
         VALUES (?, ?, ?, 'reserve', ?, ?, ?, NOW())`,
        [job.id, job.creatorId, scope, estimated, reference, safeJson({ approverId, ownerDirectedPilot: true, hardCreditCap: estimated, generalBudgetsFrozen: true })],
      );
    }
    return;
  }
  if (estimated > config.perRequestCreditCap) throw new Error("Requested credit cap exceeds the configured per-request ceiling.");
  const [globalReserved, creatorReserved, active] = await Promise.all([
    getReservedCredits("global_daily"),
    getReservedCredits("creator_daily", job.creatorId),
    rawQuery(
      `SELECT COUNT(*) AS count FROM governed_media_jobs
       WHERE state IN ('queued', 'submitted', 'submission_unknown', 'provider_complete', 'quality_review')`,
    ),
  ]);
  if (globalReserved + estimated > config.globalDailyCreditCap) throw new Error("Global daily Pollo credit cap would be exceeded.");
  if (creatorReserved + estimated > config.perUserDailyCreditCap) throw new Error("Creator daily Pollo credit cap would be exceeded.");
  if (Number(active[0]?.count ?? 0) >= config.maxConcurrentJobs) throw new Error("Maximum governed Pollo concurrency is already reserved.");

  const reference = `reserve:${job.requestId}`;
  await rawExec(
    `INSERT INTO governed_media_budget_ledger (job_id, creator_id, scope, entry_type, credits, reference, detail_json, created_at)
     VALUES (?, ?, 'global_daily', 'reserve', ?, ?, ?, NOW())`,
    [job.id, job.creatorId, estimated, reference, safeJson({ approverId, cap: config.globalDailyCreditCap })],
  );
  await rawExec(
    `INSERT INTO governed_media_budget_ledger (job_id, creator_id, scope, entry_type, credits, reference, detail_json, created_at)
     VALUES (?, ?, 'creator_daily', 'reserve', ?, ?, ?, NOW())`,
    [job.id, job.creatorId, estimated, reference, safeJson({ approverId, cap: config.perUserDailyCreditCap })],
  );
}

export async function approveGovernedPolloJob(params: { jobId: number; approverId: number; expectedFingerprint: string; reason?: string | null }): Promise<GovernedPolloJob> {
  requireOwner(params.approverId);
  await ensureGovernedPolloSchema();
  const initial = await getGovernedPolloJob(params.jobId);
  if (!initial) throw new Error("Governed media job was not found.");
  if (initial.fingerprint !== params.expectedFingerprint) throw new Error("Approval fingerprint does not match the immutable governed media request.");
  if (initial.state === "approved" || initial.state === "queued" || initial.state === "submitted") return initial;
  if (initial.state !== "awaiting_approval") throw new Error(`Job in state ${initial.state} cannot be approved.`);
  if ((initial.estimatedCostCredits === null || initial.estimatedCostCredits === undefined || initial.estimatedCostCredits < 0) || !initial.costEvidenceReference) {
    throw new Error("A provider quote and cost-evidence reference are required before approval.");
  }
  if (Number(initial.estimatedCostCredits) === 0 && !isProviderVerifiedZeroQuoteJob(initial)) {
    throw new Error("A zero-cost job requires a server-verified provider estimate.");
  }

  const lockName = `governed_pollo_approval:${initial.creatorId}:${new Date().toISOString().slice(0, 10)}`;
  return withNamedLock(lockName, async () => {
    const job = await getGovernedPolloJob(params.jobId);
    if (!job) throw new Error("Governed media job disappeared during approval.");
    if (job.state === "approved" || job.state === "queued" || job.state === "submitted") return job;
    if (job.state !== "awaiting_approval") throw new Error(`Job in state ${job.state} cannot be approved.`);

    await reserveBudget(job, params.approverId);
    const update = await rawExec(
      `UPDATE governed_media_jobs
       SET state = 'approved', approved_by = ?, approved_at = NOW(), updated_at = NOW()
       WHERE id = ? AND state = 'awaiting_approval' AND fingerprint = ?`,
      [params.approverId, job.id, params.expectedFingerprint],
    );
    if (!affectedRows(update)) {
      await releaseGovernedPolloBudget({ jobId: job.id, actorId: params.approverId, reason: "approval_race_rollback" });
      throw new Error("Approval did not acquire the expected governed media job state.");
    }
    await rawExec(
      `INSERT INTO governed_media_approvals (job_id, approver_id, fingerprint, decision, estimated_cost_credits, reason, created_at)
       VALUES (?, ?, ?, 'approved', ?, ?, NOW())`,
      [job.id, params.approverId, job.fingerprint, job.estimatedCostCredits, params.reason?.slice(0, 1200) ?? null],
    );
    await appendEvent({
      jobId: job.id,
      eventType: "owner_approved",
      fromState: "awaiting_approval",
      toState: "approved",
      actorId: params.approverId,
      correlationId: job.requestId,
      detail: { estimatedCostCredits: job.estimatedCostCredits, reason: params.reason ?? null },
    });
    return (await getGovernedPolloJob(job.id))!;
  });
}

export async function releaseGovernedPolloBudget(params: { jobId: number; actorId?: number | null; reason: string }): Promise<void> {
  await ensureGovernedPolloSchema();
  const job = await getGovernedPolloJob(params.jobId);
  if (!job || !job.estimatedCostCredits) return;
  const estimate = job.estimatedCostCredits;
  const reference = `release:${job.requestId}:${params.reason}`.slice(0, 191);
  for (const scope of ["global_daily", "creator_daily"]) {
    await rawExec(
      `INSERT IGNORE INTO governed_media_budget_ledger (job_id, creator_id, scope, entry_type, credits, reference, detail_json, created_at)
       VALUES (?, ?, ?, 'release', ?, ?, ?, NOW())`,
      [job.id, job.creatorId, scope, estimate, reference, safeJson({ actorId: params.actorId ?? null, reason: params.reason })],
    );
  }
  await appendEvent({
    jobId: job.id,
    eventType: "budget_released",
    fromState: job.state,
    toState: job.state,
    actorId: params.actorId ?? null,
    correlationId: job.requestId,
    detail: { reason: params.reason, credits: estimate },
  });
}

export async function claimGovernedPolloJob(params: { jobId: number; workerId: string }): Promise<GovernedPolloJob> {
  await ensureGovernedPolloSchema();
  const job = await getGovernedPolloJob(params.jobId);
  if (!job) throw new Error("Governed media job was not found.");
  if (job.state !== "approved") throw new Error(`Job in state ${job.state} cannot be leased for submission.`);

  const config = getGovernedPolloConfig();
  if (isSingleUseGovernedPilot(job)) {
    return withNamedLock(`governed_pollo_single_use:${job.id}`, async () => {
      const locked = await getGovernedPolloJob(job.id);
      if (!locked || locked.state !== "approved") throw new Error("The single-use governed job is no longer approval-ready.");
      const lease = await rawExec(
        `UPDATE governed_media_jobs
         SET state = 'queued', lease_owner = ?, lease_expires_at = DATE_ADD(NOW(), INTERVAL ? SECOND), updated_at = NOW()
         WHERE id = ? AND state = 'approved' AND lease_expires_at IS NULL`,
        [params.workerId.slice(0, 191), config.leaseSeconds, locked.id],
      );
      if (!affectedRows(lease)) throw new Error("The governed single-use job could not be leased.");
      const permit = await rawExec(
        `UPDATE governed_media_single_use_permits
         SET state = 'consumed', consumed_at = NOW()
         WHERE job_id = ? AND state = 'authorized' AND expires_at > NOW() AND hard_credit_cap >= ?`,
        [locked.id, locked.estimatedCostCredits],
      );
      if (!affectedRows(permit)) {
        await rawExec(
          `UPDATE governed_media_jobs SET state = 'approved', lease_owner = NULL, lease_expires_at = NULL, updated_at = NOW()
           WHERE id = ? AND state = 'queued' AND lease_owner = ?`,
          [locked.id, params.workerId.slice(0, 191)],
        );
        throw new Error("No valid unconsumed single-use execution permit exists. No chargeable request was sent.");
      }
      await appendEvent({
        jobId: locked.id,
        eventType: "single_use_permit_consumed",
        fromState: "approved",
        toState: "queued",
        correlationId: locked.requestId,
        detail: { workerId: params.workerId, leaseSeconds: config.leaseSeconds },
      });
      return (await getGovernedPolloJob(locked.id))!;
    });
  }

  if (!isGovernedPolloExecutionEnabled()) {
    throw new Error("Governed Pollo execution remains frozen. No chargeable request was sent.");
  }
  const update = await rawExec(
    `UPDATE governed_media_jobs
     SET state = 'queued', lease_owner = ?, lease_expires_at = DATE_ADD(NOW(), INTERVAL ? SECOND), updated_at = NOW()
     WHERE id = ? AND state = 'approved' AND lease_expires_at IS NULL`,
    [params.workerId.slice(0, 191), config.leaseSeconds, job.id],
  );
  if (!affectedRows(update)) throw new Error("The governed job could not be leased; another worker may already own it.");
  await appendEvent({
    jobId: job.id,
    eventType: "worker_lease_acquired",
    fromState: "approved",
    toState: "queued",
    correlationId: job.requestId,
    detail: { workerId: params.workerId, leaseSeconds: config.leaseSeconds },
  });
  return (await getGovernedPolloJob(job.id))!;
}

export async function markGovernedPolloSubmitted(params: { jobId: number; workerId: string; providerJobId: string; providerResponse?: Record<string, unknown> }): Promise<GovernedPolloJob> {
  await ensureGovernedPolloSchema();
  const providerJobId = requireNonEmpty(params.providerJobId, "Provider job ID");
  const update = await rawExec(
    `UPDATE governed_media_jobs
     SET state = 'submitted', provider_job_id = ?, provider_response_json = ?, submitted_at = NOW(), updated_at = NOW(),
         lease_expires_at = DATE_ADD(NOW(), INTERVAL 24 HOUR)
     WHERE id = ? AND state = 'queued' AND lease_owner = ?`,
    [providerJobId, safeJson(params.providerResponse), params.jobId, params.workerId.slice(0, 191)],
  );
  if (!affectedRows(update)) throw new Error("Governed job was not leased by this worker or is no longer queueable.");
  const job = await getGovernedPolloJob(params.jobId);
  if (!job) throw new Error("Governed media job disappeared after submission.");
  await appendEvent({
    jobId: job.id,
    eventType: "provider_submission_recorded",
    fromState: "queued",
    toState: "submitted",
    correlationId: job.requestId,
    detail: { providerJobId },
  });
  return job;
}

export async function markGovernedPolloSubmissionUnknown(params: { jobId: number; workerId: string; error: unknown }): Promise<GovernedPolloJob> {
  await ensureGovernedPolloSchema();
  const update = await rawExec(
    `UPDATE governed_media_jobs
     SET state = 'submission_unknown', failure_code = 'submission_unknown', failure_message = ?, updated_at = NOW(),
         lease_expires_at = DATE_ADD(NOW(), INTERVAL 24 HOUR)
     WHERE id = ? AND state = 'queued' AND lease_owner = ?`,
    [safeErrorMessage(params.error), params.jobId, params.workerId.slice(0, 191)],
  );
  if (!affectedRows(update)) throw new Error("Could not mark the governed job as submission-unknown.");
  const job = await getGovernedPolloJob(params.jobId);
  if (!job) throw new Error("Governed media job disappeared after an ambiguous submission.");
  await appendEvent({
    jobId: job.id,
    eventType: "provider_submission_ambiguous",
    fromState: "queued",
    toState: "submission_unknown",
    correlationId: job.requestId,
    detail: { message: safeErrorMessage(params.error) },
  });
  return job;
}

export async function failGovernedPolloJob(params: { jobId: number; actorId?: number | null; code: string; error: unknown; releaseBudget?: boolean }): Promise<GovernedPolloJob> {
  await ensureGovernedPolloSchema();
  const previous = await getGovernedPolloJob(params.jobId);
  if (!previous) throw new Error("Governed media job was not found.");
  if (TERMINAL_STATES.includes(previous.state)) return previous;
  const update = await rawExec(
    `UPDATE governed_media_jobs
     SET state = 'failed', failure_code = ?, failure_message = ?, lease_owner = NULL, lease_expires_at = NULL, updated_at = NOW(), completed_at = NOW()
     WHERE id = ? AND state NOT IN ('accepted', 'rejected', 'failed', 'cancelled')`,
    [params.code.slice(0, 96), safeErrorMessage(params.error), params.jobId],
  );
  if (!affectedRows(update)) return (await getGovernedPolloJob(params.jobId))!;
  const job = (await getGovernedPolloJob(params.jobId))!;
  await appendEvent({
    jobId: job.id,
    eventType: "job_failed",
    fromState: previous.state,
    toState: "failed",
    actorId: params.actorId ?? null,
    correlationId: job.requestId,
    detail: { code: params.code, message: safeErrorMessage(params.error) },
  });
  if (params.releaseBudget) await releaseGovernedPolloBudget({ jobId: job.id, actorId: params.actorId ?? null, reason: params.code });
  return job;
}

async function submitGovernedReplicateWanVideoEditJob(leased: GovernedPolloJob, workerId: string): Promise<GovernedPolloJob> {
  const token = String(process.env.REPLICATE_API_TOKEN || "").trim();
  if (!token) {
    return failGovernedPolloJob({ jobId: leased.id, code: "replicate_key_missing", error: new Error("REPLICATE_API_TOKEN is not configured"), releaseBudget: true });
  }
  const payload = {
    input: {
      video: leased.sourceUrl,
      prompt: leased.prompt,
      resolution: leased.resolution,
      aspect_ratio: leased.aspectRatio,
      audio_setting: "origin",
      duration: Math.max(2, Math.min(10, Math.round(leased.durationSeconds))),
    },
  };
  let response: Response;
  try {
    response = await fetch("https://api.replicate.com/v1/models/wan-video/wan-2.7-videoedit/predictions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        Accept: "application/json",
        "Cancel-After": "2m",
      },
      body: JSON.stringify(payload),
    });
  } catch (error) {
    return markGovernedPolloSubmissionUnknown({ jobId: leased.id, workerId, error });
  }
  const providerResponse = await parseProviderJson(response);
  if (!response.ok) {
    if (response.status >= 500 || response.status === 408 || response.status === 429) {
      return markGovernedPolloSubmissionUnknown({ jobId: leased.id, workerId, error: new Error(`Replicate submission returned ${response.status}: ${safeErrorMessage(providerResponse.detail ?? providerResponse.error ?? providerResponse.responseText ?? "unknown error")}`) });
    }
    return failGovernedPolloJob({
      jobId: leased.id,
      code: `replicate_http_${response.status}`,
      error: new Error(`Replicate submission returned ${response.status}: ${safeErrorMessage(providerResponse.detail ?? providerResponse.error ?? providerResponse.responseText ?? "unknown error")}`),
      releaseBudget: true,
    });
  }
  const providerJobId = providerResponse.id;
  if (!providerJobId) return markGovernedPolloSubmissionUnknown({ jobId: leased.id, workerId, error: new Error("Replicate accepted the request without a prediction ID") });
  return markGovernedPolloSubmitted({ jobId: leased.id, workerId, providerJobId: String(providerJobId), providerResponse });
}

async function submitGovernedReplicateWanAnimateJob(leased: GovernedPolloJob, workerId: string): Promise<GovernedPolloJob> {
  const token = String(process.env.REPLICATE_API_TOKEN || "").trim();
  if (!token) return failGovernedPolloJob({ jobId: leased.id, code: "replicate_key_missing", error: new Error("REPLICATE_API_TOKEN is not configured"), releaseBudget: true });
  const identityImageUrl = typeof leased.metadata.identityImageUrl === "string" ? leased.metadata.identityImageUrl : "";
  const motionDriverUrl = typeof leased.metadata.motionDriverUrl === "string" ? leased.metadata.motionDriverUrl : "";
  if (leased.sourceUrl !== REPLICATE_WAN_ANIMATE_DRIVER_URL || motionDriverUrl !== REPLICATE_WAN_ANIMATE_DRIVER_URL || identityImageUrl !== REPLICATE_WAN_ANIMATE_IDENTITY_IMAGE_URL) {
    return failGovernedPolloJob({ jobId: leased.id, code: "wan_animate_input_contract_mismatch", error: new Error("Wan Animate requires the locked real KingCam driver and approved KingCam identity image."), releaseBudget: true });
  }
  const payload = {
    input: {
      video: motionDriverUrl,
      character_image: identityImageUrl,
      resolution: "720",
      frames_per_second: 24,
      go_fast: true,
      merge_audio: false,
    },
  };
  let response: Response;
  try {
    response = await fetch("https://api.replicate.com/v1/models/wan-video/wan-2.2-animate-animation/predictions", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", Accept: "application/json", "Cancel-After": "2m" },
      body: JSON.stringify(payload),
    });
  } catch (error) {
    return markGovernedPolloSubmissionUnknown({ jobId: leased.id, workerId, error });
  }
  const providerResponse = await parseProviderJson(response);
  if (!response.ok) {
    if (response.status >= 500 || response.status === 408 || response.status === 429) {
      return markGovernedPolloSubmissionUnknown({ jobId: leased.id, workerId, error: new Error(`Replicate Wan Animate submission returned ${response.status}: ${safeErrorMessage(providerResponse.detail ?? providerResponse.error ?? providerResponse.responseText ?? "unknown error")}`) });
    }
    return failGovernedPolloJob({ jobId: leased.id, code: `replicate_wan_animate_http_${response.status}`, error: new Error(`Replicate Wan Animate submission returned ${response.status}: ${safeErrorMessage(providerResponse.detail ?? providerResponse.error ?? providerResponse.responseText ?? "unknown error")}`), releaseBudget: true });
  }
  const providerJobId = providerResponse.id;
  if (!providerJobId) return markGovernedPolloSubmissionUnknown({ jobId: leased.id, workerId, error: new Error("Replicate accepted Wan Animate without a prediction ID") });
  return markGovernedPolloSubmitted({ jobId: leased.id, workerId, providerJobId: String(providerJobId), providerResponse });
}

async function submitGovernedKingcamGoEnhanceRealPerformanceJob(leased: GovernedPolloJob, workerId: string): Promise<GovernedPolloJob> {
  const apiKey = String(process.env.POLLO_API_KEY || "").trim();
  if (!apiKey) return failGovernedPolloJob({ jobId: leased.id, code: "provider_key_missing", error: new Error("POLLO_API_KEY is not configured"), releaseBudget: true });
  const styleCode = typeof leased.metadata.styleCode === "string" ? leased.metadata.styleCode : "";
  const realPerformanceDriverUrl = typeof leased.metadata.realPerformanceDriverUrl === "string" ? leased.metadata.realPerformanceDriverUrl : "";
  if (leased.sourceUrl !== KINGCAM_GOENHANCE_REAL_DRIVER_URL || realPerformanceDriverUrl !== KINGCAM_GOENHANCE_REAL_DRIVER_URL || styleCode !== KINGCAM_GOENHANCE_STYLE_CODE) {
    return failGovernedPolloJob({ jobId: leased.id, code: "goenhance_input_contract_mismatch", error: new Error("GoEnhance requires the locked real KingCam gait source and verified mx-v2v style code."), releaseBudget: true });
  }
  const balanceBeforeCredits = await readPolloAvailableCredits(apiKey);
  if (balanceBeforeCredits !== null) {
    await rawExec("UPDATE governed_media_jobs SET metadata_json = ?, updated_at = NOW() WHERE id = ? AND state = 'queued'", [safeJson({ ...leased.metadata, providerBalanceBeforeCredits: balanceBeforeCredits, providerBalanceReadAt: new Date().toISOString() }), leased.id]);
  }
  const payload = {
    input: {
      video: KINGCAM_GOENHANCE_REAL_DRIVER_URL,
      style: KINGCAM_GOENHANCE_STYLE_CODE,
      prompt: leased.prompt.slice(0, 500),
      strength: 0.1,
      subjectOnly: false,
      seed: -1,
    },
  };
  let response: Response;
  try {
    response = await fetch("https://pollo.ai/api/platform/v1/generation/video2video", {
      method: "POST",
      headers: { "x-api-key": apiKey, "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(payload),
    });
  } catch (error) {
    return markGovernedPolloSubmissionUnknown({ jobId: leased.id, workerId, error });
  }
  const providerResponse = await parseProviderJson(response);
  if (!response.ok) {
    if (response.status >= 500 || response.status === 408 || response.status === 429) {
      return markGovernedPolloSubmissionUnknown({ jobId: leased.id, workerId, error: new Error(`Pollo GoEnhance submission returned ${response.status}: ${safeErrorMessage(providerResponse.responseText ?? providerResponse.message ?? "unknown error")}`) });
    }
    return failGovernedPolloJob({ jobId: leased.id, code: `goenhance_http_${response.status}`, error: new Error(`Pollo GoEnhance submission returned ${response.status}: ${safeErrorMessage(providerResponse.responseText ?? providerResponse.message ?? "unknown error")}`), releaseBudget: true });
  }
  const providerJobId = providerResponse?.data?.taskId || providerResponse?.taskId || providerResponse?.id || providerResponse?.data?.id;
  if (!providerJobId) return markGovernedPolloSubmissionUnknown({ jobId: leased.id, workerId, error: new Error("Pollo GoEnhance accepted the request without a task ID") });
  return markGovernedPolloSubmitted({ jobId: leased.id, workerId, providerJobId: String(providerJobId), providerResponse });
}

async function submitGovernedReplicateOmniHumanJob(leased: GovernedPolloJob, workerId: string): Promise<GovernedPolloJob> {
  const token = String(process.env.REPLICATE_API_TOKEN || "").trim();
  if (!token) return failGovernedPolloJob({ jobId: leased.id, code: "replicate_key_missing", error: new Error("REPLICATE_API_TOKEN is not configured"), releaseBudget: true });
  const audioUrl = typeof leased.metadata.audioUrl === "string" ? leased.metadata.audioUrl : "";
  if (leased.sourceUrl !== REPLICATE_OMNI_HUMAN_IDENTITY_IMAGE_URL || audioUrl !== REPLICATE_OMNI_HUMAN_AUDIO_URL) {
    return failGovernedPolloJob({ jobId: leased.id, code: "omnihuman_input_contract_mismatch", error: new Error("OmniHuman requires the locked approved KingCam image and direct KingCam voice asset."), releaseBudget: true });
  }
  let response: Response;
  try {
    response = await fetch("https://api.replicate.com/v1/models/bytedance/omni-human/predictions", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", Accept: "application/json", "Cancel-After": "2m" },
      body: JSON.stringify({ input: { image: leased.sourceUrl, audio: audioUrl } }),
    });
  } catch (error) {
    return markGovernedPolloSubmissionUnknown({ jobId: leased.id, workerId, error });
  }
  const providerResponse = await parseProviderJson(response);
  if (!response.ok) {
    if (response.status >= 500 || response.status === 408 || response.status === 429) {
      return markGovernedPolloSubmissionUnknown({ jobId: leased.id, workerId, error: new Error(`Replicate OmniHuman submission returned ${response.status}: ${safeErrorMessage(providerResponse.detail ?? providerResponse.error ?? providerResponse.responseText ?? "unknown error")}`) });
    }
    return failGovernedPolloJob({ jobId: leased.id, code: `replicate_omnihuman_http_${response.status}`, error: new Error(`Replicate OmniHuman submission returned ${response.status}: ${safeErrorMessage(providerResponse.detail ?? providerResponse.error ?? providerResponse.responseText ?? "unknown error")}`), releaseBudget: true });
  }
  const providerJobId = providerResponse.id;
  if (!providerJobId) return markGovernedPolloSubmissionUnknown({ jobId: leased.id, workerId, error: new Error("Replicate OmniHuman accepted the request without a prediction ID") });
  return markGovernedPolloSubmitted({ jobId: leased.id, workerId, providerJobId: String(providerJobId), providerResponse });
}

async function inspectTopazPrecisionSource(localPath: string): Promise<{ width: number; height: number; durationSeconds: number; frameRate: number; frameCount: number; container: "mp4" }> {
  const { stdout } = await execFileAsync("ffprobe", ["-v", "error", "-show_entries", "format=duration:stream=width,height,avg_frame_rate,nb_frames,codec_type", "-of", "json", localPath]);
  const inspected = parseJson(stdout) as Record<string, any>;
  const video = Array.isArray(inspected.streams) ? inspected.streams.find((stream: any) => String(stream?.codec_type) === "video") : null;
  const durationSeconds = Number(inspected.format?.duration);
  const [numerator, denominator] = String(video?.avg_frame_rate || "0/1").split("/").map(Number);
  const frameRate = numerator > 0 && denominator > 0 ? numerator / denominator : 30;
  const width = Number(video?.width);
  const height = Number(video?.height);
  const frameCount = Math.max(1, Number(video?.nb_frames) || Math.round(durationSeconds * frameRate));
  if (!Number.isFinite(durationSeconds) || durationSeconds <= 0 || !Number.isFinite(width) || width <= 0 || !Number.isFinite(height) || height <= 0) {
    throw new Error("The protected CreatorVault source could not be inspected for Topaz precision finishing.");
  }
  return { width, height, durationSeconds, frameRate, frameCount, container: "mp4" };
}

function topazFailureToCircuitCode(error: unknown): "service_unavailable" | "plan_gate" | "asset_contract" | "manual_hold" {
  if (error instanceof TopazPrecisionProviderError) {
    if (/rate_limited|service_unavailable|upload_unavailable/i.test(error.code)) return "service_unavailable";
    if (/access_denied/i.test(error.code)) return "plan_gate";
    if (/not_configured/i.test(error.code)) return "manual_hold";
  }
  return "asset_contract";
}

async function submitGovernedTopazPrecisionVideoJob(leased: GovernedPolloJob, workerId: string): Promise<GovernedPolloJob> {
  let prepared: Awaited<ReturnType<typeof prepareTopazPrecisionVideoRequest>>;
  try {
    const localPath = resolveCreatorVaultUploadPath(leased.sourceUrl);
    const source = await inspectTopazPrecisionSource(localPath);
    const targetWidth = leased.resolution === "1080p" ? (source.height >= source.width ? 1080 : 1920) : (source.height >= source.width ? 720 : 1280);
    const targetHeight = leased.resolution === "1080p" ? (source.height >= source.width ? 1920 : 1080) : (source.height >= source.width ? 1280 : 720);
    prepared = await prepareTopazPrecisionVideoRequest({ sourceFilePath: localPath, source, options: { outputWidth: Math.max(source.width, targetWidth), outputHeight: Math.max(source.height, targetHeight), requestedModel: "prob-4", audioTransfer: "Copy" } });
    const created = await createTopazPrecisionVideoRequest(prepared);
    const submitted = await markGovernedPolloSubmitted({ jobId: leased.id, workerId, providerJobId: created.providerRequestId, providerResponse: created.raw });
    const accepted = await acceptTopazPrecisionVideoRequest(created.providerRequestId);
    await uploadAndCompleteTopazPrecisionVideo({ accepted, sourceFilePath: localPath });
    return submitted;
  } catch (error) {
    const existing = await getGovernedPolloJob(leased.id);
    const releaseBudget = existing?.state === "queued";
    const failed = await failGovernedPolloJob({ jobId: leased.id, code: error instanceof TopazPrecisionProviderError ? error.code : "topaz_precision_submission_failed", error, releaseBudget });
    await recordBodyCinemaProviderFailure({
      providerKey: "topaz_video",
      code: topazFailureToCircuitCode(error),
      detail: safeErrorMessage(error),
      source: "governed_topaz_precision_submission",
      metadata: { governedJobId: leased.id, requestId: leased.requestId, reservationReleased: releaseBudget },
    }).catch(() => undefined);
    return failed;
  }
}

function getVaceWorkerRuntime(): { baseUrl: string; token: string } {
  const baseUrl = String(process.env.CREATORVAULT_VACE_WORKER_URL || "").trim().replace(/\/$/, "");
  const token = String(process.env.CREATORVAULT_VACE_WORKER_TOKEN || "").trim();
  if (!/^https:\/\/[^\s/?#]+(?:\/[^\s?#]*)?$/i.test(baseUrl) || token.length < 32 || /\s/.test(token)) {
    throw new Error("The protected CreatorVault VACE worker connection is not ready.");
  }
  return { baseUrl, token };
}

function vaceContractFromJob(job: GovernedPolloJob): VaceMaskedEditContract {
  if (!isCreatorVaultVaceLightingJob(job)) throw new Error("A governed CreatorVault VACE lighting benchmark is required.");
  const raw = job.metadata.vaceContract as Record<string, any>;
  const contract = buildVaceMaskedEditContract({
    jobKey: String(raw?.jobKey || ""),
    source: {
      sourceUrl: String(raw?.source?.sourceUrl || ""),
      sourceChecksum: String(raw?.source?.sourceChecksum || ""),
      evidenceId: String(raw?.source?.evidenceId || ""),
      sourceMapId: String(raw?.source?.sourceMapId || ""),
      editBlueprintId: String(raw?.source?.editBlueprintId || ""),
      clipStartMs: Number(raw?.source?.clipStartMs),
      clipEndMs: Number(raw?.source?.clipEndMs),
    },
    aspectRatio: raw?.output?.aspectRatio,
    changeSet: raw?.changeSet?.kind,
  });
  const expectedFingerprint = String(job.metadata.vaceContractFingerprint || "");
  if (!expectedFingerprint || vaceContractFingerprint(contract) !== expectedFingerprint) {
    throw new Error("The stored protected VACE contract no longer matches the owner-approved benchmark.");
  }
  if (contract.source.sourceUrl !== job.sourceUrl || contract.source.sourceChecksum !== job.sourceChecksum) {
    throw new Error("The VACE contract does not match the governed source record.");
  }
  return contract;
}

async function vaceWorkerJson(pathname: string, options: RequestInit): Promise<Record<string, any>> {
  const runtime = getVaceWorkerRuntime();
  const response = await fetch(`${runtime.baseUrl}${pathname}`, {
    ...options,
    headers: { "X-CreatorVault-Worker-Token": runtime.token, Accept: "application/json", ...(options.headers || {}) },
  });
  const body = await parseProviderJson(response);
  if (!response.ok) throw new Error(`VACE worker returned ${response.status}: ${safeErrorMessage(body.detail ?? body.message ?? body.responseText ?? "unknown error")}`);
  return body;
}

async function submitGovernedVaceLightingJob(leased: GovernedPolloJob, workerId: string): Promise<GovernedPolloJob> {
  try {
    const contract = vaceContractFromJob(leased);
    const workerResponse = await vaceWorkerJson("/v1/body-cinema/jobs", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ contract }) });
    const workerJobId = String(workerResponse.workerJobId || "").trim();
    if (!workerJobId) return markGovernedPolloSubmissionUnknown({ jobId: leased.id, workerId, error: new Error("The VACE worker accepted the benchmark without a worker job ID.") });
    return markGovernedPolloSubmitted({ jobId: leased.id, workerId, providerJobId: workerJobId, providerResponse: workerResponse });
  } catch (error) {
    const message = safeErrorMessage(error);
    const existing = await getGovernedPolloJob(leased.id);
    const ambiguous = /network|fetch|timeout|timed out|ECONN|EAI_AGAIN/i.test(message);
    const failed = ambiguous
      ? await markGovernedPolloSubmissionUnknown({ jobId: leased.id, workerId, error })
      : await failGovernedPolloJob({ jobId: leased.id, code: "vace_submission_failed", error, releaseBudget: existing?.state === "queued" });
    await recordBodyCinemaProviderFailure({ providerKey: "creatorvault_vace", code: ambiguous ? "submission_timeout_no_task" : "asset_contract", detail: message, source: "governed_vace_submission", metadata: { governedJobId: leased.id, requestId: leased.requestId, reservationReleased: existing?.state === "queued" } }).catch(() => undefined);
    return failed;
  }
}

export async function reconcileGovernedVaceSubmission(params: { jobId: number; ownerId: number; workerId: string; workerJobId: string }): Promise<GovernedPolloJob> {
  requireOwner(params.ownerId);
  const job = await getGovernedPolloJob(params.jobId);
  if (!job || !isCreatorVaultVaceLightingJob(job)) throw new Error("A queued CreatorVault VACE benchmark is required for submission reconciliation.");
  if (job.providerJobId || !["queued", "submission_unknown"].includes(job.state)) {
    throw new Error("This VACE benchmark cannot be reconciled because it is no longer awaiting a worker submission record.");
  }
  const workerJobId = requireNonEmpty(params.workerJobId, "VACE worker job ID");
  const workerStatus = await vaceWorkerJson(`/v1/body-cinema/jobs/${encodeURIComponent(workerJobId)}`, { method: "GET" });
  if (String(workerStatus.jobKey || "") !== String((job.metadata.vaceContract as Record<string, any>)?.jobKey || "")) {
    throw new Error("The supplied H200 worker job does not belong to this immutable governed VACE request.");
  }
  if (job.state === "queued") {
    return markGovernedPolloSubmitted({ jobId: job.id, workerId: params.workerId, providerJobId: workerJobId, providerResponse: { ...workerStatus, reconciledAfterTransportTimeout: true } });
  }
  const update = await rawExec(
    `UPDATE governed_media_jobs
       SET state = 'submitted', provider_job_id = ?, provider_response_json = ?, submitted_at = NOW(), updated_at = NOW(), lease_expires_at = DATE_ADD(NOW(), INTERVAL 24 HOUR)
     WHERE id = ? AND state = 'submission_unknown' AND provider_job_id IS NULL`,
    [workerJobId, safeJson({ ...workerStatus, reconciledAfterTransportTimeout: true }), job.id],
  );
  if (!affectedRows(update)) throw new Error("CreatorVault could not safely reconcile the ambiguous VACE submission.");
  const reconciled = (await getGovernedPolloJob(job.id))!;
  await appendEvent({ jobId: reconciled.id, eventType: "provider_submission_reconciled", fromState: "submission_unknown", toState: "submitted", actorId: params.ownerId, correlationId: reconciled.requestId, detail: { workerId: params.workerId, providerJobId: workerJobId } });
  return reconciled;
}

export async function pollGovernedVaceLightingJob(params: { jobId: number; ownerId: number }): Promise<GovernedPolloJob> {
  requireOwner(params.ownerId);
  const job = await getGovernedPolloJob(params.jobId);
  if (!job || !isCreatorVaultVaceLightingJob(job)) throw new Error("A submitted CreatorVault VACE benchmark is required for worker polling.");
  if (job.state !== "submitted" || !job.providerJobId) throw new Error(`VACE benchmark in state ${job.state} cannot be polled.`);
  try {
    const status = await vaceWorkerJson(`/v1/body-cinema/jobs/${encodeURIComponent(job.providerJobId)}`, { method: "GET" });
    const state = String(status.state || "running_vace").toLowerCase();
    if (state === "completed") {
      const runtime = getVaceWorkerRuntime();
      return recordGovernedPolloProviderCompletion({ jobId: job.id, providerJobId: job.providerJobId, outputUrl: `${runtime.baseUrl}/v1/body-cinema/jobs/${encodeURIComponent(job.providerJobId)}/output`, providerResponse: status });
    }
    if (state === "failed") {
      const failed = await failGovernedPolloJob({ jobId: job.id, actorId: params.ownerId, code: "vace_inference_failed", error: new Error(String(status.reason || "VACE worker reported a failed benchmark.")) });
      await recordBodyCinemaProviderFailure({ providerKey: "creatorvault_vace", code: "provider_output_failure", detail: String(status.reason || "VACE inference failed."), source: "governed_vace_poll", metadata: { governedJobId: job.id, requestId: job.requestId } }).catch(() => undefined);
      return failed;
    }
    await rawExec("UPDATE governed_media_jobs SET provider_response_json = ?, updated_at = NOW() WHERE id = ? AND state = 'submitted'", [safeJson(status), job.id]);
    await appendEvent({ jobId: job.id, eventType: "provider_status_polled", fromState: "submitted", toState: "submitted", actorId: params.ownerId, correlationId: job.requestId, detail: { providerJobId: job.providerJobId, status: state } });
    return (await getGovernedPolloJob(job.id))!;
  } catch (error) {
    await recordBodyCinemaProviderFailure({ providerKey: "creatorvault_vace", code: "service_unavailable", detail: safeErrorMessage(error), source: "governed_vace_poll", metadata: { governedJobId: job.id, requestId: job.requestId } }).catch(() => undefined);
    throw error;
  }
}

export async function ingestCompletedGovernedVaceLightingOutput(params: { jobId: number; ownerId: number }): Promise<{ outputAssetUrl: string; durationSeconds: number; width: number; height: number; sizeBytes: number; outputFingerprint: string }> {
  requireOwner(params.ownerId);
  const job = await getGovernedPolloJob(params.jobId);
  if (!job || !isCreatorVaultVaceLightingJob(job)) throw new Error("A completed CreatorVault VACE benchmark is required for Media Vault ingestion.");
  if (job.state !== "provider_complete" || !job.providerJobId || !job.outputUrl) throw new Error("CreatorVault will only ingest a completed VACE worker output.");
  const folder = `body-cinema-vace-${job.id}`;
  const fileName = "Body-Cinema-VACE-Lighting-Benchmark.mp4";
  const directory = path.join("/root/uploads", "content-vault", folder);
  const localPath = path.join(directory, fileName);
  const outputAssetUrl = `https://creatorvault.live/uploads/content-vault/${folder}/${fileName}`;
  if (!(await stat(localPath).then(() => true).catch(() => false))) {
    await mkdir(directory, { recursive: true });
    const runtime = getVaceWorkerRuntime();
    const response = await fetch(`${runtime.baseUrl}/v1/body-cinema/jobs/${encodeURIComponent(job.providerJobId)}/output`, { headers: { "X-CreatorVault-Worker-Token": runtime.token, Accept: "video/mp4" } });
    if (!response.ok) throw new Error(`VACE output download returned ${response.status}.`);
    const contentType = String(response.headers.get("content-type") || "").toLowerCase();
    if (contentType && !contentType.includes("video/")) throw new Error(`VACE output did not return video data (${contentType}).`);
    const declaredLength = Number(response.headers.get("content-length") || 0);
    if (declaredLength > CREATORVAULT_VACE_OUTPUT_MAX_BYTES) throw new Error("VACE output exceeded the governed Media Vault size limit.");
    const bytes = Buffer.from(await response.arrayBuffer());
    if (bytes.length < 1024 || bytes.length > CREATORVAULT_VACE_OUTPUT_MAX_BYTES) throw new Error("VACE output failed the governed Media Vault size limit.");
    await writeFile(localPath, bytes);
  }
  const video = await probeVideo(localPath);
  const sizeBytes = Number((await stat(localPath)).size);
  const outputFingerprint = createHash("sha256").update(await readFile(localPath)).digest("hex");
  if (sizeBytes < 1024 || video.durationSeconds <= 0 || video.width <= 0 || video.height <= 0) throw new Error("VACE output was not a readable governed video.");
  const existing = await rawQuery("SELECT id FROM media_assets WHERE user_id = ? AND public_url = ? LIMIT 1", [job.creatorId, outputAssetUrl]);
  if (!existing[0]) {
    await rawExec(`INSERT INTO media_assets (id, user_id, source_type, asset_type, file_name, original_name, mime_type, file_size, storage_path, public_url, thumbnail_url, duration, width, height, status, created_by_feature)
      VALUES (?, ?, 'generated', 'video', ?, ?, 'video/mp4', ?, ?, ?, ?, ?, ?, ?, 'ready', 'body_cinema_governed_vace')`, [randomUUID(), job.creatorId, fileName, fileName, sizeBytes, localPath, outputAssetUrl, outputAssetUrl, Number(video.durationSeconds.toFixed(3)), video.width, video.height]);
  }
  const metadata = { ...job.metadata, durableOutputUrl: outputAssetUrl, outputFingerprint, actualCostState: `One approved H200 session with a fixed $${CREATORVAULT_VACE_HARD_SESSION_CAP_USD} ceiling; infrastructure cost is bounded outside Pollo credits.`, verifiedProviderVideo: { durationSeconds: Number(video.durationSeconds.toFixed(3)), width: video.width, height: video.height, sizeBytes, provider: "creatorvault_vace" } };
  await rawExec("UPDATE governed_media_jobs SET metadata_json = ?, updated_at = NOW() WHERE id = ? AND state = 'provider_complete'", [safeJson(metadata), job.id]);
  await appendEvent({ jobId: job.id, eventType: "provider_output_durably_ingested", fromState: "provider_complete", toState: "provider_complete", actorId: params.ownerId, correlationId: job.requestId, detail: { outputAssetUrl, durationSeconds: Number(video.durationSeconds.toFixed(3)), width: video.width, height: video.height, sizeBytes, outputFingerprint } });
  return { outputAssetUrl, durationSeconds: Number(video.durationSeconds.toFixed(3)), width: video.width, height: video.height, sizeBytes, outputFingerprint };
}

export async function reviewCompletedGovernedVaceLightingOutput(params: { jobId: number; ownerId: number }): Promise<{ reviewedJob: GovernedPolloJob; outputReview: BodyCinemaOutputReview; outputAssetUrl: string }> {
  requireOwner(params.ownerId);
  const ingested = await ingestCompletedGovernedVaceLightingOutput(params);
  const job = await getGovernedPolloJob(params.jobId);
  if (!job || !isCreatorVaultVaceLightingJob(job)) throw new Error("A completed CreatorVault VACE benchmark is required for output review.");
  const evidenceId = typeof job.metadata.bodyCinemaEvidenceId === "string" ? job.metadata.bodyCinemaEvidenceId : "";
  if (!evidenceId) throw new Error("The governed VACE benchmark has no Body Cinema source evidence reference.");
  const localPath = path.join("/root/uploads", "content-vault", `body-cinema-vace-${job.id}`, "Body-Cinema-VACE-Lighting-Benchmark.mp4");
  const video = await probeVideo(localPath);
  const frameEvidence = await buildFrameEvidence(localPath, video);
  const outputReview = await reviewBodyCinemaOutput(job.creatorId, { evidenceId, outputAssetUrl: ingested.outputAssetUrl, outputFingerprint: ingested.outputFingerprint, frameEvidence, reviewClass: "technical_source_preservation" });
  const passedRegressionFloor = outputReview.status === "accepted" && outputReview.overallScore >= 94;
  const reason = passedRegressionFloor ? outputReview.reasons.join(" ") : `${outputReview.reasons.join(" ")} Rejected: VACE output did not clear the locked 94/100 Body Cinema preservation baseline.`;
  const reviewedJob = await reviewGovernedPolloOutput({ jobId: job.id, reviewerId: params.ownerId, accepted: passedRegressionFloor, artifactUrl: passedRegressionFloor ? ingested.outputAssetUrl : null, qualityScore: outputReview.overallScore, reason });
  return { reviewedJob, outputReview, outputAssetUrl: ingested.outputAssetUrl };
}

export async function submitGovernedPolloJob(params: { jobId: number; workerId: string }): Promise<GovernedPolloJob> {
  const leased = await claimGovernedPolloJob(params);
  if (isCreatorVaultVaceLightingJob(leased)) return submitGovernedVaceLightingJob(leased, params.workerId);
  if (isReplicateWanVideoEditJob(leased)) return submitGovernedReplicateWanVideoEditJob(leased, params.workerId);
  if (isReplicateWanAnimateJob(leased)) return submitGovernedReplicateWanAnimateJob(leased, params.workerId);
  if (isKingcamGoEnhanceRealPerformanceJob(leased)) return submitGovernedKingcamGoEnhanceRealPerformanceJob(leased, params.workerId);
  if (isReplicateOmniHumanJob(leased)) return submitGovernedReplicateOmniHumanJob(leased, params.workerId);
  if (isTopazPrecisionVideoJob(leased)) return submitGovernedTopazPrecisionVideoJob(leased, params.workerId);
  const apiKey = String(process.env.POLLO_API_KEY || "").trim();
  if (!apiKey) {
    return failGovernedPolloJob({ jobId: leased.id, code: "provider_key_missing", error: new Error("POLLO_API_KEY is not configured"), releaseBudget: true });
  }

  const designImage = isDesignImagePilot(leased) ? await buildDesignImageInput(leased) : null;
  if (designImage) {
    await rawExec(
      "UPDATE governed_media_jobs SET metadata_json = ?, updated_at = NOW() WHERE id = ? AND state = 'queued'",
      [safeJson({ ...leased.metadata, designImageReferenceFrameUrl: designImage.referenceFrameUrl }), leased.id],
    );
  }
  const requestBody = isSourceVideoReferenceJob(leased)
    ? buildSourceVideoReferenceInput({
      providerModelPath: leased.providerModelPath,
      sourceUrl: leased.sourceUrl,
      prompt: leased.prompt,
      durationSeconds: leased.durationSeconds,
      resolution: leased.resolution,
      aspectRatio: leased.aspectRatio,
    })
    : isKingcamWanSpokenMotionJob(leased)
      ? buildKingcamWanSpokenMotionInput(leased)
      : isKingcamKlingOmniSpokenMotionJob(leased)
        ? buildKingcamKlingOmniSpokenMotionInput(leased)
        : isHomepageTextToVideoPilot(leased)
        ? buildHomepageTextToVideoInput(leased)
      : designImage
        ? designImage.input
        : {
          image: leased.sourceUrl,
          prompt: leased.prompt,
          length: leased.durationSeconds,
          mode: leased.mode,
        };
  const providerUrl = isSourceVideoReferenceJob(leased)
    ? `https://pollo.ai/api/platform/generation/${getSourceVideoReferenceContract(leased.providerModelPath)!.apiPath}`
    : isKingcamWanSpokenMotionJob(leased)
      ? "https://pollo.ai/api/platform/generation/wanx/wan-v2-7"
      : isKingcamKlingOmniSpokenMotionJob(leased)
        ? "https://pollo.ai/api/platform/generation/kling-ai/kling-v3-omni/ref2video"
        : isHomepageTextToVideoPilot(leased)
      ? `https://pollo.ai/api/platform/generation/${HOMEPAGE_TEXT_TO_VIDEO_API_PATH}`
      : isDesignImagePilot(leased)
        ? `https://pollo.ai/api/platform/generation/${DESIGN_IMAGE_API_PATH}`
        : `https://pollo.ai/api/platform/generation/${leased.providerModelPath.replace("pollo/", "")}`;

  const balanceBeforeCredits = await readPolloAvailableCredits(apiKey);
  if (balanceBeforeCredits !== null) {
    await rawExec(
      "UPDATE governed_media_jobs SET metadata_json = ?, updated_at = NOW() WHERE id = ? AND state = 'queued'",
      [safeJson({ ...leased.metadata, providerBalanceBeforeCredits: balanceBeforeCredits, providerBalanceReadAt: new Date().toISOString() }), leased.id],
    );
  }

  let response: Response;
  try {
    response = await fetch(providerUrl, {
      method: "POST",
      headers: { "x-api-key": apiKey, "Content-Type": "application/json" },
      body: JSON.stringify({ input: requestBody }),
    });
  } catch (error) {
    return markGovernedPolloSubmissionUnknown({ jobId: leased.id, workerId: params.workerId, error });
  }

  const responseJson = await parseProviderJson(response);
  if (!response.ok) {
    if (response.status >= 500 || response.status === 408 || response.status === 429) {
      return markGovernedPolloSubmissionUnknown({
        jobId: leased.id,
        workerId: params.workerId,
        error: new Error(`Pollo submission returned ${response.status}: ${safeErrorMessage(responseJson.responseText ?? responseJson.message ?? "unknown error")}`),
      });
    }
    return failGovernedPolloJob({
      jobId: leased.id,
      code: `provider_http_${response.status}`,
      error: new Error(`Pollo submission returned ${response.status}: ${safeErrorMessage(responseJson.responseText ?? responseJson.message ?? "unknown error")}`),
      releaseBudget: true,
    });
  }

  const providerJobId = responseJson?.data?.taskId || responseJson?.taskId || responseJson?.id || responseJson?.job_id || responseJson?.task_id;
  if (!providerJobId) {
    return markGovernedPolloSubmissionUnknown({
      jobId: leased.id,
      workerId: params.workerId,
      error: new Error("Provider accepted a request but did not return a task ID"),
    });
  }
  return markGovernedPolloSubmitted({ jobId: leased.id, workerId: params.workerId, providerJobId: String(providerJobId), providerResponse: responseJson });
}

export async function pollGovernedPolloProviderJob(params: { jobId: number; actorId: number }): Promise<GovernedPolloJob> {
  requireOwner(params.actorId);
  await ensureGovernedPolloSchema();
  const job = await getGovernedPolloJob(params.jobId);
  if (!job) throw new Error("Governed media job was not found.");
  if (job.state !== "submitted") throw new Error(`Job in state ${job.state} cannot be polled for provider completion.`);
  if (!job.providerJobId) throw new Error("The governed media job has no provider task ID to poll.");

  if (isCreatorVaultVaceLightingJob(job)) {
    return pollGovernedVaceLightingJob({ jobId: job.id, ownerId: params.actorId });
  }

  if (isTopazPrecisionVideoJob(job)) {
    try {
      const providerStatus = await getTopazPrecisionVideoStatus(job.providerJobId);
      const rawStatus = providerStatus.state.toLowerCase();
      if (["succeeded", "success", "completed", "complete"].includes(rawStatus)) {
        if (!providerStatus.outputUrl) throw new Error("Topaz reported completion without a readable HTTPS video URL.");
        return recordGovernedPolloProviderCompletion({ jobId: job.id, providerJobId: job.providerJobId, outputUrl: providerStatus.outputUrl, providerResponse: providerStatus.raw });
      }
      if (["failed", "fail", "error", "cancelled", "canceled"].includes(rawStatus)) {
        const failed = await failGovernedPolloJob({ jobId: job.id, actorId: params.actorId, code: "topaz_precision_failed", error: new Error(`Topaz precision request ${rawStatus}`) });
        await recordBodyCinemaProviderFailure({ providerKey: "topaz_video", code: "provider_output_failure", detail: `Topaz precision request ${rawStatus}.`, source: "governed_topaz_precision_poll", metadata: { governedJobId: job.id, requestId: job.requestId } }).catch(() => undefined);
        return failed;
      }
      await rawExec("UPDATE governed_media_jobs SET provider_response_json = ?, updated_at = NOW() WHERE id = ? AND state = 'submitted'", [safeJson(providerStatus.raw), job.id]);
      await appendEvent({ jobId: job.id, eventType: "provider_status_polled", fromState: "submitted", toState: "submitted", actorId: params.actorId, correlationId: job.requestId, detail: { providerJobId: job.providerJobId, status: rawStatus } });
      return (await getGovernedPolloJob(job.id))!;
    } catch (error) {
      await recordBodyCinemaProviderFailure({ providerKey: "topaz_video", code: topazFailureToCircuitCode(error), detail: safeErrorMessage(error), source: "governed_topaz_precision_poll", metadata: { governedJobId: job.id, requestId: job.requestId } }).catch(() => undefined);
      throw error;
    }
  }

  if (isReplicateWanVideoEditJob(job) || isReplicateWanAnimateJob(job) || isReplicateOmniHumanJob(job)) {
    const token = String(process.env.REPLICATE_API_TOKEN || "").trim();
    if (!token) throw new Error("REPLICATE_API_TOKEN is not configured; provider status cannot be read.");
    const response = await fetch(`https://api.replicate.com/v1/predictions/${encodeURIComponent(job.providerJobId)}`, {
      method: "GET",
      headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
    });
    const providerResponse = await parseProviderJson(response);
    if (!response.ok) throw new Error(`Replicate prediction status returned ${response.status}: ${safeErrorMessage(providerResponse.detail ?? providerResponse.error ?? providerResponse.responseText ?? "unknown error")}`);
    const rawStatus = String(providerResponse.status || "processing").toLowerCase();
    const providerOutput = Array.isArray(providerResponse.output) ? providerResponse.output[providerResponse.output.length - 1] : providerResponse.output;
    const outputUrl = typeof providerOutput === "string" ? providerOutput.trim() : "";
    if (["succeeded", "success", "completed"].includes(rawStatus)) {
      if (!/^https:\/\//i.test(outputUrl)) throw new Error("Replicate completed the prediction without a readable HTTPS video URL.");
      return recordGovernedPolloProviderCompletion({ jobId: job.id, providerJobId: job.providerJobId, outputUrl, providerResponse });
    }
    if (["failed", "canceled", "cancelled"].includes(rawStatus)) {
      return failGovernedPolloJob({ jobId: job.id, actorId: params.actorId, code: "replicate_prediction_failed", error: new Error(String(providerResponse.error ?? `Replicate prediction ${rawStatus}`)), releaseBudget: true });
    }
    await rawExec(
      "UPDATE governed_media_jobs SET provider_response_json = ?, updated_at = NOW() WHERE id = ? AND state = 'submitted'",
      [safeJson(providerResponse), job.id],
    );
    await appendEvent({ jobId: job.id, eventType: "provider_status_polled", fromState: "submitted", toState: "submitted", actorId: params.actorId, correlationId: job.requestId, detail: { providerJobId: job.providerJobId, status: rawStatus } });
    return (await getGovernedPolloJob(job.id))!;
  }

  const apiKey = String(process.env.POLLO_API_KEY || "").trim();
  if (!apiKey) throw new Error("POLLO_API_KEY is not configured; provider status cannot be read.");
  const response = await fetch(`https://pollo.ai/api/platform/generation/${encodeURIComponent(job.providerJobId)}/status`, {
    method: "GET",
    headers: { "x-api-key": apiKey, Accept: "application/json" },
  });
  const providerResponse = await parseProviderJson(response);
  if (!response.ok) {
    throw new Error(`Pollo task status returned ${response.status}: ${safeErrorMessage(providerResponse.responseText ?? providerResponse.message ?? "unknown error")}`);
  }

  const generations = providerResponse.data && typeof providerResponse.data === "object"
    ? (providerResponse.data as Record<string, unknown>).generations
    : providerResponse.generations;
  const generation = Array.isArray(generations) && generations[0] && typeof generations[0] === "object"
    ? generations[0] as Record<string, unknown>
    : null;
  const rawStatus = String(generation?.status ?? (providerResponse.data as Record<string, unknown> | undefined)?.status ?? providerResponse.status ?? "processing").toLowerCase();
  const outputUrl = typeof generation?.url === "string" ? generation.url.trim() : "";

  if (["succeed", "succeeded", "completed"].includes(rawStatus)) {
    if (!outputUrl) throw new Error("Pollo reported completion without a usable output URL.");
    return recordGovernedPolloProviderCompletion({
      jobId: job.id,
      providerJobId: job.providerJobId,
      outputUrl,
      providerResponse,
    });
  }
  if (["failed", "fail", "error", "cancelled", "canceled"].includes(rawStatus)) {
    return failGovernedPolloJob({
      jobId: job.id,
      actorId: params.actorId,
      code: "provider_task_failed",
      error: new Error(String(generation?.failMsg ?? generation?.error ?? providerResponse.message ?? "Pollo provider task failed.")),
    });
  }

  await rawExec(
    "UPDATE governed_media_jobs SET provider_response_json = ?, updated_at = NOW() WHERE id = ? AND state = 'submitted'",
    [safeJson(providerResponse), job.id],
  );
  await appendEvent({
    jobId: job.id,
    eventType: "provider_status_polled",
    fromState: "submitted",
    toState: "submitted",
    actorId: params.actorId,
    correlationId: job.requestId,
    detail: { providerJobId: job.providerJobId, status: rawStatus },
  });
  return (await getGovernedPolloJob(job.id))!;
}

export async function recordGovernedPolloProviderCompletion(params: { jobId: number; providerJobId: string; outputUrl: string; providerResponse?: Record<string, unknown> }): Promise<GovernedPolloJob> {
  await ensureGovernedPolloSchema();
  const job = await getGovernedPolloJob(params.jobId);
  if (!job) throw new Error("Governed media job was not found.");
  if (job.providerJobId !== params.providerJobId) throw new Error("Provider completion does not match the governed job’s recorded provider task.");
  if (job.state !== "submitted") throw new Error(`Job in state ${job.state} cannot accept provider completion.`);
  const outputUrl = requireNonEmpty(params.outputUrl, "Provider output URL");
  const durableHomepageMotion = isHomepageTextToVideoPilot(job)
    ? await persistHomepageTextToVideoOutput(job, outputUrl)
    : null;
  const durableDesignImage = isDesignImagePilot(job)
    ? await persistDesignImageOutput(job, outputUrl)
    : null;
  const apiKey = job.provider === "pollo" ? String(process.env.POLLO_API_KEY || "").trim() : "";
  const balanceAfterCredits = apiKey ? await readPolloAvailableCredits(apiKey) : null;
  const balanceBeforeCredits = Number(job.metadata.providerBalanceBeforeCredits);
  const actualCostCredits = job.provider === "pollo" && Number.isFinite(balanceBeforeCredits) && balanceAfterCredits !== null
    ? Math.max(0, Number((balanceBeforeCredits - balanceAfterCredits).toFixed(4)))
    : null;
  const metadata = {
    ...job.metadata,
    ...(durableHomepageMotion ? { homepageMotionPilotOutput: durableHomepageMotion } : {}),
    ...(durableDesignImage ? { designImagePilotOutput: durableDesignImage } : {}),
    ...(balanceAfterCredits !== null ? { providerBalanceAfterCredits: balanceAfterCredits, providerBalanceReadAtCompletion: new Date().toISOString() } : {}),
  };
  await rawExec(
    `UPDATE governed_media_jobs
     SET state = 'provider_complete', output_url = ?, provider_response_json = ?, metadata_json = ?, actual_cost_credits = ?, updated_at = NOW(), completed_at = NOW()
     WHERE id = ? AND state = 'submitted'`,
    [outputUrl, safeJson(params.providerResponse), safeJson(metadata), actualCostCredits, job.id],
  );
  const completed = (await getGovernedPolloJob(job.id))!;
  await appendEvent({
    jobId: completed.id,
    eventType: "provider_completion_recorded",
    fromState: "submitted",
    toState: "provider_complete",
    correlationId: completed.requestId,
    detail: { providerJobId: params.providerJobId },
  });
  return completed;
}

export async function ingestCompletedGovernedReplicateWanVideoEditOutput(params: { jobId: number; ownerId: number }): Promise<{ outputAssetUrl: string; durationSeconds: number; width: number; height: number; sizeBytes: number }> {
  requireOwner(params.ownerId);
  await ensureGovernedPolloSchema();
  const job = await getGovernedPolloJob(params.jobId);
  if (!job || !isReplicateWanVideoEditJob(job)) throw new Error("A completed governed Replicate Wan job is required for durable output ingestion.");
  if (job.state !== "provider_complete" || !job.providerJobId || !job.outputUrl) throw new Error("CreatorVault will only ingest a completed Replicate provider output.");
  const folder = `body-cinema-governed-${job.providerJobId.replace(/[^a-z0-9_-]/gi, "")}`;
  const fileName = "Body-Cinema-Governed-Proof.mp4";
  const directory = path.join("/root/uploads", "content-vault", folder);
  const localPath = path.join(directory, fileName);
  const outputAssetUrl = `https://creatorvault.live/uploads/content-vault/${folder}/${fileName}`;
  let sizeBytes = 0;
  if (!(await stat(localPath).then(() => true).catch(() => false))) {
    await mkdir(directory, { recursive: true });
    const response = await fetch(job.outputUrl);
    if (!response.ok) throw new Error(`Replicate output download returned ${response.status}.`);
    const contentType = String(response.headers.get("content-type") || "").toLowerCase();
    if (contentType && !contentType.includes("video/")) throw new Error(`Replicate output did not return video data (${contentType}).`);
    const declaredLength = Number(response.headers.get("content-length") || 0);
    if (declaredLength > REPLICATE_WAN_VIDEO_EDIT_MAX_BYTES) throw new Error("Replicate output exceeded the governed Media Vault size limit.");
    const bytes = Buffer.from(await response.arrayBuffer());
    if (bytes.length < 1024 || bytes.length > REPLICATE_WAN_VIDEO_EDIT_MAX_BYTES) throw new Error("Replicate output failed the governed Media Vault size limit.");
    await writeFile(localPath, bytes);
  }
  try {
    const { stdout } = await execFileAsync("ffprobe", ["-v", "error", "-show_entries", "format=duration:stream=codec_type,width,height", "-of", "json", localPath]);
    const inspected = parseJson(stdout) as Record<string, any>;
    const video = Array.isArray(inspected.streams) ? inspected.streams.find((stream: any) => String(stream?.codec_type) === "video") : null;
    const durationSeconds = Number(inspected?.format?.duration);
    const width = Number(video?.width);
    const height = Number(video?.height);
    sizeBytes = Number((await stat(localPath)).size);
    if (!Number.isFinite(durationSeconds) || durationSeconds <= 0 || !Number.isFinite(width) || width <= 0 || !Number.isFinite(height) || height <= 0 || sizeBytes < 1024) throw new Error("Replicate output was not a readable video with duration and dimensions.");
    const existing = await rawQuery("SELECT id FROM media_assets WHERE user_id = ? AND public_url = ? LIMIT 1", [job.creatorId, outputAssetUrl]);
    if (!existing[0]) {
      await rawExec(
        `INSERT INTO media_assets (id, user_id, source_type, asset_type, file_name, original_name, mime_type, file_size, storage_path, public_url, thumbnail_url, duration, width, height, status, created_by_feature)
         VALUES (?, ?, 'generated', 'video', ?, ?, 'video/mp4', ?, ?, ?, ?, ?, ?, ?, 'ready', 'body_cinema_governed_replicate')`,
        [randomUUID(), job.creatorId, fileName, fileName, sizeBytes, outputAssetUrl, outputAssetUrl, outputAssetUrl, Number(durationSeconds.toFixed(3)), width, height],
      );
    }
    const metadata = { ...job.metadata, durableOutputUrl: outputAssetUrl, verifiedProviderVideo: { durationSeconds: Number(durationSeconds.toFixed(3)), width, height, sizeBytes, provider: "replicate" } };
    await rawExec("UPDATE governed_media_jobs SET metadata_json = ?, updated_at = NOW() WHERE id = ? AND state = 'provider_complete'", [safeJson(metadata), job.id]);
    await appendEvent({ jobId: job.id, eventType: "provider_output_durably_ingested", fromState: "provider_complete", toState: "provider_complete", actorId: params.ownerId, correlationId: job.requestId, detail: { outputAssetUrl, durationSeconds: Number(durationSeconds.toFixed(3)), width, height, sizeBytes } });
    return { outputAssetUrl, durationSeconds: Number(durationSeconds.toFixed(3)), width, height, sizeBytes };
  } catch (error) {
    throw new Error(`Completed Replicate output could not enter Media Vault: ${safeErrorMessage(error)}`);
  }
}

export async function recordGovernedRunwayAlephVideoEditFailure(params: { jobId: number; ownerId: number; reason: string }): Promise<GovernedPolloJob> {
  requireOwner(params.ownerId);
  const job = await getGovernedPolloJob(params.jobId);
  if (!job || !isRunwayAlephVideoEditJob(job)) throw new Error("A submitted governed Runway Aleph benchmark is required to record this provider failure.");
  if (job.state !== "submitted") throw new Error(`Runway Aleph benchmark in state ${job.state} cannot record a provider failure.`);
  const failed = await failGovernedPolloJob({
    jobId: job.id,
    actorId: params.ownerId,
    code: "runway_plan_gated",
    error: new Error(params.reason),
    releaseBudget: true,
  });
  await recordBodyCinemaProviderFailure({
    providerKey: "runway_aleph",
    code: "runway_plan_gated",
    detail: params.reason,
    source: "governed_runway_plan_gate_reconciliation",
    metadata: { governedJobId: job.id, requestId: job.requestId, reservationReleased: true },
  }).catch(() => undefined);
  return failed;
}

export async function reclassifyGovernedRunwayAlephWorkspaceLimit(params: {
  jobId: number;
  ownerId: number;
  reason: string;
}): Promise<GovernedPolloJob> {
  requireOwner(params.ownerId);
  const job = await getGovernedPolloJob(params.jobId);
  if (!job || !isRunwayAlephVideoEditJob(job)) throw new Error("A governed Runway Aleph benchmark is required for workspace-limit correction.");
  if (job.state !== "failed" || job.providerJobId || job.outputUrl) {
    throw new Error("Only a failed pre-task Runway benchmark with no provider task or output can be reclassified.");
  }
  if (!/workspace limit|workspace.*capacity|generation.*limit|usage limit|quota exceeded/i.test(params.reason)) {
    throw new Error("Workspace-limit correction requires the exact provider capacity failure reason.");
  }
  await rawExec(
    `UPDATE governed_media_jobs
     SET failure_code = 'runway_workspace_limit', failure_message = ?, updated_at = CURRENT_TIMESTAMP
     WHERE id = ?`,
    [params.reason, job.id],
  );
  await recordBodyCinemaProviderFailure({
    providerKey: "runway_aleph",
    code: "workspace_limit",
    detail: params.reason,
    source: "governed_runway_workspace_limit_correction",
    metadata: { governedJobId: job.id, requestId: job.requestId, reservationReleased: true },
  }).catch(() => undefined);
  const corrected = await getGovernedPolloJob(job.id);
  if (!corrected) throw new Error("Runway workspace-limit correction could not be read after persistence.");
  return corrected;
}

export async function reconcileGovernedRunwayAlephSubmissionTimeout(params: {
  jobId: number;
  ownerId: number;
  reason: string;
  failureCode?: "runway_submission_timeout_no_task" | "runway_workspace_limit";
}): Promise<GovernedPolloJob> {
  requireOwner(params.ownerId);
  const job = await getGovernedPolloJob(params.jobId);
  if (!job || !isRunwayAlephVideoEditJob(job)) {
    throw new Error("A leased governed Runway Aleph benchmark is required to reconcile this timeout.");
  }
  if (job.state !== "queued" && job.state !== "submission_unknown") {
    throw new Error(`Runway Aleph benchmark in state ${job.state} cannot reconcile a pre-task submission timeout.`);
  }
  if (job.providerJobId || job.outputUrl) {
    throw new Error("A Runway provider task or output is already recorded; use the completed-provider path instead.");
  }
  const failureCode = params.failureCode || "runway_submission_timeout_no_task";
  const resilienceCode = failureCode === "runway_workspace_limit" ? "workspace_limit" : "submission_timeout_no_task";
  const failed = await failGovernedPolloJob({
    jobId: job.id,
    actorId: params.ownerId,
    code: failureCode,
    error: new Error(params.reason),
    releaseBudget: true,
  });
  await recordBodyCinemaProviderFailure({
    providerKey: "runway_aleph",
    code: resilienceCode,
    detail: params.reason,
    source: failureCode === "runway_workspace_limit"
      ? "governed_runway_workspace_limit_reconciliation"
      : "governed_runway_pre_task_timeout_reconciliation",
    metadata: { governedJobId: job.id, requestId: job.requestId, reservationReleased: true },
  }).catch(() => undefined);
  return failed;
}

export async function ingestCompletedGovernedRunwayAlephVideoEditOutput(params: { jobId: number; ownerId: number }): Promise<{ outputAssetUrl: string; durationSeconds: number; width: number; height: number; sizeBytes: number; outputFingerprint: string }> {
  requireOwner(params.ownerId);
  await ensureGovernedPolloSchema();
  const job = await getGovernedPolloJob(params.jobId);
  if (!job || !isRunwayAlephVideoEditJob(job)) throw new Error("A completed governed Runway Aleph benchmark is required for Media Vault ingestion.");
  if (job.state !== "provider_complete" || !job.providerJobId || !job.outputUrl) throw new Error("CreatorVault will only ingest a completed Runway provider output.");
  const folder = `body-cinema-runway-aleph-${job.id}`;
  const fileName = "Body-Cinema-Runway-Aleph-Benchmark.mp4";
  const directory = path.join("/root/uploads", "content-vault", folder);
  const localPath = path.join(directory, fileName);
  const outputAssetUrl = `https://creatorvault.live/uploads/content-vault/${folder}/${fileName}`;
  if (!(await stat(localPath).then(() => true).catch(() => false))) {
    await mkdir(directory, { recursive: true });
    const response = await fetch(job.outputUrl, { redirect: "follow" });
    if (!response.ok) throw new Error(`Runway output download returned ${response.status}.`);
    const contentType = String(response.headers.get("content-type") || "").toLowerCase();
    if (contentType && !contentType.includes("video/")) throw new Error(`Runway output did not return video data (${contentType}).`);
    const declaredLength = Number(response.headers.get("content-length") || 0);
    if (declaredLength > RUNWAY_ALEPH_2_VIDEO_EDIT_MAX_BYTES) throw new Error("Runway output exceeded the governed Media Vault size limit.");
    const bytes = Buffer.from(await response.arrayBuffer());
    if (bytes.length < 1024 || bytes.length > RUNWAY_ALEPH_2_VIDEO_EDIT_MAX_BYTES) throw new Error("Runway output failed the governed Media Vault size limit.");
    await writeFile(localPath, bytes);
  }
  try {
    const { stdout } = await execFileAsync("ffprobe", ["-v", "error", "-show_entries", "format=duration:stream=codec_type,width,height", "-of", "json", localPath]);
    const inspected = parseJson(stdout) as Record<string, any>;
    const video = Array.isArray(inspected.streams) ? inspected.streams.find((stream: any) => String(stream?.codec_type) === "video") : null;
    const durationSeconds = Number(inspected?.format?.duration);
    const width = Number(video?.width);
    const height = Number(video?.height);
    const sizeBytes = Number((await stat(localPath)).size);
    const outputFingerprint = createHash("sha256").update(await readFile(localPath)).digest("hex");
    if (!Number.isFinite(durationSeconds) || durationSeconds <= 0 || !Number.isFinite(width) || width <= 0 || !Number.isFinite(height) || height <= 0 || sizeBytes < 1024) throw new Error("Runway output was not a readable video with duration and dimensions.");
    const existing = await rawQuery("SELECT id FROM media_assets WHERE user_id = ? AND public_url = ? LIMIT 1", [job.creatorId, outputAssetUrl]);
    if (!existing[0]) {
      await rawExec(
        `INSERT INTO media_assets (id, user_id, source_type, asset_type, file_name, original_name, mime_type, file_size, storage_path, public_url, thumbnail_url, duration, width, height, status, created_by_feature)
         VALUES (?, ?, 'generated', 'video', ?, ?, 'video/mp4', ?, ?, ?, ?, ?, ?, ?, 'ready', 'body_cinema_governed_runway_aleph')`,
        [randomUUID(), job.creatorId, fileName, fileName, sizeBytes, localPath, outputAssetUrl, outputAssetUrl, Number(durationSeconds.toFixed(3)), width, height],
      );
    }
    const metadata = {
      ...job.metadata,
      durableOutputUrl: outputAssetUrl,
      outputFingerprint,
      actualCostState: "Runway account balance is not exposed by the connected edit contract; recorded estimate is the hard cap and actual charge remains unreconciled.",
      verifiedProviderVideo: { durationSeconds: Number(durationSeconds.toFixed(3)), width, height, sizeBytes, provider: "runway" },
    };
    await rawExec("UPDATE governed_media_jobs SET metadata_json = ?, updated_at = NOW() WHERE id = ? AND state = 'provider_complete'", [safeJson(metadata), job.id]);
    await appendEvent({ jobId: job.id, eventType: "provider_output_durably_ingested", fromState: "provider_complete", toState: "provider_complete", actorId: params.ownerId, correlationId: job.requestId, detail: { outputAssetUrl, durationSeconds: Number(durationSeconds.toFixed(3)), width, height, sizeBytes, outputFingerprint } });
    return { outputAssetUrl, durationSeconds: Number(durationSeconds.toFixed(3)), width, height, sizeBytes, outputFingerprint };
  } catch (error) {
    throw new Error(`Completed Runway output could not enter Media Vault: ${safeErrorMessage(error)}`);
  }
}

export async function reviewCompletedGovernedRunwayAlephVideoEditOutput(params: { jobId: number; ownerId: number }): Promise<{ reviewedJob: GovernedPolloJob; outputReview: BodyCinemaOutputReview; outputAssetUrl: string }> {
  requireOwner(params.ownerId);
  const ingested = await ingestCompletedGovernedRunwayAlephVideoEditOutput({ jobId: params.jobId, ownerId: params.ownerId });
  const job = await getGovernedPolloJob(params.jobId);
  if (!job || !isRunwayAlephVideoEditJob(job)) throw new Error("A completed governed Runway Aleph benchmark is required for output review.");
  const evidenceId = typeof job.metadata.bodyCinemaEvidenceId === "string" ? job.metadata.bodyCinemaEvidenceId : "";
  if (!evidenceId) throw new Error("The governed Runway benchmark has no Body Cinema source evidence reference.");
  const localPath = path.join("/root/uploads", "content-vault", `body-cinema-runway-aleph-${job.id}`, "Body-Cinema-Runway-Aleph-Benchmark.mp4");
  const video = await probeVideo(localPath);
  const frameEvidence = await buildFrameEvidence(localPath, video);
  const outputReview = await reviewBodyCinemaOutput(job.creatorId, {
    evidenceId,
    outputAssetUrl: ingested.outputAssetUrl,
    outputFingerprint: ingested.outputFingerprint,
    frameEvidence,
  });
  const reviewedJob = await reviewGovernedPolloOutput({
    jobId: job.id,
    reviewerId: params.ownerId,
    accepted: outputReview.status === "accepted",
    artifactUrl: outputReview.status === "accepted" ? ingested.outputAssetUrl : null,
    qualityScore: outputReview.overallScore,
    reason: outputReview.reasons.join(" "),
  });
  return { reviewedJob, outputReview, outputAssetUrl: ingested.outputAssetUrl };
}

export async function ingestCompletedGovernedTopazPrecisionVideoOutput(params: { jobId: number; ownerId: number }): Promise<{ outputAssetUrl: string; durationSeconds: number; width: number; height: number; sizeBytes: number; outputFingerprint: string }> {
  requireOwner(params.ownerId);
  const job = await getGovernedPolloJob(params.jobId);
  if (!job || !isTopazPrecisionVideoJob(job)) throw new Error("A completed governed Topaz precision request is required for Media Vault ingestion.");
  if (job.state !== "provider_complete" || !job.providerJobId || !job.outputUrl) throw new Error("CreatorVault will only ingest a completed Topaz provider output.");
  const folder = `body-cinema-topaz-precision-${job.id}`;
  const fileName = "Body-Cinema-Topaz-Precision-Finish.mp4";
  const directory = path.join("/root/uploads", "content-vault", folder);
  const localPath = path.join(directory, fileName);
  const outputAssetUrl = `https://creatorvault.live/uploads/content-vault/${folder}/${fileName}`;
  if (!(await stat(localPath).then(() => true).catch(() => false))) {
    await mkdir(directory, { recursive: true });
    const response = await fetch(job.outputUrl, { redirect: "follow" });
    if (!response.ok) throw new Error(`Topaz output download returned ${response.status}.`);
    const contentType = String(response.headers.get("content-type") || "").toLowerCase();
    if (contentType && !contentType.includes("video/")) throw new Error(`Topaz output did not return video data (${contentType}).`);
    const declaredLength = Number(response.headers.get("content-length") || 0);
    if (declaredLength > 500 * 1024 * 1024) throw new Error("Topaz output exceeded the governed Media Vault size limit.");
    const bytes = Buffer.from(await response.arrayBuffer());
    if (bytes.length < 1024 || bytes.length > 500 * 1024 * 1024) throw new Error("Topaz output failed the governed Media Vault size limit.");
    await writeFile(localPath, bytes);
  }
  const video = await probeVideo(localPath);
  const sizeBytes = Number((await stat(localPath)).size);
  const outputFingerprint = createHash("sha256").update(await readFile(localPath)).digest("hex");
  if (sizeBytes < 1024) throw new Error("Topaz output was not a readable governed video.");
  const existing = await rawQuery("SELECT id FROM media_assets WHERE user_id = ? AND public_url = ? LIMIT 1", [job.creatorId, outputAssetUrl]);
  if (!existing[0]) {
    await rawExec(
      `INSERT INTO media_assets (id, user_id, source_type, asset_type, file_name, original_name, mime_type, file_size, storage_path, public_url, thumbnail_url, duration, width, height, status, created_by_feature)
       VALUES (?, ?, 'generated', 'video', ?, ?, 'video/mp4', ?, ?, ?, ?, ?, ?, ?, 'ready', 'body_cinema_governed_topaz_precision')`,
      [randomUUID(), job.creatorId, fileName, fileName, sizeBytes, localPath, outputAssetUrl, outputAssetUrl, Number(video.durationSeconds.toFixed(3)), video.width, video.height],
    );
  }
  const metadata = {
    ...job.metadata,
    durableOutputUrl: outputAssetUrl,
    outputFingerprint,
    actualCostState: "Topaz charges are provider-account controlled; CreatorVault keeps the recorded hard cap until a documented actual-cost reconciliation is available.",
    verifiedProviderVideo: { durationSeconds: Number(video.durationSeconds.toFixed(3)), width: video.width, height: video.height, sizeBytes, provider: "topaz" },
  };
  await rawExec("UPDATE governed_media_jobs SET metadata_json = ?, updated_at = NOW() WHERE id = ? AND state = 'provider_complete'", [safeJson(metadata), job.id]);
  await appendEvent({ jobId: job.id, eventType: "provider_output_durably_ingested", fromState: "provider_complete", toState: "provider_complete", actorId: params.ownerId, correlationId: job.requestId, detail: { outputAssetUrl, durationSeconds: Number(video.durationSeconds.toFixed(3)), width: video.width, height: video.height, sizeBytes, outputFingerprint } });
  return { outputAssetUrl, durationSeconds: Number(video.durationSeconds.toFixed(3)), width: video.width, height: video.height, sizeBytes, outputFingerprint };
}

export async function reviewCompletedGovernedTopazPrecisionVideoOutput(params: { jobId: number; ownerId: number }): Promise<{ reviewedJob: GovernedPolloJob; outputReview: BodyCinemaOutputReview; outputAssetUrl: string }> {
  requireOwner(params.ownerId);
  const ingested = await ingestCompletedGovernedTopazPrecisionVideoOutput(params);
  const job = await getGovernedPolloJob(params.jobId);
  if (!job || !isTopazPrecisionVideoJob(job)) throw new Error("A completed governed Topaz precision request is required for output review.");
  const evidenceId = typeof job.metadata.bodyCinemaEvidenceId === "string" ? job.metadata.bodyCinemaEvidenceId : "";
  if (!evidenceId) throw new Error("The governed Topaz precision request has no Body Cinema source evidence reference.");
  const localPath = path.join("/root/uploads", "content-vault", `body-cinema-topaz-precision-${job.id}`, "Body-Cinema-Topaz-Precision-Finish.mp4");
  const video = await probeVideo(localPath);
  const frameEvidence = await buildFrameEvidence(localPath, video);
  const outputReview = await reviewBodyCinemaOutput(job.creatorId, {
    evidenceId,
    outputAssetUrl: ingested.outputAssetUrl,
    outputFingerprint: ingested.outputFingerprint,
    frameEvidence,
    reviewClass: "technical_source_preservation",
  });
  const passedRegressionFloor = outputReview.status === "accepted" && outputReview.overallScore >= 94;
  const reviewReason = passedRegressionFloor
    ? outputReview.reasons.join(" ")
    : `${outputReview.reasons.join(" ")} Rejected: Topaz precision output did not clear the locked 94/100 Body Cinema preservation baseline.`;
  const reviewedJob = await reviewGovernedPolloOutput({
    jobId: job.id,
    reviewerId: params.ownerId,
    accepted: passedRegressionFloor,
    artifactUrl: passedRegressionFloor ? ingested.outputAssetUrl : null,
    qualityScore: outputReview.overallScore,
    reason: reviewReason,
  });
  return { reviewedJob, outputReview, outputAssetUrl: ingested.outputAssetUrl };
}

export async function reviewGovernedPolloOutput(params: { jobId: number; reviewerId: number; accepted: boolean; artifactUrl?: string | null; qualityScore?: number | null; reason: string }): Promise<GovernedPolloJob> {
  requireOwner(params.reviewerId);
  await ensureGovernedPolloSchema();
  const job = await getGovernedPolloJob(params.jobId);
  if (!job) throw new Error("Governed media job was not found.");
  if (job.state !== "provider_complete" && job.state !== "quality_review") throw new Error(`Job in state ${job.state} cannot be quality-reviewed.`);
  if (params.accepted && !String(params.artifactUrl || "").trim()) throw new Error("An accepted output requires a durable CreatorVault artifact URL.");
  const nextState: GovernedPolloJobState = params.accepted ? "accepted" : "rejected";
  const artifactUrl = params.accepted ? String(params.artifactUrl) : null;
  const acceptedCampaignVisualAssetId = artifactUrl ? await ingestAcceptedCampaignVisual(job, artifactUrl) : null;
  const reviewedMetadata = {
    ...job.metadata,
    ...(acceptedCampaignVisualAssetId ? { acceptedCampaignVisualAssetId } : {}),
  };
  await rawExec(
    `UPDATE governed_media_jobs
     SET state = ?, artifact_url = ?, quality_state = ?, quality_score = ?, quality_reason = ?, metadata_json = ?, lease_owner = NULL, lease_expires_at = NULL,
         updated_at = NOW(), completed_at = NOW()
     WHERE id = ? AND state IN ('provider_complete', 'quality_review')`,
    [nextState, artifactUrl, params.accepted ? "accepted" : "rejected", params.qualityScore ?? null, params.reason.slice(0, 3000), safeJson(reviewedMetadata), job.id],
  );
  const reviewed = (await getGovernedPolloJob(job.id))!;
  await appendEvent({
    jobId: reviewed.id,
    eventType: "quality_review_completed",
    fromState: job.state,
    toState: nextState,
    actorId: params.reviewerId,
    correlationId: reviewed.requestId,
    detail: { accepted: params.accepted, qualityScore: params.qualityScore ?? null, reason: params.reason, acceptedCampaignVisualAssetId },
  });
  if (!params.accepted) await releaseGovernedPolloBudget({ jobId: reviewed.id, actorId: params.reviewerId, reason: "quality_rejected" });
  return reviewed;
}

export async function cancelGovernedPolloJob(params: { jobId: number; actorId: number; reason: string }): Promise<GovernedPolloJob> {
  await ensureGovernedPolloSchema();
  const job = await getGovernedPolloJob(params.jobId);
  if (!job) throw new Error("Governed media job was not found.");
  if (job.creatorId !== params.actorId && !OWNER_IDS.has(Number(params.actorId))) throw new Error("Only the creator or an owner may cancel this governed media job.");
  if (job.state === "submitted" && (isReplicateWanVideoEditJob(job) || isReplicateWanAnimateJob(job) || isReplicateOmniHumanJob(job))) {
    const token = String(process.env.REPLICATE_API_TOKEN || "").trim();
    if (!token) throw new Error("Replicate cancellation cannot run because REPLICATE_API_TOKEN is not configured.");
    if (!job.providerJobId) throw new Error("Replicate cancellation cannot run because the provider prediction ID is missing.");
    const response = await fetch(`https://api.replicate.com/v1/predictions/${encodeURIComponent(job.providerJobId)}/cancel`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
    });
    const providerResponse = await parseProviderJson(response);
    if (!response.ok) {
      throw new Error(`Replicate cancellation returned ${response.status}: ${safeErrorMessage(providerResponse.detail ?? providerResponse.error ?? providerResponse.responseText ?? "unknown error")}`);
    }
    const cancelledMessage = `Provider-side Replicate cancellation confirmed: ${params.reason.slice(0, 1000)}`;
    await rawExec(
      `UPDATE governed_media_jobs
       SET state = 'cancelled', failure_code = 'replicate_provider_cancelled', failure_message = ?, provider_response_json = ?, lease_owner = NULL, lease_expires_at = NULL, updated_at = NOW(), completed_at = NOW()
       WHERE id = ? AND state = 'submitted'`,
      [cancelledMessage, safeJson(providerResponse), job.id],
    );
    const cancelled = (await getGovernedPolloJob(job.id))!;
    await appendEvent({
      jobId: cancelled.id,
      eventType: "provider_cancellation_confirmed",
      fromState: "submitted",
      toState: "cancelled",
      actorId: params.actorId,
      correlationId: cancelled.requestId,
      detail: { reason: params.reason, providerJobId: job.providerJobId, providerResponse },
    });
    await releaseGovernedPolloBudget({ jobId: cancelled.id, actorId: params.actorId, reason: "replicate_provider_cancelled" });
    return cancelled;
  }
  if (["submitted", "submission_unknown", "provider_complete", "quality_review", "accepted"].includes(job.state)) {
    throw new Error("This job cannot be cancelled because a provider request may already exist or an output is accepted.");
  }
  if (TERMINAL_STATES.includes(job.state)) return job;
  await rawExec(
    `UPDATE governed_media_jobs
     SET state = 'cancelled', failure_code = 'cancelled', failure_message = ?, lease_owner = NULL, lease_expires_at = NULL, updated_at = NOW(), completed_at = NOW()
     WHERE id = ? AND state NOT IN ('submitted', 'submission_unknown', 'provider_complete', 'quality_review', 'accepted', 'rejected', 'failed', 'cancelled')`,
    [params.reason.slice(0, 1200), job.id],
  );
  const cancelled = (await getGovernedPolloJob(job.id))!;
  await appendEvent({
    jobId: cancelled.id,
    eventType: "job_cancelled",
    fromState: job.state,
    toState: "cancelled",
    actorId: params.actorId,
    correlationId: cancelled.requestId,
    detail: { reason: params.reason },
  });
  await releaseGovernedPolloBudget({ jobId: cancelled.id, actorId: params.actorId, reason: "cancelled" });
  return cancelled;
}

export async function listGovernedPolloJobs(params: { creatorId?: number; limit?: number }): Promise<GovernedPolloJob[]> {
  await ensureGovernedPolloSchema();
  const limit = Math.max(1, Math.min(200, Number(params.limit ?? 50)));
  const rows = params.creatorId === undefined
    ? await rawQuery("SELECT * FROM governed_media_jobs ORDER BY id DESC LIMIT ?", [limit])
    : await rawQuery("SELECT * FROM governed_media_jobs WHERE creator_id = ? ORDER BY id DESC LIMIT ?", [params.creatorId, limit]);
  return rows.map(normaliseJob);
}

export async function listGovernedPolloEvents(jobId: number): Promise<GovernedPolloEvent[]> {
  await ensureGovernedPolloSchema();
  const rows = await rawQuery("SELECT * FROM governed_media_events WHERE job_id = ? ORDER BY id ASC", [jobId]);
  return rows.map((row: any) => ({
    id: Number(row.id),
    jobId: Number(row.job_id),
    eventType: String(row.event_type),
    fromState: row.from_state ? String(row.from_state) : null,
    toState: row.to_state ? String(row.to_state) : null,
    actorId: row.actor_id === null || row.actor_id === undefined ? null : Number(row.actor_id),
    correlationId: row.correlation_id ? String(row.correlation_id) : null,
    detail: parseJson(row.detail_json),
    createdAt: String(row.created_at),
  }));
}

export async function getGovernedPolloDashboard(): Promise<{
  config: GovernedPolloConfig;
  executionPermitted: boolean;
  globalReservedToday: number;
  jobsByState: Record<string, number>;
  activeLeases: number;
  unreconciledJobs: number;
}> {
  await ensureGovernedPolloSchema();
  const [globalReservedToday, stateRows, activeRows, unreconciledRows] = await Promise.all([
    getReservedCredits("global_daily"),
    rawQuery("SELECT state, COUNT(*) AS count FROM governed_media_jobs GROUP BY state"),
    rawQuery("SELECT COUNT(*) AS count FROM governed_media_jobs WHERE state IN ('queued', 'submitted', 'submission_unknown', 'provider_complete', 'quality_review')"),
    rawQuery("SELECT COUNT(*) AS count FROM governed_media_jobs WHERE state IN ('submitted', 'submission_unknown', 'provider_complete', 'quality_review', 'accepted') AND actual_cost_credits IS NULL"),
  ]);
  const jobsByState: Record<string, number> = {};
  for (const row of stateRows) jobsByState[String(row.state)] = Number(row.count);
  return {
    config: getGovernedPolloConfig(),
    executionPermitted: isGovernedPolloExecutionEnabled(),
    globalReservedToday,
    jobsByState,
    activeLeases: Number(activeRows[0]?.count ?? 0),
    unreconciledJobs: Number(unreconciledRows[0]?.count ?? 0),
  };
}

export function assertGovernedPolloJobReadyForMonetization(job: GovernedPolloJob): void {
  if (job.state !== "accepted" || !job.artifactUrl) {
    throw new Error("A governed media job must be quality-accepted with a durable artifact before checkout or publication is allowed.");
  }
}

export function isTerminalGovernedPolloState(state: string): boolean {
  return TERMINAL_STATES.includes(state as GovernedPolloJobState);
}

export const governedPolloModelPath = DEFAULT_MODEL_PATH;
