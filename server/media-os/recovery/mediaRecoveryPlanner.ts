import {
  operationalWarning,
  type DeadLetterManifest,
  type JobQueueSnapshot,
  type ProviderReliabilityManifest,
  type RecoveryManifest,
  type ReplayPlan,
  type StorageGovernanceManifest,
} from "../contracts/operationalContracts";
import { buildReplayPlans } from "../jobs/mediaJobReplay";

export function buildMediaRecoveryManifest(input: {
  generatedAt: string;
  jobs: JobQueueSnapshot;
  providers: ProviderReliabilityManifest;
  storage: StorageGovernanceManifest;
  deadLetters?: DeadLetterManifest;
}): RecoveryManifest {
  const replayPlans: ReplayPlan[] = buildReplayPlans(input.jobs.jobs, input.generatedAt);
  const recoveryReadyCount = replayPlans.filter((plan) => plan.eligible && plan.expectedNextState !== "dead_lettered").length;
  const deadLetterReviewCount = replayPlans.filter((plan) => plan.resumeMode === "dead_letter_review" || plan.expectedNextState === "dead_lettered").length + (input.deadLetters?.count ?? 0);
  const fallbackCoverage = input.providers.providers.filter((provider) => provider.fallbackProviderIds.length > 0).length;
  const rollbackReady = input.storage.artifacts.some((artifact) => artifact.artifactClass === "manifest" && artifact.durable) && input.jobs.idempotencyKeysUnique;

  return {
    contract: "RecoveryManifest",
    generatedAt: input.generatedAt,
    replayPlans,
    recoveryReadyCount,
    deadLetterReviewCount,
    rollbackReady,
    warnings: [
      ...replayPlans.flatMap((plan) => plan.warnings),
      ...(fallbackCoverage === 0 ? [operationalWarning("mediaRecoveryPlanner", "No provider fallback coverage available for recovery", "warning")] : []),
      ...(!rollbackReady ? [operationalWarning("mediaRecoveryPlanner", "Rollback readiness requires durable manifest and unique idempotency keys", "blocking")] : []),
    ],
  };
}

