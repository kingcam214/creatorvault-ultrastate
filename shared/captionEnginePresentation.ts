import type { CaptionSegment, CaptionWord } from "./captionEngineIntelligence";

export const CAPTION_PLATFORM_PROFILES = [
  "creatorvault",
  "tiktok",
  "instagram_reels",
  "youtube_shorts",
  "instagram_square",
  "youtube_landscape",
] as const;

export type CaptionPlatformProfile = (typeof CAPTION_PLATFORM_PROFILES)[number];
export type CaptionPlacement = "top" | "center" | "lower" | "adaptive";
export type CaptionSafeZone = "vertical" | "square" | "landscape" | "platform_safe";

export type CaptionSafeRegion = {
  profile: CaptionPlatformProfile;
  top: number;
  right: number;
  bottom: number;
  left: number;
  preferred: CaptionPlacement;
  note: string;
};

const PLATFORM_SAFE_REGIONS: Record<CaptionPlatformProfile, CaptionSafeRegion> = {
  creatorvault: { profile: "creatorvault", top: 0.12, right: 0.075, bottom: 0.18, left: 0.075, preferred: "lower", note: "CreatorVault’s clean vertical viewing area." },
  tiktok: { profile: "tiktok", top: 0.13, right: 0.11, bottom: 0.27, left: 0.075, preferred: "lower", note: "Protects TikTok’s right-side controls and lower metadata area." },
  instagram_reels: { profile: "instagram_reels", top: 0.12, right: 0.075, bottom: 0.24, left: 0.075, preferred: "lower", note: "Leaves room for Reels controls and the lower caption stack." },
  youtube_shorts: { profile: "youtube_shorts", top: 0.12, right: 0.08, bottom: 0.21, left: 0.08, preferred: "lower", note: "Protects Shorts actions and title treatment." },
  instagram_square: { profile: "instagram_square", top: 0.10, right: 0.09, bottom: 0.12, left: 0.09, preferred: "lower", note: "Keeps the grid post readable without crowding its edges." },
  youtube_landscape: { profile: "youtube_landscape", top: 0.08, right: 0.07, bottom: 0.10, left: 0.07, preferred: "lower", note: "Uses a restrained lower-screen subtitle zone for widescreen viewing." },
};

export type CaptionDisplayGroup = {
  id: string;
  start: number;
  end: number;
  text: string;
  words: CaptionWord[];
  speaker: string | null;
};

function clean(value: unknown): string {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function validWords(segment: CaptionSegment): CaptionWord[] {
  const supplied = Array.isArray(segment.words) ? segment.words.filter((word) => clean(word.text) && word.end > word.start) : [];
  if (supplied.length) return supplied;
  const text = clean(segment.text).split(/\s+/).filter(Boolean);
  const span = Math.max(0.12, segment.end - segment.start);
  return text.map((word, index) => ({ text: word, start: segment.start + (span * index) / text.length, end: segment.start + (span * (index + 1)) / text.length, speaker: segment.speaker ?? null }));
}

function endAtPunctuation(word: CaptionWord): boolean {
  return /[,.!?;:]$/.test(clean(word.text));
}

export function resolveCaptionPlatformProfile(input: { profile?: CaptionPlatformProfile | null; safeZone?: CaptionSafeZone | null; width: number; height: number }): CaptionSafeRegion {
  if (input.profile && CAPTION_PLATFORM_PROFILES.includes(input.profile)) return PLATFORM_SAFE_REGIONS[input.profile];
  if (input.safeZone === "square" || Math.abs(input.width - input.height) < 12) return PLATFORM_SAFE_REGIONS.instagram_square;
  if (input.safeZone === "landscape" || input.width > input.height) return PLATFORM_SAFE_REGIONS.youtube_landscape;
  if (input.safeZone === "vertical") return PLATFORM_SAFE_REGIONS.creatorvault;
  return PLATFORM_SAFE_REGIONS.creatorvault;
}

export function buildCaptionDisplayGroups(input: {
  segments: CaptionSegment[];
  maxWords: number;
  timing: "word" | "phrase" | "sentence" | "beat";
}): CaptionDisplayGroup[] {
  const maxWords = Math.max(1, Math.min(12, Math.floor(input.maxWords)));
  const groups: CaptionDisplayGroup[] = [];
  input.segments.forEach((segment, segmentIndex) => {
    const words = validWords(segment);
    if (!words.length) return;
    if (input.timing === "sentence") {
      groups.push({ id: `segment-${segmentIndex + 1}`, start: segment.start, end: segment.end, text: clean(segment.text), words, speaker: segment.speaker ?? null });
      return;
    }
    let bucket: CaptionWord[] = [];
    const flush = () => {
      if (!bucket.length) return;
      groups.push({ id: `segment-${segmentIndex + 1}-${groups.length + 1}`, start: bucket[0].start, end: bucket.at(-1)!.end, text: bucket.map((word) => word.text).join(" ").replace(/\s+([,.!?;:])/g, "$1"), words: bucket, speaker: bucket.map((word) => word.speaker).find(Boolean) ?? segment.speaker ?? null });
      bucket = [];
    };
    words.forEach((word) => {
      bucket.push(word);
      const shouldFlush = input.timing === "word" || bucket.length >= maxWords || (input.timing !== "beat" && bucket.length >= Math.max(2, Math.ceil(maxWords / 2)) && endAtPunctuation(word));
      if (shouldFlush) flush();
    });
    flush();
  });
  return groups;
}
