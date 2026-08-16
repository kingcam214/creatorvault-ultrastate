import { randomBytes } from "crypto";
import { getDigitalOceanVaceAutomationState } from "./digitalOceanVaceAutomationService";
import { activateVaceWorkerConnection } from "./vaceWorkerConnectionService";

const DIGITALOCEAN_API_BASE = "https://api.digitalocean.com/v2";
const DIGITALOCEAN_TOKEN_ENVIRONMENT_KEY = "DIGITALOCEAN_VACE_AUTOMATION_TOKEN";
const H100_SIZE = "gpu-h100x1-80gb";
const H100_IMAGE = "gpu-h100x1-base";
const H100_REGION = "nyc2";
const MAX_RUNTIME_MINUTES = 240;

export type VaceWorkerProvisioningRecord = {
  dropletId: number;
  name: string;
  region: string;
  size: string;
  image: string;
  workerUrl: string;
  expiresAt: string;
  hourlyUsd: 4.41;
  state: "creating";
};

export class DigitalOceanVaceWorkerProvisionerError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DigitalOceanVaceWorkerProvisionerError";
  }
}

type DigitalOceanDroplet = {
  id?: number;
  name?: string;
  status?: string;
  networks?: { v4?: Array<{ ip_address?: string; type?: string }> };
};

function token(): string {
  const value = String(process.env[DIGITALOCEAN_TOKEN_ENVIRONMENT_KEY] || "").trim();
  if (!value) throw new DigitalOceanVaceWorkerProvisionerError("CreatorVault has no secured DigitalOcean VACE automation credential.");
  return value;
}

async function digitalOceanRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${DIGITALOCEAN_API_BASE}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token()}`,
      Accept: "application/json",
      "Content-Type": "application/json",
      ...(init?.headers || {}),
    },
  });
  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new DigitalOceanVaceWorkerProvisionerError(`DigitalOcean VACE worker request failed before CreatorVault could claim a GPU (${response.status}${body ? `: ${body.slice(0, 240)}` : ""}).`);
  }
  return response.json() as Promise<T>;
}

function workerToken(): string {
  return randomBytes(36).toString("base64url");
}

function workerCloudInit(input: { workerToken: string }): string {
  const token = input.workerToken;
  return `#cloud-config
package_update: true
packages:
  - git
  - docker.io
runcmd:
  - systemctl enable --now docker
  - mkdir -p /opt/creatorvault-vace/models
  - git clone --depth 1 https://github.com/kingcam214/creatorvault-ultrastate.git /opt/creatorvault-vace/source
  - cd /opt/creatorvault-vace/source/workers/vace && docker build -t creatorvault-vace:current .
  - docker run --rm --gpus all -v /opt/creatorvault-vace/models:/models creatorvault-vace:current python3.10 -c "from huggingface_hub import snapshot_download; snapshot_download(repo_id='Wan-AI/Wan2.1-VACE-14B', local_dir='/models/Wan2.1-VACE-14B')"
  - docker run -d --name creatorvault-vace --restart unless-stopped --gpus all -p 127.0.0.1:8080:8080 -v /opt/creatorvault-vace/models:/models -e CREATORVAULT_VACE_WORKER_TOKEN='${token}' creatorvault-vace:current
  - PUBLIC_IP=$(curl -fsSL http://169.254.169.254/metadata/v1/interfaces/public/0/ipv4/address)
  - printf '%s.\\sslip.io { reverse_proxy 127.0.0.1:8080 }\\n' "$PUBLIC_IP" > /opt/creatorvault-vace/Caddyfile
  - docker run -d --name creatorvault-vace-gateway --restart unless-stopped --network host -v /opt/creatorvault-vace/Caddyfile:/etc/caddy/Caddyfile:ro caddy:2
  - shutdown -h +235
`;
}

function workerUrlForPublicIp(publicIp: string): string {
  if (!/^\d{1,3}(?:\.\d{1,3}){3}$/.test(publicIp)) {
    throw new DigitalOceanVaceWorkerProvisionerError("DigitalOcean did not return a usable public address for the VACE worker.");
  }
  return `https://${publicIp}.sslip.io`;
}

export async function provisionApprovedH100VaceWorker(): Promise<VaceWorkerProvisioningRecord> {
  if (!getDigitalOceanVaceAutomationState().configured) {
    throw new DigitalOceanVaceWorkerProvisionerError("CreatorVault refused GPU provisioning because its DigitalOcean automation credential is not configured.");
  }

  const tokenValue = workerToken();
  const name = `creatorvault-vace-h100-${Date.now()}`;
  const result = await digitalOceanRequest<{ droplet?: DigitalOceanDroplet }>("/droplets", {
    method: "POST",
    body: JSON.stringify({
      name,
      region: H100_REGION,
      size: H100_SIZE,
      image: H100_IMAGE,
      ipv6: false,
      monitoring: true,
      backups: false,
      user_data: workerCloudInit({ workerToken: tokenValue }),
    }),
  });

  const dropletId = Number(result.droplet?.id || 0);
  if (!Number.isInteger(dropletId) || dropletId <= 0) {
    throw new DigitalOceanVaceWorkerProvisionerError("DigitalOcean accepted no identifiable VACE GPU worker. CreatorVault has not connected a worker.");
  }

  const publicIp = result.droplet?.networks?.v4?.find((network) => network.type === "public")?.ip_address;
  const workerUrl = publicIp ? workerUrlForPublicIp(publicIp) : "";
  if (workerUrl) {
    await activateVaceWorkerConnection({ workerUrl, workerToken: tokenValue });
  }

  return {
    dropletId,
    name,
    region: H100_REGION,
    size: H100_SIZE,
    image: H100_IMAGE,
    workerUrl: workerUrl || "pending-public-ip",
    expiresAt: new Date(Date.now() + MAX_RUNTIME_MINUTES * 60_000).toISOString(),
    hourlyUsd: 4.41,
    state: "creating",
  };
}

export const __digitalOceanVaceWorkerProvisionerTesting = {
  workerCloudInit,
  workerUrlForPublicIp,
};
