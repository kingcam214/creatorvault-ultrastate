import { randomBytes } from "crypto";
import { getDigitalOceanVaceAutomationState } from "./digitalOceanVaceAutomationService";
import { activateKingcamPerformerWorkerConnection } from "./kingcamPerformerWorkerConnectionService";

const DIGITALOCEAN_API_BASE = "https://api.digitalocean.com/v2";
const DIGITALOCEAN_TOKEN_ENVIRONMENT_KEY = "DIGITALOCEAN_VACE_AUTOMATION_TOKEN";
const H200_SIZE = "gpu-h200x1-141gb";
const NVIDIA_SINGLE_GPU_IMAGE = "gpu-h100x1-base";
const H200_REGION = "atl1";
const MAX_RUNTIME_MINUTES = 240;

export type KingcamPerformerWorkerProvisioningRecord = {
  dropletId: number;
  name: string;
  region: string;
  size: string;
  image: string;
  workerUrl: string;
  expiresAt: string;
  hourlyUsd: 4.47;
  state: "creating";
};

export class DigitalOceanKingcamPerformerWorkerError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DigitalOceanKingcamPerformerWorkerError";
  }
}

type DigitalOceanDroplet = {
  id?: number;
  name?: string;
  networks?: { v4?: Array<{ ip_address?: string; type?: string }> };
};
type DigitalOceanSshKey = { id?: number };

