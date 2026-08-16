import { getVaceWorkerConnectionState } from "./vaceWorkerConnectionService";

export type VaceWorkerHealth = {
  configured: boolean;
  reachable: boolean;
  workerReady: boolean;
  gpuAvailable: boolean;
  modelReady: boolean;
  detail: string;
};

function configuredUrl(): string {
  const value = String(process.env.CREATORVAULT_VACE_WORKER_URL || "").trim().replace(/\/$/, "");
  if (!value) throw new Error("CreatorVault VACE worker is not configured.");
  return value;
}

function configuredToken(): string {
  const value = String(process.env.CREATORVAULT_VACE_WORKER_TOKEN || "").trim();
  if (!value) throw new Error("CreatorVault VACE worker is not configured.");
  return value;
}

/** Read-only health probe. It never submits a VACE job or spends provider capacity. */
export async function probeVaceWorkerHealth(): Promise<VaceWorkerHealth> {
  const connection = getVaceWorkerConnectionState();
  if (!connection.configured) {
    return {
      configured: false,
      reachable: false,
      workerReady: false,
      gpuAvailable: false,
      modelReady: false,
      detail: "No approved VACE worker connection is configured.",
    };
  }

  try {
    const response = await fetch(`${configuredUrl()}/health`, {
      headers: { "x-creatorvault-worker-token": configuredToken() },
      signal: AbortSignal.timeout(15_000),
    });
    if (!response.ok) throw new Error(`VACE worker health probe returned ${response.status}.`);
    const payload = await response.json() as {
      protocolVersion?: string;
      modelKey?: string;
      state?: string;
      gpu?: { available?: boolean; detail?: string };
      modelReady?: boolean;
    };
    const gpuAvailable = payload.gpu?.available === true;
    const modelReady = payload.modelReady === true;
    const workerReady = payload.protocolVersion === "creatorvault-vace-worker/v1"
      && payload.modelKey === "wan/wan2.1-vace-14b-masked-video-edit"
      && payload.state === "ready"
      && gpuAvailable
      && modelReady;
    return {
      configured: true,
      reachable: true,
      workerReady,
      gpuAvailable,
      modelReady,
      detail: workerReady ? "Approved VACE GPU worker is ready." : String(payload.gpu?.detail || "VACE worker is not ready."),
    };
  } catch (error) {
    return {
      configured: true,
      reachable: false,
      workerReady: false,
      gpuAvailable: false,
      modelReady: false,
      detail: error instanceof Error ? error.message : "VACE worker health probe failed.",
    };
  }
}
