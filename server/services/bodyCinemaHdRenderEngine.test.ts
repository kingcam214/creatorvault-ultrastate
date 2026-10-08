import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import { lstat, mkdir, mkdtemp, open, readFile, rm, symlink, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  BODY_CINEMA_HD_GRADE_VERSION,
  BODY_CINEMA_HD_LIMITS,
  buildBodyCinemaHdCommand,
  buildBodyCinemaHdFilter,
  getBodyCinemaHdGradeFilter,
  renderBodyCinemaHd,
  type HdRenderRecipe,
  type HdRenderSourceMetadata,
} from "./bodyCinemaHdRenderEngine";

const execute = promisify(execFile);
const grades: HdRenderRecipe["visualGradeId"][] = ["obsidian", "la_reina", "golden_hour", "midnight_heat"];
function recipe(changes: Partial<HdRenderRecipe> = {}): HdRenderRecipe {
  return {
    version: "body_cinema.hd_recipe.v1",
    sourceSha256: "a".repeat(64), sourceAssetId: "source-1",
    bodyFocusId: "native", bodyFocusLabel: "Complete native framing",
    editStyleId: "measured", editStyleName: "Measured native cuts",
    visualGradeId: "la_reina",
    segments: [{ startMs: 0, endMs: 3500 }, { startMs: 3500, endMs: 7000 }, { startMs: 7000, endMs: 10500 }],
    width: 1920, height: 1080, durationSeconds: 10.5,
    framing: "complete_native_source", ...changes,
  };
}
function source(changes: Partial<HdRenderSourceMetadata> = {}): HdRenderSourceMetadata {
  return { width: 1280, height: 720, durationSeconds: 12, frameRate: "24/1", hasAudio: true, audioDurationSeconds: 12, ...changes };
}
function command(changes: Partial<HdRenderRecipe> = {}): string[] {
  return buildBodyCinemaHdCommand({ recipe: recipe(changes), source: source(), sourcePath: `/proc/${process.pid}/fd/20`, outputPath: `/proc/${process.pid}/fd/21` });
}

