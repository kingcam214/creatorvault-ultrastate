import { describe, expect, it } from "vitest";
import {
  TOPAZ_PROTEUS_MODEL,
  assertTopazPrecisionOptions,
  buildTopazPrecisionRequest,
  isTopazPrecisionConfigurationAvailable,
} from "./bodyCinemaTopazPrecisionPolicy";

const source = {
  width: 720,
  height: 1280,
  durationSeconds: 23.1,
  frameRate: 30,
  frameCount: 693,
  sizeBytes: 12_000_000,
  container: "mp4" as const,
};

describe("Body Cinema Topaz precision policy", () => {
  it("builds a Proteus-only request that preserves the audio track and source timing", () => {
    const request = buildTopazPrecisionRequest(source, {
      outputWidth: 1080,
      outputHeight: 1920,
      requestedModel: TOPAZ_PROTEUS_MODEL,
      audioTransfer: "Copy",
    });

    expect(request.filters).toEqual([{ model: TOPAZ_PROTEUS_MODEL, auto: "balanced" }]);
    expect(request.output.audioTransfer).toBe("Copy");
    expect(request.output.frameRate).toBe(source.frameRate);
    expect(request.source.duration).toBe(source.durationSeconds);
  });

  it("blocks a generative or stylistic model before any provider request can be constructed", () => {
    expect(() => assertTopazPrecisionOptions({
      outputWidth: 1080,
      outputHeight: 1920,
      requestedModel: "astra-2",
      audioTransfer: "Copy",
    })).toThrow(/non-generative Topaz Proteus/);
  });

  it("blocks audio replacement and protected-source downscaling", () => {
    expect(() => buildTopazPrecisionRequest(source, {
      outputWidth: 1080,
      outputHeight: 1920,
      audioTransfer: "None",
    })).toThrow(/original audio track/);

    expect(() => buildTopazPrecisionRequest(source, {
      outputWidth: 480,
      outputHeight: 854,
      audioTransfer: "Copy",
    })).toThrow(/cannot downscale/);
  });

  it("recognises that a provider cannot be used until a real server key is configured", () => {
    expect(isTopazPrecisionConfigurationAvailable("")).toBe(false);
    expect(isTopazPrecisionConfigurationAvailable("topaz-live-key")).toBe(true);
  });
});
