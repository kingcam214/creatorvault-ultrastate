/**
 * CONTENT FACTORY v3 — Rebuilt frontend
 * 7 content types, real creative brief forms, full output display
 */
import { useState, useCallback } from "react";
import { Link } from "wouter";
import { Crown, Zap, Film, Send, Layers, Copy, Download, Check, Loader2, ChevronRight, ArrowLeft, RefreshCw, Flame } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

const GOLD = "#F2B15B", GOLD_DIM = "rgba(242,177,91,0.10)", GOLD_BORDER = "rgba(242,177,91,0.3)";
const BG = "#080808", CARD = "#111", BORDER = "rgba(255,255,255,0.08)", MUTED = "rgba(255,255,255,0.45)";
const GREEN = "#00E676", CYAN = "#00BCD4";

type ContentTypeId = "clone_drop" | "clone_series" | "body_cinema_drop" | "social_post" | "creator_campaign" | "telegram_blast" | "custom";

const CONTENT_TYPES: { id: ContentTypeId; icon: string; label: string; desc: string; badge: string; color: string }[] = [
  { id: "clone_drop",       icon: "👑", label: "Clone Drop",       desc: "4 parallel KingCam images → animated → full copy suite", badge: "FLAGSHIP", color: GOLD },
  { id: "clone_series",     icon: "🎬", label: "Clone Series",     desc: "6-scene narrative arc: hook → build → reveal → CTA", badge: "NEW", color: "#E040FB" },
  { id: "body_cinema_drop", icon: "💎", label: "Body Cinema Drop", desc: "AI-enhanced body-specific cinematic generation", badge: "AI", color: "#FF4081" },
  { id: "social_post",      icon: "📱", label: "Social Post",      desc: "All 4 platforms simultaneously + image + video", badge: "MULTI", color: CYAN },
  { id: "creator_campaign", icon: "💰", label: "Creator Campaign", desc: "Full drop pack + DM sequence + auto-post to Telegram", badge: "AUTO", color: GREEN },
  { id: "telegram_blast",   icon: "⚡", label: "Telegram Blast",   desc: "A/B message variants + live send to channels", badge: "LIVE", color: "#FF6B35" },
  { id: "custom",           icon: "🧠", label: "Custom",           desc: "Describe anything — GPT-4o routes and executes", badge: "AI", color: "#7C4DFF" },
];

const BODY_FOCUSES = [
  { id: "abs", label: "Abs", emoji: "💪" }, { id: "waist", label: "Waist", emoji: "⏳" },
  { id: "butt", label: "Butt", emoji: "🍑" }, { id: "hips", label: "Hips", emoji: "💃" },
  { id: "legs", label: "Legs", emoji: "👠" }, { id: "thighs", label: "Thighs", emoji: "🔥" },
  { id: "chest", label: "Chest", emoji: "💎" }, { id: "back", label: "Back", emoji: "🖤" },
  { id: "lowerback", label: "Lower Back", emoji: "💫" }, { id: "face", label: "Face", emoji: "👄" },
  { id: "silhouette", label: "Silhouette", emoji: "✨" }, { id: "full", label: "Full Body", emoji: "🧍" },
];

const VIBES = [
  { id: "cinematic_heat", label: "Cinematic Heat", emoji: "🔥" },
  { id: "luxe_gold",      label: "Luxe Gold",      emoji: "✨" },
  { id: "neon_night",     label: "Neon Night",     emoji: "🌃" },
  { id: "noir_afterdark", label: "After Dark Noir",emoji: "🖤" },
  { id: "velvet_midnight",label: "Velvet Midnight",emoji: "🌙" },
];

const PLATFORMS = ["OnlyFans", "Telegram", "TikTok", "Instagram", "Twitter", "VaultX", "All"];

function CopyBlock({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => { navigator.clipboard.writeText(value); setCopied(true); setTimeout(() => setCopied(false), 1500); };
  return (
    <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 10, padding: "12px 14px", marginBottom: 8 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
        <span style={{ fontSize: 10, color: MUTED, fontFamily: "monospace", letterSpacing: "0.12em", textTransform: "uppercase" }}>{label}</span>
        <button onClick={copy} style={{ background: "transparent", border: "none", color: copied ? GREEN : MUTED, cursor: "pointer", display: "flex", alignItems: "center", gap: 4, fontSize: 12 }}>
          {copied ? <Check size={12} /> : <Copy size={12} />} {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <p style={{ fontSize: 13, color: "rgba(255,255,255,0.8)", margin: 0, lineHeight: 1.6, whiteSpace: "pre-wrap" }}>{value}</p>
    </div>
  );
}

function MediaOutput({ url, type }: { url: string; type: "image" | "video" }) {
  return (
    <div style={{ borderRadius: 12, overflow: "hidden", background: "#000", marginBottom: 12 }}>
      {type === "video"
        ? <video src={url} controls playsInline style={{ width: "100%", maxHeight: 400, display: "block" }} />
        : <img src={url} alt="Generated" style={{ width: "100%", maxHeight: 400, objectFit: "contain", display: "block" }} />
      }
      <a href={url} download style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "10px", background: CARD, color: MUTED, textDecoration: "none", fontSize: 13 }}>
        <Download size={14} /> Download
      </a>
    </div>
  );
}

