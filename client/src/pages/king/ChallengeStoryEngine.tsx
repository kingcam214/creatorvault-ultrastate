import { useMemo, useState } from "react";
import { trpc } from "@/lib/trpc";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";
import { Trophy, ChevronLeft, Zap, Send, RefreshCw, CheckCircle, CreditCard, ShieldCheck, Megaphone } from "lucide-react";

const POST_TYPES = [
  { key: "daily_update", label: "Daily Update", desc: "Current progress toward the live-payment goal", color: "#C9A84C" },
  { key: "milestone", label: "Milestone Post", desc: "Celebrate a proved revenue movement", color: "#27AE60" },
  { key: "countdown", label: "Countdown Trailer", desc: "Push urgency into the paid offer", color: "#E74C3C" },
  { key: "torment_thread", label: "Torment Thread", desc: "Viral pressure and public accountability", color: "#9B59B6" },
  { key: "victory", label: "Victory Trailer", desc: "Use only after live revenue proves the win", color: "#F39C12" },
  { key: "recap", label: "Weekly Recap", desc: "Seven-day challenge proof summary", color: "#00D9FF" },
];

type OfferSlug = "agent-challenge-entry" | "vaultx-agent-revenue-pack" | "operator-proof-sprint";

const OFFER_CARDS: Array<{ slug: OfferSlug; name: string; price: string; promise: string; cta: string }> = [
  {
    slug: "agent-challenge-entry",
    name: "AI Agent Challenge Entry",
    price: "$29",
    promise: "Join the challenge proof feed and unlock the entry-level revenue sprint.",
    cta: "Enter Challenge",
  },
  {
    slug: "vaultx-agent-revenue-pack",
    name: "VaultX Agent Revenue Pack",
    price: "$49",
    promise: "Buy the VaultX challenge pack tied to agent drops, proof tracking, and today’s revenue push.",
    cta: "Buy Revenue Pack",
  },
  {
    slug: "operator-proof-sprint",
    name: "Operator Proof Sprint",
    price: "$97",
    promise: "Premium sprint access for buyers who want the operator-grade challenge workflow and proof layer.",
    cta: "Start Proof Sprint",
  },
];

function getInitialOffer(): OfferSlug {
  if (typeof window === "undefined") return "agent-challenge-entry";
  const offer = new URLSearchParams(window.location.search).get("offer") as OfferSlug | null;
  return OFFER_CARDS.some((card) => card.slug === offer) ? offer! : "agent-challenge-entry";
}

function getQueryValue(key: string): string {
  if (typeof window === "undefined") return "";
  return new URLSearchParams(window.location.search).get(key) || "";
}

