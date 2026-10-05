import { createHash, randomUUID } from "crypto";
import { chmod, copyFile, mkdir, readFile, writeFile, rm } from "fs/promises";
import path from "path";
import express from "express";
import { once } from "node:events";
import { getTableConfig } from "drizzle-orm/mysql-core";
import { users } from "../../drizzle/schema";
import { COOKIE_NAME } from "../../shared/const";
import { sdk } from "../_core/sdk";
import { registerBodyCinemaCandidatePlayback } from "../routers/bodyCinemaCandidatePlayback";
import {
  updateCreationProjectLinks,
  acceptInspectedAssemblyRender,
} from "./creationProjectService";
import { createPool, type Pool } from "mysql2/promise";
import type { RowDataPacket } from "mysql2";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  BODY_CINEMA_CREATOR_ASSERTION_VERSION,
  BODY_CINEMA_CROWN_REVEAL_TREATMENT_VERSION,
  BODY_CINEMA_FUTURE_ATTACHMENT_GRANT_VERSION,
  bodyCinemaCreatorRightsInputSchema,
  DEFAULT_CROWN_REVEAL_TREATMENT,
} from "../../shared/bodyCinemaCandidateLifecycle";
import {
  BodyCinemaCandidateLifecycleService,
  BodyCinemaLifecycleError,
} from "./bodyCinemaCandidateLifecycle";

const databaseUrl = process.env.CREATORVAULT_BODY_CINEMA_TEST_DATABASE_URL;
const storageRoot = process.env.CREATORVAULT_BODY_CINEMA_TEST_STORAGE_ROOT;
const fixturePath = path.resolve("client/public/assets/preview-abs.mp4");
const creatorId = 880026;
const otherCreatorId = 880027;
let acceptedLifecycleId: string;
let acceptedHash: string;
let pool: Pool;
let service: BodyCinemaCandidateLifecycleService;

function sha256(bytes: Buffer): string {
  return createHash("sha256").update(bytes).digest("hex");
}

function sourceUrl(storageId: string, filename: string): string {
  return `/uploads/content-vault/${storageId}/${encodeURIComponent(filename)}`;
}

function requireNativeFixture(): { databaseUrl: string; storageRoot: string } {
  if (
    !databaseUrl ||
    !storageRoot ||
    process.env.NODE_ENV !== "test" ||
    process.env.CREATORVAULT_LOCAL_PROOF_MODE !== "1" ||
    !/^\/tmp\/creatorvault-cv-video-026-phase-a-[A-Za-z0-9_-]+$/.test(
      storageRoot
    )
  ) {
    throw new Error("BODY_CINEMA_NATIVE_FIXTURE_REQUIRED");
  }
  return { databaseUrl, storageRoot };
}

async function executeSchema(database: Pool): Promise<void> {
  await database.query(`CREATE TABLE IF NOT EXISTS media_assets (
    id varchar(191) NOT NULL PRIMARY KEY, user_id bigint NOT NULL, source_type varchar(64) NULL,
    asset_type varchar(64) NULL, file_name varchar(512) NULL, original_name varchar(512) NULL,
    mime_type varchar(128) NULL, file_size bigint NULL, storage_path text NULL, public_url text NULL,
    duration double NULL, width int NULL, height int NULL, status varchar(32) NULL,
    created_by_feature varchar(96) NULL
  ) ENGINE=InnoDB`);
  await database.query(`CREATE TABLE IF NOT EXISTS creation_projects (
    id char(36) NOT NULL PRIMARY KEY, creator_id bigint NOT NULL, title varchar(191) NOT NULL,
    intent text NOT NULL, output_purpose varchar(191) NOT NULL, state varchar(32) NOT NULL,
    source_media_asset_id varchar(191) NULL, treatment_id varchar(96) NULL,
    accepted_media_asset_id varchar(191) NULL, metadata_json longtext NULL,
    created_at datetime(3) NOT NULL, updated_at datetime(3) NOT NULL
  ) ENGINE=InnoDB`);
  await database.query(`CREATE TABLE IF NOT EXISTS creation_project_events (
    id char(36) NOT NULL PRIMARY KEY, project_id char(36) NOT NULL, actor_id bigint NOT NULL,
    event_type varchar(96) NOT NULL, detail_json longtext NULL, created_at datetime(3) NOT NULL,
    KEY creation_project_events_project (project_id, created_at)
  ) ENGINE=InnoDB`);
  await database.query(`CREATE TABLE IF NOT EXISTS trailer_projects (
    id char(36) NOT NULL PRIMARY KEY, user_id bigint NOT NULL, project_name varchar(200) NOT NULL,
    project_type varchar(96) NOT NULL, title varchar(300) NULL, concept text NULL, script_text text NULL,
    format varchar(16) NOT NULL, source_asset_id varchar(191) NOT NULL, scenes_json longtext NULL,
    hooks longtext NULL, hook_variants longtext NULL, status varchar(32) NOT NULL
  ) ENGINE=InnoDB`);
  await database.query(`CREATE TABLE IF NOT EXISTS body_cinema_candidate_lifecycles (
    id char(36) NOT NULL PRIMARY KEY, project_id char(36) NOT NULL, creator_id bigint NOT NULL,
    source_asset_id varchar(191) NOT NULL, source_sha256 char(64) NOT NULL,
    source_snapshot_json json NOT NULL, rights_assertion_json json NOT NULL,
    rights_assertion_hash char(64) NOT NULL, treatment_version varchar(96) NULL,
    treatment_json json NULL, treatment_hash char(64) NULL, state varchar(32) NOT NULL,
    candidate_asset_id varchar(191) NULL, candidate_sha256 char(64) NULL,
    candidate_snapshot_json json NULL, candidate_provenance_json json NULL,
    attachment_authorization_json json NULL, review_id char(36) NULL, review_json json NULL,
    decision_json json NULL, handoff_json json NULL, created_at datetime(3) NOT NULL,
    updated_at datetime(3) NOT NULL, UNIQUE KEY lifecycle_project_unique (project_id),
    UNIQUE KEY lifecycle_creator_source_unique (creator_id, source_asset_id),
    UNIQUE KEY lifecycle_candidate_unique (candidate_asset_id)
  ) ENGINE=InnoDB`);
}

