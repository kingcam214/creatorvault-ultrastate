/**
 * EmpireMapSnapshotComposition
 * ============================================================================
 * Remotion composition for KingCam Mapa 3D del Imperio snapshots.
 * Generates a 12-second animated video showing the empire node graph:
 *   - KingCam center node (gold, pulsing)
 *   - Creator nodes (ring 1) with power scores
 *   - System nodes (ring 2) with labels
 *   - Animated connection lines
 *   - Live stats (total nodes, total revenue, total jobs)
 *   - Visual DNA aesthetic
 *
 * Composition ID: "EmpireMapSnapshot"
 * Dimensions: 1920x1080 (16:9 landscape — YouTube/Hollywood)
 * Duration: 12 seconds at 30fps = 360 frames
 * ============================================================================
 */
import React from "react";
import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
} from "remotion";

// ─── VISUAL DNA CONSTANTS ─────────────────────────────────────────────────────
const DNA = {
  BG_DEEP:   "#0A0A0A",
  CYAN:      "#00D9FF",
  GOLD:      "#D4AF37",
  PURPLE:    "#a78bfa",
  GREEN:     "#4ade80",
  ORANGE:    "#fb923c",
  PINK:      "#f472b6",
  WHITE:     "#FFFFFF",
  GRAY:      "#888888",
  FONT_HEAD: "Montserrat, Impact, Arial Black, sans-serif",
  FONT_BODY: "Montserrat, Arial, sans-serif",
} as const;

// ─── PROPS ────────────────────────────────────────────────────────────────────
export interface EmpireNodeData {
  id: string | number;
  name: string;
  emoji: string;
  type: "creator" | "system";
  ring: number;
  color: string;
  powerScore: number;
  metric: string;
}

export interface EmpireMapSnapshotProps {
  kingName?: string;
  creatorNodes: EmpireNodeData[];
  systemNodes: EmpireNodeData[];
  totalRevenue?: number;
  totalJobs?: number;
  accentColor?: string;
}

// ─── PARTICLE FIELD ───────────────────────────────────────────────────────────
const ParticleField: React.FC<{ color: string }> = ({ color }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  const particles = React.useMemo(() =>
    Array.from({ length: 50 }, (_, i) => {
      const seed = (i * 6271 + 2337) % 10000;
      return { x: seed % 100, y: (seed * 3) % 100, size: 1 + (seed % 2), speed: 0.15 + (seed % 8) / 30, phase: (seed % 628) / 100, opacity: 0.15 + (seed % 5) / 10 };
    }), []);
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      {particles.map((p, i) => {
        const yPos = ((p.y - p.speed * t * 10) % 100 + 100) % 100;
        const xPos = (p.x + Math.sin(t * p.speed + p.phase) * 1.5) % 100;
        const pulse = 0.5 + Math.sin(t * 2 + p.phase) * 0.5;
        return (
          <div key={i} style={{ position: "absolute", left: `${xPos}%`, top: `${yPos}%`, width: p.size, height: p.size, borderRadius: "50%", backgroundColor: color, opacity: p.opacity * pulse, filter: `blur(${p.size * 0.3}px)`, transform: "translate(-50%, -50%)" }} />
        );
      })}
    </AbsoluteFill>
  );
};

// ─── NODE COMPONENT ───────────────────────────────────────────────────────────
const EmpireNode: React.FC<{
  node: EmpireNodeData;
  cx: number;
  cy: number;
  radius: number;
  frame: number;
  fps: number;
  delayFrames: number;
}> = ({ node, cx, cy, radius, frame, fps, delayFrames }) => {
  const t = (frame - delayFrames) / fps;
  const scale = spring({ frame: Math.max(0, frame - delayFrames), fps, config: { damping: 12, stiffness: 80 }, from: 0, to: 1 });
  const pulse = 0.85 + Math.sin((frame / fps) * 2.5 + delayFrames * 0.1) * 0.15;
  const isKing = node.ring === 0;
  const glowColor = node.color || DNA.CYAN;

  return (
    <g transform={`translate(${cx}, ${cy}) scale(${scale})`}>
      {/* Outer glow ring */}
      <circle
        r={radius * 1.5}
        fill="none"
        stroke={glowColor}
        strokeWidth={1}
        opacity={0.2 * pulse}
      />
      {/* Main circle */}
      <circle
        r={radius}
        fill={`${glowColor}22`}
        stroke={glowColor}
        strokeWidth={isKing ? 3 : 1.5}
        opacity={0.9}
        filter={`drop-shadow(0 0 ${radius * 0.5}px ${glowColor})`}
      />
      {/* Emoji */}
      <text
        textAnchor="middle"
        dominantBaseline="central"
        fontSize={radius * 0.9}
        style={{ fontFamily: DNA.FONT_BODY }}
      >
        {node.emoji}
      </text>
      {/* Name label */}
      <text
        y={radius + 20}
        textAnchor="middle"
        dominantBaseline="hanging"
        fontSize={isKing ? 16 : 12}
        fontWeight={isKing ? 900 : 600}
        fill={DNA.WHITE}
        style={{ fontFamily: DNA.FONT_HEAD, textTransform: "uppercase" }}
      >
        {node.name}
      </text>
      {/* Metric label */}
      {t > 1 && (
        <text
          y={radius + 38}
          textAnchor="middle"
          dominantBaseline="hanging"
          fontSize={10}
          fill={glowColor}
          opacity={interpolate(t, [1, 1.5], [0, 1], { extrapolateRight: "clamp" })}
          style={{ fontFamily: DNA.FONT_BODY }}
        >
          {node.metric}
        </text>
      )}
    </g>
  );
};

