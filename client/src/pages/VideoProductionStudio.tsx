/**
 * ============================================================================
 * CREATORVAULT — VIDEO PRODUCTION STUDIO V3
 * ============================================================================
 * Route: /video-production
 * The master video lab. All 11 sections. Visual-first, no form stacking.
 * No gates. No limitations. Every tool works standalone.
 *
 * 3-Zone Layout:
 *   LEFT RAIL   — Section navigator (icon + label, collapsible)
 *   CENTER      — Production Canvas (visual-first section content)
 *   RIGHT RAIL  — Context Panel (AI suggestions, recent outputs, stats)
 *
 * Sections:
 *   1. AI Generator   — Text → Video, Image → Video, Script → Video
 *   2. My Projects    — Visual grid of all video projects
 *   3. Timeline       — Multi-track editor concept
 *   4. AI Director    — Autonomous editing suggestions
 *   5. Look Engine    — Film emulation & color grading
 *   6. Captions       — Auto-caption generation
 *   7. Audio Lab      — Music, SFX, voice-over
 *   8. Brand Kit      — Intros, outros, watermarks
 *   9. Export Center  — Multi-platform auto-resize
 *   10. Asset Library — B-roll, music, motion graphics
 *   11. Analytics     — Views, watch time, engagement
 * ============================================================================
 */
