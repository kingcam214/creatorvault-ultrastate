import { chmod, readFile, rename, writeFile } from "fs/promises";
import { basename, dirname, join } from "path";
import { randomUUID } from "crypto";

const VACE_WORKER_URL_KEY = "CREATORVAULT_VACE_WORKER_URL";
const VACE_WORKER_TOKEN_KEY = "CREATORVAULT_VACE_WORKER_TOKEN";
const DEFAULT_RUNTIME_ENV_PATH = "/root/creatorvault/.env";

export type VaceWorkerConnectionState = {
  configured: boolean;
  credentialLocation: "vps_runtime_env";
  workerUrlConfigured: boolean;
  workerTokenConfigured: boolean;
};

export class VaceWorkerConnectionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "VaceWorkerConnectionError";
  }
}

function runtimeEnvironmentPath(): string {
  const configured = String(process.env.CREATORVAULT_RUNTIME_ENV_FILE || "").trim();
  return configured || DEFAULT_RUNTIME_ENV_PATH;
}

function validateWorkerUrl(value: string): string {
  const candidate = String(value || "").trim();
  let parsed: URL;
  try {
    parsed = new URL(candidate);
  } catch {
    throw new VaceWorkerConnectionError("CreatorVault refused an invalid VACE worker URL.");
  }
  if (parsed.protocol !== "https:" || !parsed.hostname || parsed.username || parsed.password || parsed.search || parsed.hash) {
    throw new VaceWorkerConnectionError("CreatorVault requires a clean HTTPS VACE worker URL.");
  }
  return parsed.toString().replace(/\/$/, "");
}

function validateWorkerToken(value: string): string {
  const token = String(value || "").trim();
  if (token.length < 32 || token.length > 512 || /\s/.test(token)) {
    throw new VaceWorkerConnectionError("CreatorVault refused an invalid VACE worker token.");
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
    throw new VaceWorkerConnectionError("CreatorVault could not read its protected production environment file.");
  }
}

export function getVaceWorkerConnectionState(): VaceWorkerConnectionState {
  const workerUrlConfigured = (() => {
    try { return Boolean(validateWorkerUrl(String(process.env[VACE_WORKER_URL_KEY] || ""))); } catch { return false; }
  })();
  const workerTokenConfigured = (() => {
    try { return Boolean(validateWorkerToken(String(process.env[VACE_WORKER_TOKEN_KEY] || ""))); } catch { return false; }
  })();
  return {
    configured: workerUrlConfigured && workerTokenConfigured,
    credentialLocation: "vps_runtime_env",
    workerUrlConfigured,
    workerTokenConfigured,
  };
}

/**
 * Owner-gated route only. This writes the already-existing VPS runtime env file
 * atomically and intentionally never returns the VACE worker URL token.
 */
export async function activateVaceWorkerConnection(input: {
  workerUrl: string;
  workerToken: string;
  environmentFilePath?: string;
}): Promise<VaceWorkerConnectionState> {
  const workerUrl = validateWorkerUrl(input.workerUrl);
  const workerToken = validateWorkerToken(input.workerToken);
  const environmentFilePath = String(input.environmentFilePath || runtimeEnvironmentPath()).trim();
  if (!environmentFilePath || !environmentFilePath.startsWith("/root/creatorvault/")) {
    throw new VaceWorkerConnectionError("CreatorVault refused an unsafe production environment location.");
  }

  const existing = await readEnvironmentFile(environmentFilePath);
  const next = replaceEnvironmentValues(existing, {
    [VACE_WORKER_URL_KEY]: workerUrl,
    [VACE_WORKER_TOKEN_KEY]: workerToken,
  });
  const directory = dirname(environmentFilePath);
  const temporaryPath = join(directory, `.${basename(environmentFilePath)}.vace-${process.pid}-${randomUUID()}.tmp`);
  try {
    await writeFile(temporaryPath, next, { encoding: "utf8", mode: 0o600 });
    await chmod(temporaryPath, 0o600);
    await rename(temporaryPath, environmentFilePath);
    await chmod(environmentFilePath, 0o600);
  } catch {
    try { await chmod(temporaryPath, 0o600); } catch { /* permission tightening only */ }
    throw new VaceWorkerConnectionError("CreatorVault could not securely update its protected VACE worker connection.");
  }

  process.env[VACE_WORKER_URL_KEY] = workerUrl;
  process.env[VACE_WORKER_TOKEN_KEY] = workerToken;
  return getVaceWorkerConnectionState();
}

export const __vaceWorkerConnectionTesting = {
  replaceEnvironmentValues,
  validateWorkerToken,
  validateWorkerUrl,
};
