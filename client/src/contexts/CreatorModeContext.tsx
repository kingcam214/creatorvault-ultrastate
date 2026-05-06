/**
 * CreatorModeContext
 *
 * The single source of truth for whether a creator is operating in
 * ADULT (VaultX) mode or SFW (general creator) mode.
 *
 * How it works:
 * 1. Reads the user's `contentType` array from their profile (already in AuthContext).
 * 2. If contentType includes "adult", "vaultx", "nsfw", or "body_positive" → ADULT mode.
 * 3. Otherwise → SFW mode.
 * 4. The user can also manually override their mode via the UI (stored in localStorage
 *    so it persists across sessions without a DB round-trip).
 * 5. Every tool that imports `useCreatorMode()` gets the correct mode automatically.
 *
 * What each mode changes:
 * ─────────────────────────────────────────────────────────────────────────────
 * ADULT MODE (VaultX)
 *   - VaultRemix: body-positive style grades, SFW teaser generation, PPV campaigns
 *   - Thumbnail Generator: adult-niche prompts, desire-grade aesthetics, censored previews
 *   - Viral Optimizer: OnlyFans/Fansly platform options shown, adult-niche copy
 *   - Batch Ops: processes VaultX content library
 *   - All AI prompts include adult creator context
 *
 * SFW MODE (General Creator)
 *   - VaultRemix: standard style grades (vibrant, clean, cinematic, etc.)
 *   - Thumbnail Generator: YouTube/TikTok/Instagram niche prompts
 *   - Viral Optimizer: standard platform options (no OF/Fansly)
 *   - Batch Ops: processes general content library
 *   - All AI prompts use general creator context
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * Adding a new tool:
 *   import { useCreatorMode } from "@/contexts/CreatorModeContext";
 *   const { isAdult, mode, niche, platformOptions, styleOptions } = useCreatorMode();
 *   // Then branch on `isAdult` or use the pre-built config objects.
 */

import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useAuth } from "./AuthContext";

// ── Types ─────────────────────────────────────────────────────────────────────

export type CreatorMode = "adult" | "sfw";

export interface StyleOption {
  value: string;
  label: string;
  description: string;
}

export interface PlatformOption {
  value: string;
  label: string;
  icon: string;
}

export interface ThumbnailNicheOption {
  value: string;
  label: string;
  promptHint: string;
}

export interface CreatorModeConfig {
  /** Whether the creator is in adult/VaultX mode */
  isAdult: boolean;
  /** The raw mode string */
  mode: CreatorMode;
  /** The creator's primary niche string for AI prompts */
  niche: string;
  /** Available color grade / style options for Remix Studio */
  styleOptions: StyleOption[];
  /** Available platforms for Viral Optimizer */
  platformOptions: PlatformOption[];
  /** Available thumbnail niches for Thumbnail Generator */
  thumbnailNiches: ThumbnailNicheOption[];
  /** The teaser generation context for Teaser Factory */
  teaserContext: string;
  /** The batch processing content type label */
  batchLabel: string;
  /** The primary brand color for this mode */
  accentColor: string;
  /** The mode badge label shown in the UI */
  modeBadge: string;
  /** Allow the user to manually switch mode */
  setMode: (mode: CreatorMode) => void;
}

// ── Config Definitions ────────────────────────────────────────────────────────

const ADULT_STYLE_OPTIONS: StyleOption[] = [
  { value: "desire", label: "Desire Grade", description: "Warm gold — the signature VaultX look" },
  { value: "velvet", label: "Velvet", description: "Deep rich tones — luxury and intimacy" },
  { value: "sunrise", label: "Sunrise", description: "Peach amber — soft and glowing" },
  { value: "midnight", label: "Midnight", description: "Cool dramatic — mysterious and bold" },
  { value: "natural", label: "Natural", description: "True-to-life — authentic and raw" },
];

const SFW_STYLE_OPTIONS: StyleOption[] = [
  { value: "vibrant", label: "Vibrant", description: "Bold saturated colors — high energy" },
  { value: "cinematic", label: "Cinematic", description: "Film-grade color — professional look" },
  { value: "clean", label: "Clean", description: "Bright and minimal — lifestyle/vlog" },
  { value: "moody", label: "Moody", description: "Dark and atmospheric — editorial" },
  { value: "natural", label: "Natural", description: "True-to-life — authentic content" },
];

