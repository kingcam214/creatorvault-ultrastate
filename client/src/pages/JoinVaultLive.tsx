import { Link } from "wouter";

export default function JoinVaultLive() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#08070c] px-5 py-20 text-white">
      <section className="w-full max-w-2xl overflow-hidden rounded-[2rem] border border-fuchsia-200/20 bg-[radial-gradient(circle_at_top_right,rgba(217,70,239,0.16),transparent_42%),radial-gradient(circle_at_bottom_left,rgba(124,58,237,0.18),transparent_46%),linear-gradient(145deg,#15101a,#07070a)] p-7 shadow-[0_28px_90px_-48px_rgba(217,70,239,0.75)] sm:p-10">
        <p className="text-[10px] font-black uppercase tracking-[0.22em] text-fuchsia-200">VaultLive</p>
        <h1 className="mt-4 text-4xl font-black leading-[0.9] tracking-[-0.065em] sm:text-5xl">The live room is not open yet.</h1>
        <p className="mt-6 max-w-xl text-base leading-relaxed text-zinc-300">CreatorVault will not promise streaming, tips, payouts, fan access, or audience numbers until one real live path can prove all of it from the broadcast to the creator’s money record.</p>
        <div className="mt-7 rounded-2xl border border-white/10 bg-black/25 p-5">
          <p className="text-sm font-black text-white">What is real right now</p>
          <p className="mt-2 text-sm leading-relaxed text-zinc-400">You can work from the media already inside CreatorVault, shape a premium next moment, and keep it ready for the live room when that full path is truly ready.</p>
        </div>
        <Link href="/vault-x/studio">
          <a className="mt-7 inline-flex min-h-12 items-center justify-center rounded-xl bg-fuchsia-200 px-5 text-sm font-black text-black transition hover:bg-white">Shape your next moment</a>
        </Link>
      </section>
    </main>
  );
}
