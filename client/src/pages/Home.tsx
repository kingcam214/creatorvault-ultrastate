import { ReactNode, useEffect, useRef, useState } from "react";
import { Link } from "wouter";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";

const KINGCAM_HERO_VIDEO = "/videos/kingcam-hero-cam.mp4";
const VAULTX_HERO_VIDEO = "/videos/vaultx-creator-economy-hero.mp4";
const VAULTX_TRAILER_VIDEO = "/videos/vaultx-cinematic-trailer.mp4";
const VAULTX_HOMEPAGE_AUDIO = "/audio/vaultx-homepage-pulse.wav";

function useScrollReveal(threshold = 0.12) {
  const ref = useRef<HTMLElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          obs.disconnect();
        }
      },
      { threshold }
    );

    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);

  return { ref, visible };
}

function useCounter(target: number, duration = 1400, active = false) {
  const [value, setValue] = useState(0);

  useEffect(() => {
    if (!active) return;
    let start = 0;
    const step = Math.max(1, target / (duration / 16));
    const timer = window.setInterval(() => {
      start += step;
      if (start >= target) {
        setValue(target);
        window.clearInterval(timer);
      } else {
        setValue(Math.floor(start));
      }
    }, 16);

    return () => window.clearInterval(timer);
  }, [active, duration, target]);

  return value;
}

function CyanButton({ href, children, submit = false, disabled = false, variant = "primary" }: { href?: string; children: ReactNode; submit?: boolean; disabled?: boolean; variant?: "primary" | "ghost" }) {
  const button = (
    <button
      type={submit ? "submit" : "button"}
      disabled={disabled}
      className={`cv-button cv-button-${variant}`}
    >
      {children}
    </button>
  );

  return href ? <Link href={href}>{button}</Link> : button;
}

const powerStrip = [
  { label: "CLONE STACK", title: "Train the version of you that can sell, guide, and remember." },
  { label: "CONTENT FACTORY", title: "Turn raw clips into drops, captions, promos, and platform packs." },
  { label: "VAULTX DROPS", title: "Launch premium video offers built for fan conversion." },
  { label: "REVENUE COMMAND", title: "Track what moved, what sold, and what needs to be pushed again." },
];

const packages = [
  {
    name: "Starter Drop",
    tag: "Launch today",
    price: "First drop free",
    line: "For creators who need the first sellable package fast without looking amateur.",
    includes: ["One video turned into a teaser and paid drop", "Caption and DM hook pack", "VaultX-ready campaign archive"],
    accent: "#00D9FF",
  },
  {
    name: "Clone Stack",
    tag: "Most magnetic",
    price: "Build your AI double",
    line: "For creators ready to make their brand talk, remember, and move like a real business.",
    includes: ["Clone voice and personality passport", "Memory core for offers, tone, and audience", "Fan-ready response and sales flows"],
    accent: "#C9A84C",
    featured: true,
  },
  {
    name: "VaultX Pro",
    tag: "Content machine",
    price: "Drops on repeat",
    line: "For premium creators and studios who need consistent video packages across every channel.",
    includes: ["Teasers, PPV bundles, covers, and motion promos", "OF, Fansly, Telegram, X distribution kit", "Campaign proof and revenue readout"],
    accent: "#00D9FF",
  },
  {
    name: "Empire OS",
    tag: "Full command",
    price: "Operate like a platform",
    line: "For serious builders who want clone, content, fan funnels, receipts, and money control under one roof.",
    includes: ["Clone stack plus content factory", "Premium offers and membership pathways", "Operator-level proof, tracking, and growth loops"],
    accent: "#C9A84C",
  },
];

const workflowSteps = [
  { n: "01", title: "Feed the vault", body: "Drop in raw video, ideas, captions, voice notes, offers, and the way you actually talk." },
  { n: "02", title: "Build the clone", body: "CreatorVault shapes your digital presence so your brand can answer, sell, and stay consistent." },
  { n: "03", title: "Package the content", body: "VaultX turns motion into teasers, PPV drops, covers, platform captions, and fan-ready campaigns." },
  { n: "04", title: "Push what pays", body: "Your best offers get routed into the channels where attention becomes buyers, subscribers, and loyal fans." },
];

