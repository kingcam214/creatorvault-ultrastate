/**
 * ============================================================================
 * KingCamEmpireMap3D
 * ============================================================================
 * A 3D node graph showing KingCam's empire:
 *   - Center: KingCam node (large, gold, pulsing)
 *   - Ring 1: Creator nodes (Emma, Lizzy, other creators)
 *   - Ring 2: System/Agent nodes (Emma Engine, VideoLab, Gem Engine, etc.)
 *   - Lines connecting systems to their primary creators
 *
 * Features:
 *   - Power score drives node size and glow
 *   - Hover: tooltip with name, role, key metric
 *   - Click: navigate to creator empire page or system tool
 *   - OrbitControls (orbit + zoom, no pan)
 *   - 2D fallback when WebGL unavailable
 *   - Mobile: reduced geometry, touch-friendly
 * ============================================================================
 */
import React, { useRef, useState, useCallback, useMemo, Suspense, memo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Text, Float, OrbitControls, Stars, Sphere } from "@react-three/drei";
import * as THREE from "three";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/contexts/AuthContext";
import { useLocation } from "wouter";
import { AlertCircle, Loader2, ChevronRight, ExternalLink, Film, Download } from "lucide-react";

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
interface EmpireNode {
  id: string | number;
  name: string;
  type: "creator" | "system";
  emoji: string;
  description: string;
  route: string;
  ring: number;
  color: string;
  powerScore: number;
  metric: string;
  primaryCreator?: string;
}

// ─── 3D: Connection Line ──────────────────────────────────────────────────────
function ConnectionLine({
  start,
  end,
  color,
  opacity = 0.3,
}: {
  start: THREE.Vector3;
  end: THREE.Vector3;
  color: string;
  opacity?: number;
}) {
  const lineGeometry = useMemo(() => {
    const points = [start, end];
    return new THREE.BufferGeometry().setFromPoints(points);
  }, [start, end]);

  return (
    <line geometry={lineGeometry}>
      <lineBasicMaterial color={color} transparent opacity={opacity} />
    </line>
  );
}

// ─── 3D: Empire Node ─────────────────────────────────────────────────────────
const EmpireNode3D = memo(function EmpireNode3D({
  node,
  position,
  onHover,
  onLeave,
  onClick,
  isMobile,
}: {
  node: EmpireNode;
  position: THREE.Vector3;
  onHover: (node: EmpireNode, pos: THREE.Vector3) => void;
  onLeave: () => void;
  onClick: (node: EmpireNode) => void;
  isMobile: boolean;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const glowRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);

  const isKing = node.ring === 0;
  const baseRadius = isKing ? 1.2 : node.type === "creator" ? 0.55 + node.powerScore * 0.005 : 0.45 + node.powerScore * 0.003;
  const radius = isMobile ? baseRadius * 0.8 : baseRadius;

  useFrame((state) => {
    if (!meshRef.current || !glowRef.current) return;
    const t = state.clock.elapsedTime;

    // King pulses, others float gently
    if (isKing) {
      const pulse = 1 + Math.sin(t * 1.5) * 0.08;
      meshRef.current.scale.setScalar(pulse);
      (glowRef.current.material as THREE.MeshBasicMaterial).opacity = 0.25 + Math.sin(t * 2) * 0.1;
    } else {
      const targetScale = hovered ? 1.2 : 1.0;
      meshRef.current.scale.lerp(new THREE.Vector3(targetScale, targetScale, targetScale), 0.1);
      (glowRef.current.material as THREE.MeshBasicMaterial).opacity =
        hovered ? 0.4 : 0.15 + (node.powerScore / 100) * 0.15;
    }
  });

  return (
    <group position={position}>
      {/* Glow sphere */}
      <mesh ref={glowRef}>
        <sphereGeometry args={[radius * 1.6, 12, 12]} />
        <meshBasicMaterial color={node.color} transparent opacity={0.2} side={THREE.BackSide} />
      </mesh>

      {/* Main sphere */}
      <mesh
        ref={meshRef}
        onPointerEnter={(e) => {
          e.stopPropagation();
          setHovered(true);
          const worldPos = new THREE.Vector3();
          meshRef.current?.getWorldPosition(worldPos);
          onHover(node, worldPos);
          document.body.style.cursor = "pointer";
        }}
        onPointerLeave={() => {
          setHovered(false);
          onLeave();
          document.body.style.cursor = "default";
        }}
        onClick={(e) => {
          e.stopPropagation();
          onClick(node);
        }}
      >
        <sphereGeometry args={[radius, isMobile ? 12 : 20, isMobile ? 12 : 20]} />
        <meshStandardMaterial
          color={node.color}
          emissive={node.color}
          emissiveIntensity={hovered ? 0.6 : isKing ? 0.5 : 0.25}
          metalness={isKing ? 0.8 : 0.4}
          roughness={isKing ? 0.1 : 0.5}
        />
      </mesh>

      {/* Emoji label */}
      <Text
        position={[0, 0, radius + 0.05]}
        fontSize={isKing ? 0.55 : isMobile ? 0.28 : 0.32}
        anchorX="center"
        anchorY="middle"
      >
        {node.emoji}
      </Text>

      {/* Name label below */}
      <Text
        position={[0, -(radius + 0.45), 0]}
        fontSize={isKing ? 0.22 : isMobile ? 0.13 : 0.15}
        color={isKing ? "#fbbf24" : "white"}
        anchorX="center"
        anchorY="middle"
        maxWidth={2.5}
        textAlign="center"
      >
        {node.name}
      </Text>

      {/* Metric label */}
      {!isMobile && (
        <Text
          position={[0, -(radius + 0.72), 0]}
          fontSize={0.1}
          color="#6b7280"
          anchorX="center"
          anchorY="middle"
        >
          {node.metric}
        </Text>
      )}

      {/* Ring indicator for systems */}
      {node.type === "system" && !isMobile && (
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[radius * 1.3, 0.02, 6, 32]} />
          <meshBasicMaterial color={node.color} transparent opacity={0.4} />
        </mesh>
      )}
    </group>
  );
});

