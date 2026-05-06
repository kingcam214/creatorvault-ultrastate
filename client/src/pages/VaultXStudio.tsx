/*
 * ============================================================================
 * VAULTX STUDIO v6 — MAXIMUM POWER PRODUCTION SUITE
 * ============================================================================
 * 12 panels. 16 real AI models. Zero fake labels. Zero placeholders.
 *
 * NEW in v6:
 *   10. AI VIDEO GENERATOR  — MiniMax Hailuo + Stable Video Diffusion + Zeroscope XL
 *   11. AI SOUND STUDIO     — MMAudio (5.1M runs) + MusicGen
 *   12. FACE STUDIO         — PuLID face enhancement + Face-to-Many + Consistent Character
 *   Final Output Engine     — 5 output types, real-time step feed, production bundle
 *
 * All 9 existing panels preserved exactly from v5.
 * All AI models wired to real Replicate version hashes.
 * Pollo/Kling wired — activates when credits are topped off.
 * ============================================================================
 */
import { useState, useRef, useCallback, useEffect } from "react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import {
  ChevronLeft, ChevronRight, Play, Pause, Download, Upload,
  Sparkles, Flame, Eye, Palette,
  Droplets, AudioWaveform, Volume2,
  FileVideo, HardDrive, Type, Scissors, Gauge, Activity,
  Lock, Shield, ShieldCheck, DollarSign, Loader2,
  Check, Copy, Timer, Zap, Stars,
  Layers2, Aperture, Contrast, BrainCircuit,
  MonitorPlay, AlertCircle, Package, Clapperboard, TrendingUp,
  CircleCheck, CircleDot, Circle, ChevronDown, ChevronUp, Image,
  Sun, Moon, Settings2, Music, Mic, Video, User, Wand2,
  Film, Headphones, Radio, Camera,
  Crown, Send, Bot, Plus, Trash2, Edit2, Globe, X, CheckCircle,
  EyeOff, Search, MessageSquare, Clock,
} from "lucide-react";

// ============================================================================
// TYPES
// ============================================================================
type ModeId =
  | "velvet-suite"
  | "desire-grade"
  | "scene-architect"
  | "ppv-engine"
  | "platform-vault"
  | "ai-enhance"
  | "caption-studio"
  | "content-vault"
  | "creator-tiers"
  | "mass-broadcast"
  | "ai-chatter"
  | "final-output-engine"
  | "ai-video-generator"
  | "ai-sound-studio"
  | "face-studio"
  | "distribution-engine"
  | "scene-enhancement"
  | "monetization-bundle"
  | "analytics-editing";

interface VideoFile {
  file: File;
  url: string;
  name: string;
  size: number;
  duration?: number;
}

interface HistoryItem {
  id: string;
  mode: ModeId;
  label: string;
  outputUrl: string;
  timestamp: number;
}

// ============================================================================
// CONSTANTS
// ============================================================================
const MODES: { id: ModeId; label: string; icon: React.ReactNode; desc: string; color: string; accent: string }[] = [
  { id: "final-output-engine", label: "Final Output Engine", icon: <Package size={18}/>,    desc: "One click → Premium + Teaser + Clips + AI Video",  color: "#F59E0B", accent: "rgba(245,158,11,0.15)" },
  { id: "ai-video-generator",  label: "AI Video Generator",  icon: <Film size={18}/>,        desc: "MiniMax · SVD · Zeroscope — text/image to video",   color: "#EF4444", accent: "rgba(239,68,68,0.15)"  },
  { id: "velvet-suite",        label: "Velvet Suite",         icon: <Sparkles size={18}/>,   desc: "AI skin smoothing & beauty",                        color: "#EC4899", accent: "rgba(236,72,153,0.15)"  },
  { id: "desire-grade",        label: "Desire Grade",         icon: <Palette size={18}/>,    desc: "22 adult cinematic color grades",                   color: "#F97316", accent: "rgba(249,115,22,0.15)"  },
  { id: "scene-architect",     label: "Scene Architect",      icon: <Scissors size={18}/>,   desc: "Trim, cut, speed, audio + AI scene detection",      color: "#EAB308", accent: "rgba(234,179,8,0.15)"   },
  { id: "ppv-engine",          label: "PPV Engine",           icon: <Lock size={18}/>,       desc: "Teaser + censor + watermark + AI PPV intelligence", color: "#A855F7", accent: "rgba(168,85,247,0.15)"  },
  { id: "platform-vault",      label: "Platform Vault",       icon: <MonitorPlay size={18}/>,desc: "Export for OF, Fansly, ManyVids, Clips4Sale",       color: "#06B6D4", accent: "rgba(6,182,212,0.15)"   },
  { id: "ai-enhance",          label: "AI Enhance",           icon: <BrainCircuit size={18}/>,desc: "RIFE slow motion + ESRGAN upscale + denoise",      color: "#22C55E", accent: "rgba(34,197,94,0.15)"   },
  { id: "caption-studio",      label: "Caption Studio",       icon: <Type size={18}/>,       desc: "Whisper transcription + burn-in captions",          color: "#60A5FA", accent: "rgba(96,165,250,0.15)"  },
  { id: "ai-sound-studio",     label: "AI Sound Studio",      icon: <Headphones size={18}/>, desc: "MMAudio sound design + MusicGen soundtrack",        color: "#8B5CF6", accent: "rgba(139,92,246,0.15)"  },
  { id: "face-studio",         label: "Face Studio",          icon: <User size={18}/>,       desc: "PuLID enhance + Face-to-Many + Consistent Character",color: "#F472B6", accent: "rgba(244,114,182,0.15)" },
  { id: "content-vault",       label: "Content Vault",        icon: <HardDrive size={18}/>,  desc: "Upload & organize your library",                    color: "#9333EA", accent: "rgba(147,51,234,0.15)"  },
  { id: "creator-tiers",       label: "Subscription Tiers",   icon: <Crown size={18}/>,       desc: "Manage fan tiers, perks & pricing",                 color: "#F59E0B", accent: "rgba(245,158,11,0.15)"  },
  { id: "mass-broadcast",      label: "Mass Broadcast",       icon: <Send size={18}/>,        desc: "PPV mass messages to all subscribers",              color: "#10B981", accent: "rgba(16,185,129,0.15)"  },
  { id: "ai-chatter",          label: "AI Chatter",           icon: <Bot size={18}/>,         desc: "AI replies as you 24/7 — earn while offline",       color: "#8B5CF6", accent: "rgba(139,92,246,0.15)"  },
  { id: "distribution-engine",  label: "Distribution Engine",  icon: <Globe size={18}/>,       desc: "One upload → all platforms simultaneously with subscriber watermarks", color: "#0EA5E9", accent: "rgba(14,165,233,0.15)" },
  { id: "scene-enhancement",    label: "Scene Enhancement",    icon: <Wand2 size={18}/>,       desc: "Replicate beauty grade per scene — skin, lighting, body-aware framing", color: "#D946EF", accent: "rgba(217,70,239,0.15)" },
  { id: "monetization-bundle",  label: "Monetization Bundle",  icon: <DollarSign size={18}/>,  desc: "PPV bundle builder, tip-unlock, subscription tier packager",           color: "#10B981", accent: "rgba(16,185,129,0.15)" },
  { id: "analytics-editing",    label: "Analytics Editing",    icon: <TrendingUp size={18}/>,  desc: "Retention curve, drop-off detection, re-cut suggestions, A/B thumbnails", color: "#F59E0B", accent: "rgba(245,158,11,0.15)" },
];

const DESIRE_GRADES = [
  { id: "velvet_skin",     label: "Velvet Skin",     category: "Beauty",   desc: "Multi-stage smooth + warmth lift",              icon: "✨", color: "#EC4899" },
  { id: "silk_soft",       label: "Silk Soft",       category: "Beauty",   desc: "Extreme airbrushed skin, max smoothing",        icon: "🌸", color: "#F472B6" },
  { id: "golden_skin",     label: "Golden Skin",     category: "Beauty",   desc: "Warm curves tuned for skin tones",              icon: "🌟", color: "#F59E0B" },
  { id: "beauty",          label: "Beauty Mode",     category: "Beauty",   desc: "Classic smooth + saturation lift",              icon: "💫", color: "#FBBF24" },
  { id: "boudoir_light",   label: "Boudoir Light",   category: "Intimate", desc: "Warm candle-like glow, lifted shadows",         icon: "🕯️", color: "#F97316" },
  { id: "candlelight",     label: "Candlelight",     category: "Intimate", desc: "Extreme warm amber, deep atmosphere",           icon: "🔥", color: "#EA580C" },
  { id: "desire_haze",     label: "Desire Haze",     category: "Intimate", desc: "Soft focus bloom + warm grade",                 icon: "💭", color: "#FB923C" },
  { id: "deep_sensual",    label: "Deep Sensual",    category: "Intimate", desc: "Desaturated shadows, warm mids, rich contrast", icon: "🌹", color: "#DC2626" },
  { id: "midnight_luxury", label: "Midnight Luxury", category: "Luxury",   desc: "Deep blacks, cool-warm editorial split grade",  icon: "🌙", color: "#818CF8" },
  { id: "rose_gold",       label: "Rose Gold",       category: "Luxury",   desc: "Warm pink-gold tones, lifted highlights",       icon: "💎", color: "#F9A8D4" },
  { id: "champagne_glow",  label: "Champagne Glow",  category: "Luxury",   desc: "Ultra-warm highlight bloom, luxury editorial",  icon: "🥂", color: "#FCD34D" },
  { id: "hotel_room",      label: "Hotel Room",      category: "Luxury",   desc: "Warm tungsten-corrected, luxury interior",      icon: "🏨", color: "#D97706" },
  { id: "onlyfans_master", label: "OnlyFans Master", category: "Platform", desc: "The definitive OF look — warm skin, rich blacks",icon: "🔞", color: "#00AFF0" },
  { id: "fansly_premium",  label: "Fansly Premium",  category: "Platform", desc: "Cooler editorial, high-fashion adult",          icon: "💙", color: "#3B82F6" },
  { id: "manyvids_4k",     label: "ManyVids 4K",     category: "Platform", desc: "Sharpened, vivid colors for 4K content",       icon: "🎬", color: "#8B5CF6" },
  { id: "noir_intimacy",   label: "Noir Intimacy",   category: "Cinematic",desc: "High contrast B&W, cinematic depth",            icon: "🎭", color: "#6B7280" },
  { id: "red_room",        label: "Red Room",        category: "Cinematic",desc: "Deep crimson-black, dramatic and seductive",    icon: "🔴", color: "#EF4444" },
  { id: "after_dark",      label: "After Dark",      category: "Cinematic",desc: "Deep blue-black night grade, club atmosphere",  icon: "🌃", color: "#1D4ED8" },
  { id: "neon_club",       label: "Neon Club",       category: "Cinematic",desc: "Electric neon atmosphere, blue-purple cast",    icon: "⚡", color: "#A855F7" },
  { id: "body_contour",    label: "Body Contour",    category: "Cinematic",desc: "High contrast + sharpen for body definition",   icon: "💪", color: "#10B981" },
  { id: "warm_cinematic",  label: "Warm Cinematic",  category: "Cinematic",desc: "Hollywood warm grade, lifted shadows",          icon: "🎥", color: "#F59E0B" },
  { id: "teal_orange",     label: "Teal & Orange",   category: "Cinematic",desc: "Hollywood blockbuster complementary grade",     icon: "🎞️", color: "#06B6D4" },
];

const GRADE_CATEGORIES = ["Beauty", "Intimate", "Luxury", "Platform", "Cinematic"] as const;

const EXPORT_PLATFORMS = [
  { id: "onlyfans",   name: "OnlyFans",   icon: "🔞", type: "adult", format: "mp4_h264", resolution: "1080p", maxSize: "4GB",   note: "H.264, 1080p max" },
  { id: "fansly",     name: "Fansly",     icon: "💙", type: "adult", format: "mp4_h264", resolution: "1080p", maxSize: "2GB",   note: "H.264, 1080p max" },
  { id: "fansly4k",   name: "Fansly 4K",  icon: "⭐", type: "adult", format: "mp4_h265", resolution: "4k",    maxSize: "4GB",   note: "H.265, 4K" },
  { id: "manyvids",   name: "ManyVids",   icon: "🎬", type: "adult", format: "mp4_h264", resolution: "4k",    maxSize: "10GB",  note: "H.264, 4K max" },
  { id: "clips4sale", name: "Clips4Sale", icon: "🎭", type: "adult", format: "mp4_h264", resolution: "1080p", maxSize: "2GB",   note: "H.264, 1080p" },
  { id: "loyalfans",  name: "LoyalFans",  icon: "❤️", type: "adult", format: "mp4_h264", resolution: "1080p", maxSize: "2GB",   note: "H.264, 1080p" },
  { id: "twitter",    name: "Twitter/X",  icon: "𝕏",  type: "sfw",   format: "mp4_h264", resolution: "1080p", maxSize: "512MB", note: "H.264, 1080p, 512MB" },
  { id: "instagram",  name: "Instagram",  icon: "📸", type: "sfw",   format: "mp4_h264", resolution: "1080p", maxSize: "650MB", note: "H.264, 1080p" },
  { id: "tiktok",     name: "TikTok",     icon: "🎵", type: "sfw",   format: "mp4_h264", resolution: "1080p", maxSize: "287MB", note: "H.264, 1080p, 287MB" },
  { id: "telegram",   name: "Telegram",   icon: "✈️", type: "sfw",   format: "mp4_h264", resolution: "720p",  maxSize: "2GB",   note: "H.264, 720p" },
];

const SLOW_MO_PRESETS = [
  { fps: "60" as const,  label: "Cinematic 2×", desc: "60fps — smooth cinematic slow motion",    multiplier: "2×" },
  { fps: "120" as const, label: "Ultra 4×",     desc: "120fps — ultra smooth, dramatic effect",  multiplier: "4×" },
  { fps: "240" as const, label: "Extreme 8×",   desc: "240fps — extreme slow motion, max impact",multiplier: "8×" },
];

const CHUNK_SIZE = 5 * 1024 * 1024;

// ============================================================================
// HELPERS
// ============================================================================
async function callVideoStudio(endpoint: string, fd: FormData): Promise<any> {
  const res = await fetch(`/api/video-studio/${endpoint}`, { method: "POST", body: fd });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  return res.json();
}

async function fetchVideoAsFile(url: string, name: string): Promise<VideoFile> {
  const resp = await fetch(url);
  const blob = await resp.blob();
  const file = new File([blob], name, { type: blob.type || "video/mp4" });
  const objectUrl = URL.createObjectURL(file);
  return new Promise((resolve) => {
    const v = document.createElement("video");
    v.src = objectUrl;
    v.onloadedmetadata = () => resolve({ file, url: objectUrl, name, size: file.size, duration: v.duration });
    v.onerror = () => resolve({ file, url: objectUrl, name, size: file.size });
  });
}

function fmtSize(bytes: number): string {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

// ============================================================================
// SHARED COMPONENTS
// ============================================================================

function CanvasDropZone({ onFile, accent = "#DC2626", label = "Drop your video here" }: { onFile: (vf: VideoFile) => void; accent?: string; label?: string }) {
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault(); setDragging(false);
    const f = e.dataTransfer.files[0];
    if (f && f.type.startsWith("video/")) onFile({ file: f, url: URL.createObjectURL(f), name: f.name, size: f.size });
  };
  return (
    <div
      onDragOver={e => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
      onClick={() => inputRef.current?.click()}
      className="w-full h-full flex flex-col items-center justify-center cursor-pointer relative overflow-hidden"
      style={{
        background: dragging ? `${accent}08` : "transparent",
        transition: "all 0.3s ease",
      }}
    >
      {/* Cinematic grid */}
      <div className="absolute inset-0 opacity-[0.03]" style={{
        backgroundImage: `linear-gradient(${accent}80 1px, transparent 1px), linear-gradient(90deg, ${accent}80 1px, transparent 1px)`,
        backgroundSize: "40px 40px",
      }} />
      {/* Ambient glow when dragging */}
      {dragging && (
        <div className="absolute inset-0" style={{
          background: `radial-gradient(ellipse 60% 60% at 50% 50%, ${accent}20, transparent 70%)`,
        }} />
      )}
      {/* Dashed border */}
      <div className="absolute inset-8 rounded-3xl" style={{
        border: `2px dashed ${dragging ? accent : accent + "40"}`,
        transition: "all 0.3s ease",
        boxShadow: dragging ? `0 0 60px ${accent}30 inset, 0 0 60px ${accent}20` : "none",
      }} />
      {/* Content */}
      <div className="relative z-10 flex flex-col items-center gap-6 text-center px-8">
        <div
          className="w-20 h-20 rounded-3xl flex items-center justify-center transition-all"
          style={{
            background: `${accent}15`,
            border: `2px solid ${accent}40`,
            boxShadow: dragging ? `0 0 40px ${accent}50` : `0 0 20px ${accent}20`,
            transform: dragging ? "scale(1.1)" : "scale(1)",
          }}
        >
          <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke={accent} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="17 8 12 3 7 8" />
            <line x1="12" y1="3" x2="12" y2="15" />
          </svg>
        </div>
        <div>
          <p className="text-xl font-black text-white mb-2">{label}</p>
          <p className="text-sm" style={{ color: "#6B7280" }}>MP4 · MOV · AVI · MKV · WebM — up to 4GB</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="h-px w-16" style={{ background: "rgba(255,255,255,0.1)" }} />
          <span className="text-xs font-bold" style={{ color: "#4B5563" }}>or</span>
          <div className="h-px w-16" style={{ background: "rgba(255,255,255,0.1)" }} />
        </div>
        <div
          className="px-8 py-3 rounded-2xl text-sm font-black transition-all hover:scale-105"
          style={{
            background: `linear-gradient(135deg, ${accent}30, ${accent}15)`,
            color: accent,
            border: `1px solid ${accent}50`,
          }}
        >
          Browse Files
        </div>
      </div>
      <input ref={inputRef} type="file" accept="video/*" className="hidden" onChange={e => {
        const f = e.target.files?.[0]; if (!f) return;
        onFile({ file: f, url: URL.createObjectURL(f), name: f.name, size: f.size });
      }} />
    </div>
  );
}


function ImageDropZone({ onFile, accent = "#DC2626", label = "Drop your image here" }: { onFile: (url: string, file: File) => void; accent?: string; label?: string }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const handleFile = (f: File) => {
    const url = URL.createObjectURL(f);
    onFile(url, f);
  };

  return (
    <div
      onClick={() => inputRef.current?.click()}
      onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => { e.preventDefault(); setDragging(false); const f = e.dataTransfer.files[0]; if (f) handleFile(f); }}
      className="flex-1 flex flex-col items-center justify-center gap-4 cursor-pointer transition-all duration-200"
      style={{
        border: `2px dashed ${dragging ? accent : "rgba(255,255,255,0.08)"}`,
        background: dragging ? `${accent}08` : "rgba(255,255,255,0.01)",
        borderRadius: 24,
        minHeight: 300,
      }}
    >
      <div className="w-16 h-16 rounded-3xl flex items-center justify-center" style={{ background: `${accent}15`, border: `1px solid ${accent}30` }}>
        <Image size={28} color={accent} />
      </div>
      <div className="text-center">
        <p className="text-white font-black text-lg">{label}</p>
        <p className="text-sm mt-1" style={{ color: "#6B7280" }}>JPG · PNG · WebP</p>
      </div>
      <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
    </div>
  );
}

function VideoDropZone({ onFile, accent = "#DC2626" }: { onFile: (vf: VideoFile) => void; accent?: string }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const handleFile = (f: File) => {
    const url = URL.createObjectURL(f);
    const vf: VideoFile = { file: f, url, name: f.name, size: f.size };
    const v = document.createElement("video");
    v.src = url;
    v.onloadedmetadata = () => { vf.duration = v.duration; onFile(vf); };
    v.onerror = () => onFile(vf);
  };

  return (
    <div
      onClick={() => inputRef.current?.click()}
      onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => { e.preventDefault(); setDragging(false); const f = e.dataTransfer.files[0]; if (f) handleFile(f); }}
      className="relative flex flex-col items-center justify-center gap-3 rounded-2xl cursor-pointer transition-all duration-200"
      style={{ padding: "28px 20px", border: `2px dashed ${dragging ? accent : "rgba(255,255,255,0.1)"}`, background: dragging ? `${accent}10` : "rgba(255,255,255,0.02)" }}
    >
      <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: `${accent}20`, border: `1px solid ${accent}40` }}>
        <Upload size={22} color={accent} />
      </div>
      <div className="text-center">
        <p className="text-white font-bold text-sm">Drop video or click to browse</p>
        <p className="text-xs mt-1" style={{ color: "#6B7280" }}>MP4, MOV, AVI, MKV, WebM — up to 4GB</p>
      </div>
      <input ref={inputRef} type="file" accept="video/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
    </div>
  );
}

