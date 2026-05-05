/**
 * CreatorVault QA — Playwright Configuration
 */
import { defineConfig, devices } from "@playwright/test";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  testDir: "./layer2-browser",
  outputDir: "./artifacts/traces",
  timeout: 30000,
  retries: 1,
  workers: 2,
  reporter: [
    ["list"],
    ["html", { outputFolder: "./artifacts/reports/playwright-html", open: "never" }],
    ["json", { outputFile: "./artifacts/reports/playwright-results.json" }],
  ],
  use: {
    baseURL: process.env.CV_BASE_URL || "https://creatorvault.live",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
    trace: "on-first-retry",
    storageState: "./artifacts/auth-state.json",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
