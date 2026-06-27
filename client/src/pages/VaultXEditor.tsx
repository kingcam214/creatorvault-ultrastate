/**
 * ============================================================================
 * VAULTX EDITOR — Real ffmpeg-backed video editor (CapCut for adult creators)
 *
 * Every action maps to the real render pipeline (trpc.editor.*).
 * Upload → trim → pick Body Cinema preset (or tune grade/motion/caption/music)
 * → Render → download a REAL finished MP4.
 * ============================================================================
 */
import { useState, useRef, useCallback, ChangeEvent, useEffect } from "react";
import { Link } from "wouter";
import {
  Upload, Play, Pause, Scissors, Download, Loader2, Check, X,
  Sparkles, Type, Music, Droplet, Film, Volume2, VolumeX, Wand2, ChevronRight,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useVaultXLang, VaultXLangSwitcher } from "@/lib/vaultxI18n";
import { toast } from "sonner";

const GOLD = "#F2B15B";
const GOLD_DIM = "rgba(242,177,91,0.12)";
const GOLD_BORDER = "rgba(242,177,91,0.35)";
const BG = "#080808";
const CARD = "#111111";
const CARD2 = "#161616";
const BORDER = "rgba(255,255,255,0.08)";
const MUTED = "rgba(255,255,255,0.45)";
const GREEN = "#00E676";

type Step = "upload" | "edit" | "rendering" | "done";

interface Clip { src: string; name: string; duration: number; trimStart: number; trimEnd: number; type: "video" | "image"; }

