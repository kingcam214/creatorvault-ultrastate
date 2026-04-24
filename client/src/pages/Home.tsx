/**
 * Home.tsx — CreatorVault Landing Page V5 (KingCam-First, Real Assets)
 * All 5 required sections. Real KingCam videos seeded into Proof of Work reel.
 * Hero uses looping KingCam video background.
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
function VideoReelClip({ label, badge, videoSrc, poster }: {
  label: string; badge: string; videoSrc?: string; poster?: string;
}) {
  const [hovered, setHovered] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    if (hovered) {
      v.play().catch(() => {});
    } else {
      v.pause();
      v.currentTime = 0;
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
      {/* Video or poster image background */}
      {videoSrc ? (
        <video
          ref={videoRef}
          src={videoSrc}
          poster={poster}
          muted
          loop
          playsInline
          preload="none"
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", zIndex: 0 }}
        />
      ) : poster ? (
        <img
          src={poster}
          alt={label}
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", zIndex: 0 }}
        />
      ) : (
        <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse at 50% 30%, rgba(201,168,76,0.08) 0%, transparent 70%)", zIndex: 0 }} />
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
        <div style={{ fontSize: 9, fontWeight: 600, color: "#38bdf8", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 2 }}>AI GENERATED</div>
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
    signupMutation.mutate({ email, name, phone, creatorType });
  };

  const creatorTypes = [
    { value: "content_creator", label: "Content Creator" },
    { value: "musician", label: "Musician / Artist" },
    { value: "adult_creator", label: "Adult Creator (18+)" },
    { value: "dancer", label: "Dancer / Performer" },
  ];

  // Proof of Work reel — KingCam videos + 7 unique AI-generated cinematic clips
  const reelClips = [
    { label: "Brand Story", badge: "KINGCAM · REPLICATE", videoSrc: "/videos/kingcam-clone-1.mp4" },
    { label: "Music Video", badge: "POLLO AI", videoSrc: "/videos/reel-music-video.mp4" },
    { label: "Clone Drop", badge: "KINGCAM · FLUX LORA", videoSrc: "/videos/kingcam-clone-2.mp4" },
    { label: "Product Drop", badge: "KLING AI", videoSrc: "/videos/reel-product-drop.mp4" },
    { label: "AI Portrait", badge: "OPENART AI", videoSrc: "/videos/reel-ai-portrait.mp4" },
    { label: "HeroCam", badge: "KINGCAM · POLLO AI", videoSrc: "/videos/kingcam-hero-cam.mp4" },
    { label: "Cinematic Trailer", badge: "RUNWAY ML", videoSrc: "/videos/reel-cinematic-trailer.mp4" },
    { label: "Creator Promo", badge: "OPENART AI", videoSrc: "/videos/reel-creator-promo.mp4" },
    { label: "Apparel Drop", badge: "REPLICATE", videoSrc: "/videos/reel-apparel-drop.mp4" },
    { label: "Empire Reel", badge: "KLING AI", videoSrc: "/videos/reel-brand-story.mp4" },
  ];

  return (
    <div style={{ background: "#050508", color: "#fff", fontFamily: "Inter, sans-serif", minHeight: "100vh", overflowX: "hidden" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Playfair+Display:wght@400;500;600;700;800&display=swap');
        * { margin:0; padding:0; box-sizing:border-box; }
        @keyframes fadeIn { from{opacity:0}to{opacity:1} }
        @keyframes pulse-gold { 0%,100%{box-shadow:0 0 0 0 rgba(201,168,76,0.4)}50%{box-shadow:0 0 0 10px rgba(201,168,76,0)} }
        @keyframes reel-scroll { 0%{transform:translateX(0)}100%{transform:translateX(-50%)} }
        @keyframes shimmer { 0%,100%{opacity:1}50%{opacity:0.4} }
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

      {/* ── PROOF OF WORK ── */}
      <div ref={reelRef.ref} style={{ position: "relative", zIndex: 1, padding: "72px 0 56px", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
        <div className={`reveal-up ${reelRef.visible ? "visible" : ""}`} style={{ textAlign: "center", marginBottom: 36, padding: "0 20px" }}>
          <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.28em", textTransform: "uppercase", color: "#38bdf8", marginBottom: 10 }}>PROOF OF WORK</p>
          <h2 style={{ fontFamily: "Playfair Display, serif", fontSize: "clamp(22px,6vw,38px)", fontWeight: 800, color: "#fff", lineHeight: 1.15, marginBottom: 12, textTransform: "uppercase", letterSpacing: "-0.01em" }}>
            REAL AI. GENERATED ON THIS PLATFORM.
          </h2>
          <p style={{ fontSize: 14, color: "rgba(255,255,255,0.43)", maxWidth: 480, margin: "0 auto" }}>
            Every clip below was created inside CreatorVault with Pollo AI, OpenArt AI, Kling, Runway, and Replicate. Hover to play. No stock footage. No actors. Pure AI.
          </p>
        </div>
        <div style={{ overflow: "hidden", padding: "4px 0" }}>
          <div className="reel-track" style={{ paddingLeft: 20 }}>
            {[...reelClips, ...reelClips].map((clip, i) => (
              <VideoReelClip key={i} label={clip.label} badge={clip.badge} videoSrc={clip.videoSrc} />
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
            <ArsenalCard icon="🎬" badge="EPISODE PIPELINE" badgeColor="#38bdf8" title="Hollywood Replacement" subtitle="5-scene episodes. FFmpeg stitch. Download ready." subtitleColor="#38bdf8" description="Write a concept. AI writes the script. Pollo renders each scene. FFmpeg stitches with music and transitions. You get a finished MP4 — not 5 raw clips." cta="Open Hollywood →" href="/hollywood-replacement" />
          </div>
          <div className={`reveal-up d2 ${arsenalRef.visible ? "visible" : ""}`}>
            <ArsenalCard icon="👗" badge="12 MODES" badgeColor="#4ade80" title="Apparel Lab" subtitle="Design. Simulate. Cost. Drop." subtitleColor="#4ade80" description="12 production modes: AI garment generation, fabric physics simulation, pattern studio, cost engine, tech pack PDF export, POD integration." cta="Open Apparel Lab →" href="/apparel-lab" />
          </div>
          <div className={`reveal-up d3 ${arsenalRef.visible ? "visible" : ""}`}>
            <ArsenalCard icon="⚡" badge="AUTO PIPELINE" badgeColor="#fb923c" title="Engine" subtitle="Social Factory · FunnelForge · VaultLive." subtitleColor="#fb923c" description="1 video → 30-day content calendar. 5-stage AI sales funnel. Multi-destination live stream. The machine that ships while you sleep." cta="Open Engine →" href="/social-factory" />
          </div>
        </div>
      </div>

      {/* ── CLONE AMBASSADOR ── */}
      <div ref={cloneRef.ref} style={{ position: "relative", zIndex: 1, padding: "72px 20px 64px", borderTop: "1px solid rgba(255,255,255,0.06)", overflow: "hidden" }}>
        <div style={{ maxWidth: 900, margin: "0 auto", display: "flex", flexWrap: "wrap", gap: 32, alignItems: "center" }}>
          {/* KingCam video panel — plays the clone drop video */}
          <div className={`reveal-up ${cloneRef.visible ? "visible" : ""}`} style={{ flex: "0 0 auto", width: "min(280px,90vw)" }}>
            <div style={{ borderRadius: 16, overflow: "hidden", border: "1px solid rgba(201,168,76,0.3)", background: "linear-gradient(160deg,#1a1a2e 0%,#0d0d14 100%)", aspectRatio: "3/4", position: "relative" }}>
              {/* Real KingCam video as clone ambassador visual */}
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
            <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.28em", textTransform: "uppercase", color: "#38bdf8", marginBottom: 14 }}>CLONE AMBASSADOR</p>
            <h2 style={{ fontFamily: "Playfair Display, serif", fontSize: "clamp(24px,6vw,38px)", fontWeight: 800, lineHeight: 1.1, marginBottom: 16 }}>
              Your Clone. <span style={{ color: "#38bdf8" }}>Your Voice.</span> <span style={{ color: "#c9a84c" }}>Your Empire.</span>
            </h2>
            <p style={{ fontSize: 14, color: "rgba(255,255,255,0.58)", lineHeight: 1.7, marginBottom: 24 }}>
              Train your personal AI twin on CreatorVault. Your clone writes in your voice, renders in your style, and ships content while you sleep. No cameras. No crew. No excuses.
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
                BUILD YOUR CLONE →
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
