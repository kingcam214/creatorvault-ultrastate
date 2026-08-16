import { describe, expect, it } from "vitest";
import { __digitalOceanVaceProvisioningTesting } from "./digitalOceanVaceProvisioningService";

describe("DigitalOcean VACE GPU preflight", () => {
  it("selects only available single-GPU plans with at least 48GB GPU memory and a region", () => {
    const candidates = __digitalOceanVaceProvisioningTesting.selectVaceGpuCandidates([
      { slug: "gpu-l40s-1", available: true, regions: ["nyc2"], gpus: { count: 1, model: "L40S", memory: 49152 }, vcpus: 8, disk: 150, price_hourly: 1.2 },
      { slug: "gpu-small", available: true, regions: ["nyc2"], gpus: { count: 1, model: "L4", memory: 24576 }, vcpus: 4, disk: 100, price_hourly: 0.6 },
      { slug: "gpu-h100-8", available: true, regions: ["nyc2"], gpus: { count: 8, model: "H100", memory: 81920 }, vcpus: 64, disk: 1000, price_hourly: 30 },
      { slug: "gpu-l40s-unavailable", available: false, regions: ["nyc2"], gpus: { count: 1, model: "L40S", memory: 49152 }, vcpus: 8, disk: 150, price_hourly: 1.2 },
      { slug: "s-2vcpu-4gb", available: true, regions: ["nyc2"], vcpus: 2, disk: 80, price_hourly: 0.03 },
    ]);

    expect(candidates).toHaveLength(1);
    expect(candidates[0]).toMatchObject({ sizeSlug: "gpu-l40s-1", gpuCount: 1, gpuModel: "L40S", memoryMiB: 49152, hourlyUsd: 1.2 });
  });
});
