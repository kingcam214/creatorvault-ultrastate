/**
 * ============================================================================
 * CLONE EMPIRE — /king/clone-empire
 * The most powerful AI clone creation, training, and monetization vertical.
 * ============================================================================
 */
import React, { useState, useRef, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/contexts/AuthContext";
import { useLocation } from "wouter";
import {
  Crown, Zap, Video, Mic, Image, Brain, TrendingUp, DollarSign,
  Upload, Play, Pause, Download, RefreshCw, CheckCircle, Clock,
  AlertCircle, ChevronRight, Sparkles, Settings, BarChart2,
  Film, Wand2, Layers, Target, Star, ArrowRight, Plus, X,
  Camera, Palette, Calendar, Globe, Lock, Eye, Heart, Share2
} from "lucide-react";
import { EmptyState, LoadingSpinner } from "@/components/feedback";

// ─── Types ────────────────────────────────────────────────────────────────────
type Tab = "studio" | "train" | "gallery" | "schedule" | "stats";
type VideoMode = "talking_head" | "full_body";
type ColorVariant = "crimson_red" | "midnight_blue" | "emerald_green" | "royal_purple" | "champagne_gold" | "jet_black" | "arctic_white" | "burnt_orange";

const COLOR_VARIANTS: { value: ColorVariant; label: string; hex: string }[] = [
  { value: "crimson_red", label: "Crimson Red", hex: "#8B0000" },
  { value: "midnight_blue", label: "Midnight Blue", hex: "#191970" },
  { value: "emerald_green", label: "Emerald Green", hex: "#046307" },
  { value: "royal_purple", label: "Royal Purple", hex: "#4B0082" },
  { value: "champagne_gold", label: "Champagne Gold", hex: "#C5A028" },
  { value: "jet_black", label: "Jet Black", hex: "#0A0A0A" },
  { value: "arctic_white", label: "Arctic White", hex: "#F0F0F0" },
  { value: "burnt_orange", label: "Burnt Orange", hex: "#CC5500" },
];

const FORMATS = [
  { value: "short_clip_15s", label: "Short Clip", sub: "15 sec" },
  { value: "ad_30s", label: "Ad Spot", sub: "30 sec" },
  { value: "announcement", label: "Announcement", sub: "60 sec" },
  { value: "motivation", label: "Motivation", sub: "60 sec" },
  { value: "course_lesson", label: "Course Lesson", sub: "2 min" },
  { value: "greatest_show_segment", label: "Greatest Show", sub: "60 sec" },
  { value: "dm_personal_video", label: "Personal DM", sub: "30 sec" },
];

const VOICES = [
  { value: "am_adam", label: "Adam", sub: "Deep US Male" },
  { value: "am_michael", label: "Michael", sub: "Smooth US Male" },
  { value: "af_bella", label: "Bella", sub: "US Female" },
  { value: "af_sarah", label: "Sarah", sub: "US Female" },
];

// ─── Status Badge ─────────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: string }) {
  const cfg: Record<string, { color: string; bg: string; icon: React.ReactNode }> = {
    ready: { color: "#10B981", bg: "rgba(16,185,129,0.15)", icon: <CheckCircle size={12} /> },
    rendering: { color: "#F59E0B", bg: "rgba(245,158,11,0.15)", icon: <RefreshCw size={12} className="animate-spin" /> },
    pending: { color: "#6B7280", bg: "rgba(107,114,128,0.15)", icon: <Clock size={12} /> },
    failed: { color: "#EF4444", bg: "rgba(239,68,68,0.15)", icon: <AlertCircle size={12} /> },
    training: { color: "#8B5CF6", bg: "rgba(139,92,246,0.15)", icon: <RefreshCw size={12} className="animate-spin" /> },
    succeeded: { color: "#10B981", bg: "rgba(16,185,129,0.15)", icon: <CheckCircle size={12} /> },
    scheduled: { color: "#3B82F6", bg: "rgba(59,130,246,0.15)", icon: <Calendar size={12} /> },
    published: { color: "#10B981", bg: "rgba(16,185,129,0.15)", icon: <Globe size={12} /> },
  };
  const c = cfg[status] || cfg.pending;
  return (
    <span style={{ color: c.color, background: c.bg, padding: "2px 8px", borderRadius: 20, fontSize: 11, fontWeight: 600, display: "inline-flex", alignItems: "center", gap: 4 }}>
      {c.icon}{status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

// ─── Video Card ───────────────────────────────────────────────────────────────
function VideoCard({ video, onPlay }: { video: any; onPlay: (url: string) => void }) {
  return (
    <div style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 16, overflow: "hidden", transition: "transform 0.2s, border-color 0.2s" }}
      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = "translateY(-2px)"; (e.currentTarget as HTMLElement).style.borderColor = "rgba(212,175,55,0.3)"; }}
      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = "none"; (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,0.08)"; }}>
      {/* Thumbnail */}
      <div style={{ position: "relative", aspectRatio: "16/9", background: "rgba(0,0,0,0.5)", cursor: "pointer" }}
        onClick={() => video.video_url && onPlay(video.video_url)}>
        {video.thumbnail_url ? (
          <img src={video.thumbnail_url} alt={video.title} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        ) : (
          <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Crown size={32} color="rgba(212,175,55,0.4)" />
          </div>
        )}
        {video.video_url && (
          <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.3)" }}>
            <div style={{ width: 44, height: 44, borderRadius: "50%", background: "rgba(212,175,55,0.9)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Play size={18} color="#000" fill="#000" />
            </div>
          </div>
        )}
        <div style={{ position: "absolute", top: 8, right: 8 }}>
          <StatusBadge status={video.render_status || video.status || "pending"} />
        </div>
      </div>
      {/* Info */}
      <div style={{ padding: "12px 14px" }}>
        <div style={{ fontWeight: 600, fontSize: 13, color: "#fff", marginBottom: 4, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {video.title || video.context || "Clone Video"}
        </div>
        <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", display: "flex", gap: 8, alignItems: "center" }}>
          <span>{video.render_provider || "kokoro_sadtalker"}</span>
          <span>•</span>
          <span>{new Date(video.created_at).toLocaleDateString()}</span>
        </div>
        {video.video_url && (
          <a href={video.video_url} download target="_blank" rel="noreferrer"
            style={{ display: "inline-flex", alignItems: "center", gap: 4, marginTop: 8, fontSize: 11, color: "#D4AF37", textDecoration: "none" }}>
            <Download size={11} /> Download
          </a>
        )}
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function CloneEmpire() {
  const { user, isLoading: authLoading } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!authLoading && !user) {
      setLocation("/login");
    }

    return () => {
      // no-op cleanup to keep effect lifecycle explicit
    };
  }, [user, authLoading, setLocation]);

  const [activeTab, setActiveTab] = useState<Tab>("studio");
  const [videoMode, setVideoMode] = useState<VideoMode>("talking_head");
  const [topic, setTopic] = useState("");
  const [customScript, setCustomScript] = useState("");
  const [useCustomScript, setUseCustomScript] = useState(false);
  const [format, setFormat] = useState("short_clip_15s");
  const [voice, setVoice] = useState("am_adam");
  const [style, setStyle] = useState("studio");
  const [fullBodyPrompt, setFullBodyPrompt] = useState("");
  const [colorVariant, setColorVariant] = useState<ColorVariant>("crimson_red");
  const [imagePrompt, setImagePrompt] = useState("");
  const [generating, setGenerating] = useState(false);
  const [generatingImage, setGeneratingImage] = useState(false);
  const [lastResult, setLastResult] = useState<any>(null);
  const [lastImageResult, setLastImageResult] = useState<any>(null);
  const [playingUrl, setPlayingUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  // Training state
  const [trainingJobName, setTrainingJobName] = useState("");
  const [trainingZipUrl, setTrainingZipUrl] = useState("");
  const [trainingImageCount, setTrainingImageCount] = useState(20);
  const [trainingSteps, setTrainingSteps] = useState(1000);
  const [training, setTraining] = useState(false);
  const [trainingResult, setTrainingResult] = useState<any>(null);

  // tRPC mutations
  const generateTalkingHead = trpc.cloneEmpire.generateTalkingHeadWithScript.useMutation();
  const generateFullBody = trpc.cloneEmpire.generateFullBodyVideo.useMutation();
  const generateImage = trpc.cloneEmpire.generateCloneImage.useMutation();
  const trainClone = trpc.cloneEmpire.trainClone.useMutation();

  // tRPC queries
  const { data: statsData, refetch: refetchStats } = trpc.cloneEmpire.getCloneStats.useQuery(undefined, { retry: false });
  const { data: trainingJobs, refetch: refetchJobs } = trpc.cloneEmpire.listTrainingJobs.useQuery(undefined, { retry: false });
  const { data: cloneVideos, refetch: refetchVideos } = trpc.cloneEmpire.listCloneContent.useQuery({ limit: 50, offset: 0, contentType: "all" }, { retry: false });

  // Also get existing clone videos from the main clone lab
  const { data: existingVideos } = trpc.cloneLab.listCloneVideos.useQuery({ limit: 50, offset: 0 }, { retry: false });

  if (authLoading) {
    return <LoadingSpinner message="Loading Clone Empire..." />;
  }

  if (!user) {
    return (
      <EmptyState
        title="Authentication required"
        description="Please sign in to access Clone Empire."
      />
    );
  }

  const handleGenerateTalkingHead = async () => {
    if (!topic.trim() && !customScript.trim()) { setError("Enter a topic or script"); return; }
    setGenerating(true); setError(null); setLastResult(null);
    try {
      const result = await generateTalkingHead.mutateAsync({
        topic: topic || "KingCam intro",
        format: format as any,
        voice,
        style: style as any,
        customScript: useCustomScript && customScript ? customScript : undefined,
      });
      setLastResult(result);
      refetchVideos();
    } catch (e: any) {
      setError(e.message || "Generation failed");
    } finally {
      setGenerating(false);
    }
  };

  const handleGenerateFullBody = async () => {
    if (!fullBodyPrompt.trim()) { setError("Enter a prompt for the full body video"); return; }
    setGenerating(true); setError(null); setLastResult(null);
    try {
      const result = await generateFullBody.mutateAsync({
        prompt: fullBodyPrompt,
        aspectRatio: "9:16",
        duration: 5,
        mode: "pro",
        title: fullBodyPrompt.substring(0, 80),
      });
      setLastResult(result);
      refetchVideos();
    } catch (e: any) {
      setError(e.message || "Generation failed");
    } finally {
      setGenerating(false);
    }
  };

  const handleGenerateImage = async () => {
    if (!imagePrompt.trim()) { setError("Enter an image prompt"); return; }
    setGeneratingImage(true); setError(null); setLastImageResult(null);
    try {
      const result = await generateImage.mutateAsync({
        prompt: imagePrompt,
        colorVariant,
        aspectRatio: "1:1",
        outputFormat: "jpg",
      });
      setLastImageResult(result);
    } catch (e: any) {
      setError(e.message || "Image generation failed");
    } finally {
      setGeneratingImage(false);
    }
  };

  const handleTrain = async () => {
    if (!trainingJobName.trim() || !trainingZipUrl.trim()) { setError("Enter job name and zip URL"); return; }
    setTraining(true); setError(null); setTrainingResult(null);
    try {
      const result = await trainClone.mutateAsync({
        jobName: trainingJobName,
        zipUrl: trainingZipUrl,
        imageCount: trainingImageCount,
        steps: trainingSteps,
      });
      setTrainingResult(result);
      refetchJobs();
    } catch (e: any) {
      setError(e.message || "Training failed");
    } finally {
      setTraining(false);
    }
  };

  const allVideos = [
    ...(existingVideos?.items || []),
    ...(cloneVideos?.items || []).filter((v: any) => v.video_url),
  ];

  // ─── Render ─────────────────────────────────────────────────────────────────
  return (
    <div style={{ minHeight: "100vh", background: "#0A0A0F", color: "#fff", fontFamily: "'Inter', sans-serif" }}>
      {/* Header */}
      <div style={{ background: "linear-gradient(135deg, #0A0A0F 0%, #1a0a2e 50%, #0A0A0F 100%)", borderBottom: "1px solid rgba(212,175,55,0.15)", padding: "24px 32px" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 8 }}>
            <div style={{ width: 48, height: 48, borderRadius: 12, background: "linear-gradient(135deg, #D4AF37, #8B6914)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Crown size={24} color="#000" />
            </div>
            <div>
              <h1 style={{ margin: 0, fontSize: 28, fontWeight: 800, background: "linear-gradient(135deg, #D4AF37, #fff)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                Clone Empire
              </h1>
              <p style={{ margin: 0, fontSize: 13, color: "rgba(255,255,255,0.5)" }}>
                Train · Generate · Monetize · Dominate
              </p>
            </div>
          </div>

          {/* Stats Bar */}
          {statsData && (
            <div style={{ display: "flex", gap: 24, marginTop: 16, flexWrap: "wrap" }}>
              {[
                { label: "Total Videos", value: statsData.videos?.total_videos || 0, icon: <Video size={14} />, color: "#D4AF37" },
                { label: "Ready", value: statsData.videos?.ready_videos || 0, icon: <CheckCircle size={14} />, color: "#10B981" },
                { label: "Training Jobs", value: statsData.training?.total_trainings || 0, icon: <Brain size={14} />, color: "#8B5CF6" },
                { label: "Total Revenue", value: `$${(statsData.content?.total_revenue || 0).toFixed(2)}`, icon: <DollarSign size={14} />, color: "#F59E0B" },
              ].map(s => (
                <div key={s.label} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ color: s.color }}>{s.icon}</span>
                  <span style={{ fontSize: 13, color: "rgba(255,255,255,0.5)" }}>{s.label}:</span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: s.color }}>{s.value}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div style={{ borderBottom: "1px solid rgba(255,255,255,0.08)", background: "#0A0A0F" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 32px", display: "flex", gap: 4 }}>
          {([
            { id: "studio", label: "Studio", icon: <Wand2 size={15} /> },
            { id: "train", label: "Train Model", icon: <Brain size={15} /> },
            { id: "gallery", label: "Gallery", icon: <Film size={15} /> },
            { id: "schedule", label: "Schedule", icon: <Calendar size={15} /> },
            { id: "stats", label: "Analytics", icon: <BarChart2 size={15} /> },
          ] as { id: Tab; label: string; icon: React.ReactNode }[]).map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              style={{ display: "flex", alignItems: "center", gap: 6, padding: "14px 18px", border: "none", background: "transparent", cursor: "pointer", fontSize: 13, fontWeight: 600, color: activeTab === tab.id ? "#D4AF37" : "rgba(255,255,255,0.4)", borderBottom: activeTab === tab.id ? "2px solid #D4AF37" : "2px solid transparent", transition: "all 0.2s" }}>
              {tab.icon}{tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "32px" }}>

        {/* ── STUDIO TAB ── */}
        {activeTab === "studio" && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>

            {/* Left: Video Generation */}
            <div>
              <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 20, padding: 24 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
                  <Video size={18} color="#D4AF37" />
                  <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>Clone Video Studio</h2>
                </div>

                {/* Mode Toggle */}
                <div style={{ display: "flex", background: "rgba(0,0,0,0.3)", borderRadius: 12, padding: 4, marginBottom: 20 }}>
                  {([
                    { id: "talking_head", label: "Talking Head", icon: <Mic size={13} /> },
                    { id: "full_body", label: "Full Body Motion", icon: <Film size={13} /> },
                  ] as { id: VideoMode; label: string; icon: React.ReactNode }[]).map(m => (
                    <button key={m.id} onClick={() => setVideoMode(m.id)}
                      style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "8px 12px", border: "none", borderRadius: 10, cursor: "pointer", fontSize: 12, fontWeight: 600, background: videoMode === m.id ? "linear-gradient(135deg, #D4AF37, #8B6914)" : "transparent", color: videoMode === m.id ? "#000" : "rgba(255,255,255,0.5)", transition: "all 0.2s" }}>
                      {m.icon}{m.label}
                    </button>
                  ))}
                </div>

                {videoMode === "talking_head" ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                    <div>
                      <label style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", marginBottom: 6, display: "block", textTransform: "uppercase", letterSpacing: 1 }}>Topic</label>
                      <input value={topic} onChange={e => setTopic(e.target.value)}
                        placeholder="e.g. Why CreatorVault is the dopest app..."
                        style={{ width: "100%", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10, padding: "10px 14px", color: "#fff", fontSize: 13, outline: "none", boxSizing: "border-box" }} />
                    </div>

                    {/* Format */}
                    <div>
                      <label style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", marginBottom: 8, display: "block", textTransform: "uppercase", letterSpacing: 1 }}>Format</label>
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 6 }}>
                        {FORMATS.map(f => (
                          <button key={f.value} onClick={() => setFormat(f.value)}
                            style={{ padding: "8px 6px", border: `1px solid ${format === f.value ? "#D4AF37" : "rgba(255,255,255,0.08)"}`, borderRadius: 8, background: format === f.value ? "rgba(212,175,55,0.1)" : "transparent", cursor: "pointer", textAlign: "center" }}>
                            <div style={{ fontSize: 11, fontWeight: 600, color: format === f.value ? "#D4AF37" : "#fff" }}>{f.label}</div>
                            <div style={{ fontSize: 10, color: "rgba(255,255,255,0.4)" }}>{f.sub}</div>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Voice */}
                    <div>
                      <label style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", marginBottom: 8, display: "block", textTransform: "uppercase", letterSpacing: 1 }}>Voice</label>
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 6 }}>
                        {VOICES.map(v => (
                          <button key={v.value} onClick={() => setVoice(v.value)}
                            style={{ padding: "8px 10px", border: `1px solid ${voice === v.value ? "#D4AF37" : "rgba(255,255,255,0.08)"}`, borderRadius: 8, background: voice === v.value ? "rgba(212,175,55,0.1)" : "transparent", cursor: "pointer", textAlign: "left" }}>
                            <div style={{ fontSize: 12, fontWeight: 600, color: voice === v.value ? "#D4AF37" : "#fff" }}>{v.label}</div>
                            <div style={{ fontSize: 10, color: "rgba(255,255,255,0.4)" }}>{v.sub}</div>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Custom Script Toggle */}
                    <div>
                      <button onClick={() => setUseCustomScript(!useCustomScript)}
                        style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: "none", cursor: "pointer", color: useCustomScript ? "#D4AF37" : "rgba(255,255,255,0.4)", fontSize: 12, padding: 0 }}>
                        <div style={{ width: 16, height: 16, borderRadius: 4, border: `2px solid ${useCustomScript ? "#D4AF37" : "rgba(255,255,255,0.2)"}`, background: useCustomScript ? "#D4AF37" : "transparent", display: "flex", alignItems: "center", justifyContent: "center" }}>
                          {useCustomScript && <CheckCircle size={10} color="#000" />}
                        </div>
                        Use custom script
                      </button>
                      {useCustomScript && (
                        <textarea value={customScript} onChange={e => setCustomScript(e.target.value)}
                          placeholder="Paste your script here..."
                          rows={4}
                          style={{ width: "100%", marginTop: 8, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10, padding: "10px 14px", color: "#fff", fontSize: 12, outline: "none", resize: "vertical", boxSizing: "border-box" }} />
                      )}
                    </div>

                    <button onClick={handleGenerateTalkingHead} disabled={generating}
                      style={{ width: "100%", padding: "14px", border: "none", borderRadius: 12, background: generating ? "rgba(212,175,55,0.3)" : "linear-gradient(135deg, #D4AF37, #8B6914)", color: generating ? "rgba(255,255,255,0.5)" : "#000", fontWeight: 700, fontSize: 14, cursor: generating ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                      {generating ? <><RefreshCw size={16} className="animate-spin" /> Generating... (~4 min)</> : <><Sparkles size={16} /> Generate Talking Head Video</>}
                    </button>
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                    <div>
                      <label style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", marginBottom: 6, display: "block", textTransform: "uppercase", letterSpacing: 1 }}>Motion Prompt</label>
                      <textarea value={fullBodyPrompt} onChange={e => setFullBodyPrompt(e.target.value)}
                        placeholder="e.g. KingCam walking confidently into a luxury penthouse, turning to face camera..."
                        rows={4}
                        style={{ width: "100%", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10, padding: "10px 14px", color: "#fff", fontSize: 13, outline: "none", resize: "vertical", boxSizing: "border-box" }} />
                    </div>
                    <div style={{ padding: 12, background: "rgba(139,92,246,0.1)", border: "1px solid rgba(139,92,246,0.2)", borderRadius: 10, fontSize: 12, color: "rgba(255,255,255,0.6)" }}>
                      <strong style={{ color: "#8B5CF6" }}>Powered by Kling O1 Pro</strong> — Full-body motion video using your KingCam reference image. 5-10 second cinematic clips.
                    </div>
                    <button onClick={handleGenerateFullBody} disabled={generating}
                      style={{ width: "100%", padding: "14px", border: "none", borderRadius: 12, background: generating ? "rgba(139,92,246,0.3)" : "linear-gradient(135deg, #8B5CF6, #4B0082)", color: generating ? "rgba(255,255,255,0.5)" : "#fff", fontWeight: 700, fontSize: 14, cursor: generating ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                      {generating ? <><RefreshCw size={16} className="animate-spin" /> Generating... (~2 min)</> : <><Film size={16} /> Generate Full Body Video</>}
                    </button>
                  </div>
                )}

                {error && (
                  <div style={{ marginTop: 12, padding: 12, background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 10, fontSize: 12, color: "#EF4444" }}>
                    {error}
                  </div>
                )}

                {lastResult && (
                  <div style={{ marginTop: 16, padding: 16, background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.2)", borderRadius: 12 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10, color: "#10B981", fontWeight: 600, fontSize: 13 }}>
                      <CheckCircle size={14} /> Generated Successfully
                    </div>
                    {lastResult.videoUrl && (
                      <video src={lastResult.videoUrl} controls style={{ width: "100%", borderRadius: 8, maxHeight: 200 }} />
                    )}
                    <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                      {lastResult.videoUrl && (
                        <a href={lastResult.videoUrl} download target="_blank" rel="noreferrer"
                          style={{ flex: 1, padding: "8px", background: "rgba(212,175,55,0.15)", border: "1px solid rgba(212,175,55,0.3)", borderRadius: 8, color: "#D4AF37", fontSize: 12, fontWeight: 600, textAlign: "center", textDecoration: "none", display: "flex", alignItems: "center", justifyContent: "center", gap: 4 }}>
                          <Download size={12} /> Download
                        </a>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Right: Image Generator */}
            <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
              <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 20, padding: 24 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
                  <Image size={18} color="#D4AF37" />
                  <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>Clone Image Generator</h2>
                </div>

                {/* Color Variants */}
                <div style={{ marginBottom: 16 }}>
                  <label style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", marginBottom: 8, display: "block", textTransform: "uppercase", letterSpacing: 1 }}>Suit Color Variant</label>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                    {COLOR_VARIANTS.map(cv => (
                      <button key={cv.value} onClick={() => setColorVariant(cv.value)}
                        title={cv.label}
                        style={{ width: 32, height: 32, borderRadius: 8, background: cv.hex, border: colorVariant === cv.value ? "2px solid #D4AF37" : "2px solid transparent", cursor: "pointer", transition: "all 0.2s", transform: colorVariant === cv.value ? "scale(1.15)" : "scale(1)" }} />
                    ))}
                  </div>
                  <div style={{ fontSize: 11, color: "#D4AF37", marginTop: 4 }}>
                    {COLOR_VARIANTS.find(c => c.value === colorVariant)?.label}
                  </div>
                </div>

                <div style={{ marginBottom: 14 }}>
                  <label style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", marginBottom: 6, display: "block", textTransform: "uppercase", letterSpacing: 1 }}>Image Prompt</label>
                  <textarea value={imagePrompt} onChange={e => setImagePrompt(e.target.value)}
                    placeholder="e.g. standing in front of a private jet, confident pose..."
                    rows={3}
                    style={{ width: "100%", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10, padding: "10px 14px", color: "#fff", fontSize: 13, outline: "none", resize: "vertical", boxSizing: "border-box" }} />
                </div>

                <button onClick={handleGenerateImage} disabled={generatingImage}
                  style={{ width: "100%", padding: "12px", border: "none", borderRadius: 12, background: generatingImage ? "rgba(212,175,55,0.3)" : "linear-gradient(135deg, #D4AF37, #8B6914)", color: generatingImage ? "rgba(255,255,255,0.5)" : "#000", fontWeight: 700, fontSize: 13, cursor: generatingImage ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                  {generatingImage ? <><RefreshCw size={14} className="animate-spin" /> Generating...</> : <><Sparkles size={14} /> Generate Clone Image</>}
                </button>

                {lastImageResult?.imageUrl && (
                  <div style={{ marginTop: 14 }}>
                    <img src={lastImageResult.imageUrl} alt="Generated clone" style={{ width: "100%", borderRadius: 12, objectFit: "cover" }} />
                    <a href={lastImageResult.imageUrl} download target="_blank" rel="noreferrer"
                      style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 4, marginTop: 8, padding: "8px", background: "rgba(212,175,55,0.1)", border: "1px solid rgba(212,175,55,0.2)", borderRadius: 8, color: "#D4AF37", fontSize: 12, fontWeight: 600, textDecoration: "none" }}>
                      <Download size={12} /> Download Image
                    </a>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ── TRAIN TAB ── */}
        {activeTab === "train" && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
            <div>
              <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 20, padding: 24 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
                  <Brain size={18} color="#8B5CF6" />
                  <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>Train Your Clone Model</h2>
                </div>

                <div style={{ padding: 14, background: "rgba(139,92,246,0.08)", border: "1px solid rgba(139,92,246,0.2)", borderRadius: 12, marginBottom: 20, fontSize: 12, color: "rgba(255,255,255,0.7)", lineHeight: 1.6 }}>
                  <strong style={{ color: "#8B5CF6" }}>How it works:</strong> Upload 20-100 high-quality images of yourself (different poses, lighting, outfits) as a ZIP file. The model trains on Replicate and updates <code style={{ color: "#D4AF37" }}>kingcam214/fluxdevcam</code> with your new data. More images = better outputs.
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                  <div>
                    <label style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", marginBottom: 6, display: "block", textTransform: "uppercase", letterSpacing: 1 }}>Training Job Name</label>
                    <input value={trainingJobName} onChange={e => setTrainingJobName(e.target.value)}
                      placeholder="e.g. KingCam Royal Suit v2"
                      style={{ width: "100%", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10, padding: "10px 14px", color: "#fff", fontSize: 13, outline: "none", boxSizing: "border-box" }} />
                  </div>
                  <div>
                    <label style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", marginBottom: 6, display: "block", textTransform: "uppercase", letterSpacing: 1 }}>ZIP File URL (images)</label>
                    <input value={trainingZipUrl} onChange={e => setTrainingZipUrl(e.target.value)}
                      placeholder="https://your-storage.com/training-images.zip"
                      style={{ width: "100%", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10, padding: "10px 14px", color: "#fff", fontSize: 13, outline: "none", boxSizing: "border-box" }} />
                    <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", marginTop: 4 }}>Upload your ZIP to S3, Google Drive, or Dropbox and paste the direct download link</div>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                    <div>
                      <label style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", marginBottom: 6, display: "block", textTransform: "uppercase", letterSpacing: 1 }}>Image Count</label>
                      <input type="number" value={trainingImageCount} onChange={e => setTrainingImageCount(parseInt(e.target.value))}
                        min={5} max={500}
                        style={{ width: "100%", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10, padding: "10px 14px", color: "#fff", fontSize: 13, outline: "none", boxSizing: "border-box" }} />
                    </div>
                    <div>
                      <label style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", marginBottom: 6, display: "block", textTransform: "uppercase", letterSpacing: 1 }}>Training Steps</label>
                      <input type="number" value={trainingSteps} onChange={e => setTrainingSteps(parseInt(e.target.value))}
                        min={100} max={4000} step={100}
                        style={{ width: "100%", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10, padding: "10px 14px", color: "#fff", fontSize: 13, outline: "none", boxSizing: "border-box" }} />
                    </div>
                  </div>
                  <button onClick={handleTrain} disabled={training}
                    style={{ width: "100%", padding: "14px", border: "none", borderRadius: 12, background: training ? "rgba(139,92,246,0.3)" : "linear-gradient(135deg, #8B5CF6, #4B0082)", color: training ? "rgba(255,255,255,0.5)" : "#fff", fontWeight: 700, fontSize: 14, cursor: training ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                    {training ? <><RefreshCw size={16} className="animate-spin" /> Starting Training...</> : <><Brain size={16} /> Start Model Training</>}
                  </button>
                </div>

                {trainingResult && (
                  <div style={{ marginTop: 16, padding: 14, background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.2)", borderRadius: 12, fontSize: 12 }}>
                    <div style={{ color: "#10B981", fontWeight: 600, marginBottom: 6 }}>Training Started!</div>
                    <div style={{ color: "rgba(255,255,255,0.6)" }}>Job ID: <code style={{ color: "#D4AF37" }}>{trainingResult.jobId}</code></div>
                    <div style={{ color: "rgba(255,255,255,0.6)", marginTop: 4 }}>Replicate ID: <code style={{ color: "#D4AF37" }}>{trainingResult.replicateTrainingId}</code></div>
                    <div style={{ color: "rgba(255,255,255,0.5)", marginTop: 6 }}>Training typically takes 20-60 minutes. Check the Training Jobs section for status.</div>
                  </div>
                )}
              </div>
            </div>

            {/* Training Jobs List */}
            <div>
              <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 20, padding: 24 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <Layers size={18} color="#D4AF37" />
                    <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>Training Jobs</h2>
                  </div>
                  <button onClick={() => refetchJobs()} style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(255,255,255,0.4)" }}>
                    <RefreshCw size={14} />
                  </button>
                </div>
                {!trainingJobs?.length ? (
                  <div style={{ textAlign: "center", padding: 40, color: "rgba(255,255,255,0.3)", fontSize: 13 }}>
                    No training jobs yet. Start your first training run to upgrade your clone model.
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {trainingJobs.map((job: any) => (
                      <div key={job.id} style={{ padding: 14, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 12 }}>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                          <span style={{ fontWeight: 600, fontSize: 13 }}>{job.job_name}</span>
                          <StatusBadge status={job.status} />
                        </div>
                        <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", display: "flex", gap: 12 }}>
                          <span>{job.image_count} images</span>
                          <span>Trigger: <code style={{ color: "#D4AF37" }}>{job.trigger_word}</code></span>
                          <span>{new Date(job.created_at).toLocaleDateString()}</span>
                        </div>
                        {job.model_version && (
                          <div style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", marginTop: 4 }}>Version: {job.model_version.substring(0, 20)}...</div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ── GALLERY TAB ── */}
        {activeTab === "gallery" && (
          <div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
              <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>Clone Video Gallery</h2>
              <button onClick={() => refetchVideos()} style={{ background: "none", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, padding: "6px 12px", cursor: "pointer", color: "rgba(255,255,255,0.5)", fontSize: 12, display: "flex", alignItems: "center", gap: 4 }}>
                <RefreshCw size={12} /> Refresh
              </button>
            </div>
            {!allVideos.length ? (
              <div style={{ textAlign: "center", padding: 80, color: "rgba(255,255,255,0.3)" }}>
                <Crown size={48} color="rgba(212,175,55,0.2)" style={{ marginBottom: 16 }} />
                <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>No clone videos yet</div>
                <div style={{ fontSize: 13 }}>Go to Studio and generate your first clone video</div>
              </div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 16 }}>
                {allVideos.map((video: any) => (
                  <VideoCard key={video.id} video={video} onPlay={url => setPlayingUrl(url)} />
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── SCHEDULE TAB ── */}
        {activeTab === "schedule" && (
          <div style={{ textAlign: "center", padding: 80 }}>
            <Calendar size={48} color="rgba(212,175,55,0.3)" style={{ marginBottom: 16 }} />
            <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>Content Scheduler</div>
            <div style={{ fontSize: 13, color: "rgba(255,255,255,0.4)", maxWidth: 400, margin: "0 auto" }}>
              Schedule your clone videos for auto-posting to Instagram, TikTok, YouTube, and Twitter. Connect your social accounts to enable scheduling.
            </div>
            <div style={{ marginTop: 24, padding: 16, background: "rgba(212,175,55,0.08)", border: "1px solid rgba(212,175,55,0.2)", borderRadius: 12, display: "inline-block", fontSize: 13, color: "#D4AF37" }}>
              Social account integration coming next sprint
            </div>
          </div>
        )}

        {/* ── STATS TAB ── */}
        {activeTab === "stats" && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 16 }}>
            {[
              { label: "Total Clone Videos", value: statsData?.videos?.total_videos || 0, icon: <Video size={20} />, color: "#D4AF37", sub: "All time" },
              { label: "Ready Videos", value: statsData?.videos?.ready_videos || 0, icon: <CheckCircle size={20} />, color: "#10B981", sub: "Available" },
              { label: "Training Jobs", value: statsData?.training?.total_trainings || 0, icon: <Brain size={20} />, color: "#8B5CF6", sub: `${statsData?.training?.successful_trainings || 0} successful` },
              { label: "Total Revenue", value: `$${(statsData?.content?.total_revenue || 0).toFixed(2)}`, icon: <DollarSign size={20} />, color: "#F59E0B", sub: "All sources" },
              { label: "Total Views", value: statsData?.content?.total_views || 0, icon: <Eye size={20} />, color: "#3B82F6", sub: "Across platforms" },
              { label: "Avg Engagement", value: `${((statsData?.content?.avg_engagement || 0) * 100).toFixed(1)}%`, icon: <Heart size={20} />, color: "#EC4899", sub: "Rate" },
            ].map(stat => (
              <div key={stat.label} style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 16, padding: 20 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                  <span style={{ color: stat.color }}>{stat.icon}</span>
                  <span style={{ fontSize: 11, color: "rgba(255,255,255,0.3)" }}>{stat.sub}</span>
                </div>
                <div style={{ fontSize: 28, fontWeight: 800, color: stat.color }}>{stat.value}</div>
                <div style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", marginTop: 4 }}>{stat.label}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Video Player Modal */}
      {playingUrl && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.9)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center" }}
          onClick={() => setPlayingUrl(null)}>
          <div style={{ position: "relative", maxWidth: "90vw", maxHeight: "90vh" }} onClick={e => e.stopPropagation()}>
            <button onClick={() => setPlayingUrl(null)}
              style={{ position: "absolute", top: -40, right: 0, background: "none", border: "none", cursor: "pointer", color: "#fff" }}>
              <X size={24} />
            </button>
            <video src={playingUrl} controls autoPlay style={{ maxWidth: "90vw", maxHeight: "80vh", borderRadius: 12 }} />
          </div>
        </div>
      )}
    </div>
  );
}
