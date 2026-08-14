import { ArrowRight, Crown, LockKeyhole, ShieldCheck } from "lucide-react";
import { Link } from "wouter";
import { HOMEPAGE_MEDIA } from "@/lib/homepageMediaRegistry";

export default function CreatorSubscriptionTiers() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-[#060608] text-white">
      <video
        src={HOMEPAGE_MEDIA.homepageMotionPilot.livePath}
        autoPlay
        loop
        muted
        playsInline
        preload="metadata"
        className="absolute inset-0 h-full w-full object-cover opacity-35"
        aria-hidden="true"
      />
      <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(6,6,8,.96)_0%,rgba(6,6,8,.76)_58%,rgba(6,6,8,.52)_100%),linear-gradient(0deg,rgba(6,6,8,.96)_0%,rgba(6,6,8,.18)_68%,rgba(6,6,8,.7)_100%)]" />

      <section className="relative z-10 mx-auto flex min-h-screen max-w-4xl flex-col justify-end px-6 pb-14 pt-32 sm:px-10 sm:pb-20">
        <div className="max-w-2xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-amber-200/25 bg-amber-200/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.2em] text-amber-100">
            <LockKeyhole className="h-3.5 w-3.5" /> Membership access is not open for sale yet
          </div>
          <h1 className="mt-6 text-5xl font-black leading-[0.86] tracking-[-0.075em] text-white sm:text-7xl">When membership opens,<br /><span className="text-amber-100">it has to be real.</span></h1>
          <p className="mt-6 max-w-xl text-base leading-7 text-zinc-200 sm:text-lg">CreatorVault will only open a membership offer when what fans pay, what they receive, and what lands in your money record can stay connected for real. No made-up tiers. No price cards that cannot sell. No access that appears out of nowhere.</p>
        </div>

        <div className="mt-10 grid max-w-3xl gap-3 sm:grid-cols-2">
          <div className="rounded-2xl border border-white/15 bg-black/45 p-5 backdrop-blur">
            <ShieldCheck className="h-6 w-6 text-emerald-200" />
            <h2 className="mt-4 text-lg font-black">What stays protected</h2>
            <p className="mt-2 text-sm leading-6 text-zinc-300">Your fan access and your money story do not move until there is a real path that can carry both.</p>
          </div>
          <div className="rounded-2xl border border-white/15 bg-black/45 p-5 backdrop-blur">
            <Crown className="h-6 w-6 text-amber-100" />
            <h2 className="mt-4 text-lg font-black">What you can move now</h2>
            <p className="mt-2 text-sm leading-6 text-zinc-300">Build the moments, offers, and source library that a real membership can stand on when the sale room is ready.</p>
          </div>
        </div>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Link href="/vault-x/studio" className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[linear-gradient(135deg,#c9a84c,#f3d68b)] px-5 py-4 text-sm font-black text-black transition hover:brightness-110">Open Body Cinema <ArrowRight className="h-4 w-4" /></Link>
          <Link href="/king/media-vault" className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/25 bg-black/40 px-5 py-4 text-sm font-black text-white backdrop-blur transition hover:border-white">See your Media Vault <ArrowRight className="h-4 w-4" /></Link>
        </div>
      </section>
    </main>
  );
}
