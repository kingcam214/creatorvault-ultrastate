import React, { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";
import {
  FileText, Zap, Save, Copy, Send, Trash2, ChevronLeft,
  Video, MessageSquare, BookOpen, TrendingUp, Mic, Play,
  CheckCircle, Clock, RefreshCw, Sparkles, ArrowRight
} from "lucide-react";

const SCRIPT_TYPES = [
  { key: "challenge_update", label: "Challenge Update", icon: TrendingUp, color: "#00D9FF", desc: "Live progress + hype" },
  { key: "torment_thread", label: "Torment Thread", icon: MessageSquare, color: "#FF6B35", desc: "FOMO-driving posts" },
  { key: "recap_video", label: "Recap Video", icon: Video, color: "#C9A84C", desc: "Weekly wins recap" },
  { key: "mini_ebook", label: "Mini eBook", icon: BookOpen, color: "#9B59B6", desc: "Lead magnet content" },
  { key: "sales_pitch", label: "Sales Pitch", icon: TrendingUp, color: "#E74C3C", desc: "High-converting offer" },
  { key: "telegram_post", label: "Telegram Post", icon: Send, color: "#2980B9", desc: "Channel broadcast" },
  { key: "short_video", label: "Short Video", icon: Play, color: "#27AE60", desc: "TikTok/Reels/Shorts" },
  { key: "course_intro", label: "Course Intro", icon: Mic, color: "#F39C12", desc: "Course welcome video" },
];

const PLATFORMS = ["telegram", "tiktok", "instagram", "youtube", "twitter", "all"];

export function KingCamScriptWriter() {
  const { toast } = useToast();
  const [selectedType, setSelectedType] = useState("challenge_update");
  const [topic, setTopic] = useState("");
  const [context, setContext] = useState("");
  const [platform, setPlatform] = useState("telegram");
  const [generatedScript, setGeneratedScript] = useState("");
  const [scriptId, setScriptId] = useState("");
  const [activeTab, setActiveTab] = useState<"generate" | "library">("generate");
  const [editingScript, setEditingScript] = useState("");
  const [isEditing, setIsEditing] = useState(false);

  const generateMutation = trpc.kingcamScriptWriter.generateScript.useMutation({
    onSuccess: (data) => {
      setGeneratedScript(data.scriptText);
      setEditingScript(data.scriptText);
      setScriptId(data.scriptId);
      toast({ title: "Script Generated", description: `${data.wordCount} words · ~${data.estimatedDuration}s · Saved to library` });
    },
    onError: (err) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const improveMutation = trpc.kingcamScriptWriter.improveScript.useMutation({
    onSuccess: (data) => {
      setEditingScript(data.improvedScript || "");
      toast({ title: "Script Improved", description: "AI enhanced your script" });
    },
  });

  const updateStatusMutation = trpc.kingcamScriptWriter.updateScriptStatus.useMutation({
    onSuccess: () => { toast({ title: "Script Approved", description: "Ready to send to Engine" }); refetchScripts(); },
  });

  const deleteScriptMutation = trpc.kingcamScriptWriter.deleteScript.useMutation({
    onSuccess: () => { toast({ title: "Deleted" }); refetchScripts(); },
  });

  const { data: scriptsData, refetch: refetchScripts } = trpc.kingcamScriptWriter.listScripts.useQuery({ limit: 50, offset: 0 });

  const handleGenerate = () => {
    if (!topic.trim()) { toast({ title: "Enter a topic", variant: "destructive" }); return; }
    generateMutation.mutate({ scriptType: selectedType, topic, context, platform, saveToDb: true });
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(editingScript || generatedScript);
    toast({ title: "Copied to clipboard" });
  };

  const handleApprove = () => {
    if (!scriptId) return;
    updateStatusMutation.mutate({ scriptId, status: "approved" });
  };

  const selectedTypeConfig = SCRIPT_TYPES.find(t => t.key === selectedType);

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
          <div style={{ width: 32, height: 32, borderRadius: 8, background: "linear-gradient(135deg, #00D9FF22, #00D9FF44)", border: "1px solid #00D9FF44", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <FileText size={16} color="#00D9FF" />
          </div>
          <div>
            <div style={{ fontSize: 16, fontWeight: 700, letterSpacing: "0.5px" }}>Script Writer</div>
            <div style={{ fontSize: 11, color: "#666" }}>KingCam AI — Powered by GPT-4</div>
          </div>
        </div>
        <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
          <button onClick={() => setActiveTab("generate")} style={{ padding: "6px 16px", borderRadius: 8, border: "none", cursor: "pointer", fontSize: 13, fontWeight: 600, background: activeTab === "generate" ? "#00D9FF" : "#1a1a2e", color: activeTab === "generate" ? "#000" : "#888" }}>
            Generate
          </button>
          <button onClick={() => setActiveTab("library")} style={{ padding: "6px 16px", borderRadius: 8, border: "none", cursor: "pointer", fontSize: 13, fontWeight: 600, background: activeTab === "library" ? "#00D9FF" : "#1a1a2e", color: activeTab === "library" ? "#000" : "#888" }}>
            Library {scriptsData?.scripts?.length ? `(${scriptsData.scripts.length})` : ""}
          </button>
        </div>
      </div>

      {activeTab === "generate" ? (
        <div style={{ display: "grid", gridTemplateColumns: "320px 1fr", gap: 0, height: "calc(100vh - 65px)" }}>
          {/* Left Panel */}
          <div style={{ borderRight: "1px solid #1a1a2e", padding: 20, overflowY: "auto", background: "#09090f" }}>
            {/* Script Type */}
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 11, color: "#666", textTransform: "uppercase", letterSpacing: "1px", marginBottom: 10 }}>Script Type</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                {SCRIPT_TYPES.map(type => (
                  <button key={type.key} onClick={() => setSelectedType(type.key)}
                    style={{ padding: "10px 8px", borderRadius: 10, border: `1px solid ${selectedType === type.key ? type.color : "#1a1a2e"}`, background: selectedType === type.key ? `${type.color}15` : "#0f0f1a", cursor: "pointer", textAlign: "left", transition: "all 0.15s" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 3 }}>
                      <type.icon size={13} color={selectedType === type.key ? type.color : "#555"} />
                      <span style={{ fontSize: 11, fontWeight: 700, color: selectedType === type.key ? type.color : "#aaa" }}>{type.label}</span>
                    </div>
                    <div style={{ fontSize: 10, color: "#555" }}>{type.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Topic */}
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 11, color: "#666", textTransform: "uppercase", letterSpacing: "1px", display: "block", marginBottom: 8 }}>Topic *</label>
              <input value={topic} onChange={e => setTopic(e.target.value)} placeholder="e.g. $2,500 raised in 3 days..."
                style={{ width: "100%", padding: "10px 12px", background: "#0f0f1a", border: "1px solid #1a1a2e", borderRadius: 8, color: "white", fontSize: 13, outline: "none", boxSizing: "border-box" }}
                onKeyDown={e => e.key === "Enter" && handleGenerate()} />
            </div>

            {/* Context */}
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 11, color: "#666", textTransform: "uppercase", letterSpacing: "1px", display: "block", marginBottom: 8 }}>Context (optional)</label>
              <textarea value={context} onChange={e => setContext(e.target.value)} placeholder="Add details, numbers, specific points..."
                rows={3} style={{ width: "100%", padding: "10px 12px", background: "#0f0f1a", border: "1px solid #1a1a2e", borderRadius: 8, color: "white", fontSize: 13, outline: "none", resize: "vertical", boxSizing: "border-box" }} />
            </div>

            {/* Platform */}
            <div style={{ marginBottom: 20 }}>
              <label style={{ fontSize: 11, color: "#666", textTransform: "uppercase", letterSpacing: "1px", display: "block", marginBottom: 8 }}>Platform</label>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {PLATFORMS.map(p => (
                  <button key={p} onClick={() => setPlatform(p)}
                    style={{ padding: "5px 12px", borderRadius: 20, border: `1px solid ${platform === p ? "#00D9FF" : "#1a1a2e"}`, background: platform === p ? "#00D9FF20" : "#0f0f1a", cursor: "pointer", fontSize: 11, color: platform === p ? "#00D9FF" : "#666", fontWeight: platform === p ? 700 : 400 }}>
                    {p}
                  </button>
                ))}
              </div>
            </div>

            {/* Generate Button */}
            <button onClick={handleGenerate} disabled={generateMutation.isPending || !topic.trim()}
              style={{ width: "100%", padding: "14px", borderRadius: 10, border: "none", background: generateMutation.isPending ? "#1a1a2e" : `linear-gradient(135deg, ${selectedTypeConfig?.color || "#00D9FF"}, ${selectedTypeConfig?.color || "#00D9FF"}88)`, color: generateMutation.isPending ? "#555" : "#000", cursor: generateMutation.isPending ? "not-allowed" : "pointer", fontSize: 14, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
              {generateMutation.isPending ? <><RefreshCw size={16} style={{ animation: "spin 1s linear infinite" }} /> Generating...</> : <><Sparkles size={16} /> Generate Script</>}
            </button>
          </div>

          {/* Right Panel — Script Output */}
          <div style={{ display: "flex", flexDirection: "column", background: "#080810" }}>
            {generatedScript ? (
              <>
                {/* Toolbar */}
                <div style={{ padding: "12px 20px", borderBottom: "1px solid #1a1a2e", display: "flex", alignItems: "center", gap: 8, background: "#09090f" }}>
                  <div style={{ fontSize: 12, color: "#666", marginRight: "auto" }}>
                    {editingScript.split(" ").length} words · ~{Math.ceil(editingScript.split(" ").length / 2.5)}s
                  </div>
                  <button onClick={() => setIsEditing(!isEditing)}
                    style={{ padding: "6px 12px", borderRadius: 6, border: `1px solid ${isEditing ? "#00D9FF" : "#333"}`, background: isEditing ? "#00D9FF20" : "none", color: isEditing ? "#00D9FF" : "#888", cursor: "pointer", fontSize: 12 }}>
                    {isEditing ? "Preview" : "Edit"}
                  </button>
                  <button onClick={() => improveMutation.mutate({ scriptText: editingScript, instruction: "Make it more punchy and engaging" })}
                    disabled={improveMutation.isPending}
                    style={{ padding: "6px 12px", borderRadius: 6, border: "1px solid #333", background: "none", color: "#888", cursor: "pointer", fontSize: 12, display: "flex", alignItems: "center", gap: 4 }}>
                    <Zap size={12} /> {improveMutation.isPending ? "Improving..." : "Improve"}
                  </button>
                  <button onClick={handleCopy}
                    style={{ padding: "6px 12px", borderRadius: 6, border: "1px solid #333", background: "none", color: "#888", cursor: "pointer", fontSize: 12, display: "flex", alignItems: "center", gap: 4 }}>
                    <Copy size={12} /> Copy
                  </button>
                  <button onClick={handleApprove}
                    style={{ padding: "6px 16px", borderRadius: 6, border: "none", background: "#00D9FF", color: "#000", cursor: "pointer", fontSize: 12, fontWeight: 700, display: "flex", alignItems: "center", gap: 4 }}>
                    <CheckCircle size={12} /> Approve
                  </button>
                  <Link href="/king/engine">
                    <button style={{ padding: "6px 16px", borderRadius: 6, border: "none", background: "#C9A84C", color: "#000", cursor: "pointer", fontSize: 12, fontWeight: 700, display: "flex", alignItems: "center", gap: 4 }}>
                      <ArrowRight size={12} /> Send to Engine
                    </button>
                  </Link>
                </div>

                {/* Script Content */}
                <div style={{ flex: 1, padding: 24, overflowY: "auto" }}>
                  {isEditing ? (
                    <textarea value={editingScript} onChange={e => setEditingScript(e.target.value)}
                      style={{ width: "100%", height: "100%", background: "#0f0f1a", border: "1px solid #1a1a2e", borderRadius: 10, color: "white", fontSize: 14, lineHeight: 1.7, padding: 20, outline: "none", resize: "none", boxSizing: "border-box", fontFamily: "inherit" }} />
                  ) : (
                    <div style={{ background: "#0f0f1a", border: "1px solid #1a1a2e", borderRadius: 10, padding: 24 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16, paddingBottom: 16, borderBottom: "1px solid #1a1a2e" }}>
                        <div style={{ width: 8, height: 8, borderRadius: "50%", background: selectedTypeConfig?.color || "#00D9FF" }} />
                        <span style={{ fontSize: 12, color: "#666", textTransform: "uppercase", letterSpacing: "1px" }}>{selectedTypeConfig?.label} · {platform}</span>
                      </div>
                      <pre style={{ whiteSpace: "pre-wrap", fontSize: 14, lineHeight: 1.8, color: "#e0e0e0", fontFamily: "inherit", margin: 0 }}>
                        {editingScript.split("\n").map((line, i) => {
                          const isLabel = /^\[.+\]$/.test(line.trim());
                          return (
                            <span key={i}>
                              {isLabel ? <span style={{ color: selectedTypeConfig?.color || "#00D9FF", fontWeight: 700, fontSize: 12, letterSpacing: "1px" }}>{line}</span> : line}
                              {"\n"}
                            </span>
                          );
                        })}
                      </pre>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16, color: "#333" }}>
                <FileText size={48} />
                <div style={{ fontSize: 18, fontWeight: 600, color: "#444" }}>Select a type and enter a topic</div>
                <div style={{ fontSize: 13, color: "#333" }}>KingCam AI will write in your voice</div>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Library Tab */
        <div style={{ padding: 24, maxWidth: 1000, margin: "0 auto" }}>
          <div style={{ marginBottom: 20, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ fontSize: 18, fontWeight: 700 }}>Script Library</div>
            <button onClick={() => setActiveTab("generate")}
              style={{ padding: "8px 16px", borderRadius: 8, border: "none", background: "#00D9FF", color: "#000", cursor: "pointer", fontSize: 13, fontWeight: 700 }}>
              + New Script
            </button>
          </div>
          {!scriptsData?.scripts?.length ? (
            <div style={{ textAlign: "center", padding: 60, color: "#444" }}>
              <FileText size={40} style={{ marginBottom: 12 }} />
              <div>No scripts yet. Generate your first one.</div>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {scriptsData.scripts.map((script: any) => {
                const typeConfig = SCRIPT_TYPES.find(t => t.key === script.genre);
                return (
                  <div key={script.id} style={{ background: "#0f0f1a", border: "1px solid #1a1a2e", borderRadius: 12, padding: 16, display: "flex", gap: 16, alignItems: "flex-start" }}>
                    <div style={{ width: 36, height: 36, borderRadius: 8, background: `${typeConfig?.color || "#00D9FF"}15`, border: `1px solid ${typeConfig?.color || "#00D9FF"}33`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      {typeConfig ? <typeConfig.icon size={16} color={typeConfig.color} /> : <FileText size={16} color="#00D9FF" />}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                        <div style={{ fontSize: 14, fontWeight: 600, color: "#e0e0e0" }}>{script.title}</div>
                        <span style={{ padding: "2px 8px", borderRadius: 4, fontSize: 10, fontWeight: 700, background: script.status === "approved" ? "#00D9FF20" : script.status === "published" ? "#27AE6020" : "#1a1a2e", color: script.status === "approved" ? "#00D9FF" : script.status === "published" ? "#27AE60" : "#666" }}>
                          {script.status?.toUpperCase()}
                        </span>
                      </div>
                      <div style={{ fontSize: 12, color: "#555", marginBottom: 8 }}>
                        {script.platform} · {new Date(script.created_at).toLocaleDateString()}
                      </div>
                      <div style={{ fontSize: 12, color: "#777", lineHeight: 1.5, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {script.script_text?.substring(0, 120)}...
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                      <button onClick={() => { navigator.clipboard.writeText(script.script_text); toast({ title: "Copied" }); }}
                        style={{ padding: "6px 10px", borderRadius: 6, border: "1px solid #1a1a2e", background: "none", color: "#666", cursor: "pointer" }}>
                        <Copy size={13} />
                      </button>
                      {script.status !== "approved" && (
                        <button onClick={() => updateStatusMutation.mutate({ scriptId: script.id, status: "approved" })}
                          style={{ padding: "6px 10px", borderRadius: 6, border: "1px solid #00D9FF33", background: "#00D9FF10", color: "#00D9FF", cursor: "pointer" }}>
                          <CheckCircle size={13} />
                        </button>
                      )}
                      <button onClick={() => deleteScriptMutation.mutate({ scriptId: script.id })}
                        style={{ padding: "6px 10px", borderRadius: 6, border: "1px solid #E74C3C33", background: "#E74C3C10", color: "#E74C3C", cursor: "pointer" }}>
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                );
              })}
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

export default KingCamScriptWriter;