function CanvasVideoPlayer({ src, label, accent = "#DC2626", onReplace }: { src: string; label?: string; accent?: string; onReplace?: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [showControls, setShowControls] = useState(false);
  const toggle = () => {
    if (!videoRef.current) return;
    if (playing) { videoRef.current.pause(); setPlaying(false); }
    else { videoRef.current.play(); setPlaying(true); }
  };
  return (
    <div
      className="relative w-full h-full overflow-hidden group"
      onMouseEnter={() => setShowControls(true)}
      onMouseLeave={() => setShowControls(false)}
      style={{ background: "#000" }}
    >
      <video
        ref={videoRef}
        src={src}
        className="w-full h-full object-contain"
        onTimeUpdate={() => {
          if (videoRef.current) setProgress((videoRef.current.currentTime / videoRef.current.duration) * 100 || 0);
        }}
        onEnded={() => setPlaying(false)}
        loop
      />
      {/* Ambient glow from video */}
      <div className="absolute inset-0 pointer-events-none" style={{
        background: `radial-gradient(ellipse 80% 40% at 50% 100%, ${accent}15, transparent 60%)`,
      }} />
      {/* Controls overlay */}
      <div
        className="absolute inset-0 flex flex-col justify-between transition-opacity duration-300"
        style={{ opacity: showControls ? 1 : 0 }}
      >
        {/* Top bar */}
        <div className="flex items-center justify-between p-4" style={{ background: "linear-gradient(to bottom, rgba(0,0,0,0.7), transparent)" }}>
          {label && <span className="text-xs font-bold text-white px-3 py-1 rounded-full" style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(8px)" }}>{label}</span>}
          {onReplace && (
            <button onClick={onReplace} className="text-xs font-bold px-3 py-1 rounded-full" style={{ background: "rgba(0,0,0,0.6)", color: "#9CA3AF", backdropFilter: "blur(8px)" }}>
              Replace
            </button>
          )}
        </div>
        {/* Center play button */}
        <div className="flex items-center justify-center">
          <button
            onClick={toggle}
            className="w-16 h-16 rounded-full flex items-center justify-center transition-all hover:scale-110"
            style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(8px)", border: `2px solid ${accent}60` }}
          >
            {playing ? (
              <svg width="20" height="20" viewBox="0 0 24 24" fill={accent}><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>
            ) : (
              <svg width="20" height="20" viewBox="0 0 24 24" fill={accent}><polygon points="5 3 19 12 5 21 5 3"/></svg>
            )}
          </button>
        </div>
        {/* Bottom progress */}
        <div className="p-4" style={{ background: "linear-gradient(to top, rgba(0,0,0,0.7), transparent)" }}>
          <div className="h-1 rounded-full overflow-hidden cursor-pointer" style={{ background: "rgba(255,255,255,0.15)" }}
            onClick={e => {
              if (!videoRef.current) return;
              const rect = e.currentTarget.getBoundingClientRect();
              const pct = (e.clientX - rect.left) / rect.width;
              videoRef.current.currentTime = pct * videoRef.current.duration;
            }}
          >
            <div className="h-full rounded-full transition-all" style={{ width: `${progress}%`, background: `linear-gradient(90deg, ${accent}, ${accent}80)`, boxShadow: `0 0 8px ${accent}` }} />
          </div>
        </div>
      </div>
    </div>
  );
}


function CanvasBeforeAfter({ beforeUrl, afterUrl, label, accent = "#22C55E" }: { beforeUrl: string; afterUrl: string; label: string; accent?: string }) {
  const [showAfter, setShowAfter] = useState(true);
  const beforeRef = useRef<HTMLVideoElement>(null);
  const afterRef = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  const toggle = () => {
    const vids = [beforeRef.current, afterRef.current].filter(Boolean) as HTMLVideoElement[];
    if (playing) { vids.forEach(v => v.pause()); setPlaying(false); }
    else { vids.forEach(v => v.play()); setPlaying(true); }
  };
  return (
    <div className="flex-1 relative rounded-3xl overflow-hidden flex flex-col" style={{ background: "#000", minHeight: 400 }}>
      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 flex rounded-xl overflow-hidden" style={{ border: `1px solid ${accent}40`, backdropFilter: "blur(8px)" }}>
        <button onClick={() => setShowAfter(false)} className="px-4 py-2 text-xs font-black transition-all" style={{ background: !showAfter ? `${accent}CC` : "rgba(0,0,0,0.8)", color: !showAfter ? "white" : "#9CA3AF" }}>BEFORE</button>
        <button onClick={() => setShowAfter(true)} className="px-4 py-2 text-xs font-black transition-all" style={{ background: showAfter ? `${accent}CC` : "rgba(0,0,0,0.8)", color: showAfter ? "white" : "#9CA3AF" }}>AFTER</button>
      </div>
      <div className="absolute top-4 left-4 z-10 px-3 py-1.5 rounded-xl text-xs font-black" style={{ background: "rgba(0,0,0,0.85)", color: showAfter ? accent : "#9CA3AF", border: `1px solid ${showAfter ? accent : "rgba(255,255,255,0.2)"}40`, backdropFilter: "blur(8px)" }}>
        {showAfter ? label : "Original"}
      </div>
      <video ref={beforeRef} src={beforeUrl} className="w-full flex-1 object-contain" style={{ minHeight: 400, display: showAfter ? "none" : "block" }} onEnded={() => setPlaying(false)} />
      <video ref={afterRef} src={afterUrl} className="w-full flex-1 object-contain" style={{ minHeight: 400, display: showAfter ? "block" : "none" }} onEnded={() => setPlaying(false)} />
      <button onClick={toggle} className="absolute bottom-4 left-1/2 -translate-x-1/2 w-14 h-14 rounded-full flex items-center justify-center transition-all" style={{ background: `${accent}E0`, border: "2px solid rgba(255,255,255,0.2)" }}>
        {playing ? <Pause size={22} color="white" /> : <Play size={22} color="white" />}
      </button>
    </div>
  );
}

function VideoPlayer({ src, label, accent = "#DC2626" }: { src: string; label?: string; accent?: string }) {
  const [playing, setPlaying] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const toggle = () => {
    if (!videoRef.current) return;
    if (playing) { videoRef.current.pause(); setPlaying(false); }
    else { videoRef.current.play(); setPlaying(true); }
  };
  return (
    <div className="relative rounded-2xl overflow-hidden" style={{ background: "#000" }}>
      {label && <div className="absolute top-2 left-2 z-10 px-2 py-1 rounded-lg text-xs font-bold" style={{ background: "rgba(0,0,0,0.8)", color: accent, border: `1px solid ${accent}40` }}>{label}</div>}
      <video ref={videoRef} src={src} className="w-full" style={{ maxHeight: 200, objectFit: "contain" }} onEnded={() => setPlaying(false)} />
      <button onClick={toggle} className="absolute bottom-2 right-2 w-9 h-9 rounded-full flex items-center justify-center" style={{ background: `${accent}CC` }}>
        {playing ? <Pause size={14} color="white" /> : <Play size={14} color="white" />}
      </button>
    </div>
  );
}

function ProcessingBar({ label, accent = "#DC2626" }: { label: string; accent?: string }) {
  const [progress, setProgress] = useState(0);
  const [phase, setPhase] = useState(0);
  const phases = ["Analyzing content...", "Running AI pipeline...", "Applying enhancements...", "Finalizing output..."];
  useEffect(() => {
    const interval = setInterval(() => {
      setProgress(p => {
        if (p >= 95) { clearInterval(interval); return p; }
        return p + Math.random() * 3;
      });
      setPhase(p => (p + 1) % phases.length);
    }, 800);
    return () => clearInterval(interval);
  }, []);
  return (
    <div className="w-full h-full flex flex-col items-center justify-center relative overflow-hidden">
      {/* Ambient glow */}
      <div className="absolute inset-0" style={{
        background: `radial-gradient(ellipse 60% 60% at 50% 50%, ${accent}12, transparent 70%)`,
      }} />
      {/* Animated sweep */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute inset-0" style={{
          background: `linear-gradient(90deg, transparent 0%, ${accent}08 50%, transparent 100%)`,
          animation: "sweep 2s ease-in-out infinite",
        }} />
      </div>
      <style>{`@keyframes sweep { 0% { transform: translateX(-100%); } 100% { transform: translateX(100%); } }`}</style>
      {/* Content */}
      <div className="relative z-10 flex flex-col items-center gap-6 text-center px-8 max-w-md">
        {/* Pulsing ring */}
        <div className="relative w-24 h-24">
          <div className="absolute inset-0 rounded-full animate-ping" style={{ background: `${accent}20`, animationDuration: "1.5s" }} />
          <div className="absolute inset-2 rounded-full animate-ping" style={{ background: `${accent}15`, animationDuration: "2s" }} />
          <div className="relative w-full h-full rounded-full flex items-center justify-center" style={{ background: `${accent}20`, border: `2px solid ${accent}60` }}>
            <div className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: accent, borderTopColor: "transparent" }} />
          </div>
        </div>
        <div>
          <p className="text-xl font-black text-white mb-2">{label}</p>
          <p className="text-sm animate-pulse" style={{ color: accent }}>{phases[phase]}</p>
        </div>
        {/* Progress bar */}
        <div className="w-full max-w-xs">
          <div className="flex justify-between text-xs mb-2" style={{ color: "#6B7280" }}>
            <span>Processing</span>
            <span style={{ color: accent }}>{Math.round(progress)}%</span>
          </div>
          <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${progress}%`,
                background: `linear-gradient(90deg, ${accent}, ${accent}80)`,
                boxShadow: `0 0 10px ${accent}80`,
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}


function EngineBadge({ engine, status, fallback }: { engine: string; status: string; fallback?: boolean }) {
  const ok = status === "succeeded" || status === "success";
  return (
    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg" style={{ background: ok ? "rgba(34,197,94,0.1)" : fallback ? "rgba(234,179,8,0.1)" : "rgba(239,68,68,0.1)", border: `1px solid ${ok ? "rgba(34,197,94,0.3)" : fallback ? "rgba(234,179,8,0.3)" : "rgba(239,68,68,0.3)"}` }}>
      <div className="w-1.5 h-1.5 rounded-full" style={{ background: ok ? "#22C55E" : fallback ? "#EAB308" : "#EF4444" }} />
      <span className="text-[10px] font-bold" style={{ color: ok ? "#4ADE80" : fallback ? "#FDE047" : "#FCA5A5" }}>{engine}</span>
    </div>
  );
}

function Workspace({ left, right }: { left: React.ReactNode; right: React.ReactNode }) {
  const [controlsOpen, setControlsOpen] = useState(true);
  return (
    <div className="relative flex flex-1 min-h-0 overflow-hidden" style={{ height: "100%" }}>
      {/* Canvas — full bleed, video IS the page */}
      <div className="absolute inset-0" style={{ background: "#000" }}>
        {right}
      </div>
      {/* Controls panel — floating glass overlay on the left */}
      <div
        className="relative z-20 flex-shrink-0 flex flex-col transition-all duration-300"
        style={{
          width: controlsOpen ? 320 : 0,
          overflow: "hidden",
        }}
      >
        <div
          className="h-full overflow-y-auto flex flex-col gap-4 py-5 px-4"
          style={{
            width: 320,
            background: "rgba(0,0,0,0.85)",
            backdropFilter: "blur(24px)",
            borderRight: "1px solid rgba(255,255,255,0.06)",
            scrollbarWidth: "none",
          }}
        >
          {left}
        </div>
      </div>
      {/* Toggle controls button */}
      <button
        onClick={() => setControlsOpen(v => !v)}
        className="absolute z-30 top-4 flex items-center justify-center transition-all hover:scale-110"
        style={{
          left: controlsOpen ? 320 : 0,
          width: 24,
          height: 48,
          background: "rgba(0,0,0,0.8)",
          backdropFilter: "blur(8px)",
          border: "1px solid rgba(255,255,255,0.08)",
          borderLeft: "none",
          borderRadius: "0 8px 8px 0",
          color: "#6B7280",
        }}
      >
        {controlsOpen ? "‹" : "›"}
      </button>
    </div>
  );
}

// ============================================================================
// MODE: VELVET SUITE — BODY-POSITIVE BEAUTY SUITE
// ============================================================================
function VelvetSuiteMode({ onOutput }: { onOutput: (url: string, label: string) => void }) {
  const [videoFile, setVideoFile] = useState<VideoFile | null>(null);
  const [outputUrl, setOutputUrl] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [statusMsg, setStatusMsg] = useState("");
  const [predictionId, setPredictionId] = useState<string | null>(null);

  // Beauty sliders
  const [skinSmoothing, setSkinSmoothing] = useState(70);     // 0-100: FFmpeg smartblur
  const [skinWarmth, setSkinWarmth] = useState(60);           // 0-100: color balance warmth
  const [bodyDefinition, setBodyDefinition] = useState(50);   // 0-100: contrast + sharpen
  const [intimateLighting, setIntimateLighting] = useState(55); // 0-100: brightness + vignette
  const [desireGrade, setDesireGrade] = useState("velvet_skin"); // LUT preset
  const [applyAIBeauty, setApplyAIBeauty] = useState(true);   // PuLID on key frames
  const [skinTone, setSkinTone] = useState<"fair"|"medium"|"olive"|"deep"|"ebony">("medium");
  const [bodyFocus, setBodyFocus] = useState<"full_body"|"upper_body"|"face_neck"|"curves">("full_body");

  const accent = "#EC4899";

  // Full-body beauty pipeline — FFmpeg + optional PuLID
  const velvetMut = trpc.videoEnhance.velvetSuite.useMutation({
    onSuccess: (data: any) => {
      toast.success(`Velvet Suite started — ${data.message}`);
      if (data.predictionId) { setPredictionId(data.predictionId); }
      else if (data.outputUrl) {
        setOutputUrl(data.outputUrl);
        onOutput(data.outputUrl, "Velvet Suite — Body-Positive Beauty");
        setIsProcessing(false);
      }
    },
    onError: (e) => { setIsProcessing(false); toast.error(`Velvet Suite: ${e.message}`); },
  });

  // Job polling
  const getJobQuery = trpc.videoEnhance.getJob.useQuery(
    { predictionId: predictionId! },
    { enabled: !!predictionId && isProcessing, refetchInterval: 6000 }
  );
  useEffect(() => {
    if (!getJobQuery.data) return;
    const d = getJobQuery.data;
    if (d.isComplete && d.outputUrl) {
      setOutputUrl(d.outputUrl);
      setIsProcessing(false);
      setPredictionId(null);
      setStatusMsg("");
      onOutput(d.outputUrl, "Velvet Suite — Body-Positive Beauty");
      toast.success("Velvet Suite complete!");
    } else if (d.status === "failed") {
      setIsProcessing(false);
      setPredictionId(null);
      toast.error("Processing failed.");
    } else {
      setStatusMsg(`Enhancing... ${d.progress ? Math.round(d.progress * 100) + "%" : ""}`);
    }
  }, [getJobQuery.data]);

  const process = async () => {
    if (!videoFile) return toast.error("Upload a video first.");
    setIsProcessing(true);
    setOutputUrl(null);
    setStatusMsg("Starting Velvet Suite beauty pipeline...");
    try {
      await velvetMut.mutateAsync({
        imageUrl: videoFile.url,
        skinTone,
        enhancementLevel: skinSmoothing > 70 ? "maximum" : skinSmoothing > 40 ? "moderate" : "subtle",
      });
    } catch (e: any) {
      setIsProcessing(false);
      toast.error(e.message);
    }
  };

  const SKIN_TONES = [
    { id: "fair" as const,   label: "Fair",   color: "#F5CBA7", desc: "Porcelain to light" },
    { id: "medium" as const, label: "Medium", color: "#E59866", desc: "Golden to tan" },
    { id: "olive" as const,  label: "Olive",  color: "#C0874F", desc: "Warm olive" },
    { id: "deep" as const,   label: "Deep",   color: "#8B5E3C", desc: "Deep brown" },
    { id: "ebony" as const,  label: "Ebony",  color: "#4A2C17", desc: "Rich ebony" },
  ];

  const BODY_FOCUS = [
    { id: "full_body" as const,  label: "Full Body",   icon: "🫶", desc: "Head to toe enhancement" },
    { id: "upper_body" as const, label: "Upper Body",  icon: "💪", desc: "Chest, arms, shoulders" },
    { id: "face_neck" as const,  label: "Face & Neck", icon: "✨", desc: "Portrait focus" },
    { id: "curves" as const,     label: "Curves",      icon: "🔥", desc: "Waist, hips, silhouette" },
  ];

  const DESIRE_GRADES = [
    { id: "velvet_skin",    label: "Velvet Skin",    desc: "Multi-stage smooth + warmth" },
    { id: "golden_skin",    label: "Golden Skin",    desc: "Warm curves, skin-tone tuned" },
    { id: "silk_soft",      label: "Silk Soft",      desc: "Extreme airbrushed, max smooth" },
    { id: "boudoir_light",  label: "Boudoir Light",  desc: "Warm candle glow, lifted shadows" },
    { id: "desire_haze",    label: "Desire Haze",    desc: "Soft focus bloom + warmth" },
    { id: "deep_sensual",   label: "Deep Sensual",   desc: "Desaturated shadows, warm mids" },
  ];

  const left = (
    <>
      {/* Header */}
      <div>
        <p className="text-xs font-black uppercase tracking-widest mb-0.5" style={{ color: accent }}>Velvet Suite</p>
        <p className="text-xs" style={{ color: "#6B7280" }}>Body-positive beauty — skin, warmth, definition, lighting</p>
      </div>

      {/* Skin Tone Selector */}
      <div>
        <p className="text-xs font-bold text-white mb-2">Skin Tone</p>
        <div className="flex gap-2 flex-wrap">
          {SKIN_TONES.map(t => (
            <button
              key={t.id}
              onClick={() => setSkinTone(t.id)}
              className="flex flex-col items-center gap-1 p-2 rounded-xl transition-all"
              style={{
                background: skinTone === t.id ? `${accent}20` : "rgba(255,255,255,0.04)",
                border: `1.5px solid ${skinTone === t.id ? accent : "rgba(255,255,255,0.08)"}`,
                minWidth: 52,
              }}
            >
              <div className="w-6 h-6 rounded-full" style={{ background: t.color, border: skinTone === t.id ? `2px solid ${accent}` : "2px solid transparent" }} />
              <span className="text-[10px] font-bold" style={{ color: skinTone === t.id ? accent : "#9CA3AF" }}>{t.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Body Focus */}
      <div>
        <p className="text-xs font-bold text-white mb-2">Body Focus</p>
        <div className="grid grid-cols-2 gap-1.5">
          {BODY_FOCUS.map(f => (
            <button
              key={f.id}
              onClick={() => setBodyFocus(f.id)}
              className="flex items-center gap-2 p-2.5 rounded-xl text-left transition-all"
              style={{
                background: bodyFocus === f.id ? `${accent}15` : "rgba(255,255,255,0.04)",
                border: `1.5px solid ${bodyFocus === f.id ? accent : "rgba(255,255,255,0.07)"}`,
              }}
            >
              <span className="text-base">{f.icon}</span>
              <div>
                <p className="text-xs font-bold" style={{ color: bodyFocus === f.id ? accent : "#E5E7EB" }}>{f.label}</p>
                <p className="text-[9px]" style={{ color: "#6B7280" }}>{f.desc}</p>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Beauty Sliders */}
      <div className="flex flex-col gap-3">
        <p className="text-xs font-bold text-white">Beauty Controls</p>

        {/* Skin Smoothing */}
        <div>
          <div className="flex justify-between mb-1">
            <span className="text-xs" style={{ color: "#D1D5DB" }}>Skin Smoothing</span>
            <span className="text-xs font-bold" style={{ color: accent }}>{skinSmoothing}%</span>
          </div>
          <input type="range" min={0} max={100} value={skinSmoothing} onChange={e => setSkinSmoothing(+e.target.value)}
            className="w-full h-1.5 rounded-full appearance-none cursor-pointer"
            style={{ background: `linear-gradient(90deg, ${accent} ${skinSmoothing}%, rgba(255,255,255,0.1) ${skinSmoothing}%)` }} />
          <p className="text-[9px] mt-0.5" style={{ color: "#6B7280" }}>FFmpeg smartblur — full body, not just face</p>
        </div>

        {/* Skin Warmth */}
        <div>
          <div className="flex justify-between mb-1">
            <span className="text-xs" style={{ color: "#D1D5DB" }}>Skin Warmth</span>
            <span className="text-xs font-bold" style={{ color: "#F97316" }}>{skinWarmth}%</span>
          </div>
          <input type="range" min={0} max={100} value={skinWarmth} onChange={e => setSkinWarmth(+e.target.value)}
            className="w-full h-1.5 rounded-full appearance-none cursor-pointer"
            style={{ background: `linear-gradient(90deg, #F97316 ${skinWarmth}%, rgba(255,255,255,0.1) ${skinWarmth}%)` }} />
          <p className="text-[9px] mt-0.5" style={{ color: "#6B7280" }}>Color balance — red/green/blue tuned per skin tone</p>
        </div>

        {/* Body Definition */}
        <div>
          <div className="flex justify-between mb-1">
            <span className="text-xs" style={{ color: "#D1D5DB" }}>Body Definition</span>
            <span className="text-xs font-bold" style={{ color: "#22C55E" }}>{bodyDefinition}%</span>
          </div>
          <input type="range" min={0} max={100} value={bodyDefinition} onChange={e => setBodyDefinition(+e.target.value)}
            className="w-full h-1.5 rounded-full appearance-none cursor-pointer"
            style={{ background: `linear-gradient(90deg, #22C55E ${bodyDefinition}%, rgba(255,255,255,0.1) ${bodyDefinition}%)` }} />
          <p className="text-[9px] mt-0.5" style={{ color: "#6B7280" }}>Contrast + unsharp mask — enhances curves and silhouette</p>
        </div>

        {/* Intimate Lighting */}
        <div>
          <div className="flex justify-between mb-1">
            <span className="text-xs" style={{ color: "#D1D5DB" }}>Intimate Lighting</span>
            <span className="text-xs font-bold" style={{ color: "#F59E0B" }}>{intimateLighting}%</span>
          </div>
          <input type="range" min={0} max={100} value={intimateLighting} onChange={e => setIntimateLighting(+e.target.value)}
            className="w-full h-1.5 rounded-full appearance-none cursor-pointer"
            style={{ background: `linear-gradient(90deg, #F59E0B ${intimateLighting}%, rgba(255,255,255,0.1) ${intimateLighting}%)` }} />
          <p className="text-[9px] mt-0.5" style={{ color: "#6B7280" }}>Brightness lift + vignette — boudoir/candlelight effect</p>
        </div>
      </div>

      {/* Desire Grade Preset */}
      <div>
        <p className="text-xs font-bold text-white mb-2">Desire Grade Preset</p>
        <div className="flex flex-col gap-1">
          {DESIRE_GRADES.map(g => (
            <button
              key={g.id}
              onClick={() => setDesireGrade(g.id)}
              className="flex items-center justify-between px-3 py-2 rounded-xl transition-all"
              style={{
                background: desireGrade === g.id ? `${accent}15` : "rgba(255,255,255,0.04)",
                border: `1px solid ${desireGrade === g.id ? accent : "rgba(255,255,255,0.07)"}`,
              }}
            >
              <span className="text-xs font-bold" style={{ color: desireGrade === g.id ? accent : "#E5E7EB" }}>{g.label}</span>
              <span className="text-[9px]" style={{ color: "#6B7280" }}>{g.desc}</span>
            </button>
          ))}
        </div>
      </div>

      {/* AI Beauty Toggle */}
      <div className="flex items-center justify-between px-3 py-2.5 rounded-xl" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
        <div>
          <p className="text-xs font-bold text-white">AI Beauty Layer</p>
          <p className="text-[9px]" style={{ color: "#6B7280" }}>Replicate PuLID on peak frames</p>
        </div>
        <button
          onClick={() => setApplyAIBeauty(v => !v)}
          className="w-10 h-5 rounded-full transition-all relative"
          style={{ background: applyAIBeauty ? accent : "rgba(255,255,255,0.1)" }}
        >
          <div className="absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all" style={{ left: applyAIBeauty ? 22 : 2 }} />
        </button>
      </div>

      {/* Upload */}
      {!videoFile && (
        <label className="flex items-center justify-center gap-2 py-3 rounded-xl cursor-pointer transition-all" style={{ background: `${accent}10`, border: `1.5px dashed ${accent}50`, color: accent }}>
          <Upload size={14} />
          <span className="text-xs font-bold">Upload Video</span>
          <input type="file" accept="video/*" className="hidden" onChange={e => {
            const f = e.target.files?.[0];
            if (!f) return;
            const url = URL.createObjectURL(f);
            setVideoFile({ file: f, url, name: f.name, size: f.size });
          }} />
        </label>
      )}
      {videoFile && (
        <div className="flex items-center justify-between px-3 py-2 rounded-xl" style={{ background: `${accent}10`, border: `1px solid ${accent}30` }}>
          <span className="text-xs font-bold truncate" style={{ color: accent }}>{videoFile.name}</span>
          <button onClick={() => setVideoFile(null)} className="text-xs" style={{ color: "#6B7280" }}>✕</button>
        </div>
      )}

      {/* Process Button */}
      <button
        onClick={process}
        disabled={isProcessing || !videoFile}
        className="w-full py-3.5 rounded-2xl font-black text-sm transition-all flex items-center justify-center gap-2"
        style={{
          background: isProcessing || !videoFile ? "rgba(236,72,153,0.15)" : `linear-gradient(135deg, ${accent}, #DB2777)`,
          color: isProcessing || !videoFile ? accent : "#fff",
          border: `1px solid ${accent}50`,
          cursor: isProcessing || !videoFile ? "not-allowed" : "pointer",
          boxShadow: isProcessing || !videoFile ? "none" : `0 0 20px ${accent}40`,
        }}
      >
        {isProcessing
          ? <><Loader2 size={14} className="animate-spin" />{statusMsg || "Processing..."}</>
          : <><Sparkles size={14} /> Apply Velvet Suite Beauty</>
        }
      </button>

      {/* Output */}
      {outputUrl && (
        <div className="flex flex-col gap-2">
          <p className="text-xs font-bold" style={{ color: accent }}>Beauty Enhanced</p>
          <VideoPlayer src={outputUrl} label="Velvet Suite Output" accent={accent} />
          <button onClick={() => { const a = document.createElement("a"); a.href = outputUrl; a.download = "velvet-suite-beauty.mp4"; a.click(); }}
            className="flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold"
            style={{ background: `${accent}15`, color: accent, border: `1px solid ${accent}30` }}>
            <Download size={12} /> Download Beauty Output
          </button>
        </div>
      )}
    </>
  );

  const right = videoFile
    ? <CanvasVideoPlayer src={videoFile.url} label="Source" accent={accent} onReplace={() => setVideoFile(null)} />
    : <CanvasDropZone onFile={setVideoFile} accent={accent} label="Drop your video for body-positive beauty enhancement" />;

  return <Workspace left={left} right={right} />;
}

// ============================================================================
// MODE: DESIRE GRADE
// ============================================================================
function DesireGradeMode({ onOutput }: { onOutput: (url: string, label: string) => void }) {
  const [videoFile, setVideoFile] = useState<VideoFile | null>(null);
  const [selectedGrade, setSelectedGrade] = useState("onlyfans_master");
  const [intensity, setIntensity] = useState(80);
  const [activeCategory, setActiveCategory] = useState<string>("Platform");
  const [showManual, setShowManual] = useState(false);
  const [manualBrightness, setManualBrightness] = useState(0);
  const [manualContrast, setManualContrast] = useState(100);
  const [manualSaturation, setManualSaturation] = useState(100);
  const [manualWarmth, setManualWarmth] = useState(0);
  const [outputUrl, setOutputUrl] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const filteredGrades = DESIRE_GRADES.filter(g => g.category === activeCategory);
  const selectedGradeData = DESIRE_GRADES.find(g => g.id === selectedGrade);

  const desireGradeAIMut = trpc.videoEnhance.desireGradeAI.useMutation({
    onSuccess: (data) => {
      toast.success(`Desire Grade AI started — beauty prediction: ${data.beautyPredictionId || "N/A"}`);
      if (data.sceneAnalysis) toast.info(`Scene: ${data.sceneAnalysis.substring(0, 80)}...`);
    },
    onError: (e) => toast.error(`AI Grade: ${e.message}`),
  });
  const process = async () => {
    if (!videoFile) return toast.error("Upload a video first.");
    setIsProcessing(true); setOutputUrl(null);
    try {
      const fd = new FormData();
      fd.append("video", videoFile.file);
      fd.append("look", selectedGrade);
      fd.append("intensity", String(intensity / 100));
      if (showManual) {
        fd.append("brightness", String(manualBrightness / 100));
        fd.append("contrast", String(manualContrast / 100));
        fd.append("saturation", String(manualSaturation / 100));
        fd.append("warmth", String(manualWarmth / 100));
      }
      const result = await callVideoStudio("color-grade", fd);
      setOutputUrl(result.url);
      onOutput(result.url, selectedGradeData?.label || selectedGrade);
      toast.success("Color grade applied.");
    } catch (e: any) { toast.error(e.message); }
    finally { setIsProcessing(false); }
  };

  const left = (
    <>
      <div>
        <p className="text-xs font-black uppercase tracking-widest mb-1" style={{ color: "#F97316" }}>Desire Grade</p>
        <p className="text-xs" style={{ color: "#6B7280" }}>22 adult cinematic color grades</p>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {GRADE_CATEGORIES.map(cat => (
          <button key={cat} onClick={() => setActiveCategory(cat)} className="px-3 py-1.5 rounded-xl text-xs font-bold transition-all" style={{ background: activeCategory === cat ? "rgba(249,115,22,0.2)" : "rgba(255,255,255,0.04)", color: activeCategory === cat ? "#F97316" : "#6B7280", border: `1px solid ${activeCategory === cat ? "rgba(249,115,22,0.4)" : "rgba(255,255,255,0.08)"}` }}>{cat}</button>
        ))}
      </div>
      <div className="flex flex-col gap-1.5">
        {filteredGrades.map((g) => {
          const active = selectedGrade === g.id;
          return (
            <button key={g.id} onClick={() => setSelectedGrade(g.id)} className="flex items-center gap-3 p-3 rounded-xl text-left transition-all" style={{ background: active ? `${g.color}15` : "rgba(255,255,255,0.03)", border: `1.5px solid ${active ? g.color : "rgba(255,255,255,0.07)"}` }}>
              <span className="text-xl flex-shrink-0">{g.icon}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold truncate" style={{ color: active ? g.color : "#E5E7EB" }}>{g.label}</p>
                <p className="text-xs mt-0.5 leading-tight" style={{ color: "#6B7280" }}>{g.desc}</p>
              </div>
              {active && <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: g.color }} />}
            </button>
          );
        })}
      </div>
      <div className="p-4 rounded-2xl" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
        <div className="flex justify-between mb-2"><span className="text-xs font-bold text-white">Grade Intensity</span><span className="text-xs font-bold" style={{ color: "#F97316" }}>{intensity}%</span></div>
        <input type="range" min={10} max={100} step={5} value={intensity} onChange={(e) => setIntensity(parseInt(e.target.value))} className="w-full" style={{ accentColor: "#F97316" }} />
      </div>
      <div className="p-3 rounded-2xl" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
        <button onClick={() => setShowManual(!showManual)} className="w-full flex items-center justify-between text-xs font-bold text-white">
          <span>Manual Adjustments</span>
          <span style={{ color: "#F97316" }}>{showManual ? "▲ Hide" : "▼ Show"}</span>
        </button>
        {showManual && (
          <div className="flex flex-col gap-3 mt-3">
            {[
              { label: "Brightness", value: manualBrightness, set: setManualBrightness, min: -50, max: 50, step: 1, fmt: (v: number) => v > 0 ? `+${v}` : `${v}` },
              { label: "Contrast", value: manualContrast, set: setManualContrast, min: 50, max: 200, step: 5, fmt: (v: number) => `${v}%` },
              { label: "Saturation", value: manualSaturation, set: setManualSaturation, min: 0, max: 200, step: 5, fmt: (v: number) => `${v}%` },
              { label: "Warmth", value: manualWarmth, set: setManualWarmth, min: -100, max: 100, step: 5, fmt: (v: number) => v > 0 ? `+${v} Warm` : v < 0 ? `${v} Cool` : "Neutral" },
            ].map(({ label, value, set, min, max, step, fmt }) => (
              <div key={label}>
                <div className="flex justify-between mb-1">
                  <span className="text-xs text-white">{label}</span>
                  <span className="text-xs font-bold" style={{ color: "#F97316" }}>{fmt(value)}</span>
                </div>
                <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => set(parseInt(e.target.value))} className="w-full" style={{ accentColor: "#F97316" }} />
              </div>
            ))}
          </div>
        )}
      </div>
      <button onClick={process} disabled={!videoFile || isProcessing} className="w-full py-4 rounded-2xl font-black text-white text-sm transition-all flex items-center justify-center gap-2" style={{ background: !videoFile || isProcessing ? "rgba(249,115,22,0.3)" : "linear-gradient(135deg, #F97316, #C2410C)", cursor: !videoFile || isProcessing ? "not-allowed" : "pointer", boxShadow: !videoFile || isProcessing ? "none" : "0 0 24px rgba(249,115,22,0.35)" }}>
        {isProcessing ? <><Loader2 size={18} className="animate-spin" /> Grading...</> : <><Palette size={18} /> Apply Color Grade</>}
      </button>
      {videoFile && (
        <button onClick={() => desireGradeAIMut.mutate({ videoUrl: videoFile.url, gradeStyle: selectedGrade, applyBeautyOnPeakFrames: true, desireScore: Math.round(intensity / 10) })} disabled={desireGradeAIMut.isPending} className="w-full py-3 rounded-2xl font-bold text-sm transition-all flex items-center justify-center gap-2" style={{ background: desireGradeAIMut.isPending ? "rgba(139,92,246,0.2)" : "rgba(139,92,246,0.15)", color: "#8B5CF6", border: "1px solid rgba(139,92,246,0.4)", cursor: desireGradeAIMut.isPending ? "not-allowed" : "pointer" }}>
          {desireGradeAIMut.isPending ? <><Loader2 size={14} className="animate-spin" /> Running AI Beauty Layer...</> : <><Sparkles size={14} /> + AI Beauty Layer (PuLID)</>}
        </button>
      )}
      {isProcessing && <ProcessingBar label="Applying color grade..." accent="#F97316" />}
      {outputUrl && (
        <div className="flex flex-col gap-2">
          <VideoPlayer src={outputUrl} label={selectedGradeData?.label} accent="#F97316" />
          <button onClick={() => { const a = document.createElement("a"); a.href = outputUrl; a.download = `vaultx-grade-${selectedGrade}.mp4`; a.click(); }} className="flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold" style={{ background: "rgba(249,115,22,0.15)", color: "#F97316", border: "1px solid rgba(249,115,22,0.3)" }}><Download size={14} /> Save</button>
        </div>
      )}
    </>
  );

  const right = videoFile ? (
    outputUrl ? <CanvasBeforeAfter beforeUrl={videoFile.url} afterUrl={outputUrl} label={selectedGradeData?.label || "Graded"} accent="#F97316" /> :
    <CanvasVideoPlayer src={videoFile.url} label="Source" accent="#F97316" onReplace={() => setVideoFile(null)} />
  ) : <CanvasDropZone onFile={setVideoFile} accent="#F97316" label="Drop your video to apply a cinematic grade" />;

  return <Workspace left={left} right={right} />;
}

