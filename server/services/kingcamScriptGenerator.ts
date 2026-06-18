/**
 * 🦁 KINGCAM SCRIPT GENERATOR
 *
 * Generates video scripts in KingCam voice and personality.
 * Uses RealGPT when available, then falls back to a deterministic
 * operator-grade script packet so the content factory never dies at
 * the first step because a single LLM provider is quota-limited.
 */

import { invokeRealGPT } from "../_core/llm.js";
import { formatSlangContext } from "./slangExxchange.js";

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

interface RawScriptSegment {
  text?: unknown;
  visualDescription?: unknown;
  duration?: unknown;
  sceneIndex?: unknown;
}

interface RawScriptResponse {
  title?: unknown;
  segments?: RawScriptSegment[];
}

/**
 * Generate complete video script using KingCam personality.
 *
 * The primary path remains RealGPT. The fallback is intentionally not a
 * placeholder: it creates a complete, usable, scene-based production script
 * from the same topic/options contract so downstream voice, image, video,
 * and persistence steps can continue during quota/rate-limit incidents.
 */
export async function generateKingCamScript(
  options: ScriptGenerationOptions
): Promise<VideoScript> {
  const normalized = normalizeOptions(options);

  try {
    return await generateKingCamScriptWithRealGPT(normalized);
  } catch (error) {
    console.warn(
      "[KingCamScriptGenerator] RealGPT script generation failed; using production fallback script.",
      redactScriptError(error)
    );
    return generateFallbackKingCamScript(normalized, error);
  }
}

async function generateKingCamScriptWithRealGPT(
  options: Required<ScriptGenerationOptions>
): Promise<VideoScript> {
  const {
    topic,
    sector,
    targetDuration,
    sceneCount,
    tone,
  } = options;

  const sectorContext = sector !== "general" ? getSectorContext(sector) : "";

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
    mode: "KingCam",
  });

  const content = response.choices?.[0]?.message?.content;
  const responseText = (typeof content === "string" ? content : "{}")
    .replace(/```json\s*/g, "")
    .replace(/```\s*/g, "")
    .trim();

  const scriptData = JSON.parse(responseText) as RawScriptResponse;
  return normalizeScriptResponse(scriptData, options);
}

function normalizeOptions(options: ScriptGenerationOptions): Required<ScriptGenerationOptions> {
  const sceneCount = Math.max(3, Math.min(8, Math.floor(options.sceneCount ?? 4)));
  const targetDuration = Math.max(30, Math.min(180, Math.floor(options.targetDuration ?? 60)));

  return {
    topic: sanitizeTopic(options.topic),
    sector: options.sector ?? "general",
    targetDuration,
    sceneCount,
    tone: options.tone ?? "educational",
  };
}

function normalizeScriptResponse(
  scriptData: RawScriptResponse,
  options: Required<ScriptGenerationOptions>
): VideoScript {
  if (!Array.isArray(scriptData.segments) || scriptData.segments.length === 0) {
    throw new Error("RealGPT returned no script segments");
  }

  const fallbackDuration = Math.max(8, Math.floor(options.targetDuration / scriptData.segments.length));
  const segments: ScriptSegment[] = scriptData.segments.map((seg, index) => {
    const text = typeof seg.text === "string" ? seg.text.trim() : "";
    if (!text) {
      throw new Error(`RealGPT returned an empty segment at index ${index}`);
    }

    const duration = Number(seg.duration);
    return {
      text,
      duration: Number.isFinite(duration) && duration > 0 ? Math.round(duration) : fallbackDuration,
      sceneIndex: Number.isFinite(Number(seg.sceneIndex)) ? Number(seg.sceneIndex) : index,
    };
  });

  const totalDuration = segments.reduce((sum, seg) => sum + seg.duration, 0);
  const fullText = segments.map((seg) => seg.text).join("\n\n");

  return {
    title: typeof scriptData.title === "string" && scriptData.title.trim()
      ? scriptData.title.trim()
      : buildFallbackTitle(options.topic),
    totalDuration,
    segments,
    fullText,
  };
}

