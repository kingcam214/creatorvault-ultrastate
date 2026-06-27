/**
 * ============================================================================
 * BODY CINEMA AI STACK
 * The elite AI pipeline that runs behind every Body Cinema generation.
 *
 * NO DEEPFAKES. NO IDENTITY FABRICATION.
 * Every tool here works WITH the creator's real source media.
 * The AI enhances, directs, and packages — it never replaces the person.
 *
 * Stack layers:
 *   1. GPT-4o Scene Enhancer     — rewrites the preset prompt into the most
 *                                   cinematic, body-feature-specific Pollo
 *                                   prompt possible given the source media
 *   2. Preset Prompt Builder     — assembles prompt + motionDirective +
 *                                   cameraMovement into a structured Pollo
 *                                   instruction that actually controls output
 *   3. ElevenLabs Narration Gen  — auto-produces KingCam voice narration
 *                                   tuned to the preset's copy and goal
 *   4. GPT-4o Copy Auto-Pack     — generates full copy suite from the
 *                                   preset context (Telegram, DM, PPV, hooks)
 *   5. Conversion Score Preview  — predicts conversion score before launch
 * ============================================================================
 */

import OpenAI from "openai";
import { getPresetById, type BodyCinemaPreset } from "./bodyCinemaPresets.js";
import { generateSpeech } from "../_core/tts.js";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// ─── Types ────────────────────────────────────────────────────────────────────

export interface EnhancedPolloPrompt {
  finalPrompt: string;
  motionDirective: string;
  cameraMovement: string;
  negativePrompt: string;
  reasoning: string;
  presetUsed: string | null;
}

export interface CopyPack {
  telegramCaption: string;
  dmHook: string;
  ppvUnlockLine: string;
  hookVariants: string[];
  twitterPost: string;
  instagramCaption: string;
  urgencyLine: string;
}

export interface NarrationResult {
  script: string;
  audioUrl: string | null;
  provider: string;
}

export interface AIStackResult {
  enhancedPrompt: EnhancedPolloPrompt;
  copyPack: CopyPack;
  narration: NarrationResult | null;
  conversionPreview: number;
  stackLog: string[];
}

// ─── 1. GPT-4o Scene Enhancer ─────────────────────────────────────────────────
/**
 * Takes the preset's base prompt and rewrites it into the most cinematic,
 * body-feature-specific Pollo prompt possible.
 *
 * This is NOT a deepfake tool. It enhances the scene description, lighting,
 * motion, and camera instructions — it does not alter or fabricate identity.
 */
export async function enhancePresetPrompt(
  preset: BodyCinemaPreset,
  packageTitle: string,
  teaserDescription: string,
  sourceType: "image" | "video" = "image"
): Promise<EnhancedPolloPrompt> {
  const systemPrompt = `You are an elite cinematic director specializing in premium adult creator content.
Your job is to take a Body Cinema preset and write the most powerful, conversion-optimized Pollo AI video generation prompt possible.

RULES:
1. NO deepfakes. NO identity fabrication. NO face replacement. NO body swap.
2. Work WITH the source media — enhance the scene, lighting, motion, and camera work.
3. The creator's real body is the subject. The AI enhances how it's presented cinematically.
4. Every prompt must be specific to the body feature this preset highlights: ${preset.name}.
5. Use cinematic language: lighting ratios, lens choices, motion speed, color grading.
6. Keep the final prompt under 300 words but make every word count.
7. The negative prompt must block every unflattering angle and technical failure.

OUTPUT: Return JSON with keys: finalPrompt, motionDirective, cameraMovement, negativePrompt, reasoning`;

  const userPrompt = `Preset: ${preset.name} — "${preset.tagline}"
Body feature focus: ${preset.tags.join(", ")}
Base prompt: ${preset.prompt}
Base motion: ${preset.motionDirective}
Base camera: ${preset.cameraMovement}
Package title: ${packageTitle}
Teaser: ${teaserDescription}
Source type: ${sourceType}
Style: ${preset.style}
Platform: ${preset.platform}
Duration: ${preset.duration}s
Goal: ${preset.goal}

Enhance this into the most cinematic, body-feature-specific Pollo prompt possible.
Make the lighting, motion, and camera work together to make ${preset.name} the undeniable hero of the frame.`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      response_format: { type: "json_object" },
      max_tokens: 600,
    });

    const result = JSON.parse(response.choices[0].message.content || "{}");
    return {
      finalPrompt: result.finalPrompt || preset.prompt,
      motionDirective: result.motionDirective || preset.motionDirective,
      cameraMovement: result.cameraMovement || preset.cameraMovement,
      negativePrompt: result.negativePrompt || preset.negativePrompt,
      reasoning: result.reasoning || "GPT-4o scene enhancement applied",
      presetUsed: preset.id,
    };
  } catch {
    // Fallback to preset values if GPT fails
    return {
      finalPrompt: preset.prompt,
      motionDirective: preset.motionDirective,
      cameraMovement: preset.cameraMovement,
      negativePrompt: preset.negativePrompt,
      reasoning: "Preset values used directly (GPT enhancement unavailable)",
      presetUsed: preset.id,
    };
  }
}

