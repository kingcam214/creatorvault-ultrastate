import {
  bodyCinemaHdRecipeSchema,
  type BodyCinemaHdRecipe,
} from "../../shared/bodyCinemaHd";
import type { BodyDirectedLifecycleRecord } from "../../shared/bodyCinemaCandidateLifecycle";

export function compileBodyCinemaHdRecipe(
  record: BodyDirectedLifecycleRecord,
  segments: Array<{ startMs: number; endMs: number }>
): BodyCinemaHdRecipe {
  const shortEdge = Math.min(record.source.width, record.source.height),
    longEdge = Math.max(record.source.width, record.source.height);
  if (
    record.source.width === record.source.height
      ? shortEdge < 1080
      : shortEdge < 720 || longEdge < 1280
  )
    throw new Error(
      "Use an original of at least native 720p. HD scaling cannot recover missing source detail."
    );
  const plan = record.treatment;
  if (
    !plan ||
    !record.treatmentHash ||
    record.state !== "frozen" ||
    !record.analysis
  )
    throw new Error(
      "Lock your measured source plan before preparing its separate HD blueprint."
    );
  // A separate HD recipe preserves the complete recorded frame. It never claims
  // anatomical support in unmeasured native context. The explicit per-execution
  // watch/head/rights consent authorizes these native-context sections separately.
  for (const s of segments) {
    if (s.startMs < 0 || s.endMs > record.source.durationSeconds * 1000 + 0.001)
      throw new Error(
        "Each HD shot must stay inside this exact owned original."
      );
    const unsafe = record.analysis.sourceMap.excludedRanges.filter(
      r =>
        r.reason !==
        "No adjacent in-bounds, high-confidence landmark samples support this interval."
    );
    if (unsafe.some(r => s.startMs < r.endMs && r.startMs < s.endMs))
      throw new Error(
        "The HD blueprint cannot cross a frozen source defect or expressly excluded range."
      );
  }
  const focusCoverage = record.analysis.sourceMap.usableRanges.filter(
    r =>
      r.visibleFocusIds.includes(plan.bodyFocus.id) &&
      plan.bodyTreatment.requiredRegions.every(region =>
        r.measuredRegions.includes(region as (typeof r.measuredRegions)[number])
      )
  );
  const focusIntervals: Array<{ startMs: number; endMs: number }> = [];
  for (const s of segments)
    for (const r of focusCoverage) {
      const startMs = Math.max(s.startMs, r.startMs),
        endMs = Math.min(s.endMs, r.endMs);
      if (endMs > startMs) focusIntervals.push({ startMs, endMs });
    }
  focusIntervals.sort((a, b) => a.startMs - b.startMs);
  let focusDuration = 0,
    lastEnd = -1;
  for (const r of focusIntervals) {
    focusDuration += Math.max(0, r.endMs - Math.max(r.startMs, lastEnd));
    lastEnd = Math.max(lastEnd, r.endMs);
  }
  if (focusDuration < 2000)
    throw new Error(
      "The chosen body focus needs at least two seconds of actual measured support in the HD sequence."
    );
  const portrait = record.source.height > record.source.width;
  return bodyCinemaHdRecipeSchema.parse({
    version: "body_cinema.hd_recipe.v1",
    sourceSha256: record.source.sha256,
    sourceAssetId: record.source.assetId,
    bodyFocusId: plan.bodyFocus.id,
    bodyFocusLabel: plan.bodyFocus.label,
    editStyleId: plan.bodyTreatment.id,
    editStyleName: plan.bodyTreatment.name,
    visualGradeId: plan.visualIdentity.id,
    segments,
    width: portrait
      ? 1080
      : record.source.width === record.source.height
        ? 1080
        : 1920,
    height: portrait ? 1920 : 1080,
    durationSeconds: segments.reduce(
      (total, s) => total + (s.endMs - s.startMs) / 1000,
      0
    ),
    framing: "complete_native_source",
  });
}
