import { Link } from "wouter";
import {
  ArrowUpRight,
  BadgeCheck,
  CheckCircle2,
  Crown,
  LockKeyhole,
  Play,
  Radio,
  Send,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  Wand2,
  Wallet,
} from "lucide-react";
import { CreatorVaultRoute } from "@/lib/productArchitecture";
import { HOMEPAGE_MEDIA, MEDIA_FALLBACKS } from "@/lib/homepageMediaRegistry";
import { useEffect, useRef, useState, type CSSProperties } from "react";

function MediaFallback({
  videoSrc,
  posterSrc,
  alt,
  className = "",
  style = {},
  objectFit = "cover",
  priority = false,
}: {
  videoSrc: string;
  posterSrc: string;
  alt: string;
  className?: string;
  style?: CSSProperties;
  objectFit?: "cover" | "contain";
  priority?: boolean;
}) {
  const [failed, setFailed] = useState(false);
  const [ready, setReady] = useState(false);

  return (
    <div className={`relative overflow-hidden bg-[#090909] ${className}`} style={style} aria-label={alt}>
      <img
        src={posterSrc}
        alt={alt}
        className={`absolute inset-0 h-full w-full transition-opacity duration-700 ${ready && !failed ? "opacity-0" : "opacity-100"}`}
        style={{ objectFit }}
      />
      {!failed && (
        <video
          src={videoSrc}
          autoPlay
          loop
          muted
          playsInline
          preload={priority ? "auto" : "metadata"}
          onCanPlay={() => setReady(true)}
          onError={() => setFailed(true)}
          className={`absolute inset-0 h-full w-full transition-opacity duration-700 ${ready ? "opacity-100" : "opacity-0"}`}
          style={{ objectFit }}
          aria-hidden="true"
        />
      )}
    </div>
  );
}

function KingCamHero() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const hero = HOMEPAGE_MEDIA.kingcamHeroLoopProof;

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const start = () => {
      video.muted = true;
      video.defaultMuted = true;
      void video.play().then(() => setPlaying(true)).catch(() => setPlaying(false));
    };
    video.addEventListener("loadeddata", start, { once: true });
    video.addEventListener("playing", () => setPlaying(true));
    video.addEventListener("error", () => setPlaying(false));
    if (video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) start();
    return () => video.removeEventListener("loadeddata", start);
  }, []);

  return (
    <div className="absolute inset-0 overflow-hidden bg-[#070504]">
      <img
        src={hero.fallbackAsset}
        alt=""
        aria-hidden="true"
        className="absolute inset-0 h-full w-full scale-110 object-cover opacity-50 blur-3xl"
      />
      <video
        src={hero.livePath}
        autoPlay
        loop
        muted
        playsInline
        preload="auto"
        className={`absolute inset-0 h-full w-full scale-110 object-cover opacity-35 blur-2xl transition-opacity duration-700 ${playing ? "opacity-35" : "opacity-0"}`}
        aria-hidden="true"
      />
      <img
        src={hero.fallbackAsset}
        alt="KingCam full-body creator portrait"
        className={`absolute inset-0 z-[1] h-full w-full object-contain transition-opacity duration-700 ${playing ? "opacity-0" : "opacity-100"}`}
      />
      <video
        ref={videoRef}
        src={hero.livePath}
        poster={hero.fallbackAsset}
        autoPlay
        loop
        muted
        playsInline
        preload="auto"
        className={`absolute inset-0 z-[2] h-full w-full object-contain transition-opacity duration-500 ${playing ? "opacity-100" : "opacity-0"}`}
        aria-label="KingCam full-body CreatorVault hero loop"
      />
      <div className="absolute inset-0 z-[3] bg-gradient-to-b from-black/45 via-transparent to-black/90" />
      <div className="absolute inset-y-0 left-0 z-[3] hidden w-1/2 bg-gradient-to-r from-black/80 via-black/20 to-transparent lg:block" />
    </div>
  );
}

const treatments = [
  { media: HOMEPAGE_MEDIA.bodyCinemaArchProof, label: "The Arch", note: "Sculpted reveal" },
  { media: HOMEPAGE_MEDIA.bodyCinemaSilhouetteProof, label: "Silhouette", note: "Graphic shadow" },
  { media: HOMEPAGE_MEDIA.bodyCinemaLuxuryProof, label: "Luxury Reveal", note: "Campaign detail" },
  { media: HOMEPAGE_MEDIA.bodyCinemaVipProof, label: "VIP Tease", note: "Access-hook rhythm" },
];