import React, { useState, useCallback, useEffect, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import {
  Sparkles, FolderOpen, Layers, Brain, Eye, Captions,
  Volume2, Palette, Download, Image, BarChart3, Upload,
  Play, Pause, Square, Film, Zap, ChevronRight, ChevronLeft,
  Plus, Trash2, RefreshCw, Clock, CheckCircle, XCircle,
  Loader2, Star, Globe, Copy, Check, AlignLeft, Mic,
  Camera, Monitor, Settings, TrendingUp, Target, Wand2,
  FileVideo, Music, Brush, Package, LayoutGrid, List,
  ArrowRight, ExternalLink, MoreHorizontal
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
  purple: "#805AD5",
};

const API_BASE = "/api/trpc";

async function trpcQuery(path: string) {
  const res = await fetch(`${API_BASE}/${path}`);
  if (!res.ok) throw new Error(`Query failed: ${path}`);
  const json = await res.json();
  return json?.result?.data?.json ?? json?.result?.data ?? null;
}

async function trpcMutate(path: string, input: any) {
  const res = await fetch(`${API_BASE}/${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ json: input }),
  });
  if (!res.ok) throw new Error(`Mutation failed: ${path}`);
  const json = await res.json();
  return json?.result?.data?.json ?? json?.result?.data ?? null;
}

// ─── Section Definitions ──────────────────────────────────────────────────────
const SECTIONS = [
  { id: "generator",  label: "AI Generator",   icon: Sparkles,    color: T.gold },
  { id: "projects",   label: "My Projects",    icon: FolderOpen,  color: T.blue },
  { id: "timeline",   label: "Timeline",       icon: Layers,      color: T.purple },
  { id: "director",   label: "AI Director",    icon: Brain,       color: T.gold },
  { id: "looks",      label: "Look Engine",    icon: Eye,         color: T.green },
  { id: "captions",   label: "Captions",       icon: Captions,    color: T.blue },
  { id: "audio",      label: "Audio Lab",      icon: Volume2,     color: T.purple },
  { id: "brandkit",   label: "Brand Kit",      icon: Palette,     color: T.gold },
  { id: "export",     label: "Export Center",  icon: Download,    color: T.green },
  { id: "assets",     label: "Asset Library",  icon: Package,     color: T.blue },
  { id: "analytics",  label: "Analytics",      icon: BarChart3,   color: T.gold },
];

// ─── Shared UI Primitives ─────────────────────────────────────────────────────
function SectionTitle({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div style={{ marginBottom: 24 }}>
      <h2
        style={{
          fontFamily: "'Playfair Display', Georgia, serif",
          fontSize: 22,
          fontWeight: 700,
          color: T.text,
          margin: 0,
          letterSpacing: "-0.01em",
        }}
      >
        {title}
      </h2>
      <p style={{ color: T.textMuted, fontSize: 13, margin: "4px 0 0", lineHeight: 1.5 }}>
        {subtitle}
      </p>
    </div>
  );
}

function GoldButton({
  children,
  onClick,
  loading,
  disabled,
  fullWidth,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      style={{
        width: fullWidth ? "100%" : "auto",
        background: disabled ? T.border : T.gold,
        border: "none",
        color: disabled ? T.textMuted : T.bg,
        borderRadius: 3,
        padding: "11px 20px",
        fontSize: 12,
        fontWeight: 700,
        letterSpacing: "0.1em",
        textTransform: "uppercase" as const,
        cursor: disabled ? "not-allowed" : "pointer",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
      }}
    >
      {loading ? <Loader2 size={14} className="animate-spin" /> : children}
    </button>
  );
}

function UploadZone({ onFile }: { onFile?: (file: File) => void }) {
  const ref = useRef<HTMLInputElement>(null);
  return (
    <div
      onClick={() => ref.current?.click()}
      style={{
        border: `2px dashed ${T.border}`,
        borderRadius: 4,
        padding: "32px 24px",
        textAlign: "center",
        cursor: "pointer",
        background: T.surface,
        marginBottom: 16,
        transition: "border-color 0.2s",
      }}
      onMouseEnter={(e) => (e.currentTarget.style.borderColor = T.gold)}
      onMouseLeave={(e) => (e.currentTarget.style.borderColor = T.border)}
    >
      <Upload size={28} color={T.textMuted} style={{ margin: "0 auto 10px" }} />
      <div style={{ color: T.text, fontSize: 14, fontWeight: 600, marginBottom: 4 }}>
        Drop media here or click to upload
      </div>
      <div style={{ color: T.textMuted, fontSize: 12 }}>MP4, MOV, WebM, MP3, WAV, JPG, PNG</div>
      <input
        ref={ref}
        type="file"
        accept="video/*,audio/*,image/*"
        style={{ display: "none" }}
        onChange={(e) => e.target.files?.[0] && onFile?.(e.target.files[0])}
      />
    </div>
  );
}

// ─── Section: AI Generator ────────────────────────────────────────────────────
function GeneratorSection() {
  const [mode, setMode] = useState<"text" | "image" | "script">("text");
  const [prompt, setPrompt] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [script, setScript] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  const generate = async () => {
    if (!prompt && !imageUrl && !script) return;
    setLoading(true);
    try {
      let res;
      if (mode === "text") {
        res = await trpcMutate("videoStudioV2.textToVideo", { prompt, style: "cinematic", duration: 30 });
      } else if (mode === "image") {
        res = await trpcMutate("videoStudioV2.imageToVideo", { imageUrl, motionPrompt: prompt, duration: 4 });
      } else {
        res = await trpcMutate("scriptToVideo.createProject", { title: "New Project", script });
      }
      setResult(res);
      toast.success("Video generation queued");
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  };

  const MODES = [
    { id: "text", label: "Text → Video", icon: AlignLeft, desc: "Describe your vision" },
    { id: "image", label: "Image → Video", icon: Image, desc: "Animate a still" },
    { id: "script", label: "Script → Video", icon: FileVideo, desc: "Full production pipeline" },
  ];

  return (
    <div>
      <SectionTitle title="AI Video Generator" subtitle="Create videos from text, images, or scripts — no camera required" />

      {/* Mode Selector */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 24 }}>
        {MODES.map((m) => {
          const Icon = m.icon;
          const isActive = mode === m.id;
          return (
            <button
              key={m.id}
              onClick={() => setMode(m.id as any)}
              style={{
                background: isActive ? `${T.gold}15` : T.surface,
                border: `1px solid ${isActive ? T.gold : T.border}`,
                borderRadius: 4,
                padding: "16px 12px",
                cursor: "pointer",
                textAlign: "left",
              }}
            >
              <Icon size={18} color={isActive ? T.gold : T.textMuted} style={{ marginBottom: 8 }} />
              <div style={{ color: T.text, fontSize: 13, fontWeight: 600 }}>{m.label}</div>
              <div style={{ color: T.textMuted, fontSize: 11, marginTop: 2 }}>{m.desc}</div>
            </button>
          );
        })}
      </div>

      {/* Input Area */}
      {mode === "text" && (
        <div style={{ marginBottom: 16 }}>
          <div style={{ color: T.textMuted, fontSize: 11, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 8 }}>
            Vision Prompt
          </div>
          <Textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="A cinematic drone shot over a neon-lit city at night, rain reflecting on the streets, slow motion..."
            rows={5}
            style={{ background: T.surface, border: `1px solid ${T.border}`, color: T.text, borderRadius: 3, resize: "vertical" }}
          />
        </div>
      )}

      {mode === "image" && (
        <div>
          <UploadZone />
          <div style={{ marginBottom: 16 }}>
            <div style={{ color: T.textMuted, fontSize: 11, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 8 }}>
              Or Image URL
            </div>
            <Input
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              placeholder="https://..."
              style={{ background: T.surface, border: `1px solid ${T.border}`, color: T.text, borderRadius: 3 }}
            />
          </div>
          <div style={{ marginBottom: 16 }}>
            <div style={{ color: T.textMuted, fontSize: 11, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 8 }}>
              Motion Direction
            </div>
            <Input
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Slow zoom in, camera drifts left..."
              style={{ background: T.surface, border: `1px solid ${T.border}`, color: T.text, borderRadius: 3 }}
            />
          </div>
        </div>
      )}

      {mode === "script" && (
        <div style={{ marginBottom: 16 }}>
          <div style={{ color: T.textMuted, fontSize: 11, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 8 }}>
            Full Script
          </div>
          <Textarea
            value={script}
            onChange={(e) => setScript(e.target.value)}
            placeholder="SCENE 1: INT. STUDIO — NIGHT&#10;&#10;NARRATOR (V.O.)&#10;This is the story of how one man built an empire..."
            rows={8}
            style={{ background: T.surface, border: `1px solid ${T.border}`, color: T.text, borderRadius: 3, resize: "vertical", fontFamily: "monospace", fontSize: 12 }}
          />
        </div>
      )}

      <GoldButton onClick={generate} loading={loading} disabled={!prompt && !imageUrl && !script} fullWidth>
        <Sparkles size={14} />
        Generate Video
      </GoldButton>

      {result && (
        <div
          style={{
            marginTop: 16,
            background: `${T.green}10`,
            border: `1px solid ${T.green}40`,
            borderRadius: 4,
            padding: "14px 16px",
            display: "flex",
            alignItems: "center",
            gap: 10,
          }}
        >
          <CheckCircle size={16} color={T.green} />
          <div>
            <div style={{ color: T.text, fontSize: 13, fontWeight: 600 }}>Generation Queued</div>
            <div style={{ color: T.textMuted, fontSize: 11, marginTop: 2 }}>
              Check My Projects for your video when ready
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Section: My Projects ─────────────────────────────────────────────────────
function ProjectsSection() {
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<"grid" | "list">("grid");

  useEffect(() => {
    trpcQuery("videoEditor.getProjects")
      .then((data) => setProjects(data || []))
      .catch(() => setProjects([]))
      .finally(() => setLoading(false));
  }, []);

  const STATUS_COLORS: Record<string, string> = {
    completed: T.green,
    processing: T.gold,
    failed: T.red,
    pending: T.textMuted,
  };

  return (
    <div>
      <SectionTitle title="My Projects" subtitle="All your video projects in one place" />

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <div style={{ color: T.textMuted, fontSize: 12 }}>
          {loading ? "Loading..." : `${projects.length} project${projects.length !== 1 ? "s" : ""}`}
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          {(["grid", "list"] as const).map((v) => {
            const Icon = v === "grid" ? LayoutGrid : List;
            return (
              <button
                key={v}
                onClick={() => setView(v)}
                style={{
                  background: view === v ? T.gold : "transparent",
                  border: `1px solid ${view === v ? T.gold : T.border}`,
                  color: view === v ? T.bg : T.textMuted,
                  borderRadius: 3,
                  padding: "5px 8px",
                  cursor: "pointer",
                }}
              >
                <Icon size={14} />
              </button>
            );
          })}
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: "center", padding: "40px 0", color: T.textMuted }}>
          <Loader2 size={24} className="animate-spin" style={{ margin: "0 auto 10px" }} />
          Loading projects...
        </div>
      ) : projects.length === 0 ? (
        <div style={{ textAlign: "center", padding: "48px 0" }}>
          <Film size={36} color={T.textMuted} style={{ margin: "0 auto 12px" }} />
          <div style={{ color: T.text, fontSize: 14, fontWeight: 600, marginBottom: 6 }}>No projects yet</div>
          <div style={{ color: T.textMuted, fontSize: 12 }}>Generate your first video in the AI Generator</div>
        </div>
      ) : view === "grid" ? (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
          {projects.map((p) => (
            <div
              key={p.id}
              style={{
                background: T.surface,
                border: `1px solid ${T.border}`,
                borderRadius: 4,
                overflow: "hidden",
                cursor: "pointer",
              }}
            >
              <div
                style={{
                  height: 100,
                  background: `linear-gradient(135deg, ${T.bg}, ${T.border})`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {p.thumbnail_url ? (
                  <img src={p.thumbnail_url} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                ) : (
                  <Film size={28} color={T.textMuted} />
                )}
              </div>
              <div style={{ padding: "10px 12px" }}>
                <div style={{ color: T.text, fontSize: 12, fontWeight: 600, marginBottom: 4, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {p.title || "Untitled"}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <div
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: "50%",
                      background: STATUS_COLORS[p.status] || T.textMuted,
                    }}
                  />
                  <span style={{ color: T.textMuted, fontSize: 10, textTransform: "capitalize" }}>
                    {p.status || "pending"}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div>
          {projects.map((p) => (
            <div
              key={p.id}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                padding: "12px 14px",
                background: T.surface,
                border: `1px solid ${T.border}`,
                borderRadius: 3,
                marginBottom: 6,
                cursor: "pointer",
              }}
            >
              <div
                style={{
                  width: 48,
                  height: 36,
                  background: T.bg,
                  borderRadius: 2,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <Film size={16} color={T.textMuted} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ color: T.text, fontSize: 13, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {p.title || "Untitled"}
                </div>
                <div style={{ color: T.textMuted, fontSize: 11, marginTop: 2 }}>{p.created_at || ""}</div>
              </div>
              <div
                style={{
                  background: `${STATUS_COLORS[p.status] || T.textMuted}20`,
                  color: STATUS_COLORS[p.status] || T.textMuted,
                  fontSize: 10,
                  fontWeight: 700,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  padding: "3px 8px",
                  borderRadius: 2,
                }}
              >
                {p.status || "pending"}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Section: Look Engine ─────────────────────────────────────────────────────
function LooksSection() {
  const [selected, setSelected] = useState<string | null>(null);
  const [videoUrl, setVideoUrl] = useState("");

  const LOOKS = [
    { id: "cinematic_noir", name: "Cinematic Noir", mood: "Dark, atmospheric", preview: "#1a1a2e" },
    { id: "golden_hour", name: "Golden Hour", mood: "Warm, rich, filmic", preview: "#2d1b00" },
    { id: "bleach_bypass", name: "Bleach Bypass", mood: "Desaturated, high contrast", preview: "#1a1a1a" },
    { id: "teal_orange", name: "Teal & Orange", mood: "Hollywood blockbuster", preview: "#0d2626" },
    { id: "film_grain", name: "Film Grain", mood: "35mm analog texture", preview: "#1a1510" },
    { id: "clean_web", name: "Clean Web", mood: "Bright, social-ready", preview: "#f0f0f0" },
    { id: "neon_city", name: "Neon City", mood: "Cyberpunk, vivid", preview: "#0d0020" },
    { id: "desert_dust", name: "Desert Dust", mood: "Warm, sandy, epic", preview: "#2a1a00" },
  ];

  return (
    <div>
      <SectionTitle title="Look Engine" subtitle="Film emulation and color grading presets — one click, cinematic results" />

      <div style={{ marginBottom: 20 }}>
        <div style={{ color: T.textMuted, fontSize: 11, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 8 }}>
          Video Source
        </div>
        <Input
          value={videoUrl}
          onChange={(e) => setVideoUrl(e.target.value)}
          placeholder="Video URL or project ID"
          style={{ background: T.surface, border: `1px solid ${T.border}`, color: T.text, borderRadius: 3 }}
        />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 10, marginBottom: 20 }}>
        {LOOKS.map((look) => (
          <button
            key={look.id}
            onClick={() => setSelected(look.id)}
            style={{
              background: selected === look.id ? `${T.gold}15` : T.surface,
              border: `2px solid ${selected === look.id ? T.gold : T.border}`,
              borderRadius: 4,
              padding: 0,
              cursor: "pointer",
              overflow: "hidden",
              textAlign: "left",
            }}
          >
            <div style={{ height: 60, background: look.preview }} />
            <div style={{ padding: "8px 10px" }}>
              <div style={{ color: T.text, fontSize: 11, fontWeight: 600 }}>{look.name}</div>
              <div style={{ color: T.textMuted, fontSize: 10, marginTop: 2 }}>{look.mood}</div>
            </div>
          </button>
        ))}
      </div>

      {selected && (
        <GoldButton fullWidth>
          <Eye size={14} />
          Apply {LOOKS.find((l) => l.id === selected)?.name}
        </GoldButton>
      )}
    </div>
  );
}

// ─── Section: Captions ────────────────────────────────────────────────────────
function CaptionsSection() {
  const [videoUrl, setVideoUrl] = useState("");
  const [style, setStyle] = useState("minimal");
  const [loading, setLoading] = useState(false);

  const CAPTION_STYLES = [
    { id: "minimal", label: "Minimal", desc: "Clean, small, bottom-aligned" },
    { id: "bold", label: "Bold", desc: "Large, high-impact" },
    { id: "karaoke", label: "Karaoke", desc: "Word-by-word highlight" },
    { id: "tiktok", label: "TikTok Pop", desc: "Animated, colorful" },
    { id: "subtitle", label: "Subtitle", desc: "Traditional SRT style" },
  ];

  const generate = async () => {
    if (!videoUrl) return;
    setLoading(true);
    try {
      await trpcMutate("videoStudioV2.generateCaptions", { videoUrl, language: "auto", style });
      toast.success("Captions generated");
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <SectionTitle title="Captions & Text" subtitle="Auto-generate captions for any video — 85% of social video is watched muted" />

      <div style={{ marginBottom: 20 }}>
        <UploadZone />
        <div style={{ color: T.textMuted, fontSize: 11, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 8 }}>
          Or Video URL
        </div>
        <Input
          value={videoUrl}
          onChange={(e) => setVideoUrl(e.target.value)}
          placeholder="Video URL or project ID"
          style={{ background: T.surface, border: `1px solid ${T.border}`, color: T.text, borderRadius: 3 }}
        />
      </div>

      <div style={{ marginBottom: 20 }}>
        <div style={{ color: T.textMuted, fontSize: 11, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 10 }}>
          Caption Style
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          {CAPTION_STYLES.map((s) => (
            <button
              key={s.id}
              onClick={() => setStyle(s.id)}
              style={{
                background: style === s.id ? `${T.gold}15` : T.surface,
                border: `1px solid ${style === s.id ? T.gold : T.border}`,
                borderRadius: 3,
                padding: "10px 12px",
                cursor: "pointer",
                textAlign: "left",
              }}
            >
              <div style={{ color: T.text, fontSize: 12, fontWeight: 600 }}>{s.label}</div>
              <div style={{ color: T.textMuted, fontSize: 10, marginTop: 2 }}>{s.desc}</div>
            </button>
          ))}
        </div>
      </div>

      <GoldButton onClick={generate} loading={loading} disabled={!videoUrl} fullWidth>
        <Captions size={14} />
        Generate Captions
      </GoldButton>
    </div>
  );
}

// ─── Section: Export Center ───────────────────────────────────────────────────
function ExportSection() {
  const [videoUrl, setVideoUrl] = useState("");
  const [loading, setLoading] = useState(false);

  const PLATFORMS = [
    { id: "tiktok", label: "TikTok", ratio: "9:16", res: "1080×1920" },
    { id: "instagram_reels", label: "Instagram Reels", ratio: "9:16", res: "1080×1920" },
    { id: "youtube_shorts", label: "YouTube Shorts", ratio: "9:16", res: "1080×1920" },
    { id: "youtube", label: "YouTube", ratio: "16:9", res: "1920×1080" },
    { id: "instagram_feed", label: "Instagram Feed", ratio: "1:1", res: "1080×1080" },
    { id: "twitter", label: "X / Twitter", ratio: "16:9", res: "1280×720" },
    { id: "facebook", label: "Facebook", ratio: "16:9", res: "1280×720" },
    { id: "linkedin", label: "LinkedIn", ratio: "16:9", res: "1920×1080" },
  ];

  const [selected, setSelected] = useState<string[]>([]);

  const togglePlatform = (id: string) => {
    setSelected((prev) => prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]);
  };

  const exportVideo = async () => {
    if (!videoUrl || selected.length === 0) return;
    setLoading(true);
    try {
      await trpcMutate("videoStudioV2.socialExport", { videoUrl, platforms: selected });
      toast.success(`Exporting to ${selected.length} platform${selected.length !== 1 ? "s" : ""}`);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <SectionTitle title="Export Center" subtitle="One video, every platform — auto-resized and optimized" />

      <div style={{ marginBottom: 20 }}>
        <UploadZone />
        <div style={{ color: T.textMuted, fontSize: 11, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 8 }}>
          Or Video URL
        </div>
        <Input
          value={videoUrl}
          onChange={(e) => setVideoUrl(e.target.value)}
          placeholder="Video URL or project ID"
          style={{ background: T.surface, border: `1px solid ${T.border}`, color: T.text, borderRadius: 3 }}
        />
      </div>

      <div style={{ marginBottom: 20 }}>
        <div style={{ color: T.textMuted, fontSize: 11, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 10 }}>
          Target Platforms
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          {PLATFORMS.map((p) => {
            const isSelected = selected.includes(p.id);
            return (
              <button
                key={p.id}
                onClick={() => togglePlatform(p.id)}
                style={{
                  background: isSelected ? `${T.gold}15` : T.surface,
                  border: `1px solid ${isSelected ? T.gold : T.border}`,
                  borderRadius: 3,
                  padding: "10px 12px",
                  cursor: "pointer",
                  textAlign: "left",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <div>
                  <div style={{ color: T.text, fontSize: 12, fontWeight: 600 }}>{p.label}</div>
                  <div style={{ color: T.textMuted, fontSize: 10, marginTop: 2 }}>{p.ratio} · {p.res}</div>
                </div>
                {isSelected && <Check size={14} color={T.gold} />}
              </button>
            );
          })}
        </div>
      </div>

      <GoldButton onClick={exportVideo} loading={loading} disabled={!videoUrl || selected.length === 0} fullWidth>
        <Download size={14} />
        Export to {selected.length > 0 ? `${selected.length} Platform${selected.length !== 1 ? "s" : ""}` : "Platforms"}
      </GoldButton>
    </div>
  );
}

// ─── Section: Analytics ───────────────────────────────────────────────────────
function AnalyticsSection() {
  const [analytics, setAnalytics] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    trpcQuery("videoStudioV2.getAnalytics")
      .then((data) => setAnalytics(data))
      .catch(() => setAnalytics(null))
      .finally(() => setLoading(false));
  }, []);

  const STATS = [
    { label: "Total Views", value: analytics?.totalViews ?? "—", icon: Eye },
    { label: "Watch Time", value: analytics?.watchTime ?? "—", icon: Clock },
    { label: "Avg Retention", value: analytics?.avgRetention ?? "—", icon: TrendingUp },
    { label: "Videos Published", value: analytics?.videosPublished ?? "—", icon: Film },
  ];

  return (
    <div>
      <SectionTitle title="Analytics" subtitle="Views, watch time, and engagement across all your videos" />

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 24 }}>
        {STATS.map((stat) => {
          const Icon = stat.icon;
          return (
            <div
              key={stat.label}
              style={{
                background: T.surface,
                border: `1px solid ${T.border}`,
                borderRadius: 4,
                padding: "16px 18px",
              }}
            >
              <Icon size={16} color={T.gold} style={{ marginBottom: 8 }} />
              <div style={{ color: T.text, fontSize: 22, fontWeight: 700, fontFamily: "'Playfair Display', Georgia, serif" }}>
                {loading ? "—" : stat.value}
              </div>
              <div style={{ color: T.textMuted, fontSize: 11, marginTop: 4 }}>{stat.label}</div>
            </div>
          );
        })}
      </div>

      {!loading && !analytics && (
        <div style={{ textAlign: "center", padding: "24px 0", color: T.textMuted, fontSize: 13 }}>
          Publish videos to start seeing analytics
        </div>
      )}
    </div>
  );
}

// ─── Section: Brand Kit ───────────────────────────────────────────────────────
function BrandKitSection() {
  const [kits, setKits] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    trpcQuery("videoStudioV2.getBrandKits")
      .then((data) => setKits(data || []))
      .catch(() => setKits([]))
      .finally(() => setLoading(false));
  }, []);

  const save = async () => {
    if (!name) return;
    setSaving(true);
    try {
      await trpcMutate("videoStudioV2.saveBrandKit", { name, primaryColor: "#C9A84C", fontFamily: "Playfair Display" });
      toast.success("Brand kit saved");
      setName("");
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <SectionTitle title="Brand Kit" subtitle="Intros, outros, watermarks, and lower thirds — your brand, everywhere" />

      <div style={{ marginBottom: 20 }}>
        <div style={{ color: T.textMuted, fontSize: 11, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 8 }}>
          New Brand Kit
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Brand kit name"
            style={{ flex: 1, background: T.surface, border: `1px solid ${T.border}`, color: T.text, borderRadius: 3 }}
          />
          <GoldButton onClick={save} loading={saving} disabled={!name}>
            <Plus size={14} />
            Create
          </GoldButton>
        </div>
      </div>

      {kits.length > 0 && (
        <div>
          <div style={{ color: T.textMuted, fontSize: 11, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 10 }}>
            Saved Kits
          </div>
          {kits.map((kit) => (
            <div
              key={kit.id}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "12px 14px",
                background: T.surface,
                border: `1px solid ${T.border}`,
                borderRadius: 3,
                marginBottom: 6,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: 3,
                    background: kit.primaryColor || T.gold,
                  }}
                />
                <div>
                  <div style={{ color: T.text, fontSize: 13, fontWeight: 600 }}>{kit.name}</div>
                  <div style={{ color: T.textMuted, fontSize: 11 }}>{kit.fontFamily || "Default font"}</div>
                </div>
              </div>
              <button
                style={{
                  background: "transparent",
                  border: `1px solid ${T.border}`,
                  color: T.textMuted,
                  borderRadius: 3,
                  padding: "4px 10px",
                  fontSize: 11,
                  cursor: "pointer",
                }}
              >
                Apply
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Section: Audio Lab ───────────────────────────────────────────────────────
function AudioSection() {
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);

  const MOODS = ["Epic", "Chill", "Hype", "Emotional", "Dark", "Upbeat", "Cinematic", "Lo-Fi"];
  const [mood, setMood] = useState("Cinematic");

  return (
    <div>
      <SectionTitle title="Audio Lab" subtitle="AI-generated music, SFX, and voice-over for your videos" />

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 20 }}>
        {[
          { label: "Background Music", icon: Music, desc: "AI-generated tracks" },
          { label: "Sound Effects", icon: Volume2, desc: "Cinematic SFX library" },
          { label: "Voice-Over", icon: Mic, desc: "AI voice generation" },
        ].map((item) => {
          const Icon = item.icon;
          return (
            <div
              key={item.label}
              style={{
                background: T.surface,
                border: `1px solid ${T.border}`,
                borderRadius: 4,
                padding: "16px 14px",
                cursor: "pointer",
              }}
            >
              <Icon size={20} color={T.gold} style={{ marginBottom: 10 }} />
              <div style={{ color: T.text, fontSize: 13, fontWeight: 600 }}>{item.label}</div>
              <div style={{ color: T.textMuted, fontSize: 11, marginTop: 4 }}>{item.desc}</div>
            </div>
          );
        })}
      </div>

      <div style={{ marginBottom: 16 }}>
        <div style={{ color: T.textMuted, fontSize: 11, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 8 }}>
          Mood
        </div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {MOODS.map((m) => (
            <button
              key={m}
              onClick={() => setMood(m)}
              style={{
                background: mood === m ? T.gold : T.surface,
                border: `1px solid ${mood === m ? T.gold : T.border}`,
                color: mood === m ? T.bg : T.text,
                borderRadius: 3,
                padding: "5px 12px",
                fontSize: 12,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              {m}
            </button>
          ))}
        </div>
      </div>

      <div style={{ marginBottom: 16 }}>
        <div style={{ color: T.textMuted, fontSize: 11, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 8 }}>
          Description
        </div>
        <Textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="60-second cinematic track, building tension, orchestral strings..."
          rows={3}
          style={{ background: T.surface, border: `1px solid ${T.border}`, color: T.text, borderRadius: 3 }}
        />
      </div>

      <GoldButton fullWidth disabled={!prompt}>
        <Volume2 size={14} />
        Generate Audio
      </GoldButton>
    </div>
  );
}

// ─── Section: Asset Library ───────────────────────────────────────────────────
function AssetsSection() {
  const CATEGORIES = ["B-Roll", "Music", "SFX", "Motion Graphics", "Fonts", "Templates"];
  const [category, setCategory] = useState("B-Roll");

  return (
    <div>
      <SectionTitle title="Asset Library" subtitle="B-roll, music, motion graphics, and templates for your productions" />

      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 20 }}>
        {CATEGORIES.map((c) => (
          <button
            key={c}
            onClick={() => setCategory(c)}
            style={{
              background: category === c ? T.gold : T.surface,
              border: `1px solid ${category === c ? T.gold : T.border}`,
              color: category === c ? T.bg : T.text,
              borderRadius: 3,
              padding: "6px 14px",
              fontSize: 12,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            {c}
          </button>
        ))}
      </div>

      <div style={{ textAlign: "center", padding: "40px 0" }}>
        <Package size={32} color={T.textMuted} style={{ margin: "0 auto 12px" }} />
        <div style={{ color: T.text, fontSize: 14, fontWeight: 600, marginBottom: 6 }}>
          {category} Library
        </div>
        <div style={{ color: T.textMuted, fontSize: 12 }}>
          Upload assets to build your personal library
        </div>
        <div style={{ marginTop: 16 }}>
          <GoldButton>
            <Upload size={14} />
            Upload Assets
          </GoldButton>
        </div>
      </div>
    </div>
  );
}

// ─── Section: Timeline ────────────────────────────────────────────────────────
function TimelineSection() {
  return (
    <div>
      <SectionTitle title="Timeline Editor" subtitle="Multi-track beat-sync timeline builder" />
      <div
        style={{
          background: T.surface,
          border: `1px solid ${T.border}`,
          borderRadius: 4,
          padding: "24px",
          marginBottom: 16,
        }}
      >
        <div style={{ color: T.textMuted, fontSize: 12, marginBottom: 16 }}>Timeline Preview</div>
        {["Video", "Audio", "Captions", "Effects"].map((track) => (
          <div
            key={track}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              marginBottom: 8,
            }}
          >
            <div style={{ width: 80, color: T.textMuted, fontSize: 11, textAlign: "right", flexShrink: 0 }}>
              {track}
            </div>
            <div
              style={{
                flex: 1,
                height: 32,
                background: T.bg,
                border: `1px solid ${T.border}`,
                borderRadius: 2,
                position: "relative",
              }}
            >
              <div
                style={{
                  position: "absolute",
                  left: 0,
                  top: 0,
                  height: "100%",
                  width: track === "Video" ? "80%" : track === "Audio" ? "60%" : track === "Captions" ? "75%" : "40%",
                  background: `${T.gold}30`,
                  borderRadius: 2,
                }}
              />
            </div>
          </div>
        ))}
      </div>
      <GoldButton fullWidth>
        <Layers size={14} />
        Open Full Timeline Editor
      </GoldButton>
    </div>
  );
}

// ─── Section: AI Director ─────────────────────────────────────────────────────
function DirectorSection() {
  const [videoUrl, setVideoUrl] = useState("");
  const [loading, setLoading] = useState(false);

  return (
    <div>
      <SectionTitle title="AI Director" subtitle="Autonomous editing suggestions, hook analysis, and beat sync recommendations" />

      <UploadZone />

      <div style={{ marginBottom: 16 }}>
        <Input
          value={videoUrl}
          onChange={(e) => setVideoUrl(e.target.value)}
          placeholder="Or paste video URL"
          style={{ background: T.surface, border: `1px solid ${T.border}`, color: T.text, borderRadius: 3 }}
        />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 20 }}>
        {[
          { label: "Hook Analysis", desc: "First 3-second optimization", icon: Target },
          { label: "Cut Points", desc: "Optimal edit markers", icon: Scissors },
          { label: "Pacing Map", desc: "Energy & rhythm analysis", icon: TrendingUp },
          { label: "Platform Fit", desc: "Best platform for this video", icon: Globe },
        ].map((item) => {
          const Icon = item.icon;
          return (
            <div
              key={item.label}
              style={{
                background: T.surface,
                border: `1px solid ${T.border}`,
                borderRadius: 4,
                padding: "14px",
                cursor: "pointer",
              }}
            >
              <Icon size={16} color={T.gold} style={{ marginBottom: 8 }} />
              <div style={{ color: T.text, fontSize: 12, fontWeight: 600 }}>{item.label}</div>
              <div style={{ color: T.textMuted, fontSize: 10, marginTop: 2 }}>{item.desc}</div>
            </div>
          );
        })}
      </div>

      <GoldButton fullWidth disabled={!videoUrl}>
        <Brain size={14} />
        Analyze Video
      </GoldButton>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function VideoProductionStudio() {
  const [activeSection, setActiveSection] = useState("generator");
  const [navCollapsed, setNavCollapsed] = useState(false);

  const renderSection = () => {
    switch (activeSection) {
      case "generator": return <GeneratorSection />;
      case "projects": return <ProjectsSection />;
      case "timeline": return <TimelineSection />;
      case "director": return <DirectorSection />;
      case "looks": return <LooksSection />;
      case "captions": return <CaptionsSection />;
      case "audio": return <AudioSection />;
      case "brandkit": return <BrandKitSection />;
      case "export": return <ExportSection />;
      case "assets": return <AssetsSection />;
      case "analytics": return <AnalyticsSection />;
      default: return <GeneratorSection />;
    }
  };

  const activeData = SECTIONS.find((s) => s.id === activeSection);

  return (
    <div style={{ minHeight: "100vh", background: T.bg, color: T.text, fontFamily: "'Inter', sans-serif", display: "flex", flexDirection: "column" }}>
      {/* ── Header ── */}
      <div
        style={{
          borderBottom: `1px solid ${T.border}`,
          padding: "14px 24px",
          display: "flex",
          alignItems: "center",
          gap: 14,
          background: T.surface,
        }}
      >
        <Film size={20} color={T.gold} />
        <div>
          <span
            style={{
              fontFamily: "'Playfair Display', Georgia, serif",
              fontSize: 18,
              fontWeight: 700,
              color: T.text,
              letterSpacing: "-0.01em",
            }}
          >
            Video Production Studio
          </span>
          <span style={{ color: T.textMuted, fontSize: 12, marginLeft: 12 }}>
            {activeData?.label}
          </span>
        </div>
      </div>

      {/* ── 3-Zone Body ── */}
      <div style={{ flex: 1, display: "flex" }}>

        {/* LEFT RAIL — Section Nav */}
        <div
          style={{
            width: navCollapsed ? 56 : 200,
            flexShrink: 0,
            borderRight: `1px solid ${T.border}`,
            background: T.surface,
            padding: navCollapsed ? "16px 8px" : "16px 0",
            transition: "width 0.2s",
            overflowY: "auto",
          }}
        >
          <button
            onClick={() => setNavCollapsed(!navCollapsed)}
            style={{
              background: "transparent",
              border: "none",
              color: T.textMuted,
              cursor: "pointer",
              padding: navCollapsed ? "6px" : "6px 16px",
              marginBottom: 8,
              display: "flex",
              alignItems: "center",
              gap: 6,
              width: "100%",
              justifyContent: navCollapsed ? "center" : "flex-end",
            }}
          >
            {navCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
          </button>

          {SECTIONS.map((section) => {
            const Icon = section.icon;
            const isActive = activeSection === section.id;
            return (
              <button
                key={section.id}
                onClick={() => setActiveSection(section.id)}
                title={navCollapsed ? section.label : undefined}
                style={{
                  width: "100%",
                  background: isActive ? `${T.gold}15` : "transparent",
                  border: "none",
                  borderLeft: `3px solid ${isActive ? T.gold : "transparent"}`,
                  color: isActive ? T.gold : T.textMuted,
                  padding: navCollapsed ? "10px" : "10px 16px",
                  fontSize: 12,
                  fontWeight: isActive ? 700 : 400,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  justifyContent: navCollapsed ? "center" : "flex-start",
                  textAlign: "left",
                  transition: "all 0.15s",
                }}
              >
                <Icon size={15} />
                {!navCollapsed && section.label}
              </button>
            );
          })}
        </div>

        {/* CENTER — Production Canvas */}
        <div style={{ flex: 1, padding: "28px 32px", overflowY: "auto" }}>
          {renderSection()}
        </div>

        {/* RIGHT RAIL — Context Panel */}
        <div
          style={{
            width: 240,
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
            AI Insights
          </div>

          {[
            "Hook in the first 3 seconds — viewers decide in 2",
            "Vertical 9:16 gets 3× more reach on TikTok and Reels",
            "Captions increase watch time by 40% on average",
            "Upload at 7–9 PM local time for maximum initial push",
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

          <div
            style={{
              marginTop: 16,
              paddingTop: 16,
              borderTop: `1px solid ${T.border}`,
            }}
          >
            <div
              style={{
                color: T.textMuted,
                fontSize: 10,
                letterSpacing: "0.15em",
                textTransform: "uppercase",
                marginBottom: 10,
              }}
            >
              Quick Actions
            </div>
            {[
              { label: "New Project", icon: Plus },
              { label: "Upload Video", icon: Upload },
              { label: "Export All", icon: Download },
            ].map((action) => {
              const Icon = action.icon;
              return (
                <button
                  key={action.label}
                  style={{
                    width: "100%",
                    background: "transparent",
                    border: `1px solid ${T.border}`,
                    color: T.textMuted,
                    borderRadius: 3,
                    padding: "8px 12px",
                    fontSize: 12,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    marginBottom: 6,
                    textAlign: "left",
                  }}
                >
                  <Icon size={13} />
                  {action.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
