import { Link } from "wouter";

export default function MarketplaceManage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#070707] px-5 py-20 text-white">
      <section className="w-full max-w-2xl overflow-hidden rounded-[2rem] border border-amber-200/20 bg-[radial-gradient(circle_at_top_right,rgba(245,158,11,0.16),transparent_42%),linear-gradient(145deg,#181208,#070707)] p-7 shadow-[0_28px_90px_-48px_rgba(245,158,11,.65)] sm:p-10">
        <p className="text-[10px] font-black uppercase tracking-[0.22em] text-amber-200">CreatorVault commerce</p>
        <h1 className="mt-4 text-4xl font-black leading-[0.9] tracking-[-0.065em] sm:text-5xl">Saved listings are not ready to manage as sales yet.</h1>
        <p className="mt-6 max-w-xl text-base leading-relaxed text-zinc-300">CreatorVault will not display sales, revenue, prices, buyer activity, product activation, or payout promises while the real purchase, delivery, access, and creator-money path is still closed.</p>
        <div className="mt-7 rounded-2xl border border-white/10 bg-black/25 p-5">
          <p className="text-sm font-black text-white">What stays protected</p>
          <p className="mt-2 text-sm leading-relaxed text-zinc-400">Existing creator ideas and saved inventory remain untouched. They are simply not being shown as live products or real money until the complete sale path is proven.</p>
        </div>
        <Link href="/demos-home"><a className="mt-7 inline-flex min-h-12 items-center justify-center rounded-xl bg-amber-200 px-5 text-sm font-black text-black transition hover:bg-white">Watch accepted CreatorVault work</a></Link>
      </section>
    </main>
  );
}
