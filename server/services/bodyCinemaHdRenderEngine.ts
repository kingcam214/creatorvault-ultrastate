import { AsyncLocalStorage } from "node:async_hooks";
import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { constants } from "node:fs";
import { lstat, open, statfs } from "node:fs/promises";
import type { FileHandle } from "node:fs/promises";
import path from "node:path";
import { freemem } from "node:os";
import { z } from "zod";
import {
  bodyCinemaHdRecipeSchema,
  type BodyCinemaHdRecipe,
} from "../../shared/bodyCinemaHd";

/** Source-bound finishing only. Scaling does not recover missing native detail.
 * Ownership, storage policy, authorization and failed-file quarantine belong to
 * the caller. No provider, network, database, retry or deletion operations.
 */
export type HdRenderRecipe = BodyCinemaHdRecipe;

export const BODY_CINEMA_HD_GRADE_VERSION = "body_cinema.hd_grade.v1";
export const BODY_CINEMA_HD_LIMITS = Object.freeze({
  renderTimeoutMs: 600_000,
  probeTimeoutMs: 60_000,
  maximumSourceBytes: 2 * 1024 ** 3,
  maximumSourceSeconds: 60,
  maximumNativeDimension: 1920,
  minimumFreeMemoryBytes: 512 * 1024 ** 2,
  maximumProbeBytes: 128 * 1024,
  maximumCadenceBytes: 2 * 1024 ** 2,
  maximumStderrBytes: 64 * 1024,
  minimumAvailableBytes: 1024 ** 3,
  minimumAvailableInodes: 1000,
  encoderThreads: 2,
  decoderThreads: 1,
  filterThreads: 1,
});

function fail(code: string): never {
  // Never include user text, file paths, commands, environment or FFmpeg stderr.
  throw new Error(`BODY_CINEMA_HD_${code}`);
}

function validateRecipe(value: unknown): HdRenderRecipe {
  const result = bodyCinemaHdRecipeSchema.safeParse(value);
  if (!result.success) fail("INVALID_RECIPE");
  const recipe = result.data;
  if (
    [
      recipe.sourceAssetId,
      recipe.bodyFocusId,
      recipe.bodyFocusLabel,
      recipe.editStyleId,
      recipe.editStyleName,
    ].some(value => value.length > 256)
  )
    fail("INVALID_RECIPE");
  for (const segment of recipe.segments) {
    if (segment.startMs > 600_000 || segment.endMs > 600_000)
      fail("SEGMENT_OUTSIDE_SOURCE");
    if (segment.endMs - segment.startMs < 2000) fail("MICROSHOT");
  }
  const ordered = [...recipe.segments].sort((a, b) => a.startMs - b.startMs);
  for (let i = 1; i < ordered.length; i++) {
    if (ordered[i].startMs < ordered[i - 1].endMs) fail("OVERLAP_OR_REPEAT");
  }
  return recipe;
}

const GRADE_FILTERS: Readonly<Record<HdRenderRecipe["visualGradeId"], string>> =
  Object.freeze({
    obsidian:
      "curves=master='0/0.003 0.10/0.055 0.25/0.19 0.50/0.49 0.75/0.79 0.92/0.94 1/0.985':r='0/0 0.25/0.25 0.50/0.51 0.75/0.77 1/0.995':g='0/0 0.50/0.50 1/0.985':b='0/0.004 0.25/0.245 0.50/0.49 0.75/0.735 1/0.965',eq=saturation=1.025",
    // Exact master curve and saturation from the demonstrated La Reina engine.
    la_reina:
      "curves=master='0/0.008 0.10/0.085 0.25/0.24 0.50/0.53 0.75/0.79 0.92/0.93 1/0.985',eq=saturation=1.035",
    golden_hour:
      "curves=master='0/0.012 0.10/0.095 0.25/0.255 0.50/0.525 0.75/0.775 0.92/0.925 1/0.975':r='0/0.008 0.25/0.263 0.50/0.518 0.75/0.767 1/0.99':g='0/0.006 0.25/0.254 0.50/0.507 0.75/0.752 1/0.98':b='0/0.008 0.25/0.242 0.50/0.487 0.75/0.733 1/0.958',eq=saturation=1.025",
    midnight_heat:
      "curves=master='0/0.009 0.10/0.072 0.25/0.224 0.50/0.51 0.75/0.775 0.92/0.925 1/0.982':r='0/0.014 0.10/0.108 0.25/0.254 0.50/0.504 0.75/0.754 1/0.99':g='0/0.004 0.10/0.097 0.25/0.249 0.50/0.50 0.75/0.75 1/0.984':b='0/0.022 0.10/0.117 0.25/0.259 0.50/0.50 0.75/0.742 1/0.978',eq=saturation=1.015",
  });

/** Finite color-only filters; no geometry, motion synthesis or identity effects. */
export function getBodyCinemaHdGradeFilter(
  gradeId: HdRenderRecipe["visualGradeId"]
): string {
  if (!Object.hasOwn(GRADE_FILTERS, gradeId)) fail("UNKNOWN_GRADE");
  return GRADE_FILTERS[gradeId];
}

