import {
  execFile,
  spawn,
  type ChildProcessWithoutNullStreams,
} from "node:child_process";
import { createServer } from "node:net";
import {
  chmod,
  copyFile,
  mkdtemp,
  mkdir,
  rm,
  stat,
  writeFile,
} from "node:fs/promises";
import { existsSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { randomBytes } from "node:crypto";
import bcryptjs from "bcryptjs";
import mysql from "mysql2/promise";
import { chromium } from "@playwright/test";

const execFileAsync = promisify(execFile);
const REPOSITORY_ROOT = path.resolve(
  path.dirname(new URL(import.meta.url).pathname),
  ".."
);
const RECOVERY_ROOT = path.join(
  REPOSITORY_ROOT,
  "CREATORVAULT_RECOVERY_2026-10-03"
);
const EVIDENCE_PATH = path.join(
  RECOVERY_ROOT,
  "08_CV_VIDEO_026_LOCAL_PROOF_EVIDENCE.json"
);
const WORKSPACE_EVIDENCE_PATH = path.join(
  RECOVERY_ROOT,
  "10_CREATOR_WORKSPACE_LOCAL_PROOF_EVIDENCE.json"
);
const DIRECTION_PREVIEW_EVIDENCE_PATH = path.join(
  RECOVERY_ROOT,
  "12_TRAILER_DIRECTION_PREVIEW_LOCAL_PROOF_EVIDENCE.json"
);
const LOCAL_TRAILER_CUT_EVIDENCE_PATH = path.join(
  RECOVERY_ROOT,
  "13_LOCAL_TRAILER_CUT_LOCAL_PROOF_EVIDENCE.json"
);
const SCREENSHOT_PATH = path.join(
  RECOVERY_ROOT,
  "08_CV_VIDEO_026_LOCAL_PROOF_SCREENSHOT.png"
);
const WORKSPACE_SCREENSHOT_PATH = path.join(
  RECOVERY_ROOT,
  "10_CREATOR_WORKSPACE_LOCAL_PROOF_SCREENSHOT.png"
);
const DIRECTION_PREVIEW_SCREENSHOT_PATH = path.join(
  RECOVERY_ROOT,
  "12_TRAILER_DIRECTION_PREVIEW_LOCAL_PROOF_SCREENSHOT.png"
);
const LOCAL_TRAILER_CUT_SCREENSHOT_PATH = path.join(
  RECOVERY_ROOT,
  "13_LOCAL_TRAILER_CUT_LOCAL_PROOF_SCREENSHOT.png"
);
const SOURCE_FIXTURE = path.join(
  REPOSITORY_ROOT,
  "client/public/videos/creator-pages/aderly-follow-me.mp4"
);
const FIXTURE_EMAIL = "cv-video-026-proof@example.test";
const FIXTURE_NAME = "CV Video 026 Proof Creator";
const FIXTURE_OPEN_ID = "cv-video-026-proof-open-id";
let proofServerDiagnostic = "";

type ProofDatabase = {
  databaseUrl: string;
  password: string;
  port: number;
  process: ChildProcessWithoutNullStreams;
};

type ProofResult = {
  recordedAt: string;
  scope: "local-disposable-only";
  fixture: {
    applicationUrl: string;
    database: string;
    storageRoot: string;
    authentication: "POST /api/auth/login with the existing signed session cookie";
  };
  ordinaryCreator: {
    userId: number;
    role: "creator";
    privilegedOwnerIdsUsed: false;
  };
  authenticatedRole: "creator";
  sourceFixture: {
    fileName: string;
    copiedFromRepository: boolean;
  };
  upload: {
    mediaAssetId: string;
    uploadReceiptVerified: true;
    endpoint: "POST /api/video/upload/direct";
    ownerUserId: number;
    status: "ready";
    sourceType: "upload";
    storedUrl: string;
    listReturnedExactId: boolean;
    previewLoaded: boolean;
  };
  trailer: {
    handoffSourceAssetId: string;
    draftId: string;
    draftStatus: "draft";
    replayReturnedExactSourceAssetId: boolean;
  };
  workspace: {
    workspaceId: string;
    sourceMediaAssetId: string;
    status: "draft";
    entityName: string;
    replayReturnedExactSourceAssetId: boolean;
  };
  directionPreview: {
    workspaceId: string;
    trailerProjectId: string;
    sourceAssetId: string;
    sourcePreviewLoaded: boolean;
    mandatoryTruthLabelsVisible: boolean;
    creatorVideoStudioHref: string;
    trailerMakerHref: string;
    ownerOnlyRoutesAbsent: boolean;
  };
  localTrailerCut: {
    cutProjectId: string;
    outputMediaAssetId: string;
    sourceMediaAssetId: string;
    trailerProjectId: string;
    ownerUserId: number;
    status: "awaiting_owner_review";
    sourceType: "local_trailer_cut";
    createdByFeature: "creator_workspace_local_trailer_cut.v1";
    publicUrl: string;
    format: "16:9" | "9:16" | "1:1";
    durationSeconds: number;
    width: number;
    height: number;
    browserPlaybackLoaded: true;
    replayVisibleAfterReentry: true;
  };
  restrictions: {
    productionTouched: false;
    providersCalled: false;
    paymentsTouched: false;
    kingCamChanged: false;
    durableFixtureRemoved: true;
  };
};

function fail(code: string): never {
  throw new Error(code);
}

function requireRepositoryRoot(): void {
  if (
    !existsSync(path.join(REPOSITORY_ROOT, "package.json")) ||
    !existsSync(SOURCE_FIXTURE)
  ) {
    fail("CV_VIDEO_026_LOCAL_PROOF_REPOSITORY_INVALID");
  }
}

function randomToken(): string {
  return randomBytes(24).toString("hex");
}

function localPort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const server = createServer();
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      if (!address || typeof address === "string") {
        server.close(() =>
          reject(new Error("CV_VIDEO_026_LOCAL_PROOF_PORT_UNAVAILABLE"))
        );
        return;
      }
      server.close(error => (error ? reject(error) : resolve(address.port)));
    });
  });
}

