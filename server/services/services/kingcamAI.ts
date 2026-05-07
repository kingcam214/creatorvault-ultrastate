/**
 * ============================================================================
 * KINGCAM AI — UNIFIED MULTI-MODEL AI OS SERVICE
 * ============================================================================
 *
 * The single brain for ALL AI generation on CreatorVault.
 * Every image, every video, every piece of content flows through here.
 * Every vertical talks to every other vertical through this service.
 *
 * PROVIDERS:
 *   IMAGE:
 *     - Replicate / kingcam214/fluxdevcam  → KingCam DNA images (PRIMARY)
 *     - Internal Forge API                  → General image fallback
 *
 *   VIDEO:
 *     - Pollo.ai / Kling 3.0               → Full-body motion (PRIMARY)
 *     - Pollo.ai / Kling 2.6               → Standard motion
 *     - Pollo.ai / Kling O1                → Precision motion
 *     - Pollo.ai / Seedance 2.0            → Cinematic multi-shot
 *     - Pollo.ai / Seedance 1.5 Pro        → Cinematic standard
 *     - Pollo.ai / Wan 2.6                 → Long-form narrative
 *     - Pollo.ai / Vidu Q3 Pro             → Human-like avatar
 *     - Pollo.ai / Pollo 3.0               → Fast general
 *     - Pollo.ai / Pollo 2.0               → Budget general
 *     - Replicate / SadTalker              → Talking-head clone (existing)
 *
 *   AUDIO:
 *     - Replicate / Kokoro TTS             → Voice synthesis (existing)
 *
 * KINGCAM VISUAL DNA:
 *   Model: kingcam214/fluxdevcam
 *   Version: 6f76a5fb9645488a56e2fdd36a9f213fc08b5aee638d9aa46253b6cd17c3bcff
 *   Trigger: "fluxdevCam"
 *   Identity: Black male, royal velvet suit with diamond/crystal trim,
 *             gold crown, gold chains, aviator sunglasses, designer sneakers
 *
 * CROSS-FEATURE COMMUNICATION:
 *   - Any feature can request assets from any other feature
 *   - Clone Lab can pull flyer images as thumbnails
 *   - Video Studio can pull apparel mockups as scene elements
 *   - Presentation Maker can pull clone videos as slide embeds
 *   - Smart Album feeds new training data back into fluxdevcam
 * ============================================================================
 */

// ─── ENV ─────────────────────────────────────────────────────────────────────
const REPLICATE_TOKEN = process.env.REPLICATE_API_TOKEN ?? "";
const POLLO_KEY = process.env.POLLO_API_KEY ?? "";

export const FLUXDEVCAM = {
  model: "kingcam214/fluxdevcam",
  version: "6f76a5fb9645488a56e2fdd36a9f213fc08b5aee638d9aa46253b6cd17c3bcff",
  triggerWord: "fluxdevCam",
};

// ─── KINGCAM VISUAL DNA ───────────────────────────────────────────────────────
export const KINGCAM_DNA = {
  triggerWord: FLUXDEVCAM.triggerWord,

  /** Core identity injected into every prompt */
  baseIdentity:
    "fluxdevCam, Black male, royal velvet suit with diamond and crystal trim lapels, " +
    "gold crown, layered gold chains, aviator sunglasses, designer high-top sneakers, " +
    "commanding royal presence, luxury interior with dark leather and gold accents",

  /** All suit color variants for the brand */
  suitColorVariants: [
    { name: "Crimson King",    color: "deep crimson red velvet" },
    { name: "Royal Blue",      color: "royal cobalt blue velvet" },
    { name: "Emerald Empire",  color: "deep emerald green velvet" },
    { name: "Purple Reign",    color: "royal purple velvet" },
    { name: "Black Gold",      color: "jet black velvet with gold trim" },
    { name: "White Diamond",   color: "pure white velvet with diamond trim" },
    { name: "Champagne",       color: "champagne cream velvet with gold trim" },
    { name: "Midnight Navy",   color: "midnight navy blue velvet" },
    { name: "Forest Royale",   color: "deep forest green velvet" },
    { name: "Burgundy Boss",   color: "deep burgundy velvet" },
    { name: "Slate Sovereign", color: "charcoal slate velvet with silver trim" },
    { name: "Rose Gold King",  color: "dusty rose velvet with rose gold trim" },
  ],

  /** Style modifiers appended to every generated prompt */
  styleModifiers:
    "photorealistic, 8K ultra HD, cinematic lighting, luxury fashion editorial, " +
    "sharp focus, dramatic shadows, professional photography",
};