async function seedSource(
  assetId: string,
  storageId: string,
  filename: string
): Promise<{ hash: string; size: number }> {
  const root = requireNativeFixture().storageRoot;
  const bytes = await readFile(fixturePath);
  const hash = sha256(bytes);
  const directory = path.join(root, "content-vault", storageId);
  await mkdir(directory, { recursive: true });
  await copyFile(fixturePath, path.join(directory, filename));
  await mkdir(path.join(root, "content-vault-receipts"), { recursive: true });
  await writeFile(
    path.join(root, "content-vault-receipts", `${storageId}.json`),
    JSON.stringify({
      id: storageId,
      creatorId,
      url: sourceUrl(storageId, filename),
      filename,
      size: bytes.length,
      sha256: hash,
      verified: true,
      classification: "creator_owned",
      media: { codec: "h264", width: 720, height: 1280, durationSec: 4 },
    })
  );
  await pool.query(
    `INSERT INTO media_assets
      (id, user_id, source_type, asset_type, file_name, original_name, mime_type, file_size,
       storage_path, public_url, duration, width, height, status, created_by_feature)
     VALUES (?, ?, 'upload', 'video', ?, ?, 'video/mp4', ?, ?, ?, 4, 720, 1280, 'ready', 'body_cinema_direct_upload')`,
    [
      assetId,
      creatorId,
      filename,
      filename,
      bytes.length,
      sourceUrl(storageId, filename),
      sourceUrl(storageId, filename),
    ]
  );
  return { hash, size: bytes.length };
}

async function seedPrivateCandidate(
  candidateAssetId: string,
  privatePathId: string,
  filename: string,
  sourceHash: string,
  treatmentHash: string
): Promise<string> {
  const root = requireNativeFixture().storageRoot;
  const candidateRoot = path.join(root, ".body-cinema-candidates");
  await mkdir(candidateRoot, { recursive: true, mode: 0o700 });
  const bytes = await readFile(fixturePath);
  const candidateHash = sha256(bytes);
  await copyFile(fixturePath, path.join(candidateRoot, privatePathId));
  await writeFile(
    path.join(candidateRoot, `${privatePathId}.receipt.json`),
    JSON.stringify({
      privatePathId,
      creatorId,
      filename,
      size: bytes.length,
      sha256: candidateHash,
      verified: true,
      classification: "body_cinema_candidate",
      sourceHash,
      treatmentHash,
      media: { codec: "h264", width: 720, height: 1280, durationSec: 4 },
    })
  );
  await pool.query(
    `INSERT INTO media_assets
      (id, user_id, source_type, asset_type, file_name, original_name, mime_type, file_size,
       storage_path, public_url, duration, width, height, status, created_by_feature)
     VALUES (?, ?, 'generated', 'video', ?, ?, 'video/mp4', ?, ?, NULL, 4, 720, 1280, 'ready', 'body_cinema_candidate')`,
    [
      candidateAssetId,
      creatorId,
      filename,
      filename,
      bytes.length,
      `body-cinema-candidate:${privatePathId}`,
    ]
  );
  return candidateHash;
}

function rights() {
  return {
    version: BODY_CINEMA_CREATOR_ASSERTION_VERSION,
    ownSource: true as const,
    performerLikenessConsent: true as const,
    treatmentScope: "crown_reveal_candidate_review" as const,
    intendedUse: "accepted_master_and_trailer_plan" as const,
    acknowledgesNoIndependentVerification: true as const,
  };
}

function treatment() {
  return {
    ...DEFAULT_CROWN_REVEAL_TREATMENT,
    version: BODY_CINEMA_CROWN_REVEAL_TREATMENT_VERSION,
    sourceMoment: {
      startSeconds: 0,
      endSeconds: 3,
      rationale: "Use the measured opening movement.",
    },
    proposedOutput: {
      aspectRatio: "9:16" as const,
      width: 720,
      height: 1280,
      durationSeconds: 4,
      codec: "h264" as const,
      container: "mp4" as const,
    },
  };
}

