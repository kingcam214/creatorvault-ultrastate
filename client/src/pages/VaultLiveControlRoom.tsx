/**
 * ============================================================================
 * VAULTLIVE CONTROL ROOM V1
 * ============================================================================
 * The world's first creator-owned multi-platform live streaming command center.
 *
 * Architecture: 3-Zone Spatial Layout
 *   LEFT RAIL  — Setup: Destinations, Metadata, Go Live
 *   CENTER     — Canvas: Stream preview / live status / viewer metrics
 *   RIGHT RAIL — Engagement: Unified chat, tips, pinned products
 *
 * Supported Destinations:
 *   YouTube, Twitch, TikTok, Instagram, Facebook, Kick, Custom RTMP
 *
 * Backend: trpc.vaultLive.* + trpc.vaultlivePro.*
 * ============================================================================
 */
import { useState, useEffect, useRef } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import {
  Radio, Camera, Zap, DollarSign, Users, MessageSquare,
  Plus, X, Check, AlertCircle, Wifi, WifiOff,
  Youtube, Twitch, Instagram, Facebook, Settings,
  ChevronRight, ChevronDown, Eye, Heart, Gift,
  BarChart2, Clock, Signal, Flame, Crown, Copy,
  Play, Square, Mic, MicOff, Video, VideoOff,
  Globe, Link, Key, RefreshCw, TrendingUp, Star,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────
type Platform = "youtube" | "twitch" | "tiktok" | "instagram" | "facebook" | "kick" | "custom";
type StreamStatus = "offline" | "preflight" | "live" | "ending";

interface Destination {
  id: string;
  platform: Platform;
  label: string;
  rtmpUrl: string;
  streamKey: string;
  status: "idle" | "connecting" | "live" | "failed";
  viewers: number;
  health: "excellent" | "good" | "fair" | "poor";
}

interface ChatMessage {
  id: string;
  platform: Platform | "creatorvault";
  username: string;
  text: string;
  timestamp: Date;
  isTip?: boolean;
  tipAmount?: number;
}

// ─── Platform Config ──────────────────────────────────────────────────────────
const PLATFORM_CONFIG: Record<Platform, { label: string; color: string; rtmpBase: string; icon: string }> = {
  youtube:   { label: "YouTube",   color: "#FF0000", rtmpBase: "rtmp://a.rtmp.youtube.com/live2", icon: "YT" },
  twitch:    { label: "Twitch",    color: "#9146FF", rtmpBase: "rtmp://live.twitch.tv/app",       icon: "TW" },
  tiktok:    { label: "TikTok",    color: "#010101", rtmpBase: "rtmp://push.tiktok.com/live",     icon: "TK" },
  instagram: { label: "Instagram", color: "#E1306C", rtmpBase: "rtmps://live-upload.instagram.com:443/rtmp", icon: "IG" },
  facebook:  { label: "Facebook",  color: "#1877F2", rtmpBase: "rtmps://live-api-s.facebook.com:443/rtmp", icon: "FB" },
  kick:      { label: "Kick",      color: "#53FC18", rtmpBase: "rtmp://fa723fc1b171.global-contribute.live-video.net/app", icon: "KK" },
  custom:    { label: "Custom",    color: "#C9A961", rtmpBase: "",                                icon: "CU" },
};

// ─── Platform Badge ───────────────────────────────────────────────────────────
function PlatformBadge({ platform, size = "sm" }: { platform: Platform; size?: "sm" | "md" }) {
  const cfg = PLATFORM_CONFIG[platform];
  const sz = size === "sm" ? "w-6 h-6 text-[9px]" : "w-8 h-8 text-xs";
  return (
    <div
      className={`${sz} rounded flex items-center justify-center font-black text-white flex-shrink-0`}
      style={{ backgroundColor: cfg.color }}
    >
      {cfg.icon}
    </div>
  );
}

// ─── Health Indicator ─────────────────────────────────────────────────────────
function HealthDot({ health }: { health: Destination["health"] }) {
  const colors = { excellent: "#22c55e", good: "#84cc16", fair: "#eab308", poor: "#ef4444" };
  return (
    <span
      className="inline-block w-2 h-2 rounded-full flex-shrink-0"
      style={{ backgroundColor: colors[health] }}
    />
  );
}

// ─── Destination Card ─────────────────────────────────────────────────────────
function DestinationCard({
  dest,
  onRemove,
  isLive,
}: {
  dest: Destination;
  onRemove: (id: string) => void;
  isLive: boolean;
}) {
  return (
    <div
      className="flex items-center gap-3 py-3 border-b last:border-b-0"
      style={{ borderColor: "#2A2A2A" }}
    >
      <PlatformBadge platform={dest.platform} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium" style={{ color: "#F5F5F0" }}>
            {PLATFORM_CONFIG[dest.platform].label}
          </span>
          {dest.label !== PLATFORM_CONFIG[dest.platform].label && (
            <span className="text-xs" style={{ color: "#666" }}>{dest.label}</span>
          )}
        </div>
        <div className="flex items-center gap-2 mt-0.5">
          {isLive ? (
            <>
              <HealthDot health={dest.health} />
              <span className="text-xs" style={{ color: "#888" }}>
                {dest.status === "live" ? `${dest.viewers.toLocaleString()} viewers` : dest.status}
              </span>
            </>
          ) : (
            <span className="text-xs" style={{ color: "#555" }}>Ready</span>
          )}
        </div>
      </div>
      {!isLive && (
        <button
          onClick={() => onRemove(dest.id)}
          className="w-6 h-6 flex items-center justify-center rounded opacity-50 hover:opacity-100 transition-opacity"
          style={{ color: "#888" }}
        >
          <X size={12} />
        </button>
      )}
    </div>
  );
}

// ─── Add Destination Modal ────────────────────────────────────────────────────
function AddDestinationModal({
  onAdd,
  onClose,
}: {
  onAdd: (dest: Omit<Destination, "id" | "status" | "viewers" | "health">) => void;
  onClose: () => void;
}) {
  const [selectedPlatform, setSelectedPlatform] = useState<Platform>("youtube");
  const [streamKey, setStreamKey] = useState("");
  const [customRtmp, setCustomRtmp] = useState("");
  const [label, setLabel] = useState("");

  const handleAdd = () => {
    if (!streamKey.trim()) {
      toast.error("Stream key is required");
      return;
    }
    const cfg = PLATFORM_CONFIG[selectedPlatform];
    onAdd({
      platform: selectedPlatform,
      label: label || cfg.label,
      rtmpUrl: selectedPlatform === "custom" ? customRtmp : cfg.rtmpBase,
      streamKey: streamKey.trim(),
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ backgroundColor: "rgba(0,0,0,0.85)" }}>
      <div className="w-full max-w-md rounded-lg p-6" style={{ backgroundColor: "#141414", border: "1px solid #2A2A2A" }}>
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold" style={{ fontFamily: "'Playfair Display', serif", color: "#F5F5F0" }}>
            Add Destination
          </h3>
          <button onClick={onClose} className="opacity-50 hover:opacity-100 transition-opacity">
            <X size={18} style={{ color: "#F5F5F0" }} />
          </button>
        </div>

        {/* Platform Grid */}
        <div className="grid grid-cols-4 gap-2 mb-5">
          {(Object.keys(PLATFORM_CONFIG) as Platform[]).map((p) => (
            <button
              key={p}
              onClick={() => setSelectedPlatform(p)}
              className="flex flex-col items-center gap-1.5 py-3 rounded transition-all"
              style={{
                backgroundColor: selectedPlatform === p ? "#1E1E1E" : "transparent",
                border: selectedPlatform === p ? "1px solid #C9A961" : "1px solid #2A2A2A",
              }}
            >
              <PlatformBadge platform={p} />
              <span className="text-[10px]" style={{ color: selectedPlatform === p ? "#C9A961" : "#666" }}>
                {PLATFORM_CONFIG[p].label}
              </span>
            </button>
          ))}
        </div>

        {/* Custom Label */}
        <div className="mb-4">
          <label className="block text-xs mb-1.5" style={{ color: "#888" }}>Label (optional)</label>
          <input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder={PLATFORM_CONFIG[selectedPlatform].label}
            className="w-full px-3 py-2.5 rounded text-sm outline-none"
            style={{ backgroundColor: "#1A1A1A", border: "1px solid #2A2A2A", color: "#F5F5F0" }}
          />
        </div>

        {/* Custom RTMP URL (only for custom) */}
        {selectedPlatform === "custom" && (
          <div className="mb-4">
            <label className="block text-xs mb-1.5" style={{ color: "#888" }}>RTMP URL</label>
            <input
              value={customRtmp}
              onChange={(e) => setCustomRtmp(e.target.value)}
              placeholder="rtmp://your-server/live"
              className="w-full px-3 py-2.5 rounded text-sm outline-none font-mono"
              style={{ backgroundColor: "#1A1A1A", border: "1px solid #2A2A2A", color: "#F5F5F0" }}
            />
          </div>
        )}

        {/* Stream Key */}
        <div className="mb-6">
          <label className="block text-xs mb-1.5" style={{ color: "#888" }}>
            Stream Key <span style={{ color: "#C9A961" }}>*</span>
          </label>
          <div className="relative">
            <input
              value={streamKey}
              onChange={(e) => setStreamKey(e.target.value)}
              placeholder="Paste your stream key here"
              type="password"
              className="w-full px-3 py-2.5 rounded text-sm outline-none font-mono pr-10"
              style={{ backgroundColor: "#1A1A1A", border: "1px solid #2A2A2A", color: "#F5F5F0" }}
            />
            <Key size={14} className="absolute right-3 top-1/2 -translate-y-1/2 opacity-40" style={{ color: "#888" }} />
          </div>
          <p className="text-xs mt-1.5" style={{ color: "#555" }}>
            Get this from {PLATFORM_CONFIG[selectedPlatform].label} Studio settings
          </p>
        </div>

        <button
          onClick={handleAdd}
          className="w-full py-3 rounded text-sm font-semibold transition-opacity hover:opacity-90"
          style={{ backgroundColor: "#C9A961", color: "#0A0A0A" }}
        >
          Add Destination
        </button>
      </div>
    </div>
  );
}

// ─── Chat Message ─────────────────────────────────────────────────────────────
function ChatMsg({ msg }: { msg: ChatMessage }) {
  const cfg = msg.platform === "creatorvault"
    ? { color: "#C9A961", icon: "CV" }
    : PLATFORM_CONFIG[msg.platform as Platform];

  return (
    <div className="flex gap-2 py-2 border-b last:border-b-0" style={{ borderColor: "#1E1E1E" }}>
      <div
        className="w-5 h-5 rounded flex items-center justify-center text-[8px] font-black text-white flex-shrink-0 mt-0.5"
        style={{ backgroundColor: cfg.color }}
      >
        {cfg.icon}
      </div>
      <div className="flex-1 min-w-0">
        <span className="text-xs font-semibold mr-1.5" style={{ color: "#C9A961" }}>{msg.username}</span>
        {msg.isTip && (
          <span className="text-xs px-1.5 py-0.5 rounded mr-1.5" style={{ backgroundColor: "#1A2A1A", color: "#22c55e" }}>
            ${msg.tipAmount}
          </span>
        )}
        <span className="text-xs" style={{ color: "#AAAAAA" }}>{msg.text}</span>
      </div>
    </div>
  );
}

// ─── Main Control Room ────────────────────────────────────────────────────────
export default function VaultLiveControlRoom() {
  const { user } = useAuth();
  const [streamStatus, setStreamStatus] = useState<StreamStatus>("offline");
  const [streamTitle, setStreamTitle] = useState("");
  const [streamCategory, setStreamCategory] = useState("Entertainment");
  const [destinations, setDestinations] = useState<Destination[]>([]);
  const [showAddDest, setShowAddDest] = useState(false);
  const [currentStreamId, setCurrentStreamId] = useState<number | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [totalViewers, setTotalViewers] = useState(0);
  const [totalTips, setTotalTips] = useState(0);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [showOBSGuide, setShowOBSGuide] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // ── tRPC mutations ──
  const createStreamMutation = trpc.vaultLive.createStream.useMutation({
    onSuccess: (stream) => {
      setCurrentStreamId(stream.id);
    },
    onError: (e) => toast.error(e.message),
  });

  const startStreamMutation = trpc.vaultLive.startStream.useMutation({
    onSuccess: () => {
      setStreamStatus("live");
      toast.success("You're live across all destinations");
      timerRef.current = setInterval(() => setElapsedSeconds((s) => s + 1), 1000);
    },
    onError: (e) => toast.error(e.message),
  });

  const endStreamMutation = trpc.vaultLive.endStream.useMutation({
    onSuccess: () => {
      setStreamStatus("offline");
      setCurrentStreamId(null);
      setElapsedSeconds(0);
      if (timerRef.current) clearInterval(timerRef.current);
      toast.success("Stream ended. Great session.");
    },
    onError: (e) => toast.error(e.message),
  });

  const addChatMutation = trpc.vaultlivePro.addChatMessage.useMutation();

  // ── Viewer count polling ──
  const { data: viewerData } = trpc.vaultLive.getCurrentViewerCount.useQuery(
    { streamId: currentStreamId! },
    { enabled: !!currentStreamId && streamStatus === "live", refetchInterval: 10000 }
  );

  useEffect(() => {
    if (viewerData) setTotalViewers(viewerData.count ?? 0);
  }, [viewerData]);

  // ── Auto-scroll chat ──
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  // ── Cleanup ──
  useEffect(() => {
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, []);

  // ── Format elapsed time ──
  const formatTime = (s: number) => {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    return h > 0
      ? `${h}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`
      : `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
  };

  // ── Add destination ──
  const handleAddDestination = (dest: Omit<Destination, "id" | "status" | "viewers" | "health">) => {
    const newDest: Destination = {
      ...dest,
      id: Math.random().toString(36).slice(2),
      status: "idle",
      viewers: 0,
      health: "excellent",
    };
    setDestinations((prev) => [...prev, newDest]);
  };

  // ── Remove destination ──
  const handleRemoveDestination = (id: string) => {
    setDestinations((prev) => prev.filter((d) => d.id !== id));
  };

  // ── Go Live ──
  const handleGoLive = async () => {
    if (!streamTitle.trim()) { toast.error("Add a stream title first"); return; }
    if (destinations.length === 0) { toast.error("Add at least one destination"); return; }
    setStreamStatus("preflight");
    try {
      const stream = await createStreamMutation.mutateAsync({ title: streamTitle });
      await startStreamMutation.mutateAsync({ streamId: stream.id });
      setDestinations((prev) =>
        prev.map((d) => ({ ...d, status: "live" as const }))
      );
    } catch {
      setStreamStatus("offline");
    }
  };

  // ── End Stream ──
  const handleEndStream = () => {
    if (!currentStreamId) return;
    setStreamStatus("ending");
    setDestinations((prev) => prev.map((d) => ({ ...d, status: "idle" as const })));
    endStreamMutation.mutate({ streamId: currentStreamId });
  };

  // ── Send Chat ──
  const handleSendChat = () => {
    if (!chatInput.trim() || !currentStreamId) return;
    const msg: ChatMessage = {
      id: Math.random().toString(36).slice(2),
      platform: "creatorvault",
      username: user?.username ?? "KingCam",
      text: chatInput.trim(),
      timestamp: new Date(),
    };
    setChatMessages((prev) => [...prev, msg]);
    addChatMutation.mutate({
      streamId: currentStreamId,
      destinationId: undefined,
      username: msg.username,
      message: msg.text,
    });
    setChatInput("");
  };

  // ── Copy RTMP info ──
  const copyRTMP = (dest: Destination) => {
    navigator.clipboard.writeText(`URL: ${dest.rtmpUrl}\nKey: ${dest.streamKey}`);
    toast.success("RTMP info copied");
  };

  const isLive = streamStatus === "live";
  const isPreflight = streamStatus === "preflight";

  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen" style={{ backgroundColor: "#0A0A0A", fontFamily: "'Inter', sans-serif" }}>

      {/* ── Top Bar ── */}
      <div
        className="flex items-center justify-between px-6 py-4 border-b"
        style={{ borderColor: "#1E1E1E", backgroundColor: "#0D0D0D" }}
      >
        <div className="flex items-center gap-3">
          <Radio size={20} style={{ color: isLive ? "#ef4444" : "#C9A961" }} />
          <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.1rem", color: "#F5F5F0", fontWeight: 700 }}>
            VaultLive Control Room
          </h1>
          {isLive && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded" style={{ backgroundColor: "#1A0A0A" }}>
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              <span className="text-xs font-semibold text-red-400">LIVE</span>
              <span className="text-xs ml-1" style={{ color: "#888" }}>{formatTime(elapsedSeconds)}</span>
            </div>
          )}
        </div>
        <div className="flex items-center gap-4">
          {isLive && (
            <>
              <div className="flex items-center gap-1.5">
                <Eye size={14} style={{ color: "#888" }} />
                <span className="text-sm font-semibold" style={{ color: "#F5F5F0" }}>{totalViewers.toLocaleString()}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <DollarSign size={14} style={{ color: "#22c55e" }} />
                <span className="text-sm font-semibold" style={{ color: "#22c55e" }}>${totalTips.toFixed(2)}</span>
              </div>
            </>
          )}
          {!isLive ? (
            <button
              onClick={handleGoLive}
              disabled={isPreflight || destinations.length === 0 || !streamTitle.trim()}
              className="flex items-center gap-2 px-5 py-2.5 rounded text-sm font-semibold transition-all disabled:opacity-40"
              style={{ backgroundColor: "#C9A961", color: "#0A0A0A" }}
            >
              <Radio size={14} />
              {isPreflight ? "Connecting..." : "Go Live"}
            </button>
          ) : (
            <button
              onClick={handleEndStream}
              className="flex items-center gap-2 px-5 py-2.5 rounded text-sm font-semibold"
              style={{ backgroundColor: "#1A0A0A", border: "1px solid #ef4444", color: "#ef4444" }}
            >
              <Square size={14} />
              End Stream
            </button>
          )}
        </div>
      </div>

      {/* ── 3-Zone Layout ── */}
      <div className="flex" style={{ minHeight: "calc(100vh - 65px)" }}>

        {/* ── LEFT RAIL: Setup ── */}
        <div
          className="w-72 flex-shrink-0 border-r flex flex-col"
          style={{ borderColor: "#1E1E1E", backgroundColor: "#0D0D0D" }}
        >
          {/* Stream Metadata */}
          <div className="p-5 border-b" style={{ borderColor: "#1E1E1E" }}>
            <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: "#555" }}>
              Stream Setup
            </p>
            <input
              value={streamTitle}
              onChange={(e) => setStreamTitle(e.target.value)}
              disabled={isLive}
              placeholder="Stream title..."
              className="w-full px-3 py-2.5 rounded text-sm outline-none mb-3"
              style={{ backgroundColor: "#1A1A1A", border: "1px solid #2A2A2A", color: "#F5F5F0" }}
            />
            <select
              value={streamCategory}
              onChange={(e) => setStreamCategory(e.target.value)}
              disabled={isLive}
              className="w-full px-3 py-2.5 rounded text-sm outline-none"
              style={{ backgroundColor: "#1A1A1A", border: "1px solid #2A2A2A", color: "#F5F5F0" }}
            >
              {["Entertainment", "Gaming", "Music", "Education", "Business", "Lifestyle", "Sports", "News"].map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          {/* Destinations */}
          <div className="p-5 flex-1">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: "#555" }}>
                Destinations ({destinations.length})
              </p>
              {!isLive && (
                <button
                  onClick={() => setShowAddDest(true)}
                  className="flex items-center gap-1 text-xs font-semibold transition-opacity hover:opacity-80"
                  style={{ color: "#C9A961" }}
                >
                  <Plus size={12} />
                  Add
                </button>
              )}
            </div>

            {destinations.length === 0 ? (
              <div
                className="rounded-lg p-4 text-center cursor-pointer hover:opacity-80 transition-opacity"
                style={{ border: "1px dashed #2A2A2A" }}
                onClick={() => setShowAddDest(true)}
              >
                <Radio size={24} className="mx-auto mb-2 opacity-30" style={{ color: "#C9A961" }} />
                <p className="text-xs" style={{ color: "#555" }}>Add your first destination</p>
                <p className="text-xs mt-1" style={{ color: "#444" }}>YouTube, Twitch, TikTok, and more</p>
              </div>
            ) : (
              <div>
                {destinations.map((dest) => (
                  <DestinationCard
                    key={dest.id}
                    dest={dest}
                    onRemove={handleRemoveDestination}
                    isLive={isLive}
                  />
                ))}
              </div>
            )}
          </div>

          {/* OBS Guide */}
          <div className="p-5 border-t" style={{ borderColor: "#1E1E1E" }}>
            <button
              onClick={() => setShowOBSGuide(!showOBSGuide)}
              className="flex items-center justify-between w-full text-xs"
              style={{ color: "#888" }}
            >
              <span className="flex items-center gap-1.5">
                <Settings size={12} />
                OBS / Encoder Setup
              </span>
              <ChevronDown size={12} className={`transition-transform ${showOBSGuide ? "rotate-180" : ""}`} />
            </button>
            {showOBSGuide && (
              <div className="mt-3 text-xs space-y-2" style={{ color: "#666" }}>
                <p>1. Open OBS → Settings → Stream</p>
                <p>2. Set Service to "Custom..."</p>
                <p>3. Paste the RTMP URL and Stream Key from each destination above</p>
                <p>4. Click "Go Live" here first, then start streaming in OBS</p>
                <div className="mt-2 pt-2 border-t" style={{ borderColor: "#2A2A2A" }}>
                  {destinations.map((d) => (
                    <div key={d.id} className="flex items-center justify-between py-1">
                      <div className="flex items-center gap-1.5">
                        <PlatformBadge platform={d.platform} size="sm" />
                        <span style={{ color: "#888" }}>{PLATFORM_CONFIG[d.platform].label}</span>
                      </div>
                      <button
                        onClick={() => copyRTMP(d)}
                        className="flex items-center gap-1 hover:opacity-80"
                        style={{ color: "#C9A961" }}
                      >
                        <Copy size={10} />
                        <span>Copy</span>
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── CENTER: Canvas ── */}
        <div className="flex-1 flex flex-col" style={{ backgroundColor: "#0A0A0A" }}>

          {/* Stream Canvas */}
          <div
            className="flex-1 flex items-center justify-center relative"
            style={{ minHeight: "400px", backgroundColor: "#080808" }}
          >
            {!isLive ? (
              <div className="text-center">
                <div
                  className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4"
                  style={{ backgroundColor: "#141414", border: "1px solid #2A2A2A" }}
                >
                  <Radio size={32} style={{ color: "#C9A961", opacity: 0.6 }} />
                </div>
                <p style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.25rem", color: "#F5F5F0" }}>
                  Ready to Go Live
                </p>
                <p className="text-sm mt-2" style={{ color: "#555" }}>
                  {destinations.length === 0
                    ? "Add destinations on the left, then go live"
                    : `${destinations.length} destination${destinations.length > 1 ? "s" : ""} configured — set your title and go`}
                </p>
              </div>
            ) : (
              <div className="w-full h-full flex flex-col">
                {/* Live Status Grid */}
                <div className="grid grid-cols-3 gap-4 p-6">
                  {destinations.map((dest) => (
                    <div
                      key={dest.id}
                      className="rounded-lg p-4"
                      style={{ backgroundColor: "#141414", border: "1px solid #2A2A2A" }}
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <PlatformBadge platform={dest.platform} />
                          <span className="text-sm font-medium" style={{ color: "#F5F5F0" }}>
                            {PLATFORM_CONFIG[dest.platform].label}
                          </span>
                        </div>
                        <HealthDot health={dest.health} />
                      </div>
                      <div className="flex items-center gap-3">
                        <div>
                          <p className="text-xs" style={{ color: "#555" }}>Viewers</p>
                          <p className="text-lg font-bold" style={{ color: "#F5F5F0" }}>
                            {dest.viewers.toLocaleString()}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs" style={{ color: "#555" }}>Status</p>
                          <p className="text-sm font-semibold capitalize" style={{ color: dest.status === "live" ? "#22c55e" : "#eab308" }}>
                            {dest.status}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Total Stats Bar */}
                <div
                  className="mx-6 mb-6 rounded-lg p-4 flex items-center justify-around"
                  style={{ backgroundColor: "#141414", border: "1px solid #2A2A2A" }}
                >
                  <div className="text-center">
                    <p className="text-xs" style={{ color: "#555" }}>Total Viewers</p>
                    <p className="text-2xl font-bold" style={{ color: "#F5F5F0" }}>{totalViewers.toLocaleString()}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs" style={{ color: "#555" }}>Duration</p>
                    <p className="text-2xl font-bold" style={{ color: "#C9A961" }}>{formatTime(elapsedSeconds)}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs" style={{ color: "#555" }}>Tips Earned</p>
                    <p className="text-2xl font-bold" style={{ color: "#22c55e" }}>${totalTips.toFixed(2)}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs" style={{ color: "#555" }}>Destinations</p>
                    <p className="text-2xl font-bold" style={{ color: "#F5F5F0" }}>{destinations.filter(d => d.status === "live").length}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── RIGHT RAIL: Engagement ── */}
        <div
          className="w-72 flex-shrink-0 border-l flex flex-col"
          style={{ borderColor: "#1E1E1E", backgroundColor: "#0D0D0D" }}
        >
          {/* Chat */}
          <div className="flex-1 flex flex-col min-h-0">
            <div className="px-5 py-4 border-b" style={{ borderColor: "#1E1E1E" }}>
              <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: "#555" }}>
                Unified Chat
              </p>
            </div>
            <div className="flex-1 overflow-y-auto px-5 py-3" style={{ maxHeight: "400px" }}>
              {chatMessages.length === 0 ? (
                <div className="text-center py-8">
                  <MessageSquare size={24} className="mx-auto mb-2 opacity-20" style={{ color: "#888" }} />
                  <p className="text-xs" style={{ color: "#444" }}>Chat will appear here</p>
                </div>
              ) : (
                chatMessages.map((msg) => <ChatMsg key={msg.id} msg={msg} />)
              )}
              <div ref={chatEndRef} />
            </div>
            <div className="p-4 border-t" style={{ borderColor: "#1E1E1E" }}>
              <div className="flex gap-2">
                <input
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSendChat()}
                  placeholder="Say something..."
                  disabled={!isLive}
                  className="flex-1 px-3 py-2 rounded text-xs outline-none"
                  style={{ backgroundColor: "#1A1A1A", border: "1px solid #2A2A2A", color: "#F5F5F0" }}
                />
                <button
                  onClick={handleSendChat}
                  disabled={!isLive || !chatInput.trim()}
                  className="px-3 py-2 rounded text-xs font-semibold disabled:opacity-40"
                  style={{ backgroundColor: "#C9A961", color: "#0A0A0A" }}
                >
                  Send
                </button>
              </div>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="p-5 border-t" style={{ borderColor: "#1E1E1E" }}>
            <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: "#555" }}>
              Session Stats
            </p>
            <div className="space-y-2">
              {[
                { label: "Peak Viewers", value: totalViewers.toString(), icon: TrendingUp },
                { label: "Chat Messages", value: chatMessages.length.toString(), icon: MessageSquare },
                { label: "Tips Received", value: `$${totalTips.toFixed(2)}`, icon: DollarSign },
              ].map(({ label, value, icon: Icon }) => (
                <div key={label} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Icon size={12} style={{ color: "#555" }} />
                    <span className="text-xs" style={{ color: "#666" }}>{label}</span>
                  </div>
                  <span className="text-xs font-semibold" style={{ color: "#F5F5F0" }}>{value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Add Destination Modal ── */}
      {showAddDest && (
        <AddDestinationModal
          onAdd={handleAddDestination}
          onClose={() => setShowAddDest(false)}
        />
      )}
    </div>
  );
}