const moneyTools = [
  { icon: Crown, title: "Premium Drops", copy: "Package content around the moment people want more." },
  { icon: Wand2, title: "Body Cinema", copy: "Turn one owned clip into a distinct visual treatment." },
  { icon: Radio, title: "Social Empire", copy: "Prepare your next move without losing control of the post." },
  { icon: Wallet, title: "VaultX", copy: "Keep the offer, audience, and money path close to the work." },
];

export default function Home() {
  const hero = HOMEPAGE_MEDIA.kingcamHeroLoopProof;
  const trailer = HOMEPAGE_MEDIA.kingcamTrailerProof;

  return (
    <main className="min-h-screen overflow-hidden bg-[#080706] text-white selection:bg-[#d9b66f]/40">
      <section className="relative isolate min-h-[100svh] overflow-hidden border-b border-white/10" aria-label="CreatorVault founder hero">
        <KingCamHero />
        <div className="relative z-10 mx-auto flex min-h-[100svh] max-w-7xl flex-col px-5 pb-8 pt-6 sm:px-8 sm:pt-8 lg:px-12">
          <header className="flex items-center justify-between">
            <img src="/logo-white.png" alt="CreatorVault" className="h-7 sm:h-9" />
            <Link href={CreatorVaultRoute.creatorOS}>
              <a className="rounded-full border border-white/25 bg-black/30 px-4 py-2 text-xs font-black uppercase tracking-[0.14em] text-white backdrop-blur-md transition hover:bg-white hover:text-black">Enter your world</a>
            </Link>
          </header>

          <div className="mt-auto max-w-2xl pb-8 pt-48 sm:pb-12 lg:my-auto lg:py-28">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-[#d9b66f]/40 bg-black/35 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.2em] text-[#f2d9a0] backdrop-blur-md">
              <Sparkles className="h-3.5 w-3.5" /> Creation is the advantage
            </div>
            <h1 className="max-w-xl text-5xl font-black leading-[0.86] tracking-[-0.07em] sm:text-7xl lg:text-8xl">
              Build the work<br />they can&apos;t ignore.
            </h1>
            <p className="mt-6 max-w-lg text-base leading-relaxed text-zinc-200 sm:text-lg">
              CreatorVault gives your best media a place to become a premium drop, a stronger visual, a direct offer, and a real move forward.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link href="/signup">
                <a className="inline-flex min-h-14 items-center justify-center gap-2 rounded-full bg-[#f4ead8] px-7 font-black text-[#15100a] transition hover:bg-white">Start your vault <ArrowUpRight className="h-4 w-4" /></a>
              </Link>
              <Link href="/vault-x/studio">
                <a className="inline-flex min-h-14 items-center justify-center gap-2 rounded-full border border-white/30 bg-black/30 px-7 font-black text-white backdrop-blur transition hover:bg-white/10">See Body Cinema <Play className="h-4 w-4 fill-current" /></a>
              </Link>
            </div>
          </div>

          <div className="flex items-end justify-between border-t border-white/15 pt-4 text-[10px] font-black uppercase tracking-[0.16em] text-zinc-300 sm:text-xs">
            <span>KingCam / CreatorVault</span>
            <span className="hidden sm:inline">Full-body identity · moving media · real work</span>
            <span>{hero.durationSeconds.toFixed(1)}s hero loop</span>
          </div>
        </div>
      </section>

      <section className="border-b border-white/10 bg-[#0d0b09]">
        <div className="mx-auto grid max-w-7xl gap-10 px-5 py-16 sm:px-8 sm:py-24 lg:grid-cols-[0.85fr_1.15fr] lg:items-center lg:px-12">
          <div className="max-w-xl">
            <div className="text-xs font-black uppercase tracking-[0.24em] text-[#d9b66f]">The creation arsenal</div>
            <h2 className="mt-4 text-4xl font-black leading-[0.95] tracking-[-0.06em] sm:text-6xl">One clip can carry a whole release.</h2>
            <p className="mt-6 text-base leading-relaxed text-zinc-400 sm:text-lg">You do not need a different app for every part of the work. Build the visual, package the moment, prepare the social cut, and keep your offer close to the content.</p>
            <div className="mt-10 grid gap-3 sm:grid-cols-2">
              {moneyTools.map(({ icon: Icon, title, copy }) => (
                <div key={title} className="rounded-3xl border border-white/10 bg-white/[0.035] p-5 transition hover:border-[#d9b66f]/40 hover:bg-white/[0.06]">
                  <Icon className="h-5 w-5 text-[#e8c87e]" />
                  <h3 className="mt-5 font-black">{title}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-zinc-400">{copy}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="relative grid grid-cols-2 gap-3 sm:gap-5">
            <div className="col-span-2 overflow-hidden rounded-[2rem] border border-[#d9b66f]/25 bg-black shadow-[0_20px_70px_rgba(0,0,0,0.45)]">
              <MediaFallback videoSrc={trailer.livePath} posterSrc={trailer.fallbackAsset} alt="KingCam campaign trailer" className="aspect-[16/10]" priority />
              <div className="flex items-center justify-between border-t border-white/10 bg-black/80 px-5 py-4">
                <div><div className="text-[10px] font-black uppercase tracking-[0.18em] text-[#d9b66f]">Trailer Maker</div><div className="mt-1 text-sm font-black">The Creator&apos;s Empire</div></div>
                <span className="text-xs font-bold text-zinc-400">Watchable master</span>
              </div>
            </div>
            <div className="overflow-hidden rounded-[1.5rem] border border-white/10 bg-black">
              <MediaFallback videoSrc={HOMEPAGE_MEDIA.bodyCinemaArchTeaserProof.livePath} posterSrc={HOMEPAGE_MEDIA.bodyCinemaArchTeaserProof.fallbackAsset} alt="VaultX Arch social teaser" className="aspect-[9/12]" />
            </div>
            <div className="overflow-hidden rounded-[1.5rem] border border-white/10 bg-black">
              <MediaFallback videoSrc={HOMEPAGE_MEDIA.kingcamHeroLoopProof.livePath} posterSrc={HOMEPAGE_MEDIA.kingcamHeroLoopProof.fallbackAsset} alt="KingCam homepage hero loop" className="aspect-[9/12]" objectFit="contain" />
            </div>
          </div>
        </div>
      </section>

      <section className="border-b border-white/10 bg-[#070605]">
        <div className="mx-auto max-w-7xl px-5 py-16 sm:px-8 sm:py-24 lg:px-12">
          <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
            <div className="max-w-2xl"><div className="text-xs font-black uppercase tracking-[0.24em] text-[#d9b66f]">Body Cinema</div><h2 className="mt-4 text-4xl font-black leading-[0.95] tracking-[-0.06em] sm:text-6xl">Same source. Four different reasons to stop scrolling.</h2></div>
            <Link href="/vault-x/studio"><a className="inline-flex items-center gap-2 self-start text-sm font-black text-zinc-300 transition hover:text-white md:self-auto">Open your studio <ArrowUpRight className="h-4 w-4" /></a></Link>
          </div>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {treatments.map(({ media, label, note }) => (
              <figure key={label} className="group overflow-hidden rounded-[1.75rem] border border-white/10 bg-[#111] transition hover:-translate-y-1 hover:border-[#d9b66f]/50">
                <MediaFallback videoSrc={media.livePath} posterSrc={media.fallbackAsset} alt={`${label} Body Cinema treatment`} className="aspect-[9/14]" />
                <figcaption className="border-t border-white/10 bg-black p-4"><div className="font-black">{label}</div><div className="mt-1 text-xs font-bold uppercase tracking-[0.13em] text-zinc-500">{note}</div></figcaption>
              </figure>
            ))}
          </div>
          <p className="mt-6 max-w-3xl text-sm leading-relaxed text-zinc-500">These are accepted CreatorVault demonstrations from one approved source. Your own treatments are built from your own selected media inside Body Cinema.</p>
        </div>
      </section>

      <section className="border-b border-white/10 bg-[#0c0b0a]">
        <div className="mx-auto grid max-w-7xl gap-10 px-5 py-16 sm:px-8 sm:py-24 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:px-12">
          <div className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-black shadow-2xl">
            <MediaFallback videoSrc={HOMEPAGE_MEDIA.bodyCinemaArchTeaserProof.livePath} posterSrc={HOMEPAGE_MEDIA.bodyCinemaArchTeaserProof.fallbackAsset} alt="VaultX premium teaser" className="aspect-[4/5]" />
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black via-black/75 to-transparent p-7 pt-28"><div className="text-[10px] font-black uppercase tracking-[0.2em] text-[#d9b66f]">VaultX</div><div className="mt-2 text-2xl font-black">Make the release feel like an event.</div></div>
          </div>
          <div>
            <div className="text-xs font-black uppercase tracking-[0.24em] text-[#d9b66f]">The money room</div>
            <h2 className="mt-4 text-4xl font-black leading-[0.95] tracking-[-0.06em] sm:text-6xl">Your work deserves a stronger room around it.</h2>
            <p className="mt-6 max-w-xl text-base leading-relaxed text-zinc-400 sm:text-lg">VaultX is where the visual, the private offer, and the fan experience come together. Keep it premium, keep it on your terms, and make every drop feel worth unlocking.</p>
            <div className="mt-9 grid gap-3 sm:grid-cols-2">
              {[{ icon: LockKeyhole, label: "Private unlocks" }, { icon: BadgeCheck, label: "VIP access" }, { icon: Wallet, label: "Direct money path" }, { icon: TrendingUp, label: "Real revenue intelligence" }].map(({ icon: Icon, label }) => <div key={label} className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.035] p-4"><Icon className="h-5 w-5 text-[#e8c87e]" /><span className="text-sm font-black">{label}</span></div>)}
            </div>
          </div>
        </div>
      </section>

      <section className="border-b border-white/10 bg-[#070605]">
        <div className="mx-auto grid max-w-7xl gap-10 px-5 py-16 sm:px-8 sm:py-24 lg:grid-cols-2 lg:items-center lg:px-12">
          <div>
            <div className="text-xs font-black uppercase tracking-[0.24em] text-[#d9b66f]">Social Empire</div>
            <h2 className="mt-4 text-4xl font-black leading-[0.95] tracking-[-0.06em] sm:text-6xl">Prepare the post. Keep the final say.</h2>
            <p className="mt-6 max-w-xl text-base leading-relaxed text-zinc-400 sm:text-lg">Your work can move from a finished master into platform-ready drafts without turning your business over to autopilot. Nothing leaves CreatorVault until you say it does.</p>
            <div className="mt-9 space-y-3">
              {[{ icon: ShieldCheck, title: "CreatorVault", state: "Your content is ready inside your world", live: true }, { icon: Play, title: "Instagram", state: "Vertical teaser prepared for your approval", live: false }, { icon: Send, title: "TikTok", state: "Vertical teaser prepared for your approval", live: false }].map(({ icon: Icon, title, state, live }) => <div key={title} className={`flex items-center justify-between rounded-2xl border p-4 ${live ? "border-[#d9b66f]/30 bg-[#d9b66f]/[0.07]" : "border-white/10 bg-white/[0.025]"}`}><div className="flex items-center gap-3"><div className="grid h-10 w-10 place-items-center rounded-xl bg-black"><Icon className="h-4 w-4 text-[#e8c87e]" /></div><div><div className="font-black">{title}</div><div className="mt-0.5 text-xs text-zinc-500">{state}</div></div></div>{live ? <CheckCircle2 className="h-5 w-5 text-[#e8c87e]" /> : <span className="text-[10px] font-black uppercase tracking-[0.12em] text-zinc-500">Your approval</span>}</div>)}
            </div>
          </div>
          <div className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-black shadow-2xl"><MediaFallback videoSrc={HOMEPAGE_MEDIA.kingcamTrailerProof.livePath} posterSrc={HOMEPAGE_MEDIA.kingcamTrailerProof.fallbackAsset} alt="KingCam prepared campaign trailer" className="aspect-[4/5]" objectFit="contain" /><div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black via-black/80 to-transparent p-7 pt-28"><div className="text-[10px] font-black uppercase tracking-[0.2em] text-[#d9b66f]">Ready to move</div><div className="mt-2 text-xl font-black">Your best work is already your strongest first post.</div></div></div>
        </div>
      </section>

      <section className="relative overflow-hidden bg-[#ece5d8] text-[#17120d]">
        <div className="absolute -right-24 -top-28 h-96 w-96 rounded-full bg-[#d9b66f]/35 blur-3xl" />
        <div className="relative mx-auto flex max-w-7xl flex-col items-start justify-between gap-8 px-5 py-16 sm:px-8 sm:py-24 lg:flex-row lg:items-end lg:px-12">
          <div className="max-w-3xl"><div className="text-xs font-black uppercase tracking-[0.24em] text-[#765b2f]">Your next move</div><h2 className="mt-4 text-4xl font-black leading-[0.92] tracking-[-0.06em] sm:text-6xl">Make your next piece of content feel expensive.</h2><p className="mt-5 max-w-xl text-base leading-relaxed text-[#504433] sm:text-lg">Bring your media into the vault, choose the treatment, and build the kind of release people remember.</p></div>
          <div className="flex flex-col gap-3 sm:flex-row"><Link href="/signup"><a className="inline-flex min-h-14 items-center justify-center gap-2 rounded-full bg-[#17120d] px-7 font-black text-white transition hover:bg-[#3b2b16]">Create your vault <ArrowUpRight className="h-4 w-4" /></a></Link><Link href={CreatorVaultRoute.creatorOS}><a className="inline-flex min-h-14 items-center justify-center rounded-full border border-[#17120d]/25 px-7 font-black transition hover:bg-black/5">Sign in</a></Link></div>
        </div>
      </section>
    </main>
  );
}
