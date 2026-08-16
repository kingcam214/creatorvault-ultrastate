import { ArrowUpRight, Play, Sparkles, WandSparkles } from "lucide-react";
import { Link } from "wouter";
import { CreatorVaultRoute } from "@/lib/productArchitecture";
import { HOMEPAGE_MEDIA, hasCertifiedPublicProof, type HomepageMediaAsset } from "@/lib/homepageMediaRegistry";
import { type CSSProperties } from "react";

function MotionStage({
  videoSrc,
  posterSrc,
  alt,
  className = "",
  style = {},
  priority = false,
  objectFit = "cover",
}: {
  videoSrc: string;
  posterSrc?: string;
  alt: string;
  className?: string;
  style?: CSSProperties;
  priority?: boolean;
  objectFit?: "cover" | "contain";
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
        className={`absolute inset-0 h-full w-full object-${objectFit}`}
        aria-hidden="true"
      />
    </div>
  );
}

function approvedMotion(assetId: string): HomepageMediaAsset {
  const asset = Object.values(HOMEPAGE_MEDIA).find((candidate) => candidate.assetId === assetId);
  if (!asset || !hasCertifiedPublicProof(asset) || asset.mediaKind !== "motion") {
    throw new Error(`CreatorVault home requires an approved moving asset: ${assetId}`);
  }
  return asset;
}

function Eyebrow({ children, tone = "gold" }: { children: React.ReactNode; tone?: "gold" | "orchid" | "ivory" }) {
  const color = tone === "orchid" ? "text-fuchsia-200" : tone === "ivory" ? "text-white/80" : "text-[#f3d899]";
  return <p className={`text-[10px] font-black uppercase tracking-[.24em] ${color} sm:text-xs`}>{children}</p>;
}

function ArrowLink({ href, children, dark = false }: { href: string; children: React.ReactNode; dark?: boolean }) {
  return (
    <Link href={href}>
      <a className={`inline-flex min-h-14 items-center justify-center gap-2 rounded-full px-7 text-sm font-black transition duration-300 ${dark ? "border border-white/30 bg-black/30 text-white backdrop-blur hover:border-white hover:bg-white/10" : "bg-[#f6ead5] text-[#181109] hover:bg-white"}`}>
        {children}<ArrowUpRight className="h-4 w-4" />
      </a>
    </Link>
  );
}

