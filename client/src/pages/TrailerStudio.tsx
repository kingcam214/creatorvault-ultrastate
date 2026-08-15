/**
 * ============================================================================
 * VAULTX TRAILER STUDIO — Full Creative Suite
 * 5 creation modes × 10 templates × full FX controls = maximum versatility
 * ============================================================================
 */
import { useState, useCallback, useEffect, ChangeEvent } from "react";
import { Link, useSearch } from "wouter";
import { Upload, Loader2, Check, X, Download, Film, Music, ChevronRight, Flame, Plus, Sparkles, Zap, Camera, Image, Layers } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useVaultXLang, VaultXLangSwitcher } from "@/lib/vaultxI18n";
import { toast } from "sonner";
import MediaPicker, { type MediaAssetItem } from "@/components/MediaPicker";

const GOLD = "#F2B15B", GOLD_DIM = "rgba(242,177,91,0.12)", GOLD_BORDER = "rgba(242,177,91,0.35)";
const BG = "#080808", CARD = "#111", BORDER = "rgba(255,255,255,0.08)", MUTED = "rgba(255,255,255,0.45)", GREEN = "#00E676";

type Step = "mode" | "clips" | "template" | "fx" | "building" | "done";
type Mode = "original" | "ai_remix" | "ai_full_shoot" | "hybrid" | "photo_cinematic";
interface Clip { src: string; name: string; }

function isLockedKingCamHero(asset: MediaAssetItem) {
  const reference = [asset.publicUrl, asset.fileName, asset.originalName].filter(Boolean).join(" ").toLowerCase();
  return reference.includes("/videos/kingcam-hero-cam.mp4") || reference.includes("kingcam-continuous-hero-loop");
}

const MODES: { id: Mode; emoji: string; name: string; desc: string; badge?: string; aiTime?: string }[] = [
  { id: "original", emoji: "🎬", name: "Trailer Direction", desc: "Keep your footage intact. Build a source-backed story, opening, pacing, and payoff around the strongest moments you already own.", badge: "SOURCE FIRST" },
];

const VIBES = [
  { id: "cinematic_heat", label: "Cinematic Heat", emoji: "🔥" },
  { id: "luxe_gold",      label: "Luxe Gold",      emoji: "✨" },
  { id: "neon_night",     label: "Neon Night",     emoji: "🌃" },
  { id: "noir_afterdark", label: "After Dark Noir",emoji: "🖤" },
  { id: "velvet_midnight",label: "Velvet Midnight",emoji: "🌙" },
];

