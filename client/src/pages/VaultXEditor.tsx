import React from "react";
import { useState, useRef, useEffect, useCallback } from "react";
import { trpc } from "../lib/trpc";
import { toast } from "sonner";
import { Slider } from "@/components/ui/slider";
import {
  Play, Pause, SkipBack, SkipForward, Scissors, Trash2,
  Download, Upload, ChevronDown, Loader2,
  Film, Music, Image, Layers, ZoomIn,
  Eye, Plus, Volume2, VolumeX,
  Save, CheckCircle,
  FileVideo, Wand2, HardDrive, Sparkles,
  Brain, Send, Calendar,
  Flame, Crown, X, RefreshCw,
  Copy, Camera, Type,
  Lock, Clock, EyeOff, Crosshair, Layers2, Crop, Minus, ScanLine, Blend, Eraser, Paintbrush, Feather, Sparkle, Gauge, RotateCcw, Maximize2, Radio, Contrast, Sliders, Aperture, Droplets, Sun, Moon, Wind, AlignCenter, AlignLeft, AlignRight, Bold, Italic, Hash, Share2, Check, Settings, Info, Star, Shield, Zap, TrendingUp, Target, Move, Clapperboard, Mic, DollarSign, ArrowLeft, AlertTriangle
} from "lucide-react";

// ─── VaultX Color System ──────────────────────────────────────────────────────
const C = {
  bg:         "#000000",
  surface:    "#0A0A0A",
  surfaceMid: "#111111",
  surfaceHi:  "#161616",
  border:     "#1F1F1F",
  borderHi:   "#2A2A2A",
  text:       "#FFFFFF",
  muted:      "#6B7280",
  mutedLo:    "#374151",
  accent:     "#8B5CF6",
  accentDim:  "rgba(139,92,246,0.15)",
  gold:       "#F59E0B",
  goldDim:    "rgba(245,158,11,0.15)",
  pink:       "#EC4899",
  pinkDim:    "rgba(236,72,153,0.15)",
  green:      "#10B981",
  greenDim:   "rgba(16,185,129,0.15)",
  red:        "#EF4444",
  redDim:     "rgba(239,68,68,0.15)",
};


const WORKFLOW_STEPS = [
  { step: "01", label: "Ingest", detail: "Upload, analyze quality, and lock the project brief.", icon: Upload, color: C.accent },
  { step: "02", label: "Enhance", detail: "Polish visuals, captions, audio, color, and pacing.", icon: Sparkles, color: C.pink },
  { step: "03", label: "Package", detail: "Create master, teaser, PPV, social, and archive outputs.", icon: Layers, color: C.gold },
  { step: "04", label: "Launch", detail: "Publish, schedule, and distribute with revenue copy.", icon: Send, color: C.green },
];

const PRODUCTION_PRESETS = [
  {
    id: "premium_ppv",
    label: "Premium PPV Drop",
    desc: "Master export, paid teaser, VIP caption pack, and upsell message.",
    color: C.gold,
    outputs: ["master", "ppv_drop", "caption_pack", "thumbnail", "archive"],
    compliance: "vip",
    format: "9:16",
    platforms: ["onlyfans", "telegram_teaser", "master"],
    watermark: true,
  },
  {
    id: "safe_funnel",
    label: "SFW Funnel Sprint",
    desc: "Platform-safe teaser, CTA overlay, captions, and social-ready cutdowns.",
    color: C.green,
    outputs: ["sfw_teaser", "social_cut", "caption_pack", "thumbnail", "calendar"],
    compliance: "platform_safe",
    format: "9:16",
    platforms: ["instagram_sfw", "tiktok", "twitter"],
    watermark: true,
  },
  {
    id: "viral_teaser",
    label: "Viral Teaser Factory",
    desc: "Hook-first short edits, captions, punch zooms, and watch-time pacing.",
    color: C.pink,
    outputs: ["sfw_teaser", "social_cut", "caption_pack", "thumbnail"],
    compliance: "platform_safe",
    format: "9:16",
    platforms: ["tiktok", "instagram_sfw", "twitter"],
    watermark: true,
  },
  {
    id: "retention",
    label: "Subscriber Retention Pack",
    desc: "Archive master, loyalty copy, calendar placement, and renewal assets.",
    color: C.accent,
    outputs: ["master", "caption_pack", "calendar", "archive", "ppv_drop"],
    compliance: "subscriber",
    format: "4:5",
    platforms: ["onlyfans", "master", "telegram_teaser"],
    watermark: false,
  },
] as const;

const WORLD_CLASS_OUTPUTS = [
  { id: "master", label: "Studio Master", desc: "High-quality source export with color, audio, and caption polish.", icon: FileVideo, color: C.accent },
  { id: "sfw_teaser", label: "SFW Teaser", desc: "Safe promotional preview for discovery channels and top-of-funnel marketing.", icon: Shield, color: C.green },
  { id: "ppv_drop", label: "PPV Drop", desc: "Paid content package with pricing, title, pitch, and premium cover framing.", icon: Crown, color: C.gold },
  { id: "social_cut", label: "Social Cutdowns", desc: "9:16, 1:1, and 16:9 edits for Reels, TikTok, X, and Telegram.", icon: Share2, color: C.pink },
  { id: "caption_pack", label: "Caption Pack", desc: "Teaser copy, subscriber copy, PPV pitch, and mass-message templates.", icon: Hash, color: "#3B82F6" },
  { id: "thumbnail", label: "Thumbnail + Cover", desc: "Click-ready covers, launch art, and platform-safe preview frames.", icon: Camera, color: "#A855F7" },
  { id: "calendar", label: "Launch Calendar", desc: "Two-week campaign timing with distribution and monetization notes.", icon: Calendar, color: "#F97316" },
  { id: "archive", label: "Vault Archive", desc: "Organized backups with metadata, tags, and reuse notes for future drops.", icon: HardDrive, color: "#64748B" },
];

const COMPLIANCE_MODES = {
  platform_safe: { label: "Platform Safe", desc: "Cropped, blurred, or censored preview assets for public discovery.", color: C.green, icon: Shield },
  subscriber: { label: "Subscriber", desc: "Unlocked member content with captions, watermark, and retention copy.", color: C.accent, icon: Lock },
  vip: { label: "VIP / PPV", desc: "Premium paid drop with price framing, teaser, and upsell messaging.", color: C.gold, icon: Crown },
  archive: { label: "Archive", desc: "Clean source backup with metadata for reuse and future launches.", color: "#64748B", icon: HardDrive },
} as const;

const OUTPUT_LANE_COPY: Record<string, string> = {
  master: "polished master",
  sfw_teaser: "safe teaser",
  ppv_drop: "paid PPV drop",
  social_cut: "social cutdowns",
  caption_pack: "sales copy",
  thumbnail: "cover art",
  calendar: "launch plan",
  archive: "vault archive",
};

const CREATOR_INTELLIGENCE_RULES = [
  {
    label: "Hook Shot",
    icon: Target,
    color: C.pink,
    detail: "Open with the clearest face, eye-line, movement, or luxury-frame moment. Do not waste the first three seconds on setup.",
  },
  {
    label: "Angle Stack",
    icon: Camera,
    color: C.accent,
    detail: "Build a sequence from wide context, medium body language, close detail, reaction, then reveal. Reorder weak footage around the strongest frame.",
  },
  {
    label: "Teaser Logic",
    icon: EyeOff,
    color: C.green,
    detail: "For public channels, crop, blur, or cut before the explicit payoff. Give enough tension to click, but reserve the unlock moment for paid viewers.",
  },
  {
    label: "Paid Package",
    icon: DollarSign,
    color: C.gold,
    detail: "Every paid drop needs a master file, cover frame, title, price cue, direct message copy, tags, and archived source for future bundles.",
  },
];


// ============================================================================
// TYPES
// ============================================================================
interface TimelineClip {
  id: string;
  trackIndex: number;
  startTime: number;
  duration: number;
  sourceUrl: string;
  label: string;
  type: "video" | "audio" | "image" | "text";
  color: string;
  volume: number;
  muted: boolean;
  locked: boolean;
  visible: boolean;
  trimIn: number;
  trimOut: number;
  effects: string[];
}
interface EditorProject {
  id?: number;
  title: string;
  projectType: "video" | "photo_set" | "audio";
  aspectRatio: "9:16" | "16:9" | "1:1" | "4:5";
  durationSeconds: number;
}
interface BodyRegionData {
  detected: boolean;
  confidence: number;
  enhancement_recommended: boolean;
}
interface BodyMap {
  regions_detected: Record<string, BodyRegionData>;
  strongest_assets: string[];
  body_type: string;
  pose: string;
  monetization_potential: number;
}
interface ContentAnalysis {
  content_type: string;
  lighting_quality: number;
  image_quality: number;
  strongest_assets: string[];
  pricing_recommendation: number;
  skin_tone_detected: string;
  monetization_potential: number;
}
interface Variation {
  variation: string;
  label: string;
  url: string;
  qualityScore: number;
  description?: string;
  status?: string;
}

const EXPORT_PRESETS = [
  { id: "onlyfans",        label: "OnlyFans Master",  desc: "1080p H.264, 9:16",    color: "#00AFF0" },
  { id: "tiktok",          label: "TikTok / Reels",   desc: "1080×1920, 60fps",     color: "#FF0050" },
  { id: "telegram_teaser", label: "Telegram Teaser",  desc: "720p, fast upload",    color: "#26A5E4" },
  { id: "twitter",         label: "Twitter / X",      desc: "720p, under 512MB",    color: "#1DA1F2" },
  { id: "instagram_sfw",   label: "Instagram SFW",    desc: "1080×1080, safe crop", color: "#E1306C" },
  { id: "master",          label: "Master Archive",   desc: "4K if source allows",  color: "#8B5CF6" },
] as const;

const BODY_REGIONS = [
  { id: "face",    label: "FACE",   icon: "👤", color: "#EC4899" },
  { id: "bust",    label: "BUST",   icon: "💎", color: "#8B5CF6" },
  { id: "abdomen", label: "ABS",    icon: "⚡", color: "#F59E0B" },
  { id: "hips",    label: "HIPS",   icon: "🔥", color: "#EF4444" },
  { id: "glutes",  label: "GLUTES", icon: "✨", color: "#10B981" },
  { id: "legs",    label: "LEGS",   icon: "💫", color: "#3B82F6" },
  { id: "full",    label: "FULL",   icon: "👑", color: "#C9A84C" },
] as const;

const TRACK_COLORS = ["#8B5CF6", "#3B82F6", "#10B981", "#F59E0B", "#EF4444", "#EC4899"];

async function parseVideoStudioUrl(response: Response, operation: string): Promise<string> {
  const data = await response.json().catch(() => null);
  if (!response.ok || !data?.url) {
    throw new Error(data?.error || data?.message || `${operation} failed before producing an output file.`);
  }
  return data.url as string;
}

function filenameFromUrl(url: string, fallback: string): string {
  try {
    return decodeURIComponent(new URL(url).pathname.split("/").filter(Boolean).pop() || fallback);
  } catch {
    return fallback;
  }
}

async function uploadVaultXFile(file: File, onProgress?: (progress: number) => void): Promise<{ url: string; filename: string }> {
  const uploadId = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const chunkSize = 8 * 1024 * 1024;
  const totalChunks = Math.max(1, Math.ceil(file.size / chunkSize));

  const initRes = await fetch("/api/video/upload/init", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ uploadId, totalChunks, filename: file.name }),
  });
  if (!initRes.ok) {
    const err = await initRes.json().catch(() => ({}));
    throw new Error(err.error || "Upload session could not be initialized.");
  }

  let uploaded: { url: string; filename: string } | null = null;
  for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex += 1) {
    const start = chunkIndex * chunkSize;
    const chunk = file.slice(start, Math.min(start + chunkSize, file.size));
    const fd = new FormData();
    fd.append("uploadId", uploadId);
    fd.append("chunkIndex", String(chunkIndex));
    fd.append("chunk", chunk, file.name);
    const chunkRes = await fetch("/api/video/upload/chunk", { method: "POST", body: fd });
    const chunkData = await chunkRes.json().catch(() => null);
    if (!chunkRes.ok) throw new Error(chunkData?.error || `Upload chunk ${chunkIndex + 1} failed.`);
    onProgress?.(Math.round(((chunkIndex + 1) / totalChunks) * 100));
    if (chunkData?.complete && chunkData.file?.url) uploaded = chunkData.file;
  }

  if (!uploaded) {
    const finalRes = await fetch("/api/video/upload/finalize", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ uploadId, filename: file.name }),
    });
    const finalData = await finalRes.json().catch(() => null);
    if (!finalRes.ok || !finalData?.url) throw new Error(finalData?.error || "Upload finalization failed.");
    uploaded = finalData;
  }

  return uploaded!;
}

// ============================================================================

// ─── Tool Categories (from VaultXVideoEditor) ─────────────────────────────────
const TOOL_CATEGORIES = [
  {
    id: "ppv", label: "PPV & Monetize",
    tools: [
      { id: "ppv-smart",    label: "Smart PPV Teaser",    icon: Crown,     desc: "AI picks best 30s + blur ending + watermark + caption" },
      { id: "ppv-custom",   label: "Custom Teaser",       icon: Scissors,  desc: "Choose start/end, blur intensity, overlay style" },
      { id: "ppv-countdown",label: "Countdown Overlay",   icon: Clock,     desc: "Add animated countdown timer to tease drop" },
      { id: "ppv-price-tag",label: "Price Tag Overlay",   icon: DollarSign,desc: "Burn in your PPV price + CTA button graphic" },
      { id: "ppv-preview",  label: "Preview Reel",        icon: Eye,       desc: "Multi-clip preview montage for subscription page" },
      { id: "ppv-lock",     label: "Lock Screen Reveal",  icon: Lock,      desc: "Animated lock → blur → reveal effect" },
    ],
  },
  {
    id: "censor", label: "SFW / Censor",
    tools: [
      { id: "censor-smart", label: "Smart Body Censor",   icon: ScanLine,  desc: "AI detects regions, applies mosaic/blur automatically" },
      { id: "censor-face",  label: "Face Blur / Mask",    icon: EyeOff,    desc: "Blur, pixelate, or mask faces — full or partial" },
      { id: "censor-region",label: "Region Censor",       icon: Crop,      desc: "Draw censor zones manually, animate them" },
      { id: "censor-mosaic",label: "Mosaic Pixelate",     icon: Layers2,   desc: "Japanese-style mosaic censor with intensity control" },
      { id: "censor-bar",   label: "Black Bar Censor",    icon: Minus,     desc: "Classic black bar with custom width/angle" },
      { id: "censor-sticker",label: "Emoji / Sticker",   icon: Sparkles,  desc: "Place animated emoji/sticker over regions" },
      { id: "censor-export",label: "Platform SFW Export", icon: Download,  desc: "Auto-comply for Instagram, TikTok, X, Reddit" },
    ],
  },
  {
    id: "scene", label: "Scene & Story",
    tools: [
      { id: "scene-detect", label: "AI Scene Detect",     icon: Crosshair, desc: "Auto-detect cuts, hard/soft transitions, scene types" },
      { id: "scene-reorder",label: "Scene Reorder",       icon: Layers,    desc: "Drag-and-drop detected scenes into new sequence" },
      { id: "scene-trim",   label: "Precision Trim",      icon: Scissors,  desc: "Frame-accurate trim with waveform + thumbnail strip" },
      { id: "scene-split",  label: "Multi-Split",         icon: Film,      desc: "Split at multiple points simultaneously" },
      { id: "scene-merge",  label: "Merge Clips",         icon: Plus,      desc: "Concatenate selected clips with transition" },
      { id: "scene-transition", label: "Transitions",     icon: Blend,     desc: "Dissolve, wipe, flash, glitch, burn between scenes" },
      { id: "scene-broll",  label: "B-Roll Insert",       icon: Camera,    desc: "Insert B-roll clips at detected cut points" },
      { id: "scene-loop",   label: "Loop / Boomerang",    icon: RefreshCw, desc: "Create seamless loop or boomerang from any clip" },
    ],
  },
  {
    id: "motion", label: "Motion & Speed",
    tools: [
      { id: "motion-slowmo",    label: "Slow Motion",       icon: Gauge,     desc: "RIFE AI 120fps interpolation — buttery smooth" },
      { id: "motion-ramp",      label: "Speed Ramp",        icon: TrendingUp,desc: "Fast → slow → fast, keyframe speed curve" },
      { id: "motion-freeze",    label: "Freeze Frame",      icon: Pause,     desc: "Freeze on a specific frame with duration control" },
      { id: "motion-timelapse", label: "Timelapse",         icon: SkipForward,desc: "Speed up 2x–100x with motion blur" },
      { id: "motion-reverse",   label: "Reverse",           icon: RotateCcw, desc: "Play clip backwards, with or without audio" },
      { id: "motion-stutter",   label: "Stutter Cut",       icon: Radio,     desc: "Rhythmic stutter effect synced to beat" },
      { id: "motion-zoom",      label: "Punch Zoom",        icon: Maximize2, desc: "Animated zoom into a specific region" },
    ],
  },
  {
    id: "color", label: "Color & Look",
    tools: [
      { id: "color-velvet",     label: "Velvet Skin",       icon: Droplets,  desc: "Warm skin-tone optimized LUT — OnlyFans gold standard" },
      { id: "color-boudoir",    label: "Boudoir Light",     icon: Sun,       desc: "Soft warm boudoir lighting grade" },
      { id: "color-desire",     label: "Desire Haze",       icon: Moon,      desc: "Moody desaturated with warm skin retention" },
      { id: "color-cinematic",  label: "Cinematic",         icon: Film,      desc: "Hollywood teal-orange grade" },
      { id: "color-noir",       label: "Noir",              icon: Contrast,  desc: "High contrast black and white" },
      { id: "color-custom",     label: "Custom Grade",      icon: Sliders,   desc: "Full manual control: brightness, contrast, saturation" },
    ],
  },
  {
    id: "text", label: "Text & Captions",
    tools: [
      { id: "text-autocaption", label: "Auto Captions",     icon: Hash,      desc: "Whisper AI transcription → burn-in captions" },
      { id: "text-overlay",     label: "Text Overlay",      icon: Type,      desc: "Add custom text with font, size, position, animation" },
      { id: "text-watermark",   label: "Watermark",         icon: Shield,    desc: "Burn your handle/logo into the video" },
      { id: "text-cta",         label: "CTA Overlay",       icon: Zap,       desc: "Animated call-to-action button overlay" },
    ],
  },
  {
    id: "audio", label: "Audio",
    tools: [
      { id: "audio-normalize",  label: "Normalize",         icon: Volume2,   desc: "Loudness normalization to -14 LUFS" },
      { id: "audio-denoise",    label: "Denoise",           icon: Wind,      desc: "Remove background noise and hiss" },
      { id: "audio-music",      label: "Music Bed",         icon: Music,     desc: "Add AI-generated sensual background music" },
      { id: "audio-voice",      label: "Voice Enhance",     icon: Mic,       desc: "ElevenLabs voice synthesis or enhancement" },
    ],
  },
  {
    id: "format", label: "Format / Export",
    tools: [
      { id: "format-onlyfans",  label: "OnlyFans",          icon: Crown,     desc: "1080p MP4, H.264, optimized bitrate" },
      { id: "format-fansly",    label: "Fansly",            icon: Star,      desc: "1080p MP4, Fansly-optimized" },
      { id: "format-instagram", label: "Instagram Reels",   icon: Camera,    desc: "9:16 vertical, 1080x1920, 30fps" },
      { id: "format-tiktok",    label: "TikTok",            icon: Zap,       desc: "9:16 vertical, TikTok spec" },
      { id: "format-twitter",   label: "Twitter / X",       icon: Share2,    desc: "16:9 or 1:1, 1080p, Twitter spec" },
    ],
  },
];


