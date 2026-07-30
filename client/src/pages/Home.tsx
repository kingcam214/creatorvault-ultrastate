import { CSSProperties, FormEvent, ReactNode, useEffect, useRef, useState } from "react";
import { Link } from "wouter";
import { trpc } from "@/lib/trpc";

const HERO_VIDEO = "/videos/kingcam-hero-cam.mp4";
const HERO_POSTER = "/images/platform/dark_editorial_1.jpg";
const HOMEPAGE_AUDIO = "/audio/vaultx-homepage-pulse.wav";

const DEMOS = {
  luxury: "/videos/demos/luxury_reveal_demo.mp4",
  heat: "/videos/demos/heat_shots_demo.mp4",
  editorial: "/videos/demos/editorial_body_demo.mp4",
  afterDark: "/videos/demos/after_dark_demo.mp4",
  ppv: "/videos/demos/ppv_opener_demo.mp4",
  telegram: "/videos/demos/telegram_drop_demo.mp4",
  cinematic: "/videos/demos/cinematic_portrait_demo.mp4",
  fashion: "/videos/demos/fashion_fit_demo.mp4",
  scroll: "/videos/demos/scroll_stopper_demo.mp4",
  body: "/videos/demos/body_feature_demo.mp4",
  vip: "/videos/demos/vip_tease_demo.mp4",
  motion: "/videos/demos/motion_series_demo.mp4",
  penthouse: "/videos/demos/penthouse_life_demo.mp4",
} as const;

const POSTERS = {
  luxury: "/images/platform/luxury_1.jpg",
  heat: "/images/platform/neon_1.jpg",
  editorial: "/images/platform/dark_editorial_1.jpg",
  afterDark: "/images/platform/neon_2.jpg",
  ppv: "/images/platform/hero_editorial_3.jpg",
  telegram: "/images/platform/dark_editorial_2.jpg",
  cinematic: "/images/platform/hero_editorial_5.jpg",
  fashion: "/images/platform/fashion_1.jpg",
  scroll: "/images/platform/hero_editorial_1.jpg",
  body: "/images/platform/hero_editorial_2.jpg",
  vip: "/images/platform/luxury_2.jpg",
  motion: "/images/platform/ambient_penthouse.jpg",
  penthouse: "/images/platform/ambient_pool.jpg",
} as const;

const CREATOR_TYPES = [
  { value: "adult_creator", label: "Adult creator or premium model" },
  { value: "agency", label: "Agency, manager, or studio" },
  { value: "content_creator", label: "Independent video creator" },
  { value: "brand", label: "Brand, product, or partner" },
] as const;

function useScrollReveal(threshold = 0.12) {
  const ref = useRef<HTMLElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold },
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, [threshold]);

  return { ref, visible };
}

function useCounter(target: number, duration = 1800, active = false) {
  const [value, setValue] = useState(0);

  useEffect(() => {
    if (!active) return;

    setValue(0);
    let frame = 0;
    const startedAt = performance.now();

    const update = (now: number) => {
      const progress = Math.min(1, (now - startedAt) / duration);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(eased * target));
      if (progress < 1) frame = requestAnimationFrame(update);
    };

    frame = requestAnimationFrame(update);
    return () => cancelAnimationFrame(frame);
  }, [active, duration, target]);

  return value;
}

function GoldButton({
  href,
  children,
  submit = false,
  disabled = false,
  ghost = false,
  onClick,
}: {
  href?: string;
  children: ReactNode;
  submit?: boolean;
  disabled?: boolean;
  ghost?: boolean;
  onClick?: () => void;
}) {
  const className = ghost ? "cv-btn-ghost" : "cv-btn-gold";
  const sharedStyle: CSSProperties = {
    fontFamily: "Bebas Neue, sans-serif",
    fontSize: 16,
    letterSpacing: ".14em",
    textTransform: "uppercase",
    padding: "14px 32px",
    cursor: disabled ? "not-allowed" : "pointer",
    border: ghost ? "1px solid rgba(212,160,23,.5)" : "none",
    background: ghost
      ? "rgba(212,160,23,.06)"
      : "linear-gradient(135deg,#D4A017,#8B5E0A)",
    color: ghost ? "#D4A017" : "#060402",
    transition: "transform .2s, box-shadow .2s, opacity .2s",
    opacity: disabled ? 0.5 : 1,
    display: "inline-block",
    textDecoration: "none",
    boxShadow: ghost ? "none" : "0 4px 24px rgba(212,160,23,.35)",
  };

  if (href && !disabled) {
    return (
      <Link
        href={href}
        className={className}
        style={sharedStyle}
        onClick={onClick}
        onMouseEnter={(event) => {
          event.currentTarget.style.transform = "translateY(-2px)";
        }}
        onMouseLeave={(event) => {
          event.currentTarget.style.transform = "translateY(0)";
        }}
      >
        {children}
      </Link>
    );
  }

  return (
    <button
      type={submit ? "submit" : "button"}
      disabled={disabled}
      onClick={onClick}
      className={className}
      style={sharedStyle}
      onMouseEnter={(event) => {
        if (!disabled) event.currentTarget.style.transform = "translateY(-2px)";
      }}
      onMouseLeave={(event) => {
        event.currentTarget.style.transform = "translateY(0)";
      }}
    >
      {children}
    </button>
  );
}

