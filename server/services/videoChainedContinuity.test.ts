import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import { createServer, type Server } from "node:http";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { createHash, randomUUID } from "node:crypto";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import express from "express";
import mysql, { type Pool, type RowDataPacket } from "mysql2/promise";
import { eq } from "drizzle-orm";
import type { User } from "../../drizzle/schema";
import {
  videoChainSegments,
  videoGenerationChains,
} from "../../drizzle/schema-persona-vaults";
import {
  createPersonaSchema,
  updatePersonaSchema,
  startVideoChainSchema,
  chainAuthorizationSchema,
  inheritCameraMetadata,
  identityHash,
  type PersonaIdentitySnapshot,
} from "./personaVaultContracts";
import {
  buildPersonaContinuityPrompt,
  buildPersonaContinuityProviderInput,
  continuityContextSchema,
  verifyPersonaContinuityReceipt,
  PERSONA_CONTINUITY_MODEL,
  PERSONA_CONTINUITY_MODE,
  PERSONA_CONTINUITY_API_PATH,
} from "./personaContinuityProviderContract";
import {
  downloadHttpsToFile,
  isForbiddenNetworkAddress,
  persistPersonaReference,
  persistVideoChainSegmentMedia,
  type VideoChainMediaRuntime,
} from "./videoChainMedia";

const execFileAsync = promisify(execFile);
const databaseUrl = process.env.CREATORVAULT_PERSONA_TEST_DATABASE_URL;
const integration = describe.skipIf(!databaseUrl);
const realFetch = globalThis.fetch.bind(globalThis);
let scratch: string;
let api: Server;
let fixtureOrigin: string;
let media: VideoChainMediaRuntime;
let pool: Pool;
let vault: typeof import("./personaVaultService");
let engine: typeof import("./videoChainedContinuity");
let provider: typeof import("./personaVideoProvider");
let governance: typeof import("./governedPolloService");
let database: typeof import("../db");
let personaRouter: typeof import("../routers/personaVaultRouter");
const sourceUrl = "https://fixture-media.invalid/source.png";
const tasks = new Map<
  string,
  {
    input: Record<string, unknown>;
    status: "succeed" | "processing" | "failed";
  }
>();
const submissions: Array<{ taskId: string; input: Record<string, unknown> }> =
  [];
