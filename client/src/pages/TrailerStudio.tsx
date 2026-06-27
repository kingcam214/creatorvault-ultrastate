/**
 * ============================================================================
 * TRAILER STUDIO — viral adult teaser/trailer builder
 * Upload clips → pick a viral template → auto-build → download/launch.
 * Real ffmpeg trailer engine (trpc.trailer.*).
 * ============================================================================
 */
import { useState, useCallback, useEffect, ChangeEvent } from "react";
import { Link } from "wouter";
import { Upload, Loader2, Check, X, Download, Film, Music, ChevronRight, Flame, Plus } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

const GOLD = "#F2B15B", GOLD_DIM = "rgba(242,177,91,0.12)", GOLD_BORDER = "rgba(242,177,91,0.35)";
const BG = "#080808", CARD = "#111", CARD2 = "#161616", BORDER = "rgba(255,255,255,0.08)", MUTED = "rgba(255,255,255,0.45)", GREEN = "#00E676";

type Step = "clips" | "template" | "building" | "done";
interface Clip { src: string; name: string; }

export default function TrailerStudio() {
  const [step, setStep] = useState<Step>("clips");
  const [clips, setClips] = useState<Clip[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadPct, setUploadPct] = useState(0);
  const [templateId, setTemplateId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [priceLine, setPriceLine] = useState("");
  const [musicUrl, setMusicUrl] = useState<string | null>(null);
  const [aspect, setAspect] = useState<"9:16" | "16:9" | "1:1">("9:16");
  const [aiRemix, setAiRemix] = useState(false);
  const [jobId, setJobId] = useState<string | null>(null);
  const [pct, setPct] = useState(0);
  const [stage, setStage] = useState("");
  const [outputUrl, setOutputUrl] = useState<string | null>(null);

  const templatesQ = (trpc as any).trailer.getTemplates.useQuery(undefined, { retry: false });
  const buildMut = (trpc as any).trailer.buildFromTemplate.useMutation();
  const statusQ = (trpc as any).trailer.getStatus.useQuery({ jobId: jobId || "" }, { enabled: Boolean(jobId) && step === "building", refetchInterval: 2500, retry: false });

  const templates = templatesQ.data?.templates || [];

  useEffect(() => {
    const j = statusQ.data; if (!j) return;
    setPct(j.progress || 0); setStage(j.stage || "");
    if (j.status === "succeeded" && j.outputUrl) { setOutputUrl(j.outputUrl); setStep("done"); toast.success("Your trailer is ready"); }
    else if (j.status === "failed") { toast.error(j.error || "Trailer build failed"); setStep("template"); }
  }, [statusQ.data]);

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
    } catch (e: any) { toast.error(e?.message || "Upload failed"); return null; } finally { setUploading(false); }
  }, []);

  const addClip = useCallback(async (e: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []); if (!files.length) return;
    for (const f of files) { const url = await upload(f); if (url) setClips(prev => [...prev, { src: url, name: f.name }]); }
  }, [upload]);

  const addMusic = useCallback(async (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]; if (!f) return; const url = await upload(f); if (url) { setMusicUrl(url); toast.success("Music added"); }
  }, [upload]);

  const build = useCallback(async () => {
    if (!templateId) { toast.error("Pick a template"); return; }
    if (clips.length === 0) { toast.error("Add clips first"); return; }
    setStep("building"); setPct(0); setOutputUrl(null);
    try {
      const res = await buildMut.mutateAsync({
        templateId, clips: clips.map(c => ({ src: c.src })),
        title: title || undefined, ctaSubText: priceLine || undefined, aspect,
        musicUrl: musicUrl || undefined, watermarkText: title || undefined,
        aiRemix: aiRemix || undefined,
      });
      setJobId(res.jobId);
    } catch (e: any) { toast.error(e?.message || "Build failed"); setStep("template"); }
  }, [templateId, clips, title, priceLine, aspect, musicUrl, aiRemix]);

  const reset = () => { setStep("clips"); setClips([]); setTemplateId(null); setTitle(""); setPriceLine(""); setMusicUrl(null); setJobId(null); setOutputUrl(null); setPct(0); setAiRemix(false); };

  return (
    <div style={{ minHeight: "100vh", background: BG, color: "#fff", fontFamily: "DM Sans, sans-serif", paddingBottom: 110 }}>
      <header style={{ position: "sticky", top: 0, zIndex: 50, background: "rgba(8,8,8,0.96)", borderBottom: `1px solid ${BORDER}`, backdropFilter: "blur(12px)" }}>
        <div style={{ maxWidth: 760, margin: "0 auto", padding: "12px 16px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <Link href="/vault-x" style={{ fontFamily: "Bebas Neue, sans-serif", fontSize: 22, color: "#fff", textDecoration: "none" }}>Vault<span style={{ color: GOLD }}>X</span> Trailers</Link>
          {step !== "clips" && <button onClick={reset} style={{ background: "transparent", border: "none", color: MUTED, cursor: "pointer", fontSize: 13 }}>Start over</button>}
        </div>
      </header>

      <div style={{ maxWidth: 760, margin: "0 auto", padding: "20px 16px" }}>

        {/* CLIPS */}
        {step === "clips" && (
          <div>
            <p style={{ fontSize: 11, color: GOLD, fontFamily: "monospace", letterSpacing: "0.18em", textTransform: "uppercase", marginBottom: 6 }}>VaultX · Viral Trailers</p>
            <h1 style={{ fontSize: 34, fontFamily: "Bebas Neue, sans-serif", lineHeight: 1, margin: 0 }}>Make a trailer that goes viral.</h1>
            <p style={{ fontSize: 14, color: MUTED, marginTop: 10, lineHeight: 1.6, marginBottom: 20 }}>Upload a few clips. We auto-cut a hook, beat-synced body highlights, a tease peak, and a cut-to-black unlock CTA — the exact structure that stops the scroll and sells the unlock.</p>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(90px,1fr))", gap: 10, marginBottom: 16 }}>
              {clips.map((c, i) => (
                <div key={i} style={{ position: "relative", aspectRatio: "9/16", borderRadius: 10, background: CARD, border: `1px solid ${BORDER}`, display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
                  <video src={c.src} muted style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  <button onClick={() => setClips(p => p.filter((_, j) => j !== i))} style={{ position: "absolute", top: 4, right: 4, width: 20, height: 20, borderRadius: "50%", background: "rgba(0,0,0,0.7)", border: "none", color: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}><X size={12} /></button>
                  <span style={{ position: "absolute", bottom: 3, left: 4, fontSize: 9, color: MUTED }}>#{i + 1}</span>
                </div>
              ))}
              <label style={{ aspectRatio: "9/16", borderRadius: 10, border: `2px dashed ${GOLD_BORDER}`, background: GOLD_DIM, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 6, cursor: "pointer", color: GOLD }}>
                {uploading ? <><Loader2 size={20} style={{ animation: "spin 1s linear infinite" }} /><span style={{ fontSize: 10 }}>{uploadPct}%</span></> : <><Plus size={22} /><span style={{ fontSize: 10, textAlign: "center" }}>Add clips</span></>}
                <input type="file" accept="video/*,image/*" multiple style={{ display: "none" }} onChange={addClip} />
              </label>
            </div>
            <p style={{ fontSize: 12, color: MUTED, marginBottom: 20 }}>Add 2–6 clips for the best montage. More clips = more beat cuts.</p>
            <button onClick={() => setStep("template")} disabled={clips.length === 0} style={{ width: "100%", padding: "16px", borderRadius: 12, background: clips.length ? GOLD : CARD, color: clips.length ? "#000" : MUTED, fontSize: 16, fontWeight: 900, fontFamily: "Bebas Neue, sans-serif", letterSpacing: "0.06em", border: "none", cursor: clips.length ? "pointer" : "not-allowed", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
              Next: Pick a viral template <ChevronRight size={18} />
            </button>
            <style>{`@keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}`}</style>
          </div>
        )}

        {/* TEMPLATE */}
        {step === "template" && (
          <div>
            <h1 style={{ fontSize: 28, fontFamily: "Bebas Neue, sans-serif", margin: "0 0 6px" }}>Pick your viral structure.</h1>
            <p style={{ fontSize: 13, color: MUTED, marginBottom: 16 }}>Each template is a proven trailer formula. One tap sets the vibe, pacing, body-focus rotation, and CTA.</p>
            <div style={{ display: "grid", gap: 10, marginBottom: 20 }}>
              {templates.map((t: any) => (
                <button key={t.id} onClick={() => setTemplateId(t.id)} style={{ display: "flex", alignItems: "center", gap: 12, textAlign: "left", background: templateId === t.id ? GOLD_DIM : CARD, border: `1px solid ${templateId === t.id ? GOLD : BORDER}`, borderRadius: 14, padding: "14px", cursor: "pointer" }}>
                  <span style={{ fontSize: 30 }}>{t.emoji}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <p style={{ fontSize: 16, fontWeight: 800, margin: 0 }}>{t.name}</p>
                      <span style={{ fontSize: 10, color: GOLD, background: GOLD_DIM, padding: "2px 6px", borderRadius: 6 }}>{t.conversionScore}/10</span>
                    </div>
                    <p style={{ fontSize: 12, color: MUTED, margin: "3px 0 0", lineHeight: 1.4 }}>{t.tagline}</p>
                  </div>
                  {templateId === t.id && <Check size={20} color={GREEN} />}
                </button>
              ))}
            </div>

            {/* Options */}
            <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 16 }}>
              <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Your name / handle (shown on CTA + watermark)" style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 10, color: "#fff", fontSize: 14, padding: "12px 14px", outline: "none" }} />
              <input value={priceLine} onChange={e => setPriceLine(e.target.value)} placeholder='CTA line (e.g. "Unlock $29" or "Link in bio")' style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 10, color: "#fff", fontSize: 14, padding: "12px 14px", outline: "none" }} />
              <div style={{ display: "flex", gap: 8 }}>
                {(["9:16", "16:9", "1:1"] as const).map(a => <button key={a} onClick={() => setAspect(a)} style={{ flex: 1, padding: "10px", borderRadius: 8, border: `1px solid ${aspect === a ? GOLD : BORDER}`, background: aspect === a ? GOLD_DIM : "transparent", color: aspect === a ? GOLD : MUTED, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>{a}</button>)}
              </div>
              {musicUrl ? (
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: CARD, border: `1px solid ${GREEN}`, borderRadius: 10, padding: "12px 14px" }}>
                  <span style={{ fontSize: 13, display: "flex", alignItems: "center", gap: 8 }}><Music size={15} color={GREEN} /> Music added</span>
                  <button onClick={() => setMusicUrl(null)} style={{ background: "transparent", border: "none", color: MUTED, cursor: "pointer" }}><X size={16} /></button>
                </div>
              ) : (
                <label style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, background: CARD, border: `1px dashed ${BORDER}`, borderRadius: 10, padding: "14px", cursor: "pointer", color: MUTED, fontSize: 13 }}>
                  <Music size={16} /> Add music (drives the cut rhythm)
                  <input type="file" accept="audio/*" style={{ display: "none" }} onChange={addMusic} />
                </label>
              )}

              {/* AI Remix toggle */}
              <button onClick={() => setAiRemix(v => !v)} style={{ display: "flex", alignItems: "center", gap: 12, textAlign: "left", background: aiRemix ? GOLD_DIM : CARD, border: `1px solid ${aiRemix ? GOLD : BORDER}`, borderRadius: 12, padding: "14px", cursor: "pointer" }}>
                <span style={{ fontSize: 24 }}>🧠</span>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: 14, fontWeight: 800, margin: 0, color: aiRemix ? "#fff" : "#ddd" }}>AI Remix — reshoot from new angles</p>
                  <p style={{ fontSize: 11, color: MUTED, margin: "2px 0 0", lineHeight: 1.4 }}>AI generates brand-new camera angles &amp; motion from your clip so the trailer looks nothing like the original. Adds ~1–2 min.</p>
                </div>
                <div style={{ width: 44, height: 26, borderRadius: 13, background: aiRemix ? GOLD : "#333", position: "relative", flexShrink: 0, transition: "background 0.2s" }}>
                  <div style={{ position: "absolute", top: 3, left: aiRemix ? 21 : 3, width: 20, height: 20, borderRadius: "50%", background: "#fff", transition: "left 0.2s" }} />
                </div>
              </button>
            </div>
          </div>
        )}

        {/* BUILDING */}
        {step === "building" && (
          <div style={{ textAlign: "center", padding: "60px 20px" }}>
            <div style={{ width: 64, height: 64, borderRadius: "50%", background: GOLD_DIM, border: `2px solid ${GOLD_BORDER}`, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px" }}><Loader2 size={28} color={GOLD} style={{ animation: "spin 1s linear infinite" }} /></div>
            <h2 style={{ fontSize: 28, fontFamily: "Bebas Neue, sans-serif", margin: "0 0 8px" }}>Cutting your trailer...</h2>
            <p style={{ fontSize: 14, color: MUTED, marginBottom: 8 }}>{stage || "ffmpeg is assembling your viral teaser"}</p>
            <div style={{ maxWidth: 400, margin: "8px auto 0", height: 8, background: CARD, borderRadius: 4, overflow: "hidden" }}><div style={{ width: `${pct}%`, height: "100%", background: GOLD, transition: "width 0.4s" }} /></div>
            <p style={{ fontSize: 13, color: GOLD, fontWeight: 700, marginTop: 8 }}>{pct}%</p>
            <style>{`@keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}`}</style>
          </div>
        )}

        {/* DONE */}
        {step === "done" && outputUrl && (
          <div>
            <div style={{ textAlign: "center", marginBottom: 20 }}>
              <div style={{ width: 56, height: 56, borderRadius: "50%", background: "rgba(0,230,118,0.15)", border: `2px solid ${GREEN}`, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 12px" }}><Check size={24} color={GREEN} /></div>
              <h2 style={{ fontSize: 28, fontFamily: "Bebas Neue, sans-serif", margin: "0 0 4px" }}>Your trailer is ready.</h2>
              <p style={{ fontSize: 13, color: MUTED }}>A real viral-structured teaser. Post it everywhere or attach it to a paid drop.</p>
            </div>
            <div style={{ display: "flex", justifyContent: "center", marginBottom: 16 }}>
              <video src={outputUrl} controls playsInline style={{ width: "100%", maxHeight: 440, borderRadius: 14, background: "#000", ...(aspect === "16:9" ? { maxWidth: 560 } : aspect === "1:1" ? { maxWidth: 360 } : { maxWidth: 280 }) }} />
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <a href={outputUrl} download style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "16px", borderRadius: 12, background: GOLD, color: "#000", fontWeight: 900, fontSize: 16, textDecoration: "none" }}><Download size={18} /> Download trailer</a>
              <Link href="/vaultx/drop" style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "16px", borderRadius: 12, background: CARD, border: `1px solid ${GOLD_BORDER}`, color: GOLD, fontWeight: 800, fontSize: 15, textDecoration: "none" }}>Turn this into a paid drop <ChevronRight size={16} /></Link>
              <button onClick={reset} style={{ padding: "14px", borderRadius: 12, border: `1px solid ${BORDER}`, background: "transparent", color: MUTED, fontSize: 14, fontWeight: 700, cursor: "pointer" }}>Make another trailer</button>
            </div>
          </div>
        )}
      </div>

      {/* Build bar */}
      {step === "template" && (
        <div style={{ position: "fixed", inset: "auto 0 0 0", zIndex: 50, background: "rgba(8,8,8,0.96)", borderTop: `1px solid ${BORDER}`, backdropFilter: "blur(12px)", padding: "12px 16px" }}>
          <div style={{ maxWidth: 760, margin: "0 auto" }}>
            <button onClick={build} disabled={!templateId} style={{ width: "100%", padding: "16px", borderRadius: 12, background: templateId ? GOLD : CARD, color: templateId ? "#000" : MUTED, fontSize: 17, fontWeight: 900, fontFamily: "Bebas Neue, sans-serif", letterSpacing: "0.08em", border: "none", cursor: templateId ? "pointer" : "not-allowed", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
              <Flame size={18} /> BUILD VIRAL TRAILER
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
