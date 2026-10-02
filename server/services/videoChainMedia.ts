import { execFile as execFileCallback } from "node:child_process";
import { createHash, randomUUID } from "node:crypto";
import { promises as dns } from "node:dns";
import {
  constants as fsConstants,
  createReadStream,
  createWriteStream,
  promises as fs,
} from "node:fs";
import type { IncomingMessage } from "node:http";
import * as https from "node:https";
import { isIP } from "node:net";
import * as path from "node:path";
import { tmpdir } from "node:os";
import { promisify } from "node:util";

/** Runtime dependencies are injectable only to support controlled local contract fixtures. */
export interface VideoChainMediaRuntime {
  uploadsRoot: string;
  publicBaseUrl: string;
  ffmpegPath: string;
  ffprobePath: string;
  download: (
    url: string,
    destination: string,
    maximumBytes: number
  ) => Promise<void>;
}

export interface PersonaReferenceInput {
  personaId: string;
  assetId: string;
  sourceUrl: string;
}

export interface VideoChainSegmentMediaInput {
  chainId: string;
  segmentId: string;
  providerVideoUrl: string;
  durationSec: number;
  frameRate: number;
  aspectRatio: "16:9" | "9:16" | "1:1";
}

export interface PersistedPersonaReference {
  url: string;
  sha256: string;
  width: number;
  height: number;
}

export interface PersistedVideoChainSegmentMedia {
  streamUrl: string;
  terminalFrameUrl: string;
  terminalFrameSha256: string;
  frameCount: number;
  durationSec: number;
  actualFrameRate: number;
  width: number;
  height: number;
  videoSha256: string;
}

interface ImageInspection {
  extension: "png" | "jpg";
  width: number;
  height: number;
}

interface VideoBasicInspection {
  durationSec: number;
  width: number;
  height: number;
}

interface VideoInspection extends VideoBasicInspection {
  frameCount: number;
  actualFrameRate: number;
}

interface ExistingPersonaReference extends PersistedPersonaReference {
  extension: "png" | "jpg";
}

const execFileAsync = promisify(execFileCallback);
const MAX_IMAGE_BYTES = 20 * 1024 * 1024;
const MAX_VIDEO_BYTES = 256 * 1024 * 1024;
const MAX_VIDEO_DURATION_SECONDS = 20;
const MAX_VIDEO_DIMENSION = 4096;
const MAX_PIXEL_AREA = 16_000_000;
const MAX_DECODED_FRAMES = 10_000;
const MEDIA_PROCESS_TIMEOUT_MS = 60_000;
const DOWNLOAD_TIMEOUT_MS = 60_000;
const MEDIA_MAX_BUFFER_BYTES = 128 * 1024;
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const ALLOWED_VIDEO_FORMATS = new Set(["mov", "mp4"]);
const IPV4_SPECIAL_RANGES: ReadonlyArray<readonly [number, number]> = [
  [0x00000000, 0x00ffffff], // "this" network
  [0x0a000000, 0x0affffff], // RFC1918
  [0x64400000, 0x647fffff], // shared address space
  [0x7f000000, 0x7fffffff], // loopback
  [0xa9fe0000, 0xa9feffff], // link-local
  [0xac100000, 0xac1fffff], // RFC1918
  [0xc0000000, 0xc00000ff], // IETF protocol assignments
  [0xc0000200, 0xc00002ff], // TEST-NET-1
  [0xc0120000, 0xc013ffff], // benchmarking
  [0xc0586300, 0xc05863ff], // deprecated 6to4 relay anycast
  [0xc0a80000, 0xc0a8ffff], // RFC1918
  [0xc6336400, 0xc63364ff], // TEST-NET-2
  [0xcb007100, 0xcb0071ff], // TEST-NET-3
  [0xe0000000, 0xffffffff], // multicast, reserved, limited broadcast
];

/**
 * Returns true for an IP address that must never be used as a provider-download
 * destination. Invalid values are treated as unsafe.
 */
export function isForbiddenNetworkAddress(address: string): boolean {
  const normalized = stripIpv6Brackets(address);
  const family = isIP(normalized);
  if (family === 4) {
    const value = ipv4ToInteger(normalized);
    return (
      value === null ||
      IPV4_SPECIAL_RANGES.some(
        ([first, last]) => value >= first && value <= last
      )
    );
  }
  if (family !== 6) {
    return true;
  }

  const value = ipv6ToInteger(normalized);
  if (value === null) {
    return true;
  }

  const highNinetySixBits = value >> 32n;
  if (highNinetySixBits === 0xffffn) {
    return isForbiddenNetworkAddress(
      integerToIpv4(Number(value & 0xffffffffn))
    );
  }
  if (highNinetySixBits === 0n) {
    return true; // IPv4-compatible and unspecified IPv6 are special-use.
  }
  if (value >> 125n !== 1n) return true; // Only global-unicast 2000::/3.

  return (
    hasIpv6Prefix(value, 0x64ff9bn << 96n, 96) || // IPv4/IPv6 translation
    hasIpv6Prefix(value, 0x64ff9b0001n << 80n, 48) || // local-use translation
    hasIpv6Prefix(value, 0x100n << 112n, 64) || // discard-only
    hasIpv6Prefix(value, 0x2001n << 112n, 23) || // IETF protocol assignments, Teredo, documentation
    hasIpv6Prefix(value, 0x20010db8n << 96n, 32) || // documentation 2001:db8::/32
    hasIpv6Prefix(value, 0x2002n << 112n, 16) || // 6to4 can encode private IPv4
    hasIpv6Prefix(value, 0x3fff0n << 108n, 20) || // documentation
    hasIpv6Prefix(value, 0x5f00n << 112n, 16) || // segment routing special-use
    hasIpv6Prefix(value, 0x7en << 121n, 7) || // unique local fc00::/7
    hasIpv6Prefix(value, 0x3fan << 118n, 10) || // link-local fe80::/10
    hasIpv6Prefix(value, 0xffn << 120n, 8) // multicast
  );
}

