import React from "react";
import {
  AbsoluteFill,
  Video,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import type { RenderContract } from "../types";

function normalizeColor(value: string, fallback: string): string {
  const trimmed = String(value || "").trim();
  if (!trimmed) return fallback;
  return trimmed.startsWith("#") ? trimmed : `#${trimmed}`;
}

/**
 * Motion Flyer Composition
 *
 * This is intentionally motion-first: it keeps the real selected moving source
 * on screen and uses typography to direct attention rather than covering it
 * with generated grids, fake interfaces, or static decoration.
 */
export const MotionFlyerComposition: React.FC<RenderContract> = ({
  artistName = "CreatorVault",
  songTitle = "The Moment",
  subtitle = "Make it impossible to ignore.",
  callToAction = "Enter the vault",
  accentColor = "D4AF37",
  textColor = "FFFFFF",
  backgroundVideoUrl = "",
}) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const accent = normalizeColor(accentColor, "#D4AF37");
  const text = normalizeColor(textColor, "#FFFFFF");

  const topIn = spring({ frame: Math.max(0, frame - 4), fps, config: { damping: 18, stiffness: 135 } });
  const titleIn = spring({ frame: Math.max(0, frame - 13), fps, config: { damping: 17, stiffness: 105 } });
  const bodyIn = spring({ frame: Math.max(0, frame - 30), fps, config: { damping: 18, stiffness: 110 } });
  const exit = interpolate(frame, [Math.max(0, Math.round(fps * 5.2)), Math.round(fps * 5.85)], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const headlineSize = Math.min(width * 0.148, 154);

  return (
    <AbsoluteFill style={{ backgroundColor: "#080706", overflow: "hidden" }}>
      {backgroundVideoUrl ? (
        <Video
          src={backgroundVideoUrl}
          muted
          style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "center center" }}
        />
      ) : null}

      <AbsoluteFill style={{ background: "linear-gradient(180deg, rgba(8,7,6,.84) 0%, rgba(8,7,6,.15) 28%, rgba(8,7,6,.22) 56%, rgba(8,7,6,.92) 100%)" }} />
      <AbsoluteFill style={{ background: "linear-gradient(90deg, rgba(8,7,6,.72) 0%, transparent 57%, rgba(8,7,6,.18) 100%)" }} />

      <div style={{ position: "absolute", top: height * 0.075, left: width * 0.07, right: width * 0.07, opacity: topIn * (1 - exit), transform: `translateY(${interpolate(topIn, [0, 1], [-36, 0])}px)` }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div style={{ height: 2, width: 56, backgroundColor: accent }} />
          <div style={{ color: accent, fontFamily: "Montserrat, Arial, sans-serif", fontSize: Math.min(width * 0.026, 29), fontWeight: 800, letterSpacing: "0.24em", textTransform: "uppercase" }}>{artistName}</div>
        </div>
      </div>

      <div style={{ position: "absolute", left: width * 0.07, right: width * 0.07, bottom: height * 0.105, opacity: titleIn * (1 - exit), transform: `translateY(${interpolate(titleIn, [0, 1], [72, 0])}px)` }}>
        <div style={{ color: text, fontFamily: "Montserrat, Arial, sans-serif", fontSize: headlineSize, fontWeight: 900, lineHeight: 0.82, letterSpacing: "-0.075em", textTransform: "uppercase", maxWidth: width * 0.86, textShadow: "0 8px 32px rgba(0,0,0,.48)" }}>{songTitle}</div>
        <div style={{ width: 76, height: 3, marginTop: 38, backgroundColor: accent, opacity: bodyIn }} />
        <div style={{ marginTop: 28, maxWidth: width * 0.75, color: text, fontFamily: "Montserrat, Arial, sans-serif", fontSize: Math.min(width * 0.039, 42), fontWeight: 600, letterSpacing: "-0.018em", lineHeight: 1.16, opacity: bodyIn }}>{subtitle}</div>
        <div style={{ marginTop: 42, display: "inline-flex", alignItems: "center", border: `1px solid ${accent}`, color: accent, fontFamily: "Montserrat, Arial, sans-serif", fontSize: Math.min(width * 0.025, 28), fontWeight: 800, letterSpacing: "0.12em", padding: "19px 24px", textTransform: "uppercase", opacity: bodyIn }}>{callToAction}</div>
      </div>
    </AbsoluteFill>
  );
};
