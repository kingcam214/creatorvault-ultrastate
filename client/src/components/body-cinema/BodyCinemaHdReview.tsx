import React, { useEffect, useId, useMemo, useRef, useState } from "react";
import { trpc } from "@/lib/trpc";
import type { BodyDirectedLifecycleRecord } from "@shared/bodyCinemaCandidateLifecycle";
import type { BodyCinemaHdJob } from "@shared/bodyCinemaHd";

type Segment = BodyCinemaHdJob["recipe"]["segments"][number];
type DraftCut = { start: string; end: string };
type Props = {
  record: BodyDirectedLifecycleRecord;
  onSeek?: (range: Segment) => void;
};
const EPSILON_MS = 0.001;
const MOODS = [
  {
    id: "obsidian",
    name: "Obsidian",
    description: "Disciplined contrast; original texture retained.",
  },
  {
    id: "la_reina",
    name: "La Reina",
    description: "Regal tonal polish; identity unchanged.",
  },
  {
    id: "golden_hour",
    name: "Golden Hour",
    description: "Restrained warmth; no invented sunlight.",
  },
  {
    id: "midnight_heat",
    name: "Midnight Heat",
    description: "Low-key tonal direction; no new environment.",
  },
] as const;

function overlaps(a: Segment, b: Segment): boolean {
  return a.startMs < b.endMs && b.startMs < a.endMs;
}

function mergeSupported(
  intervals: Segment[],
  exclusions: Segment[]
): Segment[] {
  const pieces = intervals
    .flatMap(interval => {
      let remaining = [{ ...interval }];
      for (const excluded of exclusions) {
        remaining = remaining.flatMap(piece => {
          if (!overlaps(piece, excluded)) return [piece];
          return [
            {
              startMs: piece.startMs,
              endMs: Math.min(piece.endMs, excluded.startMs),
            },
            {
              startMs: Math.max(piece.startMs, excluded.endMs),
              endMs: piece.endMs,
            },
          ].filter(piece => piece.endMs > piece.startMs);
        });
      }
      return remaining;
    })
    .sort((a, b) => a.startMs - b.startMs || a.endMs - b.endMs);
  const merged: Segment[] = [];
  for (const interval of pieces) {
    const previous = merged[merged.length - 1];
    const gapExcluded =
      previous &&
      exclusions.some(excluded =>
        overlaps({ startMs: previous.endMs, endMs: interval.startMs }, excluded)
      );
    if (
      previous &&
      interval.startMs <= previous.endMs + EPSILON_MS &&
      !gapExcluded
    ) {
      previous.endMs = Math.max(previous.endMs, interval.endMs);
    } else merged.push({ ...interval });
  }
  return merged;
}

const POSE_SAMPLING_GAP =
  "No adjacent in-bounds, high-confidence landmark samples support this interval.";

function hdUnsafeExclusions(record: BodyDirectedLifecycleRecord): Segment[] {
  return (record.analysis?.sourceMap.excludedRanges ?? []).filter(
    range => range.reason !== POSE_SAMPLING_GAP
  );
}

/** Provisional native-source sections, not an assertion of visible anatomy. */
export function hdSupportedWindows(
  record: BodyDirectedLifecycleRecord
): Segment[] {
  if (!record.analysis || !record.treatment) return [];
  // Missing pose samples do not prove defective native footage. These complete
  // source sections require NEW explicit watched/head/rights authorization.
  return mergeSupported(
    [{ startMs: 0, endMs: record.source.durationSeconds * 1000 }],
    hdUnsafeExclusions(record)
  );
}

