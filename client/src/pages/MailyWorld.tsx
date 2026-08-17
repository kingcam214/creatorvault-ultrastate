import { useRef } from "react";
import { ArrowDownRight, ArrowLeft, ArrowUpRight, Instagram, Sparkles } from "lucide-react";
import { Link } from "wouter";

const maily = {
  abs: "/videos/creator-pages/maily-outdoor-routine-source-h264.mp4",
  studio: "/videos/creator-pages/maily-studio-beauty-source-h264.mp4",
  close: "/videos/creator-pages/maily-close-social-source.mp4",
  event: "/videos/creator-pages/maily-event-unboxing-source.mp4",
};

function DiamondMotion({ src, className = "", startAt = 0, loopEnd }: { src: string; className?: string; startAt?: number; loopEnd?: number }) {
  const focusedLoop = Boolean(loopEnd && startAt > 0);
  const scenePinned = useRef(false);
  const pinToScene = (video: HTMLVideoElement) => {
    if (scenePinned.current || startAt <= 0 || !Number.isFinite(video.duration) || video.duration <= startAt) return;
    video.currentTime = startAt;
    scenePinned.current = true;
  };
  return (
    <video
      autoPlay
      muted
      loop={!focusedLoop}
      playsInline
      preload="metadata"
      onLoadedMetadata={(event) => pinToScene(event.currentTarget)}
      onCanPlay={(event) => pinToScene(event.currentTarget)}
      onTimeUpdate={(event) => { if (loopEnd && event.currentTarget.currentTime >= loopEnd) event.currentTarget.currentTime = startAt; }}
      className={`h-full w-full object-cover ${className}`}
    >
      <source src={src} type="video/mp4" />
    </video>
  );
}

