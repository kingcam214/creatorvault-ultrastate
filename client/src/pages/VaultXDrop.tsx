import { ChangeEvent, useCallback, useEffect, useRef, useState } from "react";
import { Link } from "wouter";
import {
  ArrowLeft,
  Check,
  Copy,
  DollarSign,
  Download,
  ExternalLink,
  FileVideo,
  Film,
  Loader2,
  Pause,
  Play,
  RotateCcw,
  Send,
  ShieldCheck,
  Sparkles,
  Upload,
  Volume2,
  VolumeX,
  Wand2,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

const GOLD = "#D5B760";
const GOLD_DIM = "rgba(213,183,96,0.12)";
const GOLD_BORDER = "rgba(213,183,96,0.38)";
const BG = "#070707";
const CARD = "#111111";
const CARD_SOFT = "#171717";
const BORDER = "rgba(255,255,255,0.09)";
const MUTED = "rgba(255,255,255,0.55)";
const GREEN = "#45E38A";
const CYAN = "#63D9F5";
const RED = "#FF7C7C";

type Step = "upload" | "preset" | "configure" | "create" | "review";
type UploadReceipt = {
  id: string;
  sha256: string;
  verified: boolean;
  ownerBound: boolean;
  createdAt: string;
  codec: string;
  width: number;
  height: number;
  durationSec: number;
};

type QuickPreset = {
  id: string;
  name: string;
  direction: string;
  focus: string;
  price: number;
};

const STEP_ORDER: Step[] = ["upload", "preset", "configure", "create", "review"];
const STEP_LABELS: Record<Step, string> = {
  upload: "Source",
  preset: "Treatment",
  configure: "Terms",
  create: "Create",
  review: "Review",
};

const QUICK_PRESETS: QuickPreset[] = [
  { id: "body-curves-360", name: "360 Curves", direction: "Controlled orbit with full-body continuity", focus: "Full form", price: 49 },
  { id: "body-butt-arch", name: "The Arch", direction: "Sculpted side light and deliberate tension", focus: "Lower form", price: 39 },
  { id: "body-waist-curve", name: "The Waist", direction: "Editorial framing with a restrained push-in", focus: "Waistline", price: 35 },
  { id: "body-abs-definition", name: "Abs Drop", direction: "Harder definition with clean highlight control", focus: "Core", price: 29 },
  { id: "body-thigh-close", name: "Inner Thigh", direction: "Tight composition and measured slow motion", focus: "Leg line", price: 35 },
  { id: "body-full-silhouette", name: "Silhouette", direction: "Backlight, negative space, and graphic shape", focus: "Outline", price: 39 },
  { id: "body-lower-back-dimples", name: "Lower Back", direction: "Low-key light with intimate detail", focus: "Back line", price: 35 },
  { id: "body-hips-sway", name: "Hip Sway", direction: "Rhythmic lateral motion with stable framing", focus: "Hip line", price: 25 },
  { id: "body-legs-full", name: "Leg Day", direction: "Long vertical framing and runway pacing", focus: "Full legs", price: 29 },
  { id: "body-back-spine", name: "The Back", direction: "Noir edge light with restrained movement", focus: "Back", price: 35 },
  { id: "body-chest-decollete", name: "Décolleté", direction: "Soft editorial light with controlled detail", focus: "Upper form", price: 29 },
  { id: "heat-mirror-moment", name: "Mirror Moment", direction: "Reflections, depth, and a private-campaign feel", focus: "Reflection", price: 35 },
];

function stepIndex(step: Step) {
  return STEP_ORDER.indexOf(step);
}

function formatSeconds(value?: number) {
  if (!Number.isFinite(value)) return "—";
  return `${Number(value).toFixed(value && value < 10 ? 1 : 0)}s`;
}

function CopyButton({ text, label = "Copy" }: { text: string; label?: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        await navigator.clipboard.writeText(text);
        setDone(true);
        window.setTimeout(() => setDone(false), 1500);
      }}
      style={{
        minHeight: 32,
        padding: "5px 10px",
        borderRadius: 8,
        border: `1px solid ${BORDER}`,
        background: "transparent",
        color: done ? GREEN : MUTED,
        fontSize: 11,
        cursor: "pointer",
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
      }}
    >
      {done ? <Check size={13} /> : <Copy size={13} />}
      {done ? "Copied" : label}
    </button>
  );
}

function CopyCard({ label, text, accent = GOLD }: { label: string; text?: string | null; accent?: string }) {
  if (!text) return null;
  return (
    <div style={{ background: CARD_SOFT, border: `1px solid ${BORDER}`, borderLeft: `3px solid ${accent}`, borderRadius: 12, padding: "12px 14px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, marginBottom: 8 }}>
        <span style={{ fontSize: 10, color: accent, fontFamily: "monospace", letterSpacing: "0.14em", textTransform: "uppercase" }}>{label}</span>
        <CopyButton text={text} />
      </div>
      <p style={{ fontSize: 13, color: "#fff", lineHeight: 1.6, margin: 0 }}>{text}</p>
    </div>
  );
}

function StatusRow({ label, value, state }: { label: string; value: string; state: "ready" | "working" | "locked" | "failed" }) {
  const color = state === "ready" ? GREEN : state === "working" ? GOLD : state === "failed" ? RED : MUTED;
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, padding: "10px 0", borderBottom: `1px solid ${BORDER}` }}>
      <span style={{ fontSize: 12, color: MUTED }}>{label}</span>
      <span style={{ fontSize: 12, color, fontWeight: 800, textAlign: "right", display: "inline-flex", alignItems: "center", gap: 6 }}>
        {state === "working" && <Loader2 size={13} className="body-cinema-spin" />}
        {state === "ready" && <Check size={13} />}
        {value}
      </span>
    </div>
  );
}

