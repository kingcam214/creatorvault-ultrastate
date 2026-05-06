import { useState, useRef, useEffect, useCallback } from "react";
import { trpc } from "../lib/trpc";
import { toast } from "sonner";
import {
  Play, Pause, SkipBack, SkipForward, Scissors, Trash2,
  Download, Upload, ChevronDown, Loader2,
  Film, Music, Image, Layers, ZoomIn,
  Eye, Plus, Volume2, VolumeX,
  Save, CheckCircle,
  FileVideo, Wand2, HardDrive, Sparkles,
  Brain, Send, Calendar,
  Flame, Crown, X, RefreshCw,
  Copy,
} from "lucide-react";

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

// ============================================================================
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

  // ── State ──
  const [activeTab, setActiveTab] = useState<"enhance" | "body" | "timeline" | "publish" | "calendar">("enhance");
  const [projectId, setProjectId] = useState<number | null>(null);
  const [sourceUrl, setSourceUrl] = useState("");
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
  const [captionStyle, setCaptionStyle] = useState<"teaser" | "explicit" | "romantic" | "dominant" | "playful">("teaser");
  const [publishTier, setPublishTier] = useState<"free" | "basic" | "premium" | "vip" | "ppv">("premium");
  const [ppvPrice, setPpvPrice] = useState(15);
  const [publishTitle, setPublishTitle] = useState("");
  const [exportPresets, setExportPresets] = useState<string[]>(["onlyfans"]);

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
    const formData = new FormData();
    formData.append("file", file);
    toast.loading("Uploading...");
    try {
      const resp = await fetch("/api/upload/vaultx", { method: "POST", body: formData });
      const data = await resp.json();
      if (data.url) {
        setSourceUrl(data.url);
        setCurrentSource(data.url);
        setContentType(file.type.startsWith("video") ? "video" : "photo");
        toast.success("Uploaded — analyzing...");
        const pid = await ensureProject();
        const result = await analyzeContentMut.mutateAsync({ sourceUrl: data.url, projectType: file.type.startsWith("video") ? "video" : "photo", projectId: pid });
        setAnalysis(result.analysis as ContentAnalysis);
        toast.success("Content analyzed");
      }
    } catch (e: any) { toast.error("Upload failed: " + e.message); }
  }, [ensureProject, analyzeContentMut]);

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
    generateBodyCaptionsMut.isPending || publishToVaultXMut.isPending || generateContentCalendarMut.isPending;

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
          </div>
          <div className="w-px h-4" style={{ background: "rgba(255,255,255,0.1)" }} />
          <button onClick={() => setShowProjectList(true)} className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-bold" style={{ background: "rgba(255,255,255,0.06)", color: "#9CA3AF", border: "1px solid rgba(255,255,255,0.08)" }}>
            <Film size={11} />{project.title}<ChevronDown size={10} />
          </button>
        </div>
        <div className="flex items-center gap-1 p-1 rounded-2xl" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}>
          {[
            { id: "enhance", label: "ENHANCE",   icon: Sparkles, color: "#8B5CF6" },
            { id: "body",    label: "BODY INTEL", icon: Brain,    color: "#EC4899" },
            { id: "timeline",label: "TIMELINE",   icon: Layers,   color: "#3B82F6" },
            { id: "publish", label: "PUBLISH",    icon: Send,     color: "#10B981" },
            { id: "calendar",label: "CALENDAR",   icon: Calendar, color: "#F59E0B" },
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
          <button onClick={() => setShowProjectList(true)} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-[10px] font-black" style={{ background: "rgba(255,255,255,0.06)", color: "#9CA3AF", border: "1px solid rgba(255,255,255,0.08)" }}>
            <Save size={10} />Projects
          </button>
        </div>
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
                            {(["teaser", "explicit", "romantic", "dominant", "playful"] as const).map(s => (
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
                  <div className="flex flex-col items-center justify-center h-full gap-4">
                    <div className="w-16 h-16 rounded-3xl flex items-center justify-center" style={{ background: "rgba(139,92,246,0.1)", border: "1px solid rgba(139,92,246,0.2)" }}>
                      <Sparkles size={28} style={{ color: "#8B5CF6" }} />
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-black text-white">Upload Content to Begin</p>
                      <p className="text-xs mt-1" style={{ color: "#4B5563" }}>Drop a photo or video — GPT-4o analyzes automatically</p>
                    </div>
                    <div className="grid grid-cols-3 gap-2 mt-2">
                      {["SDXL Beauty", "Real-ESRGAN 4x", "Flux Cinematic", "Kling 3.0 Video", "ElevenLabs Audio", "DALL-E 3 BG"].map(m => (
                        <div key={m} className="px-2 py-1.5 rounded-xl text-center text-[8px] font-bold" style={{ background: "rgba(255,255,255,0.03)", color: "#374151", border: "1px solid rgba(255,255,255,0.05)" }}>{m}</div>
                      ))}
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
              <p className="text-xs font-black tracking-widest" style={{ color: "#10B981" }}>PUBLISH TO VAULTX</p>
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
                  {publishToVaultXMut.isPending ? <><Loader2 size={14} className="animate-spin" />PUBLISHING...</> : <><Send size={14} />PUBLISH TO VAULTX</>}
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
                  {exportForPlatformsMut.isPending ? <><Loader2 size={11} className="animate-spin" />EXPORTING...</> : <><Download size={11} />EXPORT {exportPresets.length} PLATFORMS</>}
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
