import { Link } from "wouter";
import { ArrowUpRight, Crown, Radio, Wand2, ShieldCheck, TrendingUp, Users, LockKeyhole, CheckCircle2, Play, Send, BadgeCheck, Wallet } from "lucide-react";
import { CreatorVaultRoute } from "@/lib/productArchitecture";
import { HOMEPAGE_MEDIA, MEDIA_FALLBACKS } from "@/lib/homepageMediaRegistry";
import { useState, type CSSProperties } from "react";

function MediaFallback({
  videoSrc,
  posterSrc,
  alt,
  className = "",
  style = {},
  objectFit = "cover"
}: {
  videoSrc: string;
  posterSrc: string;
  alt: string;
  className?: string;
  style?: CSSProperties;
  objectFit?: "cover" | "contain";
}) {
  const [error, setError] = useState(false);
  const [loaded, setLoaded] = useState(false);

  return (
    <div className={`relative overflow-hidden bg-black ${className}`} style={style} aria-label={alt}>
      <img
        src={posterSrc}
        alt={alt}
        className={`absolute inset-0 h-full w-full transition-opacity duration-700 ${loaded && !error ? "opacity-0" : "opacity-100"}`}
        style={{ objectFit }}
      />
      {!error && (
        <video
          src={videoSrc}
          autoPlay
          loop
          muted
          playsInline
          preload="metadata"
          onCanPlay={() => setLoaded(true)}
          onError={() => setError(true)}
          className={`absolute inset-0 h-full w-full transition-opacity duration-700 ${loaded ? "opacity-100" : "opacity-0"}`}
          style={{ objectFit }}
          aria-hidden="true"
        />
      )}
    </div>
  );
}

const creatorBenefits = [
  {
    number: "01",
    title: "Control your drops",
    copy: "Turn your media into premium unlocks, VIP subscriptions, and private storefronts without giving up ownership.",
    icon: Crown,
  },
  {
    number: "02",
    title: "Upgrade your visuals",
    copy: "Apply high-end cinematic treatments to your existing videos so every release earns a premium.",
    icon: Wand2,
  },
  {
    number: "03",
    title: "Own your audience",
    copy: "Manage your Telegram, social channels, and private community from one place.",
    icon: Radio,
  },
];

