/**
 * KINGCAM CLONE TRAINING LAB
 * The most advanced 3D creator OS interface ever built.
 * Three.js / React Three Fiber — holographic clone, particle systems,
 * floating 3D cards, cinematic camera, full training pipeline UI.
 */
import { Suspense, useRef, useState, useEffect, useMemo, useCallback } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import {
  Float,
  Text3D,
  Environment,
  Sparkles,
  MeshDistortMaterial,
  GradientTexture,
  Stars,
  Trail,
  MeshTransmissionMaterial,
  Sphere,
  Box,
  Torus,
  Ring,
  Plane,
  useProgress,
  Html,
  PerspectiveCamera,
  OrbitControls,
  Billboard,
  Instances,
  Instance,
} from "@react-three/drei";
import * as THREE from "three";
import { trpc } from "@/lib/trpc";
import { useDropzone } from "react-dropzone";
import { motion, AnimatePresence } from "framer-motion";

// ─── SECTION TYPES ───────────────────────────────────────────────────────────
type Section = "overview" | "upload" | "frames" | "dataset" | "training" | "registry" | "evaluation" | "promote";

const SECTIONS: { id: Section; label: string; icon: string; color: string }[] = [
  { id: "overview",   label: "COMMAND",    icon: "◈",  color: "#00f5ff" },
  { id: "upload",     label: "INGEST",     icon: "⬆",  color: "#7c3aed" },
  { id: "frames",     label: "FRAMES",     icon: "⊞",  color: "#06b6d4" },
  { id: "dataset",    label: "DATASET",    icon: "◉",  color: "#10b981" },
  { id: "training",   label: "TRAIN",      icon: "⚡",  color: "#f59e0b" },
  { id: "registry",   label: "REGISTRY",   icon: "◎",  color: "#8b5cf6" },
  { id: "evaluation", label: "ARENA",      icon: "⊛",  color: "#ec4899" },
  { id: "promote",    label: "PROMOTE",    icon: "★",  color: "#f97316" },
];

// ─── 3D HOLOGRAPHIC CLONE CORE ───────────────────────────────────────────────
function HolographicClone({ active }: { active: boolean }) {
  const meshRef = useRef<THREE.Mesh>(null);
  const ringRef = useRef<THREE.Mesh>(null);
  const ring2Ref = useRef<THREE.Mesh>(null);
  const glowRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    if (meshRef.current) {
      meshRef.current.rotation.y = t * 0.4;
      meshRef.current.position.y = Math.sin(t * 0.8) * 0.15;
    }
    if (ringRef.current) {
      ringRef.current.rotation.x = t * 0.3;
      ringRef.current.rotation.z = t * 0.2;
    }
    if (ring2Ref.current) {
      ring2Ref.current.rotation.x = -t * 0.25;
      ring2Ref.current.rotation.y = t * 0.35;
    }
    if (glowRef.current) {
      const scale = 1 + Math.sin(t * 2) * 0.05;
      glowRef.current.scale.setScalar(scale);
      (glowRef.current.material as THREE.MeshBasicMaterial).opacity = 0.08 + Math.sin(t * 1.5) * 0.03;
    }
  });

  return (
    <group position={[0, 0, 0]}>
      {/* Outer glow sphere */}
      <Sphere ref={glowRef} args={[1.8, 32, 32]}>
        <meshBasicMaterial color="#00f5ff" transparent opacity={0.08} side={THREE.BackSide} />
      </Sphere>

      {/* Main holographic body */}
      <Float speed={1.5} rotationIntensity={0.2} floatIntensity={0.3}>
        <mesh ref={meshRef}>
          <icosahedronGeometry args={[1, 4]} />
          <MeshDistortMaterial
            color="#00f5ff"
            emissive="#0066ff"
            emissiveIntensity={0.6}
            metalness={0.9}
            roughness={0.1}
            distort={0.3}
            speed={2}
            transparent
            opacity={0.85}
            wireframe={false}
          />
        </mesh>
      </Float>

      {/* Inner wireframe */}
      <Float speed={2} rotationIntensity={0.5} floatIntensity={0.2}>
        <mesh>
          <icosahedronGeometry args={[0.85, 2]} />
          <meshBasicMaterial color="#00f5ff" wireframe transparent opacity={0.3} />
        </mesh>
      </Float>

      {/* Orbital rings */}
      <mesh ref={ringRef}>
        <torusGeometry args={[1.5, 0.015, 8, 100]} />
        <meshBasicMaterial color="#7c3aed" transparent opacity={0.7} />
      </mesh>
      <mesh ref={ring2Ref}>
        <torusGeometry args={[1.8, 0.01, 8, 100]} />
        <meshBasicMaterial color="#00f5ff" transparent opacity={0.5} />
      </mesh>

      {/* Data particles */}
      <Sparkles
        count={80}
        scale={4}
        size={1.5}
        speed={0.4}
        color="#00f5ff"
        opacity={0.6}
      />
      <Sparkles
        count={40}
        scale={3}
        size={2}
        speed={0.2}
        color="#7c3aed"
        opacity={0.5}
      />
    </group>
  );
}

