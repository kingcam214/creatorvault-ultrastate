/**
 * Server Startup Tasks
 * 
 * Runs once when server starts
 */

import { bootstrapSchema } from "../db/bootstrap";

export async function runStartupTasks() {
  console.log("[Startup] Running startup tasks...");
  
  try {
    await bootstrapSchema();
  } catch (error: any) {
    console.error("[Startup] Bootstrap failed:", error.message);
  }
  
  console.log("[Startup] Startup tasks complete");
}