export type HdRenderSourceMetadata = {
  width: number;
  height: number;
  durationSeconds: number;
  /** Exact rational, e.g. 24000/1001, not a rounded decimal replacement. */
  frameRate: string;
  hasAudio: boolean;
  audioDurationSeconds?: number;
  /** FFmpeg display-matrix rotation, in degrees. */
  rotation?: number;
};

const sourceMetadataSchema = z
  .object({
    width: z
      .number()
      .int()
      .positive()
      .max(BODY_CINEMA_HD_LIMITS.maximumNativeDimension),
    height: z
      .number()
      .int()
      .positive()
      .max(BODY_CINEMA_HD_LIMITS.maximumNativeDimension),
    durationSeconds: z
      .number()
      .finite()
      .positive()
      .max(BODY_CINEMA_HD_LIMITS.maximumSourceSeconds),
    frameRate: z.string().regex(/^\d{1,8}\/\d{1,8}$/),
    hasAudio: z.boolean(),
    audioDurationSeconds: z
      .number()
      .finite()
      .positive()
      .max(BODY_CINEMA_HD_LIMITS.maximumSourceSeconds + 1)
      .optional(),
    rotation: z.number().finite().optional(),
  })
  .strict();

function gcd(a: number, b: number): number {
  while (b !== 0) [a, b] = [b, a % b];
  return a;
}

function rational(value: string): {
  numerator: number;
  denominator: number;
  value: number;
  text: string;
} {
  if (!/^\d{1,10}\/\d{1,10}$/.test(value)) fail("INVALID_RATIONAL");
  const [n, d] = value.split("/").map(Number);
  if (!Number.isSafeInteger(n) || !Number.isSafeInteger(d) || n <= 0 || d <= 0)
    fail("INVALID_RATIONAL");
  const divisor = gcd(n, d);
  return {
    numerator: n / divisor,
    denominator: d / divisor,
    value: n / d,
    text: `${n / divisor}/${d / divisor}`,
  };
}

function supportedRate(value: string): ReturnType<typeof rational> {
  const rate = rational(value);
  if (
    ![
      "24000/1001",
      "24/1",
      "25/1",
      "30000/1001",
      "30/1",
      "60000/1001",
      "60/1",
    ].includes(rate.text)
  )
    fail("UNSUPPORTED_FRAME_RATE");
  return rate;
}

export type HdRenderAlignedSegment = {
  startFrame: number;
  endFrame: number;
  frameCount: number;
  startSample: number;
  sampleCount: number;
};
export type HdRenderFilterPlan = {
  filterComplex: string;
  segments: HdRenderAlignedSegment[];
  frameRate: string;
  frameCount: number;
  durationSeconds: number;
  hasAudio: boolean;
};

/** Pure compilation. Each segment has its own bounded, single-threaded source
 * input: unlike split/asplit, arbitrary editorial order cannot accumulate an
 * entire unselected source tail in raw-frame queues on a small VPS.
 */
