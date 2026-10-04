import { get as getHttps } from "node:https";
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
  writeFile,
} from "node:fs/promises";
import { existsSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { randomBytes } from "node:crypto";
import { promisify } from "node:util";
import bcryptjs from "bcryptjs";
import mysql from "mysql2/promise";
import { chromium, type ConsoleMessage, type Page } from "@playwright/test";

const execFileAsync = promisify(execFile);
const REPOSITORY_ROOT = path.resolve(
  path.dirname(new URL(import.meta.url).pathname),
  ".."
);
const SOURCE_FIXTURE = path.join(
  REPOSITORY_ROOT,
  "client/public/videos/creator-pages/aderly-follow-me.mp4"
);
const PROOF_SERVER = path.join(
  REPOSITORY_ROOT,
  "scripts/cvVideo026LocalProofServer.ts"
);
const EVIDENCE_DIRECTORY = path.join(
  REPOSITORY_ROOT,
  "docs/evidence/visual-dna"
);
const EVIDENCE_PATH = path.join(
  EVIDENCE_DIRECTORY,
  "visual-dna-local-proof.json"
);
const FIXTURE_EMAIL = "visual-dna-local-proof@example.test";
const FIXTURE_NAME = "Visual DNA Local Proof Creator";
const FIXTURE_OPEN_ID = "visual-dna-local-proof-open-id";
const DESKTOP_VIEWPORT = { width: 1440, height: 1000 };
const MOBILE_VIEWPORT = { width: 390, height: 844 };

/**
 * This proof deliberately exercises only the local, disposable fixture. It uses
 * the application’s real login, upload, workspace, Trailer Maker, and re-entry
 * routes. It never calls an external provider or invokes local trailer-cut work.
 */
type ProofDatabase = {
  databaseUrl: string;
  password: string;
  port: number;
  process: ChildProcessWithoutNullStreams;
};

type VisualState =
  | "entry-gate-pre-acknowledgement"
  | "home-pre-upload"
  | "login-pre-upload"
  | "dashboard-pre-upload"
  | "creator-video-studio-pre-upload"
  | "creator-video-studio-selected-upload"
  | "creator-video-studio-selected-upload-preview"
  | "creator-workspace-new"
  | "creator-workspace-saved"
  | "trailer-maker-source"
  | "trailer-maker-draft"
  | "home-mobile-navigation-open"
  | "creator-workspace-direction-local-cut-unavailable";

type ConsoleEvent = {
  type: string;
  text: string;
  source: string | null;
  route: string;
  filteredAsBenign: boolean;
  filterReason: string | null;
};

type PageErrorEvent = {
  message: string;
  route: string;
};

type CtaCheck = {
  applicable: boolean;
  visibleCtaCount: number;
  cyanCtaCount: number;
  allCyanCtasAtLeast52px: boolean;
  samples: Array<{
    text: string;
    width: number;
    height: number;
    backgroundColor: string;
    fontFamily: string;
  }>;
};

type VisualChecks = {
  noHorizontalOverflow: boolean;
  documentScrollWidth: number;
  bodyScrollWidth: number;
  viewportWidth: number;
  fontsLoaded: Record<string, boolean>;
  cta: CtaCheck;
  pageErrorsSinceNavigation: PageErrorEvent[];
  blockingConsoleSinceNavigation: ConsoleEvent[];
  reducedMotionHero?: {
    renderedAsStillOrPaused: boolean;
    videoCount: number;
    pausedVideoCount: number;
    posterOrFallbackCount: number;
  };
  mobileNavigation?: {
    open: boolean;
    headingFontSizesPx: number[];
    headingXsNotOversized: boolean;
    menuControl: {
      width: number;
      height: number;
      paddingInlineStart: string;
      paddingInlineEnd: string;
      svgWidth: number;
      svgHeight: number;
    };
    compactControlMatchesReleaseRule: boolean;
  };
};

type ScreenshotOutcome = {
  state: VisualState;
  route: string;
  finalUrl: string;
  file: string;
  viewport: { width: number; height: number };
  checks: VisualChecks;
};

type WorkspaceRecord = {
  id: string;
  sourceAssetId: string;
  status: string;
  entityName: string;
};

type TrailerRecord = {
  id: string;
  sourceAssetId: string;
  status: string;
};

type UploadedMediaRecord = {
  ownerUserId: number;
  status: string;
  sourceType: string;
  publicUrl: string;
};

type LocalCutQueryResponse = {
  status: number;
  url: string;
  route: string;
  body: string;
};

type LocalCutVerification = {
  expectedUnavailableLabelObserved: boolean;
  alerts: string[];
  queryResponses: LocalCutQueryResponse[];
  diagnosticScreenshot: string | null;
  visibleMainText: string | null;
};

let proofServerDiagnostic = "";

function fail(code: string): never {
  throw new Error(code);
}

function assert(condition: unknown, code: string): asserts condition {
  if (!condition) fail(code);
}

function randomToken(): string {
  return randomBytes(24).toString("hex");
}

function requireRepositoryContract(): void {
  assert(
    existsSync(path.join(REPOSITORY_ROOT, "package.json")),
    "VISUAL_DNA_LOCAL_PROOF_REPOSITORY_INVALID"
  );
  assert(
    existsSync(SOURCE_FIXTURE),
    "VISUAL_DNA_LOCAL_PROOF_SOURCE_FIXTURE_MISSING"
  );
  assert(existsSync(PROOF_SERVER), "VISUAL_DNA_LOCAL_PROOF_SERVER_MISSING");
}

function redact(value: string): string {
  return value
    .replace(/mysql:\/\/[^\s]+/gi, "mysql://[redacted]")
    .replace(/(password|token|secret)=\S+/gi, "$1=[redacted]")
    .replace(/[\r\n]+/g, " ")
    .slice(0, 900);
}

async function localPort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const server = createServer();
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      if (!address || typeof address === "string") {
        server.close(() =>
          reject(new Error("VISUAL_DNA_LOCAL_PROOF_PORT_UNAVAILABLE"))
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
    fail("VISUAL_DNA_LOCAL_PROOF_DATABASE_TOOL_FAILED");
  }
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

function captureProofServerDiagnostic(
  processToObserve: ChildProcessWithoutNullStreams
): void {
  const capture = (chunk: Buffer): void => {
    proofServerDiagnostic = `${proofServerDiagnostic} ${redact(
      chunk.toString("utf8")
    )}`.slice(-1400);
  };
  processToObserve.stdout.on("data", capture);
  processToObserve.stderr.on("data", capture);
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
  fail("VISUAL_DNA_LOCAL_PROOF_DATABASE_READY_TIMEOUT");
}

async function createProofDatabase(
  root: string,
  databasePort: number
): Promise<ProofDatabase> {
  const installer = "/usr/bin/mariadb-install-db";
  const daemon = "/usr/sbin/mariadbd";
  const client = "/usr/bin/mariadb";
  assert(
    [installer, daemon, client].every(existsSync),
    "VISUAL_DNA_LOCAL_PROOF_DATABASE_TOOLS_UNAVAILABLE"
  );

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
    const databaseName = "cv_visual_dna_proof";
    const user = "cvvisualproof";
    const password = randomToken();
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
    const [rows] = await connection.query<mysql.RowDataPacket[]>(
      "SELECT id FROM users WHERE openId = ?",
      [FIXTURE_OPEN_ID]
    );
    const user = rows[0];
    assert(
      user && typeof user.id === "number",
      "VISUAL_DNA_LOCAL_PROOF_FIXTURE_USER_MISSING"
    );
    await connection.execute(
      "INSERT INTO vaultx_creators (user_id, is_active) VALUES (?, 1)",
      [user.id]
    );
    return user.id;
  } finally {
    await connection.end();
  }
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
    VITE_APP_ID: "cv-visual-dna-local-proof",
    OAUTH_SERVER_URL: "http://127.0.0.1:9/unavailable",
    CREATORVAULT_LOCAL_PROOF_MODE: "1",
    CREATORVAULT_LOCAL_PROOF_HTTPS: "1",
    // This proof must only observe the honest unavailable state. It never enables
    // or invokes local-cut generation.
    CREATORVAULT_LOCAL_TRAILER_CUT_ENABLED: "0",
    CREATORVAULT_LOCAL_PROOF_HOST: "127.0.0.1",
    CREATORVAULT_LOCAL_PROOF_PORT: String(input.port),
    CREATORVAULT_LOCAL_PROOF_STORAGE_ROOT: input.storageRoot,
    TZ: "UTC",
  };
}

