import React, {
  type ChangeEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Link, useLocation, useSearch } from "wouter";
import {
  ArrowLeft,
  Check,
  ChevronRight,
  Download,
  FileVideo,
  Film,
  Loader2,
  Play,
  ShieldAlert,
  ShieldCheck,
  Upload,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import MediaPicker, { type MediaAssetItem } from "@/components/MediaPicker";
import BodyDirectedDirector from "@/components/body-cinema/BodyDirectedDirector";
import {
  parseDirectVideoUploadResponse,
  type DirectVideoUploadResponse,
} from "@/components/CreatorSourceVideoIntake";
import {
  BODY_CINEMA_CREATOR_ASSERTION_VERSION,
  BODY_CINEMA_CROWN_REVEAL_TREATMENT_VERSION,
  type BodyCinemaCreatorRightsInput,
  type BodyCinemaCrownRevealTreatment,
  type BodyCinemaLifecycleRecord,
  type BodyCinemaLifecycleState,
} from "@shared/bodyCinemaCandidateLifecycle";

const LIFECYCLE_LIMIT = 20;

type IntendedUse = BodyCinemaCreatorRightsInput["intendedUse"];
type Emphasis = BodyCinemaCrownRevealTreatment["bodyFaceEmphasis"][number];

type TreatmentDraft = {
  feeling: string;
  opening: string;
  hook: string;
  sourceMomentStart: string;
  sourceMomentEnd: string;
  sourceMomentRationale: string;
  cropLeft: string;
  cropTop: string;
  cropWidth: string;
  cropHeight: string;
  naturalRhythm: string;
  colorLight: string;
  typography: string;
  ending: string;
  rejectionOne: string;
  rejectionTwo: string;
  rejectionThree: string;
  outputWidth: string;
  outputHeight: string;
  outputDuration: string;
};

const EMPTY_TREATMENT: TreatmentDraft = {
  feeling: "",
  opening: "",
  hook: "",
  sourceMomentStart: "",
  sourceMomentEnd: "",
  sourceMomentRationale: "",
  cropLeft: "0",
  cropTop: "0",
  cropWidth: "1",
  cropHeight: "1",
  naturalRhythm: "",
  colorLight: "",
  typography: "",
  ending: "",
  rejectionOne: "",
  rejectionTwo: "",
  rejectionThree: "",
  outputWidth: "",
  outputHeight: "",
  outputDuration: "",
};

const EMPHASIS_OPTIONS: Array<{ value: Emphasis; label: string }> = [
  { value: "face", label: "Face" },
  { value: "shoulders", label: "Shoulders" },
  { value: "torso", label: "Torso" },
  { value: "hips", label: "Hips" },
  { value: "legs", label: "Legs" },
  { value: "full_body", label: "Full body" },
];

const LIFECYCLE_COPY: Record<
  BodyCinemaLifecycleState,
  {
    eyebrow: string;
    title: string;
    detail: string;
    tone: "cyan" | "gold" | "danger" | "success";
  }
> = {
  qualified: {
    eyebrow: "Source qualified",
    title: "Freeze the Crown Reveal plan.",
    detail:
      "The server qualified the exact source identity and bytes. A treatment is still a plan, not an edit or output.",
    tone: "cyan",
  },
  frozen: {
    eyebrow: "Plan frozen",
    title: "One immutable treatment is saved.",
    detail:
      "The selected source, source hash, creator assertion, and treatment identity cannot be changed in this lifecycle.",
    tone: "gold",
  },
  awaiting_candidate: {
    eyebrow: "One candidate slot reserved",
    title: "Awaiting separately authorized candidate attachment.",
    detail:
      "No candidate can be attached from this screen. Attachment remains a future, separately authorized boundary.",
    tone: "gold",
  },
  candidate_attached: {
    eyebrow: "Candidate attached",
    title: "Candidate evidence is recorded.",
    detail:
      "Begin review only when protected source and candidate playback are available from the server.",
    tone: "cyan",
  },
  review_in_progress: {
    eyebrow: "Creator review",
    title: "Watch the exact attached candidate before deciding.",
    detail:
      "Your decision must name this exact review and candidate hash. No new source or candidate is created here.",
    tone: "cyan",
  },
  rejected: {
    eyebrow: "Candidate rejected",
    title: "Private evidence is retained; no master exists.",
    detail:
      "A rejected candidate cannot be downloaded, handed off, published, or replaced silently.",
    tone: "danger",
  },
  accepted: {
    eyebrow: "Creator accepted master",
    title: "The exact reviewed candidate is the accepted master.",
    detail:
      "Creator acceptance is not owner marketing approval. Only a planning handoff may follow.",
    tone: "success",
  },
  handoff_ready: {
    eyebrow: "Trailer Maker planning draft",
    title: "Accepted-master planning handoff is saved.",
    detail:
      "This records planning only: no trailer render, export, publication, checkout, share, or provider action is authorized.",
    tone: "success",
  },
};

export function isBodyCinemaSourceCandidate(asset: MediaAssetItem): boolean {
  const isVideo =
    asset.assetType === "video" ||
    Boolean(asset.mimeType?.startsWith("video/"));
  return isVideo && String(asset.status || "ready").toLowerCase() === "ready";
}

function shortHash(hash: string | null | undefined): string {
  if (!hash) return "Unavailable";
  return `${hash.slice(0, 12)}…${hash.slice(-8)}`;
}

function formatSeconds(value: number | null | undefined): string {
  if (typeof value !== "number" || !Number.isFinite(value))
    return "Unavailable";
  return `${value.toFixed(value < 10 ? 1 : 0)}s`;
}

function readUploadError(payload: unknown, fallback: string): string {
  if (
    typeof payload !== "object" ||
    payload === null ||
    Array.isArray(payload)
  ) {
    return fallback;
  }
  const message = (payload as Record<string, unknown>).error;
  return typeof message === "string" && message.trim() ? message : fallback;
}

async function uploadSourceVideo(
  file: File,
  onProgress: (progress: number) => void
): Promise<DirectVideoUploadResponse> {
  const form = new FormData();
  form.append("file", file);

  return new Promise((resolve, reject) => {
    const request = new XMLHttpRequest();
    request.upload.onprogress = event => {
      if (event.lengthComputable && event.total > 0) {
        onProgress(Math.round((event.loaded / event.total) * 100));
      }
    };
    request.onload = () => {
      let payload: unknown = null;
      try {
        payload = JSON.parse(request.responseText) as unknown;
      } catch {
        reject(
          new Error(
            `CreatorVault could not read the upload response (${request.status}).`
          )
        );
        return;
      }
      if (request.status < 200 || request.status >= 300) {
        reject(
          new Error(
            readUploadError(
              payload,
              `Source upload stopped (${request.status}).`
            )
          )
        );
        return;
      }
      try {
        resolve(parseDirectVideoUploadResponse(payload));
      } catch (error) {
        reject(
          error instanceof Error
            ? error
            : new Error("CreatorVault could not save this source video.")
        );
      }
    };
    request.onerror = () =>
      reject(
        new Error(
          "CreatorVault could not reach the saved-source upload service."
        )
      );
    request.open("POST", "/api/video/upload/direct");
    request.withCredentials = true;
    request.send(form);
  });
}

function numericValue(value: string): number | null {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function makeTreatment(
  draft: TreatmentDraft,
  emphasis: Emphasis[],
  verifiedDuration: number | null
): BodyCinemaCrownRevealTreatment | string {
  const startSeconds = numericValue(draft.sourceMomentStart);
  const endSeconds = numericValue(draft.sourceMomentEnd);
  const left = numericValue(draft.cropLeft);
  const top = numericValue(draft.cropTop);
  const width = numericValue(draft.cropWidth);
  const height = numericValue(draft.cropHeight);
  const outputWidth = numericValue(draft.outputWidth);
  const outputHeight = numericValue(draft.outputHeight);
  const outputDuration = numericValue(draft.outputDuration);

  if (!verifiedDuration || verifiedDuration <= 0) {
    return "The server-qualified source duration is required before a moment can be frozen.";
  }
  if (
    startSeconds === null ||
    endSeconds === null ||
    startSeconds < 0 ||
    endSeconds <= startSeconds ||
    endSeconds > verifiedDuration
  ) {
    return `Select a source moment within the verified ${formatSeconds(verifiedDuration)} duration.`;
  }
  if (
    left === null ||
    top === null ||
    width === null ||
    height === null ||
    left < 0 ||
    top < 0 ||
    width <= 0 ||
    height <= 0 ||
    left + width > 1 ||
    top + height > 1
  ) {
    return "Crop bounds must stay within the 0–1 source frame.";
  }
  if (!emphasis.length)
    return "Choose at least one creator-approved body or face emphasis.";
  if (
    outputWidth === null ||
    outputHeight === null ||
    !Number.isInteger(outputWidth) ||
    !Number.isInteger(outputHeight) ||
    !outputDuration ||
    outputDuration <= 0
  ) {
    return "Enter a proposed source-supported output width, height, and duration. This is a plan only; it does not render media.";
  }

  return {
    version: BODY_CINEMA_CROWN_REVEAL_TREATMENT_VERSION,
    treatmentName: "Crown Reveal",
    feeling: draft.feeling,
    opening: draft.opening,
    hook: draft.hook,
    sourceMoment: {
      startSeconds,
      endSeconds,
      rationale: draft.sourceMomentRationale,
    },
    bodyFaceEmphasis: emphasis,
    cropBoundaries: { left, top, width, height },
    naturalRhythm: draft.naturalRhythm,
    originalAudio: "preserve_original_audio",
    colorLight: draft.colorLight,
    typography: draft.typography,
    ending: draft.ending,
    rejectionConditions: [
      draft.rejectionOne,
      draft.rejectionTwo,
      draft.rejectionThree,
    ],
    proposedOutput: {
      aspectRatio: "9:16",
      width: outputWidth,
      height: outputHeight,
      durationSeconds: outputDuration,
      codec: "h264",
      container: "mp4",
    },
    noUpscale: true,
    noSyntheticRepeats: true,
  };
}

export type BodyCinemaActionFailure = { action: string; message: string };

export function bodyCinemaActionFailure(
  action: string,
  error: unknown,
  fallback: string
): BodyCinemaActionFailure {
  const message = error instanceof Error ? error.message.trim() : "";
  // Schema diagnostics are not creator copy. Keep the step-specific guidance.
  return {
    action,
    message: message && !message.startsWith("[") ? message : fallback,
  };
}

export function BodyCinemaActionError({
  failure,
}: {
  failure: BodyCinemaActionFailure | null;
}) {
  const alertRef = useRef<HTMLElement>(null);
  useEffect(() => {
    if (!failure) return;
    alertRef.current?.focus({ preventScroll: true });
    alertRef.current?.scrollIntoView({ block: "center", behavior: "auto" });
  }, [failure]);
  if (!failure) return null;
  return (
    <section
      ref={alertRef}
      role="alert"
      tabIndex={-1}
      aria-labelledby="body-cinema-action-error-title"
      className="cv-panel body-cinema-state body-cinema-state--gold"
    >
      <p className="eyebrow">This step needs attention</p>
      <h2 id="body-cinema-action-error-title" className="cv-heading heading-md">
        {failure.action}
      </h2>
      <p className="body-sm">{failure.message}</p>
    </section>
  );
}

function QueryError({ error }: { error: unknown }) {
  if (!error) return null;
  const message =
    error instanceof Error
      ? error.message
      : "CreatorVault could not load this lifecycle.";
  return (
    <div className="cv-state cv-state-error body-cinema-error" role="alert">
      {message}
    </div>
  );
}

function HashReference({
  label,
  hash,
}: {
  label: string;
  hash: string | null | undefined;
}) {
  return (
    <div className="body-cinema-hash">
      <span>{label}</span>
      <code title={hash ?? undefined}>{shortHash(hash)}</code>
    </div>
  );
}

export function BodyCinemaLifecycleStatic({
  state,
}: {
  state: BodyCinemaLifecycleState;
}) {
  const copy = LIFECYCLE_COPY[state];
  return (
    <section
      className={`cv-panel body-cinema-state body-cinema-state--${copy.tone}`}
      aria-live="polite"
    >
      <p className="eyebrow">{copy.eyebrow}</p>
      <h2 className="cv-heading heading-md">{copy.title}</h2>
      <p className="body-sm">{copy.detail}</p>
    </section>
  );
}

function LifecycleReferences({
  record,
}: {
  record: BodyCinemaLifecycleRecord;
}) {
  const review = record.review;
  return (
    <section
      className="body-cinema-references"
      aria-label="Immutable source and candidate references"
    >
      <div className="cv-panel body-cinema-reference-card">
        <p className="eyebrow">Original source</p>
        <strong>{record.source.fileName}</strong>
        <p className="body-xs">
          {formatSeconds(record.source.durationSeconds)} ·{" "}
          {record.source.mimeType}
        </p>
        <HashReference label="Source SHA-256" hash={record.source.sha256} />
      </div>
      <div className="cv-panel body-cinema-reference-card">
        <p className="eyebrow">Candidate</p>
        <strong>{record.candidate?.fileName ?? "Not attached"}</strong>
        <p className="body-xs">
          {record.candidate
            ? `${formatSeconds(record.candidate.durationSeconds)} · ${record.candidate.mimeType}`
            : "No attachment exists."}
        </p>
        <HashReference
          label="Candidate SHA-256"
          hash={record.candidate?.sha256 ?? review?.candidateHash}
        />
      </div>
    </section>
  );
}

function LegacyVaultXDrop() {
  const search = useSearch();
  const [, navigate] = useLocation();
  const query = useMemo(() => new URLSearchParams(search), [search]);
  const lifecycleId = query.get("lifecycleId") || null;
  const sourceAssetIdPrefill = query.get("sourceAssetId") || null;
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [mediaPickerOpen, setMediaPickerOpen] = useState(false);
  const [selectedSource, setSelectedSource] = useState<MediaAssetItem | null>(
    null
  );
  const [uploadedSource, setUploadedSource] =
    useState<DirectVideoUploadResponse | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [ownSource, setOwnSource] = useState(false);
  const [performerLikenessConsent, setPerformerLikenessConsent] =
    useState(false);
  const [
    acknowledgesNoIndependentVerification,
    setAcknowledgesNoIndependentVerification,
  ] = useState(false);
  const [intendedUse, setIntendedUse] = useState<IntendedUse | "">("");
  const [treatment, setTreatment] = useState<TreatmentDraft>(EMPTY_TREATMENT);
  const [emphasis, setEmphasis] = useState<Emphasis[]>(["face", "full_body"]);
  const [actionFailure, setActionFailure] =
    useState<BodyCinemaActionFailure | null>(null);
  const showActionError = useCallback(
    (action: string, error: unknown, fallback: string) => {
      setActionFailure(bodyCinemaActionFailure(action, error, fallback));
    },
    []
  );
  const [decisionReason, setDecisionReason] = useState("");
  const [completedCandidateKey, setCompletedCandidateKey] = useState<
    string | null
  >(null);
  const [watchAssertionKey, setWatchAssertionKey] = useState<string | null>(
    null
  );
  const [playbackFailureKey, setPlaybackFailureKey] = useState<string | null>(
    null
  );

  const lifecycleListQuery = trpc.bodyCinema.lifecycle.listMine.useQuery(
    { limit: LIFECYCLE_LIMIT },
    { staleTime: 15_000 }
  );
  const lifecycleQuery = trpc.bodyCinema.lifecycle.getMine.useQuery(
    { id: lifecycleId ?? "" },
    { enabled: Boolean(lifecycleId), staleTime: 10_000 }
  );
  const lifecycle = lifecycleQuery.data ?? null;
  const playbackQuery = trpc.bodyCinema.lifecycle.getPlaybackAccess.useQuery(
    { id: lifecycleId ?? "" },
    { enabled: Boolean(lifecycle), staleTime: 0 }
  );
  const reviewKey = lifecycle?.candidate
    ? `${lifecycle.id}:${lifecycle.review?.id ?? "not-started"}:${lifecycle.candidate.sha256}`
    : null;
  const candidateEnded = Boolean(
    reviewKey && completedCandidateKey === reviewKey
  );
  const watchAsserted = Boolean(reviewKey && watchAssertionKey === reviewKey);
  const playbackReady = Boolean(
    playbackQuery.data?.sourceUrl &&
    playbackQuery.data?.candidateUrl &&
    playbackFailureKey !== reviewKey
  );
  const handoffId = lifecycle?.handoff?.trailerProjectId ?? null;
  const handoffQuery = trpc.bodyCinema.lifecycle.getHandoff.useQuery(
    { handoffId: handoffId ?? "" },
    { enabled: Boolean(handoffId), staleTime: 10_000 }
  );
  const utils = trpc.useUtils();
  const qualifyMutation = trpc.bodyCinema.lifecycle.qualify.useMutation();
  const freezeMutation = trpc.bodyCinema.lifecycle.freeze.useMutation();
  const reserveMutation = trpc.bodyCinema.lifecycle.reserve.useMutation();
  const beginReviewMutation =
    trpc.bodyCinema.lifecycle.beginReview.useMutation();
  const decideMutation = trpc.bodyCinema.lifecycle.decide.useMutation();
  const handoffMutation = trpc.bodyCinema.lifecycle.handoff.useMutation();

  const sourceAssetId = selectedSource?.id ?? sourceAssetIdPrefill;
  const sourceDuration = lifecycle?.source.durationSeconds ?? null;
  const isBusy =
    qualifyMutation.isPending ||
    freezeMutation.isPending ||
    reserveMutation.isPending ||
    beginReviewMutation.isPending ||
    decideMutation.isPending ||
    handoffMutation.isPending;

  const updateQuery = useCallback(
    (changes: Record<string, string | null>) => {
      const next = new URLSearchParams(search);
      for (const [key, value] of Object.entries(changes)) {
        if (value) next.set(key, value);
        else next.delete(key);
      }
      const suffix = next.toString();
      navigate(`/vault-x/studio${suffix ? `?${suffix}` : ""}`);
    },
    [navigate, search]
  );

  const openLifecycle = useCallback(
    async (id: string) => {
      updateQuery({ lifecycleId: id });
      await Promise.all([
        utils.bodyCinema.lifecycle.getMine.invalidate({ id }),
        utils.bodyCinema.lifecycle.listMine.invalidate({
          limit: LIFECYCLE_LIMIT,
        }),
      ]);
    },
    [updateQuery, utils]
  );

  const handleSourceSelection = useCallback(
    (assets: MediaAssetItem[]) => {
      const asset = assets[0];
      setMediaPickerOpen(false);
      setActionFailure(null);
      if (!asset || !isBodyCinemaSourceCandidate(asset)) {
        showActionError(
          "Source selection stopped",
          null,
          "Choose a ready video from your Vault. The server will decide whether its stored bytes qualify."
        );
        return;
      }
      setSelectedSource(asset);
      setUploadedSource(null);
      setOwnSource(false);
      setPerformerLikenessConsent(false);
      setAcknowledgesNoIndependentVerification(false);
      setIntendedUse("");
      updateQuery({ sourceAssetId: asset.id, lifecycleId: null });
    },
    [showActionError, updateQuery]
  );

  const handleUpload = useCallback(
    async (event: ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      event.target.value = "";
      if (!file) return;
      setActionFailure(null);
      if (!file.type.startsWith("video/")) {
        showActionError(
          "Source upload stopped",
          null,
          "Choose a video file to save into your Vault."
        );
        return;
      }
      setUploading(true);
      setUploadProgress(0);
      try {
        const response = await uploadSourceVideo(file, setUploadProgress);
        setUploadedSource(response);
        toast.success(
          "Source saved to your Vault. Select it from Your Vault before you ask the lifecycle server to qualify it."
        );
      } catch (error) {
        showActionError(
          "Source upload stopped",
          error,
          "CreatorVault could not save this source video. Check your connection before trying this upload again."
        );
      } finally {
        setUploading(false);
      }
    },
    [showActionError]
  );

  const qualifySelectedSource = useCallback(async () => {
    setActionFailure(null);
    if (!sourceAssetId) {
      showActionError(
        "Source qualification stopped",
        null,
        "Select an exact source from Your Vault first."
      );
      return;
    }
    if (
      !ownSource ||
      !performerLikenessConsent ||
      !acknowledgesNoIndependentVerification ||
      !intendedUse
    ) {
      showActionError(
        "Source qualification stopped",
        null,
        "Complete the required creator assertion before asking the server to qualify this source."
      );
      return;
    }
    try {
      const result = await qualifyMutation.mutateAsync({
        sourceAssetId,
        rights: {
          version: BODY_CINEMA_CREATOR_ASSERTION_VERSION,
          ownSource: true,
          performerLikenessConsent: true,
          treatmentScope: "crown_reveal_candidate_review",
          intendedUse,
          acknowledgesNoIndependentVerification: true,
        },
      });
      await openLifecycle(result.id);
      toast.success("The source qualification record was saved.");
    } catch (error) {
      showActionError(
        "Source qualification stopped",
        error,
        "CreatorVault could not qualify this source. Check the source and complete every declaration before continuing."
      );
    }
  }, [
    acknowledgesNoIndependentVerification,
    intendedUse,
    openLifecycle,
    ownSource,
    performerLikenessConsent,
    qualifyMutation,
    showActionError,
    sourceAssetId,
  ]);

  const freezePlan = useCallback(async () => {
    if (!lifecycle) return;
    setActionFailure(null);
    const parsedTreatment = makeTreatment(treatment, emphasis, sourceDuration);
    if (typeof parsedTreatment === "string") {
      showActionError(
        "Plan could not be frozen",
        new Error(parsedTreatment),
        parsedTreatment
      );
      return;
    }
    try {
      const result = await freezeMutation.mutateAsync({
        id: lifecycle.id,
        treatment: parsedTreatment,
      });
      await openLifecycle(result.id);
      toast.success(
        "The Crown Reveal plan is frozen. It does not create media."
      );
    } catch (error) {
      showActionError(
        "Plan could not be frozen",
        error,
        "Complete all Crown Reveal fields with a source-supported moment, crop, and output proposal before freezing the plan."
      );
    }
  }, [
    emphasis,
    freezeMutation,
    lifecycle,
    openLifecycle,
    sourceDuration,
    treatment,
    showActionError,
  ]);

  const reserveCandidateSlot = useCallback(async () => {
    if (!lifecycle) return;
    setActionFailure(null);
    try {
      const result = await reserveMutation.mutateAsync({ id: lifecycle.id });
      await openLifecycle(result.id);
      toast.success("Exactly one candidate slot is reserved.");
    } catch (error) {
      showActionError(
        "Candidate slot could not be reserved",
        error,
        "CreatorVault could not reserve this slot. Reopen the saved lifecycle to check its current state."
      );
    }
  }, [lifecycle, openLifecycle, reserveMutation, showActionError]);

  const beginReview = useCallback(async () => {
    if (!lifecycle) return;
    setActionFailure(null);
    try {
      const result = await beginReviewMutation.mutateAsync({
        id: lifecycle.id,
      });
      setCompletedCandidateKey(null);
      setWatchAssertionKey(null);
      setPlaybackFailureKey(null);
      await openLifecycle(result.id);
      toast.success(
        "Review started. Watch the exact candidate before deciding."
      );
    } catch (error) {
      showActionError(
        "Review could not start",
        error,
        "CreatorVault could not start this review. Check that both saved videos are available."
      );
    }
  }, [beginReviewMutation, lifecycle, openLifecycle, showActionError]);

  const decide = useCallback(
    async (decision: "accept" | "reject") => {
      if (!lifecycle?.review || !lifecycle.candidate) return;
      setActionFailure(null);
      if (!candidateEnded || !watchAsserted || !playbackReady) {
        showActionError(
          "Decision could not be saved",
          null,
          "The candidate must finish playing before you can record a decision."
        );
        return;
      }
      if (decisionReason.trim().length < 12) {
        showActionError(
          "Decision could not be saved",
          null,
          "Give a decision reason of at least 12 characters."
        );
        return;
      }
      try {
        const result = await decideMutation.mutateAsync({
          id: lifecycle.id,
          reviewId: lifecycle.review.id,
          candidateSha256: lifecycle.candidate.sha256,
          decision,
          reason: decisionReason.trim(),
          watchedEntireCandidate: true,
        });
        await openLifecycle(result.id);
        toast.success(
          decision === "accept"
            ? "Creator acceptance was saved."
            : "Creator rejection was saved with private evidence retained."
        );
      } catch (error) {
        showActionError(
          "Decision could not be saved",
          error,
          "CreatorVault could not save this decision. Reopen the exact review before continuing."
        );
      }
    },
    [
      candidateEnded,
      watchAsserted,
      playbackReady,
      decideMutation,
      decisionReason,
      lifecycle,
      openLifecycle,
      showActionError,
    ]
  );

  const createHandoff = useCallback(async () => {
    if (!lifecycle) return;
    setActionFailure(null);
    try {
      const result = await handoffMutation.mutateAsync({ id: lifecycle.id });
      await openLifecycle(result.id);
      toast.success(
        "Trailer Maker planning handoff saved. No trailer was rendered."
      );
    } catch (error) {
      showActionError(
        "Planning handoff could not be saved",
        error,
        "CreatorVault could not save the planning handoff. Only an accepted master can continue."
      );
    }
  }, [handoffMutation, lifecycle, openLifecycle, showActionError]);

  const toggleEmphasis = useCallback((value: Emphasis) => {
    setEmphasis(current =>
      current.includes(value)
        ? current.filter(item => item !== value)
        : [...current, value]
    );
  }, []);

  const sourcePreviewUrl = selectedSource?.publicUrl ?? null;
  const candidateDownloadUrl =
    playbackFailureKey === reviewKey
      ? null
      : (playbackQuery.data?.downloadUrl ?? null);
  const handoff = handoffQuery.data ?? lifecycle?.handoff ?? null;
  const handoffHref = handoffQuery.data
    ? `/trailer-maker?bodyCinemaHandoffId=${encodeURIComponent(handoffQuery.data.trailerProjectId)}`
    : null;

  return (
    <div className="cv-dna cv-page body-cinema-page">
      <style>{`
        .body-cinema-page { min-height: 100vh; padding-bottom: 72px; background: var(--bg-void, #0A0A0A); color: var(--text-primary, #fff); }
        .body-cinema-shell { width: min(1120px, calc(100% - 32px)); margin: 0 auto; }
        .body-cinema-top { display:flex; align-items:center; justify-content:space-between; gap:16px; min-height:72px; border-bottom:1px solid var(--border-subtle, rgba(255,255,255,.08)); }
        .body-cinema-back { color:var(--text-secondary, rgba(255,255,255,.6)); display:inline-flex; gap:8px; align-items:center; text-decoration:none; font-size:13px; }
        .body-cinema-hero { position:relative; min-height:290px; overflow:hidden; border-bottom:1px solid var(--border-subtle, rgba(255,255,255,.08)); background:linear-gradient(135deg,#16120a,#0A0A0A 62%); }
        .body-cinema-hero::after { content:""; position:absolute; inset:0; background:linear-gradient(90deg,rgba(0,0,0,.94),rgba(0,0,0,.58) 54%,rgba(0,0,0,.88)); pointer-events:none; }
        .body-cinema-hero__reference { position:absolute; inset:0; width:100%; height:100%; object-fit:cover; opacity:.42; }
        .body-cinema-hero__copy { position:relative; z-index:1; max-width:690px; padding:58px 0 48px; }
        .body-cinema-hero h1 { margin:8px 0 14px; max-width:600px; }
        .body-cinema-hero p { max-width:620px; color:var(--text-secondary,rgba(255,255,255,.65)); margin:0; }
        .body-cinema-reference-label { color:var(--accent-gold,#C9A84C) !important; }
        .body-cinema-layout { display:grid; grid-template-columns:minmax(0,1fr) 310px; gap:20px; padding-top:28px; }
        .body-cinema-main { min-width:0; display:grid; gap:20px; }
        .body-cinema-side { display:grid; align-content:start; gap:14px; }
        .body-cinema-panel { padding:22px; }
        .body-cinema-panel h2, .body-cinema-panel h3 { margin:5px 0 10px; }
        .body-cinema-panel > p { color:var(--text-secondary,rgba(255,255,255,.65)); margin:0; }
        .body-cinema-state { padding:20px; border-left:2px solid var(--accent-cyan,#00D9FF); }
        .body-cinema-state--gold { border-left-color:var(--accent-gold,#C9A84C); }
        .body-cinema-state--danger { border-left-color:var(--danger,#FF3B3B); }
        .body-cinema-state--success { border-left-color:var(--success,#00FF94); }
        .body-cinema-state .eyebrow, .body-cinema-panel .eyebrow { margin:0; color:var(--accent-cyan,#00D9FF); }
        .body-cinema-state--gold .eyebrow { color:var(--accent-gold,#C9A84C); }
        .body-cinema-state--danger .eyebrow { color:var(--danger,#FF3B3B); }
        .body-cinema-state--success .eyebrow { color:var(--success,#00FF94); }
        .body-cinema-state h2 { margin:7px 0; }
        .body-cinema-state p:last-child { margin:0; color:var(--text-secondary,rgba(255,255,255,.65)); }
        .body-cinema-actions { display:flex; flex-wrap:wrap; gap:10px; margin-top:18px; }
        .body-cinema-actions .cv-cta, .body-cinema-actions .cv-cta-outline { min-height:52px; }
        .body-cinema-quiet-button { min-height:44px; border:1px solid var(--border-medium,rgba(255,255,255,.15)); border-radius:2px; background:var(--bg-surface,#1A1A1A); color:var(--text-primary,#fff); padding:0 15px; cursor:pointer; font-family:"DM Sans",sans-serif; font-size:13px; }
        .body-cinema-quiet-button:disabled { opacity:.46; cursor:not-allowed; }
        .body-cinema-form { display:grid; gap:16px; margin-top:20px; }
        .body-cinema-form label, .body-cinema-fieldset legend { display:grid; gap:7px; color:var(--text-primary,#fff); font-size:13px; font-weight:600; }
        .body-cinema-fieldset { margin:0; padding:0; border:0; display:grid; gap:9px; }
        .body-cinema-fieldset legend { padding:0; }
        .body-cinema-checkbox { display:flex !important; align-items:flex-start; gap:10px; color:var(--text-secondary,rgba(255,255,255,.65)) !important; font-weight:400 !important; line-height:1.5; }
        .body-cinema-checkbox input { width:18px; height:18px; flex:none; margin-top:2px; accent-color:var(--accent-cyan,#00D9FF); }
        .body-cinema-grid { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:12px; }
        .body-cinema-grid--four { grid-template-columns:repeat(4,minmax(0,1fr)); }
        .body-cinema-emphasis { display:flex; flex-wrap:wrap; gap:8px; }
        .body-cinema-emphasis label { display:flex; align-items:center; gap:7px; min-height:38px; padding:0 10px; border:1px solid var(--border-medium,rgba(255,255,255,.15)); background:var(--bg-void,#0A0A0A); }
        .body-cinema-emphasis input { accent-color:var(--accent-cyan,#00D9FF); }
        .body-cinema-help { color:var(--text-muted,rgba(255,255,255,.42)) !important; font-size:12px; line-height:1.55; }
        .body-cinema-source-select { display:grid; grid-template-columns:72px minmax(0,1fr); gap:16px; align-items:center; }
        .body-cinema-source-icon { width:60px; height:60px; display:grid; place-items:center; border:1px solid var(--accent-cyan-border,rgba(0,217,255,.3)); color:var(--accent-cyan,#00D9FF); background:var(--accent-cyan-dim,rgba(0,217,255,.12)); }
        .body-cinema-source-select strong { display:block; margin-bottom:4px; overflow-wrap:anywhere; }
        .body-cinema-source-select p { margin:0; color:var(--text-secondary,rgba(255,255,255,.65)); font-size:12px; line-height:1.45; }
        .body-cinema-upload { border-top:1px solid var(--border-subtle,rgba(255,255,255,.08)); margin-top:18px; padding-top:18px; }
        .body-cinema-references { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:12px; }
        .body-cinema-reference-card { padding:16px; min-width:0; }
        .body-cinema-reference-card strong { display:block; margin:5px 0; overflow-wrap:anywhere; }
        .body-cinema-reference-card > p { margin:0 0 12px; color:var(--text-secondary,rgba(255,255,255,.65)); }
        .body-cinema-hash { display:grid; gap:5px; border-top:1px solid var(--border-subtle,rgba(255,255,255,.08)); padding-top:10px; }
        .body-cinema-hash span { color:var(--text-muted,rgba(255,255,255,.42)); font:10px "Space Mono",monospace; letter-spacing:.12em; text-transform:uppercase; }
        .body-cinema-hash code { color:var(--accent-cyan,#00D9FF); font-size:11px; overflow:hidden; text-overflow:ellipsis; }
        .body-cinema-preview { width:100%; max-height:430px; margin-top:18px; background:#000; border:1px solid var(--border-subtle,rgba(255,255,255,.08)); object-fit:contain; }
        .body-cinema-unavailable { margin-top:16px; padding:15px; border:1px dashed var(--border-medium,rgba(255,255,255,.15)); color:var(--text-secondary,rgba(255,255,255,.65)); font-size:12px; line-height:1.55; }
        .body-cinema-list { display:grid; gap:8px; }
        .body-cinema-list a { display:grid; gap:4px; padding:12px; border:1px solid var(--border-subtle,rgba(255,255,255,.08)); background:var(--bg-surface,#1A1A1A); color:var(--text-primary,#fff); text-decoration:none; }
        .body-cinema-list a:hover, .body-cinema-list a:focus-visible { border-color:var(--accent-cyan-border,rgba(0,217,255,.3)); }
        .body-cinema-list strong { font-size:12px; overflow-wrap:anywhere; }
        .body-cinema-list span { color:var(--text-muted,rgba(255,255,255,.42)); font:10px "Space Mono",monospace; letter-spacing:.1em; text-transform:uppercase; }
        .body-cinema-error { padding:14px; border:1px solid rgba(255,59,59,.45); background:rgba(255,59,59,.08); color:#ffd0d0; }
        .body-cinema-accepted { border-color:var(--accent-gold-border,rgba(201,168,76,.3)); }
        @media (max-width: 800px) { .body-cinema-layout { grid-template-columns:1fr; } .body-cinema-side { order:-1; } .body-cinema-hero__copy { padding:42px 0 36px; } }
        @media (max-width: 580px) { .body-cinema-shell { width:min(100% - 24px,1120px); } .body-cinema-hero { min-height:245px; } .body-cinema-grid, .body-cinema-grid--four, .body-cinema-references { grid-template-columns:1fr; } .body-cinema-top { min-height:60px; } }
        @media (prefers-reduced-motion: reduce) { .body-cinema-hero__reference { display:none; } }
      `}</style>

      <header className="body-cinema-shell body-cinema-top">
        <Link
          href="/vault-x"
          className="body-cinema-back"
          aria-label="Back to VaultX"
        >
          <ArrowLeft size={16} aria-hidden="true" /> Back to VaultX
        </Link>
        <p className="eyebrow">Body Cinema · Phase A</p>
      </header>

      <section className="body-cinema-hero">
        <video
          className="body-cinema-hero__reference"
          src="/videos/homepage-motion-pilot.mp4"
          muted
          autoPlay
          loop
          playsInline
          preload="metadata"
          aria-label="CreatorVault motion reference, not a candidate"
        />
        <div className="body-cinema-shell body-cinema-hero__copy">
          <p className="eyebrow body-cinema-reference-label">
            CreatorVault cinematic reference — not a candidate
          </p>
          <h1 className="cv-heading display-md">
            ONE SOURCE. ONE CANDIDATE. ONE CREATOR DECISION.
          </h1>
          <p className="body-lg">
            Build a durable Crown Reveal plan around one creator-owned original.
            This workspace never renders, publishes, sells, shares, or requests
            a provider output.
          </p>
        </div>
      </section>

      <main className="body-cinema-shell body-cinema-layout">
        <div className="body-cinema-main">
          <BodyCinemaActionError failure={actionFailure} />
          <QueryError
            error={
              lifecycleQuery.error ??
              lifecycleListQuery.error ??
              handoffQuery.error ??
              playbackQuery.error
            }
          />

          {!lifecycle && (
            <section className="cv-panel body-cinema-panel">
              <p className="eyebrow">01 · Exact original</p>
              <h2 className="cv-heading heading-md">
                Select a source. Then ask the server to qualify it.
              </h2>
              <p className="body-sm">
                A selection is not qualification. The server alone checks
                creator ownership, stored bytes, media facts, and source
                identity.
              </p>
              <div
                className="body-cinema-source-select"
                style={{ marginTop: 20 }}
              >
                <div className="body-cinema-source-icon">
                  <FileVideo size={26} aria-hidden="true" />
                </div>
                <div>
                  <strong>
                    {selectedSource?.originalName ??
                      selectedSource?.fileName ??
                      sourceAssetId ??
                      "No source selected"}
                  </strong>
                  <p>
                    {sourceAssetId
                      ? "Explicit source selection only — not yet server qualified."
                      : "Choose one ready video from Your Vault."}
                  </p>
                </div>
              </div>
              {sourcePreviewUrl && (
                <video
                  className="body-cinema-preview"
                  src={sourcePreviewUrl}
                  controls
                  playsInline
                  preload="metadata"
                  aria-label="Selected source preview"
                />
              )}
              <div className="body-cinema-actions">
                <button
                  type="button"
                  className="cv-cta"
                  onClick={() => setMediaPickerOpen(true)}
                  disabled={uploading}
                >
                  <Film size={17} aria-hidden="true" /> Choose from Your Vault
                </button>
              </div>

              <div className="body-cinema-upload">
                <p className="eyebrow">Manual upload</p>
                <p className="body-sm">
                  Upload saves a video into Your Vault only. It does not select
                  or qualify the upload for this lifecycle.
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="video/*"
                  onChange={handleUpload}
                  hidden
                />
                <div className="body-cinema-actions">
                  <button
                    type="button"
                    className="body-cinema-quiet-button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                  >
                    {uploading ? (
                      <Loader2
                        className="body-cinema-spin"
                        size={16}
                        aria-hidden="true"
                      />
                    ) : (
                      <Upload size={16} aria-hidden="true" />
                    )}
                    {uploading
                      ? `Saving source ${uploadProgress}%`
                      : "Save video to Your Vault"}
                  </button>
                </div>
                {uploadedSource && (
                  <p className="body-cinema-help">
                    Saved source record: {uploadedSource.filename}. Open Your
                    Vault and select its exact asset before qualification.
                  </p>
                )}
              </div>

              {sourceAssetId && (
                <div className="body-cinema-form">
                  <p className="eyebrow">Versioned creator assertion</p>
                  <p className="body-cinema-help">
                    This is your self-attestation. It is not independent
                    verification of rights, age, identity, ownership, or
                    consent.
                  </p>
                  <label className="body-cinema-checkbox">
                    <input
                      type="checkbox"
                      checked={ownSource}
                      onChange={event => setOwnSource(event.target.checked)}
                    />
                    I assert that I own or control this exact original source.
                  </label>
                  <label className="body-cinema-checkbox">
                    <input
                      type="checkbox"
                      checked={performerLikenessConsent}
                      onChange={event =>
                        setPerformerLikenessConsent(event.target.checked)
                      }
                    />
                    I assert performer and likeness consent for this Crown
                    Reveal candidate-review scope.
                  </label>
                  <label className="body-cinema-checkbox">
                    <input
                      type="checkbox"
                      checked={acknowledgesNoIndependentVerification}
                      onChange={event =>
                        setAcknowledgesNoIndependentVerification(
                          event.target.checked
                        )
                      }
                    />
                    I understand CreatorVault records this as creator asserted,
                    not independently verified.
                  </label>
                  <label>
                    Intended use
                    <select
                      className="cv-input"
                      value={intendedUse}
                      onChange={event =>
                        setIntendedUse(event.target.value as IntendedUse | "")
                      }
                    >
                      <option value="">Select intended use</option>
                      <option value="private_candidate_review">
                        Private candidate review
                      </option>
                      <option value="accepted_master_and_trailer_plan">
                        Accepted master and Trailer Maker plan
                      </option>
                    </select>
                  </label>
                  <p className="body-cinema-help">
                    Recorded scope: <code>crown_reveal_candidate_review</code>.
                    No age checkbox or independent-verification claim is used
                    here.
                  </p>
                  <div className="body-cinema-actions">
                    <button
                      type="button"
                      className="cv-cta"
                      onClick={() => void qualifySelectedSource()}
                      disabled={isBusy}
                    >
                      {qualifyMutation.isPending ? (
                        <Loader2
                          className="body-cinema-spin"
                          size={17}
                          aria-hidden="true"
                        />
                      ) : (
                        <ShieldCheck size={17} aria-hidden="true" />
                      )}
                      Qualify selected source
                    </button>
                  </div>
                </div>
              )}
            </section>
          )}

          {lifecycle && (
            <>
              <BodyCinemaLifecycleStatic state={lifecycle.state} />
              <LifecycleReferences record={lifecycle} />

              {lifecycle.state === "qualified" && (
                <section className="cv-panel body-cinema-panel">
                  <p className="eyebrow">02 · Crown Reveal treatment</p>
                  <h2 className="cv-heading heading-md">
                    Freeze one source-bound plan.
                  </h2>
                  <p className="body-sm">
                    The selected moment must remain inside the server-verified
                    actual source duration:{" "}
                    <strong>{formatSeconds(sourceDuration)}</strong>. No media
                    is made by freezing this plan.
                  </p>
                  <div className="body-cinema-form">
                    <div className="body-cinema-grid">
                      <label>
                        Intended feeling
                        <textarea
                          className="cv-input"
                          value={treatment.feeling}
                          onChange={event =>
                            setTreatment(current => ({
                              ...current,
                              feeling: event.target.value,
                            }))
                          }
                          maxLength={280}
                        />
                      </label>
                      <label>
                        Opening
                        <textarea
                          className="cv-input"
                          value={treatment.opening}
                          onChange={event =>
                            setTreatment(current => ({
                              ...current,
                              opening: event.target.value,
                            }))
                          }
                          maxLength={600}
                        />
                      </label>
                      <label>
                        Hook
                        <textarea
                          className="cv-input"
                          value={treatment.hook}
                          onChange={event =>
                            setTreatment(current => ({
                              ...current,
                              hook: event.target.value,
                            }))
                          }
                          maxLength={600}
                        />
                      </label>
                      <label>
                        Source-moment rationale
                        <textarea
                          className="cv-input"
                          value={treatment.sourceMomentRationale}
                          onChange={event =>
                            setTreatment(current => ({
                              ...current,
                              sourceMomentRationale: event.target.value,
                            }))
                          }
                          maxLength={800}
                        />
                      </label>
                    </div>
                    <div className="body-cinema-grid">
                      <label>
                        Moment start (seconds)
                        <input
                          className="cv-input"
                          value={treatment.sourceMomentStart}
                          onChange={event =>
                            setTreatment(current => ({
                              ...current,
                              sourceMomentStart: event.target.value,
                            }))
                          }
                          inputMode="decimal"
                          type="number"
                          min="0"
                          step="0.1"
                        />
                      </label>
                      <label>
                        Moment end (seconds)
                        <input
                          className="cv-input"
                          value={treatment.sourceMomentEnd}
                          onChange={event =>
                            setTreatment(current => ({
                              ...current,
                              sourceMomentEnd: event.target.value,
                            }))
                          }
                          inputMode="decimal"
                          type="number"
                          min="0"
                          step="0.1"
                        />
                      </label>
                    </div>
                    <fieldset className="body-cinema-fieldset">
                      <legend>Creator-approved body / face emphasis</legend>
                      <div className="body-cinema-emphasis">
                        {EMPHASIS_OPTIONS.map(option => (
                          <label key={option.value}>
                            <input
                              type="checkbox"
                              checked={emphasis.includes(option.value)}
                              onChange={() => toggleEmphasis(option.value)}
                            />
                            {option.label}
                          </label>
                        ))}
                      </div>
                    </fieldset>
                    <fieldset className="body-cinema-fieldset">
                      <legend>
                        Crop boundaries (0–1 relative to the original source
                        frame)
                      </legend>
                      <div className="body-cinema-grid body-cinema-grid--four">
                        <label>
                          Left
                          <input
                            className="cv-input"
                            value={treatment.cropLeft}
                            onChange={event =>
                              setTreatment(current => ({
                                ...current,
                                cropLeft: event.target.value,
                              }))
                            }
                            inputMode="decimal"
                            type="number"
                            min="0"
                            max="1"
                            step="0.01"
                          />
                        </label>
                        <label>
                          Top
                          <input
                            className="cv-input"
                            value={treatment.cropTop}
                            onChange={event =>
                              setTreatment(current => ({
                                ...current,
                                cropTop: event.target.value,
                              }))
                            }
                            inputMode="decimal"
                            type="number"
                            min="0"
                            max="1"
                            step="0.01"
                          />
                        </label>
                        <label>
                          Width
                          <input
                            className="cv-input"
                            value={treatment.cropWidth}
                            onChange={event =>
                              setTreatment(current => ({
                                ...current,
                                cropWidth: event.target.value,
                              }))
                            }
                            inputMode="decimal"
                            type="number"
                            min="0.01"
                            max="1"
                            step="0.01"
                          />
                        </label>
                        <label>
                          Height
                          <input
                            className="cv-input"
                            value={treatment.cropHeight}
                            onChange={event =>
                              setTreatment(current => ({
                                ...current,
                                cropHeight: event.target.value,
                              }))
                            }
                            inputMode="decimal"
                            type="number"
                            min="0.01"
                            max="1"
                            step="0.01"
                          />
                        </label>
                      </div>
                    </fieldset>
                    <div className="body-cinema-grid">
                      <label>
                        Natural rhythm
                        <textarea
                          className="cv-input"
                          value={treatment.naturalRhythm}
                          onChange={event =>
                            setTreatment(current => ({
                              ...current,
                              naturalRhythm: event.target.value,
                            }))
                          }
                          maxLength={600}
                        />
                      </label>
                      <label>
                        Color and light
                        <textarea
                          className="cv-input"
                          value={treatment.colorLight}
                          onChange={event =>
                            setTreatment(current => ({
                              ...current,
                              colorLight: event.target.value,
                            }))
                          }
                          maxLength={600}
                        />
                      </label>
                      <label>
                        Typography
                        <textarea
                          className="cv-input"
                          value={treatment.typography}
                          onChange={event =>
                            setTreatment(current => ({
                              ...current,
                              typography: event.target.value,
                            }))
                          }
                          maxLength={600}
                        />
                      </label>
                      <label>
                        Ending
                        <textarea
                          className="cv-input"
                          value={treatment.ending}
                          onChange={event =>
                            setTreatment(current => ({
                              ...current,
                              ending: event.target.value,
                            }))
                          }
                          maxLength={600}
                        />
                      </label>
                    </div>
                    <fieldset className="body-cinema-fieldset">
                      <legend>Automatic reject conditions</legend>
                      <label>
                        Condition one
                        <input
                          className="cv-input"
                          value={treatment.rejectionOne}
                          onChange={event =>
                            setTreatment(current => ({
                              ...current,
                              rejectionOne: event.target.value,
                            }))
                          }
                          maxLength={400}
                        />
                      </label>
                      <label>
                        Condition two
                        <input
                          className="cv-input"
                          value={treatment.rejectionTwo}
                          onChange={event =>
                            setTreatment(current => ({
                              ...current,
                              rejectionTwo: event.target.value,
                            }))
                          }
                          maxLength={400}
                        />
                      </label>
                      <label>
                        Condition three
                        <input
                          className="cv-input"
                          value={treatment.rejectionThree}
                          onChange={event =>
                            setTreatment(current => ({
                              ...current,
                              rejectionThree: event.target.value,
                            }))
                          }
                          maxLength={400}
                        />
                      </label>
                    </fieldset>
                    <fieldset className="body-cinema-fieldset">
                      <legend>Proposed 9:16 output plan</legend>
                      <p className="body-cinema-help">
                        Enter only a source-supported proposal. No default size
                        or duration is assumed, no upscale is allowed, and this
                        does not render an output.
                      </p>
                      <div className="body-cinema-grid">
                        <label>
                          Width (pixels)
                          <input
                            className="cv-input"
                            value={treatment.outputWidth}
                            onChange={event =>
                              setTreatment(current => ({
                                ...current,
                                outputWidth: event.target.value,
                              }))
                            }
                            inputMode="numeric"
                            type="number"
                            min="240"
                            step="1"
                          />
                        </label>
                        <label>
                          Height (pixels)
                          <input
                            className="cv-input"
                            value={treatment.outputHeight}
                            onChange={event =>
                              setTreatment(current => ({
                                ...current,
                                outputHeight: event.target.value,
                              }))
                            }
                            inputMode="numeric"
                            type="number"
                            min="426"
                            step="1"
                          />
                        </label>
                        <label>
                          Duration (seconds)
                          <input
                            className="cv-input"
                            value={treatment.outputDuration}
                            onChange={event =>
                              setTreatment(current => ({
                                ...current,
                                outputDuration: event.target.value,
                              }))
                            }
                            inputMode="decimal"
                            type="number"
                            min="1"
                            step="0.1"
                          />
                        </label>
                      </div>
                      <p className="body-cinema-help">
                        Original sound is preserved. Proposed container: MP4 /
                        H.264. No synthetic repeats.
                      </p>
                    </fieldset>
                    <div className="body-cinema-actions">
                      <button
                        type="button"
                        className="cv-cta"
                        onClick={() => void freezePlan()}
                        disabled={isBusy}
                      >
                        {freezeMutation.isPending ? (
                          <Loader2
                            className="body-cinema-spin"
                            size={17}
                            aria-hidden="true"
                          />
                        ) : (
                          <ShieldCheck size={17} aria-hidden="true" />
                        )}{" "}
                        Freeze Crown Reveal plan
                      </button>
                    </div>
                  </div>
                </section>
              )}

              {lifecycle.state === "frozen" && (
                <section className="cv-panel body-cinema-panel">
                  <p className="eyebrow">03 · Candidate slot</p>
                  <h2 className="cv-heading heading-md">
                    Reserve the only candidate slot.
                  </h2>
                  <p className="body-sm">
                    Reservation creates no candidate and sends no provider
                    request. It only records the single future attachment
                    boundary.
                  </p>
                  <div className="body-cinema-actions">
                    <button
                      type="button"
                      className="cv-cta"
                      onClick={() => void reserveCandidateSlot()}
                      disabled={isBusy}
                    >
                      {reserveMutation.isPending ? (
                        <Loader2
                          className="body-cinema-spin"
                          size={17}
                          aria-hidden="true"
                        />
                      ) : (
                        <Check size={17} aria-hidden="true" />
                      )}{" "}
                      Reserve one candidate slot
                    </button>
                  </div>
                </section>
              )}

              {lifecycle.state === "awaiting_candidate" && (
                <section className="cv-panel body-cinema-panel">
                  <p className="eyebrow">Attachment boundary</p>
                  <h2 className="cv-heading heading-md">
                    No attachment action is available.
                  </h2>
                  <p className="body-sm">
                    This reserved slot remains empty until a future separately
                    authorized pilot attaches one verified private candidate.
                    There is deliberately no attachment, retry, provider,
                    upload, publish, checkout, or sharing control here.
                  </p>
                </section>
              )}

              {playbackQuery.data?.sourceUrl && (
                <section
                  className="cv-panel body-cinema-panel"
                  aria-label="Protected source and candidate comparison"
                >
                  <p className="eyebrow">Private byte-bound playback</p>
                  <div className="body-cinema-references">
                    <div>
                      <h3 className="cv-heading heading-xs">
                        Exact original source
                      </h3>
                      <video
                        key={`${lifecycle.id}:source`}
                        className="body-cinema-preview"
                        src={playbackQuery.data.sourceUrl}
                        controls
                        playsInline
                        preload="metadata"
                        aria-label="Protected original source"
                        onError={() => setPlaybackFailureKey(reviewKey)}
                      />
                    </div>
                    <div>
                      <h3 className="cv-heading heading-xs">Exact candidate</h3>
                      {playbackQuery.data.candidateUrl ? (
                        <video
                          key={reviewKey}
                          className="body-cinema-preview"
                          src={playbackQuery.data.candidateUrl}
                          controls
                          playsInline
                          preload="metadata"
                          aria-label="Protected attached candidate"
                          onEnded={() => setCompletedCandidateKey(reviewKey)}
                          onError={() => setPlaybackFailureKey(reviewKey)}
                        />
                      ) : (
                        <p className="body-sm">
                          No verified candidate is available. No output is
                          claimed.
                        </p>
                      )}
                    </div>
                  </div>
                  {playbackQuery.data.unavailableReason && (
                    <p className="body-cinema-help">
                      {playbackQuery.data.unavailableReason}
                    </p>
                  )}
                </section>
              )}

              {lifecycle.state === "candidate_attached" && (
                <section className="cv-panel body-cinema-panel">
                  <p className="eyebrow">04 · Explicit review</p>
                  <h2 className="cv-heading heading-md">
                    Start review only when you can watch both files.
                  </h2>
                  <p className="body-sm">
                    The lifecycle record has candidate identity and hashes.
                    Protected playback paths are intentionally not inferred from
                    storage or public URLs.
                  </p>
                  {!playbackReady && (
                    <div className="body-cinema-unavailable">
                      Protected playback is unavailable. Review remains blocked
                      until the server verifies both files.
                    </div>
                  )}
                  <div className="body-cinema-actions">
                    <button
                      type="button"
                      className="cv-cta"
                      onClick={() => void beginReview()}
                      disabled={isBusy || !playbackReady}
                    >
                      {beginReviewMutation.isPending ? (
                        <Loader2
                          className="body-cinema-spin"
                          size={17}
                          aria-hidden="true"
                        />
                      ) : (
                        <Play size={17} aria-hidden="true" />
                      )}{" "}
                      Begin review
                    </button>
                  </div>
                </section>
              )}

              {lifecycle.state === "review_in_progress" && (
                <section className="cv-panel body-cinema-panel">
                  <p className="eyebrow">05 · Review exact bytes</p>
                  <h2 className="cv-heading heading-md">
                    Compare the source and candidate by their recorded hashes.
                  </h2>
                  <p className="body-sm">
                    Watch the exact private candidate, then explicitly assert
                    that you watched it from start to finish. Playback and your
                    assertion do not constitute independent creative-quality
                    verification.
                  </p>
                  {!playbackReady && (
                    <div className="body-cinema-unavailable">
                      Verified candidate playback is unavailable; accept and
                      reject are blocked.
                    </div>
                  )}
                  <label
                    className="body-cinema-checkbox"
                    style={{ marginTop: 16 }}
                  >
                    <input
                      type="checkbox"
                      checked={watchAsserted}
                      onChange={event =>
                        setWatchAssertionKey(
                          event.target.checked ? reviewKey : null
                        )
                      }
                      disabled={!candidateEnded || !playbackReady}
                    />
                    I watched the candidate from start to finish.
                  </label>
                  <label className="body-cinema-form">
                    Decision reason
                    <textarea
                      className="cv-input"
                      value={decisionReason}
                      onChange={event => setDecisionReason(event.target.value)}
                      minLength={12}
                      maxLength={3000}
                      placeholder="Describe the acceptance or rejection against the frozen treatment."
                    />
                  </label>
                  <div className="body-cinema-actions">
                    <button
                      type="button"
                      className="cv-cta"
                      onClick={() => void decide("accept")}
                      disabled={
                        isBusy ||
                        !candidateEnded ||
                        !watchAsserted ||
                        !playbackReady ||
                        decisionReason.trim().length < 12
                      }
                    >
                      <Check size={17} aria-hidden="true" /> Accept exact
                      candidate
                    </button>
                    <button
                      type="button"
                      className="body-cinema-quiet-button"
                      onClick={() => void decide("reject")}
                      disabled={
                        isBusy ||
                        !candidateEnded ||
                        !watchAsserted ||
                        !playbackReady ||
                        decisionReason.trim().length < 12
                      }
                    >
                      <X size={17} aria-hidden="true" /> Reject exact candidate
                    </button>
                  </div>
                </section>
              )}

              {(lifecycle.state === "accepted" ||
                lifecycle.state === "handoff_ready") && (
                <section className="cv-panel body-cinema-panel body-cinema-accepted">
                  <p className="eyebrow">Accepted master</p>
                  <h2 className="cv-heading heading-md">
                    Creator accepted master—not owner marketing approval.
                  </h2>
                  <p className="body-sm">
                    The accepted master references the exact candidate hash. It
                    does not authorize provider work, creative exports,
                    publishing, checkout, payment, or sharing.
                  </p>
                  <HashReference
                    label="Accepted candidate SHA-256"
                    hash={lifecycle.candidate?.sha256}
                  />
                  <div className="body-cinema-actions">
                    <button
                      type="button"
                      className="body-cinema-quiet-button"
                      disabled={!candidateDownloadUrl}
                      title="A server-authorized owned download URL is required."
                      onClick={() => {
                        if (candidateDownloadUrl)
                          window.location.assign(candidateDownloadUrl);
                      }}
                    >
                      <Download size={16} aria-hidden="true" />{" "}
                      {candidateDownloadUrl
                        ? "Download exact accepted master"
                        : "Download unavailable"}
                    </button>
                    {lifecycle.state === "accepted" && (
                      <button
                        type="button"
                        className="cv-cta"
                        onClick={() => void createHandoff()}
                        disabled={isBusy}
                      >
                        {handoffMutation.isPending ? (
                          <Loader2
                            className="body-cinema-spin"
                            size={17}
                            aria-hidden="true"
                          />
                        ) : (
                          <ChevronRight size={17} aria-hidden="true" />
                        )}{" "}
                        Create Trailer Maker planning handoff
                      </button>
                    )}
                    {handoffHref && (
                      <a className="cv-cta-outline" href={handoffHref}>
                        Open planning draft{" "}
                        <ChevronRight size={17} aria-hidden="true" />
                      </a>
                    )}
                  </div>
                  {handoff && (
                    <p className="body-cinema-help">
                      Saved planning artifact: 8-second teaser, 12-second reel,
                      three source-specific hooks, and caption direction.
                      Status: planning only.
                    </p>
                  )}
                </section>
              )}
            </>
          )}
        </div>

        <aside
          className="body-cinema-side"
          aria-label="Recent Body Cinema lifecycles"
        >
          <section className="cv-panel body-cinema-panel">
            <p className="eyebrow">Durable lifecycle records</p>
            <h2 className="cv-heading heading-xs">Resume private work.</h2>
            <p className="body-xs">
              Choose an owned lifecycle by ID. Re-entry never selects the newest
              source, starts analysis, creates a project, or writes to the
              lifecycle.
            </p>
            <div className="body-cinema-list" style={{ marginTop: 14 }}>
              {lifecycleListQuery.isLoading && (
                <p className="body-cinema-help">
                  <Loader2
                    className="body-cinema-spin"
                    size={14}
                    aria-hidden="true"
                  />{" "}
                  Loading records…
                </p>
              )}
              {!lifecycleListQuery.isLoading &&
                !lifecycleListQuery.data?.length && (
                  <p className="body-cinema-help">
                    No durable Body Cinema lifecycle record exists yet.
                  </p>
                )}
              {lifecycleListQuery.data?.map(record => (
                <Link
                  key={record.id}
                  href={`/vault-x/studio?lifecycleId=${encodeURIComponent(record.id)}`}
                >
                  <span>{LIFECYCLE_COPY[record.state].eyebrow}</span>
                  <strong>{record.source.fileName}</strong>
                  <span>{record.id}</span>
                </Link>
              ))}
            </div>
          </section>
          {lifecycle && (
            <button
              type="button"
              className="body-cinema-quiet-button"
              onClick={() => updateQuery({ lifecycleId: null })}
            >
              Start a different source selection
            </button>
          )}
        </aside>
      </main>

      <MediaPicker
        open={mediaPickerOpen}
        onClose={() => setMediaPickerOpen(false)}
        onConfirm={handleSourceSelection}
        mode="single"
        title="Your Vault originals"
        subtitle="Select one ready video. The lifecycle server, not this picker, decides whether stored source bytes qualify."
        confirmLabel="Select exact source"
        assetEligibility={isBodyCinemaSourceCandidate}
      />
    </div>
  );
}


/** Sole route owner: body-directed product first; old data is not a treatment. */
export default function VaultXDrop() {
  const search = useSearch();
  const params = useMemo(() => new URLSearchParams(search), [search]);
  const id = params.get("lifecycleId");
  // Saving a new record's URL must not unmount its in-progress source read.
  const startedAsNewDirector = useRef(!id).current;
  const body = trpc.bodyCinema.lifecycle.getBodyDirected.useQuery(
    {id:id ?? ""}, {enabled:Boolean(id) && !startedAsNewDirector, retry:false});
  const archive = trpc.bodyCinema.lifecycle.getMine.useQuery(
    {id:id ?? ""}, {enabled:Boolean(id) && !startedAsNewDirector && body.data === null, retry:false});
  if (!id || startedAsNewDirector) return <BodyDirectedDirector initialSourceAssetId={params.get("sourceAssetId")} />;
  if (body.isLoading || (body.data === null && archive.isLoading)) {
    return <main className="min-h-screen bg-[#0A0A0A] p-8 text-white" aria-live="polite">Opening your saved source and plan…</main>;
  }
  if (body.data) return <BodyDirectedDirector key={id} lifecycleId={id} />;
  if (archive.data) return <BodyCinemaHistoricalArchive record={archive.data} />;
  return <main className="min-h-screen bg-[#0A0A0A] p-8 text-white">
    <BodyCinemaActionError failure={{action:"Saved record unavailable",message:"This saved record is not available to your account. No source or plan has been substituted."}} />
    <Link href="/vault-x/studio" className="mt-6 inline-block border border-cyan-400 px-6 py-3">Open Body Cinema</Link>
  </main>;
}

export function BodyCinemaHistoricalArchive({record}: {record:BodyCinemaLifecycleRecord}) {
  return <main className="min-h-screen bg-[#0A0A0A] px-5 py-8 text-white md:px-10">
    <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[1.3fr_1fr]">
      <section>
        <p className="mb-3 text-sm font-semibold tracking-widest text-cyan-300">PREVIOUS SAVED RECORD · READ ONLY</p>
        <h1 style={{fontFamily:'"Bebas Neue", sans-serif'}} className="mb-6 text-6xl">YOUR ORIGINAL</h1>
        <video className="max-h-[75vh] w-full bg-black object-contain" controls playsInline preload="metadata"
          src={`/api/body-cinema/lifecycle/${encodeURIComponent(record.id)}/source`} aria-label="Original video from an earlier saved record" />
        <p className="mt-4 text-base text-white/90">Original · unchanged. No new candidate or treatment is being created.</p>
      </section>
      <section className="space-y-6 lg:pt-16">
        <h2 style={{fontFamily:'"Bebas Neue", sans-serif'}} className="text-5xl">SAVED ORIGINAL. READ ONLY.</h2>
        <p className="text-lg leading-relaxed text-white/90">Your earlier source and saved record are still here. Start a new body-directed shot plan in the current Body Cinema experience.</p>
        <p className="text-base text-white/90">Its original source, saved direction and state remain unchanged. The body-directed product starts with source analysis, body focus, edit language and visual identity.</p>
        <a href="/vault-x/studio" className="inline-block border border-cyan-400 bg-cyan-400 px-7 py-4 font-bold text-black">Open body-directed planning</a>
        <details className="border-t border-white/20 pt-5 text-base">
          <summary className="cursor-pointer font-semibold">Historical record details</summary>
          <dl className="mt-4 space-y-3 break-words">
            <div><dt className="font-semibold">Historical label</dt><dd>{record.treatment?.treatmentName ?? "No saved treatment"}</dd></div>
            <div><dt className="font-semibold">Stored state</dt><dd>{record.state.replace(/_/g," ")}</dd></div>
            <div><dt className="font-semibold">Original filename</dt><dd>{record.source.fileName}</dd></div>
            <div><dt className="font-semibold">Candidate attachment</dt><dd>{record.candidate ? "Historical attachment retained" : "None — slot remains empty"}</dd></div>
            <div><dt className="font-semibold">Accepted asset</dt><dd>{record.decision?.decision === "accept" ? "Historical acceptance retained" : "None"}</dd></div>
          </dl>
        </details>
      </section>
    </div>
  </main>;
}