export function buildBodyCinemaHdFilter(
  recipeInput: HdRenderRecipe,
  sourceInput: HdRenderSourceMetadata
): HdRenderFilterPlan {
  const recipe = validateRecipe(recipeInput);
  const parsed = sourceMetadataSchema.safeParse(sourceInput);
  if (!parsed.success) fail("INVALID_SOURCE_METADATA");
  const source = parsed.data;
  const rate = supportedRate(source.frameRate);
  const rotation = (((source.rotation ?? 0) % 360) + 360) % 360;
  if (![0, 90, 180, 270].includes(rotation)) fail("UNSUPPORTED_ROTATION");
  if (source.width * source.height > 1920 * 1920)
    fail("SOURCE_DIMENSIONS_EXCEED_BUDGET");
  const width =
    rotation === 90 || rotation === 270 ? source.height : source.width;
  const height =
    rotation === 90 || rotation === 270 ? source.width : source.height;
  const square = width === height;
  // 720p native landscape/portrait is the minimum; a square master is 1080p.
  if (
    square
      ? width < 1080
      : Math.min(width, height) < 720 || Math.max(width, height) < 1280
  )
    fail("SUB_HD_SOURCE");
  const expectedWidth = square ? 1080 : width > height ? 1920 : 1080;
  const expectedHeight = square ? 1080 : width > height ? 1080 : 1920;
  if (recipe.width !== expectedWidth || recipe.height !== expectedHeight)
    fail("INVALID_HD_CANVAS");
  const framesPerMs = rate.numerator / (1000 * rate.denominator);
  const sourceFrameLimit = Math.floor(
    source.durationSeconds * rate.value + 1e-7
  );
  let frameCount = 0;
  const samplesAt = (frame: number): number =>
    Math.round((frame * 48_000 * rate.denominator) / rate.numerator);
  const segments = recipe.segments.map(segment => {
    if (segment.endMs > source.durationSeconds * 1000 + 1e-7)
      fail("SEGMENT_OUTSIDE_SOURCE");
    // Only compensate floating-point round-off at an exact integer boundary.
    const startFrame = Math.ceil(segment.startMs * framesPerMs - 1e-9);
    const endFrame = Math.floor(segment.endMs * framesPerMs + 1e-9);
    if (endFrame > sourceFrameLimit || endFrame <= startFrame)
      fail("SEGMENT_OUTSIDE_SOURCE");
    const count = endFrame - startFrame;
    if ((count * rate.denominator) / rate.numerator < 2)
      fail("ALIGNED_MICROSHOT");
    if (
      source.hasAudio &&
      (source.audioDurationSeconds === undefined ||
        source.audioDurationSeconds + 1 / rate.value < endFrame / rate.value)
    )
      fail("SOURCE_AUDIO_RANGE");
    // Cumulative rounding bounds the complete audio timeline to half a sample.
    const sampleCount = samplesAt(frameCount + count) - samplesAt(frameCount);
    frameCount += count;
    return {
      startFrame,
      endFrame,
      frameCount: count,
      startSample: samplesAt(startFrame),
      sampleCount,
    };
  });
  const durationSeconds = (frameCount * rate.denominator) / rate.numerator;
  if (durationSeconds < 10 || durationSeconds > 15)
    fail("ALIGNED_DURATION_OUTSIDE_LIMITS");
  // The shared schema binds duration to the raw saved ranges. Inward frame
  // alignment may remove less than two frames per shot; QA below is measured
  // against this exact aligned plan, never the rounded input milliseconds.
  if (
    durationSeconds > recipe.durationSeconds + 0.001 ||
    recipe.durationSeconds - durationSeconds >
      (2 * segments.length) / rate.value + 0.001
  )
    fail("RECIPE_DURATION_MISMATCH");
  const filters: string[] = [];
  for (const [i, segment] of segments.entries()) {
    filters.push(
      `[${i}:v:0]trim=start_frame=${segment.startFrame}:end_frame=${segment.endFrame},setpts=N*${rate.denominator}/(${rate.numerator}*TB)[v${i}]`
    );
    if (source.hasAudio) {
      const duration = segment.sampleCount / 48_000;
      filters.push(
        `[${i}:a:0]aresample=48000:async=0,atrim=start_sample=${segment.startSample}:end_sample=${segment.startSample + segment.sampleCount},asetpts=N/SR/TB,apad=whole_len=${segment.sampleCount},atrim=end_sample=${segment.sampleCount},afade=t=in:d=0.004,afade=t=out:st=${(duration - 0.004).toFixed(9)}:d=0.004[a${i}]`
      );
    }
  }
  filters.push(
    segments
      .map((_, i) => `[v${i}]${source.hasAudio ? `[a${i}]` : ""}`)
      .join("") +
      `concat=n=${segments.length}:v=1:a=${source.hasAudio ? 1 : 0}[joined]${source.hasAudio ? "[joinedAudio]" : ""}`
  );
  filters.push(
    `[joined]setpts=N*${rate.denominator}/(${rate.numerator}*TB),scale=${recipe.width}:${recipe.height}:force_original_aspect_ratio=decrease:force_divisible_by=2:flags=lanczos+accurate_rnd+full_chroma_int:out_color_matrix=bt709,${getBodyCinemaHdGradeFilter(recipe.visualGradeId)},format=yuv420p,noise=c0s=2:c0f=t:c1s=0:c2s=0:all_seed=214,pad=${recipe.width}:${recipe.height}:(ow-iw)/2:(oh-ih)/2:color=0x0A0A0A,setsar=1[video]`
  );
  if (source.hasAudio)
    filters.push(
      `[joinedAudio]atrim=end_sample=${samplesAt(frameCount)},asetpts=N/SR/TB[audio]`
    );
  return {
    filterComplex: filters.join(";"),
    segments,
    frameRate: rate.text,
    frameCount,
    durationSeconds,
    hasAudio: source.hasAudio,
  };
}

function localPath(value: string, allowDescriptor: boolean): void {
  if (
    typeof value !== "string" ||
    !path.isAbsolute(value) ||
    path.normalize(value) !== value ||
    value.includes("\\") ||
    /[\x00-\x1f\x7f]/.test(value) ||
    value.startsWith("//") ||
    value === "/"
  )
    fail("NONLOCAL_OR_UNSAFE_PATH");
  if (
    /^\/(proc|dev|sys)(\/|$)/.test(value) &&
    !(
      allowDescriptor &&
      new RegExp(`^/proc/${process.pid}/fd/[0-9]+$`).test(value)
    )
  )
    fail("NONLOCAL_OR_UNSAFE_PATH");
}

/** Pure command helper. Destinations must be executor-reserved descriptors:
 * -y reopens ONLY that newly O_EXCL-created inode, never an existing user path.
 */
