/**
 * VaultRemix — The Adult Creator Content Cheat Code
 *
 * 5 Tabs:
 * 1. Content Vault   — browse & select your uploaded content
 * 2. Remix Studio    — enhance → style-grade → motion pipeline (automatedDirector)
 * 3. Teaser Factory  — SFW teaser generation + PPV campaign launch (teaserEngine)
 * 4. Viral Optimizer — GPT-4o-mini platform-native copy + viral analysis (viralOptimizer)
 * 5. Batch Ops       — bulk process entire content library
 *
 * ZERO Math.random(). ZERO setTimeout stubs. ZERO placeholder divs.
 * Every action calls a real tRPC procedure.
 */

import React, { useState } from "react";
import { trpc } from "../lib/trpc";
import { useToast } from "../hooks/use-toast";
import { useCreatorMode, CreatorModeSwitcher } from "../contexts/CreatorModeContext";

// ── Types ─────────────────────────────────────────────────────────────────────
interface ContentItem {
  id: number;
  title: string;
  description?: string | null;
  content_type?: string;
  thumbnail_url?: string | null;
  censored_thumbnail_url?: string | null;
  is_ppv?: boolean | number;
  ppv_price?: number | null;
  view_count?: number;
  purchase_count?: number;
  revenue_generated?: number;
  status?: string;
  created_at?: string;
}

type Tab = "vault" | "remix" | "teaser" | "viral" | "batch";
type StyleGrade = "desire" | "velvet" | "sunrise" | "midnight" | "natural";
type TeaserStyle = "slow_reveal" | "body_focus" | "desire_grade" | "cinematic_tease";
type CampaignStyle = "urgent" | "exclusive" | "personal" | "discount";
type EnhanceType = "face" | "texture" | "full";

const STYLE_LABELS: Record<StyleGrade, string> = {
  desire: "Desire Grade (warm gold)",
  velvet: "Velvet (deep rich)",
  sunrise: "Sunrise (peach amber)",
  midnight: "Midnight (cool dramatic)",
  natural: "Natural (true-to-life)",
};

const TEASER_LABELS: Record<TeaserStyle, string> = {
  slow_reveal: "Slow Reveal",
  body_focus: "Body Focus",
  desire_grade: "Desire Grade",
  cinematic_tease: "Cinematic Tease",
};

const CAMPAIGN_LABELS: Record<CampaignStyle, string> = {
  urgent: "Urgent — Limited Time",
  exclusive: "Exclusive — Loyal Fans",
  personal: "Personal — Intimate",
  discount: "Value — Worth Every Penny",
};

