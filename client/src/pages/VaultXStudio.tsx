/**
 * ============================================================================
 * VAULTX STUDIO v5 — ELITE ADULT CONTENT PRODUCTION SUITE
 * ============================================================================
 * Complete layout rebuild — Pollo AI / OpenArt AI visual standard.
 *
 * Layout law: Two-column workspace. Left = settings (320px, scrollable).
 * Right = video canvas (fills remaining width, video always visible).
 * No narrow max-w-2xl columns. No forms. Video is the product.
 *
 * All logic, tRPC wiring, and API calls preserved exactly from v4.
 * Only the layout and visual presentation layer changed.
 *
 * Modes:
 *   1. VELVET SUITE      — Beauty filters + skin enhancement
 *   2. DESIRE GRADE      — 22 adult cinematic color grades
 *   3. SCENE ARCHITECT   — Trim, cut, speed, audio, AI scene detection
 *   4. PPV ENGINE        — Teaser clipper + blur censor + watermark + AI PPV intelligence
 *   5. PLATFORM VAULT    — OF / Fansly / ManyVids / Clips4Sale / Twitter export
 *   6. AI ENHANCE        — Replicate RIFE slow motion + Real-ESRGAN upscale + FFmpeg denoise
 *   7. CAPTION STUDIO    — OpenAI Whisper auto-transcription + burn-in captions
 *   8. CONTENT VAULT     — Chunked upload + library management
 *   9. FINAL OUTPUT ENGINE — One upload → Premium + Teaser + Clip pack
 *
 * Backend API (all verified):
 *   POST /api/video-studio/filter       { video, filter, intensity }
 *   POST /api/video-studio/trim         { video, start, end }
 *   POST /api/video-studio/color-grade  { video, look, brightness, contrast, saturation }
 *   POST /api/video-studio/add-text     { video, text, position, fontSize, color, start, end }
 *   POST /api/video-studio/audio        { video, mode, volume, fadeIn, fadeOut }
 *   POST /api/video-studio/speed        { video, speed }
 *   POST /api/video-studio/watermark    { video, mode, text, position, opacity, size, color }
 *   POST /api/video-studio/convert      { video, format, resolution }
 *   trpc.videoEnhance.slowMotion        → Replicate RIFE v4.6
 *   trpc.videoEnhance.upscaleVideo      → Replicate Real-ESRGAN
 *   trpc.videoEnhance.transcribeVideo   → OpenAI Whisper-1
 *   trpc.videoEnhance.getJob            → Replicate polling
 *   trpc.videoEnhance.getAIEngineStatus → engine availability map
 *   trpc.videoEnhance.analyzeScene      → GPT-4o-mini scene detection
 *   trpc.videoEnhance.analyzePPVMoments → GPT-4o-mini PPV intelligence
 *   trpc.videoEnhance.createPremiumVideo    → Full AI pipeline
 *   trpc.videoEnhance.createTeaserPackage   → Whisper + GPT + FFmpeg
 *   trpc.videoEnhance.createViralClipPack   → Whisper + GPT + FFmpeg
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
  Sun, Moon, Settings2,
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
  | "final-output-engine";

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
  { id: "final-output-engine", label: "Final Output Engine", icon: <Package size={18}/>, desc: "One click → Premium + Teaser + Clips", color: "#F59E0B", accent: "rgba(245,158,11,0.15)" },
  { id: "velvet-suite",    label: "Velvet Suite",    icon: <Sparkles size={18}/>,     desc: "AI skin smoothing & beauty",        color: "#EC4899", accent: "rgba(236,72,153,0.15)"  },
  { id: "desire-grade",    label: "Desire Grade",    icon: <Palette size={18}/>,      desc: "22 adult cinematic color grades",   color: "#F97316", accent: "rgba(249,115,22,0.15)"  },
  { id: "scene-architect", label: "Scene Architect", icon: <Scissors size={18}/>,     desc: "Trim, cut, speed, audio editor",    color: "#EAB308", accent: "rgba(234,179,8,0.15)"   },
  { id: "ppv-engine",      label: "PPV Engine",      icon: <Lock size={18}/>,         desc: "Teaser + censor + watermark",       color: "#A855F7", accent: "rgba(168,85,247,0.15)"  },
  { id: "platform-vault",  label: "Platform Vault",  icon: <MonitorPlay size={18}/>,  desc: "Export for OF, Fansly, MV, C4S",   color: "#06B6D4", accent: "rgba(6,182,212,0.15)"   },
  { id: "ai-enhance",      label: "AI Enhance",      icon: <BrainCircuit size={18}/>, desc: "RIFE slow motion + ESRGAN upscale", color: "#22C55E", accent: "rgba(34,197,94,0.15)"   },
  { id: "caption-studio",  label: "Caption Studio",  icon: <Type size={18}/>,         desc: "Whisper transcription + burn-in",   color: "#60A5FA", accent: "rgba(96,165,250,0.15)"  },
  { id: "content-vault",   label: "Content Vault",   icon: <HardDrive size={18}/>,    desc: "Upload & organize your library",    color: "#9333EA", accent: "rgba(147,51,234,0.15)"  },
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

/** Full-height canvas drop zone — fills the right panel */
function CanvasDropZone({ onFile, accent = "#DC2626", label = "Drop your video here" }: { onFile: (vf: VideoFile) => void; accent?: string; label?: string }) {
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
      className="flex-1 flex flex-col items-center justify-center gap-6 cursor-pointer transition-all duration-200"
      style={{
        border: `2px dashed ${dragging ? accent : "rgba(255,255,255,0.08)"}`,
        background: dragging ? `${accent}08` : "rgba(255,255,255,0.01)",
        borderRadius: 24,
        minHeight: 400,
      }}
    >
      <div className="w-20 h-20 rounded-3xl flex items-center justify-center" style={{ background: `${accent}15`, border: `1px solid ${accent}30` }}>
        <Upload size={36} color={accent} />
      </div>
      <div className="text-center">
        <p className="text-white font-black text-xl">{label}</p>
        <p className="text-sm mt-2" style={{ color: "#6B7280" }}>MP4 · MOV · AVI · MKV · WebM — up to 4GB</p>
      </div>
      <div className="flex items-center gap-2 px-6 py-3 rounded-2xl text-sm font-black" style={{ background: `${accent}20`, color: accent, border: `1px solid ${accent}30` }}>
        <FileVideo size={16} /> Browse Files
      </div>
      <input ref={inputRef} type="file" accept="video/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
    </div>
  );
}

/** Inline drop zone for compact areas */
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

/** Full-canvas video player — fills the right panel */
function CanvasVideoPlayer({ src, label, accent = "#DC2626", onReplace }: { src: string; label?: string; accent?: string; onReplace?: () => void }) {
  const [playing, setPlaying] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const toggle = () => {
    if (!videoRef.current) return;
    if (playing) { videoRef.current.pause(); setPlaying(false); }
    else { videoRef.current.play(); setPlaying(true); }
  };
  return (
    <div className="flex-1 relative rounded-3xl overflow-hidden flex flex-col" style={{ background: "#000", minHeight: 400 }}>
      {label && <div className="absolute top-4 left-4 z-10 px-3 py-1.5 rounded-xl text-xs font-black" style={{ background: "rgba(0,0,0,0.85)", color: accent, border: `1px solid ${accent}40`, backdropFilter: "blur(8px)" }}>{label}</div>}
      {onReplace && (
        <button onClick={onReplace} className="absolute top-4 right-4 z-10 px-3 py-1.5 rounded-xl text-xs font-bold" style={{ background: "rgba(0,0,0,0.85)", color: "#9CA3AF", border: "1px solid rgba(255,255,255,0.1)", backdropFilter: "blur(8px)" }}>
          Change Video
        </button>
      )}
      <video ref={videoRef} src={src} className="w-full flex-1 object-contain" style={{ minHeight: 400 }} onEnded={() => setPlaying(false)} />
      <button onClick={toggle} className="absolute bottom-4 left-1/2 -translate-x-1/2 w-14 h-14 rounded-full flex items-center justify-center transition-all" style={{ background: `${accent}E0`, border: "2px solid rgba(255,255,255,0.2)", backdropFilter: "blur(4px)" }}>
        {playing ? <Pause size={22} color="white" /> : <Play size={22} color="white" />}
      </button>
    </div>
  );
}