export function buildBodyCinemaHdCommand(input: {
  sourcePath: string;
  outputPath: string;
  recipe: HdRenderRecipe;
  source: HdRenderSourceMetadata;
}): string[] {
  localPath(input.sourcePath, true);
  localPath(input.outputPath, true);
  if (!new RegExp(`^/proc/${process.pid}/fd/[0-9]+$`).test(input.outputPath))
    fail("OUTPUT_NOT_RESERVED_DESCRIPTOR");
  if (input.sourcePath === input.outputPath) fail("OUTPUT_EQUALS_SOURCE");
  const plan = buildBodyCinemaHdFilter(input.recipe, input.source);
  const args = [
    "-nostdin",
    "-hide_banner",
    "-v",
    "error",
    "-xerror",
    "-y",
    "-filter_complex_threads",
    "1",
    "-filter_threads",
    "1",
  ];
  for (const segment of plan.segments) {
    // Reading from the start makes global frame/sample trims exact, including
    // sources with interframe codecs; no approximate keyframe seeking.
    args.push(
      "-threads",
      "1",
      "-protocol_whitelist",
      "file",
      "-format_whitelist",
      "mov,matroska,webm,avi",
      "-t",
      (
        segment.endFrame / supportedRate(plan.frameRate).value +
        1 / supportedRate(plan.frameRate).value
      ).toFixed(9),
      "-i",
      input.sourcePath
    );
  }
  args.push("-filter_complex", plan.filterComplex, "-map", "[video]");
  if (plan.hasAudio) args.push("-map", "[audio]");
  args.push(
    "-map_metadata",
    "-1",
    "-map_chapters",
    "-1",
    "-c:v",
    "libx264",
    "-profile:v",
    "high",
    "-preset",
    "slow",
    "-crf",
    "16",
    "-threads:v",
    "2",
    "-pix_fmt",
    "yuv420p",
    "-fps_mode:v",
    "passthrough",
    "-enc_time_base:v",
    `${supportedRate(plan.frameRate).denominator}/${supportedRate(plan.frameRate).numerator}`,
    "-g",
    String(Math.round(supportedRate(plan.frameRate).value * 2)),
    "-maxrate",
    "20M",
    "-bufsize",
    "40M",
    "-color_primaries",
    "bt709",
    "-color_trc",
    "bt709",
    "-colorspace",
    "bt709",
    "-color_range",
    "tv"
  );
  if (plan.hasAudio)
    args.push(
      "-c:a",
      "aac",
      "-b:a",
      "320k",
      "-ar",
      "48000",
      "-ac",
      "2",
      "-threads:a",
      "1"
    );
  else args.push("-an");
  args.push(
    "-movflags",
    "+faststart",
    "-f",
    "mp4",
    "-progress",
    "pipe:1",
    "-nostats",
    input.outputPath
  );
  return args;
}

function descriptorPath(handle: FileHandle): string {
  return `/proc/${process.pid}/fd/${handle.fd}`;
}

/** Pin and walk every directory, rejecting symlinks at every component, not
 * merely the last filename. Parent rename races cannot redirect child opens.
 */
async function openDirectory(directory: string): Promise<FileHandle> {
  let handle = await open(
    "/",
    constants.O_RDONLY | constants.O_DIRECTORY | constants.O_NOFOLLOW
  );
  try {
    for (const component of directory.split("/").filter(Boolean)) {
      const next = await open(
        `${descriptorPath(handle)}/${component}`,
        constants.O_RDONLY | constants.O_DIRECTORY | constants.O_NOFOLLOW
      );
      await handle.close();
      handle = next;
    }
    return handle;
  } catch {
    await handle.close().catch(() => undefined);
    return fail("UNSAFE_DIRECTORY");
  }
}

async function openSource(sourcePath: string): Promise<FileHandle> {
  localPath(sourcePath, true);
  if (sourcePath.startsWith("/proc/"))
    return open(sourcePath, constants.O_RDONLY | constants.O_NONBLOCK);
  const directory = await openDirectory(path.dirname(sourcePath));
  try {
    return await open(
      `${descriptorPath(directory)}/${path.basename(sourcePath)}`,
      constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK
    );
  } finally {
    await directory.close();
  }
}

async function hashOpened(
  handle: FileHandle,
  maximumBytes: number
): Promise<{ sha256: string; sizeBytes: number }> {
  const before = await handle.stat();
  if (!before.isFile() || before.size < 1 || before.size > maximumBytes)
    fail("FILE_OUTSIDE_LIMITS");
  const hash = createHash("sha256");
  let sizeBytes = 0;
  const stream = handle.createReadStream({
    start: 0,
    autoClose: false,
    highWaterMark: 256 * 1024,
  });
  try {
    for await (const chunk of stream) {
      const buffer: Buffer = Buffer.isBuffer(chunk)
        ? chunk
        : Buffer.from(String(chunk));
      remainingHdBudget(BODY_CINEMA_HD_LIMITS.renderTimeoutMs);
      sizeBytes += buffer.length;
      if (sizeBytes > maximumBytes) fail("FILE_OUTSIDE_LIMITS");
      hash.update(buffer);
    }
  } catch (error: unknown) {
    // Destroy only on failure: FileHandle streams close their descriptor when
    // explicitly destroyed, even with autoClose:false on supported Node.
    stream.destroy();
    throw error;
  }
  const after = await handle.stat();
  if (
    before.dev !== after.dev ||
    before.ino !== after.ino ||
    before.size !== after.size ||
    before.mtimeMs !== after.mtimeMs ||
    before.ctimeMs !== after.ctimeMs ||
    sizeBytes !== before.size
  )
    fail("FILE_CHANGED_DURING_HASH");
  return { sha256: hash.digest("hex"), sizeBytes };
}

