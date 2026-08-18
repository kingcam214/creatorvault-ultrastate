import { createHash, randomUUID } from "crypto";
import { execFile } from "child_process";
import { mkdir, readFile, stat, writeFile } from "fs/promises";
import path from "path";
import { promisify } from "util";
import { sql } from "drizzle-orm";
import { db } from "../db";
import { analyzeCanonicalAudioAsset, registerCanonicalAudioAsset } from "./audioIntelligenceService";
import {
  approveGovernedPolloJob,
  authorizeSingleUseGovernedPolloSubmission,
  createGovernedKingcamReplicateOmniHumanDraft,
  getGovernedPolloJob,
  getGovernedPolloConfig,
  isGovernedPolloExecutionEnabled,
  submitGovernedPolloJob,
} from "./governedPolloService";

const OWNER_IDS = new Set([6, 33]);
const KINGCAM_CLONE_ID = "kingcam-founder-clone";
const KINGCAM_HERO_REFERENCE = "https://creatorvault.live/videos/kingcam-hero-cam.mp4";
const KINGCAM_FULL_BODY_IMAGE = "https://creatorvault.live/images/kingcam-profile/kingcam-crown-lounge.webp";

type CloneMemoryKind = "tour_started" | "tour_room_viewed" | "owner_directive" | "motion_proof_planned" | "quality_review" | "performance_capture_registered";
type MotionRequestState = "planned" | "approved" | "submitted" | "provider_complete" | "accepted" | "rejected" | "failed";
// The verified KingCam motion source is 5.04 seconds; this proof must never request a longer output.
const KINGCAM_FULL_BODY_PROOF_DURATION_SECONDS = 15;
const KINGCAM_FULL_BODY_PROOF_MANUAL_CREDIT_CAP = 2;
const KINGCAM_FULL_BODY_CORRECTIVE_MODEL = "replicate/bytedance/omni-human";
const KINGCAM_WAN_FULL_BODY_IMAGE = "https://creatorvault.live/images/kingcam-profile/kingcam-crown-lounge-reference.png";
const KINGCAM_WAN_SPOKEN_AUDIO = "https://creatorvault.live/uploads/content-vault/kingcam-voice-tour-v1/entry.mp3";
const execFileAsync = promisify(execFile);
const KINGCAM_GUIDE_VOICE_ID = "rwc11bXCBw5KydM4avHE";
const KINGCAM_GUIDE_VOICE_MODEL = "eleven_multilingual_v2";
const KINGCAM_GUIDE_AUDIO_ROOT = "/root/uploads/content-vault/kingcam-voice-tour-v1";
const KINGCAM_GUIDE_AUDIO_URL_ROOT = "https://creatorvault.live/uploads/content-vault/kingcam-voice-tour-v1";
const KINGCAM_FULL_BODY_DIRECT_AUDIO_KEY = "happyhorse-fullbody-proof";
const KINGCAM_FULL_BODY_DIRECT_AUDIO_URL = `${KINGCAM_GUIDE_AUDIO_URL_ROOT}/${KINGCAM_FULL_BODY_DIRECT_AUDIO_KEY}.mp3`;
const KINGCAM_FULL_BODY_DIRECT_SCRIPT = "Welcome to CreatorVault. I am KingCam. This is where creators own the media, move with power, and turn attention into a real machine. Your voice, your visuals, your story, your money. Watch what happens when all of it moves together.";

const KINGCAM_GUIDE_TOUR_SEGMENTS = [
  { key: "entry", chapter: "THE ENTRY", script: "Welcome to CreatorVault. This is where you keep your content, your presence, and your power in your own hands." },
  { key: "body-cinema", chapter: "BODY CINEMA", script: "Body Cinema starts with your real footage. It is built to bring your best presence forward, not replace you with something fake." },
  { key: "caption-stage", chapter: "CAPTION STAGE", script: "Caption Stage puts your message straight on your moving content, so your words hit while the moment is still alive." },
  { key: "trailer-maker", chapter: "TRAILER MAKER", script: "Trailer Maker turns your strongest moments into a real release with a beginning, a build, and a payoff." },
  { key: "clone-command", chapter: "CLONE COMMAND", script: "Clone Command keeps my voice, my face, my rules, and my memory right here inside CreatorVault. This is the machine." },
] as const;

export type KingcamTruthCard = {
  id: string;
  room: string;
  route: string;
  fact: string;
  proofState: "live" | "in_progress" | "not_ready";
  restriction: string;
};

const TRUTH_LIBRARY: KingcamTruthCard[] = [
  {
    id: "creator-ownership",
    room: "Creator ownership",
    route: "/king/content",
    fact: "CreatorVault keeps the creator's real media, approved source record, and finished work inside CreatorVault instead of treating her as raw material for another platform.",
    proofState: "live",
    restriction: "Do not claim a provider-generated result until it has passed CreatorVault review.",
  },
  {
    id: "body-cinema",
    room: "Body Cinema",
    route: "/vault-x/studio",
    fact: "Body Cinema is CreatorVault's source-preserving treatment room for creator-owned media.",
    proofState: "in_progress",
    restriction: "Never promise a treatment result or provider output that has not been accepted on the real source.",
  },
  {
    id: "caption-stage",
    room: "Caption Stage",
    route: "/creator/caption-stage",
    fact: "Caption Stage works from a saved CreatorVault video, makes a timed transcript, and requires transcript review before a master is prepared.",
    proofState: "live",
    restriction: "Never describe a caption master as done until the reviewed master exists.",
  },
  {
    id: "trailer-maker",
    room: "Trailer Maker",
    route: "/trailer-maker",
    fact: "Trailer Maker is CreatorVault's release-building room for shaping real creator footage into a larger story.",
    proofState: "in_progress",
    restriction: "Never promise a finished trailer without a real accepted watchable output.",
  },
  {
    id: "clone-command",
    room: "Clone Command",
    route: "/clone-empire-home",
    fact: "KingCam Clone belongs inside CreatorVault, where its identity, source library, rules, memory, and finished work remain governed by CreatorVault.",
    proofState: "live",
    restriction: "External models may render a controlled component, but they never become the clone's home or source of truth.",
  },
];