/** A narrow positive companion for deterministic SSRF-classification tests. */
export function isPublicNetworkAddress(address: string): boolean {
  return !isForbiddenNetworkAddress(address);
}

/**
 * The production runtime is HTTPS-only. Test code may inject a different
 * downloader through VideoChainMediaRuntime; no HTTP exception exists here.
 */
export function getVideoChainMediaRuntime(): VideoChainMediaRuntime {
  const uploadsRoot =
    process.env.CREATORVAULT_PERSONA_UPLOADS_ROOT ||
    path.resolve(process.cwd(), "..", "uploads");
  const publicBaseUrl =
    process.env.CREATORVAULT_PUBLIC_BASE_URL || "https://creatorvault.live";
  validatePublicBaseUrl(publicBaseUrl);

  return {
    uploadsRoot,
    publicBaseUrl,
    ffmpegPath: process.env.FFMPEG_PATH || "ffmpeg",
    ffprobePath: process.env.FFPROBE_PATH || "ffprobe",
    download: downloadHttpsToFile,
  };
}

export async function persistPersonaReference(
  input: PersonaReferenceInput,
  suppliedRuntime?: VideoChainMediaRuntime
): Promise<PersistedPersonaReference> {
  assertUuid(input.personaId, "personaId");
  assertUuid(input.assetId, "assetId");
  assertHttpUrl(input.sourceUrl, "sourceUrl");
  const runtime = resolveRuntime(suppliedRuntime);

  const personaDirectory = path.join(
    runtime.uploadsRoot,
    "persona-vaults",
    input.personaId
  );
  const assetDirectory = path.join(personaDirectory, input.assetId);
  await ensureRealDirectory(personaDirectory);

  const reusable = await readExistingPersonaReference(
    assetDirectory,
    runtime,
    input.personaId,
    input.assetId
  );
  if (reusable) {
    return reusable;
  }

  const temporaryDirectory = await fs.mkdtemp(
    path.join(tmpdir(), "creatorvault-persona-reference-")
  );
  let stagingDirectory: string | undefined;
  try {
    const downloadedReference = path.join(temporaryDirectory, "source-image");
    await runtime.download(
      input.sourceUrl,
      downloadedReference,
      MAX_IMAGE_BYTES
    );
    await assertRegularFileWithin(
      downloadedReference,
      MAX_IMAGE_BYTES,
      "Downloaded persona reference"
    );
    const image = await inspectImageFile(downloadedReference, runtime);
    assertPersonaReferenceDimensions(image);
    const sha256 = await sha256File(downloadedReference);

    stagingDirectory = path.join(
      personaDirectory,
      `.${input.assetId}.${randomUUID()}.staging`
    );
    await fs.mkdir(stagingDirectory, { mode: 0o700 });
    const stagedReference = path.join(
      stagingDirectory,
      `reference.${image.extension}`
    );
    await fs.copyFile(
      downloadedReference,
      stagedReference,
      fsConstants.COPYFILE_EXCL
    );
    await syncFile(stagedReference);
    await syncDirectory(stagingDirectory);

    try {
      await fs.rename(stagingDirectory, assetDirectory);
      await syncDirectory(personaDirectory);
    } catch (error: unknown) {
      await removeQuietly(stagingDirectory);
      if (isDestinationExistsError(error)) {
        const concurrentlyPublished = await readExistingPersonaReference(
          assetDirectory,
          runtime,
          input.personaId,
          input.assetId
        );
        if (concurrentlyPublished) {
          return concurrentlyPublished;
        }
      }
      throw error;
    }

    return {
      url: publicUploadUrl(runtime, [
        "persona-vaults",
        input.personaId,
        input.assetId,
        `reference.${image.extension}`,
      ]),
      sha256,
      width: image.width,
      height: image.height,
    };
  } finally {
    if (stagingDirectory) await removeQuietly(stagingDirectory);
    await removeQuietly(temporaryDirectory);
  }
}

