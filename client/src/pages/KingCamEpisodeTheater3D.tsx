/**
 * ============================================================================
 * KingCamEpisodeTheater3D
 * ============================================================================
 * A 3D curved theater of floating episode posters.
 *
 * Features:
 *   - Curved wall of episode tiles arranged in a semicircle
 *   - Tile size + glow intensity driven by views and revenue (glowScore)
 *   - Gold aura on revenue-generating episodes
 *   - Hover: stats overlay (views, revenue, CTA)
 *   - Click: opens episode detail panel (reuses existing Learn episode UI)
 *   - Filter row: All / Money Makers / Emma / Lizzy / DR Tours
 *   - OrbitControls for orbit/zoom (no FPS)
 *   - Touch-friendly: tap to focus, pinch to zoom
 *   - 2D fallback when WebGL unavailable
 *   - Mobile: capped object count, reduced geometry
 * ============================================================================
 */
import React, { useRef, useState, useEffect, useCallback, Suspense } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Text, RoundedBox, Float, OrbitControls, Stars } from "@react-three/drei";
import * as THREE from "three";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/contexts/AuthContext";
import { useLocation } from "wouter";
import {
  Filter, Play, Eye, DollarSign, Heart, X, ChevronRight,
  Tv, Loader2, AlertCircle, Film, Download
} from "lucide-react";

// ─── WebGL detection ──────────────────────────────────────────────────────────
function canUseWebGL(): boolean {
  try {
    const canvas = document.createElement("canvas");
    const gl = canvas.getContext("webgl2") || canvas.getContext("webgl") || canvas.getContext("experimental-webgl");
    return !!gl;
  } catch {
    return false;
  }
}

// ─── Types ────────────────────────────────────────────────────────────────────
type FilterKey = "all" | "money" | "emma" | "lizzy" | "dr-tours";

interface Episode {
  id: string;
  title: string;
  playlist: string;
  playlistLabel: string;
  thumbnailEmoji: string;
  tags: string[];
  duration: string;
  videoUrl: string;
  ctaLabel: string;
  views: number;
  likes: number;
  estimatedRevenue: number;
  glowScore: number;
  hasRevenue: boolean;
  filter: string;
}