/**
 * Inject KingCam visual DNA into any prompt.
 * This is the single function that ensures brand consistency across ALL outputs.
 */
export function injectKingCamDNA(
  userPrompt: string,
  options: {
    suitColor?: string;
    includeIdentity?: boolean;
    styleLevel?: "editorial" | "cinematic" | "product" | "social" | "presentation";
  } = {}
): string {
  const { suitColor, includeIdentity = true, styleLevel = "editorial" } = options;

  const styleMap: Record<string, string> = {
    editorial:     "luxury fashion editorial photography, dramatic studio lighting, 8K ultra HD",
    cinematic:     "cinematic film quality, IMAX camera, dramatic lighting, 4K HDR, movie grade",
    product:       "clean product photography, professional studio, sharp focus, commercial grade",
    social:        "vibrant social media optimized, eye-catching, high contrast, bold colors, thumb-stopping",
    presentation:  "clean presentation visual, professional, high contrast, minimal background, bold",
  };

  const colorPart = suitColor ? `, wearing a ${suitColor} velvet royal suit with diamond trim` : "";
  const identity = includeIdentity
    ? `${KINGCAM_DNA.triggerWord}, ${KINGCAM_DNA.baseIdentity}${colorPart}, `
    : "";

  return `${identity}${userPrompt}, ${styleMap[styleLevel]}, ${KINGCAM_DNA.styleModifiers}`;
}

// ─── TYPES ────────────────────────────────────────────────────────────────────
export type ImageModel = "fluxdevcam" | "forge";

export type VideoModel =
  | "kling-3.0"
  | "kling-2.6"
  | "kling-o1"
  | "seedance-2.0"
  | "seedance-1.5-pro"
  | "wan-2.6"
  | "vidu-q3-pro"
  | "pollo-3.0"
  | "pollo-2.0";

export type ContentVertical =
  | "clone_lab"
  | "video_studio"
  | "flyer_studio"
  | "apparel_lab"
  | "thumbnail"
  | "ad_optimizer"
  | "presentation"
  | "podcast"
  | "social_content"
  | "smart_album"
  | "marketplace";

export interface GenerateImageOptions {
  prompt: string;
  model?: ImageModel;
  injectDNA?: boolean;
  suitColor?: string;
  styleLevel?: "editorial" | "cinematic" | "product" | "social" | "presentation";
  aspectRatio?: "1:1" | "16:9" | "9:16" | "4:3" | "3:4";
  referenceImageUrl?: string;
  vertical?: ContentVertical;
}

export interface GenerateVideoOptions {
  prompt: string;
  model?: VideoModel;
  injectDNA?: boolean;
  imageUrl?: string;
  aspectRatio?: "16:9" | "9:16" | "1:1";
  duration?: 5 | 10;
  mode?: "pro" | "standard";
  vertical?: ContentVertical;
}

export interface AIResult {
  url: string;
  model: string;
  provider: "replicate" | "pollo" | "forge";
  vertical?: ContentVertical;
  metadata?: Record<string, unknown>;
}

export interface CrossFeatureAsset {
  id: string;
  type: "image" | "video" | "audio";
  url: string;
  sourceVertical: ContentVertical;
  prompt: string;
  createdAt: Date;
  tags: string[];
}

// ─── REPLICATE POLLING HELPER ─────────────────────────────────────────────────
async function replicatePredict(
  version: string,
  input: Record<string, unknown>
): Promise<string> {
  if (!REPLICATE_TOKEN) throw new Error("REPLICATE_API_TOKEN not configured");

  const startRes = await fetch("https://api.replicate.com/v1/predictions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${REPLICATE_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ version, input }),
  });

  if (!startRes.ok) {
    const err = await startRes.text();
    throw new Error(`Replicate start failed (${startRes.status}): ${err}`);
  }

  const { id } = (await startRes.json()) as { id: string };

  // Poll until done
  for (let i = 0; i < 120; i++) {
    await sleep(5000);
    const poll = await fetch(`https://api.replicate.com/v1/predictions/${id}`, {
      headers: { Authorization: `Bearer ${REPLICATE_TOKEN}` },
    });
    const data = (await poll.json()) as {
      status: string;
      output?: string | string[];
      error?: string;
    };

    if (data.status === "succeeded") {
      const out = Array.isArray(data.output) ? data.output[0] : data.output;
      if (!out) throw new Error("Replicate returned empty output");
      return out;
    }
    if (data.status === "failed" || data.status === "canceled") {
      throw new Error(`Replicate prediction ${data.status}: ${data.error ?? "unknown error"}`);
    }
  }
  throw new Error("Replicate prediction timed out (10 min)");
}