const hdDeadline = new AsyncLocalStorage<number>();
function remainingHdBudget(timeoutMs: number): number {
  const remaining = Math.min(
    timeoutMs,
    (hdDeadline.getStore() ?? Date.now() + timeoutMs) - Date.now()
  );
  if (remaining <= 0) fail("TOTAL_EXECUTION_TIMEOUT");
  return remaining;
}
type ProcessResult = { stdout: string; stderrBytes: number };
function runProcess(
  binary: "ffmpeg" | "ffprobe",
  args: string[],
  timeoutMs: number,
  maximumStdoutBytes: number,
  onLine?: (line: string) => void
): Promise<ProcessResult> {
  return new Promise((resolve, reject) => {
    const boundedTimeout = remainingHdBudget(timeoutMs);
    const child = spawn(binary, args, {
      shell: false,
      detached: true,
      stdio: ["ignore", "pipe", "pipe"],
      env: {
        PATH: "/usr/local/bin:/usr/bin:/bin",
        LANG: "C",
        LC_ALL: "C",
        AV_LOG_FORCE_NOCOLOR: "1",
      },
    });
    let reason: string | undefined;
    let stdoutBytes = 0;
    let stderrBytes = 0;
    const chunks: Buffer[] = [];
    let pending = "";
    const kill = (code: string): void => {
      reason ??= code;
      if (child.pid !== undefined) {
        try {
          process.kill(-child.pid, "SIGKILL");
        } catch {
          child.kill("SIGKILL");
        }
      }
    };
    const timer = setTimeout(() => kill("PROCESS_TIMEOUT"), boundedTimeout);
    child.stdout?.on("data", (chunk: Buffer) => {
      stdoutBytes += chunk.length;
      if (stdoutBytes > maximumStdoutBytes) {
        kill("PROCESS_OUTPUT_LIMIT");
        return;
      }
      if (!onLine) {
        chunks.push(chunk);
        return;
      }
      pending += chunk.toString("utf8");
      let newline = pending.indexOf("\n");
      while (newline >= 0) {
        const line = pending.slice(0, newline).trim();
        pending = pending.slice(newline + 1);
        try {
          onLine(line);
        } catch {
          kill("INVALID_PROCESS_OUTPUT");
          return;
        }
        newline = pending.indexOf("\n");
      }
      if (pending.length > 4096) kill("PROCESS_LINE_LIMIT");
    });
    child.stderr?.on("data", (chunk: Buffer) => {
      // Deliberately retain ZERO stderr bytes: even demuxer errors can contain
      // private filenames or embedded credentials. Only a bounded count remains.
      stderrBytes = Math.min(
        BODY_CINEMA_HD_LIMITS.maximumStderrBytes,
        stderrBytes + chunk.length
      );
    });
    child.once("error", () => {
      reason ??= "PROCESS_UNAVAILABLE";
    });
    child.once("close", (code, signal) => {
      clearTimeout(timer);
      if (reason || code !== 0 || signal !== null) {
        reject(new Error(`BODY_CINEMA_HD_${reason ?? "PROCESS_FAILED"}`));
        return;
      }
      if (onLine && pending.trim()) {
        try {
          onLine(pending.trim());
        } catch {
          reject(new Error("BODY_CINEMA_HD_INVALID_PROCESS_OUTPUT"));
          return;
        }
      }
      resolve({
        stdout: onLine
          ? ""
          : Buffer.concat(chunks, stdoutBytes).toString("utf8"),
        stderrBytes,
      });
    });
  });
}

const numericString = z
  .string()
  .regex(/^-?\d+(\.\d+)?$/)
  .transform(Number)
  .pipe(z.number().finite());
const streamSchema = z.object({
  index: z.number().int().nonnegative(),
  codec_type: z.string(),
  codec_name: z.string().optional(),
  width: z.number().int().positive().optional(),
  height: z.number().int().positive().optional(),
  duration: numericString.optional(),
  start_time: numericString.optional(),
  avg_frame_rate: z.string().optional(),
  r_frame_rate: z.string().optional(),
  time_base: z.string().optional(),
  sample_aspect_ratio: z.string().optional(),
  sample_rate: numericString.optional(),
  pix_fmt: z.string().optional(),
  profile: z.string().optional(),
  color_space: z.string().optional(),
  color_transfer: z.string().optional(),
  color_primaries: z.string().optional(),
  nb_read_frames: z
    .string()
    .regex(/^\d+$/)
    .transform(Number)
    .pipe(z.number().int().positive().safe())
    .optional(),
  tags: z.object({ rotate: numericString.optional() }).optional(),
  side_data_list: z
    .array(z.object({ rotation: z.number().finite().optional() }))
    .max(16)
    .optional(),
});
const probeSchema = z.object({
  streams: z.array(streamSchema).min(1).max(16),
  format: z.object({ duration: numericString, format_name: z.string() }),
});
type Probe = z.infer<typeof probeSchema>;
const probeEntries =
  "stream=index,codec_type,codec_name,width,height,duration,start_time,avg_frame_rate,r_frame_rate,time_base,sample_aspect_ratio,sample_rate,pix_fmt,profile,color_space,color_transfer,color_primaries,nb_read_frames:stream_tags=rotate:stream_side_data=rotation:format=duration,format_name";

async function probeOpened(
  handle: FileHandle,
  countFrames = false
): Promise<Probe> {
  const args = [
    "-v",
    "error",
    "-threads",
    "1",
    "-protocol_whitelist",
    "file",
    "-format_whitelist",
    "mov,matroska,webm,avi",
  ];
  if (countFrames) args.push("-count_frames");
  args.push(
    "-show_entries",
    probeEntries,
    "-of",
    "json",
    descriptorPath(handle)
  );
  const result = await runProcess(
    "ffprobe",
    args,
    BODY_CINEMA_HD_LIMITS.probeTimeoutMs,
    BODY_CINEMA_HD_LIMITS.maximumProbeBytes
  );
  let unknownJson: unknown;
  try {
    unknownJson = JSON.parse(result.stdout);
  } catch {
    return fail("INVALID_PROBE_JSON");
  }
  const parsed = probeSchema.safeParse(unknownJson);
  if (!parsed.success || result.stderrBytes !== 0) fail("INVALID_PROBE");
  return parsed.data;
}

