import type { Landmark, NormalizedLandmark, PoseLandmarker } from "@mediapipe/tasks-vision";

export type LocalBodyCinemaLandmark = {
  x: number;
  y: number;
  z?: number;
  visibility?: number;
};

export type LocalBodyCinemaFrameEvidence = {
  timestampMs: number;
  width: number;
  height: number;
  frameFingerprint?: string;
  brightness?: number;
  contrast?: number;
  sharpness?: number;
  colorWarmth?: number;
  subjectCoverage?: number;
  face?: { present: boolean; centerX?: number; centerY?: number; coverage?: number; expressionSignals?: Record<string, number> };
  landmarks: LocalBodyCinemaLandmark[];
  worldLandmarks?: Array<{ x: number; y: number; z: number; visibility?: number }>;
};

export type LocalBodyCinemaAnalysis = {
  analyzer: "adaptive-video-source-intelligence/v2";
  sourceFingerprint: string;
  frameEvidence: LocalBodyCinemaFrameEvidence[];
  sampleCount: number;
};

const WASM_ROOT = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.22-rc.20250304/wasm";
const POSE_MODEL = "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_full/float16/1/pose_landmarker_full.task";

let poseLandmarkerPromise: Promise<PoseLandmarker> | null = null;
let lastInferenceTimestamp = 0;

function waitFor(video: HTMLVideoElement, event: "loadedmetadata" | "seeked" | "error"): Promise<void> {
  return new Promise((resolve, reject) => {
    const cleanup = () => {
      clearTimeout(timeout);
      video.removeEventListener("loadedmetadata", onReady);
      video.removeEventListener("seeked", onReady);
      video.removeEventListener("error", onError);
    };
    const onReady = () => {
      cleanup();
      resolve();
    };
    const onError = () => {
      cleanup();
      reject(new Error("The browser could not read this video for local pose analysis."));
    };
    const timeout = setTimeout(() => {
      cleanup();
      reject(new Error("The original video could not be read in time. Your source and saved plan have not changed."));
    }, 20_000);
    video.addEventListener(event, onReady, { once: true });
    video.addEventListener("error", onError, { once: true });
  });
}

async function getPoseLandmarker(): Promise<PoseLandmarker> {
  if (!poseLandmarkerPromise) {
    poseLandmarkerPromise = (async () => {
      const { FilesetResolver, PoseLandmarker } = await import("@mediapipe/tasks-vision");
      const vision = await FilesetResolver.forVisionTasks(WASM_ROOT);
      const options = {
        baseOptions: { modelAssetPath: POSE_MODEL, delegate: "GPU" as const },
        runningMode: "VIDEO" as const,
        numPoses: 1,
        minPoseDetectionConfidence: 0.5,
        minPosePresenceConfidence: 0.5,
        minTrackingConfidence: 0.5,
      };
      try {
        return await PoseLandmarker.createFromOptions(vision, options);
      } catch {
        return PoseLandmarker.createFromOptions(vision, {
          ...options,
          baseOptions: { modelAssetPath: POSE_MODEL, delegate: "CPU" as const },
        });
      }
    })().catch(error => {
      poseLandmarkerPromise = null;
      throw error;
    });
  }
  return poseLandmarkerPromise;
}

function sanitizeLandmarks(points: NormalizedLandmark[] | undefined): LocalBodyCinemaLandmark[] {
  return (points || []).map((point) => ({
    x: Number(point.x),
    y: Number(point.y),
    z: Number(point.z || 0),
    visibility: typeof point.visibility === "number" && Number.isFinite(point.visibility) ? Number(point.visibility) : 0,
  }));
}

function sanitizeWorldLandmarks(points: Landmark[] | undefined): Array<{ x: number; y: number; z: number; visibility?: number }> {
  return (points || []).map((point) => ({
    x: Number(point.x),
    y: Number(point.y),
    z: Number(point.z),
    visibility: typeof point.visibility === "number" && Number.isFinite(point.visibility) ? Number(point.visibility) : 0,
  }));
}

export function bodyCinemaMeasuredSampleTimes(durationSeconds: number): number[] {
  if (!Number.isFinite(durationSeconds) || durationSeconds <= 0 || durationSeconds > 600) {
    throw new Error("The original must be a bounded playable video of at most ten minutes.");
  }
  const leadIn = Math.min(0.05, durationSeconds / 10);
  const tail = durationSeconds - leadIn;
  if (durationSeconds <= 20) {
    const count = Math.min(24, Math.max(12, Math.ceil(durationSeconds / 0.8) + 1));
    return Array.from({ length: count }, (_, index) => Number((leadIn + (tail - leadIn) * index / (count - 1)).toFixed(3)));
  }
  // Short observed pairs, not invented coverage of the unsampled long gaps.
  const window = Math.min(0.4, (tail - leadIn) / 24);
  return Array.from({ length: 12 }, (_, index) => {
    const anchor = leadIn + (tail - window - leadIn) * index / 11;
    return [Number(anchor.toFixed(3)), Number((anchor + window).toFixed(3))];
  }).flat();
}

