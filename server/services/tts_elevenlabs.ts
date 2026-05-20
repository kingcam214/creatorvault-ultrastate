/**
 * ============================================================================
 * TTS.TS — ELEVENLABS DIRECT INTEGRATION
 * ============================================================================
 *
 * Primary: ElevenLabs API with KingCam professional voice clone
 * Voice ID: rwc11bXCBw5KydM4avHE (KingCam, category: professional)
 * Model: eleven_multilingual_v2 (supports English + Dominican Spanish)
 *
 * Fallback: Manus built-in TTS (forge endpoint) for non-KingCam voices
 * ============================================================================
 */

import { ENV } from "../_core/env";

const ELEVENLABS_BASE = "https://api.elevenlabs.io/v1";
const ELEVENLABS_KEY = process.env.ELEVENLABS_API_KEY;
const KINGCAM_VOICE_ID = process.env.KINGCAM_ELEVEN_VOICE_ID || "rwc11bXCBw5KydM4avHE";

export interface TTSOptions {
  voice?: "kingcam" | "professional" | "casual";
  speed?: number;
  pitch?: number;
  language?: "en" | "es-DO" | "es";
  stability?: number;
  similarityBoost?: number;
  style?: number;
  useSpeakerBoost?: boolean;
}

export interface TTSResult {
  audioUrl: string;
  duration: number;
  text: string;
  provider: "elevenlabs" | "forge";
  voiceId?: string;
}

/**
 * Upload audio buffer to storage and return a public URL.
 * Uses the same storagePut used across the platform.
 */
async function uploadAudioBuffer(buffer: Buffer, filename: string): Promise<string> {
  const { storagePut } = await import("../storage.js");
  const key = `tts/${Date.now()}_${filename}`;
  const { url } = await storagePut(key, buffer, "audio/mpeg");
  return url;
}

/**
 * Generate speech using ElevenLabs KingCam voice clone.
 * Falls back to Manus forge TTS if ElevenLabs key is not configured.
 */
export async function generateSpeech(
  text: string,
  options: TTSOptions = {}
): Promise<TTSResult> {
  const {
    voice = "kingcam",
    speed = 1.0,
    stability = 0.5,
    similarityBoost = 0.8,
    style = 0.3,
    useSpeakerBoost = true,
    language = "en",
  } = options;

  // ─── PRIMARY: ElevenLabs ───────────────────────────────────────────────────
  if (ELEVENLABS_KEY && voice === "kingcam") {
    try {
      const voiceId = KINGCAM_VOICE_ID;
      const modelId = language === "en"
        ? "eleven_multilingual_v2"
        : "eleven_multilingual_v2"; // supports es-DO natively

      const response = await fetch(
        `${ELEVENLABS_BASE}/text-to-speech/${voiceId}`,
        {
          method: "POST",
          headers: {
            "xi-api-key": ELEVENLABS_KEY,
            "Content-Type": "application/json",
            "Accept": "audio/mpeg",
          },
          body: JSON.stringify({
            text,
            model_id: modelId,
            voice_settings: {
              stability,
              similarity_boost: similarityBoost,
              style,
              use_speaker_boost: useSpeakerBoost,
            },
          }),
        }
      );

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`ElevenLabs TTS failed (${response.status}): ${errText}`);
      }

      const audioBuffer = Buffer.from(await response.arrayBuffer());
      const filename = `kingcam_${Date.now()}.mp3`;

      // Upload to S3/storage and get public URL
      const audioUrl = await uploadAudioBuffer(audioBuffer, filename);

      // Estimate duration: ~150 words/min at speed 1.0
      const words = text.split(/\s+/).length;
      const duration = (words / 2.5) / speed;

      // Sync voice_clones table
      try {
        const { getDb } = await import("../db.js");
        const db = await getDb();
        await db.execute(
          `INSERT INTO voice_clones (id, creator_id, voice_name, sample_audio_url, voice_characteristics, is_active, usage_count)
           VALUES (?, 1, 'KingCam', ?, ?, 1, 1)
           ON DUPLICATE KEY UPDATE
             usage_count = usage_count + 1,
             sample_audio_url = VALUES(sample_audio_url)`,
          [
            KINGCAM_VOICE_ID,
            audioUrl,
            JSON.stringify({
              provider: "elevenlabs",
              model: modelId,
              voice_id: voiceId,
              stability,
              similarity_boost: similarityBoost,
              style,
              category: "professional",
            }),
          ]
        );
      } catch (dbErr) {
        // Non-fatal: log but don't fail TTS
        console.warn("[TTS] voice_clones sync failed:", dbErr);
      }

      return {
        audioUrl,
        duration,
        text,
        provider: "elevenlabs",
        voiceId,
      };
    } catch (err) {
      console.error("[TTS] ElevenLabs failed, falling back to forge:", err);
    }
  }

  // ─── FALLBACK: Manus forge TTS ────────────────────────────────────────────
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
    provider: "forge",
  };
}

/**
 * Map voice profile to forge voice ID (fallback only)
 */
function mapVoiceProfile(voice: string): string {
  const voiceMap: Record<string, string> = {
    kingcam: "en-US-Neural2-D",
    professional: "en-US-Neural2-A",
    casual: "en-US-Neural2-J",
  };
  return voiceMap[voice] || voiceMap.kingcam;
}

/**
 * Generate speech for Dominican Spanish content
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
 */
export function estimateSpeechDuration(text: string, speed: number = 1.0): number {
  const words = text.split(/\s+/).length;
  const baseDuration = (words / 2.5) / speed;
  const punctuationPauses = (text.match(/[.!?]/g) || []).length * 0.5;
  return baseDuration + punctuationPauses;
}

/**
 * KINGCAM VOICE PROFILE — ElevenLabs settings
 */
export const KINGCAM_VOICE_PROFILE: TTSOptions = {
  voice: "kingcam",
  speed: 0.95,
  stability: 0.5,
  similarityBoost: 0.85,
  style: 0.35,
  useSpeakerBoost: true,
  language: "en",
};

/**
 * KINGCAM DOMINICAN VOICE PROFILE
 */
export const KINGCAM_DOMINICAN_VOICE_PROFILE: TTSOptions = {
  voice: "kingcam",
  speed: 0.95,
  stability: 0.5,
  similarityBoost: 0.85,
  style: 0.35,
  useSpeakerBoost: true,
  language: "es-DO",
};