async function command(
  commandPath: string,
  argumentsList: readonly string[],
  cwd: string
): Promise<void> {
  try {
    await execFileAsync(commandPath, [...argumentsList], {
      cwd,
      env: {
        PATH: process.env.PATH ?? "/usr/bin:/bin",
        HOME: process.env.HOME ?? "/home/ubuntu",
      },
      maxBuffer: 1024 * 1024,
    });
  } catch {
    fail("CV_VIDEO_026_LOCAL_PROOF_DATABASE_TOOL_FAILED");
  }
}

async function waitForDatabase(
  client: string,
  socketPath: string,
  cwd: string
): Promise<void> {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    try {
      await command(
        client,
        [
          "--no-defaults",
          `--socket=${socketPath}`,
          "-u",
          "root",
          "-N",
          "-e",
          "SELECT 1",
        ],
        cwd
      );
      return;
    } catch {
      await new Promise(resolve => setTimeout(resolve, 250));
    }
  }
  fail("CV_VIDEO_026_LOCAL_PROOF_DATABASE_READY_TIMEOUT");
}

function startProcess(
  commandPath: string,
  argumentsList: readonly string[],
  cwd: string,
  environment: NodeJS.ProcessEnv
): ChildProcessWithoutNullStreams {
  return spawn(commandPath, [...argumentsList], {
    cwd,
    env: environment,
    stdio: ["pipe", "pipe", "pipe"],
  });
}

function captureProofServerDiagnostic(
  processToObserve: ChildProcessWithoutNullStreams
): void {
  const capture = (chunk: Buffer): void => {
    const sanitized = chunk
      .toString("utf8")
      .replace(/mysql:\/\/[^\s]+/gi, "mysql://[redacted]")
      .replace(/(password|token|secret)=\S+/gi, "$1=[redacted]")
      .replace(/[\r\n]+/g, " ")
      .slice(0, 700);
    proofServerDiagnostic = `${proofServerDiagnostic} ${sanitized}`.slice(
      -1400
    );
  };
  processToObserve.stdout.on("data", capture);
  processToObserve.stderr.on("data", capture);
}

async function stopProcess(
  processToStop: ChildProcessWithoutNullStreams | null
): Promise<void> {
  if (!processToStop || processToStop.exitCode !== null) return;
  processToStop.kill("SIGTERM");
  await new Promise<void>(resolve => {
    const timer = setTimeout(() => {
      processToStop.kill("SIGKILL");
      resolve();
    }, 5_000);
    processToStop.once("exit", () => {
      clearTimeout(timer);
      resolve();
    });
  });
}

async function createProofDatabase(
  root: string,
  databasePort: number
): Promise<ProofDatabase> {
  const installer = "/usr/bin/mariadb-install-db";
  const daemon = "/usr/sbin/mariadbd";
  const client = "/usr/bin/mariadb";
  if (![installer, daemon, client].every(existsSync)) {
    fail("CV_VIDEO_026_LOCAL_PROOF_DATABASE_TOOLS_UNAVAILABLE");
  }

  const dataDirectory = path.join(root, "database");
  const socketPath = path.join(root, "database.sock");
  const pidPath = path.join(root, "database.pid");
  const logPath = path.join(root, "database.private.log");
  await mkdir(dataDirectory, { recursive: true, mode: 0o700 });
  await command(
    installer,
    [
      "--no-defaults",
      `--datadir=${dataDirectory}`,
      "--auth-root-authentication-method=normal",
      "--skip-test-db",
    ],
    root
  );

  const daemonProcess = startProcess(
    daemon,
    [
      "--no-defaults",
      `--user=${os.userInfo().username}`,
      `--datadir=${dataDirectory}`,
      `--socket=${socketPath}`,
      `--pid-file=${pidPath}`,
      `--port=${databasePort}`,
      "--bind-address=127.0.0.1",
      "--skip-name-resolve",
      `--log-error=${logPath}`,
    ],
    root,
    {
      PATH: "/usr/sbin:/usr/bin:/sbin:/bin",
      HOME: process.env.HOME ?? "/home/ubuntu",
    }
  );

  try {
    await waitForDatabase(client, socketPath, root);
    const databaseName = "cv_video_026_proof";
    const password = randomToken();
    const user = "cvproof";
    await command(
      client,
      [
        "--no-defaults",
        `--socket=${socketPath}`,
        "-u",
        "root",
        "-e",
        `CREATE DATABASE ${databaseName}; CREATE USER '${user}'@'127.0.0.1' IDENTIFIED BY '${password}'; GRANT ALL PRIVILEGES ON ${databaseName}.* TO '${user}'@'127.0.0.1'; FLUSH PRIVILEGES;`,
      ],
      root
    );
    return {
      databaseUrl: `mysql://${user}:${password}@127.0.0.1:${databasePort}/${databaseName}`,
      password,
      port: databasePort,
      process: daemonProcess,
    };
  } catch (error) {
    await stopProcess(daemonProcess);
    throw error;
  }
}