export default function MailyWorld() {
  return (
    <main className="min-h-screen overflow-hidden bg-[#f6f1e9] text-[#12101a]">
      <style>{`
        @keyframes diamondRise { from { opacity: 0; transform: translateY(34px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes diamondMark { 0%, 100% { transform: rotate(-8deg) scale(.95); } 50% { transform: rotate(8deg) scale(1.05); } }
        @keyframes diamondTicker { from { transform: translateX(0); } to { transform: translateX(-50%); } }
        @keyframes diamondPosterAway { to { opacity: 0; visibility: hidden; } }
        .diamond-rise { animation: diamondRise .85s cubic-bezier(.16,.8,.22,1) both; }
        .diamond-rise-late { animation: diamondRise .85s .15s cubic-bezier(.16,.8,.22,1) both; }
        .diamond-mark { animation: diamondMark 4.5s ease-in-out infinite; }
        .diamond-ticker { animation: diamondTicker 22s linear infinite; }
        .diamond-poster { animation: diamondPosterAway .55s 1.45s ease-out forwards; }
      `}</style>

      <section className="relative min-h-[100svh] overflow-hidden bg-[#130f1d] text-[#fffdf8]">
        <DiamondMotion src={maily.abs} startAt={39.5} loopEnd={59.5} className="object-bottom" />
        <img src="/images/creator-pages/maily-outdoor-routine-hero-poster.jpg" alt="Maily in her verified abs-focused outdoor source" className="diamond-poster absolute inset-0 z-[1] h-full w-full object-cover object-bottom" />
        <div className="absolute inset-0 z-[2] bg-[linear-gradient(180deg,rgba(8,6,13,.14),rgba(8,6,13,.08)_36%,rgba(8,6,13,.94))]" />
        <nav className="absolute inset-x-0 top-0 z-10 flex items-center justify-between p-5 sm:p-8">
          <Link href="/creators"><a className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-[.22em]"><ArrowLeft className="h-4 w-4" /> The circle</a></Link>
          <p className="text-sm font-black tracking-[-.06em]">CREATOR<span className="text-[#d9b7ff]">VAULT</span></p>
        </nav>
        <div className="absolute inset-x-0 bottom-0 z-10 px-5 pb-10 sm:px-8 lg:px-12 lg:pb-14">
          <div className="mx-auto max-w-7xl">
            <div className="diamond-rise flex items-center gap-2 text-[10px] font-black uppercase tracking-[.25em] text-[#d9b7ff]"><span className="h-2 w-2 rotate-45 bg-[#d9b7ff]" /> DOMINICANA DIAMOND / @MAILIN_GONZALES</div>
            <h1 className="diamond-rise-late mt-5 max-w-6xl text-[20vw] font-black leading-[.64] tracking-[-.145em] sm:text-[9rem] lg:text-[13.5rem]">ABS.<br /><span className="text-[#d9b7ff]">HEAT.</span><br />HER NAME.</h1>
            <div className="diamond-rise-late mt-8 flex flex-wrap items-center gap-4">
              <a href="https://www.instagram.com/maily_gonzalez08/" target="_blank" rel="noreferrer" className="rounded-full bg-[#d9b7ff] px-6 py-3 text-sm font-black text-[#130f1d]">Follow Maily <ArrowUpRight className="ml-1 inline h-4 w-4" /></a>
              <a href="#diamond-code" className="inline-flex items-center gap-2 text-sm font-black"><ArrowDownRight className="h-4 w-4" /> Enter the diamond code</a>
            </div>
          </div>
        </div>
      </section>

      <section className="overflow-hidden bg-[#d9b7ff] py-4 text-[#130f1d]"><div className="diamond-ticker flex w-max gap-8 whitespace-nowrap text-xs font-black uppercase tracking-[.25em]"><span>MAILY GONZALEZ</span><span>◆</span><span>GYM</span><span>◆</span><span>PLAYA</span><span>◆</span><span>MAÍLY CROCHET</span><span>◆</span><span>CREATOR ENERGY</span><span>◆</span><span>MAILY GONZALEZ</span><span>◆</span><span>GYM</span><span>◆</span><span>PLAYA</span><span>◆</span><span>MAÍLY CROCHET</span><span>◆</span><span>CREATOR ENERGY</span></div></section>

      <section id="diamond-code" className="relative bg-[#f6f1e9] px-5 py-16 sm:px-8 lg:px-12 lg:py-28">
        <div className="mx-auto grid max-w-7xl gap-12 lg:grid-cols-[.8fr_1.2fr] lg:items-end">
          <div className="lg:pb-12"><p className="text-xs font-black uppercase tracking-[.24em] text-[#6f39ad]">The signature / verified source</p><h2 className="mt-5 text-[18vw] font-black leading-[.67] tracking-[-.14em] sm:text-8xl">THE ABS<br />ARE THE<br /><span className="text-[#6f39ad]">INTRO.</span></h2><p className="mt-8 max-w-sm text-lg leading-8 text-[#12101a]/70">The body is not filler around Maily’s page. It is the visual signature that makes the audience stop, look twice, and remember the woman behind the swim.</p><div className="mt-9 flex items-center gap-3 text-[10px] font-black uppercase tracking-[.2em] text-[#6f39ad]"><span className="diamond-mark inline-block h-5 w-5 rotate-45 border-2 border-[#6f39ad]" /> Real public source / CreatorVault protected</div></div>
          <div className="relative aspect-[9/12] overflow-hidden rounded-[5rem_5rem_0_0] bg-[#130f1d] shadow-[20px_20px_0_#d9b7ff]"><DiamondMotion src={maily.abs} startAt={39.5} loopEnd={59.5} /><div className="absolute inset-0 bg-[linear-gradient(180deg,transparent_46%,rgba(19,15,29,.78))]" /><div className="absolute bottom-7 left-7 right-7 text-white"><p className="text-[10px] font-black uppercase tracking-[.22em] text-[#d9b7ff]">Body confidence / no substitute source</p><p className="mt-3 text-4xl font-black leading-[.77] tracking-[-.09em]">SHE DOESN’T HIDE THE WORK.</p></div></div>
        </div>
      </section>

      <section className="relative overflow-hidden bg-[#6f39ad] px-5 py-20 text-[#fffdf8] sm:px-8 lg:px-12 lg:py-28">
        <div className="absolute -right-24 top-12 text-[42vw] font-black leading-none text-[#d9b7ff]/15">M</div>
        <div className="relative mx-auto grid max-w-7xl gap-12 lg:grid-cols-[1.2fr_.8fr] lg:items-center">
          <div className="relative aspect-[9/11] overflow-hidden rounded-[0_6rem_0_6rem] border-[9px] border-[#d9b7ff]"><DiamondMotion src={maily.studio} /><div className="absolute inset-0 bg-[linear-gradient(180deg,transparent_45%,rgba(20,13,31,.82))]" /><p className="absolute bottom-7 left-7 right-7 text-4xl font-black leading-[.78] tracking-[-.09em]">THE DETAIL IS PART OF THE DIAMOND.</p></div>
          <div><p className="text-xs font-black uppercase tracking-[.24em] text-[#d9b7ff]">The suit is a language / @maily_crochet_08</p><h2 className="mt-5 text-[16vw] font-black leading-[.68] tracking-[-.13em] sm:text-8xl">BUILT TO<br /><span className="text-[#d9b7ff]">BE SEEN.</span></h2><p className="mt-8 max-w-md text-lg leading-8 text-white/75">Maily’s public identity connects the gym, playa, and her crochet-swimwear business. The page does not fake a checkout or invent sales. It puts the real woman and the real craft in the same frame.</p><a href="https://www.instagram.com/maily_crochet_08/" target="_blank" rel="noreferrer" className="mt-9 inline-flex items-center gap-2 rounded-full bg-[#d9b7ff] px-6 py-3 text-sm font-black text-[#130f1d]"><Sparkles className="h-4 w-4" /> See Maily Crochet <ArrowUpRight className="h-4 w-4" /></a></div>
        </div>
      </section>

      <section className="relative min-h-[95svh] bg-[#130f1d] px-5 py-16 text-[#fffdf8] sm:px-8 lg:px-12 lg:py-24">
        <div className="mx-auto grid max-w-7xl gap-12 lg:grid-cols-[.68fr_1.32fr] lg:items-end">
          <div className="lg:pb-10"><p className="text-xs font-black uppercase tracking-[.24em] text-[#d9b7ff]">Influence is felt before it is counted</p><h2 className="mt-5 text-[17vw] font-black leading-[.67] tracking-[-.14em] sm:text-8xl">NOT JUST<br />A <span className="text-[#d9b7ff]">LOOK.</span><br />A PULL.</h2><p className="mt-8 max-w-sm text-lg leading-8 text-white/70">A face people recognize. A body people remember. A creator whose own public profile carries gym, beach, craft, and everyday camera confidence in the same world.</p><a href="https://www.instagram.com/maily_gonzalez08/" target="_blank" rel="noreferrer" className="mt-8 inline-flex items-center gap-2 rounded-full border-2 border-[#d9b7ff] px-6 py-3 text-sm font-black text-[#d9b7ff]"><Instagram className="h-4 w-4" /> @MAILY_GONZALEZ08</a></div>
          <div className="relative aspect-[9/10] overflow-hidden rounded-[50%_50%_0_0] border-[9px] border-[#d9b7ff] bg-black"><DiamondMotion src={maily.close} /><div className="absolute inset-x-0 bottom-0 bg-[#d9b7ff] px-6 py-5 text-[#130f1d]"><p className="text-[10px] font-black uppercase tracking-[.2em] text-[#6f39ad]">Direct creator source</p><p className="mt-1 text-3xl font-black leading-[.84] tracking-[-.07em]">THE DIAMOND HAS A FACE.</p></div></div>
        </div>
      </section>

      <section className="relative overflow-hidden bg-[#f6f1e9] px-5 py-16 text-[#130f1d] sm:px-8 lg:px-12"><div className="mx-auto flex max-w-7xl flex-col gap-8 lg:flex-row lg:items-end lg:justify-between"><div><p className="text-xs font-black uppercase tracking-[.24em] text-[#6f39ad]">Dominicana Diamond / founding circle</p><h2 className="mt-5 max-w-4xl text-[13vw] font-black leading-[.66] tracking-[-.14em] sm:text-7xl">THE BODY.<br />THE SUIT.<br /><span className="text-[#6f39ad]">THE WORLD.</span></h2></div><div className="flex flex-wrap gap-3"><a href="https://www.tiktok.com/@mailin_gonzales" target="_blank" rel="noreferrer" className="rounded-full bg-[#130f1d] px-6 py-3 text-sm font-black text-[#fffdf8]">Stay in Maily’s world <ArrowUpRight className="ml-1 inline h-4 w-4" /></a><Link href="/vault-x"><a className="rounded-full border-2 border-[#130f1d] px-6 py-3 text-sm font-black">Enter VaultX</a></Link></div></div></section>
    </main>
  );
}
