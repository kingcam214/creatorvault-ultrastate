/**
 * Home.tsx — CreatorVault Landing Page V3 (Video-First)
 * ─────────────────────────────────────────────────────────────────────────────
 * Rebuilt with video-first UX:
 *   1. Full-bleed brand trailer as hero background (autoplay muted loop)
 *   2. Cinematic overlay with headline + CTAs on top of live video
 *   3. "Proof of Work" VideoLab reel — actual AI-generated clips in a scrolling
 *      horizontal carousel with play-on-hover
 *   4. Long-Form Content Domination section — Podcast OS + Hollywood Studio
 *   5. All existing sections preserved: stats, features, empire map, waitlist
 *   6. Remotion logo reveal + feature showcase still present
 *
 * Design System:
 *   - Background: #050508 (near-black with blue undertone)
 *   - Gold accent: #c9a84c
 *   - Pink accent: #c9a84c
 *   - Typography: Playfair Display (headlines) + Inter (body)
 * ─────────────────────────────────────────────────────────────────────────────
 */
import { useState, useEffect, useRef } from "react";
import { Player } from "@remotion/player";
import { AbsoluteFill, useCurrentFrame, interpolate, spring, useVideoConfig, Easing } from "remotion";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Link } from "wouter";

// ─── Remotion Compositions ────────────────────────────────────────────────────
const LogoReveal: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const logoOpacity = interpolate(frame, [20, 50], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const logoScale = spring({ frame: frame - 20, fps, config: { damping: 18, stiffness: 80, mass: 0.8 } });
  const logoY = interpolate(frame, [20, 55], [40, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const taglineOpacity = interpolate(frame, [55, 80], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const taglineY = interpolate(frame, [55, 80], [20, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const particles = Array.from({ length: 12 }, (_, i) => {
    const angle = (i / 12) * Math.PI * 2;
    const startRadius = 300;
    const progress = interpolate(frame, [0, 35], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) });
    const radius = startRadius * (1 - progress);
    const x = Math.cos(angle) * radius + 50;
    const y = Math.sin(angle) * radius + 50;
    const opacity = interpolate(frame, [0, 15, 35, 50], [0, 0.8, 0.6, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
    const size = 3 + (i % 3) * 2;
    return { x, y, opacity, size };
  });
  return (
    <AbsoluteFill style={{ background: "transparent", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column" }}>
      <svg style={{ position: "absolute", width: "100%", height: "100%", top: 0, left: 0 }} viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet">
        {particles.map((p, i) => (
          <circle key={i} cx={`${p.x}%`} cy={`${p.y}%`} r={p.size} fill={i % 2 === 0 ? "#c9a84c" : "#c9a84c"} opacity={p.opacity} />
        ))}
      </svg>
      <div style={{ opacity: logoOpacity, transform: `scale(${logoScale}) translateY(${logoY}px)`, display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
        <img src="/logo-white.png" alt="CreatorVault" style={{ height: 56, objectFit: "contain", filter: "drop-shadow(0 0 20px rgba(201,168,76,0.6))" }} />
        <div style={{ fontFamily: "Playfair Display, serif", fontSize: 22, fontWeight: 700, color: "#fff", letterSpacing: "0.05em", textShadow: "0 0 30px rgba(201,168,76,0.5)" }}>
          CreatorVault
        </div>
      </div>
      <div style={{ opacity: taglineOpacity, transform: `translateY(${taglineY}px)`, marginTop: 16, fontFamily: "Inter, sans-serif", fontSize: 11, fontWeight: 600, letterSpacing: "0.3em", textTransform: "uppercase", color: "rgba(255,255,255,0.7)" }}>
        The Empire OS
      </div>
    </AbsoluteFill>
  );
};

const FeatureShowcase: React.FC = () => {
  const frame = useCurrentFrame();
  const features = [
    { icon: "🎬", label: "VideoLab", sub: "Pollo AI · Kling 2.6 · Runway Gen4", color: "#c9a84c" },
    { icon: "💰", label: "Marketplace", sub: "Auto-list · Stripe · $59/trailer", color: "#c9a84c" },
    { icon: "🎭", label: "Hollywood", sub: "5-scene episodes · FFmpeg stitch", color: "#38bdf8" },
    { icon: "👗", label: "Apparel Lab", sub: "12 modes · Tech pack · Cost engine", color: "#4ade80" },
    { icon: "💃", label: "DayShift Doctor", sub: "In-club studio · VIP autopilot", color: "#fb923c" },
    { icon: "📡", label: "Social Factory", sub: "30-day calendar · 5 platforms", color: "#c9a84c" },
  ];
  return (
    <AbsoluteFill style={{ background: "transparent", padding: 20, display: "flex", flexDirection: "column", justifyContent: "center", gap: 8 }}>
      {features.map((f, i) => {
        const delay = i * 8;
        const opacity = interpolate(frame, [delay, delay + 15], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
        const x = interpolate(frame, [delay, delay + 15], [-30, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.quad) });
        const glowOpacity = interpolate(frame, [delay + 15, delay + 30, delay + 60], [0, 0.6, 0.2], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
        return (
          <div key={i} style={{ opacity, transform: `translateX(${x}px)`, display: "flex", alignItems: "center", gap: 12, background: "rgba(255,255,255,0.05)", border: `1px solid ${f.color}40`, borderRadius: 8, padding: "8px 14px", boxShadow: `0 0 20px ${f.color}${Math.round(glowOpacity * 255).toString(16).padStart(2, "0")}` }}>
            <span style={{ fontSize: 20 }}>{f.icon}</span>
            <div>
              <div style={{ fontFamily: "Inter, sans-serif", fontSize: 13, fontWeight: 700, color: "#fff", letterSpacing: "0.05em" }}>{f.label}</div>
              <div style={{ fontFamily: "Inter, sans-serif", fontSize: 10, color: "rgba(255,255,255,0.5)", marginTop: 1 }}>{f.sub}</div>
            </div>
            <div style={{ marginLeft: "auto", width: 6, height: 6, borderRadius: "50%", background: f.color, boxShadow: `0 0 8px ${f.color}` }} />
          </div>
        );
      })}
    </AbsoluteFill>
  );
};

const RevenueCounter: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const stats = [
    { label: "Avg. Creator Earnings", value: 4200, prefix: "$", suffix: "/mo", color: "#c9a84c" },
    { label: "Revenue Share", value: 85, prefix: "", suffix: "%", color: "#4ade80" },
    { label: "Platforms Reached", value: 20, prefix: "", suffix: "+", color: "#38bdf8" },
    { label: "Tools in One Platform", value: 47, prefix: "", suffix: "", color: "#c9a84c" },
  ];
  return (
    <AbsoluteFill style={{ background: "transparent", display: "flex", alignItems: "center", justifyContent: "center", gap: 0, padding: 20 }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, width: "100%" }}>
        {stats.map((s, i) => {
          const delay = i * 12;
          const progress = interpolate(frame, [delay, delay + 40], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) });
          const currentValue = Math.round(s.value * progress);
          const opacity = interpolate(frame, [delay, delay + 15], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
          const scale = spring({ frame: frame - delay, fps, config: { damping: 20, stiffness: 100 } });
          return (
            <div key={i} style={{ opacity, transform: `scale(${scale})`, background: "rgba(255,255,255,0.04)", border: `1px solid ${s.color}30`, borderRadius: 12, padding: "16px 12px", textAlign: "center" }}>
              <div style={{ fontFamily: "Playfair Display, serif", fontSize: 28, fontWeight: 700, color: s.color, lineHeight: 1, textShadow: `0 0 20px ${s.color}80` }}>
                {s.prefix}{currentValue.toLocaleString()}{s.suffix}
              </div>
              <div style={{ fontFamily: "Inter, sans-serif", fontSize: 10, color: "rgba(255,255,255,0.45)", marginTop: 6, letterSpacing: "0.08em", textTransform: "uppercase" }}>
                {s.label}
              </div>
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

// ─── Scroll Reveal Hook ───────────────────────────────────────────────────────
function useScrollReveal(threshold = 0.15) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([entry]) => { if (entry.isIntersecting) { setVisible(true); obs.disconnect(); } }, { threshold });
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);
  return { ref, visible };
}

// ─── Animated Counter Hook ────────────────────────────────────────────────────
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

// ─── VideoReel Clip Component ─────────────────────────────────────────────────
function VideoReelClip({ src, label }: { src: string; label: string }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [hovered, setHovered] = useState(false);
  useEffect(() => {
    if (!videoRef.current) return;
    if (hovered) {
      videoRef.current.currentTime = 0;
      videoRef.current.play().catch(() => {});
    } else {
      videoRef.current.pause();
      videoRef.current.currentTime = 0;
    }
  }, [hovered]);
  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        position: "relative",
        width: 220,
        height: 390,
        borderRadius: 16,
        overflow: "hidden",
        flexShrink: 0,
        border: hovered ? "1px solid rgba(201,168,76,0.6)" : "1px solid rgba(255,255,255,0.08)",
        transition: "border-color 0.3s ease, transform 0.3s ease, box-shadow 0.3s ease",
        transform: hovered ? "scale(1.04)" : "scale(1)",
        boxShadow: hovered ? "0 20px 60px rgba(201,168,76,0.25)" : "0 4px 20px rgba(0,0,0,0.4)",
        cursor: "pointer",
      }}
    >
      {/* Poster / thumbnail gradient */}
      <div style={{ position: "absolute", inset: 0, background: "#141414", zIndex: 0 }} />
      <video
        ref={videoRef}
        src={src}
        muted
        playsInline
        preload="metadata"
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", zIndex: 1, opacity: hovered ? 1 : 0.7, transition: "opacity 0.3s ease" }}
      />
      {/* Play indicator */}
      {!hovered && (
        <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", zIndex: 2 }}>
          <div style={{ width: 44, height: 44, borderRadius: "50%", background: "rgba(201,168,76,0.2)", border: "1px solid rgba(201,168,76,0.5)", display: "flex", alignItems: "center", justifyContent: "center", backdropFilter: "blur(4px)" }}>
            <div style={{ width: 0, height: 0, borderTop: "8px solid transparent", borderBottom: "8px solid transparent", borderLeft: "14px solid #c9a84c", marginLeft: 3 }} />
          </div>
        </div>
      )}
      {/* Label */}
      <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: "24px 12px 12px", background: "rgba(0,0,0,0.85)", zIndex: 3 }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: "#c9a84c", letterSpacing: "0.1em", textTransform: "uppercase" }}>AI Generated</div>
        <div style={{ fontSize: 12, color: "rgba(255,255,255,0.7)", marginTop: 2 }}>{label}</div>
      </div>
      {/* AI badge */}
      <div style={{ position: "absolute", top: 10, right: 10, background: "rgba(201,168,76,0.15)", border: "1px solid rgba(201,168,76,0.4)", borderRadius: 6, padding: "3px 8px", zIndex: 3 }}>
        <span style={{ fontSize: 9, fontWeight: 700, color: "#c9a84c", letterSpacing: "0.1em" }}>POLLO AI</span>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function Home() {
  const [heroLoaded, setHeroLoaded] = useState(false);
  const [showRemotionHero, setShowRemotionHero] = useState(false);
  const [heroVideoReady, setHeroVideoReady] = useState(false);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [creatorType, setCreatorType] = useState("");
  const heroVideoRef = useRef<HTMLVideoElement>(null);

  const statsRef = useScrollReveal();
  const pillarsRef = useScrollReveal();
  const reelRef = useScrollReveal();
  const longformRef = useScrollReveal();
  const demoRef = useScrollReveal();
  const waitlistRef = useScrollReveal();

  const stat1 = useCounter(4200, 2200, statsRef.visible);
  const stat2 = useCounter(85, 1800, statsRef.visible);
  const stat3 = useCounter(47, 2000, statsRef.visible);
  const stat4 = useCounter(20, 1600, statsRef.visible);

  useEffect(() => {
    const t1 = setTimeout(() => setHeroLoaded(true), 100);
    const t2 = setTimeout(() => setShowRemotionHero(true), 300);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);

  // Autoplay hero video
  useEffect(() => {
    const v = heroVideoRef.current;
    if (!v) return;
    v.muted = true;
    v.play().catch(() => {});
  }, []);

  const signupMutation = trpc.waitlist.join.useMutation({
    onSuccess: () => {
      toast.success("You're in. Welcome to the empire.");
      setEmail(""); setName(""); setPhone(""); setCreatorType("");
    },
    onError: (error) => toast.error(error.message),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return toast.error("Email required.");
    if (!name) return toast.error("Name required.");
    if (!creatorType) return toast.error("Please select your creator type.");
    signupMutation.mutate({ email, name, creatorType });
  };

  const creatorTypes = [
    { value: "content_creator", label: "Content Creator" },
    { value: "musician", label: "Musician / Artist" },
    { value: "adult_creator", label: "Adult Creator (18+)" },
    { value: "dancer", label: "Dancer / Performer" },
    { value: "club_owner", label: "Club / Venue Owner" },
    { value: "brand", label: "Brand / Business" },
    { value: "filmmaker", label: "Filmmaker / Director" },
    { value: "apparel", label: "Fashion / Apparel" },
  ];

  const reelClips = [
    { src: "/uploads/videolab/04140298-eaa9-4468-aac4-ecdfe84bc654_vertical.mp4", label: "Cinematic Trailer" },
    { src: "/uploads/videolab/0d818adc-e6f3-4839-a4de-ef81317f605b_vertical.mp4", label: "Creator Promo" },
    { src: "/uploads/videolab/1bd20378-95b0-4b9b-982c-1b503e0c5d13_vertical.mp4", label: "Brand Story" },
    { src: "/uploads/videolab/2707745e-f94b-49f0-a479-f240e56b4aee_vertical.mp4", label: "Music Video" },
    { src: "/uploads/videolab/2a2e2611-8815-47d5-9cbf-41e85d9ea284_vertical.mp4", label: "Product Drop" },
    { src: "/uploads/videolab/2e9c81c8-4166-4943-a5a2-e5d836d29cde_vertical.mp4", label: "Event Recap" },
  ];

  const features = [
    { icon: "🎬", title: "AI Video Lab", tagline: "One clip. Every platform. Pollo AI inside.", description: "Pollo AI (Kling 2.6 · Runway Gen4 · Veo 3) generates cinematic trailers from a single upload. Auto-lists on the Marketplace at $59. One shift = $3k.", link: "/video-lab", linkText: "Open Video Lab", color: "#c9a84c", badge: "POLLO AI" },
    { icon: "🎭", title: "Hollywood Replacement", tagline: "5-scene AI episodes. FFmpeg-stitched. Download-ready.", description: "Write a concept. AI generates a full script, Pollo renders each scene, FFmpeg stitches with transitions + music. You get a finished MP4 — not 5 raw clips.", link: "/hollywood-studio", linkText: "Open Hollywood Studio", color: "#38bdf8", badge: "EPISODE PIPELINE" },
    { icon: "💃", title: "DayShift Doctor", tagline: "The only in-club content OS for dancers.", description: "In-club studio with AI Shoot Director, Nurse-guided sessions, VIP autopilot, and shift intelligence. Dayshift earns night shift money.", link: "/dayshift-doctor", linkText: "Open DayShift Doctor", color: "#fb923c", badge: "NURSE SHIFT COMMAND" },
    { icon: "👗", title: "Apparel Lab", tagline: "Design. Simulate. Cost. Drop.", description: "12 production modes: AI garment generation, fabric physics simulation, pattern studio, cost engine, tech pack PDF export, POD integration.", link: "/apparel-lab", linkText: "Open Apparel Lab", color: "#4ade80", badge: "12 MODES" },
    { icon: "🌐", title: "Social Factory", tagline: "1 video → 30-day content calendar.", description: "AI generates platform-native captions for TikTok, Instagram, Twitter, YouTube, Facebook. Schedules all 30 posts automatically.", link: "/social-factory", linkText: "Open Social Factory", color: "#c9a84c", badge: "5 PLATFORMS" },
    { icon: "🔥", title: "FunnelForge", tagline: "5-stage AI sales funnel. Stripe in one click.", description: "Hook → Agitate → Solution → Proof → CTA. AI writes every stage from your trailer. Stripe payment link auto-generated.", link: "/funnel-forge", linkText: "Open FunnelForge", color: "#c9a84c", badge: "REVENUE CASCADE" },
  ];

  const empireNodes = [
    { icon: "📱", title: "Social OS", desc: "Profiles · Feed · Stories · DMs · Explore · Communities" },
    { icon: "🤖", title: "AI Studio", desc: "VideoLab · Hollywood · Apparel · FunnelForge · Social Factory" },
    { icon: "🚀", title: "Distribution", desc: "20+ platforms · TikTok · Reels · Shorts · Stories · YouTube" },
    { icon: "💎", title: "Monetization", desc: "Subscriptions · Tips · Marketplace · NFC Cards · VaultX" },
    { icon: "🏥", title: "DayShift Doctor", desc: "In-club studio · VIP autopilot · Nurse guidance · Shift genius" },
    { icon: "🎵", title: "Audio Stack", desc: "ElevenLabs TTS · Sync.so lip-sync · Soundverse scores · FFmpeg" },
  ];

  return (
    <div style={{ background: "#050508", minHeight: "100vh", fontFamily: "Inter, sans-serif", overflowX: "hidden" }}>
      <style>{`
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { background: #050508; color: #fff; }
        @keyframes fadeIn { from { opacity:0; } to { opacity:1; } }
        @keyframes fadeUp { from { opacity:0; transform:translateY(24px); } to { opacity:1; transform:translateY(0); } }
        @keyframes shimmer { 0%,100% { opacity:0.6; transform:scale(1); } 50% { opacity:1; transform:scale(1.3); } }
        @keyframes pulse-gold { 0%,100% { box-shadow:0 0 0 0 rgba(201,168,76,0.4); } 50% { box-shadow:0 0 0 12px rgba(201,168,76,0); } }
        @keyframes ticker { 0% { transform:translateX(0); } 100% { transform:translateX(-50%); } }
        @keyframes reel-scroll { 0% { transform:translateX(0); } 100% { transform:translateX(-50%); } }
        @keyframes float-up { 0%,100% { transform:translateY(0px); } 50% { transform:translateY(-12px); } }
        .reveal-up { opacity:0; transform:translateY(40px); transition:opacity 0.7s ease, transform 0.7s ease; }
        .reveal-up.visible { opacity:1; transform:translateY(0); }
        .reveal-up.delay-1 { transition-delay:0.1s; }
        .reveal-up.delay-2 { transition-delay:0.2s; }
        .reveal-up.delay-3 { transition-delay:0.3s; }
        .reveal-up.delay-4 { transition-delay:0.4s; }
        .reveal-up.delay-5 { transition-delay:0.5s; }
        .feature-card { transition: transform 0.3s ease, box-shadow 0.3s ease, border-color 0.3s ease; }
        .feature-card:hover { transform: translateY(-4px); }
        .cta-primary { transition: transform 0.2s ease, box-shadow 0.2s ease; }
        .cta-primary:hover { transform: translateY(-2px); box-shadow: 0 12px 40px rgba(201,168,76,0.4); }
        .cta-secondary { transition: background 0.2s ease, border-color 0.2s ease; }
        .cta-secondary:hover { background: rgba(255,255,255,0.08); }
        .pill-nav { transition: background 0.2s ease, border-color 0.2s ease; }
        .pill-nav:hover { background: rgba(201,168,76,0.15); border-color: rgba(201,168,76,0.4); }
        input:focus, textarea:focus, select:focus { outline: none; border-color: rgba(201,168,76,0.6) !important; box-shadow: 0 0 0 3px rgba(201,168,76,0.15) !important; }
        .reel-track { display:flex; gap:16px; animation: reel-scroll 40s linear infinite; }
        .reel-track:hover { animation-play-state: paused; }
        .longform-card { transition: transform 0.3s ease, box-shadow 0.3s ease, border-color 0.3s ease; }
        .longform-card:hover { transform: translateY(-6px); box-shadow: 0 24px 60px rgba(0,0,0,0.5); }
      `}</style>

      {/* ── ANIMATED BACKGROUND MESH ── */}
      <div style={{ position: "fixed", inset: 0, zIndex: 0, pointerEvents: "none", overflow: "hidden" }}>
        <div style={{ position: "absolute", top: "-20%", left: "-10%", width: "60%", height: "60%", background: "radial-gradient(ellipse, rgba(201,168,76,0.06) 0%, transparent 70%)", borderRadius: "50%" }} />
        <div style={{ position: "absolute", top: "30%", right: "-15%", width: "50%", height: "50%", background: "radial-gradient(ellipse, rgba(201,168,76,0.05) 0%, transparent 70%)", borderRadius: "50%" }} />
        <div style={{ position: "absolute", bottom: "-10%", left: "20%", width: "40%", height: "40%", background: "radial-gradient(ellipse, rgba(56,189,248,0.04) 0%, transparent 70%)", borderRadius: "50%" }} />
      </div>

      {/* ── HERO SECTION — VIDEO BACKGROUND ── */}
      <div style={{ position: "relative", zIndex: 1, minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
        {/* Full-bleed background video */}
        <video
          ref={heroVideoRef}
          src="/storage/trailers/creatorvault_brand_trailer_FINAL.mp4"
          autoPlay
          muted
          loop
          playsInline
          onCanPlay={() => setHeroVideoReady(true)}
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            objectFit: "cover",
            zIndex: 0,
            opacity: heroVideoReady ? 0.35 : 0,
            transition: "opacity 1.5s ease",
          }}
        />
        {/* Gradient overlay on top of video */}
        <div style={{ position: "absolute", inset: 0, zIndex: 1, background: "rgba(10,10,10,0.72)" }} />
        {/* Vignette sides */}
        <div style={{ position: "absolute", inset: 0, zIndex: 1, background: "radial-gradient(ellipse at center, transparent 40%, rgba(5,5,8,0.8) 100%)" }} />

        {/* Hero content */}
        <div style={{ position: "relative", zIndex: 2, display: "flex", flexDirection: "column", alignItems: "center", padding: "80px 20px 60px", width: "100%", maxWidth: 900, margin: "0 auto" }}>
          {/* Invite badge */}
          <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "rgba(201,168,76,0.1)", border: "1px solid rgba(201,168,76,0.3)", borderRadius: 100, padding: "6px 16px", marginBottom: 40, animation: heroLoaded ? "fadeIn 0.8s ease forwards" : "none", opacity: heroLoaded ? 1 : 0 }}>
            <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#c9a84c", animation: "shimmer 2s ease-in-out infinite" }} />
            <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.2em", textTransform: "uppercase", color: "#c9a84c" }}>
              Invite-Only · Early Access 2026
            </span>
          </div>

          {/* Remotion Logo Reveal */}
          <div style={{ width: "min(480px, 90vw)", height: 180, marginBottom: 8, opacity: showRemotionHero ? 1 : 0, transition: "opacity 0.5s ease" }}>
            {showRemotionHero && (
              <Player component={LogoReveal} durationInFrames={120} compositionWidth={480} compositionHeight={180} fps={30} autoPlay loop={false} style={{ width: "100%", height: "100%", background: "transparent" }} />
            )}
          </div>

          {/* Main headline */}
          <div style={{ textAlign: "center", maxWidth: 720, animation: heroLoaded ? "fadeUp 1s ease 0.5s both" : "none" }}>
            <h1 style={{ fontFamily: "Playfair Display, serif", fontSize: "clamp(36px, 8vw, 72px)", fontWeight: 700, color: "#fff", lineHeight: 1.1, marginBottom: 20, letterSpacing: "-0.02em" }}>
              Your{" "}
              <span style={{ color: "#c9a84c" }}>
                Creator Empire
              </span>
              {" "}OS
            </h1>
            <p style={{ fontSize: "clamp(16px, 3vw, 20px)", color: "rgba(255,255,255,0.75)", lineHeight: 1.6, marginBottom: 12, maxWidth: 560, margin: "0 auto 12px" }}>
              AI Video Lab. Hollywood production pipeline. In-club content studio. Social autopilot. Marketplace. All in one platform.
            </p>
            <p style={{ fontSize: "clamp(15px, 2.5vw, 18px)", color: "rgba(255,255,255,0.55)", lineHeight: 1.5, maxWidth: 480, margin: "0 auto 40px" }}>
              Keep{" "}<span style={{ color: "#c9a84c", fontWeight: 700 }}>85%</span>{" "}of every dollar you earn. No middlemen. No ceiling.
            </p>

            {/* CTAs */}
            <div style={{ display: "flex", flexWrap: "wrap", gap: 12, justifyContent: "center", marginBottom: 24 }}>
              <a href="#waitlist" style={{ textDecoration: "none" }}>
                <button className="cta-primary" style={{ background: "#c9a84c", color: "#050508", border: "none", borderRadius: 8, padding: "14px 32px", fontSize: 15, fontWeight: 700, letterSpacing: "0.05em", cursor: "pointer", animation: "pulse-gold 3s ease-in-out infinite" }}>
                  JOIN THE WAITLIST
                </button>
              </a>
              <Link href="/login">
                <button className="cta-secondary" style={{ background: "rgba(255,255,255,0.06)", color: "#fff", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 8, padding: "14px 28px", fontSize: 15, fontWeight: 600, cursor: "pointer" }}>
                  Log In → Enter
                </button>
              </Link>
            </div>

            {/* Secondary links */}
            <div style={{ display: "flex", flexWrap: "wrap", gap: 20, justifyContent: "center" }}>
              <Link href="/login">
                <span style={{ fontSize: 13, color: "rgba(255,255,255,0.45)", cursor: "pointer", textDecoration: "underline", textDecorationColor: "rgba(255,255,255,0.2)" }}>Already have an invite? Log in</span>
              </Link>
              <Link href="/vault-x">
                <span style={{ fontSize: 13, color: "rgba(201,168,76,0.7)", cursor: "pointer", textDecoration: "underline", textDecorationColor: "rgba(201,168,76,0.3)" }}>18+ creator? Learn about VaultX</span>
              </Link>
            </div>
          </div>

          {/* Video indicator badge */}
          {heroVideoReady && (
            <div style={{ marginTop: 40, display: "flex", alignItems: "center", gap: 8, background: "rgba(0,0,0,0.4)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 100, padding: "6px 14px", backdropFilter: "blur(8px)", animation: "fadeIn 1s ease forwards" }}>
              <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#ef4444", animation: "shimmer 1.5s ease-in-out infinite" }} />
              <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.15em", textTransform: "uppercase", color: "rgba(255,255,255,0.6)" }}>Live Brand Trailer Playing</span>
            </div>
          )}
        </div>

        {/* Scroll indicator */}
        <div style={{ position: "absolute", bottom: 32, left: "50%", transform: "translateX(-50%)", display: "flex", flexDirection: "column", alignItems: "center", gap: 6, opacity: 0.4, animation: "fadeIn 2s ease 2s both", zIndex: 2 }}>
          <span style={{ fontSize: 10, letterSpacing: "0.2em", textTransform: "uppercase", color: "#fff" }}>Scroll</span>
          <div style={{ width: 1, height: 32, background: "rgba(245,240,232,0.45)" }} />
        </div>
      </div>

      {/* ── PROOF OF WORK — VIDEO REEL ── */}
      <div ref={reelRef.ref} style={{ position: "relative", zIndex: 1, padding: "80px 0 60px", overflow: "hidden" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", padding: "0 20px" }}>
          <div className={`reveal-up ${reelRef.visible ? "visible" : ""}`} style={{ textAlign: "center", marginBottom: 48 }}>
            <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.25em", textTransform: "uppercase", color: "#c9a84c", marginBottom: 12 }}>PROOF OF WORK</p>
            <h2 style={{ fontFamily: "Playfair Display, serif", fontSize: "clamp(28px, 5vw, 44px)", fontWeight: 700, color: "#fff", lineHeight: 1.2, marginBottom: 12 }}>
              Real AI videos. Generated on this platform.
            </h2>
            <p style={{ fontSize: 16, color: "rgba(255,255,255,0.5)", maxWidth: 520, margin: "0 auto" }}>
              Every clip below was created by a creator using VideoLab. Hover to play. No stock footage. No actors. Pure AI.
            </p>
          </div>
        </div>

        {/* Infinite scroll reel */}
        <div style={{ overflow: "hidden", padding: "8px 0" }}>
          <div className="reel-track" style={{ paddingLeft: 40 }}>
            {/* Duplicate for infinite loop */}
            {[...reelClips, ...reelClips].map((clip, i) => (
              <VideoReelClip key={i} src={clip.src} label={clip.label} />
            ))}
          </div>
        </div>

        <div style={{ textAlign: "center", marginTop: 40 }}>
          <Link href="/video-lab">
            <button className="cta-primary" style={{ background: "#c9a84c", color: "#050508", border: "none", borderRadius: 8, padding: "12px 28px", fontSize: 14, fontWeight: 700, letterSpacing: "0.05em", cursor: "pointer" }}>
              Create Your First AI Video →
            </button>
          </Link>
        </div>
      </div>

      {/* ── LONG-FORM CONTENT DOMINATION ── */}
      <div ref={longformRef.ref} style={{ position: "relative", zIndex: 1, padding: "80px 20px", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <div className={`reveal-up ${longformRef.visible ? "visible" : ""}`} style={{ textAlign: "center", marginBottom: 56 }}>
            <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.25em", textTransform: "uppercase", color: "#38bdf8", marginBottom: 12 }}>LONG-FORM DOMINATION</p>
            <h2 style={{ fontFamily: "Playfair Display, serif", fontSize: "clamp(28px, 5vw, 44px)", fontWeight: 700, color: "#fff", lineHeight: 1.2, marginBottom: 16 }}>
              The full content pipeline. Script to stream.
            </h2>
            <p style={{ fontSize: 16, color: "rgba(255,255,255,0.5)", maxWidth: 600, margin: "0 auto" }}>
              From a single topic, CreatorVault generates a full script, produces a Hollywood-grade episode, publishes it as a podcast, and distributes it to 20+ platforms — automatically.
            </p>
          </div>

          {/* Pipeline flow */}
          <div className={`reveal-up delay-1 ${longformRef.visible ? "visible" : ""}`} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, flexWrap: "wrap", marginBottom: 56 }}>
            {[
              { icon: "✍️", label: "Script", color: "#c9a84c" },
              { icon: "→", label: "", color: "rgba(255,255,255,0.2)" },
              { icon: "🎬", label: "Episode", color: "#38bdf8" },
              { icon: "→", label: "", color: "rgba(255,255,255,0.2)" },
              { icon: "🎙️", label: "Podcast", color: "#c9a84c" },
              { icon: "→", label: "", color: "rgba(255,255,255,0.2)" },
              { icon: "📡", label: "Distribute", color: "#4ade80" },
              { icon: "→", label: "", color: "rgba(255,255,255,0.2)" },
              { icon: "💰", label: "Monetize", color: "#fb923c" },
            ].map((step, i) => (
              step.label ? (
                <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
                  <div style={{ width: 52, height: 52, borderRadius: 14, background: `${step.color}15`, border: `1px solid ${step.color}40`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22 }}>
                    {step.icon}
                  </div>
                  <span style={{ fontSize: 10, fontWeight: 600, color: step.color, letterSpacing: "0.1em", textTransform: "uppercase" }}>{step.label}</span>
                </div>
              ) : (
                <div key={i} style={{ fontSize: 20, color: step.color, fontWeight: 300, marginBottom: 18 }}>{step.icon}</div>
              )
            ))}
          </div>

          {/* Long-form tool cards */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 20 }}>
            {/* KingCam Script Writer */}
            <div className={`reveal-up delay-1 longform-card ${longformRef.visible ? "visible" : ""}`} style={{ background: "rgba(201,168,76,0.04)", border: "1px solid rgba(201,168,76,0.2)", borderRadius: 20, padding: 28, position: "relative", overflow: "hidden" }}>
              <div style={{ position: "absolute", top: 0, right: 0, width: 120, height: 120, background: "radial-gradient(circle, rgba(201,168,76,0.1) 0%, transparent 70%)", borderRadius: "0 0 0 100%" }} />
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.15em", color: "#c9a84c", textTransform: "uppercase", marginBottom: 12 }}>✍️ Script Engine</div>
              <h3 style={{ fontFamily: "Playfair Display, serif", fontSize: 22, fontWeight: 700, color: "#fff", marginBottom: 8 }}>KingCam Script Writer</h3>
              <p style={{ fontSize: 14, color: "rgba(255,255,255,0.55)", lineHeight: 1.6, marginBottom: 20 }}>
                AI writes full episode scripts in your voice — hook, story, CTA, on-screen text, YouTube metadata, and viral hooks. Multi-language. One click to Hollywood.
              </p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 20 }}>
                {["Multi-language", "YouTube SEO", "Viral Hooks", "→ Episode"].map(tag => (
                  <span key={tag} style={{ fontSize: 10, fontWeight: 600, color: "#c9a84c", background: "rgba(201,168,76,0.1)", border: "1px solid rgba(201,168,76,0.25)", borderRadius: 100, padding: "3px 10px" }}>{tag}</span>
                ))}
              </div>
              <Link href="/kingcam-script-writer">
                <button style={{ background: "transparent", border: "1px solid rgba(201,168,76,0.4)", color: "#c9a84c", borderRadius: 8, padding: "9px 18px", fontSize: 13, fontWeight: 600, cursor: "pointer", letterSpacing: "0.05em" }}>
                  Open Script Writer →
                </button>
              </Link>
            </div>

            {/* Hollywood Studio */}
            <div className={`reveal-up delay-2 longform-card ${longformRef.visible ? "visible" : ""}`} style={{ background: "rgba(56,189,248,0.04)", border: "1px solid rgba(56,189,248,0.2)", borderRadius: 20, padding: 28, position: "relative", overflow: "hidden" }}>
              <div style={{ position: "absolute", top: 0, right: 0, width: 120, height: 120, background: "radial-gradient(circle, rgba(56,189,248,0.1) 0%, transparent 70%)", borderRadius: "0 0 0 100%" }} />
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.15em", color: "#38bdf8", textTransform: "uppercase", marginBottom: 12 }}>🎭 Episode Engine</div>
              <h3 style={{ fontFamily: "Playfair Display, serif", fontSize: 22, fontWeight: 700, color: "#fff", marginBottom: 8 }}>Hollywood Studio</h3>
              <p style={{ fontSize: 14, color: "rgba(255,255,255,0.55)", lineHeight: 1.6, marginBottom: 20 }}>
                5-scene AI episodes. Each scene rendered by Pollo AI, stitched by FFmpeg with transitions and music. Download a finished MP4 — not raw clips.
              </p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 20 }}>
                {["5 Scenes", "FFmpeg Stitch", "Music + SFX", "Download MP4"].map(tag => (
                  <span key={tag} style={{ fontSize: 10, fontWeight: 600, color: "#38bdf8", background: "rgba(56,189,248,0.1)", border: "1px solid rgba(56,189,248,0.25)", borderRadius: 100, padding: "3px 10px" }}>{tag}</span>
                ))}
              </div>
              <Link href="/hollywood-studio">
                <button style={{ background: "transparent", border: "1px solid rgba(56,189,248,0.4)", color: "#38bdf8", borderRadius: 8, padding: "9px 18px", fontSize: 13, fontWeight: 600, cursor: "pointer", letterSpacing: "0.05em" }}>
                  Open Hollywood Studio →
                </button>
              </Link>
            </div>

            {/* Podcast OS */}
            <div className={`reveal-up delay-3 longform-card ${longformRef.visible ? "visible" : ""}`} style={{ background: "rgba(201,168,76,0.04)", border: "1px solid rgba(201,168,76,0.2)", borderRadius: 20, padding: 28, position: "relative", overflow: "hidden" }}>
              <div style={{ position: "absolute", top: 0, right: 0, width: 120, height: 120, background: "radial-gradient(circle, rgba(201,168,76,0.1) 0%, transparent 70%)", borderRadius: "0 0 0 100%" }} />
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.15em", color: "#c9a84c", textTransform: "uppercase", marginBottom: 12 }}>🎙️ Podcast OS</div>
              <h3 style={{ fontFamily: "Playfair Display, serif", fontSize: 22, fontWeight: 700, color: "#fff", marginBottom: 8 }}>Podcast Distribution</h3>
              <p style={{ fontSize: 14, color: "rgba(255,255,255,0.55)", lineHeight: 1.6, marginBottom: 20 }}>
                Full podcast management: RSS feed generation, Apple Podcasts + Spotify submission, auto-transcription, clip extraction, and monetization tracking.
              </p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 20 }}>
                {["RSS Feed", "Apple + Spotify", "Auto-Transcribe", "Clip Engine"].map(tag => (
                  <span key={tag} style={{ fontSize: 10, fontWeight: 600, color: "#c9a84c", background: "rgba(201,168,76,0.1)", border: "1px solid rgba(201,168,76,0.25)", borderRadius: 100, padding: "3px 10px" }}>{tag}</span>
                ))}
              </div>
              <Link href="/podcasting">
                <button style={{ background: "transparent", border: "1px solid rgba(201,168,76,0.4)", color: "#c9a84c", borderRadius: 8, padding: "9px 18px", fontSize: 13, fontWeight: 600, cursor: "pointer", letterSpacing: "0.05em" }}>
                  Open Podcast OS →
                </button>
              </Link>
            </div>

            {/* VaultLive */}
            <div className={`reveal-up delay-4 longform-card ${longformRef.visible ? "visible" : ""}`} style={{ background: "rgba(74,222,128,0.04)", border: "1px solid rgba(74,222,128,0.2)", borderRadius: 20, padding: 28, position: "relative", overflow: "hidden" }}>
              <div style={{ position: "absolute", top: 0, right: 0, width: 120, height: 120, background: "radial-gradient(circle, rgba(74,222,128,0.1) 0%, transparent 70%)", borderRadius: "0 0 0 100%" }} />
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.15em", color: "#4ade80", textTransform: "uppercase", marginBottom: 12 }}>📡 Live Studio</div>
              <h3 style={{ fontFamily: "Playfair Display, serif", fontSize: 22, fontWeight: 700, color: "#fff", marginBottom: 8 }}>VaultLive</h3>
              <p style={{ fontSize: 14, color: "rgba(255,255,255,0.55)", lineHeight: 1.6, marginBottom: 20 }}>
                Multi-destination live streaming control room. Go live to YouTube, TikTok, Instagram, and Twitch simultaneously. Real-time analytics and chat aggregation.
              </p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 20 }}>
                {["Multi-Destination", "Real-Time Chat", "Stream Analytics", "4 Platforms"].map(tag => (
                  <span key={tag} style={{ fontSize: 10, fontWeight: 600, color: "#4ade80", background: "rgba(74,222,128,0.1)", border: "1px solid rgba(74,222,128,0.25)", borderRadius: 100, padding: "3px 10px" }}>{tag}</span>
                ))}
              </div>
              <Link href="/vault-live">
                <button style={{ background: "transparent", border: "1px solid rgba(74,222,128,0.4)", color: "#4ade80", borderRadius: 8, padding: "9px 18px", fontSize: 13, fontWeight: 600, cursor: "pointer", letterSpacing: "0.05em" }}>
                  Open VaultLive →
                </button>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* ── STATS BAR ── */}
      <div ref={statsRef.ref} style={{ position: "relative", zIndex: 1, padding: "40px 20px", borderTop: "1px solid rgba(255,255,255,0.06)", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 32, textAlign: "center" }}>
          {[
            { value: `$${stat1.toLocaleString()}`, label: "Avg. Monthly Earnings", color: "#c9a84c" },
            { value: `${stat2}%`, label: "Revenue You Keep", color: "#4ade80" },
            { value: `${stat3}`, label: "Tools in One Platform", color: "#38bdf8" },
            { value: `${stat4}+`, label: "Distribution Platforms", color: "#c9a84c" },
          ].map((s, i) => (
            <div key={i} className={`reveal-up delay-${i + 1} ${statsRef.visible ? "visible" : ""}`}>
              <div style={{ fontFamily: "Playfair Display, serif", fontSize: "clamp(28px, 5vw, 42px)", fontWeight: 700, color: s.color, lineHeight: 1 }}>{s.value}</div>
              <div style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", marginTop: 8, letterSpacing: "0.08em", textTransform: "uppercase" }}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── FEATURE PILLARS ── */}
      <div ref={pillarsRef.ref} style={{ position: "relative", zIndex: 1, padding: "80px 20px" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <div className={`reveal-up ${pillarsRef.visible ? "visible" : ""}`} style={{ textAlign: "center", marginBottom: 56 }}>
            <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.25em", textTransform: "uppercase", color: "#c9a84c", marginBottom: 12 }}>THE ARSENAL</p>
            <h2 style={{ fontFamily: "Playfair Display, serif", fontSize: "clamp(28px, 5vw, 44px)", fontWeight: 700, color: "#fff", lineHeight: 1.2 }}>Tools that feel like cheating.</h2>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 20 }}>
            {features.map((f, i) => (
              <div key={i} className={`feature-card reveal-up delay-${(i % 3) + 1} ${pillarsRef.visible ? "visible" : ""}`} style={{ background: "rgba(255,255,255,0.02)", border: `1px solid ${f.color}20`, borderRadius: 20, padding: 28, position: "relative", overflow: "hidden" }}>
                <div style={{ position: "absolute", top: 0, right: 0, width: 80, height: 80, background: `radial-gradient(circle, ${f.color}15 0%, transparent 70%)`, borderRadius: "0 0 0 100%" }} />
                <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
                  <div style={{ fontSize: 28 }}>{f.icon}</div>
                  <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.15em", color: f.color, textTransform: "uppercase", background: `${f.color}15`, border: `1px solid ${f.color}30`, borderRadius: 100, padding: "3px 10px" }}>{f.badge}</div>
                </div>
                <h3 style={{ fontFamily: "Playfair Display, serif", fontSize: 20, fontWeight: 700, color: "#fff", marginBottom: 6 }}>{f.title}</h3>
                <p style={{ fontSize: 13, fontWeight: 600, color: f.color, marginBottom: 10, letterSpacing: "0.02em" }}>{f.tagline}</p>
                <p style={{ fontSize: 14, color: "rgba(255,255,255,0.5)", lineHeight: 1.6, marginBottom: 20 }}>{f.description}</p>
                <Link href={f.link}>
                  <button style={{ background: "transparent", border: `1px solid ${f.color}40`, color: f.color, borderRadius: 8, padding: "8px 16px", fontSize: 12, fontWeight: 600, cursor: "pointer", letterSpacing: "0.05em" }}>{f.linkText} →</button>
                </Link>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── LIVE FEATURE SHOWCASE (Remotion) ── */}
      <div ref={demoRef.ref} style={{ position: "relative", zIndex: 1, padding: "60px 20px", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <div className={`reveal-up ${demoRef.visible ? "visible" : ""}`} style={{ textAlign: "center", marginBottom: 48 }}>
            <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.25em", textTransform: "uppercase", color: "#c9a84c", marginBottom: 12 }}>INSIDE THE PLATFORM</p>
            <h2 style={{ fontFamily: "Playfair Display, serif", fontSize: "clamp(28px, 5vw, 44px)", fontWeight: 700, color: "#fff", lineHeight: 1.2 }}>Everything you need. Nothing you don't.</h2>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16 }}>
            <div className={`reveal-up ${demoRef.visible ? "visible" : ""}`} style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 16, overflow: "hidden", height: 320, position: "relative" }}>
              <div style={{ position: "absolute", top: 12, left: 12, zIndex: 2, background: "rgba(201,168,76,0.15)", border: "1px solid rgba(201,168,76,0.3)", borderRadius: 6, padding: "4px 10px" }}>
                <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.15em", color: "#c9a84c" }}>LIVE PLATFORM</span>
              </div>
              {demoRef.visible && (
                <Player component={FeatureShowcase} durationInFrames={120} compositionWidth={400} compositionHeight={320} fps={30} autoPlay loop style={{ width: "100%", height: "100%", background: "transparent" }} />
              )}
            </div>
            <div className={`reveal-up delay-2 ${demoRef.visible ? "visible" : ""}`} style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 16, overflow: "hidden", height: 320, position: "relative" }}>
              <div style={{ position: "absolute", top: 12, left: 12, zIndex: 2, background: "rgba(74,222,128,0.1)", border: "1px solid rgba(74,222,128,0.25)", borderRadius: 6, padding: "4px 10px" }}>
                <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.15em", color: "#4ade80" }}>REAL NUMBERS</span>
              </div>
              {demoRef.visible && (
                <Player component={RevenueCounter} durationInFrames={120} compositionWidth={400} compositionHeight={320} fps={30} autoPlay loop={false} style={{ width: "100%", height: "100%", background: "transparent" }} />
              )}
            </div>
            <div className={`reveal-up delay-4 ${demoRef.visible ? "visible" : ""}`} style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 16, padding: 20, height: 320, display: "flex", flexDirection: "column", justifyContent: "center", gap: 10 }}>
              <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.2em", textTransform: "uppercase", color: "rgba(255,255,255,0.4)", marginBottom: 4 }}>QUICK ACCESS</p>
              {[
                { label: "Creator Dashboard", href: "/dashboard", color: "#c9a84c" },
                { label: "Video Lab", href: "/video-lab", color: "#38bdf8" },
                { label: "Hollywood Studio", href: "/hollywood-studio", color: "#c9a84c" },
                { label: "Podcast OS", href: "/podcasting", color: "#c9a84c" },
                { label: "Apparel Lab", href: "/apparel-lab", color: "#4ade80" },
                { label: "Marketplace", href: "/marketplace", color: "#c9a84c" },
              ].map((item) => (
                <Link key={item.href} href={item.href}>
                  <div className="pill-nav" style={{ display: "flex", alignItems: "center", gap: 10, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 8, padding: "8px 14px", cursor: "pointer" }}>
                    <div style={{ width: 6, height: 6, borderRadius: "50%", background: item.color, flexShrink: 0 }} />
                    <span style={{ fontSize: 13, color: "rgba(255,255,255,0.8)", fontWeight: 500 }}>{item.label}</span>
                    <span style={{ marginLeft: "auto", fontSize: 12, color: "rgba(255,255,255,0.3)" }}>→</span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── EMPIRE MAP ── */}
      <div style={{ position: "relative", zIndex: 1, padding: "80px 20px", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 56 }}>
            <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.25em", textTransform: "uppercase", color: "#c9a84c", marginBottom: 12 }}>THE EMPIRE MAP</p>
            <h2 style={{ fontFamily: "Playfair Display, serif", fontSize: "clamp(28px, 5vw, 44px)", fontWeight: 700, color: "#fff", lineHeight: 1.2 }}>One platform. Every vertical.</h2>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 16 }}>
            {empireNodes.map((node, i) => (
              <div key={i} style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 16, padding: "20px 24px" }}>
                <div style={{ fontSize: 28, marginBottom: 10 }}>{node.icon}</div>
                <div style={{ fontFamily: "Playfair Display, serif", fontSize: 16, fontWeight: 700, color: "#fff", marginBottom: 6 }}>{node.title}</div>
                <div style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", lineHeight: 1.5 }}>{node.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── WAITLIST ── */}
      <div id="waitlist" ref={waitlistRef.ref} style={{ position: "relative", zIndex: 1, padding: "80px 20px", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
        <div style={{ maxWidth: 560, margin: "0 auto" }}>
          <div className={`reveal-up ${waitlistRef.visible ? "visible" : ""}`} style={{ textAlign: "center", marginBottom: 40 }}>
            <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.25em", textTransform: "uppercase", color: "#c9a84c", marginBottom: 12 }}>EARLY ACCESS</p>
            <h2 style={{ fontFamily: "Playfair Display, serif", fontSize: "clamp(28px, 5vw, 40px)", fontWeight: 700, color: "#fff", lineHeight: 1.2, marginBottom: 12 }}>
              Claim your spot in the empire.
            </h2>
            <p style={{ fontSize: 16, color: "rgba(255,255,255,0.5)", lineHeight: 1.6 }}>
              Invite-only. First 500 creators get lifetime founder pricing and direct access to the full platform.
            </p>
          </div>
          <div className={`reveal-up delay-2 ${waitlistRef.visible ? "visible" : ""}`} style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 20, padding: 32 }}>
            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div>
                <label style={{ display: "block", fontSize: 11, fontWeight: 600, letterSpacing: "0.15em", textTransform: "uppercase", color: "rgba(255,255,255,0.5)", marginBottom: 8 }}>Email</label>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@empire.com" style={{ width: "100%", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 8, padding: "12px 16px", fontSize: 15, color: "#fff", boxSizing: "border-box" }} />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <label style={{ display: "block", fontSize: 11, fontWeight: 600, letterSpacing: "0.15em", textTransform: "uppercase", color: "rgba(255,255,255,0.5)", marginBottom: 8 }}>Name</label>
                  <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" style={{ width: "100%", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 8, padding: "12px 16px", fontSize: 15, color: "#fff", boxSizing: "border-box" }} />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: 11, fontWeight: 600, letterSpacing: "0.15em", textTransform: "uppercase", color: "rgba(255,255,255,0.5)", marginBottom: 8 }}>Phone</label>
                  <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+1 (555) 000-0000" style={{ width: "100%", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 8, padding: "12px 16px", fontSize: 15, color: "#fff", boxSizing: "border-box" }} />
                </div>
              </div>
              <div>
                <label style={{ display: "block", fontSize: 11, fontWeight: 600, letterSpacing: "0.15em", textTransform: "uppercase", color: "rgba(255,255,255,0.5)", marginBottom: 8 }}>I am a...</label>
                <select value={creatorType} onChange={(e) => setCreatorType(e.target.value)} style={{ width: "100%", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 8, padding: "12px 16px", fontSize: 15, color: creatorType ? "#fff" : "rgba(255,255,255,0.4)", boxSizing: "border-box", appearance: "none", cursor: "pointer" }}>
                  <option value="" style={{ background: "#0a0a0f" }}>Select your creator type</option>
                  {creatorTypes.map((ct) => (
                    <option key={ct.value} value={ct.value} style={{ background: "#0a0a0f" }}>{ct.label}</option>
                  ))}
                </select>
              </div>
              <button type="submit" disabled={signupMutation.isPending} className="cta-primary" style={{ background: signupMutation.isPending ? "rgba(201,168,76,0.5)" : "#c9a84c", color: "#050508", border: "none", borderRadius: 8, padding: "14px 32px", fontSize: 15, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", cursor: signupMutation.isPending ? "not-allowed" : "pointer", marginTop: 4 }}>
                {signupMutation.isPending ? "SECURING YOUR SPOT..." : "REQUEST EARLY ACCESS"}
              </button>
              <p style={{ fontSize: 12, color: "rgba(255,255,255,0.3)", textAlign: "center", lineHeight: 1.5 }}>No spam. No BS. Just your empire OS.</p>
            </form>
          </div>
        </div>
      </div>

      {/* ── FOOTER ── */}
      <div style={{ position: "relative", zIndex: 1, borderTop: "1px solid rgba(255,255,255,0.06)", padding: "32px 20px", textAlign: "center" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 12, marginBottom: 16 }}>
          <img src="/logo-white.png" alt="CreatorVault" style={{ height: 28, objectFit: "contain", opacity: 0.7 }} />
        </div>
        <p style={{ fontSize: 12, color: "rgba(255,255,255,0.25)", letterSpacing: "0.1em" }}>
          © 2026 CreatorVault · The Empire OS · All rights reserved
        </p>
      </div>
    </div>
  );
}
