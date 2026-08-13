import { useMemo } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import {
  Activity,
  ArrowUpRight,
  BadgeCheck,
  BrainCircuit,
  CircleDollarSign,
  Clapperboard,
  Crown,
  Eye,
  Gauge,
  LockKeyhole,
  Radar,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Target,
  UsersRound,
  Video,
  Wallet,
} from "lucide-react";
import { toast } from "sonner";

const WAVE_GRADIENTS = [
  "from-cyan-400/20 via-blue-500/5 to-transparent",
  "from-emerald-400/20 via-teal-500/5 to-transparent",
  "from-amber-300/20 via-orange-500/5 to-transparent",
  "from-fuchsia-400/20 via-purple-500/5 to-transparent",
  "from-indigo-400/20 via-violet-500/5 to-transparent",
];

type Weapon = {
  id: string;
  name: string;
  mission: string;
  proof: string;
  icon: typeof Activity;
  tone: string;
  run?: () => void;
  disabled?: boolean;
};

function CommandMetric({ label, value, detail, accent }: { label: string; value: string | number; detail: string; accent: string }) {
  return (
    <div className="relative overflow-hidden rounded-[1.4rem] border border-white/10 bg-white/[0.045] px-5 py-5 shadow-2xl shadow-black/20">
      <div className={`absolute inset-x-0 top-0 h-px bg-gradient-to-r ${accent}`} />
      <p className="text-[10px] font-black uppercase tracking-[0.24em] text-white/45">{label}</p>
      <p className="mt-2 text-4xl font-black tracking-[-0.055em] text-white">{value}</p>
      <p className="mt-2 text-sm leading-5 text-white/55">{detail}</p>
    </div>
  );
}

