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
import { VaultXLogo, VaultXWorkflow } from "@/components/vaultx/VaultXBrand";

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

const BODY_CINEMA_ENGINE_LANES = [
  {
    id: "revenue_read",
    label: "Revenue Read",
    value: "Find the money in the raw shot",
    icon: Target,
    color: C.pink,
    copy: "Reads posture, framing, lighting, motion, and crop potential so a normal creator clip becomes a deliberate subscriber asset instead of a raw upload.",
  },
  {
    id: "angle_director",
    label: "Angle Director",
    value: "Reframe the body, not just the video",
    icon: Crosshair,
    color: C.accent,
    copy: "Builds a body-first shot map: wide context, torso/hip/leg focus, hand or motion detail, face reaction, and premium reveal timing.",
  },
  {
    id: "tease_gate",
    label: "Tease Gate",
    value: "Separate preview from payoff",
    icon: Lock,
    color: C.green,
    copy: "Creates public-safe teasers that sell the fantasy without giving away the unlock moment, then keeps the strongest frames for paid fans.",
  },
  {
    id: "money_pack",
    label: "Money Pack",
    value: "Turn one clip into a launch",
    icon: DollarSign,
    color: C.gold,
    copy: "Packages master, teaser, cover frame, captions, DM pitch, Telegram drop, platform exports, and reuse notes around one sellable body-cinema concept.",
  },
] as const;

const BODY_CINEMA_CUT_BLUEPRINT = [
  { time: "0.0-1.5s", label: "Hook Frame", directive: "Open on the strongest silhouette, motion, or attitude cue; remove dead setup before the body value appears.", monetization: "Scroll stop" },
  { time: "1.5-4.0s", label: "Body Lock", directive: "Push the crop toward the sellable zones while preserving context, confidence, and creator identity.", monetization: "Subscriber curiosity" },
  { time: "4.0-7.0s", label: "Angle Shift", directive: "Change zoom, speed, or crop path so the viewer feels a directed scene rather than one static phone shot.", monetization: "Retention lift" },
  { time: "7.0-10.0s", label: "Tease Gate", directive: "Cut or crop before the paid payoff; reserve the clearest unlock frame for the full PPV or VIP version.", monetization: "Click-to-unlock" },
] as const;

const BODY_CINEMA_MONEY_PACKS = [
  { label: "VIP Master", output: "Full premium cut", price: "$15-$49", detail: "Body-first master with polished color, pacing, and subscriber-only reveal logic." },
  { label: "Paid Teaser", output: "8-12 second preview", price: "CTA asset", detail: "Public-safe or platform-safe preview that sells the unlock without leaking the payoff." },
  { label: "Angle Clips", output: "3-5 focus cuts", price: "Bundle ammo", detail: "Short body-zone clips for DM followups, Telegram drops, and repostable subscriber hooks." },
  { label: "Sales Kit", output: "Cover + copy + tags", price: "Launch ready", detail: "Thumbnail frame, PPV title, mass message, urgency line, and archive metadata." },
] as const;



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
interface BodyCinemaEnginePayload {
  heatScore?: number;
  primaryRegion?: string;
  secondaryRegion?: string;
  mediaProfile?: any;
  topRegions?: any[];
  scoredRegions?: any[];
  engineLanes?: any[];
  dynamicCutBlueprint?: any[];
  moneyPacks?: any[];
  reframeSuggestions?: any[];
  platformLaunchPlan?: any[];
  teaserGate?: any;
  scenePositioning?: string;
  complianceGuardrails?: string[];
}
interface BodyMap {
  regions_detected: Record<string, BodyRegionData>;
  strongest_assets: string[];
  body_type: string;
  pose: string;
  monetization_potential: number;
  body_cinema?: BodyCinemaEnginePayload;
  dynamic_cut_blueprint?: any[];
  money_packs?: any[];
  reframe_suggestions?: any[];
  region_scores?: Record<string, any>;
}
interface ContentAnalysis {
  content_type: string;
  lighting_quality: number;
  image_quality: number;
  strongest_assets: string[];
  pricing_recommendation: number;
  skin_tone_detected: string;
  monetization_potential: number;
  body_cinema?: BodyCinemaEnginePayload;
  body_cinema_heat_score?: number;
  dynamic_cut_blueprint?: any[];
  money_packs?: any[];
  reframe_suggestions?: any[];
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
  const [watermarkText, setWatermarkText] = React.useState("@VaultXCreator");
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
                placeholder="@VaultXCreator" />
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
  const utils = trpc.useUtils();
  const projectsQ = trpc.vaultx.getMyEditorProjects.useQuery(undefined, { retry: false });
  const createProjectMut = trpc.vaultx.createEditorProject.useMutation();
  const analyzeMut = trpc.vaultx.analyzeContent.useMutation();
  const enhancePhotoMut = trpc.vaultx.enhancePhoto.useMutation();
  const enhanceVideoMut = trpc.vaultx.enhanceVideo.useMutation();
  const captionMut = trpc.vaultx.generateCaption.useMutation();
  const exportMut = trpc.vaultx.exportForPlatforms.useMutation();
  const publishMut = trpc.vaultx.publishToVaultX.useMutation();
  const bodyCinemaMut = trpc.vaultx.createBodyCinemaCollection.useMutation();