// ─── 3D: Single Episode Tile ──────────────────────────────────────────────────
function EpisodeTile({
  episode,
  position,
  rotation,
  onHover,
  onLeave,
  onClick,
  isMobile,
}: {
  episode: Episode;
  position: [number, number, number];
  rotation: [number, number, number];
  onHover: (ep: Episode, pos: THREE.Vector3) => void;
  onLeave: () => void;
  onClick: (ep: Episode) => void;
  isMobile: boolean;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const glowRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);
  const baseScale = isMobile ? 0.7 : 1.0;
  const sizeBoost = 0.8 + episode.glowScore * 0.6; // 0.8x to 1.4x based on score

  useFrame((_, delta) => {
    if (!meshRef.current || !glowRef.current) return;
    const targetScale = hovered ? sizeBoost * 1.15 : sizeBoost;
    meshRef.current.scale.lerp(
      new THREE.Vector3(targetScale * baseScale, targetScale * baseScale, 1),
      delta * 6
    );
    // Glow pulse
    const pulse = Math.sin(Date.now() * 0.002) * 0.15 + 0.85;
    const glowIntensity = episode.glowScore * pulse;
    (glowRef.current.material as THREE.MeshBasicMaterial).opacity =
      hovered ? 0.5 : glowIntensity * 0.35;
  });

  const glowColor = episode.hasRevenue ? "#fbbf24" : episode.glowScore > 0.6 ? "#a78bfa" : "#22d3ee";

  return (
    <group position={position} rotation={rotation}>
      {/* Glow halo */}
      <mesh ref={glowRef}>
        <planeGeometry args={[2.4, 3.4]} />
        <meshBasicMaterial color={glowColor} transparent opacity={0.2} side={THREE.DoubleSide} />
      </mesh>

      {/* Main tile */}
      <RoundedBox
        ref={meshRef}
        args={[2.0, 3.0, 0.12]}
        radius={0.12}
        smoothness={4}
        onPointerEnter={(e) => {
          e.stopPropagation();
          setHovered(true);
          const worldPos = new THREE.Vector3();
          meshRef.current?.getWorldPosition(worldPos);
          onHover(episode, worldPos);
          document.body.style.cursor = "pointer";
        }}
        onPointerLeave={() => {
          setHovered(false);
          onLeave();
          document.body.style.cursor = "default";
        }}
        onClick={(e) => {
          e.stopPropagation();
          onClick(episode);
        }}
      >
        <meshStandardMaterial
          color={hovered ? "#1e1b4b" : "#0f0a1e"}
          emissive={glowColor}
          emissiveIntensity={hovered ? 0.4 : episode.glowScore * 0.2}
          metalness={0.3}
          roughness={0.7}
        />
      </RoundedBox>

      {/* Emoji thumbnail */}
      <Text
        position={[0, 0.6, 0.08]}
        fontSize={0.7}
        anchorX="center"
        anchorY="middle"
      >
        {episode.thumbnailEmoji}
      </Text>

      {/* Title */}
      <Text
        position={[0, -0.3, 0.08]}
        fontSize={isMobile ? 0.12 : 0.14}
        color="white"
        anchorX="center"
        anchorY="middle"
        maxWidth={1.7}
        textAlign="center"
        font={undefined}
      >
        {episode.title}
      </Text>

      {/* Playlist label */}
      <Text
        position={[0, -0.72, 0.08]}
        fontSize={0.1}
        color="#a78bfa"
        anchorX="center"
        anchorY="middle"
        maxWidth={1.7}
        textAlign="center"
      >
        {episode.playlistLabel}
      </Text>

      {/* Stats row */}
      <Text
        position={[0, -1.05, 0.08]}
        fontSize={0.1}
        color="#6b7280"
        anchorX="center"
        anchorY="middle"
      >
        {`👁 ${episode.views}  ❤️ ${episode.likes}  ⏱ ${episode.duration}`}
      </Text>

      {/* Revenue badge */}
      {episode.hasRevenue && (
        <Text
          position={[0.6, 1.2, 0.1]}
          fontSize={0.12}
          color="#fbbf24"
          anchorX="center"
          anchorY="middle"
        >
          💰
        </Text>
      )}

      {/* Border frame */}
      <lineSegments position={[0, 0, 0.07]}>
        <edgesGeometry args={[new THREE.BoxGeometry(2.05, 3.05, 0.01)]} />
        <lineBasicMaterial color={hovered ? glowColor : "#374151"} />
      </lineSegments>
    </group>
  );
}

