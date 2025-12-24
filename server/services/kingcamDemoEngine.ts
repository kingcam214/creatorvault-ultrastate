/**
 * 🦁 KINGCAM DEMO ENGINE
 * 
 * Automated content pipeline: topic → script → voice → video
 * KINGCAM creates content. You do NOT.
 */

import { generateKingCamScript, type VideoScript } from "./kingcamScriptGenerator.js";
import { generateSpeech, KINGCAM_VOICE_PROFILE, KINGCAM_DOMINICAN_VOICE_PROFILE } from "../_core/tts.js";
import { createVideoJob, generateAllScenes } from "./videoStudio.js";
import { assembleVideo } from "./videoAssembly.js";
import { storagePut } from "../storage.js";
import { getDb } from "../db.js";
import { videoGenerationJobs } from "../../drizzle/schema.js";
import { eq } from "drizzle-orm";

export interface DemoGenerationOptions {
  topic: string;
  sector?: "dominican" | "adult" | "general";
  targetDuration?: number; // seconds
  userId: number;
}

export interface DemoResult {
  videoUrl: string;
  scriptText: string;
  audioUrl: string;
  duration: number;
  jobId: number;
}

/**
 * Generate complete demo video from topic
 * Full pipeline: topic → script → voice → video
 */
export async function generateKingCamDemo(
  options: DemoGenerationOptions
): Promise<DemoResult> {
  const {
    topic,
    sector = "general",
    targetDuration = 60,
    userId,
  } = options;

  console.log(`🦁 [KINGCAM DEMO ENGINE] Starting: ${topic}`);

  // Step 1: Generate script using RealGPT
  console.log("📝 Generating script with KingCam personality...");
  const script = await generateKingCamScript({
    topic,
    sector,
    targetDuration,
    sceneCount: 4,
  });

  // Step 2: Skip TTS (not available in Manus built-in services)
  // Video will have text overlays instead of audio narration
  console.log("📝 Skipping TTS - using text overlays...");
  const audioResult = {
    audioUrl: "",
    duration: 0,
    text: script.fullText,
  };

  // Step 3: Generate video scenes
  console.log("🎬 Generating video scenes...");
  const videoJobId = await createVideoJob({
    userId,
    prompt: `${topic}\n\nScript: ${script.fullText}`,
    duration: script.totalDuration,
    sceneCount: script.segments.length,
  });

  await generateAllScenes(videoJobId);

  // Step 4: Assemble final video (audio will be added in future enhancement)
  console.log("🎞️ Assembling final video...");
  const videoUrl = await assembleVideo({
    jobId: videoJobId,
    fps: 30,
  });

  // TODO: Add audio sync to videoAssembly.ts

  // Step 5: Update job with final video URL
  const db = await getDb();
  if (db) {
    await db
      .update(videoGenerationJobs)
      .set({
        videoUrl,
        status: "complete",
      })
      .where(eq(videoGenerationJobs.id, videoJobId));
  }

  console.log(`✅ [KINGCAM DEMO ENGINE] Complete: ${videoUrl}`);

  return {
    videoUrl,
    scriptText: script.fullText,
    audioUrl: audioResult.audioUrl,
    duration: script.totalDuration,
    jobId: videoJobId,
  };
}

/**
 * Generate Dominican sector demo
 */
export async function generateDominicanDemo(
  topic: string,
  userId: number
): Promise<DemoResult> {
  return generateKingCamDemo({
    topic,
    sector: "dominican",
    userId,
  });
}

/**
 * Generate Adult sector demo
 */
export async function generateAdultDemo(
  topic: string,
  userId: number
): Promise<DemoResult> {
  return generateKingCamDemo({
    topic,
    sector: "adult",
    userId,
  });
}

/**
 * Generate platform tour video
 */
export async function generatePlatformTour(
  featureName: string,
  userId: number
): Promise<DemoResult> {
  const topic = `CreatorVault ${featureName}: Complete walkthrough and tutorial`;
  
  return generateKingCamDemo({
    topic,
    sector: "general",
    targetDuration: 90,
    userId,
  });
}

/**
 * PREDEFINED DEMO TOPICS
 */
export const DEMO_TOPICS = {
  dominican: [
    "Cómo ganar dinero con CreatorVault en República Dominicana",
    "VaultLive: Streaming en vivo con 85% de ganancia para ti",
    "Conecta tus redes sociales y monetiza tu contenido",
  ],
  adult: [
    "VaultLive for Adult Creators: 85% revenue split explained",
    "Content control and monetization without platform censorship",
    "Building your subscriber base on CreatorVault",
  ],
  general: [
    "CreatorVault Platform Overview",
    "Multi-Platform Content Distribution",
    "Creator Analytics Dashboard",
  ],
};

/**
 * Batch generate demos for sector onboarding
 */
export async function generateSectorOnboardingDemos(
  sector: "dominican" | "adult",
  userId: number
): Promise<DemoResult[]> {
  const topics = DEMO_TOPICS[sector];
  const results: DemoResult[] = [];

  for (const topic of topics) {
    const result = await generateKingCamDemo({
      topic,
      sector,
      userId,
    });
    results.push(result);
  }

  return results;
}