  const [projectId, setProjectId] = useState<number | null>(null);
  const [projectName, setProjectName] = useState('VIP Friday Drop');
  const [assetKind, setAssetKind] = useState<'photo' | 'video' | 'reel' | 'photo_set'>('photo');
  const [sourceUrl, setSourceUrl] = useState('');
  const [intensity, setIntensity] = useState<'subtle' | 'natural' | 'enhanced' | 'cinematic'>('cinematic');
  const [captionStyle, setCaptionStyle] = useState<'teaser' | 'explicit' | 'romantic' | 'dominant' | 'playful'>('teaser');
  const [backgroundStyle, setBackgroundStyle] = useState<'keep' | 'penthouse' | 'yacht' | 'rose_bed' | 'dark_studio' | 'miami_villa' | 'private_jet'>('keep');
  const [selectedPlatforms, setSelectedPlatforms] = useState<Array<'onlyfans' | 'telegram_teaser' | 'instagram_sfw' | 'tiktok' | 'twitter' | 'master'>>(['master', 'onlyfans', 'telegram_teaser']);
  const [selectedRegions, setSelectedRegions] = useState<Array<'bust' | 'abdomen' | 'glutes' | 'legs' | 'full'>>(['full']);
  const [ppvPrice, setPpvPrice] = useState(24);
  const [publishTitle, setPublishTitle] = useState('VIP Friday Drop');
  const [analysis, setAnalysis] = useState<any>(null);
  const [enhancement, setEnhancement] = useState<any>(null);
  const [captions, setCaptions] = useState<any>(null);
  const [exports, setExports] = useState<any>(null);
  const [bodyCinema, setBodyCinema] = useState<any>(null);
  const [published, setPublished] = useState<any>(null);
  const [softLaunchRunning, setSoftLaunchRunning] = useState(false);
  const [softLaunchSummary, setSoftLaunchSummary] = useState<any>(null);
  const [activeStep, setActiveStep] = useState<'ingest' | 'enhance' | 'package' | 'publish'>('ingest');

  const sourceIsReady = /^https?:\/\/.+\..+/.test(sourceUrl.trim());
  const currentProjectId = projectId;
  const isBusy = softLaunchRunning || createProjectMut.isPending || analyzeMut.isPending || enhancePhotoMut.isPending || enhanceVideoMut.isPending || captionMut.isPending || exportMut.isPending || publishMut.isPending || bodyCinemaMut.isPending;

  const platformOptions: Array<{ id: 'onlyfans' | 'telegram_teaser' | 'instagram_sfw' | 'tiktok' | 'twitter' | 'master'; label: string; detail: string }> = [
    { id: 'master', label: 'Master', detail: 'archive quality' },
    { id: 'onlyfans', label: 'OnlyFans', detail: 'paid post / PPV' },
    { id: 'telegram_teaser', label: 'Telegram', detail: 'teaser funnel' },
    { id: 'instagram_sfw', label: 'Instagram', detail: 'platform-safe' },
    { id: 'tiktok', label: 'TikTok', detail: 'vertical hook' },
    { id: 'twitter', label: 'X / Twitter', detail: 'traffic post' },
  ];

  const readiness = [
    { label: 'Project', ready: !!currentProjectId, detail: currentProjectId ? `#${currentProjectId}` : 'create or select' },
    { label: 'Source asset', ready: sourceIsReady, detail: sourceIsReady ? 'valid URL' : 'paste direct media URL' },
    { label: 'Analysis', ready: !!analysis, detail: analysis ? `${analysis.image_quality || analysis.overall_score || 'AI'} score` : 'run Vision scan' },
    { label: 'Enhancement', ready: !!enhancement, detail: enhancement ? 'pipeline queued' : 'choose polish level' },
    { label: 'Captions', ready: !!captions, detail: captions ? 'sales copy ready' : 'generate hook set' },
    { label: 'Exports', ready: !!exports, detail: exports ? `${Object.keys(exports.exportUrls || exports.exports || {}).length || selectedPlatforms.length} lanes` : 'package outputs' },
  ];
  const readyCount = readiness.filter(item => item.ready).length;
  const readinessPct = Math.round((readyCount / readiness.length) * 100);

  const recentProjects = ((projectsQ.data as any)?.projects || []).slice(0, 6);

  const ensureProject = async () => {
    if (projectId) return projectId;
    const projectType = assetKind === 'photo' ? 'photo_set' : assetKind;
    const result = await createProjectMut.mutateAsync({
      projectName: projectName.trim() || 'VaultX Revenue Drop',
      projectType: projectType as 'video' | 'photo_set' | 'reel',
      sourceFiles: sourceUrl.trim() ? [sourceUrl.trim()] : [],
    });
    const id = Number((result as any).projectId);
    setProjectId(id);
    await utils.vaultx.getMyEditorProjects.invalidate();
    toast.success('VaultX project created');
    return id;
  };

