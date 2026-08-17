import { useRef } from "react";
import { ArrowDown, ArrowLeft, ArrowUpRight, Instagram, Sparkles } from "lucide-react";
import { Link } from "wouter";

const films = {
  social: "/videos/creator-pages/leslie-social-presence-source-h264.mp4",
  roses: "/videos/creator-pages/leslie-roses-lifestyle-source-h264.mp4",
  studio: "/videos/creator-pages/leslie-studio-presence-source-h264.mp4",
};

function TapeFilm({ src, poster, className = "", shortLoop = false }: { src: string; poster?: string; className?: string; shortLoop?: boolean }) {
  const pinned = useRef(false);
  const pinStart = (video: HTMLVideoElement) => {
    if (pinned.current) return;
    video.currentTime = 0;
    pinned.current = true;
  };

  return (
    <video
      autoPlay
      muted
      playsInline
      preload="metadata"
      poster={poster}
      onLoadedMetadata={(event) => pinStart(event.currentTarget)}
      onCanPlay={(event) => pinStart(event.currentTarget)}
      onTimeUpdate={(event) => {
        if (shortLoop && event.currentTarget.currentTime >= 4.25) event.currentTarget.currentTime = 0;
      }}
      className={`h-full w-full object-cover ${className}`}
    >
      <source src={src} type="video/mp4" />
    </video>
  );
}

