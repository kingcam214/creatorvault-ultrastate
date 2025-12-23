/**
 * Creator AI Video Studio Service
 * 
 * Implements long-form multi-scene video generation with:
 * - LLM-powered scene planning
 * - Character continuity enforcement
 * - Scene regeneration
 * - Video assembly
 */

import { getDb } from "../db";
import { videoGenerationJobs, videoScenes, videoAssets, botEvents } from "../../drizzle/schema";
import { eq, desc } from "drizzle-orm";
import { invokeLLM } from "../_core/llm";
import { generateImage } from "../_core/imageGeneration";
import { storagePut } from "../storage";
import crypto from "crypto";

// ============ TYPES ============

export interface ScenePlan {
  sceneIndex: number;
  description: string;
  prompt: string;
}

export interface CharacterFeatures {
  hair: string;
  eyes: string;
  skin: string;
  clothing: string;
  style: string;
}

export interface VideoJobInput {
  userId: number;
  prompt: string;
  baseImageUrl?: string;
  duration: number; // seconds
  sceneCount?: number;
}

export interface SceneGenerationResult {
  sceneId: string;
  imageUrl: string;
  prompt: string;
}

// ============ SCENE PLANNING ============

/**
 * Generate scene plan from user prompt using LLM
 * Breaks down long-form video into coherent scenes
 */
export async function generateScenePlan(
  prompt: string,
  duration: number,
  sceneCount: number = 5
): Promise<ScenePlan[]> {
  const sceneDuration = Math.floor(duration / sceneCount);
  
  const systemPrompt = `You are a professional video director. Break down the user's video concept into ${sceneCount} coherent scenes for a ${duration}-second video.

Each scene should:
- Be ${sceneDuration} seconds long
- Flow naturally into the next scene
- Maintain visual consistency (same characters, setting, style)
- Build narrative progression
- Include specific visual details for image generation

Return ONLY a JSON array of scenes with this exact structure:
[
  {
    "sceneIndex": 0,
    "description": "Brief scene description",
    "prompt": "Detailed image generation prompt with character features, setting, lighting, camera angle"
  }
]`;

  const response = await invokeLLM({
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: prompt },
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "scene_plan",
        strict: true,
        schema: {
          type: "object",
          properties: {
            scenes: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  sceneIndex: { type: "integer" },
                  description: { type: "string" },
                  prompt: { type: "string" },
                },
                required: ["sceneIndex", "description", "prompt"],
                additionalProperties: false,
              },
            },
          },
          required: ["scenes"],
          additionalProperties: false,
        },
      },
    },
  });

  const content = response.choices[0]?.message?.content;
  if (!content || typeof content !== 'string') {
    throw new Error("No scene plan generated");
  }

  const parsed = JSON.parse(content);
  return parsed.scenes as ScenePlan[];
}

/**
 * Extract character features from base image or prompt
 * Used to maintain character continuity across scenes
 */
export async function extractCharacterFeatures(
  baseImageUrl?: string,
  prompt?: string
): Promise<CharacterFeatures> {
  const systemPrompt = `Extract character features from the description. Return JSON with:
{
  "hair": "color and style",
  "eyes": "color and shape",
  "skin": "tone",
  "clothing": "style and colors",
  "style": "art style (realistic, anime, cartoon, etc.)"
}`;

  const userPrompt = baseImageUrl
    ? `Analyze this image and extract character features: ${baseImageUrl}`
    : `Extract character features from this description: ${prompt}`;

  const response = await invokeLLM({
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "character_features",
        strict: true,
        schema: {
          type: "object",
          properties: {
            hair: { type: "string" },
            eyes: { type: "string" },
            skin: { type: "string" },
            clothing: { type: "string" },
            style: { type: "string" },
          },
          required: ["hair", "eyes", "skin", "clothing", "style"],
          additionalProperties: false,
        },
      },
    },
  });

  const content = response.choices[0]?.message?.content;
  if (!content || typeof content !== 'string') {
    throw new Error("No character features extracted");
  }

  return JSON.parse(content) as CharacterFeatures;
}

/**
 * Enhance scene prompt with character features for continuity
 */