beforeAll(async () => {
  const fixture = requireNativeFixture();
  await mkdir(fixture.storageRoot, { recursive: true, mode: 0o700 });
  await chmod(fixture.storageRoot, 0o700);
  pool = createPool(fixture.databaseUrl);
  await executeSchema(pool);
  service = new BodyCinemaCandidateLifecycleService(pool);
});

afterAll(async () => {
  if (pool) await pool.end();
});

describe("Body Cinema candidate lifecycle native transaction proof", () => {
  it("enforces one slot, private future grant, byte-bound review, exact acceptance, and accepted-only handoff", async () => {
    const sourceAssetId = randomUUID();
    await seedSource(sourceAssetId, randomUUID(), "native-source.mp4");
    const qualified = await service.qualify({
      creatorId,
      sourceAssetId,
      rights: rights(),
    });
    const duplicateQualification = await service.qualify({
      creatorId,
      sourceAssetId,
      rights: rights(),
    });
    expect(duplicateQualification.id).toBe(qualified.id);
    const frozen = await service.freeze({
      creatorId,
      id: qualified.id,
      treatment: treatment(),
    });
    await expect(
      service.freeze({
        creatorId,
        id: qualified.id,
        treatment: { ...treatment(), feeling: "A changed plan" },
      })
    ).rejects.toMatchObject({ code: "conflict" });
    const reserves = await Promise.all([
      service.reserve({ creatorId, id: frozen.id }),
      service.reserve({ creatorId, id: frozen.id }),
    ]);
    expect(reserves.map(record => record.state)).toEqual([
      "awaiting_candidate",
      "awaiting_candidate",
    ]);
    const [reservedEvents] = await pool.query<
      (RowDataPacket & { count: number })[]
    >(
      `SELECT COUNT(*) AS count FROM creation_project_events WHERE project_id = ? AND event_type = 'body_cinema_candidate_slot_reserved'`,
      [qualified.projectId]
    );
    expect(Number(reservedEvents[0].count)).toBe(1);

    const candidateAssetId = randomUUID();
    const privatePathId = `candidate_${randomUUID().replace(/-/g, "")}`;
    const candidateHash = await seedPrivateCandidate(
      candidateAssetId,
      privatePathId,
      "private-candidate.mp4",
      qualified.source.sha256,
      frozen.treatmentHash!
    );
    await expect(
      service.attach({
        creatorId,
        id: qualified.id,
        candidateAssetId,
        provenanceReference: "future-pilot-proof-026",
        expectedSha256: candidateHash,
      })
    ).rejects.toMatchObject({ code: "forbidden" });

    const grant = {
      version: BODY_CINEMA_FUTURE_ATTACHMENT_GRANT_VERSION,
      lifecycleId: qualified.id,
      issuerId: creatorId,
      authorizationRef: "future-pilot-authorized-026",
      sourceHash: qualified.source.sha256,
      treatmentHash: frozen.treatmentHash!,
      candidateAssetId,
      candidateHash,
      provenanceReference: "future-pilot-proof-026",
      privatePathId,
      expiresAt: new Date(Date.now() + 60_000).toISOString(),
      singleUseState: "available" as const,
    };
    const approvalPath = path.join(
      requireNativeFixture().storageRoot,
      ".body-cinema-candidates",
      `${qualified.id}.pilot-approval.json`
    );
    await expect(
      service.authorizeFutureAttachment({ creatorId, id: qualified.id })
    ).rejects.toBeInstanceOf(BodyCinemaLifecycleError);
    await writeFile(
      approvalPath,
      JSON.stringify({
        ...grant,
        version: "body_cinema.owner_pilot_approval.v1",
        scope: "one_candidate_attachment_only",
        creatorId,
      }),
      { mode: 0o600 }
    );
    await service.authorizeFutureAttachment({ creatorId, id: qualified.id });
    await service.authorizeFutureAttachment({ creatorId, id: qualified.id });
    const attached = await service.attach({
      creatorId,
      id: qualified.id,
      candidateAssetId,
      provenanceReference: "future-pilot-proof-026",
      expectedSha256: candidateHash,
    });
    expect(attached.state).toBe("candidate_attached");
    await expect(
      service.handoff({ creatorId, id: qualified.id })
    ).rejects.toBeInstanceOf(BodyCinemaLifecycleError);
    await expect(
      service.attach({
        creatorId,
        id: qualified.id,
        candidateAssetId: randomUUID(),
        provenanceReference: "replacement",
        expectedSha256: candidateHash,
      })
    ).rejects.toBeInstanceOf(BodyCinemaLifecycleError);
    await expect(
      service.openPlayback({
        creatorId: otherCreatorId,
        id: qualified.id,
        artifact: "candidate",
      })
    ).rejects.toMatchObject({ code: "forbidden" });

    const reviewing = await service.beginReview({
      creatorId,
      id: qualified.id,
    });
    const review = reviewing.review!;
    const agedReview = {
      ...review,
      startedAt: new Date(Date.now() - 5_000).toISOString(),
    };
    await pool.query(
      `UPDATE body_cinema_candidate_lifecycles SET review_json = ? WHERE id = ?`,
      [JSON.stringify(agedReview), qualified.id]
    );
    const accepted = await service.decide({
      creatorId,
      id: qualified.id,
      reviewId: review.id,
      candidateSha256: candidateHash,
      decision: "accept",
      reason:
        "The exact candidate preserves the approved source moment and plan.",
      watchedEntireCandidate: true as const,
    });
    expect(accepted.state).toBe("accepted");
    acceptedLifecycleId = accepted.id;
    acceptedHash = candidateHash;
    const duplicateDecision = await service.decide({
      creatorId,
      id: qualified.id,
      reviewId: review.id,
      candidateSha256: candidateHash,
      decision: "accept",
      reason:
        "The exact candidate preserves the approved source moment and plan.",
      watchedEntireCandidate: true as const,
    });
    expect(duplicateDecision.decision?.id).toBe(accepted.decision?.id);
    await expect(
      service.decide({
        creatorId,
        id: qualified.id,
        reviewId: review.id,
        candidateSha256: candidateHash,
        decision: "accept",
        reason: "A materially changed duplicate reason must conflict.",
        watchedEntireCandidate: true as const,
      })
    ).rejects.toMatchObject({ code: "conflict" });
    const handedOff = await service.handoff({ creatorId, id: qualified.id });
    expect(handedOff.handoff?.status).toBe("planning_only");
    const readHandoff = await service.getHandoff({
      creatorId,
      handoffId: handedOff.handoff!.trailerProjectId,
    });
    expect(readHandoff.candidateHash).toBe(candidateHash);
  });

  it("fails closed when previously qualified source bytes change", async () => {
    const sourceAssetId = randomUUID();
    const storageId = randomUUID();
    await seedSource(sourceAssetId, storageId, "changed-source.mp4");
    const qualified = await service.qualify({
      creatorId,
      sourceAssetId,
      rights: rights(),
    });
    const filePath = path.join(
      requireNativeFixture().storageRoot,
      "content-vault",
      storageId,
      "changed-source.mp4"
    );
    const original = await readFile(filePath);
    await writeFile(
      filePath,
      Buffer.concat([original, Buffer.from("changed")])
    );
    await expect(
      service.freeze({ creatorId, id: qualified.id, treatment: treatment() })
    ).rejects.toMatchObject({ code: "precondition" });
  });

  it("rejects unknown rights assertions before durable source qualification", async () => {
    const sourceAssetId = randomUUID();
    await seedSource(sourceAssetId, randomUUID(), "unknown-rights.mp4");
    expect(
      bodyCinemaCreatorRightsInputSchema.safeParse({
        ...rights(),
        performerLikenessConsent: false,
      }).success
    ).toBe(false);
  });
  it("serves real signed-session private full/range/HEAD bytes, denies anonymous and wrong-owner access, and blocks legacy master bypasses", async () => {
    const columns = getTableConfig(users).columns;
    await pool.query(
      `CREATE TABLE IF NOT EXISTS users (${columns.map(column => `\`${column.name}\` ${column.getSQLType()}${column.name === "id" ? " NOT NULL AUTO_INCREMENT" : ""}`).join(", ")}, PRIMARY KEY (id), UNIQUE KEY user_openid (openId)) ENGINE=InnoDB`
    );
    await pool.query(
      "INSERT INTO users (id,openId,name,email,role) VALUES (?,?,'Synthetic creator','phase-a@example.invalid','user'), (?,?,'Other synthetic creator','other@example.invalid','user')",
      [creatorId, "cv_phase_a_creator", otherCreatorId, "cv_phase_a_other"]
    );
    const cookie = `${COOKIE_NAME}=${await sdk.createSessionToken("cv_phase_a_creator", { name: "Synthetic creator" })}`;
    const wrongCookie = `${COOKIE_NAME}=${await sdk.createSessionToken("cv_phase_a_other", { name: "Other synthetic creator" })}`;
    const app = express();
    registerBodyCinemaCandidatePlayback(app);
    const server = app.listen(0, "127.0.0.1");
    await once(server, "listening");
    try {
      const address = server.address();
      if (!address || typeof address === "string")
        throw new Error("NATIVE_HTTP_FIXTURE_ADDRESS_INVALID");
      const url = `http://127.0.0.1:${address.port}/api/body-cinema/lifecycle/${acceptedLifecycleId}/candidate`;
      expect((await fetch(url)).status).toBe(401);
      expect(
        (await fetch(url, { headers: { cookie: wrongCookie } })).status
      ).toBe(403);
      const full = await fetch(url, { headers: { cookie } });
      expect(full.status).toBe(200);
      expect(full.headers.get("cache-control")).toContain("no-store");
      expect(sha256(Buffer.from(await full.arrayBuffer()))).toBe(acceptedHash);
      const range = await fetch(url, {
        headers: { cookie, range: "bytes=0-31" },
      });
      expect(range.status).toBe(206);
      expect((await range.arrayBuffer()).byteLength).toBe(32);
      expect(
        (await fetch(url, { method: "HEAD", headers: { cookie } })).status
      ).toBe(200);
      expect(
        (
          await fetch(url, {
            headers: { cookie, range: "bytes=999999999999-" },
          })
        ).status
      ).toBe(416);
      const download = await fetch(`${url}?download=1`, {
        headers: { cookie },
      });
      expect(download.status).toBe(200);
      expect(download.headers.get("content-disposition")).toMatch(
        /^attachment/
      );
      await download.arrayBuffer();
    } finally {
      server.closeAllConnections();
      await new Promise<void>((resolve, reject) =>
        server.close(e => (e ? reject(e) : resolve()))
      );
    }
    const record = await service.getMine(creatorId, acceptedLifecycleId);
    await expect(
      updateCreationProjectLinks({
        creatorId,
        actorId: creatorId,
        projectId: record!.projectId,
        patch: { acceptedAssetId: randomUUID() },
      })
    ).rejects.toThrow(/locked|candidate lifecycle/);
    await expect(
      acceptInspectedAssemblyRender({
        creatorId,
        actorId: creatorId,
        projectId: record!.projectId,
        renderJobId: randomUUID(),
        outputUrl: "https://creatorvault.live/uploads/renders/synthetic.mp4",
        qualityScore: 90,
        qualityNote: "Not a real quality claim; synthetic bypass test.",
      })
    ).rejects.toThrow(/locked|candidate lifecycle/);
  });

  it("rejects wrong owners, missing backing bytes, and decisions without a candidate", async () => {
    const assetId = randomUUID(),
      storageId = randomUUID();
    await seedSource(assetId, storageId, "private-original.mp4");
    await expect(
      service.qualify({
        creatorId: otherCreatorId,
        sourceAssetId: assetId,
        rights: rights(),
      })
    ).rejects.toBeInstanceOf(BodyCinemaLifecycleError);
    const qualified = await service.qualify({
      creatorId,
      sourceAssetId: assetId,
      rights: rights(),
    });
    await expect(
      service.getMine(otherCreatorId, qualified.id)
    ).resolves.toBeNull();
    await expect(
      service.beginReview({ creatorId, id: qualified.id })
    ).rejects.toBeInstanceOf(BodyCinemaLifecycleError);
    await expect(
      service.decide({
        creatorId,
        id: qualified.id,
        reviewId: randomUUID(),
        candidateSha256: qualified.source.sha256,
        decision: "accept",
        reason: "No candidate is available to watch or accept.",
        watchedEntireCandidate: true as const,
      })
    ).rejects.toBeInstanceOf(BodyCinemaLifecycleError);
    await rm(
      path.join(
        requireNativeFixture().storageRoot,
        "content-vault",
        storageId,
        "private-original.mp4"
      )
    );
    await expect(
      service.freeze({ creatorId, id: qualified.id, treatment: treatment() })
    ).rejects.toBeInstanceOf(BodyCinemaLifecycleError);
  });

  it("preserves rejected evidence with no accepted pointer or handoff and forbids changed candidate bytes", async () => {
    const sourceAssetId = randomUUID();
    await seedSource(sourceAssetId, randomUUID(), "rejection-source.mp4");
    const qualified = await service.qualify({
      creatorId,
      sourceAssetId,
      rights: rights(),
    });
    const frozen = await service.freeze({
      creatorId,
      id: qualified.id,
      treatment: treatment(),
    });
    await service.reserve({ creatorId, id: qualified.id });
    const candidateAssetId = randomUUID(),
      privatePathId = `candidate_${randomUUID().replace(/-/g, "")}`;
    const hash = await seedPrivateCandidate(
      candidateAssetId,
      privatePathId,
      "reject-candidate.mp4",
      qualified.source.sha256,
      frozen.treatmentHash!
    );
    const grant = {
      version: BODY_CINEMA_FUTURE_ATTACHMENT_GRANT_VERSION,
      lifecycleId: qualified.id,
      issuerId: creatorId,
      authorizationRef: "synthetic-rejection-grant",
      sourceHash: qualified.source.sha256,
      treatmentHash: frozen.treatmentHash!,
      candidateAssetId,
      candidateHash: hash,
      provenanceReference: "synthetic-test-provenance",
      privatePathId,
      expiresAt: new Date(Date.now() + 60000).toISOString(),
      singleUseState: "available" as const,
    };
    await writeFile(
      path.join(
        requireNativeFixture().storageRoot,
        ".body-cinema-candidates",
        `${qualified.id}.pilot-approval.json`
      ),
      JSON.stringify({
        ...grant,
        version: "body_cinema.owner_pilot_approval.v1",
        scope: "one_candidate_attachment_only",
        creatorId,
      }),
      { mode: 0o600 }
    );
    await service.authorizeFutureAttachment({ creatorId, id: qualified.id });
    await expect(
      service.attach({
        creatorId,
        id: qualified.id,
        candidateAssetId,
        provenanceReference: "caller-forged-provenance",
        expectedSha256: hash,
      })
    ).rejects.toBeInstanceOf(BodyCinemaLifecycleError);
    await service.attach({
      creatorId,
      id: qualified.id,
      candidateAssetId,
      provenanceReference: grant.provenanceReference,
      expectedSha256: hash,
    });
    const reviewing = await service.beginReview({
      creatorId,
      id: qualified.id,
    });
    await pool.query(
      "UPDATE body_cinema_candidate_lifecycles SET review_json=? WHERE id=?",
      [
        JSON.stringify({
          ...reviewing.review!,
          startedAt: new Date(Date.now() - 5000).toISOString(),
        }),
        qualified.id,
      ]
    );
    const input = {
      creatorId,
      id: qualified.id,
      reviewId: reviewing.review!.id,
      candidateSha256: hash,
      decision: "reject" as const,
      reason:
        "Synthetic rejection: this candidate is not a creative acceptance.",
      watchedEntireCandidate: true as const,
    };
    await expect(
      service.decide({ ...input, candidateSha256: "0".repeat(64) })
    ).rejects.toBeInstanceOf(BodyCinemaLifecycleError);
    const rejected = await service.decide(input);
    expect(rejected.state).toBe("rejected");
    expect((await service.decide(input)).decision?.id).toBe(
      rejected.decision?.id
    );
    const [rows] = await pool.query<
      (RowDataPacket & { accepted_media_asset_id: string | null })[]
    >("SELECT accepted_media_asset_id FROM creation_projects WHERE id=?", [
      qualified.projectId,
    ]);
    expect(rows[0].accepted_media_asset_id).toBeNull();
    await expect(
      service.handoff({ creatorId, id: qualified.id })
    ).rejects.toBeInstanceOf(BodyCinemaLifecycleError);
    const app = express();
    registerBodyCinemaCandidatePlayback(app);
    const server = app.listen(0, "127.0.0.1");
    await once(server, "listening");
    try {
      const address = server.address();
      if (!address || typeof address === "string")
        throw new Error("NATIVE_HTTP_FIXTURE_ADDRESS_INVALID");
      const cookie = `${COOKIE_NAME}=${await sdk.createSessionToken("cv_phase_a_creator", { name: "Synthetic creator" })}`;
      expect(
        (
          await fetch(
            `http://127.0.0.1:${address.port}/api/body-cinema/lifecycle/${qualified.id}/candidate?download=1`,
            { headers: { cookie } }
          )
        ).status
      ).toBe(403);
    } finally {
      server.closeAllConnections();
      await new Promise<void>((resolve, reject) =>
        server.close(e => (e ? reject(e) : resolve()))
      );
    }
    const candidatePath = path.join(
      requireNativeFixture().storageRoot,
      ".body-cinema-candidates",
      privatePathId
    );
    await writeFile(
      candidatePath,
      Buffer.concat([await readFile(candidatePath), Buffer.from("changed")])
    );
    await expect(
      service.openPlayback({
        creatorId,
        id: qualified.id,
        artifact: "candidate",
      })
    ).rejects.toBeInstanceOf(BodyCinemaLifecycleError);
  });
});

