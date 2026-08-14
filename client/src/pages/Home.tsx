import { ArrowUpRight, Play, Sparkles } from "lucide-react";
import { Link } from "wouter";
import { CreatorVaultRoute } from "@/lib/productArchitecture";
import { HOMEPAGE_PUBLIC_SHOWCASE_SEQUENCE, type HomepageMediaAsset } from "@/lib/homepageMediaRegistry";
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
  posterSrc: string;
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

function certifiedMotion(assetId: string): HomepageMediaAsset {
  const asset = HOMEPAGE_PUBLIC_SHOWCASE_SEQUENCE.find((candidate) => candidate.assetId === assetId);
  if (!asset) throw new Error(`CreatorVault homepage requires an accepted public motion asset: ${assetId}`);
  return asset;
}

export default function Home() {
  const kingcamHero = certifiedMotion("kingcam-hero-cam");
  const creatorMotion = certifiedMotion("homepage-motion-pilot-78");

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

      <section className="relative isolate overflow-hidden bg-[#080706]" aria-label="CreatorVault creation experience">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_40%,rgba(121,82,37,.2),transparent_46%)]" />
        <div className="relative mx-auto max-w-7xl px-5 sm:px-8 lg:px-12">
          <div className="relative min-h-[92svh] overflow-hidden border-x border-white/10">
            <video
              src={creatorMotion.livePath}
              autoPlay
              loop
              muted
              playsInline
              preload="metadata"
              className="absolute inset-0 h-full w-full object-contain object-center"
              aria-label="CreatorVault certified female creator campaign motion"
            />
            <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(8,7,6,.94)_0%,rgba(8,7,6,.46)_36%,rgba(8,7,6,.12)_55%,rgba(8,7,6,.78)_100%)]" />
            <div className="absolute inset-x-0 top-0 h-44 bg-[linear-gradient(180deg,#080706,transparent)]" />
            <div className="absolute inset-x-0 bottom-0 h-56 bg-[linear-gradient(0deg,#080706,transparent)]" />

            <div className="relative z-10 flex min-h-[92svh] flex-col justify-between px-6 py-8 sm:px-10 sm:py-12 lg:px-14 lg:py-16">
              <div className="max-w-xl">
                <p className="text-[10px] font-black uppercase tracking-[.28em] text-[#efd18c] sm:text-xs">CreatorVault in motion</p>
                <h2 className="mt-5 text-5xl font-black leading-[.83] tracking-[-.075em] sm:text-7xl lg:text-[5.3rem]">Make them<br /><span className="text-[#f3d899]">feel it</span><br />before you say it.</h2>
                <p className="mt-7 max-w-md text-base leading-relaxed text-zinc-200 sm:text-lg">Your strongest moment should not get buried in somebody else&apos;s feed. Shape it. Package it. Let the release do the talking.</p>
              </div>

              <div className="grid border-t border-white/25 lg:grid-cols-3">
                <Link href="/vault-x/studio"><a className="group border-b border-white/15 py-6 transition hover:bg-white/5 lg:border-b-0 lg:border-r lg:px-6 lg:first:pl-0"><p className="text-[10px] font-black uppercase tracking-[.22em] text-[#efd18c]">01 / Body Cinema</p><p className="mt-3 text-2xl font-black leading-tight">Turn the moment into a drop.</p><span className="mt-5 inline-flex items-center gap-2 text-sm font-black text-[#f3d899]">Open the studio <ArrowUpRight className="h-4 w-4 transition group-hover:translate-x-1 group-hover:-translate-y-1" /></span></a></Link>
                <Link href="/creator/video-studio"><a className="group border-b border-white/15 py-6 transition hover:bg-white/5 lg:border-b-0 lg:border-r lg:px-6"><p className="text-[10px] font-black uppercase tracking-[.22em] text-[#efd18c]">02 / Creator Video Studio</p><p className="mt-3 text-2xl font-black leading-tight">Build the cut around the heat.</p><span className="mt-5 inline-flex items-center gap-2 text-sm font-black text-[#f3d899]">Start creating <ArrowUpRight className="h-4 w-4 transition group-hover:translate-x-1 group-hover:-translate-y-1" /></span></a></Link>
                <Link href="/social"><a className="group py-6 transition hover:bg-white/5 lg:pl-6"><p className="text-[10px] font-black uppercase tracking-[.22em] text-[#efd18c]">03 / Social Empire</p><p className="mt-3 text-2xl font-black leading-tight">Carry the feeling farther.</p><span className="mt-5 inline-flex items-center gap-2 text-sm font-black text-[#f3d899]">Move with purpose <ArrowUpRight className="h-4 w-4 transition group-hover:translate-x-1 group-hover:-translate-y-1" /></span></a></Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="border-t border-white/10 bg-[#0b0908]">
        <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-8 px-5 py-12 sm:px-8 sm:py-16 lg:flex-row lg:items-end lg:px-12">
          <div className="max-w-3xl"><p className="text-xs font-black uppercase tracking-[.24em] text-[#e8c87e]">Your next release starts here</p><h2 className="mt-4 text-4xl font-black leading-[.9] tracking-[-.06em] sm:text-6xl">Bring what&apos;s yours. Make it impossible to ignore.</h2></div>
          <div className="flex flex-col gap-3 sm:flex-row"><Link href="/signup"><a className="inline-flex min-h-14 items-center justify-center gap-2 rounded-full bg-[#f3d899] px-7 font-black text-[#19130c] transition hover:bg-white">Start your vault <ArrowUpRight className="h-4 w-4" /></a></Link><Link href="/king/content"><a className="inline-flex min-h-14 items-center justify-center rounded-full border border-white/25 px-7 font-black text-white transition hover:bg-white/10">KingCam&apos;s creation room</a></Link></div>
        </div>
      </section>
    </main>
  );
}
