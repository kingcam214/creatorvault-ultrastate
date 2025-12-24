/**
 * Generate First Dominican Demo
 * 
 * Topic: "Cómo ganar dinero con CreatorVault"
 */

import { generateDominicanDemo } from "./server/services/kingcamDemoEngine.js";

async function main() {
  console.log("🦁 Generating first Dominican demo...");
  console.log("Topic: Cómo ganar dinero con CreatorVault");
  console.log("");

  try {
    const result = await generateDominicanDemo(
      "Cómo ganar dinero con CreatorVault",
      1 // King user ID
    );

    console.log("✅ DOMINICAN DEMO GENERATED");
    console.log("");
    console.log("Job ID:", result.jobId);
    console.log("Script Preview:", result.scriptText.substring(0, 200) + "...");
    console.log("Audio URL:", result.audioUrl);
    console.log("Video URL:", result.videoUrl || "Processing...");
    console.log("");
    console.log("Sector: Dominican 🇩🇴");
    console.log("Language: Dominican Spanish");
    console.log("Voice: KINGCAM_DOMINICAN_VOICE_PROFILE");
    console.log("Personality: RealGPT (Lion Logic, Real Talk)");
  } catch (error) {
    console.error("❌ GENERATION FAILED");
    console.error(error);
    process.exit(1);
  }
}

main();