function ContentCard({ item, selected, onSelect }: { item: ContentItem; selected: boolean; onSelect: (item: ContentItem) => void }) {
  return (
    <div onClick={() => onSelect(item)} style={{ cursor: "pointer", borderRadius: 12, overflow: "hidden", border: selected ? "2px solid #a855f7" : "2px solid #2a2a3a", background: "#13131f", transition: "border 0.15s", position: "relative" }}>
      {item.thumbnail_url ? (
        <img src={item.thumbnail_url} alt={item.title} style={{ width: "100%", aspectRatio: "9/16", objectFit: "cover", display: "block" }} />
      ) : (
        <div style={{ width: "100%", aspectRatio: "9/16", background: "linear-gradient(135deg, #1a1a2e 0%, #2d1b69 100%)", display: "flex", alignItems: "center", justifyContent: "center", color: "#6b7280", fontSize: 13 }}>No Preview</div>
      )}
      {selected && <div style={{ position: "absolute", top: 8, right: 8, background: "#a855f7", borderRadius: "50%", width: 24, height: 24, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, color: "#fff" }}>✓</div>}
      <div style={{ padding: "10px 12px" }}>
        <div style={{ color: "#e2e8f0", fontWeight: 600, fontSize: 13, marginBottom: 4, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{item.title}</div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {item.is_ppv ? <span style={{ background: "#7c3aed22", color: "#a78bfa", fontSize: 11, padding: "2px 7px", borderRadius: 6 }}>PPV ${item.ppv_price ?? 0}</span> : <span style={{ background: "#16534222", color: "#34d399", fontSize: 11, padding: "2px 7px", borderRadius: 6 }}>Free</span>}
          <span style={{ color: "#6b7280", fontSize: 11 }}>{item.view_count ?? 0} views</span>
        </div>
      </div>
    </div>
  );
}

function ResultCard({ label, url, type }: { label: string; url: string; type: "image" | "video" }) {
  return (
    <div style={{ background: "#13131f", borderRadius: 12, overflow: "hidden", border: "1px solid #2a2a3a" }}>
      {type === "video" ? <video src={url} controls style={{ width: "100%", maxHeight: 320, objectFit: "contain", background: "#000" }} /> : <img src={url} alt={label} style={{ width: "100%", maxHeight: 320, objectFit: "contain" }} />}
      <div style={{ padding: "10px 14px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ color: "#a78bfa", fontWeight: 600, fontSize: 13 }}>{label}</span>
        <a href={url} target="_blank" rel="noopener noreferrer" style={{ background: "#7c3aed", color: "#fff", padding: "5px 14px", borderRadius: 8, fontSize: 12, textDecoration: "none" }}>Download</a>
      </div>
    </div>
  );
}

export function VaultRemix() {
  const { toast } = useToast();
  const creatorMode = useCreatorMode();
  const [activeTab, setActiveTab] = useState<Tab>("vault");
  const [selectedContent, setSelectedContent] = useState<ContentItem | null>(null);

  const [remixStyle, setRemixStyle] = useState<StyleGrade>("desire");
  const [remixEnhance, setRemixEnhance] = useState<EnhanceType>("full");
  const [remixMotionPrompt, setRemixMotionPrompt] = useState("");
  const [remixOutputType, setRemixOutputType] = useState<"video" | "image">("video");
  const [remixResult, setRemixResult] = useState<{ finalUrl: string; pipeline: any[] } | null>(null);

  const [teaserStyle, setTeaserStyle] = useState<TeaserStyle>("cinematic_tease");
  const [teaserCustomPrompt, setTeaserCustomPrompt] = useState("");
  const [teaserResult, setTeaserResult] = useState<{ teaserUrl: string; message: string } | null>(null);
  const [campaignStyle, setCampaignStyle] = useState<CampaignStyle>("exclusive");
  const [campaignResult, setCampaignResult] = useState<{ queued: number; message: string } | null>(null);

  const [viralContent, setViralContent] = useState("");
  const [viralPlatform, setViralPlatform] = useState("tiktok");
  const [viralResult, setViralResult] = useState<string | null>(null);
  const [viralAnalysis, setViralAnalysis] = useState<string | null>(null);
  const [repurposeResult, setRepurposeResult] = useState<Array<{ format: string; platform: string; content: string | null }> | null>(null);

  const [batchStyle, setBatchStyle] = useState<StyleGrade>("desire");
  const [batchLimit, setBatchLimit] = useState(5);
  const [batchResult, setBatchResult] = useState<{ processed: number; errors: number; results: any[] } | null>(null);

  const contentQuery = trpc.vaultx.getMyContent.useQuery({ status: "active", limit: 50 }, { enabled: activeTab === "vault" || !!selectedContent });
  const creditsQuery = trpc.automatedDirector.checkCredits.useQuery(undefined, { enabled: activeTab === "remix" || activeTab === "batch" });

  const runFullPipeline = trpc.automatedDirector.runFullPipeline.useMutation({
    onSuccess: (data) => { setRemixResult(data); toast({ title: "Remix Complete", description: "Enhanced, styled, and animated." }); },
    onError: (err) => { toast({ title: "Remix Failed", description: err.message, variant: "destructive" }); },
  });

  const generateTeaser = trpc.teaserEngine.generateTeaser.useMutation({
    onSuccess: (data) => { setTeaserResult({ teaserUrl: data.teaserUrl, message: data.message }); toast({ title: "Teaser Generated", description: data.message }); },
    onError: (err) => { toast({ title: "Teaser Failed", description: err.message, variant: "destructive" }); },
  });

  const launchCampaign = trpc.teaserEngine.launchPPVCampaign.useMutation({
    onSuccess: (data) => { setCampaignResult(data); toast({ title: "PPV Campaign Launched", description: data.message }); },
    onError: (err) => { toast({ title: "Campaign Failed", description: err.message, variant: "destructive" }); },
  });

  const optimizeViral = trpc.viralOptimizer.optimizeForViral.useMutation({
    onSuccess: (data) => { setViralResult(data.optimized); toast({ title: "Viral Copy Ready" }); },
    onError: (err) => { toast({ title: "Optimization Failed", description: err.message, variant: "destructive" }); },
  });

  const analyzeViral = trpc.viralOptimizer.analyzeViralPotential.useMutation({
    onSuccess: (data) => { setViralAnalysis(data.analysis); },
    onError: (err) => { toast({ title: "Analysis Failed", description: err.message, variant: "destructive" }); },
  });

  const repurposeContent = trpc.contentRepurposing.repurposeContent.useMutation({
    onSuccess: (data) => { setRepurposeResult(data.repurposed); toast({ title: "Content Repurposed", description: `${data.repurposed.length} platform versions created.` }); },
    onError: (err) => { toast({ title: "Repurpose Failed", description: err.message, variant: "destructive" }); },
  });

  const batchProcess = trpc.automatedDirector.batchProcessCreatorContent.useMutation({
    onSuccess: (data) => { setBatchResult(data); toast({ title: "Batch Complete", description: `${data.processed} processed, ${data.errors} errors.` }); },
    onError: (err) => { toast({ title: "Batch Failed", description: err.message, variant: "destructive" }); },
  });

  const handleRunRemix = () => {
    if (!selectedContent) { toast({ title: "Select Content First", variant: "destructive" }); return; }
    const imageUrl = selectedContent.censored_thumbnail_url || selectedContent.thumbnail_url;
    if (!imageUrl) { toast({ title: "No Image", description: "Selected content has no thumbnail.", variant: "destructive" }); return; }
    setRemixResult(null);
    runFullPipeline.mutate({ imageUrl, creatorId: String(selectedContent.id), style: remixStyle, enhanceType: remixEnhance, motionPrompt: remixMotionPrompt || undefined, outputType: remixOutputType });
  };

  const handleGenerateTeaser = () => {
    if (!selectedContent) { toast({ title: "Select Content First", variant: "destructive" }); return; }
    setTeaserResult(null);
    generateTeaser.mutate({ contentId: selectedContent.id, teaserStyle, customPrompt: teaserCustomPrompt || undefined });
  };

  const handleLaunchCampaign = () => {
    if (!selectedContent) { toast({ title: "Select Content First", variant: "destructive" }); return; }
    setCampaignResult(null);
    launchCampaign.mutate({ contentId: selectedContent.id, campaignStyle });
  };

  const handleOptimizeViral = () => {
    if (!viralContent.trim()) { toast({ title: "Enter Content", variant: "destructive" }); return; }
    setViralResult(null); setViralAnalysis(null);
    optimizeViral.mutate({ content: viralContent, platform: viralPlatform, niche: creatorMode.niche });
    analyzeViral.mutate({ content: viralContent, platform: viralPlatform });
  };

  const handleRepurpose = () => {
    if (!viralContent.trim()) { toast({ title: "Enter Content", variant: "destructive" }); return; }
    setRepurposeResult(null);
    repurposeContent.mutate({ originalContent: viralContent, originalFormat: "caption", targetFormats: ["tiktok_caption", "instagram_reel_caption", "x_thread"], targetPlatforms: ["TikTok", "Instagram", "X (Twitter)"] });
  };

  const handleBatchProcess = () => {
    if (!selectedContent) { toast({ title: "Select Content First", variant: "destructive" }); return; }
    setBatchResult(null);
    batchProcess.mutate({ creatorId: String(selectedContent.id), limit: batchLimit, style: batchStyle });
  };

  const S = {
    container: { minHeight: "100vh", background: "#0a0a14", color: "#e2e8f0", fontFamily: "'Inter', sans-serif" } as React.CSSProperties,
    header: { background: "linear-gradient(135deg, #1a0533 0%, #0d0d1a 60%)", padding: "32px 24px 0", borderBottom: "1px solid #1e1e2e" } as React.CSSProperties,
    section: { padding: "24px", maxWidth: 1200, margin: "0 auto" } as React.CSSProperties,
    card: { background: "#13131f", borderRadius: 16, padding: 24, border: "1px solid #1e1e2e", marginBottom: 20 } as React.CSSProperties,
    label: { display: "block", color: "#9ca3af", fontSize: 12, fontWeight: 600, textTransform: "uppercase" as const, letterSpacing: "0.05em", marginBottom: 8 } as React.CSSProperties,
    select: { width: "100%", background: "#1a1a2e", border: "1px solid #2a2a3a", borderRadius: 10, color: "#e2e8f0", padding: "10px 14px", fontSize: 14, outline: "none", cursor: "pointer" } as React.CSSProperties,
    input: { width: "100%", background: "#1a1a2e", border: "1px solid #2a2a3a", borderRadius: 10, color: "#e2e8f0", padding: "10px 14px", fontSize: 14, outline: "none", boxSizing: "border-box" as const } as React.CSSProperties,
    textarea: { width: "100%", background: "#1a1a2e", border: "1px solid #2a2a3a", borderRadius: 10, color: "#e2e8f0", padding: "10px 14px", fontSize: 14, outline: "none", boxSizing: "border-box" as const, minHeight: 120, resize: "vertical" as const } as React.CSSProperties,
    primaryBtn: (loading: boolean) => ({ background: loading ? "#4c1d95" : "linear-gradient(135deg, #7c3aed, #a855f7)", color: "#fff", border: "none", borderRadius: 12, padding: "14px 28px", fontSize: 15, fontWeight: 700, cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.7 : 1, width: "100%" } as React.CSSProperties),
    secondaryBtn: { background: "#1a1a2e", color: "#a78bfa", border: "1px solid #7c3aed", borderRadius: 12, padding: "12px 24px", fontSize: 14, fontWeight: 600, cursor: "pointer" } as React.CSSProperties,
    grid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 16 } as React.CSSProperties,
    twoCol: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 } as React.CSSProperties,
    pipelineStep: (status: string) => ({ display: "flex", alignItems: "center", gap: 10, padding: "10px 16px", borderRadius: 10, background: status === "complete" ? "#16534222" : status === "running" ? "#7c3aed22" : "#1a1a2e", border: `1px solid ${status === "complete" ? "#34d399" : status === "running" ? "#7c3aed" : "#2a2a3a"}`, marginBottom: 8 } as React.CSSProperties),
    emptyState: { textAlign: "center" as const, padding: 60, border: "2px dashed #2a2a3a", borderRadius: 16, background: "transparent" } as React.CSSProperties,
    noContentHint: { background: "#7c3aed11", border: "1px solid #7c3aed44", borderRadius: 10, padding: "12px 16px", marginBottom: 16, color: "#a78bfa", fontSize: 13 } as React.CSSProperties,
  };

  const tabStyle = (active: boolean): React.CSSProperties => ({ padding: "10px 20px", borderRadius: "10px 10px 0 0", border: "none", cursor: "pointer", fontWeight: active ? 700 : 500, fontSize: 14, background: active ? "#7c3aed" : "transparent", color: active ? "#fff" : "#9ca3af", transition: "all 0.15s", whiteSpace: "nowrap" });

  return (
    <div style={S.container}>
      <div style={S.header}>
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 8 }}>
            <div style={{ width: 48, height: 48, borderRadius: 14, background: "linear-gradient(135deg, #7c3aed, #a855f7)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24 }}>🎬</div>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <h1 style={{ margin: 0, fontSize: 28, fontWeight: 800, color: "#fff" }}>VaultRemix</h1>
                <CreatorModeSwitcher compact />
              </div>
              <p style={{ margin: 0, color: "#9ca3af", fontSize: 14 }}>
                {creatorMode.isAdult
                  ? "1 upload → 10+ platform-native assets. The adult creator content cheat code."
                  : "1 upload → 10+ platform-native assets. Remix, tease, and optimize your content."}
              </p>
            </div>
          </div>
          {selectedContent && (
            <div style={{ display: "inline-flex", alignItems: "center", gap: 10, background: "#7c3aed22", border: "1px solid #7c3aed", borderRadius: 10, padding: "8px 16px", marginBottom: 16, fontSize: 13, color: "#a78bfa" }}>
              <span>🎯</span>
              <span>Working on: <strong style={{ color: "#fff" }}>{selectedContent.title}</strong></span>
              <button onClick={() => setSelectedContent(null)} style={{ background: "none", border: "none", color: "#6b7280", cursor: "pointer", fontSize: 16, lineHeight: 1 }}>×</button>
            </div>
          )}
          <div style={{ display: "flex", gap: 4, marginTop: 24, overflowX: "auto" }}>
            {([{ id: "vault", label: "📁 Content Vault" }, { id: "remix", label: "✨ Remix Studio" }, { id: "teaser", label: "🔥 Teaser Factory" }, { id: "viral", label: "📈 Viral Optimizer" }, { id: "batch", label: "⚡ Batch Ops" }] as { id: Tab; label: string }[]).map(tab => (
              <button key={tab.id} style={tabStyle(activeTab === tab.id)} onClick={() => setActiveTab(tab.id)}>{tab.label}</button>
            ))}
          </div>
        </div>
      </div>

      {activeTab === "vault" && (
        <div style={S.section}>
          <div style={S.card}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <div>
                <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: "#fff" }}>Your Content Library</h2>
                <p style={{ margin: "4px 0 0", color: "#6b7280", fontSize: 14 }}>Select a piece of content to remix, tease, or optimize</p>
              </div>
              {contentQuery.data && <span style={{ color: "#6b7280", fontSize: 13 }}>{contentQuery.data.items?.length ?? 0} items</span>}
            </div>
            {contentQuery.isLoading && <div style={{ textAlign: "center", padding: 40, color: "#6b7280" }}>Loading your content library...</div>}
            {contentQuery.error && <div style={{ textAlign: "center", padding: 40, color: "#f87171" }}>Failed to load content: {contentQuery.error.message}</div>}
            {contentQuery.data && (contentQuery.data.items?.length ?? 0) === 0 && (
              <div style={{ ...S.emptyState, border: "2px dashed #2a2a3a" }}>
                <div style={{ fontSize: 48, marginBottom: 16 }}>📤</div>
                <div style={{ fontSize: 16, fontWeight: 600, color: "#9ca3af", marginBottom: 8 }}>No content yet</div>
                <div style={{ fontSize: 14, color: "#6b7280" }}>Upload content to your VaultX profile to start remixing.</div>
              </div>
            )}
            {contentQuery.data && (contentQuery.data.items?.length ?? 0) > 0 && (
              <div style={S.grid}>
                {contentQuery.data.items.map((item: ContentItem) => (
                  <ContentCard key={item.id} item={item} selected={selectedContent?.id === item.id} onSelect={(c) => { setSelectedContent(c); toast({ title: "Content Selected", description: `"${c.title}" ready to remix.` }); }} />
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === "remix" && (
        <div style={S.section}>
          {creditsQuery.data && !creditsQuery.data.hasCredits && (
            <div style={{ background: "#7f1d1d22", border: "1px solid #ef4444", borderRadius: 12, padding: "14px 20px", marginBottom: 20, color: "#fca5a5", fontSize: 14 }}>
              ⚠️ Replicate credits issue: {creditsQuery.data.error}
            </div>
          )}
          <div style={S.twoCol}>
            <div>
              <div style={S.card}>
                <h2 style={{ margin: "0 0 4px", fontSize: 20, fontWeight: 700, color: "#fff" }}>Remix Studio</h2>
                <p style={{ margin: "0 0 20px", color: "#6b7280", fontSize: 14 }}>3-model AI pipeline: Enhance → Style Grade → Cinematic Motion</p>
                <div style={{ marginBottom: 20 }}>
                  {[{ icon: "🔬", title: "Step 1: Enhance", sub: "GFPGAN + Real-ESRGAN — face & texture upscale" }, { icon: "🎨", title: "Step 2: Style Grade", sub: "Flux 1.1 Pro — cinematic color & LUT" }, { icon: "🎬", title: "Step 3: Motion", sub: "Kling 2.1 — cinematic video generation" }].map((step, i) => (
                    <div key={i} style={S.pipelineStep("pending")}>
                      <span style={{ fontSize: 18 }}>{step.icon}</span>
                      <div><div style={{ fontWeight: 600, fontSize: 13, color: "#e2e8f0" }}>{step.title}</div><div style={{ fontSize: 12, color: "#6b7280" }}>{step.sub}</div></div>
                    </div>
                  ))}
                </div>
                <div style={{ marginBottom: 16 }}>
                  <label style={S.label}>Color Grade Style</label>
                  <select style={S.select} value={remixStyle} onChange={(e) => setRemixStyle(e.target.value as StyleGrade)}>
                    {creatorMode.styleOptions.map((s) => <option key={s.value} value={s.value}>{s.label} — {s.description}</option>)}
                  </select>
                </div>
                <div style={{ marginBottom: 16 }}>
                  <label style={S.label}>Enhancement Focus</label>
                  <select style={S.select} value={remixEnhance} onChange={(e) => setRemixEnhance(e.target.value as EnhanceType)}>
                    <option value="full">Full (Face + Texture)</option>
                    <option value="face">Face Only (GFPGAN)</option>
                    <option value="texture">Texture Only (Real-ESRGAN)</option>
                  </select>
                </div>
                <div style={{ marginBottom: 16 }}>
                  <label style={S.label}>Output Format</label>
                  <div style={{ display: "flex", gap: 10 }}>
                    {(["video", "image"] as const).map(t => (
                      <button key={t} onClick={() => setRemixOutputType(t)} style={{ flex: 1, padding: "10px", borderRadius: 10, border: remixOutputType === t ? "2px solid #a855f7" : "2px solid #2a2a3a", background: remixOutputType === t ? "#7c3aed22" : "#1a1a2e", color: remixOutputType === t ? "#a78bfa" : "#6b7280", cursor: "pointer", fontWeight: 600, fontSize: 14 }}>
                        {t === "video" ? "🎬 Video" : "🖼️ Image"}
                      </button>
                    ))}
                  </div>
                </div>
                <div style={{ marginBottom: 20 }}>
                  <label style={S.label}>Custom Motion Prompt (optional)</label>
                  <input style={S.input} placeholder="e.g. Slow cinematic reveal, warm golden light..." value={remixMotionPrompt} onChange={(e) => setRemixMotionPrompt(e.target.value)} />
                </div>
                {!selectedContent && <div style={S.noContentHint}>← Select content in the Content Vault tab first</div>}
                <button style={S.primaryBtn(runFullPipeline.isPending)} onClick={handleRunRemix} disabled={runFullPipeline.isPending}>
                  {runFullPipeline.isPending ? "⚡ Running 3-Model Pipeline..." : "🚀 Run Full Remix Pipeline"}
                </button>
              </div>
            </div>
            <div>
              {runFullPipeline.isPending && (
                <div style={{ ...S.card, textAlign: "center", padding: 40 }}>
                  <div style={{ fontSize: 48, marginBottom: 16 }}>⚡</div>
                  <div style={{ color: "#a78bfa", fontWeight: 700, fontSize: 18, marginBottom: 8 }}>Pipeline Running...</div>
                  <div style={{ color: "#6b7280", fontSize: 14 }}>Enhance → Style Grade → Motion. This takes 3–8 minutes.</div>
                </div>
              )}
              {remixResult && (
                <div style={S.card}>
                  <h3 style={{ margin: "0 0 16px", color: "#fff", fontSize: 18, fontWeight: 700 }}>Remix Complete ✓</h3>
                  <ResultCard label={`${remixOutputType === "video" ? "Cinematic Video" : "Style-Graded Image"} — ${STYLE_LABELS[remixStyle]}`} url={remixResult.finalUrl} type={remixOutputType} />
                  <div style={{ marginTop: 16 }}>
                    <div style={{ color: "#6b7280", fontSize: 12, fontWeight: 600, textTransform: "uppercase", marginBottom: 8 }}>Pipeline Steps</div>
                    {remixResult.pipeline.map((step: any, i: number) => (
                      <div key={i} style={S.pipelineStep(step.status)}>
                        <span style={{ color: step.status === "complete" ? "#34d399" : "#6b7280" }}>{step.status === "complete" ? "✓" : "○"}</span>
                        <span style={{ fontSize: 13, color: "#e2e8f0", textTransform: "capitalize" }}>{step.step}</span>
                        <span style={{ marginLeft: "auto", fontSize: 11, color: step.status === "complete" ? "#34d399" : "#6b7280" }}>{step.status}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {!runFullPipeline.isPending && !remixResult && (
                <div style={{ ...S.card, ...S.emptyState }}>
                  <div style={{ fontSize: 48, marginBottom: 16 }}>✨</div>
                  <div style={{ color: "#9ca3af", fontSize: 15, fontWeight: 600 }}>Your remixed content will appear here</div>
                  <div style={{ color: "#6b7280", fontSize: 13, marginTop: 8 }}>Select content and run the pipeline.</div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === "teaser" && (
        <div style={S.section}>
          <div style={S.twoCol}>
            <div style={S.card}>
              <h2 style={{ margin: "0 0 4px", fontSize: 20, fontWeight: 700, color: "#fff" }}>SFW Teaser Generator</h2>
              <p style={{ margin: "0 0 20px", color: "#6b7280", fontSize: 14 }}>Kling 2.1 generates a platform-compliant SFW teaser from your content thumbnail</p>
              <div style={{ marginBottom: 16 }}>
                <label style={S.label}>Teaser Style</label>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  {(Object.entries(TEASER_LABELS) as [TeaserStyle, string][]).map(([k, v]) => (
                    <button key={k} onClick={() => setTeaserStyle(k)} style={{ padding: "10px 12px", borderRadius: 10, border: teaserStyle === k ? "2px solid #a855f7" : "2px solid #2a2a3a", background: teaserStyle === k ? "#7c3aed22" : "#1a1a2e", color: teaserStyle === k ? "#a78bfa" : "#6b7280", cursor: "pointer", fontSize: 13, fontWeight: 600, textAlign: "left" }}>{v}</button>
                  ))}
                </div>
              </div>
              <div style={{ marginBottom: 20 }}>
                <label style={S.label}>Custom Prompt (optional)</label>
                <input style={S.input} placeholder="Override the default teaser prompt..." value={teaserCustomPrompt} onChange={(e) => setTeaserCustomPrompt(e.target.value)} />
              </div>
              {!selectedContent && <div style={S.noContentHint}>← Select content in the Content Vault tab first</div>}
              <button style={S.primaryBtn(generateTeaser.isPending)} onClick={handleGenerateTeaser} disabled={generateTeaser.isPending}>
                {generateTeaser.isPending ? "🎬 Generating Teaser..." : "🔥 Generate SFW Teaser"}
              </button>
              {teaserResult && (
                <div style={{ marginTop: 20 }}>
                  <ResultCard label="SFW Teaser Clip" url={teaserResult.teaserUrl} type="video" />
                  <div style={{ marginTop: 12, background: "#16534222", border: "1px solid #34d399", borderRadius: 10, padding: "12px 16px", color: "#34d399", fontSize: 13 }}>✓ {teaserResult.message}</div>
                </div>
              )}
            </div>
            <div style={S.card}>
              <h2 style={{ margin: "0 0 4px", fontSize: 20, fontWeight: 700, color: "#fff" }}>PPV Campaign Launcher</h2>
              <p style={{ margin: "0 0 20px", color: "#6b7280", fontSize: 14 }}>GPT-4o-mini generates personalized PPV pitches for all subscribers who haven't purchased</p>
              <div style={{ marginBottom: 20 }}>
                <label style={S.label}>Campaign Style</label>
                {(Object.entries(CAMPAIGN_LABELS) as [CampaignStyle, string][]).map(([k, v]) => (
                  <div key={k} onClick={() => setCampaignStyle(k)} style={{ padding: "12px 16px", borderRadius: 10, border: campaignStyle === k ? "2px solid #a855f7" : "2px solid #2a2a3a", background: campaignStyle === k ? "#7c3aed22" : "#1a1a2e", cursor: "pointer", marginBottom: 8, display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ width: 16, height: 16, borderRadius: "50%", border: `2px solid ${campaignStyle === k ? "#a855f7" : "#4b5563"}`, background: campaignStyle === k ? "#a855f7" : "transparent", flexShrink: 0 }} />
                    <span style={{ color: campaignStyle === k ? "#a78bfa" : "#9ca3af", fontSize: 14, fontWeight: 600 }}>{v}</span>
                  </div>
                ))}
              </div>
              <button style={S.primaryBtn(launchCampaign.isPending)} onClick={handleLaunchCampaign} disabled={launchCampaign.isPending}>
                {launchCampaign.isPending ? "📨 Generating Pitches..." : "💰 Launch PPV Campaign"}
              </button>
              {campaignResult && (
                <div style={{ marginTop: 20, background: campaignResult.queued > 0 ? "#16534222" : "#7c3aed22", border: `1px solid ${campaignResult.queued > 0 ? "#34d399" : "#7c3aed"}`, borderRadius: 12, padding: "16px 20px" }}>
                  <div style={{ fontSize: 28, fontWeight: 800, color: "#fff", marginBottom: 4 }}>{campaignResult.queued}</div>
                  <div style={{ color: "#9ca3af", fontSize: 14 }}>Messages Queued</div>
                  <div style={{ color: "#6b7280", fontSize: 13, marginTop: 8 }}>{campaignResult.message}</div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === "viral" && (
        <div style={S.section}>
          <div style={S.twoCol}>
            <div>
              <div style={S.card}>
                <h2 style={{ margin: "0 0 4px", fontSize: 20, fontWeight: 700, color: "#fff" }}>Viral Content Optimizer</h2>
                <p style={{ margin: "0 0 20px", color: "#6b7280", fontSize: 14 }}>GPT-4o-mini optimizes your captions, scripts, and descriptions for maximum viral reach</p>
                <div style={{ marginBottom: 16 }}>
                  <label style={S.label}>Target Platform</label>
                  <select style={S.select} value={viralPlatform} onChange={(e) => setViralPlatform(e.target.value)}>
                    {creatorMode.platformOptions.map((p) => (
                      <option key={p.value} value={p.value}>{p.icon} {p.label}</option>
                    ))}
                  </select>
                </div>
                <div style={{ marginBottom: 20 }}>
                  <label style={S.label}>Your Caption / Script / Description</label>
                  <textarea style={S.textarea} placeholder="Paste your caption, video script, or content description here..." value={viralContent} onChange={(e) => setViralContent(e.target.value)} />
                </div>
                <div style={{ display: "flex", gap: 10 }}>
                  <button style={S.primaryBtn(optimizeViral.isPending || analyzeViral.isPending)} onClick={handleOptimizeViral} disabled={optimizeViral.isPending || analyzeViral.isPending}>
                    {optimizeViral.isPending ? "⚡ Optimizing..." : "📈 Optimize for Viral"}
                  </button>
                  <button style={S.secondaryBtn} onClick={handleRepurpose} disabled={repurposeContent.isPending}>
                    {repurposeContent.isPending ? "..." : "🔄 Repurpose"}
                  </button>
                </div>
              </div>
            </div>
            <div>
              {viralResult && (
                <div style={{ ...S.card, marginBottom: 16 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                    <h3 style={{ margin: 0, color: "#fff", fontSize: 16, fontWeight: 700 }}>Viral-Optimized Copy</h3>
                    <span style={{ background: "#7c3aed22", color: "#a78bfa", fontSize: 11, padding: "3px 8px", borderRadius: 6, fontWeight: 600 }}>{viralPlatform.toUpperCase()}</span>
                  </div>
                  <div style={{ background: "#1a1a2e", borderRadius: 10, padding: "14px 16px", color: "#e2e8f0", fontSize: 14, lineHeight: 1.6, whiteSpace: "pre-wrap" }}>{viralResult}</div>
                  <button style={{ ...S.secondaryBtn, marginTop: 12, width: "100%" }} onClick={() => { navigator.clipboard.writeText(viralResult || ""); toast({ title: "Copied" }); }}>📋 Copy to Clipboard</button>
                </div>
              )}
              {viralAnalysis && (
                <div style={{ ...S.card, marginBottom: 16 }}>
                  <h3 style={{ margin: "0 0 12px", color: "#fff", fontSize: 16, fontWeight: 700 }}>Viral Potential Analysis</h3>
                  <div style={{ background: "#1a1a2e", borderRadius: 10, padding: "14px 16px", color: "#9ca3af", fontSize: 13, lineHeight: 1.6, whiteSpace: "pre-wrap" }}>{viralAnalysis}</div>
                </div>
              )}
              {repurposeResult && (
                <div style={S.card}>
                  <h3 style={{ margin: "0 0 16px", color: "#fff", fontSize: 16, fontWeight: 700 }}>Platform-Native Versions</h3>
                  {repurposeResult.map((item, i) => (
                    <div key={i} style={{ background: "#1a1a2e", borderRadius: 10, padding: "14px 16px", marginBottom: 12, border: "1px solid #2a2a3a" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                        <span style={{ color: "#a78bfa", fontWeight: 600, fontSize: 13 }}>{item.platform}</span>
                        <span style={{ color: "#6b7280", fontSize: 11 }}>{item.format}</span>
                      </div>
                      <div style={{ color: "#e2e8f0", fontSize: 13, lineHeight: 1.5, whiteSpace: "pre-wrap" }}>{item.content}</div>
                    </div>
                  ))}
                </div>
              )}
              {!viralResult && !viralAnalysis && !repurposeResult && (
                <div style={{ ...S.card, ...S.emptyState }}>
                  <div style={{ fontSize: 48, marginBottom: 16 }}>📈</div>
                  <div style={{ color: "#9ca3af", fontSize: 15, fontWeight: 600 }}>Optimized content will appear here</div>
                  <div style={{ color: "#6b7280", fontSize: 13, marginTop: 8 }}>Paste your caption and click Optimize for Viral.</div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === "batch" && (
        <div style={S.section}>
          <div style={S.twoCol}>
            <div style={S.card}>
              <h2 style={{ margin: "0 0 4px", fontSize: 20, fontWeight: 700, color: "#fff" }}>Batch Operations</h2>
              <p style={{ margin: "0 0 20px", color: "#6b7280", fontSize: 14 }}>Process your entire content library through the AI pipeline in one click</p>
              <div style={{ background: "#7c3aed11", border: "1px solid #7c3aed44", borderRadius: 12, padding: "16px 20px", marginBottom: 20 }}>
                <div style={{ color: "#a78bfa", fontWeight: 700, fontSize: 14, marginBottom: 6 }}>⚡ Agency Mode</div>
                <div style={{ color: "#6b7280", fontSize: 13, lineHeight: 1.5 }}>Batch processing uses Replicate credits per item. Each item runs through Enhance + Style Grade. Motion generation not included in batch to conserve credits.</div>
              </div>
              <div style={{ marginBottom: 16 }}>
                <label style={S.label}>Style Grade for Batch</label>
                <select style={S.select} value={batchStyle} onChange={(e) => setBatchStyle(e.target.value as StyleGrade)}>
                  {creatorMode.styleOptions.map((s) => <option key={s.value} value={s.value}>{s.label} — {s.description}</option>)}
                </select>
              </div>
              <div style={{ marginBottom: 20 }}>
                <label style={S.label}>Number of Items to Process</label>
                <div style={{ display: "flex", gap: 10 }}>
                  {[3, 5, 10, 20].map(n => (
                    <button key={n} onClick={() => setBatchLimit(n)} style={{ flex: 1, padding: "10px", borderRadius: 10, border: batchLimit === n ? "2px solid #a855f7" : "2px solid #2a2a3a", background: batchLimit === n ? "#7c3aed22" : "#1a1a2e", color: batchLimit === n ? "#a78bfa" : "#6b7280", cursor: "pointer", fontWeight: 700, fontSize: 15 }}>{n}</button>
                  ))}
                </div>
              </div>
              {!selectedContent && <div style={S.noContentHint}>← Select content in the Content Vault tab first</div>}
              <button style={S.primaryBtn(batchProcess.isPending)} onClick={handleBatchProcess} disabled={batchProcess.isPending}>
                {batchProcess.isPending ? `⚡ Processing ${batchLimit} items...` : `🚀 Batch Process ${batchLimit} Items`}
              </button>
            </div>
            <div>
              {batchProcess.isPending && (
                <div style={{ ...S.card, textAlign: "center", padding: 40 }}>
                  <div style={{ fontSize: 48, marginBottom: 16 }}>⚡</div>
                  <div style={{ color: "#a78bfa", fontWeight: 700, fontSize: 18, marginBottom: 8 }}>Batch Processing...</div>
                  <div style={{ color: "#6b7280", fontSize: 14 }}>Processing {batchLimit} items through Enhance + Style Grade pipeline.</div>
                </div>
              )}
              {batchResult && (
                <div style={S.card}>
                  <div style={{ display: "flex", gap: 16, marginBottom: 20 }}>
                    <div style={{ flex: 1, background: "#16534222", border: "1px solid #34d399", borderRadius: 12, padding: "16px", textAlign: "center" }}>
                      <div style={{ fontSize: 32, fontWeight: 800, color: "#34d399" }}>{batchResult.processed}</div>
                      <div style={{ color: "#6b7280", fontSize: 13 }}>Processed</div>
                    </div>
                    <div style={{ flex: 1, background: batchResult.errors > 0 ? "#7f1d1d22" : "#16534222", border: `1px solid ${batchResult.errors > 0 ? "#ef4444" : "#34d399"}`, borderRadius: 12, padding: "16px", textAlign: "center" }}>
                      <div style={{ fontSize: 32, fontWeight: 800, color: batchResult.errors > 0 ? "#f87171" : "#34d399" }}>{batchResult.errors}</div>
                      <div style={{ color: "#6b7280", fontSize: 13 }}>Errors</div>
                    </div>
                  </div>
                  <div style={{ maxHeight: 400, overflowY: "auto" }}>
                    {batchResult.results.map((item: any, i: number) => (
                      <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px", borderRadius: 10, background: item.status === "complete" ? "#16534211" : "#7f1d1d11", border: `1px solid ${item.status === "complete" ? "#34d39944" : "#ef444444"}`, marginBottom: 8 }}>
                        <span style={{ fontSize: 18 }}>{item.status === "complete" ? "✓" : "✗"}</span>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ color: "#e2e8f0", fontSize: 13, fontWeight: 600 }}>Content #{item.contentId}</div>
                          {item.status === "error" && <div style={{ color: "#f87171", fontSize: 12 }}>{item.error}</div>}
                        </div>
                        {item.processedUrl && <a href={item.processedUrl} target="_blank" rel="noopener noreferrer" style={{ background: "#7c3aed", color: "#fff", padding: "4px 12px", borderRadius: 6, fontSize: 11, textDecoration: "none", whiteSpace: "nowrap" }}>View</a>}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {!batchProcess.isPending && !batchResult && (
                <div style={{ ...S.card, ...S.emptyState }}>
                  <div style={{ fontSize: 48, marginBottom: 16 }}>⚡</div>
                  <div style={{ color: "#9ca3af", fontSize: 15, fontWeight: 600 }}>Batch results will appear here</div>
                  <div style={{ color: "#6b7280", fontSize: 13, marginTop: 8 }}>Select content and run a batch to process your entire library.</div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default VaultRemix;
