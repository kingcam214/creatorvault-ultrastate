import { randomUUID } from "node:crypto";
import { and, asc, eq, sql } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import {
  videoChainSegments,
  videoGenerationChains,
  type VideoGenerationChain,
  type VideoChainSegment,
} from "../../drizzle/schema-persona-vaults";
import { getPersonaVaultDb, type PersonaVaultTransaction } from "../db";
import { getVideoChainStatus } from "./personaVaultService";
import {
  approveVideoChainSchema,
  assertPersonaChainOwner,
  chainAuthorizationSchema,
  identityHash,
  inheritCameraMetadata,
  personaSnapshotSchema,
  startVideoChainSchema,
  type ChainAuthorization,
} from "./personaVaultContracts";
import {
  continuityContextSchema,
  type ContinuityContext,
} from "./personaContinuityProviderContract";
import {
  governedPersonaVideoProvider,
  type PersonaVideoProvider,
} from "./personaVideoProvider";
import {
  getVideoChainMediaRuntime,
  persistPersonaReference,
  persistVideoChainSegmentMedia,
  type VideoChainMediaRuntime,
} from "./videoChainMedia";

const LEASE_MS = 5 * 60 * 1000;
const RETRY_LIMIT = 3;
type FailureStage =
  | "state"
  | "quote"
  | "provider_submission"
  | "provider_poll"
  | "media_ingestion"
  | "housekeeping"
  | "authorization";
