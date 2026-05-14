export type OperationalContractName =
  | "JobQueueManifest"
  | "JobStateManifest"
  | "ProviderReliabilityManifest"
  | "ObservabilityManifest"
  | "CostGovernanceManifest"
  | "StorageGovernanceManifest"
  | "RecoveryManifest"
  | "DeadLetterManifest";

export type MediaJobState =
  | "created"
  | "queued"
  | "scheduled"
  | "running"
  | "retry_wait"
  | "completed"
  | "failed"
  | "dead_lettered"
  | "cancelled";

export type MediaJobKind =
  | "manifest_validation"
  | "voiceover_provider"
  | "clone_registry_check"
  | "render_planning"
  | "render_execution"
  | "storage_governance"
  | "distribution_readiness";

export type OperationalSeverity = "info" | "warning" | "blocking";

export interface OperationalWarning {
  severity: OperationalSeverity;
  source: string;
  message: string;
}

export interface MediaJobRetryPolicy {
  maxAttempts: number;
  attempt: number;
  retryableStates: MediaJobState[];
  backoffSeconds: number;
  nextRetryAt: string | null;
}

export interface MediaJobTransition {
  from: MediaJobState;
  to: MediaJobState;
  actor: string;
  reason: string;
  occurredAt: string;
  deterministicReference: string;
  replayAllowed: boolean;
}

export interface MediaJobSnapshot {
  jobId: string;
  kind: MediaJobKind;
  state: MediaJobState;
  priority: number;
  idempotencyKey: string;
  trailerProjectId: string | null;
  dependsOn: string[];
  selectedAssetIds: string[];
  providerId: string | null;
  createdAt: string;
  updatedAt: string;
  retryPolicy: MediaJobRetryPolicy;
  transitions: MediaJobTransition[];
  snapshotReference: string;
  replayEligible: boolean;
  warnings: OperationalWarning[];
}

export interface JobStateValidationResult {
  valid: boolean;
  from: MediaJobState;
  to: MediaJobState;
  blockingReason: string | null;
  allowedNextStates: MediaJobState[];
  transition?: MediaJobTransition;
}

export interface JobQueueSnapshot {
  contract: "JobQueueManifest";
  queueId: string;
  generatedAt: string;
  concurrencyLimit: number;
  activeCount: number;
  pendingCount: number;
  stalledCount: number;
  completedCount: number;
  failedCount: number;
  deadLetterCount: number;
  duplicateSuppressed: number;
  capacityAvailable: boolean;
  idempotencyKeysUnique: boolean;
  enqueueOrder: string[];
  runnableJobIds: string[];
  blockedJobIds: string[];
  jobs: MediaJobSnapshot[];
  warnings: OperationalWarning[];
}

export interface SchedulerDecision {
  schedulerId: string;
  generatedAt: string;
  selectedJobIds: string[];
  deferredJobIds: string[];
  capacityRemaining: number;
  reason: string;
  warnings: OperationalWarning[];
}

export interface PersistedJobLedger {
  ledgerId: string;
  generatedAt: string;
  snapshotCount: number;
  deterministicDigest: string;
  snapshots: MediaJobSnapshot[];
  restoreProof: string;
  warnings: OperationalWarning[];
}

export interface ReplayPlan {
  replayPlanId: string;
  sourceJobId: string;
  eligible: boolean;
  replayFromState: MediaJobState;
  resumeMode: "resume_partial" | "retry_stage" | "replay_from_manifest" | "fallback_provider" | "dead_letter_review" | "rollback_safe_noop";
  requiredSnapshotReference: string;
  expectedNextState: MediaJobState;
  reason: string;
  warnings: OperationalWarning[];
}

export interface DeadLetterRecord {
  deadLetterId: string;
  jobId: string;
  kind: MediaJobKind;
  failedState: MediaJobState;
  attempts: number;
  maxAttempts: number;
  rootCause: string;
  manualInterventionRequired: boolean;
  replayPlanId: string | null;
  deterministicReference: string;
  warnings: OperationalWarning[];
}

export interface DeadLetterManifest {
  contract: "DeadLetterManifest";
  generatedAt: string;
  records: DeadLetterRecord[];
  count: number;
  manualInterventionCount: number;
  warnings: OperationalWarning[];
}

export type ProviderHealthStatus = "healthy" | "degraded" | "unavailable" | "unknown";
export type ProviderCircuitState = "closed" | "half_open" | "open";