export function hdFocusWindows(record: BodyDirectedLifecycleRecord): Segment[] {
  const map = record.analysis?.sourceMap;
  const plan = record.treatment;
  if (!map || !plan) return [];
  const exclusions = hdUnsafeExclusions(record);
  const eligible = map.usableRanges.filter(
    range =>
      range.visibleFocusIds.includes(plan.bodyFocus.id) &&
      plan.bodyTreatment.requiredRegions.every(region =>
        range.measuredRegions.some(measured => measured === region)
      )
  );
  const focus = mergeSupported(eligible, exclusions);
  const native = hdSupportedWindows(record);
  return mergeSupported(
    focus.flatMap(a =>
      native
        .map(b => ({
          startMs: Math.max(a.startMs, b.startMs, 0),
          endMs: Math.min(
            a.endMs,
            b.endMs,
            record.source.durationSeconds * 1000
          ),
        }))
        .filter(range => range.endMs > range.startMs)
    ),
    exclusions
  );
}

/** Provisional native-source draft: up to 13 seconds in three or four cuts. */
export function defaultHdSegments(windows: Segment[]): Segment[] {
  const usable = windows
    .filter(window => window.endMs - window.startMs >= 2000)
    .sort(
      (a, b) =>
        b.endMs - b.startMs - (a.endMs - a.startMs) || a.startMs - b.startMs
    );
  const selected: Segment[] = [];
  let coverage = 0;
  for (const window of usable.slice(0, 4)) {
    selected.push(window);
    coverage += window.endMs - window.startMs;
    if (coverage >= 10000) break;
  }
  if (coverage < 10000) return [];
  selected.sort((a, b) => a.startMs - b.startMs);
  const counts = selected.map(() => 1);
  while (counts.reduce((sum, count) => sum + count, 0) < 3) {
    const index = selected.findIndex(
      (window, i) => window.endMs - window.startMs >= (counts[i] + 1) * 2000
    );
    if (index < 0) return [];
    counts[index] += 1;
  }
  if (counts.reduce((sum, count) => sum + count, 0) === 3) {
    const index = selected.findIndex(
      (window, i) => window.endMs - window.startMs >= (counts[i] + 1) * 2000
    );
    if (index >= 0) counts[index] += 1;
  }
  const target = Math.min(coverage, 13000);
  const lengths = counts.map(count => count * 2000);
  let extra = target - lengths.reduce((sum, length) => sum + length, 0);
  // Fill the available source windows without jumping across an unsupported gap.
  for (let i = 0; i < selected.length; i += 1) {
    const added = Math.min(
      extra,
      selected[i].endMs - selected[i].startMs - lengths[i]
    );
    lengths[i] += added;
    extra -= added;
  }
  return selected.flatMap((window, i) =>
    Array.from({ length: counts[i] }, (_, cut) => ({
      startMs: window.startMs + Math.round((lengths[i] * cut) / counts[i]),
      endMs: window.startMs + Math.round((lengths[i] * (cut + 1)) / counts[i]),
    }))
  );
}

function draftFrom(segments: Segment[]): DraftCut[] {
  return segments.length
    ? segments.map(segment => ({
        start: String(segment.startMs / 1000),
        end: String(segment.endMs / 1000),
      }))
    : Array.from({ length: 3 }, () => ({ start: "", end: "" }));
}

function parseCut(cut: DraftCut): Segment | null {
  if (!cut.start.trim() || !cut.end.trim()) return null;
  const startMs = Number(cut.start) * 1000;
  const endMs = Number(cut.end) * 1000;
  return Number.isFinite(startMs) &&
    Number.isFinite(endMs) &&
    startMs >= 0 &&
    endMs - startMs >= 2000
    ? { startMs, endMs }
    : null;
}

