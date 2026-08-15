import { Link } from "wouter";

export default function TelegramSetup() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#070707] px-5 py-20 text-white">
      <section className="w-full max-w-2xl overflow-hidden rounded-[2rem] border border-amber-200/20 bg-[radial-gradient(circle_at_top_right,rgba(245,158,11,0.16),transparent_42%),linear-gradient(145deg,#181208,#070707)] p-7 shadow-[0_28px_90px_-48px_rgba(245,158,11,.65)] sm:p-10">
        <p className="text-[10px] font-black uppercase tracking-[0.22em] text-amber-200">CreatorVault channels</p>
        <h1 className="mt-4 text-4xl font-black leading-[0.9] tracking-[-0.065em] sm:text-5xl">Private channel access is not open yet.</h1>
        <p className="mt-6 max-w-xl text-base leading-relaxed text-zinc-300">CreatorVault will not expose a channel control, private endpoint, message command, fan access promise, balance, live-room action, or payout instruction before the complete channel, access, payment, and creator-money path is proven.</p>
        <div className="mt-7 rounded-2xl border border-white/10 bg-black/25 p-5">
          <p className="text-sm font-black text-white">What stays protected</p>
          <p className="mt-2 text-sm leading-relaxed text-zinc-400">No channel setting is being changed here, and no internal connection detail is being shown. Private channel access returns only after it is safe, real, and ready for creators and fans.</p>
        </div>
        <Link href="/demos-home"><a className="mt-7 inline-flex min-h-12 items-center justify-center rounded-xl bg-amber-200 px-5 text-sm font-black text-black transition hover:bg-white">Watch accepted CreatorVault work</a></Link>
      </section>
    </main>
  );
}
