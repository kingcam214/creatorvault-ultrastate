import { createHash, randomUUID } from "node:crypto";
import { createReadStream } from "node:fs";
import { lstat, mkdir, rename, rm, stat } from "node:fs/promises";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { resolveLocalProofUploadStorage } from "../routers/videoUploadRouter";

const execFileAsync = promisify(execFile);

const LOCAL_CUT_FEATURE = "creator_workspace_local_trailer_cut.v1";
const LOCAL_CUT_MAX_SOURCE_BYTES = 1024 * 1024 * 1024;
const LOCAL_CUT_MAX_SECONDS = 15;
const LOCAL_CUT_MIN_SECONDS = 1;

type CutFormat = "16:9" | "9:16" | "1:1";

type LocalCutDimensions = {
  width: number;
  height: number;
};

type LocalCutRuntime = {
  durableUploadsDir: string;
  publicUploadBase: string;
  ffmpegPath: string;
  ffprobePath: string;
};

type DirectionSceneInput = {
  durationSeconds?: unknown;
  duration?: unknown;
};

export type LocalTrailerCutRequest = {
  sourcePublicUrl: string;
  sourceMediaAssetId: string;
  trailerProjectId: string;
  format: CutFormat;
  scenes: unknown;
};

export type PreparedLocalTrailerCut = {
  mediaAssetId: string;
  storagePath: string;
  publicUrl: string;
  fileName: string;
  fileSize: number;
  durationSeconds: number;
  width: number;
  height: number;
  sha256: string;
  sourceMediaAssetId: string;
  trailerProjectId: string;
  format: CutFormat;
  createdByFeature: typeof LOCAL_CUT_FEATURE;
};

type MediaProbe = {
  durationSeconds: number;
  width: number;
  height: number;
};

export class LocalTrailerCutError extends Error {
  constructor(public readonly code: string) {
    super(code);
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function localRuntimeFromEnvironment(
  environment: NodeJS.ProcessEnv = process.env
): LocalCutRuntime | null {
  const localProofMode = environment.CREATORVAULT_LOCAL_PROOF_MODE;
  const enabled = environment.CREATORVAULT_LOCAL_TRAILER_CUT_ENABLED;
  if (!enabled || enabled === "0") return null;
  if (
    localProofMode !== "1" ||
    environment.NODE_ENV !== "test" ||
    enabled !== "1"
  ) {
    throw new LocalTrailerCutError("LOCAL_TRAILER_CUT_CONFIGURATION_REJECTED");
  }

  const storage = resolveLocalProofUploadStorage({
    enabled: localProofMode,
    nodeEnv: environment.NODE_ENV,
    root: environment.CREATORVAULT_LOCAL_PROOF_STORAGE_ROOT,
  });
  if (!storage) {
    throw new LocalTrailerCutError("LOCAL_TRAILER_CUT_CONFIGURATION_REJECTED");
  }

  return {
    durableUploadsDir: storage.durableUploadsDir,
    publicUploadBase: storage.publicUploadBase,
    ffmpegPath: environment.FFMPEG_PATH || "ffmpeg",
    ffprobePath: environment.FFPROBE_PATH || "ffprobe",
  };
}

export function localTrailerCutAvailability(
  environment: NodeJS.ProcessEnv = process.env
): boolean {
  return localRuntimeFromEnvironment(environment) !== null;
}

function assertUuid(value: string, code: string): void {
  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      value
    )
  ) {
    throw new LocalTrailerCutError(code);
  }
}

function assertChildPath(root: string, candidate: string, code: string): void {
  const relative = path.relative(root, candidate);
  if (
    relative === "" ||
    relative === ".." ||
    relative.startsWith(`..${path.sep}`) ||
    path.isAbsolute(relative)
  ) {
    throw new LocalTrailerCutError(code);
  }
}