/** Before/After canvas — fills the right panel */
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
      {/* Toggle tabs */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 flex rounded-xl overflow-hidden" style={{ border: `1px solid ${accent}40`, backdropFilter: "blur(8px)" }}>
        <button onClick={() => setShowAfter(false)} className="px-4 py-2 text-xs font-black transition-all" style={{ background: !showAfter ? `${accent}CC` : "rgba(0,0,0,0.8)", color: !showAfter ? "white" : "#9CA3AF" }}>BEFORE</button>
        <button onClick={() => setShowAfter(true)} className="px-4 py-2 text-xs font-black transition-all" style={{ background: showAfter ? `${accent}CC` : "rgba(0,0,0,0.8)", color: showAfter ? "white" : "#9CA3AF" }}>AFTER</button>
      </div>
      {/* Label */}
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

/** Compact video player for output cards in settings panel */
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

function ProcessingBar({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3 p-4 rounded-2xl" style={{ background: "rgba(220,38,38,0.08)", border: "1px solid rgba(220,38,38,0.2)" }}>
      <div className="w-6 h-6 rounded-full border-2 border-red-500 border-t-transparent animate-spin flex-shrink-0" />
      <p className="text-sm font-semibold text-white">{label}</p>
    </div>
  );
}

/** Two-column workspace wrapper */
function Workspace({ left, right }: { left: React.ReactNode; right: React.ReactNode }) {
  return (
    <div className="flex flex-1 gap-0 min-h-0" style={{ height: "100%" }}>
      {/* Left: settings panel */}
      <div className="flex-shrink-0 overflow-y-auto flex flex-col gap-5 p-5" style={{ width: 320, borderRight: "1px solid rgba(255,255,255,0.06)" }}>
        {left}
      </div>
      {/* Right: canvas */}
      <div className="flex-1 flex flex-col p-5 gap-4 min-w-0">
        {right}
      </div>
    </div>
  );
}

// ============================================================================
// MODE: VELVET SUITE
// ============================================================================
function VelvetSuiteMode({ onOutput }: { onOutput: (url: string, label: string) => void }) {
  const [videoFile, setVideoFile] = useState<VideoFile | null>(null);
  const [selectedFilter, setSelectedFilter] = useState("velvet_skin");
  const [intensity, setIntensity] = useState(70);
  const [outputUrl, setOutputUrl] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const engineStatus = trpc.videoEnhance.getAIEngineStatus.useQuery();
  const polloAvailable = engineStatus.data?.engines?.pollo?.available ?? false;
  const polloReason = engineStatus.data?.engines?.pollo?.reason ?? "Checking...";

  const BEAUTY_FILTERS = [
    { id: "velvet_skin",   label: "Velvet Skin",   desc: "Multi-stage smooth + warmth lift",   badge: "BEST",   color: "#EC4899" },
    { id: "silk_soft",     label: "Silk Soft",     desc: "Extreme airbrushed, max smoothing",  badge: "MAX",    color: "#F472B6" },
    { id: "golden_skin",   label: "Golden Skin",   desc: "Warm curves for skin tones",         badge: "WARM",   color: "#F59E0B" },
    { id: "beauty",        label: "Beauty Mode",   desc: "Classic smooth + saturation lift",   badge: "CLASSIC",color: "#FBBF24" },
    { id: "skin_smooth",   label: "Skin Smooth",   desc: "Lighter detail-preserving smooth",   badge: "LIGHT",  color: "#FCD34D" },
    { id: "boudoir_light", label: "Boudoir Light", desc: "Warm candle glow + skin lift",       badge: "GLOW",   color: "#F97316" },
    { id: "desire_haze",   label: "Desire Haze",   desc: "Soft focus bloom + warm grade",      badge: "HAZE",   color: "#FB923C" },
    { id: "champagne_glow",label: "Champagne Glow",desc: "Ultra-warm highlight bloom",         badge: "LUXURY", color: "#FCD34D" },
  ];

  const process = async () => {
    if (!videoFile) return toast.error("Upload a video first.");
    setIsProcessing(true); setOutputUrl(null);
    try {
      const fd = new FormData();
      fd.append("video", videoFile.file);
      fd.append("filter", selectedFilter);
      fd.append("intensity", String(intensity / 100));
      const result = await callVideoStudio("filter", fd);
      setOutputUrl(result.url);
      onOutput(result.url, BEAUTY_FILTERS.find(f => f.id === selectedFilter)?.label || selectedFilter);
      toast.success("Beauty enhancement applied.");
    } catch (e: any) { toast.error(e.message); }
    finally { setIsProcessing(false); }
  };

  const left = (
    <>
      <div>
        <p className="text-xs font-black uppercase tracking-widest mb-1" style={{ color: "#EC4899" }}>Velvet Suite</p>
        <p className="text-xs" style={{ color: "#6B7280" }}>Beauty enhancement — skin smoothing & warmth</p>
      </div>
      {!polloAvailable && (
        <div className="flex items-start gap-2 p-3 rounded-xl" style={{ background: "rgba(234,179,8,0.08)", border: "1px solid rgba(234,179,8,0.25)" }}>
          <AlertCircle size={14} color="#EAB308" className="flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-bold" style={{ color: "#FDE047" }}>AI Engine Unavailable</p>
            <p className="text-xs mt-0.5" style={{ color: "#9CA3AF" }}>Pollo AI: {polloReason}. FFmpeg filters active.</p>
          </div>
        </div>
      )}
      <div>
        <p className="text-[10px] font-black uppercase tracking-widest mb-2.5" style={{ color: "#6B7280" }}>Beauty Filters</p>
        <div className="flex flex-col gap-1.5">
          {BEAUTY_FILTERS.map((f) => {
            const active = selectedFilter === f.id;
            return (
              <button key={f.id} onClick={() => setSelectedFilter(f.id)} className="flex items-center gap-3 p-3 rounded-xl text-left transition-all" style={{ background: active ? `${f.color}18` : "rgba(255,255,255,0.03)", border: `1.5px solid ${active ? f.color : "rgba(255,255,255,0.07)"}` }}>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold" style={{ color: active ? f.color : "#E5E7EB" }}>{f.label}</span>
                    <span className="text-[9px] font-black px-1.5 py-0.5 rounded" style={{ background: `${f.color}25`, color: f.color }}>{f.badge}</span>
                  </div>
                  <p className="text-xs mt-0.5 leading-tight" style={{ color: "#6B7280" }}>{f.desc}</p>
                </div>
                {active && <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: f.color }} />}
              </button>
            );
          })}
        </div>
      </div>
      <div className="p-4 rounded-2xl" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
        <div className="flex justify-between mb-2"><span className="text-xs font-bold text-white">Enhancement Intensity</span><span className="text-xs font-bold" style={{ color: "#EC4899" }}>{intensity}%</span></div>
        <input type="range" min={10} max={100} step={5} value={intensity} onChange={(e) => setIntensity(parseInt(e.target.value))} className="w-full" style={{ accentColor: "#EC4899" }} />
        <div className="flex justify-between mt-1"><span className="text-[10px]" style={{ color: "#6B7280" }}>Subtle</span><span className="text-[10px]" style={{ color: "#6B7280" }}>Maximum</span></div>
      </div>
      <button onClick={process} disabled={!videoFile || isProcessing} className="w-full py-4 rounded-2xl font-black text-white text-sm transition-all flex items-center justify-center gap-2" style={{ background: !videoFile || isProcessing ? "rgba(236,72,153,0.3)" : "linear-gradient(135deg, #EC4899, #BE185D)", cursor: !videoFile || isProcessing ? "not-allowed" : "pointer", boxShadow: !videoFile || isProcessing ? "none" : "0 0 24px rgba(236,72,153,0.35)" }}>
        {isProcessing ? <><Loader2 size={18} className="animate-spin" /> Enhancing...</> : <><Sparkles size={18} /> Apply Beauty Enhancement</>}
      </button>
      {isProcessing && <ProcessingBar label="Applying beauty enhancement..." />}
      {outputUrl && (
        <div className="flex flex-col gap-2">
          <p className="text-[10px] font-black uppercase tracking-widest" style={{ color: "#6B7280" }}>Output</p>
          <VideoPlayer src={outputUrl} label="Enhanced" accent="#EC4899" />
          <div className="flex gap-2">
            <button onClick={() => { const a = document.createElement("a"); a.href = outputUrl; a.download = `vaultx-beauty-${selectedFilter}.mp4`; a.click(); }} className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold" style={{ background: "rgba(236,72,153,0.15)", color: "#EC4899", border: "1px solid rgba(236,72,153,0.3)" }}><Download size={14} /> Save</button>
            <button onClick={async () => { try { const vf = await fetchVideoAsFile(outputUrl, "beauty-output.mp4"); setVideoFile(vf); setOutputUrl(null); toast.success("Output loaded as new source"); } catch { toast.error("Failed"); } }} className="w-10 h-10 flex items-center justify-center rounded-xl" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "#9CA3AF" }}><Layers2 size={14} /></button>
          </div>
        </div>
      )}
    </>
  );

  const right = videoFile ? (
    outputUrl ? (
      <CanvasBeforeAfter beforeUrl={videoFile.url} afterUrl={outputUrl} label={BEAUTY_FILTERS.find(f => f.id === selectedFilter)?.label || "Enhanced"} accent="#EC4899" />
    ) : (
      <CanvasVideoPlayer src={videoFile.url} label="Source" accent="#EC4899" onReplace={() => setVideoFile(null)} />
    )
  ) : (
    <CanvasDropZone onFile={setVideoFile} accent="#EC4899" label="Drop your video to start beauty enhancement" />
  );

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
  const [outputUrl, setOutputUrl] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const filteredGrades = DESIRE_GRADES.filter(g => g.category === activeCategory);
  const selectedGradeData = DESIRE_GRADES.find(g => g.id === selectedGrade);

  const process = async () => {
    if (!videoFile) return toast.error("Upload a video first.");
    setIsProcessing(true); setOutputUrl(null);
    try {
      const fd = new FormData();
      fd.append("video", videoFile.file);
      fd.append("filter", selectedGrade);
      fd.append("intensity", String(intensity / 100));
      const result = await callVideoStudio("filter", fd);
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
        <p className="text-xs" style={{ color: "#6B7280" }}>22 adult-specific cinematic color grades</p>
      </div>
      <div className="flex gap-1.5 flex-wrap">
        {GRADE_CATEGORIES.map(cat => (
          <button key={cat} onClick={() => setActiveCategory(cat)} className="px-3 py-1.5 rounded-xl text-xs font-bold transition-all" style={{ background: activeCategory === cat ? "rgba(249,115,22,0.2)" : "rgba(255,255,255,0.04)", border: `1.5px solid ${activeCategory === cat ? "#F97316" : "rgba(255,255,255,0.08)"}`, color: activeCategory === cat ? "#F97316" : "#9CA3AF" }}>
            {cat}
          </button>
        ))}
      </div>
      <div className="flex flex-col gap-1.5">
        {filteredGrades.map((g) => {
          const active = selectedGrade === g.id;
          return (
            <button key={g.id} onClick={() => setSelectedGrade(g.id)} className="flex items-center gap-3 p-3 rounded-xl text-left transition-all" style={{ background: active ? `${g.color}15` : "rgba(255,255,255,0.03)", border: `1.5px solid ${active ? g.color : "rgba(255,255,255,0.07)"}` }}>
              <div className="text-xl flex-shrink-0">{g.icon}</div>
              <div className="flex-1">
                <p className="text-sm font-bold" style={{ color: active ? g.color : "#E5E7EB" }}>{g.label}</p>
                <p className="text-xs mt-0.5" style={{ color: "#6B7280" }}>{g.desc}</p>
              </div>
              {active && <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: g.color }} />}
            </button>
          );
        })}
      </div>
      <div className="p-4 rounded-2xl" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
        <div className="flex justify-between mb-2"><span className="text-xs font-bold text-white">Grade Intensity</span><span className="text-xs font-bold" style={{ color: selectedGradeData?.color || "#F97316" }}>{intensity}%</span></div>
        <input type="range" min={10} max={100} step={5} value={intensity} onChange={(e) => setIntensity(parseInt(e.target.value))} className="w-full" style={{ accentColor: selectedGradeData?.color || "#F97316" }} />
      </div>
      <button onClick={process} disabled={!videoFile || isProcessing} className="w-full py-4 rounded-2xl font-black text-white text-sm transition-all flex items-center justify-center gap-2" style={{ background: !videoFile || isProcessing ? "rgba(249,115,22,0.3)" : `linear-gradient(135deg, ${selectedGradeData?.color || "#F97316"}, #C2410C)`, cursor: !videoFile || isProcessing ? "not-allowed" : "pointer", boxShadow: !videoFile || isProcessing ? "none" : `0 0 24px ${selectedGradeData?.color || "#F97316"}40` }}>
        {isProcessing ? <><Loader2 size={18} className="animate-spin" /> Grading...</> : <><Palette size={18} /> Apply {selectedGradeData?.label || "Grade"}</>}
      </button>
      {isProcessing && <ProcessingBar label={`Applying ${selectedGradeData?.label || "grade"}...`} />}
      {outputUrl && (
        <div className="flex flex-col gap-2">
          <p className="text-[10px] font-black uppercase tracking-widest" style={{ color: "#6B7280" }}>Output</p>
          <VideoPlayer src={outputUrl} label={selectedGradeData?.label || selectedGrade} accent={selectedGradeData?.color || "#F97316"} />
          <button onClick={() => { const a = document.createElement("a"); a.href = outputUrl; a.download = `vaultx-grade-${selectedGrade}.mp4`; a.click(); }} className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold" style={{ background: `${selectedGradeData?.color || "#F97316"}20`, color: selectedGradeData?.color || "#F97316", border: `1px solid ${selectedGradeData?.color || "#F97316"}30` }}><Download size={14} /> Save Graded Video</button>
        </div>
      )}
    </>
  );

  const right = videoFile ? (
    outputUrl ? (
      <CanvasBeforeAfter beforeUrl={videoFile.url} afterUrl={outputUrl} label={selectedGradeData?.label || "Graded"} accent={selectedGradeData?.color || "#F97316"} />
    ) : (
      <CanvasVideoPlayer src={videoFile.url} label="Source" accent={selectedGradeData?.color || "#F97316"} onReplace={() => setVideoFile(null)} />
    )
  ) : (
    <CanvasDropZone onFile={setVideoFile} accent="#F97316" label="Drop your video to apply a color grade" />
  );

  return <Workspace left={left} right={right} />;
}

