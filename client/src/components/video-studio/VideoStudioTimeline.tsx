import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  AudioLines,
  Clapperboard,
  FastForward,
  Film,
  Pause,
  Play,
  Scissors,
  Sparkles,
  Volume2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { BrandOverlayPreview } from "./BrandOverlayTrack";
import { snapCutMarkersToBeats } from "./audioBeatDetector";
import type {
  BeatAnalysis,
  BrandOverlayState,
  TimelineCutMarker,
  TimelineSegment,
  VideoTimelineChain,
} from "./types";

export type VideoStudioTimelineProps = {
  chain: VideoTimelineChain | null;
  beatAnalysis: BeatAnalysis | null;
  audioName: string | null;
  audioUrl: string | null;
  isAnalyzingAudio: boolean;
  audioError: string | null;
  overlays: BrandOverlayState;
  onAudioSelected: (file: File | null) => void;
  onCutsChange?: (cuts: TimelineCutMarker[]) => void;
};

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(Math.max(value, minimum), maximum);
}

export function formatTimelineTime(value: number): string {
  const safe = Math.max(0, value);
  const minutes = Math.floor(safe / 60);
  const seconds = Math.floor(safe % 60);
  const hundredths = Math.floor((safe % 1) * 100);
  return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}:${hundredths.toString().padStart(2, "0")}`;
}

export function createChainCutMarkers(
  segments: readonly TimelineSegment[]
): TimelineCutMarker[] {
  let elapsed = 0;
  return segments.slice(0, -1).map(segment => {
    elapsed += segment.durationSec;
    return {
      segmentId: segment.id,
      originalTimeSec: elapsed,
      timeSec: elapsed,
      snappedBeatTimeSec: null,
    };
  });
}

function segmentStarts(
  segments: readonly TimelineSegment[]
): Array<TimelineSegment & { startTimeSec: number }> {
  let elapsed = 0;
  return segments.map(segment => {
    const enriched = { ...segment, startTimeSec: elapsed };
    elapsed += segment.durationSec;
    return enriched;
  });
}

function FrameThumbnail({ url, label }: { url: string | null; label: string }) {
  return url ? (
    <img
      src={url}
      alt={`${label} frame`}
      loading="lazy"
      className="h-full w-full object-cover"
    />
  ) : (
    <div className="flex h-full items-center justify-center bg-[linear-gradient(135deg,#16120c,#0A0A0A)] px-2 text-center text-[9px] font-black uppercase tracking-[0.1em] text-white/40">
      {label} unrecorded
    </div>
  );
}

function EmptyPreview() {
  return (
    <div className="flex h-full flex-col items-center justify-center bg-[radial-gradient(circle_at_center,rgba(106,23,51,0.28),transparent_42%),#070707] px-6 text-center">
      <Film className="h-10 w-10 text-[#D4AF37]/65" />
      <p className="mt-4 text-lg font-black text-white">
        Select a persisted chain.
      </p>
      <p className="mt-2 max-w-sm text-sm leading-relaxed text-white/55">
        The preview only draws streams that Task 2 has actually persisted. It
        never invents footage or terminal frames.
      </p>
    </div>
  );
}

export function VideoStudioTimeline({
  chain,
  beatAnalysis,
  audioName,
  audioUrl,
  isAnalyzingAudio,
  audioError,
  overlays,
  onAudioSelected,
  onCutsChange,
}: VideoStudioTimelineProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [currentTimeSec, setCurrentTimeSec] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [cutMarkers, setCutMarkers] = useState<TimelineCutMarker[]>([]);

  const segments = useMemo(
    () => (chain ? segmentStarts(chain.segments) : []),
    [chain]
  );
  const durationSec = chain?.totalDurationSec ?? 0;
  const activeSegment = useMemo(
    () =>
      segments.find(
        segment =>
          currentTimeSec >= segment.startTimeSec &&
          currentTimeSec < segment.startTimeSec + segment.durationSec
      ) ??
      segments[segments.length - 1] ??
      null,
    [currentTimeSec, segments]
  );

  useEffect(() => {
    setCurrentTimeSec(0);
    setIsPlaying(false);
    setCutMarkers(createChainCutMarkers(chain?.segments ?? []));
  }, [chain?.id, chain?.segments]);

  useEffect(() => {
    onCutsChange?.(cutMarkers);
  }, [cutMarkers, onCutsChange]);

  const drawPreviewFrame = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (
      !video ||
      !canvas ||
      video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA ||
      video.videoWidth <= 0 ||
      video.videoHeight <= 0
    )
      return;
    if (
      canvas.width !== video.videoWidth ||
      canvas.height !== video.videoHeight
    ) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
    }
    const context = canvas.getContext("2d");
    if (!context) return;
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const render = () => drawPreviewFrame();
    video.addEventListener("loadeddata", render);
    video.addEventListener("timeupdate", render);
    video.addEventListener("seeked", render);
    return () => {
      video.removeEventListener("loadeddata", render);
      video.removeEventListener("timeupdate", render);
      video.removeEventListener("seeked", render);
    };
  }, [activeSegment?.id, drawPreviewFrame]);

  useEffect(() => {
    if (!isPlaying) return;
    let frameId = 0;
    const loop = () => {
      drawPreviewFrame();
      frameId = requestAnimationFrame(loop);
    };
    frameId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frameId);
  }, [drawPreviewFrame, isPlaying]);

  useEffect(() => {
    const video = videoRef.current;
    const audio = audioRef.current;
    if (video && activeSegment) {
      const localTime = clamp(
        currentTimeSec - activeSegment.startTimeSec,
        0,
        activeSegment.durationSec
      );
      if (
        Number.isFinite(video.duration) &&
        Math.abs(video.currentTime - localTime) > 0.18
      )
        video.currentTime = localTime;
      if (isPlaying) void video.play().catch(() => setIsPlaying(false));
      else video.pause();
    }
    if (audio && audioUrl) {
      if (
        Number.isFinite(audio.duration) &&
        Math.abs(audio.currentTime - currentTimeSec) > 0.18
      )
        audio.currentTime = currentTimeSec;
      if (isPlaying) void audio.play().catch(() => setIsPlaying(false));
      else audio.pause();
    }
  }, [
    activeSegment?.durationSec,
    activeSegment?.id,
    activeSegment?.startTimeSec,
    audioUrl,
    currentTimeSec,
    isPlaying,
  ]);

  const scrubTo = useCallback(
    (time: number) => setCurrentTimeSec(clamp(time, 0, durationSec)),
    [durationSec]
  );

  const syncVideoTime = useCallback(() => {
    const video = videoRef.current;
    if (!video || !activeSegment) return;
    scrubTo(activeSegment.startTimeSec + video.currentTime);
  }, [activeSegment, scrubTo]);

  const advanceAfterSegment = useCallback(() => {
    if (!activeSegment) return;
    const next = segments.find(
      segment => segment.segmentOrder === activeSegment.segmentOrder + 1
    );
    if (!next) {
      scrubTo(durationSec);
      setIsPlaying(false);
      return;
    }
    scrubTo(next.startTimeSec);
  }, [activeSegment, durationSec, scrubTo, segments]);

  const snapAllCuts = () => {
    if (!beatAnalysis?.onsets.length) return;
    setCutMarkers(current =>
      snapCutMarkersToBeats(current, beatAnalysis.onsets)
    );
  };

  const beatCount = beatAnalysis?.onsets.length ?? 0;
  const timelineScale = Math.max(durationSec, 1);
  const activeLabel = activeSegment
    ? `Segment ${activeSegment.segmentOrder} · ${activeSegment.segmentStatus}`
    : "Awaiting a persisted segment";

  return (
    <section
      aria-label="Video Studio timeline"
      className="rounded-[1.6rem] border border-[#D4AF37]/25 bg-[#0A0A0A] p-3 shadow-[0_30px_100px_-55px_rgba(212,175,55,0.75)] sm:p-5"
    >
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div>
          <div className="relative aspect-video overflow-hidden rounded-2xl border border-white/10 bg-black">
            {activeSegment?.streamUrl ? (
              <>
                <video
                  ref={videoRef}
                  src={activeSegment.streamUrl}
                  muted={!audioUrl}
                  playsInline
                  preload="metadata"
                  onTimeUpdate={syncVideoTime}
                  onEnded={advanceAfterSegment}
                  className="absolute inset-0 h-full w-full opacity-0"
                  aria-label="Decoded source video used for canvas preview"
                />
                <canvas
                  ref={canvasRef}
                  aria-label="Synchronous canvas video preview"
                  className="h-full w-full object-contain"
                />
                <BrandOverlayPreview
                  overlay={overlays}
                  currentTimeSec={currentTimeSec}
                  durationSec={durationSec}
                />
              </>
            ) : (
              <EmptyPreview />
            )}
            <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-3 bg-gradient-to-t from-black/90 to-transparent px-4 pb-4 pt-10">
              <span className="rounded-full border border-white/15 bg-black/65 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.14em] text-white backdrop-blur">
                {activeLabel}
              </span>
              <span className="font-mono text-xs text-[#F6E7B0]">
                {formatTimelineTime(currentTimeSec)} /{" "}
                {formatTimelineTime(durationSec)}
              </span>
            </div>
          </div>
          <audio
            ref={audioRef}
            src={audioUrl ?? undefined}
            onTimeUpdate={() => {
              if (!activeSegment && audioRef.current)
                scrubTo(audioRef.current.currentTime);
            }}
          />

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Button
              type="button"
              onClick={() => setIsPlaying(value => !value)}
              disabled={!activeSegment?.streamUrl && !audioUrl}
              className="h-11 rounded-xl bg-[#D4AF37] px-4 font-black text-[#0A0A0A] hover:bg-[#F6E7B0]"
            >
              {isPlaying ? (
                <Pause className="h-4 w-4" />
              ) : (
                <Play className="h-4 w-4 fill-current" />
              )}
              {isPlaying ? "Pause" : "Preview"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => scrubTo(0)}
              className="h-11 rounded-xl border-white/15 bg-white/[0.03] text-white hover:bg-white/10"
            >
              <FastForward className="h-4 w-4 rotate-180" /> Start
            </Button>
            <label className="min-w-[180px] flex-1 text-xs font-bold text-white/55">
              <span className="sr-only">Timeline scrubber</span>
              <input
                aria-label="Timeline scrubber"
                type="range"
                min="0"
                max={timelineScale}
                step="0.01"
                value={clamp(currentTimeSec, 0, timelineScale)}
                onChange={event => scrubTo(Number(event.target.value))}
                className="w-full accent-[#D4AF37]"
              />
            </label>
          </div>
        </div>

        <aside className="rounded-2xl border border-white/10 bg-[#14110F] p-4">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#D4AF37]">
            Playback truth
          </p>
          <h2 className="mt-2 text-xl font-black text-white">
            Continuity stays visible.
          </h2>
          <dl className="mt-5 space-y-3 text-sm">
            <div className="flex justify-between gap-4 border-b border-white/10 pb-3">
              <dt className="text-white/55">Chain state</dt>
              <dd className="font-bold text-white">
                {chain?.chainStatus ?? "No chain loaded"}
              </dd>
            </div>
            <div className="flex justify-between gap-4 border-b border-white/10 pb-3">
              <dt className="text-white/55">Segments</dt>
              <dd className="font-bold text-white">{segments.length}</dd>
            </div>
            <div className="flex justify-between gap-4 border-b border-white/10 pb-3">
              <dt className="text-white/55">Locked format</dt>
              <dd className="font-bold text-white">
                {chain ? `${chain.aspectRatio} · ${chain.frameRate} fps` : "—"}
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-white/55">Acceptance</dt>
              <dd className="max-w-[140px] text-right font-bold text-[#D4AF37]">
                Render state is not owner acceptance
              </dd>
            </div>
          </dl>
        </aside>
      </div>

      <div className="mt-5 overflow-x-auto pb-1">
        <div className="min-w-[780px] rounded-2xl border border-white/10 bg-[#111] p-3">
          <div className="mb-2 flex items-center justify-between px-1">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/45">
              Edit timeline · local direction
            </p>
            <p className="text-xs text-white/45">
              {formatTimelineTime(durationSec)} master length
            </p>
          </div>

          <div className="grid grid-cols-[125px_minmax(0,1fr)] gap-3 border-t border-white/10 py-3">
            <div className="flex items-start gap-2 pt-2 text-xs font-black uppercase tracking-[0.12em] text-white/60">
              <Clapperboard className="h-4 w-4 text-[#D4AF37]" />
              Video track
            </div>
            <div className="relative h-28 overflow-hidden rounded-xl border border-[#D4AF37]/20 bg-[linear-gradient(90deg,rgba(212,175,55,0.04)_1px,transparent_1px),#080808] bg-[size:8.333%_100%]">
              {segments.map(segment => (
                <button
                  key={segment.id}
                  type="button"
                  onClick={() => scrubTo(segment.startTimeSec)}
                  className="absolute top-1.5 h-[calc(100%-12px)] overflow-hidden rounded-lg border border-[#D4AF37]/35 bg-[#211A10] text-left shadow-sm transition hover:border-[#F6E7B0]"
                  style={{
                    left: `${(segment.startTimeSec / timelineScale) * 100}%`,
                    width: `${Math.max(5, (segment.durationSec / timelineScale) * 100)}%`,
                  }}
                  aria-label={`Jump to segment ${segment.segmentOrder}`}
                >
                  <div className="grid h-14 grid-cols-2 border-b border-white/10">
                    <FrameThumbnail url={segment.startFrameUrl} label="Start" />
                    <FrameThumbnail
                      url={segment.terminalFrameExtractedUrl}
                      label="Terminal"
                    />
                  </div>
                  <div className="px-2 py-1.5">
                    <p className="truncate text-[10px] font-black text-white">
                      S{segment.segmentOrder} · {segment.segmentStatus}
                    </p>
                    <p className="mt-0.5 truncate text-[9px] text-white/55">
                      {segment.promptText}
                    </p>
                  </div>
                </button>
              ))}
              {cutMarkers.map(marker => (
                <div
                  key={marker.segmentId}
                  className="absolute inset-y-0 z-10 w-px bg-[#D4AF37]"
                  style={{ left: `${(marker.timeSec / timelineScale) * 100}%` }}
                  title={
                    marker.snappedBeatTimeSec
                      ? `Snapped to ${formatTimelineTime(marker.timeSec)}`
                      : `Cut at ${formatTimelineTime(marker.timeSec)}`
                  }
                >
                  <span className="absolute -left-1.5 top-1 h-3 w-3 rotate-45 border border-[#F6E7B0] bg-[#6A1733]" />
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-[125px_minmax(0,1fr)] gap-3 border-t border-white/10 py-3">
            <div className="flex items-start gap-2 pt-2 text-xs font-black uppercase tracking-[0.12em] text-white/60">
              <AudioLines className="h-4 w-4 text-[#D4AF37]" />
              Audio / music
            </div>
            <div className="relative min-h-16 rounded-xl border border-white/10 bg-[#0D0D0D] px-3 py-2">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs font-bold text-white">
                    {audioName ?? "No local audio selected"}
                  </p>
                  <p className="mt-1 text-[10px] uppercase tracking-[0.12em] text-white/45">
                    {isAnalyzingAudio
                      ? "Reading local transients…"
                      : beatAnalysis
                        ? `${beatCount} detected onset${beatCount === 1 ? "" : "s"}`
                        : "Choose MP3, WAV, M4A, AAC, OGG, or FLAC"}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                    className="h-9 rounded-lg border-white/15 bg-white/[0.03] px-3 text-xs font-bold text-white hover:bg-white/10"
                  >
                    <Volume2 className="h-3.5 w-3.5" />
                    Audio
                  </Button>
                  <Button
                    type="button"
                    onClick={snapAllCuts}
                    disabled={
                      !beatAnalysis?.onsets.length || !cutMarkers.length
                    }
                    className="h-9 rounded-lg bg-[#6A1733] px-3 text-xs font-black text-white hover:bg-[#842241]"
                  >
                    <Scissors className="h-3.5 w-3.5" />
                    Snap to Beat
                  </Button>
                </div>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="audio/mpeg,audio/wav,audio/x-wav,audio/mp4,audio/aac,audio/ogg,audio/flac,.mp3,.wav,.m4a,.aac,.ogg,.flac"
                className="sr-only"
                onChange={event =>
                  onAudioSelected(event.target.files?.[0] ?? null)
                }
              />
              {audioError ? (
                <p
                  role="alert"
                  className="mt-2 rounded-lg border border-[#6A1733] bg-[#6A1733]/20 px-2 py-1.5 text-xs text-[#F6D2DA]"
                >
                  {audioError}
                </p>
              ) : null}
              <div
                aria-label="Detected audio beats"
                className="relative mt-3 h-4 overflow-hidden rounded bg-white/[0.03]"
              >
                {beatAnalysis?.onsets.map(onset => (
                  <span
                    key={`${onset.timeSec}-${onset.strength}`}
                    className="absolute bottom-0 w-px bg-[#D4AF37]"
                    style={{
                      left: `${(onset.timeSec / Math.max(beatAnalysis.durationSec, 1)) * 100}%`,
                      height: `${clamp(20 + onset.strength * 900, 20, 100)}%`,
                    }}
                  />
                ))}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-[125px_minmax(0,1fr)] gap-3 border-t border-white/10 py-3">
            <div className="flex items-start gap-2 pt-2 text-xs font-black uppercase tracking-[0.12em] text-white/60">
              <Sparkles className="h-4 w-4 text-[#D4AF37]" />
              Overlay / titles
            </div>
            <div className="relative h-16 rounded-xl border border-[#6A1733]/60 bg-[linear-gradient(90deg,rgba(106,23,51,0.38),rgba(10,10,10,0.7))]">
              {overlays.introLogoEnabled ? (
                <span className="absolute left-2 top-2 rounded border border-[#D4AF37]/40 bg-[#D4AF37]/10 px-2 py-1 text-[9px] font-black uppercase tracking-[0.12em] text-[#F6E7B0]">
                  Intro sting
                </span>
              ) : null}
              {overlays.lowerThirdEnabled ? (
                <span className="absolute bottom-2 left-[18%] rounded border border-white/20 bg-black/50 px-2 py-1 text-[9px] font-black uppercase tracking-[0.12em] text-white/70">
                  Now playing
                </span>
              ) : null}
              {overlays.endCardEnabled ? (
                <span className="absolute right-2 top-2 rounded border border-[#6A1733] bg-[#6A1733]/50 px-2 py-1 text-[9px] font-black uppercase tracking-[0.12em] text-white">
                  End card CTA
                </span>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
