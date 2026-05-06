/**
 * CreatorModeContext
 *
 * Single source of truth for Adult (VaultX) vs SFW (General Creator) mode.
 *
 * Persistence chain (in priority order):
 * 1. DB: user.contentType — set during onboarding and persisted via profile.updateContentType
 * 2. localStorage: fallback for guests or when DB hasn't loaded yet
 *
 * When the user manually switches mode via the UI:
 *   → profile.updateContentType mutation fires → writes to DB
 *   → localStorage is also updated as a fast-read cache
 *   → On next load, DB value takes precedence
 *
 * Adding a new tool (3 lines):
 *   import { useCreatorMode } from "@/contexts/CreatorModeContext";
 *   const { isAdult, platformOptions, styleOptions, thumbnailNiches } = useCreatorMode();
 *   // Branch on isAdult or use the pre-built config objects
 */

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import { useAuth } from "./AuthContext";
import { trpc } from "@/lib/trpc";

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
  isAdult: boolean;
  mode: CreatorMode;
  niche: string;
  styleOptions: StyleOption[];
  platformOptions: PlatformOption[];
  thumbnailNiches: ThumbnailNicheOption[];
  teaserContext: string;
  batchLabel: string;
  accentColor: string;
  modeBadge: string;
  isPersisting: boolean;
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
  { value: "tiktok", label: "TikTok (SFW Funnel)", icon: "🎵" },
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

function getLocalStorageMode(): CreatorMode | null {
  try {
    const stored = localStorage.getItem("creatorMode");
    return stored === "adult" || stored === "sfw" ? stored : null;
  } catch {
    return null;
  }
}

function setLocalStorageMode(mode: CreatorMode) {
  try {
    localStorage.setItem("creatorMode", mode);
  } catch {}
}

export function CreatorModeProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();

  // Determine initial mode: DB value > localStorage > default sfw
  const dbMode = detectModeFromContentType(user?.contentType);
  const [mode, setModeState] = useState<CreatorMode>(() => {
    // If user is loaded and has a content_type, use DB value
    if (user?.contentType && user.contentType.length > 0) {
      return dbMode;
    }
    // Otherwise fall back to localStorage
    return getLocalStorageMode() ?? "sfw";
  });
  const [isPersisting, setIsPersisting] = useState(false);

  // When user profile loads (async), sync mode from DB
  useEffect(() => {
    if (user?.contentType && user.contentType.length > 0) {
      const detected = detectModeFromContentType(user.contentType);
      setModeState(detected);
      setLocalStorageMode(detected);
    }
  }, [user?.contentType?.join(",")]);

  // tRPC mutation to persist mode to DB
  const updateContentType = trpc.profile.updateContentType.useMutation({
    onSuccess: () => setIsPersisting(false),
    onError: () => setIsPersisting(false),
  });

  const setMode = useCallback((newMode: CreatorMode) => {
    setModeState(newMode);
    setLocalStorageMode(newMode);
    // Persist to DB
    setIsPersisting(true);
    updateContentType.mutate({ contentType: [newMode] });
  }, [updateContentType]);

  const isAdult = mode === "adult";

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
    isPersisting,
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

export function CreatorModeSwitcher({ compact = false }: { compact?: boolean }) {
  const { mode, isAdult, setMode, modeBadge, accentColor, isPersisting } = useCreatorMode();

  if (compact) {
    return (
      <button
        onClick={() => setMode(isAdult ? "sfw" : "adult")}
        disabled={isPersisting}
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
          cursor: isPersisting ? "wait" : "pointer",
          letterSpacing: "0.03em",
          opacity: isPersisting ? 0.7 : 1,
        }}
        title={isPersisting ? "Saving mode..." : `Switch to ${isAdult ? "SFW" : "Adult"} mode`}
      >
        <span>{isAdult ? "🔞" : "✅"}</span>
        <span>{isPersisting ? "Saving..." : modeBadge}</span>
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
        {isPersisting && (
          <div style={{ fontSize: 11, color: accentColor, marginTop: 2 }}>Saving to your profile...</div>
        )}
      </div>
      <div style={{ display: "flex", gap: 6 }}>
        {(["adult", "sfw"] as CreatorMode[]).map((m) => (
          <button
            key={m}
            onClick={() => setMode(m)}
            disabled={isPersisting}
            style={{
              padding: "6px 14px",
              borderRadius: 8,
              border: mode === m ? `1px solid ${accentColor}` : "1px solid #2a2a3a",
              background: mode === m ? `${accentColor}22` : "#1a1a2e",
              color: mode === m ? accentColor : "#6b7280",
              fontSize: 12,
              fontWeight: 700,
              cursor: isPersisting ? "wait" : "pointer",
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
