/*
 * ============================================================================
 * TTS.TS — ELEVENLABS DIRECT INTEGRATION + REPLICATE KOKORO FALLBACK
 * ============================================================================
 *
 * Primary: ElevenLabs API with KingCam professional voice clone
 * Voice ID: rwc11bXCBw5KydM4avHE (KingCam, category: professional)
 * Model: eleven_multilingual_v2 (supports English + Dominican Spanish)
 *
 * Fallback: Replicate Kokoro-82M TTS. This is not a KingCam voice clone, but it
 * is a real production speech path when ElevenLabs is unavailable.
 * ============================================================================
 */

import { ENV } from "./env";

const ELEVENLABS_BASE = "https://api.elevenlabs.io/v1";
const ELEVENLABS_KEY = process.env.ELEVENLABS_API_KEY;
const KINGCAM_VOICE_ID = process.env.KINGCAM_ELEVEN_VOICE_ID || "rwc11bXCBw5KydM4avHE";

const REPLICATE_TOKEN = process.env.REPLICATE_API_TOKEN || ENV.replicateApiToken;
const KOKORO_MODEL = process.env.REPLICATE_KOKORO_MODEL || "jaaari/kokoro-82m";
const KOKORO_VERSION =
  process.env.REPLICATE_KOKORO_VERSION ||
  "f559560eb822dc509045f3921a1921234918b91739db4bf3daab2169b71c7a13";

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
  provider: "elevenlabs" | "replicate-kokoro" | "forge";
  voiceId?: string;
}

/**
 * Upload audio buffer to storage and return a public URL.
 * Uses the same storagePut used across the platform.
 */
async function uploadAudioBuffer(
  buffer: Buffer,
  filename: string,
  contentType = "audio/mpeg"
): Promise<string> {
  const { storagePut } = await import("../storage.js");
  const key = `tts/${Date.now()}_${filename}`;
  const { url } = await storagePut(key, buffer, contentType);
  return url;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function estimateDurationForText(text: string, speed: number): number {
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  const baseDuration = (words / 2.5) / Math.max(speed, 0.1);
  const punctuationPauses = (text.match(/[.!?]/g) || []).length * 0.5;
  return baseDuration + punctuationPauses;
}

function mapKokoroVoice(voice: TTSOptions["voice"]): string {
  const voiceMap: Record<string, string> = {
    kingcam: "am_michael",
    professional: "am_fenrir",
    casual: "am_puck",
  };
  return voiceMap[voice || "kingcam"] || voiceMap.kingcam;
}

async function downloadAudioToStorage(audioSourceUrl: string, filename: string): Promise<string> {
  const audioResponse = await fetch(audioSourceUrl);
  if (!audioResponse.ok) {
    const errText = await audioResponse.text();
    throw new Error(`Kokoro audio download failed (${audioResponse.status}): ${errText}`);
  }

  const contentType = audioResponse.headers.get("content-type") || "audio/wav";
  const audioBuffer = Buffer.from(await audioResponse.arrayBuffer());
  return uploadAudioBuffer(audioBuffer, filename, contentType);
}

async function generateKokoroSpeech(
  text: string,
  options: Required<Pick<TTSOptions, "voice" | "speed" | "language">>
): Promise<TTSResult> {
  if (!REPLICATE_TOKEN) {
    throw new Error("REPLICATE_API_TOKEN not configured for Kokoro TTS fallback");
  }

  const kokoroVoice = mapKokoroVoice(options.voice);
  const boundedSpeed = Math.min(5, Math.max(0.1, options.speed));

  const startRes = await fetch("https://api.replicate.com/v1/predictions", {
    method: "POST",
    headers: {
      Authorization: `Token ${REPLICATE_TOKEN}`,
      "Content-Type": "application/json",
      Prefer: "wait=20",
    },
    body: JSON.stringify({
      version: `${KOKORO_MODEL}:${KOKORO_VERSION}`,
      input: {
        text,
        voice: kokoroVoice,
        speed: boundedSpeed,
      },
    }),
  });

  if (!startRes.ok) {
    const errText = await startRes.text();
    throw new Error(`Kokoro TTS start failed (${startRes.status}): ${errText}`);
  }

  let prediction = (await startRes.json()) as {
    id?: string;
    status?: string;
    output?: string | string[];
    error?: string;
  };

  for (let i = 0; i < 60; i++) {
    if (prediction.status === "succeeded") {
      const output = Array.isArray(prediction.output) ? prediction.output[0] : prediction.output;
      if (!output) throw new Error("Kokoro TTS returned empty output");

      const audioUrl = await downloadAudioToStorage(output, `kingcam_kokoro_${Date.now()}.wav`);
      return {
        audioUrl,
        duration: estimateDurationForText(text, boundedSpeed),
        text,
        provider: "replicate-kokoro",
        voiceId: kokoroVoice,
      };
    }

    if (prediction.status === "failed" || prediction.status === "canceled") {
      throw new Error(`Kokoro TTS prediction ${prediction.status}: ${prediction.error ?? "unknown error"}`);
    }

    if (!prediction.id) throw new Error(`Kokoro TTS returned no prediction id: ${JSON.stringify(prediction)}`);

    await sleep(2000);
    const poll = await fetch(`https://api.replicate.com/v1/predictions/${prediction.id}`, {
      headers: { Authorization: `Token ${REPLICATE_TOKEN}` },
    });
    if (!poll.ok) {
      const errText = await poll.text();
      throw new Error(`Kokoro TTS poll failed (${poll.status}): ${errText}`);
    }
    prediction = await poll.json() as typeof prediction;
  }

  throw new Error("Kokoro TTS prediction timed out (2 min)");
}

/**
 * Generate speech using ElevenLabs KingCam voice clone.
 * Falls back to Replicate Kokoro TTS if ElevenLabs is unavailable.
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
      const modelId = "eleven_multilingual_v2"; // supports English + es-DO natively

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

      const audioUrl = await uploadAudioBuffer(audioBuffer, filename, "audio/mpeg");

      // Sync voice_clones table
      try {
        const mysql = await import("mysql2/promise");
        const db = await mysql.default.createConnection(process.env.DATABASE_URL || "mysql://root:@localhost:3306/creatorvault");
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
        duration: estimateDurationForText(text, speed),
        text,
        provider: "elevenlabs",
        voiceId,
      };
    } catch (err) {
      console.error("[TTS] ElevenLabs failed, falling back to Replicate Kokoro:", err);
    }
  }

  // ─── FALLBACK: Replicate Kokoro TTS ─────────────────────────────────────────
  try {
    return await generateKokoroSpeech(text, { voice, speed, language });
  } catch (kokoroErr) {
    console.error("[TTS] Replicate Kokoro fallback failed:", kokoroErr);
  }

  // ─── LEGACY LAST RESORT: Forge TTS if explicitly configured ─────────────────
  if (ENV.forgeApiUrl && ENV.forgeApiKey) {
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

    if (response.ok) {
      const result = await response.json();
      return {
        audioUrl: result.audioUrl,
        duration: result.duration ?? estimateDurationForText(text, speed),
        text,
        provider: "forge",
      };
    }

    const error = await response.text();
    throw new Error(`TTS generation failed after ElevenLabs and Kokoro fallbacks: ${error}`);
  }

  throw new Error("TTS generation failed: ElevenLabs unavailable, Kokoro unavailable, and no legacy forge endpoint configured");
}

/**
 * Map voice profile to forge voice ID (legacy last resort only)
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
  return estimateDurationForText(text, speed);
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
