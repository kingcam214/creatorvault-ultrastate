/**
 * CLONE CAPTION GENERATOR
 * Generates identity-preserving training captions for KingCam clone assets.
 * Uses OpenAI vision to describe scene, outfit, angle, and lighting.
 * Enforces trigger word and identity descriptors.
 */
import fs from "fs";
import path from "path";
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const IDENTITY_CORE = "fluxdevCam, KingCam, Black male founder, luxury boss aesthetic, confident posture";

const CAPTION_SYSTEM_PROMPT = `You are a training caption generator for a Flux LoRA model of a specific person called KingCam.

Your job is to write precise, identity-preserving captions for training images.

RULES:
1. ALWAYS start with: "fluxdevCam, KingCam, Black male founder"
2. ALWAYS include: confident posture, luxury boss aesthetic
3. Describe: outfit/clothing, camera angle, lighting quality, background/scene
4. Describe: facial expression if visible
5. Keep captions 1-3 sentences, specific and factual
6. DO NOT invent physical traits you cannot see
7. DO NOT use vague words like "man", "person", "individual" — always use "KingCam"
8. DO NOT add fictional or aspirational traits

OUTPUT FORMAT: Single paragraph caption only. No quotes. No labels.`;

export async function generateCaption(
  imagePath: string,
  additionalContext?: string
): Promise<string> {
  // Convert image to base64
  let imageBase64: string;
  let mimeType = "image/jpeg";

  try {
    const buf = fs.readFileSync(imagePath);
    imageBase64 = buf.toString("base64");
    if (imagePath.endsWith(".png")) mimeType = "image/png";
    else if (imagePath.endsWith(".webp")) mimeType = "image/webp";
  } catch (e) {
    throw new Error(`Cannot read image for captioning: ${imagePath}`);
  }

  const userPrompt = additionalContext
    ? `Generate a training caption for this image. Additional context: ${additionalContext}`
    : "Generate a training caption for this image.";

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: CAPTION_SYSTEM_PROMPT },
        {
          role: "user",
          content: [
            { type: "text", text: userPrompt },
            {
              type: "image_url",
              image_url: { url: `data:${mimeType};base64,${imageBase64}`, detail: "low" },
            },
          ],
        },
      ],
      max_tokens: 200,
      temperature: 0.3,
    });

    const caption = response.choices[0]?.message?.content?.trim() || "";

    // Ensure trigger word is present
    if (!caption.includes("fluxdevCam")) {
      return `fluxdevCam, KingCam, Black male founder, luxury boss aesthetic, confident posture. ${caption}`;
    }

    return caption;
  } catch (e) {
    // Fallback caption if vision fails
    console.error("[CaptionGenerator] Vision API failed, using fallback:", e);
    return `${IDENTITY_CORE}, cinematic lighting, professional photography, high quality training image.`;
  }
}

export async function generateCaptionsForDataset(
  datasetId: number,
  imageItems: Array<{ id: number; imagePath: string; imageUrl?: string }>
): Promise<{ generated: number; failed: number }> {
  const { getDb } = await import("../db");
  const db = await getDb();

  let generated = 0;
  let failed = 0;

  for (const item of imageItems) {
    try {
      const caption = await generateCaption(item.imagePath);
      await db.execute(
        `UPDATE clone_training_dataset_items SET caption=? WHERE id=?`,
        [caption, item.id]
      );
      generated++;
    } catch (e) {
      console.error(`[CaptionGenerator] Failed for item ${item.id}:`, e);
      // Set fallback caption
      await db.execute(
        `UPDATE clone_training_dataset_items SET caption=? WHERE id=?`,
        [`${IDENTITY_CORE}, high quality portrait, training image.`, item.id]
      );
      failed++;
    }

    // Rate limit: 1 request per 500ms
    await new Promise(r => setTimeout(r, 500));
  }

  return { generated, failed };
}

export function buildCaptionsFile(
  items: Array<{ imagePath: string; caption: string }>
): string {
  // Returns captions in kohya_ss format: filename\tcaption
  return items
    .map(item => {
      const basename = path.basename(item.imagePath, path.extname(item.imagePath));
      return `${basename}\t${item.caption}`;
    })
    .join("\n");
}
