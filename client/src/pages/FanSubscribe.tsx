import { Link } from "wouter";

export default function FanSubscribe() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#080609] px-5 py-20 text-white">
      <section className="w-full max-w-2xl overflow-hidden rounded-[2rem] border border-violet-200/20 bg-[radial-gradient(circle_at_top_right,rgba(139,92,246,0.18),transparent_42%),radial-gradient(circle_at_bottom_left,rgba(244,63,94,0.12),transparent_46%),linear-gradient(145deg,#120d19,#070608)] p-7 shadow-[0_28px_90px_-48px_rgba(139,92,246,0.72)] sm:p-10">
        <p className="text-[10px] font-black uppercase tracking-[0.22em] text-violet-200">CreatorVault access</p>
        <h1 className="mt-4 text-4xl font-black leading-[0.9] tracking-[-0.065em] sm:text-5xl">Fan access is not open for sale yet.</h1>
        <p className="mt-6 max-w-xl text-base leading-relaxed text-zinc-300">CreatorVault will not take a payment, show a price, collect a payment receipt, promise private access, or tell a creator money has arrived until the full payment, access, delivery, and payout path is proven together.</p>
        <div className="mt-7 rounded-2xl border border-white/10 bg-black/25 p-5">
          <p className="text-sm font-black text-white">What stays protected</p>
          <p className="mt-2 text-sm leading-relaxed text-zinc-400">Fans cannot be asked to pay into an unfinished path, and creators cannot be shown money or membership access that is not real.</p>
        </div>
        <Link href="/vault-x">
          <a className="mt-7 inline-flex min-h-12 items-center justify-center rounded-xl bg-violet-200 px-5 text-sm font-black text-black transition hover:bg-white">See what VaultX is building</a>
        </Link>
      </section>
    </main>
  );
}
