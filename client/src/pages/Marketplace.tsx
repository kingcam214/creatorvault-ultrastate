import { Link } from "wouter";
import { HOMEPAGE_MEDIA } from "@/lib/homepageMediaRegistry";

export default function Marketplace() {
  return (
    <main className="min-h-screen overflow-hidden bg-[#070707] text-white">
      <section className="relative isolate flex min-h-screen items-end overflow-hidden px-5 py-20 sm:px-8">
        <video src={HOMEPAGE_MEDIA.homepageMotionPilot.livePath} autoPlay muted loop playsInline preload="metadata" className="absolute inset-0 h-full w-full object-cover" aria-label="CreatorVault accepted motion" />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(5,5,5,.24),rgba(5,5,5,.92)_78%,#070707)]" />
        <div className="relative mx-auto w-full max-w-4xl rounded-[2rem] border border-amber-200/20 bg-black/55 p-7 shadow-[0_28px_90px_-48px_rgba(245,158,11,.65)] backdrop-blur-sm sm:p-10">
          <p className="text-[10px] font-black uppercase tracking-[0.22em] text-amber-200">CreatorVault commerce</p>
          <h1 className="mt-4 max-w-3xl text-5xl font-black leading-[0.9] tracking-[-0.07em] sm:text-7xl">The sale room is not open yet.</h1>
          <p className="mt-6 max-w-2xl text-base leading-relaxed text-zinc-200 sm:text-lg">CreatorVault will not show a product price, take a buyer to checkout, display a sale count, or promise delivery until a real purchase can connect to access, fulfillment, and the creator&apos;s money record.</p>
          <div className="mt-7 rounded-2xl border border-white/10 bg-black/35 p-5">
            <p className="text-sm font-black text-white">What you can see today</p>
            <p className="mt-2 text-sm leading-relaxed text-zinc-300">Real accepted creations are kept in the proof room. Nothing in this marketplace is being passed off as ready to buy before the full deal is real.</p>
          </div>
          <Link href="/demos-home"><a className="mt-7 inline-flex min-h-12 items-center justify-center rounded-xl bg-amber-200 px-5 text-sm font-black text-black transition hover:bg-white">Watch accepted CreatorVault work</a></Link>
        </div>
      </section>
    </main>
  );
}
