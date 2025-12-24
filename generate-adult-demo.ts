/**
 * Generate First Adult Demo
 * 
 * Topic: "How creators actually keep 85% with CreatorVault"
 */

import { generateAdultDemo } from "./server/services/kingcamDemoEngine.js";

async function main() {
  console.log("🦁 Generating first Adult demo...");
  console.log("Topic: How creators actually keep 85% with CreatorVault");
  console.log("");

  try {
    const result = await generateAdultDemo(
      "How creators actually keep 85% with CreatorVault",
      1 // King user ID
    );

    console.log("✅ ADULT DEMO GENERATED");
    console.log("");
    console.log("Job ID:", result.jobId);
    console.log("Script Preview:", result.scriptText.substring(0, 200) + "...");
    console.log("Audio URL:", result.audioUrl || "N/A");
    console.log("Video URL:", result.videoUrl);
    console.log("");
    console.log("Sector: Adult 🔞");
    console.log("Language: English");
    console.log("Personality: RealGPT (KingCam mode - confident, dominant)");
  } catch (error) {
    console.error("❌ GENERATION FAILED");
    console.error(error);
    process.exit(1);
  }
}

main();
