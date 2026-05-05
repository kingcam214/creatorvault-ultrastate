/**
 * AutomatedDirectorComposition
 * Remotion composition for the CreatorVault Automated Director pipeline.
 * Produces cinematic, AI-enhanced exports tuned for adult creator content.
 *
 * Structure:
 *   0–1.5s   — Cinematic intro: black → source video fade-in with luxury particle overlay
 *   1.5–Ns   — Hook section: source video + AI overlay (rose gold particles) + hook text
 *   N–N+2s   — Energy pulse: high-energy AI overlay crossfade + pacing-pulse flash
 *   N+2–end  — Outro CTA: source video + gold particle overlay + CTA text + vignette
 */

import React from "react";
import {
  AbsoluteFill,
  Audio,
  Easing,
  Img,
  interpolate,
  OffthreadVideo,
  Sequence,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";

export interface AutomatedDirectorProps {
  /** Public URL or local path to the source video */
  sourceVideoUrl: string;
  /** DALL-E 3 generated hook overlay image URL */
  hookOverlayUrl: string;
  /** DALL-E 3 generated CTA overlay image URL */
  ctaOverlayUrl: string;
  /** DALL-E 3 generated energy overlay image URL (optional) */
  energyOverlayUrl?: string;
  /** Hook text displayed in the first section */
  hookText: string;
  /** CTA text displayed in the outro */
  ctaText: string;
  /** Creator name for branding */
  creatorName: string;
  /** Platform: onlyfans | tiktok | instagram | fansly */
  platform: string;
  /** Whether AI pacing (1.2x on slow scenes) was applied */
  aiPacingApplied: boolean;
  /** Number of scenes detected */
  scenesDetected: number;
}

// ─── Utility: animated gradient vignette ─────────────────────────────────────
function Vignette({ opacity }: { opacity: number }) {
  return (
    <AbsoluteFill
      style={{
        background:
          "radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,0.85) 100%)",
        opacity,
        pointerEvents: "none",
      }}
    />
  );
}

// ─── Utility: cinematic letterbox bars ───────────────────────────────────────
function LetterboxBars({ progress }: { progress: number }) {
  const barHeight = interpolate(progress, [0, 1], [0, 60]);
  return (
    <>
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: barHeight,
          background: "#000",
          zIndex: 100,
        }}
      />
      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          height: barHeight,
          background: "#000",
          zIndex: 100,
        }}
      />
    </>
  );
}

