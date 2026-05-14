import { OPERATIONAL_CONTRACT_COVERAGE, operationalWarning, type MediaJobSnapshot, type OperationalCommandCenterManifest } from "../contracts/operationalContracts";
import { createOperationalMediaOSEvent, OPERATIONAL_MEDIA_OS_EVENT_NAMES, sortOperationalMediaOSEvents, type OperationalMediaOSEventPayload } from "../events/operationalEvents";
import { buildDeadLetterManifest } from "../jobs/mediaDeadLetterQueue";
import { buildIdempotencyKey, buildJobId, buildMediaJobQueueSnapshot, createMediaJobSnapshot } from "../jobs/mediaJobQueue";
import { buildPersistedJobLedger } from "../jobs/mediaJobPersistence";
import { scheduleMediaJobs } from "../jobs/mediaJobScheduler";
import { applyMediaJobTransition, assertNoIllegalTransitions } from "../jobs/mediaJobStateMachine";
import { buildProviderReliabilityManifest } from "../providers/providerReliabilityManager";
import { buildMediaCostGovernance } from "../costs/mediaCostGovernance";
import { buildMediaStorageGovernance } from "../storage/mediaStorageGovernance";
import { buildMediaRecoveryManifest } from "../recovery/mediaRecoveryPlanner";
import { buildMediaObservabilityManifest } from "../observability/mediaObservability";
import type { MediaJobRetryPolicy } from "../contracts/operationalContracts";

function asString(value: unknown, fallback = ""): string {
  return typeof value === "string" && value.trim().length > 0 ? value : fallback;
}

function selectedAssetIdsFromManifest(mediaOS: any): string[] {
  const firstEvent = Array.isArray(mediaOS?.eventLog) ? mediaOS.eventLog.find((event: any) => Array.isArray(event?.selectedAssetIds)) : null;
  return firstEvent ? firstEvent.selectedAssetIds.map(String) : [];
}

function retryPolicy(attempt = 0, nextRetryAt: string | null = null): MediaJobRetryPolicy {
  return {
    maxAttempts: 3,
    attempt,
    retryableStates: ["failed", "retry_wait"],
    backoffSeconds: 120,
    nextRetryAt,
  };
}

function baseJob(input: {
  kind: MediaJobSnapshot["kind"];
  state: MediaJobSnapshot["state"];
  priority: number;
  trailerProjectId: string | null;
  selectedAssetIds: string[];
  providerId: string | null;
  suffix: string;
  generatedAt: string;
  dependsOn?: string[];
  attempt?: number;
  nextRetryAt?: string | null;
  replayEligible?: boolean;
}): MediaJobSnapshot {
  const jobId = buildJobId(input.kind, input.trailerProjectId, input.suffix);
  return createMediaJobSnapshot({
    jobId,
    kind: input.kind,
    state: input.state,
    priority: input.priority,
    idempotencyKey: buildIdempotencyKey(input.kind, input.trailerProjectId, input.selectedAssetIds, input.suffix),
    trailerProjectId: input.trailerProjectId,
    dependsOn: input.dependsOn ?? [],
    selectedAssetIds: input.selectedAssetIds,
    providerId: input.providerId,
    createdAt: input.generatedAt,
    updatedAt: input.generatedAt,
    retryPolicy: retryPolicy(input.attempt ?? 0, input.nextRetryAt ?? null),
    replayEligible: input.replayEligible ?? true,
  });
}

function transitionJob(job: MediaJobSnapshot, states: MediaJobSnapshot["state"][], generatedAt: string): MediaJobSnapshot {
  return states.reduce((current, state) => applyMediaJobTransition(current, state, "operationalMediaOS", `Operational manifest derived ${state} state`, generatedAt), job);
}

