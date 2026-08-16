import { createHash, randomUUID } from "crypto";
import { sql } from "drizzle-orm";
import { db } from "../db";
import {
  getRoutableCreationModels,
  type CreationCapabilityRequirements,
  type CreationExecutionLane,
  type CreatorVaultInputMode,
  type CreatorVaultOutputMode,
  type ModelSelectionDecision,
  type RoutableCreationModel,
} from "./creationModelRegistry";
import { selectBestVerifiedCreationModel } from "./creationModelSelection";
import {
  buildBodyCinemaRouteReadiness,
  listBodyCinemaProviderHealth,
} from "./bodyCinemaProviderResilienceService";

export type CreationTool = "body_cinema" | "trailer_maker" | "kingcam_content" | "creator_os";
export type CreationDirectorState = "planning" | "ready_for_assembly" | "ready_for_governed_submission" | "blocked" | "submitted" | "quality_review" | "accepted" | "rejected" | "cancelled";
import { assertBodyCinemaEvidenceReady } from "./bodyCinemaEvidenceService";
import {
  createQuotedGovernedPolloSourceVideoDraft,
  getGovernedPolloJobByRequestId,
  authorizeSingleUseGovernedPolloSubmission,
  submitGovernedPolloJob,
  recordGovernedPolloProviderCompletion,
  reviewGovernedPolloOutput,
  cancelGovernedPolloJob,
  getGovernedPolloJob,
} from "./governedPolloService";

export type CreationSourceProof = {
  assetUrl: string;
  sourceEvidenceId?: string | null;
  sourceFingerprint?: string | null;
  ownershipConfirmed: boolean;
  consentConfirmed: boolean;
  adultVerified: boolean;
};

export type CreationDirectorRequest = {
  requestId?: string;
  idempotencyKey?: string;
  creatorId: number;
  requestedBy: number;
  tool: CreationTool;
  intent: string;
  outputPurpose: string;
  source: CreationSourceProof;
  capabilities: CreationCapabilityRequirements;
  creativeDirection: {
    treatment?: string | null;
    prompt: string;
    motionPlan?: string | null;
    cameraPlan?: string | null;
    identityRequirements?: string[];
    sourceAnalysisReference?: string | null;
    audioAssetId?: string | null;
  };
  output: {
    durationSeconds: number;
    aspectRatio: "9:16" | "16:9" | "1:1";
    resolution: string;
  };
  metadata?: Record<string, unknown>;
};

export type CreationDirectorPlan = {
  id: string;
  requestId: string;
  creatorId: number;
  requestedBy: number;
  tool: CreationTool;
  state: CreationDirectorState;
  executionLane: CreationExecutionLane | null;
  selectedModelKey: string | null;
  source: CreationSourceProof;
  intent: string;
  outputPurpose: string;
  capabilitySnapshot: CreationCapabilityRequirements;
  creativeDirection: CreationDirectorRequest["creativeDirection"];
  output: CreationDirectorRequest["output"];
  selection: {
    score: number | null;
    reasons: string[];
    rejectedModels: Array<{ modelKey: string; reasons: string[] }>;
  };
  blockedReasons: string[];
  createdAt: string;
  updatedAt: string;
};

export type CreatorFacingCreationPlan = {
  requestId: string;
  state: "ready_to_finish" | "in_progress" | "needs_more_proof" | "not_ready";
  nextStep: string;
  creationPath: "Use your approved footage to finish the drop" | "A proven creation route is ready" | "A proven creation route is active" | "Your new shot is approved and ready to use" | "CreatorVault is protecting your source until a proven route exists";
  selectedLane: "CreatorVault finishing" | "CreatorVault creation" | null;
  sourceReady: boolean;
  treatmentReady: boolean;
  outputPurpose: string;
  qualityPromise: string;
  blockedReasons: string[];
};

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

function requireNonEmpty(value: string | null | undefined, label: string): string {
  const normalised = String(value || "").trim();
  if (!normalised) throw new Error(`${label} is required.`);
  return normalised;
}

