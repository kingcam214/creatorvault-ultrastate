import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import MediaPicker, { type MediaAssetItem } from "@/components/MediaPicker";
import { trpc } from "@/lib/trpc";
import {
  analyzeBodyCinemaOwnedSource,
  type LocalBodyCinemaFrameEvidence,
} from "@/lib/bodyCinemaPerception";
import {
  BODY_FOCUS_LIBRARY,
  BODY_FOCUS_TREATMENTS,
  BODY_VISUAL_IDENTITIES,
  type BodyDirectedPlan,
  type BodyDirectedDetailObservation,
  type BodyDirectedFocus,
  type BodyDirectedFrameEvidence,
  type BodyDirectedSourceMap,
  type BodyDirectedTreatment,
  type BodyVisualIdentity,
} from "@shared/bodyCinemaBodyDirection";

import {
  BODY_CINEMA_BODY_DIRECTED_ASSERTION_VERSION,
  type BodyDirectedLifecycleRecord,
} from "@shared/bodyCinemaCandidateLifecycle";
const BODY_DIRECTED_LIMIT = 30;

/** The V2 server persists snapshots, so the client deliberately renders names from the plan. */
type BodyDirectedPlanSnapshot = {
  bodyFocus: Pick<BodyDirectedFocus, "id" | "label">;
  bodyTreatment: Pick<
    BodyDirectedTreatment,
    | "id"
    | "name"
    | "promise"
    | "shotLogic"
    | "framingCropLogic"
    | "pacing"
    | "movementLogic"
  >;
  visualIdentity: Pick<
    BodyVisualIdentity,
    "id" | "name" | "description" | "gradeDirection"
  >;
  selectedTimecodes: Array<{ rangeId: string; startMs: number; endMs: number }>;
  editBlueprint: {
    heroRangeId: string;
    shots: Array<{
      id: string;
      order: number;
      sourceRangeId: string;
      startMs: number;
      endMs: number;
      intent: string;
      framing: string;
      crop?: { left: number; top: number; width: number; height: number };
      transition?: string;
      pacing?: string;
      movementInstruction?: string;
    }>;
    slowMotion?: { eligible: boolean; reason: string };
    limitations?: string[];
    excludedRanges?: Array<{ startMs: number; endMs: number; reason: string }>;
  };
  preservationConstraints?: BodyDirectedPlan["preservationConstraints"];
  providerReadyDirection?: string;
  status: "planning_only";
  noCandidateGenerated: true;
  sourceMap?: BodyDirectedSourceMap;
};

type RecommendationResult = {
  options: BodyDirectedPlanSnapshot[];
  eligibleTreatmentIds: string[];
  sourceMapHash: string | null;
  reason: string | null;
  alternatives: Array<{ id: string; label: string }>;
};

type PersistentFailure = { title: string; message: string };

