export const TOPAZ_PRECISION_MODE = "body_cinema_topaz_precision";
export const TOPAZ_PROTEUS_MODEL = "prob-4";

export type TopazPrecisionSource = {
  width: number;
  height: number;
  durationSeconds: number;
  frameRate: number;
  frameCount: number;
  sizeBytes: number;
  container: "mp4";
};

export type TopazPrecisionRequest = {
  source: {
    resolution: { width: number; height: number };
    container: "mp4";
    size: number;
    duration: number;
    frameRate: number;
    frameCount: number;
  };
  output: {
    resolution: { width: number; height: number };
    container: "mp4";
    audioCodec: "AAC";
    audioTransfer: "Copy";
    frameRate: number;
    dynamicCompressionLevel: "High";
  };
  filters: Array<{
    model: typeof TOPAZ_PROTEUS_MODEL;
    auto: "Auto";
  }>;
};

export type TopazPrecisionOptions = {
  outputWidth: number;
  outputHeight: number;
  requestedModel?: string | null;
  audioTransfer?: string | null;
};

const GENERATIVE_OR_UNSAFE_MODEL_HINTS = [
  "astra",
  "starlight",
  "creative",
  "generative",
  "style",
  "prompt",
  "swap",
  "replace",
];

function asPositiveInteger(value: unknown, label: string): number {
  const numeric = Number(value);
  if (!Number.isInteger(numeric) || numeric <= 0) throw new Error(`${label} must be a positive whole number.`);
  return numeric;
}

function assertFinitePositive(value: unknown, label: string): number {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric <= 0) throw new Error(`${label} must be a positive number.`);
  return numeric;
}

export function assertTopazPrecisionOptions(options: TopazPrecisionOptions): void {
  const requestedModel = String(options.requestedModel || TOPAZ_PROTEUS_MODEL).trim().toLowerCase();
  if (requestedModel !== TOPAZ_PROTEUS_MODEL) {
    throw new Error("Body Cinema precision finishing only permits the non-generative Topaz Proteus model.");
  }
  if (GENERATIVE_OR_UNSAFE_MODEL_HINTS.some((hint) => requestedModel.includes(hint))) {
    throw new Error("Generative Topaz modes are not permitted on protected Body Cinema source footage.");
  }
  if (String(options.audioTransfer || "Copy").trim().toLowerCase() !== "copy") {
    throw new Error("Body Cinema precision finishing must preserve the original audio track exactly.");
  }
}

export function buildTopazPrecisionRequest(source: TopazPrecisionSource, options: TopazPrecisionOptions): TopazPrecisionRequest {
  assertTopazPrecisionOptions(options);
  const width = asPositiveInteger(source.width, "Source width");
  const height = asPositiveInteger(source.height, "Source height");
  const outputWidth = asPositiveInteger(options.outputWidth, "Output width");
  const outputHeight = asPositiveInteger(options.outputHeight, "Output height");
  const duration = assertFinitePositive(source.durationSeconds, "Source duration");
  const frameRate = assertFinitePositive(source.frameRate, "Source frame rate");
  const frameCount = asPositiveInteger(source.frameCount, "Source frame count");
  const size = asPositiveInteger(source.sizeBytes, "Source size");

  if (outputWidth < width || outputHeight < height) {
    throw new Error("Body Cinema precision finishing cannot downscale protected creator footage.");
  }
  if (size > 500 * 1024 * 1024) {
    throw new Error("This source exceeds the documented Topaz Video API request-size limit.");
  }

  return {
    source: {
      resolution: { width, height },
      container: "mp4",
      size,
      duration,
      frameRate,
      frameCount,
    },
    output: {
      resolution: { width: outputWidth, height: outputHeight },
      container: "mp4",
      audioCodec: "AAC",
      audioTransfer: "Copy",
      frameRate,
      dynamicCompressionLevel: "High",
    },
    filters: [{ model: TOPAZ_PROTEUS_MODEL, auto: "Auto" }],
  };
}

export function isTopazPrecisionConfigurationAvailable(apiKey: string | undefined | null): boolean {
  return Boolean(String(apiKey || "").trim());
}