function localSourceParts(
  sourcePublicUrl: string,
  runtime: LocalCutRuntime
): { storageId: string; fileName: string } {
  let parsed: URL;
  try {
    parsed = new URL(sourcePublicUrl, "http://localhost");
  } catch {
    throw new LocalTrailerCutError("LOCAL_TRAILER_CUT_SOURCE_URL_INVALID");
  }
  if (parsed.search || parsed.hash) {
    throw new LocalTrailerCutError("LOCAL_TRAILER_CUT_SOURCE_URL_INVALID");
  }

  const base = runtime.publicUploadBase.replace(/\/$/, "");
  if (!parsed.pathname.startsWith(`${base}/`)) {
    throw new LocalTrailerCutError("LOCAL_TRAILER_CUT_SOURCE_URL_INVALID");
  }
  const parts = parsed.pathname
    .slice(base.length + 1)
    .split("/")
    .map(part => decodeURIComponent(part));
  if (parts.length !== 2 || !parts[0] || !parts[1]) {
    throw new LocalTrailerCutError("LOCAL_TRAILER_CUT_SOURCE_URL_INVALID");
  }
  assertUuid(parts[0], "LOCAL_TRAILER_CUT_SOURCE_URL_INVALID");
  if (
    parts[1].includes("/") ||
    parts[1] === "." ||
    parts[1] === ".." ||
    parts[1].includes("\0")
  ) {
    throw new LocalTrailerCutError("LOCAL_TRAILER_CUT_SOURCE_URL_INVALID");
  }
  return { storageId: parts[0], fileName: parts[1] };
}

async function assertRealDirectory(
  directory: string,
  code: string
): Promise<void> {
  const directoryStat = await lstat(directory).catch(() => null);
  if (
    !directoryStat ||
    !directoryStat.isDirectory() ||
    directoryStat.isSymbolicLink()
  ) {
    throw new LocalTrailerCutError(code);
  }
}

async function sourcePathForLocalCut(
  sourcePublicUrl: string,
  runtime: LocalCutRuntime
): Promise<string> {
  const { storageId, fileName } = localSourceParts(sourcePublicUrl, runtime);
  const root = path.resolve(runtime.durableUploadsDir);
  const sourceDirectory = path.resolve(root, storageId);
  const sourcePath = path.resolve(sourceDirectory, fileName);
  assertChildPath(
    root,
    sourceDirectory,
    "LOCAL_TRAILER_CUT_SOURCE_PATH_INVALID"
  );
  assertChildPath(
    sourceDirectory,
    sourcePath,
    "LOCAL_TRAILER_CUT_SOURCE_PATH_INVALID"
  );
  await assertRealDirectory(root, "LOCAL_TRAILER_CUT_STORAGE_INVALID");
  await assertRealDirectory(
    sourceDirectory,
    "LOCAL_TRAILER_CUT_SOURCE_PATH_INVALID"
  );

  const sourceStat = await lstat(sourcePath).catch(() => null);
  if (
    !sourceStat ||
    !sourceStat.isFile() ||
    sourceStat.isSymbolicLink() ||
    sourceStat.size < 1 ||
    sourceStat.size > LOCAL_CUT_MAX_SOURCE_BYTES
  ) {
    throw new LocalTrailerCutError("LOCAL_TRAILER_CUT_SOURCE_FILE_INVALID");
  }
  return sourcePath;
}

function outputDimensions(format: CutFormat): LocalCutDimensions {
  if (format === "9:16") return { width: 720, height: 1280 };
  if (format === "1:1") return { width: 1080, height: 1080 };
  return { width: 1280, height: 720 };
}