// ─── Utility: pacing-pulse flash ─────────────────────────────────────────────
function PacingPulse({ frame, triggerFrame }: { frame: number; triggerFrame: number }) {
  const elapsed = frame - triggerFrame;
  if (elapsed < 0 || elapsed > 12) return null;
  const opacity = interpolate(elapsed, [0, 3, 12], [0, 0.7, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  return (
    <AbsoluteFill
      style={{
        background: "linear-gradient(135deg, rgba(212,175,55,0.9) 0%, rgba(180,50,80,0.7) 100%)",
        opacity,
        mixBlendMode: "screen",
        pointerEvents: "none",
        zIndex: 90,
      }}
    />
  );
}

// ─── Utility: animated text with slide-up + fade ─────────────────────────────
function AnimatedText({
  text,
  frame,
  startFrame,
  fontSize = 72,
  color = "#FFFFFF",
  shadowColor = "rgba(0,0,0,0.9)",
  position = "bottom",
  accentColor = "#D4AF37",
}: {
  text: string;
  frame: number;
  startFrame: number;
  fontSize?: number;
  color?: string;
  shadowColor?: string;
  position?: "top" | "center" | "bottom";
  accentColor?: string;
}) {
  const elapsed = frame - startFrame;
  if (elapsed < 0) return null;

  const slideY = interpolate(elapsed, [0, 20], [40, 0], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const opacity = interpolate(elapsed, [0, 15], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const positionStyle: React.CSSProperties =
    position === "top"
      ? { top: 80, left: 0, right: 0 }
      : position === "center"
      ? { top: "50%", left: 0, right: 0, transform: `translateY(calc(-50% + ${slideY}px))` }
      : { bottom: 120, left: 0, right: 0 };

  return (
    <div
      style={{
        position: "absolute",
        ...positionStyle,
        transform: position !== "center" ? `translateY(${slideY}px)` : undefined,
        opacity,
        textAlign: "center",
        padding: "0 60px",
        zIndex: 200,
      }}
    >
      <div
        style={{
          fontFamily: "'Montserrat', 'Arial Black', sans-serif",
          fontWeight: 900,
          fontSize,
          color,
          textTransform: "uppercase",
          letterSpacing: "0.08em",
          lineHeight: 1.1,
          textShadow: `
            0 0 40px ${accentColor}88,
            0 4px 20px ${shadowColor},
            0 2px 4px ${shadowColor}
          `,
        }}
      >
        {text}
      </div>
    </div>
  );
}

// ─── Utility: brand badge ─────────────────────────────────────────────────────
function BrandBadge({
  creatorName,
  platform,
  frame,
  startFrame,
}: {
  creatorName: string;
  platform: string;
  frame: number;
  startFrame: number;
}) {
  const elapsed = frame - startFrame;
  if (elapsed < 0) return null;
  const opacity = interpolate(elapsed, [0, 20], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const scale = interpolate(elapsed, [0, 20], [0.8, 1], {
    easing: Easing.out(Easing.back(1.5)),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const platformColors: Record<string, string> = {
    onlyfans: "#00AFF0",
    fansly: "#1DA1F2",
    tiktok: "#FF0050",
    instagram: "#E1306C",
  };
  const brandColor = platformColors[platform?.toLowerCase()] || "#D4AF37";

  return (
    <div
      style={{
        position: "absolute",
        top: 80,
        right: 50,
        opacity,
        transform: `scale(${scale})`,
        zIndex: 200,
        display: "flex",
        alignItems: "center",
        gap: 10,
        background: "rgba(0,0,0,0.7)",
        border: `2px solid ${brandColor}`,
        borderRadius: 40,
        padding: "10px 20px",
        backdropFilter: "blur(8px)",
      }}
    >
      <div
        style={{
          width: 10,
          height: 10,
          borderRadius: "50%",
          background: brandColor,
          boxShadow: `0 0 12px ${brandColor}`,
        }}
      />
      <span
        style={{
          fontFamily: "'Montserrat', sans-serif",
          fontWeight: 700,
          fontSize: 28,
          color: "#FFFFFF",
          letterSpacing: "0.05em",
          textTransform: "uppercase",
        }}
      >
        {creatorName}
      </span>
    </div>
  );
}

// ─── Utility: AI overlay with animated opacity ────────────────────────────────
function AIOverlay({
  url,
  opacity,
  blendMode = "screen",
  scale = 1,
}: {
  url: string;
  opacity: number;
  blendMode?: React.CSSProperties["mixBlendMode"];
  scale?: number;
}) {
  if (!url || opacity <= 0) return null;
  return (
    <AbsoluteFill
      style={{
        opacity,
        mixBlendMode: blendMode,
        transform: `scale(${scale})`,
        pointerEvents: "none",
        zIndex: 50,
      }}
    >
      <Img
        src={url}
        style={{ width: "100%", height: "100%", objectFit: "cover" }}
      />
    </AbsoluteFill>
  );
}

// ─── MAIN COMPOSITION ─────────────────────────────────────────────────────────
export function AutomatedDirectorComposition({
  sourceVideoUrl,
  hookOverlayUrl,
  ctaOverlayUrl,
  energyOverlayUrl,
  hookText,
  ctaText,
  creatorName,
  platform,
  aiPacingApplied,
  scenesDetected,
}: AutomatedDirectorProps) {
  const frame = useCurrentFrame();
  const { fps, durationInFrames, width, height } = useVideoConfig();

  const totalFrames = durationInFrames;
  // Fixed section boundaries — guaranteed monotonically increasing for any clip >= 4s
  // Sections: intro(0-45) hook(45-90) energy(90-105) outro(105-end)
  const introDuration = Math.min(Math.round(fps * 1.5), Math.round(totalFrames * 0.25));
  const hookStart = introDuration;
  const hookEnd = Math.round(totalFrames * 0.60);
  const hookDuration = hookEnd - hookStart;
  const energyStart = hookEnd;
  const energyDuration = Math.min(Math.round(fps * 1.0), Math.round(totalFrames * 0.10));
  const outroStart = Math.min(energyStart + energyDuration, totalFrames - Math.round(fps * 1.0));
  const outroEnd = totalFrames;

  // ── Intro: fade from black ──────────────────────────────────────────────────
  const introFade = interpolate(frame, [0, introDuration], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // ── Hook overlay: fade in at hookStart, fade out at energyStart ─────────────
  // Safe hook overlay: simple fade in/out with guaranteed monotonic ranges
  const hookMid = Math.floor((hookStart + energyStart) / 2);
  const hookOverlayOpacity = interpolate(
    frame,
    [hookStart, hookStart + 10, hookMid, energyStart],
    [0, 0.35, 0.35, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  // ── Energy pulse overlay ────────────────────────────────────────────────────
  // Use simple 2-point fade to avoid monotonic range violations
  const energyMid = energyStart + Math.floor(energyDuration / 2);
  const energyOpacity = interpolate(
    frame,
    [energyStart, energyMid, energyStart + energyDuration],
    [0, 0.5, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  // ── CTA overlay: fade in at outroStart ─────────────────────────────────────
  // Safe CTA overlay: simple fade in
  const ctaOverlayOpacity = interpolate(
    frame,
    [outroStart, Math.min(outroStart + 20, outroEnd)],
    [0, 0.4],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  // ── Outro vignette ──────────────────────────────────────────────────────────
  const vignetteOpacity = interpolate(
    frame,
    [outroStart, outroStart + 20],
    [0, 0.6],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  // ── Letterbox: always present, fully in by frame 10 ────────────────────────
  const letterboxProgress = interpolate(frame, [0, 10], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // ── Cinematic zoom: very subtle 1.0 → 1.04 over full duration ──────────────
  const zoomScale = interpolate(frame, [0, totalFrames], [1.0, 1.04], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill style={{ background: "#000", overflow: "hidden" }}>
      {/* ── Source video layer ────────────────────────────────────────────── */}
      <AbsoluteFill
        style={{
          opacity: introFade,
          transform: `scale(${zoomScale})`,
          transformOrigin: "center center",
        }}
      >
        <OffthreadVideo
          src={sourceVideoUrl}
          style={{ width: "100%", height: "100%", objectFit: "cover" }}
          muted
        />
      </AbsoluteFill>

      {/* ── Hook AI overlay (rose gold particles) ────────────────────────── */}
      <AIOverlay
        url={hookOverlayUrl}
        opacity={hookOverlayOpacity}
        blendMode="screen"
        scale={1.05}
      />

      {/* ── Energy pulse AI overlay ───────────────────────────────────────── */}
      {energyOverlayUrl && (
        <AIOverlay
          url={energyOverlayUrl}
          opacity={energyOpacity}
          blendMode="screen"
          scale={1.1}
        />
      )}

      {/* ── CTA AI overlay (gold particles) ──────────────────────────────── */}
      <AIOverlay
        url={ctaOverlayUrl}
        opacity={ctaOverlayOpacity}
        blendMode="screen"
        scale={1.02}
      />

      {/* ── Pacing-pulse flash at energy transition ───────────────────────── */}
      {aiPacingApplied && (
        <PacingPulse frame={frame} triggerFrame={energyStart} />
      )}

      {/* ── Vignette ─────────────────────────────────────────────────────── */}
      <Vignette opacity={vignetteOpacity} />

      {/* ── Letterbox bars ───────────────────────────────────────────────── */}
      <LetterboxBars progress={letterboxProgress} />

      {/* ── Brand badge (top right) ───────────────────────────────────────── */}
      <BrandBadge
        creatorName={creatorName}
        platform={platform}
        frame={frame}
        startFrame={hookStart}
      />

      {/* ── Hook text ────────────────────────────────────────────────────── */}
      <AnimatedText
        text={hookText}
        frame={frame}
        startFrame={hookStart + 10}
        fontSize={68}
        color="#FFFFFF"
        accentColor="#D4AF37"
        position="bottom"
      />

      {/* ── CTA text ─────────────────────────────────────────────────────── */}
      <AnimatedText
        text={ctaText}
        frame={frame}
        startFrame={outroStart + 15}
        fontSize={56}
        color="#D4AF37"
        accentColor="#D4AF37"
        position="bottom"
      />

      {/* ── AI pacing badge ──────────────────────────────────────────────── */}
      {aiPacingApplied && (
        <div
          style={{
            position: "absolute",
            top: 80,
            left: 50,
            opacity: interpolate(frame, [hookStart, hookStart + 20], [0, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            }),
            zIndex: 200,
            background: "rgba(0,0,0,0.65)",
            border: "1px solid rgba(212,175,55,0.6)",
            borderRadius: 30,
            padding: "8px 18px",
            backdropFilter: "blur(6px)",
          }}
        >
          <span
            style={{
              fontFamily: "'Montserrat', sans-serif",
              fontWeight: 700,
              fontSize: 22,
              color: "#D4AF37",
              letterSpacing: "0.1em",
              textTransform: "uppercase",
            }}
          >
            AI DIRECTED · {scenesDetected} SCENES
          </span>
        </div>
      )}
    </AbsoluteFill>
  );
}
