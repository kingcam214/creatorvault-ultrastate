import { type ChangeEvent, type ReactNode, useEffect, useMemo, useRef, useState } from "react";
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
} from "lucide-react";

const accent = "#F2B15B";
const storageKey = "vaultx-editor-command-draft-v1";

type EditorTab = "cut" | "style" | "captions" | "publish";
type AspectChoice = "9:16" | "16:9" | "1:1";
type StyleChoice = "Luxe Glow" | "Cinematic Heat" | "Soft Skin" | "After Dark";
type CaptionChoice = "Clean Lower" | "Bold Hook" | "Minimal Whisper";
type DestinationChoice = "VaultX Unlock" | "Subscriber Drop" | "Fan Preview";

type EditorDraft = {
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
};

const defaultDraft: EditorDraft = {
  activeTab: "cut",
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
  {
    label: "Luxe Glow",
    tone: "Premium, polished, soft-gold finish",
    note: "Brightens the preview while keeping the frame elevated and creator-safe.",
    gradient: "from-[#f7d27a] via-[#9f5e1a] to-black",
  },
  {
    label: "Cinematic Heat",
    tone: "Trailer energy with rich contrast",
    note: "Built for high-intent previews where the fan should feel the full drop is worth paying for.",
    gradient: "from-[#ffb347] via-[#6c1010] to-[#050505]",
  },
  {
    label: "Soft Skin",
    tone: "Clean, flattering, creator-first",
    note: "Smooths the mood without making the clip feel fake or over-processed.",
    gradient: "from-[#f3d1b2] via-[#4c3029] to-black",
  },
  {
    label: "After Dark",
    tone: "Moody, secret, locked-room feel",
    note: "Best for premium teaser pacing and private unlock launches.",
    gradient: "from-[#454545] via-[#171717] to-[#080102]",
  },
];

const captionStyles: CaptionChoice[] = ["Clean Lower", "Bold Hook", "Minimal Whisper"];
const destinations: DestinationChoice[] = ["VaultX Unlock", "Subscriber Drop", "Fan Preview"];

