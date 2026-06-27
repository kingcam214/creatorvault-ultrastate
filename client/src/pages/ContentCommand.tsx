/**
 * ============================================================================
 * KINGCAM CONTENT COMMAND CENTER — WEAPONIZED v2
 * /king/content — One page. One purpose. Generate anything. Distribute everywhere.
 *
 * Upgrades over v1:
 *   - 4 parallel images for Clone Drop (pick the best)
 *   - ElevenLabs voice narration on every video type
 *   - Full platform copy suite (TikTok + Instagram + Twitter + Telegram simultaneously)
 *   - 3 hook variants for A/B testing
 *   - Batch mode — generate 3 variations and compare
 *   - Auto-distribution panel — push to all channels in one click
 *   - DM sequence output for Creator Campaign
 *   - Posting schedule recommendation
 *   - Remix button on any output
 *   - History with full output recall
 * ============================================================================
 */
import { useState, useEffect, useCallback, useRef } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

// ─── Design tokens ────────────────────────────────────────────────────────────
const C = {
  bg: "#0A0A0A",
  surface: "#111111",
  card: "#1A1A1A",
  card2: "#141414",
  border: "rgba(255,255,255,0.08)",
  borderActive: "rgba(0,217,255,0.5)",
  text: "#FFFFFF",
  muted: "rgba(255,255,255,0.45)",
  faint: "rgba(255,255,255,0.25)",
  cyan: "#00D9FF",
  cyanDim: "rgba(0,217,255,0.1)",
  cyanGlow: "0 0 20px rgba(0,217,255,0.25)",
  gold: "#C9A84C",
  goldDim: "rgba(201,168,76,0.12)",
  green: "#00E676",
  greenDim: "rgba(0,230,118,0.12)",
  red: "#FF4444",
  purple: "#9C27B0",
  purpleDim: "rgba(156,39,176,0.12)",
};

// ─── Content types ────────────────────────────────────────────────────────────
const CONTENT_TYPES = [
  { id: "clone_drop",       icon: "👑", label: "Clone Drop",       desc: "4 parallel images → animated → full platform copy suite + voice", badge: "FLAGSHIP" },
  { id: "platform_trailer", icon: "🎬", label: "Platform Trailer", desc: "Cinematic video + KingCam voiceover + full copy suite",           badge: "VOICE" },
  { id: "social_post",      icon: "📱", label: "Social Post",      desc: "All 4 platforms simultaneously + 3 hook variants + schedule",     badge: "MULTI-PLATFORM" },
  { id: "creator_campaign", icon: "💰", label: "Creator Campaign", desc: "Full drop pack + DM sequence + auto-post to Telegram",            badge: "AUTO-DISTRIBUTE" },
  { id: "telegram_blast",   icon: "⚡", label: "Telegram Blast",   desc: "A/B message variants + media + live send to channels",           badge: "A/B TEST" },
  { id: "custom",           icon: "⚙️", label: "Custom",           desc: "GPT-4o routes to correct pipeline, multi-step execution",        badge: "AI ROUTED" },
] as const;
type ContentTypeId = typeof CONTENT_TYPES[number]["id"];

const BADGE_COLORS: Record<string, string> = {
  FLAGSHIP: C.gold,
  VOICE: C.cyan,
  "MULTI-PLATFORM": C.purple,
  "AUTO-DISTRIBUTE": C.green,
  "A/B TEST": "#FF6B35",
  "AI ROUTED": C.cyan,
};

// ─── Stage messages ───────────────────────────────────────────────────────────
const STAGES: Record<ContentTypeId, string[]> = {
  clone_drop:        ["Firing 4 parallel image generations...", "Writing full platform copy suite...", "Animating best image with Pollo...", "Generating KingCam voice narration...", "Assembling the drop..."],
  platform_trailer:  ["Generating cinematic video...", "Writing copy suite for all platforms...", "Generating KingCam voiceover...", "Assembling trailer package..."],
  social_post:       ["Generating platform video...", "Writing TikTok, Instagram, Twitter, Telegram copy...", "Building 3 hook variants...", "Calculating posting schedule..."],
  creator_campaign:  ["Generating teaser video...", "Writing full campaign copy pack...", "Building DM sequence...", "Preparing distribution..."],
  telegram_blast:    ["Writing A/B message variants...", "Generating media...", "Sending to channels..."],
  custom:            ["Analyzing request with GPT-4o...", "Routing to optimal pipeline...", "Generating content...", "Assembling output..."],
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
function Label({ children }: { children: React.ReactNode }) {
  return <div style={{ fontSize: 10, color: C.muted, fontFamily: "Space Mono, monospace", letterSpacing: "0.12em", marginBottom: 6, textTransform: "uppercase" }}>{children}</div>;
}

function Pills({ options, value, onChange, multi = false }: { options: string[]; value: string | string[]; onChange: (v: any) => void; multi?: boolean }) {
  const sel = Array.isArray(value) ? value : [value];
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 12 }}>
      {options.map(opt => {
        const active = sel.includes(opt);
        return (
          <button key={opt} onClick={() => {
            if (multi) { onChange(active ? sel.filter(s => s !== opt) : [...sel, opt]); }
            else { onChange(opt); }
          }} style={{ padding: "5px 13px", borderRadius: 20, border: `1px solid ${active ? C.cyan : C.border}`, background: active ? C.cyanDim : "transparent", color: active ? C.cyan : C.muted, fontSize: 12, fontFamily: "DM Sans, sans-serif", cursor: "pointer", transition: "all 0.12s" }}>
            {opt}
          </button>
        );
      })}
    </div>
  );
}

function TA({ placeholder, value, onChange, rows = 3 }: { placeholder: string; value: string; onChange: (v: string) => void; rows?: number }) {
  return (
    <textarea value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} rows={rows}
      style={{ width: "100%", background: "#0f0f0f", border: `1px solid ${C.border}`, borderRadius: 6, color: C.text, fontFamily: "DM Sans, sans-serif", fontSize: 14, padding: "10px 12px", resize: "vertical", marginBottom: 12, boxSizing: "border-box" }} />
  );
}

function TI({ placeholder, value, onChange, type = "text" }: { placeholder: string; value: string; onChange: (v: string) => void; type?: string }) {
  return (
    <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
      style={{ width: "100%", background: "#0f0f0f", border: `1px solid ${C.border}`, borderRadius: 6, color: C.text, fontFamily: "DM Sans, sans-serif", fontSize: 14, padding: "10px 12px", marginBottom: 12, boxSizing: "border-box" }} />
  );
}

