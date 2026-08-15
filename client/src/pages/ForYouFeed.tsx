import { Link } from "wouter";

export default function ForYouFeed() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#080609] px-5 py-20 text-white">
      <section className="w-full max-w-2xl overflow-hidden rounded-[2rem] border border-rose-200/20 bg-[radial-gradient(circle_at_top_right,rgba(244,63,94,0.16),transparent_42%),radial-gradient(circle_at_bottom_left,rgba(217,70,239,0.16),transparent_46%),linear-gradient(145deg,#160a10,#070608)] p-7 shadow-[0_28px_90px_-48px_rgba(244,63,94,0.66)] sm:p-10">
        <p className="text-[10px] font-black uppercase tracking-[0.22em] text-rose-200">VaultX audience room</p>
        <h1 className="mt-4 text-4xl font-black leading-[0.9] tracking-[-0.065em] sm:text-5xl">The fan feed is not open yet.</h1>
        <p className="mt-6 max-w-xl text-base leading-relaxed text-zinc-300">CreatorVault will not show made-up followers, likes, views, subscriptions, prices, or paid unlocks. This room opens only when real creator-owned drops and the full supporter path can stand together.</p>
        <div className="mt-7 rounded-2xl border border-white/10 bg-black/25 p-5">
          <p className="text-sm font-black text-white">What is real right now</p>
          <p className="mt-2 text-sm leading-relaxed text-zinc-400">Creators can shape their source media inside VaultX. Audience discovery and fan access stay closed until the actual content and money path are ready.</p>
        </div>
        <Link href="/vault-x/studio">
          <a className="mt-7 inline-flex min-h-12 items-center justify-center rounded-xl bg-rose-200 px-5 text-sm font-black text-black transition hover:bg-white">Work from your saved video</a>
        </Link>
      </section>
    </main>
  );
}
