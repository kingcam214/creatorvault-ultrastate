import type { CaptionSegment } from "./captionEngineIntelligence";
import type { CaptionPlatformProfile, CaptionPlacement } from "./captionEnginePresentation";
import { resolveCaptionPlatformProfile } from "./captionEnginePresentation";

export type CaptionFocusRegion = {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  label?: string;
  source: "creator_marked" | "source_analysis";
  confidence?: number | null;
};

export type CaptionQualityIssue = {
  code: "low_contrast" | "caption_density" | "fast_pacing" | "focus_collision" | "unsafe_placement" | "unknown_focus";
  severity: "info" | "warning" | "blocking";
  message: string;
  proposedFix: string;
};

export type CaptionQualityReport = {
  status: "approved" | "warning" | "blocked";
  contrastRatio: number | null;
  preferredPlacement: CaptionPlacement;
  resolvedPlacement: Exclude<CaptionPlacement, "adaptive">;
  profile: CaptionPlatformProfile;
  focusRegions: CaptionFocusRegion[];
  issues: CaptionQualityIssue[];
};

const CANDIDATES: Array<Exclude<CaptionPlacement, "adaptive">> = ["lower", "top", "center"];

function bounded(value: number): number {
  return Math.max(0, Math.min(1, Number(value) || 0));
}

function luminance(hex: string): number | null {
  const value = String(hex || "").trim();
  const match = /^#?([0-9a-f]{6})$/i.exec(value);
  if (!match) return null;
  const channels = [match[1].slice(0, 2), match[1].slice(2, 4), match[1].slice(4, 6)].map((item) => Number.parseInt(item, 16) / 255).map((channel) => channel <= .03928 ? channel / 12.92 : ((channel + .055) / 1.055) ** 2.4);
  return .2126 * channels[0] + .7152 * channels[1] + .0722 * channels[2];
}

export function contrastRatio(foreground: string | null | undefined, background: string | null | undefined): number | null {
  const front = luminance(String(foreground || ""));
  const back = luminance(String(background || ""));
  if (front === null || back === null) return null;
  return Math.round(((Math.max(front, back) + .05) / (Math.min(front, back) + .05)) * 100) / 100;
}

export function normalizeFocusRegions(input: CaptionFocusRegion[] | null | undefined): CaptionFocusRegion[] {
  return (Array.isArray(input) ? input : [])
    .map((region, index) => ({
      id: String(region.id || `focus-${index + 1}`),
      x: bounded(region.x),
      y: bounded(region.y),
      width: Math.max(.02, Math.min(1, Number(region.width) || 0)),
      height: Math.max(.02, Math.min(1, Number(region.height) || 0)),
      label: String(region.label || "subject"),
      source: region.source === "source_analysis" ? "source_analysis" as const : "creator_marked" as const,
      confidence: typeof region.confidence === "number" && Number.isFinite(region.confidence) ? region.confidence : null,
    }))
    .filter((region) => region.x < 1 && region.y < 1);
}

function captionRegion(placement: Exclude<CaptionPlacement, "adaptive">, profile: CaptionPlatformProfile, width: number, height: number) {
  const safe = resolveCaptionPlatformProfile({ profile, width, height });
  const left = safe.left;
  const right = 1 - safe.right;
  const estimatedHeight = height > width ? .18 : .16;
  if (placement === "top") return { x: left, y: safe.top, width: right - left, height: estimatedHeight };
  if (placement === "center") return { x: left, y: .5 - estimatedHeight / 2, width: right - left, height: estimatedHeight };
  return { x: left, y: 1 - safe.bottom - estimatedHeight, width: right - left, height: estimatedHeight };
}

function overlaps(left: { x: number; y: number; width: number; height: number }, right: CaptionFocusRegion): boolean {
  return left.x < right.x + right.width && left.x + left.width > right.x && left.y < right.y + right.height && left.y + left.height > right.y;
}

export function resolveCollisionAwarePlacement(input: {
  preferred: CaptionPlacement;
  profile: CaptionPlatformProfile;
  width: number;
  height: number;
  focusRegions?: CaptionFocusRegion[];
}): { placement: Exclude<CaptionPlacement, "adaptive">; collides: boolean; checkedRegions: CaptionFocusRegion[] } {
  const focusRegions = normalizeFocusRegions(input.focusRegions);
  const fallback = resolveCaptionPlatformProfile({ profile: input.profile, width: input.width, height: input.height }).preferred as Exclude<CaptionPlacement, "adaptive">;
  const preferred = input.preferred === "adaptive" ? fallback : input.preferred;
  const candidates = [preferred, ...CANDIDATES.filter((candidate) => candidate !== preferred)];
  for (const candidate of candidates) {
    const region = captionRegion(candidate, input.profile, input.width, input.height);
    if (!focusRegions.some((focus) => overlaps(region, focus))) return { placement: candidate, collides: false, checkedRegions: focusRegions };
  }
  return { placement: preferred, collides: true, checkedRegions: focusRegions };
}

export function evaluateCaptionQuality(input: {
  segments: CaptionSegment[];
  profile: CaptionPlatformProfile;
  preferredPlacement: CaptionPlacement;
  focusRegions?: CaptionFocusRegion[];
  width: number;
  height: number;
  textColor?: string | null;
  backgroundColor?: string | null;
  strict?: boolean;
}): CaptionQualityReport {
  const issues: CaptionQualityIssue[] = [];
  const focusRegions = normalizeFocusRegions(input.focusRegions);
  const placement = resolveCollisionAwarePlacement({ preferred: input.preferredPlacement, profile: input.profile, width: input.width, height: input.height, focusRegions });
  const ratio = contrastRatio(input.textColor || "#FFFFFF", input.backgroundColor || "#0A0A0A");
  if (ratio !== null && ratio < 4.5) issues.push({ code: "low_contrast", severity: input.strict ? "blocking" : "warning", message: `Text contrast is ${ratio}:1, below the 4.5:1 readability floor.`, proposedFix: "Choose a higher-contrast word color or darker caption background." });
  const longGroup = input.segments.find((segment) => String(segment.text || "").trim().split(/\s+/).filter(Boolean).length > 12);
  if (longGroup) issues.push({ code: "caption_density", severity: "warning", message: "One caption group is longer than 12 words.", proposedFix: "Split the group into shorter timed phrases before export." });
  const duration = Math.max(.01, (input.segments.at(-1)?.end || 0) - (input.segments[0]?.start || 0));
  const words = input.segments.reduce((count, segment) => count + String(segment.text || "").trim().split(/\s+/).filter(Boolean).length, 0);
  const wpm = words / duration * 60;
  if (wpm > 220) issues.push({ code: "fast_pacing", severity: "warning", message: `The source is moving at about ${Math.round(wpm)} words per minute.`, proposedFix: "Use shorter phrase groups or a faster style before export." });
  if (focusRegions.length === 0) issues.push({ code: "unknown_focus", severity: "info", message: "No creator-marked focus area is available for collision checking.", proposedFix: "Mark the subject area when the person stays in one part of the frame." });
  if (placement.collides) issues.push({ code: "focus_collision", severity: input.strict ? "blocking" : "warning", message: "Every safe caption zone overlaps the marked subject area.", proposedFix: "Move the focus mark, select a manual placement, or shorten the caption block." });
  const status = issues.some((issue) => issue.severity === "blocking") ? "blocked" : issues.some((issue) => issue.severity === "warning") ? "warning" : "approved";
  return { status, contrastRatio: ratio, preferredPlacement: input.preferredPlacement, resolvedPlacement: placement.placement, profile: input.profile, focusRegions, issues };
}
