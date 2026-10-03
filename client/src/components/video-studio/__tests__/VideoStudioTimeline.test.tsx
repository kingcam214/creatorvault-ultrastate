import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import {
  detectTransientPeaks,
  snapCutMarkersToBeats,
  snapCutToNearestBeat,
} from "../audioBeatDetector";
import {
  VideoStudioTimeline,
  createChainCutMarkers,
  formatTimelineTime,
} from "../VideoStudioTimeline";
import {
  DEFAULT_BRAND_OVERLAY_STATE,
  type TimelineSegment,
  type VideoTimelineChain,
} from "../types";

const segments: TimelineSegment[] = [
  {
    id: "segment-one",
    segmentOrder: 1,
    durationSec: 4,
    promptText: "A slow dolly in keeps the creator's silhouette locked.",
    segmentStatus: "complete",
    startFrameUrl: "https://creatorvault.live/uploads/persona-vaults/start.png",
    terminalFrameExtractedUrl:
      "https://creatorvault.live/uploads/video-chains/terminal-one.png",
    streamUrl: "https://creatorvault.live/uploads/video-chains/segment-one.mp4",
    cameraMotionType: "dolly_in",
  },
  {
    id: "segment-two",
    segmentOrder: 2,
    durationSec: 5,
    promptText: "Continue the exact terminal frame into a controlled orbit.",
    segmentStatus: "generating",
    startFrameUrl:
      "https://creatorvault.live/uploads/video-chains/terminal-one.png",
    terminalFrameExtractedUrl: null,
    streamUrl: null,
    cameraMotionType: "orbit_left",
  },
];

const chain: VideoTimelineChain = {
  id: "chain-one",
  chainStatus: "generating",
  totalDurationSec: 9,
  frameRate: 30,
  aspectRatio: "9:16",
  renderCompletionIsOwnerAcceptance: false,
  segments,
};

describe("VideoStudioTimeline", () => {
  it("renders the three real timeline tracks and persisted frame references", () => {
    const markup = renderToStaticMarkup(
      <VideoStudioTimeline
        chain={chain}
        beatAnalysis={{
          durationSec: 9,
          sampleRate: 1000,
          frameSize: 20,
          hopSize: 10,
          threshold: 0.1,
          onsets: [{ timeSec: 3.9, strength: 0.8 }],
        }}
        audioName="creator-owned-track.wav"
        audioUrl="blob:creator-owned-track"
        isAnalyzingAudio={false}
        audioError={null}
        overlays={DEFAULT_BRAND_OVERLAY_STATE}
        onAudioSelected={() => undefined}
      />
    );
    expect(markup).toContain("Video track");
    expect(markup).toContain("Audio / music");
    expect(markup).toContain("Overlay / titles");
    expect(markup).toContain(segments[0].startFrameUrl);
    expect(markup).toContain(segments[0].terminalFrameExtractedUrl);
    expect(markup).toContain("Render state is not owner acceptance");
  });

  it("detects separated PCM transient peaks without uploading audio", () => {
    const samples = new Float32Array(6000);
    for (const start of [1000, 3500]) {
      for (let index = start; index < start + 30; index += 1)
        samples[index] = 0.98;
    }
    const analysis = detectTransientPeaks(samples, 1000, {
      frameSize: 40,
      hopSize: 20,
      minimumBeatDistanceSec: 0.2,
      sensitivity: 0.5,
    });
    expect(analysis.onsets.length).toBeGreaterThanOrEqual(2);
    expect(
      analysis.onsets.some(onset => Math.abs(onset.timeSec - 1) < 0.08)
    ).toBe(true);
    expect(
      analysis.onsets.some(onset => Math.abs(onset.timeSec - 3.5) < 0.08)
    ).toBe(true);
  });

  it("snaps only nearby cuts and preserves the immutable segment order", () => {
    const markers = createChainCutMarkers(segments);
    const snapped = snapCutMarkersToBeats(markers, [
      { timeSec: 3.92, strength: 0.8 },
      { timeSec: 1.1, strength: 0.5 },
    ]);
    expect(snapped[0]).toMatchObject({
      timeSec: 3.92,
      snappedBeatTimeSec: 3.92,
    });
    expect(
      snapCutToNearestBeat(6, [{ timeSec: 3.92, strength: 0.8 }], 0.25)
    ).toEqual({ timeSec: 6, beatTimeSec: null, snapped: false });
  });

  it("formats a stable readable SMPTE-style timeline label", () => {
    expect(formatTimelineTime(65.42)).toBe("01:05:42");
  });
});