function sourceFromProbe(probe: Probe): HdRenderSourceMetadata {
  const videos = probe.streams.filter(stream => stream.codec_type === "video");
  const audios = probe.streams.filter(stream => stream.codec_type === "audio");
  if (
    videos.length !== 1 ||
    audios.length > 1 ||
    probe.streams.some(
      stream => !["video", "audio"].includes(stream.codec_type)
    )
  )
    fail("UNSUPPORTED_SOURCE_STREAMS");
  const video = videos[0];
  if (
    video.width === undefined ||
    video.height === undefined ||
    !video.avg_frame_rate ||
    !video.r_frame_rate
  )
    fail("INCOMPLETE_SOURCE_PROBE");
  const rate = supportedRate(video.avg_frame_rate);
  if (supportedRate(video.r_frame_rate).text !== rate.text)
    fail("SOURCE_NOT_CONSTANT_CADENCE");
  if (
    video.sample_aspect_ratio &&
    !["1:1", "0:1"].includes(video.sample_aspect_ratio)
  )
    fail("NON_SQUARE_SOURCE_PIXELS");
  if (
    Math.abs(video.start_time ?? 0) > 1 / 48_000 ||
    Math.abs(audios[0]?.start_time ?? 0) > 1 / 48_000
  )
    fail("SOURCE_STREAM_OFFSET");
  const rotations = (video.side_data_list ?? []).flatMap(item =>
    item.rotation === undefined ? [] : [item.rotation]
  );
  if (rotations.length > 1) fail("AMBIGUOUS_SOURCE_ROTATION");
  return {
    width: video.width,
    height: video.height,
    durationSeconds: video.duration ?? probe.format.duration,
    frameRate: rate.text,
    hasAudio: audios.length === 1,
    ...(audios.length === 1
      ? { audioDurationSeconds: audios[0].duration ?? probe.format.duration }
      : {}),
    rotation: rotations[0] ?? video.tags?.rotate ?? 0,
  };
}

/** Decode timestamp cadence with bounded streaming output (no frame images in
 * memory). One time-base tick is the only rounding tolerance; dropped,
 * repeated, reordered or variable-duration source/output frames are rejected.
 */
async function checkCadence(
  handle: FileHandle,
  rateText: string,
  timeBaseText: string | undefined,
  expectedFrames?: number
): Promise<number> {
  if (!timeBaseText) fail("MISSING_TIME_BASE");
  const rate = supportedRate(rateText);
  const timeBase = rational(timeBaseText);
  if (timeBase.value > 1 / rate.value / 4) fail("COARSE_TIME_BASE");
  const ticksPerFrame = rate.denominator / rate.numerator / timeBase.value;
  let count = 0;
  let first = 0;
  let previous = -Infinity;
  const maximumFrames =
    expectedFrames ??
    Math.ceil(BODY_CINEMA_HD_LIMITS.maximumSourceSeconds * rate.value) + 1;
  const result = await runProcess(
    "ffprobe",
    [
      "-v",
      "error",
      "-threads",
      "1",
      "-protocol_whitelist",
      "file",
      "-format_whitelist",
      "mov,matroska,webm,avi",
      "-select_streams",
      "v:0",
      "-show_frames",
      "-show_entries",
      "frame=best_effort_timestamp:frame_side_data=",
      "-of",
      "csv=p=0",
      descriptorPath(handle),
    ],
    BODY_CINEMA_HD_LIMITS.renderTimeoutMs,
    BODY_CINEMA_HD_LIMITS.maximumCadenceBytes,
    line => {
      if (!line) return;
      if (!/^-?\d+,*$/.test(line)) fail("INVALID_FRAME_TIMESTAMP");
      const timestamp = Number(line.split(",")[0]);
      if (!Number.isSafeInteger(timestamp)) fail("INVALID_FRAME_TIMESTAMP");
      if (count === 0) {
        first = timestamp;
        if (Math.abs(first * timeBase.value) > 1 / 48_000)
          fail("FRAME_TIMELINE_OFFSET");
      }
      if (
        timestamp <= previous ||
        Math.abs(timestamp - (first + count * ticksPerFrame)) > 1.000001 ||
        (count > 0 && Math.abs(timestamp - previous - ticksPerFrame) > 1.000001)
      )
        fail("FRAME_CADENCE_JITTER");
      previous = timestamp;
      count++;
      if (count > maximumFrames) fail("FRAME_COUNT_LIMIT");
    }
  );
  if (
    result.stderrBytes !== 0 ||
    count === 0 ||
    (expectedFrames !== undefined && count !== expectedFrames)
  )
    fail("FRAME_COUNT_OR_DECODE_MISMATCH");
  return count;
}

