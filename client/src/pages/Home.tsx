/*
 * Home.tsx — VaultX-first CreatorVault public homepage
 * Corrective pass: concrete product content, visible VaultX/Pollo routes, and useful creator-output explanation.
 */
import { useState, useEffect, useRef } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Link } from "wouter";

function useScrollReveal(threshold = 0.12) {
  const ref = useRef<HTMLDivElement>(null);
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

function useCounter(target: number, duration = 1800, active = false) {
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
  }, [target, duration, active]);

  return value;
}

function ActionButton({ href, children, variant = "gold" }: { href: string; children: React.ReactNode; variant?: "gold" | "dark" | "ghost" }) {
  const styles = {
    gold: {
      background: "linear-gradient(135deg,#f7d67a,#c9a84c 48%,#8f6b21)",
      color: "#050508",
      border: "1px solid rgba(255,255,255,0.08)",
      boxShadow: "0 18px 44px rgba(201,168,76,.22)",
    },
    dark: {
      background: "rgba(255,255,255,0.075)",
      color: "#fff",
      border: "1px solid rgba(255,255,255,0.18)",
      boxShadow: "none",
    },
    ghost: {
      background: "transparent",
      color: "rgba(255,255,255,.72)",
      border: "1px solid rgba(255,255,255,0.12)",
      boxShadow: "none",
    },
  }[variant];

  return (
    <Link href={href}>
      <button style={{ ...styles, borderRadius: 12, padding: "14px 20px", fontSize: 12, fontWeight: 900, letterSpacing: "0.07em", textTransform: "uppercase", cursor: "pointer" }}>
        {children}
      </button>
    </Link>
  );
}

function MiniOutputCard({ eyebrow, title, body, accent }: { eyebrow: string; title: string; body: string; accent: string }) {
  return (
    <div className="vx-card" style={{ borderColor: `${accent}34` }}>
      <div className="vx-card-scan" style={{ background: `linear-gradient(90deg,transparent,${accent}25,transparent)` }} />
      <p style={{ color: accent, fontSize: 10, fontWeight: 950, letterSpacing: ".18em", textTransform: "uppercase", marginBottom: 10 }}>{eyebrow}</p>
      <h3 style={{ color: "#fff", fontFamily: "Playfair Display, serif", fontSize: 24, lineHeight: 1.08, marginBottom: 10 }}>{title}</h3>
      <p style={{ color: "rgba(255,255,255,.56)", fontSize: 13, lineHeight: 1.68 }}>{body}</p>
    </div>
  );
}

function VisualPhone({ label, caption, accent, poster }: { label: string; caption: string; accent: string; poster: string }) {
  return (
    <div className="vx-phone" style={{ borderColor: `${accent}44` }}>
      <img src={poster} alt={label} onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }} />
      <div className="vx-phone-gradient" />
      <div className="vx-phone-content">
        <span style={{ borderColor: `${accent}44`, color: accent }}>{label}</span>
        <strong>{caption}</strong>
      </div>
    </div>
  );
}

