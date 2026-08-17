import { ArrowDown, ArrowUpRight, Crown, Film, LockKeyhole, Play, ShieldCheck, Sparkles, Vault, Video } from "lucide-react";
import { Link } from "wouter";
import { useAuth } from "@/contexts/AuthContext";

const kingcamMedia = {
  hero: "/videos/kingcam-hero-cam.mp4",
  heroFallback: "/images/kingcam-profile/kingcam-crown-lounge.webp",
  redHatReel: "/videos/kingcam-profile/kingcam-red-hat-reel.mp4",
  crownHall: "/images/kingcam-profile/kingcam-crown-hall.webp",
  crownLounge: "/images/kingcam-profile/kingcam-crown-lounge.webp",
  platformFilm: "/videos/vaultx-homepage-kingcam-trailer.mp4",
};

function Motion({ src, poster, className = "" }: { src: string; poster?: string; className?: string }) {
  return <video autoPlay muted loop playsInline preload="metadata" poster={poster} className={`h-full w-full object-cover ${className}`}><source src={src} type="video/mp4" /></video>;
}

export default function KingCamProfile() {
  const { user } = useAuth();
  const isKingCamOwner = user?.id === 6 || user?.id === 33 || user?.role === "king" || user?.role === "admin";

  return (
    <main className="min-h-screen overflow-hidden bg-[#090605] text-[#fff9ee]">
      <style>{`
        @keyframes kingcam-arrive { from { opacity: 0; transform: translateY(28px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes kingcam-orbit { 0%,100% { transform: rotate(0deg) scale(1); opacity: .35; } 50% { transform: rotate(9deg) scale(1.1); opacity: .62; } }
        @keyframes kingcam-line { from { transform: translateX(-120%); } to { transform: translateX(140%); } }
        .kingcam-arrive { animation: kingcam-arrive .8s cubic-bezier(.15,.82,.22,1) both; }
        .kingcam-arrive-delay { animation: kingcam-arrive .8s .15s cubic-bezier(.15,.82,.22,1) both; }
        .kingcam-orbit { animation: kingcam-orbit 8s ease-in-out infinite; }
        .kingcam-line { animation: kingcam-line 6s ease-in-out infinite; }
        @media (prefers-reduced-motion: reduce) { .kingcam-arrive, .kingcam-arrive-delay, .kingcam-orbit, .kingcam-line { animation: none; } }
      `}</style>

      <section className="relative isolate min-h-[100svh] overflow-hidden bg-black">
        <Motion src={kingcamMedia.hero} poster={kingcamMedia.heroFallback} className="object-center" />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,.44)_0%,rgba(0,0,0,.06)_35%,rgba(9,6,5,.97)_100%)]" />
        <div className="kingcam-orbit absolute -right-32 top-24 h-[28rem] w-[28rem] rounded-full border border-[#d9a44e]/35 bg-[#a31225]/20 blur-2xl" />
        <div className="kingcam-line absolute -left-[30%] top-0 h-full w-[16%] -skew-x-12 bg-gradient-to-r from-transparent via-[#efd295]/20 to-transparent blur-xl" />

        <nav className="absolute inset-x-0 top-0 z-10 flex items-center justify-between px-5 py-5 sm:px-8 sm:py-8">
          <Link href="/"><a className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-[.22em] text-white/85"><ArrowUpRight className="h-4 w-4 rotate-[-135deg]" /> CreatorVault</a></Link>
          <p className="text-sm font-black tracking-[-.06em]">KING<span className="text-[#d9a44e]">CAM</span></p>
        </nav>

        <div className="absolute right-5 top-20 z-10 inline-flex items-center gap-2 rounded-full border border-[#efd295]/45 bg-black/35 px-3 py-2 text-[9px] font-black uppercase tracking-[.16em] text-[#ffe9b9] backdrop-blur sm:right-8 sm:top-24"><Crown className="h-3.5 w-3.5" /> Founder / Creator</div>

        <div className="absolute inset-x-0 bottom-0 z-10 px-5 pb-10 sm:px-8 sm:pb-14 lg:px-12">
          <div className="mx-auto max-w-7xl">
            <p className="kingcam-arrive text-[10px] font-black uppercase tracking-[.3em] text-[#f0cf90]">CREATORVAULT / THE ORIGINAL</p>
            <h1 className="kingcam-arrive-delay mt-5 max-w-5xl font-black leading-[.66] tracking-[-.13em]"><span className="block text-[18vw] sm:text-[9rem] lg:text-[12rem]">KING</span><span className="ml-[9vw] block text-[15vw] text-[#d9a44e] sm:text-7xl lg:text-9xl">CAM</span></h1>
            <p className="mt-6 max-w-lg text-base leading-7 text-white/78">The founder behind CreatorVault. The clone, the content, and the machine built to put creators in control.</p>
            <div className="mt-7 flex flex-wrap gap-3">
              {isKingCamOwner ? <Link href="/king/content"><a className="inline-flex min-h-12 items-center gap-2 rounded-full bg-[#d9a44e] px-6 text-sm font-black text-black transition active:scale-[.97]"><Sparkles className="h-4 w-4" /> Open your creation room</a></Link> : <Link href="/vault-x"><a className="inline-flex min-h-12 items-center gap-2 rounded-full bg-[#d9a44e] px-6 text-sm font-black text-black transition active:scale-[.97]"><Sparkles className="h-4 w-4" /> Enter CreatorVault</a></Link>}
              <a href="#films" className="inline-flex min-h-12 items-center gap-2 rounded-full border border-white/30 bg-black/25 px-6 text-sm font-black backdrop-blur"><ArrowDown className="h-4 w-4" /> Watch the motion</a>
            </div>
          </div>
        </div>
      </section>

      <section className="border-y border-[#d9a44e]/20 bg-[#150b08] px-5 py-5 sm:px-8 lg:px-12">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-center gap-x-7 gap-y-3 text-center text-[10px] font-black uppercase tracking-[.2em] text-[#e9ce98]"><span className="inline-flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-[#d9a44e]" /> CreatorVault founder</span><span className="text-[#a57634]">/</span><span>KingCam clone</span><span className="text-[#a57634]">/</span><span>Creator-owned public campaign motion</span></div>
      </section>

      <section className="relative overflow-hidden bg-[#0e0807] px-5 py-16 sm:px-8 lg:px-12 lg:py-24">
        <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[.9fr_1.1fr] lg:items-end">
          <div><p className="text-xs font-black uppercase tracking-[.26em] text-[#e4bf7a]">The founder profile</p><h2 className="mt-5 text-[15vw] font-black leading-[.7] tracking-[-.12em] sm:text-7xl">BUILT TO<br />MAKE THE<br /><span className="text-[#d9a44e]">CREATOR</span> WIN.</h2><p className="mt-8 max-w-md text-lg leading-8 text-white/65">KingCam’s profile is connected to the real CreatorVault rooms already built around him—not an empty owner bio and not a made-up success page.</p></div>
          <div className="grid gap-4 sm:grid-cols-2"><Link href={isKingCamOwner ? "/king/content" : "/vault-x"}><a className="group relative min-h-[16rem] overflow-hidden rounded-[2rem] border border-[#d9a44e]/30 bg-[#a31225]/15 p-6 transition hover:-translate-y-1"><Film className="h-8 w-8 text-[#e9cf9a]" /><p className="mt-16 text-[10px] font-black uppercase tracking-[.2em] text-[#efcf91]">Creation room</p><h3 className="mt-3 text-3xl font-black leading-[.84] tracking-[-.07em]">THE CONTENT<br />STAYS HIS.</h3><ArrowUpRight className="absolute bottom-6 right-6 h-5 w-5 text-[#d9a44e]" /></a></Link><Link href={isKingCamOwner ? "/king/media-vault" : "/creators"}><a className="group relative min-h-[16rem] overflow-hidden rounded-[2rem] border border-white/12 bg-white/[.035] p-6 transition hover:-translate-y-1"><Vault className="h-8 w-8 text-[#e9cf9a]" /><p className="mt-16 text-[10px] font-black uppercase tracking-[.2em] text-[#efcf91]">CreatorVault</p><h3 className="mt-3 text-3xl font-black leading-[.84] tracking-[-.07em]">THE VAULT<br />IS REAL.</h3><ArrowUpRight className="absolute bottom-6 right-6 h-5 w-5 text-[#d9a44e]" /></a></Link></div>
        </div>
      </section>

      <section id="films" className="overflow-hidden bg-[#ead3a0] px-5 py-16 text-[#190d08] sm:px-8 lg:px-12 lg:py-24">
        <div className="mx-auto max-w-7xl"><div className="flex flex-wrap items-end justify-between gap-6"><div><p className="text-xs font-black uppercase tracking-[.26em] text-[#8a261d]">KingCam on screen</p><h2 className="mt-5 text-[15vw] font-black leading-[.7] tracking-[-.12em] sm:text-7xl">NO STATIC<br />LEGEND.</h2></div><p className="max-w-sm text-base leading-7 text-[#190d08]/65">KingCam’s public campaign motion and one accepted on-camera moment. The rejected clips did not make this page.</p></div>
          <div className="mt-10 grid gap-4 md:grid-cols-[1.2fr_.8fr]">
            <article className="relative min-h-[34rem] overflow-hidden rounded-[2.7rem] bg-black"><Motion src={kingcamMedia.platformFilm} poster={kingcamMedia.crownHall} /><div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-transparent" /><div className="absolute inset-x-0 bottom-0 p-7 text-white"><span className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-[.2em] text-[#efd295]"><Play className="h-3.5 w-3.5 fill-current" /> CreatorVault campaign film</span><p className="mt-3 text-4xl font-black leading-[.83] tracking-[-.08em]">THE PLATFORM HAS A FACE.</p></div></article>
            <article className="relative min-h-[34rem] overflow-hidden rounded-[2.7rem] bg-black"><Motion src={kingcamMedia.redHatReel} poster={kingcamMedia.crownLounge} /><div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-transparent" /><div className="absolute inset-x-0 bottom-0 p-7 text-white"><span className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-[.2em] text-[#efd295]"><Play className="h-3.5 w-3.5 fill-current" /> KingCam moment</span><p className="mt-3 text-3xl font-black leading-[.83] tracking-[-.08em]">PRESENCE DOES THE TALKING.</p></div></article>
          </div>
        </div>
      </section>

      <section className="relative overflow-hidden bg-[#180909] px-5 py-16 sm:px-8 lg:px-12 lg:py-24"><div className="absolute -left-28 bottom-0 h-80 w-80 rounded-full bg-[#a31225]/35 blur-3xl" /><div className="relative mx-auto grid max-w-7xl gap-8 lg:grid-cols-[.8fr_1.2fr] lg:items-center"><div className="relative aspect-square overflow-hidden rounded-[2.7rem] border border-[#d9a44e]/35 bg-black"><img src={kingcamMedia.crownLounge} alt="KingCam in burgundy royal styling" className="h-full w-full object-cover" /><div className="absolute inset-0 bg-gradient-to-t from-black/75 via-transparent to-transparent" /><p className="absolute bottom-7 left-7 right-7 text-3xl font-black leading-[.84] tracking-[-.08em] text-white">THE CLONE HAS TO FEEL LIKE HIM.</p></div><div><p className="text-xs font-black uppercase tracking-[.26em] text-[#e5bf78]">KingCam clone</p><h2 className="mt-5 text-[15vw] font-black leading-[.7] tracking-[-.12em] sm:text-7xl">THE FACE.<br />THE VOICE.<br /><span className="text-[#d9a44e]">THE MOVE.</span></h2><p className="mt-8 max-w-xl text-lg leading-8 text-white/68">KingCam’s clone stays inside his own protected CreatorVault creation rooms. It is not presented here as a fake person or a fake content feed.</p><div className="mt-8 flex flex-wrap gap-3">{isKingCamOwner ? <Link href="/clone-empire-home"><a className="inline-flex min-h-12 items-center gap-2 rounded-full bg-[#d9a44e] px-6 text-sm font-black text-black"><Video className="h-4 w-4" /> Open Clone Command</a></Link> : <Link href="/vault-x"><a className="inline-flex min-h-12 items-center gap-2 rounded-full border border-[#d9a44e]/60 px-6 text-sm font-black text-[#f6dda8]"><LockKeyhole className="h-4 w-4" /> CreatorVault is building</a></Link>}</div></div></div></section>
    </main>
  );
}
