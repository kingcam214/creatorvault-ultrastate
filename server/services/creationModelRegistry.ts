import { randomUUID } from "crypto";
import { sql } from "drizzle-orm";
import { db } from "../db";

export type CreationExecutionLane = "hosted" | "controlled" | "assembly";
export type CommercialEligibility = "verified" | "conditional" | "unverified" | "ineligible";
export type ModelActivationState = "planned" | "configured" | "benchmarking" | "active" | "deprecated" | "blocked";
export type ModelBenchmarkState = "unbenchmarked" | "conditional" | "accepted" | "rejected";
export type CreatorVaultInputMode = "text" | "reference_image" | "reference_video" | "source_video" | "audio" | "accepted_shot";
export type CreatorVaultOutputMode = "image" | "video" | "assembled_master" | "social_variant" | "analysis";

export type ModelBenchmarkCriteria = {
  facePreservation?: number;
  identityPreservation?: number;
  bodyNaturalness?: number;
  anatomy?: number;
  skinTexture?: number;
  hands?: number;
  legs?: number;
  hipsWaistContinuity?: number;
  clothingPreservation?: number;
  propPreservation?: number;
  backgroundStability?: number;
  sourceFidelity?: number;
  motionRealism?: number;
  motionEnergy?: number;
  cameraMotion?: number;
  physics?: number;
  temporalConsistency?: number;
  lighting?: number;
  promptAdherence?: number;
  verticalComposition?: number;
  socialEnergy?: number;
  cinematicQuality?: number;
  editability?: number;
  artifactRate?: number;
};

export type CreationModelRegistryEntry = {
  modelKey: string;
  provider: string;
  model: string;
  modelVersion: string;
  executionLane: CreationExecutionLane;
  commercialEligibility: CommercialEligibility;
  licenseName: string;
  licenseReference: string | null;
  activationState: ModelActivationState;
  inputModes: CreatorVaultInputMode[];
  outputModes: CreatorVaultOutputMode[];
  maxUsefulDurationSeconds: number;
  supportedResolutions: string[];
  supportsReferenceImage: boolean;
  supportsReferenceVideo: boolean;
  supportsIdentityPreservation: boolean;
  supportsCameraControl: boolean;
  supportsPoseControl: boolean;
  supportsAudio: boolean;
  knownWeaknesses: string[];
  verifiedUseCases: string[];
  benchmarkEvidenceVersion: string | null;
  benchmarkState: ModelBenchmarkState;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
};

export type CreationModelBenchmark = {
  id: string;
  modelKey: string;
  sourceEvidenceId: string;
  benchmarkVersion: string;
  inputSignature: string;
  criteria: ModelBenchmarkCriteria;
  overallScore: number;
  qualityState: "accepted" | "rejected" | "conditional";
  evidenceReference: string;
  notes: string | null;
  reviewedBy: number;
  evidenceState: "valid" | "invalidated";
  invalidationReason: string | null;
  invalidatedBy: number | null;
  invalidatedAt: string | null;
  createdAt: string;
};

export type ModelEvidenceSummary = {
  benchmarkCount: number;
  acceptedBenchmarkCount: number;
  rejectedBenchmarkCount: number;
  bestAcceptedScore: number | null;
  averageAcceptedScore: number | null;
  criteria: ModelBenchmarkCriteria;
};

export type RoutableCreationModel = CreationModelRegistryEntry & {
  evidence: ModelEvidenceSummary;
};

export type CreationCapabilityRequirements = {
  requiresGeneratedShot: boolean;
  requiredInputModes: CreatorVaultInputMode[];
  requiredOutputMode: CreatorVaultOutputMode;
  durationSeconds: number;
  resolution: string;
  requiresReferenceImage?: boolean;
  requiresReferenceVideo?: boolean;
  requiresIdentityPreservation?: boolean;
  requiresNaturalBody?: boolean;
  requiresPropPreservation?: boolean;
  requiresCameraControl?: boolean;
  requiresAudio?: boolean;
  minimumQualityScore?: number;
};

export type ModelSelectionDecision = {
  selected: RoutableCreationModel | null;
  selectionScore: number | null;
  rejected: Array<{ modelKey: string; reasons: string[] }>;
};

const METRIC_KEYS: Array<keyof ModelBenchmarkCriteria> = [
  "facePreservation",
  "identityPreservation",
  "bodyNaturalness",
  "anatomy",
  "skinTexture",
  "hands",
  "legs",
  "hipsWaistContinuity",
  "clothingPreservation",
  "propPreservation",
  "backgroundStability",
  "sourceFidelity",
  "motionRealism",
  "motionEnergy",
  "cameraMotion",
  "physics",
  "temporalConsistency",
  "lighting",
  "promptAdherence",
  "verticalComposition",
  "socialEnergy",
  "cinematicQuality",
  "editability",
  "artifactRate",
];

