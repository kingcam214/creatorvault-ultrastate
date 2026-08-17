import { useRef } from "react";
import { ArrowDown, ArrowLeft, ArrowUpRight, Instagram, LockKeyhole, Sparkles } from "lucide-react";
import { Link } from "wouter";

const films = {
  arrival: "/videos/creator-pages/ady-personal-style-source.mp4",
  studio: "/videos/creator-pages/ady-braid-studio-source-h264.mp4",
  craft: "/videos/creator-pages/ady-braid-craft-source-h264.mp4",
};

function RoomFilm({
  src,
  className = "",
  startAt = 0,
  loopEnd,
  poster,
}: {
  src: string;
  className?: string;
  startAt?: number;
  loopEnd?: number;
  poster?: string;
}) {
  const hasPinnedScene = useRef(false);
  const holdAt = (video: HTMLVideoElement) => {
    if (hasPinnedScene.current || startAt <= 0 || !Number.isFinite(video.duration) || video.duration <= startAt) return;
    video.currentTime = startAt;
    hasPinnedScene.current = true;
  };

  return (
    <video
      autoPlay
      muted
      loop={!loopEnd}
      playsInline
      preload="metadata"
      poster={poster}
      onLoadedMetadata={(event) => holdAt(event.currentTarget)}
      onCanPlay={(event) => holdAt(event.currentTarget)}
      onTimeUpdate={(event) => {
        if (loopEnd && event.currentTarget.currentTime >= loopEnd) event.currentTarget.currentTime = startAt;
      }}
      className={`h-full w-full object-cover ${className}`}
    >
      <source src={src} type="video/mp4" />
    </video>
  );
}