function numericDuration(value: unknown): number | null {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

export function requestedLocalCutDuration(
  scenes: unknown,
  sourceDurationSeconds: number
): number {
  if (!Number.isFinite(sourceDurationSeconds) || sourceDurationSeconds <= 0) {
    throw new LocalTrailerCutError("LOCAL_TRAILER_CUT_SOURCE_DURATION_INVALID");
  }
  const requestedDuration = Array.isArray(scenes)
    ? scenes.reduce((total, candidate) => {
        if (!isRecord(candidate)) return total;
        const scene = candidate as DirectionSceneInput;
        const duration =
          numericDuration(scene.durationSeconds) ??
          numericDuration(scene.duration);
        return duration ? total + duration : total;
      }, 0)
    : 0;
  const derived =
    requestedDuration > 0 ? requestedDuration : LOCAL_CUT_MAX_SECONDS;
  return Math.max(
    LOCAL_CUT_MIN_SECONDS,
    Math.min(sourceDurationSeconds, LOCAL_CUT_MAX_SECONDS, derived)
  );
}

async function inspectVideo(
  sourcePath: string,
  runtime: LocalCutRuntime
): Promise<MediaProbe> {
  let stdout: string;
  try {
    ({ stdout } = await execFileAsync(
      runtime.ffprobePath,
      [
        "-v",
        "error",
        "-select_streams",
        "v:0",
        "-show_entries",
        "stream=width,height,duration:format=duration",
        "-of",
        "json",
        sourcePath,
      ],
      { timeout: 15_000, maxBuffer: 1024 * 1024, encoding: "utf8" }
    ));
  } catch {
    throw new LocalTrailerCutError("LOCAL_TRAILER_CUT_PROBE_FAILED");
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(stdout) as unknown;
  } catch {
    throw new LocalTrailerCutError("LOCAL_TRAILER_CUT_PROBE_FAILED");
  }
  if (!isRecord(parsed) || !Array.isArray(parsed.streams)) {
    throw new LocalTrailerCutError("LOCAL_TRAILER_CUT_PROBE_FAILED");
  }
  const stream = parsed.streams.find(isRecord);
  const format = isRecord(parsed.format) ? parsed.format : null;
  const width = numericDuration(stream?.width);
  const height = numericDuration(stream?.height);
  const duration =
    numericDuration(format?.duration) ?? numericDuration(stream?.duration);
  if (!width || !height || !duration || width < 16 || height < 16) {
    throw new LocalTrailerCutError("LOCAL_TRAILER_CUT_SOURCE_MEDIA_INVALID");
  }
  return {
    width: Math.round(width),
    height: Math.round(height),
    durationSeconds: duration,
  };
}

async function sha256File(filePath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const hash = createHash("sha256");
    const input = createReadStream(filePath);
    input.on("error", reject);
    input.on("data", chunk => hash.update(chunk));
    input.on("end", () => resolve(hash.digest("hex")));
  });
}

function publicOutputUrl(
  runtime: LocalCutRuntime,
  storageId: string,
  fileName: string
): string {
  return `${runtime.publicUploadBase}/${storageId}/${encodeURIComponent(fileName)}`;
}

