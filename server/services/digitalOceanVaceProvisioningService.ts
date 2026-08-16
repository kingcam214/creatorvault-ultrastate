const DIGITALOCEAN_TOKEN_ENVIRONMENT_KEY = "DIGITALOCEAN_VACE_AUTOMATION_TOKEN";
const DIGITALOCEAN_API_BASE = "https://api.digitalocean.com/v2";

export type DigitalOceanVaceGpuCandidate = {
  sizeSlug: string;
  regionSlugs: string[];
  gpuCount: number;
  gpuModel: string | null;
  memoryMiB: number;
  vcpus: number;
  diskGiB: number;
  hourlyUsd: number | null;
  monthlyUsd: number | null;
  available: boolean;
};

export type DigitalOceanVaceProvisioningReadiness = {
  configured: boolean;
  safeToProvision: boolean;
  recommendedImage: "gpu-h100x1-base";
  minimumGpuMemoryGiB: 48;
  candidates: DigitalOceanVaceGpuCandidate[];
  detail: string;
};

export class DigitalOceanVaceProvisioningError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DigitalOceanVaceProvisioningError";
  }
}

type DigitalOceanSizePayload = {
  slug?: string;
  memory?: number;
  vcpus?: number;
  disk?: number;
  regions?: string[];
  available?: boolean;
  price_hourly?: number | null;
  price_monthly?: number | null;
  gpu_info?: {
    count?: number;
    model?: string | null;
    vram?: { amount?: number; unit?: string | null };
  };
};

type DigitalOceanSizesResponse = { sizes?: DigitalOceanSizePayload[] };

function token(): string {
  const value = String(process.env[DIGITALOCEAN_TOKEN_ENVIRONMENT_KEY] || "").trim();
  if (!value) throw new DigitalOceanVaceProvisioningError("CreatorVault has no secured DigitalOcean VACE automation credential.");
  return value;
}

async function digitalOceanGet<T>(path: string): Promise<T> {
  const response = await fetch(`${DIGITALOCEAN_API_BASE}${path}`, {
    headers: {
      Authorization: `Bearer ${token()}`,
      Accept: "application/json",
    },
  });
  if (!response.ok) {
    throw new DigitalOceanVaceProvisioningError(`DigitalOcean GPU preflight failed before any machine was created (${response.status}).`);
  }
  return response.json() as Promise<T>;
}

export function selectVaceGpuCandidates(sizes: DigitalOceanSizePayload[]): DigitalOceanVaceGpuCandidate[] {
  return sizes
    .map((size) => {
      const gpuCount = Number(size.gpu_info?.count || 0);
      const vramAmount = Number(size.gpu_info?.vram?.amount || 0);
      const vramUnit = String(size.gpu_info?.vram?.unit || "").toLowerCase();
      const memoryMiB = vramUnit === "gib" ? vramAmount * 1024 : vramAmount;
      return {
        sizeSlug: String(size.slug || ""),
        regionSlugs: Array.isArray(size.regions) ? size.regions.filter(Boolean) : [],
        gpuCount,
        gpuModel: size.gpu_info?.model ? String(size.gpu_info.model) : null,
        memoryMiB,
        vcpus: Number(size.vcpus || 0),
        diskGiB: Number(size.disk || 0),
        hourlyUsd: typeof size.price_hourly === "number" ? size.price_hourly : null,
        monthlyUsd: typeof size.price_monthly === "number" ? size.price_monthly : null,
        available: Boolean(size.available),
      };
    })
    .filter((candidate) => candidate.sizeSlug.startsWith("gpu-") && candidate.gpuCount === 1 && candidate.memoryMiB >= 49_152 && candidate.available && candidate.regionSlugs.length > 0)
    .sort((left, right) => (left.hourlyUsd ?? Number.POSITIVE_INFINITY) - (right.hourlyUsd ?? Number.POSITIVE_INFINITY));
}

export async function getDigitalOceanVaceProvisioningReadiness(): Promise<DigitalOceanVaceProvisioningReadiness> {
  const payload = await digitalOceanGet<DigitalOceanSizesResponse>("/sizes?per_page=200");
  const candidates = selectVaceGpuCandidates(payload.sizes || []);
  return {
    configured: true,
    safeToProvision: candidates.length > 0,
    recommendedImage: "gpu-h100x1-base",
    minimumGpuMemoryGiB: 48,
    candidates,
    detail: candidates.length
      ? "DigitalOcean returned compatible single-GPU VACE candidates. No GPU machine has been created by this preflight."
      : "DigitalOcean returned no compatible single-GPU VACE capacity for this account at this moment.",
  };
}

export const __digitalOceanVaceProvisioningTesting = {
  selectVaceGpuCandidates,
};
