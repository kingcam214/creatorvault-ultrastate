import { useMemo, useState } from "react";
import { trpc } from "@/lib/trpc";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";
import { Trophy, ChevronLeft, Zap, RefreshCw, CheckCircle, CreditCard, ShieldCheck, Megaphone, Crown, BarChart2, Bot, Lock, ArrowRight, Flame } from "lucide-react";

type OfferSlug = "agent-challenge-entry" | "vaultx-agent-revenue-pack" | "operator-proof-sprint";

const OFFER_CARDS: Array<{
  slug: OfferSlug;
  name: string;
  price: string;
  promise: string;
  cta: string;
  bestFor: string;
  contents: string[];
}> = [
  {
    slug: "agent-challenge-entry",
    name: "AI Agent Challenge Entry",
    price: "$29",
    promise: "Enter the public revenue challenge and follow the live proof path from attention to paid action.",
    cta: "Enter Challenge",
    bestFor: "Curious buyers who want the challenge access point and proof-feed context.",
    contents: ["Challenge entry access", "Live proof-feed context", "Revenue sprint orientation"],
  },
  {
    slug: "vaultx-agent-revenue-pack",
    name: "VaultX Agent Revenue Pack",
    price: "$49",
    promise: "Buy the VaultX-aligned pack built around agent drops, buyer routing, and today’s revenue push.",
    cta: "Buy Revenue Pack",
    bestFor: "Creators and operators who want the VaultX offer tied directly to challenge momentum.",
    contents: ["VaultX revenue offer context", "Agent-drop campaign angle", "Proof-based buyer routing"],
  },
  {
    slug: "operator-proof-sprint",
    name: "Operator Proof Sprint",
    price: "$97",
    promise: "Unlock the premium sprint for buyers who want the operator-grade challenge workflow and proof layer.",
    cta: "Start Proof Sprint",
    bestFor: "Serious buyers who want the strongest challenge offer and premium proof positioning.",
    contents: ["Premium challenge sprint", "Operator proof workflow", "Highest-intent revenue route"],
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
  const [selectedOffer, setSelectedOffer] = useState<OfferSlug>(getInitialOffer());
  const [buyerEmail, setBuyerEmail] = useState("");

  const checkoutStatus = getQueryValue("checkout");
  const source = getQueryValue("source") || "public_challenge_offer";
  const sessionId = getQueryValue("session_id");

  const { data: publicOfferState } = (trpc.challengeAutomation as any)?.getPublicChallengeOfferState?.useQuery?.() || { data: null };
  const challenge = publicOfferState?.challenge ?? null;

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

  const currentRevenue = parseFloat(String(challenge?.currentRevenue || 0));
  const targetRevenue = parseFloat(String(challenge?.targetRevenue || 5000));
  const progress = targetRevenue > 0 ? (currentRevenue / targetRevenue) * 100 : 0;

  const startCheckout = () => {
    checkout.mutate({
      offerSlug: selectedOffer,
      buyerEmail: buyerEmail.trim() || undefined,
      trackingCode: sessionId || source || "direct",
      source,
    });
  };

  const proofBlocks = [
    {
      icon: ShieldCheck,
      title: "Live-payment proof only",
      body: publicOfferState?.moneyTruth || "This page cannot add challenge revenue by itself. Only a live Stripe webhook with challenge metadata can move the challenge ledger.",
    },
    {
      icon: Bot,
      title: "Agent-led revenue push",
      body: "The challenge is positioned around automated attention, direct offers, checkout routing, and public accountability instead of vague motivational posting.",
    },
    {
      icon: BarChart2,
      title: "Visible challenge ledger",
      body: "The buyer sees the target, the current proven revenue, and the gap. That creates urgency without pretending money moved before Stripe confirms it.",
    },
  ];

  const pathSteps = [
    { label: "Choose", body: "Pick the entry, VaultX revenue pack, or premium proof sprint based on how close you want to get to the operator workflow." },
    { label: "Pay", body: "Stripe handles the checkout. A successful return is not counted as revenue until the webhook proves the payment." },
    { label: "Prove", body: "The challenge ledger and campaign story move only from confirmed money, giving the public challenge a real accountability spine." },
  ];

  return (
    <div className="min-h-screen text-white relative overflow-hidden" style={{ background: "#070707", fontFamily: "var(--kc-font-ui)" }}>
      <style>{`
        @keyframes acGlow{0%,100%{opacity:.48;transform:scale(1)}50%{opacity:.86;transform:scale(1.08)}}
        .ac-shell{max-width:1180px;margin:0 auto;padding-left:20px;padding-right:20px}
        .ac-glass{background:linear-gradient(180deg,rgba(20,20,20,.88),rgba(8,8,8,.78));border:1px solid rgba(201,168,76,.18);box-shadow:0 28px 90px rgba(0,0,0,.52);backdrop-filter:blur(18px)}
        .ac-card{background:rgba(255,255,255,.045);border:1px solid rgba(255,255,255,.09);transition:transform .22s ease,border-color .22s ease,background .22s ease}.ac-card:hover{transform:translateY(-4px);border-color:rgba(201,168,76,.34);background:rgba(255,255,255,.065)}
        .ac-gold{background:linear-gradient(135deg,#c9a84c,#f3d68b);-webkit-background-clip:text;background-clip:text;color:transparent}
        .ac-btn{background:linear-gradient(135deg,#c9a84c,#f3d68b);color:#060606;box-shadow:0 20px 55px rgba(201,168,76,.28)}
        .ac-btn:disabled{opacity:.55;cursor:not-allowed;filter:saturate(.4)}
        .ac-input{width:100%;background:rgba(255,255,255,.055);border:1px solid rgba(255,255,255,.12);border-radius:16px;color:white;padding:14px 15px;outline:none}.ac-input:focus{border-color:rgba(201,168,76,.55);box-shadow:0 0 0 4px rgba(201,168,76,.12)}
      `}</style>
      <div className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(circle at 18% 8%, rgba(201,168,76,.22), transparent 32%), radial-gradient(circle at 86% 20%, rgba(6,182,212,.13), transparent 30%), radial-gradient(circle at 45% 90%, rgba(245,158,11,.12), transparent 38%)" }} />
      <div className="absolute inset-0 pointer-events-none opacity-[.05]" style={{ backgroundImage: "linear-gradient(rgba(255,255,255,.55) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.55) 1px, transparent 1px)", backgroundSize: "48px 48px" }} />

      <nav className="ac-shell relative z-10 flex items-center justify-between py-5 md:py-7">
        <div className="flex items-center gap-3">
          <Link href="/king"><button className="hidden sm:inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold border border-white/10 text-white/65 hover:text-white hover:bg-white/5"><ChevronLeft size={15} /> King Hub</button></Link>
          <div className="w-11 h-11 rounded-2xl flex items-center justify-center kc-animate-pulse-gold" style={{ background: "linear-gradient(135deg,#c9a84c,#f3d68b)" }}><Trophy className="w-5 h-5 text-black" /></div>
          <div>
            <div className="font-black text-xl tracking-tight">AI Agent Challenge</div>
            <div className="text-[10px] uppercase tracking-[.25em] font-black" style={{ color: "#c9a84c" }}>Public revenue sprint</div>
          </div>
        </div>
        <button onClick={startCheckout} disabled={checkout.isPending} className="ac-btn inline-flex items-center gap-2 px-4 md:px-6 py-3 rounded-2xl text-sm font-black">
          {checkout.isPending ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CreditCard className="w-4 h-4" />} {checkout.isPending ? "Opening..." : activeOffer.price}
        </button>
      </nav>

      <main className="relative z-10">
        {checkoutStatus === "success" && (
          <section className="ac-shell pt-2">
            <div className="rounded-2xl p-4 border flex gap-3 items-start" style={{ background: "rgba(16,185,129,.11)", borderColor: "rgba(16,185,129,.28)", color: "#bbf7d0" }}>
              <CheckCircle size={20} /> <div><strong>Stripe checkout returned success.</strong> Challenge revenue will show only after the live Stripe webhook proves the payment and credits the challenge ledger.</div>
            </div>
          </section>
        )}
        {checkoutStatus === "cancelled" && (
          <section className="ac-shell pt-2">
            <div className="rounded-2xl p-4 border" style={{ background: "rgba(239,68,68,.11)", borderColor: "rgba(239,68,68,.28)", color: "#fecaca" }}>Checkout was cancelled. No revenue was counted and no challenge credit was created.</div>
          </section>
        )}

        <section className="ac-shell pt-8 md:pt-14 pb-16 md:pb-24">
          <div className="grid lg:grid-cols-[.95fr_1.05fr] gap-10 lg:gap-14 items-center">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full px-4 py-2 mb-6" style={{ background: "rgba(201,168,76,.12)", border: "1px solid rgba(201,168,76,.28)", color: "#f3d68b" }}>
                <Megaphone className="w-4 h-4" /><span className="text-xs font-black uppercase tracking-[.18em]">Live public offer · real Stripe checkout</span>
              </div>
              <h1 className="font-black leading-[.9] tracking-[-.055em] mb-6" style={{ fontSize: "clamp(3rem, 8vw, 7rem)" }}>
                Watch the agents turn pressure into paid proof.
              </h1>
              <p className="text-lg md:text-2xl leading-8 md:leading-10 max-w-2xl mb-8" style={{ color: "#d8d8d3" }}>
                The <strong>AI Agent Challenge</strong> is a public revenue sprint where every buyer enters through a real offer, every checkout routes through Stripe, and every dollar on the board has to be proven by the live payment webhook.
              </p>
              <div className="grid sm:grid-cols-3 gap-3 max-w-2xl mb-8">
                <div className="ac-card rounded-2xl p-4"><div className="text-2xl font-black ac-gold">${currentRevenue.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</div><div className="text-xs text-white/55 mt-1">proven revenue</div></div>
                <div className="ac-card rounded-2xl p-4"><div className="text-2xl font-black ac-gold">${targetRevenue.toLocaleString()}</div><div className="text-xs text-white/55 mt-1">challenge target</div></div>
                <div className="ac-card rounded-2xl p-4"><div className="text-2xl font-black ac-gold">{Math.min(progress, 100).toFixed(1)}%</div><div className="text-xs text-white/55 mt-1">complete</div></div>
              </div>
              <div className="h-2 rounded-full mb-8" style={{ background: "rgba(255,255,255,.08)" }}>
                <div className="h-full rounded-full" style={{ width: `${Math.min(progress, 100)}%`, background: "linear-gradient(90deg,#c9a84c,#f3d68b)", transition: "width .5s ease" }} />
              </div>
            </div>

            <div className="ac-glass rounded-[2rem] p-5 md:p-7 relative">
              <div className="absolute -inset-6 rounded-full blur-3xl opacity-40" style={{ background: "radial-gradient(circle, rgba(201,168,76,.3), transparent 64%)", animation: "acGlow 4s ease-in-out infinite" }} />
              <div className="relative">
                <div className="flex items-start justify-between gap-4 mb-5">
                  <div>
                    <div className="text-xs font-black uppercase tracking-[.2em] mb-2" style={{ color: "#c9a84c" }}>Selected offer</div>
                    <h2 className="text-3xl md:text-4xl font-black leading-none">{activeOffer.name}</h2>
                  </div>
                  <div className="text-3xl font-black ac-gold whitespace-nowrap">{activeOffer.price}</div>
                </div>
                <p className="text-base leading-7 mb-5" style={{ color: "#d8d8d3" }}>{activeOffer.promise}</p>
                <p className="text-sm leading-6 mb-5" style={{ color: "#999" }}>{activeOffer.bestFor}</p>
                <div className="grid gap-2 mb-6">
                  {activeOffer.contents.map((item) => (
                    <div key={item} className="flex items-center gap-3 rounded-2xl p-3" style={{ background: "rgba(255,255,255,.045)", border: "1px solid rgba(255,255,255,.08)" }}><CheckCircle className="w-4 h-4" style={{ color: "#10b981" }} /><span className="text-sm font-semibold text-white/85">{item}</span></div>
                  ))}
                </div>
                <div className="grid gap-2 mb-5">
                  {OFFER_CARDS.map((offer) => (
                    <button key={offer.slug} onClick={() => setSelectedOffer(offer.slug)} className="rounded-2xl p-4 text-left transition-all" style={{ border: `1px solid ${selectedOffer === offer.slug ? "rgba(201,168,76,.65)" : "rgba(255,255,255,.1)"}`, background: selectedOffer === offer.slug ? "rgba(201,168,76,.12)" : "rgba(0,0,0,.22)" }}>
                      <div className="flex items-center justify-between gap-4"><strong>{offer.name}</strong><span className="font-black" style={{ color: "#f3d68b" }}>{offer.price}</span></div>
                    </button>
                  ))}
                </div>
                <input value={buyerEmail} onChange={(e) => setBuyerEmail(e.target.value)} placeholder="Buyer email for Stripe receipt, optional" className="ac-input mb-3" />
                <button onClick={startCheckout} disabled={checkout.isPending} className="ac-btn w-full rounded-2xl py-4 font-black flex items-center justify-center gap-2">
                  {checkout.isPending ? <><RefreshCw className="w-5 h-5 animate-spin" /> Opening Stripe...</> : <><CreditCard className="w-5 h-5" /> {activeOffer.cta} via Stripe</>}
                </button>
                <div className="mt-4 rounded-2xl p-4 flex gap-3 items-start" style={{ background: "rgba(16,185,129,.1)", border: "1px solid rgba(16,185,129,.24)", color: "#bbf7d0" }}>
                  <Lock className="w-5 h-5 flex-shrink-0" />
                  <p className="text-sm leading-6 m-0">Revenue is credited only after Stripe confirms payment through the live webhook. This keeps the challenge honest and buyer-facing.</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="ac-shell pb-16 md:pb-24">
          <div className="grid lg:grid-cols-3 gap-4">
            {proofBlocks.map(({ icon: Icon, title, body }) => (
              <div key={title} className="ac-card rounded-[1.7rem] p-6">
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-5" style={{ background: "rgba(201,168,76,.14)", border: "1px solid rgba(201,168,76,.25)", color: "#f3d68b" }}><Icon className="w-6 h-6" /></div>
                <h3 className="text-2xl font-black mb-3">{title}</h3>
                <p className="text-sm leading-7" style={{ color: "#aaa" }}>{body}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="ac-shell pb-16 md:pb-24">
          <div className="ac-glass rounded-[2rem] p-6 md:p-10 grid lg:grid-cols-[.75fr_1.25fr] gap-8 items-start">
            <div>
              <div className="text-sm font-black uppercase tracking-[.22em] mb-4" style={{ color: "#c9a84c" }}>Challenge mechanics</div>
              <h2 className="text-4xl md:text-5xl font-black tracking-[-.04em] leading-none mb-5">The story is simple: choose, pay, prove.</h2>
              <p className="text-base leading-8" style={{ color: "#b8b8b8" }}>The public page now sells the offer first and uses the ledger as credibility. It no longer looks like an internal posting tool; it looks like a live revenue challenge with a checkout path.</p>
            </div>
            <div className="grid gap-3">
              {pathSteps.map((step, index) => (
                <div key={step.label} className="rounded-3xl p-5 flex gap-4" style={{ background: "rgba(0,0,0,.32)", border: "1px solid rgba(255,255,255,.08)" }}>
                  <div className="w-11 h-11 rounded-2xl flex-shrink-0 flex items-center justify-center font-black" style={{ background: "rgba(201,168,76,.16)", color: "#f3d68b" }}>{index + 1}</div>
                  <div><h3 className="text-xl font-black mb-1">{step.label}</h3><p className="text-sm leading-7" style={{ color: "#aaa" }}>{step.body}</p></div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="px-5 pb-20 md:pb-28">
          <div className="max-w-5xl mx-auto text-center rounded-[2rem] p-7 md:p-12" style={{ background: "linear-gradient(135deg,rgba(201,168,76,.22),rgba(6,182,212,.10),rgba(245,158,11,.10))", border: "1px solid rgba(201,168,76,.25)" }}>
            <div className="inline-flex items-center gap-2 rounded-full px-4 py-2 mb-6" style={{ background: "rgba(0,0,0,.28)", border: "1px solid rgba(255,255,255,.12)" }}><Flame className="w-4 h-4" /><span className="text-xs font-black uppercase tracking-[.16em]">Public offer destination</span></div>
            <h2 className="text-4xl md:text-6xl font-black tracking-[-.045em] leading-none mb-6">Pick the offer and enter the live-money sprint.</h2>
            <p className="text-base md:text-lg leading-8 max-w-3xl mx-auto mb-8" style={{ color: "#f5f0e8" }}>This page is ready for Telegram drops, buyer DMs, and challenge traffic because the offer is visible, the price is clear, and Stripe is the only path that can move revenue.</p>
            <button onClick={startCheckout} disabled={checkout.isPending} className="ac-btn inline-flex items-center justify-center gap-2 rounded-2xl px-9 py-4 font-black">
              {checkout.isPending ? <><RefreshCw className="w-5 h-5 animate-spin" /> Opening secure checkout...</> : <>{activeOffer.cta} <ArrowRight className="w-5 h-5" /></>}
            </button>
          </div>
        </section>
      </main>
    </div>
  );
}

export default ChallengeStoryEngine;