// These are synthetic observations for persistence tests, not an independent
// anatomical analysis of the existing test clip and never production inputs.
function bodyDirectedDeclaration() {
  return {
    version: "body_cinema.body_directed_assertion.v1" as const,
    ownSource: true as const,
    performerLikenessConsent: true as const,
    treatmentScope: "body_directed_source_analysis_and_plan_only" as const,
    intendedUse: "source_analysis_and_plan_only" as const,
    acknowledgesNoIndependentVerification: true as const,
  };
}
function syntheticBodyFrames() {
  const coordinates: Record<number, [number, number]> = {
    0: [0.5, 0.1],
    1: [0.48, 0.09],
    2: [0.47, 0.09],
    3: [0.46, 0.09],
    4: [0.52, 0.09],
    5: [0.53, 0.09],
    6: [0.54, 0.09],
    7: [0.45, 0.11],
    8: [0.55, 0.11],
    9: [0.48, 0.14],
    10: [0.52, 0.14],
    11: [0.38, 0.24],
    12: [0.62, 0.24],
    13: [0.32, 0.38],
    14: [0.68, 0.38],
    15: [0.29, 0.5],
    16: [0.71, 0.5],
    17: [0.28, 0.51],
    18: [0.72, 0.51],
    19: [0.28, 0.52],
    20: [0.72, 0.52],
    21: [0.29, 0.53],
    22: [0.71, 0.53],
    23: [0.43, 0.56],
    24: [0.57, 0.56],
    25: [0.44, 0.73],
    26: [0.56, 0.73],
    27: [0.44, 0.89],
    28: [0.56, 0.89],
    29: [0.43, 0.9],
    30: [0.57, 0.9],
    31: [0.41, 0.94],
    32: [0.59, 0.94],
  };
  return [200, 800, 1400, 2000, 2600, 3200].map((timestampMs, index) => ({
    timestampMs,
    width: 720,
    height: 1280,
    landmarks: Array.from({ length: 33 }, (_, joint) => ({
      x: coordinates[joint][0] + (index === 3 ? 0.006 : 0),
      y: coordinates[joint][1],
      visibility: 0.96,
    })),
    face: { present: true, centerX: 0.5, centerY: 0.11, coverage: 0.03 },
    brightness: 0.54,
    contrast: 0.6,
    sharpness: 0.74,
    subjectCoverage: 0.8,
    frameFingerprint: `synthetic-fixture-frame-${index}`,
  }));
}

