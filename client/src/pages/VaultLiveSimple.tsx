import { Link } from "wouter";
import { HOMEPAGE_MEDIA } from "@/lib/homepageMediaRegistry";

export default function VaultLiveSimple() {
  return (
    <main className="min-h-screen overflow-hidden bg-[#070707] text-white">
      <section className="relative isolate flex min-h-screen items-end overflow-hidden px-5 py-20 sm:px-8">
        <video src={HOMEPAGE_MEDIA.homepageMotionPilot.livePath} autoPlay muted loop playsInline preload="metadata" className="absolute inset-0 h-full w-full object-cover" aria-label="CreatorVault accepted motion" />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(5,5,5,.24),rgba(5,5,5,.92)_78%,#070707)]" />
        <div className="relative mx-auto w-full max-w-3xl rounded-[2rem] border border-amber-200/20 bg-black/55 p-7 shadow-[0_28px_90px_-48px_rgba(245,158,11,.65)] backdrop-blur-sm sm:p-10">
          <p className="text-[10px] font-black uppercase tracking-[0.22em] text-amber-200">CreatorVault live room</p>
          <h1 className="mt-4 text-5xl font-black leading-[0.9] tracking-[-0.07em] sm:text-6xl">Live rooms are not open yet.</h1>
          <p className="mt-6 max-w-2xl text-base leading-relaxed text-zinc-200">CreatorVault will not tell a creator to go live, invite fans, accept tips, show a balance, or request a payout until the complete live, payment, access, and money path works for real from beginning to end.</p>
          <div className="mt-7 rounded-2xl border border-white/10 bg-black/35 p-5">
            <p className="text-sm font-black text-white">What stays protected</p>
            <p className="mt-2 text-sm leading-relaxed text-zinc-300">No live stream is being started. No fan is being charged. No tip, balance, or payout is being made up. This room returns only when those promises can be kept.</p>
          </div>
          <Link href="/demos-home"><a className="mt-7 inline-flex min-h-12 items-center justify-center rounded-xl bg-amber-200 px-5 text-sm font-black text-black transition hover:bg-white">Watch accepted CreatorVault work</a></Link>
        </div>
      </section>
    </main>
  );
}
