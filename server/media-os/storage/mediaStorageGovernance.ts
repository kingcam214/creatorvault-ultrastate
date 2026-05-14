import {
  operationalWarning,
  type ArtifactLifecycleRecord,
  type JobQueueSnapshot,
  type StorageGovernanceManifest,
} from "../contracts/operationalContracts";

export function buildMediaStorageGovernance(input: { generatedAt: string; jobs: JobQueueSnapshot; manifestId: string }): StorageGovernanceManifest {
  const artifacts: ArtifactLifecycleRecord[] = [
    {
      artifactId: `manifest:${input.manifestId}`,
      artifactClass: "manifest",
      durable: true,
      cleanupEligible: false,
      retentionPolicy: "durable_manifest_proof_never_silent_delete",
      storagePath: null,
      relatedJobId: null,
      warning: null,
    },
    ...input.jobs.jobs.map((job): ArtifactLifecycleRecord => {
      const partial = job.state === "failed" || job.state === "retry_wait" || job.state === "dead_lettered";
      return {
        artifactId: `job-artifact:${job.jobId}`,
        artifactClass: job.kind === "render_execution" ? (job.state === "completed" ? "final" : partial ? "partial" : "intermediate") : "diagnostic",
        durable: job.kind === "render_execution" && job.state === "completed",
        cleanupEligible: partial && job.state !== "retry_wait",
        retentionPolicy: partial ? "retain_until_recovery_or_dead_letter_review" : "retain_for_operational_trace",
        storagePath: null,
        relatedJobId: job.jobId,
        warning: partial ? "Partial or failed job artifact requires recovery-aware retention." : null,
      };
    }),
  ];

  return {
    contract: "StorageGovernanceManifest",
    generatedAt: input.generatedAt,
    artifacts,
    durableCount: artifacts.filter((artifact) => artifact.durable).length,
    cleanupEligibleCount: artifacts.filter((artifact) => artifact.cleanupEligible).length,
    partialCount: artifacts.filter((artifact) => artifact.artifactClass === "partial").length,
    warnings: artifacts.filter((artifact) => artifact.warning).map((artifact) => operationalWarning("mediaStorageGovernance", artifact.warning, "warning")),
  };
}