function isReadyVideo(asset: MediaAssetItem): boolean {
  const video =
    String(asset.assetType || "").toLowerCase() === "video" ||
    String(asset.mimeType || "")
      .toLowerCase()
      .startsWith("video/");
  return video && String(asset.status || "ready").toLowerCase() === "ready";
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function finite(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function formatTimecode(milliseconds: number): string {
  const totalSeconds = Math.max(0, Math.floor(milliseconds / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function rangeLabel(range: { startMs: number; endMs: number }): string {
  return `${formatTimecode(range.startMs)}–${formatTimecode(range.endMs)}`;
}

function asMessage(error: unknown, fallback: string): string {
  const message = error instanceof Error ? error.message.trim() : "";
  return message && !message.startsWith("[") ? message : fallback;
}

function sourceMapFrom(
  record: BodyDirectedLifecycleRecord | null
): BodyDirectedSourceMap | null {
  return record?.analysis?.sourceMap ?? record?.treatment?.sourceMap ?? null;
}

function recordEvidence(
  record: BodyDirectedLifecycleRecord | null
): BodyDirectedFrameEvidence[] {
  return record?.analysis?.frameEvidence ?? [];
}

function mapLocalFrameEvidence(
  frames: LocalBodyCinemaFrameEvidence[]
): BodyDirectedFrameEvidence[] {
  return frames.slice(0, 24).map(frame => {
    const mapped: BodyDirectedFrameEvidence = {
      timestampMs: Math.max(0, Math.round(frame.timestampMs)),
      width: Math.max(1, Math.round(frame.width)),
      height: Math.max(1, Math.round(frame.height)),
      landmarks: frame.landmarks.map(point => ({
        x: finite(point.x) ? point.x : 0,
        y: finite(point.y) ? point.y : 0,
        ...(finite(point.z) ? { z: point.z } : {}),
        visibility:
          finite(point.x) && finite(point.y) && finite(point.visibility)
            ? clamp01(point.visibility)
            : 0,
      })),
    };
    if (finite(frame.brightness)) mapped.brightness = clamp01(frame.brightness);
    if (finite(frame.contrast)) mapped.contrast = clamp01(frame.contrast);
    if (finite(frame.sharpness)) mapped.sharpness = clamp01(frame.sharpness);
    if (finite(frame.colorWarmth)) mapped.colorWarmth = frame.colorWarmth;
    if (finite(frame.subjectCoverage))
      mapped.subjectCoverage = clamp01(frame.subjectCoverage);
    if (typeof frame.frameFingerprint === "string" && frame.frameFingerprint) {
      mapped.frameFingerprint = frame.frameFingerprint;
    }
    if (frame.face) {
      mapped.face = {
        present: Boolean(frame.face.present),
        ...(finite(frame.face.centerX) ? { centerX: frame.face.centerX } : {}),
        ...(finite(frame.face.centerY) ? { centerY: frame.face.centerY } : {}),
        ...(finite(frame.face.coverage)
          ? { coverage: clamp01(frame.face.coverage) }
          : {}),
      };
    }
    if (frame.worldLandmarks) {
      mapped.worldLandmarks = frame.worldLandmarks.map(point => ({
        x: finite(point.x) ? point.x : 0,
        y: finite(point.y) ? point.y : 0,
        z: finite(point.z) ? point.z : 0,
        visibility:
          finite(point.x) && finite(point.y) && finite(point.visibility)
            ? clamp01(point.visibility)
            : 0,
      }));
    }
    return mapped;
  });
}

/** Relevant treatments remain canonical; a source map may only narrow this list. */
export function treatmentsForBodyFocus(
  focusId: string,
  treatments: readonly BodyDirectedTreatment[] = BODY_FOCUS_TREATMENTS
): BodyDirectedTreatment[] {
  return treatments.filter(treatment =>
    treatment.bodyFocusIds.includes(focusId)
  );
}

/** Labels only appear as source-supported when the persisted map says they are eligible. */
export function sourceSupportedTreatmentLabels(
  focusId: string,
  sourceMap: BodyDirectedSourceMap | null | undefined,
  treatments: readonly BodyDirectedTreatment[] = BODY_FOCUS_TREATMENTS,
  eligibleTreatmentIds: readonly string[] = []
): string[] {
  if (
    !sourceMap ||
    !sourceMap.usableRanges.some(range =>
      range.visibleFocusIds.includes(focusId)
    )
  )
    return [];
  const eligible = new Set(eligibleTreatmentIds);
  return treatmentsForBodyFocus(focusId, treatments)
    .filter(treatment => eligible.has(treatment.id))
    .map(treatment => treatment.name);
}

export function selectedBodyPlanMatchesRanges(
  plan: BodyDirectedPlanSnapshot | null,
  rangeIds: readonly string[]
): boolean {
  const shown = plan?.selectedTimecodes.map(timecode => timecode.rangeId) ?? [];
  return Boolean(
    plan &&
    shown.length &&
    shown.length === rangeIds.length &&
    shown.every((id, index) => id === rangeIds[index])
  );
}

export function BodyDirectionChoice({
  selectedFocusId,
  sourceMap,
  onChoose,
}: {
  selectedFocusId: string | null;
  sourceMap: BodyDirectedSourceMap | null;
  onChoose?: (focusId: string) => void;
}) {
  return (
    <section aria-labelledby="body-directed-focus-title">
      <p className="bd-kicker">01 · WHAT ARE WE SHOWING OFF?</p>
      <h2 id="body-directed-focus-title" className="bd-section-title">
        LET YOUR BODY LEAD THE STORY.
      </h2>
      <p className="bd-copy">
        {sourceMap
          ? "Start with what is visible in your original. Details you mark stay creator-confirmed—not automatically detected."
          : "Source analysis has not established eligible moments yet. No focus is being guessed."}
      </p>
      <div className="bd-focus-rail" aria-label="Body focus choices">
        {BODY_FOCUS_LIBRARY.map((focus, index) => {
          const selected = focus.id === selectedFocusId;
          const measured =
            sourceMap?.usableRanges.some(
              range =>
                range.visibleFocusIds.includes(focus.id) &&
                range.visibilityProvenance === "measured_pose"
            ) ?? false;
          const creatorMarked =
            sourceMap?.usableRanges.some(
              range =>
                range.visibleFocusIds.includes(focus.id) &&
                range.visibilityProvenance === "creator_confirmed_detail"
            ) ?? false;
          return (
            <button
              key={focus.id}
              type="button"
              className={`bd-focus ${selected ? "is-selected" : ""}`}
              aria-pressed={selected}
              onClick={() => onChoose?.(focus.id)}
            >
              <span className="bd-index">
                {String(index + 1).padStart(2, "0")}
              </span>
              <strong>{focus.label}</strong>
              <span>
                {measured
                  ? "Measured in source"
                  : creatorMarked
                    ? "Confirmed by you · not independently verified"
                    : focus.requiresCreatorConfirmation
                      ? "Mark a visible moment"
                      : "Needs visible source support"}
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}

export function BodyDirectedPlanSummary({
  plan,
  frozen = false,
  onChoose,
  onSeek,
}: {
  plan: BodyDirectedPlanSnapshot | null;
  frozen?: boolean;
  onChoose?: (plan: BodyDirectedPlanSnapshot) => void;
  onSeek?: (timecode: { startMs: number; endMs: number }) => void;
}) {
  if (!plan) {
    return (
      <section className="bd-plan-empty" aria-live="polite">
        <p className="bd-kicker">SOURCE ANALYSIS</p>
        <h3>No source-supported plan yet.</h3>
        <p>
          Choose a measured focus, treatment, and grade. A plan is never filled
          in from unknown source detail.
        </p>
      </section>
    );
  }
  const firstShot = plan.editBlueprint.shots[0];
  return (
    <article className={`bd-plan-summary ${frozen ? "is-frozen" : ""}`}>
      <div className="bd-plan-topline">
        <span>
          {frozen ? "FROZEN PLAN SNAPSHOT" : "SOURCE-SUPPORTED OPTION"}
        </span>
        <span>
          {plan.status === "planning_only" ? "PLAN ONLY" : plan.status}
        </span>
      </div>
      <h3>{plan.bodyTreatment.name}</h3>
      <p className="bd-plan-identity">
        {plan.visualIdentity.name} <span>·</span> {plan.bodyFocus.label}
      </p>
      <p className="bd-plan-promise">{plan.bodyTreatment.promise}</p>
      {firstShot && (
        <p className="bd-shot-line">
          <strong>First cut</strong> {rangeLabel(firstShot)} ·{" "}
          {firstShot.intent}
        </p>
      )}
      <div className="bd-timecodes" aria-label="Source-supported timecodes">
        {plan.selectedTimecodes.map(timecode => (
          <button
            key={timecode.rangeId}
            type="button"
            className="bd-timecode"
            onClick={() => onSeek?.(timecode)}
            disabled={!onSeek}
            aria-label={`Play original from ${rangeLabel(timecode)}`}
          >
            {rangeLabel(timecode)} <span>Play original</span>
          </button>
        ))}
      </div>
      <p className="bd-plan-notice">Plan only — no candidate generated yet.</p>
      {!frozen && onChoose && (
        <button
          type="button"
          className="bd-quiet-action"
          onClick={() => onChoose(plan)}
        >
          Use this source plan
        </button>
      )}
    </article>
  );
}

function PersistentAlert({ failure }: { failure: PersistentFailure | null }) {
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    if (failure) ref.current?.focus({ preventScroll: true });
  }, [failure]);
  if (!failure) return null;
  return (
    <section
      ref={ref}
      className="bd-alert"
      role="alert"
      tabIndex={-1}
      aria-labelledby="body-directed-alert-title"
    >
      <p className="bd-kicker">SOURCE TRUTH CHECK</p>
      <h2 id="body-directed-alert-title">{failure.title}</h2>
      <p>{failure.message}</p>
    </section>
  );
}

export function BodyDirectedOriginalCaption({
  durationSeconds,
}: {
  durationSeconds?: number | null;
}) {
  return (
    <div className="bd-source-caption">
      <span>Source analysis</span>
      <span>
        {durationSeconds && durationSeconds > 0
          ? `${Math.ceil(durationSeconds)} seconds · source-bounded only`
          : "No source substitution. No generated visual."}
      </span>
    </div>
  );
}

function SourceViewer({
  sourceUrl,
  fileName,
  durationSeconds,
  videoRef,
  onSeek,
}: {
  sourceUrl: string | null;
  fileName: string;
  durationSeconds?: number | null;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  onSeek?: () => void;
}) {
  return (
    <section
      className="bd-source-viewer"
      aria-labelledby="body-directed-source-title"
    >
      <div className="bd-source-header">
        <div>
          <p className="bd-kicker">SOURCE VIEWER</p>
          <h1 id="body-directed-source-title">
            {sourceUrl ? "YOUR ORIGINAL" : "YOUR BODY. YOUR DIRECTION."}
          </h1>
        </div>
        <span className="bd-original-badge">Original · unchanged</span>
      </div>
      <div className="bd-video-frame">
        {sourceUrl ? (
          <video
            ref={videoRef}
            src={sourceUrl}
            controls
            playsInline
            preload="metadata"
            onSeeked={onSeek}
            aria-label="Original source video"
          />
        ) : (
          <div className="bd-video-empty">
            <span>YOUR ORIGINAL HOLDS THIS FRAME</span>
            <strong>Pick one ready video from Your Vault.</strong>
          </div>
        )}
      </div>
      <BodyDirectedOriginalCaption durationSeconds={durationSeconds} />
    </section>
  );
}

function CreatorDetailMark({
  focus,
  videoRef,
  durationSeconds,
  marks,
  disabled,
  onSave,
}: {
  focus: BodyDirectedFocus | null;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  durationSeconds: number | null;
  marks: BodyDirectedDetailObservation[];
  disabled: boolean;
  onSave: (startMs: number, endMs: number) => void;
}) {
  const [startMs, setStartMs] = useState<number | null>(null);
  const [endMs, setEndMs] = useState<number | null>(null);
  const currentMs = () =>
    Math.max(0, Math.round((videoRef.current?.currentTime || 0) * 1000));
  const focusMarks = marks.filter(mark => mark.bodyFocusId === focus?.id);

  useEffect(() => {
    setStartMs(null);
    setEndMs(null);
  }, [focus?.id]);

  if (!focus?.requiresCreatorConfirmation) return null;
  return (
    <section
      className="bd-creator-mark"
      aria-labelledby="body-directed-mark-title"
    >
      <p className="bd-kicker">CREATOR VISIBLE-DETAIL MARK</p>
      <h3 id="body-directed-mark-title">
        Confirm a real {focus.label.toLowerCase()} moment in your original.
      </h3>
      <p>
        Creator-marked visible detail — not automated detection. Move the
        original video to the moment, mark its start and end, then confirm only
        what is visibly present.
      </p>
      <div className="bd-mark-controls">
        <button
          type="button"
          className="bd-quiet-action"
          onClick={() => setStartMs(currentMs())}
          disabled={disabled}
        >
          Mark start {startMs === null ? "" : formatTimecode(startMs)}
        </button>
        <button
          type="button"
          className="bd-quiet-action"
          onClick={() => setEndMs(currentMs())}
          disabled={disabled}
        >
          Mark end {endMs === null ? "" : formatTimecode(endMs)}
        </button>
        <button
          type="button"
          className="bd-primary-action"
          disabled={
            disabled ||
            startMs === null ||
            endMs === null ||
            endMs <= startMs ||
            (durationSeconds !== null && endMs > durationSeconds * 1000)
          }
          onClick={() => {
            if (startMs !== null && endMs !== null) onSave(startMs, endMs);
          }}
        >
          Confirm visible here
        </button>
      </div>
      {focusMarks.length > 0 && (
        <p className="bd-marked-list">
          Saved visible moments: {focusMarks.map(rangeLabel).join(", ")}
        </p>
      )}
    </section>
  );
}

function TreatmentRail({
  focusId,
  selectedTreatmentId,
  sourceMap,
  eligibleTreatmentIds,
  onChoose,
}: {
  focusId: string | null;
  selectedTreatmentId: string | null;
  sourceMap: BodyDirectedSourceMap | null;
  eligibleTreatmentIds: readonly string[];
  onChoose: (treatmentId: string) => void;
}) {
  const treatments = focusId ? treatmentsForBodyFocus(focusId) : [];
  const eligible = new Set(eligibleTreatmentIds);
  if (!focusId) return null;
  return (
    <section
      className="bd-treatment-section"
      aria-labelledby="body-directed-treatment-title"
    >
      <p className="bd-kicker">02 · PICK YOUR CINEMATIC TREATMENT</p>
      <h2 id="body-directed-treatment-title" className="bd-section-title">
        An edit language, not a visual filter.
      </h2>
      <div className="bd-treatment-rail">
        {treatments.map((treatment, index) => {
          const selected = selectedTreatmentId === treatment.id;
          const sourceEligible = eligible.has(treatment.id);
          return (
            <button
              key={treatment.id}
              type="button"
              className={`bd-treatment ${selected ? "is-selected" : ""}`}
              onClick={() => onChoose(treatment.id)}
              aria-pressed={selected}
            >
              <span className="bd-index">
                TREATMENT {String(index + 1).padStart(2, "0")}
              </span>
              <strong>{treatment.name}</strong>
              <span className="bd-treatment-promise">{treatment.promise}</span>
              <span className="bd-treatment-logic">
                <b>First-shot logic</b> {treatment.shotLogic}
              </span>
              <span
                className={sourceEligible ? "bd-source-yes" : "bd-source-no"}
              >
                {sourceEligible
                  ? "Supported by your source"
                  : "Needs a different supported source moment"}
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}

function MoodRail({
  treatmentId,
  selectedMoodId,
  onChoose,
}: {
  treatmentId: string | null;
  selectedMoodId: string | null;
  onChoose: (moodId: string) => void;
}) {
  const treatment =
    BODY_FOCUS_TREATMENTS.find(item => item.id === treatmentId) ?? null;
  const identities = treatment
    ? BODY_VISUAL_IDENTITIES.filter(identity =>
        treatment.suggestedVisualIdentityIds.includes(identity.id)
      )
    : [];
  if (!treatment) return null;
  return (
    <section
      className="bd-mood-section"
      aria-labelledby="body-directed-mood-title"
    >
      <p className="bd-kicker">03 · CHOOSE THE MOOD</p>
      <h2 id="body-directed-mood-title" className="bd-section-title">
        The grade directs the look. It does not change the original.
      </h2>
      <div className="bd-mood-rail">
        {identities.map(identity => (
          <button
            key={identity.id}
            type="button"
            className={`bd-mood ${identity.id === selectedMoodId ? "is-selected" : ""}`}
            onClick={() => onChoose(identity.id)}
            aria-pressed={identity.id === selectedMoodId}
          >
            <strong>{identity.name}</strong>
            <span>{identity.gradeDirection}</span>
          </button>
        ))}
      </div>
    </section>
  );
}

function FrozenPlan({
  plan,
  sourceMap,
  onSeek,
}: {
  plan: BodyDirectedPlanSnapshot;
  sourceMap: BodyDirectedSourceMap | null;
  onSeek: (timecode: { startMs: number; endMs: number }) => void;
}) {
  return (
    <section className="bd-frozen" aria-labelledby="body-directed-frozen-title">
      <p className="bd-kicker">LOCKED · SOURCE-BOUNDED</p>
      <h2 id="body-directed-frozen-title" className="bd-section-title">
        This plan is saved exactly as selected.
      </h2>
      <BodyDirectedPlanSummary plan={plan} frozen onSeek={onSeek} />
      <div className="bd-frozen-detail">
        <h3>Shot order</h3>
        <ol>
          {plan.editBlueprint.shots.map(shot => (
            <li key={shot.id}>
              <span>{String(shot.order).padStart(2, "0")}</span>
              <p>
                <strong>{rangeLabel(shot)}</strong> · {shot.intent}
              </p>
            </li>
          ))}
        </ol>
        <p className="bd-plan-notice">
          Plan only — no candidate generated yet.
        </p>
      </div>
      <details className="bd-details">
        <summary>Details</summary>
        <p>Original SHA-256: {sourceMap?.source.sha256 ?? "Unavailable"}</p>
        <p>Excluded source ranges: {sourceMap?.excludedRanges.length ?? 0}</p>
        {plan.editBlueprint.limitations?.length ? (
          <p>{plan.editBlueprint.limitations.join(" ")}</p>
        ) : null}
      </details>
    </section>
  );
}

export default function BodyDirectedDirector({
  initialSourceAssetId = null,
  lifecycleId = null,
}: {
  initialSourceAssetId?: string | null;
  lifecycleId?: string | null;
}) {
  const lifecycleApi = trpc.bodyCinema.lifecycle;
  // This identity is intentionally initialized once. A parent re-render must not
  // clear a newly qualified record before history has settled.
  const [localLifecycleId, setLocalLifecycleId] = useState<string | null>(
    () => lifecycleId
  );
  const [localRecord, setLocalRecord] =
    useState<BodyDirectedLifecycleRecord | null>(null);
  const [selectedSource, setSelectedSource] = useState<MediaAssetItem | null>(
    null
  );
  const [pickerOpen, setPickerOpen] = useState(false);
  const [asserted, setAsserted] = useState(false);
  const [selectedFocusId, setSelectedFocusId] = useState<string | null>(null);
  const [selectedTreatmentId, setSelectedTreatmentId] = useState<string | null>(
    null
  );
  const [selectedMoodId, setSelectedMoodId] = useState<string | null>(null);
  const [selectedRangeIds, setSelectedRangeIds] = useState<string[]>([]);
  const [creatorMarks, setCreatorMarks] = useState<
    BodyDirectedDetailObservation[]
  >([]);
  const [measurementCache, setMeasurementCache] = useState<{
    sourceSha256: string;
    frames: BodyDirectedFrameEvidence[];
  } | null>(null);
  const measuredEvidence = measurementCache?.frames ?? [];
  const [analysisStage, setAnalysisStage] = useState<string | null>(null);
  const [failure, setFailure] = useState<PersistentFailure | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const originalClip = useRef<{
    startSeconds: number;
    endSeconds: number;
  } | null>(null);

  const listQuery = lifecycleApi.listBodyDirected.useQuery(
    { limit: BODY_DIRECTED_LIMIT },
    { staleTime: 15_000 }
  );
  const activeQuery = lifecycleApi.getBodyDirected.useQuery(
    { id: localLifecycleId ?? "" },
    { enabled: Boolean(localLifecycleId), staleTime: 10_000 }
  );
  const queriedRecord = (activeQuery.data ??
    null) as BodyDirectedLifecycleRecord | null;
  const record = localRecord ?? queriedRecord;
  const sourceMap = sourceMapFrom(record);

  useEffect(() => {
    if (queriedRecord) setLocalRecord(queriedRecord);
  }, [queriedRecord]);

  useEffect(() => {
    if (record?.analysis?.detailObservations)
      setCreatorMarks(record.analysis.detailObservations);
  }, [record?.analysis?.detailObservations]);

  useEffect(() => {
    if (record?.analysis?.frameEvidence?.length)
      setMeasurementCache({
        sourceSha256: record.source.sha256,
        frames: record.analysis.frameEvidence,
      });
  }, [record?.analysis?.frameEvidence]);

  const recommendationQuery = lifecycleApi.recommendBodyDirected.useQuery(
    {
      id: record?.id ?? "",
      bodyFocusId: selectedFocusId ?? undefined,
      bodyTreatmentId: selectedTreatmentId ?? undefined,
      visualIdentityId: selectedMoodId ?? undefined,
    },
    {
      enabled: Boolean(
        record && record.state === "qualified" && sourceMap && selectedFocusId
      ),
      staleTime: 0,
    }
  );
  const recommendations = (
    recommendationQuery.data?.sourceMapHash === record?.analysis?.sourceMapHash
      ? recommendationQuery.data
      : null
  ) as RecommendationResult | null;
  const selectedPlan =
    recommendations?.options.find(
      plan =>
        plan.bodyFocus.id === selectedFocusId &&
        plan.bodyTreatment.id === selectedTreatmentId &&
        plan.visualIdentity.id === selectedMoodId
    ) ?? null;
  const selectionMatchesShownPlan = selectedBodyPlanMatchesRanges(
    selectedPlan,
    selectedRangeIds
  );

  const qualifyMutation = lifecycleApi.qualifyBodyDirected.useMutation();
  const analyzeMutation = lifecycleApi.analyzeBodyDirected.useMutation();
  const freezeMutation = lifecycleApi.freezeBodyDirected.useMutation();
  const utils = trpc.useUtils();
  const isBusy =
    Boolean(analysisStage) ||
    qualifyMutation.isPending ||
    analyzeMutation.isPending ||
    freezeMutation.isPending;

  // A route prefill only stages a choice in MediaPicker. The client must still
  // receive the actual ready asset back from that owned-source picker.
  const sourceAssetId = selectedSource?.id ?? null;
  const sourceUrl = record
    ? `/api/body-cinema/lifecycle/${encodeURIComponent(record.id)}/source`
    : (selectedSource?.publicUrl ?? null);
  const sourceFileName =
    record?.source.fileName ??
    selectedSource?.originalName ??
    selectedSource?.fileName ??
    "";
  const sourceDuration =
    record?.source.durationSeconds ?? selectedSource?.duration ?? null;
  const selectedFocus =
    BODY_FOCUS_LIBRARY.find(focus => focus.id === selectedFocusId) ?? null;
  const savedRecords = (listQuery.data ?? []) as BodyDirectedLifecycleRecord[];
  const isLegacyConflict = Boolean(
    localLifecycleId &&
    !activeQuery.isLoading &&
    !activeQuery.isError &&
    activeQuery.data === null &&
    !localRecord
  );

  const persistLifecycleId = useCallback((id: string) => {
    const next = new URLSearchParams(window.location.search);
    next.set("lifecycleId", id);
    next.delete("sourceAssetId");
    window.history.replaceState(
      window.history.state,
      "",
      `/vault-x/studio?${next.toString()}`
    );
    setLocalLifecycleId(id);
  }, []);

  const analyzeRecord = useCallback(
    async (
      lifecycle: BodyDirectedLifecycleRecord,
      detailObservations: BodyDirectedDetailObservation[] = [],
      knownEvidence?: BodyDirectedFrameEvidence[],
      context: "analysis" | "creator_mark" = "analysis"
    ) => {
      setFailure(null);
      try {
        let evidence = knownEvidence?.length
          ? knownEvidence
          : measurementCache?.sourceSha256 === lifecycle.source.sha256
            ? measurementCache.frames
            : [];
        if (!evidence.length) {
          const local = await analyzeBodyCinemaOwnedSource({
            sourceUrl: `/api/body-cinema/lifecycle/${encodeURIComponent(lifecycle.id)}/source`,
            sourceSha256: lifecycle.source.sha256,
            fileName: lifecycle.source.fileName,
            onStage: setAnalysisStage,
          });
          if (
            local.sourceFingerprint.toLowerCase() !==
            lifecycle.source.sha256.toLowerCase()
          ) {
            throw new Error(
              "The original's bytes no longer match the saved source. Analysis is stopped."
            );
          }
          evidence = mapLocalFrameEvidence(local.frameEvidence);
          if (!evidence.length)
            throw new Error(
              "No measurable source frames were available. The original and saved plan remain unchanged."
            );
          setMeasurementCache({
            sourceSha256: lifecycle.source.sha256,
            frames: evidence,
          });
        }
        setAnalysisStage(
          "Saving your source moments. No candidate is being generated."
        );
        const result = (await analyzeMutation.mutateAsync({
          id: lifecycle.id,
          sourceSha256: lifecycle.source.sha256,
          frameEvidence: evidence,
          ...(detailObservations.length ? { detailObservations } : {}),
        })) as BodyDirectedLifecycleRecord;
        setLocalRecord(result);
        setSelectedRangeIds([]);
        setCreatorMarks(
          result.analysis?.detailObservations ?? detailObservations
        );
        setAnalysisStage(null);
        await Promise.all([
          utils.bodyCinema.lifecycle.getBodyDirected.invalidate({
            id: lifecycle.id,
          }),
          utils.bodyCinema.lifecycle.listBodyDirected.invalidate({
            limit: BODY_DIRECTED_LIMIT,
          }),
          utils.bodyCinema.lifecycle.recommendBodyDirected.invalidate({
            id: lifecycle.id,
          }),
        ]);
      } catch (error) {
        setAnalysisStage(null);
        setCreatorMarks(lifecycle.analysis?.detailObservations ?? []);
        const measuredFocusIds = new Set(
          sourceMapFrom(lifecycle)?.usableRanges.flatMap(
            range => range.visibleFocusIds
          ) ?? []
        );
        const closestMeasuredLabels = BODY_FOCUS_LIBRARY.filter(
          focus =>
            !focus.requiresCreatorConfirmation && measuredFocusIds.has(focus.id)
        ).map(focus => focus.label);
        const alternatives = (
          closestMeasuredLabels.length ? closestMeasuredLabels : []
        ).join(" · ");
        setFailure({
          title:
            context === "creator_mark"
              ? "Visible-detail mark could not be saved"
              : "Source analysis could not continue",
          message:
            context === "creator_mark"
              ? `${asMessage(error, "That visible range cannot be recorded against the saved original.")}${alternatives ? ` Closest measured alternatives: ${alternatives}.` : " No alternative focus is confirmed yet; read the original again."}`
              : asMessage(
                  error,
                  "The original could not be measured locally. Retry when the saved original is available; no source map or plan was invented."
                ),
        });
      }
    },
    [analyzeMutation, measurementCache, utils.bodyCinema.lifecycle]
  );

  const chooseSource = useCallback((assets: MediaAssetItem[]) => {
    const asset = assets[0];
    setPickerOpen(false);
    setFailure(null);
    if (!asset || !isReadyVideo(asset)) {
      setFailure({
        title: "Choose a ready original",
        message:
          "This lane accepts a ready video from Your Vault only. No unavailable or non-video source is substituted.",
      });
      return;
    }
    setMeasurementCache(null);
    setCreatorMarks([]);
    setSelectedFocusId(null);
    setSelectedTreatmentId(null);
    setSelectedMoodId(null);
    setSelectedRangeIds([]);
    setSelectedSource(asset);
    setAsserted(false);
  }, []);

  const qualifyAndAnalyze = useCallback(async () => {
    if (!sourceAssetId) {
      setFailure({
        title: "Choose your original first",
        message:
          "Select one ready creator-owned video from Your Vault before source analysis.",
      });
      return;
    }
    if (!asserted) {
      setFailure({
        title: "Creator declaration required",
        message:
          "Confirm your source and performer-likeness declaration. This is a creator assertion, not an independent rights verification.",
      });
      return;
    }
    setFailure(null);
    try {
      const result = (await qualifyMutation.mutateAsync({
        sourceAssetId,
        rights: {
          version: BODY_CINEMA_BODY_DIRECTED_ASSERTION_VERSION,
          ownSource: true,
          performerLikenessConsent: true,
          treatmentScope: "body_directed_source_analysis_and_plan_only",
          intendedUse: "source_analysis_and_plan_only",
          acknowledgesNoIndependentVerification: true,
        },
      })) as BodyDirectedLifecycleRecord;
      persistLifecycleId(result.id);
      setLocalRecord(result);
      await Promise.all([
        utils.bodyCinema.lifecycle.getBodyDirected.invalidate({
          id: result.id,
        }),
        utils.bodyCinema.lifecycle.listBodyDirected.invalidate({
          limit: BODY_DIRECTED_LIMIT,
        }),
      ]);
      await analyzeRecord(result, []);
    } catch (error) {
      setFailure({
        title: "Original could not be qualified",
        message: asMessage(
          error,
          "The saved original conflicts with the lifecycle requirements. Choose another ready Vault video; no source map was created."
        ),
      });
    }
  }, [
    analyzeRecord,
    asserted,
    persistLifecycleId,
    qualifyMutation,
    sourceAssetId,
    utils.bodyCinema.lifecycle,
  ]);

  const chooseFocus = useCallback((focusId: string) => {
    setSelectedFocusId(focusId);
    setSelectedTreatmentId(null);
    setSelectedMoodId(null);
    setSelectedRangeIds([]);
    setFailure(null);
  }, []);

  const saveCreatorMark = useCallback(
    async (startMs: number, endMs: number) => {
      if (!record || !selectedFocus) return;
      const observation: BodyDirectedDetailObservation = {
        bodyFocusId: selectedFocus.id,
        startMs,
        endMs,
        confirmedVisible: true,
        provenance: "creator_visible_region_confirmation",
      };
      const detailObservations = [...creatorMarks, observation];
      const evidence =
        measurementCache?.sourceSha256 === record.source.sha256
          ? measurementCache.frames
          : recordEvidence(record);
      if (!evidence.length) {
        setFailure({
          title: "Measure the source first",
          message:
            "A creator mark needs already-saved measured frames. Retry Source analysis before confirming a visible detail.",
        });
        return;
      }
      await analyzeRecord(record, detailObservations, evidence, "creator_mark");
    },
    [analyzeRecord, creatorMarks, measurementCache, record, selectedFocus]
  );

  const choosePlan = useCallback((plan: BodyDirectedPlanSnapshot) => {
    setSelectedFocusId(plan.bodyFocus.id);
    setSelectedTreatmentId(plan.bodyTreatment.id);
    setSelectedMoodId(plan.visualIdentity.id);
    setSelectedRangeIds(
      plan.selectedTimecodes.map(timecode => timecode.rangeId)
    );
  }, []);

  const seekOriginal = useCallback(
    (timecode: { startMs: number; endMs: number }) => {
      const video = videoRef.current;
      if (!video) return;
      originalClip.current = {
        startSeconds: timecode.startMs / 1000,
        endSeconds: timecode.endMs / 1000,
      };
      video.currentTime = timecode.startMs / 1000;
      // This follows an explicit click on a source-supported clip; the original
      // never starts on its own.
      void video.play().catch(() => undefined);
    },
    []
  );

  useEffect(() => {
    originalClip.current = null;
    const video = videoRef.current;
    if (!video) return;
    const stopAtSourceEnd = () => {
      const clip = originalClip.current;
      if (clip && video.currentTime >= clip.endSeconds) {
        video.pause();
        originalClip.current = null;
      }
    };
    const preserveManualScrubbing = () => {
      const clip = originalClip.current;
      if (
        clip &&
        (video.currentTime < clip.startSeconds - 0.1 ||
          video.currentTime > clip.endSeconds + 0.1)
      )
        originalClip.current = null;
    };
    const showPlaybackFailure = () =>
      setFailure({
        title: "Original unavailable",
        message:
          "Your original could not be played. No replacement or generated preview has been shown; the saved plan remains unchanged.",
      });
    video.addEventListener("timeupdate", stopAtSourceEnd);
    video.addEventListener("seeking", preserveManualScrubbing);
    video.addEventListener("error", showPlaybackFailure);
    return () => {
      video.removeEventListener("timeupdate", stopAtSourceEnd);
      video.removeEventListener("seeking", preserveManualScrubbing);
      video.removeEventListener("error", showPlaybackFailure);
    };
  }, [sourceUrl]);

  const freezePlan = useCallback(async () => {
    if (
      !record ||
      !sourceMap ||
      !selectedFocusId ||
      !selectedTreatmentId ||
      !selectedMoodId
    )
      return;
    const sourceMapHash = record.analysis?.sourceMapHash;
    if (!sourceMapHash) {
      setFailure({
        title: "Read the original first",
        message:
          "The saved source map is unavailable. No plan can be locked without its exact source-bound snapshot.",
      });
      return;
    }
    if (!selectionMatchesShownPlan || recommendationQuery.isFetching) {
      setFailure({
        title: "Choose the current source plan",
        message:
          "Your source moments changed. Select a current option before locking; no different range subset will be saved silently.",
      });
      return;
    }
    setFailure(null);
    try {
      const result = (await freezeMutation.mutateAsync({
        id: record.id,
        sourceMapHash,
        bodyFocusId: selectedFocusId,
        bodyTreatmentId: selectedTreatmentId,
        visualIdentityId: selectedMoodId,
        selectedRangeIds,
      })) as BodyDirectedLifecycleRecord;
      setLocalRecord(result);
      await Promise.all([
        utils.bodyCinema.lifecycle.getBodyDirected.invalidate({
          id: result.id,
        }),
        utils.bodyCinema.lifecycle.listBodyDirected.invalidate({
          limit: BODY_DIRECTED_LIMIT,
        }),
      ]);
    } catch (error) {
      setFailure({
        title: "Plan could not lock",
        message: asMessage(
          error,
          "The selected combination is not fully supported by the saved source map. Choose one of the source-supported options instead."
        ),
      });
    }
  }, [
    freezeMutation,
    record,
    selectedFocusId,
    selectedMoodId,
    selectedRangeIds,
    selectedTreatmentId,
    selectionMatchesShownPlan,
    recommendationQuery.isFetching,
    sourceMap,
    utils.bodyCinema.lifecycle,
  ]);

  const supportedLabels = selectedFocusId
    ? sourceSupportedTreatmentLabels(
        selectedFocusId,
        sourceMap,
        BODY_FOCUS_TREATMENTS,
        recommendations?.eligibleTreatmentIds ?? []
      )
    : [];

  return (
    <div className="body-directed-director">
      <style>{`
        .body-directed-director { --bd-void:#0A0A0A; --bd-surface:#1A1A1A; --bd-lift:#22221f; --bd-line:rgba(255,255,255,.14); --bd-copy:#E8E8E3; --bd-muted:rgba(232,232,227,.72); --bd-cyan:#00D9FF; --bd-gold:#C9A84C; background:radial-gradient(900px 540px at 0 0, rgba(0,217,255,.08), transparent 62%), var(--bd-void); color:#fff; min-height:100%; padding:clamp(24px,4vw,56px); font-family:"DM Sans", Inter, sans-serif; font-size:16px; line-height:1.5; }
        .body-directed-director * { box-sizing:border-box; }
        .body-directed-director button { font:inherit; }
        .bd-layout { display:grid; grid-template-columns:minmax(0,1.38fr) minmax(330px,1fr); gap:clamp(26px,4vw,58px); max-width:1500px; margin:auto; align-items:start; }
        .bd-source-column { position:sticky; top:24px; }
        .bd-work-column { min-width:0; display:grid; gap:34px; }
        .bd-source-viewer { background:linear-gradient(155deg,#181817,#0b0b0b 64%); border:1px solid var(--bd-line); box-shadow:0 24px 80px rgba(0,0,0,.35); padding:clamp(18px,2.7vw,34px); }
        .bd-source-header, .bd-source-caption, .bd-plan-topline { display:flex; justify-content:space-between; gap:16px; align-items:flex-start; }
        .bd-kicker, .bd-index, .bd-plan-topline { color:var(--bd-cyan); font-size:12px; font-weight:800; letter-spacing:.12em; text-transform:uppercase; margin:0 0 8px; }
        .bd-source-header h1, .bd-section-title, .bd-alert h2, .bd-frozen h2 { font-family:"Bebas Neue", Impact, sans-serif; letter-spacing:.025em; line-height:.95; font-weight:400; }
        .bd-source-header h1 { font-size:clamp(34px,4vw,64px); margin:0; max-width:550px; overflow-wrap:anywhere; }
        .bd-original-badge { border:1px solid rgba(201,168,76,.56); color:#f5df9a; padding:8px 10px; font-weight:700; white-space:nowrap; }
        .bd-video-frame { margin-top:24px; width:100%; min-height:clamp(280px,51vw,660px); background:#030303; display:grid; place-items:center; border:1px solid rgba(255,255,255,.08); }
        .bd-video-frame video { width:100%; height:100%; max-height:660px; object-fit:contain; display:block; background:#030303; }
        .bd-video-empty { display:grid; place-items:center; gap:8px; text-align:center; color:var(--bd-copy); padding:45px 24px; min-height:280px; }
        .bd-video-empty span { color:var(--bd-cyan); font-size:12px; font-weight:800; letter-spacing:.1em; }
        .bd-video-empty strong { font-family:"Bebas Neue", Impact, sans-serif; font-size:30px; font-weight:400; }
        .bd-source-caption { margin-top:14px; color:var(--bd-muted); font-size:16px; }
        .bd-source-caption span:first-child { color:#fff; font-weight:700; }
        .bd-hero-copy { border-left:2px solid var(--bd-gold); padding:4px 0 4px 18px; }
        .bd-hero-copy h2 { font-family:"Bebas Neue", Impact, sans-serif; font-size:clamp(34px,4vw,58px); font-weight:400; line-height:.94; letter-spacing:.025em; margin:0; }
        .bd-hero-copy p, .bd-copy, .bd-creator-mark p, .bd-alert p, .bd-plan-empty p { color:var(--bd-copy); margin:12px 0 0; }
        .bd-source-action { display:grid; gap:16px; border-top:1px solid var(--bd-line); padding-top:24px; }
        .bd-selection-line { display:flex; justify-content:space-between; align-items:center; gap:14px; color:var(--bd-copy); }
        .bd-selection-line strong { overflow-wrap:anywhere; }
        .bd-primary-action, .bd-quiet-action { min-height:48px; padding:12px 16px; border:1px solid var(--bd-cyan); cursor:pointer; transition:background .18s ease,color .18s ease,transform .18s ease; }
        .bd-primary-action { background:var(--bd-cyan); color:#071013; font-weight:900; }
        .bd-quiet-action { background:transparent; color:#fff; font-weight:750; }
        .bd-primary-action:hover:not(:disabled), .bd-quiet-action:hover:not(:disabled) { transform:translateY(-2px); }
        .bd-quiet-action:hover:not(:disabled) { background:rgba(0,217,255,.1); }
        .bd-primary-action:disabled, .bd-quiet-action:disabled { opacity:.42; cursor:not-allowed; }
        .bd-assertion { display:flex; gap:12px; align-items:flex-start; color:var(--bd-copy); cursor:pointer; }
        .bd-assertion input { width:20px; height:20px; margin:2px 0 0; accent-color:var(--bd-cyan); flex:0 0 auto; }
        .bd-assertion span { display:block; }
        .bd-assertion small { display:block; margin-top:5px; color:var(--bd-muted); font-size:14px; }
        .bd-status-line { color:var(--bd-cyan); font-weight:700; margin:0; }
        .bd-alert { border:1px solid rgba(201,168,76,.65); border-left:4px solid var(--bd-gold); background:rgba(201,168,76,.09); padding:22px; outline:none; }
        .bd-alert h2 { font-size:34px; margin:0; }
        .bd-alert .bd-kicker { color:#f5df9a; }
        .bd-focus-rail, .bd-treatment-rail, .bd-mood-rail { display:flex; gap:12px; overflow-x:auto; padding:2px 2px 12px; scrollbar-color:rgba(0,217,255,.45) transparent; }
        .bd-focus { min-width:144px; min-height:145px; padding:16px; text-align:left; display:flex; flex-direction:column; justify-content:space-between; gap:9px; background:transparent; color:var(--bd-copy); border:1px solid var(--bd-line); cursor:pointer; }
        .bd-focus strong { font-family:"Bebas Neue", Impact, sans-serif; color:#fff; font-weight:400; font-size:29px; letter-spacing:.025em; }
        .bd-focus span:last-child { font-size:14px; color:var(--bd-muted); line-height:1.35; }
        .bd-focus:hover, .bd-focus.is-selected { border-color:var(--bd-cyan); background:linear-gradient(145deg,rgba(0,217,255,.12),transparent); }
        .bd-focus.is-selected strong { color:var(--bd-cyan); }
        .bd-section-title { margin:0; font-size:clamp(33px,3.6vw,52px); }
        .bd-treatment-section, .bd-mood-section { border-top:1px solid var(--bd-line); padding-top:27px; }
        .bd-treatment { flex:0 0 min(315px,84vw); min-height:290px; padding:20px; background:linear-gradient(155deg,#1d1d1b,#111); border:1px solid var(--bd-line); color:var(--bd-copy); text-align:left; display:flex; flex-direction:column; gap:12px; cursor:pointer; }
        .bd-treatment:hover, .bd-treatment.is-selected { border-color:var(--bd-gold); box-shadow:inset 0 0 0 1px rgba(201,168,76,.22); }
        .bd-treatment.is-selected { background:linear-gradient(155deg,rgba(201,168,76,.15),#111); }
        .bd-treatment strong { font-family:"Bebas Neue", Impact, sans-serif; color:#fff; font-weight:400; font-size:37px; letter-spacing:.02em; line-height:.9; }
        .bd-treatment-promise { font-weight:700; line-height:1.35; }
        .bd-treatment-logic { color:var(--bd-muted); font-size:14px; line-height:1.42; }
        .bd-treatment-logic b { display:block; color:var(--bd-cyan); font-size:12px; letter-spacing:.08em; text-transform:uppercase; margin-bottom:3px; }
        .bd-source-yes, .bd-source-no { margin-top:auto; font-size:13px; font-weight:800; letter-spacing:.04em; }
        .bd-source-yes { color:var(--bd-cyan); }.bd-source-no { color:#e8c878; }
        .bd-mood { flex:0 0 min(242px,70vw); min-height:136px; padding:18px; background:transparent; border:1px solid var(--bd-line); color:var(--bd-copy); text-align:left; cursor:pointer; display:grid; align-content:space-between; gap:12px; }
        .bd-mood strong { font-family:"Bebas Neue", Impact, sans-serif; font-size:31px; font-weight:400; letter-spacing:.025em; color:#fff; }.bd-mood span { font-size:14px; line-height:1.35; color:var(--bd-muted); }.bd-mood:hover,.bd-mood.is-selected { border-color:var(--bd-cyan); background:rgba(0,217,255,.08); }.bd-mood.is-selected strong{color:var(--bd-cyan);}
        .bd-creator-mark { border:1px solid rgba(0,217,255,.35); background:rgba(0,217,255,.055); padding:20px; }.bd-creator-mark h3 { font-family:"Bebas Neue", Impact, sans-serif; letter-spacing:.025em; font-weight:400; font-size:31px; line-height:.95; margin:0; }.bd-mark-controls { display:flex; flex-wrap:wrap; gap:10px; margin-top:17px; }.bd-marked-list { color:var(--bd-cyan) !important; font-weight:700; }
        .bd-options { border-top:1px solid var(--bd-line); padding-top:27px; }.bd-options-heading { display:flex; justify-content:space-between; gap:18px; align-items:flex-end; }.bd-options-heading h2{margin:0;}.bd-options-heading p{color:var(--bd-muted); margin:0; text-align:right;}.bd-options-list { display:grid; gap:14px; margin-top:18px; }
        .bd-plan-summary, .bd-plan-empty { border:1px solid var(--bd-line); background:linear-gradient(140deg,#1a1a18,#101010); padding:22px; }.bd-plan-summary.is-frozen { border-color:rgba(201,168,76,.58); }.bd-plan-topline { color:var(--bd-gold); margin:0 0 16px; }.bd-plan-summary h3, .bd-plan-empty h3 { font-family:"Bebas Neue", Impact, sans-serif; letter-spacing:.025em; font-weight:400; line-height:.9; font-size:44px; margin:0; }.bd-plan-identity { color:var(--bd-cyan); margin:8px 0 0; font-weight:800; }.bd-plan-identity span { color:var(--bd-muted); padding:0 6px; }.bd-plan-promise { color:var(--bd-copy); font-size:17px; margin:16px 0 0; }.bd-shot-line { border-left:2px solid var(--bd-gold); color:var(--bd-copy); margin:18px 0; padding-left:11px; }.bd-shot-line strong { display:block; color:#f5df9a; font-size:12px; letter-spacing:.1em; text-transform:uppercase; }.bd-timecodes { display:flex; flex-wrap:wrap; gap:8px; }.bd-timecodes span { border:1px solid rgba(0,217,255,.35); color:var(--bd-cyan); padding:5px 7px; font-size:13px; font-weight:800; }.bd-plan-notice { color:#f5df9a; font-weight:750; margin:18px 0 0; }.bd-plan-summary .bd-quiet-action { margin-top:18px; }
        .bd-timecode { appearance:none; border:1px solid rgba(0,217,255,.35); background:rgba(0,217,255,.06); color:var(--bd-cyan); padding:6px 8px; font-size:13px; font-weight:800; cursor:pointer; }.bd-timecode:hover:not(:disabled){background:rgba(0,217,255,.16);}.bd-timecode:disabled{cursor:default;opacity:1;}.bd-timecode span{border:0;padding:0;color:var(--bd-copy);font-size:11px;margin-left:5px;}.bd-frozen { border-top:2px solid var(--bd-gold); padding-top:25px; }.bd-frozen-detail { border-left:1px solid var(--bd-line); margin-top:18px; padding:4px 0 4px 18px; }.bd-frozen-detail h3{font-family:"Bebas Neue",Impact,sans-serif;font-size:32px;font-weight:400;margin:0;}.bd-frozen-detail ol{list-style:none;padding:0;margin:10px 0;display:grid;gap:10px;}.bd-frozen-detail li{display:flex;gap:12px;align-items:flex-start;}.bd-frozen-detail li>span{color:var(--bd-gold);font-weight:900;}.bd-frozen-detail li p{margin:0;color:var(--bd-copy);}.bd-details{border-top:1px solid var(--bd-line);margin-top:20px;padding-top:14px;color:var(--bd-muted);}.bd-details summary{color:#fff;cursor:pointer;font-weight:800;}.bd-details p{overflow-wrap:anywhere;}
        .bd-unsupported { border:1px solid rgba(201,168,76,.45); background:rgba(201,168,76,.07); padding:16px; color:var(--bd-copy); }.bd-unsupported strong{color:#f5df9a;}.bd-alternatives{display:flex;flex-wrap:wrap;gap:8px;margin-top:12px;}.bd-alternatives span{border:1px solid rgba(201,168,76,.45);padding:5px 8px;color:#f5df9a;font-size:14px;}
        .bd-plan-lock { display:flex; align-items:center; justify-content:space-between; gap:15px; border-top:1px solid var(--bd-line); padding-top:20px; }.bd-plan-lock p { color:var(--bd-muted); margin:0; }.bd-library { border-top:1px solid var(--bd-line); padding-top:15px; }.bd-library summary { cursor:pointer; font-weight:800; color:var(--bd-copy); }.bd-library-list { display:grid; gap:8px; margin-top:14px; }.bd-library-list a { display:flex; justify-content:space-between; gap:12px; color:var(--bd-copy); text-decoration:none; border-bottom:1px solid var(--bd-line); padding:10px 0; }.bd-library-list a:hover{color:var(--bd-cyan);}.bd-library-list span:last-child{color:var(--bd-cyan);font-size:14px;font-weight:800;}
        @media (max-width: 880px) { .body-directed-director { padding:20px; }.bd-layout { grid-template-columns:1fr; }.bd-source-column { position:static; order:-1; }.bd-video-frame { min-height:245px; }.bd-source-header h1 { font-size:43px; }.bd-options-heading { display:block; }.bd-options-heading p { margin-top:10px; text-align:left; }.bd-plan-lock { align-items:stretch; flex-direction:column; }.bd-primary-action,.bd-quiet-action { min-height:50px; } }
        @media (max-width: 520px) { .body-directed-director { padding:16px; }.bd-source-viewer { padding:16px; }.bd-source-header { display:block; }.bd-original-badge { display:inline-block; margin-top:14px; }.bd-source-caption { display:block; }.bd-source-caption span+span { display:block; margin-top:4px; }.bd-video-frame { min-height:210px; margin-top:18px; }.bd-focus { min-width:137px; }.bd-treatment { flex-basis:85vw; }.bd-mood { flex-basis:76vw; } }
      `}</style>

      <main className="bd-layout">
        <aside className="bd-source-column">
          <SourceViewer
            sourceUrl={sourceUrl}
            fileName={sourceFileName}
            durationSeconds={sourceDuration}
            videoRef={videoRef}
          />
        </aside>

        <div className="bd-work-column">
          <div className="bd-hero-copy">
            <p className="bd-kicker">BODY CINEMA · DIRECTED EDITING</p>
            <h2>YOUR FOOTAGE. YOUR FOCUS. YOUR CINEMA.</h2>
            <p>Plan only — no candidate generated yet.</p>
          </div>

          <PersistentAlert failure={failure} />

          {isLegacyConflict && (
            <section
              className="bd-alert"
              role="alert"
              aria-labelledby="body-directed-legacy-title"
            >
              <p className="bd-kicker">EARLIER SAVED RECORD</p>
              <h2 id="body-directed-legacy-title">
                This record is outside the Body Directed planning lane.
              </h2>
              <p>
                It remains unchanged and read-only in its original history. Body
                Directed plans never reinterpret or overwrite an earlier saved
                record.
              </p>
            </section>
          )}

          {!record && !isLegacyConflict && (
            <section
              className="bd-source-action"
              aria-labelledby="body-directed-start-title"
            >
              <p className="bd-kicker">START WITH YOUR ORIGINAL</p>
              <h2 id="body-directed-start-title" className="bd-section-title">
                Choose the footage. Keep it honest.
              </h2>
              <div className="bd-selection-line">
                <strong>
                  {selectedSource
                    ? "Your original is selected"
                    : "No original selected"}
                </strong>
                {selectedSource && (
                  <span className="bd-original-badge">Ready video</span>
                )}
              </div>
              <button
                type="button"
                className="bd-quiet-action"
                onClick={() => setPickerOpen(true)}
                disabled={isBusy}
              >
                Choose from Your Vault
              </button>
              {sourceAssetId && (
                <>
                  <label className="bd-assertion">
                    <input
                      type="checkbox"
                      checked={asserted}
                      onChange={event => setAsserted(event.target.checked)}
                    />
                    <span>
                      I assert that I own or control this original and have
                      performer-likeness consent for source analysis and
                      plan-only direction.
                      <small>
                        Creator assertion only — CreatorVault does not
                        independently verify rights or consent here.
                      </small>
                    </span>
                  </label>
                  <button
                    type="button"
                    className="bd-primary-action"
                    onClick={qualifyAndAnalyze}
                    disabled={isBusy}
                  >
                    {qualifyMutation.isPending
                      ? "Checking your original…"
                      : "Read my source"}
                  </button>
                </>
              )}
            </section>
          )}

          {record && record.state === "frozen" && record.treatment && (
            <FrozenPlan
              plan={record.treatment}
              sourceMap={sourceMap}
              onSeek={seekOriginal}
            />
          )}

          {record && record.state === "qualified" && (
            <>
              {!sourceMap && (
                <section className="bd-source-action">
                  <p className="bd-kicker">SOURCE ANALYSIS</p>
                  <h2 className="bd-section-title">
                    Measure the original before direction.
                  </h2>
                  <p className="bd-copy">
                    We read your original for visible moments and movement. Your
                    footage stays unchanged, and anything we cannot establish
                    stays unknown.
                  </p>
                  <button
                    type="button"
                    className="bd-primary-action"
                    onClick={() => analyzeRecord(record, creatorMarks)}
                    disabled={isBusy}
                  >
                    {analyzeMutation.isPending
                      ? "Measuring your source…"
                      : "Read my source"}
                  </button>
                </section>
              )}

              {analysisStage && (
                <p className="bd-status-line" role="status">
                  {analysisStage}
                </p>
              )}

              {sourceMap && (
                <>
                  <BodyDirectionChoice
                    selectedFocusId={selectedFocusId}
                    sourceMap={sourceMap}
                    onChoose={chooseFocus}
                  />
                  <CreatorDetailMark
                    focus={selectedFocus}
                    videoRef={videoRef}
                    durationSeconds={sourceDuration}
                    marks={creatorMarks}
                    disabled={isBusy}
                    onSave={saveCreatorMark}
                  />
                  {selectedFocusId && supportedLabels.length > 0 && (
                    <p className="bd-status-line">
                      Source-supported treatments: {supportedLabels.join(" · ")}
                    </p>
                  )}
                  <TreatmentRail
                    focusId={selectedFocusId}
                    selectedTreatmentId={selectedTreatmentId}
                    sourceMap={sourceMap}
                    eligibleTreatmentIds={
                      recommendations?.eligibleTreatmentIds ?? []
                    }
                    onChoose={treatmentId => {
                      setSelectedTreatmentId(treatmentId);
                      setSelectedMoodId(null);
                      setSelectedRangeIds([]);
                    }}
                  />
                  <MoodRail
                    treatmentId={selectedTreatmentId}
                    selectedMoodId={selectedMoodId}
                    onChoose={moodId => {
                      setSelectedMoodId(moodId);
                      setSelectedRangeIds([]);
                    }}
                  />
                  {selectedFocusId && selectedTreatmentId && selectedMoodId && (
                    <section
                      className="bd-options"
                      aria-labelledby="body-directed-options-title"
                    >
                      <div className="bd-options-heading">
                        <div>
                          <p className="bd-kicker">
                            04 · YOUR BODY CINEMA OPTIONS
                          </p>
                          <h2
                            id="body-directed-options-title"
                            className="bd-section-title"
                          >
                            Built from your original.
                          </h2>
                        </div>
                        <p>
                          Each timecode seeks the original only. No crop or
                          grade is applied here.
                        </p>
                      </div>
                      {recommendationQuery.isLoading && (
                        <p className="bd-status-line">
                          Finding eligible source combinations…
                        </p>
                      )}
                      {recommendations?.reason && (
                        <div className="bd-unsupported" role="status">
                          <strong>
                            That exact direction is not supported by this
                            source.
                          </strong>
                          <br />
                          {recommendations.reason}
                          {recommendations.alternatives.length > 0 && (
                            <div className="bd-alternatives">
                              {recommendations.alternatives.map(alternative => (
                                <span key={alternative.id}>
                                  {alternative.label}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                      {!recommendationQuery.isLoading &&
                        recommendations &&
                        recommendations.options.length === 0 &&
                        !recommendations.reason && (
                          <BodyDirectedPlanSummary plan={null} />
                        )}
                      <div className="bd-options-list">
                        {recommendations?.options.map(plan => (
                          <BodyDirectedPlanSummary
                            key={`${plan.bodyTreatment.id}-${plan.visualIdentity.id}-${plan.editBlueprint.heroRangeId}`}
                            plan={plan}
                            onChoose={choosePlan}
                            onSeek={seekOriginal}
                          />
                        ))}
                      </div>
                      {selectedPlan && selectionMatchesShownPlan && (
                        <div className="bd-plan-lock">
                          <p>
                            Locking saves this focus, treatment, mood,
                            source-map snapshot, exact ranges, and edit
                            blueprint. It does not create media.
                          </p>
                          <button
                            type="button"
                            className="bd-primary-action"
                            onClick={freezePlan}
                            disabled={
                              isBusy ||
                              recommendationQuery.isFetching ||
                              !selectionMatchesShownPlan
                            }
                          >
                            {freezeMutation.isPending
                              ? "Locking plan…"
                              : "Lock this plan"}
                          </button>
                        </div>
                      )}
                    </section>
                  )}
                </>
              )}
            </>
          )}

          <details className="bd-library">
            <summary>Details · saved Body Directed plans</summary>
            <div className="bd-library-list">
              {savedRecords.length ? (
                savedRecords.map(saved => (
                  <a
                    key={saved.id}
                    href={`/vault-x/studio?lifecycleId=${encodeURIComponent(saved.id)}`}
                  >
                    <span>{saved.source.fileName || "Saved original"}</span>
                    <span>
                      {saved.state === "frozen"
                        ? "Locked plan"
                        : "Source analysis"}
                    </span>
                  </a>
                ))
              ) : (
                <p className="bd-copy">No saved Body Directed plan yet.</p>
              )}
            </div>
          </details>
        </div>
      </main>

      <MediaPicker
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onConfirm={chooseSource}
        mode="single"
        initialSelectedIds={
          initialSourceAssetId ? [initialSourceAssetId] : undefined
        }
        title="Your Vault originals"
        subtitle="Choose one ready video you already own. This planning lane never uploads or substitutes a source."
        confirmLabel="Use this original"
        assetEligibility={isReadyVideo}
      />
    </div>
  );
}
