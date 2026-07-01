/**
 * WhatsApp Profit Studio — Body Cinema Distribution
 * ============================================================================
 * Premium Body Cinema packaging for opt-in WhatsApp audience lanes.
 * Tabs: Video · Clone · Image · Voice · Copy · Schedule
 * All Replicate models. Multilingual. Full-body clone video. TTS.
 * ============================================================================
 */
import { useState, useEffect, useRef } from "react";
import { MediaUpload } from "@/components/MediaUpload";
import { trpc } from "../lib/trpc";
import {
  Video, Image, Mic, MessageSquare, Calendar, Settings,
  Play, Loader2, CheckCircle, AlertCircle, Download, Copy,
  Globe, Zap, ChevronDown, Upload, RefreshCw, Plus, Trash2,
  Send, Clock, Users, BarChart3, Sparkles, Film,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────
type Tab = "video" | "clone" | "image" | "voice" | "copy" | "schedule";
type Language = "en" | "es" | "fr" | "pt" | "ht" | "ar" | "zh";
type GenerationStatus = "idle" | "generating" | "polling" | "done" | "error";

const LANGUAGES: { value: Language; label: string; flag: string }[] = [
  { value: "en", label: "English", flag: "🇺🇸" },
  { value: "es", label: "Español", flag: "🇪🇸" },
  { value: "fr", label: "Français", flag: "🇫🇷" },
  { value: "pt", label: "Português", flag: "🇧🇷" },
  { value: "ht", label: "Kreyòl", flag: "🇭🇹" },
  { value: "ar", label: "العربية", flag: "🇸🇦" },
  { value: "zh", label: "中文", flag: "🇨🇳" },
];

const VIDEO_MODELS = [
  { value: "minimax", label: "Cinema Engine", desc: "Premium short-form motion for paid tease drops" },
  { value: "zeroscope", label: "Motion Cut XL", desc: "High-resolution concept clips and scene bridges" },
  { value: "hotshot", label: "Teaser Loop", desc: "Fast animated hooks for status and channel previews" },
];

const IMAGE_MODELS = [
  { value: "flux_clone", label: "Signature Look", desc: "Creator-approved reference style for brand-consistent visuals" },
  { value: "photomaker", label: "Cover Art Builder", desc: "Reference-driven campaign visuals and promo stills" },
  { value: "instant_id", label: "Identity-Safe Portrait", desc: "Consent-first creator portraits from approved references" },
  { value: "sdxl", label: "Visual Lab", desc: "Premium backgrounds, thumbnails, and promo concepts" },
];

const COPY_TYPES = [
  { value: "status", label: "Status Tease" },
  { value: "broadcast", label: "VIP Blast" },
  { value: "caption", label: "Scene Caption" },
  { value: "cta", label: "Buy Button Copy" },
  { value: "promo", label: "Paid Drop Promo" },
  { value: "teaser", label: "Curiosity Hook" },
  { value: "announcement", label: "Launch Note" },
];

const TONES = [
  { value: "casual", label: "Casual" },
  { value: "professional", label: "Luxury" },
  { value: "flirty", label: "Flirty" },
  { value: "urgent", label: "Limited Drop" },
  { value: "hype", label: "High Heat" },
];

const VOICES = [
  { value: "af_heart", label: "Heart (Female, EN)" },
  { value: "af_bella", label: "Bella (Female, EN)" },
  { value: "af_nicole", label: "Nicole (Female, EN)" },
  { value: "af_sarah", label: "Sarah (Female, EN)" },
  { value: "am_adam", label: "Adam (Male, EN)" },
  { value: "am_michael", label: "Michael (Male, EN)" },
  { value: "bf_emma", label: "Emma (Female, EN-UK)" },
  { value: "bf_isabella", label: "Isabella (Female, EN-UK)" },
  { value: "bm_george", label: "George (Male, EN-UK)" },
  { value: "ef_dora", label: "Dora (Female, ES)" },
  { value: "ff_siwis", label: "Siwis (Female, FR)" },
  { value: "hf_alpha", label: "Alpha (Female, HT)" },
  { value: "hm_omega", label: "Omega (Male, HT)" },
  { value: "zf_xiaobei", label: "Xiaobei (Female, ZH)" },
  { value: "zm_yunjian", label: "Yunjian (Male, ZH)" },
];

const MOTION_STYLES = [
  { value: "natural", label: "Natural" },
  { value: "dynamic", label: "Dynamic" },
  { value: "slow", label: "Slow & Elegant" },
  { value: "cinematic", label: "Cinematic" },
];

const PROFIT_RAILS = [
  { label: "Body Cinema Packager", desc: "Turn raw scenes into teaser clips, cover visuals, voice notes, captions, and launch copy from one command center." },
  { label: "Opt-In Audience Lanes", desc: "Prepare compliant WhatsApp drops for VIP buyers, fan clubs, studios, and high-intent subscriber segments." },
  { label: "AI Profit Assist", desc: "Use the model stack for hooks, angles, multilingual copy, visual polish, and monetization-ready delivery assets." },
];

const LAUNCH_GUARDS = [
  "Consent-first references",
  "Opt-in audience delivery",
  "No deepfake positioning",
  "Paid-drop packaging",
];

// ─── Shared components ────────────────────────────────────────────────────────
function LanguageSelector({ value, onChange }: { value: Language; onChange: (v: Language) => void }) {
  const [open, setOpen] = useState(false);
  const selected = LANGUAGES.find(l => l.value === value)!;
  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 px-3 py-2 bg-[#1a1a2e] border border-[#25d366]/30 rounded-lg text-sm text-white hover:border-[#25d366]/60 transition-colors"
      >
        <Globe className="w-4 h-4 text-[#25d366]" />
        <span>{selected.flag} {selected.label}</span>
        <ChevronDown className="w-3 h-3 opacity-60" />
      </button>
      {open && (
        <div className="absolute top-full mt-1 left-0 z-50 bg-[#0d0d1a] border border-[#25d366]/30 rounded-lg overflow-hidden shadow-xl min-w-[160px]">
          {LANGUAGES.map(l => (
            <button
              key={l.value}
              onClick={() => { onChange(l.value); setOpen(false); }}
              className={`w-full text-left px-3 py-2 text-sm hover:bg-[#25d366]/10 transition-colors flex items-center gap-2 ${value === l.value ? "text-[#25d366]" : "text-gray-300"}`}
            >
              {l.flag} {l.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function GenerationOutput({ status, output, error, type }: { status: GenerationStatus; output: any; error?: string; type: string }) {
  if (status === "idle") return null;
  if (status === "generating" || status === "polling") {
    return (
      <div className="mt-4 p-4 bg-[#0d0d1a] border border-[#25d366]/20 rounded-xl flex items-center gap-3">
        <Loader2 className="w-5 h-5 text-[#25d366] animate-spin" />
        <div>
          <p className="text-white text-sm font-medium">{status === "generating" ? "Sending to AI..." : "Generating..."}</p>
          <p className="text-gray-400 text-xs mt-0.5">This may take 30–120 seconds</p>
        </div>
      </div>
    );
  }
  if (status === "error") {
    return (
      <div className="mt-4 p-4 bg-red-900/20 border border-red-500/30 rounded-xl flex items-center gap-3">
        <AlertCircle className="w-5 h-5 text-red-400" />
        <p className="text-red-300 text-sm">{error || "Generation failed"}</p>
      </div>
    );
  }
  if (status === "done" && output) {
    return (
      <div className="mt-4 p-4 bg-[#0d0d1a] border border-[#25d366]/30 rounded-xl">
        <div className="flex items-center gap-2 mb-3">
          <CheckCircle className="w-4 h-4 text-[#25d366]" />
          <span className="text-[#25d366] text-sm font-medium">Generated</span>
        </div>
        {type === "copy" && (
          <div className="space-y-2">
            <div className="bg-[#1a1a2e] rounded-lg p-3 text-gray-200 text-sm whitespace-pre-wrap">{output.content}</div>
            <div className="flex items-center justify-between text-xs text-gray-500">
              <span>{output.charCount} characters</span>
              <button
                onClick={() => navigator.clipboard.writeText(output.content)}
                className="flex items-center gap-1 text-[#25d366] hover:text-[#25d366]/80"
              >
                <Copy className="w-3 h-3" /> Copy
              </button>
            </div>
          </div>
        )}
        {(type === "video" || type === "animate" || type === "clone_video") && output.predictionId && (
          <div className="space-y-2">
            <p className="text-gray-300 text-sm">{output.message}</p>
            <p className="text-gray-500 text-xs">Prediction ID: {output.predictionId}</p>
            <p className="text-gray-500 text-xs">Status: <span className={output.status === "succeeded" ? "text-[#25d366]" : "text-yellow-400"}>{output.status}</span></p>
            {output.output && Array.isArray(output.output) && output.output.map((url: string, i: number) => (
              <div key={i} className="mt-2">
                {url.includes(".mp4") || url.includes("video") ? (
                  <video src={url} controls className="w-full rounded-lg max-h-64 bg-black" />
                ) : (
                  <img src={url} alt="output" className="w-full rounded-lg max-h-64 object-contain bg-black" />
                )}
                <a href={url} download className="mt-2 flex items-center gap-1 text-[#25d366] text-xs hover:underline">
                  <Download className="w-3 h-3" /> Download
                </a>
              </div>
            ))}
          </div>
        )}
        {(type === "image") && output.predictionId && (
          <div className="space-y-2">
            <p className="text-gray-300 text-sm">{output.message}</p>
            <p className="text-gray-500 text-xs">Model: {output.model} · Status: <span className={output.status === "succeeded" ? "text-[#25d366]" : "text-yellow-400"}>{output.status}</span></p>
            {output.output && Array.isArray(output.output) && output.output.map((url: string, i: number) => (
              <div key={i} className="mt-2">
                <img src={url} alt="output" className="w-full rounded-lg max-h-64 object-contain bg-black" />
                <a href={url} download className="mt-1 flex items-center gap-1 text-[#25d366] text-xs hover:underline">
                  <Download className="w-3 h-3" /> Download
                </a>
              </div>
            ))}
          </div>
        )}
        {type === "voice" && output.predictionId && (
          <div className="space-y-2">
            <p className="text-gray-300 text-sm">{output.message}</p>
            <p className="text-gray-500 text-xs">Voice: {output.voice} · Status: <span className={output.status === "succeeded" ? "text-[#25d366]" : "text-yellow-400"}>{output.status}</span></p>
            {output.output && (
              <audio src={Array.isArray(output.output) ? output.output[0] : output.output} controls className="w-full mt-2" />
            )}
          </div>
        )}
      </div>
    );
  }
  return null;
}

// ─── Video Tab ────────────────────────────────────────────────────────────────
function VideoTab() {
  const [prompt, setPrompt] = useState("");
  const [language, setLanguage] = useState<Language>("en");
  const [model, setModel] = useState<"minimax" | "zeroscope" | "hotshot">("minimax");
  const [firstFrameUrl, setFirstFrameUrl] = useState("");
  const [status, setStatus] = useState<GenerationStatus>("idle");
  const [output, setOutput] = useState<any>(null);
  const [error, setError] = useState("");
  const pollRef = useRef<NodeJS.Timeout | null>(null);

  const generateMut = trpc.whatsappContent.generateVideo.useMutation();
  const pollQuery = trpc.whatsappContent.getPredictionStatus.useQuery(
    { predictionId: output?.predictionId || "" },
    { enabled: status === "polling" && !!output?.predictionId, refetchInterval: 8000 }
  );

  useEffect(() => {
    if (pollQuery.data && status === "polling") {
      if (pollQuery.data.status === "succeeded") {
        setOutput((prev: any) => ({ ...prev, ...pollQuery.data }));
        setStatus("done");
      } else if (pollQuery.data.status === "failed") {
        setError(pollQuery.data.error || "Generation failed");
        setStatus("error");
      }
    }
  }, [pollQuery.data]);

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    setStatus("generating");
    setError("");
    try {
      const result = await generateMut.mutateAsync({ prompt, language, model, ...(firstFrameUrl ? { firstFrameImage: firstFrameUrl } : {}) });
      setOutput(result);
      setStatus("polling");
    } catch (e: any) {
      setError(e.message || "Failed to start generation");
      setStatus("error");
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-white font-semibold flex items-center gap-2"><Film className="w-4 h-4 text-[#25d366]" /> Text-to-Video</h3>
        <LanguageSelector value={language} onChange={setLanguage} />
      </div>

      <div className="grid grid-cols-3 gap-2">
        {VIDEO_MODELS.map(m => (
          <button
            key={m.value}
            onClick={() => setModel(m.value as any)}
            className={`p-3 rounded-xl border text-left transition-all ${model === m.value ? "border-[#25d366] bg-[#25d366]/10" : "border-[#25d366]/20 bg-[#0d0d1a] hover:border-[#25d366]/40"}`}
          >
            <p className="text-white text-xs font-medium">{m.label}</p>
            <p className="text-gray-500 text-xs mt-0.5">{m.desc}</p>
          </button>
        ))}
      </div>

      <div>
        <label className="text-gray-400 text-xs mb-1 block">Video Prompt</label>
        <textarea
          value={prompt}
          onChange={e => setPrompt(e.target.value)}
          placeholder="Describe the video you want to generate..."
          rows={3}
          className="w-full bg-[#0d0d1a] border border-[#25d366]/20 rounded-xl px-4 py-3 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-[#25d366]/60 resize-none"
        />
      </div>

      <div>
        <label className="text-gray-400 text-xs mb-1 block">First Frame Image URL (optional — MiniMax only)</label>
        <input
          value={firstFrameUrl}
          onChange={e => setFirstFrameUrl(e.target.value)}
          placeholder="Tap to upload image"
          className="w-full bg-[#0d0d1a] border border-[#25d366]/20 rounded-xl px-4 py-2.5 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-[#25d366]/60"
        />
      </div>

      <button
        onClick={handleGenerate}
        disabled={!prompt.trim() || status === "generating" || status === "polling"}
        className="w-full py-3 bg-[#25d366] hover:bg-[#25d366]/90 disabled:opacity-40 disabled:cursor-not-allowed text-black font-semibold rounded-xl flex items-center justify-center gap-2 transition-colors"
      >
        {status === "generating" || status === "polling" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
        {status === "generating" ? "Starting..." : status === "polling" ? "Generating..." : "Generate Video"}
      </button>

      <GenerationOutput status={status} output={output} error={error} type="video" />
    </div>
  );
}

// ─── Clone Tab ────────────────────────────────────────────────────────────────
function CloneTab() {
  const [prompt, setPrompt] = useState("");
  const [language, setLanguage] = useState<Language>("en");
  const [motionStyle, setMotionStyle] = useState<"natural" | "dynamic" | "slow" | "cinematic">("cinematic");
  const [numPoses, setNumPoses] = useState(1);
  const [useClone, setUseClone] = useState(true);
  const [refImageUrl, setRefImageUrl] = useState("");
  const [status, setStatus] = useState<GenerationStatus>("idle");
  const [output, setOutput] = useState<any>(null);
  const [error, setError] = useState("");

  const generateMut = trpc.whatsappContent.generateCloneVideo.useMutation();
  const pollQuery = trpc.whatsappContent.getPredictionStatus.useQuery(
    { predictionId: output?.predictionId || "" },
    { enabled: status === "polling" && !!output?.predictionId, refetchInterval: 8000 }
  );

  useEffect(() => {
    if (pollQuery.data && status === "polling") {
      if (pollQuery.data.status === "succeeded") {
        setOutput((prev: any) => ({ ...prev, ...pollQuery.data }));
        setStatus("done");
      } else if (pollQuery.data.status === "failed") {
        setError(pollQuery.data.error || "Generation failed");
        setStatus("error");
      }
    }
  }, [pollQuery.data]);

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    setStatus("generating");
    setError("");
    try {
      const result = await generateMut.mutateAsync({
        prompt, language, motionStyle, numPoses, useCloneModel: useClone,
        ...(refImageUrl ? { referenceImageUrl: refImageUrl } : {}),
      });
      setOutput(result);
      setStatus("polling");
    } catch (e: any) {
      setError(e.message || "Failed to start generation");
      setStatus("error");
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-white font-semibold flex items-center gap-2"><Sparkles className="w-4 h-4 text-[#25d366]" /> Clone Video</h3>
        <LanguageSelector value={language} onChange={setLanguage} />
      </div>

      <div className="p-3 bg-[#25d366]/10 border border-[#25d366]/30 rounded-xl">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-white text-sm font-medium">KingCam Clone Model</p>
            <p className="text-gray-400 text-xs mt-0.5">Your custom trained Flux model — fluxdevCam trigger word</p>
          </div>
          <button
            onClick={() => setUseClone(!useClone)}
            className={`relative w-10 h-5 rounded-full transition-colors ${useClone ? "bg-[#25d366]" : "bg-gray-700"}`}
          >
            <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-all ${useClone ? "left-5" : "left-0.5"}`} />
          </button>
        </div>
      </div>

      {!useClone && (
        <div>
          <label className="text-gray-400 text-xs mb-1 block">Reference Image URL (for consistent-character)</label>
          <input
            value={refImageUrl}
            onChange={e => setRefImageUrl(e.target.value)}
            placeholder="Tap to upload reference photo"
            className="w-full bg-[#0d0d1a] border border-[#25d366]/20 rounded-xl px-4 py-2.5 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-[#25d366]/60"
          />
        </div>
      )}

      <div>
        <label className="text-gray-400 text-xs mb-1 block">Prompt</label>
        <textarea
          value={prompt}
          onChange={e => setPrompt(e.target.value)}
          placeholder="Describe the scene, outfit, setting, pose..."
          rows={3}
          className="w-full bg-[#0d0d1a] border border-[#25d366]/20 rounded-xl px-4 py-3 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-[#25d366]/60 resize-none"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-gray-400 text-xs mb-1 block">Motion Style</label>
          <div className="grid grid-cols-2 gap-1.5">
            {MOTION_STYLES.map(s => (
              <button
                key={s.value}
                onClick={() => setMotionStyle(s.value as any)}
                className={`py-2 px-2 rounded-lg text-xs font-medium transition-all ${motionStyle === s.value ? "bg-[#25d366] text-black" : "bg-[#0d0d1a] border border-[#25d366]/20 text-gray-300 hover:border-[#25d366]/40"}`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="text-gray-400 text-xs mb-1 block">Outputs: {numPoses}</label>
          <input
            type="range" min={1} max={4} value={numPoses}
            onChange={e => setNumPoses(Number(e.target.value))}
            className="w-full accent-[#25d366] mt-2"
          />
          <div className="flex justify-between text-xs text-gray-600 mt-1">
            <span>1</span><span>4</span>
          </div>
        </div>
      </div>

      <button
        onClick={handleGenerate}
        disabled={!prompt.trim() || status === "generating" || status === "polling"}
        className="w-full py-3 bg-[#25d366] hover:bg-[#25d366]/90 disabled:opacity-40 disabled:cursor-not-allowed text-black font-semibold rounded-xl flex items-center justify-center gap-2 transition-colors"
      >
        {status === "generating" || status === "polling" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
        {status === "generating" ? "Starting..." : status === "polling" ? "Generating..." : "Generate Clone Visual"}
      </button>

      <GenerationOutput status={status} output={output} error={error} type="clone_video" />
    </div>
  );
}

// ─── Image Tab ────────────────────────────────────────────────────────────────
function ImageTab() {
  const [prompt, setPrompt] = useState("");
  const [language, setLanguage] = useState<Language>("en");
  const [model, setModel] = useState<"flux_clone" | "photomaker" | "instant_id" | "sdxl">("flux_clone");
  const [refImageUrl, setRefImageUrl] = useState("");
  const [style, setStyle] = useState<"Cinematic" | "(No style)" | "Digital Art" | "Photographic (Default)" | "Fantasy art" | "Neonpunk" | "Enhance" | "Comic book">("Cinematic");
  const [numOutputs, setNumOutputs] = useState(1);
  const [status, setStatus] = useState<GenerationStatus>("idle");
  const [output, setOutput] = useState<any>(null);
  const [error, setError] = useState("");

  const generateMut = trpc.whatsappContent.generateImage.useMutation();
  const pollQuery = trpc.whatsappContent.getPredictionStatus.useQuery(
    { predictionId: output?.predictionId || "" },
    { enabled: status === "polling" && !!output?.predictionId, refetchInterval: 6000 }
  );

  useEffect(() => {
    if (pollQuery.data && status === "polling") {
      if (pollQuery.data.status === "succeeded") {
        setOutput((prev: any) => ({ ...prev, ...pollQuery.data }));
        setStatus("done");
      } else if (pollQuery.data.status === "failed") {
        setError(pollQuery.data.error || "Generation failed");
        setStatus("error");
      }
    }
  }, [pollQuery.data]);

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    setStatus("generating");
    setError("");
    try {
      const result = await generateMut.mutateAsync({
        prompt, language, model, numOutputs, style,
        ...(refImageUrl ? { referenceImageUrl: refImageUrl } : {}),
      });
      setOutput(result);
      setStatus("polling");
    } catch (e: any) {
      setError(e.message || "Failed");
      setStatus("error");
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-white font-semibold flex items-center gap-2"><Image className="w-4 h-4 text-[#25d366]" /> Image Generation</h3>
        <LanguageSelector value={language} onChange={setLanguage} />
      </div>

      <div className="grid grid-cols-2 gap-2">
        {IMAGE_MODELS.map(m => (
          <button
            key={m.value}
            onClick={() => setModel(m.value as any)}
            className={`p-3 rounded-xl border text-left transition-all ${model === m.value ? "border-[#25d366] bg-[#25d366]/10" : "border-[#25d366]/20 bg-[#0d0d1a] hover:border-[#25d366]/40"}`}
          >
            <p className="text-white text-xs font-medium">{m.label}</p>
            <p className="text-gray-500 text-xs mt-0.5">{m.desc}</p>
          </button>
        ))}
      </div>

      {(model === "photomaker" || model === "instant_id") && (
        <div>
          <label className="text-gray-400 text-xs mb-1 block">Reference Image URL (required for {model})</label>
          <input
            value={refImageUrl}
            onChange={e => setRefImageUrl(e.target.value)}
            placeholder="Tap to upload reference photo"
            className="w-full bg-[#0d0d1a] border border-[#25d366]/20 rounded-xl px-4 py-2.5 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-[#25d366]/60"
          />
        </div>
      )}

      <div>
        <label className="text-gray-400 text-xs mb-1 block">Prompt</label>
        <textarea
          value={prompt}
          onChange={e => setPrompt(e.target.value)}
          placeholder="Describe the image..."
          rows={3}
          className="w-full bg-[#0d0d1a] border border-[#25d366]/20 rounded-xl px-4 py-3 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-[#25d366]/60 resize-none"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        {model === "photomaker" && (
          <div>
            <label className="text-gray-400 text-xs mb-1 block">Style</label>
            <select
              value={style}
              onChange={e => setStyle(e.target.value as any)}
              className="w-full bg-[#0d0d1a] border border-[#25d366]/20 rounded-lg px-3 py-2 text-white text-sm focus:outline-none"
            >
              {["(No style)", "Cinematic", "Digital Art", "Photographic (Default)", "Fantasy art", "Neonpunk", "Enhance", "Comic book"].map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
        )}
        <div>
          <label className="text-gray-400 text-xs mb-1 block">Outputs: {numOutputs}</label>
          <input type="range" min={1} max={4} value={numOutputs} onChange={e => setNumOutputs(Number(e.target.value))} className="w-full accent-[#25d366] mt-2" />
        </div>
      </div>

      <button
        onClick={handleGenerate}
        disabled={!prompt.trim() || status === "generating" || status === "polling"}
        className="w-full py-3 bg-[#25d366] hover:bg-[#25d366]/90 disabled:opacity-40 disabled:cursor-not-allowed text-black font-semibold rounded-xl flex items-center justify-center gap-2 transition-colors"
      >
        {status === "generating" || status === "polling" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Image className="w-4 h-4" />}
        {status === "generating" ? "Starting..." : status === "polling" ? "Generating..." : "Generate Image"}
      </button>

      <GenerationOutput status={status} output={output} error={error} type="image" />
    </div>
  );
}

// ─── Voice Tab ────────────────────────────────────────────────────────────────
function VoiceTab() {
  const [text, setText] = useState("");
  const [language, setLanguage] = useState<Language>("en");
  const [voice, setVoice] = useState("af_heart");
  const [speed, setSpeed] = useState(1.0);
  const [status, setStatus] = useState<GenerationStatus>("idle");
  const [output, setOutput] = useState<any>(null);
  const [error, setError] = useState("");

  const generateMut = trpc.whatsappContent.generateVoice.useMutation();
  const pollQuery = trpc.whatsappContent.getPredictionStatus.useQuery(
    { predictionId: output?.predictionId || "" },
    { enabled: status === "polling" && !!output?.predictionId, refetchInterval: 5000 }
  );

  useEffect(() => {
    if (pollQuery.data && status === "polling") {
      if (pollQuery.data.status === "succeeded") {
        setOutput((prev: any) => ({ ...prev, ...pollQuery.data }));
        setStatus("done");
      } else if (pollQuery.data.status === "failed") {
        setError(pollQuery.data.error || "Generation failed");
        setStatus("error");
      }
    }
  }, [pollQuery.data]);

  const handleGenerate = async () => {
    if (!text.trim()) return;
    setStatus("generating");
    setError("");
    try {
      const result = await generateMut.mutateAsync({ text, language, voice: voice as any, speed });
      setOutput(result);
      setStatus("polling");
    } catch (e: any) {
      setError(e.message || "Failed");
      setStatus("error");
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-white font-semibold flex items-center gap-2"><Mic className="w-4 h-4 text-[#25d366]" /> Voice Generation</h3>
        <LanguageSelector value={language} onChange={setLanguage} />
      </div>

      <div className="p-3 bg-[#0d0d1a] border border-[#25d366]/20 rounded-xl">
        <p className="text-gray-400 text-xs mb-1">Powered by Kokoro TTS — 50+ voices, multilingual</p>
      </div>

      <div>
        <label className="text-gray-400 text-xs mb-1 block">Voice</label>
        <select
          value={voice}
          onChange={e => setVoice(e.target.value)}
          className="w-full bg-[#0d0d1a] border border-[#25d366]/20 rounded-lg px-3 py-2 text-white text-sm focus:outline-none"
        >
          {VOICES.map(v => (
            <option key={v.value} value={v.value}>{v.label}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="text-gray-400 text-xs mb-1 block">Text to speak</label>
        <textarea
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder="Enter text to convert to speech..."
          rows={4}
          className="w-full bg-[#0d0d1a] border border-[#25d366]/20 rounded-xl px-4 py-3 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-[#25d366]/60 resize-none"
        />
        <p className="text-gray-600 text-xs mt-1">{text.length}/2000</p>
      </div>

      <div>
        <label className="text-gray-400 text-xs mb-1 block">Speed: {speed.toFixed(1)}x</label>
        <input type="range" min={0.5} max={2.0} step={0.1} value={speed} onChange={e => setSpeed(Number(e.target.value))} className="w-full accent-[#25d366]" />
        <div className="flex justify-between text-xs text-gray-600 mt-1"><span>0.5x</span><span>2.0x</span></div>
      </div>

      <button
        onClick={handleGenerate}
        disabled={!text.trim() || status === "generating" || status === "polling"}
        className="w-full py-3 bg-[#25d366] hover:bg-[#25d366]/90 disabled:opacity-40 disabled:cursor-not-allowed text-black font-semibold rounded-xl flex items-center justify-center gap-2 transition-colors"
      >
        {status === "generating" || status === "polling" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mic className="w-4 h-4" />}
        {status === "generating" ? "Starting..." : status === "polling" ? "Generating..." : "Generate Voice"}
      </button>

      <GenerationOutput status={status} output={output} error={error} type="voice" />
    </div>
  );
}

// ─── Copy Tab ─────────────────────────────────────────────────────────────────
function CopyTab() {
  const [topic, setTopic] = useState("");
  const [type, setType] = useState<"status" | "broadcast" | "caption" | "cta" | "promo" | "teaser" | "announcement">("broadcast");
  const [language, setLanguage] = useState<Language>("en");
  const [tone, setTone] = useState<"casual" | "professional" | "flirty" | "urgent" | "hype">("casual");
  const [includeEmoji, setIncludeEmoji] = useState(true);
  const [status, setStatus] = useState<GenerationStatus>("idle");
  const [output, setOutput] = useState<any>(null);
  const [error, setError] = useState("");

  const generateMut = trpc.whatsappContent.generateCopy.useMutation();

  const handleGenerate = async () => {
    if (!topic.trim()) return;
    setStatus("generating");
    setError("");
    try {
      const result = await generateMut.mutateAsync({ topic, type, language, tone, platform: "whatsapp_channel", includeEmoji });
      setOutput(result);
      setStatus("done");
    } catch (e: any) {
      setError(e.message || "Failed");
      setStatus("error");
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-white font-semibold flex items-center gap-2"><MessageSquare className="w-4 h-4 text-[#25d366]" /> Copy Generator</h3>
        <LanguageSelector value={language} onChange={setLanguage} />
      </div>

      <div>
        <label className="text-gray-400 text-xs mb-1 block">Content Type</label>
        <div className="flex flex-wrap gap-2">
          {COPY_TYPES.map(t => (
            <button
              key={t.value}
              onClick={() => setType(t.value as any)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${type === t.value ? "bg-[#25d366] text-black" : "bg-[#0d0d1a] border border-[#25d366]/20 text-gray-300 hover:border-[#25d366]/40"}`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="text-gray-400 text-xs mb-1 block">Tone</label>
        <div className="flex flex-wrap gap-2">
          {TONES.map(t => (
            <button
              key={t.value}
              onClick={() => setTone(t.value as any)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${tone === t.value ? "bg-[#25d366] text-black" : "bg-[#0d0d1a] border border-[#25d366]/20 text-gray-300 hover:border-[#25d366]/40"}`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="text-gray-300 text-xs mb-1 block">Launch angle</label>
        <textarea
          value={topic}
          onChange={e => setTopic(e.target.value)}
          placeholder="Drop the raw idea: scene mood, offer, audience, price point, and urgency."
          rows={3}
          className="w-full bg-[#0d0d1a] border border-[#25d366]/20 rounded-xl px-4 py-3 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-[#25d366]/60 resize-none"
        />
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={() => setIncludeEmoji(!includeEmoji)}
          className={`relative w-9 h-5 rounded-full transition-colors ${includeEmoji ? "bg-[#25d366]" : "bg-gray-700"}`}
        >
          <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-all ${includeEmoji ? "left-4" : "left-0.5"}`} />
        </button>
        <span className="text-gray-300 text-sm">Add tasteful signal accents</span>
      </div>

      <button
        onClick={handleGenerate}
        disabled={!topic.trim() || status === "generating"}
        className="w-full py-3 bg-[#25d366] hover:bg-[#25d366]/90 disabled:opacity-40 disabled:cursor-not-allowed text-black font-semibold rounded-xl flex items-center justify-center gap-2 transition-colors"
      >
        {status === "generating" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
        {status === "generating" ? "Forging the offer..." : "Forge Offer Copy"}
      </button>

      <GenerationOutput status={status} output={output} error={error} type="copy" />
    </div>
  );
}

// ─── Schedule Tab ─────────────────────────────────────────────────────────────
function ScheduleTab() {
  const channelsQuery = trpc.whatsappContent.getChannels.useQuery();
  const dropsQuery = trpc.whatsappContent.getScheduledDrops.useQuery();
  const createChannelMut = trpc.whatsappContent.createChannel.useMutation();
  const scheduleDropMut = trpc.whatsappContent.scheduleChannelDrop.useMutation();

  const [showNewChannel, setShowNewChannel] = useState(false);
  const [channelName, setChannelName] = useState("");
  const [channelPhone, setChannelPhone] = useState("");
  const [dropChannelId, setDropChannelId] = useState<number | null>(null);
  const [dropContentUrl, setDropContentUrl] = useState("");
  const [dropContentType, setDropContentType] = useState<"video" | "photo" | "audio" | "text">("video");
  const [dropScheduledFor, setDropScheduledFor] = useState("");
  const [dropPriceCents, setDropPriceCents] = useState(0);

  const handleCreateChannel = async () => {
    if (!channelName || !channelPhone) return;
    await createChannelMut.mutateAsync({ name: channelName, phoneNumber: channelPhone });
    setChannelName(""); setChannelPhone(""); setShowNewChannel(false);
    channelsQuery.refetch();
  };

  const handleScheduleDrop = async () => {
    if (!dropChannelId || !dropScheduledFor) return;
    await scheduleDropMut.mutateAsync({
      channelId: dropChannelId,
      contentType: dropContentType,
      contentUrl: dropContentUrl || undefined,
      scheduledFor: dropScheduledFor,
      priceCents: dropPriceCents,
    });
    setDropContentUrl(""); setDropScheduledFor(""); setDropPriceCents(0);
    dropsQuery.refetch();
  };

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-white font-semibold flex items-center gap-2"><Users className="w-4 h-4 text-[#25d366]" /> Audience Lanes</h3>
          <button onClick={() => setShowNewChannel(!showNewChannel)} className="flex items-center gap-1 text-[#25d366] text-sm hover:text-[#25d366]/80">
            <Plus className="w-4 h-4" /> Add Lane
          </button>
        </div>

        {showNewChannel && (
          <div className="p-4 bg-[#0d0d1a] border border-[#25d366]/20 rounded-xl space-y-3 mb-3">
            <input value={channelName} onChange={e => setChannelName(e.target.value)} placeholder="VIP lane name" className="w-full bg-[#1a1a2e] border border-[#25d366]/20 rounded-lg px-3 py-2 text-white text-sm focus:outline-none" />
            <input value={channelPhone} onChange={e => setChannelPhone(e.target.value)} placeholder="WhatsApp Business number" className="w-full bg-[#1a1a2e] border border-[#25d366]/20 rounded-lg px-3 py-2 text-white text-sm focus:outline-none" />
            <button onClick={handleCreateChannel} className="w-full py-2 bg-[#25d366] text-black font-semibold rounded-lg text-sm">Save Audience Lane</button>
          </div>
        )}

        <div className="space-y-2">
          {channelsQuery.data?.channels.map((ch: any) => (
            <div key={ch.id} className="p-3 bg-[#0d0d1a] border border-[#25d366]/20 rounded-xl flex items-center justify-between">
              <div>
                <p className="text-white text-sm font-medium">{ch.community_name}</p>
                <p className="text-gray-500 text-xs">{ch.phone_number} · {ch.member_count} buyers · {ch.status}</p>
              </div>
              <div className={`w-2 h-2 rounded-full ${ch.status === "active" ? "bg-[#25d366]" : "bg-gray-600"}`} />
            </div>
          ))}
          {(!channelsQuery.data?.channels.length) && (
            <p className="text-gray-600 text-sm text-center py-4">No audience lanes yet — add your first VIP lane above</p>
          )}
        </div>
      </div>

      <div>
        <h3 className="text-white font-semibold flex items-center gap-2 mb-3"><Clock className="w-4 h-4 text-[#25d366]" /> Launch a Paid Drop</h3>
        <div className="p-4 bg-[#0d0d1a] border border-[#25d366]/20 rounded-xl space-y-3">
          <select value={dropChannelId || ""} onChange={e => setDropChannelId(Number(e.target.value))} className="w-full bg-[#1a1a2e] border border-[#25d366]/20 rounded-lg px-3 py-2 text-white text-sm focus:outline-none">
            <option value="">Choose audience lane</option>
            {channelsQuery.data?.channels.map((ch: any) => <option key={ch.id} value={ch.id}>{ch.community_name}</option>)}
          </select>
          <div className="grid grid-cols-2 gap-2">
            {(["video", "photo", "audio", "text"] as const).map(t => (
              <button key={t} onClick={() => setDropContentType(t)} className={`py-2 rounded-lg text-xs font-medium capitalize ${dropContentType === t ? "bg-[#25d366] text-black" : "bg-[#1a1a2e] border border-[#25d366]/20 text-gray-300"}`}>{t}</button>
            ))}
          </div>
          <input value={dropContentUrl} onChange={e => setDropContentUrl(e.target.value)} placeholder="Final asset link, preview URL, or vault package path" className="w-full bg-[#1a1a2e] border border-[#25d366]/20 rounded-lg px-3 py-2 text-white text-sm focus:outline-none" />
          <input type="datetime-local" value={dropScheduledFor} onChange={e => setDropScheduledFor(e.target.value)} className="w-full bg-[#1a1a2e] border border-[#25d366]/20 rounded-lg px-3 py-2 text-white text-sm focus:outline-none" />
          <div>
            <label className="text-gray-400 text-xs mb-1 block">Price gate in cents (0 keeps it free)</label>
            <input type="number" min={0} value={dropPriceCents} onChange={e => setDropPriceCents(Number(e.target.value))} className="w-full bg-[#1a1a2e] border border-[#25d366]/20 rounded-lg px-3 py-2 text-white text-sm focus:outline-none" />
          </div>
          <button onClick={handleScheduleDrop} disabled={!dropChannelId || !dropScheduledFor} className="w-full py-2.5 bg-[#25d366] disabled:opacity-40 text-black font-semibold rounded-lg text-sm flex items-center justify-center gap-2">
            <Send className="w-4 h-4" /> Queue Profit Drop
          </button>
        </div>
      </div>

      <div>
        <h3 className="text-white font-semibold flex items-center gap-2 mb-3"><Calendar className="w-4 h-4 text-[#25d366]" /> Launch Queue</h3>
        <div className="space-y-2">
          {dropsQuery.data?.drops.map((d: any) => (
            <div key={d.id} className="p-3 bg-[#0d0d1a] border border-[#25d366]/20 rounded-xl">
              <div className="flex items-center justify-between">
                <span className="text-white text-sm capitalize">{d.content_type}</span>
                <span className={`text-xs px-2 py-0.5 rounded-full ${d.status === "delivered" ? "bg-[#25d366]/20 text-[#25d366]" : d.status === "failed" ? "bg-red-900/20 text-red-400" : "bg-yellow-900/20 text-yellow-400"}`}>{d.status}</span>
              </div>
              <p className="text-gray-500 text-xs mt-1">{new Date(d.created_at).toLocaleString()}</p>
            </div>
          ))}
          {(!dropsQuery.data?.drops.length) && (
            <p className="text-gray-600 text-sm text-center py-4">No drops queued yet — build the first launch above</p>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function WhatsAppContentGenerator() {
  const [activeTab, setActiveTab] = useState<Tab>("video");
  const analyticsQuery = trpc.whatsappContent.getAnalytics.useQuery();
  const historyQuery = trpc.whatsappContent.getGenerationHistory.useQuery({ limit: 5, type: "all" });

  const TABS: { id: Tab; label: string; icon: any }[] = [
    { id: "video", label: "Cinema", icon: Film },
    { id: "clone", label: "Reference", icon: Sparkles },
    { id: "image", label: "Visuals", icon: Image },
    { id: "voice", label: "Voice", icon: Mic },
    { id: "copy", label: "Offers", icon: MessageSquare },
    { id: "schedule", label: "Launch", icon: Calendar },
  ];

  return (
    <div className="min-h-screen bg-[#060612] text-white">
      {/* Header */}
      <div className="border-b border-[#25d366]/20 bg-[#060612]/80 backdrop-blur-sm sticky top-0 z-40">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#25d366] flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-black" />
            </div>
            <div>
              <h1 className="text-white font-bold text-lg leading-none">WhatsApp Profit Studio</h1>
              <p className="text-gray-400 text-xs mt-0.5">Body Cinema assets, VIP chat copy, and paid-drop launch rails</p>
            </div>
          </div>
          <div className="flex items-center gap-4 text-xs text-gray-500">
            <span className="flex items-center gap-1"><BarChart3 className="w-3 h-3 text-[#25d366]" />{analyticsQuery.data?.totalGenerations || 0} assets forged</span>
            <span className="flex items-center gap-1"><Users className="w-3 h-3 text-[#25d366]" />{analyticsQuery.data?.channels || 0} audience lanes</span>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6">
        <section className="relative overflow-hidden rounded-[2rem] border border-[#25d366]/25 bg-gradient-to-br from-[#0d1f17] via-[#080814] to-[#13071b] p-6 mb-6 shadow-[0_0_70px_rgba(37,211,102,0.12)]">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(37,211,102,0.22),transparent_32%),radial-gradient(circle_at_bottom_left,rgba(201,168,76,0.14),transparent_30%)]" />
          <div className="relative grid gap-5 lg:grid-cols-[1.25fr_0.75fr] items-end">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-[#25d366]/30 bg-[#25d366]/10 px-3 py-1 text-[11px] uppercase tracking-[0.2em] text-[#98f5bb] mb-4">
                <Zap className="w-3.5 h-3.5" /> Raw footage to profit
              </div>
              <h2 className="text-3xl md:text-4xl font-black tracking-tight leading-tight">Package the scene, write the desire, and queue the drop from one control room.</h2>
              <p className="text-gray-300 mt-3 max-w-2xl text-sm md:text-base leading-relaxed">This is the WhatsApp side of Body Cinema: creator-approved media, premium hooks, multilingual VIP copy, voice notes, covers, and launch timing built for opt-in buyers.</p>
              <div className="flex flex-wrap gap-2 mt-4">
                {LAUNCH_GUARDS.map((guard) => (
                  <span key={guard} className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-gray-200">{guard}</span>
                ))}
              </div>
            </div>
            <div className="grid gap-3">
              {PROFIT_RAILS.map((rail) => (
                <div key={rail.label} className="rounded-2xl border border-[#25d366]/20 bg-black/25 p-4 backdrop-blur">
                  <div className="text-white font-semibold text-sm">{rail.label}</div>
                  <p className="text-gray-400 text-xs leading-relaxed mt-1">{rail.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Tab Navigation */}
        <div className="flex gap-1 bg-[#0d0d1a] rounded-2xl p-1.5 mb-6 overflow-x-auto border border-[#25d366]/10 shadow-[0_0_35px_rgba(37,211,102,0.08)]">
          {TABS.map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all whitespace-nowrap flex-1 justify-center ${activeTab === tab.id ? "bg-[#25d366] text-black" : "text-gray-400 hover:text-white"}`}
              >
                <Icon className="w-4 h-4" />
                <span className="hidden sm:inline">{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Tab Content */}
        <div className="bg-[#0d0d1a] border border-[#25d366]/20 rounded-2xl p-6 shadow-[0_0_45px_rgba(37,211,102,0.06)]">
          {activeTab === "video" && <VideoTab />}
          {activeTab === "clone" && <CloneTab />}
          {activeTab === "image" && <ImageTab />}
          {activeTab === "voice" && <VoiceTab />}
          {activeTab === "copy" && <CopyTab />}
          {activeTab === "schedule" && <ScheduleTab />}
        </div>

        {/* Recent Generations */}
        {historyQuery.data?.items && historyQuery.data.items.length > 0 && (
          <div className="mt-6">
            <h3 className="text-gray-400 text-sm font-medium mb-3 flex items-center gap-2">
              <RefreshCw className="w-4 h-4" /> Recent Assets Forged
            </h3>
            <div className="space-y-2">
              {historyQuery.data.items.slice(0, 5).map((item: any) => (
                <div key={item.id} className="p-3 bg-[#0d0d1a] border border-[#25d366]/10 rounded-xl flex items-center justify-between">
                  <div>
                    <p className="text-white text-xs font-medium">{item.feature_name}</p>
                    <p className="text-gray-600 text-xs mt-0.5">{new Date(item.generated_at).toLocaleString()}</p>
                  </div>
                  <span className="text-[#25d366] text-xs">{item.tone}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