function Toggle({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
      <div onClick={() => onChange(!value)} style={{ width: 40, height: 22, borderRadius: 11, background: value ? C.cyan : C.border, cursor: "pointer", position: "relative", transition: "background 0.2s", flexShrink: 0 }}>
        <div style={{ position: "absolute", top: 3, left: value ? 21 : 3, width: 16, height: 16, borderRadius: "50%", background: "#fff", transition: "left 0.2s" }} />
      </div>
      <span style={{ fontSize: 13, color: C.muted, fontFamily: "DM Sans, sans-serif" }}>{label}</span>
    </div>
  );
}

function CopyBtn({ text, label = "COPY" }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
      style={{ padding: "4px 10px", fontSize: 9, borderRadius: 4, border: `1px solid ${C.border}`, background: "transparent", color: copied ? C.green : C.muted, cursor: "pointer", fontFamily: "Space Mono, monospace", letterSpacing: "0.08em" }}>
      {copied ? "✓ COPIED" : label}
    </button>
  );
}

function CaptionCard({ label, text, accent = C.cyan }: { label: string; text: string; accent?: string }) {
  return (
    <div style={{ background: C.card2, border: `1px solid ${C.border}`, borderRadius: 8, padding: 14, borderLeft: `3px solid ${accent}` }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <span style={{ fontSize: 9, color: accent, fontFamily: "Space Mono, monospace", letterSpacing: "0.15em" }}>{label}</span>
        <CopyBtn text={text} />
      </div>
      <div style={{ fontSize: 13, color: C.text, fontFamily: "DM Sans, sans-serif", lineHeight: 1.6 }}>{text}</div>
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <div style={{ fontSize: 10, color: C.cyan, fontFamily: "Space Mono, monospace", letterSpacing: "0.15em", marginBottom: 10, marginTop: 20, textTransform: "uppercase", borderBottom: `1px solid ${C.border}`, paddingBottom: 6 }}>{children}</div>;
}

function ActionBtn({ label, onClick, disabled, color = C.card, textColor = C.text }: { label: string; onClick: () => void; disabled?: boolean; color?: string; textColor?: string }) {
  return (
    <button onClick={onClick} disabled={disabled}
      style={{ padding: "9px 16px", borderRadius: 6, border: `1px solid ${C.border}`, background: color, color: textColor, fontFamily: "DM Sans, sans-serif", fontSize: 12, fontWeight: 600, cursor: disabled ? "not-allowed" : "pointer", opacity: disabled ? 0.5 : 1, transition: "opacity 0.15s" }}>
      {label}
    </button>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function ContentCommand() {
  const { user, isLoading: authLoading } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const isOwner = user?.id === 6 || user?.id === 33;
  useEffect(() => { if (!authLoading && !isOwner) setLocation("/dashboard"); }, [authLoading, isOwner]);

  // ─── Phase state ──────────────────────────────────────────────────────────
  const [phase, setPhase] = useState<"select" | "brief" | "generating" | "output">("select");
  const [selectedType, setSelectedType] = useState<ContentTypeId | null>(null);
  const [stageIdx, setStageIdx] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [result, setResult] = useState<any>(null);
  const [batchResult, setBatchResult] = useState<any>(null);
  const [selectedImageIdx, setSelectedImageIdx] = useState(0);
  const [activeTab, setActiveTab] = useState<"output" | "copy" | "distribute" | "history">("output");
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const stageRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ─── Brief state ──────────────────────────────────────────────────────────
  const [cloneBrief, setCloneBrief] = useState({ scenePrompt: "", motionPrompt: "", platform: "OnlyFans", imageCount: "2", withVoice: true });
  const [trailerBrief, setTrailerBrief] = useState({ subject: "VaultX", tone: "Cinematic", keyMessage: "", duration: "5", withVoice: true });
  const [socialBrief, setSocialBrief] = useState({ platform: "Twitter", hookStyle: "Statement", topic: "", ctaKeyword: "VAULT" });
  const [campaignBrief, setCampaignBrief] = useState({ creatorName: "", contentType: "Video", assetUrl: "", ppvPrice: "29", platforms: ["VaultX", "Telegram"], autoPost: false });
  const [telegramBrief, setTelegramBrief] = useState({ messageTopic: "", includeMedia: false, channel: "KingCam", sendNow: false, abTest: true });
  const [customBrief, setCustomBrief] = useState({ description: "" });

  // ─── tRPC ─────────────────────────────────────────────────────────────────
  // @ts-ignore
  const generateMut = (trpc as any).contentCommand.generateContent.useMutation();
  // @ts-ignore
  const batchMut = (trpc as any).contentCommand.generateBatch.useMutation();
  // @ts-ignore
  const postTelegramMut = (trpc as any).contentCommand.postToTelegram.useMutation();
  // @ts-ignore
  const distributeAllMut = (trpc as any).contentCommand.distributeAll.useMutation();
  // @ts-ignore
  const saveVaultMut = (trpc as any).contentCommand.saveToVault.useMutation();
  // @ts-ignore
  const remixMut = (trpc as any).contentCommand.remixContent.useMutation();
  // @ts-ignore
  const historyQuery = (trpc as any).contentCommand.getHistory.useQuery({}, { enabled: !!isOwner });

  // ─── Generation ───────────────────────────────────────────────────────────
  const handleGenerate = useCallback(async () => {
    if (!selectedType) return;
    const briefs: Record<ContentTypeId, any> = {
      clone_drop: cloneBrief,
      platform_trailer: trailerBrief,
      social_post: socialBrief,
      creator_campaign: campaignBrief,
      telegram_blast: telegramBrief,
      custom: customBrief,
    };

    setPhase("generating");
    setStageIdx(0);
    setElapsed(0);
    setBatchResult(null);

    timerRef.current = setInterval(() => setElapsed(e => e + 1), 1000);
    const stages = STAGES[selectedType];
    let si = 0;
    stageRef.current = setInterval(() => {
      si = Math.min(si + 1, stages.length - 2);
      setStageIdx(si);
    }, Math.floor(15000 / stages.length));

    try {
      const res = await generateMut.mutateAsync({ contentType: selectedType, brief: briefs[selectedType] });
      setResult(res);
      setStageIdx(stages.length - 1);
      setSelectedImageIdx(0);
      setActiveTab("output");
      setPhase("output");
      void historyQuery.refetch();
      toast({ title: "Content ready ✓" });
    } catch (err: any) {
      toast({ title: "Generation failed", description: err.message, variant: "destructive" });
      setPhase("brief");
    } finally {
      if (timerRef.current) clearInterval(timerRef.current);
      if (stageRef.current) clearInterval(stageRef.current);
    }
  }, [selectedType, cloneBrief, trailerBrief, socialBrief, campaignBrief, telegramBrief, customBrief]);

  const handleBatch = useCallback(async () => {
    if (!selectedType || !["clone_drop", "social_post", "telegram_blast"].includes(selectedType)) return;
    const briefs: Record<string, any> = { clone_drop: cloneBrief, social_post: socialBrief, telegram_blast: telegramBrief };
    try {
      const res = await batchMut.mutateAsync({ contentType: selectedType as any, brief: briefs[selectedType], count: 3 });
      setBatchResult(res);
      toast({ title: "Batch generated — pick the best" });
    } catch (err: any) {
      toast({ title: "Batch failed", description: err.message, variant: "destructive" });
    }
  }, [selectedType, cloneBrief, socialBrief, telegramBrief]);

  const handlePostTelegram = useCallback(async (videoUrl?: string, imageUrl?: string, caption?: string, channel: "KingCam" | "Owner" | "Both" = "KingCam") => {
    try {
      await postTelegramMut.mutateAsync({ videoUrl, imageUrl, caption: caption || "", channel });
      toast({ title: `Posted to ${channel} ✓` });
    } catch (err: any) {
      toast({ title: "Telegram failed", description: err.message, variant: "destructive" });
    }
  }, []);

  const handleDistributeAll = useCallback(async () => {
    if (!result) return;
    const videoUrl = result.videoUrl;
    const caption = result.copySuite?.telegram?.message || result.copySuite?.twitter?.caption || result.caption || result.messageA || "";
    try {
      const res = await distributeAllMut.mutateAsync({ videoUrl, caption, channels: ["KingCam", "Owner"] });
      toast({ title: `Distributed to ${res.totalSent} channels ✓` });
    } catch (err: any) {
      toast({ title: "Distribution failed", description: err.message, variant: "destructive" });
    }
  }, [result]);

  const handleSaveVault = useCallback(async (url: string, assetType: "video" | "image" | "voice") => {
    try {
      await saveVaultMut.mutateAsync({ url, assetType, contentType: selectedType || undefined });
      toast({ title: "Saved to Vault ✓" });
    } catch (err: any) {
      toast({ title: "Save failed", description: err.message, variant: "destructive" });
    }
  }, [selectedType]);

  const handleRemix = useCallback(async (historyId: number) => {
    try {
      const res = await remixMut.mutateAsync({ historyId, variation: "Make it more aggressive and money-focused" });
      setResult(res);
      setPhase("output");
      setActiveTab("copy");
      toast({ title: "Remixed ✓" });
    } catch (err: any) {
      toast({ title: "Remix failed", description: err.message, variant: "destructive" });
    }
  }, []);

  const reset = () => { setPhase("select"); setSelectedType(null); setResult(null); setBatchResult(null); };

  if (authLoading || !isOwner) return <div style={{ minHeight: "100vh", background: C.bg }} />;

  const stages = selectedType ? STAGES[selectedType] : [];

  return (
    <div style={{ minHeight: "100vh", background: C.bg, color: C.text, fontFamily: "DM Sans, sans-serif" }}>

      {/* ─── Header ─────────────────────────────────────────────────────── */}
      <header style={{ padding: "24px 28px 18px", borderBottom: `1px solid ${C.border}`, display: "flex", alignItems: "flex-end", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
        <div>
          <div style={{ fontSize: 10, color: C.cyan, fontFamily: "Space Mono, monospace", letterSpacing: "0.2em", marginBottom: 4 }}>KINGCAM CONTENT FACTORY</div>
          <h1 style={{ margin: 0, fontSize: 40, fontFamily: "Bebas Neue, sans-serif", letterSpacing: "0.04em", lineHeight: 1 }}>CONTENT COMMAND</h1>
          <p style={{ margin: "6px 0 0", fontSize: 14, color: C.muted }}>Describe what you want. The factory handles the rest.</p>
        </div>
        {phase !== "select" && (
          <button onClick={reset} style={{ padding: "8px 16px", borderRadius: 6, border: `1px solid ${C.border}`, background: "transparent", color: C.muted, cursor: "pointer", fontSize: 12, fontFamily: "DM Sans, sans-serif" }}>← New Content</button>
        )}
      </header>

      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "24px 20px" }}>

        {/* ═══ SELECT ═══════════════════════════════════════════════════════ */}
        {phase === "select" && (
          <>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginBottom: 28 }}>
              {CONTENT_TYPES.map(ct => (
                <button key={ct.id} onClick={() => { setSelectedType(ct.id); setPhase("brief"); }}
                  style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: 18, textAlign: "left", cursor: "pointer", position: "relative", transition: "all 0.15s" }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = C.borderActive; (e.currentTarget as HTMLElement).style.boxShadow = C.cyanGlow; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = C.border; (e.currentTarget as HTMLElement).style.boxShadow = "none"; }}>
                  <div style={{ position: "absolute", top: 12, right: 12, fontSize: 9, padding: "2px 7px", borderRadius: 10, background: `${BADGE_COLORS[ct.badge]}20`, color: BADGE_COLORS[ct.badge], fontFamily: "Space Mono, monospace", letterSpacing: "0.08em" }}>{ct.badge}</div>
                  <div style={{ fontSize: 26, marginBottom: 10 }}>{ct.icon}</div>
                  <div style={{ fontSize: 18, fontFamily: "Bebas Neue, sans-serif", color: C.text, marginBottom: 5, letterSpacing: "0.04em" }}>{ct.label}</div>
                  <div style={{ fontSize: 11, color: C.muted, lineHeight: 1.5 }}>{ct.desc}</div>
                </button>
              ))}
            </div>

            {/* History strip */}
            {(historyQuery.data || []).length > 0 && (
              <div>
                <div style={{ fontSize: 10, color: C.muted, fontFamily: "Space Mono, monospace", letterSpacing: "0.1em", marginBottom: 10 }}>RECENT GENERATIONS</div>
                <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 4 }}>
                  {(historyQuery.data || []).slice(0, 10).map((h: any) => {
                    const out = h.outputs || {};
                    const thumb = out.primaryImageUrl || out.imageUrl || out.imageUrls?.[0] || null;
                    return (
                      <div key={h.id} onClick={() => { setResult(h.outputs); setSelectedType(h.contentType as ContentTypeId); setActiveTab("output"); setPhase("output"); }}
                        style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, padding: 10, minWidth: 130, flexShrink: 0, cursor: "pointer", transition: "border-color 0.15s" }}
                        onMouseEnter={e => (e.currentTarget as HTMLElement).style.borderColor = C.borderActive}
                        onMouseLeave={e => (e.currentTarget as HTMLElement).style.borderColor = C.border}>
                        {thumb && <img src={thumb} alt="" style={{ width: "100%", height: 70, objectFit: "cover", borderRadius: 4, marginBottom: 6 }} />}
                        <div style={{ fontSize: 9, color: C.cyan, fontFamily: "Space Mono, monospace", marginBottom: 3 }}>{h.contentType.replace("_", " ").toUpperCase()}</div>
                        <div style={{ fontSize: 10, color: C.muted }}>{new Date(h.createdAt).toLocaleDateString()}</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </>
        )}

        {/* ═══ BRIEF ════════════════════════════════════════════════════════ */}
        {phase === "brief" && selectedType && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: 20, maxWidth: 900 }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
                <span style={{ fontSize: 26 }}>{CONTENT_TYPES.find(c => c.id === selectedType)?.icon}</span>
                <div style={{ fontSize: 26, fontFamily: "Bebas Neue, sans-serif", letterSpacing: "0.04em" }}>{CONTENT_TYPES.find(c => c.id === selectedType)?.label}</div>
              </div>

              {/* Clone Drop */}
              {selectedType === "clone_drop" && (
                <>
                  <Label>Scene Description</Label>
                  <TA placeholder="dark penthouse throne room, velvet suit, gold chains, neon lighting, looking into camera" value={cloneBrief.scenePrompt} onChange={v => setCloneBrief(b => ({ ...b, scenePrompt: v }))} />
                  <Label>Motion Description</Label>
                  <TA placeholder="slow cinematic push toward camera, dramatic shadow shift, luxury presence" value={cloneBrief.motionPrompt} onChange={v => setCloneBrief(b => ({ ...b, motionPrompt: v }))} rows={2} />
                  <Label>Primary Platform</Label>
                  <Pills options={["OnlyFans", "Telegram", "Twitter", "Instagram"]} value={cloneBrief.platform} onChange={v => setCloneBrief(b => ({ ...b, platform: v }))} />
                  <Label>Images to Generate</Label>
                  <Pills options={["1", "2", "4"]} value={cloneBrief.imageCount} onChange={v => setCloneBrief(b => ({ ...b, imageCount: v }))} />
                  <Toggle label="Generate KingCam voiceover" value={cloneBrief.withVoice} onChange={v => setCloneBrief(b => ({ ...b, withVoice: v }))} />
                  <div style={{ fontSize: 11, color: C.muted, marginBottom: 16, padding: "8px 12px", background: C.goldDim, borderRadius: 6, border: `1px solid ${C.gold}30` }}>
                    Crown and hair locked automatically. Copy suite generated for all platforms simultaneously.
                  </div>
                </>
              )}

              {/* Platform Trailer */}
              {selectedType === "platform_trailer" && (
                <>
                  <Label>Subject</Label>
                  <Pills options={["CreatorVault", "VaultX", "Clone Engine", "Body Cinema", "Marketplace"]} value={trailerBrief.subject} onChange={v => setTrailerBrief(b => ({ ...b, subject: v }))} />
                  <Label>Tone</Label>
                  <Pills options={["Cinematic", "Hype", "Luxury", "Educational"]} value={trailerBrief.tone} onChange={v => setTrailerBrief(b => ({ ...b, tone: v }))} />
                  <Label>Key Message</Label>
                  <TA placeholder="The platform that turns content into campaigns" value={trailerBrief.keyMessage} onChange={v => setTrailerBrief(b => ({ ...b, keyMessage: v }))} rows={2} />
                  <Label>Duration</Label>
                  <Pills options={["5", "10"]} value={trailerBrief.duration} onChange={v => setTrailerBrief(b => ({ ...b, duration: v }))} />
                  <Toggle label="Generate KingCam voiceover narration" value={trailerBrief.withVoice} onChange={v => setTrailerBrief(b => ({ ...b, withVoice: v }))} />
                </>
              )}

              {/* Social Post */}
              {selectedType === "social_post" && (
                <>
                  <Label>Primary Platform</Label>
                  <Pills options={["TikTok", "Instagram", "Twitter", "Telegram"]} value={socialBrief.platform} onChange={v => setSocialBrief(b => ({ ...b, platform: v }))} />
                  <Label>Hook Style</Label>
                  <Pills options={["Pain Point", "Flex", "Question", "Statement", "Controversy"]} value={socialBrief.hookStyle} onChange={v => setSocialBrief(b => ({ ...b, hookStyle: v }))} />
                  <Label>Topic</Label>
                  <TA placeholder="Why creators are broke despite good content" value={socialBrief.topic} onChange={v => setSocialBrief(b => ({ ...b, topic: v }))} />
                  <Label>CTA Keyword</Label>
                  <Pills options={["VAULT", "VAULTX", "CLONE", "DEMO", "ACCESS", "LINK"]} value={socialBrief.ctaKeyword} onChange={v => setSocialBrief(b => ({ ...b, ctaKeyword: v }))} />
                </>
              )}

              {/* Creator Campaign */}
              {selectedType === "creator_campaign" && (
                <>
                  <Label>Creator Name</Label>
                  <TI placeholder="Creator name" value={campaignBrief.creatorName} onChange={v => setCampaignBrief(b => ({ ...b, creatorName: v }))} />
                  <Label>Content Type</Label>
                  <Pills options={["Video", "Photo", "Reel", "Photo Set", "PPV Bundle"]} value={campaignBrief.contentType} onChange={v => setCampaignBrief(b => ({ ...b, contentType: v }))} />
                  <Label>Direct Asset URL (optional)</Label>
                  <TI placeholder="https://... (leave blank to auto-generate teaser)" value={campaignBrief.assetUrl} onChange={v => setCampaignBrief(b => ({ ...b, assetUrl: v }))} />
                  <Label>PPV Price ($)</Label>
                  <TI placeholder="29" type="number" value={campaignBrief.ppvPrice} onChange={v => setCampaignBrief(b => ({ ...b, ppvPrice: v }))} />
                  <Label>Platform Targets</Label>
                  <Pills options={["VaultX", "OnlyFans", "Fansly", "Telegram", "Twitter"]} value={campaignBrief.platforms} onChange={v => setCampaignBrief(b => ({ ...b, platforms: v }))} multi />
                  <Toggle label="Auto-post teaser to Telegram on generation" value={campaignBrief.autoPost} onChange={v => setCampaignBrief(b => ({ ...b, autoPost: v }))} />
                </>
              )}

              {/* Telegram Blast */}
              {selectedType === "telegram_blast" && (
                <>
                  <Label>What to Broadcast</Label>
                  <TA placeholder="New drop available. Exclusive content. Limited access." value={telegramBrief.messageTopic} onChange={v => setTelegramBrief(b => ({ ...b, messageTopic: v }))} />
                  <Label>Channel</Label>
                  <Pills options={["KingCam", "Owner", "Both"]} value={telegramBrief.channel} onChange={v => setTelegramBrief(b => ({ ...b, channel: v }))} />
                  <Toggle label="Generate A/B variant for testing" value={telegramBrief.abTest} onChange={v => setTelegramBrief(b => ({ ...b, abTest: v }))} />
                  <Toggle label="Include media (generates Pollo video)" value={telegramBrief.includeMedia} onChange={v => setTelegramBrief(b => ({ ...b, includeMedia: v }))} />
                  <Toggle label="Send immediately on generation" value={telegramBrief.sendNow} onChange={v => setTelegramBrief(b => ({ ...b, sendNow: v }))} />
                </>
              )}

              {/* Custom */}
              {selectedType === "custom" && (
                <>
                  <Label>Describe What You Want Built</Label>
                  <TA placeholder="Describe exactly what you want. GPT-4o analyzes the request, routes to the correct pipeline, and executes multi-step generation." value={customBrief.description} onChange={v => setCustomBrief({ description: v })} rows={6} />
                </>
              )}

              {/* Generate button */}
              <button onClick={handleGenerate} disabled={generateMut.isPending}
                style={{ width: "100%", height: 52, background: C.cyan, color: C.bg, fontFamily: "Bebas Neue, sans-serif", fontSize: 20, letterSpacing: "0.12em", border: "none", borderRadius: 6, cursor: "pointer", marginTop: 4, boxShadow: generateMut.isPending ? "none" : C.cyanGlow }}>
                BUILD THIS CONTENT
              </button>

              {/* Batch button for supported types */}
              {["clone_drop", "social_post", "telegram_blast"].includes(selectedType) && (
                <button onClick={handleBatch} disabled={batchMut.isPending}
                  style={{ width: "100%", height: 40, background: "transparent", color: C.muted, fontFamily: "DM Sans, sans-serif", fontSize: 12, fontWeight: 600, border: `1px solid ${C.border}`, borderRadius: 6, cursor: "pointer", marginTop: 8 }}>
                  {batchMut.isPending ? "Generating 3 variants..." : "Generate 3 Variants (Batch Mode)"}
                </button>
              )}
            </div>

            {/* Right side: batch results preview */}
            <div>
              {batchResult && (
                <div>
                  <div style={{ fontSize: 10, color: C.cyan, fontFamily: "Space Mono, monospace", letterSpacing: "0.12em", marginBottom: 10 }}>BATCH RESULTS — PICK THE BEST</div>
                  {batchResult.imageUrls && batchResult.imageUrls.map((url: string, i: number) => (
                    <div key={i} onClick={() => setCloneBrief(b => ({ ...b, scenePrompt: b.scenePrompt }))}
                      style={{ marginBottom: 8, border: `2px solid ${selectedImageIdx === i ? C.cyan : C.border}`, borderRadius: 6, overflow: "hidden", cursor: "pointer" }}
                      onClick={() => setSelectedImageIdx(i)}>
                      <img src={url} alt={`Variant ${i + 1}`} style={{ width: "100%", display: "block" }} />
                      <div style={{ padding: "6px 10px", fontSize: 10, color: C.muted, fontFamily: "Space Mono, monospace" }}>VARIANT {i + 1}</div>
                    </div>
                  ))}
                  {batchResult.hooks && batchResult.hooks.map((h: string, i: number) => (
                    <div key={i} style={{ marginBottom: 8, padding: "10px 12px", background: C.card2, border: `1px solid ${C.border}`, borderRadius: 6 }}>
                      <div style={{ fontSize: 9, color: C.cyan, fontFamily: "Space Mono, monospace", marginBottom: 4 }}>HOOK VARIANT {i + 1}</div>
                      <div style={{ fontSize: 13, color: C.text }}>{h}</div>
                      <div style={{ marginTop: 6 }}><CopyBtn text={h} /></div>
                    </div>
                  ))}
                  {batchResult.messages && batchResult.messages.map((m: string, i: number) => (
                    <div key={i} style={{ marginBottom: 8, padding: "10px 12px", background: C.card2, border: `1px solid ${C.border}`, borderRadius: 6 }}>
                      <div style={{ fontSize: 9, color: C.cyan, fontFamily: "Space Mono, monospace", marginBottom: 4 }}>MESSAGE VARIANT {i + 1}</div>
                      <div style={{ fontSize: 12, color: C.text, lineHeight: 1.5, whiteSpace: "pre-wrap" }}>{m}</div>
                      <div style={{ marginTop: 6 }}><CopyBtn text={m} /></div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ═══ GENERATING ═══════════════════════════════════════════════════ */}
        {phase === "generating" && (
          <div style={{ textAlign: "center", padding: "80px 24px" }}>
            <div key={stageIdx} style={{ fontSize: 28, fontFamily: "Bebas Neue, sans-serif", color: C.text, marginBottom: 12, animation: "fadeIn 0.4s ease", letterSpacing: "0.04em" }}>
              {stages[stageIdx] || "Processing..."}
            </div>
            <div style={{ fontSize: 11, color: C.faint, fontFamily: "Space Mono, monospace", marginBottom: 28 }}>{elapsed}s elapsed</div>
            <div style={{ display: "flex", justifyContent: "center", gap: 8, marginBottom: 24 }}>
              {stages.map((_, i) => (
                <div key={i} style={{ width: i <= stageIdx ? 24 : 8, height: 4, borderRadius: 2, background: i <= stageIdx ? C.cyan : C.border, transition: "all 0.4s" }} />
              ))}
            </div>
            <div style={{ fontSize: 11, color: C.faint, fontFamily: "DM Sans, sans-serif" }}>
              {selectedType === "clone_drop" ? "Firing parallel Replicate predictions + Pollo animation + ElevenLabs voice + GPT copy suite" :
               selectedType === "platform_trailer" ? "Generating Pollo video + ElevenLabs voiceover + multi-platform copy" :
               selectedType === "social_post" ? "Generating video + writing TikTok, Instagram, Twitter, Telegram copy simultaneously" :
               "Running full pipeline..."}
            </div>
            <style>{`@keyframes fadeIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: none; } }`}</style>
          </div>
        )}

        {/* ═══ OUTPUT ═══════════════════════════════════════════════════════ */}
        {phase === "output" && result && (
          <div>
            {/* Output tab bar */}
            <div style={{ display: "flex", gap: 0, borderBottom: `1px solid ${C.border}`, marginBottom: 20 }}>
              {(["output", "copy", "distribute", "history"] as const).map(tab => (
                <button key={tab} onClick={() => setActiveTab(tab)}
                  style={{ padding: "10px 18px", fontSize: 11, fontFamily: "Space Mono, monospace", letterSpacing: "0.1em", textTransform: "uppercase", border: "none", background: "transparent", color: activeTab === tab ? C.cyan : C.muted, borderBottom: `2px solid ${activeTab === tab ? C.cyan : "transparent"}`, cursor: "pointer", transition: "all 0.15s" }}>
                  {tab}
                </button>
              ))}
            </div>

            {/* ── OUTPUT TAB ─────────────────────────────────────────────── */}
            {activeTab === "output" && (
              <div style={{ display: "grid", gridTemplateColumns: result.imageUrls?.length > 1 ? "1fr 200px" : "1fr", gap: 16 }}>
                <div>
                  {/* Video */}
                  {result.videoUrl && (
                    <video src={result.videoUrl} autoPlay muted loop playsInline controls
                      style={{ width: "100%", borderRadius: 8, marginBottom: 12, border: `1px solid ${C.border}`, background: "#000" }} />
                  )}
                  {/* Primary image */}
                  {(result.primaryImageUrl || result.imageUrl) && !result.videoUrl && (
                    <img src={result.imageUrls?.[selectedImageIdx] || result.primaryImageUrl || result.imageUrl} alt="Output"
                      style={{ width: "100%", borderRadius: 8, marginBottom: 12, border: `1px solid ${C.border}` }} />
                  )}
                  {/* Voice player */}
                  {result.voiceUrl && (
                    <div style={{ marginBottom: 12 }}>
                      <div style={{ fontSize: 10, color: C.cyan, fontFamily: "Space Mono, monospace", marginBottom: 6 }}>KINGCAM VOICEOVER</div>
                      <audio src={result.voiceUrl} controls style={{ width: "100%" }} />
                    </div>
                  )}
                  {/* Telegram message preview */}
                  {result.type === "telegram_blast" && (
                    <div style={{ background: C.card2, border: `1px solid ${C.border}`, borderRadius: 8, padding: 16, marginBottom: 12 }}>
                      {result.sent && <div style={{ fontSize: 9, color: C.green, fontFamily: "Space Mono, monospace", marginBottom: 8 }}>● SENT TO {result.sentChannels?.join(", ") || result.channel}</div>}
                      <div style={{ fontSize: 10, color: C.cyan, fontFamily: "Space Mono, monospace", marginBottom: 6 }}>MESSAGE A</div>
                      <div style={{ fontSize: 14, color: C.text, lineHeight: 1.6, whiteSpace: "pre-wrap", marginBottom: 8 }}>{result.messageA}</div>
                      <div style={{ fontSize: 10, color: C.muted, fontFamily: "Space Mono, monospace" }}>{result.messageA?.length || 0} chars</div>
                    </div>
                  )}
                  {result.messageB && (
                    <div style={{ background: C.card2, border: `1px solid ${C.border}`, borderRadius: 8, padding: 16, marginBottom: 12 }}>
                      <div style={{ fontSize: 10, color: C.gold, fontFamily: "Space Mono, monospace", marginBottom: 6 }}>MESSAGE B (A/B VARIANT)</div>
                      <div style={{ fontSize: 14, color: C.text, lineHeight: 1.6, whiteSpace: "pre-wrap", marginBottom: 8 }}>{result.messageB}</div>
                      <div style={{ fontSize: 10, color: C.muted, fontFamily: "Space Mono, monospace" }}>{result.messageB?.length || 0} chars</div>
                    </div>
                  )}
                  {/* Content plan for custom */}
                  {result.contentPlan && (
                    <div style={{ fontSize: 13, color: C.muted, padding: "10px 14px", background: C.card2, borderRadius: 6, border: `1px solid ${C.border}`, marginBottom: 12 }}>
                      <span style={{ color: C.cyan, fontFamily: "Space Mono, monospace", fontSize: 9 }}>CONTENT PLAN: </span>{result.contentPlan}
                    </div>
                  )}
                  {/* Action buttons */}
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 4 }}>
                    {result.videoUrl && <ActionBtn label="Post to Telegram" onClick={() => handlePostTelegram(result.videoUrl, undefined, result.copySuite?.telegram?.message || result.caption || result.messageA || "")} disabled={postTelegramMut.isPending} />}
                    {(result.videoUrl || result.primaryImageUrl) && <ActionBtn label="Save to Vault" onClick={() => handleSaveVault(result.videoUrl || result.primaryImageUrl, result.videoUrl ? "video" : "image")} disabled={saveVaultMut.isPending} />}
                    {result.voiceUrl && <ActionBtn label="Save Voice" onClick={() => handleSaveVault(result.voiceUrl, "voice")} disabled={saveVaultMut.isPending} />}
                    {result.videoUrl && <a href={result.videoUrl} download style={{ padding: "9px 16px", borderRadius: 6, border: `1px solid ${C.border}`, background: C.card, color: C.text, textDecoration: "none", fontSize: 12, fontWeight: 600 }}>Download</a>}
                    <ActionBtn label="Build Another" onClick={reset} />
                  </div>
                </div>

                {/* Image strip for clone drop */}
                {result.imageUrls?.length > 1 && (
                  <div>
                    <div style={{ fontSize: 9, color: C.muted, fontFamily: "Space Mono, monospace", marginBottom: 8 }}>ALL IMAGES</div>
                    {result.imageUrls.map((url: string, i: number) => (
                      <div key={i} onClick={() => setSelectedImageIdx(i)}
                        style={{ marginBottom: 8, border: `2px solid ${selectedImageIdx === i ? C.cyan : C.border}`, borderRadius: 6, overflow: "hidden", cursor: "pointer" }}>
                        <img src={url} alt={`Image ${i + 1}`} style={{ width: "100%", display: "block" }} />
                        <div style={{ display: "flex", justifyContent: "space-between", padding: "4px 8px", background: C.card2 }}>
                          <span style={{ fontSize: 9, color: selectedImageIdx === i ? C.cyan : C.muted, fontFamily: "Space Mono, monospace" }}>#{i + 1}</span>
                          <a href={url} download onClick={e => e.stopPropagation()} style={{ fontSize: 9, color: C.muted, textDecoration: "none" }}>↓</a>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ── COPY TAB ───────────────────────────────────────────────── */}
            {activeTab === "copy" && (
              <div>
                {/* Clone Drop copy suite */}
                {result.copySuite && result.type === "clone_drop" && (
                  <>
                    <SectionTitle>Primary Copy</SectionTitle>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 4 }}>
                      <CaptionCard label="HOOK" text={result.copySuite.hook} accent={C.cyan} />
                      <CaptionCard label="CAPTION" text={result.copySuite.caption} accent={C.cyan} />
                      <CaptionCard label="DM OPENER" text={result.copySuite.dmOpener} accent={C.gold} />
                      <CaptionCard label="PPV TEASER" text={result.copySuite.ppvTeaser} accent={C.gold} />
                    </div>
                    <SectionTitle>Platform-Specific Copy</SectionTitle>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 4 }}>
                      <CaptionCard label="TIKTOK HOOK" text={result.copySuite.tiktokHook} accent={C.purple} />
                      <CaptionCard label="TWITTER POST" text={result.copySuite.twitterPost} accent="#1DA1F2" />
                      <CaptionCard label="INSTAGRAM CAPTION" text={result.copySuite.instagramCaption} accent="#E1306C" />
                      <CaptionCard label="TELEGRAM BLAST" text={result.copySuite.telegramBlast} accent="#0088CC" />
                    </div>
                    {result.copySuite.hookVariants?.length > 0 && (
                      <>
                        <SectionTitle>A/B Hook Variants</SectionTitle>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
                          {result.copySuite.hookVariants.map((h: string, i: number) => (
                            <CaptionCard key={i} label={`VARIANT ${i + 1}`} text={h} accent={C.muted} />
                          ))}
                        </div>
                      </>
                    )}
                  </>
                )}

                {/* Platform Trailer / Social Post copy suite */}
                {result.copySuite && (result.type === "platform_trailer" || result.type === "social_post") && (
                  <>
                    <SectionTitle>TikTok</SectionTitle>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 4 }}>
                      <CaptionCard label="HOOK" text={result.copySuite.tiktok?.hook || ""} accent={C.purple} />
                      <CaptionCard label="CAPTION" text={result.copySuite.tiktok?.caption || ""} accent={C.purple} />
                    </div>
                    <SectionTitle>Instagram</SectionTitle>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 4 }}>
                      <CaptionCard label="HOOK" text={result.copySuite.instagram?.hook || ""} accent="#E1306C" />
                      <CaptionCard label="CAPTION" text={result.copySuite.instagram?.caption || ""} accent="#E1306C" />
                    </div>
                    <SectionTitle>Twitter / X</SectionTitle>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 4 }}>
                      <CaptionCard label="HOOK" text={result.copySuite.twitter?.hook || ""} accent="#1DA1F2" />
                      <CaptionCard label="POST" text={result.copySuite.twitter?.caption || ""} accent="#1DA1F2" />
                    </div>
                    <SectionTitle>Telegram</SectionTitle>
                    <CaptionCard label="BLAST MESSAGE" text={result.copySuite.telegram?.message || ""} accent="#0088CC" />
                    {result.copySuite.hookVariants?.length > 0 && (
                      <>
                        <SectionTitle>A/B Hook Variants</SectionTitle>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
                          {result.copySuite.hookVariants.map((h: string, i: number) => (
                            <CaptionCard key={i} label={`VARIANT ${i + 1}`} text={h} accent={C.muted} />
                          ))}
                        </div>
                      </>
                    )}
                    {result.copySuite.postingSchedule && (
                      <div style={{ marginTop: 16, padding: "10px 14px", background: C.greenDim, borderRadius: 6, border: `1px solid ${C.green}30` }}>
                        <span style={{ fontSize: 9, color: C.green, fontFamily: "Space Mono, monospace" }}>POSTING SCHEDULE: </span>
                        <span style={{ fontSize: 12, color: C.text }}>{result.copySuite.postingSchedule}</span>
                      </div>
                    )}
                  </>
                )}

                {/* Creator Campaign copy */}
                {result.campaignPack && (
                  <>
                    <SectionTitle>Campaign Copy Pack</SectionTitle>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 4 }}>
                      <CaptionCard label="HEADLINE" text={result.campaignPack.headline} accent={C.gold} />
                      <CaptionCard label="TEASER CAPTION" text={result.campaignPack.teaserCaption} accent={C.gold} />
                      <CaptionCard label="PPV UNLOCK LINE" text={result.campaignPack.ppvUnlockLine} accent={C.cyan} />
                      <CaptionCard label="PRICING ANCHOR" text={result.campaignPack.pricingAnchor} accent={C.cyan} />
                      <CaptionCard label="URGENCY LINE" text={result.campaignPack.urgencyLine} accent={C.red} />
                      <CaptionCard label="TWITTER TEASER" text={result.campaignPack.twitterTeaser} accent="#1DA1F2" />
                    </div>
                    <CaptionCard label="TELEGRAM BLAST" text={result.campaignPack.telegramBlast} accent="#0088CC" />
                    <CaptionCard label="INSTAGRAM CAPTION" text={result.campaignPack.instagramCaption} accent="#E1306C" />
                    {result.campaignPack.dmSequence?.length > 0 && (
                      <>
                        <SectionTitle>DM Sequence (3 Messages)</SectionTitle>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
                          {result.campaignPack.dmSequence.map((msg: string, i: number) => (
                            <CaptionCard key={i} label={["DM OPENER", "FOLLOW-UP", "CLOSE"][i] || `DM ${i + 1}`} text={msg} accent={C.gold} />
                          ))}
                        </div>
                      </>
                    )}
                    {result.campaignPack.hookVariants?.length > 0 && (
                      <>
                        <SectionTitle>Hook Variants</SectionTitle>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
                          {result.campaignPack.hookVariants.map((h: string, i: number) => (
                            <CaptionCard key={i} label={`VARIANT ${i + 1}`} text={h} accent={C.muted} />
                          ))}
                        </div>
                      </>
                    )}
                  </>
                )}

                {/* Custom copy */}
                {result.copy && result.type === "custom" && (
                  <>
                    <SectionTitle>Generated Copy</SectionTitle>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                      <CaptionCard label="HOOK" text={result.copy.hook} accent={C.cyan} />
                      <CaptionCard label="CAPTION" text={result.copy.caption} accent={C.cyan} />
                    </div>
                    {result.recommendedPlatforms?.length > 0 && (
                      <div style={{ marginTop: 12, padding: "8px 12px", background: C.cyanDim, borderRadius: 6 }}>
                        <span style={{ fontSize: 9, color: C.cyan, fontFamily: "Space Mono, monospace" }}>RECOMMENDED PLATFORMS: </span>
                        <span style={{ fontSize: 12, color: C.text }}>{result.recommendedPlatforms.join(", ")}</span>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

            {/* ── DISTRIBUTE TAB ─────────────────────────────────────────── */}
            {activeTab === "distribute" && (
              <div style={{ maxWidth: 600 }}>
                <SectionTitle>Distribution Control</SectionTitle>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 20 }}>
                  {[
                    { label: "KingCam Channel", ch: "KingCam" as const, icon: "👑" },
                    { label: "Owner DMs", ch: "Owner" as const, icon: "🔑" },
                    { label: "Both Channels", ch: "Both" as const, icon: "⚡" },
                  ].map(({ label, ch, icon }) => (
                    <button key={ch} onClick={() => handlePostTelegram(result.videoUrl, result.primaryImageUrl || result.imageUrl, result.copySuite?.telegram?.message || result.campaignPack?.telegramBlast || result.messageA || result.caption || "", ch)}
                      disabled={postTelegramMut.isPending}
                      style={{ padding: "14px 16px", borderRadius: 8, border: `1px solid ${C.border}`, background: C.card, color: C.text, cursor: "pointer", textAlign: "left", fontFamily: "DM Sans, sans-serif" }}>
                      <div style={{ fontSize: 20, marginBottom: 6 }}>{icon}</div>
                      <div style={{ fontSize: 13, fontWeight: 700 }}>Post to {label}</div>
                      <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>Telegram</div>
                    </button>
                  ))}
                </div>

                <button onClick={handleDistributeAll} disabled={distributeAllMut.isPending}
                  style={{ width: "100%", padding: "14px", borderRadius: 8, border: `1px solid ${C.cyan}`, background: C.cyanDim, color: C.cyan, fontFamily: "Bebas Neue, sans-serif", fontSize: 18, letterSpacing: "0.1em", cursor: "pointer", marginBottom: 20 }}>
                  {distributeAllMut.isPending ? "DISTRIBUTING..." : "DISTRIBUTE TO ALL CHANNELS"}
                </button>

                {result.videoUrl && (
                  <div style={{ padding: "14px 16px", background: C.card2, borderRadius: 8, border: `1px solid ${C.border}` }}>
                    <div style={{ fontSize: 10, color: C.muted, fontFamily: "Space Mono, monospace", marginBottom: 8 }}>ASSET URLS</div>
                    <div style={{ fontSize: 11, color: C.cyan, wordBreak: "break-all", marginBottom: 6 }}>{result.videoUrl}</div>
                    <CopyBtn text={result.videoUrl} label="COPY VIDEO URL" />
                  </div>
                )}
              </div>
            )}

            {/* ── HISTORY TAB ────────────────────────────────────────────── */}
            {activeTab === "history" && (
              <div>
                <SectionTitle>Generation History</SectionTitle>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10 }}>
                  {(historyQuery.data || []).map((h: any) => {
                    const out = h.outputs || {};
                    const thumb = out.primaryImageUrl || out.imageUrl || out.imageUrls?.[0] || null;
                    return (
                      <div key={h.id} style={{ background: C.card2, border: `1px solid ${C.border}`, borderRadius: 8, overflow: "hidden" }}>
                        {thumb && <img src={thumb} alt="" style={{ width: "100%", height: 80, objectFit: "cover" }} />}
                        <div style={{ padding: "8px 10px" }}>
                          <div style={{ fontSize: 9, color: C.cyan, fontFamily: "Space Mono, monospace", marginBottom: 3 }}>{h.contentType.replace("_", " ").toUpperCase()}</div>
                          <div style={{ fontSize: 10, color: C.muted, marginBottom: 8 }}>{new Date(h.createdAt).toLocaleDateString()}</div>
                          <div style={{ display: "flex", gap: 4 }}>
                            <button onClick={() => { setResult(h.outputs); setSelectedType(h.contentType as ContentTypeId); setActiveTab("output"); }}
                              style={{ flex: 1, padding: "5px 0", fontSize: 9, border: `1px solid ${C.border}`, background: "transparent", color: C.muted, borderRadius: 4, cursor: "pointer", fontFamily: "Space Mono, monospace" }}>
                              VIEW
                            </button>
                            <button onClick={() => handleRemix(h.id)} disabled={remixMut.isPending}
                              style={{ flex: 1, padding: "5px 0", fontSize: 9, border: `1px solid ${C.cyan}`, background: C.cyanDim, color: C.cyan, borderRadius: 4, cursor: "pointer", fontFamily: "Space Mono, monospace" }}>
                              REMIX
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
                {(historyQuery.data || []).length === 0 && (
                  <div style={{ textAlign: "center", color: C.muted, fontSize: 13, padding: "40px 0" }}>No history yet. Generate something.</div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