export default function Home() {
  const [heroLoaded, setHeroLoaded] = useState(false);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [creatorType, setCreatorType] = useState("");

  const outputsRef = useScrollReveal();
  const polloRef = useScrollReveal();
  const cockpitRef = useScrollReveal();
  const moneyRef = useScrollReveal();
  const metricsRef = useScrollReveal();
  const waitlistRef = useScrollReveal();

  const weeklyOutputs = useCounter(12, 1700, metricsRef.visible);
  const revenueShare = useCounter(85, 1500, metricsRef.visible);
  const destinations = useCounter(20, 1500, metricsRef.visible);
  const steps = useCounter(4, 1200, metricsRef.visible);

  useEffect(() => {
    const t = window.setTimeout(() => setHeroLoaded(true), 80);
    return () => window.clearTimeout(t);
  }, []);

  const signupMutation = trpc.auth.signup.useMutation({
    onSuccess: () => {
      toast.success("You are on the VaultX early-access list.");
      setEmail("");
      setName("");
      setPhone("");
      setCreatorType("");
    },
    onError: (err) => toast.error(err.message || "Something went wrong."),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !name) return toast.error("Email and name are required.");
    // @ts-ignore legacy signup contract accepts creatorType/phone fields in production
    signupMutation.mutate({ email, name, phone, creatorType });
  };

  const creatorTypes = [
    { value: "adult_creator", label: "Adult creator or premium model" },
    { value: "agency", label: "Agency, manager, or studio" },
    { value: "content_creator", label: "Independent video creator" },
    { value: "brand", label: "Brand, product, or partner" },
  ];

  const outputCards = [
    { eyebrow: "Teaser", title: "Scroll-stopping preview cut", body: "Turn one raw clip into a public-safe teaser with hook text, crop direction, motion notes, and a clean call-to-action for paid access.", accent: "#38bdf8" },
    { eyebrow: "Paid drop", title: "PPV cover and unlock package", body: "Package the premium version with cover frame, title, description, price suggestion, unlock language, and archive metadata.", accent: "#c9a84c" },
    { eyebrow: "Pollo AI", title: "AI motion and visual variants", body: "Use the Studio route to send creator-safe prompts through the configured AI video pipeline, track task status, and bring finished clips back into the bundle.", accent: "#f472b6" },
    { eyebrow: "DM funnel", title: "Captions, scripts, and follow-ups", body: "Generate DM openers, fan replies, Telegram copy, story captions, and a short sales sequence that matches the drop.", accent: "#4ade80" },
    { eyebrow: "Distribution", title: "Export once, route everywhere", body: "Prepare the same campaign for VaultX, public socials, VIP channels, Telegram, paid fan platforms, and future reposts without rebuilding it manually.", accent: "#fb923c" },
    { eyebrow: "Vault", title: "Reusable content memory", body: "Keep the asset, captions, prompt, price, output history, and launch notes together so the next drop starts smarter.", accent: "#a78bfa" },
  ];

  const studioSteps = [
    { label: "Upload", detail: "Clip, image, reference frame, or campaign concept." },
    { label: "Choose output", detail: "Teaser, AI video, PPV cover, clone loop, story pack, or launch bundle." },
    { label: "Generate", detail: "Pollo-powered tasks run asynchronously with status tracking and output links." },
    { label: "Launch", detail: "Move the finished assets into editor, funnel copy, distribution, and archive." },
  ];

  return (
    <div style={{ background: "#050508", color: "#fff", fontFamily: "Inter, sans-serif", minHeight: "100vh", overflowX: "hidden" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&family=Playfair+Display:wght@500;600;700;800;900&display=swap');
        * { margin:0; padding:0; box-sizing:border-box; }
        @keyframes fade-up { from{opacity:0;transform:translateY(26px)} to{opacity:1;transform:translateY(0)} }
        @keyframes scan { 0%{transform:translateX(-120%);opacity:0} 20%{opacity:.75} 100%{transform:translateX(120%);opacity:0} }
        @keyframes float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-12px)} }
        @keyframes pulse { 0%,100%{box-shadow:0 0 0 0 rgba(201,168,76,.34)} 50%{box-shadow:0 0 0 12px rgba(201,168,76,0)} }
        @keyframes rail { 0%{transform:translateX(0)} 100%{transform:translateX(-50%)} }
        @keyframes orbit { 0%{transform:rotate(0deg)} 100%{transform:rotate(360deg)} }
        .vx-reveal{opacity:0;transform:translateY(30px);transition:opacity .65s ease,transform .65s ease}.vx-reveal.visible{opacity:1;transform:translateY(0)}
        .vx-shell{max-width:1180px;margin:0 auto;padding:0 20px}.vx-kicker{font-size:10px;font-weight:950;letter-spacing:.26em;text-transform:uppercase;color:#c9a84c;margin-bottom:12px}.vx-title{font-family:'Playfair Display',serif;font-size:clamp(34px,7vw,66px);line-height:.98;font-weight:900;letter-spacing:-.045em;color:#fff}.vx-copy{font-size:15px;line-height:1.75;color:rgba(255,255,255,.58)}
        .vx-card{position:relative;overflow:hidden;border:1px solid rgba(255,255,255,.10);border-radius:22px;background:linear-gradient(160deg,rgba(255,255,255,.075),rgba(255,255,255,.025));padding:22px;min-height:218px;box-shadow:0 24px 70px rgba(0,0,0,.28)}
        .vx-card-scan{position:absolute;top:0;bottom:0;width:45%;animation:scan 6s ease-in-out infinite;pointer-events:none}.vx-card>*:not(.vx-card-scan){position:relative;z-index:1}
        .vx-hero{position:relative;min-height:100svh;overflow:hidden;background:#030305;display:flex;flex-direction:column}.vx-hero-grid{position:relative;z-index:4;display:grid;grid-template-columns:minmax(0,1.03fr) minmax(360px,.97fr);gap:38px;align-items:center;flex:1;padding:36px 20px 74px;max-width:1200px;margin:0 auto;width:100%}
        .vx-nav{position:relative;z-index:8;display:flex;align-items:center;justify-content:space-between;padding:18px 22px}.vx-nav-actions{display:flex;align-items:center;gap:10px;flex-wrap:wrap}.vx-hero-panel{position:relative;border-radius:30px;overflow:hidden;border:1px solid rgba(255,255,255,.13);background:rgba(255,255,255,.05);box-shadow:0 40px 120px rgba(0,0,0,.56);min-height:560px}.vx-hero-panel:before{content:'';position:absolute;inset:-45%;background:conic-gradient(from 90deg,transparent,rgba(201,168,76,.14),transparent,rgba(56,189,248,.12),transparent);animation:orbit 22s linear infinite}.vx-hero-inner{position:absolute;inset:1px;border-radius:29px;overflow:hidden;background:rgba(5,5,8,.86)}
        .vx-phone-grid{position:absolute;left:18px;right:18px;bottom:18px;display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}.vx-phone{position:relative;overflow:hidden;border:1px solid rgba(255,255,255,.14);border-radius:20px;min-height:190px;background:linear-gradient(160deg,#14141c,#060608);animation:float 6s ease-in-out infinite}.vx-phone:nth-child(2){animation-delay:.3s}.vx-phone:nth-child(3){animation-delay:.6s}.vx-phone img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;opacity:.62}.vx-phone-gradient{position:absolute;inset:0;background:linear-gradient(180deg,rgba(0,0,0,.1),rgba(0,0,0,.86))}.vx-phone-content{position:absolute;left:10px;right:10px;bottom:10px}.vx-phone-content span{display:inline-flex;border:1px solid;border-radius:999px;padding:4px 7px;font-size:8px;font-weight:950;letter-spacing:.12em;text-transform:uppercase;background:rgba(0,0,0,.45);margin-bottom:7px}.vx-phone-content strong{display:block;color:#fff;font-size:12px;line-height:1.2}
        .vx-output-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:14px}.vx-process-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px}.vx-two-col{display:grid;grid-template-columns:minmax(0,.95fr) minmax(0,1.05fr);gap:26px;align-items:center}.vx-metric-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:0}.vx-rail{display:flex;gap:12px;animation:rail 34s linear infinite;width:max-content}.vx-rail:hover{animation-play-state:paused}
        input:focus,select:focus{outline:none;border-color:rgba(201,168,76,0.6)!important;box-shadow:0 0 0 3px rgba(201,168,76,0.12)!important}
        @media(max-width:960px){.vx-hero-grid,.vx-two-col{grid-template-columns:1fr}.vx-output-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.vx-process-grid,.vx-metric-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.vx-hero-panel{min-height:500px}.vx-nav{align-items:flex-start;gap:14px}.vx-nav-actions{justify-content:flex-end}}
        @media(max-width:620px){.vx-output-grid,.vx-process-grid,.vx-metric-grid{grid-template-columns:1fr}.vx-phone-grid{grid-template-columns:1fr;position:relative;left:auto;right:auto;bottom:auto;margin:190px 16px 16px}.vx-phone{min-height:150px}.vx-hero-panel{min-height:auto}.vx-nav{flex-direction:column}.vx-nav-actions{justify-content:flex-start}.vx-shell{padding:0 16px}}
      `}</style>

      <section className="vx-hero">
        <video autoPlay muted loop playsInline preload="metadata" poster="/videos/vaultx-cinematic-trailer-poster.png" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", opacity: .42 }}>
          <source src="/videos/vaultx-cinematic-trailer.mp4" type="video/mp4" />
        </video>
        <div style={{ position: "absolute", inset: 0, background: "radial-gradient(circle at 74% 20%,rgba(201,168,76,.28),transparent 28%),radial-gradient(circle at 20% 18%,rgba(56,189,248,.20),transparent 30%),linear-gradient(180deg,rgba(3,3,5,.50),rgba(3,3,5,.78) 52%,#050508 100%)" }} />
        <div style={{ position: "absolute", inset: 0, backgroundImage: "linear-gradient(rgba(255,255,255,.045) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.045) 1px, transparent 1px)", backgroundSize: "54px 54px", maskImage: "linear-gradient(180deg,rgba(0,0,0,.88),transparent)" }} />

        <nav className="vx-nav">
          <Link href="/">
            <div style={{ display: "flex", alignItems: "center", gap: 12, cursor: "pointer" }}>
              <img src="/logo-white.png" alt="CreatorVault" style={{ height: 30, objectFit: "contain" }} />
              <span style={{ padding: "6px 10px", borderRadius: 999, border: "1px solid rgba(201,168,76,.30)", color: "#f4d37c", background: "rgba(201,168,76,.10)", fontSize: 10, fontWeight: 950, letterSpacing: ".14em", textTransform: "uppercase" }}>VaultX</span>
            </div>
          </Link>
          <div className="vx-nav-actions">
            <ActionButton href="/vault-x/studio" variant="dark">Pollo Studio</ActionButton>
            <ActionButton href="/vault-x/editor" variant="dark">Editor</ActionButton>
            <ActionButton href="/login" variant="ghost">Log in</ActionButton>
          </div>
        </nav>

        <div className="vx-hero-grid">
          <div style={{ opacity: heroLoaded ? 1 : 0, transform: heroLoaded ? "translateY(0)" : "translateY(24px)", transition: "opacity .7s ease, transform .7s ease" }}>
            <p className="vx-kicker">Premium creator revenue OS</p>
            <h1 style={{ fontFamily: "Playfair Display, serif", fontSize: "clamp(46px,8.5vw,96px)", lineHeight: .9, fontWeight: 950, letterSpacing: "-.06em", marginBottom: 22 }}>
              One asset becomes a complete paid content drop.
            </h1>
            <p style={{ fontSize: "clamp(17px,2.2vw,22px)", lineHeight: 1.58, color: "rgba(255,255,255,.76)", maxWidth: 650, marginBottom: 16 }}>
              VaultX is the CreatorVault vertical for premium video creators. Upload a clip, build the teaser, generate AI motion through Studio, package the PPV offer, write the captions, and route the release without rebuilding the same campaign five different ways.
            </p>
            <p style={{ fontSize: 14, lineHeight: 1.72, color: "rgba(255,255,255,.52)", maxWidth: 610, marginBottom: 28 }}>
              This is not a mood-board landing page. It is a monetization workflow: public-safe promotion outside, paid unlock inside, organized output history underneath, and clear next actions for creators who need to publish faster.
            </p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginBottom: 22 }}>
              <ActionButton href="#waitlist">Request access</ActionButton>
              <ActionButton href="/vault-x/studio" variant="dark">Generate with Pollo AI</ActionButton>
              <ActionButton href="/vault-x/editor" variant="ghost">Open the editor</ActionButton>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(135px,1fr))", gap: 10, maxWidth: 650 }}>
              {[
                ["Input", "Raw clip, image, or idea"],
                ["Outputs", "Teaser, PPV, cover, captions"],
                ["AI", "Pollo video generation route"],
                ["Launch", "VaultX, socials, VIP channels"],
              ].map(([k, v]) => (
                <div key={k} style={{ padding: "14px 13px", borderRadius: 16, border: "1px solid rgba(255,255,255,.11)", background: "rgba(255,255,255,.055)", backdropFilter: "blur(14px)" }}>
                  <strong style={{ display: "block", color: "#c9a84c", fontSize: 17, lineHeight: 1 }}>{k}</strong>
                  <span style={{ display: "block", color: "rgba(255,255,255,.47)", fontSize: 10, letterSpacing: ".08em", textTransform: "uppercase", lineHeight: 1.35, marginTop: 7 }}>{v}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="vx-hero-panel" style={{ opacity: heroLoaded ? 1 : 0, transform: heroLoaded ? "translateY(0)" : "translateY(26px)", transition: "opacity .8s ease .18s, transform .8s ease .18s" }}>
            <div className="vx-hero-inner">
              <div style={{ position: "absolute", inset: 0, background: "radial-gradient(circle at 50% 20%,rgba(201,168,76,.20),transparent 34%),linear-gradient(180deg,rgba(255,255,255,.05),rgba(5,5,8,.95))" }} />
              <div style={{ position: "absolute", left: 18, right: 18, top: 18, display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
                <div>
                  <p style={{ fontSize: 9, color: "rgba(255,255,255,.46)", letterSpacing: ".20em", textTransform: "uppercase", fontWeight: 950 }}>VaultX output builder</p>
                  <h2 style={{ fontFamily: "Playfair Display, serif", fontSize: 29, lineHeight: 1.02, marginTop: 4 }}>Paid-drop package</h2>
                </div>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 7, padding: "7px 10px", borderRadius: 999, border: "1px solid rgba(16,185,129,.34)", background: "rgba(16,185,129,.12)", color: "#86efac", fontSize: 9, fontWeight: 950, letterSpacing: ".12em" }}><i style={{ width: 7, height: 7, borderRadius: "50%", background: "#10B981", boxShadow: "0 0 14px #10B981" }} />READY</span>
              </div>
              <div style={{ position: "absolute", left: 18, right: 18, top: 100, display: "grid", gap: 10 }}>
                {[
                  ["01", "Hook and crop", "Find the first three seconds, safe preview frame, and vertical/social crop."],
                  ["02", "Pollo motion variant", "Generate a motion teaser or visual concept from the same campaign prompt."],
                  ["03", "Offer pack", "PPV title, cover copy, price note, DM opener, and VIP call-to-action."],
                ].map(([num, title, detail], i) => (
                  <div key={num} style={{ display: "grid", gridTemplateColumns: "42px 1fr", gap: 12, padding: 14, borderRadius: 18, border: "1px solid rgba(255,255,255,.10)", background: "rgba(0,0,0,.42)", backdropFilter: "blur(14px)", animation: `float ${5.5 + i * .45}s ease-in-out infinite ${i * .2}s` }}>
                    <div style={{ width: 42, height: 42, borderRadius: 14, display: "grid", placeItems: "center", background: i === 1 ? "rgba(244,114,182,.14)" : "rgba(201,168,76,.13)", color: i === 1 ? "#f9a8d4" : "#f4d37c", fontWeight: 950 }}>{num}</div>
                    <div>
                      <strong style={{ display: "block", fontSize: 14, color: "#fff", marginBottom: 4 }}>{title}</strong>
                      <span style={{ display: "block", fontSize: 11, color: "rgba(255,255,255,.46)", lineHeight: 1.45 }}>{detail}</span>
                    </div>
                  </div>
                ))}
              </div>
              <div className="vx-phone-grid">
                <VisualPhone label="Teaser" caption="Public-safe preview" accent="#38bdf8" poster="/images/reel/reel-cinematic-trailer.png" />
                <VisualPhone label="PPV" caption="Premium unlock cover" accent="#c9a84c" poster="/images/reel/reel-product-drop.png" />
                <VisualPhone label="AI" caption="Pollo motion cut" accent="#f472b6" poster="/images/reel/reel-creator-promo.png" />
              </div>
            </div>
          </div>
        </div>
      </section>

      <section ref={outputsRef.ref} style={{ position: "relative", padding: "82px 0 74px", borderTop: "1px solid rgba(255,255,255,.06)", overflow: "hidden" }}>
        <div style={{ position: "absolute", inset: 0, background: "radial-gradient(circle at 18% 20%,rgba(56,189,248,.12),transparent 32%),radial-gradient(circle at 82% 30%,rgba(201,168,76,.10),transparent 34%)" }} />
        <div className="vx-shell" style={{ position: "relative" }}>
          <div className={`vx-reveal ${outputsRef.visible ? "visible" : ""}`} style={{ maxWidth: 760, marginBottom: 34 }}>
            <p className="vx-kicker">What VaultX actually creates</p>
            <h2 className="vx-title" style={{ marginBottom: 16 }}>Concrete outputs, not vague platform promises.</h2>
            <p className="vx-copy">Creators should immediately understand what they get back after using VaultX. The page now shows the content products: teaser, PPV cover, Pollo AI motion variant, DM funnel, distribution exports, and saved campaign memory.</p>
          </div>
          <div className="vx-output-grid">
            {outputCards.map((card, i) => (
              <div key={card.title} className={`vx-reveal ${outputsRef.visible ? "visible" : ""}`} style={{ transitionDelay: `${i * .06}s` }}>
                <MiniOutputCard {...card} />
              </div>
            ))}
          </div>
        </div>
      </section>

      <section ref={polloRef.ref} style={{ position: "relative", padding: "82px 0", borderTop: "1px solid rgba(255,255,255,.06)", background: "linear-gradient(180deg,#050508,#08070d)" }}>
        <div className="vx-shell vx-two-col">
          <div className={`vx-reveal ${polloRef.visible ? "visible" : ""}`}>
            <p className="vx-kicker">Pollo AI content output</p>
            <h2 className="vx-title" style={{ marginBottom: 18 }}>The Studio page is the AI generation room.</h2>
            <p className="vx-copy" style={{ marginBottom: 18 }}>VaultX Studio is now presented as a primary path, not a hidden utility. It is where creators create AI video variants, motion flyers, clone loops, and campaign visuals using the connected provider pipeline.</p>
            <p className="vx-copy" style={{ marginBottom: 28 }}>The workflow is simple: describe the drop, choose the output lane, send the task, track status, and reuse the finished result inside the editor or distribution package.</p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
              <ActionButton href="/vault-x/studio">Open Pollo Studio</ActionButton>
              <ActionButton href="/vault-x/editor" variant="dark">Send to editor</ActionButton>
            </div>
          </div>
          <div className={`vx-reveal ${polloRef.visible ? "visible" : ""}`} style={{ display: "grid", gap: 12 }}>
            {studioSteps.map((step, i) => (
              <div key={step.label} style={{ display: "grid", gridTemplateColumns: "56px 1fr", gap: 14, alignItems: "center", padding: 17, borderRadius: 20, border: "1px solid rgba(255,255,255,.10)", background: "linear-gradient(135deg,rgba(255,255,255,.07),rgba(255,255,255,.025))" }}>
                <div style={{ width: 56, height: 56, borderRadius: 18, display: "grid", placeItems: "center", color: i === 2 ? "#f9a8d4" : "#f4d37c", background: i === 2 ? "rgba(244,114,182,.14)" : "rgba(201,168,76,.13)", fontWeight: 950 }}>{String(i + 1).padStart(2, "0")}</div>
                <div>
                  <strong style={{ display: "block", fontSize: 16, color: "#fff", marginBottom: 4 }}>{step.label}</strong>
                  <span style={{ display: "block", color: "rgba(255,255,255,.52)", fontSize: 13, lineHeight: 1.55 }}>{step.detail}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section ref={cockpitRef.ref} style={{ position: "relative", padding: "82px 0", borderTop: "1px solid rgba(255,255,255,.06)", overflow: "hidden" }}>
        <video autoPlay muted loop playsInline preload="metadata" poster="/images/reel/reel-product-drop.png" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", opacity: .16 }}>
          <source src="/videos/vaultx-cinematic-trailer.mp4" type="video/mp4" />
        </video>
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg,rgba(5,5,8,.84),#050508 88%)" }} />
        <div className="vx-shell" style={{ position: "relative" }}>
          <div className={`vx-reveal ${cockpitRef.visible ? "visible" : ""}`} style={{ textAlign: "center", maxWidth: 780, margin: "0 auto 36px" }}>
            <p className="vx-kicker">Editor workflow</p>
            <h2 className="vx-title" style={{ marginBottom: 16 }}>From clip to campaign in four operational moves.</h2>
            <p className="vx-copy">The editor has to feel like a production desk, not a text-heavy demo. The homepage now previews the actual flow a creator expects to complete.</p>
          </div>
          <div className="vx-process-grid">
            {[
              ["01", "Import", "Upload footage or start from an AI Studio output."],
              ["02", "Analyze", "Detect hook, safe crop, teaser frame, and monetization angle."],
              ["03", "Package", "Generate PPV cover, caption pack, DM sequence, and sales notes."],
              ["04", "Export", "Download or route the launch bundle to VaultX, socials, VIP, and archive."],
            ].map(([num, title, body], i) => (
              <div key={num} className={`vx-reveal ${cockpitRef.visible ? "visible" : ""}`} style={{ transitionDelay: `${i * .07}s`, padding: 22, borderRadius: 22, border: "1px solid rgba(255,255,255,.11)", background: "rgba(255,255,255,.045)", minHeight: 210 }}>
                <span style={{ display: "inline-grid", placeItems: "center", width: 48, height: 48, borderRadius: 16, background: i === 2 ? "rgba(244,114,182,.14)" : "rgba(201,168,76,.13)", color: i === 2 ? "#f9a8d4" : "#f4d37c", fontWeight: 950, marginBottom: 22 }}>{num}</span>
                <h3 style={{ fontFamily: "Playfair Display, serif", fontSize: 26, color: "#fff", marginBottom: 10 }}>{title}</h3>
                <p style={{ color: "rgba(255,255,255,.54)", fontSize: 13, lineHeight: 1.65 }}>{body}</p>
              </div>
            ))}
          </div>
          <div style={{ display: "flex", justifyContent: "center", gap: 12, flexWrap: "wrap", marginTop: 30 }}>
            <ActionButton href="/vault-x/editor">Open VaultX Editor</ActionButton>
            <ActionButton href="/vault-x/distribution" variant="dark">View Distribution</ActionButton>
          </div>
        </div>
      </section>

      <section ref={moneyRef.ref} style={{ padding: "76px 0", borderTop: "1px solid rgba(255,255,255,.06)", background: "linear-gradient(180deg,#050508,#080808)" }}>
        <div className="vx-shell">
          <div className={`vx-reveal ${moneyRef.visible ? "visible" : ""}`} style={{ maxWidth: 800, marginBottom: 28 }}>
            <p className="vx-kicker">Why creators care</p>
            <h2 className="vx-title" style={{ marginBottom: 16 }}>VaultX protects the paid content while selling the preview.</h2>
            <p className="vx-copy">The value is not “AI tools.” The value is a cleaner way to make money from content that already exists: public preview outside the paywall, premium drop behind it, copy and routing around it, and a reusable archive after it ships.</p>
          </div>
          <div style={{ overflow: "hidden", padding: "6px 0" }}>
            <div className="vx-rail">
              {["Public teaser", "Locked preview", "PPV cover", "VIP caption", "DM pitch", "Telegram drop", "Story sequence", "AI video variant", "Archive metadata", "Revenue notes", "Public teaser", "Locked preview", "PPV cover", "VIP caption", "DM pitch", "Telegram drop", "Story sequence", "AI video variant", "Archive metadata", "Revenue notes"].map((item, i) => (
                <div key={`${item}-${i}`} style={{ minWidth: 190, padding: "18px 16px", borderRadius: 18, border: "1px solid rgba(201,168,76,.22)", background: "rgba(201,168,76,.07)", color: "#f4d37c", fontWeight: 850, letterSpacing: ".06em", textTransform: "uppercase", fontSize: 11, textAlign: "center" }}>{item}</div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section ref={metricsRef.ref} style={{ position: "relative", borderTop: "1px solid rgba(255,255,255,.06)", borderBottom: "1px solid rgba(255,255,255,.06)", background: "rgba(255,255,255,.02)" }}>
        <div className="vx-shell vx-metric-grid">
          {[
            { value: weeklyOutputs, suffix: "+", label: "output types per drop", color: "#38bdf8" },
            { value: revenueShare, suffix: "%", label: "creator revenue share target", color: "#c9a84c" },
            { value: destinations, suffix: "+", label: "distribution destinations", color: "#4ade80" },
            { value: steps, suffix: "", label: "steps from asset to launch", color: "#f472b6" },
          ].map((m, i) => (
            <div key={m.label} className={`vx-reveal ${metricsRef.visible ? "visible" : ""}`} style={{ padding: "34px 18px", textAlign: "center", borderRight: i < 3 ? "1px solid rgba(255,255,255,.06)" : "none", transitionDelay: `${i * .06}s` }}>
              <div style={{ fontFamily: "Playfair Display, serif", fontSize: "clamp(34px,7vw,52px)", fontWeight: 900, color: m.color, lineHeight: 1 }}>{m.value}{m.suffix}</div>
              <p style={{ color: "rgba(255,255,255,.38)", fontSize: 10, fontWeight: 850, letterSpacing: ".12em", textTransform: "uppercase", marginTop: 8 }}>{m.label}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="waitlist" ref={waitlistRef.ref} style={{ position: "relative", padding: "80px 20px 88px", borderTop: "1px solid rgba(255,255,255,.06)", overflow: "hidden" }}>
        <div style={{ position: "absolute", inset: 0, background: "radial-gradient(circle at 50% 0%,rgba(201,168,76,.13),transparent 34%)" }} />
        <div style={{ position: "relative", maxWidth: 590, margin: "0 auto" }}>
          <div className={`vx-reveal ${waitlistRef.visible ? "visible" : ""}`} style={{ textAlign: "center", marginBottom: 34 }}>
            <p className="vx-kicker">Early access</p>
            <h2 className="vx-title" style={{ fontSize: "clamp(30px,6vw,46px)", marginBottom: 14 }}>Get the VaultX invite path.</h2>
            <p className="vx-copy">Join if you want the creator workflow that turns raw content into a monetizable launch bundle with Pollo Studio, editor packaging, and distribution routes in one place.</p>
          </div>
          <div className={`vx-reveal ${waitlistRef.visible ? "visible" : ""}`} style={{ borderRadius: 24, border: "1px solid rgba(255,255,255,.10)", background: "linear-gradient(160deg,rgba(255,255,255,.07),rgba(255,255,255,.025))", padding: 28, boxShadow: "0 28px 80px rgba(0,0,0,.34)" }}>
            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <label style={{ display: "block", fontSize: 10, fontWeight: 850, letterSpacing: ".15em", textTransform: "uppercase", color: "rgba(255,255,255,.44)", marginBottom: 7 }}>Email</label>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" style={{ width: "100%", background: "rgba(255,255,255,.055)", border: "1px solid rgba(255,255,255,.12)", borderRadius: 10, padding: "12px 14px", fontSize: 14, color: "#fff" }} />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <label style={{ display: "block", fontSize: 10, fontWeight: 850, letterSpacing: ".15em", textTransform: "uppercase", color: "rgba(255,255,255,.44)", marginBottom: 7 }}>Name</label>
                  <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" style={{ width: "100%", background: "rgba(255,255,255,.055)", border: "1px solid rgba(255,255,255,.12)", borderRadius: 10, padding: "12px 14px", fontSize: 14, color: "#fff" }} />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: 10, fontWeight: 850, letterSpacing: ".15em", textTransform: "uppercase", color: "rgba(255,255,255,.44)", marginBottom: 7 }}>Phone</label>
                  <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Optional" style={{ width: "100%", background: "rgba(255,255,255,.055)", border: "1px solid rgba(255,255,255,.12)", borderRadius: 10, padding: "12px 14px", fontSize: 14, color: "#fff" }} />
                </div>
              </div>
              <div>
                <label style={{ display: "block", fontSize: 10, fontWeight: 850, letterSpacing: ".15em", textTransform: "uppercase", color: "rgba(255,255,255,.44)", marginBottom: 7 }}>Creator lane</label>
                <select value={creatorType} onChange={(e) => setCreatorType(e.target.value)} style={{ width: "100%", background: "rgba(255,255,255,.055)", border: "1px solid rgba(255,255,255,.12)", borderRadius: 10, padding: "12px 14px", fontSize: 14, color: creatorType ? "#fff" : "rgba(255,255,255,.36)", appearance: "none", cursor: "pointer" }}>
                  <option value="" style={{ background: "#0a0a0f" }}>Select your lane</option>
                  {creatorTypes.map((ct) => <option key={ct.value} value={ct.value} style={{ background: "#0a0a0f" }}>{ct.label}</option>)}
                </select>
              </div>
              <button type="submit" disabled={signupMutation.isPending} style={{ background: signupMutation.isPending ? "rgba(201,168,76,.55)" : "linear-gradient(135deg,#f7d67a,#c9a84c 48%,#8f6b21)", color: "#050508", border: "none", borderRadius: 11, padding: "14px 24px", fontSize: 13, fontWeight: 950, letterSpacing: ".08em", textTransform: "uppercase", cursor: signupMutation.isPending ? "not-allowed" : "pointer", marginTop: 4, animation: signupMutation.isPending ? "none" : "pulse 3s ease-in-out infinite" }}>
                {signupMutation.isPending ? "Saving your invite..." : "Request VaultX access"}
              </button>
              <p style={{ fontSize: 12, lineHeight: 1.55, color: "rgba(255,255,255,.30)", textAlign: "center" }}>No spam. This list is for creators, operators, and partners who want the VaultX output workflow.</p>
            </form>
          </div>
        </div>
      </section>

      <footer style={{ borderTop: "1px solid rgba(255,255,255,.06)", padding: "30px 20px", textAlign: "center" }}>
        <img src="/logo-white.png" alt="CreatorVault" style={{ height: 24, objectFit: "contain", opacity: .58, marginBottom: 12 }} />
        <p style={{ fontSize: 11, color: "rgba(255,255,255,.24)", letterSpacing: ".10em", textTransform: "uppercase" }}>CreatorVault · VaultX premium creator revenue OS</p>
      </footer>
    </div>
  );
}
