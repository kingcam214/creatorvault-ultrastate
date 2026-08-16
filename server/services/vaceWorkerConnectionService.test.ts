import { describe, expect, it } from "vitest";
import {
  VaceWorkerConnectionError,
  __vaceWorkerConnectionTesting,
} from "./vaceWorkerConnectionService";

describe("VACE worker connection guard", () => {
  it("replaces only the two VACE connection assignments while retaining unrelated runtime settings", () => {
    const next = __vaceWorkerConnectionTesting.replaceEnvironmentValues(
      "NODE_ENV=production\nCREATORVAULT_VACE_WORKER_URL=https://old.example\nCREATORVAULT_VACE_WORKER_TOKEN=old-token-value-that-is-long-enough\nPOLLO_API_KEY=kept\n",
      {
        CREATORVAULT_VACE_WORKER_URL: "https://vace.example.com",
        CREATORVAULT_VACE_WORKER_TOKEN: "a".repeat(40),
      },
    );

    expect(next).toContain("NODE_ENV=production");
    expect(next).toContain("POLLO_API_KEY=kept");
    expect(next).toContain("CREATORVAULT_VACE_WORKER_URL=https://vace.example.com");
    expect(next).toContain(`CREATORVAULT_VACE_WORKER_TOKEN=${"a".repeat(40)}`);
    expect(next).not.toContain("https://old.example");
  });

  it("rejects a non-HTTPS endpoint and malformed worker token before touching the environment", () => {
    expect(() => __vaceWorkerConnectionTesting.validateWorkerUrl("http://worker.example.com"))
      .toThrow(VaceWorkerConnectionError);
    expect(() => __vaceWorkerConnectionTesting.validateWorkerToken("too-short"))
      .toThrow(VaceWorkerConnectionError);
  });
});