function frameVisualDiagnostics(video: HTMLVideoElement): { frameFingerprint: string; brightness: number; contrast: number; sharpness: number; colorWarmth: number } {
  const width = 32;
  const height = 32;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) throw new Error("Browser canvas access is required to score the local source frames.");
  context.drawImage(video, 0, 0, width, height);
  const pixels = context.getImageData(0, 0, width, height).data;
  const luminance = new Array<number>(width * height);
  let total = 0;
  let warmthTotal = 0;
  for (let index = 0; index < luminance.length; index += 1) {
    const offset = index * 4;
    const value = (pixels[offset] * 0.2126 + pixels[offset + 1] * 0.7152 + pixels[offset + 2] * 0.0722) / 255;
    luminance[index] = value;
    total += value;
    warmthTotal += Math.max(0, pixels[offset] - pixels[offset + 2]) / 255;
  }
  const brightness = total / luminance.length;
  const variance = luminance.reduce((sum, value) => sum + (value - brightness) ** 2, 0) / luminance.length;
  const contrast = Math.max(0, Math.min(1, Math.sqrt(variance) / 0.28));
  let edgeTotal = 0;
  let edgeCount = 0;
  for (let y = 0; y < height - 1; y += 1) {
    for (let x = 0; x < width - 1; x += 1) {
      const index = y * width + x;
      edgeTotal += Math.abs(luminance[index] - luminance[index + 1]);
      edgeTotal += Math.abs(luminance[index] - luminance[index + width]);
      edgeCount += 2;
    }
  }
  const sharpness = Math.max(0, Math.min(1, (edgeTotal / Math.max(1, edgeCount)) / 0.18));
  let fingerprint = "";
  for (let gridY = 0; gridY < 8; gridY += 1) {
    for (let gridX = 0; gridX < 8; gridX += 1) {
      let cell = 0;
      for (let y = 0; y < 4; y += 1) {
        for (let x = 0; x < 4; x += 1) {
          cell += luminance[(gridY * 4 + y) * width + (gridX * 4 + x)];
        }
      }
      const bitIndex = gridY * 8 + gridX;
      if ((cell / 16) > brightness) {
        const nibbleIndex = Math.floor(bitIndex / 4);
        const bitInNibble = 3 - (bitIndex % 4);
        const current = parseInt(fingerprint[nibbleIndex] || "0", 16);
        const next = (current | (1 << bitInNibble)).toString(16);
        fingerprint = `${fingerprint.slice(0, nibbleIndex)}${next}${fingerprint.slice(nibbleIndex + 1)}`;
      }
      while (fingerprint.length < Math.floor(bitIndex / 4) + 1) fingerprint += "0";
    }
  }
  return { frameFingerprint: fingerprint.padEnd(16, "0"), brightness, contrast, sharpness, colorWarmth: Math.max(0, Math.min(1, warmthTotal / luminance.length)) };
}

function poseCompositionDiagnostics(landmarks: LocalBodyCinemaLandmark[]): Pick<LocalBodyCinemaFrameEvidence, "subjectCoverage" | "face"> {
  const visible = landmarks.filter((point) => (point.visibility ?? 0) >= 0.5 && point.x >= 0 && point.x <= 1 && point.y >= 0 && point.y <= 1);
  if (!visible.length) return { subjectCoverage: 0, face: { present: false } };
  const xValues = visible.map((point) => point.x);
  const yValues = visible.map((point) => point.y);
  const left = Math.max(0, Math.min(...xValues));
  const right = Math.min(1, Math.max(...xValues));
  const top = Math.max(0, Math.min(...yValues));
  const bottom = Math.min(1, Math.max(...yValues));
  const facePoints = landmarks.slice(0, 11).filter((point) => (point.visibility ?? 0) >= 0.5 && point.x >= 0 && point.x <= 1 && point.y >= 0 && point.y <= 1);
  const faceX = facePoints.length ? facePoints.reduce((sum, point) => sum + point.x, 0) / facePoints.length : undefined;
  const faceY = facePoints.length ? facePoints.reduce((sum, point) => sum + point.y, 0) / facePoints.length : undefined;
  return {
    subjectCoverage: Math.max(0, Math.min(1, (right - left) * (bottom - top))),
    face: facePoints.length >= 4 ? { present: true, centerX: faceX, centerY: faceY, coverage: Math.max(0, Math.min(1, (right - left) * Math.max(0.03, (faceY || top) - top + 0.03))) } : { present: false },
  };
}

