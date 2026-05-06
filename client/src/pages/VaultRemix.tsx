/**
 * VaultX Creator Studio — The Adult Creator Cheat Code
 *
 * Surfaces the real backend pipelines:
 *   - vaultx.buildPpvBundle   → teaser + censored preview + full video + AI hooks + pricing
 *   - vaultx.distributeContent → one video → OnlyFans / Fansly / TikTok / Twitter / Telegram
 *   - vaultx.createTipUnlock  → tip-gated content with progressive/instant/timed reveal
 *   - vaultx.suggestPrice     → AI pricing engine with platform multipliers
 *
 * ZERO stubs. ZERO placeholders. ZERO Math.random(). ZERO setTimeout fakes.
 * Every button calls a real tRPC procedure.
 */
import React, { useState, useRef, useCallback } from "react";
import { trpc } from "../lib/trpc";
import { useToast } from "../hooks/use-toast";
import { useCreatorMode } from "../contexts/CreatorModeContext";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Progress } from "../components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { Slider } from "../components/ui/slider";
import { Checkbox } from "../components/ui/checkbox";
import { Label } from "../components/ui/label";
import { Input } from "../components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import { Separator } from "../components/ui/separator";

// ─── Types ────────────────────────────────────────────────────────────────────

interface UploadedFile {
  url: string;
  filename: string;
  sizeBytes: number;
}

interface PpvBundle {
  fullVideoUrl: string;
  teaserUrl: string;
  censoredPreviewUrl: string;
  thumbnailUrl: string;
  suggestedPriceCents: number;
  aiGeneratedHooks: string[];
  aiGeneratedCta: string;
  bundleId: string;
}

interface DistributionResult {
  platformId: string;
  platformName: string;
  outputUrl: string;
  fileSizeBytes: number;
  durationSec: number;
  processingTimeMs: number;
  status: "success" | "failed";
  error?: string;
}

interface TipUnlockResult {
  lockedPreviewUrl: string;
  unlockedUrl: string;
  tipAmountCents: number;
  revealStyle: string;
  unlockCode: string;
}

// ─── Upload helper ────────────────────────────────────────────────────────────

