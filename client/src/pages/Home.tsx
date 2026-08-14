import { ArrowUpRight, CheckCircle2, Play, Send, Sparkles, WandSparkles } from "lucide-react";
import { Link } from "wouter";
import { CreatorVaultRoute } from "@/lib/productArchitecture";
import { HOMEPAGE_MEDIA, hasCertifiedPublicProof, type HomepageMediaAsset } from "@/lib/homepageMediaRegistry";
import { type CSSProperties } from "react";

function ShowcaseMotion({
  videoSrc,
  posterSrc,
  alt,
  className = "",
  style = {},
  priority = false,
}: {
  videoSrc: string;
  posterSrc?: string;
  alt: string;
  className?: string;
  style?: CSSProperties;
  priority?: boolean;
}) {
  return (
    <div className={`overflow-hidden bg-[#090806] ${className}`} style={style} aria-label={alt}>
      <video
        src={videoSrc}
        poster={posterSrc || undefined}
        autoPlay
        loop
        muted
        playsInline
        preload={priority ? "auto" : "metadata"}
        className="absolute inset-0 h-full w-full object-cover"
        aria-hidden="true"
      />
    </div>
  );
}

function acceptedProof(assetId: string): HomepageMediaAsset {
  const asset = Object.values(HOMEPAGE_MEDIA).find((candidate) => candidate.assetId === assetId);
  if (!asset || !hasCertifiedPublicProof(asset)) {
    throw new Error(`CreatorVault homepage requires an accepted public proof asset: ${assetId}`);
  }
  return asset;
}

function approvedSourceReference(assetId: string): HomepageMediaAsset {
  const asset = Object.values(HOMEPAGE_MEDIA).find((candidate) => candidate.assetId === assetId);
  if (!asset || asset.publicSafeStatus !== "approved" || asset.workingStatus !== "ready" || asset.mediaKind !== "motion") {
    throw new Error(`CreatorVault homepage requires an approved source reference: ${assetId}`);
  }
  return asset;
}

function ProofLabel({ children }: { children: React.ReactNode }) {
  return <p className="text-[10px] font-black uppercase tracking-[.25em] text-[#f3d899] sm:text-xs">{children}</p>;
}

