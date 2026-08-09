import { describe, expect, it, vi } from "vitest";

vi.mock("../db", () => ({ db: { execute: vi.fn().mockResolvedValue([]) } }));
vi.mock("./audioIntelligenceService", () => ({
  getCanonicalAudioAsset: vi.fn().mockResolvedValue({
    id: "asset-123",
    rights: { state: "creator_owned", permittedUses: ["render"], allowedPlatforms: ["creatorvault"] }
  }),
  getAudioAnalysis: vi.fn().mockResolvedValue({
    id: "analysis-123",
    analysisStatus: "ready",
    durationSeconds: 15,
    bpm: 120,
    beatTimesMs: [500, 1000, 1500, 2000, 2500, 3000],
    downbeatTimesMs: [1000, 3000],
    onsetTimesMs: [450, 950, 1450, 1950],
    sections: [{ startMs: 0, endMs: 2000, label: "build" }, { startMs: 2000, endMs: 15000, label: "peak" }]
  }),
  assertAudioRights: vi.fn(),
}));
vi.mock("./bodyCinemaEvidenceService", () => ({
  getBodyCinemaSourceEvidence: vi.fn().mockResolvedValue({
    id: "evidence-123",
    analysisStatus: "verified",
    selectedDirectionId: "silhouette",
    sourceMediaUrl: "https://example.com/source.mp4",
    directions: [{
      id: "silhouette",
      timeline: [
        { id: "hook", startMs: 0, endMs: 1100, sourceTimestampMs: 0 },
        { id: "build", startMs: 1100, endMs: 2200, sourceTimestampMs: 2000 },
        { id: "payoff", startMs: 2200, endMs: 4000, sourceTimestampMs: 4000 }
      ]
    }]
  })
}));

import { buildAudioDirectedTimeline } from "./audioTimelinePlanner";

describe("audio timeline planner", () => {
  it("snaps visual beats to the nearest rhythmic event", async () => {
    const plan = await buildAudioDirectedTimeline({
      creatorId: 1,
      audioAssetId: "asset-123",
      sourceEvidenceId: "evidence-123",
      treatmentId: "silhouette",
      targetDurationSeconds: 10,
      preserveSourceAudio: false,
      destinationPlatform: "creatorvault"
    });

    expect(plan.visualEvents.length).toBe(3);
    
    // Hook target end is 1100. Nearest downbeat is 1000.
    expect(plan.visualEvents[0].endMs).toBe(1000);
    expect(plan.audioAnchors[0].eventType).toBe("downbeat");

    // Build target end is 1000 + 1100 = 2100. Section peak starts at 2000.
    expect(plan.visualEvents[1].endMs).toBe(2000);
    expect(plan.audioAnchors[1].eventType).toBe("section");

    // Payoff target end is 2000 + 1800 = 3800. The nearest downbeat (3000) is 800ms away,
    // which exceeds the 300ms maxDistance, so it correctly falls back to the exact target.
    expect(plan.visualEvents[2].endMs).toBe(3800);
  });
});