export async function createLocalTrailerCut(
  request: LocalTrailerCutRequest,
  suppliedRuntime?: LocalCutRuntime | null
): Promise<PreparedLocalTrailerCut> {
  assertUuid(request.sourceMediaAssetId, "LOCAL_TRAILER_CUT_SOURCE_ID_INVALID");
  assertUuid(
    request.trailerProjectId,
    "LOCAL_TRAILER_CUT_DIRECTION_ID_INVALID"
  );
  if (!["16:9", "9:16", "1:1"].includes(request.format)) {
    throw new LocalTrailerCutError("LOCAL_TRAILER_CUT_FORMAT_INVALID");
  }

  const runtime = suppliedRuntime ?? localRuntimeFromEnvironment();
  if (!runtime) throw new LocalTrailerCutError("LOCAL_TRAILER_CUT_UNAVAILABLE");
  const sourcePath = await sourcePathForLocalCut(
    request.sourcePublicUrl,
    runtime
  );
  const sourceProbe = await inspectVideo(sourcePath, runtime);
  const durationSeconds = requestedLocalCutDuration(
    request.scenes,
    sourceProbe.durationSeconds
  );
  const dimensions = outputDimensions(request.format);
  const mediaAssetId = randomUUID();
  const outputDirectory = path.join(runtime.durableUploadsDir, mediaAssetId);
  const fileName = "local-trailer-cut.mp4";
  const outputPath = path.join(outputDirectory, fileName);
  const partialPath = path.join(
    outputDirectory,
    `.local-trailer-cut.${randomUUID()}.partial.mp4`
  );
  const root = path.resolve(runtime.durableUploadsDir);
  assertChildPath(
    root,
    outputDirectory,
    "LOCAL_TRAILER_CUT_OUTPUT_PATH_INVALID"
  );
  assertChildPath(
    outputDirectory,
    outputPath,
    "LOCAL_TRAILER_CUT_OUTPUT_PATH_INVALID"
  );
  assertChildPath(
    outputDirectory,
    partialPath,
    "LOCAL_TRAILER_CUT_OUTPUT_PATH_INVALID"
  );

  await assertRealDirectory(root, "LOCAL_TRAILER_CUT_STORAGE_INVALID");
  await mkdir(outputDirectory, { recursive: true, mode: 0o700 });
  await assertRealDirectory(
    outputDirectory,
    "LOCAL_TRAILER_CUT_OUTPUT_PATH_INVALID"
  );

  try {
    const filter = `scale=${dimensions.width}:${dimensions.height}:force_original_aspect_ratio=decrease,pad=${dimensions.width}:${dimensions.height}:(ow-iw)/2:(oh-ih)/2:color=black,setsar=1`;
    try {
      await execFileAsync(
        runtime.ffmpegPath,
        [
          "-hide_banner",
          "-loglevel",
          "error",
          "-nostdin",
          "-y",
          "-ss",
          "0",
          "-i",
          sourcePath,
          "-t",
          durationSeconds.toFixed(3),
          "-map",
          "0:v:0",
          "-map",
          "0:a:0?",
          "-vf",
          filter,
          "-c:v",
          "libx264",
          "-preset",
          "veryfast",
          "-crf",
          "23",
          "-pix_fmt",
          "yuv420p",
          "-c:a",
          "aac",
          "-b:a",
          "128k",
          "-movflags",
          "+faststart",
          "-shortest",
          partialPath,
        ],
        { timeout: 120_000, maxBuffer: 1024 * 1024, encoding: "utf8" }
      );
    } catch {
      throw new LocalTrailerCutError("LOCAL_TRAILER_CUT_FFMPEG_FAILED");
    }

    const outputProbe = await inspectVideo(partialPath, runtime);
    const outputStat = await stat(partialPath).catch(() => null);
    if (
      !outputStat ||
      !outputStat.isFile() ||
      outputStat.size < 1 ||
      outputProbe.width !== dimensions.width ||
      outputProbe.height !== dimensions.height ||
      outputProbe.durationSeconds < LOCAL_CUT_MIN_SECONDS ||
      outputProbe.durationSeconds > durationSeconds + 1.25
    ) {
      throw new LocalTrailerCutError("LOCAL_TRAILER_CUT_OUTPUT_INVALID");
    }

    await rename(partialPath, outputPath);
    const sha256 = await sha256File(outputPath);
    return {
      mediaAssetId,
      storagePath: outputPath,
      publicUrl: publicOutputUrl(runtime, mediaAssetId, fileName),
      fileName,
      fileSize: outputStat.size,
      durationSeconds: outputProbe.durationSeconds,
      width: outputProbe.width,
      height: outputProbe.height,
      sha256,
      sourceMediaAssetId: request.sourceMediaAssetId,
      trailerProjectId: request.trailerProjectId,
      format: request.format,
      createdByFeature: LOCAL_CUT_FEATURE,
    };
  } catch (error) {
    await rm(partialPath, { force: true }).catch(() => undefined);
    await rm(outputPath, { force: true }).catch(() => undefined);
    await rm(outputDirectory, { recursive: true, force: true }).catch(
      () => undefined
    );
    throw error;
  }
}

export async function discardLocalTrailerCut(
  storagePath: string,
  suppliedRuntime?: LocalCutRuntime | null
): Promise<void> {
  const runtime = suppliedRuntime ?? localRuntimeFromEnvironment();
  if (!runtime) return;
  const root = path.resolve(runtime.durableUploadsDir);
  const target = path.resolve(storagePath);
  assertChildPath(root, target, "LOCAL_TRAILER_CUT_OUTPUT_PATH_INVALID");
  await rm(path.dirname(target), { recursive: true, force: true });
}

export const localTrailerCutFeature = LOCAL_CUT_FEATURE;