export default function TrailerStudio() {
  const search = useSearch();
  const handoffParams = new URLSearchParams(search);
  const selectedVaultAssetId = handoffParams.get("sourceAssetId");
  const selectedVaultAssetIds = Array.from(new Set([
    ...(handoffParams.get("sourceAssetIds") || "").split(",").filter(Boolean),
    ...(selectedVaultAssetId ? [selectedVaultAssetId] : []),
  ]));
  const [step, setStep] = useState<Step>("mode");
  const [mode, setMode] = useState<Mode>("original");
  const [clips, setClips] = useState<Clip[]>([]);
  const [selectedAssetIds, setSelectedAssetIds] = useState<string[]>([]);
  const [mediaPickerOpen, setMediaPickerOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadPct, setUploadPct] = useState(0);
  const [templateId, setTemplateId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [priceLine, setPriceLine] = useState("");
  const [musicUrl, setMusicUrl] = useState<string | null>(null);
  const [audioAssetId, setAudioAssetId] = useState<string | null>(null);
  const [trailerProjectId, setTrailerProjectId] = useState<string | null>(null);
  const [aspect, setAspect] = useState<"9:16" | "16:9" | "1:1">("9:16");
  const [vibe, setVibe] = useState("cinematic_heat");
  // FX toggles
  const [chroma, setChroma] = useState(false);
  const [lightLeaks, setLightLeaks] = useState(false);
  const [letterbox, setLetterbox] = useState(false);
  const [glitch, setGlitch] = useState(false);
  const [jobId, setJobId] = useState<string | null>(null);
  const [pct, setPct] = useState(0);
  const [stage, setStage] = useState("");
  const [outputUrl, setOutputUrl] = useState<string | null>(null);
  const [directionSaved, setDirectionSaved] = useState(false);

  const { t } = useVaultXLang();
  const templatesQ = (trpc as any).trailer.getTemplates.useQuery(undefined, { retry: false });
  const audioLibraryQ = (trpc as any).audioIntelligence.listAssets.useQuery();
  const createTrailerProjectMut = (trpc as any).mediaAssets.createTrailerProject.useMutation();
  const selectedVaultSourceQ = (trpc as any).mediaAssets.list.useQuery(
    { filter: "videos", limit: 120 },
    { enabled: selectedVaultAssetIds.length > 0, staleTime: 30_000 },
  );
  const statusQ = (trpc as any).trailer.getStatus.useQuery({ jobId: jobId || "" }, { enabled: Boolean(jobId) && step === "building", refetchInterval: 3000, retry: false });
  const templates = (templatesQ.data?.templates || []).filter((template: any) => !template.aiRemix && !template.polish && !template.transitions);

  useEffect(() => {
    const j = statusQ.data; if (!j) return;
    setPct(j.progress || 0); setStage(j.stage || "");
    if (j.status === "succeeded" && j.outputUrl) { setOutputUrl(j.outputUrl); setStep("done"); toast.success("Your trailer is ready"); }
    else if (j.status === "failed") { toast.error(j.error || "Build failed"); setStep("fx"); }
  }, [statusQ.data]);

  useEffect(() => {
    if (selectedVaultAssetIds.length === 0 || selectedAssetIds.length > 0) return;
    const media = Array.isArray(selectedVaultSourceQ.data) ? selectedVaultSourceQ.data as MediaAssetItem[] : [];
    const selectedAssets = selectedVaultAssetIds
      .map((assetId) => media.find((asset) => asset.id === assetId && Boolean(asset.publicUrl)))
      .filter((asset): asset is MediaAssetItem => Boolean(asset?.publicUrl) && !isLockedKingCamHero(asset));
    if (selectedAssets.length === 0) return;
    setClips(selectedAssets.map((asset) => ({ src: asset.publicUrl!, name: asset.originalName || asset.fileName })));
    setSelectedAssetIds(selectedAssets.map((asset) => asset.id));
    setStep("clips");
    toast.success(`${selectedAssets.length === 1 ? "Your selected Vault source is" : "Your selected Vault sources are"} ready for trailer direction.`);
  }, [selectedAssetIds.length, selectedVaultAssetIds.join(","), selectedVaultSourceQ.data]);

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
    if (!templateId) { toast.error("Pick a trailer direction"); return; }
    if (clips.length === 0 || selectedAssetIds.length === 0) { toast.error("Choose saved CreatorVault media first"); return; }
    try {
      let projectId = trailerProjectId;
      if (!projectId) {
        const selectedTemplate = templates.find((template: any) => template.id === templateId);
        if (!selectedTemplate) { toast.error("Pick a trailer direction"); return; }
        const trailerHooks = [selectedTemplate.hookText, selectedTemplate.ctaText, selectedTemplate.ctaSubText].filter(Boolean);
        const directedSegments = selectedTemplate.focusRotation.map((focus: string, sceneIndex: number) => ({
          sceneIndex,
          text: sceneIndex === 0 ? (selectedTemplate.hookText || selectedTemplate.name) : sceneIndex === selectedTemplate.focusRotation.length - 1 ? selectedTemplate.ctaText : "",
          visualDescription: `${selectedTemplate.name}: ${focus} focus within the selected CreatorVault source.`,
          duration: selectedTemplate.intensity === "slow" ? 3 : selectedTemplate.intensity === "minimal" ? 4 : 1.5,
        }));
        const project = await createTrailerProjectMut.mutateAsync({
          projectName: title || "Directed trailer",
          projectType: "launch_trailer",
          format: aspect,
          title: title || undefined,
          concept: [priceLine, `${selectedTemplate.name} · ${selectedTemplate.vibe}`].filter(Boolean).join(" · "),
          scriptText: `${selectedTemplate.name} direction. ${selectedTemplate.tagline}`,
          hooks: trailerHooks,
          segments: directedSegments,
          selectedAssetIds,
        });
        projectId = project.trailerProjectId;
        setTrailerProjectId(projectId);
      }
      setDirectionSaved(true);
      toast.success("Your real sources and trailer direction are saved. CreatorVault will not substitute visual effects for a finished premium trailer.");
    } catch (e: any) { toast.error(e?.message || "Trailer direction could not be saved"); }
  }, [templateId, clips, title, priceLine, aspect, trailerProjectId, selectedAssetIds, templates]);

  const reset = () => { setStep("mode"); setClips([]); setSelectedAssetIds([]); setTemplateId(null); setTitle(""); setPriceLine(""); setMusicUrl(null); setAudioAssetId(null); setTrailerProjectId(null); setJobId(null); setOutputUrl(null); setDirectionSaved(false); setPct(0); setChroma(false); setLightLeaks(false); setLetterbox(false); setGlitch(false); };

  const selectedMode = MODES.find(m => m.id === mode);
  const isAIMode = mode !== "original";

  return (
    <div style={{ minHeight: "100vh", background: BG, color: "#fff", fontFamily: "DM Sans, sans-serif", paddingBottom: 120 }}>
      <header style={{ position: "sticky", top: 0, zIndex: 50, background: "rgba(8,8,8,0.96)", borderBottom: `1px solid ${BORDER}`, backdropFilter: "blur(12px)" }}>
        <div style={{ maxWidth: 800, margin: "0 auto", padding: "12px 16px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <Link href="/vault-x" style={{ fontFamily: "Bebas Neue, sans-serif", fontSize: 22, color: "#fff", textDecoration: "none" }}>Vault<span style={{ color: GOLD }}>X</span> Trailers</Link>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <VaultXLangSwitcher style={{ marginRight: 8 }} />
          {step !== "mode" && <button onClick={reset} style={{ background: "transparent", border: "none", color: MUTED, cursor: "pointer", fontSize: 13 }}>{t("trailer.start_over")}</button>}
            {step !== "mode" && step !== "building" && step !== "done" && (
              <div style={{ display: "flex", gap: 4 }}>
                {["clips", "template", "fx"].map((s, i) => (
                  <div key={s} style={{ width: 8, height: 8, borderRadius: "50%", background: ["clips","template","fx"].indexOf(step) >= i ? GOLD : BORDER }} />
                ))}
              </div>
            )}
          </div>
        </div>
      </header>

      <div style={{ maxWidth: 800, margin: "0 auto", padding: "20px 16px" }}>

        {/* ═══ MODE SELECTION ═══ */}
        {step === "mode" && (
          <div>
            <p style={{ fontSize: 11, color: GOLD, fontFamily: "monospace", letterSpacing: "0.18em", textTransform: "uppercase", marginBottom: 6 }}>VaultX · Trailer Maker</p>
            <h1 style={{ fontSize: 34, fontFamily: "Bebas Neue, sans-serif", lineHeight: 1, margin: "0 0 8px" }}>{t("trailer.mode_title")}</h1>
            <p style={{ fontSize: 14, color: MUTED, marginBottom: 20, lineHeight: 1.6 }}>Start with the footage you already own. The Director keeps the selected source, opening, story structure, and release purpose together before any finishing lane is considered.</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {MODES.map(m => (
                <button key={m.id} onClick={() => { setMode(m.id); setStep("clips"); }} style={{ display: "flex", alignItems: "center", gap: 14, textAlign: "left", background: CARD, border: `1px solid ${BORDER}`, borderRadius: 16, padding: "16px", cursor: "pointer", transition: "border 0.15s" }}>
                  <span style={{ fontSize: 32, flexShrink: 0 }}>{m.emoji}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                      <p style={{ fontSize: 16, fontWeight: 800, margin: 0 }}>{m.name}</p>
                      {m.badge && <span style={{ fontSize: 10, fontWeight: 800, color: GOLD, background: GOLD_DIM, padding: "2px 7px", borderRadius: 6, letterSpacing: "0.06em" }}>{m.badge}</span>}
                      {m.aiTime && <span style={{ fontSize: 10, color: MUTED }}>{m.aiTime}</span>}
                    </div>
                    <p style={{ fontSize: 12, color: MUTED, margin: 0, lineHeight: 1.5 }}>{m.desc}</p>
                  </div>
                  <ChevronRight size={18} color={MUTED} />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ═══ CLIPS ═══ */}
        {step === "clips" && (
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
              <span style={{ fontSize: 24 }}>{selectedMode?.emoji}</span>
              <div>
                <h2 style={{ fontSize: 24, fontFamily: "Bebas Neue, sans-serif", margin: 0 }}>{selectedMode?.name}</h2>
                <p style={{ fontSize: 12, color: MUTED, margin: 0 }}>
                  {mode === "photo_cinematic" ? "Upload a photo — AI animates it into cinematic shots." :
                   mode === "ai_full_shoot" ? "Upload 1 clip or photo — AI generates all the shots." :
                   mode === "hybrid" ? "Upload 2–4 clips — AI generates shots from each for max variety." :
                   "Choose the real clips already saved in your CreatorVault."}
                </p>
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(90px,1fr))", gap: 10, marginBottom: 16 }}>
              {clips.map((c, i) => (
                <div key={i} style={{ position: "relative", aspectRatio: "9/16", borderRadius: 10, background: CARD, border: `1px solid ${BORDER}`, overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  {c.name.match(/\.(jpg|jpeg|png|webp)$/i) ? <img src={c.src} style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <video src={c.src} muted autoPlay loop playsInline preload="metadata" style={{ width: "100%", height: "100%", objectFit: "cover" }} />}
                  <button onClick={() => setClips(p => p.filter((_, j) => j !== i))} style={{ position: "absolute", top: 4, right: 4, width: 22, height: 22, borderRadius: "50%", background: "rgba(0,0,0,0.8)", border: "none", color: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}><X size={12} /></button>
                  <span style={{ position: "absolute", bottom: 3, left: 4, fontSize: 9, color: MUTED }}>#{i + 1}</span>
                </div>
              ))}
              <button onClick={() => setMediaPickerOpen(true)} style={{ aspectRatio: "9/16", borderRadius: 10, border: `2px dashed ${GOLD_BORDER}`, background: GOLD_DIM, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 6, cursor: "pointer", color: GOLD }}>
                <Plus size={22} /><span style={{ fontSize: 10, textAlign: "center" }}>Choose from Vault</span>
              </button>
            </div>
            <p style={{ fontSize: 12, color: MUTED, marginBottom: 20 }}>Choose the real clips or images already saved in your CreatorVault. The Director will build from those actual sources, never from a fake showcase.</p>
            <button onClick={() => setStep("template")} disabled={clips.length === 0} style={{ width: "100%", padding: "16px", borderRadius: 12, background: clips.length ? GOLD : CARD, color: clips.length ? "#000" : MUTED, fontSize: 16, fontWeight: 900, fontFamily: "Bebas Neue, sans-serif", letterSpacing: "0.06em", border: "none", cursor: clips.length ? "pointer" : "not-allowed", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
              Next: Pick a template <ChevronRight size={18} />
            </button>
            <style>{`@keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}`}</style>
          </div>
        )}

        {/* ═══ TEMPLATE ═══ */}
        {step === "template" && (
          <div>
            <h2 style={{ fontSize: 26, fontFamily: "Bebas Neue, sans-serif", margin: "0 0 6px" }}>Pick your story structure.</h2>
            <p style={{ fontSize: 13, color: MUTED, marginBottom: 16 }}>Each direction sets the opening, pace, focus, and final ask around the source you chose.</p>
            <div style={{ display: "grid", gap: 8, marginBottom: 20 }}>
              {templates.map((t: any) => (
                <button key={t.id} onClick={() => setTemplateId(t.id)} style={{ display: "flex", alignItems: "center", gap: 12, textAlign: "left", background: templateId === t.id ? GOLD_DIM : CARD, border: `1px solid ${templateId === t.id ? GOLD : BORDER}`, borderRadius: 14, padding: "14px", cursor: "pointer" }}>
                  <span style={{ fontSize: 28 }}>{t.emoji}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <p style={{ fontSize: 15, fontWeight: 800, margin: 0 }}>{t.name}</p>
                    </div>
                    <p style={{ fontSize: 11, color: MUTED, margin: "2px 0 0", lineHeight: 1.4 }}>{t.tagline}</p>
                  </div>
                  {templateId === t.id && <Check size={18} color={GREEN} />}
                </button>
              ))}
            </div>
            <button onClick={() => setStep("fx")} disabled={!templateId} style={{ width: "100%", padding: "16px", borderRadius: 12, background: templateId ? GOLD : CARD, color: templateId ? "#000" : MUTED, fontSize: 16, fontWeight: 900, fontFamily: "Bebas Neue, sans-serif", letterSpacing: "0.06em", border: "none", cursor: templateId ? "pointer" : "not-allowed", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
              Next: Release direction <ChevronRight size={18} />
            </button>
          </div>
        )}

        {/* ═══ FX & OPTIONS ═══ */}
        {step === "fx" && (
          <div>
            <h2 style={{ fontSize: 26, fontFamily: "Bebas Neue, sans-serif", margin: "0 0 6px" }}>Lock the trailer direction.</h2>
            <p style={{ fontSize: 13, color: MUTED, marginBottom: 16 }}>Set the release details around your real source. CreatorVault does not use cosmetic effects as a substitute for a finished premium trailer.</p>
            {directionSaved && <div style={{ marginBottom: 16, border: `1px solid rgba(0,230,118,0.35)`, background: "rgba(0,230,118,0.08)", borderRadius: 12, padding: "12px 14px", color: GREEN, fontSize: 12, lineHeight: 1.45 }}>Your selected footage and direction are saved together. This is not presented as a finished trailer until there is a watchable result that clears review.</div>}

            {/* Vibe */}
            <p style={{ fontSize: 11, color: MUTED, fontFamily: "monospace", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 8 }}>{t("trailer.vibe")}</p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 16 }}>
              {VIBES.map(v => (
                <button key={v.id} onClick={() => setVibe(v.id)} style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 12px", borderRadius: 10, border: `1px solid ${vibe === v.id ? GOLD : BORDER}`, background: vibe === v.id ? GOLD_DIM : CARD, cursor: "pointer" }}>
                  <span>{v.emoji}</span><span style={{ fontSize: 13, fontWeight: 700, color: vibe === v.id ? "#fff" : MUTED }}>{v.label}</span>
                </button>
              ))}
            </div>

            {/* Aspect */}
            <p style={{ fontSize: 11, color: MUTED, fontFamily: "monospace", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 8 }}>{t("trailer.aspect")}</p>
            <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
              {(["9:16", "16:9", "1:1"] as const).map(a => <button key={a} onClick={() => setAspect(a)} style={{ flex: 1, padding: "10px", borderRadius: 8, border: `1px solid ${aspect === a ? GOLD : BORDER}`, background: aspect === a ? GOLD_DIM : "transparent", color: aspect === a ? GOLD : MUTED, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>{a}</button>)}
            </div>

            <div style={{ marginBottom: 16, border: `1px solid ${BORDER}`, borderRadius: 12, background: CARD, padding: "13px 14px" }}><p style={{ margin: 0, color: "#fff", fontSize: 13, fontWeight: 800 }}>Visual finish stays protected</p><p style={{ margin: "5px 0 0", color: MUTED, fontSize: 11, lineHeight: 1.45 }}>Your original footage stays intact. CreatorVault will not disguise an unfinished trailer with cosmetic manipulation.</p></div>

            {/* Info & CTA */}
            <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 16 }}>
              <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Name this trailer" style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 10, color: "#fff", fontSize: 14, padding: "12px 14px", outline: "none" }} />
              <input value={priceLine} onChange={e => setPriceLine(e.target.value)} placeholder="What should they do next?" style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 10, color: "#fff", fontSize: 14, padding: "12px 14px", outline: "none" }} />
              <div style={{ background: CARD, border: `1px solid ${audioAssetId ? GREEN : BORDER}`, borderRadius: 12, padding: "12px 14px" }}>
                <p style={{ margin: "0 0 7px", fontSize: 13, fontWeight: 800, display: "flex", alignItems: "center", gap: 7 }}><Music size={15} color={audioAssetId ? GREEN : GOLD} /> Soundtrack direction</p>
                {audioAssetId ? (
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                    <span style={{ fontSize: 12, color: "#e8e8e8" }}>{audioLibraryQ.data?.assets?.find((asset: any) => asset.id === audioAssetId)?.title || "Governed soundtrack selected"}</span>
                    <button onClick={() => setAudioAssetId(null)} style={{ background: "transparent", border: "none", color: MUTED, cursor: "pointer" }}>Remove</button>
                  </div>
                ) : audioLibraryQ.isLoading ? <p style={{ margin: 0, fontSize: 12, color: MUTED }}>Reading your cleared soundtracks…</p> : audioLibraryQ.data?.assets?.length ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
                    {audioLibraryQ.data.assets.filter((asset: any) => asset.status === "ready").map((asset: any) => (
                      <button key={asset.id} onClick={() => setAudioAssetId(asset.id)} style={{ textAlign: "left", background: "rgba(255,255,255,0.04)", border: `1px solid ${BORDER}`, borderRadius: 8, padding: "10px", color: "#fff", cursor: "pointer" }}>
                        <strong style={{ display: "block", fontSize: 12 }}>{asset.title}</strong><span style={{ color: MUTED, fontSize: 10 }}>{Math.round(asset.durationSeconds || 0)}s · rights cleared</span>
                      </button>
                    ))}
                  </div>
                ) : <p style={{ margin: 0, fontSize: 12, color: MUTED }}>No cleared soundtrack is in your library yet. Trailer direction will stay visual-first until one is added through your CreatorVault sound library.</p>}
              </div>
            </div>

            {/* Mode summary */}
            <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 12, padding: "12px 14px", marginBottom: 16 }}>
              <p style={{ fontSize: 11, color: MUTED, margin: "0 0 4px" }}>Your build</p>
              <p style={{ fontSize: 14, fontWeight: 700, margin: 0 }}>{selectedMode?.emoji} {selectedMode?.name} · {templates.find((t: any) => t.id === templateId)?.name || "—"} · {aspect}</p>
              {isAIMode && <p style={{ fontSize: 11, color: GOLD, margin: "4px 0 0" }}>AI mode active — adds 1–3 min for Pollo generation</p>}
            </div>
          </div>
        )}

        {/* ═══ BUILDING ═══ */}
        {step === "building" && (
          <div style={{ textAlign: "center", padding: "60px 20px" }}>
            <div style={{ width: 64, height: 64, borderRadius: "50%", background: GOLD_DIM, border: `2px solid ${GOLD_BORDER}`, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px" }}><Loader2 size={28} color={GOLD} style={{ animation: "spin 1s linear infinite" }} /></div>
            <h2 style={{ fontSize: 28, fontFamily: "Bebas Neue, sans-serif", margin: "0 0 8px" }}>
              {isAIMode ? "AI is building your trailer..." : "Rendering your trailer..."}
            </h2>
            <p style={{ fontSize: 14, color: MUTED, marginBottom: 8 }}>{stage || (isAIMode ? "Preparing the governed visual direction" : "Keeping your selected source and story structure together")}</p>
            <div style={{ maxWidth: 400, margin: "8px auto 0", height: 8, background: CARD, borderRadius: 4, overflow: "hidden" }}><div style={{ width: `${pct}%`, height: "100%", background: GOLD, transition: "width 0.4s" }} /></div>
            <p style={{ fontSize: 13, color: GOLD, fontWeight: 700, marginTop: 8 }}>{pct}%</p>
            <style>{`@keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}`}</style>
          </div>
        )}

        {/* ═══ DONE ═══ */}
        {step === "done" && outputUrl && (
          <div>
            <div style={{ textAlign: "center", marginBottom: 20 }}>
              <div style={{ width: 56, height: 56, borderRadius: "50%", background: "rgba(0,230,118,0.15)", border: `2px solid ${GREEN}`, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 12px" }}><Check size={24} color={GREEN} /></div>
              <h2 style={{ fontSize: 28, fontFamily: "Bebas Neue, sans-serif", margin: "0 0 4px" }}>{t("trailer.ready")}</h2>
              <p style={{ fontSize: 13, color: MUTED }}>Post it everywhere or attach it to a paid drop.</p>
            </div>
            <div style={{ display: "flex", justifyContent: "center", marginBottom: 16 }}>
              <video src={outputUrl} controls playsInline style={{ width: "100%", maxHeight: 440, borderRadius: 14, background: "#000", ...(aspect === "16:9" ? { maxWidth: 560 } : aspect === "1:1" ? { maxWidth: 360 } : { maxWidth: 280 }) }} />
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <a href={outputUrl} download style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "16px", borderRadius: 12, background: GOLD, color: "#000", fontWeight: 900, fontSize: 16, textDecoration: "none" }}><Download size={18} /> {t("trailer.download")}</a>
              <Link href="/vaultx/drop" style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "16px", borderRadius: 12, background: CARD, border: `1px solid ${GOLD_BORDER}`, color: GOLD, fontWeight: 800, fontSize: 15, textDecoration: "none" }}>{t("trailer.paid_drop")} <ChevronRight size={16} /></Link>
              <button onClick={reset} style={{ padding: "14px", borderRadius: 12, border: `1px solid ${BORDER}`, background: "transparent", color: MUTED, fontSize: 14, fontWeight: 700, cursor: "pointer" }}>Make another trailer</button>
            </div>
          </div>
        )}
      </div>

      <MediaPicker
        open={mediaPickerOpen}
        onClose={() => setMediaPickerOpen(false)}
        mode="multi"
        maxSelect={6}
        title="Choose Trailer Sources"
        subtitle="Pick the saved videos and images that already belong to your CreatorVault."
        confirmLabel="Use These Sources"
        onConfirm={(assets: MediaAssetItem[]) => {
          const protectedSelections = assets.filter(isLockedKingCamHero);
          if (protectedSelections.length > 0) {
            toast.error("KingCam’s protected hero stays in its own spotlight and cannot be used as a VaultX trailer source.");
          }
          const usable = assets.filter((asset) => Boolean(asset.publicUrl) && !isLockedKingCamHero(asset));
          setClips(usable.map((asset) => ({ src: asset.publicUrl!, name: asset.originalName || asset.fileName })));
          setSelectedAssetIds(usable.map((asset) => asset.id));
          setTrailerProjectId(null);
          setMediaPickerOpen(false);
        }}
      />

      {/* Build bar */}
      {step === "fx" && (
        <div style={{ position: "fixed", inset: "auto 0 0 0", zIndex: 50, background: "rgba(8,8,8,0.96)", borderTop: `1px solid ${BORDER}`, backdropFilter: "blur(12px)", padding: "12px 16px" }}>
          <div style={{ maxWidth: 800, margin: "0 auto" }}>
            <button onClick={build} disabled={!templateId} style={{ width: "100%", padding: "16px", borderRadius: 12, background: templateId ? GOLD : CARD, color: templateId ? "#000" : MUTED, fontSize: 17, fontWeight: 900, fontFamily: "Bebas Neue, sans-serif", letterSpacing: "0.08em", border: "none", cursor: templateId ? "pointer" : "not-allowed", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
              <Flame size={18} /> {directionSaved ? "Trailer direction saved" : "Save trailer direction"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