export default function Home() {
  return (
    <main className="min-h-screen overflow-hidden bg-[#090909] text-white selection:bg-white/30">
      {/* 1. HERO: KINGCAM FOUNDER MOTION */}
      <section className="relative isolate min-h-[100svh] overflow-hidden bg-black" aria-label="KingCam creator hero">
        <MediaFallback
          videoSrc={HOMEPAGE_MEDIA.kingcamHero.livePath}
          posterSrc={MEDIA_FALLBACKS.kingcamHero}
          alt="KingCam creator hero background"
          className="absolute inset-0 h-full w-full scale-110 opacity-30 blur-2xl"
        />
        <div className="absolute inset-0 bg-black/25" />
        <MediaFallback
          videoSrc={HOMEPAGE_MEDIA.kingcamHero.livePath}
          posterSrc={MEDIA_FALLBACKS.kingcamHero}
          alt="KingCam creator hero video"
          className="absolute inset-0 h-full w-full"
          objectFit="contain"
        />

        {/* BRANDING: CLEAR CREATORVAULT MASTER BRAND */}
        <div className="absolute left-5 top-6 z-10 sm:left-8 sm:top-8">
          <img src="/logo-white.png" alt="CreatorVault" className="h-7 sm:h-9" />
        </div>

        {/* PRIMARY CTA: ONE CLEAR ACTION */}
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black via-black/80 to-transparent pb-10 pt-32">
          <div className="mx-auto max-w-7xl px-5 text-center sm:px-8">
            <h1 className="text-5xl font-black leading-[0.92] tracking-[-0.06em] sm:text-7xl">Your Content.<br />Your Empire.</h1>
            <p className="mx-auto mt-5 max-w-xl text-base text-zinc-300 sm:text-lg">The private platform for creators who want to turn their media into high-end drops, control their distribution, and keep the money they earn.</p>
            <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Link href="/signup">
                <a className="inline-flex min-h-14 items-center justify-center gap-2 rounded-full bg-white px-8 font-black text-black transition hover:bg-zinc-200">
                  Create Your Vault <ArrowUpRight className="h-4 w-4" />
                </a>
              </Link>
              <div className="flex items-center gap-4">
                <Link href={CreatorVaultRoute.creatorOS}><a className="px-4 py-2 text-sm font-bold text-zinc-400 transition hover:text-white">Sign In</a></Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. WOMEN CREATORS: ARSENAL SHOWCASE */}
      <section className="relative overflow-hidden border-t border-white/10 bg-black">
        <div className="mx-auto grid max-w-7xl gap-10 px-5 py-16 sm:px-8 lg:grid-cols-[1fr_1.2fr] lg:items-center lg:py-24">
          <div>
            <div className="text-xs font-black uppercase tracking-[0.22em] text-zinc-500">Creation Arsenal</div>
            <h2 className="mt-4 text-4xl font-black tracking-[-0.05em] sm:text-5xl">One source video.<br />An entire business.</h2>
            <p className="mt-6 text-base leading-relaxed text-zinc-400 sm:text-lg">Stop juggling five different apps to sell one video. CreatorVault takes a single clip and equips you with cinematic treatments, social teasers, vertical shorts, and premium PPV drops—all from one private workspace.</p>

            <div className="mt-10 space-y-6">
              {creatorBenefits.map((benefit) => {
                const Icon = benefit.icon;
                return (
                  <div key={benefit.number} className="flex gap-4">
                    <div className="mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/10 text-white"><Icon className="h-5 w-5" /></div>
                    <div>
                      <h3 className="text-lg font-black">{benefit.title}</h3>
                      <p className="mt-1 text-sm text-zinc-400">{benefit.copy}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="relative grid grid-cols-2 gap-4 sm:gap-6">
            <div className="space-y-4 sm:space-y-6 pt-12">
              <figure className="overflow-hidden rounded-[2rem] border border-white/10 bg-zinc-900 shadow-2xl">
                <MediaFallback videoSrc={HOMEPAGE_MEDIA.womenCreatorMotion.livePath} posterSrc={MEDIA_FALLBACKS.womenCreatorMotion} alt="Creator OS dashboard" className="aspect-[4/5]" />
                <figcaption className="bg-black/50 p-4 text-center text-[10px] font-black uppercase tracking-[0.15em] text-zinc-400 backdrop-blur">Creator OS View</figcaption>
              </figure>
              <figure className="overflow-hidden rounded-[2rem] border border-white/10 bg-zinc-900 shadow-2xl">
                <img src="/images/reel/reel-apparel-drop.png" alt="Apparel drop" className="aspect-[4/5] w-full object-cover" />
                <figcaption className="bg-black/50 p-4 text-center text-[10px] font-black uppercase tracking-[0.15em] text-zinc-400 backdrop-blur">Product Output</figcaption>
              </figure>
            </div>
            <div className="space-y-4 sm:space-y-6">
              <figure className="overflow-hidden rounded-[2rem] border border-white/10 bg-zinc-900 shadow-2xl">
                <MediaFallback videoSrc={HOMEPAGE_MEDIA.womenCreatorAudienceMotion.livePath} posterSrc={MEDIA_FALLBACKS.womenCreatorAudienceMotion} alt="Marketplace audience view" className="aspect-[4/5]" />
                <figcaption className="bg-black/50 p-4 text-center text-[10px] font-black uppercase tracking-[0.15em] text-zinc-400 backdrop-blur">Audience View</figcaption>
              </figure>
              <figure className="overflow-hidden rounded-[2rem] border border-white/10 bg-zinc-900 shadow-2xl">
                <img src="/images/reel/reel-cinematic-trailer.png" alt="Cinematic trailer" className="aspect-[4/5] w-full object-cover" />
                <figcaption className="bg-black/50 p-4 text-center text-[10px] font-black uppercase tracking-[0.15em] text-zinc-400 backdrop-blur">Trailer Output</figcaption>
              </figure>
            </div>
          </div>
        </div>
      </section>

      {/* 3. BODY CINEMA: TRUTHFUL SOURCE TO OUTPUT */}
      <section className="border-t border-white/10 bg-[#090909]">
        <div className="mx-auto max-w-7xl px-5 py-16 sm:px-8 lg:px-12 lg:py-24">
          <div className="text-center">
            <div className="text-xs font-black uppercase tracking-[0.22em] text-zinc-500">CreatorVault Studio</div>
            <h2 className="mt-4 text-4xl font-black tracking-[-0.05em] sm:text-5xl">One source.<br />A finished campaign story.</h2>
            <p className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-zinc-400 sm:text-lg">The source and founder trailer below are documented CreatorVault-native campaign media. Body Cinema remains available inside VaultX for creator-owned work.</p>
          </div>

          <div className="mt-16 grid gap-6 lg:grid-cols-[1fr_1.5fr]">
            <figure className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-black">
              <div className="absolute inset-x-4 top-4 z-10 flex items-center gap-2">
                <span className="rounded-full bg-white/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-white backdrop-blur-md">Source Video</span>
              </div>
              <MediaFallback videoSrc={HOMEPAGE_MEDIA.kingcamCampaignSource.livePath} posterSrc={MEDIA_FALLBACKS.kingcamCampaignSource} alt="Raw source video" className="aspect-[4/5] w-full" />
            </figure>
            <figure className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-black">
              <div className="absolute inset-x-4 top-4 z-10 flex items-center justify-between gap-2">
                <span className="rounded-full bg-white/15 px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-white backdrop-blur-md">Campaign Trailer</span>
                <span className="rounded-full bg-black/40 px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-zinc-300 backdrop-blur-md">CreatorVault Native</span>
              </div>
              <MediaFallback videoSrc={HOMEPAGE_MEDIA.kingcamPlatformTrailer.livePath} posterSrc={MEDIA_FALLBACKS.kingcamPlatformTrailer} alt="CreatorVault native campaign trailer" className="aspect-[4/5] w-full lg:aspect-auto lg:h-full" />
            </figure>
          </div>
        </div>
      </section>

      {/* 4. VAULTX: REVENUE LOOP VISUAL */}
      <section className="border-t border-white/10 bg-black">
        <div className="mx-auto grid max-w-7xl gap-10 px-5 py-16 sm:px-8 lg:grid-cols-[1.2fr_1fr] lg:items-center lg:py-24">
          <figure className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-zinc-900 shadow-2xl">
            <MediaFallback videoSrc={HOMEPAGE_MEDIA.vaultxRevenueVisual.livePath} posterSrc={MEDIA_FALLBACKS.vaultxRevenueVisual} alt="VaultX Revenue OS" className="aspect-[4/5] w-full" />
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black via-black/80 to-transparent p-6 pt-24 text-center">
              <div className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">VaultX Vertical</div>
            </div>
          </figure>

          <div>
            <div className="text-xs font-black uppercase tracking-[0.22em] text-zinc-500">Revenue OS</div>
            <h2 className="mt-4 text-4xl font-black tracking-[-0.05em] sm:text-5xl">Keep the money path visible.</h2>
            <p className="mt-6 text-base leading-relaxed text-zinc-400 sm:text-lg">VaultX attaches your offers, PPV unlocks, and subscriptions directly to your content. Earnings appear when real transactions happen—no hidden fees, no fake metrics.</p>

            <div className="mt-10 grid gap-4 sm:grid-cols-2">
              {[
                { icon: Wallet, label: "Direct payouts" },
                { icon: LockKeyhole, label: "PPV unlocks" },
                { icon: BadgeCheck, label: "VIP subscriptions" },
                { icon: TrendingUp, label: "Real attribution" },
              ].map((feature, i) => {
                const Icon = feature.icon;
                return (
                  <div key={i} className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-4">
                    <Icon className="h-5 w-5 text-zinc-300" />
                    <span className="text-sm font-bold">{feature.label}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* 5. SOCIAL EMPIRE: DISTRIBUTION AND AUDIENCE */}
      <section className="border-t border-white/10 bg-[#090909]">
        <div className="mx-auto grid max-w-7xl gap-10 px-5 py-16 sm:px-8 lg:grid-cols-[1fr_1fr] lg:items-center lg:py-24">
          <div className="order-2 lg:order-1">
            <div className="text-xs font-black uppercase tracking-[0.22em] text-zinc-500">Social Empire</div>
            <h2 className="mt-4 text-4xl font-black tracking-[-0.05em] sm:text-5xl">Publish once.<br />Grow everywhere.</h2>
            <p className="mt-6 text-base leading-relaxed text-zinc-400 sm:text-lg">Create once, then prepare a native post and platform-specific drafts. Nothing posts outside CreatorVault until you approve it.</p>

            <div className="mt-10 space-y-4">
              {[
                { platform: "CreatorVault", role: "Native post", icon: ShieldCheck, active: true, state: "Published internally" },
                { platform: "Instagram", role: "Vertical teaser", icon: Play, active: false, state: "Draft awaiting approval" },
                { platform: "TikTok", role: "Vertical teaser", icon: Send, active: false, state: "Draft awaiting approval" },
              ].map((channel, i) => {
                const Icon = channel.icon;
                return (
                  <div key={i} className={`flex items-center justify-between rounded-2xl border p-4 ${channel.active ? 'border-white/20 bg-white/5' : 'border-white/5 bg-transparent opacity-50'}`}>
                    <div className="flex items-center gap-3">
                      <div className="grid h-10 w-10 place-items-center rounded-xl bg-black"><Icon className="h-4 w-4" /></div>
                      <div>
                        <div className="text-sm font-black">{channel.platform}</div>
                        <div className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">{channel.role}</div>
                      </div>
                    </div>
                    {channel.active ? <CheckCircle2 className="h-5 w-5 text-emerald-400" /> : <div className="max-w-24 text-right text-[10px] font-bold uppercase tracking-wider text-zinc-600">{channel.state}</div>}
                  </div>
                );
              })}
            </div>
          </div>

          <figure className="relative order-1 overflow-hidden rounded-[2rem] border border-white/10 bg-zinc-900 shadow-2xl lg:order-2">
            <MediaFallback videoSrc={HOMEPAGE_MEDIA.womenCreatorAudienceMotion.livePath} posterSrc={MEDIA_FALLBACKS.womenCreatorAudienceMotion} alt="Creator audience visual" className="aspect-[4/5] w-full opacity-65" />
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/25 p-8 text-center">
              <Users className="h-12 w-12 text-white/70" />
              <div className="mt-6 text-xl font-black">Audience Control</div>
              <p className="mt-2 text-sm text-zinc-300">Fans, subscribers, and conversations connected to your content.</p>
            </div>
          </figure>
        </div>
      </section>

      <section className="border-t border-white/10 bg-black">
        <div className="mx-auto max-w-7xl px-5 py-16 sm:px-8 sm:py-24 lg:px-12">
          <div className="max-w-2xl">
            <div className="text-xs font-black uppercase tracking-[0.22em] text-zinc-500">Your next move</div>
            <h2 className="mt-4 text-4xl font-black tracking-[-0.05em] sm:text-5xl">Build the version of your business that pays you back.</h2>
            <Link href="/signup"><a className="mt-8 inline-flex min-h-14 items-center justify-center gap-2 rounded-full bg-white px-8 font-black text-black transition hover:bg-zinc-200">Create Your Vault <ArrowUpRight className="h-4 w-4" /></a></Link>
          </div>
        </div>
      </section>
    </main>
  );
}