export function validateHdSegments(
  segments: Segment[],
  windows: Segment[],
  exclusions: Segment[]
): string | null {
  if (segments.length < 3 || segments.length > 6)
    return "Choose three to six source cuts.";
  if (
    segments.some(
      s =>
        !Number.isFinite(s.startMs) ||
        !Number.isFinite(s.endMs) ||
        s.startMs < 0 ||
        s.endMs - s.startMs < 2000
    )
  ) {
    return "Each cut needs finite source times and at least two seconds.";
  }
  const duration = segments.reduce(
    (total, s) => total + s.endMs - s.startMs,
    0
  );
  if (duration < 10000 || duration > 15000)
    return "The selected cuts must total 10–15 seconds.";
  if (
    segments.some((s, index) =>
      segments.slice(index + 1).some(other => overlaps(s, other))
    )
  ) {
    return "Source cuts cannot overlap or repeat footage.";
  }
  if (
    segments.some(
      s =>
        exclusions.some(excluded => overlaps(s, excluded)) ||
        !windows.some(
          window =>
            s.startMs >= window.startMs - EPSILON_MS &&
            s.endMs <= window.endMs + EPSILON_MS
        )
    )
  )
    return "Keep every cut inside this owned original, without crossing source defects or expressly excluded ranges.";
  return null;
}

export function hdFocusDuration(
  segments: Segment[],
  focusWindows: Segment[]
): number {
  return mergeSupported(
    segments.flatMap(s =>
      focusWindows
        .map(f => ({
          startMs: Math.max(s.startMs, f.startMs),
          endMs: Math.min(s.endMs, f.endMs),
        }))
        .filter(range => range.endMs > range.startMs)
    ),
    []
  ).reduce((sum, range) => sum + range.endMs - range.startMs, 0);
}

function statusRank(job: BodyCinemaHdJob): number {
  return job.status === "prepared" ? 0 : job.status === "rendering" ? 1 : 2;
}
function errorMessage(error: unknown, fallback: string): string {
  return error instanceof Error && error.message.trim()
    ? error.message
    : fallback;
}
function seconds(ms: number): string {
  return (ms / 1000).toFixed(3);
}

/** This hook-free boundary also tolerates older planning-only test/router mocks. */
export function BodyCinemaHdReview(props: Props) {
  const api = trpc.bodyCinema.lifecycle;
  if (
    !api.getHdRender?.useQuery ||
    !api.prepareHdRender?.useMutation ||
    !api.executeHdRender?.useMutation
  ) {
    return (
      <p className="bd-copy">
        Private HD review is unavailable. Original saved plan unchanged.
      </p>
    );
  }
  return <HdReviewSession key={props.record.id} {...props} />;
}