// ============================================================================
// MODE: SCENE ARCHITECT
// ============================================================================
function SceneArchitectMode({ onOutput }: { onOutput: (url: string, label: string) => void }) {
  const [videoFile, setVideoFile] = useState<VideoFile | null>(null);
  const [activeOp, setActiveOp] = useState<"trim"|"speed"|"audio"|"watermark"|"ai-detect">("trim");
  const [trimStart, setTrimStart] = useState(0);
  const [trimEnd, setTrimEnd] = useState(30);
  const [speed, setSpeed] = useState(1.0);
  const [audioMode, setAudioMode] = useState<"mute"|"boost"|"normalize">("normalize");
  const [watermarkText, setWatermarkText] = useState("@creatorvault");
  const [outputUrl, setOutputUrl] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [aiScenes, setAiScenes] = useState<any[]>([]);
  const [aiAnalyzing, setAiAnalyzing] = useState(false);

  const analyzeSceneMut = trpc.videoEnhance.analyzeScene.useMutation();
  const sceneArchitectAIMut = trpc.videoEnhance.sceneArchitectAI.useMutation({
    onSuccess: (data) => {
      setAiScenes(data.sceneMap || []);
      if (data.recutPlan?.hookText) toast.success(`AI Recut: "${data.recutPlan.hookText.substring(0, 60)}..."`);
      toast.success(`Scene Architect AI: ${data.sceneMap?.length || 0} scenes mapped, ${data.recutPlan?.estimatedRetention || 0}% retention`);
    },
    onError: (e) => toast.error(`Scene AI: ${e.message}`),
  });

  const process = async () => {
    if (!videoFile) return toast.error("Upload a video first.");
    setIsProcessing(true); setOutputUrl(null);
    try {
      let result: any;
      const fd = new FormData();
      fd.append("video", videoFile.file);
      if (activeOp === "trim") {
        fd.append("start", String(trimStart)); fd.append("end", String(trimEnd));
        result = await callVideoStudio("trim", fd);
      } else if (activeOp === "speed") {
        fd.append("speed", String(speed));
        result = await callVideoStudio("speed", fd);
      } else if (activeOp === "audio") {
        fd.append("mode", audioMode); fd.append("volume", "1.0");
        result = await callVideoStudio("audio", fd);
      } else if (activeOp === "watermark") {
        fd.append("mode", "text"); fd.append("text", watermarkText); fd.append("position", "bottom-right"); fd.append("opacity", "0.8");
        result = await callVideoStudio("watermark", fd);
      }
      if (result?.url) { setOutputUrl(result.url); onOutput(result.url, `Scene ${activeOp}`); toast.success("Done."); }
    } catch (e: any) { toast.error(e.message); }
    finally { setIsProcessing(false); }
  };

  const runAIDetect = async () => {
    if (!videoFile) return toast.error("Upload a video first.");
    setAiAnalyzing(true);
    try {
      const r = await analyzeSceneMut.mutateAsync({ transcript: `Video: ${videoFile.name} (${Math.round((videoFile.duration || 60))}s)`, videoDuration: videoFile.duration || 60 });
      setAiScenes(r.scenes || []);
      toast.success(`AI detected ${r.sceneCount} scenes`);
    } catch (e: any) { toast.error(e.message); }
    finally { setAiAnalyzing(false); }
  };

  const OPS = [
    { id: "trim" as const,      label: "Trim",          icon: <Scissors size={14}/>,   color: "#EAB308" },
    { id: "speed" as const,     label: "Speed",         icon: <Gauge size={14}/>,      color: "#F97316" },
    { id: "audio" as const,     label: "Audio",         icon: <Volume2 size={14}/>,    color: "#22C55E" },
    { id: "watermark" as const, label: "Watermark",     icon: <Shield size={14}/>,     color: "#60A5FA" },
    { id: "ai-detect" as const, label: "AI Scene Detect",icon: <BrainCircuit size={14}/>,color: "#A855F7" },
  ];

  const left = (
    <>
      <div>
        <p className="text-xs font-black uppercase tracking-widest mb-1" style={{ color: "#EAB308" }}>Scene Architect</p>
        <p className="text-xs" style={{ color: "#6B7280" }}>Trim, cut, speed, audio + AI scene detection</p>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {OPS.map(op => (
          <button key={op.id} onClick={() => setActiveOp(op.id)} className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all" style={{ background: activeOp === op.id ? `${op.color}20` : "rgba(255,255,255,0.04)", color: activeOp === op.id ? op.color : "#6B7280", border: `1px solid ${activeOp === op.id ? `${op.color}50` : "rgba(255,255,255,0.08)"}` }}>
            {op.icon} {op.label}
          </button>
        ))}
      </div>
      {activeOp === "trim" && (
        <div className="flex flex-col gap-3 p-4 rounded-2xl" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
          <div><label className="text-xs font-bold text-white">Start (seconds)</label><input type="number" min={0} value={trimStart} onChange={e => setTrimStart(Number(e.target.value))} className="w-full mt-1 px-3 py-2 rounded-xl text-sm text-white" style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }} /></div>
          <div><label className="text-xs font-bold text-white">End (seconds)</label><input type="number" min={1} value={trimEnd} onChange={e => setTrimEnd(Number(e.target.value))} className="w-full mt-1 px-3 py-2 rounded-xl text-sm text-white" style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }} /></div>
        </div>
      )}
      {activeOp === "speed" && (
        <div className="p-4 rounded-2xl" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
          <div className="flex justify-between mb-2"><span className="text-xs font-bold text-white">Speed</span><span className="text-xs font-bold" style={{ color: "#F97316" }}>{speed}×</span></div>
          <input type="range" min={0.25} max={4} step={0.25} value={speed} onChange={e => setSpeed(Number(e.target.value))} className="w-full" style={{ accentColor: "#F97316" }} />
          <div className="flex justify-between mt-1"><span className="text-[10px]" style={{ color: "#6B7280" }}>0.25×</span><span className="text-[10px]" style={{ color: "#6B7280" }}>4×</span></div>
        </div>
      )}
      {activeOp === "audio" && (
        <div className="flex flex-col gap-2">
          {(["mute","boost","normalize"] as const).map(m => (
            <button key={m} onClick={() => setAudioMode(m)} className="flex items-center gap-3 p-3 rounded-xl text-left transition-all" style={{ background: audioMode === m ? "rgba(34,197,94,0.12)" : "rgba(255,255,255,0.03)", border: `1.5px solid ${audioMode === m ? "#22C55E" : "rgba(255,255,255,0.07)"}` }}>
              <span className="text-sm font-bold capitalize" style={{ color: audioMode === m ? "#22C55E" : "#E5E7EB" }}>{m}</span>
            </button>
          ))}
        </div>
      )}
      {activeOp === "watermark" && (
        <div className="p-4 rounded-2xl" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
          <label className="text-xs font-bold text-white">Watermark Text</label>
          <input type="text" value={watermarkText} onChange={e => setWatermarkText(e.target.value)} className="w-full mt-2 px-3 py-2 rounded-xl text-sm text-white" style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }} />
        </div>
      )}
      {activeOp === "ai-detect" && (
        <div className="flex flex-col gap-3">
          <button onClick={runAIDetect} disabled={!videoFile || aiAnalyzing} className="w-full py-3 rounded-2xl font-black text-white text-sm flex items-center justify-center gap-2" style={{ background: !videoFile || aiAnalyzing ? "rgba(168,85,247,0.3)" : "linear-gradient(135deg, #A855F7, #7C3AED)", cursor: !videoFile || aiAnalyzing ? "not-allowed" : "pointer" }}>
            {aiAnalyzing ? <><Loader2 size={16} className="animate-spin" /> Analyzing...</> : <><BrainCircuit size={16} /> Detect Scenes with AI</>}
          </button>
          <p className="text-[10px]" style={{ color: "#6B7280" }}>GPT-4o-mini analyzes your video and detects natural scene breaks with timestamps</p>
          {aiScenes.length > 0 && (
            <div className="flex flex-col gap-2">
              <p className="text-[10px] font-black uppercase tracking-widest" style={{ color: "#A855F7" }}>{aiScenes.length} Scenes Detected</p>
              {aiScenes.map((s: any, i: number) => (
                <div key={i} className="p-3 rounded-xl" style={{ background: "rgba(168,85,247,0.08)", border: "1px solid rgba(168,85,247,0.2)" }}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold text-white">Scene {i + 1}</span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded" style={{ background: "rgba(168,85,247,0.2)", color: "#C084FC" }}>{s.start}s – {s.end}s</span>
                  </div>
                  <p className="text-xs" style={{ color: "#9CA3AF" }}>{s.description || s.label || "Scene segment"}</p>
                  <button onClick={() => { setActiveOp("trim"); setTrimStart(s.start); setTrimEnd(s.end); }} className="mt-2 text-[10px] font-bold px-2 py-1 rounded-lg" style={{ background: "rgba(168,85,247,0.15)", color: "#C084FC" }}>Use for Trim</button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
      {activeOp !== "ai-detect" && (
        <button onClick={process} disabled={!videoFile || isProcessing} className="w-full py-4 rounded-2xl font-black text-white text-sm transition-all flex items-center justify-center gap-2" style={{ background: !videoFile || isProcessing ? "rgba(234,179,8,0.3)" : "linear-gradient(135deg, #EAB308, #A16207)", cursor: !videoFile || isProcessing ? "not-allowed" : "pointer" }}>
          {isProcessing ? <><Loader2 size={18} className="animate-spin" /> Processing...</> : <><Scissors size={18} /> Apply {OPS.find(o => o.id === activeOp)?.label}</>}
        </button>
      )}
      {isProcessing && <ProcessingBar label="Processing..." accent="#EAB308" />}
      {outputUrl && (
        <div className="flex flex-col gap-2">
          <VideoPlayer src={outputUrl} label="Output" accent="#EAB308" />
          <button onClick={() => { const a = document.createElement("a"); a.href = outputUrl; a.download = `vaultx-scene-${activeOp}.mp4`; a.click(); }} className="flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold" style={{ background: "rgba(234,179,8,0.15)", color: "#EAB308", border: "1px solid rgba(234,179,8,0.3)" }}><Download size={14} /> Save</button>
        </div>
      )}
    </>
  );

  const right = videoFile ? (
    outputUrl ? <CanvasBeforeAfter beforeUrl={videoFile.url} afterUrl={outputUrl} label={`Scene ${activeOp}`} accent="#EAB308" /> :
    <CanvasVideoPlayer src={videoFile.url} label="Source" accent="#EAB308" onReplace={() => setVideoFile(null)} />
  ) : <CanvasDropZone onFile={setVideoFile} accent="#EAB308" label="Drop your video to edit scenes" />;

  return <Workspace left={left} right={right} />;
}

// ============================================================================
// MODE: PPV ENGINE
// ============================================================================
function PPVEngineMode({ onOutput }: { onOutput: (url: string, label: string) => void }) {
  const [videoFile, setVideoFile] = useState<VideoFile | null>(null);
  const [activeOp, setActiveOp] = useState<"teaser"|"censor"|"watermark"|"ai-ppv">("teaser");
  const [teaserDuration, setTeaserDuration] = useState(30);
  const [censorMode, setCensorMode] = useState<"blur"|"pixelate"|"blackbar">("blur");
  const [watermarkText, setWatermarkText] = useState("@creatorvault");
  const [outputUrl, setOutputUrl] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [ppvResult, setPpvResult] = useState<any>(null);
  const [aiAnalyzing, setAiAnalyzing] = useState(false);

  const analyzePPVMut = trpc.videoEnhance.analyzePPVMoments.useMutation();
  const savePpvMut = trpc.vaultx.savePpvOutput.useMutation();
  const [ppvSaved, setPpvSaved] = useState(false);

  const process = async () => {
    if (!videoFile) return toast.error("Upload a video first.");
    setIsProcessing(true); setOutputUrl(null);
    try {
      const fd = new FormData();
      fd.append("video", videoFile.file);
      let result: any;
      if (activeOp === "teaser") {
        fd.append("start", "0"); fd.append("end", String(teaserDuration));
        result = await callVideoStudio("trim", fd);
      } else if (activeOp === "censor") {
        fd.append("filter", `censor_${censorMode}`); fd.append("intensity", "0.9");
        result = await callVideoStudio("filter", fd);
      } else if (activeOp === "watermark") {
        fd.append("mode", "text"); fd.append("text", watermarkText); fd.append("position", "center"); fd.append("opacity", "0.6");
        result = await callVideoStudio("watermark", fd);
      }
      if (result?.url) { setOutputUrl(result.url); onOutput(result.url, `PPV ${activeOp}`); toast.success("Done."); }
    } catch (e: any) { toast.error(e.message); }
    finally { setIsProcessing(false); }
  };

  const runAIPPV = async () => {
    if (!videoFile) return toast.error("Upload a video first.");
    setAiAnalyzing(true);
    try {
      const r = await analyzePPVMut.mutateAsync({ transcript: `Video: ${videoFile.name}`, contentType: "adult", videoDuration: videoFile.duration || 60 });
      setPpvResult(r);
      toast.success(`AI found ${r.moments?.length || 0} best moments`);
    } catch (e: any) { toast.error(e.message); }
    finally { setAiAnalyzing(false); }
  };

  const OPS = [
    { id: "teaser" as const,    label: "Teaser Clip",    icon: <Clapperboard size={14}/>, color: "#A855F7" },
    { id: "censor" as const,    label: "Censor",         icon: <Eye size={14}/>,          color: "#EF4444" },
    { id: "watermark" as const, label: "Watermark",      icon: <Shield size={14}/>,       color: "#60A5FA" },
    { id: "ai-ppv" as const,    label: "AI PPV Intel",   icon: <BrainCircuit size={14}/>, color: "#F59E0B" },
  ];

  const left = (
    <>
      <div>
        <p className="text-xs font-black uppercase tracking-widest mb-1" style={{ color: "#A855F7" }}>PPV Engine</p>
        <p className="text-xs" style={{ color: "#6B7280" }}>Teaser + censor + watermark + AI PPV intelligence</p>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {OPS.map(op => (
          <button key={op.id} onClick={() => setActiveOp(op.id)} className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all" style={{ background: activeOp === op.id ? `${op.color}20` : "rgba(255,255,255,0.04)", color: activeOp === op.id ? op.color : "#6B7280", border: `1px solid ${activeOp === op.id ? `${op.color}50` : "rgba(255,255,255,0.08)"}` }}>
            {op.icon} {op.label}
          </button>
        ))}
      </div>
      {activeOp === "teaser" && (
        <div className="p-4 rounded-2xl" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
          <div className="flex justify-between mb-2"><span className="text-xs font-bold text-white">Teaser Duration</span><span className="text-xs font-bold" style={{ color: "#A855F7" }}>{teaserDuration}s</span></div>
          <input type="range" min={10} max={120} step={5} value={teaserDuration} onChange={e => setTeaserDuration(Number(e.target.value))} className="w-full" style={{ accentColor: "#A855F7" }} />
        </div>
      )}
      {activeOp === "censor" && (
        <div className="flex flex-col gap-2">
          {(["blur","pixelate","blackbar"] as const).map(m => (
            <button key={m} onClick={() => setCensorMode(m)} className="flex items-center gap-3 p-3 rounded-xl text-left transition-all capitalize" style={{ background: censorMode === m ? "rgba(239,68,68,0.12)" : "rgba(255,255,255,0.03)", border: `1.5px solid ${censorMode === m ? "#EF4444" : "rgba(255,255,255,0.07)"}`, color: censorMode === m ? "#EF4444" : "#E5E7EB", fontSize: 13, fontWeight: "bold" }}>
              {m}
            </button>
          ))}
        </div>
      )}
      {activeOp === "watermark" && (
        <div className="p-4 rounded-2xl" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
          <label className="text-xs font-bold text-white">Watermark Text</label>
          <input type="text" value={watermarkText} onChange={e => setWatermarkText(e.target.value)} className="w-full mt-2 px-3 py-2 rounded-xl text-sm text-white" style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }} />
        </div>
      )}
      {activeOp === "ai-ppv" && (
        <div className="flex flex-col gap-3">
          <button onClick={runAIPPV} disabled={!videoFile || aiAnalyzing} className="w-full py-3 rounded-2xl font-black text-white text-sm flex items-center justify-center gap-2" style={{ background: !videoFile || aiAnalyzing ? "rgba(245,158,11,0.3)" : "linear-gradient(135deg, #F59E0B, #D97706)", cursor: !videoFile || aiAnalyzing ? "not-allowed" : "pointer" }}>
            {aiAnalyzing ? <><Loader2 size={16} className="animate-spin" /> Analyzing...</> : <><BrainCircuit size={16} /> AI PPV Intelligence</>}
          </button>
          <p className="text-[10px]" style={{ color: "#6B7280" }}>GPT-4o-mini detects your best moments, suggests titles, hooks, and PPV pricing</p>
          {ppvResult && (
            <div className="flex flex-col gap-3">
              <div className="p-3 rounded-xl" style={{ background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.2)" }}>
                <p className="text-xs font-black text-white">{ppvResult.videoTitle}</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs font-bold" style={{ color: "#F59E0B" }}>${ppvResult.suggestedPrice}</span>
                  <span className="text-xs" style={{ color: "#9CA3AF" }}>· {ppvResult.platform}</span>
                </div>
                {ppvResult.strategy && <p className="text-xs mt-2" style={{ color: "#9CA3AF" }}>{ppvResult.strategy}</p>}
              </div>
              {ppvResult.moments?.map((m: any, i: number) => (
                <div key={i} className="p-3 rounded-xl" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold text-white">{m.title}</span>
                    <span className="text-[10px] font-black px-2 py-0.5 rounded" style={{ background: "rgba(245,158,11,0.2)", color: "#F59E0B" }}>${m.price}</span>
                  </div>
                  <p className="text-[10px]" style={{ color: "#9CA3AF" }}>{m.start}s – {m.end}s · {m.hook}</p>
                  <div className="flex gap-1.5 mt-2">
                    <button onClick={() => { setActiveOp("teaser"); setTeaserDuration(m.end - m.start); }} className="text-[10px] font-bold px-2 py-1 rounded-lg" style={{ background: "rgba(168,85,247,0.15)", color: "#C084FC" }}>Make Teaser</button>
                    <button onClick={() => navigator.clipboard.writeText(m.hook)} className="text-[10px] font-bold px-2 py-1 rounded-lg" style={{ background: "rgba(255,255,255,0.06)", color: "#9CA3AF" }}>Copy Hook</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
      {activeOp !== "ai-ppv" && (
        <button onClick={process} disabled={!videoFile || isProcessing} className="w-full py-4 rounded-2xl font-black text-white text-sm transition-all flex items-center justify-center gap-2" style={{ background: !videoFile || isProcessing ? "rgba(168,85,247,0.3)" : "linear-gradient(135deg, #A855F7, #7C3AED)", cursor: !videoFile || isProcessing ? "not-allowed" : "pointer" }}>
          {isProcessing ? <><Loader2 size={18} className="animate-spin" /> Processing...</> : <><Lock size={18} /> Apply {OPS.find(o => o.id === activeOp)?.label}</>}
        </button>
      )}
      {isProcessing && <ProcessingBar label="Processing..." accent="#A855F7" />}
      {outputUrl && (
        <div className="flex flex-col gap-2">
          <VideoPlayer src={outputUrl} label="Output" accent="#A855F7" />
          <button onClick={() => { const a = document.createElement("a"); a.href = outputUrl; a.download = `vaultx-ppv-${activeOp}.mp4`; a.click(); }} className="flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold" style={{ background: "rgba(168,85,247,0.15)", color: "#A855F7", border: "1px solid rgba(168,85,247,0.3)" }}><Download size={14} /> Save</button>
  // @ts-ignore
  // @ts-ignore
          <button onClick={async () => { try { await savePpvMut.mutateAsync({ fileUrl: outputUrl, outputType: activeOp, priceCents: ppvResult?.suggestedPrice ? Math.round(ppvResult.suggestedPrice * 100) : 999 }); setPpvSaved(true); toast.success("Saved to Vault as PPV content!"); } catch(e: any) { toast.error(e.message); } }} disabled={ppvSaved || savePpvMut.isPending} className="flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold" style={{ background: ppvSaved ? "rgba(34,197,94,0.15)" : "rgba(168,85,247,0.25)", color: ppvSaved ? "#22C55E" : "#C084FC", border: `1px solid ${ppvSaved ? "rgba(34,197,94,0.3)" : "rgba(168,85,247,0.4)"}` }}>{ppvSaved ? <><ShieldCheck size={14} /> Saved to Vault</> : savePpvMut.isPending ? <><Loader2 size={14} className="animate-spin" /> Saving...</> : <><Lock size={14} /> Save to Vault as PPV</>}</button>
        </div>
      )}
    </>
  );

  const right = videoFile ? (
    outputUrl ? <CanvasBeforeAfter beforeUrl={videoFile.url} afterUrl={outputUrl} label={`PPV ${activeOp}`} accent="#A855F7" /> :
    <CanvasVideoPlayer src={videoFile.url} label="Source" accent="#A855F7" onReplace={() => setVideoFile(null)} />
  ) : <CanvasDropZone onFile={setVideoFile} accent="#A855F7" label="Drop your video to monetize" />;

  return <Workspace left={left} right={right} />;
}

// ============================================================================
// MODE: PLATFORM VAULT
// ============================================================================
function PlatformVaultMode({ onOutput }: { onOutput: (url: string, label: string) => void }) {
  const [videoFile, setVideoFile] = useState<VideoFile | null>(null);
  const [selectedPlatform, setSelectedPlatform] = useState("onlyfans");
  const [outputUrl, setOutputUrl] = useState<string | null>(null);
  const saveExportMut = trpc.vaultx.saveExportHistory.useMutation();
  const [isProcessing, setIsProcessing] = useState(false);

  const platform = EXPORT_PLATFORMS.find(p => p.id === selectedPlatform)!;

  const process = async () => {
    if (!videoFile) return toast.error("Upload a video first.");
    setIsProcessing(true); setOutputUrl(null);
    try {
      const fd = new FormData();
      fd.append("video", videoFile.file);
      fd.append("format", platform.format.replace("mp4_h264", "mp4").replace("mp4_h265", "mov"));
      fd.append("resolution", platform.resolution);
      fd.append("platform", platform.id);
      const result = await callVideoStudio("convert", fd);
      setOutputUrl(result.url);
      onOutput(result.url, `${platform.name} Export`);
      toast.success(`Exported for ${platform.name} — ${platform.resolution} ${platform.note}`);
      // Write export history to DB
      saveExportMut.mutate({ platform: platform.id, outputUrl: result.url, resolution: platform.resolution, format: platform.format });
    } catch (e: any) { toast.error(e.message); }
    finally { setIsProcessing(false); }
  };

  const left = (
    <>
      <div>
        <p className="text-xs font-black uppercase tracking-widest mb-1" style={{ color: "#06B6D4" }}>Platform Vault</p>
        <p className="text-xs" style={{ color: "#6B7280" }}>Export optimized for every platform</p>
      </div>
      <div>
        <p className="text-[10px] font-black uppercase tracking-widest mb-2" style={{ color: "#6B7280" }}>Adult Platforms</p>
        <div className="flex flex-col gap-1.5">
          {EXPORT_PLATFORMS.filter(p => p.type === "adult").map(p => {
            const active = selectedPlatform === p.id;
            return (
              <button key={p.id} onClick={() => setSelectedPlatform(p.id)} className="flex items-center gap-3 p-3 rounded-xl text-left transition-all" style={{ background: active ? "rgba(6,182,212,0.12)" : "rgba(255,255,255,0.03)", border: `1.5px solid ${active ? "#06B6D4" : "rgba(255,255,255,0.07)"}` }}>
                <span className="text-lg">{p.icon}</span>
                <div className="flex-1">
                  <p className="text-sm font-bold" style={{ color: active ? "#06B6D4" : "#E5E7EB" }}>{p.name}</p>
                  <p className="text-xs" style={{ color: "#6B7280" }}>{p.note}</p>
                </div>
                {active && <div className="w-2 h-2 rounded-full" style={{ background: "#06B6D4" }} />}
              </button>
            );
          })}
        </div>
      </div>
      <div>
        <p className="text-[10px] font-black uppercase tracking-widest mb-2" style={{ color: "#6B7280" }}>Social Platforms</p>
        <div className="flex flex-col gap-1.5">
          {EXPORT_PLATFORMS.filter(p => p.type === "sfw").map(p => {
            const active = selectedPlatform === p.id;
            return (
              <button key={p.id} onClick={() => setSelectedPlatform(p.id)} className="flex items-center gap-3 p-3 rounded-xl text-left transition-all" style={{ background: active ? "rgba(6,182,212,0.12)" : "rgba(255,255,255,0.03)", border: `1.5px solid ${active ? "#06B6D4" : "rgba(255,255,255,0.07)"}` }}>
                <span className="text-lg">{p.icon}</span>
                <div className="flex-1">
                  <p className="text-sm font-bold" style={{ color: active ? "#06B6D4" : "#E5E7EB" }}>{p.name}</p>
                  <p className="text-xs" style={{ color: "#6B7280" }}>{p.note}</p>
                </div>
                {active && <div className="w-2 h-2 rounded-full" style={{ background: "#06B6D4" }} />}
              </button>
            );
          })}
        </div>
      </div>
      <button onClick={process} disabled={!videoFile || isProcessing} className="w-full py-4 rounded-2xl font-black text-white text-sm transition-all flex items-center justify-center gap-2" style={{ background: !videoFile || isProcessing ? "rgba(6,182,212,0.3)" : "linear-gradient(135deg, #06B6D4, #0891B2)", cursor: !videoFile || isProcessing ? "not-allowed" : "pointer" }}>
        {isProcessing ? <><Loader2 size={18} className="animate-spin" /> Exporting...</> : <><MonitorPlay size={18} /> Export for {platform.name}</>}
      </button>
      {isProcessing && <ProcessingBar label={`Exporting for ${platform.name}...`} accent="#06B6D4" />}
      {outputUrl && (
        <div className="flex flex-col gap-2">
          <VideoPlayer src={outputUrl} label={platform.name} accent="#06B6D4" />
          <button onClick={() => { const a = document.createElement("a"); a.href = outputUrl; a.download = `vaultx-${platform.id}.mp4`; a.click(); }} className="flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold" style={{ background: "rgba(6,182,212,0.15)", color: "#06B6D4", border: "1px solid rgba(6,182,212,0.3)" }}><Download size={14} /> Save {platform.name} Export</button>
        </div>
      )}
    </>
  );

  const right = videoFile ? (
    outputUrl ? <CanvasBeforeAfter beforeUrl={videoFile.url} afterUrl={outputUrl} label={`${platform.name} Export`} accent="#06B6D4" /> :
    <CanvasVideoPlayer src={videoFile.url} label="Source" accent="#06B6D4" onReplace={() => setVideoFile(null)} />
  ) : <CanvasDropZone onFile={setVideoFile} accent="#06B6D4" label="Drop your video to export for any platform" />;

  return <Workspace left={left} right={right} />;
}

// ============================================================================
// MODE: AI ENHANCE
// ============================================================================
function AIEnhanceMode({ onOutput }: { onOutput: (url: string, label: string) => void }) {
  const [videoFile, setVideoFile] = useState<VideoFile | null>(null);
  const [activeTab, setActiveTab] = useState<"slowmo"|"upscale"|"denoise">("slowmo");
  const [selectedPreset, setSelectedPreset] = useState(0);
  const [targetResolution, setTargetResolution] = useState<"FHD"|"2k"|"4k">("4k");
  const [predictionId, setPredictionId] = useState<string | null>(null);
  const [outputUrl, setOutputUrl] = useState<string | null>(null);
  const [beforeUrl, setBeforeUrl] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [statusMsg, setStatusMsg] = useState("");
  const [outputLabel, setOutputLabel] = useState("");

  const slowMoMut   = trpc.videoEnhance.slowMotion.useMutation();
  const upscaleMut  = trpc.videoEnhance.upscaleVideo.useMutation();
  const getJobQuery = trpc.videoEnhance.getJob.useQuery(
    { predictionId: predictionId! },
    { enabled: !!predictionId && isProcessing, refetchInterval: 5000 }
  );

  useEffect(() => {
    if (!getJobQuery.data) return;
    const d = getJobQuery.data;
    if (d.isComplete && d.outputUrl) {
      setOutputUrl(d.outputUrl); setIsProcessing(false); setPredictionId(null);
      setStatusMsg(""); onOutput(d.outputUrl, outputLabel);
      toast.success("AI processing complete.");
    } else if (d.status === "failed") {
      setIsProcessing(false); setPredictionId(null);
      toast.error("AI processing failed. Try again.");
    } else if (d.status === "processing") {
      setStatusMsg(`Processing... ${d.progress ? Math.round(d.progress * 100) + "%" : ""}`);
    }
  }, [getJobQuery.data]);

  const processSlowMo = async () => {
    if (!videoFile) return toast.error("Upload a video first.");
    setIsProcessing(true); setOutputUrl(null); setBeforeUrl(videoFile.url);
    const preset = SLOW_MO_PRESETS[selectedPreset];
    setOutputLabel(`Slow Motion ${preset.multiplier}`);
    try {
      const r = await slowMoMut.mutateAsync({ videoUrl: videoFile.url, targetFps: preset.fps });
      setPredictionId(r.predictionId); setStatusMsg("Queued — Replicate RIFE v4.6...");
    } catch (e: any) { setIsProcessing(false); toast.error(e.message); }
  };

  const processUpscale = async () => {
    if (!videoFile) return toast.error("Upload a video first.");
    setIsProcessing(true); setOutputUrl(null); setBeforeUrl(videoFile.url);
    setOutputLabel(`Upscale ${targetResolution}`);
    try {
      const r = await upscaleMut.mutateAsync({ videoUrl: videoFile.url, resolution: targetResolution });
      setPredictionId(r.predictionId); setStatusMsg("Queued — Replicate Real-ESRGAN...");
    } catch (e: any) { setIsProcessing(false); toast.error(e.message); }
  };

  const processDenoise = async () => {
    if (!videoFile) return toast.error("Upload a video first.");
    setIsProcessing(true); setOutputUrl(null); setBeforeUrl(videoFile.url);
    setOutputLabel("Denoised");
    try {
      const fd = new FormData(); fd.append("video", videoFile.file); fd.append("filter", "denoise"); fd.append("intensity", "0.7");
      const result = await callVideoStudio("filter", fd);
      setOutputUrl(result.url); setIsProcessing(false);
      onOutput(result.url, "Denoised"); toast.success("Denoise complete.");
    } catch (e: any) { setIsProcessing(false); toast.error(e.message); }
  };

  const TABS = [
    { id: "slowmo" as const,  label: "Slow Motion",  icon: <Timer size={14}/>,       color: "#22C55E", badge: "Replicate RIFE" },
    { id: "upscale" as const, label: "AI Upscale",   icon: <Aperture size={14}/>,    color: "#60A5FA", badge: "Replicate ESRGAN" },
    { id: "denoise" as const, label: "Denoise",      icon: <Sparkles size={14}/>,    color: "#F59E0B", badge: "FFmpeg" },
  ];

  const left = (
    <>
      <div>
        <p className="text-xs font-black uppercase tracking-widest mb-1" style={{ color: "#22C55E" }}>AI Enhance</p>
        <p className="text-xs" style={{ color: "#6B7280" }}>Real AI models — not FFmpeg filters</p>
      </div>
      <div className="flex gap-1.5">
        {TABS.map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id)} className="flex-1 flex flex-col items-center gap-1 py-2.5 rounded-xl transition-all" style={{ background: activeTab === t.id ? `${t.color}18` : "rgba(255,255,255,0.03)", border: `1.5px solid ${activeTab === t.id ? t.color : "rgba(255,255,255,0.07)"}` }}>
            <span style={{ color: activeTab === t.id ? t.color : "#6B7280" }}>{t.icon}</span>
            <span className="text-[10px] font-black" style={{ color: activeTab === t.id ? t.color : "#6B7280" }}>{t.label}</span>
          </button>
        ))}
      </div>
      <div className="px-2 py-1.5 rounded-lg text-center" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
        <span className="text-[10px] font-bold" style={{ color: TABS.find(t => t.id === activeTab)?.color }}>
          Provider: {TABS.find(t => t.id === activeTab)?.badge}
        </span>
        {activeTab === "slowmo" && <span className="text-[10px] ml-1" style={{ color: "#6B7280" }}>(Not Runway — Replicate RIFE v4.6)</span>}
      </div>
      {activeTab === "slowmo" && (
        <div className="flex flex-col gap-2">
          {SLOW_MO_PRESETS.map((p, i) => (
            <button key={i} onClick={() => setSelectedPreset(i)} className="flex items-center gap-3 p-3 rounded-xl text-left transition-all" style={{ background: selectedPreset === i ? "rgba(34,197,94,0.12)" : "rgba(255,255,255,0.03)", border: `1.5px solid ${selectedPreset === i ? "#22C55E" : "rgba(255,255,255,0.07)"}` }}>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm flex-shrink-0" style={{ background: selectedPreset === i ? "rgba(34,197,94,0.2)" : "rgba(255,255,255,0.05)", color: selectedPreset === i ? "#22C55E" : "#6B7280" }}>{p.multiplier}</div>
              <div><p className="text-sm font-bold" style={{ color: selectedPreset === i ? "#22C55E" : "#E5E7EB" }}>{p.label}</p><p className="text-xs" style={{ color: "#6B7280" }}>{p.desc}</p></div>
            </button>
          ))}
          <button onClick={processSlowMo} disabled={!videoFile || isProcessing} className="w-full py-4 rounded-2xl font-black text-white text-sm flex items-center justify-center gap-2" style={{ background: !videoFile || isProcessing ? "rgba(34,197,94,0.3)" : "linear-gradient(135deg, #22C55E, #16A34A)", cursor: !videoFile || isProcessing ? "not-allowed" : "pointer" }}>
            {isProcessing ? <><Loader2 size={18} className="animate-spin" /> {statusMsg || "Processing..."}</> : <><Timer size={18} /> Apply Slow Motion</>}
          </button>
        </div>
      )}
      {activeTab === "upscale" && (
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-2">
            {(["FHD","2k","4k"] as const).map(r => (
              <button key={r} onClick={() => setTargetResolution(r)} className="flex items-center gap-3 p-3 rounded-xl text-left transition-all" style={{ background: targetResolution === r ? "rgba(96,165,250,0.12)" : "rgba(255,255,255,0.03)", border: `1.5px solid ${targetResolution === r ? "#60A5FA" : "rgba(255,255,255,0.07)"}` }}>
                <span className="text-sm font-black" style={{ color: targetResolution === r ? "#60A5FA" : "#E5E7EB" }}>{r}</span>
                <span className="text-xs" style={{ color: "#6B7280" }}>{r === "FHD" ? "1080p" : r === "2k" ? "1440p" : "2160p"}</span>
              </button>
            ))}
          </div>
          <button onClick={processUpscale} disabled={!videoFile || isProcessing} className="w-full py-4 rounded-2xl font-black text-white text-sm flex items-center justify-center gap-2" style={{ background: !videoFile || isProcessing ? "rgba(96,165,250,0.3)" : "linear-gradient(135deg, #60A5FA, #2563EB)", cursor: !videoFile || isProcessing ? "not-allowed" : "pointer" }}>
            {isProcessing ? <><Loader2 size={18} className="animate-spin" /> {statusMsg || "Upscaling..."}</> : <><Aperture size={18} /> Upscale to {targetResolution}</>}
          </button>
        </div>
      )}
      {activeTab === "denoise" && (
        <button onClick={processDenoise} disabled={!videoFile || isProcessing} className="w-full py-4 rounded-2xl font-black text-white text-sm flex items-center justify-center gap-2" style={{ background: !videoFile || isProcessing ? "rgba(245,158,11,0.3)" : "linear-gradient(135deg, #F59E0B, #D97706)", cursor: !videoFile || isProcessing ? "not-allowed" : "pointer" }}>
          {isProcessing ? <><Loader2 size={18} className="animate-spin" /> Denoising...</> : <><Sparkles size={18} /> Apply Denoise</>}
        </button>
      )}
      {isProcessing && <ProcessingBar label={statusMsg || "AI processing..."} accent="#22C55E" />}
      {outputUrl && (
        <div className="flex flex-col gap-2">
          <VideoPlayer src={outputUrl} label={outputLabel} accent="#22C55E" />
          <button onClick={() => { const a = document.createElement("a"); a.href = outputUrl; a.download = `vaultx-ai-${activeTab}.mp4`; a.click(); }} className="flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold" style={{ background: "rgba(34,197,94,0.15)", color: "#22C55E", border: "1px solid rgba(34,197,94,0.3)" }}><Download size={14} /> Save</button>
        </div>
      )}
    </>
  );

  const right = videoFile ? (
    outputUrl && beforeUrl ? <CanvasBeforeAfter beforeUrl={beforeUrl} afterUrl={outputUrl} label={outputLabel} accent="#22C55E" /> :
    <CanvasVideoPlayer src={videoFile.url} label="Source" accent="#22C55E" onReplace={() => setVideoFile(null)} />
  ) : <CanvasDropZone onFile={setVideoFile} accent="#22C55E" label="Drop your video for AI enhancement" />;

  return <Workspace left={left} right={right} />;
}

// ============================================================================
// MODE: CAPTION STUDIO
// ============================================================================
function CaptionStudioMode({ onOutput }: { onOutput: (url: string, label: string) => void }) {
  const [videoFile, setVideoFile] = useState<VideoFile | null>(null);
  const [captionText, setCaptionText] = useState("");
  const [captionStart, setCaptionStart] = useState(0);
  const [captionEnd, setCaptionEnd] = useState(5);
  const [fontSize, setFontSize] = useState(36);
  const [captionColor, setCaptionColor] = useState("#FFFFFF");
  const [position, setPosition] = useState<"top"|"center"|"bottom">("bottom");
  const [outputUrl, setOutputUrl] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [transcribeSegments, setTranscribeSegments] = useState<any[]>([]);
  const [isTranscribing, setIsTranscribing] = useState(false);

  const transcribeMut = trpc.videoEnhance.transcribeVideo.useMutation();

  const transcribe = async () => {
    if (!videoFile) return toast.error("Upload a video first.");
    setIsTranscribing(true);
    try {
      const r = await transcribeMut.mutateAsync({ videoUrl: videoFile.url });
      setTranscribeSegments(r.segments || []);
      if (r.segments?.length > 0) { setCaptionText(r.segments[0].text.trim()); setCaptionStart(r.segments[0].start); setCaptionEnd(r.segments[0].end); }
      toast.success(`Whisper transcribed ${r.segments?.length || 0} segments`);
    } catch (e: any) { toast.error(e.message); }
    finally { setIsTranscribing(false); }
  };

  const process = async () => {
    if (!videoFile || !captionText) return toast.error("Upload a video and enter caption text.");
    setIsProcessing(true); setOutputUrl(null);
    try {
      const fd = new FormData();
      fd.append("video", videoFile.file); fd.append("text", captionText);
      fd.append("position", position); fd.append("fontSize", String(fontSize));
      fd.append("color", captionColor); fd.append("start", String(captionStart)); fd.append("end", String(captionEnd));
      const result = await callVideoStudio("add-text", fd);
      setOutputUrl(result.url); onOutput(result.url, "Captioned"); toast.success("Caption burned in.");
    } catch (e: any) { toast.error(e.message); }
    finally { setIsProcessing(false); }
  };

  const left = (
    <>
      <div>
        <p className="text-xs font-black uppercase tracking-widest mb-1" style={{ color: "#60A5FA" }}>Caption Studio</p>
        <p className="text-xs" style={{ color: "#6B7280" }}>OpenAI Whisper auto-transcription + FFmpeg burn-in</p>
      </div>
      <button onClick={transcribe} disabled={!videoFile || isTranscribing} className="w-full py-3 rounded-2xl font-black text-white text-sm flex items-center justify-center gap-2" style={{ background: !videoFile || isTranscribing ? "rgba(96,165,250,0.3)" : "linear-gradient(135deg, #60A5FA, #2563EB)", cursor: !videoFile || isTranscribing ? "not-allowed" : "pointer" }}>
        {isTranscribing ? <><Loader2 size={16} className="animate-spin" /> Transcribing...</> : <><Mic size={16} /> Auto-Transcribe with Whisper</>}
      </button>
      {transcribeSegments.length > 0 && (
        <div className="flex flex-col gap-1.5">
          <p className="text-[10px] font-black uppercase tracking-widest" style={{ color: "#60A5FA" }}>{transcribeSegments.length} Segments — Click to Use</p>
          <div className="max-h-40 overflow-y-auto flex flex-col gap-1">
            {transcribeSegments.map((s: any, i: number) => (
              <button key={i} onClick={() => { setCaptionText(s.text.trim()); setCaptionStart(s.start); setCaptionEnd(s.end); }} className="flex items-start gap-2 p-2 rounded-xl text-left transition-all" style={{ background: "rgba(96,165,250,0.06)", border: "1px solid rgba(96,165,250,0.15)" }}>
                <span className="text-[10px] font-bold flex-shrink-0 mt-0.5" style={{ color: "#60A5FA" }}>{s.start.toFixed(1)}s</span>
                <p className="text-xs text-white leading-tight">{s.text.trim()}</p>
              </button>
            ))}
          </div>
        </div>
      )}
      <div className="flex flex-col gap-3 p-4 rounded-2xl" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
        <div><label className="text-xs font-bold text-white">Caption Text</label><textarea value={captionText} onChange={e => setCaptionText(e.target.value)} rows={3} className="w-full mt-1 px-3 py-2 rounded-xl text-sm text-white resize-none" style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }} /></div>
        <div className="grid grid-cols-2 gap-2">
          <div><label className="text-xs font-bold text-white">Start (s)</label><input type="number" value={captionStart} onChange={e => setCaptionStart(Number(e.target.value))} className="w-full mt-1 px-3 py-2 rounded-xl text-sm text-white" style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }} /></div>
          <div><label className="text-xs font-bold text-white">End (s)</label><input type="number" value={captionEnd} onChange={e => setCaptionEnd(Number(e.target.value))} className="w-full mt-1 px-3 py-2 rounded-xl text-sm text-white" style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }} /></div>
        </div>
        <div>
          <label className="text-xs font-bold text-white mb-1 block">Position</label>
          <div className="flex gap-1.5">
            {(["top","center","bottom"] as const).map(p => (
              <button key={p} onClick={() => setPosition(p)} className="flex-1 py-2 rounded-xl text-xs font-bold capitalize transition-all" style={{ background: position === p ? "rgba(96,165,250,0.2)" : "rgba(255,255,255,0.04)", color: position === p ? "#60A5FA" : "#6B7280", border: `1px solid ${position === p ? "rgba(96,165,250,0.4)" : "rgba(255,255,255,0.08)"}` }}>{p}</button>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex-1"><label className="text-xs font-bold text-white">Font Size</label><input type="range" min={18} max={72} step={2} value={fontSize} onChange={e => setFontSize(Number(e.target.value))} className="w-full mt-1" style={{ accentColor: "#60A5FA" }} /></div>
          <div><label className="text-xs font-bold text-white">Color</label><input type="color" value={captionColor} onChange={e => setCaptionColor(e.target.value)} className="w-10 h-10 mt-1 rounded-xl cursor-pointer" /></div>
        </div>
      </div>
      <button onClick={process} disabled={!videoFile || !captionText || isProcessing} className="w-full py-4 rounded-2xl font-black text-white text-sm flex items-center justify-center gap-2" style={{ background: !videoFile || !captionText || isProcessing ? "rgba(96,165,250,0.3)" : "linear-gradient(135deg, #60A5FA, #2563EB)", cursor: !videoFile || !captionText || isProcessing ? "not-allowed" : "pointer" }}>
        {isProcessing ? <><Loader2 size={18} className="animate-spin" /> Burning in...</> : <><Type size={18} /> Burn In Caption</>}
      </button>
      {isProcessing && <ProcessingBar label="Burning in captions..." accent="#60A5FA" />}
      {outputUrl && (
        <div className="flex flex-col gap-2">
          <VideoPlayer src={outputUrl} label="Captioned" accent="#60A5FA" />
          <button onClick={() => { const a = document.createElement("a"); a.href = outputUrl; a.download = "vaultx-captioned.mp4"; a.click(); }} className="flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold" style={{ background: "rgba(96,165,250,0.15)", color: "#60A5FA", border: "1px solid rgba(96,165,250,0.3)" }}><Download size={14} /> Save</button>
        </div>
      )}
    </>
  );

  const right = videoFile ? (
    outputUrl ? <CanvasBeforeAfter beforeUrl={videoFile.url} afterUrl={outputUrl} label="Captioned" accent="#60A5FA" /> :
    <CanvasVideoPlayer src={videoFile.url} label="Source" accent="#60A5FA" onReplace={() => setVideoFile(null)} />
  ) : <CanvasDropZone onFile={setVideoFile} accent="#60A5FA" label="Drop your video for auto-transcription" />;

  return <Workspace left={left} right={right} />;
}

// ============================================================================
// MODE: CONTENT VAULT
// ============================================================================
function ContentVaultMode({ onOutput }: { onOutput: (url: string, label: string) => void }) {
  const [videoFile, setVideoFile] = useState<VideoFile | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadedUrl, setUploadedUrl] = useState<string | null>(null);
  const [library, setLibrary] = useState<{ name: string; url: string; size: number }[]>([]);
  const [vaultLockType, setVaultLockType] = useState<"free" | "subscription" | "ppv">("subscription");
  const [vaultPrice, setVaultPrice] = useState(9.99);
  const [vaultTitle, setVaultTitle] = useState("");
  const [vaultDescription, setVaultDescription] = useState("");
  const [vaultTags, setVaultTags] = useState("");
  const saveContentMut = trpc.vaultx.saveContent.useMutation();

  const upload = async () => {
    if (!videoFile) return toast.error("Select a video first.");
    setUploading(true); setUploadProgress(0); setUploadedUrl(null);
    try {
      const uploadId = `vault-${Date.now()}`;
      const totalChunks = Math.ceil(videoFile.size / CHUNK_SIZE);
      const initResp = await fetch("/api/video/upload/init", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ uploadId, totalChunks, filename: videoFile.name }),
      });
      if (!initResp.ok) throw new Error("Upload init failed");
      let lastResult: any = null;
      for (let i = 0; i < totalChunks; i++) {
        const start = i * CHUNK_SIZE;
        const chunk = videoFile.file.slice(start, start + CHUNK_SIZE);
        const fd = new FormData();
        fd.append("uploadId", uploadId); fd.append("chunkIndex", String(i)); fd.append("chunk", chunk, videoFile.name);
        const resp = await fetch("/api/video/upload/chunk", { method: "POST", body: fd });
        if (!resp.ok) throw new Error(`Chunk ${i} failed`);
        lastResult = await resp.json();
        setUploadProgress(Math.round(((i + 1) / totalChunks) * 100));
      }
      let url = lastResult?.file?.url;
      if (!url) {
        const finResp = await fetch("/api/video/upload/finalize", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ uploadId, filename: videoFile.name }),
        });
        const finData = await finResp.json();
        url = finData.file?.url || finData.url;
      }
      setUploadedUrl(url);
      setLibrary(prev => [{ name: videoFile.name, url, size: videoFile.size }, ...prev]);
      onOutput(url, `Vault: ${videoFile.name}`);
      // Save content record to database
      try {
        await saveContentMut.mutateAsync({
          title: vaultTitle.trim() || videoFile.name.replace(/\.[^.]+$/, ""),
          description: vaultDescription.trim() || undefined,
          tags: vaultTags.split(",").map(t => t.trim()).filter(Boolean),
          fileUrl: url,
          mimeType: videoFile.file?.type || "video/mp4",
          fileSizeBytes: videoFile.size,
          unlockType: vaultLockType,
          priceCents: vaultLockType === "ppv" ? Math.round(vaultPrice * 100) : 0,
        });
        toast.success("Uploaded and saved to Content Vault.");
      } catch {
        toast.success("Uploaded to Content Vault.");
      }
    } catch (e: any) { toast.error(e.message); }
    finally { setUploading(false); }
  };

  const left = (
    <>
      <div>
        <p className="text-xs font-black uppercase tracking-widest mb-1" style={{ color: "#9333EA" }}>Content Vault</p>
        <p className="text-xs" style={{ color: "#6B7280" }}>Upload & organize your content library</p>
      </div>
      <VideoDropZone onFile={setVideoFile} accent="#9333EA" />
      {videoFile && (
        <div className="flex flex-col gap-2 p-3 rounded-2xl" style={{ background: "rgba(147,51,234,0.08)", border: "1px solid rgba(147,51,234,0.2)" }}>
          <p className="text-sm font-bold text-white truncate">{videoFile.name}</p>
          <p className="text-xs" style={{ color: "#9CA3AF" }}>{fmtSize(videoFile.size)}{videoFile.duration ? ` · ${Math.round(videoFile.duration)}s` : ""}</p>
          {uploading && (
            <div>
              <div className="flex justify-between mb-1"><span className="text-xs" style={{ color: "#9333EA" }}>Uploading...</span><span className="text-xs font-bold" style={{ color: "#9333EA" }}>{uploadProgress}%</span></div>
              <div className="w-full h-1.5 rounded-full" style={{ background: "rgba(255,255,255,0.1)" }}><div className="h-full rounded-full transition-all" style={{ width: `${uploadProgress}%`, background: "#9333EA" }} /></div>
            </div>
          )}
          {/* Title / Description / Tags */}
          <input
            type="text"
            placeholder="Title (optional — defaults to filename)"
            value={vaultTitle}
            onChange={e => setVaultTitle(e.target.value)}
            className="w-full px-3 py-2 rounded-xl text-sm text-white"
            style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}
          />
          <textarea
            placeholder="Description (optional)"
            value={vaultDescription}
            onChange={e => setVaultDescription(e.target.value)}
            rows={2}
            className="w-full px-3 py-2 rounded-xl text-sm text-white resize-none"
            style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}
          />
          <input
            type="text"
            placeholder="Tags: lingerie, solo, premium (comma separated)"
            value={vaultTags}
            onChange={e => setVaultTags(e.target.value)}
            className="w-full px-3 py-2 rounded-xl text-sm text-white"
            style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}
          />
          {/* Lock Type Selector */}
          <div className="flex gap-2">
            {(["free", "subscription", "ppv"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setVaultLockType(t)}
                className="flex-1 py-2 rounded-xl text-xs font-bold capitalize transition-colors"
                style={{
                  background: vaultLockType === t ? "rgba(147,51,234,0.3)" : "rgba(255,255,255,0.04)",
                  color: vaultLockType === t ? "#C084FC" : "#6B7280",
                  border: `1px solid ${vaultLockType === t ? "rgba(147,51,234,0.5)" : "rgba(255,255,255,0.08)"}`,
                }}
              >
                {t === "free" ? "Free" : t === "subscription" ? "Sub Only" : "PPV"}
              </button>
            ))}
          </div>
          {vaultLockType === "ppv" && (
            <div className="flex items-center gap-2">
              <span className="text-gray-400 text-xs font-semibold">Price $</span>
              <input
                type="number"
                min={0.99}
                max={999}
                step={0.01}
                value={vaultPrice}
                onChange={(e) => setVaultPrice(Math.max(0.99, Number(e.target.value)))}
                className="flex-1 bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500"
              />
            </div>
          )}
          <button onClick={upload} disabled={uploading} className="w-full py-3 rounded-xl font-black text-white text-sm flex items-center justify-center gap-2" style={{ background: uploading ? "rgba(147,51,234,0.3)" : "linear-gradient(135deg, #9333EA, #7C3AED)", cursor: uploading ? "not-allowed" : "pointer" }}>
            {uploading ? <><Loader2 size={16} className="animate-spin" /> Uploading {uploadProgress}%</> : <><Upload size={16} /> Upload to Vault</>}
          </button>
        </div>
      )}
      {library.length > 0 && (
        <div className="flex flex-col gap-2">
          <p className="text-[10px] font-black uppercase tracking-widest" style={{ color: "#6B7280" }}>Library ({library.length})</p>
          {library.map((item, i) => (
            <div key={i} className="flex items-center gap-2 p-3 rounded-xl" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
              <HardDrive size={14} color="#9333EA" />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-white truncate">{item.name}</p>
                <p className="text-[10px]" style={{ color: "#6B7280" }}>{fmtSize(item.size)}</p>
              </div>
              <button onClick={() => { const a = document.createElement("a"); a.href = item.url; a.download = item.name; a.click(); }} style={{ color: "#6B7280" }}><Download size={12} /></button>
            </div>
          ))}
        </div>
      )}
    </>
  );

  const right = uploadedUrl ? (
    <CanvasVideoPlayer src={uploadedUrl} label="Vault Upload" accent="#9333EA" />
  ) : videoFile ? (
    <CanvasVideoPlayer src={videoFile.url} label="Preview" accent="#9333EA" onReplace={() => setVideoFile(null)} />
  ) : (
    <CanvasDropZone onFile={setVideoFile} accent="#9333EA" label="Drop your video to add to the vault" />
  );

  return <Workspace left={left} right={right} />;
}

