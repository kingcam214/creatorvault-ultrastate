/**
 * 🦁 KINGCAM SCRIPT GENERATOR
 * 
 * Generates video scripts in KingCam voice and personality.
 * Uses RealGPT system prompt for authentic KingCam tone.
 */

import { invokeRealGPT } from "../_core/llm.js";

export interface ScriptSegment {
  text: string;
  duration: number; // estimated seconds
  sceneIndex: number;
}

export interface VideoScript {
  title: string;
  totalDuration: number;
  segments: ScriptSegment[];
  fullText: string;
}

export interface ScriptGenerationOptions {
  topic: string;
  sector?: "dominican" | "adult" | "general";
  targetDuration?: number; // seconds
  sceneCount?: number;
  tone?: "educational" | "promotional" | "motivational";
}

/**
 * Generate complete video script using KingCam personality
 */
export async function generateKingCamScript(
  options: ScriptGenerationOptions
): Promise<VideoScript> {
  const {
    topic,
    sector = "general",
    targetDuration = 60,
    sceneCount = 4,
    tone = "educational",
  } = options;

  // Get sector-specific context
  const sectorContext = sector !== "general" ? getSectorContext(sector) : "";

  // Build prompt for RealGPT
  const userPrompt = `Create a ${targetDuration}-second video script about: ${topic}

${sectorContext}

Requirements:
- ${sceneCount} scenes/segments
- ${tone} tone
- KingCam voice: direct, authoritative, no fluff
- Each scene should be ${Math.floor(targetDuration / sceneCount)} seconds
- Include specific visual descriptions for each scene
- Use "Real talk" and Lion Logic principles
- NO generic motivational phrases
- Focus on ACTIONABLE value

Return JSON with this structure:
{
  "title": "Video title",
  "segments": [
    {
      "sceneIndex": 0,
      "text": "Narration text for this scene",
      "visualDescription": "What the viewer sees",
      "duration": 15
    }
  ]
}`;

  const response = await invokeRealGPT({
    userMessage: userPrompt,
    mode: "KingCam", // Use KingCam identity mode
  });

  // Parse response
  const content = response.choices[0].message.content;
  let responseText = typeof content === "string" ? content : "{}";
  
  // Strip markdown code blocks if present
  responseText = responseText.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();
  
  const scriptData = JSON.parse(responseText);

  // Build script segments
  const segments: ScriptSegment[] = scriptData.segments.map((seg: any) => ({
    text: seg.text,
    duration: seg.duration,
    sceneIndex: seg.sceneIndex,
  }));

  // Calculate total duration
  const totalDuration = segments.reduce((sum, seg) => sum + seg.duration, 0);

  // Combine all text
  const fullText = segments.map(seg => seg.text).join("\n\n");

  return {
    title: scriptData.title,
    totalDuration,
    segments,
    fullText,
  };
}

/**
 * Get sector-specific context for script generation
 */
function getSectorContext(sector: "dominican" | "adult"): string {
  const contexts = {
    dominican: `
DOMINICAN SECTOR CONTEXT:
- Audience: Dominican creators (🇩🇴)
- Language: Mix English with Dominican Spanish phrases
- Cultural references: DR creator economy, PPP advantages, local platforms
- Tone: Familia, pero profesional (Family, but professional)
- Use "¡Qué lo qué!" for greetings, "tíguere" for hustler
- Emphasize: CreatorVault understands DR market better than US platforms
`,
    adult: `
ADULT SECTOR CONTEXT:
- Audience: Adult content creators
- Tone: Professional, no judgment, business-focused
- Emphasize: 85/15 revenue split vs OnlyFans 80/20
- Key points: Age verification, content control, direct monetization
- NO explicit content in narration (keep it business-focused)
- Position as: "The platform that respects your hustle"
`,
  };

  return contexts[sector] || "";
}

/**
 * Generate script for Dominican sector specifically
 */
export async function generateDominicanScript(
  topic: string,
  targetDuration: number = 60
): Promise<VideoScript> {
  return generateKingCamScript({
    topic,
    sector: "dominican",
    targetDuration,
    tone: "educational",
  });
}

/**
 * Generate script for Adult sector specifically
 */
export async function generateAdultScript(
  topic: string,
  targetDuration: number = 60
): Promise<VideoScript> {
  return generateKingCamScript({
    topic,
    sector: "adult",
    targetDuration,
    tone: "promotional",
  });
}

/**
 * Generate multi-language script (English + Spanish)
 */
export async function generateBilingualScript(
  topic: string,
  targetDuration: number = 60
): Promise<{ english: VideoScript; spanish: VideoScript }> {
  const [english, spanish] = await Promise.all([
    generateKingCamScript({
      topic,
      sector: "general",
      targetDuration,
    }),
    generateKingCamScript({
      topic: `${topic} (en español dominicano)`,
      sector: "dominican",
      targetDuration,
    }),
  ]);

  return { english, spanish };
}

/**
 * EXAMPLE SCRIPTS
 */

export const EXAMPLE_SCRIPTS = {
  dominican_onboarding: {
    topic: "How to start earning with CreatorVault in Dominican Republic",
    sector: "dominican" as const,
    targetDuration: 90,
  },
  adult_monetization: {
    topic: "VaultLive: 85% revenue split for adult creators",
    sector: "adult" as const,
    targetDuration: 60,
  },
  general_platform_tour: {
    topic: "CreatorVault platform overview: Tools for modern creators",
    sector: "general" as const,
    targetDuration: 120,
  },
};
