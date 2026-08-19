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
  createGovernedKingcamReplicateWanAnimateDraft,
  createGovernedKingcamGoEnhanceRealPerformanceDraft,
  createGovernedKingcamActionImitationV2Draft,
  createGovernedKingcamKlingV3MotionDraft,
  createGovernedKingcamKlingOmniRealGaitDraft,
  getGovernedPolloJob,
  getGovernedPolloConfig,
  isGovernedPolloExecutionEnabled,
  submitGovernedPolloJob,
} from "./governedPolloService";

const OWNER_IDS = new Set([6, 33]);
const KINGCAM_CLONE_ID = "kingcam-founder-clone";
const KINGCAM_HERO_REFERENCE = "https://creatorvault.live/videos/kingcam-hero-cam.mp4";
const KINGCAM_FULL_BODY_IMAGE = "https://creatorvault.live/images/kingcam-profile/kingcam-crown-lounge.webp";

type CloneMemoryKind = "tour_started" | "tour_room_viewed" | "owner_directive" | "motion_proof_planned" | "quality_review" | "performance_capture_registered" | "training_library_synced" | "digital_performer_readiness" | "gold_standard_source_verified";
type MotionRequestState = "planned" | "approved" | "submitted" | "provider_complete" | "accepted" | "rejected" | "failed";
type KingcamTrainingRole = "identity_reference" | "wardrobe_reference" | "voice_reference" | "performance_candidate" | "movement_driver" | "rejected";
type KingcamSourceKind = "real_camera" | "synthetic_or_generated" | "unknown";
type KingcamBenchmarkCaseStatus = "awaiting_source_capture" | "source_verified" | "ready_for_governed_benchmark" | "watchable_output_required" | "accepted" | "rejected";
// The verified KingCam motion source is 5.04 seconds; this proof must never request a longer output.
const KINGCAM_FULL_BODY_PROOF_DURATION_SECONDS = 15;
const KINGCAM_FULL_BODY_PROOF_MANUAL_CREDIT_CAP = 2;
const KINGCAM_FULL_BODY_CORRECTIVE_MODEL = "replicate/bytedance/omni-human";
const KINGCAM_WAN_FULL_BODY_IMAGE = "https://creatorvault.live/images/kingcam-profile/kingcam-crown-lounge-reference.png";
const KINGCAM_WAN_SPOKEN_AUDIO = "https://creatorvault.live/uploads/content-vault/kingcam-voice-tour-v1/entry.mp3";
const KINGCAM_WAN_ANIMATE_REAL_DRIVER_IMAGE = "https://creatorvault.live/images/kingcam-profile/kingcam-crown-lounge-reference.png";
const KINGCAM_WAN_ANIMATE_REAL_DRIVER_URL = "https://creatorvault.live/uploads/content-vault/9c47c6e0-a7ce-4e85-89a8-25c2f98d2980/kingcam-real-gait-driver-0129-0136.mp4";
const KINGCAM_WAN_ANIMATE_REAL_DRIVER_DURATION_SECONDS = 7;
const KINGCAM_WAN_ANIMATE_REAL_DRIVER_HARD_SPEND_CAP_USD = 2;
const KINGCAM_GOENHANCE_REAL_PERFORMANCE_HARD_CREDIT_CAP = 105;
const KINGCAM_GOENHANCE_REAL_PERFORMANCE_STYLE_CODE = "mx-v2v";
const KINGCAM_ACTION_IMITATION_V2_HARD_CREDIT_CAP = 35;
const KINGCAM_ACTION_IMITATION_V2_QUOTED_COST_USD = 2.1;
const KINGCAM_KLING_V3_MOTION_HARD_CREDIT_CAP = 98;
const KINGCAM_KLING_V3_MOTION_QUOTED_COST_USD = 5.88;
const KINGCAM_KLING_OMNI_REAL_GAIT_HARD_CREDIT_CAP = 11.13;
const KINGCAM_KLING_OMNI_REAL_GAIT_QUOTED_COST_USD = 0.667;
const KINGCAM_GOENHANCE_REAL_PERFORMANCE_GATES = [
  "The result visibly shows real KingCam in continuous full-body movement from crown to shoes, retaining the original seven-second gait timing and wide framing.",
  "KingCam’s recognizable face, beard, build, burgundy suit with gold embroidery, crown, jewelry, black shoes, right-hand cigar, and lounge geometry remain intact without substitution.",
  "Hands, feet, posture, gait, wardrobe edges, cigar, jewelry, and shoe details remain natural across the moving clip; any morphing, frozen motion, crop, spin, or anatomy failure is an automatic rejection.",
  "This is a real-performance video-to-video preservation proof, not a synthetic identity-transfer or talking-clone claim. It can only become a private Clone Command demonstration after a watchable review accepts it.",
] as const;
const execFileAsync = promisify(execFile);
const KINGCAM_GUIDE_VOICE_ID = "rwc11bXCBw5KydM4avHE";
const KINGCAM_GUIDE_VOICE_MODEL = "eleven_multilingual_v2";
const KINGCAM_GUIDE_AUDIO_ROOT = "/root/uploads/content-vault/kingcam-voice-tour-v1";
const KINGCAM_GUIDE_AUDIO_URL_ROOT = "https://creatorvault.live/uploads/content-vault/kingcam-voice-tour-v1";
const KINGCAM_FULL_BODY_DIRECT_AUDIO_KEY = "happyhorse-fullbody-proof";
const KINGCAM_FULL_BODY_DIRECT_AUDIO_URL = `${KINGCAM_GUIDE_AUDIO_URL_ROOT}/${KINGCAM_FULL_BODY_DIRECT_AUDIO_KEY}.mp3`;
const KINGCAM_FULL_BODY_DIRECT_SCRIPT = "Welcome to CreatorVault. I am KingCam. This is where creators own the media, move with power, and turn attention into a real machine. Your voice, your visuals, your story, your money. Watch what happens when all of it moves together.";

const CURATED_KINGCAM_TRAINING_AUDITS: Array<{
  mediaUrl: string;
  sourceKind: KingcamSourceKind;
  trainingRole: KingcamTrainingRole;
  fullBodySeconds: number;
  naturalMotionScore: number;
  speechSyncScore: number;
  driverReady: boolean;
  defects: string;
  evidence: string;
}> = [
  {
    mediaUrl: "https://creatorvault.live/uploads/renders/2a16695b-fd71-40b8-95ed-92f3de6755eb/vaultx-edit-2a16695b-fd71-40b8-95ed-92f3de6755eb.mp4",
    sourceKind: "synthetic_or_generated",
    trainingRole: "rejected",
    fullBodySeconds: 6,
    naturalMotionScore: 15,
    speechSyncScore: 15,
    driverReady: false,
    defects: "Hand and microphone morphing, shifting clothing details, floaty motion, and weak mouth timing.",
    evidence: "Observed six-second synthetic KingCam asset. It is not a real human performance source and cannot drive body motion.",
  },
  {
    mediaUrl: "https://creatorvault.live/uploads/renders/f729fe42-3373-44f3-80a8-a26e8337b0ac/vaultx-edit-f729fe42-3373-44f3-80a8-a26e8337b0ac.mp4",
    sourceKind: "synthetic_or_generated",
    trainingRole: "rejected",
    fullBodySeconds: 2,
    naturalMotionScore: 25,
    speechSyncScore: 0,
    driverReady: false,
    defects: "Synthetic turn morphing, background inconsistency, and unstable smoke physics.",
    evidence: "Observed synthetic trailer asset. It cannot become a natural KingCam movement driver.",
  },
  {
    mediaUrl: "https://creatorvault.live/uploads/renders/47db10e1-be6a-4fcc-9d16-b751c54c1488/vaultx-edit-47db10e1-be6a-4fcc-9d16-b751c54c1488.mp4",
    sourceKind: "synthetic_or_generated",
    trainingRole: "rejected",
    fullBodySeconds: 4.4,
    naturalMotionScore: 45,
    speechSyncScore: 0,
    driverReady: false,
    defects: "Synthetic glitch effects, text overlays, rapid spin transitions, and non-natural motion.",
    evidence: "Observed branded synthetic visual. It is excluded from clone motion training.",
  },
  {
    mediaUrl: "https://creatorvault.live/uploads/content-vault/2d88b768-13b1-4ab0-a183-dd19ea3b4718/CreatorVault-Demo-Source--KingCam-Identity-Reference.mp4",
    sourceKind: "synthetic_or_generated",
    trainingRole: "identity_reference",
    fullBodySeconds: 4,
    naturalMotionScore: 70,
    speechSyncScore: 0,
    driverReady: false,
    defects: "Minor morphing and hand instability during rapid camera movement; no live performance audio.",
    evidence: "Observed four-second synthetic identity asset. It can anchor approved look and framing, never body movement.",
  },
];

