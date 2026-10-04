import { useState } from "react";
import { Link } from "wouter";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Clapperboard,
  Eye,
  FileText,
  LoaderCircle,
  PlayCircle,
  Scissors,
  ShieldCheck,
} from "lucide-react";
import type { MediaAssetItem } from "./MediaPicker";
import { trpc } from "@/lib/trpc";

export type DirectionPreviewWorkspace = {
  id: string;
  entityName: string;
  targetAudience: string;
  primaryPromise: string;
  lifeOutcome: string;
  reputation: string;
  firstOffer: string;
  currentMotivation: string;
  visualDirection: string;
  shortFormIdea: string;
  longFormStoryIdea: string;
  communityRole: string;
  storyManifesto: string;
  futureMove: string;
};

export type DirectionPreviewScene = {
  sceneIndex: number;
  role: string | null;
  durationSeconds: number | null;
  overlayText: string | null;
  visualDescription: string | null;
  sourceAssetId: string | null;
};

export type DirectionPreviewDraft = {
  id: string;
  projectName: string;
  projectType: string;
  title: string | null;
  concept: string | null;
  scriptText: string | null;
  format: string;
  sourceAssetId: string;
  status: string;
  hooks: string[];
  scenes: DirectionPreviewScene[];
};

export function creatorVideoStudioSourcePath(mediaAssetId: string): string {
  return `/creator/video-studio?sourceAssetId=${encodeURIComponent(mediaAssetId)}`;
}

export function trailerMakerSourcePath(mediaAssetId: string): string {
  return `/trailer-maker?sourceAssetId=${encodeURIComponent(mediaAssetId)}`;
}

export function workspaceEditPath(workspaceId: string): string {
  return `/creator/workspace?draft=${encodeURIComponent(workspaceId)}`;
}

export function directionPreviewPath(workspaceId: string): string {
  return `/creator/workspace?draft=${encodeURIComponent(workspaceId)}&view=direction`;
}

export function directionSceneLabel(scene: DirectionPreviewScene): string {
  if (scene.role?.trim()) return scene.role.trim().replace(/_/g, " ");
  return `Scene ${scene.sceneIndex + 1}`;
}

function savedWorkspaceNotes(workspace: DirectionPreviewWorkspace): Array<{
  label: string;
  value: string;
}> {
  return [
    ["Primary promise", workspace.primaryPromise],
    ["First offer", workspace.firstOffer],
    ["Creative direction", workspace.visualDirection],
    ["Short-form idea", workspace.shortFormIdea],
    ["Long-form story", workspace.longFormStoryIdea],
    ["Story manifesto", workspace.storyManifesto],
    ["Next move", workspace.futureMove],
  ]
    .filter((entry): entry is [string, string] => Boolean(entry[1]?.trim()))
    .map(([label, value]) => ({ label, value }));
}