let submissionMode: "ok" | "unknown" | "fail" = "ok";
let providerStatus: "succeed" | "processing" | "failed" = "succeed";
let quoteCredits = 7;
let invalidQuote = false;
let failPolls = 0;
let mediaDownloadFailures = 0;
const savedEnvironment = { ...process.env };
interface CountRow extends RowDataPacket {
  count: number;
}
async function count(table: string): Promise<number> {
  if (!/^[a-z_]+$/.test(table)) throw new Error("Invalid fixture table name");
  const [rows] = await pool.query<CountRow[]>(
    `SELECT COUNT(*) AS count FROM \`${table}\``
  );
  return Number(rows[0].count);
}
function fixtureSnapshot(): PersonaIdentitySnapshot {
  return {
    personaId: randomUUID(),
    userId: 6,
    version: 1,
    personaName: "Fixture Persona",
    avatarBaseUrl: sourceUrl,
    avatarSha256: "a".repeat(64),
    loraModelId: "fixture-lora-v1",
    voiceProfileId: "fixture-voice-v1",
    triggerToken: "TOK",
    wardrobe: {
      tag: "signature",
      description: "Black suit with a gold crown",
      tags: ["black", "gold"],
    },
    accessoryAttributes: { crown: "gold" },
  };
}
function jobContract() {
  const snapshot = fixtureSnapshot();
  const camera = inheritCameraMetadata(null, { cameraMotionType: "dolly_in" });
  const context = {
    chainId: randomUUID(),
    segmentId: randomUUID(),
    segmentOrder: 1,
    attempt: 1,
    snapshot,
    camera,
    incomingCamera: null,
    sourceFrameUrl: sourceUrl,
    sourceFrameSha256: snapshot.avatarSha256,
    endFrameUrl: null,
    endFrameSha256: null,
    promptText: "Walk forward in one continuous shot.",
    durationSec: 3,
    frameRate: 30,
    aspectRatio: "1:1" as const,
  };
  return {
    provider: "pollo",
    providerModelPath: PERSONA_CONTINUITY_MODEL,
    mode: PERSONA_CONTINUITY_MODE,
    sourceUrl,
    sourceChecksum: snapshot.avatarSha256,
    durationSeconds: 3,
    prompt: buildPersonaContinuityPrompt(context),
    metadata: { personaContinuity: context },
  };
}
function ownerActor(id: number, role: "king" | "admin" = "king") {
  return { id, role };
}
function user(id: number, role: User["role"] = "creator"): User {
  return {
    id,
    openId: `fixture-${id}`,
    name: "Local Fixture User",
    email: null,
    loginMethod: null,
    role,
    language: "en",
    country: null,
    referredBy: null,
    creatorStatus: "approved",
    contentType: [],
    primaryBrand: "CREATORVAULT",
    cashappHandle: null,
    paypalEmail: null,
    zelleHandle: null,
    applepayHandle: null,
    stripeConnectAccountId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };
}
beforeAll(async () => {
  scratch = await mkdtemp(
    path.join(tmpdir(), "creatorvault-persona-contract-")
  );
  await execFileAsync("ffmpeg", [
    "-v",
    "error",
    "-f",
    "lavfi",
    "-i",
    "color=c=navy:s=320x320",
    "-frames:v",
    "1",
    "-threads",
    "2",
    path.join(scratch, "source.png"),
  ]);
  await execFileAsync("ffmpeg", [
    "-v",
    "error",
    "-f",
    "lavfi",
    "-i",
    "testsrc2=s=320x320:r=30:d=3",
    "-c:v",
    "libx264",
    "-bf",
    "3",
    "-threads",
    "2",
    "-pix_fmt",
    "yuv420p",
    path.join(scratch, "provider.mp4"),
  ]);
  api = createServer(async (req, res) => {
    try {
      const url = new URL(req.url ?? "/", "http://127.0.0.1");
      if (
        url.pathname === "/source.png" ||
        url.pathname === "/provider.mp4" ||
        url.pathname.startsWith("/uploads/")
      ) {
        const target = url.pathname.startsWith("/uploads/")
          ? path.join(scratch, "uploads", url.pathname.slice(9))
          : path.join(scratch, url.pathname.slice(1));
        if (!target.startsWith(`${scratch}${path.sep}`))
          throw new Error("Fixture file escaped its scratch directory");
        const bytes = await readFile(target);
        res.writeHead(200, {
          "content-type": target.endsWith(".png") ? "image/png" : "video/mp4",
        });
        res.end(bytes);
        return;
      }
      const chunks: Buffer[] = [];
      for await (const chunk of req)
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
      const raw: unknown = chunks.length
        ? JSON.parse(Buffer.concat(chunks).toString("utf8"))
        : {};
      const body =
        raw && typeof raw === "object" && "input" in raw ? raw.input : null;
      if (
        url.pathname === `/api/platform${PERSONA_CONTINUITY_API_PATH}/estimate`
      ) {
        res.writeHead(200, { "content-type": "application/json" });
        res.end(
          JSON.stringify(
            invalidQuote
              ? { credits: quoteCredits }
              : { credits: quoteCredits, costUsd: quoteCredits * 0.06 }
          )
        );
        return;
      }
      if (
        url.pathname === `/api/platform${PERSONA_CONTINUITY_API_PATH}` &&
        req.method === "POST"
      ) {
        if (!body || typeof body !== "object" || Array.isArray(body))
          throw new Error("Fixture generation input missing");
        const input = body as Record<string, unknown>;
        expect(Object.keys(input).sort()).toEqual(
          input.imageTail
            ? [
                "duration",
                "generateAudio",
                "image",
                "imageTail",
                "mode",
                "prompt",
              ]
            : ["duration", "generateAudio", "image", "mode", "prompt"]
        );
        const taskId = `task_${submissions.length + 1}`;
        submissions.push({ taskId, input });
        tasks.set(taskId, { input, status: providerStatus });
        const mode = submissionMode;
        submissionMode = "ok";
        if (mode === "unknown") {
          res.writeHead(500, { "content-type": "application/json" });
          res.end(
            JSON.stringify({
              message: "Local contract accepted the task but lost its response",
            })
          );
          return;
        }
        if (mode === "fail") {
          res.writeHead(400, { "content-type": "application/json" });
          res.end(
            JSON.stringify({
              message: "Local contract definitive generation rejection",
            })
          );
          return;
        }
        res.writeHead(200, { "content-type": "application/json" });
        res.end(JSON.stringify({ taskId, status: "waiting" }));
        return;
      }
      if (url.pathname === "/api/platform/credit/balance") {
        res.writeHead(200, { "content-type": "application/json" });
        res.end(
          JSON.stringify({
            availableCredits: 1000 - submissions.length * quoteCredits,
          })
        );
        return;
      }
      const statusPath = url.pathname.match(
        /^\/api\/platform\/(?:v1\/)?generation\/([^/]+)\/status$/
      );
      if (statusPath) {
        if (failPolls > 0) {
          failPolls -= 1;
          res.writeHead(503, { "content-type": "application/json" });
          res.end(JSON.stringify({ message: "Local read-only status outage" }));
          return;
        }
        const task = tasks.get(statusPath[1]);
        if (!task) throw new Error("Unknown local provider task");
        res.writeHead(200, { "content-type": "application/json" });
        res.end(
          JSON.stringify({
            taskId: statusPath[1],
            input: task.input,
            credit: quoteCredits,
            costUsd: quoteCredits * 0.06,
            generations: [
              {
                id: `generation_${statusPath[1]}`,
                status: task.status,
                failMsg:
                  task.status === "failed"
                    ? "Local fixture render failure"
                    : null,
                mediaType: "video",
                url:
                  task.status === "succeed"
                    ? "https://fixture-media.invalid/provider.mp4"
                    : null,
              },
            ],
          })
        );
        return;
      }
      throw new Error(
        `Unexpected local contract route ${req.method} ${url.pathname}`
      );
    } catch (error) {
      res.writeHead(400, { "content-type": "application/json" });
      res.end(
        JSON.stringify({
          message: error instanceof Error ? error.message : String(error),
        })
      );
    }
  });
  await new Promise<void>(resolve => api.listen(0, "127.0.0.1", resolve));
  const address = api.address();
  if (!address || typeof address === "string")
    throw new Error("No local fixture port");
  fixtureOrigin = `http://127.0.0.1:${address.port}`;
  media = {
    uploadsRoot: path.join(scratch, "uploads"),
    publicBaseUrl: "https://creatorvault.live",
    ffmpegPath: "ffmpeg",
    ffprobePath: "ffprobe",
    async download(url, destination, maximumBytes) {
      const parsed = new URL(url);
      if (
        !["fixture-media.invalid", "creatorvault.live"].includes(
          parsed.hostname
        )
      )
        throw new Error("External fixture media request blocked");
      if (parsed.pathname === "/provider.mp4" && mediaDownloadFailures > 0) {
        mediaDownloadFailures -= 1;
        throw new Error("Local media storage/download interruption");
      }
      const response = await realFetch(`${fixtureOrigin}${parsed.pathname}`);
      if (!response.ok)
        throw new Error(`Local fixture media HTTP ${response.status}`);
      const bytes = Buffer.from(await response.arrayBuffer());
      if (bytes.length > maximumBytes)
        throw new Error("Fixture exceeds the production byte limit");
      await writeFile(destination, bytes, { flag: "wx" });
    },
  };
}, 60000);
afterAll(async () => {
  vi.unstubAllGlobals();
  for (const key of Object.keys(process.env))
    if (!(key in savedEnvironment)) delete process.env[key];
  Object.assign(process.env, savedEnvironment);
  if (api)
    await new Promise<void>((resolve, reject) =>
      api.close(error => (error ? reject(error) : resolve()))
    );
  if (scratch) await rm(scratch, { recursive: true, force: true });
});