function MediaCard({
  src,
  poster,
  label,
  sub,
  badge,
}: {
  src: string;
  poster?: string;
  label: string;
  sub: string;
  badge?: string;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    const card = cardRef.current;
    if (!video || !card) return;

    video.muted = true;
    const start = () => {
      video.play().then(() => setPlaying(true)).catch(() => undefined);
    };

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          if (video.readyState >= 2) start();
          else video.addEventListener("canplay", start, { once: true });
        } else {
          video.pause();
          setPlaying(false);
        }
      },
      { threshold: 0.15 },
    );

    observer.observe(card);
    return () => observer.disconnect();
  }, []);

  const start = () => {
    const video = videoRef.current;
    if (!video) return;
    video.play().catch(() => undefined);
    setPlaying(true);
  };

  const stop = () => {
    const video = videoRef.current;
    if (!video) return;
    video.pause();
    video.currentTime = 0;
    setPlaying(false);
  };

  return (
    <div
      ref={cardRef}
      onMouseEnter={start}
      onMouseLeave={stop}
      onTouchStart={start}
      style={{
        position: "relative",
        overflow: "hidden",
        borderRadius: 6,
        aspectRatio: "9/16",
        background: "#0a0806",
        cursor: "pointer",
        flexShrink: 0,
      }}
    >
      {poster && (
        <img
          src={poster}
          alt={label}
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }}
        />
      )}
      <video
        ref={videoRef}
        src={src}
        poster={poster}
        muted
        loop
        playsInline
        preload="metadata"
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", opacity: 1 }}
      />
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: "linear-gradient(to top, rgba(6,4,2,.92) 0%, rgba(6,4,2,.2) 55%, transparent 100%)",
        }}
      />
      <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: "14px 14px 16px" }}>
        {badge && (
          <span
            style={{
              display: "inline-block",
              fontFamily: "Space Mono, monospace",
              fontSize: 8,
              letterSpacing: ".2em",
              color: "#D4A017",
              textTransform: "uppercase",
              marginBottom: 6,
              background: "rgba(212,160,23,.12)",
              padding: "3px 8px",
              borderRadius: 2,
            }}
          >
            {badge}
          </span>
        )}
        {playing && (
          <span
            style={{
              display: "block",
              fontFamily: "Space Mono, monospace",
              fontSize: 8,
              letterSpacing: ".2em",
              color: "#4ade80",
              textTransform: "uppercase",
              marginBottom: 4,
            }}
          >
            ▶ LIVE
          </span>
        )}
        <p
          style={{
            margin: 0,
            fontFamily: "Bebas Neue, sans-serif",
            fontSize: 17,
            letterSpacing: ".06em",
            color: "#fff",
            textTransform: "uppercase",
          }}
        >
          {label}
        </p>
        <p style={{ margin: "3px 0 0", fontSize: 11, color: "rgba(255,255,255,.58)", lineHeight: 1.3 }}>{sub}</p>
      </div>
    </div>
  );
}

function TelegramProof({ active }: { active: boolean }) {
  const [stage, setStage] = useState(0);
  const [revenue, setRevenue] = useState(0);

  useEffect(() => {
    if (!active) return;

    const timers = [
      window.setTimeout(() => setStage(1), 400),
      window.setTimeout(() => setStage(2), 1400),
      window.setTimeout(() => setStage(3), 2600),
      window.setTimeout(() => setStage(4), 3800),
      window.setTimeout(() => {
        let total = 0;
        const interval = window.setInterval(() => {
          total += 29;
          setRevenue(total);
          if (total >= 580) window.clearInterval(interval);
        }, 120);
      }, 4200),
    ];

    return () => timers.forEach(window.clearTimeout);
  }, [active]);

  const messageStyle = (visible: boolean, gold = false) => ({
    opacity: visible ? 1 : 0,
    transform: visible ? "translateY(0)" : "translateY(14px)",
    transition: "opacity .5s ease, transform .5s ease",
    marginBottom: 10,
    background: gold
      ? "linear-gradient(135deg,rgba(212,160,23,.22),rgba(212,160,23,.08))"
      : "#1e3a5f",
    border: gold ? "1px solid rgba(212,160,23,.4)" : "none",
    borderRadius: "12px 12px 12px 2px",
    padding: "12px 14px",
    maxWidth: 280,
  });

  return (
    <div
      style={{
        background: "#111",
        border: "1px solid rgba(255,255,255,.1)",
        borderRadius: 18,
        overflow: "hidden",
        maxWidth: 320,
        width: "100%",
        fontFamily: "DM Sans, sans-serif",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          padding: "14px 16px",
          background: "#1a1a1a",
          borderBottom: "1px solid rgba(255,255,255,.08)",
        }}
      >
        <div
          style={{
            width: 38,
            height: 38,
            borderRadius: "50%",
            background: "linear-gradient(135deg,#D4A017,#8B5E0A)",
            flexShrink: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 16,
          }}
        >
          👑
        </div>
        <div>
          <p style={{ margin: 0, fontWeight: 700, fontSize: 14, color: "#fff" }}>KingCam VIP</p>
          <p style={{ margin: 0, fontSize: 11, color: "#4ade80" }}>● {stage >= 1 ? "drop live" : "online"}</p>
        </div>
        {stage >= 3 && (
          <div style={{ marginLeft: "auto", textAlign: "right" }}>
            <p style={{ margin: 0, fontFamily: "Space Mono, monospace", fontSize: 9, color: "rgba(255,255,255,.4)", letterSpacing: ".1em" }}>REVENUE</p>
            <p style={{ margin: 0, fontFamily: "Bebas Neue, sans-serif", fontSize: 22, color: "#D4A017", lineHeight: 1 }}>${revenue}</p>
          </div>
        )}
      </div>
      <div style={{ padding: "16px 14px", minHeight: 220 }}>
        <div style={messageStyle(stage >= 1)}>
          <p style={{ margin: 0, fontSize: 13, color: "rgba(255,255,255,.7)", lineHeight: 1.5 }}>📤 Drop staged. Sending to 2,847 subscribers…</p>
        </div>
        <div style={messageStyle(stage >= 2, true)}>
          <p style={{ margin: "0 0 10px", fontSize: 13, color: "#fff", lineHeight: 1.5 }}>🔥 New drop just hit. First 24 hours only — after that it's gone.</p>
          <div style={{ background: "linear-gradient(135deg,#D4A017,#8B5E0A)", color: "#060402", fontFamily: "Bebas Neue, sans-serif", fontSize: 22, letterSpacing: ".08em", padding: "5px 14px", borderRadius: 4, display: "inline-block", marginBottom: 10 }}>$29 PPV</div>
          <button type="button" style={{ display: "block", width: "100%", background: "rgba(212,160,23,.15)", border: "1px solid rgba(212,160,23,.5)", color: "#D4A017", fontFamily: "Bebas Neue, sans-serif", fontSize: 14, letterSpacing: ".1em", padding: 9, borderRadius: 6, cursor: "pointer", textTransform: "uppercase" }}>Unlock Now →</button>
          <p style={{ margin: "8px 0 0", fontSize: 10, color: "rgba(255,255,255,.35)", textAlign: "right" }}>just now · ✓✓</p>
        </div>
        <div style={messageStyle(stage >= 3)}>
          <p style={{ margin: 0, fontSize: 12, color: "rgba(255,255,255,.6)", lineHeight: 1.5 }}>💰 <strong style={{ color: "#4ade80" }}>+$29</strong> — purchase confirmed · 14 seconds ago</p>
        </div>
        <div style={messageStyle(stage >= 4)}>
          <p style={{ margin: 0, fontSize: 12, color: "rgba(255,255,255,.6)", lineHeight: 1.5 }}>💰 <strong style={{ color: "#4ade80" }}>+$29</strong> — purchase confirmed · 8 seconds ago</p>
        </div>
      </div>
    </div>
  );
}