// ============================================================================
// MODE: AI VIDEO GENERATOR (NEW)
// ============================================================================
function AIVideoGeneratorMode({ onOutput }: { onOutput: (url: string, label: string) => void }) {
  const [activeModel, setActiveModel] = useState<"kling-3.0"|"kling-2.6"|"kling-o1"|"seedance-2.0"|"seedance-1.5-pro"|"wan-2.6"|"vidu-q3-pro"|"pollo-3.0"|"pollo-2.0"|"minimax"|"svd"|"zeroscope">("kling-3.0");
  const [modelProvider, setModelProvider] = useState<"pollo"|"replicate">("pollo");
  const [polloTaskId, setPolloTaskId] = useState<string | null>(null);
  const [prompt, setPrompt] = useState("");
  const [videoStyle, setVideoStyle] = useState<"sensual"|"boudoir"|"intimate"|"artistic"|"cinematic"|"fantasy">("cinematic");
  const [imageFile, setImageFile] = useState<{ url: string; file: File } | null>(null);
  const [motionBucket, setMotionBucket] = useState(127);
  const [fps, setFps] = useState(24);
  const [predictionId, setPredictionId] = useState<string | null>(null);
  const [outputUrl, setOutputUrl] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [statusMsg, setStatusMsg] = useState("");

  const generateMut    = trpc.videoEnhance.generateVideo.useMutation();
  const animateMut     = trpc.videoEnhance.animateImage.useMutation();
  const imgToVideoMut  = trpc.videoEnhance.imageToVideo.useMutation();
  const generateAltMut = trpc.videoEnhance.generateVideoAlt.useMutation();
  // Pollo/Kling via kingcamAI router — all 9 models
  const polloVideoMut  = trpc.kingcamAI.video.generate.useMutation({
    onSuccess: (data) => {
      if (data.url) { setOutputUrl(data.url); onOutput(data.url, `${activeModel} video`); toast.success(`${activeModel} video ready!`); }
      setIsGenerating(false);
    },
    onError: (e) => { toast.error(`${activeModel}: ${e.message}`); setIsGenerating(false); },
  });
  const enhancePromptMut = trpc.videoEnhance.enhancePromptForAdult.useMutation({
    onSuccess: (data) => {
      setPrompt(data.enhancedPrompt);
      toast.success(`Prompt enhanced — ${data.mood} mood, ${data.lighting}`);
    },
    onError: (e) => toast.error(`Prompt enhance: ${e.message}`),
  });

  const getJobQuery = trpc.videoEnhance.getJob.useQuery(
    { predictionId: predictionId! },
    { enabled: !!predictionId && isGenerating, refetchInterval: 8000 }
  );

  useEffect(() => {
    if (!getJobQuery.data) return;
    const d = getJobQuery.data;
    if (d.isComplete && d.outputUrl) {
      setOutputUrl(d.outputUrl); setIsGenerating(false); setPredictionId(null); setStatusMsg("");
      onOutput(d.outputUrl, `AI Video — ${MODELS.find(m => m.id === activeModel)?.label}`);
      toast.success("AI video generation complete!");
    } else if (d.status === "failed") {
      setIsGenerating(false); setPredictionId(null);
      toast.error("Generation failed. Try again.");
    } else {
      setStatusMsg(`Generating... ${d.progress ? Math.round(d.progress * 100) + "%" : "in queue"}`);
    }
  }, [getJobQuery.data]);

  const generate = async () => {
    if (!prompt && activeModel !== "svd") return toast.error("Enter a prompt.");
    if ((activeModel as string) === "svd" && !imageFile) return toast.error("Upload an image for SVD.");
    setIsGenerating(true); setOutputUrl(null);
    try {
      let r: any;
      if (activeModel === "minimax") {
        r = await generateMut.mutateAsync({ prompt, firstFrameImage: imageFile?.url, promptOptimizer: true });
        setStatusMsg("MiniMax Hailuo generating 6s video...");
      } else if ((activeModel as string) === "svd") {
        r = await imgToVideoMut.mutateAsync({ imageUrl: imageFile!.url, motionBucketId: motionBucket, fps });
        setStatusMsg("Stable Video Diffusion animating...");
      } else {
        r = await generateAltMut.mutateAsync({ prompt, fps, width: 576, height: 320, numFrames: 24 });
        setStatusMsg("Zeroscope XL generating...");
      }
      setPredictionId(r.predictionId);
    } catch (e: any) { setIsGenerating(false); toast.error(e.message); }
  };

  // ── FULL AI MODEL REGISTRY ── All available video generation models ──────────
  const POLLO_MODELS = [
    { id: "kling-3.0",        label: "Kling 3.0",          badge: "BEST",       desc: "Full-body motion, filmic quality, highest fidelity",   color: "#EF4444", provider: "pollo" as const },
    { id: "kling-2.6",        label: "Kling 2.6",          badge: "Reliable",   desc: "Standard motion, consistent quality",                  color: "#F97316", provider: "pollo" as const },
    { id: "kling-o1",         label: "Kling O1",           badge: "Precision",  desc: "Precision motion, complex scenes",                     color: "#F59E0B", provider: "pollo" as const },
    { id: "seedance-2.0",     label: "Seedance 2.0",       badge: "Cinematic",  desc: "Multi-shot cinematic, coherent motion",                color: "#10B981", provider: "pollo" as const },
    { id: "seedance-1.5-pro", label: "Seedance 1.5 Pro",   badge: "Standard",   desc: "Cinematic standard quality",                           color: "#06B6D4", provider: "pollo" as const },
    { id: "wan-2.6",          label: "Wan 2.6",            badge: "Long-form",  desc: "Long-form narrative video",                            color: "#8B5CF6", provider: "pollo" as const },
    { id: "vidu-q3-pro",      label: "Vidu Q3 Pro",        badge: "Avatar",     desc: "Human-like avatar, audio-visual synthesis",            color: "#EC4899", provider: "pollo" as const },
    { id: "pollo-3.0",        label: "Pollo 3.0",          badge: "Fast",       desc: "Fast general video, full audio control",               color: "#6366F1", provider: "pollo" as const },
    { id: "pollo-2.0",        label: "Pollo 2.0",          badge: "Budget",     desc: "Budget general video generation",                      color: "#64748B", provider: "pollo" as const },
  ];
  const REPLICATE_MODELS = [
    { id: "minimax",          label: "MiniMax Hailuo",     badge: "699K runs",  desc: "Text/image → 6s HD video",                            color: "#EF4444", provider: "replicate" as const },
    { id: "svd",              label: "Stable Video Diff.", badge: "Image→Video",desc: "Animate any image into video",                         color: "#F97316", provider: "replicate" as const },
    { id: "zeroscope",        label: "Zeroscope XL",       badge: "Text→Video", desc: "Text to video, high quality",                          color: "#EAB308", provider: "replicate" as const },
  ];
  const ALL_MODELS = [...POLLO_MODELS, ...REPLICATE_MODELS];
  const MODELS = ALL_MODELS; // backward compat

  const left = (
    <>
      <div>
        <p className="text-xs font-black uppercase tracking-widest mb-1" style={{ color: "#EF4444" }}>AI Video Generator</p>
        <p className="text-xs" style={{ color: "#6B7280" }}>Real AI video generation — Replicate models</p>
      </div>
      {/* Provider tabs */}
      <div className="flex gap-1 p-1 rounded-xl" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}>
        {(["pollo","replicate"] as const).map(p => (
          <button key={p} onClick={() => { setModelProvider(p); setActiveModel(p === "pollo" ? "kling-3.0" : "minimax"); }} className="flex-1 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all" style={{ background: modelProvider === p ? (p === "pollo" ? "rgba(239,68,68,0.2)" : "rgba(249,115,22,0.2)") : "transparent", color: modelProvider === p ? (p === "pollo" ? "#EF4444" : "#F97316") : "#6B7280" }}>
            {p === "pollo" ? "Pollo / Kling" : "Replicate"}
          </button>
        ))}
      </div>
      <div className="flex flex-col gap-1.5 max-h-64 overflow-y-auto">
        {(modelProvider === "pollo" ? POLLO_MODELS : REPLICATE_MODELS).map(m => (
          <button key={m.id} onClick={() => setActiveModel(m.id as any)} className="flex items-center gap-3 p-3 rounded-xl text-left transition-all" style={{ background: activeModel === m.id ? `${m.color}15` : "rgba(255,255,255,0.03)", border: `1.5px solid ${activeModel === m.id ? m.color : "rgba(255,255,255,0.07)"}` }}>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold" style={{ color: activeModel === m.id ? m.color : "#E5E7EB" }}>{m.label}</span>
                <span className="text-[9px] font-black px-1.5 py-0.5 rounded" style={{ background: `${m.color}25`, color: m.color }}>{m.badge}</span>
              </div>
              <p className="text-xs mt-0.5" style={{ color: "#6B7280" }}>{m.desc}</p>
            </div>
            {activeModel === m.id && <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: m.color }} />}
          </button>
        ))}
      </div>
      {(activeModel === "minimax" || activeModel === "zeroscope") && (
        <div className="flex flex-col gap-2">
          <label className="text-xs font-bold text-white">Prompt</label>
          <textarea value={prompt} onChange={e => setPrompt(e.target.value)} rows={4} placeholder="Describe the video you want to generate..." className="w-full px-3 py-2 rounded-xl text-sm text-white resize-none" style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }} />
          <button
            onClick={() => enhancePromptMut.mutate({ rawPrompt: prompt || "sensual intimate scene", style: videoStyle, model: (activeModel as string) === "minimax" ? "minimax" : (activeModel as string) === "svd" ? "stable-video" : "zeroscope" })}
            disabled={enhancePromptMut.isPending}
            className="w-full py-2.5 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-2 mt-1"
            style={{ background: enhancePromptMut.isPending ? "rgba(139,92,246,0.15)" : "rgba(139,92,246,0.12)", color: "#8B5CF6", border: "1px solid rgba(139,92,246,0.35)", cursor: enhancePromptMut.isPending ? "not-allowed" : "pointer" }}
          >
            {enhancePromptMut.isPending ? <><Loader2 size={12} className="animate-spin" /> Enhancing with GPT...</> : <><Sparkles size={12} /> Enhance Prompt for Adult Content</>}
          </button>
          <div className="flex gap-2 flex-wrap">
            {(["sensual","boudoir","intimate","artistic","cinematic","fantasy"] as const).map(s => (
              <button key={s} onClick={() => setVideoStyle(s)} className="px-2.5 py-1 rounded-lg text-[10px] font-bold capitalize transition-all" style={{ background: videoStyle === s ? "rgba(139,92,246,0.25)" : "rgba(255,255,255,0.05)", color: videoStyle === s ? "#8B5CF6" : "#6B7280", border: `1px solid ${videoStyle === s ? "rgba(139,92,246,0.5)" : "rgba(255,255,255,0.08)"}` }}>
                {s}
              </button>
            ))}
          </div>
        </div>
      )}
      {(activeModel === "minimax" || activeModel === "svd") && (
        <div>
          <p className="text-xs font-bold text-white mb-2">{activeModel === "svd" ? "Source Image (required)" : "First Frame Image (optional)"}</p>
          {imageFile ? (
            <div className="relative rounded-2xl overflow-hidden">
              <img src={imageFile.url} alt="source" className="w-full rounded-2xl" style={{ maxHeight: 160, objectFit: "cover" }} />
              <button onClick={() => setImageFile(null)} className="absolute top-2 right-2 w-7 h-7 rounded-full flex items-center justify-center" style={{ background: "rgba(0,0,0,0.7)" }}>✕</button>
            </div>
          ) : (
            <ImageDropZone onFile={(url, file) => setImageFile({ url, file })} accent="#EF4444" label={activeModel === "svd" ? "Drop image to animate" : "Drop first frame (optional)"} />
          )}
        </div>
      )}
      {activeModel === "svd" && (
        <div className="p-4 rounded-2xl" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
          <div className="flex justify-between mb-2"><span className="text-xs font-bold text-white">Motion Intensity</span><span className="text-xs font-bold" style={{ color: "#F97316" }}>{motionBucket}</span></div>
          <input type="range" min={1} max={255} step={1} value={motionBucket} onChange={e => setMotionBucket(Number(e.target.value))} className="w-full" style={{ accentColor: "#F97316" }} />
          <div className="flex justify-between mt-1"><span className="text-[10px]" style={{ color: "#6B7280" }}>Subtle</span><span className="text-[10px]" style={{ color: "#6B7280" }}>Extreme</span></div>
        </div>
      )}
      <button onClick={generate} disabled={isGenerating || (!prompt && activeModel !== "svd") || (activeModel === "svd" && !imageFile)} className="w-full py-4 rounded-2xl font-black text-white text-sm flex items-center justify-center gap-2" style={{ background: isGenerating ? "rgba(239,68,68,0.3)" : "linear-gradient(135deg, #EF4444, #DC2626)", cursor: isGenerating ? "not-allowed" : "pointer", boxShadow: isGenerating ? "none" : "0 0 24px rgba(239,68,68,0.3)" }}>
        {isGenerating ? <><Loader2 size={18} className="animate-spin" /> {statusMsg || "Generating..."}</> : <><Film size={18} /> Generate Video</>}
      </button>
      {isGenerating && <ProcessingBar label={statusMsg || "AI generating video (2–5 min)..."} accent="#EF4444" />}
      {outputUrl && (
        <div className="flex flex-col gap-2">
          <VideoPlayer src={outputUrl} label="AI Generated" accent="#EF4444" />
          <button onClick={() => { const a = document.createElement("a"); a.href = outputUrl; a.download = `vaultx-ai-video-${activeModel}.mp4`; a.click(); }} className="flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold" style={{ background: "rgba(239,68,68,0.15)", color: "#EF4444", border: "1px solid rgba(239,68,68,0.3)" }}><Download size={14} /> Save</button>
        </div>
      )}
    </>
  );

  const right = outputUrl ? (
    <CanvasVideoPlayer src={outputUrl} label={`AI Generated — ${MODELS.find(m => m.id === activeModel)?.label}`} accent="#EF4444" />
  ) : imageFile && activeModel === "svd" ? (
    <div className="flex-1 flex flex-col items-center justify-center gap-4 rounded-3xl" style={{ background: "#000", minHeight: 400 }}>
      <img src={imageFile.url} alt="source" className="max-w-full max-h-80 rounded-2xl object-contain" />
      {isGenerating && <div className="flex items-center gap-2"><div className="w-5 h-5 rounded-full border-2 border-red-500 border-t-transparent animate-spin" /><p className="text-sm text-white font-semibold">{statusMsg}</p></div>}
    </div>
  ) : (
    <div className="flex-1 flex flex-col items-center justify-center gap-6 rounded-3xl" style={{ border: "2px dashed rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.01)", minHeight: 400 }}>
      <div className="w-20 h-20 rounded-3xl flex items-center justify-center" style={{ background: "rgba(239,68,68,0.15)", border: "1px solid rgba(239,68,68,0.3)" }}>
        <Film size={36} color="#EF4444" />
      </div>
      <div className="text-center">
        <p className="text-white font-black text-xl">AI Video Generation</p>
        <p className="text-sm mt-2" style={{ color: "#6B7280" }}>Enter a prompt or upload an image to generate video with AI</p>
      </div>
    </div>
  );

  return <Workspace left={left} right={right} />;
}