// ─── 3D: Empire Scene ─────────────────────────────────────────────────────────
function EmpireScene({
  creatorNodes,
  systemNodes,
  onHover,
  onLeave,
  onClick,
  isMobile,
}: {
  creatorNodes: EmpireNode[];
  systemNodes: EmpireNode[];
  onHover: (node: EmpireNode, pos: THREE.Vector3) => void;
  onLeave: () => void;
  onClick: (node: EmpireNode) => void;
  isMobile: boolean;
}) {
  const kingNode = creatorNodes.find(n => n.ring === 0);
  const ring1Nodes = creatorNodes.filter(n => n.ring === 1);
  const ring2Nodes = isMobile ? systemNodes.slice(0, 4) : systemNodes;

  const ring1Radius = isMobile ? 4.5 : 5.5;
  const ring2Radius = isMobile ? 8 : 10;

  // Compute positions (memoized — prevents infinite re-render loop)
  const kingPos = useMemo(() => new THREE.Vector3(0, 0, 0), []);

  const ring1Positions = useMemo(() => ring1Nodes.map((_, i) => {
    const angle = (i / ring1Nodes.length) * Math.PI * 2 - Math.PI / 2;
    return new THREE.Vector3(
      Math.cos(angle) * ring1Radius,
      Math.sin(angle * 0.3) * 0.5,
      Math.sin(angle) * ring1Radius
    );
  }), [ring1Nodes, ring1Radius]);

  const ring2Positions = useMemo(() => ring2Nodes.map((_, i) => {
    const angle = (i / ring2Nodes.length) * Math.PI * 2 - Math.PI / 4;
    return new THREE.Vector3(
      Math.cos(angle) * ring2Radius,
      Math.sin(angle * 0.2) * 0.8 - 0.5,
      Math.sin(angle) * ring2Radius
    );
  }), [ring2Nodes]);

  return (
    <>
      <ambientLight intensity={0.25} />
      <directionalLight position={[10, 15, 5]} intensity={0.7} />
      <pointLight position={[0, 0, 0]} intensity={3} color="#fbbf24" distance={8} />
      <pointLight position={[0, 8, 0]} intensity={0.5} color="#a78bfa" />

      <Stars radius={60} depth={30} count={isMobile ? 600 : 2000} factor={3} fade speed={0.3} />

      {/* Orbit rings (decorative) */}
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[ring1Radius, 0.02, 4, 64]} />
        <meshBasicMaterial color="#374151" transparent opacity={0.3} />
      </mesh>
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[ring2Radius, 0.02, 4, 64]} />
        <meshBasicMaterial color="#1f2937" transparent opacity={0.25} />
      </mesh>

      {/* Connection lines: king → ring1 */}
      {ring1Positions.map((pos, i) => (
        <ConnectionLine
          key={`k-r1-${i}`}
          start={kingPos}
          end={pos}
          color="#fbbf24"
          opacity={0.15}
        />
      ))}

      {/* Connection lines: ring2 systems → their primary creator */}
      {ring2Nodes.map((sys, i) => {
        const targetIdx = ring1Nodes.findIndex(c =>
          sys.primaryCreator === "emma" ? c.name === "Emma" :
          sys.primaryCreator === "king" ? false : true
        );
        const targetPos = targetIdx >= 0 ? ring1Positions[targetIdx] : kingPos;
        return (
          <ConnectionLine
            key={`r2-${i}`}
            start={ring2Positions[i]}
            end={targetPos}
            color={sys.color}
            opacity={0.2}
          />
        );
      })}

      {/* King node */}
      {kingNode && (
        <Float speed={0.5} rotationIntensity={0.01} floatIntensity={0.1}>
          <EmpireNode3D
            node={kingNode}
            position={kingPos}
            onHover={onHover}
            onLeave={onLeave}
            onClick={onClick}
            isMobile={isMobile}
          />
        </Float>
      )}

      {/* Ring 1: Creator nodes */}
      {ring1Nodes.map((node, i) => (
        <Float key={node.id} speed={0.6 + i * 0.1} rotationIntensity={0.01} floatIntensity={0.12}>
          <EmpireNode3D
            node={node}
            position={ring1Positions[i]}
            onHover={onHover}
            onLeave={onLeave}
            onClick={onClick}
            isMobile={isMobile}
          />
        </Float>
      ))}

      {/* Ring 2: System nodes */}
      {ring2Nodes.map((node, i) => (
        <Float key={node.id} speed={0.4 + i * 0.08} rotationIntensity={0.01} floatIntensity={0.1}>
          <EmpireNode3D
            node={node}
            position={ring2Positions[i]}
            onHover={onHover}
            onLeave={onLeave}
            onClick={onClick}
            isMobile={isMobile}
          />
        </Float>
      ))}

      {/* Title */}
      <Text
        position={[0, isMobile ? 3 : 4.5, 0]}
        fontSize={isMobile ? 0.4 : 0.6}
        color="#fbbf24"
        anchorX="center"
        anchorY="middle"
        letterSpacing={0.05}
      >
        👑 KINGCAM EMPIRE MAP
      </Text>

      <OrbitControls
        enablePan={false}
        enableZoom={true}
        enableRotate={true}
        minDistance={5}
        maxDistance={25}
        maxPolarAngle={Math.PI * 0.65}
        minPolarAngle={Math.PI * 0.2}
        autoRotate={true}
        autoRotateSpeed={0.4}
        touches={{
          ONE: THREE.TOUCH.ROTATE,
          TWO: THREE.TOUCH.DOLLY_ROTATE,
        }}
      />
    </>
  );
}

