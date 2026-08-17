import { useMemo } from "react";
import { ArrowLeft, ArrowUpRight, Check, CircleCheck, Instagram, Loader2, LockKeyhole, MessageCircle, Play, Sparkles } from "lucide-react";
import { Link } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";

const reels = [
  { label: "Tropical motion", src: "/videos/owner-supplied/reshula-tropical-motion-h264.mp4" },
  { label: "Mirror lifestyle", src: "/videos/creator-pages/reshula-mirror-lifestyle.mp4" },
  { label: "Solo lifestyle", src: "/videos/creator-pages/reshula-solo-lifestyle-source-h264.mp4" },
];

function money(cents: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);
}

function Film({ src, className = "" }: { src: string; className?: string }) {
  return <video autoPlay muted loop playsInline preload="metadata" className={`h-full w-full object-cover ${className}`}><source src={src} type="video/mp4" /></video>;
}

export default function ReshulaProfile() {
  const { user } = useAuth();
  const profileQuery = trpc.profile.getProfile.useQuery({ username: "reshula24" });
  const profile = profileQuery.data?.profile;
  const courses = profileQuery.data?.courses ?? [];
  const tiersQuery = trpc.subscriptions.getCreatorTiers.useQuery({ creatorId: profile?.userId ?? 14 });
  const checkout = trpc.stripeCheckout.createCheckoutSession.useMutation({
    onSuccess: ({ url }) => { window.location.assign(url); },
  });
  const startConversation = trpc.message.startConversation.useMutation({
    onSuccess: ({ conversationId }) => { window.location.assign(`/messages?conversationId=${conversationId}`); },
  });

  const tiers = useMemo(() => (tiersQuery.data ?? []).filter((tier: any) => tier.isActive), [tiersQuery.data]);

  const requireSignIn = () => {
    window.location.assign("/login?next=/reshula24");
  };

  const enterAccess = (tierId: number) => {
    if (!user) return requireSignIn();
    checkout.mutate({ tierId });
  };

  const messageReshula = () => {
    if (!user) return requireSignIn();
    if (!profile?.userId) return;
    startConversation.mutate({ otherUserId: profile.userId });
  };

  if (profileQuery.isLoading) {
    return <main className="flex min-h-screen items-center justify-center bg-[#08030a] text-white"><Loader2 className="h-8 w-8 animate-spin text-[#ff5c91]" /></main>;
  }

  if (!profile) {
    return <main className="flex min-h-screen items-center justify-center bg-[#08030a] p-6 text-center text-white"><div><h1 className="text-3xl font-black">ReShula’s profile is not ready to open.</h1><Link href="/creators/reshula"><a className="mt-6 inline-flex rounded-full bg-[#ff5c91] px-6 py-3 text-sm font-black text-black">Visit ReShula’s world</a></Link></div></main>;
  }

  const displayName = "Paola ReShula";
  const publicProgramCount = courses.length;
  const memberCount = Number(profile.followerCount ?? 0);

  return (
    <main className="min-h-screen overflow-hidden bg-[#08030a] text-[#fff9fb]">
      <style>{`
        @keyframes reshula-profile-rise { from { opacity: 0; transform: translateY(26px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes reshula-profile-glow { 0%,100% { opacity: .35; transform: scale(.94); } 50% { opacity: .72; transform: scale(1.08); } }
        .reshula-profile-rise { animation: reshula-profile-rise .8s cubic-bezier(.16,.84,.2,1) both; }
        .reshula-profile-rise-delay { animation: reshula-profile-rise .8s .14s cubic-bezier(.16,.84,.2,1) both; }
        .reshula-profile-glow { animation: reshula-profile-glow 5.5s ease-in-out infinite; }
        @media (prefers-reduced-motion: reduce) { .reshula-profile-rise, .reshula-profile-rise-delay, .reshula-profile-glow { animation: none; } }
      `}</style>

      <section className="relative isolate min-h-[82svh] overflow-hidden bg-black">
        <Film src={reels[0].src} className="object-center" />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(4,0,5,.28)_0%,rgba(4,0,5,.16)_34%,rgba(8,3,10,.98)_100%)]" />
        <div className="reshula-profile-glow absolute -right-24 top-16 h-72 w-72 rounded-full bg-[#ff4f88]/25 blur-3xl" />

        <nav className="absolute inset-x-0 top-0 z-10 flex items-center justify-between px-5 py-5 sm:px-8 sm:py-8">
          <Link href="/creators/reshula"><a className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-[.22em] text-white/85"><ArrowLeft className="h-4 w-4" /> Her world</a></Link>
          <p className="text-sm font-black tracking-[-.06em]">CREATOR<span className="text-[#ff5c91]">VAULT</span></p>
        </nav>

        <div className="absolute right-5 top-20 z-10 inline-flex items-center gap-2 rounded-full border border-[#ffd3e2]/45 bg-[#ff5c91]/15 px-3 py-2 text-[9px] font-black uppercase tracking-[.16em] text-[#ffe8ef] backdrop-blur sm:right-8 sm:top-24"><CircleCheck className="h-3.5 w-3.5" /> Founding creator</div>

        <div className="absolute inset-x-0 bottom-0 z-10 px-5 pb-10 sm:px-8 sm:pb-14 lg:px-12">
          <div className="mx-auto max-w-7xl">
            <p className="reshula-profile-rise text-[10px] font-black uppercase tracking-[.3em] text-[#ffc1d3]">RESHULA24 / DOMINICAN REPUBLIC</p>
            <h1 className="reshula-profile-rise-delay mt-5 max-w-5xl font-black leading-[.68] tracking-[-.13em]"><span className="block text-[18vw] sm:text-[9rem] lg:text-[12rem]">PAOLA</span><span className="ml-[7vw] block text-[14vw] text-[#ff5c91] sm:text-6xl lg:text-8xl">RESHULA</span></h1>
            <p className="mt-6 max-w-md text-base leading-7 text-white/76">Fitness, Dominican lifestyle, and a real creator world that moves with her.</p>
            <div className="mt-7 flex flex-wrap gap-3">
              <button type="button" onClick={messageReshula} disabled={startConversation.isPending} className="inline-flex min-h-12 items-center gap-2 rounded-full bg-[#ff5c91] px-6 text-sm font-black text-black transition active:scale-[.97] disabled:opacity-60"><MessageCircle className="h-4 w-4" /> {startConversation.isPending ? "Opening your conversation" : "Message ReShula"}</button>
              <a href="#access" className="inline-flex min-h-12 items-center gap-2 rounded-full border border-white/30 bg-black/25 px-6 text-sm font-black backdrop-blur"><LockKeyhole className="h-4 w-4" /> Explore her access</a>
            </div>
          </div>
        </div>
      </section>

      <section className="border-y border-white/10 bg-[#120611] px-5 py-5 sm:px-8 lg:px-12">
        <div className="mx-auto grid max-w-7xl grid-cols-3 divide-x divide-white/10 overflow-hidden rounded-2xl border border-white/10 bg-white/[.035]">
          <div className="px-3 py-4 text-center sm:px-7"><p className="text-3xl font-black text-[#ff93b5] sm:text-4xl">{publicProgramCount}</p><p className="mt-1 text-[9px] font-black uppercase tracking-[.16em] text-white/48">Public programs</p></div>
          <div className="px-3 py-4 text-center sm:px-7"><p className="text-3xl font-black text-[#ff93b5] sm:text-4xl">{tiers.length}</p><p className="mt-1 text-[9px] font-black uppercase tracking-[.16em] text-white/48">Ways in</p></div>
          <div className="px-3 py-4 text-center sm:px-7"><p className="text-3xl font-black text-[#ff93b5] sm:text-4xl">{memberCount}</p><p className="mt-1 text-[9px] font-black uppercase tracking-[.16em] text-white/48">Profile follows</p></div>
        </div>
      </section>

      <section id="access" className="relative overflow-hidden bg-[radial-gradient(circle_at_88%_10%,rgba(255,79,136,.25),transparent_25%),#0d050f] px-5 py-16 sm:px-8 lg:px-12 lg:py-24">
        <div className="mx-auto max-w-7xl">
          <div className="max-w-2xl"><p className="text-xs font-black uppercase tracking-[.25em] text-[#ff93b5]">Choose your way in</p><h2 className="mt-5 text-[15vw] font-black leading-[.7] tracking-[-.12em] sm:text-7xl">THE ACCESS<br />IS <span className="text-[#ff5c91]">REAL.</span></h2><p className="mt-7 max-w-xl text-lg leading-8 text-white/65">Every option below comes from ReShula’s real CreatorVault profile. Choose one when you are ready; CreatorVault sends you to secure checkout before any access is changed.</p></div>

          {tiersQuery.isLoading ? <div className="mt-10 grid gap-4 md:grid-cols-2">{Array.from({ length: 4 }).map((_, index) => <div key={index} className="h-52 animate-pulse rounded-3xl border border-white/10 bg-white/[.04]" />)}</div> : <div className="mt-10 grid gap-4 md:grid-cols-2">{tiers.map((tier: any, index: number) => {
            const featured = index === 1;
            return <article key={tier.id} className={`relative overflow-hidden rounded-[2rem] border p-6 ${featured ? "border-[#ff5c91] bg-[#ff5c91]/12" : "border-white/12 bg-white/[.035]"}`}>
              {featured && <span className="absolute right-5 top-5 rounded-full bg-[#ff5c91] px-3 py-1 text-[9px] font-black uppercase tracking-[.14em] text-black">Most intimate</span>}
              <p className="text-[10px] font-black uppercase tracking-[.22em] text-[#ffb5cc]">ReShula access</p>
              <div className="mt-4 flex items-end justify-between gap-4"><h3 className="text-4xl font-black leading-[.83] tracking-[-.08em]">{tier.name}</h3><p className="shrink-0 text-lg font-black text-[#ffb5cc]">{money(tier.priceInCents)}<span className="text-xs text-white/55"> / {tier.billingInterval === "yearly" ? "year" : "month"}</span></p></div>
              <p className="mt-5 min-h-12 max-w-xl text-sm leading-6 text-white/65">{tier.description || "Creator access with ReShula."}</p>
              <button type="button" disabled={checkout.isPending} onClick={() => enterAccess(tier.id)} className={`mt-7 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full px-5 text-sm font-black transition active:scale-[.97] disabled:opacity-60 ${featured ? "bg-[#ff5c91] text-black" : "border border-[#ff93b5]/70 text-[#ffc1d3]"}`}><LockKeyhole className="h-4 w-4" /> {checkout.isPending ? "Opening secure access" : "Choose this access"}</button>
            </article>;
          })}</div>}
        </div>
      </section>

      <section className="bg-[#fbe6ed] px-5 py-16 text-[#240713] sm:px-8 lg:px-12 lg:py-24">
        <div className="mx-auto max-w-7xl"><div className="flex flex-wrap items-end justify-between gap-6"><div><p className="text-xs font-black uppercase tracking-[.25em] text-[#ad2455]">Open reels</p><h2 className="mt-4 text-[14vw] font-black leading-[.72] tracking-[-.12em] sm:text-7xl">HER WORLD<br />IN MOTION.</h2></div><p className="max-w-sm text-base leading-7 text-[#240713]/65">These are public ReShula-only films. No fake locked feed and no borrowed person filling her frame.</p></div>
          <div className="mt-10 grid gap-4 md:grid-cols-3">{reels.map((reel, index) => <article key={reel.label} className={`group relative aspect-[9/13] overflow-hidden rounded-[2.3rem] bg-black ${index === 1 ? "md:translate-y-8" : ""}`}><Film src={reel.src} /><div className="absolute inset-0 bg-gradient-to-t from-black/85 via-transparent to-transparent" /><div className="absolute bottom-0 inset-x-0 p-6 text-white"><span className="inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-[.18em] text-[#ffb5cc]"><Play className="h-3 w-3 fill-current" /> Open reel</span><p className="mt-3 text-2xl font-black leading-[.85] tracking-[-.06em]">{reel.label}</p></div></article>)}</div>
        </div>
      </section>

      <section className="bg-[#1b0711] px-5 py-20 sm:px-8 lg:px-12 lg:py-28"><div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[1fr_.8fr] lg:items-end"><div><p className="text-xs font-black uppercase tracking-[.25em] text-[#ff93b5]">About ReShula</p><h2 className="mt-5 text-[15vw] font-black leading-[.7] tracking-[-.12em] sm:text-7xl">THE PROFILE<br />IS <span className="text-[#ff5c91]">HER PLACE.</span></h2><p className="mt-8 max-w-2xl text-lg leading-8 text-white/68">{profile.bio || "A founding CreatorVault presence, built around real motion, a real profile record, and the access she chooses to offer."}</p></div><div className="rounded-[2rem] border border-[#ff93b5]/30 bg-[#ff5c91]/10 p-7"><Sparkles className="h-7 w-7 text-[#ffb5cc]" /><p className="mt-5 text-xl font-black leading-7">Her profile stays attached to her own CreatorVault record—not a pretend creator, a template, or somebody else’s footage.</p><div className="mt-7 flex flex-wrap gap-3"><a href="https://www.instagram.com/reshula24/" target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center gap-2 rounded-full bg-[#ff5c91] px-5 text-sm font-black text-black"><Instagram className="h-4 w-4" /> @RESHULA24</a><Link href="/creators/reshula"><a className="inline-flex min-h-11 items-center gap-2 rounded-full border border-white/25 px-5 text-sm font-black text-white">Her Creator World <ArrowUpRight className="h-4 w-4" /></a></Link></div></div></div></section>
    </main>
  );
}
