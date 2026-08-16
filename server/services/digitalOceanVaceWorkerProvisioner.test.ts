import { describe, expect, it } from "vitest";
import { __digitalOceanVaceWorkerProvisionerTesting } from "./digitalOceanVaceWorkerProvisioner";

describe("DigitalOcean VACE H100 provisioner", () => {
  it("creates a bootstrap that pulls the official model, starts the guarded worker, and hard-stops before the approved spend window", () => {
    const cloudInit = __digitalOceanVaceWorkerProvisionerTesting.workerCloudInit({ workerToken: "a".repeat(48) });
    expect(cloudInit).toContain("Wan-AI/Wan2.1-VACE-14B");
    expect(cloudInit).toContain("CREATORVAULT_VACE_WORKER_TOKEN");
    expect(cloudInit).toContain("creatorvault-vace:current");
    expect(cloudInit).toContain("shutdown -h +235");
    expect(cloudInit).toContain("sslip.io");
    expect(cloudInit).not.toContain("Damncam82");
  });

  it("accepts only a valid public IPv4 address for the secured worker URL", () => {
    expect(__digitalOceanVaceWorkerProvisionerTesting.workerUrlForPublicIp("203.0.113.41")).toBe("https://203.0.113.41.sslip.io");
    expect(() => __digitalOceanVaceWorkerProvisionerTesting.workerUrlForPublicIp("not-an-ip")).toThrow("usable public address");
  });

  it("requires a real existing account SSH key for the NVIDIA-ready image", () => {
    expect(__digitalOceanVaceWorkerProvisionerTesting.selectExistingSshKeyId([{ id: 481516 }])).toBe(481516);
    expect(() => __digitalOceanVaceWorkerProvisionerTesting.selectExistingSshKeyId([])).toThrow("no existing SSH key");
  });
});