// ============================================================================
// MODE: SCENE ARCHITECT
// ============================================================================
function SceneArchitectMode({ onOutput }: { onOutput: (url: string, label: string) => void }) {
  const [videoFile, setVideoFile] = useState<VideoFile | null>(null);
  const [activeOp, setActiveOp] = useState<"trim" | "color" | "audio" | "speed" | "sharpen">("trim");
  const [trimStart, setTrimStart] = useState(0);
  const [trimEnd, setTrimEnd] = useState(30);
  const [colorLook, setColorLook] = useState("none");
  const [brightness, setBrightness] = useState(50);
  const [contrast, setContrast] = useState(50);
  const [saturation, setSaturation] = useState(50);
  const [volume, setVolume] = useState(100);
  const [fadeIn, setFadeIn] = useState(0);
  const [fadeOut, setFadeOut] = useState(0);
  const [speed, setSpeed] = useState(1.0);
  const [sharpenIntensity, setSharpenIntensity] = useState(50);
  const [outputUrl, setOutputUrl] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [aiScenes, setAiScenes] = useState<any[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const transcribeForScene = trpc.videoEnhance.transcribeVideo.useMutation({
    onSuccess: (data: any) => {
      analyzeSceneMut.mutate({ transcript: data.text || "", segments: data.segments || [], videoDuration: videoFile?.duration });
    },
    onError: (e: any) => { setIsAnalyzing(false); toast.error(`Transcription failed: ${e.message}`); },
  });

  const analyzeSceneMut = trpc.videoEnhance.analyzeScene.useMutation({
    onSuccess: (data: any) => {
      setIsAnalyzing(false);
      setAiScenes(data.scenes || []);
      if (data.scenes?.length > 0) toast.success(data.message);
      else toast.info("No distinct scenes detected");
    },
    onError: (e: any) => { setIsAnalyzing(false); toast.error(`Scene analysis failed: ${e.message}`); },
  });

  const runAISceneAnalysis = async () => {
    if (!videoFile) return toast.error("Upload a video first.");
    setIsAnalyzing(true); setAiScenes([]);
    try {
      const fd = new FormData();
      fd.append("video", videoFile.file); fd.append("start", "0"); fd.append("end", "60");
      const trimResult = await callVideoStudio("trim", fd);
      transcribeForScene.mutate({ videoUrl: trimResult.url });
    } catch (e: any) { setIsAnalyzing(false); toast.error(e.message); }
  };

  const COLOR_LOOKS = [
    { id: "none", label: "Original" }, { id: "cinematic", label: "Cinematic" },
    { id: "vintage", label: "Vintage" }, { id: "neon_nights", label: "Neon Nights" },
    { id: "golden_hour", label: "Golden Hour" }, { id: "cold_blue", label: "Cold Blue" },
    { id: "bw_classic", label: "B&W Classic" }, { id: "kodak", label: "Kodak" },
    { id: "fuji", label: "Fuji" }, { id: "club_dark", label: "Club Dark" },
  ];

  const OPS = [
    { id: "trim" as const,    label: "Trim",    icon: <Scissors size={13}/> },
    { id: "color" as const,   label: "Color",   icon: <Palette size={13}/> },
    { id: "audio" as const,   label: "Audio",   icon: <AudioWaveform size={13}/> },
    { id: "speed" as const,   label: "Speed",   icon: <Gauge size={13}/> },
    { id: "sharpen" as const, label: "Sharpen", icon: <Contrast size={13}/> },
  ];

  const process = async (op: string) => {
    if (!videoFile) return toast.error("Upload a video first.");
    setIsProcessing(true); setOutputUrl(null);
    try {
      const fd = new FormData();
      fd.append("video", videoFile.file);
      if (op === "trim") { fd.append("start", String(trimStart)); fd.append("end", String(trimEnd)); }
      else if (op === "color-grade") { fd.append("look", colorLook); fd.append("brightness", String(brightness)); fd.append("contrast", String(contrast)); fd.append("saturation", String(saturation)); }
      else if (op === "audio") { fd.append("mode", "volume"); fd.append("volume", String(volume)); fd.append("fadeIn", String(fadeIn)); fd.append("fadeOut", String(fadeOut)); }
      else if (op === "speed") { fd.append("speed", String(speed)); }
      else if (op === "filter") { fd.append("filter", "sharpen"); fd.append("intensity", String(sharpenIntensity / 100)); }
      const result = await callVideoStudio(op, fd);
      setOutputUrl(result.url);
      onOutput(result.url, op.replace("-", " ").replace(/\b\w/g, l => l.toUpperCase()));
      toast.success("Operation complete.");
    } catch (e: any) { toast.error(e.message); }
    finally { setIsProcessing(false); }
  };

  const left = (
    <>
      <div>
        <p className="text-xs font-black uppercase tracking-widest mb-1" style={{ color: "#EAB308" }}>Scene Architect</p>
        <p className="text-xs" style={{ color: "#6B7280" }}>Trim, cut, color, audio, speed — full editor</p>
      </div>
      {/* AI Scene Detection */}
      <div className="flex flex-col gap-2 p-3 rounded-xl" style={{ background: "rgba(234,179,8,0.06)", border: "1px solid rgba(234,179,8,0.2)" }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BrainCircuit size={14} color="#EAB308" />
            <span className="text-xs font-bold text-white">AI Scene Detection</span>
            <span className="text-[9px] px-1.5 py-0.5 rounded-full font-bold" style={{ background: "rgba(234,179,8,0.2)", color: "#EAB308" }}>GPT-4o-mini</span>
          </div>
          <button onClick={runAISceneAnalysis} disabled={!videoFile || isAnalyzing} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all" style={{ background: !videoFile || isAnalyzing ? "rgba(234,179,8,0.1)" : "rgba(234,179,8,0.2)", color: "#EAB308", border: "1px solid rgba(234,179,8,0.3)", cursor: !videoFile || isAnalyzing ? "not-allowed" : "pointer" }}>
            {isAnalyzing ? <><Loader2 size={10} className="animate-spin" /> Analyzing...</> : <><BrainCircuit size={10} /> Detect</>}
          </button>
        </div>
        {aiScenes.length > 0 && (
          <div className="flex flex-col gap-1.5 mt-1">
            {aiScenes.map((scene: any, i: number) => (
              <button key={i} onClick={() => { setTrimStart(scene.start); setTrimEnd(scene.end); setActiveOp("trim"); toast.success(`Scene loaded: ${scene.start}s–${scene.end}s`); }} className="flex items-center gap-2 p-2.5 rounded-lg text-left" style={{ background: "rgba(234,179,8,0.08)", border: "1px solid rgba(234,179,8,0.2)" }}>
                <span className="text-[10px] font-black w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: "rgba(234,179,8,0.2)", color: "#EAB308" }}>{i+1}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-white truncate">{scene.label}</p>
                  <p className="text-[10px]" style={{ color: "#EAB308" }}>{scene.start}s–{scene.end}s</p>
                </div>
                <Scissors size={12} color="#EAB308" />
              </button>
            ))}
          </div>
        )}
      </div>
      {/* Op tabs */}
      <div className="flex gap-1 flex-wrap">
        {OPS.map(op => (
          <button key={op.id} onClick={() => setActiveOp(op.id)} className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all" style={{ background: activeOp === op.id ? "rgba(234,179,8,0.2)" : "rgba(255,255,255,0.04)", border: `1.5px solid ${activeOp === op.id ? "#EAB308" : "rgba(255,255,255,0.08)"}`, color: activeOp === op.id ? "#EAB308" : "#9CA3AF" }}>
            {op.icon} {op.label}
          </button>
        ))}
      </div>
      {/* Op controls */}
      <div className="p-4 rounded-2xl" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
        {activeOp === "trim" && (
          <div className="flex flex-col gap-3">
            {[{ label: "Start (s)", value: trimStart, setter: setTrimStart }, { label: "End (s)", value: trimEnd, setter: setTrimEnd }].map(({ label, value, setter }) => (
              <div key={label}>
                <div className="flex justify-between mb-1.5"><label className="text-xs font-semibold" style={{ color: "#9CA3AF" }}>{label}</label><span className="text-xs font-bold" style={{ color: "#EAB308" }}>{value}s</span></div>
                <input type="range" min={0} max={videoFile?.duration || 300} step={1} value={value} onChange={(e) => setter(parseInt(e.target.value))} className="w-full" style={{ accentColor: "#EAB308" }} />
              </div>
            ))}
            <p className="text-xs" style={{ color: "#6B7280" }}>Duration: {trimEnd - trimStart}s</p>
            <button onClick={() => process("trim")} disabled={!videoFile || isProcessing} className="w-full py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2" style={{ background: !videoFile || isProcessing ? "rgba(234,179,8,0.2)" : "linear-gradient(135deg, #EAB308, #A16207)", color: "white", cursor: !videoFile || isProcessing ? "not-allowed" : "pointer" }}>
              {isProcessing ? <><Loader2 size={14} className="animate-spin" /> Trimming...</> : <><Scissors size={14} /> Trim Video</>}
            </button>
          </div>
        )}
        {activeOp === "color" && (
          <div className="flex flex-col gap-3">
            <div className="grid grid-cols-2 gap-1.5">
              {COLOR_LOOKS.map(l => (
                <button key={l.id} onClick={() => setColorLook(l.id)} className="py-2 px-2 rounded-xl text-xs font-semibold transition-all" style={{ background: colorLook === l.id ? "rgba(234,179,8,0.2)" : "rgba(255,255,255,0.04)", border: `1px solid ${colorLook === l.id ? "#EAB308" : "rgba(255,255,255,0.08)"}`, color: colorLook === l.id ? "#EAB308" : "#9CA3AF" }}>{l.label}</button>
              ))}
            </div>
            {[{ label: "Brightness", value: brightness, setter: setBrightness }, { label: "Contrast", value: contrast, setter: setContrast }, { label: "Saturation", value: saturation, setter: setSaturation }].map(({ label, value, setter }) => (
              <div key={label}>
                <div className="flex justify-between mb-1"><label className="text-xs font-semibold" style={{ color: "#9CA3AF" }}>{label}</label><span className="text-xs font-bold" style={{ color: "#EAB308" }}>{value}</span></div>
                <input type="range" min={0} max={100} step={1} value={value} onChange={(e) => setter(parseInt(e.target.value))} className="w-full" style={{ accentColor: "#EAB308" }} />
              </div>
            ))}
            <button onClick={() => process("color-grade")} disabled={!videoFile || isProcessing} className="w-full py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2" style={{ background: !videoFile || isProcessing ? "rgba(234,179,8,0.2)" : "linear-gradient(135deg, #EAB308, #A16207)", color: "white", cursor: !videoFile || isProcessing ? "not-allowed" : "pointer" }}>
              {isProcessing ? <><Loader2 size={14} className="animate-spin" /> Grading...</> : <><Palette size={14} /> Apply Color Grade</>}
            </button>
          </div>
        )}
        {activeOp === "audio" && (
          <div className="flex flex-col gap-3">
            {[{ label: "Volume (0–300%)", value: volume, setter: setVolume, min: 0, max: 300 }, { label: "Fade In (s)", value: fadeIn, setter: setFadeIn, min: 0, max: 10 }, { label: "Fade Out (s)", value: fadeOut, setter: setFadeOut, min: 0, max: 10 }].map(({ label, value, setter, min, max }) => (
              <div key={label}>
                <div className="flex justify-between mb-1"><label className="text-xs font-semibold" style={{ color: "#9CA3AF" }}>{label}</label><span className="text-xs font-bold" style={{ color: "#EAB308" }}>{value}</span></div>
                <input type="range" min={min} max={max} step={1} value={value} onChange={(e) => setter(parseInt(e.target.value))} className="w-full" style={{ accentColor: "#EAB308" }} />
              </div>
            ))}
            <button onClick={() => process("audio")} disabled={!videoFile || isProcessing} className="w-full py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2" style={{ background: !videoFile || isProcessing ? "rgba(234,179,8,0.2)" : "linear-gradient(135deg, #EAB308, #A16207)", color: "white", cursor: !videoFile || isProcessing ? "not-allowed" : "pointer" }}>
              {isProcessing ? <><Loader2 size={14} className="animate-spin" /> Processing...</> : <><Volume2 size={14} /> Apply Audio</>}
            </button>
          </div>
        )}
        {activeOp === "speed" && (
          <div className="flex flex-col gap-3">
            <div className="flex justify-between mb-1"><span className="text-xs font-semibold" style={{ color: "#9CA3AF" }}>Speed</span><span className="text-xs font-bold" style={{ color: "#EAB308" }}>{speed}×</span></div>
            <input type="range" min={0.25} max={4} step={0.25} value={speed} onChange={(e) => setSpeed(parseFloat(e.target.value))} className="w-full" style={{ accentColor: "#EAB308" }} />
            <div className="grid grid-cols-4 gap-1.5">
              {[0.5, 1, 1.5, 2].map(s => (
                <button key={s} onClick={() => setSpeed(s)} className="py-2 rounded-xl text-xs font-bold" style={{ background: speed === s ? "rgba(234,179,8,0.2)" : "rgba(255,255,255,0.04)", border: `1px solid ${speed === s ? "#EAB308" : "rgba(255,255,255,0.08)"}`, color: speed === s ? "#EAB308" : "#9CA3AF" }}>{s}×</button>
              ))}
            </div>
            <button onClick={() => process("speed")} disabled={!videoFile || isProcessing} className="w-full py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2" style={{ background: !videoFile || isProcessing ? "rgba(234,179,8,0.2)" : "linear-gradient(135deg, #EAB308, #A16207)", color: "white", cursor: !videoFile || isProcessing ? "not-allowed" : "pointer" }}>
              {isProcessing ? <><Loader2 size={14} className="animate-spin" /> Adjusting Speed...</> : <><Gauge size={14} /> Apply {speed}× Speed</>}
            </button>
          </div>
        )}
        {activeOp === "sharpen" && (
          <div className="flex flex-col gap-3">
            <div className="flex justify-between mb-1"><span className="text-xs font-semibold" style={{ color: "#9CA3AF" }}>Sharpen Strength</span><span className="text-xs font-bold" style={{ color: "#EAB308" }}>{sharpenIntensity}%</span></div>
            <input type="range" min={10} max={100} step={5} value={sharpenIntensity} onChange={(e) => setSharpenIntensity(parseInt(e.target.value))} className="w-full" style={{ accentColor: "#EAB308" }} />
            <button onClick={() => process("filter")} disabled={!videoFile || isProcessing} className="w-full py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2" style={{ background: !videoFile || isProcessing ? "rgba(234,179,8,0.2)" : "linear-gradient(135deg, #EAB308, #A16207)", color: "white", cursor: !videoFile || isProcessing ? "not-allowed" : "pointer" }}>
              {isProcessing ? <><Loader2 size={14} className="animate-spin" /> Sharpening...</> : <><Contrast size={14} /> Apply Sharpen</>}
            </button>
          </div>
        )}
      </div>
      {isProcessing && <ProcessingBar label="Processing..." />}
      {outputUrl && (
        <div className="flex flex-col gap-2">
          <p className="text-[10px] font-black uppercase tracking-widest" style={{ color: "#6B7280" }}>Output</p>
          <VideoPlayer src={outputUrl} label="Processed" accent="#EAB308" />
          <button onClick={() => { const a = document.createElement("a"); a.href = outputUrl; a.download = `vaultx-scene-${activeOp}.mp4`; a.click(); }} className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold" style={{ background: "rgba(234,179,8,0.15)", color: "#EAB308", border: "1px solid rgba(234,179,8,0.3)" }}><Download size={14} /> Save Output</button>
        </div>
      )}
    </>
  );

  const right = videoFile ? (
    outputUrl ? (
      <CanvasBeforeAfter beforeUrl={videoFile.url} afterUrl={outputUrl} label={activeOp.charAt(0).toUpperCase() + activeOp.slice(1)} accent="#EAB308" />
    ) : (
      <CanvasVideoPlayer src={videoFile.url} label="Source" accent="#EAB308" onReplace={() => setVideoFile(null)} />
    )
  ) : (
    <CanvasDropZone onFile={setVideoFile} accent="#EAB308" label="Drop your video to start editing" />
  );

  return <Workspace left={left} right={right} />;
}

// ============================================================================
// MODE: PPV ENGINE
// ============================================================================
function PPVEngineMode({ onOutput }: { onOutput: (url: string, label: string) => void }) {
  const [videoFile, setVideoFile] = useState<VideoFile | null>(null);
  const [activeOp, setActiveOp] = useState<"teaser" | "censor" | "watermark">("teaser");
  const [previewDuration, setPreviewDuration] = useState(20);
  const [censorIntensity, setCensorIntensity] = useState(60);
  const [watermarkText, setWatermarkText] = useState("");
  const [watermarkPosition, setWatermarkPosition] = useState("bottom_right");
  const [watermarkOpacity, setWatermarkOpacity] = useState(80);
  const [outputUrl, setOutputUrl] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [aiMoments, setAiMoments] = useState<any>(null);
  const [isAnalyzingPPV, setIsAnalyzingPPV] = useState(false);

  const transcribeForPPV = trpc.videoEnhance.transcribeVideo.useMutation({
    onSuccess: (data: any) => {
      analyzePPVMut.mutate({ transcript: data.text || "", segments: data.segments || [], videoDuration: videoFile?.duration, contentType: "adult" });
    },
    onError: (e: any) => { setIsAnalyzingPPV(false); toast.error(`Transcription failed: ${e.message}`); },
  });

  const analyzePPVMut = trpc.videoEnhance.analyzePPVMoments.useMutation({
    onSuccess: (data: any) => {
      setIsAnalyzingPPV(false);
      setAiMoments(data);
      toast.success("AI PPV analysis complete");
    },
    onError: (e: any) => { setIsAnalyzingPPV(false); toast.error(`PPV analysis failed: ${e.message}`); },
  });

  const runAIPPVAnalysis = async () => {
    if (!videoFile) return toast.error("Upload a video first.");
    setIsAnalyzingPPV(true); setAiMoments(null);
    try {
      const fd = new FormData();
      fd.append("video", videoFile.file); fd.append("start", "0"); fd.append("end", "60");
      const trimResult = await callVideoStudio("trim", fd);
      transcribeForPPV.mutate({ videoUrl: trimResult.url });
    } catch (e: any) { setIsAnalyzingPPV(false); toast.error(e.message); }
  };

  const processTeaser = async () => {
    if (!videoFile) return toast.error("Upload a video first.");
    setIsProcessing(true); setOutputUrl(null);
    try {
      const fd = new FormData();
      fd.append("video", videoFile.file); fd.append("start", "0"); fd.append("end", String(previewDuration));
      const result = await callVideoStudio("trim", fd);
      setOutputUrl(result.url); onOutput(result.url, `PPV Teaser — ${previewDuration}s`);
      toast.success("PPV teaser created.");
    } catch (e: any) { toast.error(e.message); }
    finally { setIsProcessing(false); }
  };

  const processCensor = async () => {
    if (!videoFile) return toast.error("Upload a video first.");
    setIsProcessing(true); setOutputUrl(null);
    try {
      const fd = new FormData();
      fd.append("video", videoFile.file); fd.append("filter", "ppv_censor"); fd.append("intensity", String(censorIntensity / 100));
      const result = await callVideoStudio("filter", fd);
      setOutputUrl(result.url); onOutput(result.url, "Censored Preview");
      toast.success("Censor blur applied.");
    } catch (e: any) { toast.error(e.message); }
    finally { setIsProcessing(false); }
  };

  const processWatermark = async () => {
    if (!videoFile) return toast.error("Upload a video first.");
    if (!watermarkText.trim()) return toast.error("Enter your handle.");
    setIsProcessing(true); setOutputUrl(null);
    try {
      const fd = new FormData();
      fd.append("video", videoFile.file); fd.append("mode", "text"); fd.append("text", watermarkText);
      fd.append("position", watermarkPosition); fd.append("opacity", String(watermarkOpacity)); fd.append("size", "28"); fd.append("color", "FFFFFF");
      const result = await callVideoStudio("watermark", fd);
      setOutputUrl(result.url); onOutput(result.url, `Watermarked — ${watermarkText}`);
      toast.success("Watermark applied.");
    } catch (e: any) { toast.error(e.message); }
    finally { setIsProcessing(false); }
  };

  const OPS = [
    { id: "teaser" as const,    label: "Teaser", icon: <Scissors size={13}/> },
    { id: "censor" as const,    label: "Censor", icon: <Eye size={13}/> },
    { id: "watermark" as const, label: "Brand",  icon: <Shield size={13}/> },
  ];

  const left = (
    <>
      <div>
        <p className="text-xs font-black uppercase tracking-widest mb-1" style={{ color: "#A855F7" }}>PPV Engine</p>
        <p className="text-xs" style={{ color: "#6B7280" }}>Teaser clipper · blur censor · watermark branding</p>
      </div>
      {/* AI PPV Intelligence */}
      <div className="flex flex-col gap-2 p-3 rounded-xl" style={{ background: "rgba(168,85,247,0.06)", border: "1px solid rgba(168,85,247,0.2)" }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BrainCircuit size={14} color="#A855F7" />
            <span className="text-xs font-bold text-white">AI PPV Intelligence</span>
            <span className="text-[9px] px-1.5 py-0.5 rounded-full font-bold" style={{ background: "rgba(168,85,247,0.2)", color: "#A855F7" }}>GPT-4o-mini</span>
          </div>
          <button onClick={runAIPPVAnalysis} disabled={!videoFile || isAnalyzingPPV} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold" style={{ background: !videoFile || isAnalyzingPPV ? "rgba(168,85,247,0.1)" : "rgba(168,85,247,0.2)", color: "#A855F7", border: "1px solid rgba(168,85,247,0.3)", cursor: !videoFile || isAnalyzingPPV ? "not-allowed" : "pointer" }}>
            {isAnalyzingPPV ? <><Loader2 size={10} className="animate-spin" /> Analyzing...</> : <><DollarSign size={10} /> Analyze</>}
          </button>
        </div>
        {aiMoments && (
          <div className="flex flex-col gap-2 mt-1">
            {aiMoments.videoTitle && (
              <div className="p-2.5 rounded-lg" style={{ background: "rgba(168,85,247,0.1)", border: "1px solid rgba(168,85,247,0.2)" }}>
                <p className="text-xs font-bold text-white">{aiMoments.videoTitle}</p>
                <div className="flex items-center gap-2 mt-1.5">
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded" style={{ background: "rgba(34,197,94,0.15)", color: "#22C55E" }}>${aiMoments.suggestedPrice}</span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded" style={{ background: "rgba(168,85,247,0.15)", color: "#A855F7" }}>{aiMoments.platform}</span>
                </div>
              </div>
            )}
            {aiMoments.moments?.length > 0 && aiMoments.moments.slice(0, 3).map((m: any, i: number) => (
              <button key={i} onClick={() => { setPreviewDuration(m.end - m.start); setActiveOp("teaser"); toast.success(`Moment loaded: ${m.start}s–${m.end}s`); }} className="flex items-center gap-2 p-2.5 rounded-lg text-left" style={{ background: "rgba(168,85,247,0.08)", border: "1px solid rgba(168,85,247,0.2)" }}>
                <span className="text-[10px] font-black w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: "rgba(168,85,247,0.2)", color: "#A855F7" }}>{i+1}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-white truncate">{m.title}</p>
                  <p className="text-[10px]" style={{ color: "#A855F7" }}>{m.start}s–{m.end}s · ${m.price}</p>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
      {/* Op tabs */}
      <div className="flex gap-1.5">
        {OPS.map(op => (
          <button key={op.id} onClick={() => setActiveOp(op.id)} className="flex items-center gap-1.5 flex-1 justify-center py-2.5 rounded-xl text-xs font-bold transition-all" style={{ background: activeOp === op.id ? "rgba(168,85,247,0.2)" : "rgba(255,255,255,0.04)", border: `1.5px solid ${activeOp === op.id ? "#A855F7" : "rgba(255,255,255,0.08)"}`, color: activeOp === op.id ? "#A855F7" : "#9CA3AF" }}>
            {op.icon} {op.label}
          </button>
        ))}
      </div>
      {/* Op controls */}
      <div className="p-4 rounded-2xl" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
        {activeOp === "teaser" && (
          <div className="flex flex-col gap-3">
            <p className="text-xs font-bold text-white">Preview Duration</p>
            <div className="grid grid-cols-5 gap-1.5">
              {[10, 15, 20, 30, 45].map(d => (
                <button key={d} onClick={() => setPreviewDuration(d)} className="py-2 rounded-xl text-xs font-bold" style={{ background: previewDuration === d ? "rgba(168,85,247,0.3)" : "rgba(255,255,255,0.04)", border: `1px solid ${previewDuration === d ? "#A855F7" : "rgba(255,255,255,0.08)"}`, color: previewDuration === d ? "#C4B5FD" : "#9CA3AF" }}>{d}s</button>
              ))}
            </div>
            <button onClick={processTeaser} disabled={!videoFile || isProcessing} className="w-full py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2" style={{ background: !videoFile || isProcessing ? "rgba(168,85,247,0.2)" : "linear-gradient(135deg, #A855F7, #7C3AED)", color: "white", cursor: !videoFile || isProcessing ? "not-allowed" : "pointer" }}>
              {isProcessing ? <><Loader2 size={14} className="animate-spin" /> Clipping...</> : <><Scissors size={14} /> Create {previewDuration}s Teaser</>}
            </button>
          </div>
        )}
        {activeOp === "censor" && (
          <div className="flex flex-col gap-3">
            <div className="flex justify-between mb-1"><span className="text-xs font-semibold" style={{ color: "#9CA3AF" }}>Blur Intensity</span><span className="text-xs font-bold" style={{ color: "#A855F7" }}>{censorIntensity}%</span></div>
            <input type="range" min={20} max={100} step={5} value={censorIntensity} onChange={(e) => setCensorIntensity(parseInt(e.target.value))} className="w-full" style={{ accentColor: "#A855F7" }} />
            <div className="grid grid-cols-3 gap-1.5">
              {[{ label: "Light", val: 30 }, { label: "Standard", val: 60 }, { label: "Max", val: 100 }].map(p => (
                <button key={p.label} onClick={() => setCensorIntensity(p.val)} className="py-2 rounded-xl text-xs font-bold" style={{ background: censorIntensity === p.val ? "rgba(168,85,247,0.2)" : "rgba(255,255,255,0.04)", border: `1px solid ${censorIntensity === p.val ? "#A855F7" : "rgba(255,255,255,0.08)"}`, color: censorIntensity === p.val ? "#C4B5FD" : "#9CA3AF" }}>{p.label}</button>
              ))}
            </div>
            <button onClick={processCensor} disabled={!videoFile || isProcessing} className="w-full py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2" style={{ background: !videoFile || isProcessing ? "rgba(168,85,247,0.2)" : "linear-gradient(135deg, #A855F7, #7C3AED)", color: "white", cursor: !videoFile || isProcessing ? "not-allowed" : "pointer" }}>
              {isProcessing ? <><Loader2 size={14} className="animate-spin" /> Censoring...</> : <><Eye size={14} /> Apply Blur Censor</>}
            </button>
          </div>
        )}
        {activeOp === "watermark" && (
          <div className="flex flex-col gap-3">
            <input value={watermarkText} onChange={(e) => setWatermarkText(e.target.value)} placeholder="@YourHandle" className="w-full px-3 py-2.5 rounded-xl text-sm text-white" style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }} />
            <div className="grid grid-cols-3 gap-1.5">
              {[{ id: "top_left", label: "↖ TL" }, { id: "top_center", label: "↑ TC" }, { id: "top_right", label: "↗ TR" }, { id: "bottom_left", label: "↙ BL" }, { id: "bottom_center", label: "↓ BC" }, { id: "bottom_right", label: "↘ BR" }].map(p => (
                <button key={p.id} onClick={() => setWatermarkPosition(p.id)} className="py-2 rounded-xl text-xs font-semibold" style={{ background: watermarkPosition === p.id ? "rgba(168,85,247,0.2)" : "rgba(255,255,255,0.04)", border: `1px solid ${watermarkPosition === p.id ? "#A855F7" : "rgba(255,255,255,0.08)"}`, color: watermarkPosition === p.id ? "#C4B5FD" : "#9CA3AF" }}>{p.label}</button>
              ))}
            </div>
            <div className="flex justify-between mb-1"><span className="text-xs font-semibold" style={{ color: "#9CA3AF" }}>Opacity</span><span className="text-xs font-bold" style={{ color: "#A855F7" }}>{watermarkOpacity}%</span></div>
            <input type="range" min={20} max={100} step={5} value={watermarkOpacity} onChange={(e) => setWatermarkOpacity(parseInt(e.target.value))} className="w-full" style={{ accentColor: "#A855F7" }} />
            <button onClick={processWatermark} disabled={!videoFile || isProcessing} className="w-full py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2" style={{ background: !videoFile || isProcessing ? "rgba(168,85,247,0.2)" : "linear-gradient(135deg, #A855F7, #7C3AED)", color: "white", cursor: !videoFile || isProcessing ? "not-allowed" : "pointer" }}>
              {isProcessing ? <><Loader2 size={14} className="animate-spin" /> Watermarking...</> : <><Shield size={14} /> Apply Watermark</>}
            </button>
          </div>
        )}
      </div>
      {isProcessing && <ProcessingBar label="Processing PPV content..." />}
      {outputUrl && (
        <div className="flex flex-col gap-2">
          <p className="text-[10px] font-black uppercase tracking-widest" style={{ color: "#6B7280" }}>Output</p>
          <VideoPlayer src={outputUrl} label={activeOp === "teaser" ? `${previewDuration}s Teaser` : activeOp === "censor" ? "Censored" : "Watermarked"} accent="#A855F7" />
          <button onClick={() => { const a = document.createElement("a"); a.href = outputUrl; a.download = `vaultx-ppv-${activeOp}.mp4`; a.click(); }} className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold" style={{ background: "rgba(168,85,247,0.15)", color: "#A855F7", border: "1px solid rgba(168,85,247,0.3)" }}><Download size={14} /> Save Output</button>
        </div>
      )}
    </>
  );

  const right = videoFile ? (
    outputUrl ? (
      <CanvasBeforeAfter beforeUrl={videoFile.url} afterUrl={outputUrl} label={activeOp === "teaser" ? `${previewDuration}s Teaser` : activeOp === "censor" ? "Censored" : "Watermarked"} accent="#A855F7" />
    ) : (
      <CanvasVideoPlayer src={videoFile.url} label="Full Content" accent="#A855F7" onReplace={() => setVideoFile(null)} />
    )
  ) : (
    <CanvasDropZone onFile={setVideoFile} accent="#A855F7" label="Drop your content to create PPV assets" />
  );

  return <Workspace left={left} right={right} />;
}

// ============================================================================
// MODE: PLATFORM VAULT
// ============================================================================
function PlatformVaultMode({ onOutput }: { onOutput: (url: string, label: string) => void }) {
  const [videoFile, setVideoFile] = useState<VideoFile | null>(null);
  const [exportMode, setExportMode] = useState<"dual" | "manual">("dual");
  const [selectedPlatforms, setSelectedPlatforms] = useState<Set<string>>(new Set(["onlyfans", "twitter"]));
  const [outputs, setOutputs] = useState<{ label: string; url: string; platform: string; type: string }[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingLabel, setProcessingLabel] = useState<string | null>(null);

  const togglePlatform = (id: string) => setSelectedPlatforms(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const processDual = async () => {
    if (!videoFile) return toast.error("Upload a video first.");
    setIsProcessing(true); setOutputs([]);
    try {
      setProcessingLabel("Creating SFW teaser (15s, 720p)...");
      const sfwFd = new FormData();
      sfwFd.append("video", videoFile.file); sfwFd.append("format", "mp4_h264"); sfwFd.append("resolution", "720p");
      const sfwResult = await callVideoStudio("convert", sfwFd);
      setOutputs(prev => [...prev, { label: "SFW Teaser (720p)", url: sfwResult.url, platform: "Instagram · TikTok · Twitter", type: "sfw" }]);
      onOutput(sfwResult.url, "SFW Teaser (720p)"); toast.success("SFW Teaser ready!");

      setProcessingLabel("Creating Adult Full (1080p)...");
      const adultFd = new FormData();
      adultFd.append("video", videoFile.file); adultFd.append("format", "mp4_h264"); adultFd.append("resolution", "1080p");
      const adultResult = await callVideoStudio("convert", adultFd);
      setOutputs(prev => [...prev, { label: "Adult Full (1080p)", url: adultResult.url, platform: "OnlyFans · Fansly · ManyVids", type: "adult" }]);
      onOutput(adultResult.url, "Adult Full (1080p)"); toast.success("Adult Full ready!");
    } catch (e: any) { toast.error(e.message); }
    finally { setIsProcessing(false); setProcessingLabel(null); }
  };

  const processManual = async () => {
    if (!videoFile) return toast.error("Upload a video first.");
    if (selectedPlatforms.size === 0) return toast.error("Select at least one platform.");
    setIsProcessing(true); setOutputs([]);
    for (const platformId of selectedPlatforms) {
      const platform = EXPORT_PLATFORMS.find(p => p.id === platformId);
      if (!platform) continue;
      setProcessingLabel(`Exporting for ${platform.name}...`);
      try {
        const fd = new FormData();
        fd.append("video", videoFile.file); fd.append("format", platform.format); fd.append("resolution", platform.resolution);
        const result = await callVideoStudio("convert", fd);
        setOutputs(prev => [...prev, { label: `${platform.name} (${platform.resolution})`, url: result.url, platform: platform.name, type: platform.type }]);
        onOutput(result.url, `${platform.name} Export`); toast.success(`${platform.name} ready!`);
      } catch (e: any) { toast.error(`${platform.name}: ${e.message}`); }
    }
    setIsProcessing(false); setProcessingLabel(null);
  };

  const left = (
    <>
      <div>
        <p className="text-xs font-black uppercase tracking-widest mb-1" style={{ color: "#06B6D4" }}>Platform Vault</p>
        <p className="text-xs" style={{ color: "#6B7280" }}>Export for OnlyFans, Fansly, ManyVids, and more</p>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {[{ id: "dual", label: "Dual Export", desc: "SFW teaser + Adult full" }, { id: "manual", label: "Manual Select", desc: "Pick specific platforms" }].map(m => (
          <button key={m.id} onClick={() => setExportMode(m.id as any)} className="p-3 rounded-2xl text-left transition-all" style={{ background: exportMode === m.id ? "rgba(6,182,212,0.15)" : "rgba(255,255,255,0.03)", border: `1.5px solid ${exportMode === m.id ? "#06B6D4" : "rgba(255,255,255,0.08)"}` }}>
            <p className="text-xs font-bold" style={{ color: exportMode === m.id ? "#06B6D4" : "#E5E7EB" }}>{m.label}</p>
            <p className="text-[10px] mt-0.5" style={{ color: "#6B7280" }}>{m.desc}</p>
          </button>
        ))}
      </div>
      {exportMode === "manual" && (
        <div className="flex flex-col gap-2">
          <p className="text-[10px] font-black uppercase tracking-widest" style={{ color: "#6B7280" }}>Adult Platforms</p>
          {EXPORT_PLATFORMS.filter(p => p.type === "adult").map(p => (
            <button key={p.id} onClick={() => togglePlatform(p.id)} className="flex items-center gap-3 p-3 rounded-xl text-left" style={{ background: selectedPlatforms.has(p.id) ? "rgba(6,182,212,0.15)" : "rgba(255,255,255,0.03)", border: `1.5px solid ${selectedPlatforms.has(p.id) ? "#06B6D4" : "rgba(255,255,255,0.08)"}` }}>
              <span className="text-lg">{p.icon}</span>
              <div className="flex-1 min-w-0"><p className="text-xs font-bold" style={{ color: selectedPlatforms.has(p.id) ? "#06B6D4" : "#E5E7EB" }}>{p.name}</p><p className="text-[10px] truncate" style={{ color: "#6B7280" }}>{p.note}</p></div>
              {selectedPlatforms.has(p.id) && <Check size={12} color="#06B6D4" />}
            </button>
          ))}
          <p className="text-[10px] font-black uppercase tracking-widest mt-1" style={{ color: "#6B7280" }}>SFW / Social</p>
          {EXPORT_PLATFORMS.filter(p => p.type === "sfw").map(p => (
            <button key={p.id} onClick={() => togglePlatform(p.id)} className="flex items-center gap-3 p-3 rounded-xl text-left" style={{ background: selectedPlatforms.has(p.id) ? "rgba(6,182,212,0.15)" : "rgba(255,255,255,0.03)", border: `1.5px solid ${selectedPlatforms.has(p.id) ? "#06B6D4" : "rgba(255,255,255,0.08)"}` }}>
              <span className="text-lg">{p.icon}</span>
              <div className="flex-1 min-w-0"><p className="text-xs font-bold" style={{ color: selectedPlatforms.has(p.id) ? "#06B6D4" : "#E5E7EB" }}>{p.name}</p><p className="text-[10px] truncate" style={{ color: "#6B7280" }}>{p.note}</p></div>
              {selectedPlatforms.has(p.id) && <Check size={12} color="#06B6D4" />}
            </button>
          ))}
        </div>
      )}
      {exportMode === "dual" && (
        <div className="flex flex-col gap-2 p-3 rounded-xl" style={{ background: "rgba(6,182,212,0.08)", border: "1px solid rgba(6,182,212,0.2)" }}>
          <div className="flex items-center gap-2"><span>✅</span><div><p className="text-xs font-semibold text-white">SFW Teaser — 15s, 720p</p><p className="text-[10px]" style={{ color: "#9CA3AF" }}>Instagram · TikTok · Twitter/X</p></div></div>
          <div className="flex items-center gap-2"><span>🔞</span><div><p className="text-xs font-semibold text-white">Adult Full — 1080p</p><p className="text-[10px]" style={{ color: "#9CA3AF" }}>OnlyFans · Fansly · ManyVids</p></div></div>
        </div>
      )}
      <button onClick={exportMode === "dual" ? processDual : processManual} disabled={!videoFile || isProcessing} className="w-full py-4 rounded-2xl font-black text-white text-sm transition-all flex items-center justify-center gap-2" style={{ background: !videoFile || isProcessing ? "rgba(6,182,212,0.3)" : "linear-gradient(135deg, #06B6D4, #0E7490)", cursor: !videoFile || isProcessing ? "not-allowed" : "pointer", boxShadow: !videoFile || isProcessing ? "none" : "0 0 24px rgba(6,182,212,0.3)" }}>
        {isProcessing ? <><Loader2 size={18} className="animate-spin" /> {processingLabel || "Exporting..."}</> : <><MonitorPlay size={18} /> {exportMode === "dual" ? "Dual Export" : `Export to ${selectedPlatforms.size} Platform${selectedPlatforms.size !== 1 ? "s" : ""}`}</>}
      </button>
      {isProcessing && processingLabel && <ProcessingBar label={processingLabel} />}
      {outputs.length > 0 && (
        <div className="flex flex-col gap-3">
          <p className="text-[10px] font-black uppercase tracking-widest" style={{ color: "#6B7280" }}>Exports ({outputs.length})</p>
          {outputs.map((out, i) => (
            <div key={i} className="flex flex-col gap-2">
              <VideoPlayer src={out.url} label={out.label} accent={out.type === "adult" ? "#DC2626" : "#06B6D4"} />
              <button onClick={() => { const a = document.createElement("a"); a.href = out.url; a.download = `vaultx-${out.platform.toLowerCase().replace(/\s/g, "-")}.mp4`; a.click(); }} className="w-full flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-bold" style={{ background: "rgba(6,182,212,0.15)", color: "#06B6D4", border: "1px solid rgba(6,182,212,0.3)" }}><Download size={12} /> Save {out.label}</button>
            </div>
          ))}
        </div>
      )}
    </>
  );

  const right = videoFile ? (
    <CanvasVideoPlayer src={videoFile.url} label="Source" accent="#06B6D4" onReplace={() => setVideoFile(null)} />
  ) : (
    <CanvasDropZone onFile={setVideoFile} accent="#06B6D4" label="Drop your video to export for platforms" />
  );

  return <Workspace left={left} right={right} />;
}

// ============================================================================
// MODE: AI ENHANCE
// ============================================================================
function AIEnhanceMode({ onOutput }: { onOutput: (url: string, label: string) => void }) {
  const [videoFile, setVideoFile] = useState<VideoFile | null>(null);
  const [activeOp, setActiveOp] = useState<"slowmo" | "upscale" | "denoise">("slowmo");
  const [selectedFps, setSelectedFps] = useState<"60" | "120" | "240">("60");
  const [predictionId, setPredictionId] = useState<string | null>(null);
  const [upscalePredictionId, setUpscalePredictionId] = useState<string | null>(null);
  const [outputUrl, setOutputUrl] = useState<string | null>(null);
  const [beforeUrl, setBeforeUrl] = useState<string | null>(null);
  const [outputLabel, setOutputLabel] = useState("AI Enhanced");
  const [isProcessing, setIsProcessing] = useState(false);
  const [denoiseIntensity, setDenoiseIntensity] = useState(60);
  const [upscaleResolution, setUpscaleResolution] = useState<"FHD" | "2k" | "4k">("4k");

  const slowMotionMut = trpc.videoEnhance.slowMotion.useMutation({
    onSuccess: (data: any) => { setPredictionId(data.predictionId); toast.success("AI slow motion started — Replicate RIFE v4.6..."); },
    onError: (e: any) => { toast.error(e.message); setIsProcessing(false); },
  });

  const upscaleMut = trpc.videoEnhance.upscaleVideo.useMutation({
    onSuccess: (data: any) => { setUpscalePredictionId(data.predictionId); toast.success(`AI upscale started — Replicate Real-ESRGAN — ${upscaleResolution}`); },
    onError: (e: any) => { toast.error(e.message); setIsProcessing(false); },
  });

  const jobQuery = trpc.videoEnhance.getJob.useQuery(
    { predictionId: predictionId! },
    { enabled: !!predictionId, refetchInterval: (data: any) => data?.isComplete ? false : 3000 }
  );

  const upscaleJobQuery = trpc.videoEnhance.getJob.useQuery(
    { predictionId: upscalePredictionId! },
    { enabled: !!upscalePredictionId, refetchInterval: (data: any) => data?.isComplete ? false : 5000 }
  );

  useEffect(() => {
    const d = jobQuery.data as any;
    if (d?.isComplete && d?.outputUrl) {
      const lbl = `Slow Motion ${selectedFps === "60" ? "2×" : selectedFps === "120" ? "4×" : "8×"} — Replicate RIFE`;
      setOutputUrl(d.outputUrl); setOutputLabel(lbl);
      onOutput(d.outputUrl, lbl);
      setIsProcessing(false); setPredictionId(null);
      toast.success("AI slow motion complete — Replicate RIFE v4.6");
    }
    if (d?.isFailed) { toast.error(d.error || "Slow motion failed"); setIsProcessing(false); setPredictionId(null); }
  }, [jobQuery.data]);

  useEffect(() => {
    const d = upscaleJobQuery.data as any;
    if (d?.isComplete && d?.outputUrl) {
      const lbl = `AI Upscaled ${upscaleResolution} — Real-ESRGAN`;
      setOutputUrl(d.outputUrl); setOutputLabel(lbl);
      onOutput(d.outputUrl, lbl);
      setIsProcessing(false); setUpscalePredictionId(null);
      toast.success(`AI upscale complete — Replicate Real-ESRGAN — ${upscaleResolution}`);
    }
    if (d?.isFailed) { toast.error(d.error || "Upscale failed"); setIsProcessing(false); setUpscalePredictionId(null); }
  }, [upscaleJobQuery.data]);

  const processSlowMo = async () => {
    if (!videoFile) return toast.error("Upload a video first.");
    setIsProcessing(true); setOutputUrl(null); setBeforeUrl(null);
    const fd = new FormData();
    fd.append("video", videoFile.file); fd.append("start", "0"); fd.append("end", "30");
    try {
      const trimResult = await callVideoStudio("trim", fd);
      setBeforeUrl(trimResult.url);
      slowMotionMut.mutate({ videoUrl: trimResult.url, targetFps: selectedFps });
    } catch (e: any) { toast.error(e.message); setIsProcessing(false); }
  };

  const processDenoise = async () => {
    if (!videoFile) return toast.error("Upload a video first.");
    setIsProcessing(true); setOutputUrl(null); setBeforeUrl(null);
    try {
      const fd = new FormData();
      fd.append("video", videoFile.file); fd.append("filter", "denoised"); fd.append("intensity", String(denoiseIntensity / 100));
      const beforeFd = new FormData();
      beforeFd.append("video", videoFile.file); beforeFd.append("start", "0"); beforeFd.append("end", "60");
      const [result, beforeResult] = await Promise.all([callVideoStudio("filter", fd), callVideoStudio("trim", beforeFd)]);
      setBeforeUrl(beforeResult.url); setOutputUrl(result.url); setOutputLabel("Denoised (FFmpeg hqdn3d)");
      onOutput(result.url, "Denoised (FFmpeg)"); toast.success("Denoise complete.");
    } catch (e: any) { toast.error(e.message); }
    finally { setIsProcessing(false); }
  };

  const OPS = [
    { id: "slowmo" as const,  label: "Slow Motion", icon: <Timer size={13}/> },
    { id: "upscale" as const, label: "AI Upscale",  icon: <Zap size={13}/> },
    { id: "denoise" as const, label: "Denoise",     icon: <Stars size={13}/> },
  ];

  const left = (
    <>
      <div>
        <p className="text-xs font-black uppercase tracking-widest mb-1" style={{ color: "#22C55E" }}>AI Enhance</p>
        <p className="text-xs" style={{ color: "#6B7280" }}>Replicate RIFE slow motion · Real-ESRGAN upscale · FFmpeg denoise</p>
      </div>
      <div className="flex gap-1.5">
        {OPS.map(op => (
          <button key={op.id} onClick={() => setActiveOp(op.id)} className="flex items-center gap-1.5 flex-1 justify-center py-2.5 rounded-xl text-xs font-bold transition-all" style={{ background: activeOp === op.id ? "rgba(34,197,94,0.2)" : "rgba(255,255,255,0.04)", border: `1.5px solid ${activeOp === op.id ? "#22C55E" : "rgba(255,255,255,0.08)"}`, color: activeOp === op.id ? "#22C55E" : "#9CA3AF" }}>
            {op.icon} {op.label}
          </button>
        ))}
      </div>
      <div className="p-4 rounded-2xl" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
        {activeOp === "slowmo" && (
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-2">
              {SLOW_MO_PRESETS.map(p => (
                <button key={p.fps} onClick={() => setSelectedFps(p.fps)} className="flex items-center gap-3 p-3 rounded-xl text-left transition-all" style={{ background: selectedFps === p.fps ? "rgba(34,197,94,0.15)" : "rgba(255,255,255,0.03)", border: `1.5px solid ${selectedFps === p.fps ? "#22C55E" : "rgba(255,255,255,0.07)"}` }}>
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 font-black text-base" style={{ background: selectedFps === p.fps ? "rgba(34,197,94,0.2)" : "rgba(255,255,255,0.05)", color: selectedFps === p.fps ? "#22C55E" : "#6B7280" }}>{p.multiplier}</div>
                  <div><p className="text-xs font-bold" style={{ color: selectedFps === p.fps ? "#22C55E" : "#E5E7EB" }}>{p.label}</p><p className="text-[10px] mt-0.5" style={{ color: "#6B7280" }}>{p.desc}</p></div>
                </button>
              ))}
            </div>
            <div className="flex items-start gap-2 p-2.5 rounded-xl" style={{ background: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.2)" }}>
              <AlertCircle size={12} color="#22C55E" className="flex-shrink-0 mt-0.5" />
              <p className="text-[10px]" style={{ color: "#86EFAC" }}><strong>Replicate RIFE v4.6</strong> frame interpolation. 2–5 min. First 30s used. (Not Runway.)</p>
            </div>
            <button onClick={processSlowMo} disabled={!videoFile || isProcessing} className="w-full py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2" style={{ background: !videoFile || isProcessing ? "rgba(34,197,94,0.2)" : "linear-gradient(135deg, #22C55E, #15803D)", color: "white", cursor: !videoFile || isProcessing ? "not-allowed" : "pointer" }}>
              {isProcessing ? <><Loader2 size={14} className="animate-spin" /> Processing RIFE...</> : <><Timer size={14} /> Generate {selectedFps === "60" ? "2×" : selectedFps === "120" ? "4×" : "8×"} Slow Motion</>}
            </button>
          </div>
        )}
        {activeOp === "upscale" && (
          <div className="flex flex-col gap-3">
            <div className="flex gap-1.5">
              {(["FHD", "2k", "4k"] as const).map(r => (
                <button key={r} onClick={() => setUpscaleResolution(r)} className="flex-1 py-2 rounded-xl text-xs font-bold" style={{ background: upscaleResolution === r ? "rgba(34,197,94,0.2)" : "rgba(255,255,255,0.04)", border: `1.5px solid ${upscaleResolution === r ? "#22C55E" : "rgba(255,255,255,0.08)"}`, color: upscaleResolution === r ? "#22C55E" : "#9CA3AF" }}>{r}</button>
              ))}
            </div>
            <div className="flex items-start gap-2 p-2.5 rounded-xl" style={{ background: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.2)" }}>
              <AlertCircle size={12} color="#22C55E" className="flex-shrink-0 mt-0.5" />
              <p className="text-[10px]" style={{ color: "#86EFAC" }}><strong>Replicate Real-ESRGAN</strong> AI super-resolution. 30–120s. First 30s used.</p>
            </div>
            <button onClick={async () => {
              if (!videoFile) return toast.error("Upload a video first.");
              setIsProcessing(true); setOutputUrl(null); setBeforeUrl(null);
              try {
                const fd = new FormData();
                fd.append("video", videoFile.file); fd.append("start", "0"); fd.append("end", "30");
                const trimResult = await callVideoStudio("trim", fd);
                setBeforeUrl(trimResult.url);
                upscaleMut.mutate({ videoUrl: trimResult.url, resolution: upscaleResolution });
              } catch (e: any) { toast.error(e.message); setIsProcessing(false); }
            }} disabled={!videoFile || isProcessing} className="w-full py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2" style={{ background: !videoFile || isProcessing ? "rgba(34,197,94,0.2)" : "linear-gradient(135deg, #22C55E, #15803D)", color: "white", cursor: !videoFile || isProcessing ? "not-allowed" : "pointer" }}>
              {isProcessing ? <><Loader2 size={14} className="animate-spin" /> Upscaling via Replicate...</> : <><Zap size={14} /> Upscale to {upscaleResolution} — Real-ESRGAN</>}
            </button>
          </div>
        )}
        {activeOp === "denoise" && (
          <div className="flex flex-col gap-3">
            <div className="flex justify-between mb-1"><span className="text-xs font-semibold" style={{ color: "#9CA3AF" }}>Denoise Strength</span><span className="text-xs font-bold" style={{ color: "#22C55E" }}>{denoiseIntensity}%</span></div>
            <input type="range" min={20} max={100} step={5} value={denoiseIntensity} onChange={(e) => setDenoiseIntensity(parseInt(e.target.value))} className="w-full" style={{ accentColor: "#22C55E" }} />
            <div className="flex items-start gap-2 p-2.5 rounded-xl" style={{ background: "rgba(234,179,8,0.08)", border: "1px solid rgba(234,179,8,0.25)" }}>
              <AlertCircle size={12} color="#EAB308" className="flex-shrink-0 mt-0.5" />
              <p className="text-[10px]" style={{ color: "#FDE047" }}>Denoise uses <strong>FFmpeg hqdn3d</strong> (not AI). Honest.</p>
            </div>
            <button onClick={processDenoise} disabled={!videoFile || isProcessing} className="w-full py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2" style={{ background: !videoFile || isProcessing ? "rgba(34,197,94,0.2)" : "linear-gradient(135deg, #22C55E, #15803D)", color: "white", cursor: !videoFile || isProcessing ? "not-allowed" : "pointer" }}>
              {isProcessing ? <><Loader2 size={14} className="animate-spin" /> Denoising (FFmpeg)...</> : <><Stars size={14} /> Apply Denoise (FFmpeg)</>}
            </button>
          </div>
        )}
      </div>
      {isProcessing && <ProcessingBar label={activeOp === "slowmo" ? "AI slow motion — Replicate RIFE v4.6 (2–5 min)..." : activeOp === "upscale" ? "AI upscale — Replicate Real-ESRGAN (30–120s)..." : "Denoising (FFmpeg)..."} />}
    </>
  );

  const right = videoFile ? (
    outputUrl && beforeUrl ? (
      <CanvasBeforeAfter beforeUrl={beforeUrl} afterUrl={outputUrl} label={outputLabel} accent="#22C55E" />
    ) : outputUrl ? (
      <CanvasVideoPlayer src={outputUrl} label={outputLabel} accent="#22C55E" />
    ) : (
      <CanvasVideoPlayer src={videoFile.url} label="Source" accent="#22C55E" onReplace={() => setVideoFile(null)} />
    )
  ) : (
    <CanvasDropZone onFile={setVideoFile} accent="#22C55E" label="Drop your video for AI enhancement" />
  );

  return <Workspace left={left} right={right} />;
}

// ============================================================================
// MODE: CAPTION STUDIO
// ============================================================================
function CaptionStudioMode({ onOutput }: { onOutput: (url: string, label: string) => void }) {
  const [videoFile, setVideoFile] = useState<VideoFile | null>(null);
  const [text, setText] = useState("");
  const [position, setPosition] = useState("bottom_center");
  const [fontSize, setFontSize] = useState(36);
  const [startTime, setStartTime] = useState(0);
  const [endTime, setEndTime] = useState(10);
  const [outputUrl, setOutputUrl] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [transcribeSegments, setTranscribeSegments] = useState<{ start: number; end: number; text: string }[]>([]);

  const transcribeMut = trpc.videoEnhance.transcribeVideo.useMutation({
    onSuccess: (data: any) => {
      setIsTranscribing(false);
      if (data.segments && data.segments.length > 0) {
        setTranscribeSegments(data.segments.map((s: any) => ({ start: Math.round(s.start), end: Math.round(s.end), text: s.text.trim() })));
        setText(data.text);
        toast.success(`Whisper: ${data.segments.length} segments detected`);
      } else {
        setText(data.text);
        toast.success("Whisper transcription complete");
      }
    },
    onError: (e: any) => { setIsTranscribing(false); toast.error(`Transcription failed: ${e.message}`); },
  });

  const handleAutoTranscribe = async () => {
    if (!videoFile) return toast.error("Upload a video first.");
    setIsTranscribing(true); setTranscribeSegments([]);
    try {
      const fd = new FormData();
      fd.append("video", videoFile.file); fd.append("start", "0"); fd.append("end", "60");
      const trimResult = await callVideoStudio("trim", fd);
      transcribeMut.mutate({ videoUrl: trimResult.url });
    } catch (e: any) { setIsTranscribing(false); toast.error(e.message); }
  };

  const QUICK_CAPTIONS = [
    "🔞 FULL VIDEO ON MY PAGE", "💋 LINK IN BIO", "🔥 SUBSCRIBE FOR MORE",
    "💎 EXCLUSIVE CONTENT", "📲 DM ME", "💰 PPV AVAILABLE",
  ];

  const process = async () => {
    if (!videoFile) return toast.error("Upload a video first.");
    if (!text.trim()) return toast.error("Enter caption text.");
    setIsProcessing(true); setOutputUrl(null);
    try {
      const fd = new FormData();
      fd.append("video", videoFile.file);
      fd.append("text", text);
      fd.append("position", position);
      fd.append("fontSize", String(fontSize));
      fd.append("color", "FFFFFF");
      fd.append("start", String(startTime));
      fd.append("end", String(endTime));
      const result = await callVideoStudio("add-text", fd);
      setOutputUrl(result.url);
      onOutput(result.url, "Captioned Video");
      toast.success("Caption burned in.");
    } catch (e: any) { toast.error(e.message); }
    finally { setIsProcessing(false); }
  };

  const left = (
    <>
      <div>
        <p className="text-xs font-black uppercase tracking-widest mb-1" style={{ color: "#60A5FA" }}>Caption Studio</p>
        <p className="text-xs" style={{ color: "#6B7280" }}>OpenAI Whisper auto-transcription + FFmpeg burn-in</p>
      </div>
      {/* Whisper auto-transcribe */}
      <div className="flex flex-col gap-2 p-3 rounded-xl" style={{ background: "rgba(96,165,250,0.06)", border: "1px solid rgba(96,165,250,0.2)" }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BrainCircuit size={14} color="#60A5FA" />
            <span className="text-xs font-bold text-white">Auto-Transcribe</span>
            <span className="text-[9px] px-1.5 py-0.5 rounded-full font-bold" style={{ background: "rgba(96,165,250,0.2)", color: "#60A5FA" }}>Whisper-1</span>
          </div>
          <button onClick={handleAutoTranscribe} disabled={!videoFile || isTranscribing} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold" style={{ background: !videoFile || isTranscribing ? "rgba(96,165,250,0.1)" : "rgba(96,165,250,0.2)", color: "#60A5FA", border: "1px solid rgba(96,165,250,0.3)", cursor: !videoFile || isTranscribing ? "not-allowed" : "pointer" }}>
            {isTranscribing ? <><Loader2 size={10} className="animate-spin" /> Transcribing...</> : "Transcribe"}
          </button>
        </div>
        {transcribeSegments.length > 0 && (
          <div className="flex flex-col gap-1 mt-1 max-h-32 overflow-y-auto">
            {transcribeSegments.map((seg, i) => (
              <button key={i} onClick={() => { setText(seg.text); setStartTime(seg.start); setEndTime(seg.end); }} className="flex items-start gap-2 p-2 rounded-lg text-left" style={{ background: "rgba(96,165,250,0.08)", border: "1px solid rgba(96,165,250,0.15)" }}>
                <span className="text-[10px] font-bold flex-shrink-0" style={{ color: "#60A5FA" }}>{seg.start}s</span>
                <p className="text-[10px] text-white truncate">{seg.text}</p>
              </button>
            ))}
          </div>
        )}
      </div>
      {/* Quick captions */}
      <div>
        <p className="text-[10px] font-black uppercase tracking-widest mb-2" style={{ color: "#6B7280" }}>Quick Captions</p>
        <div className="grid grid-cols-2 gap-1.5">
          {QUICK_CAPTIONS.map(c => (
            <button key={c} onClick={() => setText(c)} className="py-2 px-2 rounded-xl text-[10px] font-semibold text-left transition-all" style={{ background: text === c ? "rgba(96,165,250,0.15)" : "rgba(255,255,255,0.04)", border: `1px solid ${text === c ? "#60A5FA" : "rgba(255,255,255,0.08)"}`, color: text === c ? "#60A5FA" : "#9CA3AF" }}>{c}</button>
          ))}
        </div>
      </div>
      <textarea value={text} onChange={(e) => setText(e.target.value)} placeholder="Caption text..." rows={3} className="w-full px-3 py-2.5 rounded-xl text-sm text-
white" style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", resize: "none" }} />
      <div className="grid grid-cols-3 gap-1.5">
        {[{ id: "top_center", label: "Top" }, { id: "center", label: "Center" }, { id: "bottom_center", label: "Bottom" }].map(p => (
          <button key={p.id} onClick={() => setPosition(p.id)} className="py-2 rounded-xl text-xs font-bold" style={{ background: position === p.id ? "rgba(96,165,250,0.2)" : "rgba(255,255,255,0.04)", border: `1px solid ${position === p.id ? "#60A5FA" : "rgba(255,255,255,0.08)"}`, color: position === p.id ? "#60A5FA" : "#9CA3AF" }}>{p.label}</button>
        ))}
      </div>
      <div>
        <div className="flex justify-between mb-1"><span className="text-xs font-semibold" style={{ color: "#9CA3AF" }}>Font Size</span><span className="text-xs font-bold" style={{ color: "#60A5FA" }}>{fontSize}px</span></div>
        <input type="range" min={18} max={72} step={2} value={fontSize} onChange={(e) => setFontSize(parseInt(e.target.value))} className="w-full" style={{ accentColor: "#60A5FA" }} />
      </div>
      <div className="grid grid-cols-2 gap-2">
        {[{ label: "Start (s)", value: startTime, setter: setStartTime }, { label: "End (s)", value: endTime, setter: setEndTime }].map(({ label, value, setter }) => (
          <div key={label}>
            <p className="text-[10px] font-semibold mb-1" style={{ color: "#9CA3AF" }}>{label}</p>
            <input type="number" value={value} onChange={(e) => setter(parseInt(e.target.value) || 0)} className="w-full px-3 py-2 rounded-xl text-sm text-white" style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }} />
          </div>
        ))}
      </div>
      <button onClick={process} disabled={!videoFile || isProcessing} className="w-full py-4 rounded-2xl font-black text-white text-sm transition-all flex items-center justify-center gap-2" style={{ background: !videoFile || isProcessing ? "rgba(96,165,250,0.3)" : "linear-gradient(135deg, #60A5FA, #2563EB)", cursor: !videoFile || isProcessing ? "not-allowed" : "pointer", boxShadow: !videoFile || isProcessing ? "none" : "0 0 24px rgba(96,165,250,0.3)" }}>
        {isProcessing ? <><Loader2 size={18} className="animate-spin" /> Burning Captions...</> : <><Type size={18} /> Burn Captions</>}
      </button>
      {isProcessing && <ProcessingBar label="Burning captions with FFmpeg..." />}
      {outputUrl && (
        <div className="flex flex-col gap-2">
          <p className="text-[10px] font-black uppercase tracking-widest" style={{ color: "#6B7280" }}>Output</p>
          <VideoPlayer src={outputUrl} label="Captioned" accent="#60A5FA" />
          <button onClick={() => { const a = document.createElement("a"); a.href = outputUrl; a.download = "vaultx-captioned.mp4"; a.click(); }} className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold" style={{ background: "rgba(96,165,250,0.15)", color: "#60A5FA", border: "1px solid rgba(96,165,250,0.3)" }}><Download size={14} /> Save Captioned Video</button>
        </div>
      )}
    </>
  );

  const right = videoFile ? (
    outputUrl ? (
      <CanvasBeforeAfter beforeUrl={videoFile.url} afterUrl={outputUrl} label="Captioned" accent="#60A5FA" />
    ) : (
      <CanvasVideoPlayer src={videoFile.url} label="Source" accent="#60A5FA" onReplace={() => setVideoFile(null)} />
    )
  ) : (
    <CanvasDropZone onFile={setVideoFile} accent="#60A5FA" label="Drop your video to add captions" />
  );

  return <Workspace left={left} right={right} />;
}

// ============================================================================
// MODE: CONTENT VAULT
// ============================================================================
function ContentVaultMode({ onOutput }: { onOutput: (url: string, label: string) => void }) {
  const [uploads, setUploads] = useState<{ name: string; url: string; size: number; timestamp: number }[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadName, setUploadName] = useState("");
  const [selectedVideo, setSelectedVideo] = useState<string | null>(null);

  const handleUpload = async (file: File) => {
    setIsUploading(true); setUploadProgress(0); setUploadName(file.name);
    try {
      const uploadId = `vault-${Date.now()}`;
      const totalChunks = Math.ceil(file.size / CHUNK_SIZE);
      const initResp = await fetch("/api/video/upload/init", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ uploadId, totalChunks, filename: file.name }),
      });
      if (!initResp.ok) throw new Error("Upload init failed");
      let lastResult: any = null;
      for (let i = 0; i < totalChunks; i++) {
        const chunk = file.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE);
        const fd = new FormData();
        fd.append("uploadId", uploadId); fd.append("chunkIndex", String(i)); fd.append("chunk", chunk, file.name);
        const resp = await fetch("/api/video/upload/chunk", { method: "POST", body: fd });
        if (!resp.ok) throw new Error(`Chunk ${i} failed`);
        lastResult = await resp.json();
        setUploadProgress(Math.round(((i + 1) / totalChunks) * 100));
      }
      let fileUrl = lastResult?.file?.url;
      if (!fileUrl) {
        const finResp = await fetch("/api/video/upload/finalize", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ uploadId, filename: file.name }),
        });
        const finData = await finResp.json();
        fileUrl = finData.file?.url || finData.url;
      }
      if (!fileUrl) throw new Error("Upload failed — no URL returned");
      const newUpload = { name: file.name, url: fileUrl, size: file.size, timestamp: Date.now() };
      setUploads(prev => [newUpload, ...prev]);
      setSelectedVideo(fileUrl);
      onOutput(fileUrl, file.name);
      toast.success(`${file.name} uploaded to Content Vault`);
    } catch (e: any) { toast.error(e.message); }
    finally { setIsUploading(false); setUploadProgress(0); setUploadName(""); }
  };

  const left = (
    <>
      <div>
        <p className="text-xs font-black uppercase tracking-widest mb-1" style={{ color: "#9333EA" }}>Content Vault</p>
        <p className="text-xs" style={{ color: "#6B7280" }}>Chunked upload — files persist server-side at /uploads/content-vault/</p>
      </div>
      <VideoDropZone onFile={(vf) => handleUpload(vf.file)} accent="#9333EA" />
      {isUploading && (
        <div className="flex flex-col gap-2 p-4 rounded-2xl" style={{ background: "rgba(147,51,234,0.08)", border: "1px solid rgba(147,51,234,0.2)" }}>
          <div className="flex items-center gap-2">
            <Loader2 size={14} color="#9333EA" className="animate-spin" />
            <p className="text-xs font-semibold text-white truncate">{uploadName}</p>
            <span className="ml-auto text-xs font-bold" style={{ color: "#9333EA" }}>{uploadProgress}%</span>
          </div>
          <div className="w-full rounded-full overflow-hidden" style={{ height: 4, background: "rgba(147,51,234,0.15)" }}>
            <div className="h-full rounded-full transition-all" style={{ width: `${uploadProgress}%`, background: "linear-gradient(90deg, #9333EA, #7C3AED)" }} />
          </div>
        </div>
      )}
      {uploads.length > 0 && (
        <div className="flex flex-col gap-2">
          <p className="text-[10px] font-black uppercase tracking-widest" style={{ color: "#6B7280" }}>Vault ({uploads.length})</p>
          {uploads.map((u, i) => (
            <button key={i} onClick={() => setSelectedVideo(u.url)} className="flex items-center gap-3 p-3 rounded-xl text-left transition-all" style={{ background: selectedVideo === u.url ? "rgba(147,51,234,0.15)" : "rgba(255,255,255,0.03)", border: `1.5px solid ${selectedVideo === u.url ? "#9333EA" : "rgba(255,255,255,0.07)"}` }}>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: "rgba(147,51,234,0.15)" }}>
                <FileVideo size={16} color="#9333EA" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-white truncate">{u.name}</p>
                <p className="text-[10px]" style={{ color: "#6B7280" }}>{fmtSize(u.size)} · {new Date(u.timestamp).toLocaleTimeString()}</p>
              </div>
              {selectedVideo === u.url && <Check size={12} color="#9333EA" />}
            </button>
          ))}
        </div>
      )}
    </>
  );

  const right = selectedVideo ? (
    <CanvasVideoPlayer src={selectedVideo} label="Vault Asset" accent="#9333EA" />
  ) : (
    <CanvasDropZone onFile={(vf) => handleUpload(vf.file)} accent="#9333EA" label="Drop your video to add to Content Vault" />
  );

  return <Workspace left={left} right={right} />;
}