const DEFAULT_MODELS: Array<Omit<CreationModelRegistryEntry, "createdAt" | "updatedAt">> = [
  {
    modelKey: "creatorvault/real-render-engine",
    provider: "creatorvault",
    model: "Real Render Engine",
    modelVersion: "current",
    executionLane: "assembly",
    commercialEligibility: "verified",
    licenseName: "CreatorVault-owned implementation",
    licenseReference: null,
    activationState: "active",
    inputModes: ["source_video", "accepted_shot", "audio"],
    outputModes: ["assembled_master", "social_variant", "video"],
    maxUsefulDurationSeconds: 3600,
    supportedResolutions: ["480p", "720p", "1080p", "source-preserving"],
    supportsReferenceImage: false,
    supportsReferenceVideo: false,
    supportsIdentityPreservation: true,
    supportsCameraControl: false,
    supportsPoseControl: false,
    supportsAudio: true,
    knownWeaknesses: ["Does not create new synthetic shots.", "Uses accepted source footage and accepted candidates only."],
    verifiedUseCases: ["Creator-owned footage assembly", "Music-directed editing", "Captioning", "Cinematic finishing", "Trailer assembly"],
    benchmarkEvidenceVersion: "creatorvault-trailer-local-render-proof-2026-08",
    benchmarkState: "accepted",
    metadata: {
      evidenceBoundary: "Accepted as an assembly capability only; it is not evidence that synthetic video generation is quality-approved.",
      canonicalService: "server/services/realRenderEngine.ts",
    },
  },
  {
    modelKey: "pollo/bytedance-seedance-2-5-ref2video",
    provider: "pollo",
    model: "ByteDance Seedance 2.5",
    modelVersion: "source-video-reference",
    executionLane: "hosted",
    commercialEligibility: "conditional",
    licenseName: "Hosted-provider account entitlement",
    licenseReference: null,
    activationState: "benchmarking",
    inputModes: ["text", "reference_video"],
    outputModes: ["video"],
    maxUsefulDurationSeconds: 6,
    supportedResolutions: ["720p"],
    supportsReferenceImage: false,
    supportsReferenceVideo: true,
    supportsIdentityPreservation: true,
    supportsCameraControl: false,
    supportsPoseControl: false,
    supportsAudio: false,
    knownWeaknesses: ["Two intentional CreatorVault candidates were rejected for weak anatomy, stiff movement, and low social energy."],
    verifiedUseCases: [],
    benchmarkEvidenceVersion: "creatorvault-body-cinema-and-trailer-provider-review-2026-08",
    benchmarkState: "rejected",
    metadata: {
      providerPath: "/generation/bytedance/seedance-2-5/ref2video",
      governedOnly: true,
      priorCandidateVerdict: "rejected",
    },
  },
  {
    modelKey: "pollo/kling-v3-omni-ref2video",
    provider: "pollo",
    model: "Kling V3 Omni",
    modelVersion: "source-video-reference",
    executionLane: "hosted",
    commercialEligibility: "conditional",
    licenseName: "Hosted-provider account entitlement",
    licenseReference: null,
    activationState: "configured",
    inputModes: ["text", "reference_video"],
    outputModes: ["video"],
    maxUsefulDurationSeconds: 6,
    supportedResolutions: ["720p"],
    supportsReferenceImage: false,
    supportsReferenceVideo: true,
    supportsIdentityPreservation: true,
    supportsCameraControl: false,
    supportsPoseControl: false,
    supportsAudio: false,
    knownWeaknesses: ["No CreatorVault benchmark evidence exists yet."],
    verifiedUseCases: [],
    benchmarkEvidenceVersion: null,
    benchmarkState: "unbenchmarked",
    metadata: {
      providerPath: "/generation/kling-ai/kling-v3-omni/ref2video",
      governedOnly: true,
    },
  },
  {
    modelKey: "runway/aleph-2-video-edit",
    provider: "runway",
    model: "Aleph 2.0 Video Edit",
    modelVersion: "source-preserving-edit",
    executionLane: "hosted",
    commercialEligibility: "conditional",
    licenseName: "Existing Runway workspace entitlement",
    licenseReference: null,
    activationState: "benchmarking",
    inputModes: ["source_video"],
    outputModes: ["video"],
    maxUsefulDurationSeconds: 30,
    supportedResolutions: ["720p", "1080p"],
    supportsReferenceImage: false,
    supportsReferenceVideo: true,
    supportsIdentityPreservation: true,
    supportsCameraControl: true,
    supportsPoseControl: false,
    supportsAudio: true,
    knownWeaknesses: ["No accepted CreatorVault Body Cinema benchmark exists yet.", "One owner-directed source-preservation benchmark is authorized; failure must be recorded and must not auto-retry.", "Commercial eligibility remains conditional until the workspace terms and accepted CreatorVault evidence are verified."],
    verifiedUseCases: [],
    benchmarkEvidenceVersion: null,
    benchmarkState: "unbenchmarked",
    metadata: {
      governedOnly: true,
      providerContract: "runway_aleph_2_in_context_source_video_edit",
      sourcePreservationRequired: true,
      candidateLimit: 1,
      noAutomaticRetry: true,
    },
  },
  {
    modelKey: "replicate/kingcam-fluxdevcam",
    provider: "replicate",
    model: "KingCam FluxDevCam",
    modelVersion: "trained-clone",
    executionLane: "hosted",
    commercialEligibility: "conditional",
    licenseName: "Creator-controlled trained-model account entitlement",
    licenseReference: null,
    activationState: "configured",
    inputModes: ["text", "reference_image", "reference_video"],
    outputModes: ["image"],
    maxUsefulDurationSeconds: 1,
    supportedResolutions: ["1024px", "9:16", "16:9", "1:1"],
    supportsReferenceImage: true,
    supportsReferenceVideo: false,
    supportsIdentityPreservation: true,
    supportsCameraControl: false,
    supportsPoseControl: false,
    supportsAudio: false,
    knownWeaknesses: ["No accepted CreatorVault identity-image benchmark exists yet.", "May only be called through the owner-bounded governed image benchmark route until watchable review evidence exists."],
    verifiedUseCases: [],
    benchmarkEvidenceVersion: null,
    benchmarkState: "unbenchmarked",
    metadata: {
      canonicalService: "server/services/governedKingcamIdentityService.ts",
      sourceModel: "kingcam214/fluxdevcam",
      governedOnly: true,
      requiresDurableCopyBeforeReview: true,
    },
  },
  {
    modelKey: "wan/wan-2-2-ti2v-5b",
    provider: "wan",
    model: "Wan 2.2 TI2V-5B",
    modelVersion: "5b",
    executionLane: "controlled",
    commercialEligibility: "verified",
    licenseName: "Apache-2.0",
    licenseReference: "https://huggingface.co/Wan-AI/Wan2.2-TI2V-5B",
    activationState: "planned",
    inputModes: ["text", "reference_image"],
    outputModes: ["video"],
    maxUsefulDurationSeconds: 5,
    supportedResolutions: ["720p"],
    supportsReferenceImage: true,
    supportsReferenceVideo: false,
    supportsIdentityPreservation: false,
    supportsCameraControl: false,
    supportsPoseControl: false,
    supportsAudio: false,
    knownWeaknesses: ["No CreatorVault quality benchmark exists.", "The first worker has not been provisioned.", "Source-video conditioning is not a native documented input for this selected first candidate."],
    verifiedUseCases: [],
    benchmarkEvidenceVersion: null,
    benchmarkState: "unbenchmarked",
    metadata: {
      officialModelCard: "https://huggingface.co/Wan-AI/Wan2.2-TI2V-5B",
      documentedMinimumVramGb: 24,
      selectedWorkerVramGb: 48,
      workerState: "not_provisioned",
    },
  },
  {
    modelKey: "lightricks/ltx-video-13b",
    provider: "lightricks",
    model: "LTX-Video 13B",
    modelVersion: "0.9.8",
    executionLane: "controlled",
    commercialEligibility: "conditional",
    licenseName: "LTXV Open Weights License",
    licenseReference: "https://huggingface.co/Lightricks/LTX-Video/blob/main/LTX-Video-Open-Weights-License-0.X.txt",
    activationState: "planned",
    inputModes: ["text", "reference_image", "reference_video"],
    outputModes: ["video"],
    maxUsefulDurationSeconds: 60,
    supportedResolutions: ["480p", "720p"],
    supportsReferenceImage: true,
    supportsReferenceVideo: true,
    supportsIdentityPreservation: false,
    supportsCameraControl: true,
    supportsPoseControl: true,
    supportsAudio: false,
    knownWeaknesses: ["No CreatorVault quality benchmark exists.", "License requires use-restriction flow-through and a separate commercial license at the documented revenue threshold."],
    verifiedUseCases: [],
    benchmarkEvidenceVersion: null,
    benchmarkState: "unbenchmarked",
    metadata: {
      officialRepository: "https://github.com/Lightricks/ltx-video",
      workerState: "not_provisioned",
    },
  },
  {
    modelKey: "lightricks/ltx-2-3",
    provider: "lightricks",
    model: "LTX-2.3",
    modelVersion: "22b",
    executionLane: "controlled",
    commercialEligibility: "conditional",
    licenseName: "LTX-2 Community License",
    licenseReference: "https://huggingface.co/Lightricks/LTX-2.3/blob/main/LICENSE",
    activationState: "blocked",
    inputModes: ["text", "reference_image", "reference_video", "audio"],
    outputModes: ["video"],
    maxUsefulDurationSeconds: 10,
    supportedResolutions: ["720p", "1080p"],
    supportsReferenceImage: true,
    supportsReferenceVideo: true,
    supportsIdentityPreservation: false,
    supportsCameraControl: true,
    supportsPoseControl: true,
    supportsAudio: true,
    knownWeaknesses: ["Weights are gated pending terms acceptance.", "No CreatorVault quality benchmark exists.", "Requires a larger worker profile than the first benchmark lane."],
    verifiedUseCases: [],
    benchmarkEvidenceVersion: null,
    benchmarkState: "unbenchmarked",
    metadata: {
      officialRepository: "https://github.com/Lightricks/LTX-2",
      gatedWeights: true,
      workerState: "not_provisioned",
    },
  },
];