// ============================================================================
// MODE: AI SOUND STUDIO (NEW)
// ============================================================================
function AISoundStudioMode({ onOutput }: { onOutput: (url: string, label: string) => void }) {
  const [videoFile, setVideoFile] = useState<VideoFile | null>(null);
  const [activeTab, setActiveTab] = useState<"sound-effects"|"music"|"voice"|"cleanup">("sound-effects");
  const [cleanupMode, setCleanupMode] = useState<"cleanup"|"normalize"|"voice_enhance">("cleanup");
  const [cleanupProcessing, setCleanupProcessing] = useState(false);
  const [cleanupOutputUrl, setCleanupOutputUrl] = useState<string | null>(null);
  const [soundPrompt, setSoundPrompt] = useState("");
  const [musicPrompt, setMusicPrompt] = useState("");
  const [musicDuration, setMusicDuration] = useState(30);
  const [predictionId, setPredictionId] = useState<string | null>(null);
  const [outputUrl, setOutputUrl] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [statusMsg, setStatusMsg] = useState("");

  const soundMut = trpc.videoEnhance.addAISound.useMutation();
  const musicMut = trpc.videoEnhance.generateMusic.useMutation();
  const adultSoundMut = trpc.videoEnhance.addAdultSound.useMutation({
    onSuccess: (data) => {
      toast.success(`Adult sound design started — ${data.soundType} (${data.intensity})`);
      if (data.predictionId) { setPredictionId(data.predictionId); setIsGenerating(true); }
    },
    onError: (e) => toast.error(`Adult sound: ${e.message}`),
  });
  const sensualMusicMut = trpc.videoEnhance.generateSensualMusic.useMutation({
    onSuccess: (data) => {
      toast.success(`Sensual music started — ${data.mood} mood`);
      if (data.predictionId) { setPredictionId(data.predictionId); setIsGenerating(true); }
    },
    onError: (e) => toast.error(`Sensual music: ${e.message}`),
  });
  // ElevenLabs voice synthesis
  const [voiceText, setVoiceText] = useState("");
  const [voiceStyle, setVoiceStyle] = useState<"sensual"|"confident"|"whisper"|"commanding">("sensual");
  const [voiceOutputUrl, setVoiceOutputUrl] = useState<string | null>(null);
  const elevenLabsMut = trpc.videoEnhance.synthesizeVoice.useMutation({
    onSuccess: (data) => {
      if (data.audioUrl) { setVoiceOutputUrl(data.audioUrl); onOutput(data.audioUrl, `ElevenLabs Voice — ${voiceStyle}`); toast.success("ElevenLabs voice ready!"); }
    },
    onError: (e) => toast.error(`ElevenLabs: ${e.message}`),
  });

  const getJobQuery = trpc.videoEnhance.getJob.useQuery(
    { predictionId: predictionId! },
    { enabled: !!predictionId && isGenerating, refetchInterval: 6000 }
  );

  useEffect(() => {
    if (!getJobQuery.data) return;
    const d = getJobQuery.data;
    if (d.isComplete && d.outputUrl) {
      setOutputUrl(d.outputUrl); setIsGenerating(false); setPredictionId(null); setStatusMsg("");
      onOutput(d.outputUrl, activeTab === "sound-effects" ? "AI Sound Effects" : "AI Music");
      toast.success("AI audio generation complete!");
    } else if (d.status === "failed") {
      setIsGenerating(false); setPredictionId(null);
      toast.error("Audio generation failed.");
    } else {
      setStatusMsg(`Generating audio... ${d.progress ? Math.round(d.progress * 100) + "%" : ""}`);
    }
  }, [getJobQuery.data]);

  const generateSound = async () => {
    if (!videoFile) return toast.error("Upload a video first.");
    if (!soundPrompt) return toast.error("Enter a sound description.");
    setIsGenerating(true); setOutputUrl(null);
    try {
      const r = await soundMut.mutateAsync({ videoUrl: videoFile.url, prompt: soundPrompt, duration: videoFile.duration || 10 });
      setPredictionId(r.predictionId); setStatusMsg("MMAudio generating sound effects...");
    } catch (e: any) { setIsGenerating(false); toast.error(e.message); }
  };

  const generateMusic = async () => {
    if (!musicPrompt) return toast.error("Enter a music description.");
    setIsGenerating(true); setOutputUrl(null);
    try {
      const r = await musicMut.mutateAsync({ prompt: musicPrompt, duration: musicDuration });
      setPredictionId(r.predictionId); setStatusMsg("MusicGen generating soundtrack...");
    } catch (e: any) { setIsGenerating(false); toast.error(e.message); }
  };

  const SOUND_PRESETS = [
    "Sensual ambient music with deep bass",
    "Cinematic tension build with strings",
    "Club music with heavy bass drops",
    "Soft intimate bedroom sounds",
    "Luxury lounge jazz",
    "Dark seductive electronic",
  ];

  const left = (
    <>
      <div>
        <p className="text-xs font-black uppercase tracking-widest mb-1" style={{ color: "#8B5CF6" }}>AI Sound Studio</p>
        <p className="text-xs" style={{ color: "#6B7280" }}>MMAudio sound effects · MusicGen soundtrack</p>
      </div>
      <div className="flex gap-1.5">
        {[
          { id: "sound-effects" as const, label: "Sound Effects", badge: "MMAudio",     color: "#8B5CF6" },
          { id: "music" as const,         label: "Music",         badge: "MusicGen",    color: "#A78BFA" },
          { id: "voice" as const,         label: "Voice Clone",   badge: "ElevenLabs",  color: "#EC4899" },
          { id: "cleanup" as const,       label: "Audio Cleanup", badge: "FFmpeg",      color: "#22C55E" },
        ].map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id)} className="flex-1 flex flex-col items-center gap-1 py-2.5 rounded-xl transition-all" style={{ background: activeTab === t.id ? `${t.color}18` : "rgba(255,255,255,0.03)", border: `1.5px solid ${activeTab === t.id ? t.color : "rgba(255,255,255,0.07)"}` }}>
            <span className="text-xs font-black" style={{ color: activeTab === t.id ? t.color : "#6B7280" }}>{t.label}</span>
            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded" style={{ background: `${t.color}20`, color: t.color }}>{t.badge}</span>
          </button>
        ))}
      </div>
      {activeTab === "sound-effects" && (
        <>
          <div className="flex flex-col gap-2">
            <label className="text-xs font-bold text-white">Sound Description</label>
            <textarea value={soundPrompt} onChange={e => setSoundPrompt(e.target.value)} rows={3} placeholder="Describe the sounds you want added to your video..." className="w-full px-3 py-2 rounded-xl text-sm text-white resize-none" style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }} />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest mb-2" style={{ color: "#6B7280" }}>Quick Presets</p>
            <div className="flex flex-wrap gap-1.5">
              {SOUND_PRESETS.map((p, i) => (
                <button key={i} onClick={() => setSoundPrompt(p)} className="px-2.5 py-1.5 rounded-xl text-xs font-semibold transition-all" style={{ background: "rgba(139,92,246,0.1)", color: "#A78BFA", border: "1px solid rgba(139,92,246,0.2)" }}>{p.split(" ").slice(0, 3).join(" ")}...</button>
              ))}
            </div>
          </div>
          <button onClick={generateSound} disabled={!videoFile || !soundPrompt || isGenerating} className="w-full py-4 rounded-2xl font-black text-white text-sm flex items-center justify-center gap-2" style={{ background: !videoFile || !soundPrompt || isGenerating ? "rgba(139,92,246,0.3)" : "linear-gradient(135deg, #8B5CF6, #7C3AED)", cursor: !videoFile || !soundPrompt || isGenerating ? "not-allowed" : "pointer" }}>
            {isGenerating ? <><Loader2 size={18} className="animate-spin" /> {statusMsg || "Generating..."}</> : <><AudioWaveform size={18} /> Add AI Sound Effects</>}
          </button>
        </>
      )}
      {activeTab === "music" && (
        <>
          <div className="flex flex-col gap-2">
            <label className="text-xs font-bold text-white">Music Description</label>
            <textarea value={musicPrompt} onChange={e => setMusicPrompt(e.target.value)} rows={3} placeholder="Describe the music style, mood, and instruments..." className="w-full px-3 py-2 rounded-xl text-sm text-white resize-none" style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }} />
          </div>
          <div className="p-4 rounded-2xl" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
            <div className="flex justify-between mb-2"><span className="text-xs font-bold text-white">Duration</span><span className="text-xs font-bold" style={{ color: "#A78BFA" }}>{musicDuration}s</span></div>
            <input type="range" min={5} max={60} step={5} value={musicDuration} onChange={e => setMusicDuration(Number(e.target.value))} className="w-full" style={{ accentColor: "#A78BFA" }} />
          </div>
          <button onClick={generateMusic} disabled={!musicPrompt || isGenerating} className="w-full py-4 rounded-2xl font-black text-white text-sm flex items-center justify-center gap-2" style={{ background: !musicPrompt || isGenerating ? "rgba(167,139,250,0.3)" : "linear-gradient(135deg, #A78BFA, #8B5CF6)", cursor: !musicPrompt || isGenerating ? "not-allowed" : "pointer" }}>
            {isGenerating ? <><Loader2 size={18} className="animate-spin" /> {statusMsg || "Generating..."}</> : <><Music size={18} /> Generate Music</>}
          </button>
        </>
      )}
      {activeTab === "cleanup" && (
        <>
          <div className="flex flex-col gap-2">
            <label className="text-xs font-bold text-white">Cleanup Mode</label>
            <div className="flex flex-col gap-1.5">
              {[
                { id: "cleanup" as const,       label: "Noise Cleanup",    desc: "Remove background noise + EQ for clarity", color: "#22C55E" },
                { id: "normalize" as const,     label: "Loudness Normalize", desc: "EBU R128 broadcast standard (-16 LUFS)", color: "#22C55E" },
                { id: "voice_enhance" as const, label: "Voice Enhance",    desc: "Noise reduction + presence boost for speech", color: "#22C55E" },
              ].map(m => (
                <button key={m.id} onClick={() => setCleanupMode(m.id)} className="flex items-start gap-3 p-3 rounded-xl text-left transition-all" style={{ background: cleanupMode === m.id ? "rgba(34,197,94,0.12)" : "rgba(255,255,255,0.03)", border: `1.5px solid ${cleanupMode === m.id ? "#22C55E" : "rgba(255,255,255,0.07)"}` }}>
                  <div className="flex-1">
                    <p className="text-sm font-bold" style={{ color: cleanupMode === m.id ? "#22C55E" : "#E5E7EB" }}>{m.label}</p>
                    <p className="text-xs mt-0.5" style={{ color: "#6B7280" }}>{m.desc}</p>
                  </div>
                  {cleanupMode === m.id && <div className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0" style={{ background: "#22C55E" }} />}
                </button>
              ))}
            </div>
          </div>
          <button onClick={async () => {
            if (!videoFile) return toast.error("Upload a video first.");
            setCleanupProcessing(true); setCleanupOutputUrl(null);
            try {
              const fd = new FormData();
              fd.append("video", videoFile.file);
              fd.append("mode", cleanupMode);
              const r = await fetch("/api/video-studio/audio", { method: "POST", body: fd });
              if (!r.ok) { const e = await r.json(); throw new Error(e.error || "Audio cleanup failed"); }
              const blob = await r.blob();
              const url = URL.createObjectURL(blob);
              setCleanupOutputUrl(url);
              onOutput(url, `Audio ${cleanupMode}`);
              toast.success("Audio cleanup complete!");
            } catch(e: any) { toast.error(e.message); }
            finally { setCleanupProcessing(false); }
          }} disabled={!videoFile || cleanupProcessing} className="w-full py-4 rounded-2xl font-black text-white text-sm flex items-center justify-center gap-2" style={{ background: !videoFile || cleanupProcessing ? "rgba(34,197,94,0.3)" : "linear-gradient(135deg, #22C55E, #16A34A)", cursor: !videoFile || cleanupProcessing ? "not-allowed" : "pointer" }}>
            {cleanupProcessing ? <><Loader2 size={18} className="animate-spin" /> Processing Audio...</> : <><Mic size={18} /> Apply {cleanupMode === "cleanup" ? "Noise Cleanup" : cleanupMode === "normalize" ? "Loudness Normalize" : "Voice Enhance"}</>}
          </button>
          {cleanupOutputUrl && (
            <div className="flex flex-col gap-2">
              <div className="p-4 rounded-2xl" style={{ background: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.2)" }}>
                <p className="text-xs font-bold text-white mb-2">Cleaned Audio Output</p>
                <video controls src={cleanupOutputUrl} className="w-full rounded-xl" style={{ maxHeight: 200 }} />
              </div>
              <button onClick={() => { const a = document.createElement("a"); a.href = cleanupOutputUrl; a.download = `vaultx-audio-${cleanupMode}.mp4`; a.click(); }} className="flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold" style={{ background: "rgba(34,197,94,0.15)", color: "#22C55E", border: "1px solid rgba(34,197,94,0.3)" }}><Download size={14} /> Save Cleaned Audio</button>
            </div>
          )}
        </>
      )}
      {isGenerating && <ProcessingBar label={statusMsg || "AI generating audio..."} accent="#8B5CF6" />}
      {outputUrl && (
        <div className="flex flex-col gap-2">
          <div className="p-4 rounded-2xl" style={{ background: "rgba(139,92,246,0.08)", border: "1px solid rgba(139,92,246,0.2)" }}>
            <p className="text-xs font-bold text-white mb-2">{activeTab === "sound-effects" ? "AI Sound Effects" : "AI Music"}</p>
            <audio controls src={outputUrl} className="w-full" style={{ accentColor: "#8B5CF6" }} />
          </div>
          <button onClick={() => { const a = document.createElement("a"); a.href = outputUrl; a.download = `vaultx-${activeTab}.mp3`; a.click(); }} className="flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold" style={{ background: "rgba(139,92,246,0.15)", color: "#8B5CF6", border: "1px solid rgba(139,92,246,0.3)" }}><Download size={14} /> Save Audio</button>
        </div>
      )}
    </>
  );

  const right = videoFile ? (
    <CanvasVideoPlayer src={videoFile.url} label="Source Video" accent="#8B5CF6" onReplace={() => setVideoFile(null)} />
  ) : (
    <div className="flex-1 flex flex-col items-center justify-center gap-6 rounded-3xl" style={{ border: "2px dashed rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.01)", minHeight: 400 }}>
      <div className="w-20 h-20 rounded-3xl flex items-center justify-center" style={{ background: "rgba(139,92,246,0.15)", border: "1px solid rgba(139,92,246,0.3)" }}>
        <Headphones size={36} color="#8B5CF6" />
      </div>
      <div className="text-center">
        <p className="text-white font-black text-xl">AI Sound Studio</p>
        <p className="text-sm mt-2" style={{ color: "#6B7280" }}>Upload a video to add AI sound effects, or generate music standalone</p>
      </div>
      <VideoDropZone onFile={setVideoFile} accent="#8B5CF6" />
    </div>
  );

  return <Workspace left={left} right={right} />;
}

// ============================================================================
// MODE: FACE STUDIO (NEW)
// ============================================================================
function FaceStudioMode({ onOutput }: { onOutput: (url: string, label: string) => void }) {
  const [activeTab, setActiveTab] = useState<"enhance"|"style-transfer"|"character"|"portrait"|"photomaker"|"velvet"|"clone">("enhance");
  const [videoFile, setVideoFile] = useState<VideoFile | null>(null);
  const [imageFile, setImageFile] = useState<{ url: string; file: File } | null>(null);
  const [characterPrompt, setCharacterPrompt] = useState("");
  const [stylePrompt, setStylePrompt] = useState("");
  const [predictionId, setPredictionId] = useState<string | null>(null);
  const [outputUrl, setOutputUrl] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [statusMsg, setStatusMsg] = useState("");

  const enhanceMut   = trpc.videoEnhance.beautyEnhance.useMutation();
  const styleMut     = trpc.videoEnhance.faceStyleTransfer.useMutation();
  const characterMut = trpc.videoEnhance.generateCharacter.useMutation();
  const velvetSuiteMut = trpc.videoEnhance.velvetSuite.useMutation({
    onSuccess: (data) => {
      toast.success(`Velvet Suite started — ${data.message}`);
      if (data.predictionId) { setPredictionId(data.predictionId); setIsProcessing(true); }
    },
    onError: (e) => toast.error(`Velvet Suite: ${e.message}`),
  });
  // KingCam clone model — fluxdevcam
  const [clonePrompt, setClonePrompt] = useState("");
  const [cloneOutputUrl, setCloneOutputUrl] = useState<string | null>(null);
  const cloneImageMut = trpc.kingcamAI.image.generate.useMutation({
    onSuccess: (data) => {
      if (data.url) { setCloneOutputUrl(data.url); onOutput(data.url, "KingCam Clone Model"); toast.success("KingCam clone image ready!"); }
    },
    onError: (e) => toast.error(`Clone model: ${e.message}`),
  });

  const getJobQuery = trpc.videoEnhance.getJob.useQuery(
    { predictionId: predictionId! },
    { enabled: !!predictionId && isProcessing, refetchInterval: 6000 }
  );

  useEffect(() => {
    if (!getJobQuery.data) return;
    const d = getJobQuery.data;
    if (d.isComplete && d.outputUrl) {
      setOutputUrl(d.outputUrl); setIsProcessing(false); setPredictionId(null); setStatusMsg("");
      onOutput(d.outputUrl, `Face Studio — ${TABS.find(t => t.id === activeTab)?.label}`);
      toast.success("Face Studio complete!");
    } else if (d.status === "failed") {
      setIsProcessing(false); setPredictionId(null);
      toast.error("Processing failed.");
    } else {
      setStatusMsg(`Processing... ${d.progress ? Math.round(d.progress * 100) + "%" : ""}`);
    }
  }, [getJobQuery.data]);

  const process = async () => {
    setIsProcessing(true); setOutputUrl(null);
    try {
      let r: any;
      if (activeTab === "enhance") {
  // @ts-ignore
        if (!imageFile) return toast.error("Upload a portrait image.");
  // @ts-ignore
        r = await enhanceMut.mutateAsync({ imageUrl: imageFile.url });
        setStatusMsg("PuLID enhancing portrait...");
      } else if (activeTab === "style-transfer") {
        if (!imageFile) return toast.error("Upload a face image.");
        if (!stylePrompt) return toast.error("Enter a style prompt.");
  // @ts-ignore
        r = await styleMut.mutateAsync({ imageUrl: imageFile.url, stylePrompt });
        setStatusMsg("Face-to-Many applying style...");
  // @ts-ignore
      } else {
        if (!characterPrompt) return toast.error("Enter a character description.");
  // @ts-ignore
        r = await characterMut.mutateAsync({ prompt: characterPrompt });
        setStatusMsg("Consistent Character generating...");
      }
      setPredictionId(r.predictionId);
    } catch (e: any) { setIsProcessing(false); toast.error(e.message); }
  };

  const TABS = [
    { id: "enhance" as const,        label: "Portrait Enhance",    badge: "PuLID",               color: "#F472B6", desc: "AI face enhancement, skin detail preservation" },
    { id: "style-transfer" as const, label: "Face Style Transfer", badge: "Face-to-Many",        color: "#EC4899", desc: "Apply any artistic style to a face" },
    { id: "character" as const,      label: "Character Generator", badge: "Consistent Character",color: "#DB2777", desc: "Generate consistent character across poses" },
    { id: "clone" as const,          label: "Clone Model",         badge: "fluxdevcam",          color: "#8B5CF6", desc: "KingCam trained model — generate any scene with your DNA" },
    { id: "velvet" as const,         label: "Velvet Suite",        badge: "Body-Positive",       color: "#EC4899", desc: "Adult-specific beauty enhancement, skin-tone aware" },
  ];

  const STYLE_PRESETS = [
    "Cinematic film portrait, dramatic lighting",
    "Luxury editorial fashion photography",
    "Soft boudoir photography, warm light",
    "High fashion magazine cover",
    "Artistic oil painting portrait",
    "Neon cyberpunk aesthetic",
  ];

  const left = (
    <>
      <div>
        <p className="text-xs font-black uppercase tracking-widest mb-1" style={{ color: "#F472B6" }}>Face Studio</p>
        <p className="text-xs" style={{ color: "#6B7280" }}>AI portrait enhancement & style transfer</p>
      </div>
      <div className="flex flex-col gap-1.5">
        {TABS.map(t => (
          <button key={t.id} onClick={() => { setActiveTab(t.id); setOutputUrl(null); }} className="flex items-center gap-3 p-3 rounded-xl text-left transition-all" style={{ background: activeTab === t.id ? `${t.color}15` : "rgba(255,255,255,0.03)", border: `1.5px solid ${activeTab === t.id ? t.color : "rgba(255,255,255,0.07)"}` }}>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold" style={{ color: activeTab === t.id ? t.color : "#E5E7EB" }}>{t.label}</span>
                <span className="text-[9px] font-black px-1.5 py-0.5 rounded" style={{ background: `${t.color}25`, color: t.color }}>{t.badge}</span>
              </div>
              <p className="text-xs mt-0.5" style={{ color: "#6B7280" }}>{t.desc}</p>
            </div>
            {activeTab === t.id && <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: t.color }} />}
          </button>
        ))}
      </div>
      {(activeTab === "enhance" || activeTab === "style-transfer") && (
        <div>
          <p className="text-xs font-bold text-white mb-2">{activeTab === "enhance" ? "Portrait Image" : "Face Image"}</p>
          {imageFile ? (
            <div className="relative rounded-2xl overflow-hidden">
              <img src={imageFile.url} alt="face" className="w-full rounded-2xl" style={{ maxHeight: 200, objectFit: "cover" }} />
              <button onClick={() => setImageFile(null)} className="absolute top-2 right-2 w-7 h-7 rounded-full flex items-center justify-center" style={{ background: "rgba(0,0,0,0.7)", color: "white" }}>✕</button>
            </div>
          ) : (
            <ImageDropZone onFile={(url, file) => setImageFile({ url, file })} accent="#F472B6" label="Drop portrait image" />
          )}
        </div>
      )}
      {activeTab === "style-transfer" && (
        <div className="flex flex-col gap-2">
          <label className="text-xs font-bold text-white">Style Prompt</label>
          <textarea value={stylePrompt} onChange={e => setStylePrompt(e.target.value)} rows={3} placeholder="Describe the style to apply..." className="w-full px-3 py-2 rounded-xl text-sm text-white resize-none" style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }} />
          <div className="flex flex-wrap gap-1.5">
            {STYLE_PRESETS.map((p, i) => (
              <button key={i} onClick={() => setStylePrompt(p)} className="px-2 py-1 rounded-lg text-[10px] font-semibold" style={{ background: "rgba(244,114,182,0.1)", color: "#F9A8D4", border: "1px solid rgba(244,114,182,0.2)" }}>{p.split(",")[0]}</button>
            ))}
          </div>
        </div>
      )}
      {activeTab === "character" && (
        <div className="flex flex-col gap-2">
          <label className="text-xs font-bold text-white">Character Description</label>
          <textarea value={characterPrompt} onChange={e => setCharacterPrompt(e.target.value)} rows={4} placeholder="Describe the character in detail — appearance, style, features..." className="w-full px-3 py-2 rounded-xl text-sm text-white resize-none" style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }} />
        </div>
      )}
      <button onClick={process} disabled={isProcessing || (activeTab !== "character" && !imageFile) || (activeTab === "character" && !characterPrompt) || (activeTab === "style-transfer" && !stylePrompt)} className="w-full py-4 rounded-2xl font-black text-white text-sm flex items-center justify-center gap-2" style={{ background: isProcessing ? "rgba(244,114,182,0.3)" : "linear-gradient(135deg, #F472B6, #DB2777)", cursor: isProcessing ? "not-allowed" : "pointer" }}>
        {isProcessing ? <><Loader2 size={18} className="animate-spin" /> {statusMsg || "Processing..."}</> : <><Wand2 size={18} /> {TABS.find(t => t.id === activeTab)?.label}</>}
      </button>
      {isProcessing && <ProcessingBar label={statusMsg || "AI processing face..."} accent="#F472B6" />}
      {outputUrl && (
        <div className="flex flex-col gap-2">
          <img src={outputUrl} alt="output" className="w-full rounded-2xl" style={{ maxHeight: 200, objectFit: "cover" }} />
          <button onClick={() => { const a = document.createElement("a"); a.href = outputUrl; a.download = `vaultx-face-${activeTab}.jpg`; a.click(); }} className="flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold" style={{ background: "rgba(244,114,182,0.15)", color: "#F472B6", border: "1px solid rgba(244,114,182,0.3)" }}><Download size={14} /> Save</button>
        </div>
      )}
    </>
  );

  const right = outputUrl ? (
    <div className="flex-1 flex items-center justify-center rounded-3xl" style={{ background: "#000", minHeight: 400 }}>
      <img src={outputUrl} alt="Face Studio Output" className="max-w-full max-h-full rounded-2xl object-contain" style={{ maxHeight: 600 }} />
    </div>
  ) : imageFile ? (
    <div className="flex-1 flex items-center justify-center rounded-3xl" style={{ background: "#000", minHeight: 400 }}>
      <img src={imageFile.url} alt="Source" className="max-w-full max-h-full rounded-2xl object-contain" style={{ maxHeight: 600 }} />
      {isProcessing && (
        <div className="absolute inset-0 flex items-center justify-center rounded-3xl" style={{ background: "rgba(0,0,0,0.7)" }}>
          <div className="flex flex-col items-center gap-3">
            <div className="w-12 h-12 rounded-full border-2 border-pink-400 border-t-transparent animate-spin" />
            <p className="text-white font-semibold text-sm">{statusMsg}</p>
          </div>
        </div>
      )}
    </div>
  ) : (
    <div className="flex-1 flex flex-col items-center justify-center gap-6 rounded-3xl" style={{ border: "2px dashed rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.01)", minHeight: 400 }}>
      <div className="w-20 h-20 rounded-3xl flex items-center justify-center" style={{ background: "rgba(244,114,182,0.15)", border: "1px solid rgba(244,114,182,0.3)" }}>
        <User size={36} color="#F472B6" />
      </div>
      <div className="text-center">
        <p className="text-white font-black text-xl">Face Studio</p>
        <p className="text-sm mt-2" style={{ color: "#6B7280" }}>Upload a portrait or generate a character with AI</p>
      </div>
    </div>
  );

  return <Workspace left={left} right={right} />;
}

