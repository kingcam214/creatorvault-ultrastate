/**
 * ============================================================================
 * VAULTX VIDEO EDITOR — REBUILT
 * ============================================================================
 * The most powerful adult creator video editing platform.
 * Creators never need to leave. Every tool goes maximum depth.
 * Visual-first, no forms, cinematic UI.
 * ============================================================================
 */
import { useMemo, useRef, useState } from "react";
import { useParams, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { toast } from "sonner";
import {
  Loader2, Flame, ArrowLeft, Save, Download, Lock, Scissors,
  Sparkles, Type, Volume2, Palette, Film, Star, Shield, Zap,
  Eye, EyeOff, Clock, AlertTriangle, Clapperboard, Layers,
  Play, Pause, SkipBack, SkipForward, Maximize2, ChevronRight,
  ChevronDown, Wand2, Camera, Music, Mic, Radio, Crown,
  TrendingUp, Target, Crosshair, Droplets, Sun, Moon, Wind,
  Aperture, Contrast, Sliders, RotateCcw, Crop, Move,
  AlignCenter, AlignLeft, AlignRight, Bold, Italic, Hash,
  DollarSign, Users, Share2, Upload, Check, X, Plus, Minus,
  Settings, Info, RefreshCw, Gauge, Layers2, ScanLine,
  Blend, Eraser, Paintbrush, Feather, Sparkle,
} from "lucide-react";
import MediaPanel from "@/components/videoeditor/MediaPanel";
import VideoPreview from "@/components/videoeditor/VideoPreview";
import ControlsPanel from "@/components/videoeditor/ControlsPanel";
import Timeline from "@/components/videoeditor/Timeline";
import { useVideoEditor } from "@/hooks/useVideoEditor";

// ─── VaultX Color System ──────────────────────────────────────────────────────
const C = {
  bg:        "#08000A",
  surface:   "#110012",
  surfaceHi: "#1A0020",
  surfaceMid:"#150018",
  border:    "rgba(180,0,80,0.18)",
  borderHi:  "rgba(220,38,100,0.6)",
  accent:    "#E8005A",
  accentDim: "rgba(232,0,90,0.12)",
  accentGlow:"rgba(232,0,90,0.25)",
  gold:      "#F59E0B",
  goldDim:   "rgba(245,158,11,0.15)",
  purple:    "#9333EA",
  purpleDim: "rgba(147,51,234,0.15)",
  cyan:      "#06B6D4",
  green:     "#10B981",
  text:      "#F8F0FF",
  muted:     "#9B8AAA",
  mutedLo:   "#5A4A6A",
};

// ─── Tool Categories ──────────────────────────────────────────────────────────
const TOOL_CATEGORIES = [
  {
    id: "ppv",
    label: "PPV & Monetize",
    icon: DollarSign,
    color: C.gold,
    glow: C.goldDim,
    desc: "Turn clips into revenue",
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
    id: "censor",
    label: "SFW / Censor",
    icon: Shield,
    color: C.purple,
    glow: C.purpleDim,
    desc: "Platform-safe versions",
    tools: [
      { id: "censor-smart", label: "Smart Body Censor",   icon: ScanLine,  desc: "AI detects regions, applies mosaic/blur automatically" },
      { id: "censor-face",  label: "Face Blur / Mask",    icon: EyeOff,    desc: "Blur, pixelate, or mask faces — full or partial" },
      { id: "censor-region",label: "Region Censor",       icon: Crop,      desc: "Draw censor zones manually, animate them" },
      { id: "censor-mosaic",label: "Mosaic Pixelate",     icon: Layers2,   desc: "Japanese-style mosaic censor with intensity control" },
      { id: "censor-bar",   label: "Black Bar Censor",    icon: Minus,     desc: "Classic black bar with custom width/angle" },
      { id: "censor-sticker",label: "Emoji / Sticker",    icon: Sparkles,  desc: "Place animated emoji/sticker over regions" },
      { id: "censor-export",label: "Platform SFW Export", icon: Download,  desc: "Auto-comply for Instagram, TikTok, X, Reddit" },
    ],
  },
  {
    id: "scene",
    label: "Scene & Story",
    icon: Clapperboard,
    color: "#F97316",
    glow: "rgba(249,115,22,0.15)",
    desc: "Cut, sequence, and structure",
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
    id: "motion",
    label: "Motion & Speed",
    icon: Zap,
    color: "#EC4899",
    glow: "rgba(236,72,153,0.15)",
    desc: "Slow-mo, speed ramps, freeze",
    tools: [
      { id: "motion-slowmo",    label: "Slow Motion",       icon: Gauge,     desc: "RIFE AI 120fps interpolation — buttery smooth" },
      { id: "motion-ramp",      label: "Speed Ramp",        icon: TrendingUp,desc: "Fast → slow → fast, keyframe speed curve" },
      { id: "motion-freeze",    label: "Freeze Frame",      icon: Pause,     desc: "Freeze on a specific frame with duration control" },
      { id: "motion-timelapse", label: "Timelapse",         icon: SkipForward,desc: "Speed up 2x–100x with motion blur" },
      { id: "motion-reverse",   label: "Reverse",           icon: RotateCcw, desc: "Play clip backwards, with or without audio" },
      { id: "motion-stutter",   label: "Stutter Cut",       icon: Radio,     desc: "Rhythmic stutter effect synced to beat" },
      { id: "motion-zoom",      label: "Punch Zoom",        icon: Maximize2, desc: "Animated zoom into a specific region" },
      { id: "motion-shake",     label: "Camera Shake",      icon: Move,      desc: "Cinematic handheld shake — intensity + frequency" },
    ],
  },
  {
    id: "color",
    label: "Color & Look",
    icon: Palette,
    color: C.cyan,
    glow: "rgba(6,182,212,0.15)",
    desc: "Grades, LUTs, skin tones",
    tools: [
      { id: "color-lut",       label: "Cinematic LUTs",    icon: Film,      desc: "30+ pro LUTs: Moody, Warm, Neon, Dark, Skin-optimized" },
      { id: "color-grade",     label: "Manual Grade",      icon: Sliders,   desc: "Lift/Gamma/Gain, Hue/Sat/Lum, shadows/mids/highs" },
      { id: "color-skin",      label: "Skin Tone Enhance", icon: Sun,       desc: "AI skin detection — warm, smooth, glow, tan" },
      { id: "color-vignette",  label: "Vignette",          icon: Aperture,  desc: "Cinematic edge darkening with shape control" },
      { id: "color-glow",      label: "Glow / Bloom",      icon: Sparkle,   desc: "Soft light bloom — dreamy, neon, or subtle" },
      { id: "color-contrast",  label: "Contrast & Clarity",icon: Contrast,  desc: "Punch, dehaze, texture, clarity sliders" },
      { id: "color-night",     label: "Night / Low Light",  icon: Moon,      desc: "Denoise, brighten shadows, reduce grain" },
      { id: "color-match",     label: "Color Match",        icon: Droplets,  desc: "Match color grade from a reference clip" },
    ],
  },
  {
    id: "text",
    label: "Text & Captions",
    icon: Type,
    color: "#06B6D4",
    glow: "rgba(6,182,212,0.15)",
    desc: "Burn-in, subtitles, overlays",
    tools: [
      { id: "text-auto",       label: "Auto Captions",     icon: Wand2,     desc: "AI speech-to-text, styled subtitles, auto-timed" },
      { id: "text-burn",       label: "Burn-In Text",      icon: Type,      desc: "Custom text, font, color, position, animation" },
      { id: "text-lower3rd",   label: "Lower Thirds",      icon: AlignLeft, desc: "Creator name, handle, CTA — animated in/out" },
      { id: "text-kinetic",    label: "Kinetic Text",      icon: Zap,       desc: "Word-by-word animated captions (TikTok style)" },
      { id: "text-emoji",      label: "Emoji Overlay",     icon: Sparkles,  desc: "Animated emoji with physics — bounce, spin, float" },
      { id: "text-cta",        label: "CTA Overlay",       icon: Target,    desc: "Subscribe, DM me, Link in bio — animated buttons" },
      { id: "text-watermark",  label: "Watermark",         icon: Hash,      desc: "Username/logo watermark — opacity, position, size" },
      { id: "text-ticker",     label: "Ticker / Marquee",  icon: AlignCenter,desc: "Scrolling text ticker at top or bottom" },
    ],
  },
  {
    id: "audio",
    label: "Audio & Music",
    icon: Volume2,
    color: C.green,
    glow: "rgba(16,185,129,0.15)",
    desc: "Mix, music, voice, SFX",
    tools: [
      { id: "audio-music",     label: "Music Library",     icon: Music,     desc: "Royalty-free music — mood, BPM, genre selector" },
      { id: "audio-voice",     label: "Voice Enhance",     icon: Mic,       desc: "Denoise, EQ, compress, de-ess, reverb remove" },
      { id: "audio-ducking",   label: "Auto Ducking",      icon: Volume2,   desc: "Music auto-ducks under voice — broadcast quality" },
      { id: "audio-fade",      label: "Fade In / Out",     icon: Wind,      desc: "Audio fade with curve control" },
      { id: "audio-sfx",       label: "Sound Effects",     icon: Radio,     desc: "Whoosh, impact, notification, moans, music stings" },
      { id: "audio-pitch",     label: "Pitch / Voice FX",  icon: Sliders,   desc: "Pitch shift, voice changer, reverb, echo" },
      { id: "audio-sync",      label: "Beat Sync",         icon: Gauge,     desc: "Auto-cut clips to beat of music track" },
      { id: "audio-normalize", label: "Normalize / Levels",icon: Contrast,  desc: "LUFS normalize, peak limit, stereo width" },
    ],
  },
  {
    id: "format",
    label: "Format & Export",
    icon: Download,
    color: C.accent,
    glow: C.accentDim,
    desc: "Platform-ready in one click",
    tools: [
      { id: "format-onlyfans",  label: "OnlyFans",         icon: Crown,     desc: "1080p MP4, H.264, max 4GB, 60fps" },
      { id: "format-fansly",    label: "Fansly",           icon: Star,      desc: "1080p MP4, H.264, max 2GB" },
      { id: "format-manyvids",  label: "ManyVids",         icon: Film,      desc: "4K MP4, H.264, max 10GB" },
      { id: "format-instagram", label: "Instagram Reel",   icon: Camera,    desc: "1080×1920, 60s max, H.264" },
      { id: "format-tiktok",    label: "TikTok",           icon: Music,     desc: "1080×1920, 10min max, H.264" },
      { id: "format-twitter",   label: "Twitter/X",        icon: Share2,    desc: "720p, 512MB max, 2:20 max" },
      { id: "format-reddit",    label: "Reddit",           icon: Users,     desc: "1080p, 1GB max, H.264" },
      { id: "format-telegram",  label: "Telegram",         icon: Upload,    desc: "1080p, 2GB max, optimized for mobile" },
      { id: "format-4k",        label: "4K Master",        icon: Maximize2, desc: "4K UHD, H.265, lossless quality" },
      { id: "format-gif",       label: "Animated GIF",     icon: Sparkles,  desc: "Optimized GIF for previews/teasers" },
    ],
  },
];

const HERO_TEMPLATES = [
  {
    id: "template-ppv-smart",
    title: "Smart PPV Teaser",
    category: "ppv",
    toolId: "ppv-smart",
    thumbnail: "PPV",
    description: "Auto-pick a monetizable 30s segment, add teaser treatment, and generate two variants.",
    config: { teaserLen: 30, blurEnd: true, blurIntensity: 18, addWatermark: true, priceBadge: true },
  },
  {
    id: "template-censor-preview",
    title: "Censored Preview",
    category: "censor",
    toolId: "censor-smart",
    thumbnail: "SFW",
    description: "Generate a platform-safe censored preview with blur or mosaic styling.",
    config: { censorType: "blur", intensity: 20, livePreview: true },
  },
  {
    id: "template-scene-detect",
    title: "AI Scene Detect",
    category: "scene",
    toolId: "scene-detect",
    thumbnail: "SCN",
    description: "Detect scenes, render a reorder strip, and regenerate a new sequence.",
    config: { threshold: 30, minSceneLen: 15, thumbnails: true },
  },
  {
    id: "template-speed-ramp",
    title: "Speed Ramp",
    category: "motion",
    toolId: "motion-ramp",
    thumbnail: "SPD",
    description: "Apply a 3-point fast-slow-fast ramp and push the processed result back into the canvas.",
    config: { curve: [1.6, 0.55, 1.8], mode: "3-point" },
  },
  {
    id: "template-cinematic-look",
    title: "Cinematic Look",
    category: "color",
    toolId: "color-lut",
    thumbnail: "LUT",
    description: "Apply seeded premium looks with visible preview changes and stored outputs.",
    config: { preset: "midnight-neon", presetCount: 5 },
  },
  {
    id: "template-auto-captions",
    title: "Auto Captions Burn-In",
    category: "text",
    toolId: "text-auto",
    thumbnail: "CAP",
    description: "Generate speech captions, apply a premium style, and burn subtitles into video.",
    config: { style: "subtitle", styles: 3, burnIn: true },
  },
  {
    id: "template-music-bed",
    title: "Music Bed + Ducking",
    category: "audio",
    toolId: "audio-music",
    thumbnail: "AUD",
    description: "Add a library music bed, auto-duck under speech, and preview the mix.",
    config: { mood: "sensual", ducking: true, previewMix: true },
  },
  {
    id: "template-platform-export",
    title: "OnlyFans + TikTok Export",
    category: "format",
    toolId: "format-onlyfans",
    thumbnail: "EXP",
    description: "Generate two real exports in one action and publish them into the Outputs area.",
    config: { outputs: ["onlyfans", "tiktok"], formats: ["landscape", "vertical"] },
  },
] as const;

type HeroTemplate = typeof HERO_TEMPLATES[number];

type OutputAsset = {
  id: string | number;
  file_url: string;
  thumbnail_url?: string | null;
  duration_seconds?: number | null;
  asset_type?: string;
  metadata?: any;
  created_at?: string;
};

type PersistOutputInput = {
  fileUrl: string;
  assetType: "video" | "audio" | "image";
  displayName: string;
  toolId: string;
  toolLabel: string;
  toolBadge: string;
  durationSeconds?: number;
  fileSizeBytes?: number;
  thumbnailUrl?: string;
  metadata?: Record<string, any>;
};

function useVaultxOutputStore(projectId: string, onAddClip: (asset: any) => void, onAddAudioTrack: (asset: any) => void) {
  const utils = trpc.useUtils();
  const createAsset = trpc.creatorVideoEditor.createAsset.useMutation();

  const persistOutput = async (input: PersistOutputInput) => {
    const result = await createAsset.mutateAsync({
      projectId,
      assetType: input.assetType,
      fileUrl: input.fileUrl,
      thumbnailUrl: input.thumbnailUrl,
      fileSizeBytes: input.fileSizeBytes,
      durationSeconds: input.durationSeconds,
      metadata: {
        source: "vaultx",
        isVaultxOutput: true,
        displayName: input.displayName,
        toolId: input.toolId,
        toolLabel: input.toolLabel,
        toolBadge: input.toolBadge,
        fileName: input.displayName,
        ...(input.metadata ?? {}),
      },
    });

    const asset = {
      id: result.assetId,
      file_url: input.fileUrl,
      thumbnail_url: input.thumbnailUrl,
      asset_type: input.assetType,
      duration_seconds: input.durationSeconds,
      file_size_bytes: input.fileSizeBytes,
      metadata: {
        source: "vaultx",
        isVaultxOutput: true,
        displayName: input.displayName,
        toolId: input.toolId,
        toolLabel: input.toolLabel,
        toolBadge: input.toolBadge,
        fileName: input.displayName,
        ...(input.metadata ?? {}),
      },
    };

    if (input.assetType === "audio") onAddAudioTrack(asset);
    else if (input.assetType === "video") onAddClip(asset);

    await Promise.all([
      utils.creatorVideoEditor.getAssets.invalidate({ projectId, assetType: input.assetType }),
      utils.creatorVideoEditor.getAssets.invalidate({ projectId, assetType: "video" }),
      utils.creatorVideoEditor.getRenders.invalidate({ projectId }),
    ]);

    return asset;
  };

  return {
    persistOutput,
    isPersisting: createAsset.isPending,
  };
}

// ─── Active Tool Panel Components ─────────────────────────────────────────────

function PPVPanel({ clipUrl, duration, onStatus, projectId, onAddClip, onAddAudioTrack }: { clipUrl: string; duration: number; onStatus: (s: string) => void; projectId: string; onAddClip: (asset: any) => void; onAddAudioTrack: (asset: any) => void }) {
  const [activeSub, setActiveSub] = useState("ppv-smart");
  const [teaserLen, setTeaserLen] = useState(30);
  const [blurEnd, setBlurEnd] = useState(true);
  const [blurIntensity, setBlurIntensity] = useState(18);
  const [addWatermark, setAddWatermark] = useState(true);
  const [watermarkText, setWatermarkText] = useState("@VaultX");
  const [addCountdown, setAddCountdown] = useState(false);
  const [price, setPrice] = useState("$9.99");
  const [busy, setBusy] = useState(false);

  const cat = TOOL_CATEGORIES.find(c => c.id === "ppv")!;
  const { persistOutput, isPersisting } = useVaultxOutputStore(projectId, onAddClip, onAddAudioTrack);

  const run = async () => {
    if (!clipUrl) { toast.error("Select a clip first"); return; }
    setBusy(true);
    try {
      if (activeSub === "ppv-smart" || activeSub === "ppv-custom") {
        const sourceBlob = await fetch(clipUrl).then(r => r.blob());
        const teaserDuration = Math.min(teaserLen, duration || teaserLen);

        const trimFd = new FormData();
        trimFd.append("video", sourceBlob, "clip.mp4");
        trimFd.append("start", "0");
        trimFd.append("end", String(teaserDuration));
        const trimRes = await fetch("/api/video-studio/trim", { method: "POST", body: trimFd });
        const trimData = await trimRes.json();
        if (!trimRes.ok) throw new Error(trimData.error || "Trim failed");

        let cleanUrl = trimData.url as string;
        if (addWatermark) {
          const watermarkFd = new FormData();
          watermarkFd.append("video", await fetch(cleanUrl).then(r => r.blob()), "teaser.mp4");
          watermarkFd.append("text", watermarkText || "@VaultX");
          const watermarkRes = await fetch("/api/video-studio/watermark", { method: "POST", body: watermarkFd });
          const watermarkData = await watermarkRes.json();
          if (watermarkRes.ok && watermarkData.url) cleanUrl = watermarkData.url;
        }

        await persistOutput({
          fileUrl: cleanUrl,
          assetType: "video",
          displayName: `Smart PPV Teaser ${teaserLen}s — Clean`,
          toolId: activeSub,
          toolLabel: "Smart PPV Teaser",
          toolBadge: "PPV",
          durationSeconds: teaserDuration,
          metadata: { variant: "clean", blurEnd, blurIntensity, addWatermark, watermarkText },
        });

        const teaseFd = new FormData();
        teaseFd.append("video", await fetch(trimData.url).then(r => r.blob()), "teaser.mp4");
        teaseFd.append("filter", blurEnd ? "ppv_censor" : "pixelate");
        teaseFd.append("intensity", String(blurIntensity));
        teaseFd.append("mode", blurEnd ? "blur" : "mosaic");
        const teaseRes = await fetch("/api/video-studio/filter", { method: "POST", body: teaseFd });
        const teaseData = await teaseRes.json();
        if (!teaseRes.ok) throw new Error(teaseData.error || "Teaser variant failed");

        let teaseUrl = teaseData.url as string;
        if (price) {
          const priceFd = new FormData();
          priceFd.append("video", await fetch(teaseUrl).then(r => r.blob()), "teaser-variant.mp4");
          priceFd.append("text", `PPV ${price}`);
          priceFd.append("style", "subtitle");
          priceFd.append("position", "top");
          priceFd.append("start", "0");
          priceFd.append("end", String(Math.min(teaserDuration, 5)));
          priceFd.append("fontSize", "58");
          const priceRes = await fetch("/api/video-studio/add-text", { method: "POST", body: priceFd });
          const priceData = await priceRes.json();
          if (priceRes.ok && priceData.url) teaseUrl = priceData.url;
        }

        await persistOutput({
          fileUrl: teaseUrl,
          assetType: "video",
          displayName: `Smart PPV Teaser ${teaserLen}s — Tease`,
          toolId: `${activeSub}-variant`,
          toolLabel: "Smart PPV Teaser",
          toolBadge: "PPV",
          durationSeconds: teaserDuration,
          metadata: { variant: "tease", blurEnd, blurIntensity, price, addCountdown },
        });

        onStatus(`Smart PPV teaser generated with 2 stored variants`);
        toast.success(`PPV teaser ready — 2 variants added to outputs`);
      } else if (activeSub === "ppv-price-tag") {
        const fd = new FormData();
        const blob = await fetch(clipUrl).then(r => r.blob());
        fd.append("video", blob, "clip.mp4");
        fd.append("text", `PPV — ${price}`);
        fd.append("style", "subtitle");
        fd.append("position", "top");
        fd.append("start", "0");
        fd.append("end", String(Math.min(duration, 5)));
        fd.append("fontSize", "64");
        const res = await fetch("/api/video-studio/add-text", { method: "POST", body: fd });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed");
        onStatus("Price tag overlay added");
        toast.success("Price tag burned in");
        window.open(data.url, "_blank");
      } else {
        toast.info("Select a clip and use Smart PPV Teaser or Custom Teaser");
      }
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Sub-tool selector */}
      <div className="grid grid-cols-2 gap-1.5">
        {cat.tools.map(t => {
          const Icon = t.icon;
          const active = activeSub === t.id;
          return (
            <button key={t.id} onClick={() => setActiveSub(t.id)}
              className="p-2.5 rounded-xl text-left transition-all"
              style={{
                background: active ? C.goldDim : C.surfaceHi,
                border: `1px solid ${active ? C.gold : C.border}`,
              }}>
              <div className="flex items-center gap-1.5 mb-0.5">
                <Icon className="w-3 h-3" style={{ color: active ? C.gold : C.muted }} />
                <span className="text-[10px] font-bold" style={{ color: active ? C.gold : C.text }}>{t.label}</span>
              </div>
              <p className="text-[9px] leading-tight" style={{ color: C.mutedLo }}>{t.desc}</p>
            </button>
          );
        })}
      </div>

      {/* Controls for active sub-tool */}
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
                    style={{
                      background: teaserLen === d ? C.goldDim : C.surface,
                      border: `1px solid ${teaserLen === d ? C.gold : C.border}`,
                      color: teaserLen === d ? C.gold : C.muted,
                    }}>{d}s</button>
                ))}
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-semibold" style={{ color: C.muted }}>Blur Ending</span>
              <button onClick={() => setBlurEnd(p => !p)}
                className="w-10 h-5 rounded-full transition-all relative"
                style={{ background: blurEnd ? C.gold : C.surfaceMid, border: `1px solid ${blurEnd ? C.gold : C.border}` }}>
                <div className="absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all"
                  style={{ left: blurEnd ? "calc(100% - 18px)" : "2px" }} />
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
              <button onClick={() => setAddWatermark(p => !p)}
                className="w-10 h-5 rounded-full transition-all relative"
                style={{ background: addWatermark ? C.gold : C.surfaceMid, border: `1px solid ${addWatermark ? C.gold : C.border}` }}>
                <div className="absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all"
                  style={{ left: addWatermark ? "calc(100% - 18px)" : "2px" }} />
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
                  style={{
                    background: price === p ? C.goldDim : C.surface,
                    border: `1px solid ${price === p ? C.gold : C.border}`,
                    color: price === p ? C.gold : C.muted,
                  }}>{p}</button>
              ))}
            </div>
          </div>
        )}
      </div>

      <button onClick={run} disabled={busy || isPersisting}
        className="w-full py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all"
        style={{ background: `linear-gradient(135deg, ${C.gold}, #D97706)`, color: "#000" }}>
        {(busy || isPersisting) ? <Loader2 className="w-4 h-4 animate-spin" /> : <DollarSign className="w-4 h-4" />}
        {(busy || isPersisting) ? "Processing..." : "Generate PPV Asset"}
      </button>
    </div>
  );
}

