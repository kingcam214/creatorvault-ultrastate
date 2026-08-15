import { Link, useRoute } from "wouter";
import { ArrowUpRight, LockKeyhole } from "lucide-react";
import { trpc } from "@/lib/trpc";

export default function PublicCreatorLanding() {
  const [, params] = useRoute("/creator/:handle");
  const handle = (params as { handle?: string } | null)?.handle?.replace(/^@/, "").toLowerCase() ?? "";
  const profileQuery = trpc.profile.getProfile.useQuery({ username: handle }, { enabled: Boolean(handle) });

  if (profileQuery.isLoading) {
    return <main className="min-h-screen bg-[#080706] text-white"><div className="mx-auto max-w-6xl px-5 py-32 sm:px-8"><div className="h-[28rem] animate-pulse rounded-[2rem] border border-white/10 bg-white/[0.04]" /></div></main>;
  }

  const profile = profileQuery.data?.profile ?? null;
  if (!profile) {
    return (
      <main className="min-h-screen bg-[#080706] px-5 py-24 text-white sm:px-8">
        <section className="mx-auto max-w-2xl rounded-[2rem] border border-white/10 bg-[#11100e] p-7 sm:p-12">
          <p className="text-[10px] font-black uppercase tracking-[.22em] text-[#efd18c]">CreatorVault</p>
          <h1 className="mt-4 text-4xl font-black leading-[.9] tracking-[-.06em] sm:text-6xl">This creator link is not open to the public yet.</h1>
          <p className="mt-5 max-w-xl text-base leading-relaxed text-zinc-400">There is no verified public creator record attached to this handle, so CreatorVault will not invent a storefront, offer, preview, or audience.</p>
          <Link href="/"><a className="mt-8 inline-flex min-h-14 items-center justify-center gap-2 rounded-2xl bg-[#f3d899] px-6 font-black text-[#19130c]">Return to CreatorVault <ArrowUpRight className="h-4 w-4" /></a></Link>
        </section>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#080706] px-5 py-20 text-white sm:px-8">
      <section className="w-full max-w-2xl overflow-hidden rounded-[2rem] border border-[#efd18c]/20 bg-[radial-gradient(circle_at_top_right,rgba(239,202,131,.16),transparent_42%),linear-gradient(145deg,#17120a,#080706)] p-7 shadow-[0_28px_90px_-48px_rgba(239,202,131,.6)] sm:p-10">
        <p className="text-[10px] font-black uppercase tracking-[.22em] text-[#efd18c]">CreatorVault public profile</p>
        <div className="mt-6 flex items-center gap-4">
          {profile.avatarUrl || profile.avatar ? <img src={profile.avatarUrl ?? profile.avatar} alt="" className="h-16 w-16 rounded-full border-2 border-[#efd18c] object-cover" /> : <div className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-[#efd18c] bg-black/30 text-2xl font-black text-[#efd18c]">{String(profile.displayName || profile.username).slice(0, 1).toUpperCase()}</div>}
          <div><h1 className="text-3xl font-black tracking-[-.06em] sm:text-4xl">{profile.displayName || profile.username}</h1><p className="mt-1 text-sm text-zinc-400">@{profile.username}</p></div>
        </div>
        {profile.bio && <p className="mt-6 max-w-xl text-base leading-relaxed text-zinc-300">{profile.bio}</p>}
        <div className="mt-7 rounded-2xl border border-white/10 bg-black/25 p-5">
          <div className="flex items-center gap-2 text-sm font-black text-white"><LockKeyhole className="h-4 w-4 text-[#efd18c]" />This public release room is not open for sale yet.</div>
          <p className="mt-3 text-sm leading-relaxed text-zinc-400">CreatorVault will not show an offer, price, checkout, preview, subscriber count, or purchase claim until one real public release can prove payment, access, delivery, and creator payout together.</p>
        </div>
        <Link href="/vault-x"><a className="mt-7 inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[#f3d899] px-5 text-sm font-black text-[#19130c]">See what VaultX is building <ArrowUpRight className="h-4 w-4" /></a></Link>
      </section>
    </main>
  );
}