export default function ContentCommand() {
  const [selectedType, setSelectedType] = useState<ContentTypeId>("clone_drop");
  const [phase, setPhase] = useState<"select" | "brief" | "generating" | "output">("select");
  const [result, setResult] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<"output" | "copy" | "distribute" | "history">("output");

  // Brief state
  const [scene, setScene] = useState("dark luxury throne room, dramatic spotlight, cinematic premium atmosphere");
  const [platform, setPlatform] = useState("OnlyFans");
  const [imageCount, setImageCount] = useState(4);
  const [withVoice, setWithVoice] = useState(false);
  const [bodyFocus, setBodyFocus] = useState("silhouette");
  const [vibe, setVibe] = useState("cinematic_heat");
  const [sourceImageUrl, setSourceImageUrl] = useState("");
  const [price, setPrice] = useState("29");
  const [topic, setTopic] = useState("");
  const [theme, setTheme] = useState("luxury empire");
  const [creatorName, setCreatorName] = useState("KingCam");
  const [ppvPrice, setPpvPrice] = useState("29");
  const [autoPost, setAutoPost] = useState(false);
  const [message, setMessage] = useState("");
  const [abTest, setAbTest] = useState(true);
  const [channels, setChannels] = useState<string[]>(["kingcam"]);
  const [customDesc, setCustomDesc] = useState("");

  const generateMut = (trpc as any).contentCommand.generateContent.useMutation();
  const postMut = (trpc as any).contentCommand.postToTelegram.useMutation();
  const saveMut = (trpc as any).contentCommand.saveToVault.useMutation();
  const historyQ = (trpc as any).contentCommand.getHistory.useQuery({ limit: 10 }, { retry: false });

  const getBrief = () => {
    switch (selectedType) {
      case "clone_drop": return { scene, platform, imageCount, withVoice };
      case "clone_series": return { theme, platform };
      case "body_cinema_drop": return { bodyFocus, vibe, sourceImageUrl, price };
      case "social_post": return { topic: topic || scene, platform, price };
      case "creator_campaign": return { creatorName, contentType: "Video", ppvPrice, platforms: [platform, "Telegram"], autoPost };
      case "telegram_blast": return { message: message || scene, channels, abTest, mediaType: "text" };
      case "custom": return { description: customDesc };
      default: return {};
    }
  };

  const handleGenerate = useCallback(async () => {
    setPhase("generating");
    try {
      const res = await generateMut.mutateAsync({ contentType: selectedType, brief: getBrief() });
      setResult(res);
      setPhase("output");
      setActiveTab("output");
      toast.success("Content ready ✓");
    } catch (e: any) {
      toast.error(e?.message || "Generation failed");
      setPhase("brief");
    }
  }, [selectedType, scene, platform, imageCount, withVoice, bodyFocus, vibe, sourceImageUrl, price, topic, theme, creatorName, ppvPrice, autoPost, message, abTest, channels, customDesc]);

  const handlePost = async (channel: "kingcam" | "owner" | "both") => {
    if (!result) return;
    const caption = result.copySuite?.telegramBlast || result.campaignPack?.telegramBlast || result.messageA || result.plan?.copyPack?.telegramBlast || "";
    const videoUrl = result.videoUrl || undefined;
    const imageUrl = result.imageUrl || result.primaryImage || undefined;
    try {
      const r = await postMut.mutateAsync({ channel, caption, mediaUrl: videoUrl || imageUrl, isVideo: !!videoUrl });
      toast.success(`Posted to ${r.totalSent} channel(s) ✓`);
    } catch (e: any) { toast.error(e?.message || "Post failed"); }
  };

  const handleSave = async (url: string, type: "video" | "image") => {
    try {
      await saveMut.mutateAsync({ url, assetType: type, contentType: selectedType });
      toast.success("Saved to Vault ✓");
    } catch (e: any) { toast.error(e?.message || "Save failed"); }
  };

  const selectedTypeInfo = CONTENT_TYPES.find(t => t.id === selectedType);

  return (
    <div style={{ minHeight: "100vh", background: BG, color: "#fff", fontFamily: "DM Sans, sans-serif", paddingBottom: 120 }}>
      <div style={{ position: "sticky", top: 0, zIndex: 50, background: "rgba(8,8,8,0.96)", borderBottom: `1px solid ${BORDER}`, backdropFilter: "blur(12px)" }}>
        <div style={{ maxWidth: 900, margin: "0 auto", padding: "12px 16px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {phase !== "select" && (
              <button onClick={() => setPhase("select")} style={{ background: "transparent", border: "none", color: MUTED, cursor: "pointer", display: "flex", alignItems: "center", gap: 4, fontSize: 13 }}>
                <ArrowLeft size={16} /> Back
              </button>
            )}
            <span style={{ fontFamily: "Bebas Neue, sans-serif", fontSize: 20 }}>👑 Content Factory</span>
          </div>
          {phase === "output" && (
            <div style={{ display: "flex", gap: 6 }}>
              {(["output", "copy", "distribute", "history"] as const).map(tab => (
                <button key={tab} onClick={() => setActiveTab(tab)} style={{ padding: "6px 10px", borderRadius: 8, border: `1px solid ${activeTab === tab ? GOLD : BORDER}`, background: activeTab === tab ? GOLD_DIM : "transparent", color: activeTab === tab ? GOLD : MUTED, fontSize: 11, fontWeight: 700, cursor: "pointer", textTransform: "capitalize" }}>{tab}</button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div style={{ maxWidth: 900, margin: "0 auto", padding: "20px 16px" }}>

        {phase === "select" && (
          <div>
            <p style={{ fontSize: 11, color: GOLD, fontFamily: "monospace", letterSpacing: "0.18em", textTransform: "uppercase", marginBottom: 6 }}>KingCam Content Factory</p>
            <h1 style={{ fontSize: 32, fontFamily: "Bebas Neue, sans-serif", margin: "0 0 6px" }}>What are we building?</h1>
            <p style={{ fontSize: 14, color: MUTED, marginBottom: 20 }}>7 content pipelines. Each one fires real AI, generates real media, and produces copy ready to post.</p>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 10 }}>
              {CONTENT_TYPES.map(ct => (
                <button key={ct.id} onClick={() => { setSelectedType(ct.id); setPhase("brief"); }} style={{ display: "flex", alignItems: "center", gap: 12, textAlign: "left", background: CARD, border: `1px solid ${BORDER}`, borderRadius: 14, padding: "16px", cursor: "pointer" }}>
                  <span style={{ fontSize: 28, flexShrink: 0 }}>{ct.icon}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                      <span style={{ fontSize: 15, fontWeight: 800 }}>{ct.label}</span>
                      <span style={{ fontSize: 9, fontWeight: 900, color: ct.color, background: `${ct.color}18`, padding: "2px 6px", borderRadius: 5, letterSpacing: "0.06em" }}>{ct.badge}</span>
                    </div>
                    <p style={{ fontSize: 12, color: MUTED, margin: 0, lineHeight: 1.4 }}>{ct.desc}</p>
                  </div>
                  <ChevronRight size={16} color={MUTED} />
                </button>
              ))}
            </div>
            {historyQ.data && historyQ.data.length > 0 && (
              <div style={{ marginTop: 24 }}>
                <p style={{ fontSize: 11, color: MUTED, fontFamily: "monospace", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 10 }}>Recent Generations</p>
                <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 4 }}>
                  {historyQ.data.slice(0, 6).map((h: any) => (
                    <button key={h.id} onClick={() => { setResult(h.outputs); setSelectedType(h.contentType); setPhase("output"); setActiveTab("output"); }} style={{ flexShrink: 0, background: CARD, border: `1px solid ${BORDER}`, borderRadius: 10, padding: "10px 14px", cursor: "pointer", textAlign: "left" }}>
                      <p style={{ fontSize: 10, color: CYAN, fontFamily: "monospace", margin: "0 0 3px", textTransform: "uppercase" }}>{h.contentType.replace(/_/g, " ")}</p>
                      <p style={{ fontSize: 12, color: "#ddd", margin: 0 }}>{new Date(h.createdAt).toLocaleDateString()}</p>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {phase === "brief" && (
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
              <span style={{ fontSize: 28 }}>{selectedTypeInfo?.icon}</span>
              <div>
                <h2 style={{ fontSize: 26, fontFamily: "Bebas Neue, sans-serif", margin: 0 }}>{selectedTypeInfo?.label}</h2>
                <p style={{ fontSize: 13, color: MUTED, margin: 0 }}>{selectedTypeInfo?.desc}</p>
              </div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {selectedType === "clone_drop" && (
                <>
                  <div>
                    <label style={{ fontSize: 11, color: MUTED, fontFamily: "monospace", letterSpacing: "0.12em", textTransform: "uppercase", display: "block", marginBottom: 6 }}>Scene Description</label>
                    <textarea value={scene} onChange={e => setScene(e.target.value)} rows={3} style={{ width: "100%", background: CARD, border: `1px solid ${BORDER}`, borderRadius: 10, color: "#fff", fontSize: 14, padding: "12px 14px", outline: "none", resize: "vertical", boxSizing: "border-box" }} placeholder="dark luxury throne room, dramatic spotlight..." />
                  </div>
                  <div>
                    <label style={{ fontSize: 11, color: MUTED, fontFamily: "monospace", letterSpacing: "0.12em", textTransform: "uppercase", display: "block", marginBottom: 6 }}>Platform</label>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                      {PLATFORMS.map(p => <button key={p} onClick={() => setPlatform(p)} style={{ padding: "7px 14px", borderRadius: 8, border: `1px solid ${platform === p ? GOLD : BORDER}`, background: platform === p ? GOLD_DIM : "transparent", color: platform === p ? GOLD : MUTED, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>{p}</button>)}
                    </div>
                  </div>
                  <div>
                    <label style={{ fontSize: 11, color: MUTED, fontFamily: "monospace", letterSpacing: "0.12em", textTransform: "uppercase", display: "block", marginBottom: 6 }}>Images to Generate</label>
                    <div style={{ display: "flex", gap: 8 }}>
                      {[1, 2, 4].map(n => <button key={n} onClick={() => setImageCount(n)} style={{ padding: "8px 20px", borderRadius: 8, border: `1px solid ${imageCount === n ? GOLD : BORDER}`, background: imageCount === n ? GOLD_DIM : "transparent", color: imageCount === n ? GOLD : MUTED, fontSize: 14, fontWeight: 700, cursor: "pointer" }}>{n}</button>)}
                    </div>
                  </div>
                  <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}>
                    <input type="checkbox" checked={withVoice} onChange={e => setWithVoice(e.target.checked)} style={{ accentColor: GOLD, width: 16, height: 16 }} />
                    <span style={{ fontSize: 14, color: "#ddd" }}>Generate KingCam voiceover (ElevenLabs)</span>
                  </label>
                </>
              )}
              {selectedType === "clone_series" && (
                <>
                  <div>
                    <label style={{ fontSize: 11, color: MUTED, fontFamily: "monospace", letterSpacing: "0.12em", textTransform: "uppercase", display: "block", marginBottom: 6 }}>Series Theme</label>
                    <input value={theme} onChange={e => setTheme(e.target.value)} style={{ width: "100%", background: CARD, border: `1px solid ${BORDER}`, borderRadius: 10, color: "#fff", fontSize: 14, padding: "12px 14px", outline: "none", boxSizing: "border-box" }} placeholder="luxury empire, street king, penthouse life..." />
                  </div>
                  <div>
                    <label style={{ fontSize: 11, color: MUTED, fontFamily: "monospace", letterSpacing: "0.12em", textTransform: "uppercase", display: "block", marginBottom: 6 }}>Platform</label>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                      {PLATFORMS.map(p => <button key={p} onClick={() => setPlatform(p)} style={{ padding: "7px 14px", borderRadius: 8, border: `1px solid ${platform === p ? GOLD : BORDER}`, background: platform === p ? GOLD_DIM : "transparent", color: platform === p ? GOLD : MUTED, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>{p}</button>)}
                    </div>
                  </div>
                  <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 10, padding: "12px 14px" }}>
                    <p style={{ fontSize: 13, color: MUTED, margin: 0 }}>GPT-4o writes a 6-scene arc (hook → intrigue → build → peak → tease → CTA), generates all 6 images, and animates scenes 1 and 4.</p>
                  </div>
                </>
              )}
              {selectedType === "body_cinema_drop" && (
                <>
                  <div>
                    <label style={{ fontSize: 11, color: MUTED, fontFamily: "monospace", letterSpacing: "0.12em", textTransform: "uppercase", display: "block", marginBottom: 6 }}>Body Focus</label>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(90px, 1fr))", gap: 6 }}>
                      {BODY_FOCUSES.map(f => (
                        <button key={f.id} onClick={() => setBodyFocus(f.id)} style={{ padding: "8px 6px", borderRadius: 8, border: `1px solid ${bodyFocus === f.id ? "#FF4081" : BORDER}`, background: bodyFocus === f.id ? "rgba(255,64,129,0.12)" : "transparent", color: bodyFocus === f.id ? "#FF4081" : MUTED, fontSize: 12, fontWeight: 700, cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
                          <span style={{ fontSize: 18 }}>{f.emoji}</span>{f.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label style={{ fontSize: 11, color: MUTED, fontFamily: "monospace", letterSpacing: "0.12em", textTransform: "uppercase", display: "block", marginBottom: 6 }}>Cinematic Vibe</label>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                      {VIBES.map(v => <button key={v.id} onClick={() => setVibe(v.id)} style={{ padding: "7px 12px", borderRadius: 8, border: `1px solid ${vibe === v.id ? "#FF4081" : BORDER}`, background: vibe === v.id ? "rgba(255,64,129,0.12)" : "transparent", color: vibe === v.id ? "#FF4081" : MUTED, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>{v.emoji} {v.label}</button>)}
                    </div>
                  </div>
                  <div>
                    <label style={{ fontSize: 11, color: MUTED, fontFamily: "monospace", letterSpacing: "0.12em", textTransform: "uppercase", display: "block", marginBottom: 6 }}>Source Image URL (optional)</label>
                    <input value={sourceImageUrl} onChange={e => setSourceImageUrl(e.target.value)} style={{ width: "100%", background: CARD, border: `1px solid ${BORDER}`, borderRadius: 10, color: "#fff", fontSize: 14, padding: "12px 14px", outline: "none", boxSizing: "border-box" }} placeholder="https://... (leave blank to generate)" />
                  </div>
                  <div>
                    <label style={{ fontSize: 11, color: MUTED, fontFamily: "monospace", letterSpacing: "0.12em", textTransform: "uppercase", display: "block", marginBottom: 6 }}>PPV Price ($)</label>
                    <div style={{ display: "flex", gap: 6 }}>
                      {["15", "19", "25", "29", "35", "49"].map(p => <button key={p} onClick={() => setPrice(p)} style={{ padding: "8px 14px", borderRadius: 8, border: `1px solid ${price === p ? GOLD : BORDER}`, background: price === p ? GOLD_DIM : "transparent", color: price === p ? GOLD : MUTED, fontSize: 14, fontWeight: 700, cursor: "pointer" }}>${p}</button>)}
                    </div>
                  </div>
                </>
              )}
              {selectedType === "social_post" && (
                <>
                  <div>
                    <label style={{ fontSize: 11, color: MUTED, fontFamily: "monospace", letterSpacing: "0.12em", textTransform: "uppercase", display: "block", marginBottom: 6 }}>Topic / Hook</label>
                    <input value={topic} onChange={e => setTopic(e.target.value)} style={{ width: "100%", background: CARD, border: `1px solid ${BORDER}`, borderRadius: 10, color: "#fff", fontSize: 14, padding: "12px 14px", outline: "none", boxSizing: "border-box" }} placeholder="luxury lifestyle, new drop, behind the scenes..." />
                  </div>
                  <div>
                    <label style={{ fontSize: 11, color: MUTED, fontFamily: "monospace", letterSpacing: "0.12em", textTransform: "uppercase", display: "block", marginBottom: 6 }}>Platform Focus</label>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                      {PLATFORMS.map(p => <button key={p} onClick={() => setPlatform(p)} style={{ padding: "7px 14px", borderRadius: 8, border: `1px solid ${platform === p ? GOLD : BORDER}`, background: platform === p ? GOLD_DIM : "transparent", color: platform === p ? GOLD : MUTED, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>{p}</button>)}
                    </div>
                  </div>
                </>
              )}
              {selectedType === "creator_campaign" && (
                <>
                  <div>
                    <label style={{ fontSize: 11, color: MUTED, fontFamily: "monospace", letterSpacing: "0.12em", textTransform: "uppercase", display: "block", marginBottom: 6 }}>Creator Name</label>
                    <input value={creatorName} onChange={e => setCreatorName(e.target.value)} style={{ width: "100%", background: CARD, border: `1px solid ${BORDER}`, borderRadius: 10, color: "#fff", fontSize: 14, padding: "12px 14px", outline: "none", boxSizing: "border-box" }} placeholder="KingCam" />
                  </div>
                  <div>
                    <label style={{ fontSize: 11, color: MUTED, fontFamily: "monospace", letterSpacing: "0.12em", textTransform: "uppercase", display: "block", marginBottom: 6 }}>PPV Price ($)</label>
                    <div style={{ display: "flex", gap: 6 }}>
                      {["19", "25", "29", "35", "49", "99"].map(p => <button key={p} onClick={() => setPpvPrice(p)} style={{ padding: "8px 14px", borderRadius: 8, border: `1px solid ${ppvPrice === p ? GOLD : BORDER}`, background: ppvPrice === p ? GOLD_DIM : "transparent", color: ppvPrice === p ? GOLD : MUTED, fontSize: 14, fontWeight: 700, cursor: "pointer" }}>${p}</button>)}
                    </div>
                  </div>
                  <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}>
                    <input type="checkbox" checked={autoPost} onChange={e => setAutoPost(e.target.checked)} style={{ accentColor: GOLD, width: 16, height: 16 }} />
                    <span style={{ fontSize: 14, color: "#ddd" }}>Auto-post teaser to Telegram on generation</span>
                  </label>
                </>
              )}
              {selectedType === "telegram_blast" && (
                <>
                  <div>
                    <label style={{ fontSize: 11, color: MUTED, fontFamily: "monospace", letterSpacing: "0.12em", textTransform: "uppercase", display: "block", marginBottom: 6 }}>Message Topic</label>
                    <textarea value={message} onChange={e => setMessage(e.target.value)} rows={3} style={{ width: "100%", background: CARD, border: `1px solid ${BORDER}`, borderRadius: 10, color: "#fff", fontSize: 14, padding: "12px 14px", outline: "none", resize: "vertical", boxSizing: "border-box" }} placeholder="New drop just landed. Link in bio." />
                  </div>
                  <div>
                    <label style={{ fontSize: 11, color: MUTED, fontFamily: "monospace", letterSpacing: "0.12em", textTransform: "uppercase", display: "block", marginBottom: 6 }}>Send To</label>
                    <div style={{ display: "flex", gap: 6 }}>
                      {["kingcam", "owner"].map(ch => (
                        <button key={ch} onClick={() => setChannels(prev => prev.includes(ch) ? prev.filter(c => c !== ch) : [...prev, ch])} style={{ padding: "8px 16px", borderRadius: 8, border: `1px solid ${channels.includes(ch) ? GOLD : BORDER}`, background: channels.includes(ch) ? GOLD_DIM : "transparent", color: channels.includes(ch) ? GOLD : MUTED, fontSize: 13, fontWeight: 700, cursor: "pointer", textTransform: "capitalize" }}>{ch}</button>
                      ))}
                    </div>
                  </div>
                  <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}>
                    <input type="checkbox" checked={abTest} onChange={e => setAbTest(e.target.checked)} style={{ accentColor: GOLD, width: 16, height: 16 }} />
                    <span style={{ fontSize: 14, color: "#ddd" }}>Generate A/B message variants</span>
                  </label>
                </>
              )}
              {selectedType === "custom" && (
                <div>
                  <label style={{ fontSize: 11, color: MUTED, fontFamily: "monospace", letterSpacing: "0.12em", textTransform: "uppercase", display: "block", marginBottom: 6 }}>Describe What You Want</label>
                  <textarea value={customDesc} onChange={e => setCustomDesc(e.target.value)} rows={5} style={{ width: "100%", background: CARD, border: `1px solid ${BORDER}`, borderRadius: 10, color: "#fff", fontSize: 14, padding: "12px 14px", outline: "none", resize: "vertical", boxSizing: "border-box" }} placeholder="Describe exactly what you want. GPT-4o analyzes the request, routes to the correct pipeline, and executes multi-step generation." />
                  <p style={{ fontSize: 12, color: MUTED, marginTop: 6 }}>GPT-4o will write the creative plan, generate images, animate, and produce copy — all in one shot.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {phase === "generating" && (
          <div style={{ textAlign: "center", padding: "60px 20px" }}>
            <div style={{ width: 64, height: 64, borderRadius: "50%", background: GOLD_DIM, border: `2px solid ${GOLD_BORDER}`, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px" }}>
              <Loader2 size={28} color={GOLD} style={{ animation: "spin 1s linear infinite" }} />
            </div>
            <h2 style={{ fontSize: 28, fontFamily: "Bebas Neue, sans-serif", margin: "0 0 8px" }}>Generating {selectedTypeInfo?.label}...</h2>
            <p style={{ fontSize: 14, color: MUTED, maxWidth: 400, margin: "0 auto" }}>
              {selectedType === "clone_drop" && "Firing Replicate in parallel → animating with Pollo → generating full copy suite..."}
              {selectedType === "clone_series" && "GPT-4o writing 6-scene arc → generating all 6 images → animating hook and peak..."}
              {selectedType === "body_cinema_drop" && "GPT-4o enhancing scene → generating image → animating with body-specific camera..."}
              {selectedType === "social_post" && "Generating image → animating → writing copy for all 4 platforms..."}
              {selectedType === "creator_campaign" && "Writing full campaign pack → generating image → animating → posting to Telegram..."}
              {selectedType === "telegram_blast" && "Writing A/B message variants → sending to channels..."}
              {selectedType === "custom" && "GPT-4o analyzing request → routing to pipeline → executing multi-step generation..."}
            </p>
            <style>{`@keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}`}</style>
          </div>
        )}

        {phase === "output" && result && (
          <div>
            {activeTab === "output" && (
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
                  <Check size={20} color={GREEN} />
                  <h2 style={{ fontSize: 22, fontFamily: "Bebas Neue, sans-serif", margin: 0 }}>{selectedTypeInfo?.label} — Ready</h2>
                </div>
                {result.videoUrl && <MediaOutput url={result.videoUrl} type="video" />}
                {result.hookVideo && !result.videoUrl && <MediaOutput url={result.hookVideo} type="video" />}
                {result.imageUrl && !result.videoUrl && <MediaOutput url={result.imageUrl} type="image" />}
                {result.primaryImage && !result.imageUrl && !result.videoUrl && <MediaOutput url={result.primaryImage} type="image" />}
                {result.images && result.images.length > 1 && (
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))", gap: 8, marginBottom: 12 }}>
                    {result.images.map((url: string, i: number) => (
                      <div key={i} style={{ borderRadius: 8, overflow: "hidden", position: "relative" }}>
                        <img src={url} alt={`Image ${i + 1}`} style={{ width: "100%", aspectRatio: "3/4", objectFit: "cover", display: "block" }} />
                        <a href={url} download style={{ position: "absolute", bottom: 4, right: 4, background: "rgba(0,0,0,0.7)", borderRadius: 6, padding: "4px 6px", color: "#fff", textDecoration: "none", fontSize: 10 }}>↓</a>
                      </div>
                    ))}
                  </div>
                )}
                {result.scenes && (
                  <div style={{ marginBottom: 16 }}>
                    <p style={{ fontSize: 11, color: MUTED, fontFamily: "monospace", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 10 }}>6-Scene Series</p>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: 8 }}>
                      {result.scenes.map((s: any) => (
                        <div key={s.id} style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 10, overflow: "hidden" }}>
                          {s.imageUrl && <img src={s.imageUrl} alt={s.name} style={{ width: "100%", aspectRatio: "3/4", objectFit: "cover", display: "block" }} />}
                          <div style={{ padding: "8px 10px" }}>
                            <p style={{ fontSize: 11, fontWeight: 800, margin: "0 0 3px", color: GOLD }}>Scene {s.id}: {s.name}</p>
                            <p style={{ fontSize: 10, color: MUTED, margin: 0, lineHeight: 1.4 }}>{s.caption}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {(result.copySuite?.hook || result.campaignPack?.headline || result.plan?.copyPack?.hook || result.messageA) && (
                  <CopyBlock label="Primary Hook" value={result.copySuite?.hook || result.campaignPack?.headline || result.plan?.copyPack?.hook || result.messageA || ""} />
                )}
              </div>
            )}

            {activeTab === "copy" && (
              <div>
                <h3 style={{ fontSize: 20, fontFamily: "Bebas Neue, sans-serif", margin: "0 0 14px" }}>Full Copy Suite</h3>
                {result.copySuite && (
                  <>
                    <CopyBlock label="Hook" value={result.copySuite.hook || ""} />
                    <CopyBlock label="Caption" value={result.copySuite.caption || ""} />
                    <CopyBlock label="Telegram Blast" value={result.copySuite.telegramBlast || ""} />
                    <CopyBlock label="TikTok Hook" value={result.copySuite.tiktokHook || ""} />
                    <CopyBlock label="Instagram Caption" value={result.copySuite.instagramCaption || ""} />
                    <CopyBlock label="Twitter Post" value={result.copySuite.twitterPost || ""} />
                    <CopyBlock label="DM Opener" value={result.copySuite.dmOpener || ""} />
                    <CopyBlock label="PPV Teaser" value={result.copySuite.ppvTeaser || ""} />
                    <CopyBlock label="Urgency Line" value={result.copySuite.urgencyLine || ""} />
                    <CopyBlock label="Pricing Anchor" value={result.copySuite.pricingAnchor || ""} />
                    {result.copySuite.hookVariants?.map((v: string, i: number) => <CopyBlock key={i} label={`Hook Variant ${i + 1}`} value={v} />)}
                  </>
                )}
                {result.campaignPack && (
                  <>
                    <CopyBlock label="Headline" value={result.campaignPack.headline || ""} />
                    <CopyBlock label="Teaser Caption" value={result.campaignPack.teaserCaption || ""} />
                    <CopyBlock label="Telegram Blast" value={result.campaignPack.telegramBlast || ""} />
                    <CopyBlock label="Twitter Teaser" value={result.campaignPack.twitterTeaser || ""} />
                    <CopyBlock label="Instagram Caption" value={result.campaignPack.instagramCaption || ""} />
                    <CopyBlock label="PPV Unlock Line" value={result.campaignPack.ppvUnlockLine || ""} />
                    <CopyBlock label="Pricing Anchor" value={result.campaignPack.pricingAnchor || ""} />
                    <CopyBlock label="Urgency Line" value={result.campaignPack.urgencyLine || ""} />
                    {result.campaignPack.dmSequence?.map((msg: string, i: number) => <CopyBlock key={i} label={`DM ${i + 1}`} value={msg} />)}
                    {result.campaignPack.hookVariants?.map((v: string, i: number) => <CopyBlock key={i} label={`Hook Variant ${i + 1}`} value={v} />)}
                  </>
                )}
                {result.plan?.copyPack && (
                  <>
                    <CopyBlock label="Hook" value={result.plan.copyPack.hook || ""} />
                    <CopyBlock label="Caption" value={result.plan.copyPack.caption || ""} />
                    <CopyBlock label="Telegram Blast" value={result.plan.copyPack.telegramBlast || ""} />
                    <CopyBlock label="DM Opener" value={result.plan.copyPack.dmOpener || ""} />
                    <CopyBlock label="PPV Teaser" value={result.plan.copyPack.ppvTeaser || ""} />
                    {result.plan.recommendations?.map((r: string, i: number) => (
                      <div key={i} style={{ display: "flex", gap: 8, marginBottom: 6 }}><span style={{ color: GOLD }}>→</span><span style={{ fontSize: 13, color: "rgba(255,255,255,0.7)" }}>{r}</span></div>
                    ))}
                  </>
                )}
                {result.messageA && <CopyBlock label="Message A" value={result.messageA} />}
                {result.messageB && <CopyBlock label="Message B (A/B)" value={result.messageB} />}
              </div>
            )}

            {activeTab === "distribute" && (
              <div>
                <h3 style={{ fontSize: 20, fontFamily: "Bebas Neue, sans-serif", margin: "0 0 14px" }}>Distribute</h3>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  <button onClick={() => handlePost("kingcam")} style={{ display: "flex", alignItems: "center", gap: 10, padding: "14px 16px", borderRadius: 12, border: `1px solid ${BORDER}`, background: CARD, color: "#fff", cursor: "pointer", fontSize: 14, fontWeight: 700 }}>
                    <Send size={18} color={CYAN} /> Post to KingCam Channel
                  </button>
                  <button onClick={() => handlePost("owner")} style={{ display: "flex", alignItems: "center", gap: 10, padding: "14px 16px", borderRadius: 12, border: `1px solid ${BORDER}`, background: CARD, color: "#fff", cursor: "pointer", fontSize: 14, fontWeight: 700 }}>
                    <Send size={18} color={GOLD} /> Post to Owner DMs
                  </button>
                  <button onClick={() => handlePost("both")} style={{ display: "flex", alignItems: "center", gap: 10, padding: "14px 16px", borderRadius: 12, border: `1px solid ${GOLD_BORDER}`, background: GOLD_DIM, color: GOLD, cursor: "pointer", fontSize: 14, fontWeight: 900 }}>
                    <Zap size={18} /> DISTRIBUTE TO ALL
                  </button>
                  {(result.videoUrl || result.imageUrl || result.primaryImage) && (
                    <button onClick={() => handleSave(result.videoUrl || result.imageUrl || result.primaryImage, result.videoUrl ? "video" : "image")} style={{ display: "flex", alignItems: "center", gap: 10, padding: "14px 16px", borderRadius: 12, border: `1px solid ${BORDER}`, background: CARD, color: "#fff", cursor: "pointer", fontSize: 14, fontWeight: 700 }}>
                      <Layers size={18} color={GREEN} /> Save to Vault
                    </button>
                  )}
                  <Link href="/vaultx/drop" style={{ display: "flex", alignItems: "center", gap: 10, padding: "14px 16px", borderRadius: 12, border: `1px solid ${GOLD_BORDER}`, background: "transparent", color: GOLD, textDecoration: "none", fontSize: 14, fontWeight: 700 }}>
                    <Film size={18} /> Turn into a Paid Drop →
                  </Link>
                </div>
              </div>
            )}

            {activeTab === "history" && (
              <div>
                <h3 style={{ fontSize: 20, fontFamily: "Bebas Neue, sans-serif", margin: "0 0 14px" }}>Generation History</h3>
                {historyQ.data?.map((h: any) => (
                  <button key={h.id} onClick={() => { setResult(h.outputs); setSelectedType(h.contentType); setActiveTab("output"); }} style={{ display: "flex", alignItems: "center", gap: 12, width: "100%", background: CARD, border: `1px solid ${BORDER}`, borderRadius: 12, padding: "12px 14px", cursor: "pointer", marginBottom: 8, textAlign: "left" }}>
                    <span style={{ fontSize: 22 }}>{CONTENT_TYPES.find(t => t.id === h.contentType)?.icon || "📄"}</span>
                    <div style={{ flex: 1 }}>
                      <p style={{ fontSize: 13, fontWeight: 800, margin: "0 0 2px", textTransform: "capitalize" }}>{h.contentType.replace(/_/g, " ")}</p>
                      <p style={{ fontSize: 11, color: MUTED, margin: 0 }}>{new Date(h.createdAt).toLocaleString()}</p>
                    </div>
                    <RefreshCw size={14} color={MUTED} />
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {phase === "brief" && (
        <div style={{ position: "fixed", inset: "auto 0 0 0", zIndex: 50, background: "rgba(8,8,8,0.96)", borderTop: `1px solid ${BORDER}`, backdropFilter: "blur(12px)", padding: "12px 16px" }}>
          <div style={{ maxWidth: 900, margin: "0 auto" }}>
            <button onClick={handleGenerate} disabled={generateMut.isPending} style={{ width: "100%", padding: "16px", borderRadius: 12, background: GOLD, color: "#000", fontSize: 17, fontWeight: 900, fontFamily: "Bebas Neue, sans-serif", letterSpacing: "0.08em", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
              <Flame size={18} /> BUILD THIS CONTENT
            </button>
          </div>
        </div>
      )}

      {phase === "output" && (
        <div style={{ position: "fixed", inset: "auto 0 0 0", zIndex: 50, background: "rgba(8,8,8,0.96)", borderTop: `1px solid ${BORDER}`, backdropFilter: "blur(12px)", padding: "12px 16px" }}>
          <div style={{ maxWidth: 900, margin: "0 auto", display: "flex", gap: 8 }}>
            <button onClick={() => { setPhase("select"); setResult(null); }} style={{ flex: 1, padding: "14px", borderRadius: 12, border: `1px solid ${BORDER}`, background: "transparent", color: MUTED, fontSize: 14, fontWeight: 700, cursor: "pointer" }}>New Content</button>
            <button onClick={() => setPhase("brief")} style={{ flex: 1, padding: "14px", borderRadius: 12, border: `1px solid ${GOLD_BORDER}`, background: GOLD_DIM, color: GOLD, fontSize: 14, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
              <RefreshCw size={14} /> Regenerate
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