export async function persistVideoChainSegmentMedia(
  input: VideoChainSegmentMediaInput,
  suppliedRuntime?: VideoChainMediaRuntime
): Promise<PersistedVideoChainSegmentMedia> {
  assertUuid(input.chainId, "chainId");
  assertUuid(input.segmentId, "segmentId");
  assertHttpUrl(input.providerVideoUrl, "providerVideoUrl");
  assertRequestedVideoProperties(input);
  const runtime = resolveRuntime(suppliedRuntime);

  const chainDirectory = path.join(
    runtime.uploadsRoot,
    "video-chains",
    input.chainId
  );
  const segmentDirectory = path.join(chainDirectory, input.segmentId);
  await ensureRealDirectory(chainDirectory);

  const reusable = await readExistingVideoChainSegment(
    segmentDirectory,
    runtime,
    input
  );
  if (reusable) {
    return reusable;
  }

  const temporaryDirectory = await fs.mkdtemp(
    path.join(tmpdir(), "creatorvault-video-chain-")
  );
  let stagingDirectory: string | undefined;
  try {
    const downloadedVideo = path.join(temporaryDirectory, "provider-video");
    await runtime.download(
      input.providerVideoUrl,
      downloadedVideo,
      MAX_VIDEO_BYTES
    );
    await assertRegularFileWithin(
      downloadedVideo,
      MAX_VIDEO_BYTES,
      "Downloaded provider video"
    );
    const video = await inspectVideoFile(downloadedVideo, runtime, input);

    const terminalFrame = path.join(temporaryDirectory, "terminal.png");
    await extractTerminalFrame(
      downloadedVideo,
      terminalFrame,
      video.frameCount,
      runtime
    );
    await assertRegularFileWithin(
      terminalFrame,
      MAX_IMAGE_BYTES,
      "Extracted terminal frame"
    );
    const terminalImage = await inspectImageFile(terminalFrame, runtime);
    if (
      terminalImage.extension !== "png" ||
      terminalImage.width !== video.width ||
      terminalImage.height !== video.height
    ) {
      throw new Error(
        "FFmpeg terminal-frame output did not preserve the source video dimensions as PNG."
      );
    }

    const videoSha256 = await sha256File(downloadedVideo);
    const terminalFrameSha256 = await sha256File(terminalFrame);
    stagingDirectory = path.join(
      chainDirectory,
      `.${input.segmentId}.${randomUUID()}.staging`
    );
    await fs.mkdir(stagingDirectory, { mode: 0o700 });
    const stagedVideo = path.join(stagingDirectory, "segment.mp4");
    const stagedTerminalFrame = path.join(stagingDirectory, "terminal.png");
    await fs.copyFile(downloadedVideo, stagedVideo, fsConstants.COPYFILE_EXCL);
    await fs.copyFile(
      terminalFrame,
      stagedTerminalFrame,
      fsConstants.COPYFILE_EXCL
    );
    await syncFile(stagedVideo);
    await syncFile(stagedTerminalFrame);
    await syncDirectory(stagingDirectory);

    try {
      // A rename of a non-empty staging directory publishes both immutable files together.
      await fs.rename(stagingDirectory, segmentDirectory);
      await syncDirectory(chainDirectory);
    } catch (error: unknown) {
      await removeQuietly(stagingDirectory);
      if (isDestinationExistsError(error)) {
        const concurrentlyPublished = await readExistingVideoChainSegment(
          segmentDirectory,
          runtime,
          input
        );
        if (concurrentlyPublished) {
          return concurrentlyPublished;
        }
      }
      throw error;
    }

    return videoSegmentResult(
      runtime,
      input,
      video,
      videoSha256,
      terminalFrameSha256
    );
  } finally {
    if (stagingDirectory) await removeQuietly(stagingDirectory);
    await removeQuietly(temporaryDirectory);
  }
}

async function readExistingPersonaReference(
  assetDirectory: string,
  runtime: VideoChainMediaRuntime,
  personaId: string,
  assetId: string
): Promise<ExistingPersonaReference | null> {
  if (!(await pathExists(assetDirectory))) {
    return null;
  }
  await assertRealDirectory(
    assetDirectory,
    "Existing persona reference directory"
  );
  const referencePng = path.join(assetDirectory, "reference.png");
  const referenceJpg = path.join(assetDirectory, "reference.jpg");
  const pngExists = await pathExists(referencePng);
  const jpgExists = await pathExists(referenceJpg);
  if (pngExists === jpgExists) {
    throw new Error(
      "Existing persona reference directory must contain exactly one immutable reference image."
    );
  }

  const referencePath = pngExists ? referencePng : referenceJpg;
  await assertRegularFileWithin(
    referencePath,
    MAX_IMAGE_BYTES,
    "Existing persona reference"
  );
  const image = await inspectImageFile(referencePath, runtime);
  assertPersonaReferenceDimensions(image);
  const expectedExtension = pngExists ? "png" : "jpg";
  if (image.extension !== expectedExtension) {
    throw new Error(
      "Existing persona reference filename does not match its inspected image format."
    );
  }

  return {
    url: publicUploadUrl(runtime, [
      "persona-vaults",
      personaId,
      assetId,
      `reference.${image.extension}`,
    ]),
    sha256: await sha256File(referencePath),
    width: image.width,
    height: image.height,
    extension: image.extension,
  };
}