// ─── 2D Fallback ──────────────────────────────────────────────────────────────
function EmpireMap2DFallback({
  creatorNodes,
  systemNodes,
  onNavigate,
}: {
  creatorNodes: EmpireNode[];
  systemNodes: EmpireNode[];
  onNavigate: (route: string) => void;
}) {
  return (
    <div className="min-h-screen bg-[#0f0a1e] p-6">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-yellow-400 mb-2">👑 KingCam Empire Map</h1>
          <p className="text-gray-400 text-sm">WebGL not available — 2D mode</p>
        </div>
        <div className="mb-6">
          <h2 className="text-white font-bold mb-3">Creators</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {creatorNodes.map(node => (
              <div
                key={node.id}
                onClick={() => onNavigate(node.route)}
                className="bg-gray-900 rounded-xl p-4 border border-gray-700 cursor-pointer hover:border-purple-500 transition"
              >
                <div className="text-3xl text-center mb-2">{node.emoji}</div>
                <div className="text-white font-semibold text-sm text-center">{node.name}</div>
                <div className="text-gray-400 text-xs text-center mt-1">{node.metric}</div>
                <div className="mt-2 w-full bg-gray-800 rounded-full h-1">
                  <div className="h-1 rounded-full bg-purple-500" style={{ width: `${node.powerScore}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
        <div>
          <h2 className="text-white font-bold mb-3">Systems & Agents</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {systemNodes.map(node => (
              <div
                key={node.id}
                onClick={() => onNavigate(node.route)}
                className="bg-gray-900 rounded-xl p-4 border border-gray-700 cursor-pointer hover:border-cyan-500 transition"
              >
                <div className="text-3xl text-center mb-2">{node.emoji}</div>
                <div className="text-white font-semibold text-sm text-center">{node.name}</div>
                <div className="text-gray-400 text-xs text-center mt-1">{node.description}</div>
                <div className="text-cyan-400 text-xs text-center mt-1">{node.metric}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Node Tooltip ─────────────────────────────────────────────────────────────
function NodeTooltip({ node, screenPos }: { node: EmpireNode; screenPos: { x: number; y: number } }) {
  return (
    <div
      className="fixed z-40 pointer-events-none bg-gray-950/95 border border-gray-700 rounded-xl p-3 shadow-xl max-w-[240px]"
      style={{ left: screenPos.x + 16, top: screenPos.y - 70 }}
    >
      <div className="flex items-center space-x-2 mb-1">
        <span className="text-xl">{node.emoji}</span>
        <div>
          <div className="text-white font-bold text-sm">{node.name}</div>
          <div className="text-xs" style={{ color: node.color }}>
            {node.type === "creator" ? "Creator" : "System/Agent"}
          </div>
        </div>
      </div>
      <div className="text-gray-400 text-xs mb-2">{node.description}</div>
      <div className="flex items-center justify-between">
        <span className="text-xs text-cyan-400">{node.metric}</span>
        <div className="flex items-center space-x-1 text-xs text-gray-500">
          <span>Power</span>
          <div className="w-16 bg-gray-800 rounded-full h-1 ml-1">
            <div className="h-1 rounded-full" style={{ width: `${node.powerScore}%`, backgroundColor: node.color }} />
          </div>
        </div>
      </div>
      <div className="text-xs text-gray-500 mt-2 flex items-center space-x-1">
        <span>Click to navigate</span>
        <ChevronRight className="w-3 h-3" />
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function KingCamEmpireMap3D() {
  const { user, isLoading: authLoading } = useAuth();
  const [, navigate] = useLocation();
  const [hoveredNode, setHoveredNode] = useState<EmpireNode | null>(null);
  const [hoverScreenPos, setHoverScreenPos] = useState({ x: 0, y: 0 });
  const [webglAvailable] = useState(() => canUseWebGL());
  const isMobile = typeof window !== "undefined" && window.innerWidth < 768;

  // ── Remotion snapshot render ──
  const [snapshotJobId, setSnapshotJobId] = React.useState<string | null>(null);
  const [snapshotStatus, setSnapshotStatus] = React.useState<"idle" | "rendering" | "completed" | "failed">("idle");
  const [snapshotVideoUrl, setSnapshotVideoUrl] = React.useState<string | null>(null);

  const renderSnapshotMutation = trpc.kingWorld3D.renderEmpireMapSnapshot.useMutation({
    onSuccess: (data) => {
      setSnapshotJobId(data.jobId);
      setSnapshotStatus("rendering");
    },
    onError: () => setSnapshotStatus("failed"),
  });

  const snapshotStatusQuery = trpc.kingWorld3D.getRenderJobStatus.useQuery(
    { jobId: snapshotJobId! },
    {
      enabled: !!snapshotJobId && snapshotStatus === "rendering",
      refetchInterval: 3000,
      onSuccess: (data) => {
        if (data.status === "completed") {
          setSnapshotStatus("completed");
          setSnapshotVideoUrl(data.videoUrl);
        } else if (data.status === "failed") {
          setSnapshotStatus("failed");
        }
      },
    }
  );

  if (authLoading) {
    return (
      <div style={{ minHeight: "100vh", background: "#000", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ color: "#FFD700", fontSize: "16px" }}>Loading...</div>
      </div>
    );
  }
  // Guard: king only
    if (!authLoading && user && user.role !== "king" && user.role !== "admin") {
    return (
      <div style={{ minHeight: "100vh", background: "#000", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: "16px" }}>
        <div style={{ color: "#ef4444", fontSize: "18px", fontWeight: 700 }}>Access Denied</div>
        <div style={{ color: "#666", fontSize: "14px" }}>This area is for KingCam only.</div>
        <a href="/" style={{ color: "#FFD700", fontSize: "14px" }}>Go Home</a>
      </div>
    );
  }

  const { data, isLoading } = trpc.kingWorld3D.getEmpireNodes.useQuery();

  const creatorNodes: EmpireNode[] = (data?.creatorNodes || []) as EmpireNode[];
  const systemNodes: EmpireNode[] = (data?.systemNodes || []) as EmpireNode[];

  const handleHover = useCallback((node: EmpireNode, _worldPos: THREE.Vector3) => {
    setHoveredNode(node);
  }, []);

  const handleLeave = useCallback(() => {
    setHoveredNode(null);
  }, []);

  const handleClick = useCallback((node: EmpireNode) => {
    navigate(node.route);
  }, [navigate]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    setHoverScreenPos({ x: e.clientX, y: e.clientY });
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0f0a1e] flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-10 h-10 text-yellow-400 mx-auto mb-3 animate-spin" />
          <p className="text-gray-300">Loading Empire Map...</p>
        </div>
      </div>
    );
  }

  if (!webglAvailable) {
    return (
      <EmpireMap2DFallback
        creatorNodes={creatorNodes}
        systemNodes={systemNodes}
        onNavigate={navigate}
      />
    );
  }

  return (
    <div className="fixed inset-0 bg-[#0f0a1e]" onMouseMove={handleMouseMove}>
      {/* Back button */}
      <button
        onClick={() => navigate("/king")}
        className="absolute top-4 left-4 z-30 px-3 py-1.5 bg-gray-900/80 border border-gray-700 text-gray-300 rounded-lg text-sm hover:bg-gray-800 transition backdrop-blur-sm"
      >
        ← King Home
      </button>

      {/* Node count */}
      <div className="absolute top-4 right-4 z-30 text-gray-500 text-xs bg-gray-900/80 px-3 py-1.5 rounded-lg border border-gray-700">
        {creatorNodes.length} creators · {systemNodes.length} systems
      </div>

      {/* Remotion Snapshot Render */}
      <div className="absolute top-14 right-4 z-30 flex flex-col items-end gap-2">
        {snapshotStatus === "idle" && (
          <button
            onClick={() => renderSnapshotMutation.mutate({
              accentColor: "#D4AF37",
              creatorCount: creatorNodes.length,
              systemCount: systemNodes.length,
            })}
            className="flex items-center space-x-1.5 px-3 py-1.5 bg-yellow-700/80 hover:bg-yellow-600/80 text-white text-xs font-bold rounded-lg border border-yellow-600 backdrop-blur-sm transition"
          >
            <Film className="w-3.5 h-3.5" />
            <span>Render Map Video</span>
          </button>
        )}
        {snapshotStatus === "rendering" && (
          <div className="flex items-center space-x-1.5 px-3 py-1.5 bg-gray-900/80 text-yellow-400 text-xs rounded-lg border border-gray-700 backdrop-blur-sm">
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            <span>Rendering… {snapshotStatusQuery.data?.progress ?? 0}%</span>
          </div>
        )}
        {snapshotStatus === "completed" && snapshotVideoUrl && (
          <a
            href={snapshotVideoUrl}
            download
            className="flex items-center space-x-1.5 px-3 py-1.5 bg-green-700/80 hover:bg-green-600/80 text-white text-xs font-bold rounded-lg border border-green-600 backdrop-blur-sm transition"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download Map MP4</span>
          </a>
        )}
        {snapshotStatus === "failed" && (
          <button
            onClick={() => setSnapshotStatus("idle")}
            className="flex items-center space-x-1.5 px-3 py-1.5 bg-red-900/60 text-red-400 text-xs rounded-lg border border-red-800 backdrop-blur-sm"
          >
            <AlertCircle className="w-3.5 h-3.5" />
            <span>Failed — Retry</span>
          </button>
        )}
      </div>

      {/* Legend */}
      <div className="absolute bottom-4 left-4 z-30 bg-gray-900/80 border border-gray-700 rounded-xl p-3 text-xs backdrop-blur-sm">
        <div className="flex items-center space-x-2 mb-1.5">
          <div className="w-3 h-3 rounded-full bg-yellow-400" />
          <span className="text-gray-300">KingCam (Center)</span>
        </div>
        <div className="flex items-center space-x-2 mb-1.5">
          <div className="w-3 h-3 rounded-full bg-purple-400" />
          <span className="text-gray-300">Creators (Ring 1)</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-3 h-3 rounded-full bg-cyan-400" />
          <span className="text-gray-300">Systems (Ring 2)</span>
        </div>
      </div>

      {/* Instructions */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-30 text-gray-600 text-xs text-center">
        {isMobile ? "Tap node to navigate • Pinch to zoom" : "Drag to orbit • Scroll to zoom • Click node to navigate"}
      </div>

      {/* 3D Canvas */}
      <Canvas
        camera={{ position: [0, 8, 18], fov: 55 }}
        gl={{ antialias: !isMobile, powerPreference: "high-performance" }}
        dpr={isMobile ? 1 : Math.min(window.devicePixelRatio, 2)}
        frameloop="always"
      >
        <Suspense fallback={null}>
          <EmpireScene
            creatorNodes={creatorNodes}
            systemNodes={systemNodes}
            onHover={handleHover}
            onLeave={handleLeave}
            onClick={handleClick}
            isMobile={isMobile}
          />
        </Suspense>
      </Canvas>

      {/* Hover tooltip */}
      {hoveredNode && (
        <NodeTooltip node={hoveredNode} screenPos={hoverScreenPos} />
      )}
    </div>
  );
}
