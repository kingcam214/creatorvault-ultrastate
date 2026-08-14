import { ArrowUpRight, Play, Sparkles } from "lucide-react";
import { Link } from "wouter";
import { CreatorVaultRoute } from "@/lib/productArchitecture";
import { HOMEPAGE_MEDIA_SEQUENCE, type HomepageMediaAsset } from "@/lib/homepageMediaRegistry";
import { type CSSProperties, type ReactNode } from "react";

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
        poster={posterSrc}
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

function MotionStage({
  asset,
  label,
  className = "",
  objectPosition = "object-center",
  children,
}: {
  asset: HomepageMediaAsset;
  label: string;
  className?: string;
  objectPosition?: string;
  children?: ReactNode;
}) {
  return (
    <div className={`relative isolate overflow-hidden bg-[#0b0908] ${className}`}>
      <video
        src={asset.livePath}
        poster={asset.fallbackAsset}
        autoPlay
        loop
        muted
        playsInline
        preload="metadata"
        className={`absolute inset-0 h-full w-full object-cover ${objectPosition}`}
        aria-label={label}
      />
      {children}
    </div>
  );
}

function certifiedMotion(assetId: string): HomepageMediaAsset {
  const asset = HOMEPAGE_MEDIA_SEQUENCE.find((candidate) => candidate.assetId === assetId);
  if (!asset) {
    throw new Error(`CreatorVault homepage requires certified motion asset: ${assetId}`);
  }
  return asset;
}

