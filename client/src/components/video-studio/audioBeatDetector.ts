import type { BeatAnalysis, BeatOnset, TimelineCutMarker } from "./types";

export type BeatDetectorOptions = {
  frameSize?: number;
  hopSize?: number;
  minimumBeatDistanceSec?: number;
  sensitivity?: number;
};

const DEFAULT_OPTIONS: Required<BeatDetectorOptions> = {
  frameSize: 1024,
  hopSize: 512,
  minimumBeatDistanceSec: 0.12,
  sensitivity: 1.35,
};

function assertPositiveInteger(value: number, label: string): void {
  if (!Number.isSafeInteger(value) || value <= 0) {
    throw new Error(`${label} must be a positive integer.`);
  }
}

function average(values: readonly number[]): number {
  if (!values.length) return 0;
  return values.reduce((total, value) => total + value, 0) / values.length;
}

function standardDeviation(values: readonly number[], mean: number): number {
  if (!values.length) return 0;
  return Math.sqrt(
    values.reduce((total, value) => total + (value - mean) ** 2, 0) /
      values.length
  );
}

function resolveOptions(
  options?: BeatDetectorOptions
): Required<BeatDetectorOptions> {
  const resolved = { ...DEFAULT_OPTIONS, ...options };
  assertPositiveInteger(resolved.frameSize, "frameSize");
  assertPositiveInteger(resolved.hopSize, "hopSize");
  if (
    !Number.isFinite(resolved.minimumBeatDistanceSec) ||
    resolved.minimumBeatDistanceSec < 0
  ) {
    throw new Error("minimumBeatDistanceSec must be zero or greater.");
  }
  if (!Number.isFinite(resolved.sensitivity) || resolved.sensitivity <= 0) {
    throw new Error("sensitivity must be greater than zero.");
  }
  return resolved;
}

/**
 * Detects onset peaks from decoded, mixed-down PCM. This is deliberately local:
 * no audio bytes are uploaded or sent to a provider.
 */
export function detectTransientPeaks(
  samples: Float32Array,
  sampleRate: number,
  options?: BeatDetectorOptions
): BeatAnalysis {
  assertPositiveInteger(sampleRate, "sampleRate");
  const resolved = resolveOptions(options);
  if (!samples.length) {
    return {
      durationSec: 0,
      sampleRate,
      frameSize: resolved.frameSize,
      hopSize: resolved.hopSize,
      threshold: 0,
      onsets: [],
    };
  }

  const energy: number[] = [];
  for (let start = 0; start < samples.length; start += resolved.hopSize) {
    const end = Math.min(start + resolved.frameSize, samples.length);
    let sumSquares = 0;
    for (let index = start; index < end; index += 1) {
      sumSquares += samples[index] ** 2;
    }
    energy.push(Math.sqrt(sumSquares / Math.max(1, end - start)));
  }

  const novelty = energy.map((value, index) =>
    Math.max(0, value - (energy[index - 1] ?? 0))
  );
  const mean = average(novelty);
  const threshold =
    mean + standardDeviation(novelty, mean) * resolved.sensitivity;
  const minimumFrames = Math.max(
    1,
    Math.ceil((resolved.minimumBeatDistanceSec * sampleRate) / resolved.hopSize)
  );
  const onsets: BeatOnset[] = [];
  let lastPeakIndex = -minimumFrames;

  for (let index = 1; index < novelty.length - 1; index += 1) {
    const value = novelty[index];
    if (
      value < threshold ||
      value < novelty[index - 1] ||
      value < novelty[index + 1]
    )
      continue;
    if (index - lastPeakIndex < minimumFrames) {
      const prior = onsets[onsets.length - 1];
      if (prior && value > prior.strength) {
        onsets[onsets.length - 1] = {
          timeSec: (index * resolved.hopSize) / sampleRate,
          strength: value,
        };
        lastPeakIndex = index;
      }
      continue;
    }
    onsets.push({
      timeSec: (index * resolved.hopSize) / sampleRate,
      strength: value,
    });
    lastPeakIndex = index;
  }

  return {
    durationSec: samples.length / sampleRate,
    sampleRate,
    frameSize: resolved.frameSize,
    hopSize: resolved.hopSize,
    threshold,
    onsets,
  };
}

function mixDown(buffer: AudioBuffer): Float32Array {
  const output = new Float32Array(buffer.length);
  for (let channel = 0; channel < buffer.numberOfChannels; channel += 1) {
    const input = buffer.getChannelData(channel);
    for (let index = 0; index < input.length; index += 1) {
      output[index] += input[index] / buffer.numberOfChannels;
    }
  }
  return output;
}