const SUPPLIED_REAL_KINGCAM_TRAINING_AUDITS: Array<{
  fileName: string;
  trainingRole: KingcamTrainingRole;
  fullBodySeconds: number;
  naturalMotionScore: number;
  speechSyncScore: number;
  driverReady: boolean;
  defects: string;
  evidence: string;
}> = [
  {
    fileName: "RPReplay_Final1633698547.mov",
    trainingRole: "rejected",
    fullBodySeconds: 0,
    naturalMotionScore: 0,
    speechSyncScore: 0,
    driverReady: false,
    defects: "Static screen-recorded image collage with no usable human motion, gait, gesture, or direct delivery.",
    evidence: "Cameron-supplied material was screened before intake. It is retained as a documented excluded source, never as identity, voice, body, or motion training.",
  },
  {
    fileName: "dff14e32-fc76-494e-a5fe-2d0e2b93b593.mp4",
    trainingRole: "identity_reference",
    fullBodySeconds: 0,
    naturalMotionScore: 45,
    speechSyncScore: 0,
    driverReady: false,
    defects: "No continuous crown-to-shoes full-body performance interval and no clean direct speech.",
    evidence: "Cameron-supplied real-camera footage with verified KingCam presence. It can contribute limited identity context only and is forbidden as a clone motion or speaking-performance driver.",
  },
  {
    fileName: "a61a35de-243b-4b6a-8128-08ea7087d2fd.mp4",
    trainingRole: "performance_candidate",
    fullBodySeconds: 16.7,
    naturalMotionScore: 80,
    speechSyncScore: 0,
    driverReady: false,
    defects: "Rear-facing body view; face is obscured and there is no direct speech.",
    evidence: "Cameron-supplied real-camera clip with sustained natural full-body walking. It teaches lower-body gait and weight transfer only; it cannot yet drive a speaking KingCam clone.",
  },
  {
    fileName: "IMG_9898.MOV",
    trainingRole: "voice_reference",
    fullBodySeconds: 0,
    naturalMotionScore: 50,
    speechSyncScore: 90,
    driverReady: false,
    defects: "Medium/close framing excludes feet and complete body movement.",
    evidence: "Cameron-supplied real-camera direct-speech clip. It teaches face-to-voice timing and direct delivery only; it cannot become a full-body movement driver.",
  },
  {
    fileName: "bff8f30c-4116-4cfa-98b4-40c5cb7cd053.mp4",
    trainingRole: "performance_candidate",
    fullBodySeconds: 62,
    naturalMotionScore: 85,
    speechSyncScore: 0,
    driverReady: false,
    defects: "No direct speech from KingCam in the usable full-body movement interval.",
    evidence: "Cameron-supplied real-camera clip with 62 continuous seconds of clear full-body natural movement, visible hands, and feet. It is the strongest current gait and body-performance reference, but it cannot alone drive a speaking clone.",
  },
  {
    fileName: "43df2204-c955-4b9e-968a-3bde65e30fbe.mp4",
    trainingRole: "voice_reference",
    fullBodySeconds: 0,
    naturalMotionScore: 50,
    speechSyncScore: 95,
    driverReady: false,
    defects: "Close selfie framing excludes continuous crown-to-shoes body movement.",
    evidence: "Cameron-supplied real-camera direct-speech clip. It is the strongest current voice, face, and mouth-performance reference, but it cannot alone drive a full-body clone.",
  },
  {
    fileName: "IMG_9741.MOV",
    trainingRole: "performance_candidate",
    fullBodySeconds: 0,
    naturalMotionScore: 95,
    speechSyncScore: 0,
    driverReady: false,
    defects: "Continuous camera tilts split feet from upper body and there is no direct speech.",
    evidence: "Cameron-supplied real-camera clip with clear natural feet, hands, posture, and body detail. It teaches body mechanics only; it cannot become a full speaking clone driver.",
  },
];

const KINGCAM_GOLD_STANDARD_CASES: Array<{
  caseKey: string;
  title: string;
  motionFocus: string;
  requiredEvidence: string[];
}> = [
  { caseKey: "standing-full-body", title: "Standing full body", motionFocus: "Crown-to-shoes identity, proportions, posture, wardrobe anchors, and stable framing.", requiredEvidence: ["single real KingCam subject", "face, hands, feet and full body visible", "continuous 5+ second source"] },
  { caseKey: "walk-toward-camera", title: "Walking toward camera", motionFocus: "Forward locomotion, stride, weight transfer, face continuity, hands, shoes, and temporal stability.", requiredEvidence: ["single continuous take", "full body and face visible", "stable camera"] },
  { caseKey: "walk-away-and-turn", title: "Walking away and turning", motionFocus: "Back/side/body continuity, turn mechanics, wardrobe geometry, and re-identification after rotation.", requiredEvidence: ["single continuous take", "crown-to-shoes visible", "turn returns face into view"] },
  { caseKey: "side-profile", title: "Side profile", motionFocus: "Profile identity, silhouette, beard, body shape, and orientation consistency.", requiredEvidence: ["single continuous take", "clear profile", "full body visible"] },
  { caseKey: "arms-and-hands", title: "Arms and hands", motionFocus: "Finger count, hand anatomy, jewelry/prop preservation, shoulder mechanics, and gesture timing.", requiredEvidence: ["hands visible throughout", "single subject", "no rapid cuts"] },
  { caseKey: "sit-and-rise", title: "Sitting and standing", motionFocus: "Hip/waist continuity, knees, balance, body proportion, and chair/environment relationship.", requiredEvidence: ["seat visible", "full body visible", "single continuous take"] },
  { caseKey: "torso-rotation", title: "Torso rotation", motionFocus: "Chest, waist, jacket geometry, chains, shoulders, and identity across rotational movement.", requiredEvidence: ["full torso visible", "single continuous take", "face returns to camera"] },
  { caseKey: "controlled-performance", title: "Controlled performance movement", motionFocus: "Natural performance energy without freezes, spins, plastic motion, or anatomy failure.", requiredEvidence: ["moderate natural movement", "full body visible", "single continuous take"] },
  { caseKey: "camera-relationship", title: "Camera relationship", motionFocus: "Stable subject framing and environment geometry while the real camera and body move together.", requiredEvidence: ["stable or intentionally simple camera", "full body visible", "no shot changes"] },
  { caseKey: "lighting-and-wardrobe", title: "Lighting and wardrobe variation", motionFocus: "Face, skin, wardrobe, crown/jewelry, and prop continuity under a distinct real recording condition.", requiredEvidence: ["verified real KingCam", "wardrobe anchors documented", "single continuous take"] },
  { caseKey: "longer-continuity", title: "Longer temporal sequence", motionFocus: "Identity, body, environment, and movement consistency beyond the shortest benchmark window.", requiredEvidence: ["10+ seconds continuous", "face/hands/feet visible", "no cuts"] },
];

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

