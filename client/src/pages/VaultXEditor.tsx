import { useState, useRef, useEffect, useCallback } from "react";
import { trpc } from "../lib/trpc";
import { toast } from "sonner";
import {
  Play, Pause, SkipBack, SkipForward, Scissors, Trash2,
  Download, Upload, ChevronDown, ChevronRight, Loader2,
  Film, Music, Image, Type, Layers, Settings, ZoomIn, ZoomOut,
  Lock, Unlock, Eye, EyeOff, Plus, Minus, Volume2, VolumeX,
  Maximize2, RotateCcw, Save, Share2, AlertCircle, CheckCircle,
  Clock, FileVideo, Wand2, Shield, HardDrive,
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

interface TextOverlay {
  id: string;
  text: string;
  startTime: number;
  duration: number;
  x: number;
  y: number;
  fontSize: number;
  color: string;
  fontWeight: string;
  animation: "none" | "fade_in" | "slide_up" | "pop";
}

interface EditorProject {
  id?: number;
  title: string;
  projectType: "video" | "photo_set" | "audio";
  aspectRatio: "9:16" | "16:9" | "1:1" | "4:5";
  durationSeconds: number;
  outputUrl?: string;
}

const EXPORT_PRESETS = [
  { id: "onlyfans",        label: "OnlyFans Master",  desc: "1080p H.264, 9:16, max quality",       color: "#00AFF0" },
  { id: "tiktok",          label: "TikTok / Reels",   desc: "1080×1920, H.264, 60fps",              color: "#FF0050" },
  { id: "telegram",        label: "Telegram",         desc: "720p, smaller file, fast upload",       color: "#26A5E4" },
  { id: "twitter",         label: "Twitter / X",      desc: "720p, under 512MB",                     color: "#1DA1F2" },
  { id: "youtube_shorts",  label: "YouTube Shorts",   desc: "1080×1920, H.264, 60fps",              color: "#FF0000" },
  { id: "master",          label: "Master Archive",   desc: "Highest quality, 4K if source allows", color: "#8B5CF6" },
] as const;

const TRACK_COLORS = ["#8B5CF6", "#3B82F6", "#10B981", "#F59E0B", "#EF4444", "#EC4899"];

// ============================================================================
// TIMELINE TRACK COMPONENT
// ============================================================================
function TimelineTrack({
  trackIndex, clips, totalDuration, pixelsPerSecond, selectedClipId,
  onSelectClip, onDeleteClip, onMoveClip,
}: {
  trackIndex: number;
  clips: TimelineClip[];
  totalDuration: number;
  pixelsPerSecond: number;
  selectedClipId: string | null;
  onSelectClip: (id: string) => void;
  onDeleteClip: (id: string) => void;
  onMoveClip: (id: string, newStart: number) => void;
}) {
  const trackClips = clips.filter(c => c.trackIndex === trackIndex);
  const trackWidth = Math.max(totalDuration * pixelsPerSecond, 800);

  return (
    <div
      className="relative flex-shrink-0"
      style={{ height: 48, width: trackWidth, background: "rgba(255,255,255,0.02)", borderBottom: "1px solid rgba(255,255,255,0.04)" }}
    >
      {trackClips.map(clip => {
        const left = clip.startTime * pixelsPerSecond;
        const width = Math.max(clip.duration * pixelsPerSecond, 24);
        const isSelected = selectedClipId === clip.id;
        return (
          <div
            key={clip.id}
            onClick={() => onSelectClip(clip.id)}
            className="absolute top-1 bottom-1 rounded-lg flex items-center px-2 cursor-pointer select-none overflow-hidden"
            style={{
              left,
              width,
              background: isSelected ? `${clip.color}40` : `${clip.color}20`,
              border: `1.5px solid ${isSelected ? clip.color : clip.color + "60"}`,
              boxShadow: isSelected ? `0 0 0 1px ${clip.color}` : "none",
            }}
          >
            <span className="text-[10px] font-bold truncate" style={{ color: clip.color }}>{clip.label}</span>
            {isSelected && (
              <button
                onClick={e => { e.stopPropagation(); onDeleteClip(clip.id); }}
                className="ml-auto flex-shrink-0 w-4 h-4 rounded flex items-center justify-center"
                style={{ background: "rgba(239,68,68,0.3)" }}
              >
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
// MAIN VAULTX EDITOR COMPONENT
// ============================================================================
export default function VaultXEditor() {
  const myProjectsQ = trpc.vaultx.getMyEditorProjects.useQuery();
  const createProjectMut = trpc.vaultx.createEditorProject.useMutation();
  const saveTimelineMut = trpc.vaultx.saveProjectTimeline.useMutation();
  const processEditMut = trpc.vaultx.processVideoEdit.useMutation();
  const exportMut = trpc.vaultx.exportProject.useMutation();
  const directorMut = trpc.vaultx.automatedDirectorExport.useMutation();
  const genCensoredMut = trpc.vaultx.generateCensoredVersion.useMutation();
  const genThumbMut = trpc.vaultx.generateThumbnail.useMutation();

  // Project state
  const [project, setProject] = useState<EditorProject>({
    title: "Untitled Project",
    projectType: "video",
    aspectRatio: "9:16",
    durationSeconds: 60,
  });
  const [projectId, setProjectId] = useState<number | null>(null);
  const [showProjectList, setShowProjectList] = useState(false);

  // Timeline state
  const [clips, setClips] = useState<TimelineClip[]>([]);
  const [textOverlays, setTextOverlays] = useState<TextOverlay[]>([]);
  const [selectedClipId, setSelectedClipId] = useState<string | null>(null);
  const [playhead, setPlayhead] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [zoom, setZoom] = useState(60); // pixels per second
  const [totalDuration, setTotalDuration] = useState(60);

  // Monitor state
  const videoRef = useRef<HTMLVideoElement>(null);
  const [currentSource, setCurrentSource] = useState<string | null>(null);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);

  // Panel state
  const [activePanel, setActivePanel] = useState<"properties" | "effects" | "export">("properties");
  const [showExportPanel, setShowExportPanel] = useState(false);
  const [selectedPreset, setSelectedPreset] = useState<string>("onlyfans");
  const [exportResult, setExportResult] = useState<{ downloadUrl: string; processingTime: number; steps?: string[] } | null>(null);
  const [hookText, setHookText] = useState("You need to see this");
  const [ctaText, setCtaText] = useState("Subscribe for full access");
  const [enableAIPacing, setEnableAIPacing] = useState(true);
  const [directorMode, setDirectorMode] = useState(true);
  const [processingResult, setProcessingResult] = useState<{ outputUrl: string; processingTime: number } | null>(null);

  // Properties for selected clip
  const selectedClip = clips.find(c => c.id === selectedClipId) || null;

  // Playback
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (isPlaying) {
      interval = setInterval(() => {
        setPlayhead(p => {
          if (p >= totalDuration) { setIsPlaying(false); return 0; }
          return p + 0.1;
        });
      }, 100);
    }
    return () => clearInterval(interval);
  }, [isPlaying, totalDuration]);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.code === "Space") { e.preventDefault(); setIsPlaying(p => !p); }
      if (e.code === "KeyC" && selectedClipId) {
        const clip = clips.find(c => c.id === selectedClipId);
        if (clip) {
          const cutTime = playhead;
          if (cutTime > clip.startTime && cutTime < clip.startTime + clip.duration) {
            const firstDuration = cutTime - clip.startTime;
            const secondDuration = clip.duration - firstDuration;
            const newClip: TimelineClip = {
              ...clip,
              id: Date.now().toString(),
              startTime: cutTime,
              duration: secondDuration,
              trimIn: clip.trimIn + firstDuration,
            };
            setClips(prev => prev.map(c => c.id === selectedClipId ? { ...c, duration: firstDuration } : c).concat(newClip));
          }
        }
      }
      if ((e.code === "Delete" || e.code === "Backspace") && selectedClipId) {
        setClips(prev => prev.filter(c => c.id !== selectedClipId));
        setSelectedClipId(null);
      }
      if ((e.metaKey || e.ctrlKey) && e.code === "KeyS") { e.preventDefault(); handleSave(); }
      if ((e.metaKey || e.ctrlKey) && e.code === "KeyE") { e.preventDefault(); setShowExportPanel(true); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [selectedClipId, clips, playhead]);

  const handleSave = useCallback(async () => {
    try {
      if (!projectId) {
        const result = await createProjectMut.mutateAsync({
          projectName: project.title,
          projectType: project.projectType as any,
        });
        setProjectId(result.projectId);
        await saveTimelineMut.mutateAsync({
          projectId: result.projectId,
          timelineData: { clips, textOverlays, totalDuration, aspectRatio: project.aspectRatio },
        });
      } else {
        await saveTimelineMut.mutateAsync({
          projectId,
          timelineData: { clips, textOverlays, totalDuration, aspectRatio: project.aspectRatio },
        });
      }
      toast.success("Project saved");
    } catch (e: any) { toast.error(e.message); }
  }, [projectId, project, clips, textOverlays, totalDuration, createProjectMut, saveTimelineMut]);

  const handleProcess = async () => {
    if (!projectId) { toast.error("Save project first"); return; }
    if (clips.length === 0) { toast.error("Add clips to the timeline first"); return; }
    try {
      const ops = clips.map(c => ({ type: "trim" as const, params: { start_seconds: c.trimIn, end_seconds: c.trimIn + c.duration } }));
      const result = await processEditMut.mutateAsync({
        projectId,
        operations: ops,
      });
      setProcessingResult({ outputUrl: result.outputUrl, processingTime: result.processingTimeSeconds * 1000 });
      setCurrentSource(result.outputUrl);
      toast.success(`Processed in ${result.processingTimeSeconds}s`);
    } catch (e: any) { toast.error(e.message); }
  };

  const handleExport = async () => {
    if (!projectId) { toast.error("Save and process project first"); return; }
    try {
      if (directorMode) {
        const proj = myProjectsQ.data?.projects?.find((p: any) => p.id === projectId) as any;
        const sourceUrl = proj?.output_url || proj?.outputUrl || "/videos/kingcam-hero-cam.mp4";
        const result = await directorMut.mutateAsync({
          sourceUrl,
          platform: selectedPreset as any,
          hookText,
          ctaText,
          enableAIPacing,
          projectId,
        });
        setExportResult({ downloadUrl: result.outputUrl, processingTime: result.processingTimeMs, steps: result.processingSteps });
        toast.success("✨ Automated Director export complete!");
      } else {
        const result = await exportMut.mutateAsync({ projectId, exportFormat: "mp4_hd", exportPreset: selectedPreset as any });
        setExportResult({ downloadUrl: result.outputUrl, processingTime: result.processingTimeSeconds * 1000 });
        toast.success("Export complete!");
      }
    } catch (e: any) { toast.error(e.message); }
  };

  const handleAddClip = (url: string, label: string, type: "video" | "audio" | "image") => {
    const newClip: TimelineClip = {
      id: Date.now().toString(),
      trackIndex: 0,
      startTime: clips.filter(c => c.trackIndex === 0).reduce((max, c) => Math.max(max, c.startTime + c.duration), 0),
      duration: 10,
      sourceUrl: url,
      label,
      type,
      color: TRACK_COLORS[clips.length % TRACK_COLORS.length],
      volume: 1,
      muted: false,
      locked: false,
      visible: true,
      trimIn: 0,
      trimOut: 10,
      effects: [],
    };
    setClips(prev => [...prev, newClip]);
    setCurrentSource(url);
    const newTotal = Math.max(totalDuration, newClip.startTime + newClip.duration + 5);
    setTotalDuration(newTotal);
  };

  const updateClipProp = (id: string, key: keyof TimelineClip, value: any) => {
    setClips(prev => prev.map(c => c.id === id ? { ...c, [key]: value } : c));
  };

  const TRACKS = [
    { index: 0, label: "Video 1",  icon: <Film size={12} />,   color: "#8B5CF6" },
    { index: 1, label: "Video 2",  icon: <Film size={12} />,   color: "#3B82F6" },
    { index: 2, label: "Audio 1",  icon: <Music size={12} />,  color: "#10B981" },
    { index: 3, label: "Audio 2",  icon: <Music size={12} />,  color: "#F59E0B" },
    { index: 4, label: "Overlay",  icon: <Layers size={12} />, color: "#EC4899" },
  ];

  const timelineWidth = Math.max(totalDuration * zoom, 800);

  return (
    <div className="flex flex-col h-screen overflow-hidden" style={{ background: "#0A0A0A", fontFamily: "'Inter', sans-serif" }}>

      {/* ── TOP BAR ── */}
      <div className="flex-shrink-0 flex items-center gap-3 px-4 py-2" style={{ background: "#080808", borderBottom: "1px solid rgba(255,255,255,0.06)", height: 48 }}>
        {/* Project title */}
        <input
          value={project.title}
          onChange={e => setProject(p => ({ ...p, title: e.target.value }))}
          className="text-sm font-black text-white bg-transparent outline-none border-b border-transparent hover:border-white/20 focus:border-white/40 transition-all"
          style={{ minWidth: 160 }}
        />

        {/* Aspect ratio */}
        <select
          value={project.aspectRatio}
          onChange={e => setProject(p => ({ ...p, aspectRatio: e.target.value as any }))}
          className="text-xs font-bold px-2 py-1 rounded-lg"
          style={{ background: "rgba(255,255,255,0.06)", color: "#9CA3AF", border: "1px solid rgba(255,255,255,0.08)", outline: "none" }}
        >
          {["9:16", "16:9", "1:1", "4:5"].map(r => <option key={r} value={r}>{r}</option>)}
        </select>

        <div className="flex-1" />

        {/* Project list */}
        <button onClick={() => setShowProjectList(s => !s)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all" style={{ background: "rgba(255,255,255,0.05)", color: "#9CA3AF", border: "1px solid rgba(255,255,255,0.08)" }}>
          <Film size={12} /> Projects ({myProjectsQ.data?.projects?.length ?? 0})
        </button>

        {/* Save */}
        <button onClick={handleSave} disabled={saveTimelineMut.isPending || createProjectMut.isPending} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all" style={{ background: "rgba(255,255,255,0.05)", color: "#9CA3AF", border: "1px solid rgba(255,255,255,0.08)" }}>
          {saveTimelineMut.isPending ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />} Save
        </button>

        {/* Process */}
        <button onClick={handleProcess} disabled={processEditMut.isPending} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all" style={{ background: "rgba(139,92,246,0.2)", color: "#8B5CF6", border: "1px solid rgba(139,92,246,0.4)" }}>
          {processEditMut.isPending ? <Loader2 size={12} className="animate-spin" /> : <Wand2 size={12} />} Process
        </button>

        {/* Export */}
        <button onClick={() => setShowExportPanel(s => !s)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all" style={{ background: "rgba(16,185,129,0.2)", color: "#10B981", border: "1px solid rgba(16,185,129,0.4)" }}>
          <Download size={12} /> Export
        </button>
      </div>

      {/* ── MAIN AREA ── */}
      <div className="flex flex-1 overflow-hidden">

        {/* ── LEFT: MEDIA LIBRARY ── */}
        <div className="flex-shrink-0 flex flex-col overflow-hidden" style={{ width: 220, borderRight: "1px solid rgba(255,255,255,0.06)", background: "#080808" }}>
          <div className="p-3" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
            <p className="text-[10px] font-black uppercase tracking-widest" style={{ color: "#6B7280" }}>Media Library</p>
          </div>
          <div className="flex-1 overflow-y-auto p-2 flex flex-col gap-1.5">
            {/* Quick-add from VPS uploads */}
            {[
              { url: "/videos/kingcam-hero-cam.mp4",   label: "Hero Cam",    type: "video" as const },
              { url: "/videos/kingcam-clone-1.mp4",    label: "Clone 1",     type: "video" as const },
            ].map(asset => (
              <button
                key={asset.url}
                onClick={() => handleAddClip(asset.url, asset.label, asset.type)}
                className="flex items-center gap-2 p-2 rounded-xl text-left transition-all"
                style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}
              >
                <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: "rgba(139,92,246,0.15)", border: "1px solid rgba(139,92,246,0.3)" }}>
                  <Film size={14} style={{ color: "#8B5CF6" }} />
                </div>
                <div>
                  <p className="text-xs font-bold text-white">{asset.label}</p>
                  <p className="text-[9px]" style={{ color: "#4B5563" }}>{asset.type}</p>
                </div>
                <Plus size={12} className="ml-auto" style={{ color: "#4B5563" }} />
              </button>
            ))}

            {/* Upload new */}
            <label className="flex items-center gap-2 p-2 rounded-xl cursor-pointer transition-all" style={{ background: "rgba(255,255,255,0.02)", border: "1px dashed rgba(255,255,255,0.08)" }}>
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "rgba(255,255,255,0.04)" }}>
                <Upload size={14} style={{ color: "#6B7280" }} />
              </div>
              <span className="text-xs" style={{ color: "#6B7280" }}>Upload media</span>
              <input type="file" accept="video/*,audio/*,image/*" className="hidden" onChange={e => {
                const file = e.target.files?.[0];
                if (file) {
                  const url = URL.createObjectURL(file);
                  handleAddClip(url, file.name.replace(/\.[^.]+$/, ""), file.type.startsWith("video") ? "video" : file.type.startsWith("audio") ? "audio" : "image");
                }
              }} />
            </label>

            {/* Processed output */}
            {processingResult && (
              <div className="p-2 rounded-xl" style={{ background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.2)" }}>
                <p className="text-[10px] font-bold mb-1" style={{ color: "#10B981" }}>Processed Output</p>
                <button onClick={() => handleAddClip(processingResult.outputUrl, "Processed", "video")} className="w-full text-[10px] py-1 rounded-lg" style={{ background: "rgba(16,185,129,0.15)", color: "#10B981" }}>
                  Add to Timeline
                </button>
              </div>
            )}
          </div>
        </div>

        {/* ── CENTER: MONITOR + TIMELINE ── */}
        <div className="flex-1 flex flex-col overflow-hidden">

          {/* MONITOR */}
          <div className="flex-shrink-0 flex items-center justify-center" style={{ height: 280, background: "#000", borderBottom: "1px solid rgba(255,255,255,0.06)", position: "relative" }}>
            {currentSource ? (
              <video
                ref={videoRef}
                src={currentSource}
                className="h-full"
                style={{ maxWidth: "100%", objectFit: "contain" }}
                muted={isMuted}
                onTimeUpdate={e => setPlayhead((e.target as HTMLVideoElement).currentTime)}
              />
            ) : (
              <div className="flex flex-col items-center gap-2">
                <Film size={32} style={{ color: "#1F2937" }} />
                <p className="text-xs" style={{ color: "#374151" }}>Add clips to the timeline to preview</p>
              </div>
            )}

            {/* Playback controls overlay */}
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-2 px-4 py-2 rounded-2xl" style={{ background: "rgba(0,0,0,0.8)", backdropFilter: "blur(8px)", border: "1px solid rgba(255,255,255,0.08)" }}>
              <button onClick={() => setPlayhead(0)} className="w-7 h-7 rounded-xl flex items-center justify-center" style={{ color: "#9CA3AF" }}><SkipBack size={14} /></button>
              <button onClick={() => {
                setIsPlaying(p => !p);
                if (videoRef.current) { isPlaying ? videoRef.current.pause() : videoRef.current.play(); }
              }} className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: "rgba(255,255,255,0.1)", color: "white" }}>
                {isPlaying ? <Pause size={16} /> : <Play size={16} />}
              </button>
              <button onClick={() => setPlayhead(totalDuration)} className="w-7 h-7 rounded-xl flex items-center justify-center" style={{ color: "#9CA3AF" }}><SkipForward size={14} /></button>
              <span className="text-[10px] font-mono" style={{ color: "#6B7280" }}>{playhead.toFixed(1)}s / {totalDuration}s</span>
              <button onClick={() => setIsMuted(m => !m)} className="w-7 h-7 rounded-xl flex items-center justify-center" style={{ color: "#9CA3AF" }}>
                {isMuted ? <VolumeX size={14} /> : <Volume2 size={14} />}
              </button>
            </div>

            {/* Timecode */}
            <div className="absolute top-3 right-3 px-2 py-1 rounded-lg" style={{ background: "rgba(0,0,0,0.7)", border: "1px solid rgba(255,255,255,0.06)" }}>
              <span className="text-[10px] font-mono" style={{ color: "#6B7280" }}>
                {Math.floor(playhead / 60).toString().padStart(2, "0")}:{(playhead % 60).toFixed(2).padStart(5, "0")}
              </span>
            </div>
          </div>

          {/* TIMELINE */}
          <div className="flex-1 flex flex-col overflow-hidden" style={{ background: "#080808" }}>
            {/* Timeline toolbar */}
            <div className="flex-shrink-0 flex items-center gap-2 px-3 py-2" style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
              <button onClick={() => setZoom(z => Math.max(10, z - 10))} className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ background: "rgba(255,255,255,0.05)", color: "#6B7280" }}><ZoomOut size={12} /></button>
              <span className="text-[10px]" style={{ color: "#4B5563" }}>{zoom}px/s</span>
              <button onClick={() => setZoom(z => Math.min(200, z + 10))} className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ background: "rgba(255,255,255,0.05)", color: "#6B7280" }}><ZoomIn size={12} /></button>
              <div className="w-px h-4 mx-1" style={{ background: "rgba(255,255,255,0.06)" }} />
              <button onClick={() => {
                if (selectedClipId) {
                  const clip = clips.find(c => c.id === selectedClipId);
                  if (clip) {
                    const cutTime = playhead;
                    if (cutTime > clip.startTime && cutTime < clip.startTime + clip.duration) {
                      const firstDuration = cutTime - clip.startTime;
                      const secondDuration = clip.duration - firstDuration;
                      const newClip: TimelineClip = { ...clip, id: Date.now().toString(), startTime: cutTime, duration: secondDuration, trimIn: clip.trimIn + firstDuration };
                      setClips(prev => prev.map(c => c.id === selectedClipId ? { ...c, duration: firstDuration } : c).concat(newClip));
                    }
                  }
                }
              }} className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold" style={{ background: "rgba(255,255,255,0.04)", color: "#6B7280" }}>
                <Scissors size={10} /> Cut (C)
              </button>
              <button onClick={() => { if (selectedClipId) { setClips(prev => prev.filter(c => c.id !== selectedClipId)); setSelectedClipId(null); } }} className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold" style={{ background: "rgba(255,255,255,0.04)", color: "#6B7280" }}>
                <Trash2 size={10} /> Delete
              </button>
              <div className="flex-1" />
              <span className="text-[10px]" style={{ color: "#374151" }}>Space: play/pause · C: cut · Del: delete · ⌘S: save · ⌘E: export</span>
            </div>

            {/* Timeline scroll area */}
            <div className="flex-1 overflow-auto flex">
              {/* Track labels */}
              <div className="flex-shrink-0 flex flex-col" style={{ width: 80, borderRight: "1px solid rgba(255,255,255,0.04)" }}>
                {/* Timecode ruler space */}
                <div style={{ height: 24, borderBottom: "1px solid rgba(255,255,255,0.04)" }} />
                {TRACKS.map(t => (
                  <div key={t.index} className="flex items-center gap-1.5 px-2" style={{ height: 48, borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                    <span style={{ color: t.color }}>{t.icon}</span>
                    <span className="text-[9px] font-bold truncate" style={{ color: "#4B5563" }}>{t.label}</span>
                  </div>
                ))}
              </div>

              {/* Scrollable timeline */}
              <div className="flex-1 overflow-auto">
                {/* Timecode ruler */}
                <div className="relative flex-shrink-0" style={{ height: 24, width: timelineWidth, background: "rgba(0,0,0,0.3)", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                  {Array.from({ length: Math.ceil(totalDuration) + 1 }, (_, i) => (
                    <div key={i} className="absolute top-0 flex flex-col items-center" style={{ left: i * zoom }}>
                      <div style={{ width: 1, height: i % 5 === 0 ? 10 : 5, background: i % 5 === 0 ? "rgba(255,255,255,0.2)" : "rgba(255,255,255,0.06)" }} />
                      {i % 5 === 0 && <span className="text-[8px] mt-0.5" style={{ color: "#374151" }}>{i}s</span>}
                    </div>
                  ))}
                  {/* Playhead */}
                  <div className="absolute top-0 bottom-0 w-px pointer-events-none" style={{ left: playhead * zoom, background: "#EF4444", boxShadow: "0 0 4px #EF4444" }}>
                    <div className="w-2 h-2 rounded-full -translate-x-1/2" style={{ background: "#EF4444" }} />
                  </div>
                </div>

                {/* Tracks */}
                <div className="relative" style={{ width: timelineWidth }}>
                  {TRACKS.map(t => (
                    <TimelineTrack
                      key={t.index}
                      trackIndex={t.index}
                      clips={clips}
                      totalDuration={totalDuration}
                      pixelsPerSecond={zoom}
                      selectedClipId={selectedClipId}
                      onSelectClip={setSelectedClipId}
                      onDeleteClip={id => { setClips(prev => prev.filter(c => c.id !== id)); setSelectedClipId(null); }}
                      onMoveClip={(id, newStart) => updateClipProp(id, "startTime", newStart)}
                    />
                  ))}
                  {/* Playhead line across all tracks */}
                  <div className="absolute top-0 bottom-0 w-px pointer-events-none" style={{ left: playhead * zoom, background: "rgba(239,68,68,0.5)" }} />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── RIGHT: PROPERTIES / EXPORT ── */}
        <div className="flex-shrink-0 flex flex-col overflow-hidden" style={{ width: 260, borderLeft: "1px solid rgba(255,255,255,0.06)", background: "#080808" }}>
          {/* Panel tabs */}
          <div className="flex-shrink-0 flex" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
            {(["properties", "effects", "export"] as const).map(p => (
              <button key={p} onClick={() => setActivePanel(p)} className="flex-1 py-2.5 text-[10px] font-black uppercase tracking-widest transition-all" style={{ background: activePanel === p ? "rgba(255,255,255,0.05)" : "transparent", color: activePanel === p ? "white" : "#4B5563", borderBottom: activePanel === p ? "1.5px solid #8B5CF6" : "1.5px solid transparent" }}>
                {p}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto p-3">
            {activePanel === "properties" && (
              selectedClip ? (
                <div className="flex flex-col gap-3">
                  <p className="text-xs font-black text-white truncate">{selectedClip.label}</p>
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-widest mb-1 block" style={{ color: "#6B7280" }}>Start Time (s)</label>
                    <input type="number" step="0.1" value={selectedClip.startTime.toFixed(1)} onChange={e => updateClipProp(selectedClip.id, "startTime", parseFloat(e.target.value))} className="w-full px-2 py-1.5 rounded-lg text-xs text-white" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", outline: "none" }} />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-widest mb-1 block" style={{ color: "#6B7280" }}>Duration (s)</label>
                    <input type="number" step="0.1" value={selectedClip.duration.toFixed(1)} onChange={e => updateClipProp(selectedClip.id, "duration", parseFloat(e.target.value))} className="w-full px-2 py-1.5 rounded-lg text-xs text-white" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", outline: "none" }} />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-widest mb-1 block" style={{ color: "#6B7280" }}>Volume: {Math.round(selectedClip.volume * 100)}%</label>
                    <input type="range" min={0} max={1} step={0.01} value={selectedClip.volume} onChange={e => updateClipProp(selectedClip.id, "volume", parseFloat(e.target.value))} className="w-full" style={{ accentColor: "#8B5CF6" }} />
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => updateClipProp(selectedClip.id, "muted", !selectedClip.muted)} className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-xl text-[10px] font-bold" style={{ background: selectedClip.muted ? "rgba(239,68,68,0.15)" : "rgba(255,255,255,0.05)", color: selectedClip.muted ? "#EF4444" : "#6B7280", border: "1px solid rgba(255,255,255,0.06)" }}>
                      {selectedClip.muted ? <VolumeX size={10} /> : <Volume2 size={10} />} {selectedClip.muted ? "Unmute" : "Mute"}
                    </button>
                    <button onClick={() => updateClipProp(selectedClip.id, "locked", !selectedClip.locked)} className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-xl text-[10px] font-bold" style={{ background: selectedClip.locked ? "rgba(245,158,11,0.15)" : "rgba(255,255,255,0.05)", color: selectedClip.locked ? "#F59E0B" : "#6B7280", border: "1px solid rgba(255,255,255,0.06)" }}>
                      {selectedClip.locked ? <Lock size={10} /> : <Unlock size={10} />} {selectedClip.locked ? "Locked" : "Lock"}
                    </button>
                  </div>
                  <div className="pt-2" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                    <p className="text-[10px] font-black uppercase tracking-widest mb-2" style={{ color: "#6B7280" }}>Quick Actions</p>
                    <div className="flex flex-col gap-1.5">
                      <button onClick={async () => {
                        if (!selectedClip.sourceUrl.startsWith("http")) { toast.error("Save and process first to generate thumbnail"); return; }
                        try {
                          const result = await genThumbMut.mutateAsync({ contentUrl: selectedClip.sourceUrl, timestampSeconds: playhead });
                          toast.success("Thumbnail generated!");
                        } catch (e: any) { toast.error(e.message); }
                      }} className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold" style={{ background: "rgba(255,255,255,0.04)", color: "#9CA3AF", border: "1px solid rgba(255,255,255,0.06)" }}>
                        <Image size={12} /> Extract Thumbnail at {playhead.toFixed(1)}s
                      </button>
                      <button onClick={async () => {
                        if (!selectedClip.sourceUrl.startsWith("http")) { toast.error("Save and process first"); return; }
                        try {
                          const result = await genCensoredMut.mutateAsync({ contentUrl: selectedClip.sourceUrl, blurIntensity: 8 });
                          toast.success("Censored version generated!");
                        } catch (e: any) { toast.error(e.message); }
                      }} className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold" style={{ background: "rgba(255,255,255,0.04)", color: "#9CA3AF", border: "1px solid rgba(255,255,255,0.06)" }}>
                        <Shield size={12} /> Generate Censored Version
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-32 gap-2">
                  <Layers size={24} style={{ color: "#1F2937" }} />
                  <p className="text-xs text-center" style={{ color: "#374151" }}>Click a clip in the timeline to edit its properties</p>
                </div>
              )
            )}

            {activePanel === "effects" && (
              <div className="flex flex-col gap-2">
                <p className="text-[10px] font-black uppercase tracking-widest mb-1" style={{ color: "#6B7280" }}>Apply to Selected Clip</p>
                {selectedClip ? (
                  [
                    { id: "blur",       label: "Blur Censor",    desc: "Gaussian blur for censoring",   color: "#8B5CF6" },
                    { id: "pixelate",   label: "Mosaic/Pixelate", desc: "Pixel mosaic effect",          color: "#3B82F6" },
                    { id: "golden_hour", label: "Golden Hour",   desc: "Warm color grade",              color: "#F59E0B" },
                    { id: "cold_steel", label: "Cold Steel",     desc: "Cool blue tone",                color: "#60A5FA" },
                    { id: "loudnorm",   label: "Audio Normalize", desc: "EBU R128 loudness",            color: "#10B981" },
                    { id: "2x",         label: "Speed 2×",       desc: "Double playback speed",        color: "#EC4899" },
                  ].map(fx => (
                    <button key={fx.id} onClick={() => {
                      if (selectedClip) {
                        updateClipProp(selectedClip.id, "effects", [...selectedClip.effects, fx.id]);
                        toast.success(`${fx.label} queued — process to apply`);
                      }
                    }} className="flex items-center gap-2 p-2 rounded-xl text-left" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
                      <div className="w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: `${fx.color}20` }}>
                        <Wand2 size={10} style={{ color: fx.color }} />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-white">{fx.label}</p>
                        <p className="text-[9px]" style={{ color: "#4B5563" }}>{fx.desc}</p>
                      </div>
                      {selectedClip.effects.includes(fx.id) && <CheckCircle size={12} className="ml-auto" style={{ color: "#22C55E" }} />}
                    </button>
                  ))
                ) : (
                  <p className="text-xs" style={{ color: "#374151" }}>Select a clip first</p>
                )}
              </div>
            )}

            {activePanel === "export" && (
              <div className="flex flex-col gap-3">
                {/* Automated Director toggle */}
                <div
                  className="flex items-center justify-between p-2.5 rounded-xl cursor-pointer"
                  style={{ background: directorMode ? "rgba(139,92,246,0.12)" : "rgba(255,255,255,0.03)", border: `1px solid ${directorMode ? "rgba(139,92,246,0.4)" : "rgba(255,255,255,0.06)"}` }}
                  onClick={() => setDirectorMode(d => !d)}
                >
                  <div>
                    <p className="text-xs font-black" style={{ color: directorMode ? "#A78BFA" : "#6B7280" }}>✨ Automated Director</p>
                    <p className="text-[9px]" style={{ color: "#4B5563" }}>Desire-Grade + AI Pacing + Viral Template</p>
                  </div>
                  <div className="w-8 h-4 rounded-full relative flex-shrink-0" style={{ background: directorMode ? "#7C3AED" : "#374151" }}>
                    <div className="absolute top-0.5 w-3 h-3 rounded-full bg-white transition-all" style={{ left: directorMode ? "18px" : "2px" }} />
                  </div>
                </div>

                {directorMode && (
                  <>
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-widest mb-1" style={{ color: "#6B7280" }}>Hook Text</p>
                      <input
                        value={hookText}
                        onChange={e => setHookText(e.target.value)}
                        maxLength={80}
                        className="w-full px-2.5 py-2 rounded-xl text-xs text-white outline-none"
                        style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}
                        placeholder="You need to see this"
                      />
                    </div>
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-widest mb-1" style={{ color: "#6B7280" }}>Outro CTA</p>
                      <input
                        value={ctaText}
                        onChange={e => setCtaText(e.target.value)}
                        maxLength={80}
                        className="w-full px-2.5 py-2 rounded-xl text-xs text-white outline-none"
                        style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}
                        placeholder="Subscribe for full access"
                      />
                    </div>
                    <div
                      className="flex items-center justify-between p-2 rounded-xl cursor-pointer"
                      style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}
                      onClick={() => setEnableAIPacing(p => !p)}
                    >
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-widest" style={{ color: "#6B7280" }}>AI Pacing</p>
                        <p className="text-[9px]" style={{ color: "#4B5563" }}>1.2x speed on slow scenes + xfade transitions</p>
                      </div>
                      <div className="w-8 h-4 rounded-full relative flex-shrink-0" style={{ background: enableAIPacing ? "#10B981" : "#374151" }}>
                        <div className="absolute top-0.5 w-3 h-3 rounded-full bg-white transition-all" style={{ left: enableAIPacing ? "18px" : "2px" }} />
                      </div>
                    </div>
                  </>
                )}

                <p className="text-[10px] font-black uppercase tracking-widest" style={{ color: "#6B7280" }}>Platform</p>
                {EXPORT_PRESETS.map(preset => (
                  <button key={preset.id} onClick={() => setSelectedPreset(preset.id)} className="flex items-center gap-2 p-2.5 rounded-xl text-left transition-all" style={{ background: selectedPreset === preset.id ? `${preset.color}15` : "rgba(255,255,255,0.03)", border: `1px solid ${selectedPreset === preset.id ? preset.color + "50" : "rgba(255,255,255,0.06)"}` }}>
                    <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: selectedPreset === preset.id ? preset.color : "#374151" }} />
                    <div>
                      <p className="text-xs font-bold" style={{ color: selectedPreset === preset.id ? preset.color : "#9CA3AF" }}>{preset.label}</p>
                      <p className="text-[9px]" style={{ color: "#4B5563" }}>{preset.desc}</p>
                    </div>
                  </button>
                ))}

                {exportResult ? (
                  <div className="p-3 rounded-xl" style={{ background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.2)" }}>
                    <div className="flex items-center gap-2 mb-2">
                      <CheckCircle size={14} style={{ color: "#10B981" }} />
                      <span className="text-xs font-bold" style={{ color: "#10B981" }}>Export Complete</span>
                    </div>
                    <p className="text-[10px] mb-2" style={{ color: "#6B7280" }}>Processed in {(exportResult.processingTime / 1000).toFixed(1)}s</p>
                    {exportResult.steps && exportResult.steps.length > 0 && (
                      <div className="mb-2 flex flex-col gap-1">
                        {exportResult.steps.map((step, i) => (
                          <div key={i} className="flex items-start gap-1.5">
                            <div className="w-1.5 h-1.5 rounded-full mt-1 flex-shrink-0" style={{ background: "#10B981" }} />
                            <p className="text-[9px]" style={{ color: "#6B7280" }}>{step}</p>
                          </div>
                        ))}
                      </div>
                    )}
                    <a href={exportResult.downloadUrl} download className="flex items-center justify-center gap-1.5 w-full py-2 rounded-xl text-xs font-bold" style={{ background: "rgba(16,185,129,0.2)", color: "#10B981", border: "1px solid rgba(16,185,129,0.3)" }}>
                      <Download size={12} /> Download Cinematic Output
                    </a>
                    <button onClick={() => setExportResult(null)} className="w-full mt-1.5 py-1.5 rounded-xl text-[10px]" style={{ color: "#6B7280" }}>Export Again</button>
                  </div>
                ) : (
                  <button
                    onClick={handleExport}
                    disabled={directorMut.isPending || exportMut.isPending}
                    className="w-full py-3 rounded-2xl text-sm font-black"
                    style={{
                      background: (directorMut.isPending || exportMut.isPending)
                        ? "rgba(255,255,255,0.05)"
                        : directorMode ? "rgba(139,92,246,0.2)" : "rgba(16,185,129,0.2)",
                      color: (directorMut.isPending || exportMut.isPending)
                        ? "#4B5563"
                        : directorMode ? "#A78BFA" : "#10B981",
                      border: `1px solid ${(directorMut.isPending || exportMut.isPending)
                        ? "rgba(255,255,255,0.06)"
                        : directorMode ? "rgba(139,92,246,0.4)" : "rgba(16,185,129,0.4)"}`,
                    }}
                  >
                    {(directorMut.isPending || exportMut.isPending)
                      ? <><Loader2 size={14} className="animate-spin inline mr-2" />{directorMode ? "Directing..." : "Exporting..."}</>
                      : directorMode
                        ? <><HardDrive size={14} className="inline mr-2" />✨ Director Export</>
                        : <><HardDrive size={14} className="inline mr-2" />Export Now</>}
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── PROJECT LIST OVERLAY ── */}
      {showProjectList && (
        <div className="absolute inset-0 z-50 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.8)", backdropFilter: "blur(8px)" }}>
          <div className="flex flex-col overflow-hidden rounded-2xl" style={{ width: 480, maxHeight: "70vh", background: "#0F0F0F", border: "1px solid rgba(255,255,255,0.08)" }}>
            <div className="flex items-center justify-between p-4" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
              <p className="text-sm font-black text-white">My Projects</p>
              <button onClick={() => setShowProjectList(false)} className="w-7 h-7 rounded-xl flex items-center justify-center" style={{ background: "rgba(255,255,255,0.06)", color: "#9CA3AF" }}>✕</button>
            </div>
            <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-2">
              {myProjectsQ.isLoading ? (
                <div className="flex items-center justify-center py-8"><Loader2 size={20} className="animate-spin" style={{ color: "#6B7280" }} /></div>
              ) : myProjectsQ.data?.projects?.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 gap-2">
                  <Film size={24} style={{ color: "#1F2937" }} />
                  <p className="text-sm" style={{ color: "#374151" }}>No projects yet</p>
                </div>
              ) : myProjectsQ.data?.projects?.map((p: any) => (
                <button key={p.id} onClick={() => {
                  setProjectId(p.id);
                  setProject({ title: p.title, projectType: p.project_type, aspectRatio: p.aspect_ratio || "9:16", durationSeconds: p.duration_seconds || 60 });
                  if (p.timeline_data) {
                    try {
                      const td = JSON.parse(p.timeline_data);
                      if (td.clips) setClips(td.clips);
                      if (td.textOverlays) setTextOverlays(td.textOverlays);
                      if (td.totalDuration) setTotalDuration(td.totalDuration);
                    } catch {}
                  }
                  if (p.output_url) setCurrentSource(p.output_url);
                  setShowProjectList(false);
                  toast.success(`Loaded: ${p.title}`);
                }} className="flex items-center gap-3 p-3 rounded-xl text-left" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: "rgba(139,92,246,0.15)", border: "1px solid rgba(139,92,246,0.3)" }}>
                    <Film size={18} style={{ color: "#8B5CF6" }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-white truncate">{p.title}</p>
                    <p className="text-xs" style={{ color: "#6B7280" }}>{p.project_type} · {p.aspect_ratio} · {new Date(p.created_at).toLocaleDateString()}</p>
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
