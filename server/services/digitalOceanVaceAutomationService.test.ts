import { describe, expect, it } from "vitest";
import {
  DigitalOceanVaceAutomationError,
  __digitalOceanVaceAutomationTesting,
} from "./digitalOceanVaceAutomationService";

describe("DigitalOcean VACE automation credential guard", () => {
  it("replaces only the VACE automation token assignment while preserving unrelated runtime settings", () => {
    const next = __digitalOceanVaceAutomationTesting.replaceEnvironmentValue(
      "NODE_ENV=production\nDIGITALOCEAN_VACE_AUTOMATION_TOKEN=old-token\nTOPAZ_API_KEY=kept\n",
      "DIGITALOCEAN_VACE_AUTOMATION_TOKEN",
      "dop_v1_abcdefghijklmnopqrstuvwxyz0123456789ABCD",
    );

    expect(next).toContain("NODE_ENV=production");
    expect(next).toContain("TOPAZ_API_KEY=kept");
    expect(next).toContain("DIGITALOCEAN_VACE_AUTOMATION_TOKEN=dop_v1_abcdefghijklmnopqrstuvwxyz0123456789ABCD");
    expect(next).not.toContain("DIGITALOCEAN_VACE_AUTOMATION_TOKEN=old-token");
  });

  it("rejects malformed credentials before any protected environment file can be touched", () => {
    expect(() => __digitalOceanVaceAutomationTesting.validateToken("contains whitespace"))
      .toThrow(DigitalOceanVaceAutomationError);
  });
});
