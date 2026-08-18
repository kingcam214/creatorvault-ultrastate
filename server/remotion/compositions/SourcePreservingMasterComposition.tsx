import React from "react";
import { AbsoluteFill, OffthreadVideo } from "remotion";

export type SourcePreservingMasterProps = {
  /** Creator-owned, approved video URL already held by CreatorVault. */
  sourceVideoUrl: string;
  /** Preserve the source track by default; silence is an explicit opt-out only. */
  preserveSourceAudio?: boolean;
  /** Keep the whole source frame visible; never crop or reframe source media. */
  backgroundColor?: string;
};

/**
 * CreatorVault Source-Preserving Master
 *
 * This composition is deliberately narrow. It assembles a real CreatorVault
 * source into a durable MP4 without changing the source performance, visual
 * treatment, framing, pace, body, identity, props, or environment.
 *
 * It is not an AI generator, a color grader, a caption compositor, or a
 * substitute for a generated full-body clone lane.
 */
export function SourcePreservingMasterComposition({
  sourceVideoUrl,
  preserveSourceAudio = true,
  backgroundColor = "#000000",
}: SourcePreservingMasterProps) {
  if (!sourceVideoUrl) {
    throw new Error("CreatorVault Source-Preserving Master requires an approved source video.");
  }

  return (
    <AbsoluteFill style={{ backgroundColor, overflow: "hidden" }}>
      <OffthreadVideo
        src={sourceVideoUrl}
        muted={!preserveSourceAudio}
        style={{
          width: "100%",
          height: "100%",
          objectFit: "contain",
          objectPosition: "center center",
        }}
      />
    </AbsoluteFill>
  );
}