export default function Home() {
  const showcase = certifiedMotion("kingcam-hero-cam");
  const creatorAtWork = certifiedMotion("platform-dashboard-hero");
  const creatorAndAudience = certifiedMotion("platform-marketplace-hero");
  const vaultxVisual = certifiedMotion("vaultx-hero");
  const vaultxTrailer = certifiedMotion("vaultx-cinematic-trailer");
  const premiumUnlock = certifiedMotion("vaultx-final-drop");

  return (
    <main className="min-h-screen overflow-hidden bg-[#080706] text-white selection:bg-[#f0d18a]/40">
      <section className="relative isolate min-h-[100svh] overflow-hidden border-b border-white/10" aria-label="CreatorVault showcase hero">
        <ShowcaseMotion videoSrc={showcase.livePath} posterSrc={showcase.fallbackAsset} alt="KingCam Clone moving identity backdrop" className="absolute inset-0" priority />
        <div className="pointer-events-none absolute inset-0 flex items-end justify-center overflow-hidden sm:justify-end">
          <video src={showcase.livePath} poster={showcase.fallbackAsset} autoPlay loop muted playsInline preload="auto" className="h-full w-full max-w-full object-contain object-bottom sm:w-auto" aria-label="KingCam Clone full-body moving identity hero" />
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

      <section className="border-b border-white/10 bg-[#0d0b09]">
        <div className="mx-auto grid max-w-7xl gap-5 px-5 py-8 sm:px-8 sm:py-12 lg:grid-cols-[.92fr_1.08fr] lg:px-12">
          <MotionStage asset={creatorAtWork} label="CreatorVault creator-at-work motion" className="min-h-[34rem] sm:min-h-[42rem]" objectPosition="object-center">
            <div className="absolute inset-x-0 bottom-0 bg-[linear-gradient(180deg,transparent,rgba(5,4,3,.9))] p-6 sm:p-8"><p className="text-[10px] font-black uppercase tracking-[.22em] text-[#efd18c]">Creator in motion</p><p className="mt-3 max-w-sm text-xl font-black leading-tight">Your work should look alive before anyone reads a word.</p></div>
          </MotionStage>
          <div className="flex min-h-[34rem] flex-col justify-between bg-[#17110b] p-7 sm:min-h-[42rem] sm:p-10 lg:p-14">
            <div><p className="text-xs font-black uppercase tracking-[.25em] text-[#e8c87e]">The creation floor</p><h2 className="mt-5 max-w-2xl text-5xl font-black leading-[.86] tracking-[-.07em] sm:text-7xl">Your media already has a story. Give it a place to land.</h2><p className="mt-7 max-w-xl text-base leading-relaxed text-zinc-300 sm:text-lg">Bring in the moments you own. Build around the strongest one. Keep the visual, the offer, and the next move in the same world.</p></div>
            <div className="mt-10 border-t border-[#e8c87e]/25 pt-6"><Link href="/creator/video-studio"><a className="inline-flex min-h-14 items-center gap-3 rounded-full bg-[#f3d899] px-7 font-black text-[#1b1209] transition hover:bg-white">Open Creator Video Studio <ArrowUpRight className="h-4 w-4" /></a></Link></div>
          </div>
        </div>
      </section>

      <section className="border-b border-white/10 bg-[#080706]">
        <div className="mx-auto max-w-7xl px-5 py-16 sm:px-8 sm:py-24 lg:px-12">
          <div className="max-w-3xl"><p className="text-xs font-black uppercase tracking-[.25em] text-[#e8c87e]">One creation. More than one move.</p><h2 className="mt-4 text-4xl font-black leading-[.9] tracking-[-.06em] sm:text-6xl">The visual can be the invitation, the private moment, and the reason they come back.</h2></div>
          <div className="mt-10 grid gap-4 lg:grid-cols-[1.15fr_.85fr]">
            <MotionStage asset={vaultxTrailer} label="CreatorVault VaultX product walkthrough motion" className="min-h-[23rem] sm:min-h-[32rem]" objectPosition="object-center"><div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(5,4,3,.05),rgba(5,4,3,.78))]" /><div className="absolute inset-x-0 bottom-0 p-6 sm:p-9"><p className="text-[10px] font-black uppercase tracking-[.22em] text-[#efd18c]">VaultX in motion</p><p className="mt-3 max-w-xl text-2xl font-black leading-tight sm:text-4xl">Build the visual. Prepare the offer. Decide when it moves.</p></div></MotionStage>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
              <MotionStage asset={vaultxVisual} label="VaultX premium product motion" className="min-h-[18rem]" objectPosition="object-center"><div className="absolute inset-0 bg-[linear-gradient(180deg,transparent,rgba(5,4,3,.72))]" /><p className="absolute inset-x-0 bottom-0 p-5 text-lg font-black leading-tight">Private does not have to feel small.</p></MotionStage>
              <MotionStage asset={premiumUnlock} label="CreatorVault premium unlock motion" className="min-h-[18rem]" objectPosition="object-center"><div className="absolute inset-0 bg-[linear-gradient(180deg,transparent,rgba(5,4,3,.72))]" /><p className="absolute inset-x-0 bottom-0 p-5 text-lg font-black leading-tight">The next drop can feel like access, not another post.</p></MotionStage>
            </div>
          </div>
        </div>
      </section>

      <section className="border-b border-white/10 bg-[#120d09]">
        <div className="mx-auto grid max-w-7xl gap-5 px-5 py-8 sm:px-8 sm:py-12 lg:grid-cols-[1.05fr_.95fr] lg:px-12">
          <div className="flex min-h-[31rem] flex-col justify-between p-7 sm:min-h-[38rem] sm:p-10 lg:p-14">
            <div><p className="text-xs font-black uppercase tracking-[.25em] text-[#e8c87e]">The room after the visual</p><h2 className="mt-5 text-5xl font-black leading-[.86] tracking-[-.07em] sm:text-7xl">Creator attention and fan attention belong in the same experience.</h2><p className="mt-7 max-w-xl text-base leading-relaxed text-zinc-300 sm:text-lg">Make the content feel like a world. Then bring the people who matter closer to the next release on your terms.</p></div>
            <div className="mt-10 flex flex-col gap-3 sm:flex-row"><Link href="/vault-x/studio"><a className="inline-flex min-h-14 items-center justify-center gap-2 rounded-full bg-[#f3d899] px-7 font-black text-[#19130c] transition hover:bg-white">Open VaultX Studio <ArrowUpRight className="h-4 w-4" /></a></Link><Link href="/social"><a className="inline-flex min-h-14 items-center justify-center rounded-full border border-white/25 px-7 font-black text-white transition hover:bg-white/10">Open Social Empire</a></Link></div>
          </div>
          <MotionStage asset={creatorAndAudience} label="CreatorVault creator and audience motion" className="min-h-[31rem] sm:min-h-[38rem]" objectPosition="object-center"><div className="absolute inset-0 bg-[linear-gradient(180deg,transparent_48%,rgba(5,4,3,.74))]" /><div className="absolute inset-x-0 bottom-0 p-6 sm:p-8"><p className="text-[10px] font-black uppercase tracking-[.22em] text-[#efd18c]">Social presence</p><p className="mt-3 max-w-sm text-2xl font-black leading-tight">The right people should feel the heat before the release arrives.</p></div></MotionStage>
        </div>
      </section>

      <section className="relative isolate overflow-hidden bg-[#f3eadb] text-[#19130c]">
        <MotionStage asset={vaultxTrailer} label="CreatorVault closing motion" className="absolute inset-0 opacity-20" objectPosition="object-center" />
        <div className="absolute inset-0 bg-[#f3eadb]/85" />
        <div className="relative mx-auto flex max-w-7xl flex-col items-start justify-between gap-8 px-5 py-16 sm:px-8 sm:py-24 lg:flex-row lg:items-end lg:px-12">
          <div className="max-w-3xl"><p className="text-xs font-black uppercase tracking-[.24em] text-[#765b2f]">Make the next move count</p><h2 className="mt-4 text-4xl font-black leading-[.9] tracking-[-.06em] sm:text-6xl">The next thing they see can feel completely different.</h2><p className="mt-5 max-w-xl text-base leading-relaxed text-[#574936] sm:text-lg">Bring your own media into CreatorVault and build the release around the moment that matters.</p></div>
          <div className="flex flex-col gap-3 sm:flex-row"><Link href="/signup"><a className="inline-flex min-h-14 items-center justify-center gap-2 rounded-full bg-[#19130c] px-7 font-black text-white transition hover:bg-[#3d2c17]">Create your vault <ArrowUpRight className="h-4 w-4" /></a></Link><Link href="/king/content"><a className="inline-flex min-h-14 items-center justify-center rounded-full border border-[#19130c]/25 px-7 font-black transition hover:bg-black/5">See KingCam&apos;s creation room</a></Link></div>
        </div>
      </section>
    </main>
  );
}
