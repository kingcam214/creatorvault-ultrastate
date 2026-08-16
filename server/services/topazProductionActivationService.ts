import { chmod, readFile, rename, writeFile } from "fs/promises";
import { basename, dirname, join } from "path";
import { randomUUID } from "crypto";

const TOPAZ_ENVIRONMENT_KEY = "TOPAZ_API_KEY";
const DEFAULT_RUNTIME_ENV_PATH = "/root/creatorvault/.env";
const TOPAZ_API_KEY_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type TopazProductionCredentialState = {
  configured: boolean;
  credentialLocation: "vps_runtime_env";
  providerKey: "topaz_video";
};

export class TopazProductionActivationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TopazProductionActivationError";
  }
}

function runtimeEnvironmentPath(): string {
  const configured = String(process.env.CREATORVAULT_RUNTIME_ENV_FILE || "").trim();
  return configured || DEFAULT_RUNTIME_ENV_PATH;
}

function validateTopazApiKey(value: string): string {
  const apiKey = String(value || "").trim();
  if (!TOPAZ_API_KEY_PATTERN.test(apiKey)) {
    throw new TopazProductionActivationError("The supplied Topaz credential has an invalid format.");
  }
  return apiKey;
}

function replaceEnvironmentValue(existing: string, name: string, value: string): string {
  const assignment = new RegExp(`^\\s*(?:export\\s+)?${name}\\s*=`, "i");
  const retained = existing.split(/\r?\n/).filter((line) => !assignment.test(line));
  while (retained.length && !retained[retained.length - 1].trim()) retained.pop();
  return [...retained, `${name}=${value}`, ""].join("\n");
}

async function readEnvironmentFile(filePath: string): Promise<string> {
  try {
    return await readFile(filePath, "utf8");
  } catch (error: unknown) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return "";
    throw new TopazProductionActivationError("CreatorVault could not read its protected production environment file.");
  }
}

export function getTopazProductionCredentialState(): TopazProductionCredentialState {
  return {
    configured: TOPAZ_API_KEY_PATTERN.test(String(process.env[TOPAZ_ENVIRONMENT_KEY] || "").trim()),
    credentialLocation: "vps_runtime_env",
    providerKey: "topaz_video",
  };
}

/**
 * This is intentionally limited to TOPAZ_API_KEY. It writes only the existing
 * VPS-local runtime .env file, uses an atomic replace, and never returns or logs
 * the credential. It must only be invoked from the owner-gated governed route.
 */
export async function activateTopazProductionCredential(input: {
  apiKey: string;
  environmentFilePath?: string;
}): Promise<TopazProductionCredentialState> {
  const apiKey = validateTopazApiKey(input.apiKey);
  const environmentFilePath = String(input.environmentFilePath || runtimeEnvironmentPath()).trim();
  if (!environmentFilePath || !environmentFilePath.startsWith("/root/creatorvault/")) {
    throw new TopazProductionActivationError("CreatorVault refused an unsafe production environment location.");
  }

  const existing = await readEnvironmentFile(environmentFilePath);
  const next = replaceEnvironmentValue(existing, TOPAZ_ENVIRONMENT_KEY, apiKey);
  const directory = dirname(environmentFilePath);
  const temporaryPath = join(directory, `.${basename(environmentFilePath)}.topaz-${process.pid}-${randomUUID()}.tmp`);

  try {
    await writeFile(temporaryPath, next, { encoding: "utf8", mode: 0o600 });
    await chmod(temporaryPath, 0o600);
    await rename(temporaryPath, environmentFilePath);
    await chmod(environmentFilePath, 0o600);
  } catch {
    try { await chmod(temporaryPath, 0o600); } catch { /* best-effort permission tightening only */ }
    throw new TopazProductionActivationError("CreatorVault could not securely update its protected production environment file.");
  }

  // Makes the newly configured credential available to the already-running Node process.
  process.env[TOPAZ_ENVIRONMENT_KEY] = apiKey;
  return getTopazProductionCredentialState();
}

export const __topazProductionActivationTesting = {
  replaceEnvironmentValue,
  validateTopazApiKey,
};
