import { Link } from "wouter";

export default function VaultXOnboarding() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#080706] px-5 py-20 text-white">
      <section className="w-full max-w-2xl overflow-hidden rounded-[2rem] border border-amber-200/20 bg-[radial-gradient(circle_at_top_right,rgba(245,158,11,0.16),transparent_42%),radial-gradient(circle_at_bottom_left,rgba(217,70,239,0.14),transparent_46%),linear-gradient(145deg,#16100a,#070605)] p-7 shadow-[0_28px_90px_-48px_rgba(245,158,11,0.7)] sm:p-10">
        <p className="text-[10px] font-black uppercase tracking-[0.22em] text-amber-200">VaultX</p>
        <h1 className="mt-4 text-4xl font-black leading-[0.9] tracking-[-0.065em] sm:text-5xl">The VaultX money path is not ready to open.</h1>
        <p className="mt-6 max-w-xl text-base leading-relaxed text-zinc-300">CreatorVault will not ask you to connect a channel, choose a price, turn on access, collect a payment, or promise earnings until one real path proves every part of that moment.</p>
        <div className="mt-7 rounded-2xl border border-white/10 bg-black/25 p-5">
          <p className="text-sm font-black text-white">What you can move right now</p>
          <p className="mt-2 text-sm leading-relaxed text-zinc-400">Start with the video you already own, understand its strongest moments, and shape a premium direction for the next private release.</p>
        </div>
        <Link href="/vault-x/studio">
          <a className="mt-7 inline-flex min-h-12 items-center justify-center rounded-xl bg-amber-200 px-5 text-sm font-black text-black transition hover:bg-white">Start with your saved video</a>
        </Link>
      </section>
    </main>
  );
}