// ─── CONNECTION LINE ──────────────────────────────────────────────────────────
const ConnectionLine: React.FC<{
  x1: number; y1: number; x2: number; y2: number;
  color: string; frame: number; delayFrames: number;
}> = ({ x1, y1, x2, y2, color, frame, delayFrames }) => {
  const progress = interpolate(frame - delayFrames, [0, 30], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const dx = x2 - x1;
  const dy = y2 - y1;
  return (
    <line
      x1={x1}
      y1={y1}
      x2={x1 + dx * progress}
      y2={y1 + dy * progress}
      stroke={color}
      strokeWidth={0.8}
      opacity={0.3}
      strokeDasharray="4 4"
    />
  );
};

// ─── MAIN COMPOSITION ─────────────────────────────────────────────────────────
export const EmpireMapSnapshotComposition: React.FC<EmpireMapSnapshotProps> = ({
  kingName = "KingCam",
  creatorNodes = [],
  systemNodes = [],
  totalRevenue = 0,
  totalJobs = 0,
  accentColor = DNA.CYAN,
}) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const t = frame / fps;

  // ── Layout: center of canvas ──
  const cx = width / 2;
  const cy = height / 2;
  const ring1Radius = Math.min(width, height) * 0.28;
  const ring2Radius = Math.min(width, height) * 0.44;

  // ── King node ──
  const kingNode: EmpireNodeData = {
    id: 0, name: kingName, emoji: "👑", type: "creator", ring: 0,
    color: DNA.GOLD, powerScore: 100, metric: "The King",
  };

  // ── Position ring 1 (creators) ──
  const ring1Nodes = creatorNodes.filter(n => n.ring === 1).slice(0, 6);
  const ring1Positions = ring1Nodes.map((_, i) => {
    const angle = (i / ring1Nodes.length) * Math.PI * 2 - Math.PI / 2;
    return { x: cx + Math.cos(angle) * ring1Radius, y: cy + Math.sin(angle) * ring1Radius };
  });

  // ── Position ring 2 (systems) ──
  const ring2Nodes = systemNodes.slice(0, 8);
  const ring2Positions = ring2Nodes.map((_, i) => {
    const angle = (i / ring2Nodes.length) * Math.PI * 2 - Math.PI / 2 + (Math.PI / ring2Nodes.length);
    return { x: cx + Math.cos(angle) * ring2Radius, y: cy + Math.sin(angle) * ring2Radius };
  });

  // ── Animations ──
  const headerOpacity = interpolate(t, [0, 0.5], [0, 1], { extrapolateRight: "clamp" });
  const statsOpacity = interpolate(t, [2, 3], [0, 1], { extrapolateRight: "clamp" });
  const pulse = 0.8 + Math.sin(t * 1.8) * 0.2;

  // ── Revenue display ──
  const revenueStr = totalRevenue >= 1000
    ? `$${(totalRevenue / 1000).toFixed(1)}K`
    : `$${totalRevenue.toFixed(0)}`;

  return (
    <AbsoluteFill style={{ backgroundColor: DNA.BG_DEEP, overflow: "hidden", fontFamily: DNA.FONT_BODY }}>
      <ParticleField color={accentColor} />

      {/* Header */}
      <div style={{
        position: "absolute",
        top: 40,
        left: 60,
        opacity: headerOpacity,
      }}>
        <div style={{
          fontSize: 48,
          fontWeight: 900,
          color: DNA.WHITE,
          fontFamily: DNA.FONT_HEAD,
          letterSpacing: 3,
          textTransform: "uppercase",
          textShadow: `0 0 20px ${accentColor}88`,
        }}>
          MAPA DEL IMPERIO
        </div>
        <div style={{ fontSize: 20, color: DNA.GRAY, letterSpacing: 4, textTransform: "uppercase", marginTop: 4 }}>
          CREATORVAULT · LIVE EMPIRE SNAPSHOT
        </div>
      </div>

      {/* SVG canvas for nodes and connections */}
      <svg
        width={width}
        height={height}
        style={{ position: "absolute", inset: 0 }}
        viewBox={`0 0 ${width} ${height}`}
      >
        {/* Ring 2 connection lines (systems → king) */}
        {ring2Positions.map((pos, i) => (
          <ConnectionLine
            key={`r2line-${i}`}
            x1={cx} y1={cy}
            x2={pos.x} y2={pos.y}
            color={ring2Nodes[i]?.color || DNA.CYAN}
            frame={frame}
            delayFrames={Math.round(fps * 0.8) + i * 4}
          />
        ))}

        {/* Ring 1 connection lines (creators → king) */}
        {ring1Positions.map((pos, i) => (
          <ConnectionLine
            key={`r1line-${i}`}
            x1={cx} y1={cy}
            x2={pos.x} y2={pos.y}
            color={ring1Nodes[i]?.color || DNA.PURPLE}
            frame={frame}
            delayFrames={Math.round(fps * 0.5) + i * 5}
          />
        ))}

        {/* Outer orbit ring 2 */}
        <circle
          cx={cx} cy={cy} r={ring2Radius}
          fill="none"
          stroke={`${DNA.CYAN}18`}
          strokeWidth={1}
          strokeDasharray="6 6"
        />

        {/* Inner orbit ring 1 */}
        <circle
          cx={cx} cy={cy} r={ring1Radius}
          fill="none"
          stroke={`${DNA.GOLD}18`}
          strokeWidth={1}
          strokeDasharray="4 4"
        />

        {/* Ring 2 nodes (systems) */}
        {ring2Nodes.map((node, i) => (
          <EmpireNode
            key={`r2-${node.id}`}
            node={node}
            cx={ring2Positions[i].x}
            cy={ring2Positions[i].y}
            radius={22 + node.powerScore * 0.12}
            frame={frame}
            fps={fps}
            delayFrames={Math.round(fps * 1.2) + i * 6}
          />
        ))}

        {/* Ring 1 nodes (creators) */}
        {ring1Nodes.map((node, i) => (
          <EmpireNode
            key={`r1-${node.id}`}
            node={node}
            cx={ring1Positions[i].x}
            cy={ring1Positions[i].y}
            radius={28 + node.powerScore * 0.15}
            frame={frame}
            fps={fps}
            delayFrames={Math.round(fps * 0.8) + i * 8}
          />
        ))}

        {/* King node (center) */}
        <EmpireNode
          node={kingNode}
          cx={cx}
          cy={cy}
          radius={55}
          frame={frame}
          fps={fps}
          delayFrames={0}
        />

        {/* King pulse rings */}
        {[1, 1.5, 2].map((mult, i) => (
          <circle
            key={`pulse-${i}`}
            cx={cx} cy={cy}
            r={55 * mult * pulse}
            fill="none"
            stroke={DNA.GOLD}
            strokeWidth={1}
            opacity={0.15 / mult}
          />
        ))}
      </svg>

      {/* Stats bar bottom */}
      <div style={{
        position: "absolute",
        bottom: 40,
        left: 60,
        right: 60,
        opacity: statsOpacity,
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        borderTop: `1px solid ${accentColor}33`,
        paddingTop: 20,
      }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 36, fontWeight: 900, color: DNA.WHITE, fontFamily: DNA.FONT_HEAD }}>
            {creatorNodes.length + systemNodes.length + 1}
          </div>
          <div style={{ fontSize: 14, color: DNA.GRAY, letterSpacing: 2, textTransform: "uppercase" }}>NODES</div>
        </div>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 36, fontWeight: 900, color: DNA.GOLD, fontFamily: DNA.FONT_HEAD }}>{revenueStr}</div>
          <div style={{ fontSize: 14, color: DNA.GRAY, letterSpacing: 2, textTransform: "uppercase" }}>EMPIRE REVENUE</div>
        </div>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 36, fontWeight: 900, color: accentColor, fontFamily: DNA.FONT_HEAD }}>{totalJobs}</div>
          <div style={{ fontSize: 14, color: DNA.GRAY, letterSpacing: 2, textTransform: "uppercase" }}>VIDEO JOBS</div>
        </div>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 36, fontWeight: 900, color: DNA.WHITE, fontFamily: DNA.FONT_HEAD }}>
            {ring1Nodes.length}
          </div>
          <div style={{ fontSize: 14, color: DNA.GRAY, letterSpacing: 2, textTransform: "uppercase" }}>CREATORS</div>
        </div>
        <div style={{
          padding: "10px 28px",
          borderRadius: 30,
          border: `1px solid ${accentColor}66`,
          background: `${accentColor}11`,
          color: accentColor,
          fontSize: 18,
          fontWeight: 700,
          fontFamily: DNA.FONT_HEAD,
          letterSpacing: 2,
          textTransform: "uppercase",
        }}>
          CREATORVAULT
        </div>
      </div>
    </AbsoluteFill>
  );
};
