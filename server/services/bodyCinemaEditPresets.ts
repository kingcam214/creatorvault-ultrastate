/**
 * ============================================================================
 * BODY CINEMA — EDITING PRESETS (flagship)
 *
 * Unlike the generation presets (which drive Pollo prompts), these are EDIT
 * presets: one tap applies a full real ffmpeg treatment to an uploaded clip —
 * color grade + motion + caption style + fade + watermark behavior.
 *
 * Every preset maps directly to realRenderEngine RenderRequest fields.
 * ============================================================================
 */

export interface BodyCinemaEditPreset {
  id: string;
  name: string;
  emoji: string;
  category: "signature" | "heat" | "luxury" | "afterdark" | "editorial" | "platform";
  tagline: string;
  colorGrade: string;      // -> COLOR_GRADES key
  motion: string;          // -> MOTION_PRESETS key (applies to image clips)
  captionStyle: "bold_center" | "lower_third" | "minimal_top";
  fadeInOut: boolean;
  aspect: "9:16" | "16:9" | "1:1";
  heat: number;            // 1..5
  bestFor: string;
}

export const BODY_CINEMA_EDIT_PRESETS: BodyCinemaEditPreset[] = [
  // ── SIGNATURE ──────────────────────────────────────────────────────────────
  { id: "edit-silk-reveal",     name: "Silk Reveal",     emoji: "✨", category: "signature", tagline: "Soft luxe push with golden warmth", colorGrade: "luxe_gold",       motion: "slow_push", captionStyle: "bold_center", fadeInOut: true, aspect: "9:16", heat: 4, bestFor: "PPV opener" },
  { id: "edit-golden-hour",     name: "Golden Hour",     emoji: "🌅", category: "signature", tagline: "Warm radiant glow, slow pull", colorGrade: "rose_glow",       motion: "slow_pull", captionStyle: "minimal_top", fadeInOut: true, aspect: "9:16", heat: 3, bestFor: "Aspirational drop" },
  { id: "edit-throne",          name: "Throne",          emoji: "👑", category: "signature", tagline: "Bronze editorial power frame", colorGrade: "bronze_editorial",motion: "slow_push", captionStyle: "lower_third", fadeInOut: true, aspect: "9:16", heat: 4, bestFor: "VIP positioning" },

  // ── HEAT ─────────────────────────────────────────────────────────────────────
  { id: "edit-cinematic-heat",  name: "Cinematic Heat",  emoji: "🔥", category: "heat",      tagline: "High contrast trailer energy", colorGrade: "cinematic_heat",  motion: "slow_push", captionStyle: "bold_center", fadeInOut: true, aspect: "9:16", heat: 5, bestFor: "Highest converting PPV" },
  { id: "edit-wet-editorial",   name: "Wet Editorial",   emoji: "💧", category: "heat",      tagline: "Glossy saturated drama", colorGrade: "cinematic_heat",  motion: "drift_up",  captionStyle: "bold_center", fadeInOut: true, aspect: "9:16", heat: 5, bestFor: "Premium PPV" },
  { id: "edit-red-room",        name: "Red Room",        emoji: "❤️‍🔥", category: "heat",     tagline: "Deep crimson vignette intensity", colorGrade: "cinematic_heat",  motion: "slow_pull", captionStyle: "lower_third", fadeInOut: true, aspect: "9:16", heat: 5, bestFor: "After-dark tease" },

  // ── LUXURY ─────────────────────────────────────────────────────────────────
  { id: "edit-platinum",        name: "Platinum",        emoji: "💎", category: "luxury",    tagline: "Cool clean high-end finish", colorGrade: "platinum",        motion: "slow_push", captionStyle: "minimal_top", fadeInOut: true, aspect: "9:16", heat: 3, bestFor: "Luxury brand drop" },
  { id: "edit-champagne",       name: "Champagne Suite", emoji: "🥂", category: "luxury",    tagline: "Warm gold penthouse glow", colorGrade: "luxe_gold",       motion: "drift_left",captionStyle: "lower_third", fadeInOut: true, aspect: "9:16", heat: 3, bestFor: "VIP upsell" },

  // ── AFTER DARK ───────────────────────────────────────────────────────────────
  { id: "edit-velvet-midnight", name: "Velvet Midnight", emoji: "🌙", category: "afterdark", tagline: "Moody blue noir depth", colorGrade: "velvet_midnight", motion: "slow_push", captionStyle: "bold_center", fadeInOut: true, aspect: "9:16", heat: 4, bestFor: "Night drops" },
  { id: "edit-neon-night",      name: "Neon Night",      emoji: "🌃", category: "afterdark", tagline: "Electric saturated city glow", colorGrade: "neon_night",      motion: "drift_left",captionStyle: "minimal_top", fadeInOut: true, aspect: "9:16", heat: 4, bestFor: "Club/night content" },
  { id: "edit-after-dark-noir", name: "After Dark Noir", emoji: "🖤", category: "afterdark", tagline: "Maximum contrast shadow play", colorGrade: "noir_afterdark",  motion: "slow_pull", captionStyle: "lower_third", fadeInOut: true, aspect: "9:16", heat: 5, bestFor: "Mystery tease" },

  // ── EDITORIAL ────────────────────────────────────────────────────────────────
  { id: "edit-soft-skin",       name: "Soft Skin",       emoji: "📸", category: "editorial", tagline: "Warm soft-focus intimacy", colorGrade: "soft_skin",       motion: "slow_push", captionStyle: "minimal_top", fadeInOut: true, aspect: "9:16", heat: 3, bestFor: "Close-up content" },
  { id: "edit-vogue",           name: "Vogue Energy",    emoji: "🎞️", category: "editorial", tagline: "Crisp fashion editorial", colorGrade: "platinum",        motion: "static",    captionStyle: "minimal_top", fadeInOut: true, aspect: "9:16", heat: 2, bestFor: "Premium positioning" },

  // ── PLATFORM TUNED ───────────────────────────────────────────────────────────
  { id: "edit-tiktok-viral",    name: "TikTok Viral",    emoji: "📱", category: "platform",  tagline: "Punchy vertical, bold hook", colorGrade: "cinematic_heat",  motion: "slow_push", captionStyle: "bold_center", fadeInOut: false, aspect: "9:16", heat: 3, bestFor: "TikTok reach" },
  { id: "edit-instagram-reel",  name: "Instagram Reel",  emoji: "📷", category: "platform",  tagline: "Clean editorial vertical", colorGrade: "rose_glow",       motion: "slow_pull", captionStyle: "minimal_top", fadeInOut: true, aspect: "9:16", heat: 2, bestFor: "IG editorial" },
  { id: "edit-twitter-heat",    name: "Twitter Heat",    emoji: "🐦", category: "platform",  tagline: "Wide cinematic tease", colorGrade: "cinematic_heat",  motion: "drift_left",captionStyle: "lower_third", fadeInOut: true, aspect: "16:9", heat: 4, bestFor: "X/Twitter" },
];

export function getEditPreset(id: string): BodyCinemaEditPreset | undefined {
  return BODY_CINEMA_EDIT_PRESETS.find(p => p.id === id);
}

export const EDIT_PRESET_CATEGORIES = [
  { id: "signature", label: "Signature", emoji: "✨" },
  { id: "heat",      label: "Heat",      emoji: "🔥" },
  { id: "luxury",    label: "Luxury",    emoji: "💎" },
  { id: "afterdark", label: "After Dark",emoji: "🌙" },
  { id: "editorial", label: "Editorial", emoji: "📸" },
  { id: "platform",  label: "Platform",  emoji: "📱" },
];
