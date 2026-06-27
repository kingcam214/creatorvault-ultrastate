/**
 * Server Startup Tasks
 *
 * Runs once when server starts.
 */

import { bootstrapSchema } from "../db/bootstrap";
import { runChallengeRevenueIntegrityCheck } from "../challengeRevenueIntegrity";

export async function runStartupTasks() {
  console.log("[Startup] Running startup tasks...");

  try {
    await bootstrapSchema();
  } catch (error: any) {
    console.error("[Startup] Bootstrap failed:", error.message);
  }

  // Self-healing: wipe any non-Stripe challenge transactions and reset the
  // counter to the real verified sum. Becomes a no-op once the DB is clean.
  try {
    await runChallengeRevenueIntegrityCheck();
  } catch (error: any) {
    console.error("[Startup] Challenge revenue integrity check failed:", error.message);
  }

  console.log("[Startup] Startup tasks complete");
}