async function executeBodyCinemaHd(input: {
  sourcePath: string;
  outputPath: string;
  recipe: HdRenderRecipe;
  /** Monotone percentage, 0..100. 100 is emitted only after every QA check. */
  onProgress?: (progress: number) => void;
}): Promise<{
  sha256: string;
  sizeBytes: number;
  width: number;
  height: number;
  durationSeconds: number;
  frameRate: number;
  hasAudio: boolean;
  frameCount: number;
  gradeVersion: string;
}> {
  let source: FileHandle | undefined;
  let output: FileHandle | undefined;
  let directory: FileHandle | undefined;
  let progress = -1;
  const notify = (value: number): void => {
    const next = Math.max(0, Math.min(100, Math.floor(value)));
    if (next <= progress) return;
    progress = next;
    try {
      input.onProgress?.(next);
    } catch {
      /* Observers cannot affect artifact integrity. */
    }
  };
  try {
    const recipe = validateRecipe(input.recipe);
    localPath(input.sourcePath, true);
    localPath(input.outputPath, false);
    if (input.sourcePath === input.outputPath) fail("OUTPUT_EQUALS_SOURCE");
    notify(0);
    source = await openSource(input.sourcePath);
    const initialSourceStat = await source.stat();
    const sourceHash = await hashOpened(
      source,
      BODY_CINEMA_HD_LIMITS.maximumSourceBytes
    );
    if (sourceHash.sha256 !== recipe.sourceSha256.toLowerCase())
      fail("SOURCE_SHA256_MISMATCH");
    notify(10);
    const sourceProbe = await probeOpened(source);
    const sourceMetadata = sourceFromProbe(sourceProbe);
    const plan = buildBodyCinemaHdFilter(recipe, sourceMetadata);
    const sourceVideo = sourceProbe.streams.find(
      stream => stream.codec_type === "video"
    );
    const sourceFrameCount = await checkCadence(
      source,
      plan.frameRate,
      sourceVideo?.time_base
    );
    if (plan.segments.some(segment => segment.endFrame > sourceFrameCount))
      fail("SEGMENT_OUTSIDE_DECODED_SOURCE");
    notify(20);
    directory = await openDirectory(path.dirname(input.outputPath));
    const capacity = await statfs(descriptorPath(directory), { bigint: true });
    if (
      capacity.bavail * capacity.bsize <
        BigInt(BODY_CINEMA_HD_LIMITS.minimumAvailableBytes) ||
      capacity.ffree < BigInt(BODY_CINEMA_HD_LIMITS.minimumAvailableInodes)
    )
      fail("OUTPUT_CAPACITY_PREFLIGHT");
    if (freemem() < BODY_CINEMA_HD_LIMITS.minimumFreeMemoryBytes)
      fail("MEMORY_CAPACITY_PREFLIGHT");
    // Exclusive creation before any render attempt. Existing files and symlinks
    // always fail, and no failed or user artifact is ever unlinked here.
    output = await open(
      `${descriptorPath(directory)}/${path.basename(input.outputPath)}`,
      constants.O_CREAT |
        constants.O_EXCL |
        constants.O_NOFOLLOW |
        constants.O_RDWR,
      0o600
    );
    const reserved = await output.stat();
    const args = buildBodyCinemaHdCommand({
      sourcePath: descriptorPath(source),
      outputPath: descriptorPath(output),
      recipe,
      source: sourceMetadata,
    });
    await runProcess(
      "ffmpeg",
      args,
      BODY_CINEMA_HD_LIMITS.renderTimeoutMs,
      BODY_CINEMA_HD_LIMITS.maximumCadenceBytes,
      line => {
        const match = /^out_time_us=(\d+)$/.exec(line);
        if (match)
          notify(
            20 +
              Math.min(1, Number(match[1]) / 1_000_000 / plan.durationSeconds) *
                70
          );
      }
    );
    await output.sync();
    notify(90);
    const renderedHash = await hashOpened(
      output,
      BODY_CINEMA_HD_LIMITS.maximumSourceBytes
    );
    const decode = await runProcess(
      "ffmpeg",
      [
        "-nostdin",
        "-hide_banner",
        "-v",
        "error",
        "-xerror",
        "-err_detect",
        "explode",
        "-threads",
        "1",
        "-filter_threads",
        "1",
        "-protocol_whitelist",
        "file",
        "-format_whitelist",
        "mov",
        "-i",
        descriptorPath(output),
        "-map",
        "0:v:0",
        ...(plan.hasAudio ? ["-map", "0:a:0"] : []),
        "-threads",
        "1",
        "-f",
        "null",
        "-",
      ],
      BODY_CINEMA_HD_LIMITS.renderTimeoutMs,
      BODY_CINEMA_HD_LIMITS.maximumProbeBytes
    );
    if (decode.stderrBytes !== 0) fail("OUTPUT_FULL_DECODE_FAILED");
    // Inspect every decoded output frame, not sparse pose samples. This detects
    // nearly all-black images; it is not anatomical or subjective quality proof.
    await runProcess(
      "ffmpeg",
      [
        "-nostdin",
        "-v",
        "error",
        "-xerror",
        "-threads",
        "1",
        "-filter_threads",
        "1",
        "-protocol_whitelist",
        "file",
        "-format_whitelist",
        "mov",
        "-i",
        descriptorPath(output),
        "-an",
        "-vf",
        "blackframe=amount=98:threshold=16,metadata=mode=print:key=lavfi.blackframe.pblack:file=-",
        "-f",
        "null",
        "-",
      ],
      BODY_CINEMA_HD_LIMITS.renderTimeoutMs,
      BODY_CINEMA_HD_LIMITS.maximumCadenceBytes,
      line => {
        const match = /^lavfi\.blackframe\.pblack=([0-9.]+)$/.exec(line);
        if (match && Number(match[1]) >= 98) fail("BLACK_OUTPUT_FRAME");
      }
    );
    const outputProbe = await probeOpened(output, true);
    const videos = outputProbe.streams.filter(
      stream => stream.codec_type === "video"
    );
    const audios = outputProbe.streams.filter(
      stream => stream.codec_type === "audio"
    );
    const video = videos[0];
    const rate = supportedRate(plan.frameRate);
    const tolerance = 1 / rate.value + 1e-6;
    if (
      videos.length !== 1 ||
      audios.length !== (plan.hasAudio ? 1 : 0) ||
      outputProbe.streams.length !== (plan.hasAudio ? 2 : 1) ||
      !outputProbe.format.format_name.split(",").includes("mp4")
    )
      fail("OUTPUT_STREAMS_MISMATCH");
    if (
      video.codec_name !== "h264" ||
      video.profile !== "High" ||
      video.width !== recipe.width ||
      video.height !== recipe.height ||
      video.pix_fmt !== "yuv420p" ||
      video.color_space !== "bt709" ||
      video.color_transfer !== "bt709" ||
      video.color_primaries !== "bt709" ||
      video.sample_aspect_ratio !== "1:1"
    )
      fail("OUTPUT_VIDEO_MISMATCH");
    if (
      !video.avg_frame_rate ||
      !video.r_frame_rate ||
      supportedRate(video.avg_frame_rate).text !== rate.text ||
      supportedRate(video.r_frame_rate).text !== rate.text ||
      video.nb_read_frames !== plan.frameCount
    )
      fail("OUTPUT_FRAME_RATE_OR_COUNT_MISMATCH");
    if (
      video.duration === undefined ||
      Math.abs(video.duration - plan.durationSeconds) > tolerance ||
      Math.abs(outputProbe.format.duration - plan.durationSeconds) >
        tolerance ||
      Math.abs(video.start_time ?? 0) > 1 / 48_000
    )
      fail("OUTPUT_DURATION_MISMATCH");
    if (
      plan.hasAudio &&
      (audios[0].codec_name !== "aac" ||
        audios[0].sample_rate !== 48_000 ||
        audios[0].duration === undefined ||
        Math.abs(audios[0].duration - plan.durationSeconds) > tolerance ||
        Math.abs(audios[0].start_time ?? 0) > 1 / 48_000)
    )
      fail("OUTPUT_AUDIO_MISMATCH");
    await checkCadence(
      output,
      plan.frameRate,
      video.time_base,
      plan.frameCount
    );
    notify(95);
    const finalSourceHash = await hashOpened(
      source,
      BODY_CINEMA_HD_LIMITS.maximumSourceBytes
    );
    const finalSourceStat = await source.stat();
    if (
      sourceHash.sha256 !== finalSourceHash.sha256 ||
      sourceHash.sizeBytes !== finalSourceHash.sizeBytes ||
      initialSourceStat.ctimeMs !== finalSourceStat.ctimeMs ||
      initialSourceStat.mtimeMs !== finalSourceStat.mtimeMs
    )
      fail("SOURCE_CHANGED");
    const outputHash = await hashOpened(
      output,
      BODY_CINEMA_HD_LIMITS.maximumSourceBytes
    );
    if (
      renderedHash.sha256 !== outputHash.sha256 ||
      renderedHash.sizeBytes !== outputHash.sizeBytes
    )
      fail("OUTPUT_CHANGED_DURING_QA");
    const publishedStat = await lstat(input.outputPath);
    if (
      !publishedStat.isFile() ||
      publishedStat.isSymbolicLink() ||
      publishedStat.dev !== reserved.dev ||
      publishedStat.ino !== reserved.ino ||
      publishedStat.size !== outputHash.sizeBytes
    )
      fail("OUTPUT_PATH_CHANGED");
    notify(100);
    return {
      ...outputHash,
      width: recipe.width,
      height: recipe.height,
      durationSeconds: plan.durationSeconds,
      frameRate: rate.value,
      hasAudio: plan.hasAudio,
      frameCount: plan.frameCount,
      gradeVersion: BODY_CINEMA_HD_GRADE_VERSION,
    };
  } catch (error: unknown) {
    if (
      error instanceof Error &&
      /^BODY_CINEMA_HD_[A-Z0-9_]+$/.test(error.message)
    )
      throw error;
    return fail("LOCAL_EXECUTION_FAILED");
  } finally {
    await output?.close().catch(() => undefined);
    await source?.close().catch(() => undefined);
    await directory?.close().catch(() => undefined);
  }
}

export async function renderBodyCinemaHd(
  input: Parameters<typeof executeBodyCinemaHd>[0]
): Promise<Awaited<ReturnType<typeof executeBodyCinemaHd>>> {
  return hdDeadline.run(
    Date.now() + BODY_CINEMA_HD_LIMITS.renderTimeoutMs,
    () => executeBodyCinemaHd(input)
  );
}
