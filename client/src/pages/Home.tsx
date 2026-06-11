import { useEffect, useRef, useState, type ReactNode } from "react";
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

function CyanButton({ href, children, submit = false, disabled = false }: { href?: string; children: ReactNode; submit?: boolean; disabled?: boolean }) {
  const button = (
    <button
      type={submit ? "submit" : "button"}
      disabled={disabled}
      style={{
        fontFamily: "Bebas Neue, sans-serif",
        fontSize: 18,
        letterSpacing: "0.12em",
        color: "#0A0A0A",
        background: disabled ? "rgba(0,217,255,0.45)" : "#00D9FF",
        border: "none",
        padding: "16px 40px",
        cursor: disabled ? "not-allowed" : "pointer",
        animation: disabled ? "none" : "fadeUp 0.6s ease forwards, pulseCyan 2.5s ease infinite",
        animationDelay: "0.8s",
        opacity: disabled ? 1 : 0,
        textTransform: "uppercase",
        boxShadow: "0 0 34px rgba(0,217,255,.22)",
      }}
    >
      {children}
    </button>
  );

  return href ? <Link href={href}>{button}</Link> : button;
}

const outputStrip = [
  { label: "TEASER", title: "Public preview cut", color: "#00D9FF" },
  { label: "PPV DROP", title: "Paid unlock package", color: "#C9A84C" },
  { label: "CAPTIONS", title: "Hook + DM copy set", color: "#00D9FF" },
  { label: "PLATFORM PACK", title: "OF, Fansly, Telegram, X", color: "#C9A84C" },
  { label: "AI STUDIO", title: "Motion promos + covers", color: "#00D9FF" },
  { label: "VAULT", title: "Campaign archive", color: "#C9A84C" },
];

