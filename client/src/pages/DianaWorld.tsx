import { useRef } from "react";
import { ArrowDown, ArrowLeft, ArrowUpRight, Instagram } from "lucide-react";
import { Link } from "wouter";

const films = {
  bedroom: "/videos/creator-pages/diana-city-style.mp4",
  porch: "/videos/creator-pages/diana-porch-dance.mp4",
  balcony: "/videos/creator-pages/diana-butterfly-balcony-source-h264.mp4",
};

type FilmProps = {
  src: string;
  poster?: string;
  className?: string;
  end?: number;
};

function DianaFilm({ src, poster, className = "", end = 9 }: FilmProps) {
  const pinned = useRef(false);
  const setOpeningFrame = (video: HTMLVideoElement) => {
    if (pinned.current) return;
    video.currentTime = 0.1;
    pinned.current = true;
  };

  return (
    <video
      autoPlay
      muted
      playsInline
      preload="metadata"
      poster={poster}
      onLoadedMetadata={(event) => setOpeningFrame(event.currentTarget)}
      onCanPlay={(event) => setOpeningFrame(event.currentTarget)}
      onTimeUpdate={(event) => {
        if (event.currentTarget.currentTime >= end) event.currentTarget.currentTime = 0.1;
      }}
      className={`h-full w-full object-cover ${className}`}
    >
      <source src={src} type="video/mp4" />
    </video>
  );
}

