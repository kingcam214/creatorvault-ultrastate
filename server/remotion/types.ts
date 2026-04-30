/**
 * CreatorVault Remotion Types
 * Shared types for all Remotion compositions and the render service
 */

export type RenderMode =
  | "flyer"
  | "album_cover"
  | "thumbnail"
  | "broll"
  | "title_card"
  | "episode_trailer"
  | "empire_map_snapshot"
  | "visual_dna"
  | "visual_dna_portrait"
  | "visual_dna_square"
  | "visual_dna_landscape"
  | "visual_dna_thumbnail"
  | "visual_dna_broll"
  | "visual_dna_title_card";

export type MotionPreset =
  | "neon_pulse"
  | "gold_rush"
  | "dark_empire"
  | "fire_rise"
  | "ice_cold"
  | "royal_purple"
  | "matrix_green"
  | "sunset_fade"
  | "ocean_wave"
  | "lightning_bolt";

export interface RenderContract {
  jobId: string;
  mode: RenderMode;
  baseImagePath: string;
  baseImageUrl: string;
  width: number;
  height: number;
  fps: number;
  durationSeconds: number;
  motionPreset: MotionPreset;
  premiumMode: boolean;
  cinematicMode: boolean;
  artistName: string;
  songTitle: string;
  subtitle: string;
  textPreset: string;
  accentColor: string;
  textColor: string;
  fontFamily: string;
  // Optional fields for advanced modes
  vibe?: string;
  logoUrl?: string;
  backgroundVideoUrl?: string;
  overlayText?: string;
  callToAction?: string;
  brandColors?: string[];
  outputPath?: string;
}

export interface RenderResult {
  success: boolean;
  jobId?: string;
  outputPath?: string;
  outputUrl?: string;
  videoPath?: string;
  videoUrl?: string;
  thumbnailPath?: string;
  thumbnailUrl?: string;
  durationMs?: number;
  durationSeconds?: number;
  fileSizeBytes?: number;
  width?: number;
  height?: number;
  engine?: string;
  preset?: string;
  renderMs?: number;
  error?: string;
  [key: string]: unknown;
}

export interface PresetConfig {
  accentColor: string;
  textColor: string;
  bgColor: string;
  particleColor: string;
  glowIntensity: number;
  scanlineOpacity: number;
}

export const PRESET_REGISTRY: Record<MotionPreset, PresetConfig> = {
  neon_pulse: {
    accentColor: "#00D9FF",
    textColor: "#FFFFFF",
    bgColor: "#0a0a0a",
    particleColor: "#00D9FF",
    glowIntensity: 0.9,
    scanlineOpacity: 0.15,
  },
  gold_rush: {
    accentColor: "#D4AF37",
    textColor: "#FFFFFF",
    bgColor: "#0a0a0a",
    particleColor: "#D4AF37",
    glowIntensity: 0.8,
    scanlineOpacity: 0.1,
  },
  dark_empire: {
    accentColor: "#8B0000",
    textColor: "#F5F0E8",
    bgColor: "#050505",
    particleColor: "#8B0000",
    glowIntensity: 0.7,
    scanlineOpacity: 0.2,
  },
  fire_rise: {
    accentColor: "#FF4500",
    textColor: "#FFFFFF",
    bgColor: "#0a0000",
    particleColor: "#FF6B35",
    glowIntensity: 1.0,
    scanlineOpacity: 0.12,
  },
  ice_cold: {
    accentColor: "#87CEEB",
    textColor: "#FFFFFF",
    bgColor: "#050a0f",
    particleColor: "#87CEEB",
    glowIntensity: 0.6,
    scanlineOpacity: 0.08,
  },
  royal_purple: {
    accentColor: "#7B2FBE",
    textColor: "#FFFFFF",
    bgColor: "#08040f",
    particleColor: "#9B59B6",
    glowIntensity: 0.85,
    scanlineOpacity: 0.15,
  },
  matrix_green: {
    accentColor: "#00FF41",
    textColor: "#00FF41",
    bgColor: "#000000",
    particleColor: "#00FF41",
    glowIntensity: 0.95,
    scanlineOpacity: 0.25,
  },
  sunset_fade: {
    accentColor: "#FF6B6B",
    textColor: "#FFFFFF",
    bgColor: "#0a0505",
    particleColor: "#FFB347",
    glowIntensity: 0.75,
    scanlineOpacity: 0.1,
  },
  ocean_wave: {
    accentColor: "#006994",
    textColor: "#FFFFFF",
    bgColor: "#020a0f",
    particleColor: "#00CED1",
    glowIntensity: 0.7,
    scanlineOpacity: 0.1,
  },
  lightning_bolt: {
    accentColor: "#FFD700",
    textColor: "#FFFFFF",
    bgColor: "#050505",
    particleColor: "#FFD700",
    glowIntensity: 1.0,
    scanlineOpacity: 0.18,
  },
};
