import { defineConfig } from "vitest/config";
import base from "./vitest.config";

const databaseUrl = process.env.CREATORVAULT_MIGRATION_TEST_DATABASE_URL;
if (!databaseUrl) throw new Error("ISOLATED_MIGRATION_TEST_DATABASE_REQUIRED");
const target = new URL(databaseUrl);
if (
  !["localhost", "127.0.0.1"].includes(target.hostname) ||
  target.pathname !== "/creatorvault_consolidation_migration_test"
)
  throw new Error("ISOLATED_MIGRATION_TEST_DATABASE_REQUIRED");

export default defineConfig({
  ...base,
  test: {
    ...base.test,
    include: [
      "scripts/consolidatedRelease.test.ts",
      "scripts/consolidatedMigrations.test.ts",
    ],
    fileParallelism: false,
    testTimeout: 30000,
    hookTimeout: 60000,
    env: { TZ: "UTC" },
  },
});