// ─── POLLO POLLING HELPER ─────────────────────────────────────────────────────
const POLLO_BASE = "https://pollo.ai/api/platform";

async function polloGenerate(
  modelPath: string,
  input: Record<string, unknown>
): Promise<string> {
  if (!POLLO_KEY) throw new Error("POLLO_API_KEY not configured");

  const startRes = await fetch(`${POLLO_BASE}/generation/${modelPath}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": POLLO_KEY,
    },
    body: JSON.stringify({ input }),
  });

  if (!startRes.ok) {
    const err = await startRes.text();
    throw new Error(`Pollo generate failed (${startRes.status}): ${err}`);
  }

  const { taskId } = (await startRes.json()) as { taskId: string };

  // Poll until done
  for (let i = 0; i < 180; i++) {
    await sleep(5000);
    const poll = await fetch(`${POLLO_BASE}/task/${taskId}`, {
      headers: { "x-api-key": POLLO_KEY },
    });
    const task = (await poll.json()) as {
      status: string;
      output?: { url?: string } | { url?: string }[];
      url?: string;
    };

    if (task.status === "succeed") {
      if (typeof task.url === "string") return task.url;
      if (Array.isArray(task.output) && task.output[0]?.url) return task.output[0].url!;
      if (!Array.isArray(task.output) && task.output?.url) return task.output.url!;
      throw new Error("Pollo returned no output URL");
    }
    if (task.status === "failed") {
      throw new Error(`Pollo task failed: ${JSON.stringify(task)}`);
    }
  }
  throw new Error("Pollo task timed out (15 min)");
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

// ─── POLLO MODEL PATH MAP ─────────────────────────────────────────────────────
const POLLO_MODEL_PATHS: Record<VideoModel, string> = {
  "kling-3.0":       "kling-ai/kling-3.0",
  "kling-2.6":       "kling-ai/kling-2.6",
  "kling-o1":        "kling-ai/kling-video-o1",
  "seedance-2.0":    "pollo-ai/seedance-2.0",
  "seedance-1.5-pro":"pollo-ai/seedance-1.5-pro",
  "wan-2.6":         "pollo-ai/wan-2.6",
  "vidu-q3-pro":     "pollo-ai/vidu-q3-pro",
  "pollo-3.0":       "pollo-ai/pollo-3.0",
  "pollo-2.0":       "pollo-ai/pollo-2.0",
};

// ─── CORE: GENERATE IMAGE ─────────────────────────────────────────────────────
/**
 * Generate an image using KingCam's fluxdevcam (primary) or forge (fallback).
 * KingCam DNA is injected automatically.
 * Call this from ANY vertical — it is the single image generation entry point.
 */
export async function generateKingCamImage(
  options: GenerateImageOptions
): Promise<AIResult> {
  const {
    prompt,
    model = "fluxdevcam",
    injectDNA = true,
    suitColor,
    styleLevel = "editorial",
    aspectRatio = "1:1",
    referenceImageUrl,
    vertical,
  } = options;

  const finalPrompt = injectDNA
    ? injectKingCamDNA(prompt, { suitColor, styleLevel })
    : prompt;

  // Primary: fluxdevcam
  if (model === "fluxdevcam" && REPLICATE_TOKEN) {
    try {
      const input: Record<string, unknown> = {
        prompt: finalPrompt,
        aspect_ratio: aspectRatio,
        output_format: "webp",
        output_quality: 90,
        num_inference_steps: 28,
        guidance_scale: 3.5,
      };
      if (referenceImageUrl) input.image = referenceImageUrl;

      const url = await replicatePredict(FLUXDEVCAM.version, input);
      return { url, model: FLUXDEVCAM.model, provider: "replicate", vertical };
    } catch (err) {
      console.error("[KingCamAI] fluxdevcam failed, falling back to forge:", err);
    }
  }

  // Fallback: forge
  const { generateImage } = await import("../_core/imageGeneration");
  const result = await generateImage({ prompt: finalPrompt });
  return { url: result.url ?? "", model: "forge", provider: "forge", vertical };
}

// ─── CORE: GENERATE VIDEO ─────────────────────────────────────────────────────
/**
 * Generate a video using Pollo.ai models.
 * Defaults to Kling 3.0 for full-body motion.
 * KingCam DNA is injected automatically.
 * Call this from ANY vertical — it is the single video generation entry point.
 */
export async function generateKingCamVideo(
  options: GenerateVideoOptions
): Promise<AIResult> {
  const {
    prompt,
    model = "kling-3.0",
    injectDNA = true,
    imageUrl,
    aspectRatio = "16:9",
    duration = 5,
    mode = "pro",
    vertical,
  } = options;

  if (!POLLO_KEY) throw new Error("POLLO_API_KEY not configured");

  const finalPrompt = injectDNA
    ? injectKingCamDNA(prompt, { styleLevel: "cinematic" })
    : prompt;

  const input: Record<string, unknown> = {
    prompt: finalPrompt,
    aspectRatio,
    length: duration,
    mode,
  };
  if (imageUrl) input.images = [imageUrl];

  const url = await polloGenerate(POLLO_MODEL_PATHS[model], input);
  return { url, model: `pollo/${model}`, provider: "pollo", vertical };
}

// ─── VERTICAL-SPECIFIC GENERATORS ────────────────────────────────────────────

/** Clone Lab: Auto-generate thumbnail for a clone video */
export async function generateCloneThumbnail(
  scriptPreview: string,
  suitColor?: string
): Promise<string> {
  const result = await generateKingCamImage({
    prompt:
      `KingCam speaking confidently to camera, recording a video, ` +
      `topic: "${scriptPreview.slice(0, 80)}", ` +
      `luxury recording studio background, ring light, professional setup, ` +
      `close-up portrait, intense eye contact`,
    injectDNA: true,
    suitColor: suitColor ?? "deep crimson red velvet",
    styleLevel: "social",
    aspectRatio: "16:9",
    vertical: "clone_lab",
  });
  return result.url;
}

/** Clone Lab: Full-body motion video from reference image */
export async function generateFullBodyCloneVideo(options: {
  prompt: string;
  referenceImageUrl?: string;
  model?: VideoModel;
  duration?: 5 | 10;
}): Promise<AIResult> {
  return generateKingCamVideo({
    prompt: options.prompt,
    model: options.model ?? "kling-3.0",
    injectDNA: true,
    imageUrl: options.referenceImageUrl,
    duration: options.duration ?? 5,
    mode: "pro",
    aspectRatio: "9:16",
    vertical: "clone_lab",
  });
}

/** Flyer Studio: Generate a KingCam-branded flyer image */
export async function generateFlyerImage(options: {
  eventName: string;
  eventType: string;
  colorScheme?: string;
  includeKingCam?: boolean;
  suitColor?: string;
}): Promise<AIResult> {
  const { eventName, eventType, colorScheme, includeKingCam = true, suitColor } = options;
  const prompt = includeKingCam
    ? `Professional event flyer for "${eventName}", ${eventType} event, ` +
      `KingCam as featured artist and host, luxury nightclub design, ` +
      `bold typography, ${colorScheme ?? "gold and black"} color scheme, ` +
      `dramatic lighting, VIP atmosphere, full bleed poster layout`
    : `Professional event flyer for "${eventName}", ${eventType} event, ` +
      `luxury design, bold typography, ${colorScheme ?? "gold and black"} color scheme`;

  return generateKingCamImage({
    prompt,
    injectDNA: includeKingCam,
    suitColor: suitColor ?? "jet black velvet with gold trim",
    styleLevel: "social",
    aspectRatio: "9:16",
    vertical: "flyer_studio",
  });
}

/** Apparel Lab: Generate a KingCam-branded apparel mockup */
export async function generateApparelMockup(options: {
  garmentType: string;
  designDescription: string;
  colorway: string;
  wornByKingCam?: boolean;
}): Promise<AIResult> {
  const { garmentType, designDescription, colorway, wornByKingCam = true } = options;
  const prompt = wornByKingCam
    ? `KingCam wearing a ${garmentType}, ${designDescription}, ` +
      `${colorway} colorway, luxury streetwear fashion editorial, ` +
      `full garment visible, clean product shot`
    : `${garmentType} flat lay product shot, ${designDescription}, ` +
      `${colorway} colorway, luxury fashion photography, clean background`;

  return generateKingCamImage({
    prompt,
    injectDNA: wornByKingCam,
    styleLevel: wornByKingCam ? "editorial" : "product",
    aspectRatio: "1:1",
    vertical: "apparel_lab",
  });
}

/** Thumbnail Generator: AI-optimized thumbnail with KingCam DNA */
export async function generateThumbnail(options: {
  title: string;
  niche: string;
  emotion?: string;
  suitColor?: string;
}): Promise<AIResult> {
  const { title, niche, emotion = "confident", suitColor } = options;
  return generateKingCamImage({
    prompt:
      `KingCam YouTube thumbnail for "${title}", ${niche} content, ` +
      `${emotion} expression, bold text overlay space, dramatic lighting, ` +
      `high CTR thumbnail composition, face close-up, intense energy`,
    injectDNA: true,
    suitColor: suitColor ?? "royal cobalt blue velvet",
    styleLevel: "social",
    aspectRatio: "16:9",
    vertical: "thumbnail",
  });
}

/** Ad Optimizer: Generate ad creative with KingCam DNA */
export async function generateAdCreative(options: {
  adCopy: string;
  platform: "instagram" | "tiktok" | "youtube" | "facebook";
  productOrService: string;
  suitColor?: string;
}): Promise<AIResult> {
  const { adCopy, platform, productOrService, suitColor } = options;
  const aspectMap = { instagram: "1:1", tiktok: "9:16", youtube: "16:9", facebook: "1:1" } as const;
  return generateKingCamImage({
    prompt:
      `KingCam promoting ${productOrService}, ${adCopy}, ` +
      `${platform} ad creative, high conversion design, ` +
      `luxury brand aesthetic, bold call to action visual`,
    injectDNA: true,
    suitColor: suitColor ?? "deep emerald green velvet",
    styleLevel: "social",
    aspectRatio: aspectMap[platform],
    vertical: "ad_optimizer",
  });
}

/** Presentation Maker: Generate slide visuals with KingCam DNA */
export async function generatePresentationSlideVisual(options: {
  slideTitle: string;
  slideContent: string;
  slideIndex: number;
  totalSlides: number;
}): Promise<AIResult> {
  const { slideTitle, slideContent, slideIndex } = options;
  return generateKingCamImage({
    prompt:
      `Professional presentation slide visual for "${slideTitle}", ` +
      `${slideContent}, KingCam brand aesthetic, ` +
      `clean layout with space for text overlay, slide ${slideIndex + 1}, ` +
      `luxury business presentation, dark background with gold accents`,
    injectDNA: true,
    styleLevel: "presentation",
    aspectRatio: "16:9",
    vertical: "presentation",
  });
}

/** Video Studio: Generate scene image for multi-scene video */
export async function generateVideoSceneImage(options: {
  sceneDescription: string;
  sceneIndex: number;
  characterFeatures?: string;
  setting?: string;
}): Promise<AIResult> {
  const { sceneDescription, sceneIndex, characterFeatures, setting } = options;
  return generateKingCamImage({
    prompt:
      `Video scene ${sceneIndex + 1}: ${sceneDescription}` +
      (characterFeatures ? `, character: ${characterFeatures}` : "") +
      (setting ? `, setting: ${setting}` : "") +
      `, cinematic composition, movie quality`,
    injectDNA: true,
    styleLevel: "cinematic",
    aspectRatio: "16:9",
    vertical: "video_studio",
  });
}

/** Social Content: Generate social media post visual */
export async function generateSocialPostVisual(options: {
  caption: string;
  platform: "instagram" | "tiktok" | "twitter" | "facebook";
  contentType: "promotional" | "lifestyle" | "educational" | "entertainment";
  suitColor?: string;
}): Promise<AIResult> {
  const { caption, platform, contentType, suitColor } = options;
  const aspectMap = { instagram: "1:1", tiktok: "9:16", twitter: "16:9", facebook: "1:1" } as const;
  return generateKingCamImage({
    prompt:
      `KingCam social media post for ${platform}, ${contentType} content, ` +
      `"${caption.slice(0, 100)}", eye-catching visual, ` +
      `platform-optimized composition, viral potential`,
    injectDNA: true,
    suitColor: suitColor ?? "royal purple velvet",
    styleLevel: "social",
    aspectRatio: aspectMap[platform],
    vertical: "social_content",
  });
}

/** Animated Flyer: Generate video from a flyer image */
export async function generateAnimatedFlyer(options: {
  flyerImageUrl: string;
  animationPrompt?: string;
  model?: VideoModel;
}): Promise<AIResult> {
  const { flyerImageUrl, animationPrompt, model = "kling-3.0" } = options;
  return generateKingCamVideo({
    prompt:
      animationPrompt ??
      "Bring this flyer to life with dramatic cinematic motion, " +
      "particle effects, glowing elements, luxury event atmosphere, " +
      "KingCam walking into frame with royal presence",
    model,
    injectDNA: false, // flyer already has DNA baked in
    imageUrl: flyerImageUrl,
    duration: 5,
    mode: "pro",
    aspectRatio: "9:16",
    vertical: "flyer_studio",
  });
}

// ─── SMART ALBUM: GENERATE COLOR VARIANT COLLECTION ──────────────────────────
/**
 * Generate the full KingCam suit color variant collection.
 * Runs sequentially to avoid rate limits.
 */
export async function generateColorVariantCollection(
  basePrompt = "KingCam standing in royal pose, full body, luxury penthouse setting, " +
    "confident stance, looking directly at camera"
): Promise<Array<{ variant: string; url: string }>> {
  const results: Array<{ variant: string; url: string }> = [];
  for (const variant of KINGCAM_DNA.suitColorVariants) {
    try {
      const result = await generateKingCamImage({
        prompt: basePrompt,
        suitColor: variant.color,
        injectDNA: true,
        styleLevel: "editorial",
        aspectRatio: "9:16",
        vertical: "smart_album",
      });
      results.push({ variant: variant.name, url: result.url });
    } catch (err) {
      console.error(`[KingCamAI] Color variant "${variant.name}" failed:`, err);
    }
  }
  return results;
}

// ─── SMART ALBUM: TRIGGER MODEL RETRAINING ───────────────────────────────────
/**
 * Trigger a new Replicate fine-tune training run using bulk-uploaded images.
 * Called from Smart Album after user uploads new training images.
 */
export async function triggerModelRetraining(options: {
  trainingZipUrl: string;
  triggerWord?: string;
  steps?: number;
}): Promise<{ trainingId: string; status: string; message: string }> {
  if (!REPLICATE_TOKEN) throw new Error("REPLICATE_API_TOKEN not configured");

  const { trainingZipUrl, triggerWord = FLUXDEVCAM.triggerWord, steps = 1000 } = options;

  const res = await fetch(
    "https://api.replicate.com/v1/trainings",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${REPLICATE_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        destination: "kingcam214/fluxdevcam",
        input: {
          input_images: trainingZipUrl,
          trigger_word: triggerWord,
          steps,
          lora_rank: 16,
          optimizer: "adamw8bit",
          batch_size: 1,
          resolution: "512,768,1024",
          autocaption: true,
          autocaption_prefix: `a photo of ${triggerWord}`,
        },
      }),
    }
  );

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Replicate training start failed (${res.status}): ${err}`);
  }

  const training = (await res.json()) as { id: string; status: string };
  return {
    trainingId: training.id,
    status: training.status,
    message: `Training started. Model will be updated at kingcam214/fluxdevcam when complete.`,
  };
}