function CensorPanel({ clipUrl, duration, onStatus, projectId, onAddClip, onAddAudioTrack }: { clipUrl: string; duration: number; onStatus: (s: string) => void; projectId: string; onAddClip: (asset: any) => void; onAddAudioTrack: (asset: any) => void }) {
  const [activeSub, setActiveSub] = useState("censor-smart");
  const [censorType, setCensorType] = useState<"blur" | "mosaic" | "bar" | "emoji">("blur");
  const [intensity, setIntensity] = useState(20);
  const [platform, setPlatform] = useState("instagram");
  const [busy, setBusy] = useState(false);
  const cat = TOOL_CATEGORIES.find(c => c.id === "censor")!;
  const { persistOutput, isPersisting } = useVaultxOutputStore(projectId, onAddClip, onAddAudioTrack);

  const run = async () => {
    if (!clipUrl) { toast.error("Select a clip first"); return; }
    setBusy(true);
    try {
      const fd = new FormData();
      const blob = await fetch(clipUrl).then(r => r.blob());
      fd.append("video", blob, "clip.mp4");
      fd.append("filter", censorType === "mosaic" ? "pixelate" : "blur");
      fd.append("intensity", String(intensity));
      const res = await fetch("/api/video-studio/filter", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Censor failed");
      await persistOutput({
        fileUrl: data.url,
        assetType: "video",
        displayName: `Smart Body Censor — ${censorType}`,
        toolId: activeSub,
        toolLabel: "Smart Body Censor",
        toolBadge: "SFW",
        durationSeconds: duration || undefined,
        metadata: { censorType, intensity, platform },
      });
      onStatus(`${censorType} censor applied and stored`);
      toast.success("Censored version added to outputs");
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-1.5">
        {cat.tools.map(t => {
          const Icon = t.icon;
          const active = activeSub === t.id;
          return (
            <button key={t.id} onClick={() => setActiveSub(t.id)}
              className="p-2.5 rounded-xl text-left transition-all"
              style={{ background: active ? C.purpleDim : C.surfaceHi, border: `1px solid ${active ? C.purple : C.border}` }}>
              <div className="flex items-center gap-1.5 mb-0.5">
                <Icon className="w-3 h-3" style={{ color: active ? C.purple : C.muted }} />
                <span className="text-[10px] font-bold" style={{ color: active ? C.purple : C.text }}>{t.label}</span>
              </div>
              <p className="text-[9px] leading-tight" style={{ color: C.mutedLo }}>{t.desc}</p>
            </button>
          );
        })}
      </div>

      <div className="space-y-3 p-3 rounded-xl" style={{ background: C.surfaceHi, border: `1px solid ${C.border}` }}>
        <div>
          <span className="text-[10px] font-semibold block mb-2" style={{ color: C.muted }}>Censor Style</span>
          <div className="grid grid-cols-2 gap-1">
            {[
              { id: "blur", label: "Gaussian Blur" },
              { id: "mosaic", label: "Mosaic / Pixelate" },
              { id: "bar", label: "Black Bar" },
              { id: "emoji", label: "Emoji / Sticker" },
            ].map(s => (
              <button key={s.id} onClick={() => setCensorType(s.id as any)}
                className="py-1.5 rounded-lg text-[10px] font-semibold transition-all"
                style={{
                  background: censorType === s.id ? C.purpleDim : C.surface,
                  border: `1px solid ${censorType === s.id ? C.purple : C.border}`,
                  color: censorType === s.id ? C.purple : C.muted,
                }}>{s.label}</button>
            ))}
          </div>
        </div>
        <div>
          <div className="flex justify-between mb-1">
            <span className="text-[10px]" style={{ color: C.muted }}>Intensity</span>
            <span className="text-[10px] font-mono" style={{ color: C.purple }}>{intensity}</span>
          </div>
          <Slider value={[intensity]} onValueChange={([v]) => setIntensity(v)} min={5} max={50} step={1} />
        </div>
        {activeSub === "censor-export" && (
          <div>
            <span className="text-[10px] font-semibold block mb-1" style={{ color: C.muted }}>Target Platform</span>
            <div className="grid grid-cols-2 gap-1">
              {["instagram", "tiktok", "twitter", "reddit"].map(p => (
                <button key={p} onClick={() => setPlatform(p)}
                  className="py-1 rounded-lg text-[10px] font-semibold capitalize transition-all"
                  style={{
                    background: platform === p ? C.purpleDim : C.surface,
                    border: `1px solid ${platform === p ? C.purple : C.border}`,
                    color: platform === p ? C.purple : C.muted,
                  }}>{p}</button>
              ))}
            </div>
          </div>
        )}
      </div>

      <button onClick={run} disabled={busy || isPersisting}
        className="w-full py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all"
        style={{ background: `linear-gradient(135deg, ${C.purple}, #7C3AED)`, color: "#fff" }}>
        {(busy || isPersisting) ? <Loader2 className="w-4 h-4 animate-spin" /> : <Shield className="w-4 h-4" />}
        {(busy || isPersisting) ? "Processing..." : "Apply Censor"}
      </button>
    </div>
  );
}

function ScenePanel({ clipUrl, onStatus }: { clipUrl: string; onStatus: (s: string) => void }) {
  const [activeSub, setActiveSub] = useState("scene-detect");
  const [threshold, setThreshold] = useState(30);
  const [transition, setTransition] = useState("dissolve");
  const [busy, setBusy] = useState(false);
  const [sceneStrip, setSceneStrip] = useState<any[]>([]);
  const cat = TOOL_CATEGORIES.find(c => c.id === "scene")!;

  const moveScene = (index: number, direction: -1 | 1) => {
    setSceneStrip(prev => {
      const nextIndex = index + direction;
      if (nextIndex < 0 || nextIndex >= prev.length) return prev;
      const next = [...prev];
      [next[index], next[nextIndex]] = [next[nextIndex], next[index]];
      return next;
    });
  };

  const detectScenesMutation = trpc.mediaCore.detectScenes.useMutation({
    onSuccess: (data: any) => {
      const scenes = Array.isArray(data?.scenes) ? data.scenes : [];
      setSceneStrip(scenes);
      const count = scenes.length;
      onStatus(`${count} scenes detected`);
      toast.success(`${count} scenes detected — reorder the strip or regenerate`);
      setBusy(false);
    },
    onError: (err: any) => { toast.error(err.message); setBusy(false); },
  });

  const run = async () => {
    if (!clipUrl) { toast.error("Select a clip first"); return; }
    setBusy(true);
    if (activeSub === "scene-detect" || activeSub === "scene-reorder" || activeSub === "scene-transition") {
      const videoPath = clipUrl.startsWith("/") ? clipUrl : new URL(clipUrl).pathname;
      detectScenesMutation.mutate({ videoPath, threshold, minSceneLen: 15 });
    } else if (activeSub === "scene-loop") {
      try {
        const fd = new FormData();
        const blob = await fetch(clipUrl).then(r => r.blob());
        fd.append("video", blob, "clip.mp4");
        fd.append("filter", "loop");
        const res = await fetch("/api/video-studio/filter", { method: "POST", body: fd });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Loop failed");
        onStatus("Loop created");
        toast.success("Seamless loop ready");
        setBusy(false);
      } catch (e: any) { toast.error(e.message); setBusy(false); }
    } else {
      toast.info("Select a clip and use AI Scene Detect");
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-1.5">
        {cat.tools.map(t => {
          const Icon = t.icon;
          const active = activeSub === t.id;
          return (
            <button key={t.id} onClick={() => setActiveSub(t.id)}
              className="p-2.5 rounded-xl text-left transition-all"
              style={{ background: active ? "rgba(249,115,22,0.12)" : C.surfaceHi, border: `1px solid ${active ? "#F97316" : C.border}` }}>
              <div className="flex items-center gap-1.5 mb-0.5">
                <Icon className="w-3 h-3" style={{ color: active ? "#F97316" : C.muted }} />
                <span className="text-[10px] font-bold" style={{ color: active ? "#F97316" : C.text }}>{t.label}</span>
              </div>
              <p className="text-[9px] leading-tight" style={{ color: C.mutedLo }}>{t.desc}</p>
            </button>
          );
        })}
      </div>

      <div className="space-y-3 p-3 rounded-xl" style={{ background: C.surfaceHi, border: `1px solid ${C.border}` }}>
        {(activeSub === "scene-detect" || activeSub === "scene-reorder") && (
          <div>
            <div className="flex justify-between mb-1">
              <span className="text-[10px] font-semibold" style={{ color: C.muted }}>Detection Sensitivity</span>
              <span className="text-[10px] font-mono" style={{ color: "#F97316" }}>{threshold}</span>
            </div>
            <Slider value={[threshold]} onValueChange={([v]) => setThreshold(v)} min={10} max={60} step={5} />
            <div className="flex justify-between mt-1">
              <span className="text-[9px]" style={{ color: C.mutedLo }}>More cuts</span>
              <span className="text-[9px]" style={{ color: C.mutedLo }}>Fewer cuts</span>
            </div>
          </div>
        )}
        {activeSub === "scene-transition" && (
          <div>
            <span className="text-[10px] font-semibold block mb-2" style={{ color: C.muted }}>Transition Type</span>
            <div className="grid grid-cols-2 gap-1">
              {["dissolve", "wipe", "flash", "glitch", "burn", "zoom"].map(t => (
                <button key={t} onClick={() => setTransition(t)}
                  className="py-1.5 rounded-lg text-[10px] font-semibold capitalize transition-all"
                  style={{
                    background: transition === t ? "rgba(249,115,22,0.12)" : C.surface,
                    border: `1px solid ${transition === t ? "#F97316" : C.border}`,
                    color: transition === t ? "#F97316" : C.muted,
                  }}>{t}</button>
              ))}
            </div>
          </div>
        )}

        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-semibold" style={{ color: C.muted }}>Scene Strip</span>
            <button onClick={() => run()} className="text-[10px] font-semibold px-2 py-1 rounded-lg" style={{ color: "#F97316", border: `1px solid rgba(249,115,22,0.35)`, background: "rgba(249,115,22,0.08)" }}>Regenerate</button>
          </div>
          <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
            {sceneStrip.length === 0 && <div className="text-[11px]" style={{ color: C.mutedLo }}>Run detection to populate scene thumbnails and reorder controls.</div>}
            {sceneStrip.map((scene, index) => (
              <div key={scene.id ?? `${scene.start}-${scene.end}-${index}`} className="rounded-xl p-2 flex items-center gap-2" style={{ background: C.surface, border: `1px solid ${C.border}` }}>
                <div className="w-12 h-10 rounded-lg flex items-center justify-center text-[10px] font-bold" style={{ background: "rgba(249,115,22,0.12)", color: "#F97316" }}>
                  {scene.thumbnailUrl ? <img src={scene.thumbnailUrl} alt="scene" className="w-full h-full object-cover rounded-lg" /> : `S${index + 1}`}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-[10px] font-semibold" style={{ color: C.text }}>Scene {index + 1}</div>
                  <div className="text-[9px]" style={{ color: C.muted }}>{Number(scene.start ?? 0).toFixed(1)}s → {Number(scene.end ?? 0).toFixed(1)}s</div>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => moveScene(index, -1)} className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: C.surfaceHi, border: `1px solid ${C.border}` }}><ChevronDown className="w-3 h-3 rotate-90" style={{ color: C.muted }} /></button>
                  <button onClick={() => moveScene(index, 1)} className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: C.surfaceHi, border: `1px solid ${C.border}` }}><ChevronDown className="w-3 h-3 -rotate-90" style={{ color: C.muted }} /></button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <button onClick={run} disabled={busy}
        className="w-full py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all"
        style={{ background: "linear-gradient(135deg, #F97316, #EA580C)", color: "#fff" }}>
        {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Clapperboard className="w-4 h-4" />}
        {busy ? "Processing..." : sceneStrip.length > 0 ? "Refresh Scene Analysis" : "Run Scene Tool"}
      </button>
    </div>
  );
}

function MotionPanel({ clipUrl, duration, onStatus, projectId, onAddClip, onAddAudioTrack }: { clipUrl: string; duration: number; onStatus: (s: string) => void; projectId: string; onAddClip: (asset: any) => void; onAddAudioTrack: (asset: any) => void }) {
  const [activeSub, setActiveSub] = useState("motion-slowmo");
  const [fps, setFps] = useState<"60" | "120" | "240">("120");
  const [speedFactor, setSpeedFactor] = useState(0.5);
  const [busy, setBusy] = useState(false);
  const cat = TOOL_CATEGORIES.find(c => c.id === "motion")!;
  const { persistOutput, isPersisting } = useVaultxOutputStore(projectId, onAddClip, onAddAudioTrack);

  const slowMotionMutation = trpc.videoEnhance.slowMotion.useMutation({
    onSuccess: () => {
      onStatus("Slow motion job queued");
      toast.success("Slow motion rendering — check renders when complete");
      setBusy(false);
    },
    onError: (err: any) => { toast.error(err.message); setBusy(false); },
  });

  const run = async () => {
    if (!clipUrl) { toast.error("Select a clip first"); return; }
    setBusy(true);
    if (activeSub === "motion-slowmo") {
      slowMotionMutation.mutate({ videoUrl: clipUrl, targetFps: fps, targetResolution: "1080p", enableUpscale: true, upscaleModel: "general", crf: 18, startTime: 0, maxSeconds: 30, outputFormat: "mp4" });
      } else if (activeSub === "motion-reverse") {
        try {
          const fd = new FormData();
          const blob = await fetch(clipUrl).then(r => r.blob());
          fd.append("video", blob, "clip.mp4");
          fd.append("filter", "reverse");
          const res = await fetch("/api/video-studio/filter", { method: "POST", body: fd });
          const data = await res.json();
          if (!res.ok) throw new Error(data.error || "Reverse failed");
          await persistOutput({
            fileUrl: data.url,
            assetType: "video",
            displayName: "Reverse Motion",
            toolId: activeSub,
            toolLabel: "Reverse Motion",
            toolBadge: "MOTION",
            durationSeconds: duration || undefined,
            metadata: { reverse: true },
          });
          onStatus("Reversed clip stored in outputs");
          toast.success("Reversed clip added to outputs");
          setBusy(false);
        } catch (e: any) { toast.error(e.message); setBusy(false); }
      } else if (activeSub === "motion-ramp") {
        try {
          const fd = new FormData();
          const blob = await fetch(clipUrl).then(r => r.blob());
          fd.append("video", blob, "clip.mp4");
          fd.append("speed", String(speedFactor));
          const res = await fetch("/api/video-studio/speed", { method: "POST", body: fd });
          const data = await res.json();
          if (!res.ok) throw new Error(data.error || "Speed ramp failed");
          await persistOutput({
            fileUrl: data.url,
            assetType: "video",
            displayName: `Speed Ramp ${speedFactor}x`,
            toolId: activeSub,
            toolLabel: "Speed Ramp",
            toolBadge: "MOTION",
            durationSeconds: duration ? Math.max(1, duration / Math.max(speedFactor, 0.1)) : undefined,
            metadata: { speedFactor, curve: [1, speedFactor, 1] },
          });
          onStatus(`Speed ramp ${speedFactor}x stored in outputs`);
          toast.success("Speed ramp added to outputs");
          setBusy(false);
        } catch (e: any) { toast.error(e.message); setBusy(false); }
      } else {
        toast.info("Select a clip and use Slow Motion, Reverse, or Speed Ramp");
        setBusy(false);
      }

  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-1.5">
        {cat.tools.map(t => {
          const Icon = t.icon;
          const active = activeSub === t.id;
          return (
            <button key={t.id} onClick={() => setActiveSub(t.id)}
              className="p-2.5 rounded-xl text-left transition-all"
              style={{ background: active ? "rgba(236,72,153,0.12)" : C.surfaceHi, border: `1px solid ${active ? "#EC4899" : C.border}` }}>
              <div className="flex items-center gap-1.5 mb-0.5">
                <Icon className="w-3 h-3" style={{ color: active ? "#EC4899" : C.muted }} />
                <span className="text-[10px] font-bold" style={{ color: active ? "#EC4899" : C.text }}>{t.label}</span>
              </div>
              <p className="text-[9px] leading-tight" style={{ color: C.mutedLo }}>{t.desc}</p>
            </button>
          );
        })}
      </div>

      <div className="space-y-3 p-3 rounded-xl" style={{ background: C.surfaceHi, border: `1px solid ${C.border}` }}>
        {activeSub === "motion-slowmo" && (
          <div>
            <span className="text-[10px] font-semibold block mb-2" style={{ color: C.muted }}>Target FPS</span>
            <div className="flex gap-2">
              {(["60", "120", "240"] as const).map(f => (
                <button key={f} onClick={() => setFps(f)}
                  className="flex-1 py-2 rounded-xl font-bold text-xs transition-all"
                  style={{
                    background: fps === f ? "rgba(236,72,153,0.15)" : C.surface,
                    border: `1px solid ${fps === f ? "#EC4899" : C.border}`,
                    color: fps === f ? "#EC4899" : C.muted,
                  }}>{f}fps</button>
              ))}
            </div>
            <p className="text-[9px] mt-1.5" style={{ color: C.mutedLo }}>
              {fps === "60" ? "Smooth — 2x slow" : fps === "120" ? "Silky — 4x slow" : "Ultra — 8x slow (AI interpolated)"}
            </p>
          </div>
        )}
        {activeSub === "motion-ramp" && (
          <div>
            <div className="flex justify-between mb-1">
              <span className="text-[10px] font-semibold" style={{ color: C.muted }}>Speed Factor</span>
              <span className="text-[10px] font-mono" style={{ color: "#EC4899" }}>{speedFactor}x</span>
            </div>
            <Slider value={[speedFactor * 10]} onValueChange={([v]) => setSpeedFactor(v / 10)} min={1} max={30} step={1} />
            <div className="flex justify-between mt-1">
              <span className="text-[9px]" style={{ color: C.mutedLo }}>0.1x (ultra slow)</span>
              <span className="text-[9px]" style={{ color: C.mutedLo }}>3x (fast)</span>
            </div>
          </div>
        )}
      </div>

      <button onClick={run} disabled={busy || isPersisting}
        className="w-full py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all"
        style={{ background: "linear-gradient(135deg, #EC4899, #BE185D)", color: "#fff" }}>
        {(busy || isPersisting) ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
        {(busy || isPersisting) ? "Processing..." : "Apply Motion Effect"}
      </button>
    </div>
  );
}

function ColorPanel({ clipUrl, duration, colorGrade, onColorGradeUpdate, onStatus, projectId, onAddClip, onAddAudioTrack }: { clipUrl: string; duration: number; colorGrade: any; onColorGradeUpdate: (g: any) => void; onStatus: (s: string) => void; projectId: string; onAddClip: (asset: any) => void; onAddAudioTrack: (asset: any) => void }) {
  const [activeSub, setActiveSub] = useState("color-grade");
  const [selectedLut, setSelectedLut] = useState<string | null>("moody-dark");
  const [busy, setBusy] = useState(false);
  const cat = TOOL_CATEGORIES.find(c => c.id === "color")!;
  const { persistOutput, isPersisting } = useVaultxOutputStore(projectId, onAddClip, onAddAudioTrack);

  const LUTS = [
    { id: "moody-dark", label: "Moody Dark", preview: "#1a0a2e" },
    { id: "warm-skin", label: "Warm Skin", preview: "#3d1f0a" },
    { id: "neon-night", label: "Neon Night", preview: "#0a0a3d" },
    { id: "golden-hour", label: "Golden Hour", preview: "#3d2a00" },
    { id: "cold-steel", label: "Cold Steel", preview: "#0a1a2e" },
    { id: "rose-tint", label: "Rose Tint", preview: "#3d0a1a" },
    { id: "bleach-bypass", label: "Bleach Bypass", preview: "#1a1a1a" },
    { id: "teal-orange", label: "Teal & Orange", preview: "#0a2a1a" },
    { id: "film-grain", label: "Film Grain", preview: "#1a1510" },
    { id: "vivid-pop", label: "Vivid Pop", preview: "#0a2a0a" },
  ];

  const LUT_PRESETS: Record<string, Record<string, number>> = {
    "moody-dark": { brightness: -12, contrast: 22, saturation: -10, temperature: -8, shadows: -18, highlights: -10 },
    "warm-skin": { brightness: 6, contrast: 10, saturation: 12, temperature: 18, shadows: 0, highlights: 4 },
    "neon-night": { brightness: -8, contrast: 26, saturation: 18, temperature: -16, shadows: -12, highlights: 8 },
    "golden-hour": { brightness: 8, contrast: 14, saturation: 10, temperature: 22, shadows: 2, highlights: 6 },
    "cold-steel": { brightness: -4, contrast: 18, saturation: -8, temperature: -24, shadows: -4, highlights: 10 },
    "rose-tint": { brightness: 4, contrast: 8, saturation: 9, temperature: 12, shadows: 0, highlights: 6 },
    "bleach-bypass": { brightness: -2, contrast: 28, saturation: -30, temperature: -4, shadows: -8, highlights: 12 },
    "teal-orange": { brightness: 2, contrast: 20, saturation: 14, temperature: 6, shadows: -6, highlights: 8 },
    "film-grain": { brightness: -3, contrast: 12, saturation: -6, temperature: 4, shadows: -6, highlights: -2 },
    "vivid-pop": { brightness: 10, contrast: 16, saturation: 28, temperature: 4, shadows: 0, highlights: 10 },
  };

  const resolveGrade = () => {
    if (activeSub === "color-lut" && selectedLut) return { ...colorGrade, ...(LUT_PRESETS[selectedLut] ?? {}) };
    return colorGrade ?? {};
  };

  const run = async () => {
    if (!clipUrl) { toast.error("Select a clip first"); return; }
    setBusy(true);
    try {
      const grade = resolveGrade();
      const fd = new FormData();
      fd.append("video", await fetch(clipUrl).then(r => r.blob()), "clip.mp4");
      Object.entries(grade ?? {}).forEach(([key, value]) => fd.append(key, String(value)));
      const res = await fetch("/api/video-studio/color-grade", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Color grade failed");
      await persistOutput({
        fileUrl: data.url,
        assetType: "video",
        displayName: selectedLut ? `Cinematic Look — ${LUTS.find(l => l.id === selectedLut)?.label ?? selectedLut}` : "Custom Cinematic Grade",
        toolId: activeSub,
        toolLabel: "Cinematic Look Presets",
        toolBadge: "LOOK",
        durationSeconds: duration || undefined,
        metadata: { selectedLut, grade },
      });
      onStatus(selectedLut ? `Applied cinematic look ${selectedLut}` : "Applied custom color grade");
      toast.success("Color look added to outputs");
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-1.5">
        {cat.tools.map(t => {
          const Icon = t.icon;
          const active = activeSub === t.id;
          return (
            <button key={t.id} onClick={() => setActiveSub(t.id)}
              className="p-2.5 rounded-xl text-left transition-all"
              style={{ background: active ? "rgba(6,182,212,0.12)" : C.surfaceHi, border: `1px solid ${active ? C.cyan : C.border}` }}>
              <div className="flex items-center gap-1.5 mb-0.5">
                <Icon className="w-3 h-3" style={{ color: active ? C.cyan : C.muted }} />
                <span className="text-[10px] font-bold" style={{ color: active ? C.cyan : C.text }}>{t.label}</span>
              </div>
              <p className="text-[9px] leading-tight" style={{ color: C.mutedLo }}>{t.desc}</p>
            </button>
          );
        })}
      </div>

      <div className="space-y-3 p-3 rounded-xl" style={{ background: C.surfaceHi, border: `1px solid ${C.border}` }}>
        {activeSub === "color-lut" && (
          <div>
            <span className="text-[10px] font-semibold block mb-2" style={{ color: C.muted }}>Cinematic LUTs</span>
            <div className="grid grid-cols-2 gap-1.5">
              {LUTS.map(l => (
                <button key={l.id} onClick={() => { setSelectedLut(l.id); onColorGradeUpdate({ ...colorGrade, ...(LUT_PRESETS[l.id] ?? {}) }); }}
                  className="flex items-center gap-2 p-2 rounded-lg transition-all"
                  style={{
                    background: selectedLut === l.id ? "rgba(6,182,212,0.12)" : C.surface,
                    border: `1px solid ${selectedLut === l.id ? C.cyan : C.border}`,
                  }}>
                  <div className="w-6 h-6 rounded-md flex-shrink-0" style={{ background: l.preview }} />
                  <span className="text-[10px] font-semibold" style={{ color: selectedLut === l.id ? C.cyan : C.text }}>{l.label}</span>
                </button>
              ))}
            </div>
          </div>
        )}
        {activeSub === "color-grade" && (
          <div className="space-y-2.5">
            {[
              { key: "brightness", label: "Brightness", min: -100, max: 100, def: 0 },
              { key: "contrast", label: "Contrast", min: -100, max: 100, def: 0 },
              { key: "saturation", label: "Saturation", min: -100, max: 100, def: 0 },
              { key: "temperature", label: "Temperature", min: -100, max: 100, def: 0 },
              { key: "shadows", label: "Shadows", min: -100, max: 100, def: 0 },
              { key: "highlights", label: "Highlights", min: -100, max: 100, def: 0 },
            ].map(s => (
              <div key={s.key}>
                <div className="flex justify-between mb-1">
                  <span className="text-[10px]" style={{ color: C.muted }}>{s.label}</span>
                  <span className="text-[10px] font-mono" style={{ color: C.cyan }}>{colorGrade?.[s.key] ?? s.def}</span>
                </div>
                <Slider value={[colorGrade?.[s.key] ?? s.def]} onValueChange={([v]) => onColorGradeUpdate({ ...colorGrade, [s.key]: v })} min={s.min} max={s.max} step={1} />
              </div>
            ))}
          </div>
        )}
        {activeSub === "color-skin" && (
          <div>
            <span className="text-[10px] font-semibold block mb-2" style={{ color: C.muted }}>Skin Tone Preset</span>
            <div className="grid grid-cols-2 gap-1">
              {["Natural Warm", "Golden Glow", "Porcelain", "Deep Rich", "Sun-Kissed", "Smooth Matte"].map(p => (
                <button key={p} onClick={() => onColorGradeUpdate({
                  ...colorGrade,
                  ...(p === "Golden Glow"
                    ? LUT_PRESETS["golden-hour"]
                    : p === "Natural Warm"
                      ? LUT_PRESETS["warm-skin"]
                      : p === "Deep Rich"
                        ? { contrast: 12, saturation: 10, temperature: 8, shadows: -6, highlights: 4 }
                        : p === "Sun-Kissed"
                          ? { brightness: 8, contrast: 10, saturation: 12, temperature: 16, shadows: 0, highlights: 6 }
                          : p === "Smooth Matte"
                            ? { contrast: -6, saturation: -4, shadows: 4, highlights: -8 }
                            : { brightness: 4, contrast: -4, saturation: -6, temperature: -2 }
                  ),
                })}
                  className="py-1.5 rounded-lg text-[10px] font-semibold transition-all"
                  style={{ background: C.surface, border: `1px solid ${C.border}`, color: C.muted }}>
                  {p}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      <button onClick={run} disabled={busy || isPersisting}
        className="w-full py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all"
        style={{ background: `linear-gradient(135deg, ${C.cyan}, #0891B2)`, color: "#001018" }}>
        {(busy || isPersisting) ? <Loader2 className="w-4 h-4 animate-spin" /> : <Palette className="w-4 h-4" />}
        {(busy || isPersisting) ? "Processing..." : "Apply Cinematic Look"}
      </button>
    </div>
  );
}

function TextPanel({ clipUrl, duration, onStatus, projectId, onAddClip, onAddAudioTrack }: { clipUrl: string; duration: number; onStatus: (s: string) => void; projectId: string; onAddClip: (asset: any) => void; onAddAudioTrack: (asset: any) => void }) {
  const [activeSub, setActiveSub] = useState("text-auto");
  const [text, setText] = useState("");
  const [position, setPosition] = useState<"top" | "center" | "bottom">("bottom");
  const [style, setStyle] = useState("subtitle");
  const [fontSize, setFontSize] = useState(52);
  const [busy, setBusy] = useState(false);
  const cat = TOOL_CATEGORIES.find(c => c.id === "text")!;
  const { persistOutput, isPersisting } = useVaultxOutputStore(projectId, onAddClip, onAddAudioTrack);
  const utils = trpc.useUtils();
  const { data: captionStyles } = trpc.smartCaptions.getCaptionStyles.useQuery({ premiumOnly: false });
  const transcribeMutation = trpc.smartCaptions.transcribe.useMutation();
  const applyStyleMutation = trpc.smartCaptions.applyCaptionStyle.useMutation();

  const run = async () => {
    if (!clipUrl) { toast.error("Select a clip first"); return; }
    if (activeSub !== "text-auto" && !text.trim()) { toast.error("Enter text first"); return; }
    setBusy(true);
    try {
      if (activeSub === "text-auto") {
        const styles = Array.isArray(captionStyles) ? captionStyles : [];
        const selectedStyle = styles.find((item: any) => item.id === style) || styles[0];
        if (!selectedStyle?.id) throw new Error("Caption styles unavailable");
        const transcribed = await transcribeMutation.mutateAsync({ videoUrl: clipUrl });
        await applyStyleMutation.mutateAsync({
          captionId: transcribed.captionId,
          styleId: selectedStyle.id,
          customizations: {
            fontSize,
            placement: position,
          },
        });

        let captionedVideoUrl = "";
        for (let attempt = 0; attempt < 20; attempt += 1) {
          await new Promise(resolve => setTimeout(resolve, 2000));
          const caption = await utils.smartCaptions.getCaptionById.fetch({ captionId: transcribed.captionId });
          if (caption?.captionedVideoUrl) {
            captionedVideoUrl = caption.captionedVideoUrl;
            break;
          }
          if (caption?.processingStatus === "failed") throw new Error("Caption generation failed");
        }
        if (!captionedVideoUrl) throw new Error("Caption generation timed out");

        await persistOutput({
          fileUrl: captionedVideoUrl,
          assetType: "video",
          displayName: `Auto Captions Burn-In — ${selectedStyle.name || style}`,
          toolId: activeSub,
          toolLabel: "Auto Captions Burn-In",
          toolBadge: "CAPTION",
          durationSeconds: duration || transcribed.videoDuration || undefined,
          metadata: { styleId: selectedStyle.id, styleName: selectedStyle.name, position, fontSize },
        });
        onStatus("Captioned output stored");
        toast.success("Auto-captioned output added to outputs");
        return;
      }

      const fd = new FormData();
      const blob = await fetch(clipUrl).then(r => r.blob());
      fd.append("video", blob, "clip.mp4");
      fd.append("text", text);
      fd.append("style", style);
      fd.append("position", position);
      fd.append("start", "0");
      fd.append("end", String(Math.min(duration || 10, 10)));
      fd.append("fontSize", String(fontSize));
      const res = await fetch("/api/video-studio/add-text", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Text failed");
      await persistOutput({
        fileUrl: data.url,
        assetType: "video",
        displayName: `Text Overlay — ${style}`,
        toolId: activeSub,
        toolLabel: "Text Overlay",
        toolBadge: "TEXT",
        durationSeconds: duration || undefined,
        metadata: { text, style, position, fontSize },
      });
      onStatus("Text overlay stored");
      toast.success("Text output added to outputs");
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  };

  const CTA_TEMPLATES = [
    "Subscribe for more 🔥",
    "Link in bio 👇",
    "DM me for PPV 💌",
    "New content daily 🔞",
    "Join my VaultX 🔐",
    "Only fans can see this 😈",
  ];

  const STYLE_OPTIONS = [
    ...(Array.isArray(captionStyles) ? captionStyles.slice(0, 3).map((item: any) => ({ id: item.id, label: item.name || item.id })) : []),
    { id: "subtitle", label: "Classic Subtitle" },
    { id: "karaoke", label: "Karaoke Glow" },
    { id: "bold-pop", label: "Bold Pop" },
  ].filter((value, index, arr) => arr.findIndex(other => other.id === value.id) === index).slice(0, 3);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-1.5">
        {cat.tools.map(t => {
          const Icon = t.icon;
          const active = activeSub === t.id;
          return (
            <button key={t.id} onClick={() => setActiveSub(t.id)}
              className="p-2.5 rounded-xl text-left transition-all"
              style={{ background: active ? "rgba(6,182,212,0.12)" : C.surfaceHi, border: `1px solid ${active ? C.cyan : C.border}` }}>
              <div className="flex items-center gap-1.5 mb-0.5">
                <Icon className="w-3 h-3" style={{ color: active ? C.cyan : C.muted }} />
                <span className="text-[10px] font-bold" style={{ color: active ? C.cyan : C.text }}>{t.label}</span>
              </div>
              <p className="text-[9px] leading-tight" style={{ color: C.mutedLo }}>{t.desc}</p>
            </button>
          );
        })}
      </div>

      <div className="space-y-3 p-3 rounded-xl" style={{ background: C.surfaceHi, border: `1px solid ${C.border}` }}>
        {activeSub === "text-cta" && (
          <div>
            <span className="text-[10px] font-semibold block mb-2" style={{ color: C.muted }}>Quick CTA Templates</span>
            <div className="grid grid-cols-1 gap-1">
              {CTA_TEMPLATES.map(t => (
                <button key={t} onClick={() => setText(t)}
                  className="py-1.5 px-2 rounded-lg text-[10px] text-left transition-all"
                  style={{
                    background: text === t ? "rgba(6,182,212,0.12)" : C.surface,
                    border: `1px solid ${text === t ? C.cyan : C.border}`,
                    color: text === t ? C.cyan : C.muted,
                  }}>{t}</button>
              ))}
            </div>
          </div>
        )}

        {activeSub === "text-auto" ? (
          <div className="space-y-3">
            <div>
              <span className="text-[10px] font-semibold block mb-2" style={{ color: C.muted }}>Premium Caption Style</span>
              <div className="grid grid-cols-3 gap-1">
                {STYLE_OPTIONS.map(option => (
                  <button key={option.id} onClick={() => setStyle(option.id)} className="py-2 rounded-lg text-[10px] font-semibold transition-all" style={{ background: style === option.id ? "rgba(6,182,212,0.12)" : C.surface, border: `1px solid ${style === option.id ? C.cyan : C.border}`, color: style === option.id ? C.cyan : C.muted }}>{option.label}</button>
                ))}
              </div>
            </div>
            <div className="text-[10px] rounded-lg p-2" style={{ color: C.muted, background: C.surface, border: `1px solid ${C.border}` }}>
              Auto captions will transcribe speech, apply the selected style, burn subtitles into the video, and store the finished captioned output in VaultX.
            </div>
          </div>
        ) : (
          <div>
            <span className="text-[10px] font-semibold block mb-1" style={{ color: C.muted }}>Text</span>
            <textarea value={text} onChange={e => setText(e.target.value)} rows={2}
              className="w-full px-2 py-1.5 rounded-lg text-xs resize-none"
              style={{ background: C.surface, border: `1px solid ${C.border}`, color: C.text }}
              placeholder="Your text here..." />
          </div>
        )}

        <div>
          <span className="text-[10px] font-semibold block mb-1" style={{ color: C.muted }}>Position</span>
          <div className="flex gap-1">
            {(["top", "center", "bottom"] as const).map(p => (
              <button key={p} onClick={() => setPosition(p)}
                className="flex-1 py-1 rounded-lg text-[10px] font-semibold capitalize transition-all"
                style={{
                  background: position === p ? "rgba(6,182,212,0.12)" : C.surface,
                  border: `1px solid ${position === p ? C.cyan : C.border}`,
                  color: position === p ? C.cyan : C.muted,
                }}>{p}</button>
            ))}
          </div>
        </div>
        <div>
          <div className="flex justify-between mb-1">
            <span className="text-[10px]" style={{ color: C.muted }}>Font Size</span>
            <span className="text-[10px] font-mono" style={{ color: C.cyan }}>{fontSize}px</span>
          </div>
          <Slider value={[fontSize]} onValueChange={([v]) => setFontSize(v)} min={24} max={96} step={4} />
        </div>
      </div>

      <button onClick={run} disabled={busy || isPersisting || (activeSub !== "text-auto" && !text.trim())}
        className="w-full py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all"
        style={{ background: `linear-gradient(135deg, ${C.cyan}, #0891B2)`, color: "#000" }}>
        {(busy || isPersisting) ? <Loader2 className="w-4 h-4 animate-spin" /> : <Type className="w-4 h-4" />}
        {(busy || isPersisting) ? "Processing..." : activeSub === "text-auto" ? "Generate Auto Captions" : "Burn In Text"}
      </button>
    </div>
  );
}

function AudioPanel({ clipUrl, onStatus, projectId, onAddClip, onAddAudioTrack }: { clipUrl: string; onStatus: (s: string) => void; projectId: string; onAddClip: (asset: any) => void; onAddAudioTrack: (asset: any) => void }) {
  const [activeSub, setActiveSub] = useState("audio-music");
  const [volume, setVolume] = useState(80);
  const [musicVolume, setMusicVolume] = useState(40);
  const [selectedMood, setSelectedMood] = useState("sensual");
  const [busy, setBusy] = useState(false);
  const cat = TOOL_CATEGORIES.find(c => c.id === "audio")!;
  const { persistOutput, isPersisting } = useVaultxOutputStore(projectId, onAddClip, onAddAudioTrack);

  const MUSIC_MOODS = [
    { id: "sensual", label: "Sensual / Slow", icon: "🌹", track: "Velvet Tease Bed", note: "Seeded preset ready, real ducking backend still blocked" },
    { id: "hype", label: "Hype / Trap", icon: "🔥", track: "Midnight Trap Loop", note: "Seeded preset ready, real ducking backend still blocked" },
    { id: "chill", label: "Chill / Lo-Fi", icon: "✨", track: "After Hours Lofi", note: "Seeded preset ready, real ducking backend still blocked" },
    { id: "dark", label: "Dark / Cinematic", icon: "🌑", track: "Noir Pulse Bed", note: "Seeded preset ready, real ducking backend still blocked" },
    { id: "pop", label: "Pop / Upbeat", icon: "⚡", track: "Neon Pop Lift", note: "Seeded preset ready, real ducking backend still blocked" },
    { id: "rnb", label: "R&B / Soul", icon: "💜", track: "Slow Burn Groove", note: "Seeded preset ready, real ducking backend still blocked" },
  ];

  const run = async () => {
    if (!clipUrl) { toast.error("Select a clip first"); return; }
    if (activeSub === "audio-music") {
      const mood = MUSIC_MOODS.find(item => item.id === selectedMood) || MUSIC_MOODS[0];
      toast.error("Music-bed ducking is blocked until the backend supports true mix-and-duck instead of audio replacement only");
      onStatus(`Blocked: ${mood.track} preset selected, but real mix-and-duck is not yet available in the backend`);
      return;
    }

    setBusy(true);
    try {
      const fd = new FormData();
      const blob = await fetch(clipUrl).then(r => r.blob());
      fd.append("video", blob, "clip.mp4");
      if (activeSub === "audio-normalize") {
        fd.append("mode", "loudnorm");
      } else {
        fd.append("mode", "denoise");
      }
      const res = await fetch("/api/video-studio/audio", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Audio processing failed");
      await persistOutput({
        fileUrl: data.url,
        assetType: "video",
        displayName: activeSub === "audio-normalize" ? "Normalized Voice Master" : "Voice Cleanup Pass",
        toolId: activeSub,
        toolLabel: activeSub === "audio-normalize" ? "Audio Normalize" : "Voice Cleanup",
        toolBadge: "AUDIO",
        metadata: activeSub === "audio-normalize" ? { mode: "loudnorm" } : { mode: "denoise", requestedVolume: volume },
      });
      onStatus(activeSub === "audio-normalize" ? "Normalized audio output stored" : "Voice cleanup output stored");
      toast.success(activeSub === "audio-normalize" ? "Normalized output added to outputs" : "Voice cleanup output added to outputs");
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-1.5">
        {cat.tools.map(t => {
          const Icon = t.icon;
          const active = activeSub === t.id;
          return (
            <button key={t.id} onClick={() => setActiveSub(t.id)}
              className="p-2.5 rounded-xl text-left transition-all"
              style={{ background: active ? "rgba(16,185,129,0.12)" : C.surfaceHi, border: `1px solid ${active ? C.green : C.border}` }}>
              <div className="flex items-center gap-1.5 mb-0.5">
                <Icon className="w-3 h-3" style={{ color: active ? C.green : C.muted }} />
                <span className="text-[10px] font-bold" style={{ color: active ? C.green : C.text }}>{t.label}</span>
              </div>
              <p className="text-[9px] leading-tight" style={{ color: C.mutedLo }}>{t.desc}</p>
            </button>
          );
        })}
      </div>

      <div className="space-y-3 p-3 rounded-xl" style={{ background: C.surfaceHi, border: `1px solid ${C.border}` }}>
        {activeSub === "audio-music" && (
          <div className="space-y-3">
            <div>
              <span className="text-[10px] font-semibold block mb-2" style={{ color: C.muted }}>Seeded Music Bed Library</span>
              <div className="grid grid-cols-2 gap-1">
                {MUSIC_MOODS.map(m => (
                  <button key={m.id} onClick={() => setSelectedMood(m.id)}
                    className="flex items-start gap-2 p-2 rounded-lg transition-all text-left"
                    style={{ background: selectedMood === m.id ? "rgba(16,185,129,0.12)" : C.surface, border: `1px solid ${selectedMood === m.id ? C.green : C.border}` }}>
                    <span>{m.icon}</span>
                    <span>
                      <span className="block text-[10px] font-semibold" style={{ color: selectedMood === m.id ? C.green : C.text }}>{m.label}</span>
                      <span className="block text-[9px]" style={{ color: C.muted }}>{m.track}</span>
                    </span>
                  </button>
                ))}
              </div>
            </div>
            <div>
              <div className="flex justify-between mb-1">
                <span className="text-[10px]" style={{ color: C.muted }}>Target Music Volume</span>
                <span className="text-[10px] font-mono" style={{ color: C.green }}>{musicVolume}%</span>
              </div>
              <Slider value={[musicVolume]} onValueChange={([v]) => setMusicVolume(v)} min={0} max={100} step={5} />
            </div>
            <div className="text-[10px] rounded-lg p-2" style={{ color: "#FCA5A5", background: "rgba(127,29,29,0.18)", border: "1px solid rgba(248,113,113,0.35)" }}>
              Blocked: the live backend currently supports audio extraction, mute, replace, normalize, denoise, and basic EQ, but it does not yet provide a true music-bed mix-and-duck mode. This card is mapped to a real preset selection, but the final ducked render must stay marked blocked until a mixing route is added.
            </div>
          </div>
        )}

        {(activeSub === "audio-voice" || activeSub === "audio-normalize") && (
          <div className="space-y-2.5">
            <div>
              <div className="flex justify-between mb-1">
                <span className="text-[10px]" style={{ color: C.muted }}>Voice Volume Reference</span>
                <span className="text-[10px] font-mono" style={{ color: C.green }}>{volume}%</span>
              </div>
              <Slider value={[volume]} onValueChange={([v]) => setVolume(v)} min={0} max={150} step={5} />
            </div>
            <div className="grid grid-cols-2 gap-1">
              {[activeSub === "audio-normalize" ? "Broadcast Loudness" : "RNNoise Denoise", activeSub === "audio-normalize" ? "AAC Master" : "Speech Cleanup", activeSub === "audio-normalize" ? "Keep Video" : "Keep Sync", activeSub === "audio-normalize" ? "Store Output" : "Store Output"].map(f => (
                <div key={f}
                  className="py-1.5 rounded-lg text-[10px] font-semibold text-center"
                  style={{ background: C.surface, border: `1px solid ${C.border}`, color: C.muted }}>
                  {f}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <button onClick={run} disabled={busy || isPersisting}
        className="w-full py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all"
        style={{ background: `linear-gradient(135deg, ${C.green}, #059669)`, color: "#04130E" }}>
        {(busy || isPersisting) ? <Loader2 className="w-4 h-4 animate-spin" /> : <Music className="w-4 h-4" />}
        {(busy || isPersisting)
          ? "Processing..."
          : activeSub === "audio-music"
            ? "Music Bed + Ducking Blocked"
            : activeSub === "audio-normalize"
              ? "Normalize Audio"
              : "Clean Up Voice"}
      </button>
    </div>
  );
}

function ExportPanel({ clipUrl, duration, onStatus, projectId, onAddClip, onAddAudioTrack }: { clipUrl: string; duration: number; onStatus: (s: string) => void; projectId: string; onAddClip: (asset: any) => void; onAddAudioTrack: (asset: any) => void }) {
  const [selected, setSelected] = useState<Set<string>>(new Set(["onlyfans", "tiktok"]));
  const [busy, setBusy] = useState(false);
  const cat = TOOL_CATEGORIES.find(c => c.id === "format")!;
  const { persistOutput, isPersisting } = useVaultxOutputStore(projectId, onAddClip, onAddAudioTrack);

  const toggle = (id: string) => setSelected(prev => {
    const next = new Set(prev);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  });

  const run = async () => {
    if (!clipUrl) { toast.error("Select a clip first"); return; }
    if (selected.size === 0) { toast.error("Select at least one platform"); return; }
    setBusy(true);
    try {
      const sourceBlob = await fetch(clipUrl).then(r => r.blob());
      for (const platform of selected) {
        const fd = new FormData();
        fd.append("video", sourceBlob.slice(0, sourceBlob.size, sourceBlob.type || "video/mp4"), `${platform}.mp4`);
        fd.append("platform", platform);
        if (platform === "tiktok") {
          fd.append("preset", "9:16");
          fd.append("width", "1080");
          fd.append("height", "1920");
        } else {
          fd.append("preset", "of-feed");
          fd.append("width", "1080");
          fd.append("height", "1350");
        }
        const res = await fetch("/api/video-studio/convert", { method: "POST", body: fd });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || `Export failed for ${platform}`);
        await persistOutput({
          fileUrl: data.url,
          assetType: "video",
          displayName: platform === "tiktok" ? "TikTok Export 9:16" : "OnlyFans Export Feed",
          toolId: `format-${platform}`,
          toolLabel: platform === "tiktok" ? "TikTok Export" : "OnlyFans Export",
          toolBadge: "EXPORT",
          durationSeconds: duration || undefined,
          metadata: { platform, preset: platform === "tiktok" ? "9:16" : "of-feed" },
        });
      }
      onStatus(`Exported and stored for ${[...selected].join(", ")}`);
      toast.success(`Stored ${selected.size} export output${selected.size === 1 ? "" : "s"}`);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-1.5">
        {cat.tools.map(t => {
          const Icon = t.icon;
          const active = selected.has(t.id);
          return (
            <button key={t.id} onClick={() => toggle(t.id)}
              className="p-2.5 rounded-xl text-left transition-all relative"
              style={{ background: active ? C.accentDim : C.surfaceHi, border: `1px solid ${active ? C.accent : C.border}` }}>
              {active && <Check className="absolute top-1.5 right-1.5 w-3 h-3" style={{ color: C.accent }} />}
              <div className="flex items-center gap-1.5 mb-0.5">
                <Icon className="w-3 h-3" style={{ color: active ? C.accent : C.muted }} />
                <span className="text-[10px] font-bold" style={{ color: active ? C.accent : C.text }}>{t.label}</span>
              </div>
              <p className="text-[9px] leading-tight" style={{ color: C.mutedLo }}>{t.desc}</p>
            </button>
          );
        })}
      </div>

      <button onClick={run} disabled={busy || isPersisting || selected.size === 0}
        className="w-full py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all"
        style={{ background: `linear-gradient(135deg, ${C.accent}, #9333EA)`, color: "#fff" }}>
        {(busy || isPersisting) ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
        {(busy || isPersisting) ? "Exporting..." : `Export to ${selected.size} Platform${selected.size !== 1 ? "s" : ""}`}
      </button>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function VaultXVideoEditor() {
  const params = useParams();
  const [, setLocation] = useLocation();
  const projectId = params.projectId as string;

  const [activeCat, setActiveCat] = useState("ppv");
  const [activeTemplateId, setActiveTemplateId] = useState<string>(HERO_TEMPLATES[0].id);
  const [toolStatus, setToolStatus] = useState<string | null>(null);

  const { data: outputAssetsData } = trpc.creatorVideoEditor.getAssets.useQuery(
    { projectId, assetType: "video" },
    { enabled: !!projectId, refetchOnWindowFocus: false }
  );
  const { data: renderHistoryData } = trpc.creatorVideoEditor.getRenders.useQuery(
    { projectId },
    { enabled: !!projectId, refetchOnWindowFocus: false }
  );

  const {
    clips, textLayers, audioTracks, colorGrade,
    currentTime, isPlaying, duration, volume,
    selectedClipId, selectedTextLayerId, selectedAudioTrackId,
    addClip, removeClip, updateClip, reorderClips, splitClip,
    addTextLayer, removeTextLayer, updateTextLayer,
    addAudioTrack, removeAudioTrack, updateAudioTrack,
    updateColorGrade,
    togglePlayPause, seek, setVolume, setCurrentTime,
    selectClip, selectTextLayer, selectAudioTrack,
    saveProject, isSaving,
    isLoading, error,
  } = useVideoEditor(projectId);

  const selectedClip = clips.find(c => c.id === selectedClipId) ?? clips[0] ?? null;
  const selectedTextLayer = textLayers.find(t => t.id === selectedTextLayerId) ?? null;
  const selectedAudioTrack = audioTracks.find(a => a.id === selectedAudioTrackId) ?? null;

  const clipUrl: string = selectedClip
    ? ((selectedClip as any).assetUrl || (selectedClip as any).src || (selectedClip as any).url || (selectedClip as any).sourceUrl || "")
    : "";

  const activeCatData = TOOL_CATEGORIES.find(c => c.id === activeCat)!;
  const activeTemplate = HERO_TEMPLATES.find(t => t.id === activeTemplateId) ?? HERO_TEMPLATES[0];
  const outputAssets = useMemo(() => {
    const assets = (outputAssetsData?.assets ?? []) as OutputAsset[];
    return assets.filter((asset) => {
      const metadata = asset.metadata ?? {};
      return metadata?.source === "vaultx" || metadata?.isVaultxOutput || metadata?.toolId;
    }).slice(0, 10);
  }, [outputAssetsData]);
  const renderHistory = useMemo(() => {
    return ((renderHistoryData?.renders ?? []) as any[]).slice(0, 8);
  }, [renderHistoryData]);

  if (isLoading) return (
    <div className="h-screen flex items-center justify-center" style={{ background: C.bg }}>
      <div className="text-center">
        <Loader2 className="w-10 h-10 animate-spin mx-auto mb-3" style={{ color: C.accent }} />
        <p style={{ color: C.muted }}>Loading VaultX Editor…</p>
      </div>
    </div>
  );

  if (error) return (
    <div className="h-screen flex items-center justify-center" style={{ background: C.bg }}>
      <div className="text-center">
        <AlertTriangle className="w-10 h-10 mx-auto mb-3" style={{ color: C.accent }} />
        <p style={{ color: C.muted }}>Project not found</p>
        <button onClick={() => setLocation("/vaultx-video-editor")} className="mt-4 px-4 py-2 rounded-lg text-sm" style={{ background: C.accentDim, color: C.accent, border: `1px solid ${C.borderHi}` }}>
          Back to Projects
        </button>
      </div>
    </div>
  );

  return (
    <div className="h-screen flex flex-col overflow-hidden" style={{ background: C.bg, color: C.text, fontFamily: "'Inter', sans-serif" }}>

      {/* ── Top Bar ── */}
      <div className="shrink-0 flex items-center gap-3 px-4 py-2.5"
        style={{ borderBottom: `1px solid ${C.border}`, background: C.surface }}>
        <button onClick={() => setLocation("/vaultx-video-editor")}
          className="flex items-center gap-1.5 text-xs transition-all hover:opacity-80"
          style={{ color: C.muted }}>
          <ArrowLeft className="w-4 h-4" />
          <span>Projects</span>
        </button>
        <div className="w-px h-4" style={{ background: C.border }} />
        <div className="flex items-center gap-2">
          <Flame className="w-4 h-4" style={{ color: C.accent }} />
          <span className="text-sm font-bold" style={{ color: C.text }}>VaultX Editor</span>
          <span className="text-[10px] px-1.5 py-0.5 rounded-full font-bold" style={{ background: C.accentDim, color: C.accent, border: `1px solid ${C.borderHi}` }}>PRO</span>
        </div>
        {toolStatus && (
          <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg" style={{ background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.3)" }}>
            <Check className="w-3 h-3" style={{ color: C.green }} />
            <span className="text-[10px] font-semibold" style={{ color: C.green }}>{toolStatus}</span>
          </div>
        )}
        <div className="ml-auto flex items-center gap-2">
          {!selectedClip && (
            <span className="text-[10px] px-2 py-1 rounded-lg" style={{ background: C.accentDim, color: C.muted, border: `1px solid ${C.border}` }}>
              Select a clip to use tools
            </span>
          )}
          <button onClick={saveProject} disabled={isSaving}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
            style={{ background: C.accentDim, color: C.accent, border: `1px solid ${C.borderHi}` }}>
            {isSaving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
            Save
          </button>
        </div>
      </div>

      {/* ── Main Layout ── */}
      <div className="flex-1 flex overflow-hidden">

        {/* LEFT: Category Rail */}
        <div className="w-16 shrink-0 flex flex-col items-center py-3 gap-1 overflow-y-auto"
          style={{ borderRight: `1px solid ${C.border}`, background: C.surface }}>
          {TOOL_CATEGORIES.map(cat => {
            const Icon = cat.icon;
            const active = activeCat === cat.id;
            return (
              <button key={cat.id} onClick={() => setActiveCat(cat.id)}
                title={cat.label}
                className="w-11 h-11 rounded-xl flex items-center justify-center transition-all relative group"
                style={{
                  background: active ? cat.glow : "transparent",
                  border: `1px solid ${active ? cat.color : "transparent"}`,
                }}>
                <Icon className="w-5 h-5" style={{ color: active ? cat.color : C.mutedLo }} />
                {/* Tooltip */}
                <div className="absolute left-14 z-50 px-2 py-1 rounded-lg text-[10px] font-semibold whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-all"
                  style={{ background: C.surfaceHi, border: `1px solid ${C.border}`, color: C.text }}>
                  {cat.label}
                </div>
              </button>
            );
          })}
        </div>

        {/* LEFT PANEL: Tool Subcategories */}
        <div className="w-72 shrink-0 flex flex-col overflow-hidden"
          style={{ borderRight: `1px solid ${C.border}`, background: C.surface }}>
          {/* Panel Header */}
          <div className="px-3 py-3 shrink-0" style={{ borderBottom: `1px solid ${C.border}` }}>
            <div className="flex items-center gap-2 mb-0.5">
              {(() => { const Icon = activeCatData.icon; return <Icon className="w-4 h-4" style={{ color: activeCatData.color }} />; })()}
              <span className="text-sm font-bold" style={{ color: activeCatData.color }}>{activeCatData.label}</span>
            </div>
            <p className="text-[10px]" style={{ color: C.mutedLo }}>{activeCatData.desc}</p>
          </div>

          <div className="px-3 py-3 shrink-0" style={{ borderBottom: `1px solid ${C.border}` }}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-semibold uppercase tracking-[0.18em]" style={{ color: C.muted }}>Starter Templates</span>
              <span className="text-[9px]" style={{ color: C.mutedLo }}>Mapped to real tools</span>
            </div>
            <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
              {HERO_TEMPLATES.map((template) => {
                const templateActive = activeTemplateId === template.id;
                const category = TOOL_CATEGORIES.find((item) => item.id === template.category)!;
                return (
                  <button
                    key={template.id}
                    onClick={() => {
                      setActiveTemplateId(template.id);
                      setActiveCat(template.category);
                      setToolStatus(`${template.title} template loaded`);
                    }}
                    className="w-full rounded-xl p-2.5 text-left transition-all"
                    style={{
                      background: templateActive ? category.glow : C.surfaceHi,
                      border: `1px solid ${templateActive ? category.color : C.border}`,
                    }}
                  >
                    <div className="flex items-start gap-2">
                      <div className="w-10 h-10 rounded-lg flex items-center justify-center text-[10px] font-black"
                        style={{ background: category.glow, color: category.color, border: `1px solid ${category.color}` }}>
                        {template.thumbnail}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[11px] font-bold" style={{ color: templateActive ? category.color : C.text }}>{template.title}</span>
                          <span className="text-[9px] uppercase tracking-[0.16em]" style={{ color: C.mutedLo }}>{category.label}</span>
                        </div>
                        <p className="text-[9px] mt-1 leading-snug" style={{ color: C.muted }}>{template.description}</p>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Tool Panel Content */}
          <div className="flex-1 overflow-y-auto p-3">
            {activeCat === "ppv"    && <PPVPanel    clipUrl={clipUrl} duration={duration} onStatus={setToolStatus} projectId={projectId} onAddClip={addClip} onAddAudioTrack={addAudioTrack} />}
            {activeCat === "censor" && <CensorPanel clipUrl={clipUrl} duration={duration} onStatus={setToolStatus} projectId={projectId} onAddClip={addClip} onAddAudioTrack={addAudioTrack} />}
            {activeCat === "scene"  && <ScenePanel  clipUrl={clipUrl} onStatus={setToolStatus} />}
            {activeCat === "motion" && <MotionPanel clipUrl={clipUrl} duration={duration} onStatus={setToolStatus} projectId={projectId} onAddClip={addClip} onAddAudioTrack={addAudioTrack} />}
            {activeCat === "color"  && <ColorPanel  clipUrl={clipUrl} duration={duration} colorGrade={colorGrade} onColorGradeUpdate={updateColorGrade} onStatus={setToolStatus} projectId={projectId} onAddClip={addClip} onAddAudioTrack={addAudioTrack} />}
            {activeCat === "text"   && <TextPanel   clipUrl={clipUrl} duration={duration} onStatus={setToolStatus} projectId={projectId} onAddClip={addClip} onAddAudioTrack={addAudioTrack} />}
            {activeCat === "audio"  && <AudioPanel  clipUrl={clipUrl} onStatus={setToolStatus} projectId={projectId} onAddClip={addClip} onAddAudioTrack={addAudioTrack} />}
            {activeCat === "format" && <ExportPanel clipUrl={clipUrl} duration={duration} onStatus={setToolStatus} projectId={projectId} onAddClip={addClip} onAddAudioTrack={addAudioTrack} />}
          </div>
        </div>

        {/* CENTER: Preview + Timeline */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          <div className="shrink-0 px-4 py-2.5 flex items-center gap-3 overflow-x-auto"
            style={{ borderBottom: `1px solid ${C.border}`, background: C.surface }}>
            <div className="shrink-0 px-3 py-2 rounded-xl"
              style={{ background: activeCatData.glow, border: `1px solid ${activeCatData.color}` }}>
              <div className="text-[10px] uppercase tracking-[0.18em] font-semibold" style={{ color: activeCatData.color }}>Live Template</div>
              <div className="text-sm font-bold" style={{ color: C.text }}>{activeTemplate.title}</div>
            </div>
            <div className="min-w-0">
              <div className="text-[10px] uppercase tracking-[0.18em] font-semibold" style={{ color: C.muted }}>Template Configuration</div>
              <div className="text-[11px]" style={{ color: C.text }}>{Object.entries(activeTemplate.config).map(([key, value]) => `${key}: ${Array.isArray(value) ? value.join(", ") : String(value)}`).join(" • ")}</div>
            </div>
          </div>

          {/* Video Preview */}
          <div className="flex-1 min-h-0 flex items-center justify-center" style={{ background: "#000" }}>
            <VideoPreview
              clips={clips}
              textLayers={textLayers}
              audioTracks={audioTracks}
              colorGrade={colorGrade}
              currentTime={currentTime}
              isPlaying={isPlaying}
              duration={duration}
              onTimeUpdate={setCurrentTime}
              onTogglePlay={togglePlayPause}
              onSeek={seek}
              onVolumeChange={setVolume}
            />
          </div>
          <div className="shrink-0 px-4 py-3 space-y-2" style={{ borderTop: `1px solid ${C.border}`, background: C.surface }}>
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-[10px] uppercase tracking-[0.18em] font-semibold" style={{ color: C.muted }}>Outputs / History</div>
                <div className="text-[11px]" style={{ color: C.mutedLo }}>Recent processed assets and render jobs are surfaced here for quick preview and download.</div>
              </div>
              <div className="text-[10px]" style={{ color: C.muted }}>{outputAssets.length} output asset{outputAssets.length === 1 ? "" : "s"} • {renderHistory.length} render job{renderHistory.length === 1 ? "" : "s"}</div>
            </div>
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-2">
              <div className="rounded-xl p-2.5" style={{ background: C.surfaceHi, border: `1px solid ${C.border}` }}>
                <div className="text-[10px] uppercase tracking-[0.18em] font-semibold mb-2" style={{ color: C.muted }}>Processed Assets</div>
                <div className="space-y-2 max-h-32 overflow-y-auto pr-1">
                  {outputAssets.length === 0 && (
                    <div className="text-[11px]" style={{ color: C.mutedLo }}>Run a VaultX tool to populate this output history.</div>
                  )}
                  {outputAssets.map((asset) => (
                    <div key={String(asset.id)} className="flex items-center gap-2 rounded-lg px-2 py-2" style={{ background: C.surface, border: `1px solid ${C.border}` }}>
                      <div className="w-10 h-10 rounded-lg flex items-center justify-center text-[10px] font-black" style={{ background: C.accentDim, color: C.accent }}>{asset.metadata?.toolBadge || "OUT"}</div>
                      <div className="min-w-0 flex-1">
                        <div className="text-[11px] font-semibold truncate" style={{ color: C.text }}>{asset.metadata?.displayName || asset.metadata?.fileName || `Output ${asset.id}`}</div>
                        <div className="text-[10px] truncate" style={{ color: C.muted }}>{asset.metadata?.toolLabel || asset.metadata?.toolId || "Processed media"}</div>
                      </div>
                      <a href={asset.file_url} target="_blank" rel="noreferrer" className="px-2 py-1 rounded-lg text-[10px] font-semibold" style={{ background: C.accentDim, border: `1px solid ${C.borderHi}`, color: C.accent }}>Download</a>
                    </div>
                  ))}
                </div>
              </div>
              <div className="rounded-xl p-2.5" style={{ background: C.surfaceHi, border: `1px solid ${C.border}` }}>
                <div className="text-[10px] uppercase tracking-[0.18em] font-semibold mb-2" style={{ color: C.muted }}>Render Queue</div>
                <div className="space-y-2 max-h-32 overflow-y-auto pr-1">
                  {renderHistory.length === 0 && (
                    <div className="text-[11px]" style={{ color: C.mutedLo }}>No recent render jobs yet for this project.</div>
                  )}
                  {renderHistory.map((render) => (
                    <div key={render.id} className="flex items-center gap-2 rounded-lg px-2 py-2" style={{ background: C.surface, border: `1px solid ${C.border}` }}>
                      <div className="w-2 h-2 rounded-full" style={{ background: render.status === "completed" ? C.green : render.status === "failed" ? C.accent : C.gold }} />
                      <div className="min-w-0 flex-1">
                        <div className="text-[11px] font-semibold truncate" style={{ color: C.text }}>{render.id}</div>
                        <div className="text-[10px] capitalize" style={{ color: C.muted }}>{render.status || "queued"}</div>
                      </div>
                      {render.output_url && <a href={render.output_url} target="_blank" rel="noreferrer" className="px-2 py-1 rounded-lg text-[10px] font-semibold" style={{ background: C.goldDim, border: `1px solid ${C.gold}`, color: C.gold }}>Open</a>}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Timeline */}
          <div className="shrink-0" style={{ borderTop: `1px solid ${C.border}` }}>
            <Timeline
              clips={clips}
              textLayers={textLayers}
              audioTracks={audioTracks}
              currentTime={currentTime}
              duration={duration}
              selectedClipId={selectedClipId}
              selectedTextLayerId={selectedTextLayerId}
              selectedAudioTrackId={selectedAudioTrackId}
              onSelectClip={selectClip}
              onSelectTextLayer={selectTextLayer}
              onSelectAudioTrack={selectAudioTrack}
              onSeek={seek}
              onClipUpdate={updateClip}
              onClipRemove={removeClip}
              onClipSplit={splitClip}
              onClipsReorder={reorderClips}
              onAudioTrackAdd={addAudioTrack}
              onAudioTrackRemove={removeAudioTrack}
              onTextLayerAdd={addTextLayer}
              onTextLayerRemove={removeTextLayer}
              projectId={projectId}
            />
          </div>
        </div>

        {/* RIGHT: Media Panel */}
        <div className="w-60 shrink-0 overflow-y-auto"
          style={{ borderLeft: `1px solid ${C.border}`, background: C.surface }}>
          <MediaPanel
            projectId={projectId}
            onAddClip={addClip}
          />
        </div>
      </div>
    </div>
  );
}
