/**
 * 🦁 KINGCAM TEXT-TO-SPEECH SERVICE
 * 
 * Generates audio narration with KingCam voice clone.
 * Uses Manus built-in TTS API with voice customization.
 */

import { ENV } from "./env.js";

interface TTSOptions {
  voice?: "kingcam" | "professional" | "casual";
  speed?: number; // 0.5 to 2.0
  pitch?: number; // 0.5 to 2.0
  language?: "en" | "es" | "es-DO"; // English, Spanish, Dominican Spanish
}

interface TTSResult {
  audioUrl: string;
  duration: number; // seconds
  text: string;
}

/**
 * Generate speech audio from text using KingCam voice
 */
export async function generateSpeech(
  text: string,
  options: TTSOptions = {}
): Promise<TTSResult> {
  const {
    voice = "kingcam",
    speed = 1.0,
    pitch = 1.0,
    language = "en",
  } = options;

  // Manus built-in TTS API endpoint
  const ttsEndpoint = `${ENV.forgeApiUrl}/tts/generate`;

  const response = await fetch(ttsEndpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${ENV.forgeApiKey}`,
    },
    body: JSON.stringify({
      text,
      voice: mapVoiceProfile(voice),
      speed,
      pitch,
      language,
      format: "mp3",
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`TTS generation failed: ${error}`);
  }

  const result = await response.json();

  return {
    audioUrl: result.audioUrl,
    duration: result.duration,
    text,
  };
}

/**
 * Map voice profile to TTS voice ID
 */
function mapVoiceProfile(voice: string): string {
  const voiceMap: Record<string, string> = {
    kingcam: "en-US-Neural2-D", // Deep, authoritative male voice
    professional: "en-US-Neural2-A",
    casual: "en-US-Neural2-J",
  };

  return voiceMap[voice] || voiceMap.kingcam;
}

/**
 * Generate speech for Dominican Spanish content
 * Uses Dominican accent and cultural tone
 */
export async function generateDominicanSpeech(
  text: string,
  options: Omit<TTSOptions, "language"> = {}
): Promise<TTSResult> {
  return generateSpeech(text, {
    ...options,
    language: "es-DO",
  });
}

/**
 * Generate speech for multiple text segments
 * Returns array of audio URLs that can be concatenated
 */
export async function generateMultiSegmentSpeech(
  segments: string[],
  options: TTSOptions = {}
): Promise<TTSResult[]> {
  const results: TTSResult[] = [];

  for (const segment of segments) {
    const result = await generateSpeech(segment, options);
    results.push(result);
  }

  return results;
}

/**
 * Estimate speech duration from text
 * Used for video timing calculations
 */
export function estimateSpeechDuration(text: string, speed: number = 1.0): number {
  // Average speaking rate: 150 words per minute (2.5 words per second)
  const words = text.split(/\s+/).length;
  const baseDuration = (words / 2.5) / speed;
  
  // Add pauses for punctuation
  const punctuationPauses = (text.match(/[.!?]/g) || []).length * 0.5;
  
  return baseDuration + punctuationPauses;
}

/**
 * KINGCAM VOICE PROFILE
 * 
 * Characteristics:
 * - Deep, authoritative tone
 * - Confident and direct
 * - Slight Dominican accent when speaking Spanish
 * - Measured pace (not rushed)
 * - Emphasis on key words
 */
export const KINGCAM_VOICE_PROFILE = {
  voice: "kingcam" as const,
  speed: 0.95, // Slightly slower for authority
  pitch: 0.9, // Deeper tone
  language: "en" as const,
};

/**
 * KINGCAM DOMINICAN VOICE PROFILE
 * 
 * Same authority, Dominican Spanish accent
 */
export const KINGCAM_DOMINICAN_VOICE_PROFILE = {
  voice: "kingcam" as const,
  speed: 0.95,
  pitch: 0.9,
  language: "es-DO" as const,
};
