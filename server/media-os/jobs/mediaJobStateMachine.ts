import {
  operationalWarning,
  type JobStateValidationResult,
  type MediaJobSnapshot,
  type MediaJobState,
  type MediaJobTransition,
} from "../contracts/operationalContracts";

export const MEDIA_JOB_TERMINAL_STATES: MediaJobState[] = ["completed", "dead_lettered", "cancelled"];

export const MEDIA_JOB_ALLOWED_TRANSITIONS: Record<MediaJobState, MediaJobState[]> = {
  created: ["queued", "cancelled"],
  queued: ["scheduled", "cancelled", "dead_lettered"],
  scheduled: ["running", "retry_wait", "cancelled"],
  running: ["completed", "retry_wait", "failed", "dead_lettered", "cancelled"],
  retry_wait: ["queued", "scheduled", "dead_lettered", "cancelled"],
  failed: ["queued", "dead_lettered"],
  completed: [],
  dead_lettered: [],
  cancelled: [],
};

function makeTransitionReference(jobId: string, from: MediaJobState, to: MediaJobState, actor: string, reason: string): string {
  return ["media-job-transition", jobId, from, to, actor, reason].join(":");
}

export function canTransitionMediaJob(from: MediaJobState, to: MediaJobState): boolean {
  return MEDIA_JOB_ALLOWED_TRANSITIONS[from]?.includes(to) ?? false;
}

export function validateMediaJobTransition(input: {
  jobId: string;
  from: MediaJobState;
  to: MediaJobState;
  actor: string;
  reason: string;
  occurredAt: string;
}): JobStateValidationResult {
  const allowedNextStates = MEDIA_JOB_ALLOWED_TRANSITIONS[input.from] ?? [];
  const valid = allowedNextStates.includes(input.to);
  if (!valid) {
    return {
      valid: false,
      from: input.from,
      to: input.to,
      allowedNextStates,
      blockingReason: `Illegal Media OS job transition ${input.from} -> ${input.to}`,
    };
  }

  const transition: MediaJobTransition = {
    from: input.from,
    to: input.to,
    actor: input.actor,
    reason: input.reason,
    occurredAt: input.occurredAt,
    deterministicReference: makeTransitionReference(input.jobId, input.from, input.to, input.actor, input.reason),
    replayAllowed: !MEDIA_JOB_TERMINAL_STATES.includes(input.to) || input.to === "completed",
  };

  return {
    valid: true,
    from: input.from,
    to: input.to,
    allowedNextStates,
    blockingReason: null,
    transition,
  };
}

export function applyMediaJobTransition(job: MediaJobSnapshot, to: MediaJobState, actor: string, reason: string, occurredAt: string): MediaJobSnapshot {
  const result = validateMediaJobTransition({ jobId: job.jobId, from: job.state, to, actor, reason, occurredAt });
  if (!result.valid || !result.transition) {
    return {
      ...job,
      warnings: [
        ...job.warnings,
        operationalWarning("mediaJobStateMachine", result.blockingReason ?? "Illegal transition", "blocking"),
      ],
    };
  }

  return {
    ...job,
    state: to,
    updatedAt: occurredAt,
    transitions: [...job.transitions, result.transition],
    replayEligible: to === "failed" || to === "retry_wait" || to === "completed",
    warnings: job.warnings,
  };
}

export function assertNoIllegalTransitions(jobs: MediaJobSnapshot[]): { valid: boolean; warnings: ReturnType<typeof operationalWarning>[] } {
  const warnings = jobs.flatMap((job) =>
    job.transitions
      .filter((transition) => !canTransitionMediaJob(transition.from, transition.to))
      .map((transition) => operationalWarning("mediaJobStateMachine", `${job.jobId} has illegal transition ${transition.from} -> ${transition.to}`, "blocking")),
  );
  return { valid: warnings.length === 0, warnings };
}