async function readExistingVideoChainSegment(
  segmentDirectory: string,
  runtime: VideoChainMediaRuntime,
  input: VideoChainSegmentMediaInput
): Promise<PersistedVideoChainSegmentMedia | null> {
  if (!(await pathExists(segmentDirectory))) {
    return null;
  }
  await assertRealDirectory(
    segmentDirectory,
    "Existing video chain segment directory"
  );
  const persistedVideo = path.join(segmentDirectory, "segment.mp4");
  const persistedTerminalFrame = path.join(segmentDirectory, "terminal.png");
  await assertRegularFileWithin(
    persistedVideo,
    MAX_VIDEO_BYTES,
    "Existing chained video"
  );
  await assertRegularFileWithin(
    persistedTerminalFrame,
    MAX_IMAGE_BYTES,
    "Existing chained terminal frame"
  );

  const video = await inspectVideoFile(persistedVideo, runtime, input);
  const image = await inspectImageFile(persistedTerminalFrame, runtime);
  if (
    image.extension !== "png" ||
    image.width !== video.width ||
    image.height !== video.height
  ) {
    throw new Error(
      "Existing chained terminal frame is not a matching lossless PNG."
    );
  }

  return videoSegmentResult(
    runtime,
    input,
    video,
    await sha256File(persistedVideo),
    await sha256File(persistedTerminalFrame)
  );
}

function videoSegmentResult(
  runtime: VideoChainMediaRuntime,
  input: VideoChainSegmentMediaInput,
  video: VideoInspection,
  videoSha256: string,
  terminalFrameSha256: string
): PersistedVideoChainSegmentMedia {
  return {
    streamUrl: publicUploadUrl(runtime, [
      "video-chains",
      input.chainId,
      input.segmentId,
      "segment.mp4",
    ]),
    terminalFrameUrl: publicUploadUrl(runtime, [
      "video-chains",
      input.chainId,
      input.segmentId,
      "terminal.png",
    ]),
    terminalFrameSha256,
    frameCount: video.frameCount,
    durationSec: video.durationSec,
    actualFrameRate: video.actualFrameRate,
    width: video.width,
    height: video.height,
    videoSha256,
  };
}

async function inspectImageFile(
  filePath: string,
  runtime: VideoChainMediaRuntime
): Promise<ImageInspection> {
  const output = await runMediaProcess(runtime.ffprobePath, [
    "-v",
    "error",
    "-protocol_whitelist",
    "file,pipe",
    "-f",
    "image2",
    "-show_entries",
    "format=format_name:stream=codec_type,codec_name,width,height",
    "-of",
    "json",
    filePath,
  ]);
  const probe = parseProbeDocument(output);
  const format = getRecord(probe.format, "ffprobe image format");
  const formatName = getString(format.format_name, "ffprobe image format_name");
  if (!formatName.split(",").includes("image2")) {
    throw new Error("Reference media is not an image2 PNG or JPEG file.");
  }

  const streams = getRecordArray(probe.streams, "ffprobe image streams");
  if (streams.length !== 1) {
    throw new Error("Reference media must contain exactly one image stream.");
  }
  const stream = streams[0];
  if (getString(stream.codec_type, "ffprobe image codec_type") !== "video") {
    throw new Error("Reference media does not contain a visual image stream.");
  }

  const codecName = getString(stream.codec_name, "ffprobe image codec_name");
  const extension =
    codecName === "png" ? "png" : codecName === "mjpeg" ? "jpg" : null;
  if (!extension) {
    throw new Error(
      "Reference media must be an actual PNG or JPEG image, not an extension-labelled substitute."
    );
  }

  return {
    extension,
    width: getPositiveInteger(stream.width, "ffprobe image width"),
    height: getPositiveInteger(stream.height, "ffprobe image height"),
  };
}

async function inspectVideoFile(
  filePath: string,
  runtime: VideoChainMediaRuntime,
  input: VideoChainSegmentMediaInput
): Promise<VideoInspection> {
  const output = await runMediaProcess(runtime.ffprobePath, [
    "-v",
    "error",
    "-protocol_whitelist",
    "file,pipe",
    "-format_whitelist",
    "mov,mp4,m4a,3gp,3g2,mj2,matroska,webm,avi",
    "-show_entries",
    "format=format_name,duration:stream=codec_type,width,height",
    "-of",
    "json",
    filePath,
  ]);
  const probe = parseProbeDocument(output);
  const format = getRecord(probe.format, "ffprobe video format");
  const formatName = getString(format.format_name, "ffprobe video format_name");
  const formats = formatName.split(",");
  if (!formats.some(formatPart => ALLOWED_VIDEO_FORMATS.has(formatPart))) {
    throw new Error(
      "Provider media must use an allowlisted MOV/MP4, Matroska/WebM, or AVI demuxer."
    );
  }

  const durationSec = getPositiveNumber(
    format.duration,
    "ffprobe video duration"
  );
  if (durationSec > MAX_VIDEO_DURATION_SECONDS) {
    throw new Error(
      `Provider video duration exceeds ${MAX_VIDEO_DURATION_SECONDS} seconds.`
    );
  }

  const streams = getRecordArray(probe.streams, "ffprobe video streams");
  const videoStream = streams.find(
    stream => getOptionalString(stream.codec_type) === "video"
  );
  if (!videoStream) {
    throw new Error("Provider media does not contain a video stream.");
  }
  const width = getPositiveInteger(videoStream.width, "ffprobe video width");
  const height = getPositiveInteger(videoStream.height, "ffprobe video height");
  if (
    width > MAX_VIDEO_DIMENSION ||
    height > MAX_VIDEO_DIMENSION ||
    width * height > MAX_PIXEL_AREA
  ) {
    throw new Error(
      "Provider video dimensions exceed the permitted media-processing limits."
    );
  }

  const expectedAspectRatio = aspectRatioValue(input.aspectRatio);
  if (Math.abs(width / height - expectedAspectRatio) > 0.01) {
    throw new Error(
      "Provider video aspect ratio does not match the requested chain aspect ratio without cropping."
    );
  }
  const durationTolerance = Math.max(0.15, 1 / input.frameRate);
  if (Math.abs(durationSec - input.durationSec) > durationTolerance) {
    throw new Error(
      "Provider video duration is outside the permitted requested-duration tolerance."
    );
  }

  const frameCount = await countDecodedFrames(filePath, runtime);
  const actualFrameRate = frameCount / durationSec;
  if (!Number.isFinite(actualFrameRate) || actualFrameRate <= 0) {
    throw new Error(
      "Unable to calculate a positive decoded frame rate from the provider video."
    );
  }

  return { durationSec, width, height, frameCount, actualFrameRate };
}