// ─── CROSS-FEATURE ASSET REGISTRY ────────────────────────────────────────────
/**
 * Register a generated asset in the cross-feature registry.
 * Any vertical can pull assets generated by any other vertical.
 */
export function buildCrossFeatureAsset(
  result: AIResult,
  prompt: string,
  tags: string[] = []
): CrossFeatureAsset {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    type: result.provider === "pollo" ? "video" : "image",
    url: result.url,
    sourceVertical: result.vertical ?? "video_studio",
    prompt,
    createdAt: new Date(),
    tags: [result.model, result.provider, ...(result.vertical ? [result.vertical] : []), ...tags],
  };
}

// ─── EXPORTS ──────────────────────────────────────────────────────────────────
export default {
  // Core generators
  generateKingCamImage,
  generateKingCamVideo,
  // Vertical-specific
  generateCloneThumbnail,
  generateFullBodyCloneVideo,
  generateFlyerImage,
  generateApparelMockup,
  generateThumbnail,
  generateAdCreative,
  generatePresentationSlideVisual,
  generateVideoSceneImage,
  generateSocialPostVisual,
  generateAnimatedFlyer,
  // Smart Album
  generateColorVariantCollection,
  triggerModelRetraining,
  // Utilities
  injectKingCamDNA,
  buildCrossFeatureAsset,
  KINGCAM_DNA,
  FLUXDEVCAM,
};