const QUALITY_GATES = [
  "Face, beard, skin tone, body build, crown, jewelry, wardrobe, and other approved identity anchors remain recognizable.",
  "The whole body stays in frame when the scene calls for full-body KingCam; no talking-head crop is accepted as a substitute.",
  "Hands, feet, gait, posture, clothing edges, environment geometry, and camera movement remain natural.",
  "KingCam visibly delivers the supplied real KingCam speech with synchronized mouth timing; voiceover on unrelated or recycled footage is rejected.",
  "The scene never invents a CreatorVault capability, creator result, sale, subscriber count, buyer, or earnings claim.",
  "A result is stored as public KingCam media only after human review accepts it; every rejection remains a permanent provider-learning record.",
] as const;

function assertOwner(ownerId: number): void {
  if (!OWNER_IDS.has(Number(ownerId))) throw new Error("Only the CreatorVault owner can direct KingCam Clone.");
}

export async function preflightKingcamElevenLabsVoice(ownerId: number): Promise<{ available: boolean; provider: "elevenlabs"; voiceId: string; voiceName: string | null; reason: string | null; genericFallbackForbidden: true }> {
  assertOwner(ownerId);
  const apiKey = String(process.env.ELEVENLABS_API_KEY || "").trim();
  const voiceId = String(process.env.KINGCAM_ELEVEN_VOICE_ID || "rwc11bXCBw5KydM4avHE").trim();
  if (!apiKey) {
    return { available: false, provider: "elevenlabs", voiceId, voiceName: null, reason: "The real KingCam ElevenLabs voice key is not available in this runtime.", genericFallbackForbidden: true };
  }
  const response = await fetch(`https://api.elevenlabs.io/v1/voices/${encodeURIComponent(voiceId)}`, {
    headers: { "xi-api-key": apiKey, Accept: "application/json" },
  });
  if (!response.ok) {
    return { available: false, provider: "elevenlabs", voiceId, voiceName: null, reason: `The real KingCam ElevenLabs voice check returned ${response.status}.`, genericFallbackForbidden: true };
  }
  const payload = await response.json().catch(() => ({})) as Record<string, unknown>;
  const voiceName = typeof payload.name === "string" && payload.name.trim() ? payload.name.trim() : null;
  return { available: true, provider: "elevenlabs", voiceId, voiceName, reason: null, genericFallbackForbidden: true };
}

export async function preflightKingcamReplicateOmniHuman(ownerId: number): Promise<{
  available: boolean;
  provider: "replicate";
  model: "bytedance/omni-human";
  versionId: string | null;
  inputFields: string[];
  advertisedPricing: Record<string, unknown> | null;
  exactCostAvailable: boolean;
  reason: string | null;
  cloneOnly: true;
}> {
  assertOwner(ownerId);
  const token = String(process.env.REPLICATE_API_TOKEN || "").trim();
  if (!token) {
    return {
      available: false,
      provider: "replicate",
      model: "bytedance/omni-human",
      versionId: null,
      inputFields: [],
      advertisedPricing: null,
      exactCostAvailable: false,
      reason: "The existing Replicate clone-only account token is not available in this runtime.",
      cloneOnly: true,
    };
  }

  const response = await fetch("https://api.replicate.com/v1/models/bytedance/omni-human", {
    headers: { Authorization: `Token ${token}`, Accept: "application/json" },
  });
  if (!response.ok) {
    return {
      available: false,
      provider: "replicate",
      model: "bytedance/omni-human",
      versionId: null,
      inputFields: [],
      advertisedPricing: null,
      exactCostAvailable: false,
      reason: `The existing Replicate clone-only account returned ${response.status} while reading OmniHuman.`,
      cloneOnly: true,
    };
  }

  const payload = (await response.json().catch(() => ({}))) as Record<string, any>;
  const latestVersion = payload.latest_version && typeof payload.latest_version === "object" ? payload.latest_version as Record<string, any> : {};
  const inputProperties = latestVersion.openapi_schema?.components?.schemas?.Input?.properties;
  const inputFields = inputProperties && typeof inputProperties === "object" ? Object.keys(inputProperties).sort() : [];
  const advertisedPricing = payload.pricing && typeof payload.pricing === "object" ? payload.pricing as Record<string, unknown> : null;
  return {
    available: true,
    provider: "replicate",
    model: "bytedance/omni-human",
    versionId: typeof latestVersion.id === "string" ? latestVersion.id : null,
    inputFields,
    advertisedPricing,
    exactCostAvailable: Boolean(advertisedPricing && Object.keys(advertisedPricing).length),
    reason: null,
    cloneOnly: true,
  };
}

function probeAudioDuration(localPath: string): Promise<number> {
  return execFileAsync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "default=noprint_wrappers=1:nokey=1", localPath])
    .then(({ stdout }) => Number(String(stdout).trim()));
}