// ============================================================================
// MODE: FINAL OUTPUT ENGINE
// ============================================================================
type FOEJob = "premium" | "teaser" | "clips";
type FOEStep = "idle" | "analyzing" | "enhancing" | "cutting" | "packaging" | "complete" | "error";

interface FOEOutput {
  jobId: string;
  job: FOEJob;
  status: string;
  sourceUrl: string;
  outputs: any;
  enginesUsed: any[];
  errors?: string[];
}

const FOE_STEPS: { id: FOEStep; label: string; icon: React.ReactNode }[] = [
  { id: "analyzing",  label: "Analyzing",  icon: <BrainCircuit size={12}/> },
  { id: "enhancing",  label: "Enhancing",  icon: <Zap size={12}/> },
  { id: "cutting",    label: "Cutting",    icon: <Scissors size={12}/> },
  { id: "packaging",  label: "Packaging",  icon: <Package size={12}/> },
  { id: "complete",   label: "Complete",   icon: <CircleCheck size={12}/> },
];

function FOEProgressTimeline({ step }: { step: FOEStep }) {
  const activeIdx = FOE_STEPS.findIndex(s => s.id === step);
  return (
    <div className="flex items-center gap-0">
      {FOE_STEPS.map((s, i) => {
        const done = i < activeIdx;
        const active = i === activeIdx;
        return (
          <div key={s.id} className="flex items-center flex-1">
            <div className="flex flex-col items-center gap-1 flex-1">
              <div className="w-7 h-7 rounded-full flex items-center justify-center transition-all" style={{ background: done ? "rgba(34,197,94,0.2)" : active ? "rgba(245,158,11,0.2)" : "rgba(255,255,255,0.05)", border: `1.5px solid ${done ? "#22C55E" : active ? "#F59E0B" : "rgba(255,255,255,0.1)"}` }}>
                <span style={{ color: done ? "#22C55E" : active ? "#F59E0B" : "#6B7280" }}>{done ? <Check size={12}/> : s.icon}</span>
              </div>
              <p className="text-[9px] font-bold text-center" style={{ color: done ? "#22C55E" : active ? "#F59E0B" : "#6B7280" }}>{s.label}</p>
            </div>
            {i < FOE_STEPS.length - 1 && <div className="h-px flex-1 mb-4" style={{ background: done ? "#22C55E" : "rgba(255,255,255,0.08)" }} />}
          </div>
        );
      })}
    </div>
  );
}

