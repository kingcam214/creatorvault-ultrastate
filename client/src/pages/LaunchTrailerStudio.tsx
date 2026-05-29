import { useMemo, useState } from "react";
import { trpc } from "@/lib/trpc";
import MediaPicker, { type MediaAssetItem } from "@/components/MediaPicker";

const T = {
  bg: "#070607",
  surface: "#11100f",
  card: "#151210",
  border: "rgba(255,255,255,0.11)",
  borderLight: "rgba(201,168,76,0.32)",
  text: "#f8f1e7",
  textSecondary: "#c9c0b3",
  muted: "#7e7568",
  gold: "#d8b65d",
  goldDim: "rgba(216,182,93,0.12)",
  goldGlow: "rgba(216,182,93,0.35)",
  pink: "#ff6fae",
  violet: "#8d75ff",
  success: "#5bd48f",
  danger: "#ff7c7c",
};

function isVideo(a: MediaAssetItem) {
  return (a.assetType ?? "").toLowerCase() === "video" || (a.mimeType ?? "").startsWith("video/");
}

function safeArray<T = any>(value: unknown): T[] {
  return Array.isArray(value) ? value as T[] : [];
}

function pct(value: unknown) {
  const n = Number(value);
  return Number.isFinite(n) ? Math.round(n) : 0;
}

function Pill({ children, tone = "gold" }: { children: React.ReactNode; tone?: "gold" | "green" | "pink" | "violet" }) {
  const colors = tone === "green" ? ["rgba(91,212,143,0.12)", T.success] : tone === "pink" ? ["rgba(255,111,174,0.12)", T.pink] : tone === "violet" ? ["rgba(141,117,255,0.14)", T.violet] : [T.goldDim, T.gold];
  return <span style={{ display: "inline-flex", alignItems: "center", borderRadius: 999, padding: "6px 10px", background: colors[0], color: colors[1], border: `1px solid ${colors[1]}44`, fontSize: 11, fontWeight: 800, letterSpacing: ".05em", textTransform: "uppercase" }}>{children}</span>;
}

function Panel({ title, kicker, children }: { title: string; kicker?: string; children: React.ReactNode }) {
  return <section style={{ borderRadius: 22, border: `1px solid ${T.border}`, background: "linear-gradient(145deg, rgba(255,255,255,0.045), rgba(255,255,255,0.018))", boxShadow: "0 22px 70px rgba(0,0,0,.28)", padding: 22 }}>
    {kicker && <div style={{ fontSize: 11, fontWeight: 900, letterSpacing: ".12em", textTransform: "uppercase", color: T.gold, marginBottom: 8 }}>{kicker}</div>}
    <h2 style={{ margin: 0, fontSize: 24, letterSpacing: "-.03em" }}>{title}</h2>
    <div style={{ marginTop: 16 }}>{children}</div>
  </section>;
}

function ScoreCard({ label, value, note }: { label: string; value: unknown; note: string }) {
  const v = pct(value);
  return <div style={{ borderRadius: 18, border: `1px solid ${T.border}`, background: T.card, padding: 16 }}>
    <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12 }}>
      <div style={{ fontSize: 12, color: T.muted, textTransform: "uppercase", letterSpacing: ".09em", fontWeight: 800 }}>{label}</div>
      <div style={{ fontSize: 34, fontWeight: 950, color: v >= 80 ? T.success : v >= 65 ? T.gold : T.pink }}>{v}</div>
    </div>
    <div style={{ height: 8, borderRadius: 999, background: "rgba(255,255,255,.07)", overflow: "hidden", margin: "10px 0" }}><div style={{ width: `${Math.min(100, Math.max(0, v))}%`, height: "100%", background: `linear-gradient(90deg, ${T.pink}, ${T.gold}, ${T.success})` }} /></div>
    <p style={{ margin: 0, color: T.textSecondary, fontSize: 13, lineHeight: 1.45 }}>{note}</p>
  </div>;
}

