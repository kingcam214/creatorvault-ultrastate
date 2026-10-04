import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useSearch } from "wouter";
import {
  ArrowRight,
  CheckCircle2,
  Clapperboard,
  Compass,
  ImagePlus,
  Layers3,
  PlayCircle,
  Save,
  Sparkles,
} from "lucide-react";
import MediaPicker, { type MediaAssetItem } from "@/components/MediaPicker";
import {
  TrailerDirectionPreview,
  directionPreviewPath,
} from "@/components/TrailerDirectionPreview";
import { trpc } from "@/lib/trpc";

type WorkspaceForm = {
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
  visualIdentityAssetId: string | null;
};

type PickerIntent = "source" | "identity" | null;

const emptyWorkspace = (): WorkspaceForm => ({
  entityName: "",
  targetAudience: "",
  primaryPromise: "",
  lifeOutcome: "",
  reputation: "",
  firstOffer: "",
  currentMotivation: "",
  visualDirection: "",
  shortFormIdea: "",
  longFormStoryIdea: "",
  communityRole: "",
  storyManifesto: "",
  futureMove: "",
  visualIdentityAssetId: null,
});

function isVideo(asset: MediaAssetItem): boolean {
  return (
    asset.assetType === "video" || Boolean(asset.mimeType?.startsWith("video/"))
  );
}

