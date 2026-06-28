/**
 * VAULTX EDITOR v2 — Real professional editor
 * Visual timeline, per-clip controls, speed ramp, transitions, text overlays
 */
import { useState, useCallback, useRef, ChangeEvent } from "react";
import { Link } from "wouter";
import { Film, Upload, Plus, Trash2, ChevronUp, ChevronDown, Loader2, Check, Download, ArrowLeft, Zap, Type, Layers } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useVaultXLang, VaultXLangSwitcher } from "@/lib/vaultxI18n";
import { toast } from "sonner";

const GOLD = "#F2B15B", GOLD_DIM = "rgba(242,177,91,0.10)", GOLD_BORDER = "rgba(242,177,91,0.3)";
const BG = "#080808", CARD = "#111", BORDER = "rgba(255,255,255,0.08)", MUTED = "rgba(255,255,255,0.45)";
const GREEN = "#00E676", CYAN = "#00BCD4";

const COLOR_GRADES = [
  { id: "none", label: "None" }, { id: "cinematic_heat", label: "Cinematic Heat" },
  { id: "luxe_gold", label: "Luxe Gold" }, { id: "neon_night", label: "Neon Night" },
  { id: "noir_afterdark", label: "After Dark Noir" }, { id: "velvet_midnight", label: "Velvet Midnight" },
  { id: "soft_glam", label: "Soft Glam" }, { id: "platinum", label: "Platinum" },
  { id: "rose_glow", label: "Rose Glow" }, { id: "deep_contrast", label: "Deep Contrast" },
];

const BODY_FOCUSES = [
  { id: "none", label: "Full Body", emoji: "🧍" }, { id: "abs", label: "Abs", emoji: "💪" },
  { id: "waist", label: "Waist", emoji: "⏳" }, { id: "butt", label: "Butt", emoji: "🍑" },
  { id: "hips", label: "Hips", emoji: "💃" }, { id: "legs", label: "Legs", emoji: "👠" },
  { id: "thighs", label: "Thighs", emoji: "🔥" }, { id: "chest", label: "Chest", emoji: "💎" },
  { id: "back", label: "Back", emoji: "🖤" }, { id: "lowerback", label: "Lower Back", emoji: "💫" },
  { id: "face", label: "Face", emoji: "👄" }, { id: "silhouette", label: "Silhouette", emoji: "✨" },
];

const SPEED_PRESETS = [
  { label: "0.25x", value: 0.25 }, { label: "0.5x", value: 0.5 },
  { label: "1x", value: 1.0 }, { label: "1.5x", value: 1.5 },
  { label: "2x", value: 2.0 }, { label: "4x", value: 4.0 },
];

interface Clip {
  id: string;
  src: string;
  name: string;
  trimStart: number;
  trimEnd: number | null;
  speed: number;
  focus: string;
  colorGrade: string;
  caption: string;
  captionStyle: string;
  transition: string;
}

interface TextOverlay {
  id: string;
  text: string;
  x: number;
  y: number;
  fontSize: number;
  color: string;
  startTime: number | null;
  endTime: number | null;
}