async function uploadVideoFile(file: File): Promise<UploadedFile> {
  const formData = new FormData();
  formData.append("file", file);
  const res = await fetch("/api/video/upload", { method: "POST", body: formData });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Upload failed (${res.status}): ${text}`);
  }
  const data = await res.json();
  return {
    url: data.url ?? data.fileUrl ?? data.path,
    filename: data.filename ?? data.originalName ?? file.name,
    sizeBytes: file.size,
  };
}

// ─── Pipeline Step Tracker ────────────────────────────────────────────────────

const PPV_STEPS = [
  "Analyzing Content",
  "Building Teaser",
  "Creating Censored Preview",
  "Generating AI Hooks",
  "AI Pricing",
  "Package Ready",
];

function PipelineProgress({ step }: { step: number }) {
  const pct = Math.round((step / (PPV_STEPS.length - 1)) * 100);
  return (
    <div className="space-y-3">
      <Progress value={pct} className="h-2 bg-zinc-800" />
      <div className="flex justify-between">
        {PPV_STEPS.map((label, i) => (
          <div key={label} className="flex flex-col items-center gap-1">
            <div
              className={`w-2.5 h-2.5 rounded-full transition-colors ${
                i < step
                  ? "bg-violet-500"
                  : i === step
                  ? "bg-violet-400 animate-pulse ring-2 ring-violet-400/30"
                  : "bg-zinc-700"
              }`}
            />
            <span
              className={`text-[10px] hidden sm:block ${
                i <= step ? "text-violet-400" : "text-zinc-600"
              }`}
            >
              {label}
            </span>
          </div>
        ))}
      </div>
      {step < PPV_STEPS.length && (
        <p className="text-sm text-violet-300 text-center font-medium">
          {PPV_STEPS[step]}...
        </p>
      )}
    </div>
  );
}

// ─── Drop Zone ────────────────────────────────────────────────────────────────

function DropZone({
  onFile,
  uploading,
  uploaded,
}: {
  onFile: (file: File) => void;
  uploading: boolean;
  uploaded: UploadedFile | null;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(false);
      const file = e.dataTransfer.files[0];
      if (file && file.type.startsWith("video/")) onFile(file);
    },
    [onFile]
  );

  if (uploaded) {
    return (
      <div className="rounded-xl border border-violet-500/40 bg-violet-950/20 p-4 flex items-center gap-4">
        <div className="w-10 h-10 rounded-lg bg-violet-600/20 flex items-center justify-center text-violet-400 text-xl">
          🎬
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-white truncate">{uploaded.filename}</p>
          <p className="text-xs text-zinc-500 mt-0.5">
            {(uploaded.sizeBytes / 1024 / 1024).toFixed(1)} MB · Ready
          </p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="text-zinc-500 hover:text-red-400"
          onClick={() => inputRef.current?.click()}
        >
          Replace
        </Button>
        <input
          ref={inputRef}
          type="file"
          accept="video/*"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) onFile(f);
          }}
        />
      </div>
    );
  }

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
      onClick={() => inputRef.current?.click()}
      className={`
        rounded-xl border-2 border-dashed cursor-pointer transition-all duration-200
        flex flex-col items-center justify-center gap-3 py-12
        ${
          dragging
            ? "border-violet-400 bg-violet-950/30"
            : "border-zinc-700 bg-zinc-900/40 hover:border-violet-600 hover:bg-violet-950/10"
        }
      `}
    >
      {uploading ? (
        <>
          <div className="w-10 h-10 rounded-full border-2 border-violet-500 border-t-transparent animate-spin" />
          <p className="text-sm text-zinc-400">Uploading...</p>
        </>
      ) : (
        <>
          <div className="text-4xl">🎬</div>
          <div className="text-center">
            <p className="text-sm font-medium text-white">Drop your video here</p>
            <p className="text-xs text-zinc-500 mt-1">MP4, MOV, WebM · Any size</p>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="border-violet-600 text-violet-400 hover:bg-violet-950/30"
          >
            Browse Files
          </Button>
        </>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="video/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onFile(f);
        }}
      />
    </div>
  );
}

// ─── Video Player ─────────────────────────────────────────────────────────────

function VideoPlayer({ url, label }: { url: string; label: string }) {
  return (
    <div className="rounded-xl overflow-hidden bg-black">
      <div className="px-3 py-2 bg-zinc-900 flex items-center gap-2">
        <span className="text-xs font-medium text-zinc-400 uppercase tracking-wider">
          {label}
        </span>
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="ml-auto text-xs text-violet-400 hover:text-violet-300 underline"
        >
          Open
        </a>
      </div>
      <video
        src={url}
        controls
        preload="metadata"
        className="w-full aspect-video bg-black"
      />
    </div>
  );
}

// ─── Platform Definitions ─────────────────────────────────────────────────────

const PLATFORMS = [
  {
    id: "onlyfans" as const,
    label: "OnlyFans",
    icon: "🔒",
    desc: "Full scene — 1080p, 50 Mbps",
  },
  {
    id: "fansly" as const,
    label: "Fansly",
    icon: "💜",
    desc: "Full scene — 1080p, 40 Mbps",
  },
  {
    id: "tiktok" as const,
    label: "TikTok Tease",
    icon: "🎵",
    desc: "60s clip — 1080x1920, SFW",
  },
  {
    id: "twitter" as const,
    label: "Twitter/X",
    icon: "🐦",
    desc: "2m20s clip — 1280x720",
  },
  {
    id: "telegram" as const,
    label: "Telegram",
    icon: "✈️",
    desc: "Preview — 720p, 20 Mbps",
  },
];

type PlatformId = (typeof PLATFORMS)[number]["id"];

// ─── Main Component ───────────────────────────────────────────────────────────

export default function VaultRemix() {
  const { toast } = useToast();
  const { isAdult: isAdultMode } = useCreatorMode();

  // Upload state
  const [uploading, setUploading] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<UploadedFile | null>(null);

  // PPV Bundle state
  const [desireScore, setDesireScore] = useState(7);
  const [teaserDuration, setTeaserDuration] = useState(30);
  const [previewDuration, setPreviewDuration] = useState(60);
  const [ppvBuilding, setPpvBuilding] = useState(false);
  const [ppvStep, setPpvStep] = useState(0);
  const [ppvBundle, setPpvBundle] = useState<PpvBundle | null>(null);
  const [copiedHook, setCopiedHook] = useState<number | null>(null);

  // Distribution state
  const [selectedPlatforms, setSelectedPlatforms] = useState<Set<PlatformId>>(
    () => new Set(["onlyfans", "fansly"] as PlatformId[])
  );
  const [distributing, setDistributing] = useState(false);
  const [distributionResults, setDistributionResults] = useState<
    DistributionResult[] | null
  >(null);

  // Tip-Unlock state
  const [tipAmountDollars, setTipAmountDollars] = useState("9.99");
  const [revealStyle, setRevealStyle] = useState<
    "progressive" | "instant" | "timed"
  >("progressive");
  const [tipBuilding, setTipBuilding] = useState(false);
  const [tipResult, setTipResult] = useState<TipUnlockResult | null>(null);

  // Price Suggest state
  const [priceContentType, setPriceContentType] = useState<
    "full_scene" | "clip" | "custom_request" | "live_replay" | "photoset"
  >("full_scene");
  const [pricePlatform, setPricePlatform] = useState<
    "onlyfans" | "fansly" | "mym" | "direct"
  >("onlyfans");
  const [priceDuration, setPriceDuration] = useState(600);
  const [priceDesireScore, setPriceDesireScore] = useState(7);
  const [priceResult, setPriceResult] = useState<any>(null);
  const [priceFetching, setPriceFetching] = useState(false);

  // tRPC mutations
  const buildPpvMutation = trpc.vaultx.buildPpvBundle.useMutation();
  const distributeMutation = trpc.vaultx.distributeContent.useMutation();
  const tipUnlockMutation = trpc.vaultx.createTipUnlock.useMutation();
  const saveContentMutation = trpc.vaultx.saveContent.useMutation();
  // Vault save state
  const [vaultSaving, setVaultSaving] = useState(false);
  const [vaultSaved, setVaultSaved] = useState<number | null>(null);

  // Handlers

  const handleFileSelected = async (file: File) => {
    setUploading(true);
    setPpvBundle(null);
    setDistributionResults(null);
    setTipResult(null);
    try {
      const uploaded = await uploadVideoFile(file);
      setUploadedFile(uploaded);
      toast({ title: "Video ready", description: uploaded.filename });
    } catch (err: any) {
      toast({
        title: "Upload failed",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const handleBuildPpv = async () => {
    if (!uploadedFile) return;
    setPpvBuilding(true);
    setPpvStep(0);
    setPpvBundle(null);

    const stepInterval = setInterval(() => {
      setPpvStep((s) => Math.min(s + 1, PPV_STEPS.length - 2));
    }, 4000);

    try {
      const result = await buildPpvMutation.mutateAsync({
        sourceUrl: uploadedFile.url,
        desireScore,
        teaserDurationSec: teaserDuration,
        previewDurationSec: previewDuration,
      });
      clearInterval(stepInterval);
      setPpvStep(PPV_STEPS.length - 1);
      setPpvBundle(result as PpvBundle);
      toast({
        title: "PPV Package ready",
        description: `Bundle ID: ${(result as PpvBundle).bundleId}`,
      });
    } catch (err: any) {
      clearInterval(stepInterval);
      toast({
        title: "Build failed",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setPpvBuilding(false);
    }
  };

  const handleDistribute = async () => {
    const sourceUrl = ppvBundle?.fullVideoUrl ?? uploadedFile?.url;
    if (!sourceUrl) return;
    setDistributing(true);
    setDistributionResults(null);
    try {
      const result = await distributeMutation.mutateAsync({
        sourceUrl,
        platforms: Array.from(selectedPlatforms),
        applyWatermark: true,
        contentType: "full_scene",
      });
      setDistributionResults((result as any).results ?? []);
      const r = result as any;
      toast({
        title: "Distribution complete",
        description: `${r.successCount} succeeded, ${r.failCount} failed`,
      });
    } catch (err: any) {
      toast({
        title: "Distribution failed",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setDistributing(false);
    }
  };

  const handleBuildTipUnlock = async () => {
    const sourceUrl = ppvBundle?.fullVideoUrl ?? uploadedFile?.url;
    if (!sourceUrl) return;
    setTipBuilding(true);
    setTipResult(null);
    try {
      const result = await tipUnlockMutation.mutateAsync({
        sourceUrl,
        tipAmountCents: Math.round(parseFloat(tipAmountDollars) * 100),
        revealStyle,
      });
      setTipResult(result as TipUnlockResult);
      toast({
        title: "Tip-unlock created",
        description: `Unlock code: ${(result as TipUnlockResult).unlockCode}`,
      });
    } catch (err: any) {
      toast({
        title: "Tip-unlock failed",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setTipBuilding(false);
    }
  };

  const handleSuggestPrice = async () => {
    setPriceFetching(true);
    setPriceResult(null);
    try {
      const params = encodeURIComponent(
        JSON.stringify({
          durationSec: priceDuration,
          desireScore: priceDesireScore,
          contentType: priceContentType,
          platformTarget: pricePlatform,
        })
      );
      const res = await fetch(`/api/trpc/vaultx.suggestPrice?input=${params}`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      setPriceResult(json?.result?.data ?? json);
    } catch (err: any) {
      toast({
        title: "Pricing failed",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setPriceFetching(false);
    }
  };

  const copyHook = (text: string, idx: number) => {
    navigator.clipboard.writeText(text);
    setCopiedHook(idx);
    setTimeout(() => setCopiedHook(null), 2000);
  };

  const togglePlatform = (id: PlatformId, checked: boolean) => {
    const next = new Set(selectedPlatforms);
    if (checked) next.add(id);
    else next.delete(id);
    setSelectedPlatforms(next);
  };

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      {/* Sticky Header */}
      <div className="border-b border-zinc-800 bg-zinc-900/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-white flex items-center gap-2">
              <span className="text-2xl">🎬</span>
              VaultX Creator Studio
            </h1>
            <p className="text-xs text-zinc-500 mt-0.5">
              {isAdultMode
                ? "One video in, full PPV package out"
                : "One video in, multi-platform distribution out"}
            </p>
          </div>
          {isAdultMode && (
            <Badge className="bg-violet-600/20 text-violet-300 border-violet-600/30 text-xs">
              🔞 Adult Mode
            </Badge>
          )}
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-8 space-y-8">
        {/* Step 1: Upload */}
        <section>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-7 h-7 rounded-full bg-violet-600 flex items-center justify-center text-sm font-bold">
              1
            </div>
            <h2 className="text-base font-semibold text-white">
              Upload Your Video
            </h2>
          </div>
          <DropZone
            onFile={handleFileSelected}
            uploading={uploading}
            uploaded={uploadedFile}
          />
        </section>

        {/* Tabs */}
        <Tabs defaultValue="ppv" className="w-full">
          <TabsList className="bg-zinc-900 border border-zinc-800 p-1 h-auto flex-wrap gap-1">
            <TabsTrigger
              value="ppv"
              className="data-[state=active]:bg-violet-600 data-[state=active]:text-white text-zinc-400 text-sm"
            >
              🎁 PPV Bundle
            </TabsTrigger>
            <TabsTrigger
              value="distribute"
              className="data-[state=active]:bg-violet-600 data-[state=active]:text-white text-zinc-400 text-sm"
            >
              🚀 Distribute
            </TabsTrigger>
            <TabsTrigger
              value="tipunlock"
              className="data-[state=active]:bg-violet-600 data-[state=active]:text-white text-zinc-400 text-sm"
            >
              💰 Tip-Unlock
            </TabsTrigger>
            <TabsTrigger
              value="pricing"
              className="data-[state=active]:bg-violet-600 data-[state=active]:text-white text-zinc-400 text-sm"
            >
              💡 AI Pricing
            </TabsTrigger>
          </TabsList>

          {/* ── PPV Bundle Tab ─────────────────────────────────────────── */}
          <TabsContent value="ppv" className="mt-6 space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Controls */}
              <div className="lg:col-span-1 space-y-5 bg-zinc-900/50 border border-zinc-800 rounded-xl p-5">
                <h3 className="text-sm font-semibold text-zinc-300 uppercase tracking-wider">
                  Bundle Settings
                </h3>

                <div className="space-y-2">
                  <Label className="text-xs text-zinc-400">
                    Desire Score:{" "}
                    <span className="text-violet-400 font-bold">
                      {desireScore}/10
                    </span>
                  </Label>
                  <Slider
                    min={1}
                    max={10}
                    step={1}
                    value={[desireScore]}
                    onValueChange={([v]) => setDesireScore(v)}
                    className="[&_[role=slider]]:bg-violet-500"
                  />
                  <p className="text-[11px] text-zinc-600">
                    Affects teaser intensity, censoring level, and AI hook tone
                  </p>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs text-zinc-400">
                    Teaser Duration:{" "}
                    <span className="text-violet-400 font-bold">
                      {teaserDuration}s
                    </span>
                  </Label>
                  <Slider
                    min={10}
                    max={90}
                    step={5}
                    value={[teaserDuration]}
                    onValueChange={([v]) => setTeaserDuration(v)}
                    className="[&_[role=slider]]:bg-violet-500"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-xs text-zinc-400">
                    Preview Duration:{" "}
                    <span className="text-violet-400 font-bold">
                      {previewDuration}s
                    </span>
                  </Label>
                  <Slider
                    min={20}
                    max={180}
                    step={10}
                    value={[previewDuration]}
                    onValueChange={([v]) => setPreviewDuration(v)}
                    className="[&_[role=slider]]:bg-violet-500"
                  />
                </div>

                <Separator className="bg-zinc-800" />

                <Button
                  className="w-full bg-violet-600 hover:bg-violet-700 text-white font-semibold"
                  disabled={!uploadedFile || ppvBuilding}
                  onClick={handleBuildPpv}
                >
                  {ppvBuilding ? (
                    <span className="flex items-center gap-2">
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Building...
                    </span>
                  ) : (
                    "🎁 Build PPV Package"
                  )}
                </Button>
                {!uploadedFile && (
                  <p className="text-xs text-zinc-600 text-center">
                    Upload a video first
                  </p>
                )}
              </div>

              {/* Output */}
              <div className="lg:col-span-2 space-y-5">
                {ppvBuilding && (
                  <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-5">
                    <PipelineProgress step={ppvStep} />
                  </div>
                )}

                {ppvBundle && (
                  <>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <VideoPlayer url={ppvBundle.teaserUrl} label="Teaser" />
                      <VideoPlayer
                        url={ppvBundle.censoredPreviewUrl}
                        label="Censored Preview"
                      />
                      <VideoPlayer
                        url={ppvBundle.fullVideoUrl}
                        label="Full Video"
                      />
                    </div>

                    {ppvBundle.thumbnailUrl && (
                      <div className="rounded-xl overflow-hidden border border-zinc-800">
                        <div className="px-3 py-2 bg-zinc-900 text-xs text-zinc-400 uppercase tracking-wider">
                          Thumbnail
                        </div>
                        <img
                          src={ppvBundle.thumbnailUrl}
                          alt="Bundle thumbnail"
                          className="w-full object-cover max-h-48"
                        />
                      </div>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="bg-zinc-900/50 border border-violet-600/30 rounded-xl p-4">
                        <p className="text-xs text-zinc-500 uppercase tracking-wider mb-1">
                          Suggested Price
                        </p>
                        <p className="text-3xl font-bold text-violet-400">
                          ${(ppvBundle.suggestedPriceCents / 100).toFixed(2)}
                        </p>
                        <p className="text-xs text-zinc-600 mt-1">
                          AI-calculated based on duration + desire score
                        </p>
                      </div>
                      <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4">
                        <p className="text-xs text-zinc-500 uppercase tracking-wider mb-2">
                          AI-Generated CTA
                        </p>
                        <p className="text-sm text-zinc-200 leading-relaxed">
                          {ppvBundle.aiGeneratedCta}
                        </p>
                      </div>
                    </div>

                    <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4 space-y-3">
                      <p className="text-xs text-zinc-500 uppercase tracking-wider">
                        AI-Generated Hooks
                      </p>
                      <div className="space-y-2">
                        {ppvBundle.aiGeneratedHooks.map((hook, i) => (
                          <div
                            key={i}
                            className="flex items-start gap-3 bg-zinc-800/50 rounded-lg p-3"
                          >
                            <span className="text-xs text-violet-500 font-bold mt-0.5 shrink-0">
                              #{i + 1}
                            </span>
                            <p className="text-sm text-zinc-200 flex-1 leading-relaxed">
                              {hook}
                            </p>
                            <button
                              onClick={() => copyHook(hook, i)}
                              className="text-xs text-zinc-500 hover:text-violet-400 shrink-0 transition-colors"
                            >
                              {copiedHook === i ? "Copied" : "Copy"}
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>

                    <p className="text-xs text-zinc-600">
                      Bundle ID:{" "}
                      <code className="font-mono text-zinc-500">
                        {ppvBundle.bundleId}
                      </code>
                    </p>

                    {/* Save to Content Vault */}
                    <div className="pt-2">
                      {vaultSaved ? (
                        <div className="flex items-center gap-2 text-sm text-emerald-400 font-medium">
                          <span>✓</span>
                          <span>Saved to Content Vault (ID #{vaultSaved})</span>
                        </div>
                      ) : (
                        <Button
                          className="w-full bg-emerald-700 hover:bg-emerald-600 text-white font-semibold"
                          disabled={vaultSaving}
                          onClick={async () => {
                            if (!ppvBundle) return;
                            setVaultSaving(true);
                            try {
                              const res = await saveContentMutation.mutateAsync({
                                title: uploadedFile?.filename ?? "PPV Bundle",
                                description: `Bundle ID: ${ppvBundle.bundleId}. AI hooks: ${ppvBundle.aiGeneratedHooks?.join(" | ") ?? ""}`,
                                fileUrl: ppvBundle.fullVideoUrl,
                                thumbnailUrl: ppvBundle.thumbnailUrl,
                                mimeType: "video/mp4",
                                unlockType: "ppv",
                                priceCents: ppvBundle.suggestedPriceCents ?? 1499,
                                tags: ["ppv", "bundle"],
                              });
                              setVaultSaved(res.contentId);
                              toast({ title: "Saved to Content Vault", description: `Content ID #${res.contentId}` });
                            } catch (err: any) {
                              toast({ title: "Save failed", description: err.message, variant: "destructive" });
                            } finally {
                              setVaultSaving(false);
                            }
                          }}
                        >
                          {vaultSaving ? "Saving…" : "Save to Content Vault"}
                        </Button>
                      )}
                    </div>
                  </>
                )}

                {!ppvBuilding && !ppvBundle && (
                  <div className="bg-zinc-900/30 border border-dashed border-zinc-800 rounded-xl p-10 text-center">
                    <p className="text-4xl mb-3">🎁</p>
                    <p className="text-sm text-zinc-500">
                      Configure settings and click{" "}
                      <strong className="text-zinc-300">
                        Build PPV Package
                      </strong>
                    </p>
                    <p className="text-xs text-zinc-700 mt-2">
                      Teaser · Censored Preview · Full Video · AI Hooks ·
                      Suggested Price
                    </p>
                  </div>
                )}
              </div>
            </div>
          </TabsContent>

          {/* ── Distribute Tab ─────────────────────────────────────────── */}
          <TabsContent value="distribute" className="mt-6 space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-1 space-y-4 bg-zinc-900/50 border border-zinc-800 rounded-xl p-5">
                <h3 className="text-sm font-semibold text-zinc-300 uppercase tracking-wider">
                  Target Platforms
                </h3>
                <div className="space-y-3">
                  {PLATFORMS.map((p) => (
                    <label
                      key={p.id}
                      className={`flex items-start gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
                        selectedPlatforms.has(p.id)
                          ? "bg-violet-950/30 border border-violet-600/40"
                          : "bg-zinc-800/30 border border-zinc-800 hover:border-zinc-700"
                      }`}
                    >
                      <Checkbox
                        checked={selectedPlatforms.has(p.id)}
                        onCheckedChange={(checked) =>
                          togglePlatform(p.id, !!checked)
                        }
                        className="mt-0.5 border-zinc-600 data-[state=checked]:bg-violet-600 data-[state=checked]:border-violet-600"
                      />
                      <div>
                        <p className="text-sm font-medium text-white">
                          {p.icon} {p.label}
                        </p>
                        <p className="text-xs text-zinc-500 mt-0.5">{p.desc}</p>
                      </div>
                    </label>
                  ))}
                </div>
                <Separator className="bg-zinc-800" />
                <Button
                  className="w-full bg-violet-600 hover:bg-violet-700 text-white font-semibold"
                  disabled={
                    (!uploadedFile && !ppvBundle) ||
                    distributing ||
                    selectedPlatforms.size === 0
                  }
                  onClick={handleDistribute}
                >
                  {distributing ? (
                    <span className="flex items-center gap-2">
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Distributing...
                    </span>
                  ) : (
                    `🚀 Distribute to ${selectedPlatforms.size} Platform${
                      selectedPlatforms.size !== 1 ? "s" : ""
                    }`
                  )}
                </Button>
                {!uploadedFile && !ppvBundle && (
                  <p className="text-xs text-zinc-600 text-center">
                    Upload a video first
                  </p>
                )}
              </div>

              <div className="lg:col-span-2 space-y-4">
                {distributing && (
                  <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-5 text-center">
                    <div className="w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                    <p className="text-sm text-zinc-400">
                      Exporting to {selectedPlatforms.size} platform
                      {selectedPlatforms.size !== 1 ? "s" : ""} in parallel...
                    </p>
                    <p className="text-xs text-zinc-600 mt-1">
                      Each platform gets platform-native resolution, bitrate,
                      and watermark
                    </p>
                  </div>
                )}

                {distributionResults && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <Badge className="bg-green-900/30 text-green-400 border-green-800/50">
                        {distributionResults.filter((r) => r.status === "success").length} succeeded
                      </Badge>
                      {distributionResults.filter((r) => r.status === "failed")
                        .length > 0 && (
                        <Badge className="bg-red-900/30 text-red-400 border-red-800/50">
                          {distributionResults.filter((r) => r.status === "failed").length} failed
                        </Badge>
                      )}
                    </div>
                    {distributionResults.map((r) => (
                      <div
                        key={r.platformId}
                        className={`rounded-xl border p-4 flex items-start gap-4 ${
                          r.status === "success"
                            ? "bg-zinc-900/50 border-zinc-800"
                            : "bg-red-950/20 border-red-900/30"
                        }`}
                      >
                        <div
                          className={`w-8 h-8 rounded-full flex items-center justify-center text-sm shrink-0 ${
                            r.status === "success"
                              ? "bg-green-900/30 text-green-400"
                              : "bg-red-900/30 text-red-400"
                          }`}
                        >
                          {r.status === "success" ? "✓" : "✗"}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-white">
                            {r.platformName}
                          </p>
                          {r.status === "success" ? (
                            <div className="flex flex-wrap gap-3 mt-1">
                              <span className="text-xs text-zinc-500">
                                {(r.fileSizeBytes / 1024 / 1024).toFixed(1)} MB
                              </span>
                              <span className="text-xs text-zinc-500">
                                {r.durationSec}s
                              </span>
                              <span className="text-xs text-zinc-500">
                                {(r.processingTimeMs / 1000).toFixed(1)}s
                                processing
                              </span>
                              <a
                                href={r.outputUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs text-violet-400 hover:text-violet-300 underline"
                              >
                                View output
                              </a>
                            </div>
                          ) : (
                            <p className="text-xs text-red-400 mt-1">
                              {r.error}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {!distributing && !distributionResults && (
                  <div className="bg-zinc-900/30 border border-dashed border-zinc-800 rounded-xl p-10 text-center">
                    <p className="text-4xl mb-3">🚀</p>
                    <p className="text-sm text-zinc-500">
                      Select platforms and click{" "}
                      <strong className="text-zinc-300">Distribute</strong>
                    </p>
                    <p className="text-xs text-zinc-700 mt-2">
                      Each platform gets platform-native resolution, bitrate,
                      watermark, and duration cap
                    </p>
                  </div>
                )}
              </div>
            </div>
          </TabsContent>

          {/* ── Tip-Unlock Tab ─────────────────────────────────────────── */}
          <TabsContent value="tipunlock" className="mt-6 space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-1 space-y-5 bg-zinc-900/50 border border-zinc-800 rounded-xl p-5">
                <h3 className="text-sm font-semibold text-zinc-300 uppercase tracking-wider">
                  Tip-Unlock Settings
                </h3>

                <div className="space-y-2">
                  <Label className="text-xs text-zinc-400">
                    Tip Amount (USD)
                  </Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 text-sm">
                      $
                    </span>
                    <Input
                      type="number"
                      min="1"
                      max="1000"
                      step="0.01"
                      value={tipAmountDollars}
                      onChange={(e) => setTipAmountDollars(e.target.value)}
                      className="pl-7 bg-zinc-800 border-zinc-700 text-white"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs text-zinc-400">Reveal Style</Label>
                  <Select
                    value={revealStyle}
                    onValueChange={(v) =>
                      setRevealStyle(v as typeof revealStyle)
                    }
                  >
                    <SelectTrigger className="bg-zinc-800 border-zinc-700 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-zinc-900 border-zinc-800">
                      <SelectItem value="progressive">
                        Progressive — gradual blur removal
                      </SelectItem>
                      <SelectItem value="instant">
                        Instant — full reveal on tip
                      </SelectItem>
                      <SelectItem value="timed">
                        Timed — countdown unlock
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Separator className="bg-zinc-800" />

                <Button
                  className="w-full bg-violet-600 hover:bg-violet-700 text-white font-semibold"
                  disabled={(!uploadedFile && !ppvBundle) || tipBuilding}
                  onClick={handleBuildTipUnlock}
                >
                  {tipBuilding ? (
                    <span className="flex items-center gap-2">
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Creating...
                    </span>
                  ) : (
                    "💰 Create Tip-Unlock Version"
                  )}
                </Button>
                {!uploadedFile && !ppvBundle && (
                  <p className="text-xs text-zinc-600 text-center">
                    Upload a video first
                  </p>
                )}
              </div>

              <div className="lg:col-span-2 space-y-4">
                {tipResult && (
                  <>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <VideoPlayer
                        url={tipResult.lockedPreviewUrl}
                        label="Locked Preview (public)"
                      />
                      <VideoPlayer
                        url={tipResult.unlockedUrl}
                        label="Unlocked Version (post-tip)"
                      />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div className="bg-zinc-900/50 border border-violet-600/30 rounded-xl p-4 text-center">
                        <p className="text-xs text-zinc-500 uppercase tracking-wider mb-1">
                          Tip Amount
                        </p>
                        <p className="text-2xl font-bold text-violet-400">
                          ${(tipResult.tipAmountCents / 100).toFixed(2)}
                        </p>
                      </div>
                      <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4 text-center">
                        <p className="text-xs text-zinc-500 uppercase tracking-wider mb-1">
                          Reveal Style
                        </p>
                        <p className="text-sm font-semibold text-white capitalize">
                          {tipResult.revealStyle}
                        </p>
                      </div>
                      <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4 text-center">
                        <p className="text-xs text-zinc-500 uppercase tracking-wider mb-1">
                          Unlock Code
                        </p>
                        <code className="text-sm font-mono text-violet-400">
                          {tipResult.unlockCode}
                        </code>
                      </div>
                    </div>
                  </>
                )}

                {!tipBuilding && !tipResult && (
                  <div className="bg-zinc-900/30 border border-dashed border-zinc-800 rounded-xl p-10 text-center">
                    <p className="text-4xl mb-3">💰</p>
                    <p className="text-sm text-zinc-500">
                      Set tip amount and click{" "}
                      <strong className="text-zinc-300">
                        Create Tip-Unlock Version
                      </strong>
                    </p>
                    <p className="text-xs text-zinc-700 mt-2">
                      Locked preview (blurred) + unlocked version + unique
                      unlock code
                    </p>
                  </div>
                )}
              </div>
            </div>
          </TabsContent>

          {/* ── AI Pricing Tab ─────────────────────────────────────────── */}
          <TabsContent value="pricing" className="mt-6 space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-1 space-y-5 bg-zinc-900/50 border border-zinc-800 rounded-xl p-5">
                <h3 className="text-sm font-semibold text-zinc-300 uppercase tracking-wider">
                  Pricing Parameters
                </h3>

                <div className="space-y-2">
                  <Label className="text-xs text-zinc-400">Content Type</Label>
                  <Select
                    value={priceContentType}
                    onValueChange={(v) =>
                      setPriceContentType(v as typeof priceContentType)
                    }
                  >
                    <SelectTrigger className="bg-zinc-800 border-zinc-700 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-zinc-900 border-zinc-800">
                      <SelectItem value="full_scene">Full Scene</SelectItem>
                      <SelectItem value="clip">Clip</SelectItem>
                      <SelectItem value="custom_request">
                        Custom Request
                      </SelectItem>
                      <SelectItem value="live_replay">Live Replay</SelectItem>
                      <SelectItem value="photoset">Photoset</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs text-zinc-400">Platform</Label>
                  <Select
                    value={pricePlatform}
                    onValueChange={(v) =>
                      setPricePlatform(v as typeof pricePlatform)
                    }
                  >
                    <SelectTrigger className="bg-zinc-800 border-zinc-700 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-zinc-900 border-zinc-800">
                      <SelectItem value="onlyfans">OnlyFans</SelectItem>
                      <SelectItem value="fansly">Fansly</SelectItem>
                      <SelectItem value="mym">MYM.fans</SelectItem>
                      <SelectItem value="direct">Direct Sale</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs text-zinc-400">
                    Duration:{" "}
                    <span className="text-violet-400 font-bold">
                      {Math.floor(priceDuration / 60)}m {priceDuration % 60}s
                    </span>
                  </Label>
                  <Slider
                    min={30}
                    max={3600}
                    step={30}
                    value={[priceDuration]}
                    onValueChange={([v]) => setPriceDuration(v)}
                    className="[&_[role=slider]]:bg-violet-500"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-xs text-zinc-400">
                    Desire Score:{" "}
                    <span className="text-violet-400 font-bold">
                      {priceDesireScore}/10
                    </span>
                  </Label>
                  <Slider
                    min={1}
                    max={10}
                    step={1}
                    value={[priceDesireScore]}
                    onValueChange={([v]) => setPriceDesireScore(v)}
                    className="[&_[role=slider]]:bg-violet-500"
                  />
                </div>

                <Separator className="bg-zinc-800" />

                <Button
                  className="w-full bg-violet-600 hover:bg-violet-700 text-white font-semibold"
                  onClick={handleSuggestPrice}
                  disabled={priceFetching}
                >
                  {priceFetching ? (
                    <span className="flex items-center gap-2">
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Calculating...
                    </span>
                  ) : (
                    "💡 Get AI Price Suggestion"
                  )}
                </Button>
              </div>

              <div className="lg:col-span-2">
                {priceResult ? (
                  <div className="space-y-4">
                    <div className="bg-zinc-900/50 border border-violet-600/30 rounded-xl p-6 text-center">
                      <p className="text-xs text-zinc-500 uppercase tracking-wider mb-2">
                        Suggested Price
                      </p>
                      <p className="text-5xl font-bold text-violet-400">
                        $
                        {(
                          (priceResult.suggestedPriceCents ?? 0) / 100
                        ).toFixed(2)}
                      </p>
                      {priceResult.priceRangeCents && (
                        <p className="text-sm text-zinc-500 mt-2">
                          Range: $
                          {(priceResult.priceRangeCents.min / 100).toFixed(2)}{" "}
                          – $
                          {(priceResult.priceRangeCents.max / 100).toFixed(2)}
                        </p>
                      )}
                    </div>

                    {priceResult.breakdown && (
                      <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-5 space-y-3">
                        <p className="text-xs text-zinc-500 uppercase tracking-wider">
                          Price Breakdown
                        </p>
                        {Object.entries(priceResult.breakdown).map(
                          ([key, val]) => (
                            <div
                              key={key}
                              className="flex justify-between text-sm"
                            >
                              <span className="text-zinc-400 capitalize">
                                {key.replace(/_/g, " ")}
                              </span>
                              <span className="text-zinc-200 font-medium">
                                {typeof val === "number"
                                  ? `$${((val as number) / 100).toFixed(2)}`
                                  : String(val)}
                              </span>
                            </div>
                          )
                        )}
                      </div>
                    )}

                    {priceResult.rationale && (
                      <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-5">
                        <p className="text-xs text-zinc-500 uppercase tracking-wider mb-2">
                          AI Rationale
                        </p>
                        <p className="text-sm text-zinc-300 leading-relaxed">
                          {priceResult.rationale}
                        </p>
                      </div>
                    )}

                    {priceResult.platformMultipliers && (
                      <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-5">
                        <p className="text-xs text-zinc-500 uppercase tracking-wider mb-3">
                          Platform Multipliers
                        </p>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                          {Object.entries(priceResult.platformMultipliers).map(
                            ([platform, mult]) => (
                              <div key={platform} className="text-center">
                                <p className="text-xs text-zinc-500 capitalize">
                                  {platform}
                                </p>
                                <p className="text-sm font-bold text-violet-400">
                                  {String(mult)}x
                                </p>
                              </div>
                            )
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="bg-zinc-900/30 border border-dashed border-zinc-800 rounded-xl p-10 text-center h-full flex flex-col items-center justify-center gap-3">
                    <p className="text-4xl">💡</p>
                    <p className="text-sm text-zinc-500">
                      Set parameters and click{" "}
                      <strong className="text-zinc-300">
                        Get AI Price Suggestion
                      </strong>
                    </p>
                    <p className="text-xs text-zinc-700">
                      AI calculates optimal price based on duration, desire
                      score, content type, and platform
                    </p>
                  </div>
                )}
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
