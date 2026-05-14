import { operationalWarning, type MediaJobSnapshot, type ReplayPlan } from "../contracts/operationalContracts";

export function buildReplayPlan(job: MediaJobSnapshot, generatedAt: string): ReplayPlan {
  const attemptsExhausted = job.retryPolicy.attempt >= job.retryPolicy.maxAttempts;
  const eligible = job.replayEligible && job.snapshotReference.length > 0 && job.state !== "dead_lettered" && job.state !== "cancelled";
  const resumeMode: ReplayPlan["resumeMode"] = !eligible
    ? "dead_letter_review"
    : job.state === "completed"
      ? "rollback_safe_noop"
      : job.providerId
        ? "fallback_provider"
        : job.state === "retry_wait"
          ? "retry_stage"
          : "replay_from_manifest";
  const expectedNextState = eligible && !attemptsExhausted ? "queued" : "dead_lettered";

  return {
    replayPlanId: `replay:${job.jobId}:${generatedAt}`,
    sourceJobId: job.jobId,
    eligible,
    replayFromState: job.state,
    resumeMode,
    requiredSnapshotReference: job.snapshotReference,
    expectedNextState,
    reason: eligible ? "Replay can proceed from persisted job snapshot and deterministic manifest reference." : "Replay requires dead-letter review or is intentionally disabled.",
    warnings: [
      ...(attemptsExhausted ? [operationalWarning("mediaJobReplay", `${job.jobId} has exhausted retry attempts`, "warning")] : []),
      ...(!eligible ? [operationalWarning("mediaJobReplay", `${job.jobId} is not directly replay eligible`, "blocking")] : []),
    ],
  };
}

export function buildReplayPlans(jobs: MediaJobSnapshot[], generatedAt: string): ReplayPlan[] {
  return jobs
    .filter((job) => job.state === "failed" || job.state === "retry_wait" || job.state === "completed" || job.state === "dead_lettered")
    .map((job) => buildReplayPlan(job, generatedAt));
}