describe("Persona continuity strict domain contracts", () => {
  it("requires consent, ownership and HTTPS references", () => {
    expect(
      createPersonaSchema.safeParse({
        personaName: "Persona",
        avatarBaseUrl: sourceUrl,
      }).success
    ).toBe(false);
    expect(
      createPersonaSchema.safeParse({
        personaName: "Persona",
        avatarBaseUrl: "http://unsafe.invalid/a.png",
        ownershipConfirmed: true,
        consentConfirmed: true,
      }).success
    ).toBe(false);
  });
  it("does not apply create defaults to partial updates", () => {
    const parsed = updatePersonaSchema.parse({
      personaId: randomUUID(),
      expectedVersion: 1,
      changes: { personaName: "Renamed" },
      ownershipConfirmed: true,
      consentConfirmed: true,
    });
    expect(parsed.changes).toEqual({ personaName: "Renamed" });
  });
  it("rejects duplicate wardrobe tags, empty updates and unknown fields", () => {
    const outfit = { tag: "suit", description: "Black suit", tags: [] };
    expect(
      createPersonaSchema.safeParse({
        personaName: "Persona",
        avatarBaseUrl: sourceUrl,
        ownershipConfirmed: true,
        consentConfirmed: true,
        signatureWardrobes: [outfit, outfit],
      }).success
    ).toBe(false);
    expect(
      updatePersonaSchema.safeParse({
        personaId: randomUUID(),
        expectedVersion: 1,
        changes: {},
        ownershipConfirmed: true,
        consentConfirmed: true,
      }).success
    ).toBe(false);
    expect(
      startVideoChainSchema.safeParse({
        personaId: randomUUID(),
        idempotencyKey: "fixture-key",
        shots: [],
        userId: 99,
      }).success
    ).toBe(false);
  });
  it("enforces real model duration, prompt and shot-count limits", () => {
    const input = {
      personaId: randomUUID(),
      idempotencyKey: "fixture-key",
      shots: [{ durationSec: 2, promptText: "Walk" }],
    };
    expect(startVideoChainSchema.safeParse(input).success).toBe(false);
    expect(
      startVideoChainSchema.safeParse({
        ...input,
        shots: Array.from({ length: 25 }, () => ({
          durationSec: 3,
          promptText: "Walk",
        })),
      }).success
    ).toBe(false);
  });
  it("inherits camera velocity and angular momentum without resetting to zero", () => {
    const first = inheritCameraMetadata(null, {
      cameraMotionType: "dolly_in",
      cameraMetadata: {
        speed: 2,
        angularVelocity: { yaw: 0.5, pitch: 0, roll: 0 },
      },
    });
    expect(inheritCameraMetadata(first, {})).toEqual(first);
    expect(first.linearVelocity.z).toBe(2);
  });
  it("allows explicit shot camera changes while retaining unspecified momentum", () => {
    const first = inheritCameraMetadata(null, {
      cameraMotionType: "tracking",
      cameraMetadata: { linearVelocity: { x: 1, y: 2, z: 3 } },
    });
    const next = inheritCameraMetadata(first, {
      cameraMotionType: "pan_left",
      cameraMetadata: { speed: 4 },
    });
    expect(next.motionType).toBe("pan_left");
    expect(next.speed).toBe(4);
    expect(next.linearVelocity).toEqual(first.linearVelocity);
  });
  it("builds the real first/last-frame request without invented provider fields", () => {
    const job = jobContract();
    const input = buildPersonaContinuityProviderInput(job);
    expect(input.image).toBe(sourceUrl);
    expect(input.generateAudio).toBe(false);
    expect(input.duration).toBe(3);
    expect(input).not.toHaveProperty("lora_model_id");
    expect(input).not.toHaveProperty("frameRate");
    expect(input).not.toHaveProperty("voice_profile_id");
  });
  it("rejects changed identity, camera, frame checksum or provider prompt", () => {
    const job = jobContract();
    expect(() =>
      buildPersonaContinuityProviderInput({
        ...job,
        sourceChecksum: "b".repeat(64),
      })
    ).toThrow(/immutable/);
    expect(() =>
      buildPersonaContinuityProviderInput({
        ...job,
        prompt: `${job.prompt} changed`,
      })
    ).toThrow(/immutable/);
    const altered = {
      ...job,
      metadata: {
        personaContinuity: {
          ...job.metadata.personaContinuity,
          camera: { ...job.metadata.personaContinuity.camera, speed: 9 },
        },
      },
    };
    expect(() => buildPersonaContinuityProviderInput(altered)).toThrow(
      /immutable/
    );
  });
  it("hashes identity snapshots deterministically and detects LoRA/wardrobe changes", () => {
    expect(identityHash({ a: 1, b: 2 })).toBe(identityHash({ b: 2, a: 1 }));
    const snapshot = fixtureSnapshot();
    expect(identityHash(snapshot)).not.toBe(
      identityHash({ ...snapshot, loraModelId: "fixture-lora-v2" })
    );
  });
  it("requires persisted king or admin grant provenance", () => {
    const authorization = {
      ownerId: 81,
      ownerRole: "king" as const,
      requestHash: "a".repeat(64),
      maxCreditsPerSegment: 20,
      maximumOutputs: 1,
      authorizedAt: "2026-01-01T00:00:00.000Z",
      expiresAt: "2026-01-01T00:10:00.000Z",
      reason: "Local persisted grant provenance contract",
    };
    const { ownerRole, ...withoutOwnerRole } = authorization;
    expect(ownerRole).toBe("king");
    expect(chainAuthorizationSchema.safeParse(authorization).success).toBe(
      true
    );
    expect(chainAuthorizationSchema.safeParse(withoutOwnerRole).success).toBe(
      false
    );
    expect(
      chainAuthorizationSchema.safeParse({
        ...authorization,
        ownerRole: "creator",
      }).success
    ).toBe(false);
  });
  it("rejects unrelated receipts and multiple candidates", () => {
    const input = buildPersonaContinuityProviderInput(jobContract());
    expect(() =>
      verifyPersonaContinuityReceipt(
        input,
        {
          taskId: "task_1",
          input: { ...input, image: "https://other.invalid/image.png" },
          credit: 7,
          costUsd: 0.42,
          generations: [],
        },
        "task_1"
      )
    ).toThrow(/receipt/);
  });
});