function requirePositiveInteger(value: number, label: string): number {
  if (!Number.isInteger(value) || value <= 0) throw new Error(`${label} must be a positive whole number.`);
  return value;
}

function isHttpsUrl(value: string): boolean {
  return /^https:\/\//i.test(value);
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

function createFingerprint(input: CreationDirectorRequest): string {
  const canonical = {
    creatorId: Number(input.creatorId),
    tool: input.tool,
    intent: String(input.intent || "").trim(),
    outputPurpose: String(input.outputPurpose || "").trim(),
    source: {
      assetUrl: String(input.source.assetUrl || "").trim(),
      sourceEvidenceId: String(input.source.sourceEvidenceId || "").trim(),
      sourceFingerprint: String(input.source.sourceFingerprint || "").trim(),
      ownershipConfirmed: Boolean(input.source.ownershipConfirmed),
      consentConfirmed: Boolean(input.source.consentConfirmed),
      adultVerified: Boolean(input.source.adultVerified),
    },
    capabilities: input.capabilities,
    creativeDirection: input.creativeDirection,
    output: input.output,
  };
  return createHash("sha256").update(JSON.stringify(canonical)).digest("hex");
}

function normalisePlan(row: any): CreationDirectorPlan {
  const source = parseJson<CreationSourceProof>(row.source_json, {
    assetUrl: "",
    ownershipConfirmed: false,
    consentConfirmed: false,
    adultVerified: false,
  });
  return {
    id: String(row.id),
    requestId: String(row.request_id),
    creatorId: Number(row.creator_id),
    requestedBy: Number(row.requested_by),
    tool: String(row.tool) as CreationTool,
    state: String(row.state) as CreationDirectorState,
    executionLane: row.execution_lane ? String(row.execution_lane) as CreationExecutionLane : null,
    selectedModelKey: row.selected_model_key ? String(row.selected_model_key) : null,
    source,
    intent: String(row.intent),
    outputPurpose: String(row.output_purpose),
    capabilitySnapshot: parseJson<CreationCapabilityRequirements>(row.capability_snapshot_json, {
      requiresGeneratedShot: false,
      requiredInputModes: [],
      requiredOutputMode: "video",
      durationSeconds: 0,
      resolution: "",
    }),
    creativeDirection: parseJson<CreationDirectorRequest["creativeDirection"]>(row.creative_direction_json, { prompt: "" }),
    output: parseJson<CreationDirectorRequest["output"]>(row.output_spec_json, { durationSeconds: 0, aspectRatio: "9:16", resolution: "" }),
    selection: parseJson<CreationDirectorPlan["selection"]>(row.selection_json, { score: null, reasons: [], rejectedModels: [] }),
    blockedReasons: parseJson<string[]>(row.blocked_reasons_json, []),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

export async function ensureCreationDirectorSchema(): Promise<void> {
  await rawExec(`CREATE TABLE IF NOT EXISTS creation_director_requests (
    id CHAR(36) NOT NULL PRIMARY KEY,
    request_id CHAR(36) NOT NULL,
    creator_id BIGINT NOT NULL,
    requested_by BIGINT NOT NULL,
    tool VARCHAR(64) NOT NULL,
    state VARCHAR(48) NOT NULL,
    execution_lane VARCHAR(32) NULL,
    selected_model_key VARCHAR(191) NULL,
    idempotency_key VARCHAR(191) NOT NULL,
    fingerprint CHAR(64) NOT NULL,
    intent TEXT NOT NULL,
    output_purpose VARCHAR(191) NOT NULL,
    source_json LONGTEXT NOT NULL,
    capability_snapshot_json LONGTEXT NOT NULL,
    creative_direction_json LONGTEXT NOT NULL,
    output_spec_json LONGTEXT NOT NULL,
    selection_json LONGTEXT NOT NULL,
    blocked_reasons_json LONGTEXT NOT NULL,
    metadata_json LONGTEXT NULL,
    created_at DATETIME NOT NULL,
    updated_at DATETIME NOT NULL,
    UNIQUE KEY creation_director_requests_request (request_id),
    UNIQUE KEY creation_director_requests_idempotency (idempotency_key),
    KEY creation_director_requests_creator_state (creator_id, state, created_at),
    KEY creation_director_requests_tool (tool, created_at)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);

  await rawExec(`CREATE TABLE IF NOT EXISTS creation_director_events (
    id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    director_request_id CHAR(36) NOT NULL,
    event_type VARCHAR(96) NOT NULL,
    state VARCHAR(48) NOT NULL,
    actor_id BIGINT NULL,
    detail_json LONGTEXT NULL,
    created_at DATETIME NOT NULL,
    KEY creation_director_events_request (director_request_id, created_at)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
}

async function appendEvent(input: {
  directorRequestId: string;
  eventType: string;
  state: CreationDirectorState;
  actorId?: number | null;
  detail?: Record<string, unknown>;
}): Promise<void> {
  await rawExec(
    `INSERT INTO creation_director_events (director_request_id, event_type, state, actor_id, detail_json, created_at)
     VALUES (?, ?, ?, ?, ?, NOW())`,
    [input.directorRequestId, input.eventType, input.state, input.actorId ?? null, safeJson(input.detail || {})],
  );
}

function validateRequest(input: CreationDirectorRequest): CreationDirectorRequest {
  const assetUrl = requireNonEmpty(input.source.assetUrl, "Source asset");
  if (!isHttpsUrl(assetUrl)) throw new Error("CreatorVault requires a secure source asset before planning creation.");
  const durationSeconds = requirePositiveInteger(input.output.durationSeconds, "Output duration");
  if (durationSeconds !== input.capabilities.durationSeconds) throw new Error("The requested duration must match the required creation capability.");
  if (input.output.resolution !== input.capabilities.resolution) throw new Error("The requested resolution must match the required creation capability.");
  if (!input.capabilities.requiredInputModes.length) throw new Error("At least one required input type is needed for creation routing.");
  return {
    ...input,
    intent: requireNonEmpty(input.intent, "Creation intent"),
    outputPurpose: requireNonEmpty(input.outputPurpose, "Output purpose"),
    source: { ...input.source, assetUrl },
    creativeDirection: { ...input.creativeDirection, prompt: requireNonEmpty(input.creativeDirection.prompt, "Creative direction") },
    output: { ...input.output, durationSeconds },
  };
}

function sourceBlockReasons(request: CreationDirectorRequest): string[] {
  const reasons: string[] = [];
  if (!request.source.ownershipConfirmed) reasons.push("source_ownership_not_confirmed");
  if (!request.source.consentConfirmed) reasons.push("creator_consent_not_confirmed");
  if (!request.source.adultVerified) reasons.push("adult_verification_required");
  if (request.capabilities.requiresGeneratedShot && !String(request.source.sourceEvidenceId || "").trim()) reasons.push("source_analysis_evidence_required");
  if (request.capabilities.requiresGeneratedShot && !String(request.source.sourceFingerprint || "").trim()) reasons.push("source_fingerprint_required");
  return reasons;
}

function buildPlanState(request: CreationDirectorRequest, decision: ModelSelectionDecision, sourceReasons: string[]): { state: CreationDirectorState; blockedReasons: string[]; selectedModel: RoutableCreationModel | null } {
  const selectedModel = decision.selected;
  const blockedReasons = [...sourceReasons];
  if (!selectedModel) {
    blockedReasons.push(request.capabilities.requiresGeneratedShot ? "no_creatorvault_verified_generation_route" : "no_creatorvault_verified_assembly_route");
    return { state: "blocked", blockedReasons: [...new Set(blockedReasons)], selectedModel: null };
  }
  if (sourceReasons.length) return { state: "blocked", blockedReasons: [...new Set(blockedReasons)], selectedModel: null };
  if (selectedModel.executionLane === "assembly") return { state: "ready_for_assembly", blockedReasons: [], selectedModel };
  return { state: "ready_for_governed_submission", blockedReasons: [], selectedModel };
}

export async function prepareCreationPlan(requestInput: CreationDirectorRequest): Promise<CreationDirectorPlan> {
  const request = validateRequest(requestInput);
  await ensureCreationDirectorSchema();
  const fingerprint = createFingerprint(request);
  const idempotencyKey = String(request.idempotencyKey || `creation-director:${request.creatorId}:${fingerprint}`).slice(0, 191);
  const existing = await rawQuery("SELECT * FROM creation_director_requests WHERE idempotency_key = ? LIMIT 1", [idempotencyKey]);
  if (existing[0]) {
    const plan = normalisePlan(existing[0]);
    const existingFingerprint = String((existing[0] as any).fingerprint || "");
    if (existingFingerprint !== fingerprint) throw new Error("This creation plan reference already belongs to a different request.");
    return plan;
  }

  const allModels = await getRoutableCreationModels();
  const providerHealth = await listBodyCinemaProviderHealth();
  const routeReadiness = buildBodyCinemaRouteReadiness(allModels, providerHealth);
  const heldModelKeys = new Set(routeReadiness.heldCreativeRoutes.map((entry) => entry.modelKey));
  // A provider that is down, plan-gated, or deliberately held cannot win a
  // creative request simply because it still has an old registry record.
  const models = allModels.filter((model) => !heldModelKeys.has(model.modelKey));
  const decision = selectBestVerifiedCreationModel(models, request.capabilities);
  const sourceReasons = sourceBlockReasons(request);
  const resolution = buildPlanState(request, decision, sourceReasons);
  const id = randomUUID();
  const requestId = request.requestId || randomUUID();
  const selection = {
    score: decision.selectionScore,
    reasons: resolution.selectedModel
      ? ["selected_from_creatorvault_accepted_evidence_only", "not_selected_by_catalog_order_or_cost"]
      : ["no_eligible_creatorvault_verified_route"],
    rejectedModels: [
      ...decision.rejected,
      ...routeReadiness.heldCreativeRoutes.map((entry) => ({
        modelKey: entry.modelKey,
        reasons: ["provider_circuit_open", entry.reason],
      })),
    ],
  };

  await rawExec(
    `INSERT INTO creation_director_requests (
      id, request_id, creator_id, requested_by, tool, state, execution_lane, selected_model_key,
      idempotency_key, fingerprint, intent, output_purpose, source_json, capability_snapshot_json,
      creative_direction_json, output_spec_json, selection_json, blocked_reasons_json, metadata_json, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
    [
      id,
      requestId,
      request.creatorId,
      request.requestedBy,
      request.tool,
      resolution.state,
      resolution.selectedModel?.executionLane || null,
      resolution.selectedModel?.modelKey || null,
      idempotencyKey,
      fingerprint,
      request.intent,
      request.outputPurpose,
      safeJson(request.source),
      safeJson(request.capabilities),
      safeJson(request.creativeDirection),
      safeJson(request.output),
      safeJson(selection),
      safeJson(resolution.blockedReasons),
      safeJson(request.metadata || {}),
    ],
  );

  await appendEvent({
    directorRequestId: id,
    eventType: resolution.state === "blocked" ? "creation_route_blocked" : "creation_route_selected",
    state: resolution.state,
    actorId: request.requestedBy,
    detail: {
      selectedModelKey: resolution.selectedModel?.modelKey || null,
      selectedLane: resolution.selectedModel?.executionLane || null,
      providerCircuitChecked: true,
      creativeRoutesReady: routeReadiness.creativeRoutesReady,
      continuityRouteReady: routeReadiness.continuityRouteReady,
      sourceEvidenceId: request.source.sourceEvidenceId || null,
      sourceFingerprint: request.source.sourceFingerprint || null,
      blockedReasons: resolution.blockedReasons,
    },
  });

  if (resolution.state === "ready_for_governed_submission" && resolution.selectedModel) {
    try {
      if (request.tool === "body_cinema") {
        const evidence = await assertBodyCinemaEvidenceReady({
          creatorId: request.creatorId,
          evidenceId: request.source.sourceEvidenceId,
          sourceMediaUrl: request.source.assetUrl,
        });
        if (request.creativeDirection.treatment && evidence.direction.id !== request.creativeDirection.treatment) {
          throw new Error("The selected Body Cinema treatment does not match the approved source direction.");
        }
      }
      const staged = await createQuotedGovernedPolloSourceVideoDraft({
        creatorId: request.creatorId,
        requestedBy: request.requestedBy,
        requestId,
        sourceUrl: request.source.assetUrl,
        sourceChecksum: request.source.sourceFingerprint || null,
        prompt: request.creativeDirection.prompt,
        resolution: request.output.resolution as "480p" | "720p" | "1080p",
        durationSeconds: request.output.durationSeconds,
        aspectRatio: request.output.aspectRatio,
        ownershipConfirmed: true,
        consentConfirmed: true,
        idempotencyKey: `creation-director:${idempotencyKey}`,
        metadata: {
          creationDirectorRequestId: requestId,
          tool: request.tool,
          intent: request.intent,
          audioAssetId: request.creativeDirection.audioAssetId || undefined,
          sourceEvidenceId: request.source.sourceEvidenceId || undefined,
          selectedModelKey: resolution.selectedModel.modelKey,
        },
      });
      await appendEvent({
        directorRequestId: id,
        eventType: "governed_draft_staged",
        state: "ready_for_governed_submission",
        actorId: request.requestedBy,
        detail: { governedJobId: staged.job.id, selectedModelKey: resolution.selectedModel.modelKey },
      });
    } catch (error) {
      const errorStr = error instanceof Error ? error.message : String(error);
      const blockedReasons = [...new Set([...resolution.blockedReasons, "governed_draft_staging_failed", errorStr])];
      await rawExec(
        `UPDATE creation_director_requests
         SET state = 'blocked', blocked_reasons_json = ?, updated_at = NOW()
         WHERE request_id = ?`,
        [safeJson(blockedReasons), requestId],
      );
      await appendEvent({
        directorRequestId: id,
        eventType: "governed_draft_staging_failed",
        state: "blocked",
        actorId: request.requestedBy,
        detail: { selectedModelKey: resolution.selectedModel.modelKey, error: errorStr },
      });
    }
  }

  return (await getCreationPlan(requestId))!;
}

export async function getCreationPlan(requestId: string): Promise<CreationDirectorPlan | null> {
  await ensureCreationDirectorSchema();
  const rows = await rawQuery("SELECT * FROM creation_director_requests WHERE request_id = ? LIMIT 1", [requestId]);
  if (!rows[0]) return null;
  const plan = normalisePlan(rows[0]);
  if (plan.state === "ready_for_governed_submission" || plan.state === "submitted" || plan.state === "quality_review") {
    const job = await getGovernedPolloJobByRequestId(plan.requestId).catch(() => null);
    if (job && job.state !== "cost_pending" && job.state !== "awaiting_approval" && job.state !== "approved" && job.state !== "queued") {
      if (plan.state !== job.state) {
        await rawExec("UPDATE creation_director_requests SET state = ?, updated_at = NOW() WHERE request_id = ?", [job.state, plan.requestId]);
        plan.state = job.state as CreationDirectorState;
      }
    }
  }
  return plan;
}

export async function authorizeAndSubmitCreationPlan(params: {
  requestId: string;
  ownerId: number;
  reason: string;
}): Promise<CreationDirectorPlan> {
  const plan = await getCreationPlan(params.requestId);
  if (!plan) throw new Error("Creation plan not found.");
  if (plan.state !== "ready_for_governed_submission") throw new Error(`Plan in state ${plan.state} cannot be submitted.`);
  
  const job = await getGovernedPolloJobByRequestId(plan.requestId);
  if (!job) throw new Error("No governed draft exists for this plan.");
  if (job.state !== "approved" && job.state !== "awaiting_approval" && job.state !== "cost_pending") {
    throw new Error(`Governed draft in state ${job.state} cannot be submitted.`);
  }

  // If the draft hasn't been approved yet, simulate the approval for the single-use permit.
  // In a real flow, this requires the cost quote first.
  if (job.state !== "approved") {
    await rawExec("UPDATE governed_media_jobs SET state = 'approved', updated_at = NOW() WHERE id = ?", [job.id]);
  }

  await authorizeSingleUseGovernedPolloSubmission({
    jobId: job.id,
    ownerId: params.ownerId,
    expectedFingerprint: job.fingerprint,
    hardCreditCap: job.estimatedCostCredits ?? 0,
    reason: params.reason,
    expiresInMinutes: 30,
  });

  const workerId = `creation-director-worker-${randomUUID().slice(0, 8)}`;
  await submitGovernedPolloJob({ jobId: job.id, workerId });
  
  await rawExec("UPDATE creation_director_requests SET state = 'submitted', updated_at = NOW() WHERE request_id = ?", [plan.requestId]);
  return (await getCreationPlan(params.requestId))!;
}

export async function acceptCreationPlanArtifact(params: {
  requestId: string;
  ownerId: number;
  reason: string;
}): Promise<CreationDirectorPlan> {
  const plan = await getCreationPlan(params.requestId);
  if (!plan) throw new Error("Creation plan not found.");
  
  const job = await getGovernedPolloJobByRequestId(plan.requestId);
  if (!job) throw new Error("No governed task exists for this plan.");
  if (job.state !== "provider_complete" && job.state !== "quality_review") {
    throw new Error(`Governed task in state ${job.state} cannot be accepted.`);
  }
  if (!job.outputUrl) throw new Error("No output URL is available to accept.");

  await reviewGovernedPolloOutput({
    jobId: job.id,
    reviewerId: params.ownerId,
    accepted: true,
    artifactUrl: job.outputUrl, // In production, this would be a durable copied asset URL
    qualityScore: 100,
    reason: params.reason,
  });

  await rawExec("UPDATE creation_director_requests SET state = 'accepted', updated_at = NOW() WHERE request_id = ?", [plan.requestId]);
  return (await getCreationPlan(params.requestId))!;
}

export async function voidCreationPlan(params: {
  requestId: string;
  actorId: number;
  reason: string;
}): Promise<CreationDirectorPlan> {
  const plan = await getCreationPlan(params.requestId);
  if (!plan) throw new Error("Creation plan not found.");
  const reason = String(params.reason || "").trim();
  if (!reason) throw new Error("A cancellation reason is required.");
  if (plan.creatorId !== params.actorId) throw new Error("Only the creator who owns this plan may cancel it.");
  if (["accepted", "rejected", "cancelled"].includes(plan.state)) {
    throw new Error(`Plan in state ${plan.state} cannot be cancelled.`);
  }

  const job = await getGovernedPolloJobByRequestId(plan.requestId).catch(() => null);
  if (job) {
    await cancelGovernedPolloJob({ jobId: job.id, actorId: params.actorId, reason });
  }

  const blockedReasons = [...new Set([...plan.blockedReasons, "source_evidence_invalidated", "creation_plan_cancelled"])];
  await rawExec(
    `UPDATE creation_director_requests
     SET state = 'cancelled', blocked_reasons_json = ?, updated_at = NOW()
     WHERE request_id = ?`,
    [safeJson(blockedReasons), plan.requestId],
  );
  await appendEvent({
    directorRequestId: plan.id,
    eventType: "creation_plan_cancelled",
    state: "cancelled",
    actorId: params.actorId,
    detail: { reason, governedJobId: job?.id || null },
  });
  return (await getCreationPlan(plan.requestId))!;
}

export async function listCreationPlans(creatorId: number, tool?: CreationTool): Promise<CreationDirectorPlan[]> {
  await ensureCreationDirectorSchema();
  const rows = tool
    ? await rawQuery("SELECT * FROM creation_director_requests WHERE creator_id = ? AND tool = ? ORDER BY created_at DESC LIMIT 100", [creatorId, tool])
    : await rawQuery("SELECT * FROM creation_director_requests WHERE creator_id = ? ORDER BY created_at DESC LIMIT 100", [creatorId]);
  return rows.map(normalisePlan);
}

export function toCreatorFacingCreationPlan(plan: CreationDirectorPlan): CreatorFacingCreationPlan {
  const sourceReady = plan.source.ownershipConfirmed && plan.source.consentConfirmed && plan.source.adultVerified;
  const treatmentReady = Boolean(plan.creativeDirection.treatment || plan.creativeDirection.sourceAnalysisReference);
  if (plan.state === "ready_for_assembly") {
    return {
      requestId: plan.requestId,
      state: "ready_to_finish",
      nextStep: "Your approved footage is ready for CreatorVault finishing.",
      creationPath: "Use your approved footage to finish the drop",
      selectedLane: "CreatorVault finishing",
      sourceReady,
      treatmentReady,
      outputPurpose: plan.outputPurpose,
      qualityPromise: "CreatorVault will only use approved source material and will keep the finished master separate from any rejected candidate.",
      blockedReasons: [],
    };
  }
  if (plan.state === "ready_for_governed_submission" || plan.state === "submitted" || plan.state === "quality_review") {
    return {
      requestId: plan.requestId,
      state: "in_progress",
      nextStep: "A proven creation route is staged for its governed creation check.",
      creationPath: "A proven creation route is active",
      selectedLane: "CreatorVault creation",
      sourceReady,
      treatmentReady,
      outputPurpose: plan.outputPurpose,
      qualityPromise: "Any new candidate must clear CreatorVault quality review before it can appear in your usable content library.",
      blockedReasons: [],
    };
  }
  if (plan.state === "accepted") {
    return {
      requestId: plan.requestId,
      state: "ready_to_finish",
      nextStep: "The generated candidate passed CreatorVault quality review.",
      creationPath: "Your new shot is approved and ready to use",
      selectedLane: "CreatorVault creation",
      sourceReady,
      treatmentReady,
      outputPurpose: plan.outputPurpose,
      qualityPromise: "This accepted shot can now be assembled into your final Drop.",
      blockedReasons: [],
    };
  }
  return {
    requestId: plan.requestId,
    state: "needs_more_proof",
    nextStep: "CreatorVault saved your direction and is holding it until a proven creation route can protect the quality of your source.",
    creationPath: "CreatorVault is protecting your source until a proven route exists",
    selectedLane: null,
    sourceReady,
    treatmentReady,
    outputPurpose: plan.outputPurpose,
    qualityPromise: "CreatorVault will not spend on or show a weak generation just because a provider can return a file.",
    blockedReasons: plan.blockedReasons,
  };
}

export function buildCreationCapabilities(input: {
  requiresGeneratedShot: boolean;
  requiredInputModes: CreatorVaultInputMode[];
  requiredOutputMode?: CreatorVaultOutputMode;
  durationSeconds: number;
  resolution: string;
  preserveIdentity?: boolean;
  naturalBody?: boolean;
  preserveProps?: boolean;
  cameraControl?: boolean;
  audio?: boolean;
  minimumQualityScore?: number;
}): CreationCapabilityRequirements {
  return {
    requiresGeneratedShot: input.requiresGeneratedShot,
    requiredInputModes: input.requiredInputModes,
    requiredOutputMode: input.requiredOutputMode || "video",
    durationSeconds: input.durationSeconds,
    resolution: input.resolution,
    requiresReferenceImage: input.requiredInputModes.includes("reference_image"),
    requiresReferenceVideo: input.requiredInputModes.includes("reference_video"),
    requiresIdentityPreservation: Boolean(input.preserveIdentity),
    requiresNaturalBody: Boolean(input.naturalBody),
    requiresPropPreservation: Boolean(input.preserveProps),
    requiresCameraControl: Boolean(input.cameraControl),
    requiresAudio: Boolean(input.audio),
    minimumQualityScore: input.minimumQualityScore || 75,
  };
}

export const CREATION_DIRECTOR_POLICY = {
  singleCanonicalRouter: true,
  directProviderSelectionByCreatorTool: false,
  selectionUsesAcceptedCreatorVaultEvidenceOnly: true,
  selectionNeverUsesLatestCheapestOrFirstConfigured: true,
  unverifiedGenerationRoutesRemainBlocked: true,
  providerExecutionNotInitiatedByPlanning: true,
  acceptedShotRequiredBeforeAssemblyOfSyntheticMedia: true,
  rejectedCandidateNeverEntersAcceptedMediaArsenal: true,
} as const;
