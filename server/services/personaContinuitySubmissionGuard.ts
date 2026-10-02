import { and, asc, eq } from "drizzle-orm";
import {
  videoChainSegments,
  videoGenerationChains,
} from "../../drizzle/schema-persona-vaults";
import { getPersonaVaultDb } from "../db";
import {
  chainAuthorizationSchema,
  identityHash,
  personaSnapshotSchema,
} from "./personaVaultContracts";
import { continuityContextSchema } from "./personaContinuityProviderContract";
import { assertVideoChainFrameIntegrity } from "./videoChainMedia";

export async function assertPersonaContinuitySubmission(job: {
  id: number;
  creatorId: number;
  approvedBy: number | null;
  estimatedCostCredits: number | null;
  leaseOwner: string | null;
  metadata: Record<string, unknown>;
}): Promise<void> {
  const context = continuityContextSchema.parse(job.metadata.personaContinuity);
  const database = await getPersonaVaultDb();
  const [chain] = await database
    .select()
    .from(videoGenerationChains)
    .where(eq(videoGenerationChains.id, context.chainId))
    .limit(1);
  if (
    !chain ||
    chain.userId !== job.creatorId ||
    chain.authorizationClosedAt ||
    chain.chainStatus === "failed" ||
    chain.chainStatus === "complete" ||
    !chain.authorization
  )
    throw new Error("This chain has no open owner authorization");
  const authorization = chainAuthorizationSchema.parse(chain.authorization);
  if (
    authorization.requestHash !== chain.requestHash ||
    authorization.ownerId !== job.approvedBy ||
    Date.parse(authorization.expiresAt) <= Date.now()
  )
    throw new Error(
      "This chain authorization expired or no longer matches its exact owner-approved request"
    );
  if (
    !chain.leaseToken ||
    !chain.leaseExpiresAt ||
    chain.leaseExpiresAt.getTime() <= Date.now()
  )
    throw new Error("The chain worker no longer holds a valid lease");
  if (job.leaseOwner && job.leaseOwner !== `persona-chain:${chain.leaseToken}`)
    throw new Error("This paid submission belongs to a stale chain worker");
  if (
    !job.estimatedCostCredits ||
    job.estimatedCostCredits > authorization.maxCreditsPerSegment
  )
    throw new Error(
      "This render is not inside the chain's owner-approved credit ceiling"
    );
  if (
    identityHash(personaSnapshotSchema.parse(chain.personaSnapshot)) !==
    identityHash(context.snapshot)
  )
    throw new Error(
      "The persona identity snapshot no longer matches the authorized chain"
    );
  const segments = await database
    .select()
    .from(videoChainSegments)
    .where(eq(videoChainSegments.chainId, chain.id))
    .orderBy(asc(videoChainSegments.segmentOrder));
  const segment = segments.find(
    candidate => candidate.id === context.segmentId
  );
  const firstIncomplete = segments.find(
    candidate => candidate.segmentStatus !== "complete"
  );
  if (
    !segment ||
    firstIncomplete?.id !== segment.id ||
    segment.renderJobId !== String(job.id) ||
    segment.attempt !== context.attempt ||
    segment.segmentOrder !== context.segmentOrder ||
    segment.segmentStatus !== "generating"
  )
    throw new Error(
      "This render is not the bound, next unfinished segment of its chain"
    );
  const shot = chain.requestPayload.shots[segment.segmentOrder - 1];
  if (
    !shot ||
    segments.length !== chain.requestPayload.shots.length ||
    shot.promptText !== context.promptText ||
    shot.durationSec !== context.durationSec ||
    context.aspectRatio !== chain.aspectRatio ||
    context.frameRate !== chain.frameRate ||
    segments.filter(candidate => candidate.segmentStatus !== "complete")
      .length > authorization.maximumOutputs
  )
    throw new Error(
      "The segment is outside the immutable owner-approved shot sequence or output ceiling"
    );
  if (
    segment.startFrameUrl !== context.sourceFrameUrl ||
    segment.startFrameSha256 !== context.sourceFrameSha256 ||
    segment.endFrameUrl !== context.endFrameUrl ||
    segment.endFrameSha256 !== context.endFrameSha256 ||
    identityHash(segment.cameraMetadata) !== identityHash(context.camera) ||
    identityHash(segment.inheritedCameraMetadata) !==
      identityHash(context.incomingCamera)
  )
    throw new Error(
      "The provider request does not match the persisted frame and camera handoff"
    );
  const previous = segments.find(
    candidate => candidate.segmentOrder === segment.segmentOrder - 1
  );
  if (
    segment.segmentOrder > 1 &&
    (!previous ||
      previous.segmentStatus !== "complete" ||
      previous.terminalFrameExtractedUrl !== context.sourceFrameUrl ||
      previous.terminalFrameSha256 !== context.sourceFrameSha256)
  )
    throw new Error(
      "The preceding segment's exact terminal frame is not ready"
    );
  await assertVideoChainFrameIntegrity({
    url: context.sourceFrameUrl,
    sha256: context.sourceFrameSha256,
    aspectRatio: context.aspectRatio,
  });
  if (context.endFrameUrl && context.endFrameSha256)
    await assertVideoChainFrameIntegrity({
      url: context.endFrameUrl,
      sha256: context.endFrameSha256,
      aspectRatio: context.aspectRatio,
    });
  const [latest] = await database
    .select()
    .from(videoGenerationChains)
    .where(eq(videoGenerationChains.id, chain.id))
    .limit(1);
  if (
    !latest ||
    latest.leaseToken !== chain.leaseToken ||
    !latest.leaseExpiresAt ||
    latest.leaseExpiresAt.getTime() <= Date.now() ||
    latest.authorizationClosedAt ||
    !latest.authorization ||
    Date.parse(latest.authorization.expiresAt) <= Date.now() ||
    latest.requestHash !== chain.requestHash ||
    latest.authorization.ownerId !== job.approvedBy
  )
    throw new Error(
      "The owner authorization or worker lease closed during native frame verification"
    );
}

export async function getPersonaContinuityIngestion(
  job: { id: number; creatorId: number; metadata: Record<string, unknown> },
  segmentId: string
) {
  const context = continuityContextSchema.parse(job.metadata.personaContinuity);
  if (
    context.segmentId !== segmentId ||
    context.snapshot.userId !== job.creatorId
  )
    throw new Error(
      "The ingestion record does not belong to this governed identity render"
    );
  const database = await getPersonaVaultDb();
  const [segment] = await database
    .select()
    .from(videoChainSegments)
    .where(
      and(
        eq(videoChainSegments.id, segmentId),
        eq(videoChainSegments.chainId, context.chainId)
      )
    )
    .limit(1);
  if (
    !segment ||
    segment.renderJobId !== String(job.id) ||
    segment.segmentStatus !== "complete" ||
    !segment.streamUrl ||
    !segment.terminalFrameExtractedUrl ||
    !segment.terminalFrameSha256 ||
    !segment.frameCount
  )
    throw new Error(
      "A real persisted segment and extracted terminal frame are required before releasing render concurrency"
    );
  return {
    segmentId: segment.id,
    streamUrl: segment.streamUrl,
    terminalFrameUrl: segment.terminalFrameExtractedUrl,
    terminalFrameSha256: segment.terminalFrameSha256,
    frameCount: segment.frameCount,
  };
}
