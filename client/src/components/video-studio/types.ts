export type TimelineSegment = {
  id: string;
  segmentOrder: number;
  durationSec: number;
  promptText: string;
  segmentStatus: string;
  startFrameUrl: string | null;
  terminalFrameExtractedUrl: string | null;
  streamUrl: string | null;
  cameraMotionType: string;
};

export type VideoTimelineChain = {
  id: string;
  chainStatus: "pending" | "generating" | "complete" | "failed";
  totalDurationSec: number;
  frameRate: number;
  aspectRatio: "16:9" | "9:16" | "1:1";
  renderCompletionIsOwnerAcceptance: false;
  segments: TimelineSegment[];
};

export type BeatOnset = {
  timeSec: number;
  strength: number;
};

export type BeatAnalysis = {
  durationSec: number;
  sampleRate: number;
  frameSize: number;
  hopSize: number;
  threshold: number;
  onsets: BeatOnset[];
};

export type TimelineCutMarker = {
  segmentId: string;
  originalTimeSec: number;
  timeSec: number;
  snappedBeatTimeSec: number | null;
};

export type LogoStingPreset = "crown-reveal" | "gold-sweep";

export type BrandOverlayState = {
  introLogoEnabled: boolean;
  introPreset: LogoStingPreset;
  lowerThirdEnabled: boolean;
  trackName: string;
  artistName: string;
  endCardEnabled: boolean;
  endCardCta: string;
  vignetteStrength: number;
};

export const DEFAULT_BRAND_OVERLAY_STATE: BrandOverlayState = {
  introLogoEnabled: true,
  introPreset: "crown-reveal",
  lowerThirdEnabled: true,
  trackName: "",
  artistName: "",
  endCardEnabled: true,
  endCardCta: "FOLLOW THE VAULT",
  vignetteStrength: 62,
};
