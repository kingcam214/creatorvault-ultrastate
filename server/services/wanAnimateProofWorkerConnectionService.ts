import { chmod, readFile, rename, writeFile } from "fs/promises";
import { basename, dirname, join } from "path";
import { randomUUID } from "crypto";

const WORKER_URL_KEY = "CREATORVAULT_WAN_PROOF_WORKER_URL";
const WORKER_TOKEN_KEY = "CREATORVAULT_WAN_PROOF_WORKER_TOKEN";
const DEFAULT_RUNTIME_ENV_PATH = "/root/creatorvault/.env";

export type WanProofWorkerConnectionState = {
  configured: boolean;
  credentialLocation: "vps_runtime_env";
  workerUrlConfigured: boolean;
  workerTokenConfigured: boolean;
};

export class WanProofWorkerConnectionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "WanProofWorkerConnectionError";
  }
}

function runtimeEnvironmentPath(): string {
  return String(process.env.CREATORVAULT_RUNTIME_ENV_FILE || "").trim() || DEFAULT_RUNTIME_ENV_PATH;
}

function validateWorkerUrl(value: string): string {
  const candidate = String(value || "").trim();
  let parsed: URL;
  try { parsed = new URL(candidate); } catch { throw new WanProofWorkerConnectionError("CreatorVault refused an invalid Wan proof worker URL."); }
  if (parsed.protocol !== "https:" || !parsed.hostname || parsed.username || parsed.password || parsed.search || parsed.hash) {
    throw new WanProofWorkerConnectionError("CreatorVault requires a clean HTTPS Wan proof worker URL.");
  }
  return parsed.toString().replace(/\/$/, "");
}

function validateWorkerToken(value: string): string {
  const token = String(value || "").trim();
  if (token.length < 32 || token.length > 512 || /\s/.test(token)) {
    throw new WanProofWorkerConnectionError("CreatorVault refused an invalid Wan proof worker token.");
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
  try { return await readFile(filePath, "utf8"); } catch (error: unknown) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return "";
    throw new WanProofWorkerConnectionError("CreatorVault could not read its protected production environment file.");
  }
}

export function getWanProofWorkerConnectionState(): WanProofWorkerConnectionState {
  const workerUrlConfigured = (() => { try { return Boolean(validateWorkerUrl(String(process.env[WORKER_URL_KEY] || ""))); } catch { return false; } })();
  const workerTokenConfigured = (() => { try { return Boolean(validateWorkerToken(String(process.env[WORKER_TOKEN_KEY] || ""))); } catch { return false; } })();
  return { configured: workerUrlConfigured && workerTokenConfigured, credentialLocation: "vps_runtime_env", workerUrlConfigured, workerTokenConfigured };
}

export async function activateWanProofWorkerConnection(input: { workerUrl: string; workerToken: string; environmentFilePath?: string }): Promise<WanProofWorkerConnectionState> {
  const workerUrl = validateWorkerUrl(input.workerUrl);
  const workerToken = validateWorkerToken(input.workerToken);
  const environmentFilePath = String(input.environmentFilePath || runtimeEnvironmentPath()).trim();
  if (!environmentFilePath || !environmentFilePath.startsWith("/root/creatorvault/")) {
    throw new WanProofWorkerConnectionError("CreatorVault refused an unsafe production environment location.");
  }
  const existing = await readEnvironmentFile(environmentFilePath);
  const next = replaceEnvironmentValues(existing, { [WORKER_URL_KEY]: workerUrl, [WORKER_TOKEN_KEY]: workerToken });
  const temporaryPath = join(dirname(environmentFilePath), `.${basename(environmentFilePath)}.wan-proof-${process.pid}-${randomUUID()}.tmp`);
  try {
    await writeFile(temporaryPath, next, { encoding: "utf8", mode: 0o600 });
    await chmod(temporaryPath, 0o600);
    await rename(temporaryPath, environmentFilePath);
    await chmod(environmentFilePath, 0o600);
  } catch {
    try { await chmod(temporaryPath, 0o600); } catch { /* best-effort only */ }
    throw new WanProofWorkerConnectionError("CreatorVault could not securely update its protected Wan proof worker connection.");
  }
  process.env[WORKER_URL_KEY] = workerUrl;
  process.env[WORKER_TOKEN_KEY] = workerToken;
  return getWanProofWorkerConnectionState();
}

export function getWanProofWorkerRuntime(): { baseUrl: string; token: string } {
  const state = getWanProofWorkerConnectionState();
  if (!state.configured) throw new WanProofWorkerConnectionError("CreatorVault has no configured Wan proof worker connection.");
  return { baseUrl: validateWorkerUrl(String(process.env[WORKER_URL_KEY])), token: validateWorkerToken(String(process.env[WORKER_TOKEN_KEY])) };
}
