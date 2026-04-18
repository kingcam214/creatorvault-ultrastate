/**
 * ============================================================================
 * VAULTX STUDIO v4 — ELITE ADULT CONTENT PRODUCTION SUITE
 * ============================================================================
 * Complete rebuild — adult-niche-first design, cinematic UI, no text boxes.
 *
 * Modes:
 *   1. VELVET SUITE      — Advanced skin smoothing + beauty enhancement
 *   2. DESIRE GRADE      — 22 adult-specific color grades + custom curves
 *   3. SCENE ARCHITECT   — Trim, cut, speed, audio, multi-operation editor
 *   4. PPV ENGINE        — Teaser clipper + blur censor + watermark branding
 *   5. PLATFORM VAULT    — OF / Fansly / ManyVids / Clips4Sale / Twitter export
 *   6. AI ENHANCE        — Runway/Kling slow motion + upscale + motion effects
 *   7. CAPTION STUDIO    — Burn-in captions + text overlays + title cards
 *   8. CONTENT VAULT     — Chunked upload + library management
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
 *   trpc.videoEnhance.slowMotion        { videoUrl, targetFps: "60"|"120"|"240" }
 *   trpc.videoEnhance.getJob            { predictionId }
 * ============================================================================
 */
import { useState, useRef, useCallback, useEffect } from "react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import {
  ChevronLeft, ChevronRight, Play, Pause, Download, Upload,
  Sparkles, Flame, Eye, Sun, Moon, Palette,
  Droplets, AudioWaveform, Volume2,
  FileVideo, HardDrive, Type, Scissors, Gauge, Activity,
  Lock, Shield, ShieldCheck, DollarSign, Loader2,
  Check, Copy, Timer, Zap, Stars,
  Layers2, Aperture, Contrast, BrainCircuit,
  MonitorPlay, Settings2, AlertCircle,
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
  | "content-vault";

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
  { id: "velvet-suite",    label: "Velvet Suite",    icon: <Sparkles size={18}/>,     desc: "AI skin smoothing & beauty enhancement",   color: "#EC4899", accent: "rgba(236,72,153,0.15)"  },
  { id: "desire-grade",    label: "Desire Grade",    icon: <Palette size={18}/>,      desc: "22 adult cinematic color grades",           color: "#F97316", accent: "rgba(249,115,22,0.15)"  },
  { id: "scene-architect", label: "Scene Architect", icon: <Scissors size={18}/>,     desc: "Trim, cut, speed, audio — full editor",     color: "#EAB308", accent: "rgba(234,179,8,0.15)"   },
  { id: "ppv-engine",      label: "PPV Engine",      icon: <Lock size={18}/>,         desc: "Teaser clipper + blur censor + watermark",  color: "#A855F7", accent: "rgba(168,85,247,0.15)"  },
  { id: "platform-vault",  label: "Platform Vault",  icon: <MonitorPlay size={18}/>,  desc: "Export for OF, Fansly, MV, Clips4Sale",    color: "#06B6D4", accent: "rgba(6,182,212,0.15)"   },
  { id: "ai-enhance",      label: "AI Enhance",      icon: <BrainCircuit size={18}/>, desc: "Runway slow motion + AI upscale",           color: "#22C55E", accent: "rgba(34,197,94,0.15)"   },
  { id: "caption-studio",  label: "Caption Studio",  icon: <Type size={18}/>,         desc: "Burn-in captions + text overlays",          color: "#60A5FA", accent: "rgba(96,165,250,0.15)"  },
  { id: "content-vault",   label: "Content Vault",   icon: <HardDrive size={18}/>,    desc: "Upload & organize your content library",    color: "#9333EA", accent: "rgba(147,51,234,0.15)"  },
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
      className="relative flex flex-col items-center justify-center gap-4 rounded-2xl cursor-pointer transition-all duration-200"
      style={{ padding: "40px 24px", border: `2px dashed ${dragging ? accent : "rgba(255,255,255,0.12)"}`, background: dragging ? `${accent}10` : "rgba(255,255,255,0.02)" }}
    >
      <div className="w-16 h-16 rounded-2xl flex items-center justify-center" style={{ background: `${accent}20`, border: `1px solid ${accent}40` }}>
        <Upload size={28} color={accent} />
      </div>
      <div className="text-center">
        <p className="text-white font-bold text-base">Drop your video here</p>
        <p className="text-sm mt-1" style={{ color: "#9CA3AF" }}>MP4, MOV, AVI, MKV, WebM — up to 4GB</p>
      </div>
      <div className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold" style={{ background: `${accent}20`, color: accent, border: `1px solid ${accent}30` }}>
        <FileVideo size={14} /> Browse Files
      </div>
      <input ref={inputRef} type="file" accept="video/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
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
      {label && <div className="absolute top-3 left-3 z-10 px-2.5 py-1 rounded-lg text-xs font-bold" style={{ background: "rgba(0,0,0,0.8)", color: accent, border: `1px solid ${accent}40` }}>{label}</div>}
      <video ref={videoRef} src={src} className="w-full" style={{ maxHeight: 360, objectFit: "contain" }} onEnded={() => setPlaying(false)} />
      <button onClick={toggle} className="absolute bottom-3 right-3 w-11 h-11 rounded-full flex items-center justify-center transition-all" style={{ background: `${accent}CC`, border: "1px solid rgba(255,255,255,0.2)" }}>
        {playing ? <Pause size={18} color="white" /> : <Play size={18} color="white" />}
      </button>
    </div>
  );
}

function OutputCard({ url, label, accent = "#DC2626", onUseAsInput, onDownload }: { url: string; label: string; accent?: string; onUseAsInput?: () => void; onDownload: () => void }) {
  const [copied, setCopied] = useState(false);
  const copy = () => { navigator.clipboard.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 2000); };
  return (
    <div className="rounded-2xl overflow-hidden" style={{ border: `1px solid ${accent}30`, background: "rgba(0,0,0,0.6)" }}>
      <VideoPlayer src={url} label={label} accent={accent} />
      <div className="flex items-center gap-2 p-4">
        <button onClick={onDownload} className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold transition-all" style={{ background: `${accent}20`, color: accent, border: `1px solid ${accent}30` }}>
          <Download size={16} /> Save to Device
        </button>
        <button onClick={copy} className="w-11 h-11 flex items-center justify-center rounded-xl transition-all" style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", color: "#9CA3AF" }}>
          {copied ? <Check size={16} color="#4ADE80" /> : <Copy size={16} />}
        </button>
        {onUseAsInput && (
          <button onClick={onUseAsInput} title="Use as input for next operation" className="w-11 h-11 flex items-center justify-center rounded-xl transition-all" style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", color: "#9CA3AF" }}>
            <Layers2 size={16} />
          </button>
        )}
      </div>
    </div>
  );
}

function ProcessingBar({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3 p-5 rounded-2xl" style={{ background: "rgba(220,38,38,0.08)", border: "1px solid rgba(220,38,38,0.2)" }}>
      <div className="w-8 h-8 rounded-full border-2 border-red-500 border-t-transparent animate-spin flex-shrink-0" />
      <p className="text-sm font-semibold text-white">{label}</p>
    </div>
  );
}