describe("Body Cinema body-directed native planning-only proof", () => {
  it("persists owned source-bound analysis and immutable selected snapshots without candidate or handoff authority", async () => {
    const sourceAssetId = randomUUID();
    const original = await seedSource(
      sourceAssetId,
      randomUUID(),
      "native-body-directed-original.mp4"
    );
    const qualified = await service.qualifyBodyDirected({
      creatorId,
      sourceAssetId,
      rights: bodyDirectedDeclaration(),
    });
    expect(qualified.kind).toBe("body_directed_v2");
    expect(qualified.rights.verificationStatus).toBe(
      "creator_asserted_not_independently_verified"
    );
    expect(qualified.candidate).toBeNull();
    expect(qualified.handoff).toBeNull();
    expect(
      (
        await service.qualifyBodyDirected({
          creatorId,
          sourceAssetId,
          rights: bodyDirectedDeclaration(),
        })
      ).id
    ).toBe(qualified.id);
    expect(
      await service.getBodyDirected(otherCreatorId, qualified.id)
    ).toBeNull();
    expect(await service.getMine(creatorId, qualified.id)).toBeNull();
    await pool.query(
      "UPDATE creation_projects SET metadata_json=JSON_SET(metadata_json,'$.unrelatedOwnerNote','keep-me') WHERE id=?",
      [qualified.projectId]
    );
    await expect(
      service.analyzeBodyDirected({
        creatorId,
        id: qualified.id,
        sourceSha256: "f".repeat(64),
        frameEvidence: syntheticBodyFrames(),
      })
    ).rejects.toBeInstanceOf(BodyCinemaLifecycleError);
    const analyzed = await service.analyzeBodyDirected({
      creatorId,
      id: qualified.id,
      sourceSha256: original.hash,
      frameEvidence: syntheticBodyFrames(),
    });
    expect(analyzed.analysis?.sourceMap.source.assetId).toBe(sourceAssetId);
    expect(analyzed.analysis?.sourceMap.source.sha256).toBe(original.hash);
    const options = (
      await service.recommendBodyDirected({
        creatorId,
        id: qualified.id,
        bodyFocusId: "full_body",
      })
    ).options;
    expect(options.length).toBeGreaterThanOrEqual(3);
    expect(options.length).toBeLessThanOrEqual(5);
    const selected = options[0];
    const input = {
      creatorId,
      id: qualified.id,
      sourceMapHash: analyzed.analysis!.sourceMapHash,
      bodyFocusId: selected.bodyFocus.id,
      bodyTreatmentId: selected.bodyTreatment.id,
      visualIdentityId: selected.visualIdentity.id,
      selectedRangeIds: selected.selectedTimecodes.map(range => range.rangeId),
    };
    await expect(
      service.freezeBodyDirected({ ...input, sourceMapHash: "b".repeat(64) })
    ).rejects.toBeInstanceOf(BodyCinemaLifecycleError);
    const frozen = await service.freezeBodyDirected(input);
    expect(frozen.state).toBe("frozen");
    expect(frozen.treatment?.bodyFocus).toEqual(selected.bodyFocus);
    expect(frozen.treatment?.bodyTreatment).toEqual(selected.bodyTreatment);
    expect(frozen.treatment?.visualIdentity).toEqual(selected.visualIdentity);
    expect(frozen.treatment?.sourceMap).toEqual(analyzed.analysis?.sourceMap);
    expect(frozen.treatment?.editBlueprint.shots.length).toBeGreaterThan(0);
    expect(frozen.treatment?.preservationConstraints.providerCall).toBe(
      "not_authorized"
    );
    expect(frozen.treatment?.noCandidateGenerated).toBe(true);
    expect(frozen.candidate).toBeNull();
    expect(frozen.handoff).toBeNull();
    expect((await service.freezeBodyDirected(input)).treatmentHash).toBe(
      frozen.treatmentHash
    );
    expect(
      (await service.getBodyDirected(creatorId, qualified.id))?.treatment
    ).toEqual(frozen.treatment);
    await expect(
      service.analyzeBodyDirected({
        creatorId,
        id: qualified.id,
        sourceSha256: original.hash,
        frameEvidence: syntheticBodyFrames(),
      })
    ).rejects.toBeInstanceOf(BodyCinemaLifecycleError);
    await expect(
      service.freezeBodyDirected({ ...input, bodyTreatmentId: "runway_heat" })
    ).rejects.toBeInstanceOf(BodyCinemaLifecycleError);
    for (const action of [
      () => service.reserve({ creatorId, id: qualified.id }),
      () =>
        service.freeze({ creatorId, id: qualified.id, treatment: treatment() }),
      () => service.beginReview({ creatorId, id: qualified.id }),
      () => service.handoff({ creatorId, id: qualified.id }),
      () =>
        service.openPlayback({
          creatorId,
          id: qualified.id,
          artifact: "candidate" as const,
        }),
    ])
      await expect(action()).rejects.toBeInstanceOf(BodyCinemaLifecycleError);
    const [rows] = await pool.query<RowDataPacket[]>(
      "SELECT metadata_json,accepted_media_asset_id FROM creation_projects WHERE id=?",
      [qualified.projectId]
    );
    const metadata = JSON.parse(String(rows[0].metadata_json)) as {
      unrelatedOwnerNote: string;
    };
    expect(metadata.unrelatedOwnerNote).toBe("keep-me");
    expect(rows[0].accepted_media_asset_id).toBeNull();
    const playback = await service.openPlayback({
      creatorId,
      id: qualified.id,
      artifact: "source",
    });
    try {
      const bytes = Buffer.alloc(playback.sizeBytes);
      const result = await playback.handle.read(bytes, 0, bytes.length, 0);
      expect(result.bytesRead).toBe(bytes.length);
      expect(sha256(bytes)).toBe(original.hash);
    } finally {
      await playback.handle.close();
    }
  });
  it("rejects unconfirmed detail, invalid observation times and wrong ownership without inventing a plan", async () => {
    const sourceAssetId = randomUUID();
    const original = await seedSource(
      sourceAssetId,
      randomUUID(),
      "native-body-unconfirmed.mp4"
    );
    await expect(
      service.qualifyBodyDirected({
        creatorId: otherCreatorId,
        sourceAssetId,
        rights: bodyDirectedDeclaration(),
      })
    ).rejects.toBeInstanceOf(BodyCinemaLifecycleError);
    const record = await service.qualifyBodyDirected({
      creatorId,
      sourceAssetId,
      rights: bodyDirectedDeclaration(),
    });
    await expect(
      service.analyzeBodyDirected({
        creatorId,
        id: record.id,
        sourceSha256: original.hash,
        frameEvidence: syntheticBodyFrames().map(frame => ({
          ...frame,
          timestampMs: frame.timestampMs + 10_000,
        })),
      })
    ).rejects.toThrow();
    expect(
      (await service.getBodyDirected(creatorId, record.id))?.analysis
    ).toBeNull();
    const analyzed = await service.analyzeBodyDirected({
      creatorId,
      id: record.id,
      sourceSha256: original.hash,
      frameEvidence: syntheticBodyFrames(),
    });
    const unsupported = await service.recommendBodyDirected({
      creatorId,
      id: record.id,
      bodyFocusId: "abs_core",
      bodyTreatmentId: "pressure_core",
      visualIdentityId: "obsidian",
    });
    expect(unsupported.options).toEqual([]);
    expect(unsupported.reason).toBeTruthy();
    expect(unsupported.alternatives.map(focus => focus.id)).toContain(
      "full_body"
    );
    await expect(
      service.freezeBodyDirected({
        creatorId,
        id: record.id,
        sourceMapHash: analyzed.analysis!.sourceMapHash,
        bodyFocusId: "abs_core",
        bodyTreatmentId: "pressure_core",
        visualIdentityId: "obsidian",
      })
    ).rejects.toThrow();
    expect(
      (await service.getBodyDirected(creatorId, record.id))?.treatment
    ).toBeNull();
  });
  it("retains historical lifecycle fields unchanged and never reinterprets them as a new body-directed plan", async () => {
    const sourceAssetId = randomUUID();
    await seedSource(
      sourceAssetId,
      randomUUID(),
      "native-historical-original.mp4"
    );
    const historical = await service.qualify({
      creatorId,
      sourceAssetId,
      rights: rights(),
    });
    const saved = await service.freeze({
      creatorId,
      id: historical.id,
      treatment: treatment(),
    });
    const before = await service.getMine(creatorId, saved.id);
    await expect(
      service.qualifyBodyDirected({
        creatorId,
        sourceAssetId,
        rights: bodyDirectedDeclaration(),
      })
    ).rejects.toBeInstanceOf(BodyCinemaLifecycleError);
    expect(await service.getMine(creatorId, saved.id)).toEqual(before);
    expect(await service.getBodyDirected(creatorId, saved.id)).toBeNull();
    expect(
      (await service.listBodyDirected(creatorId)).some(
        plan => plan.id === saved.id
      )
    ).toBe(false);
    expect(
      (await service.listMine(creatorId)).some(plan => plan.id === saved.id)
    ).toBe(true);
  });
});