// TIMELINE TRACK
// ============================================================================
function TimelineTrack({ trackIndex, clips, totalDuration, pixelsPerSecond, selectedClipId, onSelectClip, onDeleteClip }: {
  trackIndex: number; clips: TimelineClip[]; totalDuration: number; pixelsPerSecond: number;
  selectedClipId: string | null; onSelectClip: (id: string) => void; onDeleteClip: (id: string) => void;
}) {
  const trackClips = clips.filter(c => c.trackIndex === trackIndex);
  const trackWidth = Math.max(totalDuration * pixelsPerSecond, 800);
  return (
    <div className="relative flex-shrink-0" style={{ height: 44, width: trackWidth, background: "rgba(255,255,255,0.02)", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
      {trackClips.map(clip => {
        const left = clip.startTime * pixelsPerSecond;
        const width = Math.max(clip.duration * pixelsPerSecond, 24);
        const isSelected = selectedClipId === clip.id;
        return (
          <div key={clip.id} onClick={() => onSelectClip(clip.id)}
            className="absolute top-1 bottom-1 rounded-lg flex items-center px-2 cursor-pointer select-none overflow-hidden"
            style={{ left, width, background: isSelected ? `${clip.color}40` : `${clip.color}20`, border: `1.5px solid ${isSelected ? clip.color : clip.color + "60"}` }}>
            <span className="text-[10px] font-bold truncate" style={{ color: clip.color }}>{clip.label}</span>
            {isSelected && (
              <button onClick={e => { e.stopPropagation(); onDeleteClip(clip.id); }}
                className="ml-auto flex-shrink-0 w-4 h-4 rounded flex items-center justify-center" style={{ background: "rgba(239,68,68,0.3)" }}>
                <Trash2 size={8} style={{ color: "#EF4444" }} />
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ============================================================================
// BODY SILHOUETTE — Interactive SVG
// ============================================================================
function BodySilhouette({ bodyMap, activeRegion, onRegionClick }: {
  bodyMap: BodyMap | null; activeRegion: string | null; onRegionClick: (r: string) => void;
}) {
  const regions = bodyMap?.regions_detected || {};
  const getColor = (id: string) => {
    const r = BODY_REGIONS.find(r => r.id === id);
    const detected = regions[id]?.detected;
    const isActive = activeRegion === id;
    if (isActive) return r?.color || "#C9A84C";
    if (detected) return (r?.color || "#C9A84C") + "80";
    return "rgba(255,255,255,0.08)";
  };
  const getStroke = (id: string) => {
    const r = BODY_REGIONS.find(r => r.id === id);
    return activeRegion === id ? r?.color || "#C9A84C" : "rgba(255,255,255,0.15)";
  };
  return (
    <div className="relative flex flex-col items-center" style={{ width: 110, height: 260 }}>
      <svg width="110" height="260" viewBox="0 0 110 260" fill="none" xmlns="http://www.w3.org/2000/svg">
        <ellipse cx="55" cy="26" rx="16" ry="20" fill={getColor("face")} stroke={getStroke("face")} strokeWidth={activeRegion === "face" ? 2 : 1} style={{ cursor: "pointer" }} onClick={() => onRegionClick("face")} />
        <rect x="49" y="44" width="12" height="10" rx="3" fill="rgba(255,255,255,0.12)" />
        <path d="M18 65 Q28 54 55 56 Q82 54 92 65 L90 102 Q82 112 55 114 Q28 112 20 102 Z" fill={getColor("bust")} stroke={getStroke("bust")} strokeWidth={activeRegion === "bust" ? 2 : 1} style={{ cursor: "pointer" }} onClick={() => onRegionClick("bust")} />
        <path d="M26 104 Q28 104 55 106 Q82 104 84 104 L82 138 Q74 145 55 146 Q36 145 28 138 Z" fill={getColor("abdomen")} stroke={getStroke("abdomen")} strokeWidth={activeRegion === "abdomen" ? 2 : 1} style={{ cursor: "pointer" }} onClick={() => onRegionClick("abdomen")} />
        <path d="M24 140 Q26 138 55 140 Q84 138 86 140 L88 168 Q78 180 55 182 Q32 180 22 168 Z" fill={getColor("hips")} stroke={getStroke("hips")} strokeWidth={activeRegion === "hips" ? 2 : 1} style={{ cursor: "pointer" }} onClick={() => onRegionClick("hips")} />
        <path d="M22 170 Q28 180 42 184 L42 206 Q34 206 26 196 Z" fill={getColor("glutes")} stroke={getStroke("glutes")} strokeWidth={activeRegion === "glutes" ? 2 : 1} style={{ cursor: "pointer" }} onClick={() => onRegionClick("glutes")} />
        <path d="M88 170 Q82 180 68 184 L68 206 Q76 206 84 196 Z" fill={getColor("glutes")} stroke={getStroke("glutes")} strokeWidth={activeRegion === "glutes" ? 2 : 1} style={{ cursor: "pointer" }} onClick={() => onRegionClick("glutes")} />
        <path d="M24 180 L40 184 L38 248 Q34 254 28 254 Q22 254 20 248 Z" fill={getColor("legs")} stroke={getStroke("legs")} strokeWidth={activeRegion === "legs" ? 2 : 1} style={{ cursor: "pointer" }} onClick={() => onRegionClick("legs")} />
        <path d="M86 180 L70 184 L72 248 Q76 254 82 254 Q88 254 90 248 Z" fill={getColor("legs")} stroke={getStroke("legs")} strokeWidth={activeRegion === "legs" ? 2 : 1} style={{ cursor: "pointer" }} onClick={() => onRegionClick("legs")} />
        <path d="M18 65 L7 67 L5 102 Q7 107 12 107 L20 104 Z" fill="rgba(255,255,255,0.1)" stroke="rgba(255,255,255,0.12)" strokeWidth="1" />
        <path d="M92 65 L103 67 L105 102 Q103 107 98 107 L90 104 Z" fill="rgba(255,255,255,0.1)" stroke="rgba(255,255,255,0.12)" strokeWidth="1" />
      </svg>
      <button onClick={() => onRegionClick("full")} className="absolute bottom-0 left-1/2 -translate-x-1/2 px-2.5 py-0.5 rounded-full text-[8px] font-black"
        style={{ background: activeRegion === "full" ? "rgba(201,168,76,0.25)" : "rgba(255,255,255,0.05)", border: `1px solid ${activeRegion === "full" ? "#C9A84C" : "rgba(255,255,255,0.08)"}`, color: activeRegion === "full" ? "#C9A84C" : "#4B5563" }}>
        FULL BODY
      </button>
    </div>
  );
}

// ============================================================================
// VARIATION CARD
// ============================================================================
function VariationCard({ variation, isSelected, onSelect }: { variation: Variation; isSelected: boolean; onSelect: () => void }) {
  const colorMap: Record<string, string> = { natural: "#22C55E", enhanced: "#8B5CF6", cinematic: "#C9A84C" };
  const color = colorMap[variation.variation] || "#6B7280";
  return (
    <div onClick={onSelect} className="relative flex flex-col overflow-hidden rounded-2xl cursor-pointer"
      style={{ border: `2px solid ${isSelected ? color : "rgba(255,255,255,0.08)"}`, background: isSelected ? `${color}10` : "rgba(255,255,255,0.03)", transition: "all 0.2s", boxShadow: isSelected ? `0 0 20px ${color}30` : "none" }}>
      <div className="relative" style={{ aspectRatio: "9/16", background: "#0A0A0A", minHeight: 90 }}>
        {variation.url ? (
          <img src={variation.url} alt={variation.label} className="w-full h-full object-cover" />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            {variation.status === "processing" ? <Loader2 size={16} className="animate-spin" style={{ color }} /> : <Sparkles size={16} style={{ color: "#374151" }} />}
          </div>
        )}
        <div className="absolute top-1.5 right-1.5 px-1.5 py-0.5 rounded-md text-[8px] font-black" style={{ background: `${color}30`, color, border: `1px solid ${color}50` }}>{variation.qualityScore}/10</div>
        {isSelected && <div className="absolute top-1.5 left-1.5 w-5 h-5 rounded-full flex items-center justify-center" style={{ background: color }}><CheckCircle size={10} color="#000" /></div>}
      </div>
      <div className="p-2">
        <p className="text-[10px] font-black" style={{ color }}>{variation.label}</p>
        {variation.description && <p className="text-[8px] mt-0.5 leading-tight" style={{ color: "#6B7280" }}>{variation.description}</p>}
      </div>
    </div>
  );
}

// ============================================================================
// MAIN VAULTX EDITOR
// ============================================================================

// ─── PPV Panel ────────────────────────────────────────────────────────────────
function PPVPanel({ clipUrl, duration, onStatus, projectId, onAddClip, onAddAudioTrack }: {
  clipUrl: string; duration: number; onStatus: (s: string) => void;
  projectId: string; onAddClip: (a: any) => void; onAddAudioTrack: (a: any) => void;
}) {
  const cat = TOOL_CATEGORIES.find(c => c.id === "ppv")!;
  const [activeSub, setActiveSub] = React.useState(cat.tools[0].id);
  const [teaserLen, setTeaserLen] = React.useState(30);
  const [blurEnd, setBlurEnd] = React.useState(true);
  const [blurIntensity, setBlurIntensity] = React.useState(20);
  const [addWatermark, setAddWatermark] = React.useState(false);
  const [watermarkText, setWatermarkText] = React.useState("@YourHandle");
  const [price, setPrice] = React.useState("$9.99");
  const [busy, setBusy] = React.useState(false);
  const createAsset = trpc.creatorVideoEditor.createAsset.useMutation();

  const run = async () => {
    if (!clipUrl) { onStatus("No clip selected"); return; }
    setBusy(true);
    try {
      const sourceBlob = await fetch(clipUrl).then(r => r.blob());
      const trimFd = new FormData();
      trimFd.append("video", sourceBlob, "clip.mp4");
      trimFd.append("start", "0");
      trimFd.append("end", String(teaserLen));
      const trimRes = await fetch("/api/video-studio/trim", { method: "POST", body: trimFd });
      let cleanUrl = await parseVideoStudioUrl(trimRes, "PPV teaser trim");
      if (addWatermark && watermarkText) {
        const watermarkFd = new FormData();
        watermarkFd.append("video", await fetch(cleanUrl).then(r => r.blob()), "teaser.mp4");
        watermarkFd.append("text", watermarkText);
        watermarkFd.append("position", "top_right");
        const watermarkRes = await fetch("/api/video-studio/watermark", { method: "POST", body: watermarkFd });
        cleanUrl = await parseVideoStudioUrl(watermarkRes, "PPV watermark");
      }
      if (blurEnd) {
        const teaseFd = new FormData();
        teaseFd.append("video", await fetch(cleanUrl).then(r => r.blob()), "teaser.mp4");
        teaseFd.append("filter", "ppv_censor");
        teaseFd.append("intensity", String(Math.max(0.1, Math.min(1, blurIntensity / 40))));
        const teaseRes = await fetch("/api/video-studio/filter", { method: "POST", body: teaseFd });
        cleanUrl = await parseVideoStudioUrl(teaseRes, "PPV end blur");
      }
      if (activeSub === "ppv-price-tag") {
        const priceFd = new FormData();
        priceFd.append("video", await fetch(cleanUrl).then(r => r.blob()), "teaser.mp4");
        priceFd.append("text", `PPV ${price}`);
        priceFd.append("position", "center");
        priceFd.append("style", "gold-badge");
        const priceRes = await fetch("/api/video-studio/add-text", { method: "POST", body: priceFd });
        cleanUrl = await parseVideoStudioUrl(priceRes, "PPV price overlay");
      }
      await createAsset.mutateAsync({ fileUrl: cleanUrl, assetType: "output", filename: filenameFromUrl(cleanUrl, "vaultx-ppv-teaser.mp4"), durationSeconds: teaserLen, mimeType: "video/mp4", metadata: { source: "vaultx", isVaultxOutput: true, operation: activeSub, price } });
      onAddClip({ id: Date.now().toString(), src: cleanUrl, assetUrl: cleanUrl, duration: teaserLen, type: "video", name: "PPV Teaser" });
      onStatus("PPV teaser created");
    } catch (e: any) { onStatus("Error: " + e.message); }
    finally { setBusy(false); }
  };

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-1.5">
        {cat.tools.map(t => {
          const Icon = t.icon as any;
          const active = activeSub === t.id;
          return (
            <button key={t.id} onClick={() => setActiveSub(t.id)}
              className="p-2 rounded-xl text-left transition-all"
              style={{ background: active ? C.goldDim : C.surface, border: `1px solid ${active ? C.gold : C.border}` }}>
              <div className="flex items-center gap-1.5 mb-0.5">
                <Icon className="w-3 h-3" style={{ color: active ? C.gold : C.muted }} />
                <span className="text-[10px] font-bold" style={{ color: active ? C.gold : C.text }}>{t.label}</span>
              </div>
              <p className="text-[9px] leading-tight" style={{ color: C.mutedLo }}>{t.desc}</p>
            </button>
          );
        })}
      </div>
      <div className="space-y-3 p-3 rounded-xl" style={{ background: C.surfaceHi, border: `1px solid ${C.border}` }}>
        {(activeSub === "ppv-smart" || activeSub === "ppv-custom") && (
          <>
            <div>
              <div className="flex justify-between mb-1">
                <span className="text-[10px] font-semibold" style={{ color: C.muted }}>Teaser Length</span>
                <span className="text-[10px] font-mono" style={{ color: C.gold }}>{teaserLen}s</span>
              </div>
              <div className="flex gap-1">
                {[15, 20, 30, 45, 60].map(d => (
                  <button key={d} onClick={() => setTeaserLen(d)}
                    className="flex-1 py-1 rounded-lg text-[10px] font-bold transition-all"
                    style={{ background: teaserLen === d ? C.goldDim : C.surface, border: `1px solid ${teaserLen === d ? C.gold : C.border}`, color: teaserLen === d ? C.gold : C.muted }}>
                    {d}s
                  </button>
                ))}
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-semibold" style={{ color: C.muted }}>Blur Ending</span>
              <button onClick={() => setBlurEnd(p => !p)} className="w-10 h-5 rounded-full transition-all relative"
                style={{ background: blurEnd ? C.gold : C.surfaceMid, border: `1px solid ${blurEnd ? C.gold : C.border}` }}>
                <div className="absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all" style={{ left: blurEnd ? "calc(100% - 18px)" : "2px" }} />
              </button>
            </div>
            {blurEnd && (
              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-[10px]" style={{ color: C.muted }}>Blur Intensity</span>
                  <span className="text-[10px] font-mono" style={{ color: C.gold }}>{blurIntensity}</span>
                </div>
                <Slider value={[blurIntensity]} onValueChange={([v]) => setBlurIntensity(v)} min={5} max={40} step={1} />
              </div>
            )}
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-semibold" style={{ color: C.muted }}>Watermark</span>
              <button onClick={() => setAddWatermark(p => !p)} className="w-10 h-5 rounded-full transition-all relative"
                style={{ background: addWatermark ? C.gold : C.surfaceMid, border: `1px solid ${addWatermark ? C.gold : C.border}` }}>
                <div className="absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all" style={{ left: addWatermark ? "calc(100% - 18px)" : "2px" }} />
              </button>
            </div>
            {addWatermark && (
              <input value={watermarkText} onChange={e => setWatermarkText(e.target.value)}
                className="w-full px-2 py-1.5 rounded-lg text-xs"
                style={{ background: C.surface, border: `1px solid ${C.border}`, color: C.text }}
                placeholder="@YourHandle" />
            )}
          </>
        )}
        {activeSub === "ppv-price-tag" && (
          <div>
            <span className="text-[10px] font-semibold block mb-1" style={{ color: C.muted }}>PPV Price</span>
            <div className="flex gap-1 flex-wrap">
              {["$4.99", "$9.99", "$14.99", "$19.99", "$24.99", "$49.99"].map(p => (
                <button key={p} onClick={() => setPrice(p)}
                  className="px-2 py-1 rounded-lg text-[10px] font-bold transition-all"
                  style={{ background: price === p ? C.goldDim : C.surface, border: `1px solid ${price === p ? C.gold : C.border}`, color: price === p ? C.gold : C.muted }}>
                  {p}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
      <button onClick={run} disabled={busy}
        className="w-full py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all"
        style={{ background: `linear-gradient(135deg, ${C.gold}, #D97706)`, color: "#000" }}>
        {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <DollarSign className="w-4 h-4" />}
        {busy ? "Processing..." : "Generate PPV Asset"}
      </button>
    </div>
  );
}

// ─── Censor Panel ─────────────────────────────────────────────────────────────
function CensorPanel({ clipUrl, onStatus, projectId, onAddClip, onAddAudioTrack }: {
  clipUrl: string; duration?: number; onStatus: (s: string) => void;
  projectId: string; onAddClip: (a: any) => void; onAddAudioTrack: (a: any) => void;
}) {
  const cat = TOOL_CATEGORIES.find(c => c.id === "censor")!;
  const [activeSub, setActiveSub] = React.useState(cat.tools[0].id);
  const [intensity, setIntensity] = React.useState(15);
  const [busy, setBusy] = React.useState(false);
  const createAsset = trpc.creatorVideoEditor.createAsset.useMutation();

  const run = async () => {
    if (!clipUrl) { onStatus("No clip selected"); return; }
    setBusy(true);
    try {
      const blob = await fetch(clipUrl).then(r => r.blob());
      const fd = new FormData();
      fd.append("video", blob, "clip.mp4");
      const filterMap: Record<string, string> = {
        "censor-smart": "censor_blur",
        "censor-face": "blur",
        "censor-region": "censor_blur",
        "censor-mosaic": "mosaic",
        "censor-bar": "black_bar",
        "censor-sticker": "ppv_censor",
        "censor-export": "censor_blur",
      };
      fd.append("filter", filterMap[activeSub] ?? "censor_blur");
      fd.append("intensity", String(Math.max(0.1, Math.min(1, intensity / 40))));
      const res = await fetch("/api/video-studio/filter", { method: "POST", body: fd });
      const url = await parseVideoStudioUrl(res, "Censor export");
      await createAsset.mutateAsync({ fileUrl: url, assetType: "output", filename: filenameFromUrl(url, "vaultx-censored.mp4"), durationSeconds: 30, mimeType: "video/mp4", metadata: { source: "vaultx", isVaultxOutput: true, operation: activeSub } });
      onAddClip({ id: Date.now().toString(), src: url, assetUrl: url, duration: 30, type: "video", name: "Censored" });
      onStatus("Censor applied");
    } catch (e: any) { onStatus("Error: " + e.message); }
    finally { setBusy(false); }
  };

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-1.5">
        {cat.tools.map(t => {
          const Icon = t.icon as any;
          const active = activeSub === t.id;
          return (
            <button key={t.id} onClick={() => setActiveSub(t.id)}
              className="p-2 rounded-xl text-left transition-all"
              style={{ background: active ? C.pinkDim : C.surface, border: `1px solid ${active ? C.pink : C.border}` }}>
              <div className="flex items-center gap-1.5 mb-0.5">
                <Icon className="w-3 h-3" style={{ color: active ? C.pink : C.muted }} />
                <span className="text-[10px] font-bold" style={{ color: active ? C.pink : C.text }}>{t.label}</span>
              </div>
              <p className="text-[9px] leading-tight" style={{ color: C.mutedLo }}>{t.desc}</p>
            </button>
          );
        })}
      </div>
      <div className="space-y-2 p-3 rounded-xl" style={{ background: C.surfaceHi, border: `1px solid ${C.border}` }}>
        <div className="flex justify-between mb-1">
          <span className="text-[10px] font-semibold" style={{ color: C.muted }}>Intensity</span>
          <span className="text-[10px] font-mono" style={{ color: C.pink }}>{intensity}</span>
        </div>
        <Slider value={[intensity]} onValueChange={([v]) => setIntensity(v)} min={5} max={40} step={1} />
      </div>
      <button onClick={run} disabled={busy}
        className="w-full py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all"
        style={{ background: `linear-gradient(135deg, ${C.pink}, #BE185D)`, color: "#fff" }}>
        {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <ScanLine className="w-4 h-4" />}
        {busy ? "Processing..." : "Apply Censor"}
      </button>
    </div>
  );
}

// ─── Scene Panel ──────────────────────────────────────────────────────────────
function ScenePanel({ clipUrl, onStatus }: { clipUrl: string; onStatus: (s: string) => void }) {
  const cat = TOOL_CATEGORIES.find(c => c.id === "scene")!;
  const [activeSub, setActiveSub] = React.useState(cat.tools[0].id);
  const [sceneStrip, setSceneStrip] = React.useState<any[]>([]);
  const [busy, setBusy] = React.useState(false);
  const detectScenesMutation = trpc.mediaCore.detectScenes.useMutation({
    onSuccess: (data: any) => {
      setSceneStrip(data?.scenes ?? []);
      onStatus(`${data?.scenes?.length ?? 0} scenes detected`);
    },
    onError: (e: any) => onStatus("Scene detect error: " + e.message),
  });

  const run = async () => {
    if (!clipUrl) { onStatus("No clip selected"); return; }
    setBusy(true);
    if (activeSub === "scene-detect") {
      detectScenesMutation.mutate({ videoUrl: clipUrl, threshold: 0.3 });
    } else if (activeSub === "scene-trim" || activeSub === "scene-split") {
      try {
        const blob = await fetch(clipUrl).then(r => r.blob());
        const fd = new FormData();
        fd.append("video", blob, "clip.mp4");
        fd.append("start", "0");
        fd.append("end", "30");
        const res = await fetch("/api/video-studio/trim", { method: "POST", body: fd });
        const url = await parseVideoStudioUrl(res, "Scene trim");
        onStatus("Trim complete: " + url);
      } catch (e: any) { onStatus("Error: " + e.message); }
    } else {
      onStatus(`${cat.tools.find(t => t.id === activeSub)?.label ?? activeSub} is not wired to a real render yet.`);
    }
    setBusy(false);
  };

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-1.5">
        {cat.tools.map(t => {
          const Icon = t.icon as any;
          const active = activeSub === t.id;
          return (
            <button key={t.id} onClick={() => setActiveSub(t.id)}
              className="p-2 rounded-xl text-left transition-all"
              style={{ background: active ? C.accentDim : C.surface, border: `1px solid ${active ? C.accent : C.border}` }}>
              <div className="flex items-center gap-1.5 mb-0.5">
                <Icon className="w-3 h-3" style={{ color: active ? C.accent : C.muted }} />
                <span className="text-[10px] font-bold" style={{ color: active ? C.accent : C.text }}>{t.label}</span>
              </div>
              <p className="text-[9px] leading-tight" style={{ color: C.mutedLo }}>{t.desc}</p>
            </button>
          );
        })}
      </div>
      {sceneStrip.length > 0 && (
        <div className="flex gap-1 overflow-x-auto pb-1">
          {sceneStrip.slice(0, 8).map((s: any, i: number) => (
            <div key={i} className="shrink-0 w-16 h-10 rounded-lg flex items-center justify-center text-[9px] font-bold"
              style={{ background: C.surfaceHi, border: `1px solid ${C.border}`, color: C.muted }}>
              {Math.round(s.start ?? i * 5)}s
            </div>
          ))}
        </div>
      )}
      <button onClick={run} disabled={busy || detectScenesMutation.isPending}
        className="w-full py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all"
        style={{ background: `linear-gradient(135deg, ${C.accent}, #7C3AED)`, color: "#fff" }}>
        {(busy || detectScenesMutation.isPending) ? <Loader2 className="w-4 h-4 animate-spin" /> : <Crosshair className="w-4 h-4" />}
        {(busy || detectScenesMutation.isPending) ? "Processing..." : sceneStrip.length > 0 ? "Refresh Scene Analysis" : "Run Scene Tool"}
      </button>
    </div>
  );
}

// ─── Motion Panel ─────────────────────────────────────────────────────────────
function MotionPanel({ clipUrl, duration, onStatus, projectId, onAddClip, onAddAudioTrack }: {
  clipUrl: string; duration: number; onStatus: (s: string) => void;
  projectId: string; onAddClip: (a: any) => void; onAddAudioTrack: (a: any) => void;
}) {
  const cat = TOOL_CATEGORIES.find(c => c.id === "motion")!;
  const [activeSub, setActiveSub] = React.useState(cat.tools[0].id);
  const [fps, setFps] = React.useState(60);
  const [speedFactor, setSpeedFactor] = React.useState(0.5);
  const [busy, setBusy] = React.useState(false);
  const createAsset = trpc.creatorVideoEditor.createAsset.useMutation();
  const slowMotionMutation = trpc.videoEnhance.slowMotion.useMutation({
    onSuccess: async (data: any) => {
      const url = (data as any).outputUrl ?? (data as any).url ?? "";
      if (url) {
        await createAsset.mutateAsync({ fileUrl: url, assetType: "output", filename: filenameFromUrl(url, "vaultx-slow-motion.mp4"), durationSeconds: duration * 2, mimeType: "video/mp4", metadata: { source: "vaultx", isVaultxOutput: true, operation: "motion-slowmo" } });
        onAddClip({ id: Date.now().toString(), src: url, assetUrl: url, duration: duration * 2, type: "video", name: "Slow Motion" });
        onStatus("Slow motion complete");
      }
    },
    onError: (e: any) => onStatus("Error: " + e.message),
  });

  const run = async () => {
    if (!clipUrl) { onStatus("No clip selected"); return; }
    setBusy(true);
    try {
      if (activeSub === "motion-slowmo") {
        slowMotionMutation.mutate({ videoUrl: clipUrl, targetFps: String(fps) as "60" | "120" | "240", enableUpscale: true, upscaleModel: "RealESRGAN_x4plus", maxSeconds: 30, outputFormat: "mp4" });
        return;
      }
      if (activeSub === "motion-reverse") {
        onStatus("Reverse is not wired to a real render endpoint yet. Use Speed Ramp or Slow Motion for real output today.");
        return;
      }
      if (activeSub === "motion-ramp") {
        const blob = await fetch(clipUrl).then(r => r.blob());
        const fd = new FormData();
        fd.append("video", blob, "clip.mp4");
        fd.append("speed", String(speedFactor));
        const res = await fetch("/api/video-studio/speed", { method: "POST", body: fd });
        const url = await parseVideoStudioUrl(res, "Speed ramp");
        await createAsset.mutateAsync({ fileUrl: url, assetType: "output", filename: filenameFromUrl(url, "vaultx-speed-ramp.mp4"), durationSeconds: duration / speedFactor, mimeType: "video/mp4", metadata: { source: "vaultx", isVaultxOutput: true, operation: activeSub, speedFactor } });
        onAddClip({ id: Date.now().toString(), src: url, assetUrl: url, duration: duration / speedFactor, type: "video", name: "Speed Ramp" });
        onStatus("Speed ramp complete");
        return;
      }
      onStatus(`${cat.tools.find(t => t.id === activeSub)?.label ?? activeSub} is not wired to a real render yet.`);
    } catch (e: any) { onStatus("Error: " + e.message); }
    finally { setBusy(false); }
  };

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-1.5">
        {cat.tools.map(t => {
          const Icon = t.icon as any;
          const active = activeSub === t.id;
          return (
            <button key={t.id} onClick={() => setActiveSub(t.id)}
              className="p-2 rounded-xl text-left transition-all"
              style={{ background: active ? "rgba(59,130,246,0.15)" : C.surface, border: `1px solid ${active ? "#3B82F6" : C.border}` }}>
              <div className="flex items-center gap-1.5 mb-0.5">
                <Icon className="w-3 h-3" style={{ color: active ? "#3B82F6" : C.muted }} />
                <span className="text-[10px] font-bold" style={{ color: active ? "#3B82F6" : C.text }}>{t.label}</span>
              </div>
              <p className="text-[9px] leading-tight" style={{ color: C.mutedLo }}>{t.desc}</p>
            </button>
          );
        })}
      </div>
      {activeSub === "motion-slowmo" && (
        <div className="p-3 rounded-xl space-y-2" style={{ background: C.surfaceHi, border: `1px solid ${C.border}` }}>
          <div className="flex justify-between mb-1">
            <span className="text-[10px] font-semibold" style={{ color: C.muted }}>Target FPS</span>
            <span className="text-[10px] font-mono" style={{ color: "#3B82F6" }}>{fps}fps</span>
          </div>
          <div className="flex gap-1">
            {[30, 60, 90, 120].map(f => (
              <button key={f} onClick={() => setFps(f)}
                className="flex-1 py-1 rounded-lg text-[10px] font-bold transition-all"
                style={{ background: fps === f ? "rgba(59,130,246,0.2)" : C.surface, border: `1px solid ${fps === f ? "#3B82F6" : C.border}`, color: fps === f ? "#3B82F6" : C.muted }}>
                {f}
              </button>
            ))}
          </div>
        </div>
      )}
      {activeSub === "motion-ramp" && (
        <div className="p-3 rounded-xl space-y-2" style={{ background: C.surfaceHi, border: `1px solid ${C.border}` }}>
          <div className="flex justify-between mb-1">
            <span className="text-[10px] font-semibold" style={{ color: C.muted }}>Speed Factor</span>
            <span className="text-[10px] font-mono" style={{ color: "#3B82F6" }}>{speedFactor}x</span>
          </div>
          <Slider value={[speedFactor * 10]} onValueChange={([v]) => setSpeedFactor(v / 10)} min={1} max={30} step={1} />
        </div>
      )}
      <button onClick={run} disabled={busy || slowMotionMutation.isPending}
        className="w-full py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all"
        style={{ background: "linear-gradient(135deg, #3B82F6, #1D4ED8)", color: "#fff" }}>
        {(busy || slowMotionMutation.isPending) ? <Loader2 className="w-4 h-4 animate-spin" /> : <Gauge className="w-4 h-4" />}
        {(busy || slowMotionMutation.isPending) ? "Processing..." : "Apply Motion Effect"}
      </button>
    </div>
  );
}

// ─── Color Panel ──────────────────────────────────────────────────────────────
function ColorPanel({ clipUrl, duration, onStatus, projectId, onAddClip, onAddAudioTrack }: {
  clipUrl: string; duration: number; onStatus: (s: string) => void;
  projectId: string; onAddClip: (a: any) => void; onAddAudioTrack: (a: any) => void;
}) {
  const cat = TOOL_CATEGORIES.find(c => c.id === "color")!;
  const [activeSub, setActiveSub] = React.useState(cat.tools[0].id);
  const [brightness, setBrightness] = React.useState(0);
  const [contrast, setContrast] = React.useState(0);
  const [saturation, setSaturation] = React.useState(0);
  const [busy, setBusy] = React.useState(false);
  const createAsset = trpc.creatorVideoEditor.createAsset.useMutation();

  const LUT_MAP: Record<string, string> = {
    "color-velvet": "velvet_skin",
    "color-boudoir": "boudoir_light",
    "color-desire": "desire_haze",
    "color-cinematic": "cinematic_master",
    "color-noir": "noir_contrast",
  };

  const run = async () => {
    if (!clipUrl) { onStatus("No clip selected"); return; }
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append("video", await fetch(clipUrl).then(r => r.blob()), "clip.mp4");
      if (activeSub === "color-custom") {
        fd.append("brightness", String(brightness));
        fd.append("contrast", String(contrast));
        fd.append("saturation", String(saturation));
      } else {
        fd.append("look", LUT_MAP[activeSub] ?? "velvet_skin");
      }
      const res = await fetch("/api/video-studio/color-grade", { method: "POST", body: fd });
      const url = await parseVideoStudioUrl(res, "Color grade");
      await createAsset.mutateAsync({ fileUrl: url, assetType: "output", filename: filenameFromUrl(url, "vaultx-graded.mp4"), durationSeconds: duration, mimeType: "video/mp4", metadata: { source: "vaultx", isVaultxOutput: true, operation: activeSub } });
      onAddClip({ id: Date.now().toString(), src: url, assetUrl: url, duration, type: "video", name: cat.tools.find(t => t.id === activeSub)?.label ?? "Graded" });
      onStatus("Color grade applied");
    } catch (e: any) { onStatus("Error: " + e.message); }
    finally { setBusy(false); }
  };

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-1.5">
        {cat.tools.map(t => {
          const Icon = t.icon as any;
          const active = activeSub === t.id;
          return (
            <button key={t.id} onClick={() => setActiveSub(t.id)}
              className="p-2 rounded-xl text-left transition-all"
              style={{ background: active ? "rgba(245,158,11,0.15)" : C.surface, border: `1px solid ${active ? C.gold : C.border}` }}>
              <div className="flex items-center gap-1.5 mb-0.5">
                <Icon className="w-3 h-3" style={{ color: active ? C.gold : C.muted }} />
                <span className="text-[10px] font-bold" style={{ color: active ? C.gold : C.text }}>{t.label}</span>
              </div>
              <p className="text-[9px] leading-tight" style={{ color: C.mutedLo }}>{t.desc}</p>
            </button>
          );
        })}
      </div>
      {activeSub === "color-custom" && (
        <div className="p-3 rounded-xl space-y-3" style={{ background: C.surfaceHi, border: `1px solid ${C.border}` }}>
          {[["Brightness", brightness, setBrightness], ["Contrast", contrast, setContrast], ["Saturation", saturation, setSaturation]].map(([label, val, setter]: any) => (
            <div key={label as string}>
              <div className="flex justify-between mb-1">
                <span className="text-[10px]" style={{ color: C.muted }}>{label}</span>
                <span className="text-[10px] font-mono" style={{ color: C.gold }}>{val > 0 ? "+" : ""}{val}</span>
              </div>
              <Slider value={[val + 50]} onValueChange={([v]) => setter(v - 50)} min={0} max={100} step={1} />
            </div>
          ))}
        </div>
      )}
      <button onClick={run} disabled={busy}
        className="w-full py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all"
        style={{ background: `linear-gradient(135deg, ${C.gold}, #D97706)`, color: "#000" }}>
        {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Droplets className="w-4 h-4" />}
        {busy ? "Grading..." : "Apply Color Grade"}
      </button>
    </div>
  );
}

// ─── Text Panel ───────────────────────────────────────────────────────────────
function TextPanel({ clipUrl, duration, onStatus, projectId, onAddClip, onAddAudioTrack }: {
  clipUrl: string; duration: number; onStatus: (s: string) => void;
  projectId: string; onAddClip: (a: any) => void; onAddAudioTrack: (a: any) => void;
}) {
  const cat = TOOL_CATEGORIES.find(c => c.id === "text")!;
  const [activeSub, setActiveSub] = React.useState(cat.tools[0].id);
  const [overlayText, setOverlayText] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const createAsset = trpc.creatorVideoEditor.createAsset.useMutation();
  const transcribeMutation = trpc.smartCaptions.transcribe.useMutation();
  const applyStyleMutation = trpc.smartCaptions.applyCaptionStyle.useMutation();
  const utils = trpc.useUtils();

  const run = async () => {
    if (!clipUrl) { onStatus("No clip selected"); return; }
    setBusy(true);
    try {
      if (activeSub === "text-autocaption") {
        const transcribed = await transcribeMutation.mutateAsync({ videoUrl: clipUrl });
        const caption = await utils.smartCaptions.getCaptionById.fetch({ captionId: (transcribed as any).captionId });
        const styled = await applyStyleMutation.mutateAsync({ captionId: (transcribed as any).captionId, styleId: "bold-white", customizations: {} });
        const outputUrl = (styled as any).outputUrl;
        if (!outputUrl) throw new Error("Caption styling finished without a usable output file.");
        await createAsset.mutateAsync({ fileUrl: outputUrl, assetType: "output", filename: filenameFromUrl(outputUrl, "captioned_output.mp4"), durationSeconds: duration, mimeType: "video/mp4", metadata: { source: "vaultx", isVaultxOutput: true, operation: activeSub } });
        onAddClip({ id: Date.now().toString(), src: outputUrl, assetUrl: outputUrl, duration, type: "video", name: "Captioned" });
        onStatus("Captions burned in");
        return;
      }
      if (activeSub === "text-overlay" && overlayText) {
        const blob = await fetch(clipUrl).then(r => r.blob());
        const fd = new FormData();
        fd.append("video", blob, "clip.mp4");
        fd.append("text", overlayText);
        fd.append("position", "center");
        fd.append("style", "white-bold");
        const res = await fetch("/api/video-studio/add-text", { method: "POST", body: fd });
        const url = await parseVideoStudioUrl(res, "Text overlay");
        await createAsset.mutateAsync({ fileUrl: url, assetType: "output", filename: filenameFromUrl(url, "vaultx-text-overlay.mp4"), durationSeconds: duration, mimeType: "video/mp4", metadata: { source: "vaultx", isVaultxOutput: true, operation: activeSub, overlayText } });
        onAddClip({ id: Date.now().toString(), src: url, assetUrl: url, duration, type: "video", name: "Text Overlay" });
        onStatus("Text overlay added");
        return;
      }
      onStatus(`${cat.tools.find(t => t.id === activeSub)?.label ?? activeSub} is not wired to a real render yet.`);
    } catch (e: any) { onStatus("Error: " + e.message); }
    finally { setBusy(false); }
  };

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-1.5">
        {cat.tools.map(t => {
          const Icon = t.icon as any;
          const active = activeSub === t.id;
          return (
            <button key={t.id} onClick={() => setActiveSub(t.id)}
              className="p-2 rounded-xl text-left transition-all"
              style={{ background: active ? C.greenDim : C.surface, border: `1px solid ${active ? C.green : C.border}` }}>
              <div className="flex items-center gap-1.5 mb-0.5">
                <Icon className="w-3 h-3" style={{ color: active ? C.green : C.muted }} />
                <span className="text-[10px] font-bold" style={{ color: active ? C.green : C.text }}>{t.label}</span>
              </div>
              <p className="text-[9px] leading-tight" style={{ color: C.mutedLo }}>{t.desc}</p>
            </button>
          );
        })}
      </div>
      {activeSub === "text-overlay" && (
        <input value={overlayText} onChange={e => setOverlayText(e.target.value)}
          className="w-full px-3 py-2 rounded-xl text-sm"
          style={{ background: C.surfaceHi, border: `1px solid ${C.border}`, color: C.text }}
          placeholder="Enter text overlay..." />
      )}
      <button onClick={run} disabled={busy || transcribeMutation.isPending || applyStyleMutation.isPending}
        className="w-full py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all"
        style={{ background: `linear-gradient(135deg, ${C.green}, #059669)`, color: "#fff" }}>
        {(busy || transcribeMutation.isPending || applyStyleMutation.isPending) ? <Loader2 className="w-4 h-4 animate-spin" /> : <Hash className="w-4 h-4" />}
        {(busy || transcribeMutation.isPending || applyStyleMutation.isPending) ? "Processing..." : "Apply Text / Captions"}
      </button>
    </div>
  );
}

// ─── Audio Panel ──────────────────────────────────────────────────────────────
function AudioPanel({ clipUrl, onStatus, projectId, onAddClip, onAddAudioTrack }: {
  clipUrl: string; onStatus: (s: string) => void;
  projectId: string; onAddClip: (a: any) => void; onAddAudioTrack: (a: any) => void;
}) {
  const cat = TOOL_CATEGORIES.find(c => c.id === "audio")!;
  const [activeSub, setActiveSub] = React.useState(cat.tools[0].id);
  const [busy, setBusy] = React.useState(false);
  const createAsset = trpc.creatorVideoEditor.createAsset.useMutation();

  const run = async () => {
    if (!clipUrl) { onStatus("No clip selected"); return; }
    setBusy(true);
    try {
      const blob = await fetch(clipUrl).then(r => r.blob());
      const fd = new FormData();
      fd.append("video", blob, "clip.mp4");
      if (activeSub === "audio-normalize") fd.append("mode", "normalize");
      else if (activeSub === "audio-denoise") fd.append("mode", "cleanup");
      else if (activeSub === "audio-mute") fd.append("mode", "mute");
      else fd.append("mode", "voice_enhance");
      const res = await fetch("/api/video-studio/audio", { method: "POST", body: fd });
      const url = await parseVideoStudioUrl(res, "Audio enhancement");
      await createAsset.mutateAsync({ fileUrl: url, assetType: "output", filename: filenameFromUrl(url, "vaultx-audio-enhanced.mp4"), durationSeconds: 30, mimeType: "video/mp4", metadata: { source: "vaultx", isVaultxOutput: true, operation: activeSub } });
      onAddClip({ id: Date.now().toString(), src: url, assetUrl: url, duration: 30, type: "video", name: "Audio Enhanced" });
      onStatus("Audio enhanced");
    } catch (e: any) { onStatus("Error: " + e.message); }
    finally { setBusy(false); }
  };

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-1.5">
        {cat.tools.map(t => {
          const Icon = t.icon as any;
          const active = activeSub === t.id;
          return (
            <button key={t.id} onClick={() => setActiveSub(t.id)}
              className="p-2 rounded-xl text-left transition-all"
              style={{ background: active ? "rgba(59,130,246,0.15)" : C.surface, border: `1px solid ${active ? "#3B82F6" : C.border}` }}>
              <div className="flex items-center gap-1.5 mb-0.5">
                <Icon className="w-3 h-3" style={{ color: active ? "#3B82F6" : C.muted }} />
                <span className="text-[10px] font-bold" style={{ color: active ? "#3B82F6" : C.text }}>{t.label}</span>
              </div>
              <p className="text-[9px] leading-tight" style={{ color: C.mutedLo }}>{t.desc}</p>
            </button>
          );
        })}
      </div>
      <button onClick={run} disabled={busy}
        className="w-full py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all"
        style={{ background: "linear-gradient(135deg, #3B82F6, #1D4ED8)", color: "#fff" }}>
        {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Volume2 className="w-4 h-4" />}
        {busy ? "Processing..." : "Apply Audio Enhancement"}
      </button>
    </div>
  );
}

// ─── Format Panel ─────────────────────────────────────────────────────────────
function FormatPanel({ clipUrl, duration, onStatus, projectId, onAddClip, onAddAudioTrack }: {
  clipUrl: string; duration: number; onStatus: (s: string) => void;
  projectId: string; onAddClip: (a: any) => void; onAddAudioTrack: (a: any) => void;
}) {
  const cat = TOOL_CATEGORIES.find(c => c.id === "format")!;
  const [activeSub, setActiveSub] = React.useState(cat.tools[0].id);
  const [busy, setBusy] = React.useState(false);
  const createAsset = trpc.creatorVideoEditor.createAsset.useMutation();

  const FORMAT_CONFIG: Record<string, { width: number; height: number; fps: number; crf: number }> = {
    "format-onlyfans":  { width: 1920, height: 1080, fps: 30, crf: 18 },
    "format-fansly":    { width: 1920, height: 1080, fps: 30, crf: 20 },
    "format-instagram": { width: 1080, height: 1920, fps: 30, crf: 22 },
    "format-tiktok":    { width: 1080, height: 1920, fps: 30, crf: 22 },
    "format-twitter":   { width: 1920, height: 1080, fps: 30, crf: 23 },
  };

  const run = async () => {
    if (!clipUrl) { onStatus("No clip selected"); return; }
    setBusy(true);
    try {
      const cfg = FORMAT_CONFIG[activeSub] ?? FORMAT_CONFIG["format-onlyfans"];
      const blob = await fetch(clipUrl).then(r => r.blob());
      const fd = new FormData();
      fd.append("video", blob, "clip.mp4");
      fd.append("format", "mp4");
      fd.append("resolution", cfg.width >= 3840 ? "4k" : cfg.width >= 1920 ? "1080p" : "720p");
      fd.append("platform", activeSub.replace("format-", ""));
      const res = await fetch("/api/video-studio/convert", { method: "POST", body: fd });
      const url = await parseVideoStudioUrl(res, "Platform export");
      await createAsset.mutateAsync({ fileUrl: url, assetType: "output", filename: filenameFromUrl(url, "formatted_export.mp4"), durationSeconds: duration, mimeType: "video/mp4", metadata: { source: "vaultx", isVaultxOutput: true, operation: activeSub, platform: activeSub.replace("format-", "") } });
      onAddClip({ id: Date.now().toString(), src: url, assetUrl: url, duration, type: "video", name: cat.tools.find(t => t.id === activeSub)?.label ?? "Formatted" });
      onStatus("Export ready for " + (cat.tools.find(t => t.id === activeSub)?.label ?? activeSub));
    } catch (e: any) { onStatus("Error: " + e.message); }
    finally { setBusy(false); }
  };

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-1.5">
        {cat.tools.map(t => {
          const Icon = t.icon as any;
          const active = activeSub === t.id;
          return (
            <button key={t.id} onClick={() => setActiveSub(t.id)}
              className="p-2 rounded-xl text-left transition-all"
              style={{ background: active ? C.greenDim : C.surface, border: `1px solid ${active ? C.green : C.border}` }}>
              <div className="flex items-center gap-1.5 mb-0.5">
                <Icon className="w-3 h-3" style={{ color: active ? C.green : C.muted }} />
                <span className="text-[10px] font-bold" style={{ color: active ? C.green : C.text }}>{t.label}</span>
              </div>
              <p className="text-[9px] leading-tight" style={{ color: C.mutedLo }}>{t.desc}</p>
            </button>
          );
        })}
      </div>
      <button onClick={run} disabled={busy}
        className="w-full py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all"
        style={{ background: `linear-gradient(135deg, ${C.green}, #059669)`, color: "#fff" }}>
        {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
        {busy ? "Converting..." : "Export for Platform"}
      </button>
    </div>
  );
}


export default function VaultXEditor() {
  // ── Existing procedures ──
  const myProjectsQ = trpc.vaultx.getMyEditorProjects.useQuery();
  const createProjectMut = trpc.vaultx.createEditorProject.useMutation();
  const processVideoMut = trpc.vaultx.processVideoEdit.useMutation();
  const exportMut = trpc.vaultx.exportProject.useMutation();
  const directorMut = trpc.vaultx.automatedDirectorExport.useMutation();

  // ── New AI Editor procedures ──
  const analyzeContentMut = trpc.vaultx.analyzeContent.useMutation();
  const enhancePhotoMut = trpc.vaultx.enhancePhoto.useMutation();
  const enhanceVideoMut = trpc.vaultx.enhanceVideo.useMutation();
  const generateVariationsMut = trpc.vaultx.generateVariations.useMutation();
  const generateCaptionMut = trpc.vaultx.generateCaption.useMutation();
  const exportForPlatformsMut = trpc.vaultx.exportForPlatforms.useMutation();
  const publishToVaultXMut = trpc.vaultx.publishToVaultX.useMutation();
  const generateContentCalendarMut = trpc.vaultx.generateContentCalendar.useMutation();

  // ── Body Intelligence Engine ──
  const detectBodyRegionsMut = trpc.vaultx.detectBodyRegions.useMutation();
  const enhanceBodyRegionMut = trpc.vaultx.enhanceBodyRegion.useMutation();
  const generateRevealShotMut = trpc.vaultx.generateRevealShot.useMutation();
  const generateBodyFocusClipMut = trpc.vaultx.generateBodyFocusClip.useMutation();
  const assembleHighlightReelMut = trpc.vaultx.assembleHighlightReel.useMutation();
  const generateBodyCaptionsMut = trpc.vaultx.generateBodyCaptions.useMutation();
  const createBodyCinemaCollectionMut = trpc.vaultx.createBodyCinemaCollection.useMutation();
  const publishBodyCinemaCollectionMut = trpc.vaultx.publishBodyCinemaCollection.useMutation();
  const utils = trpc.useUtils();

  // ── State ──
  const [activeTab, setActiveTab] = useState<"enhance" | "body" | "ppv" | "censor" | "scene" | "motion" | "color" | "text" | "audio" | "format" | "timeline" | "publish" | "calendar">("enhance");
  const [toolStatus, setToolStatus] = React.useState<string | null>(null);
  const [editorClips, setEditorClips] = React.useState<any[]>([]);
  const [editorAudioTracks, setEditorAudioTracks] = React.useState<any[]>([]);
  const selectedClipDuration: number = editorClips[0]?.duration ?? 30;
  const handleAddClip = (clip: any) => setEditorClips(prev => [clip, ...prev]);
  const handleAddAudioTrack = (track: any) => setEditorAudioTracks(prev => [track, ...prev]);
  const [projectId, setProjectId] = useState<number | null>(null);
  const [sourceUrl, setSourceUrl] = useState("");
  const editorProjectId: string = projectId ? String(projectId) : "default";
  const selectedClipUrl: string = editorClips[0]?.fileUrl ?? editorClips[0]?.assetUrl ?? editorClips[0]?.src ?? sourceUrl ?? "";
  const [contentType, setContentType] = useState<"photo" | "video">("photo");
  const [analysis, setAnalysis] = useState<ContentAnalysis | null>(null);
  const [bodyMap, setBodyMap] = useState<BodyMap | null>(null);
  const [variations, setVariations] = useState<Variation[]>([]);
  const [selectedVariation, setSelectedVariation] = useState(0);
  const [activeRegion, setActiveRegion] = useState<string | null>(null);
  const [captions, setCaptions] = useState<any>(null);
  const [contentCalendar, setContentCalendar] = useState<any[]>([]);
  const [revealShotUrl, setRevealShotUrl] = useState<string | null>(null);
  const [focusClips, setFocusClips] = useState<Record<string, string>>({});
  const [bodyCinemaName, setBodyCinemaName] = useState("VIP Body Cinema Collection");
  const [bodyCinemaStyle, setBodyCinemaStyle] = useState<"luxury" | "noir" | "sunset" | "penthouse" | "editorial" | "vip_tease">("luxury");
  const [bodyCinemaRegions, setBodyCinemaRegions] = useState<Array<"bust" | "abdomen" | "glutes" | "legs" | "full">>(["full"]);
  const [bodyCinemaPlatforms, setBodyCinemaPlatforms] = useState<Array<"vaultx" | "onlyfans" | "fansly" | "telegram" | "instagram_reel" | "twitter">>(["vaultx", "onlyfans", "telegram"]);
  const [bodyCinemaPlan, setBodyCinemaPlan] = useState<any>(null);
  const [showProjectList, setShowProjectList] = useState(false);
  const [project, setProject] = useState<EditorProject>({ title: "New VaultX Project", projectType: "video", aspectRatio: "9:16", durationSeconds: 60 });
  const [clips, setClips] = useState<TimelineClip[]>([]);
  const [selectedClipId, setSelectedClipId] = useState<string | null>(null);
  const [playhead, setPlayhead] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [totalDuration, setTotalDuration] = useState(60);
  const [pixelsPerSecond] = useState(12);
  const [currentSource, setCurrentSource] = useState("");
  const [enhancementIntensity, setEnhancementIntensity] = useState<"subtle" | "natural" | "enhanced" | "cinematic">("enhanced");
  const [backgroundStyle, setBackgroundStyle] = useState<"keep" | "penthouse" | "yacht" | "rose_bed" | "dark_studio" | "miami_villa" | "private_jet">("keep");
  const [captionStyle, setCaptionStyle] = useState<"teaser" | "direct" | "romantic" | "luxury" | "playful">("teaser");
  const [publishTier, setPublishTier] = useState<"free" | "basic" | "premium" | "vip" | "ppv">("premium");
  const [ppvPrice, setPpvPrice] = useState(15);
  const [publishTitle, setPublishTitle] = useState("");
  const [exportPresets, setExportPresets] = useState<string[]>(["onlyfans"]);
  const [productionPreset, setProductionPreset] = useState("premium_ppv");
  const [selectedOutputPackages, setSelectedOutputPackages] = useState<string[]>(["master", "sfw_teaser", "ppv_drop", "caption_pack"]);
  const [complianceMode, setComplianceMode] = useState<"platform_safe" | "subscriber" | "vip" | "archive">("platform_safe");
  const [watermarkIdentity, setWatermarkIdentity] = useState("@YourHandle");
  const [targetFormat, setTargetFormat] = useState<"9:16" | "16:9" | "1:1" | "4:5">("9:16");
  const selectedCompliance = COMPLIANCE_MODES[complianceMode];
  const SelectedComplianceIcon = selectedCompliance.icon;
  const selectedPreset = PRODUCTION_PRESETS.find(p => p.id === productionPreset) ?? PRODUCTION_PRESETS[0];
  const selectedOutputLabels = selectedOutputPackages.map(id => OUTPUT_LANE_COPY[id] ?? id.replace("_", " "));
  const outputReadiness = Math.round(([
    Boolean(sourceUrl),
    Boolean(analysis),
    selectedOutputPackages.length >= 3,
    exportPresets.length > 0,
    Boolean(watermarkIdentity.trim()),
  ].filter(Boolean).length / 5) * 100);
  const creatorIntelligence = CREATOR_INTELLIGENCE_RULES.map(rule => ({
    ...rule,
    action: rule.label === "Hook Shot"
      ? (analysis ? `Lead with ${analysis.strongest_assets?.[0] ?? "the highest-retention frame"}; cut anything slow before the hook.` : "Upload and analyze first so VaultX can pick the strongest lead moment.")
      : rule.label === "Angle Stack"
        ? `Build ${targetFormat} pacing for ${selectedPreset.label}: establish, move, close detail, reaction, CTA.`
        : rule.label === "Teaser Logic"
          ? (complianceMode === "platform_safe" ? "Use blur/crop/censor tools before exporting public teaser cuts." : "Create a public teaser plus a subscriber or VIP unlock version, not one generic file.")
          : `Package ${selectedOutputLabels.join(" · ") || "master · teaser · cover · copy"} with watermark ${watermarkIdentity || "set before export"}.`,
  }));
  const generatedFocusClipCount = bodyCinemaRegions.filter(region => Boolean(focusClips[region])).length;
  const bodyCinemaRealRenderUrl = bodyCinemaPlan?.renderedOutputUrl || bodyCinemaPlan?.finalVideoUrl || bodyCinemaPlan?.renderedVideoUrl || null;
  const bodyCinemaTeaserUrl = bodyCinemaPlan?.teaserUrl || bodyCinemaPlan?.platformExports?.find?.((item: any) => item?.url && String(item.platform || "").includes("telegram"))?.url || null;
  const bodyCinemaThumbnailUrl = bodyCinemaPlan?.thumbnailUrl || bodyCinemaPlan?.heroAsset || null;
  const bodyCinemaReadinessItems = [
    { label: "Source asset", ready: Boolean(sourceUrl || variations[selectedVariation]?.url), detail: "Upload or enhancement file exists." },
    { label: "Body map", ready: Boolean(bodyMap), detail: "Scan has identified the usable visual regions." },
    { label: "Reveal shot", ready: Boolean(revealShotUrl), detail: "Provider-generated reveal clip exists." },
    { label: "Focus clips", ready: generatedFocusClipCount > 0, detail: `${generatedFocusClipCount}/${bodyCinemaRegions.length} selected regions have generated clips.` },
    { label: "Captions", ready: Boolean(captions), detail: "Teaser, subscriber, PPV, and message copy exists." },
    { label: "Export plan", ready: bodyCinemaPlatforms.length > 0 && ppvPrice >= 3, detail: `${bodyCinemaPlatforms.length} destinations selected at $${ppvPrice}.` },
    { label: "Final render", ready: Boolean(bodyCinemaRealRenderUrl), detail: bodyCinemaRealRenderUrl ? "FFmpeg produced a downloadable master video, teaser, and thumbnail." : "Create the collection to render real FFmpeg output." },
  ];
  const bodyCinemaReadyCount = bodyCinemaReadinessItems.filter(item => item.ready).length;
  const bodyCinemaReadinessScore = Math.round((bodyCinemaReadyCount / bodyCinemaReadinessItems.length) * 100);
  const BodyCinemaStatusIcon = bodyCinemaRealRenderUrl ? CheckCircle : bodyCinemaPlan ? AlertTriangle : Info;
  const bodyCinemaStatusLabel = bodyCinemaRealRenderUrl ? "RENDER READY" : bodyCinemaPlan ? "PLAN ONLY" : "NOT READY";
  const bodyCinemaStatusColor = bodyCinemaRealRenderUrl ? "#10B981" : bodyCinemaPlan ? "#F59E0B" : "#6B7280";

  const applyProductionPreset = useCallback((presetId: string) => {
    const preset = PRODUCTION_PRESETS.find(p => p.id === presetId) ?? PRODUCTION_PRESETS[0];
    setProductionPreset(preset.id);
    setSelectedOutputPackages([...preset.outputs]);
    setComplianceMode(preset.compliance as typeof complianceMode);
    setTargetFormat(preset.format as typeof targetFormat);
    setExportPresets([...preset.platforms]);
    if (preset.watermark && watermarkIdentity === "@YourHandle") setWatermarkIdentity("@VaultXCreator");
    setToolStatus(`${preset.label} loaded: ${preset.outputs.length} deliverables, ${preset.platforms.length} export targets.`);
  }, [complianceMode, targetFormat, watermarkIdentity]);

  const bodyCinemaCollectionsQ = trpc.vaultx.getBodyCinemaCollections.useQuery(
    { projectId: projectId ?? undefined, limit: 12 },
    { enabled: !!projectId }
  );

  const videoRef = useRef<HTMLVideoElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const ensureProject = useCallback(async () => {
    if (projectId) return projectId;
    const result = await createProjectMut.mutateAsync({ projectName: project.title, projectType: project.projectType as any });
    const newId = result.projectId;
    setProjectId(newId);
    return newId;
  }, [projectId, project, createProjectMut]);

  const handleFileUpload = useCallback(async (file: File) => {
    const toastId = toast.loading("Uploading 0%...");
    try {
      const uploaded = await uploadVaultXFile(file, progress => toast.loading(`Uploading ${progress}%...`, { id: toastId }));
      setSourceUrl(uploaded.url);
      setCurrentSource(uploaded.url);
      setContentType(file.type.startsWith("video") ? "video" : "photo");
      toast.success("Uploaded — analyzing...", { id: toastId });
      const pid = await ensureProject();
      const result = await analyzeContentMut.mutateAsync({ sourceUrl: uploaded.url, projectType: file.type.startsWith("video") ? "video" : "photo", projectId: pid });
      setAnalysis(result.analysis as ContentAnalysis);
      if (file.type.startsWith("video")) {
        setEditorClips(prev => [{ id: Date.now().toString(), src: uploaded.url, assetUrl: uploaded.url, fileUrl: uploaded.url, duration: project.durationSeconds || 60, type: "video", name: uploaded.filename }, ...prev]);
      }
      toast.success("Content analyzed and ready for real editor tools");
    } catch (e: any) { toast.error("Upload failed: " + e.message, { id: toastId }); }
  }, [ensureProject, analyzeContentMut, project.durationSeconds]);

  const handleEnhance = useCallback(async () => {
    if (!sourceUrl) { toast.error("Upload content first"); return; }
    const pid = await ensureProject();
    try {
      if (contentType === "photo") {
        const result = await enhancePhotoMut.mutateAsync({ projectId: pid, sourceUrl, enhancementIntensity, backgroundStyle, skinTone: (analysis?.skin_tone_detected as any) || "medium" });
        setVariations(result.enhancedUrls as Variation[]);
        toast.success(`Enhancement pipeline started — ${result.enginesUsed.length} AI models`);
      } else {
        await enhanceVideoMut.mutateAsync({ projectId: pid, sourceUrl, enhancementIntensity, enableSlowMotion: true, enableAudio: true, audioMood: "sensual" });
        toast.success("Video enhancement started — Kling 3.0 + ElevenLabs");
      }
    } catch (e: any) { toast.error("Enhancement failed: " + e.message); }
  }, [sourceUrl, contentType, enhancementIntensity, backgroundStyle, analysis, ensureProject, enhancePhotoMut, enhanceVideoMut]);

  const handleGenerateVariations = useCallback(async () => {
    if (!sourceUrl) { toast.error("Upload content first"); return; }
    const pid = await ensureProject();
    try {
      const result = await generateVariationsMut.mutateAsync({ projectId: pid, sourceUrl });
      setVariations(result.variations as Variation[]);
      toast.success("3 variations generated");
    } catch (e: any) { toast.error("Failed: " + e.message); }
  }, [sourceUrl, ensureProject, generateVariationsMut]);

  const handleDetectBody = useCallback(async () => {
    if (!sourceUrl) { toast.error("Upload content first"); return; }
    const pid = await ensureProject();
    try {
      const result = await detectBodyRegionsMut.mutateAsync({ projectId: pid, sourceUrl });
      setBodyMap(result.bodyMap as BodyMap);
      toast.success("Body regions detected — tap any region to enhance");
    } catch (e: any) { toast.error("Detection failed: " + e.message); }
  }, [sourceUrl, ensureProject, detectBodyRegionsMut]);

  const handleEnhanceRegion = useCallback(async (region: string) => {
    if (!sourceUrl) { toast.error("Upload content first"); return; }
    const pid = await ensureProject();
    setActiveRegion(region);
    try {
      await enhanceBodyRegionMut.mutateAsync({ projectId: pid, sourceUrl, region: region as any, intensity: enhancementIntensity === "cinematic" ? "enhanced" : enhancementIntensity as any });
      toast.success(`${region.toUpperCase()} enhancement started`);
    } catch (e: any) { toast.error(`${region} failed: ` + e.message); }
  }, [sourceUrl, enhancementIntensity, ensureProject, enhanceBodyRegionMut]);

  const handleRevealShot = useCallback(async () => {
    if (!sourceUrl) { toast.error("Upload content first"); return; }
    const pid = await ensureProject();
    const enhancedUrl = variations[selectedVariation]?.url || sourceUrl;
    try {
      const result = await generateRevealShotMut.mutateAsync({ projectId: pid, enhancedImageUrl: enhancedUrl, bodyType: bodyMap?.body_type || "beautiful woman" });
      setRevealShotUrl(result.revealShotUrl);
      toast.success("Reveal shot generated — Kling 3.0");
    } catch (e: any) { toast.error("Reveal shot failed: " + e.message); }
  }, [sourceUrl, variations, selectedVariation, bodyMap, ensureProject, generateRevealShotMut]);

  const handleFocusClip = useCallback(async (region: string) => {
    if (!sourceUrl) { toast.error("Upload content first"); return; }
    const pid = await ensureProject();
    const enhancedUrl = variations[selectedVariation]?.url || sourceUrl;
    try {
      const result = await generateBodyFocusClipMut.mutateAsync({ projectId: pid, region: region as any, enhancedImageUrl: enhancedUrl });
      setFocusClips(prev => ({ ...prev, [region]: result.clipUrl }));
      toast.success(`${region.toUpperCase()} focus clip generated`);
    } catch (e: any) { toast.error(`Focus clip failed: ` + e.message); }
  }, [sourceUrl, variations, selectedVariation, ensureProject, generateBodyFocusClipMut]);

  const handleGenerateCaptions = useCallback(async () => {
    const pid = await ensureProject();
    try {
      const result = await generateBodyCaptionsMut.mutateAsync({ projectId: pid, captionStyle: captionStyle as any });
      setCaptions(result.captions);
      toast.success("Captions generated");
    } catch (e: any) { toast.error("Caption generation failed: " + e.message); }
  }, [captionStyle, ensureProject, generateBodyCaptionsMut]);

  const toggleBodyCinemaRegion = useCallback((region: "bust" | "abdomen" | "glutes" | "legs" | "full") => {
    setBodyCinemaRegions(prev => prev.includes(region) ? (prev.length === 1 ? prev : prev.filter(r => r !== region)) : [...prev, region]);
  }, []);

  const toggleBodyCinemaPlatform = useCallback((platform: "vaultx" | "onlyfans" | "fansly" | "telegram" | "instagram_reel" | "twitter") => {
    setBodyCinemaPlatforms(prev => prev.includes(platform) ? (prev.length === 1 ? prev : prev.filter(p => p !== platform)) : [...prev, platform]);
  }, []);

  const handleCreateBodyCinemaCollection = useCallback(async () => {
    if (!sourceUrl && !variations[selectedVariation]?.url) { toast.error("Upload or enhance content first"); return; }
    const pid = await ensureProject();
    try {
      const enhancedUrl = variations[selectedVariation]?.url || sourceUrl;
      const result = await createBodyCinemaCollectionMut.mutateAsync({
        projectId: pid,
        collectionName: bodyCinemaName || "VIP Body Cinema Collection",
        sourceAssetUrl: sourceUrl || enhancedUrl,
        enhancedImageUrl: enhancedUrl,
        selectedRegions: bodyCinemaRegions,
        cinematicStyle: bodyCinemaStyle,
        platforms: bodyCinemaPlatforms,
        ppvPriceCents: Math.round(ppvPrice * 100),
      });
      setBodyCinemaPlan(result.productionPlan);
      if (result.productionPlan?.renderedOutputUrl || result.productionPlan?.finalVideoUrl) {
        setEditorClips(prev => [{ id: Date.now().toString(), src: result.productionPlan.renderedOutputUrl || result.productionPlan.finalVideoUrl, assetUrl: result.productionPlan.renderedOutputUrl || result.productionPlan.finalVideoUrl, fileUrl: result.productionPlan.renderedOutputUrl || result.productionPlan.finalVideoUrl, duration: result.productionPlan.renderMeta?.durationSeconds || result.productionPlan.remotionComposition?.totalDuration || 24, type: "video", name: `${bodyCinemaName || "Body Cinema"} master render` }, ...prev]);
      }
      await utils.vaultx.getBodyCinemaCollections.invalidate();
      toast.success("Body Cinema rendered: master video, teaser, thumbnail, and platform outputs are ready.");
    } catch (e: any) { toast.error("Body Cinema packaging failed: " + e.message); }
  }, [sourceUrl, variations, selectedVariation, ensureProject, createBodyCinemaCollectionMut, bodyCinemaName, bodyCinemaRegions, bodyCinemaStyle, bodyCinemaPlatforms, ppvPrice, utils]);

  const handlePublishBodyCinemaCollection = useCallback(async (collectionId: string, collectionName: string, hasRenderedOutput = false) => {
    if (!hasRenderedOutput) {
      toast.error("This Body Cinema collection is still a production plan. Render a final video before publishing it as a finished drop.");
      return;
    }
    try {
      const result = await publishBodyCinemaCollectionMut.mutateAsync({
        collectionId,
        title: collectionName,
        description: "Body Cinema final render produced in VaultX Editor with reveal, focus clips, platform exports, and PPV monetization.",
        accessTier: "ppv",
      });
      await utils.vaultx.getBodyCinemaCollections.invalidate();
      toast.success(`Body Cinema published — Content ID: ${result.contentId}`);
    } catch (e: any) { toast.error("Body Cinema publish failed: " + e.message); }
  }, [publishBodyCinemaCollectionMut, utils]);

  const handlePublish = useCallback(async () => {
    if (!sourceUrl) { toast.error("Upload content first"); return; }
    const pid = await ensureProject();
    try {
      const result = await publishToVaultXMut.mutateAsync({ projectId: pid, selectedVariation: selectedVariation + 1, accessTier: publishTier, ppvPrice: publishTier === "ppv" ? ppvPrice : undefined, title: publishTitle || project.title });
      toast.success(`Published! Content ID: ${result.contentId}`);
    } catch (e: any) { toast.error("Publish failed: " + e.message); }
  }, [sourceUrl, selectedVariation, publishTier, ppvPrice, publishTitle, project, ensureProject, publishToVaultXMut]);

  const handleGenerateCalendar = useCallback(async () => {
    try {
      const result = await generateContentCalendarMut.mutateAsync({ weeks: 2 });
      setContentCalendar(result.calendar);
      toast.success(`${result.totalDays}-day calendar generated`);
    } catch (e: any) { toast.error("Calendar failed: " + e.message); }
  }, [generateContentCalendarMut]);

  const isAnyProcessing = analyzeContentMut.isPending || enhancePhotoMut.isPending || enhanceVideoMut.isPending ||
    generateVariationsMut.isPending || detectBodyRegionsMut.isPending || enhanceBodyRegionMut.isPending ||
    generateRevealShotMut.isPending || generateBodyFocusClipMut.isPending || assembleHighlightReelMut.isPending ||
    generateBodyCaptionsMut.isPending || createBodyCinemaCollectionMut.isPending || publishBodyCinemaCollectionMut.isPending ||
    publishToVaultXMut.isPending || generateContentCalendarMut.isPending;

  return (
    <div className="flex flex-col" style={{ height: "100vh", background: "#000000", color: "#FFFFFF", fontFamily: "'Inter', sans-serif", overflow: "hidden" }}>

      {/* ── TOP BAR ── */}
      <div className="flex items-center justify-between px-4 flex-shrink-0" style={{ height: 52, background: "rgba(0,0,0,0.95)", borderBottom: "1px solid rgba(255,255,255,0.06)", backdropFilter: "blur(20px)" }}>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-xl flex items-center justify-center" style={{ background: "linear-gradient(135deg, #8B5CF6, #EC4899)" }}>
              <Sparkles size={14} color="#fff" />
            </div>
            <span className="text-sm font-black" style={{ background: "linear-gradient(135deg, #8B5CF6, #EC4899)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>VaultX</span>
            <span className="text-sm font-black text-white">AI Editor</span>
            <span className="hidden xl:inline-flex px-2 py-1 rounded-full text-[9px] font-black uppercase tracking-[0.14em]" style={{ background: "rgba(236,72,153,0.12)", color: "#f0abfc", border: "1px solid rgba(236,72,153,0.24)" }}>Adult creator output OS</span>
          </div>
          <div className="w-px h-4" style={{ background: "rgba(255,255,255,0.1)" }} />
          <button onClick={() => setShowProjectList(true)} className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-bold" style={{ background: "rgba(255,255,255,0.06)", color: "#9CA3AF", border: "1px solid rgba(255,255,255,0.08)" }}>
            <Film size={11} />{project.title}<ChevronDown size={10} />
          </button>
        </div>
        <div className="flex items-center gap-1 p-1 rounded-2xl" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}>
          {[
            { id: "enhance", label: "ENHANCE",   icon: Sparkles,   color: "#8B5CF6" },
            { id: "body",    label: "BODY INTEL", icon: Brain,      color: "#EC4899" },
            { id: "ppv",     label: "PPV",        icon: Crown,      color: "#F59E0B" },
            { id: "censor",  label: "CENSOR",     icon: ScanLine,   color: "#EC4899" },
            { id: "scene",   label: "SCENE",      icon: Crosshair,  color: "#8B5CF6" },
            { id: "motion",  label: "MOTION",     icon: Gauge,      color: "#3B82F6" },
            { id: "color",   label: "COLOR",      icon: Droplets,   color: "#F59E0B" },
            { id: "text",    label: "TEXT",        icon: Hash,       color: "#10B981" },
            { id: "audio",   label: "AUDIO",      icon: Volume2,    color: "#3B82F6" },
            { id: "format",  label: "FORMAT",     icon: Download,   color: "#10B981" },
            { id: "timeline",label: "TIMELINE",   icon: Layers,     color: "#3B82F6" },
            { id: "publish", label: "PUBLISH",    icon: Send,       color: "#10B981" },
            { id: "calendar",label: "CALENDAR",   icon: Calendar,   color: "#F59E0B" },
          ].map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button key={tab.id} onClick={() => setActiveTab(tab.id as any)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-black"
                style={{ background: isActive ? `${tab.color}20` : "transparent", color: isActive ? tab.color : "#4B5563", border: isActive ? `1px solid ${tab.color}40` : "1px solid transparent", transition: "all 0.15s" }}>
                <Icon size={10} />{tab.label}
              </button>
            );
          })}
        </div>
        <div className="flex items-center gap-2">
          {isAnyProcessing && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl" style={{ background: "rgba(139,92,246,0.15)", border: "1px solid rgba(139,92,246,0.3)" }}>
              <Loader2 size={10} className="animate-spin" style={{ color: "#8B5CF6" }} />
              <span className="text-[9px] font-black" style={{ color: "#8B5CF6" }}>AI RUNNING</span>
            </div>
          )}
          <a href="/vaultx/distribution" className="hidden lg:flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-[10px] font-black" style={{ background: "rgba(16,185,129,0.12)", color: "#86efac", border: "1px solid rgba(16,185,129,0.24)" }}>
            <Share2 size={10} />Distribution
          </a>
          <a href="/vault-x/studio" className="hidden md:flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-[10px] font-black" style={{ background: "rgba(236,72,153,0.12)", color: "#f0abfc", border: "1px solid rgba(236,72,153,0.24)" }}>
            <Sparkles size={10} />Studio
          </a>
          <button onClick={() => setShowProjectList(true)} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-[10px] font-black" style={{ background: "rgba(255,255,255,0.06)", color: "#9CA3AF", border: "1px solid rgba(255,255,255,0.08)" }}>
            <Save size={10} />Projects
          </button>
        </div>
      </div>

      {/* ── WORLD-CLASS COMMAND STRIP ── */}
      <div className="hidden lg:grid grid-cols-4 gap-2 px-4 py-2 flex-shrink-0" style={{ background: "linear-gradient(90deg, rgba(139,92,246,0.10), rgba(236,72,153,0.08), rgba(16,185,129,0.07))", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        {PRODUCTION_PRESETS.map(preset => (
          <button key={preset.id} onClick={() => applyProductionPreset(preset.id)} className="text-left p-3 rounded-2xl transition-all" style={{ background: productionPreset === preset.id ? `${preset.color}18` : "rgba(0,0,0,0.28)", border: `1px solid ${productionPreset === preset.id ? preset.color + "55" : "rgba(255,255,255,0.06)"}` }}>
            <div className="flex items-center justify-between gap-2 mb-1">
              <span className="text-[10px] font-black tracking-wide" style={{ color: productionPreset === preset.id ? preset.color : "#9CA3AF" }}>{preset.label}</span>
              {productionPreset === preset.id && <CheckCircle size={12} style={{ color: preset.color }} />}
            </div>
            <p className="text-[9px] leading-snug" style={{ color: "#6B7280" }}>{preset.desc}</p>
          </button>
        ))}
      </div>

      {/* ── MAIN ── */}
      <div className="flex flex-1 overflow-hidden">

        {/* ── LEFT PANEL ── */}
        <div className="flex flex-col gap-3 p-3 overflow-y-auto flex-shrink-0" style={{ width: 210, background: "rgba(0,0,0,0.6)", borderRight: "1px solid rgba(255,255,255,0.06)" }}>
          {/* Upload zone */}
          <div onClick={() => fileInputRef.current?.click()}
            className="relative flex flex-col items-center justify-center rounded-2xl cursor-pointer"
            style={{ aspectRatio: "9/16", background: sourceUrl ? "transparent" : "rgba(255,255,255,0.02)", border: `2px dashed ${sourceUrl ? "rgba(139,92,246,0.4)" : "rgba(255,255,255,0.1)"}`, overflow: "hidden" }}
            onDragOver={e => e.preventDefault()}
            onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleFileUpload(f); }}>
            {sourceUrl ? (
              contentType === "photo" ? <img src={sourceUrl} alt="Source" className="w-full h-full object-cover" /> : <video src={sourceUrl} className="w-full h-full object-cover" muted loop autoPlay playsInline />
            ) : (
              <div className="flex flex-col items-center gap-2 p-4">
                <div className="w-10 h-10 rounded-2xl flex items-center justify-center" style={{ background: "rgba(139,92,246,0.15)", border: "1px solid rgba(139,92,246,0.3)" }}>
                  <Upload size={18} style={{ color: "#8B5CF6" }} />
                </div>
                <p className="text-[10px] font-black text-center" style={{ color: "#6B7280" }}>DROP PHOTO OR VIDEO</p>
              </div>
            )}
            {analyzeContentMut.isPending && (
              <div className="absolute inset-0 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.7)" }}>
                <div className="flex flex-col items-center gap-2"><Loader2 size={20} className="animate-spin" style={{ color: "#8B5CF6" }} /><span className="text-[9px] font-black" style={{ color: "#8B5CF6" }}>ANALYZING...</span></div>
              </div>
            )}
          </div>
          <input ref={fileInputRef} type="file" accept="image/*,video/*" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) handleFileUpload(f); }} />

          {/* Creator business brief */}
          <div className="flex flex-col gap-2 p-3 rounded-2xl" style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.07)" }}>
            <div className="flex items-center justify-between">
              <p className="text-[9px] font-black tracking-widest" style={{ color: C.gold }}>CREATOR BRIEF</p>
              <span className="text-[8px] font-black px-1.5 py-0.5 rounded-md" style={{ background: outputReadiness >= 80 ? C.greenDim : C.goldDim, color: outputReadiness >= 80 ? C.green : C.gold }}>{outputReadiness}% READY</span>
            </div>
            <div className="h-1 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
              <div className="h-full rounded-full" style={{ width: `${outputReadiness}%`, background: outputReadiness >= 80 ? C.green : C.gold, transition: "width 0.25s" }} />
            </div>
            <div className="grid grid-cols-2 gap-1">
              {(["9:16", "16:9", "1:1", "4:5"] as const).map(fmt => (
                <button key={fmt} onClick={() => setTargetFormat(fmt)} className="py-1.5 rounded-lg text-[8px] font-black" style={{ background: targetFormat === fmt ? C.accentDim : "rgba(255,255,255,0.04)", color: targetFormat === fmt ? C.accent : C.mutedLo, border: `1px solid ${targetFormat === fmt ? "rgba(139,92,246,0.35)" : "rgba(255,255,255,0.06)"}` }}>{fmt}</button>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-1">
              {(["platform_safe", "subscriber", "vip", "archive"] as const).map(mode => (
                <button key={mode} onClick={() => setComplianceMode(mode)} className="py-1.5 px-1 rounded-lg text-[7px] font-black" style={{ background: complianceMode === mode ? C.greenDim : "rgba(255,255,255,0.04)", color: complianceMode === mode ? C.green : C.mutedLo, border: `1px solid ${complianceMode === mode ? "rgba(16,185,129,0.35)" : "rgba(255,255,255,0.06)"}` }}>{mode.replace("_", " ").toUpperCase()}</button>
              ))}
            </div>
            <input value={watermarkIdentity} onChange={e => setWatermarkIdentity(e.target.value)} className="px-2 py-1.5 rounded-lg text-[9px] font-bold" style={{ background: "rgba(0,0,0,0.35)", border: "1px solid rgba(255,255,255,0.08)", color: C.text, outline: "none" }} placeholder="@Creator watermark" />
            <div className="p-2 rounded-xl" style={{ background: `${selectedCompliance.color}12`, border: `1px solid ${selectedCompliance.color}33` }}>
              <div className="flex items-center gap-1.5 mb-1">
                <SelectedComplianceIcon size={10} style={{ color: selectedCompliance.color }} />
                <span className="text-[8px] font-black" style={{ color: selectedCompliance.color }}>{selectedCompliance.label.toUpperCase()}</span>
              </div>
              <p className="text-[8px] leading-snug" style={{ color: C.muted }}>{selectedCompliance.desc}</p>
            </div>
            <div className="p-2 rounded-xl" style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.06)" }}>
              <p className="text-[8px] font-black mb-1" style={{ color: C.muted }}>SELECTED OUTPUTS</p>
              <p className="text-[8px] leading-snug capitalize" style={{ color: C.text }}>{selectedOutputLabels.length ? selectedOutputLabels.join(" · ") : "Choose deliverables"}</p>
            </div>
            <div className="flex flex-col gap-1">
              {[
                { label: "Source", ok: !!sourceUrl },
                { label: "Analyze", ok: !!analysis },
                { label: "Output Pack", ok: selectedOutputPackages.length >= 3 },
                { label: "Platform", ok: exportPresets.length > 0 },
              ].map(item => (
                <div key={item.label} className="flex items-center justify-between text-[8px]">
                  <span style={{ color: C.muted }}>{item.label}</span>
                  <span className="font-black" style={{ color: item.ok ? C.green : C.mutedLo }}>{item.ok ? "LOCKED" : "PENDING"}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Creator intelligence */}
          <div className="flex flex-col gap-2 p-3 rounded-2xl" style={{ background: "linear-gradient(180deg, rgba(236,72,153,0.08), rgba(139,92,246,0.05))", border: "1px solid rgba(236,72,153,0.16)" }}>
            <div className="flex items-center justify-between">
              <p className="text-[9px] font-black tracking-widest" style={{ color: C.pink }}>CREATOR INTELLIGENCE</p>
              <span className="text-[7px] font-black px-1.5 py-0.5 rounded-md" style={{ background: C.pinkDim, color: C.pink }}>SHOT → TEASER → PAID</span>
            </div>
            <p className="text-[8px] leading-snug" style={{ color: C.muted }}>This is the part that tells the creator what to do with the footage, not just which button to click.</p>
            <div className="flex flex-col gap-1.5">
              {creatorIntelligence.map(item => {
                const Icon = item.icon as any;
                return (
                  <div key={item.label} className="p-2 rounded-xl" style={{ background: "rgba(0,0,0,0.32)", border: `1px solid ${item.color}26` }}>
                    <div className="flex items-center gap-1.5 mb-1">
                      <Icon size={10} style={{ color: item.color }} />
                      <span className="text-[8px] font-black" style={{ color: item.color }}>{item.label.toUpperCase()}</span>
                    </div>
                    <p className="text-[8px] leading-snug mb-1" style={{ color: C.text }}>{item.action}</p>
                    <p className="text-[7px] leading-snug" style={{ color: C.muted }}>{item.detail}</p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Analysis summary */}
          {analysis && (
            <div className="flex flex-col gap-1.5 p-2.5 rounded-2xl" style={{ background: "rgba(139,92,246,0.08)", border: "1px solid rgba(139,92,246,0.2)" }}>
              <p className="text-[9px] font-black tracking-widest" style={{ color: "#8B5CF6" }}>ANALYSIS</p>
              <div className="grid grid-cols-2 gap-1">
                {[
                  { label: "Quality", value: `${analysis.image_quality}/10`, color: "#22C55E" },
                  { label: "Potential", value: `${analysis.monetization_potential}/10`, color: "#C9A84C" },
                  { label: "Lighting", value: `${analysis.lighting_quality}/10`, color: "#3B82F6" },
                  { label: "Suggest $", value: `$${analysis.pricing_recommendation}`, color: "#10B981" },
                ].map(({ label, value, color }) => (
                  <div key={label} className="flex flex-col p-1.5 rounded-xl" style={{ background: "rgba(0,0,0,0.3)" }}>
                    <span className="text-[7px]" style={{ color: "#6B7280" }}>{label}</span>
                    <span className="text-xs font-black" style={{ color }}>{value}</span>
                  </div>
                ))}
              </div>
              <div className="flex flex-wrap gap-1 mt-0.5">
                {analysis.strongest_assets?.slice(0, 3).map(a => (
                  <span key={a} className="px-1.5 py-0.5 rounded-md text-[7px] font-black" style={{ background: "rgba(201,168,76,0.2)", color: "#C9A84C" }}>{a.toUpperCase()}</span>
                ))}
              </div>
            </div>
          )}

          {/* Intensity */}
          <div className="flex flex-col gap-1.5">
            <p className="text-[9px] font-black tracking-widest" style={{ color: "#6B7280" }}>INTENSITY</p>
            <div className="grid grid-cols-2 gap-1">
              {(["subtle", "natural", "enhanced", "cinematic"] as const).map(i => (
                <button key={i} onClick={() => setEnhancementIntensity(i)}
                  className="py-1.5 rounded-xl text-[9px] font-black"
                  style={{ background: enhancementIntensity === i ? "rgba(139,92,246,0.2)" : "rgba(255,255,255,0.04)", color: enhancementIntensity === i ? "#8B5CF6" : "#4B5563", border: `1px solid ${enhancementIntensity === i ? "rgba(139,92,246,0.4)" : "rgba(255,255,255,0.06)"}` }}>
                  {i.toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          {/* Background */}
          <div className="flex flex-col gap-1.5">
            <p className="text-[9px] font-black tracking-widest" style={{ color: "#6B7280" }}>BACKGROUND</p>
            <div className="flex flex-col gap-1">
              {(["keep", "penthouse", "yacht", "rose_bed", "dark_studio", "miami_villa", "private_jet"] as const).map(bg => (
                <button key={bg} onClick={() => setBackgroundStyle(bg)}
                  className="py-1.5 px-2 rounded-xl text-[9px] font-bold text-left"
                  style={{ background: backgroundStyle === bg ? "rgba(201,168,76,0.15)" : "rgba(255,255,255,0.03)", color: backgroundStyle === bg ? "#C9A84C" : "#4B5563", border: `1px solid ${backgroundStyle === bg ? "rgba(201,168,76,0.3)" : "rgba(255,255,255,0.05)"}` }}>
                  {bg.replace("_", " ").toUpperCase()}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* ── CENTER ── */}
        <div className="flex-1 flex flex-col overflow-hidden">

          {/* ENHANCE TAB */}
          {activeTab === "enhance" && (
            <div className="flex-1 flex flex-col overflow-hidden">
              <div className="flex items-center gap-2 px-4 py-2 flex-shrink-0" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                <button onClick={handleEnhance} disabled={!sourceUrl || isAnyProcessing}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black"
                  style={{ background: (!sourceUrl || isAnyProcessing) ? "rgba(255,255,255,0.04)" : "linear-gradient(135deg, #8B5CF6, #EC4899)", color: (!sourceUrl || isAnyProcessing) ? "#374151" : "#fff" }}>
                  {enhancePhotoMut.isPending || enhanceVideoMut.isPending ? <><Loader2 size={12} className="animate-spin" />ENHANCING...</> : <><Sparkles size={12} />ENHANCE NOW</>}
                </button>
                <button onClick={handleGenerateVariations} disabled={!sourceUrl || isAnyProcessing}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black"
                  style={{ background: "rgba(139,92,246,0.15)", color: "#8B5CF6", border: "1px solid rgba(139,92,246,0.3)" }}>
                  {generateVariationsMut.isPending ? <><Loader2 size={12} className="animate-spin" />GENERATING...</> : <><RefreshCw size={12} />3 VARIATIONS</>}
                </button>
                <div className="flex-1" />
                <button onClick={() => setActiveTab("publish")}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black"
                  style={{ background: "rgba(16,185,129,0.15)", color: "#10B981", border: "1px solid rgba(16,185,129,0.3)" }}>
                  <Send size={12} />PUBLISH
                </button>
              </div>
              {toolStatus && (
                <div className="mx-4 mt-3 px-3 py-2 rounded-2xl text-[10px] font-bold flex items-center gap-2" style={{ background: "rgba(139,92,246,0.10)", color: "#C4B5FD", border: "1px solid rgba(139,92,246,0.24)" }}>
                  <Info size={12} />{toolStatus}
                </div>
              )}
              <div className="flex-1 overflow-y-auto p-4">
                {variations.length > 0 ? (
                  <div className="flex flex-col gap-4">
                    <p className="text-xs font-black tracking-widest" style={{ color: "#6B7280" }}>AI VARIATIONS — SELECT YOUR BEST</p>
                    <div className="grid grid-cols-3 gap-3">
                      {variations.map((v, i) => <VariationCard key={v.variation} variation={v} isSelected={selectedVariation === i} onSelect={() => setSelectedVariation(i)} />)}
                    </div>
                    {/* Captions */}
                    <div className="flex flex-col gap-3 p-4 rounded-2xl" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}>
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-black tracking-widest" style={{ color: "#6B7280" }}>CAPTIONS & COPY</p>
                        <div className="flex items-center gap-2">
                          <div className="flex gap-1">
                            {(["teaser", "direct", "romantic", "luxury", "playful"] as const).map(s => (
                              <button key={s} onClick={() => setCaptionStyle(s)}
                                className="px-2 py-1 rounded-lg text-[8px] font-black"
                                style={{ background: captionStyle === s ? "rgba(201,168,76,0.2)" : "rgba(255,255,255,0.04)", color: captionStyle === s ? "#C9A84C" : "#4B5563", border: `1px solid ${captionStyle === s ? "rgba(201,168,76,0.3)" : "rgba(255,255,255,0.06)"}` }}>
                                {s.toUpperCase()}
                              </button>
                            ))}
                          </div>
                          <button onClick={handleGenerateCaptions} disabled={isAnyProcessing}
                            className="flex items-center gap-1 px-3 py-1 rounded-xl text-[9px] font-black"
                            style={{ background: "rgba(201,168,76,0.15)", color: "#C9A84C", border: "1px solid rgba(201,168,76,0.3)" }}>
                            {generateBodyCaptionsMut.isPending ? <Loader2 size={9} className="animate-spin" /> : <Wand2 size={9} />}GENERATE
                          </button>
                        </div>
                      </div>
                      {captions && (
                        <div className="grid grid-cols-2 gap-2">
                          {[
                            { key: "teaser_caption", label: "TEASER", color: "#3B82F6" },
                            { key: "subscriber_caption", label: "SUBSCRIBERS", color: "#8B5CF6" },
                            { key: "ppv_pitch", label: "PPV PITCH", color: "#C9A84C" },
                            { key: "mass_message_template", label: "MASS MESSAGE", color: "#EC4899" },
                          ].map(({ key, label, color }) => (
                            <div key={key} className="flex flex-col gap-1 p-2.5 rounded-xl" style={{ background: "rgba(0,0,0,0.4)", border: `1px solid ${color}20` }}>
                              <div className="flex items-center justify-between">
                                <span className="text-[8px] font-black" style={{ color }}>{label}</span>
                                <button onClick={() => { navigator.clipboard.writeText(captions[key] || ""); toast.success("Copied!"); }}
                                  className="w-5 h-5 rounded-md flex items-center justify-center" style={{ background: `${color}15` }}>
                                  <Copy size={8} style={{ color }} />
                                </button>
                              </div>
                              <p className="text-[9px] leading-relaxed" style={{ color: "#9CA3AF" }}>{captions[key]}</p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="min-h-full grid xl:grid-cols-[1.05fr_0.95fr] gap-4 items-stretch">
                    <div className="flex flex-col justify-between gap-5 p-6 rounded-3xl" style={{ background: "radial-gradient(circle at 20% 0%, rgba(139,92,246,0.25), transparent 34%), radial-gradient(circle at 90% 20%, rgba(236,72,153,0.16), transparent 30%), rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.08)" }}>
                      <div className="space-y-3">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full" style={{ background: C.goldDim, color: C.gold, border: "1px solid rgba(245,158,11,0.28)" }}>
                          <Zap size={12} /><span className="text-[10px] font-black tracking-[0.18em]">WORLD-CLASS EXPORT OS</span>
                        </div>
                        <div>
                          <h1 className="text-3xl xl:text-5xl font-black leading-[0.92] tracking-tight text-white">Turn one raw asset into a complete adult-creator launch package.</h1>
                          <p className="mt-3 max-w-xl text-sm leading-relaxed" style={{ color: C.muted }}>Upload once, then leave with a polished master, platform-safe teaser, paid PPV drop, subscriber copy, social cutdowns, thumbnail, launch calendar, and vault archive without mixing VaultX with the clean CreatorVault lane.</p>
                        </div>
                      </div>
                      <div className="grid md:grid-cols-4 gap-2">
                        {WORKFLOW_STEPS.map(step => {
                          const Icon = step.icon as any;
                          return (
                            <div key={step.step} className="p-3 rounded-2xl" style={{ background: "rgba(0,0,0,0.34)", border: `1px solid ${step.color}33` }}>
                              <div className="flex items-center justify-between mb-2"><span className="text-[9px] font-black" style={{ color: step.color }}>{step.step}</span><Icon size={13} style={{ color: step.color }} /></div>
                              <p className="text-[11px] font-black text-white">{step.label}</p>
                              <p className="text-[9px] leading-snug mt-1" style={{ color: C.muted }}>{step.detail}</p>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                    <div className="flex flex-col gap-3">
                      <div className="grid grid-cols-2 gap-2">
                        {WORLD_CLASS_OUTPUTS.map(output => {
                          const Icon = output.icon as any;
                          const selected = selectedOutputPackages.includes(output.id);
                          return (
                            <button key={output.id} onClick={() => setSelectedOutputPackages(prev => selected ? prev.filter(id => id !== output.id) : [...prev, output.id])} className="text-left p-3 rounded-2xl transition-all" style={{ background: selected ? `${output.color}17` : "rgba(255,255,255,0.025)", border: `1px solid ${selected ? output.color + "4D" : "rgba(255,255,255,0.06)"}` }}>
                              <div className="flex items-center justify-between mb-1"><Icon size={13} style={{ color: selected ? output.color : C.mutedLo }} />{selected && <Check size={12} style={{ color: output.color }} />}</div>
                              <p className="text-[10px] font-black" style={{ color: selected ? output.color : C.text }}>{output.label}</p>
                              <p className="text-[8px] leading-snug mt-1" style={{ color: C.muted }}>{output.desc}</p>
                            </button>
                          );
                        })}
                      </div>
                      <div className="p-3 rounded-2xl" style={{ background: `${selectedPreset.color}10`, border: `1px solid ${selectedPreset.color}33` }}>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-[9px] font-black tracking-widest" style={{ color: selectedPreset.color }}>CURRENT BUILD</span>
                          <span className="text-[9px] font-black" style={{ color: C.text }}>{selectedPreset.label}</span>
                        </div>
                        <p className="text-[10px] leading-relaxed" style={{ color: C.muted }}>{selectedOutputLabels.join(" · ")} for {targetFormat} in {selectedCompliance.label} mode.</p>
                      </div>
                      <button onClick={() => fileInputRef.current?.click()} className="w-full py-3 rounded-2xl text-sm font-black flex items-center justify-center gap-2" style={{ background: "linear-gradient(135deg, #8B5CF6, #EC4899)", color: "#fff" }}><Upload size={15} />UPLOAD AND BUILD OUTPUT PACKAGE</button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* BODY INTEL TAB */}
          {activeTab === "body" && (
            <div className="flex-1 flex overflow-hidden">
              <div className="flex flex-col items-center gap-4 p-4 flex-shrink-0" style={{ width: 190, borderRight: "1px solid rgba(255,255,255,0.06)" }}>
                <p className="text-[9px] font-black tracking-widest self-start" style={{ color: "#EC4899" }}>BODY MAP</p>
                <BodySilhouette bodyMap={bodyMap} activeRegion={activeRegion} onRegionClick={(region) => { setActiveRegion(region); if (sourceUrl) handleEnhanceRegion(region); }} />
                <button onClick={handleDetectBody} disabled={!sourceUrl || isAnyProcessing}
                  className="w-full py-2 rounded-xl text-[9px] font-black"
                  style={{ background: (!sourceUrl || isAnyProcessing) ? "rgba(255,255,255,0.04)" : "rgba(236,72,153,0.2)", color: (!sourceUrl || isAnyProcessing) ? "#374151" : "#EC4899", border: `1px solid ${(!sourceUrl || isAnyProcessing) ? "rgba(255,255,255,0.06)" : "rgba(236,72,153,0.3)"}` }}>
                  {detectBodyRegionsMut.isPending ? <><Loader2 size={9} className="animate-spin inline mr-1" />SCANNING...</> : "SCAN BODY REGIONS"}
                </button>
                {bodyMap && (
                  <div className="w-full flex flex-col gap-1.5">
                    <p className="text-[8px] font-black tracking-widest" style={{ color: "#6B7280" }}>DETECTED</p>
                    {BODY_REGIONS.map(r => {
                      const detected = bodyMap.regions_detected[r.id]?.detected;
                      const confidence = bodyMap.regions_detected[r.id]?.confidence || 0;
                      return (
                        <div key={r.id} className="flex items-center justify-between">
                          <span className="text-[8px] font-bold" style={{ color: detected ? r.color : "#374151" }}>{r.label}</span>
                          <div className="flex items-center gap-1">
                            <div className="w-14 h-1 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
                              <div className="h-full rounded-full" style={{ width: `${confidence * 100}%`, background: detected ? r.color : "#374151" }} />
                            </div>
                            <span className="text-[7px]" style={{ color: "#4B5563" }}>{Math.round(confidence * 100)}%</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="flex-1 flex flex-col overflow-y-auto p-4 gap-4">
                {/* Region buttons */}
                <div className="flex flex-col gap-2">
                  <p className="text-[9px] font-black tracking-widest" style={{ color: "#6B7280" }}>TARGETED ENHANCEMENT</p>
                  <div className="grid grid-cols-4 gap-2">
                    {BODY_REGIONS.map(r => {
                      const isEnhancing = enhanceBodyRegionMut.isPending && activeRegion === r.id;
                      const isDetected = bodyMap?.regions_detected[r.id]?.detected;
                      return (
                        <button key={r.id} onClick={() => { setActiveRegion(r.id); if (sourceUrl) handleEnhanceRegion(r.id); }} disabled={!sourceUrl || isAnyProcessing}
                          className="flex flex-col items-center gap-1.5 p-3 rounded-2xl"
                          style={{ background: activeRegion === r.id ? `${r.color}20` : "rgba(255,255,255,0.03)", border: `2px solid ${activeRegion === r.id ? r.color : isDetected ? r.color + "40" : "rgba(255,255,255,0.06)"}`, transition: "all 0.15s" }}>
                          <span className="text-lg">{r.icon}</span>
                          <span className="text-[9px] font-black" style={{ color: activeRegion === r.id ? r.color : isDetected ? r.color + "CC" : "#374151" }}>{r.label}</span>
                          {isEnhancing && <Loader2 size={10} className="animate-spin" style={{ color: r.color }} />}
                          {isDetected && !isEnhancing && <div className="w-1.5 h-1.5 rounded-full" style={{ background: r.color }} />}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Kling video generation */}
                <div className="flex flex-col gap-2 p-3 rounded-2xl" style={{ background: "rgba(236,72,153,0.05)", border: "1px solid rgba(236,72,153,0.15)" }}>
                  <p className="text-[9px] font-black tracking-widest" style={{ color: "#EC4899" }}>KLING 3.0 VIDEO GENERATION</p>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="flex flex-col gap-2 p-3 rounded-xl" style={{ background: "rgba(0,0,0,0.4)" }}>
                      <p className="text-[9px] font-black" style={{ color: "#EC4899" }}>CINEMATIC REVEAL</p>
                      <p className="text-[8px]" style={{ color: "#6B7280" }}>Slow bottom-to-top reveal, 8s, 9:16</p>
                      {revealShotUrl ? (
                        <video src={revealShotUrl} className="w-full rounded-xl" style={{ maxHeight: 100, objectFit: "cover" }} muted loop autoPlay playsInline />
                      ) : (
                        <div className="flex items-center justify-center rounded-xl" style={{ height: 60, background: "rgba(236,72,153,0.05)", border: "1px dashed rgba(236,72,153,0.2)" }}>
                          <Film size={16} style={{ color: "#374151" }} />
                        </div>
                      )}
                      <button onClick={handleRevealShot} disabled={!sourceUrl || isAnyProcessing}
                        className="py-1.5 rounded-xl text-[9px] font-black"
                        style={{ background: "rgba(236,72,153,0.15)", color: "#EC4899", border: "1px solid rgba(236,72,153,0.3)" }}>
                        {generateRevealShotMut.isPending ? <><Loader2 size={9} className="animate-spin inline mr-1" />GENERATING...</> : "GENERATE REVEAL"}
                      </button>
                    </div>
                    <div className="flex flex-col gap-2 p-3 rounded-xl" style={{ background: "rgba(0,0,0,0.4)" }}>
                      <p className="text-[9px] font-black" style={{ color: "#8B5CF6" }}>BODY FOCUS CLIPS</p>
                      <p className="text-[8px]" style={{ color: "#6B7280" }}>5s close-up per region</p>
                      <div className="flex flex-col gap-1">
                        {(["bust", "abdomen", "glutes", "legs", "full"] as const).map(region => (
                          <button key={region} onClick={() => handleFocusClip(region)} disabled={!sourceUrl || isAnyProcessing}
                            className="flex items-center justify-between px-2 py-1.5 rounded-xl"
                            style={{ background: focusClips[region] ? "rgba(139,92,246,0.15)" : "rgba(255,255,255,0.03)", border: `1px solid ${focusClips[region] ? "rgba(139,92,246,0.3)" : "rgba(255,255,255,0.06)"}` }}>
                            <span className="text-[8px] font-black" style={{ color: focusClips[region] ? "#8B5CF6" : "#4B5563" }}>{region.toUpperCase()}</span>
                            {focusClips[region] ? <CheckCircle size={9} style={{ color: "#22C55E" }} /> : <Plus size={9} style={{ color: "#374151" }} />}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                  <button onClick={async () => { const pid = await ensureProject(); try { await assembleHighlightReelMut.mutateAsync({ projectId: pid }); toast.success("Highlight reel assembled"); } catch (e: any) { toast.error(e.message); } }}
                    disabled={!revealShotUrl || isAnyProcessing}
                    className="w-full py-2 rounded-xl text-[9px] font-black flex items-center justify-center gap-2"
                    style={{ background: revealShotUrl ? "linear-gradient(135deg, rgba(236,72,153,0.2), rgba(139,92,246,0.2))" : "rgba(255,255,255,0.04)", color: revealShotUrl ? "#EC4899" : "#374151", border: `1px solid ${revealShotUrl ? "rgba(236,72,153,0.3)" : "rgba(255,255,255,0.06)"}` }}>
                    {assembleHighlightReelMut.isPending ? <><Loader2 size={10} className="animate-spin" />ASSEMBLING...</> : <><Crown size={10} />ASSEMBLE HIGHLIGHT REEL</>}
                  </button>
                </div>



                {/* Body Cinema Collection */}
                <div className="flex flex-col gap-3 p-3 rounded-2xl" style={{ background: "linear-gradient(135deg, rgba(201,168,76,0.08), rgba(236,72,153,0.06))", border: "1px solid rgba(201,168,76,0.18)" }}>
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-[9px] font-black tracking-widest" style={{ color: "#C9A84C" }}>BODY CINEMA COLLECTION</p>
                      <p className="text-[8px] mt-1" style={{ color: "#6B7280" }}>Create a real FFmpeg-rendered Body Cinema master, teaser, thumbnail, and platform export package from the uploaded asset.</p>
                    </div>
                    <div className="flex items-center gap-1 px-2 py-1 rounded-xl" style={{ background: "rgba(201,168,76,0.12)", border: "1px solid rgba(201,168,76,0.25)" }}>
                      <BodyCinemaStatusIcon size={10} style={{ color: bodyCinemaStatusColor }} />
                      <span className="text-[8px] font-black" style={{ color: bodyCinemaStatusColor }}>{bodyCinemaStatusLabel}</span>
                    </div>
                  </div>

                  <div className="flex flex-col gap-2 p-2 rounded-xl" style={{ background: "rgba(0,0,0,0.35)", border: `1px solid ${bodyCinemaRealRenderUrl ? "rgba(16,185,129,0.22)" : "rgba(245,158,11,0.2)"}` }}>
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <BodyCinemaStatusIcon size={12} style={{ color: bodyCinemaStatusColor }} />
                        <span className="text-[8px] font-black tracking-widest" style={{ color: bodyCinemaStatusColor }}>READINESS {bodyCinemaReadinessScore}%</span>
                      </div>
                      <span className="text-[8px] font-bold" style={{ color: "#6B7280" }}>{bodyCinemaReadyCount}/{bodyCinemaReadinessItems.length} real requirements met</span>
                    </div>
                    <p className="text-[8px] leading-relaxed" style={{ color: "#9CA3AF" }}>{bodyCinemaRealRenderUrl ? "This package has real downloadable output and can be published as a finished Body Cinema asset." : "Create the collection to generate a real FFmpeg master, teaser, and thumbnail before publishing."}</p>
                    <div className="grid grid-cols-2 gap-1">
                      {bodyCinemaReadinessItems.map(item => (
                        <div key={item.label} className="flex items-start gap-1.5 rounded-lg px-2 py-1" style={{ background: item.ready ? "rgba(16,185,129,0.08)" : "rgba(255,255,255,0.025)", border: `1px solid ${item.ready ? "rgba(16,185,129,0.18)" : "rgba(255,255,255,0.06)"}` }}>
                          {item.ready ? <CheckCircle size={9} style={{ color: "#10B981", marginTop: 1 }} /> : <Clock size={9} style={{ color: "#6B7280", marginTop: 1 }} />}
                          <div className="min-w-0">
                            <p className="text-[7px] font-black" style={{ color: item.ready ? "#10B981" : "#6B7280" }}>{item.label.toUpperCase()}</p>
                            <p className="text-[7px] leading-tight" style={{ color: "#6B7280" }}>{item.detail}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <div className="col-span-2 flex flex-col gap-1.5">
                      <span className="text-[8px] font-black" style={{ color: "#6B7280" }}>COLLECTION NAME</span>
                      <input value={bodyCinemaName} onChange={e => setBodyCinemaName(e.target.value)} className="px-3 py-2 rounded-xl text-xs font-bold outline-none" style={{ background: "rgba(0,0,0,0.45)", color: "#FFFFFF", border: "1px solid rgba(255,255,255,0.08)" }} />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <span className="text-[8px] font-black" style={{ color: "#6B7280" }}>PPV PRICE</span>
                      <input type="number" min={3} max={1000} value={ppvPrice} onChange={e => setPpvPrice(Number(e.target.value || 0))} className="px-3 py-2 rounded-xl text-xs font-bold outline-none" style={{ background: "rgba(0,0,0,0.45)", color: "#FFFFFF", border: "1px solid rgba(255,255,255,0.08)" }} />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex flex-col gap-2">
                      <span className="text-[8px] font-black" style={{ color: "#6B7280" }}>CINEMA STYLE</span>
                      <div className="grid grid-cols-3 gap-1">
                        {([
                          ["luxury", "LUX"], ["noir", "NOIR"], ["sunset", "HEAT"], ["penthouse", "VIP"], ["editorial", "COVER"], ["vip_tease", "TEASE"],
                        ] as const).map(([style, label]) => (
                          <button key={style} onClick={() => setBodyCinemaStyle(style)} className="py-1.5 rounded-xl text-[8px] font-black" style={{ background: bodyCinemaStyle === style ? "rgba(201,168,76,0.2)" : "rgba(255,255,255,0.035)", color: bodyCinemaStyle === style ? "#C9A84C" : "#4B5563", border: `1px solid ${bodyCinemaStyle === style ? "rgba(201,168,76,0.35)" : "rgba(255,255,255,0.06)"}` }}>{label}</button>
                        ))}
                      </div>
                    </div>
                    <div className="flex flex-col gap-2">
                      <span className="text-[8px] font-black" style={{ color: "#6B7280" }}>REGIONS</span>
                      <div className="grid grid-cols-5 gap-1">
                        {(["bust", "abdomen", "glutes", "legs", "full"] as const).map(region => (
                          <button key={region} onClick={() => toggleBodyCinemaRegion(region)} className="py-1.5 rounded-xl text-[8px] font-black" style={{ background: bodyCinemaRegions.includes(region) ? "rgba(236,72,153,0.18)" : "rgba(255,255,255,0.035)", color: bodyCinemaRegions.includes(region) ? "#EC4899" : "#4B5563", border: `1px solid ${bodyCinemaRegions.includes(region) ? "rgba(236,72,153,0.32)" : "rgba(255,255,255,0.06)"}` }}>{region.slice(0, 3).toUpperCase()}</button>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col gap-2">
                    <span className="text-[8px] font-black" style={{ color: "#6B7280" }}>EXPORT DESTINATIONS</span>
                    <div className="grid grid-cols-6 gap-1">
                      {(["vaultx", "onlyfans", "fansly", "telegram", "instagram_reel", "twitter"] as const).map(platform => (
                        <button key={platform} onClick={() => toggleBodyCinemaPlatform(platform)} className="py-1.5 rounded-xl text-[8px] font-black" style={{ background: bodyCinemaPlatforms.includes(platform) ? "rgba(16,185,129,0.16)" : "rgba(255,255,255,0.035)", color: bodyCinemaPlatforms.includes(platform) ? "#10B981" : "#4B5563", border: `1px solid ${bodyCinemaPlatforms.includes(platform) ? "rgba(16,185,129,0.3)" : "rgba(255,255,255,0.06)"}` }}>{platform.replace("instagram_reel", "ig").toUpperCase()}</button>
                      ))}
                    </div>
                  </div>

                  <button onClick={handleCreateBodyCinemaCollection} disabled={!sourceUrl || isAnyProcessing}
                    className="w-full py-2 rounded-xl text-[9px] font-black flex items-center justify-center gap-2"
                    style={{ background: (!sourceUrl || isAnyProcessing) ? "rgba(255,255,255,0.04)" : "linear-gradient(135deg, rgba(201,168,76,0.32), rgba(236,72,153,0.24))", color: (!sourceUrl || isAnyProcessing) ? "#374151" : "#F7E7B4", border: `1px solid ${(!sourceUrl || isAnyProcessing) ? "rgba(255,255,255,0.06)" : "rgba(201,168,76,0.35)"}` }}>
                    {createBodyCinemaCollectionMut.isPending ? <><Loader2 size={10} className="animate-spin" />RENDERING OUTPUTS...</> : <><Crown size={10} />CREATE + RENDER BODY CINEMA</>}
                  </button>

                  {bodyCinemaPlan && (
                    <div className="flex flex-col gap-2">
                      <div className="grid grid-cols-3 gap-2">
                        <div className="p-2 rounded-xl" style={{ background: "rgba(0,0,0,0.35)", border: "1px solid rgba(201,168,76,0.15)" }}><p className="text-[7px] font-black" style={{ color: "#6B7280" }}>DURATION</p><p className="text-xs font-black" style={{ color: "#C9A84C" }}>{bodyCinemaPlan.renderMeta?.durationSeconds || bodyCinemaPlan.remotionComposition?.totalDuration || 0}s</p></div>
                        <div className="p-2 rounded-xl" style={{ background: "rgba(0,0,0,0.35)", border: "1px solid rgba(201,168,76,0.15)" }}><p className="text-[7px] font-black" style={{ color: "#6B7280" }}>ENGINE</p><p className="text-xs font-black" style={{ color: "#C9A84C" }}>{(bodyCinemaPlan.renderMeta?.engine || "ffmpeg").toUpperCase()}</p></div>
                        <div className="p-2 rounded-xl" style={{ background: "rgba(0,0,0,0.35)", border: "1px solid rgba(201,168,76,0.15)" }}><p className="text-[7px] font-black" style={{ color: "#6B7280" }}>EXPORTS</p><p className="text-xs font-black" style={{ color: "#C9A84C" }}>{bodyCinemaPlan.platformExports?.length || 0}</p></div>
                      </div>
                      {bodyCinemaRealRenderUrl && (
                        <div className="grid grid-cols-3 gap-2">
                          <a href={bodyCinemaRealRenderUrl} target="_blank" rel="noreferrer" className="py-2 rounded-xl text-[8px] font-black text-center" style={{ background: "rgba(16,185,129,0.14)", color: "#86efac", border: "1px solid rgba(16,185,129,0.28)" }}>DOWNLOAD MASTER</a>
                          <a href={bodyCinemaTeaserUrl || bodyCinemaRealRenderUrl} target="_blank" rel="noreferrer" className="py-2 rounded-xl text-[8px] font-black text-center" style={{ background: "rgba(236,72,153,0.12)", color: "#f0abfc", border: "1px solid rgba(236,72,153,0.26)" }}>DOWNLOAD TEASER</a>
                          <a href={bodyCinemaThumbnailUrl || bodyCinemaRealRenderUrl} target="_blank" rel="noreferrer" className="py-2 rounded-xl text-[8px] font-black text-center" style={{ background: "rgba(201,168,76,0.14)", color: "#F7E7B4", border: "1px solid rgba(201,168,76,0.28)" }}>THUMBNAIL</a>
                        </div>
                      )}
                    </div>
                  )}

                  {(bodyCinemaCollectionsQ.data?.collections?.length ?? 0) > 0 && (
                    <div className="flex flex-col gap-2">
                      <span className="text-[8px] font-black" style={{ color: "#6B7280" }}>RECENT COLLECTIONS</span>
                      {bodyCinemaCollectionsQ.data?.collections?.slice(0, 3).map((collection: any) => {
                        const plan = collection.production_plan || {};
                        const renderedUrl = plan.renderedOutputUrl || plan.finalVideoUrl || plan.renderedVideoUrl || collection.rendered_output_url || null;
                        const canPublishFinished = Boolean(renderedUrl);
                        return (
                          <div key={collection.id} className="flex items-center justify-between gap-2 p-2 rounded-xl" style={{ background: "rgba(0,0,0,0.35)", border: "1px solid rgba(255,255,255,0.07)" }}>
                            <div className="min-w-0"><p className="text-[9px] font-black truncate" style={{ color: "#FFFFFF" }}>{collection.collection_name}</p><p className="text-[8px]" style={{ color: "#6B7280" }}>{collection.cinematic_style} · ${Number(collection.ppv_price_cents || 0) / 100} · {collection.status} · {canPublishFinished ? "final render" : "plan only"}</p></div>
                            <div className="flex items-center gap-1">
                              {renderedUrl && <a href={renderedUrl} target="_blank" rel="noreferrer" className="px-2 py-1 rounded-lg text-[8px] font-black" style={{ background: "rgba(59,130,246,0.14)", color: "#93c5fd", border: "1px solid rgba(59,130,246,0.28)" }}>OPEN</a>}
                              <button onClick={() => handlePublishBodyCinemaCollection(collection.id, collection.collection_name, canPublishFinished)} disabled={collection.status === "published" || isAnyProcessing || !canPublishFinished} className="px-3 py-1 rounded-lg text-[8px] font-black" style={{ background: collection.status === "published" ? "rgba(16,185,129,0.12)" : canPublishFinished ? "rgba(16,185,129,0.18)" : "rgba(245,158,11,0.1)", color: collection.status === "published" ? "#10B981" : canPublishFinished ? "#FFFFFF" : "#F59E0B", border: `1px solid ${canPublishFinished ? "rgba(16,185,129,0.28)" : "rgba(245,158,11,0.25)"}` }}>{collection.status === "published" ? "LIVE" : canPublishFinished ? "PUBLISH" : "NEEDS RENDER"}</button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Body captions */}
                <div className="flex flex-col gap-2 p-3 rounded-2xl" style={{ background: "rgba(201,168,76,0.05)", border: "1px solid rgba(201,168,76,0.15)" }}>
                  <div className="flex items-center justify-between">
                    <p className="text-[9px] font-black tracking-widest" style={{ color: "#C9A84C" }}>BODY-FOCUSED CAPTIONS</p>
                    <button onClick={handleGenerateCaptions} disabled={isAnyProcessing}
                      className="flex items-center gap-1 px-3 py-1 rounded-xl text-[9px] font-black"
                      style={{ background: "rgba(201,168,76,0.15)", color: "#C9A84C", border: "1px solid rgba(201,168,76,0.3)" }}>
                      {generateBodyCaptionsMut.isPending ? <Loader2 size={9} className="animate-spin" /> : <Wand2 size={9} />}GENERATE
                    </button>
                  </div>
                  {captions && (
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { key: "teaser_caption", label: "TEASER" },
                        { key: "ppv_pitch", label: "PPV PITCH" },
                        { key: "subscriber_caption", label: "SUBSCRIBERS" },
                        { key: "mass_message_template", label: "MASS MESSAGE" },
                      ].map(({ key, label }) => (
                        <div key={key} className="flex flex-col gap-1 p-2 rounded-xl" style={{ background: "rgba(0,0,0,0.4)", border: "1px solid rgba(201,168,76,0.15)" }}>
                          <div className="flex items-center justify-between">
                            <span className="text-[8px] font-black" style={{ color: "#C9A84C" }}>{label}</span>
                            <button onClick={() => { navigator.clipboard.writeText(captions[key] || ""); toast.success("Copied!"); }}
                              className="w-4 h-4 rounded flex items-center justify-center" style={{ background: "rgba(201,168,76,0.15)" }}>
                              <Copy size={7} style={{ color: "#C9A84C" }} />
                            </button>
                          </div>
                          <p className="text-[8px] leading-relaxed" style={{ color: "#9CA3AF" }}>{captions[key]}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* PPV TAB */}
          {activeTab === "ppv" && (
            <div className="p-3 overflow-y-auto flex-1">
              {toolStatus && <div className="mb-2 px-2 py-1 rounded-lg text-[10px] font-bold" style={{ background: C.greenDim, color: C.green, border: `1px solid ${C.green}` }}>{toolStatus}</div>}
              <PPVPanel clipUrl={selectedClipUrl} duration={selectedClipDuration} onStatus={setToolStatus} projectId={editorProjectId} onAddClip={handleAddClip} onAddAudioTrack={handleAddAudioTrack} />
            </div>
          )}
          {/* CENSOR TAB */}
          {activeTab === "censor" && (
            <div className="p-3 overflow-y-auto flex-1">
              {toolStatus && <div className="mb-2 px-2 py-1 rounded-lg text-[10px] font-bold" style={{ background: C.greenDim, color: C.green, border: `1px solid ${C.green}` }}>{toolStatus}</div>}
              <CensorPanel clipUrl={selectedClipUrl} onStatus={setToolStatus} projectId={editorProjectId} onAddClip={handleAddClip} onAddAudioTrack={handleAddAudioTrack} />
            </div>
          )}
          {/* SCENE TAB */}
          {activeTab === "scene" && (
            <div className="p-3 overflow-y-auto flex-1">
              {toolStatus && <div className="mb-2 px-2 py-1 rounded-lg text-[10px] font-bold" style={{ background: C.greenDim, color: C.green, border: `1px solid ${C.green}` }}>{toolStatus}</div>}
              <ScenePanel clipUrl={selectedClipUrl} onStatus={setToolStatus} />
            </div>
          )}
          {/* MOTION TAB */}
          {activeTab === "motion" && (
            <div className="p-3 overflow-y-auto flex-1">
              {toolStatus && <div className="mb-2 px-2 py-1 rounded-lg text-[10px] font-bold" style={{ background: C.greenDim, color: C.green, border: `1px solid ${C.green}` }}>{toolStatus}</div>}
              <MotionPanel clipUrl={selectedClipUrl} duration={selectedClipDuration} onStatus={setToolStatus} projectId={editorProjectId} onAddClip={handleAddClip} onAddAudioTrack={handleAddAudioTrack} />
            </div>
          )}
          {/* COLOR TAB */}
          {activeTab === "color" && (
            <div className="p-3 overflow-y-auto flex-1">
              {toolStatus && <div className="mb-2 px-2 py-1 rounded-lg text-[10px] font-bold" style={{ background: C.greenDim, color: C.green, border: `1px solid ${C.green}` }}>{toolStatus}</div>}
              <ColorPanel clipUrl={selectedClipUrl} duration={selectedClipDuration} onStatus={setToolStatus} projectId={editorProjectId} onAddClip={handleAddClip} onAddAudioTrack={handleAddAudioTrack} />
            </div>
          )}
          {/* TEXT TAB */}
          {activeTab === "text" && (
            <div className="p-3 overflow-y-auto flex-1">
              {toolStatus && <div className="mb-2 px-2 py-1 rounded-lg text-[10px] font-bold" style={{ background: C.greenDim, color: C.green, border: `1px solid ${C.green}` }}>{toolStatus}</div>}
              <TextPanel clipUrl={selectedClipUrl} duration={selectedClipDuration} onStatus={setToolStatus} projectId={editorProjectId} onAddClip={handleAddClip} onAddAudioTrack={handleAddAudioTrack} />
            </div>
          )}
          {/* AUDIO TAB */}
          {activeTab === "audio" && (
            <div className="p-3 overflow-y-auto flex-1">
              {toolStatus && <div className="mb-2 px-2 py-1 rounded-lg text-[10px] font-bold" style={{ background: C.greenDim, color: C.green, border: `1px solid ${C.green}` }}>{toolStatus}</div>}
              <AudioPanel clipUrl={selectedClipUrl} onStatus={setToolStatus} projectId={editorProjectId} onAddClip={handleAddClip} onAddAudioTrack={handleAddAudioTrack} />
            </div>
          )}
          {/* FORMAT TAB */}
          {activeTab === "format" && (
            <div className="p-3 overflow-y-auto flex-1">
              {toolStatus && <div className="mb-2 px-2 py-1 rounded-lg text-[10px] font-bold" style={{ background: C.greenDim, color: C.green, border: `1px solid ${C.green}` }}>{toolStatus}</div>}
              <FormatPanel clipUrl={selectedClipUrl} duration={selectedClipDuration} onStatus={setToolStatus} projectId={editorProjectId} onAddClip={handleAddClip} onAddAudioTrack={handleAddAudioTrack} />
            </div>
          )}

          {/* TIMELINE TAB */}
          {activeTab === "timeline" && (
            <div className="flex-1 flex flex-col overflow-hidden">
              <div className="flex items-center justify-center flex-shrink-0 p-4" style={{ background: "#000", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                <div className="relative" style={{ width: "100%", maxWidth: 320, aspectRatio: "9/16", background: "#0A0A0A", borderRadius: 12, overflow: "hidden", border: "1px solid rgba(255,255,255,0.08)" }}>
                  {currentSource ? (
                    currentSource.match(/\.(mp4|mov|webm)$/i) ? <video ref={videoRef} src={currentSource} className="w-full h-full object-cover" /> : <img src={currentSource} alt="Preview" className="w-full h-full object-cover" />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center"><Film size={32} style={{ color: "#1F2937" }} /></div>
                  )}
                  <div className="absolute bottom-0 left-0 right-0 p-3 flex items-center gap-2" style={{ background: "linear-gradient(transparent, rgba(0,0,0,0.8))" }}>
                    <button onClick={() => setPlayhead(0)} className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ background: "rgba(255,255,255,0.1)" }}><SkipBack size={10} color="#fff" /></button>
                    <button onClick={() => setIsPlaying(!isPlaying)} className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: "rgba(255,255,255,0.15)" }}>{isPlaying ? <Pause size={12} color="#fff" /> : <Play size={12} color="#fff" />}</button>
                    <div className="flex-1 h-1 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.2)" }}>
                      <div className="h-full rounded-full" style={{ width: `${(playhead / totalDuration) * 100}%`, background: "#8B5CF6" }} />
                    </div>
                    <span className="text-[9px] font-mono" style={{ color: "#9CA3AF" }}>{Math.floor(playhead)}s</span>
                  </div>
                </div>
              </div>
              <div className="flex-1 overflow-auto p-3">
                <div className="flex flex-col gap-1">
                  {[0, 1, 2, 3].map(trackIndex => (
                    <div key={trackIndex} className="flex items-center gap-2">
                      <div className="flex-shrink-0 text-[9px] font-bold w-10" style={{ color: "#4B5563" }}>T{trackIndex + 1}</div>
                      <div className="flex-1 overflow-x-auto">
                        <TimelineTrack trackIndex={trackIndex} clips={clips} totalDuration={totalDuration} pixelsPerSecond={pixelsPerSecond} selectedClipId={selectedClipId} onSelectClip={setSelectedClipId} onDeleteClip={id => setClips(prev => prev.filter(c => c.id !== id))} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* PUBLISH TAB */}
          {activeTab === "publish" && (
            <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
              <div className="flex items-start justify-between gap-4 p-4 rounded-3xl" style={{ background: "linear-gradient(135deg, rgba(16,185,129,0.10), rgba(139,92,246,0.10))", border: "1px solid rgba(255,255,255,0.08)" }}>
                <div>
                  <p className="text-xs font-black tracking-widest" style={{ color: "#10B981" }}>OUTPUT COMMAND CENTER</p>
                  <h2 className="text-2xl font-black mt-1 text-white">Package every deliverable before launch.</h2>
                  <p className="text-xs mt-1 max-w-2xl" style={{ color: C.muted }}>Select the exact revenue package VaultX should prepare: master file, safe preview, PPV drop, social cutdowns, copy pack, thumbnail, calendar, and archive metadata.</p>
                </div>
                <div className="hidden md:flex flex-col items-end gap-1 text-[9px] font-black" style={{ color: C.muted }}>
                  <span>FORMAT: <b style={{ color: C.accent }}>{targetFormat}</b></span>
                  <span>MODE: <b style={{ color: C.green }}>{complianceMode.replace("_", " ").toUpperCase()}</b></span>
                  <span>WATERMARK: <b style={{ color: C.gold }}>{watermarkIdentity}</b></span>
                </div>
              </div>
              <div className="grid md:grid-cols-4 gap-2">
                {WORLD_CLASS_OUTPUTS.map(output => {
                  const Icon = output.icon as any;
                  const selected = selectedOutputPackages.includes(output.id);
                  return (
                    <button key={output.id} onClick={() => setSelectedOutputPackages(prev => selected ? prev.filter(id => id !== output.id) : [...prev, output.id])} className="p-3 rounded-2xl text-left" style={{ background: selected ? `${output.color}16` : "rgba(255,255,255,0.025)", border: `1px solid ${selected ? output.color + "55" : "rgba(255,255,255,0.06)"}` }}>
                      <div className="flex items-center justify-between mb-2"><Icon size={14} style={{ color: selected ? output.color : C.mutedLo }} />{selected && <CheckCircle size={13} style={{ color: output.color }} />}</div>
                      <p className="text-[10px] font-black" style={{ color: selected ? output.color : C.text }}>{output.label}</p>
                      <p className="text-[8px] leading-snug mt-1" style={{ color: C.muted }}>{output.desc}</p>
                    </button>
                  );
                })}
              </div>
              {variations.length > 0 && (
                <div className="flex gap-3 overflow-x-auto pb-2">
                  {variations.map((v, i) => (
                    <div key={v.variation} onClick={() => setSelectedVariation(i)} className="flex-shrink-0 flex flex-col gap-1 cursor-pointer" style={{ width: 72 }}>
                      <div className="rounded-xl overflow-hidden" style={{ aspectRatio: "9/16", background: "#0A0A0A", border: `2px solid ${selectedVariation === i ? "#10B981" : "rgba(255,255,255,0.06)"}` }}>
                        {v.url && <img src={v.url} alt={v.label} className="w-full h-full object-cover" />}
                      </div>
                      <p className="text-[8px] font-black text-center" style={{ color: selectedVariation === i ? "#10B981" : "#4B5563" }}>{v.label}</p>
                    </div>
                  ))}
                </div>
              )}
              <div className="flex flex-col gap-3 p-4 rounded-2xl" style={{ background: "rgba(16,185,129,0.05)", border: "1px solid rgba(16,185,129,0.15)" }}>
                <div className="flex flex-col gap-1">
                  <label className="text-[9px] font-black tracking-widest" style={{ color: "#6B7280" }}>TITLE</label>
                  <input value={publishTitle} onChange={e => setPublishTitle(e.target.value)} placeholder={project.title}
                    className="px-3 py-2 rounded-xl text-sm text-white" style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", outline: "none" }} />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[9px] font-black tracking-widest" style={{ color: "#6B7280" }}>ACCESS TIER</label>
                  <div className="grid grid-cols-5 gap-1">
                    {(["free", "basic", "premium", "vip", "ppv"] as const).map(tier => (
                      <button key={tier} onClick={() => setPublishTier(tier)}
                        className="py-2 rounded-xl text-[9px] font-black"
                        style={{ background: publishTier === tier ? "rgba(16,185,129,0.2)" : "rgba(255,255,255,0.04)", color: publishTier === tier ? "#10B981" : "#4B5563", border: `1px solid ${publishTier === tier ? "rgba(16,185,129,0.4)" : "rgba(255,255,255,0.06)"}` }}>
                        {tier.toUpperCase()}
                      </button>
                    ))}
                  </div>
                </div>
                {publishTier === "ppv" && (
                  <div className="flex flex-col gap-1">
                    <label className="text-[9px] font-black tracking-widest" style={{ color: "#6B7280" }}>PPV PRICE ($)</label>
                    <input type="number" value={ppvPrice} onChange={e => setPpvPrice(Number(e.target.value))} min={1} max={500}
                      className="px-3 py-2 rounded-xl text-sm text-white w-28" style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", outline: "none" }} />
                  </div>
                )}
                <button onClick={handlePublish} disabled={!sourceUrl || publishToVaultXMut.isPending}
                  className="py-3 rounded-2xl text-sm font-black flex items-center justify-center gap-2"
                  style={{ background: (!sourceUrl || publishToVaultXMut.isPending) ? "rgba(255,255,255,0.04)" : "linear-gradient(135deg, #10B981, #059669)", color: (!sourceUrl || publishToVaultXMut.isPending) ? "#374151" : "#fff" }}>
                  {publishToVaultXMut.isPending ? <><Loader2 size={14} className="animate-spin" />PUBLISHING...</> : <><Send size={14} />PUBLISH REVENUE PACKAGE</>}
                </button>
              </div>
              <div className="flex flex-col gap-3 p-4 rounded-2xl" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}>
                <p className="text-[9px] font-black tracking-widest" style={{ color: "#6B7280" }}>EXPORT FOR PLATFORMS</p>
                <div className="grid grid-cols-2 gap-2">
                  {EXPORT_PRESETS.map(preset => (
                    <button key={preset.id} onClick={() => setExportPresets(prev => prev.includes(preset.id) ? prev.filter(p => p !== preset.id) : [...prev, preset.id])}
                      className="flex items-center gap-2 p-2.5 rounded-xl text-left"
                      style={{ background: exportPresets.includes(preset.id) ? `${preset.color}15` : "rgba(255,255,255,0.03)", border: `1px solid ${exportPresets.includes(preset.id) ? preset.color + "40" : "rgba(255,255,255,0.06)"}` }}>
                      <div className="w-2 h-2 rounded-full" style={{ background: exportPresets.includes(preset.id) ? preset.color : "#374151" }} />
                      <div>
                        <p className="text-[9px] font-black" style={{ color: exportPresets.includes(preset.id) ? preset.color : "#4B5563" }}>{preset.label}</p>
                        <p className="text-[7px]" style={{ color: "#374151" }}>{preset.desc}</p>
                      </div>
                    </button>
                  ))}
                </div>
                <button onClick={async () => { const pid = await ensureProject(); const result = await exportForPlatformsMut.mutateAsync({ projectId: pid, platforms: exportPresets as any, selectedVariation: selectedVariation + 1 }); toast.success(`Export queued for ${result.platforms.length} platforms`); }}
                  disabled={exportPresets.length === 0 || exportForPlatformsMut.isPending}
                  className="py-2.5 rounded-xl text-[10px] font-black flex items-center justify-center gap-2"
                  style={{ background: "rgba(139,92,246,0.2)", color: "#8B5CF6", border: "1px solid rgba(139,92,246,0.3)" }}>
                  {exportForPlatformsMut.isPending ? <><Loader2 size={11} className="animate-spin" />EXPORTING...</> : <><Download size={11} />BUILD {selectedOutputPackages.length} OUTPUTS · EXPORT {exportPresets.length} PLATFORMS</>}
                </button>
              </div>
            </div>
          )}

          {/* CALENDAR TAB */}
          {activeTab === "calendar" && (
            <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <p className="text-xs font-black tracking-widest" style={{ color: "#F59E0B" }}>CONTENT CALENDAR</p>
                <button onClick={handleGenerateCalendar} disabled={generateContentCalendarMut.isPending}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black"
                  style={{ background: "rgba(245,158,11,0.15)", color: "#F59E0B", border: "1px solid rgba(245,158,11,0.3)" }}>
                  {generateContentCalendarMut.isPending ? <><Loader2 size={10} className="animate-spin" />GENERATING...</> : <><Calendar size={10} />GENERATE 2-WEEK PLAN</>}
                </button>
              </div>
              {contentCalendar.length > 0 ? (
                <div className="grid grid-cols-1 gap-2">
                  {contentCalendar.map((day: any, i: number) => (
                    <div key={i} className="flex gap-3 p-3 rounded-2xl" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}>
                      <div className="flex flex-col items-center justify-center flex-shrink-0 rounded-xl px-3" style={{ background: day.monetization_strategy === "ppv" ? "rgba(201,168,76,0.15)" : "rgba(139,92,246,0.1)", border: `1px solid ${day.monetization_strategy === "ppv" ? "rgba(201,168,76,0.3)" : "rgba(139,92,246,0.2)"}`, minWidth: 56 }}>
                        <span className="text-[8px] font-black" style={{ color: day.monetization_strategy === "ppv" ? "#C9A84C" : "#8B5CF6" }}>{day.day?.split(" ")[0]?.toUpperCase()}</span>
                        <span className="text-[7px]" style={{ color: "#6B7280" }}>{day.day?.split(" ").slice(1).join(" ")}</span>
                      </div>
                      <div className="flex-1 flex flex-col gap-1">
                        <div className="flex items-center gap-2">
                          <span className="text-[9px] font-black text-white">{day.theme}</span>
                          <span className="px-1.5 py-0.5 rounded-md text-[7px] font-black" style={{ background: day.content_type === "video" ? "rgba(236,72,153,0.2)" : "rgba(59,130,246,0.2)", color: day.content_type === "video" ? "#EC4899" : "#3B82F6" }}>{day.content_type?.toUpperCase()}</span>
                          {day.monetization_strategy === "ppv" && <span className="px-1.5 py-0.5 rounded-md text-[7px] font-black" style={{ background: "rgba(201,168,76,0.2)", color: "#C9A84C" }}>PPV ${day.suggested_ppv_price}</span>}
                        </div>
                        <p className="text-[8px]" style={{ color: "#6B7280" }}>{day.suggested_caption}</p>
                        <p className="text-[7px]" style={{ color: "#374151" }}>Post at {day.posting_time}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-64 gap-3">
                  <Calendar size={32} style={{ color: "#1F2937" }} />
                  <p className="text-sm font-black" style={{ color: "#374151" }}>Generate Your Content Calendar</p>
                  <p className="text-xs text-center" style={{ color: "#374151", maxWidth: 300 }}>GPT-4 creates a 2-week posting strategy with themes, captions, and monetization recommendations</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* PROJECT LIST OVERLAY */}
      {showProjectList && (
        <div className="absolute inset-0 z-50 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.85)", backdropFilter: "blur(12px)" }}>
          <div className="flex flex-col overflow-hidden rounded-2xl" style={{ width: 460, maxHeight: "70vh", background: "#0A0A0A", border: "1px solid rgba(255,255,255,0.08)" }}>
            <div className="flex items-center justify-between p-4" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
              <p className="text-sm font-black text-white">My Projects</p>
              <button onClick={() => setShowProjectList(false)} className="w-7 h-7 rounded-xl flex items-center justify-center" style={{ background: "rgba(255,255,255,0.06)", color: "#9CA3AF" }}><X size={12} /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-2">
              {myProjectsQ.isLoading ? (
                <div className="flex items-center justify-center py-8"><Loader2 size={20} className="animate-spin" style={{ color: "#6B7280" }} /></div>
              ) : (myProjectsQ.data as any)?.projects?.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 gap-2"><Film size={24} style={{ color: "#1F2937" }} /><p className="text-sm" style={{ color: "#374151" }}>No projects yet</p></div>
              ) : (myProjectsQ.data as any)?.projects?.map((p: any) => (
                <button key={p.id} onClick={() => { setProjectId(p.id); setProject({ title: p.title, projectType: p.project_type, aspectRatio: p.aspect_ratio || "9:16", durationSeconds: p.duration_seconds || 60 }); if (p.source_url) setSourceUrl(p.source_url); if (p.output_url) setCurrentSource(p.output_url); setShowProjectList(false); toast.success(`Loaded: ${p.title}`); }}
                  className="flex items-center gap-3 p-3 rounded-xl text-left" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: "rgba(139,92,246,0.15)", border: "1px solid rgba(139,92,246,0.3)" }}><Film size={18} style={{ color: "#8B5CF6" }} /></div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-white truncate">{p.title}</p>
                    <p className="text-xs" style={{ color: "#6B7280" }}>{p.project_type} · {new Date(p.created_at).toLocaleDateString()}</p>
                  </div>
                  {p.output_url && <CheckCircle size={14} style={{ color: "#22C55E" }} />}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
