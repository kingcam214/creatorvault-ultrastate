import React, { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";
import {
  Cpu, ChevronLeft, Play, Mic, Video, Image, RefreshCw,
  CheckCircle, Clock, AlertCircle, Download, Eye, Zap,
  Film, Sparkles, ArrowRight, Send, TrendingUp
} from "lucide-react";

const VIDEO_STYLES = [
  { key: "studio", label: "Studio", desc: "Clean dark background, professional" },
  { key: "street", label: "Street", desc: "Urban energy, dynamic" },
  { key: "course", label: "Course", desc: "Educational, clear presentation" },
  { key: "sales", label: "Sales", desc: "High-energy, conversion-focused" },
  { key: "tour", label: "Tour", desc: "Walkthrough, behind-the-scenes" },
];

const OUTPUT_TYPES = [
  { key: "talking_head", label: "Talking Head", icon: Mic, color: "#00D9FF", desc: "KingCam voice + animated visuals" },
  { key: "full_body", label: "Full Body Clone", icon: Video, color: "#C9A84C", desc: "Full body avatar video" },
  { key: "clone_image", label: "Clone Image", icon: Image, color: "#9B59B6", desc: "AI photo with your likeness" },
  { key: "audio_only", label: "Audio Only", icon: Mic, color: "#27AE60", desc: "ElevenLabs TTS voiceover" },
];

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { color: string; bg: string; icon: React.ReactNode }> = {
    ready: { color: "#27AE60", bg: "#27AE6020", icon: <CheckCircle size={11} /> },
    rendering: { color: "#F39C12", bg: "#F39C1220", icon: <RefreshCw size={11} style={{ animation: "spin 1s linear infinite" }} /> },
    failed: { color: "#E74C3C", bg: "#E74C3C20", icon: <AlertCircle size={11} /> },
    pending: { color: "#666", bg: "#1a1a2e", icon: <Clock size={11} /> },
  };
  const s = map[status] || map.pending;
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "3px 8px", borderRadius: 20, background: s.bg, color: s.color, fontSize: 11, fontWeight: 700 }}>
      {s.icon} {status?.toUpperCase()}
    </span>
  );
}

