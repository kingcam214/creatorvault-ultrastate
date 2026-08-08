import { Link, useRoute } from "wouter";
import { ArrowUpRight, Crown, ShieldCheck, Store } from "lucide-react";
import { CreatorVaultRoute } from "@/lib/productArchitecture";

export default function PublicCreatorLanding() {
  const [, params] = useRoute("/creator/:handle");
  const handle = (params as { handle?: string } | null)?.handle?.toLowerCase() ?? "creator";

  return (
    <main className="min-h-screen bg-[#08080d] px-5 py-24 text-white sm:px-8">
      <section className="mx-auto max-w-4xl overflow-hidden rounded-[2rem] border border-white/10 bg-[radial-gradient(circle_at_20%_0%,rgba(216,180,254,.2),transparent_35%),linear-gradient(145deg,#15111b,#09090d)] p-7 shadow-2xl shadow-black/40 sm:p-12">
        <div className="inline-flex items-center gap-2 rounded-full border border-fuchsia-200/20 bg-fuchsia-200/10 px-3 py-2 text-[10px] font-black uppercase tracking-[.2em] text-fuchsia-100"><Store className="h-3.5 w-3.5" /> CreatorVault storefront</div>
        <h1 className="mt-7 text-5xl font-black tracking-[-.065em] sm:text-7xl">@{handle}</h1>
        <p className="mt-4 max-w-2xl text-base leading-relaxed text-zinc-300">This CreatorVault storefront only presents offers, access tiers, and drops after a real creator record and published commercial records exist. It does not invent a subscription price, paid preview, or creator outcome for this handle.</p>
        <div className="mt-8 grid gap-3 sm:grid-cols-2"><div className="rounded-2xl border border-white/10 bg-black/25 p-5"><ShieldCheck className="h-5 w-5 text-emerald-300" /><h2 className="mt-4 text-lg font-black">Record-backed access</h2><p className="mt-2 text-sm leading-relaxed text-zinc-400">Published offers and purchases appear only from durable CreatorVault commerce records.</p></div><div className="rounded-2xl border border-white/10 bg-black/25 p-5"><Crown className="h-5 w-5 text-fuchsia-200" /><h2 className="mt-4 text-lg font-black">VaultX storefronts</h2><p className="mt-2 text-sm leading-relaxed text-zinc-400">VaultX is the specialized CreatorVault vertical for private creator access and premium commercial preparation.</p></div></div>
        <div className="mt-9 flex flex-col gap-3 sm:flex-row"><Link href={CreatorVaultRoute.vaultX}><a className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-5 py-4 text-sm font-black text-black hover:bg-fuchsia-100">Explore VaultX <ArrowUpRight className="h-4 w-4" /></a></Link><Link href="/signup"><a className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/20 px-5 py-4 text-sm font-black text-white hover:bg-white/10">Create your CreatorVault</a></Link></div>
      </section>
    </main>
  );
}
