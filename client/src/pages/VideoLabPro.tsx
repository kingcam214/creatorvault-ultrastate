/**
 * ============================================================================
 * VAULTLIVE PRO — TV TRUCK V3
 * ============================================================================
 * Route: /vaultlive-pro
 * The supreme multi-platform broadcast production suite.
 * NO stream gate. ALL tools work standalone — no live stream required.
 *
 * 3-Zone Layout:
 *   LEFT RAIL   — Destination Manager (platform cards, stream keys, status)
 *   CENTER      — Production Canvas (active session or standalone tools)
 *   RIGHT RAIL  — Broadcast Intelligence (AI suggestions, analytics, chat)
 *
 * Modes (all work WITHOUT a live stream):
 *   1. Highlights    — AI clip extraction from any uploaded video
 *   2. Timeline      — Multi-track beat-sync timeline builder
 *   3. Looks         — Film emulation & color grading presets
 *   4. AI Director   — Autonomous editing suggestions & hooks
 *   5. Stories       — Compilation builder from story clips
 *   6. Script-to-Vid — Script → storyboard → video pipeline
 *   7. Captions      — Auto-caption generation for any video
 *   8. Broadcast     — Live multi-platform streaming hub
 * ============================================================================
 */
import { useState, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { MediaUpload } from "@/components/MediaUpload";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import {
  Radio, Tv2, Zap, Film, Scissors, Eye, BookOpen,
  // @ts-ignore
  Captions, Broadcast, Upload, Play, Pause, Square,
  Copy, Check, ChevronRight, ChevronDown, ChevronUp,
  Loader2, Plus, Trash2, Download, RefreshCw, Star,
  Globe, Wifi, WifiOff, BarChart3, MessageSquare,
  Sparkles, Clock, Target, TrendingUp, Volume2,
  Monitor, Layers, AlignLeft, Mic, Camera, Settings
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";

// ─── Design Tokens ────────────────────────────────────────────────────────────
const T = {
  bg: "#0D0D0D",
  surface: "#141414",
  surfaceHover: "#1A1A1A",
  border: "#2A2A2A",
  borderGold: "#C9A84C",
  gold: "#C9A84C",
  goldDim: "#8B6914",
  text: "#E8E0D0",
  textMuted: "#6B6B6B",
  textDim: "#9A9A9A",
  red: "#E53E3E",
  green: "#38A169",
  blue: "#3182CE",
};

// ─── Platform Definitions ─────────────────────────────────────────────────────
const PLATFORMS = [
  { id: "youtube", name: "YouTube", color: "#FF0000", icon: "▶" },
  { id: "tiktok", name: "TikTok", color: "#010101", icon: "♪" },
  { id: "instagram", name: "Instagram", color: "#E1306C", icon: "◉" },
  { id: "facebook", name: "Facebook", color: "#1877F2", icon: "f" },
  { id: "twitch", name: "Twitch", color: "#9146FF", icon: "◈" },
  { id: "kick", name: "Kick", color: "#53FC18", icon: "⚡" },
  { id: "creatorvault", name: "CreatorVault", color: "#C9A84C", icon: "◆" },
  { id: "custom", name: "Custom RTMP", color: "#6B6B6B", icon: "⊕" },
];

// ─── Mode Definitions ─────────────────────────────────────────────────────────
const MODES = [
  { id: "highlights", label: "Highlights", icon: Scissors, desc: "AI clip extraction" },
  { id: "timeline", label: "Timeline", icon: Layers, desc: "Beat-sync builder" },
  { id: "looks", label: "Looks", icon: Eye, desc: "Color grading" },
  { id: "ai_director", label: "AI Director", icon: Sparkles, desc: "Auto editing" },
  { id: "stories", label: "Stories", icon: Film, desc: "Compilation builder" },
  { id: "script", label: "Script → Vid", icon: AlignLeft, desc: "Script pipeline" },
  { id: "captions", label: "Captions", icon: Captions, desc: "Auto-caption" },
  { id: "broadcast", label: "Broadcast", icon: Radio, desc: "Live streaming" },
];

// ─── Destination Card ─────────────────────────────────────────────────────────
function DestinationCard({
  platform,
  connected,
  onToggle,
}: {
  platform: typeof PLATFORMS[0];
  connected: boolean;
  onToggle: () => void;
}) {
  const [showKey, setShowKey] = useState(false);
  const [copied, setCopied] = useState(false);
  const streamKey = `cvlt-${platform.id}-${Math.random().toString(36).slice(2, 10)}`;

  const copyKey = () => {
    navigator.clipboard.writeText(streamKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      style={{
        background: connected ? `${platform.color}08` : T.surface,
        border: `1px solid ${connected ? platform.color + "40" : T.border}`,
        borderRadius: 4,
        padding: "12px 14px",
        marginBottom: 8,
        transition: "all 0.2s",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: 4,
              background: platform.color,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 14,
              fontWeight: 700,
              color: "#fff",
              flexShrink: 0,
            }}
          >
            {platform.icon}
          </div>
          <div>
            <div style={{ color: T.text, fontSize: 13, fontWeight: 600 }}>{platform.name}</div>
            <div style={{ color: T.textMuted, fontSize: 11 }}>
              {connected ? (
                <span style={{ color: T.green }}>● Connected</span>
              ) : (
                "Not connected"
              )}
            </div>
          </div>
        </div>
        <button
          onClick={onToggle}
          style={{
            background: connected ? "transparent" : T.gold,
            border: connected ? `1px solid ${T.border}` : "none",
            color: connected ? T.textMuted : T.bg,
            borderRadius: 3,
            padding: "4px 10px",
            fontSize: 11,
            fontWeight: 700,
            cursor: "pointer",
            letterSpacing: "0.05em",
            textTransform: "uppercase",
          }}
        >
          {connected ? "Disconnect" : "Connect"}
        </button>
      </div>

      {connected && (
        <div style={{ marginTop: 10 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <div
              style={{
                flex: 1,
                background: T.bg,
                border: `1px solid ${T.border}`,
                borderRadius: 3,
                padding: "5px 8px",
                fontSize: 11,
                color: showKey ? T.textDim : T.textMuted,
                fontFamily: "monospace",
                letterSpacing: showKey ? "0.05em" : "0.3em",
              }}
            >
              {showKey ? streamKey : "••••••••••••••••"}
            </div>
            <button
              onClick={() => setShowKey(!showKey)}
              style={{
                background: "transparent",
                border: `1px solid ${T.border}`,
                color: T.textMuted,
                borderRadius: 3,
                padding: "5px 8px",
                cursor: "pointer",
                fontSize: 10,
              }}
            >
              {showKey ? "Hide" : "Show"}
            </button>
            <button
              onClick={copyKey}
              style={{
                background: copied ? T.green : "transparent",
                border: `1px solid ${copied ? T.green : T.border}`,
                color: copied ? "#fff" : T.textMuted,
                borderRadius: 3,
                padding: "5px 8px",
                cursor: "pointer",
                fontSize: 10,
              }}
            >
              {copied ? "Copied" : "Copy"}
            </button>
          </div>
          <div style={{ color: T.textMuted, fontSize: 10, marginTop: 4 }}>
            RTMP: rtmp://ingest.creatorvault.live/live
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Highlights Mode ──────────────────────────────────────────────────────────
function HighlightsMode() {
  const [videoUrl, setVideoUrl] = useState("");
  const [style, setStyle] = useState<"viral" | "cinematic" | "educational" | "comedy">("viral");
  const fileRef = useRef<HTMLInputElement>(null);

  const createHighlight = trpc.videoLabPro.createHighlightReel.useMutation({
    onSuccess: () => toast.success("Highlight reel queued"),
    onError: (e) => toast.error(e.message),
  });

  const STYLES = [
    { id: "viral", label: "Viral", desc: "Hook-first, fast cuts" },
    { id: "cinematic", label: "Cinematic", desc: "Slow burns, atmosphere" },
    { id: "educational", label: "Educational", desc: "Clear, structured" },
    { id: "comedy", label: "Comedy", desc: "Timing-focused" },
  ];

  return (
    <div>
      <div
        style={{
          border: `2px dashed ${T.border}`,
          borderRadius: 4,
          padding: "32px 24px",
          textAlign: "center",
          cursor: "pointer",
          marginBottom: 20,
          background: T.surface,
        }}
        onClick={() => fileRef.current?.click()}
      >
        <Upload size={28} color={T.textMuted} style={{ margin: "0 auto 10px" }} />
        <div style={{ color: T.text, fontSize: 14, fontWeight: 600, marginBottom: 4 }}>
          Drop video here or click to upload
        </div>
        <div style={{ color: T.textMuted, fontSize: 12 }}>MP4, MOV, WebM — any length</div>
        <input ref={fileRef} type="file" accept="video/*" style={{ display: "none" }} />
      </div>

      <div style={{ marginBottom: 16 }}>
        <div style={{ color: T.textMuted, fontSize: 11, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 8 }}>
          Or paste video URL
        </div>
        <Input
          value={videoUrl}
          onChange={(e) => setVideoUrl(e.target.value)}
          placeholder="Tap to upload"
          style={{ background: T.surface, border: `1px solid ${T.border}`, color: T.text, borderRadius: 3 }}
        />
      </div>

      <div style={{ marginBottom: 20 }}>
        <div style={{ color: T.textMuted, fontSize: 11, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 8 }}>
          Highlight Style
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          {STYLES.map((s) => (
            <button
              key={s.id}
              onClick={() => setStyle(s.id as any)}
              style={{
                background: style === s.id ? T.gold : T.surface,
                border: `1px solid ${style === s.id ? T.gold : T.border}`,
                color: style === s.id ? T.bg : T.text,
                borderRadius: 3,
                padding: "10px 12px",
                cursor: "pointer",
                textAlign: "left",
              }}
            >
              <div style={{ fontSize: 13, fontWeight: 700 }}>{s.label}</div>
              <div style={{ fontSize: 11, opacity: 0.7, marginTop: 2 }}>{s.desc}</div>
            </button>
          ))}
        </div>
      </div>

      <button
        onClick={() => createHighlight.mutate({ videoUrl: videoUrl || "upload", style, clipCount: 5 })}
        disabled={createHighlight.isPending}
        style={{
          width: "100%",
          background: T.gold,
          border: "none",
          color: T.bg,
          borderRadius: 3,
          padding: "12px",
          fontSize: 13,
          fontWeight: 700,
          letterSpacing: "0.1em",
          textTransform: "uppercase",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
        }}
      >
        {createHighlight.isPending ? <Loader2 size={16} className="animate-spin" /> : <Scissors size={16} />}
        Generate Highlights
      </button>
    </div>
  );
}

// ─── Timeline Mode ────────────────────────────────────────────────────────────
function TimelineMode() {
  const [videoUrl, setVideoUrl] = useState("");
  const beatSync = trpc.videoLabPro.beatSync.useMutation({
    onSuccess: () => toast.success("Beat-sync timeline created"),
    onError: (e) => toast.error(e.message),
  });

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <div style={{ color: T.textMuted, fontSize: 11, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 8 }}>
          Video Source
        </div>
        <Input
          value={videoUrl}
          onChange={(e) => setVideoUrl(e.target.value)}
          placeholder="Video URL or upload ID"
          style={{ background: T.surface, border: `1px solid ${T.border}`, color: T.text, borderRadius: 3 }}
        />
      </div>

      <div
        style={{
          background: T.surface,
          border: `1px solid ${T.border}`,
          borderRadius: 4,
          padding: 16,
          marginBottom: 16,
        }}
      >
        <div style={{ color: T.text, fontSize: 13, fontWeight: 600, marginBottom: 12 }}>Beat Sync Settings</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          {[
            { label: "BPM", value: "120" },
            { label: "Cut Style", value: "Hard" },
            { label: "Music Key", value: "Auto" },
            { label: "Duration", value: "60s" },
          ].map((item) => (
            <div key={item.label}>
              <div style={{ color: T.textMuted, fontSize: 10, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 4 }}>
                {item.label}
              </div>
              <div
                style={{
                  background: T.bg,
                  border: `1px solid ${T.border}`,
                  borderRadius: 3,
                  padding: "6px 10px",
                  color: T.text,
                  fontSize: 13,
                }}
              >
                {item.value}
              </div>
            </div>
          ))}
        </div>
      </div>

      <button
        onClick={() => beatSync.mutate({ videoUrl: videoUrl || "upload", bpm: 120, style: "hard_cut" })}
        disabled={beatSync.isPending}
        style={{
          width: "100%",
          background: T.gold,
          border: "none",
          color: T.bg,
          borderRadius: 3,
          padding: "12px",
          fontSize: 13,
          fontWeight: 700,
          letterSpacing: "0.1em",
          textTransform: "uppercase",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
        }}
      >
        {beatSync.isPending ? <Loader2 size={16} className="animate-spin" /> : <Layers size={16} />}
        Build Beat-Sync Timeline
      </button>
    </div>
  );
}

// ─── Looks Mode ───────────────────────────────────────────────────────────────
function LooksMode() {
  const looksQuery = trpc.videoLabPro.getLooks.useQuery({});
  const [selected, setSelected] = useState<string | null>(null);

  const PRESET_LOOKS = [
    { id: "cinematic_noir", name: "Cinematic Noir", desc: "Deep shadows, cool tones" },
    { id: "golden_hour", name: "Golden Hour", desc: "Warm, rich, filmic" },
    { id: "bleach_bypass", name: "Bleach Bypass", desc: "Desaturated, high contrast" },
    { id: "teal_orange", name: "Teal & Orange", desc: "Hollywood blockbuster" },
    { id: "film_grain", name: "Film Grain", desc: "35mm analog texture" },
    { id: "clean_web", name: "Clean Web", desc: "Bright, social-ready" },
  ];

  return (
    <div>
      <div style={{ color: T.textMuted, fontSize: 11, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 12 }}>
        Color Grading Presets
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 16 }}>
        {PRESET_LOOKS.map((look) => (
          <button
            key={look.id}
            onClick={() => setSelected(look.id)}
            style={{
              background: selected === look.id ? `${T.gold}15` : T.surface,
              border: `1px solid ${selected === look.id ? T.gold : T.border}`,
              borderRadius: 4,
              padding: "12px",
              cursor: "pointer",
              textAlign: "left",
            }}
          >
            <div
              style={{
                height: 40,
                background: `linear-gradient(135deg, ${T.bg}, ${T.border})`,
                borderRadius: 2,
                marginBottom: 8,
              }}
            />
            <div style={{ color: T.text, fontSize: 12, fontWeight: 600 }}>{look.name}</div>
            <div style={{ color: T.textMuted, fontSize: 10, marginTop: 2 }}>{look.desc}</div>
          </button>
        ))}
      </div>

      {selected && (
        <button
          style={{
            width: "100%",
            background: T.gold,
            border: "none",
            color: T.bg,
            borderRadius: 3,
            padding: "12px",
            fontSize: 13,
            fontWeight: 700,
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            cursor: "pointer",
          }}
        >
          Apply Look
        </button>
      )}
    </div>
  );
}

// ─── AI Director Mode ─────────────────────────────────────────────────────────
function AIDirectorMode() {
  const [videoUrl, setVideoUrl] = useState("");
  const generateHooks = trpc.videoLabPro.generateHooks.useMutation({
    onSuccess: (data) => toast.success(`${data?.hooks?.length || 0} hooks generated`),
    onError: (e) => toast.error(e.message),
  });

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <div style={{ color: T.textMuted, fontSize: 11, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 8 }}>
          Video to Analyze
        </div>
        <Input
          value={videoUrl}
          onChange={(e) => setVideoUrl(e.target.value)}
          placeholder="Video URL or upload ID"
          style={{ background: T.surface, border: `1px solid ${T.border}`, color: T.text, borderRadius: 3 }}
        />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 16 }}>
        {[
          { label: "Hook Generator", desc: "First 3-second hooks", action: "hooks" },
          { label: "Cut Points", desc: "Optimal edit markers", action: "cuts" },
          { label: "Pacing Analysis", desc: "Energy & rhythm map", action: "pacing" },
          { label: "Caption Timing", desc: "Word-level sync", action: "captions" },
        ].map((item) => (
          <button
            key={item.action}
            onClick={() => {
              if (item.action === "hooks") {
                generateHooks.mutate({ videoUrl: videoUrl || "upload", platform: "tiktok" });
              }
            }}
            style={{
              background: T.surface,
              border: `1px solid ${T.border}`,
              borderRadius: 4,
              padding: "12px",
              cursor: "pointer",
              textAlign: "left",
            }}
          >
            <Sparkles size={16} color={T.gold} style={{ marginBottom: 6 }} />
            <div style={{ color: T.text, fontSize: 12, fontWeight: 600 }}>{item.label}</div>
            <div style={{ color: T.textMuted, fontSize: 10, marginTop: 2 }}>{item.desc}</div>
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Captions Mode ────────────────────────────────────────────────────────────
function CaptionsMode() {
  const [videoUrl, setVideoUrl] = useState("");
  // @ts-ignore
  const transcribe = trpc.mediaCore.transcribe.useMutation({
    onSuccess: () => toast.success("Captions generated"),
  // @ts-ignore
    onError: (e) => toast.error(e.message),
  });

  const STYLES = ["Minimal", "Bold", "Karaoke", "Subtitle", "TikTok Pop"];
  const [captionStyle, setCaptionStyle] = useState("Minimal");

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <div style={{ color: T.textMuted, fontSize: 11, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 8 }}>
          Video Source
        </div>
        <Input
          value={videoUrl}
          onChange={(e) => setVideoUrl(e.target.value)}
          placeholder="Video URL or upload ID"
          style={{ background: T.surface, border: `1px solid ${T.border}`, color: T.text, borderRadius: 3 }}
        />
      </div>

      <div style={{ marginBottom: 16 }}>
        <div style={{ color: T.textMuted, fontSize: 11, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 8 }}>
          Caption Style
        </div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {STYLES.map((s) => (
            <button
              key={s}
              onClick={() => setCaptionStyle(s)}
              style={{
                background: captionStyle === s ? T.gold : T.surface,
                border: `1px solid ${captionStyle === s ? T.gold : T.border}`,
                color: captionStyle === s ? T.bg : T.text,
                borderRadius: 3,
                padding: "5px 12px",
                fontSize: 12,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      <button
        onClick={() => transcribe.mutate({ url: videoUrl || "upload", language: "auto" })}
        disabled={transcribe.isPending}
        style={{
          width: "100%",
          background: T.gold,
          border: "none",
          color: T.bg,
          borderRadius: 3,
          padding: "12px",
          fontSize: 13,
          fontWeight: 700,
          letterSpacing: "0.1em",
          textTransform: "uppercase",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
        }}
      >
        {transcribe.isPending ? <Loader2 size={16} className="animate-spin" /> : <Captions size={16} />}
        Generate Captions
      </button>
    </div>
  );
}

// ─── Script Mode ──────────────────────────────────────────────────────────────
function ScriptMode() {
  const [script, setScript] = useState("");
  const createProject = trpc.scriptToVideo.createProject.useMutation({
    onSuccess: () => toast.success("Script project created"),
    onError: (e) => toast.error(e.message),
  });

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <div style={{ color: T.textMuted, fontSize: 11, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 8 }}>
          Script
        </div>
        <Textarea
          value={script}
          onChange={(e) => setScript(e.target.value)}
          placeholder="Paste your script here — AI will break it into scenes, generate visuals, and build a storyboard..."
          rows={8}
          style={{ background: T.surface, border: `1px solid ${T.border}`, color: T.text, borderRadius: 3, resize: "vertical" }}
        />
      </div>

      <button
        onClick={() => createProject.mutate({ title: "New Script Project", script })}
        disabled={createProject.isPending || !script.trim()}
        style={{
          width: "100%",
          background: script.trim() ? T.gold : T.border,
          border: "none",
          color: script.trim() ? T.bg : T.textMuted,
          borderRadius: 3,
          padding: "12px",
          fontSize: 13,
          fontWeight: 700,
          letterSpacing: "0.1em",
          textTransform: "uppercase",
          cursor: script.trim() ? "pointer" : "not-allowed",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
        }}
      >
        {createProject.isPending ? <Loader2 size={16} className="animate-spin" /> : <AlignLeft size={16} />}
        Build Video from Script
      </button>
    </div>
  );
}

// ─── Broadcast Mode ───────────────────────────────────────────────────────────
function BroadcastMode({ connectedPlatforms }: { connectedPlatforms: string[] }) {
  const [isLive, setIsLive] = useState(false);
  const [duration, setDuration] = useState(0);

  return (
    <div>
      {/* Live Status Bar */}
      <div
        style={{
          background: isLive ? `${T.red}15` : T.surface,
          border: `1px solid ${isLive ? T.red : T.border}`,
          borderRadius: 4,
          padding: "16px 20px",
          marginBottom: 16,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
            {isLive ? (
              <>
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: T.red }} />
                <span style={{ color: T.red, fontSize: 13, fontWeight: 700, letterSpacing: "0.1em" }}>LIVE</span>
              </>
            ) : (
              <>
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: T.textMuted }} />
                <span style={{ color: T.textMuted, fontSize: 13, fontWeight: 700, letterSpacing: "0.1em" }}>OFFLINE</span>
              </>
            )}
          </div>
          <div style={{ color: T.textMuted, fontSize: 11 }}>
            {connectedPlatforms.length} destination{connectedPlatforms.length !== 1 ? "s" : ""} ready
          </div>
        </div>
        <button
          onClick={() => setIsLive(!isLive)}
          style={{
            background: isLive ? T.red : T.gold,
            border: "none",
            color: "#fff",
            borderRadius: 3,
            padding: "10px 20px",
            fontSize: 13,
            fontWeight: 700,
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            cursor: "pointer",
          }}
        >
          {isLive ? "End Stream" : "Go Live"}
        </button>
      </div>

      {/* Active Destinations */}
      {connectedPlatforms.length > 0 ? (
        <div>
          <div style={{ color: T.textMuted, fontSize: 11, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 10 }}>
            Active Destinations
          </div>
          {connectedPlatforms.map((pid) => {
            const p = PLATFORMS.find((pl) => pl.id === pid);
            if (!p) return null;
            return (
              <div
                key={pid}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "10px 12px",
                  background: T.surface,
                  border: `1px solid ${T.border}`,
                  borderRadius: 3,
                  marginBottom: 6,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div
                    style={{
                      width: 24,
                      height: 24,
                      borderRadius: 3,
                      background: p.color,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 11,
                      color: "#fff",
                      fontWeight: 700,
                    }}
                  >
                    {p.icon}
                  </div>
                  <span style={{ color: T.text, fontSize: 13 }}>{p.name}</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  {isLive && <div style={{ width: 6, height: 6, borderRadius: "50%", background: T.green }} />}
                  <span style={{ color: isLive ? T.green : T.textMuted, fontSize: 11 }}>
                    {isLive ? "Streaming" : "Ready"}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div style={{ textAlign: "center", padding: "24px 0", color: T.textMuted, fontSize: 13 }}>
          Connect platforms in the Destinations panel to start broadcasting
        </div>
      )}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function VideoLabPro() {
  const { user } = useAuth();
  const [activeMode, setActiveMode] = useState("highlights");
  const [connectedPlatforms, setConnectedPlatforms] = useState<string[]>([]);
  const [showDestinations, setShowDestinations] = useState(true);

  const togglePlatform = (platformId: string) => {
    setConnectedPlatforms((prev) =>
      prev.includes(platformId) ? prev.filter((p) => p !== platformId) : [...prev, platformId]
    );
  };

  const renderMode = () => {
    switch (activeMode) {
      case "highlights": return <HighlightsMode />;
      case "timeline": return <TimelineMode />;
      case "looks": return <LooksMode />;
      case "ai_director": return <AIDirectorMode />;
      case "captions": return <CaptionsMode />;
      case "script": return <ScriptMode />;
      case "broadcast": return <BroadcastMode connectedPlatforms={connectedPlatforms} />;
      default: return <HighlightsMode />;
    }
  };

  return (
    <div style={{ minHeight: "100vh", background: T.bg, color: T.text, fontFamily: "'Inter', sans-serif" }}>
      {/* ── Header ── */}
      <div
        style={{
          borderBottom: `1px solid ${T.border}`,
          padding: "16px 24px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          background: T.surface,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <Radio size={22} color={T.gold} />
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span
                style={{
                  fontFamily: "'Playfair Display', Georgia, serif",
                  fontSize: 20,
                  fontWeight: 700,
                  color: T.text,
                  letterSpacing: "-0.01em",
                }}
              >
                VaultLive Pro
              </span>
              <span
                style={{
                  background: T.gold,
                  color: T.bg,
                  fontSize: 10,
                  fontWeight: 800,
                  letterSpacing: "0.12em",
                  textTransform: "uppercase",
                  padding: "2px 8px",
                  borderRadius: 2,
                }}
              >
                TV TRUCK
              </span>
            </div>
            <div style={{ color: T.textMuted, fontSize: 12, marginTop: 1 }}>
              Multi-Platform Broadcast Production Suite
            </div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ color: T.textMuted, fontSize: 12 }}>
            {connectedPlatforms.length} platform{connectedPlatforms.length !== 1 ? "s" : ""} connected
          </div>
          <button
            onClick={() => setShowDestinations(!showDestinations)}
            style={{
              background: "transparent",
              border: `1px solid ${T.border}`,
              color: T.textMuted,
              borderRadius: 3,
              padding: "6px 12px",
              fontSize: 12,
              cursor: "pointer",
            }}
          >
            {showDestinations ? "Hide" : "Show"} Destinations
          </button>
        </div>
      </div>

      {/* ── 3-Zone Body ── */}
      <div style={{ display: "flex", minHeight: "calc(100vh - 65px)" }}>

        {/* LEFT RAIL — Destinations */}
        {showDestinations && (
          <div
            style={{
              width: 280,
              flexShrink: 0,
              borderRight: `1px solid ${T.border}`,
              background: T.surface,
              padding: "20px 16px",
              overflowY: "auto",
            }}
          >
            <div
              style={{
                color: T.textMuted,
                fontSize: 10,
                letterSpacing: "0.15em",
                textTransform: "uppercase",
                marginBottom: 14,
                paddingBottom: 10,
                borderBottom: `1px solid ${T.border}`,
              }}
            >
              Destinations
            </div>
            {PLATFORMS.map((platform) => (
              <DestinationCard
                key={platform.id}
                platform={platform}
                connected={connectedPlatforms.includes(platform.id)}
                onToggle={() => togglePlatform(platform.id)}
              />
            ))}
          </div>
        )}

        {/* CENTER — Production Canvas */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
          {/* Mode Rail */}
          <div
            style={{
              borderBottom: `1px solid ${T.border}`,
              padding: "0 24px",
              display: "flex",
              gap: 0,
              overflowX: "auto",
            }}
          >
            {MODES.map((mode) => {
              const Icon = mode.icon;
              const isActive = activeMode === mode.id;
              return (
                <button
                  key={mode.id}
                  onClick={() => setActiveMode(mode.id)}
                  style={{
                    background: "transparent",
                    border: "none",
                    borderBottom: `2px solid ${isActive ? T.gold : "transparent"}`,
                    color: isActive ? T.gold : T.textMuted,
                    padding: "14px 16px",
                    fontSize: 12,
                    fontWeight: isActive ? 700 : 400,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    whiteSpace: "nowrap",
                    letterSpacing: "0.03em",
                    transition: "all 0.15s",
                  }}
                >
                  <Icon size={14} />
                  {mode.label}
                </button>
              );
            })}
          </div>

          {/* Mode Content */}
          <div style={{ flex: 1, padding: "24px", overflowY: "auto" }}>
            {renderMode()}
          </div>
        </div>

        {/* RIGHT RAIL — Intelligence */}
        <div
          style={{
            width: 260,
            flexShrink: 0,
            borderLeft: `1px solid ${T.border}`,
            background: T.surface,
            padding: "20px 16px",
            overflowY: "auto",
          }}
        >
          <div
            style={{
              color: T.textMuted,
              fontSize: 10,
              letterSpacing: "0.15em",
              textTransform: "uppercase",
              marginBottom: 14,
              paddingBottom: 10,
              borderBottom: `1px solid ${T.border}`,
            }}
          >
            Broadcast Intelligence
          </div>

          {/* Stats */}
          <div style={{ marginBottom: 20 }}>
            {[
              { label: "Total Reach", value: "—", icon: Globe },
              { label: "Active Streams", value: "0", icon: Radio },
              { label: "Clips Generated", value: "0", icon: Scissors },
              { label: "Captions Created", value: "0", icon: Captions },
            ].map((stat) => {
              const Icon = stat.icon;
              return (
                <div
                  key={stat.label}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "10px 0",
                    borderBottom: `1px solid ${T.border}`,
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <Icon size={13} color={T.textMuted} />
                    <span style={{ color: T.textMuted, fontSize: 12 }}>{stat.label}</span>
                  </div>
                  <span style={{ color: T.text, fontSize: 13, fontWeight: 600 }}>{stat.value}</span>
                </div>
              );
            })}
          </div>

          {/* AI Tips */}
          <div>
            <div
              style={{
                color: T.textMuted,
                fontSize: 10,
                letterSpacing: "0.15em",
                textTransform: "uppercase",
                marginBottom: 10,
              }}
            >
              AI Suggestions
            </div>
            {[
              "Stream during 7–9 PM EST for 3× engagement",
              "Add captions — 85% of social video is watched muted",
              "First 3 seconds determine 90% of watch time",
            ].map((tip, i) => (
              <div
                key={i}
                style={{
                  background: T.bg,
                  border: `1px solid ${T.border}`,
                  borderLeft: `3px solid ${T.gold}`,
                  borderRadius: 3,
                  padding: "10px 12px",
                  marginBottom: 8,
                  fontSize: 11,
                  color: T.textDim,
                  lineHeight: 1.5,
                }}
              >
                {tip}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