describe("Real native FFmpeg continuity and media security", () => {
  it("pins original image bytes and reuses immutable identity references", async () => {
    const input = { personaId: randomUUID(), assetId: randomUUID(), sourceUrl };
    const first = await persistPersonaReference(input, media);
    const second = await persistPersonaReference(input, media);
    const checksum = createHash("sha256")
      .update(await readFile(path.join(scratch, "source.png")))
      .digest("hex");
    expect(first.sha256).toBe(checksum);
    expect(second).toMatchObject(first);
    expect(first.width).toBe(320);
  });
  it("extracts the actual final presentation-order decoded B-frame rather than a seek approximation", async () => {
    const input = {
      chainId: randomUUID(),
      segmentId: randomUUID(),
      providerVideoUrl: "https://fixture-media.invalid/provider.mp4",
      durationSec: 3,
      frameRate: 30,
      aspectRatio: "1:1" as const,
    };
    const result = await persistVideoChainSegmentMedia(input, media);
    expect(result.frameCount).toBe(90);
    expect(result.actualFrameRate).toBe(30);
    const target = path.join(
      media.uploadsRoot,
      "video-chains",
      input.chainId,
      input.segmentId,
      "terminal.png"
    );
    const expected = await execFileAsync(
      "ffmpeg",
      [
        "-v",
        "error",
        "-i",
        path.join(scratch, "provider.mp4"),
        "-vf",
        "reverse",
        "-frames:v",
        "1",
        "-f",
        "rawvideo",
        "-pix_fmt",
        "rgb24",
        "pipe:1",
      ],
      { encoding: "buffer", maxBuffer: 2 * 1024 * 1024 }
    );
    const actual = await execFileAsync(
      "ffmpeg",
      [
        "-v",
        "error",
        "-i",
        target,
        "-frames:v",
        "1",
        "-f",
        "rawvideo",
        "-pix_fmt",
        "rgb24",
        "pipe:1",
      ],
      { encoding: "buffer", maxBuffer: 2 * 1024 * 1024 }
    );
    expect(actual.stdout.equals(expected.stdout)).toBe(true);
    const repeated = await persistVideoChainSegmentMedia(input, media);
    expect(repeated).toEqual(result);
  });
  it("fails without cropping if a video does not match the approved aspect ratio", async () => {
    await expect(
      persistVideoChainSegmentMedia(
        {
          chainId: randomUUID(),
          segmentId: randomUUID(),
          providerVideoUrl: "https://fixture-media.invalid/provider.mp4",
          durationSec: 3,
          frameRate: 30,
          aspectRatio: "9:16",
        },
        media
      )
    ).rejects.toThrow(/aspect ratio/);
  });
  it("rejects path traversal and non-positive native media properties", async () => {
    await expect(
      persistPersonaReference(
        { personaId: "../escape", assetId: randomUUID(), sourceUrl },
        media
      )
    ).rejects.toThrow(/UUID/);
    await expect(
      persistVideoChainSegmentMedia(
        {
          chainId: randomUUID(),
          segmentId: randomUUID(),
          providerVideoUrl: sourceUrl,
          durationSec: 0,
          frameRate: 30,
          aspectRatio: "1:1",
        },
        media
      )
    ).rejects.toThrow(/duration/);
  });
  it.each([
    "127.0.0.1",
    "10.0.0.1",
    "169.254.169.254",
    "172.16.0.1",
    "192.168.1.1",
    "100.64.0.1",
    "::1",
    "fc00::1",
    "fe80::1",
    "fec0::1",
    "2001:db8::1",
    "::ffff:127.0.0.1",
    "2002:7f00:1::",
    "not-an-ip",
  ])("blocks SSRF address %s", address =>
    expect(isForbiddenNetworkAddress(address)).toBe(true)
  );
  it("recognizes public network addresses without resolving or contacting them", () => {
    expect(isForbiddenNetworkAddress("8.8.8.8")).toBe(false);
    expect(isForbiddenNetworkAddress("2606:4700:4700::1111")).toBe(false);
  });
  it("production downloader rejects HTTP and HTTPS loopback without creating a file", async () => {
    await expect(
      downloadHttpsToFile(
        `${fixtureOrigin}/source.png`,
        path.join(scratch, "unsafe1"),
        1000
      )
    ).rejects.toThrow(/HTTPS/);
    await expect(
      downloadHttpsToFile(
        "https://127.0.0.1/source.png",
        path.join(scratch, "unsafe2"),
        1000
      )
    ).rejects.toThrow(/forbidden/);
  });
});

