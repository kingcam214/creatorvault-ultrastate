import { ArrowDown, ArrowLeft, ArrowUpRight, Instagram } from "lucide-react";
import { Link } from "wouter";

const reels = {
  tropical: "/videos/owner-supplied/reshula-tropical-motion-h264.mp4",
  mirror: "/videos/creator-pages/reshula-mirror-lifestyle.mp4",
  solo: "/videos/creator-pages/reshula-solo-lifestyle-source-h264.mp4",
};

function Motion({ src, className = "" }: { src: string; className?: string }) {
  return <video autoPlay muted loop playsInline preload="metadata" className={`h-full w-full object-cover ${className}`}><source src={src} type="video/mp4" /></video>;
}

export default function ReshulaWorld() {
  return (
    <main className="min-h-screen overflow-hidden bg-[#100407] text-white">
      <style>{`
        @keyframes reshulaWordRise { from { opacity: 0; transform: translateY(35px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes reshulaPulse { 0%,100% { transform: scale(1); opacity: .5; } 50% { transform: scale(1.45); opacity: 1; } }
        @keyframes reshulaSweep { from { transform: translateX(-130%) skewX(-18deg); } to { transform: translateX(170%) skewX(-18deg); } }
        .reshula-title > span { display:block; animation: reshulaWordRise .85s cubic-bezier(.2,.8,.2,1) both; }
        .reshula-title > span:nth-child(2) { animation-delay:.11s; }
        .reshula-title > span:nth-child(3) { animation-delay:.22s; }
        .reshula-light { animation: reshulaSweep 7s ease-in-out infinite; }
        .reshula-pulse { animation: reshulaPulse 1.8s ease-in-out infinite; }
      `}</style>

      <section className="relative isolate min-h-[100svh] overflow-hidden bg-black">
        <Motion src={reels.tropical} />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,.62),rgba(0,0,0,.03)_32%,rgba(0,0,0,.92))]" />
        <div className="reshula-light absolute -left-[40%] top-0 h-full w-[35%] bg-gradient-to-r from-transparent via-[#ff3d78]/30 to-transparent blur-2xl" />
        <nav className="absolute inset-x-0 top-0 z-10 flex items-center justify-between p-5 sm:p-8">
          <Link href="/creators"><a className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-[.2em] text-white/80"><ArrowLeft className="h-4 w-4" /> The circle</a></Link>
          <p className="text-sm font-black tracking-[-.06em]">CREATOR<span className="text-[#ff4f88]">VAULT</span></p>
        </nav>
        <div className="absolute inset-x-0 bottom-0 z-10 px-5 pb-9 sm:px-8 sm:pb-14 lg:px-12">
          <div className="mx-auto max-w-7xl">
            <div className="mb-5 flex items-center gap-2 text-[10px] font-black uppercase tracking-[.24em] text-[#ffb1c7]"><span className="reshula-pulse h-2 w-2 rounded-full bg-[#ff4f88]" /> Santo Domingo, always live</div>
            <h1 className="reshula-title max-w-5xl font-black leading-[.78] tracking-[-.105em] text-white">
              <span className="text-[16vw] sm:text-[10rem] lg:text-[13rem]">PAOLA</span>
              <span className="ml-[8vw] text-[18vw] text-[#ff4f88] sm:text-[11rem] lg:text-[14rem]">RE<span className="inline">SHULA</span></span>
              <span className="ml-[3vw] text-[7vw] tracking-[-.075em] sm:text-5xl lg:text-7xl">THE CAMERA DOESN’T LEAD. SHE DOES.</span>
            </h1>
            <div className="mt-8 flex flex-wrap items-center gap-3"><a href="https://www.instagram.com/reshula24/" target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-full bg-[#ff4f88] px-6 py-3 text-sm font-black text-black"><Instagram className="h-4 w-4" /> @RESHULA24 <ArrowUpRight className="h-4 w-4" /></a><a href="#street" className="inline-flex items-center gap-2 rounded-full border border-white/30 bg-black/20 px-6 py-3 text-sm font-black backdrop-blur"><ArrowDown className="h-4 w-4" /> Step into her day</a></div>
          </div>
        </div>
      </section>

      <section id="street" className="relative overflow-hidden bg-[#ff4f88] px-5 py-5 text-black sm:px-8 lg:px-12"><div className="mx-auto flex max-w-7xl items-center gap-4 overflow-hidden whitespace-nowrap text-xs font-black uppercase tracking-[.22em]"><span>Mirror energy</span><span className="text-2xl">✦</span><span>Dominican presence</span><span className="text-2xl">✦</span><span>All ReShula. No stand-ins.</span></div></section>

      <section className="relative min-h-[110svh] overflow-hidden bg-[#070708] px-5 py-14 sm:px-8 lg:px-12"><div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[.8fr_1.2fr] lg:items-end"><div className="lg:pb-10"><p className="text-xs font-black uppercase tracking-[.24em] text-[#ff759f]">01 / Her own reflection</p><h2 className="mt-5 max-w-2xl text-[15vw] font-black leading-[.76] tracking-[-.1em] sm:text-8xl">SHE MAKES<br />PRESENCE<br /><span className="text-[#ff4f88]">MOVE.</span></h2><p className="mt-8 max-w-md text-lg leading-8 text-white/70">The world stays locked to ReShula herself: her body, her timing, her rhythm, and no one else pulling focus from the frame.</p></div><div className="relative aspect-[9/11] overflow-hidden rounded-[2.8rem] border border-white/15 bg-[#17050b]"><Motion src={reels.mirror} /><div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" /><p className="absolute bottom-7 left-7 right-7 text-4xl font-black leading-[.84] tracking-[-.08em]">THE CAMERA KNOWS HER ANGLE.</p></div></div></section>

      <section className="relative overflow-hidden bg-[#f7b8cb] px-5 py-16 text-[#170307] sm:px-8 lg:px-12 lg:py-24"><div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[1.1fr_.9fr] lg:items-center"><div className="relative aspect-[9/12] overflow-hidden rounded-[4rem_0_4rem_0] bg-black shadow-[20px_24px_0_#ff4f88]"><Motion src={reels.solo} /><div className="absolute inset-0 bg-gradient-to-t from-black/75 via-transparent to-transparent" /><p className="absolute bottom-7 left-7 right-7 text-4xl font-black leading-[.82] tracking-[-.08em] text-white">THE CAMERA STAYS WITH HER.</p></div><div className="lg:pl-8"><p className="text-xs font-black uppercase tracking-[.24em] text-[#b11e54]">02 / Solo, always</p><h2 className="mt-5 text-[15vw] font-black leading-[.74] tracking-[-.1em] sm:text-8xl">SHE MOVES<br />AT HER<br /><span className="text-[#e72062]">OWN PACE.</span></h2><p className="mt-8 max-w-md text-lg font-semibold leading-8">A real ReShula moment with nobody else taking over the frame. Her presence is enough to carry the room.</p></div></div></section>

      <section className="relative overflow-hidden bg-[#ff4f88] px-5 py-24 text-black sm:px-8 lg:px-12"><div className="absolute -right-20 -top-20 h-[28rem] w-[28rem] rounded-full bg-[#ffdc6d] blur-3xl" /><div className="relative mx-auto max-w-7xl"><p className="text-xs font-black uppercase tracking-[.24em]">Not a profile. Not a page.</p><h2 className="mt-5 max-w-5xl text-[15vw] font-black leading-[.74] tracking-[-.11em] sm:text-[8rem]">THIS IS A WOMAN’S<br />WORLD, WHILE<br /><span className="text-white">SHE’S LIVING IT.</span></h2><div className="mt-12 flex flex-wrap gap-3"><a href="https://www.instagram.com/reshula24/" target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-full bg-black px-7 py-4 text-sm font-black text-white">Stay with Reshula <ArrowUpRight className="h-4 w-4" /></a><Link href="/vault-x"><a className="inline-flex items-center gap-2 rounded-full border-2 border-black px-7 py-4 text-sm font-black">Enter VaultX</a></Link></div></div></section>
    </main>
  );
}
