import { defineConfig } from "vitest/config";
import base from "./vitest.config";

export default defineConfig({
  ...base,
  test: {
    ...base.test,
    include: [
      "server/_core/authorization.security.test.ts",
      "server/_core/authenticationRoutes.security.test.ts",
      "server/_core/resourceAuthorization.security.test.ts",
      "server/typescriptReleaseGate.test.ts",
    ],
    testTimeout: 10000,
  },
});