describe("Body Cinema HD pure recipe/filter compilation", () => {
  it("has four distinct finite, color-only grades and the demonstrated exact La Reina curve", () => {
    const filters = grades.map(getBodyCinemaHdGradeFilter);
    expect(new Set(filters).size).toBe(4);
    for (const filter of filters) {
      expect(filter).not.toMatch(/NaN|Infinity|crop|scale|pad|zoom|overlay|blend|fps|interpol|noise|draw|rotate|sharpen|vignette/i);
      expect(filter.split(",").every(part => /^(curves|eq)=/.test(part))).toBe(true);
      for (const [, points] of filter.matchAll(/'([^']+)'/g)) {
        let previousX = -1;
        let previousY = -1;
        for (const point of points.split(" ")) {
          const [x, y] = point.split("/").map(Number);
          expect(Number.isFinite(x) && Number.isFinite(y)).toBe(true);
          expect(x).toBeGreaterThan(previousX);
          expect(y).toBeGreaterThanOrEqual(previousY);
          expect(x).toBeGreaterThanOrEqual(0);
          expect(x).toBeLessThanOrEqual(1);
          expect(y).toBeGreaterThanOrEqual(0);
          expect(y).toBeLessThanOrEqual(1);
          [previousX, previousY] = [x, y];
        }
      }
    }
    expect(filters[1]).toBe("curves=master='0/0.008 0.10/0.085 0.25/0.24 0.50/0.53 0.75/0.79 0.92/0.93 1/0.985',eq=saturation=1.035");
  });

  it("keeps complete native framing, deterministic luma grain, and exact sample cuts", () => {
    const plan = buildBodyCinemaHdFilter(recipe(), source());
    expect(plan.frameCount).toBe(252);
    expect(plan.durationSeconds).toBe(10.5);
    expect(plan.segments.map(segment => segment.frameCount)).toEqual([84, 84, 84]);
    expect(plan.segments.map(segment => segment.sampleCount)).toEqual([168000, 168000, 168000]);
    expect(plan.filterComplex).toContain("force_original_aspect_ratio=decrease:force_divisible_by=2");
    expect(plan.filterComplex).toContain("pad=1920:1080:(ow-iw)/2:(oh-ih)/2:color=0x0A0A0A");
    expect(plan.filterComplex).toContain("noise=c0s=2:c0f=t:c1s=0:c2s=0:all_seed=214");
    expect(plan.filterComplex).toContain("aresample=48000:async=0,atrim=start_sample=168000:end_sample=336000");
    expect(plan.filterComplex).toContain("afade=t=in:d=0.004,afade=t=out:st=3.496000000:d=0.004");
    expect(plan.filterComplex).not.toMatch(/crop=|fps=|minterpolate|zoompan|loop=|split=|asplit=/);
    expect(plan.filterComplex.indexOf("noise=")).toBeLessThan(plan.filterComplex.indexOf(",pad="));
  });

  it("does not invent audio for a genuinely silent source", () => {
    const silent = source({ hasAudio: false, audioDurationSeconds: undefined });
    const plan = buildBodyCinemaHdFilter(recipe(), silent);
    expect(plan.hasAudio).toBe(false);
    expect(plan.filterComplex).toContain("concat=n=3:v=1:a=0");
    expect(plan.filterComplex).not.toMatch(/:a:0|aresample|afade|anullsrc|\[audio\]/);
    const args = buildBodyCinemaHdCommand({ recipe: recipe(), source: silent, sourcePath: "/tmp/source", outputPath: `/proc/${process.pid}/fd/21` });
    expect(args).toContain("-an");
    expect(args).not.toContain("aac");
  });

  it.each(["24000/1001", "24/1", "25/1", "30000/1001", "30/1", "60000/1001", "60/1"])("preserves original supported rational %s and conservative alignment", frameRate => {
    const [numerator, denominator] = frameRate.split("/").map(Number);
    const fps = numerator / denominator;
    const plan = buildBodyCinemaHdFilter(recipe(), source({ frameRate }));
    expect(plan.frameRate).toBe(frameRate);
    expect(plan.segments[1].startFrame).toBe(Math.ceil(3.5 * fps));
    expect(plan.segments[1].endFrame).toBe(Math.floor(7 * fps));
    for (const [index, segment] of plan.segments.entries()) {
      expect(segment.startFrame / fps).toBeGreaterThanOrEqual(recipe().segments[index].startMs / 1000 - 1e-9);
      expect(segment.endFrame / fps).toBeLessThanOrEqual(recipe().segments[index].endMs / 1000 + 1e-9);
      expect(segment.frameCount / fps).toBeGreaterThanOrEqual(2);
    }
    expect(Math.abs(plan.segments.reduce((total, segment) => total + segment.sampleCount, 0) / 48000 - plan.durationSeconds)).toBeLessThanOrEqual(0.5 / 48000 + 1e-9);
  });

  it.each([
    { width: 720, height: 1280, outputWidth: 1080, outputHeight: 1920, rotation: 0 },
    { width: 1280, height: 720, outputWidth: 1080, outputHeight: 1920, rotation: 90 },
    { width: 1080, height: 1080, outputWidth: 1080, outputHeight: 1080, rotation: 0 },
  ])("selects orientation-safe HD canvas $outputWidth x $outputHeight", ({ width, height, outputWidth, outputHeight, rotation }) => {
    const plan = buildBodyCinemaHdFilter(recipe({ width: outputWidth, height: outputHeight }), source({ width, height, rotation }));
    expect(plan.filterComplex).toContain(`pad=${outputWidth}:${outputHeight}:`);
    expect(plan.filterComplex).not.toContain("crop");
  });

  it("permits editorial reorder without reusing source ranges or buffering source-tail splits", () => {
    const original = recipe();
    const plan = buildBodyCinemaHdFilter({ ...original, segments: [original.segments[2], original.segments[0], original.segments[1]] }, source());
    expect(plan.segments[0].startFrame).toBe(168);
    expect(plan.filterComplex).toContain("[0:v:0]trim=start_frame=168:end_frame=252");
    expect(plan.filterComplex).not.toMatch(/split=|asplit=/);
  });

  it.each([
    { durationSeconds: 9 }, { durationSeconds: 16 }, { durationSeconds: Infinity },
    { width: 1280, height: 720 }, { width: 1080, height: 1920 },
    { sourceSha256: "bad" }, { bodyFocusId: "" },
    { segments: [{ startMs: 0, endMs: 1500 }, { startMs: 1500, endMs: 7000 }, { startMs: 7000, endMs: 10500 }] },
    { segments: [{ startMs: 0, endMs: 4000 }, { startMs: 3500, endMs: 7000 }, { startMs: 7000, endMs: 10000 }] },
    { segments: [{ startMs: 0, endMs: 3500 }, { startMs: 0, endMs: 3500 }, { startMs: 7000, endMs: 10500 }] },
    { segments: [{ startMs: 0, endMs: 3500 }, { startMs: 3500, endMs: 7000 }] },
    { segments: [{ startMs: -1, endMs: 3500 }, { startMs: 3500, endMs: 7000 }, { startMs: 7000, endMs: 10500 }] },
    { segments: [{ startMs: 0, endMs: 3500 }, { startMs: 3500, endMs: 7000 }, { startMs: 11000, endMs: 14500 }] },
  ] satisfies Partial<HdRenderRecipe>[])("denies invalid/hostile recipe %#", changes => {
    expect(() => buildBodyCinemaHdFilter(recipe(changes), source())).toThrow(/BODY_CINEMA_HD_/);
  });

  it.each([
    { width: 640, height: 360 }, { width: 1280, height: 719 }, { width: 5000 },
    { width: 1921 }, { height: 1921 },
    { durationSeconds: 9 }, { durationSeconds: 60.001 }, { durationSeconds: 601 }, { frameRate: "0/0" },
    { frameRate: "120/1" }, { frameRate: "23.976" }, { frameRate: "24/1;evil" },
    { rotation: 45 }, { audioDurationSeconds: 3 },
    { audioDurationSeconds: undefined }, { width: 4096, height: 4096 },
  ] satisfies Partial<HdRenderSourceMetadata>[])("denies unsupported/sub-HD/unbounded source metadata %#", changes => {
    expect(() => buildBodyCinemaHdFilter(recipe(), source(changes))).toThrow(/BODY_CINEMA_HD_/);
  });

  it("rejects aligned microshots even when the raw milliseconds claim two seconds", () => {
    const segments = [{ startMs: 1, endMs: 2001 }, { startMs: 2500, endMs: 6500 }, { startMs: 7000, endMs: 11000 }];
    expect(() => buildBodyCinemaHdFilter(recipe({ segments, durationSeconds: 10 }), source())).toThrow("ALIGNED_MICROSHOT");
  });

  it("rejects total aligned duration under ten seconds and mismatched saved duration", () => {
    const segments = [{ startMs: 1, endMs: 3334 }, { startMs: 3500, endMs: 6833 }, { startMs: 7000, endMs: 10334 }];
    expect(() => buildBodyCinemaHdFilter(recipe({ segments, durationSeconds: 10 }), source())).toThrow("ALIGNED_DURATION_OUTSIDE_LIMITS");
    expect(() => buildBodyCinemaHdFilter(recipe({ durationSeconds: 11 }), source())).toThrow(/BODY_CINEMA_HD_/);
  });

  it("locks finite compute, quality, timeout, disk, inode and output-memory budgets", () => {
    const args = command();
    expect(args).toEqual(expect.arrayContaining(["libx264", "high", "slow", "16", "20M", "40M", "yuv420p", "bt709", "aac", "320k", "48000", "+faststart", "mp4", "passthrough"]));
    expect(args[args.indexOf("-threads:v") + 1]).toBe("2");
    expect(args[args.indexOf("-filter_complex_threads") + 1]).toBe("1");
    expect(args.filter(arg => arg === "-i")).toHaveLength(3);
    expect(args.filter(arg => arg === "-threads")).toHaveLength(3);
    expect(args[args.indexOf("-protocol_whitelist") + 1]).toBe("file");
    expect(args).toContain("-enc_time_base:v");
    expect(args).not.toContain("-enc_time_base");
    expect(args).not.toContain("-r");
    expect(args).not.toContain("-shortest");
    expect(BODY_CINEMA_HD_LIMITS.renderTimeoutMs).toBe(600000);
    expect(BODY_CINEMA_HD_LIMITS.maximumStderrBytes).toBeLessThanOrEqual(65536);
    expect(BODY_CINEMA_HD_LIMITS.maximumCadenceBytes).toBeLessThanOrEqual(2 * 1024 ** 2);
    expect(BODY_CINEMA_HD_LIMITS.minimumAvailableBytes).toBe(1024 ** 3);
    expect(BODY_CINEMA_HD_LIMITS.minimumAvailableInodes).toBe(1000);
    expect(BODY_CINEMA_HD_LIMITS.maximumSourceSeconds).toBe(60);
    expect(BODY_CINEMA_HD_LIMITS.maximumNativeDimension).toBe(1920);
    expect(BODY_CINEMA_HD_LIMITS.minimumFreeMemoryBytes).toBe(512 * 1024 ** 2);
  });

  it.each(["https://host/private?secret=do-not-log", "file:///tmp/source", "../source", "//host/source", "/tmp/a\nsecret", "/dev/zero", "/proc/1/fd/9", "/tmp/../source"])("rejects nonlocal/hostile command input %s", sourcePath => {
    expect(() => buildBodyCinemaHdCommand({ sourcePath, outputPath: `/proc/${process.pid}/fd/21`, recipe: recipe(), source: source() })).toThrow(/BODY_CINEMA_HD_/);
  });

  it("command output must be the executor-reserved descriptor, never an arbitrary existing pathname", () => {
    expect(() => buildBodyCinemaHdCommand({ sourcePath: "/tmp/source", outputPath: "/tmp/output", recipe: recipe(), source: source() })).toThrow("OUTPUT_NOT_RESERVED_DESCRIPTOR");
    expect(() => buildBodyCinemaHdCommand({ sourcePath: `/proc/${process.pid}/fd/21`, outputPath: `/proc/${process.pid}/fd/21`, recipe: recipe(), source: source() })).toThrow("OUTPUT_EQUALS_SOURCE");
  });
});

