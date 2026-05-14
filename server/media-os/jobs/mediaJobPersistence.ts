import { operationalWarning, type MediaJobSnapshot, type PersistedJobLedger } from "../contracts/operationalContracts";

function stableJobProjection(job: MediaJobSnapshot): string {
  return JSON.stringify({
    jobId: job.jobId,
    kind: job.kind,
    state: job.state,
    priority: job.priority,
    idempotencyKey: job.idempotencyKey,
    retry: job.retryPolicy,
    transitions: job.transitions.map((transition) => transition.deterministicReference),
  });
}

export function buildPersistedJobLedger(jobs: MediaJobSnapshot[], generatedAt: string): PersistedJobLedger {
  const ordered = [...jobs].sort((a, b) => a.jobId.localeCompare(b.jobId));
  const deterministicDigest = ordered.map(stableJobProjection).join("|");
  return {
    ledgerId: `media-job-ledger:${generatedAt}:${ordered.length}`,
    generatedAt,
    snapshotCount: ordered.length,
    deterministicDigest,
    snapshots: ordered,
    restoreProof: "Snapshots preserve job ID, idempotency key, state, retry policy, and transition references for deterministic recovery.",
    warnings: ordered.length === 0 ? [operationalWarning("mediaJobPersistence", "No job snapshots were persisted", "warning")] : [],
  };
}

export function restoreJobsFromLedger(ledger: PersistedJobLedger): MediaJobSnapshot[] {
  return [...ledger.snapshots].sort((a, b) => a.jobId.localeCompare(b.jobId));
}

