import { operationalWarning, type DeadLetterManifest, type DeadLetterRecord, type MediaJobSnapshot, type ReplayPlan } from "../contracts/operationalContracts";

export function buildDeadLetterRecord(job: MediaJobSnapshot, replayPlan?: ReplayPlan): DeadLetterRecord | null {
  const exhausted = job.retryPolicy.attempt >= job.retryPolicy.maxAttempts;
  if (job.state !== "dead_lettered" && !(job.state === "failed" && exhausted)) {
    return null;
  }

  return {
    deadLetterId: `dead-letter:${job.jobId}`,
    jobId: job.jobId,
    kind: job.kind,
    failedState: job.state,
    attempts: job.retryPolicy.attempt,
    maxAttempts: job.retryPolicy.maxAttempts,
    rootCause: job.warnings.find((warning) => warning.severity === "blocking")?.message ?? "Retry policy exhausted or terminal failure reached.",
    manualInterventionRequired: true,
    replayPlanId: replayPlan?.replayPlanId ?? null,
    deterministicReference: `dead-letter:${job.jobId}:${job.retryPolicy.attempt}:${job.idempotencyKey}`,
    warnings: [operationalWarning("mediaDeadLetterQueue", `${job.jobId} requires dead-letter review`, "blocking")],
  };
}

export function buildDeadLetterManifest(jobs: MediaJobSnapshot[], replayPlans: ReplayPlan[], generatedAt: string): DeadLetterManifest {
  const records = jobs
    .map((job) => buildDeadLetterRecord(job, replayPlans.find((plan) => plan.sourceJobId === job.jobId)) as DeadLetterRecord | null)
    .filter((record): record is DeadLetterRecord => Boolean(record));

  return {
    contract: "DeadLetterManifest",
    generatedAt,
    records,
    count: records.length,
    manualInterventionCount: records.filter((record) => record.manualInterventionRequired).length,
    warnings: records.flatMap((record) => record.warnings),
  };
}