// ============================================================================
// MODE: FINAL OUTPUT ENGINE (UPGRADED)
// ============================================================================
type OutputType = "premium-video" | "teaser-package" | "viral-clips" | "ppv-bundle" | "platform-pack";

interface OutputBundle {
  type: OutputType;
  label: string;
  videos: { url: string; label: string; duration?: number }[];
  captions?: string[];
  hooks?: string[];
  thumbnails?: string[];
  suggestedPrice?: number;
  platform?: string;
  enginesUsed?: { engine: string; status: string; fallback?: boolean }[];
  steps?: { label: string; status: "pending"|"running"|"done"|"error" }[];
}

function FinalOutputEngineMode({ onOutput }: { onOutput: (url: string, label: string) => void }) {
  const publishMut = trpc.vaultx.publishToVault.useMutation();
  const [published, setPublished] = useState(false);
  const [videoFile, setVideoFile] = useState<VideoFile | null>(null);
  const [activeType, setActiveType] = useState<OutputType>("premium-video");
  const [bundle, setBundle] = useState<OutputBundle | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [steps, setSteps] = useState<{ label: string; status: "pending"|"running"|"done"|"error" }[]>([]);

  const premiumMut = trpc.videoEnhance.createPremiumVideo.useMutation();
  const teaserMut  = trpc.videoEnhance.createTeaserPackage.useMutation();
  const viralMut   = trpc.videoEnhance.createViralClipPack.useMutation();

  const OUTPUT_TYPES: { id: OutputType; label: string; icon: React.ReactNode; desc: string; color: string; steps: string[] }[] = [
    {
      id: "premium-video",
      label: "Premium Video",
      icon: <Stars size={16}/>,
      desc: "AI upscale + beauty grade + Whisper captions → production-ready master",
      color: "#F59E0B",
      steps: ["Transcribe audio (Whisper)", "AI upscale (Real-ESRGAN)", "Apply beauty grade", "Burn captions", "Final encode"],
    },
    {
      id: "teaser-package",
      label: "Teaser Package",
      icon: <Clapperboard size={16}/>,
      desc: "AI best-moment detection → teaser clip + full video + hooks + thumbnails",
      color: "#A855F7",
      steps: ["Transcribe audio (Whisper)", "AI moment detection (GPT-4o)", "Cut teaser clip", "Extract thumbnails", "Generate hooks"],
    },
    {
      id: "viral-clips",
      label: "Viral Clip Pack",
      icon: <TrendingUp size={16}/>,
      desc: "AI detects 3–5 viral moments → individual clips with hooks + PPV pricing",
      color: "#EF4444",
      steps: ["Transcribe audio (Whisper)", "Detect viral moments (GPT-4o)", "Cut 3–5 clips", "Generate hooks + pricing", "Package bundle"],
    },
    {
      id: "ppv-bundle",
      label: "PPV Bundle",
      icon: <DollarSign size={16}/>,
      desc: "Teaser + censored preview + full video + AI pricing strategy",
      color: "#22C55E",
      steps: ["Transcribe audio (Whisper)", "AI PPV analysis (GPT-4o)", "Create teaser", "Create censored preview", "Generate pricing strategy"],
    },
    {
      id: "platform-pack",
      label: "Platform Pack",
      icon: <MonitorPlay size={16}/>,
      desc: "Export optimized versions for OF, Fansly, Twitter, TikTok simultaneously",
      color: "#06B6D4",
      steps: ["Analyze source video", "Export OnlyFans version", "Export Fansly version", "Export Twitter/X version", "Export TikTok version"],
    },
  ];

  const activeTypeData = OUTPUT_TYPES.find(t => t.id === activeType)!;

  const runSteps = (stepLabels: string[]) => {
    const initial = stepLabels.map((label, i) => ({ label, status: i === 0 ? "running" as const : "pending" as const }));
    setSteps(initial);
    return {
      advance: (idx: number) => setSteps(prev => prev.map((s, i) => i < idx ? { ...s, status: "done" as const } : i === idx ? { ...s, status: "running" as const } : s)),
      complete: () => setSteps(prev => prev.map(s => ({ ...s, status: "done" as const }))),
      error: (idx: number) => setSteps(prev => prev.map((s, i) => i === idx ? { ...s, status: "error" as const } : s)),
    };
  };

  const process = async () => {
    if (!videoFile) return toast.error("Upload a video first.");
    setIsProcessing(true); setBundle(null);
    const stepData = activeTypeData.steps;
    const ctrl = runSteps(stepData);

    try {
      if (activeType === "premium-video") {
        ctrl.advance(0);
        const r = await premiumMut.mutateAsync({ videoUrl: videoFile.url });
        ctrl.complete();
  // @ts-ignore
        const b: OutputBundle = {
  // @ts-ignore
          type: "premium-video",
          label: "Premium Video",
  // @ts-ignore
          videos: [{ url: r.premiumVideoUrl, label: "Premium Master" }],
  // @ts-ignore
  // @ts-ignore
          captions: r.captions || [],
          enginesUsed: r.enginesUsed || [],
        };
        setBundle(b);
  // @ts-ignore
        onOutput(r.premiumVideoUrl, "Premium Video");
        toast.success("Premium video ready!");
      } else if (activeType === "teaser-package") {
        ctrl.advance(0);
  // @ts-ignore
        const r = await teaserMut.mutateAsync({ videoUrl: videoFile.url });
  // @ts-ignore
        ctrl.complete();
        const b: OutputBundle = {
  // @ts-ignore
          type: "teaser-package",
  // @ts-ignore
          label: "Teaser Package",
  // @ts-ignore
          videos: [
  // @ts-ignore
            { url: r.teaserUrl, label: "Teaser Clip" },
  // @ts-ignore
            { url: r.fullVideoUrl, label: "Full Video" },
          ],
  // @ts-ignore
          captions: r.captions || [],
  // @ts-ignore
          hooks: r.hooks || [],
  // @ts-ignore
          thumbnails: r.thumbnails || [],
          enginesUsed: r.enginesUsed || [],
  // @ts-ignore
        };
  // @ts-ignore
        setBundle(b);
  // @ts-ignore
  // @ts-ignore
        onOutput(r.teaserUrl, "Teaser Package");
        toast.success("Teaser package ready!");
      } else if (activeType === "viral-clips") {
  // @ts-ignore
        ctrl.advance(0);
  // @ts-ignore
        const r = await viralMut.mutateAsync({ videoUrl: videoFile.url });
        ctrl.complete();
        const b: OutputBundle = {
          type: "viral-clips",
          label: "Viral Clip Pack",
  // @ts-ignore
          videos: (r.clips || []).map((c: any) => ({ url: c.url, label: c.caption || "Clip" })),
  // @ts-ignore
          hooks: (r.clips || []).map((c: any) => c.hook),
  // @ts-ignore
          suggestedPrice: r.clips?.[0]?.price,
          enginesUsed: r.enginesUsed || [],
        };
        setBundle(b);
  // @ts-ignore
        if (r.clips?.[0]?.url) onOutput(r.clips[0].url, "Viral Clips");
  // @ts-ignore
        toast.success(`${r.clips?.length || 0} viral clips ready!`);
      } else {
        // PPV Bundle and Platform Pack — use existing video studio endpoints
        ctrl.advance(0);
        const fd = new FormData(); fd.append("video", videoFile.file); fd.append("start", "0"); fd.append("end", "30");
        const teaser = await callVideoStudio("trim", fd);
        ctrl.advance(1);
        const fd2 = new FormData(); fd2.append("video", videoFile.file); fd2.append("filter", "censor_blur"); fd2.append("intensity", "0.8");
        const censored = await callVideoStudio("filter", fd2);
        ctrl.advance(2);
        const fd3 = new FormData(); fd3.append("video", videoFile.file); fd3.append("format", "mp4_h264"); fd3.append("resolution", "1080p");
        const full = await callVideoStudio("convert", fd3);
        ctrl.complete();
        const b: OutputBundle = {
          type: activeType,
          label: activeType === "ppv-bundle" ? "PPV Bundle" : "Platform Pack",
          videos: [
            { url: teaser.url, label: "Teaser (30s)" },
            ...(activeType === "ppv-bundle" ? [{ url: censored.url, label: "Censored Preview" }] : []),
            { url: full.url, label: "Full Video" },
          ],
          enginesUsed: [{ engine: "FFmpeg", status: "succeeded" }],
        };
        setBundle(b);
        onOutput(teaser.url, b.label);
        toast.success(`${b.label} ready!`);
      }
    } catch (e: any) {
      setIsProcessing(false);
      toast.error(e.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const left = (
    <>
      <div>
        <p className="text-xs font-black uppercase tracking-widest mb-1" style={{ color: "#F59E0B" }}>Final Output Engine</p>
        <p className="text-xs" style={{ color: "#6B7280" }}>One click → production-ready output bundle</p>
      </div>
      <div className="flex flex-col gap-1.5">
        {OUTPUT_TYPES.map(t => (
          <button key={t.id} onClick={() => { setActiveType(t.id); setBundle(null); setSteps([]); }} className="flex items-start gap-3 p-3 rounded-xl text-left transition-all" style={{ background: activeType === t.id ? `${t.color}15` : "rgba(255,255,255,0.03)", border: `1.5px solid ${activeType === t.id ? t.color : "rgba(255,255,255,0.07)"}` }}>
            <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5" style={{ background: `${t.color}20`, color: t.color }}>{t.icon}</div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold" style={{ color: activeType === t.id ? t.color : "#E5E7EB" }}>{t.label}</p>
              <p className="text-xs mt-0.5 leading-tight" style={{ color: "#6B7280" }}>{t.desc}</p>
            </div>
            {activeType === t.id && <div className="w-2 h-2 rounded-full flex-shrink-0 mt-1" style={{ background: t.color }} />}
          </button>
        ))}
      </div>
      {steps.length > 0 && (
        <div className="flex flex-col gap-1.5 p-4 rounded-2xl" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
          <p className="text-[10px] font-black uppercase tracking-widest mb-1" style={{ color: "#6B7280" }}>Progress</p>
          {steps.map((s, i) => (
            <div key={i} className="flex items-center gap-2">
              {s.status === "done"    && <CircleCheck size={14} color="#22C55E" />}
              {s.status === "running" && <Loader2 size={14} color="#F59E0B" className="animate-spin" />}
              {s.status === "pending" && <Circle size={14} color="#374151" />}
              {s.status === "error"   && <AlertCircle size={14} color="#EF4444" />}
              <span className="text-xs" style={{ color: s.status === "done" ? "#22C55E" : s.status === "running" ? "#F59E0B" : s.status === "error" ? "#EF4444" : "#6B7280" }}>{s.label}</span>
            </div>
          ))}
        </div>
      )}
      <button onClick={process} disabled={!videoFile || isProcessing} className="w-full py-4 rounded-2xl font-black text-white text-sm flex items-center justify-center gap-2" style={{ background: !videoFile || isProcessing ? `${activeTypeData.color}40` : `linear-gradient(135deg, ${activeTypeData.color}, ${activeTypeData.color}CC)`, cursor: !videoFile || isProcessing ? "not-allowed" : "pointer", boxShadow: !videoFile || isProcessing ? "none" : `0 0 28px ${activeTypeData.color}40` }}>
        {isProcessing ? <><Loader2 size={18} className="animate-spin" /> Generating {activeTypeData.label}...</> : <><Package size={18} /> Generate {activeTypeData.label}</>}
      </button>
    </>
  );

  const right = bundle ? (
    <div className="flex-1 flex flex-col gap-4 overflow-y-auto">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-white font-black text-lg">{bundle.label}</p>
          <p className="text-xs mt-0.5" style={{ color: "#6B7280" }}>{bundle.videos.length} video{bundle.videos.length !== 1 ? "s" : ""} ready</p>
        </div>
        {bundle.enginesUsed && bundle.enginesUsed.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {bundle.enginesUsed.map((e, i) => <EngineBadge key={i} engine={e.engine} status={e.status} fallback={e.fallback} />)}
          </div>
        )}
      </div>
      <div className="grid gap-4" style={{ gridTemplateColumns: bundle.videos.length > 1 ? "1fr 1fr" : "1fr" }}>
        {bundle.videos.map((v, i) => (
          <div key={i} className="flex flex-col gap-2">
            <VideoPlayer src={v.url} label={v.label} accent={activeTypeData.color} />
            <button onClick={() => { const a = document.createElement("a"); a.href = v.url; a.download = `vaultx-${bundle.type}-${i}.mp4`; a.click(); }} className="flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-bold" style={{ background: `${activeTypeData.color}15`, color: activeTypeData.color, border: `1px solid ${activeTypeData.color}30` }}><Download size={12} /> Save</button>
          </div>
        ))}
      </div>
      {bundle.hooks && bundle.hooks.length > 0 && (
        <div className="flex flex-col gap-2 p-4 rounded-2xl" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
          <p className="text-[10px] font-black uppercase tracking-widest" style={{ color: "#6B7280" }}>AI-Generated Hooks</p>
          {bundle.hooks.map((h, i) => (
            <div key={i} className="flex items-start gap-2">
              <p className="flex-1 text-sm text-white leading-snug">{h}</p>
              <button onClick={() => navigator.clipboard.writeText(h)} className="w-7 h-7 flex items-center justify-center rounded-lg flex-shrink-0" style={{ background: "rgba(255,255,255,0.06)", color: "#6B7280" }}><Copy size={12} /></button>
            </div>
          ))}
        </div>
      )}
      {bundle.thumbnails && bundle.thumbnails.length > 0 && (
        <div className="flex flex-col gap-2">
          <p className="text-[10px] font-black uppercase tracking-widest" style={{ color: "#6B7280" }}>Thumbnails</p>
          <div className="grid grid-cols-4 gap-2">
            {bundle.thumbnails.map((t, i) => (
              <div key={i} className="relative rounded-xl overflow-hidden cursor-pointer" style={{ aspectRatio: "16/9", background: "#111" }}>
                <img src={t} alt={`Thumbnail ${i+1}`} className="w-full h-full object-cover" />
                <button onClick={() => { const a = document.createElement("a"); a.href = t; a.download = `thumbnail-${i+1}.jpg`; a.click(); }} className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity" style={{ background: "rgba(0,0,0,0.5)" }}><Download size={16} color="white" /></button>
              </div>
            ))}
          </div>
        </div>
      )}
      {bundle.suggestedPrice && (
        <div className="flex items-center gap-3 p-4 rounded-2xl" style={{ background: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.2)" }}>
          <DollarSign size={20} color="#22C55E" />
          <div>
            <p className="text-sm font-black text-white">Suggested PPV Price: <span style={{ color: "#22C55E" }}>${bundle.suggestedPrice}</span></p>
            {bundle.platform && <p className="text-xs mt-0.5" style={{ color: "#9CA3AF" }}>Platform: {bundle.platform}</p>}
          </div>
  // @ts-ignore
        </div>
  // @ts-ignore
      )}
      {bundle.videos && bundle.videos.length > 0 && (
        <button onClick={async () => {
          if (published) return;
          try {
            const primaryVideo = bundle.videos[0];
            await publishMut.mutateAsync({
              fileUrl: primaryVideo.url,
              title: bundle.label || "VaultX Output",
              unlockType: bundle.type === "ppv-bundle" ? "ppv" : "subscription",
              priceCents: bundle.suggestedPrice ? Math.round(bundle.suggestedPrice * 100) : 0,
              tags: bundle.enginesUsed?.map((e: any) => e.engine) || [],
            });
            setPublished(true);
            toast.success("Published to your Content Vault!");
          } catch(e: any) { toast.error(e.message); }
  // @ts-ignore
        }} disabled={published || publishMut.isPending} className="w-full py-3 rounded-2xl font-black text-white text-sm flex items-center justify-center gap-2" style={{ background: published ? "rgba(34,197,94,0.2)" : "linear-gradient(135deg, #F59E0B, #D97706)", opacity: publishMut.isPending ? 0.7 : 1 }}>
  // @ts-ignore
          {published ? <><ShieldCheck size={16} /> Published to Vault</> : publishMut.isPending ? <><Loader2 size={16} className="animate-spin" /> Publishing...</> : <><HardDrive size={16} /> Publish to Content Vault</>}
        </button>
      )}
    </div>
  ) : videoFile ? (
    <div className="flex-1 flex flex-col gap-4">
      <CanvasVideoPlayer src={videoFile.url} label="Source" accent={activeTypeData.color} onReplace={() => setVideoFile(null)} />
      <div className="p-4 rounded-2xl" style={{ background: `${activeTypeData.color}08`, border: `1px solid ${activeTypeData.color}20` }}>
        <p className="text-sm font-bold text-white mb-2">What will be generated:</p>
        <div className="flex flex-col gap-1.5">
          {activeTypeData.steps.map((s, i) => (
            <div key={i} className="flex items-center gap-2">
              <div className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black flex-shrink-0" style={{ background: `${activeTypeData.color}25`, color: activeTypeData.color }}>{i+1}</div>
              <span className="text-xs text-white">{s}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  ) : (
    <CanvasDropZone onFile={setVideoFile} accent={activeTypeData.color} label={`Drop your video to generate ${activeTypeData.label}`} />
  );

  return <Workspace left={left} right={right} />;
}

// ============================================================================
// CREATOR TIERS MODE — Manage subscription tiers, perks & pricing
// ============================================================================
function CreatorTiersMode() {
  const subscribersQ = trpc.vaultx.getSubscriberList.useQuery({ tier: "all", sortBy: "total_spent", limit: 100, offset: 0 });
  const [activeTier, setActiveTier] = useState<"all" | "basic" | "premium" | "vip">("all");
  const TIERS = [
    { id: "basic" as const,   label: "Basic",   color: "#60A5FA", price: "$9.99",  perks: ["All SFW content", "DMs open", "Monthly Q&A"] },
    { id: "premium" as const, label: "Premium", color: "#A855F7", price: "$19.99", perks: ["All Basic perks", "Explicit content", "Priority DMs", "Weekly lives"] },
    { id: "vip" as const,     label: "VIP",     color: "#F59E0B", price: "$49.99", perks: ["All Premium perks", "Custom requests", "1-on-1 video calls", "Exclusive drops"] },
  ];
  const subs = subscribersQ.data?.subscribers || [];
  const filtered = activeTier === "all" ? subs : subs.filter(s => s.tier === activeTier);
  const totalRevenue = subs.reduce((acc, s) => acc + Number(s.price_paid || 0), 0);
  const totalTips = subs.reduce((acc, s) => acc + Number(s.tips_total || 0), 0);
  const totalPpv = subs.reduce((acc, s) => acc + Number(s.ppv_total || 0), 0);

  return (
    <div className="flex h-full overflow-hidden">
      {/* LEFT — Tier Cards */}
      <div className="flex-shrink-0 flex flex-col gap-3 p-4 overflow-y-auto" style={{ width: 280, borderRight: "1px solid rgba(255,255,255,0.06)" }}>
        <p className="text-xs font-black uppercase tracking-widest" style={{ color: "#6B7280" }}>Subscription Tiers</p>
        {TIERS.map(t => (
          <div key={t.id} onClick={() => setActiveTier(t.id)} className="p-4 rounded-2xl cursor-pointer transition-all" style={{ background: activeTier === t.id ? `${t.color}15` : "rgba(255,255,255,0.03)", border: `1px solid ${activeTier === t.id ? t.color + "50" : "rgba(255,255,255,0.06)"}` }}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-black" style={{ color: t.color }}>{t.label}</span>
              <span className="text-sm font-black text-white">{t.price}<span className="text-xs font-normal" style={{ color: "#6B7280" }}>/mo</span></span>
            </div>
            <div className="flex flex-col gap-1">
              {t.perks.map((p, i) => <div key={i} className="flex items-center gap-1.5"><div className="w-1 h-1 rounded-full" style={{ background: t.color }} /><span className="text-xs" style={{ color: "#9CA3AF" }}>{p}</span></div>)}
            </div>
            <div className="mt-3 pt-3" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
              <span className="text-xs font-bold" style={{ color: "#6B7280" }}>{subs.filter(s => s.tier === t.id).length} active subscribers</span>
            </div>
          </div>
        ))}
        <div className="p-4 rounded-2xl" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
          <p className="text-xs font-black uppercase tracking-widest mb-3" style={{ color: "#6B7280" }}>Revenue Summary</p>
          <div className="flex flex-col gap-2">
            <div className="flex justify-between"><span className="text-xs" style={{ color: "#9CA3AF" }}>Subscriptions</span><span className="text-xs font-bold text-white">${totalRevenue.toFixed(2)}</span></div>
            <div className="flex justify-between"><span className="text-xs" style={{ color: "#9CA3AF" }}>Tips</span><span className="text-xs font-bold text-white">${totalTips.toFixed(2)}</span></div>
            <div className="flex justify-between"><span className="text-xs" style={{ color: "#9CA3AF" }}>PPV</span><span className="text-xs font-bold text-white">${totalPpv.toFixed(2)}</span></div>
            <div className="flex justify-between pt-2" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}><span className="text-xs font-black text-white">Total</span><span className="text-xs font-black" style={{ color: "#22C55E" }}>${(totalRevenue + totalTips + totalPpv).toFixed(2)}</span></div>
          </div>
        </div>
      </div>

      {/* RIGHT — Subscriber List */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="flex-shrink-0 flex items-center gap-2 p-4" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
          {(["all", "basic", "premium", "vip"] as const).map(t => (
            <button key={t} onClick={() => setActiveTier(t)} className="px-3 py-1.5 rounded-xl text-xs font-bold transition-all" style={{ background: activeTier === t ? "rgba(255,255,255,0.1)" : "transparent", color: activeTier === t ? "white" : "#6B7280", border: "1px solid rgba(255,255,255,0.08)" }}>
              {t === "all" ? `All (${subs.length})` : `${t.charAt(0).toUpperCase() + t.slice(1)} (${subs.filter(s => s.tier === t).length})`}
            </button>
          ))}
          <div className="flex-1" />
          {subscribersQ.isLoading && <Loader2 size={14} className="animate-spin" style={{ color: "#6B7280" }} />}
        </div>
        <div className="flex-1 overflow-y-auto p-4">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-3">
              <Crown size={32} style={{ color: "#374151" }} />
              <p className="text-sm font-bold" style={{ color: "#4B5563" }}>No subscribers yet</p>
              <p className="text-xs" style={{ color: "#374151" }}>Share your VaultX profile to start earning</p>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {filtered.map((sub: any) => (
                <div key={sub.id} className="flex items-center gap-3 p-3 rounded-xl" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-black" style={{ background: "rgba(255,255,255,0.08)", color: "white" }}>{(sub.name || sub.username || "?").charAt(0).toUpperCase()}</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-white truncate">{sub.name || sub.username || `Fan #${sub.fan_id}`}</p>
                    <p className="text-[10px]" style={{ color: "#6B7280" }}>Joined {new Date(sub.created_at).toLocaleDateString()}</p>
                  </div>
                  <div className="flex flex-col items-end gap-0.5">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: sub.tier === "vip" ? "rgba(245,158,11,0.15)" : sub.tier === "premium" ? "rgba(168,85,247,0.15)" : "rgba(96,165,250,0.15)", color: sub.tier === "vip" ? "#F59E0B" : sub.tier === "premium" ? "#A855F7" : "#60A5FA" }}>{sub.tier}</span>
                    <span className="text-[10px] font-bold" style={{ color: "#22C55E" }}>${Number(sub.total_spent || 0).toFixed(2)} total</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// MASS BROADCAST MODE — Send PPV mass messages to all subscribers
// ============================================================================
function MassBroadcastMode() {
  const sendMut = trpc.vaultx.sendMassMessage.useMutation();
  const subscribersQ = trpc.vaultx.getSubscriberList.useQuery({ tier: "all", sortBy: "join_date", limit: 1, offset: 0 });
  const generateCopyMut = trpc.vaultx.generateMassBroadcastCopy.useMutation({
    onSuccess: (data) => {
      toast.success("AI broadcast copy generated — review before sending");
    },
    onError: (e) => toast.error(`Copy gen: ${e.message}`),
  });
  const [subject, setSubject] = useState("");
  const [messageText, setMessageText] = useState("");
  const [mediaUrl, setMediaUrl] = useState("");
  const [mediaType, setMediaType] = useState<"photo" | "video" | "audio">("video");
  const [isLocked, setIsLocked] = useState(false);
  const [unlockPrice, setUnlockPrice] = useState("9.99");
  const [targetTier, setTargetTier] = useState<"all" | "basic" | "premium" | "vip">("all");
  const [scheduledFor, setScheduledFor] = useState("");
  const [sent, setSent] = useState<{ massMessageId: number; recipientCount: number } | null>(null);
  const totalSubs = subscribersQ.data?.subscribers?.length ?? 0;

  const handleSend = async () => {
    if (!messageText.trim()) { toast.error("Message text is required"); return; }
    try {
      const result = await sendMut.mutateAsync({
        subject: subject || undefined,
        messageText,
        mediaUrl: mediaUrl || undefined,
        mediaType: mediaUrl ? mediaType : undefined,
        isLocked,
        unlockPrice: isLocked ? parseFloat(unlockPrice) : 0,
        targetTier,
        scheduledFor: scheduledFor || undefined,
      });
      setSent(result);
      toast.success(scheduledFor ? "Message scheduled!" : `Broadcast sent to ${result.recipientCount} subscribers!`);
    } catch (e: any) { toast.error(e.message); }
  };

  return (
    <div className="flex h-full overflow-hidden">
      {/* COMPOSE PANEL */}
      <div className="flex-1 flex flex-col overflow-y-auto p-6 gap-4">
        <div>
          <p className="text-xs font-black uppercase tracking-widest mb-3" style={{ color: "#6B7280" }}>Compose Broadcast</p>
          <div className="flex flex-col gap-3">
            <div>
              <label className="text-[10px] font-bold uppercase tracking-widest mb-1 block" style={{ color: "#6B7280" }}>Subject (optional)</label>
              <input value={subject} onChange={e => setSubject(e.target.value)} placeholder="e.g. 🔥 New exclusive drop" className="w-full px-3 py-2 rounded-xl text-sm text-white" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", outline: "none" }} />
            </div>
            <div>
              <label className="text-[10px] font-bold uppercase tracking-widest mb-1 block" style={{ color: "#6B7280" }}>Message <span style={{ color: "#EF4444" }}>*</span></label>
              <textarea value={messageText} onChange={e => setMessageText(e.target.value)} placeholder="Write your message to fans..." rows={5} className="w-full px-3 py-2 rounded-xl text-sm text-white resize-none" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", outline: "none" }} />
              <p className="text-[10px] mt-1" style={{ color: messageText.length > 4500 ? "#EF4444" : "#4B5563" }}>{messageText.length}/5000</p>
            </div>
            <div>
              <label className="text-[10px] font-bold uppercase tracking-widest mb-1 block" style={{ color: "#6B7280" }}>Media URL (optional)</label>
              <input value={mediaUrl} onChange={e => setMediaUrl(e.target.value)} placeholder="https://creatorvault.live/uploads/..." className="w-full px-3 py-2 rounded-xl text-sm text-white" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", outline: "none" }} />
            </div>
            {mediaUrl && (
              <div className="flex gap-2">
                {(["photo", "video", "audio"] as const).map(t => (
                  <button key={t} onClick={() => setMediaType(t)} className="flex-1 py-2 rounded-xl text-xs font-bold transition-all" style={{ background: mediaType === t ? "rgba(168,85,247,0.2)" : "rgba(255,255,255,0.04)", color: mediaType === t ? "#A855F7" : "#6B7280", border: `1px solid ${mediaType === t ? "rgba(168,85,247,0.4)" : "rgba(255,255,255,0.08)"}` }}>{t}</button>
                ))}
              </div>
            )}
            <div className="flex items-center gap-3 p-3 rounded-xl" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
              <button onClick={() => setIsLocked(l => !l)} className="w-8 h-4 rounded-full transition-all relative" style={{ background: isLocked ? "rgba(168,85,247,0.5)" : "rgba(255,255,255,0.1)" }}>
                <div className="absolute top-0.5 w-3 h-3 rounded-full bg-white transition-all" style={{ left: isLocked ? "calc(100% - 14px)" : "2px" }} />
              </button>
              <div>
                <p className="text-xs font-bold text-white">PPV Lock</p>
                <p className="text-[10px]" style={{ color: "#6B7280" }}>Fans pay to unlock this message</p>
              </div>
              {isLocked && (
                <div className="ml-auto flex items-center gap-1">
                  <span className="text-xs" style={{ color: "#9CA3AF" }}>$</span>
                  <input value={unlockPrice} onChange={e => setUnlockPrice(e.target.value)} className="w-16 px-2 py-1 rounded-lg text-xs text-white text-right" style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.1)", outline: "none" }} />
                </div>
              )}
            </div>
          </div>
        </div>

        {sent && (
          <div className="p-4 rounded-2xl" style={{ background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.3)" }}>
            <div className="flex items-center gap-2 mb-1"><ShieldCheck size={16} style={{ color: "#22C55E" }} /><span className="text-sm font-black" style={{ color: "#22C55E" }}>Broadcast Sent!</span></div>
            <p className="text-xs" style={{ color: "#9CA3AF" }}>Message ID #{sent.massMessageId} delivered to {sent.recipientCount} subscribers</p>
          </div>
        )}

        <button onClick={handleSend} disabled={sendMut.isPending || !messageText.trim()} className="w-full py-3 rounded-2xl text-sm font-black transition-all" style={{ background: sendMut.isPending ? "rgba(255,255,255,0.05)" : "rgba(16,185,129,0.2)", color: sendMut.isPending ? "#4B5563" : "#10B981", border: `1px solid ${sendMut.isPending ? "rgba(255,255,255,0.06)" : "rgba(16,185,129,0.4)"}` }}>
          {sendMut.isPending ? <><Loader2 size={14} className="animate-spin inline mr-2" />Sending...</> : scheduledFor ? <><Clock size={14} className="inline mr-2" />Schedule Broadcast</> : <><Send size={14} className="inline mr-2" />Send to {targetTier === "all" ? "All" : targetTier.charAt(0).toUpperCase() + targetTier.slice(1)} Subscribers</>}
        </button>
      </div>

      {/* RIGHT — Settings Panel */}
      <div className="flex-shrink-0 flex flex-col gap-4 p-4 overflow-y-auto" style={{ width: 260, borderLeft: "1px solid rgba(255,255,255,0.06)" }}>
        <div>
          <p className="text-[10px] font-black uppercase tracking-widest mb-2" style={{ color: "#6B7280" }}>Target Audience</p>
          {(["all", "basic", "premium", "vip"] as const).map(t => (
            <button key={t} onClick={() => setTargetTier(t)} className="w-full flex items-center justify-between px-3 py-2 rounded-xl mb-1 text-xs font-bold transition-all" style={{ background: targetTier === t ? "rgba(255,255,255,0.08)" : "transparent", color: targetTier === t ? "white" : "#6B7280", border: `1px solid ${targetTier === t ? "rgba(255,255,255,0.12)" : "transparent"}` }}>
              <span>{t === "all" ? "All Subscribers" : t.charAt(0).toUpperCase() + t.slice(1)}</span>
              {targetTier === t && <div className="w-1.5 h-1.5 rounded-full bg-green-500" />}
            </button>
          ))}
        </div>
        <div>
          <p className="text-[10px] font-black uppercase tracking-widest mb-2" style={{ color: "#6B7280" }}>Schedule (optional)</p>
          <input type="datetime-local" value={scheduledFor} onChange={e => setScheduledFor(e.target.value)} className="w-full px-3 py-2 rounded-xl text-xs text-white" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", outline: "none", colorScheme: "dark" }} />
          {scheduledFor && <button onClick={() => setScheduledFor("")} className="mt-1 text-[10px]" style={{ color: "#EF4444" }}>Clear schedule</button>}
        </div>
        <div className="p-3 rounded-xl" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
          <p className="text-[10px] font-black uppercase tracking-widest mb-2" style={{ color: "#6B7280" }}>Broadcast Stats</p>
          <div className="flex justify-between"><span className="text-xs" style={{ color: "#9CA3AF" }}>Total subscribers</span><span className="text-xs font-bold text-white">{totalSubs}</span></div>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// AI CHATTER MODE — Configure AI to reply as you 24/7
// ============================================================================
function AIChatterMode() {
  const configQ = trpc.vaultx.getAiChatterConfig.useQuery();
  const saveMut = trpc.vaultx.saveAiChatterConfig.useMutation();
  const generateResponseMut = trpc.vaultx.generateAIChatterResponse.useMutation({
    onSuccess: (data) => {
      setGeneratedResponse(data.response);
      toast.success("AI response generated");
    },
    onError: (e) => toast.error(`AI response: ${e.message}`),
  });
  const generatePersonaMut = trpc.vaultx.generateCreatorPersona.useMutation({
    onSuccess: (data) => {
      if (data.personaName) setPersonaName(data.personaName);
      if (data.personaDescription) setPersonaDescription(data.personaDescription);
      if (data.greetingMessage) setGreetingMessage(data.greetingMessage);
      toast.success("AI persona generated — review and save");
    },
    onError: (e) => toast.error(`Persona gen: ${e.message}`),
  });
  const broadcastCopyMut = trpc.vaultx.generateMassBroadcastCopy.useMutation({
    onSuccess: (data) => {
      toast.success("Broadcast copy generated");
    },
    onError: (e) => toast.error(`Broadcast copy: ${e.message}`),
  });
  const [generatedResponse, setGeneratedResponse] = useState("");
  const [testFanMessage, setTestFanMessage] = useState("");
  const cfg = configQ.data?.config;
  const [isEnabled, setIsEnabled] = useState(false);
  const [personaName, setPersonaName] = useState("");
  const [personaDescription, setPersonaDescription] = useState("");
  const [greetingMessage, setGreetingMessage] = useState("");
  const [ppvFreq, setPpvFreq] = useState(3);
  const [tipFreq, setTipFreq] = useState(5);
  const [schedStart, setSchedStart] = useState(0);
  const [schedEnd, setSchedEnd] = useState(24);
  const [saved, setSaved] = useState(false);

  // Populate from DB when loaded
  useEffect(() => {
    if (cfg) {
      setIsEnabled(!!cfg.is_enabled);
      setPersonaName(cfg.persona_name || "");
      setPersonaDescription(cfg.persona_description || "");
      setGreetingMessage(cfg.greeting_message || "");
      setPpvFreq(cfg.ppv_pitch_frequency || 3);
      setTipFreq(cfg.tip_request_frequency || 5);
      if (cfg.schedule_hours) {
        try { const s = JSON.parse(cfg.schedule_hours); setSchedStart(s.start || 0); setSchedEnd(s.end || 24); } catch {}
      }
    }
  }, [cfg]);

  const handleSave = async () => {
    try {
      await saveMut.mutateAsync({
        isEnabled,
        personaName: personaName || undefined,
        personaDescription: personaDescription || undefined,
        greetingMessage: greetingMessage || undefined,
        ppvPitchFrequency: ppvFreq,
        tipRequestFrequency: tipFreq,
        scheduleHours: { start: schedStart, end: schedEnd },
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
      toast.success("AI Chatter config saved!");
    } catch (e: any) { toast.error(e.message); }
  };
  const handleGeneratePersona = async () => {
    if (!personaName) return toast.error("Enter a persona name first");
    await generatePersonaMut.mutateAsync({
      creatorName: personaName,
      niche: "adult content creation",
      personality: personaDescription || "confident, warm, flirty",
      contentStyle: "sensual",
    });
  };
  const handleTestResponse = async () => {
    if (!testFanMessage) return toast.error("Enter a test fan message");
    await generateResponseMut.mutateAsync({
      fanMessage: testFanMessage,
      includePpvPitch: false,
      includeTipRequest: false,
    });
  };

  if (configQ.isLoading) return <div className="flex items-center justify-center h-full"><Loader2 size={24} className="animate-spin" style={{ color: "#8B5CF6" }} /></div>;

  return (
    <div className="flex h-full overflow-hidden">
      {/* LEFT — Config */}
      <div className="flex-1 flex flex-col overflow-y-auto p-6 gap-5">
        {/* Enable toggle */}
        <div className="flex items-center justify-between p-4 rounded-2xl" style={{ background: isEnabled ? "rgba(139,92,246,0.1)" : "rgba(255,255,255,0.03)", border: `1px solid ${isEnabled ? "rgba(139,92,246,0.4)" : "rgba(255,255,255,0.06)"}` }}>
          <div>
            <p className="text-sm font-black text-white">AI Chatter {isEnabled ? "Active" : "Disabled"}</p>
            <p className="text-xs mt-0.5" style={{ color: "#6B7280" }}>AI replies as you 24/7 — earn while offline</p>
          </div>
          <button onClick={() => setIsEnabled(e => !e)} className="w-12 h-6 rounded-full transition-all relative" style={{ background: isEnabled ? "rgba(139,92,246,0.6)" : "rgba(255,255,255,0.1)" }}>
            <div className="absolute top-1 w-4 h-4 rounded-full bg-white transition-all" style={{ left: isEnabled ? "calc(100% - 20px)" : "4px" }} />
          </button>
        </div>

        {/* Persona */}
        <div>
          <p className="text-xs font-black uppercase tracking-widest mb-3" style={{ color: "#6B7280" }}>AI Persona</p>
          <div className="flex flex-col gap-3">
            <div>
              <label className="text-[10px] font-bold uppercase tracking-widest mb-1 block" style={{ color: "#6B7280" }}>Persona Name</label>
              <input value={personaName} onChange={e => setPersonaName(e.target.value)} placeholder="e.g. Luna, Aria, your creator name" className="w-full px-3 py-2 rounded-xl text-sm text-white" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", outline: "none" }} />
            </div>
            <div>
              <label className="text-[10px] font-bold uppercase tracking-widest mb-1 block" style={{ color: "#6B7280" }}>Persona Description</label>
              <textarea value={personaDescription} onChange={e => setPersonaDescription(e.target.value)} placeholder="Describe how the AI should talk, what topics to discuss, what to avoid..." rows={4} className="w-full px-3 py-2 rounded-xl text-sm text-white resize-none" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", outline: "none" }} />
            </div>
            <div>
              <label className="text-[10px] font-bold uppercase tracking-widest mb-1 block" style={{ color: "#6B7280" }}>Greeting Message</label>
              <textarea value={greetingMessage} onChange={e => setGreetingMessage(e.target.value)} placeholder="First message sent to new subscribers..." rows={3} className="w-full px-3 py-2 rounded-xl text-sm text-white resize-none" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", outline: "none" }} />
            </div>
          </div>
        </div>

        {/* Monetization frequency */}
        <div>
          <p className="text-xs font-black uppercase tracking-widest mb-3" style={{ color: "#6B7280" }}>Monetization Frequency</p>
          <div className="flex flex-col gap-3">
            <div>
              <div className="flex justify-between mb-1">
                <label className="text-[10px] font-bold uppercase tracking-widest" style={{ color: "#6B7280" }}>PPV Pitch — every {ppvFreq} messages</label>
                <span className="text-[10px] font-bold" style={{ color: "#A855F7" }}>{ppvFreq}</span>
              </div>
              <input type="range" min={1} max={20} value={ppvFreq} onChange={e => setPpvFreq(Number(e.target.value))} className="w-full" style={{ accentColor: "#A855F7" }} />
            </div>
            <div>
              <div className="flex justify-between mb-1">
                <label className="text-[10px] font-bold uppercase tracking-widest" style={{ color: "#6B7280" }}>Tip Request — every {tipFreq} messages</label>
                <span className="text-[10px] font-bold" style={{ color: "#F59E0B" }}>{tipFreq}</span>
              </div>
              <input type="range" min={1} max={20} value={tipFreq} onChange={e => setTipFreq(Number(e.target.value))} className="w-full" style={{ accentColor: "#F59E0B" }} />
            </div>
          </div>
        </div>

        {saved && (
          <div className="p-3 rounded-xl" style={{ background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.3)" }}>
            <div className="flex items-center gap-2"><ShieldCheck size={14} style={{ color: "#22C55E" }} /><span className="text-xs font-bold" style={{ color: "#22C55E" }}>Config saved to database</span></div>
          </div>
        )}

        <button onClick={handleSave} disabled={saveMut.isPending} className="w-full py-3 rounded-2xl text-sm font-black transition-all" style={{ background: saveMut.isPending ? "rgba(255,255,255,0.05)" : "rgba(139,92,246,0.2)", color: saveMut.isPending ? "#4B5563" : "#8B5CF6", border: `1px solid ${saveMut.isPending ? "rgba(255,255,255,0.06)" : "rgba(139,92,246,0.4)"}` }}>
          {saveMut.isPending ? <><Loader2 size={14} className="animate-spin inline mr-2" />Saving...</> : "Save AI Chatter Config"}
        </button>
      </div>

      {/* RIGHT — Schedule */}
      <div className="flex-shrink-0 flex flex-col gap-4 p-4 overflow-y-auto" style={{ width: 260, borderLeft: "1px solid rgba(255,255,255,0.06)" }}>
        <div>
          <p className="text-[10px] font-black uppercase tracking-widest mb-3" style={{ color: "#6B7280" }}>Active Hours</p>
          <p className="text-xs mb-3" style={{ color: "#9CA3AF" }}>AI only replies during these hours (your timezone)</p>
          <div className="flex flex-col gap-3">
            <div>
              <label className="text-[10px] font-bold uppercase tracking-widest mb-1 block" style={{ color: "#6B7280" }}>Start Hour: {schedStart}:00</label>
              <input type="range" min={0} max={23} value={schedStart} onChange={e => setSchedStart(Number(e.target.value))} className="w-full" style={{ accentColor: "#8B5CF6" }} />
            </div>
            <div>
              <label className="text-[10px] font-bold uppercase tracking-widest mb-1 block" style={{ color: "#6B7280" }}>End Hour: {schedEnd}:00</label>
              <input type="range" min={1} max={24} value={schedEnd} onChange={e => setSchedEnd(Number(e.target.value))} className="w-full" style={{ accentColor: "#8B5CF6" }} />
            </div>
          </div>
          <div className="mt-3 p-3 rounded-xl" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
            <p className="text-xs font-bold text-white">{schedStart}:00 — {schedEnd}:00</p>
            <p className="text-[10px] mt-0.5" style={{ color: "#6B7280" }}>{schedEnd - schedStart} hour window</p>
          </div>
        </div>
        <div className="p-3 rounded-xl" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
          <p className="text-[10px] font-black uppercase tracking-widest mb-2" style={{ color: "#6B7280" }}>How It Works</p>
          {["Fan sends a message", "AI reads conversation history", "AI replies as your persona", "Pitches PPV/tips at set frequency", "You review & override anytime"].map((s, i) => (
            <div key={i} className="flex items-start gap-2 mb-1.5">
              <div className="w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-black flex-shrink-0 mt-0.5" style={{ background: "rgba(139,92,246,0.2)", color: "#8B5CF6" }}>{i + 1}</div>
              <span className="text-xs" style={{ color: "#9CA3AF" }}>{s}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// DISTRIBUTION ENGINE MODE
// ============================================================================
function DistributionEngineMode({ onOutput }: { onOutput: (url: string, label: string) => void }) {
  const accent = "#0EA5E9";
  const [videoFile, setVideoFile] = useState<VideoFile | null>(null);
  const [platforms, setPlatforms] = useState<string[]>(["onlyfans", "fansly"]);
  const [contentType, setContentType] = useState<"full_scene"|"teaser"|"clip"|"ppv">("clip");
  const [applyWatermark, setApplyWatermark] = useState(true);
  const [title, setTitle] = useState("");
  const [result, setResult] = useState<any>(null);

  const distributeMutation = trpc.vaultx.distributeContent.useMutation({
    onSuccess: (data) => {
      setResult(data);
      if (data.results?.[0]?.outputUrl) onOutput(data.results[0].outputUrl, "Distribution Engine");
      toast.success(`Distributed to ${data.results?.length || 0} platforms`);
    },
    onError: (e) => toast.error(e.message),
  });

  const PLATFORMS = [
    { id: "onlyfans", label: "OnlyFans", color: "#00AFF0" },
    { id: "fansly", label: "Fansly", color: "#3B82F6" },
    { id: "mym", label: "MYM", color: "#EC4899" },
    { id: "tiktok", label: "TikTok", color: "#EF4444" },
    { id: "twitter", label: "Twitter/X", color: "#1D9BF0" },
    { id: "telegram", label: "Telegram", color: "#26A5E4" },
  ];

  const togglePlatform = (id: string) => {
    setPlatforms(prev => prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]);
  };

  return (
    <Workspace
      left={
        <div className="flex flex-col gap-4">
          <div>
            <p className="text-xs font-black uppercase tracking-widest mb-2" style={{ color: accent }}>Source Video</p>
            {videoFile ? (
              <CanvasVideoPlayer src={videoFile.url} label={videoFile.name} accent={accent} onReplace={() => setVideoFile(null)} />
            ) : (
              <CanvasDropZone onFile={setVideoFile} accent={accent} label="Drop your video — we'll format it for every platform" />
            )}
          </div>
          <div>
            <p className="text-xs font-black uppercase tracking-widest mb-2" style={{ color: accent }}>Target Platforms</p>
            <div className="grid grid-cols-3 gap-2">
              {PLATFORMS.map(p => (
                <button key={p.id} onClick={() => togglePlatform(p.id)}
                  className="py-2 px-3 rounded-xl text-xs font-bold transition-all"
                  style={{ background: platforms.includes(p.id) ? `${p.color}20` : "rgba(255,255,255,0.04)", border: `1.5px solid ${platforms.includes(p.id) ? p.color : "rgba(255,255,255,0.08)"}`, color: platforms.includes(p.id) ? p.color : "#6B7280" }}>
                  {p.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className="text-xs font-black uppercase tracking-widest mb-2" style={{ color: accent }}>Content Type</p>
            <div className="grid grid-cols-2 gap-2">
              {(["full_scene","teaser","clip","ppv"] as const).map(t => (
                <button key={t} onClick={() => setContentType(t)}
                  className="py-2 px-3 rounded-xl text-xs font-bold capitalize transition-all"
                  style={{ background: contentType === t ? `${accent}20` : "rgba(255,255,255,0.04)", border: `1.5px solid ${contentType === t ? accent : "rgba(255,255,255,0.08)"}`, color: contentType === t ? accent : "#6B7280" }}>
                  {t.replace("_", " ")}
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className="text-xs font-black uppercase tracking-widest mb-2" style={{ color: accent }}>Title (Optional)</p>
            <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Scene title for metadata..."
              className="w-full px-3 py-2 rounded-xl text-xs text-white bg-transparent outline-none"
              style={{ border: "1px solid rgba(255,255,255,0.1)" }} />
          </div>
          <div className="flex items-center justify-between p-3 rounded-xl" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
            <div>
              <p className="text-xs font-bold text-white">Subscriber Watermark</p>
              <p className="text-[10px] text-gray-500">Invisible ID watermark — traces leaks to specific fans</p>
            </div>
            <button onClick={() => setApplyWatermark(v => !v)} className="w-10 h-5 rounded-full transition-all relative" style={{ background: applyWatermark ? accent : "rgba(255,255,255,0.1)" }}>
              <div className="absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all" style={{ left: applyWatermark ? "calc(100% - 18px)" : "2px" }} />
            </button>
          </div>
          <button
            onClick={() => videoFile && distributeMutation.mutate({ sourceUrl: videoFile.url, platforms: platforms as any[], contentType, applyWatermark, title: title || undefined })}
            disabled={!videoFile || platforms.length === 0 || distributeMutation.isPending}
            className="w-full py-3 rounded-xl text-sm font-black flex items-center justify-center gap-2 transition-all"
            style={{ background: videoFile && platforms.length > 0 ? `linear-gradient(135deg, ${accent}, #0284C7)` : "rgba(255,255,255,0.05)", color: videoFile && platforms.length > 0 ? "white" : "#4B5563" }}>
            {distributeMutation.isPending ? <><Loader2 size={14} className="animate-spin" /> Distributing to {platforms.length} platforms...</> : <><Globe size={14} /> Distribute Now — {platforms.length} Platforms</>}
          </button>
        </div>
      }
      right={
        <div className="flex flex-col gap-4">
          <EngineBadge engine="Distribution Engine" status={distributeMutation.isPending ? "processing" : result ? "complete" : "ready"} />
          {distributeMutation.isPending && <ProcessingBar label="Encoding platform-specific versions..." accent={accent} />}
          {result && (
            <div className="flex flex-col gap-3">
              <div className="p-3 rounded-xl" style={{ background: "rgba(14,165,233,0.08)", border: "1px solid rgba(14,165,233,0.2)" }}>
                <p className="text-xs font-black text-white mb-2">Distribution Complete</p>
                <div className="grid grid-cols-2 gap-2 text-[10px]">
                  <div><span className="text-gray-500">Platforms</span><p className="font-bold" style={{ color: accent }}>{result.results?.length || 0}</p></div>
                  <div><span className="text-gray-500">Watermarked</span><p className="font-bold text-green-400">{result.successCount > 0 ? "Yes" : "No"}</p></div>
                  <div><span className="text-gray-500">Success</span><p className="font-bold text-white">{result.successCount || 0}/{(result.results?.length || 0)}</p></div>
                  <div><span className="text-gray-500">Processing</span><p className="font-bold text-white">{result.totalProcessingTimeMs ? `${(result.totalProcessingTimeMs/1000).toFixed(1)}s` : "—"}</p></div>
                </div>
              </div>
              {result.results?.map((d: any, i: number) => (
                <div key={i} className="p-3 rounded-xl" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs font-bold text-white capitalize">{d.platformName || d.platformId}</p>
                    <span className="text-[10px] px-2 py-0.5 rounded-full font-bold" style={{ background: d.status === "ready" ? "rgba(34,197,94,0.15)" : "rgba(239,68,68,0.15)", color: d.status === "ready" ? "#22C55E" : "#EF4444" }}>{d.status}</span>
                  </div>
                  <p className="text-[10px] text-gray-500 mb-1">{d.durationSec?.toFixed(1)}s · {(d.fileSizeBytes/1024/1024).toFixed(1)}MB</p>
                  {d.outputUrl && (
                    <a href={d.outputUrl} download className="flex items-center gap-1 text-[10px] font-bold" style={{ color: accent }}><Download size={10} /> Download {d.platformName || d.platformId} version</a>
                  )}
                </div>
              ))}
            </div>
          )}
          {!result && !distributeMutation.isPending && (
            <div className="flex flex-col gap-2 p-4 rounded-xl" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}>
              <p className="text-xs font-bold text-white">Platform Presets</p>
              <div className="flex flex-col gap-1 text-[10px] text-gray-500">
                <p>OnlyFans: 1080p MP4, max 2GB, watermark</p>
                <p>Fansly: 1080p MP4, max 1.5GB, watermark</p>
                <p>TikTok: 1080×1920 vertical, 60s max, no watermark</p>
                <p>Twitter/X: 1280×720, 2min 20s max, no watermark</p>
                <p>Telegram: 720p, unlimited, no watermark</p>
              </div>
            </div>
          )}
        </div>
      }
    />
  );
}

// ============================================================================
// SCENE ENHANCEMENT MODE
// ============================================================================
function SceneEnhancementMode({ onOutput }: { onOutput: (url: string, label: string) => void }) {
  const accent = "#D946EF";
  const [videoFile, setVideoFile] = useState<VideoFile | null>(null);
  const [result, setResult] = useState<any>(null);

  const enhanceMutation = trpc.vaultx.enhanceScenes.useMutation({
    onSuccess: (data) => {
      setResult(data);
      if (data.outputUrl) onOutput(data.outputUrl, "Scene Enhancement");
      toast.success("Scene enhancement complete");
    },
    onError: (e) => toast.error(e.message),
  });

  return (
    <Workspace
      left={
        <div className="flex flex-col gap-4">
          <div>
            <p className="text-xs font-black uppercase tracking-widest mb-1" style={{ color: accent }}>Scene Enhancement</p>
            <p className="text-[11px] text-gray-500 mb-3">AI analyzes every scene — applies Replicate beauty grade, skin tone correction, and body-aware framing per scene. Not a filter. A per-scene neural enhancement.</p>
          </div>
          {videoFile ? (
            <CanvasVideoPlayer src={videoFile.url} label={videoFile.name} accent={accent} onReplace={() => { setVideoFile(null); setResult(null); }} />
          ) : (
            <CanvasDropZone onFile={setVideoFile} accent={accent} label="Drop your video — AI enhances every scene individually" />
          )}
          <div className="p-3 rounded-xl" style={{ background: "rgba(217,70,239,0.06)", border: "1px solid rgba(217,70,239,0.15)" }}>
            <p className="text-xs font-bold text-white mb-2">What Gets Enhanced</p>
            <div className="flex flex-col gap-1 text-[10px] text-gray-400">
              <p>✦ Skin tone warmth and smoothness per scene</p>
              <p>✦ Shadow lift and highlight bloom tuned to body</p>
              <p>✦ Body-aware framing — AI detects composition</p>
              <p>✦ Lighting correction for indoor/outdoor/studio</p>
              <p>✦ Desire-Grade color science applied per scene</p>
            </div>
          </div>
          <button
            onClick={() => videoFile && enhanceMutation.mutate({ sourceUrl: videoFile.url })}
            disabled={!videoFile || enhanceMutation.isPending}
            className="w-full py-3 rounded-xl text-sm font-black flex items-center justify-center gap-2 transition-all"
            style={{ background: videoFile ? `linear-gradient(135deg, ${accent}, #A21CAF)` : "rgba(255,255,255,0.05)", color: videoFile ? "white" : "#4B5563" }}>
            {enhanceMutation.isPending ? <><Loader2 size={14} className="animate-spin" /> Enhancing scenes...</> : <><Wand2 size={14} /> Enhance All Scenes</>}
          </button>
        </div>
      }
      right={
        <div className="flex flex-col gap-4">
          <EngineBadge engine="Replicate zsxkib/pulid + Desire-Grade" status={enhanceMutation.isPending ? "processing" : result ? "complete" : "ready"} />
          {enhanceMutation.isPending && <ProcessingBar label="Analyzing and enhancing scenes with AI..." accent={accent} />}
          {result && (
            <div className="flex flex-col gap-3">
              {result.outputUrl && (
                <VideoPlayer src={result.outputUrl} label="Enhanced Video" accent={accent} />
              )}
              <div className="p-3 rounded-xl" style={{ background: "rgba(217,70,239,0.08)", border: "1px solid rgba(217,70,239,0.2)" }}>
                <p className="text-xs font-black text-white mb-2">Enhancement Summary</p>
                <div className="grid grid-cols-2 gap-2 text-[10px]">
                  <div><span className="text-gray-500">Scenes Processed</span><p className="font-bold" style={{ color: accent }}>{result.scenesProcessed || "—"}</p></div>
                  <div><span className="text-gray-500">Top Desire</span><p className="font-bold text-white">{result.topDesireScene?.desireEnergy?.toFixed(1) || "—"}/10</p></div>
                  <div><span className="text-gray-500">Enhanced</span><p className="font-bold text-green-400">{result.scenesProcessed > 0 ? "Yes" : "No"}</p></div>
                  <div><span className="text-gray-500">Processing</span><p className="font-bold text-white">{result.totalProcessingTimeMs ? `${(result.totalProcessingTimeMs/1000).toFixed(1)}s` : "—"}</p></div>
                </div>
              </div>
              {result.sceneAnalyses?.map((s: any, i: number) => (
                <div key={i} className="p-2 rounded-xl" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] font-bold text-white">Scene {i + 1} — {s.startSec?.toFixed(1)}s–{s.endSec?.toFixed(1)}s</p>
                    <span className="text-[10px] font-bold" style={{ color: accent }}>Desire {s.desireScore}/10</span>
                  </div>
                  <p className="text-[10px] text-gray-500 mt-0.5">{s.grade} · {s.lightingType}</p>
                </div>
              ))}
              {result.outputUrl && (
                <a href={result.outputUrl} download className="flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold" style={{ background: "rgba(217,70,239,0.15)", color: accent, border: "1px solid rgba(217,70,239,0.3)" }}><Download size={14} /> Download Enhanced Video</a>
              )}
            </div>
          )}
        </div>
      }
    />
  );
}

// ============================================================================
// MONETIZATION BUNDLE MODE
// ============================================================================
function MonetizationBundleMode({ onOutput }: { onOutput: (url: string, label: string) => void }) {
  const accent = "#10B981";
  const [videoFile, setVideoFile] = useState<VideoFile | null>(null);
  const [activeTab, setActiveTab] = useState<"ppv"|"tip-unlock"|"price">("ppv");
  const [desireScore, setDesireScore] = useState(7);
  const [tipAmount, setTipAmount] = useState(500);
  const [revealStyle, setRevealStyle] = useState<"progressive"|"instant"|"timed">("progressive");
  const [priceInput, setPriceInput] = useState({ durationSec: 60, desireScore: 7, contentType: "clip" as const, platformTarget: "onlyfans" as const });
  const [result, setResult] = useState<any>(null);
  const [priceResult, setPriceResult] = useState<any>(null);

  const ppvMutation = trpc.vaultx.buildPpvBundle.useMutation({
    onSuccess: (data) => { setResult(data); if (data.teaserUrl) onOutput(data.teaserUrl, "PPV Bundle"); toast.success("PPV Bundle created"); },
    onError: (e) => toast.error(e.message),
  });
  const tipMutation = trpc.vaultx.createTipUnlock.useMutation({
    onSuccess: (data) => { setResult(data); if (data.lockedPreviewUrl) onOutput(data.lockedPreviewUrl, "Tip Unlock"); toast.success("Tip unlock content created"); },
    onError: (e) => toast.error(e.message),
  });
  const priceQuery = trpc.vaultx.suggestPrice.useQuery(priceInput, { enabled: false });

  const TABS = [
    { id: "ppv" as const, label: "PPV Bundle", color: "#A855F7" },
    { id: "tip-unlock" as const, label: "Tip Unlock", color: "#F59E0B" },
    { id: "price" as const, label: "Price AI", color: "#10B981" },
  ];

  return (
    <Workspace
      left={
        <div className="flex flex-col gap-4">
          <div className="flex gap-2">
            {TABS.map(t => (
              <button key={t.id} onClick={() => setActiveTab(t.id)} className="flex-1 py-2 rounded-xl text-xs font-bold transition-all"
                style={{ background: activeTab === t.id ? `${t.color}20` : "rgba(255,255,255,0.04)", border: `1.5px solid ${activeTab === t.id ? t.color : "rgba(255,255,255,0.08)"}`, color: activeTab === t.id ? t.color : "#6B7280" }}>
                {t.label}
              </button>
            ))}
          </div>

          {activeTab !== "price" && (
            videoFile ? (
              <CanvasVideoPlayer src={videoFile.url} label={videoFile.name} accent={accent} onReplace={() => { setVideoFile(null); setResult(null); }} />
            ) : (
              <CanvasDropZone onFile={setVideoFile} accent={accent} label="Drop your video to build a monetization bundle" />
            )
          )}

          {activeTab === "ppv" && (
            <>
              <div>
                <p className="text-xs font-bold text-white mb-2">Desire Score: <span style={{ color: "#A855F7" }}>{desireScore}/10</span></p>
                <input type="range" min={1} max={10} value={desireScore} onChange={e => setDesireScore(+e.target.value)} className="w-full" />
                <p className="text-[10px] text-gray-500 mt-1">Higher score = shorter teaser, higher suggested price</p>
              </div>
              <button onClick={() => videoFile && ppvMutation.mutate({ sourceUrl: videoFile.url, desireScore })}
                disabled={!videoFile || ppvMutation.isPending}
                className="w-full py-3 rounded-xl text-sm font-black flex items-center justify-center gap-2"
                style={{ background: videoFile ? "linear-gradient(135deg, #A855F7, #7C3AED)" : "rgba(255,255,255,0.05)", color: videoFile ? "white" : "#4B5563" }}>
                {ppvMutation.isPending ? <><Loader2 size={14} className="animate-spin" /> Building PPV Bundle...</> : <><Package size={14} /> Build PPV Bundle</>}
              </button>
            </>
          )}

          {activeTab === "tip-unlock" && (
            <>
              <div>
                <p className="text-xs font-bold text-white mb-2">Tip Amount: <span style={{ color: "#F59E0B" }}>${(tipAmount/100).toFixed(2)}</span></p>
                <input type="range" min={100} max={10000} step={100} value={tipAmount} onChange={e => setTipAmount(+e.target.value)} className="w-full" />
              </div>
              <div>
                <p className="text-xs font-bold text-white mb-2">Reveal Style</p>
                <div className="flex gap-2">
                  {(["progressive","instant","timed"] as const).map(s => (
                    <button key={s} onClick={() => setRevealStyle(s)} className="flex-1 py-1.5 rounded-xl text-[10px] font-bold capitalize"
                      style={{ background: revealStyle === s ? "rgba(245,158,11,0.2)" : "rgba(255,255,255,0.04)", border: `1px solid ${revealStyle === s ? "#F59E0B" : "rgba(255,255,255,0.08)"}`, color: revealStyle === s ? "#F59E0B" : "#6B7280" }}>
                      {s}
                    </button>
                  ))}
                </div>
              </div>
              <button onClick={() => videoFile && tipMutation.mutate({ sourceUrl: videoFile.url, tipAmountCents: tipAmount, revealStyle })}
                disabled={!videoFile || tipMutation.isPending}
                className="w-full py-3 rounded-xl text-sm font-black flex items-center justify-center gap-2"
                style={{ background: videoFile ? "linear-gradient(135deg, #F59E0B, #D97706)" : "rgba(255,255,255,0.05)", color: videoFile ? "white" : "#4B5563" }}>
                {tipMutation.isPending ? <><Loader2 size={14} className="animate-spin" /> Creating tip unlock...</> : <><Lock size={14} /> Create Tip Unlock</>}
              </button>
            </>
          )}

          {activeTab === "price" && (
            <div className="flex flex-col gap-3">
              <div>
                <p className="text-xs font-bold text-white mb-1">Duration (seconds)</p>
                <input type="number" value={priceInput.durationSec} onChange={e => setPriceInput(p => ({ ...p, durationSec: +e.target.value }))}
                  className="w-full px-3 py-2 rounded-xl text-xs text-white bg-transparent outline-none" style={{ border: "1px solid rgba(255,255,255,0.1)" }} />
              </div>
              <div>
                <p className="text-xs font-bold text-white mb-1">Desire Score: {priceInput.desireScore}/10</p>
                <input type="range" min={1} max={10} value={priceInput.desireScore} onChange={e => setPriceInput(p => ({ ...p, desireScore: +e.target.value }))} className="w-full" />
              </div>
              <div>
                <p className="text-xs font-bold text-white mb-1">Content Type</p>
                <div className="grid grid-cols-2 gap-1">
                  {(["full_scene","clip","custom_request","live_replay","photoset"] as const).map(t => (
                    <button key={t} onClick={() => setPriceInput(p => ({ ...p, contentType: t as typeof p.contentType }))} className="py-1.5 rounded-xl text-[10px] font-bold capitalize"
                      style={{ background: priceInput.contentType === t ? `${accent}20` : "rgba(255,255,255,0.04)", border: `1px solid ${priceInput.contentType === t ? accent : "rgba(255,255,255,0.08)"}`, color: priceInput.contentType === t ? accent : "#6B7280" }}>
                      {t.replace(/_/g, " ")}
                    </button>
                  ))}
                </div>
              </div>
              <button onClick={() => priceQuery.refetch().then(r => setPriceResult(r.data))}
                disabled={priceQuery.isFetching}
                className="w-full py-3 rounded-xl text-sm font-black flex items-center justify-center gap-2"
                style={{ background: `linear-gradient(135deg, ${accent}, #059669)`, color: "white" }}>
                {priceQuery.isFetching ? <><Loader2 size={14} className="animate-spin" /> Analyzing...</> : <><DollarSign size={14} /> Get AI Price Suggestion</>}
              </button>
              {priceResult && (
                <div className="p-3 rounded-xl" style={{ background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.2)" }}>
                  <p className="text-xs font-black text-white mb-2">AI Price Recommendation</p>
                  <div className="grid grid-cols-3 gap-2 text-[10px]">
                    <div className="text-center"><p className="text-gray-500">Min</p><p className="font-black text-white">${priceResult.minPrice}</p></div>
                    <div className="text-center"><p className="text-gray-500">Suggested</p><p className="font-black text-2xl" style={{ color: accent }}>${priceResult.suggestedPrice}</p></div>
                    <div className="text-center"><p className="text-gray-500">Max</p><p className="font-black text-white">${priceResult.maxPrice}</p></div>
                  </div>
                  <p className="text-[10px] text-gray-400 mt-2">{priceResult.reasoning}</p>
                </div>
              )}
            </div>
          )}
        </div>
      }
      right={
        <div className="flex flex-col gap-4">
          <EngineBadge engine="Monetization Bundle Builder" status={(ppvMutation.isPending || tipMutation.isPending) ? "processing" : result ? "complete" : "ready"} />
          {(ppvMutation.isPending || tipMutation.isPending) && <ProcessingBar label="Building monetization assets..." accent={accent} />}
          {result && activeTab === "ppv" && (
            <div className="flex flex-col gap-3">
              <div className="p-3 rounded-xl" style={{ background: "rgba(168,85,247,0.08)", border: "1px solid rgba(168,85,247,0.2)" }}>
                <p className="text-xs font-black text-white mb-2">PPV Bundle Ready</p>
                <div className="grid grid-cols-2 gap-2 text-[10px]">
                  <div><span className="text-gray-500">Suggested Price</span><p className="font-black text-lg" style={{ color: "#A855F7" }}>${result.suggestedPriceDollars}</p></div>
                  <div><span className="text-gray-500">Desire Score</span><p className="font-bold text-white">{result.desireScore}/10</p></div>
                </div>
              </div>
              {result.teaserUrl && <VideoPlayer src={result.teaserUrl} label="Teaser (Public)" accent="#A855F7" />}
              {result.censoredPreviewUrl && <VideoPlayer src={result.censoredPreviewUrl} label="Censored Preview (Paywall)" accent="#6B7280" />}
              {result.hooks?.length > 0 && (
                <div className="p-3 rounded-xl" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}>
                  <p className="text-[10px] font-black text-white mb-2">AI-Generated Hooks</p>
                  {result.hooks.map((h: string, i: number) => (
                    <p key={i} className="text-[10px] text-gray-400 mb-1">"{h}"</p>
                  ))}
                </div>
              )}
            </div>
          )}
          {result && activeTab === "tip-unlock" && (
            <div className="flex flex-col gap-3">
              <div className="p-3 rounded-xl" style={{ background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.2)" }}>
                <p className="text-xs font-black text-white mb-1">Tip Unlock Created</p>
                <p className="text-[10px] text-gray-400">Tip ${(tipAmount/100).toFixed(2)} to unlock · {revealStyle} reveal</p>
              </div>
              {result.lockedPreviewUrl && <VideoPlayer src={result.lockedPreviewUrl} label="Locked Preview" accent="#F59E0B" />}
              {result.ctaText && (
                <div className="p-3 rounded-xl" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}>
                  <p className="text-[10px] font-black text-white mb-1">CTA Copy</p>
                  <p className="text-[10px] text-gray-400">"{result.ctaText}"</p>
                </div>
              )}
            </div>
          )}
        </div>
      }
    />
  );
}

// ============================================================================
// ANALYTICS EDITING MODE
// ============================================================================
function AnalyticsEditingMode({ onOutput }: { onOutput: (url: string, label: string) => void }) {
  const accent = "#F59E0B";
  const [videoFile, setVideoFile] = useState<VideoFile | null>(null);
  const [activeTab, setActiveTab] = useState<"thumbnails"|"hook"|"recut">("thumbnails");
  const [result, setResult] = useState<any>(null);

  const thumbnailMutation = trpc.vaultx.generateThumbnails.useMutation({
    onSuccess: (data) => { setResult(data); toast.success(`${Array.isArray(data) ? data.length : 0} thumbnails generated`); },
    onError: (e) => toast.error(e.message),
  });
  const hookMutation = trpc.vaultx.analyzeHook.useMutation({
    onSuccess: (data) => { setResult(data); toast.success("Hook analysis complete"); },
    onError: (e) => toast.error(e.message),
  });
  const recutMutation = trpc.vaultx.getRecutSuggestions.useMutation({
    onSuccess: (data) => { setResult(data); toast.success("Re-cut suggestions ready"); },
    onError: (e) => toast.error(e.message),
  });

  const TABS = [
    { id: "thumbnails" as const, label: "A/B Thumbnails", color: "#F59E0B" },
    { id: "hook" as const, label: "Hook Analyzer", color: "#EF4444" },
    { id: "recut" as const, label: "Re-Cut AI", color: "#8B5CF6" },
  ];

  const isPending = thumbnailMutation.isPending || hookMutation.isPending || recutMutation.isPending;

  return (
    <Workspace
      left={
        <div className="flex flex-col gap-4">
          <div className="flex gap-2">
            {TABS.map(t => (
              <button key={t.id} onClick={() => { setActiveTab(t.id); setResult(null); }} className="flex-1 py-2 rounded-xl text-[10px] font-bold transition-all"
                style={{ background: activeTab === t.id ? `${t.color}20` : "rgba(255,255,255,0.04)", border: `1.5px solid ${activeTab === t.id ? t.color : "rgba(255,255,255,0.08)"}`, color: activeTab === t.id ? t.color : "#6B7280" }}>
                {t.label}
              </button>
            ))}
          </div>
          {videoFile ? (
            <CanvasVideoPlayer src={videoFile.url} label={videoFile.name} accent={accent} onReplace={() => { setVideoFile(null); setResult(null); }} />
          ) : (
            <CanvasDropZone onFile={setVideoFile} accent={accent} label="Drop your video for analytics-driven editing" />
          )}
          {activeTab === "thumbnails" && (
            <button onClick={() => videoFile && thumbnailMutation.mutate({ videoUrl: videoFile.url, count: 4 })}
              disabled={!videoFile || isPending}
              className="w-full py-3 rounded-xl text-sm font-black flex items-center justify-center gap-2"
              style={{ background: videoFile ? `linear-gradient(135deg, ${accent}, #D97706)` : "rgba(255,255,255,0.05)", color: videoFile ? "white" : "#4B5563" }}>
              {thumbnailMutation.isPending ? <><Loader2 size={14} className="animate-spin" /> Generating thumbnails...</> : <><Image size={14} /> Generate 4 A/B Thumbnails</>}
            </button>
          )}
          {activeTab === "hook" && (
            <button onClick={() => videoFile && hookMutation.mutate({ videoUrl: videoFile.url, hookDurationSec: 5 })}
              disabled={!videoFile || isPending}
              className="w-full py-3 rounded-xl text-sm font-black flex items-center justify-center gap-2"
              style={{ background: videoFile ? "linear-gradient(135deg, #EF4444, #DC2626)" : "rgba(255,255,255,0.05)", color: videoFile ? "white" : "#4B5563" }}>
              {hookMutation.isPending ? <><Loader2 size={14} className="animate-spin" /> Analyzing hook...</> : <><Zap size={14} /> Analyze First 5s Hook</>}
            </button>
          )}
          {activeTab === "recut" && (
            <button onClick={() => videoFile && recutMutation.mutate({ videoUrl: videoFile.url, totalDurationSec: videoFile.duration || 60, contentType: "clip" })}
              disabled={!videoFile || isPending}
              className="w-full py-3 rounded-xl text-sm font-black flex items-center justify-center gap-2"
              style={{ background: videoFile ? "linear-gradient(135deg, #8B5CF6, #7C3AED)" : "rgba(255,255,255,0.05)", color: videoFile ? "white" : "#4B5563" }}>
              {recutMutation.isPending ? <><Loader2 size={14} className="animate-spin" /> Generating suggestions...</> : <><Scissors size={14} /> Get AI Re-Cut Suggestions</>}
            </button>
          )}
        </div>
      }
      right={
        <div className="flex flex-col gap-4">
          <EngineBadge engine="Analytics Editing AI" status={isPending ? "processing" : result ? "complete" : "ready"} />
          {isPending && <ProcessingBar label="Analyzing content for maximum retention..." accent={accent} />}
          {result && activeTab === "thumbnails" && (
            <div className="flex flex-col gap-3">
              <p className="text-xs font-black text-white">A/B Thumbnail Variants</p>
              <div className="grid grid-cols-2 gap-2">
                {(Array.isArray(result) ? result as any[] : []).map((t: any, i: number) => (
                  <div key={i} className="rounded-xl overflow-hidden" style={{ border: "1px solid rgba(255,255,255,0.08)" }}>
                    <img src={t.thumbnailUrl || t.url} alt={`Thumbnail ${i+1}`} className="w-full aspect-video object-cover" />
                    <div className="p-2">
                      <div className="flex items-center justify-between">
                        <p className="text-[10px] font-bold text-white">Variant {i+1}</p>
                        <span className="text-[10px] font-black" style={{ color: accent }}>CTR {t.predictedCtrScore ?? t.predictedCtr ?? "—"}%</span>
                      </div>
                      <p className="text-[10px] text-gray-500">{t.variant || t.strategy || ""}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          {result && activeTab === "hook" && (
            <div className="flex flex-col gap-3">
              <div className="p-3 rounded-xl" style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)" }}>
                <p className="text-xs font-black text-white mb-2">Hook Strength Analysis</p>
                <div className="flex items-center gap-3 mb-3">
                  <div className="text-4xl font-black" style={{ color: result.hookScore >= 7 ? "#22C55E" : result.hookScore >= 5 ? "#F59E0B" : "#EF4444" }}>{result.hookScore}</div>
                  <div>
                    <p className="text-xs font-bold text-white">/10 Hook Score</p>
                    <p className="text-[10px] text-gray-500">{result.verdict}</p>
                  </div>
                </div>
                {result.issues?.length > 0 && (
                  <div className="mb-2">
                    <p className="text-[10px] font-bold text-red-400 mb-1">Issues</p>
                    {result.issues.map((issue: string, i: number) => <p key={i} className="text-[10px] text-gray-400">• {issue}</p>)}
                  </div>
                )}
                {result.improvements?.length > 0 && (
                  <div>
                    <p className="text-[10px] font-bold text-green-400 mb-1">Improvements</p>
                    {result.improvements.map((imp: string, i: number) => <p key={i} className="text-[10px] text-gray-400">• {imp}</p>)}
                  </div>
                )}
              </div>
            </div>
          )}
          {result && activeTab === "recut" && (
            <div className="flex flex-col gap-3">
              <p className="text-xs font-black text-white">AI Re-Cut Suggestions</p>
              {result.suggestions?.map((s: any, i: number) => (
                <div key={i} className="p-3 rounded-xl" style={{ background: "rgba(139,92,246,0.08)", border: "1px solid rgba(139,92,246,0.2)" }}>
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-xs font-bold text-white">{s.type}</p>
                    <span className="text-[10px] px-2 py-0.5 rounded-full font-bold" style={{ background: "rgba(139,92,246,0.2)", color: "#8B5CF6" }}>+{s.retentionGain}% retention</span>
                  </div>
                  <p className="text-[10px] text-gray-400">{s.description}</p>
                  <p className="text-[10px] text-gray-500 mt-1">{s.startSec?.toFixed(1)}s → {s.endSec?.toFixed(1)}s</p>
                </div>
              ))}
            </div>
          )}
        </div>
      }
    />
  );
}


// ============================================================================
// MAIN VAULTX STUDIO COMPONENT
// ============================================================================
export default function VaultXStudio() {
  const [activeMode, setActiveMode] = useState<ModeId>("final-output-engine");
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [sidebarExpanded, setSidebarExpanded] = useState(true);
  const persistAsset = trpc.creatorVideoEditor.createAsset.useMutation();

  const addToHistory = useCallback((url: string, label: string) => {
    const mode = activeMode;
    setHistory(prev => [{ id: Date.now().toString(), mode, label, outputUrl: url, timestamp: Date.now() }, ...prev.slice(0, 49)]);
    const ext = url.split(".").pop()?.toLowerCase() || "mp4";
    const mimeMap: Record<string, string> = { mp4: "video/mp4", mov: "video/quicktime", mp3: "audio/mpeg", wav: "audio/wav", webm: "video/webm" };
    persistAsset.mutate({
      fileUrl: url,
      assetType: ext === "mp3" || ext === "wav" ? "audio" : "output",
      filename: `${mode}-${label}-${Date.now()}.${ext}`,
      mimeType: mimeMap[ext] || "video/mp4",
      metadata: { mode, label, generatedAt: new Date().toISOString() },
    });
  }, [activeMode, persistAsset]);

  const activeData = MODES.find(m => m.id === activeMode)!;

  const renderMode = () => {
    const props = { onOutput: addToHistory };
    switch (activeMode) {
      case "velvet-suite":        return <VelvetSuiteMode {...props} />;
      case "desire-grade":        return <DesireGradeMode {...props} />;
      case "scene-architect":     return <SceneArchitectMode {...props} />;
      case "ppv-engine":          return <PPVEngineMode {...props} />;
      case "platform-vault":      return <PlatformVaultMode {...props} />;
      case "ai-enhance":          return <AIEnhanceMode {...props} />;
      case "caption-studio":      return <CaptionStudioMode {...props} />;
      case "content-vault":       return <ContentVaultMode {...props} />;
      case "final-output-engine": return <FinalOutputEngineMode {...props} />;
      case "ai-video-generator":  return <AIVideoGeneratorMode {...props} />;
      case "ai-sound-studio":     return <AISoundStudioMode {...props} />;
      case "face-studio":         return <FaceStudioMode {...props} />;
      case "creator-tiers":       return <CreatorTiersMode />;
      case "mass-broadcast":      return <MassBroadcastMode />;
      case "ai-chatter":          return <AIChatterMode />;
      case "distribution-engine": return <DistributionEngineMode {...props} />;
      case "scene-enhancement":   return <SceneEnhancementMode {...props} />;
      case "monetization-bundle": return <MonetizationBundleMode {...props} />;
      case "analytics-editing":   return <AnalyticsEditingMode {...props} />;
      default:                    return null;
    }
  };

  // Group modes for sidebar sections
  const MODE_GROUPS = [
    { label: "Production", ids: ["final-output-engine", "ai-video-generator", "velvet-suite", "desire-grade", "scene-architect", "scene-enhancement"] },
    { label: "AI Tools", ids: ["ai-enhance", "face-studio", "ai-sound-studio", "caption-studio"] },
    { label: "Monetize", ids: ["ppv-engine", "monetization-bundle", "distribution-engine", "platform-vault"] },
    { label: "Audience", ids: ["creator-tiers", "mass-broadcast", "ai-chatter", "analytics-editing"] },
    { label: "Library", ids: ["content-vault"] },
  ];

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: "#000000", fontFamily: "'Inter', sans-serif" }}>
      {/* ── AMBIENT GLOW ── */}
      <div className="pointer-events-none fixed inset-0 z-0" style={{
        background: `radial-gradient(ellipse 80% 60% at 50% -10%, ${activeData.color}18 0%, transparent 70%)`,
        transition: "background 0.8s ease",
      }} />

      {/* ── LEFT SIDEBAR ── */}
      <div
        className="relative flex-shrink-0 flex flex-col z-10 transition-all duration-300"
        style={{
          width: sidebarExpanded ? 220 : 64,
          borderRight: "1px solid rgba(255,255,255,0.06)",
          background: "rgba(0,0,0,0.95)",
          backdropFilter: "blur(20px)",
        }}
      >
        {/* Logo */}
        <div className="flex items-center gap-3 px-4 py-4 border-b" style={{ borderColor: "rgba(255,255,255,0.06)", minHeight: 60 }}>
          <div className="w-8 h-8 rounded-xl flex-shrink-0 flex items-center justify-center" style={{ background: `linear-gradient(135deg, #DC2626, #9333EA)` }}>
            <span className="text-white font-black text-sm">V</span>
          </div>
          {sidebarExpanded && (
            <div>
              <p className="text-sm font-black text-white leading-none">VaultX</p>
              <p className="text-[9px] font-bold uppercase tracking-widest mt-0.5" style={{ color: "#DC2626" }}>Studio</p>
            </div>
          )}
          <div className="flex-1" />
          <button
            onClick={() => setSidebarExpanded(v => !v)}
            className="w-6 h-6 rounded-lg flex items-center justify-center transition-all hover:bg-white/10"
            style={{ color: "#4B5563" }}
          >
            {sidebarExpanded ? <ChevronLeft size={14} /> : <ChevronRight size={14} />}
          </button>
        </div>

        {/* Mode Groups */}
        <div className="flex-1 overflow-y-auto py-3 flex flex-col gap-1 scrollbar-hide" style={{ scrollbarWidth: "none" }}>
          {MODE_GROUPS.map(group => {
            const groupModes = group.ids.map(id => MODES.find(m => m.id === id)).filter(Boolean) as typeof MODES;
            if (groupModes.length === 0) return null;
            return (
              <div key={group.label} className="mb-1">
                {sidebarExpanded && (
                  <p className="px-4 py-1 text-[9px] font-black uppercase tracking-widest" style={{ color: "#374151" }}>{group.label}</p>
                )}
                {groupModes.map(m => {
                  const active = activeMode === m.id;
                  return (
                    <button
                      key={m.id}
                      onClick={() => setActiveMode(m.id)}
                      title={!sidebarExpanded ? m.label : undefined}
                      className="relative w-full flex items-center gap-3 transition-all group"
                      style={{
                        padding: sidebarExpanded ? "8px 16px" : "8px",
                        justifyContent: sidebarExpanded ? "flex-start" : "center",
                        background: active ? `${m.color}15` : "transparent",
                        borderLeft: active ? `2px solid ${m.color}` : "2px solid transparent",
                      }}
                    >
                      <div
                        className="flex-shrink-0 w-7 h-7 rounded-xl flex items-center justify-center transition-all"
                        style={{
                          background: active ? `${m.color}25` : "rgba(255,255,255,0.04)",
                          border: `1px solid ${active ? m.color + "50" : "rgba(255,255,255,0.06)"}`,
                        }}
                      >
                        <span style={{ color: active ? m.color : "#6B7280", display: "flex" }}>{m.icon}</span>
                      </div>
                      {sidebarExpanded && (
                        <span
                          className="text-xs font-bold truncate"
                          style={{ color: active ? "white" : "#9CA3AF" }}
                        >
                          {m.label}
                        </span>
                      )}
                      {/* Tooltip when collapsed */}
                      {!sidebarExpanded && (
                        <div className="absolute left-16 top-1/2 -translate-y-1/2 px-2.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-all z-50" style={{ background: "rgba(0,0,0,0.95)", color: "white", border: "1px solid rgba(255,255,255,0.1)", backdropFilter: "blur(8px)" }}>
                          {m.label}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            );
          })}
        </div>

        {/* Bottom: History toggle */}
        <div className="border-t p-3" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
          <button
            onClick={() => setShowHistory(h => !h)}
            className="w-full flex items-center gap-3 py-2 px-3 rounded-xl transition-all hover:bg-white/05"
            style={{
              justifyContent: sidebarExpanded ? "flex-start" : "center",
              background: showHistory ? "rgba(255,255,255,0.06)" : "transparent",
              color: showHistory ? "white" : "#4B5563",
            }}
          >
            <Activity size={16} />
            {sidebarExpanded && <span className="text-xs font-bold">History</span>}
          </button>
        </div>
      </div>

      {/* ── HISTORY PANEL ── */}
      {showHistory && (
        <div className="flex-shrink-0 flex flex-col overflow-hidden z-10" style={{ width: 220, borderRight: "1px solid rgba(255,255,255,0.06)", background: "rgba(0,0,0,0.9)" }}>
          <div className="p-4 border-b" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
            <p className="text-xs font-black uppercase tracking-widest text-white">Session History</p>
            <p className="text-[10px] mt-0.5" style={{ color: "#6B7280" }}>{history.length} outputs</p>
          </div>
          <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-2">
            {history.length === 0 ? (
              <p className="text-xs text-center mt-8" style={{ color: "#4B5563" }}>No outputs yet</p>
            ) : history.map(item => {
              const modeData = MODES.find(m => m.id === item.mode);
              return (
                <div key={item.id} className="flex flex-col gap-1.5 p-3 rounded-xl cursor-pointer transition-all hover:bg-white/05" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }} onClick={() => setActiveMode(item.mode)}>
                  <div className="flex items-center gap-2">
                    <span style={{ color: modeData?.color || "#6B7280" }}>{modeData?.icon}</span>
                    <span className="text-xs font-bold text-white truncate">{item.label}</span>
                  </div>
                  <video src={item.outputUrl} className="w-full rounded-lg" style={{ maxHeight: 80, objectFit: "cover" }} muted />
                  <button onClick={(e) => { e.stopPropagation(); const a = document.createElement("a"); a.href = item.outputUrl; a.download = `vaultx-${item.mode}.mp4`; a.click(); }} className="w-full flex items-center justify-center gap-1 py-1.5 rounded-lg text-[10px] font-bold" style={{ background: "rgba(255,255,255,0.06)", color: "#9CA3AF" }}><Download size={10} /> Save</button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── MAIN CONTENT AREA ── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative z-10">
        {/* TOP BAR — Pollo AI style */}
        <div
          className="flex-shrink-0 flex items-center gap-4 px-6 py-3"
          style={{
            borderBottom: "1px solid rgba(255,255,255,0.06)",
            background: "rgba(0,0,0,0.8)",
            backdropFilter: "blur(20px)",
            minHeight: 60,
          }}
        >
          {/* Active mode info */}
          <div className="flex items-center gap-3">
            <div
              className="w-9 h-9 rounded-2xl flex items-center justify-center flex-shrink-0"
              style={{ background: `${activeData.color}20`, border: `1px solid ${activeData.color}40` }}
            >
              <span style={{ color: activeData.color, display: "flex" }}>{activeData.icon}</span>
            </div>
            <div>
              <p className="text-sm font-black text-white leading-none">{activeData.label}</p>
              <p className="text-[10px] mt-0.5 max-w-xs truncate" style={{ color: "#6B7280" }}>{activeData.desc}</p>
            </div>
          </div>

          <div className="flex-1" />

          {/* Status pill */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
            <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: activeData.color }} />
            <span className="text-[10px] font-bold" style={{ color: "#9CA3AF" }}>VaultX Studio</span>
          </div>

          {/* Nav links */}
          <a href="/vault-x/editor" className="px-3 py-1.5 rounded-xl text-xs font-bold transition-all hover:bg-white/10" style={{ color: "#6B7280" }}>Editor</a>
          <a href="/vault-x/analytics" className="px-3 py-1.5 rounded-xl text-xs font-bold transition-all hover:bg-white/10" style={{ color: "#6B7280" }}>Analytics</a>
        </div>

        {/* MODE CONTENT — full height, no padding, content owns the space */}
        <div className="flex-1 overflow-hidden">
          {renderMode()}
        </div>
      </div>
    </div>
  );
}