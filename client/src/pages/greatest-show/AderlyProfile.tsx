/**
 * ADERLY — Money-Printing Creator System (REAL)
 * @adysanchesz | La Mas Perra | Dominican Queen
 * Real Stripe checkout + PPV drops + Telegram automation
 */
import { useState } from "react";
import { Link } from "wouter";
import { ArrowLeft, Crown, Flame, Lock, Check, Zap, Instagram, ChevronRight } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

const RED = "#FF2D2D", ORANGE = "#FF8C00", GOLD = "#FFD700";
const DARK = "#0a0000", CARD = "rgba(255,255,255,0.04)", BORDER = "rgba(255,255,255,0.08)";

function TierCard({ tier, onSubscribe, loading }: { tier: any; onSubscribe: (id: string) => void; loading: boolean }) {
  const isPopular = tier.id === "inner_circle";
  return (
    <div style={{ position: "relative", background: isPopular ? "rgba(255,140,0,0.12)" : CARD, border: `1px solid ${isPopular ? ORANGE : BORDER}`, borderRadius: 20, padding: "28px 20px", display: "flex", flexDirection: "column", gap: 16 }}>
      {isPopular && <div style={{ position: "absolute", top: -12, left: "50%", transform: "translateX(-50%)", background: ORANGE, color: "#000", fontSize: 11, fontWeight: 900, padding: "4px 14px", borderRadius: 20, letterSpacing: "0.08em", whiteSpace: "nowrap" }}>MOST POPULAR</div>}
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: 32, marginBottom: 6 }}>{tier.emoji}</div>
        <p style={{ fontSize: 11, color: tier.color, fontFamily: "monospace", letterSpacing: "0.15em", textTransform: "uppercase", margin: "0 0 4px" }}>{tier.name}</p>
        <div style={{ fontSize: 42, fontWeight: 900, color: "#fff", lineHeight: 1 }}>${tier.price}</div>
        <div style={{ fontSize: 12, color: "rgba(255,255,255,0.45)", marginTop: 2 }}>per month</div>
      </div>
      <p style={{ fontSize: 13, color: "rgba(255,255,255,0.6)", textAlign: "center", lineHeight: 1.5 }}>{tier.description}</p>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {tier.perks.map((p: string) => (
          <div key={p} style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
            <Check size={14} color={tier.color} style={{ flexShrink: 0, marginTop: 2 }} />
            <span style={{ fontSize: 13, color: "rgba(255,255,255,0.8)" }}>{p}</span>
          </div>
        ))}
      </div>
      <button onClick={() => onSubscribe(tier.id)} disabled={loading} style={{ width: "100%", padding: "14px", borderRadius: 12, border: "none", background: isPopular ? `linear-gradient(135deg, ${ORANGE}, ${RED})` : `linear-gradient(135deg, ${tier.color}22, ${tier.color}44)`, color: isPopular ? "#000" : "#fff", fontWeight: 900, fontSize: 15, fontFamily: "Bebas Neue, sans-serif", letterSpacing: "0.08em", cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.7 : 1 }}>
        {loading ? "Loading..." : `Subscribe — $${tier.price}/mo`}
      </button>
    </div>
  );
}

function DropCard({ drop, onPurchase, loading }: { drop: any; onPurchase: (drop: any) => void; loading: boolean }) {
  return (
    <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 16, overflow: "hidden" }}>
      <div style={{ aspectRatio: "9/16", background: `linear-gradient(135deg, ${DARK}, #1a0000)`, display: "flex", alignItems: "center", justifyContent: "center", position: "relative" }}>
        <div style={{ textAlign: "center" }}><Lock size={32} color="rgba(255,255,255,0.3)" /><p style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", marginTop: 8 }}>LOCKED</p></div>
        <div style={{ position: "absolute", top: 8, right: 8, background: RED, color: "#000", fontSize: 9, fontWeight: 900, padding: "3px 8px", borderRadius: 6 }}>{drop.mediaType?.toUpperCase()}</div>
      </div>
      <div style={{ padding: "12px 14px" }}>
        <p style={{ fontSize: 14, fontWeight: 800, margin: "0 0 4px" }}>{drop.title}</p>
        <p style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", margin: "0 0 12px", lineHeight: 1.4 }}>{drop.teaser}</p>
        <button onClick={() => onPurchase(drop)} disabled={loading} style={{ width: "100%", padding: "10px", borderRadius: 10, border: "none", background: `linear-gradient(135deg, ${RED}, ${ORANGE})`, color: "#000", fontWeight: 900, fontSize: 14, cursor: loading ? "not-allowed" : "pointer" }}>
          Unlock — ${drop.price}
        </button>
      </div>
    </div>
  );
}