export default function DianaWorld() {
  return (
    <main className="min-h-screen overflow-hidden bg-[#120c1e] text-[#fff8ff]">
      <style>{`
        @keyframes diana-rise { from { opacity: 0; transform: translateY(36px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes diana-pulse { 0%,100% { transform: scale(1); opacity: .65; } 50% { transform: scale(1.08); opacity: 1; } }
        .diana-rise { animation: diana-rise .85s cubic-bezier(.16,.85,.2,1) both; }
        .diana-rise-late { animation: diana-rise .85s .16s cubic-bezier(.16,.85,.2,1) both; }
        .diana-sun { animation: diana-pulse 5s ease-in-out infinite; }
        @media (prefers-reduced-motion: reduce) { .diana-rise, .diana-rise-late, .diana-sun { animation: none; } }
      `}</style>

      <section className="relative isolate min-h-[100svh] overflow-hidden bg-[#1d102b]">
        <DianaFilm
          src={films.balcony}
          poster="/images/creator-pages/diana-butterfly-balcony-poster.jpg"
          end={14}
          className="object-center"
        />
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(20,9,31,.88)_0%,rgba(20,9,31,.35)_44%,rgba(20,9,31,.06)_72%),linear-gradient(0deg,rgba(14,7,22,.96)_0%,rgba(14,7,22,0)_52%)]" />
        <div className="diana-sun absolute -right-24 top-[-8rem] h-80 w-80 rounded-full border border-[#eeccff]/45 bg-[#bf7cff]/20 blur-[1px] sm:right-[6%] sm:top-[-5rem]" />

        <nav className="absolute inset-x-0 top-0 z-20 flex items-center justify-between px-5 py-5 sm:px-8 sm:py-8">
          <Link href="/creators"><a className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-[.22em] text-white/90"><ArrowLeft className="h-4 w-4" /> The circle</a></Link>
          <p className="text-sm font-black tracking-[-.06em]">CREATOR<span className="text-[#d48cff]">VAULT</span></p>
        </nav>

        <div className="absolute inset-x-0 bottom-0 z-20 px-5 pb-10 sm:px-8 sm:pb-14 lg:px-12">
          <div className="mx-auto max-w-7xl">
            <p className="diana-rise text-[10px] font-black uppercase tracking-[.31em] text-[#f1c7ff]">DIANA FILS-AIME / HER OWN RHYTHM</p>
            <h1 className="diana-rise-late mt-5 max-w-6xl font-black leading-[.68] tracking-[-.13em]">
              <span className="block text-[22vw] sm:text-[10rem] lg:text-[14rem]">DIANA</span>
              <span className="ml-[5vw] block text-[12vw] text-[#d48cff] sm:text-6xl lg:text-8xl">MOVES IN HER OWN LIGHT.</span>
            </h1>
            <div className="mt-8 flex flex-wrap gap-3">
              <a href="https://www.instagram.com/diana_queen1112/" target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-full bg-[#f3d8ff] px-6 py-3 text-sm font-black text-[#291033]">Follow Diana <ArrowUpRight className="h-4 w-4" /></a>
              <a href="#three-rooms" className="inline-flex items-center gap-2 rounded-full border border-white/35 bg-[#201329]/45 px-6 py-3 text-sm font-black backdrop-blur"><ArrowDown className="h-4 w-4" /> Enter her world</a>
            </div>
          </div>
        </div>
      </section>

      <section className="relative overflow-hidden bg-[#f2dcff] px-5 py-16 text-[#25102e] sm:px-8 lg:px-12 lg:py-24">
        <div className="absolute right-[-5rem] top-[-6rem] text-[24rem] font-black leading-none tracking-[-.2em] text-[#c98cff]/25">D</div>
        <div className="relative mx-auto grid max-w-7xl gap-12 lg:grid-cols-[.82fr_1.18fr] lg:items-end">
          <p className="text-xs font-black uppercase tracking-[.28em] text-[#742a8f]">No borrowed story</p>
          <div>
            <h2 className="max-w-5xl text-[16vw] font-black leading-[.71] tracking-[-.13em] sm:text-[7rem]">SHE DOESN’T<br />FOLLOW THE<br /><span className="text-[#8b32aa]">MOMENT.</span></h2>
            <p className="mt-8 max-w-2xl text-xl leading-9 text-[#25102e]/72">Three real Diana chapters. Three different rooms. Her face, her movement, and her presence stay at the center from the first frame to the last.</p>
          </div>
        </div>
      </section>

      <section id="three-rooms" className="bg-[#120c1e] px-5 py-16 sm:px-8 lg:px-12 lg:py-24">
        <div className="mx-auto max-w-7xl">
          <div className="mb-12 flex flex-wrap items-end justify-between gap-6">
            <div><p className="text-xs font-black uppercase tracking-[.28em] text-[#d48cff]">Three rooms / one woman</p><h2 className="mt-4 text-[15vw] font-black leading-[.7] tracking-[-.12em] sm:text-7xl">THE FILM<br />STAYS ON HER.</h2></div>
            <p className="max-w-sm text-base leading-7 text-white/60">Not a profile card. A living sequence built only from Diana’s own verified public motion.</p>
          </div>

          <div className="grid gap-5 lg:grid-cols-[.85fr_1.15fr_.85fr]">
            <article className="relative min-h-[72svh] overflow-hidden rounded-[2.75rem_2.75rem_.4rem_2.75rem] border border-white/15 bg-black">
              <DianaFilm src={films.bedroom} end={9} className="object-center" />
              <div className="absolute inset-0 bg-gradient-to-t from-[#120c1e] via-transparent to-transparent" />
              <div className="absolute inset-x-0 bottom-0 p-7"><p className="text-[10px] font-black uppercase tracking-[.25em] text-[#e4b5ff]">01 / the room</p><h3 className="mt-3 text-4xl font-black leading-[.8] tracking-[-.08em]">SHE SETS<br />HER OWN TEMPO.</h3></div>
            </article>

            <article className="relative min-h-[78svh] overflow-hidden rounded-[.4rem_2.75rem_2.75rem_2.75rem] border border-[#f3d8ff]/35 bg-black lg:translate-y-12">
              <DianaFilm src={films.balcony} poster="/images/creator-pages/diana-butterfly-balcony-poster.jpg" end={14} className="object-center" />
              <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(31,11,43,.08),rgba(18,7,28,.88))]" />
              <div className="absolute inset-x-0 bottom-0 p-7 sm:p-9"><p className="text-[10px] font-black uppercase tracking-[.25em] text-[#f3d8ff]">02 / open air</p><h3 className="mt-3 text-5xl font-black leading-[.78] tracking-[-.1em] sm:text-6xl">THE LOOK<br />TAKES UP<br />SPACE.</h3></div>
            </article>

            <article className="relative min-h-[72svh] overflow-hidden rounded-[2.75rem_.4rem_2.75rem_2.75rem] border border-white/15 bg-black">
              <DianaFilm src={films.porch} end={9} className="object-center" />
              <div className="absolute inset-0 bg-gradient-to-t from-[#120c1e] via-transparent to-transparent" />
              <div className="absolute inset-x-0 bottom-0 p-7"><p className="text-[10px] font-black uppercase tracking-[.25em] text-[#e4b5ff]">03 / outside</p><h3 className="mt-3 text-4xl font-black leading-[.8] tracking-[-.08em]">HER BEAT.<br />HER WAY.</h3></div>
            </article>
          </div>
        </div>
      </section>

      <section className="bg-[#8e3da8] px-5 py-20 text-[#fff6ff] sm:px-8 lg:px-16 lg:py-28">
        <div className="mx-auto max-w-7xl border-y border-[#fff6ff]/50 py-12 sm:py-16">
          <p className="text-xs font-black uppercase tracking-[.28em] text-[#f5d1ff]">Diana Fils-Aime / founding circle</p>
          <h2 className="mt-6 max-w-6xl text-[16vw] font-black leading-[.69] tracking-[-.13em] sm:text-[7.5rem]">HER WORLD<br />IS ALREADY<br /><span className="text-[#25102e]">IN MOTION.</span></h2>
          <div className="mt-10 flex flex-wrap gap-3">
            <a href="https://www.instagram.com/diana_queen1112/" target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-full bg-[#25102e] px-7 py-4 text-sm font-black text-white"><Instagram className="h-4 w-4" /> @DIANA_QUEEN1112</a>
            <Link href="/vault-x"><a className="inline-flex items-center gap-2 rounded-full border-2 border-[#25102e] px-7 py-4 text-sm font-black text-[#25102e]">See what CreatorVault can build</a></Link>
          </div>
        </div>
      </section>
    </main>
  );
}
