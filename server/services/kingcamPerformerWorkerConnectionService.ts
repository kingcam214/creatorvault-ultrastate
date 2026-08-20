import { chmod, readFile, rename, writeFile } from "fs/promises";
import { basename, dirname, join } from "path";
import { randomUUID } from "crypto";

const WORKER_URL_KEY = "CREATORVAULT_KINGCAM_PERFORMER_WORKER_URL";
const WORKER_TOKEN_KEY = "CREATORVAULT_KINGCAM_PERFORMER_WORKER_TOKEN";
const DEFAULT_RUNTIME_ENV_PATH = "/root/creatorvault/.env";

export type KingcamPerformerWorkerConnectionState = {
  configured: boolean;
  credentialLocation: "vps_runtime_env";
  workerUrlConfigured: boolean;
  workerTokenConfigured: boolean;
};

export class KingcamPerformerWorkerConnectionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "KingcamPerformerWorkerConnectionError";
  }
}

function runtimeEnvironmentPath(): string {
  return String(process.env.CREATORVAULT_RUNTIME_ENV_FILE || "").trim() || DEFAULT_RUNTIME_ENV_PATH;
}

function validateWorkerUrl(value: string): string {
  const candidate = String(value || "").trim();
  let parsed: URL;
  try {
    parsed = new URL(candidate);
  } catch {
    throw new KingcamPerformerWorkerConnectionError("CreatorVault refused an invalid KingCam performer worker URL.");
  }
  if (parsed.protocol !== "https:" || !parsed.hostname || parsed.username || parsed.password || parsed.search || parsed.hash) {
    throw new KingcamPerformerWorkerConnectionError("CreatorVault requires a clean HTTPS KingCam performer worker URL.");
  }
  return parsed.toString().replace(/\/$/, "");
}

function validateWorkerToken(value: string): string {
  const token = String(value || "").trim();
  if (token.length < 32 || token.length > 512 || /\s/.test(token)) {
    throw new KingcamPerformerWorkerConnectionError("CreatorVault refused an invalid KingCam performer worker token.");
  }
  return token;
}

function replaceEnvironmentValues(existing: string, values: Record<string, string>): string {
  const names = Object.keys(values);
  const assignments = names.map((name) => new RegExp(`^\\s*(?:export\\s+)?${name}\\s*=`, "i"));
  const retained = existing.split(/\r?\n/).filter((line) => !assignments.some((assignment) => assignment.test(line)));
  while (retained.length && !retained[retained.length - 1].trim()) retained.pop();
  return [...retained, ...names.map((name) => `${name}=${values[name]}`), ""].join("\n");
}

async function readEnvironmentFile(filePath: string): Promise<string> {
  try {
    return await readFile(filePath, "utf8");
  } catch (error: unknown) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return "";
    throw new KingcamPerformerWorkerConnectionError("CreatorVault could not read its protected production environment file.");
  }
}

export function getKingcamPerformerWorkerConnectionState(): KingcamPerformerWorkerConnectionState {
  const workerUrlConfigured = (() => {
    try {
      return Boolean(validateWorkerUrl(String(process.env[WORKER_URL_KEY] || "")));
    } catch {
      return false;
    }
  })();
  const workerTokenConfigured = (() => {
    try {
      return Boolean(validateWorkerToken(String(process.env[WORKER_TOKEN_KEY] || "")));
    } catch {
      return false;
    }
  })();
  return { configured: workerUrlConfigured && workerTokenConfigured, credentialLocation: "vps_runtime_env", workerUrlConfigured, workerTokenConfigured };
}

export async function activateKingcamPerformerWorkerConnection(input: { workerUrl: string; workerToken: string; environmentFilePath?: string }): Promise<KingcamPerformerWorkerConnectionState> {
  const workerUrl = validateWorkerUrl(input.workerUrl);
  const workerToken = validateWorkerToken(input.workerToken);
  const environmentFilePath = String(input.environmentFilePath || runtimeEnvironmentPath()).trim();
  if (!environmentFilePath || !environmentFilePath.startsWith("/root/creatorvault/")) {
    throw new KingcamPerformerWorkerConnectionError("CreatorVault refused an unsafe production environment location.");
  }
  const existing = await readEnvironmentFile(environmentFilePath);
  const next = replaceEnvironmentValues(existing, { [WORKER_URL_KEY]: workerUrl, [WORKER_TOKEN_KEY]: workerToken });
  const temporaryPath = join(dirname(environmentFilePath), `.${basename(environmentFilePath)}.kingcam-performer-${process.pid}-${randomUUID()}.tmp`);
  try {
    await writeFile(temporaryPath, next, { encoding: "utf8", mode: 0o600 });
    await chmod(temporaryPath, 0o600);
    await rename(temporaryPath, environmentFilePath);
    await chmod(environmentFilePath, 0o600);
  } catch {
    try {
      await chmod(temporaryPath, 0o600);
    } catch {
      // Best effort only; the original environment remains untouched on a failed rename.
    }
    throw new KingcamPerformerWorkerConnectionError("CreatorVault could not securely update its protected KingCam performer worker connection.");
  }
  process.env[WORKER_URL_KEY] = workerUrl;
  process.env[WORKER_TOKEN_KEY] = workerToken;
  return getKingcamPerformerWorkerConnectionState();
}

export function getKingcamPerformerWorkerRuntime(): { baseUrl: string; token: string } {
  const state = getKingcamPerformerWorkerConnectionState();
  if (!state.configured) throw new KingcamPerformerWorkerConnectionError("CreatorVault has no configured KingCam performer worker connection.");
  return { baseUrl: validateWorkerUrl(String(process.env[WORKER_URL_KEY])), token: validateWorkerToken(String(process.env[WORKER_TOKEN_KEY])) };
}
