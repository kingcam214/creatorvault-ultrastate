import { chmod, readFile, rename, writeFile } from "fs/promises";
import { basename, dirname, join } from "path";
import { randomUUID } from "crypto";

const DIGITALOCEAN_VACE_TOKEN_ENVIRONMENT_KEY = "DIGITALOCEAN_VACE_AUTOMATION_TOKEN";
const DEFAULT_RUNTIME_ENV_PATH = "/root/creatorvault/.env";
const SAFE_TOKEN_PATTERN = /^[A-Za-z0-9._~-]{32,512}$/;

export type DigitalOceanVaceAutomationState = {
  configured: boolean;
  credentialLocation: "vps_runtime_env";
  providerKey: "digitalocean_vace_gpu";
};

export class DigitalOceanVaceAutomationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DigitalOceanVaceAutomationError";
  }
}

function runtimeEnvironmentPath(): string {
  const configured = String(process.env.CREATORVAULT_RUNTIME_ENV_FILE || "").trim();
  return configured || DEFAULT_RUNTIME_ENV_PATH;
}

function validateToken(value: string): string {
  const token = String(value || "").trim();
  if (!SAFE_TOKEN_PATTERN.test(token)) {
    throw new DigitalOceanVaceAutomationError("CreatorVault refused an invalid DigitalOcean automation credential.");
  }
  return token;
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
    throw new DigitalOceanVaceAutomationError("CreatorVault could not read its protected production environment file.");
  }
}

export function getDigitalOceanVaceAutomationState(): DigitalOceanVaceAutomationState {
  return {
    configured: SAFE_TOKEN_PATTERN.test(String(process.env[DIGITALOCEAN_VACE_TOKEN_ENVIRONMENT_KEY] || "").trim()),
    credentialLocation: "vps_runtime_env",
    providerKey: "digitalocean_vace_gpu",
  };
}

/**
 * Writes only the existing VPS-local runtime .env file. This service never logs
 * or returns the token and must be invoked only by CreatorVault's owner-gated
 * governed media router.
 */
export async function activateDigitalOceanVaceAutomation(input: {
  token: string;
  environmentFilePath?: string;
}): Promise<DigitalOceanVaceAutomationState> {
  const token = validateToken(input.token);
  const environmentFilePath = String(input.environmentFilePath || runtimeEnvironmentPath()).trim();
  if (!environmentFilePath || !environmentFilePath.startsWith("/root/creatorvault/")) {
    throw new DigitalOceanVaceAutomationError("CreatorVault refused an unsafe production environment location.");
  }

  const existing = await readEnvironmentFile(environmentFilePath);
  const next = replaceEnvironmentValue(existing, DIGITALOCEAN_VACE_TOKEN_ENVIRONMENT_KEY, token);
  const directory = dirname(environmentFilePath);
  const temporaryPath = join(directory, `.${basename(environmentFilePath)}.digitalocean-vace-${process.pid}-${randomUUID()}.tmp`);

  try {
    await writeFile(temporaryPath, next, { encoding: "utf8", mode: 0o600 });
    await chmod(temporaryPath, 0o600);
    await rename(temporaryPath, environmentFilePath);
    await chmod(environmentFilePath, 0o600);
  } catch {
    try { await chmod(temporaryPath, 0o600); } catch { /* permission tightening is best-effort */ }
    throw new DigitalOceanVaceAutomationError("CreatorVault could not securely update its protected production environment file.");
  }

  process.env[DIGITALOCEAN_VACE_TOKEN_ENVIRONMENT_KEY] = token;
  return getDigitalOceanVaceAutomationState();
}

export const __digitalOceanVaceAutomationTesting = {
  replaceEnvironmentValue,
  validateToken,
};
