import { useState } from "react";
import { Link, useLocation } from "wouter";
import { ArrowUpRight, Crown, Menu, Shield, Sparkles, X } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { CANONICAL_PRIMARY_NAV, CreatorVaultRoute } from "@/lib/productArchitecture";

export default function AppHeader() {
  const { user } = useAuth();
  const [location] = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const isOwnerOrAdmin = user?.role === "king" || user?.role === "admin";
  const isAuthPage = ["/login", "/register", "/signup"].some((path) => location === path || location.startsWith(`${path}?`));

  if (isAuthPage) return null;

  const close = () => setMobileOpen(false);

  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-white/10 bg-[#09090d]/92 text-white backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <Link href="/"><a className="flex shrink-0 items-center gap-2" onClick={close}><img src="/logo-white.png" alt="CreatorVault" className="h-9 w-auto" /><span className="hidden text-[10px] font-black uppercase tracking-[0.18em] text-zinc-400 sm:inline">Creator OS</span></a></Link>

        <nav className="hidden items-center gap-1 lg:flex" aria-label="CreatorVault primary navigation">
          {CANONICAL_PRIMARY_NAV.map((item) => {
            const active = location === item.href || location.startsWith(`${item.href}/`);
            return <Link key={item.href} href={item.href}><a className={`rounded-xl px-3 py-2 text-sm font-bold transition ${active ? "bg-white text-black" : "text-zinc-300 hover:bg-white/10 hover:text-white"}`}>{item.label}</a></Link>;
          })}
        </nav>

        <div className="hidden items-center gap-2 lg:flex">
          {user ? <><Link href={CreatorVaultRoute.creatorOS}><a className="rounded-xl border border-white/15 px-3 py-2 text-sm font-bold text-zinc-200 transition hover:border-fuchsia-300 hover:text-white">My work</a></Link>{isOwnerOrAdmin && <Link href="/king/content"><a className="inline-flex items-center gap-1.5 rounded-xl border border-fuchsia-300/30 bg-fuchsia-300/10 px-3 py-2 text-sm font-bold text-fuchsia-100 transition hover:bg-fuchsia-300/20"><Shield className="h-3.5 w-3.5" /> Owner controls</a></Link>}</> : <><Link href="/login"><a className="px-3 py-2 text-sm font-bold text-zinc-300 hover:text-white">Sign in</a></Link><Link href="/signup"><a className="inline-flex items-center gap-1.5 rounded-xl bg-white px-3 py-2 text-sm font-black text-black transition hover:bg-fuchsia-100">Join CreatorVault <ArrowUpRight className="h-3.5 w-3.5" /></a></Link></>}
        </div>

        <button type="button" className="grid h-10 w-10 place-items-center rounded-xl border border-white/15 text-white lg:hidden" aria-label="Open CreatorVault navigation" aria-expanded={mobileOpen} onClick={() => setMobileOpen((open) => !open)}>{mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}</button>
      </div>

      {mobileOpen && <div className="border-t border-white/10 bg-[#0d0d13] px-4 py-4 lg:hidden"><nav className="mx-auto grid max-w-7xl gap-2" aria-label="CreatorVault mobile navigation">
        {CANONICAL_PRIMARY_NAV.map((item, index) => <Link key={item.href} href={item.href}><a onClick={close} className={`flex items-center justify-between rounded-2xl border px-4 py-4 transition ${location === item.href ? "border-fuchsia-300/40 bg-fuchsia-300/10" : "border-white/10 bg-white/[.03]"}`}><span><span className="block text-[10px] font-black uppercase tracking-[0.16em] text-zinc-500">0{index + 1}</span><span className="mt-1 block text-base font-black">{item.label}</span></span><ArrowUpRight className="h-4 w-4 text-fuchsia-200" /></a></Link>)}
        <div className="mt-2 grid gap-2 border-t border-white/10 pt-4">{user ? <Link href={CreatorVaultRoute.creatorOS}><a onClick={close} className="rounded-xl bg-white px-4 py-3 text-center text-sm font-black text-black">Open my Creator OS</a></Link> : <Link href="/signup"><a onClick={close} className="rounded-xl bg-white px-4 py-3 text-center text-sm font-black text-black">Join CreatorVault</a></Link>}{isOwnerOrAdmin && <Link href="/king/content"><a onClick={close} className="inline-flex items-center justify-center gap-2 rounded-xl border border-fuchsia-300/30 px-4 py-3 text-sm font-black text-fuchsia-100"><Crown className="h-4 w-4" /> Owner controls</a></Link>}</div>
        <div className="mt-2 rounded-xl border border-cyan-200/10 bg-cyan-200/5 px-3 py-3 text-xs leading-relaxed text-zinc-400"><Sparkles className="mr-1 inline h-3.5 w-3.5 text-cyan-200" /> CreatorVault keeps creation, access, audience, and distribution connected. External delivery remains approval-controlled.</div>
      </nav></div>}
    </header>
  );
}
