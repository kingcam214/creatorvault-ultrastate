/**
 * Home.tsx — CreatorVault Landing Page V6 (Video-First Platform OS)
 * Premium public homepage: KingCam remains the operator, while the visual system shows the full CreatorVault universe.
 * All homepage media references must resolve to verified local assets or approved API-generated replacements.
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
      ([entry]) => { if (entry.isIntersecting) { setVisible(true); obs.disconnect(); } },
      { threshold }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);
  return { ref, visible };
}

function useCounter(target: number, duration = 2000, active = false) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (!active) return;
    let start = 0;
    const step = target / (duration / 16);
    const timer = setInterval(() => {
      start += step;
      if (start >= target) { setValue(target); clearInterval(timer); }
      else setValue(Math.floor(start));
    }, 16);
    return () => clearInterval(timer);
  }, [target, duration, active]);
  return value;
}

// Real video clip component — plays on hover
function VideoReelClip({ label, badge, category, videoSrc, poster }: {
  label: string; badge: string; category: string; videoSrc?: string; poster?: string;
}) {
  const [hovered, setHovered] = useState(false);
  const [videoFailed, setVideoFailed] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    // autoPlay handles playback; on hover we ensure it's playing
    const v = videoRef.current;
    if (!v) return;
    if (hovered) {
      v.play().catch(() => {});
    }
  }, [hovered]);

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        position: "relative", width: 160, height: 285, borderRadius: 12,
        overflow: "hidden", flexShrink: 0,
        border: hovered ? "1px solid rgba(201,168,76,0.7)" : "1px solid rgba(255,255,255,0.1)",
        transition: "border-color 0.3s ease, transform 0.3s ease",
        transform: hovered ? "scale(1.04)" : "scale(1)",
        background: "linear-gradient(160deg, #1a1a2e 0%, #0d0d14 100%)",
        cursor: "pointer",
      }}
    >
      {/* Verified motion first, image fallback second, premium gradient last. */}
      {videoSrc && !videoFailed ? (
        <video
          ref={videoRef}
          src={videoSrc}
          poster={poster}
          muted
          loop
          playsInline
          autoPlay
          preload="metadata"
          onCanPlay={() => { videoRef.current?.play().catch(() => {}); }}
          onError={() => setVideoFailed(true)}
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", zIndex: 0 }}
        />
      ) : poster ? (
        <img
          src={poster}
          alt={label}
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", zIndex: 0 }}
        />
      ) : (
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(160deg, rgba(56,189,248,0.16) 0%, rgba(201,168,76,0.10) 42%, rgba(5,5,8,1) 100%)", zIndex: 0 }} />
      )}
      <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, rgba(0,0,0,0.1) 0%, rgba(0,0,0,0.7) 100%)", zIndex: 1 }} />
      {/* Play button — only show when no video or not hovered */}
      {(!videoSrc || !hovered) && (
        <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", zIndex: 2 }}>
          <div style={{ width: 40, height: 40, borderRadius: "50%", background: "rgba(56,189,248,0.25)", border: "1px solid rgba(56,189,248,0.6)", display: "flex", alignItems: "center", justifyContent: "center", backdropFilter: "blur(4px)" }}>
            <div style={{ width: 0, height: 0, borderTop: "7px solid transparent", borderBottom: "7px solid transparent", borderLeft: "12px solid #38bdf8", marginLeft: 3 }} />
          </div>
        </div>
      )}
      {/* Badge */}
      <div style={{ position: "absolute", top: 8, right: 8, zIndex: 3, background: "rgba(0,0,0,0.6)", border: "1px solid rgba(56,189,248,0.5)", borderRadius: 5, padding: "2px 7px" }}>
        <span style={{ fontSize: 8, fontWeight: 700, color: "#38bdf8", letterSpacing: "0.1em" }}>{badge}</span>
      </div>
      {/* Label */}
      <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: "20px 10px 10px", background: "linear-gradient(transparent, rgba(0,0,0,0.9))", zIndex: 3 }}>
        <div style={{ fontSize: 9, fontWeight: 600, color: "#38bdf8", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 2 }}>{category}</div>
        <div style={{ fontSize: 11, color: "#fff", fontWeight: 600 }}>{label}</div>
      </div>
    </div>
  );
}

function ArsenalCard({ icon, badge, badgeColor, title, subtitle, subtitleColor, description, cta, href }: {
  icon: string; badge: string; badgeColor: string; title: string; subtitle: string;
  subtitleColor: string; description: string; cta: string; href: string;
}) {
  return (
    <Link href={href}>
      <div
        style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 16, padding: "20px 18px", cursor: "pointer", position: "relative", overflow: "hidden", height: "100%", transition: "transform 0.25s ease, border-color 0.25s ease, box-shadow 0.25s ease" }}
        onMouseEnter={e => { const d = e.currentTarget as HTMLDivElement; d.style.transform = "translateY(-4px)"; d.style.borderColor = "rgba(201,168,76,0.3)"; d.style.boxShadow = "0 16px 40px rgba(0,0,0,0.4)"; }}
        onMouseLeave={e => { const d = e.currentTarget as HTMLDivElement; d.style.transform = ""; d.style.borderColor = "rgba(255,255,255,0.08)"; d.style.boxShadow = ""; }}
      >
        <div style={{ position: "absolute", top: 0, right: 0, width: 80, height: 80, background: `radial-gradient(circle, ${badgeColor}18 0%, transparent 70%)`, borderRadius: "0 0 0 80%" }} />
        <div style={{ fontSize: 28, marginBottom: 12 }}>{icon}</div>
        <div style={{ display: "inline-block", background: `${badgeColor}18`, border: `1px solid ${badgeColor}40`, borderRadius: 100, padding: "2px 10px", marginBottom: 10 }}>
          <span style={{ fontSize: 9, fontWeight: 700, color: badgeColor, letterSpacing: "0.12em", textTransform: "uppercase" }}>{badge}</span>
        </div>
        <h3 style={{ fontFamily: "Playfair Display, serif", fontSize: 20, fontWeight: 700, color: "#fff", marginBottom: 4, lineHeight: 1.2 }}>{title}</h3>
        <p style={{ fontSize: 12, color: subtitleColor, fontWeight: 600, marginBottom: 10, lineHeight: 1.4 }}>{subtitle}</p>
        <p style={{ fontSize: 13, color: "rgba(255,255,255,0.5)", lineHeight: 1.6, marginBottom: 16 }}>{description}</p>
        <button style={{ background: "transparent", border: "1px solid rgba(255,255,255,0.2)", color: "#fff", borderRadius: 8, padding: "8px 16px", fontSize: 12, fontWeight: 600, cursor: "pointer", letterSpacing: "0.04em" }}>{cta}</button>
      </div>
    </Link>
  );
}