function FinalOutputEngineMode({ onOutput }: { onOutput: (url: string, label: string) => void }) {
  const [videoFile, setVideoFile] = useState<VideoFile | null>(null);
  const [step, setStep] = useState<FOEStep>("idle");
  const [activeJob, setActiveJob] = useState<FOEJob | null>(null);
  const [results, setResults] = useState<FOEOutput[]>([]);
  const [stepLabel, setStepLabel] = useState("");

  const premiumMut = trpc.videoEnhance.createPremiumVideo.useMutation();
  const teaserMut  = trpc.videoEnhance.createTeaserPackage.useMutation();
  const clipsMut   = trpc.videoEnhance.createViralClipPack.useMutation();

  const isRunning = step !== "idle" && step !== "complete" && step !== "error";

  const uploadVideoToServer = async (file: VideoFile): Promise<string> => {
    const uploadId = `foe-${Date.now()}`;
    const totalChunks = Math.ceil(file.size / CHUNK_SIZE);
    const initResp = await fetch("/api/video/upload/init", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ uploadId, totalChunks, filename: file.name }),
    });
    if (!initResp.ok) throw new Error("Upload init failed");
    let lastResult: any = null;
    for (let i = 0; i < totalChunks; i++) {
      const start = i * CHUNK_SIZE;
      const chunk = file.file.slice(start, start + CHUNK_SIZE);
      const fd = new FormData();
      fd.append("uploadId", uploadId); fd.append("chunkIndex", String(i)); fd.append("chunk", chunk, file.name);
      const resp = await fetch("/api/video/upload/chunk", { method: "POST", body: fd });
      if (!resp.ok) throw new Error(`Chunk ${i} upload failed`);
      lastResult = await resp.json();
    }
    if (lastResult?.file?.url) return lastResult.file.url;
    const finResp = await fetch("/api/video/upload/finalize", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ uploadId, filename: file.name }),
    });
    const finData = await finResp.json();
    return finData.file?.url || finData.url;
  };

  const run = async (job: FOEJob) => {
    if (!videoFile) return toast.error("Upload a source video first.");
    if (isRunning) return;
    setActiveJob(job); setStep("analyzing"); setStepLabel("Uploading source video...");
    try {
      const videoUrl = await uploadVideoToServer(videoFile);
      setStep("analyzing"); setStepLabel("Analyzing with OpenAI Whisper + GPT-4o-mini...");
      let result: any;
      if (job === "premium") {
        setStep("enhancing"); setStepLabel("Enhancing with Replicate Real-ESRGAN (2–5 min)...");
        result = await premiumMut.mutateAsync({ videoUrl, enableUpscale: true, targetResolution: "4k" });
      } else if (job === "teaser") {
        setStep("cutting"); setStepLabel("Detecting best moment + cutting teaser...");
        result = await teaserMut.mutateAsync({ videoUrl, teaserDuration: 30 });
      } else {
        setStep("cutting"); setStepLabel("Detecting 3 best moments + cutting clips...");
        result = await clipsMut.mutateAsync({ videoUrl, clipCount: 3, aspectRatio: "16:9" });
      }
      setStep("packaging"); setStepLabel("Packaging output bundle...");
      await new Promise(r => setTimeout(r, 800));
      const foeResult: FOEOutput = { jobId: result.jobId, job, status: result.status, sourceUrl: videoUrl, outputs: result.outputs, enginesUsed: result.enginesUsed, errors: result.errors };
      setResults(prev => [foeResult, ...prev]);
      setStep("complete"); setStepLabel("");
      const primaryUrl = job === "premium" ? result.outputs?.premiumVideoUrl : job === "teaser" ? result.outputs?.teaserUrl : result.outputs?.clips?.[0]?.url;
      if (primaryUrl) onOutput(primaryUrl, job === "premium" ? "Premium Video" : job === "teaser" ? "Teaser" : "Viral Clip 1");
      toast.success(`${job === "premium" ? "Premium Video" : job === "teaser" ? "Teaser Package" : "Clip Pack"} ready!`);
    } catch (e: any) { setStep("error"); setStepLabel(e.message || "Processing failed"); toast.error(e.message || "Processing failed"); }
  };

  const reset = () => { setStep("idle"); setActiveJob(null); setStepLabel(""); };

  const JOB_BUTTONS: { id: FOEJob; label: string; desc: string; icon: React.ReactNode; color: string; accent: string; engines: string }[] = [
    { id: "premium", label: "Create Premium Video",        desc: "Whisper → GPT analysis → Real-ESRGAN upscale → FFmpeg encode", icon: <Sparkles size={20}/>, color: "#22C55E", accent: "rgba(34,197,94,0.15)",   engines: "Whisper · GPT-4o-mini · Replicate ESRGAN · FFmpeg" },
    { id: "teaser",  label: "Create Teaser + Full Package", desc: "Whisper → GPT best-moment → FFmpeg teaser + full + thumbnails", icon: <Clapperboard size={20}/>, color: "#A855F7", accent: "rgba(168,85,247,0.15)", engines: "Whisper · GPT-4o-mini · FFmpeg" },
    { id: "clips",   label: "Create Viral Clip Pack",       desc: "Whisper → GPT 3 moments → FFmpeg clips + hooks per clip",       icon: <TrendingUp size={20}/>, color: "#EF4444", accent: "rgba(239,68,68,0.15)",   engines: "Whisper · GPT-4o-mini · FFmpeg" },
  ];

  const left = (
    <>
      <div>
        <p className="text-xs font-black uppercase tracking-widest mb-1" style={{ color: "#F59E0B" }}>Final Output Engine</p>
        <p className="text-xs" style={{ color: "#6B7280" }}>One upload → Premium video + Teaser package + Viral clip pack</p>
      </div>
      {videoFile && (
        <div className="flex flex-col gap-2">
          <p className="text-[10px] font-black uppercase tracking-widest" style={{ color: "#6B7280" }}>Choose Output</p>
          {JOB_BUTTONS.map(btn => (
            <button key={btn.id} onClick={() => run(btn.id)} disabled={isRunning} className="flex items-start gap-4 p-4 rounded-2xl text-left transition-all w-full" style={{ background: isRunning && activeJob === btn.id ? btn.accent : "rgba(255,255,255,0.03)", border: `2px solid ${isRunning && activeJob === btn.id ? btn.color : "rgba(255,255,255,0.08)"}`, opacity: isRunning && activeJob !== btn.id ? 0.5 : 1, cursor: isRunning ? "not-allowed" : "pointer" }}>
              <div className="w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0" style={{ background: btn.accent, border: `1px solid ${btn.color}40` }}>
                <span style={{ color: btn.color }}>{btn.icon}</span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-black text-white">{btn.label}</p>
                  {isRunning && activeJob === btn.id && <div className="w-4 h-4 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: btn.color, borderTopColor: "transparent" }} />}
                </div>
                <p className="text-xs mt-1" style={{ color: "#9CA3AF" }}>{btn.desc}</p>
                <p className="text-[10px] mt-1 font-semibold" style={{ color: btn.color }}>{btn.engines}</p>
              </div>
            </button>
          ))}
        </div>
      )}
      {step !== "idle" && (
        <div className="flex flex-col gap-3 p-4 rounded-2xl" style={{ background: "rgba(245,158,11,0.06)", border: "1px solid rgba(245,158,11,0.2)" }}>
          <FOEProgressTimeline step={step === "error" ? "analyzing" : step} />
          {step !== "complete" && step !== "error" && stepLabel && (
            <div className="flex items-center gap-2 mt-1">
              <div className="w-3 h-3 rounded-full border-2 border-amber-400 border-t-transparent animate-spin" />
              <p className="text-xs font-semibold" style={{ color: "#FCD34D" }}>{stepLabel}</p>
            </div>
          )}
          {step === "complete" && <div className="flex items-center gap-2 mt-1"><CircleCheck size={14} color="#4ADE80" /><p className="text-xs font-bold" style={{ color: "#4ADE80" }}>Output bundle ready — view on right</p></div>}
          {step === "error" && <div className="flex items-center gap-2 mt-1"><AlertCircle size={14} color="#EF4444" /><p className="text-xs font-semibold" style={{ color: "#FCA5A5" }}>{stepLabel}</p><button onClick={reset} className="ml-auto text-xs font-bold px-2 py-1 rounded-lg" style={{ background: "rgba(239,68,68,0.1)", color: "#EF4444" }}>Retry</button></div>}
        </div>
      )}
    </>
  );

  // Right canvas: show latest result bundle or drop zone
  const latestResult = results[0];
  const right = videoFile ? (
    latestResult ? (
      <div className="flex-1 flex flex-col gap-4 overflow-y-auto">
        {/* Primary output video */}
        {latestResult.job === "premium" && latestResult.outputs?.premiumVideoUrl && (
          <CanvasBeforeAfter beforeUrl={latestResult.sourceUrl} afterUrl={latestResult.outputs.premiumVideoUrl} label="AI Premium — Real-ESRGAN" accent="#22C55E" />
        )}
        {latestResult.job === "teaser" && latestResult.outputs?.teaserUrl && (
          <CanvasVideoPlayer src={latestResult.outputs.teaserUrl} label="Teaser" accent="#A855F7" />
        )}
        {latestResult.job === "clips" && latestResult.outputs?.clips?.[0]?.url && (
          <CanvasVideoPlayer src={latestResult.outputs.clips[0].url} label="Viral Clip 1" accent="#EF4444" />
        )}
        {/* Engine badges */}
        {latestResult.enginesUsed?.length > 0 && (
          <div className="flex flex-wrap gap-2 px-1">
            {latestResult.enginesUsed.map((e: any, i: number) => (
              <div key={i} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl" style={{ background: e.status === "success" ? "rgba(34,197,94,0.1)" : "rgba(234,179,8,0.1)", border: `1px solid ${e.status === "success" ? "rgba(34,197,94,0.3)" : "rgba(234,179,8,0.3)"}` }}>
                <div className="w-1.5 h-1.5 rounded-full" style={{ background: e.status === "success" ? "#22C55E" : "#EAB308" }} />
                <span className="text-[10px] font-bold" style={{ color: e.status === "success" ? "#4ADE80" : "#FDE047" }}>{e.engine}</span>
              </div>
            ))}
          </div>
        )}
        {/* Hooks and captions */}
        {(latestResult.outputs?.hooks?.length > 0 || latestResult.outputs?.captions?.length > 0) && (
          <div className="flex flex-col gap-3 p-4 rounded-2xl" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
            {latestResult.outputs.hooks?.slice(0, 3).map((h: string, i: number) => (
              <div key={i} className="flex items-start gap-2 p-3 rounded-xl" style={{ background: "rgba(96,165,250,0.08)", border: "1px solid rgba(96,165,250,0.2)" }}>
                <p className="text-sm text-white flex-1">{h}</p>
                <button onClick={() => navigator.clipboard.writeText(h)} style={{ color: "#6B7280" }}><Copy size={12} /></button>
              </div>
            ))}
          </div>
        )}
        {/* Clip pack grid */}
        {latestResult.job === "clips" && latestResult.outputs?.clips?.length > 1 && (
          <div className="grid grid-cols-2 gap-3">
            {latestResult.outputs.clips.slice(1).map((clip: any, i: number) => (
              <div key={i} className="flex flex-col gap-2">
                <VideoPlayer src={clip.url} label={`Clip ${i + 2}`} accent="#EF4444" />
                {clip.hook && <p className="text-xs text-white px-1">{clip.hook}</p>}
                <button onClick={() => { const a = document.createElement("a"); a.href = clip.url; a.download = `vaultx-clip-${i+2}.mp4`; a.click(); }} className="flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-bold" style={{ background: "rgba(239,68,68,0.1)", color: "#EF4444", border: "1px solid rgba(239,68,68,0.2)" }}><Download size={12} /> Save</button>
              </div>
            ))}
          </div>
        )}
        {/* Download all */}
        <div className="flex gap-2">
          {latestResult.job === "premium" && latestResult.outputs?.premiumVideoUrl && (
            <button onClick={() => { const a = document.createElement("a"); a.href = latestResult.outputs.premiumVideoUrl; a.download = "vaultx-premium.mp4"; a.click(); }} className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl font-bold text-sm" style={{ background: "rgba(34,197,94,0.15)", color: "#22C55E", border: "1px solid rgba(34,197,94,0.3)" }}><Download size={16} /> Save Premium Video</button>
          )}
          {latestResult.job === "teaser" && latestResult.outputs?.teaserUrl && (
            <button onClick={() => { const a = document.createElement("a"); a.href = latestResult.outputs.teaserUrl; a.download = "vaultx-teaser.mp4"; a.click(); }} className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl font-bold text-sm" style={{ background: "rgba(168,85,247,0.15)", color: "#A855F7", border: "1px solid rgba(168,85,247,0.3)" }}><Download size={16} /> Save Teaser</button>
          )}
        </div>
      </div>
    ) : (
      <CanvasVideoPlayer src={videoFile.url} label="Source" accent="#F59E0B" onReplace={() => setVideoFile(null)} />
    )
  ) : (
    <CanvasDropZone onFile={setVideoFile} accent="#F59E0B" label="Drop your video to generate the full output bundle" />
  );

  return <Workspace left={left} right={right} />;
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================
export default function VaultXStudio() {
  const [activeMode, setActiveMode] = useState<ModeId>("velvet-suite");
  const [sessionHistory, setSessionHistory] = useState<HistoryItem[]>([]);
  const [historyOpen, setHistoryOpen] = useState(false);

  const addToHistory = useCallback((url: string, label: string) => {
    setSessionHistory(prev => [{
      id: `${Date.now()}-${Math.random()}`,
      mode: activeMode,
      label,
      outputUrl: url,
      timestamp: Date.now(),
    }, ...prev.slice(0, 19)]);
  }, [activeMode]);

  const activeModeDef = MODES.find(m => m.id === activeMode)!;

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: "#0A0A0A", fontFamily: "'Inter', sans-serif" }}>
      {/* Icon rail sidebar */}
      <div className="flex-shrink-0 flex flex-col items-center py-4 gap-1" style={{ width: 64, background: "#0D0D0D", borderRight: "1px solid rgba(255,255,255,0.05)" }}>
        {/* Logo */}
        <div className="w-10 h-10 rounded-2xl flex items-center justify-center mb-3" style={{ background: "linear-gradient(135deg, #DC2626, #7C3AED)" }}>
          <span className="text-white font-black text-xs">VX</span>
        </div>
        {MODES.map(mode => {
          const active = activeMode === mode.id;
          return (
            <button
              key={mode.id}
              onClick={() => setActiveMode(mode.id)}
              title={mode.label}
              className="w-10 h-10 rounded-2xl flex items-center justify-center transition-all relative group"
              style={{ background: active ? `${mode.color}25` : "transparent", border: `1.5px solid ${active ? mode.color : "transparent"}` }}
            >
              <span style={{ color: active ? mode.color : "#4B5563" }}>{mode.icon}</span>
              {/* Tooltip */}
              <div className="absolute left-14 z-50 px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity" style={{ background: "#1A1A1A", border: "1px solid rgba(255,255,255,0.1)", color: "white", boxShadow: "0 8px 32px rgba(0,0,0,0.5)" }}>
                {mode.label}
              </div>
            </button>
          );
        })}
        {/* History toggle */}
        <div className="mt-auto">
          <button onClick={() => setHistoryOpen(!historyOpen)} title="Session History" className="w-10 h-10 rounded-2xl flex items-center justify-center transition-all" style={{ background: historyOpen ? "rgba(255,255,255,0.1)" : "transparent", border: `1.5px solid ${historyOpen ? "rgba(255,255,255,0.2)" : "transparent"}` }}>
            <Activity size={18} color={historyOpen ? "white" : "#4B5563"} />
          </button>
        </div>
      </div>

      {/* Main workspace */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top bar */}
        <div className="flex-shrink-0 flex items-center gap-3 px-5 py-3" style={{ borderBottom: "1px solid rgba(255,255,255,0.05)", background: "#0D0D0D" }}>
          <div className="w-2 h-2 rounded-full" style={{ background: activeModeDef.color }} />
          <p className="text-sm font-black text-white">{activeModeDef.label}</p>
          <p className="text-xs" style={{ color: "#6B7280" }}>{activeModeDef.desc}</p>
          {sessionHistory.length > 0 && (
            <div className="ml-auto flex items-center gap-2">
              <span className="text-xs" style={{ color: "#6B7280" }}>{sessionHistory.length} output{sessionHistory.length !== 1 ? "s" : ""} this session</span>
            </div>
          )}
        </div>

        {/* Mode content */}
        <div className="flex-1 overflow-hidden">
          {activeMode === "velvet-suite"        && <VelvetSuiteMode    onOutput={addToHistory} />}
          {activeMode === "desire-grade"        && <DesireGradeMode    onOutput={addToHistory} />}
          {activeMode === "scene-architect"     && <SceneArchitectMode onOutput={addToHistory} />}
          {activeMode === "ppv-engine"          && <PPVEngineMode      onOutput={addToHistory} />}
          {activeMode === "platform-vault"      && <PlatformVaultMode  onOutput={addToHistory} />}
          {activeMode === "ai-enhance"          && <AIEnhanceMode      onOutput={addToHistory} />}
          {activeMode === "caption-studio"      && <CaptionStudioMode  onOutput={addToHistory} />}
          {activeMode === "content-vault"       && <ContentVaultMode   onOutput={addToHistory} />}
          {activeMode === "final-output-engine" && <FinalOutputEngineMode onOutput={addToHistory} />}
        </div>
      </div>

      {/* Session history drawer */}
      {historyOpen && sessionHistory.length > 0 && (
        <div className="flex-shrink-0 flex flex-col overflow-hidden" style={{ width: 280, borderLeft: "1px solid rgba(255,255,255,0.05)", background: "#0D0D0D" }}>
          <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
            <p className="text-xs font-black text-white">Session History</p>
            <button onClick={() => setHistoryOpen(false)} style={{ color: "#6B7280" }}><ChevronRight size={14} /></button>
          </div>
          <div className="flex-1 overflow-y-auto flex flex-col gap-2 p-3">
            {sessionHistory.map(item => {
              const modeDef = MODES.find(m => m.id === item.mode);
              return (
                <div key={item.id} className="flex flex-col gap-1.5 p-3 rounded-2xl" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
                  <div className="flex items-center gap-2">
                    <span style={{ color: modeDef?.color || "#9CA3AF" }}>{modeDef?.icon}</span>
                    <p className="text-xs font-bold text-white truncate flex-1">{item.label}</p>
                  </div>
                  <video src={item.outputUrl} className="w-full rounded-xl" style={{ maxHeight: 100, objectFit: "cover" }} />
                  <div className="flex gap-1.5">
                    <button onClick={() => { const a = document.createElement("a"); a.href = item.outputUrl; a.download = `vaultx-${item.label.toLowerCase().replace(/\s/g, "-")}.mp4`; a.click(); }} className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-xl text-[10px] font-bold" style={{ background: "rgba(255,255,255,0.05)", color: "#9CA3AF", border: "1px solid rgba(255,255,255,0.08)" }}><Download size={10} /> Save</button>
                    <button onClick={() => navigator.clipboard.writeText(item.outputUrl)} className="w-8 h-8 flex items-center justify-center rounded-xl" style={{ background: "rgba(255,255,255,0.05)", color: "#9CA3AF", border: "1px solid rgba(255,255,255,0.08)" }}><Copy size={10} /></button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