// ─── 2. Preset Prompt Builder ─────────────────────────────────────────────────
/**
 * Assembles the final Pollo prompt from preset + enhancement.
 * This replaces buildVaultxPackagePolloPrompt when a preset is selected.
 */
export function buildPresetPolloPrompt(
  enhanced: EnhancedPolloPrompt,
  telegramMode: string,
  packageTitle: string
): string {
  const modeLine =
    telegramMode === "FULL"
      ? "8-second cinematic premium scene."
      : telegramMode === "BOOST"
      ? "6-second cinematic boosted scene."
      : "5-second cinematic teaser scene.";

  const parts = [
    modeLine,
    enhanced.finalPrompt,
    `Movement: ${enhanced.motionDirective}`,
    `Camera: ${enhanced.cameraMovement}`,
    "Visual law: dark luxury atmosphere, dramatic rim lighting, premium editorial quality, cinematic color grading, no text overlays, no watermarks.",
    "Identity law: preserve the exact appearance of the subject in the source media. Do not alter, replace, or fabricate any facial features, body proportions, or distinguishing characteristics.",
    `Package: ${packageTitle}.`,
  ];

  return parts.filter(Boolean).join(" ");
}

// ─── 3. GPT-4o Copy Auto-Pack ─────────────────────────────────────────────────
/**
 * Generates the full copy suite from the preset context.
 * Runs after the job is submitted so the copy is ready when the video lands.
 */
export async function generateCopyPack(
  preset: BodyCinemaPreset,
  packageTitle: string,
  price: number,
  vipPrice: number
): Promise<CopyPack> {
  try {
    const result = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `You are KingCam's elite content strategist for CreatorVault/VaultX.
Generate a complete copy pack for a Body Cinema drop.
Bold, luxury, money-aware, conversion-first.
Return JSON: { telegramCaption, dmHook, ppvUnlockLine, hookVariants: string[3], twitterPost, instagramCaption, urgencyLine }
telegramCaption: bold, emoji, under 500 chars, ends with CTA
dmHook: DM message under 150 chars, personal and direct
ppvUnlockLine: PPV unlock CTA under 100 chars
hookVariants: 3 alternative hooks for A/B testing, each under 80 chars
twitterPost: under 280 chars, punchy
instagramCaption: 3-4 sentences + hashtags
urgencyLine: scarcity/urgency under 80 chars`,
        },
        {
          role: "user",
          content: `Preset: ${preset.name} — "${preset.tagline}"
Body feature: ${preset.tags.slice(0, 3).join(", ")}
Package: ${packageTitle}
PPV price: $${price}
VIP price: $${vipPrice}
Platform: ${preset.platform}
Goal: ${preset.goal}
Base telegram: ${preset.telegramCaption}
Base DM: ${preset.dmHook}`,
        },
      ],
      response_format: { type: "json_object" },
      max_tokens: 700,
    });

    const data = JSON.parse(result.choices[0].message.content || "{}");
    return {
      telegramCaption: data.telegramCaption || preset.telegramCaption,
      dmHook: data.dmHook || preset.dmHook,
      ppvUnlockLine: data.ppvUnlockLine || preset.ppvUnlockLine,
      hookVariants: Array.isArray(data.hookVariants) ? data.hookVariants : [preset.tagline],
      twitterPost: data.twitterPost || `${preset.tagline} — ${preset.ppvUnlockLine}`,
      instagramCaption: data.instagramCaption || preset.teaserDescription,
      urgencyLine: data.urgencyLine || "Limited time. Link is live.",
    };
  } catch {
    return {
      telegramCaption: preset.telegramCaption,
      dmHook: preset.dmHook,
      ppvUnlockLine: preset.ppvUnlockLine,
      hookVariants: [preset.tagline, `${preset.name} — exclusive drop`, `The ${preset.name.toLowerCase()} drop is live`],
      twitterPost: `${preset.tagline} — ${preset.ppvUnlockLine}`,
      instagramCaption: preset.teaserDescription,
      urgencyLine: "Limited time. Link is live.",
    };
  }
}

// ─── 4. ElevenLabs Narration Generator ───────────────────────────────────────
/**
 * Auto-generates KingCam voice narration for the drop.
 * Short, punchy, money-aware. Designed to play over the video.
 */