function safeJson(value: unknown): string {
  try {
    return JSON.stringify(value ?? {});
  } catch {
    return JSON.stringify({ serializationError: true });
  }
}

function parseJson<T>(value: unknown, fallback: T): T {
  if (value === null || value === undefined || value === "") return fallback;
  if (typeof value === "object") return value as T;
  try {
    return JSON.parse(String(value)) as T;
  } catch {
    return fallback;
  }
}

function numberOrNull(value: unknown): number | null {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function roundScore(value: number): number {
  return Math.round(value * 100) / 100;
}

function normaliseCriteria(value: unknown): ModelBenchmarkCriteria {
  const parsed = parseJson<Record<string, unknown>>(value, {});
  const criteria: ModelBenchmarkCriteria = {};
  for (const key of METRIC_KEYS) {
    const score = numberOrNull(parsed[key]);
    if (score !== null && score >= 0 && score <= 100) criteria[key] = roundScore(score);
  }
  return criteria;
}

async function rawQuery<T = any>(query: string, params: any[] = []): Promise<T[]> {
  const pool = (db as any).$client || (db as any).client;
  if (pool && typeof pool.promise === "function") {
    const [rows] = await pool.promise().query(query, params);
    return rows as T[];
  }
  if (pool && typeof pool.execute === "function") {
    const [rows] = await pool.execute(query, params);
    return rows as T[];
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

function normaliseEntry(row: any): CreationModelRegistryEntry {
  return {
    modelKey: String(row.model_key),
    provider: String(row.provider),
    model: String(row.model_name),
    modelVersion: String(row.model_version),
    executionLane: String(row.execution_lane) as CreationExecutionLane,
    commercialEligibility: String(row.commercial_eligibility) as CommercialEligibility,
    licenseName: String(row.license_name),
    licenseReference: row.license_reference ? String(row.license_reference) : null,
    activationState: String(row.activation_state) as ModelActivationState,
    inputModes: parseJson<CreatorVaultInputMode[]>(row.input_modes_json, []),
    outputModes: parseJson<CreatorVaultOutputMode[]>(row.output_modes_json, []),
    maxUsefulDurationSeconds: Number(row.max_useful_duration_seconds),
    supportedResolutions: parseJson<string[]>(row.supported_resolutions_json, []),
    supportsReferenceImage: Boolean(row.supports_reference_image),
    supportsReferenceVideo: Boolean(row.supports_reference_video),
    supportsIdentityPreservation: Boolean(row.supports_identity_preservation),
    supportsCameraControl: Boolean(row.supports_camera_control),
    supportsPoseControl: Boolean(row.supports_pose_control),
    supportsAudio: Boolean(row.supports_audio),
    knownWeaknesses: parseJson<string[]>(row.known_weaknesses_json, []),
    verifiedUseCases: parseJson<string[]>(row.verified_use_cases_json, []),
    benchmarkEvidenceVersion: row.benchmark_evidence_version ? String(row.benchmark_evidence_version) : null,
    benchmarkState: String(row.benchmark_state) as ModelBenchmarkState,
    metadata: parseJson<Record<string, unknown>>(row.metadata_json, {}),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

function normaliseBenchmark(row: any): CreationModelBenchmark {
  return {
    id: String(row.id),
    modelKey: String(row.model_key),
    sourceEvidenceId: String(row.source_evidence_id),
    benchmarkVersion: String(row.benchmark_version),
    inputSignature: String(row.input_signature),
    criteria: normaliseCriteria(row.criteria_json),
    overallScore: roundScore(Number(row.overall_score)),
    qualityState: String(row.quality_state) as CreationModelBenchmark["qualityState"],
    evidenceReference: String(row.evidence_reference),
    notes: row.notes ? String(row.notes) : null,
    reviewedBy: Number(row.reviewed_by),
    evidenceState: String(row.evidence_state || "valid") === "invalidated" ? "invalidated" : "valid",
    invalidationReason: row.invalidation_reason ? String(row.invalidation_reason) : null,
    invalidatedBy: row.invalidated_by === null || row.invalidated_by === undefined ? null : Number(row.invalidated_by),
    invalidatedAt: row.invalidated_at ? String(row.invalidated_at) : null,
    createdAt: String(row.created_at),
  };
}

export async function ensureCreationModelRegistrySchema(): Promise<void> {
  await rawExec(`CREATE TABLE IF NOT EXISTS creation_model_registry (
    model_key VARCHAR(191) NOT NULL PRIMARY KEY,
    provider VARCHAR(96) NOT NULL,
    model_name VARCHAR(191) NOT NULL,
    model_version VARCHAR(96) NOT NULL,
    execution_lane VARCHAR(32) NOT NULL,
    commercial_eligibility VARCHAR(32) NOT NULL,
    license_name VARCHAR(191) NOT NULL,
    license_reference TEXT NULL,
    activation_state VARCHAR(32) NOT NULL,
    input_modes_json LONGTEXT NOT NULL,
    output_modes_json LONGTEXT NOT NULL,
    max_useful_duration_seconds INT NOT NULL,
    supported_resolutions_json LONGTEXT NOT NULL,
    supports_reference_image TINYINT(1) NOT NULL DEFAULT 0,
    supports_reference_video TINYINT(1) NOT NULL DEFAULT 0,
    supports_identity_preservation TINYINT(1) NOT NULL DEFAULT 0,
    supports_camera_control TINYINT(1) NOT NULL DEFAULT 0,
    supports_pose_control TINYINT(1) NOT NULL DEFAULT 0,
    supports_audio TINYINT(1) NOT NULL DEFAULT 0,
    known_weaknesses_json LONGTEXT NOT NULL,
    verified_use_cases_json LONGTEXT NOT NULL,
    benchmark_evidence_version VARCHAR(191) NULL,
    benchmark_state VARCHAR(32) NOT NULL,
    metadata_json LONGTEXT NULL,
    created_at DATETIME NOT NULL,
    updated_at DATETIME NOT NULL,
    KEY creation_model_registry_lane_state (execution_lane, activation_state, benchmark_state),
    KEY creation_model_registry_provider (provider, model_name)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);

  await rawExec(`CREATE TABLE IF NOT EXISTS creation_model_benchmarks (
    id CHAR(36) NOT NULL PRIMARY KEY,
    model_key VARCHAR(191) NOT NULL,
    source_evidence_id VARCHAR(96) NOT NULL,
    benchmark_version VARCHAR(191) NOT NULL,
    input_signature CHAR(64) NOT NULL,
    criteria_json LONGTEXT NOT NULL,
    overall_score DECIMAL(7,3) NOT NULL,
    quality_state VARCHAR(32) NOT NULL,
    evidence_reference TEXT NOT NULL,
    notes TEXT NULL,
    reviewed_by BIGINT NOT NULL,
    evidence_state VARCHAR(32) NOT NULL DEFAULT 'valid',
    invalidation_reason TEXT NULL,
    invalidated_by BIGINT NULL,
    invalidated_at DATETIME NULL,
    created_at DATETIME NOT NULL,
    KEY creation_model_benchmarks_model (model_key, quality_state, created_at),
    KEY creation_model_benchmarks_source (source_evidence_id, benchmark_version)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);

  // Older deployments already have the table. Upgrade them without making a
  // benchmark disappear from history: invalidated evidence stays auditable but
  // cannot contribute to a routing decision.
  for (const statement of [
    "ALTER TABLE creation_model_benchmarks ADD COLUMN evidence_state VARCHAR(32) NOT NULL DEFAULT 'valid'",
    "ALTER TABLE creation_model_benchmarks ADD COLUMN invalidation_reason TEXT NULL",
    "ALTER TABLE creation_model_benchmarks ADD COLUMN invalidated_by BIGINT NULL",
    "ALTER TABLE creation_model_benchmarks ADD COLUMN invalidated_at DATETIME NULL",
  ]) {
    try { await rawExec(statement); } catch { /* column is already present */ }
  }

  for (const model of DEFAULT_MODELS) {
    await rawExec(
      `INSERT IGNORE INTO creation_model_registry (
        model_key, provider, model_name, model_version, execution_lane, commercial_eligibility,
        license_name, license_reference, activation_state, input_modes_json, output_modes_json,
        max_useful_duration_seconds, supported_resolutions_json, supports_reference_image,
        supports_reference_video, supports_identity_preservation, supports_camera_control,
        supports_pose_control, supports_audio, known_weaknesses_json, verified_use_cases_json,
        benchmark_evidence_version, benchmark_state, metadata_json, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
      [
        model.modelKey,
        model.provider,
        model.model,
        model.modelVersion,
        model.executionLane,
        model.commercialEligibility,
        model.licenseName,
        model.licenseReference,
        model.activationState,
        safeJson(model.inputModes),
        safeJson(model.outputModes),
        model.maxUsefulDurationSeconds,
        safeJson(model.supportedResolutions),
        model.supportsReferenceImage ? 1 : 0,
        model.supportsReferenceVideo ? 1 : 0,
        model.supportsIdentityPreservation ? 1 : 0,
        model.supportsCameraControl ? 1 : 0,
        model.supportsPoseControl ? 1 : 0,
        model.supportsAudio ? 1 : 0,
        safeJson(model.knownWeaknesses),
        safeJson(model.verifiedUseCases),
        model.benchmarkEvidenceVersion,
        model.benchmarkState,
        safeJson(model.metadata),
      ],
    );
  }
}

export async function getCreationModelRegistry(): Promise<CreationModelRegistryEntry[]> {
  await ensureCreationModelRegistrySchema();
  const rows = await rawQuery("SELECT * FROM creation_model_registry ORDER BY execution_lane, provider, model_name");
  return rows.map(normaliseEntry);
}

export async function getCreationModel(modelKey: string): Promise<CreationModelRegistryEntry | null> {
  await ensureCreationModelRegistrySchema();
  const rows = await rawQuery("SELECT * FROM creation_model_registry WHERE model_key = ? LIMIT 1", [modelKey]);
  return rows[0] ? normaliseEntry(rows[0]) : null;
}

export async function getCreationModelBenchmarks(modelKey: string): Promise<CreationModelBenchmark[]> {
  await ensureCreationModelRegistrySchema();
  const rows = await rawQuery("SELECT * FROM creation_model_benchmarks WHERE model_key = ? ORDER BY created_at DESC", [modelKey]);
  return rows.map(normaliseBenchmark);
}

function average(values: number[]): number | null {
  if (!values.length) return null;
  return roundScore(values.reduce((total, value) => total + value, 0) / values.length);
}

export function summariseModelEvidence(benchmarks: CreationModelBenchmark[]): ModelEvidenceSummary {
  const validBenchmarks = benchmarks.filter((benchmark) => benchmark.evidenceState !== "invalidated");
  const accepted = validBenchmarks.filter((benchmark) => benchmark.qualityState === "accepted");
  const rejected = validBenchmarks.filter((benchmark) => benchmark.qualityState === "rejected");
  const criteria: ModelBenchmarkCriteria = {};
  for (const key of METRIC_KEYS) {
    const values = accepted.map((benchmark) => benchmark.criteria[key]).filter((value): value is number => typeof value === "number");
    const score = average(values);
    if (score !== null) criteria[key] = score;
  }
  return {
    benchmarkCount: validBenchmarks.length,
    acceptedBenchmarkCount: accepted.length,
    rejectedBenchmarkCount: rejected.length,
    bestAcceptedScore: accepted.length ? Math.max(...accepted.map((benchmark) => benchmark.overallScore)) : null,
    averageAcceptedScore: average(accepted.map((benchmark) => benchmark.overallScore)),
    criteria,
  };
}

export async function getRoutableCreationModels(): Promise<RoutableCreationModel[]> {
  const models = await getCreationModelRegistry();
  const benchmarksByModel = new Map<string, CreationModelBenchmark[]>();
  const allBenchmarks = await rawQuery("SELECT * FROM creation_model_benchmarks ORDER BY created_at DESC");
  for (const row of allBenchmarks) {
    const benchmark = normaliseBenchmark(row);
    const current = benchmarksByModel.get(benchmark.modelKey) || [];
    current.push(benchmark);
    benchmarksByModel.set(benchmark.modelKey, current);
  }
  return models.map((model) => ({
    ...model,
    evidence: summariseModelEvidence(benchmarksByModel.get(model.modelKey) || []),
  }));
}

function requiredEvidenceMetrics(requirements: CreationCapabilityRequirements): Array<keyof ModelBenchmarkCriteria> {
  const metrics: Array<keyof ModelBenchmarkCriteria> = ["sourceFidelity", "motionRealism", "temporalConsistency", "cinematicQuality", "editability"];
  if (requirements.requiresIdentityPreservation) metrics.push("facePreservation", "identityPreservation");
  if (requirements.requiresNaturalBody) metrics.push("bodyNaturalness", "anatomy", "skinTexture", "hands", "legs", "hipsWaistContinuity");
  if (requirements.requiresPropPreservation) metrics.push("clothingPreservation", "propPreservation", "backgroundStability");
  if (requirements.requiresCameraControl) metrics.push("cameraMotion");
  return [...new Set(metrics)];
}

export function selectBestVerifiedCreationModel(models: RoutableCreationModel[], requirements: CreationCapabilityRequirements): ModelSelectionDecision {
  const rejected: Array<{ modelKey: string; reasons: string[] }> = [];
  const candidates: Array<{ model: RoutableCreationModel; score: number }> = [];

  for (const model of models) {
    const reasons: string[] = [];
    if (model.activationState !== "active") reasons.push("not_active");
    if (model.benchmarkState !== "accepted") reasons.push("benchmark_not_accepted");
    if (model.commercialEligibility !== "verified") reasons.push("commercial_eligibility_not_verified");
    if (!model.outputModes.includes(requirements.requiredOutputMode)) reasons.push("output_mode_not_supported");
    if (requirements.durationSeconds > model.maxUsefulDurationSeconds) reasons.push("duration_exceeds_verified_limit");
    if (requirements.resolution && !model.supportedResolutions.includes(requirements.resolution)) reasons.push("resolution_not_verified");
    for (const inputMode of requirements.requiredInputModes) {
      if (!model.inputModes.includes(inputMode)) reasons.push(`input_mode_not_supported:${inputMode}`);
    }
    if (requirements.requiresReferenceImage && !model.supportsReferenceImage) reasons.push("reference_image_not_supported");
    if (requirements.requiresReferenceVideo && !model.supportsReferenceVideo) reasons.push("reference_video_not_supported");
    if (requirements.requiresIdentityPreservation && !model.supportsIdentityPreservation) reasons.push("identity_preservation_not_supported");
    if (requirements.requiresCameraControl && !model.supportsCameraControl) reasons.push("camera_control_not_supported");
    if (requirements.requiresAudio && !model.supportsAudio) reasons.push("audio_not_supported");

    if (requirements.requiresGeneratedShot && model.executionLane === "assembly") reasons.push("assembly_cannot_create_new_shot");
    if (!requirements.requiresGeneratedShot && model.executionLane !== "assembly") reasons.push("generated_lane_not_needed_for_existing_media_assembly");

    const evidenceMetrics = requiredEvidenceMetrics(requirements);
    const evidenceScores = evidenceMetrics.map((metric) => model.evidence.criteria[metric]).filter((value): value is number => typeof value === "number");
    if (requirements.requiresGeneratedShot && evidenceScores.length !== evidenceMetrics.length) reasons.push("missing_required_benchmark_metrics");
    const evidenceScore = average(evidenceScores);
    if (requirements.requiresGeneratedShot && (evidenceScore === null || evidenceScore < (requirements.minimumQualityScore ?? 75))) {
      reasons.push("benchmark_quality_below_requirement");
    }

    if (reasons.length) {
      rejected.push({ modelKey: model.modelKey, reasons: [...new Set(reasons)] });
      continue;
    }

    const score = requirements.requiresGeneratedShot
      ? roundScore((evidenceScore || 0) * 0.85 + (model.evidence.averageAcceptedScore || 0) * 0.15)
      : model.evidence.averageAcceptedScore || 100;
    candidates.push({ model, score });
  }

  candidates.sort((left, right) => right.score - left.score || left.model.modelKey.localeCompare(right.model.modelKey));
  return {
    selected: candidates[0]?.model || null,
    selectionScore: candidates[0]?.score ?? null,
    rejected,
  };
}

function validateCriteria(criteria: ModelBenchmarkCriteria): ModelBenchmarkCriteria {
  const normalised = normaliseCriteria(criteria);
  if (!Object.keys(normalised).length) throw new Error("At least one CreatorVault benchmark criterion is required.");
  return normalised;
}

export async function recordCreationModelBenchmark(input: {
  modelKey: string;
  sourceEvidenceId: string;
  benchmarkVersion: string;
  inputSignature: string;
  criteria: ModelBenchmarkCriteria;
  overallScore: number;
  qualityState: CreationModelBenchmark["qualityState"];
  evidenceReference: string;
  notes?: string | null;
  reviewedBy: number;
}): Promise<CreationModelBenchmark> {
  await ensureCreationModelRegistrySchema();
  const model = await getCreationModel(input.modelKey);
  if (!model) throw new Error("The selected creation model is not registered.");
  const overallScore = numberOrNull(input.overallScore);
  if (overallScore === null || overallScore < 0 || overallScore > 100) throw new Error("Overall quality score must be between 0 and 100.");
  const sourceEvidenceId = String(input.sourceEvidenceId || "").trim();
  const benchmarkVersion = String(input.benchmarkVersion || "").trim();
  const inputSignature = String(input.inputSignature || "").trim();
  const evidenceReference = String(input.evidenceReference || "").trim();
  if (!sourceEvidenceId || !benchmarkVersion || !/^[a-f0-9]{32,128}$/i.test(inputSignature) || !evidenceReference) {
    throw new Error("Benchmark source evidence, version, input signature, and watchable evidence reference are required.");
  }
  const criteria = validateCriteria(input.criteria);
  const id = randomUUID();
  await rawExec(
    `INSERT INTO creation_model_benchmarks
      (id, model_key, source_evidence_id, benchmark_version, input_signature, criteria_json, overall_score,
       quality_state, evidence_reference, notes, reviewed_by, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
    [id, model.modelKey, sourceEvidenceId, benchmarkVersion, inputSignature, safeJson(criteria), roundScore(overallScore), input.qualityState, evidenceReference, input.notes || null, input.reviewedBy],
  );

  const benchmarks = await getCreationModelBenchmarks(model.modelKey);
  const evidence = summariseModelEvidence(benchmarks);
  const nextState: ModelBenchmarkState = input.qualityState === "accepted" && evidence.acceptedBenchmarkCount > 0
    ? "accepted"
    : input.qualityState === "rejected" && evidence.acceptedBenchmarkCount === 0
      ? "rejected"
      : "conditional";
  await rawExec(
    `UPDATE creation_model_registry
     SET benchmark_state = ?, benchmark_evidence_version = ?, updated_at = NOW()
     WHERE model_key = ?`,
    [nextState, benchmarkVersion, model.modelKey],
  );

  const rows = await rawQuery("SELECT * FROM creation_model_benchmarks WHERE id = ? LIMIT 1", [id]);
  return normaliseBenchmark(rows[0]);
}

export async function invalidateCreationModelBenchmarkEvidence(input: {
  modelKey: string;
  evidenceReference: string;
  reason: string;
  invalidatedBy: number;
}): Promise<{ invalidatedCount: number; model: CreationModelRegistryEntry }> {
  await ensureCreationModelRegistrySchema();
  const model = await getCreationModel(input.modelKey);
  if (!model) throw new Error("The selected creation model is not registered.");

  const evidenceReference = String(input.evidenceReference || "").trim();
  const reason = String(input.reason || "").trim();
  if (!evidenceReference || !reason) throw new Error("An evidence reference and invalidation reason are required.");

  const result = await rawExec(
    `UPDATE creation_model_benchmarks
     SET evidence_state = 'invalidated', invalidation_reason = ?, invalidated_by = ?, invalidated_at = NOW()
     WHERE model_key = ? AND evidence_reference = ? AND (evidence_state IS NULL OR evidence_state <> 'invalidated')`,
    [reason, input.invalidatedBy, model.modelKey, evidenceReference],
  );
  const invalidatedCount = Number((result as any)?.affectedRows || 0);
  if (!invalidatedCount) throw new Error("No valid benchmark records matched that evidence reference.");

  const evidence = summariseModelEvidence(await getCreationModelBenchmarks(model.modelKey));
  const nextBenchmarkState: ModelBenchmarkState = evidence.acceptedBenchmarkCount > 0
    ? "accepted"
    : evidence.rejectedBenchmarkCount > 0
      ? "rejected"
      : "unbenchmarked";
  const nextActivationState: ModelActivationState = evidence.acceptedBenchmarkCount > 0
    ? model.activationState
    : "blocked";
  const knownWeaknesses = [...new Set([
    ...model.knownWeaknesses,
    "A benchmark evidence record was invalidated because it was not watchable CreatorVault proof.",
  ])];

  await rawExec(
    `UPDATE creation_model_registry
     SET activation_state = ?, benchmark_state = ?, benchmark_evidence_version = ?, known_weaknesses_json = ?, updated_at = NOW()
     WHERE model_key = ?`,
    [
      nextActivationState,
      nextBenchmarkState,
      evidence.acceptedBenchmarkCount > 0 ? model.benchmarkEvidenceVersion : null,
      safeJson(knownWeaknesses),
      model.modelKey,
    ],
  );

  return { invalidatedCount, model: (await getCreationModel(model.modelKey))! };
}

export async function setCreationModelActivation(input: {
  modelKey: string;
  activationState: ModelActivationState;
  commercialEligibility?: CommercialEligibility;
  verifiedUseCases?: string[];
  knownWeaknesses?: string[];
  metadata?: Record<string, unknown>;
}): Promise<CreationModelRegistryEntry> {
  await ensureCreationModelRegistrySchema();
  const model = await getCreationModel(input.modelKey);
  if (!model) throw new Error("The selected creation model is not registered.");
  if (input.activationState === "active" && model.benchmarkState !== "accepted") {
    throw new Error("A creation model cannot become active until CreatorVault has accepted its benchmark evidence.");
  }
  const commercialEligibility = input.commercialEligibility || model.commercialEligibility;
  if (input.activationState === "active" && commercialEligibility !== "verified") {
    throw new Error("A creation model cannot become active until commercial eligibility is verified.");
  }
  await rawExec(
    `UPDATE creation_model_registry
     SET activation_state = ?, commercial_eligibility = ?, verified_use_cases_json = ?, known_weaknesses_json = ?, metadata_json = ?, updated_at = NOW()
     WHERE model_key = ?`,
    [
      input.activationState,
      commercialEligibility,
      safeJson(input.verifiedUseCases || model.verifiedUseCases),
      safeJson(input.knownWeaknesses || model.knownWeaknesses),
      safeJson({ ...model.metadata, ...(input.metadata || {}) }),
      model.modelKey,
    ],
  );
  return (await getCreationModel(model.modelKey))!;
}

export const CREATORVAULT_MODEL_REGISTRY_POLICY = {
  catalogMarketingIsNotBenchmarkEvidence: true,
  unbenchmarkedModelsAreNotRoutable: true,
  rejectedModelsAreNotRoutable: true,
  activeRequiresAcceptedBenchmark: true,
  activeRequiresVerifiedCommercialEligibility: true,
  creatorFacingSurfacesMustNotExposeModelManagement: true,
} as const;
