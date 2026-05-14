import {
  operationalWarning,
  type JobQueueSnapshot,
  type MediaJobSnapshot,
  type OperationalWarning,
} from "../contracts/operationalContracts";

const ACTIVE_STATES = new Set(["scheduled", "running"]);
const PENDING_STATES = new Set(["created", "queued", "retry_wait"]);

export function buildJobId(kind: string, trailerProjectId: string | null, suffix: string): string {
  return ["media-job", kind, trailerProjectId ?? "no-project", suffix].join(":");
}

export function buildIdempotencyKey(kind: string, trailerProjectId: string | null, selectedAssetIds: string[], suffix = "default"): string {
  const assets = selectedAssetIds.length > 0 ? selectedAssetIds.join("|") : "no-assets";
  return ["media-os", kind, trailerProjectId ?? "no-project", assets, suffix].join(":");
}

export function createMediaJobSnapshot(input: Omit<MediaJobSnapshot, "snapshotReference" | "warnings" | "transitions"> & { warnings?: OperationalWarning[]; transitions?: MediaJobSnapshot["transitions"] }): MediaJobSnapshot {
  const snapshotReference = ["job-snapshot", input.jobId, input.state, input.retryPolicy.attempt, input.idempotencyKey].join(":");
  return {
    ...input,
    snapshotReference,
    replayEligible: input.replayEligible,
    warnings: input.warnings ?? [],
    transitions: input.transitions ?? [],
  };
}

export function buildMediaJobQueueSnapshot(input: {
  queueId: string;
  generatedAt: string;
  concurrencyLimit: number;
  jobs: MediaJobSnapshot[];
}): JobQueueSnapshot {
  const keys = input.jobs.map((job) => job.idempotencyKey);
  const uniqueKeys = new Set(keys);
  const duplicateSuppressed = Math.max(0, keys.length - uniqueKeys.size);
  const activeCount = input.jobs.filter((job) => ACTIVE_STATES.has(job.state)).length;
  const pendingCount = input.jobs.filter((job) => PENDING_STATES.has(job.state)).length;
  const completedCount = input.jobs.filter((job) => job.state === "completed").length;
  const failedCount = input.jobs.filter((job) => job.state === "failed").length;
  const deadLetterCount = input.jobs.filter((job) => job.state === "dead_lettered").length;
  const stalledCount = input.jobs.filter((job) => job.state === "retry_wait" && job.retryPolicy.nextRetryAt === null).length;
  const runnableJobIds = input.jobs
    .filter((job) => (job.state === "queued" || job.state === "retry_wait") && activeCount < input.concurrencyLimit)
    .sort((a, b) => b.priority - a.priority || a.createdAt.localeCompare(b.createdAt))
    .map((job) => job.jobId);
  const blockedJobIds = input.jobs
    .filter((job) => job.state === "failed" || job.state === "dead_lettered" || (job.dependsOn.length > 0 && !job.dependsOn.every((dep) => input.jobs.some((candidate) => candidate.jobId === dep && candidate.state === "completed"))))
    .map((job) => job.jobId);

  const warnings: OperationalWarning[] = [
    ...(duplicateSuppressed > 0 ? [operationalWarning("mediaJobQueue", `${duplicateSuppressed} duplicate idempotency key(s) detected`, "blocking")] : []),
    ...(activeCount > input.concurrencyLimit ? [operationalWarning("mediaJobQueue", "Active job count exceeds queue concurrency limit", "blocking")] : []),
    ...(stalledCount > 0 ? [operationalWarning("mediaJobQueue", `${stalledCount} retry job(s) have no nextRetryAt timestamp`, "warning")] : []),
  ];

  return {
    contract: "JobQueueManifest",
    queueId: input.queueId,
    generatedAt: input.generatedAt,
    concurrencyLimit: input.concurrencyLimit,
    activeCount,
    pendingCount,
    stalledCount,
    completedCount,
    failedCount,
    deadLetterCount,
    duplicateSuppressed,
    capacityAvailable: activeCount < input.concurrencyLimit,
    idempotencyKeysUnique: duplicateSuppressed === 0,
    enqueueOrder: [...input.jobs].sort((a, b) => a.createdAt.localeCompare(b.createdAt)).map((job) => job.jobId),
    runnableJobIds,
    blockedJobIds,
    jobs: input.jobs,
    warnings,
  };
}

