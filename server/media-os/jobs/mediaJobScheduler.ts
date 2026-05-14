import { operationalWarning, type JobQueueSnapshot, type SchedulerDecision } from "../contracts/operationalContracts";

export function scheduleMediaJobs(queue: JobQueueSnapshot, schedulerId = "creatorvault-media-job-scheduler"): SchedulerDecision {
  const capacityRemaining = Math.max(0, queue.concurrencyLimit - queue.activeCount);
  const selectedJobIds = queue.runnableJobIds.slice(0, capacityRemaining);
  const deferredJobIds = queue.runnableJobIds.slice(capacityRemaining);
  const warnings = [
    ...queue.warnings,
    ...(capacityRemaining === 0 && queue.pendingCount > 0 ? [operationalWarning("mediaJobScheduler", "Queue has pending jobs but no capacity remains", "warning")] : []),
  ];

  return {
    schedulerId,
    generatedAt: queue.generatedAt,
    selectedJobIds,
    deferredJobIds,
    capacityRemaining: Math.max(0, capacityRemaining - selectedJobIds.length),
    reason: selectedJobIds.length > 0 ? "Selected highest-priority runnable jobs within capacity" : "No runnable jobs selected",
    warnings,
  };
}

