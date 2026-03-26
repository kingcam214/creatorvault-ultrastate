/**
 * EpisodeTrailerComposition
 * ============================================================================
 * Remotion composition for KingCam 3D Episode Trailers.
 * Generates a 15-second cinematic trailer for any episode with:
 *   - Animated title card with episode name
 *   - Playlist badge (neon glow)
 *   - Stats bar (views, revenue, glow score)
 *   - Animated CTA button
 *   - Visual DNA aesthetic (dark, neon cyan/gold, particles)
 *
 * Composition ID: "EpisodeTrailer"
 * Dimensions: 1080x1920 (9:16 portrait — TikTok/Reels/Stories)
 * Duration: 15 seconds at 30fps = 450 frames
 * ============================================================================
 */
import React from "react";
import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
  Sequence,
} from "remotion";

// ─── VISUAL DNA CONSTANTS ─────────────────────────────────────────────────────
const DNA = {
  BG_DEEP:   "#0A0A0A",
  BG_MID:    "#111111",
  CYAN:      "#00D9FF",
  GOLD:      "#D4AF37",
  WHITE:     "#FFFFFF",
  GRAY:      "#888888",
  FONT_HEAD: "Montserrat, Impact, Arial Black, sans-serif",
  FONT_BODY: "Montserrat, Arial, sans-serif",
} as const;

// ─── PROPS ────────────────────────────────────────────────────────────────────
export interface EpisodeTrailerProps {
  episodeId: string;
  title: string;
  playlistLabel: string;
  thumbnailEmoji: string;
  ctaLabel: string;
  views: number;
  estimatedRevenue: number;
  glowScore: number;
  accentColor?: string;   // hex with #
  duration?: string;
}

// ─── PARTICLE FIELD ───────────────────────────────────────────────────────────
const ParticleField: React.FC<{ color: string }> = ({ color }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  const particles = React.useMemo(() =>
    Array.from({ length: 60 }, (_, i) => {
      const seed = (i * 7919 + 1337) % 10000;
      return {
        x: seed % 100,
        y: (seed * 3) % 100,
        size: 1.5 + (seed % 3),
        speed: 0.2 + (seed % 10) / 25,
        phase: (seed % 628) / 100,
        opacity: 0.2 + (seed % 6) / 10,
      };
    }), []);
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      {particles.map((p, i) => {
        const yPos = ((p.y - p.speed * t * 12) % 100 + 100) % 100;
        const xPos = (p.x + Math.sin(t * p.speed + p.phase) * 2) % 100;
        const pulse = 0.5 + Math.sin(t * 2 + p.phase) * 0.5;
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: `${xPos}%`,
              top: `${yPos}%`,
              width: p.size,
              height: p.size,
              borderRadius: "50%",
              backgroundColor: color,
              opacity: p.opacity * pulse,
              filter: `blur(${p.size * 0.3}px)`,
              transform: "translate(-50%, -50%)",
            }}
          />
        );
      })}
    </AbsoluteFill>
  );
};

// ─── NEON GRID ────────────────────────────────────────────────────────────────
const NeonGrid: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  const pulse = 0.6 + Math.sin(t * 1.5) * 0.4;
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      <svg width="100%" height="100%" style={{ position: "absolute", inset: 0 }}>
        <defs>
          <pattern id="epgrid" width="80" height="80" patternUnits="userSpaceOnUse">
            <path d="M 80 0 L 0 0 0 80" fill="none" stroke={DNA.CYAN} strokeWidth="0.4" opacity={0.07 * pulse} />
          </pattern>
          <linearGradient id="epGridFade" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="black" stopOpacity="1" />
            <stop offset="30%" stopColor="black" stopOpacity="0" />
            <stop offset="70%" stopColor="black" stopOpacity="0" />
            <stop offset="100%" stopColor="black" stopOpacity="1" />
          </linearGradient>
        </defs>
        <rect width="100%" height="100%" fill="url(#epgrid)" />
        <rect width="100%" height="100%" fill="url(#epGridFade)" />
      </svg>
    </AbsoluteFill>
  );
};