export default function AdyWorld() {
  return (
    <main className="min-h-screen overflow-hidden bg-[#100c12] text-[#fff5f4]">
      <style>{`
        @keyframes ady-name-in { from { opacity: 0; transform: translateY(32px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes ady-stamp { 0%,100% { transform: rotate(-5deg) translateY(0); } 50% { transform: rotate(4deg) translateY(-6px); } }
        @keyframes ady-line { from { background-position: 0 0; } to { background-position: 200% 0; } }
        .ady-name > span { display: block; animation: ady-name-in .82s cubic-bezier(.16,.83,.22,1) both; }
        .ady-name > span:nth-child(2) { animation-delay: .12s; }
        .ady-name > span:nth-child(3) { animation-delay: .23s; }
        .ady-stamp { animation: ady-stamp 4.2s ease-in-out infinite; }
        .ady-line { background-size: 200% 100%; animation: ady-line 8s linear infinite; }
        @media (prefers-reduced-motion: reduce) { .ady-name > span, .ady-stamp, .ady-line { animation: none; } }
      `}</style>

      <section className="relative isolate h-[100svh] min-h-[100svh] overflow-hidden bg-[#120d12]">
        <RoomFilm
          src={films.arrival}
          startAt={0}
          loopEnd={3}
          poster="/images/creator-pages/ady-personal-style-hero-poster.jpg"
          className="object-center"
        />
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
              <a href="#the-rooms" className="inline-flex items-center gap-2 rounded-full border border-white/35 bg-black/20 px-6 py-3 text-sm font-black backdrop-blur"><ArrowDown className="h-4 w-4" /> Enter her world</a>
            </div>
          </div>
        </div>
      </section>

      <section className="relative overflow-hidden bg-[#ff75ad] px-5 py-6 text-[#170912] sm:px-8 lg:px-12">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-5">
          <p className="max-w-3xl text-2xl font-black leading-[.9] tracking-[-.06em] sm:text-4xl">A woman can be more than one thing. Ady never needed a smaller room.</p>
          <span className="ady-stamp hidden shrink-0 rounded-full border-2 border-[#170912] px-5 py-4 text-[10px] font-black uppercase tracking-[.22em] lg:block">Three real scenes<br />one real woman</span>
        </div>
      </section>

      <section id="the-rooms" className="relative bg-[#f7eded] px-5 py-16 text-[#1c0d16] sm:px-8 lg:px-12 lg:py-28">
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-10 lg:grid-cols-[.75fr_1.25fr] lg:items-end">
            <div className="lg:pb-12">
              <p className="text-xs font-black uppercase tracking-[.25em] text-[#9b214f]">Room one / the arrival</p>
              <h2 className="mt-5 text-[18vw] font-black leading-[.66] tracking-[-.14em] sm:text-[8rem]">SHE<br />DOESN’T<br /><span className="text-[#9b214f]">ASK.</span></h2>
              <p className="mt-8 max-w-sm text-lg leading-8 text-[#1c0d16]/70">The camera meets her in motion. No borrowed face. No made-up lifestyle. Just Ady walking in with the kind of certainty that makes a hallway feel like hers.</p>
            </div>
            <div className="relative aspect-[9/11] overflow-hidden rounded-[4.5rem_4.5rem_0_0] bg-black shadow-[22px_24px_0_#ff75ad]">
              <RoomFilm src={films.arrival} startAt={0} loopEnd={3} poster="/images/creator-pages/ady-personal-style-hero-poster.jpg" className="object-center" />
              <div className="absolute inset-x-0 bottom-0 bg-[linear-gradient(0deg,rgba(12,7,12,.84),transparent)] px-7 pb-8 pt-24 text-white"><p className="text-[10px] font-black uppercase tracking-[.22em] text-[#ffb9d2]">Personal style / her real walk-in</p><p className="mt-3 max-w-sm text-4xl font-black leading-[.8] tracking-[-.08em]">THE ENERGY ARRIVES BEFORE THE EXPLANATION.</p></div>
            </div>
          </div>
        </div>
      </section>

      <section className="relative min-h-[110svh] overflow-hidden bg-[#20101b] text-[#fff7f7]">
        <div className="absolute inset-0 lg:left-[38%]"><RoomFilm src={films.craft} className="object-center" /></div>
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(32,16,27,.98)_0%,rgba(32,16,27,.87)_38%,rgba(32,16,27,.12)_78%),linear-gradient(0deg,rgba(32,16,27,.86),transparent_55%)]" />
        <div className="relative z-10 flex min-h-[110svh] items-end px-5 py-14 sm:px-8 lg:px-12 lg:py-20">
          <div className="mx-auto grid w-full max-w-7xl gap-9 lg:grid-cols-[.7fr_1.3fr] lg:items-end">
            <div>
              <p className="text-xs font-black uppercase tracking-[.25em] text-[#ff9ac0]">Room two / the hands</p>
              <h2 className="mt-5 text-[18vw] font-black leading-[.66] tracking-[-.14em] sm:text-[8.5rem]">SHE<br />MAKES<br /><span className="text-[#ff75ad]">THE LOOK.</span></h2>
              <p className="mt-8 max-w-sm text-lg leading-8 text-white/72">Her craft is not a background detail. It is another way she leads: focused hands, an eye for the detail, and a name already written on the room.</p>
              <div className="mt-9 inline-flex items-center gap-2 border-y border-white/25 py-4 text-[10px] font-black uppercase tracking-[.2em] text-[#ffb9d2]"><Sparkles className="h-4 w-4" /> D'Ady Trenzas / craft in motion</div>
            </div>
          </div>
        </div>
      </section>

      <section className="relative overflow-hidden bg-[#ff75ad] px-5 py-16 text-[#190a11] sm:px-8 lg:px-12 lg:py-24">
        <div className="ady-line absolute inset-x-0 top-0 h-2 bg-[linear-gradient(90deg,#190a11_0_25%,#ffd5e5_25%_50%,#190a11_50%_75%,#ffd5e5_75%)]" />
        <div className="mx-auto grid max-w-7xl gap-12 lg:grid-cols-[1.15fr_.85fr] lg:items-center">
          <div className="relative aspect-[9/12] overflow-hidden rounded-[0_5rem_5rem_5rem] border-[9px] border-[#190a11] bg-black"><RoomFilm src={films.studio} className="object-center" /><div className="absolute inset-x-0 bottom-0 bg-[#190a11] px-6 py-5 text-[#fff7f7]"><p className="text-[10px] font-black uppercase tracking-[.22em] text-[#ffb9d2]">Room three / studio command</p><p className="mt-2 text-3xl font-black leading-[.84] tracking-[-.07em]">SHE BUILDS WITH BOTH HANDS.</p></div></div>
          <div>
            <p className="text-xs font-black uppercase tracking-[.25em] text-[#7c123c]">Ady does not fit inside one label</p>
            <h2 className="mt-5 text-[17vw] font-black leading-[.68] tracking-[-.14em] sm:text-8xl">MORE<br />THAN A<br /><span className="text-[#fff7f7]">MOMENT.</span></h2>
            <p className="mt-8 max-w-md text-lg leading-8 text-[#190a11]/75">Her public work shows movement, personal style, and a real craft. Her private lane already exists on her own terms. CreatorVault keeps the real woman in view instead of flattening her into a category.</p>
            <div className="mt-9 flex flex-wrap gap-3"><a href="https://onlyfans.com/adysanchesz" target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-full bg-[#190a11] px-6 py-3 text-sm font-black text-[#fff7f7]">Her private access <LockKeyhole className="h-4 w-4" /></a><a href="https://www.instagram.com/adyyyyyyyyu/" target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-full border-2 border-[#190a11] px-6 py-3 text-sm font-black"><Instagram className="h-4 w-4" /> @ADYYYYYYYYU</a></div>
          </div>
        </div>
      </section>

      <section className="relative bg-[#100c12] px-5 py-20 text-[#fff5f4] sm:px-8 lg:px-12 lg:py-28">
        <div className="mx-auto max-w-7xl">
          <p className="text-xs font-black uppercase tracking-[.25em] text-[#ff9ac0]">Ady Sanchez / founding circle</p>
          <h2 className="mt-5 max-w-5xl text-[16vw] font-black leading-[.7] tracking-[-.13em] sm:text-[8rem]">THE WORLD<br />GETS BIGGER<br /><span className="text-[#ff75ad]">WHEN SHE DOES.</span></h2>
          <div className="mt-12 flex flex-wrap gap-3"><a href="https://www.instagram.com/adyyyyyyyyu/" target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-full bg-[#ff75ad] px-7 py-4 text-sm font-black text-[#190a11]">Stay with Ady <ArrowUpRight className="h-4 w-4" /></a><Link href="/vault-x"><a className="inline-flex items-center gap-2 rounded-full border-2 border-white/70 px-7 py-4 text-sm font-black">Enter VaultX</a></Link></div>
        </div>
      </section>
    </main>
  );
}