export interface ProviderReliabilityRecord {
  providerId: string;
  category: "tts" | "clone" | "render" | "storage" | "distribution";
  capability: string;
  health: ProviderHealthStatus;
  circuitState: ProviderCircuitState;
  averageLatencyMs: number;
  timeoutMs: number;
  failureCount: number;
  successCount: number;
  fallbackProviderIds: string[];
  estimatedCostUsd: number;
  lastFailureReason: string | null;
  warnings: OperationalWarning[];
}

export interface ProviderReliabilityManifest {
  contract: "ProviderReliabilityManifest";
  generatedAt: string;
  providers: ProviderReliabilityRecord[];
  healthyCount: number;
  degradedCount: number;
  unavailableCount: number;
  fallbackReadyCount: number;
  warnings: OperationalWarning[];
}

export interface ObservabilityMetric {
  name: string;
  value: number;
  unit: string;
  severity: OperationalSeverity;
}

export interface ObservabilityTraceEntry {
  sequence: number;
  subject: string;
  state: string;
  deterministicReference: string;
  explanation: string;
}

export interface ObservabilityManifest {
  contract: "ObservabilityManifest";
  generatedAt: string;
  metrics: ObservabilityMetric[];
  traces: ObservabilityTraceEntry[];
  alerts: OperationalWarning[];
  debuggerPanels: Array<{ panelId: string; title: string; status: string; summary: string }>;
}

export interface CostLineItem {
  itemId: string;
  category: "provider" | "retry" | "render" | "storage" | "failure";
  description: string;
  estimatedCostUsd: number;
  budgetGuard: "within_budget" | "warning" | "blocked";
}

export interface CostGovernanceManifest {
  contract: "CostGovernanceManifest";
  generatedAt: string;
  budgetLimitUsd: number;
  estimatedTotalUsd: number;
  retryExposureUsd: number;
  failureExposureUsd: number;
  blockedByBudget: boolean;
  lineItems: CostLineItem[];
  warnings: OperationalWarning[];
}

export type ArtifactClass = "source" | "manifest" | "intermediate" | "partial" | "final" | "thumbnail" | "audio" | "diagnostic";

export interface ArtifactLifecycleRecord {
  artifactId: string;
  artifactClass: ArtifactClass;
  durable: boolean;
  cleanupEligible: boolean;
  retentionPolicy: string;
  storagePath: string | null;
  relatedJobId: string | null;
  warning: string | null;
}

export interface StorageGovernanceManifest {
  contract: "StorageGovernanceManifest";
  generatedAt: string;
  artifacts: ArtifactLifecycleRecord[];
  durableCount: number;
  cleanupEligibleCount: number;
  partialCount: number;
  warnings: OperationalWarning[];
}

export interface RecoveryManifest {
  contract: "RecoveryManifest";
  generatedAt: string;
  replayPlans: ReplayPlan[];
  recoveryReadyCount: number;
  deadLetterReviewCount: number;
  rollbackReady: boolean;
  warnings: OperationalWarning[];
}

export interface OperationalCommandCenterManifest {
  version: "creatorvault.operational_media_os.v1";
  generatedAt: string;
  contracts: OperationalContractName[];
  jobs: JobQueueSnapshot;
  providers: ProviderReliabilityManifest;
  observability: ObservabilityManifest;
  costs: CostGovernanceManifest;
  storage: StorageGovernanceManifest;
  recovery: RecoveryManifest;
  deadLetters: DeadLetterManifest;
  readiness: {
    canAcceptJobs: boolean;
    canRetrySafely: boolean;
    canReplaySafely: boolean;
    budgetSafe: boolean;
    storageSafe: boolean;
    providerFallbacksReady: boolean;
    noGodService: boolean;
  };
  warnings: OperationalWarning[];
}

export const OPERATIONAL_CONTRACT_COVERAGE: OperationalContractName[] = [
  "JobQueueManifest",
  "JobStateManifest",
  "ProviderReliabilityManifest",
  "ObservabilityManifest",
  "CostGovernanceManifest",
  "StorageGovernanceManifest",
  "RecoveryManifest",
  "DeadLetterManifest",
];

export function operationalWarning(source: string, message: unknown, severity: OperationalSeverity = "warning"): OperationalWarning {
  return {
    severity,
    source,
    message: typeof message === "string" ? message : JSON.stringify(message),
  };
}

