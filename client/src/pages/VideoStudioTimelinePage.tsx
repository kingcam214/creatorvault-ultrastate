import React, { useEffect, useMemo, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  CircleAlert,
  Clapperboard,
  Crown,
  Plus,
  RefreshCw,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { BrandOverlayTrack } from "@/components/video-studio/BrandOverlayTrack";
import { analyzeAudioFile } from "@/components/video-studio/audioBeatDetector";
import { VideoStudioTimeline } from "@/components/video-studio/VideoStudioTimeline";
import {
  DEFAULT_BRAND_OVERLAY_STATE,
  type BeatAnalysis,
  type BrandOverlayState,
  type VideoTimelineChain,
} from "@/components/video-studio/types";
import { trpc } from "@/lib/trpc";

type CameraMotionType =
  | "stationary"
  | "dolly_in"
  | "dolly_out"
  | "pan_left"
  | "pan_right"
  | "tilt_up"
  | "tilt_down"
  | "orbit_left"
  | "orbit_right"
  | "tracking";
type AspectRatio = "16:9" | "9:16" | "1:1";
type FrameRate = 24 | 25 | 30 | 60;

type DraftShot = {
  id: string;
  promptText: string;
  durationSec: number;
  cameraMotionType: CameraMotionType;
  endFrameUrl: string;
};

const MOTION_TYPES: readonly CameraMotionType[] = [
  "stationary",
  "dolly_in",
  "dolly_out",
  "pan_left",
  "pan_right",
  "tilt_up",
  "tilt_down",
  "orbit_left",
  "orbit_right",
  "tracking",
];
const FRAME_RATES: readonly FrameRate[] = [24, 25, 30, 60];
const ASPECT_RATIOS: readonly AspectRatio[] = ["9:16", "16:9", "1:1"];
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function createDraftShot(): DraftShot {
  if (!globalThis.crypto?.randomUUID)
    throw new Error("This browser cannot create a safe local shot identity.");
  return {
    id: globalThis.crypto.randomUUID(),
    promptText: "",
    durationSec: 3,
    cameraMotionType: "stationary",
    endFrameUrl: "",
  };
}

function errorMessage(error: unknown): string {
  return error instanceof Error
    ? error.message
    : "The studio could not complete that action.";
}

function isCameraMotionType(value: string): value is CameraMotionType {
  return (MOTION_TYPES as readonly string[]).includes(value);
}

function isAspectRatio(value: string): value is AspectRatio {
  return (ASPECT_RATIOS as readonly string[]).includes(value);
}

function isFrameRate(value: number): value is FrameRate {
  return (FRAME_RATES as readonly number[]).includes(value);
}

function durationValue(value: string): number {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= 3 && parsed <= 15 ? parsed : 3;
}

export default function VideoStudioTimelinePage() {
  const [personaId, setPersonaId] = useState("");
  const [chainId, setChainId] = useState("");
  const [wardrobeTag, setWardrobeTag] = useState("");
  const [frameRate, setFrameRate] = useState<FrameRate>(30);
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>("9:16");
  const [shots, setShots] = useState<DraftShot[]>(() => [createDraftShot()]);
  const [idempotencyKey, setIdempotencyKey] = useState(
    () => `timeline:${globalThis.crypto.randomUUID()}`
  );
  const [formError, setFormError] = useState<string | null>(null);
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [beatAnalysis, setBeatAnalysis] = useState<BeatAnalysis | null>(null);
  const [audioError, setAudioError] = useState<string | null>(null);
  const [isAnalyzingAudio, setIsAnalyzingAudio] = useState(false);
  const [overlays, setOverlays] = useState<BrandOverlayState>(
    DEFAULT_BRAND_OVERLAY_STATE
  );

  const startChain = trpc.personaVault.startVideoChain.useMutation({
    onSuccess: chain => {
      setChainId(chain.id);
      setIdempotencyKey(`timeline:${globalThis.crypto.randomUUID()}`);
      setFormError(null);
    },
    onError: error => setFormError(error.message),
  });
  const statusQuery = trpc.personaVault.getVideoChainStatus.useQuery(
    { chainId },
    {
      enabled: UUID_PATTERN.test(chainId),
      refetchInterval: 4_000,
      retry: false,
    }
  );

  useEffect(() => {
    if (!audioFile) {
      setAudioUrl(null);
      setBeatAnalysis(null);
      setAudioError(null);
      return;
    }
    const objectUrl = URL.createObjectURL(audioFile);
    const controller = new AbortController();
    setAudioUrl(objectUrl);
    setAudioError(null);
    setBeatAnalysis(null);
    setIsAnalyzingAudio(true);
    void analyzeAudioFile(audioFile, undefined, controller.signal)
      .then(setBeatAnalysis)
      .catch(error => {
        if (error instanceof DOMException && error.name === "AbortError")
          return;
        setAudioError(errorMessage(error));
      })
      .finally(() => setIsAnalyzingAudio(false));
    return () => {
      controller.abort();
      URL.revokeObjectURL(objectUrl);
    };
  }, [audioFile]);

  const timelineChain = useMemo<VideoTimelineChain | null>(() => {
    const chain = statusQuery.data;
    if (!chain) return null;
    return {
      id: chain.id,
      chainStatus: chain.chainStatus,
      totalDurationSec: chain.totalDurationSec,
      frameRate: chain.frameRate,
      aspectRatio: chain.aspectRatio,
      renderCompletionIsOwnerAcceptance: false,
      segments: chain.segments.map(segment => ({
        id: segment.id,
        segmentOrder: segment.segmentOrder,
        durationSec: segment.durationSec,
        promptText: segment.promptText,
        segmentStatus: segment.segmentStatus,
        startFrameUrl: segment.startFrameUrl,
        terminalFrameExtractedUrl: segment.terminalFrameExtractedUrl,
        streamUrl: segment.streamUrl,
        cameraMotionType: segment.cameraMotionType,
      })),
    };
  }, [statusQuery.data]);

  const patchShot = (id: string, patch: Partial<DraftShot>) =>
    setShots(current =>
      current.map(shot => (shot.id === id ? { ...shot, ...patch } : shot))
    );
  const moveShot = (id: string, direction: -1 | 1) =>
    setShots(current => {
      const index = current.findIndex(shot => shot.id === id);
      const destination = index + direction;
      if (index < 0 || destination < 0 || destination >= current.length)
        return current;
      const next = [...current];
      [next[index], next[destination]] = [next[destination], next[index]];
      return next;
    });

  const submitChain = () => {
    if (!UUID_PATTERN.test(personaId.trim())) {
      setFormError(
        "Enter the UUID of a persona you own before creating a continuity chain."
      );
      return;
    }
    const invalidShot = shots.find(shot => !shot.promptText.trim());
    if (invalidShot) {
      setFormError(
        "Every arranged shot needs its own exact prompt before the immutable chain can be created."
      );
      return;
    }
    const invalidEndFrame = shots.find(
      shot =>
        shot.endFrameUrl.trim() && !/^https:\/\//i.test(shot.endFrameUrl.trim())
    );
    if (invalidEndFrame) {
      setFormError(
        "An optional end frame must be a credential-free HTTPS URL from your owned Media Vault."
      );
      return;
    }
    startChain.mutate({
      personaId: personaId.trim(),
      idempotencyKey,
      shots: shots.map(shot => ({
        durationSec: shot.durationSec,
        promptText: shot.promptText.trim(),
        cameraMotionType: shot.cameraMotionType,
        ...(shot.endFrameUrl.trim()
          ? { endFrameUrl: shot.endFrameUrl.trim() }
          : {}),
      })),
      ...(wardrobeTag.trim() ? { wardrobeTag: wardrobeTag.trim() } : {}),
      frameRate,
      aspectRatio,
    });
  };

  const statusError = statusQuery.error?.message ?? null;
  const queueMessage =
    timelineChain?.chainStatus === "pending"
      ? "Chain record created. No provider render starts until the separate owner authorization gate is used."
      : null;

  return (
    <main className="min-h-screen bg-[#0A0A0A] pb-20 pt-20 text-white">
      <section className="border-b border-[#D4AF37]/20 bg-[radial-gradient(circle_at_12%_0%,rgba(106,23,51,0.6),transparent_31%),radial-gradient(circle_at_84%_8%,rgba(212,175,55,0.18),transparent_23%),#0A0A0A]">
        <div className="mx-auto max-w-7xl px-5 py-12 sm:px-8 lg:px-12">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-[#D4AF37]/40 bg-[#D4AF37]/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-[#F6E7B0]">
              <Crown className="h-3.5 w-3.5" />
              Persona continuity studio
            </div>
            <h1 className="mt-5 font-serif text-5xl font-bold leading-[0.88] tracking-[-0.05em] text-white sm:text-7xl">
              Cut on the moment.
              <br />
              <span className="text-[#D4AF37]">Keep the identity intact.</span>
            </h1>
            <p className="mt-6 max-w-2xl text-base leading-relaxed text-white/70 sm:text-lg">
              Arrange an immutable Persona Vault sequence, read your selected
              audio locally, and direct overlay treatment against segments
              CreatorVault has actually persisted.
            </p>
          </div>
        </div>
      </section>

      <div className="mx-auto grid max-w-7xl gap-6 px-5 py-7 sm:px-8 lg:grid-cols-[minmax(0,1fr)_350px] lg:px-12">
        <div className="space-y-6">
          <VideoStudioTimeline
            chain={timelineChain}
            beatAnalysis={beatAnalysis}
            audioName={audioFile?.name ?? null}
            audioUrl={audioUrl}
            isAnalyzingAudio={isAnalyzingAudio}
            audioError={audioError}
            overlays={overlays}
            onAudioSelected={setAudioFile}
          />
          {queueMessage ? (
            <p className="rounded-xl border border-[#D4AF37]/25 bg-[#D4AF37]/10 px-4 py-3 text-sm font-semibold text-[#F6E7B0]">
              {queueMessage}
            </p>
          ) : null}
          {statusError ? (
            <p
              role="alert"
              className="rounded-xl border border-[#6A1733] bg-[#6A1733]/25 px-4 py-3 text-sm text-[#F6D2DA]"
            >
              {statusError}
            </p>
          ) : null}
        </div>

        <aside className="space-y-6">
          <BrandOverlayTrack value={overlays} onChange={setOverlays} />
          <section
            aria-labelledby="chain-composer-heading"
            className="rounded-2xl border border-[#D4AF37]/25 bg-[#12100E] p-4 shadow-[0_20px_60px_-45px_rgba(212,175,55,0.85)]"
          >
            <div className="flex items-start gap-3">
              <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#D4AF37]/35 bg-[#D4AF37]/10 text-[#D4AF37]">
                <Clapperboard className="h-5 w-5" />
              </span>
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#D4AF37]">
                  Chain composer
                </p>
                <h2
                  id="chain-composer-heading"
                  className="mt-1 text-lg font-black text-white"
                >
                  Arrange before approval.
                </h2>
                <p className="mt-1 text-sm leading-relaxed text-white/60">
                  Shot order becomes immutable once Task 2 creates the chain.
                </p>
              </div>
            </div>

            <div className="mt-5 space-y-3">
              <label className="block text-xs font-bold text-white/70">
                Persona Vault ID
                <Input
                  value={personaId}
                  onChange={event => setPersonaId(event.target.value)}
                  placeholder="Persona UUID"
                  className="mt-1.5 h-11 border-white/10 bg-black/25 font-mono text-xs text-white placeholder:text-white/30"
                />
              </label>
              <label className="block text-xs font-bold text-white/70">
                Wardrobe tag{" "}
                <span className="font-normal text-white/40">optional</span>
                <Input
                  value={wardrobeTag}
                  onChange={event => setWardrobeTag(event.target.value)}
                  placeholder="e.g. velvet-crown"
                  className="mt-1.5 h-11 border-white/10 bg-black/25 text-white placeholder:text-white/30"
                />
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label className="text-xs font-bold text-white/70">
                  Frame rate
                  <select
                    value={frameRate}
                    onChange={event => {
                      const value = Number(event.target.value);
                      if (isFrameRate(value)) setFrameRate(value);
                    }}
                    className="mt-1.5 h-11 w-full rounded-md border border-white/10 bg-black/25 px-3 text-sm text-white"
                  >
                    <>
                      {FRAME_RATES.map(rate => (
                        <option key={rate} value={rate}>
                          {rate} fps
                        </option>
                      ))}
                    </>
                  </select>
                </label>
                <label className="text-xs font-bold text-white/70">
                  Aspect
                  <select
                    value={aspectRatio}
                    onChange={event => {
                      if (isAspectRatio(event.target.value))
                        setAspectRatio(event.target.value);
                    }}
                    className="mt-1.5 h-11 w-full rounded-md border border-white/10 bg-black/25 px-3 text-sm text-white"
                  >
                    <>
                      {ASPECT_RATIOS.map(ratio => (
                        <option key={ratio} value={ratio}>
                          {ratio}
                        </option>
                      ))}
                    </>
                  </select>
                </label>
              </div>
            </div>

            <div className="mt-5 space-y-3">
              {shots.map((shot, index) => (
                <article
                  key={shot.id}
                  className="rounded-xl border border-white/10 bg-black/20 p-3"
                >
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#D4AF37]">
                      Shot {index + 1}
                    </p>
                    <div className="flex gap-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => moveShot(shot.id, -1)}
                        disabled={index === 0}
                        className="text-white/70 hover:bg-white/10 hover:text-white"
                      >
                        <ArrowUp className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => moveShot(shot.id, 1)}
                        disabled={index === shots.length - 1}
                        className="text-white/70 hover:bg-white/10 hover:text-white"
                      >
                        <ArrowDown className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        onClick={() =>
                          setShots(current =>
                            current.length > 1
                              ? current.filter(item => item.id !== shot.id)
                              : current
                          )
                        }
                        disabled={shots.length === 1}
                        className="text-[#F6D2DA] hover:bg-[#6A1733]/30 hover:text-white"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                  <label className="mt-3 block text-[10px] font-black uppercase tracking-[0.13em] text-white/45">
                    Prompt
                    <textarea
                      value={shot.promptText}
                      onChange={event =>
                        patchShot(shot.id, {
                          promptText: event.target.value.slice(0, 1200),
                        })
                      }
                      placeholder="Describe the continuous shot with identity, movement, and mood."
                      className="mt-1.5 min-h-20 w-full resize-y rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm text-white outline-none placeholder:text-white/30 focus:border-[#D4AF37]"
                    />
                  </label>
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <label className="text-[10px] font-black uppercase tracking-[0.13em] text-white/45">
                      Duration
                      <select
                        value={shot.durationSec}
                        onChange={event =>
                          patchShot(shot.id, {
                            durationSec: durationValue(event.target.value),
                          })
                        }
                        className="mt-1.5 h-9 w-full rounded-md border border-white/10 bg-black/30 px-2 text-sm text-white"
                      >
                        <>
                          {Array.from(
                            { length: 13 },
                            (_, value) => value + 3
                          ).map(seconds => (
                            <option key={seconds} value={seconds}>
                              {seconds}s
                            </option>
                          ))}
                        </>
                      </select>
                    </label>
                    <label className="text-[10px] font-black uppercase tracking-[0.13em] text-white/45">
                      Motion
                      <select
                        value={shot.cameraMotionType}
                        onChange={event => {
                          if (isCameraMotionType(event.target.value))
                            patchShot(shot.id, {
                              cameraMotionType: event.target.value,
                            });
                        }}
                        className="mt-1.5 h-9 w-full rounded-md border border-white/10 bg-black/30 px-2 text-sm text-white"
                      >
                        <>
                          {MOTION_TYPES.map(motion => (
                            <option key={motion} value={motion}>
                              {motion.replaceAll("_", " ")}
                            </option>
                          ))}
                        </>
                      </select>
                    </label>
                  </div>
                  <label className="mt-3 block text-[10px] font-black uppercase tracking-[0.13em] text-white/45">
                    Owned end-frame URL{" "}
                    <span className="normal-case tracking-normal text-white/30">
                      optional
                    </span>
                    <Input
                      value={shot.endFrameUrl}
                      onChange={event =>
                        patchShot(shot.id, { endFrameUrl: event.target.value })
                      }
                      placeholder="https://…"
                      className="mt-1.5 h-9 border-white/10 bg-black/30 text-xs text-white placeholder:text-white/30"
                    />
                  </label>
                </article>
              ))}
            </div>

            <Button
              type="button"
              variant="outline"
              onClick={() =>
                setShots(current => [...current, createDraftShot()])
              }
              disabled={shots.length >= 24}
              className="mt-3 h-11 w-full rounded-xl border-white/15 bg-white/[0.03] text-white hover:bg-white/10"
            >
              <Plus className="h-4 w-4" />
              Add shot
            </Button>
            {formError ? (
              <p
                role="alert"
                className="mt-3 flex items-start gap-2 rounded-xl border border-[#6A1733] bg-[#6A1733]/20 px-3 py-2.5 text-xs leading-relaxed text-[#F6D2DA]"
              >
                <CircleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                {formError}
              </p>
            ) : null}
            <Button
              type="button"
              onClick={submitChain}
              disabled={startChain.isPending}
              className="mt-3 h-12 w-full rounded-xl bg-[#D4AF37] font-black text-[#0A0A0A] hover:bg-[#F6E7B0]"
            >
              {startChain.isPending ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <Clapperboard className="h-4 w-4" />
              )}
              {startChain.isPending
                ? "Creating chain record"
                : "Create continuity chain"}
            </Button>
            <p className="mt-3 text-xs leading-relaxed text-white/45">
              Creating the record does not submit a paid render. Existing Task 2
              owner authorization, credit ceiling, provider freeze and one-use
              permit controls remain required.
            </p>
          </section>

          <section className="rounded-2xl border border-white/10 bg-[#111] p-4">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-white/45">
              Load an existing chain
            </p>
            <div className="mt-3 flex gap-2">
              <Input
                value={chainId}
                onChange={event => setChainId(event.target.value)}
                placeholder="Chain UUID"
                className="h-11 border-white/10 bg-black/25 font-mono text-xs text-white placeholder:text-white/30"
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => statusQuery.refetch()}
                disabled={!UUID_PATTERN.test(chainId) || statusQuery.isFetching}
                className="h-11 shrink-0 rounded-xl border-white/15 bg-white/[0.03] text-white hover:bg-white/10"
              >
                <RefreshCw
                  className={`h-4 w-4 ${statusQuery.isFetching ? "animate-spin" : ""}`}
                />
              </Button>
            </div>
            <p className="mt-2 text-xs leading-relaxed text-white/45">
              Read-only polling refreshes actual Task 2 status. It does not
              drive the provider or claim visual acceptance.
            </p>
          </section>
        </aside>
      </div>
    </main>
  );
}
