/**
 * VisualDNAComposition — CreatorVault Remotion Visual DNA Compositions
 * Renders Visual DNA branded content in multiple formats
 */
import React from "react";
import {
  AbsoluteFill,
  useCurrentFrame,
  interpolate,
  spring,
  useVideoConfig,
} from "remotion";

export interface VisualDNAProps {
  headline: string;
  subline: string;
  tagline?: string;
  accentColor: string;
  secondaryColor?: string;
  showParticles?: boolean;
  showGrid?: boolean;
  showGodRays?: boolean;
  showScanLine?: boolean;
  mode?: "flyer" | "thumbnail" | "broll" | "title_card";
}

// Shared base component
const VisualDNABase: React.FC<VisualDNAProps & { width: number; height: number }> = ({
  headline,
  subline,
  tagline,
  accentColor,
  secondaryColor = "#D4AF37",
  showParticles = true,
  showGrid = true,
  showScanLine = true,
  width,
  height,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleOpacity = interpolate(frame, [0, 20], [0, 1], { extrapolateRight: "clamp" });
  const titleY = spring({ frame, fps, config: { damping: 12, stiffness: 100 } });
  const titleTranslateY = interpolate(titleY, [0, 1], [50, 0]);

  const subOpacity = interpolate(frame, [15, 35], [0, 1], { extrapolateRight: "clamp" });
  const scanlineY = (frame * 2.5) % height;
  const glowPulse = Math.sin(frame * 0.06) * 0.3 + 0.7;

  const fontSize = Math.min(120, (width / headline.length) * 1.6);

  return (
    <AbsoluteFill style={{ background: "#0a0a0a", overflow: "hidden" }}>
      {/* Grid */}
      {showGrid && (
        <AbsoluteFill
          style={{
            backgroundImage: `linear-gradient(${accentColor}08 1px, transparent 1px), linear-gradient(90deg, ${accentColor}08 1px, transparent 1px)`,
            backgroundSize: "80px 80px",
          }}
        />
      )}

      {/* Glow orb */}
      <div
        style={{
          position: "absolute",
          top: "20%",
          left: "50%",
          transform: "translateX(-50%)",
          width: Math.min(width * 0.6, 600),
          height: Math.min(width * 0.6, 600),
          borderRadius: "50%",
          background: `radial-gradient(circle, ${accentColor}${Math.round(glowPulse * 35).toString(16).padStart(2, "0")} 0%, transparent 70%)`,
          filter: "blur(60px)",
        }}
      />

      {/* Scanline */}
      {showScanLine && (
        <div
          style={{
            position: "absolute",
            top: scanlineY,
            left: 0,
            right: 0,
            height: 2,
            background: `linear-gradient(90deg, transparent, ${accentColor}25, transparent)`,
          }}
        />
      )}

      {/* Content */}
      <AbsoluteFill
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "60px",
        }}
      >
        <div
          style={{
            opacity: subOpacity,
            fontSize: Math.min(28, width / 30),
            fontWeight: 600,
            color: accentColor,
            letterSpacing: "0.3em",
            textTransform: "uppercase",
            marginBottom: 20,
            fontFamily: "sans-serif",
          }}
        >
          {subline}
        </div>

        <div
          style={{
            opacity: titleOpacity,
            transform: `translateY(${titleTranslateY}px)`,
            fontSize,
            fontWeight: 900,
            color: "#FFFFFF",
            letterSpacing: "0.05em",
            textTransform: "uppercase",
            textAlign: "center",
            lineHeight: 1,
            fontFamily: "sans-serif",
            textShadow: `0 0 40px ${accentColor}80`,
            marginBottom: 24,
          }}
        >
          {headline}
        </div>

        {tagline && (
          <div
            style={{
              opacity: subOpacity,
              fontSize: Math.min(22, width / 40),
              color: "rgba(255,255,255,0.6)",
              textAlign: "center",
              letterSpacing: "0.15em",
              fontFamily: "sans-serif",
            }}
          >
            {tagline}
          </div>
        )}

        {/* Accent bar */}
        <div
          style={{
            marginTop: 32,
            width: "50%",
            height: 3,
            background: `linear-gradient(90deg, transparent, ${accentColor}, ${secondaryColor}, transparent)`,
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
            width: 36,
            height: 36,
            borderTop: i < 2 ? `2px solid ${accentColor}50` : "none",
            borderBottom: i >= 2 ? `2px solid ${accentColor}50` : "none",
            borderLeft: i % 2 === 0 ? `2px solid ${accentColor}50` : "none",
            borderRight: i % 2 === 1 ? `2px solid ${accentColor}50` : "none",
          }}
        />
      ))}
    </AbsoluteFill>
  );
};

export const VisualDNAPortrait: React.FC<VisualDNAProps> = (props) => (
  <VisualDNABase {...props} width={1080} height={1920} />
);

export const VisualDNALandscape: React.FC<VisualDNAProps> = (props) => (
  <VisualDNABase {...props} width={1920} height={1080} />
);

export const VisualDNAThumbnail: React.FC<VisualDNAProps> = (props) => (
  <VisualDNABase {...props} width={1280} height={720} />
);

export const VisualDNABroll: React.FC<VisualDNAProps> = (props) => (
  <VisualDNABase {...props} width={1920} height={1080} />
);

export const VisualDNATitleCard: React.FC<VisualDNAProps> = (props) => (
  <VisualDNABase {...props} width={1920} height={1080} />
);
