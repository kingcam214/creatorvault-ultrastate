import { Link } from "wouter";
import { LockKeyhole, ShieldCheck, Users, ArrowUpRight } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { trpc } from "@/lib/trpc";

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "CV";
}

export default function OutreachCommandCenter() {
  const { user, isLoading } = useAuth();
  const isOwner = user?.id === 6 || user?.id === 33 || user?.role === "king" || user?.role === "admin";
  const privateReview = (trpc as any).creatorOutreach.getPrivateRecruitmentProfiles.useQuery(
    { limit: 100 },
    { enabled: Boolean(isOwner) },
  );
  const relationshipData = (privateReview.data ?? {}) as any;
  const profiles = Array.isArray(relationshipData.profiles) ? relationshipData.profiles : [];

  if (isLoading) return <div className="min-h-screen bg-[#050505]" aria-busy="true" />;

  if (!isOwner) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-[#050505] px-6 text-center">
        <LockKeyhole className="mb-4 h-10 w-10 text-zinc-600" />
        <h1 className="text-2xl font-black text-white">Owner-only relationships</h1>
        <p className="mt-2 max-w-sm text-sm leading-relaxed text-zinc-400">This private room is reserved for Cameron’s creator relationships.</p>
        <Link href="/dashboard"><a className="mt-6 rounded-xl bg-white px-5 py-3 text-sm font-black text-black">Return to Creator OS</a></Link>
      </div>
    );
  }

  return (
    <main className="min-h-screen overflow-hidden bg-[#050505] pb-24 pt-20 text-white">
      <section className="relative border-b border-white/10 bg-[radial-gradient(circle_at_82%_0%,rgba(192,132,252,0.18),transparent_30%),radial-gradient(circle_at_20%_30%,rgba(34,211,238,0.12),transparent_36%)]">
        <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-fuchsia-300/30 bg-fuchsia-300/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-fuchsia-100">
              <LockKeyhole className="h-3.5 w-3.5" /> Private creator relationships
            </div>
            <h1 className="mt-5 text-4xl font-black tracking-[-0.055em] text-white sm:text-6xl">Build the room before you open the doors.</h1>
            <p className="mt-5 max-w-2xl text-base leading-relaxed text-zinc-300 sm:text-lg">
              These are people you plan to bring into CreatorVault yourself. Their audience signals stay private. Nothing here claims they have joined, earned, posted, sold, or agreed to anything.
            </p>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 pt-8 sm:px-6 lg:px-8">
        <div className="grid gap-4 lg:grid-cols-[1.25fr_0.75fr]">
          <div className="rounded-3xl border border-emerald-300/20 bg-[linear-gradient(135deg,rgba(16,185,129,0.14),rgba(5,5,5,0.7))] p-6 sm:p-8">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-300/15 text-emerald-200"><ShieldCheck className="h-6 w-6" /></div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-emerald-200">Relationship protection is live</p>
                <h2 className="mt-2 text-2xl font-black tracking-[-0.04em] text-white">No outreach leaves CreatorVault from this room.</h2>
                <p className="mt-2 text-sm leading-relaxed text-zinc-300">Messages, follow-ups, distribution, public activation, and money claims are held. A creator’s public presence begins only after she chooses to join and controls what becomes visible.</p>
              </div>
            </div>
          </div>
          <div className="rounded-3xl border border-white/10 bg-white/[0.035] p-6 sm:p-8">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-zinc-500">Private launch list</p>
            <div className="mt-4 flex items-end gap-3"><span className="text-5xl font-black tracking-[-0.06em] text-white">{profiles.length}</span><span className="pb-1 text-sm font-bold text-zinc-400">relationships in review</span></div>
            <p className="mt-4 text-sm leading-relaxed text-zinc-400">Audience and engagement are relationship notes—not promises of revenue, enrollment, or sales.</p>
          </div>
        </div>

        <div className="mt-10 flex items-center justify-between gap-4">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-fuchsia-200">Your private list</p>
            <h2 className="mt-2 text-3xl font-black tracking-[-0.05em] text-white">Creator relationships</h2>
          </div>
          <Link href="/king/content"><a className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-black text-white transition hover:bg-white/10">Open creation arsenal <ArrowUpRight className="h-4 w-4" /></a></Link>
        </div>

        {privateReview.isLoading ? (
          <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">{Array.from({ length: 6 }).map((_, index) => <div key={index} className="h-52 animate-pulse rounded-3xl border border-white/5 bg-white/[0.035]" />)}</div>
        ) : profiles.length > 0 ? (
          <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {profiles.map((profile: any) => (
              <article key={profile.source_id ?? profile.handle} className="group relative overflow-hidden rounded-3xl border border-white/10 bg-[linear-gradient(145deg,rgba(255,255,255,0.07),rgba(255,255,255,0.02))] p-6 transition hover:border-fuchsia-300/35 hover:bg-white/[0.06]">
                <div className="absolute -right-8 -top-8 h-28 w-28 rounded-full bg-fuchsia-400/10 blur-3xl transition group-hover:bg-fuchsia-400/20" />
                <div className="relative flex items-start gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-fuchsia-300 to-violet-500 text-sm font-black text-black">{initials(String(profile.display_name || profile.handle || "Creator"))}</div>
                  <div className="min-w-0 flex-1"><h3 className="truncate text-lg font-black text-white">{profile.display_name || profile.handle}</h3><p className="mt-1 text-xs font-bold uppercase tracking-[0.13em] text-zinc-500">Private relationship</p></div>
                </div>
                {profile.bio && <p className="relative mt-5 line-clamp-3 text-sm leading-relaxed text-zinc-300">{profile.bio}</p>}
                <div className="relative mt-6 grid grid-cols-2 gap-3 border-t border-white/10 pt-4 text-xs">
                  <div><p className="font-black uppercase tracking-[0.13em] text-zinc-600">Audience note</p><p className="mt-1 font-bold text-white">{Number(profile.followers || 0).toLocaleString()} recorded</p></div>
                  <div><p className="font-black uppercase tracking-[0.13em] text-zinc-600">Engagement note</p><p className="mt-1 font-bold text-white">{Number(profile.engagement_rate || 0).toFixed(1)}% recorded</p></div>
                </div>
                <div className="relative mt-5 inline-flex items-center gap-2 rounded-full border border-amber-300/20 bg-amber-300/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.14em] text-amber-100">Held until she chooses to join</div>
              </article>
            ))}
          </div>
        ) : (
          <div className="mt-6 rounded-3xl border border-dashed border-white/15 bg-white/[0.025] p-10 text-center"><Users className="mx-auto h-10 w-10 text-zinc-600" /><h3 className="mt-4 text-xl font-black text-white">Your private list is clear.</h3><p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-zinc-400">When you add a real relationship record, it stays private here until that creator chooses to join CreatorVault.</p></div>
        )}

        <div className="mt-10 rounded-3xl border border-white/10 bg-black/35 p-6 sm:p-8">
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-zinc-500">What this room means</p>
          <div className="mt-5 grid gap-5 md:grid-cols-3">
            <div><h3 className="font-black text-white">Their profile is not public</h3><p className="mt-2 text-sm leading-relaxed text-zinc-400">Private relationship notes never become a public creator page by themselves.</p></div>
            <div><h3 className="font-black text-white">Their money is not assumed</h3><p className="mt-2 text-sm leading-relaxed text-zinc-400">Follower and engagement information never turns into claimed income, sales, or monetization.</p></div>
            <div><h3 className="font-black text-white">Their choice opens the next step</h3><p className="mt-2 text-sm leading-relaxed text-zinc-400">Only a creator’s own decision to join can unlock her Creator HQ, offers, media, or public presence.</p></div>
          </div>
        </div>
      </section>
    </main>
  );
}