export type KingcamGuideVoiceSegment = {
  key: string;
  chapter: string;
  script: string;
  audioUrl: string;
  durationSeconds: number;
  canonicalAudioAssetId: string;
  provider: "elevenlabs";
  voiceId: string;
};

export async function getKingcamGuideVoiceTour(ownerId: number): Promise<{ ready: boolean; segments: KingcamGuideVoiceSegment[]; missingKeys: string[]; genericFallbackForbidden: true }> {
  assertOwner(ownerId);
  await ensureKingcamCloneOperatingSystem();
  const rows = await rawQuery<any>("SELECT * FROM kingcam_clone_voice_tour_segments WHERE owner_id = ? AND status = 'ready' ORDER BY created_at ASC", [ownerId]);
  const byKey = new Map(rows.map((row) => [String(row.segment_key), row]));
  const segments = KINGCAM_GUIDE_TOUR_SEGMENTS.flatMap((definition) => {
    const row = byKey.get(definition.key);
    if (!row) return [];
    return [{ key: definition.key, chapter: definition.chapter, script: definition.script, audioUrl: String(row.audio_url), durationSeconds: Number(row.duration_seconds), canonicalAudioAssetId: String(row.canonical_audio_asset_id), provider: "elevenlabs" as const, voiceId: String(row.voice_id) }];
  });
  const missingKeys = KINGCAM_GUIDE_TOUR_SEGMENTS.filter((definition) => !byKey.has(definition.key)).map((definition) => definition.key);
  return { ready: missingKeys.length === 0, segments, missingKeys, genericFallbackForbidden: true };
}

