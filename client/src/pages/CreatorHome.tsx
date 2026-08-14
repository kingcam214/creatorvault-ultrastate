import { Link } from "wouter";
import { ArrowUpRight, BarChart3, Clapperboard, Crown, Layers3, Radio, Sparkles, WalletCards } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/contexts/AuthContext";
import { CreatorVaultRoute } from "@/lib/productArchitecture";

const lanes = [
  { id: "create", eyebrow: "01 · CREATE", title: "Work from what you own", copy: "Start with a saved video, choose its direction, and make it hit harder.", href: CreatorVaultRoute.bodyCinema, icon: Clapperboard, accent: "from-fuchsia-400/25 to-violet-900/15" },
  { id: "access", eyebrow: "02 · ACCESS", title: "Turn a moment into access", copy: "Shape a private offer and give it a real home inside VaultX.", href: CreatorVaultRoute.vaultX, icon: Crown, accent: "from-amber-300/20 to-orange-900/10" },
  { id: "reach", eyebrow: "03 · REACH", title: "Build audience with intent", copy: "Make a moment people stop for, then get it ready for the places you show up.", href: CreatorVaultRoute.socialEmpire, icon: Radio, accent: "from-cyan-300/20 to-blue-900/10" },
  { id: "earn", eyebrow: "04 · EARN", title: "Keep the money path visible", copy: "See what is selling, who is staying close, and where your next dollar can come from.", href: CreatorVaultRoute.creatorMoney, icon: WalletCards, accent: "from-emerald-300/20 to-emerald-900/10" },
  { id: "learn", eyebrow: "05 · LEARN", title: "Learn from what happened", copy: "See what pulled people in, then make your next move with more power.", href: CreatorVaultRoute.creatorIntelligence, icon: BarChart3, accent: "from-indigo-300/20 to-indigo-900/10" },
];

function countLabel(value: unknown, singular: string, plural = `${singular}s`) {
  const count = Number(value);
  if (!Number.isFinite(count) || count < 1) return `No ${plural.toLowerCase()} yet`;
  return `${count} ${count === 1 ? singular : plural}`;
}