async function waitForServer(
  baseUrl: string,
  processToObserve: ChildProcessWithoutNullStreams
): Promise<void> {
  for (let attempt = 0; attempt < 120; attempt += 1) {
    if (processToObserve.exitCode !== null) {
      fail("VISUAL_DNA_LOCAL_PROOF_SERVER_EXITED");
    }
    try {
      const response = await new Promise<{ ok: boolean }>((resolve, reject) => {
        if (!/^https:\/\/127\.0\.0\.1:\d+$/.test(baseUrl)) {
          reject(new Error("LOCAL_PROOF_TLS_URL_REJECTED"));
          return;
        }
        const request = getHttps(
          `${baseUrl}/__local-proof/health`,
          { rejectUnauthorized: false },
          result => {
            result.resume();
            resolve({ ok: result.statusCode === 200 });
          }
        );
        request.once("error", reject);
        request.setTimeout(1000, () =>
          request.destroy(new Error("LOCAL_PROOF_TLS_HEALTH_TIMEOUT"))
        );
      });
      if (response.ok) return;
    } catch {
      // The real local proof server is still starting.
    }
    await new Promise(resolve => setTimeout(resolve, 250));
  }
  fail("VISUAL_DNA_LOCAL_PROOF_SERVER_READY_TIMEOUT");
}

async function queryUploadedMedia(
  database: ProofDatabase,
  mediaAssetId: string
): Promise<UploadedMediaRecord> {
  const connection = await mysql.createConnection(database.databaseUrl);
  try {
    const [rows] = await connection.query<mysql.RowDataPacket[]>(
      "SELECT user_id, status, source_type, public_url FROM media_assets WHERE id = ? LIMIT 1",
      [mediaAssetId]
    );
    const row = rows[0];
    assert(
      row &&
        typeof row.user_id === "number" &&
        typeof row.status === "string" &&
        typeof row.source_type === "string" &&
        typeof row.public_url === "string",
      "VISUAL_DNA_LOCAL_PROOF_UPLOAD_RECORD_MISSING"
    );
    return {
      ownerUserId: row.user_id,
      status: row.status,
      sourceType: row.source_type,
      publicUrl: row.public_url,
    };
  } finally {
    await connection.end();
  }
}

