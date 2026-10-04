import { useEffect, useMemo, useState } from "react";
import { useLocation, useSearch } from "wouter";
import {
  ArrowRight,
  Film,
  Play,
  ShieldCheck,
  Sparkles,
  Type,
  Video,
} from "lucide-react";
import MediaPicker, { type MediaAssetItem } from "@/components/MediaPicker";
import {
  CreatorSourceVideoIntake,
  trailerMakerSourcePath,
} from "@/components/CreatorSourceVideoIntake";
import { trpc } from "@/lib/trpc";

function isVideo(asset: MediaAssetItem) {
  return (
    asset.assetType === "video" || Boolean(asset.mimeType?.startsWith("video/"))
  );
}

function isEligibleCreatorVideo(asset: MediaAssetItem) {
  const sourceUrl = String(asset.publicUrl || "").trim();
  const reference = [
    sourceUrl,
    asset.fileName,
    asset.originalName,
    asset.sourceType,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  const isCreatorVaultHosted =
    /^(?:https:\/\/creatorvault\.live\/(?:uploads|videos)\/|\/(?:uploads|videos)\/)/i.test(
      sourceUrl
    );
  const hasReadableMediaFacts =
    Number(asset.duration || 0) > 0 &&
    Number(asset.width || 0) > 0 &&
    Number(asset.height || 0) > 0;
  const isOriginalCreatorUpload =
    String(asset.sourceType || "").toLowerCase() === "upload";
  const isRejectedOrBenchmarkOutput = /(?:rejected|benchmark|vace|topaz)/.test(
    reference
  );
  return (
    isVideo(asset) &&
    isCreatorVaultHosted &&
    hasReadableMediaFacts &&
    isOriginalCreatorUpload &&
    !reference.includes("kingcam") &&
    !isRejectedOrBenchmarkOutput
  );
}

function videoPoster(asset: MediaAssetItem) {
  const candidate = asset.thumbnailUrl ?? "";
  return /\.(avif|gif|jpe?g|png|webp)(?:$|[?#])/i.test(candidate)
    ? candidate
    : undefined;
}

function formatDuration(seconds?: number | null) {
  if (!seconds || seconds < 0) return "—";
  const minutes = Math.floor(seconds / 60);
  const remainder = Math.floor(seconds % 60);
  return `${minutes}:${remainder.toString().padStart(2, "0")}`;
}

export function creatorVideoStudioSourcePath(mediaAssetId: string): string {
  return `/creator/video-studio?sourceAssetId=${encodeURIComponent(mediaAssetId)}`;
}

export default function CreatorVideoStudio() {
  const [, setLocation] = useLocation();
  const search = useSearch();
  const requestedSourceAssetId = new URLSearchParams(search).get(
    "sourceAssetId"
  );
  const [pickerOpen, setPickerOpen] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState<MediaAssetItem | null>(
    null
  );
  const [selectionMessage, setSelectionMessage] = useState<string | null>(null);
  const mediaQuery = trpc.mediaAssets.list.useQuery(
    { filter: "videos", limit: 120 },
    { staleTime: 30_000 }
  );
  const verifiedVideoSources = useMemo(() => {
    const media = Array.isArray(mediaQuery.data)
      ? (mediaQuery.data as MediaAssetItem[])
      : [];
    return media.filter(isEligibleCreatorVideo);
  }, [mediaQuery.data]);

  useEffect(() => {
    if (!requestedSourceAssetId) return;
    const requestedSource = verifiedVideoSources.find(
      asset => asset.id === requestedSourceAssetId
    );
    if (!requestedSource || selectedAsset?.id === requestedSource.id) return;
    setSelectedAsset(requestedSource);
    setSelectionMessage(
      "Your saved source is restored. Choose a creation room when you are ready."
    );
  }, [requestedSourceAssetId, selectedAsset?.id, verifiedVideoSources]);

  const activeSource = selectedAsset || verifiedVideoSources[0] || null;

  const continueWith = (
    destination: "body-cinema" | "trailer-maker" | "caption-stage"
  ) => {
    if (!activeSource?.publicUrl) {
      setSelectionMessage(
        "Choose a saved video first. CreatorVault only opens footage it can actually use."
      );
      setPickerOpen(true);
      return;
    }
    const path =
      destination === "body-cinema"
        ? "/vault-x/studio"
        : destination === "caption-stage"
          ? "/creator/caption-stage"
          : null;
    setLocation(
      path
        ? `${path}?sourceAssetId=${encodeURIComponent(activeSource.id)}`
        : trailerMakerSourcePath(activeSource.id)
    );
  };

  const handleSavedSource = async (asset: MediaAssetItem) => {
    setSelectedAsset(asset);
    setSelectionMessage(
      "Your saved source is selected. Choose a creation room when you are ready."
    );
    await mediaQuery.refetch();
  };

  return (
    <main className="cv-dna cv-page min-h-screen overflow-hidden pb-20 pt-20 text-white">
      <section className="border-b border-white/10 bg-[radial-gradient(circle_at_84%_8%,rgba(0,217,255,0.14),transparent_30%),linear-gradient(180deg,#0A0A0A,#0A0A0A)]">
        <div className="mx-auto max-w-7xl px-5 py-12 sm:px-8 sm:py-16 lg:px-12">
          <div className="max-w-3xl">
            <p className="cv-eyebrow flex items-center gap-2 text-[var(--accent-cyan)]">
              <Sparkles className="h-3.5 w-3.5" /> Creator video studio
            </p>
            <h1 className="display-xl mt-5 max-w-3xl text-white">
              Start with the
              <br />
              <span className="text-[var(--accent-cyan)]">moment you own.</span>
            </h1>
            <p className="body-lg mt-6 max-w-2xl text-[var(--text-secondary)]">
              Choose a saved CreatorVault source, watch it, and send that exact
              footage into the creation room built for it. Nothing is invented,
              replaced, or presented as finished before there is a real result
              to watch.
            </p>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-9 sm:px-8 lg:px-12">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(320px,.85fr)]">
          <article
            className="cv-panel overflow-hidden"
            style={{ borderRadius: 8 }}
          >
            <header className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 px-5 py-4 sm:px-6">
              <div className="min-w-0">
                <p className="cv-eyebrow text-[var(--text-muted)]">
                  Your selected source
                </p>
                <h2 className="heading-xl mt-1 truncate text-white">
                  {activeSource
                    ? activeSource.originalName || activeSource.fileName
                    : "Choose footage from your vault"}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => {
                  setSelectionMessage(null);
                  setPickerOpen(true);
                }}
                className="cv-cta-outline shrink-0"
                style={{ minHeight: 44, borderRadius: 2 }}
              >
                Choose saved footage
              </button>
            </header>

            <div className="relative aspect-[16/10] bg-[#0A0A0A] sm:aspect-[16/9]">
              {mediaQuery.isLoading ? (
                <div
                  className="cv-shimmer absolute inset-0"
                  aria-label="Reading saved sources"
                />
              ) : mediaQuery.isError ? (
                <div
                  className="cv-state absolute inset-5 grid place-items-center text-center"
                  role="alert"
                >
                  <div>
                    <p className="cv-eyebrow text-[#FF3B3B]">
                      Source library unavailable
                    </p>
                    <p className="body-md mt-3 text-[var(--text-secondary)]">
                      CreatorVault could not read your saved sources. No
                      substitute footage is being shown.
                    </p>
                  </div>
                </div>
              ) : activeSource?.publicUrl ? (
                <video
                  key={activeSource.id}
                  src={activeSource.publicUrl}
                  poster={videoPoster(activeSource)}
                  controls
                  autoPlay
                  loop
                  muted
                  playsInline
                  preload="metadata"
                  className="h-full w-full object-contain"
                />
              ) : (
                <div className="flex h-full flex-col items-center justify-center px-6 text-center">
                  <Video className="h-10 w-10 text-[var(--text-muted)]" />
                  <p className="heading-xl mt-4 text-3xl text-white">
                    Your real footage belongs here.
                  </p>
                  <p className="body-md mt-2 max-w-md text-[var(--text-secondary)]">
                    This studio only starts from videos CreatorVault can open
                    and carry into the next creation step.
                  </p>
                </div>
              )}
              {activeSource && !mediaQuery.isLoading && !mediaQuery.isError && (
                <span className="badge-text absolute bottom-4 left-4 border border-[var(--accent-cyan-border)] bg-[#0A0A0A]/85 px-3 py-1.5 text-[var(--accent-cyan)]">
                  VERIFIED VIDEO · {formatDuration(activeSource.duration)}
                </span>
              )}
            </div>

            <div className="border-t border-white/10 p-5 sm:p-6">
              <div className="flex items-start gap-3">
                <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-[var(--accent-cyan)]" />
                <p className="body-md text-[var(--text-secondary)]">
                  The source remains connected through the next step.
                  CreatorVault does not use visual tricks to stand in for a
                  watchable creation.
                </p>
              </div>
              {selectionMessage && (
                <p
                  className="cv-state mt-4 border-[var(--accent-cyan-border)] text-[var(--accent-cyan)]"
                  role="status"
                >
                  {selectionMessage}
                </p>
              )}
            </div>
            <CreatorSourceVideoIntake onSavedSource={handleSavedSource} />
          </article>

          <div className="flex flex-col gap-4">
            {[
              {
                id: "caption-stage" as const,
                label: "Caption Stage",
                title: (
                  <>
                    Put the words
                    <br />
                    inside the moment.
                  </>
                ),
                body: "Use this exact saved video. Caption Stage reads the real spoken words, lets you style them on moving footage, and prepares a watchable captioned master.",
                icon: Type,
              },
              {
                id: "body-cinema" as const,
                label: "Body Cinema",
                title: (
                  <>
                    Read the moment.
                    <br />
                    Choose the treatment.
                  </>
                ),
                body: "Your selected footage moves into source intelligence, measured moments, and the treatment decision made around what is actually in the clip.",
                icon: Film,
              },
              {
                id: "trailer-maker" as const,
                label: "Trailer Maker",
                title: (
                  <>
                    Build the story
                    <br />
                    around the source.
                  </>
                ),
                body: "Carry the exact selected video into your trailer direction: opening, structure, aspect, purpose, and release intent all stay tied to the real footage.",
                icon: Play,
              },
            ].map(room => {
              const Icon = room.icon;
              return (
                <button
                  key={room.id}
                  type="button"
                  onClick={() => continueWith(room.id)}
                  className="cv-panel group relative overflow-hidden p-6 text-left"
                  style={{ borderRadius: 8 }}
                >
                  <div className="absolute inset-x-0 top-0 h-px bg-[var(--accent-cyan)] opacity-50" />
                  <div className="flex items-start justify-between gap-5">
                    <span
                      className="grid h-11 w-11 place-items-center border border-[var(--accent-cyan-border)] bg-[var(--accent-cyan-dim)] text-[var(--accent-cyan)]"
                      style={{ borderRadius: 2 }}
                    >
                      <Icon
                        className={
                          room.id === "trailer-maker"
                            ? "h-5 w-5 fill-current"
                            : "h-5 w-5"
                        }
                      />
                    </span>
                    <ArrowRight className="h-5 w-5 text-[var(--accent-cyan)] transition group-hover:translate-x-1" />
                  </div>
                  <p className="cv-eyebrow mt-7 text-[var(--accent-cyan)]">
                    {room.label}
                  </p>
                  <h2 className="heading-xl mt-2 text-4xl text-white">
                    {room.title}
                  </h2>
                  <p className="body-md mt-4 text-[var(--text-secondary)]">
                    {room.body}
                  </p>
                  <span className="badge-text mt-6 inline-flex items-center text-[var(--accent-cyan)]">
                    OPEN WITH THIS SOURCE{" "}
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="mt-10 flex flex-col gap-4 border-t border-white/10 pt-7 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="cv-eyebrow text-[var(--text-muted)]">
              Available creator sources
            </p>
            {mediaQuery.isLoading ? (
              <div
                className="cv-shimmer mt-2 h-4 w-64"
                aria-label="Reading saved sources"
              />
            ) : mediaQuery.isError ? (
              <p className="body-md mt-1 text-[#FF8B8B]">
                Saved source records could not be read.
              </p>
            ) : (
              <p className="body-md mt-1 text-[var(--text-secondary)]">
                {`${verifiedVideoSources.length} saved source video${verifiedVideoSources.length === 1 ? " is" : "s are"} ready to choose.`}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={() => {
              setSelectionMessage(null);
              setPickerOpen(true);
            }}
            className="cv-cta-outline"
            style={{ minHeight: 52, borderRadius: 2 }}
          >
            Choose saved source <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </section>

      <MediaPicker
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        mode="single"
        title="Choose Your Video Source"
        subtitle="Only saved CreatorVault videos that can be opened and used are offered here."
        confirmLabel="Use This Video"
        assetEligibility={isEligibleCreatorVideo}
        onConfirm={assets => {
          const source = assets.find(isEligibleCreatorVideo);
          if (!source) {
            setSelectionMessage("Choose a ready video source from your vault.");
            return;
          }
          setSelectedAsset(source);
          setSelectionMessage(null);
          setPickerOpen(false);
        }}
      />
    </main>
  );
}
