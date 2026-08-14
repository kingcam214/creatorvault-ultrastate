import { trpc } from "@/lib/trpc";
import { Crown, DollarSign, ShieldCheck, WalletCards } from "lucide-react";

const T = {
  bg: "#070707",
  panel: "#101010",
  border: "#242424",
  gold: "#d5b26a",
  muted: "#a19b90",
  green: "#70d6a1",
};

function money(value: unknown): string {
  const parsed = Number.parseFloat(String(value ?? 0));
  return `$${Number.isFinite(parsed) ? parsed.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "0.00"}`;
}

export function KingMoneyMission() {
  const dashboard = trpc.challengeAutomation.getChallengeDashboard.useQuery(undefined, { refetchInterval: 30_000 });
  const data = dashboard.data;
  const challenge = data?.activeChallenge as any;
  const transactions = Array.isArray(data?.recentTransactions) ? data.recentTransactions as any[] : [];
  const verifiedRevenue = transactions.reduce((sum, tx) => sum + (Number.parseFloat(String(tx.amount ?? 0)) || 0), 0);
  const targetRevenue = Number.parseFloat(String(challenge?.target_revenue ?? 0)) || 0;
  const progress = targetRevenue > 0 ? Math.min(100, (verifiedRevenue / targetRevenue) * 100) : 0;

  return (
    <main className="min-h-screen bg-[#070707] px-5 pb-20 pt-24 text-[#f7f1e7] sm:px-8 lg:px-12">
      <section className="mx-auto max-w-6xl overflow-hidden rounded-[2rem] border border-[#3a3125] bg-[radial-gradient(circle_at_85%_15%,rgba(213,178,106,0.16),transparent_32%),linear-gradient(145deg,#14110d,#090909)] p-6 shadow-[0_30px_90px_-45px_rgba(213,178,106,0.75)] sm:p-10">
        <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-[#d5b26a]/30 bg-[#d5b26a]/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-[#f4d79a]"><Crown className="h-3.5 w-3.5" /> Revenue Truth Room</div>
            <h1 className="mt-5 text-4xl font-black tracking-[-0.06em] text-white sm:text-6xl">Money only counts<br />when it lands.</h1>
            <p className="mt-5 max-w-2xl text-base leading-relaxed text-[#c9c1b3] sm:text-lg">This room shows only revenue records that reached CreatorVault’s verified challenge ledger. It does not turn an agent run, a plan, or a forecast into money.</p>
          </div>
          <div className="rounded-2xl border border-[#d5b26a]/20 bg-black/30 p-5 lg:min-w-[250px]">
            <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.15em] text-[#a19b90]"><ShieldCheck className="h-4 w-4 text-[#70d6a1]" /> Verified challenge ledger</div>
            <p className="mt-3 text-4xl font-black text-[#d5b26a]">{money(verifiedRevenue)}</p>
            <p className="mt-1 text-xs font-bold text-[#a19b90]">{transactions.length} recorded transaction{transactions.length === 1 ? "" : "s"} in this live view</p>
          </div>
        </div>
      </section>

      <section className="mx-auto mt-8 grid max-w-6xl gap-6 lg:grid-cols-[1.1fr_.9fr]">
        <div className="rounded-3xl border border-white/10 bg-[#101010] p-6 sm:p-8">
          <div className="flex items-start justify-between gap-5"><div><p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#a19b90]">Current money target</p><h2 className="mt-2 text-2xl font-black text-white">{challenge?.title || "No active target recorded"}</h2></div><WalletCards className="h-6 w-6 text-[#d5b26a]" /></div>
          <div className="mt-8 flex items-end justify-between gap-5"><div><p className="text-4xl font-black text-[#d5b26a]">{money(verifiedRevenue)}</p><p className="mt-1 text-sm text-[#a19b90]">of {money(targetRevenue)} recorded in the verified ledger</p></div><p className="text-xl font-black text-white">{progress.toFixed(1)}%</p></div>
          <div className="mt-5 h-3 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-gradient-to-r from-[#8a6628] via-[#d5b26a] to-[#f6d992]" style={{ width: `${progress}%` }} /></div>
          <p className="mt-5 text-sm leading-relaxed text-[#a19b90]">{transactions.length ? "These are ledger records, not estimated agent revenue." : "No verified challenge transaction is recorded yet. The target stays visible, but it is not presented as progress until a real ledger entry arrives."}</p>
        </div>

        <div className="rounded-3xl border border-white/10 bg-[#101010] p-6 sm:p-8">
          <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#a19b90]">Agent execution</p>
          <h2 className="mt-2 text-2xl font-black text-white">Held until each move has proof.</h2>
          <p className="mt-4 text-sm leading-relaxed text-[#c9c1b3]">The old full-swarm trigger could run unverified agent paths and then show operational estimates beside real money. It is held. No new agent cycle can start from this room until each exposed action has a real source, a receipt, and a controlled spend boundary.</p>
          <div className="mt-6 rounded-2xl border border-amber-200/15 bg-amber-200/5 p-4 text-sm font-bold text-amber-100">No agent activity is being called revenue here.</div>
        </div>
      </section>

      <section className="mx-auto mt-6 max-w-6xl rounded-3xl border border-white/10 bg-[#101010] p-6 sm:p-8">
        <div className="flex items-center gap-3"><DollarSign className="h-5 w-5 text-[#d5b26a]" /><div><p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#a19b90]">Recent verified transaction records</p><h2 className="mt-1 text-2xl font-black text-white">What actually landed</h2></div></div>
        {dashboard.isLoading ? <p className="mt-8 text-sm font-bold text-[#a19b90]">Reading the verified ledger…</p> : transactions.length ? <div className="mt-7 divide-y divide-white/10">{transactions.map((tx, index) => <div key={`${tx.id || tx.recorded_at || "transaction"}-${index}`} className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between"><div><p className="font-black text-white">{tx.source || "Verified CreatorVault transaction"}</p><p className="mt-1 text-sm text-[#a19b90]">{tx.description || "Recorded in the live challenge ledger"}</p></div><div className="text-left sm:text-right"><p className="text-xl font-black text-[#d5b26a]">{money(tx.amount)}</p><p className="mt-1 text-xs text-[#a19b90]">{tx.recorded_at ? new Date(tx.recorded_at).toLocaleDateString() : "Recorded"}</p></div></div>)}</div> : <div className="mt-7 rounded-2xl border border-dashed border-white/15 bg-black/20 p-7 text-center"><p className="font-black text-white">No verified challenge transaction is here yet.</p><p className="mt-2 text-sm leading-relaxed text-[#a19b90]">When a real money event reaches the ledger, it will show here. Until then, this room stays honest.</p></div>}
      </section>
    </main>
  );
}

export default KingMoneyMission;