export function TrailerDirectionPreview({
  source,
  workspace,
  draft,
  draftLoading,
}: {
  source: MediaAssetItem;
  workspace: DirectionPreviewWorkspace;
  draft: DirectionPreviewDraft | null | undefined;
  draftLoading: boolean;
}) {
  const sourceName = source.originalName ?? source.fileName;
  const draftTitle =
    draft?.title?.trim() || draft?.projectName || workspace.entityName;
  const notes = savedWorkspaceNotes(workspace);
  const hasSceneOutline = Boolean(draft?.scenes.length);
  const draftId = draft?.id ?? "00000000-0000-0000-0000-000000000000";
  const [localCutError, setLocalCutError] = useState<string | null>(null);
  const localCutQuery = trpc.creatorWorkspace.getLocalTrailerCut.useQuery(
    {
      workspaceId: workspace.id,
      sourceMediaAssetId: source.id,
      trailerProjectId: draftId,
    },
    { enabled: Boolean(draft), staleTime: 0 }
  );
  const createLocalCut =
    trpc.creatorWorkspace.createLocalTrailerCut.useMutation({
      onSuccess: async () => {
        setLocalCutError(null);
        await localCutQuery.refetch();
      },
      onError: error => setLocalCutError(error.message),
    });
  const localCut = localCutQuery.data?.cut ?? null;
  const localCutAvailable = localCutQuery.data?.available === true;

  return (
    <main className="cv-dna cv-page min-h-screen pb-24 pt-20 text-white">
      <section className="border-b border-white/10 bg-[radial-gradient(circle_at_85%_10%,rgba(0,217,255,0.15),transparent_30%),#0A0A0A]">
        <div className="mx-auto max-w-7xl px-5 py-10 sm:px-8 lg:px-12 lg:py-14">
          <Link
            href={workspaceEditPath(workspace.id)}
            className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-[0.16em] text-zinc-400 transition hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" /> Edit workspace context
          </Link>
          <div className="mt-8 grid gap-7 lg:grid-cols-[minmax(0,1.2fr)_minmax(280px,.8fr)] lg:items-end">
            <div>
              <p className="inline-flex items-center gap-2 rounded-sm border border-[var(--accent-cyan-border)] bg-[var(--accent-cyan-dim)] px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.18em] text-[var(--accent-cyan)]">
                <Eye className="h-3.5 w-3.5" /> Trailer direction preview
              </p>
              <h1 className="display-xl mt-5 max-w-4xl text-white">
                See the story
                <br />
                <span className="text-[var(--accent-cyan)]">
                  before anything is made.
                </span>
              </h1>
              <p className="mt-6 max-w-2xl text-base leading-relaxed text-zinc-300 sm:text-lg">
                This is a direction preview using your original source video. It
                keeps the saved source, workspace context, and trailer direction
                together for review.
              </p>
            </div>
            <aside className="rounded-lg border border-[var(--accent-cyan-border)] bg-[var(--accent-cyan-dim)] p-5 text-sm leading-relaxed text-[var(--accent-cyan)]">
              <p className="font-black">
                {localCut
                  ? "A local source-derived cut is ready for review."
                  : "Nothing has been made from this direction yet."}
              </p>
              <p className="mt-2 text-[var(--accent-cyan)]/80">
                {localCut
                  ? "It remains a local review cut; owner acceptance, rights, delivery, and publication are still separate decisions."
                  : "Review the direction first; output work needs its own authorization and proof."}
              </p>
            </aside>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-7xl space-y-7 px-5 py-8 sm:px-8 lg:px-12">
        <section className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(320px,.8fr)]">
          <div className="overflow-hidden cv-panel border border-white/10 bg-black shadow-[0_32px_100px_-48px_rgba(0,217,255,.22)]">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 px-5 py-4 sm:px-6">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.16em] text-zinc-500">
                  Saved source video
                </p>
                <p className="mt-1 text-lg font-black text-white">
                  {sourceName}
                </p>
              </div>
              <span className="inline-flex items-center gap-2 rounded-sm border border-[var(--accent-cyan-border)] bg-[var(--accent-cyan-dim)] px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.14em] text-[var(--accent-cyan)]">
                <CheckCircle2 className="h-3.5 w-3.5" /> Source saved
              </span>
            </div>
            <div className="relative aspect-video bg-black">
              {source.publicUrl ? (
                <video
                  src={source.publicUrl}
                  controls
                  muted
                  playsInline
                  preload="metadata"
                  className="h-full w-full object-contain"
                  aria-label="Saved creator source video"
                />
              ) : (
                <div className="flex h-full items-center justify-center px-8 text-center text-sm text-zinc-400">
                  The current source record has no playable URL.
                </div>
              )}
            </div>
            <div className="border-t border-white/10 px-5 py-4 text-sm leading-relaxed text-zinc-300 sm:px-6">
              <p className="font-black text-white">
                Your source video is saved.
              </p>
              <p className="mt-1">
                This preview uses the exact creator-owned media record selected
                in the saved workspace.
              </p>
            </div>
          </div>

          <aside className="cv-panel border border-white/10 bg-[var(--bg-surface)] p-5 sm:p-6">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[var(--accent-cyan)]">
              Saved direction
            </p>
            <h2 className="heading-xl mt-3 text-4xl text-white">
              {draftTitle}
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-zinc-400">
              {draftLoading ? (
                <span
                  className="cv-shimmer inline-block h-4 w-56"
                  aria-label="Reading the saved Trailer Maker direction"
                />
              ) : (
                "This direction remains a saved draft, not a finished trailer."
              )}
            </p>
            <div className="mt-6 space-y-3 border-t border-white/10 pt-5 text-sm">
              <div className="flex items-start justify-between gap-4">
                <span className="text-zinc-500">Draft state</span>
                <span className="font-black text-[var(--accent-cyan)]">
                  Saved draft
                </span>
              </div>
              {draft?.format && (
                <div className="flex items-start justify-between gap-4">
                  <span className="text-zinc-500">Selected aspect</span>
                  <span className="font-black text-white">{draft.format}</span>
                </div>
              )}
              {draft?.concept && (
                <div>
                  <span className="text-zinc-500">Saved structure</span>
                  <p className="mt-1.5 font-bold leading-relaxed text-zinc-100">
                    {draft.concept}
                  </p>
                </div>
              )}
              {draft?.scriptText && (
                <div>
                  <span className="text-zinc-500">Saved direction note</span>
                  <p className="mt-1.5 leading-relaxed text-zinc-200">
                    {draft.scriptText}
                  </p>
                </div>
              )}
            </div>
            <p className="mt-6 rounded-lg border border-[var(--accent-cyan-border)] bg-[var(--accent-cyan-dim)] px-4 py-3 text-sm font-bold leading-relaxed text-[var(--accent-cyan)]">
              Your trailer direction is saved.
            </p>
          </aside>
        </section>

        {hasSceneOutline && (
          <section className="cv-panel border border-white/10 bg-[var(--bg-surface)] p-5 sm:p-7">
            <div className="flex items-start gap-3">
              <Clapperboard className="mt-0.5 h-5 w-5 text-[var(--accent-cyan)]" />
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[var(--accent-cyan)]">
                  Saved scene outline
                </p>
                <h2 className="heading-xl mt-2 text-3xl text-white">
                  Direction already captured in the draft.
                </h2>
                <p className="mt-2 text-sm leading-relaxed text-zinc-400">
                  This is a reading of saved draft scenes only. No timing, shot,
                  or output has been invented for the preview.
                </p>
              </div>
            </div>
            <ol className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {draft?.scenes.map(scene => (
                <li
                  key={`${scene.sceneIndex}-${scene.role ?? "scene"}`}
                  className="rounded-lg border border-white/10 bg-[var(--bg-void)] p-4"
                >
                  <p className="text-[10px] font-black uppercase tracking-[0.15em] text-[var(--accent-cyan)]">
                    {directionSceneLabel(scene)}
                  </p>
                  {scene.overlayText && (
                    <p className="mt-2 text-sm font-bold leading-relaxed text-white">
                      {scene.overlayText}
                    </p>
                  )}
                  {scene.visualDescription && (
                    <p className="mt-2 text-xs leading-relaxed text-zinc-400">
                      {scene.visualDescription}
                    </p>
                  )}
                  {scene.durationSeconds !== null && (
                    <p className="mt-3 text-xs font-semibold text-zinc-500">
                      Saved duration: {scene.durationSeconds}s
                    </p>
                  )}
                </li>
              ))}
            </ol>
          </section>
        )}

        {notes.length > 0 && (
          <section className="cv-panel border border-white/10 bg-[var(--bg-surface)] p-5 sm:p-7">
            <div className="flex items-start gap-3">
              <FileText className="mt-0.5 h-5 w-5 text-[var(--accent-cyan)]" />
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[var(--accent-cyan)]">
                  Saved workspace context
                </p>
                <h2 className="heading-xl mt-2 text-3xl text-white">
                  The notes behind this direction.
                </h2>
              </div>
            </div>
            <div className="mt-6 grid gap-3 md:grid-cols-2">
              {notes.map(note => (
                <article
                  key={note.label}
                  className="rounded-lg border border-white/10 bg-[var(--bg-void)] p-4"
                >
                  <p className="text-[10px] font-black uppercase tracking-[0.15em] text-zinc-500">
                    {note.label}
                  </p>
                  <p className="mt-2 text-sm leading-relaxed text-zinc-200">
                    {note.value}
                  </p>
                </article>
              ))}
            </div>
          </section>
        )}

        <section className="overflow-hidden cv-panel border border-[var(--accent-cyan-border)] bg-[radial-gradient(circle_at_90%_0%,rgba(0,217,255,.10),transparent_35%),#1A1A1A] p-5 sm:p-7">
          <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-start">
            <div className="max-w-2xl">
              <p className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.16em] text-[var(--accent-cyan)]">
                <Scissors className="h-4 w-4" /> Local Trailer Cut
              </p>
              <h2 className="heading-xl mt-3 text-4xl text-white">
                {localCut
                  ? "Watch the saved source-derived cut."
                  : "Make one local review cut from this source."}
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-zinc-300">
                This uses the saved source video and saved Trailer Maker aspect
                and timing only. It creates a local MP4; it does not generate
                footage, call a provider, publish, sell, send, or deliver
                anything.
              </p>
            </div>
            {!localCut && localCutAvailable && (
              <button
                type="button"
                onClick={() => {
                  if (!draft) return;
                  setLocalCutError(null);
                  createLocalCut.mutate({
                    workspaceId: workspace.id,
                    sourceMediaAssetId: source.id,
                    trailerProjectId: draft.id,
                  });
                }}
                disabled={createLocalCut.isPending || !draft}
                className="cv-cta inline-flex min-h-[52px] shrink-0 items-center justify-center gap-2 px-5 disabled:cursor-not-allowed"
                style={{ borderRadius: 2 }}
              >
                {createLocalCut.isPending ? (
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                ) : (
                  <Scissors className="h-4 w-4" />
                )}
                {createLocalCut.isPending
                  ? "Creating local trailer cut…"
                  : "Create local trailer cut"}
              </button>
            )}
          </div>

          {localCut ? (
            <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(280px,.85fr)]">
              <div className="overflow-hidden rounded-lg border border-white/10 bg-black">
                <video
                  src={localCut.publicUrl}
                  controls
                  playsInline
                  preload="metadata"
                  className="aspect-video w-full object-contain"
                  aria-label="Saved local trailer cut"
                />
                <div className="border-t border-white/10 px-4 py-3 text-sm font-bold text-zinc-200">
                  {localCut.fileName}
                </div>
              </div>
              <aside className="rounded-lg border border-[var(--accent-cyan-border)] bg-[var(--accent-cyan-dim)] p-5 text-sm leading-relaxed text-[var(--text-primary)]">
                <p className="font-black">Saved local trailer cut</p>
                <p className="mt-2 text-[var(--accent-cyan)]/80">
                  {localCut.format} · {localCut.width}×{localCut.height} ·{" "}
                  {localCut.durationSeconds.toFixed(1)} seconds
                </p>
                <p className="mt-4">
                  This MP4 is saved as a creator-owned media asset and remains
                  pending owner review. It is not an accepted, commercial,
                  published, paid, or delivered outcome.
                </p>
              </aside>
            </div>
          ) : localCutQuery.isLoading ? (
            <p
              className="cv-shimmer mt-5 h-5 w-64"
              aria-label="Checking for a saved local cut"
            />
          ) : localCutQuery.isError ? (
            <p className="cv-state mt-5" role="alert">
              Local Trailer Cut availability could not be confirmed. No output
              has been created.
            </p>
          ) : !localCutAvailable ? (
            <p className="mt-5 rounded-lg border border-white/10 bg-[var(--bg-void)] px-4 py-3 text-sm leading-relaxed text-zinc-400">
              Local Trailer Cut is not enabled in this environment. No output
              has been created.
            </p>
          ) : null}

          {localCutError && (
            <p
              role="alert"
              className="mt-5 rounded-lg border border-[#FF3B3B]/30 bg-[#FF3B3B]/10 px-4 py-3 text-sm font-semibold leading-relaxed text-[#FF8B8B]"
            >
              {localCutError}
            </p>
          )}
        </section>

        <section className="grid gap-5 lg:grid-cols-[minmax(0,1.1fr)_minmax(320px,.9fr)]">
          <div className="cv-panel border border-[var(--accent-cyan-border)] bg-[radial-gradient(circle_at_top_right,rgba(0,217,255,.12),transparent_42%),#1A1A1A] p-6 sm:p-7">
            <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[var(--accent-cyan)]">
              Continue with the same source
            </p>
            <h2 className="heading-xl mt-3 text-4xl text-white">
              Keep the source context intact.
            </h2>
            <p className="mt-3 max-w-xl text-sm leading-relaxed text-zinc-300">
              These links reuse the exact saved source ID. Editing stays inside
              the existing workspace and Trailer Maker persistence paths.
            </p>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <Link
                href={creatorVideoStudioSourcePath(source.id)}
                className="cv-cta-outline inline-flex min-h-[52px] items-center justify-center gap-2 px-5"
                style={{ borderRadius: 2 }}
              >
                <ArrowLeft className="h-4 w-4" /> Back to Creator Video Studio
              </Link>
              <Link
                href={trailerMakerSourcePath(source.id)}
                className="cv-cta inline-flex min-h-[52px] items-center justify-center gap-2 px-5"
                style={{ borderRadius: 2 }}
              >
                <PlayCircle className="h-4 w-4" /> Open Trailer Maker
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
          <aside className="cv-panel border border-white/10 bg-[var(--bg-surface)] p-6">
            <p className="text-[10px] font-black uppercase tracking-[0.16em] text-zinc-500">
              Clear boundary
            </p>
            <div className="mt-5 space-y-4 text-sm leading-relaxed">
              <div className="flex gap-3 text-[var(--accent-cyan)]">
                <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0" />
                <p>
                  <span className="font-black">Completed now:</span> source
                  saved and direction saved.
                </p>
              </div>
              <div className="flex gap-3 text-zinc-400">
                <span className="mt-1 h-2.5 w-2.5 shrink-0 rounded-sm bg-zinc-600" />
                <p>
                  {localCut
                    ? "A local source-derived review cut is saved; no generated or commercial master has been created."
                    : "A generated or exported trailer has not been created."}
                </p>
              </div>
              <div className="flex gap-3 text-zinc-400">
                <span className="mt-1 h-2.5 w-2.5 shrink-0 rounded-sm bg-zinc-600" />
                <p>Nothing has been published, sold, or sent.</p>
              </div>
              <div className="flex gap-3 text-zinc-400">
                <span className="mt-1 h-2.5 w-2.5 shrink-0 rounded-sm bg-zinc-600" />
                <p>
                  There is no sales, payout, payment, or provider action here.
                </p>
              </div>
            </div>
          </aside>
        </section>
      </div>
    </main>
  );
}