export default function AgentCommand() {
  const { user, isLoading: authLoading } = useAuth();
  const [, setLocation] = useLocation();
  const command = trpc.agentExecutor.getCommandStatus.useQuery(undefined, {
    enabled: Boolean(user && (user.role === "king" || user.role === "admin")),
    refetchInterval: 30_000,
  });

  const refresh = () => command.refetch();
  const weaponSuccess = (name: string) => {
    toast.success(`${name} finished. Your proof record is saved.`);
    refresh();
  };
  const weaponError = (error: { message: string }) => toast.error(error.message);

  const stripeTruth = trpc.agentExecutor.runStripeRevenueTruth.useMutation({ onSuccess: () => weaponSuccess("Money Truth"), onError: weaponError });
  const devTruth = trpc.agentExecutor.runDevGuardianTruth.useMutation({ onSuccess: () => weaponSuccess("Platform Check"), onError: weaponError });
  const performanceTruth = trpc.agentExecutor.runPerformanceIntelligenceTruth.useMutation({ onSuccess: () => weaponSuccess("Performance Truth"), onError: weaponError });
  const cloneTruth = trpc.agentExecutor.runCloneIdentityGuardianTruth.useMutation({ onSuccess: () => weaponSuccess("Clone Truth"), onError: weaponError });
  const vaultxTruth = trpc.agentExecutor.runVaultxRevenueIntelligenceTruth.useMutation({ onSuccess: () => weaponSuccess("VaultX Money Truth"), onError: weaponError });

  const weapons = useMemo<Weapon[]>(() => [
    {
      id: "money",
      name: "Money Truth",
      mission: "Reads the real Stripe picture—charges, active subscriptions, and available cash—without touching a payment.",
      proof: "Read only. No charges. No transfers. No made-up revenue.",
      icon: CircleDollarSign,
      tone: "text-emerald-300 bg-emerald-400/10 border-emerald-300/20",
      run: () => stripeTruth.mutate(),
    },
    {
      id: "vaultx",
      name: "VaultX Money Truth",
      mission: "Reads paid-drop packages, quality state, unlocks, recorded earnings, and the creator’s 85% share.",
      proof: "Read only. No offer, checkout, campaign, or message is created.",
      icon: Wallet,
      tone: "text-amber-200 bg-amber-300/10 border-amber-200/20",
      run: () => vaultxTruth.mutate(),
    },
    {
      id: "performance",
      name: "Performance Truth",
      mission: "Reads real Social Empire packages, approvals, distribution records, audience signals, and paid unlocks.",
      proof: "Read only. Nothing posts. Nothing sends. Nothing is invented.",
      icon: Gauge,
      tone: "text-cyan-200 bg-cyan-300/10 border-cyan-200/20",
      run: () => performanceTruth.mutate(),
    },
    {
      id: "clone",
      name: "Clone Truth",
      mission: "Checks KingCam identity direction, playable clone footage, render states, and training records.",
      proof: "Read only. No provider call, training start, or credit use.",
      icon: Video,
      tone: "text-fuchsia-200 bg-fuchsia-300/10 border-fuchsia-200/20",
      run: () => cloneTruth.mutate(),
    },
    {
      id: "platform",
      name: "Platform Check",
      mission: "Checks the public CreatorVault release, response time, and live safety switches.",
      proof: "Read only. It cannot change the platform.",
      icon: Radar,
      tone: "text-indigo-200 bg-indigo-300/10 border-indigo-200/20",
      run: () => devTruth.mutate(),
    },
    {
      id: "growth",
      name: "Creator Growth",
      mission: "Builds a growth brief from a real saved video and its own Body Cinema understanding.",
      proof: "Starts inside Body Cinema with a real source. It never posts or messages anyone.",
      icon: Sparkles,
      tone: "text-violet-200 bg-violet-300/10 border-violet-200/20",
      disabled: true,
    },
  ], [stripeTruth, vaultxTruth, performanceTruth, cloneTruth, devTruth]);

  if (authLoading) {
    return <div className="min-h-screen bg-[#050509]" />;
  }

  if (!user || (user.role !== "king" && user.role !== "admin")) {
    return (
      <main className="min-h-screen bg-[#050509] px-6 py-20 text-white">
        <div className="mx-auto max-w-md rounded-[2rem] border border-white/10 bg-white/[0.045] p-8 text-center">
          <LockKeyhole className="mx-auto h-10 w-10 text-amber-200" />
          <h1 className="mt-5 text-2xl font-black">Private Command Room</h1>
          <p className="mt-3 text-sm leading-6 text-white/55">This room is reserved for the owner command team.</p>
          <Button onClick={() => setLocation("/")} className="mt-7 bg-white text-black hover:bg-white/90">Return home</Button>
        </div>
      </main>
    );
  }

  const status = command.data;
  const running = [stripeTruth, devTruth, performanceTruth, cloneTruth, vaultxTruth].some((mutation) => mutation.isPending);
  const proofRows = status?.latestReceipts || [];

  return (
    <main className="min-h-screen overflow-hidden bg-[#050509] text-white">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-28 -top-24 h-[32rem] w-[32rem] rounded-full bg-cyan-500/10 blur-[130px]" />
        <div className="absolute right-[-10rem] top-[16rem] h-[34rem] w-[34rem] rounded-full bg-fuchsia-500/10 blur-[150px]" />
        <div className="absolute bottom-[-16rem] left-[18%] h-[34rem] w-[34rem] rounded-full bg-amber-300/[0.06] blur-[150px]" />
      </div>

      <div className="relative mx-auto max-w-7xl px-4 pb-16 pt-6 sm:px-6 lg:px-8">
        <header className="flex flex-col gap-5 border-b border-white/10 pb-8 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <div className="flex items-center gap-3 text-amber-100/80">
              <Crown className="h-4 w-4" />
              <span className="text-[10px] font-black uppercase tracking-[0.3em]">KingCam private command</span>
            </div>
            <h1 className="mt-4 text-5xl font-black tracking-[-0.075em] sm:text-6xl">Empire Command</h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-white/60 sm:text-lg">
              Your agent force stays held until every weapon has a real source, a clear mission, your approval, and proof of what it got done.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button variant="outline" onClick={() => setLocation("/owner-control")} className="h-11 rounded-full border-white/15 bg-white/[0.04] px-5 text-white hover:bg-white/10">
              Owner controls <ArrowUpRight className="ml-2 h-4 w-4" />
            </Button>
            <Button onClick={refresh} disabled={command.isFetching} className="h-11 rounded-full bg-white px-5 font-bold text-black hover:bg-white/90">
              <RefreshCw className={`mr-2 h-4 w-4 ${command.isFetching ? "animate-spin" : ""}`} /> Refresh truth
            </Button>
          </div>
        </header>

        <section className="mt-7 grid grid-cols-1 gap-4 md:grid-cols-3">
          <CommandMetric label="Force held" value={status?.heldCount ?? "—"} detail="Names do not move until their mission is proven." accent="from-amber-300 via-amber-100/60 to-transparent" />
          <CommandMetric label="On real missions" value={status?.activeCount ?? "—"} detail="Each active weapon must leave a saved proof record." accent="from-cyan-300 via-cyan-100/60 to-transparent" />
          <CommandMetric label="Automatic movement" value={status?.autonomousExecutionEnabled ? "ON" : "OFF"} detail={status?.autonomousExecutionEnabled ? "This needs review." : "Your approval is still the gate."} accent="from-fuchsia-300 via-fuchsia-100/60 to-transparent" />
        </section>

        <section className="mt-8 rounded-[2rem] border border-white/10 bg-gradient-to-br from-white/[0.07] to-white/[0.025] p-5 sm:p-7">
          <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="flex items-center gap-2 text-cyan-200"><ShieldCheck className="h-5 w-5" /><span className="text-xs font-black uppercase tracking-[0.22em]">Power with proof</span></div>
              <h2 className="mt-3 text-2xl font-black tracking-[-0.04em]">No more fake “active” agents.</h2>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-white/55">Every command below either reads real CreatorVault truth or begins with an exact saved video. Nothing here posts, messages, spends, opens checkout, or starts a provider run by surprise.</p>
            </div>
            <div className="shrink-0 rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white/65">
              <div className="flex items-center gap-2 font-bold text-white"><BadgeCheck className="h-4 w-4 text-emerald-300" /> Owner approval protected</div>
              <p className="mt-1 text-xs">Every move leaves a proof record.</p>
            </div>
          </div>
        </section>

        <section className="mt-8">
          <div className="flex items-end justify-between gap-5">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.26em] text-white/40">Ready weapons</p>
              <h2 className="mt-2 text-3xl font-black tracking-[-0.05em]">Ask the right question. Get the real answer.</h2>
            </div>
            {running && <div className="hidden items-center gap-2 text-sm text-cyan-200 sm:flex"><Activity className="h-4 w-4 animate-pulse" /> Working on a truth check</div>}
          </div>
          <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {weapons.map((weapon, index) => {
              const Icon = weapon.icon;
              return (
                <article key={weapon.id} className="group relative min-h-[250px] overflow-hidden rounded-[1.7rem] border border-white/10 bg-[#0b0b12] p-5 transition duration-300 hover:-translate-y-1 hover:border-white/20 hover:shadow-2xl hover:shadow-black/40">
                  <div className={`absolute inset-x-0 top-0 h-28 bg-gradient-to-b ${WAVE_GRADIENTS[index % WAVE_GRADIENTS.length]}`} />
                  <div className="relative flex h-full flex-col">
                    <div className="flex items-start justify-between gap-4">
                      <div className={`flex h-11 w-11 items-center justify-center rounded-2xl border ${weapon.tone}`}><Icon className="h-5 w-5" /></div>
                      <span className="rounded-full border border-white/10 bg-black/20 px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.16em] text-white/55">Proof first</span>
                    </div>
                    <h3 className="mt-6 text-xl font-black tracking-[-0.035em]">{weapon.name}</h3>
                    <p className="mt-3 text-sm leading-6 text-white/60">{weapon.mission}</p>
                    <p className="mt-4 text-xs leading-5 text-white/38">{weapon.proof}</p>
                    <div className="mt-auto pt-5">
                      {weapon.disabled ? (
                        <Button onClick={() => setLocation("/vault-x/studio")} variant="outline" className="w-full rounded-xl border-white/15 bg-white/[0.04] text-white hover:bg-white/10">Open Body Cinema <ArrowUpRight className="ml-2 h-4 w-4" /></Button>
                      ) : (
                        <Button onClick={weapon.run} disabled={running} className="w-full rounded-xl bg-white text-black hover:bg-white/90 disabled:bg-white/40">{running ? "Working on it" : `Run ${weapon.name}`}</Button>
                      )}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </section>

        <section className="mt-10 grid grid-cols-1 gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="rounded-[1.7rem] border border-white/10 bg-white/[0.035] p-5 sm:p-6">
            <div className="flex items-center gap-3"><Eye className="h-5 w-5 text-cyan-200" /><div><p className="text-[10px] font-black uppercase tracking-[0.23em] text-white/40">Proof trail</p><h2 className="mt-1 text-xl font-black">What the force actually did</h2></div></div>
            <div className="mt-5 divide-y divide-white/8">
              {proofRows.length ? proofRows.map((proof: any) => (
                <div key={proof.id} className="flex gap-4 py-4 first:pt-0">
                  <div className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-emerald-300 shadow-[0_0_18px_rgba(110,231,183,0.9)]" />
                  <div className="min-w-0"><p className="font-bold text-white">{proof.agentName || "Agent Command"}</p><p className="mt-1 text-sm leading-5 text-white/55">{proof.outcomeSummary || "A saved proof record is ready."}</p><p className="mt-2 text-xs text-white/35">{proof.finishedAt ? new Date(proof.finishedAt).toLocaleString() : "Time recorded"}</p></div>
                </div>
              )) : <p className="py-8 text-sm text-white/45">No proof records yet. The force is held until the first approved mission runs.</p>}
            </div>
          </div>

          <div className="rounded-[1.7rem] border border-amber-100/15 bg-gradient-to-b from-amber-200/[0.08] to-transparent p-5 sm:p-6">
            <Target className="h-7 w-7 text-amber-200" />
            <p className="mt-5 text-[10px] font-black uppercase tracking-[0.25em] text-amber-100/55">The standard</p>
            <h2 className="mt-2 text-2xl font-black tracking-[-0.045em]">A weapon earns its place.</h2>
            <p className="mt-4 text-sm leading-6 text-white/60">A name is not a weapon. A screen is not a weapon. A database record is not a weapon. It becomes real only when it touches a real source, does the approved job, and leaves proof you can inspect.</p>
            <div className="mt-6 flex items-center gap-3 text-sm font-bold text-amber-100"><UsersRound className="h-5 w-5" /> 49 soldiers. One command standard.</div>
          </div>
        </section>
      </div>
    </main>
  );
}
