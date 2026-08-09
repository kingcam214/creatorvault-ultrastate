import { describe, expect, it, vi } from "vitest";

vi.mock("../db", () => ({ db: {} }));

import { analyzePcmForCreatorVault } from "./audioIntelligenceService";

describe("canonical audio intelligence", () => {
  it("derives rhythmic beats, waveform, energy, and sections from a real PCM pulse pattern", () => {
    const sampleRate = 44_100;
    const durationSeconds = 8;
    const samples = new Float32Array(sampleRate * durationSeconds);
    for (let beat = 0; beat < durationSeconds * 2; beat += 1) {
      const start = Math.round(beat * 0.5 * sampleRate);
      for (let index = 0; index < Math.round(sampleRate * 0.08); index += 1) {
        const envelope = 1 - index / Math.round(sampleRate * 0.08);
        samples[start + index] = Math.sin(2 * Math.PI * 110 * index / sampleRate) * envelope * 0.95;
      }
    }

    const analysis = analyzePcmForCreatorVault(samples, durationSeconds);

    expect(analysis.waveform.length).toBeGreaterThan(0);
    expect(analysis.energyMap.length).toBeGreaterThan(4);
    expect(analysis.sections.length).toBeGreaterThan(1);
    expect(analysis.onsetTimesMs.length).toBeGreaterThan(3);
    expect(analysis.beatTimesMs.length).toBeGreaterThan(3);
    expect(analysis.bpm).not.toBeNull();
    expect(analysis.analysisStatus).toBe("ready");
  });

  it("records low-confidence sound honestly instead of fabricating beats", () => {
    const samples = new Float32Array(44_100 * 2);
    const analysis = analyzePcmForCreatorVault(samples, 2);

    expect(analysis.beatTimesMs).toEqual([]);
    expect(analysis.analysisStatus).toBe("insufficient_signal");
    expect(analysis.confidence).toBe(0);
  });
});
