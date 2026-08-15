import { Link } from "wouter";
import { useAuth } from "@/contexts/AuthContext";

export default function Messages() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return <main className="min-h-screen bg-[#09070f]" aria-busy="true" />;
  }

  if (!user) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#09070f] p-6 text-center text-white">
        <section className="max-w-md rounded-3xl border border-white/10 bg-white/[0.03] p-8 shadow-[0_20px_70px_-36px_rgba(168,85,247,0.5)]">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-violet-200">Private messages</p>
          <h1 className="mt-3 text-3xl font-black tracking-[-0.05em]">Your private room is waiting.</h1>
          <p className="mt-4 text-sm leading-relaxed text-zinc-300">Enter CreatorVault to see the parts of your world that are ready for you.</p>
        </section>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#09070f] px-5 py-20 text-white">
      <section className="w-full max-w-2xl overflow-hidden rounded-[2rem] border border-violet-200/20 bg-[radial-gradient(circle_at_top_right,rgba(167,139,250,0.16),transparent_42%),linear-gradient(145deg,#121019,#08070b)] p-7 shadow-[0_28px_90px_-48px_rgba(168,85,247,0.68)] sm:p-10">
        <p className="text-[10px] font-black uppercase tracking-[0.22em] text-violet-200">Private messages</p>
        <h1 className="mt-4 text-4xl font-black leading-[0.9] tracking-[-0.065em] sm:text-5xl">A real private message lane is not open yet.</h1>
        <p className="mt-6 max-w-xl text-base leading-relaxed text-zinc-300">CreatorVault will not sell message access, send a blast, or collect a payment until one real path can prove what the fan receives and what belongs to the creator.</p>
        <div className="mt-7 rounded-2xl border border-white/10 bg-black/25 p-5">
          <p className="text-sm font-black text-white">What you can use right now</p>
          <p className="mt-2 text-sm leading-relaxed text-zinc-400">Start from a saved video, shape the moment, and keep your next private release tied to the source you own.</p>
        </div>
        <Link href="/vault-x/studio">
          <a className="mt-7 inline-flex min-h-12 items-center justify-center rounded-xl bg-violet-200 px-5 text-sm font-black text-black transition hover:bg-white">Make your next private moment</a>
        </Link>
      </section>
    </main>
  );
}