export async function createKingcamGuideVoiceTour(ownerId: number): Promise<{ segments: KingcamGuideVoiceSegment[]; genericFallbackForbidden: true }> {
  assertOwner(ownerId);
  const preflight = await preflightKingcamElevenLabsVoice(ownerId);
  if (!preflight.available || preflight.voiceId !== KINGCAM_GUIDE_VOICE_ID) {
    throw new Error(preflight.reason || "The real KingCam ElevenLabs voice is not available. Generic fallback is forbidden.");
  }
  await ensureKingcamCloneOperatingSystem();
  const existing = await getKingcamGuideVoiceTour(ownerId);
  if (existing.ready) return { segments: existing.segments, genericFallbackForbidden: true };
  const apiKey = String(process.env.ELEVENLABS_API_KEY || "").trim();
  await mkdir(KINGCAM_GUIDE_AUDIO_ROOT, { recursive: true });

  for (const definition of KINGCAM_GUIDE_TOUR_SEGMENTS) {
    if (existing.segments.some((segment) => segment.key === definition.key)) continue;
    const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(KINGCAM_GUIDE_VOICE_ID)}`, {
      method: "POST",
      headers: { "xi-api-key": apiKey, "Content-Type": "application/json", Accept: "audio/mpeg" },
      body: JSON.stringify({
        text: definition.script,
        model_id: KINGCAM_GUIDE_VOICE_MODEL,
        voice_settings: { stability: 0.5, similarity_boost: 0.85, style: 0.35, use_speaker_boost: true },
      }),
    });
    if (!response.ok) throw new Error(`Real KingCam ElevenLabs narration failed for ${definition.key} (${response.status}). No fallback voice was used.`);
    const audioBytes = Buffer.from(await response.arrayBuffer());
    if (audioBytes.length < 1024) throw new Error(`Real KingCam ElevenLabs narration for ${definition.key} was empty.`);
    const fileName = `${definition.key}.mp3`;
    const localPath = path.join(KINGCAM_GUIDE_AUDIO_ROOT, fileName);
    const audioUrl = `${KINGCAM_GUIDE_AUDIO_URL_ROOT}/${fileName}`;
    await writeFile(localPath, audioBytes);
    const durationSeconds = await probeAudioDuration(localPath);
    const sizeBytes = Number((await stat(localPath)).size);
    if (!Number.isFinite(durationSeconds) || durationSeconds <= 0 || sizeBytes < 1024) throw new Error(`Real KingCam narration for ${definition.key} could not be technically verified.`);
    const fingerprint = createHash("sha256").update(audioBytes).digest("hex");
    const audioAsset = await registerCanonicalAudioAsset({
      creatorId: ownerId,
      title: `KingCam CreatorVault Tour — ${definition.chapter}`,
      assetUrl: audioUrl,
      mimeType: "audio/mpeg",
      kind: "voiceover",
      fingerprint,
      durationSeconds: Number(durationSeconds.toFixed(3)),
      rights: {
        state: "creator_owned",
        source: "generated_voice",
        providerName: "ElevenLabs",
        allowedPlatforms: ["creatorvault"],
        permittedUses: ["preview", "render", "distribution"],
        attributionRequired: false,
        evidenceNote: "Generated only with the authenticated KingCam ElevenLabs voice clone after a direct voice availability preflight; generic fallback is forbidden.",
      },
    });
    await analyzeCanonicalAudioAsset(ownerId, audioAsset.id);
    await rawExec(
      `INSERT INTO kingcam_clone_voice_tour_segments (id, owner_id, segment_key, chapter, script_text, audio_url, duration_seconds, fingerprint, canonical_audio_asset_id, provider, voice_id, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'elevenlabs', ?, 'ready', NOW(), NOW())
       ON DUPLICATE KEY UPDATE script_text = VALUES(script_text), audio_url = VALUES(audio_url), duration_seconds = VALUES(duration_seconds), fingerprint = VALUES(fingerprint), canonical_audio_asset_id = VALUES(canonical_audio_asset_id), provider = VALUES(provider), voice_id = VALUES(voice_id), status = 'ready', updated_at = NOW()`,
      [randomUUID(), ownerId, definition.key, definition.chapter, definition.script, audioUrl, Number(durationSeconds.toFixed(3)), fingerprint, audioAsset.id, KINGCAM_GUIDE_VOICE_ID],
    );
  }
  const tour = await getKingcamGuideVoiceTour(ownerId);
  if (!tour.ready) throw new Error("KingCam real-voice tour is incomplete after narration generation.");
  return { segments: tour.segments, genericFallbackForbidden: true };
}

async function ensureKingcamFullBodyDirectVoice(ownerId: number): Promise<{ audioUrl: string; durationSeconds: number; canonicalAudioAssetId: string }> {
  assertOwner(ownerId);
  const preflight = await preflightKingcamElevenLabsVoice(ownerId);
  if (!preflight.available || preflight.voiceId !== KINGCAM_GUIDE_VOICE_ID) {
    throw new Error(preflight.reason || "The real KingCam ElevenLabs voice is not available. Generic fallback is forbidden.");
  }
  await mkdir(KINGCAM_GUIDE_AUDIO_ROOT, { recursive: true });
  const localPath = path.join(KINGCAM_GUIDE_AUDIO_ROOT, `${KINGCAM_FULL_BODY_DIRECT_AUDIO_KEY}.mp3`);
  const apiKey = String(process.env.ELEVENLABS_API_KEY || "").trim();
  let audioBytes: Buffer;
  try {
    const existing = await stat(localPath);
    if (existing.size >= 1024) audioBytes = await readFile(localPath);
    else throw new Error("Existing direct KingCam speech asset is incomplete.");
  } catch {
    const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(KINGCAM_GUIDE_VOICE_ID)}`, {
      method: "POST",
      headers: { "xi-api-key": apiKey, "Content-Type": "application/json", Accept: "audio/mpeg" },
      body: JSON.stringify({
        text: KINGCAM_FULL_BODY_DIRECT_SCRIPT,
        model_id: KINGCAM_GUIDE_VOICE_MODEL,
        voice_settings: { stability: 0.5, similarity_boost: 0.85, style: 0.35, use_speaker_boost: true },
      }),
    });
    if (!response.ok) throw new Error(`Real KingCam ElevenLabs full-body narration failed (${response.status}). No fallback voice was used.`);
    audioBytes = Buffer.from(await response.arrayBuffer());
    if (audioBytes.length < 1024) throw new Error("Real KingCam ElevenLabs full-body narration was empty.");
    await writeFile(localPath, audioBytes);
  }
  const durationSeconds = await probeAudioDuration(localPath);
  if (!Number.isFinite(durationSeconds) || durationSeconds < 10 || durationSeconds > 18) {
    throw new Error("The real KingCam full-body speech asset does not fit the governed 15-second proof window.");
  }
  const fingerprint = createHash("sha256").update(audioBytes).digest("hex");
  const audioAsset = await registerCanonicalAudioAsset({
    creatorId: ownerId,
    title: "KingCam Full-Body Clone Proof — Direct Speech",
    assetUrl: KINGCAM_FULL_BODY_DIRECT_AUDIO_URL,
    mimeType: "audio/mpeg",
    kind: "voiceover",
    fingerprint,
    durationSeconds: Number(durationSeconds.toFixed(3)),
    rights: {
      state: "creator_owned",
      source: "generated_voice",
      providerName: "ElevenLabs",
      allowedPlatforms: ["creatorvault"],
      permittedUses: ["preview", "render"],
      attributionRequired: false,
      evidenceNote: "Generated only with the authenticated KingCam ElevenLabs voice clone for a governed KingCam full-body proof; generic fallback is forbidden.",
    },
  });
  await analyzeCanonicalAudioAsset(ownerId, audioAsset.id);
  return { audioUrl: KINGCAM_FULL_BODY_DIRECT_AUDIO_URL, durationSeconds: Number(durationSeconds.toFixed(3)), canonicalAudioAssetId: audioAsset.id };
}

async function rawQuery<T = any>(query: string, params: any[] = []): Promise<T[]> {
  const pool = (db as any).$client || (db as any).client;
  if (pool?.promise) {
    const [rows] = await pool.promise().query(query, params);
    return rows as T[];
  }
  if (pool?.execute) {
    const [rows] = await pool.execute(query, params);
    return rows as T[];
  }
  const values = [...params];
  const escaped = query.replace(/\?/g, () => {
    const value = values.shift();
    if (value === null || value === undefined) return "NULL";
    if (typeof value === "number") return String(value);
    return `'${String(value).replace(/'/g, "''")}'`;
  });
  const result = await (db as any).execute(sql.raw(escaped));
  return (result as any).rows || result || [];
}

async function rawExec(query: string, params: any[] = []): Promise<void> {
  await rawQuery(query, params);
}

function json(value: unknown): string {
  return JSON.stringify(value ?? {});
}

function parseJson<T>(value: unknown, fallback: T): T {
  if (!value) return fallback;
  if (typeof value === "object") return value as T;
  try { return JSON.parse(String(value)) as T; } catch { return fallback; }
}

