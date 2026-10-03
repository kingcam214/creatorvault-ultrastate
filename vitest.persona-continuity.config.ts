import { defineConfig } from "vitest/config";
import base from "./vitest.config";

const databaseUrl = process.env.CREATORVAULT_PERSONA_TEST_DATABASE_URL;
if (!databaseUrl)
  throw new Error(
    "CREATORVAULT_PERSONA_TEST_DATABASE_URL is required; Persona Continuity integration proof must not be silently skipped"
  );
const target = new URL(databaseUrl);
if (
  !["127.0.0.1", "localhost"].includes(target.hostname) ||
  target.pathname !== "/creatorvault_persona_test"
)
  throw new Error(
    "Persona Continuity proof requires the isolated local creatorvault_persona_test database"
  );
export default defineConfig({
  ...base,
  test: {
    ...base.test,
    include: ["server/services/videoChainedContinuity.test.ts"],
    fileParallelism: false,
    testTimeout: 30000,
    hookTimeout: 60000,
    env: { DATABASE_URL: databaseUrl, TZ: "UTC" },
  },
});