export function buildOperationalMediaOSManifest(mediaOS: any): OperationalCommandCenterManifest & { operationalEvents: OperationalMediaOSEventPayload[]; persistedJobLedger: ReturnType<typeof buildPersistedJobLedger>; schedulerDecision: ReturnType<typeof scheduleMediaJobs> } {
  const generatedAt = asString(mediaOS?.generatedAt, new Date().toISOString());
  const trailerProjectId = mediaOS?.trailerProjectId ? String(mediaOS.trailerProjectId) : null;
  const selectedAssetIds = selectedAssetIdsFromManifest(mediaOS);
  const renderStatus = asString(mediaOS?.renderHandoff?.status, "handoff_prepared");
  const validationStatus = asString(mediaOS?.validationHandoff?.status, "handoff_prepared");
  const distributionStatus = asString(mediaOS?.distributionHandoff?.status, "blocked");
  const voiceoverStatus = asString(mediaOS?.timelineCommandCenter?.voiceover?.generationStatus ?? mediaOS?.timelineCommandCenter?.voiceover?.status, "planned");
  const cloneRegistryStatus = asString(mediaOS?.timelineCommandCenter?.cloneSequence?.registryStatus ?? mediaOS?.timelineCommandCenter?.cloneSequence?.status, "planned");

  const validationJob = transitionJob(baseJob({ kind: "manifest_validation", state: "created", priority: 100, trailerProjectId, selectedAssetIds, providerId: null, suffix: "validation", generatedAt }), ["queued", "scheduled", "running", validationStatus === "blocked" ? "failed" : "completed"], generatedAt);
  const voiceJob = transitionJob(baseJob({ kind: "voiceover_provider", state: "created", priority: 70, trailerProjectId, selectedAssetIds, providerId: "elevenlabs-tts-primary", suffix: "voiceover", generatedAt }), ["queued"], generatedAt);
  const cloneJob = transitionJob(baseJob({ kind: "clone_registry_check", state: "created", priority: 65, trailerProjectId, selectedAssetIds, providerId: "clone-model-registry", suffix: "clone", generatedAt }), ["queued", "scheduled", "running", "completed"], generatedAt);
  const renderJob = transitionJob(baseJob({ kind: "render_planning", state: "created", priority: 90, trailerProjectId, selectedAssetIds, providerId: "remotion-render-service", suffix: "render-plan", generatedAt, dependsOn: [validationJob.jobId] }), ["queued"], generatedAt);
  const storageJob = transitionJob(baseJob({ kind: "storage_governance", state: "created", priority: 80, trailerProjectId, selectedAssetIds, providerId: "creatorvault-storage-uploads", suffix: "storage", generatedAt }), ["queued", "scheduled", "running", "completed"], generatedAt);
  const distributionJob = transitionJob(baseJob({ kind: "distribution_readiness", state: "created", priority: 30, trailerProjectId, selectedAssetIds, providerId: "future-distribution-targets", suffix: "distribution", generatedAt, dependsOn: [renderJob.jobId] }), ["queued"], generatedAt);

  const jobs = [validationJob, voiceJob, cloneJob, renderJob, storageJob, distributionJob];
  const transitionAudit = assertNoIllegalTransitions(jobs);
  const queue = buildMediaJobQueueSnapshot({ queueId: `media-ops-queue:${trailerProjectId ?? "no-project"}`, generatedAt, concurrencyLimit: 2, jobs });
  const schedulerDecision = scheduleMediaJobs(queue);
  const persistedJobLedger = buildPersistedJobLedger(jobs, generatedAt);
  const providers = buildProviderReliabilityManifest({ voiceoverStatus, cloneRegistryStatus, renderStatus, distributionStatus, generatedAt });
  const costs = buildMediaCostGovernance({ generatedAt, jobs: queue, providers, budgetLimitUsd: 5 });
  const preliminaryStorage = buildMediaStorageGovernance({ generatedAt, jobs: queue, manifestId: mediaOS?.orchestrationId ?? mediaOS?.deterministicBasis ?? "media-os-manifest" });
  const preliminaryRecovery = buildMediaRecoveryManifest({ generatedAt, jobs: queue, providers, storage: preliminaryStorage });
  const deadLetters = buildDeadLetterManifest(jobs, preliminaryRecovery.replayPlans, generatedAt);
  const recovery = buildMediaRecoveryManifest({ generatedAt, jobs: queue, providers, storage: preliminaryStorage, deadLetters });
  const storage = preliminaryStorage;
  const observability = buildMediaObservabilityManifest({ generatedAt, jobs: queue, providers, costs, storage, recovery });
  const operationalEvents = sortOperationalMediaOSEvents([
    createOperationalMediaOSEvent({ sequence: 1, name: OPERATIONAL_MEDIA_OS_EVENT_NAMES.JOB_QUEUED, jobId: renderJob.jobId, jobState: renderJob.state, contract: "JobQueueManifest", producer: "mediaJobQueue", severity: "info", timestamp: generatedAt, notes: "Render planning job is queued behind validation and capacity controls." }),
    createOperationalMediaOSEvent({ sequence: 2, name: OPERATIONAL_MEDIA_OS_EVENT_NAMES.PROVIDER_HEALTH_EVALUATED, jobId: null, jobState: null, contract: "ProviderReliabilityManifest", producer: "providerReliabilityManager", severity: providers.unavailableCount > 0 ? "blocking" : "info", timestamp: generatedAt, notes: `${providers.healthyCount} healthy providers and ${providers.fallbackReadyCount} fallback paths evaluated.` }),
    createOperationalMediaOSEvent({ sequence: 3, name: OPERATIONAL_MEDIA_OS_EVENT_NAMES.BUDGET_GUARD_EVALUATED, jobId: null, jobState: null, contract: "CostGovernanceManifest", producer: "mediaCostGovernance", severity: costs.blockedByBudget ? "blocking" : "info", timestamp: generatedAt, notes: `$${costs.estimatedTotalUsd.toFixed(2)} operational estimate evaluated against budget.` }),
    createOperationalMediaOSEvent({ sequence: 4, name: OPERATIONAL_MEDIA_OS_EVENT_NAMES.STORAGE_LIFECYCLE_EVALUATED, jobId: null, jobState: null, contract: "StorageGovernanceManifest", producer: "mediaStorageGovernance", severity: storage.partialCount > 0 ? "warning" : "info", timestamp: generatedAt, notes: `${storage.durableCount} durable records and ${storage.cleanupEligibleCount} cleanup-eligible records evaluated.` }),
    createOperationalMediaOSEvent({ sequence: 5, name: OPERATIONAL_MEDIA_OS_EVENT_NAMES.RECOVERY_READINESS_EVALUATED, jobId: null, jobState: null, contract: "RecoveryManifest", producer: "mediaRecoveryPlanner", severity: recovery.rollbackReady ? "info" : "warning", timestamp: generatedAt, notes: `${recovery.recoveryReadyCount} replay plans are immediately recovery-ready.` }),
  ]);

  const warnings = [
    ...queue.warnings,
    ...providers.warnings,
    ...costs.warnings,
    ...storage.warnings,
    ...recovery.warnings,
    ...observability.alerts,
    ...transitionAudit.warnings,
  ];

  return {
    version: "creatorvault.operational_media_os.v1",
    generatedAt,
    contracts: OPERATIONAL_CONTRACT_COVERAGE,
    jobs: queue,
    providers,
    observability,
    costs,
    storage,
    recovery,
    deadLetters,
    readiness: {
      canAcceptJobs: queue.capacityAvailable && queue.idempotencyKeysUnique,
      canRetrySafely: queue.stalledCount === 0,
      canReplaySafely: recovery.rollbackReady,
      budgetSafe: !costs.blockedByBudget,
      storageSafe: storage.artifacts.every((artifact) => artifact.artifactClass !== "final" || artifact.durable),
      providerFallbacksReady: providers.fallbackReadyCount >= 3,
      noGodService: true,
    },
    warnings: warnings.filter((warning, index, all) => all.findIndex((candidate) => candidate.source === warning.source && candidate.message === warning.message && candidate.severity === warning.severity) === index),
    operationalEvents,
    persistedJobLedger,
    schedulerDecision,
  };
}

