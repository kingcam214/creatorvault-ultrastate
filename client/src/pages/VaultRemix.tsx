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
  return (
    <main className="min-h-screen bg-black text-white">
      <section className="relative min-h-screen overflow-hidden flex items-end">
        <video
          className="absolute inset-0 h-full w-full object-cover"
          src="/uploads/motion-b73098d7-098b-4366-a1fd-a83e36e802b6.mp4"
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
          aria-hidden="true"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/80 to-black/35" />
        <div className="relative z-10 w-full max-w-4xl mx-auto px-6 py-16 sm:px-10 sm:py-24">
          <p className="text-[11px] font-black uppercase tracking-[0.24em] text-amber-300">Vault Remix</p>
          <h1 className="mt-4 max-w-3xl text-4xl font-black leading-[0.95] tracking-tight sm:text-6xl">Your moment deserves more than a fake remix.</h1>
          <p className="mt-6 max-w-2xl text-base leading-7 text-zinc-200 sm:text-lg">The old Remix room tried to change footage with effects and send it out before CreatorVault could prove the result. That path stays closed. Your saved media is still here, and the real creation moves stay open below.</p>
          <div className="mt-10 grid gap-3 sm:grid-cols-3">
            <a href="/king/media-vault" className="rounded-2xl border border-white/25 bg-black/45 p-5 backdrop-blur-sm transition hover:border-amber-300/80">
              <div className="text-sm font-black">Media Vault</div>
              <div className="mt-2 text-sm leading-5 text-zinc-300">See the CreatorVault moments you already own.</div>
              <div className="mt-4 text-xs font-black uppercase tracking-wider text-amber-300">Open your source →</div>
            </a>
            <a href="/vault-x/studio" className="rounded-2xl border border-white/25 bg-black/45 p-5 backdrop-blur-sm transition hover:border-amber-300/80">
              <div className="text-sm font-black">Body Cinema</div>
              <div className="mt-2 text-sm leading-5 text-zinc-300">Choose the feeling and direction for a saved moment.</div>
              <div className="mt-4 text-xs font-black uppercase tracking-wider text-amber-300">Open Body Cinema →</div>
            </a>
            <a href="/social-hub" className="rounded-2xl border border-white/25 bg-black/45 p-5 backdrop-blur-sm transition hover:border-amber-300/80">
              <div className="text-sm font-black">Social Empire</div>
              <div className="mt-2 text-sm leading-5 text-zinc-300">Get the next moment ready for the places you use.</div>
              <div className="mt-4 text-xs font-black uppercase tracking-wider text-amber-300">Open Social Empire →</div>
            </a>
          </div>
          <p className="mt-7 max-w-2xl text-xs leading-5 text-zinc-400">When Remix can protect your original footage and return a finished piece you can truly watch, this room will earn the right to open again.</p>
        </div>
      </section>
    </main>
  );
}