type AudioContextWindow = Window &
  typeof globalThis & {
    webkitAudioContext?: typeof AudioContext;
  };

function getAudioContextConstructor(): typeof AudioContext {
  if (typeof window === "undefined") {
    throw new Error("Beat analysis requires a browser with the Web Audio API.");
  }
  const browserWindow = window as AudioContextWindow;
  const AudioContextConstructor =
    browserWindow.AudioContext ?? browserWindow.webkitAudioContext;
  if (!AudioContextConstructor) {
    throw new Error(
      "This browser cannot analyze audio because Web Audio is unavailable."
    );
  }
  return AudioContextConstructor;
}

function assertAudioFile(file: File): void {
  const extension = file.name.split(".").pop()?.toLowerCase() ?? "";
  const acceptedExtension = [
    "mp3",
    "wav",
    "m4a",
    "aac",
    "ogg",
    "flac",
  ].includes(extension);
  if (!file.type.startsWith("audio/") && !acceptedExtension) {
    throw new Error(
      "Choose an audio file such as MP3, WAV, M4A, AAC, OGG, or FLAC."
    );
  }
  if (file.size <= 0) throw new Error("The selected audio file is empty.");
  if (file.size > 250 * 1024 * 1024) {
    throw new Error("Audio analysis is limited to files smaller than 250 MB.");
  }
}

/** Decodes a creator-selected local audio file in-browser and returns onset times. */
export async function analyzeAudioFile(
  file: File,
  options?: BeatDetectorOptions,
  signal?: AbortSignal
): Promise<BeatAnalysis> {
  assertAudioFile(file);
  if (signal?.aborted)
    throw new DOMException("Audio analysis was cancelled.", "AbortError");
  const AudioContextConstructor = getAudioContextConstructor();
  const context = new AudioContextConstructor();
  try {
    const encoded = await file.arrayBuffer();
    if (signal?.aborted)
      throw new DOMException("Audio analysis was cancelled.", "AbortError");
    const decoded = await context.decodeAudioData(encoded.slice(0));
    if (signal?.aborted)
      throw new DOMException("Audio analysis was cancelled.", "AbortError");
    return detectTransientPeaks(mixDown(decoded), decoded.sampleRate, options);
  } finally {
    await context.close();
  }
}

export type BeatSnapResult = {
  timeSec: number;
  beatTimeSec: number | null;
  snapped: boolean;
};

/** Snaps one cut to the nearest detected onset only inside the declared tolerance. */
export function snapCutToNearestBeat(
  timeSec: number,
  onsets: readonly BeatOnset[],
  maximumDistanceSec = 0.35
): BeatSnapResult {
  if (!Number.isFinite(timeSec) || timeSec < 0) {
    throw new Error("A cut marker must be a non-negative finite time.");
  }
  if (!Number.isFinite(maximumDistanceSec) || maximumDistanceSec < 0) {
    throw new Error("maximumDistanceSec must be zero or greater.");
  }
  let nearest: BeatOnset | null = null;
  let nearestDistance = Number.POSITIVE_INFINITY;
  for (const onset of onsets) {
    const distance = Math.abs(onset.timeSec - timeSec);
    if (distance < nearestDistance) {
      nearest = onset;
      nearestDistance = distance;
    }
  }
  if (!nearest || nearestDistance > maximumDistanceSec) {
    return { timeSec, beatTimeSec: null, snapped: false };
  }
  return {
    timeSec: nearest.timeSec,
    beatTimeSec: nearest.timeSec,
    snapped: true,
  };
}

/**
 * Preserves segment order while snapping each existing chain boundary. A beat that
 * would reverse a cut is ignored; immutable source segment order is never changed.
 */
export function snapCutMarkersToBeats(
  markers: readonly TimelineCutMarker[],
  onsets: readonly BeatOnset[],
  maximumDistanceSec = 0.35
): TimelineCutMarker[] {
  let previous = 0;
  return markers.map(marker => {
    const snap = snapCutToNearestBeat(
      marker.originalTimeSec,
      onsets,
      maximumDistanceSec
    );
    const canUseBeat = snap.snapped && snap.timeSec > previous;
    const timeSec = canUseBeat ? snap.timeSec : marker.originalTimeSec;
    previous = timeSec;
    return {
      ...marker,
      timeSec,
      snappedBeatTimeSec: canUseBeat ? snap.beatTimeSec : null,
    };
  });
}