let fixtureRoot: string;
beforeAll(async () => {
  const root = process.env.BODY_CINEMA_HD_TEST_ARTIFACT_ROOT ?? os.tmpdir();
  await mkdir(root, { recursive: true });
  fixtureRoot = await mkdtemp(path.join(root, "body-cinema-hd-engine-test-"));
});
afterAll(async () => {
  // Delete only the unique directory and files created by this test suite.
  if (fixtureRoot) await rm(fixtureRoot, { recursive: true, force: true });
});

describe("Body Cinema HD secure local executor preconditions", () => {
  it("denies final and ancestor source symlinks without hashing or invoking a provider", async () => {
    const protectedPath = path.join(fixtureRoot, "protected-original");
    await writeFile(protectedPath, "source bytes");
    const link = path.join(fixtureRoot, "source-link");
    await symlink(protectedPath, link);
    const directoryLink = path.join(fixtureRoot, "directory-link");
    await symlink(fixtureRoot, directoryLink);
    for (const sourcePath of [link, path.join(directoryLink, "protected-original")]) {
      await expect(renderBodyCinemaHd({ sourcePath, outputPath: path.join(fixtureRoot, "never-created"), recipe: recipe() })).rejects.toThrow(/^BODY_CINEMA_HD_[A-Z_]+$/);
    }
    expect(await readFile(protectedPath, "utf8")).toBe("source bytes");
    await expect(lstat(path.join(fixtureRoot, "never-created"))).rejects.toThrow();
  });

  it("verifies exact checksum before probing and keeps failed output absent", async () => {
    const sourcePath = path.join(fixtureRoot, "wrong-hash");
    const outputPath = path.join(fixtureRoot, "wrong-hash-output");
    await writeFile(sourcePath, "source bytes");
    await expect(renderBodyCinemaHd({ sourcePath, outputPath, recipe: recipe() })).rejects.toThrow("SOURCE_SHA256_MISMATCH");
    await expect(lstat(outputPath)).rejects.toThrow();
  });

  it("accepts only an own-process regular retained descriptor then hashes it", async () => {
    const sourcePath = path.join(fixtureRoot, "own-fd-source");
    await writeFile(sourcePath, "fd source bytes");
    const handle = await open(sourcePath, "r");
    try {
      await expect(renderBodyCinemaHd({ sourcePath: `/proc/${process.pid}/fd/${handle.fd}`, outputPath: path.join(fixtureRoot, "own-fd-output"), recipe: recipe() })).rejects.toThrow("SOURCE_SHA256_MISMATCH");
      expect((await handle.stat()).isFile()).toBe(true);
    } finally { await handle.close(); }
  });

  it("sanitizes path, malformed media and process errors without echoing secrets", async () => {
    const sourcePath = path.join(fixtureRoot, "SECRET-DO-NOT-LOG");
    const bytes = Buffer.from("invalid media SECRET-DO-NOT-LOG");
    await writeFile(sourcePath, bytes);
    const sourceSha256 = createHash("sha256").update(bytes).digest("hex");
    await expect(renderBodyCinemaHd({ sourcePath, outputPath: path.join(fixtureRoot, "invalid-output"), recipe: recipe({ sourceSha256 }) })).rejects.toThrow(/^BODY_CINEMA_HD_[A-Z_]+$/);
    await expect(renderBodyCinemaHd({ sourcePath: "https://host/SECRET-DO-NOT-LOG", outputPath: path.join(fixtureRoot, "remote-output"), recipe: recipe() })).rejects.toThrow("NONLOCAL_OR_UNSAFE_PATH");
  });
});