const ADULT_PLATFORM_OPTIONS: PlatformOption[] = [
  { value: "onlyfans", label: "OnlyFans", icon: "💎" },
  { value: "fansly", label: "Fansly", icon: "🔥" },
  { value: "tiktok", label: "TikTok (SFW)", icon: "🎵" },
  { value: "instagram", label: "Instagram Reels", icon: "📸" },
  { value: "x", label: "X (Twitter)", icon: "🐦" },
  { value: "reddit", label: "Reddit", icon: "🤖" },
];

const SFW_PLATFORM_OPTIONS: PlatformOption[] = [
  { value: "tiktok", label: "TikTok", icon: "🎵" },
  { value: "instagram", label: "Instagram Reels", icon: "📸" },
  { value: "youtube", label: "YouTube Shorts", icon: "▶️" },
  { value: "x", label: "X (Twitter)", icon: "🐦" },
  { value: "linkedin", label: "LinkedIn", icon: "💼" },
  { value: "pinterest", label: "Pinterest", icon: "📌" },
];

const ADULT_THUMBNAIL_NICHES: ThumbnailNicheOption[] = [
  { value: "body_positive", label: "Body Positive", promptHint: "empowering, confident, body-positive aesthetic with warm tones" },
  { value: "ppv_teaser", label: "PPV Teaser", promptHint: "suggestive but SFW teaser thumbnail with desire-grade color" },
  { value: "lifestyle", label: "Creator Lifestyle", promptHint: "glamorous lifestyle, luxury aesthetic, aspirational" },
  { value: "behind_scenes", label: "Behind the Scenes", promptHint: "candid, authentic, behind-the-scenes creator content" },
  { value: "announcement", label: "Drop Announcement", promptHint: "bold announcement, exclusive drop, high urgency" },
];

const SFW_THUMBNAIL_NICHES: ThumbnailNicheOption[] = [
  { value: "youtube_vlog", label: "YouTube Vlog", promptHint: "bright, energetic, face-forward YouTube thumbnail" },
  { value: "tutorial", label: "Tutorial / How-To", promptHint: "clean instructional thumbnail with before/after or step visual" },
  { value: "fitness", label: "Fitness / Wellness", promptHint: "energetic fitness thumbnail with bold typography" },
  { value: "food", label: "Food / Recipe", promptHint: "appetizing food photography style thumbnail" },
  { value: "business", label: "Business / Finance", promptHint: "professional business thumbnail with authority aesthetic" },
  { value: "gaming", label: "Gaming", promptHint: "high-energy gaming thumbnail with dramatic expression" },
  { value: "beauty", label: "Beauty / Fashion", promptHint: "glamorous beauty thumbnail with vibrant colors" },
  { value: "travel", label: "Travel / Adventure", promptHint: "stunning travel destination thumbnail with wanderlust aesthetic" },
];

// ── Context ───────────────────────────────────────────────────────────────────

const CreatorModeContext = createContext<CreatorModeConfig | undefined>(undefined);

const ADULT_CONTENT_TYPES = ["adult", "vaultx", "nsfw", "body_positive", "onlyfans", "fansly", "18+"];

function detectModeFromContentType(contentType: string[] | null | undefined): CreatorMode {
  if (!contentType || contentType.length === 0) return "sfw";
  const lower = contentType.map((t) => t.toLowerCase());
  return lower.some((t) => ADULT_CONTENT_TYPES.some((a) => t.includes(a))) ? "adult" : "sfw";
}