export function LaunchTrailerStudio() {
  const [projectName, setProjectName] = useState("Flagship Trailer");
  const [scriptText, setScriptText] = useState("Stop scrolling — this is the creator OS your content business was missing.\nEvery clip becomes a cinematic launch asset, not another random upload.\nHooks, captions, voice, pacing, platform variants, and release assets are built as one system.\nLaunch the trailer, ship the campaign, and keep the factory moving.");
  const [title, setTitle] = useState("Creator operating system launch film");
  const [concept, setConcept] = useState("Cinematic, premium, video-first, safe-but-seductive product walkthrough that turns creator assets into a high-converting launch trailer factory.");
  const [format, setFormat] = useState<"16:9" | "9:16" | "1:1">("16:9");
  const [selectedMedia, setSelectedMedia] = useState<MediaAssetItem[]>([]);
  const [pickerOpen, setPickerOpen] = useState(false);

  // @ts-ignore
  const createTrailer = trpc.mediaAssets.createTrailerProject.useMutation();
  // @ts-ignore
  const projectsQuery = trpc.mediaAssets.listTrailerProjects.useQuery(undefined, { staleTime: 10_000 });

  const selectedIds = useMemo(() => selectedMedia.map((item) => item.id), [selectedMedia]);
  const canCreate = projectName.trim().length > 0 && selectedMedia.length > 0;
  const pkg = (createTrailer.data as any)?.productionPackage;
  const scenes = safeArray<any>(pkg?.blueprint?.scenes);
  const pacingScenes = safeArray<any>(pkg?.pacingPlan?.scenes);
  const variants = safeArray<any>(pkg?.adaptiveTrailerPlan?.platformMutations);
  const scores = pkg?.retentionReport?.scores ?? {};
  const voiceSegments = safeArray<any>(pkg?.voiceoverSync?.segments);

  const handleCreate = async () => {
    if (!canCreate) return;
    await createTrailer.mutateAsync({
      projectName: projectName.trim(),
      projectType: "launch_trailer",
      format,
      title: title || undefined,
      concept: concept || undefined,
      scriptText: scriptText || undefined,
      selectedAssetIds: selectedIds,
      hooks: scriptText.split("\n").map((l) => l.trim()).filter(Boolean).slice(0, 6),
    });
    projectsQuery.refetch();
  };

  const formats: ["16:9" | "9:16" | "1:1", string, string][] = [
    ["16:9", "Hero Film", "site trailers, YouTube, product walkthroughs"],
    ["9:16", "Shorts Factory", "TikTok, Reels, Shorts, Stories"],
    ["1:1", "Social Card", "feed posts, paid social, chat previews"],
  ];

  return <div style={{ minHeight: "100vh", background: `radial-gradient(circle at 15% 0%, rgba(255,111,174,.12), transparent 30%), radial-gradient(circle at 85% 5%, rgba(216,182,93,.16), transparent 32%), ${T.bg}`, color: T.text }}>
    <style>{`@keyframes ltsFade{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)}} .lts-input,.lts-area{background:rgba(255,255,255,.045);border:1px solid ${T.border};color:${T.text};outline:none;width:100%;box-sizing:border-box;border-radius:14px}.lts-input:focus,.lts-area:focus{border-color:${T.gold};box-shadow:0 0 0 3px ${T.goldDim}} .lts-input::placeholder,.lts-area::placeholder{color:${T.muted}}`}</style>

    <header style={{ maxWidth: 1320, margin: "0 auto", padding: "46px 28px 22px", animation: "ltsFade .35s ease both" }}>
      <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1.1fr) minmax(360px,.9fr)", gap: 28, alignItems: "stretch" }}>
        <div style={{ borderRadius: 30, border: `1px solid ${T.borderLight}`, background: "linear-gradient(145deg, rgba(20,16,14,.94), rgba(9,8,8,.92))", padding: 30, position: "relative", overflow: "hidden" }}>
          <div style={{ position: "absolute", inset: "auto -12% -24% 38%", height: 250, background: `radial-gradient(circle, ${T.goldGlow}, transparent 70%)`, filter: "blur(20px)" }} />
          <Pill tone="pink">AI trailer factory command center</Pill>
          <h1 style={{ margin: "18px 0 12px", fontSize: 54, lineHeight: .92, letterSpacing: "-.06em", maxWidth: 820 }}>Build the launch trailer like a studio, not a form.</h1>
          <p style={{ margin: 0, color: T.textSecondary, fontSize: 18, lineHeight: 1.55, maxWidth: 780 }}>Select grounded media once. VaultX now assembles a full production package: cinematic blueprint, scene pacing, captions, KingCam voiceover sync, sound design, retention scoring, platform cuts, render gates, and distribution readiness. This is the control room for a real creator video factory.</p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginTop: 22 }}>
            <Pill>Scene manifest</Pill><Pill tone="violet">Retention engine</Pill><Pill tone="green">Platform variants</Pill><Pill tone="pink">Clone-aware mode</Pill>
          </div>
        </div>

        <div style={{ borderRadius: 30, border: `1px solid ${T.border}`, background: "rgba(10,9,9,.72)", padding: 24 }}>
          <div style={{ display: "grid", gap: 12 }}>
            <input className="lts-input" value={projectName} onChange={(e) => setProjectName(e.target.value)} style={{ padding: "15px 16px", fontSize: 22, fontWeight: 900 }} />
            <input className="lts-input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Trailer title" style={{ padding: "13px 16px", fontSize: 14 }} />
            <textarea className="lts-area" value={concept} onChange={(e) => setConcept(e.target.value)} rows={4} style={{ padding: "14px 16px", resize: "vertical", lineHeight: 1.5 }} />
            <textarea className="lts-area" value={scriptText} onChange={(e) => setScriptText(e.target.value)} rows={5} style={{ padding: "14px 16px", resize: "vertical", lineHeight: 1.45, fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace" }} />
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8 }}>
              {formats.map(([val, label, sub]) => <button key={val} onClick={() => setFormat(val)} style={{ border: `1px solid ${format === val ? T.gold : T.border}`, background: format === val ? T.goldDim : "rgba(255,255,255,.035)", color: format === val ? T.gold : T.textSecondary, borderRadius: 14, padding: "12px 10px", cursor: "pointer", textAlign: "left" }}><strong style={{ display: "block", color: "inherit" }}>{val} {label}</strong><span style={{ fontSize: 10, color: T.muted }}>{sub}</span></button>)}
            </div>
            <button onClick={handleCreate} disabled={!canCreate || createTrailer.isPending} style={{ border: "none", borderRadius: 16, padding: "16px 22px", background: canCreate ? `linear-gradient(135deg, ${T.gold}, #a879ff, ${T.pink})` : "#29231f", color: canCreate ? "#070607" : T.muted, fontWeight: 950, fontSize: 15, cursor: canCreate ? "pointer" : "not-allowed", boxShadow: canCreate ? `0 18px 45px ${T.goldGlow}` : "none" }}>{createTrailer.isPending ? "Building production package…" : "Generate Trailer Production Package"}</button>
          </div>
        </div>
      </div>
    </header>

    <main style={{ maxWidth: 1320, margin: "0 auto", padding: "10px 28px 56px", display: "grid", gap: 24 }}>
      <Panel title="Grounded media timeline" kicker={`${selectedMedia.length} selected asset${selectedMedia.length === 1 ? "" : "s"}`}>
        {selectedMedia.length === 0 ? <button onClick={() => setPickerOpen(true)} style={{ width: "100%", border: `2px dashed ${T.borderLight}`, background: "rgba(255,255,255,.03)", color: T.text, borderRadius: 22, padding: "46px 24px", cursor: "pointer" }}><div style={{ fontSize: 30, fontWeight: 950 }}>Open the media vault</div><p style={{ margin: "8px auto 0", maxWidth: 520, color: T.textSecondary }}>Choose the clips and images that will become the actual scene manifest. The trailer package will stay grounded to owned assets.</p></button> : <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(170px,1fr))", gap: 12 }}>
          {selectedMedia.map((asset, idx) => <div key={asset.id} style={{ borderRadius: 18, overflow: "hidden", border: `1px solid ${T.border}`, background: T.card }}><div style={{ position: "relative", aspectRatio: "16/10", background: "#111" }}>{(asset.thumbnailUrl ?? asset.publicUrl) ? <img src={asset.thumbnailUrl ?? asset.publicUrl ?? ""} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <div style={{ height: "100%", display: "grid", placeItems: "center", color: T.muted }}>{isVideo(asset) ? "VIDEO" : "IMAGE"}</div>}<span style={{ position: "absolute", top: 8, left: 8 }}><Pill tone={isVideo(asset) ? "green" : "gold"}>Scene {idx + 1}</Pill></span></div><div style={{ padding: 12, fontSize: 12, color: T.textSecondary, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{asset.originalName ?? asset.fileName}</div></div>)}
        </div>}
        <button onClick={() => setPickerOpen(true)} style={{ marginTop: 14, border: `1px solid ${T.gold}`, background: T.goldDim, color: T.gold, borderRadius: 12, padding: "10px 16px", cursor: "pointer", fontWeight: 900 }}>Add or change media</button>
      </Panel>

      {pkg && <>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,minmax(0,1fr))", gap: 14, animation: "ltsFade .4s ease both" }}>
          <ScoreCard label="Scroll-stop" value={scores.scrollStopStrength} note="Opening hook and first-frame pressure." />
          <ScoreCard label="Retention" value={scores.retentionPotential} note="Pacing, dead-zone, and cut rhythm score." />
          <ScoreCard label="Emotion" value={scores.emotionalImpact} note="Intensity curve and replay moment weight." />
          <ScoreCard label="Conversion" value={scores.conversionPressure} note="CTA clarity and offer pressure." />
        </div>

        <Panel title="Cinematic scene blueprint" kicker="Storyboard + pacing">
          <div style={{ display: "grid", gap: 12 }}>
            {scenes.map((scene, i) => {
              const paced = pacingScenes[i] ?? {};
              return <div key={`${scene.sourceAssetId}-${i}`} style={{ display: "grid", gridTemplateColumns: "88px 1fr 150px", gap: 14, alignItems: "center", borderRadius: 18, border: `1px solid ${T.border}`, background: "rgba(255,255,255,.035)", padding: 14 }}>
                <div><Pill tone={i === 0 ? "pink" : scene.role === "cta" ? "green" : "gold"}>{scene.role}</Pill><div style={{ color: T.muted, fontSize: 12, marginTop: 8 }}>{paced.startSeconds ?? 0}s–{paced.endSeconds ?? scene.durationSeconds}s</div></div>
                <div><strong style={{ display: "block", fontSize: 16 }}>{scene.overlayText}</strong><span style={{ display: "block", color: T.textSecondary, fontSize: 13, marginTop: 5 }}>{scene.visualDescription || paced.editorialDirective}</span></div>
                <div style={{ textAlign: "right", color: T.gold, fontWeight: 900 }}>Intensity {pct(paced.intensity)}</div>
              </div>;
            })}
          </div>
        </Panel>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
          <Panel title="Voice, captions, and sound map" kicker="Audio-first timing">
            <div style={{ display: "grid", gap: 10 }}>
              {voiceSegments.slice(0, 5).map((seg, i) => <div key={i} style={{ borderRadius: 14, border: `1px solid ${T.border}`, padding: 12, background: T.card }}><div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}><strong>{seg.role} voice line</strong><Pill tone={seg.syncStatus === "fits_scene" ? "green" : "pink"}>{seg.syncStatus}</Pill></div><p style={{ margin: "8px 0 0", color: T.textSecondary, fontSize: 13 }}>{seg.text || "Muted beat / visual-only moment"}</p></div>)}
            </div>
          </Panel>

          <Panel title="Render command and distribution truth" kicker="Real package, real launch checklist">
            <p style={{ margin: 0, color: T.textSecondary, lineHeight: 1.55 }}>The trailer package is a production command file: storyboard, pacing, captions, voice beats, platform cuts, and monetization routes are generated from selected creator media. Distribution stays gated only on real asset validation, so the system sells usable visuals instead of empty claims.</p>
            <div style={{ display: "grid", gap: 9, marginTop: 16 }}>
              {safeArray<string>(pkg.renderReadiness?.requiredBeforeRender).map((gate) => <div key={gate} style={{ display: "flex", gap: 10, color: T.textSecondary }}><span style={{ color: T.gold }}>◆</span><span>{gate.replace(/_/g, " ")}</span></div>)}
            </div>
          </Panel>
        </div>

        <Panel title="Platform mutation factory" kicker={`${variants.length} export plans`}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(230px,1fr))", gap: 12 }}>
            {variants.map((variant) => <div key={variant.platform} style={{ borderRadius: 18, border: `1px solid ${T.border}`, background: T.card, padding: 15 }}><div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}><strong style={{ textTransform: "capitalize" }}>{String(variant.platform).replace(/_/g, " ")}</strong><Pill tone="violet">{variant.targetDurationSeconds}s</Pill></div><p style={{ color: T.textSecondary, fontSize: 13, lineHeight: 1.45 }}>{variant.hookStrategy}</p><div style={{ color: T.muted, fontSize: 12 }}>{variant.cropLogic}</div></div>)}
          </div>
        </Panel>
      </>}

      <Panel title="Recent trailer projects" kicker="Library">
        {safeArray<any>(projectsQuery.data).length === 0 ? <div style={{ borderRadius: 20, border: `1px solid ${T.gold}55`, background: "linear-gradient(135deg,rgba(201,168,76,.14),rgba(255,255,255,.035))", padding: 18 }}><strong style={{ display: "block", color: T.text }}>God Mode trailer queue is ready.</strong><p style={{ color: T.textSecondary, margin: "8px 0 0", lineHeight: 1.5 }}>Select owned media above and generate a launch package that fills every scene: hero hook, body of the offer, teaser copy, platform variants, Telegram drop logic, and VIP conversion route.</p></div> : <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(250px,1fr))", gap: 12 }}>{safeArray<any>(projectsQuery.data).map((project) => <div key={project.id} style={{ borderRadius: 16, border: `1px solid ${T.border}`, background: T.card, padding: 15 }}><div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}><strong>{project.projectName}</strong><Pill>{project.status}</Pill></div><div style={{ marginTop: 8, color: T.muted, fontSize: 12 }}>{project.projectType?.replace(/_/g, " ")} · {project.createdAt ? new Date(project.createdAt).toLocaleDateString() : ""}</div></div>)}</div>}
      </Panel>
    </main>

    <MediaPicker open={pickerOpen} mode="multi" title="Trailer Scene Media" subtitle="Select grounded clips and images for the AI trailer factory" initialSelectedIds={selectedIds} onClose={() => setPickerOpen(false)} onConfirm={(selected) => { setSelectedMedia(selected); setPickerOpen(false); }} />
  </div>;
}

export default LaunchTrailerStudio;