export default function LeslieWorld() {
  return (
    <main className="min-h-screen overflow-hidden bg-[#171018] text-[#fff6ec]">
      <style>{`
        @keyframes leslieReveal { from { opacity: 0; transform: translateY(28px) rotate(-1deg); } to { opacity: 1; transform: translateY(0) rotate(0); } }
        @keyframes lesliePulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.075); } }
        @keyframes leslieMarquee { from { transform: translateX(0); } to { transform: translateX(-50%); } }
        .leslie-reveal { animation: leslieReveal .8s cubic-bezier(.2,.85,.2,1) both; }
        .leslie-reveal-2 { animation: leslieReveal .8s .14s cubic-bezier(.2,.85,.2,1) both; }
        .leslie-pulse { animation: lesliePulse 4s ease-in-out infinite; }
        .leslie-marquee { animation: leslieMarquee 18s linear infinite; }
        @media (prefers-reduced-motion: reduce) { .leslie-reveal, .leslie-reveal-2, .leslie-pulse, .leslie-marquee { animation: none; } }
      `}</style>

      <section className="relative isolate min-h-[100svh] overflow-hidden bg-[#171018]">
        <TapeFilm src={films.social} poster="/images/creator-pages/leslie-social-presence-poster.jpg" shortLoop className="object-center" />
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(23,16,24,.88),rgba(23,16,24,.22)_58%,rgba(23,16,24,.56)),linear-gradient(0deg,rgba(23,16,24,.98),transparent_48%)]" />
        <div className="leslie-pulse absolute -right-20 top-[12%] h-72 w-72 rounded-full bg-[#f26d3d]/30 blur-3xl" />
        <div className="absolute right-5 top-[23%] z-10 hidden -rotate-6 rounded-full border border-[#f7ca58] bg-[#171018]/60 px-5 py-4 text-[10px] font-black uppercase tracking-[.22em] text-[#f7ca58] backdrop-blur sm:block">No borrowed story<br />No fake numbers</div>

        <nav className="absolute inset-x-0 top-0 z-10 flex items-center justify-between px-5 py-5 sm:px-8 sm:py-8">
          <Link href="/creators"><a className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-[.22em] text-white/85"><ArrowLeft className="h-4 w-4" /> The circle</a></Link>
          <p className="text-sm font-black tracking-[-.06em]">CREATOR<span className="text-[#f26d3d]">VAULT</span></p>
        </nav>

        <div className="absolute inset-x-0 bottom-0 z-10 px-5 pb-10 sm:px-8 sm:pb-14 lg:px-12">
          <div className="mx-auto max-w-7xl">
            <p className="leslie-reveal mb-5 text-[10px] font-black uppercase tracking-[.27em] text-[#f7ca58]">LESLIE / ADULT CREATOR / FITNESS CHAPTER IN MOTION</p>
            <h1 className="max-w-5xl font-black leading-[.67] tracking-[-.13em]">
              <span className="leslie-reveal block text-[20vw] sm:text-[9rem] lg:text-[13rem]">THE</span>
              <span className="leslie-reveal-2 ml-[10vw] block text-[20vw] text-[#f26d3d] sm:text-[9rem] lg:text-[13rem]">BUILD</span>
              <span className="leslie-reveal-2 ml-[3vw] block text-[8vw] tracking-[-.08em] sm:text-5xl lg:text-7xl">STARTS HERE.</span>
            </h1>
            <div className="leslie-reveal-2 mt-8 flex flex-wrap gap-3"><a href="https://www.tiktok.com/@princesadeafrica" target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-full bg-[#f26d3d] px-6 py-3 text-sm font-black text-[#251017]">Follow Leslie <ArrowUpRight className="h-4 w-4" /></a><a href="#the-tapes" className="inline-flex items-center gap-2 rounded-full border border-white/35 bg-[#171018]/40 px-6 py-3 text-sm font-black backdrop-blur"><ArrowDown className="h-4 w-4" /> Read the first tapes</a></div>
          </div>
        </div>
      </section>

      <section className="overflow-hidden bg-[#f7ca58] py-4 text-[#251017]"><div className="leslie-marquee flex w-max gap-8 whitespace-nowrap text-xs font-black uppercase tracking-[.24em]"><span>THE START IS REAL</span><span>✦</span><span>HER FACE / HER FRAME / HER PACE</span><span>✦</span><span>ADULT CREATOR TO FITNESS FORCE</span><span>✦</span><span>NO FAKE TRACTION</span><span>✦</span><span>THE START IS REAL</span><span>✦</span><span>HER FACE / HER FRAME / HER PACE</span><span>✦</span><span>ADULT CREATOR TO FITNESS FORCE</span><span>✦</span><span>NO FAKE TRACTION</span><span>✦</span></div></section>

      <section id="the-tapes" className="relative bg-[#f5e8df] px-5 py-16 text-[#251017] sm:px-8 lg:px-12 lg:py-24">
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-10 lg:grid-cols-[.82fr_1.18fr] lg:items-end"><div><p className="text-xs font-black uppercase tracking-[.24em] text-[#9c3d2e]">Tape 01 / the first signal</p><h2 className="mt-5 text-[16vw] font-black leading-[.7] tracking-[-.12em] sm:text-[8rem]">SHE<br />SHOWS<br /><span className="text-[#d94e30]">UP.</span></h2><p className="mt-8 max-w-sm text-lg leading-8 text-[#251017]/72">Leslie does not need an invented success story. Her first edge is visibility: a real woman on camera, a real audience relationship, and the decision to build a stronger body of work from here.</p></div><div className="relative aspect-[4/5] overflow-hidden rounded-[3.5rem_3.5rem_0_3.5rem] bg-[#171018] shadow-[22px_24px_0_#f26d3d]"><TapeFilm src={films.social} shortLoop /><div className="absolute inset-0 bg-gradient-to-t from-[#171018]/85 via-transparent to-transparent" /><p className="absolute bottom-7 left-7 right-7 text-4xl font-black leading-[.82] tracking-[-.08em] text-white">A REAL START<br />BEATS A FAKE FLEX.</p></div></div>
        </div>
      </section>

      <section className="relative overflow-hidden bg-[#251017] px-5 py-20 sm:px-8 lg:px-12 lg:py-28"><div className="absolute right-[-8rem] top-[-7rem] h-[31rem] w-[31rem] rounded-full border-[40px] border-[#f26d3d]/20" /><div className="relative mx-auto grid max-w-7xl gap-10 lg:grid-cols-[1.13fr_.87fr] lg:items-center"><div className="relative aspect-[9/11] overflow-hidden rounded-[4rem_0_4rem_4rem] border border-white/15 bg-black"><TapeFilm src={films.roses} /><div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" /><div className="absolute bottom-7 left-7 right-7 flex items-end justify-between gap-3"><p className="text-3xl font-black leading-[.84] tracking-[-.07em]">THE ROOM<br />LOOKS LIKE<br />SHE MEANT IT.</p><Sparkles className="h-8 w-8 shrink-0 text-[#f7ca58]" /></div></div><div className="lg:pl-10"><p className="text-xs font-black uppercase tracking-[.24em] text-[#f7ca58]">Tape 02 / make the room yours</p><h2 className="mt-5 text-[15vw] font-black leading-[.72] tracking-[-.11em] sm:text-8xl">SOFT<br />IS NOT<br /><span className="text-[#f26d3d]">SMALL.</span></h2><p className="mt-8 max-w-md text-lg leading-8 text-white/70">The content doesn’t have to scream to move people. Her own style, her own face, and her own pace are the raw material. CreatorVault’s job is to make that material hit harder, not replace it.</p></div></div></section>

      <section className="relative bg-[#f26d3d] px-5 py-16 text-[#251017] sm:px-8 lg:px-12 lg:py-24"><div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[.85fr_1.15fr] lg:items-end"><div className="lg:pb-9"><p className="text-xs font-black uppercase tracking-[.24em] text-[#6f201d]">Tape 03 / not the finish line</p><h2 className="mt-5 text-[16vw] font-black leading-[.7] tracking-[-.12em] sm:text-[8rem]">THE<br />NEXT<br /><span className="text-[#fff1df]">VERSION.</span></h2><p className="mt-8 max-w-sm text-lg font-semibold leading-8 text-[#251017]/76">Her fitness journey is beginning. That is the point: CreatorVault gives a real woman the machinery to document the work, package the moments, and grow without pretending the payoff already happened.</p></div><div className="relative aspect-[4/5] overflow-hidden rounded-[0_4rem_4rem_4rem] bg-black shadow-[22px_24px_0_#251017]"><TapeFilm src={films.studio} /><div className="absolute inset-0 bg-gradient-to-t from-black/75 via-transparent to-transparent" /><p className="absolute bottom-7 left-7 right-7 text-4xl font-black leading-[.84] tracking-[-.08em] text-white">THE EVOLUTION<br />IS THE CONTENT.</p></div></div></section>

      <section className="bg-[#f5e8df] px-5 py-20 text-[#251017] sm:px-8 lg:px-12"><div className="mx-auto max-w-7xl border-y-2 border-[#251017] py-12 sm:py-16"><p className="text-xs font-black uppercase tracking-[.24em] text-[#9c3d2e]">Leslie / founding circle</p><h2 className="mt-5 max-w-5xl text-[15vw] font-black leading-[.72] tracking-[-.12em] sm:text-[8rem]">NO SHORTCUT<br />CAN SHOW<br /><span className="text-[#d94e30]">WHAT SHE BECOMES.</span></h2><div className="mt-10 flex flex-wrap gap-3"><a href="https://www.tiktok.com/@princesadeafrica" target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-full bg-[#251017] px-7 py-4 text-sm font-black text-[#fff6ec]"><Instagram className="h-4 w-4" /> @PRINCESADEAFRICA</a><Link href="/vault-x"><a className="inline-flex items-center gap-2 rounded-full border-2 border-[#251017] px-7 py-4 text-sm font-black">Enter VaultX</a></Link></div></div></section>
    </main>
  );
}