function loadDraft(): EditorDraft {
  if (typeof window === "undefined") return defaultDraft;

  try {
    const saved = window.localStorage.getItem(storageKey);
    if (!saved) return defaultDraft;
    return { ...defaultDraft, ...JSON.parse(saved) };
  } catch {
    return defaultDraft;
  }
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
    <button
      type="button"
      onClick={onClick}
      className={`min-h-12 rounded-2xl px-4 py-3 text-sm font-black transition active:scale-[0.98] ${
        active
          ? "bg-[#F2B15B] text-black shadow-[0_0_30px_rgba(242,177,91,0.24)]"
          : "border border-white/10 bg-white/[0.04] text-zinc-200 hover:border-[#F2B15B]/70 hover:text-white"
      } ${className}`}
    >
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

function UploadControl({ onUpload, compact = false }: { onUpload: (event: ChangeEvent<HTMLInputElement>) => void; compact?: boolean }) {
  return (
    <label className={`inline-flex min-h-12 cursor-pointer items-center justify-center gap-2 rounded-full border border-[#F2B15B]/70 bg-[#F2B15B] px-5 py-3 text-sm font-black text-black transition hover:brightness-110 active:scale-[0.98] ${compact ? "w-full sm:w-auto" : ""}`}>
      <Upload size={18} />
      Upload creator clip
      <input type="file" accept="video/*" className="hidden" onChange={onUpload} />
    </label>
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
  const [duration, setDuration] = useState(60);
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [saveState, setSaveState] = useState("Draft autosaves on device");
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const maxDuration = Math.max(30, Math.round(duration || 60));
  const effectivePreviewLength = clamp(previewLength, 6, Math.min(30, maxDuration));
  const effectiveUnlockAt = clamp(unlockAt, effectivePreviewLength + 1, maxDuration);
  const previewPercent = clamp((effectivePreviewLength / maxDuration) * 100, 0, 100);
  const unlockPercent = clamp((effectiveUnlockAt / maxDuration) * 100, 0, 100);
  const paidPrice = Number.parseFloat(price || "0");

  const readinessItems = useMemo(
    () => [
      { label: "Source loaded", done: Boolean(videoUrl), value: 20 },
      { label: "Preview window set", done: effectivePreviewLength >= 8 && effectivePreviewLength <= 30, value: 14 },
      { label: "Unlock beat protected", done: effectiveUnlockAt > effectivePreviewLength, value: 16 },
      { label: "Sales hook written", done: hook.trim().length >= 18 && cta.trim().length >= 6, value: 16 },
      { label: "Paid path attached", done: paidPrice >= 1 && destination === "VaultX Unlock", value: 16 },
      { label: "Consent and safety locked", done: consentCheck && safeTease && watermark, value: 18 },
    ],
    [videoUrl, effectivePreviewLength, effectiveUnlockAt, hook, cta, paidPrice, destination, consentCheck, safeTease, watermark],
  );

  const readinessScore = readinessItems.reduce((total, item) => total + (item.done ? item.value : 0), 0);
  const launchReady = readinessItems.every((item) => item.done);

  const launchSummary = useMemo(
    () => ({
      clip: fileName || "No clip loaded yet",
      format: aspect,
      preview: `${formatTime(effectivePreviewLength)} public preview`,
      unlock: `${formatTime(effectiveUnlockAt)} unlock beat`,
      style: selectedStyle,
      captions: captionsOn ? `${captionStyle} captions on` : "Captions off",
      price: paidPrice > 0 ? `$${paidPrice.toFixed(2)}` : "Price needed",
      destination,
      readiness: `${readinessScore}/100`,
      status: launchReady ? "Studio-ready" : "Close gaps before Studio launch",
    }),
    [fileName, aspect, effectivePreviewLength, effectiveUnlockAt, selectedStyle, captionsOn, captionStyle, paidPrice, destination, readinessScore, launchReady],
  );

  useEffect(() => {
    const draft: EditorDraft = { activeTab, aspect, selectedStyle, captionStyle, captionsOn, previewLength: effectivePreviewLength, unlockAt: effectiveUnlockAt, price, destination, hook, cta, note, watermark, consentCheck, safeTease };
    window.localStorage.setItem(storageKey, JSON.stringify(draft));
  }, [activeTab, aspect, selectedStyle, captionStyle, captionsOn, effectivePreviewLength, effectiveUnlockAt, price, destination, hook, cta, note, watermark, consentCheck, safeTease]);

  useEffect(() => {
    return () => {
      if (videoUrl) URL.revokeObjectURL(videoUrl);
    };
  }, [videoUrl]);

  function handleUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    if (videoUrl) URL.revokeObjectURL(videoUrl);
    const nextUrl = URL.createObjectURL(file);
    const mb = file.size / 1024 / 1024;
    setVideoUrl(nextUrl);
    setFileName(file.name.replace(/\.[^/.]+$/, ""));
    setFileMeta(`${mb.toFixed(1)} MB • creator-owned source`);
    setCurrentTime(0);
    setIsPlaying(false);
    setSaveState("Clip loaded. Draft saved on this device.");
  }

  async function togglePlayback() {
    const video = videoRef.current;
    if (!video) return;

    if (video.paused) {
      await video.play();
      setIsPlaying(true);
    } else {
      video.pause();
      setIsPlaying(false);
    }
  }

  function seekTo(value: number) {
    const next = clamp(value, 0, maxDuration);
    setCurrentTime(next);
    if (videoRef.current) videoRef.current.currentTime = next;
  }

  function saveDraft() {
    setSaveState(`Saved at ${new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}`);
  }

  function exportPackage() {
    const payload = JSON.stringify({
      ...launchSummary,
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

  const aspectClass = aspect === "16:9" ? "aspect-video max-w-5xl" : aspect === "1:1" ? "aspect-square max-w-[520px]" : "aspect-[9/16] max-w-[430px]";
  const selectedStyleData = styles.find((style) => style.label === selectedStyle) || styles[1];

  return (
    <main className="min-h-screen bg-[#050505] text-white">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_top_left,rgba(242,177,91,0.16),transparent_30%),radial-gradient(circle_at_90%_10%,rgba(117,36,13,0.24),transparent_28%),linear-gradient(180deg,#080808_0%,#050505_52%,#090603_100%)]" />

      <header className="sticky top-0 z-40 border-b border-white/10 bg-black/82 backdrop-blur-2xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3 md:px-6">
          <Link href="/vault-x" className="text-2xl font-black tracking-tight text-white">
            Vault<span style={{ color: accent }}>X</span>
          </Link>
          <nav className="hidden items-center gap-2 sm:flex">
            <Link href="/vaultx/fan-library" className="min-h-11 rounded-full px-4 py-3 text-sm font-bold text-zinc-400 transition hover:bg-white/10 hover:text-white">
              My Videos
            </Link>
            <Link href="/vaultx/creator-subscriptions" className="min-h-11 rounded-full px-4 py-3 text-sm font-bold text-zinc-400 transition hover:bg-white/10 hover:text-white">
              Earn
            </Link>
          </nav>
          <button type="button" onClick={saveDraft} className="inline-flex min-h-11 items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-3 text-xs font-black uppercase tracking-[0.12em] text-zinc-200 transition hover:border-[#F2B15B]/60 hover:text-white">
            <Save size={16} /> Save
          </button>
        </div>
      </header>

      <div className="relative z-10 mx-auto flex max-w-7xl flex-col gap-5 px-4 py-5 pb-28 md:px-6 md:py-8 lg:pb-12">
        <Panel className="overflow-hidden p-4 md:p-6 lg:p-7">
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_350px] lg:items-start">
            <div>
              <div className="mb-4 flex flex-wrap items-center gap-2">
                <span className="inline-flex rounded-full border border-[#F2B15B]/40 bg-[#F2B15B]/10 px-3 py-1 text-[0.68rem] font-black uppercase tracking-[0.18em] text-[#F2B15B]">VaultX Body Cinema Editor</span>
                <span className="inline-flex rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[0.68rem] font-black uppercase tracking-[0.18em] text-zinc-400">Adult-first revenue workflow</span>
              </div>
              <h1 className="max-w-4xl text-3xl font-black uppercase leading-[0.92] tracking-[-0.04em] text-white sm:text-5xl lg:text-7xl">
                Shape the preview. Protect the payoff. Hand it to Studio ready to sell.
              </h1>
              <p className="mt-4 max-w-3xl text-base leading-7 text-zinc-300 md:text-lg">
                A premium Body Cinema prep room for adult creators who need the source, preview, caption, price, safety checks, and paid-unlock path aligned before the Studio launch. No dead panels. No generic creator-tool energy.
              </p>
              <div className="mt-5 grid gap-3 sm:grid-cols-3">
                <StatPill icon={<Scissors size={18} />} label="Public cut" value={`${formatTime(effectivePreviewLength)} preview`} />
                <StatPill icon={<Lock size={18} />} label="Unlock beat" value={formatTime(effectiveUnlockAt)} />
                <StatPill icon={<DollarSign size={18} />} label="Drop price" value={paidPrice > 0 ? `$${paidPrice.toFixed(2)}` : "Set price"} />
              </div>
            </div>

            <div className="rounded-[1.75rem] border border-white/10 bg-black/45 p-4">
              <img src="/images/platform/editor-hero.webp" alt="Body Cinema editor showing approved source media, preview cut, locked payoff, captions, pricing, and Studio handoff readiness" className="mb-4 w-full rounded-[1.25rem] border border-white/10 object-cover" loading="eager" />
              <div className="flex items-center justify-between gap-4">
                <ReadinessRing score={readinessScore} />
                <div>
                  <p className="text-lg font-black text-white">Launch readiness</p>
                  <p className="mt-1 text-sm leading-6 text-zinc-400">The editor scores what matters before a drop reaches Studio: approved source, preview, unlock, captions, money path, and consent/safety checks.</p>
                </div>
              </div>
              <div className="mt-4 space-y-2">
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

        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
          <Panel className="p-3 md:p-5">
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-black uppercase tracking-[0.16em] text-[#F2B15B]">Preview deck</p>
                <h2 className="mt-1 text-2xl font-black text-white">Creator-owned clip control</h2>
              </div>
              <div className="grid grid-cols-3 gap-2 rounded-full border border-white/10 bg-black p-1">
                {(["9:16", "16:9", "1:1"] as AspectChoice[]).map((choice) => (
                  <button key={choice} type="button" onClick={() => setAspect(choice)} className={`min-h-10 rounded-full px-3 text-sm font-black transition ${aspect === choice ? "bg-[#F2B15B] text-black" : "text-zinc-400 hover:text-white"}`}>{choice}</button>
                ))}
              </div>
            </div>

            <div className="flex justify-center rounded-[1.75rem] border border-white/10 bg-black/70 p-3 md:p-5">
              <div className={`relative w-full overflow-hidden rounded-[1.5rem] border border-white/10 bg-black shadow-2xl ${aspectClass}`}>
                {videoUrl ? (
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
                        setPreviewLength((value) => clamp(value, 6, Math.min(30, nextDuration)));
                        setUnlockAt((value) => clamp(value, 8, nextDuration));
                      }
                    }}
                    onTimeUpdate={(event) => setCurrentTime(event.currentTarget.currentTime)}
                    onPlay={() => setIsPlaying(true)}
                    onPause={() => setIsPlaying(false)}
                  />
                ) : (
                  <div className={`absolute inset-0 bg-gradient-to-br ${selectedStyleData.gradient}`}>
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_16%,rgba(255,255,255,0.22),transparent_24%),linear-gradient(180deg,rgba(0,0,0,0.1),rgba(0,0,0,0.72))]" />
                    <div className="absolute inset-5 flex flex-col items-center justify-center rounded-[1.35rem] border border-white/10 bg-black/28 p-5 text-center backdrop-blur-md">
                      <div className="mb-5 flex h-20 w-20 items-center justify-center rounded-full bg-[#F2B15B] text-black shadow-[0_0_60px_rgba(242,177,91,0.34)]">
                        <Upload size={30} />
                      </div>
                      <p className="text-xl font-black text-white">Load the clip. Build the unlock.</p>
                      <p className="mt-2 max-w-xs text-sm leading-6 text-zinc-300">Upload a creator-owned source and VaultX turns the edit screen into a sales package.</p>
                      <div className="mt-5"><UploadControl onUpload={handleUpload} /></div>
                    </div>
                  </div>
                )}

                {captionsOn && (
                  <div className={`absolute left-4 right-4 ${captionStyle === "Clean Lower" ? "bottom-6" : captionStyle === "Bold Hook" ? "top-6" : "bottom-10"}`}>
                    <div className={`mx-auto max-w-[88%] rounded-2xl px-4 py-3 text-center shadow-2xl ${captionStyle === "Minimal Whisper" ? "bg-black/45 text-sm text-white/90 backdrop-blur" : captionStyle === "Clean Lower" ? "bg-black/70 text-base font-bold text-white backdrop-blur" : "bg-[#F2B15B] text-lg font-black uppercase tracking-[-0.02em] text-black"}`}>
                      {hook}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="mt-4 rounded-[1.5rem] border border-white/10 bg-black p-4">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-black text-white">{fileName || "No clip loaded"}</p>
                  <p className="text-xs text-zinc-500">{fileMeta || "Upload a local video to activate the real preview player."}</p>
                </div>
                <UploadControl onUpload={handleUpload} compact />
              </div>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <button type="button" onClick={togglePlayback} disabled={!videoUrl} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-[#F2B15B] px-8 py-3 font-black text-black transition hover:brightness-110 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40">
                  {isPlaying ? <Pause size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" />}
                  {isPlaying ? "Pause" : "Play"}
                </button>
                <input aria-label="Video scrubber" type="range" min="0" max={maxDuration} step="0.1" value={clamp(currentTime, 0, maxDuration)} onChange={(event) => seekTo(Number(event.target.value))} className="h-3 min-w-0 flex-1 accent-[#F2B15B]" disabled={!videoUrl} />
                <span className="rounded-full border border-white/10 px-4 py-3 text-sm font-bold text-zinc-400">{formatTime(currentTime)} / {formatTime(maxDuration)}</span>
              </div>
            </div>
          </Panel>

          <div className="space-y-5">
            <Panel className="p-5">
              <p className="mb-4 text-sm font-black uppercase tracking-[0.16em] text-[#F2B15B]">Command stack</p>
              <div className="grid gap-2">
                {([
                  ["cut", "Cut", Scissors],
                  ["style", "Style", Wand2],
                  ["captions", "Captions", Captions],
                  ["publish", "Publish", Send],
                ] as Array<[EditorTab, string, typeof Scissors]>).map(([id, label, Icon]) => (
                  <button key={id} type="button" onClick={() => setActiveTab(id)} className={`flex min-h-14 items-center justify-between rounded-2xl px-4 py-3 text-left transition active:scale-[0.98] ${activeTab === id ? "bg-[#F2B15B] text-black" : "border border-white/10 bg-white/[0.04] text-white hover:border-[#F2B15B]/50"}`}>
                    <span className="flex items-center gap-3 font-black"><Icon size={18} /> {label}</span>
                    {activeTab === id && <Check size={18} />}
                  </button>
                ))}
              </div>
            </Panel>

            <Panel className="p-5">
              <div className="mb-4 flex items-center gap-2 text-[#F2B15B]"><Gauge size={18} /><p className="text-sm font-black uppercase tracking-[0.16em]">Launch package</p></div>
              <div className="space-y-3 text-sm">
                {Object.entries(launchSummary).map(([key, value]) => (
                  <div key={key} className="flex justify-between gap-4 border-b border-white/10 pb-2 last:border-b-0">
                    <span className="capitalize text-zinc-500">{key}</span>
                    <span className="max-w-[12rem] text-right font-bold text-zinc-100">{value}</span>
                  </div>
                ))}
              </div>
              <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-1">
                <button type="button" onClick={saveDraft} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 font-black text-white transition hover:border-[#F2B15B]/60"><Save size={18} /> Save draft</button>
                <button type="button" onClick={exportPackage} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-[#F2B15B] px-4 py-3 font-black text-black transition hover:brightness-110"><Download size={18} /> Export package</button>
                <Link href="/vault-x/studio" className={`inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl px-4 py-3 font-black transition ${launchReady ? "border border-emerald-400/40 bg-emerald-400/10 text-emerald-100 hover:border-emerald-300" : "border border-white/10 bg-white/[0.035] text-zinc-500"}`}>Open Studio</Link>
              </div>
              <p className="mt-3 text-xs font-bold text-zinc-500">{saveState}</p>
            </Panel>
          </div>
        </div>

        <Panel className="overflow-hidden p-4 md:p-6">
          <div className="mb-5 grid gap-2 rounded-[1.35rem] border border-white/10 bg-black p-2 md:grid-cols-4">
            {([
              ["cut", "Cut"],
              ["style", "Style"],
              ["captions", "Captions"],
              ["publish", "Publish"],
            ] as Array<[EditorTab, string]>).map(([id, label]) => (
              <button key={id} type="button" onClick={() => setActiveTab(id)} className={`min-h-12 rounded-2xl px-4 py-3 font-black transition active:scale-[0.98] ${activeTab === id ? "bg-[#F2B15B] text-black" : "text-zinc-300 hover:bg-white/10 hover:text-white"}`}>{label}</button>
            ))}
          </div>

          {activeTab === "cut" && (
            <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
              <div>
                <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <h2 className="text-2xl font-black text-white md:text-3xl">Build the paid-preview rhythm</h2>
                    <p className="mt-1 max-w-2xl text-sm leading-6 text-zinc-400">Set how long the free tease runs, then mark where the buyer should hit the locked payoff.</p>
                  </div>
                  <div className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-xs font-black uppercase tracking-[0.14em] text-zinc-400">{formatTime(effectivePreviewLength)} free • {formatTime(effectiveUnlockAt)} lock</div>
                </div>
                <div className="rounded-[1.5rem] border border-white/10 bg-black p-4">
                  <div className="relative h-20 overflow-hidden rounded-2xl border border-white/10 bg-[#101010] p-2">
                    <div className="grid h-full gap-1" style={{ gridTemplateColumns: "repeat(32, minmax(0, 1fr))" }}>
                      {Array.from({ length: 32 }).map((_, index) => {
                        const percent = ((index + 1) / 32) * 100;
                        const active = percent <= previewPercent;
                        const locked = percent > previewPercent && percent <= unlockPercent;
                        return <div key={index} className={`rounded ${active ? "bg-[#F2B15B]" : locked ? "bg-[#764616]" : "bg-white/10"}`} />;
                      })}
                    </div>
                    <div className="absolute top-1 h-[calc(100%-0.5rem)] w-1.5 rounded-full bg-white shadow-[0_0_18px_rgba(255,255,255,0.85)]" style={{ left: `${previewPercent}%` }} />
                    <div className="absolute top-1 h-[calc(100%-0.5rem)] w-2 rounded-full bg-[#F2B15B] shadow-[0_0_18px_rgba(242,177,91,0.9)]" style={{ left: `${unlockPercent}%` }} />
                  </div>
                  <div className="mt-5 grid gap-5 md:grid-cols-2">
                    <label className="block">
                      <span className="mb-2 flex items-center justify-between text-sm font-black text-white"><span>Free preview length</span><span className="text-[#F2B15B]">{formatTime(effectivePreviewLength)}</span></span>
                      <input type="range" min="6" max={Math.min(30, maxDuration)} value={effectivePreviewLength} onChange={(event) => setPreviewLength(Number(event.target.value))} className="w-full accent-[#F2B15B]" />
                    </label>
                    <label className="block">
                      <span className="mb-2 flex items-center justify-between text-sm font-black text-white"><span>Paid unlock moment</span><span className="text-[#F2B15B]">{formatTime(effectiveUnlockAt)}</span></span>
                      <input type="range" min={effectivePreviewLength + 1} max={maxDuration} value={effectiveUnlockAt} onChange={(event) => setUnlockAt(Number(event.target.value))} className="w-full accent-[#F2B15B]" />
                    </label>
                  </div>
                </div>
              </div>
              <div className="rounded-[1.5rem] border border-white/10 bg-black/55 p-5">
                <div className="mb-3 flex items-center gap-2 text-[#F2B15B]"><Clock size={18} /><p className="font-black">Cut presets</p></div>
                <div className="grid gap-3">
                  {[
                    [10, "Fast tease"],
                    [14, "Balanced sell"],
                    [22, "Story preview"],
                  ].map(([value, label]) => <TapButton key={label} active={effectivePreviewLength === value} onClick={() => setPreviewLength(Number(value))}>{label}</TapButton>)}
                </div>
              </div>
            </div>
          )}

          {activeTab === "style" && (
            <div>
              <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <h2 className="text-2xl font-black text-white md:text-3xl">Choose the premium finish</h2>
                  <p className="mt-1 max-w-2xl text-sm leading-6 text-zinc-400">Pick the visual lane that makes the teaser feel expensive, controlled, and worth unlocking.</p>
                </div>
                <UploadControl onUpload={handleUpload} compact />
              </div>
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                {styles.map((choice) => (
                  <button key={choice.label} type="button" onClick={() => setSelectedStyle(choice.label)} className={`min-h-64 rounded-[1.5rem] border p-4 text-left transition hover:-translate-y-1 active:scale-[0.98] ${selectedStyle === choice.label ? "border-[#F2B15B] bg-[#21170a]" : "border-white/10 bg-white/[0.04] hover:border-[#F2B15B]/60"}`}>
                    <div className={`mb-4 h-32 rounded-2xl bg-gradient-to-br ${choice.gradient}`} />
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-xl font-black text-white">{choice.label}</span>
                      {selectedStyle === choice.label && <Check className="text-[#F2B15B]" size={20} />}
                    </div>
                    <p className="mt-2 text-sm font-bold text-[#F2B15B]">{choice.tone}</p>
                    <p className="mt-2 text-sm leading-6 text-zinc-400">{choice.note}</p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {activeTab === "captions" && (
            <div className="grid gap-5 lg:grid-cols-[320px_1fr]">
              <div className="rounded-[1.5rem] border border-white/10 bg-black/55 p-5">
                <h2 className="text-2xl font-black text-white">Caption control</h2>
                <p className="mt-1 text-sm leading-6 text-zinc-400">Keep text readable, persuasive, and aligned with the creator’s voice.</p>
                <p className="mb-3 mt-6 text-sm font-black text-white">Captions</p>
                <div className="grid grid-cols-2 gap-3">
                  <TapButton active={captionsOn} onClick={() => setCaptionsOn(true)}>On</TapButton>
                  <TapButton active={!captionsOn} onClick={() => setCaptionsOn(false)}>Off</TapButton>
                </div>
                <p className="mb-3 mt-6 text-sm font-black text-white">Style</p>
                <div className="grid gap-3">
                  {captionStyles.map((choice) => <TapButton key={choice} active={captionStyle === choice} onClick={() => setCaptionStyle(choice)}>{choice}</TapButton>)}
                </div>
              </div>
              <div className="rounded-[1.5rem] border border-white/10 bg-black/55 p-5">
                <div className="mb-4 flex items-center gap-2 text-white"><Captions size={20} className="text-[#F2B15B]" /><p className="text-sm font-black uppercase tracking-[0.16em]">Sales copy</p></div>
                <div className="space-y-4">
                  <label className="block">
                    <span className="mb-2 block text-xs font-black uppercase tracking-[0.14em] text-zinc-500">Preview hook</span>
                    <textarea value={hook} onChange={(event) => setHook(event.target.value)} rows={3} className="w-full rounded-2xl border border-white/10 bg-black px-4 py-3 text-white outline-none transition focus:border-[#F2B15B]" />
                  </label>
                  <label className="block">
                    <span className="mb-2 block text-xs font-black uppercase tracking-[0.14em] text-zinc-500">Unlock CTA</span>
                    <input value={cta} onChange={(event) => setCta(event.target.value)} className="min-h-12 w-full rounded-2xl border border-white/10 bg-black px-4 py-3 text-white outline-none transition focus:border-[#F2B15B]" />
                  </label>
                  <label className="block">
                    <span className="mb-2 block text-xs font-black uppercase tracking-[0.14em] text-zinc-500">Creator note</span>
                    <textarea value={note} onChange={(event) => setNote(event.target.value)} rows={4} className="w-full rounded-2xl border border-white/10 bg-black px-4 py-3 text-white outline-none transition focus:border-[#F2B15B]" />
                  </label>
                </div>
              </div>
            </div>
          )}

          {activeTab === "publish" && (
            <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
              <div className="rounded-[1.5rem] border border-white/10 bg-black/55 p-5">
                <h2 className="text-2xl font-black text-white md:text-3xl">Attach the money path</h2>
                <p className="mt-1 max-w-2xl text-sm leading-6 text-zinc-400">A Body Cinema prep package is not finished until the buyer route, price, watermark, consent, and public-safety checks travel with the asset into Studio.</p>
                <div className="mt-5 grid gap-5 md:grid-cols-2">
                  <label className="block">
                    <span className="mb-2 flex items-center gap-2 text-sm font-black text-white"><DollarSign size={18} className="text-[#F2B15B]" /> Unlock price</span>
                    <input value={price} onChange={(event) => setPrice(event.target.value.replace(/[^0-9.]/g, ""))} inputMode="decimal" className="min-h-14 w-full rounded-2xl border border-white/10 bg-black px-4 py-3 text-lg font-black text-white outline-none transition focus:border-[#F2B15B]" />
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
                  {(
                    [
                      ["Watermark preview", watermark, setWatermark, Eye],
                      ["Creator consent confirmed", consentCheck, setConsentCheck, ShieldCheck],
                      ["Safe teaser kept public", safeTease, setSafeTease, Lock],
                    ] as Array<[string, boolean, (value: boolean) => void, typeof Eye]>
                  ).map(([label, value, setter, IconComponent]) => (
                    <button key={label} type="button" onClick={() => setter(!value)} className={`flex min-h-14 w-full items-center justify-between gap-3 rounded-2xl border px-4 py-3 text-left transition active:scale-[0.98] ${value ? "border-emerald-400/40 bg-emerald-400/10 text-white" : "border-white/10 bg-white/[0.04] text-zinc-300"}`}>
                      <span className="flex items-center gap-3 font-bold"><IconComponent size={18} className="text-[#F2B15B]" /> {label}</span>
                      {value ? <Check size={18} className="text-emerald-300" /> : null}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </Panel>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-black/90 p-3 backdrop-blur-2xl lg:hidden">
        <div className="mx-auto grid max-w-2xl grid-cols-[1fr_auto] gap-3">
          <button type="button" onClick={exportPackage} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-[#F2B15B] px-4 py-3 font-black text-black"><Download size={18} /> Export drop package</button>
          <button type="button" onClick={saveDraft} className="flex min-h-12 min-w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.05] text-white"><Save size={18} /></button>
        </div>
      </div>
    </main>
  );
}

export default VaultXEditor;
