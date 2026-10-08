import { execFile } from "node:child_process";
import { createHash, randomUUID } from "node:crypto";
import { chmod, copyFile, mkdir, readFile, writeFile } from "node:fs/promises";
import { promisify } from "node:util";
import path from "node:path";
import { createPool, type Pool } from "mysql2/promise";
import type { RowDataPacket } from "mysql2";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  BODY_CINEMA_BODY_DIRECTED_ASSERTION_VERSION,
} from "../../shared/bodyCinemaCandidateLifecycle";
import type { BodyDirectedFrameEvidence } from "../../shared/bodyCinemaBodyDirection";
import {
  BodyCinemaCandidateLifecycleService,
  BodyCinemaLifecycleError,
} from "./bodyCinemaCandidateLifecycle";

const execFileAsync = promisify(execFile);
const databaseUrl = process.env.CREATORVAULT_BODY_CINEMA_TEST_DATABASE_URL;
const storageRoot = process.env.CREATORVAULT_BODY_CINEMA_TEST_STORAGE_ROOT;
const creatorId = 880040;
const otherCreatorId = 880041;
const nativeSourceFileName = "hd-native-source.mp4";
let pool: Pool;
let service: BodyCinemaCandidateLifecycleService;
let nativeSourceFixturePath: string;

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
  // The service persists canonical source-map text (including ≥) in project
  // metadata. The disposable socket fixture begins with MariaDB's latin1
  // default, unlike the application's UTF-8 project table.
  await database.query(
    "ALTER TABLE creation_projects CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci"
  );
}

/** Explicit test fixture only: a small, local source that can cover 10.8 seconds. */
async function makeNativeSourceFixture(): Promise<string> {
  const root = requireNativeFixture().storageRoot;
  const fixturePath = path.join(root, "tmp", nativeSourceFileName);
  await mkdir(path.dirname(fixturePath), { recursive: true, mode: 0o700 });
  await execFileAsync(
    "ffmpeg",
    [
      "-nostdin",
      "-hide_banner",
      "-loglevel",
      "error",
      "-f",
      "lavfi",
      "-i",
      "testsrc2=size=1280x720:rate=30:duration=12",
      "-f",
      "lavfi",
      "-i",
      "sine=frequency=440:sample_rate=48000:duration=12",
      "-map",
      "0:v:0",
      "-map",
      "1:a:0",
      "-c:v",
      "libx264",
      "-profile:v",
      "high",
      "-pix_fmt",
      "yuv420p",
      "-r",
      "30",
      "-g",
      "60",
      "-threads",
      "1",
      "-c:a",
      "aac",
      "-b:a",
      "128k",
      "-ar",
      "48000",
      "-ac",
      "2",
      "-t",
      "12",
      "-movflags",
      "+faststart",
      "-y",
      fixturePath,
    ],
    { timeout: 25_000, maxBuffer: 1024 * 1024 }
  );
  await chmod(fixturePath, 0o600);
  return fixturePath;
}

