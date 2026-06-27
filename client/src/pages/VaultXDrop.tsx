/**
 * ============================================================================
 * VAULTX DROP — The elite unified creator drop flow
 *
 * One page. Upload to launched drop. No navigation. No confusion.
 * Mobile-first. Every step reveals the next only when the current is done.
 *
 * Flow:
 *   UPLOAD    → tap to upload or paste URL, video previews immediately
 *   PRESET    → body feature presets shown as visual cards, tap to apply
 *   CONFIGURE → title, price, consent — minimal, only what's needed
 *   LAUNCH    → one button, AI stack runs, Pollo generates, Stripe attaches
 *   RESULT    → video ready, copy pack, Telegram button, checkout link
 * ============================================================================
 */
import { useState, useRef, useCallback, ChangeEvent } from "react";
import { Link } from "wouter";
import {
  ArrowRight, Check, ChevronDown, Download, DollarSign,
  Loader2, Play, Pause, Send, ShieldCheck, Sparkles,
  Upload, Wand2, X, Zap, Copy, Volume2, VolumeX
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

// ─── Design ──────────────────────────────────────────────────────────────────
const GOLD = "#C9A84C";
const GOLD_DIM = "rgba(201,168,76,0.12)";
const GOLD_BORDER = "rgba(201,168,76,0.35)";
const BG = "#080808";
const CARD = "#111111";
const CARD2 = "#161616";
const BORDER = "rgba(255,255,255,0.08)";
const MUTED = "rgba(255,255,255,0.45)";
const GREEN = "#00E676";
const CYAN = "#00D9FF";

// ─── Step definitions ─────────────────────────────────────────────────────────
type Step = "upload" | "preset" | "configure" | "launch" | "result";

const STEP_ORDER: Step[] = ["upload", "preset", "configure", "launch", "result"];

function stepIndex(s: Step) { return STEP_ORDER.indexOf(s); }

// ─── Body feature presets (top converting, body-specific) ────────────────────
const QUICK_PRESETS = [
  { id: "body-curves-360",       emoji: "🌀", name: "360 Curves",    heat: 5, score: 10, price: 49 },
  { id: "body-butt-arch",        emoji: "🍑", name: "The Arch",      heat: 5, score: 10, price: 39 },
  { id: "body-waist-curve",      emoji: "⏳", name: "The Waist",     heat: 4, score: 10, price: 35 },
  { id: "body-abs-definition",   emoji: "💪", name: "Abs Drop",      heat: 4, score: 10, price: 29 },
  { id: "body-thigh-close",      emoji: "🔥", name: "Inner Thigh",   heat: 5, score: 10, price: 35 },
  { id: "body-full-silhouette",  emoji: "✨", name: "Silhouette",    heat: 4, score: 10, price: 39 },
  { id: "body-lower-back-dimples", emoji: "💫", name: "Lower Back",  heat: 5, score: 10, price: 35 },
  { id: "body-hips-sway",        emoji: "💃", name: "Hip Sway",      heat: 4, score: 10, price: 25 },
  { id: "body-legs-full",        emoji: "👠", name: "Leg Day",       heat: 3, score: 9,  price: 29 },
  { id: "body-back-spine",       emoji: "🖤", name: "The Back",      heat: 4, score: 9,  price: 35 },
  { id: "body-chest-decollete",  emoji: "💎", name: "Décolleté",     heat: 3, score: 9,  price: 29 },
  { id: "heat-mirror-moment",    emoji: "🪞", name: "Mirror Moment", heat: 5, score: 10, price: 35 },
  { id: "heat-wet-editorial",    emoji: "💧", name: "Wet Editorial", heat: 5, score: 10, price: 45 },
  { id: "ppv-door-tease",        emoji: "🚪", name: "Door Tease",    heat: 4, score: 10, price: 29 },
  { id: "ppv-countdown",         emoji: "⏱️", name: "Countdown",     heat: 5, score: 10, price: 35 },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────
function CopyButton({ text }: { text: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      onClick={() => { navigator.clipboard.writeText(text); setDone(true); setTimeout(() => setDone(false), 1500); }}
      style={{ padding: "3px 10px", borderRadius: 4, border: `1px solid ${BORDER}`, background: "transparent", color: done ? GREEN : MUTED, fontSize: 10, cursor: "pointer", fontFamily: "monospace", letterSpacing: "0.06em" }}
    >
      {done ? "✓" : "COPY"}
    </button>
  );
}

function CopyCard({ label, text, accent = GOLD }: { label: string; text: string; accent?: string }) {
  return (
    <div style={{ background: CARD2, border: `1px solid ${BORDER}`, borderLeft: `3px solid ${accent}`, borderRadius: 8, padding: "10px 12px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
        <span style={{ fontSize: 9, color: accent, fontFamily: "monospace", letterSpacing: "0.14em", textTransform: "uppercase" }}>{label}</span>
        <CopyButton text={text} />
      </div>
      <p style={{ fontSize: 13, color: "#fff", lineHeight: 1.55, margin: 0 }}>{text}</p>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function VaultXDrop() {
  // ─── State ────────────────────────────────────────────────────────────────
  const [step, setStep] = useState<Step>("upload");
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [pastedUrl, setPastedUrl] = useState("");
  const [fileName, setFileName] = useState("");
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [selectedPreset, setSelectedPreset] = useState<typeof QUICK_PRESETS[0] | null>(null);
  const [title, setTitle] = useState("");
  const [price, setPrice] = useState("29");
  const [consent, setConsent] = useState(false);
  const [launching, setLaunching] = useState(false);
  const [launchStage, setLaunchStage] = useState("");
  const [result, setResult] = useState<any>(null);
  // Upload state
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [hostedUrl, setHostedUrl] = useState<string | null>(null); // real public URL, never shown
  const videoRef = useRef<HTMLVideoElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ─── tRPC ─────────────────────────────────────────────────────────────────
  const launchRevenuePath = trpc.vaultx.launchRevenuePath.useMutation();
  const postTelegram = (trpc as any).contentCommand?.postToTelegram?.useMutation?.() || { mutateAsync: async () => {} };

  // ─── Handlers ─────────────────────────────────────────────────────────────
  // Tap-to-upload: show instant local preview, then upload to storage in the
  // background. The creator never sees or touches a URL.
  const handleFileUpload = useCallback(async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    // Instant local preview
    const localPreview = URL.createObjectURL(file);
    setVideoUrl(localPreview);
    setFileName(file.name);
    setStep("preset");
    // Upload to storage in the background
    setUploading(true);
    setUploadProgress(0);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const xhr = new XMLHttpRequest();
      const done = new Promise<string>((resolve, reject) => {
        xhr.upload.onprogress = (ev) => {
          if (ev.lengthComputable) setUploadProgress(Math.round((ev.loaded / ev.total) * 100));
        };
        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            try { resolve(JSON.parse(xhr.responseText).url); }
            catch { reject(new Error("Upload parse error")); }
          } else { reject(new Error(`Upload failed (${xhr.status})`)); }
        };
        xhr.onerror = () => reject(new Error("Upload network error"));
        xhr.open("POST", "/api/video/upload/direct");
        xhr.withCredentials = true;
        xhr.send(fd);
      });
      const url = await done;
      setHostedUrl(url);
      setUploadProgress(100);
      toast.success("Video uploaded ✓");
    } catch (err: any) {
      toast.error(err?.message || "Upload failed — try again");
      setHostedUrl(null);
    } finally {
      setUploading(false);
    }
  }, []);

  const handleSelectPreset = useCallback((preset: typeof QUICK_PRESETS[0]) => {
    setSelectedPreset(preset);
    setPrice(String(preset.price));
    setTitle(`${preset.name} — Exclusive Drop`);
    setStep("configure");
  }, []);

  const handleLaunch = useCallback(async () => {
    if (!consent) { toast.error("Confirm consent to launch"); return; }
    if (!hostedUrl && uploading) { toast.info("Your video is still uploading — one moment..."); return; }
    if (!hostedUrl) { toast.error("Upload your video first"); setStep("upload"); return; }

    const sourceUrl = hostedUrl;

    setLaunching(true);
    setStep("launch");

    const stages = [
      "Running AI stack...",
      "GPT-4o enhancing your preset...",
      "Submitting to Pollo...",
      "Attaching Stripe checkout...",
      "Publishing Telegram route...",
    ];
    let si = 0;
    setLaunchStage(stages[0]);
    const stageTimer = setInterval(() => {
      si = Math.min(si + 1, stages.length - 1);
      setLaunchStage(stages[si]);
    }, 8000);

    try {
      const res = await launchRevenuePath.mutateAsync({
        title: title || `${selectedPreset?.name || "Drop"} — Exclusive`,
        contentType: "video",
        adultContentFlag: true,
        consentConfirmed: true,
        teaserDescription: selectedPreset
          ? `${selectedPreset.name} drop. ${selectedPreset.emoji} Exclusive content. Unlock for $${price}.`
          : `Premium drop. Exclusive content. Unlock for $${price}.`,
        priceCents: Math.round(parseFloat(price) * 100) || 2900,
        telegramMode: "BOOST",
        sourceMediaUrl: sourceUrl,
        resolution: "720p",
        length: "6",
        mode: "pro",
        presetId: selectedPreset?.id || undefined,
        withNarration: false,
      });

      clearInterval(stageTimer);
      setResult(res);
      setStep("result");
      toast.success("Drop launched ✓");
    } catch (err: any) {
      clearInterval(stageTimer);
      toast.error(err?.message || "Launch failed");
      setStep("configure");
    } finally {
      setLaunching(false);
    }
  }, [hostedUrl, uploading, consent, title, price, selectedPreset]);

  const handlePostTelegram = useCallback(async () => {
    const caption = result?.aiStack?.copyPack?.telegramCaption
      || selectedPreset?.name
      || "New drop just landed. Link is live.";
    const videoSrc = result?.aiStack?.narration?.audioUrl || undefined;
    try {
      await postTelegram.mutateAsync({ caption, channel: "KingCam" });
      toast.success("Posted to Telegram ✓");
    } catch (err: any) {
      toast.error(err?.message || "Telegram post failed");
    }
  }, [result, selectedPreset]);

  const reset = () => {
    setStep("upload");
    setVideoUrl(null);
    setPastedUrl("");
    setHostedUrl(null);
    setUploading(false);
    setUploadProgress(0);
    setFileName("");
    setSelectedPreset(null);
    setTitle("");
    setPrice("29");
    setConsent(false);
    setResult(null);
    setLaunchStage("");
  };

  const completedSteps = STEP_ORDER.slice(0, stepIndex(step));

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div style={{ minHeight: "100vh", background: BG, color: "#fff", fontFamily: "DM Sans, sans-serif", paddingBottom: 100 }}>

      {/* ─── Header ─────────────────────────────────────────────────────── */}
      <header style={{ position: "sticky", top: 0, zIndex: 50, background: "rgba(8,8,8,0.96)", borderBottom: `1px solid ${BORDER}`, backdropFilter: "blur(12px)" }}>
        <div style={{ maxWidth: 560, margin: "0 auto", padding: "12px 16px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <Link href="/vault-x" style={{ fontFamily: "Bebas Neue, sans-serif", fontSize: 22, color: "#fff", textDecoration: "none", letterSpacing: "0.04em" }}>
            Vault<span style={{ color: GOLD }}>X</span>
          </Link>

          {/* Progress dots */}
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            {(["upload", "preset", "configure", "launch", "result"] as Step[]).map((s, i) => {
              const done = stepIndex(step) > i;
              const active = step === s;
              return (
                <div key={s} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <div style={{
                    width: active ? 28 : 8, height: 8, borderRadius: 4,
                    background: done ? GREEN : active ? GOLD : BORDER,
                    transition: "all 0.3s",
                  }} />
                </div>
              );
            })}
          </div>

          {step !== "upload" && step !== "result" && (
            <button onClick={reset} style={{ background: "transparent", border: "none", color: MUTED, cursor: "pointer", fontSize: 12 }}>
              Start over
            </button>
          )}
          {step === "result" && (
            <button onClick={reset} style={{ background: GOLD, border: "none", color: "#000", cursor: "pointer", fontSize: 12, fontWeight: 700, padding: "6px 14px", borderRadius: 20 }}>
              New Drop
            </button>
          )}
        </div>
      </header>

      <div style={{ maxWidth: 560, margin: "0 auto", padding: "20px 16px" }}>

        {/* ═══ UPLOAD ════════════════════════════════════════════════════════ */}
        {step === "upload" && (
          <div>
            <div style={{ marginBottom: 24 }}>
              <p style={{ fontSize: 11, color: GOLD, fontFamily: "monospace", letterSpacing: "0.18em", textTransform: "uppercase", marginBottom: 6 }}>VaultX Drop</p>
              <h1 style={{ fontSize: 36, fontFamily: "Bebas Neue, sans-serif", letterSpacing: "0.04em", lineHeight: 1, margin: 0 }}>
                Drop your video.<br />We handle the rest.
              </h1>
              <p style={{ fontSize: 14, color: MUTED, marginTop: 10, lineHeight: 1.6 }}>
                Tap to upload your video. Pick a body preset. Set your price. Launch. Done.
              </p>
            </div>

            {/* Upload tap target */}
            <label style={{
              display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
              gap: 12, padding: "56px 20px", borderRadius: 16,
              border: `2px dashed ${GOLD_BORDER}`, background: GOLD_DIM,
              cursor: "pointer", marginBottom: 24, textAlign: "center",
            }}>
              <div style={{ width: 64, height: 64, borderRadius: 18, background: GOLD, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Upload size={28} color="#000" />
              </div>
              <div>
                <p style={{ fontSize: 20, fontWeight: 800, margin: 0 }}>Tap to upload your video</p>
                <p style={{ fontSize: 13, color: MUTED, margin: "4px 0 0" }}>Straight from your phone or computer — MP4, MOV, any size</p>
              </div>
              <input ref={fileInputRef} type="file" accept="video/*" style={{ display: "none" }} onChange={handleFileUpload} />
            </label>

            {/* What happens next */}
            <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 12, padding: "14px 16px" }}>
              <p style={{ fontSize: 11, color: MUTED, fontFamily: "monospace", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 10 }}>What happens next</p>
              {[
                ["🎬", "Pick a body preset", "Abs, curves, silhouette — one tap fills everything in"],
                ["💰", "Set your price", "We suggest the right price based on your preset"],
                ["🚀", "Hit Launch", "AI enhances your prompt, Pollo generates, Stripe attaches, Telegram publishes"],
              ].map(([icon, title, desc]) => (
                <div key={title} style={{ display: "flex", gap: 12, marginBottom: 10 }}>
                  <span style={{ fontSize: 18, flexShrink: 0 }}>{icon}</span>
                  <div>
                    <p style={{ fontSize: 13, fontWeight: 700, margin: 0 }}>{title}</p>
                    <p style={{ fontSize: 12, color: MUTED, margin: "2px 0 0" }}>{desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ═══ PRESET ════════════════════════════════════════════════════════ */}
        {step === "preset" && (
          <div>
            {/* Video preview thumbnail */}
            {videoUrl && (
              <div style={{ position: "relative", borderRadius: 12, overflow: "hidden", marginBottom: 20, background: "#000", aspectRatio: "9/16", maxHeight: 240 }}>
                <video
                  ref={videoRef}
                  src={videoUrl}
                  muted={isMuted}
                  playsInline
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                  onPlay={() => setIsPlaying(true)}
                  onPause={() => setIsPlaying(false)}
                />
                <div style={{ position: "absolute", bottom: 8, left: 8, display: "flex", gap: 6 }}>
                  <button onClick={() => { isPlaying ? videoRef.current?.pause() : videoRef.current?.play(); }}
                    style={{ width: 32, height: 32, borderRadius: "50%", background: "rgba(0,0,0,0.7)", border: "none", color: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    {isPlaying ? <Pause size={14} /> : <Play size={14} />}
                  </button>
                  <button onClick={() => { setIsMuted(!isMuted); if (videoRef.current) videoRef.current.muted = !isMuted; }}
                    style={{ width: 32, height: 32, borderRadius: "50%", background: "rgba(0,0,0,0.7)", border: "none", color: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    {isMuted ? <VolumeX size={14} /> : <Volume2 size={14} />}
                  </button>
                </div>
                <div style={{ position: "absolute", top: 8, right: 8, background: "rgba(0,0,0,0.7)", borderRadius: 8, padding: "4px 8px", fontSize: 11, color: "#fff" }}>
                  {fileName.slice(0, 20)}
                </div>
              </div>
            )}

            <div style={{ marginBottom: 16 }}>
              <p style={{ fontSize: 11, color: GOLD, fontFamily: "monospace", letterSpacing: "0.18em", textTransform: "uppercase", marginBottom: 4 }}>Step 2 of 4</p>
              <h2 style={{ fontSize: 28, fontFamily: "Bebas Neue, sans-serif", letterSpacing: "0.04em", margin: 0 }}>Pick your preset.</h2>
              <p style={{ fontSize: 13, color: MUTED, marginTop: 6 }}>Each preset controls lighting, motion, camera, and copy. One tap fills everything in.</p>
            </div>

            {/* Preset grid */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 16 }}>
              {QUICK_PRESETS.map(preset => (
                <button
                  key={preset.id}
                  onClick={() => handleSelectPreset(preset)}
                  style={{
                    background: CARD, border: `1px solid ${BORDER}`, borderRadius: 12,
                    padding: "12px 8px", textAlign: "center", cursor: "pointer",
                    transition: "all 0.15s",
                  }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = GOLD_BORDER; (e.currentTarget as HTMLElement).style.background = GOLD_DIM; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = BORDER; (e.currentTarget as HTMLElement).style.background = CARD; }}
                >
                  <div style={{ fontSize: 24, marginBottom: 4 }}>{preset.emoji}</div>
                  <p style={{ fontSize: 11, fontWeight: 800, margin: 0, lineHeight: 1.3 }}>{preset.name}</p>
                  <p style={{ fontSize: 10, color: MUTED, margin: "3px 0 0" }}>${preset.price} · {"🔥".repeat(Math.min(preset.heat, 3))}</p>
                </button>
              ))}
            </div>

            {/* Skip option */}
            <button
              onClick={() => setStep("configure")}
              style={{ width: "100%", padding: "12px", borderRadius: 12, border: `1px solid ${BORDER}`, background: "transparent", color: MUTED, fontSize: 13, cursor: "pointer" }}
            >
              Skip preset — configure manually
            </button>
          </div>
        )}

        {/* ═══ CONFIGURE ═════════════════════════════════════════════════════ */}
        {step === "configure" && (
          <div>
            {/* Selected preset badge */}
            {selectedPreset && (
              <div style={{ display: "flex", alignItems: "center", gap: 10, background: GOLD_DIM, border: `1px solid ${GOLD_BORDER}`, borderRadius: 12, padding: "10px 14px", marginBottom: 20 }}>
                <span style={{ fontSize: 24 }}>{selectedPreset.emoji}</span>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: 13, fontWeight: 800, margin: 0 }}>{selectedPreset.name} preset applied</p>
                  <p style={{ fontSize: 11, color: MUTED, margin: "2px 0 0" }}>Prompt, motion, camera, and copy pre-loaded</p>
                </div>
                <button onClick={() => setStep("preset")} style={{ background: "transparent", border: "none", color: MUTED, cursor: "pointer" }}>
                  <X size={16} />
                </button>
              </div>
            )}

            <div style={{ marginBottom: 20 }}>
              <p style={{ fontSize: 11, color: GOLD, fontFamily: "monospace", letterSpacing: "0.18em", textTransform: "uppercase", marginBottom: 4 }}>Step 3 of 4</p>
              <h2 style={{ fontSize: 28, fontFamily: "Bebas Neue, sans-serif", letterSpacing: "0.04em", margin: 0 }}>Set your price.</h2>
              <p style={{ fontSize: 13, color: MUTED, marginTop: 6 }}>That's all you need. Everything else is handled.</p>
            </div>

            {/* Upload status — no URLs, just confirmation */}
            <div style={{ marginBottom: 16, display: "flex", alignItems: "center", gap: 10, background: CARD, border: `1px solid ${hostedUrl ? "rgba(0,230,118,0.3)" : BORDER}`, borderRadius: 12, padding: "12px 14px" }}>
              {uploading ? (
                <>
                  <Loader2 size={18} color={GOLD} style={{ animation: "spin 1s linear infinite" }} />
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: 13, fontWeight: 700, margin: 0 }}>Uploading your video... {uploadProgress}%</p>
                    <div style={{ height: 4, background: BORDER, borderRadius: 2, marginTop: 6, overflow: "hidden" }}>
                      <div style={{ width: `${uploadProgress}%`, height: "100%", background: GOLD, transition: "width 0.2s" }} />
                    </div>
                  </div>
                </>
              ) : hostedUrl ? (
                <>
                  <Check size={18} color={GREEN} />
                  <p style={{ fontSize: 13, fontWeight: 700, margin: 0, color: "#fff" }}>{fileName} — uploaded and ready</p>
                </>
              ) : (
                <>
                  <X size={18} color={MUTED} />
                  <p style={{ fontSize: 13, margin: 0, color: MUTED }}>No video uploaded yet</p>
                </>
              )}
            </div>
            <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>

            {/* Title */}
            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 12, color: MUTED, display: "block", marginBottom: 6 }}>Drop title</label>
              <input
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder={selectedPreset ? `${selectedPreset.name} — Exclusive Drop` : "My exclusive drop"}
                style={{ width: "100%", background: CARD, border: `1px solid ${BORDER}`, borderRadius: 12, color: "#fff", fontSize: 14, padding: "12px 14px", outline: "none", boxSizing: "border-box" }}
              />
            </div>

            {/* Price */}
            <div style={{ marginBottom: 20 }}>
              <label style={{ fontSize: 12, color: MUTED, display: "block", marginBottom: 6 }}>Unlock price</label>
              <div style={{ position: "relative" }}>
                <span style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: GOLD, fontSize: 18, fontWeight: 800 }}>$</span>
                <input
                  value={price}
                  onChange={e => setPrice(e.target.value.replace(/[^0-9.]/g, ""))}
                  inputMode="decimal"
                  style={{ width: "100%", background: CARD, border: `1px solid ${GOLD_BORDER}`, borderRadius: 12, color: "#fff", fontSize: 24, fontWeight: 800, padding: "14px 14px 14px 32px", outline: "none", boxSizing: "border-box" }}
                />
              </div>
              {/* Quick price pills */}
              <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
                {["19", "29", "35", "49"].map(p => (
                  <button key={p} onClick={() => setPrice(p)}
                    style={{ flex: 1, padding: "6px 0", borderRadius: 8, border: `1px solid ${price === p ? GOLD : BORDER}`, background: price === p ? GOLD_DIM : "transparent", color: price === p ? GOLD : MUTED, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
                    ${p}
                  </button>
                ))}
              </div>
            </div>

            {/* Consent */}
            <label style={{ display: "flex", alignItems: "flex-start", gap: 12, background: CARD, border: `1px solid ${consent ? "rgba(0,230,118,0.3)" : BORDER}`, borderRadius: 12, padding: "14px", cursor: "pointer", marginBottom: 20 }}>
              <div
                onClick={() => setConsent(!consent)}
                style={{ width: 22, height: 22, borderRadius: 6, background: consent ? GREEN : "transparent", border: `2px solid ${consent ? GREEN : BORDER}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 1 }}
              >
                {consent && <Check size={14} color="#000" />}
              </div>
              <p style={{ fontSize: 13, color: consent ? "#fff" : MUTED, lineHeight: 1.5, margin: 0 }}>
                I own this content and consent to AI transformation, monetization, and distribution through VaultX.
              </p>
            </label>

            {/* Launch button */}
            <button
              onClick={handleLaunch}
              disabled={!consent || launching}
              style={{
                width: "100%", padding: "18px", borderRadius: 14,
                background: consent ? GOLD : CARD,
                color: consent ? "#000" : MUTED,
                fontSize: 18, fontWeight: 900, fontFamily: "Bebas Neue, sans-serif",
                letterSpacing: "0.1em", border: "none", cursor: consent ? "pointer" : "not-allowed",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
                boxShadow: consent ? `0 0 30px rgba(201,168,76,0.3)` : "none",
                transition: "all 0.2s",
              }}
            >
              <Zap size={20} /> LAUNCH THIS DROP
            </button>

            <p style={{ fontSize: 11, color: MUTED, textAlign: "center", marginTop: 10 }}>
              Creator keeps 85% · Platform fee 15%
            </p>
          </div>
        )}

        {/* ═══ LAUNCH (generating) ═══════════════════════════════════════════ */}
        {step === "launch" && (
          <div style={{ textAlign: "center", padding: "60px 20px" }}>
            <div style={{ width: 64, height: 64, borderRadius: "50%", background: GOLD_DIM, border: `2px solid ${GOLD_BORDER}`, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px" }}>
              <Loader2 size={28} color={GOLD} style={{ animation: "spin 1s linear infinite" }} />
            </div>
            <h2 style={{ fontSize: 28, fontFamily: "Bebas Neue, sans-serif", letterSpacing: "0.04em", margin: "0 0 8px" }}>
              Building your drop...
            </h2>
            <p style={{ fontSize: 14, color: MUTED, marginBottom: 32 }}>{launchStage}</p>

            <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 12, padding: "16px", textAlign: "left" }}>
              {[
                ["GPT-4o Scene Enhancer", "Optimizing your preset prompt"],
                ["Pollo AI Generation", "Creating your cinematic video"],
                ["Stripe Checkout", "Attaching paid unlock"],
                ["Telegram Route", "Publishing distribution"],
              ].map(([label, desc], i) => (
                <div key={label} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: i < 3 ? 12 : 0 }}>
                  <div style={{ width: 8, height: 8, borderRadius: "50%", background: GOLD, flexShrink: 0, opacity: 0.6 + i * 0.1 }} />
                  <div>
                    <p style={{ fontSize: 12, fontWeight: 700, margin: 0 }}>{label}</p>
                    <p style={{ fontSize: 11, color: MUTED, margin: 0 }}>{desc}</p>
                  </div>
                </div>
              ))}
            </div>

            <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
          </div>
        )}

        {/* ═══ RESULT ════════════════════════════════════════════════════════ */}
        {step === "result" && result && (
          <div>
            {/* Success header */}
            <div style={{ textAlign: "center", marginBottom: 24 }}>
              <div style={{ width: 56, height: 56, borderRadius: "50%", background: "rgba(0,230,118,0.15)", border: `2px solid ${GREEN}`, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 12px" }}>
                <Check size={24} color={GREEN} />
              </div>
              <h2 style={{ fontSize: 28, fontFamily: "Bebas Neue, sans-serif", letterSpacing: "0.04em", margin: "0 0 4px" }}>Drop is live.</h2>
              <p style={{ fontSize: 13, color: MUTED }}>Package created · Checkout attached · Route published</p>
            </div>

            {/* Package details */}
            <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 12, padding: "14px 16px", marginBottom: 16 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <div>
                  <p style={{ fontSize: 10, color: MUTED, fontFamily: "monospace", letterSpacing: "0.1em", textTransform: "uppercase", margin: "0 0 3px" }}>Package ID</p>
                  <p style={{ fontSize: 14, fontWeight: 800, margin: 0 }}>{result.packageId || "—"}</p>
                </div>
                <div>
                  <p style={{ fontSize: 10, color: MUTED, fontFamily: "monospace", letterSpacing: "0.1em", textTransform: "uppercase", margin: "0 0 3px" }}>Price</p>
                  <p style={{ fontSize: 14, fontWeight: 800, color: GOLD, margin: 0 }}>${price}</p>
                </div>
                <div>
                  <p style={{ fontSize: 10, color: MUTED, fontFamily: "monospace", letterSpacing: "0.1em", textTransform: "uppercase", margin: "0 0 3px" }}>Status</p>
                  <p style={{ fontSize: 13, fontWeight: 700, color: GREEN, margin: 0 }}>
                    {result.generationStatus === "succeed" ? "Asset ready" : "Generating"}
                  </p>
                </div>
                <div>
                  <p style={{ fontSize: 10, color: MUTED, fontFamily: "monospace", letterSpacing: "0.1em", textTransform: "uppercase", margin: "0 0 3px" }}>You keep</p>
                  <p style={{ fontSize: 13, fontWeight: 700, color: GREEN, margin: 0 }}>
                    ${((parseFloat(price) || 0) * 0.85).toFixed(2)}
                  </p>
                </div>
              </div>
            </div>

            {/* Checkout link */}
            {result.checkoutUrl && (
              <a href={result.checkoutUrl} target="_blank" rel="noreferrer"
                style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "14px", borderRadius: 12, background: GOLD, color: "#000", fontWeight: 900, fontSize: 15, textDecoration: "none", marginBottom: 12 }}>
                <DollarSign size={18} /> Open Checkout Link
              </a>
            )}

            {/* Telegram post button */}
            <button onClick={handlePostTelegram}
              style={{ width: "100%", padding: "14px", borderRadius: 12, background: "#0088CC", color: "#fff", fontWeight: 800, fontSize: 15, border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, marginBottom: 16 }}>
              <Send size={18} /> Post to Telegram Channel
            </button>

            {/* AI Stack copy pack */}
            {result.aiStack?.copyPack && (
              <div style={{ marginBottom: 16 }}>
                <p style={{ fontSize: 11, color: GOLD, fontFamily: "monospace", letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: 10 }}>Ready-to-use copy</p>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  <CopyCard label="Telegram" text={result.aiStack.copyPack.telegramCaption} accent="#0088CC" />
                  <CopyCard label="DM Hook" text={result.aiStack.copyPack.dmHook} accent={GOLD} />
                  <CopyCard label="PPV Unlock" text={result.aiStack.copyPack.ppvUnlockLine} accent={GREEN} />
                  {result.aiStack.copyPack.hookVariants?.slice(0, 2).map((h: string, i: number) => (
                    <CopyCard key={i} label={`Hook ${i + 1}`} text={h} accent={MUTED} />
                  ))}
                </div>
              </div>
            )}

            {/* Narration */}
            {result.aiStack?.narration?.audioUrl && (
              <div style={{ marginBottom: 16 }}>
                <p style={{ fontSize: 11, color: GOLD, fontFamily: "monospace", letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: 8 }}>KingCam voiceover</p>
                <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 12, padding: "12px 14px" }}>
                  <p style={{ fontSize: 12, color: MUTED, fontStyle: "italic", marginBottom: 8 }}>"{result.aiStack.narration.script}"</p>
                  <audio src={result.aiStack.narration.audioUrl} controls style={{ width: "100%" }} />
                </div>
              </div>
            )}

            {/* Tracked URL */}
            {result.trackedUrl && (
              <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 12, padding: "12px 14px", marginBottom: 16 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                  <p style={{ fontSize: 11, color: MUTED, fontFamily: "monospace", letterSpacing: "0.1em", textTransform: "uppercase", margin: 0 }}>Tracked Route</p>
                  <CopyButton text={result.trackedUrl} />
                </div>
                <p style={{ fontSize: 12, color: CYAN, wordBreak: "break-all", margin: 0 }}>{result.trackedUrl}</p>
              </div>
            )}

            {/* New drop button */}
            <button onClick={reset}
              style={{ width: "100%", padding: "14px", borderRadius: 12, border: `1px solid ${BORDER}`, background: "transparent", color: MUTED, fontSize: 14, fontWeight: 700, cursor: "pointer" }}>
              Create another drop
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