export default function Home() {
  const [heroLoaded, setHeroLoaded] = useState(false);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [creatorType, setCreatorType] = useState("");

  const reelRef = useScrollReveal();
  const commandRef = useScrollReveal();
  const universeRef = useScrollReveal();
  const arsenalRef = useScrollReveal();
  const cloneRef = useScrollReveal();
  const metricsRef = useScrollReveal();
  const mapRef = useScrollReveal();
  const waitlistRef = useScrollReveal();

  const m1 = useCounter(4200, 2000, metricsRef.visible);
  const m2 = useCounter(85, 1800, metricsRef.visible);
  const m3 = useCounter(47, 1900, metricsRef.visible);
  const m4 = useCounter(20, 1600, metricsRef.visible);

  useEffect(() => { const t = setTimeout(() => setHeroLoaded(true), 80); return () => clearTimeout(t); }, []);

  const signupMutation = trpc.auth.signup.useMutation({
    onSuccess: () => { toast.success("You're on the list. Empire incoming."); setEmail(""); setName(""); setPhone(""); setCreatorType(""); },
    onError: (err) => toast.error(err.message || "Something went wrong."),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !name) return toast.error("Email and name are required.");
  // @ts-ignore
    signupMutation.mutate({ email, name, phone, creatorType });
  };

  const creatorTypes = [
    { value: "content_creator", label: "Content Creator" },
    { value: "musician", label: "Musician / Artist" },
    { value: "adult_creator", label: "Adult Creator (18+)" },
    { value: "dancer", label: "Dancer / Performer" },
  ];

  // Platform-wide proof reel — every slot points to an owned production asset.
  const commandCenterReels = [
    { label: "AI Video Lab Trailer", badge: "GOD MODE · HERO", category: "VIDEO-FIRST", src: "/videos/vaultx-cinematic-trailer.mp4", videoSrc: "/videos/vaultx-cinematic-trailer.mp4", poster: "/images/reel/reel-cinematic-trailer.png" },
    { label: "Music Campaign Visual", badge: "OWNED MOTION", category: "MUSIC", src: "/videos/openart-showcase.mp4", videoSrc: "/videos/openart-showcase.mp4", poster: "/images/reel/reel-music-video.png" },
    { label: "Product Drop Render", badge: "CAMPAIGN BUILD", category: "COMMERCE", src: "/videos/hero-cam.mp4", videoSrc: "/videos/hero-cam.mp4", poster: "/images/reel/reel-product-drop.png" },
    { label: "Apparel Drop Simulation", badge: "VISUAL PACK", category: "APPAREL", src: "/videos/kingcam-clone-2.mp4", videoSrc: "/videos/kingcam-clone-2.mp4", poster: "/images/reel/reel-apparel-drop.png" },
    { label: "Creator Promo System", badge: "PROMO ENGINE", category: "PROMO", videoSrc: "/videos/openart-showcase.mp4", poster: "/images/reel/reel-creator-promo.png" },
    { label: "AI Portrait Campaign", badge: "CLONE LAB", category: "BRAND", videoSrc: "/videos/kingcam-clone-1.mp4", poster: "/images/reel/reel-ai-portrait.png" },
    { label: "KingCam Operator Proof", badge: "KINGCAM · LIVE", category: "FOUNDER", videoSrc: "/videos/kingcam-hero-cam.mp4", poster: "/assets/kingcam-hero.jpg" },
    { label: "Clone Ambassador", badge: "AVATAR STACK", category: "CLONE LAB", videoSrc: "/videos/kingcam-clone-1.mp4", poster: "/images/clone-ambassador.webp" },
    { label: "Empire Brand Story", badge: "VISUAL OS", category: "PLATFORM", videoSrc: "/videos/hero-cam.mp4", poster: "/images/reel/reel-cinematic-trailer.png" },
    { label: "VaultX Premium Flow", badge: "CREATORVAULT", category: "MONETIZE", videoSrc: "/videos/vaultx-cinematic-trailer.mp4", poster: "/videos/vaultx-cinematic-trailer-poster.png" },
  ];

  const commandCards = [
    { title: "Prompt", body: "Type the concept: product drop, music promo, VIP funnel, creator trailer, or premium VaultX drop.", color: "#38bdf8" },
    { title: "Generate", body: "AI video, clone visuals, voice, captions, scene logic, and motion assets are assembled into production-ready campaign packages.", color: "#c9a84c" },
    { title: "Package", body: "The system formats hooks, reels, stories, shorts, thumbnails, offer pages, Telegram drops, and premium unlock assets.", color: "#4ade80" },
    { title: "Monetize", body: "Subscriptions, tips, marketplace, VaultX, NFC cards, and funnels convert attention into owned revenue.", color: "#fb923c" },
  ];

  const platformUniverse = [
    { title: "AI Video Lab", tag: "Prompt → motion campaign", videoSrc: "/videos/vaultx-cinematic-trailer.mp4", poster: "/images/reel/reel-cinematic-trailer.png", tone: "#38bdf8" },
    { title: "Music Drops", tag: "Visualizers · promos", videoSrc: "/videos/openart-showcase.mp4", poster: "/images/reel/reel-music-video.png", tone: "#c9a84c" },
    { title: "Commerce", tag: "Products · funnels", videoSrc: "/videos/hero-cam.mp4", poster: "/images/reel/reel-product-drop.png", tone: "#4ade80" },
    { title: "Apparel", tag: "Mockups · lookbooks", videoSrc: "/videos/kingcam-clone-2.mp4", poster: "/images/reel/reel-apparel-drop.png", tone: "#fb923c" },
    { title: "Creator Promo", tag: "Campaign machine", videoSrc: "/videos/openart-showcase.mp4", poster: "/images/reel/reel-creator-promo.png", tone: "#38bdf8" },
    { title: "VaultX", tag: "Premium monetization", videoSrc: "/videos/vaultx-cinematic-trailer.mp4", poster: "/videos/vaultx-cinematic-trailer-poster.png", tone: "#c9a84c" },
  ];

  const distributionSteps = ["Vertical Reel", "Story Cut", "Shorts Export", "Caption Pack", "Landing Page", "Telegram Drop", "VIP Funnel", "Analytics Loop"];

  return (
    <div style={{ background: "#050508", color: "#fff", fontFamily: "Inter, sans-serif", minHeight: "100vh", overflowX: "hidden" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Playfair+Display:wght@400;500;600;700;800&display=swap');
        * { margin:0; padding:0; box-sizing:border-box; }
        @keyframes fadeIn { from{opacity:0}to{opacity:1} }
        @keyframes pulse-gold { 0%,100%{box-shadow:0 0 0 0 rgba(201,168,76,0.4)}50%{box-shadow:0 0 0 10px rgba(201,168,76,0)} }
        @keyframes reel-scroll { 0%{transform:translateX(0)}100%{transform:translateX(-50%)} }
        @keyframes shimmer { 0%,100%{opacity:1}50%{opacity:0.4} }
        @keyframes command-flow { 0%{transform:translateX(-18%);opacity:.25}50%{opacity:1}100%{transform:translateX(118%);opacity:.25} }
        @keyframes float-card { 0%,100%{transform:translateY(0)}50%{transform:translateY(-10px)} }
        @keyframes rail-scroll { 0%{transform:translateX(0)}100%{transform:translateX(-50%)} }
        @keyframes glow-scan { 0%{left:-40%;opacity:0}20%{opacity:.7}100%{left:120%;opacity:0} }
        @keyframes vaultx-orbit { 0%{transform:rotate(0deg) scale(1)}50%{transform:rotate(180deg) scale(1.04)}100%{transform:rotate(360deg) scale(1)} }
        @keyframes vaultx-breathe { 0%,100%{opacity:.36;filter:blur(0px)}50%{opacity:.9;filter:blur(1px)} }
        @keyframes vaultx-rise { 0%,100%{transform:translateY(0)}50%{transform:translateY(-12px)} }
        @keyframes vaultx-pulse-line { 0%{transform:translateX(-100%);opacity:0}15%{opacity:.75}100%{transform:translateX(100%);opacity:0} }
        .reveal-up{opacity:0;transform:translateY(36px);transition:opacity 0.65s ease,transform 0.65s ease}
        .reveal-up.visible{opacity:1;transform:translateY(0)}
        .reveal-up.d1{transition-delay:0.1s}.reveal-up.d2{transition-delay:0.2s}.reveal-up.d3{transition-delay:0.3s}
        .reel-track{display:flex;gap:12px;animation:reel-scroll 42s linear infinite}
        .reel-track:hover{animation-play-state:paused}
        .vaultx-hero-grid{display:grid;grid-template-columns:minmax(0,1.05fr) minmax(340px,.95fr);gap:34px;align-items:center;width:100%;max-width:1180px;margin:0 auto;padding:42px 20px 72px}
        .vaultx-signal-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px;margin-top:24px}
        .vaultx-command-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px;margin-top:22px}
        .vaultx-live-card{position:relative;overflow:hidden;border-radius:26px;background:linear-gradient(150deg,rgba(255,255,255,.09),rgba(255,255,255,.025));border:1px solid rgba(255,255,255,.12);box-shadow:0 34px 110px rgba(0,0,0,.52)}
        .vaultx-live-card:before{content:"";position:absolute;inset:-40%;background:conic-gradient(from 90deg,transparent,rgba(201,168,76,.14),transparent,rgba(56,189,248,.12),transparent);animation:vaultx-orbit 18s linear infinite;z-index:0}
        .vaultx-live-inner{position:relative;z-index:1;margin:1px;border-radius:25px;overflow:hidden;background:rgba(5,5,8,.82);min-height:520px}
        input:focus,select:focus{outline:none;border-color:rgba(201,168,76,0.6)!important;box-shadow:0 0 0 3px rgba(201,168,76,0.12)!important}
        @media (max-width: 900px){.vaultx-hero-grid{grid-template-columns:1fr;padding:22px 18px 54px}.vaultx-signal-grid,.vaultx-command-grid{grid-template-columns:1fr 1fr}.vaultx-live-inner{min-height:430px}}
        @media (max-width: 560px){.vaultx-signal-grid,.vaultx-command-grid{grid-template-columns:1fr}.vaultx-hero-grid{padding-top:10px}}
      `}</style>

      {/* ── HERO — VaultX soft-launch vertical ── */}
      <div style={{ position: "relative", minHeight: "100svh", display: "flex", flexDirection: "column", overflow: "hidden", background: "#030305" }}>
        <video
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
          poster="/videos/vaultx-cinematic-trailer-poster.png"
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", objectPosition: "center", zIndex: 0, opacity: 0.5 }}
        >
          <source src="/videos/vaultx-cinematic-trailer.mp4" type="video/mp4" />
        </video>
        <div style={{ position: "absolute", inset: 0, background: "radial-gradient(circle at 72% 18%,rgba(201,168,76,0.28),transparent 30%),radial-gradient(circle at 18% 15%,rgba(56,189,248,0.20),transparent 34%),linear-gradient(180deg,rgba(3,3,5,0.42) 0%,rgba(3,3,5,0.68) 45%,#050508 100%)", zIndex: 1 }} />
        <div style={{ position: "absolute", inset: 0, backgroundImage: "linear-gradient(rgba(255,255,255,.045) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.045) 1px, transparent 1px)", backgroundSize: "56px 56px", maskImage: "linear-gradient(180deg,rgba(0,0,0,.9),transparent)", zIndex: 1 }} />
        <div style={{ position: "absolute", left: "8%", top: "22%", width: 220, height: 220, borderRadius: "50%", background: "rgba(56,189,248,.12)", filter: "blur(46px)", animation: "vaultx-breathe 5s ease-in-out infinite", zIndex: 1 }} />
        <div style={{ position: "absolute", right: "8%", bottom: "16%", width: 260, height: 260, borderRadius: "50%", background: "rgba(201,168,76,.13)", filter: "blur(54px)", animation: "vaultx-breathe 6s ease-in-out infinite .8s", zIndex: 1 }} />

        {/* Nav */}
        <div style={{ position: "relative", zIndex: 10, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "18px 20px" }}>
          <Link href="/">
            <div style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}>
              <img src="/logo-white.png" alt="CreatorVault" style={{ height: 28, objectFit: "contain" }} />
              <span style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "5px 10px", borderRadius: 999, border: "1px solid rgba(201,168,76,.24)", background: "rgba(201,168,76,.08)", color: "#c9a84c", fontSize: 10, fontWeight: 900, letterSpacing: ".14em", textTransform: "uppercase" }}>VaultX Launch</span>
            </div>
          </Link>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Link href="/vault-x"><button style={{ background: "rgba(201,168,76,0.12)", border: "1px solid rgba(201,168,76,0.32)", color: "#c9a84c", borderRadius: 9, padding: "8px 14px", fontSize: 12, fontWeight: 800, cursor: "pointer" }}>Explore VaultX</button></Link>
            <Link href="/login"><button style={{ background: "transparent", border: "1px solid rgba(255,255,255,0.2)", color: "#fff", borderRadius: 9, padding: "8px 14px", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>Log In</button></Link>
          </div>
        </div>

        <div className="vaultx-hero-grid" style={{ position: "relative", zIndex: 5, flex: 1 }}>
          <div style={{ maxWidth: 650 }}>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "rgba(201,168,76,0.13)", border: "1px solid rgba(201,168,76,0.38)", borderRadius: 999, padding: "7px 14px", marginBottom: 20, opacity: heroLoaded ? 1 : 0, transition: "opacity 0.6s ease" }}>
              <div style={{ width: 7, height: 7, borderRadius: "50%", background: "#c9a84c", boxShadow: "0 0 20px rgba(201,168,76,.85)", animation: "shimmer 1.8s ease-in-out infinite" }} />
              <span style={{ fontSize: 10, fontWeight: 900, letterSpacing: "0.18em", textTransform: "uppercase", color: "#f4d37c" }}>Invite-only soft launch · first polished vertical</span>
            </div>
            <h1 style={{ fontFamily: "Playfair Display, serif", fontSize: "clamp(44px,8vw,92px)", fontWeight: 900, color: "#fff", lineHeight: .92, marginBottom: 20, letterSpacing: "-0.055em", opacity: heroLoaded ? 1 : 0, transform: heroLoaded ? "translateY(0)" : "translateY(24px)", transition: "opacity 0.7s ease 0.12s,transform 0.7s ease 0.12s" }}>
              VaultX feels <span style={{ color: "#c9a84c", textShadow: "0 0 32px rgba(201,168,76,.34)" }}>alive</span> the second creators enter.
            </h1>
            <p style={{ fontSize: "clamp(16px,2.2vw,21px)", color: "rgba(255,255,255,0.74)", lineHeight: 1.62, marginBottom: 14, maxWidth: 610, opacity: heroLoaded ? 1 : 0, transition: "opacity 0.7s ease 0.28s" }}>
              The private creator operating system for premium video, paid drops, teaser funnels, body-cinema packaging, fan routing, and owned revenue. Not another link-in-bio. A living command center built to make creators want in.
            </p>
            <p style={{ fontSize: 14, color: "rgba(255,255,255,0.48)", lineHeight: 1.7, marginBottom: 28, maxWidth: 560, opacity: heroLoaded ? 1 : 0, transition: "opacity 0.7s ease 0.36s" }}>
              Launching with VaultX first gives CreatorVault a sharp, premium beachhead: immersive, adult-safe, video-first, and monetization-focused from the first scroll.
            </p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center", marginBottom: 18, opacity: heroLoaded ? 1 : 0, transition: "opacity 0.7s ease 0.46s" }}>
              <a href="#waitlist" style={{ textDecoration: "none" }}><button style={{ background: "linear-gradient(135deg,#f7d67a,#c9a84c 48%,#9b7425)", color: "#050508", border: "none", borderRadius: 10, padding: "15px 30px", fontSize: 13, fontWeight: 950, letterSpacing: "0.08em", cursor: "pointer", animation: "pulse-gold 3s ease-in-out infinite", textTransform: "uppercase", boxShadow: "0 18px 44px rgba(201,168,76,.24)" }}>Request VaultX Access</button></a>
              <Link href="/vault-x"><button style={{ background: "rgba(255,255,255,0.075)", color: "#fff", border: "1px solid rgba(255,255,255,0.18)", borderRadius: 10, padding: "15px 22px", fontSize: 13, fontWeight: 850, cursor: "pointer" }}>See the vertical →</button></Link>
              <Link href="/login"><button style={{ background: "transparent", color: "rgba(255,255,255,.62)", border: "1px solid rgba(255,255,255,0.10)", borderRadius: 10, padding: "15px 18px", fontSize: 13, fontWeight: 750, cursor: "pointer" }}>Have an invite?</button></Link>
            </div>
            <div className="vaultx-signal-grid" style={{ opacity: heroLoaded ? 1 : 0, transition: "opacity .8s ease .58s" }}>
              {[
                { val: "85%", label: "creator revenue share", color: "#c9a84c" },
                { val: "18+", label: "premium-safe positioning", color: "#f472b6" },
                { val: "4", label: "upload → package → launch steps", color: "#38bdf8" },
                { val: "LIVE", label: "Stripe + creator workflows", color: "#4ade80" },
              ].map((s) => (
                <div key={s.label} style={{ padding: "13px 12px", borderRadius: 15, background: "rgba(255,255,255,0.055)", border: "1px solid rgba(255,255,255,0.10)", backdropFilter: "blur(12px)" }}>
                  <div style={{ fontSize: 18, lineHeight: 1, fontWeight: 950, color: s.color }}>{s.val}</div>
                  <div style={{ fontSize: 9, color: "rgba(255,255,255,0.44)", letterSpacing: "0.10em", textTransform: "uppercase", marginTop: 7, lineHeight: 1.35 }}>{s.label}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="vaultx-live-card" style={{ opacity: heroLoaded ? 1 : 0, transform: heroLoaded ? "translateY(0)" : "translateY(26px)", transition: "opacity .8s ease .34s, transform .8s ease .34s" }}>
            <div className="vaultx-live-inner">
              <video autoPlay muted loop playsInline preload="metadata" poster="/videos/vaultx-cinematic-trailer-poster.png" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", opacity: .42 }}>
                <source src="/videos/vaultx-cinematic-trailer.mp4" type="video/mp4" />
              </video>
              <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg,rgba(0,0,0,.18),rgba(3,3,5,.92) 74%),radial-gradient(circle at 50% 20%,rgba(201,168,76,.2),transparent 34%)" }} />
              <div style={{ position: "absolute", left: 18, right: 18, top: 18, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div>
                  <div style={{ fontSize: 9, color: "rgba(255,255,255,.44)", fontWeight: 900, letterSpacing: ".22em", textTransform: "uppercase" }}>VaultX Command Center</div>
                  <div style={{ color: "#fff", fontSize: 20, fontFamily: "Playfair Display, serif", fontWeight: 850, marginTop: 3 }}>Drop Builder Live</div>
                </div>
                <div style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "7px 10px", borderRadius: 999, background: "rgba(16,185,129,.12)", border: "1px solid rgba(16,185,129,.28)", color: "#86efac", fontSize: 9, fontWeight: 950, letterSpacing: ".12em" }}><span style={{ width: 6, height: 6, borderRadius: "50%", background: "#10B981", boxShadow: "0 0 16px #10B981" }} />READY</div>
              </div>
              <div style={{ position: "absolute", left: 18, right: 18, bottom: 18, display: "grid", gap: 12 }}>
                {[
                  { title: "AI reads the asset", meta: "hook, crop, motion, heat score", color: "#38bdf8", pct: 92 },
                  { title: "Packages the monetization", meta: "teaser, PPV, cover, DM copy", color: "#c9a84c", pct: 86 },
                  { title: "Routes the launch", meta: "VaultX, Telegram, OF/Fansly, archive", color: "#4ade80", pct: 78 },
                ].map((item, i) => (
                  <div key={item.title} style={{ padding: 14, borderRadius: 17, background: "rgba(0,0,0,.46)", border: "1px solid rgba(255,255,255,.10)", backdropFilter: "blur(14px)", animation: `vaultx-rise ${5 + i}s ease-in-out infinite ${i * .25}s` }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 8 }}>
                      <div>
                        <div style={{ color: "#fff", fontSize: 13, fontWeight: 900 }}>{item.title}</div>
                        <div style={{ color: "rgba(255,255,255,.42)", fontSize: 10, marginTop: 3 }}>{item.meta}</div>
                      </div>
                      <div style={{ color: item.color, fontSize: 12, fontWeight: 950 }}>{item.pct}%</div>
                    </div>
                    <div style={{ height: 4, borderRadius: 999, background: "rgba(255,255,255,.08)", overflow: "hidden" }}><div style={{ height: "100%", width: `${item.pct}%`, background: item.color, boxShadow: `0 0 18px ${item.color}` }} /></div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div style={{ position: "absolute", bottom: 20, left: "50%", transform: "translateX(-50%)", display: "flex", flexDirection: "column", alignItems: "center", gap: 5, opacity: 0.34, zIndex: 10 }}>
          <span style={{ fontSize: 9, letterSpacing: "0.25em", textTransform: "uppercase", color: "#fff" }}>ENTER VAULTX</span>
          <div style={{ width: 1, height: 28, background: "rgba(255,255,255,0.4)" }} />
        </div>
      </div>

      {/* ── VAULTX ANTICIPATION ENGINE ── */}
      <section style={{ position: "relative", zIndex: 1, padding: "78px 20px 68px", borderTop: "1px solid rgba(201,168,76,0.18)", overflow: "hidden", background: "linear-gradient(180deg,#050508 0%,#09070b 100%)" }}>
        <video autoPlay muted loop playsInline preload="metadata" poster="/images/reel/reel-product-drop.png" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", opacity: 0.18 }}>
          <source src="/videos/vaultx-cinematic-trailer.mp4" type="video/mp4" />
        </video>
        <div style={{ position: "absolute", inset: 0, background: "radial-gradient(circle at 18% 20%,rgba(201,168,76,0.18),transparent 30%),radial-gradient(circle at 82% 35%,rgba(236,72,153,0.12),transparent 34%),linear-gradient(180deg,rgba(5,5,8,0.78),#050508 88%)" }} />
        <div style={{ position: "relative", maxWidth: 1120, margin: "0 auto" }}>
          <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) minmax(300px,.8fr)", gap: 30, alignItems: "end" }}>
            <div>
              <p style={{ fontSize: 10, fontWeight: 900, letterSpacing: "0.30em", textTransform: "uppercase", color: "#c9a84c", marginBottom: 12 }}>THE FIRST POLISHED VERTICAL</p>
              <h2 style={{ fontFamily: "Playfair Display, serif", fontSize: "clamp(32px,7vw,64px)", lineHeight: .98, fontWeight: 900, color: "#fff", marginBottom: 16, letterSpacing: "-.04em" }}>A premium creator launch room that moves like a living product.</h2>
              <p style={{ fontSize: 16, lineHeight: 1.75, color: "rgba(255,255,255,0.64)", maxWidth: 680 }}>VaultX should make creators feel the future before they read a feature list. The surface sells momentum: upload a raw asset, watch the system read it, package the paid drop, generate the teaser logic, and route the launch into revenue channels.</p>
            </div>
            <div style={{ display: "grid", gap: 10 }}>
              {[
                { k: "Immersive", v: "cinematic background motion, live status cards, and product panels that feel in motion" },
                { k: "Adult-safe", v: "premium language and suggestive energy without cheap or explicit positioning" },
                { k: "Revenue-native", v: "PPV, VIP, Telegram, Stripe, creator-owned data, and repeatable drops" },
              ].map((item) => (
                <div key={item.k} style={{ padding: 16, borderRadius: 16, background: "rgba(255,255,255,0.055)", border: "1px solid rgba(255,255,255,0.11)", backdropFilter: "blur(12px)" }}>
                  <div style={{ color: "#c9a84c", fontSize: 13, fontWeight: 950, marginBottom: 5 }}>{item.k}</div>
                  <div style={{ color: "rgba(255,255,255,0.56)", fontSize: 13, lineHeight: 1.55 }}>{item.v}</div>
                </div>
              ))}
            </div>
          </div>
          <div className="vaultx-command-grid">
            {[
              { step: "01", title: "Read the footage", body: "AI scores hook, lighting, body-cinema potential, safe teaser gates, and premium crop logic.", color: "#38bdf8" },
              { step: "02", title: "Build the drop", body: "Master, teaser, PPV cover, caption pack, DM pitch, thumbnail, and archive metadata move together.", color: "#c9a84c" },
              { step: "03", title: "Launch the funnel", body: "Route to VaultX, Telegram, VIP channels, public-safe socials, and paid unlocks with creator-first economics.", color: "#4ade80" },
            ].map((item) => (
              <div key={item.step} style={{ position: "relative", overflow: "hidden", minHeight: 178, padding: 20, borderRadius: 20, background: "linear-gradient(180deg,rgba(255,255,255,.07),rgba(255,255,255,.025))", border: `1px solid ${item.color}30` }}>
                <div style={{ position: "absolute", inset: 0, background: `linear-gradient(90deg,transparent,${item.color}22,transparent)`, animation: "vaultx-pulse-line 5s ease-in-out infinite" }} />
                <div style={{ position: "relative" }}>
                  <div style={{ color: item.color, fontSize: 11, fontWeight: 950, letterSpacing: ".18em", marginBottom: 18 }}>{item.step}</div>
                  <h3 style={{ fontFamily: "Playfair Display, serif", color: "#fff", fontSize: 24, lineHeight: 1.1, marginBottom: 10 }}>{item.title}</h3>
                  <p style={{ color: "rgba(255,255,255,.52)", fontSize: 13, lineHeight: 1.65 }}>{item.body}</p>
                </div>
              </div>
            ))}
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginTop: 26 }}>
            <Link href="/vault-x"><button style={{ background: "#c9a84c", color: "#050508", border: "none", borderRadius: 10, padding: "14px 24px", fontWeight: 950, letterSpacing: "0.06em", cursor: "pointer", textTransform: "uppercase" }}>Open VaultX →</button></Link>
            <Link href="/vault-x/editor"><button style={{ background: "rgba(255,255,255,0.07)", color: "#fff", border: "1px solid rgba(255,255,255,0.16)", borderRadius: 10, padding: "14px 24px", fontWeight: 850, cursor: "pointer" }}>Preview the editor</button></Link>
            <a href="#waitlist" style={{ textDecoration: "none" }}><button style={{ background: "rgba(201,168,76,0.10)", color: "#f4d37c", border: "1px solid rgba(201,168,76,0.26)", borderRadius: 10, padding: "14px 24px", fontWeight: 850, cursor: "pointer" }}>Join early access</button></a>
          </div>
        </div>
      </section>

      {/* ── PROOF OF WORK ── */}
      <div ref={reelRef.ref} style={{ position: "relative", zIndex: 1, padding: "72px 0 56px", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
        <div className={`reveal-up ${reelRef.visible ? "visible" : ""}`} style={{ textAlign: "center", marginBottom: 36, padding: "0 20px" }}>
          <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.28em", textTransform: "uppercase", color: "#38bdf8", marginBottom: 10 }}>PROOF OF WORK</p>
          <h2 style={{ fontFamily: "Playfair Display, serif", fontSize: "clamp(22px,6vw,38px)", fontWeight: 800, color: "#fff", lineHeight: 1.15, marginBottom: 12, textTransform: "uppercase", letterSpacing: "-0.01em" }}>
            REAL AI. GENERATED ON THIS PLATFORM.
          </h2>
          <p style={{ fontSize: 14, color: "rgba(255,255,255,0.43)", maxWidth: 560, margin: "0 auto" }}>
            A platform-wide motion wall led by VaultX: premium creator funnels, AI Video Lab, music campaigns, product drops, Clone Lab, social exports, and monetization flows. The first vertical feels alive, while CreatorVault shows the full empire behind it.
          </p>
        </div>
        <div style={{ overflow: "hidden", padding: "4px 0" }}>
          <div className="reel-track" style={{ paddingLeft: 20 }}>
            {[...commandCenterReels, ...commandCenterReels].map((clip, i) => (
              <VideoReelClip key={i} label={clip.label} badge={clip.badge} category={clip.category} videoSrc={clip.videoSrc} poster={clip.poster} />
            ))}
          </div>
        </div>
        <div className={`reveal-up d2 ${reelRef.visible ? "visible" : ""}`} style={{ textAlign: "center", marginTop: 32 }}>
          <Link href="/video-lab">
            <button style={{ background: "transparent", border: "2px solid #c9a84c", color: "#c9a84c", borderRadius: 8, padding: "12px 28px", fontSize: 13, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", cursor: "pointer" }}>
              CREATE YOUR FIRST AI VIDEO →
            </button>
          </Link>
        </div>
      </div>

      {/* ── LIVE VAULTX COMMAND CENTER ── */}
      <div ref={commandRef.ref} style={{ position: "relative", zIndex: 1, padding: "78px 20px 72px", borderTop: "1px solid rgba(255,255,255,0.06)", overflow: "hidden" }}>
        <div style={{ position: "absolute", inset: 0, background: "radial-gradient(circle at 20% 10%,rgba(56,189,248,0.12),transparent 34%),radial-gradient(circle at 80% 40%,rgba(201,168,76,0.10),transparent 34%)", pointerEvents: "none" }} />
        <div style={{ position: "relative", maxWidth: 1060, margin: "0 auto" }}>
          <div className={`reveal-up ${commandRef.visible ? "visible" : ""}`} style={{ maxWidth: 720, marginBottom: 34 }}>
            <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.28em", textTransform: "uppercase", color: "#c9a84c", marginBottom: 10 }}>LIVE GENERATION COMMAND CENTER</p>
            <h2 style={{ fontFamily: "Playfair Display, serif", fontSize: "clamp(28px,7vw,54px)", fontWeight: 800, color: "#fff", lineHeight: 1.05, marginBottom: 14 }}>
              Not a static homepage. <span style={{ color: "#38bdf8" }}>A living revenue room</span> you can feel.
            </h2>
            <p style={{ fontSize: 15, color: "rgba(255,255,255,0.58)", lineHeight: 1.75 }}>
              VaultX makes premium creators understand the power immediately: one raw asset can become a cinematic teaser, paid drop, cover frame, caption pack, distribution package, and reusable archive. The homepage should feel like the machine is already running.
            </p>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1.2fr) minmax(280px,0.8fr)", gap: 18, alignItems: "stretch" }}>
            <div className={`reveal-up d1 ${commandRef.visible ? "visible" : ""}`} style={{ position: "relative", minHeight: 390, borderRadius: 24, border: "1px solid rgba(255,255,255,0.10)", background: "linear-gradient(145deg,rgba(255,255,255,0.07),rgba(255,255,255,0.025))", overflow: "hidden", boxShadow: "0 30px 80px rgba(0,0,0,0.45)" }}>
              <video autoPlay muted loop playsInline preload="metadata" poster="/images/reel/reel-cinematic-trailer.png" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", opacity: 0.36 }}>
                <source src="/videos/vaultx-cinematic-trailer.mp4" type="video/mp4" />
              </video>
              <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg,rgba(5,5,8,0.38),rgba(5,5,8,0.96)),radial-gradient(circle at 55% 38%,rgba(56,189,248,0.18),transparent 34%)" }} />
              <div style={{ position: "absolute", top: 0, bottom: 0, width: "38%", background: "linear-gradient(90deg,transparent,rgba(56,189,248,0.18),transparent)", animation: "glow-scan 5.6s ease-in-out infinite" }} />
              <div style={{ position: "relative", zIndex: 2, padding: 22, height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {["AI Video", "OpenArt", "Cinematic", "Motion Lab", "Clone Lab", "ElevenLabs", "Sync.so", "Sound Studio"].map((tool, i) => (
                    <span key={i} style={{ fontSize: 10, color: i === 0 ? "#050508" : "rgba(255,255,255,0.72)", background: i === 0 ? "#38bdf8" : "rgba(255,255,255,0.075)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 999, padding: "6px 10px", fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase" }}>{tool}</span>
                  ))}
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(125px,1fr))", gap: 10 }}>
                  {commandCards.map((card, i) => (
                    <div key={card.title} style={{ position: "relative", minHeight: 120, borderRadius: 16, border: `1px solid ${card.color}44`, background: "rgba(5,5,8,0.68)", padding: 14, animation: `float-card ${5 + i * 0.45}s ease-in-out infinite`, animationDelay: `${i * 0.18}s` }}>
                      <div style={{ fontSize: 11, fontWeight: 800, color: card.color, letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: 8 }}>{String(i + 1).padStart(2, "0")} · {card.title}</div>
                      <div style={{ fontSize: 12, color: "rgba(255,255,255,0.62)", lineHeight: 1.55 }}>{card.body}</div>
                    </div>
                  ))}
                </div>
                <div style={{ height: 46, borderRadius: 14, border: "1px solid rgba(56,189,248,0.26)", background: "rgba(56,189,248,0.06)", overflow: "hidden", position: "relative" }}>
                  <div style={{ position: "absolute", top: 0, bottom: 0, width: "36%", background: "linear-gradient(90deg,transparent,rgba(56,189,248,0.45),transparent)", animation: "command-flow 3.8s linear infinite" }} />
                  <div style={{ position: "relative", zIndex: 2, height: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 10, color: "rgba(255,255,255,0.76)", fontSize: 12, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase" }}>
                    Idea → Motion Asset → Sales Funnel → Multi-Platform Distribution → Revenue
                  </div>
                </div>
              </div>
            </div>

            <div className={`reveal-up d2 ${commandRef.visible ? "visible" : ""}`} style={{ display: "grid", gap: 12 }}>
              {[
                { k: "10", v: "visual lanes live now", c: "#38bdf8" },
                { k: "20+", v: "platform destinations", c: "#c9a84c" },
                { k: "1", v: "video can become a full campaign", c: "#4ade80" },
                { k: "24/7", v: "machine built to ship", c: "#fb923c" },
              ].map((item, i) => (
                <div key={item.v} style={{ borderRadius: 18, border: `1px solid ${item.c}36`, background: "rgba(255,255,255,0.035)", padding: "20px 18px" }}>
                  <div style={{ fontFamily: "Playfair Display, serif", fontSize: 38, fontWeight: 800, color: item.c, lineHeight: 1 }}>{item.k}</div>
                  <div style={{ fontSize: 12, color: "rgba(255,255,255,0.52)", textTransform: "uppercase", letterSpacing: "0.12em", fontWeight: 700, marginTop: 6 }}>{item.v}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── PLATFORM UNIVERSE ── */}
      <div ref={universeRef.ref} style={{ position: "relative", zIndex: 1, padding: "78px 20px 70px", borderTop: "1px solid rgba(255,255,255,0.06)", overflow: "hidden" }}>
        <div style={{ maxWidth: 1060, margin: "0 auto" }}>
          <div className={`reveal-up ${universeRef.visible ? "visible" : ""}`} style={{ textAlign: "center", marginBottom: 38 }}>
            <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.28em", textTransform: "uppercase", color: "#38bdf8", marginBottom: 10 }}>THE PLATFORM UNIVERSE</p>
            <h2 style={{ fontFamily: "Playfair Display, serif", fontSize: "clamp(28px,7vw,48px)", fontWeight: 800, color: "#fff", lineHeight: 1.08, marginBottom: 12 }}>Every option imaginable, built around video first.</h2>
            <p style={{ fontSize: 15, color: "rgba(255,255,255,0.52)", lineHeight: 1.7, maxWidth: 700, margin: "0 auto" }}>
              The page now opens doors instead of ending the conversation. Each lane shows a different world the infrastructure can power, while the moving distribution rail proves the same asset can become an entire campaign.
            </p>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(190px,1fr))", gap: 14, marginBottom: 34 }}>
            {platformUniverse.map((card, i) => (
              <div key={card.title} className={`reveal-up ${universeRef.visible ? "visible" : ""}`} style={{ position: "relative", minHeight: 260, borderRadius: 20, overflow: "hidden", border: `1px solid ${card.tone}36`, background: "rgba(255,255,255,0.035)", transitionDelay: `${i * 0.06}s` }}>
                {card.videoSrc ? (
                  <video autoPlay muted loop playsInline preload="metadata" poster={card.poster} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", opacity: 0.78 }}>
                    <source src={card.videoSrc} type="video/mp4" />
                  </video>
                ) : (
                  <img src={card.poster} alt={card.title} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", opacity: 0.62 }} />
                )}
                <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg,rgba(5,5,8,0.18),rgba(5,5,8,0.92))" }} />
                <div style={{ position: "absolute", top: 12, left: 12, background: "rgba(5,5,8,0.72)", border: `1px solid ${card.tone}55`, color: card.tone, borderRadius: 999, padding: "5px 10px", fontSize: 9, fontWeight: 800, letterSpacing: "0.1em", textTransform: "uppercase" }}>{card.tag}</div>
                <div style={{ position: "absolute", left: 14, right: 14, bottom: 14 }}>
                  <div style={{ fontFamily: "Playfair Display, serif", fontSize: 22, color: "#fff", fontWeight: 800, lineHeight: 1.05 }}>{card.title}</div>
                  <div style={{ marginTop: 8, fontSize: 12, color: "rgba(255,255,255,0.52)", lineHeight: 1.5 }}>A different visual world the platform can generate, package, and monetize.</div>
                </div>
              </div>
            ))}
          </div>
          <div className={`reveal-up d2 ${universeRef.visible ? "visible" : ""}`} style={{ borderRadius: 20, border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.03)", overflow: "hidden", padding: "18px 0" }}>
            <div style={{ padding: "0 18px 14px", display: "flex", justifyContent: "space-between", gap: 16, flexWrap: "wrap", alignItems: "center" }}>
              <div style={{ fontSize: 11, fontWeight: 800, color: "rgba(255,255,255,0.72)", letterSpacing: "0.14em", textTransform: "uppercase" }}>Distribution rail</div>
              <div style={{ fontSize: 12, color: "rgba(255,255,255,0.38)" }}>One source video becomes a full attention system.</div>
            </div>
            <div style={{ overflow: "hidden" }}>
              <div style={{ display: "flex", gap: 10, width: "max-content", animation: "rail-scroll 30s linear infinite", paddingLeft: 18 }}>
                {[...distributionSteps, ...distributionSteps].map((step, i) => (
                  <div key={`${step}-${i}`} style={{ minWidth: 150, borderRadius: 14, border: "1px solid rgba(56,189,248,0.22)", background: "linear-gradient(145deg,rgba(56,189,248,0.10),rgba(255,255,255,0.035))", padding: "14px 16px" }}>
                    <div style={{ fontSize: 9, color: "#38bdf8", fontWeight: 800, letterSpacing: "0.14em", textTransform: "uppercase" }}>Output {String((i % distributionSteps.length) + 1).padStart(2, "0")}</div>
                    <div style={{ fontSize: 14, color: "#fff", fontWeight: 700, marginTop: 5 }}>{step}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── THE ARSENAL ── */}
      <div ref={arsenalRef.ref} style={{ position: "relative", zIndex: 1, padding: "72px 20px 64px", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
        <div className={`reveal-up ${arsenalRef.visible ? "visible" : ""}`} style={{ textAlign: "center", marginBottom: 40 }}>
          <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.28em", textTransform: "uppercase", color: "#38bdf8", marginBottom: 10 }}>THE ARSENAL</p>
          <h2 style={{ fontFamily: "Playfair Display, serif", fontSize: "clamp(26px,6vw,42px)", fontWeight: 800, color: "#fff", lineHeight: 1.15 }}>Tools that feel like cheating.</h2>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(280px,1fr))", gap: 16, maxWidth: 900, margin: "0 auto" }}>
          <div className={`reveal-up ${arsenalRef.visible ? "visible" : ""}`}>
            <ArsenalCard icon="👑" badge="REPLICATE · FLUX" badgeColor="#c9a84c" title="Clone Command" subtitle="Your AI twin, on autopilot." subtitleColor="#c9a84c" description="Train your custom LoRA. Generate on-brand images and videos of yourself in any scene — crimson suit to beach shoot — without a camera." cta="Open Clone Lab →" href="/clone-lab" />
          </div>
          <div className={`reveal-up d1 ${arsenalRef.visible ? "visible" : ""}`}>
            <ArsenalCard icon="🎬" badge="EPISODE PIPELINE" badgeColor="#38bdf8" title="Hollywood Replacement" subtitle="5-scene episodes. AI assembly. Download ready." subtitleColor="#38bdf8" description="Write a concept. AI writes the script. The AI scene engine renders each beat, then assembles music, pacing, and transitions. You get a finished MP4 — not 5 raw clips." cta="Open Hollywood →" href="/hollywood-replacement" />
          </div>
          <div className={`reveal-up d2 ${arsenalRef.visible ? "visible" : ""}`}>
            <ArsenalCard icon="👗" badge="12 MODES" badgeColor="#4ade80" title="Apparel Lab" subtitle="Design. Simulate. Cost. Drop." subtitleColor="#4ade80" description="12 production modes: AI garment generation, fabric physics simulation, pattern studio, cost engine, tech pack PDF export, POD integration." cta="Open Apparel Lab →" href="/apparel-lab" />
          </div>
          <div className={`reveal-up d3 ${arsenalRef.visible ? "visible" : ""}`}>
            <ArsenalCard icon="⚡" badge="AUTO PIPELINE" badgeColor="#fb923c" title="Engine" subtitle="Social Factory · FunnelForge · VaultLive." subtitleColor="#fb923c" description="1 video → 30-day content calendar. 5-stage AI sales funnel. Multi-destination live stream. The machine that ships while you sleep." cta="Open Engine →" href="/social-factory" />
          </div>
        </div>
      </div>

      {/* ── CLONE LAB AS ONE LANE ── */}
      <div ref={cloneRef.ref} style={{ position: "relative", zIndex: 1, padding: "72px 20px 64px", borderTop: "1px solid rgba(255,255,255,0.06)", overflow: "hidden" }}>
        <div style={{ maxWidth: 900, margin: "0 auto", display: "flex", flexWrap: "wrap", gap: 32, alignItems: "center" }}>
          {/* KingCam video panel — plays the clone drop video */}
          <div className={`reveal-up ${cloneRef.visible ? "visible" : ""}`} style={{ flex: "0 0 auto", width: "min(280px,90vw)" }}>
            <div style={{ borderRadius: 16, overflow: "hidden", border: "1px solid rgba(201,168,76,0.3)", background: "linear-gradient(160deg,#1a1a2e 0%,#0d0d14 100%)", aspectRatio: "3/4", position: "relative" }}>
              {/* KingCam remains the operator proof point, not the whole homepage narrative. */}
              <video
                autoPlay
                muted
                loop
                playsInline
                preload="auto"
                style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", objectPosition: "center top", zIndex: 0 }}
              >
                <source src="/videos/kingcam-clone-1.mp4" type="video/mp4" />
              </video>
              {/* Fallback static image */}
              <div style={{ position: "absolute", inset: 0, backgroundImage: "url('/assets/kingcam-hero.jpg')", backgroundSize: "cover", backgroundPosition: "center top", backgroundRepeat: "no-repeat", zIndex: 0 }} />
              <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg,transparent 50%,rgba(5,5,8,0.95) 100%)", zIndex: 1 }} />
              <div style={{ position: "absolute", top: 12, left: 12, background: "rgba(0,0,0,0.7)", border: "1px solid rgba(56,189,248,0.5)", borderRadius: 6, padding: "3px 10px", zIndex: 2 }}>
                <span style={{ fontSize: 9, fontWeight: 700, color: "#38bdf8", letterSpacing: "0.1em" }}>REPLICATE · FLUX LORA</span>
              </div>
              <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: "16px 14px 14px", zIndex: 2 }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: "#c9a84c", letterSpacing: "0.12em", textTransform: "uppercase" }}>KINGCAM · LIVE GENERATION</div>
                <div style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", marginTop: 2 }}>Rendered in real time via your LoRA</div>
              </div>
            </div>
          </div>

          {/* Copy */}
          <div className={`reveal-up d1 ${cloneRef.visible ? "visible" : ""}`} style={{ flex: "1 1 260px", minWidth: 0 }}>
            <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.28em", textTransform: "uppercase", color: "#38bdf8", marginBottom: 14 }}>CLONE LAB · ONE POWER LANE</p>
            <h2 style={{ fontFamily: "Playfair Display, serif", fontSize: "clamp(24px,6vw,38px)", fontWeight: 800, lineHeight: 1.1, marginBottom: 16 }}>
              Your clone is one lane. <span style={{ color: "#38bdf8" }}>The platform</span> is the whole empire.
            </h2>
            <p style={{ fontSize: 14, color: "rgba(255,255,255,0.58)", lineHeight: 1.7, marginBottom: 24 }}>
              Clone Lab proves what the infrastructure can do with identity, voice, style, and motion, but it is only one part of the system. The bigger promise is that CreatorVault can turn any brand lane into video-first content, packaged campaigns, and monetization paths.
            </p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px 16px", marginBottom: 28 }}>
              {["LoRA training on 20+ images","Voice cloning via ElevenLabs","On-demand image + video generation","Brand-locked prompts + style presets"].map((feat, i) => (
                <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
                  <div style={{ width: 16, height: 16, borderRadius: "50%", background: "rgba(56,189,248,0.15)", border: "1px solid rgba(56,189,248,0.5)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 1 }}>
                    <div style={{ width: 5, height: 5, borderRadius: "50%", background: "#38bdf8" }} />
                  </div>
                  <span style={{ fontSize: 12, color: "rgba(255,255,255,0.62)", lineHeight: 1.5 }}>{feat}</span>
                </div>
              ))}
            </div>
            <Link href="/clone-lab">
              <button style={{ background: "#38bdf8", color: "#050508", border: "none", borderRadius: 8, padding: "13px 28px", fontSize: 13, fontWeight: 700, letterSpacing: "0.07em", textTransform: "uppercase", cursor: "pointer" }}>
                OPEN CLONE LAB →
              </button>
            </Link>
          </div>
        </div>
      </div>

      {/* ── METRICS STRIP ── */}
      <div ref={metricsRef.ref} style={{ position: "relative", zIndex: 1, borderTop: "1px solid rgba(255,255,255,0.06)", borderBottom: "1px solid rgba(255,255,255,0.06)", background: "rgba(255,255,255,0.02)" }}>
        <div style={{ display: "flex", flexWrap: "wrap", maxWidth: 900, margin: "0 auto" }}>
          {[
            { prefix: "$", val: m1, suffix: "", label: "AVG. MONTHLY EARNINGS", color: "#38bdf8" },
            { prefix: "", val: m2, suffix: "%", label: "REVENUE YOU KEEP", color: "#38bdf8" },
            { prefix: "", val: m3, suffix: "", label: "TOOLS IN ONE PLATFORM", color: "#fff" },
            { prefix: "", val: m4, suffix: "+", label: "DISTRIBUTION PLATFORMS", color: "#fff" },
          ].map((s, i) => (
            <div key={i} className={`reveal-up ${metricsRef.visible ? "visible" : ""}`} style={{ flex: "1 1 120px", padding: "32px 16px", textAlign: "center", borderRight: i < 3 ? "1px solid rgba(255,255,255,0.06)" : "none", transitionDelay: `${i * 0.08}s` }}>
              <div style={{ fontFamily: "Playfair Display, serif", fontSize: "clamp(28px,7vw,44px)", fontWeight: 800, color: s.color, lineHeight: 1 }}>{s.prefix}{s.val.toLocaleString()}{s.suffix}</div>
              <div style={{ fontSize: 9, fontWeight: 700, color: "rgba(255,255,255,0.33)", letterSpacing: "0.12em", textTransform: "uppercase", marginTop: 8 }}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── THE EMPIRE MAP ── */}
      <div ref={mapRef.ref} style={{ position: "relative", zIndex: 1, padding: "72px 20px 64px", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
        <div className={`reveal-up ${mapRef.visible ? "visible" : ""}`} style={{ textAlign: "center", marginBottom: 48 }}>
          <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.28em", textTransform: "uppercase", color: "#38bdf8", marginBottom: 10 }}>THE EMPIRE MAP</p>
          <h2 style={{ fontFamily: "Playfair Display, serif", fontSize: "clamp(26px,6vw,42px)", fontWeight: 800, color: "#fff", lineHeight: 1.15 }}>One platform. Every vertical.</h2>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(240px,1fr))", gap: 16, maxWidth: 900, margin: "0 auto" }}>
          {[
            { icon: "📱", label: "Social OS", desc: "Profiles · Feed · Stories · DMs · Explore · Communities", color: "#38bdf8" },
            { icon: "🤖", label: "AI Studio", desc: "VideoLab · Hollywood · Apparel · FunnelForge · Social Factory", color: "#c9a84c" },
            { icon: "🚀", label: "Distribution", desc: "20+ platforms · TikTok · Reels · Shorts · Stories · YouTube", color: "#4ade80" },
            { icon: "💎", label: "Monetization", desc: "Subscriptions · Tips · Marketplace · NFC Cards · VaultX", color: "#c9a84c" },
            { icon: "🏥", label: "DayShift Doctor", desc: "In-club studio · VIP autopilot · Nurse guidance · Shift genius", color: "#fb923c" },
            { icon: "🎵", label: "Audio Stack", desc: "ElevenLabs TTS · Sync.so lip-sync · Sound Studio scores · AI mixdown", color: "#38bdf8" },
          ].map((item, i) => (
            <div key={i} className={`reveal-up ${mapRef.visible ? "visible" : ""}`} style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 14, padding: "20px 18px", transitionDelay: `${i * 0.07}s` }}>
              <div style={{ fontSize: 24, marginBottom: 10 }}>{item.icon}</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: item.color, marginBottom: 6 }}>{item.label}</div>
              <div style={{ fontSize: 12, color: "rgba(255,255,255,0.38)", lineHeight: 1.6 }}>{item.desc}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── EARLY ACCESS ── */}
      <div id="waitlist" ref={waitlistRef.ref} style={{ position: "relative", zIndex: 1, padding: "72px 20px 80px", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
        <div style={{ maxWidth: 560, margin: "0 auto" }}>
          <div className={`reveal-up ${waitlistRef.visible ? "visible" : ""}`} style={{ textAlign: "center", marginBottom: 36 }}>
            <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.28em", textTransform: "uppercase", color: "#c9a84c", marginBottom: 10 }}>EARLY ACCESS</p>
            <h2 style={{ fontFamily: "Playfair Display, serif", fontSize: "clamp(26px,6vw,38px)", fontWeight: 800, color: "#fff", lineHeight: 1.2, marginBottom: 12 }}>Claim your VaultX invite before the room opens.</h2>
            <p style={{ fontSize: 15, color: "rgba(255,255,255,0.48)", lineHeight: 1.6 }}>Invite-only soft launch. Early creators get priority access to the premium vertical, founder pricing, and direct input on the creator revenue operating system.</p>
          </div>
          <div className={`reveal-up d1 ${waitlistRef.visible ? "visible" : ""}`} style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 20, padding: 28 }}>
            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <label style={{ display: "block", fontSize: 10, fontWeight: 700, letterSpacing: "0.15em", textTransform: "uppercase", color: "rgba(255,255,255,0.42)", marginBottom: 7 }}>Email</label>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@vaultx.com" style={{ width: "100%", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 8, padding: "11px 14px", fontSize: 14, color: "#fff", boxSizing: "border-box" }} />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <label style={{ display: "block", fontSize: 10, fontWeight: 700, letterSpacing: "0.15em", textTransform: "uppercase", color: "rgba(255,255,255,0.42)", marginBottom: 7 }}>Name</label>
                  <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Your name" style={{ width: "100%", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 8, padding: "11px 14px", fontSize: 14, color: "#fff", boxSizing: "border-box" }} />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: 10, fontWeight: 700, letterSpacing: "0.15em", textTransform: "uppercase", color: "rgba(255,255,255,0.42)", marginBottom: 7 }}>Phone</label>
                  <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="+1 (555) 000-0000" style={{ width: "100%", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 8, padding: "11px 14px", fontSize: 14, color: "#fff", boxSizing: "border-box" }} />
                </div>
              </div>
              <div>
                <label style={{ display: "block", fontSize: 10, fontWeight: 700, letterSpacing: "0.15em", textTransform: "uppercase", color: "rgba(255,255,255,0.42)", marginBottom: 7 }}>I am a...</label>
                <select value={creatorType} onChange={e => setCreatorType(e.target.value)} style={{ width: "100%", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 8, padding: "11px 14px", fontSize: 14, color: creatorType ? "#fff" : "rgba(255,255,255,0.32)", boxSizing: "border-box", appearance: "none", cursor: "pointer" }}>
                  <option value="" style={{ background: "#0a0a0f" }}>Select your creator type</option>
                  {creatorTypes.map(ct => (<option key={ct.value} value={ct.value} style={{ background: "#0a0a0f" }}>{ct.label}</option>))}
                </select>
              </div>
              <button type="submit" disabled={signupMutation.isPending} style={{ background: signupMutation.isPending ? "rgba(201,168,76,0.5)" : "#c9a84c", color: "#050508", border: "none", borderRadius: 8, padding: "13px 28px", fontSize: 14, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", cursor: signupMutation.isPending ? "not-allowed" : "pointer", marginTop: 4 }}>
                {signupMutation.isPending ? "SECURING YOUR SPOT..." : "REQUEST EARLY ACCESS"}
              </button>
              <p style={{ fontSize: 12, color: "rgba(255,255,255,0.26)", textAlign: "center" }}>No spam. No noise. Just your private invite path into VaultX.</p>
            </form>
          </div>
        </div>
      </div>

      {/* ── FOOTER ── */}
      <div style={{ position: "relative", zIndex: 1, borderTop: "1px solid rgba(255,255,255,0.06)", padding: "28px 20px", textAlign: "center" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, marginBottom: 12 }}>
          <img src="/logo-white.png" alt="CreatorVault" style={{ height: 24, objectFit: "contain", opacity: 0.55 }} />
        </div>
        <p style={{ fontSize: 11, color: "rgba(255,255,255,0.2)", letterSpacing: "0.1em" }}>© 2026 CreatorVault · The Empire OS · All rights reserved</p>
      </div>
    </div>
  );
}