function isCreatorVaultSource(asset: MediaAssetItem): boolean {
  const sourceUrl = String(asset.publicUrl ?? asset.storagePath ?? "").trim();
  const isHosted =
    /^(?:https:\/\/creatorvault\.live\/(?:uploads|videos)\/|\/(?:uploads|videos)\/)/i.test(
      sourceUrl
    );
  const reference = [
    asset.fileName,
    asset.originalName,
    asset.sourceType,
    asset.classification,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  return (
    isVideo(asset) &&
    isHosted &&
    asset.sourceType === "upload" &&
    Number(asset.duration ?? 0) > 0 &&
    Number(asset.width ?? 0) > 0 &&
    Number(asset.height ?? 0) > 0 &&
    !reference.includes("kingcam")
  );
}

function isCreatorVaultVisualIdentity(asset: MediaAssetItem): boolean {
  const sourceUrl = String(asset.publicUrl ?? asset.storagePath ?? "").trim();
  const isHosted =
    /^(?:https:\/\/creatorvault\.live\/(?:uploads|videos)\/|\/(?:uploads|videos)\/)/i.test(
      sourceUrl
    );
  const reference = [asset.fileName, asset.originalName, asset.classification]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  return isHosted && !reference.includes("kingcam") && Boolean(asset.publicUrl);
}

function trailerMakerPath(sourceAssetId: string): string {
  return `/trailer-maker?sourceAssetId=${encodeURIComponent(sourceAssetId)}`;
}

function isDirectionPreview(search: string): boolean {
  return new URLSearchParams(search).get("view") === "direction";
}

function prettyDate(value: string | Date | null | undefined): string {
  if (!value) return "Saved draft";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "Saved draft"
    : `Saved ${date.toLocaleDateString()}`;
}

function SectionHeader({
  eyebrow,
  title,
  body,
}: {
  eyebrow: string;
  title: string;
  body: string;
}) {
  return (
    <div className="max-w-3xl">
      <p className="cv-eyebrow text-[var(--accent-cyan)]">{eyebrow}</p>
      <h2 className="heading-xl mt-3 text-4xl text-white sm:text-5xl">
        {title}
      </h2>
      <p className="body-md mt-3 text-[var(--text-secondary)] sm:text-base">
        {body}
      </p>
    </div>
  );
}

function TextField({
  label,
  value,
  onChange,
  placeholder,
  multiline = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  multiline?: boolean;
}) {
  return (
    <label className="block">
      <span className="cv-eyebrow text-[var(--text-secondary)]">{label}</span>
      {multiline ? (
        <textarea
          value={value}
          onChange={event => onChange(event.target.value)}
          placeholder={placeholder}
          rows={4}
          className="cv-input mt-2 w-full resize-y leading-relaxed"
        />
      ) : (
        <input
          value={value}
          onChange={event => onChange(event.target.value)}
          placeholder={placeholder}
          className="cv-input mt-2 w-full"
        />
      )}
    </label>
  );
}

export default function CreatorWorkspace() {
  const [, setLocation] = useLocation();
  const search = useSearch();
  const draftId = new URLSearchParams(search).get("draft");
  const showingDirectionPreview = isDirectionPreview(search);
  const [form, setForm] = useState<WorkspaceForm>(emptyWorkspace);
  const [sourceMediaAssetId, setSourceMediaAssetId] = useState<string | null>(
    null
  );
  const [workspaceId, setWorkspaceId] = useState<string | null>(draftId);
  const [pickerIntent, setPickerIntent] = useState<PickerIntent>(null);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const hydratedWorkspace = useRef<string | null>(null);

  const mediaQuery = trpc.mediaAssets.list.useQuery(
    { filter: "all", limit: 120 },
    { staleTime: 30_000 }
  );
  const workspaceQuery = trpc.creatorWorkspace.get.useQuery(
    { workspaceId: draftId ?? "00000000-0000-0000-0000-000000000000" },
    { enabled: Boolean(draftId), staleTime: 0 }
  );
  const workspacesQuery = trpc.creatorWorkspace.list.useQuery(
    { limit: 12 },
    { staleTime: 15_000 }
  );
  const trailerProjectsQuery = trpc.mediaAssets.listTrailerProjects.useQuery(
    { limit: 20 },
    { staleTime: 15_000 }
  );
  const saveWorkspace = trpc.creatorWorkspace.save.useMutation({
    onSuccess: async result => {
      setWorkspaceId(result.workspaceId);
      setSaveMessage(
        result.created
          ? "Workspace draft saved. Continue from this record whenever you return."
          : "Workspace draft updated."
      );
      await Promise.all([
        workspacesQuery.refetch(),
        trailerProjectsQuery.refetch(),
      ]);
    },
    onError: error => setSaveMessage(error.message),
  });

  const media = useMemo(
    () =>
      (Array.isArray(mediaQuery.data)
        ? mediaQuery.data
        : []) as MediaAssetItem[],
    [mediaQuery.data]
  );
  const sourceAsset = useMemo(
    () => media.find(asset => asset.id === sourceMediaAssetId) ?? null,
    [media, sourceMediaAssetId]
  );
  const visualIdentityAsset = useMemo(
    () => media.find(asset => asset.id === form.visualIdentityAssetId) ?? null,
    [media, form.visualIdentityAssetId]
  );
  const trailerDraftForSource = useMemo(
    () =>
      (trailerProjectsQuery.data ?? []).find(
        project =>
          project.sourceAssetId === sourceMediaAssetId &&
          project.projectType !== "creator_workspace" &&
          project.projectType !== "local_trailer_cut"
      ) ?? null,
    [trailerProjectsQuery.data, sourceMediaAssetId]
  );
  const trailerDirectionQuery = trpc.mediaAssets.getTrailerProject.useQuery(
    {
      trailerProjectId:
        trailerDraftForSource?.id ?? "00000000-0000-0000-0000-000000000000",
    },
    { enabled: Boolean(trailerDraftForSource), staleTime: 0 }
  );

  useEffect(() => {
    const workspace = workspaceQuery.data;
    if (!workspace || hydratedWorkspace.current === workspace.id) return;
    hydratedWorkspace.current = workspace.id;
    setWorkspaceId(workspace.id);
    setSourceMediaAssetId(workspace.sourceMediaAssetId);
    setForm({
      entityName: workspace.entityName,
      targetAudience: workspace.targetAudience,
      primaryPromise: workspace.primaryPromise,
      lifeOutcome: workspace.lifeOutcome,
      reputation: workspace.reputation,
      firstOffer: workspace.firstOffer,
      currentMotivation: workspace.currentMotivation,
      visualDirection: workspace.visualDirection,
      shortFormIdea: workspace.shortFormIdea,
      longFormStoryIdea: workspace.longFormStoryIdea,
      communityRole: workspace.communityRole,
      storyManifesto: workspace.storyManifesto,
      futureMove: workspace.futureMove,
      visualIdentityAssetId: workspace.visualIdentityAssetId,
    });
  }, [workspaceQuery.data]);

  const update = <K extends keyof WorkspaceForm>(
    key: K,
    value: WorkspaceForm[K]
  ) => {
    setForm(current => ({ ...current, [key]: value }));
    setSaveMessage(null);
  };

  const completedFields = [
    sourceMediaAssetId,
    form.entityName,
    form.targetAudience,
    form.primaryPromise,
    form.firstOffer,
    form.shortFormIdea,
    form.longFormStoryIdea,
    form.storyManifesto,
  ].filter(Boolean).length;
  const completion = Math.round((completedFields / 8) * 100);
  const canSave = Boolean(
    sourceMediaAssetId &&
    form.entityName.trim() &&
    form.targetAudience.trim() &&
    form.primaryPromise.trim()
  );

  const save = () => {
    if (!sourceMediaAssetId || !canSave) {
      setSaveMessage(
        "Add a saved source video, entity name, audience, and primary promise before saving."
      );
      return;
    }
    saveWorkspace.mutate({
      workspaceId: workspaceId ?? undefined,
      sourceMediaAssetId,
      ...form,
    });
  };

  const selectedForPicker =
    pickerIntent === "source" ? sourceMediaAssetId : form.visualIdentityAssetId;
  const pickerTitle =
    pickerIntent === "source"
      ? "Choose Your Source Video"
      : "Choose a Visual Identity Asset";
  const pickerEligibility =
    pickerIntent === "source"
      ? isCreatorVaultSource
      : isCreatorVaultVisualIdentity;

  if (
    showingDirectionPreview &&
    workspaceId &&
    sourceAsset &&
    trailerDraftForSource
  ) {
    return (
      <TrailerDirectionPreview
        source={sourceAsset}
        workspace={{
          id: workspaceId,
          entityName: form.entityName,
          targetAudience: form.targetAudience,
          primaryPromise: form.primaryPromise,
          lifeOutcome: form.lifeOutcome,
          reputation: form.reputation,
          firstOffer: form.firstOffer,
          currentMotivation: form.currentMotivation,
          visualDirection: form.visualDirection,
          shortFormIdea: form.shortFormIdea,
          longFormStoryIdea: form.longFormStoryIdea,
          communityRole: form.communityRole,
          storyManifesto: form.storyManifesto,
          futureMove: form.futureMove,
        }}
        draft={trailerDirectionQuery.data}
        draftLoading={trailerDirectionQuery.isLoading}
      />
    );
  }

  return (
    <main className="cv-dna cv-page min-h-screen pb-24 pt-20 text-white">
      <section className="border-b border-white/10 bg-[radial-gradient(circle_at_84%_10%,rgba(0,217,255,0.14),transparent_30%),#0A0A0A]">
        <div className="mx-auto max-w-7xl px-5 py-12 sm:px-8 lg:px-12 lg:py-16">
          <div className="grid gap-8 lg:grid-cols-[1.25fr_.75fr] lg:items-end">
            <div>
              <p className="cv-eyebrow flex items-center gap-2 text-[var(--accent-cyan)]">
                <Compass className="h-3.5 w-3.5" /> Creator workspace
              </p>
              <h1 className="display-xl mt-5 max-w-4xl text-white">
                Build the system
                <br />
                <span className="text-[var(--accent-cyan)]">
                  behind the moment.
                </span>
              </h1>
              <p className="body-lg mt-6 max-w-2xl text-[var(--text-secondary)]">
                Keep your source, offer, audience, story direction, and next
                delivery move together in one creator-owned workspace draft.
                This is planning context—not a published offer, finished video,
                or earnings claim.
              </p>
            </div>
            <aside className="cv-panel p-6" style={{ borderRadius: 8 }}>
              <div className="flex items-end justify-between gap-4">
                <span className="cv-eyebrow text-[var(--text-muted)]">
                  Workspace readiness
                </span>
                <span className="display-lg text-[var(--accent-cyan)]">
                  {completion}%
                </span>
              </div>
              <div className="mt-4 h-1.5 overflow-hidden bg-[var(--bg-elevated)]">
                <div
                  className="h-full bg-[var(--accent-cyan)] transition-all"
                  style={{ width: `${completion}%` }}
                />
              </div>
              <p className="body-md mt-4 text-[var(--text-secondary)]">
                {sourceAsset
                  ? `Source selected: ${sourceAsset.originalName ?? sourceAsset.fileName}`
                  : "Choose one owned source video to ground this workspace."}
              </p>
              <button
                type="button"
                onClick={save}
                disabled={!canSave || saveWorkspace.isPending}
                className="cv-cta mt-5 w-full"
                style={{ minHeight: 52, borderRadius: 2 }}
              >
                <Save className="h-4 w-4" />
                {saveWorkspace.isPending
                  ? "Saving workspace…"
                  : workspaceId
                    ? "Update workspace draft"
                    : "Save workspace draft"}
              </button>
              {saveMessage && (
                <p role="status" className="cv-state mt-3">
                  {saveMessage}
                </p>
              )}
            </aside>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-7xl space-y-16 px-5 py-10 sm:px-8 lg:px-12">
        <section>
          <SectionHeader
            eyebrow="Your foundation"
            title="Name the thing you are building."
            body="These fields persist in a creator-owned workspace draft. They are planning inputs only and never create a listing, a payment, a social post, or a finished result."
          />
          <div className="mt-7 grid gap-5 lg:grid-cols-2">
            <TextField
              label="Project or entity name"
              value={form.entityName}
              onChange={value => update("entityName", value)}
              placeholder="What should this workspace be called?"
            />
            <TextField
              label="Target audience"
              value={form.targetAudience}
              onChange={value => update("targetAudience", value)}
              placeholder="Who is this for, in plain language?"
            />
            <TextField
              label="Primary promise"
              value={form.primaryPromise}
              onChange={value => update("primaryPromise", value)}
              placeholder="What useful change are you promising?"
            />
            <TextField
              label="Life outcome"
              value={form.lifeOutcome}
              onChange={value => update("lifeOutcome", value)}
              placeholder="What becomes easier or possible for them?"
            />
            <TextField
              label="Reputation to build"
              value={form.reputation}
              onChange={value => update("reputation", value)}
              placeholder="What should people trust you for?"
            />
            <TextField
              label="First offer"
              value={form.firstOffer}
              onChange={value => update("firstOffer", value)}
              placeholder="Describe the offer without claiming it is live."
            />
            <TextField
              label="What should move first"
              value={form.currentMotivation}
              onChange={value => update("currentMotivation", value)}
              placeholder="The immediate decision or action you need to move."
              multiline
            />
            <TextField
              label="Future move"
              value={form.futureMove}
              onChange={value => update("futureMove", value)}
              placeholder="What does a good next step unlock?"
              multiline
            />
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-[1.1fr_.9fr]">
          <article className="cv-panel p-6 sm:p-8" style={{ borderRadius: 8 }}>
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="cv-eyebrow text-[var(--accent-cyan)]">
                  Creation media
                </p>
                <h2 className="heading-xl mt-2 text-4xl">
                  Ground the workspace in a source.
                </h2>
              </div>
              <Clapperboard className="h-7 w-7 text-[var(--accent-cyan)]" />
            </div>
            {sourceAsset?.publicUrl ? (
              <div
                className="mt-6 overflow-hidden border border-white/10 bg-[#0A0A0A]"
                style={{ borderRadius: 8 }}
              >
                <video
                  src={sourceAsset.publicUrl}
                  controls
                  muted
                  playsInline
                  preload="metadata"
                  className="aspect-video w-full object-contain"
                />
                <div className="body-md border-t border-white/10 px-4 py-3 text-[var(--text-secondary)]">
                  {sourceAsset.originalName ?? sourceAsset.fileName}
                </div>
              </div>
            ) : mediaQuery.isLoading ? (
              <div
                className="cv-shimmer mt-6 aspect-video"
                aria-label="Reading available source media"
              />
            ) : mediaQuery.isError ? (
              <div className="cv-state mt-6" role="alert">
                CreatorVault could not read available source media. No
                substitute source is shown.
              </div>
            ) : (
              <div className="cv-state mt-6 text-center">
                <Clapperboard className="mx-auto h-9 w-9 text-[var(--text-muted)]" />
                <p className="heading-xl mt-3 text-3xl">
                  No source video selected.
                </p>
                <p className="body-md mx-auto mt-2 max-w-md text-[var(--text-secondary)]">
                  Choose a ready CreatorVault upload you own. The workspace will
                  carry its exact media asset ID into Trailer Maker.
                </p>
              </div>
            )}
            <button
              type="button"
              onClick={() => setPickerIntent("source")}
              className="cv-cta-outline mt-5"
              style={{ minHeight: 52, borderRadius: 2 }}
            >
              <PlayCircle className="h-4 w-4" />{" "}
              {sourceAsset ? "Change source video" : "Choose source video"}
            </button>
          </article>

          <article className="cv-panel p-6 sm:p-8" style={{ borderRadius: 8 }}>
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="cv-eyebrow text-[var(--accent-cyan)]">
                  Visual identity
                </p>
                <h2 className="heading-xl mt-2 text-4xl">
                  Set the creative point of view.
                </h2>
              </div>
              <ImagePlus className="h-7 w-7 text-[var(--accent-cyan)]" />
            </div>
            {visualIdentityAsset?.publicUrl ? (
              <div
                className="mt-6 overflow-hidden border border-white/10 bg-[#0A0A0A]"
                style={{ borderRadius: 8 }}
              >
                <img
                  src={
                    visualIdentityAsset.thumbnailUrl ??
                    visualIdentityAsset.publicUrl
                  }
                  alt="Selected visual identity"
                  className="aspect-video w-full object-cover"
                />
                <div className="body-md border-t border-white/10 px-4 py-3 text-[var(--text-secondary)]">
                  {visualIdentityAsset.originalName ??
                    visualIdentityAsset.fileName}
                </div>
              </div>
            ) : (
              <div className="cv-state mt-6 text-center">
                <Layers3 className="mx-auto h-9 w-9 text-[var(--text-muted)]" />
                <p className="heading-xl mt-3 text-3xl">
                  Optional identity reference.
                </p>
                <p className="body-md mx-auto mt-2 max-w-md text-[var(--text-secondary)]">
                  Choose an owned ready asset from your existing media library,
                  or describe the direction below. This does not create a clone
                  or provider job.
                </p>
              </div>
            )}
            <button
              type="button"
              onClick={() => setPickerIntent("identity")}
              className="cv-cta-outline mt-5"
              style={{ minHeight: 52, borderRadius: 2 }}
            >
              <ImagePlus className="h-4 w-4" />{" "}
              {visualIdentityAsset
                ? "Change identity asset"
                : "Choose identity asset"}
            </button>
            <div className="mt-5">
              <TextField
                label="Creative direction"
                value={form.visualDirection}
                onChange={value => update("visualDirection", value)}
                placeholder="Color, emotion, references, texture, pace, or visual rules."
                multiline
              />
            </div>
          </article>
        </section>

        <section>
          <SectionHeader
            eyebrow="Story & content"
            title="Make the narrative useful before making it loud."
            body="Ideas stay as editable creator context. Nothing in this section invokes a provider, schedules a post, sends a message, or claims a generated result."
          />
          <div className="mt-7 grid gap-5 lg:grid-cols-2">
            <TextField
              label="Short-form content idea"
              value={form.shortFormIdea}
              onChange={value => update("shortFormIdea", value)}
              placeholder="A scroll-stopping idea grounded in the selected source."
              multiline
            />
            <TextField
              label="Long-form story or series"
              value={form.longFormStoryIdea}
              onChange={value => update("longFormStoryIdea", value)}
              placeholder="A longer story, episode, or educational arc."
              multiline
            />
            <TextField
              label="Community role"
              value={form.communityRole}
              onChange={value => update("communityRole", value)}
              placeholder="What does this community help people do together?"
              multiline
            />
            <TextField
              label="Story manifesto"
              value={form.storyManifesto}
              onChange={value => update("storyManifesto", value)}
              placeholder="The point of view you will return to across the work."
              multiline
            />
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-[1.1fr_.9fr]">
          <article
            className="cv-panel relative overflow-hidden p-6 sm:p-8"
            style={{ borderRadius: 8 }}
          >
            <div className="absolute inset-x-0 top-0 h-px bg-[var(--accent-cyan)]" />
            <p className="cv-eyebrow text-[var(--accent-cyan)]">
              The next move
            </p>
            <h2 className="heading-xl mt-2 text-4xl">
              Move the selected source into delivery.
            </h2>
            <p className="body-md mt-3 max-w-xl text-[var(--text-secondary)]">
              Trailer Maker is the existing connected destination. It receives
              the same saved source asset ID and separately creates its own
              Trailer Maker draft. It does not render, publish, sell, or deliver
              a finished trailer.
            </p>
            {workspaceId && sourceMediaAssetId ? (
              <Link
                href={trailerMakerPath(sourceMediaAssetId)}
                className="cv-cta mt-6 inline-flex"
                style={{ minHeight: 52, borderRadius: 2 }}
              >
                <Sparkles className="h-4 w-4" /> Start delivery in Trailer Maker{" "}
                <ArrowRight className="h-4 w-4" />
              </Link>
            ) : (
              <button
                type="button"
                onClick={save}
                disabled={!canSave || saveWorkspace.isPending}
                className="cv-ghost mt-6"
                style={{ minHeight: 52, borderRadius: 2 }}
              >
                <Save className="h-4 w-4" /> Save workspace to unlock delivery
              </button>
            )}
            {trailerDraftForSource && (
              <div className="mt-4 flex flex-col items-start gap-3">
                <p className="cv-state flex items-center gap-2 text-[#00FF94]">
                  <CheckCircle2 className="h-4 w-4" /> A Trailer Maker draft
                  already exists for this source.
                </p>
                {workspaceId && (
                  <Link
                    href={directionPreviewPath(workspaceId)}
                    className="cv-cta-outline inline-flex"
                    style={{ minHeight: 52, borderRadius: 2 }}
                  >
                    <PlayCircle className="h-4 w-4" /> Review trailer direction{" "}
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                )}
              </div>
            )}
          </article>

          <aside className="cv-panel p-6 sm:p-8" style={{ borderRadius: 8 }}>
            <p className="cv-eyebrow text-[var(--text-muted)]">
              Progress review
            </p>
            <div className="mt-5 space-y-4">
              {[
                [Boolean(sourceAsset), "Owned source video selected"],
                [Boolean(workspaceId), "Workspace context saved"],
                [Boolean(trailerDraftForSource), "Trailer Maker draft exists"],
              ].map(([complete, label]) => (
                <div key={String(label)} className="flex items-center gap-3">
                  <span
                    className={`grid h-6 w-6 place-items-center border ${complete ? "border-[var(--accent-cyan-border)] bg-[var(--accent-cyan-dim)] text-[var(--accent-cyan)]" : "border-white/15 text-[var(--text-muted)]"}`}
                    style={{ borderRadius: 2 }}
                  >
                    {complete ? <CheckCircle2 className="h-4 w-4" /> : "·"}
                  </span>
                  <span className="body-md text-[var(--text-secondary)]">
                    {String(label)}
                  </span>
                </div>
              ))}
            </div>
            <p className="body-md mt-6 border-t border-white/10 pt-5 text-[var(--text-muted)]">
              This workspace records context and draft state only. It is not a
              rights decision, accepted creator result, live marketplace
              listing, payment, or launch approval.
            </p>
          </aside>
        </section>

        <section className="border-t border-white/10 pt-12">
          <SectionHeader
            eyebrow="Saved work"
            title="Reopen the context you already built."
            body="These are your existing creator workspace drafts stored in the current Trailer Maker project table under the dedicated creator_workspace project type."
          />
          <div className="mt-7 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {workspacesQuery.isLoading &&
              Array.from({ length: 3 }).map((_, index) => (
                <div
                  key={index}
                  className="cv-panel cv-shimmer min-h-48"
                  style={{ borderRadius: 8 }}
                  aria-label="Reading saved workspaces"
                />
              ))}
            {workspacesQuery.isError && (
              <div
                className="cv-state md:col-span-2 xl:col-span-3"
                role="alert"
              >
                Saved workspace drafts could not be read. No draft state has
                been substituted.
              </div>
            )}
            {!workspacesQuery.isLoading &&
              !workspacesQuery.isError &&
              (workspacesQuery.data ?? []).map(workspace => (
                <button
                  key={workspace.id}
                  type="button"
                  onClick={() =>
                    setLocation(
                      `/creator/workspace?draft=${encodeURIComponent(workspace.id)}`
                    )
                  }
                  className="cv-panel p-5 text-left"
                  style={{ borderRadius: 8 }}
                >
                  <p className="cv-eyebrow text-[var(--accent-cyan)]">
                    {prettyDate(workspace.updatedAt)}
                  </p>
                  <h3 className="heading-xl mt-3 text-3xl text-white">
                    {workspace.entityName}
                  </h3>
                  <p className="body-md mt-2 line-clamp-3 text-[var(--text-secondary)]">
                    {workspace.primaryPromise}
                  </p>
                  <span className="badge-text mt-5 inline-flex items-center text-[var(--accent-cyan)]">
                    OPEN WORKSPACE <ArrowRight className="ml-2 h-3.5 w-3.5" />
                  </span>
                </button>
              ))}
            {!workspacesQuery.isLoading &&
              !workspacesQuery.isError &&
              (workspacesQuery.data ?? []).length === 0 && (
                <div className="cv-state md:col-span-2 xl:col-span-3">
                  Your saved creator workspaces will appear here after you save
                  the first one.
                </div>
              )}
          </div>
        </section>
      </div>

      <MediaPicker
        open={pickerIntent !== null}
        onClose={() => setPickerIntent(null)}
        onConfirm={assets => {
          const asset = assets[0];
          if (!asset) return;
          if (pickerIntent === "source") setSourceMediaAssetId(asset.id);
          if (pickerIntent === "identity")
            update("visualIdentityAssetId", asset.id);
          setPickerIntent(null);
          setSaveMessage(null);
        }}
        mode="single"
        initialSelectedIds={selectedForPicker ? [selectedForPicker] : []}
        title={pickerTitle}
        subtitle={
          pickerIntent === "source"
            ? "Only ready CreatorVault uploads you own are offered as a source video."
            : "Choose an owned ready media asset to anchor the visual identity."
        }
        confirmLabel={
          pickerIntent === "source" ? "Use source video" : "Use identity asset"
        }
        assetEligibility={pickerEligibility}
      />
    </main>
  );
}

export { emptyWorkspace, isCreatorVaultSource, trailerMakerPath };
