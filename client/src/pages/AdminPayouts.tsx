export default function AdminPayouts() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#08090b] px-5 py-20 text-white">
      <section className="w-full max-w-2xl overflow-hidden rounded-[2rem] border border-emerald-200/20 bg-[radial-gradient(circle_at_top_right,rgba(52,211,153,0.14),transparent_42%),linear-gradient(145deg,#0d1513,#070908)] p-7 shadow-[0_28px_90px_-48px_rgba(52,211,153,0.62)] sm:p-10">
        <p className="text-[10px] font-black uppercase tracking-[0.22em] text-emerald-200">Owner money room</p>
        <h1 className="mt-4 text-4xl font-black leading-[0.9] tracking-[-0.065em] sm:text-5xl">No creator payout can move from here yet.</h1>
        <p className="mt-6 max-w-xl text-base leading-relaxed text-zinc-300">CreatorVault will not mark money as processing, paid, rejected, or complete until the exact fan payment, creator balance, access, and payout record can be proven together.</p>
        <div className="mt-7 rounded-2xl border border-white/10 bg-black/25 p-5">
          <p className="text-sm font-black text-white">What this protects</p>
          <p className="mt-2 text-sm leading-relaxed text-zinc-400">No payout record can be changed from this room. That keeps a page from looking like money moved when the real money path is still closed.</p>
        </div>
      </section>
    </main>
  );
}