async function countDecodedFrames(
  filePath: string,
  runtime: VideoChainMediaRuntime
): Promise<number> {
  const output = await runMediaProcess(runtime.ffprobePath, [
    "-v",
    "error",
    "-protocol_whitelist",
    "file,pipe",
    "-format_whitelist",
    "mov,mp4,m4a,3gp,3g2,mj2,matroska,webm,avi",
    "-count_frames",
    "-select_streams",
    "v:0",
    "-show_entries",
    "stream=nb_read_frames",
    "-of",
    "json",
    filePath,
  ]);
  const probe = parseProbeDocument(output);
  const streams = getRecordArray(
    probe.streams,
    "ffprobe decoded-frame streams"
  );
  if (streams.length !== 1) {
    throw new Error(
      "Unable to count decoded frames for the primary video stream."
    );
  }
  const frameCount = getPositiveInteger(
    streams[0].nb_read_frames,
    "ffprobe nb_read_frames"
  );
  if (frameCount > MAX_DECODED_FRAMES) {
    throw new Error(
      `Provider video has more than ${MAX_DECODED_FRAMES} decoded frames.`
    );
  }
  return frameCount;
}

async function extractTerminalFrame(
  inputVideo: string,
  outputPng: string,
  frameCount: number,
  runtime: VideoChainMediaRuntime
): Promise<void> {
  await runMediaProcess(runtime.ffmpegPath, [
    "-hide_banner",
    "-loglevel",
    "error",
    "-nostdin",
    "-threads",
    "2",
    "-protocol_whitelist",
    "file,pipe",
    "-format_whitelist",
    "mov,mp4,m4a,3gp,3g2,mj2,matroska,webm,avi",
    "-i",
    inputVideo,
    "-map",
    "0:v:0",
    "-an",
    "-vf",
    `select=eq(n\\,${frameCount - 1})`,
    "-fps_mode",
    "passthrough",
    "-vsync",
    "0",
    "-frames:v",
    "1",
    "-c:v",
    "png",
    "-f",
    "image2",
    outputPng,
  ]);
}

async function runMediaProcess(
  binary: string,
  args: readonly string[]
): Promise<string> {
  if (!binary.trim()) {
    throw new Error("Configured media binary path must not be empty.");
  }
  const result = await execFileAsync(binary, args, {
    encoding: "utf8",
    timeout: MEDIA_PROCESS_TIMEOUT_MS,
    maxBuffer: MEDIA_MAX_BUFFER_BYTES,
    windowsHide: true,
  });
  return result.stdout;
}

/** HTTPS-only production downloader with DNS pinning and redirect revalidation. */
export async function downloadHttpsToFile(
  url: string,
  destination: string,
  maximumBytes: number
): Promise<void> {
  if (!Number.isSafeInteger(maximumBytes) || maximumBytes <= 0) {
    throw new Error("Download maximumBytes must be a positive safe integer.");
  }
  const parsed = parseProductionDownloadUrl(url);
  await fs.mkdir(path.dirname(destination), { recursive: true, mode: 0o700 });

  const response = await followValidatedHttpsRedirects(parsed);
  await streamResponseToNewFile(response, destination, maximumBytes);
}

async function followValidatedHttpsRedirects(
  initialUrl: URL
): Promise<IncomingMessage> {
  let currentUrl = initialUrl;
  for (let redirects = 0; redirects <= 3; redirects += 1) {
    const response = await requestPinnedHttps(currentUrl);
    const statusCode = response.statusCode ?? 0;
    if (statusCode >= 300 && statusCode < 400) {
      const location = response.headers.location;
      response.resume();
      if (!location || Array.isArray(location)) {
        throw new Error(
          "Provider download redirect is missing a single Location header."
        );
      }
      if (redirects === 3) {
        throw new Error("Provider download exceeded the redirect limit.");
      }
      currentUrl = parseProductionDownloadUrl(
        new URL(location, currentUrl).toString()
      );
      continue;
    }
    if (statusCode < 200 || statusCode >= 300) {
      response.resume();
      throw new Error(`Provider download returned HTTP ${statusCode}.`);
    }
    return response;
  }
  throw new Error("Provider download redirect resolution failed.");
}