function SectionHeader({ icon, title, desc, color = "#DC2626" }: { icon: React.ReactNode; title: string; desc: string; color?: string }) {
  return (
    <div className="flex items-start gap-4 mb-6">
      <div className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0" style={{ background: `${color}20`, border: `1px solid ${color}40` }}>
        <span style={{ color }}>{icon}</span>
      </div>
      <div>
        <h2 className="text-white font-bold text-xl leading-tight">{title}</h2>
        <p className="text-sm mt-0.5" style={{ color: "#9CA3AF" }}>{desc}</p>
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

  return (
    <div className="flex flex-col gap-6">
      <SectionHeader icon={<Sparkles size={22}/>} title="Velvet Suite" desc="AI-grade skin smoothing and beauty enhancement" color="#EC4899" />
      <div>
        <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: "#6B7280" }}>Beauty Filters</p>
        <div className="grid grid-cols-2 gap-2.5">
          {BEAUTY_FILTERS.map((f) => {
            const active = selectedFilter === f.id;
            return (
              <button key={f.id} onClick={() => setSelectedFilter(f.id)} className="relative flex flex-col gap-1.5 p-3.5 rounded-2xl text-left transition-all" style={{ background: active ? `${f.color}18` : "rgba(255,255,255,0.03)", border: `1.5px solid ${active ? f.color : "rgba(255,255,255,0.07)"}` }}>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold" style={{ color: active ? f.color : "#E5E7EB" }}>{f.label}</span>
                  <span className="text-[9px] font-black px-1.5 py-0.5 rounded" style={{ background: `${f.color}25`, color: f.color }}>{f.badge}</span>
                </div>
                <p className="text-xs leading-tight" style={{ color: "#6B7280" }}>{f.desc}</p>
              </button>
            );
          })}
        </div>
      </div>
      <div className="p-4 rounded-2xl" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
        <div className="flex justify-between mb-3"><span className="text-sm font-bold text-white">Enhancement Intensity</span><span className="text-sm font-bold" style={{ color: "#EC4899" }}>{intensity}%</span></div>
        <input type="range" min={10} max={100} step={5} value={intensity} onChange={(e) => setIntensity(parseInt(e.target.value))} className="w-full" style={{ accentColor: "#EC4899" }} />
        <div className="flex justify-between mt-1.5"><span className="text-xs" style={{ color: "#6B7280" }}>Subtle</span><span className="text-xs" style={{ color: "#6B7280" }}>Maximum</span></div>
      </div>
      {!videoFile ? <VideoDropZone onFile={setVideoFile} accent="#EC4899" /> : <VideoPlayer src={videoFile.url} label="Source" accent="#EC4899" />}
      <button onClick={process} disabled={!videoFile || isProcessing} className="w-full py-4 rounded-2xl font-black text-white text-base transition-all flex items-center justify-center gap-2" style={{ background: !videoFile || isProcessing ? "rgba(236,72,153,0.3)" : "linear-gradient(135deg, #EC4899, #BE185D)", cursor: !videoFile || isProcessing ? "not-allowed" : "pointer", boxShadow: !videoFile || isProcessing ? "none" : "0 0 30px rgba(236,72,153,0.3)" }}>
        {isProcessing ? <><Loader2 size={20} className="animate-spin" /> Enhancing...</> : <><Sparkles size={20} /> Apply Beauty Enhancement</>}
      </button>
      {isProcessing && <ProcessingBar label="Applying beauty enhancement..." />}
      {outputUrl && <OutputCard url={outputUrl} label="Beauty Enhanced" accent="#EC4899" onDownload={() => { const a = document.createElement("a"); a.href = outputUrl; a.download = `vaultx-beauty-${selectedFilter}.mp4`; a.click(); }} onUseAsInput={async () => { try { const vf = await fetchVideoAsFile(outputUrl, "beauty-output.mp4"); setVideoFile(vf); setOutputUrl(null); toast.success("Output loaded — apply another enhancement"); } catch { toast.error("Failed to load output"); } }} />}
    </div>
  );
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

  return (
    <div className="flex flex-col gap-6">
      <SectionHeader icon={<Palette size={22}/>} title="Desire Grade" desc="22 adult-specific cinematic color grades" color="#F97316" />
      <div className="flex gap-2 overflow-x-auto pb-1">
        {GRADE_CATEGORIES.map(cat => (
          <button key={cat} onClick={() => setActiveCategory(cat)} className="flex-shrink-0 px-4 py-2 rounded-xl text-xs font-bold transition-all" style={{ background: activeCategory === cat ? "rgba(249,115,22,0.2)" : "rgba(255,255,255,0.04)", border: `1.5px solid ${activeCategory === cat ? "#F97316" : "rgba(255,255,255,0.08)"}`, color: activeCategory === cat ? "#F97316" : "#9CA3AF" }}>
            {cat}
          </button>
        ))}
      </div>
      <div className="flex flex-col gap-2">
        {filteredGrades.map((g) => {
          const active = selectedGrade === g.id;
          return (
            <button key={g.id} onClick={() => setSelectedGrade(g.id)} className="flex items-center gap-4 p-4 rounded-2xl text-left transition-all" style={{ background: active ? `${g.color}15` : "rgba(255,255,255,0.03)", border: `1.5px solid ${active ? g.color : "rgba(255,255,255,0.07)"}` }}>
              <div className="text-2xl flex-shrink-0">{g.icon}</div>
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
        <div className="flex justify-between mb-3"><span className="text-sm font-bold text-white">Grade Intensity</span><span className="text-sm font-bold" style={{ color: selectedGradeData?.color || "#F97316" }}>{intensity}%</span></div>
        <input type="range" min={10} max={100} step={5} value={intensity} onChange={(e) => setIntensity(parseInt(e.target.value))} className="w-full" style={{ accentColor: selectedGradeData?.color || "#F97316" }} />
      </div>
      {!videoFile ? <VideoDropZone onFile={setVideoFile} accent="#F97316" /> : <VideoPlayer src={videoFile.url} label="Source" accent="#F97316" />}
      <button onClick={process} disabled={!videoFile || isProcessing} className="w-full py-4 rounded-2xl font-black text-white text-base transition-all flex items-center justify-center gap-2" style={{ background: !videoFile || isProcessing ? "rgba(249,115,22,0.3)" : `linear-gradient(135deg, ${selectedGradeData?.color || "#F97316"}, #C2410C)`, cursor: !videoFile || isProcessing ? "not-allowed" : "pointer", boxShadow: !videoFile || isProcessing ? "none" : `0 0 30px ${selectedGradeData?.color || "#F97316"}40` }}>
        {isProcessing ? <><Loader2 size={20} className="animate-spin" /> Grading...</> : <><Palette size={20} /> Apply {selectedGradeData?.label || "Grade"}</>}
      </button>
      {isProcessing && <ProcessingBar label={`Applying ${selectedGradeData?.label || "grade"}...`} />}
      {outputUrl && <OutputCard url={outputUrl} label={selectedGradeData?.label || selectedGrade} accent={selectedGradeData?.color || "#F97316"} onDownload={() => { const a = document.createElement("a"); a.href = outputUrl; a.download = `vaultx-grade-${selectedGrade}.mp4`; a.click(); }} onUseAsInput={async () => { try { const vf = await fetchVideoAsFile(outputUrl, "grade-output.mp4"); setVideoFile(vf); setOutputUrl(null); toast.success("Output loaded — apply another grade"); } catch { toast.error("Failed to load output"); } }} />}
    </div>
  );
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

  const COLOR_LOOKS = [
    { id: "none", label: "Original" }, { id: "cinematic", label: "Cinematic" },
    { id: "vintage", label: "Vintage" }, { id: "neon_nights", label: "Neon Nights" },
    { id: "golden_hour", label: "Golden Hour" }, { id: "cold_blue", label: "Cold Blue" },
    { id: "bw_classic", label: "B&W Classic" }, { id: "kodak", label: "Kodak" },
    { id: "fuji", label: "Fuji" }, { id: "club_dark", label: "Club Dark" },
  ];

  const OPS = [
    { id: "trim" as const,    label: "Trim",    icon: <Scissors size={15}/> },
    { id: "color" as const,   label: "Color",   icon: <Palette size={15}/> },
    { id: "audio" as const,   label: "Audio",   icon: <AudioWaveform size={15}/> },
    { id: "speed" as const,   label: "Speed",   icon: <Gauge size={15}/> },
    { id: "sharpen" as const, label: "Sharpen", icon: <Contrast size={15}/> },
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

  return (
    <div className="flex flex-col gap-6">
      <SectionHeader icon={<Scissors size={22}/>} title="Scene Architect" desc="Trim, cut, color grade, audio, speed — full editor" color="#EAB308" />
      <div className="flex gap-2 overflow-x-auto pb-1">
        {OPS.map(op => (
          <button key={op.id} onClick={() => setActiveOp(op.id)} className="flex items-center gap-2 flex-shrink-0 px-4 py-2.5 rounded-xl text-sm font-bold transition-all" style={{ background: activeOp === op.id ? "rgba(234,179,8,0.2)" : "rgba(255,255,255,0.04)", border: `1.5px solid ${activeOp === op.id ? "#EAB308" : "rgba(255,255,255,0.08)"}`, color: activeOp === op.id ? "#EAB308" : "#9CA3AF" }}>
            {op.icon} {op.label}
          </button>
        ))}
      </div>
      {!videoFile ? <VideoDropZone onFile={setVideoFile} accent="#EAB308" /> : <VideoPlayer src={videoFile.url} label="Source" accent="#EAB308" />}
      <div className="p-5 rounded-2xl" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
        {activeOp === "trim" && (
          <div className="flex flex-col gap-4">
            <p className="text-sm font-bold text-white">Trim Range (seconds)</p>
            {[{ label: "Start (s)", value: trimStart, setter: setTrimStart }, { label: "End (s)", value: trimEnd, setter: setTrimEnd }].map(({ label, value, setter }) => (
              <div key={label}>
                <div className="flex justify-between mb-2"><label className="text-xs font-semibold" style={{ color: "#9CA3AF" }}>{label}</label><span className="text-xs font-bold" style={{ color: "#EAB308" }}>{value}s</span></div>
                <input type="range" min={0} max={videoFile?.duration || 300} step={1} value={value} onChange={(e) => setter(parseInt(e.target.value))} className="w-full" style={{ accentColor: "#EAB308" }} />
              </div>
            ))}
            <p className="text-xs" style={{ color: "#6B7280" }}>Duration: {trimEnd - trimStart}s</p>
            <button onClick={() => process("trim")} disabled={!videoFile || isProcessing} className="w-full py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all" style={{ background: !videoFile || isProcessing ? "rgba(234,179,8,0.2)" : "linear-gradient(135deg, #EAB308, #A16207)", color: "white", cursor: !videoFile || isProcessing ? "not-allowed" : "pointer" }}>
              {isProcessing ? <><Loader2 size={16} className="animate-spin" /> Trimming...</> : <><Scissors size={16} /> Trim Video</>}
            </button>
          </div>
        )}
        {activeOp === "color" && (
          <div className="flex flex-col gap-4">
            <p className="text-sm font-bold text-white">Color Grade</p>
            <div className="grid grid-cols-2 gap-2">
              {COLOR_LOOKS.map(l => (
                <button key={l.id} onClick={() => setColorLook(l.id)} className="py-2 px-3 rounded-xl text-xs font-semibold transition-all" style={{ background: colorLook === l.id ? "rgba(234,179,8,0.2)" : "rgba(255,255,255,0.04)", border: `1px solid ${colorLook === l.id ? "#EAB308" : "rgba(255,255,255,0.08)"}`, color: colorLook === l.id ? "#EAB308" : "#9CA3AF" }}>{l.label}</button>
              ))}
            </div>
            {[{ label: "Brightness", value: brightness, setter: setBrightness }, { label: "Contrast", value: contrast, setter: setContrast }, { label: "Saturation", value: saturation, setter: setSaturation }].map(({ label, value, setter }) => (
              <div key={label}>
                <div className="flex justify-between mb-1.5"><label className="text-xs font-semibold" style={{ color: "#9CA3AF" }}>{label}</label><span className="text-xs font-bold" style={{ color: "#EAB308" }}>{value}</span></div>
                <input type="range" min={0} max={100} step={1} value={value} onChange={(e) => setter(parseInt(e.target.value))} className="w-full" style={{ accentColor: "#EAB308" }} />
              </div>
            ))}
            <button onClick={() => process("color-grade")} disabled={!videoFile || isProcessing} className="w-full py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all" style={{ background: !videoFile || isProcessing ? "rgba(234,179,8,0.2)" : "linear-gradient(135deg, #EAB308, #A16207)", color: "white", cursor: !videoFile || isProcessing ? "not-allowed" : "pointer" }}>
              {isProcessing ? <><Loader2 size={16} className="animate-spin" /> Grading...</> : <><Palette size={16} /> Apply Color Grade</>}
            </button>
          </div>
        )}
        {activeOp === "audio" && (
          <div className="flex flex-col gap-4">
            <p className="text-sm font-bold text-white">Audio Controls</p>
            {[{ label: "Volume (0–300%)", value: volume, setter: setVolume, min: 0, max: 300 }, { label: "Fade In (s)", value: fadeIn, setter: setFadeIn, min: 0, max: 10 }, { label: "Fade Out (s)", value: fadeOut, setter: setFadeOut, min: 0, max: 10 }].map(({ label, value, setter, min, max }) => (
              <div key={label}>
                <div className="flex justify-between mb-1.5"><label className="text-xs font-semibold" style={{ color: "#9CA3AF" }}>{label}</label><span className="text-xs font-bold" style={{ color: "#EAB308" }}>{value}</span></div>
                <input type="range" min={min} max={max} step={1} value={value} onChange={(e) => setter(parseInt(e.target.value))} className="w-full" style={{ accentColor: "#EAB308" }} />
              </div>
            ))}
            <button onClick={() => process("audio")} disabled={!videoFile || isProcessing} className="w-full py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all" style={{ background: !videoFile || isProcessing ? "rgba(234,179,8,0.2)" : "linear-gradient(135deg, #EAB308, #A16207)", color: "white", cursor: !videoFile || isProcessing ? "not-allowed" : "pointer" }}>
              {isProcessing ? <><Loader2 size={16} className="animate-spin" /> Processing...</> : <><Volume2 size={16} /> Apply Audio</>}
            </button>
          </div>
        )}
        {activeOp === "speed" && (
          <div className="flex flex-col gap-4">
            <p className="text-sm font-bold text-white">Speed Control</p>
            <div className="grid grid-cols-4 gap-2">
              {[0.25, 0.5, 0.75, 1.0, 1.25, 1.5, 2.0, 4.0].map(s => (
                <button key={s} onClick={() => setSpeed(s)} className="py-2.5 rounded-xl text-xs font-bold transition-all" style={{ background: speed === s ? "rgba(234,179,8,0.2)" : "rgba(255,255,255,0.04)", border: `1px solid ${speed === s ? "#EAB308" : "rgba(255,255,255,0.08)"}`, color: speed === s ? "#EAB308" : "#9CA3AF" }}>{s}×</button>
              ))}
            </div>
            <p className="text-xs" style={{ color: "#6B7280" }}>{speed < 1 ? "Slow motion" : speed > 1 ? "Speed up" : "Normal speed"} — {speed}×</p>
            <button onClick={() => process("speed")} disabled={!videoFile || isProcessing} className="w-full py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all" style={{ background: !videoFile || isProcessing ? "rgba(234,179,8,0.2)" : "linear-gradient(135deg, #EAB308, #A16207)", color: "white", cursor: !videoFile || isProcessing ? "not-allowed" : "pointer" }}>
              {isProcessing ? <><Loader2 size={16} className="animate-spin" /> Processing...</> : <><Gauge size={16} /> Apply Speed</>}
            </button>
          </div>
        )}
        {activeOp === "sharpen" && (
          <div className="flex flex-col gap-4">
            <p className="text-sm font-bold text-white">Sharpen / Enhance Detail</p>
            <div className="flex justify-between mb-1"><span className="text-xs font-semibold" style={{ color: "#9CA3AF" }}>Sharpen Amount</span><span className="text-xs font-bold" style={{ color: "#EAB308" }}>{sharpenIntensity}%</span></div>
            <input type="range" min={10} max={100} step={5} value={sharpenIntensity} onChange={(e) => setSharpenIntensity(parseInt(e.target.value))} className="w-full" style={{ accentColor: "#EAB308" }} />
            <button onClick={() => process("filter")} disabled={!videoFile || isProcessing} className="w-full py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all" style={{ background: !videoFile || isProcessing ? "rgba(234,179,8,0.2)" : "linear-gradient(135deg, #EAB308, #A16207)", color: "white", cursor: !videoFile || isProcessing ? "not-allowed" : "pointer" }}>
              {isProcessing ? <><Loader2 size={16} className="animate-spin" /> Sharpening...</> : <><Contrast size={16} /> Sharpen Video</>}
            </button>
          </div>
        )}
      </div>
      {isProcessing && <ProcessingBar label="Processing video..." />}
      {outputUrl && <OutputCard url={outputUrl} label="Edited" accent="#EAB308" onDownload={() => { const a = document.createElement("a"); a.href = outputUrl; a.download = `vaultx-edit-${activeOp}.mp4`; a.click(); }} onUseAsInput={async () => { try { const vf = await fetchVideoAsFile(outputUrl, "edit-output.mp4"); setVideoFile(vf); setOutputUrl(null); toast.success("Output loaded — apply another operation"); } catch { toast.error("Failed to load output"); } }} />}
    </div>
  );
}

// ============================================================================
// MODE: PPV ENGINE
// ============================================================================
function PPVEngineMode({ onOutput }: { onOutput: (url: string, label: string) => void }) {
  const [videoFile, setVideoFile] = useState<VideoFile | null>(null);
  const [activeOp, setActiveOp] = useState<"teaser" | "censor" | "watermark">("teaser");
  const [previewDuration, setPreviewDuration] = useState(15);
  const [censorIntensity, setCensorIntensity] = useState(70);
  const [watermarkText, setWatermarkText] = useState("@YourHandle");
  const [watermarkPosition, setWatermarkPosition] = useState("bottom_right");
  const [watermarkOpacity, setWatermarkOpacity] = useState(70);
  const [outputUrl, setOutputUrl] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const processTeaser = async () => {
    if (!videoFile) return toast.error("Upload a video first.");
    setIsProcessing(true); setOutputUrl(null);
    try {
      const fd = new FormData();
      fd.append("video", videoFile.file);
      fd.append("start", "0");
      fd.append("end", String(previewDuration));
      const result = await callVideoStudio("trim", fd);
      setOutputUrl(result.url);
      onOutput(result.url, `PPV Teaser — ${previewDuration}s`);
      toast.success("PPV teaser created.");
    } catch (e: any) { toast.error(e.message); }
    finally { setIsProcessing(false); }
  };

  const processCensor = async () => {
    if (!videoFile) return toast.error("Upload a video first.");
    setIsProcessing(true); setOutputUrl(null);
    try {
      const fd = new FormData();
      fd.append("video", videoFile.file);
      fd.append("filter", "ppv_censor");
      fd.append("intensity", String(censorIntensity / 100));
      const result = await callVideoStudio("filter", fd);
      setOutputUrl(result.url);
      onOutput(result.url, "Censored Preview");
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
      fd.append("video", videoFile.file);
      fd.append("mode", "text");
      fd.append("text", watermarkText);
      fd.append("position", watermarkPosition);
      fd.append("opacity", String(watermarkOpacity));
      fd.append("size", "28");
      fd.append("color", "FFFFFF");
      const result = await callVideoStudio("watermark", fd);
      setOutputUrl(result.url);
      onOutput(result.url, `Watermarked — ${watermarkText}`);
      toast.success("Watermark applied.");
    } catch (e: any) { toast.error(e.message); }
    finally { setIsProcessing(false); }
  };

  const OPS = [
    { id: "teaser" as const,    label: "Teaser Clip", icon: <Scissors size={15}/> },
    { id: "censor" as const,    label: "Blur Censor", icon: <Eye size={15}/> },
    { id: "watermark" as const, label: "Watermark",   icon: <Shield size={15}/> },
  ];

  return (
    <div className="flex flex-col gap-6">
      <SectionHeader icon={<Lock size={22}/>} title="PPV Engine" desc="Teaser clipper, blur censor, and watermark branding" color="#A855F7" />
      <div className="flex items-start gap-3 p-4 rounded-2xl" style={{ background: "rgba(168,85,247,0.1)", border: "1px solid rgba(168,85,247,0.2)" }}>
        <DollarSign size={18} color="#A855F7" className="flex-shrink-0 mt-0.5" />
        <p className="text-sm" style={{ color: "#C4B5FD" }}>Create professional PPV previews. Clip a teaser, blur the full content, or watermark with your handle to prevent unauthorized sharing before purchase.</p>
      </div>
      <div className="flex gap-2">
        {OPS.map(op => (
          <button key={op.id} onClick={() => setActiveOp(op.id)} className="flex items-center gap-2 flex-1 justify-center py-2.5 rounded-xl text-sm font-bold transition-all" style={{ background: activeOp === op.id ? "rgba(168,85,247,0.2)" : "rgba(255,255,255,0.04)", border: `1.5px solid ${activeOp === op.id ? "#A855F7" : "rgba(255,255,255,0.08)"}`, color: activeOp === op.id ? "#A855F7" : "#9CA3AF" }}>
            {op.icon} {op.label}
          </button>
        ))}
      </div>
      {!videoFile ? <VideoDropZone onFile={setVideoFile} accent="#A855F7" /> : <VideoPlayer src={videoFile.url} label="Full Content" accent="#A855F7" />}
      <div className="p-5 rounded-2xl" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
        {activeOp === "teaser" && (
          <div className="flex flex-col gap-4">
            <p className="text-sm font-bold text-white">Preview Duration</p>
            <div className="grid grid-cols-5 gap-2">
              {[10, 15, 20, 30, 45].map(d => (
                <button key={d} onClick={() => setPreviewDuration(d)} className="py-2.5 rounded-xl text-xs font-bold transition-all" style={{ background: previewDuration === d ? "rgba(168,85,247,0.3)" : "rgba(255,255,255,0.04)", border: `1px solid ${previewDuration === d ? "#A855F7" : "rgba(255,255,255,0.08)"}`, color: previewDuration === d ? "#C4B5FD" : "#9CA3AF" }}>{d}s</button>
              ))}
            </div>
            <button onClick={processTeaser} disabled={!videoFile || isProcessing} className="w-full py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all" style={{ background: !videoFile || isProcessing ? "rgba(168,85,247,0.2)" : "linear-gradient(135deg, #A855F7, #7C3AED)", color: "white", cursor: !videoFile || isProcessing ? "not-allowed" : "pointer" }}>
              {isProcessing ? <><Loader2 size={16} className="animate-spin" /> Clipping...</> : <><Scissors size={16} /> Create {previewDuration}s Teaser</>}
            </button>
          </div>
        )}
        {activeOp === "censor" && (
          <div className="flex flex-col gap-4">
            <p className="text-sm font-bold text-white">Blur Intensity</p>
            <div className="flex justify-between mb-1"><span className="text-xs" style={{ color: "#9CA3AF" }}>Censor Strength</span><span className="text-xs font-bold" style={{ color: "#A855F7" }}>{censorIntensity}%</span></div>
            <input type="range" min={20} max={100} step={5} value={censorIntensity} onChange={(e) => setCensorIntensity(parseInt(e.target.value))} className="w-full" style={{ accentColor: "#A855F7" }} />
            <div className="grid grid-cols-3 gap-2">
              {[{ label: "Light", val: 30 }, { label: "Standard", val: 60 }, { label: "Maximum", val: 100 }].map(p => (
                <button key={p.label} onClick={() => setCensorIntensity(p.val)} className="py-2 rounded-xl text-xs font-bold transition-all" style={{ background: censorIntensity === p.val ? "rgba(168,85,247,0.2)" : "rgba(255,255,255,0.04)", border: `1px solid ${censorIntensity === p.val ? "#A855F7" : "rgba(255,255,255,0.08)"}`, color: censorIntensity === p.val ? "#C4B5FD" : "#9CA3AF" }}>{p.label}</button>
              ))}
            </div>
            <button onClick={processCensor} disabled={!videoFile || isProcessing} className="w-full py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all" style={{ background: !videoFile || isProcessing ? "rgba(168,85,247,0.2)" : "linear-gradient(135deg, #A855F7, #7C3AED)", color: "white", cursor: !videoFile || isProcessing ? "not-allowed" : "pointer" }}>
              {isProcessing ? <><Loader2 size={16} className="animate-spin" /> Censoring...</> : <><Eye size={16} /> Apply Blur Censor</>}
            </button>
          </div>
        )}
        {activeOp === "watermark" && (
          <div className="flex flex-col gap-4">
            <p className="text-sm font-bold text-white">Watermark Settings</p>
            <div>
              <label className="text-xs font-semibold mb-2 block" style={{ color: "#9CA3AF" }}>Your Handle / Brand</label>
              <input value={watermarkText} onChange={(e) => setWatermarkText(e.target.value)} placeholder="@YourHandle" className="w-full px-4 py-3 rounded-xl text-sm text-white" style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }} />
            </div>
            <div>
              <label className="text-xs font-semibold mb-2 block" style={{ color: "#9CA3AF" }}>Position</label>
              <div className="grid grid-cols-3 gap-2">
                {[{ id: "top_left", label: "↖ Top Left" }, { id: "top_center", label: "↑ Top" }, { id: "top_right", label: "↗ Top Right" }, { id: "bottom_left", label: "↙ Bot Left" }, { id: "bottom_center", label: "↓ Bottom" }, { id: "bottom_right", label: "↘ Bot Right" }].map(p => (
                  <button key={p.id} onClick={() => setWatermarkPosition(p.id)} className="py-2 rounded-xl text-xs font-semibold transition-all" style={{ background: watermarkPosition === p.id ? "rgba(168,85,247,0.2)" : "rgba(255,255,255,0.04)", border: `1px solid ${watermarkPosition === p.id ? "#A855F7" : "rgba(255,255,255,0.08)"}`, color: watermarkPosition === p.id ? "#C4B5FD" : "#9CA3AF" }}>{p.label}</button>
                ))}
              </div>
            </div>
            <div>
              <div className="flex justify-between mb-1"><label className="text-xs font-semibold" style={{ color: "#9CA3AF" }}>Opacity</label><span className="text-xs font-bold" style={{ color: "#A855F7" }}>{watermarkOpacity}%</span></div>
              <input type="range" min={20} max={100} step={5} value={watermarkOpacity} onChange={(e) => setWatermarkOpacity(parseInt(e.target.value))} className="w-full" style={{ accentColor: "#A855F7" }} />
            </div>
            <button onClick={processWatermark} disabled={!videoFile || isProcessing} className="w-full py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all" style={{ background: !videoFile || isProcessing ? "rgba(168,85,247,0.2)" : "linear-gradient(135deg, #A855F7, #7C3AED)", color: "white", cursor: !videoFile || isProcessing ? "not-allowed" : "pointer" }}>
              {isProcessing ? <><Loader2 size={16} className="animate-spin" /> Watermarking...</> : <><Shield size={16} /> Apply Watermark</>}
            </button>
          </div>
        )}
      </div>
      {isProcessing && <ProcessingBar label="Processing PPV content..." />}
      {outputUrl && <OutputCard url={outputUrl} label={activeOp === "teaser" ? `PPV Teaser — ${previewDuration}s` : activeOp === "censor" ? "Censored Preview" : `Watermarked — ${watermarkText}`} accent="#A855F7" onDownload={() => { const a = document.createElement("a"); a.href = outputUrl; a.download = `vaultx-ppv-${activeOp}.mp4`; a.click(); }} onUseAsInput={async () => { try { const vf = await fetchVideoAsFile(outputUrl, "ppv-output.mp4"); setVideoFile(vf); setOutputUrl(null); toast.success("Output loaded"); } catch { toast.error("Failed to load output"); } }} />}
    </div>
  );
}

// ============================================================================
// MODE: PLATFORM VAULT
// ============================================================================
function PlatformVaultMode({ onOutput }: { onOutput: (url: string, label: string) => void }) {
  const [videoFile, setVideoFile] = useState<VideoFile | null>(null);
  const [exportMode, setExportMode] = useState<"dual" | "manual">("dual");
  const [selectedPlatforms, setSelectedPlatforms] = useState<Set<string>>(new Set(["onlyfans"]));
  const [outputs, setOutputs] = useState<{ label: string; url: string; platform: string; type: string }[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingLabel, setProcessingLabel] = useState<string | null>(null);

  const togglePlatform = (id: string) => setSelectedPlatforms(s => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });

  const processDual = async () => {
    if (!videoFile) return toast.error("Upload a video first.");
    setIsProcessing(true); setOutputs([]);
    try {
      setProcessingLabel("Creating SFW Teaser (trimming to 15s)...");
      const trimFd = new FormData();
      trimFd.append("video", videoFile.file); trimFd.append("start", "0"); trimFd.append("end", "15");
      const trimResult = await callVideoStudio("trim", trimFd);
      setProcessingLabel("Converting SFW Teaser to 720p...");
      const sfwBlob = await fetch(trimResult.url).then(r => r.blob());
      const sfwFile = new File([sfwBlob], "sfw_teaser.mp4", { type: "video/mp4" });
      const sfwFd = new FormData();
      sfwFd.append("video", sfwFile); sfwFd.append("format", "mp4_h264"); sfwFd.append("resolution", "720p");
      const sfwResult = await callVideoStudio("convert", sfwFd);
      setOutputs(prev => [...prev, { label: "SFW Teaser (15s, 720p)", url: sfwResult.url, platform: "Instagram · TikTok · Twitter/X · Telegram", type: "sfw" }]);
      onOutput(sfwResult.url, "SFW Teaser (15s, 720p)"); toast.success("SFW Teaser ready!");
      setProcessingLabel("Converting Adult Full to 1080p...");
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

  return (
    <div className="flex flex-col gap-6">
      <SectionHeader icon={<MonitorPlay size={22}/>} title="Platform Vault" desc="Export for OnlyFans, Fansly, ManyVids, Clips4Sale, and more" color="#06B6D4" />
      <div className="grid grid-cols-2 gap-3">
        {[{ id: "dual", label: "Dual Export", desc: "SFW teaser + Adult full in one run" }, { id: "manual", label: "Manual Select", desc: "Pick specific platforms" }].map(m => (
          <button key={m.id} onClick={() => setExportMode(m.id as any)} className="p-4 rounded-2xl text-left transition-all" style={{ background: exportMode === m.id ? "rgba(6,182,212,0.15)" : "rgba(255,255,255,0.03)", border: `1.5px solid ${exportMode === m.id ? "#06B6D4" : "rgba(255,255,255,0.08)"}` }}>
            <p className="text-sm font-bold" style={{ color: exportMode === m.id ? "#06B6D4" : "#E5E7EB" }}>{m.label}</p>
            <p className="text-xs mt-1" style={{ color: "#6B7280" }}>{m.desc}</p>
          </button>
        ))}
      </div>
      {!videoFile ? <VideoDropZone onFile={setVideoFile} accent="#06B6D4" /> : <VideoPlayer src={videoFile.url} label="Source" accent="#06B6D4" />}
      {exportMode === "manual" && (
        <div className="flex flex-col gap-3">
          <p className="text-xs font-bold uppercase tracking-widest" style={{ color: "#6B7280" }}>Adult Platforms</p>
          <div className="grid grid-cols-2 gap-2">
            {EXPORT_PLATFORMS.filter(p => p.type === "adult").map(p => (
              <button key={p.id} onClick={() => togglePlatform(p.id)} className="flex items-center gap-3 p-3.5 rounded-2xl text-left transition-all" style={{ background: selectedPlatforms.has(p.id) ? "rgba(6,182,212,0.15)" : "rgba(255,255,255,0.03)", border: `1.5px solid ${selectedPlatforms.has(p.id) ? "#06B6D4" : "rgba(255,255,255,0.08)"}` }}>
                <span className="text-xl">{p.icon}</span>
                <div className="flex-1 min-w-0"><p className="text-sm font-bold" style={{ color: selectedPlatforms.has(p.id) ? "#06B6D4" : "#E5E7EB" }}>{p.name}</p><p className="text-xs truncate" style={{ color: "#6B7280" }}>{p.note}</p></div>
                {selectedPlatforms.has(p.id) && <Check size={14} color="#06B6D4" />}
              </button>
            ))}
          </div>
          <p className="text-xs font-bold uppercase tracking-widest mt-2" style={{ color: "#6B7280" }}>SFW / Social Teaser</p>
          <div className="grid grid-cols-2 gap-2">
            {EXPORT_PLATFORMS.filter(p => p.type === "sfw").map(p => (
              <button key={p.id} onClick={() => togglePlatform(p.id)} className="flex items-center gap-3 p-3.5 rounded-2xl text-left transition-all" style={{ background: selectedPlatforms.has(p.id) ? "rgba(6,182,212,0.15)" : "rgba(255,255,255,0.03)", border: `1.5px solid ${selectedPlatforms.has(p.id) ? "#06B6D4" : "rgba(255,255,255,0.08)"}` }}>
                <span className="text-xl">{p.icon}</span>
                <div className="flex-1 min-w-0"><p className="text-sm font-bold" style={{ color: selectedPlatforms.has(p.id) ? "#06B6D4" : "#E5E7EB" }}>{p.name}</p><p className="text-xs truncate" style={{ color: "#6B7280" }}>{p.note}</p></div>
                {selectedPlatforms.has(p.id) && <Check size={14} color="#06B6D4" />}
              </button>
            ))}
          </div>
        </div>
      )}
      {exportMode === "dual" && (
        <div className="flex flex-col gap-3 p-4 rounded-2xl" style={{ background: "rgba(6,182,212,0.08)", border: "1px solid rgba(6,182,212,0.2)" }}>
          <p className="text-sm font-bold text-white">What Dual Export Creates:</p>
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-3"><span className="text-lg">✅</span><div><p className="text-sm font-semibold text-white">SFW Teaser — 15s, 720p</p><p className="text-xs" style={{ color: "#9CA3AF" }}>Instagram · TikTok · Twitter/X · Telegram</p></div></div>
            <div className="flex items-center gap-3"><span className="text-lg">🔞</span><div><p className="text-sm font-semibold text-white">Adult Full — 1080p</p><p className="text-xs" style={{ color: "#9CA3AF" }}>OnlyFans · Fansly · ManyVids</p></div></div>
          </div>
        </div>
      )}
      <button onClick={exportMode === "dual" ? processDual : processManual} disabled={!videoFile || isProcessing} className="w-full py-4 rounded-2xl font-black text-white text-base transition-all flex items-center justify-center gap-2" style={{ background: !videoFile || isProcessing ? "rgba(6,182,212,0.3)" : "linear-gradient(135deg, #06B6D4, #0E7490)", cursor: !videoFile || isProcessing ? "not-allowed" : "pointer", boxShadow: !videoFile || isProcessing ? "none" : "0 0 30px rgba(6,182,212,0.3)" }}>
        {isProcessing ? <><Loader2 size={20} className="animate-spin" /> {processingLabel || "Exporting..."}</> : <><MonitorPlay size={20} /> {exportMode === "dual" ? "Dual Export" : `Export to ${selectedPlatforms.size} Platform${selectedPlatforms.size !== 1 ? "s" : ""}`}</>}
      </button>
      {isProcessing && processingLabel && <ProcessingBar label={processingLabel} />}
      {outputs.length > 0 && (
        <div className="flex flex-col gap-4">
          <p className="text-xs font-bold uppercase tracking-widest" style={{ color: "#6B7280" }}>Export Results ({outputs.length})</p>
          {outputs.map((out, i) => (
            <OutputCard key={i} url={out.url} label={out.label} accent={out.type === "adult" ? "#DC2626" : "#06B6D4"} onDownload={() => { const a = document.createElement("a"); a.href = out.url; a.download = `vaultx-${out.platform.toLowerCase().replace(/\s/g, "-")}.mp4`; a.click(); }} />
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// MODE: AI ENHANCE
// ============================================================================
function AIEnhanceMode({ onOutput }: { onOutput: (url: string, label: string) => void }) {
  const [videoFile, setVideoFile] = useState<VideoFile | null>(null);
  const [activeOp, setActiveOp] = useState<"slowmo" | "upscale" | "denoise">("slowmo");
  const [selectedFps, setSelectedFps] = useState<"60" | "120" | "240">("60");
  const [predictionId, setPredictionId] = useState<string | null>(null);
  const [outputUrl, setOutputUrl] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [denoiseIntensity, setDenoiseIntensity] = useState(60);

  const slowMotionMut = trpc.videoEnhance.slowMotion.useMutation({
    onSuccess: (data: any) => { setPredictionId(data.predictionId); toast.success("AI slow motion started — processing in background..."); },
    onError: (e: any) => { toast.error(e.message); setIsProcessing(false); },
  });

  const jobQuery = trpc.videoEnhance.getJob.useQuery(
    { predictionId: predictionId! },
    { enabled: !!predictionId, refetchInterval: (data: any) => data?.isComplete ? false : 3000 }
  );

  useEffect(() => {
    const d = jobQuery.data as any;
    if (d?.isComplete && d?.outputUrl) {
      setOutputUrl(d.outputUrl);
      onOutput(d.outputUrl, `Slow Motion ${selectedFps === "60" ? "2×" : selectedFps === "120" ? "4×" : "8×"}`);
      setIsProcessing(false); setPredictionId(null);
      toast.success("AI slow motion complete!");
    }
  }, [jobQuery.data]);

  const processSlowMo = async () => {
    if (!videoFile) return toast.error("Upload a video first.");
    setIsProcessing(true); setOutputUrl(null);
    const fd = new FormData();
    fd.append("video", videoFile.file); fd.append("start", "0"); fd.append("end", "30");
    try {
      const trimResult = await callVideoStudio("trim", fd);
      slowMotionMut.mutate({ videoUrl: trimResult.url, targetFps: selectedFps });
    } catch (e: any) { toast.error(e.message); setIsProcessing(false); }
  };

  const processDenoise = async () => {
    if (!videoFile) return toast.error("Upload a video first.");
    setIsProcessing(true); setOutputUrl(null);
    try {
      const fd = new FormData();
      fd.append("video", videoFile.file); fd.append("filter", "denoised"); fd.append("intensity", String(denoiseIntensity / 100));
      const result = await callVideoStudio("filter", fd);
      setOutputUrl(result.url); onOutput(result.url, "AI Denoised"); toast.success("Denoise complete.");
    } catch (e: any) { toast.error(e.message); }
    finally { setIsProcessing(false); }
  };

  const OPS = [
    { id: "slowmo" as const,  label: "Slow Motion", icon: <Timer size={15}/> },
    { id: "upscale" as const, label: "AI Upscale",  icon: <Zap size={15}/> },
    { id: "denoise" as const, label: "AI Denoise",  icon: <Stars size={15}/> },
  ];

  return (
    <div className="flex flex-col gap-6">
      <SectionHeader icon={<BrainCircuit size={22}/>} title="AI Enhance" desc="Runway AI slow motion, upscale, and noise reduction" color="#22C55E" />
      <div className="flex gap-2">
        {OPS.map(op => (
          <button key={op.id} onClick={() => setActiveOp(op.id)} className="flex items-center gap-2 flex-1 justify-center py-2.5 rounded-xl text-sm font-bold transition-all" style={{ background: activeOp === op.id ? "rgba(34,197,94,0.2)" : "rgba(255,255,255,0.04)", border: `1.5px solid ${activeOp === op.id ? "#22C55E" : "rgba(255,255,255,0.08)"}`, color: activeOp === op.id ? "#22C55E" : "#9CA3AF" }}>
            {op.icon} {op.label}
          </button>
        ))}
      </div>
      {!videoFile ? <VideoDropZone onFile={setVideoFile} accent="#22C55E" /> : <VideoPlayer src={videoFile.url} label="Source" accent="#22C55E" />}
      <div className="p-5 rounded-2xl" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
        {activeOp === "slowmo" && (
          <div className="flex flex-col gap-4">
            <p className="text-sm font-bold text-white">Slow Motion Preset</p>
            <div className="flex flex-col gap-2">
              {SLOW_MO_PRESETS.map(p => (
                <button key={p.fps} onClick={() => setSelectedFps(p.fps)} className="flex items-center gap-4 p-4 rounded-2xl text-left transition-all" style={{ background: selectedFps === p.fps ? "rgba(34,197,94,0.15)" : "rgba(255,255,255,0.03)", border: `1.5px solid ${selectedFps === p.fps ? "#22C55E" : "rgba(255,255,255,0.07)"}` }}>
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 font-black text-lg" style={{ background: selectedFps === p.fps ? "rgba(34,197,94,0.2)" : "rgba(255,255,255,0.05)", color: selectedFps === p.fps ? "#22C55E" : "#6B7280" }}>{p.multiplier}</div>
                  <div><p className="text-sm font-bold" style={{ color: selectedFps === p.fps ? "#22C55E" : "#E5E7EB" }}>{p.label}</p><p className="text-xs mt-0.5" style={{ color: "#6B7280" }}>{p.desc}</p></div>
                </button>
              ))}
            </div>
            <div className="flex items-start gap-3 p-3 rounded-xl" style={{ background: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.2)" }}>
              <AlertCircle size={14} color="#22C55E" className="flex-shrink-0 mt-0.5" />
              <p className="text-xs" style={{ color: "#86EFAC" }}>AI slow motion uses Runway Gen-4 Turbo. Processing takes 2–5 minutes. First 30s of video is used.</p>
            </div>
            <button onClick={processSlowMo} disabled={!videoFile || isProcessing} className="w-full py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all" style={{ background: !videoFile || isProcessing ? "rgba(34,197,94,0.2)" : "linear-gradient(135deg, #22C55E, #15803D)", color: "white", cursor: !videoFile || isProcessing ? "not-allowed" : "pointer" }}>
              {isProcessing ? <><Loader2 size={16} className="animate-spin" /> Processing AI Slow Motion...</> : <><Timer size={16} /> Generate {selectedFps === "60" ? "2×" : selectedFps === "120" ? "4×" : "8×"} Slow Motion</>}
            </button>
          </div>
        )}
        {activeOp === "upscale" && (
          <div className="flex flex-col gap-4">
            <p className="text-sm font-bold text-white">AI Upscale</p>
            <div className="flex items-start gap-3 p-4 rounded-2xl" style={{ background: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.2)" }}>
              <Stars size={18} color="#22C55E" className="flex-shrink-0" />
              <div><p className="text-sm font-bold text-white">2× AI Upscale</p><p className="text-xs mt-1" style={{ color: "#86EFAC" }}>Upscale 720p → 1440p or 1080p → 4K using AI super-resolution. Ideal for older content or low-quality recordings.</p></div>
            </div>
            <button onClick={async () => { if (!videoFile) return toast.error("Upload a video first."); setIsProcessing(true); try { const fd = new FormData(); fd.append("video", videoFile.file); fd.append("format", "mp4_h264"); fd.append("resolution", "4k"); const result = await callVideoStudio("convert", fd); setOutputUrl(result.url); onOutput(result.url, "AI Upscaled 4K"); toast.success("Upscale complete."); } catch (e: any) { toast.error(e.message); } finally { setIsProcessing(false); } }} disabled={!videoFile || isProcessing} className="w-full py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all" style={{ background: !videoFile || isProcessing ? "rgba(34,197,94,0.2)" : "linear-gradient(135deg, #22C55E, #15803D)", color: "white", cursor: !videoFile || isProcessing ? "not-allowed" : "pointer" }}>
              {isProcessing ? <><Loader2 size={16} className="animate-spin" /> Upscaling...</> : <><Zap size={16} /> Upscale to 4K</>}
            </button>
          </div>
        )}
        {activeOp === "denoise" && (
          <div className="flex flex-col gap-4">
            <p className="text-sm font-bold text-white">AI Noise Reduction</p>
            <div className="flex justify-between mb-1"><span className="text-xs font-semibold" style={{ color: "#9CA3AF" }}>Denoise Strength</span><span className="text-xs font-bold" style={{ color: "#22C55E" }}>{denoiseIntensity}%</span></div>
            <input type="range" min={20} max={100} step={5} value={denoiseIntensity} onChange={(e) => setDenoiseIntensity(parseInt(e.target.value))} className="w-full" style={{ accentColor: "#22C55E" }} />
            <p className="text-xs" style={{ color: "#6B7280" }}>Removes grain and noise from low-light footage. Higher values = more smoothing.</p>
            <button onClick={processDenoise} disabled={!videoFile || isProcessing} className="w-full py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all" style={{ background: !videoFile || isProcessing ? "rgba(34,197,94,0.2)" : "linear-gradient(135deg, #22C55E, #15803D)", color: "white", cursor: !videoFile || isProcessing ? "not-allowed" : "pointer" }}>
              {isProcessing ? <><Loader2 size={16} className="animate-spin" /> Denoising...</> : <><Stars size={16} /> Apply AI Denoise</>}
            </button>
          </div>
        )}
      </div>
      {isProcessing && <ProcessingBar label={activeOp === "slowmo" ? "AI slow motion processing (2–5 min)..." : "Enhancing video..."} />}
      {outputUrl && <OutputCard url={outputUrl} label="AI Enhanced" accent="#22C55E" onDownload={() => { const a = document.createElement("a"); a.href = outputUrl; a.download = `vaultx-ai-${activeOp}.mp4`; a.click(); }} onUseAsInput={async () => { try { const vf = await fetchVideoAsFile(outputUrl, "ai-output.mp4"); setVideoFile(vf); setOutputUrl(null); toast.success("Output loaded"); } catch { toast.error("Failed to load output"); } }} />}
    </div>
  );
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

  const QUICK_CAPTIONS = [
    "🔞 FULL VIDEO ON MY PAGE", "💋 LINK IN BIO", "🔥 SUBSCRIBE FOR MORE",
    "💎 EXCLUSIVE CONTENT", "📲 DM ME", "🚀 NEW VIDEO DROPPING SOON",
    "💰 PPV AVAILABLE", "❤️ FOLLOW FOR DAILY CONTENT",
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
      onOutput(result.url, `Caption: "${text.slice(0, 20)}..."`);
      toast.success("Caption burned in.");
    } catch (e: any) { toast.error(e.message); }
    finally { setIsProcessing(false); }
  };

  return (
    <div className="flex flex-col gap-6">
      <SectionHeader icon={<Type size={22}/>} title="Caption Studio" desc="Burn-in captions, text overlays, and title cards" color="#60A5FA" />
      {!videoFile ? <VideoDropZone onFile={setVideoFile} accent="#60A5FA" /> : <VideoPlayer src={videoFile.url} label="Source" accent="#60A5FA" />}
      <div>
        <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: "#6B7280" }}>Quick Captions</p>
        <div className="flex flex-wrap gap-2">
          {QUICK_CAPTIONS.map(c => (
            <button key={c} onClick={() => setText(c)} className="px-3 py-1.5 rounded-xl text-xs font-semibold transition-all" style={{ background: text === c ? "rgba(96,165,250,0.2)" : "rgba(255,255,255,0.04)", border: `1px solid ${text === c ? "#60A5FA" : "rgba(255,255,255,0.08)"}`, color: text === c ? "#60A5FA" : "#9CA3AF" }}>{c}</button>
          ))}
        </div>
      </div>
      <div>
        <label className="text-xs font-bold uppercase tracking-widest mb-2 block" style={{ color: "#6B7280" }}>Custom Text</label>
        <textarea value={text} onChange={(e) => setText(e.target.value)} placeholder="Enter your caption text..." rows={2} className="w-full px-4 py-3 rounded-xl text-sm text-white resize-none" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }} />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-xs font-semibold mb-2 block" style={{ color: "#9CA3AF" }}>Position</label>
          <div className="grid grid-cols-2 gap-1.5">
            {[{ id: "top_left", label: "↖" }, { id: "top_center", label: "↑" }, { id: "top_right", label: "↗" }, { id: "center", label: "⊙" }, { id: "bottom_left", label: "↙" }, { id: "bottom_center", label: "↓" }].map(p => (
              <button key={p.id} onClick={() => setPosition(p.id)} className="py-2 rounded-lg text-sm font-bold transition-all" style={{ background: position === p.id ? "rgba(96,165,250,0.2)" : "rgba(255,255,255,0.04)", border: `1px solid ${position === p.id ? "#60A5FA" : "rgba(255,255,255,0.08)"}`, color: position === p.id ? "#60A5FA" : "#9CA3AF" }}>{p.label}</button>
            ))}
          </div>
        </div>
        <div className="flex flex-col gap-3">
          {[{ label: "Font Size", value: fontSize, setter: setFontSize, min: 16, max: 72, step: 2, color: "#60A5FA", unit: "px" }, { label: "Start (s)", value: startTime, setter: setStartTime, min: 0, max: videoFile?.duration || 60, step: 1, color: "#60A5FA", unit: "s" }, { label: "End (s)", value: endTime, setter: setEndTime, min: 1, max: videoFile?.duration || 60, step: 1, color: "#60A5FA", unit: "s" }].map(({ label, value, setter, min, max, step, color, unit }) => (
            <div key={label}>
              <div className="flex justify-between mb-1"><label className="text-xs font-semibold" style={{ color: "#9CA3AF" }}>{label}</label><span className="text-xs font-bold" style={{ color }}>{value}{unit}</span></div>
              <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => setter(parseInt(e.target.value))} className="w-full" style={{ accentColor: color }} />
            </div>
          ))}
        </div>
      </div>
      <button onClick={process} disabled={!videoFile || isProcessing || !text.trim()} className="w-full py-4 rounded-2xl font-black text-white text-base transition-all flex items-center justify-center gap-2" style={{ background: !videoFile || isProcessing || !text.trim() ? "rgba(96,165,250,0.3)" : "linear-gradient(135deg, #60A5FA, #2563EB)", cursor: !videoFile || isProcessing || !text.trim() ? "not-allowed" : "pointer", boxShadow: !videoFile || isProcessing || !text.trim() ? "none" : "0 0 30px rgba(96,165,250,0.3)" }}>
        {isProcessing ? <><Loader2 size={20} className="animate-spin" /> Burning Caption...</> : <><Type size={20} /> Burn In Caption</>}
      </button>
      {isProcessing && <ProcessingBar label="Burning caption into video..." />}
      {outputUrl && <OutputCard url={outputUrl} label="Captioned" accent="#60A5FA" onDownload={() => { const a = document.createElement("a"); a.href = outputUrl; a.download = "vaultx-captioned.mp4"; a.click(); }} onUseAsInput={async () => { try { const vf = await fetchVideoAsFile(outputUrl, "captioned.mp4"); setVideoFile(vf); setOutputUrl(null); toast.success("Output loaded — add another caption"); } catch { toast.error("Failed to load output"); } }} />}
    </div>
  );
}

// ============================================================================
// MODE: CONTENT VAULT
// ============================================================================
function ContentVaultMode() {
  const [uploadedFiles, setUploadedFiles] = useState<{ name: string; url: string; size: number; uploadedAt: number }[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const handleFile = async (vf: VideoFile) => {
    setUploading(true); setUploadProgress(0);
    try {
      const totalChunks = Math.ceil(vf.file.size / CHUNK_SIZE);
      const uploadId = `${Date.now()}_${Math.random().toString(36).slice(2)}`;
      const initRes = await fetch("/api/video/upload/init", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ uploadId, totalChunks, filename: vf.name }) });
      if (!initRes.ok) throw new Error("Upload init failed");
      let finalUrl = "";
      for (let i = 0; i < totalChunks; i++) {
        const start = i * CHUNK_SIZE;
        const chunk = vf.file.slice(start, Math.min(start + CHUNK_SIZE, vf.file.size));
        const fd = new FormData();
        fd.append("chunk", chunk); fd.append("uploadId", uploadId); fd.append("chunkIndex", String(i));
        const chunkRes = await fetch("/api/video/upload/chunk", { method: "POST", body: fd });
        const chunkData = await chunkRes.json();
        setUploadProgress(Math.round(((i + 1) / totalChunks) * 100));
        if (chunkData.complete && chunkData.file?.url) { finalUrl = chunkData.file.url; break; }
      }
      setUploadedFiles(prev => [...prev, { name: vf.name, url: finalUrl || vf.url, size: vf.size, uploadedAt: Date.now() }]);
      toast.success(`${vf.name} uploaded to Content Vault.`);
    } catch (e: any) { toast.error(e.message); }
    finally { setUploading(false); setUploadProgress(0); }
  };

  return (
    <div className="flex flex-col gap-6">
      <SectionHeader icon={<HardDrive size={22}/>} title="Content Vault" desc="Upload and organize your content library" color="#9333EA" />
      <VideoDropZone onFile={handleFile} accent="#9333EA" />
      {uploading && (
        <div className="flex flex-col gap-3 p-5 rounded-2xl" style={{ background: "rgba(147,51,234,0.1)", border: "1px solid rgba(147,51,234,0.2)" }}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3"><div className="w-6 h-6 rounded-full border-2 border-purple-500 border-t-transparent animate-spin" /><span className="text-sm font-semibold text-white">Uploading to vault...</span></div>
            <span className="text-sm font-bold" style={{ color: "#A855F7" }}>{uploadProgress}%</span>
          </div>
          <div className="w-full rounded-full overflow-hidden" style={{ height: 4, background: "rgba(255,255,255,0.1)" }}>
            <div className="h-full rounded-full transition-all duration-300" style={{ width: `${uploadProgress}%`, background: "linear-gradient(90deg, #9333EA, #A855F7)" }} />
          </div>
        </div>
      )}
      {uploadedFiles.length > 0 && (
        <div className="flex flex-col gap-3">
          <p className="text-xs font-bold uppercase tracking-widest" style={{ color: "#6B7280" }}>Vault Contents ({uploadedFiles.length})</p>
          {uploadedFiles.map((f, i) => (
            <div key={i} className="flex items-center gap-4 p-4 rounded-2xl" style={{ background: "rgba(147,51,234,0.1)", border: "1px solid rgba(147,51,234,0.2)" }}>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: "rgba(147,51,234,0.2)" }}><FileVideo size={20} color="#A855F7" /></div>
              <div className="flex-1 min-w-0"><p className="text-sm font-bold text-white truncate">{f.name}</p><p className="text-xs mt-0.5" style={{ color: "#9CA3AF" }}>{fmtSize(f.size)} · {new Date(f.uploadedAt).toLocaleTimeString()}</p></div>
              <button onClick={() => { const a = document.createElement("a"); a.href = f.url; a.download = f.name; a.click(); }} className="w-10 h-10 flex items-center justify-center rounded-xl transition-all" style={{ background: "rgba(147,51,234,0.3)", color: "#C084FC" }}><Download size={16} /></button>
            </div>
          ))}
        </div>
      )}
      {uploadedFiles.length === 0 && !uploading && (
        <div className="flex flex-col items-center justify-center py-12 gap-3">
          <HardDrive size={40} color="#374151" />
          <p className="text-sm font-semibold" style={{ color: "#6B7280" }}>Your vault is empty</p>
          <p className="text-xs" style={{ color: "#4B5563" }}>Upload videos to store and access them here</p>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================
export default function VaultXStudio() {
  const [activeMode, setActiveModeState] = useState<ModeId>("velvet-suite");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  const setActiveMode = (mode: ModeId) => { setActiveModeState(mode); setShowHistory(false); };

  const handleOutput = useCallback((url: string, label: string) => {
    setHistory(prev => [{ id: `${Date.now()}`, mode: activeMode, label, outputUrl: url, timestamp: Date.now() }, ...prev.slice(0, 49)]);
  }, [activeMode]);

  const currentMode = MODES.find(m => m.id === activeMode)!;

  return (
    <div className="flex min-h-screen" style={{ background: "#030003", fontFamily: "'Inter', sans-serif" }}>
      {/* ── Sidebar ── */}
      <div className="flex-shrink-0 flex flex-col transition-all duration-300" style={{ width: sidebarOpen ? 256 : 72, background: "rgba(8,0,8,0.97)", borderRight: "1px solid rgba(220,38,38,0.12)" }}>
        {/* Logo */}
        <div className="flex items-center gap-3 px-4 py-5" style={{ borderBottom: "1px solid rgba(220,38,38,0.1)" }}>
          <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: "linear-gradient(135deg, #DC2626, #7F1D1D)" }}>
            <Flame size={18} color="white" />
          </div>
          {sidebarOpen && (
            <div className="min-w-0">
              <p className="text-white font-black text-sm leading-none tracking-tight">VaultX Studio</p>
              <p className="text-[10px] mt-0.5 font-semibold" style={{ color: "#6B7280" }}>Elite Production Suite</p>
            </div>
          )}
          <button onClick={() => setSidebarOpen(!sidebarOpen)} className="ml-auto flex-shrink-0" style={{ color: "#4B5563" }}>
            {sidebarOpen ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
          </button>
        </div>
        {/* Mode List */}
        <nav className="flex-1 py-4 flex flex-col gap-1 px-2 overflow-y-auto">
          {MODES.map((mode) => {
            const active = activeMode === mode.id;
            return (
              <button key={mode.id} onClick={() => setActiveMode(mode.id)} className="flex items-center gap-3 px-3 py-3 rounded-xl text-left transition-all w-full" style={{ background: active ? mode.accent : "transparent", border: `1px solid ${active ? `${mode.color}40` : "transparent"}` }}>
                <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: active ? `${mode.color}30` : "rgba(255,255,255,0.05)", color: active ? mode.color : "#6B7280" }}>
                  {mode.icon}
                </div>
                {sidebarOpen && (
                  <div className="min-w-0">
                    <p className="text-xs font-bold truncate" style={{ color: active ? "#F9FAFB" : "#9CA3AF" }}>{mode.label}</p>
                    <p className="text-[9px] truncate mt-0.5" style={{ color: active ? "#6B7280" : "#374151" }}>{mode.desc}</p>
                  </div>
                )}
              </button>
            );
          })}
        </nav>
        {/* History Button */}
        <div className="px-2 pb-4">
          <button onClick={() => setShowHistory(!showHistory)} className="flex items-center gap-3 px-3 py-3 rounded-xl w-full transition-all" style={{ background: showHistory ? "rgba(220,38,38,0.1)" : "transparent", border: `1px solid ${showHistory ? "rgba(220,38,38,0.3)" : "transparent"}` }}>
            <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: "rgba(255,255,255,0.05)", color: "#6B7280" }}><Activity size={16} /></div>
            {sidebarOpen && (
              <div className="flex items-center gap-2">
                <p className="text-xs font-bold" style={{ color: "#9CA3AF" }}>History</p>
                {history.length > 0 && <span className="px-1.5 py-0.5 rounded text-[9px] font-black" style={{ background: "rgba(220,38,38,0.2)", color: "#FCA5A5" }}>{history.length}</span>}
              </div>
            )}
          </button>
        </div>
      </div>

      {/* ── Main Content ── */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Bar */}
        <div className="flex items-center gap-4 px-6 py-4 sticky top-0 z-10" style={{ borderBottom: "1px solid rgba(220,38,38,0.1)", background: "rgba(3,0,3,0.95)", backdropFilter: "blur(12px)" }}>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: currentMode.accent, color: currentMode.color }}>{currentMode.icon}</div>
            <div>
              <h1 className="text-white font-black text-base leading-none">{currentMode.label}</h1>
              <p className="text-[10px] mt-0.5 font-semibold" style={{ color: "#6B7280" }}>{currentMode.desc}</p>
            </div>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold" style={{ background: "rgba(220,38,38,0.1)", color: "#FCA5A5", border: "1px solid rgba(220,38,38,0.2)" }}>
              <ShieldCheck size={12} /> VaultX Protected
            </div>
          </div>
        </div>
        {/* Content Area */}
        <div className="flex-1 overflow-y-auto">
          {showHistory ? (
            <div className="p-6 max-w-2xl mx-auto">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-white font-black text-xl">Session History</h2>
                <button onClick={() => setHistory([])} className="text-xs font-bold px-3 py-1.5 rounded-xl transition-all" style={{ background: "rgba(220,38,38,0.1)", color: "#EF4444", border: "1px solid rgba(220,38,38,0.2)" }}>Clear All</button>
              </div>
              {history.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 gap-4">
                  <Activity size={40} color="#374151" />
                  <p className="text-base font-semibold" style={{ color: "#6B7280" }}>No outputs yet this session</p>
                  <p className="text-sm" style={{ color: "#4B5563" }}>Your processed videos will appear here</p>
                </div>
              ) : (
                <div className="flex flex-col gap-5">
                  {history.map(item => (
                    <div key={item.id} className="rounded-2xl overflow-hidden" style={{ border: "1px solid rgba(220,38,38,0.2)" }}>
                      <VideoPlayer src={item.outputUrl} label={item.label} />
                      <div className="flex items-center justify-between px-4 py-3" style={{ background: "rgba(8,0,0,0.8)" }}>
                        <div>
                          <p className="text-sm font-bold text-white">{item.label}</p>
                          <p className="text-xs mt-0.5" style={{ color: "#6B7280" }}>{new Date(item.timestamp).toLocaleTimeString()}</p>
                        </div>
                        <button onClick={() => { const a = document.createElement("a"); a.href = item.outputUrl; a.download = `vaultx-${item.mode}.mp4`; a.click(); }} className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all" style={{ background: "rgba(220,38,38,0.2)", color: "#FCA5A5", border: "1px solid rgba(220,38,38,0.3)" }}>
                          <Download size={14} /> Download
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="p-6 max-w-2xl mx-auto">
              {activeMode === "velvet-suite"    && <VelvetSuiteMode    onOutput={handleOutput} />}
              {activeMode === "desire-grade"    && <DesireGradeMode    onOutput={handleOutput} />}
              {activeMode === "scene-architect" && <SceneArchitectMode onOutput={handleOutput} />}
              {activeMode === "ppv-engine"      && <PPVEngineMode      onOutput={handleOutput} />}
              {activeMode === "platform-vault"  && <PlatformVaultMode  onOutput={handleOutput} />}
              {activeMode === "ai-enhance"      && <AIEnhanceMode      onOutput={handleOutput} />}
              {activeMode === "caption-studio"  && <CaptionStudioMode  onOutput={handleOutput} />}
              {activeMode === "content-vault"   && <ContentVaultMode />}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