export function KingCamEngine() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<"create" | "gallery">("create");
  const [outputType, setOutputType] = useState("talking_head");
  const [script, setScript] = useState("");
  const [style, setStyle] = useState("studio");
  const [title, setTitle] = useState("");
  const [imagePrompt, setImagePrompt] = useState("");
  const [pollingId, setPollingId] = useState<string | null>(null);

  const generateTalkingHead = trpc.cloneEmpire.generateTalkingHeadWithScript.useMutation({
    onSuccess: (data) => {
      toast({ title: "Rendering Started", description: "Video will be ready in ~60 seconds" });
      setPollingId(data.videoId);
      refetchVideos();
    },
    onError: (err) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const generateFullBody = trpc.cloneEmpire.generateFullBodyVideo.useMutation({
    onSuccess: (data) => {
      toast({ title: "Rendering Started", description: "Full body video rendering..." });
      setPollingId(data.videoId);
      refetchVideos();
    },
    onError: (err) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const generateImage = trpc.cloneEmpire.generateCloneImage.useMutation({
    onSuccess: () => { toast({ title: "Image Generating", description: "Clone image will be ready shortly" }); refetchVideos(); },
    onError: (err) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const { data: videosData, refetch: refetchVideos } = trpc.cloneEmpire.listCloneVideos.useQuery(undefined);

  // Poll for rendering status
  const { data: pollingData } = (trpc.cloneEmpire as any).getCloneVideo.useQuery(
    { videoId: pollingId! },
    { enabled: !!pollingId, refetchInterval: pollingId ? 3000 : false }
  );

  useEffect(() => {
    if (pollingData && pollingData.render_status !== "rendering") {
      setPollingId(null);
      refetchVideos();
      if (pollingData.render_status === "ready") {
        toast({ title: "Video Ready!", description: "Your clone video is ready to view" });
      }
    }
  }, [pollingData]);

  const handleGenerate = () => {
    if (outputType === "clone_image") {
      if (!imagePrompt.trim()) { toast({ title: "Enter a prompt", variant: "destructive" }); return; }
      generateImage.mutate({ prompt: imagePrompt, style });
    } else {
      if (!script.trim()) { toast({ title: "Enter a script", variant: "destructive" }); return; }
      if (outputType === "full_body") {
        generateFullBody.mutate({ script, style: style as any, title: title || undefined });
      } else {
        generateTalkingHead.mutate({ script, style: style as any, title: title || undefined });
      }
    }
  };

  const isGenerating = generateTalkingHead.isPending || generateFullBody.isPending || generateImage.isPending;
  const selectedOutput = OUTPUT_TYPES.find(o => o.key === outputType);

  return (
    <div style={{ minHeight: "100vh", background: "#080810", color: "white", fontFamily: "system-ui, sans-serif" }}>
      {/* Header */}
      <div style={{ borderBottom: "1px solid #1a1a2e", padding: "16px 24px", display: "flex", alignItems: "center", gap: 16, background: "#0a0a1a" }}>
        <Link href="/king">
          <button style={{ background: "none", border: "1px solid #333", borderRadius: 8, padding: "6px 12px", color: "#888", cursor: "pointer", display: "flex", alignItems: "center", gap: 6, fontSize: 13 }}>
            <ChevronLeft size={14} /> King Hub
          </button>
        </Link>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, background: "linear-gradient(135deg, #C9A84C22, #C9A84C44)", border: "1px solid #C9A84C44", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Cpu size={16} color="#C9A84C" />
          </div>
          <div>
            <div style={{ fontSize: 16, fontWeight: 700, letterSpacing: "0.5px" }}>KingCam Engine</div>
            <div style={{ fontSize: 11, color: "#666" }}>Script → Audio → Video · ElevenLabs + FFmpeg</div>
          </div>
        </div>
        <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
          <Link href="/king/script-writer">
            <button style={{ padding: "6px 14px", borderRadius: 8, border: "1px solid #333", background: "none", color: "#888", cursor: "pointer", fontSize: 13, display: "flex", alignItems: "center", gap: 6 }}>
              <Film size={13} /> Script Writer
            </button>
          </Link>
          <button onClick={() => setActiveTab("create")} style={{ padding: "6px 16px", borderRadius: 8, border: "none", cursor: "pointer", fontSize: 13, fontWeight: 600, background: activeTab === "create" ? "#C9A84C" : "#1a1a2e", color: activeTab === "create" ? "#000" : "#888" }}>
            Create
          </button>
          <button onClick={() => { setActiveTab("gallery"); refetchVideos(); }} style={{ padding: "6px 16px", borderRadius: 8, border: "none", cursor: "pointer", fontSize: 13, fontWeight: 600, background: activeTab === "gallery" ? "#C9A84C" : "#1a1a2e", color: activeTab === "gallery" ? "#000" : "#888" }}>
            Gallery {videosData?.videos?.length ? `(${videosData.videos.length})` : ""}
          </button>
        </div>
      </div>

      {activeTab === "create" ? (
        <div style={{ display: "grid", gridTemplateColumns: "300px 1fr", gap: 0, height: "calc(100vh - 65px)" }}>
          {/* Left Panel */}
          <div style={{ borderRight: "1px solid #1a1a2e", padding: 20, overflowY: "auto", background: "#09090f" }}>
            {/* Output Type */}
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 11, color: "#666", textTransform: "uppercase", letterSpacing: "1px", marginBottom: 10 }}>Output Type</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {OUTPUT_TYPES.map(type => (
                  <button key={type.key} onClick={() => setOutputType(type.key)}
                    style={{ padding: "12px", borderRadius: 10, border: `1px solid ${outputType === type.key ? type.color : "#1a1a2e"}`, background: outputType === type.key ? `${type.color}15` : "#0f0f1a", cursor: "pointer", textAlign: "left", display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ width: 32, height: 32, borderRadius: 8, background: `${type.color}20`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <type.icon size={15} color={outputType === type.key ? type.color : "#555"} />
                    </div>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: outputType === type.key ? type.color : "#aaa" }}>{type.label}</div>
                      <div style={{ fontSize: 11, color: "#555" }}>{type.desc}</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Style */}
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 11, color: "#666", textTransform: "uppercase", letterSpacing: "1px", marginBottom: 8 }}>Style</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {VIDEO_STYLES.map(s => (
                  <button key={s.key} onClick={() => setStyle(s.key)}
                    style={{ padding: "5px 12px", borderRadius: 20, border: `1px solid ${style === s.key ? "#C9A84C" : "#1a1a2e"}`, background: style === s.key ? "#C9A84C20" : "#0f0f1a", cursor: "pointer", fontSize: 11, color: style === s.key ? "#C9A84C" : "#666", fontWeight: style === s.key ? 700 : 400 }}>
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Title */}
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 11, color: "#666", textTransform: "uppercase", letterSpacing: "1px", display: "block", marginBottom: 8 }}>Title (optional)</label>
              <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Video title..."
                style={{ width: "100%", padding: "10px 12px", background: "#0f0f1a", border: "1px solid #1a1a2e", borderRadius: 8, color: "white", fontSize: 13, outline: "none", boxSizing: "border-box" }} />
            </div>

            {/* Generate Button */}
            <button onClick={handleGenerate} disabled={isGenerating}
              style={{ width: "100%", padding: "14px", borderRadius: 10, border: "none", background: isGenerating ? "#1a1a2e" : `linear-gradient(135deg, ${selectedOutput?.color || "#C9A84C"}, ${selectedOutput?.color || "#C9A84C"}88)`, color: isGenerating ? "#555" : "#000", cursor: isGenerating ? "not-allowed" : "pointer", fontSize: 14, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
              {isGenerating ? <><RefreshCw size={16} style={{ animation: "spin 1s linear infinite" }} /> Generating...</> : <><Zap size={16} /> Generate</>}
            </button>

            {pollingId && (
              <div style={{ marginTop: 12, padding: 12, background: "#F39C1210", border: "1px solid #F39C1233", borderRadius: 8, display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "#F39C12" }}>
                <RefreshCw size={13} style={{ animation: "spin 1s linear infinite" }} />
                Rendering video... checking every 3s
              </div>
            )}
          </div>

          {/* Right Panel — Script / Prompt Input */}
          <div style={{ display: "flex", flexDirection: "column", background: "#080810" }}>
            <div style={{ padding: "12px 20px", borderBottom: "1px solid #1a1a2e", background: "#09090f", display: "flex", alignItems: "center", gap: 8 }}>
              {selectedOutput && (() => { const Icon = selectedOutput.icon; return <Icon size={14} color={selectedOutput.color} />; })()}
              <span style={{ fontSize: 13, color: "#888" }}>{selectedOutput?.label} — {selectedOutput?.desc}</span>
              <Link href="/king/script-writer" style={{ marginLeft: "auto" }}>
                <button style={{ padding: "5px 12px", borderRadius: 6, border: "1px solid #333", background: "none", color: "#888", cursor: "pointer", fontSize: 12, display: "flex", alignItems: "center", gap: 4 }}>
                  <Film size={12} /> Import from Script Writer
                </button>
              </Link>
            </div>
            <div style={{ flex: 1, padding: 24 }}>
              {outputType === "clone_image" ? (
                <div>
                  <label style={{ fontSize: 11, color: "#666", textTransform: "uppercase", letterSpacing: "1px", display: "block", marginBottom: 12 }}>Image Prompt</label>
                  <textarea value={imagePrompt} onChange={e => setImagePrompt(e.target.value)}
                    placeholder="Describe the scene, outfit, background, lighting... The trigger word 'fluxdevCam' is added automatically."
                    rows={6} style={{ width: "100%", padding: "14px", background: "#0f0f1a", border: "1px solid #1a1a2e", borderRadius: 10, color: "white", fontSize: 14, lineHeight: 1.6, outline: "none", resize: "vertical", boxSizing: "border-box", fontFamily: "inherit" }} />
                  <div style={{ marginTop: 12, fontSize: 12, color: "#555" }}>
                    Tip: Be specific about lighting, background, outfit, and expression. The model knows your face.
                  </div>
                </div>
              ) : (
                <div style={{ height: "100%" }}>
                  <label style={{ fontSize: 11, color: "#666", textTransform: "uppercase", letterSpacing: "1px", display: "block", marginBottom: 12 }}>Script / Narration</label>
                  <textarea value={script} onChange={e => setScript(e.target.value)}
                    placeholder="Paste your script here or write directly... This will be converted to KingCam's voice via ElevenLabs and rendered into a video."
                    style={{ width: "100%", height: "calc(100% - 40px)", padding: "16px", background: "#0f0f1a", border: "1px solid #1a1a2e", borderRadius: 10, color: "white", fontSize: 14, lineHeight: 1.7, outline: "none", resize: "none", boxSizing: "border-box", fontFamily: "inherit" }} />
                  {script && (
                    <div style={{ marginTop: 8, fontSize: 12, color: "#555" }}>
                      {script.split(" ").length} words · ~{Math.ceil(script.split(" ").length / 2.5)}s estimated
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        /* Gallery Tab */
        <div style={{ padding: 24 }}>
          <div style={{ marginBottom: 20, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ fontSize: 18, fontWeight: 700 }}>Clone Video Gallery</div>
            <button onClick={() => setActiveTab("create")}
              style={{ padding: "8px 16px", borderRadius: 8, border: "none", background: "#C9A84C", color: "#000", cursor: "pointer", fontSize: 13, fontWeight: 700 }}>
              + Create New
            </button>
          </div>
          {!videosData?.videos?.length ? (
            <div style={{ textAlign: "center", padding: 60, color: "#444" }}>
              <Cpu size={40} style={{ marginBottom: 12 }} />
              <div>No videos yet. Create your first clone video.</div>
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 16 }}>
              {videosData.videos.map((video: any) => (
                <div key={video.id} style={{ background: "#0f0f1a", border: "1px solid #1a1a2e", borderRadius: 12, overflow: "hidden" }}>
                  {/* Thumbnail */}
                  <div style={{ aspectRatio: "9/16", background: "#0a0a1a", display: "flex", alignItems: "center", justifyContent: "center", position: "relative", maxHeight: 200 }}>
                    {video.render_status === "ready" && video.video_url ? (
                      <video src={video.video_url} style={{ width: "100%", height: "100%", objectFit: "cover" }} controls />
                    ) : (
                      <div style={{ textAlign: "center", color: "#333" }}>
                        <Film size={32} style={{ marginBottom: 8 }} />
                        <StatusBadge status={video.render_status || "pending"} />
                      </div>
                    )}
                  </div>
                  <div style={{ padding: 14 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "#e0e0e0", marginBottom: 4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {video.title || "Untitled Video"}
                    </div>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <StatusBadge status={video.render_status || "pending"} />
                      <div style={{ fontSize: 11, color: "#555" }}>
                        {video.duration_seconds ? `${video.duration_seconds}s` : ""} {video.style || ""}
                      </div>
                    </div>
                    {video.render_status === "ready" && video.video_url && (
                      <div style={{ marginTop: 10, display: "flex", gap: 6 }}>
                        <a href={video.video_url} download style={{ flex: 1, padding: "6px", borderRadius: 6, border: "1px solid #1a1a2e", background: "none", color: "#888", cursor: "pointer", fontSize: 12, textAlign: "center", textDecoration: "none", display: "flex", alignItems: "center", justifyContent: "center", gap: 4 }}>
                          <Download size={12} /> Download
                        </a>
                        <Link href="/king/telegram-hub" style={{ flex: 1 }}>
                          <button style={{ width: "100%", padding: "6px", borderRadius: 6, border: "none", background: "#00D9FF20", color: "#00D9FF", cursor: "pointer", fontSize: 12, display: "flex", alignItems: "center", justifyContent: "center", gap: 4 }}>
                            <Send size={12} /> Send
                          </button>
                        </Link>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        * { box-sizing: border-box; }
        input::placeholder, textarea::placeholder { color: #444; }
        ::-webkit-scrollbar { width: 4px; } ::-webkit-scrollbar-track { background: #0a0a1a; } ::-webkit-scrollbar-thumb { background: #1a1a2e; border-radius: 2px; }
      `}</style>
    </div>
  );
}

export default KingCamEngine;
