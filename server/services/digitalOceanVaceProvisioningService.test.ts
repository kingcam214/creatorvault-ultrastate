import { describe, expect, it } from "vitest";
import { __digitalOceanVaceProvisioningTesting } from "./digitalOceanVaceProvisioningService";

describe("DigitalOcean VACE GPU preflight", () => {
  it("selects only available single-GPU plans with at least 48GB GPU memory and a region", () => {
    const candidates = __digitalOceanVaceProvisioningTesting.selectVaceGpuCandidates([
      { slug: "gpu-l40s-1", available: true, regions: ["nyc2"], gpu_info: { count: 1, model: "nvidia_l40s", vram: { amount: 48, unit: "gib" } }, vcpus: 8, disk: 150, price_hourly: 1.2 },
      { slug: "gpu-small", available: true, regions: ["nyc2"], gpu_info: { count: 1, model: "nvidia_l4", vram: { amount: 24, unit: "gib" } }, vcpus: 4, disk: 100, price_hourly: 0.6 },
      { slug: "gpu-h100-8", available: true, regions: ["nyc2"], gpu_info: { count: 8, model: "nvidia_h100", vram: { amount: 80, unit: "gib" } }, vcpus: 64, disk: 1000, price_hourly: 30 },
      { slug: "gpu-l40s-unavailable", available: false, regions: ["nyc2"], gpu_info: { count: 1, model: "nvidia_l40s", vram: { amount: 48, unit: "gib" } }, vcpus: 8, disk: 150, price_hourly: 1.2 },
      { slug: "s-2vcpu-4gb", available: true, regions: ["nyc2"], vcpus: 2, disk: 80, price_hourly: 0.03 },
    ]);

    expect(candidates).toHaveLength(1);
    expect(candidates[0]).toMatchObject({ sizeSlug: "gpu-l40s-1", gpuCount: 1, gpuModel: "nvidia_l40s", memoryMiB: 49152, hourlyUsd: 1.2 });
  });
});