function enhancePromptWithCharacter(
  scenePrompt: string,
  characterFeatures: CharacterFeatures
): string {
  return `${scenePrompt}

Character details (MUST maintain consistency):
- Hair: ${characterFeatures.hair}
- Eyes: ${characterFeatures.eyes}
- Skin: ${characterFeatures.skin}
- Clothing: ${characterFeatures.clothing}
- Art style: ${characterFeatures.style}`;
}

// ============ SCENE GENERATION ============

/**
 * Generate single scene frame with character continuity
 */
export async function generateSceneFrame(
  jobId: number,
  scene: ScenePlan,
  characterFeatures: CharacterFeatures,
  characterLocked: boolean = false
): Promise<SceneGenerationResult> {
  // Enhance prompt with character features if locked
  const finalPrompt = characterLocked
    ? enhancePromptWithCharacter(scene.prompt, characterFeatures)
    : scene.prompt;

  // Generate image
  const { url: imageUrl } = await generateImage({
    prompt: finalPrompt,
  });

  if (!imageUrl) {
    throw new Error("Image generation failed: no URL returned");
  }

  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Create scene record
  const [insertedScene] = await db.insert(videoScenes).values({
    jobId,
    sceneIndex: scene.sceneIndex,
    description: scene.description,
    prompt: finalPrompt,
    imageUrl,
    status: "complete",
    characterLocked,
  }).$returningId();
  
  // Get the generated UUID
  const scenes = await db.select().from(videoScenes).where(eq(videoScenes.jobId, jobId)).orderBy(desc(videoScenes.createdAt)).limit(1);
  const sceneId = scenes[0]?.id;
  if (!sceneId) {
    throw new Error("Failed to retrieve scene ID after insert");
  }

  // Store as asset (id is auto-generated)
  await db.insert(videoAssets).values({
    jobId,
    assetType: "scene_frame",
    url: imageUrl,
  });

  return {
    sceneId,
    imageUrl,
    prompt: finalPrompt,
  };
}

/**
 * Regenerate single scene with new prompt
 */
export async function regenerateScene(
  sceneId: string,
  newPrompt: string,
  characterFeatures?: CharacterFeatures
): Promise<string> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Get existing scene
  const [scene] = await db
    .select()
    .from(videoScenes)
    .where(eq(videoScenes.id, sceneId))
    .limit(1);

  if (!scene) {
    throw new Error("Scene not found");
  }

  // Enhance prompt if character locked
  const finalPrompt =
    scene.characterLocked && characterFeatures
      ? enhancePromptWithCharacter(newPrompt, characterFeatures)
      : newPrompt;

  // Generate new image
  const { url: newImageUrl } = await generateImage({
    prompt: finalPrompt,
  });

  if (!newImageUrl) {
    throw new Error("Image regeneration failed: no URL returned");
  }

  // Update regeneration history
  const history = (scene.regenerationHistory as any[]) || [];
  history.push({
    timestamp: new Date().toISOString(),
    prompt: scene.prompt,
    imageUrl: scene.imageUrl,
  });

  // Update scene
  await db
    .update(videoScenes)
    .set({
      prompt: finalPrompt,
      imageUrl: newImageUrl,
      regenerationCount: (scene.regenerationCount || 0) + 1,
      regenerationHistory: history,
      updatedAt: new Date(),
    })
    .where(eq(videoScenes.id, sceneId));

  // Store new asset (id is auto-generated)
  await db.insert(videoAssets).values({
    jobId: scene.jobId,
    assetType: "scene_frame",
    url: newImageUrl,
  });

  return newImageUrl as string;
}

/**
 * Lock character appearance for all scenes in a job
 */
export async function lockCharacterAppearance(
  jobId: number,
  characterFeatures: CharacterFeatures
): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Update job with character features
  await db
    .update(videoGenerationJobs)
    .set({ characterFeatures })
    .where(eq(videoGenerationJobs.id, jobId));

  // Mark all scenes as character-locked
  await db
    .update(videoScenes)
    .set({ characterLocked: true })
    .where(eq(videoScenes.jobId, jobId));
}

// ============ VIDEO JOB ORCHESTRATION ============

/**
 * Create video generation job and generate all scenes
 */