async function requestPinnedHttps(url: URL): Promise<IncomingMessage> {
  const addresses = await resolveOnlyPublicAddresses(url.hostname);
  const selected = addresses[0];

  return new Promise<IncomingMessage>((resolvePromise, rejectPromise) => {
    let settled = false;
    const settleReject = (error: Error): void => {
      if (!settled) {
        settled = true;
        rejectPromise(error);
      }
    };
    const request = https.request(
      url,
      {
        lookup: (_hostname, options, callback): void => {
          if (options.all) callback(null, addresses);
          else callback(null, selected.address, selected.family);
        },
        headers: {
          "user-agent": "CreatorVaultMediaFetcher/1.0",
          accept: "video/*,image/*;q=0.9,*/*;q=0.1",
        },
      },
      response => {
        if (!settled) {
          settled = true;
          resolvePromise(response);
        }
      }
    );
    request.once("error", (error: Error) => settleReject(error));
    request.setTimeout(DOWNLOAD_TIMEOUT_MS, () => {
      request.destroy(new Error("Provider download timed out."));
    });
    request.end();
  });
}

async function resolveOnlyPublicAddresses(
  hostname: string
): Promise<Array<{ address: string; family: 4 | 6 }>> {
  const unbracketedHostname = stripIpv6Brackets(hostname);
  const family = isIP(unbracketedHostname);
  if (family === 4 || family === 6) {
    if (isForbiddenNetworkAddress(unbracketedHostname)) {
      throw new Error(
        "Provider download hostname resolves to a forbidden network address."
      );
    }
    return [{ address: unbracketedHostname, family }];
  }

  const [ipv4Result, ipv6Result] = await Promise.allSettled([
    dns.resolve4(unbracketedHostname),
    dns.resolve6(unbracketedHostname),
  ]);
  const addresses: Array<{ address: string; family: 4 | 6 }> = [];
  if (ipv4Result.status === "fulfilled") {
    addresses.push(
      ...ipv4Result.value.map(address => ({ address, family: 4 as const }))
    );
  }
  if (ipv6Result.status === "fulfilled") {
    addresses.push(
      ...ipv6Result.value.map(address => ({ address, family: 6 as const }))
    );
  }
  if (addresses.length === 0) {
    throw new Error(
      "Provider download hostname did not resolve to a public address."
    );
  }
  if (addresses.some(({ address }) => isForbiddenNetworkAddress(address))) {
    throw new Error(
      "Provider download hostname resolved to a forbidden network address."
    );
  }
  return addresses;
}

async function streamResponseToNewFile(
  response: IncomingMessage,
  destination: string,
  maximumBytes: number
): Promise<void> {
  const contentLengthHeader = response.headers["content-length"];
  if (typeof contentLengthHeader === "string") {
    const contentLength = Number(contentLengthHeader);
    if (
      !Number.isSafeInteger(contentLength) ||
      contentLength < 0 ||
      contentLength > maximumBytes
    ) {
      response.resume();
      throw new Error(
        "Provider download content-length exceeds the permitted size."
      );
    }
  }

  let createdDestination = false;
  try {
    await new Promise<void>((resolvePromise, rejectPromise) => {
      const output = createWriteStream(destination, {
        flags: "wx",
        mode: 0o600,
      });
      let complete = false;
      let receivedBytes = 0;
      const timeout = setTimeout(() => {
        fail(
          new Error("Provider download exceeded the total download timeout.")
        );
      }, DOWNLOAD_TIMEOUT_MS);

      const finish = (): void => {
        if (!complete) {
          complete = true;
          clearTimeout(timeout);
          resolvePromise();
        }
      };
      const fail = (error: Error): void => {
        if (!complete) {
          complete = true;
          clearTimeout(timeout);
          response.destroy(error);
          output.destroy();
          rejectPromise(error);
        }
      };

      output.once("open", () => {
        createdDestination = true;
      });
      output.once("error", fail);
      response.once("error", fail);
      response.on("data", (chunk: Buffer) => {
        if (complete) {
          return;
        }
        receivedBytes += chunk.length;
        if (receivedBytes > maximumBytes) {
          fail(
            new Error("Provider download exceeded the permitted streamed size.")
          );
          return;
        }
        if (!output.write(chunk)) {
          response.pause();
          output.once("drain", () => response.resume());
        }
      });
      response.once("end", () => {
        if (!complete) {
          output.end();
        }
      });
      output.once("finish", finish);
    });
  } catch (error: unknown) {
    if (createdDestination) {
      await fs.rm(destination, { force: true }).catch(() => undefined);
    }
    throw error;
  }
}

function resolveRuntime(
  runtime: VideoChainMediaRuntime | undefined
): VideoChainMediaRuntime {
  const resolved = runtime ?? getVideoChainMediaRuntime();
  validatePublicBaseUrl(resolved.publicBaseUrl);
  if (!resolved.uploadsRoot.trim()) {
    throw new Error("uploadsRoot must not be empty.");
  }
  if (!resolved.ffmpegPath.trim() || !resolved.ffprobePath.trim()) {
    throw new Error("Configured media binary paths must not be empty.");
  }
  return resolved;
}

function assertRequestedVideoProperties(
  input: VideoChainSegmentMediaInput
): void {
  if (
    !Number.isFinite(input.durationSec) ||
    input.durationSec <= 0 ||
    input.durationSec > MAX_VIDEO_DURATION_SECONDS
  ) {
    throw new Error(
      `durationSec must be greater than zero and no more than ${MAX_VIDEO_DURATION_SECONDS}.`
    );
  }
  if (!Number.isFinite(input.frameRate) || input.frameRate <= 0) {
    throw new Error("frameRate must be a positive finite value.");
  }
}