const WAN_ANIMATE_REAL_DRIVER_QUALITY_GATES = [
  "KingCam remains visibly full body from crown to shoes for the working gait, without a talking-head crop or a frozen still image.",
  "The output visibly transfers the real driver’s grounded walk, weight shifts, hand movement, framing, and pacing rather than inventing a spin, pose, or unrelated camera movement.",
  "Face, beard, skin tone, body build, crown, burgundy wardrobe, jewelry, shoes, and cigar-hand continuity remain recognizable from the approved KingCam identity source.",
  "Hands, feet, gait, posture, clothing edges, environment geometry, and camera movement remain natural; any body, shoe, jewelry, cigar, or anatomy morphing is an automatic rejection.",
  "This silent gait proof remains clone-only and is never presented as a talking clone, creator result, or Body Cinema output.",
  "No output becomes public KingCam media until human review accepts a watchable result; every rejection remains a permanent provider-learning record.",
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

export async function preflightKingcamReplicateWanAnimate(ownerId: number): Promise<{
  available: boolean;
  provider: "replicate";
  model: "wan-video/wan-2.2-animate-animation";
  versionId: string | null;
  inputFields: string[];
  inputSchema: Record<string, unknown> | null;
  acceptsRealDriverVideo: boolean;
  advertisedPricing: Record<string, unknown> | null;
  exactCostAvailable: boolean;
  reason: string | null;
  cloneOnly: true;
}> {
  assertOwner(ownerId);
  const token = String(process.env.REPLICATE_API_TOKEN || "").trim();
  const model = "wan-video/wan-2.2-animate-animation" as const;
  if (!token) {
    return { available: false, provider: "replicate", model, versionId: null, inputFields: [], inputSchema: null, acceptsRealDriverVideo: false, advertisedPricing: null, exactCostAvailable: false, reason: "The existing Replicate clone-only account token is not available in this runtime.", cloneOnly: true };
  }
  const response = await fetch(`https://api.replicate.com/v1/models/${model}`, {
    headers: { Authorization: `Token ${token}`, Accept: "application/json" },
  });
  if (!response.ok) {
    return { available: false, provider: "replicate", model, versionId: null, inputFields: [], inputSchema: null, acceptsRealDriverVideo: false, advertisedPricing: null, exactCostAvailable: false, reason: `The existing Replicate clone-only account returned ${response.status} while reading Wan Animate.`, cloneOnly: true };
  }
  const payload = (await response.json().catch(() => ({}))) as Record<string, any>;
  const latestVersion = payload.latest_version && typeof payload.latest_version === "object" ? payload.latest_version as Record<string, any> : {};
  const inputProperties = latestVersion.openapi_schema?.components?.schemas?.Input?.properties;
  const inputFields = inputProperties && typeof inputProperties === "object" ? Object.keys(inputProperties).sort() : [];
  const inputSchema = inputProperties && typeof inputProperties === "object" ? inputProperties as Record<string, unknown> : null;
  const driverField = inputFields.some((field) => /video|driv|motion/i.test(field));
  const advertisedPricing = payload.pricing && typeof payload.pricing === "object" ? payload.pricing as Record<string, unknown> : null;
  return {
    available: driverField,
    provider: "replicate",
    model,
    versionId: typeof latestVersion.id === "string" ? latestVersion.id : null,
    inputFields,
    inputSchema,
    acceptsRealDriverVideo: driverField,
    advertisedPricing,
    exactCostAvailable: Boolean(advertisedPricing && Object.keys(advertisedPricing).length),
    reason: driverField ? null : "Wan Animate is not exposed to the existing clone-only account with an actual driver-video input.",
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
  await rawExec(`CREATE TABLE IF NOT EXISTS kingcam_clone_benchmark_cases (
    id CHAR(36) PRIMARY KEY,
    clone_id VARCHAR(96) NOT NULL,
    owner_id BIGINT NOT NULL,
    case_key VARCHAR(96) NOT NULL,
    title VARCHAR(191) NOT NULL,
    motion_focus TEXT NOT NULL,
    required_evidence_json LONGTEXT NOT NULL,
    status VARCHAR(48) NOT NULL,
    source_media_asset_id CHAR(36) NULL,
    source_evidence_id VARCHAR(96) NULL,
    selected_model_key VARCHAR(191) NULL,
    benchmark_reference TEXT NULL,
    acceptance_note TEXT NULL,
    created_at DATETIME NOT NULL,
    updated_at DATETIME NOT NULL,
    UNIQUE KEY kingcam_clone_benchmark_case_unique (clone_id, owner_id, case_key),
    KEY kingcam_clone_benchmark_case_status (clone_id, owner_id, status, updated_at)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
  await rawExec(`CREATE TABLE IF NOT EXISTS kingcam_clone_training_assets (
    id CHAR(36) PRIMARY KEY,
    clone_id VARCHAR(96) NOT NULL,
    owner_id BIGINT NOT NULL,
    media_asset_id CHAR(36) NOT NULL,
    media_url TEXT NOT NULL,
    media_name VARCHAR(255) NOT NULL,
    source_kind VARCHAR(48) NOT NULL,
    training_role VARCHAR(48) NOT NULL,
    full_body_seconds DECIMAL(10,3) NOT NULL DEFAULT 0,
    natural_motion_score INT NOT NULL DEFAULT 0,
    speech_sync_score INT NOT NULL DEFAULT 0,
    driver_ready TINYINT NOT NULL DEFAULT 0,
    body_cinema_eligible TINYINT NOT NULL DEFAULT 0,
    evidence TEXT NOT NULL,
    defects TEXT NULL,
    analysis_json LONGTEXT NOT NULL,
    assessment_source VARCHAR(96) NOT NULL,
    created_at DATETIME NOT NULL,
    updated_at DATETIME NOT NULL,
    UNIQUE KEY kingcam_clone_training_asset_unique (clone_id, owner_id, media_asset_id),
    KEY kingcam_clone_training_owner_lookup (clone_id, owner_id, training_role, driver_ready, updated_at)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
}

function identityVault() {
  return {
    cloneId: KINGCAM_CLONE_ID,
    approvedFullBodyImage: KINGCAM_FULL_BODY_IMAGE,
    approvedFullBodyMotionReference: null,
    approvedIdentityAssets: [
      "/images/kingcam-profile/kingcam-crown-lounge.webp",
      "/images/kingcam-profile/kingcam-crown-hall.webp",
    ],
    excludedFromMotionDriving: [
      "/videos/kingcam-hero-cam.mp4",
      "/videos/platform/clone-command-hero.mp4",
    ],
    identityLaw: "Preserve approved KingCam face, body build, beard, skin tone, wardrobe anchors, jewelry, crown styling when supplied, and full-body presence. Never substitute an unrelated man or generic avatar. A synthetic or visually corrupted identity visual may support neither performance driving nor full-body clone proof.",
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
  const vault = identityVault();
  const voice = voicePolicy();
  const motion = motionPolicy();
  const quality = { gates: QUALITY_GATES, reviewRequired: true, noAutomaticPublicPlacement: true };
  if (rows[0]) {
    if (String(rows[0].truth_revision || "") !== "kingcam-digital-performer-v2") {
      await rawExec(`UPDATE kingcam_clone_operating_profiles
        SET identity_vault_json = ?, voice_policy_json = ?, motion_policy_json = ?, quality_policy_json = ?, truth_revision = 'kingcam-digital-performer-v2', updated_at = NOW()
        WHERE clone_id = ? AND owner_id = ?`,
        [json(vault), json(voice), json(motion), json(quality), KINGCAM_CLONE_ID, ownerId]);
      return (await rawQuery<any>("SELECT * FROM kingcam_clone_operating_profiles WHERE clone_id = ? LIMIT 1", [KINGCAM_CLONE_ID]))[0];
    }
    return rows[0];
  }
  await rawExec(`INSERT INTO kingcam_clone_operating_profiles
    (clone_id, owner_id, status, identity_vault_json, voice_policy_json, motion_policy_json, quality_policy_json, truth_revision, created_at, updated_at)
    VALUES (?, ?, 'operational-spine', ?, ?, ?, ?, 'kingcam-digital-performer-v2', NOW(), NOW())`,
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

async function upsertKingcamTrainingAsset(input: {
  ownerId: number;
  mediaAssetId: string;
  mediaUrl: string;
  mediaName: string;
  sourceKind: KingcamSourceKind;
  trainingRole: KingcamTrainingRole;
  fullBodySeconds: number;
  naturalMotionScore: number;
  speechSyncScore: number;
  driverReady: boolean;
  evidence: string;
  defects: string | null;
  assessmentSource: string;
  analysis: Record<string, unknown>;
}) {
  await ensureKingcamCloneOperatingSystem();
  const id = randomUUID();
  await rawExec(
    `INSERT INTO kingcam_clone_training_assets
      (id, clone_id, owner_id, media_asset_id, media_url, media_name, source_kind, training_role, full_body_seconds, natural_motion_score, speech_sync_score, driver_ready, body_cinema_eligible, evidence, defects, analysis_json, assessment_source, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?, ?, NOW(), NOW())
     ON DUPLICATE KEY UPDATE
       media_url = VALUES(media_url), media_name = VALUES(media_name), source_kind = VALUES(source_kind), training_role = VALUES(training_role), full_body_seconds = VALUES(full_body_seconds), natural_motion_score = VALUES(natural_motion_score), speech_sync_score = VALUES(speech_sync_score), driver_ready = VALUES(driver_ready), body_cinema_eligible = 0, evidence = VALUES(evidence), defects = VALUES(defects), analysis_json = VALUES(analysis_json), assessment_source = VALUES(assessment_source), updated_at = NOW()`,
    [
      id, KINGCAM_CLONE_ID, input.ownerId, input.mediaAssetId, input.mediaUrl, input.mediaName,
      input.sourceKind, input.trainingRole, Number(input.fullBodySeconds.toFixed(3)), input.naturalMotionScore,
      input.speechSyncScore, input.driverReady ? 1 : 0, input.evidence, input.defects, json(input.analysis), input.assessmentSource,
    ],
  );
}

export async function getKingcamCloneTrainingLibrary(ownerId: number) {
  assertOwner(ownerId);
  await ensureKingcamCloneOperatingSystem();
  const rows = await rawQuery<any>(
    `SELECT media_asset_id, media_url, media_name, source_kind, training_role, full_body_seconds, natural_motion_score, speech_sync_score, driver_ready, body_cinema_eligible, evidence, defects, analysis_json, assessment_source, updated_at
     FROM kingcam_clone_training_assets
     WHERE clone_id = ? AND owner_id = ?
     ORDER BY driver_ready DESC, natural_motion_score DESC, updated_at DESC`,
    [KINGCAM_CLONE_ID, ownerId],
  );
  const assets = rows.map((row) => ({
    mediaAssetId: String(row.media_asset_id), mediaUrl: String(row.media_url), mediaName: String(row.media_name),
    sourceKind: String(row.source_kind) as KingcamSourceKind, trainingRole: String(row.training_role) as KingcamTrainingRole,
    fullBodySeconds: Number(row.full_body_seconds || 0), naturalMotionScore: Number(row.natural_motion_score || 0),
    speechSyncScore: Number(row.speech_sync_score || 0), driverReady: Boolean(row.driver_ready),
    bodyCinemaEligible: false, evidence: String(row.evidence || ""), defects: row.defects ? String(row.defects) : null,
    assessmentSource: String(row.assessment_source || ""), analysis: parseJson<Record<string, unknown>>(row.analysis_json, {}),
    updatedAt: row.updated_at,
  }));
  return {
    assets,
    approvedMovementDriver: assets.find((asset) => asset.driverReady && asset.trainingRole === "movement_driver") || null,
    summary: {
      total: assets.length,
      identityReferences: assets.filter((asset) => asset.trainingRole === "identity_reference").length,
      rejectedSynthetic: assets.filter((asset) => asset.trainingRole === "rejected").length,
      realPerformanceCandidates: assets.filter((asset) => asset.trainingRole === "performance_candidate").length,
      motionDriverReady: assets.some((asset) => asset.driverReady && asset.trainingRole === "movement_driver"),
    },
  };
}

async function seedKingcamGoldStandardBenchmarkCases(ownerId: number): Promise<void> {
  await ensureProfile(ownerId);
  for (const definition of KINGCAM_GOLD_STANDARD_CASES) {
    await rawExec(
      `INSERT INTO kingcam_clone_benchmark_cases
        (id, clone_id, owner_id, case_key, title, motion_focus, required_evidence_json, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'awaiting_source_capture', NOW(), NOW())
       ON DUPLICATE KEY UPDATE title = VALUES(title), motion_focus = VALUES(motion_focus), required_evidence_json = VALUES(required_evidence_json), updated_at = NOW()`,
      [randomUUID(), KINGCAM_CLONE_ID, ownerId, definition.caseKey, definition.title, definition.motionFocus, json(definition.requiredEvidence)],
    );
  }
}

export async function getKingcamGoldStandardBenchmarkLibrary(ownerId: number) {
  assertOwner(ownerId);
  await seedKingcamGoldStandardBenchmarkCases(ownerId);
  const rows = await rawQuery<any>(
    `SELECT case_key, title, motion_focus, required_evidence_json, status, source_media_asset_id, source_evidence_id, selected_model_key, benchmark_reference, acceptance_note, updated_at
     FROM kingcam_clone_benchmark_cases
     WHERE clone_id = ? AND owner_id = ?
     ORDER BY case_key ASC`,
    [KINGCAM_CLONE_ID, ownerId],
  );
  const cases = rows.map((row) => ({
    caseKey: String(row.case_key), title: String(row.title), motionFocus: String(row.motion_focus),
    requiredEvidence: parseJson<string[]>(row.required_evidence_json, []),
    status: String(row.status) as KingcamBenchmarkCaseStatus,
    sourceMediaAssetId: row.source_media_asset_id ? String(row.source_media_asset_id) : null,
    sourceEvidenceId: row.source_evidence_id ? String(row.source_evidence_id) : null,
    selectedModelKey: row.selected_model_key ? String(row.selected_model_key) : null,
    benchmarkReference: row.benchmark_reference ? String(row.benchmark_reference) : null,
    acceptanceNote: row.acceptance_note ? String(row.acceptance_note) : null,
    updatedAt: row.updated_at,
  }));
  return {
    benchmarkVersion: "kingcam-gold-standard-v1",
    rule: "A case definition is not benchmark evidence. A case stays waiting until it has a verified source, an eligible governed model run, a watchable output, visual review, and a recorded accept-or-reject result in the canonical Creation Model Registry.",
    cases,
    summary: {
      total: cases.length,
      awaitingSource: cases.filter((entry) => entry.status === "awaiting_source_capture").length,
      sourceVerified: cases.filter((entry) => entry.status === "source_verified" || entry.status === "ready_for_governed_benchmark").length,
      accepted: cases.filter((entry) => entry.status === "accepted").length,
      rejected: cases.filter((entry) => entry.status === "rejected").length,
    },
  };
}

export async function bindKingcamArmsHandsBenchmarkSource(input: { ownerId: number; mediaAssetId: string; evidenceReference: string }) {
  assertOwner(input.ownerId);
  await seedKingcamGoldStandardBenchmarkCases(input.ownerId);
  const mediaAssetId = String(input.mediaAssetId || "").trim();
  const evidenceReference = String(input.evidenceReference || "").trim();
  if (!mediaAssetId || !evidenceReference) throw new Error("KingCam needs the exact CreatorVault media receipt and the completed visual-inspection reference.");
  if (evidenceReference.length > 96) throw new Error("KingCam's benchmark evidence key must stay within the case record limit.");
  const assetRows = await rawQuery<any>(
    `SELECT id, public_url, file_name, original_name, duration, width, height, status, created_by_feature
     FROM media_assets
     WHERE id = ? AND user_id = ? AND asset_type = 'video' AND status = 'ready'
     LIMIT 1`,
    [mediaAssetId, input.ownerId],
  );
  const asset = assetRows[0];
  if (!asset) throw new Error("That KingCam performance source is not a ready CreatorVault video.");
  if (String(asset.created_by_feature || "") !== "kingcam_performance_capture") {
    throw new Error("Only a protected KingCam performance capture can enter the Gold Standard library.");
  }
  if (Number(asset.duration || 0) < 10 || Number(asset.width || 0) < 720 || Number(asset.height || 0) < 720) {
    throw new Error("The arms-and-hands benchmark needs a clear CreatorVault performance take of at least ten seconds at 720p or better.");
  }
  const caseRows = await rawQuery<any>(
    `SELECT id, status FROM kingcam_clone_benchmark_cases
     WHERE clone_id = ? AND owner_id = ? AND case_key = 'arms-and-hands'
     LIMIT 1`,
    [KINGCAM_CLONE_ID, input.ownerId],
  );
  const benchmarkCase = caseRows[0];
  if (!benchmarkCase) throw new Error("The KingCam arms-and-hands benchmark case is unavailable.");
  if (["accepted", "rejected"].includes(String(benchmarkCase.status))) {
    throw new Error("A reviewed arms-and-hands case cannot be replaced without a new explicit benchmark case.");
  }
  await rawExec(
    `UPDATE kingcam_clone_benchmark_cases
     SET status = 'source_verified', source_media_asset_id = ?, source_evidence_id = ?,
         selected_model_key = NULL, benchmark_reference = NULL,
         acceptance_note = 'Source only: a verified real KingCam hands-and-props performance is ready for a separately governed one-output benchmark. No provider output exists and this case is not accepted.',
         updated_at = NOW()
     WHERE id = ?`,
    [mediaAssetId, evidenceReference, String(benchmarkCase.id)],
  );
  await recordKingcamCloneMemory({
    ownerId: input.ownerId,
    kind: "gold_standard_source_verified",
    room: "KingCam Gold Standard",
    payload: {
      caseKey: "arms-and-hands",
      mediaAssetId,
      mediaUrl: String(asset.public_url),
      mediaName: String(asset.file_name || asset.original_name || "KingCam performance source"),
      evidenceReference,
      cloneOnly: true,
      bodyCinemaEligible: false,
      providerTaskCreated: false,
      acceptedResultClaimed: false,
    },
  });
  return { caseKey: "arms-and-hands", mediaAssetId, sourceVerified: true, library: await getKingcamGoldStandardBenchmarkLibrary(input.ownerId) };
}

export async function getKingcamDigitalPerformerReadiness(ownerId: number) {
  assertOwner(ownerId);
  const commandCenter = await getKingcamCloneOperatingSystem(ownerId);
  const trainingLibrary = await getKingcamCloneTrainingLibrary(ownerId);
  const benchmarkLibrary = await getKingcamGoldStandardBenchmarkLibrary(ownerId);
  const motionDriver = trainingLibrary.approvedMovementDriver;
  const acceptedMotionProofs = commandCenter.motionRequests.filter((request) => request.state === "accepted");
  const realPerformanceAssets = trainingLibrary.assets.filter((asset) => asset.sourceKind === "real_camera" && asset.trainingRole !== "rejected");
  const identityAssets = trainingLibrary.assets.filter((asset) => asset.trainingRole === "identity_reference");
  const directSpeechAssets = trainingLibrary.assets.filter((asset) => asset.trainingRole === "voice_reference");
  const status = motionDriver
    ? "ready_for_one_governed_motion_benchmark"
    : "blocked_until_a_real_full_body_natural_motion_driver_is_verified";
  const layers = [
    {
      id: "identity_library",
      status: identityAssets.length > 0 ? "evidence_ready" : "incomplete",
      truth: "Approved identity references are held separately from motion-driving eligibility. The legacy hero visual is not an approved motion driver.",
      evidenceCount: identityAssets.length,
    },
    {
      id: "performance_capture",
      status: realPerformanceAssets.length > 0 ? "partially_ready" : "incomplete",
      truth: "Real-camera KingCam performance references are preserved clone-only and may contribute specialized evidence; no source is silently promoted into a full-body driver.",
      evidenceCount: realPerformanceAssets.length,
    },
    {
      id: "motion_transfer",
      status: motionDriver ? "ready_for_one_governed_motion_benchmark" : "blocked",
      truth: motionDriver
        ? "One separately governed motion benchmark may be considered with the verified driver only."
        : "No paid motion-transfer request may be created until a real continuous crown-to-shoes natural-motion KingCam driver passes review.",
      motionDriver: motionDriver ? { mediaAssetId: motionDriver.mediaAssetId, mediaUrl: motionDriver.mediaUrl } : null,
    },
    {
      id: "voice_and_delivery",
      status: directSpeechAssets.length > 0 ? "evidence_ready" : "incomplete",
      truth: "Direct speech and voice timing are separate evidence. They do not create a full-body clone by themselves.",
      evidenceCount: directSpeechAssets.length,
    },
    {
      id: "quality_review",
      status: "active",
      truth: "Every output remains rejected until a human review passes identity, wardrobe, anatomy, hands, feet, locomotion, framing, timing, and no-drift gates.",
      acceptedProofs: acceptedMotionProofs.length,
    },
    {
      id: "finishing_and_accepted_media",
      status: acceptedMotionProofs.length > 0 ? "ready_for_owner_reviewed_finishing" : "waits_for_accepted_motion_proof",
      truth: "CreatorVault source-preserving finishing can package an accepted result, but it cannot turn an unaccepted source or failed motion test into a clone claim.",
    },
  ] as const;
  await recordKingcamCloneMemory({
    ownerId,
    kind: "digital_performer_readiness",
    room: "KingCam Digital Performer",
    payload: { status, motionDriverReady: Boolean(motionDriver), acceptedMotionProofs: acceptedMotionProofs.length },
  });
  return {
    status,
    rule: "Creation is not proof. A Digital-Performer claim becomes live only after a real source, one governed eligible motion run, a watchable output, and an accepted quality review.",
    layers,
    providerBoundary: "Provider documentation, estimate responses, and account configuration are not execution proof or accepted media. Only eligible governed runs with watchable accepted outputs may advance.",
    benchmarkLibrary: benchmarkLibrary.summary,
    bodyCinemaBoundary: "KingCam clone-only identity, performance, and motion assets remain excluded from Body Cinema.",
  };
}

export async function syncKingcamCloneTrainingLibrary(ownerId: number) {
  assertOwner(ownerId);
  await ensureProfile(ownerId);
  let registered = 0;
  for (const audit of CURATED_KINGCAM_TRAINING_AUDITS) {
    const rows = await rawQuery<any>(
      `SELECT id, public_url, file_name, original_name
       FROM media_assets
       WHERE user_id = ? AND asset_type = 'video' AND status = 'ready' AND public_url = ?
       LIMIT 1`,
      [ownerId, audit.mediaUrl],
    );
    const asset = rows[0];
    if (!asset) continue;
    await upsertKingcamTrainingAsset({
      ownerId, mediaAssetId: String(asset.id), mediaUrl: String(asset.public_url),
      mediaName: String(asset.file_name || asset.original_name || "KingCam asset"),
      sourceKind: audit.sourceKind, trainingRole: audit.trainingRole, fullBodySeconds: audit.fullBodySeconds,
      naturalMotionScore: audit.naturalMotionScore, speechSyncScore: audit.speechSyncScore, driverReady: audit.driverReady,
      evidence: audit.evidence, defects: audit.defects, assessmentSource: "creatorvault_observed_media_audit_2026_08_18",
      analysis: { ...audit, cloneOnly: true, bodyCinemaEligible: false },
    });
    registered += 1;
  }
  for (const audit of SUPPLIED_REAL_KINGCAM_TRAINING_AUDITS) {
    const rows = await rawQuery<any>(
      `SELECT id, public_url, file_name, original_name
       FROM media_assets
       WHERE user_id = ? AND asset_type = 'video' AND status = 'ready'
         AND created_by_feature = 'kingcam_performance_capture'
         AND (file_name = ? OR original_name = ?)
       LIMIT 1`,
      [ownerId, audit.fileName, audit.fileName],
    );
    const asset = rows[0];
    if (!asset) continue;
    await upsertKingcamTrainingAsset({
      ownerId, mediaAssetId: String(asset.id), mediaUrl: String(asset.public_url),
      mediaName: String(asset.file_name || asset.original_name || audit.fileName),
      sourceKind: "real_camera", trainingRole: audit.trainingRole, fullBodySeconds: audit.fullBodySeconds,
      naturalMotionScore: audit.naturalMotionScore, speechSyncScore: audit.speechSyncScore, driverReady: audit.driverReady,
      evidence: audit.evidence, defects: audit.defects, assessmentSource: "kingcam_supplied_real_media_audit_2026_08_18",
      analysis: { ...audit, cloneOnly: true, bodyCinemaEligible: false, suppliedByOwner: true },
    });
    registered += 1;
  }
  await recordKingcamCloneMemory({
    ownerId, kind: "training_library_synced", room: "KingCam Clone Training Library",
    payload: { registered, source: "creatorvault_observed_media_audit_2026_08_18_and_supplied_real_media", noMotionDriverClaimed: true },
  });
  return { registered, library: await getKingcamCloneTrainingLibrary(ownerId) };
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
  await upsertKingcamTrainingAsset({
    ownerId: input.ownerId, mediaAssetId, mediaUrl: capture.mediaUrl, mediaName: "KingCam direct performance capture",
    sourceKind: "real_camera", trainingRole: "performance_candidate", fullBodySeconds: capture.durationSeconds,
    naturalMotionScore: 0, speechSyncScore: 0, driverReady: false,
    evidence: "Direct owner-recorded KingCam Performance Capture. It awaits motion, framing, speech, hand, and identity inspection before any clone driver claim.",
    defects: null, assessmentSource: "creatorvault_direct_performance_capture_pending_review",
    analysis: { ...capture, pendingHumanPerformanceReview: true },
  });
  await recordKingcamCloneMemory({
    ownerId: input.ownerId,
    kind: "performance_capture_registered",
    room: "KingCam Performance Capture",
    payload: capture,
  });
  return { ready: true, capture, trainingLibrary: await getKingcamCloneTrainingLibrary(input.ownerId) };
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

export async function launchKingcamWanAnimateFullBodyProof(input: { ownerId: number; sceneBrief: string }) {
  assertOwner(input.ownerId);
  const sceneBrief = String(input.sceneBrief || "").trim();
  if (sceneBrief.length < 40 || sceneBrief.length > 1800) {
    throw new Error("KingCam real-driver motion brief must be between 40 and 1800 characters.");
  }

  await ensureProfile(input.ownerId);
  const motionRequestId = randomUUID();
  const fingerprint = createHash("sha256")
    .update(`${KINGCAM_CLONE_ID}:${KINGCAM_WAN_ANIMATE_REAL_DRIVER_IMAGE}:${KINGCAM_WAN_ANIMATE_REAL_DRIVER_URL}:${sceneBrief}:${KINGCAM_WAN_ANIMATE_REAL_DRIVER_HARD_SPEND_CAP_USD}`)
    .digest("hex");
  await rawExec(`INSERT INTO kingcam_clone_motion_requests
    (id, clone_id, owner_id, source_url, source_kind, motion_reference_url, intended_lane, candidate_models_json, scene_brief, hard_credit_cap,
     consent_confirmed, ownership_confirmed, quality_gate_json, state, created_at, updated_at)
    VALUES (?, ?, ?, ?, 'approved_kingcam_full_body_identity_image', ?, 'governed_replicate_wan_animate_real_driver_motion', ?, ?, ?, 1, 1, ?, 'planned', NOW(), NOW())`,
    [
      motionRequestId,
      KINGCAM_CLONE_ID,
      input.ownerId,
      KINGCAM_WAN_ANIMATE_REAL_DRIVER_IMAGE,
      KINGCAM_WAN_ANIMATE_REAL_DRIVER_URL,
      json(["replicate/wan-video/wan-2.2-animate-animation"]),
      sceneBrief,
      KINGCAM_WAN_ANIMATE_REAL_DRIVER_HARD_SPEND_CAP_USD,
      json(WAN_ANIMATE_REAL_DRIVER_QUALITY_GATES),
    ],
  );

  const prompt = [
    "Transfer only the verified real KingCam seven-second gait driver’s full-body locomotion, pacing, weight transfer, restrained hand movement, camera framing, and timing onto the approved KingCam identity image.",
    "Keep KingCam visibly full body from crown to shoes in the exact burgundy velvet suit with gold embroidery, crown, jewelry, black shoes, dark lounge, and cigar naturally held in the right hand.",
    "A genuine moving gait is mandatory: no static pose, frozen frame, talking-head crop, camera spin, extra person, text, identity replacement, wardrobe drift, shoe change, jewelry drift, hand failure, foot failure, cigar morph, or anatomy failure.",
    "This is a silent clone-only real-driver motion proof, never a Body Cinema output and never a talking-clone claim.",
    sceneBrief,
  ].join(" ");

  const drafted = await createGovernedKingcamReplicateWanAnimateDraft({
    creatorId: input.ownerId,
    requestedBy: input.ownerId,
    prompt,
    ownershipConfirmed: true,
    consentConfirmed: true,
    idempotencyKey: `kingcam-wan-animate-real-driver-full-body-proof:${motionRequestId}`,
    requestId: motionRequestId,
    metadata: {
      kingcamCloneId: KINGCAM_CLONE_ID,
      kingcamMotionRequestId: motionRequestId,
      proofClass: "kingcam_real_driver_full_body_gait_transfer_proof",
      providerPreflight: "Authenticated Replicate model metadata verifies Wan Animate accepts the locked character_image and video fields at the verified model version. The provider did not advertise a fixed price in this account response, so the owner-directed test remains one output with a manual $2 internal ceiling and no automatic retry.",
      realDriverDurationSeconds: KINGCAM_WAN_ANIMATE_REAL_DRIVER_DURATION_SECONDS,
      qualityGate: WAN_ANIMATE_REAL_DRIVER_QUALITY_GATES,
    },
  });
  const approved = await approveGovernedPolloJob({
    jobId: drafted.job.id,
    approverId: input.ownerId,
    expectedFingerprint: drafted.job.fingerprint,
    reason: "Owner-directed KingCam Wan Animate real-driver full-body gait-transfer proof. One seven-second output only, locked approved KingCam identity and real gait driver, manual $2 internal maximum, and no automatic retry; reject any frozen movement, crop, identity drift, wardrobe drift, cigar/hand defect, footwear defect, or anatomy failure.",
  });
  await authorizeSingleUseGovernedPolloSubmission({
    jobId: approved.id,
    ownerId: input.ownerId,
    expectedFingerprint: approved.fingerprint,
    hardCreditCap: KINGCAM_WAN_ANIMATE_REAL_DRIVER_HARD_SPEND_CAP_USD,
    expiresInMinutes: 10,
    reason: "One-time KingCam Wan Animate real-driver full-body gait-transfer proof; a manually locked $2 internal ceiling applies because authenticated provider metadata did not expose a fixed price.",
  });
  const submitted = await submitGovernedPolloJob({
    jobId: approved.id,
    workerId: `kingcam-wan-animate-owner-${input.ownerId}`,
  });
  const localState: MotionRequestState = submitted.state === "submitted" ? "submitted" : submitted.state === "failed" ? "failed" : "approved";
  await rawExec(
    "UPDATE kingcam_clone_motion_requests SET state = ?, review_json = ?, updated_at = NOW() WHERE id = ? AND clone_id = ? AND owner_id = ?",
    [
      localState,
      json({
        governedJobId: submitted.id,
        providerJobId: submitted.providerJobId,
        state: submitted.state,
        hardCreditCap: KINGCAM_WAN_ANIMATE_REAL_DRIVER_HARD_SPEND_CAP_USD,
        providerModelPath: "replicate/wan-video/wan-2.2-animate-animation",
        identityImage: KINGCAM_WAN_ANIMATE_REAL_DRIVER_IMAGE,
        motionDriverUrl: KINGCAM_WAN_ANIMATE_REAL_DRIVER_URL,
        motionDriverDurationSeconds: KINGCAM_WAN_ANIMATE_REAL_DRIVER_DURATION_SECONDS,
        qualityGate: WAN_ANIMATE_REAL_DRIVER_QUALITY_GATES,
      }),
      motionRequestId,
      KINGCAM_CLONE_ID,
      input.ownerId,
    ],
  );
  await recordKingcamCloneMemory({
    ownerId: input.ownerId,
    kind: "motion_proof_planned",
    room: "KingCam real-driver full-body motion",
    payload: {
      motionRequestId,
      fingerprint,
      governedJobId: submitted.id,
      providerJobId: submitted.providerJobId,
      state: submitted.state,
      hardCreditCap: KINGCAM_WAN_ANIMATE_REAL_DRIVER_HARD_SPEND_CAP_USD,
      providerModelPath: "replicate/wan-video/wan-2.2-animate-animation",
      identityImage: KINGCAM_WAN_ANIMATE_REAL_DRIVER_IMAGE,
      motionDriverUrl: KINGCAM_WAN_ANIMATE_REAL_DRIVER_URL,
      motionDriverDurationSeconds: KINGCAM_WAN_ANIMATE_REAL_DRIVER_DURATION_SECONDS,
      qualityGate: WAN_ANIMATE_REAL_DRIVER_QUALITY_GATES,
    },
  });
  return {
    motionRequestId,
    governedJob: submitted,
    hardCreditCap: KINGCAM_WAN_ANIMATE_REAL_DRIVER_HARD_SPEND_CAP_USD,
    qualityGate: WAN_ANIMATE_REAL_DRIVER_QUALITY_GATES,
  };
}

export async function launchKingcamKlingOmniRealGaitFullBodyProof(input: { ownerId: number; sceneBrief: string }) {
  assertOwner(input.ownerId);
  const sceneBrief = String(input.sceneBrief || "").trim();
  if (sceneBrief.length < 40 || sceneBrief.length > 1800) throw new Error("KingCam Kling 3 Omni real-gait brief must be between 40 and 1800 characters.");
  await ensureProfile(input.ownerId);
  const motionRequestId = randomUUID();
  await rawExec(`INSERT INTO kingcam_clone_motion_requests (id, clone_id, owner_id, source_url, source_kind, motion_reference_url, intended_lane, candidate_models_json, scene_brief, hard_credit_cap, consent_confirmed, ownership_confirmed, quality_gate_json, state, created_at, updated_at) VALUES (?, ?, ?, ?, 'approved_kingcam_full_body_identity_image', ?, 'governed_pollo_kling_omni_real_gait_mixed_reference', ?, ?, ?, 1, 1, ?, 'planned', NOW(), NOW())`, [motionRequestId, KINGCAM_CLONE_ID, input.ownerId, KINGCAM_WAN_ANIMATE_REAL_DRIVER_IMAGE, KINGCAM_WAN_ANIMATE_REAL_DRIVER_URL, json(["pollo/kling-ai/kling-v3-omni-ref2video"]), sceneBrief, KINGCAM_KLING_OMNI_REAL_GAIT_HARD_CREDIT_CAP, json(WAN_ANIMATE_REAL_DRIVER_QUALITY_GATES)]);
  const drafted = await createGovernedKingcamKlingOmniRealGaitDraft({ creatorId: input.ownerId, requestedBy: input.ownerId, ownershipConfirmed: true, consentConfirmed: true, idempotencyKey: `kingcam-kling-omni-real-gait-proof:${motionRequestId}`, requestId: motionRequestId, metadata: { kingcamCloneId: KINGCAM_CLONE_ID, kingcamMotionRequestId: motionRequestId, proofClass: "kingcam_kling_omni_real_gait_mixed_reference_full_body_proof", sceneBrief, realDriverDurationSeconds: KINGCAM_WAN_ANIMATE_REAL_DRIVER_DURATION_SECONDS, qualityGate: WAN_ANIMATE_REAL_DRIVER_QUALITY_GATES } });
  const approved = await approveGovernedPolloJob({ jobId: drafted.job.id, approverId: input.ownerId, expectedFingerprint: drafted.job.fingerprint, reason: "Owner-directed KingCam Kling 3 Omni image-plus-real-gait proof. One silent seven-second output only; provider quote 11.13 credits as the absolute ceiling; reject every identity, wardrobe, prop, anatomy, gait, crop, spin, text, or environment defect." });
  await authorizeSingleUseGovernedPolloSubmission({ jobId: approved.id, ownerId: input.ownerId, expectedFingerprint: approved.fingerprint, hardCreditCap: KINGCAM_KLING_OMNI_REAL_GAIT_HARD_CREDIT_CAP, expiresInMinutes: 10, reason: "One-time KingCam Kling 3 Omni real-gait proof; the provider estimate is 11.13 credits / $0.667 and that exact quote is the ceiling. No automatic retry." });
  const submitted = await submitGovernedPolloJob({ jobId: approved.id, workerId: `kingcam-kling-omni-real-gait-owner-${input.ownerId}` });
  const localState: MotionRequestState = submitted.state === "submitted" ? "submitted" : submitted.state === "failed" ? "failed" : "approved";
  await rawExec("UPDATE kingcam_clone_motion_requests SET state = ?, review_json = ?, updated_at = NOW() WHERE id = ? AND clone_id = ? AND owner_id = ?", [localState, json({ governedJobId: submitted.id, providerJobId: submitted.providerJobId, state: submitted.state, hardCreditCap: KINGCAM_KLING_OMNI_REAL_GAIT_HARD_CREDIT_CAP, providerQuotedCostUsd: KINGCAM_KLING_OMNI_REAL_GAIT_QUOTED_COST_USD, providerModelPath: "pollo/kling-ai/kling-v3-omni-ref2video", identityImage: KINGCAM_WAN_ANIMATE_REAL_DRIVER_IMAGE, motionDriverUrl: KINGCAM_WAN_ANIMATE_REAL_DRIVER_URL, audioReferenceExcluded: true, qualityGate: WAN_ANIMATE_REAL_DRIVER_QUALITY_GATES }), motionRequestId, KINGCAM_CLONE_ID, input.ownerId]);
  await recordKingcamCloneMemory({ ownerId: input.ownerId, kind: "motion_proof_planned", room: "KingCam Kling 3 Omni real-gait mixed reference", payload: { motionRequestId, governedJobId: submitted.id, providerJobId: submitted.providerJobId, state: submitted.state, hardCreditCap: KINGCAM_KLING_OMNI_REAL_GAIT_HARD_CREDIT_CAP, providerQuotedCostUsd: KINGCAM_KLING_OMNI_REAL_GAIT_QUOTED_COST_USD, providerModelPath: "pollo/kling-ai/kling-v3-omni-ref2video", audioReferenceExcluded: true, qualityGate: WAN_ANIMATE_REAL_DRIVER_QUALITY_GATES } });
  return { motionRequestId, governedJob: submitted, hardCreditCap: KINGCAM_KLING_OMNI_REAL_GAIT_HARD_CREDIT_CAP, qualityGate: WAN_ANIMATE_REAL_DRIVER_QUALITY_GATES };
}

export async function launchKingcamKlingV3MotionFullBodyProof(input: { ownerId: number; sceneBrief: string }) {
  assertOwner(input.ownerId);
  const sceneBrief = String(input.sceneBrief || "").trim();
  if (sceneBrief.length < 40 || sceneBrief.length > 1800) throw new Error("KingCam Kling V3 motion brief must be between 40 and 1800 characters.");
  await ensureProfile(input.ownerId);
  const motionRequestId = randomUUID();
  const fingerprint = createHash("sha256").update(`${KINGCAM_CLONE_ID}:${KINGCAM_WAN_ANIMATE_REAL_DRIVER_IMAGE}:${KINGCAM_WAN_ANIMATE_REAL_DRIVER_URL}:kling-v3-motion:${sceneBrief}:${KINGCAM_KLING_V3_MOTION_HARD_CREDIT_CAP}`).digest("hex");
  await rawExec(`INSERT INTO kingcam_clone_motion_requests (id, clone_id, owner_id, source_url, source_kind, motion_reference_url, intended_lane, candidate_models_json, scene_brief, hard_credit_cap, consent_confirmed, ownership_confirmed, quality_gate_json, state, created_at, updated_at) VALUES (?, ?, ?, ?, 'approved_kingcam_full_body_identity_image', ?, 'governed_pollo_kling_v3_real_driver_motion', ?, ?, ?, 1, 1, ?, 'planned', NOW(), NOW())`, [motionRequestId, KINGCAM_CLONE_ID, input.ownerId, KINGCAM_WAN_ANIMATE_REAL_DRIVER_IMAGE, KINGCAM_WAN_ANIMATE_REAL_DRIVER_URL, json(["pollo/kling-ai/kling-v3-motion"]), sceneBrief, KINGCAM_KLING_V3_MOTION_HARD_CREDIT_CAP, json(WAN_ANIMATE_REAL_DRIVER_QUALITY_GATES)]);
  const drafted = await createGovernedKingcamKlingV3MotionDraft({ creatorId: input.ownerId, requestedBy: input.ownerId, ownershipConfirmed: true, consentConfirmed: true, idempotencyKey: `kingcam-kling-v3-motion-full-body-proof:${motionRequestId}`, requestId: motionRequestId, metadata: { kingcamCloneId: KINGCAM_CLONE_ID, kingcamMotionRequestId: motionRequestId, proofClass: "kingcam_kling_v3_real_driver_full_body_motion_transfer_proof", providerPreflight: "Official Pollo Kling V3 motion accepts the approved KingCam identity image and locked real gait video as distinct inputs. The live provider estimate verified 98 Pollo credits / $5.88; one output only and no automatic retry.", sceneBrief, realDriverDurationSeconds: KINGCAM_WAN_ANIMATE_REAL_DRIVER_DURATION_SECONDS, qualityGate: WAN_ANIMATE_REAL_DRIVER_QUALITY_GATES } });
  const approved = await approveGovernedPolloJob({ jobId: drafted.job.id, approverId: input.ownerId, expectedFingerprint: drafted.job.fingerprint, reason: "Owner-directed KingCam Kling V3 real-driver full-body motion-transfer proof. One seven-second output only; provider-estimated 98-credit ceiling, no automatic retry; reject any frozen movement, crop, camera spin, identity/wardrobe/crown/jewelry/shoe/cigar drift, hand/foot/anatomy defect, extra person, text, or invented environment." });
  await authorizeSingleUseGovernedPolloSubmission({ jobId: approved.id, ownerId: input.ownerId, expectedFingerprint: approved.fingerprint, hardCreditCap: KINGCAM_KLING_V3_MOTION_HARD_CREDIT_CAP, expiresInMinutes: 10, reason: "One-time KingCam Kling V3 real-driver full-body proof; the live provider estimate returned 98 credits / $5.88 for the locked inputs, so that exact ceiling and the no-retry rule are enforced before submission." });
  const submitted = await submitGovernedPolloJob({ jobId: approved.id, workerId: `kingcam-kling-v3-motion-owner-${input.ownerId}` });
  const localState: MotionRequestState = submitted.state === "submitted" ? "submitted" : submitted.state === "failed" ? "failed" : "approved";
  await rawExec("UPDATE kingcam_clone_motion_requests SET state = ?, review_json = ?, updated_at = NOW() WHERE id = ? AND clone_id = ? AND owner_id = ?", [localState, json({ governedJobId: submitted.id, providerJobId: submitted.providerJobId, state: submitted.state, hardCreditCap: KINGCAM_KLING_V3_MOTION_HARD_CREDIT_CAP, providerQuotedCostUsd: KINGCAM_KLING_V3_MOTION_QUOTED_COST_USD, providerModelPath: "pollo/kling-ai/kling-v3-motion", identityImage: KINGCAM_WAN_ANIMATE_REAL_DRIVER_IMAGE, motionDriverUrl: KINGCAM_WAN_ANIMATE_REAL_DRIVER_URL, qualityGate: WAN_ANIMATE_REAL_DRIVER_QUALITY_GATES }), motionRequestId, KINGCAM_CLONE_ID, input.ownerId]);
  await recordKingcamCloneMemory({ ownerId: input.ownerId, kind: "motion_proof_planned", room: "KingCam Kling V3 real-driver full-body motion", payload: { motionRequestId, fingerprint, governedJobId: submitted.id, providerJobId: submitted.providerJobId, state: submitted.state, hardCreditCap: KINGCAM_KLING_V3_MOTION_HARD_CREDIT_CAP, providerQuotedCostUsd: KINGCAM_KLING_V3_MOTION_QUOTED_COST_USD, providerModelPath: "pollo/kling-ai/kling-v3-motion", identityImage: KINGCAM_WAN_ANIMATE_REAL_DRIVER_IMAGE, motionDriverUrl: KINGCAM_WAN_ANIMATE_REAL_DRIVER_URL, qualityGate: WAN_ANIMATE_REAL_DRIVER_QUALITY_GATES } });
  return { motionRequestId, governedJob: submitted, hardCreditCap: KINGCAM_KLING_V3_MOTION_HARD_CREDIT_CAP, qualityGate: WAN_ANIMATE_REAL_DRIVER_QUALITY_GATES };
}

export async function launchKingcamActionImitationV2FullBodyProof(input: { ownerId: number; sceneBrief: string }) {
  assertOwner(input.ownerId);
  const sceneBrief = String(input.sceneBrief || "").trim();
  if (sceneBrief.length < 40 || sceneBrief.length > 1800) {
    throw new Error("KingCam Action Imitation motion brief must be between 40 and 1800 characters.");
  }
  await ensureProfile(input.ownerId);
  const motionRequestId = randomUUID();
  const fingerprint = createHash("sha256")
    .update(`${KINGCAM_CLONE_ID}:${KINGCAM_WAN_ANIMATE_REAL_DRIVER_IMAGE}:${KINGCAM_WAN_ANIMATE_REAL_DRIVER_URL}:action-imitation-v2:${sceneBrief}:${KINGCAM_ACTION_IMITATION_V2_HARD_CREDIT_CAP}`)
    .digest("hex");
  await rawExec(`INSERT INTO kingcam_clone_motion_requests
    (id, clone_id, owner_id, source_url, source_kind, motion_reference_url, intended_lane, candidate_models_json, scene_brief, hard_credit_cap,
     consent_confirmed, ownership_confirmed, quality_gate_json, state, created_at, updated_at)
    VALUES (?, ?, ?, ?, 'approved_kingcam_full_body_identity_image', ?, 'governed_pollo_action_imitation_v2_real_driver_motion', ?, ?, ?, 1, 1, ?, 'planned', NOW(), NOW())`,
    [motionRequestId, KINGCAM_CLONE_ID, input.ownerId, KINGCAM_WAN_ANIMATE_REAL_DRIVER_IMAGE, KINGCAM_WAN_ANIMATE_REAL_DRIVER_URL, json(["pollo/pollo-ai/action-imitation-v2"]), sceneBrief, KINGCAM_ACTION_IMITATION_V2_HARD_CREDIT_CAP, json(WAN_ANIMATE_REAL_DRIVER_QUALITY_GATES)],
  );
  const drafted = await createGovernedKingcamActionImitationV2Draft({
    creatorId: input.ownerId,
    requestedBy: input.ownerId,
    ownershipConfirmed: true,
    consentConfirmed: true,
    idempotencyKey: `kingcam-action-imitation-v2-full-body-proof:${motionRequestId}`,
    requestId: motionRequestId,
    metadata: {
      kingcamCloneId: KINGCAM_CLONE_ID,
      kingcamMotionRequestId: motionRequestId,
      proofClass: "kingcam_action_imitation_v2_real_driver_full_body_motion_transfer_proof",
      providerPreflight: "Official Pollo Action Imitation V2 accepts the approved KingCam identity image and locked real gait video as distinct inputs. The live provider estimate verified 35 Pollo credits / $2.10; one output only and no automatic retry.",
      sceneBrief,
      realDriverDurationSeconds: KINGCAM_WAN_ANIMATE_REAL_DRIVER_DURATION_SECONDS,
      qualityGate: WAN_ANIMATE_REAL_DRIVER_QUALITY_GATES,
    },
  });
  const approved = await approveGovernedPolloJob({
    jobId: drafted.job.id,
    approverId: input.ownerId,
    expectedFingerprint: drafted.job.fingerprint,
    reason: "Owner-directed KingCam Action Imitation V2 real-driver full-body motion-transfer proof. One seven-second output only; provider-estimated 35-credit ceiling, no automatic retry; reject any frozen movement, crop, camera spin, identity/wardrobe/crown/jewelry/shoe/cigar drift, hand/foot/anatomy defect, extra person, text, or invented environment.",
  });
  await authorizeSingleUseGovernedPolloSubmission({
    jobId: approved.id,
    ownerId: input.ownerId,
    expectedFingerprint: approved.fingerprint,
    hardCreditCap: KINGCAM_ACTION_IMITATION_V2_HARD_CREDIT_CAP,
    expiresInMinutes: 10,
    reason: "One-time KingCam Action Imitation V2 real-driver full-body proof; the live provider estimate returned 35 credits / $2.10 for the locked inputs, so that exact ceiling and the no-retry rule are enforced before submission.",
  });
  const submitted = await submitGovernedPolloJob({ jobId: approved.id, workerId: `kingcam-action-imitation-v2-owner-${input.ownerId}` });
  const localState: MotionRequestState = submitted.state === "submitted" ? "submitted" : submitted.state === "failed" ? "failed" : "approved";
  await rawExec(
    "UPDATE kingcam_clone_motion_requests SET state = ?, review_json = ?, updated_at = NOW() WHERE id = ? AND clone_id = ? AND owner_id = ?",
    [localState, json({ governedJobId: submitted.id, providerJobId: submitted.providerJobId, state: submitted.state, hardCreditCap: KINGCAM_ACTION_IMITATION_V2_HARD_CREDIT_CAP, providerQuotedCostUsd: KINGCAM_ACTION_IMITATION_V2_QUOTED_COST_USD, providerModelPath: "pollo/pollo-ai/action-imitation-v2", identityImage: KINGCAM_WAN_ANIMATE_REAL_DRIVER_IMAGE, motionDriverUrl: KINGCAM_WAN_ANIMATE_REAL_DRIVER_URL, motionDriverDurationSeconds: KINGCAM_WAN_ANIMATE_REAL_DRIVER_DURATION_SECONDS, qualityGate: WAN_ANIMATE_REAL_DRIVER_QUALITY_GATES }), motionRequestId, KINGCAM_CLONE_ID, input.ownerId],
  );
  await recordKingcamCloneMemory({
    ownerId: input.ownerId,
    kind: "motion_proof_planned",
    room: "KingCam Action Imitation V2 real-driver full-body motion",
    payload: { motionRequestId, fingerprint, governedJobId: submitted.id, providerJobId: submitted.providerJobId, state: submitted.state, hardCreditCap: KINGCAM_ACTION_IMITATION_V2_HARD_CREDIT_CAP, providerQuotedCostUsd: KINGCAM_ACTION_IMITATION_V2_QUOTED_COST_USD, providerModelPath: "pollo/pollo-ai/action-imitation-v2", identityImage: KINGCAM_WAN_ANIMATE_REAL_DRIVER_IMAGE, motionDriverUrl: KINGCAM_WAN_ANIMATE_REAL_DRIVER_URL, motionDriverDurationSeconds: KINGCAM_WAN_ANIMATE_REAL_DRIVER_DURATION_SECONDS, qualityGate: WAN_ANIMATE_REAL_DRIVER_QUALITY_GATES },
  });
  return { motionRequestId, governedJob: submitted, hardCreditCap: KINGCAM_ACTION_IMITATION_V2_HARD_CREDIT_CAP, qualityGate: WAN_ANIMATE_REAL_DRIVER_QUALITY_GATES };
}

export async function launchKingcamGoEnhanceRealPerformanceProof(input: { ownerId: number; sceneBrief: string }) {
  assertOwner(input.ownerId);
  const sceneBrief = String(input.sceneBrief || "").trim();
  if (sceneBrief.length < 40 || sceneBrief.length > 1800) {
    throw new Error("KingCam real-performance motion brief must be between 40 and 1800 characters.");
  }
  await ensureProfile(input.ownerId);
  const motionRequestId = randomUUID();
  const fingerprint = createHash("sha256")
    .update(`${KINGCAM_CLONE_ID}:${KINGCAM_WAN_ANIMATE_REAL_DRIVER_URL}:${KINGCAM_GOENHANCE_REAL_PERFORMANCE_STYLE_CODE}:${sceneBrief}:${KINGCAM_GOENHANCE_REAL_PERFORMANCE_HARD_CREDIT_CAP}`)
    .digest("hex");
  await rawExec(`INSERT INTO kingcam_clone_motion_requests
    (id, clone_id, owner_id, source_url, source_kind, motion_reference_url, intended_lane, candidate_models_json, scene_brief, hard_credit_cap,
     consent_confirmed, ownership_confirmed, quality_gate_json, state, created_at, updated_at)
    VALUES (?, ?, ?, ?, 'real_kingcam_performance_driver', ?, 'governed_pollo_goenhance_real_performance_video2video', ?, ?, ?, 1, 1, ?, 'planned', NOW(), NOW())`,
    [
      motionRequestId,
      KINGCAM_CLONE_ID,
      input.ownerId,
      KINGCAM_WAN_ANIMATE_REAL_DRIVER_URL,
      KINGCAM_WAN_ANIMATE_REAL_DRIVER_URL,
      json(["pollo/go-enhance/go-enhance-v1"]),
      sceneBrief,
      KINGCAM_GOENHANCE_REAL_PERFORMANCE_HARD_CREDIT_CAP,
      json(KINGCAM_GOENHANCE_REAL_PERFORMANCE_GATES),
    ],
  );
  const prompt = [
    "Preserve the supplied verified real KingCam full-body performance exactly: continuous crown-to-shoes framing, seven-second gait timing, grounded weight transfer, restrained hand movement, burgundy suit with gold embroidery, crown, jewelry, black shoes, right-hand cigar, dark lounge geometry, natural skin, face, beard, and body build.",
    "Do not crop, spin, freeze, replace the identity, add a person, alter wardrobe, change shoes or jewelry, morph the cigar or hands, distort feet, modify anatomy, add text, or invent a different camera move.",
    "This is a silent real-performance motion-preservation proof for the private KingCam Clone Command. It is never a Body Cinema output and never a synthetic identity-transfer or talking-clone claim.",
    sceneBrief,
  ].join(" ");
  const drafted = await createGovernedKingcamGoEnhanceRealPerformanceDraft({
    creatorId: input.ownerId,
    requestedBy: input.ownerId,
    prompt,
    ownershipConfirmed: true,
    consentConfirmed: true,
    idempotencyKey: `kingcam-goenhance-real-performance-proof:${motionRequestId}`,
    requestId: motionRequestId,
    metadata: {
      kingcamCloneId: KINGCAM_CLONE_ID,
      kingcamMotionRequestId: motionRequestId,
      proofClass: "kingcam_real_performance_video2video_preservation_proof",
      providerPreflight: "Authenticated CreatorVault Pollo catalog exposes go-enhance-v1 as video-to-video. Official Pollo OpenAPI verifies GoEnhance v1 requires the versioned video, style, prompt, and strength contract. The live provider estimate verified 105 Pollo credits / $6.30 for the locked source and style; this is one output with that fixed ceiling and no automatic retry.",
      realDriverDurationSeconds: KINGCAM_WAN_ANIMATE_REAL_DRIVER_DURATION_SECONDS,
      qualityGate: KINGCAM_GOENHANCE_REAL_PERFORMANCE_GATES,
    },
  });
  const approved = await approveGovernedPolloJob({
    jobId: drafted.job.id,
    approverId: input.ownerId,
    expectedFingerprint: drafted.job.fingerprint,
    reason: "Owner-directed KingCam GoEnhance real-performance video-to-video proof. One real full-body output only with the locked gait source, official mx-v2v contract, provider-estimated 105-credit ceiling, and no automatic retry; reject any crop, freeze, identity/wardrobe/prop drift, gait break, or anatomy defect.",
  });
  await authorizeSingleUseGovernedPolloSubmission({
    jobId: approved.id,
    ownerId: input.ownerId,
    expectedFingerprint: approved.fingerprint,
    hardCreditCap: KINGCAM_GOENHANCE_REAL_PERFORMANCE_HARD_CREDIT_CAP,
    expiresInMinutes: 10,
    reason: "One-time KingCam GoEnhance real-performance proof; the live provider estimate returned 105 credits / $6.30 for the locked source and style, so that exact ceiling and the no-retry rule are locked before submission.",
  });
  const submitted = await submitGovernedPolloJob({ jobId: approved.id, workerId: `kingcam-goenhance-owner-${input.ownerId}` });
  const localState: MotionRequestState = submitted.state === "submitted" ? "submitted" : submitted.state === "failed" ? "failed" : "approved";
  await rawExec(
    "UPDATE kingcam_clone_motion_requests SET state = ?, review_json = ?, updated_at = NOW() WHERE id = ? AND clone_id = ? AND owner_id = ?",
    [localState, json({ governedJobId: submitted.id, providerJobId: submitted.providerJobId, state: submitted.state, hardCreditCap: KINGCAM_GOENHANCE_REAL_PERFORMANCE_HARD_CREDIT_CAP, providerModelPath: "pollo/go-enhance/go-enhance-v1", styleCode: KINGCAM_GOENHANCE_REAL_PERFORMANCE_STYLE_CODE, motionDriverUrl: KINGCAM_WAN_ANIMATE_REAL_DRIVER_URL, motionDriverDurationSeconds: KINGCAM_WAN_ANIMATE_REAL_DRIVER_DURATION_SECONDS, qualityGate: KINGCAM_GOENHANCE_REAL_PERFORMANCE_GATES }), motionRequestId, KINGCAM_CLONE_ID, input.ownerId],
  );
  await recordKingcamCloneMemory({
    ownerId: input.ownerId,
    kind: "motion_proof_planned",
    room: "KingCam real-performance full-body motion",
    payload: { motionRequestId, fingerprint, governedJobId: submitted.id, providerJobId: submitted.providerJobId, state: submitted.state, hardCreditCap: KINGCAM_GOENHANCE_REAL_PERFORMANCE_HARD_CREDIT_CAP, providerModelPath: "pollo/go-enhance/go-enhance-v1", styleCode: KINGCAM_GOENHANCE_REAL_PERFORMANCE_STYLE_CODE, motionDriverUrl: KINGCAM_WAN_ANIMATE_REAL_DRIVER_URL, motionDriverDurationSeconds: KINGCAM_WAN_ANIMATE_REAL_DRIVER_DURATION_SECONDS, qualityGate: KINGCAM_GOENHANCE_REAL_PERFORMANCE_GATES },
  });
  return { motionRequestId, governedJob: submitted, hardCreditCap: KINGCAM_GOENHANCE_REAL_PERFORMANCE_HARD_CREDIT_CAP, qualityGate: KINGCAM_GOENHANCE_REAL_PERFORMANCE_GATES };
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