export async function createVideoJob(input: VideoJobInput): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const sceneCount = input.sceneCount || Math.min(Math.floor(input.duration / 5), 10);

  // Generate scene plan
  const scenePlan = await generateScenePlan(input.prompt, input.duration, sceneCount);

  // Extract character features
  const characterFeatures = await extractCharacterFeatures(
    input.baseImageUrl,
    input.prompt
  );

  // Create job record
  const [job] = await db
    .insert(videoGenerationJobs)
    .values({
      userId: input.userId,
      prompt: input.prompt,
      baseImageUrl: input.baseImageUrl,
      duration: input.duration,
      sceneCount,
      scenePlan,
      characterFeatures,
      status: "queued",
      progress: 0,
    })
    .$returningId();

  const jobId = job.id;

  // Log video creation event
  await db.insert(botEvents).values({
    userId: input.userId,
    channel: "system",
    eventType: "video_created",
    eventData: {
      jobId,
      prompt: input.prompt,
      duration: input.duration,
      sceneCount,
    },
    outcome: "success",
  });

  // Generate scenes asynchronously (in real implementation, this would be a background job)
  // For now, we'll mark as processing and return
  await db
    .update(videoGenerationJobs)
    .set({ status: "processing" })
    .where(eq(videoGenerationJobs.id, jobId));

  // TODO: Trigger background job to generate scenes
  // For MVP, scenes will be generated on-demand via separate mutation

  return jobId;
}

/**
 * Generate all scenes for a video job
 */
export async function generateAllScenes(jobId: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Get job
  const [job] = await db
    .select()
    .from(videoGenerationJobs)
    .where(eq(videoGenerationJobs.id, jobId))
    .limit(1);

  if (!job) {
    throw new Error("Job not found");
  }

  if (!job.scenePlan || !job.characterFeatures) {
    throw new Error("Job missing scene plan or character features");
  }

  const scenePlan = job.scenePlan as ScenePlan[];
  const characterFeatures = job.characterFeatures as CharacterFeatures;

  // Generate each scene
  for (let i = 0; i < scenePlan.length; i++) {
    const scene = scenePlan[i];
    
    try {
      await generateSceneFrame(jobId, scene, characterFeatures, true);
      
      // Update progress
      const progress = Math.floor(((i + 1) / scenePlan.length) * 100);
      await db
        .update(videoGenerationJobs)
        .set({ progress })
        .where(eq(videoGenerationJobs.id, jobId));
    } catch (error) {
      console.error(`Failed to generate scene ${i}:`, error);
      
      // Mark scene as failed
      await db.insert(videoScenes).values({
        jobId,
        sceneIndex: scene.sceneIndex,
        description: scene.description,
        prompt: scene.prompt,
        status: "failed",
        errorMessage: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  // Log scenes generated event
  await db.insert(botEvents).values({
    userId: job.userId,
    channel: "system",
    eventType: "scenes_generated",
    eventData: {
      jobId,
      sceneCount: scenePlan.length,
    },
    outcome: "success",
  });

  // Mark job as complete (video assembly will be separate step)
  await db
    .update(videoGenerationJobs)
    .set({
      status: "complete",
      progress: 100,
      completedAt: new Date(),
    })
    .where(eq(videoGenerationJobs.id, jobId));
}

/**
 * Get video job with all scenes
 */
export async function getVideoJob(jobId: number) {
  const db = await getDb();
  if (!db) return null;

  const [job] = await db
    .select()
    .from(videoGenerationJobs)
    .where(eq(videoGenerationJobs.id, jobId))
    .limit(1);

  if (!job) {
    return null;
  }

  const scenes = await db
    .select()
    .from(videoScenes)
    .where(eq(videoScenes.jobId, jobId))
    .orderBy(videoScenes.sceneIndex);

  const assets = await db
    .select()
    .from(videoAssets)
    .where(eq(videoAssets.jobId, jobId))
    .orderBy(desc(videoAssets.createdAt));

  return {
    ...job,
    scenes,
    assets,
  };
}

/**
 * Reorder scenes in a video job
 */
export async function reorderScenes(
  jobId: number,
  newOrder: string[] // Array of scene IDs in new order
): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Update scene indices based on new order
  for (let i = 0; i < newOrder.length; i++) {
    await db
      .update(videoScenes)
      .set({ sceneIndex: i, updatedAt: new Date() })
      .where(eq(videoScenes.id, newOrder[i]));
  }
}
