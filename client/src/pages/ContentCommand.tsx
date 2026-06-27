/**
 * ============================================================================
 * KINGCAM CONTENT COMMAND CENTER — /king/content
 * One page. One purpose. Generate anything. Distribute everywhere.
 *
 * Six content types:
 *   Clone Drop | Platform Trailer | Social Post
 *   Creator Campaign | Telegram Blast | Custom
 *
 * Owner-gated: IDs 6 and 33 only.
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
  border: "rgba(255,255,255,0.08)",
  borderActive: "rgba(0,217,255,0.4)",
  text: "#FFFFFF",
  muted: "rgba(255,255,255,0.4)",
  cyan: "#00D9FF",
  cyanDim: "rgba(0,217,255,0.1)",
  gold: "#C9A84C",
  green: "#00E676",
  red: "#FF4444",
};

// ─── Content type definitions ─────────────────────────────────────────────────
const CONTENT_TYPES = [
  { id: "clone_drop",       icon: "👑", label: "Clone Drop",       desc: "KingCam image + video + captions" },
  { id: "platform_trailer", icon: "🎬", label: "Platform Trailer", desc: "Cinematic promo for CreatorVault or VaultX" },
  { id: "social_post",      icon: "📱", label: "Social Post",      desc: "Hook + caption + visual for any platform" },
  { id: "creator_campaign", icon: "💰", label: "Creator Campaign", desc: "Full drop package for a creator" },
  { id: "telegram_blast",   icon: "⚡", label: "Telegram Blast",   desc: "Message + media for channel broadcast" },
  { id: "custom",           icon: "⚙️", label: "Custom",           desc: "Describe anything — factory figures it out" },
] as const;
type ContentTypeId = typeof CONTENT_TYPES[number]["id"];

// ─── Stage messages ───────────────────────────────────────────────────────────
const STAGE_MESSAGES = [
  "Generating visuals...",
  "Writing copy...",
  "Assembling the drop...",
  "Ready.",
];

// ─── Pill selector component ──────────────────────────────────────────────────
function Pills({
  options,
  value,
  onChange,
  multi = false,
}: {
  options: string[];
  value: string | string[];
  onChange: (v: string | string[]) => void;
  multi?: boolean;
}) {
  const selected = Array.isArray(value) ? value : [value];
  const toggle = (opt: string) => {
    if (multi) {
      const next = selected.includes(opt)
        ? selected.filter(s => s !== opt)
        : [...selected, opt];
      onChange(next);
    } else {
      onChange(opt);
    }
  };
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 12 }}>
      {options.map(opt => {
        const active = selected.includes(opt);
        return (
          <button
            key={opt}
            onClick={() => toggle(opt)}
            style={{
              padding: "6px 14px",
              borderRadius: 20,
              border: `1px solid ${active ? C.cyan : C.border}`,
              background: active ? C.cyanDim : "transparent",
              color: active ? C.cyan : C.muted,
              fontSize: 12,
              fontFamily: "DM Sans, sans-serif",
              cursor: "pointer",
              transition: "all 0.15s",
            }}
          >
            {opt}
          </button>
        );
      })}
    </div>
  );
}

// ─── Field label ──────────────────────────────────────────────────────────────
function Label({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontSize: 11, color: C.muted, fontFamily: "Space Mono, monospace", letterSpacing: "0.1em", marginBottom: 6, textTransform: "uppercase" }}>
      {children}
    </div>
  );
}

// ─── Textarea ─────────────────────────────────────────────────────────────────
function TA({ placeholder, value, onChange, rows = 3 }: { placeholder: string; value: string; onChange: (v: string) => void; rows?: number }) {
  return (
    <textarea
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      rows={rows}
      style={{
        width: "100%",
        background: "#111",
        border: `1px solid ${C.border}`,
        borderRadius: 6,
        color: C.text,
        fontFamily: "DM Sans, sans-serif",
        fontSize: 14,
        padding: "10px 12px",
        resize: "vertical",
        marginBottom: 12,
        boxSizing: "border-box",
      }}
    />
  );
}

// ─── Text input ───────────────────────────────────────────────────────────────
function TI({ placeholder, value, onChange, type = "text" }: { placeholder: string; value: string; onChange: (v: string) => void; type?: string }) {
  return (
    <input
      type={type}
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      style={{
        width: "100%",
        background: "#111",
        border: `1px solid ${C.border}`,
        borderRadius: 6,
        color: C.text,
        fontFamily: "DM Sans, sans-serif",
        fontSize: 14,
        padding: "10px 12px",
        marginBottom: 12,
        boxSizing: "border-box",
      }}
    />
  );
}

// ─── Copy button ──────────────────────────────────────────────────────────────
function CopyBtn({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
      style={{ padding: "4px 10px", fontSize: 10, borderRadius: 4, border: `1px solid ${C.border}`, background: "transparent", color: copied ? C.green : C.muted, cursor: "pointer", fontFamily: "Space Mono, monospace" }}
    >
      {copied ? "COPIED" : "COPY"}
    </button>
  );
}

// ─── Caption card ─────────────────────────────────────────────────────────────
function CaptionCard({ label, text }: { label: string; text: string }) {
  return (
    <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, padding: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <span style={{ fontSize: 9, color: C.cyan, fontFamily: "Space Mono, monospace", letterSpacing: "0.15em" }}>{label}</span>
        <CopyBtn text={text} />
      </div>
      <div style={{ fontSize: 14, color: C.text, fontFamily: "DM Sans, sans-serif", lineHeight: 1.5 }}>{text}</div>
    </div>
  );
}

// ─── Action button ────────────────────────────────────────────────────────────
function ActionBtn({ label, onClick, disabled, color = C.card }: { label: string; onClick: () => void; disabled?: boolean; color?: string }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        padding: "10px 18px",
        borderRadius: 6,
        border: `1px solid ${C.border}`,
        background: color,
        color: C.text,
        fontFamily: "DM Sans, sans-serif",
        fontSize: 13,
        fontWeight: 600,
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.5 : 1,
      }}
    >
      {label}
    </button>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function ContentCommand() {
  const { user, isLoading: authLoading } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  // ─── Owner gate ──────────────────────────────────────────────────────────
  const isOwner = user?.id === 6 || user?.id === 33;
  useEffect(() => {
    if (!authLoading && !isOwner) setLocation("/dashboard");
  }, [authLoading, isOwner]);

  // ─── State ───────────────────────────────────────────────────────────────
  const [selectedType, setSelectedType] = useState<ContentTypeId | null>(null);
  const [phase, setPhase] = useState<"select" | "brief" | "generating" | "output">("select");
  const [stageIdx, setStageIdx] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [result, setResult] = useState<any>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const stageRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ─── Brief state — one object per type ───────────────────────────────────
  const [cloneBrief, setCloneBrief] = useState({ scenePrompt: "", motionPrompt: "", platform: "OnlyFans" });
  const [trailerBrief, setTrailerBrief] = useState({ subject: "VaultX", tone: "Cinematic", keyMessage: "", duration: "5" });
  const [socialBrief, setSocialBrief] = useState({ platform: "Twitter", hookStyle: "Statement", topic: "", ctaKeyword: "VAULT" });
  const [campaignBrief, setCampaignBrief] = useState({ creatorName: "", contentType: "Video", assetUrl: "", ppvPrice: "29", platforms: ["VaultX", "Telegram"] });
  const [telegramBrief, setTelegramBrief] = useState({ messageTopic: "", includeMedia: false, channel: "CreatorVault_Free", sendNow: false });
  const [customBrief, setCustomBrief] = useState({ description: "" });

  // ─── tRPC ────────────────────────────────────────────────────────────────
  // @ts-ignore
  const generateMut = (trpc as any).contentCommand.generateContent.useMutation();
  // @ts-ignore
  const postTelegramMut = (trpc as any).contentCommand.postToTelegram.useMutation();
  // @ts-ignore
  const saveVaultMut = (trpc as any).contentCommand.saveToVault.useMutation();
  // @ts-ignore
  const historyQuery = (trpc as any).contentCommand.getHistory.useQuery(
    {},
    { enabled: !!isOwner }
  );

  // ─── Generation handler ───────────────────────────────────────────────────
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

    // Elapsed timer
    timerRef.current = setInterval(() => setElapsed(e => e + 1), 1000);
    // Stage cycling
    stageRef.current = setInterval(() => setStageIdx(i => Math.min(i + 1, STAGE_MESSAGES.length - 2)), 18000);

    try {
      const res = await generateMut.mutateAsync({
        contentType: selectedType,
        brief: briefs[selectedType],
      });
      setResult(res);
      setStageIdx(STAGE_MESSAGES.length - 1);
      setPhase("output");
      void historyQuery.refetch();
      toast({ title: "Content ready", description: `${selectedType.replace("_", " ")} generated.` });
    } catch (err: any) {
      toast({ title: "Generation failed", description: err.message, variant: "destructive" });
      setPhase("brief");
    } finally {
      if (timerRef.current) clearInterval(timerRef.current);
      if (stageRef.current) clearInterval(stageRef.current);
    }
  }, [selectedType, cloneBrief, trailerBrief, socialBrief, campaignBrief, telegramBrief, customBrief]);

  const handlePostTelegram = useCallback(async (videoUrl?: string, imageUrl?: string, caption?: string) => {
    try {
      await postTelegramMut.mutateAsync({ videoUrl, imageUrl, caption: caption || "", channel: "CreatorVault_Free" });
      toast({ title: "Posted to Telegram" });
    } catch (err: any) {
      toast({ title: "Telegram post failed", description: err.message, variant: "destructive" });
    }
  }, []);

  const handleSaveVault = useCallback(async (url: string, assetType: "video" | "image") => {
    try {
      await saveVaultMut.mutateAsync({ url, assetType, contentType: selectedType || undefined });
      toast({ title: "Saved to Vault" });
    } catch (err: any) {
      toast({ title: "Save failed", description: err.message, variant: "destructive" });
    }
  }, [selectedType]);

  const reset = () => { setPhase("select"); setSelectedType(null); setResult(null); };

  if (authLoading || !isOwner) return <div style={{ minHeight: "100vh", background: C.bg }} />;

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div style={{ minHeight: "100vh", background: C.bg, color: C.text, fontFamily: "DM Sans, sans-serif" }}>

      {/* Header */}
      <header style={{ padding: "28px 24px 20px", borderBottom: `1px solid ${C.border}`, maxWidth: 900, margin: "0 auto" }}>
        <div style={{ fontSize: 10, color: C.cyan, fontFamily: "Space Mono, monospace", letterSpacing: "0.2em", marginBottom: 6 }}>
          KINGCAM CONTENT FACTORY
        </div>
        <h1 style={{ margin: 0, fontSize: 42, fontFamily: "Bebas Neue, sans-serif", letterSpacing: "0.04em", lineHeight: 1 }}>
          CONTENT COMMAND
        </h1>
        <p style={{ margin: "8px 0 0", fontSize: 15, color: "rgba(255,255,255,0.6)" }}>
          Describe what you want. The factory handles the rest.
        </p>
      </header>

      <div style={{ maxWidth: 900, margin: "0 auto", padding: "24px" }}>

        {/* ═══ PHASE: SELECT ══════════════════════════════════════════════ */}
        {phase === "select" && (
          <>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginBottom: 24 }}>
              {CONTENT_TYPES.map(ct => (
                <button
                  key={ct.id}
                  onClick={() => { setSelectedType(ct.id); setPhase("brief"); }}
                  style={{
                    background: C.card,
                    border: `1px solid ${C.border}`,
                    borderRadius: 8,
                    padding: 16,
                    textAlign: "left",
                    cursor: "pointer",
                    transition: "all 0.15s",
                  }}
                  onMouseEnter={e => {
                    (e.currentTarget as HTMLButtonElement).style.background = C.cyanDim;
                    (e.currentTarget as HTMLButtonElement).style.borderColor = C.borderActive;
                  }}
                  onMouseLeave={e => {
                    (e.currentTarget as HTMLButtonElement).style.background = C.card;
                    (e.currentTarget as HTMLButtonElement).style.borderColor = C.border;
                  }}
                >
                  <div style={{ fontSize: 28, marginBottom: 8 }}>{ct.icon}</div>
                  <div style={{ fontSize: 20, fontFamily: "Bebas Neue, sans-serif", color: C.text, marginBottom: 4 }}>{ct.label}</div>
                  <div style={{ fontSize: 12, color: C.muted, fontFamily: "DM Sans, sans-serif" }}>{ct.desc}</div>
                </button>
              ))}
            </div>

            {/* History strip */}
            {(historyQuery.data || []).length > 0 && (
              <div>
                <div style={{ fontSize: 11, color: C.muted, fontFamily: "Space Mono, monospace", letterSpacing: "0.1em", marginBottom: 10 }}>RECENT GENERATIONS</div>
                <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 4 }}>
                  {(historyQuery.data || []).slice(0, 8).map((h: any) => (
                    <div
                      key={h.id}
                      style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 6, padding: "8px 12px", minWidth: 140, flexShrink: 0, cursor: "pointer" }}
                      onClick={() => { setResult(h.outputs); setSelectedType(h.contentType as ContentTypeId); setPhase("output"); }}
                    >
                      <div style={{ fontSize: 10, color: C.cyan, fontFamily: "Space Mono, monospace", marginBottom: 4 }}>{h.contentType.replace("_", " ").toUpperCase()}</div>
                      <div style={{ fontSize: 11, color: C.muted }}>{new Date(h.createdAt).toLocaleDateString()}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {/* ═══ PHASE: BRIEF ═══════════════════════════════════════════════ */}
        {phase === "brief" && selectedType && (
          <div style={{ maxWidth: 640 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
              <button onClick={reset} style={{ background: "transparent", border: `1px solid ${C.border}`, color: C.muted, borderRadius: 4, padding: "6px 12px", cursor: "pointer", fontSize: 12 }}>← Back</button>
              <div style={{ fontSize: 24, fontFamily: "Bebas Neue, sans-serif" }}>
                {CONTENT_TYPES.find(c => c.id === selectedType)?.icon}{" "}
                {CONTENT_TYPES.find(c => c.id === selectedType)?.label}
              </div>
            </div>

            {/* Clone Drop brief */}
            {selectedType === "clone_drop" && (
              <>
                <Label>Scene Description</Label>
                <TA placeholder="dark penthouse throne room, velvet suit, gold chains, neon lighting" value={cloneBrief.scenePrompt} onChange={v => setCloneBrief(b => ({ ...b, scenePrompt: v }))} />
                <Label>Motion Description</Label>
                <TA placeholder="slow cinematic push toward camera, dramatic shadow shift" value={cloneBrief.motionPrompt} onChange={v => setCloneBrief(b => ({ ...b, motionPrompt: v }))} />
                <Label>Platform</Label>
                <Pills options={["OnlyFans", "Telegram", "Twitter", "Instagram"]} value={cloneBrief.platform} onChange={v => setCloneBrief(b => ({ ...b, platform: v as string }))} />
                <div style={{ fontSize: 11, color: C.muted, marginBottom: 16 }}>Crown and hair locked automatically. Just describe the scene.</div>
              </>
            )}

            {/* Platform Trailer brief */}
            {selectedType === "platform_trailer" && (
              <>
                <Label>Subject</Label>
                <Pills options={["CreatorVault", "VaultX", "Clone Engine", "Body Cinema", "Marketplace"]} value={trailerBrief.subject} onChange={v => setTrailerBrief(b => ({ ...b, subject: v as string }))} />
                <Label>Tone</Label>
                <Pills options={["Cinematic", "Hype", "Luxury", "Educational"]} value={trailerBrief.tone} onChange={v => setTrailerBrief(b => ({ ...b, tone: v as string }))} />
                <Label>Key Message</Label>
                <TA placeholder="The platform that turns content into campaigns" value={trailerBrief.keyMessage} onChange={v => setTrailerBrief(b => ({ ...b, keyMessage: v }))} rows={2} />
                <Label>Duration</Label>
                <Pills options={["5", "10", "15"]} value={trailerBrief.duration} onChange={v => setTrailerBrief(b => ({ ...b, duration: v as string }))} />
              </>
            )}

            {/* Social Post brief */}
            {selectedType === "social_post" && (
              <>
                <Label>Platform</Label>
                <Pills options={["TikTok", "Instagram", "Twitter", "Telegram"]} value={socialBrief.platform} onChange={v => setSocialBrief(b => ({ ...b, platform: v as string }))} />
                <Label>Hook Style</Label>
                <Pills options={["Pain Point", "Flex", "Question", "Statement"]} value={socialBrief.hookStyle} onChange={v => setSocialBrief(b => ({ ...b, hookStyle: v as string }))} />
                <Label>Topic</Label>
                <TA placeholder="Why creators are broke despite good content" value={socialBrief.topic} onChange={v => setSocialBrief(b => ({ ...b, topic: v }))} rows={2} />
                <Label>CTA Keyword</Label>
                <Pills options={["VAULT", "VAULTX", "CLONE", "DEMO", "ACCESS"]} value={socialBrief.ctaKeyword} onChange={v => setSocialBrief(b => ({ ...b, ctaKeyword: v as string }))} />
              </>
            )}

            {/* Creator Campaign brief */}
            {selectedType === "creator_campaign" && (
              <>
                <Label>Creator Name</Label>
                <TI placeholder="Creator name" value={campaignBrief.creatorName} onChange={v => setCampaignBrief(b => ({ ...b, creatorName: v }))} />
                <Label>Content Type</Label>
                <Pills options={["Video", "Photo", "Reel", "Photo Set"]} value={campaignBrief.contentType} onChange={v => setCampaignBrief(b => ({ ...b, contentType: v as string }))} />
                <Label>Direct Asset URL (optional)</Label>
                <TI placeholder="https://..." value={campaignBrief.assetUrl} onChange={v => setCampaignBrief(b => ({ ...b, assetUrl: v }))} />
                <Label>PPV Price ($)</Label>
                <TI placeholder="29" type="number" value={campaignBrief.ppvPrice} onChange={v => setCampaignBrief(b => ({ ...b, ppvPrice: v }))} />
                <Label>Platform Targets</Label>
                <Pills options={["VaultX", "OnlyFans", "Fansly", "Telegram", "Twitter"]} value={campaignBrief.platforms} onChange={v => setCampaignBrief(b => ({ ...b, platforms: v as string[] }))} multi />
              </>
            )}

            {/* Telegram Blast brief */}
            {selectedType === "telegram_blast" && (
              <>
                <Label>What to Broadcast</Label>
                <TA placeholder="What do you want to broadcast?" value={telegramBrief.messageTopic} onChange={v => setTelegramBrief(b => ({ ...b, messageTopic: v }))} />
                <Label>Include Media</Label>
                <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
                  {["Yes", "No"].map(opt => {
                    const active = opt === "Yes" ? telegramBrief.includeMedia : !telegramBrief.includeMedia;
                    return (
                      <button key={opt} onClick={() => setTelegramBrief(b => ({ ...b, includeMedia: opt === "Yes" }))}
                        style={{ padding: "6px 14px", borderRadius: 20, border: `1px solid ${active ? C.cyan : C.border}`, background: active ? C.cyanDim : "transparent", color: active ? C.cyan : C.muted, fontSize: 12, cursor: "pointer" }}>
                        {opt}
                      </button>
                    );
                  })}
                </div>
                <Label>Channel</Label>
                <Pills options={["CreatorVault_Free", "VaultX Inner Circle", "Both"]} value={telegramBrief.channel} onChange={v => setTelegramBrief(b => ({ ...b, channel: v as string }))} />
                <Label>Send Timing</Label>
                <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
                  {["Send Now", "Preview Only"].map(opt => {
                    const active = opt === "Send Now" ? telegramBrief.sendNow : !telegramBrief.sendNow;
                    return (
                      <button key={opt} onClick={() => setTelegramBrief(b => ({ ...b, sendNow: opt === "Send Now" }))}
                        style={{ padding: "6px 14px", borderRadius: 20, border: `1px solid ${active ? C.cyan : C.border}`, background: active ? C.cyanDim : "transparent", color: active ? C.cyan : C.muted, fontSize: 12, cursor: "pointer" }}>
                        {opt}
                      </button>
                    );
                  })}
                </div>
              </>
            )}

            {/* Custom brief */}
            {selectedType === "custom" && (
              <>
                <Label>Describe What You Want</Label>
                <TA
                  placeholder="Describe exactly what you want to create. The factory determines what to build."
                  value={customBrief.description}
                  onChange={v => setCustomBrief({ description: v })}
                  rows={6}
                />
              </>
            )}

            {/* Generate button */}
            <button
              onClick={handleGenerate}
              disabled={generateMut.isPending}
              style={{
                width: "100%",
                height: 56,
                background: C.cyan,
                color: C.bg,
                fontFamily: "Bebas Neue, sans-serif",
                fontSize: 20,
                letterSpacing: "0.12em",
                border: "none",
                borderRadius: 6,
                cursor: "pointer",
                marginTop: 8,
              }}
            >
              BUILD THIS CONTENT
            </button>
          </div>
        )}

        {/* ═══ PHASE: GENERATING ══════════════════════════════════════════ */}
        {phase === "generating" && (
          <div style={{ textAlign: "center", padding: "80px 24px" }}>
            <div
              key={stageIdx}
              style={{
                fontSize: 32,
                fontFamily: "Bebas Neue, sans-serif",
                color: C.text,
                marginBottom: 16,
                animation: "fadeIn 0.4s ease",
              }}
            >
              {STAGE_MESSAGES[stageIdx]}
            </div>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", fontFamily: "Space Mono, monospace" }}>
              {elapsed}s elapsed
            </div>
            <div style={{ marginTop: 32, display: "flex", justifyContent: "center", gap: 6 }}>
              {[0, 1, 2].map(i => (
                <div key={i} style={{ width: 8, height: 8, borderRadius: "50%", background: i <= stageIdx ? C.cyan : C.border, transition: "background 0.3s" }} />
              ))}
            </div>
            <style>{`@keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: none; } }`}</style>
          </div>
        )}

        {/* ═══ PHASE: OUTPUT ══════════════════════════════════════════════ */}
        {phase === "output" && result && (
          <div style={{ maxWidth: 720 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
              <button onClick={reset} style={{ background: "transparent", border: `1px solid ${C.border}`, color: C.muted, borderRadius: 4, padding: "6px 12px", cursor: "pointer", fontSize: 12 }}>← New</button>
              <div style={{ fontSize: 24, fontFamily: "Bebas Neue, sans-serif", color: C.green }}>✓ READY</div>
            </div>

            {/* Clone Drop output */}
            {result.type === "clone_drop" && (
              <>
                {result.videoUrl && (
                  <video src={result.videoUrl} autoPlay muted loop playsInline controls
                    style={{ width: "100%", borderRadius: 8, marginBottom: 12, border: `1px solid ${C.border}` }} />
                )}
                {result.imageUrl && (
                  <img src={result.imageUrl} alt="Clone output"
                    style={{ width: "100%", borderRadius: 8, marginBottom: 16, border: `1px solid ${C.border}` }} />
                )}
                {result.captions && (
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 16 }}>
                    <CaptionCard label="HOOK" text={result.captions.hook} />
                    <CaptionCard label="CAPTION" text={result.captions.caption} />
                    <CaptionCard label="DM OPENER" text={result.captions.dmOpener} />
                    <CaptionCard label="PPV TEASER" text={result.captions.ppvTeaser} />
                  </div>
                )}
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                  <ActionBtn label="Post to Telegram" onClick={() => handlePostTelegram(result.videoUrl, result.imageUrl, result.captions?.caption)} disabled={postTelegramMut.isPending} />
                  <ActionBtn label="Save to Vault" onClick={() => handleSaveVault(result.videoUrl || result.imageUrl, result.videoUrl ? "video" : "image")} disabled={saveVaultMut.isPending} />
                  <ActionBtn label="Build Another" onClick={reset} />
                </div>
              </>
            )}

            {/* Platform Trailer output */}
            {result.type === "platform_trailer" && (
              <>
                {result.videoUrl && (
                  <video src={result.videoUrl} autoPlay muted loop playsInline controls
                    style={{ width: "100%", borderRadius: 8, marginBottom: 12, border: `1px solid ${C.border}` }} />
                )}
                {result.caption && <CaptionCard label="CAPTION" text={result.caption} />}
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 12 }}>
                  {result.videoUrl && <a href={result.videoUrl} download style={{ padding: "10px 18px", borderRadius: 6, border: `1px solid ${C.border}`, background: C.card, color: C.text, textDecoration: "none", fontSize: 13, fontWeight: 600 }}>Download</a>}
                  <ActionBtn label="Post to Telegram" onClick={() => handlePostTelegram(result.videoUrl, undefined, result.caption)} disabled={postTelegramMut.isPending} />
                  <ActionBtn label="Build Another" onClick={reset} />
                </div>
              </>
            )}

            {/* Social Post output */}
            {result.type === "social_post" && (
              <>
                {result.videoUrl && (
                  <video src={result.videoUrl} autoPlay muted loop playsInline controls
                    style={{ width: "100%", borderRadius: 8, marginBottom: 16, border: `1px solid ${C.border}` }} />
                )}
                {result.hook && (
                  <div style={{ fontSize: 22, fontFamily: "Bebas Neue, sans-serif", color: C.cyan, marginBottom: 10 }}>{result.hook}</div>
                )}
                {result.caption && (
                  <div style={{ fontSize: 15, color: C.text, fontFamily: "DM Sans, sans-serif", lineHeight: 1.6, marginBottom: 12 }}>{result.caption}</div>
                )}
                {result.hashtags && (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 16 }}>
                    {result.hashtags.map((h: string) => (
                      <span key={h} style={{ fontSize: 12, color: C.cyan, background: C.cyanDim, padding: "3px 10px", borderRadius: 12, fontFamily: "DM Sans, sans-serif" }}>#{h}</span>
                    ))}
                  </div>
                )}
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                  <CopyBtn text={`${result.hook}\n\n${result.caption}\n\n${(result.hashtags || []).map((h: string) => `#${h}`).join(" ")}`} />
                  <ActionBtn label="Post to Telegram" onClick={() => handlePostTelegram(result.videoUrl, undefined, `${result.hook}\n\n${result.caption}`)} disabled={postTelegramMut.isPending} />
                  <ActionBtn label="Build Another" onClick={reset} />
                </div>
              </>
            )}

            {/* Creator Campaign output */}
            {result.type === "creator_campaign" && (
              <>
                {result.videoUrl && (
                  <video src={result.videoUrl} autoPlay muted loop playsInline controls
                    style={{ width: "100%", borderRadius: 8, marginBottom: 16, border: `1px solid ${C.border}` }} />
                )}
                {result.campaignPack && (
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 16 }}>
                    <CaptionCard label="HEADLINE" text={result.campaignPack.headline} />
                    <CaptionCard label="TEASER CAPTION" text={result.campaignPack.teaserCaption} />
                    <CaptionCard label="DM SCRIPT" text={result.campaignPack.dmScript} />
                    <CaptionCard label="PPV UNLOCK LINE" text={result.campaignPack.ppvUnlockLine} />
                    <div style={{ gridColumn: "1 / -1" }}>
                      <CaptionCard label="TELEGRAM BLAST" text={result.campaignPack.telegramBlast} />
                    </div>
                  </div>
                )}
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                  <ActionBtn label="Post to Telegram" onClick={() => handlePostTelegram(result.videoUrl, undefined, result.campaignPack?.telegramBlast)} disabled={postTelegramMut.isPending} />
                  <ActionBtn label="Save to Vault" onClick={() => handleSaveVault(result.videoUrl, "video")} disabled={saveVaultMut.isPending} />
                  <ActionBtn label="Build Another" onClick={reset} />
                </div>
              </>
            )}

            {/* Telegram Blast output */}
            {result.type === "telegram_blast" && (
              <>
                {result.mediaUrl && (
                  <video src={result.mediaUrl} autoPlay muted loop playsInline controls
                    style={{ width: "100%", borderRadius: 8, marginBottom: 12, border: `1px solid ${C.border}` }} />
                )}
                <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, padding: 16, marginBottom: 12 }}>
                  {result.sent && (
                    <div style={{ fontSize: 10, color: C.green, fontFamily: "Space Mono, monospace", marginBottom: 8 }}>● SENT</div>
                  )}
                  <div style={{ fontSize: 15, color: C.text, fontFamily: "DM Sans, sans-serif", lineHeight: 1.6, whiteSpace: "pre-wrap" }}>{result.message}</div>
                  <div style={{ marginTop: 8, fontSize: 10, color: C.muted, fontFamily: "Space Mono, monospace" }}>{result.message?.length || 0} chars</div>
                </div>
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                  {!result.sent && (
                    <ActionBtn label="Send Now" onClick={() => handlePostTelegram(result.mediaUrl, undefined, result.message)} disabled={postTelegramMut.isPending} color={C.cyan} />
                  )}
                  <CopyBtn text={result.message} />
                  <ActionBtn label="Build Another" onClick={reset} />
                </div>
              </>
            )}

            {/* Custom output */}
            {result.type === "custom" && (
              <>
                {result.contentPlan && (
                  <div style={{ fontSize: 14, color: "rgba(255,255,255,0.6)", fontFamily: "DM Sans, sans-serif", marginBottom: 16, padding: "12px 14px", background: C.card, borderRadius: 6, border: `1px solid ${C.border}` }}>
                    {result.contentPlan}
                  </div>
                )}
                {result.videoUrl && (
                  <video src={result.videoUrl} autoPlay muted loop playsInline controls
                    style={{ width: "100%", borderRadius: 8, marginBottom: 16, border: `1px solid ${C.border}` }} />
                )}
                {result.copy && (
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 16 }}>
                    <CaptionCard label="HOOK" text={result.copy.hook} />
                    <CaptionCard label="CAPTION" text={result.copy.caption} />
                  </div>
                )}
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                  <ActionBtn label="Post to Telegram" onClick={() => handlePostTelegram(result.videoUrl, undefined, result.copy?.caption)} disabled={postTelegramMut.isPending} />
                  <ActionBtn label="Save to Vault" onClick={() => handleSaveVault(result.videoUrl, "video")} disabled={saveVaultMut.isPending} />
                  <ActionBtn label="Build Another" onClick={reset} />
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