// ─── 3D: Scene ────────────────────────────────────────────────────────────────
function TheaterScene({
  episodes,
  onHover,
  onLeave,
  onSelect,
  isMobile,
}: {
  episodes: Episode[];
  onHover: (ep: Episode, pos: THREE.Vector3) => void;
  onLeave: () => void;
  onSelect: (ep: Episode) => void;
  isMobile: boolean;
}) {
  const maxEpisodes = isMobile ? 8 : 11;
  const displayEps = episodes.slice(0, maxEpisodes);
  const count = displayEps.length;

  // Arrange in a curved semicircle
  const radius = isMobile ? 6 : 8;
  const angleSpread = Math.PI * 1.1; // ~200 degrees
  const startAngle = -angleSpread / 2;

  return (
    <>
      {/* Ambient + directional light */}
      <ambientLight intensity={0.3} />
      <directionalLight position={[0, 10, 5]} intensity={0.8} color="#ffffff" />
      <pointLight position={[0, 0, 3]} intensity={1.5} color="#a78bfa" />
      <pointLight position={[-5, 3, 2]} intensity={0.8} color="#22d3ee" />
      <pointLight position={[5, 3, 2]} intensity={0.8} color="#fbbf24" />

      {/* Stars background */}
      <Stars radius={50} depth={30} count={isMobile ? 500 : 1500} factor={3} fade speed={0.5} />

      {/* Floor glow */}
      <mesh position={[0, -4, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[30, 30]} />
        <meshBasicMaterial color="#0f0a1e" />
      </mesh>

      {/* Episode tiles */}
      {displayEps.map((ep, i) => {
        const angle = startAngle + (i / Math.max(count - 1, 1)) * angleSpread;
        const x = Math.sin(angle) * radius;
        const z = -Math.cos(angle) * radius + radius * 0.3;
        const rotY = -angle;
        const y = isMobile ? -0.5 : 0;

        return (
          <Float key={ep.id} speed={0.8 + i * 0.1} rotationIntensity={0.02} floatIntensity={0.15}>
            <EpisodeTile
              episode={ep}
              position={[x, y, z]}
              rotation={[0, rotY, 0]}
              onHover={onHover}
              onLeave={onLeave}
              onClick={onSelect}
              isMobile={isMobile}
            />
          </Float>
        );
      })}

      {/* Center stage label */}
      <Text
        position={[0, isMobile ? 2.5 : 3.5, 0]}
        fontSize={isMobile ? 0.4 : 0.55}
        color="#fbbf24"
        anchorX="center"
        anchorY="middle"
        letterSpacing={0.05}
      >
        👑 KINGCAM EPISODE THEATER
      </Text>

      <OrbitControls
        enablePan={false}
        enableZoom={true}
        enableRotate={true}
        minDistance={3}
        maxDistance={18}
        maxPolarAngle={Math.PI / 2}
        minPolarAngle={Math.PI / 6}
        autoRotate={false}
        touches={{
          ONE: THREE.TOUCH.ROTATE,
          TWO: THREE.TOUCH.DOLLY_ROTATE,
        }}
      />
    </>
  );
}

// ─── 2D Fallback ──────────────────────────────────────────────────────────────
function Theater2DFallback({
  episodes,
  onSelect,
  activeFilter,
  onFilterChange,
}: {
  episodes: Episode[];
  onSelect: (ep: Episode) => void;
  activeFilter: FilterKey;
  onFilterChange: (f: FilterKey) => void;
}) {
  const FILTERS: { key: FilterKey; label: string }[] = [
    { key: "all", label: "All" },
    { key: "money", label: "💰 Money Makers" },
    { key: "emma", label: "💪 Emma" },
    { key: "lizzy", label: "🌅 Lizzy" },
    { key: "dr-tours", label: "🇩🇴 DR Tours" },
  ];

  return (
    <div className="min-h-screen bg-[#0f0a1e] p-6">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-yellow-400 mb-2">👑 KingCam Episode Theater</h1>
          <p className="text-gray-400 text-sm">WebGL not available — 2D mode</p>
        </div>
        <div className="flex flex-wrap gap-2 mb-6 justify-center">
          {FILTERS.map(f => (
            <button
              key={f.key}
              onClick={() => onFilterChange(f.key)}
              className={`px-4 py-2 rounded-full text-sm font-semibold transition ${
                activeFilter === f.key
                  ? "bg-purple-600 text-white"
                  : "bg-gray-800 text-gray-400 hover:bg-gray-700"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {episodes.map(ep => (
            <div
              key={ep.id}
              onClick={() => onSelect(ep)}
              className={`bg-gray-900 rounded-xl p-4 border cursor-pointer hover:border-purple-500 transition ${
                ep.hasRevenue ? "border-yellow-500/50" : "border-gray-700"
              }`}
            >
              <div className="text-4xl text-center mb-2">{ep.thumbnailEmoji}</div>
              <div className="text-white font-semibold text-sm text-center mb-1 line-clamp-2">{ep.title}</div>
              <div className="text-purple-400 text-xs text-center mb-2">{ep.playlistLabel}</div>
              <div className="flex justify-between text-xs text-gray-500">
                <span>👁 {ep.views}</span>
                <span>❤️ {ep.likes}</span>
                {ep.hasRevenue && <span className="text-yellow-400">💰</span>}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Episode Detail Panel ─────────────────────────────────────────────────────
function EpisodeDetailPanel({ episode, onClose }: { episode: Episode; onClose: () => void }) {
  const [, navigate] = useLocation();
  const [renderJobId, setRenderJobId] = React.useState<string | null>(null);
  const [renderStatus, setRenderStatus] = React.useState<"idle" | "rendering" | "completed" | "failed">("idle");
  const [videoUrl, setVideoUrl] = React.useState<string | null>(null);

  const renderTrailerMutation = trpc.kingWorld3D.renderEpisodeTrailer.useMutation({
    onSuccess: (data) => {
      setRenderJobId(data.jobId);
      setRenderStatus("rendering");
    },
    onError: () => setRenderStatus("failed"),
  });

  const jobStatusQuery = trpc.kingWorld3D.getRenderJobStatus.useQuery(
    { jobId: renderJobId! },
    {
      enabled: !!renderJobId && renderStatus === "rendering",
      refetchInterval: 3000,
  // @ts-ignore
      onSuccess: (data) => {
        if (data.status === "completed") {
          setRenderStatus("completed");
          setVideoUrl(data.videoUrl);
        } else if (data.status === "failed") {
          setRenderStatus("failed");
        }
      },
    }
  );

  const handleRenderTrailer = () => {
    setRenderStatus("rendering");
    renderTrailerMutation.mutate({
      episodeId: episode.id,
      title: episode.title,
      playlistLabel: episode.playlistLabel,
      thumbnailEmoji: episode.thumbnailEmoji,
      ctaLabel: episode.ctaLabel,
      views: episode.views,
      estimatedRevenue: episode.estimatedRevenue,
      glowScore: episode.glowScore,
      accentColor: episode.hasRevenue ? "#D4AF37" : "#00D9FF",
      duration: episode.duration,
    });
  };
  return (
    <div className="fixed inset-y-0 right-0 w-full max-w-sm bg-gray-950 border-l border-gray-800 z-50 flex flex-col shadow-2xl">
      <div className="flex items-center justify-between p-4 border-b border-gray-800">
        <h3 className="text-white font-bold text-sm">Episode Detail</h3>
        <button onClick={onClose} className="text-gray-500 hover:text-white transition">
          <X className="w-5 h-5" />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto p-5">
        <div className="text-6xl text-center mb-4">{episode.thumbnailEmoji}</div>
        <h2 className="text-white font-bold text-lg mb-1">{episode.title}</h2>
        <div className="text-purple-400 text-sm mb-4">{episode.playlistLabel}</div>

        <div className="grid grid-cols-3 gap-3 mb-5">
          <div className="bg-gray-900 rounded-lg p-3 text-center">
            <Eye className="w-4 h-4 text-cyan-400 mx-auto mb-1" />
            <div className="text-white font-bold text-lg">{episode.views}</div>
            <div className="text-gray-500 text-xs">Views</div>
          </div>
          <div className="bg-gray-900 rounded-lg p-3 text-center">
            <Heart className="w-4 h-4 text-red-400 mx-auto mb-1" />
            <div className="text-white font-bold text-lg">{episode.likes}</div>
            <div className="text-gray-500 text-xs">Likes</div>
          </div>
          <div className="bg-gray-900 rounded-lg p-3 text-center">
            <DollarSign className="w-4 h-4 text-yellow-400 mx-auto mb-1" />
            <div className={`font-bold text-lg ${episode.hasRevenue ? "text-yellow-400" : "text-gray-500"}`}>
              {episode.hasRevenue ? `$${episode.estimatedRevenue}` : "—"}
            </div>
            <div className="text-gray-500 text-xs">Revenue</div>
          </div>
        </div>

        <div className="bg-gray-900 rounded-lg p-3 mb-4">
          <div className="text-xs text-gray-400 mb-2">Viral Score</div>
          <div className="w-full bg-gray-800 rounded-full h-2">
            <div
              className={`h-2 rounded-full transition-all ${episode.hasRevenue ? "bg-yellow-400" : "bg-purple-500"}`}
              style={{ width: `${Math.round(episode.glowScore * 100)}%` }}
            />
          </div>
          <div className="text-right text-xs text-gray-400 mt-1">{Math.round(episode.glowScore * 100)}/100</div>
        </div>

        <div className="flex flex-wrap gap-1 mb-5">
          {episode.tags.map(tag => (
            <span key={tag} className="text-xs bg-gray-800 text-gray-400 rounded px-2 py-0.5">#{tag}</span>
          ))}
        </div>

        {episode.videoUrl && (
          <a
            href={episode.videoUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full flex items-center justify-center space-x-2 py-3 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold transition mb-3"
          >
            <Play className="w-4 h-4" />
            <span>Watch Episode</span>
          </a>
        )}

        <button
          onClick={() => navigate("/learn")}
          className="w-full flex items-center justify-center space-x-2 py-3 rounded-xl bg-gray-800 hover:bg-gray-700 text-white font-semibold transition"
        >
          <Tv className="w-4 h-4" />
          <span>Open in Learn →</span>
        </button>

        {/* ── Remotion Render Trailer ── */}
        <div className="mt-4 border-t border-gray-800 pt-4">
          <div className="text-xs text-gray-500 mb-2 uppercase tracking-wider">Remotion Export</div>
          {renderStatus === "idle" && (
            <button
              onClick={handleRenderTrailer}
              className="w-full flex items-center justify-center space-x-2 py-3 rounded-xl bg-cyan-700 hover:bg-cyan-600 text-white font-bold transition"
            >
              <Film className="w-4 h-4" />
              <span>Render Episode Trailer</span>
            </button>
          )}
          {renderStatus === "rendering" && (
            <div className="w-full flex items-center justify-center space-x-2 py-3 rounded-xl bg-gray-800 text-cyan-400">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className="text-sm">Rendering… {jobStatusQuery.data?.progress ?? 0}%</span>
            </div>
          )}
          {renderStatus === "completed" && videoUrl && (
            <a
              href={videoUrl}
              download
              className="w-full flex items-center justify-center space-x-2 py-3 rounded-xl bg-green-700 hover:bg-green-600 text-white font-bold transition"
            >
              <Download className="w-4 h-4" />
              <span>Download Trailer MP4</span>
            </a>
          )}
          {renderStatus === "failed" && (
            <div className="w-full flex items-center justify-center space-x-2 py-3 rounded-xl bg-red-900/50 text-red-400 text-sm">
              <AlertCircle className="w-4 h-4" />
              <span>Render failed — try again</span>
            </div>
          )}
          {renderStatus === "failed" && (
            <button
              onClick={() => setRenderStatus("idle")}
              className="w-full mt-2 py-2 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-400 text-sm transition"
            >
              Retry
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Hover Tooltip (HTML overlay) ────────────────────────────────────────────
function HoverTooltip({ episode, screenPos }: { episode: Episode; screenPos: { x: number; y: number } }) {
  return (
    <div
      className="fixed z-40 pointer-events-none bg-gray-950/95 border border-gray-700 rounded-xl p-3 shadow-xl max-w-[220px]"
      style={{ left: screenPos.x + 16, top: screenPos.y - 60 }}
    >
      <div className="text-white font-bold text-sm mb-1">{episode.title}</div>
      <div className="text-purple-400 text-xs mb-2">{episode.playlistLabel}</div>
      <div className="flex items-center space-x-3 text-xs text-gray-400">
        <span>👁 {episode.views}</span>
        <span>❤️ {episode.likes}</span>
        {episode.hasRevenue && <span className="text-yellow-400">💰 ${episode.estimatedRevenue}</span>}
      </div>
      <div className="text-xs text-gray-500 mt-1">⏱ {episode.duration}</div>
      <div className="text-xs text-cyan-400 mt-2 flex items-center space-x-1">
        <span>Click to open</span>
        <ChevronRight className="w-3 h-3" />
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function KingCamEpisodeTheater3D() {
  const { user, isLoading: authLoading } = useAuth();
  const [, navigate] = useLocation();
  const [activeFilter, setActiveFilter] = useState<FilterKey>("all");
  const [hoveredEp, setHoveredEp] = useState<Episode | null>(null);
  const [hoverScreenPos, setHoverScreenPos] = useState({ x: 0, y: 0 });
  const [selectedEp, setSelectedEp] = useState<Episode | null>(null);
  const [webglAvailable] = useState(() => canUseWebGL());
  const isMobile = typeof window !== "undefined" && window.innerWidth < 768;

  // ── All hooks MUST be declared before any conditional returns (Rules of Hooks) ──
  const { data, isLoading } = trpc.kingWorld3D.getEpisodes.useQuery(
    { filter: activeFilter },
    { enabled: !authLoading && !!user }
  );
  const episodes: Episode[] = data?.episodes || [];

  const handleHover = useCallback((ep: Episode, _worldPos: THREE.Vector3) => {
    setHoveredEp(ep);
  }, []);

  const handleLeave = useCallback(() => {
    setHoveredEp(null);
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    setHoverScreenPos({ x: e.clientX, y: e.clientY });
  }, []);

  const FILTERS: { key: FilterKey; label: string }[] = [
    { key: "all", label: "All" },
    { key: "money", label: "💰 Money Makers" },
    { key: "emma", label: "💪 Emma" },
    { key: "lizzy", label: "🌅 Lizzy" },
    { key: "dr-tours", label: "🇩🇴 DR Tours" },
  ];

  // ── Conditional returns AFTER all hooks ──
  // Show loading while auth resolves
  if (authLoading) {
    return (
      <div style={{ minHeight: "100vh", background: "#000", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ color: "#FFD700", fontSize: "16px" }}>Loading...</div>
      </div>
    );
  }
  // Guard: king only
  if (user && user.role !== "king" && user.role !== "admin") {
    return (
      <div style={{ minHeight: "100vh", background: "#000", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: "16px" }}>
        <div style={{ color: "#ef4444", fontSize: "18px", fontWeight: 700 }}>Access Denied</div>
        <div style={{ color: "#666", fontSize: "14px" }}>This area is for KingCam only.</div>
        <a href="/" style={{ color: "#FFD700", fontSize: "14px" }}>Go Home</a>
      </div>
    );
  }
  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0f0a1e] flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-10 h-10 text-purple-400 mx-auto mb-3 animate-spin" />
          <p className="text-gray-300">Loading Episode Theater...</p>
        </div>
      </div>
    );
  }

  if (!webglAvailable) {
    return (
      <Theater2DFallback
        episodes={episodes}
        onSelect={setSelectedEp}
        activeFilter={activeFilter}
        onFilterChange={setActiveFilter}
      />
    );
  }

  return (
    <div className="fixed inset-0 bg-[#0f0a1e]" onMouseMove={handleMouseMove}>
      {/* Filter row */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-30 flex flex-wrap gap-2 justify-center px-4">
        {FILTERS.map(f => (
          <button
            key={f.key}
            onClick={() => setActiveFilter(f.key)}
            className={`px-4 py-1.5 rounded-full text-sm font-semibold transition backdrop-blur-sm ${
              activeFilter === f.key
                ? "bg-purple-600 text-white shadow-lg shadow-purple-500/30"
                : "bg-gray-900/80 text-gray-400 hover:bg-gray-800 border border-gray-700"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Episode count */}
      <div className="absolute top-16 left-1/2 -translate-x-1/2 z-30 text-gray-500 text-xs">
        {episodes.length} episodios
      </div>

      {/* Back button */}
      <button
        onClick={() => navigate("/king")}
        className="absolute top-4 left-4 z-30 px-3 py-1.5 bg-gray-900/80 border border-gray-700 text-gray-300 rounded-lg text-sm hover:bg-gray-800 transition backdrop-blur-sm"
      >
        ← King Home
      </button>

      {/* Instructions */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-30 text-gray-600 text-xs text-center">
        {isMobile ? "Tap to select • Pinch to zoom" : "Drag to orbit • Scroll to zoom • Click episode to open"}
      </div>

      {/* 3D Canvas */}
      <Canvas
        camera={{ position: [0, 2, 10], fov: 60 }}
        gl={{ antialias: !isMobile, powerPreference: "high-performance" }}
        dpr={isMobile ? 1 : Math.min(window.devicePixelRatio, 2)}
        frameloop="demand"
      >
        <Suspense fallback={null}>
          <TheaterScene
            episodes={episodes}
            onHover={handleHover}
            onLeave={handleLeave}
            onSelect={setSelectedEp}
            isMobile={isMobile}
          />
        </Suspense>
      </Canvas>

      {/* Hover tooltip */}
      {hoveredEp && !selectedEp && (
        <HoverTooltip episode={hoveredEp} screenPos={hoverScreenPos} />
      )}

      {/* Episode detail panel */}
      {selectedEp && (
        <EpisodeDetailPanel episode={selectedEp} onClose={() => setSelectedEp(null)} />
      )}
    </div>
  );
}