// ─── FLOATING DATA NODES ─────────────────────────────────────────────────────
function DataNode({ position, color, label, value, delay = 0 }: {
  position: [number, number, number];
  color: string;
  label: string;
  value: string;
  delay?: number;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const lineRef = useRef<THREE.Line>(null);

  useFrame((state) => {
    const t = state.clock.elapsedTime + delay;
    if (meshRef.current) {
      meshRef.current.position.y = position[1] + Math.sin(t * 0.8) * 0.1;
      meshRef.current.rotation.y = t * 0.5;
    }
  });

  return (
    <group position={position}>
      <mesh ref={meshRef}>
        <octahedronGeometry args={[0.12, 0]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={1.2}
          metalness={1}
          roughness={0}
        />
      </mesh>
      <Billboard>
        <Html center distanceFactor={8}>
          <div style={{
            background: "rgba(0,0,0,0.85)",
            border: `1px solid ${color}`,
            borderRadius: "6px",
            padding: "4px 10px",
            color: color,
            fontSize: "10px",
            fontFamily: "monospace",
            whiteSpace: "nowrap",
            textShadow: `0 0 8px ${color}`,
            boxShadow: `0 0 12px ${color}40`,
          }}>
            <div style={{ opacity: 0.6, fontSize: "8px" }}>{label}</div>
            <div style={{ fontWeight: "bold", fontSize: "12px" }}>{value}</div>
          </div>
        </Html>
      </Billboard>
    </group>
  );
}

// ─── NEURAL GRID FLOOR ───────────────────────────────────────────────────────
function NeuralGrid() {
  const gridRef = useRef<THREE.Mesh>(null);
  useFrame((state) => {
    if (gridRef.current) {
      (gridRef.current.material as THREE.MeshBasicMaterial).opacity =
        0.15 + Math.sin(state.clock.elapsedTime * 0.5) * 0.05;
    }
  });
  return (
    <mesh ref={gridRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, -2.5, 0]}>
      <planeGeometry args={[30, 30, 30, 30]} />
      <meshBasicMaterial color="#00f5ff" wireframe transparent opacity={0.15} />
    </mesh>
  );
}

// ─── AMBIENT PARTICLE FIELD ──────────────────────────────────────────────────
function ParticleField() {
  const pointsRef = useRef<THREE.Points>(null);
  const count = 300;

  const positions = useMemo(() => {
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 20;
      pos[i * 3 + 1] = (Math.random() - 0.5) * 12;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 20;
    }
    return pos;
  }, []);

  useFrame((state) => {
    if (pointsRef.current) {
      pointsRef.current.rotation.y = state.clock.elapsedTime * 0.02;
    }
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" count={count} array={positions} itemSize={3} />
      </bufferGeometry>
      <pointsMaterial color="#00f5ff" size={0.04} transparent opacity={0.4} sizeAttenuation />
    </points>
  );
}

// ─── MAIN 3D SCENE ───────────────────────────────────────────────────────────
function Scene3D({ stats, section }: { stats: any; section: Section }) {
  return (
    <>
      <PerspectiveCamera makeDefault position={[0, 1, 6]} fov={60} />
      <OrbitControls
        enablePan={false}
        enableZoom={false}
        maxPolarAngle={Math.PI / 1.8}
        minPolarAngle={Math.PI / 3}
        autoRotate
        autoRotateSpeed={0.3}
      />

      {/* Lighting */}
      <ambientLight intensity={0.1} />
      <pointLight position={[0, 5, 0]} color="#00f5ff" intensity={2} distance={15} />
      <pointLight position={[-5, 0, 3]} color="#7c3aed" intensity={1.5} distance={12} />
      <pointLight position={[5, 0, -3]} color="#ec4899" intensity={1} distance={10} />

      {/* Background */}
      <Stars radius={80} depth={50} count={3000} factor={3} saturation={0} fade speed={0.5} />

      {/* Core elements */}
      <HolographicClone active={section === "overview"} />
      <NeuralGrid />
      <ParticleField />

      {/* Data nodes floating around the clone */}
      {stats && (
        <>
          <DataNode
            position={[-3, 1, 0]}
            color="#00f5ff"
            label="UPLOADS"
            value={String(stats.uploads?.total || 0)}
            delay={0}
          />
          <DataNode
            position={[3, 0.5, 0.5]}
            color="#7c3aed"
            label="FRAMES"
            value={String(stats.frames?.total || 0)}
            delay={1}
          />
          <DataNode
            position={[-2.5, -0.5, 1.5]}
            color="#10b981"
            label="APPROVED"
            value={String(stats.frames?.approved || 0)}
            delay={2}
          />
          <DataNode
            position={[2.5, 1.5, -1]}
            color="#f59e0b"
            label="DATASETS"
            value={String(stats.datasets?.total || 0)}
            delay={3}
          />
          <DataNode
            position={[0, 2.2, -2]}
            color="#ec4899"
            label="MODEL"
            value={stats.models?.active_version || "v1"}
            delay={4}
          />
        </>
      )}
    </>
  );
}

// ─── UPLOAD ZONE ─────────────────────────────────────────────────────────────
function UploadZone({ onUpload }: { onUpload: (files: File[]) => void }) {
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: { "image/*": [], "video/*": [] },
    onDrop: onUpload,
    multiple: true,
  });

  return (
    <div
      {...getRootProps()}
      className={`relative border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer transition-all duration-300 ${
        isDragActive
          ? "border-cyan-400 bg-cyan-400/10 scale-[1.02]"
          : "border-white/20 hover:border-cyan-400/60 hover:bg-white/5"
      }`}
    >
      <input {...getInputProps()} />
      <div className="flex flex-col items-center gap-4">
        <div className={`text-6xl transition-transform duration-300 ${isDragActive ? "scale-125" : ""}`}>
          {isDragActive ? "⚡" : "⬆"}
        </div>
        <div className="text-white text-xl font-bold tracking-wider">
          {isDragActive ? "DROP TO INGEST" : "DRAG PHOTOS & VIDEOS"}
        </div>
        <div className="text-white/40 text-sm">
          JPG · PNG · MP4 · MOV · WEBM — Any resolution accepted
        </div>
        <div className="mt-2 px-6 py-2 bg-cyan-500/20 border border-cyan-500/40 rounded-full text-cyan-400 text-sm font-mono">
          or click to browse files
        </div>
      </div>
      {isDragActive && (
        <div className="absolute inset-0 rounded-2xl bg-cyan-400/5 animate-pulse pointer-events-none" />
      )}
    </div>
  );
}

