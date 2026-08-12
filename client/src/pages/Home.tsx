import { ArrowUpRight, CheckCircle2, Play, ShieldCheck, Sparkles } from "lucide-react";
import { Link } from "wouter";
import { CreatorVaultRoute } from "@/lib/productArchitecture";
import { HOMEPAGE_MEDIA_SEQUENCE } from "@/lib/homepageMediaRegistry";
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
    <div className={`relative overflow-hidden bg-[#090806] ${className}`} style={style} aria-label={alt}>
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

const releaseMoves = [
  {
    number: "01",
    title: "Bring the moment in",
    copy: "Start from the media you already own. Your work stays at the center of the decision.",
  },
  {
    number: "02",
    title: "Build the feeling around it",
    copy: "Choose the camera energy, pace, sound, and visual language that makes the clip worth stopping for.",
  },
  {
    number: "03",
    title: "Turn it into a drop",
    copy: "Move from finished visual to private offer, social-ready moment, and the next release on your terms.",
  },
];

export default function Home() {
  const showcase = HOMEPAGE_MEDIA_SEQUENCE.find((asset) => asset.assetId === "kingcam-hero-cam");
  if (!showcase) {
    throw new Error("CreatorVault homepage hero requires an eligible motion proof.");
  }

  return (
    <main className="min-h-screen overflow-hidden bg-[#080706] text-white selection:bg-[#f0d18a]/40">
      <section
        className="relative isolate min-h-[100svh] overflow-hidden border-b border-white/10"
        aria-label="CreatorVault showcase hero"
      >
        <ShowcaseMotion
          videoSrc={showcase.livePath}
          posterSrc={showcase.fallbackAsset}
          alt="KingCam Clone full-body moving identity hero"
          className="absolute inset-0"
          priority
        />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(5,4,3,.18)_0%,rgba(5,4,3,.04)_30%,rgba(5,4,3,.72)_88%,#080706_100%)]" />
        <div className="absolute inset-y-0 left-0 w-full bg-[radial-gradient(circle_at_16%_52%,rgba(0,0,0,.28),transparent_42%)]" />

        <div className="relative z-10 mx-auto flex min-h-[100svh] max-w-7xl flex-col px-5 pb-7 pt-6 sm:px-8 sm:pt-8 lg:px-12">
          <header className="flex items-center justify-between">
            <img src="/logo-white.png" alt="CreatorVault" className="h-7 sm:h-9" />
            <Link href={CreatorVaultRoute.creatorOS}>
              <a className="rounded-full border border-white/20 bg-black/30 px-4 py-2 text-[10px] font-black uppercase tracking-[0.16em] text-white backdrop-blur-md transition hover:bg-white hover:text-black sm:text-xs">Enter your world</a>
            </Link>
          </header>

          <div className="mt-auto max-w-3xl pb-10 pt-40 sm:pb-14 lg:my-auto lg:py-28">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-[#efd18c]/45 bg-black/35 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.2em] text-[#f7dfa6] backdrop-blur-md">
              <Sparkles className="h-3.5 w-3.5" /> A new way to make the moment hit
            </div>
            <h1 className="max-w-3xl text-5xl font-black leading-[0.84] tracking-[-0.075em] sm:text-7xl lg:text-[5.8rem]">
              Don&apos;t post
              <br />
              <span className="text-[#f3d899]">content.</span>
              <br />
              Drop a feeling.
            </h1>
            <p className="mt-6 max-w-xl text-base leading-relaxed text-zinc-100 sm:text-lg">
              CreatorVault takes the media you already own and helps you shape it into the kind of release people pause for, remember, and want more of.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link href="/signup">
                <a className="inline-flex min-h-14 items-center justify-center gap-2 rounded-full bg-[#f6ead5] px-7 font-black text-[#181109] transition hover:bg-white">Start your vault <ArrowUpRight className="h-4 w-4" /></a>
              </Link>
              <Link href="/vault-x/studio">
                <a className="inline-flex min-h-14 items-center justify-center gap-2 rounded-full border border-white/30 bg-black/30 px-7 font-black text-white backdrop-blur transition hover:bg-white/10">Build in Body Cinema <Play className="h-4 w-4 fill-current" /></a>
              </Link>
            </div>
          </div>

          <div className="grid gap-3 border-t border-white/15 pt-4 text-[10px] font-black uppercase tracking-[0.16em] text-zinc-200 sm:grid-cols-3 sm:text-xs">
            <span>Real moving media</span>
            <span className="sm:text-center">Full-body cinematic direction</span>
            <span className="sm:text-right">Made inside CreatorVault</span>
          </div>
        </div>
      </section>

      <section className="relative overflow-hidden border-b border-white/10 bg-[#0d0b09]">
        <div className="absolute right-[-8rem] top-[-10rem] h-[30rem] w-[30rem] rounded-full bg-[#c99547]/10 blur-[110px]" />
        <div className="relative mx-auto grid max-w-7xl gap-12 px-5 py-16 sm:px-8 sm:py-24 lg:grid-cols-[.9fr_1.1fr] lg:items-end lg:px-12">
          <div className="max-w-lg">
            <div className="text-xs font-black uppercase tracking-[0.25em] text-[#e8c87e]">KingCam Clone / CreatorVault</div>
            <h2 className="mt-4 text-4xl font-black leading-[.92] tracking-[-.06em] sm:text-6xl">The founder is not a poster. He is part of the world.</h2>
          </div>
          <div className="border-l border-[#e8c87e]/30 pl-6 sm:pl-8">
            <div className="flex items-center gap-3 text-sm font-black text-[#f5ddb0]"><CheckCircle2 className="h-5 w-5" /> Full-body moving clone identity</div>
            <p className="mt-4 max-w-2xl text-base leading-relaxed text-zinc-300 sm:text-lg">KingCam&apos;s clone stays in motion at the entrance. The rest of CreatorVault is built to turn creator-owned media into releases with the same kind of presence.</p>
          </div>
        </div>
      </section>

      <section className="border-b border-white/10 bg-[#080706]">
        <div className="mx-auto max-w-7xl px-5 py-16 sm:px-8 sm:py-24 lg:px-12">
          <div className="max-w-3xl">
            <div className="text-xs font-black uppercase tracking-[0.25em] text-[#e8c87e]">Your release, built with intention</div>
            <h2 className="mt-4 text-4xl font-black leading-[.92] tracking-[-.06em] sm:text-6xl">The work does not need another dashboard. It needs direction.</h2>
          </div>
          <div className="mt-12 divide-y divide-white/10 border-y border-white/10">
            {releaseMoves.map((move) => (
              <div key={move.number} className="group grid gap-4 py-7 sm:grid-cols-[5rem_1fr_auto] sm:items-center sm:gap-8 sm:py-9">
                <span className="font-mono text-sm tracking-[.18em] text-[#e8c87e]">{move.number}</span>
                <div><h3 className="text-2xl font-black tracking-[-.04em] sm:text-3xl">{move.title}</h3><p className="mt-2 max-w-2xl text-sm leading-relaxed text-zinc-400 sm:text-base">{move.copy}</p></div>
                <ArrowUpRight className="h-6 w-6 text-zinc-600 transition group-hover:text-[#e8c87e]" />
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="relative overflow-hidden border-b border-white/10 bg-[#17110b]">
        <div className="absolute inset-0 opacity-30 [background-image:linear-gradient(rgba(232,200,126,.1)_1px,transparent_1px),linear-gradient(90deg,rgba(232,200,126,.1)_1px,transparent_1px)] [background-size:3rem_3rem]" />
        <div className="relative mx-auto grid max-w-7xl gap-12 px-5 py-16 sm:px-8 sm:py-24 lg:grid-cols-[1.1fr_.9fr] lg:items-center lg:px-12">
          <div>
            <div className="text-xs font-black uppercase tracking-[0.25em] text-[#e8c87e]">VaultX</div>
            <h2 className="mt-4 max-w-3xl text-5xl font-black leading-[.86] tracking-[-.07em] sm:text-7xl">Private does not have to feel small.</h2>
          </div>
          <div className="border border-[#e8c87e]/25 bg-black/35 p-7 backdrop-blur-sm sm:p-9">
            <ShieldCheck className="h-8 w-8 text-[#e8c87e]" />
            <p className="mt-6 text-xl font-black leading-tight">Create the visual. Prepare the offer. Decide when it moves.</p>
            <p className="mt-4 text-sm leading-relaxed text-zinc-300">Your work stays inside your world until you decide it is ready. No forced posting. No lost control. No cold, generic workflow in the middle of your creative moment.</p>
          </div>
        </div>
      </section>

      <section className="bg-[#f3eadb] text-[#19130c]">
        <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-8 px-5 py-16 sm:px-8 sm:py-24 lg:flex-row lg:items-end lg:px-12">
          <div className="max-w-3xl"><div className="text-xs font-black uppercase tracking-[.24em] text-[#765b2f]">Make the next move count</div><h2 className="mt-4 text-4xl font-black leading-[.9] tracking-[-.06em] sm:text-6xl">The next thing they see can feel completely different.</h2><p className="mt-5 max-w-xl text-base leading-relaxed text-[#574936] sm:text-lg">Bring your own media into CreatorVault and build the release around the moment that matters.</p></div>
          <div className="flex flex-col gap-3 sm:flex-row"><Link href="/signup"><a className="inline-flex min-h-14 items-center justify-center gap-2 rounded-full bg-[#19130c] px-7 font-black text-white transition hover:bg-[#3d2c17]">Create your vault <ArrowUpRight className="h-4 w-4" /></a></Link><Link href="/vault-x/studio"><a className="inline-flex min-h-14 items-center justify-center rounded-full border border-[#19130c]/25 px-7 font-black transition hover:bg-black/5">Open Body Cinema</a></Link></div>
        </div>
      </section>
    </main>
  );
}
