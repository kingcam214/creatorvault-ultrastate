import { defineConfig } from "vitest/config";
import path from "node:path";

if (!process.env.CREATORVAULT_PAYOUT_TEST_DATABASE_URL) {
  throw new Error("test:stripe-payouts requires CREATORVAULT_PAYOUT_TEST_DATABASE_URL pointing to the isolated local creatorvault_payout_test database; integration coverage must not silently skip");
}
const target = new URL(process.env.CREATORVAULT_PAYOUT_TEST_DATABASE_URL);
if (!['127.0.0.1', 'localhost'].includes(target.hostname) || target.pathname !== '/creatorvault_payout_test') {
  throw new Error('ISOLATED_PAYOUT_TEST_DATABASE_REQUIRED');
}

const root = path.resolve(import.meta.dirname);
export default defineConfig({
  root,
  resolve: {
    extensions: [".ts", ".tsx", ".mjs", ".js", ".mts", ".json"],
    alias: {
      "@": path.resolve(root, "client/src"),
      "@shared": path.resolve(root, "shared"),
      "@assets": path.resolve(root, "attached_assets"),
    },
  },
  test: {
    environment: "node",
    include: ["server/services/stripeCreatorPayouts*.test.ts", "server/services/stripeCommerceFulfillment.test.ts"],
    fileParallelism: false,
    testTimeout: 15_000,
    hookTimeout: 30_000,
  },
});