export default function VaultXEditor() {
  const { t } = useVaultXLang();
  const [step, setStep] = useState<"edit" | "rendering" | "done">("edit");
  const [clips, setClips] = useState<Clip[]>([]);
  const [selectedClipId, setSelectedClipId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadPct, setUploadPct] = useState(0);
  const [activeTab, setActiveTab] = useState<"timeline" | "style" | "text" | "music">("timeline");
  const [renderPct, setRenderPct] = useState(0);
  const [outputUrl, setOutputUrl] = useState<string | null>(null);
  const [jobId, setJobId] = useState<string | null>(null);

  // Global settings
  const [aspect, setAspect] = useState<"9:16" | "16:9" | "1:1">("9:16");
  const [globalGrade, setGlobalGrade] = useState("none");
  const [globalFocus, setGlobalFocus] = useState("none");
  const [captionText, setCaptionText] = useState("");
  const [captionStyle, setCaptionStyle] = useState("lower_third");
  const [animatedCaptions, setAnimatedCaptions] = useState(true);
  const [transitions, setTransitions] = useState(true);
  const [watermark, setWatermark] = useState("");
  const [fadeInOut, setFadeInOut] = useState(true);
  const [musicUrl, setMusicUrl] = useState<string | null>(null);
  const [musicVolume, setMusicVolume] = useState(0.5);
  const [textOverlays, setTextOverlays] = useState<TextOverlay[]>([]);

  const fileRef = useRef<HTMLInputElement>(null);
  const musicRef = useRef<HTMLInputElement>(null);

  const renderMut = (trpc as any).editor.render.useMutation();
  const statusQ = (trpc as any).editor.getRenderStatus.useQuery(
    { jobId: jobId || "" },
    { enabled: Boolean(jobId) && step === "rendering", refetchInterval: 2000, retry: false }
  );

  // Poll render status
  if (statusQ.data && step === "rendering") {
    const j = statusQ.data;
    setRenderPct(j.progress || 0);
    if (j.status === "succeeded" && j.outputUrl) {
      setOutputUrl(j.outputUrl);
      setStep("done");
      toast.success("Your edit is ready!");
    } else if (j.status === "failed") {
      toast.error(j.error || "Render failed");
      setStep("edit");
    }
  }

  const upload = useCallback(async (file: File): Promise<string | null> => {
    setUploading(true); setUploadPct(0);
    try {
      const fd = new FormData(); fd.append("file", file);
      const xhr = new XMLHttpRequest();
      return await new Promise<string>((resolve, reject) => {
        xhr.upload.onprogress = e => { if (e.lengthComputable) setUploadPct(Math.round(e.loaded / e.total * 100)); };
        xhr.onload = () => { if (xhr.status >= 200 && xhr.status < 300) { try { resolve(JSON.parse(xhr.responseText).url); } catch { reject(new Error("parse")); } } else reject(new Error(`Upload ${xhr.status}`)); };
        xhr.onerror = () => reject(new Error("network"));
        xhr.open("POST", "/api/video/upload/direct"); xhr.withCredentials = true; xhr.send(fd);
      });
    } catch (e: any) { toast.error(e?.message || "Upload failed"); return null; }
    finally { setUploading(false); }
  }, []);

  const addClip = useCallback(async (e: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    for (const f of files) {
      const url = await upload(f);
      if (url) {
        const clip: Clip = {
          id: Math.random().toString(36).slice(2),
          src: url, name: f.name,
          trimStart: 0, trimEnd: null,
          speed: 1.0, focus: "none", colorGrade: "none",
          caption: "", captionStyle: "lower_third", transition: "fade",
        };
        setClips(prev => [...prev, clip]);
        setSelectedClipId(clip.id);
      }
    }
    e.target.value = "";
  }, [upload]);

  const addMusic = useCallback(async (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]; if (!f) return;
    const url = await upload(f);
    if (url) { setMusicUrl(url); toast.success("Music added"); }
    e.target.value = "";
  }, [upload]);

  const updateClip = (id: string, patch: Partial<Clip>) => {
    setClips(prev => prev.map(c => c.id === id ? { ...c, ...patch } : c));
  };

  const removeClip = (id: string) => {
    setClips(prev => prev.filter(c => c.id !== id));
    if (selectedClipId === id) setSelectedClipId(null);
  };

  const moveClip = (id: string, dir: -1 | 1) => {
    setClips(prev => {
      const idx = prev.findIndex(c => c.id === id);
      if (idx < 0) return prev;
      const next = idx + dir;
      if (next < 0 || next >= prev.length) return prev;
      const arr = [...prev];
      [arr[idx], arr[next]] = [arr[next], arr[idx]];
      return arr;
    });
  };

  const addTextOverlay = () => {
    const overlay: TextOverlay = {
      id: Math.random().toString(36).slice(2),
      text: "Your text here", x: 0.5, y: 0.75,
      fontSize: 0.05, color: "white",
      startTime: null, endTime: null,
    };
    setTextOverlays(prev => [...prev, overlay]);
  };

  const handleRender = useCallback(async () => {
    if (clips.length === 0) { toast.error("Add at least one clip"); return; }
    setStep("rendering"); setRenderPct(0);
    try {
      const res = await renderMut.mutateAsync({
        clips: clips.map(c => ({
          src: c.src,
          trimStart: c.trimStart || undefined,
          trimEnd: c.trimEnd || undefined,
          speed: c.speed !== 1.0 ? c.speed : undefined,
          focus: c.focus !== "none" ? c.focus : undefined,
          colorGrade: c.colorGrade !== "none" ? c.colorGrade : undefined,
          caption: c.caption || undefined,
          captionStyle: c.captionStyle || undefined,
          transition: c.transition || undefined,
        })),
        aspect,
        colorGrade: globalGrade !== "none" ? globalGrade : undefined,
        focus: globalFocus !== "none" ? globalFocus : undefined,
        captionText: captionText || undefined,
        captionStyle: captionStyle as any,
        animatedCaptions,
        transitions,
        watermarkText: watermark || undefined,
        fadeInOut,
        musicUrl: musicUrl || undefined,
        musicVolume,
        textOverlays: textOverlays.length > 0 ? textOverlays.map(o => ({
          text: o.text, x: o.x, y: o.y, fontSize: o.fontSize, color: o.color,
          startTime: o.startTime || undefined, endTime: o.endTime || undefined,
        })) : undefined,
      });
      setJobId(res.jobId);
    } catch (e: any) { toast.error(e?.message || "Render failed"); setStep("edit"); }
  }, [clips, aspect, globalGrade, globalFocus, captionText, captionStyle, animatedCaptions, transitions, watermark, fadeInOut, musicUrl, musicVolume, textOverlays]);

  const reset = () => { setStep("edit"); setClips([]); setSelectedClipId(null); setOutputUrl(null); setJobId(null); setRenderPct(0); };

  const selectedClip = clips.find(c => c.id === selectedClipId);

  return (
    <div style={{ minHeight: "100vh", background: BG, color: "#fff", fontFamily: "DM Sans, sans-serif", paddingBottom: 100 }}>
      {/* Header */}
      <div style={{ position: "sticky", top: 0, zIndex: 50, background: "rgba(8,8,8,0.96)", borderBottom: `1px solid ${BORDER}`, backdropFilter: "blur(12px)" }}>
        <div style={{ maxWidth: 1000, margin: "0 auto", padding: "10px 16px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Link href="/vault-x" style={{ color: MUTED, textDecoration: "none", display: "flex", alignItems: "center", gap: 4, fontSize: 13 }}><ArrowLeft size={16} /></Link>
            <span style={{ fontFamily: "Bebas Neue, sans-serif", fontSize: 20 }}>{t("editor.title")}</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <VaultXLangSwitcher />
            <span style={{ fontSize: 12, color: MUTED }}>{clips.length} {t("editor.clips")}</span>
          </div>
        </div>
        {/* Tab bar */}
        {step === "edit" && (
          <div style={{ maxWidth: 1000, margin: "0 auto", display: "flex", borderTop: `1px solid ${BORDER}` }}>
            {([["timeline", "📋 Timeline"], ["style", "🎨 Style"], ["text", "✍️ Text"], ["music", "🎵 Music"]] as const).map(([id, label]) => (
              <button key={id} onClick={() => setActiveTab(id)} style={{ flex: 1, padding: "10px 8px", border: "none", background: "transparent", color: activeTab === id ? GOLD : MUTED, fontWeight: 800, fontSize: 13, cursor: "pointer", borderBottom: activeTab === id ? `2px solid ${GOLD}` : "2px solid transparent" }}>{label}</button>
            ))}
          </div>
        )}
      </div>

      <div style={{ maxWidth: 1000, margin: "0 auto", padding: "16px" }}>

        {/* ═══ EDIT ═══ */}
        {step === "edit" && (
          <div>
            {/* TIMELINE TAB */}
            {activeTab === "timeline" && (
              <div>
                {/* Clip list */}
                {clips.length === 0 ? (
                  <label style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12, minHeight: 200, border: `2px dashed ${GOLD_BORDER}`, borderRadius: 16, background: GOLD_DIM, cursor: "pointer" }}>
                    <Upload size={32} color={GOLD} />
                    <p style={{ fontSize: 16, fontWeight: 800, margin: 0, color: GOLD }}>{t("editor.upload")}</p>
                    <p style={{ fontSize: 13, color: MUTED, margin: 0 }}>Tap to upload video or image clips</p>
                    <input ref={fileRef} type="file" accept="video/*,image/*" multiple style={{ display: "none" }} onChange={addClip} />
                  </label>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {clips.map((clip, idx) => (
                      <div key={clip.id} onClick={() => setSelectedClipId(clip.id)} style={{ display: "flex", alignItems: "center", gap: 10, background: selectedClipId === clip.id ? GOLD_DIM : CARD, border: `1px solid ${selectedClipId === clip.id ? GOLD_BORDER : BORDER}`, borderRadius: 12, padding: "10px 12px", cursor: "pointer" }}>
                        {/* Thumbnail */}
                        <div style={{ width: 48, height: 64, borderRadius: 8, background: "#000", overflow: "hidden", flexShrink: 0 }}>
                          {clip.src.match(/\.(jpg|jpeg|png|webp)$/i)
                            ? <img src={clip.src} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                            : <video src={clip.src} muted style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                          }
                        </div>
                        {/* Info */}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ fontSize: 13, fontWeight: 700, margin: "0 0 3px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{clip.name}</p>
                          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                            {clip.speed !== 1.0 && <span style={{ fontSize: 10, color: CYAN, background: `${CYAN}18`, padding: "2px 6px", borderRadius: 5 }}>{clip.speed}x</span>}
                            {clip.focus !== "none" && <span style={{ fontSize: 10, color: "#FF4081", background: "rgba(255,64,129,0.12)", padding: "2px 6px", borderRadius: 5 }}>{clip.focus}</span>}
                            {clip.colorGrade !== "none" && <span style={{ fontSize: 10, color: GOLD, background: GOLD_DIM, padding: "2px 6px", borderRadius: 5 }}>{clip.colorGrade}</span>}
                            {clip.caption && <span style={{ fontSize: 10, color: "#aaa", background: "rgba(255,255,255,0.08)", padding: "2px 6px", borderRadius: 5 }}>caption</span>}
                          </div>
                        </div>
                        {/* Controls */}
                        <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
                          <button onClick={e => { e.stopPropagation(); moveClip(clip.id, -1); }} disabled={idx === 0} style={{ background: "transparent", border: "none", color: MUTED, cursor: idx === 0 ? "not-allowed" : "pointer", padding: 4 }}><ChevronUp size={16} /></button>
                          <button onClick={e => { e.stopPropagation(); moveClip(clip.id, 1); }} disabled={idx === clips.length - 1} style={{ background: "transparent", border: "none", color: MUTED, cursor: idx === clips.length - 1 ? "not-allowed" : "pointer", padding: 4 }}><ChevronDown size={16} /></button>
                          <button onClick={e => { e.stopPropagation(); removeClip(clip.id); }} style={{ background: "transparent", border: "none", color: "rgba(255,68,68,0.7)", cursor: "pointer", padding: 4 }}><Trash2 size={16} /></button>
                        </div>
                      </div>
                    ))}
                    {/* Add more */}
                    <label style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "12px", border: `1px dashed ${GOLD_BORDER}`, borderRadius: 12, background: GOLD_DIM, cursor: "pointer", color: GOLD, fontSize: 14, fontWeight: 700 }}>
                      {uploading ? <><Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} /> {uploadPct}%</> : <><Plus size={16} /> {t("editor.add_clip")}</>}
                      <input type="file" accept="video/*,image/*" multiple style={{ display: "none" }} onChange={addClip} />
                    </label>
                  </div>
                )}

                {/* Per-clip controls when a clip is selected */}
                {selectedClip && (
                  <div style={{ marginTop: 16, background: CARD, border: `1px solid ${GOLD_BORDER}`, borderRadius: 14, padding: "16px" }}>
                    <p style={{ fontSize: 11, color: GOLD, fontFamily: "monospace", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 12 }}>Clip Settings — {selectedClip.name}</p>

                    {/* Trim */}
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}>
                      <div>
                        <label style={{ fontSize: 11, color: MUTED, display: "block", marginBottom: 4 }}>Trim Start (s)</label>
                        <input type="number" min="0" step="0.1" value={selectedClip.trimStart} onChange={e => updateClip(selectedClip.id, { trimStart: parseFloat(e.target.value) || 0 })} style={{ width: "100%", background: "#0f0f0f", border: `1px solid ${BORDER}`, borderRadius: 8, color: "#fff", fontSize: 14, padding: "8px 10px", outline: "none", boxSizing: "border-box" }} />
                      </div>
                      <div>
                        <label style={{ fontSize: 11, color: MUTED, display: "block", marginBottom: 4 }}>Trim End (s, blank = full)</label>
                        <input type="number" min="0" step="0.1" value={selectedClip.trimEnd ?? ""} onChange={e => updateClip(selectedClip.id, { trimEnd: e.target.value ? parseFloat(e.target.value) : null })} style={{ width: "100%", background: "#0f0f0f", border: `1px solid ${BORDER}`, borderRadius: 8, color: "#fff", fontSize: 14, padding: "8px 10px", outline: "none", boxSizing: "border-box" }} />
                      </div>
                    </div>

                    {/* Speed */}
                    <div style={{ marginBottom: 12 }}>
                      <label style={{ fontSize: 11, color: MUTED, display: "block", marginBottom: 6 }}>Speed</label>
                      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                        {SPEED_PRESETS.map(s => (
                          <button key={s.value} onClick={() => updateClip(selectedClip.id, { speed: s.value })} style={{ padding: "6px 12px", borderRadius: 8, border: `1px solid ${selectedClip.speed === s.value ? CYAN : BORDER}`, background: selectedClip.speed === s.value ? `${CYAN}18` : "transparent", color: selectedClip.speed === s.value ? CYAN : MUTED, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>{s.label}</button>
                        ))}
                      </div>
                    </div>

                    {/* Per-clip body focus */}
                    <div style={{ marginBottom: 12 }}>
                      <label style={{ fontSize: 11, color: MUTED, display: "block", marginBottom: 6 }}>Body Focus (this clip)</label>
                      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                        {BODY_FOCUSES.slice(0, 7).map(f => (
                          <button key={f.id} onClick={() => updateClip(selectedClip.id, { focus: f.id })} style={{ padding: "5px 10px", borderRadius: 8, border: `1px solid ${selectedClip.focus === f.id ? "#FF4081" : BORDER}`, background: selectedClip.focus === f.id ? "rgba(255,64,129,0.12)" : "transparent", color: selectedClip.focus === f.id ? "#FF4081" : MUTED, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>{f.emoji} {f.label}</button>
                        ))}
                      </div>
                    </div>

                    {/* Per-clip caption */}
                    <div style={{ marginBottom: 12 }}>
                      <label style={{ fontSize: 11, color: MUTED, display: "block", marginBottom: 4 }}>Caption on this clip</label>
                      <input value={selectedClip.caption} onChange={e => updateClip(selectedClip.id, { caption: e.target.value })} placeholder="Caption text (optional)" style={{ width: "100%", background: "#0f0f0f", border: `1px solid ${BORDER}`, borderRadius: 8, color: "#fff", fontSize: 14, padding: "8px 10px", outline: "none", boxSizing: "border-box" }} />
                    </div>

                    {/* Transition into this clip */}
                    <div>
                      <label style={{ fontSize: 11, color: MUTED, display: "block", marginBottom: 6 }}>Transition into this clip</label>
                      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                        {["none", "fade", "flash", "dissolve", "circleopen"].map(t => (
                          <button key={t} onClick={() => updateClip(selectedClip.id, { transition: t })} style={{ padding: "5px 10px", borderRadius: 8, border: `1px solid ${selectedClip.transition === t ? GOLD : BORDER}`, background: selectedClip.transition === t ? GOLD_DIM : "transparent", color: selectedClip.transition === t ? GOLD : MUTED, fontSize: 12, fontWeight: 700, cursor: "pointer", textTransform: "capitalize" }}>{t}</button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* STYLE TAB */}
            {activeTab === "style" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <div>
                  <label style={{ fontSize: 11, color: MUTED, fontFamily: "monospace", letterSpacing: "0.12em", textTransform: "uppercase", display: "block", marginBottom: 8 }}>Aspect Ratio</label>
                  <div style={{ display: "flex", gap: 8 }}>
                    {(["9:16", "16:9", "1:1"] as const).map(a => <button key={a} onClick={() => setAspect(a)} style={{ flex: 1, padding: "10px", borderRadius: 8, border: `1px solid ${aspect === a ? GOLD : BORDER}`, background: aspect === a ? GOLD_DIM : "transparent", color: aspect === a ? GOLD : MUTED, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>{a}</button>)}
                  </div>
                </div>
                <div>
                  <label style={{ fontSize: 11, color: MUTED, fontFamily: "monospace", letterSpacing: "0.12em", textTransform: "uppercase", display: "block", marginBottom: 8 }}>Global Color Grade</label>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))", gap: 6 }}>
                    {COLOR_GRADES.map(g => <button key={g.id} onClick={() => setGlobalGrade(g.id)} style={{ padding: "8px 10px", borderRadius: 8, border: `1px solid ${globalGrade === g.id ? GOLD : BORDER}`, background: globalGrade === g.id ? GOLD_DIM : "transparent", color: globalGrade === g.id ? GOLD : MUTED, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>{g.label}</button>)}
                  </div>
                </div>
                <div>
                  <label style={{ fontSize: 11, color: MUTED, fontFamily: "monospace", letterSpacing: "0.12em", textTransform: "uppercase", display: "block", marginBottom: 8 }}>Global Body Focus</label>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(90px, 1fr))", gap: 6 }}>
                    {BODY_FOCUSES.map(f => <button key={f.id} onClick={() => setGlobalFocus(f.id)} style={{ padding: "7px 6px", borderRadius: 8, border: `1px solid ${globalFocus === f.id ? "#FF4081" : BORDER}`, background: globalFocus === f.id ? "rgba(255,64,129,0.12)" : "transparent", color: globalFocus === f.id ? "#FF4081" : MUTED, fontSize: 11, fontWeight: 700, cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}><span style={{ fontSize: 16 }}>{f.emoji}</span>{f.label}</button>)}
                  </div>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}>
                    <input type="checkbox" checked={transitions} onChange={e => setTransitions(e.target.checked)} style={{ accentColor: GOLD, width: 16, height: 16 }} />
                    <span style={{ fontSize: 14, color: "#ddd" }}>Transitions between clips (xfade)</span>
                  </label>
                  <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}>
                    <input type="checkbox" checked={fadeInOut} onChange={e => setFadeInOut(e.target.checked)} style={{ accentColor: GOLD, width: 16, height: 16 }} />
                    <span style={{ fontSize: 14, color: "#ddd" }}>Fade in / out</span>
                  </label>
                </div>
                <div>
                  <label style={{ fontSize: 11, color: MUTED, fontFamily: "monospace", letterSpacing: "0.12em", textTransform: "uppercase", display: "block", marginBottom: 4 }}>Watermark</label>
                  <input value={watermark} onChange={e => setWatermark(e.target.value)} placeholder="@handle or brand name" style={{ width: "100%", background: CARD, border: `1px solid ${BORDER}`, borderRadius: 8, color: "#fff", fontSize: 14, padding: "10px 12px", outline: "none", boxSizing: "border-box" }} />
                </div>
              </div>
            )}

            {/* TEXT TAB */}
            {activeTab === "text" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <div>
                  <label style={{ fontSize: 11, color: MUTED, fontFamily: "monospace", letterSpacing: "0.12em", textTransform: "uppercase", display: "block", marginBottom: 6 }}>Global Caption</label>
                  <input value={captionText} onChange={e => setCaptionText(e.target.value)} placeholder="Hook or caption text (shows on all clips)" style={{ width: "100%", background: CARD, border: `1px solid ${BORDER}`, borderRadius: 8, color: "#fff", fontSize: 14, padding: "10px 12px", outline: "none", boxSizing: "border-box" }} />
                </div>
                <div>
                  <label style={{ fontSize: 11, color: MUTED, fontFamily: "monospace", letterSpacing: "0.12em", textTransform: "uppercase", display: "block", marginBottom: 6 }}>Caption Position</label>
                  <div style={{ display: "flex", gap: 8 }}>
                    {[["bold_center", "Center"], ["lower_third", "Lower Third"], ["minimal_top", "Top"]].map(([id, label]) => (
                      <button key={id} onClick={() => setCaptionStyle(id)} style={{ flex: 1, padding: "8px", borderRadius: 8, border: `1px solid ${captionStyle === id ? GOLD : BORDER}`, background: captionStyle === id ? GOLD_DIM : "transparent", color: captionStyle === id ? GOLD : MUTED, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>{label}</button>
                    ))}
                  </div>
                </div>
                <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}>
                  <input type="checkbox" checked={animatedCaptions} onChange={e => setAnimatedCaptions(e.target.checked)} style={{ accentColor: GOLD, width: 16, height: 16 }} />
                  <span style={{ fontSize: 14, color: "#ddd" }}>Animated captions (fade-in)</span>
                </label>

                {/* Text overlays */}
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                    <label style={{ fontSize: 11, color: MUTED, fontFamily: "monospace", letterSpacing: "0.12em", textTransform: "uppercase" }}>Text Overlays</label>
                    <button onClick={addTextOverlay} style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 12px", borderRadius: 8, border: `1px solid ${GOLD_BORDER}`, background: GOLD_DIM, color: GOLD, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                      <Plus size={12} /> Add Text
                    </button>
                  </div>
                  {textOverlays.map(overlay => (
                    <div key={overlay.id} style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 10, padding: "12px", marginBottom: 8 }}>
                      <input value={overlay.text} onChange={e => setTextOverlays(prev => prev.map(o => o.id === overlay.id ? { ...o, text: e.target.value } : o))} style={{ width: "100%", background: "#0f0f0f", border: `1px solid ${BORDER}`, borderRadius: 6, color: "#fff", fontSize: 14, padding: "8px 10px", outline: "none", boxSizing: "border-box", marginBottom: 8 }} />
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6 }}>
                        <div>
                          <label style={{ fontSize: 10, color: MUTED, display: "block", marginBottom: 3 }}>X (0-1)</label>
                          <input type="number" min="0" max="1" step="0.05" value={overlay.x} onChange={e => setTextOverlays(prev => prev.map(o => o.id === overlay.id ? { ...o, x: parseFloat(e.target.value) } : o))} style={{ width: "100%", background: "#0f0f0f", border: `1px solid ${BORDER}`, borderRadius: 6, color: "#fff", fontSize: 12, padding: "6px 8px", outline: "none", boxSizing: "border-box" }} />
                        </div>
                        <div>
                          <label style={{ fontSize: 10, color: MUTED, display: "block", marginBottom: 3 }}>Y (0-1)</label>
                          <input type="number" min="0" max="1" step="0.05" value={overlay.y} onChange={e => setTextOverlays(prev => prev.map(o => o.id === overlay.id ? { ...o, y: parseFloat(e.target.value) } : o))} style={{ width: "100%", background: "#0f0f0f", border: `1px solid ${BORDER}`, borderRadius: 6, color: "#fff", fontSize: 12, padding: "6px 8px", outline: "none", boxSizing: "border-box" }} />
                        </div>
                        <div>
                          <label style={{ fontSize: 10, color: MUTED, display: "block", marginBottom: 3 }}>Color</label>
                          <input value={overlay.color} onChange={e => setTextOverlays(prev => prev.map(o => o.id === overlay.id ? { ...o, color: e.target.value } : o))} style={{ width: "100%", background: "#0f0f0f", border: `1px solid ${BORDER}`, borderRadius: 6, color: "#fff", fontSize: 12, padding: "6px 8px", outline: "none", boxSizing: "border-box" }} />
                        </div>
                      </div>
                      <button onClick={() => setTextOverlays(prev => prev.filter(o => o.id !== overlay.id))} style={{ marginTop: 8, background: "transparent", border: "none", color: "rgba(255,68,68,0.7)", cursor: "pointer", fontSize: 12 }}>Remove</button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* MUSIC TAB */}
            {activeTab === "music" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                {musicUrl ? (
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: CARD, border: `1px solid ${GREEN}`, borderRadius: 10, padding: "12px 14px" }}>
                    <span style={{ fontSize: 14, color: GREEN, fontWeight: 700 }}>🎵 Music added</span>
                    <button onClick={() => setMusicUrl(null)} style={{ background: "transparent", border: "none", color: MUTED, cursor: "pointer", fontSize: 13 }}>Remove</button>
                  </div>
                ) : (
                  <label style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "20px", border: `2px dashed ${BORDER}`, borderRadius: 12, cursor: "pointer", color: MUTED, fontSize: 14 }}>
                    <input ref={musicRef} type="file" accept="audio/*" style={{ display: "none" }} onChange={addMusic} />
                    🎵 Add background music
                  </label>
                )}
                {musicUrl && (
                  <div>
                    <label style={{ fontSize: 11, color: MUTED, fontFamily: "monospace", letterSpacing: "0.12em", textTransform: "uppercase", display: "block", marginBottom: 6 }}>Music Volume</label>
                    <input type="range" min="0" max="1" step="0.05" value={musicVolume} onChange={e => setMusicVolume(parseFloat(e.target.value))} style={{ width: "100%", accentColor: GOLD }} />
                    <p style={{ fontSize: 12, color: MUTED, marginTop: 4 }}>{Math.round(musicVolume * 100)}%</p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ═══ RENDERING ═══ */}
        {step === "rendering" && (
          <div style={{ textAlign: "center", padding: "60px 20px" }}>
            <div style={{ width: 64, height: 64, borderRadius: "50%", background: GOLD_DIM, border: `2px solid ${GOLD_BORDER}`, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px" }}>
              <Loader2 size={28} color={GOLD} style={{ animation: "spin 1s linear infinite" }} />
            </div>
            <h2 style={{ fontSize: 28, fontFamily: "Bebas Neue, sans-serif", margin: "0 0 8px" }}>Rendering your video...</h2>
            <p style={{ fontSize: 14, color: MUTED, marginBottom: 20 }}>ffmpeg is cutting, grading, and exporting a real MP4.</p>
            <div style={{ maxWidth: 400, margin: "0 auto", height: 8, background: CARD, borderRadius: 4, overflow: "hidden" }}>
              <div style={{ width: `${renderPct}%`, height: "100%", background: GOLD, transition: "width 0.4s" }} />
            </div>
            <p style={{ fontSize: 13, color: GOLD, fontWeight: 700, marginTop: 8 }}>{renderPct}%</p>
            <style>{`@keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}`}</style>
          </div>
        )}

        {/* ═══ DONE ═══ */}
        {step === "done" && outputUrl && (
          <div>
            <div style={{ textAlign: "center", marginBottom: 20 }}>
              <div style={{ width: 56, height: 56, borderRadius: "50%", background: "rgba(0,230,118,0.15)", border: `2px solid ${GREEN}`, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 12px" }}><Check size={24} color={GREEN} /></div>
              <h2 style={{ fontSize: 28, fontFamily: "Bebas Neue, sans-serif", margin: "0 0 4px" }}>Your edit is ready.</h2>
              <p style={{ fontSize: 13, color: MUTED }}>A real finished MP4 — download it or turn it into a paid drop.</p>
            </div>
            <div style={{ display: "flex", justifyContent: "center", marginBottom: 16 }}>
              <video src={outputUrl} controls playsInline style={{ width: "100%", maxHeight: 420, borderRadius: 14, background: "#000", ...(aspect === "16:9" ? { maxWidth: 560 } : aspect === "1:1" ? { maxWidth: 360 } : { maxWidth: 280 }) }} />
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <a href={outputUrl} download style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "16px", borderRadius: 12, background: GOLD, color: "#000", fontWeight: 900, fontSize: 16, textDecoration: "none" }}><Download size={18} /> Download finished video</a>
              <Link href="/vaultx/drop" style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "16px", borderRadius: 12, background: CARD, border: `1px solid ${GOLD_BORDER}`, color: GOLD, fontWeight: 800, fontSize: 15, textDecoration: "none" }}>Turn this into a paid drop →</Link>
              <button onClick={reset} style={{ padding: "14px", borderRadius: 12, border: `1px solid ${BORDER}`, background: "transparent", color: MUTED, fontSize: 14, fontWeight: 700, cursor: "pointer" }}>Edit another video</button>
            </div>
          </div>
        )}
      </div>

      {/* Bottom render bar */}
      {step === "edit" && (
        <div style={{ position: "fixed", inset: "auto 0 0 0", zIndex: 50, background: "rgba(8,8,8,0.96)", borderTop: `1px solid ${BORDER}`, backdropFilter: "blur(12px)", padding: "12px 16px" }}>
          <div style={{ maxWidth: 1000, margin: "0 auto" }}>
            <button onClick={handleRender} disabled={clips.length === 0} style={{ width: "100%", padding: "16px", borderRadius: 12, background: clips.length ? GOLD : CARD, color: clips.length ? "#000" : MUTED, fontSize: 17, fontWeight: 900, fontFamily: "Bebas Neue, sans-serif", letterSpacing: "0.08em", border: "none", cursor: clips.length ? "pointer" : "not-allowed", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
              <Film size={18} /> RENDER FINISHED VIDEO
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
