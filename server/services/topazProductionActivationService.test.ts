import { describe, expect, it } from "vitest";
import {
  TopazProductionActivationError,
  __topazProductionActivationTesting,
} from "./topazProductionActivationService";

describe("Topaz production credential activation guard", () => {
  it("replaces only the Topaz environment assignment while preserving other runtime settings", () => {
    const next = __topazProductionActivationTesting.replaceEnvironmentValue(
      "NODE_ENV=production\nTOPAZ_API_KEY=old-value\nPOLLO_API_KEY=kept\n",
      "TOPAZ_API_KEY",
      "00000000-0000-4000-8000-000000000000",
    );

    expect(next).toContain("NODE_ENV=production");
    expect(next).toContain("POLLO_API_KEY=kept");
    expect(next).toContain("TOPAZ_API_KEY=00000000-0000-4000-8000-000000000000");
    expect(next).not.toContain("TOPAZ_API_KEY=old-value");
  });

  it("rejects a malformed credential before any environment file can be touched", () => {
    expect(() => __topazProductionActivationTesting.validateTopazApiKey("not-a-topaz-key"))
      .toThrow(TopazProductionActivationError);
  });
});