export default function Home() {
  const kingcamHero = approvedMotion("kingcam-hero-cam");
  const womenCampaignMotion = approvedMotion("homepage-motion-pilot-78");
  const motionFlyer = approvedMotion("creatorvault-motion-flyer-b73098d7");

  return (
    <main className="min-h-screen overflow-hidden bg-[#080706] text-white selection:bg-[#f0d18a]/40">
      <style>{`
        @keyframes cvHomeRise { from { opacity: 0; transform: translateY(18px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes cvHomeSignal { 0%, 100% { transform: translateX(-2%); opacity: .45; } 50% { transform: translateX(2%); opacity: .9; } }
        .cv-home-rise { animation: cvHomeRise .9s cubic-bezier(.23,1,.32,1) both; }
        .cv-home-delay { animation-delay: .14s; }
        .cv-home-delay-2 { animation-delay: .28s; }
        .cv-home-signal { animation: cvHomeSignal 5s ease-in-out infinite; }
        @media (prefers-reduced-motion: reduce) { .cv-home-rise, .cv-home-signal { animation: none; } }
      `}</style>

      <section className="relative isolate min-h-[100svh] overflow-hidden border-b border-white/10" aria-label="KingCam in motion">
        <MotionStage
          videoSrc={kingcamHero.livePath}
          posterSrc={kingcamHero.fallbackAsset}
          alt="KingCam full-body motion"
          className="absolute inset-0"
          objectFit="contain"
          priority
        />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_52%,rgba(5,4,3,.10),transparent_38%),linear-gradient(90deg,rgba(5,4,3,.86)_0%,rgba(5,4,3,.42)_38%,rgba(5,4,3,.08)_70%),linear-gradient(180deg,rgba(5,4,3,.08)_0%,rgba(5,4,3,.04)_35%,#080706_100%)]" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-48 bg-[linear-gradient(180deg,transparent,#080706)]" />

        <div className="relative z-10 mx-auto flex min-h-[100svh] max-w-7xl flex-col px-5 pb-7 pt-6 sm:px-8 sm:pt-8 lg:px-12">
          <header className="flex items-center justify-between">
            <img src="/logo-white.png" alt="CreatorVault" className="h-7 sm:h-9" />
            <Link href={CreatorVaultRoute.creatorOS}><a className="rounded-full border border-white/20 bg-black/30 px-4 py-2 text-[10px] font-black uppercase tracking-[0.16em] text-white backdrop-blur-md transition hover:bg-white hover:text-black sm:text-xs">Enter your world</a></Link>
          </header>

          <div className="mt-auto max-w-3xl pb-10 pt-40 sm:pb-14 lg:my-auto lg:py-28">
            <div className="cv-home-rise mb-5 inline-flex items-center gap-2 rounded-full border border-[#efd18c]/45 bg-black/35 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.2em] text-[#f7dfa6] backdrop-blur-md"><Sparkles className="h-3.5 w-3.5" /> KingCam in motion</div>
            <h1 className="cv-home-rise cv-home-delay max-w-3xl text-5xl font-black leading-[0.84] tracking-[-0.075em] sm:text-7xl lg:text-[5.8rem]">Turn your<br /><span className="text-[#f3d899]">presence</span><br />into the moment.</h1>
            <p className="cv-home-rise cv-home-delay-2 mt-6 max-w-xl text-base leading-relaxed text-zinc-100 sm:text-lg">CreatorVault is where the clips, visuals, voice, words, and launch energy finally move together.</p>
            <div className="cv-home-rise cv-home-delay-2 mt-8 flex flex-col gap-3 sm:flex-row">
              <ArrowLink href="/signup">Start your vault</ArrowLink>
              <ArrowLink href="/vault-x/studio" dark>Open Body Cinema <Play className="h-4 w-4 fill-current" /></ArrowLink>
            </div>
          </div>

          <div className="grid gap-3 border-t border-white/15 pt-4 text-[10px] font-black uppercase tracking-[0.16em] text-zinc-200 sm:grid-cols-3 sm:text-xs"><span>Your footage</span><span className="sm:text-center">Your voice</span><span className="sm:text-right">Your next move</span></div>
        </div>
      </section>

      <section className="relative isolate min-h-[100svh] overflow-hidden border-b border-white/10 bg-[#10090c]" aria-label="CreatorVault campaign motion">
        <MotionStage videoSrc={womenCampaignMotion.livePath} posterSrc={womenCampaignMotion.fallbackAsset} alt="CreatorVault female creator campaign motion" className="absolute inset-0" priority />
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(13,7,9,.95)_0%,rgba(13,7,9,.62)_40%,rgba(13,7,9,.10)_74%),linear-gradient(180deg,rgba(10,6,7,.06),rgba(10,6,7,.76))]" />
        <div className="cv-home-signal pointer-events-none absolute inset-x-0 top-[21%] h-px bg-gradient-to-r from-transparent via-[#f3d899]/60 to-transparent" />

        <div className="relative z-10 mx-auto flex min-h-[100svh] max-w-7xl items-end px-5 py-14 sm:px-8 sm:py-20 lg:items-center lg:px-12">
          <div className="max-w-3xl">
            <Eyebrow>CreatorVault campaign film</Eyebrow>
            <h2 className="mt-6 text-5xl font-black leading-[.84] tracking-[-.075em] sm:text-7xl lg:text-[6.5rem]">The next drop<br />starts with <span className="text-[#f3d899]">you.</span></h2>
            <p className="mt-8 max-w-xl text-base leading-relaxed text-zinc-100 sm:text-lg">Bring the moment you already own. Find the frame that hits. Build the piece they remember after they scroll.</p>
            <div className="mt-10 flex flex-col gap-3 sm:flex-row"><ArrowLink href="/vault-x/studio">Build in Body Cinema</ArrowLink><ArrowLink href="/king/content" dark>Open the creation room</ArrowLink></div>
            <p className="mt-7 max-w-md text-xs leading-relaxed text-white/60">This is CreatorVault campaign motion. It sets the feeling; it is not presented as a customer result.</p>
          </div>
        </div>
      </section>

      <section className="relative isolate overflow-hidden border-b border-white/10 bg-[#07070a]" aria-label="Motion Flyer example">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_18%,rgba(225,38,148,.20),transparent_28%),radial-gradient(circle_at_18%_82%,rgba(45,211,238,.15),transparent_31%)]" />
        <div className="relative mx-auto grid min-h-[100svh] max-w-7xl gap-10 px-5 py-14 sm:px-8 sm:py-20 lg:grid-cols-[.9fr_1.1fr] lg:items-center lg:px-12">
          <div className="max-w-xl">
            <Eyebrow tone="orchid">A real moving flyer</Eyebrow>
            <h2 className="mt-6 text-5xl font-black leading-[.84] tracking-[-.075em] sm:text-7xl">The words<br />belong <span className="text-[#f3d899]">inside</span><br />the moment.</h2>
            <p className="mt-7 text-base leading-relaxed text-zinc-300 sm:text-lg">Not a caption box underneath the video. Not a frozen flyer. A message that lives with the visual and makes the feeling land.</p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row"><ArrowLink href="/agents/motion-flyer-agent">Make a Motion Flyer</ArrowLink><ArrowLink href="/king/campaign-visual" dark>Open Campaign Visual</ArrowLink></div>
            <p className="mt-7 text-xs leading-relaxed text-zinc-500">This is an accepted CreatorVault Motion Flyer. It demonstrates moving typography in a finished campaign piece; it is not a caption-system claim.</p>
          </div>
          <div className="relative mx-auto w-full max-w-[31rem] overflow-hidden rounded-[2.2rem] border border-white/15 bg-black p-2 shadow-[0_40px_110px_-60px_rgba(235,36,154,.7)]">
            <div className="pointer-events-none absolute -inset-16 bg-[conic-gradient(from_180deg,transparent,rgba(235,36,154,.28),transparent,rgba(34,211,238,.22),transparent)] blur-3xl" />
            <video src={motionFlyer.livePath} autoPlay loop muted playsInline preload="metadata" className="relative aspect-[9/14] w-full rounded-[1.8rem] object-cover" aria-label="CreatorVault accepted Motion Flyer" />
            <div className="pointer-events-none absolute inset-x-2 bottom-2 rounded-b-[1.8rem] bg-[linear-gradient(180deg,transparent,rgba(0,0,0,.88))] p-5"><Eyebrow tone="ivory">Watch the message move</Eyebrow></div>
          </div>
        </div>
      </section>

      <section className="relative overflow-hidden bg-[#0b0908]" aria-label="CreatorVault creative paths">
        <div className="mx-auto max-w-7xl px-5 py-16 sm:px-8 sm:py-24 lg:px-12">
          <div className="max-w-3xl"><Eyebrow>Make the next move count</Eyebrow><h2 className="mt-5 text-4xl font-black leading-[.88] tracking-[-.065em] sm:text-6xl">One feeling.<br /><span className="text-[#f3d899]">More ways to make it hit.</span></h2></div>
          <div className="mt-12 border-t border-white/15">
            {[
              { number: "01", name: "Body Cinema", line: "Turn your own footage into the next drop you want to sell.", href: "/vault-x/studio" },
              { number: "02", name: "Motion Flyer", line: "Make the announcement move before you put it in front of anybody.", href: "/agents/motion-flyer-agent" },
              { number: "03", name: "Campaign Visual", line: "Pull one bold visual from the mood you are building.", href: "/king/campaign-visual" },
              { number: "04", name: "Social Empire", line: "Get the moments you chose ready for the people waiting on you.", href: CreatorVaultRoute.socialEmpire },
            ].map((path) => (
              <Link key={path.number} href={path.href}>
                <a className="group grid gap-4 border-b border-white/15 py-7 transition sm:grid-cols-[74px_1fr_auto] sm:items-center sm:gap-8 hover:border-[#f3d899]/70">
                  <span className="text-xs font-black tracking-[.2em] text-[#f3d899]">{path.number}</span>
                  <div><p className="text-2xl font-black tracking-[-.04em] text-white sm:text-3xl">{path.name}</p><p className="mt-2 max-w-xl text-sm leading-relaxed text-zinc-400 sm:text-base">{path.line}</p></div>
                  <span className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/20 text-white transition group-hover:border-[#f3d899] group-hover:bg-[#f3d899] group-hover:text-black"><ArrowUpRight className="h-5 w-5" /></span>
                </a>
              </Link>
            ))}
          </div>
          <div className="mt-12 flex flex-col justify-between gap-4 border-t border-white/10 pt-8 sm:flex-row sm:items-center"><p className="max-w-xl text-sm leading-relaxed text-zinc-400">CreatorVault only puts a finished piece in front of you when there is a real piece to see.</p><ArrowLink href="/signup">Start your vault</ArrowLink></div>
        </div>
      </section>
    </main>
  );
}