  const runAnalysis = async () => {
    if (!sourceIsReady) return toast.error('Paste a direct image or video URL first.');
    try {
      const id = await ensureProject();
      const result = await analyzeMut.mutateAsync({ sourceUrl: sourceUrl.trim(), projectType: assetKind, projectId: id });
      setAnalysis((result as any).analysis || result);
      setActiveStep('enhance');
      toast.success('Asset analysis complete');
    } catch (error: any) {
      toast.error(error?.message || 'Analysis failed');
    }
  };

  const runEnhancement = async () => {
    if (!sourceIsReady) return toast.error('Paste a direct image or video URL first.');
    try {
      const id = await ensureProject();
      const result = assetKind === 'video' || assetKind === 'reel'
        ? await enhanceVideoMut.mutateAsync({ projectId: id, sourceUrl: sourceUrl.trim(), enhancementIntensity: intensity, enableSlowMotion: true, enableAudio: false, audioMood: 'sensual' })
        : await enhancePhotoMut.mutateAsync({ projectId: id, sourceUrl: sourceUrl.trim(), enhancementIntensity: intensity, backgroundStyle, skinTone: 'medium' });
      setEnhancement(result);
      setActiveStep('package');
      toast.success('Enhancement pipeline started');
    } catch (error: any) {
      toast.error(error?.message || 'Enhancement failed');
    }
  };

  const runCaptionPack = async () => {
    try {
      const id = await ensureProject();
      const result = await captionMut.mutateAsync({ projectId: id, captionStyle });
      setCaptions((result as any).captions || result);
      toast.success('Caption pack generated');
    } catch (error: any) {
      toast.error(error?.message || 'Caption generation failed');
    }
  };

  const runExports = async () => {
    try {
      const id = await ensureProject();
      const result = await exportMut.mutateAsync({ projectId: id, platforms: selectedPlatforms, selectedVariation: 1 });
      setExports(result);
      setActiveStep('publish');
      toast.success('Export package queued');
    } catch (error: any) {
      toast.error(error?.message || 'Export packaging failed');
    }
  };

  const runBodyCinema = async () => {
    if (!sourceIsReady) return toast.error('Paste a direct media URL first.');
    try {
      const id = await ensureProject();
      const result = await bodyCinemaMut.mutateAsync({
        projectId: id,
        collectionName: projectName.trim() || 'VaultX Body Cinema Drop',
        sourceAssetUrl: sourceUrl.trim(),
        selectedRegions,
        cinematicStyle: backgroundStyle === 'dark_studio' ? 'noir' : backgroundStyle === 'penthouse' ? 'penthouse' : 'luxury',
        platforms: ['vaultx', 'onlyfans', 'telegram'],
        ppvPriceCents: Math.max(3, ppvPrice) * 100,
      });
      setBodyCinema(result);
      toast.success('Body Cinema sales package created');
    } catch (error: any) {
      toast.error(error?.message || 'Body Cinema packaging failed');
    }
  };

  const runPublish = async () => {
    try {
      const id = await ensureProject();
      const result = await publishMut.mutateAsync({
        projectId: id,
        selectedVariation: 1,
        accessTier: 'ppv',
        ppvPrice,
        title: publishTitle.trim() || projectName.trim() || 'VaultX PPV Drop',
        description: 'Packaged in VaultX with teaser, caption, paid unlock, and platform export lanes.',
        tags: ['vaultx', 'ppv', 'vip', 'creator-drop'],
      });
      setPublished(result);
      toast.success('Published to VaultX');
    } catch (error: any) {
      toast.error(error?.message || 'Publish failed');
    }
  };