/** Opt-in native tests use no mocks and make no network/provider calls. */
const nativeTests = process.env.BODY_CINEMA_HD_RUN_FFMPEG_TESTS === "1" ? describe : describe.skip;
nativeTests("Body Cinema HD native FFmpeg integration", () => {
  let silentPath: string;
  let audioPath: string;
  beforeAll(async () => {
    silentPath = path.join(fixtureRoot, "native-silent.mp4");
    audioPath = path.join(fixtureRoot, "native-audio.mp4");
    await execute("ffmpeg", ["-nostdin", "-v", "error", "-n", "-f", "lavfi", "-i", "color=c=0xB28268:s=1280x720:r=24:d=12", "-c:v", "libx264", "-threads", "1", "-pix_fmt", "yuv420p", "-an", silentPath], { timeout: 60000 });
    await execute("ffmpeg", ["-nostdin", "-v", "error", "-n", "-i", silentPath, "-f", "lavfi", "-i", "sine=frequency=440:sample_rate=44100:duration=12", "-c:v", "copy", "-c:a", "aac", "-threads", "1", "-shortest", audioPath], { timeout: 60000 });
  }, 120000);

  it.each(grades)("FFmpeg executes actual finite %s grade", async grade => {
    await execute("ffmpeg", ["-nostdin", "-v", "error", "-f", "lavfi", "-i", "color=c=0xB28268:s=32x32:r=24:d=0.125", "-vf", getBodyCinemaHdGradeFilter(grade), "-threads", "1", "-filter_threads", "1", "-f", "null", "-"], { timeout: 10000 });
  });

  it.each([false, true])("fully renders and verifies a native candidate hasAudio=%s without an extension", async hasAudio => {
    const sourcePath = hasAudio ? audioPath : silentPath;
    const sourceBytes = await readFile(sourcePath);
    const sourceSha256 = createHash("sha256").update(sourceBytes).digest("hex");
    const outputPath = path.join(fixtureRoot, hasAudio ? "hd_native_audio" : "hd_native_silent");
    const updates: number[] = [];
    const sourceHandle = await open(sourcePath, "r");
    try {
      const result = await renderBodyCinemaHd({ sourcePath: `/proc/${process.pid}/fd/${sourceHandle.fd}`, outputPath, recipe: recipe({ sourceSha256 }), onProgress: value => { updates.push(value); } });
      expect(result).toMatchObject({ width: 1920, height: 1080, durationSeconds: 10.5, frameRate: 24, frameCount: 252, hasAudio, gradeVersion: BODY_CINEMA_HD_GRADE_VERSION });
      expect(result.sha256).toBe(createHash("sha256").update(await readFile(outputPath)).digest("hex"));
      expect(result.sizeBytes).toBe((await lstat(outputPath)).size);
      expect(result.sizeBytes).toBeGreaterThan(0);
      expect(updates[0]).toBe(0);
      expect(updates.at(-1)).toBe(100);
      expect(updates.every((value, index) => index === 0 || value > updates[index - 1])).toBe(true);
      expect(createHash("sha256").update(await readFile(sourcePath)).digest("hex")).toBe(sourceSha256);
      expect((await sourceHandle.stat()).isFile()).toBe(true);
      const priorHash = result.sha256;
      const failedProgress: number[] = [];
      await expect(renderBodyCinemaHd({ sourcePath, outputPath, recipe: recipe({ sourceSha256 }), onProgress: value => { failedProgress.push(value); } })).rejects.toThrow(/^BODY_CINEMA_HD_/);
      expect(failedProgress).not.toContain(100);
      expect(createHash("sha256").update(await readFile(outputPath)).digest("hex")).toBe(priorHash);
    } finally { await sourceHandle.close(); }
  }, 180000);

  it("does not overwrite output symlinks or existing user files", async () => {
    const original = path.join(fixtureRoot, "user-owned-do-not-overwrite");
    const outputPath = path.join(fixtureRoot, "output-symlink");
    await writeFile(original, "user-owned data");
    await symlink(original, outputPath);
    const sourceSha256 = createHash("sha256").update(await readFile(silentPath)).digest("hex");
    await expect(renderBodyCinemaHd({ sourcePath: silentPath, outputPath, recipe: recipe({ sourceSha256 }) })).rejects.toThrow(/^BODY_CINEMA_HD_/);
    expect(await readFile(original, "utf8")).toBe("user-owned data");
    expect((await lstat(outputPath)).isSymbolicLink()).toBe(true);
  }, 60000);
});