export function CreatorModeProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();

  // Detect mode from user profile, fall back to localStorage override
  const detectedMode = detectModeFromContentType(user?.contentType);
  const [manualOverride, setManualOverride] = useState<CreatorMode | null>(() => {
    try {
      const stored = localStorage.getItem("creatorMode");
      return stored === "adult" || stored === "sfw" ? stored : null;
    } catch {
      return null;
    }
  });

  const mode: CreatorMode = manualOverride ?? detectedMode;
  const isAdult = mode === "adult";

  const setMode = (newMode: CreatorMode) => {
    setManualOverride(newMode);
    try {
      localStorage.setItem("creatorMode", newMode);
    } catch {}
  };

  // If user profile loads and has a content type, clear any stale override
  useEffect(() => {
    if (user?.contentType && user.contentType.length > 0) {
      // Only auto-clear if the detected mode matches — don't override intentional switches
      const detected = detectModeFromContentType(user.contentType);
      if (detected === manualOverride) {
        setManualOverride(null);
      }
    }
  }, [user?.contentType]);

  const config: CreatorModeConfig = {
    isAdult,
    mode,
    niche: isAdult ? "adult creator / body positive" : (user?.contentType?.[0] ?? "general creator"),
    styleOptions: isAdult ? ADULT_STYLE_OPTIONS : SFW_STYLE_OPTIONS,
    platformOptions: isAdult ? ADULT_PLATFORM_OPTIONS : SFW_PLATFORM_OPTIONS,
    thumbnailNiches: isAdult ? ADULT_THUMBNAIL_NICHES : SFW_THUMBNAIL_NICHES,
    teaserContext: isAdult
      ? "SFW teaser for adult content — suggestive but platform-compliant, desire-grade aesthetic"
      : "engaging preview clip — platform-compliant, high-energy, click-worthy",
    batchLabel: isAdult ? "VaultX Content Library" : "Content Library",
    accentColor: isAdult ? "#a855f7" : "#3b82f6",
    modeBadge: isAdult ? "VaultX Adult" : "General Creator",
    setMode,
  };

  return (
    <CreatorModeContext.Provider value={config}>
      {children}
    </CreatorModeContext.Provider>
  );
}

export function useCreatorMode(): CreatorModeConfig {
  const context = useContext(CreatorModeContext);
  if (context === undefined) {
    throw new Error("useCreatorMode must be used within a CreatorModeProvider");
  }
  return context;
}

// ── Mode Switcher Component ───────────────────────────────────────────────────
// Drop this anywhere in the UI to let the creator switch modes

export function CreatorModeSwitcher({ compact = false }: { compact?: boolean }) {
  const { mode, isAdult, setMode, modeBadge, accentColor } = useCreatorMode();

  if (compact) {
    return (
      <button
        onClick={() => setMode(isAdult ? "sfw" : "adult")}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          padding: "4px 12px",
          borderRadius: 20,
          border: `1px solid ${accentColor}`,
          background: `${accentColor}22`,
          color: accentColor,
          fontSize: 11,
          fontWeight: 700,
          cursor: "pointer",
          letterSpacing: "0.03em",
        }}
        title={`Switch to ${isAdult ? "SFW" : "Adult"} mode`}
      >
        <span>{isAdult ? "🔞" : "✅"}</span>
        <span>{modeBadge}</span>
      </button>
    );
  }

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "12px 16px",
        background: "#13131f",
        borderRadius: 12,
        border: "1px solid #1e1e2e",
      }}
    >
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: "#e2e8f0" }}>Creator Mode</div>
        <div style={{ fontSize: 12, color: "#6b7280" }}>
          {isAdult
            ? "Adult / VaultX — all adult creator tools enabled"
            : "General Creator — SFW tools and platforms only"}
        </div>
      </div>
      <div style={{ display: "flex", gap: 6 }}>
        {(["adult", "sfw"] as CreatorMode[]).map((m) => (
          <button
            key={m}
            onClick={() => setMode(m)}
            style={{
              padding: "6px 14px",
              borderRadius: 8,
              border: mode === m ? `1px solid ${accentColor}` : "1px solid #2a2a3a",
              background: mode === m ? `${accentColor}22` : "#1a1a2e",
              color: mode === m ? accentColor : "#6b7280",
              fontSize: 12,
              fontWeight: 700,
              cursor: "pointer",
              textTransform: "capitalize",
            }}
          >
            {m === "adult" ? "🔞 Adult" : "✅ SFW"}
          </button>
        ))}
      </div>
    </div>
  );
}
