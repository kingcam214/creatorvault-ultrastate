import { type ChangeEvent, type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "wouter";
import {
  Captions,
  Check,
  Clock,
  DollarSign,
  Download,
  Eye,
  Gauge,
  Lock,
  Pause,
  Play,
  Save,
  Scissors,
  Send,
  ShieldCheck,
  Upload,
  Wand2,
  Layers,
  Undo2,
  Redo2,
  Magnet,
  Copy,
  Trash2,
  Film,
  Music,
  Type,
  Zap,
  RefreshCw,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { Timeline, type TimelineClip } from "@/components/videoeditor/Timeline";

const accent = "#F2B15B";
const storageKey = "vaultx-editor-command-draft-v2";

type EditorTab = "timeline" | "style" | "captions" | "publish";
type AspectChoice = "9:16" | "16:9" | "1:1";
type StyleChoice = "Luxe Glow" | "Cinematic Heat" | "Soft Skin" | "After Dark";
type CaptionChoice = "Clean Lower" | "Bold Hook" | "Minimal Whisper";
type DestinationChoice = "VaultX Unlock" | "Subscriber Drop" | "Fan Preview";
type RenderStatus = "idle" | "building" | "submitting" | "rendering" | "complete" | "error";

interface EditorDraft {
  activeTab: EditorTab;
  aspect: AspectChoice;
  selectedStyle: StyleChoice;
  captionStyle: CaptionChoice;
  captionsOn: boolean;
  previewLength: number;
  unlockAt: number;
  price: string;
  destination: DestinationChoice;
  hook: string;
  cta: string;
  note: string;
  watermark: boolean;
  consentCheck: boolean;
  safeTease: boolean;
}

const defaultDraft: EditorDraft = {
  activeTab: "timeline",
  aspect: "9:16",
  selectedStyle: "Cinematic Heat",
  captionStyle: "Bold Hook",
  captionsOn: true,
  previewLength: 14,
  unlockAt: 22,
  price: "19.99",
  destination: "VaultX Unlock",
  hook: "Watch the preview. The full drop is locked inside.",
  cta: "Unlock the full drop",
  note: "Lead with the strongest tease, keep the payoff private, and route the buyer straight to unlock.",
  watermark: true,
  consentCheck: true,
  safeTease: true,
};

const styles: Array<{ label: StyleChoice; tone: string; note: string; gradient: string }> = [
  { label: "Luxe Glow", tone: "Premium, polished, soft-gold finish", note: "Brightens the preview while keeping the frame elevated and creator-safe.", gradient: "from-[#f7d27a] via-[#9f5e1a] to-black" },
  { label: "Cinematic Heat", tone: "Trailer energy with rich contrast", note: "Built for high-intent previews where the fan should feel the full drop is worth paying for.", gradient: "from-[#ffb347] via-[#6c1010] to-[#050505]" },
  { label: "Soft Skin", tone: "Warm, intimate, soft-focus", note: "Ideal for close-up content that needs to feel personal and premium without harsh edges.", gradient: "from-[#ffd6b0] via-[#a06040] to-[#1a0a00]" },
  { label: "After Dark", tone: "Moody, high-contrast noir", note: "Maximum intrigue. Best when the preview is short and the unlock is the payoff.", gradient: "from-[#2a0a3a] via-[#0a0a1a] to-black" },
];

const destinations: DestinationChoice[] = ["VaultX Unlock", "Subscriber Drop", "Fan Preview"];

function loadDraft(): EditorDraft {
  if (typeof window === "undefined") return defaultDraft;
  try {
    const saved = window.localStorage.getItem(storageKey);
    if (!saved) return defaultDraft;
    return { ...defaultDraft, ...JSON.parse(saved) };
  } catch { return defaultDraft; }
}

function formatTime(value: number) {
  const safe = Number.isFinite(value) ? Math.max(0, value) : 0;
  const minutes = Math.floor(safe / 60);
  const seconds = Math.floor(safe % 60);
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function Panel({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <section className={`rounded-[2rem] border border-white/10 bg-[#0e0e0e]/92 shadow-2xl shadow-black/30 ${className}`}>{children}</section>;
}

function TapButton({ active, children, onClick, className = "" }: { active?: boolean; children: ReactNode; onClick: () => void; className?: string }) {
  return (
    <button type="button" onClick={onClick} className={`min-h-12 rounded-2xl px-4 py-3 text-sm font-black transition active:scale-[0.98] ${active ? "bg-[#F2B15B] text-black shadow-[0_0_30px_rgba(242,177,91,0.24)]" : "border border-white/10 bg-white/[0.04] text-zinc-200 hover:border-[#F2B15B]/70 hover:text-white"} ${className}`}>
      {children}
    </button>
  );
}

function StatPill({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/35 p-3">
      <div className="mb-2 flex items-center gap-2 text-[#F2B15B]">{icon}<span className="text-[0.68rem] font-black uppercase tracking-[0.18em] text-zinc-500">{label}</span></div>
      <p className="text-sm font-black text-white">{value}</p>
    </div>
  );
}

function ReadinessRing({ score }: { score: number }) {
  const color = score >= 85 ? "#5ee6a8" : score >= 65 ? accent : "#f97373";
  return (
    <div className="relative flex h-24 w-24 shrink-0 items-center justify-center rounded-full" style={{ background: `conic-gradient(${color} ${score * 3.6}deg, rgba(255,255,255,0.08) 0deg)` }}>
      <div className="flex h-[4.85rem] w-[4.85rem] flex-col items-center justify-center rounded-full bg-[#080808]">
        <span className="text-2xl font-black text-white">{score}</span>
        <span className="text-[0.62rem] font-black uppercase tracking-[0.16em] text-zinc-500">ready</span>
      </div>
    </div>
  );
}

function VaultXEditor() {
  const initialDraft = useMemo(loadDraft, []);
  const [activeTab, setActiveTab] = useState<EditorTab>(initialDraft.activeTab);
  const [aspect, setAspect] = useState<AspectChoice>(initialDraft.aspect);
  const [selectedStyle, setSelectedStyle] = useState<StyleChoice>(initialDraft.selectedStyle);
  const [captionStyle, setCaptionStyle] = useState<CaptionChoice>(initialDraft.captionStyle);
  const [captionsOn, setCaptionsOn] = useState(initialDraft.captionsOn);
  const [previewLength, setPreviewLength] = useState(initialDraft.previewLength);
  const [unlockAt, setUnlockAt] = useState(initialDraft.unlockAt);
  const [price, setPrice] = useState(initialDraft.price);
  const [destination, setDestination] = useState<DestinationChoice>(initialDraft.destination);
  const [hook, setHook] = useState(initialDraft.hook);
  const [cta, setCta] = useState(initialDraft.cta);
  const [note, setNote] = useState(initialDraft.note);
  const [watermark, setWatermark] = useState(initialDraft.watermark);
  const [consentCheck, setConsentCheck] = useState(initialDraft.consentCheck);
  const [safeTease, setSafeTease] = useState(initialDraft.safeTease);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [fileName, setFileName] = useState("");
  const [fileMeta, setFileMeta] = useState("");
  // First-time onboarding overlay
  const [showOnboarding, setShowOnboarding] = useState(() => {
    try { return !window.localStorage.getItem("vaultx-editor-seen-v1"); } catch { return true; }
  });
  const dismissOnboarding = () => {
    try { window.localStorage.setItem("vaultx-editor-seen-v1", "1"); } catch {}
    setShowOnboarding(false);
  };
  const [duration, setDuration] = useState(60);
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [saveState, setSaveState] = useState("Draft autosaves on device");
  const [renderStatus, setRenderStatus] = useState<RenderStatus>("idle");
  const [renderResult, setRenderResult] = useState<any>(null);
  const [costEstimate, setCostEstimate] = useState<any[]>([]);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  // Timeline state
  const [timelineClips, setTimelineClips] = useState<TimelineClip[]>([]);
  const [selectedClipId, setSelectedClipId] = useState<string | null>(null);

  // tRPC mutations for Render Graph
  const buildGraph = trpc.renderGraph.buildFromTimeline.useMutation();
  const submitRender = trpc.renderGraph.submit.useMutation();
  const estimateCost = trpc.renderGraph.estimateCost.useQuery(
    { graph: renderResult?.graph },
    { enabled: Boolean(renderResult?.graph), retry: false }
  );

  // Compliance check
  const compliance = trpc.compliance.checkEligibility.useQuery(
    { jurisdiction: "GLOBAL" },
    { retry: false }
  );

  const maxDuration = Math.max(30, Math.round(duration || 60));
  const effectivePreviewLength = clamp(previewLength, 6, Math.min(30, maxDuration));
  const effectiveUnlockAt = clamp(unlockAt, effectivePreviewLength + 1, maxDuration);
  const paidPrice = Number.parseFloat(price) || 0;

  // Readiness scoring
  const readinessItems = [
    { label: "Source uploaded", done: Boolean(videoUrl) },
    { label: "Timeline has clips", done: timelineClips.length > 0 },
    { label: "Style selected", done: Boolean(selectedStyle) },
    { label: "Captions configured", done: captionsOn },
    { label: "Price set", done: paidPrice >= 1 },
    { label: "Consent confirmed", done: consentCheck },
    { label: "Safe tease enabled", done: safeTease },
    { label: "Compliance passed", done: compliance.data?.eligible !== false },
  ];
  const readinessScore = Math.round((readinessItems.filter(i => i.done).length / readinessItems.length) * 100);
  const launchReady = readinessScore >= 85;

  // Auto-save draft
  useEffect(() => {
    const draft: EditorDraft = { activeTab, aspect, selectedStyle, captionStyle, captionsOn, previewLength, unlockAt, price, destination, hook, cta, note, watermark, consentCheck, safeTease };
    try { window.localStorage.setItem(storageKey, JSON.stringify(draft)); } catch {}
  }, [activeTab, aspect, selectedStyle, captionStyle, captionsOn, previewLength, unlockAt, price, destination, hook, cta, note, watermark, consentCheck, safeTease]);

  // Handle file upload and auto-create timeline clip
  function handleUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    setVideoUrl(url);
    setFileName(file.name);
    setFileMeta(`${(file.size / (1024 * 1024)).toFixed(1)} MB`);

    // Auto-create a timeline clip from the uploaded file
    const newClip: TimelineClip = {
      id: `clip-${Date.now()}`,
      name: file.name,
      src: url,
      duration: 60, // will be updated on metadata load
      trimStart: 0,
      trimEnd: 60,
      trackIndex: 0,
      startOffset: timelineClips.reduce((max, c) => Math.max(max, c.startOffset + (c.trimEnd - c.trimStart)), 0),
      type: file.type.startsWith("audio") ? "audio" : "video",
    };
    setTimelineClips(prev => [...prev, newClip]);
    setSelectedClipId(newClip.id);
  }

  // Handle timeline clip updates from Timeline component
  const handleClipUpdate = useCallback((clipId: string, updates: Partial<TimelineClip>) => {
    setTimelineClips(prev => prev.map(c => c.id === clipId ? { ...c, ...updates } : c));
  }, []);

  const handleClipRemove = useCallback((clipId: string) => {
    setTimelineClips(prev => prev.filter(c => c.id !== clipId));
    if (selectedClipId === clipId) setSelectedClipId(null);
  }, [selectedClipId]);

  const handleSplit = useCallback((clipId: string, time: number) => {
    setTimelineClips(prev => {
      const clip = prev.find(c => c.id === clipId);
      if (!clip) return prev;
      const relativeTime = time - clip.startOffset + clip.trimStart;
      if (relativeTime <= clip.trimStart || relativeTime >= clip.trimEnd) return prev;
      const leftClip: TimelineClip = { ...clip, id: `${clip.id}-L`, trimEnd: relativeTime };
      const rightClip: TimelineClip = { ...clip, id: `${clip.id}-R`, trimStart: relativeTime, startOffset: clip.startOffset + (relativeTime - clip.trimStart) };
      return prev.map(c => c.id === clipId ? leftClip : c).concat(rightClip);
    });
  }, []);

  // Build Render Graph from timeline
  async function handleBuildRenderGraph() {
    if (timelineClips.length === 0) return;
    setRenderStatus("building");
    try {
      const clips = timelineClips.map(c => ({
        src: c.src || c.assetUrl || c.url || c.sourceUrl || "",
        trimStart: c.trimStart,
        trimEnd: c.trimEnd,
        startOffset: c.startOffset,
        type: c.type,
      }));
      const result = await buildGraph.mutateAsync({
        clips,
        colorGrade: selectedStyle,
        watermarkText: watermark ? "CreatorVault" : undefined,
        platform: destination === "VaultX Unlock" ? "vaultx" : "telegram",
        quality: "high",
        aspectRatio: aspect,
      });
      setRenderResult(result);
      setRenderStatus(result.validation.valid ? "idle" : "error");
      setSaveState(result.validation.valid ? "Render graph built successfully" : `Graph errors: ${result.validation.errors.join(", ")}`);
    } catch (err: any) {
      setRenderStatus("error");
      setSaveState(`Build failed: ${err?.message || "Unknown error"}`);
    }
  }

  // Submit render to cloud provider
  async function handleSubmitRender() {
    if (!renderResult?.graph) return;
    setRenderStatus("submitting");
    try {
      const result = await submitRender.mutateAsync({ graph: renderResult.graph });
      if (result.error) {
        setRenderStatus("error");
        setSaveState(`Render error: ${result.error}`);
      } else {
        setRenderStatus("rendering");
        setSaveState("Render submitted to cloud provider. Polling for completion...");
      }
    } catch (err: any) {
      setRenderStatus("error");
      setSaveState(`Submit failed: ${err?.message || "Unknown error"}`);
    }
  }

  // Export package (sends to Studio)
  function exportPackage() {
    const payload = JSON.stringify({
      clips: timelineClips,
      style: selectedStyle,
      captionStyle,
      captionsOn,
      previewLength: effectivePreviewLength,
      unlockAt: effectiveUnlockAt,
      price: paidPrice,
      destination,
      hook,
      cta,
      watermark,
      consentCheck,
      safeTease,
      renderGraph: renderResult?.graph || null,
      aspect,
      readinessScore,
      exportedAt: new Date().toISOString(),
      nextStep: launchReady ? "Open /vault-x/studio and attach this package to the Body Cinema command rail." : "Resolve all readiness gaps before launch.",
    }, null, 2);
    const blob = new Blob([payload], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `vaultx-launch-package-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    setSaveState("Launch package exported.");
  }

  function saveDraft() {
    setSaveState("Draft saved.");
  }

  const aspectClass = aspect === "16:9" ? "aspect-video max-w-5xl" : aspect === "1:1" ? "aspect-square max-w-[520px]" : "aspect-[9/16] max-w-[430px]";

  return (
    <main className="min-h-screen bg-[#050505] pb-24 text-white lg:pb-8">

      {/* First-time onboarding overlay */}
      {showOnboarding && (
        <div style={{ position: "fixed", inset: 0, zIndex: 100, background: "rgba(0,0,0,0.92)", display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }}>
          <div style={{ maxWidth: 420, width: "100%", background: "#111", border: "1px solid rgba(242,177,91,0.3)", borderRadius: 20, padding: "28px 24px" }}>
            <div style={{ fontSize: 11, color: "#F2B15B", fontFamily: "monospace", letterSpacing: "0.18em", textTransform: "uppercase", marginBottom: 8 }}>VaultX Body Cinema Editor</div>
            <h2 style={{ fontSize: 26, fontWeight: 900, margin: "0 0 12px", lineHeight: 1.2 }}>Trim your video.<br />Set a price. Get paid.</h2>
            <p style={{ fontSize: 14, color: "rgba(255,255,255,0.55)", lineHeight: 1.6, marginBottom: 20 }}>This editor turns your raw clip into a premium drop. Upload your video, pick a cinematic style, set your unlock price, and export. That's it.</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 20 }}>
              {[
                ["📤", "Upload", "Tap \"Upload clip\" to add your video"],
                ["🎨", "Style", "Pick a cinematic look from the Style tab"],
                ["💰", "Price", "Set your unlock price in the Publish tab"],
                ["📦", "Export", "Hit \"Export drop package\" at the bottom"],
              ].map(([emoji, title, desc]) => (
                <div key={title} style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                  <span style={{ fontSize: 18, flexShrink: 0 }}>{emoji}</span>
                  <div>
                    <p style={{ fontSize: 13, fontWeight: 800, margin: 0 }}>{title}</p>
                    <p style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", margin: "2px 0 0" }}>{desc}</p>
                  </div>
                </div>
              ))}
            </div>
            <button
              onClick={dismissOnboarding}
              style={{ width: "100%", padding: "14px", borderRadius: 12, background: "#F2B15B", color: "#000", fontWeight: 900, fontSize: 15, border: "none", cursor: "pointer" }}
            >
              Got it — let me upload my video
            </button>
            <p style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", textAlign: "center", marginTop: 10 }}>You won't see this again</p>
          </div>
        </div>
      )}
      <div className="mx-auto max-w-7xl space-y-5 px-3 py-5 md:px-6">
        {/* Hero */}
        <Panel className="overflow-hidden p-4 md:p-6 lg:p-8">
          <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
            <div>
              <div className="mb-4 flex flex-wrap gap-2">
                <span className="inline-flex rounded-full border border-[#F2B15B]/40 bg-[#F2B15B]/10 px-3 py-1 text-[0.68rem] font-black uppercase tracking-[0.18em] text-[#F2B15B]">VaultX Body Cinema Editor</span>
                <span className="inline-flex rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[0.68rem] font-black uppercase tracking-[0.18em] text-zinc-400">Multi-track timeline + Cloud render</span>
              </div>
              <h1 className="max-w-4xl text-3xl font-black uppercase leading-[0.92] tracking-[-0.04em] text-white sm:text-5xl lg:text-6xl">
                Shape. Render. Monetize.
              </h1>
              <p className="mt-4 max-w-3xl text-base leading-7 text-zinc-300 md:text-lg">
                A real multi-track timeline editor connected to cloud rendering. Drag, trim, split, snap clips — then render through the Render Graph pipeline. No ffmpeg. No fake panels. Every button calls a real backend.
              </p>
              <div className="mt-5 grid gap-3 sm:grid-cols-4">
                <StatPill icon={<Layers size={18} />} label="Clips" value={`${timelineClips.length} on timeline`} />
                <StatPill icon={<Scissors size={18} />} label="Public cut" value={`${formatTime(effectivePreviewLength)} preview`} />
                <StatPill icon={<Lock size={18} />} label="Unlock beat" value={formatTime(effectiveUnlockAt)} />
                <StatPill icon={<DollarSign size={18} />} label="Drop price" value={paidPrice > 0 ? `$${paidPrice.toFixed(2)}` : "Set price"} />
              </div>
            </div>
            <div className="rounded-[1.75rem] border border-white/10 bg-black/45 p-4">
              <div className="flex items-center justify-between gap-4 mb-4">
                <ReadinessRing score={readinessScore} />
                <div>
                  <p className="text-lg font-black text-white">Launch readiness</p>
                  <p className="mt-1 text-sm leading-6 text-zinc-400">Real-time scoring of source, timeline, style, compliance, and money path.</p>
                </div>
              </div>
              <div className="space-y-2">
                {readinessItems.map((item) => (
                  <div key={item.label} className="flex items-center justify-between gap-3 rounded-2xl bg-white/[0.035] px-3 py-2">
                    <span className="text-sm text-zinc-300">{item.label}</span>
                    <span className={`inline-flex h-6 w-6 items-center justify-center rounded-full ${item.done ? "bg-emerald-400 text-black" : "bg-white/10 text-zinc-500"}`}>{item.done ? <Check size={15} /> : null}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Panel>

        {/* Upload + Actions Bar */}
        <Panel className="p-4 md:p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <label className="inline-flex min-h-12 cursor-pointer items-center justify-center gap-2 rounded-full border border-[#F2B15B]/70 bg-[#F2B15B] px-5 py-3 text-sm font-black text-black transition hover:brightness-110 active:scale-[0.98]">
                <Upload size={18} /> Upload clip
                <input type="file" accept="video/*,audio/*" className="hidden" onChange={handleUpload} />
              </label>
              {fileName && <span className="text-sm text-zinc-400">{fileName} ({fileMeta})</span>}
            </div>
            <div className="flex items-center gap-2">
              <button type="button" onClick={exportPackage} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-[#F2B15B] px-4 py-3 font-black text-black transition hover:brightness-110"><Download size={18} /> Export package</button>
              <Link href="/vault-x/studio" className={`inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl px-4 py-3 font-black transition ${launchReady ? "border border-emerald-400/40 bg-emerald-400/10 text-emerald-100 hover:border-emerald-300" : "border border-white/10 bg-white/[0.035] text-zinc-500"}`}>Open Studio</Link>
            </div>
          </div>
          <p className="mt-3 text-xs font-bold text-zinc-500">{saveState}</p>
        </Panel>

        {/* Tab Navigation */}
        <Panel className="overflow-hidden p-4 md:p-6">
          <div className="mb-5 grid gap-2 rounded-[1.35rem] border border-white/10 bg-black p-2 md:grid-cols-4">
            {([["timeline", "Timeline"], ["style", "Style"], ["captions", "Captions"], ["publish", "Publish"]] as Array<[EditorTab, string]>).map(([id, label]) => (
              <button key={id} type="button" onClick={() => setActiveTab(id)} className={`min-h-12 rounded-2xl px-4 py-3 font-black transition active:scale-[0.98] ${activeTab === id ? "bg-[#F2B15B] text-black" : "text-zinc-300 hover:bg-white/10 hover:text-white"}`}>{label}</button>
            ))}
          </div>

          {/* TIMELINE TAB — Real Timeline Component */}
          {activeTab === "timeline" && (
            <div className="space-y-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-black uppercase tracking-[0.16em] text-[#F2B15B]">Multi-track timeline</p>
                  <h2 className="mt-1 text-2xl font-black text-white">Drag, trim, split, snap — real editing</h2>
                </div>
                <div className="grid grid-cols-3 gap-2 rounded-full border border-white/10 bg-black p-1">
                  {(["9:16", "16:9", "1:1"] as AspectChoice[]).map((choice) => (
                    <button key={choice} type="button" onClick={() => setAspect(choice)} className={`min-h-10 rounded-full px-3 text-sm font-black transition ${aspect === choice ? "bg-[#F2B15B] text-black" : "text-zinc-400 hover:text-white"}`}>{choice}</button>
                  ))}
                </div>
              </div>

              {/* Video Preview */}
              {videoUrl && (
                <div className="flex justify-center rounded-[1.75rem] border border-white/10 bg-black/70 p-3">
                  <div className={`relative w-full overflow-hidden rounded-[1.5rem] border border-white/10 bg-black shadow-2xl ${aspectClass}`}>
                    <video
                      ref={videoRef}
                      src={videoUrl}
                      playsInline
                      preload="metadata"
                      className="h-full w-full object-cover"
                      onLoadedMetadata={(event) => {
                        const nextDuration = event.currentTarget.duration;
                        if (Number.isFinite(nextDuration) && nextDuration > 0) {
                          setDuration(nextDuration);
                          // Update the first clip's duration
                          setTimelineClips(prev => prev.map((c, i) => i === 0 ? { ...c, duration: nextDuration, trimEnd: nextDuration } : c));
                        }
                      }}
                      onTimeUpdate={(event) => setCurrentTime(event.currentTarget.currentTime)}
                      onPlay={() => setIsPlaying(true)}
                      onPause={() => setIsPlaying(false)}
                    />
                    <div className="absolute bottom-3 left-3 right-3 flex items-center gap-3 rounded-2xl bg-black/80 px-4 py-2 backdrop-blur-xl">
                      <button type="button" onClick={() => { if (videoRef.current) { isPlaying ? videoRef.current.pause() : videoRef.current.play(); } }} className="text-white">
                        {isPlaying ? <Pause size={20} /> : <Play size={20} />}
                      </button>
                      <span className="text-xs font-black text-zinc-300">{formatTime(currentTime)} / {formatTime(duration)}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Real Timeline Component */}
              <div className="rounded-[1.5rem] border border-white/10 bg-black/55 p-2">
                <Timeline
                  clips={timelineClips}
                  currentTime={currentTime}
                  totalDuration={duration}
                  selectedClipId={selectedClipId}
                  onSelectClip={setSelectedClipId}
                  onSeek={(time) => { setCurrentTime(time); if (videoRef.current) videoRef.current.currentTime = time; }}
                  onClipRemove={handleClipRemove}
                  onSplit={handleSplit}
                  onClipUpdate={handleClipUpdate}
                />
              </div>

              {/* Render Graph Controls */}
              <div className="rounded-[1.5rem] border border-white/10 bg-black/55 p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm font-black uppercase tracking-[0.16em] text-[#F2B15B]">Cloud Render Pipeline</p>
                    <p className="mt-1 text-sm text-zinc-400">Build a render graph from your timeline, then submit to cloud rendering (no ffmpeg).</p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={handleBuildRenderGraph}
                      disabled={timelineClips.length === 0 || renderStatus === "building"}
                      className="inline-flex min-h-12 items-center gap-2 rounded-2xl border border-[#F2B15B]/70 bg-[#F2B15B]/10 px-4 py-3 text-sm font-black text-[#F2B15B] transition hover:bg-[#F2B15B]/20 disabled:opacity-40"
                    >
                      <Zap size={16} /> {renderStatus === "building" ? "Building..." : "Build Graph"}
                    </button>
                    <button
                      type="button"
                      onClick={handleSubmitRender}
                      disabled={!renderResult?.graph || renderStatus === "submitting" || renderStatus === "rendering"}
                      className="inline-flex min-h-12 items-center gap-2 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 px-4 py-3 text-sm font-black text-emerald-300 transition hover:bg-emerald-500/30 disabled:opacity-40"
                    >
                      <RefreshCw size={16} /> {renderStatus === "rendering" ? "Rendering..." : "Submit Render"}
                    </button>
                  </div>
                </div>
                {renderResult?.validation && (
                  <div className={`mt-3 rounded-2xl p-3 text-sm ${renderResult.validation.valid ? "bg-emerald-500/10 border border-emerald-500/30 text-emerald-300" : "bg-red-500/10 border border-red-500/30 text-red-300"}`}>
                    {renderResult.validation.valid ? `Graph valid: ${renderResult.graph?.nodes?.length || 0} nodes, ready to render` : `Errors: ${renderResult.validation.errors?.join(", ")}`}
                  </div>
                )}
                {estimateCost.data && estimateCost.data.length > 0 && (
                  <div className="mt-3 grid gap-2 md:grid-cols-2">
                    {estimateCost.data.map((est: any) => (
                      <div key={est.provider} className="rounded-2xl border border-white/10 bg-black/50 p-3">
                        <p className="text-xs font-black text-zinc-400">{est.provider}</p>
                        <p className="text-sm font-black text-white">${(est.costCents / 100).toFixed(2)} • ~{est.timeSec}s</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* STYLE TAB */}
          {activeTab === "style" && (
            <div className="space-y-4">
              <div>
                <p className="text-sm font-black uppercase tracking-[0.16em] text-[#F2B15B]">Color grade</p>
                <h2 className="mt-1 text-2xl font-black text-white">Set the visual tone for the preview</h2>
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                {styles.map((style) => (
                  <button key={style.label} type="button" onClick={() => setSelectedStyle(style.label)} className={`rounded-[1.5rem] border p-4 text-left transition active:scale-[0.98] ${selectedStyle === style.label ? "border-[#F2B15B] bg-[#201705]" : "border-white/10 bg-black/65 hover:border-[#F2B15B]/70"}`}>
                    <div className={`mb-3 h-16 w-full rounded-2xl bg-gradient-to-r ${style.gradient}`} />
                    <p className="font-black text-white">{style.label}</p>
                    <p className="mt-1 text-xs text-zinc-400">{style.tone}</p>
                    <p className="mt-2 text-xs leading-5 text-zinc-500">{style.note}</p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* CAPTIONS TAB */}
          {activeTab === "captions" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-black uppercase tracking-[0.16em] text-[#F2B15B]">Captions</p>
                  <h2 className="mt-1 text-2xl font-black text-white">Hook text and CTA overlay</h2>
                </div>
                <TapButton active={captionsOn} onClick={() => setCaptionsOn(!captionsOn)}>
                  {captionsOn ? "ON" : "OFF"}
                </TapButton>
              </div>
              {captionsOn && (
                <div className="space-y-4">
                  <div className="grid gap-3 md:grid-cols-3">
                    {(["Clean Lower", "Bold Hook", "Minimal Whisper"] as CaptionChoice[]).map((choice) => (
                      <TapButton key={choice} active={captionStyle === choice} onClick={() => setCaptionStyle(choice)}>{choice}</TapButton>
                    ))}
                  </div>
                  <label className="block">
                    <span className="mb-2 block text-xs font-black uppercase tracking-[0.14em] text-zinc-500">Hook text</span>
                    <textarea value={hook} onChange={(e) => setHook(e.target.value)} rows={3} className="w-full rounded-2xl border border-white/10 bg-black px-4 py-3 text-white outline-none transition focus:border-[#F2B15B]" />
                  </label>
                  <label className="block">
                    <span className="mb-2 block text-xs font-black uppercase tracking-[0.14em] text-zinc-500">Unlock CTA</span>
                    <input value={cta} onChange={(e) => setCta(e.target.value)} className="min-h-12 w-full rounded-2xl border border-white/10 bg-black px-4 py-3 text-white outline-none transition focus:border-[#F2B15B]" />
                  </label>
                </div>
              )}
            </div>
          )}

          {/* PUBLISH TAB */}
          {activeTab === "publish" && (
            <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
              <div className="rounded-[1.5rem] border border-white/10 bg-black/55 p-5">
                <h2 className="text-2xl font-black text-white md:text-3xl">Attach the money path</h2>
                <p className="mt-1 max-w-2xl text-sm leading-6 text-zinc-400">Price, destination, and safety checks travel with the asset into Studio.</p>
                <div className="mt-5 grid gap-5 md:grid-cols-2">
                  <label className="block">
                    <span className="mb-2 flex items-center gap-2 text-sm font-black text-white"><DollarSign size={18} className="text-[#F2B15B]" /> Unlock price</span>
                    <input value={price} onChange={(e) => setPrice(e.target.value.replace(/[^0-9.]/g, ""))} inputMode="decimal" className="min-h-14 w-full rounded-2xl border border-white/10 bg-black px-4 py-3 text-lg font-black text-white outline-none transition focus:border-[#F2B15B]" />
                  </label>
                  <div>
                    <p className="mb-2 flex items-center gap-2 text-sm font-black text-white"><Send size={18} className="text-[#F2B15B]" /> Destination</p>
                    <div className="grid gap-2">
                      {destinations.map((choice) => <TapButton key={choice} active={destination === choice} onClick={() => setDestination(choice)}>{choice}</TapButton>)}
                    </div>
                  </div>
                </div>
              </div>
              <div className="rounded-[1.5rem] border border-white/10 bg-black/55 p-5">
                <div className="mb-4 flex items-center gap-2 text-[#F2B15B]"><ShieldCheck size={18} /><p className="font-black uppercase tracking-[0.14em]">Creator protection</p></div>
                <div className="space-y-3">
                  {([
                    ["Watermark preview", watermark, setWatermark, Eye],
                    ["Creator consent confirmed", consentCheck, setConsentCheck, ShieldCheck],
                    ["Safe teaser kept public", safeTease, setSafeTease, Lock],
                  ] as Array<[string, boolean, (value: boolean) => void, typeof Eye]>).map(([label, value, setter, IconComponent]) => (
                    <button key={label} type="button" onClick={() => setter(!value)} className={`flex min-h-14 w-full items-center justify-between gap-3 rounded-2xl border px-4 py-3 text-left transition active:scale-[0.98] ${value ? "border-emerald-400/40 bg-emerald-400/10 text-white" : "border-white/10 bg-white/[0.04] text-zinc-300"}`}>
                      <span className="flex items-center gap-3 font-bold"><IconComponent size={18} className="text-[#F2B15B]" /> {label}</span>
                      {value ? <Check size={18} className="text-emerald-300" /> : null}
                    </button>
                  ))}
                </div>
                {/* Compliance Status */}
                {compliance.data && (
                  <div className={`mt-4 rounded-2xl p-3 text-sm ${compliance.data.eligible ? "bg-emerald-500/10 border border-emerald-500/30 text-emerald-300" : "bg-red-500/10 border border-red-500/30 text-red-300"}`}>
                    {compliance.data.eligible ? "Compliance check passed" : `Blockers: ${compliance.data.blockers?.join(", ") || "Verification required"}`}
                  </div>
                )}
              </div>
            </div>
          )}
        </Panel>
      </div>

      {/* Smart Next Step Bar — always visible, tells creator exactly what to do */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-black/95 backdrop-blur-2xl">
        <div className="mx-auto max-w-2xl p-3">
          {/* Step indicator */}
          {(() => {
            const step = !videoUrl ? 1 : timelineClips.length === 0 ? 1 : !selectedStyle ? 2 : paidPrice < 1 ? 3 : !consentCheck ? 3 : 4;
            const steps = [
              { n: 1, label: "Upload" },
              { n: 2, label: "Style" },
              { n: 3, label: "Price" },
              { n: 4, label: "Export" },
            ];
            return (
              <div className="mb-2 flex items-center justify-center gap-1">
                {steps.map((s, i) => (
                  <>
                    <div key={s.n} className={`flex items-center gap-1 text-[10px] font-black ${
                      step > s.n ? "text-emerald-400" : step === s.n ? "text-[#F2B15B]" : "text-zinc-600"
                    }`}>
                      <div className={`flex h-5 w-5 items-center justify-center rounded-full text-[9px] font-black ${
                        step > s.n ? "bg-emerald-400 text-black" : step === s.n ? "bg-[#F2B15B] text-black" : "bg-zinc-800 text-zinc-500"
                      }`}>{step > s.n ? "✓" : s.n}</div>
                      <span className="hidden sm:block">{s.label}</span>
                    </div>
                    {i < steps.length - 1 && <div className={`h-px w-6 ${ step > s.n ? "bg-emerald-400" : "bg-zinc-700" }`} />}
                  </>
                ))}
              </div>
            );
          })()}

          {/* Next step action */}
          {!videoUrl ? (
            <label className="flex min-h-14 w-full cursor-pointer items-center justify-center gap-2 rounded-2xl bg-[#F2B15B] font-black text-black">
              <Upload size={18} /> Upload your video to start
              <input type="file" accept="video/*,audio/*" className="hidden" onChange={handleUpload} />
            </label>
          ) : !selectedStyle ? (
            <button type="button" onClick={() => setActiveTab("style")} className="flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl bg-[#F2B15B] font-black text-black">
              <Wand2 size={18} /> Next: Pick a style for your drop
            </button>
          ) : paidPrice < 1 ? (
            <button type="button" onClick={() => setActiveTab("publish")} className="flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl bg-[#F2B15B] font-black text-black">
              <DollarSign size={18} /> Next: Set your unlock price
            </button>
          ) : !consentCheck ? (
            <button type="button" onClick={() => { setConsentCheck(true); setActiveTab("publish"); }} className="flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl bg-[#F2B15B] font-black text-black">
              <ShieldCheck size={18} /> Next: Confirm consent to unlock export
            </button>
          ) : (
            <div className="grid grid-cols-[1fr_auto] gap-2">
              <button type="button" onClick={exportPackage} className="inline-flex min-h-14 items-center justify-center gap-2 rounded-2xl bg-[#F2B15B] font-black text-black">
                <Download size={18} /> Export drop package — ready to launch
              </button>
              <button type="button" onClick={saveDraft} className="flex min-h-14 min-w-14 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.05] text-white">
                <Save size={18} />
              </button>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}

export default VaultXEditor;
