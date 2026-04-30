/**
 * MotionFlyerComposition — CreatorVault Remotion Composition
 * Renders animated flyers, album covers, and visual content
 */
import React from "react";
import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
} from "remotion";
import type { RenderContract } from "../types";

export const MotionFlyerComposition: React.FC<RenderContract> = ({
  artistName = "CreatorVault",
  songTitle = "Empire",
  subtitle = "Built by a creator, for creators.",
  accentColor = "00D9FF",
  textColor = "FFFFFF",
  baseImageUrl,
  motionPreset = "neon_pulse",
  premiumMode = false,
  cinematicMode = false,
  width = 1080,
  height = 1920,
}) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  // Entrance animation
  const titleOpacity = interpolate(frame, [0, 20], [0, 1], { extrapolateRight: "clamp" });
  const titleY = spring({ frame, fps, config: { damping: 12, stiffness: 100 } });
  const titleTranslateY = interpolate(titleY, [0, 1], [60, 0]);

  const subtitleOpacity = interpolate(frame, [15, 35], [0, 1], { extrapolateRight: "clamp" });
  const subtitleY = spring({ frame: Math.max(0, frame - 15), fps, config: { damping: 12, stiffness: 80 } });
  const subtitleTranslateY = interpolate(subtitleY, [0, 1], [40, 0]);

  // Pulse glow effect
  const glowPulse = Math.sin(frame * 0.08) * 0.3 + 0.7;

  // Scanline effect (premium)
  const scanlineY = (frame * 3) % height;

  const accent = `#${accentColor}`;
  const text = `#${textColor}`;

  return (
    <AbsoluteFill
      style={{
        background: cinematicMode
          ? `radial-gradient(ellipse at center, #0d0d0d 0%, #000000 100%)`
          : `linear-gradient(135deg, #0a0a0a 0%, #111111 50%, #0a0a0a 100%)`,
        overflow: "hidden",
      }}
    >
      {/* Base image layer */}
      {baseImageUrl && (
        <AbsoluteFill>
          <img
            src={baseImageUrl}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              opacity: 0.35,
            }}
          />
        </AbsoluteFill>
      )}

      {/* Gradient overlay */}
      <AbsoluteFill
        style={{
          background: `linear-gradient(to top, rgba(0,0,0,0.95) 0%, rgba(0,0,0,0.4) 50%, rgba(0,0,0,0.7) 100%)`,
        }}
      />

      {/* Accent glow orb */}
      <div
        style={{
          position: "absolute",
          top: "15%",
          left: "50%",
          transform: "translateX(-50%)",
          width: 400,
          height: 400,
          borderRadius: "50%",
          background: `radial-gradient(circle, ${accent}${Math.round(glowPulse * 40).toString(16).padStart(2, "0")} 0%, transparent 70%)`,
          filter: `blur(${premiumMode ? 60 : 40}px)`,
        }}
      />

      {/* Scanline effect */}
      {premiumMode && (
        <div
          style={{
            position: "absolute",
            top: scanlineY,
            left: 0,
            right: 0,
            height: 2,
            background: `linear-gradient(90deg, transparent, ${accent}30, transparent)`,
            pointerEvents: "none",
          }}
        />
      )}

      {/* Grid lines */}
      <AbsoluteFill
        style={{
          backgroundImage: `linear-gradient(${accent}08 1px, transparent 1px), linear-gradient(90deg, ${accent}08 1px, transparent 1px)`,
          backgroundSize: "80px 80px",
        }}
      />

      {/* Content */}
      <AbsoluteFill
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "flex-end",
          padding: "80px 60px",
        }}
      >
        {/* Artist name */}
        <div
          style={{
            opacity: subtitleOpacity,
            transform: `translateY(${subtitleTranslateY}px)`,
            fontSize: 28,
            fontWeight: 600,
            color: accent,
            letterSpacing: "0.3em",
            textTransform: "uppercase",
            marginBottom: 16,
            fontFamily: "sans-serif",
          }}
        >
          {artistName}
        </div>

        {/* Song title */}
        <div
          style={{
            opacity: titleOpacity,
            transform: `translateY(${titleTranslateY}px)`,
            fontSize: Math.min(120, 1080 / songTitle.length * 1.8),
            fontWeight: 900,
            color: text,
            letterSpacing: "0.05em",
            textTransform: "uppercase",
            textAlign: "center",
            lineHeight: 1,
            marginBottom: 24,
            fontFamily: "sans-serif",
            textShadow: `0 0 40px ${accent}80`,
          }}
        >
          {songTitle}
        </div>

        {/* Subtitle */}
        <div
          style={{
            opacity: subtitleOpacity,
            fontSize: 22,
            color: `${text}99`,
            textAlign: "center",
            letterSpacing: "0.15em",
            fontFamily: "sans-serif",
            marginBottom: 40,
          }}
        >
          {subtitle}
        </div>

        {/* Bottom accent bar */}
        <div
          style={{
            width: "60%",
            height: 3,
            background: `linear-gradient(90deg, transparent, ${accent}, transparent)`,
            opacity: glowPulse,
          }}
        />
      </AbsoluteFill>

      {/* Corner accents */}
      {[
        { top: 40, left: 40 },
        { top: 40, right: 40 },
        { bottom: 40, left: 40 },
        { bottom: 40, right: 40 },
      ].map((pos, i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            ...pos,
            width: 40,
            height: 40,
            borderTop: i < 2 ? `2px solid ${accent}60` : "none",
            borderBottom: i >= 2 ? `2px solid ${accent}60` : "none",
            borderLeft: i % 2 === 0 ? `2px solid ${accent}60` : "none",
            borderRight: i % 2 === 1 ? `2px solid ${accent}60` : "none",
          }}
        />
      ))}
    </AbsoluteFill>
  );
};