export default function AderlyProfile() {
  const [tab, setTab] = useState<"drops" | "subscribe" | "about">("drops");
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);

  const profileQ = (trpc as any).aderly?.getProfile?.useQuery?.(undefined, { retry: false });
  const dropsQ = (trpc as any).aderly?.getDrops?.useQuery?.(undefined, { retry: false });
  const checkoutMut = (trpc as any).aderly?.createCheckout?.useMutation?.();
  const purchaseMut = (trpc as any).aderly?.purchaseDrop?.useMutation?.();

  const profile = profileQ?.data;
  const drops = dropsQ?.data?.drops || [];
  const tiers = profile?.tiers || [
    { id: "la_perra", name: "LA PERRA", emoji: "\uD83D\uDD25", price: 29, description: "All regular drops, behind-the-scenes, daily content.", perks: ["All regular drops", "Behind-the-scenes", "Daily posts", "Early PPV teasers"], color: RED, badge: "POPULAR" },
    { id: "inner_circle", name: "INNER CIRCLE", emoji: "\uD83D\uDC8E", price: 49, description: "VIP Telegram + exclusive drops + priority access.", perks: ["Everything in LA PERRA", "Private VIP Telegram", "Exclusive drops", "Priority DMs", "Monthly exclusive video"], color: ORANGE, badge: "VIP" },
    { id: "goddess", name: "GODDESS", emoji: "\uD83D\uDC51", price: 99, description: "Full access + custom content + direct line.", perks: ["Everything in INNER CIRCLE", "1 custom request/month", "Direct DM access", "PPV at 50% off", "Name in credits"], color: GOLD, badge: "ELITE" },
  ];

  const handleSubscribe = async (tierId: string) => {
    if (!checkoutMut) { toast.error("Checkout not available"); return; }
    setCheckoutLoading(tierId);
    try {
      const res = await checkoutMut.mutateAsync({ tierId });
      if (res?.checkoutUrl) window.location.href = res.checkoutUrl;
    } catch (e: any) { toast.error(e?.message || "Checkout failed"); }
    finally { setCheckoutLoading(null); }
  };

  const handlePurchase = async (drop: any) => {
    if (!purchaseMut) { toast.error("Purchase not available"); return; }
    setCheckoutLoading(drop.id);
    try {
      const res = await purchaseMut.mutateAsync({ dropId: drop.id, dropTitle: drop.title, price: drop.price });
      if (res?.checkoutUrl) window.location.href = res.checkoutUrl;
    } catch (e: any) { toast.error(e?.message || "Purchase failed"); }
    finally { setCheckoutLoading(null); }
  };

  return (
    <div style={{ minHeight: "100vh", background: DARK, color: "#fff", fontFamily: "DM Sans, sans-serif" }}>
      <style>{`@keyframes pulse2{from{transform:scale(1);opacity:0.6}to{transform:scale(1.2);opacity:1}}`}</style>

      {/* HERO */}
      <div style={{ position: "relative", minHeight: "60vh", display: "flex", alignItems: "flex-end", overflow: "hidden" }}>
        <div style={{ position: "absolute", inset: 0, background: `radial-gradient(ellipse at 30% 40%, rgba(255,45,45,0.35) 0%, transparent 60%), radial-gradient(ellipse at 70% 60%, rgba(255,140,0,0.25) 0%, transparent 60%)` }} />
        {[0,1,2].map(i => <div key={i} style={{ position: "absolute", width: 300, height: 300, borderRadius: "50%", background: ["rgba(255,45,45,0.15)","rgba(255,140,0,0.12)","rgba(255,45,45,0.08)"][i], filter: "blur(60px)", top: `${[20,50,70][i]}%`, left: `${[10,60,30][i]}%`, animation: `pulse2 ${[3,4,5][i]}s ease-in-out infinite alternate` }} />)}
        <Link href="/greatest-show" style={{ position: "absolute", top: 16, left: 16, zIndex: 10, textDecoration: "none" }}>
          <button style={{ background: "rgba(0,0,0,0.5)", border: `1px solid ${BORDER}`, borderRadius: "50%", width: 40, height: 40, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "#fff" }}><ArrowLeft size={18} /></button>
        </Link>
        <div style={{ position: "relative", zIndex: 2, width: "100%", padding: "60px 20px 40px", textAlign: "center" }}>
          <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: 8, marginBottom: 16 }}>
            {[["\uD83D\uDD25","VIRAL QUEEN",RED],["\uD83D\uDC51","LA MAS PERRA",ORANGE],["\uD83C\uDDF3\uD83C\uDDE9","DOMINICANA",GOLD]].map(([icon,label,color]) => (
              <div key={label} style={{ padding: "6px 14px", background: `${color}22`, border: `1px solid ${color}55`, borderRadius: 20, fontSize: 11, fontWeight: 900, letterSpacing: "0.06em", display: "flex", alignItems: "center", gap: 6 }}><span>{icon}</span>{label}</div>
            ))}
          </div>
          <h1 style={{ fontSize: "clamp(56px,12vw,96px)", fontFamily: "Bebas Neue, sans-serif", letterSpacing: "0.04em", lineHeight: 1, margin: "0 0 8px", background: `linear-gradient(135deg, ${RED}, ${ORANGE}, ${GOLD})`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>Aderly</h1>
          <p style={{ fontSize: "clamp(16px,4vw,22px)", color: "rgba(255,140,0,0.9)", fontWeight: 700, margin: "0 0 16px" }}>The Viral Content Queen · @adysanchesz</p>
          <div style={{ display: "flex", justifyContent: "center", gap: 24, marginBottom: 20, flexWrap: "wrap" }}>
            {[["1.7K","Likes"],["63","Videos"],["29","Photos"],["Partner","Status"]].map(([val,label]) => (
              <div key={label} style={{ textAlign: "center" }}><div style={{ fontSize: 24, fontWeight: 900, color: GOLD }}>{val}</div><div style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", letterSpacing: "0.08em" }}>{label}</div></div>
            ))}
          </div>
          <p style={{ fontSize: 15, color: "rgba(255,255,255,0.7)", maxWidth: 480, margin: "0 auto 24px", lineHeight: 1.6, fontStyle: "italic" }}>"Te gusta lo prohibido, lo hot, lo perro... LA MAS PERRA \uD83D\uDD25\uD83D\uDD25 \u00BFQuieres ver?"</p>
          <button onClick={() => setTab("subscribe")} style={{ padding: "16px 40px", borderRadius: 14, border: "none", background: `linear-gradient(135deg, ${RED}, ${ORANGE})`, color: "#000", fontSize: 18, fontWeight: 900, fontFamily: "Bebas Neue, sans-serif", letterSpacing: "0.08em", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 8 }}>
            <Flame size={20} /> JOIN NOW — FROM $29/MO
          </button>
          <p style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", marginTop: 8 }}>Cancel anytime · Instant access · Secure Stripe checkout</p>
        </div>
      </div>

      {/* TABS */}
      <div style={{ position: "sticky", top: 0, zIndex: 40, background: "rgba(10,0,0,0.95)", borderBottom: `1px solid ${BORDER}`, backdropFilter: "blur(12px)" }}>
        <div style={{ maxWidth: 800, margin: "0 auto", display: "flex" }}>
          {([["drops","\uD83D\uDC8E PPV Drops"],["subscribe","\uD83D\uDD25 Subscribe"],["about","\uD83D\uDC51 About"]] as const).map(([id,label]) => (
            <button key={id} onClick={() => setTab(id)} style={{ flex: 1, padding: "14px 8px", border: "none", background: "transparent", color: tab === id ? ORANGE : "rgba(255,255,255,0.45)", fontWeight: 800, fontSize: 14, cursor: "pointer", borderBottom: tab === id ? `2px solid ${ORANGE}` : "2px solid transparent" }}>{label}</button>
          ))}
        </div>
      </div>

      {/* CONTENT */}
      <div style={{ maxWidth: 800, margin: "0 auto", padding: "24px 16px" }}>

        {tab === "drops" && (
          <div>
            <div style={{ textAlign: "center", marginBottom: 24 }}>
              <h2 style={{ fontSize: 28, fontFamily: "Bebas Neue, sans-serif", margin: "0 0 6px" }}>Exclusive PPV Drops</h2>
              <p style={{ fontSize: 14, color: "rgba(255,255,255,0.5)", margin: 0 }}>Unlock individual pieces. No subscription needed.</p>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 12 }}>
              {drops.length > 0 ? drops.map((drop: any) => (
                <DropCard key={drop.id} drop={drop} onPurchase={handlePurchase} loading={checkoutLoading === drop.id} />
              )) : [
                { id: "d1", title: "La Dominicana \uD83C\uDDF3\uD83C\uDDE9", teaser: "Too hot for the internet...", price: 25, mediaType: "video" },
                { id: "d2", title: "Red Room Session \uD83D\uDD34", teaser: "Chains, red light, zero limits.", price: 20, mediaType: "video" },
                { id: "d3", title: "Morning Ritual \u2600\uFE0F", teaser: "How I start every morning.", price: 15, mediaType: "photo" },
                { id: "d4", title: "La Mas Perra Bundle \uD83D\uDD25", teaser: "Best of June. 8 videos. One price.", price: 35, mediaType: "bundle" },
              ].map((drop) => <DropCard key={drop.id} drop={drop} onPurchase={handlePurchase} loading={checkoutLoading === drop.id} />)}
            </div>
            <div style={{ marginTop: 24, background: "rgba(255,45,45,0.08)", border: `1px solid ${RED}33`, borderRadius: 16, padding: "20px", textAlign: "center" }}>
              <Zap size={24} color={ORANGE} style={{ marginBottom: 8 }} />
              <p style={{ fontSize: 16, fontWeight: 800, margin: "0 0 6px" }}>Get everything for less</p>
              <p style={{ fontSize: 13, color: "rgba(255,255,255,0.5)", margin: "0 0 14px" }}>Subscribe to LA PERRA and unlock all drops + new content every week.</p>
              <button onClick={() => setTab("subscribe")} style={{ padding: "12px 28px", borderRadius: 10, border: "none", background: `linear-gradient(135deg, ${RED}, ${ORANGE})`, color: "#000", fontWeight: 900, fontSize: 14, cursor: "pointer" }}>Subscribe from $29/mo \u2192</button>
            </div>
          </div>
        )}

        {tab === "subscribe" && (
          <div>
            <div style={{ textAlign: "center", marginBottom: 24 }}>
              <h2 style={{ fontSize: 28, fontFamily: "Bebas Neue, sans-serif", margin: "0 0 6px" }}>Choose Your Access Level</h2>
              <p style={{ fontSize: 14, color: "rgba(255,255,255,0.5)", margin: 0 }}>Monthly subscription. Cancel anytime. Instant access.</p>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 16 }}>
              {tiers.map((tier: any) => <TierCard key={tier.id} tier={tier} onSubscribe={handleSubscribe} loading={checkoutLoading === tier.id} />)}
            </div>
            <div style={{ marginTop: 20, display: "flex", justifyContent: "center", gap: 24, flexWrap: "wrap" }}>
              {[["\uD83D\uDD12","Secure Stripe checkout"],["\u26A1","Instant access"],["\u274C","Cancel anytime"]].map(([icon,text]) => (
                <div key={text} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "rgba(255,255,255,0.4)" }}><span>{icon}</span>{text}</div>
              ))}
            </div>
          </div>
        )}

        {tab === "about" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 16, padding: "20px" }}>
              <h3 style={{ fontSize: 20, fontFamily: "Bebas Neue, sans-serif", color: ORANGE, margin: "0 0 12px" }}>La Historia</h3>
              <p style={{ fontSize: 14, color: "rgba(255,255,255,0.7)", lineHeight: 1.7, margin: 0 }}>Dominican creator. Partner. 1.7K likes and growing. She was giving away premium content at $15/month — that ends now. Aderly is building the most addictive Spanish-speaking creator brand on the internet. Every drop is an event. Every piece of content is a reason to subscribe.</p>
            </div>
            <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 16, padding: "20px" }}>
              <h3 style={{ fontSize: 20, fontFamily: "Bebas Neue, sans-serif", color: RED, margin: "0 0 12px" }}>What You Get</h3>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {[["\uD83D\uDD25","Daily content drops — photos, videos, behind the scenes"],["\uD83D\uDC8E","PPV exclusives — the content too hot for the main feed"],["\uD83D\uDCF1","VIP Telegram channel (INNER CIRCLE+) — direct access"],["\uD83D\uDC51","Custom content requests (GODDESS tier)"],["\uD83C\uDDF3\uD83C\uDDE9","Bilingual content — Spanish & English"]].map(([icon,text]) => (
                  <div key={text} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}><span style={{ fontSize: 18, flexShrink: 0 }}>{icon}</span><span style={{ fontSize: 13, color: "rgba(255,255,255,0.7)", lineHeight: 1.5 }}>{text}</span></div>
                ))}
              </div>
            </div>
            <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 16, padding: "20px" }}>
              <h3 style={{ fontSize: 20, fontFamily: "Bebas Neue, sans-serif", color: GOLD, margin: "0 0 12px" }}>Find Me</h3>
              <a href="https://instagram.com/adysanchesz" target="_blank" rel="noopener noreferrer" style={{ display: "flex", alignItems: "center", gap: 10, color: "#fff", textDecoration: "none", fontSize: 14, fontWeight: 700 }}>
                <Instagram size={20} color="#E1306C" /> @adysanchesz on Instagram
              </a>
            </div>
            <button onClick={() => setTab("subscribe")} style={{ padding: "18px", borderRadius: 14, border: "none", background: `linear-gradient(135deg, ${RED}, ${ORANGE})`, color: "#000", fontSize: 18, fontWeight: 900, fontFamily: "Bebas Neue, sans-serif", letterSpacing: "0.08em", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
              <Crown size={20} /> START YOUR SUBSCRIPTION
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