function assertPersonaReferenceDimensions(image: ImageInspection): void {
  if (
    image.width < 300 ||
    image.height < 300 ||
    image.width * image.height > MAX_PIXEL_AREA
  ) {
    throw new Error(
      "Persona reference must be at least 300px in each dimension and no more than 16 million pixels."
    );
  }
}

function assertUuid(value: string, fieldName: string): void {
  if (!UUID_PATTERN.test(value)) {
    throw new Error(`${fieldName} must be a UUID.`);
  }
}

function assertHttpUrl(value: string, fieldName: string): void {
  try {
    const parsed = new URL(value);
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
      throw new Error("unsupported protocol");
    }
  } catch {
    throw new Error(`${fieldName} must be an absolute HTTP(S) URL.`);
  }
}

function validatePublicBaseUrl(value: string): URL {
  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    throw new Error(
      "CREATORVAULT_PUBLIC_BASE_URL must be an absolute HTTPS URL."
    );
  }
  if (
    parsed.protocol !== "https:" ||
    !parsed.hostname ||
    parsed.username ||
    parsed.password ||
    parsed.pathname !== "/" ||
    parsed.search ||
    parsed.hash
  ) {
    throw new Error(
      "CREATORVAULT_PUBLIC_BASE_URL must be a credential-free HTTPS origin without a path, query, or fragment."
    );
  }
  return parsed;
}

function publicUploadUrl(
  runtime: VideoChainMediaRuntime,
  segments: readonly string[]
): string {
  const base = validatePublicBaseUrl(runtime.publicBaseUrl);
  return new URL(
    `/uploads/${segments.map(segment => encodeURIComponent(segment)).join("/")}`,
    base
  ).toString();
}

function parseProductionDownloadUrl(value: string): URL {
  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    throw new Error("Provider download URL must be an absolute HTTPS URL.");
  }
  if (
    parsed.protocol !== "https:" ||
    !parsed.hostname ||
    parsed.username ||
    parsed.password
  ) {
    throw new Error("Provider download URL must be credential-free HTTPS.");
  }
  return parsed;
}

function aspectRatioValue(
  value: VideoChainSegmentMediaInput["aspectRatio"]
): number {
  if (value === "16:9") return 16 / 9;
  if (value === "9:16") return 9 / 16;
  return 1;
}

function parseProbeDocument(value: string): Record<string, unknown> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(value) as unknown;
  } catch {
    throw new Error("ffprobe did not return valid JSON.");
  }
  return getRecord(parsed, "ffprobe document");
}

function getRecord(value: unknown, label: string): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error(`${label} is malformed.`);
  }
  return value as Record<string, unknown>;
}

function getRecordArray(
  value: unknown,
  label: string
): Record<string, unknown>[] {
  if (!Array.isArray(value)) {
    throw new Error(`${label} is malformed.`);
  }
  return value.map(entry => getRecord(entry, label));
}

function getString(value: unknown, label: string): string {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`${label} is missing or invalid.`);
  }
  return value;
}

function getOptionalString(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

function getPositiveNumber(value: unknown, label: string): number {
  const numberValue =
    typeof value === "number"
      ? value
      : typeof value === "string"
        ? Number(value)
        : Number.NaN;
  if (!Number.isFinite(numberValue) || numberValue <= 0) {
    throw new Error(`${label} must be a positive finite number.`);
  }
  return numberValue;
}

function getPositiveInteger(value: unknown, label: string): number {
  const numberValue = getPositiveNumber(value, label);
  if (!Number.isSafeInteger(numberValue)) {
    throw new Error(`${label} must be a positive safe integer.`);
  }
  return numberValue;
}

async function assertRegularFileWithin(
  filePath: string,
  maximumBytes: number,
  label: string
): Promise<void> {
  const details = await fs.lstat(filePath);
  if (
    !details.isFile() ||
    details.isSymbolicLink() ||
    details.size <= 0 ||
    details.size > maximumBytes
  ) {
    throw new Error(
      `${label} must be a non-empty regular file within the permitted size.`
    );
  }
}

async function ensureRealDirectory(directoryPath: string): Promise<void> {
  await fs.mkdir(directoryPath, { recursive: true, mode: 0o700 });
  await assertRealDirectory(directoryPath, "Storage directory");
}

async function assertRealDirectory(
  directoryPath: string,
  label: string
): Promise<void> {
  const details = await fs.lstat(directoryPath);
  if (!details.isDirectory() || details.isSymbolicLink()) {
    throw new Error(`${label} must be a real directory, not a symbolic link.`);
  }
}

async function pathExists(targetPath: string): Promise<boolean> {
  try {
    await fs.lstat(targetPath);
    return true;
  } catch (error: unknown) {
    if (hasErrorCode(error, "ENOENT")) {
      return false;
    }
    throw error;
  }
}

async function sha256File(filePath: string): Promise<string> {
  const hash = createHash("sha256");
  for await (const chunk of createReadStream(filePath)) {
    if (!Buffer.isBuffer(chunk)) {
      throw new Error("Unexpected non-buffer file stream chunk.");
    }
    hash.update(chunk);
  }
  return hash.digest("hex");
}

async function syncFile(filePath: string): Promise<void> {
  const handle = await fs.open(filePath, "r");
  try {
    await handle.sync();
  } finally {
    await handle.close();
  }
}

async function syncDirectory(directoryPath: string): Promise<void> {
  const handle = await fs.open(directoryPath, "r");
  try {
    await handle.sync();
  } finally {
    await handle.close();
  }
}

async function removeQuietly(targetPath: string): Promise<void> {
  await fs
    .rm(targetPath, { recursive: true, force: true })
    .catch(() => undefined);
}

function isDestinationExistsError(error: unknown): boolean {
  return hasErrorCode(error, "EEXIST") || hasErrorCode(error, "ENOTEMPTY");
}

function hasErrorCode(error: unknown, code: string): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: unknown }).code === code
  );
}

