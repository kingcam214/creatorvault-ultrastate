import { Link } from "wouter";
import { HOMEPAGE_MEDIA } from "@/lib/homepageMediaRegistry";

export default function Demos() {
  return (
    <main className="min-h-screen bg-[#080709] px-5 py-20 text-white">
      <div className="mx-auto max-w-6xl">
        <p className="text-[10px] font-black uppercase tracking-[0.22em] text-emerald-200">CreatorVault proof room</p>
        <h1 className="mt-4 max-w-3xl text-5xl font-black leading-[0.9] tracking-[-0.07em] sm:text-7xl">Only real work belongs here.</h1>
        <p className="mt-6 max-w-2xl text-base leading-relaxed text-zinc-300 sm:text-lg">No made-up revenue split. No blank preview cards. No feature theater. These are finished CreatorVault creations you can actually open and watch.</p>

        <div className="mt-10 grid gap-6 lg:grid-cols-2">
          <Link href="/agents/motion-flyer-agent">
            <a className="group overflow-hidden rounded-[2rem] border border-emerald-200/20 bg-[linear-gradient(145deg,#0c1713,#07090a)] shadow-[0_24px_80px_-44px_rgba(52,211,153,0.62)] transition hover:border-emerald-200/60">
              <video src={HOMEPAGE_MEDIA.motionFlyerProof.livePath} autoPlay muted loop playsInline preload="metadata" className="h-80 w-full object-cover" />
              <div className="p-6">
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-emerald-200">Accepted motion flyer</p>
                <h2 className="mt-3 text-2xl font-black tracking-[-0.045em]">A real six-second moving piece.</h2>
                <p className="mt-3 text-sm leading-relaxed text-zinc-400">Stored in CreatorVault and ready to watch before you decide what to do with it.</p>
              </div>
            </a>
          </Link>

          <Link href="/king/campaign-visual">
            <a className="group overflow-hidden rounded-[2rem] border border-amber-200/20 bg-[linear-gradient(145deg,#18130a,#090807)] shadow-[0_24px_80px_-44px_rgba(245,158,11,0.58)] transition hover:border-amber-200/60">
              <img src={HOMEPAGE_MEDIA.campaignVisualProof.livePath} alt="Accepted CreatorVault campaign visual" className="h-80 w-full object-cover" />
              <div className="p-6">
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-amber-200">Accepted campaign visual</p>
                <h2 className="mt-3 text-2xl font-black tracking-[-0.045em]">A real reviewed campaign image.</h2>
                <p className="mt-3 text-sm leading-relaxed text-zinc-400">Kept in CreatorVault because it met the review standard—not because a page needed a placeholder.</p>
              </div>
            </a>
          </Link>
        </div>

        <div className="mt-10 rounded-[2rem] border border-white/10 bg-white/[0.03] p-7 sm:p-9">
          <p className="text-xl font-black tracking-[-0.045em]">What is not shown as proof</p>
          <p className="mt-3 max-w-3xl text-sm leading-relaxed text-zinc-400">Body Cinema source analysis and direction are connected to saved CreatorVault video, but a finished Body Cinema video is not shown here because the governed provider account has no enabled source-video model. CreatorVault will show it only after there is a real result to watch.</p>
        </div>
      </div>
    </main>
  );
}