// ─── STAT CARD ───────────────────────────────────────────────────────────────
function StatCard({ label, value, sub, color, icon }: {
  label: string; value: string | number; sub?: string; color: string; icon: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative overflow-hidden rounded-2xl p-5"
      style={{
        background: `linear-gradient(135deg, ${color}15, transparent)`,
        border: `1px solid ${color}30`,
      }}
    >
      <div className="absolute top-0 right-0 w-24 h-24 rounded-full blur-2xl opacity-20"
        style={{ background: color, transform: "translate(30%, -30%)" }} />
      <div className="text-3xl mb-2">{icon}</div>
      <div className="text-3xl font-black text-white tracking-tight">{value}</div>
      <div className="text-xs font-bold tracking-widest mt-1" style={{ color }}>{label}</div>
      {sub && <div className="text-white/30 text-xs mt-1">{sub}</div>}
    </motion.div>
  );
}

// ─── GPU STATUS BADGE ─────────────────────────────────────────────────────────
function GpuBadge({ gpuInfo }: { gpuInfo: any }) {
  if (!gpuInfo) return null;
  return (
    <div className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-mono ${
      gpuInfo.detected
        ? "bg-green-500/20 border border-green-500/40 text-green-400"
        : "bg-orange-500/20 border border-orange-500/40 text-orange-400"
    }`}>
      <div className={`w-2 h-2 rounded-full animate-pulse ${gpuInfo.detected ? "bg-green-400" : "bg-orange-400"}`} />
      {gpuInfo.detected
        ? `GPU: ${gpuInfo.name} · ${Math.round((gpuInfo.vramMb || 0) / 1024)}GB VRAM`
        : "No GPU — Remote Training Mode"
      }
    </div>
  );
}

// ─── MODEL VERSION CARD ───────────────────────────────────────────────────────
function ModelCard({ model, onPromote, onArchive, onEvaluate }: {
  model: any;
  onPromote: (id: number) => void;
  onArchive: (id: number) => void;
  onEvaluate: (id: number) => void;
}) {
  const statusColors: Record<string, string> = {
    promoted: "#f97316",
    evaluated: "#10b981",
    trained: "#06b6d4",
    training: "#f59e0b",
    pending: "#6b7280",
    archived: "#374151",
  };
  const color = statusColors[model.status] || "#6b7280";

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="relative rounded-2xl overflow-hidden"
      style={{ background: `linear-gradient(135deg, ${color}10, #0a0a0f)`, border: `1px solid ${color}30` }}
    >
      {model.promoted_to_production === 1 && (
        <div className="absolute top-3 right-3 px-2 py-0.5 rounded-full text-xs font-bold bg-orange-500/30 text-orange-400 border border-orange-500/40">
          ★ PRODUCTION
        </div>
      )}
      <div className="p-5">
        <div className="flex items-start justify-between mb-3">
          <div>
            <div className="text-white font-black text-lg">{model.model_name}</div>
            <div className="text-white/40 text-xs font-mono">{model.version}</div>
          </div>
          <div className="px-2 py-1 rounded-lg text-xs font-bold uppercase"
            style={{ background: `${color}20`, color, border: `1px solid ${color}40` }}>
            {model.status}
          </div>
        </div>

        {/* Score bars */}
        {(model.identity_score || model.avg_identity) && (
          <div className="space-y-2 mb-4">
            {[
              { label: "Identity", val: model.identity_score || model.avg_identity, color: "#00f5ff" },
              { label: "Realism", val: model.realism_score || model.avg_realism, color: "#7c3aed" },
              { label: "Consistency", val: model.consistency_score || model.avg_consistency, color: "#10b981" },
            ].map(s => (
              <div key={s.label}>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-white/50">{s.label}</span>
                  <span style={{ color: s.color }}>{Number(s.val || 0).toFixed(1)}/10</span>
                </div>
                <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${((s.val || 0) / 10) * 100}%` }}
                    transition={{ duration: 1, delay: 0.2 }}
                    className="h-full rounded-full"
                    style={{ background: s.color }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="flex gap-2">
          {model.status !== "promoted" && ["trained", "evaluated"].includes(model.status) && (
            <button
              onClick={() => onPromote(model.id)}
              className="flex-1 py-2 rounded-xl text-xs font-bold bg-orange-500/20 text-orange-400 border border-orange-500/30 hover:bg-orange-500/30 transition-all"
            >
              ★ PROMOTE
            </button>
          )}
          {["trained", "evaluated"].includes(model.status) && (
            <button
              onClick={() => onEvaluate(model.id)}
              className="flex-1 py-2 rounded-xl text-xs font-bold bg-pink-500/20 text-pink-400 border border-pink-500/30 hover:bg-pink-500/30 transition-all"
            >
              ⊛ EVALUATE
            </button>
          )}
          {!["promoted", "archived"].includes(model.status) && (
            <button
              onClick={() => onArchive(model.id)}
              className="py-2 px-3 rounded-xl text-xs font-bold bg-white/5 text-white/30 border border-white/10 hover:bg-white/10 transition-all"
            >
              ↓
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
}

// ─── TRAINING JOB ROW ─────────────────────────────────────────────────────────
function TrainingJobRow({ job }: { job: any }) {
  const statusColors: Record<string, string> = {
    completed: "#10b981",
    running: "#f59e0b",
    queued: "#06b6d4",
    failed: "#ef4444",
    cancelled: "#6b7280",
    packaging: "#8b5cf6",
    detecting_gpu: "#00f5ff",
  };
  const color = statusColors[job.status] || "#6b7280";

  return (
    <div className="flex items-center gap-4 p-4 rounded-xl bg-white/5 border border-white/10 hover:border-white/20 transition-all">
      <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: color }} />
      <div className="flex-1 min-w-0">
        <div className="text-white text-sm font-bold truncate">
          {job.model_name || "fluxdevCam"} {job.version || ""}
        </div>
        <div className="text-white/40 text-xs font-mono">
          {job.training_backend} · {job.dataset_name || `Dataset #${job.dataset_id}`}
        </div>
      </div>
      <div className="text-xs font-bold px-3 py-1 rounded-full"
        style={{ background: `${color}20`, color, border: `1px solid ${color}40` }}>
        {job.status.toUpperCase()}
      </div>
      <div className="text-white/30 text-xs font-mono">
        {new Date(job.created_at).toLocaleDateString()}
      </div>
    </div>
  );
}

// ─── SECTION CONTENT ─────────────────────────────────────────────────────────
function SectionContent({
  section,
  stats,
  gpuInfo,
  productionModel,
}: {
  section: Section;
  stats: any;
  gpuInfo: any;
  productionModel: any;
}) {
  const utils = trpc.useUtils();

  // Queries
  const uploadsQ = trpc.cloneTrainingLab.getUploads.useQuery(undefined, { enabled: section === "upload" });
  const framesQ = trpc.cloneTrainingLab.getFrames.useQuery(
    { limit: 60, approvedOnly: false, qualityTier: "all" },
    { enabled: section === "frames" }
  );
  const datasetsQ = trpc.cloneTrainingLab.getDatasets.useQuery(undefined, { enabled: section === "dataset" });
  const jobsQ = trpc.cloneTrainingLab.getTrainingJobs.useQuery(undefined, { enabled: section === "training" });
  const modelsQ = trpc.cloneTrainingLab.getModelVersions.useQuery(undefined, { enabled: section === "registry" || section === "evaluation" || section === "promote" });

  // Mutations
  const registerUpload = trpc.cloneTrainingLab.registerUpload.useMutation();
  const processUpload = trpc.cloneTrainingLab.processUpload.useMutation();
  const scoreAll = trpc.cloneTrainingLab.scoreAllFrames.useMutation();
  const createDataset = trpc.cloneTrainingLab.createDataset.useMutation();
  const buildDataset = trpc.cloneTrainingLab.buildDataset.useMutation();
  const generateCaptions = trpc.cloneTrainingLab.generateCaptions.useMutation();
  const startTraining = trpc.cloneTrainingLab.startTraining.useMutation();
  const promoteModel = trpc.cloneTrainingLab.promoteToProduction.useMutation();
  const archiveModel = trpc.cloneTrainingLab.archiveModel.useMutation();

  const [uploadProgress, setUploadProgress] = useState<string>("");
  const [datasetName, setDatasetName] = useState("KingCam Training Set v" + new Date().toISOString().slice(0, 10));
  const [evalModelId, setEvalModelId] = useState<number | null>(null);
  const [evalForm, setEvalForm] = useState({ prompt: "", outputUrl: "", identity: 8, realism: 8, consistency: 8, rating: 5 });
  const addEval = trpc.cloneTrainingLab.addEvaluation.useMutation();
  const evalsQ = trpc.cloneTrainingLab.getEvaluations.useQuery(
    { modelVersionId: evalModelId! },
    { enabled: !!evalModelId }
  );

  const handleFileDrop = useCallback(async (files: File[]) => {
    for (const file of files) {
      setUploadProgress(`Uploading ${file.name}...`);
      try {
        // Save to server via FormData
        const formData = new FormData();
        formData.append("file", file);
        const res = await fetch("/api/upload/clone-training", {
          method: "POST",
          body: formData,
        });
        const { storagePath, storageUrl } = await res.json();

        const { uploadId } = await registerUpload.mutateAsync({
          sourceType: file.type.startsWith("video") ? "video" : "image",
          originalFilename: file.name,
          storagePath,
          storageUrl,
          mimeType: file.type,
          fileSize: file.size,
        });

        setUploadProgress(`Processing ${file.name}...`);
        await processUpload.mutateAsync({ uploadId });
        setUploadProgress(`✓ ${file.name} processed`);
      } catch (e) {
        setUploadProgress(`✗ ${file.name}: ${(e as Error).message}`);
      }
    }
    utils.cloneTrainingLab.getUploads.invalidate();
    setTimeout(() => setUploadProgress(""), 3000);
  }, [registerUpload, processUpload, utils]);

  // ── OVERVIEW ──
  if (section === "overview") {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-3xl font-black text-white tracking-tight">CLONE COMMAND CENTER</h2>
          <p className="text-white/40 text-sm mt-1">
            Train · Evaluate · Deploy your digital identity
          </p>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="UPLOADS" value={stats?.uploads?.total || 0} icon="⬆" color="#00f5ff" sub={`${stats?.uploads?.done || 0} processed`} />
          <StatCard label="FRAMES" value={stats?.frames?.total || 0} icon="⊞" color="#7c3aed" sub={`${stats?.frames?.approved || 0} approved`} />
          <StatCard label="DATASETS" value={stats?.datasets?.total || 0} icon="◉" color="#10b981" />
          <StatCard label="ACTIVE MODEL" value={productionModel?.version || "v1"} icon="★" color="#f97316" sub={productionModel?.trigger_word || "fluxdevCam"} />
        </div>
        <div className="flex items-center gap-4">
          <GpuBadge gpuInfo={gpuInfo} />
          {stats?.jobs?.running > 0 && (
            <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-yellow-500/20 border border-yellow-500/40 text-yellow-400 text-sm">
              <div className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse" />
              {stats.jobs.running} training job{stats.jobs.running > 1 ? "s" : ""} running
            </div>
          )}
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {SECTIONS.slice(1).map(s => (
            <div key={s.id}
              className="p-4 rounded-xl cursor-pointer transition-all hover:scale-[1.02]"
              style={{ background: `${s.color}10`, border: `1px solid ${s.color}30` }}
            >
              <div className="text-2xl mb-2">{s.icon}</div>
              <div className="text-white font-bold text-sm">{s.label}</div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ── UPLOAD ──
  if (section === "upload") {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-3xl font-black text-white tracking-tight">ASSET INGEST</h2>
          <p className="text-white/40 text-sm mt-1">Upload photos and videos to build your training dataset</p>
        </div>
        <UploadZone onUpload={handleFileDrop} />
        {uploadProgress && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="px-4 py-3 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-sm font-mono"
          >
            {uploadProgress}
          </motion.div>
        )}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-white font-bold">RECENT UPLOADS</h3>
            <span className="text-white/30 text-sm">{uploadsQ.data?.length || 0} total</span>
          </div>
          {uploadsQ.data?.map((u: any) => (
            <div key={u.id} className="flex items-center gap-4 p-4 rounded-xl bg-white/5 border border-white/10">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg ${
                u.source_type === "video" ? "bg-purple-500/20 text-purple-400" : "bg-cyan-500/20 text-cyan-400"
              }`}>
                {u.source_type === "video" ? "▶" : "◻"}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-white text-sm font-bold truncate">{u.original_filename}</div>
                <div className="text-white/40 text-xs">
                  {u.frame_count || 0} frames · {u.approved_frames || 0} approved
                </div>
              </div>
              <div className={`px-3 py-1 rounded-full text-xs font-bold ${
                u.processing_status === "done" ? "bg-green-500/20 text-green-400" :
                u.processing_status === "processing" ? "bg-yellow-500/20 text-yellow-400" :
                u.processing_status === "rejected" ? "bg-red-500/20 text-red-400" :
                "bg-white/10 text-white/40"
              }`}>
                {u.processing_status}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ── FRAMES ──
  if (section === "frames") {
    return (
      <div className="space-y-6">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-3xl font-black text-white tracking-tight">FRAME LIBRARY</h2>
            <p className="text-white/40 text-sm mt-1">
              {framesQ.data?.length || 0} frames extracted · {framesQ.data?.filter((f: any) => f.approved_for_training).length || 0} approved
            </p>
          </div>
          <button
            onClick={() => scoreAll.mutateAsync({}).then(() => framesQ.refetch())}
            disabled={scoreAll.isPending}
            className="px-5 py-2.5 rounded-xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 text-sm font-bold hover:bg-cyan-500/30 transition-all disabled:opacity-50"
          >
            {scoreAll.isPending ? "Scoring..." : "⚡ Score All"}
          </button>
        </div>

        {/* Quality tier legend */}
        <div className="flex gap-3 flex-wrap">
          {[
            { tier: "excellent", color: "#10b981", count: framesQ.data?.filter((f: any) => f.quality_tier === "excellent").length || 0 },
            { tier: "good", color: "#06b6d4", count: framesQ.data?.filter((f: any) => f.quality_tier === "good").length || 0 },
            { tier: "usable", color: "#f59e0b", count: framesQ.data?.filter((f: any) => f.quality_tier === "usable").length || 0 },
            { tier: "reject", color: "#ef4444", count: framesQ.data?.filter((f: any) => f.quality_tier === "reject").length || 0 },
          ].map(t => (
            <div key={t.tier} className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold"
              style={{ background: `${t.color}15`, border: `1px solid ${t.color}30`, color: t.color }}>
              <div className="w-2 h-2 rounded-full" style={{ background: t.color }} />
              {t.tier.toUpperCase()} · {t.count}
            </div>
          ))}
        </div>

        {/* Frame grid */}
        <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-2">
          {framesQ.data?.map((frame: any) => {
            const tierColors: Record<string, string> = {
              excellent: "#10b981", good: "#06b6d4", usable: "#f59e0b", reject: "#ef4444"
            };
            const color = tierColors[frame.quality_tier] || "#6b7280";
            return (
              <motion.div
                key={frame.id}
                layout
                className="relative aspect-square rounded-xl overflow-hidden group cursor-pointer"
                style={{ border: `2px solid ${color}40` }}
                whileHover={{ scale: 1.05, zIndex: 10 }}
              >
                {frame.storage_url ? (
                  <img src={frame.storage_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-white/5 flex items-center justify-center text-white/20 text-xs font-mono">
                    {frame.id}
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-2">
                  <div className="text-xs font-bold" style={{ color }}>{frame.quality_tier}</div>
                  <div className="text-white/60 text-xs">{frame.quality_score || 0}/100</div>
                </div>
                <div className="absolute top-1 right-1 w-2 h-2 rounded-full" style={{ background: color }} />
                {frame.approved_for_training ? (
                  <div className="absolute top-1 left-1 text-green-400 text-xs">✓</div>
                ) : (
                  <div className="absolute top-1 left-1 text-red-400 text-xs">✗</div>
                )}
              </motion.div>
            );
          })}
        </div>
      </div>
    );
  }

  // ── DATASET ──
  if (section === "dataset") {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-3xl font-black text-white tracking-tight">DATASET BUILDER</h2>
          <p className="text-white/40 text-sm mt-1">Assemble approved frames into training-ready packages</p>
        </div>

        {/* Create new dataset */}
        <div className="p-5 rounded-2xl bg-white/5 border border-white/10 space-y-4">
          <h3 className="text-white font-bold">NEW DATASET</h3>
          <input
            value={datasetName}
            onChange={e => setDatasetName(e.target.value)}
            className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-cyan-400/60"
            placeholder="Dataset name..."
          />
          <div className="flex gap-3">
            <button
              onClick={() => createDataset.mutateAsync({ name: datasetName }).then(() => datasetsQ.refetch())}
              disabled={createDataset.isPending}
              className="flex-1 py-3 rounded-xl bg-green-500/20 text-green-400 border border-green-500/30 font-bold text-sm hover:bg-green-500/30 transition-all disabled:opacity-50"
            >
              {createDataset.isPending ? "Creating..." : "◉ Create Dataset"}
            </button>
          </div>
        </div>

        {/* Existing datasets */}
        <div className="space-y-3">
          {datasetsQ.data?.map((d: any) => (
            <div key={d.id} className="p-5 rounded-2xl bg-white/5 border border-white/10">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="text-white font-bold">{d.name}</div>
                  <div className="text-white/40 text-xs font-mono">
                    trigger: {d.trigger_word} · {d.approved_images || 0} images
                  </div>
                </div>
                <div className={`px-3 py-1 rounded-full text-xs font-bold ${
                  d.status === "ready" ? "bg-green-500/20 text-green-400" :
                  d.status === "building" ? "bg-yellow-500/20 text-yellow-400" :
                  "bg-white/10 text-white/40"
                }`}>{d.status}</div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => buildDataset.mutateAsync({ datasetId: d.id }).then(() => datasetsQ.refetch())}
                  disabled={buildDataset.isPending}
                  className="px-4 py-2 rounded-xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 text-xs font-bold hover:bg-cyan-500/30 transition-all disabled:opacity-50"
                >
                  {buildDataset.isPending ? "Building..." : "◉ Build"}
                </button>
                <button
                  onClick={() => generateCaptions.mutateAsync({ datasetId: d.id })}
                  disabled={generateCaptions.isPending}
                  className="px-4 py-2 rounded-xl bg-purple-500/20 text-purple-400 border border-purple-500/30 text-xs font-bold hover:bg-purple-500/30 transition-all disabled:opacity-50"
                >
                  {generateCaptions.isPending ? "Generating..." : "✦ Captions"}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ── TRAINING ──
  if (section === "training") {
    return (
      <div className="space-y-6">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-3xl font-black text-white tracking-tight">TRAINING ENGINE</h2>
            <p className="text-white/40 text-sm mt-1">GPU-aware Flux LoRA training pipeline</p>
          </div>
          <GpuBadge gpuInfo={gpuInfo} />
        </div>

        {/* Launch training */}
        <div className="p-5 rounded-2xl bg-gradient-to-br from-yellow-500/10 to-transparent border border-yellow-500/20 space-y-4">
          <h3 className="text-yellow-400 font-bold">⚡ LAUNCH TRAINING JOB</h3>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-white/40 text-xs mb-1 block">DATASET</label>
              <select className="w-full bg-white/10 border border-white/20 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-yellow-400/60">
                {datasetsQ.data?.filter((d: any) => d.status === "ready").map((d: any) => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-white/40 text-xs mb-1 block">STEPS</label>
              <input
                type="number"
                defaultValue={1000}
                min={100}
                max={4000}
                className="w-full bg-white/10 border border-white/20 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-yellow-400/60"
              />
            </div>
          </div>
          <button
            onClick={() => {
              const datasetId = datasetsQ.data?.find((d: any) => d.status === "ready")?.id;
              if (!datasetId) return alert("No ready dataset found. Build a dataset first.");
              startTraining.mutateAsync({ datasetId }).then(() => jobsQ.refetch());
            }}
            disabled={startTraining.isPending}
            className="w-full py-3 rounded-xl bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 font-black text-sm hover:bg-yellow-500/30 transition-all disabled:opacity-50"
          >
            {startTraining.isPending ? "Launching..." : "⚡ LAUNCH TRAINING"}
          </button>
        </div>

        {/* Job list */}
        <div className="space-y-2">
          <h3 className="text-white font-bold">TRAINING HISTORY</h3>
          {jobsQ.data?.map((job: any) => (
            <TrainingJobRow key={job.id} job={job} />
          ))}
          {!jobsQ.data?.length && (
            <div className="text-white/30 text-sm text-center py-8">No training jobs yet</div>
          )}
        </div>
      </div>
    );
  }

  // ── REGISTRY ──
  if (section === "registry") {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-3xl font-black text-white tracking-tight">MODEL REGISTRY</h2>
          <p className="text-white/40 text-sm mt-1">All KingCam clone model versions</p>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {modelsQ.data?.map((model: any) => (
            <ModelCard
              key={model.id}
              model={model}
              onPromote={(id) => promoteModel.mutateAsync({ modelVersionId: id }).then(() => modelsQ.refetch())}
              onArchive={(id) => archiveModel.mutateAsync({ modelVersionId: id }).then(() => modelsQ.refetch())}
              onEvaluate={(id) => setEvalModelId(id)}
            />
          ))}
        </div>
      </div>
    );
  }

  // ── EVALUATION ──
  if (section === "evaluation") {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-3xl font-black text-white tracking-tight">EVALUATION ARENA</h2>
          <p className="text-white/40 text-sm mt-1">Score model outputs · Compare versions · Find the best</p>
        </div>

        {/* Model selector */}
        <div className="flex gap-3 flex-wrap">
          {modelsQ.data?.filter((m: any) => ["trained", "evaluated", "promoted"].includes(m.status)).map((m: any) => (
            <button
              key={m.id}
              onClick={() => setEvalModelId(m.id)}
              className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${
                evalModelId === m.id
                  ? "bg-pink-500/30 text-pink-400 border border-pink-500/50"
                  : "bg-white/5 text-white/50 border border-white/10 hover:border-white/30"
              }`}
            >
              {m.model_name} {m.version}
            </button>
          ))}
        </div>

        {evalModelId && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Add evaluation form */}
            <div className="p-5 rounded-2xl bg-white/5 border border-white/10 space-y-4">
              <h3 className="text-pink-400 font-bold">⊛ ADD EVALUATION</h3>
              <input
                value={evalForm.prompt}
                onChange={e => setEvalForm(f => ({ ...f, prompt: e.target.value }))}
                className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-pink-400/60"
                placeholder="Generation prompt used..."
              />
              <input
                value={evalForm.outputUrl}
                onChange={e => setEvalForm(f => ({ ...f, outputUrl: e.target.value }))}
                className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-pink-400/60"
                placeholder="Output image/video URL..."
              />
              {[
                { key: "identity", label: "Identity Score", color: "#00f5ff" },
                { key: "realism", label: "Realism Score", color: "#7c3aed" },
                { key: "consistency", label: "Consistency Score", color: "#10b981" },
              ].map(s => (
                <div key={s.key}>
                  <div className="flex justify-between text-xs mb-2">
                    <span className="text-white/50">{s.label}</span>
                    <span style={{ color: s.color }}>{evalForm[s.key as keyof typeof evalForm]}/10</span>
                  </div>
                  <input
                    type="range" min={0} max={10} step={0.5}
                    value={evalForm[s.key as keyof typeof evalForm] as number}
                    onChange={e => setEvalForm(f => ({ ...f, [s.key]: parseFloat(e.target.value) }))}
                    className="w-full accent-pink-500"
                  />
                </div>
              ))}
              <button
                onClick={() => addEval.mutateAsync({
                  modelVersionId: evalModelId,
                  prompt: evalForm.prompt,
                  outputUrl: evalForm.outputUrl,
                  identityScore: evalForm.identity,
                  realismScore: evalForm.realism,
                  consistencyScore: evalForm.consistency,
                  userRating: evalForm.rating,
                }).then(() => evalsQ.refetch())}
                disabled={addEval.isPending || !evalForm.prompt || !evalForm.outputUrl}
                className="w-full py-3 rounded-xl bg-pink-500/20 text-pink-400 border border-pink-500/30 font-bold text-sm hover:bg-pink-500/30 transition-all disabled:opacity-50"
              >
                {addEval.isPending ? "Saving..." : "⊛ SAVE EVALUATION"}
              </button>
            </div>

            {/* Evaluation history */}
            <div className="space-y-3">
              <h3 className="text-white font-bold">EVALUATION HISTORY</h3>
              {evalsQ.data?.map((e: any) => (
                <div key={e.id} className="p-4 rounded-xl bg-white/5 border border-white/10">
                  <div className="text-white/60 text-xs font-mono mb-2 truncate">{e.prompt}</div>
                  {e.output_url && (
                    <img src={e.output_url} alt="" className="w-full h-32 object-cover rounded-lg mb-2" />
                  )}
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { label: "ID", val: e.identity_score, color: "#00f5ff" },
                      { label: "REAL", val: e.realism_score, color: "#7c3aed" },
                      { label: "CONS", val: e.consistency_score, color: "#10b981" },
                    ].map(s => (
                      <div key={s.label} className="text-center">
                        <div className="text-lg font-black" style={{ color: s.color }}>{Number(s.val || 0).toFixed(1)}</div>
                        <div className="text-white/30 text-xs">{s.label}</div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  // ── PROMOTE ──
  if (section === "promote") {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-3xl font-black text-white tracking-tight">PRODUCTION PROMOTION</h2>
          <p className="text-white/40 text-sm mt-1">Deploy the best model version to production</p>
        </div>

        {productionModel && (
          <div className="p-5 rounded-2xl bg-gradient-to-br from-orange-500/15 to-transparent border border-orange-500/30">
            <div className="flex items-center gap-3 mb-3">
              <div className="text-2xl">★</div>
              <div>
                <div className="text-orange-400 font-black text-lg">ACTIVE PRODUCTION MODEL</div>
                <div className="text-white/50 text-sm">{productionModel.model_name} · {productionModel.version}</div>
              </div>
            </div>
            <div className="text-white/40 text-xs font-mono">
              Trigger word: {productionModel.trigger_word} · 
              Promoted: {new Date(productionModel.updated_at).toLocaleDateString()}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {modelsQ.data?.filter((m: any) => ["trained", "evaluated"].includes(m.status)).map((model: any) => (
            <ModelCard
              key={model.id}
              model={model}
              onPromote={(id) => {
                if (confirm(`Promote ${model.model_name} ${model.version} to production? This will replace the current model.`)) {
                  promoteModel.mutateAsync({ modelVersionId: id }).then(() => {
                    modelsQ.refetch();
                    utils.cloneTrainingLab.getDashboardStats.invalidate();
                  });
                }
              }}
              onArchive={(id) => archiveModel.mutateAsync({ modelVersionId: id }).then(() => modelsQ.refetch())}
              onEvaluate={(id) => setEvalModelId(id)}
            />
          ))}
        </div>
      </div>
    );
  }

  return null;
}

// ─── MAIN PAGE ───────────────────────────────────────────────────────────────
export default function CloneTrainingLab() {
  const [activeSection, setActiveSection] = useState<Section>("overview");
  const [show3D, setShow3D] = useState(true);

  const dashQ = trpc.cloneTrainingLab.getDashboardStats.useQuery(undefined, {
    refetchInterval: 10000,
  });

  const stats = dashQ.data?.stats;
  const gpuInfo = dashQ.data?.gpuInfo;
  const productionModel = dashQ.data?.productionModel;

  return (
    <div className="min-h-screen bg-[#030308] text-white overflow-hidden">
      {/* 3D Canvas — full background */}
      {show3D && (
        <div className="fixed inset-0 z-0 pointer-events-none">
          <Canvas
            gl={{ antialias: true, alpha: true }}
            dpr={[1, 1.5]}
            style={{ background: "transparent" }}
          >
            <Suspense fallback={null}>
              <Scene3D stats={stats} section={activeSection} />
            </Suspense>
          </Canvas>
        </div>
      )}

      {/* Gradient overlays */}
      <div className="fixed inset-0 z-[1] pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-b from-[#030308]/40 via-transparent to-[#030308]/80" />
        <div className="absolute bottom-0 left-0 right-0 h-64 bg-gradient-to-t from-[#030308] to-transparent" />
      </div>

      {/* Content layer */}
      <div className="relative z-10 flex h-screen">
        {/* Left sidebar nav */}
        <div className="w-20 lg:w-64 flex-shrink-0 flex flex-col border-r border-white/5 bg-black/40 backdrop-blur-xl">
          {/* Logo */}
          <div className="p-4 lg:p-6 border-b border-white/5">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500 to-purple-600 flex items-center justify-center text-sm font-black">
                K
              </div>
              <div className="hidden lg:block">
                <div className="text-white font-black text-sm tracking-wider">CLONE LAB</div>
                <div className="text-white/30 text-xs">Training OS</div>
              </div>
            </div>
          </div>

          {/* Nav items */}
          <nav className="flex-1 p-2 lg:p-3 space-y-1 overflow-y-auto">
            {SECTIONS.map((s) => (
              <button
                key={s.id}
                onClick={() => setActiveSection(s.id)}
                className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-all text-left ${
                  activeSection === s.id
                    ? "text-white"
                    : "text-white/40 hover:text-white/70 hover:bg-white/5"
                }`}
                style={activeSection === s.id ? {
                  background: `linear-gradient(135deg, ${s.color}20, transparent)`,
                  border: `1px solid ${s.color}30`,
                } : {}}
              >
                <span className="text-xl flex-shrink-0" style={activeSection === s.id ? { color: s.color } : {}}>
                  {s.icon}
                </span>
                <span className="hidden lg:block text-xs font-bold tracking-widest">{s.label}</span>
                {activeSection === s.id && (
                  <div className="hidden lg:block ml-auto w-1.5 h-1.5 rounded-full" style={{ background: s.color }} />
                )}
              </button>
            ))}
          </nav>

          {/* 3D toggle */}
          <div className="p-3 border-t border-white/5">
            <button
              onClick={() => setShow3D(v => !v)}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-white/30 hover:text-white/60 hover:bg-white/5 transition-all text-xs"
            >
              <span>◈</span>
              <span className="hidden lg:block">{show3D ? "3D ON" : "3D OFF"}</span>
            </button>
          </div>
        </div>

        {/* Main content */}
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-5xl mx-auto p-6 lg:p-8">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeSection}
                initial={{ opacity: 0, y: 20, filter: "blur(10px)" }}
                animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                exit={{ opacity: 0, y: -20, filter: "blur(10px)" }}
                transition={{ duration: 0.3, ease: "easeOut" }}
              >
                <SectionContent
                  section={activeSection}
                  stats={stats}
                  gpuInfo={gpuInfo}
                  productionModel={productionModel}
                />
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}