function HdReviewSession({ record, onSeek }: Props) {
  const titleId = useId();
  const windows = useMemo(() => hdSupportedWindows(record), [record]);
  const focusWindows = useMemo(() => hdFocusWindows(record), [record]);
  const [cuts, setCuts] = useState<DraftCut[]>(() =>
    draftFrom(defaultHdSegments(windows))
  );
  const [mutationJob, setMutationJob] = useState<BodyCinemaHdJob | null>(null);
  const [watched, setWatched] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  const [executionRequested, setExecutionRequested] = useState(false);
  const requestInFlight = useRef(false);
  const query = trpc.bodyCinema.lifecycle.getHdRender.useQuery(
    { id: record.id },
    {
      enabled: Boolean(record.treatment),
      refetchInterval: query =>
        query.state.data?.status === "rendering" ? 2500 : false,
    }
  );
  const prepare = trpc.bodyCinema.lifecycle.prepareHdRender.useMutation();
  const execute = trpc.bodyCinema.lifecycle.executeHdRender.useMutation();
  const queriedJob = query.data ?? null;
  // Mutation responses are immediate. Do not let a stale prepared query unlock a
  // recipe or hide a render while the server's saved status catches up.
  const currentJob =
    mutationJob &&
    (!queriedJob || statusRank(mutationJob) > statusRank(queriedJob))
      ? mutationJob
      : (queriedJob ?? mutationJob);
  const job =
    currentJob?.lifecycleId === record.id &&
    currentJob.treatmentHash === record.treatmentHash
      ? currentJob
      : null;
  const contextConflict = Boolean(currentJob && !job);
  const loading = Boolean(record.treatment && query.isLoading);
  const busy = prepare.isPending || execute.isPending;
  const sourceMeetsFloor =
    record.source.width === record.source.height
      ? record.source.width >= 1080
      : record.source.width > record.source.height
        ? record.source.width >= 1280 && record.source.height >= 720
        : record.source.width >= 720 && record.source.height >= 1280;
  const parsed = cuts.map(parseCut);
  const segments = parsed.filter((cut): cut is Segment => cut !== null);
  const validation = parsed.some(cut => cut === null)
    ? "Enter a start and end for every cut; each needs at least two seconds."
    : (validateHdSegments(segments, windows, hdUnsafeExclusions(record)) ??
      (hdFocusDuration(segments, focusWindows) < 2000
        ? "Include at least two seconds of the frozen focus with all treatment-required regions supported."
        : null));
  const duration = segments.reduce(
    (sum, s) => sum + (s.endMs - s.startMs) / 1000,
    0
  );
  const alert =
    failure ??
    job?.error ??
    (query.error
      ? errorMessage(
          query.error,
          "Saved HD status could not be loaded. No render was requested."
        )
      : null) ??
    (contextConflict
      ? "The HD job does not match this saved plan. Review is blocked; no source or recipe was substituted."
      : null);

  useEffect(() => {
    setWatched(false);
  }, [job?.id, job?.recipeHash]);
  useEffect(() => {
    if (query.error)
      setFailure(
        errorMessage(
          query.error,
          "Saved HD status could not be loaded. No render was requested."
        )
      );
  }, [query.error]);

  const saveBlueprint = async () => {
    if (
      requestInFlight.current ||
      busy ||
      loading ||
      query.isError ||
      job ||
      contextConflict ||
      validation ||
      !sourceMeetsFloor ||
      record.state !== "frozen" ||
      !record.treatmentHash
    )
      return;
    requestInFlight.current = true;
    try {
      const saved = await prepare.mutateAsync({
        id: record.id,
        treatmentHash: record.treatmentHash,
        segments,
      });
      setMutationJob(saved);
      setWatched(false);
      void query.refetch();
    } catch (error) {
      setFailure(
        errorMessage(
          error,
          "The HD blueprint could not be saved. Original saved plan unchanged."
        )
      );
    } finally {
      requestInFlight.current = false;
    }
  };
  const renderCandidate = async () => {
    if (
      requestInFlight.current ||
      busy ||
      !watched ||
      !job ||
      job.status !== "prepared" ||
      executionRequested ||
      query.isError ||
      contextConflict
    )
      return;
    requestInFlight.current = true;
    setExecutionRequested(true);
    try {
      const saved = await execute.mutateAsync({
        id: record.id,
        jobId: job.id,
        recipeHash: job.recipeHash,
        authorization: {
          version: "body_cinema.hd_private_review_authorization.v1",
          ownSource: true,
          performerLikenessConsent: true,
          watchedSelectedNativeRanges: true,
          completeHeadAndChinVisible: true,
          purpose: "private_hd_candidate_review",
          externalCostCeilingUsd: 0,
          noPublication: true,
          acknowledgesNoIndependentVerification: true,
        },
      });
      setMutationJob(saved);
      void query.refetch();
    } catch (error) {
      setFailure(
        errorMessage(
          error,
          "The render response could not be confirmed. Checking saved status; no repeat render is authorized here."
        )
      );
      void query.refetch();
    } finally {
      requestInFlight.current = false;
    }
  };
  const addCut = () => {
    if (cuts.length >= 6 || job || busy) return;
    const longest = parsed.reduce(
      (best, cut, index) =>
        cut &&
        cut.endMs - cut.startMs >= 4000 &&
        (!parsed[best] ||
          cut.endMs - cut.startMs >
            (parsed[best]?.endMs ?? 0) - (parsed[best]?.startMs ?? 0))
          ? index
          : best,
      -1
    );
    const split = parsed[longest];
    if (split) {
      const middle = Math.round((split.startMs + split.endMs) / 2);
      const pair = draftFrom([
        { startMs: split.startMs, endMs: middle },
        { startMs: middle, endMs: split.endMs },
      ]);
      setCuts(previous => [
        ...previous.slice(0, longest),
        ...pair,
        ...previous.slice(longest + 1),
      ]);
    } else setCuts(previous => [...previous, { start: "", end: "" }]);
  };

  if (!record.treatment) return null;
  const readyCandidate = job?.status === "ready" ? job.candidate : null;
  return (
    <section className="bchd-review" aria-labelledby={titleId}>
      <style>{`
        .bchd-review{background:#0A0A0A;color:#E8E8E3;border-top:2px solid #C9A84C;padding-top:26px;font-family:"DM Sans",Inter,sans-serif;line-height:1.5;min-width:0}
        .bchd-review *{box-sizing:border-box}.bchd-review p{margin:12px 0}.bchd-review h2,.bchd-review h3{font-family:"Bebas Neue",Impact,sans-serif;font-weight:400;letter-spacing:.025em;line-height:.98;color:#fff;margin:0}.bchd-review h2{font-size:clamp(36px,4vw,52px)}.bchd-review h3{font-size:32px}
        .bchd-kicker{color:#00D9FF;font-weight:800;font-size:12px;letter-spacing:.12em;text-transform:uppercase}.bchd-note{color:#f5df9a;font-weight:700}.bchd-muted{color:rgba(232,232,227,.72);font-size:14px}.bchd-panel{margin-top:22px;padding:20px;border:1px solid rgba(255,255,255,.14);background:linear-gradient(140deg,#1A1A1A,#101010)}
        .bchd-review button,.bchd-review input{font:inherit}.bchd-review button{min-height:44px;padding:10px 14px;border:1px solid #00D9FF;background:transparent;color:#fff;cursor:pointer;font-weight:750}.bchd-review button:disabled{opacity:.45;cursor:not-allowed}.bchd-review .bchd-primary{background:#00D9FF;color:#071013;font-weight:900;width:100%;margin-top:18px;min-height:50px}.bchd-review button:focus-visible,.bchd-review input:focus-visible,.bchd-review summary:focus-visible{outline:2px solid #f5df9a;outline-offset:3px}
        .bchd-cuts{list-style:none;padding:0;margin:18px 0;display:grid;gap:16px}.bchd-cut{border-top:1px solid rgba(255,255,255,.14);padding-top:14px}.bchd-cut-label{font-weight:800;color:#f5df9a}.bchd-fields{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin:10px 0}.bchd-fields label{display:grid;gap:5px;font-size:14px}.bchd-fields input{width:100%;min-width:0;background:#0A0A0A;border:1px solid rgba(255,255,255,.28);padding:10px;color:#fff}.bchd-cut-actions{display:flex;flex-wrap:wrap;gap:8px}.bchd-locked{display:grid;grid-template-columns:auto 1fr;gap:8px 20px;margin:16px 0}.bchd-locked dt{color:rgba(232,232,227,.72)}.bchd-locked dd{margin:0;font-weight:700;overflow-wrap:anywhere}
        .bchd-assertion{display:flex;align-items:flex-start;gap:12px;margin-top:20px;cursor:pointer}.bchd-assertion input{width:20px;height:20px;flex:0 0 auto;margin-top:3px;accent-color:#00D9FF}.bchd-status{color:#00D9FF;font-weight:750}.bchd-alert{border:1px solid #C9A84C;border-left-width:4px;background:rgba(201,168,76,.08);padding:16px;margin-top:18px;overflow-wrap:anywhere}
        .bchd-candidate{margin-top:22px}.bchd-candidate video{display:block;width:100%;max-height:660px;object-fit:contain;background:#030303;border:1px solid rgba(255,255,255,.14);margin-top:16px}.bchd-moods{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:14px}.bchd-mood{padding:12px;border:1px solid rgba(255,255,255,.14)}.bchd-mood.is-frozen{border-color:#C9A84C}.bchd-mood strong{display:block;color:#fff}.bchd-mood p{font-size:13px;margin:6px 0 0;color:rgba(232,232,227,.72)}
        .bchd-details{border-top:1px solid rgba(255,255,255,.14);margin-top:22px;padding-top:14px}.bchd-details summary{font-weight:800;cursor:pointer;color:#fff}.bchd-details p{font-family:"Space Mono",monospace;font-size:12px;overflow-wrap:anywhere}.bchd-review .bchd-details .bchd-muted{font-family:"DM Sans",Inter,sans-serif}
        @media(max-width:520px){.bchd-panel{padding:16px}.bchd-locked{column-gap:12px}.bchd-cut-actions button{flex:1 1 auto}.bchd-review h2{font-size:38px}}
      `}</style>
      <p className="bchd-kicker">PRIVATE HD REVIEW · SEPARATE FROM THE PLAN</p>
      <h2 id={titleId}>YOUR ORIGINAL. A COMPLETE FRAME.</h2>
      <p className="bchd-note">
        Separate HD blueprint · original saved plan unchanged.
      </p>
      <p>
        Stable native timing, complete source frame, clean cuts. No crop,
        generated anatomy, or synthetic motion.
      </p>
      <p className="bchd-muted">
        1080p encoding preserves source detail; it cannot recreate detail absent
        from your original.
      </p>
      {alert && (
        <div className="bchd-alert" role="alert">
          {alert}
        </div>
      )}
      {loading && (
        <p role="status" className="bchd-status">
          Loading saved HD review status…
        </p>
      )}
      {!job && !loading && !contextConflict && !query.isError && (
        <div className="bchd-panel">
          <p className="bchd-kicker">
            NEW HD BLUEPRINT · NOT THE ORIGINAL SHOT PLAN
          </p>
          <h3>{record.treatment.bodyTreatment.name}</h3>
          <p>
            {record.treatment.bodyFocus.label} ·{" "}
            {record.treatment.visualIdentity.name} · frozen direction
          </p>
          <p className="bchd-muted">
            Choose 3–6 source-time cuts, each at least 2 seconds, totaling 10–15
            seconds. Watch each selected range in the original viewer before
            authorizing a render.
          </p>
          <p className="bchd-muted">
            Native-source cuts are separately authorized; body-focus evidence is
            not inferred in unmeasured source sections. Include at least two
            seconds of measured frozen focus and its required regions.
          </p>
          <p className="bchd-muted">
            Native source floor: 1280 × 720 landscape, 720 × 1280 portrait, or
            1080 × 1080 square. Your original: {record.source.width} ×{" "}
            {record.source.height}.
          </p>
          {!sourceMeetsFloor && (
            <p className="bchd-note">
              This source is below the HD lane's native resolution floor. No
              higher-detail source is being substituted.
            </p>
          )}
          {(!windows.length || !focusWindows.length) && (
            <p className="bchd-note">
              The current source evidence cannot support a valid HD blueprint
              for this frozen focus. No missing body-focus evidence is being
              guessed.
            </p>
          )}
          <ol className="bchd-cuts">
            {cuts.map((cut, index) => (
              <li className="bchd-cut" key={index}>
                <span className="bchd-cut-label">Cut {index + 1}</span>
                <div className="bchd-fields">
                  {(["start", "end"] as const).map(field => (
                    <label key={field}>
                      {field === "start" ? "Start" : "End"} seconds
                      <input
                        type="number"
                        min="0"
                        step="0.001"
                        value={cut[field]}
                        disabled={busy}
                        aria-label={`Cut ${index + 1} ${field} seconds`}
                        onChange={event => {
                          const value = event.target.value;
                          setCuts(previous =>
                            previous.map((item, i) =>
                              i === index ? { ...item, [field]: value } : item
                            )
                          );
                        }}
                      />
                    </label>
                  ))}
                </div>
                <div className="bchd-cut-actions">
                  <button
                    type="button"
                    disabled={!onSeek || !parsed[index] || busy}
                    onClick={() => {
                      const range = parsed[index];
                      if (range) onSeek?.(range);
                    }}
                  >
                    Play source range
                  </button>
                  <button
                    type="button"
                    disabled={cuts.length <= 3 || busy}
                    aria-label={`Remove cut ${index + 1}`}
                    onClick={() =>
                      setCuts(previous =>
                        previous.filter((_, i) => i !== index)
                      )
                    }
                  >
                    Remove cut
                  </button>
                </div>
              </li>
            ))}
          </ol>
          <button
            type="button"
            onClick={addCut}
            disabled={cuts.length >= 6 || busy}
            aria-label="Add source cut"
          >
            + Add cut
          </button>
          <p aria-live="polite">
            Selected duration · {duration.toFixed(3)} seconds
          </p>
          <p className="bchd-muted" aria-live="polite">
            {validation ??
              "Draft cuts fit the owned original and measured focus requirement. Watch every range: head/chin visibility is not automatically verified. The server checks bounds and explicit exclusions before saving."}
          </p>
          <button
            type="button"
            className="bchd-primary"
            onClick={() => void saveBlueprint()}
            disabled={
              busy ||
              Boolean(validation) ||
              !sourceMeetsFloor ||
              !record.treatmentHash ||
              !record.analysis ||
              record.state !== "frozen"
            }
          >
            {" "}
            {prepare.isPending ? "Saving HD blueprint…" : "Save HD blueprint"}
          </button>
        </div>
      )}
      {job && (
        <div className="bchd-panel">
          <p className="bchd-kicker">LOCKED HD RECIPE · {job.status}</p>
          <h3>{job.recipe.editStyleName}</h3>
          <dl className="bchd-locked">
            <dt>Focus</dt>
            <dd>{job.recipe.bodyFocusLabel}</dd>
            <dt>Grade</dt>
            <dd>{job.recipe.visualGradeId}</dd>
            <dt>Duration</dt>
            <dd>{job.recipe.durationSeconds} seconds</dd>
            <dt>HD canvas</dt>
            <dd>
              {job.recipe.width} × {job.recipe.height}
            </dd>
            <dt>Framing</dt>
            <dd>Complete native source · no crop</dd>
          </dl>
          <ol className="bchd-cuts">
            {job.recipe.segments.map((segment, index) => (
              <li className="bchd-cut" key={`${index}-${segment.startMs}`}>
                <p>
                  <strong>Cut {index + 1}</strong> · {seconds(segment.startMs)}–
                  {seconds(segment.endMs)} source seconds
                </p>
                <button
                  type="button"
                  disabled={!onSeek}
                  onClick={() => onSeek?.(segment)}
                >
                  Play source range
                </button>
              </li>
            ))}
          </ol>
          {job.status === "prepared" && (
            <>
              <label className="bchd-assertion">
                <input
                  type="checkbox"
                  checked={watched}
                  disabled={busy || executionRequested}
                  onChange={event => setWatched(event.target.checked)}
                />
                <span>
                  I watched every selected source range. Complete head and chin
                  remain visible; I own the source and have performer consent
                  for this private review.
                </span>
              </label>
              <p className="bchd-muted">
                This is your declaration, not independent visibility or rights
                verification. Private review only; publication is not
                authorized.
              </p>
              <button
                type="button"
                className="bchd-primary"
                disabled={
                  !watched || busy || executionRequested || query.isError
                }
                onClick={() => void renderCandidate()}
              >
                Render private HD candidate · $0 external API spend
              </button>
              {executionRequested && (
                <p role="status" className="bchd-status">
                  Render request sent. Checking saved status; no repeat request
                  will be made.
                </p>
              )}
            </>
          )}
          {job.status === "rendering" && (
            <p role="status" className="bchd-status">
              Rendering privately on the server. Waiting for encoding and
              byte-identity verification; progress percentage is unavailable.
            </p>
          )}
          {job.status === "failed" && (
            <p className="bchd-note">
              This single render attempt failed. No retry is available here;
              your original and saved plan remain unchanged.
            </p>
          )}
          {job.status === "ready" && !readyCandidate && (
            <p role="alert">
              The ready job has no verified candidate. No video is being
              substituted.
            </p>
          )}
        </div>
      )}
      {readyCandidate && (
        <div className="bchd-candidate">
          <p className="bchd-kicker">READY · PRIVATE CANDIDATE</p>
          <h3>WATCH YOUR HD CANDIDATE.</h3>
          <video
            controls
            playsInline
            preload="metadata"
            aria-label="Private HD candidate video"
            src={`/api/body-cinema/lifecycle/${encodeURIComponent(record.id)}/hd-candidate`}
            onError={() =>
              setFailure(
                "The verified private candidate could not be played. No replacement video is shown."
              )
            }
          />
          <p>
            {readyCandidate.width} × {readyCandidate.height} ·{" "}
            {readyCandidate.durationSeconds} seconds ·{" "}
            {readyCandidate.frameRate} fps ·{" "}
            {readyCandidate.hasAudio
              ? "Original audio retained"
              : "Source has no audio"}
          </p>
          <p className="bchd-note">
            Private review only. No automatic acceptance, handoff, or
            publication.
          </p>
          <p className="bchd-muted">
            {readyCandidate.width > record.source.width ||
            readyCandidate.height > record.source.height
              ? "Upscaled to the HD canvas from"
              : "HD encoding from"}{" "}
            your {record.source.width} × {record.source.height} original. 1080p
            encoding preserves source detail; it cannot recreate detail absent
            from your original.
          </p>
        </div>
      )}
      <div className="bchd-panel">
        <p className="bchd-kicker">FOUR HD MOODS · INFORMATION ONLY</p>
        <p className="bchd-muted">
          The existing frozen mood stays fixed. These are supported grade
          directions, not new choices or source-light claims.
        </p>
        <div className="bchd-moods">
          {MOODS.map(mood => (
            <div
              className={`bchd-mood${mood.id === (job?.recipe.visualGradeId ?? record.treatment?.visualIdentity.id) ? " is-frozen" : ""}`}
              key={mood.id}
            >
              <strong>{mood.name}</strong>
              <p>{mood.description}</p>
            </div>
          ))}
        </div>
      </div>
      <details className="bchd-details">
        <summary>Details</summary>
        <p>
          Original SHA-256: {job?.recipe.sourceSha256 ?? record.source.sha256}
        </p>
        {job && (
          <>
            <p>Recipe SHA-256: {job.recipeHash}</p>
            <p>
              Job: {job.id} · {job.status}
            </p>
            <p>
              Saved focus: {job.recipe.bodyFocusId} · edit:{" "}
              {job.recipe.editStyleId} · grade: {job.recipe.visualGradeId}
            </p>
          </>
        )}
        {readyCandidate && (
          <>
            <p>Candidate SHA-256: {readyCandidate.sha256}</p>
            <p>
              {readyCandidate.sizeBytes} bytes · {readyCandidate.frameCount}{" "}
              frames · grade version: {readyCandidate.gradeVersion}
            </p>
          </>
        )}
        <p>
          Excluded source ranges:{" "}
          {record.analysis?.sourceMap.excludedRanges.length ?? 0}
        </p>
        <p className="bchd-muted">
          The private endpoint verifies saved byte identity. No external
          provider call or API spend; review does not change the original plan's
          candidate field.
        </p>
      </details>
    </section>
  );
}

export default BodyCinemaHdReview;