  const runSoftLaunchSprint = async () => {
    const demoSourceUrl = typeof window !== 'undefined'
      ? `${window.location.origin}/videos/vaultx-cinematic-trailer.mp4`
      : '/videos/vaultx-cinematic-trailer.mp4';
    const finalSourceUrl = sourceIsReady ? sourceUrl.trim() : demoSourceUrl;
    const finalProjectName = projectName.trim() || 'VaultX 60 Second Soft Launch Demo';
    const finalTitle = publishTitle.trim() || finalProjectName;
    const launchPlatforms: Array<'master' | 'instagram_sfw' | 'tiktok' | 'twitter' | 'telegram_teaser' | 'onlyfans'> = ['master', 'instagram_sfw', 'tiktok', 'twitter', 'telegram_teaser', 'onlyfans'];

    setSoftLaunchRunning(true);
    setSoftLaunchSummary(null);
    try {
      setProjectName(finalProjectName);
      setPublishTitle(finalTitle);
      setAssetKind('reel');
      setSourceUrl(finalSourceUrl);
      setIntensity('cinematic');
      setCaptionStyle('teaser');
      setBackgroundStyle('dark_studio');
      setSelectedPlatforms(launchPlatforms);
      setActiveStep('ingest');

      const created = projectId || Number((await createProjectMut.mutateAsync({
        projectName: finalProjectName,
        projectType: 'reel',
        sourceFiles: [finalSourceUrl],
      }) as any).projectId);
      setProjectId(created);
      await utils.vaultx.getMyEditorProjects.invalidate();

      toast.message('Soft-launch sprint started', { description: 'Building one demo output path: analysis, polish, captions, exports, and VaultX launch record.' });

      const analysisResult = await analyzeMut.mutateAsync({ sourceUrl: finalSourceUrl, projectType: 'reel', projectId: created });
      setAnalysis((analysisResult as any).analysis || analysisResult);
      setActiveStep('enhance');

      const enhancementResult = await enhanceVideoMut.mutateAsync({
        projectId: created,
        sourceUrl: finalSourceUrl,
        enhancementIntensity: 'cinematic',
        enableSlowMotion: true,
        enableAudio: true,
        audioMood: 'luxury',
      });
      setEnhancement(enhancementResult);
      setActiveStep('package');

      const captionResult = await captionMut.mutateAsync({ projectId: created, captionStyle: 'teaser' });
      setCaptions((captionResult as any).captions || captionResult);

      const exportResult = await exportMut.mutateAsync({ projectId: created, platforms: launchPlatforms, selectedVariation: 1 });
      setExports(exportResult);

      const publishResult = await publishMut.mutateAsync({
        projectId: created,
        selectedVariation: 1,
        accessTier: 'ppv',
        ppvPrice,
        title: finalTitle,
        description: 'Emergency VaultX soft-launch output: one creator asset converted into a teaser, paid-drop pitch, caption pack, and multi-platform export bundle.',
        tags: ['vaultx', 'soft-launch', 'creator-output', 'demo'],
      });
      setPublished(publishResult);
      setActiveStep('publish');
      setSoftLaunchSummary({ projectId: created, sourceUrl: finalSourceUrl, platforms: launchPlatforms, exports: exportResult, published: publishResult });
      toast.success('Soft-launch output built');
    } catch (error: any) {
      toast.error(error?.message || 'Soft-launch sprint failed');
      setSoftLaunchSummary({ error: error?.message || 'Soft-launch sprint failed', sourceUrl: finalSourceUrl });
    } finally {
      setSoftLaunchRunning(false);
    }
  };

  const togglePlatform = (platform: typeof selectedPlatforms[number]) => {
    setSelectedPlatforms(current => current.includes(platform) ? current.filter(item => item !== platform) : [...current, platform]);
  };

  const toggleRegion = (region: typeof selectedRegions[number]) => {
    setSelectedRegions(current => current.includes(region) ? current.filter(item => item !== region) : [...current, region]);
  };

  const analysisHighlights = analysis ? [
    { label: 'Content type', value: analysis.content_type || assetKind },
    { label: 'Image quality', value: analysis.image_quality ? `${analysis.image_quality}/10` : 'pending' },
    { label: 'Lighting', value: analysis.lighting_quality ? `${analysis.lighting_quality}/10` : 'pending' },
    { label: 'Best asset', value: (analysis.strongest_assets || analysis.detected_regions || ['not ranked'])[0] },
  ] : [];