function fmt(s: number) {
  const m = Math.floor(s / 60); const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, "0")}`;
}

export default function VaultXEditor() {
  const { t } = useVaultXLang();
  const [step, setStep] = useState<Step>("upload");
  const [clips, setClips] = useState<Clip[]>([]);
  const [activeClip, setActiveClip] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [uploadPct, setUploadPct] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(true);

  // Edit settings
  const [presetId, setPresetId] = useState<string | null>(null);
  const [colorGrade, setColorGrade] = useState("none");
  const [motion, setMotion] = useState("slow_push");
  const [focus, setFocus] = useState("none");
  const [aspect, setAspect] = useState<"9:16" | "16:9" | "1:1">("9:16");
  const [caption, setCaption] = useState("");
  const [captionStyle, setCaptionStyle] = useState<"bold_center" | "lower_third" | "minimal_top">("bold_center");
  const [watermark, setWatermark] = useState("");
  const [fadeInOut, setFadeInOut] = useState(true);
  const [musicUrl, setMusicUrl] = useState<string | null>(null);
  const [tab, setTab] = useState<"presets" | "focus" | "grade" | "motion" | "text" | "music">("presets");

  // Render
  const [jobId, setJobId] = useState<string | null>(null);
  const [renderPct, setRenderPct] = useState(0);
  const [outputUrl, setOutputUrl] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const musicRef = useRef<HTMLInputElement>(null);

  const presetsQuery = (trpc as any).editor.getEditPresets.useQuery(undefined, { retry: false });
  const renderMut = (trpc as any).editor.render.useMutation();
  const renderPresetMut = (trpc as any).editor.renderWithPreset.useMutation();
  const statusQuery = (trpc as any).editor.getRenderStatus.useQuery(
    { jobId: jobId || "" },
    { enabled: Boolean(jobId) && step === "rendering", refetchInterval: 3000, retry: false }
  );

  const data = presetsQuery.data;
  const presets = data?.presets || [];
  const categories = data?.categories || [];
  const colorGrades = data?.colorGrades || [];
  const motionPresets = data?.motionPresets || [];
  const focusPresets = data?.focusPresets || [];

  // Poll render status
  useEffect(() => {
    const j = statusQuery.data;
    if (!j) return;
    setRenderPct(j.progress || 0);
    if (j.status === "succeeded" && j.outputUrl) {
      setOutputUrl(j.outputUrl);
      setStep("done");
      toast.success("Your edit is ready");
    } else if (j.status === "failed") {
      toast.error(j.error || "Render failed");
      setStep("edit");
    }
  }, [statusQuery.data]);

  // ── Upload a clip ───────────────────────────────────────────────────────────
  const uploadFile = useCallback(async (file: File, type: "video" | "image" = "video"): Promise<string | null> => {
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

  const handleAddClip = useCallback(async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    const isImg = file.type.startsWith("image");
    const localUrl = URL.createObjectURL(file);
    // probe duration via a temp video element for videos
    let dur = 5;
    if (!isImg) {
      dur = await new Promise<number>(res => {
        const v = document.createElement("video"); v.preload = "metadata";
        v.onloadedmetadata = () => res(Number.isFinite(v.duration) ? v.duration : 5);
        v.onerror = () => res(5); v.src = localUrl;
      });
    }
    const hosted = await uploadFile(file, isImg ? "image" : "video");
    if (!hosted) return;
    setClips(prev => [...prev, { src: hosted, name: file.name, duration: dur, trimStart: 0, trimEnd: dur, type: isImg ? "image" : "video" }]);
    setStep("edit");
  }, [uploadFile]);

  const handleAddMusic = useCallback(async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    const hosted = await uploadFile(file);
    if (hosted) { setMusicUrl(hosted); toast.success("Music added"); }
  }, [uploadFile]);

  const applyPreset = (p: any) => {
    setPresetId(p.id);
    setColorGrade(p.colorGrade);
    setMotion(p.motion);
    setFocus(p.focus || "none");
    setAspect(p.aspect);
    setCaptionStyle(p.captionStyle);
    setFadeInOut(p.fadeInOut);
    toast.success(`${p.name} applied`);
  };

  // ── Render ────────────────────────────────────────────────────────────────
  const handleRender = useCallback(async () => {
    if (clips.length === 0) { toast.error("Add a clip first"); return; }
    setStep("rendering"); setRenderPct(0); setOutputUrl(null);
    const clipPayload = clips.map(c => ({ src: c.src, trimStart: c.trimStart, trimEnd: c.trimEnd, type: c.type }));
    try {
      let res: any;
      if (presetId) {
        res = await renderPresetMut.mutateAsync({ presetId, clips: clipPayload, captionText: caption || undefined, musicUrl: musicUrl || undefined, watermarkText: watermark || undefined });
      } else {
        res = await renderMut.mutateAsync({ clips: clipPayload, aspect, colorGrade, motion, focus, captionText: caption || undefined, captionStyle, musicUrl: musicUrl || undefined, watermarkText: watermark || undefined, fadeInOut });
      }
      setJobId(res.jobId);
    } catch (e: any) { toast.error(e?.message || "Render failed"); setStep("edit"); }
  }, [clips, presetId, caption, captionStyle, musicUrl, watermark, aspect, colorGrade, motion, focus, fadeInOut]);

  const reset = () => { setStep("upload"); setClips([]); setPresetId(null); setColorGrade("none"); setMotion("slow_push"); setFocus("none"); setCaption(""); setWatermark(""); setMusicUrl(null); setJobId(null); setOutputUrl(null); setRenderPct(0); };

  const ac = clips[activeClip];
  const aspectStyle = aspect === "16:9" ? { aspectRatio: "16/9", maxWidth: 480 } : aspect === "1:1" ? { aspectRatio: "1/1", maxWidth: 360 } : { aspectRatio: "9/16", maxHeight: 380 };

  return (
    <div style={{ minHeight: "100vh", background: BG, color: "#fff", fontFamily: "DM Sans, sans-serif", paddingBottom: 110 }}>
      <header style={{ position: "sticky", top: 0, zIndex: 50, background: "rgba(8,8,8,0.96)", borderBottom: `1px solid ${BORDER}`, backdropFilter: "blur(12px)" }}>
        <div style={{ maxWidth: 900, margin: "0 auto", padding: "12px 16px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <Link href="/vault-x" style={{ fontFamily: "Bebas Neue, sans-serif", fontSize: 22, color: "#fff", textDecoration: "none" }}>Vault<span style={{ color: GOLD }}>X</span> Editor</Link>
          {step !== "upload" && <button onClick={reset} style={{ background: "transparent", border: "none", color: MUTED, cursor: "pointer", fontSize: 13 }}>Start over</button>}
        </div>
      </header>

      <div style={{ maxWidth: 900, margin: "0 auto", padding: "20px 16px" }}>

        {/* ═══ UPLOAD ═══ */}
        {step === "upload" && (
          <div>
            <div style={{ marginBottom: 24 }}>
              <p style={{ fontSize: 11, color: GOLD, fontFamily: "monospace", letterSpacing: "0.18em", textTransform: "uppercase", marginBottom: 6 }}>VaultX Editor · Body Cinema</p>
              <h1 style={{ fontSize: 34, fontFamily: "Bebas Neue, sans-serif", lineHeight: 1, margin: 0 }}>Edit like a studio.<br />Export a finished video.</h1>
              <p style={{ fontSize: 14, color: MUTED, marginTop: 10, lineHeight: 1.6 }}>Upload your clip, trim it, apply a Body Cinema look, add captions and music — then render a real MP4 you can post anywhere. This is the real editor: every button cuts actual video.</p>
            </div>
            <label style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12, padding: "56px 20px", borderRadius: 16, border: `2px dashed ${GOLD_BORDER}`, background: GOLD_DIM, cursor: "pointer", textAlign: "center" }}>
              {uploading ? <><Loader2 size={28} color={GOLD} style={{ animation: "spin 1s linear infinite" }} /><span style={{ fontSize: 16, fontWeight: 800 }}>Uploading... {uploadPct}%</span></>
                : <><div style={{ width: 64, height: 64, borderRadius: 18, background: GOLD, display: "flex", alignItems: "center", justifyContent: "center" }}><Upload size={28} color="#000" /></div>
                  <div><p style={{ fontSize: 20, fontWeight: 800, margin: 0 }}>Tap to upload your video</p><p style={{ fontSize: 13, color: MUTED, margin: "4px 0 0" }}>Straight from your phone or computer — video or photo</p></div></>}
              <input ref={fileRef} type="file" accept="video/*,image/*" style={{ display: "none" }} onChange={handleAddClip} />
            </label>
            <style>{`@keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}`}</style>
          </div>
        )}

        {/* ═══ EDIT ═══ */}
        {step === "edit" && (
          <div style={{ display: "grid", gap: 20, gridTemplateColumns: "1fr", }}>
            {/* Preview */}
            <div style={{ display: "flex", justifyContent: "center" }}>
              <div style={{ position: "relative", borderRadius: 14, overflow: "hidden", background: "#000", border: `1px solid ${BORDER}`, width: "100%", ...aspectStyle }}>
                {ac && ac.type === "video" ? (
                  <video ref={videoRef} src={ac.src} muted={isMuted} playsInline style={{ width: "100%", height: "100%", objectFit: "cover" }}
                    onPlay={() => setIsPlaying(true)} onPause={() => setIsPlaying(false)} />
                ) : ac ? <img src={ac.src} style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : null}
                <div style={{ position: "absolute", bottom: 8, left: 8, display: "flex", gap: 6 }}>
                  {ac?.type === "video" && <button onClick={() => isPlaying ? videoRef.current?.pause() : videoRef.current?.play()} style={{ width: 32, height: 32, borderRadius: "50%", background: "rgba(0,0,0,0.7)", border: "none", color: "#fff", cursor: "pointer" }}>{isPlaying ? <Pause size={14} /> : <Play size={14} />}</button>}
                  {ac?.type === "video" && <button onClick={() => { setIsMuted(!isMuted); if (videoRef.current) videoRef.current.muted = !isMuted; }} style={{ width: 32, height: 32, borderRadius: "50%", background: "rgba(0,0,0,0.7)", border: "none", color: "#fff", cursor: "pointer" }}>{isMuted ? <VolumeX size={14} /> : <Volume2 size={14} />}</button>}
                </div>
                {colorGrade !== "none" && <div style={{ position: "absolute", top: 8, right: 8, background: "rgba(0,0,0,0.7)", borderRadius: 8, padding: "3px 8px", fontSize: 10, color: GOLD }}>{colorGrades.find((g: any) => g.id === colorGrade)?.label}</div>}
              </div>
            </div>

            {/* Aspect toggle */}
            <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
              {(["9:16", "16:9", "1:1"] as const).map(a => (
                <button key={a} onClick={() => setAspect(a)} style={{ padding: "6px 16px", borderRadius: 20, border: `1px solid ${aspect === a ? GOLD : BORDER}`, background: aspect === a ? GOLD_DIM : "transparent", color: aspect === a ? GOLD : MUTED, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>{a}</button>
              ))}
            </div>

            {/* Clips strip */}
            <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 4 }}>
              {clips.map((c, i) => (
                <button key={i} onClick={() => setActiveClip(i)} style={{ flexShrink: 0, width: 70, height: 70, borderRadius: 10, border: `2px solid ${activeClip === i ? GOLD : BORDER}`, background: CARD, color: MUTED, fontSize: 10, cursor: "pointer", position: "relative", overflow: "hidden" }}>
                  {c.type === "image" ? <img src={c.src} style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <Film size={20} style={{ marginTop: 14 }} />}
                  <span style={{ position: "absolute", bottom: 2, left: 0, right: 0, fontSize: 9 }}>{fmt(c.trimEnd - c.trimStart)}</span>
                </button>
              ))}
              <label style={{ flexShrink: 0, width: 70, height: 70, borderRadius: 10, border: `2px dashed ${BORDER}`, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: MUTED }}>
                +<input type="file" accept="video/*,image/*" style={{ display: "none" }} onChange={handleAddClip} />
              </label>
            </div>

            {/* Trim for active clip (video) */}
            {ac && ac.type === "video" && (
              <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 12, padding: "12px 14px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                  <span style={{ fontSize: 12, color: MUTED, display: "flex", alignItems: "center", gap: 6 }}><Scissors size={13} /> Trim</span>
                  <span style={{ fontSize: 12, color: GOLD, fontWeight: 700 }}>{fmt(ac.trimStart)} – {fmt(ac.trimEnd)}</span>
                </div>
                <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                  <span style={{ fontSize: 10, color: MUTED }}>Start</span>
                  <input type="range" min={0} max={Math.max(0.1, ac.duration)} step={0.1} value={ac.trimStart} onChange={e => setClips(p => p.map((c, i) => i === activeClip ? { ...c, trimStart: Math.min(parseFloat(e.target.value), c.trimEnd - 0.5) } : c))} style={{ flex: 1, accentColor: GOLD }} />
                </div>
                <div style={{ display: "flex", gap: 10, alignItems: "center", marginTop: 6 }}>
                  <span style={{ fontSize: 10, color: MUTED }}>End&nbsp;</span>
                  <input type="range" min={0} max={Math.max(0.1, ac.duration)} step={0.1} value={ac.trimEnd} onChange={e => setClips(p => p.map((c, i) => i === activeClip ? { ...c, trimEnd: Math.max(parseFloat(e.target.value), c.trimStart + 0.5) } : c))} style={{ flex: 1, accentColor: GOLD }} />
                </div>
              </div>
            )}

            {/* Tabs */}
            <div style={{ display: "flex", gap: 4, background: CARD, borderRadius: 12, padding: 4 }}>
              {([["presets", "Looks", Sparkles], ["focus", "Body", Scissors], ["grade", "Color", Droplet], ["motion", "Motion", Wand2], ["text", "Text", Type], ["music", "Music", Music]] as const).map(([id, label, Icon]) => (
                <button key={id} onClick={() => setTab(id as any)} style={{ flex: 1, padding: "8px 4px", borderRadius: 8, border: "none", background: tab === id ? GOLD : "transparent", color: tab === id ? "#000" : MUTED, fontSize: 11, fontWeight: 800, cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
                  <Icon size={15} />{label}
                </button>
              ))}
            </div>

            {/* Tab content */}
            <div style={{ minHeight: 120 }}>
              {tab === "presets" && (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
                  {presets.map((p: any) => (
                    <button key={p.id} onClick={() => applyPreset(p)} style={{ background: presetId === p.id ? GOLD_DIM : CARD, border: `1px solid ${presetId === p.id ? GOLD : BORDER}`, borderRadius: 12, padding: "12px 8px", textAlign: "center", cursor: "pointer" }}>
                      <div style={{ fontSize: 22 }}>{p.emoji}</div>
                      <p style={{ fontSize: 11, fontWeight: 800, margin: "4px 0 0" }}>{p.name}</p>
                      <p style={{ fontSize: 9, color: MUTED, margin: "2px 0 0" }}>{"🔥".repeat(Math.min(p.heat, 3))}</p>
                    </button>
                  ))}
                </div>
              )}
              {tab === "focus" && (
                <div>
                  <p style={{ fontSize: 11, color: MUTED, margin: "0 0 8px" }}>Frame the video on a specific body feature. The render crops and re-centers in real ffmpeg.</p>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
                    {focusPresets.map((f: any) => (
                      <button key={f.id} onClick={() => { setFocus(f.id); setPresetId(null); }} style={{ background: focus === f.id ? GOLD_DIM : CARD, border: `1px solid ${focus === f.id ? GOLD : BORDER}`, borderRadius: 12, padding: "12px 6px", textAlign: "center", cursor: "pointer" }}>
                        <div style={{ fontSize: 22 }}>{f.emoji}</div>
                        <p style={{ fontSize: 11, fontWeight: 800, margin: "4px 0 0", color: focus === f.id ? "#fff" : MUTED }}>{f.label}</p>
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {tab === "grade" && (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                  {colorGrades.map((g: any) => (
                    <button key={g.id} onClick={() => { setColorGrade(g.id); setPresetId(null); }} style={{ background: colorGrade === g.id ? GOLD_DIM : CARD, border: `1px solid ${colorGrade === g.id ? GOLD : BORDER}`, borderRadius: 10, padding: "12px", textAlign: "left", color: colorGrade === g.id ? "#fff" : MUTED, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>{g.label}</button>
                  ))}
                </div>
              )}
              {tab === "motion" && (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                  <p style={{ gridColumn: "1/3", fontSize: 11, color: MUTED, margin: 0 }}>Motion applies cinematic movement to photo clips.</p>
                  {motionPresets.map((mo: any) => (
                    <button key={mo.id} onClick={() => { setMotion(mo.id); setPresetId(null); }} style={{ background: motion === mo.id ? GOLD_DIM : CARD, border: `1px solid ${motion === mo.id ? GOLD : BORDER}`, borderRadius: 10, padding: "12px", textAlign: "left", color: motion === mo.id ? "#fff" : MUTED, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>{mo.label}</button>
                  ))}
                </div>
              )}
              {tab === "text" && (
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  <input value={caption} onChange={e => setCaption(e.target.value)} placeholder="Caption / hook text (burned into the video)" style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 10, color: "#fff", fontSize: 14, padding: "12px 14px", outline: "none" }} />
                  <div style={{ display: "flex", gap: 8 }}>
                    {([["bold_center", "Center"], ["lower_third", "Lower"], ["minimal_top", "Top"]] as const).map(([id, label]) => (
                      <button key={id} onClick={() => setCaptionStyle(id as any)} style={{ flex: 1, padding: "8px", borderRadius: 8, border: `1px solid ${captionStyle === id ? GOLD : BORDER}`, background: captionStyle === id ? GOLD_DIM : "transparent", color: captionStyle === id ? GOLD : MUTED, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>{label}</button>
                    ))}
                  </div>
                  <input value={watermark} onChange={e => setWatermark(e.target.value)} placeholder="Watermark text (optional, bottom corner)" style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 10, color: "#fff", fontSize: 14, padding: "12px 14px", outline: "none" }} />
                </div>
              )}
              {tab === "music" && (
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {musicUrl ? (
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: CARD, border: `1px solid ${GREEN}`, borderRadius: 10, padding: "12px 14px" }}>
                      <span style={{ fontSize: 13, display: "flex", alignItems: "center", gap: 8 }}><Music size={15} color={GREEN} /> Music added</span>
                      <button onClick={() => setMusicUrl(null)} style={{ background: "transparent", border: "none", color: MUTED, cursor: "pointer" }}><X size={16} /></button>
                    </div>
                  ) : (
                    <label style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, background: CARD, border: `1px dashed ${BORDER}`, borderRadius: 10, padding: "16px", cursor: "pointer", color: MUTED, fontSize: 13 }}>
                      <Music size={16} /> Add background music
                      <input ref={musicRef} type="file" accept="audio/*" style={{ display: "none" }} onChange={handleAddMusic} />
                    </label>
                  )}
                  <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: MUTED, cursor: "pointer" }}>
                    <input type="checkbox" checked={fadeInOut} onChange={e => setFadeInOut(e.target.checked)} style={{ accentColor: GOLD, width: 16, height: 16 }} /> Fade in / out
                  </label>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ═══ RENDERING ═══ */}
        {step === "rendering" && (
          <div style={{ textAlign: "center", padding: "60px 20px" }}>
            <div style={{ width: 64, height: 64, borderRadius: "50%", background: GOLD_DIM, border: `2px solid ${GOLD_BORDER}`, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px" }}>
              <Loader2 size={28} color={GOLD} style={{ animation: "spin 1s linear infinite" }} />
            </div>
            <h2 style={{ fontSize: 28, fontFamily: "Bebas Neue, sans-serif", margin: "0 0 8px" }}>Rendering your video...</h2>
            <p style={{ fontSize: 14, color: MUTED, marginBottom: 20 }}>ffmpeg is cutting, grading, and exporting a real MP4. This takes a moment.</p>
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
              <p style={{ fontSize: 13, color: MUTED }}>A real finished MP4 — download it or send it straight to a paid drop.</p>
            </div>
            <div style={{ display: "flex", justifyContent: "center", marginBottom: 16 }}>
              <video src={outputUrl} controls playsInline style={{ width: "100%", maxHeight: 420, borderRadius: 14, background: "#000", ...(aspect === "16:9" ? { maxWidth: 560 } : aspect === "1:1" ? { maxWidth: 360 } : { maxWidth: 280 }) }} />
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <a href={outputUrl} download style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "16px", borderRadius: 12, background: GOLD, color: "#000", fontWeight: 900, fontSize: 16, textDecoration: "none" }}><Download size={18} /> Download finished video</a>
              <Link href="/vaultx/drop" style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "16px", borderRadius: 12, background: CARD, border: `1px solid ${GOLD_BORDER}`, color: GOLD, fontWeight: 800, fontSize: 15, textDecoration: "none" }}>Turn this into a paid drop <ChevronRight size={16} /></Link>
              <button onClick={reset} style={{ padding: "14px", borderRadius: 12, border: `1px solid ${BORDER}`, background: "transparent", color: MUTED, fontSize: 14, fontWeight: 700, cursor: "pointer" }}>Edit another video</button>
            </div>
          </div>
        )}
      </div>

      {/* Bottom render bar */}
      {step === "edit" && (
        <div style={{ position: "fixed", inset: "auto 0 0 0", zIndex: 50, background: "rgba(8,8,8,0.96)", borderTop: `1px solid ${BORDER}`, backdropFilter: "blur(12px)", padding: "12px 16px" }}>
          <div style={{ maxWidth: 900, margin: "0 auto" }}>
            <button onClick={handleRender} disabled={clips.length === 0} style={{ width: "100%", padding: "16px", borderRadius: 12, background: clips.length ? GOLD : CARD, color: clips.length ? "#000" : MUTED, fontSize: 17, fontWeight: 900, fontFamily: "Bebas Neue, sans-serif", letterSpacing: "0.08em", border: "none", cursor: clips.length ? "pointer" : "not-allowed", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
              <Film size={18} /> RENDER FINISHED VIDEO
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