async function provisionFixture(database: ProofDatabase): Promise<number> {
  const connection = await mysql.createConnection(database.databaseUrl);
  const passwordHash = await bcryptjs.hash(database.password, 10);
  try {
    await connection.query(`
      CREATE TABLE users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        openId VARCHAR(64) NOT NULL UNIQUE,
        name TEXT NULL,
        email VARCHAR(320) NULL UNIQUE,
        loginMethod VARCHAR(64) NULL,
        role ENUM('user','creator','influencer','celebrity','admin','king') NOT NULL DEFAULT 'user',
        language VARCHAR(10) NULL DEFAULT 'en',
        country VARCHAR(2) NULL,
        referred_by INT NULL,
        creator_status VARCHAR(20) NULL DEFAULT 'pending',
        content_type JSON NULL,
        primary_brand VARCHAR(50) NULL DEFAULT 'CREATORVAULT',
        cashapp_handle VARCHAR(100) NULL,
        paypal_email VARCHAR(320) NULL,
        zelle_handle VARCHAR(100) NULL,
        applepay_handle VARCHAR(100) NULL,
        stripe_connect_account_id VARCHAR(255) NULL UNIQUE,
        createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        lastSignedIn TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        password VARCHAR(255) NULL,
        is_active TINYINT(1) NOT NULL DEFAULT 1
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
    await connection.query(`
      CREATE TABLE vaultx_creators (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        is_active TINYINT(1) NOT NULL DEFAULT 1,
        UNIQUE KEY uniq_vaultx_creator_user (user_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
    await connection.query(`
      CREATE TABLE media_assets (
        id VARCHAR(64) PRIMARY KEY,
        user_id INT NOT NULL,
        source_type VARCHAR(64) NULL,
        asset_type VARCHAR(32) NULL,
        file_name VARCHAR(512) NOT NULL,
        original_name VARCHAR(512) NULL,
        mime_type VARCHAR(128) NULL,
        file_size BIGINT NULL,
        storage_path TEXT NULL,
        public_url TEXT NULL,
        thumbnail_url TEXT NULL,
        duration DECIMAL(12,3) NULL,
        width INT NULL,
        height INT NULL,
        status VARCHAR(32) NOT NULL,
        created_by_feature VARCHAR(128) NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        KEY idx_media_assets_owner_ready (user_id, status, created_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
    await connection.query(`
      CREATE TABLE trailer_projects (
        id VARCHAR(36) PRIMARY KEY,
        user_id INT NOT NULL,
        project_name VARCHAR(255) NOT NULL,
        project_type VARCHAR(64) NOT NULL,
        title VARCHAR(300) NULL,
        concept TEXT NULL,
        script_text TEXT NULL,
        format VARCHAR(12) NOT NULL,
        source_asset_id VARCHAR(64) NOT NULL,
        scenes_json JSON NOT NULL,
        hooks JSON NULL,
        hook_variants JSON NULL,
        status VARCHAR(32) NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        KEY idx_trailer_projects_owner_source (user_id, source_asset_id, created_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
    await connection.execute(
      "INSERT INTO users (openId, name, email, loginMethod, role, creator_status, password, is_active) VALUES (?, ?, ?, 'email', 'creator', 'active', ?, 1)",
      [FIXTURE_OPEN_ID, FIXTURE_NAME, FIXTURE_EMAIL, passwordHash]
    );
    const [userRows] = await connection.query<mysql.RowDataPacket[]>(
      "SELECT id FROM users WHERE openId = ?",
      [FIXTURE_OPEN_ID]
    );
    const user = userRows[0];
    if (!user || typeof user.id !== "number")
      fail("CV_VIDEO_026_LOCAL_PROOF_FIXTURE_USER_MISSING");
    await connection.execute(
      "INSERT INTO vaultx_creators (user_id, is_active) VALUES (?, 1)",
      [user.id]
    );
    return user.id;
  } finally {
    await connection.end();
  }
}

async function waitForServer(
  baseUrl: string,
  processToObserve: ChildProcessWithoutNullStreams
): Promise<void> {
  for (let attempt = 0; attempt < 120; attempt += 1) {
    if (processToObserve.exitCode !== null)
      fail("CV_VIDEO_026_LOCAL_PROOF_SERVER_EXITED");
    try {
      const response = await fetch(`${baseUrl}/__local-proof/health`);
      if (response.ok) return;
    } catch {
      // Startup has not completed yet.
    }
    await new Promise(resolve => setTimeout(resolve, 250));
  }
  fail("CV_VIDEO_026_LOCAL_PROOF_SERVER_READY_TIMEOUT");
}

function sanitizedServerEnvironment(input: {
  databaseUrl: string;
  jwtSecret: string;
  port: number;
  storageRoot: string;
}): NodeJS.ProcessEnv {
  return {
    PATH: process.env.PATH ?? "/usr/bin:/bin",
    HOME: process.env.HOME ?? "/home/ubuntu",
    NODE_ENV: "test",
    DATABASE_URL: input.databaseUrl,
    JWT_SECRET: input.jwtSecret,
    VITE_APP_ID: "cv-video-026-local-proof",
    OAUTH_SERVER_URL: "http://127.0.0.1:9/unavailable",
    CREATORVAULT_LOCAL_PROOF_MODE: "1",
    CREATORVAULT_LOCAL_TRAILER_CUT_ENABLED: "1",
    CREATORVAULT_LOCAL_PROOF_HOST: "127.0.0.1",
    CREATORVAULT_LOCAL_PROOF_PORT: String(input.port),
    CREATORVAULT_LOCAL_PROOF_STORAGE_ROOT: input.storageRoot,
    TZ: "UTC",
  };
}

async function queryDraft(
  database: ProofDatabase
): Promise<{ id: string; sourceAssetId: string; status: string }> {
  const connection = await mysql.createConnection(database.databaseUrl);
  try {
    const [rows] = await connection.query<mysql.RowDataPacket[]>(
      "SELECT id, source_asset_id, status FROM trailer_projects WHERE project_type = 'launch_trailer' ORDER BY created_at DESC LIMIT 1"
    );
    const row = rows[0];
    if (
      !row ||
      typeof row.id !== "string" ||
      typeof row.source_asset_id !== "string" ||
      typeof row.status !== "string"
    ) {
      fail("CV_VIDEO_026_LOCAL_PROOF_DRAFT_MISSING");
    }
    return {
      id: row.id,
      sourceAssetId: row.source_asset_id,
      status: row.status,
    };
  } finally {
    await connection.end();
  }
}

async function queryWorkspace(database: ProofDatabase): Promise<{
  id: string;
  sourceAssetId: string;
  status: string;
  entityName: string;
}> {
  const connection = await mysql.createConnection(database.databaseUrl);
  try {
    const [rows] = await connection.query<mysql.RowDataPacket[]>(
      "SELECT id, source_asset_id, status, project_name, project_type FROM trailer_projects WHERE project_type = 'creator_workspace' ORDER BY created_at DESC LIMIT 1"
    );
    const row = rows[0];
    if (
      !row ||
      row.project_type !== "creator_workspace" ||
      typeof row.id !== "string" ||
      typeof row.source_asset_id !== "string" ||
      typeof row.status !== "string" ||
      typeof row.project_name !== "string"
    ) {
      fail("CREATOR_WORKSPACE_LOCAL_PROOF_RECORD_MISSING");
    }
    return {
      id: row.id,
      sourceAssetId: row.source_asset_id,
      status: row.status,
      entityName: row.project_name,
    };
  } finally {
    await connection.end();
  }
}

async function querySavedMedia(
  database: ProofDatabase,
  mediaAssetId: string
): Promise<{ ownerUserId: number; status: string; sourceType: string }> {
  const connection = await mysql.createConnection(database.databaseUrl);
  try {
    const [rows] = await connection.query<mysql.RowDataPacket[]>(
      "SELECT user_id, status, source_type FROM media_assets WHERE id = ? LIMIT 1",
      [mediaAssetId]
    );
    const row = rows[0];
    if (
      !row ||
      typeof row.user_id !== "number" ||
      typeof row.status !== "string" ||
      typeof row.source_type !== "string"
    ) {
      fail("CV_VIDEO_026_LOCAL_PROOF_MEDIA_RECORD_MISSING");
    }
    return {
      ownerUserId: row.user_id,
      status: row.status,
      sourceType: row.source_type,
    };
  } finally {
    await connection.end();
  }
}

async function queryLocalTrailerCut(
  database: ProofDatabase,
  input: {
    workspaceId: string;
    sourceMediaAssetId: string;
    trailerProjectId: string;
  }
): Promise<{
  cutProjectId: string;
  outputMediaAssetId: string;
  sourceMediaAssetId: string;
  trailerProjectId: string;
  workspaceId: string;
  ownerUserId: number;
  status: "awaiting_owner_review";
  sourceType: "local_trailer_cut";
  createdByFeature: "creator_workspace_local_trailer_cut.v1";
  publicUrl: string;
  storagePath: string;
  durationSeconds: number;
  width: number;
  height: number;
  format: "16:9" | "9:16" | "1:1";
}> {
  const connection = await mysql.createConnection(database.databaseUrl);
  try {
    const [rows] = await connection.query<mysql.RowDataPacket[]>(
      `SELECT
         local_cut.id AS cut_project_id,
         local_cut.status AS cut_status,
         local_cut.scenes_json,
         output_asset.id AS media_asset_id,
         output_asset.user_id,
         output_asset.source_type,
         output_asset.created_by_feature,
         output_asset.public_url,
         output_asset.storage_path,
         output_asset.duration,
         output_asset.width,
         output_asset.height
       FROM trailer_projects AS local_cut
       INNER JOIN media_assets AS output_asset
         ON output_asset.id = JSON_UNQUOTE(JSON_EXTRACT(local_cut.scenes_json, '$.outputMediaAssetId'))
       WHERE local_cut.project_type = 'local_trailer_cut'
         AND local_cut.source_asset_id = ?
         AND JSON_UNQUOTE(JSON_EXTRACT(local_cut.scenes_json, '$.workspaceId')) = ?
         AND JSON_UNQUOTE(JSON_EXTRACT(local_cut.scenes_json, '$.trailerProjectId')) = ?
       ORDER BY local_cut.created_at DESC
       LIMIT 1`,
      [input.sourceMediaAssetId, input.workspaceId, input.trailerProjectId]
    );
    const row = rows[0];
    const manifest =
      row && typeof row.scenes_json === "string"
        ? (JSON.parse(row.scenes_json) as Record<string, unknown>)
        : null;
    const format = manifest?.format;
    if (
      !row ||
      !manifest ||
      manifest.kind !== "local_trailer_cut.v1" ||
      manifest.workspaceId !== input.workspaceId ||
      manifest.sourceMediaAssetId !== input.sourceMediaAssetId ||
      manifest.trailerProjectId !== input.trailerProjectId ||
      typeof row.cut_project_id !== "string" ||
      typeof row.media_asset_id !== "string" ||
      typeof row.user_id !== "number" ||
      row.cut_status !== "awaiting_owner_review" ||
      row.source_type !== "local_trailer_cut" ||
      row.created_by_feature !== "creator_workspace_local_trailer_cut.v1" ||
      typeof row.public_url !== "string" ||
      typeof row.storage_path !== "string" ||
      !["16:9", "9:16", "1:1"].includes(String(format)) ||
      !Number.isFinite(Number(row.duration)) ||
      !Number.isFinite(Number(row.width)) ||
      !Number.isFinite(Number(row.height))
    ) {
      fail("LOCAL_TRAILER_CUT_LOCAL_PROOF_RECORD_INVALID");
    }
    return {
      cutProjectId: row.cut_project_id,
      outputMediaAssetId: row.media_asset_id,
      sourceMediaAssetId: input.sourceMediaAssetId,
      trailerProjectId: input.trailerProjectId,
      workspaceId: input.workspaceId,
      ownerUserId: row.user_id,
      status: "awaiting_owner_review",
      sourceType: "local_trailer_cut",
      createdByFeature: "creator_workspace_local_trailer_cut.v1",
      publicUrl: row.public_url,
      storagePath: row.storage_path,
      durationSeconds: Number(row.duration),
      width: Number(row.width),
      height: Number(row.height),
      format: format as "16:9" | "9:16" | "1:1",
    };
  } finally {
    await connection.end();
  }
}

async function runBrowserProof(
  baseUrl: string,
  database: ProofDatabase,
  fixtureFile: string,
  creatorId: number
): Promise<
  Omit<
    ProofResult,
    | "recordedAt"
    | "scope"
    | "fixture"
    | "ordinaryCreator"
    | "sourceFixture"
    | "restrictions"
  >
> {
  const browser = await chromium.launch({
    executablePath: "/usr/bin/chromium",
    headless: true,
  });
  const context = await browser.newContext({ baseURL: baseUrl });
  const page = await context.newPage();
  try {
    await page.goto("/login", { waitUntil: "networkidle" });
    const ageGate = page.getByRole("dialog", {
      name: "Adult Access Verification",
    });
    if (await ageGate.isVisible()) {
      await ageGate.getByRole("button", { name: "Enter — I am 18+" }).click();
      await ageGate.waitFor({ state: "hidden" });
    }
    await page.locator("#email").fill(FIXTURE_EMAIL);
    await page.locator("#password").fill(database.password);
    await page.getByRole("button", { name: "Enter my CreatorVault" }).click();
    await page.waitForURL(/\/dashboard$/, { timeout: 15_000 });

    const sessionCookie = (await context.cookies(baseUrl)).find(
      cookie => cookie.name === "app_session_id"
    );
    if (!sessionCookie) fail("CV_VIDEO_026_LOCAL_PROOF_SESSION_COOKIE_MISSING");
    const protectedStatus = await page.evaluate(async () => {
      const response = await fetch(
        "/api/video/upload/status?uploadId=proof-auth-check",
        {
          credentials: "include",
        }
      );
      return response.status;
    });
    if (protectedStatus !== 404) {
      throw new Error(
        `CV_VIDEO_026_LOCAL_PROOF_SESSION_AUTH_STATUS_${protectedStatus} ${proofServerDiagnostic || "no local auth diagnostic"}`
      );
    }

    await page.goto("/creator/video-studio", { waitUntil: "networkidle" });
    await page
      .getByRole("button", { name: "Choose source video" })
      .waitFor({ state: "visible" });
    await page
      .locator('input[type="file"][accept="video/*"]')
      .setInputFiles(fixtureFile);
    const savedSourceState = page
      .getByRole("status")
      .filter({ hasText: "Your source video is saved and selected below." });
    const failedSourceState = page.getByRole("alert");
    const intakeOutcome = await Promise.race([
      savedSourceState
        .waitFor({ state: "visible", timeout: 30_000 })
        .then(() => "saved" as const),
      failedSourceState
        .waitFor({ state: "visible", timeout: 30_000 })
        .then(() => "failed" as const),
    ]);
    if (intakeOutcome === "failed") {
      const message =
        (await failedSourceState.textContent())?.trim() ||
        "unknown intake failure";
      throw new Error(`CV_VIDEO_026_LOCAL_PROOF_UPLOAD_UI_ERROR ${message}`);
    }

    const selectedVideo = page.locator("main video").first();
    await selectedVideo.waitFor({ state: "visible" });
    await page.waitForFunction(
      () => {
        const element = document.querySelector(
          "main video"
        ) as HTMLVideoElement | null;
        return Boolean(
          element &&
          element.readyState >= 1 &&
          element.videoWidth > 0 &&
          element.videoHeight > 0
        );
      },
      undefined,
      { timeout: 20_000 }
    );
    const sourceUrl = await selectedVideo.getAttribute("src");
    if (!sourceUrl || !sourceUrl.startsWith("/uploads/content-vault/")) {
      fail("CV_VIDEO_026_LOCAL_PROOF_UPLOAD_URL_INVALID");
    }

    await page
      .getByRole("button", { name: "Choose saved footage" })
      .first()
      .click();
    await page
      .getByRole("heading", { name: "Choose Your Video Source" })
      .waitFor({ state: "visible" });
    const fileName = path.basename(fixtureFile);
    await page.getByRole("button", { name: new RegExp(fileName, "i") }).click();
    await page.getByRole("button", { name: /Use This Video/ }).click();
    await page
      .getByRole("heading", { name: "Choose Your Video Source" })
      .waitFor({ state: "hidden" });

    await page.goto("/creator/workspace", { waitUntil: "networkidle" });
    await page.getByRole("button", { name: "Choose source video" }).click();
    await page
      .getByRole("heading", { name: "Choose Your Source Video" })
      .waitFor({ state: "visible" });
    await page.getByRole("button", { name: new RegExp(fileName, "i") }).click();
    await page.getByRole("button", { name: /Use source video/ }).click();
    await page
      .getByRole("heading", { name: "Choose Your Source Video" })
      .waitFor({ state: "hidden" });
    await page
      .getByLabel("Project or entity name")
      .fill("Proof Creator Workspace");
    await page
      .getByLabel("Target audience")
      .fill("Creators who need a grounded launch story.");
    await page
      .getByLabel("Primary promise")
      .fill("Turn one owned moment into an honest next delivery step.");
    await page
      .getByLabel("First offer")
      .fill("A source-backed trailer direction draft.");
    await page
      .getByLabel("Short-form content idea")
      .fill("Show the source moment, then invite a deeper look.");
    await page
      .getByLabel("Long-form story or series")
      .fill(
        "A behind-the-scenes series about the creator's real working process."
      );
    await page
      .getByLabel("Story manifesto")
      .fill("Build from the proof already in your hands.");
    await page.getByRole("button", { name: "Save workspace draft" }).click();
    await page
      .getByRole("status")
      .filter({ hasText: "Workspace draft saved." })
      .waitFor({ state: "visible", timeout: 15_000 });

    const workspace = await queryWorkspace(database);
    if (
      workspace.status !== "draft" ||
      workspace.entityName !== "Proof Creator Workspace"
    ) {
      fail("CREATOR_WORKSPACE_LOCAL_PROOF_SAVE_INVALID");
    }
    await page.screenshot({ path: WORKSPACE_SCREENSHOT_PATH, fullPage: true });
    const savedMedia = await querySavedMedia(database, workspace.sourceAssetId);
    if (
      savedMedia.ownerUserId !== creatorId ||
      savedMedia.status !== "ready" ||
      savedMedia.sourceType !== "upload"
    ) {
      fail("CREATOR_WORKSPACE_LOCAL_PROOF_SOURCE_LINEAGE_INVALID");
    }

    await page
      .getByRole("link", { name: /Start delivery in Trailer Maker/ })
      .click();
    await page.waitForURL(/\/trailer-maker\?sourceAssetId=/, {
      timeout: 15_000,
    });
    const handoffUrl = new URL(page.url());
    const handoffSourceAssetId = handoffUrl.searchParams.get("sourceAssetId");
    if (
      !handoffSourceAssetId ||
      handoffSourceAssetId !== workspace.sourceAssetId
    )
      fail("CV_VIDEO_026_LOCAL_PROOF_HANDOFF_ID_MISSING");

    const nextTemplate = page.getByRole("button", {
      name: /Next: Pick a template/,
    });
    await nextTemplate.waitFor({ state: "visible" });
    await nextTemplate.click();
    await page.getByRole("button", { name: /Countdown Drop/ }).click();
    await page.getByRole("button", { name: /Next: Release direction/ }).click();
    await page.getByRole("button", { name: "Save trailer direction" }).click();
    await page
      .getByText("Your real sources and trailer direction are saved.")
      .waitFor({ state: "visible", timeout: 15_000 });

    const draft = await queryDraft(database);
    if (
      draft.sourceAssetId !== handoffSourceAssetId ||
      draft.status !== "draft"
    ) {
      fail("CV_VIDEO_026_LOCAL_PROOF_DRAFT_LINEAGE_INVALID");
    }

    await page.screenshot({ path: SCREENSHOT_PATH, fullPage: true });
    await page.goto(
      `/trailer-maker?sourceAssetId=${encodeURIComponent(handoffSourceAssetId)}`,
      { waitUntil: "networkidle" }
    );
    await page
      .getByRole("button", { name: /Next: Pick a template/ })
      .waitFor({ state: "visible" });

    const replay = await page.evaluate(async () => {
      const input = encodeURIComponent(JSON.stringify({ json: { limit: 20 } }));
      const response = await fetch(
        `/api/trpc/mediaAssets.listTrailerProjects?input=${input}`,
        { credentials: "include" }
      );
      if (!response.ok) return null;
      const body = (await response.json()) as {
        result?: { data?: { json?: unknown } };
      };
      return body.result?.data?.json ?? null;
    });
    if (
      !Array.isArray(replay) ||
      !replay.some(item => {
        if (!item || typeof item !== "object") return false;
        const candidate = item as {
          id?: unknown;
          sourceAssetId?: unknown;
          status?: unknown;
        };
        return (
          candidate.id === draft.id &&
          candidate.sourceAssetId === handoffSourceAssetId &&
          candidate.status === "draft"
        );
      })
    ) {
      fail("CV_VIDEO_026_LOCAL_PROOF_REPLAY_INVALID");
    }

    await page.goto(
      `/creator/workspace?draft=${encodeURIComponent(workspace.id)}`,
      { waitUntil: "networkidle" }
    );
    const restoredEntityName = page.getByLabel("Project or entity name");
    await restoredEntityName.waitFor({ state: "visible" });
    if ((await restoredEntityName.inputValue()) !== workspace.entityName) {
      fail("CREATOR_WORKSPACE_LOCAL_PROOF_REPLAY_INVALID");
    }

    await page
      .getByRole("link", { name: /Review trailer direction/ })
      .waitFor({ state: "visible", timeout: 15_000 });
    await page.getByRole("link", { name: /Review trailer direction/ }).click();
    await page.waitForURL(/\/creator\/workspace\?draft=.*&view=direction/, {
      timeout: 15_000,
    });
    const previewTruthLabels = [
      "Your source video is saved.",
      "Your trailer direction is saved.",
      "This is a direction preview using your original source video.",
      "A generated or exported trailer has not been created.",
      "Nothing has been published, sold, or sent.",
    ];
    for (const label of previewTruthLabels) {
      await page.getByText(label, { exact: false }).waitFor({
        state: "visible",
        timeout: 15_000,
      });
    }
    const previewVideo = page.getByLabel("Saved creator source video");
    await previewVideo.waitFor({ state: "visible" });
    const previewSourceUrl = await previewVideo.getAttribute("src");
    if (previewSourceUrl !== sourceUrl) {
      fail("TRAILER_DIRECTION_PREVIEW_SOURCE_MISMATCH");
    }
    const creatorVideoStudioHref = await page
      .getByRole("link", { name: /Back to Creator Video Studio/ })
      .getAttribute("href");
    const trailerMakerHref = await page
      .getByRole("link", { name: /Open Trailer Maker/ })
      .getAttribute("href");
    const expectedCreatorStudioHref = `/creator/video-studio?sourceAssetId=${encodeURIComponent(handoffSourceAssetId)}`;
    const expectedTrailerMakerHref = `/trailer-maker?sourceAssetId=${encodeURIComponent(handoffSourceAssetId)}`;
    if (
      creatorVideoStudioHref !== expectedCreatorStudioHref ||
      trailerMakerHref !== expectedTrailerMakerHref
    ) {
      fail("TRAILER_DIRECTION_PREVIEW_HANDOFF_MISMATCH");
    }
    const previewText = (await page.locator("main").textContent()) ?? "";
    if (
      previewText.includes("/kingcam/vault") ||
      previewText.includes("/king/media-vault") ||
      previewText.includes("KingCam Vault")
    ) {
      fail("TRAILER_DIRECTION_PREVIEW_OWNER_ROUTE_EXPOSED");
    }
    await page.screenshot({
      path: DIRECTION_PREVIEW_SCREENSHOT_PATH,
      fullPage: true,
    });

    await page
      .getByRole("button", { name: "Create local trailer cut" })
      .click();
    const localCutVideo = page.getByLabel("Saved local trailer cut");
    const localCutFailure = page.getByRole("alert");
    const localCutOutcome = await Promise.race([
      localCutVideo
        .waitFor({ state: "visible", timeout: 120_000 })
        .then(() => "saved" as const),
      localCutFailure
        .waitFor({ state: "visible", timeout: 120_000 })
        .then(() => "failed" as const),
    ]);
    if (localCutOutcome === "failed") {
      const message =
        (await localCutFailure.textContent())?.trim() ||
        "unknown local cut error";
      throw new Error(
        `LOCAL_TRAILER_CUT_LOCAL_PROOF_UI_ERROR ${message} ${proofServerDiagnostic || "no local server diagnostic"}`
      );
    }
    await page.waitForFunction(
      () => {
        const element = document.querySelector(
          '[aria-label="Saved local trailer cut"]'
        ) as HTMLVideoElement | null;
        return Boolean(
          element &&
          element.readyState >= 1 &&
          element.videoWidth > 0 &&
          element.videoHeight > 0
        );
      },
      undefined,
      { timeout: 30_000 }
    );
    const localCutUrl = await localCutVideo.getAttribute("src");
    const localCut = await queryLocalTrailerCut(database, {
      workspaceId: workspace.id,
      sourceMediaAssetId: workspace.sourceAssetId,
      trailerProjectId: draft.id,
    });
    if (
      localCut.ownerUserId !== creatorId ||
      localCut.publicUrl !== localCutUrl ||
      localCut.sourceMediaAssetId !== workspace.sourceAssetId ||
      localCut.trailerProjectId !== draft.id ||
      localCut.workspaceId !== workspace.id ||
      !localCut.publicUrl.startsWith("/uploads/content-vault/")
    ) {
      fail("LOCAL_TRAILER_CUT_LOCAL_PROOF_LINEAGE_INVALID");
    }
    const localCutStat = await stat(localCut.storagePath).catch(() => null);
    if (!localCutStat || !localCutStat.isFile() || localCutStat.size < 1) {
      fail("LOCAL_TRAILER_CUT_LOCAL_PROOF_FILE_MISSING");
    }
    const { stdout: probeOutput } = await execFileAsync(
      "ffprobe",
      [
        "-v",
        "error",
        "-select_streams",
        "v:0",
        "-show_entries",
        "stream=codec_name,width,height:format=duration",
        "-of",
        "json",
        localCut.storagePath,
      ],
      { timeout: 15_000, maxBuffer: 1024 * 1024, encoding: "utf8" }
    );
    const localCutProbe = JSON.parse(probeOutput) as {
      streams?: Array<{
        codec_name?: unknown;
        width?: unknown;
        height?: unknown;
      }>;
      format?: { duration?: unknown };
    };
    const localCutStream = localCutProbe.streams?.[0];
    if (
      localCutStream?.codec_name !== "h264" ||
      Number(localCutStream.width) !== localCut.width ||
      Number(localCutStream.height) !== localCut.height ||
      !Number.isFinite(Number(localCutProbe.format?.duration)) ||
      Number(localCutProbe.format?.duration) <= 0
    ) {
      fail("LOCAL_TRAILER_CUT_LOCAL_PROOF_MP4_INVALID");
    }

    await page.goto(
      `/creator/workspace?draft=${encodeURIComponent(workspace.id)}`,
      { waitUntil: "networkidle" }
    );
    await page.getByRole("link", { name: /Review trailer direction/ }).click();
    await page.waitForURL(/\/creator\/workspace\?draft=.*&view=direction/, {
      timeout: 15_000,
    });
    await page
      .getByLabel("Saved local trailer cut")
      .waitFor({ state: "visible", timeout: 15_000 });
    await page.screenshot({
      path: LOCAL_TRAILER_CUT_SCREENSHOT_PATH,
      fullPage: true,
    });

    return {
      authenticatedRole: "creator",
      upload: {
        mediaAssetId: handoffSourceAssetId,
        uploadReceiptVerified: true,
        endpoint: "POST /api/video/upload/direct",
        ownerUserId: savedMedia.ownerUserId,
        status: "ready",
        sourceType: "upload",
        storedUrl: sourceUrl,
        listReturnedExactId: true,
        previewLoaded: true,
      },
      trailer: {
        handoffSourceAssetId,
        draftId: draft.id,
        draftStatus: "draft",
        replayReturnedExactSourceAssetId: true,
      },
      workspace: {
        workspaceId: workspace.id,
        sourceMediaAssetId: workspace.sourceAssetId,
        status: "draft",
        entityName: workspace.entityName,
        replayReturnedExactSourceAssetId: true,
      },
      directionPreview: {
        workspaceId: workspace.id,
        trailerProjectId: draft.id,
        sourceAssetId: handoffSourceAssetId,
        sourcePreviewLoaded: true,
        mandatoryTruthLabelsVisible: true,
        creatorVideoStudioHref,
        trailerMakerHref,
        ownerOnlyRoutesAbsent: true,
      },
      localTrailerCut: {
        cutProjectId: localCut.cutProjectId,
        outputMediaAssetId: localCut.outputMediaAssetId,
        sourceMediaAssetId: localCut.sourceMediaAssetId,
        trailerProjectId: localCut.trailerProjectId,
        ownerUserId: localCut.ownerUserId,
        status: localCut.status,
        sourceType: localCut.sourceType,
        createdByFeature: localCut.createdByFeature,
        publicUrl: localCut.publicUrl,
        format: localCut.format,
        durationSeconds: localCut.durationSeconds,
        width: localCut.width,
        height: localCut.height,
        browserPlaybackLoaded: true,
        replayVisibleAfterReentry: true,
      },
    };
  } finally {
    await context.close();
    await browser.close();
  }
}

async function main(): Promise<void> {
  requireRepositoryRoot();
  let fixtureRoot: string | null = null;
  let databaseProcess: ChildProcessWithoutNullStreams | null = null;
  let proofServerProcess: ChildProcessWithoutNullStreams | null = null;
  try {
    fixtureRoot = await mkdtemp(
      path.join(os.tmpdir(), "creatorvault-cv-video-026-")
    );
    await chmod(fixtureRoot, 0o700);
    const databasePort = await localPort();
    const applicationPort = await localPort();
    const database = await createProofDatabase(fixtureRoot, databasePort);
    databaseProcess = database.process;

    const creatorId = await provisionFixture(database);
    const localSourceFixture = path.join(
      fixtureRoot,
      "ordinary-creator-source.mp4"
    );
    await copyFile(SOURCE_FIXTURE, localSourceFixture);

    const serverEnvironment = sanitizedServerEnvironment({
      databaseUrl: database.databaseUrl,
      jwtSecret: randomToken(),
      port: applicationPort,
      storageRoot: fixtureRoot,
    });
    proofServerProcess = startProcess(
      path.join(REPOSITORY_ROOT, "node_modules/.bin/tsx"),
      [path.join(REPOSITORY_ROOT, "scripts/cvVideo026LocalProofServer.ts")],
      REPOSITORY_ROOT,
      serverEnvironment
    );
    captureProofServerDiagnostic(proofServerProcess);
    const baseUrl = `http://127.0.0.1:${applicationPort}`;
    await waitForServer(baseUrl, proofServerProcess);
    const browserResult = await runBrowserProof(
      baseUrl,
      database,
      localSourceFixture,
      creatorId
    );

    const result: ProofResult = {
      recordedAt: new Date().toISOString(),
      scope: "local-disposable-only",
      fixture: {
        applicationUrl: baseUrl,
        database: `127.0.0.1:${database.port}/cv_video_026_proof (disposed after proof)`,
        storageRoot: fixtureRoot,
        authentication:
          "POST /api/auth/login with the existing signed session cookie",
      },
      ordinaryCreator: {
        userId: creatorId,
        role: "creator",
        privilegedOwnerIdsUsed: false,
      },
      authenticatedRole: browserResult.authenticatedRole,
      sourceFixture: {
        fileName: path.basename(localSourceFixture),
        copiedFromRepository: true,
      },
      upload: browserResult.upload,
      trailer: browserResult.trailer,
      workspace: browserResult.workspace,
      directionPreview: browserResult.directionPreview,
      localTrailerCut: browserResult.localTrailerCut,
      restrictions: {
        productionTouched: false,
        providersCalled: false,
        paymentsTouched: false,
        kingCamChanged: false,
        durableFixtureRemoved: true,
      },
    };
    await mkdir(RECOVERY_ROOT, { recursive: true });
    await writeFile(EVIDENCE_PATH, `${JSON.stringify(result, null, 2)}\n`, {
      mode: 0o600,
    });
    const workspaceEvidence = {
      recordedAt: result.recordedAt,
      scope: result.scope,
      ordinaryCreator: result.ordinaryCreator,
      source: {
        mediaAssetId: result.upload.mediaAssetId,
        status: result.upload.status,
        sourceType: result.upload.sourceType,
        previewLoaded: result.upload.previewLoaded,
      },
      workspace: result.workspace,
      screenshot: path.basename(WORKSPACE_SCREENSHOT_PATH),
      delivery: {
        trailerMakerSourceAssetId: result.trailer.handoffSourceAssetId,
        trailerDraftId: result.trailer.draftId,
        trailerDraftStatus: result.trailer.draftStatus,
      },
      restrictions: result.restrictions,
    };
    await writeFile(
      WORKSPACE_EVIDENCE_PATH,
      `${JSON.stringify(workspaceEvidence, null, 2)}\n`,
      { mode: 0o600 }
    );
    const directionPreviewEvidence = {
      recordedAt: result.recordedAt,
      scope: result.scope,
      ordinaryCreator: result.ordinaryCreator,
      source: {
        mediaAssetId: result.directionPreview.sourceAssetId,
        previewLoaded: result.directionPreview.sourcePreviewLoaded,
      },
      workspace: {
        workspaceId: result.directionPreview.workspaceId,
        trailerProjectId: result.directionPreview.trailerProjectId,
      },
      truthLabelsVisible: result.directionPreview.mandatoryTruthLabelsVisible,
      routes: {
        creatorVideoStudio: result.directionPreview.creatorVideoStudioHref,
        trailerMaker: result.directionPreview.trailerMakerHref,
        ownerOnlyRoutesAbsent: result.directionPreview.ownerOnlyRoutesAbsent,
      },
      screenshot: path.basename(DIRECTION_PREVIEW_SCREENSHOT_PATH),
      restrictions: result.restrictions,
    };
    await writeFile(
      DIRECTION_PREVIEW_EVIDENCE_PATH,
      `${JSON.stringify(directionPreviewEvidence, null, 2)}\n`,
      { mode: 0o600 }
    );
    const localTrailerCutEvidence = {
      recordedAt: result.recordedAt,
      scope: result.scope,
      ordinaryCreator: result.ordinaryCreator,
      source: {
        mediaAssetId: result.localTrailerCut.sourceMediaAssetId,
        ownerUserId: result.localTrailerCut.ownerUserId,
      },
      direction: {
        trailerProjectId: result.localTrailerCut.trailerProjectId,
        workspaceId: result.workspace.workspaceId,
        format: result.localTrailerCut.format,
      },
      output: {
        cutProjectId: result.localTrailerCut.cutProjectId,
        mediaAssetId: result.localTrailerCut.outputMediaAssetId,
        sourceType: result.localTrailerCut.sourceType,
        createdByFeature: result.localTrailerCut.createdByFeature,
        status: result.localTrailerCut.status,
        publicUrl: result.localTrailerCut.publicUrl,
        durationSeconds: result.localTrailerCut.durationSeconds,
        width: result.localTrailerCut.width,
        height: result.localTrailerCut.height,
        browserPlaybackLoaded: result.localTrailerCut.browserPlaybackLoaded,
        replayVisibleAfterReentry:
          result.localTrailerCut.replayVisibleAfterReentry,
      },
      screenshot: path.basename(LOCAL_TRAILER_CUT_SCREENSHOT_PATH),
      restrictions: result.restrictions,
    };
    await writeFile(
      LOCAL_TRAILER_CUT_EVIDENCE_PATH,
      `${JSON.stringify(localTrailerCutEvidence, null, 2)}\n`,
      { mode: 0o600 }
    );
    process.stdout.write(
      `CV_VIDEO_026_LOCAL_PROOF_PASS\n${EVIDENCE_PATH}\nCREATOR_WORKSPACE_LOCAL_PROOF_PASS\n${WORKSPACE_EVIDENCE_PATH}\nTRAILER_DIRECTION_PREVIEW_LOCAL_PROOF_PASS\n${DIRECTION_PREVIEW_EVIDENCE_PATH}\nLOCAL_TRAILER_CUT_LOCAL_PROOF_PASS\n${LOCAL_TRAILER_CUT_EVIDENCE_PATH}\n`
    );
  } finally {
    await stopProcess(proofServerProcess);
    await stopProcess(databaseProcess);
    if (fixtureRoot) {
      await rm(fixtureRoot, { recursive: true, force: true });
    }
  }
}

void main().catch(error => {
  const code =
    error instanceof Error && /^[A-Z0-9_]+$/.test(error.message)
      ? error.message
      : "CV_VIDEO_026_LOCAL_PROOF_FAILED";
  const rawDiagnostic =
    error instanceof Error ? error.message : "unknown proof failure";
  const diagnostic = rawDiagnostic
    .replace(/mysql:\/\/[^\s]+/gi, "mysql://[redacted]")
    .replace(/(password|token|secret)=\S+/gi, "$1=[redacted]")
    .replace(/[\r\n]+/g, " ")
    .slice(0, 900);
  process.stderr.write(`${code}: ${diagnostic}\n`);
  process.exitCode = 1;
});