export default function CreatorHome() {
  const { user } = useAuth();
  const socialSummary = (trpc as any).socialSpine.commandSummary.useQuery(undefined, { retry: false, staleTime: 30_000 });
  const mediaLibrary = (trpc as any).mediaAssets.list.useQuery({ filter: "videos", limit: 4 }, { retry: false, staleTime: 30_000 });
  const summary = socialSummary.data as any;
  const mediaItems = (mediaLibrary.data?.items || mediaLibrary.data || []) as unknown[];
  const nativePosts = summary?.native?.posts ?? summary?.posts ?? 0;
  const distributionDrafts = summary?.distribution?.drafts ?? summary?.distribution?.ready ?? 0;
  const packages = summary?.packages?.count ?? summary?.packages ?? 0;

  return (
    <main className="min-h-screen bg-[#08080d] px-4 pb-16 pt-24 text-white sm:px-6 lg:px-8">
      <section className="mx-auto max-w-7xl overflow-hidden rounded-[2rem] border border-white/10 bg-[radial-gradient(circle_at_12%_0%,rgba(216,180,254,.22),transparent_35%),radial-gradient(circle_at_90%_30%,rgba(34,211,238,.12),transparent_30%),linear-gradient(145deg,#15111d,#08080d_64%)] p-6 shadow-2xl shadow-black/35 sm:p-10">
        <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl"><div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-black/25 px-3 py-2 text-[10px] font-black uppercase tracking-[.2em] text-fuchsia-100"><Sparkles className="h-3.5 w-3.5" /> CreatorVault / Creator OS</div><h1 className="mt-5 text-4xl font-black tracking-[-.06em] sm:text-6xl">Welcome back, {user?.name || "Creator"}.</h1><p className="mt-4 max-w-2xl text-sm leading-relaxed text-zinc-300 sm:text-base">This is where your next move starts. Take a saved moment, make it impossible to ignore, put it where it belongs, and follow the money it brings back.</p></div>
          <div className="grid min-w-[280px] grid-cols-3 gap-2 text-center"><RecordCard label="Saved videos" value={countLabel(mediaItems.length, "video")} /><RecordCard label="Visible moments" value={countLabel(nativePosts, "moment")} /><RecordCard label="Drops waiting on you" value={countLabel(distributionDrafts, "drop")} /></div>
        </div>
      </section>

      <section className="mx-auto mt-7 max-w-7xl"><div className="mb-4 flex items-center justify-between"><div><p className="text-[10px] font-black uppercase tracking-[.18em] text-zinc-500">Your next move</p><h2 className="mt-1 text-2xl font-black tracking-tight">Pick where you want to make your mark.</h2></div><Link href={CreatorVaultRoute.mediaVault}><a className="inline-flex items-center gap-2 text-sm font-black text-cyan-200 hover:text-white">See your saved videos <ArrowUpRight className="h-4 w-4" /></a></Link></div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">{lanes.map((lane) => { const Icon = lane.icon; return <Link key={lane.id} href={lane.href}><a className={`group flex min-h-64 flex-col rounded-[1.65rem] border border-white/10 bg-gradient-to-br ${lane.accent} p-5 transition hover:-translate-y-1 hover:border-white/30`}><div className="flex items-start justify-between"><span className="text-[10px] font-black tracking-[.16em] text-zinc-400">{lane.eyebrow}</span><Icon className="h-5 w-5 text-white" /></div><h3 className="mt-10 text-xl font-black tracking-tight">{lane.title}</h3><p className="mt-3 text-sm leading-relaxed text-zinc-300">{lane.copy}</p><span className="mt-auto inline-flex items-center gap-2 pt-7 text-sm font-black text-white">Step inside <ArrowUpRight className="h-4 w-4 transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5" /></span></a></Link>; })}</div>
      </section>

      <section className="mx-auto mt-7 grid max-w-7xl gap-4 lg:grid-cols-[1.15fr_.85fr]"><div className="rounded-[1.75rem] border border-white/10 bg-white/[.035] p-6"><div className="flex items-center justify-between"><div><p className="text-[10px] font-black uppercase tracking-[.18em] text-zinc-500">Start with what is yours</p><h2 className="mt-1 text-xl font-black">Your saved videos</h2></div><Layers3 className="h-5 w-5 text-fuchsia-200" /></div><p className="mt-3 text-sm leading-relaxed text-zinc-400">{mediaItems.length ? "Your next move can start with a video already in CreatorVault. Take it into Body Cinema or get its social moment ready without bringing it in again." : "Your saved videos will show up here the moment they are ready for you."}</p><div className="mt-5 flex flex-wrap gap-2"><Link href={CreatorVaultRoute.bodyCinema}><a className="rounded-xl bg-white px-4 py-3 text-sm font-black text-black hover:bg-fuchsia-100">Start with Body Cinema</a></Link><Link href={CreatorVaultRoute.socialEmpire}><a className="rounded-xl border border-white/15 px-4 py-3 text-sm font-black text-white hover:bg-white/10">Get an audience moment ready</a></Link></div></div>
        <div className="rounded-[1.75rem] border border-cyan-200/15 bg-cyan-200/[.045] p-6"><p className="text-[10px] font-black uppercase tracking-[.18em] text-cyan-200">Social Empire</p><h2 className="mt-2 text-xl font-black">{countLabel(packages, "drop")}</h2><p className="mt-3 text-sm leading-relaxed text-zinc-300">Your CreatorVault moment and your social versions stay separate. Nothing leaves CreatorVault until you decide.</p><Link href={CreatorVaultRoute.socialEmpire}><a className="mt-6 inline-flex items-center gap-2 text-sm font-black text-cyan-100 hover:text-white">Open Social Empire <ArrowUpRight className="h-4 w-4" /></a></Link></div>
      </section>
    </main>
  );
}

function RecordCard({ label, value }: { label: string; value: string }) {
  return <div className="rounded-xl border border-white/10 bg-black/25 px-3 py-3"><p className="text-[10px] font-black uppercase tracking-[.13em] text-zinc-500">{label}</p><p className="mt-2 text-xs font-bold leading-tight text-white">{value}</p></div>;
}