export async function generateDropNarration(
  preset: BodyCinemaPreset,
  packageTitle: string,
  price: number
): Promise<NarrationResult | null> {
  try {
    // Generate the narration script with GPT-4o
    const scriptResponse = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `Write a short voiceover script for a premium adult creator content drop.
KingCam voice: confident, luxury, direct, money-aware.
Under 60 words. No explicit content. Designed to play over a cinematic video.
Just the script text, no labels or formatting.`,
        },
        {
          role: "user",
          content: `Drop: ${packageTitle}. Feature: ${preset.name}. Tagline: "${preset.tagline}". Price: $${price}. Goal: make them unlock it.`,
        },
      ],
      max_tokens: 100,
    });

    const script = scriptResponse.choices[0].message.content?.trim() || "";
    if (!script) return null;

    // Generate the audio with ElevenLabs
    const audio = await generateSpeech(script, {
      voice: "kingcam",
      speed: 0.9,
      stability: 0.55,
      similarityBoost: 0.85,
      style: 0.4,
      language: "en",
    });

    return {
      script,
      audioUrl: audio.audioUrl,
      provider: audio.provider,
    };
  } catch {
    return null;
  }
}

// ─── 5. Conversion Score Preview ─────────────────────────────────────────────
/**
 * Predicts the conversion score for a preset + package combination.
 * Based on preset's base score + adjustments for price, platform, goal.
 */
export function previewConversionScore(
  preset: BodyCinemaPreset,
  priceCents: number,
  telegramMode: string
): number {
  let score = preset.conversionScore;

  // Price adjustments — sweet spot is $25-$45
  const price = priceCents / 100;
  if (price >= 25 && price <= 45) score = Math.min(10, score + 0.5);
  if (price > 75) score = Math.max(1, score - 1);
  if (price < 15) score = Math.max(1, score - 0.5);

  // Mode adjustments — BOOST is the sweet spot
  if (telegramMode === "BOOST") score = Math.min(10, score + 0.3);
  if (telegramMode === "FULL") score = Math.min(10, score + 0.5);

  // Heat level bonus
  if (preset.heatLevel >= 4) score = Math.min(10, score + 0.2);

  return Math.round(score * 10) / 10;
}

// ─── Master stack runner ──────────────────────────────────────────────────────
/**
 * Runs the full AI stack for a Body Cinema launch.
 * Call this before submitting to Pollo.
 */
export async function runBodyCinemaAIStack(
  presetId: string,
  packageTitle: string,
  teaserDescription: string,
  priceCents: number,
  vipPriceCents: number,
  telegramMode: string,
  withNarration = true
): Promise<AIStackResult> {
  const stackLog: string[] = [];
  const preset = getPresetById(presetId);

  if (!preset) {
    throw new Error(`Preset ${presetId} not found`);
  }

  stackLog.push(`[AI Stack] Preset: ${preset.name} (${preset.id})`);
  stackLog.push(`[AI Stack] Category: ${preset.category} | Goal: ${preset.goal} | Heat: ${preset.heatLevel}/5`);

  // Layer 1: GPT-4o Scene Enhancement
  stackLog.push("[AI Stack] Layer 1: GPT-4o scene enhancement...");
  const enhancedPrompt = await enhancePresetPrompt(
    preset,
    packageTitle,
    teaserDescription,
    "image"
  );
  stackLog.push(`[AI Stack] Enhancement: ${enhancedPrompt.reasoning}`);

  // Layer 2: Copy Pack (parallel with narration)
  stackLog.push("[AI Stack] Layer 2: GPT-4o copy pack generation...");
  const price = Math.round(priceCents / 100);
  const vipPrice = Math.round(vipPriceCents / 100);

  const [copyPack, narration] = await Promise.all([
    generateCopyPack(preset, packageTitle, price, vipPrice),
    withNarration ? generateDropNarration(preset, packageTitle, price) : Promise.resolve(null),
  ]);

  stackLog.push("[AI Stack] Copy pack generated: Telegram, DM, PPV, hooks, Twitter, Instagram");
  if (narration?.audioUrl) {
    stackLog.push(`[AI Stack] Layer 3: ElevenLabs narration generated (${narration.provider})`);
  } else {
    stackLog.push("[AI Stack] Layer 3: Narration skipped or unavailable");
  }

  // Layer 4: Conversion preview
  const conversionPreview = previewConversionScore(preset, priceCents, telegramMode);
  stackLog.push(`[AI Stack] Conversion preview: ${conversionPreview}/10`);
  stackLog.push("[AI Stack] Stack complete. Ready for Pollo submission.");

  return {
    enhancedPrompt,
    copyPack,
    narration,
    conversionPreview,
    stackLog,
  };
}