function token(): string {
  const value = String(process.env[DIGITALOCEAN_TOKEN_ENVIRONMENT_KEY] || "").trim();
  if (!value) throw new DigitalOceanKingcamPerformerWorkerError("CreatorVault has no secured DigitalOcean automation credential.");
  return value;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${DIGITALOCEAN_API_BASE}${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${token()}`, Accept: "application/json", "Content-Type": "application/json", ...(init?.headers || {}) },
  });
  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new DigitalOceanKingcamPerformerWorkerError(`DigitalOcean KingCam performer request failed before a usable worker was available (${response.status}${body ? `: ${body.slice(0, 240)}` : ""}).`);
  }
  return response.json() as Promise<T>;
}

function workerToken(): string {
  return randomBytes(36).toString("base64url");
}

async function existingSshKeyId(): Promise<number> {
  const result = await request<{ ssh_keys?: DigitalOceanSshKey[] }>("/account/keys?per_page=200");
  const id = Number((result.ssh_keys || []).find((key) => Number.isInteger(Number(key.id)) && Number(key.id) > 0)?.id || 0);
  if (!id) throw new DigitalOceanKingcamPerformerWorkerError("DigitalOcean has no existing SSH key for the approved KingCam performer worker image.");
  return id;
}

function workerUrlForPublicIp(publicIp: string): string {
  if (!/^\d{1,3}(?:\.\d{1,3}){3}$/.test(publicIp)) throw new DigitalOceanKingcamPerformerWorkerError("DigitalOcean did not return a usable KingCam performer worker address.");
  return `https://${publicIp}.sslip.io`;
}

function publicIp(droplet: DigitalOceanDroplet | undefined): string | null {
  return droplet?.networks?.v4?.find((network) => network.type === "public")?.ip_address || null;
}

async function waitForPublicIp(dropletId: number): Promise<string> {
  for (let attempt = 0; attempt < 24; attempt += 1) {
    const result = await request<{ droplet?: DigitalOceanDroplet }>(`/droplets/${dropletId}`);
    const address = publicIp(result.droplet);
    if (address) return address;
    await new Promise((resolve) => setTimeout(resolve, 5_000));
  }
  throw new DigitalOceanKingcamPerformerWorkerError("DigitalOcean created the KingCam performer worker but did not publish a usable public address in time.");
}

function workerCloudInit(input: { workerToken: string }): string {
  return `#cloud-config
package_update: true
packages:
  - git
  - docker.io
runcmd:
  - systemctl enable --now docker
  - mkdir -p /opt/creatorvault-kingcam-performer/models
  - git clone --depth 1 https://github.com/kingcam214/creatorvault-ultrastate.git /opt/creatorvault-kingcam-performer/source
  - cd /opt/creatorvault-kingcam-performer/source && docker build -t creatorvault-kingcam-performer:current workers/kingcam-performer
  - docker run --rm --gpus all -v /opt/creatorvault-kingcam-performer/models:/models creatorvault-kingcam-performer:current python3.11 -c "from huggingface_hub import snapshot_download; snapshot_download(repo_id='Wan-AI/Wan2.2-Animate-2-14B', local_dir='/models/Wan-AI/Wan2.2-Animate-2-14B')"
  - docker run --rm --gpus all -v /opt/creatorvault-kingcam-performer/models:/models creatorvault-kingcam-performer:current bash -lc 'cd /models/MuseTalk && /opt/MuseTalk/download_weights.sh'
  - docker run -d --name creatorvault-kingcam-performer --restart unless-stopped --gpus all -p 127.0.0.1:8080:8080 -v /opt/creatorvault-kingcam-performer/models:/models -e CREATORVAULT_KINGCAM_PERFORMER_WORKER_TOKEN='${input.workerToken}' creatorvault-kingcam-performer:current
  - PUBLIC_IP=$(curl -fsSL http://169.254.169.254/metadata/v1/interfaces/public/0/ipv4/address)
  - printf '%s.\\sslip.io { reverse_proxy 127.0.0.1:8080 }\\n' "$PUBLIC_IP" > /opt/creatorvault-kingcam-performer/Caddyfile
  - docker run -d --name creatorvault-kingcam-performer-gateway --restart unless-stopped --network host -v /opt/creatorvault-kingcam-performer/Caddyfile:/etc/caddy/Caddyfile:ro caddy:2
  - shutdown -h +235
`;
}

export async function provisionApprovedKingcamPerformerH200Worker(): Promise<KingcamPerformerWorkerProvisioningRecord> {
  if (!getDigitalOceanVaceAutomationState().configured) {
    throw new DigitalOceanKingcamPerformerWorkerError("CreatorVault refused KingCam performer GPU provisioning because its DigitalOcean automation credential is not configured.");
  }
  const tokenValue = workerToken();
  const sshKeyId = await existingSshKeyId();
  const name = `creatorvault-kingcam-performer-h200-${Date.now()}`;
  const result = await request<{ droplet?: DigitalOceanDroplet }>("/droplets", {
    method: "POST",
    body: JSON.stringify({
      name,
      region: H200_REGION,
      size: H200_SIZE,
      image: NVIDIA_SINGLE_GPU_IMAGE,
      ipv6: false,
      monitoring: true,
      backups: false,
      ssh_keys: [sshKeyId],
      tags: ["creatorvault", "kingcam-full-body-performer", "ephemeral"],
      user_data: workerCloudInit({ workerToken: tokenValue }),
    }),
  });
  const dropletId = Number(result.droplet?.id || 0);
  if (!Number.isInteger(dropletId) || dropletId <= 0) throw new DigitalOceanKingcamPerformerWorkerError("DigitalOcean accepted no identifiable KingCam performer GPU worker.");
  const workerUrl = workerUrlForPublicIp(publicIp(result.droplet) || await waitForPublicIp(dropletId));
  await activateKingcamPerformerWorkerConnection({ workerUrl, workerToken: tokenValue });
  return { dropletId, name, region: H200_REGION, size: H200_SIZE, image: NVIDIA_SINGLE_GPU_IMAGE, workerUrl, expiresAt: new Date(Date.now() + MAX_RUNTIME_MINUTES * 60_000).toISOString(), hourlyUsd: 4.47, state: "creating" };
}

export async function destroyKingcamPerformerWorker(dropletId: number): Promise<{ destroyed: boolean; dropletId: number }> {
  const id = Number(dropletId);
  if (!Number.isInteger(id) || id <= 0) throw new DigitalOceanKingcamPerformerWorkerError("CreatorVault refused an invalid KingCam performer worker ID.");
  const response = await fetch(`${DIGITALOCEAN_API_BASE}/droplets/${id}`, { method: "DELETE", headers: { Authorization: `Bearer ${token()}`, Accept: "application/json" } });
  if (!response.ok && response.status !== 404) {
    const body = await response.text().catch(() => "");
    throw new DigitalOceanKingcamPerformerWorkerError(`DigitalOcean refused KingCam performer worker shutdown (${response.status}${body ? `: ${body.slice(0, 240)}` : ""}).`);
  }
  return { destroyed: true, dropletId: id };
}
