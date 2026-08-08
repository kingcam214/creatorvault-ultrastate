import { Link } from "wouter";
import { ArrowUpRight, Crown, Radio, Wand2 } from "lucide-react";
import { CreatorVaultRoute } from "@/lib/productArchitecture";

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
      <section className="relative isolate min-h-[100svh] overflow-hidden bg-black" aria-label="KingCam creator hero">
        <video
          aria-hidden="true"
          className="absolute inset-0 h-full w-full scale-110 object-cover object-center opacity-30 blur-2xl"
          src="/videos/kingcam-hero-cam.mp4"
          autoPlay
          loop
          muted
          playsInline
          preload="metadata"
        />
        <div className="absolute inset-0 bg-black/25" />
        <video
          aria-label="KingCam creator hero video"
          className="absolute inset-0 h-full w-full object-contain object-center"
          src="/videos/kingcam-hero-cam.mp4"
          autoPlay
          loop
          muted
          playsInline
          preload="metadata"
        />
      </section>

      <section className="mx-auto max-w-7xl px-5 py-16 sm:px-8 sm:py-24 lg:px-12">
        <div className="grid gap-8 lg:grid-cols-[0.8fr_1.2fr] lg:items-end">
          <div>
            <div className="text-xs font-black uppercase tracking-[0.22em] text-zinc-500">CreatorVault</div>
            <h1 className="mt-3 text-5xl font-black leading-[0.92] tracking-[-0.06em] sm:text-6xl">Your Content.<br />Your Empire.</h1>
          </div>
          <p className="max-w-2xl text-lg leading-relaxed text-zinc-300 sm:text-xl">The private platform for creators who want to turn their media into high-end drops, control their distribution, and keep the money they earn.</p>
        </div>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
          <Link href="/signup">
            <a className="inline-flex min-h-13 items-center justify-center gap-2 rounded-2xl bg-white px-8 py-4 text-base font-black text-black transition hover:bg-zinc-200">
              Create Your Vault <ArrowUpRight className="h-4 w-4" />
            </a>
          </Link>
          <Link href={CreatorVaultRoute.creatorOS}><a className="px-3 py-3 text-sm font-bold text-zinc-400 transition hover:text-white">Sign In</a></Link>
          <Link href={CreatorVaultRoute.vaultX}><a className="px-3 py-3 text-sm font-bold text-zinc-400 transition hover:text-white">Explore Features</a></Link>
        </div>

        <div className="mt-16 grid gap-4 md:grid-cols-3">
          {creatorBenefits.map((benefit) => {
            const Icon = benefit.icon;
            return (
              <div key={benefit.number} className="flex min-h-64 flex-col rounded-[1.75rem] border border-white/10 bg-white/[0.035] p-8 transition hover:border-white/30 hover:bg-white/[0.06]">
                <div className="flex items-start justify-between">
                  <span className="text-xs font-black tracking-[0.22em] text-zinc-500">{benefit.number}</span>
                  <div className="grid h-12 w-12 place-items-center rounded-2xl bg-white text-black"><Icon className="h-6 w-6" /></div>
                </div>
                <h2 className="mt-12 text-2xl font-black tracking-tight">{benefit.title}</h2>
                <p className="mt-4 text-base leading-relaxed text-zinc-400">{benefit.copy}</p>
              </div>
            );
          })}
        </div>
      </section>

      <section className="border-t border-white/10 bg-black">
        <div className="mx-auto max-w-7xl px-5 py-16 sm:px-8 sm:py-20 lg:px-12">
          <div className="max-w-2xl">
            <div className="text-xs font-black uppercase tracking-[0.22em] text-zinc-500">Your next move</div>
            <h2 className="mt-4 text-4xl font-black tracking-[-0.055em] sm:text-5xl">Build the version of your business that pays you back.</h2>
            <Link href="/signup"><a className="mt-8 inline-flex min-h-13 items-center justify-center gap-2 rounded-2xl bg-white px-8 py-4 text-base font-black text-black transition hover:bg-zinc-200">Create Your Vault <ArrowUpRight className="h-4 w-4" /></a></Link>
          </div>
        </div>
      </section>
    </main>
  );
}
