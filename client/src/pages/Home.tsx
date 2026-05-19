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

  // Platform-wide proof reel — KingCam is the operator, not the only visual story.
  // These slots are ready to be replaced by Polla AI renders while retaining verified fallbacks.
  const commandCenterReels = [
    { label: "AI Video Lab Trailer", badge: "POLLA AI · HERO", category: "VIDEO-FIRST", src: "/videos/reel-cinematic-trailer.mp4", videoSrc: "/videos/reel-cinematic-trailer.mp4", poster: "/images/reel/reel-cinematic-trailer.png" },
    { label: "Music Campaign Visual", badge: "POLLA AI", category: "MUSIC", src: "/videos/reel-music-video.mp4", videoSrc: "/videos/reel-music-video.mp4", poster: "/images/reel/reel-music-video.png" },
    { label: "Product Drop Render", badge: "KLING AI", category: "COMMERCE", src: "/videos/reel-product-drop.mp4", videoSrc: "/videos/reel-product-drop.mp4", poster: "/images/reel/reel-product-drop.png" },
    { label: "Apparel Drop Simulation", badge: "REPLICATE", category: "APPAREL", src: "/videos/reel-apparel-drop.mp4", videoSrc: "/videos/reel-apparel-drop.mp4", poster: "/images/reel/reel-apparel-drop.png" },
    { label: "Creator Promo System", badge: "OPENART AI", category: "PROMO", videoSrc: "/videos/reel-creator-promo.mp4", poster: "/images/reel/reel-creator-promo.png" },
    { label: "AI Portrait Campaign", badge: "OPENART AI", category: "BRAND", videoSrc: "/videos/reel-ai-portrait.mp4", poster: "/images/reel/reel-ai-portrait.png" },
    { label: "KingCam Operator Proof", badge: "KINGCAM · POLLO", category: "FOUNDER", videoSrc: "/videos/kingcam-hero-cam.mp4", poster: "/assets/kingcam-hero.jpg" },
    { label: "Clone Ambassador", badge: "FLUX LORA", category: "CLONE LAB", videoSrc: "/videos/kingcam-clone-1.mp4", poster: "/assets/kingcam-hero.jpg" },
    { label: "Empire Brand Story", badge: "KLING AI", category: "PLATFORM", videoSrc: "/videos/reel-brand-story.mp4", poster: "/images/reel/reel-cinematic-trailer.png" },
    { label: "VaultX Premium Flow", badge: "CREATORVAULT", category: "MONETIZE", videoSrc: "/videos/vaultx-cinematic-trailer.mp4", poster: "/images/reel/reel-product-drop.png" },
  ];

  const commandCards = [
    { title: "Prompt", body: "Type the concept: product drop, music promo, apparel campaign, VIP funnel, creator trailer.", color: "#38bdf8" },
    { title: "Generate", body: "Polla AI, OpenArt, Kling, Runway, Replicate, ElevenLabs, Sync.so, Soundverse, and FFmpeg turn it into motion.", color: "#c9a84c" },
    { title: "Package", body: "The system formats hooks, captions, reels, stories, shorts, thumbnails, offer pages, and premium assets.", color: "#4ade80" },
    { title: "Monetize", body: "Subscriptions, tips, marketplace, VaultX, NFC cards, and funnels convert attention into owned revenue.", color: "#fb923c" },
  ];

  const platformUniverse = [
    { title: "AI Video Lab", tag: "Prompt → MP4", videoSrc: "/videos/reel-cinematic-trailer.mp4", poster: "/images/reel/reel-cinematic-trailer.png", tone: "#38bdf8" },
    { title: "Music Drops", tag: "Visualizers · promos", videoSrc: "/videos/reel-music-video.mp4", poster: "/images/reel/reel-music-video.png", tone: "#c9a84c" },
    { title: "Commerce", tag: "Products · funnels", videoSrc: "/videos/reel-product-drop.mp4", poster: "/images/reel/reel-product-drop.png", tone: "#4ade80" },
    { title: "Apparel", tag: "Mockups · lookbooks", videoSrc: "/videos/reel-apparel-drop.mp4", poster: "/images/reel/reel-apparel-drop.png", tone: "#fb923c" },
    { title: "Creator Promo", tag: "Campaign machine", videoSrc: "/videos/reel-creator-promo.mp4", poster: "/images/reel/reel-creator-promo.png", tone: "#38bdf8" },
    { title: "VaultX", tag: "Premium monetization", videoSrc: "/videos/vaultx-cinematic-trailer.mp4", poster: "/images/reel/reel-product-drop.png", tone: "#c9a84c" },
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
        .reveal-up{opacity:0;transform:translateY(36px);transition:opacity 0.65s ease,transform 0.65s ease}
        .reveal-up.visible{opacity:1;transform:translateY(0)}
        .reveal-up.d1{transition-delay:0.1s}.reveal-up.d2{transition-delay:0.2s}.reveal-up.d3{transition-delay:0.3s}
        .reel-track{display:flex;gap:12px;animation:reel-scroll 42s linear infinite}
        .reel-track:hover{animation-play-state:paused}
        input:focus,select:focus{outline:none;border-color:rgba(201,168,76,0.6)!important;box-shadow:0 0 0 3px rgba(201,168,76,0.12)!important}
      `}</style>

      {/* ── HERO — KingCam full-bleed with video background ── */}
      <div style={{ position: "relative", minHeight: "100svh", display: "flex", flexDirection: "column", overflow: "hidden" }}>
        {/* KingCam looping video background */}
        <video
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
          style={{
            position: "absolute", inset: 0, width: "100%", height: "100%",
            objectFit: "cover", objectPosition: "center 15%",
            zIndex: 0, opacity: 0.55,
          }}
        >
          <source src="/videos/kingcam-hero-cam.mp4" type="video/mp4" />
          {/* Fallback: static KingCam image if video fails */}
          <div style={{ position: "absolute", inset: 0, backgroundImage: "url('/assets/kingcam-hero.jpg')", backgroundSize: "cover", backgroundPosition: "center 15%" }} />
        </video>
        {/* Cinematic dark overlay */}
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg,rgba(5,5,8,0.25) 0%,rgba(5,5,8,0.5) 50%,rgba(5,5,8,0.97) 100%)", zIndex: 1 }} />
        <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse at center,transparent 30%,rgba(5,5,8,0.55) 100%)", zIndex: 1 }} />

        {/* Nav */}
        <div style={{ position: "relative", zIndex: 10, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "18px 20px" }}>
          <img src="/logo-white.png" alt="CreatorVault" style={{ height: 28, objectFit: "contain" }} />
          <Link href="/login">
            <button style={{ background: "transparent", border: "1px solid rgba(255,255,255,0.2)", color: "#fff", borderRadius: 8, padding: "8px 16px", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>Log In</button>
          </Link>
        </div>

        {/* Hero content — pushed to bottom so KingCam shows above */}
        <div style={{ position: "relative", zIndex: 10, display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", padding: "0 20px 40px", marginTop: "auto", width: "100%", maxWidth: 640, alignSelf: "center" }}>
          {/* Invite badge */}
          <div style={{ display: "inline-flex", alignItems: "center", gap: 7, background: "rgba(201,168,76,0.12)", border: "1px solid rgba(201,168,76,0.35)", borderRadius: 100, padding: "5px 14px", marginBottom: 18, opacity: heroLoaded ? 1 : 0, transition: "opacity 0.6s ease" }}>
            <div style={{ width: 5, height: 5, borderRadius: "50%", background: "#c9a84c", animation: "shimmer 2s ease-in-out infinite" }} />
            <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.18em", textTransform: "uppercase", color: "#c9a84c" }}>✦ INVITE-ONLY · EARLY ACCESS 2026</span>
          </div>

          {/* Headline */}
          <h1 style={{ fontFamily: "Playfair Display, serif", fontSize: "clamp(34px,9vw,64px)", fontWeight: 800, color: "#fff", lineHeight: 1.08, marginBottom: 14, letterSpacing: "-0.02em", opacity: heroLoaded ? 1 : 0, transform: heroLoaded ? "translateY(0)" : "translateY(24px)", transition: "opacity 0.7s ease 0.15s,transform 0.7s ease 0.15s" }}>
            Your <span style={{ color: "#38bdf8" }}>Creator Empire</span> OS
          </h1>

          {/* Sub */}
          <p style={{ fontSize: "clamp(13px,3.5vw,16px)", color: "rgba(255,255,255,0.7)", lineHeight: 1.6, marginBottom: 6, maxWidth: 480, opacity: heroLoaded ? 1 : 0, transition: "opacity 0.7s ease 0.3s" }}>
            AI Video Lab. Hollywood production pipeline. In-club content studio. Social autopilot. Marketplace. All in one platform.
          </p>
          <p style={{ fontSize: "clamp(12px,3vw,14px)", color: "rgba(255,255,255,0.48)", marginBottom: 26, opacity: heroLoaded ? 1 : 0, transition: "opacity 0.7s ease 0.4s" }}>
            Keep <span style={{ color: "#c9a84c", fontWeight: 700 }}>85%</span> of every dollar you earn. No middlemen. No ceiling.
          </p>

          {/* CTAs */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: 12, justifyContent: "center", marginBottom: 18, opacity: heroLoaded ? 1 : 0, transition: "opacity 0.7s ease 0.5s" }}>
            <a href="#waitlist" style={{ textDecoration: "none" }}>
              <button style={{ background: "#c9a84c", color: "#050508", border: "none", borderRadius: 8, padding: "14px 30px", fontSize: 14, fontWeight: 700, letterSpacing: "0.06em", cursor: "pointer", animation: "pulse-gold 3s ease-in-out infinite", textTransform: "uppercase" }}>
                JOIN THE WAITLIST
              </button>
            </a>
            <Link href="/login">
              <button style={{ background: "rgba(255,255,255,0.07)", color: "#fff", border: "1px solid rgba(255,255,255,0.18)", borderRadius: 8, padding: "14px 24px", fontSize: 14, fontWeight: 600, cursor: "pointer" }}>
                Log In → Enter
              </button>
            </Link>
          </div>

          {/* Secondary links */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: 18, justifyContent: "center", marginBottom: 28 }}>
            <Link href="/login"><span style={{ fontSize: 12, color: "rgba(255,255,255,0.38)", cursor: "pointer", textDecoration: "underline", textDecorationColor: "rgba(255,255,255,0.18)" }}>Already have an invite? Log in</span></Link>
            <Link href="/vault-x"><span style={{ fontSize: 12, color: "rgba(201,168,76,0.6)", cursor: "pointer", textDecoration: "underline", textDecorationColor: "rgba(201,168,76,0.28)" }}>18+ creator? Learn about VaultX</span></Link>
          </div>

          {/* Live stats strip */}
          <div style={{ display: "flex", gap: 0, width: "100%", maxWidth: 480, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, overflow: "hidden", opacity: heroLoaded ? 1 : 0, transition: "opacity 0.8s ease 0.7s" }}>
            {[
              { val: "301", label: "ROUTES", color: "#38bdf8" },
              { val: "979", label: "TRPC PROCEDURES", color: "#38bdf8" },
              { val: "408+", label: "DATABASE TABLES", color: "#38bdf8" },
              { val: "LIVE", label: "STRIPE", color: "#c9a84c" },
            ].map((s, i) => (
              <div key={i} style={{ flex: 1, padding: "10px 4px", textAlign: "center", borderRight: i < 3 ? "1px solid rgba(255,255,255,0.07)" : "none" }}>
                <div style={{ fontSize: "clamp(11px,3vw,14px)", fontWeight: 700, color: s.color }}>{s.val}</div>
                <div style={{ fontSize: 8, color: "rgba(255,255,255,0.32)", letterSpacing: "0.08em", textTransform: "uppercase", marginTop: 2 }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Scroll indicator */}
        <div style={{ position: "absolute", bottom: 20, left: "50%", transform: "translateX(-50%)", display: "flex", flexDirection: "column", alignItems: "center", gap: 5, opacity: 0.32, zIndex: 10 }}>
          <span style={{ fontSize: 9, letterSpacing: "0.25em", textTransform: "uppercase", color: "#fff" }}>SCROLL</span>
          <div style={{ width: 1, height: 28, background: "rgba(255,255,255,0.4)" }} />
        </div>
      </div>

      {/* ── VAULTX HERO / SOCIAL PROOF / BODY CINEMA ── */}
      <section style={{ position: "relative", zIndex: 1, padding: "76px 20px 62px", borderTop: "1px solid rgba(201,168,76,0.18)", overflow: "hidden", background: "linear-gradient(180deg,#050508 0%,#09070b 100%)" }}>
        <video autoPlay muted loop playsInline preload="metadata" poster="/images/reel/reel-product-drop.png" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", opacity: 0.22 }}>
          <source src="/videos/vaultx-cinematic-trailer.mp4" type="video/mp4" />
        </video>
        <div style={{ position: "absolute", inset: 0, background: "radial-gradient(circle at 18% 20%,rgba(201,168,76,0.18),transparent 30%),linear-gradient(180deg,rgba(5,5,8,0.74),#050508 88%)" }} />
        <div style={{ position: "relative", maxWidth: 1120, margin: "0 auto", display: "grid", gridTemplateColumns: "1.05fr .95fr", gap: 34, alignItems: "center" }}>
          <div>
            <p style={{ fontSize: 10, fontWeight: 800, letterSpacing: "0.28em", textTransform: "uppercase", color: "#c9a84c", marginBottom: 12 }}>VAULTX — THE PRIVATE MONETIZATION LAYER</p>
            <h2 style={{ fontFamily: "Playfair Display, serif", fontSize: "clamp(30px,7vw,58px)", lineHeight: 1.02, fontWeight: 850, color: "#fff", marginBottom: 16 }}>Premium creators need a revenue engine, not another link-in-bio.</h2>
            <p style={{ fontSize: 15, lineHeight: 1.75, color: "rgba(255,255,255,0.64)", maxWidth: 620 }}>VaultX packages adult-safe premium content workflows into tracked drops, private unlocks, fan movement, and creator-owned monetization. The pitch is not shock value. The pitch is control: proof, privacy, payment flow, and repeatable demand.</p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginTop: 24 }}>
              <Link href="/vault-x"><button style={{ background: "#c9a84c", color: "#050508", border: "none", borderRadius: 9, padding: "13px 22px", fontWeight: 900, letterSpacing: "0.06em", cursor: "pointer", textTransform: "uppercase" }}>Open VaultX →</button></Link>
              <a href="#waitlist" style={{ textDecoration: "none" }}><button style={{ background: "rgba(255,255,255,0.07)", color: "#fff", border: "1px solid rgba(255,255,255,0.16)", borderRadius: 9, padding: "13px 22px", fontWeight: 800, cursor: "pointer" }}>Request access</button></a>
            </div>
          </div>
          <div style={{ display: "grid", gap: 14 }}>
            {[
              { k: "Stripe-ready", v: "paid unlock surfaces and attribution paths" },
              { k: "Telegram-ready", v: "tracked drops, fan routing, and VIP movement" },
              { k: "Creator-safe", v: "age-gated positioning without cheap language" },
              { k: "Challenge-linked", v: "verified transactions feed revenue goals" },
            ].map((item) => (
              <div key={item.k} style={{ padding: 18, borderRadius: 16, background: "rgba(255,255,255,0.055)", border: "1px solid rgba(255,255,255,0.11)", backdropFilter: "blur(12px)" }}>
                <div style={{ color: "#c9a84c", fontSize: 13, fontWeight: 900, marginBottom: 5 }}>{item.k}</div>
                <div style={{ color: "rgba(255,255,255,0.56)", fontSize: 13 }}>{item.v}</div>
              </div>
            ))}
          </div>
        </div>
        <div style={{ position: "relative", maxWidth: 1120, margin: "32px auto 0", display: "grid", gridTemplateColumns: "repeat(4,minmax(0,1fr))", gap: 10 }}>
          {["Private unlocks", "Premium drops", "Creator-owned data", "Body Cinema campaigns"].map((label) => (
            <div key={label} style={{ padding: "14px 12px", textAlign: "center", borderRadius: 14, background: "rgba(201,168,76,0.09)", border: "1px solid rgba(201,168,76,0.2)", color: "rgba(255,255,255,0.72)", fontSize: 12, fontWeight: 800, letterSpacing: "0.06em", textTransform: "uppercase" }}>{label}</div>
          ))}
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
            A platform-wide reel wall for AI Video Lab, music campaigns, product drops, apparel, creator promos, Clone Lab, and monetization flows. KingCam runs the system, but CreatorVault sells the whole creator empire.
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

      {/* ── LIVE GENERATION COMMAND CENTER ── */}
      <div ref={commandRef.ref} style={{ position: "relative", zIndex: 1, padding: "78px 20px 72px", borderTop: "1px solid rgba(255,255,255,0.06)", overflow: "hidden" }}>
        <div style={{ position: "absolute", inset: 0, background: "radial-gradient(circle at 20% 10%,rgba(56,189,248,0.12),transparent 34%),radial-gradient(circle at 80% 40%,rgba(201,168,76,0.10),transparent 34%)", pointerEvents: "none" }} />
        <div style={{ position: "relative", maxWidth: 1060, margin: "0 auto" }}>
          <div className={`reveal-up ${commandRef.visible ? "visible" : ""}`} style={{ maxWidth: 720, marginBottom: 34 }}>
            <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.28em", textTransform: "uppercase", color: "#c9a84c", marginBottom: 10 }}>LIVE GENERATION COMMAND CENTER</p>
            <h2 style={{ fontFamily: "Playfair Display, serif", fontSize: "clamp(28px,7vw,54px)", fontWeight: 800, color: "#fff", lineHeight: 1.05, marginBottom: 14 }}>
              Not a landing page. <span style={{ color: "#38bdf8" }}>A content factory</span> you can feel.
            </h2>
            <p style={{ fontSize: 15, color: "rgba(255,255,255,0.58)", lineHeight: 1.75 }}>
              CreatorVault makes visitors understand the power immediately: one command can become a cinematic video, a product drop, a music visual, an apparel campaign, a premium funnel, and a distribution package. The homepage shows the machine, not just the founder.
            </p>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1.2fr) minmax(280px,0.8fr)", gap: 18, alignItems: "stretch" }}>
            <div className={`reveal-up d1 ${commandRef.visible ? "visible" : ""}`} style={{ position: "relative", minHeight: 390, borderRadius: 24, border: "1px solid rgba(255,255,255,0.10)", background: "linear-gradient(145deg,rgba(255,255,255,0.07),rgba(255,255,255,0.025))", overflow: "hidden", boxShadow: "0 30px 80px rgba(0,0,0,0.45)" }}>
              <video autoPlay muted loop playsInline preload="metadata" poster="/images/reel/reel-cinematic-trailer.png" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", opacity: 0.36 }}>
                <source src="/videos/reel-cinematic-trailer.mp4" type="video/mp4" />
              </video>
              <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg,rgba(5,5,8,0.38),rgba(5,5,8,0.96)),radial-gradient(circle at 55% 38%,rgba(56,189,248,0.18),transparent 34%)" }} />
              <div style={{ position: "absolute", top: 0, bottom: 0, width: "38%", background: "linear-gradient(90deg,transparent,rgba(56,189,248,0.18),transparent)", animation: "glow-scan 5.6s ease-in-out infinite" }} />
              <div style={{ position: "relative", zIndex: 2, padding: 22, height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {["Polla AI", "OpenArt", "Kling", "Runway", "Replicate", "ElevenLabs", "Sync.so", "Soundverse"].map((tool, i) => (
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
            <ArsenalCard icon="🎬" badge="EPISODE PIPELINE" badgeColor="#38bdf8" title="Hollywood Replacement" subtitle="5-scene episodes. FFmpeg stitch. Download ready." subtitleColor="#38bdf8" description="Write a concept. AI writes the script. Polla renders each scene. FFmpeg stitches with music and transitions. You get a finished MP4 — not 5 raw clips." cta="Open Hollywood →" href="/hollywood-replacement" />
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
            { icon: "🎵", label: "Audio Stack", desc: "ElevenLabs TTS · Sync.so lip-sync · Soundverse scores · FFmpeg", color: "#38bdf8" },
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
            <h2 style={{ fontFamily: "Playfair Display, serif", fontSize: "clamp(26px,6vw,38px)", fontWeight: 800, color: "#fff", lineHeight: 1.2, marginBottom: 12 }}>Claim your spot in the empire.</h2>
            <p style={{ fontSize: 15, color: "rgba(255,255,255,0.48)", lineHeight: 1.6 }}>Invite-only. First 500 creators get lifetime founder pricing and direct access to the full platform.</p>
          </div>
          <div className={`reveal-up d1 ${waitlistRef.visible ? "visible" : ""}`} style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 20, padding: 28 }}>
            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <label style={{ display: "block", fontSize: 10, fontWeight: 700, letterSpacing: "0.15em", textTransform: "uppercase", color: "rgba(255,255,255,0.42)", marginBottom: 7 }}>Email</label>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@empire.com" style={{ width: "100%", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 8, padding: "11px 14px", fontSize: 14, color: "#fff", boxSizing: "border-box" }} />
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
              <p style={{ fontSize: 12, color: "rgba(255,255,255,0.26)", textAlign: "center" }}>No spam. No BS. Just your empire OS.</p>
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