export type VideoChainDependencies = {
  provider?: PersonaVideoProvider;
  mediaRuntime?: VideoChainMediaRuntime;
};
function safeMessage(error: unknown): string {
  return (error instanceof Error ? error.message : "Chain processing failed")
    .replace(/x-api-key\s*[:=]\s*[^\s,]+/gi, "x-api-key=[redacted]")
    .slice(0, 1200);
}
function validAuthorization(chain: VideoGenerationChain): ChainAuthorization {
  if (!chain.authorization || chain.authorizationClosedAt)
    throw new Error(
      "An open owner authorization is required before generation"
    );
  const authorization = chainAuthorizationSchema.parse(chain.authorization);
  assertPersonaChainOwner(authorization.ownerId);
  if (
    authorization.requestHash !== chain.requestHash ||
    Date.parse(authorization.expiresAt) <= Date.now()
  )
    throw new Error("The exact chain authorization has expired or changed");
  const input = startVideoChainSchema.parse(chain.requestPayload);
  const snapshot = personaSnapshotSchema.parse(chain.personaSnapshot);
  if (
    identityHash({ userId: chain.userId, input, snapshot }) !==
    chain.requestHash
  )
    throw new Error("The owner-approved chain snapshot was mutated");
  return authorization;
}
async function requireLease(
  tx: PersonaVaultTransaction,
  chainId: string,
  leaseToken: string
): Promise<VideoGenerationChain> {
  const [chain] = await tx
    .select()
    .from(videoGenerationChains)
    .where(eq(videoGenerationChains.id, chainId))
    .for("update");
  if (
    !chain ||
    chain.leaseToken !== leaseToken ||
    !chain.leaseExpiresAt ||
    chain.leaseExpiresAt.getTime() <= Date.now()
  )
    throw new Error(
      "The chain worker lease changed; the stale worker must not advance this chain"
    );
  return chain;
}
export async function approveVideoChain(
  ownerId: number,
  raw: z.input<typeof approveVideoChainSchema>
) {
  assertPersonaChainOwner(ownerId);
  const input = approveVideoChainSchema.parse(raw);
  const database = await getPersonaVaultDb();
  await database.transaction(async tx => {
    const [chain] = await tx
      .select()
      .from(videoGenerationChains)
      .where(
        and(
          eq(videoGenerationChains.id, input.chainId),
          eq(videoGenerationChains.userId, input.creatorId)
        )
      )
      .for("update");
    if (!chain)
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Creator chain not found",
      });
    if (chain.requestHash !== input.expectedRequestHash)
      throw new TRPCError({
        code: "CONFLICT",
        message: "Review the exact current chain request before authorizing",
      });
    if (chain.chainStatus === "complete" || chain.chainStatus === "failed")
      throw new TRPCError({
        code: "CONFLICT",
        message:
          "Completed chains cannot be reauthorized; failed segments need explicit recovery first",
      });
    if (
      chain.authorization &&
      !chain.authorizationClosedAt &&
      Date.parse(chain.authorization.expiresAt) > Date.now()
    ) {
      if (
        chain.authorization.ownerId === ownerId &&
        chain.authorization.maxCreditsPerSegment ===
          input.maxCreditsPerSegment &&
        chain.authorization.reason === input.reason
      )
        return;
      throw new TRPCError({
        code: "CONFLICT",
        message: "An active chain authorization cannot be silently replaced",
      });
    }
    const segments = await tx
      .select()
      .from(videoChainSegments)
      .where(eq(videoChainSegments.chainId, chain.id));
    const authorization: ChainAuthorization = {
      ownerId,
      requestHash: chain.requestHash,
      maxCreditsPerSegment: input.maxCreditsPerSegment,
      maximumOutputs: segments.filter(
        segment => segment.segmentStatus !== "complete"
      ).length,
      authorizedAt: new Date().toISOString(),
      expiresAt: new Date(
        Date.now() + input.expiresInMinutes * 60000
      ).toISOString(),
      reason: input.reason,
    };
    chainAuthorizationSchema.parse(authorization);
    await tx
      .update(videoGenerationChains)
      .set({
        authorization,
        authorizationClosedAt: null,
        authorizationHistory: [...chain.authorizationHistory, authorization],
        nextProcessAt: new Date(),
        lastError: null,
        failureStage: null,
      })
      .where(eq(videoGenerationChains.id, chain.id));
  });
  return getVideoChainStatus(input.creatorId, input.chainId);
}
async function acquireChain(
  userId: number,
  chainId: string,
  leaseToken: string
): Promise<VideoGenerationChain | null> {
  const database = await getPersonaVaultDb();
  return database.transaction(async tx => {
    const [chain] = await tx
      .select()
      .from(videoGenerationChains)
      .where(
        and(
          eq(videoGenerationChains.id, chainId),
          eq(videoGenerationChains.userId, userId)
        )
      )
      .for("update");
    if (!chain)
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Creator chain not found",
      });
    if (
      ["complete", "failed"].includes(chain.chainStatus) ||
      !chain.authorization ||
      chain.authorizationClosedAt ||
      chain.nextProcessAt.getTime() > Date.now()
    )
      return null;
    if (chain.leaseExpiresAt && chain.leaseExpiresAt.getTime() > Date.now())
      return null;
    const leaseExpiresAt = new Date(Date.now() + LEASE_MS);
    await tx
      .update(videoGenerationChains)
      .set({ leaseToken, leaseExpiresAt })
      .where(eq(videoGenerationChains.id, chain.id));
    return { ...chain, leaseToken, leaseExpiresAt };
  });
}
async function releaseChain(
  chainId: string,
  leaseToken: string,
  delayMs = 5000
): Promise<void> {
  const database = await getPersonaVaultDb();
  await database
    .update(videoGenerationChains)
    .set({
      leaseToken: null,
      leaseExpiresAt: null,
      nextProcessAt: new Date(Date.now() + delayMs),
    })
    .where(
      and(
        eq(videoGenerationChains.id, chainId),
        eq(videoGenerationChains.leaseToken, leaseToken)
      )
    );
}
async function prepareSegment(
  chain: VideoGenerationChain,
  segment: VideoChainSegment,
  leaseToken: string
): Promise<VideoChainSegment> {
  const database = await getPersonaVaultDb();
  return database.transaction(async tx => {
    await requireLease(tx, chain.id, leaseToken);
    if (segment.segmentOrder === 1) return segment;
    const [previous] = await tx
      .select()
      .from(videoChainSegments)
      .where(
        and(
          eq(videoChainSegments.chainId, chain.id),
          eq(videoChainSegments.segmentOrder, segment.segmentOrder - 1)
        )
      )
      .for("update");
    if (
      !previous ||
      previous.segmentStatus !== "complete" ||
      !previous.terminalFrameExtractedUrl ||
      !previous.terminalFrameSha256
    )
      throw new Error(
        "The preceding terminal frame is not persisted; do not submit this segment"
      );
    const request = startVideoChainSchema.parse(chain.requestPayload);
    const shot = request.shots[segment.segmentOrder - 1];
    if (!shot)
      throw new Error(
        "The segment no longer belongs to its immutable shot sequence"
      );
    const camera = inheritCameraMetadata(previous.cameraMetadata, shot);
    const patch = {
      startFrameUrl: previous.terminalFrameExtractedUrl,
      startFrameSha256: previous.terminalFrameSha256,
      inheritedCameraMetadata: previous.cameraMetadata,
      cameraMetadata: camera,
      cameraMotionType: camera.motionType,
    };
    if (
      segment.renderJobId &&
      (segment.startFrameUrl !== patch.startFrameUrl ||
        segment.startFrameSha256 !== patch.startFrameSha256 ||
        identityHash(segment.cameraMetadata) !== identityHash(camera))
    )
      throw new Error(
        "A rendered segment's source frame or camera cannot be changed"
      );
    await tx
      .update(videoChainSegments)
      .set(patch)
      .where(eq(videoChainSegments.id, segment.id));
    return { ...segment, ...patch };
  });
}
function generationContext(
  chain: VideoGenerationChain,
  segment: VideoChainSegment
): ContinuityContext {
  return continuityContextSchema.parse({
    chainId: chain.id,
    segmentId: segment.id,
    segmentOrder: segment.segmentOrder,
    attempt: segment.attempt,
    snapshot: chain.personaSnapshot,
    camera: segment.cameraMetadata,
    incomingCamera: segment.inheritedCameraMetadata,
    sourceFrameUrl: segment.startFrameUrl,
    sourceFrameSha256: segment.startFrameSha256,
    endFrameUrl: segment.endFrameUrl,
    endFrameSha256: segment.endFrameSha256,
    promptText: segment.promptText,
    durationSec: segment.durationSec,
    frameRate: chain.frameRate,
    aspectRatio: chain.aspectRatio,
  });
}
async function verifyFirstFrame(
  chain: VideoGenerationChain,
  media: VideoChainMediaRuntime
): Promise<void> {
  const url = new URL(chain.personaSnapshot.avatarBaseUrl);
  const match = url.pathname.match(
    /^\/uploads\/persona-vaults\/([^/]+)\/([^/]+)\/reference\.(?:png|jpg)$/
  );
  if (!match)
    throw new Error(
      "The persona avatar is not an immutable, pinned identity reference"
    );
  const image = await persistPersonaReference(
    { personaId: match[1], assetId: match[2], sourceUrl: url.toString() },
    media
  );
  if (image.sha256 !== chain.personaSnapshot.avatarSha256)
    throw new Error(
      "The pinned persona image changed; no render may use a substituted identity"
    );
  const [width, height] = chain.aspectRatio.split(":").map(Number);
  if (Math.abs(image.width / image.height - width / height) > 0.01)
    throw new Error(
      "Use an owned avatar matching the chain aspect ratio; identity sources are never cropped automatically"
    );
}
async function failChain(
  chainId: string,
  segmentId: string | null,
  leaseToken: string,
  stage: string,
  error: unknown,
  ambiguous = false
): Promise<void> {
  const database = await getPersonaVaultDb();
  await database.transaction(async tx => {
    await requireLease(tx, chainId, leaseToken);
    if (segmentId)
      await tx
        .update(videoChainSegments)
        .set({
          segmentStatus: ambiguous ? "submission_unknown" : "failed",
          lastError: safeMessage(error),
          failureStage: stage,
        })
        .where(
          and(
            eq(videoChainSegments.id, segmentId),
            sql`${videoChainSegments.segmentStatus} <> 'complete'`
          )
        );
    await tx
      .update(videoGenerationChains)
      .set({
        chainStatus: "failed",
        lastError: safeMessage(error),
        failureStage: stage,
        authorizationClosedAt: new Date(),
      })
      .where(eq(videoGenerationChains.id, chainId));
  });
}
export async function processVideoChain(
  userId: number,
  chainId: string,
  dependencies: VideoChainDependencies = {}
) {
  const provider = dependencies.provider ?? governedPersonaVideoProvider;
  const media = dependencies.mediaRuntime ?? getVideoChainMediaRuntime();
  const leaseToken = randomUUID();
  const chain = await acquireChain(userId, chainId, leaseToken);
  if (!chain) return getVideoChainStatus(userId, chainId);
  let heartbeatWork: Promise<void> | null = null;
  const heartbeat = setInterval(() => {
    if (heartbeatWork) return;
    heartbeatWork = getPersonaVaultDb()
      .then(async db => {
        await db
          .update(videoGenerationChains)
          .set({ leaseExpiresAt: new Date(Date.now() + LEASE_MS) })
          .where(
            and(
              eq(videoGenerationChains.id, chain.id),
              eq(videoGenerationChains.leaseToken, leaseToken),
              sql`${videoGenerationChains.leaseExpiresAt} > CURRENT_TIMESTAMP(3)`
            )
          );
      })
      .catch(() => {
        /* A missed renewal cannot resurrect an expired lease; all writes/submissions remain fenced. */
      })
      .finally(() => {
        heartbeatWork = null;
      });
  }, LEASE_MS / 3);
  heartbeat.unref();
  let segment: VideoChainSegment | null = null;
  let stage: FailureStage = "state";
  let nextDelay = 5000;
  try {
    const database = await getPersonaVaultDb();
    const segments = await database
      .select()
      .from(videoChainSegments)
      .where(eq(videoChainSegments.chainId, chain.id))
      .orderBy(asc(videoChainSegments.segmentOrder));
    segment =
      segments.find(candidate => candidate.segmentStatus !== "complete") ??
      segments.at(-1) ??
      null;
    stage = "housekeeping";
    for (const completed of segments.filter(
      item => item.segmentStatus === "complete"
    )) {
      if (completed.renderJobId)
        await provider.markIngested(
          completed.renderJobId,
          completed,
          chain.authorization?.ownerId ?? 0
        );
    }
    segment =
      segments.find(candidate => candidate.segmentStatus !== "complete") ??
      null;
    if (!segment) {
      await database.transaction(async tx => {
        await requireLease(tx, chain.id, leaseToken);
        await tx
          .update(videoGenerationChains)
          .set({
            chainStatus: "complete",
            completedAt: new Date(),
            authorizationClosedAt: new Date(),
          })
          .where(eq(videoGenerationChains.id, chain.id));
      });
      return getVideoChainStatus(userId, chain.id);
    }
    if (["failed", "submission_unknown"].includes(segment.segmentStatus))
      throw new Error(
        "A failed or uncertain segment needs explicit recovery, not automatic paid retry"
      );
    stage = "state";
    segment = await prepareSegment(chain, segment, leaseToken);
    const context = generationContext(chain, segment);
    let job = segment.renderJobId
      ? await provider.getJob(segment.renderJobId)
      : await provider.findDraft(context);
    if (!job) {
      stage = "authorization";
      const authorization = validAuthorization(chain);
      if (!provider.canSubmit()) return getVideoChainStatus(userId, chain.id);
      await verifyFirstFrame(chain, media);
      stage = "quote";
      job = await provider.createDraft(
        context,
        authorization.maxCreditsPerSegment
      );
    }
    const activeSegment = segment;
    const boundJobId = job.id;
    await database.transaction(async tx => {
      await requireLease(tx, chain.id, leaseToken);
      await tx
        .update(videoChainSegments)
        .set({ renderJobId: boundJobId, segmentStatus: "generating" })
        .where(eq(videoChainSegments.id, activeSegment.id));
      await tx
        .update(videoGenerationChains)
        .set({ chainStatus: "generating" })
        .where(eq(videoGenerationChains.id, chain.id));
    });
    segment = {
      ...activeSegment,
      renderJobId: boundJobId,
      segmentStatus: "generating",
    };
    if (
      ["draft", "cost_pending", "awaiting_approval", "approved"].includes(
        job.state
      )
    ) {
      stage = "authorization";
      const authorization = validAuthorization(chain);
      if (!provider.canSubmit()) return getVideoChainStatus(userId, chain.id);
      stage = "provider_submission";
      job = await provider.submit(
        job,
        authorization,
        `persona-chain:${leaseToken}`
      );
    }
    if (["queued", "submission_unknown"].includes(job.state)) {
      await failChain(
        chain.id,
        segment.id,
        leaseToken,
        "submission_unknown",
        new Error(
          "Provider acceptance is uncertain; reconcile the original task receipt before recovery"
        ),
        true
      );
      return getVideoChainStatus(userId, chain.id);
    }
    if (job.state === "submitted") {
      stage = "provider_poll";
      job = await provider.poll(job.id, chain.authorization?.ownerId ?? 0);
    }
    if (["failed", "rejected", "cancelled"].includes(job.state)) {
      await failChain(
        chain.id,
        segment.id,
        leaseToken,
        "provider",
        new Error(
          `The governed provider job is ${job.state}; no automatic replacement render is authorized`
        )
      );
      return getVideoChainStatus(userId, chain.id);
    }
    if (!["provider_complete", "accepted"].includes(job.state))
      return getVideoChainStatus(userId, chain.id);
    if (!job.outputUrl)
      throw new Error("A completed render has no retrievable video URL");
    stage = "media_ingestion";
    await database.transaction(async tx => {
      await requireLease(tx, chain.id, leaseToken);
      await tx
        .update(videoChainSegments)
        .set({ segmentStatus: "extracting" })
        .where(eq(videoChainSegments.id, activeSegment.id));
    });
    const output = await persistVideoChainSegmentMedia(
      {
        chainId: chain.id,
        segmentId: segment.id,
        providerVideoUrl: job.outputUrl,
        durationSec: segment.durationSec,
        frameRate: chain.frameRate,
        aspectRatio: chain.aspectRatio,
      },
      media
    );
    await database.transaction(async tx => {
      await requireLease(tx, chain.id, leaseToken);
      await tx
        .update(videoChainSegments)
        .set({
          segmentStatus: "complete",
          streamUrl: output.streamUrl,
          terminalFrameExtractedUrl: output.terminalFrameUrl,
          terminalFrameSha256: output.terminalFrameSha256,
          frameCount: output.frameCount,
          actualDurationSec: output.durationSec,
          actualFrameRate: output.actualFrameRate,
          lastError: null,
          failureStage: null,
          completedAt: new Date(),
        })
        .where(eq(videoChainSegments.id, activeSegment.id));
      const [next] = await tx
        .select()
        .from(videoChainSegments)
        .where(
          and(
            eq(videoChainSegments.chainId, chain.id),
            eq(videoChainSegments.segmentOrder, activeSegment.segmentOrder + 1)
          )
        )
        .for("update");
      if (next) {
        const shot = chain.requestPayload.shots[next.segmentOrder - 1];
        if (!shot || next.renderJobId)
          throw new Error(
            "The next segment was submitted before its exact predecessor frame was ready"
          );
        const camera = inheritCameraMetadata(
          activeSegment.cameraMetadata,
          shot
        );
        await tx
          .update(videoChainSegments)
          .set({
            startFrameUrl: output.terminalFrameUrl,
            startFrameSha256: output.terminalFrameSha256,
            inheritedCameraMetadata: activeSegment.cameraMetadata,
            cameraMetadata: camera,
            cameraMotionType: camera.motionType,
          })
          .where(eq(videoChainSegments.id, next.id));
      }
    });
    stage = "housekeeping";
    const [completed] = await database
      .select()
      .from(videoChainSegments)
      .where(eq(videoChainSegments.id, segment.id))
      .limit(1);
    if (completed)
      await provider.markIngested(
        job.id,
        completed,
        chain.authorization?.ownerId ?? 0
      );
    if (segment.segmentOrder === chain.requestPayload.shots.length)
      await database.transaction(async tx => {
        await requireLease(tx, chain.id, leaseToken);
        await tx
          .update(videoGenerationChains)
          .set({
            chainStatus: "complete",
            completedAt: new Date(),
            authorizationClosedAt: new Date(),
          })
          .where(eq(videoGenerationChains.id, chain.id));
      });
    nextDelay = 0;
  } catch (error) {
    const database = await getPersonaVaultDb();
    // Fenced-out workers cannot modify the state owned by a replacement worker.
    const [current] = await database
      .select()
      .from(videoGenerationChains)
      .where(eq(videoGenerationChains.id, chain.id))
      .limit(1);
    if (current?.leaseToken !== leaseToken)
      return getVideoChainStatus(userId, chain.id);
    if (stage === "provider_submission" && segment?.renderJobId) {
      const job = await provider.getJob(segment.renderJobId).catch(() => null);
      if (!job || ["queued", "submission_unknown"].includes(job.state)) {
        await failChain(
          chain.id,
          segment.id,
          leaseToken,
          "submission_unknown",
          error,
          true
        );
        return getVideoChainStatus(userId, chain.id);
      }
    }
    const [fresh] = segment
      ? await database
          .select()
          .from(videoChainSegments)
          .where(eq(videoChainSegments.id, segment.id))
          .limit(1)
      : [];
    const retryable = [
      "quote",
      "provider_poll",
      "media_ingestion",
      "housekeeping",
      "provider_submission",
    ].includes(stage);
    const failures = (fresh?.processingFailures ?? 0) + 1;
    if (retryable && failures < RETRY_LIMIT) {
      await database.transaction(async tx => {
        await requireLease(tx, chain.id, leaseToken);
        if (fresh)
          await tx
            .update(videoChainSegments)
            .set({
              processingFailures: failures,
              lastError: safeMessage(error),
              failureStage: stage,
            })
            .where(eq(videoChainSegments.id, fresh.id));
        await tx
          .update(videoGenerationChains)
          .set({ lastError: safeMessage(error), failureStage: stage })
          .where(eq(videoGenerationChains.id, chain.id));
      });
      nextDelay = 5000 * 2 ** (failures - 1);
    } else {
      if (fresh?.renderJobId)
        await provider.closeUnusedApproval(
          fresh.renderJobId,
          safeMessage(error)
        );
      await failChain(chain.id, fresh?.id ?? null, leaseToken, stage, error);
    }
  } finally {
    clearInterval(heartbeat);
    if (heartbeatWork) await heartbeatWork;
    await releaseChain(chain.id, leaseToken, nextDelay);
  }
  return getVideoChainStatus(userId, chain.id);
}
export async function retryVideoChain(
  userId: number,
  chainId: string,
  expectedFailedSegmentId: string,
  dependencies: VideoChainDependencies = {}
) {
  const provider = dependencies.provider ?? governedPersonaVideoProvider;
  const status = await getVideoChainStatus(userId, chainId);
  const failed =
    status.segments.find(segment => segment.segmentStatus !== "complete") ??
    (status.failureStage === "housekeeping"
      ? status.segments.at(-1)
      : undefined);
  if (
    status.chainStatus !== "failed" ||
    !failed ||
    failed.id !== expectedFailedSegmentId
  )
    throw new TRPCError({
      code: "CONFLICT",
      message: "The expected first failed segment no longer matches this chain",
    });
  const job = failed.renderJobId
    ? await provider.getJob(failed.renderJobId)
    : null;
  const uncertain =
    failed.segmentStatus === "submission_unknown" &&
    (!job || ["queued", "submission_unknown"].includes(job.state));
  if (uncertain)
    throw new TRPCError({
      code: "CONFLICT",
      message:
        "Reconcile the original provider task receipt before retrying; a duplicate charge is forbidden",
    });
  const newPaidAttempt =
    job && ["failed", "rejected", "cancelled"].includes(job.state);
  if (newPaidAttempt && failed.attempt >= RETRY_LIMIT)
    throw new TRPCError({
      code: "CONFLICT",
      message: "This segment reached the bounded explicit render-attempt limit",
    });
  const database = await getPersonaVaultDb();
  await database.transaction(async tx => {
    const [chain] = await tx
      .select()
      .from(videoGenerationChains)
      .where(
        and(
          eq(videoGenerationChains.id, chainId),
          eq(videoGenerationChains.userId, userId)
        )
      )
      .for("update");
    const [segment] = await tx
      .select()
      .from(videoChainSegments)
      .where(eq(videoChainSegments.id, failed.id))
      .for("update");
    if (
      !chain ||
      chain.chainStatus !== "failed" ||
      !segment ||
      segment.attempt !== failed.attempt ||
      segment.renderJobId !== failed.renderJobId
    )
      throw new TRPCError({
        code: "CONFLICT",
        message: "Recovery raced another chain change",
      });
    await tx
      .update(videoChainSegments)
      .set({
        segmentStatus: "pending",
        processingFailures: 0,
        lastError: null,
        failureStage: null,
        ...(newPaidAttempt
          ? { attempt: segment.attempt + 1, renderJobId: null }
          : {}),
      })
      .where(eq(videoChainSegments.id, segment.id));
    await tx
      .update(videoGenerationChains)
      .set({
        chainStatus: "pending",
        lastError: null,
        failureStage: null,
        nextProcessAt: new Date(),
        authorizationClosedAt: new Date(),
        leaseToken: null,
        leaseExpiresAt: null,
      })
      .where(eq(videoGenerationChains.id, chain.id));
  });
  return getVideoChainStatus(userId, chainId);
}
