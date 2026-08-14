import { useMemo } from "react";
import { Crown, LockKeyhole, ShieldCheck, Users } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { trpc } from "@/lib/trpc";

export default function CreatorSubscriptions() {
  const { user } = useAuth();
  const { data: tiers } = trpc.subscriptions.getCreatorTiers.useQuery(
    { creatorId: user?.id || 0 },
    { enabled: !!user }
  );

  const savedTiers = useMemo(() => Array.isArray(tiers) ? tiers : [], [tiers]);

  if (!user) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#060609] px-6 pt-20 text-center text-white">
        <div className="max-w-md">
          <p className="text-sm font-black uppercase tracking-[0.18em] text-amber-200">CreatorVault memberships</p>
          <h1 className="mt-4 text-4xl font-black tracking-[-0.055em]">Your membership room is private.</h1>
          <p className="mt-4 text-base leading-relaxed text-zinc-400">Come back through your CreatorVault account to see the membership ideas connected to your name.</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen overflow-hidden bg-[#060609] pb-20 pt-20 text-white">
      <section className="border-b border-white/10 bg-[radial-gradient(circle_at_84%_8%,rgba(245,158,11,0.18),transparent_29%),radial-gradient(circle_at_10%_100%,rgba(20,184,166,0.12),transparent_35%),#0a0b0e]">
        <div className="mx-auto max-w-6xl px-5 py-12 sm:px-8 sm:py-16 lg:px-12">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-amber-200/25 bg-amber-200/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-amber-100">
              <Crown className="h-3.5 w-3.5" /> Your Membership Door
            </div>
            <h1 className="mt-5 text-5xl font-black leading-[0.84] tracking-[-0.075em] sm:text-7xl">Turn real attention<br /><span className="text-amber-200">into a real membership.</span></h1>
            <p className="mt-6 max-w-2xl text-base leading-relaxed text-zinc-300 sm:text-lg">A membership is only real when someone can pay, their access changes, and the money is recorded. That complete path is not connected in this room yet, so nothing here is being sold or promised.</p>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-6 px-5 py-9 sm:px-8 lg:grid-cols-[minmax(0,1.08fr)_minmax(320px,.92fr)] lg:px-12">
        <div className="rounded-3xl border border-amber-200/20 bg-[radial-gradient(circle_at_top_right,rgba(245,158,11,0.12),transparent_45%),#101116] p-6 shadow-[0_25px_80px_-42px_rgba(245,158,11,0.45)] sm:p-8">
          <div className="flex items-start gap-3">
            <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-amber-200/10 text-amber-100"><LockKeyhole className="h-5 w-5" /></span>
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.16em] text-amber-200">What is real today</p>
              <h2 className="mt-1 text-2xl font-black tracking-[-0.045em] text-white">No membership is open for sale yet.</h2>
            </div>
          </div>
          <p className="mt-6 max-w-2xl text-sm leading-relaxed text-zinc-300">CreatorVault will not take a fan’s money, open access, or show you a payout from a membership until those three moments are connected and proven together.</p>
          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            {[
              ["A fan can pay", ShieldCheck],
              ["Access changes after payment", Users],
              ["Your money is recorded", Crown],
            ].map(([label, Icon]) => {
              const StepIcon = Icon as typeof ShieldCheck;
              return <div key={label as string} className="rounded-2xl border border-white/10 bg-black/25 p-4"><StepIcon className="h-4 w-4 text-amber-200" /><p className="mt-3 text-xs font-black leading-snug text-white">{label as string}</p></div>;
            })}
          </div>
          <p className="mt-6 text-xs leading-relaxed text-zinc-500">Your saved ideas remain below. Nothing was deleted, and no membership action can change money or access from this screen.</p>
        </div>

        <aside className="rounded-3xl border border-white/10 bg-[#0d1015] p-6 sm:p-8">
          <p className="text-[10px] font-black uppercase tracking-[0.16em] text-zinc-500">Your membership ideas</p>
          <p className="mt-3 text-4xl font-black tracking-[-0.06em] text-white">{savedTiers.length}</p>
          <p className="mt-2 text-sm leading-relaxed text-zinc-400">{savedTiers.length === 1 ? "One saved membership idea is waiting for a real way to sell and unlock it." : `${savedTiers.length} saved membership ideas are waiting for a real way to sell and unlock them.`}</p>
          <div className="mt-6 border-t border-white/10 pt-5">
            <p className="text-[10px] font-black uppercase tracking-[0.16em] text-zinc-500">Money from memberships</p>
            <p className="mt-2 text-sm font-bold text-zinc-300">Not shown here until a verified sale can create the record.</p>
          </div>
        </aside>
      </section>

      <section className="mx-auto max-w-6xl px-5 pb-4 sm:px-8 lg:px-12">
        <div className="mb-5 flex items-center gap-4"><h2 className="text-2xl font-black tracking-[-0.045em] text-white">Saved membership ideas</h2><div className="h-px flex-1 bg-gradient-to-r from-white/10 to-transparent" /></div>
        {savedTiers.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-white/15 bg-white/[0.025] p-8 text-center">
            <p className="text-lg font-black text-white">Nothing is waiting here yet.</p>
            <p className="mx-auto mt-3 max-w-lg text-sm leading-relaxed text-zinc-400">When the real payment-and-access path is ready, this room will be where you shape a membership that your fans can actually join.</p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {savedTiers.map((tier) => (
              <article key={tier.id} className="rounded-3xl border border-white/10 bg-[#0d1015] p-6">
                <p className="text-[10px] font-black uppercase tracking-[0.16em] text-zinc-500">Saved idea · not for sale</p>
                <h3 className="mt-3 text-2xl font-black tracking-[-0.045em] text-white">{tier.name}</h3>
                {tier.description ? <p className="mt-3 text-sm leading-relaxed text-zinc-400">{tier.description}</p> : <p className="mt-3 text-sm text-zinc-500">No description saved yet.</p>}
                <p className="mt-5 text-xs font-bold text-amber-100">A real checkout and access path must come first.</p>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