// ─── SCAN LINE ────────────────────────────────────────────────────────────────
const ScanLine: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, height } = useVideoConfig();
  const t = frame / fps;
  const y = ((t * 0.3) % 1) * height;
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      <div style={{
        position: "absolute",
        left: 0,
        top: y,
        width: "100%",
        height: 2,
        background: `linear-gradient(90deg, transparent, ${DNA.CYAN}44, transparent)`,
        opacity: 0.4,
      }} />
    </AbsoluteFill>
  );
};

// ─── GLOW BAR ─────────────────────────────────────────────────────────────────
const GlowBar: React.FC<{ score: number; color: string; frame: number; fps: number }> = ({ score, color, frame, fps }) => {
  const t = frame / fps;
  const progress = interpolate(t, [0, 1.5], [0, score], { extrapolateRight: "clamp" });
  return (
    <div style={{ width: "100%", height: 6, background: "#1a1a1a", borderRadius: 3, overflow: "hidden" }}>
      <div style={{
        width: `${progress * 100}%`,
        height: "100%",
        background: `linear-gradient(90deg, ${color}88, ${color})`,
        borderRadius: 3,
        boxShadow: `0 0 8px ${color}`,
        transition: "width 0.1s",
      }} />
    </div>
  );
};

// ─── MAIN COMPOSITION ─────────────────────────────────────────────────────────
export const EpisodeTrailerComposition: React.FC<EpisodeTrailerProps> = ({
  title,
  playlistLabel,
  thumbnailEmoji,
  ctaLabel,
  views,
  estimatedRevenue,
  glowScore,
  accentColor = DNA.CYAN,
  duration = "0:00",
}) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const t = frame / fps;

  // ── Spring animations ──
  const emojiScale = spring({ frame, fps, config: { damping: 12, stiffness: 80 }, from: 0, to: 1 });
  const titleOpacity = interpolate(t, [0.3, 1.0], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const titleY = interpolate(t, [0.3, 1.0], [40, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const badgeOpacity = interpolate(t, [0.8, 1.4], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const statsOpacity = interpolate(t, [1.2, 1.8], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const ctaScale = spring({ frame: Math.max(0, frame - Math.round(fps * 2.5)), fps, config: { damping: 10, stiffness: 100 }, from: 0, to: 1 });

  // ── Pulse for glow effects ──
  const pulse = 0.7 + Math.sin(t * 2.5) * 0.3;

  // ── Revenue display ──
  const revenueStr = estimatedRevenue > 0
    ? `$${estimatedRevenue >= 1000 ? (estimatedRevenue / 1000).toFixed(1) + "K" : estimatedRevenue.toFixed(0)}`
    : "—";

  // ── Views display ──
  const viewsStr = views >= 1000 ? `${(views / 1000).toFixed(1)}K` : String(views);

  return (
    <AbsoluteFill style={{ backgroundColor: DNA.BG_DEEP, overflow: "hidden", fontFamily: DNA.FONT_BODY }}>
      {/* Background layers */}
      <NeonGrid />
      <ParticleField color={accentColor} />
      <ScanLine />

      {/* Radial glow behind emoji */}
      <div style={{
        position: "absolute",
        top: "22%",
        left: "50%",
        transform: "translate(-50%, -50%)",
        width: 320,
        height: 320,
        borderRadius: "50%",
        background: `radial-gradient(circle, ${accentColor}22 0%, transparent 70%)`,
        opacity: pulse,
      }} />

      {/* Emoji */}
      <div style={{
        position: "absolute",
        top: "18%",
        left: "50%",
        transform: `translate(-50%, -50%) scale(${emojiScale})`,
        fontSize: 110,
        lineHeight: 1,
        filter: `drop-shadow(0 0 30px ${accentColor}88)`,
      }}>
        {thumbnailEmoji}
      </div>

      {/* Playlist badge */}
      <div style={{
        position: "absolute",
        top: "30%",
        left: "50%",
        transform: "translateX(-50%)",
        opacity: badgeOpacity,
        display: "flex",
        alignItems: "center",
        gap: 8,
      }}>
        <div style={{
          padding: "6px 18px",
          borderRadius: 20,
          border: `1px solid ${accentColor}66`,
          background: `${accentColor}11`,
          color: accentColor,
          fontSize: 22,
          fontWeight: 700,
          letterSpacing: 1,
          fontFamily: DNA.FONT_HEAD,
          textTransform: "uppercase",
          boxShadow: `0 0 12px ${accentColor}44`,
        }}>
          {playlistLabel}
        </div>
      </div>

      {/* Episode title */}
      <div style={{
        position: "absolute",
        top: "37%",
        left: "50%",
        transform: `translateX(-50%) translateY(${titleY}px)`,
        opacity: titleOpacity,
        width: "85%",
        textAlign: "center",
      }}>
        <div style={{
          fontSize: 62,
          fontWeight: 900,
          fontFamily: DNA.FONT_HEAD,
          color: DNA.WHITE,
          lineHeight: 1.1,
          textTransform: "uppercase",
          letterSpacing: 1,
          textShadow: `0 0 30px ${accentColor}88, 0 2px 4px rgba(0,0,0,0.8)`,
        }}>
          {title}
        </div>
        <div style={{
          marginTop: 12,
          fontSize: 28,
          color: DNA.GRAY,
          fontWeight: 500,
          letterSpacing: 2,
        }}>
          {duration}
        </div>
      </div>

      {/* Divider line */}
      <div style={{
        position: "absolute",
        top: "56%",
        left: "10%",
        width: "80%",
        height: 1,
        background: `linear-gradient(90deg, transparent, ${accentColor}66, transparent)`,
        opacity: statsOpacity,
      }} />

      {/* Stats */}
      <div style={{
        position: "absolute",
        top: "58%",
        left: "10%",
        width: "80%",
        opacity: statsOpacity,
      }}>
        {/* Views + Revenue row */}
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 24 }}>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 42, fontWeight: 900, color: DNA.WHITE, fontFamily: DNA.FONT_HEAD }}>{viewsStr}</div>
            <div style={{ fontSize: 20, color: DNA.GRAY, letterSpacing: 2, textTransform: "uppercase" }}>VIEWS</div>
          </div>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 42, fontWeight: 900, color: DNA.GOLD, fontFamily: DNA.FONT_HEAD }}>{revenueStr}</div>
            <div style={{ fontSize: 20, color: DNA.GRAY, letterSpacing: 2, textTransform: "uppercase" }}>REVENUE</div>
          </div>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 42, fontWeight: 900, color: accentColor, fontFamily: DNA.FONT_HEAD }}>
              {Math.round(glowScore * 100)}
            </div>
            <div style={{ fontSize: 20, color: DNA.GRAY, letterSpacing: 2, textTransform: "uppercase" }}>GLOW</div>
          </div>
        </div>

        {/* Glow score bar */}
        <div style={{ marginBottom: 8 }}>
          <div style={{ fontSize: 18, color: DNA.GRAY, marginBottom: 6, letterSpacing: 1, textTransform: "uppercase" }}>
            GLOW SCORE
          </div>
          <GlowBar score={glowScore} color={accentColor} frame={frame} fps={fps} />
        </div>
      </div>

      {/* CTA button */}
      <div style={{
        position: "absolute",
        bottom: "12%",
        left: "50%",
        transform: `translateX(-50%) scale(${ctaScale})`,
      }}>
        <div style={{
          padding: "22px 60px",
          borderRadius: 50,
          background: `linear-gradient(135deg, ${accentColor}, ${accentColor}cc)`,
          color: DNA.BG_DEEP,
          fontSize: 32,
          fontWeight: 900,
          fontFamily: DNA.FONT_HEAD,
          letterSpacing: 2,
          textTransform: "uppercase",
          boxShadow: `0 0 30px ${accentColor}88, 0 4px 20px rgba(0,0,0,0.5)`,
          whiteSpace: "nowrap",
        }}>
          {ctaLabel}
        </div>
      </div>

      {/* CreatorVault watermark */}
      <div style={{
        position: "absolute",
        bottom: "5%",
        left: "50%",
        transform: "translateX(-50%)",
        fontSize: 20,
        color: `${DNA.GRAY}88`,
        letterSpacing: 4,
        textTransform: "uppercase",
        fontFamily: DNA.FONT_HEAD,
      }}>
        CREATORVAULT
      </div>
    </AbsoluteFill>
  );
};
