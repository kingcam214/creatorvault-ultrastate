import { Link } from "wouter";

export default function VaultXDistribution() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#080609] px-5 py-20 text-white">
      <section className="w-full max-w-2xl overflow-hidden rounded-[2rem] border border-sky-200/20 bg-[radial-gradient(circle_at_top_right,rgba(56,189,248,0.16),transparent_42%),radial-gradient(circle_at_bottom_left,rgba(139,92,246,0.14),transparent_46%),linear-gradient(145deg,#07131a,#070708)] p-7 shadow-[0_28px_90px_-48px_rgba(56,189,248,0.65)] sm:p-10">
        <p className="text-[10px] font-black uppercase tracking-[0.22em] text-sky-200">VaultX distribution</p>
        <h1 className="mt-4 text-4xl font-black leading-[0.9] tracking-[-0.065em] sm:text-5xl">Distribution is not open from this room yet.</h1>
        <p className="mt-6 max-w-xl text-base leading-relaxed text-zinc-300">CreatorVault will not collect a social account, take a raw media link, create a posting job, show a tracking result, or send a post until every channel connection and every asset has a real verified path behind it.</p>
        <div className="mt-7 rounded-2xl border border-white/10 bg-black/25 p-5">
          <p className="text-sm font-black text-white">What stays protected</p>
          <p className="mt-2 text-sm leading-relaxed text-zinc-400">No creator-owned media can leave CreatorVault from a form that cannot prove where it is going, how it is being handled, or what actually happened after it left.</p>
        </div>
        <Link href="/social-hub">
          <a className="mt-7 inline-flex min-h-12 items-center justify-center rounded-xl bg-sky-200 px-5 text-sm font-black text-black transition hover:bg-white">Open Social Empire</a>
        </Link>
      </section>
    </main>
  );
}
