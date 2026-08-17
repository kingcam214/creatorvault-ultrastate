import { useRef } from "react";
import { ArrowDown, ArrowLeft, ArrowUpRight, Instagram, LockKeyhole } from "lucide-react";
import { Link } from "wouter";

const arrival = "/videos/creator-pages/ady-personal-style-source.mp4";

function ArrivalFilm({ className = "" }: { className?: string }) {
  const scenePinned = useRef(false);
  const pinToAdy = (video: HTMLVideoElement) => {
    if (scenePinned.current) return;
    video.currentTime = 0;
    scenePinned.current = true;
  };

  return (
    <video
      autoPlay
      muted
      playsInline
      preload="metadata"
      poster="/images/creator-pages/ady-personal-style-hero-poster.jpg"
      onLoadedMetadata={(event) => pinToAdy(event.currentTarget)}
      onCanPlay={(event) => pinToAdy(event.currentTarget)}
      onTimeUpdate={(event) => {
        if (event.currentTarget.currentTime >= 3) event.currentTarget.currentTime = 0;
      }}
      className={`h-full w-full object-cover ${className}`}
    >
      <source src={arrival} type="video/mp4" />
    </video>
  );
}

export default function AdyWorld() {
  return (
    <main className="min-h-screen overflow-hidden bg-[#100c12] text-[#fff5f4]">
      <style>{`
        @keyframes ady-name-in { from { opacity: 0; transform: translateY(32px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes ady-stamp { 0%,100% { transform: rotate(-5deg) translateY(0); } 50% { transform: rotate(4deg) translateY(-6px); } }
        .ady-name > span { display: block; animation: ady-name-in .82s cubic-bezier(.16,.83,.22,1) both; }
        .ady-name > span:nth-child(2) { animation-delay: .12s; }
        .ady-name > span:nth-child(3) { animation-delay: .23s; }
        .ady-stamp { animation: ady-stamp 4.2s ease-in-out infinite; }
        @media (prefers-reduced-motion: reduce) { .ady-name > span, .ady-stamp { animation: none; } }
      `}</style>

      <section className="relative isolate h-[100svh] min-h-[100svh] overflow-hidden bg-[#120d12]">
        <ArrivalFilm className="object-center" />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(12,7,12,.5),rgba(12,7,12,.04)_30%,rgba(12,7,12,.94))]" />
        <div className="absolute inset-y-0 right-0 w-[48%] bg-[linear-gradient(90deg,transparent,rgba(38,12,26,.34))]" />

        <nav className="absolute inset-x-0 top-0 z-10 flex items-center justify-between px-5 py-5 sm:px-8 sm:py-8">
          <Link href="/creators"><a className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-[.22em] text-white/85"><ArrowLeft className="h-4 w-4" /> The circle</a></Link>
          <p className="text-sm font-black tracking-[-.06em]">CREATOR<span className="text-[#ff75ad]">VAULT</span></p>
        </nav>

        <div className="absolute inset-x-0 bottom-0 z-10 px-5 pb-10 sm:px-8 sm:pb-14 lg:px-12">
          <div className="mx-auto max-w-7xl">
            <p className="mb-5 text-[10px] font-black uppercase tracking-[.28em] text-[#ffadc9]">ADY SANCHEZ / SANTO DOMINGO</p>
            <h1 className="ady-name max-w-5xl font-black leading-[.71] tracking-[-.12em]">
              <span className="text-[20vw] sm:text-[9.5rem] lg:text-[13rem]">ADY</span>
              <span className="ml-[9vw] text-[18vw] text-[#ff75ad] sm:text-[8rem] lg:text-[11rem]">OWNS</span>
              <span className="ml-[2vw] text-[8vw] tracking-[-.08em] sm:text-5xl lg:text-7xl">THE FRAME.</span>
            </h1>
            <div className="mt-8 flex flex-wrap gap-3">
              <a href="https://www.instagram.com/adyyyyyyyyu/" target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-full bg-[#ff75ad] px-6 py-3 text-sm font-black text-[#190a11]">Follow Ady <ArrowUpRight className="h-4 w-4" /></a>
              <a href="#her-own-terms" className="inline-flex items-center gap-2 rounded-full border border-white/35 bg-black/20 px-6 py-3 text-sm font-black backdrop-blur"><ArrowDown className="h-4 w-4" /> Step inside</a>
            </div>
          </div>
        </div>
      </section>

      <section id="her-own-terms" className="relative overflow-hidden bg-[#ff75ad] px-5 py-16 text-[#190a11] sm:px-8 lg:px-12 lg:py-24">
        <div className="mx-auto grid max-w-7xl gap-12 lg:grid-cols-[1.1fr_.9fr] lg:items-end">
          <div>
            <p className="text-xs font-black uppercase tracking-[.25em] text-[#7c123c]">The woman is the story</p>
            <h2 className="mt-5 text-[18vw] font-black leading-[.66] tracking-[-.14em] sm:text-[8rem]">NO ONE<br />ELSE IN<br /><span className="text-[#fff7f7]">HER FRAME.</span></h2>
          </div>
          <div className="lg:pb-3">
            <span className="ady-stamp inline-block rounded-full border-2 border-[#190a11] px-5 py-4 text-[10px] font-black uppercase tracking-[.22em]">Ady only<br />always</span>
            <p className="mt-8 max-w-md text-lg leading-8 text-[#190a11]/78">Her page is being rebuilt with a hard rule: no stand-ins, no borrowed bodies, and no scenes that pull focus away from her. The live film here is her own real walk-in, full body and full presence.</p>
          </div>
        </div>
      </section>

      <section className="relative bg-[#f7eded] px-5 py-20 text-[#1c0d16] sm:px-8 lg:px-28">
        <div className="mx-auto max-w-7xl border-y-2 border-[#1c0d16] py-12 sm:py-16">
          <p className="text-xs font-black uppercase tracking-[.25em] text-[#9b214f]">Ady Sanchez / founding circle</p>
          <h2 className="mt-5 max-w-5xl text-[16vw] font-black leading-[.69] tracking-[-.13em] sm:text-[8rem]">THE WORLD<br />GETS BIGGER<br /><span className="text-[#9b214f]">WHEN SHE DOES.</span></h2>
          <p className="mt-8 max-w-2xl text-xl leading-9 text-[#1c0d16]/70">Her public presence is real. Her private lane is already hers. CreatorVault will only add motion that keeps Ady, not someone else, at the center of the screen.</p>
          <div className="mt-11 flex flex-wrap gap-3">
            <a href="https://www.instagram.com/adyyyyyyyyu/" target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-full bg-[#190a11] px-7 py-4 text-sm font-black text-[#fff7f7]"><Instagram className="h-4 w-4" /> @ADYYYYYYYYU</a>
            <a href="https://onlyfans.com/adysanchesz" target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-full border-2 border-[#190a11] px-7 py-4 text-sm font-black"><LockKeyhole className="h-4 w-4" /> Her private access</a>
            <Link href="/vault-x"><a className="inline-flex items-center gap-2 rounded-full border-2 border-[#190a11] px-7 py-4 text-sm font-black">Enter VaultX</a></Link>
          </div>
        </div>
      </section>
    </main>
  );
}