  return (
    <div className="min-h-screen pt-24 pb-20 px-4" style={{ background: C.bg, color: C.text }}>
      <div className="fixed inset-0 pointer-events-none opacity-70" style={{ background: `radial-gradient(circle at 20% 10%, ${C.accentDim}, transparent 34%), radial-gradient(circle at 80% 0%, ${C.pinkDim}, transparent 30%), radial-gradient(circle at 50% 100%, rgba(245,158,11,0.12), transparent 36%)` }} />
      <div className="relative z-10 mx-auto max-w-7xl space-y-8">
        <section className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr] items-stretch">
          <div className="rounded-[2rem] p-6 md:p-8" style={{ background: 'linear-gradient(145deg, rgba(17,17,17,0.96), rgba(5,5,5,0.98))', border: `1px solid ${C.borderHi}`, boxShadow: '0 30px 120px rgba(0,0,0,0.6)' }}>
            <div className="flex flex-wrap items-center gap-3 mb-6">
              <VaultXLogo size="md" />
              <span className="px-3 py-1 rounded-full text-[10px] font-black tracking-[0.28em] uppercase" style={{ background: C.goldDim, border: '1px solid rgba(245,158,11,0.28)', color: C.gold }}>60-second launch output</span>
              <a href="/vault-x/studio?mode=clone-tour-factory" className="px-3 py-1 rounded-full text-[10px] font-black tracking-[0.24em] uppercase" style={{ background: C.accentDim, border: '1px solid rgba(139,92,246,0.28)', color: '#C4B5FD' }}>Clone Factory</a>
            </div>
            <h1 className="text-4xl md:text-6xl font-black tracking-tight leading-[0.95] max-w-4xl">
              One creator asset in. One launch-ready teaser, paid drop, and export bundle out.
            </h1>
            <p className="mt-5 max-w-3xl text-base md:text-lg leading-relaxed" style={{ color: '#B8B8C6' }}>
              This is the soft-launch lane: paste one direct clip or run the built-in demo asset, then VaultX analyzes the hook, queues cinematic polish, writes the sales copy, packages social exports, and creates a VaultX launch record. No tool maze. No theory. One output path.
            </p>
            <div className="mt-6 grid gap-3 md:grid-cols-[1fr_auto]">
              <button onClick={runSoftLaunchSprint} disabled={isBusy} className="rounded-2xl px-5 py-4 text-sm font-black flex items-center justify-center gap-2 disabled:opacity-45" style={{ background: `linear-gradient(135deg, ${C.gold}, ${C.pink})`, color: '#12060B', boxShadow: '0 18px 50px rgba(245,158,11,0.22)' }}>
                {softLaunchRunning ? <Loader2 className="animate-spin" size={17} /> : <Zap size={17} />}
                {softLaunchRunning ? 'Building soft-launch output...' : 'Build the soft-launch demo output'}
              </button>
              <a href="/vault-x/studio?mode=ai-video-generator#pollo" className="rounded-2xl px-5 py-4 text-center text-sm font-black" style={{ background: C.accentDim, border: '1px solid rgba(139,92,246,0.28)', color: '#DDD6FE' }}>Pollo scene generator</a>
            </div>
            {softLaunchSummary ? (
              <div className="mt-4 rounded-2xl p-4 text-sm" style={{ background: softLaunchSummary.error ? C.redDim : C.greenDim, border: `1px solid ${softLaunchSummary.error ? 'rgba(239,68,68,0.28)' : 'rgba(16,185,129,0.28)'}`, color: softLaunchSummary.error ? '#FECACA' : '#BBF7D0' }}>
                <p className="font-black">{softLaunchSummary.error ? 'Sprint needs attention' : `Soft-launch output ready for project #${softLaunchSummary.projectId}`}</p>
                <p className="mt-1 opacity-80">{softLaunchSummary.error || 'Generated analysis, cinematic polish task, copy pack, export package, and VaultX publish record from the selected source.'}</p>
              </div>
            ) : null}
            <div className="mt-8 grid gap-3 sm:grid-cols-4">
              {[['01', 'Ingest', 'URL + brief'], ['02', 'Analyze', 'quality + angles'], ['03', 'Package', 'captions + exports'], ['04', 'Launch', 'VaultX + funnels']].map(([num, label, detail]) => (
                <div key={label} className="rounded-2xl p-4" style={{ background: 'rgba(255,255,255,0.035)', border: '1px solid rgba(255,255,255,0.08)' }}>
                  <p className="text-[10px] font-black tracking-[0.22em]" style={{ color: C.gold }}>{num}</p>
                  <p className="mt-2 text-sm font-black text-white">{label}</p>
                  <p className="text-xs" style={{ color: C.muted }}>{detail}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[2rem] p-6 flex flex-col justify-between" style={{ background: 'rgba(10,10,10,0.9)', border: `1px solid ${C.borderHi}` }}>
            <div>
              <div className="flex items-center justify-between mb-4">
                <p className="text-xs font-black tracking-[0.25em] uppercase" style={{ color: C.muted }}>Drop readiness</p>
                <span className="text-3xl font-black" style={{ color: readinessPct >= 70 ? C.green : C.gold }}>{readinessPct}%</span>
              </div>
              <div className="h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.08)' }}>
                <div className="h-full rounded-full" style={{ width: `${readinessPct}%`, background: `linear-gradient(90deg, ${C.accent}, ${C.pink}, ${C.gold})` }} />
              </div>
              <div className="mt-5 grid gap-2">
                {readiness.map(item => (
                  <div key={item.label} className="flex items-center justify-between rounded-2xl px-3 py-3" style={{ background: item.ready ? 'rgba(16,185,129,0.08)' : 'rgba(255,255,255,0.03)', border: `1px solid ${item.ready ? 'rgba(16,185,129,0.22)' : 'rgba(255,255,255,0.07)'}` }}>
                    <div className="flex items-center gap-3">
                      {item.ready ? <CheckCircle size={15} style={{ color: C.green }} /> : <Clock size={15} style={{ color: C.muted }} />}
                      <div><p className="text-sm font-bold text-white">{item.label}</p><p className="text-[11px]" style={{ color: C.muted }}>{item.detail}</p></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="mt-6 grid grid-cols-1 gap-3">
              <button onClick={runSoftLaunchSprint} disabled={isBusy} className="rounded-2xl px-4 py-3 text-center text-xs font-black flex items-center justify-center gap-2 disabled:opacity-45" style={{ background: C.goldDim, border: '1px solid rgba(245,158,11,0.28)', color: '#FDE68A' }}>{softLaunchRunning ? <Loader2 className="animate-spin" size={14} /> : <Zap size={14} />} Build one output now</button>
              <a href="/vault-x/studio?mode=clone-tour-factory" className="rounded-2xl px-4 py-3 text-center text-xs font-black" style={{ background: C.accentDim, border: '1px solid rgba(139,92,246,0.28)', color: '#DDD6FE' }}>Plan clone-host demo</a>
            </div>
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-[0.85fr_1.15fr]">
          <div className="space-y-6">
            <div className="rounded-[1.75rem] p-5" style={{ background: C.surface, border: `1px solid ${C.border}` }}>
              <div className="flex items-center gap-3 mb-5"><Upload size={18} style={{ color: C.accent }} /><h2 className="text-lg font-black">1. Source and brief</h2></div>
              <div className="space-y-4">
                <label className="block"><span className="text-[11px] font-black tracking-[0.2em] uppercase" style={{ color: C.muted }}>Drop name</span><input value={projectName} onChange={e => { setProjectName(e.target.value); setPublishTitle(e.target.value); }} className="mt-2 w-full rounded-2xl px-4 py-3 bg-black text-white outline-none" style={{ border: `1px solid ${C.borderHi}` }} /></label>
                <label className="block"><span className="text-[11px] font-black tracking-[0.2em] uppercase" style={{ color: C.muted }}>Direct image/video URL</span><input value={sourceUrl} onChange={e => setSourceUrl(e.target.value)} placeholder="https://..." className="mt-2 w-full rounded-2xl px-4 py-3 bg-black text-white outline-none" style={{ border: `1px solid ${sourceIsReady ? 'rgba(16,185,129,0.35)' : C.borderHi}` }} /></label>
                <div className="grid grid-cols-4 gap-2">
                  {(['photo', 'video', 'reel', 'photo_set'] as const).map(kind => <button key={kind} onClick={() => setAssetKind(kind)} className="rounded-2xl py-3 text-xs font-black" style={{ background: assetKind === kind ? C.accentDim : 'rgba(255,255,255,0.035)', border: `1px solid ${assetKind === kind ? 'rgba(139,92,246,0.4)' : 'rgba(255,255,255,0.08)'}`, color: assetKind === kind ? '#DDD6FE' : C.muted }}>{kind.replace('_', ' ').toUpperCase()}</button>)}
                </div>
                <button onClick={runAnalysis} disabled={!sourceIsReady || isBusy} className="w-full rounded-2xl py-4 text-sm font-black flex items-center justify-center gap-2 disabled:opacity-45" style={{ background: `linear-gradient(135deg, ${C.accent}, ${C.pink})`, color: 'white' }}>{analyzeMut.isPending ? <Loader2 className="animate-spin" size={16} /> : <Brain size={16} />} Analyze asset</button>
              </div>
            </div>

            <div className="rounded-[1.75rem] p-5" style={{ background: C.surface, border: `1px solid ${C.border}` }}>
              <div className="flex items-center gap-3 mb-5"><Sparkles size={18} style={{ color: C.pink }} /><h2 className="text-lg font-black">2. AI polish lane</h2></div>
              <div className="grid grid-cols-2 gap-2 mb-4">
                {(['subtle', 'natural', 'enhanced', 'cinematic'] as const).map(item => <button key={item} onClick={() => setIntensity(item)} className="rounded-2xl py-3 text-xs font-black" style={{ background: intensity === item ? C.pinkDim : 'rgba(255,255,255,0.035)', border: `1px solid ${intensity === item ? 'rgba(236,72,153,0.35)' : 'rgba(255,255,255,0.08)'}`, color: intensity === item ? '#FBCFE8' : C.muted }}>{item.toUpperCase()}</button>)}
              </div>
              <select value={backgroundStyle} onChange={e => setBackgroundStyle(e.target.value as any)} className="w-full rounded-2xl px-4 py-3 bg-black text-white outline-none mb-4" style={{ border: `1px solid ${C.borderHi}` }}>
                {['keep', 'penthouse', 'yacht', 'rose_bed', 'dark_studio', 'miami_villa', 'private_jet'].map(style => <option key={style} value={style}>{style.replace('_', ' ').toUpperCase()}</option>)}
              </select>
              <button onClick={runEnhancement} disabled={!sourceIsReady || isBusy} className="w-full rounded-2xl py-4 text-sm font-black flex items-center justify-center gap-2 disabled:opacity-45" style={{ background: C.pinkDim, border: '1px solid rgba(236,72,153,0.35)', color: '#FBCFE8' }}>{enhancePhotoMut.isPending || enhanceVideoMut.isPending ? <Loader2 className="animate-spin" size={16} /> : <Wand2 size={16} />} Queue enhancement</button>
            </div>
          </div>

          <div className="rounded-[1.75rem] p-5" style={{ background: C.surface, border: `1px solid ${C.border}` }}>
            <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
              <div><p className="text-[11px] font-black tracking-[0.25em] uppercase" style={{ color: C.gold }}>Output builder</p><h2 className="text-2xl font-black">Package the money outputs</h2></div>
              <div className="flex gap-2">{(['ingest', 'enhance', 'package', 'publish'] as const).map(step => <button key={step} onClick={() => setActiveStep(step)} className="px-3 py-2 rounded-xl text-[10px] font-black" style={{ background: activeStep === step ? C.goldDim : 'rgba(255,255,255,0.035)', color: activeStep === step ? '#FDE68A' : C.muted, border: `1px solid ${activeStep === step ? 'rgba(245,158,11,0.32)' : 'rgba(255,255,255,0.07)'}` }}>{step.toUpperCase()}</button>)}</div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-2xl p-4" style={{ background: 'rgba(0,0,0,0.38)', border: '1px solid rgba(255,255,255,0.08)' }}>
                <p className="text-sm font-black mb-3">Analysis board</p>
                {analysisHighlights.length ? <div className="grid gap-2">{analysisHighlights.map(item => <div key={item.label} className="flex justify-between gap-3 text-sm"><span style={{ color: C.muted }}>{item.label}</span><span className="font-bold text-white text-right">{String(item.value)}</span></div>)}</div> : <p className="text-sm leading-relaxed" style={{ color: C.muted }}>Run analysis to see quality, strongest selling angles, caption direction, and suggested export plan.</p>}
                {analysis?.enhancement_recommendations?.length ? <div className="mt-4 space-y-2">{analysis.enhancement_recommendations.slice(0, 4).map((rec: string, i: number) => <div key={i} className="rounded-xl px-3 py-2 text-xs" style={{ background: 'rgba(139,92,246,0.08)', color: '#DDD6FE' }}>{rec}</div>)}</div> : null}
              </div>

              <div className="rounded-2xl p-4" style={{ background: 'rgba(0,0,0,0.38)', border: '1px solid rgba(255,255,255,0.08)' }}>
                <p className="text-sm font-black mb-3">Visual preview</p>
                <div className="aspect-[4/5] rounded-2xl overflow-hidden flex items-center justify-center" style={{ background: 'linear-gradient(145deg, rgba(139,92,246,0.12), rgba(236,72,153,0.10))', border: '1px solid rgba(255,255,255,0.08)' }}>
                  {sourceIsReady ? assetKind === 'video' || assetKind === 'reel' ? <video src={sourceUrl} className="w-full h-full object-cover" controls muted /> : <img src={sourceUrl} className="w-full h-full object-cover" alt="VaultX source preview" /> : <div className="text-center p-6"><Camera size={30} className="mx-auto mb-3" style={{ color: C.muted }} /><p className="text-sm" style={{ color: C.muted }}>Paste a direct asset URL to preview it here.</p></div>}
                </div>
              </div>
            </div>

            <div className="mt-5 grid gap-4 lg:grid-cols-3">
              <div className="rounded-2xl p-4" style={{ background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.18)' }}>
                <p className="text-sm font-black mb-3" style={{ color: '#FDE68A' }}>Captions</p>
                <select value={captionStyle} onChange={e => setCaptionStyle(e.target.value as any)} className="w-full rounded-xl px-3 py-2 bg-black text-white outline-none mb-3" style={{ border: `1px solid ${C.borderHi}` }}>
                  {['teaser', 'explicit', 'romantic', 'dominant', 'playful'].map(style => <option key={style} value={style}>{style.toUpperCase()}</option>)}
                </select>
                <button onClick={runCaptionPack} disabled={!currentProjectId && !sourceIsReady || isBusy} className="w-full rounded-xl py-3 text-xs font-black disabled:opacity-45" style={{ background: C.goldDim, color: '#FDE68A', border: '1px solid rgba(245,158,11,0.26)' }}>{captionMut.isPending ? 'GENERATING...' : 'Generate copy pack'}</button>
                {captions ? <div className="mt-3 text-xs leading-relaxed" style={{ color: '#FDE68A' }}>{String(captions.teaser || captions.subscriber || captions.ppv_pitch || 'Caption package generated.').slice(0, 180)}</div> : null}
              </div>

              <div className="rounded-2xl p-4" style={{ background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.18)' }}>
                <p className="text-sm font-black mb-3" style={{ color: '#BBF7D0' }}>Exports</p>
                <div className="grid grid-cols-2 gap-2 mb-3">{platformOptions.map(option => <button key={option.id} onClick={() => togglePlatform(option.id)} className="rounded-xl p-2 text-left" style={{ background: selectedPlatforms.includes(option.id) ? 'rgba(16,185,129,0.14)' : 'rgba(255,255,255,0.035)', border: `1px solid ${selectedPlatforms.includes(option.id) ? 'rgba(16,185,129,0.32)' : 'rgba(255,255,255,0.07)'}` }}><span className="block text-[10px] font-black" style={{ color: selectedPlatforms.includes(option.id) ? '#BBF7D0' : C.muted }}>{option.label}</span><span className="block text-[9px]" style={{ color: C.muted }}>{option.detail}</span></button>)}</div>
                <button onClick={runExports} disabled={!currentProjectId && !sourceIsReady || isBusy || !selectedPlatforms.length} className="w-full rounded-xl py-3 text-xs font-black disabled:opacity-45" style={{ background: C.greenDim, color: '#BBF7D0', border: '1px solid rgba(16,185,129,0.26)' }}>{exportMut.isPending ? 'PACKAGING...' : 'Package exports'}</button>
              </div>

              <div className="rounded-2xl p-4" style={{ background: 'rgba(236,72,153,0.06)', border: '1px solid rgba(236,72,153,0.18)' }}>
                <p className="text-sm font-black mb-3" style={{ color: '#FBCFE8' }}>Body Cinema package</p>
                <div className="grid grid-cols-5 gap-1 mb-3">{(['bust', 'abdomen', 'glutes', 'legs', 'full'] as const).map(region => <button key={region} onClick={() => toggleRegion(region)} className="rounded-lg py-2 text-[9px] font-black" style={{ background: selectedRegions.includes(region) ? C.pinkDim : 'rgba(255,255,255,0.035)', color: selectedRegions.includes(region) ? '#FBCFE8' : C.muted, border: `1px solid ${selectedRegions.includes(region) ? 'rgba(236,72,153,0.32)' : 'rgba(255,255,255,0.07)'}` }}>{region.slice(0, 3).toUpperCase()}</button>)}</div>
                <label className="block mb-3"><span className="text-[10px] font-black" style={{ color: C.muted }}>PPV price</span><input type="number" min={3} max={500} value={ppvPrice} onChange={e => setPpvPrice(Number(e.target.value || 3))} className="mt-1 w-full rounded-xl px-3 py-2 bg-black text-white outline-none" style={{ border: `1px solid ${C.borderHi}` }} /></label>
                <button onClick={runBodyCinema} disabled={!sourceIsReady || isBusy || !selectedRegions.length} className="w-full rounded-xl py-3 text-xs font-black disabled:opacity-45" style={{ background: C.pinkDim, color: '#FBCFE8', border: '1px solid rgba(236,72,153,0.26)' }}>{bodyCinemaMut.isPending ? 'BUILDING...' : 'Build sales package'}</button>
              </div>
            </div>

            <div className="mt-5 rounded-2xl p-4" style={{ background: 'rgba(255,255,255,0.035)', border: '1px solid rgba(255,255,255,0.08)' }}>
              <div className="flex flex-col md:flex-row gap-3 md:items-end">
                <label className="flex-1"><span className="text-[11px] font-black tracking-[0.2em] uppercase" style={{ color: C.muted }}>Publish title</span><input value={publishTitle} onChange={e => setPublishTitle(e.target.value)} className="mt-2 w-full rounded-2xl px-4 py-3 bg-black text-white outline-none" style={{ border: `1px solid ${C.borderHi}` }} /></label>
                <button onClick={runPublish} disabled={!currentProjectId || isBusy} className="rounded-2xl px-8 py-4 text-sm font-black flex items-center justify-center gap-2 disabled:opacity-45" style={{ background: `linear-gradient(135deg, ${C.gold}, ${C.pink})`, color: 'white' }}>{publishMut.isPending ? <Loader2 className="animate-spin" size={16} /> : <Send size={16} />} Publish to VaultX</button>
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-3">
          <div className="rounded-[1.75rem] p-5 lg:col-span-2" style={{ background: C.surface, border: `1px solid ${C.border}` }}>
            <div className="flex items-center justify-between mb-4"><h2 className="text-lg font-black">Output receipts</h2><span className="text-xs" style={{ color: C.muted }}>Shows what each backend call returned.</span></div>
            <div className="grid gap-3 md:grid-cols-2">
              {[{ label: 'Enhancement', data: enhancement }, { label: 'Captions', data: captions }, { label: 'Exports', data: exports }, { label: 'Body Cinema', data: bodyCinema }, { label: 'Published', data: published }].map(item => (
                <div key={item.label} className="rounded-2xl p-4 min-h-[120px]" style={{ background: 'rgba(0,0,0,0.38)', border: `1px solid ${item.data ? 'rgba(16,185,129,0.22)' : 'rgba(255,255,255,0.07)'}` }}>
                  <p className="text-sm font-black mb-2">{item.label}</p>
                  <pre className="text-[10px] leading-relaxed whitespace-pre-wrap overflow-hidden" style={{ color: item.data ? '#BBF7D0' : C.muted }}>{item.data ? JSON.stringify(item.data, null, 2).slice(0, 650) : 'Not generated yet.'}</pre>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[1.75rem] p-5" style={{ background: C.surface, border: `1px solid ${C.border}` }}>
            <div className="flex items-center justify-between mb-4"><h2 className="text-lg font-black">Recent VaultX projects</h2>{projectsQ.isFetching ? <Loader2 size={14} className="animate-spin" style={{ color: C.muted }} /> : null}</div>
            <div className="space-y-2">
              {recentProjects.length ? recentProjects.map((project: any) => (
                <button key={project.id} onClick={() => { setProjectId(Number(project.id)); setProjectName(project.project_name || project.title || 'VaultX project'); setPublishTitle(project.project_name || project.title || 'VaultX project'); }} className="w-full rounded-2xl p-3 text-left" style={{ background: Number(project.id) === projectId ? C.accentDim : 'rgba(255,255,255,0.035)', border: `1px solid ${Number(project.id) === projectId ? 'rgba(139,92,246,0.32)' : 'rgba(255,255,255,0.07)'}` }}>
                  <p className="text-sm font-bold text-white truncate">{project.project_name || project.title || `Project #${project.id}`}</p>
                  <p className="text-[11px]" style={{ color: C.muted }}>{project.project_type || 'vaultx'} · {project.status || 'draft'}</p>
                </button>
              )) : <p className="text-sm leading-relaxed" style={{ color: C.muted }}>Create your first project above. Existing projects will appear here after login.</p>}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
