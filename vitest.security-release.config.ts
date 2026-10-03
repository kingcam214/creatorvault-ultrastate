import { defineConfig } from "vitest/config";
import base from "./vitest.config";

export default defineConfig({
  ...base,
  test: {
    ...base.test,
    include: [
      "scripts/securityRelease.test.ts",
      "scripts/securityReleaseIntegrity.test.ts",
    ],
    setupFiles: [],
    globalSetup: [],
    environment: "node",
    testTimeout: 10000,
    fileParallelism: false,
    retry: 0,
    passWithNoTests: false,
  },
});