function stripIpv6Brackets(value: string): string {
  return value.startsWith("[") && value.endsWith("]")
    ? value.slice(1, -1)
    : value;
}

function ipv4ToInteger(address: string): number | null {
  const parts = address.split(".");
  if (parts.length !== 4) {
    return null;
  }
  let value = 0;
  for (const part of parts) {
    if (!/^(0|[1-9][0-9]{0,2})$/.test(part)) {
      return null;
    }
    const octet = Number(part);
    if (!Number.isInteger(octet) || octet < 0 || octet > 255) {
      return null;
    }
    value = value * 256 + octet;
  }
  return value;
}

function integerToIpv4(value: number): string {
  return [
    (value >>> 24) & 0xff,
    (value >>> 16) & 0xff,
    (value >>> 8) & 0xff,
    value & 0xff,
  ].join(".");
}

function ipv6ToInteger(address: string): bigint | null {
  let candidate = address.toLowerCase();
  if (candidate.includes("%")) {
    return null;
  }
  if (candidate.includes(".")) {
    const finalColon = candidate.lastIndexOf(":");
    if (finalColon < 0) {
      return null;
    }
    const ipv4 = ipv4ToInteger(candidate.slice(finalColon + 1));
    if (ipv4 === null) {
      return null;
    }
    candidate = `${candidate.slice(0, finalColon + 1)}${((ipv4 >>> 16) & 0xffff).toString(16)}:${(ipv4 & 0xffff).toString(16)}`;
  }

  const split = candidate.split("::");
  if (split.length > 2) {
    return null;
  }
  const head = split[0] ? split[0].split(":") : [];
  const tail = split.length === 2 && split[1] ? split[1].split(":") : [];
  const missing = 8 - head.length - tail.length;
  if (
    (split.length === 1 && missing !== 0) ||
    (split.length === 2 && missing < 1)
  ) {
    return null;
  }
  const groups = [
    ...head,
    ...Array<string>(Math.max(0, missing)).fill("0"),
    ...tail,
  ];
  if (
    groups.length !== 8 ||
    groups.some(group => !/^[0-9a-f]{1,4}$/.test(group))
  ) {
    return null;
  }
  let value = 0n;
  for (const group of groups) {
    value = (value << 16n) + BigInt(`0x${group}`);
  }
  return value;
}

function hasIpv6Prefix(value: bigint, prefix: bigint, bits: number): boolean {
  return value >> BigInt(128 - bits) === prefix >> BigInt(128 - bits);
}

/** Verify published immutable bytes before a paid generator can reference them. */
export async function assertVideoChainFrameIntegrity(
  input: { url: string; sha256: string; aspectRatio: "16:9" | "9:16" | "1:1" },
  suppliedRuntime?: VideoChainMediaRuntime
): Promise<void> {
  const runtime = resolveRuntime(suppliedRuntime);
  const url = new URL(input.url);
  if (
    url.origin !== new URL(runtime.publicBaseUrl).origin ||
    url.search ||
    url.hash
  )
    throw new Error(
      "The chain frame is not an immutable locally owned public reference"
    );
  const matched = url.pathname.match(
    /^\/uploads\/(persona-vaults|video-chains)\/([^/]+)\/([^/]+)\/(reference\.(?:png|jpg)|terminal\.png)$/
  );
  if (
    !matched ||
    (matched[1] === "persona-vaults" && !matched[4].startsWith("reference.")) ||
    (matched[1] === "video-chains" && matched[4] !== "terminal.png")
  )
    throw new Error(
      "The chain frame path is not an owned immutable identity/frame asset"
    );
  assertUuid(matched[2], "frame owner ID");
  assertUuid(matched[3], "frame asset ID");
  const file = path.join(
    runtime.uploadsRoot,
    matched[1],
    matched[2],
    matched[3],
    matched[4]
  );
  await ensureRealDirectory(path.dirname(file));
  await assertRegularFileWithin(file, MAX_IMAGE_BYTES, "Pinned chain frame");
  if ((await sha256File(file)) !== input.sha256)
    throw new Error(
      "The pinned chain frame bytes changed; no substituted frame may be submitted"
    );
  const image = await inspectImageFile(file, runtime);
  const [width, height] = input.aspectRatio.split(":").map(Number);
  if (Math.abs(image.width / image.height - width / height) > 0.01)
    throw new Error(
      "The pinned chain frame does not match the approved aspect ratio; no crop is permitted"
    );
}