integration(
  "Real SQL + governed provider HTTP + FFmpeg chain integration (not real-persona output proof)",
  () => {
    beforeAll(async () => {
      if (!databaseUrl)
        throw new Error("Isolated Persona Continuity database required");
      const target = new URL(databaseUrl);
      if (
        !["127.0.0.1", "localhost"].includes(target.hostname) ||
        target.pathname !== "/creatorvault_persona_test"
      )
        throw new Error(
          "Tests require the isolated local creatorvault_persona_test database"
        );
      process.env.DATABASE_URL = databaseUrl;
      process.env.POLLO_API_KEY = "local-contract-fixture-only";
      process.env.CREATORVAULT_PERSONA_UPLOADS_ROOT = media.uploadsRoot;
      process.env.CREATORVAULT_PUBLIC_BASE_URL = media.publicBaseUrl;
      process.env.CREATORVAULT_POLLO_EXECUTION_MODE = "governed";
      process.env.CREATORVAULT_POLLO_EMERGENCY_FREEZE = "off";
      process.env.CREATORVAULT_GOVERNED_POLLO_EXECUTION_ENABLED = "true";
      process.env.CREATORVAULT_POLLO_GLOBAL_DAILY_CREDIT_CAP = "10000";
      process.env.CREATORVAULT_POLLO_PER_USER_DAILY_CREDIT_CAP = "10000";
      process.env.CREATORVAULT_POLLO_PER_REQUEST_CREDIT_CAP = "1000";
      process.env.CREATORVAULT_POLLO_MAX_CONCURRENT_JOBS = "1";
      pool = mysql.createPool(databaseUrl);
      const [tables] = await pool.query<RowDataPacket[]>(
        "SHOW TABLES LIKE 'persona_vaults'"
      );
      if (!tables.length) {
        await pool.query(
          "CREATE TABLE users (id INT PRIMARY KEY, openId VARCHAR(64) UNIQUE, name TEXT, role VARCHAR(16) NOT NULL)"
        );
        await pool.query(
          "CREATE TABLE media_assets (id VARCHAR(191) PRIMARY KEY, user_id INT NOT NULL, asset_type VARCHAR(32), mime_type VARCHAR(100), public_url TEXT, status VARCHAR(32))"
        );
        const migration = await readFile(
          new URL(
            "../../drizzle/0025_persona_vault_chained_continuity.sql",
            import.meta.url
          ),
          "utf8"
        );
        for (const statement of migration.split("--> statement-breakpoint"))
          if (statement.trim()) await pool.query(statement);
      }
      vi.stubGlobal(
        "fetch",
        (input: string | URL | Request, init?: RequestInit) => {
          const url = new URL(
            typeof input === "string"
              ? input
              : input instanceof URL
                ? input.toString()
                : input.url
          );
          if (
            url.hostname !== "pollo.ai" ||
            !url.pathname.startsWith("/api/platform/")
          )
            throw new Error(
              `External provider request blocked in local tests: ${url.hostname}`
            );
          return realFetch(
            `${fixtureOrigin}${url.pathname}${url.search}`,
            init
          );
        }
      );
      database = await import("../db");
      governance = await import("./governedPolloService");
      vault = await import("./personaVaultService");
      engine = await import("./videoChainedContinuity");
      provider = await import("./personaVideoProvider");
      personaRouter = await import("../routers/personaVaultRouter");
      await governance.ensureGovernedPolloSchema();
    });
    beforeEach(async () => {
      for (const table of [
        "governed_media_single_use_permits",
        "governed_media_events",
        "governed_media_approvals",
        "governed_media_budget_ledger",
        "governed_media_jobs",
        "video_chain_segments",
        "video_generation_chains",
        "persona_assets",
        "persona_vaults",
        "media_assets",
        "users",
      ])
        await pool.query(`DELETE FROM \`${table}\``);
      await pool.query(
        "INSERT INTO users(id,openId,name,role) VALUES(6,'creator-fixture','Creator','creator'),(42,'other-creator-fixture','Other Creator','creator'),(81,'king-fixture','King','king'),(82,'admin-fixture','Admin','admin')"
      );
      await pool.query(
        "INSERT INTO media_assets(id,user_id,asset_type,mime_type,public_url,status) VALUES('fixture-image',6,'image','image/png',?,'ready')",
        [sourceUrl]
      );
      tasks.clear();
      submissions.length = 0;
      quoteCredits = 7;
      invalidQuote = false;
      failPolls = 0;
      mediaDownloadFailures = 0;
      submissionMode = "ok";
      providerStatus = "succeed";
      process.env.CREATORVAULT_POLLO_EMERGENCY_FREEZE = "off";
    });
    afterAll(async () => {
      if (database) {
        await (await database.getPersonaVaultSqlClient()).end();
        const direct = database.db as unknown as {
          $client: import("mysql2").Pool;
        };
        await direct.$client.promise().end();
      }
      if (pool) await pool.end();
    });
    async function newChain(
      shots = 2,
      extra: { endFrame?: boolean; aspectRatio?: "1:1" | "9:16"; personaName?: string } = {}
    ) {
      const persona = await vault.createPersona(
        6,
        {
          personaName: extra.personaName ?? "Fixture Persona",
          avatarBaseUrl: sourceUrl,
          loraModelId: "fixture-lora-v1",
          voiceProfileId: "fixture-voice-v1",
          signatureWardrobes: [
            {
              tag: "signature",
              description: "Black suit and gold crown",
              tags: ["black", "gold"],
            },
          ],
          accessoryAttributes: { crown: "gold" },
          ownershipConfirmed: true,
          consentConfirmed: true,
        },
        media
      );
      const request = {
        personaId: persona.id,
        idempotencyKey: `chain:${randomUUID()}`,
        aspectRatio: extra.aspectRatio ?? ("1:1" as const),
        shots: Array.from({ length: shots }, (_, index) => ({
          durationSec: 3,
          promptText: `Fixture shot ${index + 1}: walk forward in the same room.`,
          ...(index === 0
            ? {
                cameraMotionType: "dolly_in" as const,
                cameraMetadata: { speed: 2 },
              }
            : {}),
          ...(extra.endFrame ? { endFrameUrl: sourceUrl } : {}),
        })),
      };
      const chain = await vault.startVideoChain(6, request, media);
      return { persona, request, chain };
    }
    async function authorize(chainId: string) {
      const status = await vault.getVideoChainStatus(6, chainId);
      return engine.approveVideoChain(ownerActor(81), {
        chainId,
        creatorId: 6,
        expectedRequestHash: status.requestHash,
        maxCreditsPerSegment: 20,
        expiresInMinutes: 10,
        reason:
          "Local SQL and HTTP contract test authorization; no real provider call",
      });
    }
    async function tick(chainId: string, runtime = media) {
      const db = await database.getPersonaVaultDb();
      await db
        .update(videoGenerationChains)
        .set({ nextProcessAt: new Date(Date.now() - 60000) })
        .where(eq(videoGenerationChains.id, chainId));
      return engine.processVideoChain(6, chainId, { mediaRuntime: runtime });
    }
    it("persists all identity fields and source-linked immutable persona assets", async () => {
      const { persona } = await newChain(1);
      expect(persona).toMatchObject({
        userId: 6,
        loraModelId: "fixture-lora-v1",
        voiceProfileId: "fixture-voice-v1",
        version: 1,
      });
      expect(persona.assets).toHaveLength(1);
      expect(persona.assets[0].sourceMediaAssetId).toBe("fixture-image");
      expect(persona.avatarBaseUrl).toMatch(/\/uploads\/persona-vaults\//);
      expect(persona.avatarSha256).toHaveLength(64);
    });
    it("rejects foreign persona reads, updates and unowned source references", async () => {
      const { persona } = await newChain(1);
      await expect(vault.getPersona(42, persona.id)).rejects.toThrow(
        /not found/
      );
      await expect(
        vault.updatePersona(
          42,
          {
            personaId: persona.id,
            expectedVersion: 1,
            changes: { personaName: "Stolen" },
            ownershipConfirmed: true,
            consentConfirmed: true,
          },
          media
        )
      ).rejects.toThrow(/not found/);
      await expect(
        vault.createPersona(
          42,
          {
            personaName: "Unowned",
            avatarBaseUrl: sourceUrl,
            ownershipConfirmed: true,
            consentConfirmed: true,
          },
          media
        )
      ).rejects.toThrow(/owned Media Vault/);
    });
    it("rejects stale updates and preserves fields omitted from a partial update", async () => {
      const { persona } = await newChain(1);
      const updated = await vault.updatePersona(
        6,
        {
          personaId: persona.id,
          expectedVersion: 1,
          changes: { personaName: "Renamed" },
          ownershipConfirmed: true,
          consentConfirmed: true,
        },
        media
      );
      expect(updated.version).toBe(2);
      expect(updated.loraModelId).toBe(persona.loraModelId);
      expect(updated.signatureWardrobes).toEqual(persona.signatureWardrobes);
      await expect(
        vault.updatePersona(
          6,
          {
            personaId: persona.id,
            expectedVersion: 1,
            changes: { personaName: "Stale" },
            ownershipConfirmed: true,
            consentConfirmed: true,
          },
          media
        )
      ).rejects.toThrow(/changed/);
    });
    it("keeps chain identities frozen when the live persona is edited", async () => {
      const { persona, chain } = await newChain(1);
      await vault.updatePersona(
        6,
        {
          personaId: persona.id,
          expectedVersion: 1,
          changes: {
            loraModelId: "fixture-lora-v2",
            accessoryAttributes: { crown: "silver" },
          },
          ownershipConfirmed: true,
          consentConfirmed: true,
        },
        media
      );
      const frozen = await vault.getVideoChainStatus(6, chain.id);
      expect(frozen.personaSnapshot.loraModelId).toBe("fixture-lora-v1");
      expect(frozen.personaSnapshot.accessoryAttributes).toEqual({
        crown: "gold",
      });
    });
    it("returns one persisted chain under replay and concurrent requests", async () => {
      const { request, chain } = await newChain(2);
      const replayed = await Promise.all(
        Array.from({ length: 5 }, () =>
          vault.startVideoChain(6, request, media)
        )
      );
      expect(replayed.every(candidate => candidate.id === chain.id)).toBe(true);
      expect(await count("video_generation_chains")).toBe(1);
      expect(await count("video_chain_segments")).toBe(2);
      await expect(
        vault.startVideoChain(
          6,
          { ...request, shots: [{ durationSec: 3, promptText: "Different" }] },
          media
        )
      ).rejects.toThrow(/idempotency/);
    });
    it("does not create or submit a provider job without explicit owner authorization", async () => {
      const { chain } = await newChain(2);
      await tick(chain.id);
      expect(submissions).toHaveLength(0);
      expect(await count("governed_media_jobs")).toBe(0);
      await expect(
        engine.approveVideoChain(
          { id: 42, role: "creator" },
          {
            chainId: chain.id,
            creatorId: 6,
            expectedRequestHash: chain.requestHash,
            maxCreditsPerSegment: 20,
            reason: "Not the existing owner",
          }
        )
      ).rejects.toThrow(/trusted king or admin/);
    });
    it("denies ordinary roles with legacy IDs and allows king or admin roles with nonmagic IDs", async () => {
      const { chain: ordinaryChain } = await newChain(1);
      const ordinaryApproval = {
        chainId: ordinaryChain.id,
        creatorId: 6,
        expectedRequestHash: ordinaryChain.requestHash,
        maxCreditsPerSegment: 20,
        reason: "Role authorization test; no provider execution is requested",
      };
      await expect(
        engine.approveVideoChain({ id: 6, role: "creator" }, ordinaryApproval)
      ).rejects.toThrow(/trusted king or admin/);
      await expect(
        engine.approveVideoChain({ id: 33, role: "creator" }, ordinaryApproval)
      ).rejects.toThrow(/trusted king or admin/);
      const kingApproval = await engine.approveVideoChain(
        ownerActor(81, "king"),
        ordinaryApproval
      );
      expect(kingApproval.authorization).toMatchObject({
        ownerId: 81,
        ownerRole: "king",
      });
      const { chain: adminChain } = await newChain(1, { personaName: "Admin Fixture Persona" });
      const adminApproval = await engine.approveVideoChain(
        ownerActor(82, "admin"),
        {
          chainId: adminChain.id,
          creatorId: 6,
          expectedRequestHash: adminChain.requestHash,
          maxCreditsPerSegment: 20,
          reason:
            "Admin authorization test; no provider execution is requested",
        }
      );
      expect(adminApproval.authorization).toMatchObject({
        ownerId: 82,
        ownerRole: "admin",
      });
      expect(submissions).toHaveLength(0);
    });
    it("uses current local DB roles for Persona handoff approval without provider submission", async () => {
      const draftFor = async () => {
        const { chain } = await newChain(1, { personaName: `Handoff Fixture ${randomUUID()}` });
        const segment = chain.segments[0];
        const context = continuityContextSchema.parse({
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
        return provider.governedPersonaVideoProvider.createDraft(context, 20);
      };
      const creatorDraft = await draftFor();
      await expect(
        governance.approveGovernedPolloJob({
          jobId: Number(creatorDraft.id),
          approverId: 6,
          expectedFingerprint: creatorDraft.fingerprint,
        })
      ).rejects.toThrow(/Owner approval/);
      const kingDraft = await draftFor();
      await expect(
        governance.approveGovernedPolloJob({
          jobId: Number(kingDraft.id),
          approverId: 81,
          expectedFingerprint: kingDraft.fingerprint,
        })
      ).resolves.toMatchObject({ state: "approved", approvedBy: 81 });
      await governance.closeUnusedPersonaContinuityApproval({
        jobId: Number(kingDraft.id),
        reason: "Local king authorization test cleanup",
      });
      const adminDraft = await draftFor();
      await expect(
        governance.approveGovernedPolloJob({
          jobId: Number(adminDraft.id),
          approverId: 82,
          expectedFingerprint: adminDraft.fingerprint,
        })
      ).resolves.toMatchObject({ state: "approved", approvedBy: 82 });
      expect(submissions).toHaveLength(0);
    });
    it("rejects wrong approval hashes and honors the existing emergency freeze", async () => {
      const { chain } = await newChain(1);
      await expect(
        engine.approveVideoChain(ownerActor(6), {
          chainId: chain.id,
          creatorId: 6,
          expectedRequestHash: "b".repeat(64),
          maxCreditsPerSegment: 20,
          reason: "Incorrect snapshot approval",
        })
      ).rejects.toThrow(/Review/);
      await authorize(chain.id);
      process.env.CREATORVAULT_POLLO_EMERGENCY_FREEZE = "on";
      await tick(chain.id);
      expect(submissions).toHaveLength(0);
      expect(await count("governed_media_jobs")).toBe(0);
    });
    it("automatically hands off the exact extracted frame URL, checksum and camera momentum", async () => {
      const { chain } = await newChain(2);
      await authorize(chain.id);
      const first = await tick(chain.id);
      expect(first.completedSegments).toBe(1);
      expect(first.progressPercent).toBe(50);
      expect(first.segments[1].startFrameUrl).toBe(
        first.segments[0].terminalFrameExtractedUrl
      );
      expect(first.segments[1].startFrameSha256).toBe(
        first.segments[0].terminalFrameSha256
      );
      expect(first.segments[1].inheritedCameraMetadata).toEqual(
        first.segments[0].cameraMetadata
      );
      const completed = await tick(chain.id);
      expect(completed.chainStatus).toBe("complete");
      expect(completed.progressPercent).toBe(100);
      expect(submissions).toHaveLength(2);
      expect(submissions[1].input.image).toBe(
        first.segments[0].terminalFrameExtractedUrl
      );
      expect(submissions[1].input.prompt).toContain("without easing to zero");
      expect(completed.renderCompletionIsOwnerAcceptance).toBe(false);
      const gov = await governance.getGovernedPolloJob(
        Number(completed.segments[0].renderJobId)
      );
      expect(gov?.state).toBe("provider_complete");
      expect(gov?.qualityState).not.toBe("accepted");
      const response = await realFetch(
        `${fixtureOrigin}${new URL(completed.segments[1].streamUrl ?? "").pathname}`
      );
      expect(response.status).toBe(200);
      expect((await response.arrayBuffer()).byteLength).toBeGreaterThan(1024);
    });
    it("uses the documented imageTail payload for an owned pinned end frame", async () => {
      const { chain } = await newChain(1, { endFrame: true });
      await authorize(chain.id);
      await tick(chain.id);
      expect(submissions[0].input.imageTail).toMatch(
        /\/uploads\/persona-vaults\//
      );
      expect(submissions[0].input.generateAudio).toBe(false);
    });
    it("serializes concurrent worker claims and never duplicates a render", async () => {
      const { chain } = await newChain(1);
      await authorize(chain.id);
      await Promise.all(
        Array.from({ length: 5 }, () =>
          engine.processVideoChain(6, chain.id, { mediaRuntime: media })
        )
      );
      expect(submissions).toHaveLength(1);
      expect(await count("governed_media_jobs")).toBe(1);
      expect((await vault.getVideoChainStatus(6, chain.id)).chainStatus).toBe(
        "complete"
      );
    });
    it("stops before generation when source framing would require an identity crop", async () => {
      const { chain } = await newChain(1, { aspectRatio: "9:16" });
      await authorize(chain.id);
      await tick(chain.id);
      expect(submissions).toHaveLength(0);
      expect((await vault.getVideoChainStatus(6, chain.id)).chainStatus).toBe(
        "failed"
      );
    });
    it("fails closed on unusable quotes or quotes above the owner ceiling", async () => {
      const { chain } = await newChain(1);
      await authorize(chain.id);
      quoteCredits = 21;
      await tick(chain.id);
      await tick(chain.id);
      await tick(chain.id);
      expect(submissions).toHaveLength(0);
      expect((await vault.getVideoChainStatus(6, chain.id)).chainStatus).toBe(
        "failed"
      );
    });
    it("does not invent a USD quote when the provider omitted it", async () => {
      const { chain } = await newChain(1);
      await authorize(chain.id);
      invalidQuote = true;
      await tick(chain.id);
      expect(submissions).toHaveLength(0);
      expect(await count("governed_media_jobs")).toBe(0);
    });
    it("resumes read-only polling with the same render job after an outage", async () => {
      const { chain } = await newChain(1);
      await authorize(chain.id);
      failPolls = 1;
      const deferred = await tick(chain.id);
      const jobId = deferred.segments[0].renderJobId;
      const recovered = await tick(chain.id);
      expect(recovered.chainStatus).toBe("complete");
      expect(recovered.segments[0].renderJobId).toBe(jobId);
      expect(submissions).toHaveLength(1);
    });
    it("recovers local media ingestion without rerendering the successful segment", async () => {
      const { chain } = await newChain(2);
      await authorize(chain.id);
      mediaDownloadFailures = 1;
      const deferred = await tick(chain.id);
      const jobId = deferred.segments[0].renderJobId;
      expect(deferred.completedSegments).toBe(0);
      expect(deferred.segments[1].renderJobId).toBeNull();
      const recovered = await tick(chain.id);
      expect(recovered.completedSegments).toBe(1);
      expect(recovered.segments[0].renderJobId).toBe(jobId);
      expect(submissions).toHaveLength(1);
    });
    it("preserves completed segments and requires fresh authorization after a definitive render failure", async () => {
      const { chain } = await newChain(2);
      await authorize(chain.id);
      const first = await tick(chain.id);
      submissionMode = "fail";
      const stopped = await tick(chain.id);
      expect(stopped.chainStatus).toBe("failed");
      expect(stopped.completedSegments).toBe(1);
      expect(stopped.authorizationClosedAt).not.toBeNull();
      await engine.retryVideoChain(6, chain.id, stopped.segments[1].id);
      await tick(chain.id);
      expect(submissions).toHaveLength(2);
      await authorize(chain.id);
      const recovered = await tick(chain.id);
      expect(recovered.chainStatus).toBe("complete");
      expect(submissions).toHaveLength(3);
      expect(recovered.segments[0].streamUrl).toBe(first.segments[0].streamUrl);
      expect(recovered.segments[1].attempt).toBe(2);
    });
    it("quarantines uncertain provider acceptance and verifies the original receipt before recovery", async () => {
      const { chain } = await newChain(1);
      await authorize(chain.id);
      submissionMode = "unknown";
      const stopped = await tick(chain.id);
      expect(stopped.segments[0].segmentStatus).toBe("submission_unknown");
      await tick(chain.id);
      expect(submissions).toHaveLength(1);
      await expect(
        engine.retryVideoChain(6, chain.id, stopped.segments[0].id)
      ).rejects.toThrow(/receipt/);
      await provider.reconcilePersonaContinuityReceipt(ownerActor(81), {
        creatorId: 6,
        chainId: chain.id,
        segmentId: stopped.segments[0].id,
        providerTaskId: "task_1",
      });
      await engine.retryVideoChain(6, chain.id, stopped.segments[0].id);
      await authorize(chain.id);
      const recovered = await tick(chain.id);
      expect(recovered.chainStatus).toBe("complete");
      expect(submissions).toHaveLength(1);
      expect(recovered.segments[0].renderJobId).toBe(
        stopped.segments[0].renderJobId
      );
    });
    it("recovers an orphaned persisted draft after a process crash without quoting/submitting a second candidate", async () => {
      const { chain } = await newChain(1);
      await authorize(chain.id);
      providerStatus = "processing";
      const submitted = await tick(chain.id);
      const db = await database.getPersonaVaultDb();
      await db
        .update(videoChainSegments)
        .set({ renderJobId: null, segmentStatus: "pending" })
        .where(eq(videoChainSegments.id, submitted.segments[0].id));
      tasks.get("task_1")!.status = "succeed";
      const recovered = await tick(chain.id);
      expect(recovered.chainStatus).toBe("complete");
      expect(submissions).toHaveLength(1);
      expect(await count("governed_media_jobs")).toBe(1);
    });
    it("blocks a mutated authorized snapshot and expired authorization before any submission", async () => {
      const { chain } = await newChain(1);
      await authorize(chain.id);
      const db = await database.getPersonaVaultDb();
      const status = await vault.getVideoChainStatus(6, chain.id);
      if (!status.authorization)
        throw new Error("Fixture authorization missing");
      await db
        .update(videoGenerationChains)
        .set({
          authorization: {
            ...status.authorization,
            expiresAt: new Date(Date.now() - 1000).toISOString(),
          },
        })
        .where(eq(videoGenerationChains.id, chain.id));
      await tick(chain.id);
      expect(submissions).toHaveLength(0);
      expect((await vault.getVideoChainStatus(6, chain.id)).chainStatus).toBe(
        "failed"
      );
    });
    it("exposes protected tRPC status without foreign-owner leaks and enforces owner authorization", async () => {
      const { chain } = await newChain(1);
      const owner = personaRouter.personaVaultRouter.createCaller({
        req: express.request,
        res: express.response,
        user: user(6, "king"),
      });
      const stranger = personaRouter.personaVaultRouter.createCaller({
        req: express.request,
        res: express.response,
        user: user(42),
      });
      const ordinaryLegacySix = personaRouter.personaVaultRouter.createCaller({
        req: express.request,
        res: express.response,
        user: user(6, "creator"),
      });
      const ordinaryLegacyThirtyThree =
        personaRouter.personaVaultRouter.createCaller({
          req: express.request,
          res: express.response,
          user: user(33, "creator"),
        });
      const nonmagicAdmin = personaRouter.personaVaultRouter.createCaller({
        req: express.request,
        res: express.response,
        user: user(82, "admin"),
      });
      const anonymous = personaRouter.personaVaultRouter.createCaller({
        req: express.request,
        res: express.response,
        user: null,
      });
      expect((await owner.getVideoChainStatus({ chainId: chain.id })).id).toBe(
        chain.id
      );
      await expect(
        stranger.getVideoChainStatus({ chainId: chain.id })
      ).rejects.toMatchObject({ code: "NOT_FOUND" });
      await expect(
        anonymous.getVideoChainStatus({ chainId: chain.id })
      ).rejects.toMatchObject({ code: "UNAUTHORIZED" });
      await expect(
        stranger.approveVideoChain({
          chainId: chain.id,
          creatorId: 6,
          expectedRequestHash: chain.requestHash,
          maxCreditsPerSegment: 20,
          reason: "Unapproved stranger operation",
        })
      ).rejects.toMatchObject({ code: "FORBIDDEN" });
      for (const ordinaryCaller of [
        ordinaryLegacySix,
        ordinaryLegacyThirtyThree,
      ])
        await expect(
          ordinaryCaller.approveVideoChain({
            chainId: chain.id,
            creatorId: 6,
            expectedRequestHash: chain.requestHash,
            maxCreditsPerSegment: 20,
            reason: "Legacy ID without an owner role must be denied",
          })
        ).rejects.toMatchObject({ code: "FORBIDDEN" });
      const approved = await nonmagicAdmin.approveVideoChain({
        chainId: chain.id,
        creatorId: 6,
        expectedRequestHash: chain.requestHash,
        maxCreditsPerSegment: 20,
        reason:
          "Nonmagic admin role authorization; no provider execution is requested",
      });
      expect(approved.authorization).toMatchObject({
        ownerId: 82,
        ownerRole: "admin",
      });
    });
    it("rejects cross-owner foreign-key writes and duplicate segment orders at database level", async () => {
      const { persona, chain } = await newChain(1);
      await expect(
        pool.query(
          "INSERT INTO persona_assets(id,persona_id,user_id,asset_type,asset_url,source_url,source_media_asset_id,sha256,tags) VALUES(?,?,42,'avatar_base',?,?,?,'hash','[]')",
          [randomUUID(), persona.id, sourceUrl, sourceUrl, "fixture-image"]
        )
      ).rejects.toThrow();
      await expect(
        pool.query(
          "INSERT INTO video_chain_segments(id,chain_id,segment_order,duration_sec,prompt_text,camera_motion_type,camera_metadata) SELECT ?,chain_id,segment_order,duration_sec,prompt_text,camera_motion_type,camera_metadata FROM video_chain_segments WHERE chain_id=?",
          [randomUUID(), chain.id]
        )
      ).rejects.toThrow();
    });
    it("refuses physically substituted tail bytes before submission and compensates the unused approval", async () => {
      const { chain } = await newChain(1, { endFrame: true });
      await authorize(chain.id);
      const tail = chain.segments[0].endFrameUrl;
      if (!tail) throw new Error("Pinned fixture tail missing");
      await writeFile(
        path.join(media.uploadsRoot, new URL(tail).pathname.slice(9)),
        Buffer.from("changed fixture frame bytes")
      );
      await tick(chain.id);
      const stopped = await tick(chain.id);
      expect(submissions).toHaveLength(0);
      expect(stopped.chainStatus).toBe("failed");
      const [ledger] = await pool.query<
        Array<RowDataPacket & { credits: number }>
      >(
        "SELECT SUM(CASE WHEN entry_type='reserve' THEN credits ELSE -credits END) AS credits FROM governed_media_budget_ledger WHERE scope='global_daily'"
      );
      expect(Number(ledger[0].credits)).toBe(0);
    });
    it("releases an approved-but-unsubmitted reservation after a restart discovers expired authorization", async () => {
      const { chain } = await newChain(1);
      await authorize(chain.id);
      const segment = chain.segments[0];
      const context = continuityContextSchema.parse({
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
      const draft = await provider.governedPersonaVideoProvider.createDraft(
        context,
        20
      );
      await governance.approveGovernedPolloJob({
        jobId: Number(draft.id),
        approverId: 81,
        expectedFingerprint: draft.fingerprint,
      });
      const db = await database.getPersonaVaultDb();
      const status = await vault.getVideoChainStatus(6, chain.id);
      if (!status.authorization)
        throw new Error("Fixture authorization missing");
      await db
        .update(videoChainSegments)
        .set({ renderJobId: draft.id })
        .where(eq(videoChainSegments.id, segment.id));
      await db
        .update(videoGenerationChains)
        .set({
          authorization: {
            ...status.authorization,
            expiresAt: new Date(Date.now() - 1000).toISOString(),
          },
        })
        .where(eq(videoGenerationChains.id, chain.id));
      const stopped = await tick(chain.id);
      expect(stopped.chainStatus).toBe("failed");
      expect(submissions).toHaveLength(0);
      const closed = await governance.getGovernedPolloJob(Number(draft.id));
      expect(closed?.failureCode).toBe("persona_unused_approval_closed");
      await governance.closeUnusedPersonaContinuityApproval({
        jobId: Number(draft.id),
        reason: "Repeated safe compensation",
      });
      const [ledger] = await pool.query<
        Array<RowDataPacket & { credits: number }>
      >(
        "SELECT SUM(CASE WHEN entry_type='reserve' THEN credits ELSE -credits END) AS credits FROM governed_media_budget_ledger WHERE scope='global_daily'"
      );
      expect(Number(ledger[0].credits)).toBe(0);
      expect(await count("governed_media_budget_ledger")).toBe(4);
    });
    it("does not double-book one governed render slot across concurrently approved chains", async () => {
      const { chain, request } = await newChain(1);
      const second = await vault.startVideoChain(
        6,
        { ...request, idempotencyKey: `chain:${randomUUID()}` },
        media
      );
      await authorize(chain.id);
      await authorize(second.id);
      providerStatus = "processing";
      await Promise.all([
        engine.processVideoChain(6, chain.id, { mediaRuntime: media }),
        engine.processVideoChain(6, second.id, { mediaRuntime: media }),
      ]);
      expect(submissions).toHaveLength(1);
      const [active] = await pool.query<CountRow[]>(
        "SELECT COUNT(*) AS count FROM governed_media_jobs WHERE state IN ('approved','queued','submitted','submission_unknown')"
      );
      expect(Number(active[0].count)).toBe(1);
    });
  }
);