const proofTiles = [
  { stat: "1", label: "Upload can start the whole machine" },
  { stat: "4", label: "Core engines: clone, content, offers, revenue" },
  { stat: "6+", label: "Sellable outputs from a single drop" },
  { stat: "24/7", label: "Brand presence without needing a full staff" },
];

const creatorTypes = [
  { value: "adult_creator", label: "Adult creator or premium model" },
  { value: "agency", label: "Agency, manager, or studio" },
  { value: "content_creator", label: "Independent video creator" },
  { value: "brand", label: "Brand, product, or partner" },
];

export default function Home() {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [creatorType, setCreatorType] = useState("");
  const [isAudioPlaying, setIsAudioPlaying] = useState(false);
  const [heroVideoFailed, setHeroVideoFailed] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);

  const powerRef = useScrollReveal();
  const packagesRef = useScrollReveal();
  const workflowRef = useScrollReveal();
  const proofRef = useScrollReveal();
  const waitlistRef = useScrollReveal();

  const machineCount = useCounter(4, 1000, proofRef.visible);
  const outputCount = useCounter(6, 1000, proofRef.visible);
  const platformCount = useCounter(5, 1200, proofRef.visible);
  const startCount = useCounter(1, 800, proofRef.visible);

  const signupMutation = trpc.waitlist.signup.useMutation({
    onSuccess: () => {
      toast.success("You are on the CreatorVault early-access list.");
      setEmail("");
      setName("");
      setPhone("");
      setCreatorType("");
    },
    onError: (err) => {
      if (err.message.toLowerCase().includes("already")) {
        toast.success("You are already on the CreatorVault access list.");
        return;
      }
      toast.error(err.message || "Something went wrong.");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !name.trim()) return toast.error("Email and name are required.");
    signupMutation.mutate({
      email: email.trim(),
      name: name.trim(),
      phone: phone.trim() || undefined,
      referralSource: "homepage-polished-clone-stack",
      interestedIn: [creatorType || "creatorvault", "clone-stack", "vaultx", "content-factory"],
    });
  };

  const handleAudioUnlock = async () => {
    const audio = audioRef.current;
    if (!audio) return;
    try {
      audio.loop = true;
      audio.volume = 0;
      await audio.play();
      setIsAudioPlaying(true);
      const startedAt = window.performance.now();
      const fade = (now: number) => {
        const progress = Math.min(1, (now - startedAt) / 1500);
        audio.volume = progress * 0.46;
        if (progress < 1) window.requestAnimationFrame(fade);
      };
      window.requestAnimationFrame(fade);
    } catch {
      toast.error("Tap again to enable homepage audio.");
    }
  };

  return (
    <main style={{ background: "#050505", color: "#fff", minHeight: "100vh", overflowX: "hidden", fontFamily: "DM Sans, sans-serif" }}>
      <style>{`
        * { box-sizing: border-box; }
        body { background:#050505; }
        .cv-shell { max-width: 1180px; margin: 0 auto; }
        .cv-kicker { font-family: Space Mono, monospace; font-size: 10px; letter-spacing: .22em; color: #00D9FF; text-transform: uppercase; }
        .cv-title { font-family: Bebas Neue, sans-serif; letter-spacing: -.015em; text-transform: uppercase; }
        .cv-reveal { opacity: 0; transform: translateY(30px); transition: opacity .78s ease, transform .78s ease; }
        .cv-reveal.visible { opacity: 1; transform: translateY(0); }
        .cv-button { font-family: Bebas Neue, sans-serif; font-size: 18px; letter-spacing: .13em; text-transform: uppercase; padding: 16px 36px; cursor: pointer; transition: transform .25s ease, box-shadow .25s ease, border-color .25s ease; }
        .cv-button:hover { transform: translateY(-2px); }
        .cv-button-primary { color: #050505; background: #00D9FF; border: 1px solid #00D9FF; box-shadow: 0 0 40px rgba(0,217,255,.22); }
        .cv-button-ghost { color: #fff; background: rgba(255,255,255,.04); border: 1px solid rgba(255,255,255,.22); box-shadow: 0 0 30px rgba(255,255,255,.04); }
        .cv-output-strip::-webkit-scrollbar, .cv-package-strip::-webkit-scrollbar { display: none; }
        .cv-power-card, .cv-package-card, .cv-step, .cv-proof-card { transition: transform .28s ease, border-color .28s ease, box-shadow .28s ease; }
        .cv-power-card:hover, .cv-package-card:hover, .cv-proof-card:hover { transform: translateY(-8px); border-color: rgba(0,217,255,.42) !important; box-shadow: 0 28px 90px rgba(0,217,255,.10); }
        .cv-step:hover { transform: translateX(10px); }
        .cv-input:focus { outline:none; border-color: rgba(0,217,255,.68) !important; box-shadow: 0 0 0 3px rgba(0,217,255,.12); }
        @keyframes fadeUp { from { opacity: 0; transform: translateY(24px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes pulseCyan { 0%,100% { box-shadow: 0 0 28px rgba(0,217,255,.20); } 50% { box-shadow: 0 0 54px rgba(0,217,255,.36); } }
        @keyframes scanDown { from { top: -10%; } to { top: 110%; } }
        @keyframes float { 0%,100% { transform: translate(-50%, 0); } 50% { transform: translate(-50%, -8px); } }
        @media (max-width: 920px) {
          .cv-hero-layout { grid-template-columns: 1fr !important; align-items: end !important; }
          .cv-hero-proof { display: none !important; }
          .cv-packages-grid { grid-template-columns: 1fr !important; }
          .cv-workflow-grid { grid-template-columns: 1fr !important; }
          .cv-proof-grid { grid-template-columns: 1fr 1fr !important; }
          .cv-waitlist-grid { grid-template-columns: 1fr !important; }
        }
        @media (max-width: 720px) {
          .cv-nav { padding: 18px !important; }
          .cv-nav-actions { display: none !important; }
          .cv-hero { min-height: 100svh !important; }
          .cv-hero-copy { padding: 0 18px 70px !important; }
          .cv-hero-title { font-size: clamp(56px, 18vw, 88px) !important; }
          .cv-hero-subtitle { font-size: 16px !important; max-width: 100% !important; }
          .cv-hero-actions { flex-direction: column !important; align-items: stretch !important; }
          .cv-button { width: 100%; }
          .cv-power-grid { grid-template-columns: 1fr !important; }
          .cv-package-card { min-width: 86vw !important; }
          .cv-proof-grid { grid-template-columns: 1fr !important; }
          .cv-form-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>

      <audio ref={audioRef} src={VAULTX_HOMEPAGE_AUDIO} preload="auto" />
      <button
        type="button"
        onClick={handleAudioUnlock}
        aria-label="Unmute homepage audio"
        style={{
          position: "fixed",
          right: 18,
          bottom: 18,
          zIndex: 80,
          border: "1px solid rgba(0,217,255,.38)",
          background: isAudioPlaying ? "#00D9FF" : "rgba(10,10,10,.78)",
          color: isAudioPlaying ? "#050505" : "#00D9FF",
          padding: "12px 16px",
          fontFamily: "Space Mono, monospace",
          fontSize: 10,
          letterSpacing: ".16em",
          textTransform: "uppercase",
          cursor: "pointer",
          backdropFilter: "blur(18px)",
        }}
      >
        {isAudioPlaying ? "Audio on" : "Unmute"}
      </button>

      <section className="cv-hero" style={{ position: "relative", width: "100vw", minHeight: "100vh", overflow: "hidden", background: "#050505" }}>
        <nav className="cv-nav" style={{ position: "absolute", top: 0, left: 0, right: 0, zIndex: 30, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "22px 24px" }}>
          <Link href="/" style={{ display: "inline-flex", alignItems: "center", gap: 12, textDecoration: "none" }}>
            <img src="/logo-white.png" alt="CreatorVault" style={{ height: 28, objectFit: "contain" }} />
            <span style={{ fontFamily: "Space Mono, monospace", fontSize: 10, letterSpacing: ".18em", color: "#00D9FF", border: "1px solid rgba(0,217,255,.28)", padding: "6px 10px", background: "rgba(0,0,0,.34)", backdropFilter: "blur(14px)" }}>VAULTX</span>
          </Link>
          <div className="cv-nav-actions" style={{ display: "flex", gap: 16, alignItems: "center" }}>
            <Link href="#packages" style={{ color: "rgba(255,255,255,.78)", fontFamily: "Space Mono, monospace", fontSize: 11, letterSpacing: ".14em", textDecoration: "none", textTransform: "uppercase" }}>Packages</Link>
            <Link href="/vault-x/studio" style={{ color: "rgba(255,255,255,.78)", fontFamily: "Space Mono, monospace", fontSize: 11, letterSpacing: ".14em", textDecoration: "none", textTransform: "uppercase" }}>Studio</Link>
            <Link href="/login" style={{ color: "rgba(255,255,255,.78)", fontFamily: "Space Mono, monospace", fontSize: 11, letterSpacing: ".14em", textDecoration: "none", textTransform: "uppercase" }}>Log in</Link>
          </div>
        </nav>

        {!heroVideoFailed && (
          <video
            autoPlay
            muted
            loop
            playsInline
            preload="auto"
            onError={() => setHeroVideoFailed(true)}
            style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", objectPosition: "center top", filter: "brightness(0.70) contrast(1.16) saturate(1.22)" }}
          >
            <source src={KINGCAM_HERO_VIDEO} type="video/mp4" />
            <source src={VAULTX_HERO_VIDEO} type="video/mp4" />
            <source src={VAULTX_TRAILER_VIDEO} type="video/mp4" />
          </video>
        )}

        {heroVideoFailed && (
          <div style={{ position: "absolute", inset: 0, background: "radial-gradient(circle at 58% 18%,rgba(0,217,255,.24),transparent 30%),radial-gradient(circle at 18% 34%,rgba(201,168,76,.18),transparent 34%),linear-gradient(135deg,#050505,#111,#050505)" }} />
        )}

        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to bottom, rgba(5,5,5,.15) 0%, rgba(5,5,5,.08) 28%, rgba(5,5,5,.72) 72%, rgba(5,5,5,1) 100%), linear-gradient(to right, rgba(5,5,5,.80) 0%, rgba(5,5,5,.34) 46%, rgba(5,5,5,.10) 100%)" }} />
        <div style={{ position: "absolute", inset: 0, backgroundImage: "linear-gradient(rgba(0,217,255,.07) 1px, transparent 1px), linear-gradient(90deg, rgba(0,217,255,.045) 1px, transparent 1px)", backgroundSize: "72px 72px", maskImage: "linear-gradient(180deg,rgba(0,0,0,.38),transparent 72%)" }} />
        <div style={{ position: "absolute", left: 0, right: 0, height: 1, background: "linear-gradient(to right, transparent, #00D9FF, transparent)", opacity: 0.42, animation: "scanDown 8s linear infinite" }} />

        <div className="cv-hero-copy cv-shell" style={{ position: "relative", zIndex: 10, minHeight: "100vh", display: "grid", alignItems: "end", padding: "120px 24px 82px" }}>
          <div className="cv-hero-layout" style={{ display: "grid", gridTemplateColumns: "minmax(0, 1.06fr) 420px", gap: 32, alignItems: "end", width: "100%" }}>
            <div>
              <p className="cv-kicker" style={{ marginBottom: 14, animation: "fadeUp .62s ease forwards", animationDelay: ".14s", opacity: 0 }}>Clone-powered creator revenue OS</p>
              <h1 className="cv-title cv-hero-title" style={{ fontSize: "clamp(66px, 10vw, 124px)", lineHeight: .86, color: "#fff", margin: "0 0 22px", maxWidth: 850, animation: "fadeUp .62s ease forwards", animationDelay: ".28s", opacity: 0 }}>
                YOUR CONTENT.<br />YOUR CLONE.<br />YOUR MONEY MACHINE.
              </h1>
              <p className="cv-hero-subtitle" style={{ fontSize: 18, color: "rgba(255,255,255,.76)", maxWidth: 620, lineHeight: 1.62, marginBottom: 30, animation: "fadeUp .62s ease forwards", animationDelay: ".44s", opacity: 0 }}>
                CreatorVault turns your video, voice, offers, and audience into a premium content factory with a trained clone, VaultX drops, fan funnels, and revenue proof under one roof.
              </p>
              <div className="cv-hero-actions" style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap", animation: "fadeUp .62s ease forwards", animationDelay: ".58s", opacity: 0 }}>
                <CyanButton href="#waitlist">Build My Vault</CyanButton>
                <CyanButton href="#packages" variant="ghost">See Packages</CyanButton>
              </div>
            </div>

            <aside className="cv-hero-proof" style={{ border: "1px solid rgba(255,255,255,.13)", background: "linear-gradient(180deg,rgba(10,10,10,.72),rgba(10,10,10,.42))", backdropFilter: "blur(18px)", padding: 22, boxShadow: "0 26px 90px rgba(0,0,0,.34)", animation: "fadeUp .7s ease forwards", animationDelay: ".7s", opacity: 0 }}>
              <p className="cv-kicker" style={{ color: "#C9A84C", marginBottom: 18 }}>What they feel in 30 seconds</p>
              {[
                "This can help me sell, not just post.",
                "My clone can carry my brand when I am not online.",
                "My content becomes packages, promos, and paid drops.",
                "This looks like a serious creator business system.",
              ].map((line) => (
                <div key={line} style={{ display: "flex", gap: 12, padding: "13px 0", borderTop: "1px solid rgba(255,255,255,.08)" }}>
                  <span style={{ color: "#00D9FF", fontFamily: "Space Mono, monospace" }}>◆</span>
                  <p style={{ margin: 0, color: "rgba(255,255,255,.78)", lineHeight: 1.45 }}>{line}</p>
                </div>
              ))}
            </aside>
          </div>
        </div>

        <div style={{ position: "absolute", bottom: 20, left: "50%", transform: "translateX(-50%)", display: "flex", flexDirection: "column", alignItems: "center", gap: 6, animation: "float 2s ease-in-out infinite", opacity: .72 }}>
          <div style={{ width: 1, height: 34, background: "linear-gradient(to bottom, #00D9FF, transparent)" }} />
        </div>
      </section>

      <section ref={powerRef.ref} style={{ background: "#050505", padding: "82px 24px 72px", overflow: "hidden" }}>
        <div className={`cv-shell cv-reveal ${powerRef.visible ? "visible" : ""}`}>
          <p className="cv-kicker" style={{ marginBottom: 22 }}>The platform at a glance</p>
          <h2 className="cv-title" style={{ fontSize: "clamp(44px, 8vw, 86px)", lineHeight: .9, color: "#fff", margin: "0 0 24px", maxWidth: 860 }}>
            Not another tool. A whole creator business in motion.
          </h2>
          <p style={{ color: "rgba(255,255,255,.62)", fontSize: 17, lineHeight: 1.72, maxWidth: 700, marginBottom: 38 }}>
            Your video is the spark. CreatorVault is the engine around it. Clone your presence, package your content, distribute the drop, track the money, and repeat with a cleaner system every time.
          </p>
          <div className="cv-power-grid" style={{ display: "grid", gridTemplateColumns: "repeat(4,minmax(0,1fr))", gap: 12 }}>
            {powerStrip.map((item, i) => (
              <article key={item.label} className="cv-power-card" style={{ minHeight: 210, border: "1px solid rgba(255,255,255,.08)", background: "linear-gradient(180deg,rgba(255,255,255,.055),rgba(255,255,255,.018))", padding: 22, position: "relative", overflow: "hidden", transitionDelay: `${i * 40}ms` }}>
                <div style={{ position: "absolute", inset: "auto -24px -44px auto", width: 100, height: 100, borderRadius: "50%", background: i % 2 ? "rgba(201,168,76,.16)" : "rgba(0,217,255,.16)", filter: "blur(14px)" }} />
                <p className="cv-kicker" style={{ color: i % 2 ? "#C9A84C" : "#00D9FF", marginBottom: 18 }}>{item.label}</p>
                <h3 className="cv-title" style={{ position: "relative", fontSize: 30, lineHeight: 1, margin: 0 }}>{item.title}</h3>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="packages" ref={packagesRef.ref} style={{ background: "#0A0A0A", padding: "88px 24px", borderTop: "1px solid rgba(255,255,255,.06)", borderBottom: "1px solid rgba(255,255,255,.06)", overflow: "hidden" }}>
        <div className={`cv-shell cv-reveal ${packagesRef.visible ? "visible" : ""}`}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 24, alignItems: "end", flexWrap: "wrap", marginBottom: 38 }}>
            <div>
              <p className="cv-kicker" style={{ marginBottom: 18 }}>Dopest packages</p>
              <h2 className="cv-title" style={{ fontSize: "clamp(44px, 8vw, 84px)", lineHeight: .9, margin: 0, maxWidth: 720 }}>
                Pick the lane. CreatorVault builds the machine.
              </h2>
            </div>
            <p style={{ color: "rgba(255,255,255,.62)", lineHeight: 1.68, maxWidth: 380, margin: 0 }}>
              Every lane gives the creator a clear outcome immediately: launch the first drop, build the clone, run the content machine, or command the full empire system.
            </p>
          </div>

          <div className="cv-package-strip cv-packages-grid" style={{ display: "grid", gridTemplateColumns: "repeat(4,minmax(0,1fr))", gap: 14, overflowX: "auto", scrollbarWidth: "none", paddingBottom: 8 }}>
            {packages.map((pkg) => (
              <article key={pkg.name} className="cv-package-card" style={{ minWidth: 260, border: `1px solid ${pkg.featured ? "rgba(201,168,76,.55)" : "rgba(255,255,255,.10)"}`, background: pkg.featured ? "linear-gradient(180deg,rgba(201,168,76,.14),rgba(255,255,255,.025))" : "linear-gradient(180deg,rgba(255,255,255,.055),rgba(255,255,255,.018))", padding: 22, minHeight: 480, display: "flex", flexDirection: "column", position: "relative", overflow: "hidden" }}>
                {pkg.featured && <span style={{ position: "absolute", top: 16, right: 16, fontFamily: "Space Mono, monospace", fontSize: 9, letterSpacing: ".14em", color: "#050505", background: "#C9A84C", padding: "7px 9px", textTransform: "uppercase" }}>Flagship</span>}
                <p className="cv-kicker" style={{ color: pkg.accent, marginBottom: 16 }}>{pkg.tag}</p>
                <h3 className="cv-title" style={{ fontSize: 42, lineHeight: .92, margin: "0 0 14px" }}>{pkg.name}</h3>
                <p style={{ fontFamily: "Space Mono, monospace", fontSize: 12, color: pkg.accent, letterSpacing: ".08em", textTransform: "uppercase", margin: "0 0 18px" }}>{pkg.price}</p>
                <p style={{ color: "rgba(255,255,255,.66)", lineHeight: 1.62, margin: "0 0 24px" }}>{pkg.line}</p>
                <div style={{ display: "grid", gap: 13, marginTop: "auto" }}>
                  {pkg.includes.map((item) => (
                    <div key={item} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                      <span style={{ color: pkg.accent, fontFamily: "Space Mono, monospace", lineHeight: 1.3 }}>✦</span>
                      <p style={{ margin: 0, color: "rgba(255,255,255,.78)", lineHeight: 1.45, fontSize: 14 }}>{item}</p>
                    </div>
                  ))}
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section ref={workflowRef.ref} style={{ background: "#050505", padding: "92px 24px" }}>
        <div className={`cv-shell cv-reveal ${workflowRef.visible ? "visible" : ""} cv-workflow-grid`} style={{ display: "grid", gridTemplateColumns: "0.9fr 1.1fr", gap: 42, alignItems: "start" }}>
          <div style={{ position: "sticky", top: 92 }}>
            <p className="cv-kicker" style={{ marginBottom: 18 }}>How the money machine moves</p>
            <h2 className="cv-title" style={{ fontSize: "clamp(44px, 8vw, 84px)", lineHeight: .9, color: "#fff", margin: "0 0 20px" }}>
              From raw attention to paid motion.
            </h2>
            <p style={{ color: "rgba(255,255,255,.62)", fontSize: 17, lineHeight: 1.72, maxWidth: 480 }}>
              The path stays simple without watering down the power: feed it, clone it, package it, push what pays, and keep tightening the loop.
            </p>
          </div>

          <div>
            {workflowSteps.map((step, i) => (
              <div key={step.n} className="cv-step" style={{ display: "flex", gap: 24, alignItems: "flex-start", marginBottom: 34, padding: "0 0 34px", borderBottom: i < workflowSteps.length - 1 ? "1px solid rgba(255,255,255,.07)" : "none" }}>
                <span className="cv-title" style={{ fontSize: 54, color: i % 2 ? "#C9A84C" : "#00D9FF", lineHeight: .9, opacity: .72, minWidth: 62 }}>{step.n}</span>
                <div>
                  <h3 className="cv-title" style={{ fontSize: 34, color: "#FFFFFF", margin: "0 0 10px" }}>{step.title}</h3>
                  <p style={{ fontSize: 16, color: "rgba(255,255,255,.62)", lineHeight: 1.65, maxWidth: 520, margin: 0 }}>{step.body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section ref={proofRef.ref} style={{ position: "relative", padding: "94px 24px", background: "#0A0A0A", overflow: "hidden", borderTop: "1px solid rgba(255,255,255,.06)" }}>
        <video autoPlay muted loop playsInline preload="metadata" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", opacity: 0.18, filter: "saturate(1.15) contrast(1.08)" }}>
          <source src={VAULTX_TRAILER_VIDEO} type="video/mp4" />
          <source src={VAULTX_HERO_VIDEO} type="video/mp4" />
        </video>
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(90deg,#0A0A0A 0%,rgba(10,10,10,.72) 48%,rgba(10,10,10,.95) 100%)" }} />
        <div className={`cv-shell cv-reveal ${proofRef.visible ? "visible" : ""}`} style={{ position: "relative" }}>
          <p className="cv-kicker" style={{ marginBottom: 18 }}>Proof without the lecture</p>
          <h2 className="cv-title" style={{ fontSize: "clamp(44px, 8vw, 88px)", lineHeight: .9, margin: "0 0 22px", maxWidth: 900 }}>
            The user sees the outcome before they ask how it works.
          </h2>
          <p style={{ color: "rgba(255,255,255,.64)", fontSize: 17, lineHeight: 1.7, maxWidth: 640, marginBottom: 34 }}>
            CreatorVault presents itself like the business engine it is: not a pile of features, but a premium system for creators who want attention to become income.
          </p>
          <div className="cv-proof-grid" style={{ display: "grid", gridTemplateColumns: "repeat(4,minmax(0,1fr))", gap: 12 }}>
            {[
              { value: startCount, suffix: "", label: proofTiles[0].label },
              { value: machineCount, suffix: "", label: proofTiles[1].label },
              { value: outputCount, suffix: "+", label: proofTiles[2].label },
              { value: platformCount, suffix: "+", label: "Channels ready for distribution" },
            ].map((m, i) => (
              <article key={m.label} className="cv-proof-card" style={{ padding: "30px 18px", textAlign: "center", border: "1px solid rgba(255,255,255,.09)", background: "rgba(255,255,255,.035)", backdropFilter: "blur(12px)", transitionDelay: `${i * 60}ms` }}>
                <div className="cv-title" style={{ fontSize: "clamp(48px,7vw,78px)", color: i % 2 ? "#C9A84C" : "#00D9FF", lineHeight: .9 }}>{m.value}{m.suffix}</div>
                <p style={{ fontFamily: "Space Mono, monospace", color: "rgba(255,255,255,.56)", fontSize: 10, letterSpacing: ".13em", lineHeight: 1.5, margin: "14px 0 0", textTransform: "uppercase" }}>{m.label}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="waitlist" ref={waitlistRef.ref} style={{ position: "relative", padding: "92px 24px 104px", background: "#050505", overflow: "hidden" }}>
        <div style={{ position: "absolute", inset: 0, background: "radial-gradient(circle at 50% 0%,rgba(0,217,255,.18),transparent 34%),radial-gradient(circle at 12% 82%,rgba(201,168,76,.13),transparent 34%)" }} />
        <div className={`cv-shell cv-reveal cv-waitlist-grid ${waitlistRef.visible ? "visible" : ""}`} style={{ position: "relative", display: "grid", gridTemplateColumns: "minmax(0, 620px) minmax(320px, 460px)", gap: 34, alignItems: "center" }}>
          <div>
            <p className="cv-kicker" style={{ marginBottom: 18 }}>Join CreatorVault</p>
            <h2 className="cv-title" style={{ fontSize: "clamp(46px,9vw,86px)", lineHeight: .9, color: "#FFFFFF", margin: "0 0 20px" }}>Bring the content. Leave with the machine.</h2>
            <p style={{ color: "rgba(255,255,255,.66)", fontSize: 17, lineHeight: 1.72, marginBottom: 28, maxWidth: 560 }}>
              Apply for access and choose your lane. CreatorVault should feel like the cheat code: build your clone, package your drops, push across platforms, and track what earns.
            </p>
            <div style={{ display: "grid", gap: 12, maxWidth: 520 }}>
              {[
                "For solo creators who need to look bigger than their current team.",
                "For premium models and studios who need better drops, faster.",
                "For builders who want the clone stack and content factory as their edge.",
              ].map((line) => (
                <p key={line} style={{ margin: 0, color: "rgba(255,255,255,.76)", lineHeight: 1.5 }}><span style={{ color: "#00D9FF", marginRight: 8 }}>◆</span>{line}</p>
              ))}
            </div>
          </div>

          <form onSubmit={handleSubmit} style={{ display: "grid", gap: 14, padding: 24, border: "1px solid rgba(0,217,255,.22)", background: "rgba(16,16,16,.82)", backdropFilter: "blur(20px)", boxShadow: "0 30px 110px rgba(0,0,0,.32)" }}>
            <p className="cv-kicker" style={{ color: "#C9A84C", margin: "0 0 4px" }}>Request your build lane</p>
            <input className="cv-input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" style={{ width: "100%", background: "#050505", border: "1px solid rgba(255,255,255,.12)", color: "#fff", padding: "15px 16px", fontFamily: "DM Sans, sans-serif", fontSize: 14 }} />
            <div className="cv-form-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <input className="cv-input" type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Name" style={{ width: "100%", background: "#050505", border: "1px solid rgba(255,255,255,.12)", color: "#fff", padding: "15px 16px", fontFamily: "DM Sans, sans-serif", fontSize: 14 }} />
              <input className="cv-input" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Phone optional" style={{ width: "100%", background: "#050505", border: "1px solid rgba(255,255,255,.12)", color: "#fff", padding: "15px 16px", fontFamily: "DM Sans, sans-serif", fontSize: 14 }} />
            </div>
            <select className="cv-input" value={creatorType} onChange={(e) => setCreatorType(e.target.value)} style={{ width: "100%", background: "#050505", border: "1px solid rgba(255,255,255,.12)", color: creatorType ? "#fff" : "rgba(255,255,255,.42)", padding: "15px 16px", fontFamily: "DM Sans, sans-serif", fontSize: 14 }}>
              <option value="" style={{ background: "#050505" }}>Select your lane</option>
              {creatorTypes.map((ct) => <option key={ct.value} value={ct.value} style={{ background: "#050505" }}>{ct.label}</option>)}
            </select>
            <CyanButton submit disabled={signupMutation.isPending}>{signupMutation.isPending ? "Creating..." : "Build My Vault"}</CyanButton>
            <p style={{ margin: 0, color: "rgba(255,255,255,.42)", fontSize: 12, lineHeight: 1.5 }}>
              Early access is for creators, studios, and partners serious about turning attention into a repeatable revenue system.
            </p>
          </form>
        </div>
      </section>

      <footer style={{ borderTop: "1px solid rgba(255,255,255,.06)", padding: "34px 20px", textAlign: "center", background: "#050505" }}>
        <img src="/logo-white.png" alt="CreatorVault" style={{ height: 24, objectFit: "contain", opacity: .62, marginBottom: 12 }} />
        <p style={{ fontFamily: "Space Mono, monospace", fontSize: 10, color: "rgba(255,255,255,.34)", letterSpacing: ".12em", textTransform: "uppercase", marginBottom: 12 }}>CreatorVault · clone stack · VaultX · premium creator revenue OS · 18+ only</p>
        <nav aria-label="Legal and launch links" style={{ display: "flex", justifyContent: "center", gap: 14, flexWrap: "wrap", fontSize: 12 }}>
          {[["Terms", "/terms"], ["Privacy", "/privacy"], ["DMCA", "/dmca"], ["2257", "/2257"], ["Request Access", "/signup"]].map(([label, href]) => (
            <Link key={href} href={href} style={{ color: "rgba(255,255,255,.52)", textDecoration: "none" }}>{label}</Link>
          ))}
        </nav>
      </footer>
    </main>
  );
}
