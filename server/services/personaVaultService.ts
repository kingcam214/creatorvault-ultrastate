import { randomUUID } from "node:crypto";
import { and, asc, eq, sql } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import type { RowDataPacket } from "mysql2/promise";
import {
  personaAssets,
  personaVaults,
  videoChainSegments,
  videoGenerationChains,
  type PersonaVault,
} from "../../drizzle/schema-persona-vaults";
import {
  getPersonaVaultDb,
  getPersonaVaultSqlClient,
  type PersonaVaultDatabase,
} from "../db";
import {
  persistPersonaReference,
  type VideoChainMediaRuntime,
} from "./videoChainMedia";
import {
  createPersonaSchema,
  updatePersonaSchema,
  startVideoChainSchema,
  personaSnapshotSchema,
  inheritCameraMetadata,
  identityHash,
  type CreatePersonaInput,
  type UpdatePersonaInput,
  type StartVideoChainInput,
} from "./personaVaultContracts";
import { buildPersonaContinuityPrompt } from "./personaContinuityProviderContract";

interface OwnedMediaRow extends RowDataPacket {
  id: string;
  asset_type: string;
  mime_type: string;
  public_url: string;
}
export async function requireOwnedImage(
  userId: number,
  url: string
): Promise<{ id: string }> {
  const database = await getPersonaVaultDb();
  const [pinned] = await database
    .select({ id: personaAssets.sourceMediaAssetId })
    .from(personaAssets)
    .where(
      and(eq(personaAssets.userId, userId), eq(personaAssets.assetUrl, url))
    )
    .limit(1);
  if (pinned) return pinned;
  const client = await getPersonaVaultSqlClient();
  const [rows] = await client.execute<OwnedMediaRow[]>(
    "SELECT id, asset_type, mime_type, public_url FROM media_assets WHERE user_id = ? AND public_url = ? AND status = 'ready' LIMIT 1",
    [userId, url]
  );
  const source = rows[0];
  if (
    !source ||
    source.asset_type !== "image" ||
    !["image/png", "image/jpeg"].includes(source.mime_type)
  ) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Select a ready PNG/JPEG image from your owned Media Vault",
    });
  }
  return { id: source.id };
}
async function requirePersona(
  database: PersonaVaultDatabase,
  userId: number,
  personaId: string
): Promise<PersonaVault> {
  const [persona] = await database
    .select()
    .from(personaVaults)
    .where(
      and(eq(personaVaults.id, personaId), eq(personaVaults.userId, userId))
    )
    .limit(1);
  if (!persona)
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Persona not found for this creator",
    });
  return persona;
}
export async function getPersona(userId: number, personaId: string) {
  const database = await getPersonaVaultDb();
  const persona = await requirePersona(database, userId, personaId);
  const assets = await database
    .select()
    .from(personaAssets)
    .where(
      and(
        eq(personaAssets.personaId, personaId),
        eq(personaAssets.userId, userId)
      )
    )
    .orderBy(asc(personaAssets.createdAt));
  return { ...persona, assets };
}
export async function createPersona(
  userId: number,
  raw: CreatePersonaInput,
  mediaRuntime?: VideoChainMediaRuntime
) {
  const input = createPersonaSchema.parse(raw);
  const source = await requireOwnedImage(userId, input.avatarBaseUrl);
  const personaId = randomUUID();
  const assetId = randomUUID();
  const pinned = await persistPersonaReference(
    { personaId, assetId, sourceUrl: input.avatarBaseUrl },
    mediaRuntime
  );
  const database = await getPersonaVaultDb();
  await database.transaction(async tx => {
    const [existing] = await tx
      .select({ id: personaVaults.id })
      .from(personaVaults)
      .where(
        and(
          eq(personaVaults.userId, userId),
          eq(personaVaults.personaName, input.personaName)
        )
      )
      .limit(1);
    if (existing)
      throw new TRPCError({
        code: "CONFLICT",
        message: "This persona name already exists in your vault",
      });
    await tx.insert(personaVaults).values({
      id: personaId,
      userId,
      personaName: input.personaName,
      avatarBaseUrl: pinned.url,
      avatarSha256: pinned.sha256,
      loraModelId: input.loraModelId,
      voiceProfileId: input.voiceProfileId,
      triggerToken: input.triggerToken,
      signatureWardrobes: input.signatureWardrobes,
      accessoryAttributes: input.accessoryAttributes,
    });
    await tx.insert(personaAssets).values({
      id: assetId,
      personaId,
      userId,
      assetType: "avatar_base",
      assetUrl: pinned.url,
      sourceUrl: input.avatarBaseUrl,
      sourceMediaAssetId: source.id,
      sha256: pinned.sha256,
      tags: ["identity", "owned-source", "consented-source"],
    });
  });
  return getPersona(userId, personaId);
}
export async function updatePersona(
  userId: number,
  raw: UpdatePersonaInput,
  mediaRuntime?: VideoChainMediaRuntime
) {
  const input = updatePersonaSchema.parse(raw);
  const database = await getPersonaVaultDb();
  await requirePersona(database, userId, input.personaId);
  const avatar = input.changes.avatarBaseUrl;
  const source = avatar ? await requireOwnedImage(userId, avatar) : null;
  const assetId = avatar ? randomUUID() : null;
  const pinned =
    avatar && assetId
      ? await persistPersonaReference(
          { personaId: input.personaId, assetId, sourceUrl: avatar },
          mediaRuntime
        )
      : null;
  await database.transaction(async tx => {
    const [persona] = await tx
      .select()
      .from(personaVaults)
      .where(
        and(
          eq(personaVaults.id, input.personaId),
          eq(personaVaults.userId, userId)
        )
      )
      .for("update");
    if (!persona)
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Persona not found for this creator",
      });
    if (persona.version !== input.expectedVersion)
      throw new TRPCError({
        code: "CONFLICT",
        message: "Persona changed; reload its current version before updating",
      });
    await tx
      .update(personaVaults)
      .set({
        ...input.changes,
        ...(pinned
          ? { avatarBaseUrl: pinned.url, avatarSha256: pinned.sha256 }
          : {}),
        version: persona.version + 1,
      })
      .where(eq(personaVaults.id, persona.id));
    if (pinned && source && assetId && avatar)
      await tx.insert(personaAssets).values({
        id: assetId,
        personaId: persona.id,
        userId,
        assetType: "avatar_base",
        assetUrl: pinned.url,
        sourceUrl: avatar,
        sourceMediaAssetId: source.id,
        sha256: pinned.sha256,
        tags: ["identity", "owned-source", "consented-source"],
      });
  });
  return getPersona(userId, input.personaId);
}
export async function getVideoChainStatus(userId: number, chainId: string) {
  const database = await getPersonaVaultDb();
  const [chain] = await database
    .select()
    .from(videoGenerationChains)
    .where(
      and(
        eq(videoGenerationChains.id, chainId),
        eq(videoGenerationChains.userId, userId)
      )
    )
    .limit(1);
  if (!chain)
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Video chain not found for this creator",
    });
  const segments = await database
    .select()
    .from(videoChainSegments)
    .where(eq(videoChainSegments.chainId, chain.id))
    .orderBy(asc(videoChainSegments.segmentOrder));
  const completedDuration = segments
    .filter(segment => segment.segmentStatus === "complete")
    .reduce((sum, segment) => sum + segment.durationSec, 0);
  return {
    ...chain,
    segments,
    completedSegments: segments.filter(
      segment => segment.segmentStatus === "complete"
    ).length,
    progressPercent: Math.floor(
      (completedDuration / chain.totalDurationSec) * 100
    ),
    waitingForOwnerAuthorization:
      ["pending", "generating"].includes(chain.chainStatus) &&
      (!chain.authorization ||
        Boolean(chain.authorizationClosedAt) ||
        Date.parse(chain.authorization.expiresAt) <= Date.now()),
    requiresManualRecovery: chain.chainStatus === "failed",
    renderCompletionIsOwnerAcceptance: false as const,
  };
}
export async function startVideoChain(
  userId: number,
  raw: StartVideoChainInput,
  mediaRuntime?: VideoChainMediaRuntime
) {
  const input = startVideoChainSchema.parse(raw);
  const inputHash = identityHash({ userId, input });
  const database = await getPersonaVaultDb();
  const [replay] = await database
    .select()
    .from(videoGenerationChains)
    .where(
      and(
        eq(videoGenerationChains.userId, userId),
        eq(videoGenerationChains.idempotencyKey, input.idempotencyKey)
      )
    )
    .limit(1);
  if (replay) {
    if (replay.inputHash !== inputHash)
      throw new TRPCError({
        code: "CONFLICT",
        message: "This idempotency key belongs to a different shot sequence",
      });
    return getVideoChainStatus(userId, replay.id);
  }
  const persona = await requirePersona(database, userId, input.personaId);
  const wardrobe = input.wardrobeTag
    ? persona.signatureWardrobes.find(
        outfit => outfit.tag === input.wardrobeTag
      )
    : persona.signatureWardrobes[0];
  if (input.wardrobeTag && !wardrobe)
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Select a signature wardrobe already stored in this persona",
    });
  const snapshot = personaSnapshotSchema.parse({
    personaId: persona.id,
    userId,
    version: persona.version,
    personaName: persona.personaName,
    avatarBaseUrl: persona.avatarBaseUrl,
    avatarSha256: persona.avatarSha256,
    loraModelId: persona.loraModelId,
    voiceProfileId: persona.voiceProfileId,
    triggerToken: persona.triggerToken,
    wardrobe: wardrobe ?? null,
    accessoryAttributes: persona.accessoryAttributes,
  });
  const chainId = randomUUID();
  let previousCamera = null as
    | import("./personaVaultContracts").CameraMetadata
    | null;
  const prepared: Array<typeof videoChainSegments.$inferInsert> = [];
  const endAssets: Array<typeof personaAssets.$inferInsert> = [];
  for (const [index, shot] of input.shots.entries()) {
    const camera = inheritCameraMetadata(previousCamera, shot);
    let endFrameUrl: string | null = null;
    let endFrameSha256: string | null = null;
    if (shot.endFrameUrl) {
      const owned = await requireOwnedImage(userId, shot.endFrameUrl);
      const assetId = randomUUID();
      const pinned = await persistPersonaReference(
        { personaId: persona.id, assetId, sourceUrl: shot.endFrameUrl },
        mediaRuntime
      );
      endFrameUrl = pinned.url;
      endFrameSha256 = pinned.sha256;
      endAssets.push({
        id: assetId,
        userId,
        personaId: persona.id,
        assetType: "chain_end_frame",
        assetUrl: pinned.url,
        sourceUrl: shot.endFrameUrl,
        sourceMediaAssetId: owned.id,
        sha256: pinned.sha256,
        tags: ["owned-source", `chain:${chainId}`],
      });
    }
    const segmentId = randomUUID();
    // Validate the final provider prompt before any chain or paid draft is created.
    buildPersonaContinuityPrompt({
      chainId,
      segmentId,
      snapshot,
      camera,
      incomingCamera: previousCamera,
      endFrameUrl,
      promptText: shot.promptText,
    });
    prepared.push({
      id: segmentId,
      chainId,
      segmentOrder: index + 1,
      durationSec: shot.durationSec,
      promptText: shot.promptText,
      cameraMotionType: camera.motionType,
      cameraMetadata: camera,
      inheritedCameraMetadata: previousCamera,
      startFrameUrl: index === 0 ? snapshot.avatarBaseUrl : null,
      startFrameSha256: index === 0 ? snapshot.avatarSha256 : null,
      endFrameUrl,
      endFrameSha256,
    });
    previousCamera = camera;
  }
  const requestHash = identityHash({ userId, input, snapshot });
  const persistedId = await database.transaction(async tx => {
    await tx
      .insert(videoGenerationChains)
      .values({
        id: chainId,
        userId,
        personaId: persona.id,
        totalDurationSec: input.shots.reduce(
          (sum, shot) => sum + shot.durationSec,
          0
        ),
        frameRate: input.frameRate,
        aspectRatio: input.aspectRatio,
        idempotencyKey: input.idempotencyKey,
        inputHash,
        requestHash,
        requestPayload: input,
        personaSnapshot: snapshot,
        authorizationHistory: [],
      })
      .onDuplicateKeyUpdate({
        set: { idempotencyKey: sql`${videoGenerationChains.idempotencyKey}` },
      });
    const [persisted] = await tx
      .select()
      .from(videoGenerationChains)
      .where(
        and(
          eq(videoGenerationChains.userId, userId),
          eq(videoGenerationChains.idempotencyKey, input.idempotencyKey)
        )
      )
      .for("update");
    if (!persisted || persisted.inputHash !== inputHash)
      throw new TRPCError({
        code: "CONFLICT",
        message: "This idempotency key belongs to a different shot sequence",
      });
    if (persisted.id === chainId) {
      if (endAssets.length) await tx.insert(personaAssets).values(endAssets);
      await tx.insert(videoChainSegments).values(prepared);
    }
    return persisted.id;
  });
  return getVideoChainStatus(userId, persistedId);
}