const workflowSteps = [
  { n: "01", title: "Upload your clip", body: "Raw phone footage, a selfie video, anything. VaultX handles the rest." },
  { n: "02", title: "AI builds your package", body: "Teaser cut, PPV bundle, captions, platform exports — generated automatically." },
  { n: "03", title: "Push to every platform", body: "OnlyFans, Fansly, Telegram, Twitter, and your VaultX profile in one click." },
  { n: "04", title: "Track what earns", body: "Live revenue dashboard. See every sale, subscriber, and PPV unlock in real time." },
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

  const outputsRef = useScrollReveal();
  const workflowRef = useScrollReveal();
  const proofRef = useScrollReveal();
  const metricsRef = useScrollReveal();
  const waitlistRef = useScrollReveal();

  const revenueShare = useCounter(70, 1300, metricsRef.visible);
  const outputTypes = useCounter(6, 1000, metricsRef.visible);
  const platforms = useCounter(4, 1000, metricsRef.visible);
  const upload = useCounter(1, 800, metricsRef.visible);

  const signupMutation = trpc.waitlist.signup.useMutation({
    onSuccess: () => {
      toast.success("You are on the VaultX early-access list.");
      setEmail("");
      setName("");
      setPhone("");
      setCreatorType("");
    },
    onError: (err) => {
      if (err.message.toLowerCase().includes("already")) {
        toast.success("You are already on the VaultX access list.");
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
      referralSource: "homepage-cinematic-vaultx",
      interestedIn: [creatorType || "vaultx", "video-first-workflow", "creatorvault"],
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
    <main style={{ background: "#0A0A0A", color: "#fff", minHeight: "100vh", overflowX: "hidden", fontFamily: "DM Sans, sans-serif" }}>
      <style>{`
        * { box-sizing: border-box; }
        body { background:#0A0A0A; }
        .cv-shell { max-width: 1180px; margin: 0 auto; }
        .cv-reveal { opacity: 0; transform: translateY(28px); transition: opacity .72s ease, transform .72s ease; }
        .cv-reveal.visible { opacity: 1; transform: translateY(0); }
        .cv-output-strip::-webkit-scrollbar { display: none; }
        .cv-output-card { transition: transform .25s ease, border-color .25s ease, box-shadow .25s ease; }
        .cv-output-card:hover { transform: translateY(-10px); border-color: rgba(0,217,255,.42) !important; box-shadow: 0 28px 80px rgba(0,217,255,.10); }
        .cv-step { transition: transform .35s ease, opacity .35s ease; }
        .cv-step:hover { transform: translateX(10px); }
        .cv-input:focus { outline:none; border-color: rgba(0,217,255,.65) !important; box-shadow: 0 0 0 3px rgba(0,217,255,.12); }
        @media (max-width: 720px) {
          .cv-nav { padding: 18px !important; }
          .cv-nav-actions { display: none !important; }
          .cv-hero-copy { bottom: 68px !important; }
          .cv-workflow-step { gap: 18px !important; }
          .cv-metrics { grid-template-columns: 1fr 1fr !important; }
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
          color: isAudioPlaying ? "#0A0A0A" : "#00D9FF",
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

      <section style={{ position: "relative", width: "100vw", height: "100vh", overflow: "hidden", background: "#0A0A0A" }}>
        <nav className="cv-nav" style={{ position: "absolute", top: 0, left: 0, right: 0, zIndex: 30, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "22px 24px" }}>
          <Link href="/" style={{ display: "inline-flex", alignItems: "center", gap: 12, textDecoration: "none" }}>
            <img src="/logo-white.png" alt="CreatorVault" style={{ height: 28, objectFit: "contain" }} />
            <span style={{ fontFamily: "Space Mono, monospace", fontSize: 10, letterSpacing: ".18em", color: "#00D9FF", border: "1px solid rgba(0,217,255,.28)", padding: "6px 10px" }}>VAULTX</span>
          </Link>
          <div className="cv-nav-actions" style={{ display: "flex", gap: 10 }}>
            <Link href="/vault-x/studio" style={{ color: "rgba(255,255,255,.74)", fontFamily: "Space Mono, monospace", fontSize: 11, letterSpacing: ".14em", textDecoration: "none", textTransform: "uppercase" }}>Studio</Link>
            <Link href="/login" style={{ color: "rgba(255,255,255,.74)", fontFamily: "Space Mono, monospace", fontSize: 11, letterSpacing: ".14em", textDecoration: "none", textTransform: "uppercase" }}>Log in</Link>
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
            style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", objectPosition: "center top", filter: "brightness(0.75) contrast(1.1) saturate(1.2)" }}
          >
            <source src={KINGCAM_HERO_VIDEO} type="video/mp4" />
            <source src={VAULTX_HERO_VIDEO} type="video/mp4" />
            <source src={VAULTX_TRAILER_VIDEO} type="video/mp4" />
          </video>
        )}

        {heroVideoFailed && (
          <div style={{ position: "absolute", inset: 0, background: "radial-gradient(circle at 58% 18%,rgba(0,217,255,.24),transparent 30%),radial-gradient(circle at 18% 34%,rgba(201,168,76,.18),transparent 34%),linear-gradient(135deg,#0A0A0A,#111,#050505)" }} />
        )}

        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to bottom, rgba(10,10,10,0) 0%, rgba(10,10,10,0) 40%, rgba(10,10,10,0.6) 70%, rgba(10,10,10,1) 100%), linear-gradient(to right, rgba(10,10,10,0.5) 0%, rgba(10,10,10,0) 50%)" }} />
        <div style={{ position: "absolute", inset: 0, backgroundImage: "linear-gradient(rgba(0,217,255,.07) 1px, transparent 1px), linear-gradient(90deg, rgba(0,217,255,.05) 1px, transparent 1px)", backgroundSize: "72px 72px", maskImage: "linear-gradient(180deg,rgba(0,0,0,.24),transparent 68%)" }} />
        <div style={{ position: "absolute", left: 0, right: 0, height: 1, background: "linear-gradient(to right, transparent, #00D9FF, transparent)", opacity: 0.4, animation: "scanDown 8s linear infinite" }} />

        <div className="cv-hero-copy" style={{ position: "absolute", bottom: 80, left: 24, right: 24, zIndex: 10 }}>
          <p style={{ fontFamily: "Space Mono, monospace", fontSize: 10, letterSpacing: "0.2em", color: "#00D9FF", marginBottom: 12, animation: "fadeUp 0.6s ease forwards", animationDelay: "0.2s", opacity: 0 }}>VIDEO-FIRST CREATOR PLATFORM</p>
          <h1 style={{ fontFamily: "Bebas Neue, sans-serif", fontSize: "clamp(52px, 12vw, 88px)", lineHeight: 0.95, color: "#FFFFFF", margin: "0 0 20px 0", animation: "fadeUp 0.6s ease forwards", animationDelay: "0.4s", opacity: 0 }}>
            YOUR VIDEO.<br />YOUR EMPIRE.
          </h1>
          <p style={{ fontFamily: "DM Sans, sans-serif", fontSize: 16, color: "rgba(255,255,255,0.7)", maxWidth: 360, lineHeight: 1.5, marginBottom: 32, animation: "fadeUp 0.6s ease forwards", animationDelay: "0.6s", opacity: 0 }}>
            Upload once. VaultX builds your teaser, PPV drop, and distribution — automatically.
          </p>
          <CyanButton href="#waitlist">Start Creating Free</CyanButton>
        </div>

        <div style={{ position: "absolute", bottom: 24, left: "50%", transform: "translateX(-50%)", display: "flex", flexDirection: "column", alignItems: "center", gap: 6, animation: "float 2s ease-in-out infinite" }}>
          <div style={{ width: 1, height: 32, background: "linear-gradient(to bottom, #00D9FF, transparent)" }} />
        </div>
      </section>

      <section ref={outputsRef.ref} style={{ background: "#0A0A0A", padding: "80px 24px", overflow: "hidden" }}>
        <div className={`cv-shell cv-reveal ${outputsRef.visible ? "visible" : ""}`}>
          <p style={{ fontFamily: "Space Mono, monospace", fontSize: 10, letterSpacing: "0.2em", color: "#00D9FF", marginBottom: 24 }}>ONE UPLOAD. SIX OUTPUTS.</p>
          <h2 style={{ fontFamily: "Bebas Neue, sans-serif", fontSize: "clamp(40px, 10vw, 72px)", lineHeight: 0.95, color: "#FFFFFF", marginBottom: 48 }}>
            Everything your<br />drop needs to sell.
          </h2>
          <div className="cv-output-strip" style={{ display: "flex", gap: 12, overflowX: "auto", scrollSnapType: "x mandatory", paddingBottom: 16, scrollbarWidth: "none" }}>
            {outputStrip.map((item, i) => (
              <div key={item.label} className="cv-output-card" style={{ minWidth: 200, scrollSnapAlign: "start", background: "#1A1A1A", border: "1px solid rgba(255,255,255,0.06)", borderTop: `2px solid ${item.color}`, padding: "24px 20px", borderRadius: 4, flexShrink: 0, transitionDelay: `${i * 40}ms` }}>
                <p style={{ fontFamily: "Space Mono, monospace", fontSize: 9, letterSpacing: "0.15em", color: item.color, marginBottom: 12 }}>{item.label}</p>
                <p style={{ fontFamily: "Bebas Neue, sans-serif", fontSize: 22, color: "#FFFFFF", lineHeight: 1.1, margin: 0 }}>{item.title}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section ref={workflowRef.ref} style={{ background: "#111111", padding: "80px 24px" }}>
        <div className={`cv-shell cv-reveal ${workflowRef.visible ? "visible" : ""}`}>
          <p style={{ fontFamily: "Space Mono, monospace", fontSize: 10, letterSpacing: "0.2em", color: "#00D9FF", marginBottom: 24 }}>THE WORKFLOW</p>
          <h2 style={{ fontFamily: "Bebas Neue, sans-serif", fontSize: "clamp(40px, 10vw, 72px)", lineHeight: 0.95, color: "#FFFFFF", marginBottom: 48 }}>
            Four steps.<br />One paid drop.
          </h2>
          {workflowSteps.map((step, i) => (
            <div key={step.n} className="cv-step cv-workflow-step" style={{ display: "flex", gap: 24, alignItems: "flex-start", marginBottom: 40, paddingBottom: 40, borderBottom: i < 3 ? "1px solid rgba(255,255,255,0.06)" : "none" }}>
              <span style={{ fontFamily: "Bebas Neue, sans-serif", fontSize: 48, color: "#00D9FF", lineHeight: 1, opacity: 0.4, minWidth: 56 }}>{step.n}</span>
              <div>
                <h3 style={{ fontFamily: "Bebas Neue, sans-serif", fontSize: 28, color: "#FFFFFF", marginBottom: 8 }}>{step.title}</h3>
                <p style={{ fontFamily: "DM Sans, sans-serif", fontSize: 15, color: "rgba(255,255,255,0.6)", lineHeight: 1.6, maxWidth: 400 }}>{step.body}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section ref={proofRef.ref} style={{ position: "relative", padding: "90px 24px", background: "#0A0A0A", overflow: "hidden", borderTop: "1px solid rgba(255,255,255,.06)" }}>
        <video autoPlay muted loop playsInline preload="metadata" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", opacity: 0.2, filter: "saturate(1.15) contrast(1.08)" }}>
          <source src={VAULTX_TRAILER_VIDEO} type="video/mp4" />
          <source src={VAULTX_HERO_VIDEO} type="video/mp4" />
        </video>
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(90deg,#0A0A0A 0%,rgba(10,10,10,.72) 48%,rgba(10,10,10,.95) 100%)" }} />
        <div className={`cv-shell cv-reveal ${proofRef.visible ? "visible" : ""}`} style={{ position: "relative", display: "grid", gap: 24 }}>
          <p style={{ fontFamily: "Space Mono, monospace", fontSize: 10, letterSpacing: "0.2em", color: "#00D9FF" }}>MONETIZE THE MOTION</p>
          <h2 style={{ fontFamily: "Bebas Neue, sans-serif", fontSize: "clamp(42px, 9vw, 82px)", lineHeight: .92, margin: 0, maxWidth: 820 }}>The content is the product. The system turns it into revenue.</h2>
          <p style={{ color: "rgba(255,255,255,.62)", fontSize: 17, lineHeight: 1.7, maxWidth: 540 }}>VaultX keeps the video in front, builds the sellable package around it, and routes the campaign to the audience that is ready to pay.</p>
        </div>
      </section>

      <section ref={metricsRef.ref} style={{ background: "#050505", borderTop: "1px solid rgba(255,255,255,.06)", borderBottom: "1px solid rgba(255,255,255,.06)" }}>
        <div className="cv-shell cv-metrics" style={{ display: "grid", gridTemplateColumns: "repeat(4,minmax(0,1fr))" }}>
          {[
            { value: revenueShare, suffix: "%", label: "CREATOR REVENUE SHARE" },
            { value: outputTypes, suffix: "+", label: "OUTPUT TYPES PER DROP" },
            { value: platforms, suffix: "", label: "PLATFORMS AT ONCE" },
            { value: upload, suffix: "", label: "UPLOAD TO START" },
          ].map((m, i) => (
            <div key={m.label} className={`cv-reveal ${metricsRef.visible ? "visible" : ""}`} style={{ padding: "38px 16px", textAlign: "center", borderRight: i < 3 ? "1px solid rgba(255,255,255,.06)" : "none", transitionDelay: `${i * 70}ms` }}>
              <div style={{ fontFamily: "Bebas Neue, sans-serif", fontSize: "clamp(42px,7vw,72px)", color: "#00D9FF", lineHeight: .9 }}>{m.value}{m.suffix}</div>
              <p style={{ fontFamily: "Space Mono, monospace", color: "rgba(255,255,255,.52)", fontSize: 10, letterSpacing: ".14em", marginTop: 12 }}>{m.label}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="waitlist" ref={waitlistRef.ref} style={{ position: "relative", padding: "88px 24px 96px", background: "#0A0A0A", overflow: "hidden" }}>
        <div style={{ position: "absolute", inset: 0, background: "radial-gradient(circle at 50% 0%,rgba(0,217,255,.16),transparent 34%),radial-gradient(circle at 12% 82%,rgba(201,168,76,.10),transparent 32%)" }} />
        <div className={`cv-shell cv-reveal ${waitlistRef.visible ? "visible" : ""}`} style={{ position: "relative", maxWidth: 650 }}>
          <p style={{ fontFamily: "Space Mono, monospace", fontSize: 10, letterSpacing: "0.2em", color: "#00D9FF", marginBottom: 18 }}>JOIN CREATORVAULT</p>
          <h2 style={{ fontFamily: "Bebas Neue, sans-serif", fontSize: "clamp(42px,10vw,76px)", lineHeight: .94, color: "#FFFFFF", marginBottom: 18 }}>Your first drop is free.</h2>
          <p style={{ color: "rgba(255,255,255,.64)", fontSize: 17, lineHeight: 1.68, marginBottom: 34 }}>Sign up, upload your first video, and VaultX builds your teaser and PPV package — no production experience needed.</p>
          <form onSubmit={handleSubmit} style={{ display: "grid", gap: 14, padding: 22, border: "1px solid rgba(0,217,255,.18)", background: "rgba(26,26,26,.76)", backdropFilter: "blur(18px)" }}>
            <input className="cv-input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" style={{ width: "100%", background: "#0A0A0A", border: "1px solid rgba(255,255,255,.10)", color: "#fff", padding: "14px 15px", fontFamily: "DM Sans, sans-serif", fontSize: 14 }} />
            <div className="cv-form-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <input className="cv-input" type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Name" style={{ width: "100%", background: "#0A0A0A", border: "1px solid rgba(255,255,255,.10)", color: "#fff", padding: "14px 15px", fontFamily: "DM Sans, sans-serif", fontSize: 14 }} />
              <input className="cv-input" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Phone optional" style={{ width: "100%", background: "#0A0A0A", border: "1px solid rgba(255,255,255,.10)", color: "#fff", padding: "14px 15px", fontFamily: "DM Sans, sans-serif", fontSize: 14 }} />
            </div>
            <select className="cv-input" value={creatorType} onChange={(e) => setCreatorType(e.target.value)} style={{ width: "100%", background: "#0A0A0A", border: "1px solid rgba(255,255,255,.10)", color: creatorType ? "#fff" : "rgba(255,255,255,.42)", padding: "14px 15px", fontFamily: "DM Sans, sans-serif", fontSize: 14 }}>
              <option value="" style={{ background: "#0A0A0A" }}>Select your lane</option>
              {creatorTypes.map((ct) => <option key={ct.value} value={ct.value} style={{ background: "#0A0A0A" }}>{ct.label}</option>)}
            </select>
            <div style={{ marginTop: 6 }}>
              <CyanButton submit disabled={signupMutation.isPending}>{signupMutation.isPending ? "Creating..." : "Create Your Account"}</CyanButton>
            </div>
          </form>
        </div>
      </section>

      <footer style={{ borderTop: "1px solid rgba(255,255,255,.06)", padding: "32px 20px", textAlign: "center", background: "#050505" }}>
        <img src="/logo-white.png" alt="CreatorVault" style={{ height: 24, objectFit: "contain", opacity: .58, marginBottom: 12 }} />
        <p style={{ fontFamily: "Space Mono, monospace", fontSize: 10, color: "rgba(255,255,255,.28)", letterSpacing: ".12em", textTransform: "uppercase", marginBottom: 12 }}>CreatorVault · VaultX premium creator revenue OS · 18+ only</p>
        <nav aria-label="Legal and launch links" style={{ display: "flex", justifyContent: "center", gap: 14, flexWrap: "wrap", fontSize: 12 }}>
          {[["Terms", "/terms"], ["Privacy", "/privacy"], ["DMCA", "/dmca"], ["2257", "/2257"], ["Request Access", "/signup"]].map(([label, href]) => (
            <Link key={href} href={href} style={{ color: "rgba(255,255,255,.52)", textDecoration: "none" }}>{label}</Link>
          ))}
        </nav>
      </footer>
    </main>
  );
}