async function queryWorkspace(
  database: ProofDatabase
): Promise<WorkspaceRecord> {
  const connection = await mysql.createConnection(database.databaseUrl);
  try {
    const [rows] = await connection.query<mysql.RowDataPacket[]>(
      "SELECT id, source_asset_id, status, project_name FROM trailer_projects WHERE project_type = 'creator_workspace' ORDER BY created_at DESC LIMIT 1"
    );
    const row = rows[0];
    assert(
      row &&
        typeof row.id === "string" &&
        typeof row.source_asset_id === "string" &&
        typeof row.status === "string" &&
        typeof row.project_name === "string",
      "VISUAL_DNA_LOCAL_PROOF_WORKSPACE_RECORD_MISSING"
    );
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

async function queryTrailer(database: ProofDatabase): Promise<TrailerRecord> {
  const connection = await mysql.createConnection(database.databaseUrl);
  try {
    const [rows] = await connection.query<mysql.RowDataPacket[]>(
      "SELECT id, source_asset_id, status FROM trailer_projects WHERE project_type = 'launch_trailer' ORDER BY created_at DESC LIMIT 1"
    );
    const row = rows[0];
    assert(
      row &&
        typeof row.id === "string" &&
        typeof row.source_asset_id === "string" &&
        typeof row.status === "string",
      "VISUAL_DNA_LOCAL_PROOF_TRAILER_RECORD_MISSING"
    );
    return {
      id: row.id,
      sourceAssetId: row.source_asset_id,
      status: row.status,
    };
  } finally {
    await connection.end();
  }
}

async function localCutRecordCount(database: ProofDatabase): Promise<number> {
  const connection = await mysql.createConnection(database.databaseUrl);
  try {
    const [rows] = await connection.query<mysql.RowDataPacket[]>(
      "SELECT COUNT(*) AS count FROM trailer_projects WHERE project_type = 'local_trailer_cut'"
    );
    return Number(rows[0]?.count ?? Number.NaN);
  } finally {
    await connection.end();
  }
}

function isExactBenignProofConsoleEvent(event: ConsoleEvent): string | null {
  const sourcePath = event.source
    ? (() => {
        try {
          return new URL(event.source).pathname;
        } catch {
          return "";
        }
      })()
    : "";
  const expectedMissingAsset =
    sourcePath === "/favicon.ico" || sourcePath === "/manifest.webmanifest";
  if (
    event.type === "error" &&
    expectedMissingAsset &&
    /failed to load resource/i.test(event.text) &&
    /404|not found/i.test(event.text)
  ) {
    return "exact known optional browser asset is absent from the isolated proof server";
  }
  if (
    event.type === "error" &&
    sourcePath === "/src/main.tsx" &&
    /\[API Query Error\]\s*TRPCClientError:\s*No procedure found on path "socialSpine\.commandSummary"/i.test(
      event.text
    )
  ) {
    return "exact local-proof server exclusion: socialSpine.commandSummary is intentionally absent; the real dashboard renders UNAVAILABLE and the native local journey remains unblocked";
  }
  return null;
}

class BrowserMonitor {
  private readonly consoleEvents: ConsoleEvent[] = [];
  private readonly pageErrors: PageErrorEvent[] = [];
  private readonly localCutResponses: LocalCutQueryResponse[] = [];
  private readonly pendingLocalCutResponses = new Set<Promise<void>>();

  attach(page: Page): void {
    page.on("console", message => this.recordConsole(page, message));
    page.on("pageerror", error => {
      this.pageErrors.push({
        message: redact(error.message),
        route: page.url(),
      });
    });
    page.on("response", response => {
      const responseUrl = response.url();
      let decodedUrl = responseUrl;
      try {
        decodedUrl = decodeURIComponent(responseUrl);
      } catch {
        // Preserve the original URL below if a malformed percent-escape is emitted.
      }
      if (
        !decodedUrl.includes("/api/trpc/") ||
        !decodedUrl.includes("creatorWorkspace.getLocalTrailerCut")
      ) {
        return;
      }
      const pending = this.recordLocalCutResponse(page, response);
      this.pendingLocalCutResponses.add(pending);
      void pending.finally(() => this.pendingLocalCutResponses.delete(pending));
    });
  }

  checkpoint(): { consoleIndex: number; pageErrorIndex: number } {
    return {
      consoleIndex: this.consoleEvents.length,
      pageErrorIndex: this.pageErrors.length,
    };
  }

  since(checkpoint: { consoleIndex: number; pageErrorIndex: number }): {
    pageErrors: PageErrorEvent[];
    blockingConsole: ConsoleEvent[];
  } {
    return {
      pageErrors: this.pageErrors.slice(checkpoint.pageErrorIndex),
      blockingConsole: this.consoleEvents
        .slice(checkpoint.consoleIndex)
        .filter(event => event.type === "error" && !event.filteredAsBenign),
    };
  }

  summary(): {
    filteredBenignEvents: ConsoleEvent[];
    blockingConsoleEvents: ConsoleEvent[];
    pageErrors: PageErrorEvent[];
    sourceFiltering: string;
  } {
    return {
      filteredBenignEvents: this.consoleEvents.filter(
        event => event.filteredAsBenign
      ),
      blockingConsoleEvents: this.consoleEvents.filter(
        event => event.type === "error" && !event.filteredAsBenign
      ),
      pageErrors: this.pageErrors,
      sourceFiltering:
        "Only exact optional-asset 404 console errors and the exact local-proof socialSpine.commandSummary router exclusion are filtered as benign. The socialSpine event retains its raw console text, source, and route because the isolated proof server intentionally omits that unchanged dashboard procedure while the real dashboard truthfully renders UNAVAILABLE. All other console errors and every pageerror remain blocking evidence.",
    };
  }

  async localCutQueryResponses(): Promise<LocalCutQueryResponse[]> {
    await Promise.all([...this.pendingLocalCutResponses]);
    return [...this.localCutResponses];
  }

  private recordConsole(page: Page, message: ConsoleMessage): void {
    const location = message.location();
    const event: ConsoleEvent = {
      type: message.type(),
      text: redact(message.text()),
      source: location.url || null,
      route: page.url(),
      filteredAsBenign: false,
      filterReason: null,
    };
    const reason = isExactBenignProofConsoleEvent(event);
    if (reason) {
      event.filteredAsBenign = true;
      event.filterReason = reason;
    }
    this.consoleEvents.push(event);
  }

  private async recordLocalCutResponse(
    page: Page,
    response: import("@playwright/test").Response
  ): Promise<void> {
    let body: string;
    try {
      body = redact(await response.text());
    } catch {
      body = "[response body unavailable]";
    }
    this.localCutResponses.push({
      status: response.status(),
      url: redact(response.url()),
      route: page.url(),
      body,
    });
  }
}

async function waitForPaint(page: Page): Promise<void> {
  await page.evaluate(async () => {
    await document.fonts.load('16px "Bebas Neue"');
    await document.fonts.load('16px "DM Sans"');
    await document.fonts.load('16px "Space Mono"');
    await document.fonts.ready;
    await new Promise<void>(resolve => requestAnimationFrame(() => resolve()));
    await new Promise<void>(resolve => requestAnimationFrame(() => resolve()));
  });
}

async function inspectVisualContracts(
  page: Page,
  requireCyanCta: boolean
): Promise<
  Omit<
    VisualChecks,
    | "pageErrorsSinceNavigation"
    | "blockingConsoleSinceNavigation"
    | "reducedMotionHero"
  >
> {
  return page.evaluate(requireCta => {
    const ctas: Array<{
      text: string;
      width: number;
      height: number;
      backgroundColor: string;
      fontFamily: string;
    }> = [];
    const ctaNodes = Array.from(
      document.querySelectorAll<HTMLElement>(".cv-cta")
    );
    for (const element of ctaNodes) {
      const style = window.getComputedStyle(element);
      const rect = element.getBoundingClientRect();
      const visible =
        style.display !== "none" &&
        style.visibility !== "hidden" &&
        Number(style.opacity || "1") > 0 &&
        rect.width > 0 &&
        rect.height > 0;
      if (visible) {
        ctas.push({
          text: (element.textContent ?? "")
            .replace(/\s+/g, " ")
            .trim()
            .slice(0, 160),
          width: Math.round(rect.width * 100) / 100,
          height: Math.round(rect.height * 100) / 100,
          backgroundColor: style.backgroundColor,
          fontFamily: style.fontFamily,
        });
      }
    }
    const cyanCtas: typeof ctas = [];
    for (const cta of ctas) {
      if (cta.backgroundColor === "rgb(0, 217, 255)") cyanCtas.push(cta);
    }
    let allCyanCtasAtLeast52px = true;
    for (const cta of cyanCtas) {
      if (cta.height < 51.5) allCyanCtasAtLeast52px = false;
    }
    const fonts = {
      "Bebas Neue": document.fonts.check('16px "Bebas Neue"'),
      "DM Sans": document.fonts.check('16px "DM Sans"'),
      "Space Mono": document.fonts.check('16px "Space Mono"'),
    };
    const documentWidth = document.documentElement.scrollWidth;
    const bodyWidth = document.body.scrollWidth;
    const viewportWidth = window.innerWidth;
    return {
      noHorizontalOverflow:
        documentWidth <= viewportWidth && bodyWidth <= viewportWidth,
      documentScrollWidth: documentWidth,
      bodyScrollWidth: bodyWidth,
      viewportWidth,
      fontsLoaded: fonts,
      cta: {
        applicable: requireCta,
        visibleCtaCount: ctas.length,
        cyanCtaCount: cyanCtas.length,
        allCyanCtasAtLeast52px,
        samples: ctas,
      },
    };
  }, requireCyanCta);
}

async function inspectReducedMotionHero(page: Page): Promise<{
  renderedAsStillOrPaused: boolean;
  videoCount: number;
  pausedVideoCount: number;
  posterOrFallbackCount: number;
}> {
  return page.evaluate(() => {
    const allHeroSections = Array.from(
      document.querySelectorAll("main section")
    );
    const heroSections = allHeroSections.slice(0, 2);
    const videos: HTMLVideoElement[] = [];
    const postersOrFallbacks: Element[] = [];
    for (const section of heroSections) {
      const sectionVideos = Array.from(
        section.querySelectorAll<HTMLVideoElement>("video")
      );
      for (const video of sectionVideos) videos.push(video);
      const visualNodes = [
        ...Array.from(section.querySelectorAll("img")),
        ...Array.from(
          section.querySelectorAll('div[class*="radial-gradient"]')
        ),
      ];
      for (const node of visualNodes) {
        const style = window.getComputedStyle(node);
        const rect = node.getBoundingClientRect();
        const loaded =
          !(node instanceof HTMLImageElement) ||
          (node.complete && node.naturalWidth > 0);
        if (
          loaded &&
          rect.width >= 100 &&
          rect.height >= 100 &&
          style.display !== "none" &&
          style.visibility !== "hidden"
        ) {
          postersOrFallbacks.push(node);
        }
      }
    }
    let pausedVideoCount = 0;
    for (const video of videos) {
      if (video.paused) pausedVideoCount += 1;
    }
    return {
      renderedAsStillOrPaused:
        (videos.length === 0 && postersOrFallbacks.length > 0) ||
        (videos.length > 0 && pausedVideoCount === videos.length),
      videoCount: videos.length,
      pausedVideoCount,
      posterOrFallbackCount: postersOrFallbacks.length,
    };
  });
}

async function captureState(input: {
  page: Page;
  monitor: BrowserMonitor;
  state: VisualState;
  route: string;
  requireCyanCta: boolean;
  outcomes: ScreenshotOutcome[];
}): Promise<void> {
  const checkpoint = input.monitor.checkpoint();
  const viewports = [
    { label: "desktop", value: DESKTOP_VIEWPORT },
    { label: "mobile", value: MOBILE_VIEWPORT },
  ] as const;
  for (const viewport of viewports) {
    await input.page.setViewportSize(viewport.value);
    await input.page.evaluate(() => window.scrollTo(0, 0));
    await waitForPaint(input.page);
    const visual = await inspectVisualContracts(
      input.page,
      input.requireCyanCta
    );
    const monitorEvents = input.monitor.since(checkpoint);
    const file = `local-${viewport.label}-${input.state}-${viewport.value.width}x${viewport.value.height}.png`;
    await input.page.screenshot({
      path: path.join(EVIDENCE_DIRECTORY, file),
      fullPage: false,
    });
    const checks: VisualChecks = {
      ...visual,
      pageErrorsSinceNavigation: monitorEvents.pageErrors,
      blockingConsoleSinceNavigation: monitorEvents.blockingConsole,
    };
    input.outcomes.push({
      state: input.state,
      route: input.route,
      finalUrl: input.page.url(),
      file,
      viewport: viewport.value,
      checks,
    });
    // Visual, console, and page-error violations remain unfiltered, but are
    // accumulated until all requested state captures complete. The final
    // assertions below then fail truthfully with the complete evidence packet
    // rather than withholding later route screenshots behind the first issue.
  }
  await input.page.setViewportSize(DESKTOP_VIEWPORT);
}

async function captureSelectedSourcePreview(input: {
  page: Page;
  monitor: BrowserMonitor;
  sourceUrl: string;
  outcomes: ScreenshotOutcome[];
}): Promise<void> {
  const checkpoint = input.monitor.checkpoint();
  const viewports = [
    { label: "desktop", value: DESKTOP_VIEWPORT },
    { label: "mobile", value: MOBILE_VIEWPORT },
  ] as const;
  for (const viewport of viewports) {
    await input.page.setViewportSize(viewport.value);
    const selectedVideo = input.page.locator("main video").first();
    await selectedVideo.scrollIntoViewIfNeeded();
    await waitForPaint(input.page);
    assert(
      (await selectedVideo.getAttribute("src")) === input.sourceUrl,
      "VISUAL_DNA_LOCAL_PROOF_SELECTED_SOURCE_PREVIEW_MISMATCH"
    );
    const visual = await inspectVisualContracts(input.page, true);
    const monitorEvents = input.monitor.since(checkpoint);
    const file = `local-${viewport.label}-creator-video-studio-selected-upload-preview-${viewport.value.width}x${viewport.value.height}.png`;
    await input.page.screenshot({
      path: path.join(EVIDENCE_DIRECTORY, file),
      fullPage: false,
    });
    input.outcomes.push({
      state: "creator-video-studio-selected-upload-preview",
      route: "/creator/video-studio",
      finalUrl: input.page.url(),
      file,
      viewport: viewport.value,
      checks: {
        ...visual,
        pageErrorsSinceNavigation: monitorEvents.pageErrors,
        blockingConsoleSinceNavigation: monitorEvents.blockingConsole,
      },
    });
  }
  await input.page.setViewportSize(DESKTOP_VIEWPORT);
  await input.page.evaluate(() => window.scrollTo(0, 0));
}

async function captureMobileNavigationOpen(input: {
  page: Page;
  monitor: BrowserMonitor;
  outcomes: ScreenshotOutcome[];
}): Promise<NonNullable<VisualChecks["mobileNavigation"]>> {
  const checkpoint = input.monitor.checkpoint();
  await input.page.setViewportSize(MOBILE_VIEWPORT);
  await input.page.evaluate(() => window.scrollTo(0, 0));
  const openButton = input.page.getByRole("button", {
    name: "Open CreatorVault navigation",
  });
  await openButton.waitFor({ state: "visible" });
  await openButton.click();
  const navigation = input.page.getByRole("navigation", {
    name: "CreatorVault mobile navigation",
  });
  await navigation.waitFor({ state: "visible" });
  await waitForPaint(input.page);
  const mobileNavigation = await input.page.evaluate(() => {
    const navigation = document.querySelector<HTMLElement>(
      'nav[aria-label="CreatorVault mobile navigation"]'
    );
    const control = document.querySelector<HTMLButtonElement>(
      'button[aria-label="Close CreatorVault navigation"]'
    );
    const headingFontSizesPx = navigation
      ? Array.from(navigation.querySelectorAll<HTMLElement>(".heading-xs")).map(
          item => Number.parseFloat(window.getComputedStyle(item).fontSize)
        )
      : [];
    const controlRect = control?.getBoundingClientRect();
    const controlStyle = control ? window.getComputedStyle(control) : null;
    const svg = control?.querySelector<SVGElement>("svg");
    const svgRect = svg?.getBoundingClientRect();
    const headingXsNotOversized =
      headingFontSizesPx.length > 0 &&
      headingFontSizesPx.every(size => Number.isFinite(size) && size <= 20);
    const menuControl = {
      width: Math.round((controlRect?.width ?? 0) * 100) / 100,
      height: Math.round((controlRect?.height ?? 0) * 100) / 100,
      paddingInlineStart: controlStyle?.paddingInlineStart ?? "",
      paddingInlineEnd: controlStyle?.paddingInlineEnd ?? "",
      svgWidth: Math.round((svgRect?.width ?? 0) * 100) / 100,
      svgHeight: Math.round((svgRect?.height ?? 0) * 100) / 100,
    };
    return {
      open: Boolean(navigation && control),
      headingFontSizesPx,
      headingXsNotOversized,
      menuControl,
      compactControlMatchesReleaseRule:
        Math.abs(menuControl.width - 44) < 0.5 &&
        Math.abs(menuControl.height - 44) < 0.5 &&
        menuControl.paddingInlineStart === "0px" &&
        menuControl.paddingInlineEnd === "0px" &&
        Math.abs(menuControl.svgWidth - 20) < 0.5 &&
        Math.abs(menuControl.svgHeight - 20) < 0.5,
    };
  });
  const visual = await inspectVisualContracts(input.page, true);
  const monitorEvents = input.monitor.since(checkpoint);
  const file = "local-mobile-home-mobile-navigation-open-390x844.png";
  await input.page.screenshot({
    path: path.join(EVIDENCE_DIRECTORY, file),
    fullPage: false,
  });
  input.outcomes.push({
    state: "home-mobile-navigation-open",
    route: "/",
    finalUrl: input.page.url(),
    file,
    viewport: MOBILE_VIEWPORT,
    checks: {
      ...visual,
      mobileNavigation,
      pageErrorsSinceNavigation: monitorEvents.pageErrors,
      blockingConsoleSinceNavigation: monitorEvents.blockingConsole,
    },
  });
  await input.page
    .getByRole("button", {
      name: "Close CreatorVault navigation",
    })
    .click();
  await navigation.waitFor({ state: "hidden" });
  await input.page.setViewportSize(DESKTOP_VIEWPORT);
  await input.page.evaluate(() => window.scrollTo(0, 0));
  return mobileNavigation;
}

async function captureReducedMotionProof(
  baseUrl: string,
  outcomes: ScreenshotOutcome[]
): Promise<VisualChecks["reducedMotionHero"]> {
  const browser = await chromium.launch({
    executablePath: "/usr/bin/chromium",
    headless: true,
  });
  try {
    const context = await browser.newContext({
      baseURL: baseUrl,
      ignoreHTTPSErrors: baseUrl.startsWith("https://127.0.0.1:"),
      viewport: DESKTOP_VIEWPORT,
      colorScheme: "dark",
      reducedMotion: "reduce",
    });
    const page = await context.newPage();
    await page.goto("/", { waitUntil: "domcontentloaded" });
    const ageGate = page.getByRole("dialog", {
      name: "Adult Access Verification",
    });
    if (await ageGate.isVisible().catch(() => false)) {
      await ageGate.getByRole("button", { name: /Enter.*18/i }).click();
      await ageGate.waitFor({ state: "hidden" });
    }
    await waitForPaint(page);
    await page.waitForFunction(
      () => {
        const image =
          document.querySelector<HTMLImageElement>("main section img");
        return Boolean(
          image &&
          image.complete &&
          image.naturalWidth > 0 &&
          image.getBoundingClientRect().height >= 200
        );
      },
      undefined,
      { timeout: 15000 }
    );
    const reducedMotion = await inspectReducedMotionHero(page);
    await page.screenshot({
      path: path.join(
        EVIDENCE_DIRECTORY,
        "local-desktop-home-reduced-motion-1440x1000.png"
      ),
      fullPage: false,
    });
    assert(
      reducedMotion.renderedAsStillOrPaused,
      "VISUAL_DNA_LOCAL_PROOF_REDUCED_MOTION_HERO_NOT_PAUSED_OR_POSTER"
    );
    const homeOutcome = outcomes.find(
      outcome =>
        outcome.state === "home-pre-upload" &&
        outcome.viewport.width === DESKTOP_VIEWPORT.width
    );
    if (homeOutcome) homeOutcome.checks.reducedMotionHero = reducedMotion;
    await context.close();
    return reducedMotion;
  } finally {
    await browser.close();
  }
}

async function dismissAgeGateIfPresent(page: Page): Promise<void> {
  const ageGate = page.getByRole("dialog", {
    name: "Adult Access Verification",
  });
  if (await ageGate.isVisible().catch(() => false)) {
    await ageGate.getByRole("button", { name: /Enter.*18/i }).click();
    await ageGate.waitFor({ state: "hidden" });
  }
}

async function nativeLogin(page: Page, password: string): Promise<void> {
  await page.goto("/login", { waitUntil: "domcontentloaded" });
  await dismissAgeGateIfPresent(page);
  await page.locator("#email").fill(FIXTURE_EMAIL);
  await page.locator("#password").fill(password);
  await page.getByRole("button", { name: "Enter my CreatorVault" }).click();
  await page.waitForURL(/\/dashboard$/, { timeout: 15_000 });
  const cookies = await page.context().cookies();
  assert(
    cookies.some(cookie => cookie.name === "app_session_id"),
    "VISUAL_DNA_LOCAL_PROOF_SESSION_COOKIE_MISSING"
  );
}

async function selectSavedSource(page: Page, fileName: string): Promise<void> {
  await page.getByRole("button", { name: "Choose source video" }).click();
  await page
    .getByRole("heading", { name: "Choose Your Source Video" })
    .waitFor({ state: "visible" });
  await page.getByRole("button", { name: new RegExp(fileName, "i") }).click();
  await page.getByRole("button", { name: /Use source video/i }).click();
  await page
    .getByRole("heading", { name: "Choose Your Source Video" })
    .waitFor({ state: "hidden" });
}

async function saveWorkspaceDraft(page: Page): Promise<void> {
  await page
    .getByLabel("Project or entity name")
    .fill("Visual DNA Proof Workspace");
  await page
    .getByLabel("Target audience")
    .fill("Creators who need truthful source-first delivery context.");
  await page
    .getByLabel("Primary promise")
    .fill("Carry one owned source into a saved direction draft.");
  await page
    .getByLabel("First offer")
    .fill("A source-backed trailer direction draft.");
  await page
    .getByLabel("Short-form content idea")
    .fill("Show the source moment, then invite a deeper look.");
  await page
    .getByLabel("Long-form story or series")
    .fill("A source-first series about the creator's working process.");
  await page
    .getByLabel("Story manifesto")
    .fill("Build from the proof already in your hands.");
  await page.getByRole("button", { name: "Save workspace draft" }).click();
  await page
    .getByRole("status")
    .filter({ hasText: "Workspace draft saved." })
    .waitFor({ state: "visible", timeout: 15_000 });
}

async function saveTrailerDirection(page: Page): Promise<void> {
  await page
    .getByRole("button", { name: /Next: Pick a template/i })
    .waitFor({ state: "visible", timeout: 15_000 });
  await page.getByRole("button", { name: /Next: Pick a template/i }).click();
  await page.getByRole("button", { name: /Countdown Drop/i }).click();
  await page.getByRole("button", { name: /Next: Release direction/i }).click();
  await page.getByRole("button", { name: "Save trailer direction" }).click();
  await page
    .getByText("Your real sources and trailer direction are saved.", {
      exact: false,
    })
    .waitFor({ state: "visible", timeout: 15_000 });
}

function screenshotSummary(outcomes: ScreenshotOutcome[]): string[] {
  return outcomes.map(outcome => outcome.file);
}

async function main(): Promise<void> {
  requireRepositoryContract();
  await mkdir(EVIDENCE_DIRECTORY, { recursive: true, mode: 0o700 });

  let fixtureRoot: string | null = null;
  let databaseProcess: ChildProcessWithoutNullStreams | null = null;
  let proofServerProcess: ChildProcessWithoutNullStreams | null = null;
  let success = false;
  let failure: { code: string; diagnostic: string } | null = null;
  let durableFixtureRemoved = false;
  const screenshots: ScreenshotOutcome[] = [];
  let monitorSummary: ReturnType<BrowserMonitor["summary"]> | null = null;
  let reducedMotionHero: VisualChecks["reducedMotionHero"] | null = null;
  let mobileNavigation: VisualChecks["mobileNavigation"] | null = null;
  let localCutVerification: LocalCutVerification | null = null;
  let localProofFacts: {
    creatorId: number;
    mediaAssetId: string;
    workspaceId: string;
    trailerProjectId: string;
    sourceUrl: string;
  } | null = null;

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
    const localSourceFixture = path.join(fixtureRoot, "aderly-follow-me.mp4");
    await copyFile(SOURCE_FIXTURE, localSourceFixture);

    proofServerProcess = startProcess(
      path.join(REPOSITORY_ROOT, "node_modules/.bin/tsx"),
      [PROOF_SERVER],
      REPOSITORY_ROOT,
      sanitizedServerEnvironment({
        databaseUrl: database.databaseUrl,
        jwtSecret: randomToken(),
        port: applicationPort,
        storageRoot: fixtureRoot,
      })
    );
    captureProofServerDiagnostic(proofServerProcess);
    const baseUrl = `https://127.0.0.1:${applicationPort}`;
    await waitForServer(baseUrl, proofServerProcess);

    const browser = await chromium.launch({
      executablePath: "/usr/bin/chromium",
      headless: true,
    });
    const context = await browser.newContext({
      baseURL: baseUrl,
      ignoreHTTPSErrors: baseUrl.startsWith("https://127.0.0.1:"),
      viewport: DESKTOP_VIEWPORT,
      colorScheme: "dark",
    });
    const page = await context.newPage();
    const monitor = new BrowserMonitor();
    monitor.attach(page);

    try {
      // Anonymous, real local route captures occur before the fixture user signs in.
      await page.goto("/", { waitUntil: "domcontentloaded" });
      await captureState({
        page,
        monitor,
        state: "entry-gate-pre-acknowledgement",
        route: "/",
        requireCyanCta: false,
        outcomes: screenshots,
      });
      await dismissAgeGateIfPresent(page);
      await page.waitForFunction(
        () => {
          const video =
            document.querySelector<HTMLVideoElement>("main section video");
          return Boolean(
            video &&
            video.readyState >= 2 &&
            !video.paused &&
            video.currentTime > 0.25 &&
            video.getBoundingClientRect().height >= 200
          );
        },
        undefined,
        { timeout: 20000 }
      );
      await captureState({
        page,
        monitor,
        state: "home-pre-upload",
        route: "/",
        requireCyanCta: true,
        outcomes: screenshots,
      });
      mobileNavigation = await captureMobileNavigationOpen({
        page,
        monitor,
        outcomes: screenshots,
      });

      await page.goto("/login", { waitUntil: "domcontentloaded" });
      await dismissAgeGateIfPresent(page);
      await captureState({
        page,
        monitor,
        state: "login-pre-upload",
        route: "/login",
        requireCyanCta: true,
        outcomes: screenshots,
      });

      await nativeLogin(page, database.password);
      await page
        .getByText("UNAVAILABLE", { exact: true })
        .first()
        .waitFor({ state: "visible", timeout: 15_000 });
      await captureState({
        page,
        monitor,
        state: "dashboard-pre-upload",
        route: "/dashboard",
        requireCyanCta: true,
        outcomes: screenshots,
      });

      await page.goto("/creator/video-studio", {
        waitUntil: "domcontentloaded",
      });
      await page
        .getByRole("button", { name: "Choose source video" })
        .waitFor({ state: "visible" });
      await captureState({
        page,
        monitor,
        state: "creator-video-studio-pre-upload",
        route: "/creator/video-studio",
        requireCyanCta: true,
        outcomes: screenshots,
      });

      await page
        .locator('input[type="file"][accept="video/*"]')
        .setInputFiles(localSourceFixture);
      const savedSourceState = page
        .getByRole("status")
        .filter({ hasText: "Your source video is saved and selected below." });
      const failedSourceState = page.getByRole("alert");
      const uploadOutcome = await Promise.race([
        savedSourceState
          .waitFor({ state: "visible", timeout: 30_000 })
          .then(() => "saved" as const),
        failedSourceState
          .waitFor({ state: "visible", timeout: 30_000 })
          .then(() => "failed" as const),
      ]);
      if (uploadOutcome === "failed") {
        const message = (await failedSourceState.textContent())?.trim() ?? "";
        throw new Error(`VISUAL_DNA_LOCAL_PROOF_UPLOAD_UI_ERROR ${message}`);
      }
      const selectedVideo = page.locator("main video").first();
      await selectedVideo.waitFor({ state: "visible" });
      await page.waitForFunction(
        () => {
          const video = document.querySelector(
            "main video"
          ) as HTMLVideoElement | null;
          return Boolean(
            video &&
            video.readyState >= 1 &&
            video.videoWidth > 0 &&
            video.videoHeight > 0
          );
        },
        undefined,
        { timeout: 20_000 }
      );
      const sourceUrl = await selectedVideo.getAttribute("src");
      assert(
        typeof sourceUrl === "string" &&
          sourceUrl.startsWith("/uploads/content-vault/"),
        "VISUAL_DNA_LOCAL_PROOF_UPLOAD_URL_INVALID"
      );
      await captureState({
        page,
        monitor,
        state: "creator-video-studio-selected-upload",
        route: "/creator/video-studio",
        requireCyanCta: true,
        outcomes: screenshots,
      });
      await captureSelectedSourcePreview({
        page,
        monitor,
        sourceUrl,
        outcomes: screenshots,
      });

      await page.goto("/creator/workspace", { waitUntil: "domcontentloaded" });
      await selectSavedSource(page, path.basename(localSourceFixture));
      await captureState({
        page,
        monitor,
        state: "creator-workspace-new",
        route: "/creator/workspace",
        // The sole primary control is intentionally disabled until the required
        // draft fields are complete, so it is recorded but not treated as an
        // active cyan CTA dimension failure.
        requireCyanCta: false,
        outcomes: screenshots,
      });

      await saveWorkspaceDraft(page);
      const workspace = await queryWorkspace(database);
      assert(
        workspace.status === "draft" &&
          workspace.entityName === "Visual DNA Proof Workspace",
        "VISUAL_DNA_LOCAL_PROOF_WORKSPACE_SAVE_INVALID"
      );
      const uploadedMedia = await queryUploadedMedia(
        database,
        workspace.sourceAssetId
      );
      assert(
        uploadedMedia.ownerUserId === creatorId &&
          uploadedMedia.status === "ready" &&
          uploadedMedia.sourceType === "upload" &&
          uploadedMedia.publicUrl === sourceUrl,
        "VISUAL_DNA_LOCAL_PROOF_SOURCE_LINEAGE_INVALID"
      );
      await captureState({
        page,
        monitor,
        state: "creator-workspace-saved",
        route: "/creator/workspace",
        requireCyanCta: true,
        outcomes: screenshots,
      });

      await page
        .getByRole("link", { name: /Start delivery in Trailer Maker/i })
        .click();
      await page.waitForURL(/\/trailer-maker\?sourceAssetId=/, {
        timeout: 15_000,
      });
      const handoffUrl = new URL(page.url());
      const handoffSourceAssetId = handoffUrl.searchParams.get("sourceAssetId");
      assert(
        handoffSourceAssetId === workspace.sourceAssetId,
        "VISUAL_DNA_LOCAL_PROOF_SOURCE_HANDOFF_INVALID"
      );
      await page
        .getByRole("button", { name: /Next: Pick a template/i })
        .waitFor({ state: "visible", timeout: 15_000 });
      await captureState({
        page,
        monitor,
        state: "trailer-maker-source",
        route: `/trailer-maker?sourceAssetId=${encodeURIComponent(handoffSourceAssetId)}`,
        requireCyanCta: false,
        outcomes: screenshots,
      });

      await saveTrailerDirection(page);
      const trailer = await queryTrailer(database);
      assert(
        trailer.sourceAssetId === handoffSourceAssetId &&
          trailer.status === "draft",
        "VISUAL_DNA_LOCAL_PROOF_TRAILER_SAVE_INVALID"
      );
      await captureState({
        page,
        monitor,
        state: "trailer-maker-draft",
        route: `/trailer-maker?sourceAssetId=${encodeURIComponent(handoffSourceAssetId)}`,
        requireCyanCta: false,
        outcomes: screenshots,
      });

      await page.goto(
        `/creator/workspace?draft=${encodeURIComponent(workspace.id)}`,
        { waitUntil: "domcontentloaded" }
      );
      const restoredName = page.getByLabel("Project or entity name");
      await restoredName.waitFor({ state: "visible" });
      await page.waitForFunction(
        expectedName => {
          const input =
            document.querySelector<HTMLInputElement>("input.cv-input");
          return input?.value === expectedName;
        },
        workspace.entityName,
        { timeout: 15_000 }
      );
      assert(
        (await restoredName.inputValue()) === workspace.entityName,
        "VISUAL_DNA_LOCAL_PROOF_WORKSPACE_REENTRY_INVALID"
      );

      await page.goto(
        `/creator/workspace?draft=${encodeURIComponent(workspace.id)}&view=direction`,
        { waitUntil: "domcontentloaded" }
      );
      const requiredTruth = [
        "Your source video is saved.",
        "Your trailer direction is saved.",
        "This is a direction preview using your original source video.",
        "A generated or exported trailer has not been created.",
        "Nothing has been published, sold, or sent.",
      ];
      for (const text of requiredTruth) {
        await page.getByText(text, { exact: false }).waitFor({
          state: "visible",
          timeout: 15_000,
        });
      }
      const unavailableLocalCutLabel =
        "Local Trailer Cut is not enabled in this environment. No output has been created.";
      try {
        await page
          .getByText(unavailableLocalCutLabel, { exact: true })
          .waitFor({ state: "visible", timeout: 15_000 });
        localCutVerification = {
          expectedUnavailableLabelObserved: true,
          alerts: [],
          queryResponses: await monitor.localCutQueryResponses(),
          diagnosticScreenshot: null,
          visibleMainText: null,
        };
      } catch {
        const diagnosticScreenshot =
          "local-desktop-creator-workspace-direction-local-cut-diagnostic-1440x1000.png";
        await waitForPaint(page);
        await page.screenshot({
          path: path.join(EVIDENCE_DIRECTORY, diagnosticScreenshot),
          fullPage: false,
        });
        localCutVerification = {
          expectedUnavailableLabelObserved: false,
          alerts: (await page.getByRole("alert").allTextContents()).map(text =>
            redact(text)
          ),
          queryResponses: await monitor.localCutQueryResponses(),
          diagnosticScreenshot,
          visibleMainText: redact(
            (await page
              .locator("main")
              .innerText()
              .catch(() => "")) || ""
          ),
        };
        fail("VISUAL_DNA_LOCAL_PROOF_LOCAL_CUT_UNAVAILABLE_STATE_MISSING");
      }
      assert(
        localCutVerification.queryResponses.some(
          response =>
            response.status === 200 &&
            /"available":false/.test(response.body) &&
            /"cut":null/.test(response.body)
        ),
        "VISUAL_DNA_LOCAL_PROOF_LOCAL_CUT_QUERY_RESULT_INVALID"
      );
      const localCutButton = page.getByRole("button", {
        name: "Create local trailer cut",
      });
      assert(
        !(await localCutButton.isVisible().catch(() => false)),
        "VISUAL_DNA_LOCAL_PROOF_LOCAL_CUT_ACTION_EXPOSED"
      );
      const localCutCount = await localCutRecordCount(database);
      assert(
        localCutCount === 0,
        "VISUAL_DNA_LOCAL_PROOF_LOCAL_CUT_RECORD_PRESENT"
      );
      const previewVideo = page.getByLabel("Saved creator source video");
      await previewVideo.waitFor({ state: "visible" });
      assert(
        (await previewVideo.getAttribute("src")) === sourceUrl,
        "VISUAL_DNA_LOCAL_PROOF_DIRECTION_SOURCE_MISMATCH"
      );
      await captureState({
        page,
        monitor,
        state: "creator-workspace-direction-local-cut-unavailable",
        route: `/creator/workspace?draft=${encodeURIComponent(workspace.id)}&view=direction`,
        requireCyanCta: true,
        outcomes: screenshots,
      });

      monitorSummary = monitor.summary();
      const overflowViolation = screenshots.some(
        screenshot => !screenshot.checks.noHorizontalOverflow
      );
      const fontViolation = screenshots.some(screenshot =>
        Object.values(screenshot.checks.fontsLoaded).some(loaded => !loaded)
      );
      const ctaViolation = screenshots.some(
        screenshot =>
          screenshot.checks.cta.applicable &&
          (screenshot.checks.cta.cyanCtaCount === 0 ||
            !screenshot.checks.cta.allCyanCtasAtLeast52px)
      );
      const mobileNavigationViolation =
        !mobileNavigation?.open ||
        !mobileNavigation.headingXsNotOversized ||
        !mobileNavigation.compactControlMatchesReleaseRule;
      assert(!overflowViolation, "VISUAL_DNA_LOCAL_PROOF_HORIZONTAL_OVERFLOW");
      assert(!fontViolation, "VISUAL_DNA_LOCAL_PROOF_FONT_LOAD");
      assert(!ctaViolation, "VISUAL_DNA_LOCAL_PROOF_CYAN_CTA");
      assert(
        !mobileNavigationViolation,
        "VISUAL_DNA_LOCAL_PROOF_MOBILE_NAVIGATION"
      );
      assert(
        monitorSummary.pageErrors.length === 0,
        "VISUAL_DNA_LOCAL_PROOF_PAGEERROR"
      );
      assert(
        monitorSummary.blockingConsoleEvents.length === 0,
        "VISUAL_DNA_LOCAL_PROOF_CONSOLE"
      );
      localProofFacts = {
        creatorId,
        mediaAssetId: workspace.sourceAssetId,
        workspaceId: workspace.id,
        trailerProjectId: trailer.id,
        sourceUrl,
      };
      reducedMotionHero = await captureReducedMotionProof(baseUrl, screenshots);
      success = true;
    } finally {
      await context.close();
      await browser.close();
    }
  } catch (error) {
    const raw =
      error instanceof Error ? error.message : "unknown proof failure";
    const code = /^[A-Z0-9_]+$/.test(raw.split(" ")[0] ?? "")
      ? (raw.split(" ")[0] as string)
      : "VISUAL_DNA_LOCAL_PROOF_FAILED";
    failure = { code, diagnostic: redact(raw) };
  } finally {
    await stopProcess(proofServerProcess);
    await stopProcess(databaseProcess);
    if (fixtureRoot) {
      await rm(fixtureRoot, { recursive: true, force: true });
      durableFixtureRemoved = true;
    }
    const evidence = {
      recordedAt: new Date().toISOString(),
      result: success ? "pass" : "fail",
      scope: "local-disposable-only",
      harness: "scripts/runVisualDnaLocalProof.ts",
      sourceFixture: {
        repositoryPath:
          "client/public/videos/creator-pages/aderly-follow-me.mp4",
        copiedIntoDisposableFixture: true,
      },
      application: {
        server: "scripts/cvVideo026LocalProofServer.ts",
        auth: "Native POST /api/auth/login with the existing signed loopback session cookie",
        storage: "temporary local proof storage disposed after completion",
        database:
          "isolated loopback MariaDB database disposed after completion",
      },
      nativeFlow: localProofFacts
        ? {
            ordinaryCreatorId: localProofFacts.creatorId,
            uploadedMediaAssetId: localProofFacts.mediaAssetId,
            uploadedSourceUrl: localProofFacts.sourceUrl,
            workspaceId: localProofFacts.workspaceId,
            trailerProjectId: localProofFacts.trailerProjectId,
            reentryVerified: true,
          }
        : null,
      localTrailerCut: {
        environment: "CREATORVAULT_LOCAL_TRAILER_CUT_ENABLED=0",
        creationControlClicked: false,
        encoderInvokedByHarness: false,
        expectedVisibleState:
          "Local Trailer Cut is not enabled in this environment. No output has been created.",
        verification: localCutVerification,
      },
      visualChecks: {
        screenshots,
        reducedMotionHero,
        browserConsole: monitorSummary,
      },
      productionBoundary: {
        publicHomepageBaseline:
          "docs/evidence/visual-dna/public-home-before.json",
        productionAuthenticationAttempted: false,
        productionWrites: false,
        authenticatedProductionE2E: "not attempted and not claimed",
      },
      restrictions: {
        mockRoutesUsed: false,
        providerCredentialsUsed: false,
        providerCallsMade: false,
        paymentsTouched: false,
        externalPublishingOrSends: false,
        localTrailerCutCreated: false,
        durableFixtureRemoved,
      },
      outcomeFiles: screenshotSummary(screenshots),
      failure,
    };
    await writeFile(EVIDENCE_PATH, `${JSON.stringify(evidence, null, 2)}\n`, {
      mode: 0o600,
    });
  }

  if (failure) {
    process.stderr.write(
      `${failure.code}: ${failure.diagnostic}\nEvidence: ${EVIDENCE_PATH}\n`
    );
    process.exitCode = 1;
    return;
  }
  process.stdout.write(
    [
      "VISUAL_DNA_LOCAL_PROOF_PASS",
      `Evidence: ${EVIDENCE_PATH}`,
      "Authenticated production E2E: not attempted and not claimed.",
      "Screenshot files:",
      ...screenshotSummary(screenshots).map(file => `- ${file}`),
      "- local-desktop-home-reduced-motion-1440x1000.png",
    ].join("\n") + "\n"
  );
}

void main();