export default function VaultXDrop() {
  const [step, setStep] = useState<Step>("upload");
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [hostedUrl, setHostedUrl] = useState<string | null>(null);
  const [uploadReceipt, setUploadReceipt] = useState<UploadReceipt | null>(null);
  const [fileName, setFileName] = useState("");
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [selectedPreset, setSelectedPreset] = useState<QuickPreset | null>(null);
  const [title, setTitle] = useState("");
  const [price, setPrice] = useState("29");
  const [consent, setConsent] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [creating, setCreating] = useState(false);
  const [createStage, setCreateStage] = useState("");
  const [result, setResult] = useState<any>(null);
  const [pollingPackageId, setPollingPackageId] = useState<number | null>(null);
  const [pollingJobId, setPollingJobId] = useState<string | null>(null);
  const [pollingStatus, setPollingStatus] = useState("waiting");
  const [pollingDots, setPollingDots] = useState(0);

  const videoRef = useRef<HTMLVideoElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pollingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const utils = trpc.useUtils();
  const launchRevenuePath = trpc.vaultx.launchRevenuePath.useMutation();
  const attachPackageCheckout = trpc.vaultx.attachPackageCheckout.useMutation();
  const publishPackageTelegramRoute = trpc.vaultx.publishPackageTelegramRoute.useMutation();
  const confirmEligibility = (trpc as any).compliance?.confirmEligibility?.useMutation?.() || { mutateAsync: async () => undefined };

  useEffect(() => {
    if (!pollingPackageId || !pollingJobId) return;
    if (["succeed", "failed"].includes(pollingStatus)) return;

    const dotsTimer = window.setInterval(() => setPollingDots(value => (value + 1) % 4), 600);
    const poll = async () => {
      try {
        const statusRes = await (utils as any).vaultx.getPackageAssetStatus.fetch({
          packageId: pollingPackageId,
          jobId: pollingJobId,
        });
        const nextStatus = String(statusRes.status || "waiting");
        setPollingStatus(nextStatus);
        if (nextStatus === "failed") {
          if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);
          pollingIntervalRef.current = null;
          setPollingPackageId(null);
          setPollingJobId(null);
          toast.error("The review asset could not be completed. Your source remains saved for another attempt.");
          return;
        }
        if (statusRes.videoUrl || nextStatus === "succeed") {
          setResult((previous: any) => ({
            ...previous,
            generationStatus: "succeed",
            status: "review_required",
            complete: true,
            reviewRequired: true,
            videoUrl: statusRes.videoUrl || previous?.videoUrl,
            artifact: statusRes.artifact || previous?.artifact,
            artifacts: statusRes.artifacts || previous?.artifacts,
          }));
          if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);
          pollingIntervalRef.current = null;
          setPollingPackageId(null);
          setPollingJobId(null);
          toast.success("Review asset is ready.");
        }
      } catch {
        // Transient status failures are retried by the bounded polling interval.
      }
    };

    void poll();
    pollingIntervalRef.current = setInterval(() => void poll(), 5000);
    return () => {
      clearInterval(dotsTimer);
      if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);
    };
  }, [pollingJobId, pollingPackageId, pollingStatus, utils]);

  useEffect(() => () => {
    if (videoUrl?.startsWith("blob:")) URL.revokeObjectURL(videoUrl);
  }, [videoUrl]);

  const handleFileUpload = useCallback(async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("video/")) {
      toast.error("Choose a video file.");
      event.target.value = "";
      return;
    }
    if (file.size > 100 * 1024 * 1024) {
      toast.error("Choose a video up to 100 MB.");
      event.target.value = "";
      return;
    }

    if (videoUrl?.startsWith("blob:")) URL.revokeObjectURL(videoUrl);
    const localPreview = URL.createObjectURL(file);
    setVideoUrl(localPreview);
    setFileName(file.name);
    setHostedUrl(null);
    setUploadReceipt(null);
    setUploadProgress(0);
    setUploading(true);
    setStep("preset");

    try {
      const form = new FormData();
      form.append("file", file);
      const payload = await new Promise<any>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.upload.onprogress = progressEvent => {
          if (progressEvent.lengthComputable) setUploadProgress(Math.round((progressEvent.loaded / progressEvent.total) * 100));
        };
        xhr.onload = () => {
          let body: any = null;
          try { body = JSON.parse(xhr.responseText); } catch { /* handled below */ }
          if (xhr.status >= 200 && xhr.status < 300 && body?.url && body?.uploadReceipt?.verified) resolve(body);
          else reject(new Error(body?.error || `Upload failed (${xhr.status})`));
        };
        xhr.onerror = () => reject(new Error("Upload network error"));
        xhr.open("POST", "/api/video/upload/direct");
        xhr.withCredentials = true;
        xhr.send(form);
      });
      setHostedUrl(payload.url);
      setUploadReceipt(payload.uploadReceipt);
      setUploadProgress(100);
      toast.success("Source verified and saved to your vault.");
    } catch (error: any) {
      setHostedUrl(null);
      setUploadReceipt(null);
      setVideoUrl(null);
      setFileName("");
      setStep("upload");
      toast.error(error?.message || "Upload verification failed.");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }, [videoUrl]);

  const handleSelectPreset = useCallback((preset: QuickPreset) => {
    setSelectedPreset(preset);
    setPrice(String(preset.price));
    setTitle(`${preset.name} — Private Release`);
    setStep("configure");
  }, []);

  const handleConsentChange = useCallback(async (checked: boolean) => {
    setConsent(checked);
    if (!checked) return;
    try {
      await confirmEligibility.mutateAsync();
    } catch {
      toast.info("Your confirmation is saved for this release. Additional eligibility checks may appear before publication.");
    }
  }, [confirmEligibility]);

  const handleCreateReviewAsset = useCallback(async () => {
    if (!hostedUrl || !uploadReceipt?.verified) {
      toast.error(uploading ? "Your source is still being verified." : "Upload and verify a source video first.");
      return;
    }
    if (!selectedPreset) {
      toast.error("Choose a cinematic treatment.");
      setStep("preset");
      return;
    }
    if (!consent) {
      toast.error("Confirm ownership and consent before creating the review asset.");
      return;
    }

    setCreating(true);
    setStep("create");
    const stages = [
      "Validating your creator-owned source…",
      "Building the cinematic direction…",
      "Creating the review render…",
      "Securing the durable artifact…",
    ];
    let stageIndex = 0;
    setCreateStage(stages[0]);
    const stageTimer = window.setInterval(() => {
      stageIndex = Math.min(stageIndex + 1, stages.length - 1);
      setCreateStage(stages[stageIndex]);
    }, 6500);

    try {
      const response = await launchRevenuePath.mutateAsync({
        title: title.trim() || `${selectedPreset.name} — Private Release`,
        contentType: "video",
        adultContentFlag: true,
        consentConfirmed: true,
        teaserDescription: `${selectedPreset.name}. ${selectedPreset.direction}. Private release available after creator approval.`,
        priceCents: Math.round((Number.parseFloat(price) || selectedPreset.price) * 100),
        telegramMode: "BOOST",
        sourceMediaUrl: hostedUrl,
        resolution: "720p",
        length: "6",
        mode: "pro",
        presetId: selectedPreset.id,
        withNarration: false,
        reviewOnly: true,
      });
      setResult(response);
      setStep("review");
      if (response.generationStatus !== "succeed" && response.packageId && response.jobId) {
        setPollingPackageId(response.packageId);
        setPollingJobId(response.jobId);
        setPollingStatus(response.generationStatus || "waiting");
        toast.success("Generation accepted. Checkout and publication remain locked.");
      } else {
        toast.success("Review asset is ready. Nothing has been published.");
      }
    } catch (error: any) {
      setStep("configure");
      toast.error(error?.message || "The review asset could not be created.");
    } finally {
      clearInterval(stageTimer);
      setCreating(false);
    }
  }, [consent, hostedUrl, launchRevenuePath, price, selectedPreset, title, uploadReceipt, uploading]);

  const handleAttachCheckout = useCallback(async () => {
    if (!result?.packageId) return;
    try {
      const response = await attachPackageCheckout.mutateAsync({ packageId: Number(result.packageId) });
      setResult((previous: any) => ({ ...previous, ...response }));
      toast.success(response.reusedExistingCheckout ? "Existing checkout restored." : "Checkout attached. Publication is still locked.");
    } catch (error: any) {
      toast.error(error?.message || "Checkout could not be attached.");
    }
  }, [attachPackageCheckout, result?.packageId]);

  const handlePublish = useCallback(async () => {
    if (!result?.packageId || !result?.checkoutUrl) return;
    try {
      const response = await publishPackageTelegramRoute.mutateAsync({ packageId: Number(result.packageId) });
      setResult((previous: any) => ({ ...previous, ...response, status: "published" }));
      toast.success(response.reusedExistingPublication ? "Existing tracked route restored." : "Tracked route published.");
    } catch (error: any) {
      toast.error(error?.message || "The tracked route could not be published.");
    }
  }, [publishPackageTelegramRoute, result?.checkoutUrl, result?.packageId]);

  const handleDownload = useCallback(() => {
    if (!result?.videoUrl) return;
    const anchor = document.createElement("a");
    anchor.href = result.videoUrl;
    anchor.target = "_blank";
    anchor.rel = "noreferrer";
    anchor.download = `${(title || "body-cinema").replace(/[^a-z0-9]+/gi, "-").toLowerCase()}.mp4`;
    anchor.click();
  }, [result?.videoUrl, title]);

  const reuseSource = useCallback(() => {
    setSelectedPreset(null);
    setTitle("");
    setPrice("29");
    setConsent(false);
    setResult(null);
    setPollingPackageId(null);
    setPollingJobId(null);
    setPollingStatus("waiting");
    setStep("preset");
    toast.info("Source retained. Choose another treatment.");
  }, []);

  const reset = useCallback(() => {
    if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);
    if (videoUrl?.startsWith("blob:")) URL.revokeObjectURL(videoUrl);
    setStep("upload");
    setVideoUrl(null);
    setHostedUrl(null);
    setUploadReceipt(null);
    setFileName("");
    setSelectedPreset(null);
    setTitle("");
    setPrice("29");
    setConsent(false);
    setUploading(false);
    setUploadProgress(0);
    setCreating(false);
    setCreateStage("");
    setResult(null);
    setPollingPackageId(null);
    setPollingJobId(null);
    setPollingStatus("waiting");
  }, [videoUrl]);

  const assetReady = Boolean(result?.videoUrl || result?.artifact?.status === "ready" || result?.generationStatus === "succeed") && !pollingPackageId;
  const checkoutAttached = Boolean(result?.checkoutUrl && result?.checkoutSessionId);
  const published = Boolean(result?.trackedUrl && result?.campaignId);
  const keepAmount = ((Number.parseFloat(price) || 0) * 0.85).toFixed(2);

  return (
    <div style={{ minHeight: "100vh", background: BG, color: "#fff", fontFamily: "DM Sans, sans-serif", paddingBottom: 96 }}>
      <style>{`
        @keyframes body-cinema-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .body-cinema-spin { animation: body-cinema-spin 1s linear infinite; }
        .body-cinema-button { transition: transform 150ms cubic-bezier(0.23,1,0.32,1), border-color 150ms cubic-bezier(0.23,1,0.32,1), background 150ms cubic-bezier(0.23,1,0.32,1); }
        .body-cinema-button:active:not(:disabled) { transform: scale(0.975); }
        .body-cinema-button:focus-visible { outline: 2px solid ${GOLD}; outline-offset: 3px; }
        @media (prefers-reduced-motion: reduce) { .body-cinema-spin { animation: none; } .body-cinema-button { transition: none; } }
      `}</style>

      <header style={{ position: "sticky", top: 0, zIndex: 50, background: "rgba(7,7,7,0.94)", borderBottom: `1px solid ${BORDER}`, backdropFilter: "blur(16px)" }}>
        <div style={{ maxWidth: 620, margin: "0 auto", padding: "12px 16px", display: "flex", alignItems: "center", gap: 14 }}>
          <Link href="/vault-x" aria-label="Back to VaultX" style={{ color: MUTED, display: "inline-flex", alignItems: "center" }}>
            <ArrowLeft size={19} />
          </Link>
          <div style={{ flex: 1 }}>
            <p style={{ margin: 0, fontFamily: "Bebas Neue, sans-serif", fontSize: 21, letterSpacing: "0.06em" }}>Body <span style={{ color: GOLD }}>Cinema</span></p>
            <p style={{ margin: "1px 0 0", color: MUTED, fontSize: 10 }}>Create. Review. Approve. Publish.</p>
          </div>
          {step === "review" && (
            <button type="button" className="body-cinema-button" onClick={reset} style={{ border: `1px solid ${BORDER}`, background: "transparent", color: "#fff", borderRadius: 999, padding: "7px 11px", fontSize: 11, cursor: "pointer" }}>
              New source
            </button>
          )}
        </div>
        <div style={{ maxWidth: 620, margin: "0 auto", padding: "0 16px 11px", display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 6 }}>
          {STEP_ORDER.map((item, index) => {
            const active = item === step;
            const complete = stepIndex(step) > index;
            return (
              <div key={item} aria-current={active ? "step" : undefined}>
                <div style={{ height: 3, borderRadius: 3, background: complete ? GREEN : active ? GOLD : BORDER, marginBottom: 5 }} />
                <p style={{ margin: 0, textAlign: "center", fontSize: 9, color: active ? "#fff" : complete ? GREEN : MUTED }}>{STEP_LABELS[item]}</p>
              </div>
            );
          })}
        </div>
      </header>

      <main style={{ maxWidth: 620, margin: "0 auto", padding: "24px 16px" }}>
        {step === "upload" && (
          <section>
            <p style={{ fontSize: 10, color: GOLD, fontFamily: "monospace", letterSpacing: "0.18em", textTransform: "uppercase", margin: "0 0 8px" }}>Creator-owned intake</p>
            <h1 style={{ fontFamily: "Bebas Neue, sans-serif", fontSize: 42, letterSpacing: "0.025em", lineHeight: 0.98, margin: 0 }}>Create the asset first.<br /><span style={{ color: GOLD }}>Sell it after review.</span></h1>
            <p style={{ fontSize: 14, color: MUTED, lineHeight: 1.65, margin: "14px 0 24px" }}>Choose a video from your device. Body Cinema verifies and saves the source directly to your vault. No URL entry is required.</p>

            <label className="body-cinema-button" style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 13, minHeight: 270, padding: 24, borderRadius: 20, border: `1px dashed ${GOLD_BORDER}`, background: `radial-gradient(circle at 50% 0%, rgba(213,183,96,0.18), transparent 55%), ${CARD}`, cursor: "pointer", textAlign: "center" }}>
              <div style={{ width: 66, height: 66, borderRadius: 20, background: GOLD, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 18px 60px rgba(213,183,96,0.2)" }}>
                <Upload size={29} color="#080808" />
              </div>
              <div>
                <p style={{ fontSize: 19, fontWeight: 900, margin: 0 }}>Tap to choose a video</p>
                <p style={{ fontSize: 12, color: MUTED, margin: "6px 0 0" }}>MP4, MOV, WebM, MKV, AVI, or M4V · up to 100 MB</p>
              </div>
              <div style={{ display: "inline-flex", alignItems: "center", gap: 7, color: GREEN, fontSize: 11, fontWeight: 800 }}><ShieldCheck size={15} /> Ownership-bound receipt after verification</div>
              <input ref={fileInputRef} type="file" accept="video/mp4,video/quicktime,video/webm,video/x-matroska,video/x-msvideo,video/x-m4v" style={{ display: "none" }} onChange={handleFileUpload} />
            </label>

            <div style={{ marginTop: 16, background: CARD, border: `1px solid ${BORDER}`, borderRadius: 16, padding: "16px" }}>
              <p style={{ fontSize: 10, color: MUTED, fontFamily: "monospace", letterSpacing: "0.12em", textTransform: "uppercase", margin: "0 0 12px" }}>What happens next</p>
              {[
                [Wand2, "Choose a treatment", "Select the intended camera, lighting, and motion direction."],
                [Film, "Inspect the render", "Nothing is called ready until a durable video artifact exists."],
                [DollarSign, "Approve checkout", "Monetization is a separate, explicit creator action."],
                [Send, "Publish a tracked route", "External distribution stays locked until you approve it."],
              ].map(([Icon, label, description], index) => {
                const ItemIcon = Icon as typeof Wand2;
                return (
                  <div key={String(label)} style={{ display: "flex", gap: 12, padding: index === 0 ? "0 0 11px" : "11px 0", borderTop: index ? `1px solid ${BORDER}` : "none" }}>
                    <ItemIcon size={18} color={GOLD} style={{ flexShrink: 0, marginTop: 1 }} />
                    <div><p style={{ fontSize: 13, fontWeight: 800, margin: 0 }}>{String(label)}</p><p style={{ fontSize: 12, color: MUTED, margin: "3px 0 0", lineHeight: 1.5 }}>{String(description)}</p></div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {step === "preset" && (
          <section>
            {videoUrl && (
              <div style={{ position: "relative", borderRadius: 18, overflow: "hidden", marginBottom: 20, background: "#000", aspectRatio: "16/9", maxHeight: 290, border: `1px solid ${BORDER}` }}>
                <video ref={videoRef} src={videoUrl} muted={isMuted} playsInline style={{ width: "100%", height: "100%", objectFit: "cover" }} onPlay={() => setIsPlaying(true)} onPause={() => setIsPlaying(false)} />
                <div style={{ position: "absolute", inset: "auto 10px 10px 10px", display: "flex", alignItems: "center", gap: 7 }}>
                  <button type="button" aria-label={isPlaying ? "Pause source preview" : "Play source preview"} onClick={() => isPlaying ? videoRef.current?.pause() : void videoRef.current?.play()} style={{ width: 38, height: 38, borderRadius: "50%", background: "rgba(0,0,0,0.74)", border: `1px solid ${BORDER}`, color: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>{isPlaying ? <Pause size={15} /> : <Play size={15} />}</button>
                  <button type="button" aria-label={isMuted ? "Unmute source preview" : "Mute source preview"} onClick={() => { const next = !isMuted; setIsMuted(next); if (videoRef.current) videoRef.current.muted = next; }} style={{ width: 38, height: 38, borderRadius: "50%", background: "rgba(0,0,0,0.74)", border: `1px solid ${BORDER}`, color: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>{isMuted ? <VolumeX size={15} /> : <Volume2 size={15} />}</button>
                  <div style={{ marginLeft: "auto", background: "rgba(0,0,0,0.74)", border: `1px solid ${BORDER}`, borderRadius: 999, padding: "7px 10px", fontSize: 10, color: uploadReceipt ? GREEN : GOLD, display: "inline-flex", alignItems: "center", gap: 6 }}>{uploadReceipt ? <Check size={12} /> : <Loader2 size={12} className="body-cinema-spin" />}{uploadReceipt ? "Source verified" : `Verifying ${uploadProgress}%`}</div>
                </div>
              </div>
            )}

            <p style={{ fontSize: 10, color: GOLD, fontFamily: "monospace", letterSpacing: "0.18em", textTransform: "uppercase", margin: "0 0 6px" }}>Treatment direction</p>
            <h2 style={{ fontFamily: "Bebas Neue, sans-serif", fontSize: 34, letterSpacing: "0.035em", margin: 0 }}>Choose the intended look.</h2>
            <p style={{ fontSize: 13, color: MUTED, lineHeight: 1.6, margin: "8px 0 18px" }}>Treatments define creative intent. The finished asset still has to pass your review.</p>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 10 }}>
              {QUICK_PRESETS.map(preset => (
                <button key={preset.id} type="button" className="body-cinema-button" onClick={() => handleSelectPreset(preset)} style={{ minHeight: 146, padding: "15px", textAlign: "left", background: CARD, border: `1px solid ${BORDER}`, borderRadius: 15, color: "#fff", cursor: "pointer" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 8, marginBottom: 18 }}><span style={{ fontSize: 9, color: GOLD, fontFamily: "monospace", letterSpacing: "0.11em", textTransform: "uppercase" }}>{preset.focus}</span><span style={{ fontSize: 11, color: MUTED }}>${preset.price}</span></div>
                  <p style={{ fontSize: 15, fontWeight: 900, margin: "0 0 6px" }}>{preset.name}</p>
                  <p style={{ fontSize: 11, color: MUTED, lineHeight: 1.5, margin: 0 }}>{preset.direction}</p>
                </button>
              ))}
            </div>
          </section>
        )}

        {step === "configure" && (
          <section>
            <button type="button" onClick={() => setStep("preset")} style={{ border: "none", background: "transparent", color: MUTED, padding: 0, marginBottom: 18, display: "inline-flex", alignItems: "center", gap: 7, cursor: "pointer", fontSize: 12 }}><ArrowLeft size={15} /> Change treatment</button>
            <div style={{ background: GOLD_DIM, border: `1px solid ${GOLD_BORDER}`, borderRadius: 16, padding: "14px", marginBottom: 20 }}>
              <p style={{ fontSize: 10, color: GOLD, fontFamily: "monospace", letterSpacing: "0.12em", textTransform: "uppercase", margin: "0 0 5px" }}>{selectedPreset?.focus || "Custom"} treatment</p>
              <p style={{ fontSize: 16, fontWeight: 900, margin: "0 0 4px" }}>{selectedPreset?.name || "Custom direction"}</p>
              <p style={{ fontSize: 12, color: MUTED, lineHeight: 1.5, margin: 0 }}>{selectedPreset?.direction || "A restrained cinematic treatment."}</p>
            </div>

            <h2 style={{ fontFamily: "Bebas Neue, sans-serif", fontSize: 34, letterSpacing: "0.035em", margin: "0 0 6px" }}>Set the release terms.</h2>
            <p style={{ fontSize: 13, color: MUTED, lineHeight: 1.6, margin: "0 0 18px" }}>The price is a preview. No checkout is created and nothing is published during generation.</p>

            <div style={{ background: CARD, border: `1px solid ${uploadReceipt ? "rgba(69,227,138,0.28)" : BORDER}`, borderRadius: 15, padding: "14px", marginBottom: 16 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 11 }}>
                {uploading ? <Loader2 size={19} color={GOLD} className="body-cinema-spin" /> : uploadReceipt ? <ShieldCheck size={19} color={GREEN} /> : <FileVideo size={19} color={MUTED} />}
                <div style={{ flex: 1, minWidth: 0 }}><p style={{ fontSize: 13, fontWeight: 800, margin: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{fileName || "No source"}</p><p style={{ fontSize: 11, color: uploadReceipt ? GREEN : GOLD, margin: "3px 0 0" }}>{uploading ? `Verifying and saving… ${uploadProgress}%` : uploadReceipt ? `${uploadReceipt.width}×${uploadReceipt.height} · ${formatSeconds(uploadReceipt.durationSec)} · ownership-bound` : "Verification required"}</p></div>
              </div>
              {uploading && <div style={{ height: 4, background: BORDER, borderRadius: 4, overflow: "hidden", marginTop: 11 }}><div style={{ width: `${uploadProgress}%`, height: "100%", background: GOLD }} /></div>}
              {uploadReceipt && <p style={{ fontSize: 9, color: MUTED, fontFamily: "monospace", margin: "10px 0 0", wordBreak: "break-all" }}>Receipt {uploadReceipt.id.slice(0, 12)} · SHA-256 {uploadReceipt.sha256.slice(0, 16)}…</p>}
            </div>

            <label style={{ display: "block", marginBottom: 14 }}>
              <span style={{ fontSize: 12, color: MUTED, display: "block", marginBottom: 6 }}>Release title</span>
              <input value={title} onChange={event => setTitle(event.target.value)} maxLength={120} placeholder="Private release" style={{ width: "100%", boxSizing: "border-box", background: CARD, border: `1px solid ${BORDER}`, borderRadius: 12, color: "#fff", fontSize: 14, padding: "13px 14px", outline: "none" }} />
            </label>

            <label style={{ display: "block", marginBottom: 18 }}>
              <span style={{ fontSize: 12, color: MUTED, display: "block", marginBottom: 6 }}>Unlock price preview</span>
              <div style={{ position: "relative" }}><span style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: GOLD, fontSize: 20, fontWeight: 900 }}>$</span><input value={price} onChange={event => setPrice(event.target.value.replace(/[^0-9.]/g, ""))} inputMode="decimal" style={{ width: "100%", boxSizing: "border-box", background: CARD, border: `1px solid ${GOLD_BORDER}`, borderRadius: 12, color: "#fff", fontSize: 24, fontWeight: 900, padding: "13px 14px 13px 34px", outline: "none" }} /></div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 7, marginTop: 8 }}>{["19", "29", "35", "49"].map(value => <button key={value} type="button" className="body-cinema-button" onClick={() => setPrice(value)} style={{ padding: "8px 0", borderRadius: 9, border: `1px solid ${price === value ? GOLD : BORDER}`, background: price === value ? GOLD_DIM : "transparent", color: price === value ? GOLD : MUTED, fontWeight: 800, cursor: "pointer" }}>${value}</button>)}</div>
            </label>

            <label style={{ display: "flex", alignItems: "flex-start", gap: 12, background: CARD, border: `1px solid ${consent ? "rgba(69,227,138,0.3)" : BORDER}`, borderRadius: 14, padding: "14px", cursor: "pointer", marginBottom: 18 }}>
              <input type="checkbox" checked={consent} onChange={event => void handleConsentChange(event.target.checked)} style={{ width: 20, height: 20, accentColor: GREEN, marginTop: 2, flexShrink: 0 }} />
              <span style={{ fontSize: 12, color: consent ? "#fff" : MUTED, lineHeight: 1.55 }}>I am 18 or older, I own this source, and I consent to its AI transformation. Checkout and distribution will still require separate approval after review.</span>
            </label>

            <button type="button" className="body-cinema-button" onClick={() => void handleCreateReviewAsset()} disabled={!consent || !uploadReceipt?.verified || creating || uploading} style={{ width: "100%", minHeight: 56, borderRadius: 14, border: "none", background: consent && uploadReceipt?.verified && !uploading ? GOLD : CARD_SOFT, color: consent && uploadReceipt?.verified && !uploading ? "#090909" : MUTED, fontFamily: "Bebas Neue, sans-serif", fontSize: 18, letterSpacing: "0.1em", fontWeight: 900, cursor: consent && uploadReceipt?.verified && !uploading ? "pointer" : "not-allowed", display: "flex", alignItems: "center", justifyContent: "center", gap: 9 }}><Sparkles size={19} /> Create review asset</button>
            <p style={{ textAlign: "center", color: MUTED, fontSize: 10, lineHeight: 1.5, margin: "10px 18px 0" }}>May use one paid generation job. Checkout and external publication remain off.</p>
          </section>
        )}

        {step === "create" && (
          <section style={{ paddingTop: 36, textAlign: "center" }}>
            <div style={{ width: 74, height: 74, borderRadius: 24, background: GOLD_DIM, border: `1px solid ${GOLD_BORDER}`, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px" }}><Loader2 size={31} color={GOLD} className="body-cinema-spin" /></div>
            <h2 style={{ fontFamily: "Bebas Neue, sans-serif", fontSize: 35, letterSpacing: "0.04em", margin: "0 0 7px" }}>Creating your review asset.</h2>
            <p style={{ fontSize: 13, color: GOLD, minHeight: 20, margin: "0 0 24px" }}>{createStage}</p>
            <div style={{ textAlign: "left", background: CARD, border: `1px solid ${BORDER}`, borderRadius: 16, padding: "8px 16px" }}>
              <StatusRow label="Creator-owned source" value="Verified" state="ready" />
              <StatusRow label="Cinematic direction" value="Prepared" state="ready" />
              <StatusRow label="Review render" value={creating ? "In progress" : "Accepted"} state="working" />
              <StatusRow label="Checkout" value="Locked" state="locked" />
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, padding: "10px 0" }}><span style={{ fontSize: 12, color: MUTED }}>External publication</span><span style={{ fontSize: 12, color: MUTED, fontWeight: 800 }}>Locked</span></div>
            </div>
          </section>
        )}

        {step === "review" && result && (
          <section>
            <div style={{ textAlign: "center", marginBottom: 20 }}>
              <div style={{ width: 58, height: 58, borderRadius: 19, background: published ? "rgba(69,227,138,0.13)" : assetReady ? GOLD_DIM : CARD, border: `1px solid ${published ? "rgba(69,227,138,0.42)" : assetReady ? GOLD_BORDER : BORDER}`, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 12px" }}>{published ? <Check size={25} color={GREEN} /> : assetReady ? <Film size={25} color={GOLD} /> : <Loader2 size={25} color={GOLD} className="body-cinema-spin" />}</div>
              <p style={{ fontSize: 10, color: published ? GREEN : GOLD, fontFamily: "monospace", letterSpacing: "0.15em", textTransform: "uppercase", margin: "0 0 6px" }}>{published ? "Published after approval" : assetReady ? "Creator review required" : "Generation in progress"}</p>
              <h2 style={{ fontFamily: "Bebas Neue, sans-serif", fontSize: 35, letterSpacing: "0.035em", margin: "0 0 7px" }}>{published ? "Your tracked route is live." : assetReady ? "Inspect the finished asset." : `Your render is still working${".".repeat(pollingDots + 1)}`}</h2>
              <p style={{ color: MUTED, fontSize: 12, lineHeight: 1.55, margin: 0 }}>{published ? "The checkout and campaign share the same package lineage." : "Nothing is published until you approve the checkout and the tracked route below."}</p>
            </div>

            <div style={{ position: "relative", borderRadius: 18, overflow: "hidden", background: "#000", aspectRatio: "9/16", maxHeight: 560, margin: "0 auto 16px", border: `1px solid ${BORDER}` }}>
              <video src={result.videoUrl || videoUrl || undefined} controls={assetReady} muted={!assetReady} autoPlay={false} playsInline style={{ width: "100%", height: "100%", objectFit: "contain" }} />
              {!assetReady && <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center", textAlign: "center", padding: 24 }}><div><Loader2 size={26} color={GOLD} className="body-cinema-spin" style={{ marginBottom: 10 }} /><p style={{ margin: 0, fontSize: 12, color: "#fff", fontWeight: 800 }}>Source preview</p><p style={{ margin: "4px 0 0", fontSize: 11, color: MUTED }}>The finished render replaces this view when the artifact is durable.</p></div></div>}
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 9, marginBottom: 16 }}>
              <button type="button" className="body-cinema-button" onClick={handleDownload} disabled={!assetReady} style={{ minHeight: 46, borderRadius: 12, border: `1px solid ${assetReady ? GOLD_BORDER : BORDER}`, background: assetReady ? GOLD_DIM : CARD, color: assetReady ? GOLD : MUTED, fontWeight: 800, cursor: assetReady ? "pointer" : "not-allowed", display: "flex", alignItems: "center", justifyContent: "center", gap: 7 }}><Download size={16} /> Download</button>
              <button type="button" className="body-cinema-button" onClick={reuseSource} style={{ minHeight: 46, borderRadius: 12, border: `1px solid ${BORDER}`, background: CARD, color: "#fff", fontWeight: 800, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 7 }}><RotateCcw size={16} /> Reuse source</button>
            </div>

            <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 16, padding: "6px 15px", marginBottom: 16 }}>
              <StatusRow label="Source receipt" value="Verified" state="ready" />
              <StatusRow label="Review asset" value={assetReady ? "Ready" : pollingStatus === "failed" ? "Failed" : "Generating"} state={assetReady ? "ready" : pollingStatus === "failed" ? "failed" : "working"} />
              <StatusRow label="Checkout" value={checkoutAttached ? "Attached" : "Locked"} state={checkoutAttached ? "ready" : "locked"} />
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, padding: "10px 0" }}><span style={{ fontSize: 12, color: MUTED }}>Tracked publication</span><span style={{ fontSize: 12, color: published ? GREEN : MUTED, fontWeight: 800, display: "inline-flex", alignItems: "center", gap: 6 }}>{published && <Check size={13} />}{published ? "Published" : "Locked"}</span></div>
            </div>

            <div style={{ background: `linear-gradient(145deg, ${CARD_SOFT}, ${CARD})`, border: `1px solid ${GOLD_BORDER}`, borderRadius: 18, padding: "16px", marginBottom: 16 }}>
              <p style={{ fontSize: 10, color: GOLD, fontFamily: "monospace", letterSpacing: "0.14em", textTransform: "uppercase", margin: "0 0 5px" }}>Approval sequence</p>
              <p style={{ fontSize: 13, color: MUTED, lineHeight: 1.55, margin: "0 0 14px" }}>You keep ${keepAmount} at the displayed ${price} price before applicable payment processing. The platform split is 85% creator / 15% platform.</p>

              <button type="button" className="body-cinema-button" onClick={() => void handleAttachCheckout()} disabled={!assetReady || attachPackageCheckout.isPending || checkoutAttached} style={{ width: "100%", minHeight: 50, borderRadius: 12, border: "none", background: checkoutAttached ? "rgba(69,227,138,0.12)" : assetReady ? GOLD : CARD, color: checkoutAttached ? GREEN : assetReady ? "#090909" : MUTED, fontWeight: 900, cursor: assetReady && !checkoutAttached ? "pointer" : "not-allowed", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, marginBottom: 9 }}>{attachPackageCheckout.isPending ? <Loader2 size={17} className="body-cinema-spin" /> : checkoutAttached ? <Check size={17} /> : <DollarSign size={17} />}{checkoutAttached ? "Checkout attached" : "1. Approve and attach checkout"}</button>

              {checkoutAttached && result.checkoutUrl && <a href={result.checkoutUrl} target="_blank" rel="noreferrer" style={{ minHeight: 42, borderRadius: 11, border: `1px solid ${BORDER}`, color: CYAN, textDecoration: "none", fontSize: 12, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center", gap: 7, marginBottom: 9 }}><ExternalLink size={15} /> Open checkout preview</a>}

              <button type="button" className="body-cinema-button" onClick={() => void handlePublish()} disabled={!checkoutAttached || publishPackageTelegramRoute.isPending || published} style={{ width: "100%", minHeight: 50, borderRadius: 12, border: `1px solid ${published ? "rgba(69,227,138,0.32)" : checkoutAttached ? "rgba(99,217,245,0.38)" : BORDER}`, background: published ? "rgba(69,227,138,0.12)" : checkoutAttached ? "rgba(99,217,245,0.1)" : CARD, color: published ? GREEN : checkoutAttached ? CYAN : MUTED, fontWeight: 900, cursor: checkoutAttached && !published ? "pointer" : "not-allowed", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>{publishPackageTelegramRoute.isPending ? <Loader2 size={17} className="body-cinema-spin" /> : published ? <Check size={17} /> : <Send size={17} />}{published ? "Tracked route published" : "2. Publish tracked route"}</button>
            </div>

            {result.trackedUrl && (
              <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 14, padding: "13px 14px", marginBottom: 16 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 7 }}><p style={{ margin: 0, fontSize: 10, color: MUTED, fontFamily: "monospace", letterSpacing: "0.12em", textTransform: "uppercase" }}>Tracked route</p><CopyButton text={result.trackedUrl} /></div>
                <p style={{ color: CYAN, fontSize: 11, wordBreak: "break-all", margin: 0 }}>{result.trackedUrl}</p>
              </div>
            )}

            {result.aiStack?.copyPack && (
              <div style={{ marginBottom: 16 }}>
                <p style={{ fontSize: 10, color: GOLD, fontFamily: "monospace", letterSpacing: "0.14em", textTransform: "uppercase", margin: "0 0 10px" }}>Prepared release copy</p>
                <div style={{ display: "grid", gap: 9 }}>
                  <CopyCard label="Channel caption" text={result.aiStack.copyPack.telegramCaption} accent={CYAN} />
                  <CopyCard label="Direct-message hook" text={result.aiStack.copyPack.dmHook} />
                  <CopyCard label="Paid-unlock line" text={result.aiStack.copyPack.ppvUnlockLine} accent={GREEN} />
                  {result.aiStack.copyPack.hookVariants?.slice(0, 2).map((hook: string, index: number) => <CopyCard key={`${hook}-${index}`} label={`Hook ${index + 1}`} text={hook} accent={MUTED} />)}
                </div>
              </div>
            )}

            <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 14, padding: "12px 14px", color: MUTED, fontSize: 10, lineHeight: 1.55 }}>
              Package {result.packageId || "—"} · protected generation lineage · source receipt {uploadReceipt?.id.slice(0, 8) || "verified"}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