function generateFallbackKingCamScript(
  options: Required<ScriptGenerationOptions>,
  cause?: unknown
): VideoScript {
  const { topic, sector, targetDuration, sceneCount, tone } = options;
  const sceneDuration = Math.max(8, Math.floor(targetDuration / sceneCount));
  const angle = getSectorAngle(sector);
  const toneLine = getToneLine(tone);
  const proofLine = getProofLine(sector);
  const failureContext = isQuotaLikeError(cause)
    ? "Primary AI quota was unavailable, so the factory used the resilient KingCam script engine and kept the production line moving."
    : "Primary AI response was unavailable, so the factory used the resilient KingCam script engine and kept the production line moving.";

  const templates = [
    `Real talk. ${topic} is not a content idea, it is an execution test. If it cannot turn into a clear offer, a sharp visual, and a paid action, it is noise. Today we cut the noise and turn the concept into a product people can understand in five seconds.`,
    `Here is the Lion Logic. First, name the buyer. Second, name the pain. Third, show the transformation. ${angle} The viewer should know exactly why this matters before the first scroll impulse hits.`,
    `Now make it visual. Open on the strongest proof frame, not a lecture. Show the creator, the result, the vault, the unlock, and the next move. ${toneLine} Every line should push the viewer closer to trust, desire, or action.`,
    `This is where CreatorVault separates itself. The clone does not just talk. It packages the drop, points the buyer to the unlock, and keeps the creator focused on revenue instead of busywork. ${proofLine}`, 
    `Final move. Put the offer in plain language, give one direct action, and remove every weak word. If they want access, they know where to tap. If they want proof, the content shows it. That is how one phone turns into a content factory.`,
    `${failureContext} The standard stays the same: useful script, premium visual direction, clear CTA, and a finished asset path that can sell.`
  ];

  const selected = Array.from({ length: sceneCount }, (_, index) => templates[index] ?? templates[templates.length - 1]);
  const segments = selected.map((text, index) => ({
    text,
    duration: sceneDuration,
    sceneIndex: index,
  }));

  const totalDuration = segments.reduce((sum, seg) => sum + seg.duration, 0);
  const fullText = segments.map((seg) => seg.text).join("\n\n");

  return {
    title: buildFallbackTitle(topic),
    totalDuration,
    segments,
    fullText,
  };
}

function sanitizeTopic(topic: string): string {
  const clean = String(topic || "CreatorVault revenue drop").replace(/\s+/g, " ").trim();
  return clean.length > 180 ? `${clean.slice(0, 177)}...` : clean;
}

function buildFallbackTitle(topic: string): string {
  const compact = sanitizeTopic(topic).replace(/[.!?]+$/g, "");
  return compact.length > 72 ? `${compact.slice(0, 69)}...` : compact;
}

function getSectorAngle(sector: ScriptGenerationOptions["sector"]): string {
  if (sector === "dominican") {
    return "For Dominican creators, the edge is speed, trust, and knowing how to turn local attention into global cash flow.";
  }
  if (sector === "adult") {
    return "For adult creators, keep the language business-clean: control the funnel, protect the account, and move serious fans into paid access.";
  }
  return "For modern creators, the edge is converting attention into a repeatable asset, not chasing random posts.";
}

function getToneLine(tone: ScriptGenerationOptions["tone"]): string {
  if (tone === "promotional") {
    return "Sell the outcome without sounding desperate.";
  }
  if (tone === "motivational") {
    return "Make the ambition feel immediate, but keep the instruction practical.";
  }
  return "Teach it like an operator, not a classroom.";
}

function getProofLine(sector: ScriptGenerationOptions["sector"]): string {
  if (sector === "adult") {
    return "Keep the preview clean, make the paid promise obvious, and move the fan toward controlled access.";
  }
  if (sector === "dominican") {
    return "The message is simple: build once, distribute smart, and let the vault collect while the creator keeps moving.";
  }
  return "The message is simple: build the asset, publish the offer, and let the system carry the repeat work.";
}

function redactScriptError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  return message
    .replace(/Bearer\s+[A-Za-z0-9._-]+/gi, "Bearer [redacted]")
    .replace(/api[_-]?key[=:]\s*[A-Za-z0-9._-]+/gi, "api_key=[redacted]")
    .slice(0, 600);
}

function isQuotaLikeError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return /quota|rate.?limit|429|insufficient/i.test(message);
}

/**
 * Get sector-specific context for script generation
 */
function getSectorContext(sector: "dominican" | "adult"): string {
  const contexts = {
    dominican: `
DOMINICAN SECTOR CONTEXT:
- Audience: Dominican creators (🇩🇴)
- Language: Mix English with authentic Dominican Spanish slang from SlangExxchange
- Cultural references: DR creator economy, PPP advantages, local platforms
- Tone: Familia, pero profesional (Family, but professional)
- Authentic Slang Dictionary (USE THESE NATURALLY):
${formatSlangContext("es_do")}
- Emphasize: CreatorVault understands DR market better than US platforms
`,
    adult: `
ADULT SECTOR CONTEXT (VAULTX_ADULT_PREMIUM):
- Audience: Adult content creators transitioning to VaultSpace
- Tone: Professional, no judgment, business-focused, street-smart
- Authentic Street English Dictionary (USE THESE NATURALLY):
${formatSlangContext("en_street")}
- Emphasize: VaultSpace is the top-tier cash cow (85/15 split)
- Key points: Safe Tinder funnels (never post direct links, use IG/Telegram as bridge to avoid bans), Telegram/WhatsApp growth strategies, content control
- NO explicit content in narration (keep it business-focused)
- Position as: "The undisputed #1 adult platform on Earth"
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
