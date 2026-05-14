import {
  operationalWarning,
  type JobQueueSnapshot,
  type ObservabilityManifest,
  type ProviderReliabilityManifest,
  type CostGovernanceManifest,
  type StorageGovernanceManifest,
  type RecoveryManifest,
} from "../contracts/operationalContracts";

export function buildMediaObservabilityManifest(input: {
  generatedAt: string;
  jobs: JobQueueSnapshot;
  providers: ProviderReliabilityManifest;
  costs: CostGovernanceManifest;
  storage: StorageGovernanceManifest;
  recovery: RecoveryManifest;
}): ObservabilityManifest {
  const alerts = [
    ...input.jobs.warnings,
    ...input.providers.warnings,
    ...input.costs.warnings,
    ...input.storage.warnings,
    ...input.recovery.warnings,
    ...(input.jobs.deadLetterCount > 0 ? [operationalWarning("mediaObservability", "Dead-lettered media jobs require review", "blocking")] : []),
  ];

  return {
    contract: "ObservabilityManifest",
    generatedAt: input.generatedAt,
    metrics: [
      { name: "media_jobs_pending", value: input.jobs.pendingCount, unit: "jobs", severity: input.jobs.pendingCount > 0 ? "info" : "info" },
      { name: "media_jobs_running", value: input.jobs.activeCount, unit: "jobs", severity: "info" },
      { name: "media_jobs_failed", value: input.jobs.failedCount, unit: "jobs", severity: input.jobs.failedCount > 0 ? "warning" : "info" },
      { name: "media_jobs_dead_lettered", value: input.jobs.deadLetterCount, unit: "jobs", severity: input.jobs.deadLetterCount > 0 ? "blocking" : "info" },
      { name: "provider_fallbacks_ready", value: input.providers.fallbackReadyCount, unit: "providers", severity: "info" },
      { name: "estimated_media_ops_cost", value: Number(input.costs.estimatedTotalUsd.toFixed(2)), unit: "usd", severity: input.costs.blockedByBudget ? "blocking" : "info" },
      { name: "cleanup_eligible_artifacts", value: input.storage.cleanupEligibleCount, unit: "artifacts", severity: input.storage.cleanupEligibleCount > 0 ? "warning" : "info" },
      { name: "recovery_ready_jobs", value: input.recovery.recoveryReadyCount, unit: "plans", severity: "info" },
    ],
    traces: input.jobs.jobs.map((job, index) => ({
      sequence: index + 1,
      subject: job.jobId,
      state: job.state,
      deterministicReference: job.snapshotReference,
      explanation: `${job.kind} is ${job.state} with attempt ${job.retryPolicy.attempt}/${job.retryPolicy.maxAttempts}.`,
    })),
    alerts,
    debuggerPanels: [
      { panelId: "queue", title: "Queue State", status: input.jobs.capacityAvailable ? "capacity_available" : "capacity_full", summary: `${input.jobs.activeCount}/${input.jobs.concurrencyLimit} active jobs, ${input.jobs.pendingCount} pending.` },
      { panelId: "providers", title: "Provider Reliability", status: `${input.providers.healthyCount}_healthy`, summary: `${input.providers.fallbackReadyCount} providers have fallback paths.` },
      { panelId: "costs", title: "Cost Governance", status: input.costs.blockedByBudget ? "blocked" : "within_budget", summary: `$${input.costs.estimatedTotalUsd.toFixed(2)} estimated against $${input.costs.budgetLimitUsd.toFixed(2)} budget.` },
      { panelId: "storage", title: "Storage Governance", status: input.storage.partialCount > 0 ? "partials_visible" : "durable", summary: `${input.storage.durableCount} durable artifact records, ${input.storage.cleanupEligibleCount} cleanup-eligible records.` },
      { panelId: "recovery", title: "Recovery Readiness", status: input.recovery.rollbackReady ? "rollback_ready" : "review_needed", summary: `${input.recovery.recoveryReadyCount} replay plan(s), ${input.recovery.deadLetterReviewCount} dead-letter review item(s).` },
    ],
  };
}