export async function fingerprintBodyCinemaSource(file: File): Promise<string> {
  const sample = await file.slice(0, 65_536).arrayBuffer();
  const descriptor = new TextEncoder().encode(`${file.name}|${file.size}|${file.lastModified}|${file.type}|`);
  const merged = new Uint8Array(descriptor.byteLength + sample.byteLength);
  merged.set(descriptor, 0);
  merged.set(new Uint8Array(sample), descriptor.byteLength);
  const digest = await crypto.subtle.digest("SHA-256", merged);
  return Array.from(new Uint8Array(digest)).map((value) => value.toString(16).padStart(2, "0")).join("");
}

export async function analyzeBodyCinemaSourceLocally(file: File): Promise<LocalBodyCinemaAnalysis> {
  if (!file.type.startsWith("video/")) {
    throw new Error("Body Cinema source analysis currently requires a video file so it can verify pose and movement across sampled frames.");
  }

  const objectUrl = URL.createObjectURL(file);
  const video = document.createElement("video");
  video.muted = true;
  video.playsInline = true;
  video.preload = "auto";
  video.src = objectUrl;

  try {
    if (video.readyState < HTMLMediaElement.HAVE_METADATA) await waitFor(video, "loadedmetadata");
    const landmarker = await getPoseLandmarker();
    const frameEvidence: LocalBodyCinemaFrameEvidence[] = [];

    for (const sampleTime of bodyCinemaMeasuredSampleTimes(video.duration)) {
      const seek = waitFor(video, "seeked");
      video.currentTime = sampleTime;
      await seek;
      // MediaPipe requires increasing inference timestamps across every use of
      // the cached detector. Source timecodes remain the actual seek positions.
      lastInferenceTimestamp = Math.max(lastInferenceTimestamp + 1, Math.round(performance.now()));
      const result = landmarker.detectForVideo(video, lastInferenceTimestamp);
      const landmarks = sanitizeLandmarks(result.landmarks?.[0]);
      if (!landmarks.length) continue;
      frameEvidence.push({
        timestampMs: Math.round(sampleTime * 1000),
        width: video.videoWidth || 1,
        height: video.videoHeight || 1,
        ...frameVisualDiagnostics(video),
        ...poseCompositionDiagnostics(landmarks),
        landmarks,
        worldLandmarks: sanitizeWorldLandmarks(result.worldLandmarks?.[0]),
      });
    }

    if (frameEvidence.length < 3) {
      throw new Error("Body Cinema could not verify a stable pose across enough source frames. Use a well-lit, unobstructed clip with the creator in frame.");
    }

    return {
      analyzer: "adaptive-video-source-intelligence/v2",
      sourceFingerprint: await fingerprintBodyCinemaSource(file),
      frameEvidence,
      sampleCount: frameEvidence.length,
    };
  } finally {
    video.removeAttribute("src");
    video.load();
    URL.revokeObjectURL(objectUrl);
  }
}

/** Read the already-owned original, never upload it to an inference provider. */
export async function analyzeBodyCinemaOwnedSource(input: {
  sourceUrl: string;
  sourceSha256: string;
  fileName: string;
  onStage?: (stage: string) => void;
}): Promise<LocalBodyCinemaAnalysis> {
  const url = new URL(input.sourceUrl, window.location.origin);
  if (url.origin !== window.location.origin || !url.pathname.startsWith("/api/body-cinema/lifecycle/")) {
    throw new Error("Use the protected original from your saved Body Cinema source.");
  }
  if (!/^[a-f0-9]{64}$/i.test(input.sourceSha256)) {
    throw new Error("The original's verified byte identity is unavailable.");
  }
  input.onStage?.("Reading your original — no media leaves your browser for analysis.");
  const response = await fetch(url, { credentials: "same-origin", cache: "no-store", signal: AbortSignal.timeout(60_000) });
  if (!response.ok) {
    throw new Error(response.status === 401 ? "Sign in again to read your saved original. Your plan has not changed." : "Your protected original is not available for analysis.");
  }
  const bytes = await response.arrayBuffer();
  if (!bytes.byteLength || bytes.byteLength > 512 * 1024 * 1024) {
    throw new Error("Local analysis requires an original under 512 MB.");
  }
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  const hash = Array.from(new Uint8Array(digest), value => value.toString(16).padStart(2, "0")).join("");
  if (hash !== input.sourceSha256.toLowerCase()) {
    throw new Error("The original's bytes no longer match the saved source. Analysis and freezing are stopped.");
  }
  input.onStage?.("Measuring visible pose, natural movement and source light locally.");
  // The existing MediaPipe detector downloads static model/WASM files, not
  // source media. Inference runs locally. No provider job or render is invoked.
  const analysis = await analyzeBodyCinemaSourceLocally(new File([bytes], input.fileName, { type: "video/mp4" }));
  return { ...analysis, sourceFingerprint: hash };
}