async function seedStrictOriginal(
  assetId: string,
  storageId: string,
  filename: string
): Promise<{ hash: string; size: number }> {
  const root = requireNativeFixture().storageRoot;
  const bytes = await readFile(nativeSourceFixturePath);
  const hash = sha256(bytes);
  const directory = path.join(root, "content-vault", storageId);
  await mkdir(directory, { recursive: true, mode: 0o700 });
  await copyFile(nativeSourceFixturePath, path.join(directory, filename));
  await mkdir(path.join(root, "content-vault-receipts"), {
    recursive: true,
    mode: 0o700,
  });
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
      media: { codec: "h264", width: 1280, height: 720, durationSec: 12 },
    }),
    { mode: 0o600 }
  );
  await pool.query(
    `INSERT INTO media_assets
      (id, user_id, source_type, asset_type, file_name, original_name, mime_type, file_size,
       storage_path, public_url, duration, width, height, status, created_by_feature)
     VALUES (?, ?, 'upload', 'video', ?, ?, 'video/mp4', ?, ?, ?, 12, 1280, 720, 'ready', 'body_cinema_direct_upload')`,
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

function bodyDirectedDeclaration() {
  return {
    version: BODY_CINEMA_BODY_DIRECTED_ASSERTION_VERSION,
    ownSource: true as const,
    performerLikenessConsent: true as const,
    treatmentScope: "body_directed_source_analysis_and_plan_only" as const,
    intendedUse: "source_analysis_and_plan_only" as const,
    acknowledgesNoIndependentVerification: true as const,
  };
}

// Synthetic persistence observations only. They are not a production analysis
// or a claim about the test pattern; each adjacent sample supports source context.
function nativeBodyEvidence(): BodyDirectedFrameEvidence[] {
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
  return [
    400, 1400, 2400, 3400, 4400, 5400, 6400, 7400, 8400, 9400, 10400,
    11000, 11600,
  ].map((timestampMs, index) => ({
    timestampMs,
    width: 1280,
    height: 720,
    landmarks: Array.from({ length: 33 }, (_, joint) => ({
      x: coordinates[joint][0] + (index % 2 ? 0.002 : 0),
      y: coordinates[joint][1],
      visibility: 0.96,
    })),
    face: { present: true, centerX: 0.5, centerY: 0.11, coverage: 0.03 },
    brightness: 0.54,
    contrast: 0.6,
    sharpness: 0.74,
    subjectCoverage: 0.8,
    frameFingerprint: `hd-native-fixture-${timestampMs}`,
  }));
}

const approvedSegments: Array<{ startMs: number; endMs: number }> = [
  { startMs: 400, endMs: 4000 },
  { startMs: 4000, endMs: 7600 },
  { startMs: 7600, endMs: 11200 },
];

const exactAuthorization = {
  version: "body_cinema.hd_private_review_authorization.v1" as const,
  ownSource: true as const,
  performerLikenessConsent: true as const,
  watchedSelectedNativeRanges: true as const,
  completeHeadAndChinVisible: true as const,
  purpose: "private_hd_candidate_review" as const,
  externalCostCeilingUsd: 0 as const,
  noPublication: true as const,
  acknowledgesNoIndependentVerification: true as const,
};

beforeAll(async () => {
  const fixture = requireNativeFixture();
  await mkdir(fixture.storageRoot, { recursive: true, mode: 0o700 });
  await chmod(fixture.storageRoot, 0o700);
  pool = createPool(fixture.databaseUrl);
  await executeSchema(pool);
  nativeSourceFixturePath = await makeNativeSourceFixture();
  service = new BodyCinemaCandidateLifecycleService(pool);
});

afterAll(async () => {
  if (pool) await pool.end();
});

describe("Body Cinema HD lifecycle native persistence proof", () => {
  it("keeps the frozen full-body plan immutable and rejects every pre-render bypass", async () => {
    const sourceAssetId = randomUUID();
    const original = await seedStrictOriginal(
      sourceAssetId,
      randomUUID(),
      nativeSourceFileName
    );
    const qualified = await service.qualifyBodyDirected({
      creatorId,
      sourceAssetId,
      rights: bodyDirectedDeclaration(),
    });
    await pool.query(
      "UPDATE creation_projects SET metadata_json=JSON_SET(metadata_json,'$.unrelatedHdNote','keep-me') WHERE id=?",
      [qualified.projectId]
    );
    const analyzed = await service.analyzeBodyDirected({
      creatorId,
      id: qualified.id,
      sourceSha256: original.hash,
      frameEvidence: nativeBodyEvidence(),
    });
    expect(
      analyzed.analysis?.sourceMap.usableRanges.every(
        range => range.allowedSourceContextCrop?.label === "ORIGINAL SOURCE CONTEXT"
      )
    ).toBe(true);

    await expect(
      service.prepareHdRender({
        creatorId,
        id: qualified.id,
        treatmentHash: "a".repeat(64),
        segments: approvedSegments,
      })
    ).rejects.toBeInstanceOf(BodyCinemaLifecycleError);

    const fullBodyRangeIds = analyzed.analysis!.sourceMap.usableRanges
      .filter(
        range =>
          range.visibleFocusIds.includes("full_body") &&
          range.measuredRegions.includes("full_body")
      )
      .map(range => range.id);
    expect(fullBodyRangeIds.length).toBeGreaterThanOrEqual(3);
    const frozen = await service.freezeBodyDirected({
      creatorId,
      id: qualified.id,
      sourceMapHash: analyzed.analysis!.sourceMapHash,
      bodyFocusId: "full_body",
      bodyTreatmentId: "main_character",
      visualIdentityId: "la_reina",
      selectedRangeIds: fullBodyRangeIds,
    });
    expect(frozen).toMatchObject({
      state: "frozen",
      candidate: null,
      handoff: null,
      treatment: {
        bodyFocus: { id: "full_body" },
        bodyTreatment: { id: "main_character" },
        visualIdentity: { id: "la_reina" },
      },
    });

    await expect(
      service.prepareHdRender({
        creatorId,
        id: frozen.id,
        treatmentHash: "b".repeat(64),
        segments: approvedSegments,
      })
    ).rejects.toMatchObject({ code: "conflict" });
    await expect(
      service.prepareHdRender({
        creatorId,
        id: frozen.id,
        treatmentHash: frozen.treatmentHash!,
        segments: [
          { startMs: 400, endMs: 4000 },
          { startMs: 4000, endMs: 6000 },
          { startMs: 6000, endMs: 8000 },
        ],
      })
    ).rejects.toMatchObject({ code: "precondition" });

    const [beforeRows] = await pool.query<RowDataPacket[]>(
      `SELECT l.source_asset_id,l.source_sha256,l.source_snapshot_json,l.rights_assertion_json,
              l.rights_assertion_hash,l.treatment_version,l.treatment_json,l.treatment_hash,l.state,
              l.candidate_asset_id,l.candidate_sha256,l.candidate_snapshot_json,
              p.accepted_media_asset_id,p.metadata_json
       FROM body_cinema_candidate_lifecycles l
       JOIN creation_projects p ON p.id=l.project_id
       WHERE l.id=?`,
      [frozen.id]
    );
    const before = beforeRows[0];
    expect(before).toBeTruthy();
    expect(before.candidate_asset_id).toBeNull();
    expect(before.accepted_media_asset_id).toBeNull();

    const prepared = await service.prepareHdRender({
      creatorId,
      id: frozen.id,
      treatmentHash: frozen.treatmentHash!,
      segments: approvedSegments,
    });
    expect(prepared).toMatchObject({
      lifecycleId: frozen.id,
      creatorId,
      treatmentHash: frozen.treatmentHash,
      status: "prepared",
      candidate: null,
      ownerAcceptance: "not_reviewed",
      externalCostUsd: 0,
      providerCallMade: false,
      recipe: {
        sourceAssetId,
        sourceSha256: original.hash,
        bodyFocusId: "full_body",
        editStyleId: "main_character",
        visualGradeId: "la_reina",
        segments: approvedSegments,
        width: 1920,
        height: 1080,
        durationSeconds: 10.8,
        framing: "complete_native_source",
      },
    });
    const repeated = await service.prepareHdRender({
      creatorId,
      id: frozen.id,
      treatmentHash: frozen.treatmentHash!,
      segments: approvedSegments,
    });
    expect(repeated.id).toBe(prepared.id);
    expect(await service.getHdRender(creatorId, frozen.id)).toEqual(prepared);
    await expect(service.getHdRender(otherCreatorId, frozen.id)).rejects.toBeInstanceOf(
      BodyCinemaLifecycleError
    );

    await expect(
      service.prepareHdRender({
        creatorId,
        id: frozen.id,
        treatmentHash: frozen.treatmentHash!,
        segments: [
          { startMs: 400, endMs: 3800 },
          { startMs: 3800, endMs: 7600 },
          { startMs: 7600, endMs: 11200 },
        ],
      })
    ).rejects.toMatchObject({ code: "conflict" });

    const [afterRows] = await pool.query<RowDataPacket[]>(
      `SELECT l.source_asset_id,l.source_sha256,l.source_snapshot_json,l.rights_assertion_json,
              l.rights_assertion_hash,l.treatment_version,l.treatment_json,l.treatment_hash,l.state,
              l.candidate_asset_id,l.candidate_sha256,l.candidate_snapshot_json,
              p.accepted_media_asset_id,p.metadata_json
       FROM body_cinema_candidate_lifecycles l
       JOIN creation_projects p ON p.id=l.project_id
       WHERE l.id=?`,
      [frozen.id]
    );
    const after = afterRows[0];
    for (const field of [
      "source_asset_id",
      "source_sha256",
      "source_snapshot_json",
      "rights_assertion_json",
      "rights_assertion_hash",
      "treatment_version",
      "treatment_json",
      "treatment_hash",
      "state",
      "candidate_asset_id",
      "candidate_sha256",
      "candidate_snapshot_json",
      "accepted_media_asset_id",
    ] as const) {
      expect(after[field]).toEqual(before[field]);
    }
    const afterMetadata = JSON.parse(String(after.metadata_json)) as Record<string, unknown>;
    expect(afterMetadata.unrelatedHdNote).toBe("keep-me");
    expect(afterMetadata.bodyCinemaHdRenderV1).toEqual(prepared);

    await expect(
      service.openHdPlayback({ creatorId, id: frozen.id })
    ).rejects.toMatchObject({ code: "not_found" });
    await expect(
      service.openHdPlayback({ creatorId: otherCreatorId, id: frozen.id })
    ).rejects.toBeInstanceOf(BodyCinemaLifecycleError);
    await expect(
      service.openPlayback({ creatorId, id: frozen.id, artifact: "candidate" })
    ).rejects.toBeInstanceOf(BodyCinemaLifecycleError);

    await expect(
      service.executeHdRender({
        creatorId,
        id: frozen.id,
        jobId: prepared.id,
        recipeHash: prepared.recipeHash,
        authorization: { ...exactAuthorization, noPublication: false } as never,
      })
    ).rejects.toThrow();
    await expect(
      service.executeHdRender({
        creatorId,
        id: frozen.id,
        jobId: prepared.id,
        recipeHash: "f".repeat(64),
        authorization: exactAuthorization,
      })
    ).rejects.toMatchObject({ code: "conflict" });
    expect(await service.getHdRender(creatorId, frozen.id)).toEqual(prepared);

    const [renderEvents] = await pool.query<
      (RowDataPacket & { event_type: string })[]
    >(
      "SELECT event_type FROM creation_project_events WHERE project_id=? AND event_type LIKE 'body_cinema_hd_%' ORDER BY created_at",
      [frozen.projectId]
    );
    expect(renderEvents.map(event => event.event_type)).toEqual([
      "body_cinema_hd_blueprint_prepared",
    ]);
    const [candidateRows] = await pool.query<(RowDataPacket & { count: number })[]>(
      "SELECT COUNT(*) AS count FROM media_assets WHERE user_id=? AND created_by_feature='body_cinema_candidate'",
      [creatorId]
    );
    expect(Number(candidateRows[0].count)).toBe(0);

    const tamperedMetadata = {
      ...afterMetadata,
      bodyCinemaHdRenderV1: {
        ...prepared,
        status: "ready",
        startedAt: prepared.createdAt,
        completedAt: new Date().toISOString(),
        recipe: { ...prepared.recipe, visualGradeId: "obsidian" },
        candidate: {
          assetId: randomUUID(),
          sha256: "c".repeat(64),
          sizeBytes: 1,
          width: 1920,
          height: 1080,
          durationSeconds: 10.8,
          frameRate: 30,
          frameCount: 324,
          hasAudio: true,
          gradeVersion: "body_cinema.hd_grade.v1",
        },
      },
    };
    await pool.query(
      "UPDATE creation_projects SET metadata_json=? WHERE id=? AND creator_id=?",
      [JSON.stringify(tamperedMetadata), frozen.projectId, creatorId]
    );
    await expect(service.getHdRender(creatorId, frozen.id)).rejects.toMatchObject({
      code: "precondition",
    });
  });
});