function UploadFlow({ active }: { active: boolean }) {
  const [stage, setStage] = useState(0);
  const outputs = [
    { icon: "📲", label: "Telegram Drop", desc: "PPV teaser → channel" },
    { icon: "🎬", label: "PPV Trailer", desc: "Cinematic 15s preview" },
    { icon: "📸", label: "Instagram Reel", desc: "Platform-cut + caption pack" },
    { icon: "🐦", label: "X Teaser", desc: "Hook clip + thread copy" },
    { icon: "👑", label: "VIP Preview", desc: "Exclusive subscriber cut" },
    { icon: "💰", label: "Paid Drop", desc: "Behind paywall, priced live" },
  ];

  useEffect(() => {
    if (!active) return;
    const timers = [0, 600, 1100, 1600, 2100, 2600, 3100, 3600].map((delay, index) =>
      window.setTimeout(() => setStage(index + 1), delay),
    );
    return () => timers.forEach(window.clearTimeout);
  }, [active]);

  return (
    <div style={{ width: "100%" }}>
      <div
        style={{
          opacity: stage >= 1 ? 1 : 0,
          transform: stage >= 1 ? "translateY(0)" : "translateY(16px)",
          transition: "opacity .5s ease, transform .5s ease",
          display: "flex",
          alignItems: "center",
          gap: 14,
          padding: "16px 20px",
          background: "rgba(212,160,23,.06)",
          border: "1px solid rgba(212,160,23,.3)",
          borderRadius: 8,
          marginBottom: 16,
        }}
      >
        <div style={{ width: 44, height: 44, borderRadius: 8, background: "linear-gradient(135deg,#D4A017,#8B5E0A)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, flexShrink: 0 }}>📱</div>
        <div>
          <p style={{ margin: 0, fontWeight: 700, fontSize: 14, color: "#fff" }}>raw_video_001.mp4</p>
          <p style={{ margin: 0, fontSize: 12, color: "rgba(255,255,255,.5)" }}>Shot on phone · 47 seconds · unedited</p>
        </div>
        {stage >= 2 && (
          <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 6 }}>
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#D4A017", animation: "pulse 1s ease infinite" }} />
            <span style={{ fontFamily: "Space Mono, monospace", fontSize: 9, color: "#D4A017", letterSpacing: ".14em", textTransform: "uppercase" }}>processing</span>
          </div>
        )}
      </div>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, marginBottom: 16, opacity: stage >= 2 ? 1 : 0, transition: "opacity .4s ease .2s" }}>
        <div style={{ width: 2, height: 28, background: "linear-gradient(to bottom,#D4A017,rgba(212,160,23,.2))" }} />
        <div style={{ width: 0, height: 0, borderLeft: "6px solid transparent", borderRight: "6px solid transparent", borderTop: "8px solid rgba(212,160,23,.6)" }} />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) minmax(0,1fr)", gap: 8, minWidth: 0 }}>
        {outputs.map((output, index) => (
          <div
            key={output.label}
            style={{
              opacity: stage >= index + 3 ? 1 : 0,
              transform: stage >= index + 3 ? "translateY(0)" : "translateY(12px)",
              transition: "opacity .4s ease, transform .4s ease",
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "11px 14px",
              background: "#0a0806",
              border: `1px solid ${stage >= index + 3 ? "rgba(212,160,23,.2)" : "rgba(255,255,255,.06)"}`,
              borderRadius: 6,
              minWidth: 0,
            }}
          >
            <span style={{ fontSize: 18, flexShrink: 0 }}>{output.icon}</span>
            <div style={{ minWidth: 0 }}>
              <p style={{ margin: 0, fontWeight: 700, fontSize: 12, color: "#fff", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{output.label}</p>
              <p style={{ margin: 0, fontSize: 10, color: "rgba(255,255,255,.45)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{output.desc}</p>
            </div>
            {stage >= index + 3 && <div style={{ marginLeft: "auto", width: 7, height: 7, borderRadius: "50%", background: "#4ade80", flexShrink: 0 }} />}
          </div>
        ))}
      </div>
    </div>
  );
}

function Metric({ stat, label, active }: { stat: number | string; label: string; active: boolean }) {
  const numeric = typeof stat === "number";
  const value = useCounter(numeric ? stat : 0, 1800, active && numeric);

  return (
    <div style={{ textAlign: "center", padding: "28px 16px", border: "1px solid rgba(212,160,23,.18)", background: "rgba(212,160,23,.04)" }}>
      <p style={{ margin: "0 0 6px", fontFamily: "Bebas Neue, sans-serif", fontSize: "clamp(44px,7vw,72px)", letterSpacing: "-.02em", color: "#D4A017", lineHeight: 1 }}>{numeric ? value.toLocaleString() : stat}</p>
      <p style={{ margin: 0, fontSize: 12, color: "rgba(255,255,255,.55)", lineHeight: 1.4 }}>{label}</p>
    </div>
  );
}

export default function Home() {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [creatorType, setCreatorType] = useState("");
  const [isAudioPlaying, setIsAudioPlaying] = useState(false);
  const [navOpen, setNavOpen] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);
  const heroVideoRef = useRef<HTMLVideoElement>(null);
  const uploadRef = useScrollReveal(0.1);
  const cinemaRef = useScrollReveal(0.05);
  const telegramRef = useScrollReveal(0.1);
  const revenueRef = useScrollReveal(0.1);
  const accessRef = useScrollReveal(0.1);

  const signupMutation = trpc.waitlist.signup.useMutation({
    onSuccess: () => {
      setEmail("");
      setName("");
      setPhone("");
      setCreatorType("");
    },
  });

  useEffect(() => {
    const video = heroVideoRef.current;
    if (!video) return;
    video.muted = true;
    video.load();
    const play = () => video.play().catch(() => undefined);
    if (video.readyState >= 2) play();
    else video.addEventListener("canplay", play, { once: true });
  }, []);

  const toggleAudio = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (isAudioPlaying) {
      audio.pause();
      setIsAudioPlaying(false);
      return;
    }
    audio.volume = 0;
    audio
      .play()
      .then(() => {
        let volume = 0;
        const interval = window.setInterval(() => {
          volume = Math.min(1, volume + 0.04);
          audio.volume = volume;
          if (volume >= 1) window.clearInterval(interval);
        }, 60);
        setIsAudioPlaying(true);
      })
      .catch(() => undefined);
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!email || !creatorType) return;
    signupMutation.mutate({
      email,
      name: name || undefined,
      phone: phone || undefined,
      interestedIn: [creatorType],
      referralSource: "homepage-v3",
    });
  };

  const GOLD = "#D4A017";
  const BLACK = "#060402";

  return (
    <main className="cv-home-root" style={{ background: BLACK, color: "#fff", minHeight: "100vh", overflowX: "hidden", fontFamily: "DM Sans, sans-serif" }}>
      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: ${BLACK}; }
        body:has(.cv-home-root) header.fixed.top-0.left-0.right-0.z-50 { display: none !important; }
        body:has(.cv-home-root) .pt-16:has(> .cv-home-root) { padding-top: 0 !important; }
        .cv-shell { max-width: 1180px; margin: 0 auto; }
        .cv-kicker { font-family: Space Mono, monospace; font-size: 10px; letter-spacing: .22em; color: ${GOLD}; text-transform: uppercase; margin: 0 0 16px; }
        .cv-title { font-family: Bebas Neue, sans-serif; letter-spacing: -.01em; text-transform: uppercase; line-height: .92; }
        .cv-reveal { opacity: 0; transform: translateY(28px); transition: opacity .7s ease, transform .7s ease; }
        .cv-reveal.in { opacity: 1; transform: translateY(0); }
        @keyframes pulse { 0%,100%{opacity:1}50%{opacity:.4} }
        @keyframes ticker { from{transform:translateX(0)} to{transform:translateX(-50%)} }
        @keyframes scanLine { from{top:-5%} to{top:105%} }
        @keyframes fadeUp { from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:translateY(0)} }
        @keyframes glow { 0%,100%{box-shadow:0 0 30px rgba(212,160,23,.2)} 50%{box-shadow:0 0 60px rgba(212,160,23,.45)} }
        .cv-cinema-grid { display: grid; grid-template-columns: repeat(4,1fr); gap: 10px; }
        .cv-two-col > * { min-width: 0; }
        .cv-form-split { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
        .cv-form-field { display: grid; gap: 6px; min-width: 0; }
        .cv-form-label { font-family: "Space Mono", monospace; font-size: 9px; letter-spacing: .14em; color: rgba(255,255,255,.58); text-transform: uppercase; }
        .cv-form-field input, .cv-form-field select { min-width: 0; }
        .cv-hamburger { display: none; }
        .cv-mobile-nav { position: fixed; inset: 0; background: rgba(6,4,2,.97); z-index: 150; display: flex; flex-direction: column; justify-content: center; align-items: center; gap: 32px; }
        .cv-mobile-nav a { color: #fff; font-family: "Bebas Neue", sans-serif; font-size: 36px; letter-spacing: .08em; text-decoration: none; text-transform: uppercase; }
        .cv-mobile-nav-close { position: absolute; top: 24px; right: 24px; background: none; border: none; color: rgba(212,160,23,.8); font-size: 28px; cursor: pointer; font-family: "Space Mono", monospace; }
        @media (max-width: 900px) {
          .cv-cinema-grid { grid-template-columns: repeat(2,1fr) !important; }
          .cv-two-col { grid-template-columns: 1fr !important; }
          .cv-rev-grid { grid-template-columns: repeat(2,1fr) !important; }
          .cv-access-grid { grid-template-columns: 1fr !important; }
        }
        @media (max-width: 600px) {
          .cv-nav-links { display: none !important; }
          .cv-hamburger { display: flex !important; flex-direction: column; justify-content: center; gap: 5px; cursor: pointer; background: none; border: none; padding: 8px; z-index: 200; }
          .cv-hamburger span { display: block; width: 22px; height: 2px; background: rgba(212,160,23,.9); transition: all .25s ease; }
          .cv-cinema-grid { grid-template-columns: repeat(2,1fr) !important; }
          .cv-form-split { grid-template-columns: 1fr !important; }
          .cv-hero-title { font-size: clamp(52px,18vw,96px) !important; }
          .cv-hero-sub { font-size: 15px !important; }
          .cv-hero-actions { flex-direction: column !important; align-items: stretch !important; }
          .cv-hero-actions button, .cv-hero-actions a { width: 100%; text-align: center; }
        }
      `}</style>

      <audio ref={audioRef} src={HOMEPAGE_AUDIO} preload="none" loop />
      <button
        type="button"
        onClick={toggleAudio}
        aria-label="Toggle audio"
        style={{
          position: "fixed",
          right: 16,
          bottom: 16,
          zIndex: 100,
          border: `1px solid ${isAudioPlaying ? GOLD : "rgba(212,160,23,.4)"}`,
          background: isAudioPlaying ? GOLD : "rgba(10,8,6,.85)",
          color: isAudioPlaying ? BLACK : GOLD,
          padding: "10px 14px",
          fontFamily: "Space Mono, monospace",
          fontSize: 9,
          letterSpacing: ".16em",
          textTransform: "uppercase",
          cursor: "pointer",
          backdropFilter: "blur(18px)",
          borderRadius: 2,
        }}
      >
        {isAudioPlaying ? "♪ ON" : "♪ OFF"}
      </button>

      <section style={{ position: "relative", width: "100vw", minHeight: "100svh", overflow: "hidden", background: BLACK, display: "flex", flexDirection: "column" }}>
        <video ref={heroVideoRef} src={HERO_VIDEO} poster={HERO_POSTER} muted loop playsInline preload="auto" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", opacity: 0.62 }} />
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to bottom,rgba(6,4,2,.65) 0%,rgba(6,4,2,.05) 35%,rgba(6,4,2,.75) 100%)" }} />
        <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse 80% 60% at 50% 100%,rgba(212,160,23,.14),transparent 70%)" }} />
        <div style={{ position: "absolute", left: 0, right: 0, height: 1, background: "rgba(212,160,23,.2)", animation: "scanLine 7s linear infinite", zIndex: 2 }} />
        <nav style={{ position: "relative", zIndex: 20, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "20px 28px" }}>
          <Link href="/" style={{ display: "inline-flex", alignItems: "center", gap: 10, textDecoration: "none" }}>
            <img src="/logo-white.png" alt="CreatorVault" style={{ height: 26, objectFit: "contain" }} />
          </Link>
          <div className="cv-nav-links" style={{ display: "flex", gap: 28, alignItems: "center" }}>
            {[["Body Cinema", "/body-cinema"], ["VaultX", "/vaultx"], ["Telegram", "/telegram-hub"]].map(([label, href]) => (
              <Link key={href} href={href} style={{ color: "rgba(255,255,255,.72)", fontFamily: "Space Mono, monospace", fontSize: 9, letterSpacing: ".16em", textTransform: "uppercase", textDecoration: "none" }}>{label}</Link>
            ))}
            <GoldButton href="#access">Get Access</GoldButton>
          </div>
          <button className="cv-hamburger" aria-label="Open menu" onClick={() => setNavOpen(true)}>
            <span /><span /><span />
          </button>
        </nav>
        {navOpen && (
          <div className="cv-mobile-nav" onClick={() => setNavOpen(false)}>
            <button className="cv-mobile-nav-close" onClick={() => setNavOpen(false)}>✕</button>
            <Link href="/body-cinema" onClick={() => setNavOpen(false)}>Body Cinema</Link>
            <Link href="/trailer-maker" onClick={() => setNavOpen(false)}>Trailers</Link>
            <Link href="/vaultx" onClick={() => setNavOpen(false)}>VaultX</Link>
            <Link href="/telegram-hub" onClick={() => setNavOpen(false)}>Telegram</Link>
            <Link href="#access" onClick={() => setNavOpen(false)} style={{ color: "rgba(212,160,23,1)" }}>Get Access</Link>
          </div>
        )}
        <div style={{ position: "relative", zIndex: 10, flex: 1, display: "flex", flexDirection: "column", justifyContent: "flex-end", padding: "0 28px 72px" }}>
          <p className="cv-kicker" style={{ animation: "fadeUp .6s ease .1s both" }}>The creator empire operating system</p>
          <h1 className="cv-title cv-hero-title" style={{ fontSize: "clamp(64px,12vw,130px)", color: "#fff", marginBottom: 20, maxWidth: 900, animation: "fadeUp .7s ease .2s both" }}>One upload.<br />A week of income.</h1>
          <p className="cv-hero-sub" style={{ color: "rgba(255,255,255,.72)", fontSize: 18, lineHeight: 1.65, maxWidth: 520, marginBottom: 36, animation: "fadeUp .7s ease .35s both" }}>Upload one video. Walk away with a Telegram drop, a PPV trailer, an Instagram Reel, and a paid offer — all running while you sleep.</p>
          <div className="cv-hero-actions" style={{ display: "flex", gap: 12, flexWrap: "wrap", animation: "fadeUp .7s ease .48s both" }}>
            <GoldButton href="#access">I want this</GoldButton>
            <GoldButton href="#cinema" ghost>See it in motion</GoldButton>
          </div>
        </div>
        <div style={{ position: "absolute", bottom: 22, left: "50%", transform: "translateX(-50%)", display: "flex", flexDirection: "column", alignItems: "center", gap: 5, opacity: 0.6, zIndex: 10 }}>
          <div style={{ width: 1, height: 32, background: "linear-gradient(to bottom,rgba(212,160,23,.8),transparent)" }} />
          <p style={{ fontFamily: "Space Mono, monospace", fontSize: 8, letterSpacing: ".2em", color: GOLD, textTransform: "uppercase" }}>scroll</p>
        </div>
      </section>

      <section ref={uploadRef.ref} style={{ background: BLACK, padding: "100px 28px", borderTop: "1px solid rgba(212,160,23,.1)" }}>
        <div className="cv-shell">
          <div className={`cv-reveal ${uploadRef.visible ? "in" : ""}`}>
            <p className="cv-kicker">What actually happens</p>
            <h2 className="cv-title" style={{ fontSize: "clamp(44px,8vw,88px)", color: "#fff", marginBottom: 16, maxWidth: 700 }}>You upload once.<br />This is what comes out.</h2>
            <p style={{ color: "rgba(255,255,255,.6)", fontSize: 17, lineHeight: 1.7, marginBottom: 64, maxWidth: 540 }}>No editing. No captioning. No scheduling. No figuring out what to post where. It's already done.</p>
          </div>
          <div className="cv-two-col" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 40, alignItems: "start" }}>
            <div className={`cv-reveal ${uploadRef.visible ? "in" : ""}`} style={{ transitionDelay: ".1s" }}><UploadFlow active={uploadRef.visible} /></div>
            <div className={`cv-reveal ${uploadRef.visible ? "in" : ""}`} style={{ transitionDelay: ".25s" }}>
              <p style={{ fontFamily: "Space Mono, monospace", fontSize: 10, letterSpacing: ".18em", color: "rgba(255,255,255,.45)", textTransform: "uppercase", marginBottom: 14 }}>Tap any card — this is the actual output</p>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <MediaCard src={DEMOS.luxury} poster={POSTERS.luxury} label="Luxury Reveal" sub="PPV opener" badge="PPV" />
                <MediaCard src={DEMOS.heat} poster={POSTERS.heat} label="Heat Shots" sub="Instagram Reel" badge="REEL" />
                <MediaCard src={DEMOS.telegram} poster={POSTERS.telegram} label="Telegram Drop" sub="Channel drop" badge="DROP" />
                <MediaCard src={DEMOS.ppv} poster={POSTERS.ppv} label="PPV Trailer" sub="Paid content" badge="PAID" />
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="cinema" ref={cinemaRef.ref} style={{ background: "#080604", padding: "100px 28px", borderTop: "1px solid rgba(212,160,23,.1)" }}>
        <div className="cv-shell">
          <div className={`cv-reveal ${cinemaRef.visible ? "in" : ""}`} style={{ marginBottom: 52, display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: 24 }}>
            <div><p className="cv-kicker">Body Cinema</p><h2 className="cv-title" style={{ fontSize: "clamp(44px,8vw,88px)", color: "#fff", maxWidth: 640 }}>Your phone video.<br />Hollywood result.</h2></div>
            <div style={{ maxWidth: 360 }}><p style={{ color: "rgba(255,255,255,.6)", fontSize: 16, lineHeight: 1.7 }}>47 cinematic styles. Every card below is a real output — not a mockup, not a render. Tap to watch what your content becomes.</p></div>
          </div>
          <div className={`cv-cinema-grid cv-reveal ${cinemaRef.visible ? "in" : ""}`} style={{ transitionDelay: ".12s" }}>
            <MediaCard src={DEMOS.luxury} poster={POSTERS.luxury} label="Luxury Reveal" sub="The slow drop that sells itself" />
            <MediaCard src={DEMOS.heat} poster={POSTERS.heat} label="Heat Shots" sub="The edit that stops the scroll" />
            <MediaCard src={DEMOS.editorial} poster={POSTERS.editorial} label="Editorial Body" sub="Magazine. Every frame." />
            <MediaCard src={DEMOS.afterDark} poster={POSTERS.afterDark} label="After Dark" sub="The city at night belongs to her" />
            <MediaCard src={DEMOS.cinematic} poster={POSTERS.cinematic} label="Cinematic" sub="Your face. A24 treatment." />
            <MediaCard src={DEMOS.fashion} poster={POSTERS.fashion} label="Fashion" sub="Runway ready. Every outfit." />
            <MediaCard src={DEMOS.scroll} poster={POSTERS.scroll} label="Scroll Stopper" sub="3 seconds to own the feed" />
            <MediaCard src={DEMOS.body} poster={POSTERS.body} label="Body Feature" sub="Every curve. Every reason." />
          </div>
          <div className={`cv-reveal ${cinemaRef.visible ? "in" : ""}`} style={{ textAlign: "center", marginTop: 44, transitionDelay: ".28s" }}><GoldButton href="/body-cinema">See all 47 styles</GoldButton></div>
        </div>
      </section>

      <section ref={telegramRef.ref} style={{ background: BLACK, padding: "100px 28px", borderTop: "1px solid rgba(212,160,23,.1)" }}>
        <div className="cv-shell">
          <div className="cv-two-col" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 64, alignItems: "center" }}>
            <div className={`cv-reveal ${telegramRef.visible ? "in" : ""}`}>
              <p className="cv-kicker">Telegram drops</p>
              <h2 className="cv-title" style={{ fontSize: "clamp(44px,7vw,80px)", color: "#fff", marginBottom: 24 }}>Sell while<br />you sleep.</h2>
              <p style={{ color: "rgba(255,255,255,.65)", fontSize: 17, lineHeight: 1.72, marginBottom: 32 }}>Every drop goes out with a tracking link. Every tap is logged. Every purchase is attributed. You wake up to receipts, not questions.</p>
              {["Drop staged → you approve → it fires", "Every link tracked back to the exact message", "Revenue attributed per drop, per channel, per day", "Subscribers scored by purchase history and buy likelihood"].map((line, index) => (
                <div key={line} className={`cv-reveal ${telegramRef.visible ? "in" : ""}`} style={{ transitionDelay: `${0.1 + index * 0.08}s`, display: "flex", alignItems: "flex-start", gap: 12, marginBottom: 14 }}><span style={{ color: GOLD, marginTop: 2, flexShrink: 0 }}>◆</span><p style={{ margin: 0, color: "rgba(255,255,255,.75)", fontSize: 15, lineHeight: 1.5 }}>{line}</p></div>
              ))}
              <div style={{ marginTop: 36 }}><GoldButton href="/telegram-hub">Open Telegram Hub</GoldButton></div>
            </div>
            <div className={`cv-reveal ${telegramRef.visible ? "in" : ""}`} style={{ transitionDelay: ".2s", display: "flex", justifyContent: "center" }}><TelegramProof active={telegramRef.visible} /></div>
          </div>
        </div>
      </section>

      <section ref={revenueRef.ref} style={{ position: "relative", background: "#080604", padding: "100px 28px", borderTop: "1px solid rgba(212,160,23,.1)", overflow: "hidden" }}>
        <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse 60% 50% at 50% 50%,rgba(212,160,23,.07),transparent 70%)", pointerEvents: "none" }} />
        <div className="cv-shell" style={{ position: "relative" }}>
          <div className={`cv-reveal ${revenueRef.visible ? "in" : ""}`} style={{ textAlign: "center", marginBottom: 56 }}><p className="cv-kicker">The result</p><h2 className="cv-title" style={{ fontSize: "clamp(44px,8vw,88px)", color: "#fff" }}>One upload.<br />Six sellable outputs.</h2></div>
          <div className={`cv-rev-grid cv-reveal ${revenueRef.visible ? "in" : ""}`} style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 2, transitionDelay: ".12s" }}>
            <Metric stat={6} label="sellable outputs from one upload" active={revenueRef.visible} />
            <Metric stat={47} label="cinematic styles available in Body Cinema" active={revenueRef.visible} />
            <Metric stat={5} label="platforms your content reaches automatically" active={revenueRef.visible} />
            <Metric stat="24/7" label="your brand is present without you being there" active={revenueRef.visible} />
          </div>
          <div className={`cv-reveal ${revenueRef.visible ? "in" : ""}`} style={{ transitionDelay: ".22s", marginTop: 56 }}>
            <p className="cv-kicker" style={{ textAlign: "center", marginBottom: 20 }}>Real outputs from the platform</p>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10 }}>
              <MediaCard src={DEMOS.vip} poster={POSTERS.vip} label="VIP Tease" sub="Subscriber exclusive" />
              <MediaCard src={DEMOS.motion} poster={POSTERS.motion} label="Motion Series" sub="Cinematic sequence" />
              <MediaCard src={DEMOS.penthouse} poster={POSTERS.penthouse} label="Penthouse Life" sub="Luxury content" />
            </div>
          </div>
          <div style={{ marginTop: 64, overflow: "hidden", position: "relative" }}>
            <div style={{ display: "flex", gap: 0, animation: "ticker 28s linear infinite", width: "max-content" }}>
              {[0, 1].map((group) => (
                <div key={group} style={{ display: "flex", gap: 0 }}>
                  {["Body Cinema · 47 styles", "Telegram drops on autopilot", "PPV trailers in minutes", "Revenue attributed per drop", "Subscriber intelligence", "6 outputs from one upload", "Clone that sells while you sleep", "Instagram · X · Telegram · OF · Fansly"].map((line) => (
                    <span key={`${group}-${line}`} style={{ fontFamily: "Space Mono, monospace", fontSize: 10, letterSpacing: ".2em", color: "rgba(212,160,23,.6)", textTransform: "uppercase", padding: "0 38px", whiteSpace: "nowrap", borderRight: "1px solid rgba(212,160,23,.15)" }}>{line}</span>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section id="access" ref={accessRef.ref} style={{ position: "relative", background: BLACK, padding: "100px 28px 120px", borderTop: "1px solid rgba(212,160,23,.1)", overflow: "hidden" }}>
        <video src={DEMOS.afterDark} autoPlay muted loop playsInline preload="none" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", opacity: 0.07 }} />
        <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse 70% 60% at 30% 50%,rgba(212,160,23,.1),transparent 60%)" }} />
        <div className={`cv-shell cv-access-grid cv-reveal ${accessRef.visible ? "in" : ""}`} style={{ position: "relative", display: "grid", gridTemplateColumns: "minmax(0,600px) minmax(300px,480px)", gap: 48, alignItems: "center" }}>
          <div>
            <p className="cv-kicker">Get access</p>
            <h2 className="cv-title" style={{ fontSize: "clamp(48px,9vw,90px)", color: "#fff", marginBottom: 24 }}>You already have<br />everything you need.</h2>
            <p style={{ color: "rgba(255,255,255,.65)", fontSize: 17, lineHeight: 1.72, marginBottom: 36, maxWidth: 520 }}>One phone. One video. That's the raw material. CreatorVault handles everything after the upload — the edit, the drop, the sale, the repeat.</p>
            {["For creators who want to look bigger than their current team.", "For premium models and studios who need better drops, faster.", "For builders who want every platform covered from one place."].map((line) => (
              <p key={line} style={{ margin: "0 0 14px", color: "rgba(255,255,255,.72)", lineHeight: 1.5, display: "flex", alignItems: "flex-start", gap: 10 }}><span style={{ color: GOLD, flexShrink: 0, marginTop: 2 }}>◆</span>{line}</p>
            ))}
          </div>
          <form aria-labelledby="request-access-title" onSubmit={submit} style={{ display: "grid", gap: 14, padding: 28, border: "1px solid rgba(212,160,23,.28)", background: "rgba(10,8,6,.9)", backdropFilter: "blur(24px)", boxShadow: "0 40px 120px rgba(0,0,0,.4)", animation: "glow 4s ease infinite" }}>
            <p id="request-access-title" className="cv-kicker" style={{ color: GOLD }}>Request access</p>
            <label className="cv-form-field" htmlFor="access-email">
              <span className="cv-form-label">Email</span>
              <input id="access-email" name="email" type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" required style={{ background: "#0a0806", border: "1px solid rgba(255,255,255,.12)", color: "#fff", padding: "14px 16px", fontFamily: "DM Sans, sans-serif", fontSize: 14, width: "100%", outline: "none" }} />
            </label>
            <div className="cv-form-split">
              <label className="cv-form-field" htmlFor="access-name">
                <span className="cv-form-label">Name (optional)</span>
                <input id="access-name" name="name" type="text" autoComplete="name" value={name} onChange={(event) => setName(event.target.value)} placeholder="Your name" style={{ background: "#0a0806", border: "1px solid rgba(255,255,255,.12)", color: "#fff", padding: "14px 16px", fontFamily: "DM Sans, sans-serif", fontSize: 14, width: "100%", outline: "none" }} />
              </label>
              <label className="cv-form-field" htmlFor="access-phone">
                <span className="cv-form-label">Phone (optional)</span>
                <input id="access-phone" name="phone" type="tel" autoComplete="tel" value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="Mobile number" style={{ background: "#0a0806", border: "1px solid rgba(255,255,255,.12)", color: "#fff", padding: "14px 16px", fontFamily: "DM Sans, sans-serif", fontSize: 14, width: "100%", outline: "none" }} />
              </label>
            </div>
            <label className="cv-form-field" htmlFor="access-creator-type">
              <span className="cv-form-label">Who are you?</span>
              <select id="access-creator-type" name="creatorType" value={creatorType} onChange={(event) => setCreatorType(event.target.value)} required style={{ background: "#0a0806", border: "1px solid rgba(255,255,255,.12)", color: creatorType ? "#fff" : "rgba(255,255,255,.4)", padding: "14px 16px", fontFamily: "DM Sans, sans-serif", fontSize: 14, width: "100%", outline: "none" }}>
                <option value="" style={{ background: "#0a0806" }}>Choose one</option>
                {CREATOR_TYPES.map((option) => <option key={option.value} value={option.value} style={{ background: "#0a0806" }}>{option.label}</option>)}
              </select>
            </label>
            <GoldButton submit disabled={signupMutation.isPending}>{signupMutation.isPending ? "Sending…" : "I want in"}</GoldButton>
            {signupMutation.isSuccess && <p style={{ margin: 0, color: "#4ade80", fontSize: 13, textAlign: "center" }}>✓ You're in. We'll be in touch.</p>}
            {signupMutation.isError && <p style={{ margin: 0, color: "#f87171", fontSize: 13, textAlign: "center" }}>{signupMutation.error?.message?.includes("already") ? "Already registered — we have you." : "Something went wrong. Try again."}</p>}
            <p style={{ margin: 0, color: "rgba(255,255,255,.35)", fontSize: 11, lineHeight: 1.5, textAlign: "center" }}>Early access only. 18+ creators, studios, and partners.</p>
          </form>
        </div>
      </section>

      <footer style={{ borderTop: "1px solid rgba(255,255,255,.06)", padding: "36px 24px", textAlign: "center", background: "#040302" }}>
        <img src="/logo-white.png" alt="CreatorVault" style={{ height: 20, objectFit: "contain", opacity: 0.45, marginBottom: 14 }} />
        <p style={{ fontFamily: "Space Mono, monospace", fontSize: 9, color: "rgba(255,255,255,.25)", letterSpacing: ".14em", textTransform: "uppercase", marginBottom: 14 }}>CreatorVault · Premium Creator Revenue · 18+ only</p>
        <nav style={{ display: "flex", justifyContent: "center", gap: 16, flexWrap: "wrap", fontSize: 12 }}>
          {[["Terms", "/terms"], ["Privacy", "/privacy"], ["DMCA", "/dmca"], ["2257", "/2257"], ["Get Access", "#access"]].map(([label, href]) => (
            <Link key={href} href={href} style={{ color: "rgba(255,255,255,.42)", textDecoration: "none" }}>{label}</Link>
          ))}
        </nav>
      </footer>
    </main>
  );
}