export async function ensureKingcamCloneOperatingSystem(): Promise<void> {
  await rawExec(`CREATE TABLE IF NOT EXISTS kingcam_clone_operating_profiles (
    clone_id VARCHAR(96) PRIMARY KEY,
    owner_id BIGINT NOT NULL,
    status VARCHAR(32) NOT NULL,
    identity_vault_json LONGTEXT NOT NULL,
    voice_policy_json LONGTEXT NOT NULL,
    motion_policy_json LONGTEXT NOT NULL,
    quality_policy_json LONGTEXT NOT NULL,
    truth_revision VARCHAR(64) NOT NULL,
    created_at DATETIME NOT NULL,
    updated_at DATETIME NOT NULL
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
  await rawExec(`CREATE TABLE IF NOT EXISTS kingcam_clone_memory_events (
    id CHAR(36) PRIMARY KEY,
    clone_id VARCHAR(96) NOT NULL,
    owner_id BIGINT NOT NULL,
    kind VARCHAR(48) NOT NULL,
    room VARCHAR(96) NULL,
    payload_json LONGTEXT NOT NULL,
    created_at DATETIME NOT NULL,
    KEY kingcam_clone_memory_lookup (clone_id, owner_id, created_at)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
  await rawExec(`CREATE TABLE IF NOT EXISTS kingcam_clone_voice_tour_segments (
    id CHAR(36) PRIMARY KEY,
    owner_id BIGINT NOT NULL,
    segment_key VARCHAR(64) NOT NULL,
    chapter VARCHAR(128) NOT NULL,
    script_text TEXT NOT NULL,
    audio_url TEXT NOT NULL,
    duration_seconds DECIMAL(10,3) NOT NULL,
    fingerprint CHAR(64) NOT NULL,
    canonical_audio_asset_id CHAR(36) NOT NULL,
    provider VARCHAR(32) NOT NULL,
    voice_id VARCHAR(128) NOT NULL,
    status VARCHAR(32) NOT NULL,
    created_at DATETIME NOT NULL,
    updated_at DATETIME NOT NULL,
    UNIQUE KEY kingcam_clone_voice_segment_unique (owner_id, segment_key),
    KEY kingcam_clone_voice_owner_lookup (owner_id, created_at)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
  await rawExec(`CREATE TABLE IF NOT EXISTS kingcam_clone_motion_requests (
    id CHAR(36) PRIMARY KEY,
    clone_id VARCHAR(96) NOT NULL,
    owner_id BIGINT NOT NULL,
    source_url TEXT NOT NULL,
    source_kind VARCHAR(48) NOT NULL,
    motion_reference_url TEXT NULL,
    intended_lane VARCHAR(96) NOT NULL,
    candidate_models_json LONGTEXT NOT NULL,
    scene_brief TEXT NOT NULL,
    hard_credit_cap INT NOT NULL,
    consent_confirmed TINYINT NOT NULL,
    ownership_confirmed TINYINT NOT NULL,
    quality_gate_json LONGTEXT NOT NULL,
    state VARCHAR(32) NOT NULL,
    review_json LONGTEXT NULL,
    created_at DATETIME NOT NULL,
    updated_at DATETIME NOT NULL,
    KEY kingcam_clone_motion_owner (clone_id, owner_id, state, created_at)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
}

function identityVault() {
  return {
    cloneId: KINGCAM_CLONE_ID,
    approvedFullBodyImage: KINGCAM_FULL_BODY_IMAGE,
    approvedFullBodyMotionReference: KINGCAM_HERO_REFERENCE,
    publicAssets: [
      "/videos/kingcam-hero-cam.mp4",
      "/videos/platform/clone-command-hero.mp4",
      "/images/kingcam-profile/kingcam-crown-lounge.webp",
      "/images/kingcam-profile/kingcam-crown-hall.webp",
    ],
    identityLaw: "Preserve approved KingCam face, body build, beard, skin tone, wardrobe anchors, jewelry, crown styling when supplied, and full-body presence. Never substitute an unrelated man or generic avatar.",
  };
}

function voicePolicy() {
  return {
    primary: "KingCam ElevenLabs clone only when ELEVENLABS_API_KEY and KINGCAM_ELEVEN_VOICE_ID are active in CreatorVault runtime.",
    fallback: "No generic public fallback voice is permitted for KingCam Clone.",
    use: "Voice is one layer of KingCam Clone, used for tours, teaching, narration, and direct response. It does not replace full-body cinematic motion.",
  };
}

function motionPolicy() {
  const config = getGovernedPolloConfig();
  return {
    home: "CreatorVault governed motion ledger",
    primaryLane: "Clone-only governed human-performance request through CreatorVault's existing provider control plane",
    candidateModels: [KINGCAM_FULL_BODY_CORRECTIVE_MODEL],
    excluded: [
      "legacy ungoverned Pollo clone calls",
      "Pollo V2V body-cinema lane",
      "Replicate for Body Cinema",
      "talking-head crop as a full-body substitute",
    ],
    executionState: isGovernedPolloExecutionEnabled() ? "governed execution ready" : "provider path must be opened through the existing governed Pollo runtime before a motion request may submit",
    runtimeControls: {
      emergencyFreezeOff: config.emergencyFreezeOff,
      perRequestCreditCap: config.perRequestCreditCap,
      globalDailyCreditCap: config.globalDailyCreditCap,
      perUserDailyCreditCap: config.perUserDailyCreditCap,
      maxConcurrentJobs: config.maxConcurrentJobs,
    },
  };
}

async function ensureProfile(ownerId: number) {
  await ensureKingcamCloneOperatingSystem();
  const rows = await rawQuery<any>("SELECT * FROM kingcam_clone_operating_profiles WHERE clone_id = ? LIMIT 1", [KINGCAM_CLONE_ID]);
  if (rows[0]) return rows[0];
  const vault = identityVault();
  const voice = voicePolicy();
  const motion = motionPolicy();
  const quality = { gates: QUALITY_GATES, reviewRequired: true, noAutomaticPublicPlacement: true };
  await rawExec(`INSERT INTO kingcam_clone_operating_profiles
    (clone_id, owner_id, status, identity_vault_json, voice_policy_json, motion_policy_json, quality_policy_json, truth_revision, created_at, updated_at)
    VALUES (?, ?, 'operational-spine', ?, ?, ?, ?, 'kingcam-truth-v1', NOW(), NOW())`,
    [KINGCAM_CLONE_ID, ownerId, json(vault), json(voice), json(motion), json(quality)]);
  return (await rawQuery<any>("SELECT * FROM kingcam_clone_operating_profiles WHERE clone_id = ? LIMIT 1", [KINGCAM_CLONE_ID]))[0];
}

export async function getKingcamCloneOperatingSystem(ownerId: number) {
  assertOwner(ownerId);
  const profile = await ensureProfile(ownerId);
  const recentMemory = await rawQuery<any>(`SELECT id, kind, room, payload_json, created_at
    FROM kingcam_clone_memory_events WHERE clone_id = ? AND owner_id = ? ORDER BY created_at DESC LIMIT 12`, [KINGCAM_CLONE_ID, ownerId]);
  const requests = await rawQuery<any>(`SELECT id, source_url, source_kind, motion_reference_url, intended_lane, candidate_models_json,
    scene_brief, hard_credit_cap, consent_confirmed, ownership_confirmed, quality_gate_json, state, review_json, created_at, updated_at
    FROM kingcam_clone_motion_requests WHERE clone_id = ? AND owner_id = ? ORDER BY created_at DESC LIMIT 12`, [KINGCAM_CLONE_ID, ownerId]);
  return {
    cloneId: KINGCAM_CLONE_ID,
    status: String(profile.status),
    identityVault: parseJson(profile.identity_vault_json, identityVault()),
    voicePolicy: parseJson(profile.voice_policy_json, voicePolicy()),
    motionPolicy: parseJson(profile.motion_policy_json, motionPolicy()),
    qualityPolicy: parseJson(profile.quality_policy_json, { gates: QUALITY_GATES }),
    truthLibrary: TRUTH_LIBRARY,
    recentMemory: recentMemory.map((event) => ({
      id: String(event.id), kind: String(event.kind), room: event.room ? String(event.room) : null,
      payload: parseJson(event.payload_json, {}), createdAt: String(event.created_at),
    })),
    motionRequests: requests.map((request) => ({
      id: String(request.id), sourceUrl: String(request.source_url), sourceKind: String(request.source_kind),
      motionReferenceUrl: request.motion_reference_url ? String(request.motion_reference_url) : null,
      intendedLane: String(request.intended_lane), candidateModels: parseJson<string[]>(request.candidate_models_json, []),
      sceneBrief: String(request.scene_brief), hardCreditCap: Number(request.hard_credit_cap),
      consentConfirmed: Boolean(request.consent_confirmed), ownershipConfirmed: Boolean(request.ownership_confirmed),
      qualityGate: parseJson<string[]>(request.quality_gate_json, []), state: String(request.state),
      review: parseJson(request.review_json, null), createdAt: String(request.created_at), updatedAt: String(request.updated_at),
    })),
  };
}

export async function recordKingcamCloneMemory(input: { ownerId: number; kind: CloneMemoryKind; room?: string | null; payload: Record<string, unknown> }) {
  assertOwner(input.ownerId);
  await ensureProfile(input.ownerId);
  const id = randomUUID();
  await rawExec(`INSERT INTO kingcam_clone_memory_events (id, clone_id, owner_id, kind, room, payload_json, created_at)
    VALUES (?, ?, ?, ?, ?, ?, NOW())`, [id, KINGCAM_CLONE_ID, input.ownerId, input.kind, input.room || null, json(input.payload)]);
  return { id, kind: input.kind };
}

export async function registerKingcamPerformanceCapture(input: { ownerId: number; mediaAssetId: string }) {
  assertOwner(input.ownerId);
  await ensureProfile(input.ownerId);
  const mediaAssetId = String(input.mediaAssetId || "").trim();
  if (!mediaAssetId) throw new Error("KingCam Performance Capture needs the verified media receipt from CreatorVault.");
  const rows = await rawQuery<any>(
    `SELECT id, public_url, duration, width, height, mime_type, status, created_by_feature
     FROM media_assets
     WHERE id = ? AND user_id = ? AND asset_type = 'video' AND status = 'ready'
     LIMIT 1`,
    [mediaAssetId, input.ownerId],
  );
  const asset = rows[0];
  if (!asset) throw new Error("The captured KingCam performance was not found in your CreatorVault vault.");
  if (String(asset.created_by_feature || "") !== "kingcam_performance_capture") {
    throw new Error("Only a direct KingCam Performance Capture can become a clone motion driver.");
  }
  const durationSeconds = Number(asset.duration || 0);
  const width = Number(asset.width || 0);
  const height = Number(asset.height || 0);
  if (!Number.isFinite(durationSeconds) || durationSeconds < 7 || durationSeconds > 60) {
    throw new Error("KingCam needs a seven- to sixty-second full-body performance take.");
  }
  if (width < 720 || height < 720) {
    throw new Error("KingCam Performance Capture needs a clear full-body recording at 720p or better.");
  }
  const capture = {
    mediaAssetId,
    mediaUrl: String(asset.public_url),
    durationSeconds: Number(durationSeconds.toFixed(3)),
    width,
    height,
    mimeType: String(asset.mime_type || "video/mp4"),
    classification: "kingcam_performance_driver",
    bodyCinemaEligible: false,
    cloneOnly: true,
  };
  await recordKingcamCloneMemory({
    ownerId: input.ownerId,
    kind: "performance_capture_registered",
    room: "KingCam Performance Capture",
    payload: capture,
  });
  return { ready: true, capture };
}

export async function startKingcamCloneTour(input: { ownerId: number; roomId: string }) {
  assertOwner(input.ownerId);
  const card = TRUTH_LIBRARY.find((item) => item.id === input.roomId);
  if (!card) throw new Error("KingCam Clone cannot enter an unknown platform room.");
  const tourId = randomUUID();
  await recordKingcamCloneMemory({
    ownerId: input.ownerId,
    kind: "tour_started",
    room: card.room,
    payload: { tourId, roomId: card.id, route: card.route, truthRevision: "kingcam-truth-v1", fact: card.fact },
  });
  return { tourId, room: card, nextAction: card.route };
}

export async function planKingcamFullBodyMotionProof(input: { ownerId: number; hardCreditCap: number; sceneBrief: string }) {
  assertOwner(input.ownerId);
  if (!Number.isInteger(input.hardCreditCap) || input.hardCreditCap <= 0 || input.hardCreditCap > 1_000_000) {
    throw new Error("KingCam motion needs one explicit positive credit cap.");
  }
  const sceneBrief = String(input.sceneBrief || "").trim();
  if (sceneBrief.length < 40 || sceneBrief.length > 1800) throw new Error("KingCam motion scene brief must be between 40 and 1800 characters.");
  await ensureProfile(input.ownerId);
  const id = randomUUID();
  const fingerprint = createHash("sha256").update(`${KINGCAM_CLONE_ID}:${KINGCAM_HERO_REFERENCE}:${sceneBrief}:${input.hardCreditCap}`).digest("hex");
  await rawExec(`INSERT INTO kingcam_clone_motion_requests
    (id, clone_id, owner_id, source_url, source_kind, motion_reference_url, intended_lane, candidate_models_json, scene_brief, hard_credit_cap,
     consent_confirmed, ownership_confirmed, quality_gate_json, state, created_at, updated_at)
    VALUES (?, ?, ?, ?, 'approved_kingcam_full_body_identity_image', ?, 'governed_replicate_omnihuman_full_body_clone', ?, ?, ?, 1, 1, ?, 'planned', NOW(), NOW())`,
    [id, KINGCAM_CLONE_ID, input.ownerId, KINGCAM_WAN_FULL_BODY_IMAGE, KINGCAM_FULL_BODY_DIRECT_AUDIO_URL,
      json([KINGCAM_FULL_BODY_CORRECTIVE_MODEL]), sceneBrief, input.hardCreditCap, json(QUALITY_GATES)]);
  await recordKingcamCloneMemory({ ownerId: input.ownerId, kind: "motion_proof_planned", room: "KingCam full-body cinematic motion", payload: { motionRequestId: id, fingerprint, hardCreditCap: input.hardCreditCap } });
  return { id, fingerprint, state: "planned" as const, sourceUrl: KINGCAM_WAN_FULL_BODY_IMAGE, candidateModels: [KINGCAM_FULL_BODY_CORRECTIVE_MODEL], qualityGate: QUALITY_GATES };
}

export async function launchKingcamFullBodyMotionProof(input: { ownerId: number; sceneBrief: string }) {
  assertOwner(input.ownerId);
  const sceneBrief = String(input.sceneBrief || "").trim();
  if (sceneBrief.length < 40 || sceneBrief.length > 1800) {
    throw new Error("KingCam motion scene brief must be between 40 and 1800 characters.");
  }

  const motionRequest = await planKingcamFullBodyMotionProof({
    ownerId: input.ownerId,
    hardCreditCap: KINGCAM_FULL_BODY_PROOF_MANUAL_CREDIT_CAP,
    sceneBrief,
  });
  const directVoice = await ensureKingcamFullBodyDirectVoice(input.ownerId);
  const prompt = [
    "One uninterrupted fifteen-second full-body KingCam performance from the approved CreatorVault identity image and the direct KingCam speech asset.",
    "KingCam stays visible from crown to shoes in the exact burgundy velvet suit with gold embroidery, crown, jewelry, black shoes, dark lounge, and cigar in the right hand.",
    "He visibly speaks the direct KingCam audio with natural mouth timing, breathes, shifts weight through both legs, takes two relaxed grounded steps, and uses a restrained left-hand emphasis gesture while the right hand holds the cigar naturally.",
    "No voiceover on unrelated footage, no static pose, no talking-head crop, no close-up cutaway, no camera spin, no extra person, no text, no identity or wardrobe replacement, and no hand, foot, or anatomy failure.",
    sceneBrief,
  ].join(" ");

  const drafted = await createGovernedKingcamReplicateOmniHumanDraft({
    creatorId: input.ownerId,
    requestedBy: input.ownerId,
    prompt,
    ownershipConfirmed: true,
    consentConfirmed: true,
    idempotencyKey: `kingcam-omnihuman-full-body-spoken-motion-proof:${motionRequest.id}`,
    requestId: motionRequest.id,
    metadata: {
      ownerDirectedPilot: true,
      candidateLimit: 1,
      noAutomaticRetry: true,
      sourcePreservationRequired: true,
      kingcamCloneId: KINGCAM_CLONE_ID,
      kingcamMotionRequestId: motionRequest.id,
      proofClass: "kingcam_full_body_visible_speech_and_motion_proof",
      correctiveProviderModel: KINGCAM_FULL_BODY_CORRECTIVE_MODEL,
      providerPreflight: "Replicate authenticated model metadata confirms OmniHuman accepts image and audio inputs; provider does not advertise a fixed price in this account response, so this owner-directed test is locked to CreatorVault's $2 internal cap and one output.",
      motionReferenceUrl: directVoice.audioUrl,
      approvedFullBodyImage: KINGCAM_WAN_FULL_BODY_IMAGE,
      directVoiceDurationSeconds: directVoice.durationSeconds,
      directVoiceCanonicalAudioAssetId: directVoice.canonicalAudioAssetId,
      qualityGate: QUALITY_GATES,
    },
  });
  const approved = await approveGovernedPolloJob({
    jobId: drafted.job.id,
    approverId: input.ownerId,
    expectedFingerprint: drafted.job.fingerprint,
    reason: "Owner-directed KingCam OmniHuman full-body spoken-motion proof. One direct voice-plus-image output only with a manually locked $2 internal maximum and no automatic retry; reject unless full-body natural movement, speech sync, identity, wardrobe, hands, and anatomy clear the KingCam gate.",
  });
  await authorizeSingleUseGovernedPolloSubmission({
    jobId: approved.id,
    ownerId: input.ownerId,
    expectedFingerprint: approved.fingerprint,
    hardCreditCap: KINGCAM_FULL_BODY_PROOF_MANUAL_CREDIT_CAP,
    expiresInMinutes: 10,
    reason: "One-time KingCam OmniHuman full-body spoken-motion proof; manual $2 internal ceiling after the authenticated model metadata exposed no fixed price.",
  });
  const submitted = await submitGovernedPolloJob({
    jobId: approved.id,
    workerId: `kingcam-clone-owner-${input.ownerId}`,
  });
  const localState: MotionRequestState = submitted.state === "submitted" ? "submitted" : submitted.state === "failed" ? "failed" : "approved";
  await rawExec(
    "UPDATE kingcam_clone_motion_requests SET state = ?, review_json = ?, updated_at = NOW() WHERE id = ? AND clone_id = ? AND owner_id = ?",
    [localState, json({ governedJobId: submitted.id, providerJobId: submitted.providerJobId, state: submitted.state, hardCreditCap: KINGCAM_FULL_BODY_PROOF_MANUAL_CREDIT_CAP, providerModelPath: KINGCAM_FULL_BODY_CORRECTIVE_MODEL, identityImage: KINGCAM_WAN_FULL_BODY_IMAGE, audioUrl: directVoice.audioUrl, audioDurationSeconds: directVoice.durationSeconds }), motionRequest.id, KINGCAM_CLONE_ID, input.ownerId],
  );
  await recordKingcamCloneMemory({
    ownerId: input.ownerId,
    kind: "motion_proof_planned",
    room: "KingCam full-body cinematic motion",
    payload: { motionRequestId: motionRequest.id, governedJobId: submitted.id, providerJobId: submitted.providerJobId, state: submitted.state, hardCreditCap: KINGCAM_FULL_BODY_PROOF_MANUAL_CREDIT_CAP, providerModelPath: KINGCAM_FULL_BODY_CORRECTIVE_MODEL, identityImage: KINGCAM_WAN_FULL_BODY_IMAGE, audioUrl: directVoice.audioUrl, audioDurationSeconds: directVoice.durationSeconds },
  });
  return { motionRequestId: motionRequest.id, governedJob: submitted, hardCreditCap: KINGCAM_FULL_BODY_PROOF_MANUAL_CREDIT_CAP, qualityGate: QUALITY_GATES };
}

export async function reviewKingcamFullBodyMotionProof(input: { ownerId: number; requestId: string; accepted: boolean; overallScore: number; notes: string }) {
  assertOwner(input.ownerId);
  if (!Number.isFinite(input.overallScore) || input.overallScore < 0 || input.overallScore > 100) throw new Error("KingCam proof score must be between 0 and 100.");
  const rows = await rawQuery<any>("SELECT * FROM kingcam_clone_motion_requests WHERE id = ? AND clone_id = ? AND owner_id = ? LIMIT 1", [input.requestId, KINGCAM_CLONE_ID, input.ownerId]);
  if (!rows[0]) throw new Error("KingCam motion proof request was not found.");
  const accepted = Boolean(input.accepted) && input.overallScore >= 90;
  const review = { accepted, overallScore: input.overallScore, notes: input.notes, reviewedAt: new Date().toISOString(), gates: QUALITY_GATES };
  await rawExec("UPDATE kingcam_clone_motion_requests SET state = ?, review_json = ?, updated_at = NOW() WHERE id = ?", [accepted ? "accepted" : "rejected", json(review), input.requestId]);
  await recordKingcamCloneMemory({ ownerId: input.ownerId, kind: "quality_review", room: "KingCam full-body cinematic motion", payload: { requestId: input.requestId, ...review } });
  return { accepted, review };
}

export const KINGCAM_CLONE_TRUTH_LIBRARY = TRUTH_LIBRARY;
export const KINGCAM_CLONE_QUALITY_GATES = QUALITY_GATES;
export const KINGCAM_CLONE_HERO_REFERENCE = KINGCAM_HERO_REFERENCE;