export default function Home() {
  const kingcamHero = acceptedProof("kingcam-hero-cam");
  const campaignMotion = acceptedProof("homepage-motion-pilot-78");
  const campaignSource = approvedSourceReference("creatorvault-demo-luxury-gold-room-1080");
  const campaignVisual = acceptedProof("creatorvault-campaign-visual-80");
  const motionFlyer = acceptedProof("creatorvault-motion-flyer-b73098d7");

  return (
    <main className="min-h-screen overflow-hidden bg-[#080706] text-white selection:bg-[#f0d18a]/40">
      <section className="relative isolate min-h-[100svh] overflow-hidden border-b border-white/10" aria-label="CreatorVault showcase hero">
        <ShowcaseMotion videoSrc={kingcamHero.livePath} posterSrc={kingcamHero.fallbackAsset} alt="KingCam Clone moving identity backdrop" className="absolute inset-0" priority />
        <div className="pointer-events-none absolute inset-0 flex items-end justify-center overflow-hidden sm:justify-end">
          <video src={kingcamHero.livePath} poster={kingcamHero.fallbackAsset || undefined} autoPlay loop muted playsInline preload="auto" className="h-full w-full max-w-full object-contain object-bottom sm:w-auto" aria-label="KingCam Clone full-body moving identity hero" />
        </div>
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(5,4,3,.18)_0%,rgba(5,4,3,.04)_30%,rgba(5,4,3,.72)_88%,#080706_100%)]" />
        <div className="absolute inset-y-0 left-0 w-full bg-[radial-gradient(circle_at_16%_52%,rgba(0,0,0,.28),transparent_42%)]" />

        <div className="relative z-10 mx-auto flex min-h-[100svh] max-w-7xl flex-col px-5 pb-7 pt-6 sm:px-8 sm:pt-8 lg:px-12">
          <header className="flex items-center justify-between">
            <img src="/logo-white.png" alt="CreatorVault" className="h-7 sm:h-9" />
            <Link href={CreatorVaultRoute.creatorOS}><a className="rounded-full border border-white/20 bg-black/30 px-4 py-2 text-[10px] font-black uppercase tracking-[0.16em] text-white backdrop-blur-md transition hover:bg-white hover:text-black sm:text-xs">Enter your world</a></Link>
          </header>

          <div className="mt-auto max-w-3xl pb-10 pt-40 sm:pb-14 lg:my-auto lg:py-28">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-[#efd18c]/45 bg-black/35 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.2em] text-[#f7dfa6] backdrop-blur-md"><Sparkles className="h-3.5 w-3.5" /> A new way to make the moment hit</div>
            <h1 className="max-w-3xl text-5xl font-black leading-[0.84] tracking-[-0.075em] sm:text-7xl lg:text-[5.8rem]">Don&apos;t post<br /><span className="text-[#f3d899]">content.</span><br />Drop a feeling.</h1>
            <p className="mt-6 max-w-xl text-base leading-relaxed text-zinc-100 sm:text-lg">CreatorVault takes the media you already own and helps you shape it into the kind of release people pause for, remember, and want more of.</p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link href="/signup"><a className="inline-flex min-h-14 items-center justify-center gap-2 rounded-full bg-[#f6ead5] px-7 font-black text-[#181109] transition hover:bg-white">Start your vault <ArrowUpRight className="h-4 w-4" /></a></Link>
              <Link href="/vault-x/studio"><a className="inline-flex min-h-14 items-center justify-center gap-2 rounded-full border border-white/30 bg-black/30 px-7 font-black text-white backdrop-blur transition hover:bg-white/10">Build in Body Cinema <Play className="h-4 w-4 fill-current" /></a></Link>
            </div>
          </div>

          <div className="grid gap-3 border-t border-white/15 pt-4 text-[10px] font-black uppercase tracking-[0.16em] text-zinc-200 sm:grid-cols-3 sm:text-xs"><span>Real moving media</span><span className="sm:text-center">Full-body cinematic direction</span><span className="sm:text-right">Made inside CreatorVault</span></div>
        </div>
      </section>

      <section className="relative isolate overflow-hidden border-b border-white/10 bg-[#0b0908]" aria-label="Thumbnail transformation proof">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_22%,rgba(217,169,71,.18),transparent_32%),radial-gradient(circle_at_84%_72%,rgba(124,69,206,.16),transparent_34%)]" />
        <div className="relative mx-auto max-w-7xl px-5 py-14 sm:px-8 sm:py-20 lg:px-12 lg:py-24">
          <div className="mb-10 flex max-w-3xl flex-col gap-4 lg:mb-14">
            <ProofLabel>01 / The thumbnail changes the room</ProofLabel>
            <h2 className="text-4xl font-black leading-[.88] tracking-[-.065em] sm:text-6xl lg:text-7xl">The moment you own.<br /><span className="text-[#f3d899]">The frame they cannot pass.</span></h2>
            <p className="max-w-2xl text-base leading-relaxed text-zinc-300 sm:text-lg">Not a stock replacement. A real CreatorVault source becomes an accepted campaign visual that stays ready in the Media Vault.</p>
          </div>

          <div className="grid gap-5 lg:grid-cols-[1fr_auto_1fr] lg:items-stretch">
            <div className="relative min-h-[28rem] overflow-hidden rounded-[2rem] border border-white/15 bg-black sm:min-h-[36rem]">
              <ShowcaseMotion videoSrc={campaignSource.livePath} posterSrc={campaignSource.fallbackAsset} alt="Certified CreatorVault source motion" className="absolute inset-0" />
              <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(5,5,5,.08),rgba(5,5,5,.75))]" />
              <div className="absolute inset-x-0 bottom-0 p-6 sm:p-8"><ProofLabel>Before / Certified vault moment</ProofLabel><p className="mt-3 max-w-xs text-2xl font-black leading-tight">A real clip, still carrying the raw moment.</p></div>
            </div>

            <div className="relative z-10 mx-auto grid h-16 w-16 shrink-0 place-items-center self-center rounded-full border border-[#f3d899]/55 bg-[#14100b] text-[#f3d899] shadow-[0_0_45px_rgba(243,216,153,.28)] lg:h-20 lg:w-20"><WandSparkles className="h-7 w-7 lg:h-8 lg:w-8" /></div>

            <div className="relative min-h-[28rem] overflow-hidden rounded-[2rem] border border-[#f3d899]/45 bg-[#13100c] p-2 shadow-[0_35px_100px_-55px_rgba(243,216,153,.65)] sm:min-h-[36rem]">
              <div className="absolute inset-0 animate-pulse bg-[radial-gradient(circle_at_70%_18%,rgba(243,216,153,.22),transparent_35%)]" />
              <img src={campaignVisual.livePath} alt="Accepted CreatorVault campaign visual from the certified source" className="relative h-full w-full rounded-[1.55rem] object-cover" />
              <div className="absolute inset-x-2 bottom-2 rounded-b-[1.55rem] bg-[linear-gradient(180deg,transparent,rgba(4,4,4,.88))] p-6 sm:p-8"><div className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-[#f3d899]" /><ProofLabel>After / Accepted campaign visual</ProofLabel></div><p className="mt-3 max-w-xs text-2xl font-black leading-tight">The same source, now built to stop the scroll.</p></div>
            </div>
          </div>

          <div className="mt-7 flex flex-col justify-between gap-4 border-t border-white/10 pt-6 sm:flex-row sm:items-center"><p className="max-w-2xl text-sm leading-relaxed text-zinc-400">This visual was created through CreatorVault&apos;s one-output governed campaign path, then accepted and stored as a reusable asset.</p><Link href="/king/campaign-visuals"><a className="inline-flex items-center gap-2 text-sm font-black text-[#f3d899] hover:text-white">Open Campaign Visual Studio <ArrowUpRight className="h-4 w-4" /></a></Link></div>
        </div>
      </section>

      <section className="relative isolate overflow-hidden border-b border-white/10 bg-[#070706]" aria-label="Kinetic text on moving media">
        <ShowcaseMotion videoSrc={campaignMotion.livePath} alt="Certified CreatorVault campaign motion with live typography" className="absolute inset-0 opacity-75" />
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(7,7,6,.94),rgba(7,7,6,.25)_52%,rgba(7,7,6,.88))]" />
        <div className="relative mx-auto flex min-h-[88svh] max-w-7xl items-end px-5 py-14 sm:px-8 sm:py-20 lg:items-center lg:px-12">
          <div className="max-w-4xl">
            <ProofLabel>02 / Words inside the moment</ProofLabel>
            <div className="mt-7 overflow-hidden"><p className="text-5xl font-black leading-[.82] tracking-[-.08em] text-white sm:text-7xl lg:text-[6.8rem]"><span className="block animate-[pulse_2.8s_ease-in-out_infinite]">SAY LESS.</span><span className="mt-2 block text-[#f3d899]">MAKE IT LAND.</span></p></div>
            <p className="mt-8 max-w-xl text-base leading-relaxed text-zinc-200 sm:text-lg">Typography should stay on the moving media, hold the safe space, and make the message hit before the viewer can move on.</p>
            <div className="mt-10 flex flex-wrap gap-3"><span className="rounded-full border border-white/20 bg-black/35 px-4 py-2 text-xs font-black uppercase tracking-[.16em] text-white backdrop-blur">Built for the mobile frame</span><span className="rounded-full border border-[#f3d899]/45 bg-[#f3d899]/10 px-4 py-2 text-xs font-black uppercase tracking-[.16em] text-[#f3d899] backdrop-blur">Text lives on the motion</span></div>
          </div>
        </div>
      </section>

      <section className="relative isolate overflow-hidden border-b border-white/10 bg-[#0b0908]" aria-label="Motion Flyer proof">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_85%_35%,rgba(235,36,154,.18),transparent_32%),radial-gradient(circle_at_15%_70%,rgba(34,211,238,.12),transparent_35%)]" />
        <div className="relative mx-auto grid min-h-[94svh] max-w-7xl gap-10 px-5 py-14 sm:px-8 sm:py-20 lg:grid-cols-[.9fr_1.1fr] lg:items-center lg:px-12">
          <div className="max-w-xl"><ProofLabel>03 / Motion Flyer</ProofLabel><h2 className="mt-5 text-5xl font-black leading-[.84] tracking-[-.075em] sm:text-7xl">Not an image with words.<br /><span className="text-[#f3d899]">A visual that moves.</span></h2><p className="mt-7 text-base leading-relaxed text-zinc-300 sm:text-lg">This is a real six-second CreatorVault Motion Flyer—rendered, saved, and ready to use. No fake design board. No text-only result.</p><Link href="/agents/motion-flyer-agent"><a className="mt-8 inline-flex min-h-14 items-center gap-2 rounded-full bg-[#f3d899] px-7 font-black text-[#181109] transition hover:bg-white">Make a Motion Flyer <ArrowUpRight className="h-4 w-4" /></a></Link></div>
          <div className="relative mx-auto w-full max-w-[31rem] overflow-hidden rounded-[2.2rem] border border-white/15 bg-black p-2 shadow-[0_40px_110px_-60px_rgba(235,36,154,.7)]"><div className="absolute -inset-16 bg-[conic-gradient(from_180deg,transparent,rgba(235,36,154,.28),transparent,rgba(34,211,238,.22),transparent)] blur-3xl" /><video src={motionFlyer.livePath} autoPlay loop muted playsInline preload="metadata" className="relative aspect-[9/14] w-full rounded-[1.8rem] object-cover" aria-label="Accepted CreatorVault Motion Flyer" /><div className="pointer-events-none absolute inset-x-2 bottom-2 rounded-b-[1.8rem] bg-[linear-gradient(180deg,transparent,rgba(0,0,0,.85))] p-5"><ProofLabel>Accepted CreatorVault output</ProofLabel></div></div>
        </div>
      </section>

      <section className="relative isolate overflow-hidden border-b border-white/10 bg-[#07070a]" aria-label="Social Empire proof">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_18%,rgba(217,70,239,.18),transparent_32%),radial-gradient(circle_at_82%_78%,rgba(34,211,238,.14),transparent_34%)]" />
        <div className="relative mx-auto max-w-7xl px-5 py-14 sm:px-8 sm:py-20 lg:px-12">
          <div className="max-w-3xl"><ProofLabel>04 / Social Empire</ProofLabel><h2 className="mt-5 text-5xl font-black leading-[.84] tracking-[-.075em] sm:text-7xl">One drop.<br /><span className="bg-gradient-to-r from-fuchsia-300 via-violet-200 to-cyan-200 bg-clip-text text-transparent">A whole world ready to move.</span></h2><p className="mt-7 max-w-2xl text-base leading-relaxed text-zinc-300 sm:text-lg">Take one video you already own. Build the CreatorVault post. Prepare the platform packages. You control what leaves the vault and when.</p></div>

          <div className="mt-12 grid gap-4 lg:grid-cols-[1.1fr_auto_1fr] lg:items-center">
            <div className="overflow-hidden rounded-[1.75rem] border border-white/10 bg-[#101015]"><div className="relative aspect-[16/10] bg-black"><video src={motionFlyer.livePath} autoPlay loop muted playsInline preload="metadata" className="h-full w-full object-cover" aria-label="Owned motion flyer ready to package" /><div className="absolute inset-0 bg-[linear-gradient(180deg,transparent,rgba(0,0,0,.84))]" /><div className="absolute bottom-0 p-5"><p className="text-[10px] font-black uppercase tracking-[.2em] text-fuchsia-200">Your owned moving drop</p><p className="mt-2 text-xl font-black">Choose the exact media you want to carry.</p></div></div></div>
            <div className="mx-auto flex items-center gap-2 text-fuchsia-300 lg:flex-col"><span className="h-px w-10 bg-fuchsia-300/60 lg:h-10 lg:w-px" /><Send className="h-6 w-6" /><span className="h-px w-10 bg-cyan-300/60 lg:h-10 lg:w-px" /></div>
            <div className="grid gap-3 sm:grid-cols-2"><div className="rounded-2xl border border-fuchsia-300/25 bg-fuchsia-400/5 p-5"><p className="text-[10px] font-black uppercase tracking-[.18em] text-fuchsia-200">CreatorVault post</p><p className="mt-3 text-xl font-black">Your home post is built from the real source.</p></div><div className="rounded-2xl border border-cyan-300/25 bg-cyan-400/5 p-5"><p className="text-[10px] font-black uppercase tracking-[.18em] text-cyan-200">Packages ready for review</p><p className="mt-3 text-xl font-black">Your outside-platform versions wait for your say-so.</p></div><div className="sm:col-span-2 rounded-2xl border border-amber-300/20 bg-amber-300/5 p-5"><p className="text-sm leading-relaxed text-amber-100/85">Nothing publishes, messages, schedules, or claims outside-platform results without your approval.</p></div></div>
          </div>

          <div className="mt-8 flex justify-end"><Link href="/social"><a className="inline-flex min-h-14 items-center gap-2 rounded-full border border-white/25 bg-white/5 px-7 font-black text-white transition hover:bg-white hover:text-black">Open Social Empire <ArrowUpRight className="h-4 w-4" /></a></Link></div>
        </div>
      </section>

      <section className="bg-[#0b0908]">
        <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-8 px-5 py-14 sm:px-8 sm:py-20 lg:flex-row lg:items-end lg:px-12">
          <div className="max-w-3xl"><ProofLabel>Your next release starts here</ProofLabel><h2 className="mt-4 text-4xl font-black leading-[.9] tracking-[-.06em] sm:text-6xl">Bring what&apos;s yours. Make it impossible to ignore.</h2></div>
          <div className="flex flex-col gap-3 sm:flex-row"><Link href="/signup"><a className="inline-flex min-h-14 items-center justify-center gap-2 rounded-full bg-[#f3d899] px-7 font-black text-[#19130c] transition hover:bg-white">Start your vault <ArrowUpRight className="h-4 w-4" /></a></Link><Link href="/king/content"><a className="inline-flex min-h-14 items-center justify-center rounded-full border border-white/25 px-7 font-black text-white transition hover:bg-white/10">KingCam&apos;s creation room</a></Link></div>
        </div>
      </section>
    </main>
  );
}
