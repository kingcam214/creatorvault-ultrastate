import {
  approveGovernedPolloJob,
  authorizeSingleUseGovernedPolloSubmission,
  closeUnusedPersonaContinuityApproval,
  createGovernedPolloDraft,
  getGovernedPolloJob,
  getGovernedPolloJobByRequestId,
  isGovernedPolloExecutionEnabled,
  pollGovernedPolloProviderJob,
  recordGovernedPersonaContinuityIngestion,
  reconcileGovernedPersonaContinuitySubmission,
  submitGovernedPolloJob,
  type GovernedPolloJob,
} from "./governedPolloService";
import {
  buildPersonaContinuityPrompt,
  buildPersonaContinuityProviderInput,
  continuityContextSchema,
  PERSONA_CONTINUITY_MODE,
  PERSONA_CONTINUITY_MODEL,
  quotePersonaContinuityProvider,
  type ContinuityContext,
} from "./personaContinuityProviderContract";
import {
  assertPersonaChainOwner,
  identityHash,
  type ChainAuthorization,
  type TrustedPersonaChainOwnerActor,
} from "./personaVaultContracts";
import { getVideoChainStatus } from "./personaVaultService";

export type VideoChainRenderJob = {
  id: string;
  state: GovernedPolloJob["state"];
  fingerprint: string;
  estimatedCredits: number | null;
  providerJobId: string | null;
  outputUrl: string | null;
};
export interface PersonaVideoProvider {
  canSubmit(): boolean;
  findDraft(context: ContinuityContext): Promise<VideoChainRenderJob | null>;
  createDraft(
    context: ContinuityContext,
    maximumCredits: number
  ): Promise<VideoChainRenderJob>;
  getJob(jobId: string): Promise<VideoChainRenderJob>;
  submit(
    job: VideoChainRenderJob,
    authorization: ChainAuthorization,
    workerId: string
  ): Promise<VideoChainRenderJob>;
  poll(jobId: string, ownerId: number): Promise<VideoChainRenderJob>;
  markIngested(
    jobId: string,
    segment: { id: string },
    ownerId: number
  ): Promise<void>;
  closeUnusedApproval(jobId: string, reason: string): Promise<boolean>;
}
function providerJob(job: GovernedPolloJob): VideoChainRenderJob {
  return {
    id: String(job.id),
    state: job.state,
    fingerprint: job.fingerprint,
    estimatedCredits: job.estimatedCostCredits,
    providerJobId: job.providerJobId,
    outputUrl: job.artifactUrl ?? job.outputUrl,
  };
}
function numericJobId(value: string): number {
  const id = Number(value);
  if (!Number.isSafeInteger(id) || id <= 0)
    throw new Error("Invalid governed provider job ID");
  return id;
}
function draftArguments(context: ContinuityContext) {
  return {
    provider: "pollo" as const,
    providerModelPath: PERSONA_CONTINUITY_MODEL,
    mode: PERSONA_CONTINUITY_MODE,
    sourceUrl: context.sourceFrameUrl,
    sourceChecksum: context.sourceFrameSha256,
    prompt: buildPersonaContinuityPrompt({
      chainId: context.chainId,
      segmentId: context.segmentId,
      snapshot: context.snapshot,
      camera: context.camera,
      incomingCamera: context.incomingCamera,
      endFrameUrl: context.endFrameUrl,
      promptText: context.promptText,
    }),
    durationSeconds: context.durationSec,
    metadata: { personaContinuity: context },
  };
}
export const governedPersonaVideoProvider: PersonaVideoProvider = {
  canSubmit: isGovernedPolloExecutionEnabled,
  async findDraft(context) {
    const job = await getGovernedPolloJobByRequestId(
      `${context.segmentId}:${context.attempt}`
    );
    if (!job) return null;
    const stored = continuityContextSchema.parse(
      job.metadata.personaContinuity
    );
    if (
      job.creatorId !== context.snapshot.userId ||
      identityHash(stored) !== identityHash(context)
    )
      throw new Error(
        "Recovered render draft conflicts with the immutable chain request"
      );
    buildPersonaContinuityProviderInput(job);
    return providerJob(job);
  },
  async createDraft(context, maximumCredits) {
    const argumentsForDraft = draftArguments(context);
    const quote = await quotePersonaContinuityProvider(
      buildPersonaContinuityProviderInput(argumentsForDraft)
    );
    if (quote.credits > maximumCredits)
      throw new Error(
        "The exact provider quote exceeds the owner-authorized per-segment ceiling; no generation was submitted"
      );
    const result = await createGovernedPolloDraft({
      ...argumentsForDraft,
      creatorId: context.snapshot.userId,
      requestedBy: context.snapshot.userId,
      resolution: "1080p",
      aspectRatio: context.aspectRatio,
      outputCount: 1,
      estimatedCostCredits: quote.credits,
      costEvidenceReference: quote.evidence,
      ownershipConfirmed: true,
      consentConfirmed: true,
      requestId: `${context.segmentId}:${context.attempt}`,
      idempotencyKey: `persona-chain:${identityHash({ chainId: context.chainId, segmentId: context.segmentId, attempt: context.attempt })}`,
      metadata: {
        ...argumentsForDraft.metadata,
        ownerDirectedPilot: true,
        candidateLimit: 1,
        noAutomaticRetry: true,
        sourcePreservationRequired: true,
        hardCreditCap: quote.credits,
        providerQuote: quote,
      },
    });
    return providerJob(result.job);
  },
  async getJob(jobId) {
    const job = await getGovernedPolloJob(numericJobId(jobId));
    if (!job)
      throw new Error(
        "The persisted governed render job was not found; do not create a replacement automatically"
      );
    return providerJob(job);
  },
  async submit(job, authorization, workerId) {
    if (!isGovernedPolloExecutionEnabled())
      throw new Error(
        "Governed media execution is frozen; no generation was submitted"
      );
    if (
      !job.estimatedCredits ||
      job.estimatedCredits > authorization.maxCreditsPerSegment
    )
      throw new Error(
        "The render quote is not covered by this chain authorization"
      );
    const remainingMinutes = Math.floor(
      (Date.parse(authorization.expiresAt) - Date.now()) / 60000
    );
    if (remainingMinutes < 1)
      throw new Error(
        "The chain's bounded execution window has ended; no generation was submitted"
      );
    try {
      const approved = await approveGovernedPolloJob({
        jobId: numericJobId(job.id),
        approverId: authorization.ownerId,
        expectedFingerprint: job.fingerprint,
        reason: authorization.reason,
      });
      await authorizeSingleUseGovernedPolloSubmission({
        jobId: approved.id,
        ownerId: authorization.ownerId,
        expectedFingerprint: approved.fingerprint,
        hardCreditCap: job.estimatedCredits,
        reason: authorization.reason,
        expiresInMinutes: Math.min(remainingMinutes, 30),
      });
      return providerJob(
        await submitGovernedPolloJob({ jobId: approved.id, workerId })
      );
    } catch (error) {
      await closeUnusedPersonaContinuityApproval({
        jobId: numericJobId(job.id),
        reason:
          error instanceof Error
            ? error.message
            : "Unused chain approval failed",
      });
      throw error;
    }
  },
  async poll(jobId, ownerId) {
    return providerJob(
      await pollGovernedPolloProviderJob({
        jobId: numericJobId(jobId),
        actorId: ownerId,
      })
    );
  },
  async markIngested(jobId, segment, ownerId) {
    await recordGovernedPersonaContinuityIngestion({
      jobId: numericJobId(jobId),
      ownerId,
      segmentId: segment.id,
    });
  },
  async closeUnusedApproval(jobId, reason) {
    return closeUnusedPersonaContinuityApproval({
      jobId: numericJobId(jobId),
      reason,
    });
  },
};

export async function reconcilePersonaContinuityReceipt(
  actor: TrustedPersonaChainOwnerActor,
  input: {
    creatorId: number;
    chainId: string;
    segmentId: string;
    providerTaskId: string;
  }
) {
  assertPersonaChainOwner(actor);
  const status = await getVideoChainStatus(input.creatorId, input.chainId);
  const segment = status.segments.find(
    candidate => candidate.id === input.segmentId
  );
  if (
    !segment ||
    segment.segmentStatus !== "submission_unknown" ||
    !segment.renderJobId
  )
    throw new Error(
      "Only the persisted uncertain segment can receive a provider receipt"
    );
  const reconciled = await reconcileGovernedPersonaContinuitySubmission({
    jobId: numericJobId(segment.renderJobId),
    ownerId: actor.id,
    providerTaskId: input.providerTaskId,
  });
  return {
    chainId: status.id,
    segmentId: segment.id,
    providerTaskId: reconciled.providerJobId,
    state: reconciled.state,
    requiresExplicitRecovery: true as const,
  };
}