export function ChallengeStoryEngine() {
  const { toast } = useToast();
  const [postType, setPostType] = useState("daily_update");
  const [channel, setChannel] = useState("");
  const [generatedContent, setGeneratedContent] = useState<any>(null);
  const [selectedOffer, setSelectedOffer] = useState<OfferSlug>(getInitialOffer());
  const [buyerEmail, setBuyerEmail] = useState("");

  const checkoutStatus = getQueryValue("checkout");
  const source = getQueryValue("source") || "public_challenge_offer";
  const sessionId = getQueryValue("session_id");

  const { data: challenge } = (trpc.challengeAutomation as any)?.getActiveChallenge?.useQuery?.() || { data: null };
  const { data: channels } = (trpc.telegramHub as any)?.getChannels?.useQuery?.() || { data: null };

  const generate = (trpc.challengeAutomation as any)?.generateChallengePost?.useMutation?.({
    onSuccess: (d: any) => {
      setGeneratedContent(d);
      toast({ title: "Challenge content generated" });
    },
    onError: (e: any) => toast({ title: "Generation failed", description: e.message, variant: "destructive" }),
  }) || { mutate: () => {}, isPending: false };

  const post = (trpc.telegramHub as any)?.broadcastMessage?.useMutation?.({
    onSuccess: () => toast({ title: "Posted to Telegram" }),
    onError: (e: any) => toast({ title: "Telegram post failed", description: e.message, variant: "destructive" }),
  }) || { mutate: () => {}, isPending: false };

  const checkout = (trpc.challengeAutomation as any)?.createChallengeCheckout?.useMutation?.({
    onSuccess: (d: any) => {
      if (!d?.checkoutUrl) {
        toast({ title: "Checkout did not return a Stripe URL", variant: "destructive" });
        return;
      }
      window.location.assign(d.checkoutUrl);
    },
    onError: (e: any) => toast({ title: "Checkout is not ready", description: e.message, variant: "destructive" }),
  }) || { mutate: () => {}, isPending: false };

  const activeOffer = useMemo(
    () => OFFER_CARDS.find((card) => card.slug === selectedOffer) || OFFER_CARDS[0],
    [selectedOffer],
  );

  const currentRevenue = parseFloat(String(challenge?.current_revenue || 0));
  const targetRevenue = parseFloat(String(challenge?.target_revenue || 5000));
  const progress = targetRevenue > 0 ? (currentRevenue / targetRevenue) * 100 : 0;

  const startCheckout = () => {
    checkout.mutate({
      offerSlug: selectedOffer,
      buyerEmail: buyerEmail.trim() || undefined,
      trackingCode: sessionId || source || "direct",
      source,
    });
  };

  return (
    <div style={{ minHeight: "100vh", background: "#080810", color: "white", fontFamily: "system-ui,sans-serif" }}>
      <div style={{ borderBottom: "1px solid #1a1a2e", padding: "16px 24px", display: "flex", alignItems: "center", gap: 16, background: "#0a0a1a" }}>
        <Link href="/king"><button style={{ background: "none", border: "1px solid #333", borderRadius: 8, padding: "6px 12px", color: "#888", cursor: "pointer", display: "flex", alignItems: "center", gap: 6, fontSize: 13 }}><ChevronLeft size={14} /> King Hub</button></Link>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, background: "#C9A84C22", border: "1px solid #C9A84C44", display: "flex", alignItems: "center", justifyContent: "center" }}><Trophy size={16} color="#C9A84C" /></div>
          <div><div style={{ fontSize: 16, fontWeight: 700 }}>AI Agent Challenge</div><div style={{ fontSize: 11, color: "#777" }}>Public offer, live-payment checkout, proof-based story engine</div></div>
        </div>
      </div>

      {checkoutStatus === "success" && (
        <div style={{ margin: "18px 24px 0", border: "1px solid #27AE6044", background: "#0D2A1B", borderRadius: 12, padding: 14, color: "#BFF5D2", display: "flex", gap: 10, alignItems: "center" }}>
          <CheckCircle size={18} /> Stripe checkout returned success. Challenge revenue will show only after the live Stripe webhook proves the payment and credits the challenge ledger.
        </div>
      )}
      {checkoutStatus === "cancelled" && (
        <div style={{ margin: "18px 24px 0", border: "1px solid #E74C3C44", background: "#2A1010", borderRadius: 12, padding: 14, color: "#FFB8B8" }}>
          Checkout was cancelled. No revenue was counted and no challenge credit was created.
        </div>
      )}

      <div style={{ padding: 24, display: "grid", gridTemplateColumns: "380px 1fr", gap: 20 }}>
        <div style={{ display: "grid", gap: 12 }}>
          <div style={{ background: "linear-gradient(180deg,#151525,#0f0f1a)", border: "1px solid #C9A84C66", borderRadius: 16, padding: 18 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, color: "#C9A84C", fontSize: 12, fontWeight: 900, letterSpacing: 1, textTransform: "uppercase", marginBottom: 10 }}><Megaphone size={14} /> Buyer Offer</div>
            <div style={{ fontSize: 30, fontWeight: 950, lineHeight: 1.05, marginBottom: 8 }}>Join the AI Agent Challenge revenue sprint.</div>
            <div style={{ fontSize: 13, color: "#B8B8C8", lineHeight: 1.6, marginBottom: 16 }}>This page is now the public acquisition destination. It can take traffic from Telegram drops, show the offer, start Stripe Checkout, and wait for the live webhook before counting revenue.</div>

            <div style={{ display: "grid", gap: 8, marginBottom: 14 }}>
              {OFFER_CARDS.map((offer) => (
                <button key={offer.slug} onClick={() => setSelectedOffer(offer.slug)} style={{ padding: 12, borderRadius: 12, border: `1px solid ${selectedOffer === offer.slug ? "#C9A84C" : "#292944"}`, background: selectedOffer === offer.slug ? "#C9A84C18" : "#0a0a1a", color: "white", cursor: "pointer", textAlign: "left" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 10, marginBottom: 4 }}><strong>{offer.name}</strong><span style={{ color: "#C9A84C", fontWeight: 900 }}>{offer.price}</span></div>
                  <div style={{ color: "#888", fontSize: 12, lineHeight: 1.45 }}>{offer.promise}</div>
                </button>
              ))}
            </div>

            <input value={buyerEmail} onChange={(e) => setBuyerEmail(e.target.value)} placeholder="Buyer email for Stripe receipt, optional" style={{ width: "100%", padding: "12px 13px", borderRadius: 10, border: "1px solid #292944", background: "#080810", color: "white", marginBottom: 10 }} />
            <button onClick={startCheckout} disabled={checkout.isPending} style={{ width: "100%", padding: "14px", borderRadius: 12, border: "none", background: checkout.isPending ? "#24243a" : "linear-gradient(135deg,#C9A84C,#F39C12)", color: checkout.isPending ? "#777" : "#080810", cursor: checkout.isPending ? "not-allowed" : "pointer", fontSize: 15, fontWeight: 900, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
              {checkout.isPending ? <><RefreshCw size={16} style={{ animation: "spin 1s linear infinite" }} /> Opening Stripe...</> : <><CreditCard size={16} /> {activeOffer.cta} via Stripe</>}
            </button>

            <div style={{ marginTop: 12, border: "1px solid #27AE6044", background: "#0B1D14", color: "#BFF5D2", borderRadius: 10, padding: 10, fontSize: 12, lineHeight: 1.5, display: "flex", gap: 8 }}>
              <ShieldCheck size={16} /> Money truth: this page cannot add challenge revenue by itself. Only a live Stripe webhook with challenge metadata can move the challenge ledger.
            </div>
          </div>

          {challenge && (
            <div style={{ background: "#0f0f1a", border: "1px solid #C9A84C44", borderRadius: 12, padding: 16 }}>
              <div style={{ fontSize: 12, color: "#C9A84C", fontWeight: 700, marginBottom: 8, textTransform: "uppercase", letterSpacing: "1px" }}>Live Challenge Ledger</div>
              <div style={{ fontSize: 24, fontWeight: 900, color: "white" }}>${currentRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
              <div style={{ fontSize: 12, color: "#888", marginBottom: 10 }}>of ${targetRevenue.toLocaleString()} goal. This number is live-payment proof only.</div>
              <div style={{ height: 6, background: "#1a1a2e", borderRadius: 3, marginBottom: 6 }}>
                <div style={{ height: "100%", width: `${Math.min(progress, 100)}%`, background: "linear-gradient(90deg,#C9A84C,#F39C12)", borderRadius: 3, transition: "width 0.5s ease" }} />
              </div>
              <div style={{ fontSize: 11, color: "#666" }}>{progress.toFixed(1)}% complete</div>
            </div>
          )}

          <div style={{ background: "#0f0f1a", border: "1px solid #1a1a2e", borderRadius: 12, padding: 16 }}>
            <div style={{ fontSize: 11, color: "#666", textTransform: "uppercase", letterSpacing: "1px", marginBottom: 10 }}>Operator Post Type</div>
            <div style={{ display: "grid", gap: 6 }}>
              {POST_TYPES.map((t) => (
                <button key={t.key} onClick={() => setPostType(t.key)} style={{ padding: "10px 12px", borderRadius: 8, border: `1px solid ${postType === t.key ? t.color : "#1a1a2e"}`, background: postType === t.key ? `${t.color}15` : "#0a0a1a", cursor: "pointer", textAlign: "left" }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: postType === t.key ? t.color : "#aaa" }}>{t.label}</div>
                  <div style={{ fontSize: 11, color: "#555" }}>{t.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {(channels as any)?.channels?.length > 0 && (
            <div style={{ background: "#0f0f1a", border: "1px solid #1a1a2e", borderRadius: 12, padding: 16 }}>
              <div style={{ fontSize: 11, color: "#666", textTransform: "uppercase", letterSpacing: "1px", marginBottom: 8 }}>Target Channel</div>
              <select value={channel} onChange={(e) => setChannel(e.target.value)} style={{ width: "100%", padding: "8px 10px", background: "#0a0a1a", border: "1px solid #1a1a2e", borderRadius: 8, color: "white", fontSize: 13, outline: "none" }}>
                <option value="">All channels</option>
                {(channels as any)?.channels?.map((c: any) => <option key={c.id} value={c.chat_id}>{c.name || c.chat_id}</option>)}
              </select>
            </div>
          )}

          <button onClick={() => generate.mutate({ postType, challengeData: challenge })} disabled={generate.isPending} style={{ padding: "14px", borderRadius: 10, border: "none", background: generate.isPending ? "#1a1a2e" : "linear-gradient(135deg,#C9A84C,#F39C12)", color: generate.isPending ? "#555" : "#000", cursor: generate.isPending ? "not-allowed" : "pointer", fontSize: 14, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
            {generate.isPending ? <><RefreshCw size={15} style={{ animation: "spin 1s linear infinite" }} /> Generating...</> : <><Zap size={15} /> Generate Challenge Content</>}
          </button>
        </div>

        <div>
          {!generatedContent ? (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", color: "#555", minHeight: 520, border: "1px dashed #292944", borderRadius: 18, background: "#0A0A14" }}>
              <Trophy size={48} style={{ marginBottom: 16 }} />
              <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 8, color: "#DDD" }}>Buyer path and operator content are on the same page.</div>
              <div style={{ fontSize: 13, maxWidth: 520, textAlign: "center", lineHeight: 1.6 }}>Traffic can land here, select a paid challenge offer, start Stripe Checkout, and the operator can generate proof-based challenge content from the live ledger.</div>
            </div>
          ) : (
            <div style={{ display: "grid", gap: 16 }}>
              {generatedContent.text && (
                <div style={{ background: "#0f0f1a", border: "1px solid #1a1a2e", borderRadius: 12, padding: 20 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 12, color: "#C9A84C", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    Generated Challenge Post
                    <div style={{ display: "flex", gap: 8 }}>
                      <button onClick={() => { navigator.clipboard.writeText(generatedContent.text); toast({ title: "Copied" }); }} style={{ padding: "5px 12px", borderRadius: 6, border: "1px solid #333", background: "none", color: "#888", cursor: "pointer", fontSize: 12 }}>Copy</button>
                      <button onClick={() => post.mutate({ message: generatedContent.text, channelIds: [(channel || undefined) ?? ""] })} disabled={post.isPending} style={{ padding: "5px 12px", borderRadius: 6, border: "none", background: "#00D9FF", color: "#000", cursor: post.isPending ? "not-allowed" : "pointer", fontSize: 12, fontWeight: 700, display: "flex", alignItems: "center", gap: 4 }}>
                        {post.isPending ? <RefreshCw size={12} style={{ animation: "spin 1s linear infinite" }} /> : <Send size={12} />} Post to Telegram
                      </button>
                    </div>
                  </div>
                  <pre style={{ color: "#e0e0e0", fontSize: 13, lineHeight: 1.7, whiteSpace: "pre-wrap", fontFamily: "inherit", margin: 0 }}>{generatedContent.text}</pre>
                </div>
              )}
              {generatedContent.hashtags?.length > 0 && (
                <div style={{ background: "#0f0f1a", border: "1px solid #1a1a2e", borderRadius: 12, padding: 16 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 8, color: "#888" }}>Hashtags</div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>{generatedContent.hashtags.map((h: string, i: number) => <span key={i} style={{ padding: "4px 10px", borderRadius: 20, background: "#C9A84C20", color: "#C9A84C", fontSize: 12 }}>#{h.replace("#", "")}</span>)}</div>
                </div>
              )}
              {generatedContent.videoScript && (
                <div style={{ background: "#0f0f1a", border: "1px solid #1a1a2e", borderRadius: 12, padding: 16 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 8, color: "#888", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    Video Script
                    <Link href="/king/engine"><button style={{ padding: "5px 12px", borderRadius: 6, border: "none", background: "#C9A84C", color: "#000", cursor: "pointer", fontSize: 12, fontWeight: 700 }}>Open in Engine</button></Link>
                  </div>
                  <pre style={{ color: "#e0e0e0", fontSize: 13, lineHeight: 1.6, whiteSpace: "pre-wrap", fontFamily: "inherit", margin: 0 }}>{generatedContent.videoScript}</pre>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
      <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}*{box-sizing:border-box}`}</style>
    </div>
  );
}

export default ChallengeStoryEngine;
